/* Regels op maat — een locatie kiezen, en zien welke regels daar gelden.
 *
 * Datastromen (alles live, niets vooraf berekend):
 *   adres/perceel  PDOK Locatieserver (suggest, lookup, reverse) — rechtstreeks
 *   documenten     /api/v1/viewer/regelmix?x&y
 *   artikelen      /api/v1/viewer/regelmix/document?x&y&bron&bron_type
 *   onderwerpen    /api/v1/viewer/regeling/{expr}/onderwerpen  (indeling van het register)
 *   structuur      /api/v1/viewer/regeling/{expr}/boom         (hoofdstuk- en afdelingstitels)
 *   tekst          POST /api/v1/viewer/teksten
 * /api is de Pages Function in functions/api — die houdt de sleutel server-side.
 *
 * Eerlijkheid boven de mockup: een artikel zonder onderwerp heet "niet
 * ingedeeld", een Wro-plan heeft geen onderwerp-indeling en dat staat er ook.
 */
(function () {
  'use strict';

  var API = '/api';
  var PDOK = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1';
  var MAX_ART_OPEN_RENDER = 400;   // boven dit aantal artikelen starten hoofdstukken dichtgeklapt

  var staat = { loc: null, weergave: 'juridisch', volgnr: 0 };
  var analyses = {};   // bron_id -> Promise<analyse>
  var bomen = {};      // expr -> Promise<boom|null>
  var teksten = {};    // wid -> tekst-object

  // ── hulpjes ───────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'style') n.setAttribute('style', v);
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) {
      if (c == null || c === false) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  function leeg(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function nl(n) { return Number(n || 0).toLocaleString('nl-NL'); }
  function hoofdletter(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  var SVG_NS = 'http://www.w3.org/2000/svg';
  function icoon(d) {
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', '0 0 20 20'); s.setAttribute('class', 'icoon');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(SVG_NS, 'path'); p.setAttribute('d', d); s.appendChild(p);
    return s;
  }
  var PAD_NEER = 'M5 8l5 5 5-5';
  var PAD_RECHTS = 'M8 5l5 5-5 5';

  function haalJson(url, opties) {
    return fetch(url, opties).then(function (r) {
      if (!r.ok) {
        var e = new Error('Bron gaf ' + r.status);
        e.status = r.status;
        throw e;
      }
      return r.json();
    });
  }

  function api(pad, opties) { return haalJson(API + pad, opties); }

  function foutBlok(e, opnieuw) {
    return el('div', { class: 'fout', role: 'alert' }, [
      'Ophalen lukte niet (' + (e && e.message || 'onbekende fout') + '). ',
      opnieuw ? el('a', { href: '#', onclick: function (ev) { ev.preventDefault(); opnieuw(); } }, ['Opnieuw proberen']) : null
    ]);
  }

  function puntUitWkt(wkt) {
    var m = /POINT\s*\(\s*([\d.]+)\s+([\d.]+)\s*\)/.exec(wkt || '');
    return m ? [Math.round(+m[1]), Math.round(+m[2])] : null;
  }

  /** Natuurlijke sortering op artikelnummer: 22.9 vóór 22.10, 3a na 3. */
  function vergelijkNummer(a, b) {
    var pa = String(a || '').split(/[.\s]/), pb = String(b || '').split(/[.\s]/);
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var x = pa[i] || '', y = pb[i] || '';
      var nx = parseInt(x, 10), ny = parseInt(y, 10);
      if (!isNaN(nx) && !isNaN(ny) && nx !== ny) return nx - ny;
      if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
  }

  /** Artikel-wid bij een lid-wid: alles tot en met het __art_-segment. */
  function artikelWid(wid) {
    var m = /^(.*?__art_[^_]+)/.exec(wid || '');
    return m ? m[1] : wid;
  }

  // ── URL ───────────────────────────────────────────────
  function schrijfUrl(loc, vervang) {
    var q = new URLSearchParams();
    if (loc) {
      q.set('x', loc.x); q.set('y', loc.y);
      if (loc.label) q.set('locatie', loc.label);
    }
    var url = location.pathname + (loc ? '?' + q.toString() : '');
    if (vervang) history.replaceState(loc, '', url); else history.pushState(loc, '', url);
  }

  function leesUrl() {
    var q = new URLSearchParams(location.search);
    var x = parseFloat(q.get('x')), y = parseFloat(q.get('y'));
    if (!isFinite(x) || !isFinite(y)) return null;
    // Alleen punten binnen Nederland (RD-bereik) accepteren.
    if (x < -7000 || x > 300000 || y < 289000 || y > 629000) return null;
    return { x: Math.round(x), y: Math.round(y), label: q.get('locatie') || '' };
  }

  // ── Zoeken (PDOK Locatieserver) ───────────────────────
  var zoek = { timer: null, items: [], actief: -1, volgnr: 0 };

  function initZoeken() {
    var input = $('zoekinput');
    input.addEventListener('input', function () {
      clearTimeout(zoek.timer);
      var q = input.value.trim();
      if (q.length < 2) { sluitSuggesties(); return; }
      zoek.timer = setTimeout(function () { suggereer(q); }, 180);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); markeer(zoek.actief + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); markeer(zoek.actief - 1); }
      else if (e.key === 'Escape') { sluitSuggesties(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (zoek.items.length) kies(zoek.items[Math.max(zoek.actief, 0)]);
        else if (input.value.trim().length >= 2) suggereer(input.value.trim(), true);
      }
    });
    input.addEventListener('blur', function () { setTimeout(sluitSuggesties, 150); });
    $('wijzig-locatie').addEventListener('click', function () {
      $('lijst').scrollTop = 0;
      input.focus(); input.select();
    });
  }

  function suggereer(q, kiesEerste) {
    var nr = ++zoek.volgnr;
    var url = PDOK + '/suggest?rows=8&fq=' + encodeURIComponent('type:(adres OR perceel)') + '&q=' + encodeURIComponent(q);
    haalJson(url).then(function (d) {
      if (nr !== zoek.volgnr) return;
      zoek.items = (d.response && d.response.docs) || [];
      zoek.actief = -1;
      if (kiesEerste && zoek.items.length) { kies(zoek.items[0]); return; }
      toonSuggesties();
    }).catch(function () {
      if (nr !== zoek.volgnr) return;
      zoek.items = [];
      toonSuggesties('Adressen zoeken lukt nu niet. Klik op de kaart om een locatie te kiezen.');
    });
  }

  function toonSuggesties(melding) {
    var ul = $('suggesties');
    leeg(ul);
    if (!zoek.items.length) {
      ul.appendChild(el('li', { class: 'sug-leeg', role: 'option', 'aria-disabled': 'true' },
        [melding || 'Geen adres of perceel gevonden.']));
    }
    zoek.items.forEach(function (item, i) {
      ul.appendChild(el('li', {
        role: 'option', id: 'sug-' + i, 'aria-selected': 'false',
        onmousedown: function (e) { e.preventDefault(); kies(item); }
      }, [
        el('span', { class: 'tag', text: item.type }),
        el('span', { text: item.weergavenaam })
      ]));
    });
    ul.hidden = false;
    ul.parentNode.querySelector('[role=combobox]').setAttribute('aria-expanded', 'true');
  }

  function markeer(i) {
    if (!zoek.items.length) return;
    zoek.actief = (i + zoek.items.length) % zoek.items.length;
    Array.prototype.forEach.call($('suggesties').children, function (li, j) {
      li.setAttribute('aria-selected', j === zoek.actief ? 'true' : 'false');
    });
    $('zoekinput').setAttribute('aria-activedescendant', 'sug-' + zoek.actief);
  }

  function sluitSuggesties() {
    var ul = $('suggesties');
    ul.hidden = true;
    zoek.actief = -1;
    $('zoekinput').removeAttribute('aria-activedescendant');
    var cb = ul.parentNode.querySelector('[role=combobox]');
    if (cb) cb.setAttribute('aria-expanded', 'false');
  }

  function kies(item) {
    sluitSuggesties();
    var url = PDOK + '/lookup?fl=' + encodeURIComponent('weergavenaam,centroide_rd,type,geometrie_rd') + '&id=' + encodeURIComponent(item.id);
    haalJson(url).then(function (d) {
      var doc = d.response && d.response.docs && d.response.docs[0];
      var p = doc && puntUitWkt(doc.centroide_rd);
      if (!p) throw new Error('geen coördinaat');
      $('zoekinput').value = '';
      kiesLocatie({ x: p[0], y: p[1], label: doc.weergavenaam, perceel: doc.type === 'perceel' ? doc.geometrie_rd : null });
    }).catch(function (e) {
      toonSuggesties('Deze locatie kon niet worden opgehaald (' + e.message + ').');
    });
  }

  /** Adres bij een punt (max. 25 m), anders een neutrale omschrijving. */
  function adresBij(x, y) {
    var url = PDOK + '/reverse?type=adres&rows=1&distance=25&fl=' + encodeURIComponent('weergavenaam,afstand') + '&X=' + x + '&Y=' + y;
    return haalJson(url).then(function (d) {
      var doc = d.response && d.response.docs && d.response.docs[0];
      return doc ? doc.weergavenaam : null;
    }).catch(function () { return null; });
  }

  function perceelBij(x, y) {
    var url = PDOK + '/reverse?type=perceel&rows=1&fl=' + encodeURIComponent('weergavenaam,geometrie_rd') + '&X=' + x + '&Y=' + y;
    return haalJson(url).then(function (d) {
      return (d.response && d.response.docs && d.response.docs[0]) || null;
    }).catch(function () { return null; });
  }

  // ── Locatie kiezen ────────────────────────────────────
  function kiesLocatie(loc, opties) {
    opties = opties || {};
    staat.loc = loc;
    var nr = ++staat.volgnr;
    document.body.classList.add('heeft-locatie');
    $('context').hidden = false;
    $('context-locatie').textContent = loc.label || ('RD ' + loc.x + ', ' + loc.y);
    $('context-telling').textContent = '';
    if (!opties.uitUrl) schrijfUrl({ x: loc.x, y: loc.y, label: loc.label }, !!opties.vervang);
    document.title = (loc.label ? loc.label + ' · ' : '') + 'Regels op maat · prototype';

    RomKaart.toonLocatie(loc.x, loc.y);
    var legenda = $('kaart-legenda');
    legenda.hidden = false;
    $('legenda-perceel').textContent = 'Perceel';

    // Perceel: van de lookup als de gebruiker een perceel koos, anders het perceel onder het punt.
    (loc.perceel ? Promise.resolve({ geometrie_rd: loc.perceel, weergavenaam: loc.label }) : perceelBij(loc.x, loc.y))
      .then(function (p) {
        if (nr !== staat.volgnr) return;
        var gelukt = p && RomKaart.toonPerceel(p.geometrie_rd);
        $('legenda-perceel').textContent = gelukt ? (p.weergavenaam || 'Perceel') : 'Geen perceel op dit punt';
      });

    if (!loc.label) {
      adresBij(loc.x, loc.y).then(function (adres) {
        if (nr !== staat.volgnr) return;
        loc.label = adres || '';
        $('context-locatie').textContent = adres || ('Punt op de kaart (RD ' + loc.x + ', ' + loc.y + ')');
        if (adres) schrijfUrl({ x: loc.x, y: loc.y, label: adres }, true);
      });
    }

    laadDocumenten(nr);
  }

  // ── Documenten op de locatie ──────────────────────────
  var GROEPEN = [
    { id: 'lokaal', titel: 'Regels van gemeente, provincie en waterschap',
      uitleg: 'Regels die op dit punt gelden volgens het omgevingsplan en de verordeningen.' },
    { id: 'wro', titel: 'Bestemmingsplannen onder het overgangsrecht',
      uitleg: 'Wro-plannen die hier nog gelden, naast het omgevingsplan.' },
    { id: 'beleid', titel: 'Beleid voor dit gebied',
      uitleg: 'Omgevingsvisies en programma’s. Die binden de overheid die ze vaststelde, niet u rechtstreeks.' },
    { id: 'rijk', titel: 'Landelijke regels',
      uitleg: 'Rijksregels met activiteiten die hier kunnen plaatsvinden. Omvangrijk; klap open om te bladeren.' }
  ];

  function groepVan(doc) {
    if (doc.bron_type === 'wro') return 'wro';
    if (doc.via === 'gebied') return 'beleid';
    if (doc.bestuurslaag === 'rijk') return 'rijk';
    return 'lokaal';
  }

  function laadDocumenten(nr) {
    var doel = $('resultaat');
    leeg(doel);
    doel.appendChild(el('p', { class: 'laden', text: 'Documenten op deze locatie ophalen…' }));
    var loc = staat.loc;
    api('/v1/viewer/regelmix?x=' + loc.x + '&y=' + loc.y).then(function (d) {
      if (nr !== staat.volgnr) return;
      toonDocumenten(d.documenten || [], nr);
    }).catch(function (e) {
      if (nr !== staat.volgnr) return;
      leeg(doel);
      doel.appendChild(foutBlok(e, function () { laadDocumenten(nr); }));
    });
  }

  // ── Voorbeschermingsregels bij hun document ──────────
  // Voorbeschermingsregels (uit een voorbereidingsbesluit) gelden nu al, maar
  // zijn geen zelfstandig document: ze vullen het omgevingsplan of de
  // omgevingsverordening aan. Het DSO toont ze daarom bij dat document, en RoM
  // ook (gebruikersbesluit 2026-09-16). Dat geldt ongeacht wie ze vaststelde:
  // voorbeschermingsregels van provincie of Rijk horen bij het omgevingsplan.
  function isVoorbescherming(d) {
    return d.bron_type === 'ow' && /^voorbeschermingsregels/i.test(d.documenttype || '');
  }

  /** Welk documenttype vult dit aan? Het documenttype zegt het meestal zelf;
   *  bij kaal "Voorbeschermingsregels" beslissen de titel en dan de bestuurslaag.
   *  ⚠️ Die laatste stap is een aanname: een provinciaal voorbereidingsbesluit
   *  kan ook voor een omgevingsplan zijn. Daarom staat de vaststeller erbij. */
  function ouderType(d) {
    var t = (d.documenttype || '').toLowerCase();
    if (t.indexOf('omgevingsverordening') >= 0) return 'Omgevingsverordening';
    if (t.indexOf('omgevingsplan') >= 0) return 'Omgevingsplan';
    if (/omgevingsverordening/i.test(d.regeling || '')) return 'Omgevingsverordening';
    if (/omgevingsplan/i.test(d.regeling || '')) return 'Omgevingsplan';
    return d.bestuurslaag === 'provincie' ? 'Omgevingsverordening' : 'Omgevingsplan';
  }

  function bronhouderVan(d) { return String(d.bron_id || '').split('/')[4] || ''; }

  /** Hangt voorbeschermingsregels onder hun document; geeft de hoofdlijst terug. */
  function koppelAanvullend(docs) {
    var hoofd = [], los = [];
    docs.forEach(function (d) { (isVoorbescherming(d) ? los : hoofd).push(d); });
    los.forEach(function (v) {
      var type = ouderType(v);
      var kandidaten = hoofd.filter(function (d) { return d.bron_type === 'ow' && d.documenttype === type; });
      var ouder = kandidaten.filter(function (d) { return bronhouderVan(d) === bronhouderVan(v); })[0] || kandidaten[0];
      if (ouder) (ouder.aanvullend = ouder.aanvullend || []).push(v);
      else hoofd.push(v);   // geen document om bij te hangen: los tonen, niet weglaten
    });
    return hoofd;
  }

  function toonDocumenten(alleDocs, nr) {
    var doel = $('resultaat');
    leeg(doel);
    var docs = koppelAanvullend(alleDocs);
    $('context-telling').textContent = docs.length === 1 ? '1 document' : nl(docs.length) + ' documenten';

    if (!docs.length) {
      doel.appendChild(el('p', { class: 'leeg-melding', text:
        'Op dit punt vonden we geen omgevingsdocumenten. Ligt het punt in zee of buiten Nederland? Anders ontbreekt hier data in het register.' }));
      return;
    }

    doel.appendChild(el('div', { class: 'res-kop' }, [el('h1', { text: 'Gevonden op deze locatie' })]));

    GROEPEN.forEach(function (g) {
      var inGroep = docs.filter(function (d) { return groepVan(d) === g.id; });
      if (!inGroep.length) return;
      var sectie = el('section', { class: 'groep', 'aria-labelledby': 'groep-' + g.id }, [
        el('h2', { class: 'label', id: 'groep-' + g.id, text: g.titel }),
        el('p', { class: 'groep-uitleg', text: g.uitleg })
      ]);
      inGroep.forEach(function (d) { sectie.appendChild(documentKaart(d, g.id, nr)); });
      doel.appendChild(sectie);
    });
  }

  function documentKaart(doc, groep, nr) {
    var isWro = doc.bron_type === 'wro';
    var chips = el('div', { class: 'chips doc-chips' });
    var chevron = icoon(PAD_NEER); chevron.classList.add('doc-chevron');
    var body = el('div', { class: 'doc-body', hidden: true });
    var eenheid = doc.via === 'gebied' ? 'tekstdelen' : 'regels';

    var kop = el('button', { type: 'button', class: 'doc-kop', 'aria-expanded': 'false' }, [
      el('span', { class: 'doc-titelrij' }, [el('span', { class: 'doc-titel', text: doc.regeling || '(zonder titel)' }), chevron]),
      el('span', { class: 'doc-meta' }, [
        el('span', { class: 'tag' + (isWro ? '' : ' tag-ow'), text: isWro ? 'Wro' : 'Ow' }),
        el('span', { text: hoofdletter(doc.documenttype || '') + ' · ' + hoofdletter(doc.bestuurslaag || '') }),
        el('span', { class: 'mono', text: nl(doc.aantal) + ' ' + eenheid }),
        doc.aanvullend ? el('span', { class: 'tag tag-aanvullend', text:
          '+ ' + (doc.aanvullend.length === 1 ? 'aanvullende regels' : doc.aanvullend.length + '× aanvullende regels') }) : null
      ]),
      chips
    ]);
    var kaart = el('article', { class: 'doc blad' }, [kop, body]);
    var geopend = false;

    kop.addEventListener('click', function () {
      var open = kop.getAttribute('aria-expanded') !== 'true';
      kop.setAttribute('aria-expanded', open ? 'true' : 'false');
      kaart.classList.toggle('open', open);
      body.hidden = !open;
      if (open && !geopend) { geopend = true; vulDocument(doc, groep, body, nr); }
    });

    // Chips vooraf alleen voor de lokale Ow-documenten: klein genoeg, en daar
    // gaat de vraag van de bezoeker meestal over. Landelijke regels pas bij openklappen.
    if (!isWro && groep === 'lokaal') {
      chips.appendChild(el('span', { class: 'muted', style: 'font-size:12px', text: 'onderwerpen ophalen…' }));
      Promise.all(delenVan(doc).map(analyseer)).then(function (lijst) {
        if (nr !== staat.volgnr) return;
        leeg(chips);
        kopChips(voegSamen(lijst)).forEach(function (c) { chips.appendChild(c); });
      }).catch(function () { leeg(chips); });
    } else if (isWro) {
      chips.appendChild(el('span', { class: 'muted', style: 'font-size:12px', text: 'Wro-plannen zijn niet op onderwerp ingedeeld' }));
    }
    return kaart;
  }

  // ── Analyse: artikelen + onderwerpen van één document op het punt ──
  function analyseer(doc) {
    var sleutel = staat.loc.x + ',' + staat.loc.y + '|' + doc.bron_id;
    if (analyses[sleutel]) return analyses[sleutel];
    var loc = staat.loc;
    var q = '?x=' + loc.x + '&y=' + loc.y + '&bron=' + encodeURIComponent(doc.bron_id) + '&bron_type=' + doc.bron_type;
    var rijen = api('/v1/viewer/regelmix/document' + q);
    var onderwerpen = doc.bron_type === 'ow'
      ? api('/v1/viewer/regeling/' + encodeURIComponent(doc.bron_id) + '/onderwerpen').catch(function () { return null; })
      : Promise.resolve(null);
    analyses[sleutel] = Promise.all([rijen, onderwerpen]).then(function (r) {
      return bouwAnalyse(doc, (r[0] && r[0].regelmix) || [], r[1]);
    });
    analyses[sleutel].catch(function () { delete analyses[sleutel]; });
    return analyses[sleutel];
  }

  function bouwAnalyse(doc, rijen, ond) {
    // wid -> {categorie, sub}
    var indeling = {}, heeftIndeling = !!(ond && ond.categorieen);
    if (heeftIndeling) {
      ond.categorieen.forEach(function (c) {
        c.wids.forEach(function (w) { indeling[w] = { categorie: c.naam, sub: null }; });
        (c.sub || []).forEach(function (s) {
          s.wids.forEach(function (w) { if (indeling[w]) indeling[w].sub = s.naam; });
        });
      });
    }

    var artikelen = [], perSleutel = {};
    rijen.forEach(function (r, i) {
      var sleutel, artWid = null;
      if (doc.bron_type === 'wro') {
        sleutel = 'wro-' + i;
      } else {
        artWid = artikelWid(r.wid);
        sleutel = artWid;
      }
      var a = perSleutel[sleutel];
      if (!a) {
        a = perSleutel[sleutel] = {
          sleutel: sleutel, wid: artWid,
          nummer: r.artikel_nummer || '',
          opschrift: r.artikel_opschrift || r.artikel || '',
          hoofdstuk: r.hoofdstuk_nummer || '',
          leden: [], inhoud: r.inhoud || null,
          categorie: null, sub: null
        };
        if (artWid && indeling[artWid]) { a.categorie = indeling[artWid].categorie; a.sub = indeling[artWid].sub; }
        artikelen.push(a);
      }
      if (r.wid && r.wid !== artWid) a.leden.push({ nummer: r.lid_nummer || '', wid: r.wid });
      else if (r.wid) a.eigenTekst = true;
    });
    artikelen.forEach(function (a) {
      a.leden.sort(function (x, y) { return vergelijkNummer(x.nummer, y.nummer); });
    });
    if (doc.bron_type === 'ow') {
      artikelen.sort(function (x, y) {
        return vergelijkNummer(x.hoofdstuk, y.hoofdstuk) || vergelijkNummer(x.nummer, y.nummer) || (x.wid < y.wid ? -1 : 1);
      });
    }

    var tellingen = {}, nietIngedeeld = 0;
    artikelen.forEach(function (a) {
      if (a.categorie) tellingen[a.categorie] = (tellingen[a.categorie] || 0) + 1;
      else nietIngedeeld++;
    });
    var categorieen = Object.keys(tellingen).sort(function (a, b) { return tellingen[b] - tellingen[a]; })
      .map(function (c) { return { naam: c, aantal: tellingen[c] }; });

    return {
      doc: doc, artikelen: artikelen, categorieen: categorieen,
      nietIngedeeld: nietIngedeeld, heeftIndeling: heeftIndeling && categorieen.length > 0
    };
  }

  function chipInhoud(naam, aantal, categorie) {
    return [
      el('i', { style: 'background:' + RomThema.kleur(categorie) }),
      naam + ' ',
      el('b', { text: nl(aantal) })
    ];
  }

  /** Aanvullende regels eerst, zoals in het DSO en de mockup; dan de hoofdregeling. */
  function delenVan(doc) { return (doc.aanvullend || []).concat([doc]); }

  /** Tellingen van meerdere analyses (hoofdregeling + aanvullende regels) samen. */
  function voegSamen(lijst) {
    var tel = {}, niet = 0, totaal = 0, indeling = false;
    lijst.forEach(function (a) {
      totaal += a.artikelen.length;
      niet += a.nietIngedeeld;
      if (a.heeftIndeling) indeling = true;
      a.categorieen.forEach(function (c) { tel[c.naam] = (tel[c.naam] || 0) + c.aantal; });
    });
    return {
      totaal: totaal, nietIngedeeld: niet, heeftIndeling: indeling,
      categorieen: Object.keys(tel).sort(function (a, b) { return tel[b] - tel[a]; })
        .map(function (c) { return { naam: c, aantal: tel[c] }; })
    };
  }

  function kopChips(a) {
    if (!a.heeftIndeling) {
      return [el('span', { class: 'muted', style: 'font-size:12px', text: 'Nog niet op onderwerp ingedeeld' })];
    }
    var MAX = 5, uit = [];
    a.categorieen.slice(0, MAX).forEach(function (c) {
      uit.push(el('span', { class: 'chip' }, chipInhoud(RomThema.naam(c.naam), c.aantal, c.naam)));
    });
    if (a.categorieen.length > MAX) {
      uit.push(el('span', { class: 'chip chip-leeg', text: '+' + (a.categorieen.length - MAX) + ' onderwerpen' }));
    }
    return uit;
  }

  // ── Document openklappen ──────────────────────────────
  function vulDocument(doc, groep, body, nr) {
    leeg(body);
    body.appendChild(el('p', { class: 'laden', text: 'Artikelen ophalen…' }));
    var delen = delenVan(doc).map(function (d) {
      // Structuur (titels) niet voor de grote landelijke regelingen: die boom is megabytes.
      var groot = d === doc && groep === 'rijk';
      var structuur = (d.bron_type === 'ow' && !groot) ? haalBoom(d.bron_id) : Promise.resolve(null);
      return Promise.all([analyseer(d), structuur]).then(function (r) { return { a: r[0], boom: r[1] }; });
    });
    Promise.all(delen).then(function (r) {
      if (nr !== staat.volgnr) return;
      leeg(body);
      toonArtikelen(r, body);
    }).catch(function (e) {
      if (nr !== staat.volgnr) return;
      leeg(body);
      body.appendChild(foutBlok(e, function () { vulDocument(doc, groep, body, nr); }));
    });
  }

  function haalBoom(expr) {
    if (!bomen[expr]) {
      bomen[expr] = api('/v1/viewer/regeling/' + encodeURIComponent(expr) + '/boom')
        .then(function (d) { return d.boom || null; })
        .catch(function () { return null; });
    }
    return bomen[expr];
  }

  /** delen: [{a, boom}] — aanvullende regels eerst, hoofdregeling als laatste. */
  function toonArtikelen(delen, body) {
    var a = voegSamen(delen.map(function (d) { return d.a; }));
    if (!a.totaal) {
      body.appendChild(el('p', { class: 'leeg-melding', text: 'Geen artikelen gevonden voor dit punt.' }));
      return;
    }

    var actief = {};   // categorie-naam (of '' voor niet ingedeeld) -> true
    var artEls = [];   // [{art, el}]

    if (a.heeftIndeling) {
      var rij = el('div', { class: 'chips', role: 'group', 'aria-label': 'Filter op onderwerp' });
      var knoppen = a.categorieen.map(function (c) {
        return el('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', 'data-cat': c.naam },
          chipInhoud(RomThema.naam(c.naam), c.aantal, c.naam));
      });
      if (a.nietIngedeeld) {
        knoppen.push(el('button', { type: 'button', class: 'chip chip-leeg', 'aria-pressed': 'false', 'data-cat': '',
          title: 'Artikelen waar het register (nog) geen onderwerp voor heeft' },
          ['Niet ingedeeld ', el('b', { text: nl(a.nietIngedeeld) })]));
      }
      knoppen.forEach(function (k) {
        k.addEventListener('click', function () {
          var cat = k.getAttribute('data-cat');
          var aan = k.getAttribute('aria-pressed') !== 'true';
          k.setAttribute('aria-pressed', aan ? 'true' : 'false');
          if (aan) actief[cat] = true; else delete actief[cat];
          pasFilterToe();
        });
        rij.appendChild(k);
      });
      var ingedeeld = a.totaal - a.nietIngedeeld;
      body.appendChild(el('div', { class: 'filter' }, [
        rij,
        el('span', { class: 'filter-uitleg', text:
          'Onderwerpindeling van het register · ' + nl(ingedeeld) + ' van ' + nl(a.totaal) + ' artikelen ingedeeld' })
      ]));
    }

    var lijst = el('div', { class: 'artikelen' });
    body.appendChild(lijst);
    var meerDelen = delen.length > 1;

    delen.forEach(function (deel, i) {
      var d = deel.a.doc, hoofd = i === delen.length - 1;
      var doel = lijst;
      if (meerDelen) {
        var register = 'https://omgevingsdocumentenregister.nl/document/' + String(d.bron_id).replace(/^\//, '');
        doel = el('div', { class: 'deel' + (hoofd ? '' : ' deel-aanvullend') });
        doel.appendChild(el('div', { class: 'deel-kop' }, [
          el('span', { class: 'label', text: hoofd ? 'Hoofdregeling' : 'Aanvullende regels · voorbescherming' }),
          el('a', { class: 'deel-titel', href: register, text: d.regeling }),
          hoofd ? null : el('span', { class: 'deel-uitleg', text:
            'Tijdelijke regels uit een voorbereidingsbesluit' +
            (d.bestuurslaag ? ' van ' + (d.bestuurslaag === 'rijk' ? 'het Rijk' : 'de ' + d.bestuurslaag) : '') +
            '. Ze gelden nu al, naast de hoofdregeling.' })
        ]));
        lijst.appendChild(doel);
      }
      if (!deel.a.artikelen.length) {
        doel.appendChild(el('p', { class: 'leeg-melding', text: 'Geen artikelen gevonden voor dit punt.' }));
        return;
      }
      var dichtklappen = deel.a.artikelen.length > MAX_ART_OPEN_RENDER;
      var boomGebruikt = deel.boom && vulViaBoom(deel.a, deel.boom, doel, artEls, dichtklappen);
      if (!boomGebruikt) vulPerHoofdstuk(deel.a, doel, artEls, dichtklappen);
    });

    var hoofdDoc = delen[delen.length - 1].a.doc;
    if (hoofdDoc.bron_type === 'ow') {
      var link = 'https://omgevingsdocumentenregister.nl/document/' + String(hoofdDoc.bron_id).replace(/^\//, '');
      body.appendChild(el('a', { class: 'art-voet', href: link }, ['Het hele document in het register']));
    }

    function pasFilterToe() {
      var filterAan = Object.keys(actief).length > 0;
      artEls.forEach(function (x) {
        var cat = x.art.categorie || '';
        x.el.hidden = filterAan && !actief[cat];
      });
      // Secties zonder zichtbaar artikel verbergen.
      Array.prototype.slice.call(lijst.querySelectorAll('.sectie, .deel')).reverse().forEach(function (s) {
        s.hidden = filterAan && !s.querySelector('.art:not([hidden])');
      });
    }
  }

  /** Volg de documentstructuur; geeft false als de boom niet bij de rijen past. */
  function vulViaBoom(a, boom, lijst, artEls, dichtklappen) {
    var perWid = {};
    a.artikelen.forEach(function (art) { if (art.wid) perWid[art.wid] = art; });
    var geplaatst = {};
    var CONTAINERS = { Hoofdstuk: 1, Titel: 1, Afdeling: 1, Paragraaf: 1, Subparagraaf: 1, Subsubparagraaf: 1, Deel: 1, Boek: 1, Divisie: 1 };

    function loop(knoop, diepte) {
      if (perWid[knoop.wid]) {
        var art = perWid[knoop.wid];
        geplaatst[knoop.wid] = true;
        var e = artikelElement(art, a.doc);
        artEls.push({ art: art, el: e });
        return [e];
      }
      var kinderen = [];
      (knoop.kinderen || []).forEach(function (k) { kinderen = kinderen.concat(loop(k, diepte + 1)); });
      if (!kinderen.length) return [];
      if (!CONTAINERS[knoop.type] || (!knoop.nummer && !knoop.opschrift)) return kinderen;
      return [sectieElement(knoop.type, knoop.nummer, knoop.opschrift, kinderen, diepte, dichtklappen)];
    }

    var gevonden = [];
    boom.forEach(function (k) { gevonden = gevonden.concat(loop(k, 0)); });
    var nietGeplaatst = a.artikelen.filter(function (art) { return !geplaatst[art.wid]; });
    if (!gevonden.length) return false;
    gevonden.forEach(function (e) { lijst.appendChild(e); });
    if (nietGeplaatst.length) {
      var rest = nietGeplaatst.map(function (art) {
        var e = artikelElement(art, a.doc);
        artEls.push({ art: art, el: e });
        return e;
      });
      lijst.appendChild(sectieElement('Overig', '', 'Niet terug te vinden in de documentstructuur', rest, 0, false));
    }
    return true;
  }

  function vulPerHoofdstuk(a, lijst, artEls, dichtklappen) {
    var perHfd = {}, volgorde = [];
    a.artikelen.forEach(function (art) {
      var h = art.hoofdstuk || '';
      if (!perHfd[h]) { perHfd[h] = []; volgorde.push(h); }
      var e = artikelElement(art, a.doc);
      artEls.push({ art: art, el: e });
      perHfd[h].push(e);
    });
    volgorde.forEach(function (h) {
      if (!h) perHfd[h].forEach(function (e) { lijst.appendChild(e); });
      else lijst.appendChild(sectieElement('Hoofdstuk', h, '', perHfd[h], 0, dichtklappen));
    });
  }

  function sectieElement(type, nummer, opschrift, kinderen, diepte, dicht) {
    var kopTekst = [el('span', { class: 'label', text: type + (nummer ? ' ' + nummer : '') })];
    if (opschrift) kopTekst.push(el('span', { class: 'sectie-titel', text: ' ' + opschrift }));
    if (dicht && diepte === 0) {
      var det = el('details', { class: 'sectie' }, [el('summary', { class: 'sectie-kop' }, kopTekst)]);
      kinderen.forEach(function (k) { det.appendChild(k); });
      return det;
    }
    var s = el('div', { class: 'sectie', role: 'group' }, [el('div', { class: 'sectie-kop' }, kopTekst)]);
    kinderen.forEach(function (k) { s.appendChild(k); });
    return s;
  }

  function artikelElement(art, doc) {
    var inhoud = el('div', { class: 'art-inhoud', hidden: true });
    var dot = el('span', { class: 'art-dot', 'aria-hidden': 'true' });
    if (art.categorie) { dot.style.background = RomThema.kleur(art.categorie); dot.style.border = '0'; }
    var pijl = icoon(PAD_RECHTS); pijl.classList.add('art-pijl');

    var titel = el('span', { class: 'art-titel' });
    if (art.nummer && doc.bron_type === 'ow') titel.appendChild(el('span', { class: 'art-nr', text: 'Artikel ' + art.nummer + ' ' }));
    titel.appendChild(document.createTextNode(art.opschrift || (art.nummer ? '' : 'Tekstdeel')));

    var kop = el('button', { type: 'button', class: 'art-kop', 'aria-expanded': 'false' }, [
      pijl, dot, titel,
      art.categorie ? el('span', { class: 'art-onderwerp', text: art.sub || art.categorie }) : null
    ]);
    var wrap = el('div', { class: 'art' }, [kop, inhoud]);
    var geladen = false;

    kop.addEventListener('click', function () {
      var open = kop.getAttribute('aria-expanded') !== 'true';
      kop.setAttribute('aria-expanded', open ? 'true' : 'false');
      wrap.classList.toggle('open', open);
      inhoud.hidden = !open;
      if (open && !geladen) { geladen = true; vulArtikel(art, inhoud); }
    });
    return wrap;
  }

  function vulArtikel(art, doel) {
    if (art.inhoud != null && !art.wid) {
      // Wro: platte tekst zit al in de rij.
      var blok = el('div', { class: 'platte-tekst' });
      String(art.inhoud).split(/\n+/).forEach(function (p) { if (p.trim()) blok.appendChild(el('p', { text: p.trim() })); });
      doel.appendChild(el('div', { class: 'lid' }, [el('span', { class: 'lid-nr' }), blok]));
      return;
    }
    var delen = art.leden.length ? art.leden.slice() : [];
    if (art.eigenTekst || !delen.length) delen.unshift({ nummer: '', wid: art.wid });
    var wids = delen.map(function (d) { return d.wid; }).filter(function (w) { return !teksten[w]; });

    var laden = el('p', { class: 'laden', text: 'Tekst ophalen…' });
    doel.appendChild(laden);
    (wids.length
      ? api('/v1/viewer/teksten', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wids: wids }) })
          .then(function (d) { (d.teksten || []).forEach(function (t) { teksten[t.wid] = t; }); })
      : Promise.resolve()
    ).then(function () {
      doel.removeChild(laden);
      var getoond = 0;
      delen.forEach(function (d) {
        var t = teksten[d.wid];
        if (!t || !t.tekst) return;
        var rt = document.createElement('ocd-regeltekst');
        rt.setAttribute('weergave', staat.weergave);
        rt.tekst = t.tekst;
        if (t.begrijpelijk) rt.begrijpelijk = t.begrijpelijk;
        doel.appendChild(el('div', { class: 'lid' }, [el('span', { class: 'lid-nr', text: d.nummer ? d.nummer + '.' : '' }), rt]));
        getoond++;
      });
      if (!getoond) doel.appendChild(el('p', { class: 'leeg-melding', text: 'Voor dit artikel is geen tekst beschikbaar in het register.' }));
    }).catch(function (e) {
      if (laden.parentNode) doel.removeChild(laden);
      doel.appendChild(foutBlok(e));
    });
  }

  // ── Weergave juridisch / begrijpelijk ─────────────────
  function initWeergave() {
    Array.prototype.forEach.call(document.querySelectorAll('.weergave-knop'), function (k) {
      k.addEventListener('click', function () {
        staat.weergave = k.getAttribute('data-weergave');
        Array.prototype.forEach.call(document.querySelectorAll('.weergave-knop'), function (b) {
          b.setAttribute('aria-pressed', b === k ? 'true' : 'false');
        });
        Array.prototype.forEach.call(document.querySelectorAll('ocd-regeltekst'), function (rt) {
          rt.setAttribute('weergave', staat.weergave);
        });
      });
    });
  }

  // ── Start ─────────────────────────────────────────────
  function start() {
    RomKaart.init('kaart', {
      opKlik: function (x, y) { kiesLocatie({ x: x, y: y, label: '' }); }
    });
    initZoeken();
    initWeergave();

    var uitUrl = leesUrl();
    if (uitUrl) kiesLocatie(uitUrl, { uitUrl: true });

    window.addEventListener('popstate', function () {
      var loc = leesUrl();
      if (loc) kiesLocatie(loc, { uitUrl: true });
      else location.reload();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
