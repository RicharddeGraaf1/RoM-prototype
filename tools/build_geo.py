"""build_geo.py — verrijkt data/broekhem33.json met geo-contouren voor de kaart-overlay.

WAT DIT DOET
  1. Berekent de exacte bbox van de statische grijze onderkaart
     (img/broekhem-onderkaart-grijs.png) uit hetzelfde EPSG:28992-tilingschema
     als tools/onderkaart_grijs.py — dus de overlay valt pixel-precies over het beeld.
  2. Haalt per regeling op de locatie de werkingsgebieden (gebiedsaanwijzingen) op,
     clipt ze op het kaartbeeld, projecteert RD -> pixels en vereenvoudigt ze tot
     een SVG-pad. Elk vlak krijgt een stabiele id + de functie-type (voor de kleur).
  3. Koppelt elk artikel aan zijn werkingsgebied(en) via de regeltekst-wid, zodat de
     UI bij hover/klik op een artikel het bijbehorende vlak kan laten oplichten.
  4. Haalt het kadastrale perceel op (PDOK Kadastrale Kaart WFS) als referentiecontour.
  5. Schrijft het geo-blok terug in data/broekhem33.json (+ .js). Verandert NIETS aan
     de chips/annotaties; draait dus los van build_data.py (geen Ollama nodig).

Runtime blijft offline: alleen dit genereer-script heeft DB + internet nodig; de
coordinaten worden als SVG-paden in de JSON gebakken.

    python tools/build_geo.py
"""
import json
import os

import httpx
import psycopg
from psycopg.rows import dict_row

DB_URL = os.environ.get("OCD_DB_URL", "postgresql://postgres:postgres@localhost:5434/dso")
HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "..", "data", "broekhem33.json")

# --- kaartbeeld: exact hetzelfde frame als onderkaart_grijs.py -----------------
X, Y = 185904, 320095                      # RD, Broekhem 33
ORIGIN_X, ORIGIN_Y = -285401.92, 903401.92
RES_Z, TILE = 0.840, 256                   # zoom 12 (m/px), 256px-tiles
NX, NY = 3, 4                              # 3 breed x 4 hoog  -> 768 x 1024 px
SPAN = TILE * RES_Z
CCOL = int((X - ORIGIN_X) / SPAN)
CROW = int((ORIGIN_Y - Y) / SPAN)
COL0 = CCOL - NX // 2
ROW0 = CROW - NY // 2
L = ORIGIN_X + COL0 * SPAN                 # links (RD-x)
T = ORIGIN_Y - ROW0 * SPAN                 # boven (RD-y)
R = L + NX * SPAN
B = T - NY * SPAN
W, H = NX * TILE, NY * TILE                # 768 x 1024
DEC = ("Omgevingsplan", "Omgevingsverordening", "Waterschapsverordening")


def slug(s):
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in (s or "")).strip("-")[:40]


def to_path(pixel_geojson, ndp=1):
    """GeoJSON (Multi)Polygon in pixelcoords -> SVG path 'd'."""
    g = pixel_geojson
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    parts = []
    for poly in polys:
        for ring in poly:
            pts = [f"{round(x, ndp)},{round(y, ndp)}" for x, y in ring]
            if len(pts) >= 3:
                parts.append("M" + "L".join(pts) + "Z")
    return "".join(parts)


def rd_to_px(x, y):
    return ((x - L) / (R - L) * W, (T - y) / (T - B) * H)


def fetch_perceel():
    """Kadastraal perceel rond het punt via PDOK WFS -> SVG-pad in pixels."""
    url = ("https://service.pdok.nl/kadaster/kadastralekaart/wfs/v5_0"
           "?service=WFS&version=2.0.0&request=GetFeature&typeNames=kadastralekaartv5:Perceel"
           "&count=1&srsName=EPSG:28992&outputFormat=application/json"
           f"&bbox={X-3},{Y-3},{X+3},{Y+3},EPSG:28992")
    try:
        js = httpx.get(url, timeout=30).json()
        feats = js.get("features") or []
        if not feats:
            return None
        geom = feats[0]["geometry"]
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        px = {"type": "MultiPolygon" if geom["type"] == "MultiPolygon" else "Polygon",
              "coordinates": [[[list(rd_to_px(x, y)) for x, y in ring] for ring in poly] for poly in polys]}
        if geom["type"] == "Polygon":
            px["coordinates"] = px["coordinates"][0]
        p = feats[0]["properties"]
        return {"id": "perceel", "laag": "perceel", "type": "perceel",
                "naam": f"Perceel {p.get('perceelnummer', '')}".strip(),
                "d": to_path(px)}
    except Exception as e:
        print("  perceel overslaan:", type(e).__name__, str(e)[:120])
        return None


def main():
    data = json.load(open(OUT, encoding="utf-8"))
    c = psycopg.connect(DB_URL, row_factory=dict_row)
    cur = c.cursor()

    cur.execute("""SELECT r.frbr_expression expr, r.documenttype dt FROM p2p.regeling r
        JOIN p2p.locatie_subdiv ls ON ls.identificatie=r.regelingsgebied_id
        WHERE ST_Intersects(ls.geometrie, ST_SetSRID(ST_MakePoint(%s,%s),28992))
          AND NOT r.inactief AND r.documenttype=ANY(%s)""", (X, Y, list(DEC)))
    expr_by_dt = {r["dt"]: r["expr"] for r in cur.fetchall()}

    env = "ST_MakeEnvelope(%s,%s,%s,%s,28992)"
    # RD -> pixel affine (x'=a*x+xoff ; y'=e*y+yoff)
    a = W / (R - L); xoff = -L * a
    e = -H / (T - B); yoff = T * H / (T - B)

    features = []
    wid_to_fids = {}   # regeltekst_wid -> [feature-id,...]
    seen = set()
    for doc in data["documenten"]:
        expr = expr_by_dt.get(doc["documenttype"])
        if not expr:
            continue
        cur.execute(f"""
            SELECT g.identificatie gid, g.type, g.naam,
                   ST_AsGeoJSON(ST_SimplifyPreserveTopology(
                     ST_Affine(ST_Intersection(ST_CollectionExtract(ST_MakeValid(geo.g),3),
                                               {env}), %s,0,0,%s,%s,%s), 1.2)) pgj,
                   ST_Area(ST_Intersection(geo.g, {env})) area_in,
                   array_agg(DISTINCT jr.regeltekst_wid) wids
            FROM p2p.juridische_regel jr
            JOIN p2p.juridische_regel_gebiedsaanwijzing jrg ON jrg.juridische_regel_id=jr.identificatie
            JOIN p2p.gebiedsaanwijzing g ON g.identificatie=jrg.gebiedsaanwijzing_id
            JOIN LATERAL (SELECT ST_Collect(ls.geometrie) g FROM p2p.locatie_subdiv ls
                          WHERE ls.identificatie=g.locatie_id) geo ON true
            WHERE jr.regeling_expression=%s
              AND ST_Intersects(geo.g, {env})
            GROUP BY g.identificatie, g.type, g.naam, geo.g
            HAVING ST_Area(ST_Intersection(geo.g, {env})) > 150
            ORDER BY area_in ASC
        """, (L, B, R, T, a, e, xoff, yoff, L, B, R, T, expr, L, B, R, T, L, B, R, T))
        rows = cur.fetchall()
        frame_area = (R - L) * (T - B)
        for r in rows:
            if not r["pgj"]:
                continue
            pgj = json.loads(r["pgj"])
            if not pgj.get("coordinates"):
                continue
            fid = f"{doc['documenttype'][:2].lower()}-{slug(r['naam']) or r['gid'][-8:]}"
            if fid in seen:
                continue
            seen.add(fid)
            d = to_path(pgj)
            if not d:
                continue
            features.append({
                "id": fid, "laag": "werkingsgebied", "type": r["type"], "naam": r["naam"],
                "documenttype": doc["documenttype"],
                "dekt_beeld": r["area_in"] >= frame_area * 0.985,  # vult (bijna) het hele beeld
                "d": d,
            })
            for w in (r["wids"] or []):
                wid_to_fids.setdefault(w, []).append(fid)

    # perceel als referentiecontour
    perceel = fetch_perceel()
    if perceel:
        features.append(perceel)

    # artikelen -> geo_ids via regeltekst-wid (artikel-wid + leden-wids)
    n_gekoppeld = 0
    for doc in data["documenten"]:
        for h in doc["hoofdstukken"]:
            for art in h["artikelen"]:
                wids = [art.get("wid")] + [l.get("wid") for l in art.get("leden", [])]
                fids = []
                for w in wids:
                    for fid in wid_to_fids.get(w, []):
                        if fid not in fids:
                            fids.append(fid)
                if fids:
                    art["geo_ids"] = fids
                    n_gekoppeld += 1

    data["geo"] = {
        "bbox_rd": [round(L, 2), round(B, 2), round(R, 2), round(T, 2)],
        "size": [W, H],
        "afbeelding": "./img/broekhem-onderkaart-grijs.png",
        "punt": [round((X - L) / (R - L) * W, 1), round((T - Y) / (T - B) * H, 1)],
        "features": features,
    }

    json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    with open(OUT.replace(".json", ".js"), "w", encoding="utf-8") as f:
        f.write("window.ROM_DATA=" + json.dumps(data, ensure_ascii=False) + ";")
    c.close()
    print(f"geo geschreven: {len(features)} contouren, {n_gekoppeld} artikelen gekoppeld")
    for ft in features:
        print(f"  {ft['laag']:14} {ft.get('type',''):20} {str(ft['naam'])[:34]:34} {'(vult beeld)' if ft.get('dekt_beeld') else ''}")


if __name__ == "__main__":
    main()
