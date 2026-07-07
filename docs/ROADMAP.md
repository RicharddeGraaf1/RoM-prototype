# Roadmap / vervolgstappen

De PoC dekt: browse per thema, geneste artikelstructuur, ⓘ-paneel met echte
IMOW-annotaties (eerlijk waar leeg), twee schil-varianten, echte luchtfoto. Wat er nog
kan, ongeveer op volgorde van waarde/inspanning:

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
7. **Echte interactieve kaart** i.p.v. luchtfoto-placeholder: perceel-contour + de
   werkingsgebieden van geselecteerde regels (Leaflet + PDOK-tiles, of `dso-map`).
8. **DSO-variant offline** — CDN-assets vendoren (zie [DSO-TOOLKIT.md](DSO-TOOLKIT.md#offline-maken-optioneel)).
9. **Volwaardige DSO-componenten** (`dso-document-component`, `dso-annotation-*`): de
   officiële viewer-bouwstenen. Grotere stap — vergt de exacte property-datastructuren
   (Storybook raadplegen).
10. **Zoekvraag-modus**: de mockups tonen een "Zoekvraag"-balk. Koppelbaar aan het
    OCD-`/v1/semantisch`-endpoint (geo-gescopet, hybride) om regels op een vraag te filteren
    i.p.v. te browsen.

## Andere locaties
Zie [DATA.md](DATA.md#andere-locatie). Kort: RD-coördinaat opzoeken → embed-stap in OCD →
`X/Y/ADRES` in `build_data.py` → luchtfoto vervangen → regenereren.
