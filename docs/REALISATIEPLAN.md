# Realisatieplan — Regels op maat (RoM)

> Opgesteld 2026-09-16. Vertrekpunt: het statische prototype in deze repo (Broekhem 33),
> de DSO-mockups (`PNG/`, en de screenshotreeks "prototype B"), en de gekozen huisstijl
> **C · Document en interface** ([ontwerp/](ontwerp/)).

## Stand van uitvoering

Bijgewerkt 2026-09-16. **Live op https://rom.omgevingsdocumentenregister.nl** (Pages-project
`rom-prototype`, Git-gekoppeld; commit `85dd138`).

| Fase | Stand | Nog open |
|---|---|---|
| 0 · Stijl C als bouwsteen | ✅ `public/stijl.css`: tokens, donkere variant, bouwstenen; `--ocd-*` gezet voor de regeltekst-component | Het register laadt het bestand nog niet → fase 5 |
| 1 · Online in stijl C | ✅ `public/` + `functions/` + `wrangler.toml`, CSP, disclaimer; Pages-project met geheim `OCD_API_KEY_PUBLIC`, subdomein actief | Menu-item in het register → fase 5. De statische Broekhem-variant is niet apart omgezet: fase 3 maakte hem overbodig |
| 2 · Echte kaart | ✅ OpenLayers 10.10 gevendord, RD zonder proj4, PDOK BRT grijs, perceel + punt, klik = nieuwe locatie | Werkingsgebieden → fase 8 |
| 3 · Elke locatie, live | ✅ PDOK suggest/lookup/reverse (adres én perceel), proxy-whitelist, documenten in vier groepen (lokaal · Wro · beleid · Rijk), structuur uit `/boom`, leden via `ocd-regeltekst`, Juridisch/Begrijpelijk, locatie in de URL | Handmatige toets tegen Regels op de kaart |
| 4 · Onderwerp-chips | ✅ Indeling van het register (`/onderwerpen`) ∩ artikelen op het punt, client-side, zonder OCD-wijziging. Chips per document, filter binnen een document, "niet ingedeeld" zichtbaar | Onderwerpen óver documenten heen, met iconen → fase 6 |
| 5 · Register naar stijl C | ✅ Live (`omgevingsdocumentenregister.nl` commits `a9e452d`, `5baa276`). `stijl.css` canoniek in het register; RoM verhuisd naar `/regels-op-maat/`, subdomein stuurt door (301). Onderweg: CSP blokkeerde inline styles (staafjes en GIO-plaat zonder afmetingen) — opgelost | Vragenbomen-overzicht: status en naam staan omgedraaid (bestond al) |
| 6 · Onderwerpen op deze locatie, met iconen | ✅ Live (register `9b067ad`). Tussenscherm met tegels (alleen onderwerpen die op de locatie voorkomen), 10 bezoekersonderwerpen + 3 kleine, eigen lijniconen (lijndikte 1,25, ontwerp in het canvas "Onderwerp-iconen Regels op maat"), klik = gefilterd resultaat over documenten, weergaven in de URL. Geen OCD-werk | Tussenscherm laadt koud 5–6 s (documentbomen); warm 2–3 s. Progressief tonen kan later |
| 7 · De vraag | ✅ Live (register `cf1c73c`/`5aee432`), **zonder taalmodel**: gebruikersbesluit 2026-09-17 is alleen de gevonden regels tonen. Mechaniek van de AI-modus van de OCD-viewer via `POST /v1/regelteksten-bij-vraag` (SKOS-begrippen → activiteit-join op het punt → tekst-fallback, gewogen score). Vraagveld boven de tegels, feed met begrippen- en regels-stap, chips aan/uit + opnieuw zoeken zonder term, resultaten op relevantie (eerst 10, dan Toon meer), schakelaar Per document, tekst via `/v1/viewer/teksten` | Normvragen ("hoe hoog mag ik bouwen?") geven 0 treffers: SKOS is blind op de norm-as. Embeddings (`/v1/semantisch`) zijn de kandidaat-oplossing en staan nog open |
| 8 · Werkingsgebied bij het artikel | ✅ Live (register `20e9772`), **zonder nieuw OCD-endpoint**: de documentboom draagt per lid het `locatie_id` van de activiteit-locatieaanduiding en de gebiedsaanwijzing, en `/v1/tiles/locaties` draagt datzelfde id. Vullingen zonder contour (een lijn tekent de tegelrand mee), ambtsgebied als waas, één artikel tegelijk, legenda naast de kaart | Geen "zoom naar dit gebied": de tegels kennen de omtrek van het geheel niet. Zou alsnog een geometrie-aanroep vragen |
| 9 · Kenmerken bij een artikel | ✅ Live (register `144d23f`). Geen tabbladen: **beperkingen bewust weggelaten** (gebruikersbesluit 2026-09-17) en toelichting niet gebouwd. Activiteiten met kwalificatie, gebiedsaanwijzingen, normwaarden en het werkingsgebied staan uitklapbaar in het artikel; per norm "geldt op uw locatie" via `/v1/viewer/objecten` | "Type regel" (regel voor iedereen e.d.) levert de boom niet; zou een OCD-wijziging vragen. Toelichting: koppeling artikel ↔ toelichting nog onbewezen |

**Correctie 2026-09-16 (`adb1dbb`):** leden werden via hun wId aan een artikel gekoppeld
(`…__art_x`). wId's zonder dat segment (Amsterdam: `gm0363_<hash>__para_2`) telden daardoor elk
als los artikel zonder onderwerp: 1.182 "artikelen", 22% ingedeeld, waar het 669 en 70% zijn.
De koppeling loopt nu via de documentboom (lid → omhullend Artikel).

**Volgorde vanaf fase 5** is gekozen door de gebruiker op 2026-09-16: eerst het register in
dezelfde stijl, dan de onderwerpen met iconen, dan de vraag, dan het werkingsgebied, dan het
infopaneel.

Getest op Broekhem 33 (Valkenburg), Dam 1 (Amsterdam), Bergstraat 4 (Ede), Grote Markt 1
(Groningen), een kaartklik en 400 px breed. Het Bal (2.441 artikelen op het punt) opent in ~2 s.

**Afwijking van het plan in fase 4:** de categorieën van het register zijn direct als chip
gebruikt, zonder mapping naar een handvol brede thema's. Dat houdt register en RoM
één-op-één gelijk; de prijs is meer chips per document (tot ~12). De mapping naar
bezoekersonderwerpen komt terug in fase 6.

**Bevindingen onderweg**
- `/v1/viewer/regeling/{expr}/boom` levert per lid al de annotaties (activiteiten,
  gebiedsaanwijzingen, normwaarden). Het infopaneel van fase 9 heeft daardoor mogelijk
  **geen nieuw OCD-endpoint** nodig. ⚠️ Te verifiëren of dat voor alle regelingen gevuld is.
- Voorbeschermingsregels kwamen als losse documenten binnen; ze hangen nu onder hun document
  (getest bij Amsterdam, Groningen, Ede, Utrecht, Valkenburg: geen enkele meer los). Artikelen
  daarvan die niet in de `/boom` van het voorbereidingsbesluit terugkomen, staan onder "Overig".
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

### Fase 5 — Het register naar stijl C · middel

**Wat je ziet:** omgevingsdocumentenregister.nl en Regels op maat zijn herkenbaar één familie.
Het krantachtige verdwijnt uit het register: geen Newsreader-koppen, geen papierkorrel, geen
dikke inktlijnen. De interface wordt sans-serif op een koelgrijze grond; documenttitels en
leestekst staan op witte bladen in Source Serif 4. In het menu staat "Regels op maat · prototype".

**Aanpak: eerst de tokens, dan per scherm.**

1. **Tokens omleggen, in één stap voor de hele site.** Het register laadt `stijl.css` en zijn
   eigen rollen worden aliassen: `--paper` → `--grond`, `--ink` → `--inkt`, `--rule` → `--lijn`,
   `--accent`/`--link` → `--acc`, en de statuskleuren worden gelijkgetrokken. `h1–h3` gaan van
   serif naar sans; de serif blijft alleen voor documenttitels en `.leestekst`. Papierkorrel en
   2px-lijnen gaan eruit. Na deze stap is elk scherm al grotendeels stijl C, zonder dat er een
   regel JavaScript verandert.
2. **Per scherm afmaken**, meest bezochte schermen eerst:

   | Scherm | Route | Wat verandert |
   |---|---|---|
   | Zoeken | `/`, `/zoeken` | Facetten als rail links, treffers als bladen met serif-titel, lensoordelen als badges rechts (zoals in het ontwerp) |
   | Documentdetail | `/document/…` | Boom als interface-rail, leestekst op een blad in serif, GIO-paneel als paneel met schaduw |
   | Bronhouders | `/bronhouders`, `/bronhouders/{code}` | Tabellen en kpi-tegels in interface-stijl, cijfers in mono |
   | Landelijk beeld | `/landelijk-beeld` | Idem; staafjes in het accent |
   | Vragenbomen | `/vragenbomen/…` | Stappen als bladen; dragende artikelen in serif |
   | Over | `/over-het-register` | Lopende tekst op een blad |

3. **Kop en voet** gelijk aan RoM: merkteken als blad, navigatie rechts. De themaknop blijft (het
   register heeft `data-theme` al; `stijl.css` ondersteunt het).
4. **Menu-item** "Regels op maat · prototype" → `https://rom.omgevingsdocumentenregister.nl`.

**Werkwijze:** een push naar `main` van het register gaat direct live. Daarom op een branch
`stijl-c`. Het Pages-project bouwt previews voor alle branches, dus elk scherm is eerst op de
preview-URL te bekijken (licht, donker, 1440 en 400 px breed) voordat het naar `main` gaat.
Hoog bij elke CSS- of JS-wijziging de `?v=`-token op.

**Klaar als:** alle routes in stijl C staan, in licht en donker, zonder horizontaal scrollen op
400 px, en het menu-item werkt.

### Fase 6 — Onderwerpen op deze locatie, met iconen · middel

**Wat je ziet** (mockups scherm-03, -04 en -11): na het kiezen van een locatie verschijnt eerst
een tussenscherm **"Waar bent u naar op zoek?"** met het vraagveld (fase 7) en daaronder een
raster **"Onderwerpen op deze locatie"**. Per onderwerp staan er een icoon, een naam en het
aantal regels dat hier geldt. Klik je een onderwerp aan, dan zie je de regels over dat onderwerp
**over alle documenten heen**, en staat het onderwerp als zoekvraag in de balk bovenin. Je kunt
altijd terug naar het tussenscherm; het huidige overzicht met alle documenten blijft bereikbaar.

- **Bezoekersonderwerpen.** De 21 categorieën van het register zijn te fijn en te vakmatig voor
  een tegelraster ("procedures", "infrastructuur"). Er komt een vaste mapping van categorie (en
  waar nodig subcategorie) naar een handvol onderwerpen in de taal van de bezoeker, vastgelegd in
  `public/thema.js`. De mockup noemt *Wonen & verbouwen, Bedrijfsmatige activiteiten, Natuur,
  Openbare ruimte, Geluid en hinder*; de definitieve lijst is een besluit (open besluit 4). Het
  register blijft de bron: de mapping groepeert alleen, ze deelt niet opnieuw in.
- **Iconen.** Een eigen set in inline SVG, lijngetekend op een 20px-raster, passend bij stijl C.
  De DSO-iconen nemen we niet over. Eén icoon per bezoekersonderwerp, plus één voor "niet
  ingedeeld". Dezelfde iconen komen terug in de chips op de documentkaarten.
- **Tellen over documenten heen.** Nu worden alleen de lokale Ow-documenten vooraf geanalyseerd.
  Voor het raster moeten alle lokale documenten klaar zijn voordat de tellingen kloppen.
  Landelijke regels (het Bal: 2.441 artikelen op het punt) tellen **apart** of pas op verzoek,
  anders duurt het tussenscherm te lang. Wro-plannen zijn niet ingedeeld en tellen niet mee;
  dat staat er ook bij.
- **Resultaat per onderwerp:** dezelfde documentkaarten, maar voorgefilterd, en alleen documenten
  met minstens één artikel in het onderwerp. De URL krijgt `&onderwerp=…`, zodat het resultaat
  deelbaar is.
- **OCD-werk:** geen. Blijkt het tellen bij grote omgevingsplannen te traag, dan later één
  endpoint dat per punt de telling per categorie teruggeeft.

**Klaar als:** bij Broekhem 33, Dam 1 en Grote Markt 1 het raster binnen ~3 s staat, de aantallen
kloppen met de chips op de documentkaarten, en een klik een gefilterd resultaat over meerdere
documenten geeft.

### Fase 7 — De vraag · groot (uitgevoerd zonder stap 2)

**Wat je ziet:** in het tussenscherm typ je "mag ik een aanbouw bouwen?". Het resultaat heet
**"Gevonden voor uw vraag"**: alleen de documenten en artikelen die erover gaan, de meest
relevante bovenaan, met de vraag bewerkbaar in de balk bovenin.

- **Stap 1, zonder AI (eerst bouwen):** de vraag wordt herkend als activiteit en/of onderwerp.
  "Aanbouw" → bouwactiviteit, via de SKOS-activiteit-as (gecureerde trefwoorden zoals dakkapel
  en betegelen). Kandidaat is `GET /v1/regels?x&y&keywords` (FTS plus trefwoorden, staat al in
  OCD). ⚠️ Te verifiëren welk endpoint de SKOS-trefwoorden het best ontsluit en of het per
  artikel-wid teruggeeft; zo nodig komt er één klein OCD-endpoint bij.
- **Stap 2, met embeddings:** `POST /v1/semantisch`, beperkt tot de locatie. Dat helpt bij
  normvragen ("hoe hoog mag…"), waar SKOS niets vindt. Voorwaarde: de embedding-service op
  Railway draait en gebruikt hetzelfde model als de index, anders gaat de kwaliteit ongemerkt
  achteruit. ⚠️ Eerst verifiëren; zonder werkende service blijft het bij stap 1.
- **Een klik op een onderwerp (fase 6) is een vraag zonder tekst:** hetzelfde resultaatscherm,
  één codepad.
- **Geen gegenereerd antwoord.** RoM toont regels en geeft geen oordeel, en zegt dat ook in de
  interface.
- URL: `&vraag=…`.

**Klaar als:** een vooraf opgeschreven set van ~15 vragen op 3 locaties de juiste artikelen in de
top 5 heeft. Gemeten, niet op gevoel.

### Fase 8 — Werkingsgebied bij het artikel · middel, OCD-endpoint

**Wat je ziet:** open je een artikel, dan licht op de kaart het gebied op waar het geldt
(mockup scherm-05/-06: het gele vlak).

- **Uitgevoerd zonder nieuw endpoint** (2026-09-17). Gemeten: `/v1/viewer/geometrie` gaf 4,55 MB
  voor tien locaties van de Limburgse verordening (één gebied 1,9 MB), terwijl één vectortegel
  rond Broekhem 33 3,7 kB is met 49 gebieden en een uur gecachet wordt. De koppeling
  artikel → gebied bleek al te bestaan: de boom draagt per lid het `locatie_id`, de tegel draagt
  hetzelfde id. Het idee van een endpoint dat `build_geo.py` live maakt is daarmee vervallen.
- Provinciebrede gebieden die het hele beeld vullen tonen we als rand, niet als vlak (die regel
  staat al in `build_geo.py`).
- Artikelen zonder eigen gebied (zoals in Valkenburg): "geldt in het hele regelingsgebied".
  Geen leeg gebied tonen.
- De proxy-whitelist krijgt precies dit endpoint erbij.

**Klaar als:** bij Broekhem 33 de Omgevingsverordening en de Waterschapsverordening gebieden
laten oplichten, en het omgevingsplan dat eerlijk niet doet.

### Fase 9 — Het infopaneel · middel

**Wat je ziet** (mockups scherm-08 t/m -10 en -12): de ⓘ bij een artikel opent een paneel tussen
de lijst en de kaart, met drie tabbladen.

- **Kenmerken:** type regel, activiteit, "dit artikel geldt in" (met een schakelaar naar de
  kaart, uit fase 8), gebiedsaanwijzingen zoals functie (met schakelaar) en omgevingsnormen met
  de waarde **op de gekozen locatie** ("maximum bouwhoogte: 180 m"). Bron: de annotaties per lid
  in `/boom`, dus mogelijk geen nieuw endpoint (⚠️ dekking verifiëren); de normwaarden op het
  punt komen uit `/v1/viewer/objecten?x&y`. Is het leeg, dan staat er "niet geannoteerd in dit
  plan".
- **Beperkingen:** `/v1/leefomgeving/readout?x&y` (externe veiligheid, geluid) met een schakelaar
  per laag, plus een sectie **"Mogelijke beperkingen"** onder de regels in de lijst. Duidelijk
  vermelden dat de bron RIVM/PDOK is en geen DSO-regel.
- **Toelichting:** de artikelsgewijze toelichting. Daar is nog geen endpoint voor, en ⚠️ te
  verifiëren is hoe betrouwbaar de koppeling tussen artikel en toelichting in de data is. Zonder
  betrouwbare koppeling blijft dit tabblad weg.

## Open besluiten

Besloten op 2026-09-16: subdomein `rom.omgevingsdocumentenregister.nl`; thema-as A (de indeling
van het register); volgorde van fase 5 t/m 9; bezoekersonderwerpen en iconen (2026-09-17: water gesplitst, geur bij geluid, energie bij bedrijven, lijndikte het dunst); voorbeschermingsregels tonen **bij het
omgevingsplan of de omgevingsverordening waar ze bij horen**, als "Aanvullende regels", zoals het
DSO dat doet (gebouwd: `koppelAanvullend` in `public/app.js`). Bij kaal documenttype
"Voorbeschermingsregels" beslissen titel en bestuurslaag; ⚠️ een provinciaal voorbereidingsbesluit
kan ook een omgevingsplan aanvullen, daarom staat de vaststeller erbij.

1. **Waar staat `stijl.css` canoniek?** (fase 5) Advies: in het **register**, want dat is de
   koepel. RoM houdt een kopie met de kopregel "canoniek in omgevingsdocumentenregister.nl",
   net als bij `ocd-regeltekst.js`. Niet cross-origin laden: dat koppelt de caches en de CSP
   van twee sites.
2. **Geolocatie toestaan** ("mijn locatie")? Nu staat `geolocation=()` in beide sites.
3. **Toelichting** (fase 9): alleen bouwen als de koppeling betrouwbaar blijkt.

## Bekende valkuilen

- **Een hol plan is geen bug.** Nul annotaties in een bruidsschat-plan is de werkelijkheid.
  Verdenk eerst de eigen query voordat je een gat publiceert.
- **Wro-plannen** komen uit een ander pad (`bron_type=wro`), met bestemmingen in plaats van artikelen.
- **Cache op het custom domein**: `.js` en `.css` krijgen alsnog 4 uur. Hoog altijd de `?v=` op.
- **Lokale OCD-DB** kan bij zware builds 500's geven op de viewer-endpoints (cache). Test tegen productie.
- **Ontwerp-png's** in `ontwerp/png/` zijn gerenderd zonder webfonts (fallback-serif). De echte
  letters staan in het canvas en in `build.mjs`.
