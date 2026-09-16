// Bouwt de zes artboards voor de stijlrichtingen (register + RoM) uit gedeelde stukken.
import { writeFileSync } from 'node:fs';

const OUT = new URL('.', import.meta.url);
const w = (name, html) => writeFileSync(new URL(name, OUT), html);

// ── iconen (stroke, 20px-grid) ─────────────────────────────
const ic = (d, s = 18, sw = 1.8) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  zoek: (s) => ic('<circle cx="8.5" cy="8.5" r="5.5"></circle><path d="M13 13l4.5 4.5"></path>', s),
  pen: (s) => ic('<path d="M3.5 16.5l1-4 8.5-8.5 3 3-8.5 8.5z"></path><path d="M11.5 5.5l3 3"></path>', s),
  lagen: (s) => ic('<path d="M10 3l7 4-7 4-7-4z"></path><path d="M3 11l7 4 7-4"></path>', s),
  plus: (s) => ic('<path d="M10 4v12M4 10h12"></path>', s),
  min: (s) => ic('<path d="M4 10h12"></path>', s),
  locatie: (s) => ic('<circle cx="10" cy="10" r="3"></circle><path d="M10 2v3M10 15v3M2 10h3M15 10h3"></path>', s),
  neer: (s) => ic('<path d="M5 8l5 5 5-5"></path>', s),
  rechts: (s) => ic('<path d="M8 5l5 5-5 5"></path>', s),
  sluit: (s) => ic('<path d="M5 5l10 10M15 5L5 15"></path>', s),
  uit: (s) => ic('<path d="M11 3h6v6"></path><path d="M17 3l-8 8"></path><path d="M15 12v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4"></path>', s),
  doc: (s) => ic('<path d="M5 2.5h7l3.5 3.5v11.5H5z"></path><path d="M12 2.5V6h3.5"></path><path d="M7.5 10h5M7.5 13h5"></path>', s),
  info: (s) => ic('<circle cx="10" cy="10" r="7.5"></circle><path d="M10 9v5"></path><path d="M10 6.2v.1"></path>', s),
  schild: (s) => ic('<path d="M10 2.5l6 2.5v4.5c0 4-2.7 6.8-6 8-3.3-1.2-6-4-6-8V5z"></path>', s),
};

// ── thema's (gedeeld palet; los van de statuskleuren) ───────
const T = {
  wonen: ['Wonen', 'oklch(80% 0.14 92)'],
  groen: ['Groen', 'oklch(64% 0.14 145)'],
  bouwen: ['Bouwen', 'oklch(60% 0.12 52)'],
  energie: ['Energie', 'oklch(58% 0.16 350)'],
  water: ['Water', 'oklch(60% 0.12 235)'],
  bbl: ['Algemene bouwregels', 'oklch(62% 0.03 262)'],
};

// ── kaart: gestileerde omgeving Broekhem 33 ──────────────────
function kaart(k) {
  let blokken = '';
  const band = (y0, diepte, x0, x1, seed, skip = []) => {
    let x = x0, i = 0;
    while (x < x1) {
      const bw = 30 + ((i * 37 + seed) % 22);
      const bd = diepte - ((i * 13 + seed) % 26);
      if (!skip.some(([a, b]) => x + bw > a && x < b)) {
        blokken += `<rect x="${x}" y="${y0}" width="${bw}" height="${bd}" fill="${k.blok}" stroke="${k.blokRand}" stroke-width="1"></rect>`;
      }
      x += bw + 4 + ((i * 7 + seed) % 5);
      i++;
    }
  };
  band(30, 96, -1000, 1500, 3);
  band(176, 110, -1000, 1500, 11);
  band(360, 100, -1000, 1500, 5);
  band(504, 118, -1000, 1500, 17, [[405, 540], [620, 662]]);
  band(700, 110, -1000, 1500, 23, [[620, 662]]);
  band(860, 120, -1000, 1500, 29, [[620, 662]]);
  return `<svg viewBox="${k.viewBox || "0 0 900 900"}" preserveAspectRatio="xMidYMid slice" style="position:absolute; inset:0; width:100%; height:100%; display:block;" aria-hidden="true">
  <rect x="-2000" y="-2000" width="5000" height="5000" fill="${k.grond}"></rect>
  <g transform="rotate(28 450 450)">
    ${blokken}
    <rect x="-500" y="140" width="1900" height="22" fill="${k.straat}"></rect>
    <rect x="-500" y="468" width="1900" height="26" fill="${k.straat}"></rect>
    <rect x="628" y="494" width="24" height="800" fill="${k.straat}"></rect>
    <polygon points="415,506 530,506 538,640 420,648" fill="${k.perceelVlak}" stroke="${k.perceel}" stroke-width="3"></polygon>
    <polygon points="250,500 700,500 700,780 250,780" fill="none" stroke="${T.wonen[1]}" stroke-width="2.5" stroke-dasharray="9 6"></polygon>
    <text x="80" y="486" font-family="${k.kaartFont}" font-size="15" fill="${k.straatTekst}" letter-spacing="1">Broekhem</text>
    <text x="820" y="486" font-family="${k.kaartFont}" font-size="15" fill="${k.straatTekst}" letter-spacing="1">Broekhem</text>
    <text x="120" y="156" font-family="${k.kaartFont}" font-size="14" fill="${k.straatTekst}" letter-spacing="1">Cremerstraat</text>
    <text x="0" y="0" transform="translate(645 600) rotate(90)" font-family="${k.kaartFont}" font-size="14" fill="${k.straatTekst}" letter-spacing="1">Oranje Nassaustraat</text>
  </g>
  <path d="M 150 520 L 330 600 L 360 900" fill="none" stroke="${T.water[1]}" stroke-width="2.5"></path>
  <path d="M -1000 707 L 910 520" fill="none" stroke="${T.energie[1]}" stroke-width="2"></path>
  <path d="M -1000 747 L 910 560" fill="none" stroke="${T.energie[1]}" stroke-width="2"></path>
  <circle cx="560" cy="880" r="170" fill="oklch(62% 0.17 28 / 0.08)" stroke="oklch(58% 0.17 28)" stroke-width="2"></circle>
  <circle cx="411" cy="565" r="9" fill="${k.perceel}" stroke="${k.grond}" stroke-width="3"></circle>
  <g transform="translate(411 522)">
    <rect x="-86" y="-22" width="172" height="30" rx="${k.labelRadius}" fill="${k.labelVlak}" stroke="${k.labelRand}"></rect>
    <text x="0" y="-2" text-anchor="middle" font-family="${k.labelFont}" font-size="14" font-weight="700" fill="${k.labelInkt}">Broekhem 33</text>
  </g>
</svg>`;
}

const kaartKnoppen = (cls) => `<div class="${cls}">
  <button class="kk" title="Lagen">${I.lagen(18)}</button>
  <div class="kk-groep"><button class="kk" title="Inzoomen">${I.plus(18)}</button><button class="kk" title="Uitzoomen">${I.min(18)}</button></div>
  <button class="kk" title="Mijn locatie">${I.locatie(18)}</button>
</div>`;

const chips = (lijst, cls = 'chip') =>
  `<div class="chips">${lijst.map(([t, n]) => `<span class="${cls}"><i style="background:${T[t][1]}"></i>${T[t][0]} <b>${n}</b></span>`).join('')}</div>`;

// ── gedeelde inhoud ──────────────────────────────────────────
const DOCS = [
  { titel: 'Omgevingsplan gemeente Valkenburg aan de Geul', soort: 'Omgevingsplan', gezag: 'Gemeente Valkenburg aan de Geul', stelsel: 'Ow', themas: [['wonen', 3], ['groen', 5], ['bouwen', 7]] },
  { titel: 'Bestemmingsplan Kern Valkenburg', soort: 'Bestemmingsplan', gezag: 'Gemeente Valkenburg aan de Geul', stelsel: 'Wro', themas: [['wonen', 6], ['groen', 3]] },
  { titel: 'Omgevingsverordening Limburg', soort: 'Omgevingsverordening', gezag: 'Provincie Limburg', stelsel: 'Ow', themas: [['energie', 2], ['water', 2]] },
  { titel: 'Besluit bouwwerken leefomgeving', soort: 'AMvB', gezag: 'Rijk', stelsel: 'Ow', themas: [['bbl', 12]] },
];
const HITS = [
  { titel: 'Omgevingsplan gemeente Valkenburg aan de Geul', meta: 'Gemeente Valkenburg aan de Geul · omgevingsplan', id: '/akn/nl/act/gm0994/…', stelsel: 'Ow', oordeel: ['Annotaties', 'matig'] },
  { titel: 'Omgevingsverordening Limburg', meta: 'Provincie Limburg · omgevingsverordening', id: '/akn/nl/act/pv31/…', stelsel: 'Ow', oordeel: ['Annotaties', 'goed'] },
  { titel: 'Bestemmingsplan Kern Valkenburg', meta: 'Gemeente Valkenburg aan de Geul · bestemmingsplan', id: 'NL.IMRO.0994.…', stelsel: 'Wro', oordeel: ['Ponsstatus', 'niet gepons'] },
  { titel: 'Omgevingsvisie Valkenburg aan de Geul', meta: 'Gemeente Valkenburg aan de Geul · omgevingsvisie', id: '/akn/nl/act/gm0994/…', stelsel: 'Ow', oordeel: null },
  { titel: 'Waterschapsverordening Waterschap Limburg', meta: 'Waterschap Limburg · waterschapsverordening', id: '/akn/nl/act/ws…/…', stelsel: 'Ow', oordeel: ['Annotaties', 'goed'] },
];
const FACETTEN = [
  ['Stelsel', [['Omgevingswet', 9, true], ['Wro (overgangsrecht)', 3, true]]],
  ['Bestuurslaag', [['Gemeente', 7, false], ['Provincie', 2, false], ['Waterschap', 2, false], ['Rijk', 1, false]]],
  ['Documenttype', [['Omgevingsplan', 1, false], ['Omgevingsverordening', 1, false], ['Omgevingsvisie', 2, false], ['Bestemmingsplan', 3, false]]],
];
const NAV = ['Zoeken', 'Bronhouders', 'Vragenbomen', 'Landelijk beeld', 'Over'];
const ART_TITEL = 'Artikel 6.9 Bouwproces — uitzetten rooilijnen, bebouwingsgrenzen en bouwwerkpeil';
const LEDEN = [
  'Het is verboden een bouwactiviteit te verrichten voordat door of namens het bevoegd gezag de rooilijnen, bebouwingsgrenzen en het bouwwerkpeil zijn uitgezet.',
  'Het eerste lid is niet van toepassing als het bevoegd gezag heeft laten weten dat uitzetten niet nodig is.',
];
const TOELICHTING = 'In door het bevoegd gezag te bepalen situaties kan het nodig zijn dat, voorafgaand aan het bouwen, rooilijnen, bebouwingsgrenzen of het meetniveau van het bouwwerk worden vastgesteld en gemarkeerd. Vergunningplichtige bouwwerkzaamheden mogen pas beginnen als die zijn uitgezet.';

const doc = (helmet, body) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
${helmet}
</helmet>
${body}
</x-dc>
</body>
</html>
`;

const oordeelCls = (o) => (o === 'goed' ? 'ok' : o === 'matig' ? 'at' : 'nv');
const brand = (sub = true) => `<a class="brand" href="#"><span class="mark"><i></i><i></i><i></i></span><span class="brand-t"><strong>Omgevingsdocumentenregister</strong>${sub ? '<span class="sub">Onafhankelijk register · geen officiële overheidsbron</span>' : ''}</span></a>`;
const nav = (actief) => `<nav class="nav">${NAV.map((n) => `<a href="#"${n === actief ? ' class="actief"' : ''}>${n}</a>`).join('')}<a href="#"${actief === 'RoM' ? ' class="actief"' : ''}>Regels op maat <span class="proto">prototype</span></a></nav>`;

// ═════════════════════════════════════════════════════════════
// A · RUSTIG REGISTER
// ═════════════════════════════════════════════════════════════
const A_CSS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&amp;family=IBM+Plex+Mono:wght@400;500&amp;display=swap">
<style>
  :root { --bg: oklch(98.4% 0.005 262); --vlak: oklch(100% 0.002 262); --vlak2: oklch(96.4% 0.010 262); --lijn: oklch(90.5% 0.012 262); --lijn2: oklch(94% 0.010 262);
    --inkt: oklch(20% 0.010 262); --inkt2: oklch(38% 0.012 262); --inkt3: oklch(53% 0.020 262); --acc: oklch(52% 0.17 262); --acc-zacht: oklch(95% 0.03 262);
    --ok-bg: oklch(94% 0.045 150); --ok: oklch(38% 0.11 150); --at-bg: oklch(95% 0.05 80); --at: oklch(42% 0.11 80); --nv-bg: oklch(94% 0.012 262); --nv: oklch(48% 0.018 262); }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--inkt); font: 400 15px/1.55 "Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif; }
  a { color: var(--acc); } a:hover { color: oklch(34% 0.12 262); }
  button { font: inherit; color: inherit; }
  .scherm { width: 1440px; height: 900px; overflow: hidden; display: flex; flex-direction: column; background: var(--bg); }
  .kop { height: 68px; flex: none; display: flex; align-items: center; gap: 32px; padding: 0 32px; background: var(--vlak); border-bottom: 1px solid var(--lijn); }
  .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; color: var(--inkt); }
  .mark { display: grid; gap: 3px; width: 24px; } .mark i { display: block; height: 3px; background: var(--inkt); border-radius: 2px; }
  .mark i:nth-child(2) { width: 80%; } .mark i:nth-child(3) { width: 55%; background: var(--acc); }
  .brand-t { display: flex; flex-direction: column; } .brand-t strong { font-size: 17px; line-height: 1.15; }
  .sub { font-size: 11px; color: var(--inkt3); letter-spacing: .03em; }
  .nav { margin-left: auto; display: flex; gap: 4px; align-items: center; }
  .nav a { text-decoration: none; color: var(--inkt2); font-size: 14.5px; padding: 7px 12px; border-radius: 6px; display: flex; gap: 8px; align-items: center; }
  .nav a.actief { background: var(--acc-zacht); color: var(--acc); font-weight: 700; }
  .proto { font: 500 10.5px/1 "IBM Plex Mono", monospace; text-transform: uppercase; letter-spacing: .04em; padding: 3px 5px; border-radius: 4px; background: var(--vlak2); color: var(--inkt3); border: 1px solid var(--lijn); }
  .mono { font-family: "IBM Plex Mono", ui-monospace, monospace; }
  .tag { font: 700 11px/1 "Atkinson Hyperlegible", sans-serif; letter-spacing: .04em; padding: 4px 7px; border-radius: 4px; border: 1px solid var(--lijn); color: var(--inkt2); background: var(--vlak2); }
  .tag.ow { color: var(--acc); border-color: oklch(80% 0.07 262); background: var(--acc-zacht); }
  .badge { font-size: 12.5px; font-weight: 700; padding: 3px 8px; border-radius: 4px; display: inline-flex; gap: 6px; }
  .badge span { font-weight: 400; opacity: .8; }
  .badge.ok { background: var(--ok-bg); color: var(--ok); } .badge.at { background: var(--at-bg); color: var(--at); } .badge.nv { background: var(--nv-bg); color: var(--nv); }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; padding: 3px 9px 3px 7px; border-radius: 99px; background: var(--vlak); border: 1px solid var(--lijn); color: var(--inkt2); }
  .chip i { width: 9px; height: 9px; border-radius: 50%; display: block; } .chip b { color: var(--inkt); }
  .kaart { position: relative; overflow: hidden; }
  .kknoppen { position: absolute; right: 16px; top: 16px; display: flex; flex-direction: column; gap: 8px; }
  .kk { width: 38px; height: 38px; display: grid; place-items: center; background: var(--vlak); border: 1px solid var(--lijn); border-radius: 6px; color: var(--inkt2); }
  .kk-groep { display: flex; flex-direction: column; } .kk-groep .kk:first-child { border-radius: 6px 6px 0 0; border-bottom: 0; } .kk-groep .kk:last-child { border-radius: 0 0 6px 6px; }
</style>`;

const A_REG = doc(A_CSS, `<div class="scherm">
  <header class="kop">${brand()}${nav('Zoeken')}</header>
  <main style="flex: 1; padding: 34px 32px 0; display: flex; flex-direction: column; gap: 24px; overflow: hidden;">
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <h1 style="margin: 0; font-size: 32px; line-height: 1.15; font-weight: 700; letter-spacing: -.01em;">Zoeken in omgevingsdocumenten</h1>
      <p style="margin: 0; color: var(--inkt2); font-size: 16px;">Alle documenten onder de Omgevingswet, plus de Wro-plannen die onder het overgangsrecht nog gelden.</p>
    </div>
    <div style="display: flex; gap: 10px; max-width: 900px;">
      <div style="flex: 1; display: flex; align-items: center; gap: 10px; height: 48px; padding: 0 14px; background: var(--vlak); border: 1px solid oklch(78% 0.02 262); border-radius: 6px; color: var(--inkt3);">${I.zoek(19)}<span style="color: var(--inkt); font-size: 16px;">valkenburg</span></div>
      <button style="height: 48px; padding: 0 24px; border: 0; border-radius: 6px; background: var(--acc); color: white; font-weight: 700; font-size: 15.5px;">Zoeken</button>
    </div>
    <div style="display: grid; grid-template-columns: 264px minmax(0, 1fr); gap: 28px; align-items: start;">
      <aside style="background: var(--vlak); border: 1px solid var(--lijn); border-radius: 8px; padding: 6px 18px 10px;">
        ${FACETTEN.map(([k, opties]) => `<fieldset style="border: 0; margin: 0; padding: 12px 0; border-bottom: 1px solid var(--lijn2);">
          <legend style="font-weight: 700; font-size: 13.5px; padding: 0; margin-bottom: 6px; float: left; width: 100%;">${k}</legend>
          ${opties.map(([o, n, aan]) => `<label style="display: flex; gap: 9px; align-items: center; font-size: 14px; padding: 3.5px 0; clear: both;"><span style="width: 16px; height: 16px; border-radius: 4px; flex: none; border: 1.5px solid ${aan ? 'var(--acc)' : 'oklch(76% 0.02 262)'}; background: ${aan ? 'var(--acc)' : 'var(--vlak)'}; display: grid; place-items: center; color: white;">${aan ? '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 5.2l2 2 4-4.4"></path></svg>' : ''}</span>${o}<span class="mono" style="margin-left: auto; font-size: 12px; color: var(--inkt3);">${n}</span></label>`).join('')}
        </fieldset>`).join('')}
      </aside>
      <section style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: baseline; gap: 12px; padding-bottom: 4px;"><span style="font-size: 15px; color: var(--inkt2);"><b style="font-size: 20px; color: var(--inkt);">12</b> documenten</span><span class="chip" style="font-size: 12.5px;">Omgevingswet ✕</span><span class="chip" style="font-size: 12.5px;">Wro ✕</span></div>
        ${HITS.map((h) => `<article style="background: var(--vlak); border: 1px solid var(--lijn); border-radius: 8px; padding: 14px 18px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 20px; align-items: start;">
          <div style="display: flex; gap: 10px; align-items: center;"><span class="tag${h.stelsel === 'Ow' ? ' ow' : ''}">${h.stelsel}</span><a href="#" style="font-size: 17px; font-weight: 700; text-decoration: none;">${h.titel}</a></div>
          <div style="grid-row: span 2; align-self: center;">${h.oordeel ? `<span class="badge ${oordeelCls(h.oordeel[1])}"><span>${h.oordeel[0]}</span>${h.oordeel[1]}</span>` : ''}</div>
          <div style="font-size: 13.5px; color: var(--inkt2); display: flex; gap: 14px;">${h.meta}<span class="mono" style="font-size: 12px; color: var(--inkt3);">${h.id}</span></div>
        </article>`).join('')}
      </section>
    </div>
  </main>
</div>`);

const A_KAART = {
  grond: 'oklch(96.5% 0.004 262)', blok: 'oklch(90% 0.006 262)', blokRand: 'oklch(85% 0.008 262)', straat: 'oklch(99.5% 0.002 262)', straatTekst: 'oklch(55% 0.01 262)',
  perceel: 'oklch(52% 0.17 262)', perceelVlak: 'oklch(52% 0.17 262 / 0.14)', kaartFont: 'Atkinson Hyperlegible, sans-serif', labelFont: 'Atkinson Hyperlegible, sans-serif',
  labelVlak: 'white', labelRand: 'oklch(88% 0.012 262)', labelInkt: 'oklch(20% 0.01 262)', labelRadius: 6,
};

const A_ROM = doc(A_CSS, `<div class="scherm">
  <header class="kop">${brand()}${nav('RoM')}</header>
  <div style="height: 50px; flex: none; display: flex; align-items: center; gap: 22px; padding: 0 32px; background: var(--vlak); border-bottom: 1px solid var(--lijn); font-size: 14.5px;">
    <span style="display: flex; gap: 8px; align-items: center;"><span style="color: var(--inkt3);">Locatie</span><b>Broekhem 33, Valkenburg</b><span style="color: var(--acc); display: flex;">${I.pen(15)}</span></span>
    <span style="width: 1px; height: 20px; background: var(--lijn);"></span>
    <span style="display: flex; gap: 8px; align-items: center;"><span style="color: var(--inkt3);">Vraag</span><b>Mag ik een aanbouw bouwen?</b><span style="color: var(--acc); display: flex;">${I.pen(15)}</span></span>
  </div>
  <div style="flex: 1; display: grid; grid-template-columns: 560px 360px minmax(0, 1fr); min-height: 0;">
    <section style="padding: 22px 24px; display: flex; flex-direction: column; gap: 12px; overflow: hidden; border-right: 1px solid var(--lijn);">
      <div style="display: flex; align-items: baseline; justify-content: space-between;"><h1 style="margin: 0; font-size: 24px; font-weight: 700;">Gevonden voor uw vraag</h1><span style="font-size: 13.5px; color: var(--inkt2); display: flex; gap: 4px; align-items: center;">Sorteren op type ${I.neer(14)}</span></div>
      <h2 style="margin: 4px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: var(--inkt3);">Regels</h2>
      <article style="background: var(--vlak); border: 1px solid oklch(80% 0.06 262); border-radius: 8px; box-shadow: 0 0 0 3px var(--acc-zacht);">
        <div style="padding: 13px 16px; display: flex; flex-direction: column; gap: 7px; border-bottom: 1px solid var(--lijn2);">
          <div style="display: flex; justify-content: space-between; gap: 12px;"><div style="display: flex; gap: 10px; align-items: center;"><span class="tag ow">Ow</span><b style="font-size: 16px;">${DOCS[0].titel}</b></div><span style="color: var(--inkt3); transform: rotate(180deg); display: flex;">${I.neer(18)}</span></div>
          <div style="font-size: 13px; color: var(--inkt2);">${DOCS[0].soort} · ${DOCS[0].gezag}</div>
          ${chips(DOCS[0].themas)}
        </div>
        <div style="padding: 10px 16px 14px; display: flex; flex-direction: column; gap: 6px; font-size: 14px;">
          <div style="font-size: 12.5px; color: var(--inkt3);">Hoofdstuk 6 · Bouwactiviteiten</div>
          <div style="display: flex; gap: 8px; align-items: center; background: var(--acc-zacht); margin: 0 -8px; padding: 6px 8px; border-radius: 6px;"><span style="display: flex; transform: rotate(90deg); color: var(--acc);">${I.rechts(15)}</span><b style="flex: 1;">${ART_TITEL}</b><span style="color: var(--acc); display: flex;">${I.info(17)}</span></div>
          ${LEDEN.map((l, i) => `<div style="display: grid; grid-template-columns: 24px 1fr; gap: 4px; padding-left: 22px; color: var(--inkt2); line-height: 1.5;"><span class="mono" style="font-size: 12.5px; color: var(--inkt3); padding-top: 1px;">${i + 1}</span><span>${l}</span></div>`).join('')}
          <div style="display: flex; gap: 8px; align-items: center; padding: 4px 0 0; color: var(--inkt2);"><span style="display: flex;">${I.rechts(15)}</span>Artikel 2.5 Bouwen gebouwen — beperking bouwhoogte</div>
        </div>
      </article>
      ${DOCS.slice(1).map((d) => `<article style="background: var(--vlak); border: 1px solid var(--lijn); border-radius: 8px; padding: 12px 16px; display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; justify-content: space-between;"><div style="display: flex; gap: 10px; align-items: center;"><span class="tag${d.stelsel === 'Ow' ? ' ow' : ''}">${d.stelsel}</span><b style="font-size: 15.5px;">${d.titel}</b></div><span style="color: var(--inkt3); display: flex;">${I.neer(18)}</span></div>
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;"><span style="font-size: 13px; color: var(--inkt2);">${d.soort}</span>${chips(d.themas)}</div>
      </article>`).join('')}
    </section>
    <aside style="background: var(--vlak); padding: 20px 22px; display: flex; flex-direction: column; gap: 14px; border-right: 1px solid var(--lijn);">
      <div style="display: flex; justify-content: space-between; align-items: center;"><b style="font-size: 16px;">Kenmerken en informatie</b><span style="color: var(--inkt3); display: flex;">${I.sluit(18)}</span></div>
      <div style="display: flex; gap: 4px; background: var(--vlak2); padding: 3px; border-radius: 7px; font-size: 13.5px;">
        <span style="flex: 1; text-align: center; padding: 6px; border-radius: 5px; background: var(--vlak); font-weight: 700; box-shadow: 0 1px 2px oklch(20% 0.02 262 / .12);">Toelichting</span><span style="flex: 1; text-align: center; padding: 6px; color: var(--inkt2);">Kenmerken</span><span style="flex: 1; text-align: center; padding: 6px; color: var(--inkt2);">Beperkingen</span>
      </div>
      <b style="font-size: 14.5px; line-height: 1.4;">${ART_TITEL}</b>
      <p style="margin: 0; font-size: 14px; color: var(--inkt2); line-height: 1.6;">${TOELICHTING}</p>
      <div style="border-top: 1px solid var(--lijn2); padding-top: 12px; display: flex; flex-direction: column; gap: 8px; font-size: 13.5px;">
        <span style="color: var(--inkt3);">Werkingsgebied</span>
        <div style="display: flex; justify-content: space-between; align-items: center;"><span style="display: flex; gap: 8px; align-items: center;"><i style="width: 14px; height: 14px; border: 2px dashed ${T.wonen[1]}; border-radius: 3px;"></i>Woongebied Valkenburg-Centrum</span><span style="width: 34px; height: 20px; border-radius: 10px; background: var(--acc); position: relative;"><i style="position: absolute; right: 3px; top: 3px; width: 14px; height: 14px; border-radius: 50%; background: white;"></i></span></div>
      </div>
      <a href="#" style="margin-top: auto; font-size: 14px; display: flex; gap: 6px; align-items: center;">Open in het register ${I.uit(15)}</a>
    </aside>
    <div class="kaart">${kaart(A_KAART)}${kaartKnoppen('kknoppen')}</div>
  </div>
</div>`);

// ═════════════════════════════════════════════════════════════
// B · KAART-EERST
// ═════════════════════════════════════════════════════════════
const B_CSS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@500;600;700;800&amp;family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&amp;family=IBM+Plex+Mono:wght@400;500&amp;display=swap">
<style>
  :root { --nacht: oklch(22% 0.040 265); --nacht2: oklch(30% 0.045 265); --bg: oklch(97% 0.008 262); --vlak: oklch(100% 0.002 262); --vlak2: oklch(96% 0.012 262); --lijn: oklch(91% 0.014 262);
    --inkt: oklch(19% 0.020 265); --inkt2: oklch(40% 0.020 265); --inkt3: oklch(55% 0.022 262); --acc: oklch(56% 0.18 264); --acc-licht: oklch(78% 0.11 264); --acc-zacht: oklch(94.5% 0.035 264);
    --ok-bg: oklch(94% 0.045 150); --ok: oklch(38% 0.11 150); --at-bg: oklch(95% 0.05 80); --at: oklch(42% 0.11 80); --nv-bg: oklch(94% 0.012 262); --nv: oklch(48% 0.018 262);
    --schaduw: 0 1px 2px oklch(20% 0.04 265 / .08), 0 8px 28px oklch(20% 0.04 265 / .12); }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--inkt); font: 400 15px/1.55 "Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif; }
  a { color: var(--acc); } a:hover { color: oklch(38% 0.14 264); }
  button { font: inherit; color: inherit; }
  .g { font-family: "Schibsted Grotesk", "Segoe UI", system-ui, sans-serif; }
  .scherm { width: 1440px; height: 900px; overflow: hidden; display: flex; flex-direction: column; background: var(--bg); position: relative; }
  .kop { height: 64px; flex: none; display: flex; align-items: center; gap: 32px; padding: 0 28px; background: var(--nacht); color: oklch(96% 0.01 262); position: relative; z-index: 2; }
  .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; color: inherit; }
  .mark { display: grid; gap: 3px; width: 24px; } .mark i { display: block; height: 3.5px; background: oklch(96% 0.01 262); border-radius: 2px; }
  .mark i:nth-child(2) { width: 80%; } .mark i:nth-child(3) { width: 55%; background: var(--acc-licht); }
  .brand-t { display: flex; flex-direction: column; } .brand-t strong { font: 700 17px/1.1 "Schibsted Grotesk", sans-serif; letter-spacing: -.01em; }
  .sub { font-size: 11px; color: oklch(76% 0.03 262); }
  .nav { margin-left: auto; display: flex; gap: 2px; align-items: center; font-family: "Schibsted Grotesk", sans-serif; }
  .nav a { text-decoration: none; color: oklch(84% 0.02 262); font-size: 14.5px; font-weight: 500; padding: 8px 13px; border-radius: 99px; display: flex; gap: 8px; align-items: center; }
  .nav a.actief { background: var(--nacht2); color: white; }
  .proto { font: 600 10px/1 "Schibsted Grotesk", sans-serif; text-transform: uppercase; letter-spacing: .06em; padding: 4px 7px; border-radius: 99px; background: var(--acc); color: white; }
  .mono { font-family: "IBM Plex Mono", ui-monospace, monospace; }
  .tag { font: 700 11px/1 "Schibsted Grotesk", sans-serif; letter-spacing: .05em; padding: 5px 8px; border-radius: 99px; background: var(--vlak2); color: var(--inkt2); }
  .tag.ow { background: var(--acc-zacht); color: var(--acc); }
  .badge { font-size: 12.5px; font-weight: 700; padding: 4px 10px; border-radius: 99px; display: inline-flex; gap: 6px; }
  .badge span { font-weight: 400; opacity: .8; }
  .badge.ok { background: var(--ok-bg); color: var(--ok); } .badge.at { background: var(--at-bg); color: var(--at); } .badge.nv { background: var(--nv-bg); color: var(--nv); }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; padding: 4px 10px 4px 8px; border-radius: 99px; background: var(--vlak2); color: var(--inkt2); }
  .chip i { width: 9px; height: 9px; border-radius: 50%; display: block; } .chip b { color: var(--inkt); }
  .kknoppen { position: absolute; right: 20px; top: 84px; display: flex; flex-direction: column; gap: 10px; z-index: 2; }
  .kk { width: 42px; height: 42px; display: grid; place-items: center; background: var(--vlak); border: 0; border-radius: 12px; color: var(--inkt); box-shadow: var(--schaduw); }
  .kk-groep { display: flex; flex-direction: column; border-radius: 12px; box-shadow: var(--schaduw); } .kk-groep .kk { box-shadow: none; } .kk-groep .kk:first-child { border-radius: 12px 12px 0 0; border-bottom: 1px solid var(--lijn); } .kk-groep .kk:last-child { border-radius: 0 0 12px 12px; }
</style>`;

const B_KAART = {
  grond: 'oklch(95% 0.010 262)', blok: 'oklch(88.5% 0.014 262)', blokRand: 'oklch(88.5% 0.014 262)', straat: 'oklch(99.5% 0.003 262)', straatTekst: 'oklch(52% 0.03 262)',
  perceel: 'oklch(56% 0.18 264)', perceelVlak: 'oklch(56% 0.18 264 / 0.18)', kaartFont: 'Schibsted Grotesk, sans-serif', labelFont: 'Schibsted Grotesk, sans-serif',
  labelVlak: 'oklch(22% 0.04 265)', labelRand: 'oklch(22% 0.04 265)', labelInkt: 'white', labelRadius: 15, viewBox: '-640 240 1400 780',
};

const B_REG = doc(B_CSS, `<div class="scherm">
  <header class="kop">${brand()}${nav('Zoeken')}</header>
  <section style="position: relative; height: 330px; flex: none; background: var(--nacht); overflow: hidden;">
    <div style="position: absolute; inset: 0; opacity: .16;">${kaart({ ...B_KAART, grond: 'oklch(22% 0.04 265)', blok: 'oklch(60% 0.06 264)', blokRand: 'oklch(60% 0.06 264)', straat: 'oklch(22% 0.04 265)', straatTekst: 'oklch(22% 0.04 265)', labelVlak: 'transparent', labelRand: 'transparent', labelInkt: 'transparent' })}</div>
    <div style="position: absolute; inset: 0; background: linear-gradient(90deg, oklch(22% 0.04 265) 30%, oklch(22% 0.04 265 / 0.2));"></div>
    <div style="position: relative; padding: 52px 64px 0; display: flex; flex-direction: column; gap: 14px; max-width: 980px;">
      <h1 class="g" style="margin: 0; font-size: 46px; line-height: 1.05; font-weight: 800; letter-spacing: -.025em; color: white;">Elk omgevingsdocument,<br>één vast adres.</h1>
      <p style="margin: 0; color: oklch(82% 0.03 262); font-size: 17px; max-width: 620px;">Alle documenten onder de Omgevingswet, plus de Wro-plannen die onder het overgangsrecht nog gelden.</p>
    </div>
  </section>
  <div style="position: relative; margin: -86px 64px 0; background: var(--vlak); border-radius: 18px; box-shadow: var(--schaduw); padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 12px; z-index: 1;">
    <div class="g" style="display: flex; gap: 4px; font-size: 14px; font-weight: 600;">
      <span style="padding: 7px 14px; border-radius: 99px; background: var(--acc-zacht); color: var(--acc);">Document zoeken</span>
      <span style="padding: 7px 14px; border-radius: 99px; color: var(--inkt2); display: flex; gap: 8px; align-items: center;">Regels op een locatie <span class="proto">prototype</span></span>
    </div>
    <div style="display: flex; gap: 10px;">
      <div style="flex: 1; display: flex; align-items: center; gap: 12px; height: 56px; padding: 0 18px; background: var(--vlak2); border-radius: 12px; color: var(--inkt3);">${I.zoek(21)}<span style="color: var(--inkt); font-size: 18px;">valkenburg</span></div>
      <button class="g" style="height: 56px; padding: 0 30px; border: 0; border-radius: 12px; background: var(--acc); color: white; font-weight: 700; font-size: 16px;">Zoeken</button>
    </div>
  </div>
  <main style="padding: 22px 64px 0; display: flex; flex-direction: column; gap: 14px; overflow: hidden;">
    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
      <span class="g" style="font-size: 17px; font-weight: 700; margin-right: 10px;">12 documenten</span>
      <span class="g" style="font-size: 13.5px; font-weight: 600; padding: 7px 13px; border-radius: 99px; background: var(--inkt); color: white;">Omgevingswet · Wro</span>
      ${['Bestuurslaag', 'Documenttype', 'Bronhouder'].map((f) => `<span class="g" style="font-size: 13.5px; font-weight: 500; padding: 6px 12px; border-radius: 99px; background: var(--vlak); border: 1px solid var(--lijn); display: flex; gap: 4px; align-items: center;">${f} ${I.neer(14)}</span>`).join('')}
    </div>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">
      ${HITS.slice(0, 4).map((h) => `<article style="background: var(--vlak); border-radius: 14px; box-shadow: 0 1px 2px oklch(20% 0.04 265 / .06); border: 1px solid var(--lijn); padding: 16px 18px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;"><span class="tag${h.stelsel === 'Ow' ? ' ow' : ''}">${h.stelsel === 'Ow' ? 'OMGEVINGSWET' : 'WRO'}</span>${h.oordeel ? `<span class="badge ${oordeelCls(h.oordeel[1])}"><span>${h.oordeel[0]}</span>${h.oordeel[1]}</span>` : ''}</div>
        <a href="#" class="g" style="font-size: 19px; font-weight: 700; letter-spacing: -.01em; text-decoration: none; color: var(--inkt); line-height: 1.25;">${h.titel}</a>
        <div style="font-size: 13.5px; color: var(--inkt2); display: flex; justify-content: space-between; gap: 12px;">${h.meta}<span class="mono" style="font-size: 12px; color: var(--inkt3);">${h.id}</span></div>
      </article>`).join('')}
    </div>
  </main>
</div>`);

const B_ROM = doc(B_CSS, `<div class="scherm">
  <header class="kop">${brand()}${nav('RoM')}</header>
  <div style="position: absolute; inset: 64px 0 0 0;">${kaart(B_KAART)}</div>
  ${kaartKnoppen('kknoppen')}
  <div style="position: absolute; left: 20px; top: 84px; bottom: 20px; width: 540px; background: var(--vlak); border-radius: 18px; box-shadow: var(--schaduw); display: flex; flex-direction: column; overflow: hidden;">
    <div style="padding: 14px; border-bottom: 1px solid var(--lijn);">
      <div style="background: var(--vlak2); border-radius: 12px; display: flex; flex-direction: column;">
        <div style="display: flex; gap: 12px; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--lijn);"><span style="color: var(--acc); display: flex;">${I.locatie(18)}</span><span style="flex: 1; font-weight: 700;">Broekhem 33, Valkenburg</span><span style="color: var(--inkt3); display: flex;">${I.pen(16)}</span></div>
        <div style="display: flex; gap: 12px; align-items: center; padding: 10px 14px;"><span style="color: var(--acc); display: flex;">${I.zoek(18)}</span><span style="flex: 1;">Mag ik een aanbouw bouwen?</span><span style="color: var(--inkt3); display: flex;">${I.pen(16)}</span></div>
      </div>
    </div>
    <div style="padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; overflow: hidden;">
      <div style="display: flex; align-items: baseline; justify-content: space-between;"><h1 class="g" style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -.02em;">Gevonden voor uw vraag</h1><span style="font-size: 13.5px; color: var(--inkt2); display: flex; gap: 4px; align-items: center;">Op type ${I.neer(14)}</span></div>
      <div class="g" style="display: flex; gap: 6px; font-size: 13px; font-weight: 600;"><span style="padding: 6px 12px; border-radius: 99px; background: var(--inkt); color: white;">Regels 4</span><span style="padding: 6px 12px; border-radius: 99px; background: var(--vlak2); color: var(--inkt2);">Mogelijke beperkingen 2</span></div>
      <article style="border-radius: 14px; background: var(--acc-zacht); padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; gap: 10px;"><b class="g" style="font-size: 17px; letter-spacing: -.01em;">${DOCS[0].titel}</b><span style="color: var(--acc); transform: rotate(180deg); display: flex;">${I.neer(18)}</span></div>
        <div style="font-size: 13px; color: var(--inkt2);">${DOCS[0].soort} · ${DOCS[0].gezag}</div>
        ${chips(DOCS[0].themas).replaceAll('class="chip"', 'class="chip" style="background: var(--vlak);"')}
        <div style="background: var(--vlak); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; margin-top: 4px; font-size: 14px;">
          <div style="display: flex; gap: 8px; align-items: start;"><b style="flex: 1; line-height: 1.35;">${ART_TITEL}</b><span style="color: var(--acc); display: flex;">${I.info(18)}</span></div>
          ${LEDEN.map((l, i) => `<div style="display: grid; grid-template-columns: 22px 1fr; color: var(--inkt2); line-height: 1.5;"><span class="mono" style="font-size: 12.5px; color: var(--inkt3);">${i + 1}</span><span>${l}</span></div>`).join('')}
        </div>
      </article>
      ${DOCS.slice(1).map((d) => `<article style="border-radius: 14px; border: 1px solid var(--lijn); padding: 12px 16px; display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; justify-content: space-between;"><b class="g" style="font-size: 15.5px;">${d.titel}</b><span style="color: var(--inkt3); display: flex;">${I.neer(18)}</span></div>
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;"><span style="font-size: 13px; color: var(--inkt2);">${d.soort}</span>${chips(d.themas)}</div>
      </article>`).join('')}
    </div>
  </div>
  <div style="position: absolute; left: 578px; top: 84px; width: 340px; background: var(--vlak); border-radius: 18px; box-shadow: var(--schaduw); padding: 18px 20px; display: flex; flex-direction: column; gap: 12px;">
    <div style="display: flex; justify-content: space-between; align-items: center;"><b class="g" style="font-size: 16px;">Kenmerken en informatie</b><span style="color: var(--inkt3); display: flex;">${I.sluit(18)}</span></div>
    <div class="g" style="display: flex; gap: 4px; font-size: 13px; font-weight: 600;"><span style="padding: 6px 12px; border-radius: 99px; background: var(--inkt); color: white;">Toelichting</span><span style="padding: 6px 12px; color: var(--inkt2);">Kenmerken</span><span style="padding: 6px 12px; color: var(--inkt2);">Beperkingen</span></div>
    <p style="margin: 0; font-size: 14px; color: var(--inkt2); line-height: 1.6;">${TOELICHTING}</p>
  </div>
  <div style="position: absolute; right: 20px; bottom: 20px; background: var(--vlak); border-radius: 14px; box-shadow: var(--schaduw); padding: 12px 16px; display: flex; flex-direction: column; gap: 7px; font-size: 13px;">
    <b class="g" style="font-size: 13px;">Op de kaart</b>
    <span style="display: flex; gap: 8px; align-items: center;"><i style="width: 14px; height: 14px; border-radius: 4px; background: oklch(56% 0.18 264 / .25); border: 2px solid var(--acc);"></i>Perceel</span>
    <span style="display: flex; gap: 8px; align-items: center;"><i style="width: 14px; height: 14px; border-radius: 4px; border: 2px dashed ${T.wonen[1]};"></i>Werkingsgebied artikel 6.9</span>
    <span style="display: flex; gap: 8px; align-items: center;"><i style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid oklch(58% 0.17 28);"></i>Externe veiligheid</span>
  </div>
</div>`);

// ═════════════════════════════════════════════════════════════
// C · DOCUMENT EN INTERFACE
// ═════════════════════════════════════════════════════════════
const C_CSS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&amp;family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&amp;family=IBM+Plex+Mono:wght@400;500&amp;display=swap">
<style>
  :root { --grond: oklch(95.2% 0.010 262); --grond2: oklch(92.5% 0.013 262); --blad: oklch(100% 0.002 90); --lijn: oklch(87.5% 0.014 262); --lijn2: oklch(93% 0.008 262);
    --inkt: oklch(21% 0.012 262); --inkt2: oklch(39% 0.014 262); --inkt3: oklch(53% 0.020 262); --acc: oklch(50% 0.16 262); --acc-zacht: oklch(92.5% 0.035 262);
    --ok-bg: oklch(94% 0.045 150); --ok: oklch(38% 0.11 150); --at-bg: oklch(95% 0.05 80); --at: oklch(42% 0.11 80); --nv-bg: oklch(91% 0.012 262); --nv: oklch(46% 0.018 262);
    --blad-schaduw: 0 0 0 1px oklch(85% 0.014 262), 0 1px 3px oklch(20% 0.02 262 / .08); }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--grond); color: var(--inkt); font: 400 14px/1.5 "Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif; }
  a { color: var(--acc); } a:hover { color: oklch(34% 0.12 262); }
  button { font: inherit; color: inherit; }
  .s { font-family: "Source Serif 4", Georgia, serif; }
  .scherm { width: 1440px; height: 900px; overflow: hidden; display: flex; flex-direction: column; background: var(--grond); }
  .kop { height: 56px; flex: none; display: flex; align-items: center; gap: 28px; padding: 0 24px; background: var(--grond); border-bottom: 1px solid var(--lijn); }
  .brand { display: flex; align-items: center; gap: 11px; text-decoration: none; color: var(--inkt); }
  .mark { display: grid; gap: 3px; width: 22px; padding: 5px 4px; background: var(--blad); box-shadow: var(--blad-schaduw); border-radius: 2px; box-sizing: content-box; } .mark i { display: block; height: 2.5px; background: var(--inkt); }
  .mark i:nth-child(2) { width: 80%; } .mark i:nth-child(3) { width: 55%; background: var(--acc); }
  .brand-t { display: flex; align-items: baseline; gap: 12px; } .brand-t strong { font-size: 15.5px; }
  .sub { font-size: 12px; color: var(--inkt3); }
  .nav { margin-left: auto; display: flex; gap: 2px; align-items: center; }
  .nav a { text-decoration: none; color: var(--inkt2); font-size: 14px; padding: 6px 11px; border-radius: 4px; display: flex; gap: 7px; align-items: center; }
  .nav a.actief { background: var(--inkt); color: var(--blad); font-weight: 700; }
  .nav a.actief .proto { background: oklch(35% 0.02 262); color: oklch(85% 0.02 262); border-color: transparent; }
  .proto { font: 500 10px/1 "IBM Plex Mono", monospace; text-transform: uppercase; letter-spacing: .05em; padding: 3px 5px; border-radius: 3px; border: 1px solid var(--lijn); color: var(--inkt3); }
  .mono { font-family: "IBM Plex Mono", ui-monospace, monospace; }
  .label { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--inkt3); }
  .tag { font: 500 10.5px/1 "IBM Plex Mono", monospace; letter-spacing: .03em; padding: 3px 5px; border-radius: 3px; border: 1px solid var(--lijn); color: var(--inkt3); }
  .tag.ow { color: var(--acc); border-color: oklch(78% 0.07 262); }
  .badge { font-size: 12px; font-weight: 700; padding: 2px 7px; border-radius: 3px; display: inline-flex; gap: 6px; }
  .badge span { font-weight: 400; opacity: .8; }
  .badge.ok { background: var(--ok-bg); color: var(--ok); } .badge.at { background: var(--at-bg); color: var(--at); } .badge.nv { background: var(--nv-bg); color: var(--nv); }
  .chips { display: flex; gap: 5px; flex-wrap: wrap; }
  .chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; padding: 2px 8px 2px 6px; border-radius: 3px; background: var(--grond); color: var(--inkt2); }
  .chip i { width: 8px; height: 8px; border-radius: 2px; display: block; } .chip b { color: var(--inkt); }
  .blad { background: var(--blad); box-shadow: var(--blad-schaduw); border-radius: 2px; }
  .kaart { position: relative; overflow: hidden; }
  .kknoppen { position: absolute; right: 14px; top: 14px; display: flex; flex-direction: column; gap: 6px; }
  .kk { width: 34px; height: 34px; display: grid; place-items: center; background: var(--blad); border: 0; box-shadow: var(--blad-schaduw); border-radius: 3px; color: var(--inkt2); }
  .kk-groep { display: flex; flex-direction: column; gap: 1px; }
</style>`;

const C_KAART = {
  grond: 'oklch(97% 0.006 90)', blok: 'oklch(91% 0.008 262)', blokRand: 'oklch(84% 0.010 262)', straat: 'oklch(99.5% 0.002 90)', straatTekst: 'oklch(52% 0.012 262)',
  perceel: 'oklch(50% 0.16 262)', perceelVlak: 'oklch(50% 0.16 262 / 0.14)', kaartFont: 'Atkinson Hyperlegible, sans-serif', labelFont: 'Atkinson Hyperlegible, sans-serif',
  labelVlak: 'oklch(21% 0.012 262)', labelRand: 'oklch(21% 0.012 262)', labelInkt: 'white', labelRadius: 3,
};

const C_REG = doc(C_CSS, `<div class="scherm">
  <header class="kop">${brand()}${nav('Zoeken')}</header>
  <div style="flex: 1; display: grid; grid-template-columns: 250px minmax(0, 1fr); min-height: 0;">
    <aside style="border-right: 1px solid var(--lijn); padding: 22px 20px; display: flex; flex-direction: column; gap: 18px;">
      ${FACETTEN.map(([k, opties]) => `<div style="display: flex; flex-direction: column; gap: 4px;"><span class="label" style="margin-bottom: 4px;">${k}</span>
        ${opties.map(([o, n, aan]) => `<label style="display: flex; gap: 8px; align-items: center; font-size: 13.5px; padding: 3px 0; color: ${aan ? 'var(--inkt)' : 'var(--inkt2)'};"><span style="width: 14px; height: 14px; border-radius: 2px; flex: none; border: 1.5px solid ${aan ? 'var(--inkt)' : 'oklch(72% 0.02 262)'}; background: ${aan ? 'var(--inkt)' : 'var(--blad)'}; display: grid; place-items: center; color: white;">${aan ? '<svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 5.2l2 2 4-4.4"></path></svg>' : ''}</span>${o}<span class="mono" style="margin-left: auto; font-size: 11.5px; color: var(--inkt3);">${n}</span></label>`).join('')}
      </div>`).join('')}
    </aside>
    <main style="padding: 22px 36px 0; display: flex; flex-direction: column; gap: 16px; overflow: hidden;">
      <div style="display: flex; gap: 8px; align-items: stretch; max-width: 860px;">
        <div style="flex: 1; display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 12px; background: var(--blad); box-shadow: var(--blad-schaduw); border-radius: 3px; color: var(--inkt3);">${I.zoek(18)}<span style="color: var(--inkt); font-size: 15.5px;">valkenburg</span><span class="mono" style="margin-left: auto; font-size: 11px; border: 1px solid var(--lijn); border-radius: 3px; padding: 2px 5px;">/</span></div>
        <button style="padding: 0 20px; border: 0; border-radius: 3px; background: var(--inkt); color: var(--blad); font-weight: 700; font-size: 14.5px;">Zoeken</button>
      </div>
      <div style="display: flex; align-items: baseline; gap: 10px;"><span style="font-size: 14px; color: var(--inkt2);"><b style="color: var(--inkt);">12 documenten</b> voor “valkenburg”</span></div>
      <div style="display: flex; flex-direction: column; gap: 8px; max-width: 1060px;">
        ${HITS.map((h) => `<article class="blad" style="padding: 15px 22px 14px; display: grid; grid-template-columns: minmax(0, 1fr) 190px; gap: 3px 24px;">
          <a href="#" class="s" style="font-size: 20px; font-weight: 600; text-decoration: none; color: var(--inkt); line-height: 1.3;">${h.titel}</a>
          <div style="grid-row: span 2; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; justify-content: center;"><span class="tag${h.stelsel === 'Ow' ? ' ow' : ''}">${h.stelsel === 'Ow' ? 'OW' : 'WRO'}</span>${h.oordeel ? `<span class="badge ${oordeelCls(h.oordeel[1])}"><span>${h.oordeel[0]}</span>${h.oordeel[1]}</span>` : ''}</div>
          <div style="font-size: 13px; color: var(--inkt2); display: flex; gap: 14px; align-items: baseline;">${h.meta}<span class="mono" style="font-size: 11.5px; color: var(--inkt3);">${h.id}</span></div>
        </article>`).join('')}
      </div>
    </main>
  </div>
</div>`);

const C_ROM = doc(C_CSS, `<div class="scherm">
  <header class="kop">${brand()}${nav('RoM')}</header>
  <div style="height: 46px; flex: none; display: flex; align-items: center; gap: 8px; padding: 0 24px; border-bottom: 1px solid var(--lijn); font-size: 13.5px;">
    <span style="display: flex; gap: 8px; align-items: center; padding: 5px 10px; background: var(--blad); box-shadow: var(--blad-schaduw); border-radius: 3px;"><span class="label">Locatie</span><b>Broekhem 33, Valkenburg</b><span style="color: var(--inkt3); display: flex;">${I.pen(14)}</span></span>
    <span style="display: flex; gap: 8px; align-items: center; padding: 5px 10px; background: var(--blad); box-shadow: var(--blad-schaduw); border-radius: 3px;"><span class="label">Vraag</span><b>Mag ik een aanbouw bouwen?</b><span style="color: var(--inkt3); display: flex;">${I.pen(14)}</span></span>
    <span style="margin-left: auto; color: var(--inkt3);">4 documenten · 2 mogelijke beperkingen</span>
  </div>
  <div style="flex: 1; display: grid; grid-template-columns: 600px 320px minmax(0, 1fr); min-height: 0;">
    <section style="padding: 18px 20px; display: flex; flex-direction: column; gap: 10px; overflow: hidden;">
      <div style="display: flex; align-items: baseline; justify-content: space-between;"><h1 style="margin: 0; font-size: 20px; font-weight: 700;">Gevonden voor uw vraag</h1><span style="font-size: 13px; color: var(--inkt2); display: flex; gap: 4px; align-items: center;">Sorteren op type ${I.neer(14)}</span></div>
      <article class="blad" style="border-top: 3px solid var(--acc);">
        <div style="padding: 14px 20px 12px; display: flex; flex-direction: column; gap: 6px; border-bottom: 1px solid var(--lijn2);">
          <div style="display: flex; justify-content: space-between; gap: 12px; align-items: start;"><b class="s" style="font-size: 19px; font-weight: 600; line-height: 1.25;">${DOCS[0].titel}</b><span style="color: var(--inkt3); transform: rotate(180deg); display: flex; margin-top: 3px;">${I.neer(17)}</span></div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;"><span style="font-size: 12.5px; color: var(--inkt2); display: flex; gap: 8px; align-items: center;"><span class="tag ow">OW</span>${DOCS[0].soort} · ${DOCS[0].gezag}</span></div>
          ${chips(DOCS[0].themas)}
        </div>
        <div style="padding: 12px 20px 16px; display: flex; flex-direction: column; gap: 8px;">
          <span class="label" style="font-size: 10.5px;">Hoofdstuk 6 · Bouwactiviteiten</span>
          <div style="display: flex; gap: 10px; align-items: start;"><h3 class="s" style="margin: 0; flex: 1; font-size: 17px; font-weight: 600; line-height: 1.35;">${ART_TITEL}</h3><span style="color: var(--blad); background: var(--acc); border-radius: 3px; display: flex; padding: 2px;">${I.info(16)}</span></div>
          ${LEDEN.map((l, i) => `<div style="display: grid; grid-template-columns: 26px 1fr; gap: 2px;"><span class="mono" style="font-size: 12px; color: var(--inkt3); padding-top: 3px;">${i + 1}.</span><p class="s" style="margin: 0; font-size: 16px; line-height: 1.6; color: var(--inkt);">${l}</p></div>`).join('')}
          <div style="display: flex; gap: 6px; align-items: center; padding-top: 4px; font-size: 13.5px; color: var(--inkt2); border-top: 1px dashed var(--lijn); margin-top: 4px; padding-top: 8px;"><span style="display: flex;">${I.rechts(14)}</span><span class="s" style="font-size: 15px;">Artikel 2.5 Bouwen gebouwen — beperking bouwhoogte</span></div>
        </div>
      </article>
      ${DOCS.slice(1).map((d) => `<article class="blad" style="padding: 11px 20px; display: flex; flex-direction: column; gap: 5px;">
        <div style="display: flex; justify-content: space-between; align-items: center;"><b class="s" style="font-size: 16.5px; font-weight: 600;">${d.titel}</b><span style="color: var(--inkt3); display: flex;">${I.neer(17)}</span></div>
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;"><span style="font-size: 12.5px; color: var(--inkt2); display: flex; gap: 8px; align-items: center;"><span class="tag${d.stelsel === 'Ow' ? ' ow' : ''}">${d.stelsel.toUpperCase()}</span>${d.soort}</span>${chips(d.themas)}</div>
      </article>`).join('')}
    </section>
    <aside style="border-left: 1px solid var(--lijn); border-right: 1px solid var(--lijn); padding: 18px 18px; display: flex; flex-direction: column; gap: 12px; background: var(--grond);">
      <div style="display: flex; justify-content: space-between; align-items: center;"><span class="label">Kenmerken en informatie</span><span style="color: var(--inkt3); display: flex;">${I.sluit(16)}</span></div>
      <div style="display: flex; border-bottom: 1px solid var(--lijn); font-size: 13.5px;"><span style="padding: 6px 10px; border-bottom: 2px solid var(--inkt); font-weight: 700; margin-bottom: -1px;">Toelichting</span><span style="padding: 6px 10px; color: var(--inkt2);">Kenmerken</span><span style="padding: 6px 10px; color: var(--inkt2);">Beperkingen</span></div>
      <p style="margin: 0; font-size: 13.5px; color: var(--inkt2); line-height: 1.6;">${TOELICHTING}</p>
      <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px;">
        <span class="label" style="font-size: 10.5px;">Kenmerken</span>
        ${[['Type regel', 'Regel voor iedereen'], ['Activiteit', 'Bouwactiviteit (omgevingsplan)'], ['Werkingsgebied', 'Woongebied Valkenburg-Centrum']].map(([k, v]) => `<div style="display: grid; grid-template-columns: 100px 1fr; gap: 8px; padding: 5px 0; border-top: 1px solid var(--lijn2);"><span style="color: var(--inkt3);">${k}</span><span>${v}</span></div>`).join('')}
      </div>
      <a href="#" style="margin-top: auto; font-size: 13.5px; display: flex; gap: 6px; align-items: center;">Lees het hele document in het register ${I.uit(14)}</a>
    </aside>
    <div class="kaart">${kaart(C_KAART)}${kaartKnoppen('kknoppen')}</div>
  </div>
</div>`);

w('RustigRegister.dc.html', A_REG);
w('RustigRom.dc.html', A_ROM);
w('KaartEerstRegister.dc.html', B_REG);
w('KaartEerstRom.dc.html', B_ROM);
w('DocumentRegister.dc.html', C_REG);
w('Main.dc.html', C_ROM);

const ATEKST = 'A · Rustig register\n\nDicht bij wat er nu staat: dezelfde letter (Atkinson Hyperlegible), hetzelfde blauw-violet, hetzelfde merkteken. Weg zijn de serif-koppen, de papierkorrel en de zwarte lijnen. Daarvoor in de plaats komen witte vlakken met een kleine afronding.\n\nVoor: kleinste stap; het register blijft herkenbaar.\nTegen: netjes maar weinig eigen. Een kaartapplicatie in deze stijl oogt al snel als een generiek dashboard.';
const BTEKST = 'B · Kaart-eerst\n\nModerner en ruimer. Een donkere kop, Schibsted Grotesk voor koppen en knoppen, zwevende panelen met schaduw en afgeronde vormen. RoM gebruikt de volle kaart; het register opent met een grote zoekkaart waarin je al kunt kiezen tussen een document zoeken en regels op een locatie.\n\nVoor: voelt als een product; kaart en register zijn één familie.\nTegen: het verst van de huidige site. Het donkere en ronde trekt richting consumentenapp en past minder bij een register dat vooral nauwkeurig wil zijn.';
const CTEKST = 'C · Document en interface\n\nDe interface is sans-serif, compact en ligt op een koelgrijze ondergrond. Wat bron is (documenttitels, artikelen, leden) staat op witte ‘bladen’ in een serif (Source Serif 4). Zo zie je in één oogopslag wat regeltekst is en wat bediening.\n\nVoor: eigen gezicht dat ook iets uitlegt; houdt het serieuze van het register zonder krant. Werkt in beide schermen hetzelfde.\nTegen: vraagt discipline. Serif mag alleen voor brontekst, anders valt het onderscheid weg. Dichter dan A.\n\nGekozen op 16-09-2026.';
const GEDEELD = 'In alle drie hetzelfde\n\n• Themakleuren (Wonen, Groen, Bouwen, …) staan los van de statuskleuren (goed/matig/zwak), zodat een groene chip niet als ‘goed’ leest.\n• Geen DSO-groen, geen loket-logo.\n• ‘Regels op maat’ staat als prototype in het menu van het register.\n\nVoorbeeldinhoud: de zoekresultaten, aantallen, oordelen, het bestemmingsplan en de tekst van de leden zijn verzonnen voor de mockup. Broekhem 33 en de themaverdeling komen uit de screenshots.';
const rij = (y) => y * 1040;
const canvas = {
  pages: [{ id: "page-1", name: "Gekozen: C · Document en interface" }, { id: "page-2", name: "Andere richtingen (A, B)" }],
  artboards: [
    { file: "DocumentRegister.dc.html", title: "C · Document en interface — Zoeken", x: 0, y: 0, w: 1440, h: 900, page: "page-1" },
    { file: "Main.dc.html", title: "C · Document en interface — Regels op maat", x: 1540, y: 0, w: 1440, h: 900, page: "page-1" },
    { file: "RustigRegister.dc.html", title: "A · Rustig register — Zoeken", x: 0, y: rij(0), w: 1440, h: 900, page: "page-2" },
    { file: "RustigRom.dc.html", title: "A · Rustig register — Regels op maat", x: 1540, y: rij(0), w: 1440, h: 900, page: "page-2" },
    { file: "KaartEerstRegister.dc.html", title: "B · Kaart-eerst — Zoeken", x: 0, y: rij(1), w: 1440, h: 900, page: "page-2" },
    { file: "KaartEerstRom.dc.html", title: "B · Kaart-eerst — Regels op maat", x: 1540, y: rij(1), w: 1440, h: 900, page: "page-2" },
  ],
  annotations: [
    { id: "richting-c", page: "page-1", x: -380, y: 0, w: 320, text: CTEKST },
    { id: "gedeeld", page: "page-1", x: 3060, y: 0, w: 300, text: GEDEELD },
    { id: "richting-a", page: "page-2", x: -380, y: rij(0), w: 320, text: ATEKST },
    { id: "richting-b", page: "page-2", x: -380, y: rij(1), w: 320, text: BTEKST },
  ],
  launch: { view: "canvas", page: "page-1" },
};

