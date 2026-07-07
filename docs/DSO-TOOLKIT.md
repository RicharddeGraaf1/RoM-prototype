# DSO-toolkit-variant (`index-dso.html`)

Gebruikt de officiële [DSO-toolkit](https://www.dso-toolkit.nl/98.0.0/intro) **98.0.0**
voor de echte DSO look-and-feel. Vereist **internet** (laadt van de CDN).

## CDN-includes (versie 98.0.0)
Basis-URL-patroon: `https://cdn.dso-toolkit.nl/<package>/<versie>/<pad>`

```html
<!-- stijlen (Asap-font, DSO-huisstijl, kleuren) -->
<link rel="stylesheet"
      href="https://cdn.dso-toolkit.nl/dso-toolkit/98.0.0/dist/dso.css">

<!-- web-componenten (Stencil ESM-loader; registreert alle <dso-*>-elementen) -->
<script type="module"
        src="https://cdn.dso-toolkit.nl/@dso-toolkit/core/98.0.0/dist/dso-toolkit/dso-toolkit.esm.js"></script>
```
Design-tokens: font = **Asap**, merkgroen = **#39870c**.

## Welke componenten gebruikt (en werken)
Empirisch getest (render-probe); deze werken met attributen/slots, dus bruikbaar in
platte HTML:

| Component | Gebruik in de pagina |
|---|---|
| `dso-label` | thema-chips én de gebiedsaanwijzing-tags in het ⓘ-paneel |
| `dso-alert` | de eerlijke "geen normen/aanwijzingen geannoteerd"-melding |
| `dso-info-button` | de groene ⓘ per artikel |
| `dso-icon` | document- en chevron-iconen (`icon="document"`, `icon="chevron-down"`) |
| `.dso-highlight-box` | uitgelichte blokken (CSS-klasse) |

## Wat NIET zomaar werkte
- **`dso-header`** rendert leeg met alleen een attribuut — wil complexe object-props
  (Stencil-properties via JS zetten). Daarom is de header in beide varianten eigen markup
  in DSO-stijl.
- **`dso-document-component` / `dso-ozon-content` / `dso-annotation-*`** bestaan (zie het
  Stencil collection-manifest) en zijn feitelijk de "echte" DSO-viewer-componenten, maar
  verwachten specifieke datastructuren als properties. Voor deze PoC bewust vermeden;
  een volwaardige integratie hiermee is een grotere stap (zie ROADMAP).

## Componenten ontdekken
- Alle tags: `https://cdn.dso-toolkit.nl/@dso-toolkit/core/98.0.0/dist/collection/collection-manifest.json`
  (`entries`-lijst → `components/<naam>/…`).
- Storybook: `https://storybook.dso-toolkit.nl/98.0.0` — daar staan de props/usage per component.

## Offline maken (optioneel)
Nu hangt `index-dso.html` aan de CDN. Voor volledig offline gebruik: download `dso.css`,
de esm-loader **plus alle chunk-bestanden** onder `dist/dso-toolkit/`, en het Asap-font,
naar een lokale map en verwijs relatief. De eigen variant (`index.html`) heeft dit niet
nodig en werkt al offline.
