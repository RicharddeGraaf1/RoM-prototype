# Realisatieplan — Regels op maat (RoM)

> Opgesteld 2026-09-16. Vertrekpunt: het statische prototype in deze repo (Broekhem 33),
> de DSO-mockups (`PNG/`, en de screenshotreeks "prototype B"), en de gekozen huisstijl
> **C · Document en interface** ([ontwerp/](ontwerp/)).

## Stand van uitvoering

Bijgewerkt 2026-09-16. Lokaal gebouwd en getest (`wrangler pages dev` tegen productie-OCD), **nog niet gecommit of online**.

| Fase | Stand | Nog open |
|---|---|---|
| 0 · Stijl C als bouwsteen | ✅ `public/stijl.css`: tokens, donkere variant, bouwstenen; `--ocd-*` gezet voor de regeltekst-component | Het register laadt het bestand nog niet (dat is het parallelle spoor) |
| 1 · Online in stijl C | ◐ Repo-indeling (`public/`, `functions/`, `wrangler.toml`), `_headers` met CSP, disclaimer in kop en voet | Pages-project + subdomein + geheim `OCD_API_KEY_PUBLIC`; menu-item in het register zodra het domein bestaat. De statische Broekhem-variant is **niet** apart in stijl C gezet: fase 3 maakte hem overbodig |
| 2 · Echte kaart | ✅ OpenLayers 10.10 gevendord, RD zonder proj4, PDOK BRT grijs, perceel + punt, klik = nieuwe locatie | Werkingsgebieden (fase 5) |
| 3 · Elke locatie, live | ✅ PDOK suggest/lookup/reverse (adres én perceel), proxy-whitelist, documenten in vier groepen (lokaal · Wro · beleid · Rijk), structuur uit `/boom` met hoofdstuk- en afdelingstitels, leden via `ocd-regeltekst`, Juridisch/Begrijpelijk, locatie in de URL | Handmatige toets tegen Regels op de kaart |
| 4 · Onderwerp-chips | ✅ Besluit **A** (indeling van het register), zonder OCD-wijziging: `/onderwerpen` per document ∩ de artikelen op het punt, client-side. Chips per document, filter binnen een document, "niet ingedeeld" zichtbaar | — |

Getest op Broekhem 33 (Valkenburg), Dam 1 (Amsterdam), Bergstraat 4 (Ede), Grote Markt 1
(Groningen), een kaartklik en 400 px breed. Het Bal (2.441 artikelen op het punt) opent in ~2 s.

**Afwijking van het plan in fase 4:** de categorieën van het register zijn direct als chip
gebruikt, zonder mapping naar een handvol brede thema's. Dat houdt register en RoM
één-op-één gelijk; de prijs is meer chips per document (tot ~12).

**Bevindingen onderweg**
- `/v1/viewer/regeling/{expr}/boom` levert per lid al de annotaties (activiteiten,
  gebiedsaanwijzingen, normwaarden). Het kenmerkenpaneel van fase 6 heeft daardoor mogelijk
  **geen nieuw OCD-endpoint** nodig. ⚠️ Te verifiëren of dat voor alle regelingen gevuld is.
- De Limburgse omgevingsverordening heet in `regelmix` "Wijzigingsverordening 2024 Om" — het
  opschrift van de geconsolideerde regeling lijkt niet te kloppen. ⚠️ Te verifiëren in OCD
  (`p2p.regeling.opschrift`), niet in RoM oplossen.

## Waar we naartoe gaan

Een bezoeker kiest een adres of perceel, eventueel met een vraag erbij ("mag ik een aanbouw
bouwen?"). Links ziet die welke documenten daar gelden, per thema, en kan die doorklikken tot
op de leden van een artikel. Rechts staat een kaart met het perceel en het werkingsgebied van
het artikel dat openstaat. Een infopaneel toont per artikel de toelichting, de kenmerken en de
mogelijke beperkingen, zoals externe veiligheid en geluid.

Wat het **niet** is: het Omgevingsloket. Daarom geen DSO-groen, geen loket-logo en geen
"Concept"-banner die suggereert dat het er ooit één wordt. Het hoort bij de familie van
omgevingsdocumentenregister.nl en draagt dezelfde disclaimer.

## Uitgangspunten (besloten)

| Keuze | Besluit | Waarom |
|---|---|---|
| Plek | **Eigen site**, voorstel `rom.omgevingsdocumentenregister.nl`, met een menu-item "Regels op maat · prototype" in het register | Een prototype mag half af zijn zonder het live register te raken |
| Stijl | **C · Document en interface**: de bediening in sans-serif (Atkinson Hyperlegible) op een koelgrijze ondergrond, de brontekst op witte bladen in een serif (Source Serif 4), mono (IBM Plex Mono) voor identificaties, accent op hue 262 | De gebruiker ziet in één oogopslag wat regeltekst is en wat bediening. Het DSO doet het niet zo |
| Deploy | Cloudflare Pages, **Git-gekoppeld**, `public/` als publish-directory, `functions/api` als proxy naar OCD | Zelfde patroon als het register. Géén `wrangler pages deploy .` (het `.env`-lek op ponsenkaart) |
| Regeltekst | De gedeelde component [`lib/ocd-regeltekst.js`](../lib/README.md) | Eén weergave voor alle OCD-afnemers. Stijl C moet dus ook dáár landen |
| Eerlijkheid | Waar een plan geen annotatie heeft, zegt het scherm dat. Niets verzinnen om de mockup te halen | Zie [ARCHITECTUUR.md §2](ARCHITECTUUR.md): het omgevingsplan van Valkenburg heeft 0 geannoteerde artikelen |

## Wat er al ligt en wat ontbreekt

Gecheckt tegen de OCD-code op 2026-09-16. Alleen de code is gelezen, niet live aangeroepen.

| Nodig voor | Bestaat in OCD | Via register-proxy bereikbaar? | Gat |
|---|---|---|---|
| Adres → coördinaat | `GET /v1/adres?alleen_locatie=true` | Nee | Geen autocomplete. Die kan rechtstreeks bij PDOK Locatieserver `suggest` (kent ook percelen) |
| Welke documenten gelden hier | `GET /v1/viewer/regelmix?x&y` | Nee | — |
| Artikelkoppen per document | `GET /v1/viewer/regelmix/document?x&y&bron` | Nee | — |
| Artikeltekst | `POST /v1/viewer/teksten`, `GET /v1/viewer/tekst/{wid}` | Ja | — |
| Thema's per artikel | `GET /v1/viewer/regeling/{expr}/onderwerpen` (onderwerp-as) | Ja | Werkt per document, niet per locatie. Het prototype gebruikt een **andere** as (embedding-centroïden) die nergens live staat |
| Gebiedsaanwijzingen op het punt | `GET /v1/viewer/objecten?x&y` | Nee | — |
| Geometrie | `GET/POST /v1/viewer/geometrie`, MVT `/v1/tiles/locaties/…` | Nee | Er is geen endpoint dat **artikel → werkingsgebied** voor één punt teruggeeft. `build_geo.py` doet dat nu offline |
| Kenmerken (type regel, functies, normen) | Alleen offline in `build_data.py` | — | Endpoint nodig |
| Toelichting per artikel | Geen | — | Endpoint nodig |
| Beperkingen (externe veiligheid, geluid) | `GET /v1/leefomgeving/readout?x&y&lagen=` | Nee | Bron is RIVM/PDOK, niet het DSO. Zo labelen |
| Vraag → relevante regels | `POST /v1/semantisch` | Nee | Hangt aan een embedding-service op Railway. Of die bereikbaar is, is ⚠️ nog niet geverifieerd. `antwoord-bij-vraag` geeft 503 in productie |
| Perceelgrens | Geen, PDOK Kadastrale Kaart WFS | — | Rechtstreeks bij PDOK |

**OCD-wijzigingen zijn productie-wijzigingen**: een push naar `main` deployt. Elke fase die een
nieuw endpoint vraagt, levert dat endpoint dus als aparte, kleine OCD-commit.

## Fasen

Elke fase eindigt met iets dat je live kunt laten zien.

### Fase 0 — Stijl C als bouwsteen · klein

**Wat je ziet:** nog niets nieuws voor bezoekers. Wel één stijlbestand dat RoM, en later het
register, delen.

- `stijl.css` met de tokens uit [ontwerp/build.mjs](ontwerp/build.mjs) (`--grond`, `--blad`,
  `--inkt*`, `--acc`, status- en themakleuren) plus de basiscomponenten: blad, label, tag,
  badge, chip, kaartknop. Met een donkere variant, want het register heeft er ook één.
- `ocd-regeltekst.js` krijgt de serif-leesweergave via CSS-variabelen, niet via een fork.
- Themakleuren vastleggen als apart palet, los van goed/matig/zwak.

**Klaar als:** het register en RoM hetzelfde bestand kunnen laden zonder dat er iets breekt.

### Fase 1 — Het huidige prototype in stijl C, online · klein

**Wat je ziet:** Broekhem 33 zoals nu, maar in de nieuwe stijl en op een eigen adres.

- `index.html` omzetten naar stijl C op de bestaande `data/broekhem33.json`. Nog geen live data.
- De DSO-variant (`index-dso.html`) blijft als referentie in de repo staan, maar gaat niet online.
- Repo-indeling zoals het register: `public/` (site), `functions/` (proxy, nog leeg), `docs/`.
  `tools/`, `PNG/` en `data/*.json` blijven buiten `public/`.
- Pages-project aanmaken, subdomein koppelen, `_headers` met CSP overnemen van het register.
  Denk aan de `?v=`-token: de TTL van de zone overrulet `_headers` voor `.js` en `.css`.
- In het register een menu-item "Regels op maat · prototype" dat hierheen linkt.

**Klaar als:** de link werkt, en de disclaimer "Onafhankelijk · geen officiële overheidsbron"
op de pagina staat.

### Fase 2 — Een echte kaart · middel

**Wat je ziet:** je kunt pannen en zoomen. Het perceel en de werkingsgebieden liggen op een
grijze onderkaart.

Keuze voor de kaartbibliotheek. Alles wordt meegeleverd onder `public/vendor/`, want de CSP staat
alleen `script-src 'self'` toe:

| | OpenLayers | Leaflet + Proj4Leaflet | MapLibre GL |
|---|---|---|---|
| RD (EPSG:28992), zoals PDOK en de OCD-tiles | Native | Via plugin | Nee, alleen Web Mercator |
| Vectortiles (MVT) van OCD | Native | Extra plugin | Native, maar niet in RD |
| Grootte | ~ 450 KB | ~ 150 KB + plugins | ~ 800 KB |
| **Advies** | **Deze** | Te veel losse plugins | Past niet bij het RD-grid van OCD |

- Onderkaart: PDOK BRT-achtergrondkaart `grijs`, WMTS in EPSG:28992. Die gebruikt het register al in `gio.js`.
- Perceel: PDOK Kadastrale Kaart WFS, rechtstreeks (`connect-src` aanvullen).
- Werkingsgebieden: voorlopig nog uit het `geo`-blok van de statische JSON.
- CSP: `worker-src blob:` alleen als de bibliotheek het echt vraagt, en `img-src`/`connect-src` voor PDOK.

**Klaar als:** Broekhem 33 met een interactieve kaart en dezelfde overlay als nu.

### Fase 3 — Elke locatie, live · middel

**Wat je ziet:** je typt een adres of perceelnummer, of klikt op de kaart, en krijgt de
documenten en artikelen die dáár gelden. Nog zonder thema-chips.

- Zoekveld met PDOK Locatieserver `suggest` (adressen én percelen) → RD-coördinaat.
- Klik op de kaart → coördinaat → dezelfde flow. "Mijn locatie" kan pas als de
  `Permissions-Policy` `geolocation` toestaat. Dat is een bewuste keuze, geen detail.
- Eigen proxy in `functions/api` met een eigen whitelist:
  `/v1/viewer/regelmix`, `/v1/viewer/regelmix/document`, `/v1/viewer/teksten`,
  `/v1/viewer/tekst`, `/v1/viewer/objecten`. Nooit `/v1/adres` zonder `alleen_locatie`, want
  die antwoorden kunnen ~19 MB groot worden.
- Artikeltekst via `ocd-regeltekst.js`.
- Ow en Wro naast elkaar (tag OW/WRO), zoals in het ontwerp.
- De locatie en de vraag in de URL (`?x=…&y=…&adres=…`), zodat een resultaat deelbaar is.

**Klaar als:** drie willekeurige adressen in drie verschillende gemeenten een zinnige
documentenlijst geven. Toets er één met de hand tegen Regels op de kaart.

### Fase 4 — Thema-chips live · middel, **eerst een besluit**

**Wat je ziet:** de gekleurde chips (Wonen 3, Groen 5, …) per document, en filteren op thema.

Er liggen twee assen, en die zijn niet hetzelfde:

| | A · Onderwerp-as van het register (`v2a.artikel_indeling`) | B · Embedding-thema's van het prototype |
|---|---|---|
| Staat live | Ja, `/onderwerpen` per document | Nee, alleen offline met Ollama |
| Dekking | 84,8% van de artikelen ingedeeld. De rest "niet ingedeeld" | Alles krijgt een thema, of "overig" boven `DIST_MAX` |
| Consistent met het register | Ja, dezelfde categorieën als het categoriefilter | Nee, een tweede taxonomie |
| Grofheid | Categorie > subcategorie, fijner dan de 6 chips | 6 brede thema's, zoals in de mockup |
| Bekend risico | wId-drift: indeling via wId faalt stil bij gedrifte regelingen (Ede 0%) | Een nieuwe locatie vraagt eerst een embed-stap |

**Advies: A**, met een vaste mapping van categorieën naar een handvol chips. Dan zeggen register
en RoM hetzelfde over hetzelfde artikel, en draait er niets offline. Wat niet is ingedeeld, telt
zichtbaar als "niet ingedeeld" en niet als een verzonnen thema. De wId-drift is dan een bekend
en apart op te lossen gat: classificeer de wijzigingstekst zelf.

**OCD-werk:** `/onderwerpen` gefilterd op de wids die op het punt gelden, of een variant
`/v1/viewer/regelmix/document` die de categorie per artikel meegeeft.

### Fase 5 — Werkingsgebied bij het artikel · middel, OCD-endpoint

**Wat je ziet:** open je een artikel, dan licht op de kaart het gebied op waar het geldt.

- Nieuw OCD-endpoint, bijvoorbeeld `GET /v1/viewer/rom/werkingsgebieden?x&y&expr`: per artikel-wid
  de gebiedsaanwijzingen en locaties, met vereenvoudigde geometrie in RD. De SQL staat al in
  `tools/build_geo.py` (via `juridische_regel` → `juridische_regel_gebiedsaanwijzing` →
  `locatie_subdiv`). Die hoeft alleen van offline naar een endpoint te verhuizen.
- Provinciebrede gebieden die het hele beeld vullen tonen als rand, niet als vlak. Die regel
  staat al in `build_geo.py`.
- Artikelen zónder gebiedsaanwijzing (heel Valkenburg) krijgen de tekst "geldt in het hele
  regelingsgebied". Geen leeg gebied tonen.

**Klaar als:** bij Broekhem 33 de Omgevingsverordening en de Waterschapsverordening gebieden
oplichten, en het omgevingsplan dat eerlijk niet doet.

### Fase 6 — Het infopaneel · middel, OCD-endpoints

**Wat je ziet:** de drie tabbladen uit het ontwerp.

- **Kenmerken**: type regel, activiteit, functies, normen en normwaarden. Nieuw endpoint op basis van
  de joins uit `build_data.py`. Is het leeg, dan staat er "niet geannoteerd in dit plan".
- **Toelichting**: de artikelsgewijze toelichting bij het artikel. Er is nog geen endpoint, en
  ⚠️ te verifiëren is hoe betrouwbaar de koppeling tussen artikel en toelichting in de data is.
  Zonder betrouwbare koppeling blijft dit tabblad weg.
- **Beperkingen**: `/v1/leefomgeving/readout` (extern, geluid), met een schakelaar per laag op
  de kaart. Bij de bron zetten dat het RIVM/PDOK is en geen DSO-regel.

### Fase 7 — De vraag · groot, afhankelijk van infrastructuur

**Wat je ziet:** "mag ik een aanbouw bouwen?" zet de relevante artikelen bovenaan.

- **Stap 1, zonder AI:** de vraag filtert op thema en trefwoorden, via de SKOS-activiteit-as.
  "Aanbouw" → bouwactiviteit. Dat is goedkoop en werkt meteen.
- **Stap 2, met embeddings:** `/v1/semantisch`, beperkt tot de locatie. Die helpt juist bij
  norm-vragen ("hoe hoog mag…"), waar SKOS blind is. Voorwaarde: de embedding-service op
  Railway draait en gebruikt hetzelfde model als de index.
- **Geen gegenereerd antwoord** in dit traject. RoM toont regels en geeft geen oordeel.

## Parallel spoor — het register naar stijl C

Los van RoM, maar met hetzelfde stijlbestand uit fase 0: Newsreader, de papierkorrel en de
2px-inktlijnen verdwijnen; bladen en panelen komen ervoor in de plaats. Doe het per scherm
(zoeken → documentdetail → bronhouders → landelijk beeld), en elke keer de `?v=`-token ophogen.
Pas beginnen als fase 1 staat, zodat de stijl zich eerst op RoM bewijst.

## Open besluiten

1. **Subdomein of pad?** Het voorstel is `rom.omgevingsdocumentenregister.nl`.
2. **Thema-as** (fase 4): A (onderwerp-as van het register) of B (embeddings). Advies A.
3. **Geolocatie toestaan** (fase 3): nu staat `geolocation=()` in het register.
4. **Toelichting** (fase 6): alleen bouwen als de koppeling betrouwbaar blijkt.
5. **Scope-grens**: het register toont alleen de geldende situatie. Toont RoM ook ontwerpbesluiten
   en voorbereidingsbesluiten? De mockup laat "voorbereidingsbescherming" zien. Dat botst met die grens.

## Bekende valkuilen

- **Een hol plan is geen bug.** Nul annotaties in een bruidsschat-plan is de werkelijkheid.
  Verdenk eerst de eigen query voordat je een gat publiceert.
- **Wro-plannen** komen uit een ander pad (`bron_type=wro`), met bestemmingen in plaats van artikelen.
- **Cache op het custom domein**: `.js` en `.css` krijgen alsnog 4 uur. Hoog altijd de `?v=` op.
- **Lokale OCD-DB** kan bij zware builds 500's geven op de viewer-endpoints (cache). Test tegen productie.
- **Ontwerp-png's** in `ontwerp/png/` zijn gerenderd zonder webfonts (fallback-serif). De echte
  letters staan in het canvas en in `build.mjs`.
