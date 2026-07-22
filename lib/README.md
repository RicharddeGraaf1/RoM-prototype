# ocd-regeltekst

Gedeelde, framework-agnostische weergave van **STOP-XML regeltekst → gestructureerde HTML**.
Eén bron van waarheid voor alle OCD-afnemers (OCDviewer, instructieregels.nl,
omgevingsbot.nl, RoM-prototype), zodat de artikelweergave niet in elke frontend
opnieuw wordt uitgevonden.

De parser is 1-op-1 geport uit OCDviewer's `stop-xml-parser.ts` (het kroonjuweel);
alleen de types zijn eruit. Framework-vrij: enige runtime-afhankelijkheid is
`DOMParser` (in elke browser aanwezig; in Node te polyfillen met `linkedom`).

## Gebruik — gewoon script-tag (werkt óók via file://)

```html
<script src="ocd-regeltekst.js"></script>
<ocd-regeltekst id="rt"></ocd-regeltekst>
<script>
  const el = document.getElementById('rt');
  el.tekst = rauweStopXml;        // property (niet als attribuut — te groot)
  el.begrijpelijk = "…";          // optioneel; ontgrendelt de begrijpelijk-modus
  el.weergave = "juridisch";      // of "begrijpelijk"; ook als attribuut weergave="…"
  el.namen = [];                  // optioneel: object-namen voor term-detectie
  el.addEventListener('intref-klik', e => navigeer(e.detail.eid));
  el.addEventListener('term-klik',   e => toonBegrip(e.detail.naam));
</script>
```

**Klassiek script, geen module** — dus `<script src>` werkt gewoon, óók bij
dubbelklikken (`file://`). Geen server, geen build, geen API. Open `demo.html`
door te dubbelklikken voor een werkend voorbeeld met CALS-tabel, lijst en toggle.

## Wat het rendert

| STOP-element | HTML |
|---|---|
| `<Al>` | `<p class="ocd-al">` |
| `<Lijst><Li><LiNummer>` | `<ul class="ocd-lijst">` met marker-span |
| `<Begrippenlijst><Begrip>` | `<dl class="ocd-begrippen">` |
| CALS `<table><tgroup><thead/tbody><row><entry>` | `<table class="ocd-tabel">` |
| `<IntRef>` / `<IntIoRef>` | `<a class="ocd-intref" data-eid>` → event `intref-klik` |
| term (uit `namen`) | `<span class="ocd-term" data-naam>` → event `term-klik` |
| `<NieuweTekst>` / `<VerwijderdeTekst>` (renvooi) | `<ins>` / `<del>` |

Bij parse-fouten of platte tekst: veilige fallback naar één alinea. Nooit
`innerHTML` van brondata — alles via `createElement`/`textContent`.

## API (los te gebruiken zonder het element)

```js
// Na het laden staat de API op window.ocdRegeltekst:
const { parseTekst, renderTekst, renderBlocks } = window.ocdRegeltekst;
const blocks = parseTekst(xml, namen);      // → typed Block[]
const frag   = renderTekst(xml, { emit });  // → DocumentFragment
```

In Node/build-time (geen DOM) crasht het laden niet; het custom element wordt
alleen gedefinieerd als `HTMLElement` bestaat, en de parser draait met een
`DOMParser`-polyfill (bv. `linkedom`).

## Adoptie-status

| Afnemer | Status |
|---|---|
| **RoM-prototype** | ✅ eerste consument — `build_data.py` emit `tekst_xml`; leden renderen via `<ocd-regeltekst>` met de Juridisch/Begrijpelijk-toggle |
| instructieregels.nl | ⬜ vervangt de lokale mini-`stopNaarHtml` |
| omgevingsbot.nl | ⬜ bron-panel |
| OCDviewer (donor) | ⬜ importeert de parser uit dit pakket (pariteit-test), houdt z'n rijke Angular-render |

## Herkomst / onderhoud

- Parser-bron: `OCDviewer/.../document-leestekst/stop-xml-parser.ts`. Bij een
  wijziging dáár: hier meenemen (of andersom — doel is uiteindelijk één bron).
- Analyse & plan: `OmgevingswetKnowledgeBase/vault_v1/analysis/Generiek leesmodel en STOP-weergavecomponent.md`.
