# Architectuur — RoM-prototype

Verkennende weergave ("Regels op maat") van de regels die op één locatie gelden,
georganiseerd per **inhoudelijk thema**. Demo-locatie: **Broekhem 33, Valkenburg**.

## Grote lijn

```
OCD-database  ──►  tools/build_data.py  ──►  data/broekhem33.json (+ .js)  ──►  index*.html
(p2p/v2a/core)     (thema's + nesting +        het datacontract                 statische pagina
                    annotaties)                                                  (geen backend)
```

De pagina is **puur statisch**: alle intelligentie zit in de bouwstap. Op runtime
wordt er niets berekend of opgehaald — alleen de JSON getoond. Daardoor werkt het
door dubbelklikken (`file://`), zonder server.

## Twee varianten (zelfde data, andere schil)

| Bestand | Schil | Internet |
|---|---|---|
| `index.html` | Eigen, hand-gestylede Omgevingsloket-look. | Nee |
| `index-dso.html` | Officiële **DSO-toolkit 98.0.0** (`dso.css` + web-componenten). | Ja (CDN) |

Beide laden dezelfde `data/broekhem33.js` (`window.ROM_DATA`) en delen de render-logica.
De DSO-variant gebruikt echte componenten: `dso-label` (chips + gebiedsaanwijzing-tags),
`dso-alert` (lege-annotatie-melding), `dso-info-button` (de ⓘ), `dso-icon`.
Zie [DSO-TOOLKIT.md](DSO-TOOLKIT.md) voor de CDN-paden en welke componenten (niet) werkten.

## De drie schermen (uit de mockups in `PNG/`)

1. **Overzicht** — per document een kaart met gekleurde **thema-chips** (met tellingen).
2. **Drill-down** — klik een document open → hoofdstukken → artikelen (uitklapbaar naar
   Lid 1/2/3, met a/b/c inline).
3. **ⓘ Kenmerken** — per artikel een paneel: *type regel*, *gebiedsaanwijzingen*
   (functie e.d.), *omgevingsnormen*.

## Datacontract

Zie de tabel in [../README.md](../README.md#datacontract-databroekhem33json). Kern:
`locatie → themas(legenda) → documenten[] → hoofdstukken[] → artikelen[] →
{ thema, kenmerken{type_regel, functies[], normen[]}, leden[] }`.

## Kernkeuzes & bevindingen (belangrijk om te snappen vóór je verder bouwt)

### 1. Thema's komen uit EMBEDDINGS, niet uit de annotatie
De thema-chips (Wonen/Bouwen/Water/…) worden bepaald met **seed-centroïde-classificatie**
op de tekst-embeddings (nomic-embed-text in `v2a.tekst_embedding`): elk thema heeft een
zaad-omschrijving → centroïde → elke regel-chunk krijgt het dichtstbijzijnde thema.
Dit is **geen** per-locatie clustering (dat geeft instabiele categorieën), maar een
**vaste taxonomie** die overal werkt.

**Waarom niet de officiële IMOW-functie-annotatie als chips?** Omdat die vaak **leeg** is —
zie hieronder.

### 2. De annotatie-laag is vaak hol (content-realiteit, geen bug)
Geverifieerd op de OCD-data voor deze locatie:

| Document | artikelen | met functie/norm-annotatie |
|---|---|---|
| Omgevingsplan Valkenburg | 179 | **0** (alle regels "RegelVoorIedereen") |
| Omgevingsverordening Limburg | 101 | **52** |
| Waterschapsverordening Limburg | 149 | 8 |

Het Valkenburg-omgevingsplan heeft z'n regels simpelweg niet geannoteerd met
gebiedsaanwijzingen/normen (een bruidsschat-plan). Het join-mechanisme wérkt en is
elders wél rijk gevuld — dit is dus geen loader-gap.

**Gevolg voor het ontwerp:** de embedding-thema's dragen de categorisering (werken overal);
het ⓘ-paneel toont de échte annotatie waar aanwezig en **eerlijk "niet geannoteerd in dit
plan"** waar leeg. Nooit verzinnen om de mockup te matchen.

### 3. Annotatie-join
`p2p.tekst_element.wid` = `juridische_regel.regeltekst_wid`, dan via junctions naar
`gebiedsaanwijzing` (functie/ruimtelijk gebruik/natuur/…) en `norm`/`normwaarde`
(bouwhoogte etc.). Verzameld per artikel over artikel-wid + leden-wids, gededupliceerd.

## Scope-afbakening (huidige demo)
- Alleen **decentrale normatieve** regelingen: Omgevingsplan, Omgevingsverordening,
  Waterschapsverordening. Landelijke AMvB's (Bbl/Bal) en beleidsdocumenten (visies/
  programma's) zijn hier weggelaten om de browse-lijst scherp te houden.
- Toelichting en informatieobject-verwijzingen (`/join/regdata/`) zijn uitgefilterd.
