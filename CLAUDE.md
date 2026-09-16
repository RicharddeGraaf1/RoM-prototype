# RoM-prototype — projectconventies

> **De live code woont sinds 2026-09-16 in `omgevingsdocumentenregister.nl/public/regels-op-maat/`.**
> Wijzigingen aan Regels op maat gaan dáár, met de conventies van het register. Deze repo
> houdt het realisatieplan, de ontwerpbestanden, `tools/` en de statische demo; `public/`
> is alleen nog een 301 naar het register. Onderstaande tekst beschrijft de losse site zoals
> die tot commit `64b0e27` bestond.

Regels op maat: welke regels gelden op een locatie. De live site staat in `public/`,
de proxy naar OCD in `functions/api`. Plan en fasen: [docs/REALISATIEPLAN.md](docs/REALISATIEPLAN.md).

**Dit is geen overheidsvoorziening.** Geen DSO-groen, geen loket-logo, geen
"Concept"-banner die suggereert dat het het Omgevingsloket wordt. Kop en voet
dragen "onafhankelijk · geen officiële overheidsbron".

## Mappen — wat publiceert en wat niet

```
public/     ← DE PUBLISH-DIRECTORY. Alles hierin staat publiek.
functions/  ← Pages Functions (/api-proxy). Draait server-side.
docs/, tools/, data/, lib/, PNG/, img/, index*.html in de root
            ← werkdocumenten + de statische demo. Publiceren NOOIT.
```

## Deploy

**Git-gekoppeld Cloudflare Pages-project, `wrangler.toml` bepaalt de build**
(`pages_build_output_dir = "public"`). `OCD_API_KEY_PUBLIC` staat als geheim in het
Pages-project. Nooit `wrangler pages deploy .` vanuit de repo-root: dat patroon zette op
ponsenkaart.nl een `CLOUDFLARE_API_TOKEN` publiek, en `functions/` valt dan stil weg.

**Bump de `?v=` in `public/index.html` bij elke wijziging in een .js of .css** — op een
custom domein herschrijft de zone-TTL de `_headers` naar 4 uur.

## Stijl

`public/stijl.css` is stijl C en bedoeld om ook door het register geladen te worden.
Tokens en bouwstenen daar; RoM-specifieke layout in `public/rom.css`. Serif alleen voor
brontekst (documenttitels, artikelen, leden) — de interface is sans-serif.

## Gedeelde regeltekst-component

`public/vendor/ocd-regeltekst.js` is een kopie van `lib/ocd-regeltekst.js` (canoniek in OCD).
Sync ze samen. De component zet CSS als `<style>` in zijn shadow root; daarom heeft de CSP
`style-src 'unsafe-inline'`. `script-src` blijft strikt `'self'`.

## Proxy-whitelist

`functions/api/[[catchall]].js` laat alleen door wat RoM gebruikt: `regelmix`,
`regelmix/document`, `teksten` (POST), en onder `/v1/viewer/regeling/` alleen de staarten
`/onderwerpen` en `/boom`. Een nieuw endpoint = bewust toevoegen, niet de prefix openzetten.
Nooit `/v1/adres` zonder `alleen_locatie=true` (antwoorden tot ~19 MB).
