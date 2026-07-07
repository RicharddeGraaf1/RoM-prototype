# Data genereren & uitbreiden

De pagina toont `data/broekhem33.json`. Die wordt gegenereerd door
[`tools/build_data.py`](../tools/build_data.py) uit de **OCD-database**. Dit script
draait **niet** standalone — het leunt op de OCD-omgeving.

## Prerequisites
- **OCD-Postgres** bereikbaar (default `postgresql://postgres:postgres@localhost:5434/dso`),
  met schema's `p2p`, `v2a`, `core`. Zet evt. `OCD_DB_URL` in de omgeving.
- **`v2a.tekst_embedding` gevuld voor de locatie.** De regel-chunks van de locatie
  moeten geëmbed zijn (nomic-embed-text, 768-dim). Embedden gebeurt met
  `dso-loader/scripts/embed-broekhem33.py` **in de OCD-repo** (niet hier) — dat script
  vindt de regelingen op een RD-punt en embed hun Lid/Divisietekst/Begrip-elementen.
- **Ollama** met `nomic-embed-text` op `localhost:11434` (voor de thema-centroïden).
- Python: `pip install numpy scikit-learn httpx "psycopg[binary]"`

## Regenereren (zelfde locatie)
```bash
python tools/build_data.py     # regel-data (chips, artikelen, ⓘ-annotaties)
python tools/build_geo.py      # + geo-blok voor de kaart-overlay (werkingsgebieden + perceel)
```
Schrijft `data/broekhem33.json` én `data/broekhem33.js`. De pagina's lezen de `.js`.
`build_geo.py` is een los script dat het bestaande JSON verrijkt met het `geo`-blok
(werkingsgebied-contouren als SVG-paden + het kadastrale perceel via PDOK) en per artikel
`geo_ids` toevoegt. Het raakt de chips/annotaties niet aan en heeft **geen Ollama** nodig —
wél de DB en (voor het perceel) internet. Zie [de kaart-overlay hieronder](#kaart-overlay).

## Andere locatie
1. Zoek de RD-coördinaat van het adres (PDOK Locatieserver:
   `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=<adres>&fq=type:adres`
   → veld `centroide_rd`).
2. **Embed eerst** de regelingen op dat punt in `v2a` (embed-stap in de OCD-repo).
3. Pas in `tools/build_data.py` bovenaan `X`, `Y`, `ADRES`, `GEMEENTE` aan
   (en `X`, `Y` óók in `tools/onderkaart_grijs.py` en `tools/build_geo.py`).
4. Vervang de kaart-onderkaart (`img/broekhem-onderkaart-grijs.png`) — zie onder.
5. `python tools/build_data.py` en daarna `python tools/build_geo.py`.

### Kaart-onderkaart vervangen
De onderkaart is een grijze **PDOK BRT-achtergrondkaart** (style `grijs`), als één statisch
plaatje samengesteld uit WMTS-tiles rond het punt. Genereer 'm met `tools/onderkaart_grijs.py`
(haalt 3×4 tiles op zoom 12 ≈ 0,84 m/px op, gecentreerd op `X`,`Y`, en stitcht ze):
```
# WMTS-tile-template (EPSG:28992-tilingschema, oorsprong -285401.92 / 903401.92):
https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/grijs/EPSG:28992/{z}/{col}/{row}.png
#   col = floor((X + 285401.92) / (256*res[z])),  row = floor((903401.92 - Y) / (256*res[z]))
#   res[12]=0.840  res[11]=1.680  res[10]=3.360  (m/px)
```
Opslaan als `img/broekhem-onderkaart-grijs.png` (of pas het pad in de CSS van de pagina's aan).

> **Echte BGT** i.p.v. BRT-grijs? De PDOK **BGT-WMS** (`service.pdok.nl/lv/bgt/…`) vereist
> inmiddels een API-key (geeft anders `401`). BRT-achtergrondkaart `grijs` is key-vrij en geeft
> dezelfde grijze look. Wil je écht BGT-detail, regel dan een PDOK-key.

## Kaart-overlay

De kaart is géén interactieve tegelkaart maar de **statische grijze onderkaart** met een
**SVG-overlay** eroverheen. Dat kan omdat het plaatje een exact bekende bbox heeft
(`tools/onderkaart_grijs.py` en `tools/build_geo.py` gebruiken hetzelfde EPSG:28992-frame),
dus vectorcontouren vallen er pixel-precies op — zónder Leaflet en zónder tiles op runtime.

`tools/build_geo.py` schrijft het `geo`-blok:
- **werkingsgebieden** — per regeling de gebiedsaanwijzingen (`gebiedsaanwijzing.locatie_id`
  → `p2p.locatie_subdiv.geometrie`), geclipt op het kaartbeeld, RD → pixel geprojecteerd
  (PostGIS `ST_Affine`), vereenvoudigd en als SVG-pad (`d`) opgeslagen. `dekt_beeld=true`
  markeert provinciebrede zones die het hele beeld vullen (die worden alleen als rand getoond,
  geen kleurwaas). De `type` bepaalt de kleur (zelfde palet als de ⓘ-gebiedsaanwijzingen).
- **perceel** — het kadastrale perceel via PDOK Kadastrale Kaart WFS, als rode stippellijn.
- **koppeling** — elk artikel krijgt `geo_ids` via de regeltekst-`wid`; daardoor licht bij
  hover/klik op een artikel (◈) het bijbehorende werkingsgebied op.

Let op: het **Omgevingsplan Valkenburg** heeft 0 gebiedsaanwijzingen (zie onder), dus de
oplichtende werkingsgebieden komen van de **Omgevingsverordening** en **Waterschapsverordening**.

## Thema's tunen
De taxonomie is de `THEMAS`-lijst in `build_data.py`: `(id, naam, kleur, zaad-omschrijving)`.
- **Thema toevoegen/wijzigen:** pas de zaad-woorden aan (die bepalen de centroïde).
  Bv. `wonen` bleef in het omgevingsplan op 0 omdat woon-regels daar als *activiteit*
  geformuleerd zijn; rijkere zaad-woorden of een aparte bron (functie-annotatie) helpen.
- **`DIST_MAX`** (0.62): boven deze cosine-afstand valt een chunk in "overig". Lager =
  strenger (meer overig), hoger = alles krijgt een thema.
- Geen herclustering nodig; puur nearest-centroïde, dus deterministisch en snel.

## Waar de chip-tellingen vandaan komen
Per artikel wordt het **meerderheidsthema** van zijn leden bepaald; de chip-telling per
document = aantal artikelen per thema. Filteren op een chip toont alleen die artikelen.
