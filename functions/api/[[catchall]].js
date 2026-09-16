// Cloudflare Pages Function — server-side proxy naar de OCD-API op Railway.
//
// Zelfde patroon als omgevingsdocumentenregister.nl (functions/api), met een
// eigen, smallere whitelist: alleen wat Regels op maat gebruikt.
//   1. OCD_API_KEY_PUBLIC blijft server-side (staat nooit in de HTML)
//   2. Cloudflare-edge in het pad → DDoS-bescherming + WAF
//   3. Same-origin vanuit de browser, dus geen CORS-configuratie nodig
//
// Caching: uitsluitend via `Cache-Control` response-headers. Bewust GEEN
// `caches.default.put` en geen `cf: { cacheTtl }` — die lagen zijn niet via
// Purge Everything te legen (geleerd op omgevingsvergunningenregister.nl).

const UPSTREAM = 'https://ocd-api-production.up.railway.app';

// Exacte paden of prefixen. `/v1/viewer/regeling/` is NIET als geheel open:
// daaronder hangen ook zware routes. Alleen de twee staarten die RoM leest.
const EXACT = new Set([
  '/health',
  '/v1/viewer/regelmix',
  '/v1/viewer/regelmix/document',
  '/v1/viewer/teksten',
]);
const REGELING_STAARTEN = ['/onderwerpen', '/boom'];

function toegestaan(pad) {
  if (EXACT.has(pad)) return true;
  if (pad.startsWith('/v1/viewer/regeling/')) {
    return REGELING_STAARTEN.some((s) => pad.endsWith(s));
  }
  return false;
}

export async function onRequest({ request, env }) {
  // Het pad uit de ruwe URL halen, niet uit params.catchall: de expressie van
  // een regeling zit er als één %2F-gecodeerd segment in (/akn/nl/act/…;2) en
  // moet zo ook bij OCD aankomen.
  const url = new URL(request.url);
  const rauwPad = url.pathname.replace(/^\/api/, '');
  let pad;
  try { pad = decodeURIComponent(rauwPad); } catch { return new Response('Bad Request', { status: 400 }); }

  if (!toegestaan(pad)) {
    return new Response('Not Found', { status: 404 });
  }

  // Eén POST-endpoint: de batch-tekstopvraag (een wid-lijst; muteert niets).
  const POST_TOEGESTAAN = pad === '/v1/viewer/teksten';
  if (request.method !== 'GET' && request.method !== 'HEAD' &&
      !(request.method === 'POST' && POST_TOEGESTAAN)) {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const upstreamReq = new Request(UPSTREAM + rauwPad + url.search, request);
  upstreamReq.headers.set('X-Api-Key', env.OCD_API_KEY_PUBLIC || '');
  upstreamReq.headers.delete('host');
  upstreamReq.headers.delete('cookie');

  const response = await fetch(upstreamReq);

  // Alleen geslaagde GET's cachen. Een fout antwoord mag niet blijven plakken.
  if (request.method === 'GET' && response.ok) {
    const headers = new Headers(response.headers);
    // browser 5 min · CDN 24 u — bij een data-update: Purge Everything.
    headers.set('Cache-Control', 'public, max-age=300, s-maxage=86400');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
  return response;
}
