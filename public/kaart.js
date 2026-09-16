/* Kaart — OpenLayers in RD (EPSG:28992), zonder herprojectie.
 *
 * Alles wat op deze kaart komt is al RD: de PDOK-achtergrondkaart (WMTS in
 * het Nederlandse tilingschema), de percelen uit de Locatieserver en straks de
 * OCD-geometrie. Daarom geen proj4 en geen Web Mercator: één projectie,
 * gedefinieerd door zijn extent, en een tilegrid dat 1-op-1 de PDOK
 * TileMatrixSet volgt. Waarom OpenLayers en niet Leaflet/MapLibre: zie
 * docs/REALISATIEPLAN.md fase 2 (RD en MVT native).
 */
(function (global) {
  'use strict';

  var RD = new ol.proj.Projection({
    code: 'EPSG:28992',
    units: 'm',
    extent: [-285401.92, 22598.08, 595401.92, 903401.92]
  });

  /* PDOK TileMatrixSet EPSG:28992: oorsprong linksboven, 256px-tegels,
     resolutie(z) = 3440,64 / 2^z m/px. Zelfde getallen als gio.js van het register. */
  var RESOLUTIES = [];
  for (var z = 0; z <= 14; z++) RESOLUTIES.push(3440.64 / Math.pow(2, z));

  var TEGELS = 'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/grijs/EPSG:28992/{z}/{x}/{y}.png';

  var map, bron, locatie = null;

  function cssKleur(naam, alfa) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(naam).trim() || '#4256b8';
    if (alfa == null) return v;
    // oklch(50% 0.16 262) -> oklch(50% 0.16 262 / 0.14)
    return v.indexOf('oklch(') === 0 ? v.replace(/\)\s*$/, ' / ' + alfa + ')') : v;
  }

  function stijl(feature) {
    if (feature.get('soort') === 'punt') {
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: 6,
          fill: new ol.style.Fill({ color: cssKleur('--acc') }),
          stroke: new ol.style.Stroke({ color: cssKleur('--blad'), width: 3 })
        }),
        zIndex: 2
      });
    }
    return new ol.style.Style({
      fill: new ol.style.Fill({ color: cssKleur('--acc', 0.12) }),
      stroke: new ol.style.Stroke({ color: cssKleur('--acc'), width: 2.5 }),
      zIndex: 1
    });
  }

  function init(doel, opties) {
    bron = new ol.source.Vector();
    map = new ol.Map({
      target: doel,
      controls: [],
      layers: [
        new ol.layer.Tile({
          className: 'onderkaart',
          source: new ol.source.XYZ({
            url: TEGELS,
            projection: RD,
            tileGrid: new ol.tilegrid.TileGrid({
              origin: [-285401.92, 903401.92],
              resolutions: RESOLUTIES,
              extent: RD.getExtent(),
              tileSize: 256
            })
          })
        }),
        new ol.layer.Vector({ className: 'overlay', source: bron, style: stijl })
      ],
      view: new ol.View({
        projection: RD,
        center: [155000, 463000],
        resolutions: RESOLUTIES,
        zoom: 3,
        constrainResolution: true,
        extent: [-50000, 250000, 350000, 700000]
      })
    });

    map.on('singleclick', function (e) {
      if (opties && opties.opKlik) opties.opKlik(Math.round(e.coordinate[0]), Math.round(e.coordinate[1]));
    });

    knop('kk-in', function () { zoom(1); });
    knop('kk-uit', function () { zoom(-1); });
    knop('kk-locatie', naarLocatie);

    // Thema-wissel (licht/donker) verandert de CSS-kleuren; laat de laag opnieuw tekenen.
    if (global.matchMedia) {
      var mq = global.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', function () { bron.changed(); });
    }
  }

  function knop(id, fn) {
    var b = document.getElementById(id);
    if (b) b.addEventListener('click', fn);
  }

  function zoom(stap) {
    var v = map.getView();
    v.animate({ zoom: v.getZoom() + stap, duration: 180 });
  }

  function naarLocatie() {
    if (!locatie) return;
    var perceel = bron.getFeatures().filter(function (f) { return f.get('soort') === 'perceel'; })[0];
    if (perceel) {
      map.getView().fit(perceel.getGeometry().getExtent(), { padding: [80, 80, 80, 80], maxZoom: 13, duration: 250 });
    } else {
      map.getView().animate({ center: locatie, zoom: 12, duration: 250 });
    }
  }

  /** Zet het gekozen punt; wist een eerder perceel. */
  function toonLocatie(x, y) {
    locatie = [x, y];
    bron.clear();
    var punt = new ol.Feature(new ol.geom.Point(locatie));
    punt.set('soort', 'punt');
    bron.addFeature(punt);
    var b = document.getElementById('kk-locatie');
    if (b) b.disabled = false;
    var v = map.getView();
    if (v.getZoom() < 11) v.animate({ center: locatie, zoom: 12, duration: 300 });
    else v.animate({ center: locatie, duration: 250 });
  }

  /** Perceelgrens als WKT in RD (zoals de Locatieserver hem levert). */
  function toonPerceel(wkt) {
    bron.getFeatures().forEach(function (f) { if (f.get('soort') === 'perceel') bron.removeFeature(f); });
    if (!wkt) return false;
    try {
      var f = new ol.format.WKT().readFeature(wkt);
      f.set('soort', 'perceel');
      bron.addFeature(f);
      return true;
    } catch (e) {
      return false;
    }
  }

  global.RomKaart = { init: init, toonLocatie: toonLocatie, toonPerceel: toonPerceel, naarLocatie: naarLocatie };
})(window);
