"""
build_data.py — genereert het RoM-datacontract (data/broekhem33.json + .js)
uit de OCD-database.

WAT DIT DOET
  1. Bepaalt welke decentrale regelingen op de locatie gelden (geo-scope op
     regelingsgebied).
  2. Wijst elke regel-chunk een INHOUDELIJK THEMA toe via seed-centroïde op de
     embeddings in v2a.tekst_embedding (nomic-embed-text). Zie THEMAS hieronder.
  3. Reconstrueert de artikelstructuur (Hoofdstuk > Artikel > Lid) uit
     p2p.tekst_element.
  4. Haalt de IMOW-annotaties op (type regel, functie-gebiedsaanwijzingen,
     omgevingsnormen) via de wid-join juridische_regel -> gebiedsaanwijzing/norm.
  5. Schrijft data/broekhem33.json (contract) en data/broekhem33.js
     (window.ROM_DATA, zodat de pagina zonder server werkt).

PREREQUISITES (dit script draait NIET standalone — het leest de OCD-omgeving)
  - OCD-Postgres bereikbaar op DB_URL (default localhost:5434/dso), met de schema's
    p2p / v2a / core. v2a.tekst_embedding moet de chunks van de locatie bevatten;
    embed die eerst met dso-loader/scripts/embed-broekhem33.py (in de OCD-repo).
  - Ollama met `nomic-embed-text` op localhost:11434 (voor de thema-embeddings).
  - pip install: numpy scikit-learn httpx "psycopg[binary]"

ANDERE LOCATIE
  Pas X, Y en het "adres"-veld onderaan aan (RD-coördinaat; via PDOK
  Locatieserver te vinden). Draai daarna eerst de embed-stap voor die locatie.

THEMA'S TUNEN
  De thema-taxonomie is de THEMAS-lijst: (id, naam, kleur, zaad-omschrijving).
  Voeg thema's toe of pas de zaad-woorden aan; DIST_MAX bepaalt wanneer een chunk
  als "overig" geldt. Geen herclustering nodig — puur nearest-centroïde.
"""
import json
import os
from collections import Counter, defaultdict

import httpx
import numpy as np
import psycopg
from psycopg.rows import dict_row
from sklearn.preprocessing import normalize

# --- configuratie -----------------------------------------------------------
DB_URL = os.environ.get("OCD_DB_URL", "postgresql://postgres:postgres@localhost:5434/dso")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
EMBED_MODEL = "nomic-embed-text"

X, Y = 185904, 320095                       # RD-coördinaat Broekhem 33 Valkenburg
ADRES = "Broekhem 33, 6301 HD Valkenburg"
GEMEENTE = "Valkenburg aan de Geul"

OUT = os.path.join(os.path.dirname(__file__), "..", "data", "broekhem33.json")
DEC = ("Omgevingsplan", "Omgevingsverordening", "Waterschapsverordening")
DIST_MAX = 0.62                             # boven deze cosine-afstand -> 'overig'

# Begrijpelijke variant (hertaling) — content-adresseerbaar in v2a.hertaling.
# We joinen op de genormaliseerde hash van inhoud_plain (v2a.norm_hash), zodat
# één hertaling meteen alle bruidsschat-duplicaten dekt. Zie
# dso-loader/scripts/begrijpelijk-hertaling.py + 2026-07-add-hertaling-cache.sql.
HERTAAL_MODEL = "claude-sonnet-5"
HERTAAL_PROMPT_VERSIE = "v1"

# (id, weergavenaam, kleur, zaad-omschrijving voor de thema-centroïde)
THEMAS = [
    ("wonen", "Wonen", "#EAC63B", "woonfunctie woning wonen huishouden bewoning aantal woningen woningbouw mantelzorgwoning nachtverblijf huisvesting"),
    ("bouwen", "Bouwen", "#8A6D3B", "bouwen bouwwerk bouwhoogte bebouwing gebouw bouwactiviteit rooilijn bouwvlak dakkapel verbouwen bebouwingsgrens"),
    ("groen", "Groen & natuur", "#6FA83C", "groen natuur landschap boom beplanting flora fauna houtopstand groenvoorziening park biodiversiteit"),
    ("water", "Water & lozen", "#2E7BC4", "water grondwater oppervlaktewater lozen afvalwater waterkering riool waterkwaliteit onttrekken vuilwaterriool"),
    ("energie", "Energie", "#A03A6B", "energie warmte zonnepark waterstof duurzame energie energiesysteem warmtenet elektriciteit"),
    ("geluid", "Geluid", "#5CBFB0", "geluid geluidbelasting geluidhinder akoestisch stiltegebied geluidgevoelig decibel"),
    ("bodem", "Bodem", "#8C6B3F", "bodem bodemkwaliteit graven grondverzet bodembescherming bodemverontreiniging saneren grond ontgraven"),
    ("geur", "Geur", "#C97B2E", "geur geurhinder geuremissie stankhinder geurgevoelig mestopslag"),
    ("veiligheid", "Externe veiligheid", "#D64545", "externe veiligheid explosie gevaarlijke stoffen risico buisleiding opslag ontploffing"),
    ("afval", "Afval", "#B0894A", "afval afvalstoffen bedrijfsafval inzameling recycling afvalstof afvalbeheer"),
    ("erfgoed", "Erfgoed & cultuur", "#7D5BA6", "monument archeologie cultuurhistorie erfgoed beschermd stadsgezicht monumentale rijksmonument"),
    ("verkeer", "Verkeer & parkeren", "#4A4A4A", "verkeer parkeren weg uitrit inrit ontsluiting parkeerplaats verkeersveiligheid rijstrook"),
    ("landbouw", "Landbouw", "#9AA23C", "agrarisch landbouw veehouderij glastuinbouw mest dieren teelt akkerbouw"),
    ("milieu", "Milieu (overig)", "#A9772F", "milieubelastende activiteit installatie emissie stof lucht trilling licht bedrijf"),
]


def embed(texts):
    return httpx.post(f"{OLLAMA_URL}/api/embed",
                      json={"model": EMBED_MODEL, "input": texts}, timeout=90).json()["embeddings"]


def ancestor(te_id, elts, want):
    """Loop de parent_id-keten op tot een element van een gewenst type."""
    for _ in range(25):
        e = elts.get(te_id)
        if not e:
            return None
        if e["element_type"] in want:
            return e
        te_id = e["parent_id"]
    return None


def main():
    c = psycopg.connect(DB_URL, row_factory=dict_row)
    cur = c.cursor()
    cur.execute("SET max_parallel_workers_per_gather=0")
    seedv = normalize(np.array(embed([t[3] for t in THEMAS])))

    cur.execute("""SELECT DISTINCT r.frbr_expression expr, r.opschrift titel, r.documenttype dt,
        b.naam bg, b.bestuurslaag FROM p2p.regeling r
        JOIN p2p.locatie_subdiv ls ON ls.identificatie=r.regelingsgebied_id
        LEFT JOIN core.bronhouder b ON b.overheidscode=r.bronhouder
        WHERE ST_Intersects(ls.geometrie, ST_SetSRID(ST_MakePoint(%s,%s),28992)) AND NOT r.inactief
          AND r.documenttype=ANY(%s) ORDER BY r.documenttype""", (X, Y, list(DEC)))
    regelingen = cur.fetchall()

    documenten = []
    for reg in regelingen:
        expr = reg["expr"]
        cur.execute("SELECT id,parent_id,element_type,nummer,opschrift,wid,inhoud_plain FROM p2p.tekst_element WHERE regeling_expression=%s", (expr,))
        elts = {r["id"]: r for r in cur.fetchall()}
        cur.execute("""SELECT te.id, te.wid, te.nummer, te.inhoud_plain, te.inhoud, v.embedding::text emb,
                   h.tekst AS begrijpelijk
            FROM v2a.tekst_embedding v JOIN p2p.tekst_element te ON te.id=v.tekst_element_id
            LEFT JOIN v2a.hertaling h ON h.bron_hash = v2a.norm_hash(te.inhoud_plain)
              AND h.model=%s AND h.prompt_versie=%s
            WHERE v.regeling_expression=%s AND v.bron_soort IN ('Lid','Divisietekst')
              AND v.kop_pad NOT ILIKE '%%toelicht%%' AND v.inhoud_plain NOT ILIKE '%%/join/id/regdata/%%'
            ORDER BY te.volgorde""", (HERTAAL_MODEL, HERTAAL_PROMPT_VERSIE, expr))
        chunks = cur.fetchall()
        if not chunks:
            continue
        embs = normalize(np.array([np.fromstring(r["emb"].strip("[]"), sep=",") for r in chunks]))
        dist = 1 - (embs @ seedv.T)
        best, bestd = dist.argmin(1), dist.min(1)
        themap = {chunks[i]["id"]: (THEMAS[best[i]][0] if bestd[i] <= DIST_MAX else "overig") for i in range(len(chunks))}

        # annotaties: wid -> {type_regel, functies, normen}
        cur.execute("SELECT regeltekst_wid wid, regel_type FROM p2p.juridische_regel WHERE regeling_expression=%s", (expr,))
        ann = {r["wid"]: {"type_regel": r["regel_type"], "functies": [], "normen": []} for r in cur.fetchall()}
        cur.execute("""SELECT jr.regeltekst_wid wid, g.type, g.naam FROM p2p.juridische_regel jr
            JOIN p2p.juridische_regel_gebiedsaanwijzing jrg ON jrg.juridische_regel_id=jr.identificatie
            JOIN p2p.gebiedsaanwijzing g ON g.identificatie=jrg.gebiedsaanwijzing_id
            WHERE jr.regeling_expression=%s""", (expr,))
        for r in cur.fetchall():
            ann.setdefault(r["wid"], {"type_regel": None, "functies": [], "normen": []})["functies"].append({"type": r["type"], "naam": r["naam"]})
        cur.execute("""SELECT jr.regeltekst_wid wid, n.naam, n.eenheid, nw.kwantitatieve_waarde, nw.waarde_in_regeltekst
            FROM p2p.juridische_regel jr
            JOIN p2p.juridische_regel_norm jrn ON jrn.juridische_regel_id=jr.identificatie
            JOIN p2p.norm n ON n.identificatie=jrn.norm_id
            LEFT JOIN p2p.normwaarde nw ON nw.norm_id=n.identificatie
            WHERE jr.regeling_expression=%s""", (expr,))
        for r in cur.fetchall():
            ann.setdefault(r["wid"], {"type_regel": None, "functies": [], "normen": []})["normen"].append(
                {"naam": r["naam"], "eenheid": r["eenheid"], "waarde": r["kwantitatieve_waarde"] or r["waarde_in_regeltekst"]})

        # hoofdstuk -> artikel -> leden
        arts = defaultdict(lambda: {"leden": [], "themas": []})
        art_order = []
        for ch in chunks:
            a = ancestor(ch["id"], elts, ("Artikel",)) or elts[ch["id"]]
            h = ancestor(a["id"], elts, ("Hoofdstuk", "Afdeling"))
            aid = a["id"]
            if aid not in arts:
                art_order.append(aid)
                arts[aid].update({
                    "nummer": a["nummer"],
                    "opschrift": a["opschrift"] or ((a.get("inhoud_plain") or "")[:60] or None),
                    "wid": a["wid"],
                    "hoofdstuk": (f'{h["nummer"] or ""} {h["opschrift"] or ""}'.strip() if h else "Overig"),
                })
            arts[aid]["leden"].append({"nummer": (ch["nummer"] or "").rstrip("."), "tekst": (ch["inhoud_plain"] or "").strip(),
                                       "tekst_xml": (ch["inhoud"] or "").strip(),
                                       "begrijpelijk": (ch.get("begrijpelijk") or "").strip() or None, "wid": ch["wid"]})
            arts[aid]["themas"].append(themap[ch["id"]])

        hoofdst = defaultdict(list)
        chipcount = Counter()
        for aid in art_order:
            a = arts[aid]
            th = Counter(a["themas"]).most_common(1)[0][0]
            chipcount[th] += 1
            wids = [a["wid"]] + [l["wid"] for l in a["leden"]]
            tr = None
            funcs, norms = [], []
            for w in wids:
                if w in ann:
                    tr = tr or ann[w]["type_regel"]
                    funcs += ann[w]["functies"]
                    norms += ann[w]["normen"]
            seen = set()
            funcs = [f for f in funcs if (k := (f["type"], f["naam"])) not in seen and not seen.add(k)]
            seenn = set()
            norms = [n for n in norms if (k := (n["naam"], n.get("waarde"))) not in seenn and not seenn.add(k)]
            hoofdst[a["hoofdstuk"]].append({
                "nummer": a["nummer"], "opschrift": a["opschrift"], "wid": a["wid"], "thema": th,
                "kenmerken": {"type_regel": tr, "functies": funcs, "normen": norms},
                "leden": a["leden"],
            })
        documenten.append({
            "titel": reg["titel"], "documenttype": reg["dt"], "bevoegd_gezag": reg["bg"], "bestuurslaag": reg["bestuurslaag"],
            "themas": [{"id": t[0], "aantal": chipcount[t[0]]} for t in THEMAS if chipcount[t[0]]]
                      + ([{"id": "overig", "aantal": chipcount["overig"]}] if chipcount["overig"] else []),
            "aantal_artikelen": len(art_order),
            "hoofdstukken": [{"titel": h, "artikelen": a} for h, a in hoofdst.items()],
        })

    data = {
        "locatie": {"adres": ADRES, "x": X, "y": Y, "gemeente": GEMEENTE},
        "themas": [{"id": t[0], "naam": t[1], "kleur": t[2]} for t in THEMAS] + [{"id": "overig", "naam": "Overig", "kleur": "#BBBBBB"}],
        "documenten": documenten,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    with open(OUT.replace(".json", ".js"), "w", encoding="utf-8") as f:
        f.write("window.ROM_DATA=" + json.dumps(data, ensure_ascii=False) + ";")
    print("geschreven:", OUT, "+ .js")
    for d in documenten:
        n = sum(1 for h in d["hoofdstukken"] for a in h["artikelen"] if a["kenmerken"]["functies"] or a["kenmerken"]["normen"])
        leden = [l for h in d["hoofdstukken"] for a in h["artikelen"] for l in a["leden"]]
        beg = sum(1 for l in leden if l.get("begrijpelijk"))
        print(f"  {d['documenttype']:22} {d['aantal_artikelen']:4} artikelen, {n} met functie/norm-annotatie, "
              f"{beg}/{len(leden)} leden met begrijpelijke variant")
    c.close()


if __name__ == "__main__":
    main()
