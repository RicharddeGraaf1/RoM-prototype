/* Onderwerpen (categorieën) en hun kleur.
 *
 * De indeling zelf komt uit het register (`v2a.artikel_indeling`, via
 * /v1/viewer/regeling/{expr}/onderwerpen) — RoM verzint geen eigen taxonomie,
 * zodat register en RoM hetzelfde zeggen over hetzelfde artikel (besluit
 * 2026-09-16, REALISATIEPLAN fase 4). Hier staat alleen hoe een categorie
 * eruitziet.
 *
 * Kleuren: gelijke lichtheid en chroma, variërende hue. Ze staan bewust los
 * van de statuskleuren (goed/matig/zwak) in stijl.css. Een categorie die hier
 * (nog) niet staat krijgt een neutrale kleur, geen verzonnen plek.
 */
(function (global) {
  'use strict';

  var KLEUR = {
    'wonen':                'oklch(72% 0.13 92)',
    'bouwen':               'oklch(58% 0.11 55)',
    'planologisch gebruik': 'oklch(62% 0.10 75)',
    'natuur':               'oklch(60% 0.13 145)',
    'landschap':            'oklch(64% 0.10 125)',
    'landbouw':             'oklch(64% 0.12 105)',
    'water':                'oklch(60% 0.12 235)',
    'bodem':                'oklch(52% 0.07 60)',
    'milieu':               'oklch(58% 0.09 180)',
    'lucht':                'oklch(70% 0.07 215)',
    'geluid':               'oklch(58% 0.13 300)',
    'gezondheid':           'oklch(62% 0.13 10)',
    'veiligheid':           'oklch(56% 0.16 28)',
    'energie':              'oklch(58% 0.15 345)',
    'duurzaamheid':         'oklch(62% 0.12 160)',
    'mobiliteit':           'oklch(56% 0.10 250)',
    'infrastructuur':       'oklch(50% 0.05 262)',
    'erfgoed':              'oklch(52% 0.10 35)',
    'recreatie':            'oklch(66% 0.12 200)',
    'economie':             'oklch(58% 0.10 280)',
    'procedures':           'oklch(60% 0.02 262)'
  };
  var NEUTRAAL = 'oklch(62% 0.03 262)';

  function kleur(categorie) {
    return (categorie && KLEUR[categorie]) || NEUTRAAL;
  }

  function naam(categorie) {
    if (!categorie) return 'niet ingedeeld';
    return categorie.charAt(0).toUpperCase() + categorie.slice(1);
  }

  global.RomThema = { kleur: kleur, naam: naam };
})(window);
