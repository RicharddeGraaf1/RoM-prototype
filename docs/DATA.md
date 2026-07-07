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
python tools/build_data.py
```
Schrijft `data/broekhem33.json` én `data/broekhem33.js`. De pagina's lezen de `.js`.

## Andere locatie
1. Zoek de RD-coördinaat van het adres (PDOK Locatieserver:
   `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=<adres>&fq=type:adres`
   → veld `centroide_rd`).
2. **Embed eerst** de regelingen op dat punt in `v2a` (embed-stap in de OCD-repo).
3. Pas in `tools/build_data.py` bovenaan `X`, `Y`, `ADRES`, `GEMEENTE` aan.
4. Vervang de kaart-luchtfoto (`img/broekhem-luchtfoto.jpg`) — zie onder.
5. `python tools/build_data.py`.

### Kaart-luchtfoto vervangen
PDOK luchtfoto-WMS, bbox ±170 m rond het punt:
```
https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0?service=WMS&request=GetMap
  &version=1.3.0&layers=Actueel_orthoHR&crs=EPSG:28992
  &bbox=<x-170>,<y-170>,<x+170>,<y+170>&width=800&height=800&format=image/jpeg
```
Opslaan als `img/broekhem-luchtfoto.jpg` (of pas het pad in de CSS van de pagina's aan).

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
