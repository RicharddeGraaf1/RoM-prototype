# Roadmap / vervolgstappen

De PoC dekt: browse per thema, geneste artikelstructuur, ⓘ-paneel met echte
IMOW-annotaties (eerlijk waar leeg), twee schil-varianten, en een **grijze onderkaart met
oplichtende werkingsgebied-contouren** (SVG-overlay, offline; zie [DATA.md](DATA.md#kaart-overlay)).
Wat er nog kan, ongeveer op volgorde van waarde/inspanning:

## Dicht bij de mockups
1. **Sectie "Mogelijke beperkingen"** (externe veiligheid, geluidsaandachtgebieden).
   Bron: `p2p.gebiedsaanwijzing` (types `beperkingengebied`, `geluid`, `externe veiligheid`)
   + evt. externe registers. Toont als aparte kaartjes onder de regels, zoals in de mockup.
2. **ⓘ-tabs "Toelichting" en "Beperkingen"** vullen (nu alleen "Kenmerken"). Toelichting =
   de `Toelichting`/`ARTIKELGEWIJZE_TOELICHTING`-elementen bij het artikel.
3. **"Dit artikel geldt in" (werkingsgebied)** in het ⓘ-paneel — de `locatie`/GIO van de
   regel, met een kaart-toggle. Bron: `juridische_regel` → locatie/gebiedsaanwijzing → GIO.

## Data-verrijking
4. **`wonen`-chip in het omgevingsplan**: nu 0 (woon-regels als activiteit geformuleerd).
   Combineer de embedding-thema's met de **functie-gebiedsaanwijzing** waar die wél bestaat,
   of verrijk de zaad-woorden. Zie [DATA.md](DATA.md#themas-tunen).
5. **Bbl "Algemene bouwregels"** (AMvB) meenemen als apart kaartje (staat in de mockup).
   Let op: landelijk + generiek; overweeg tiering zodat het de lokale regels niet verdringt.
6. **Locatie-specifieke normwaarden**: nu op norm-niveau; filter `normwaarde` op de
   locatie/het punt voor de echte "op gekozen locatie: … m"-waarde uit de mockup.

## Techniek
7. **Echte interactieve kaart** (pan/zoom) i.p.v. de statische onderkaart + SVG-overlay:
   Leaflet + PDOK-tiles of `dso-map`. De huidige overlay toont het perceel + de werkingsgebieden
   van een artikel al statisch (`build_geo.py`); een tegelkaart voegt pan/zoom, klik-op-kaart →
   regels, en meerlaagse achtergronden toe. Vergt runtime-internet (of gevendorde tiles).
8. **DSO-variant offline** — CDN-assets vendoren (zie [DSO-TOOLKIT.md](DSO-TOOLKIT.md#offline-maken-optioneel)).
9. **Volwaardige DSO-componenten** (`dso-document-component`, `dso-annotation-*`): de
   officiële viewer-bouwstenen. Grotere stap — vergt de exacte property-datastructuren
   (Storybook raadplegen).
10. **Zoekvraag-modus**: de mockups tonen een "Zoekvraag"-balk. Koppelbaar aan het
    OCD-`/v1/semantisch`-endpoint (geo-gescopet, hybride) om regels op een vraag te filteren
    i.p.v. te browsen.

## Andere locaties
Zie [DATA.md](DATA.md#andere-locatie). Kort: RD-coördinaat opzoeken → embed-stap in OCD →
`X/Y/ADRES` in `build_data.py`/`onderkaart_grijs.py`/`build_geo.py` → onderkaart vervangen →
`build_data.py` + `build_geo.py` draaien.
