# RoM — Regels op maat (prototype)

Verkennende, categorie-gedreven weergave van de regels die op één locatie gelden
(**Broekhem 33, Valkenburg**). Statische demo: geen backend nodig.

## Documentatie
- [docs/ARCHITECTUUR.md](docs/ARCHITECTUUR.md) — hoe het in elkaar zit + de kernkeuzes en databevindingen.
- [docs/DATA.md](docs/DATA.md) — de data (her)genereren, andere locatie, thema's tunen.
- [docs/DSO-TOOLKIT.md](docs/DSO-TOOLKIT.md) — CDN-paden + welke DSO-componenten (niet) werkten.
- [docs/ROADMAP.md](docs/ROADMAP.md) — vervolgstappen.

## Twee varianten
| Bestand | Stijl | Internet nodig? |
|---|---|---|
| **`index.html`** | Eigen, hand-gestylede Omgevingsloket-look. Volledig self-contained. | Nee — dubbelklikken werkt |
| **`index-dso.html`** | Officiële **DSO-toolkit 98.0.0** (`dso.css` + web-componenten: `dso-label`, `dso-alert`, `dso-info-button`, `dso-icon`). Echte DSO look-and-feel. | Ja — laadt de toolkit van `cdn.dso-toolkit.nl` |

## Draaien
**Dubbelklik `index.html`** (of `index-dso.html` mét internet) — geen server nodig.
De data zit in `data/broekhem33.js` als `window.ROM_DATA` en wordt via een `<script>`-tag
geladen, dus geen `fetch`/CORS-probleem op `file://`. Voeg `?open=1` aan de URL toe om
meteen naar de uitgeklapte drill-down + ⓘ-paneel te springen (demo).

## Structuur
- `index.html` / `index-dso.html` — de twee varianten (zie boven). Beide tonen per document
  de **thema-chips**, geneste artikelen (Hoofdstuk → Artikel → Lid) en het **ⓘ-paneel** met
  IMOW-annotaties; filterbaar per thema. Rechts een **kaart** met de grijze onderkaart en de
  **werkingsgebied-contouren** als SVG-overlay: beweeg over een artikel (herkenbaar aan ◈) en
  het bijbehorende werkingsgebied licht op. Het perceel staat er als rode stippellijn.
- `data/broekhem33.js` — runtime-data (`window.ROM_DATA`), door beide pagina's geladen.
- `data/broekhem33.json` — hetzelfde als datacontract (zie hieronder).
- `img/broekhem-onderkaart-grijs.png` — grijze PDOK-onderkaart (BRT-achtergrondkaart, style
  `grijs`) van de locatie (kaartvlak). De oude luchtfoto (`broekhem-luchtfoto.jpg`) staat er nog.
- `tools/build_data.py` — generator die de regel-data uit de OCD-database bouwt (zie [docs/DATA.md](docs/DATA.md)).
- `tools/build_geo.py` — verrijkt de data met het `geo`-blok (werkingsgebied-contouren + perceel)
  voor de kaart-overlay. Draai ná `build_data.py` (los script; geen Ollama nodig).
- `tools/onderkaart_grijs.py` — bouwt de grijze onderkaart uit PDOK-tiles.
- `docs/` — projectdocumentatie. `PNG/` — de design-mockups waarop dit gebaseerd is.

## Data regenereren
`python tools/build_data.py` — vereist de OCD-omgeving (Postgres + Ollama nomic).
Prerequisites en het aanpassen naar een andere locatie: [docs/DATA.md](docs/DATA.md).

> **DSO-variant offline maken?** Nu laadt `index-dso.html` `dso.css` + de componenten van
> de CDN. Voor volledig offline gebruik moeten die assets (+ Asap-font) lokaal gevendord worden.

## Datacontract (`data/broekhem33.json`)
```
locatie   { adres, x, y, gemeente }
themas[]  { id, naam, kleur }                          # vaste thema-taxonomie (legenda)
documenten[] {
  titel, documenttype, bevoegd_gezag, bestuurslaag,
  themas[]  { id, aantal }                             # chip-tellingen (artikelen per thema)
  hoofdstukken[] {
    titel,
    artikelen[] {
      nummer, opschrift, wid, thema,                   # wid = deeplink Regels op de kaart
      kenmerken { type_regel, functies[], normen[] },  # ⓘ-paneel (IMOW-annotatie)
      geo_ids[],                                        # verwijst naar geo.features (kaart-overlay)
      leden[] { nummer, tekst, wid }                   # a/b/c staan inline in tekst
    }
  }
}
geo {                                                  # kaart-overlay (door build_geo.py)
  bbox_rd [xmin,ymin,xmax,ymax], size [w,h],           # frame van de grijze onderkaart (EPSG:28992)
  afbeelding, punt [px,py],                            # onderkaart-pad + locatiepunt in pixels
  features[] { id, laag, type, naam, dekt_beeld, d }   # d = SVG-pad in pixelcoords; laag=werkingsgebied|perceel
}
```
`kenmerken.functies` = `{ type, naam }` (gebiedsaanwijzingen, bv. functie=Wonen);
`kenmerken.normen` = `{ naam, eenheid, waarde }` (omgevingsnormen, bv. bouwhoogte).

## Herkomst van de data
Gegenereerd uit de OCD-database (`v2a.tekst_embedding`, geo-scope op regelingsgebied van
het punt). Thema's toegewezen via **seed-centroïde nearest-neighbour** op de
`nomic-embed-text`-embeddings — een vaste, benoemde thema-taxonomie i.p.v. per-locatie
clustering. Alleen decentrale normatieve regelingen (Omgevingsplan / Omgevingsverordening /
Waterschapsverordening); toelichting en informatieobject-verwijzingen zijn eruit gefilterd.

## Datastaat & bevindingen
- **Artikelnesting** (Hoofdstuk → Artikel → Lid) ✅ en het **ⓘ-paneel Kenmerken**
  (type regel · functie-gebiedsaanwijzingen · omgevingsnormen) ✅ zijn geïmplementeerd
  op échte OCD-data (`juridische_regel` → `gebiedsaanwijzing`/`norm` via `wid`).
- **Belangrijke databevinding**: het **Omgevingsplan Valkenburg heeft 0 functie/norm-
  annotaties** (592 regels, allemaal "RegelVoorIedereen") — content-realiteit, geen
  loader-gap. De **Omgevingsverordening Limburg** heeft er wél (52 artikelen) en de
  WSV 8. Daarom komen de thema-**chips** uit de embedding-categorisering (werkt overal),
  en toont het ⓘ-paneel eerlijk "niet geannoteerd in dit plan" waar de annotatie ontbreekt.
  Dit is precies waarom embedding-categorisering nodig is.

## Vervolgstappen
Zie [docs/ROADMAP.md](docs/ROADMAP.md). Kort: sectie *Mogelijke beperkingen*, de ⓘ-tabs
*Toelichting/Beperkingen*, Bbl-bouwregels, echte interactieve kaart, DSO-variant offline,
en optioneel een zoekvraag-modus via het OCD-`/v1/semantisch`-endpoint.
