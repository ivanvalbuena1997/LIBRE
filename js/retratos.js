/*
 * Libre · retratos de los conductores.
 *
 * Compone un retrato SVG a partir de los rasgos de un personaje
 * (config.conductores.personajes): cara, piel, pelo y su color, gafas,
 * barba, ropa y edad. Solo interfaz: no sabe nada de la simulación.
 * Los colores son variables CSS (clases r-piel-N, r-pelo-X, r-ropa-N).
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};

  // Cabeza según la forma de la cara (centro en 20,17).
  const CARAS = {
    redonda: '<ellipse cx="20" cy="17" rx="8" ry="9"/>',
    alargada: '<ellipse cx="20" cy="17.5" rx="7" ry="10"/>',
    cuadrada: '<rect x="12" y="8.5" width="16" height="18" rx="5"/>'
  };

  // Pelo por detrás de la cabeza (melena, coleta, moño, rizos).
  const PELO_DETRAS = {
    largo: '<path d="M10 17 C9 6 31 6 30 17 L31.5 30 L8.5 30 Z"/>',
    coleta: '<circle cx="30.5" cy="19" r="3.5"/><path d="M29 16 L33 25 L30 26 Z"/>',
    moño: '<circle cx="20" cy="6" r="4.2"/>',
    rizado: '<circle cx="12" cy="13" r="4"/><circle cx="28" cy="13" r="4"/><circle cx="11" cy="19" r="3.5"/>' +
      '<circle cx="29" cy="19" r="3.5"/><circle cx="16" cy="8.5" r="4"/><circle cx="24" cy="8.5" r="4"/>'
  };

  // Pelo por delante (flequillo o coronilla).
  const PELO_DELANTE = {
    corto: '<path d="M11.8 15 C11.5 5.5 28.5 5.5 28.2 15 C26 10.5 14 10.5 11.8 15 Z"/>',
    largo: '<path d="M11.5 16 C11 5.5 29 5.5 28.5 16 C26 10 17 11.5 11.5 16 Z"/>',
    coleta: '<path d="M11.8 15 C11.5 5.5 28.5 5.5 28.2 15 C24 9.5 16 9.5 11.8 15 Z"/>',
    moño: '<path d="M11.8 15 C11.5 6.5 28.5 6.5 28.2 15 C24 10 16 10 11.8 15 Z"/>',
    rizado: '<circle cx="15" cy="10" r="3.3"/><circle cx="20" cy="9" r="3.3"/><circle cx="25" cy="10" r="3.3"/>',
    calvo: '<path d="M11.6 19 C11 14 12.5 12.5 13.4 15.5 Z"/><path d="M28.4 19 C29 14 27.5 12.5 26.6 15.5 Z"/>'
  };

  const BARBAS = {
    bigote: '<path d="M16.3 21.2 Q20 19.4 23.7 21.2 Q20 22.4 16.3 21.2 Z"/>',
    barba: '<path d="M12 18.5 C12 28 28 28 28 18.5 C27 24 24 25.6 20 25.6 C16 25.6 13 24 12 18.5 Z"/>' +
      '<path d="M16.3 21.2 Q20 19.4 23.7 21.2 Q20 22.4 16.3 21.2 Z"/>',
    perilla: '<path d="M18 23.6 Q20 27.2 22 23.6 Q20 24.6 18 23.6 Z"/>'
  };

  // Gorra: copa sobre la cabeza y visera hacia un lado (color de ropa).
  const GORRA = '<path d="M11.4 13.4 C11 4.6 29 4.6 28.6 13.4 Z"/><path d="M26 12.4 L33.5 12.8 C33.4 14.4 30 14.6 26.5 14 Z"/>';
  // Cuello: pajarita, o traje (camisa en V y corbata sobre la ropa).
  const CUELLO = {
    pajarita: '<g class="r-pajarita"><path d="M16.4 27.4 L20 29.2 L16.4 31 Z"/><path d="M23.6 27.4 L20 29.2 L23.6 31 Z"/><circle cx="20" cy="29.2" r="1.1"/></g>',
    corbata: '<path class="r-camisa" d="M15.6 29.2 L20 35 L24.4 29.2 Q20 28 15.6 29.2 Z"/>' +
      '<path class="r-corbata" d="M19.1 29.6 L20.9 29.6 L21.6 35.6 L20 37.6 L18.4 35.6 Z"/>'
  };
  const PENDIENTES = '<g class="r-oro"><circle cx="11.6" cy="20.4" r="0.95"/><circle cx="28.4" cy="20.4" r="0.95"/></g>';

  const GAFAS = {
    redondas: '<circle cx="16.5" cy="17.5" r="2.7"/><circle cx="23.5" cy="17.5" r="2.7"/><path d="M19.2 17.3 L20.8 17.3"/>',
    cuadradas: '<rect x="13.6" y="15.3" width="5.8" height="4.4" rx="1"/><rect x="20.6" y="15.3" width="5.8" height="4.4" rx="1"/>' +
      '<path d="M19.4 17 L20.6 17"/>'
  };

  /*
   * SVG del retrato del personaje `indice` (o de unos rasgos sueltos: tu
   * personaje, Iván 24-11-2026). clase: clases extra para el <svg>. Si el
   * índice no existe (partidas antiguas), devuelve una silueta neutra.
   */
  function svg(indice, clase) {
    const p = (indice && typeof indice === 'object' ? indice : null) || Libre.config.conductores.personajes[indice] ||
      { piel: 2, cara: 'redonda', pelo: 'corto', colorPelo: 'gris', gafas: null, barba: null, ropa: 6, edad: 'media' };
    const pelo = 'r-pelo-' + p.colorPelo;
    let s = '<svg class="retrato-svg ' + (clase || '') + '" viewBox="0 0 40 40" aria-hidden="true">';
    s += '<circle class="r-fondo" cx="20" cy="20" r="20"/>';
    if (PELO_DETRAS[p.pelo]) s += '<g class="' + pelo + '">' + PELO_DETRAS[p.pelo] + '</g>';
    s += '<path class="r-ropa-' + p.ropa + '" d="M4 40 C6 30.5 13 28.5 20 28.5 C27 28.5 34 30.5 36 40 Z"/>';
    s += '<rect class="r-piel-' + p.piel + '" x="17" y="23" width="6" height="7" rx="2"/>';
    if (CUELLO[p.cuello]) s += CUELLO[p.cuello];
    s += '<g class="r-piel-' + p.piel + '">' + CARAS[p.cara] +
      '<circle cx="11.6" cy="18" r="1.6"/><circle cx="28.4" cy="18" r="1.6"/></g>';
    if (PELO_DELANTE[p.pelo]) s += '<g class="' + pelo + '">' + PELO_DELANTE[p.pelo] + '</g>';
    // Cejas, ojos y boca.
    s += '<g class="r-rasgos-linea"><path d="M14.8 14.6 L18 14.2"/><path d="M22 14.2 L25.2 14.6"/>' +
      '<path d="M17.4 22.6 Q20 24.2 22.6 22.6"/></g>';
    s += '<g class="r-rasgos"><circle cx="16.5" cy="17.6" r="1"/><circle cx="23.5" cy="17.6" r="1"/></g>';
    if (p.edad === 'mayor') {
      s += '<g class="r-arrugas"><path d="M16 11.5 L19 11.2"/><path d="M21 11.2 L24 11.5"/>' +
        '<path d="M13.6 19.6 L14.6 20.4"/><path d="M26.4 19.6 L25.4 20.4"/></g>';
    }
    if (BARBAS[p.barba]) s += '<g class="' + pelo + '">' + BARBAS[p.barba] + '</g>';
    if (p.pendientes) s += PENDIENTES;
    if (p.gafas === 'sol') {
      // Gafas de sol: cristales oscuros rellenos y puente.
      s += '<g class="r-gafas-sol"><path d="M13.3 15.6 H19 V17.6 A2.85 2.85 0 0 1 13.3 17.6 Z"/>' +
        '<path d="M21 15.6 H26.7 V17.6 A2.85 2.85 0 0 1 21 17.6 Z"/></g><path class="r-gafas" d="M19 16.2 L21 16.2"/>';
    } else if (GAFAS[p.gafas]) s += '<g class="r-gafas">' + GAFAS[p.gafas] + '</g>';
    if (p.gorra) s += '<g class="r-ropa-' + p.gorra + '">' + GORRA + '</g>';
    return s + '</svg>';
  }

  Libre.retratos = { svg };
})(globalThis);
