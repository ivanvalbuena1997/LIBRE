/*
 * Libre · escena de la cabecera.
 *
 * La calle de fondo de la cabecera (maqueta libre-rework/maquetas/
 * cabecera-dia-noche.html): cielo que sigue el reloj del juego, sol o luna
 * y estrellas, edificios con ventanas que se encienden de noche, acera,
 * asfalto, nubes y un taxi que pasa. Lluvia cuando llueve. Es puro adorno:
 * no enseña datos de la partida.
 *
 * Módulo independiente con dos funciones, para poder cambiarlo por otra vista
 * (un mapa, por ejemplo) sin tocar el resto de la pantalla:
 *   montar(contenedor)          crea su dibujo dentro del contenedor (una vez)
 *   dibujar(contenedor, estado) lo pone al día con el estado de la partida;
 *                               deja contenedor.dataset.momento = 'dia' o
 *                               'noche' para que la cabecera ajuste sus colores.
 * Solo lee el estado a través de Libre.sim; no lo modifica.
 *
 * Tamaño: se dibuja a escala 1 (un píxel por unidad) y pegado abajo, como en
 * la maqueta: la cabecera alta (220 px) enseña la escena entera y la
 * compacta (124 px) solo la parte de abajo. El perfil de 390 de ancho se
 * repite a los lados para pantallas anchas; sol y luna van en el centro.
 * El taxi y las nubes son dibujos aparte que cruzan todo el ancho.
 *
 * Colores: variables CSS del :root (ver estilos.css). El cielo se interpola
 * en JS, así que lee esas variables una vez y las mezcla.
 * Movimiento: animaciones CSS (taxi, nubes, sol, ventanas, estrellas y
 * lluvia), anuladas con prefers-reduced-motion.
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};

  const TRAMO = 390;            // ancho del perfil de la maqueta
  const TRAMOS = 5;             // se repite: 1950 de ancho, el centro es el tramo 2
  const ANCHO = TRAMO * TRAMOS;
  const CENTRO = TRAMO * 2;     // x donde empieza el tramo del centro

  // Ventanas del perfil (x, y), de la maqueta.
  const VENTANAS = [
    [10, 150], [10, 166], [26, 150], [26, 182], [40, 150], [40, 166],
    [308, 150], [308, 182], [322, 150], [322, 166], [336, 166], [336, 182],
    [352, 150], [352, 166], [368, 150], [368, 182]
  ];
  // Estrellas de un tramo (x, y), de la maqueta.
  const ESTRELLAS = [[30, 30], [74, 58], [126, 24], [170, 66], [214, 28], [262, 70], [352, 98], [58, 96], [246, 100]];

  /* Un tramo del perfil: edificios, ventanas y árboles. */
  function tramo() {
    return '<path class="esc-lejos" d="M0 150V120h28v-18h22v30h26v-24h30v34h24v-14h34v28h30v-22h28v30h30v-20h34v22h40v50H0z"/>' +
      '<path class="esc-medio" d="M0 170V132h36v-20h30v44h28v-30h38v54h30v-26h34v34h30v-40h36v36h28v-18h34V200H0z"/>' +
      '<path class="esc-cerca" d="M0 200V160h52v-12h34v52zM300 200v-52h42v-14h48v66z"/>' +
      VENTANAS.map(function (v, i) {
        return '<rect class="esc-ventana ' + (i % 3 === 1 ? 'an-v2' : 'an-v1') + '" x="' + v[0] + '" y="' + v[1] +
          '" width="8" height="9" rx="1.5"/>';
      }).join('') +
      '<rect class="esc-tronco" x="96" y="176" width="5" height="22"/><circle class="esc-copa" cx="98" cy="170" r="14"/>' +
      '<rect class="esc-tronco" x="262" y="176" width="5" height="22"/><circle class="esc-copa" cx="264" cy="170" r="14"/>';
  }

  function escena() {
    let tramos = '';
    let estrellas = '';
    for (let i = 0; i < TRAMOS; i++) {
      tramos += '<g transform="translate(' + (i * TRAMO) + ' 0)">' + tramo() + '</g>';
      ESTRELLAS.forEach(function (e) {
        estrellas += '<circle class="esc-estrella an-v1" cx="' + (i * TRAMO + e[0]) + '" cy="' + e[1] + '" r="1.3"/>';
      });
    }
    return '<svg class="esc-calle" width="' + ANCHO + '" height="220" viewBox="0 30 ' + ANCHO + ' 220" aria-hidden="true" focusable="false">' +
      '<defs>' +
      '<linearGradient id="esc-cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" data-cielo="alto"/><stop offset="1" data-cielo="bajo"/></linearGradient>' +
      '<mask id="esc-creciente"><circle cx="' + (CENTRO + 250) + '" cy="62" r="24" class="esc-mascara-si"/><circle cx="' + (CENTRO + 261) + '" cy="56" r="21" class="esc-mascara-no"/></mask>' +
      '<pattern id="esc-gotas" width="40" height="40" patternUnits="userSpaceOnUse">' +
      '<path class="esc-gota" d="M8 4l-2 6M28 14l-2 6M18 26l-2 6M36 32l-2 6"/></pattern>' +
      '</defs>' +
      '<rect x="0" y="0" width="' + ANCHO + '" height="250" fill="url(#esc-cielo)"/>' +
      '<g class="esc-dia">' +
      '<circle class="esc-sol an-sol" cx="' + (CENTRO + 250) + '" cy="74" r="46"/>' +
      '<circle class="esc-sol" cx="' + (CENTRO + 250) + '" cy="74" r="28"/></g>' +
      '<g class="esc-noche"><g class="esc-estrellas">' + estrellas + '</g>' +
      '<circle class="esc-luna" cx="' + (CENTRO + 250) + '" cy="62" r="24" mask="url(#esc-creciente)"/></g>' +
      tramos +
      '<rect class="esc-acera" x="0" y="198" width="' + ANCHO + '" height="8"/>' +
      '<rect class="esc-asfalto" x="0" y="206" width="' + ANCHO + '" height="44"/>' +
      '<path class="esc-raya" d="' + rayas() + '"/>' +
      '<g class="esc-lluvia"><rect class="an-lluvia" x="0" y="-10" width="' + ANCHO + '" height="260" fill="url(#esc-gotas)"/></g>' +
      '</svg>';
  }

  /* Rayas discontinuas del centro de la calzada. */
  function rayas() {
    let d = '';
    for (let x = 10; x < ANCHO; x += 70) d += 'M' + x + ' 232h40';
    return d;
  }

  /* El taxi que pasa (dibujo aparte: cruza todo el ancho de la cabecera). */
  function taxi() {
    return '<svg class="esc-taxi an-taxi" width="130" height="50" viewBox="0 -20 130 50" aria-hidden="true" focusable="false">' +
      '<defs><radialGradient id="esc-faro"><stop offset="0" class="esc-faro-centro"/><stop offset="1" class="esc-faro-borde"/></radialGradient></defs>' +
      // Brillo de los faros de noche: degradado que se pierde (no una mancha).
      '<ellipse class="esc-brillo" cx="104" cy="14" rx="26" ry="9" fill="url(#esc-faro)"/>' +
      '<rect class="esc-carroceria" x="0" y="0" width="84" height="22" rx="8"/>' +
      '<path class="esc-carroceria" d="M12 0 l10 -12 h40 l12 12z"/>' +
      '<path class="esc-cristal" d="M24 -1 l7 -9 h14 v9z"/><path class="esc-cristal" d="M49 -1 v-9 h11 l8 9z"/>' +
      '<rect class="esc-piloto" x="35" y="-17" width="14" height="5" rx="2"/>' +
      '<path class="esc-franja" d="M40 0 l12 22 h-9 l-12 -22z"/>' +
      '<rect class="esc-faro" x="78" y="8" width="6" height="4" rx="1.5"/>' +
      '<circle class="esc-rueda" cx="18" cy="22" r="6"/><circle class="esc-rueda" cx="64" cy="22" r="6"/>' +
      '</svg>';
  }

  /* Dos nubes que cruzan despacio (solo de día). */
  function nubes() {
    return '<svg class="esc-nube esc-nube-1 an-nube" width="76" height="27" viewBox="28 24 76 27" aria-hidden="true" focusable="false">' +
      '<ellipse cx="60" cy="40" rx="30" ry="9"/><ellipse cx="82" cy="34" rx="20" ry="8"/></svg>' +
      '<svg class="esc-nube esc-nube-2 an-nube2" width="66" height="25" viewBox="122 63 66 25" aria-hidden="true" focusable="false">' +
      '<ellipse cx="150" cy="78" rx="26" ry="8"/><ellipse cx="170" cy="72" rx="16" ry="7"/></svg>';
  }

  // ------------------------------------------------------------- Cielo

  /* Colores del cielo por hora del día (nombres de variables CSS). */
  const TRAMOS_CIELO = [
    [0, 'noche'], [5.5, 'noche'], [6.8, 'alba'], [8.5, 'dia'],
    [18.5, 'dia'], [20.2, 'ocaso'], [21.5, 'noche'], [24, 'noche']
  ];
  let paleta = null;

  function hexARgb(hex) {
    const h = hex.trim().replace('#', '');
    return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); });
  }

  function leerPaleta() {
    const css = getComputedStyle(document.documentElement);
    paleta = {};
    ['noche', 'alba', 'dia', 'ocaso'].forEach(function (n) {
      paleta[n] = {
        alto: hexARgb(css.getPropertyValue('--cielo-' + n + '-alto')),
        bajo: hexARgb(css.getPropertyValue('--cielo-' + n + '-bajo'))
      };
    });
  }

  function mezclar(a, b, t) {
    return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(',') + ')';
  }

  function colorCielo(hora, parte) {
    for (let i = 0; i < TRAMOS_CIELO.length - 1; i++) {
      const [h0, n0] = TRAMOS_CIELO[i];
      const [h1, n1] = TRAMOS_CIELO[i + 1];
      if (hora >= h0 && hora <= h1) {
        const t = h1 === h0 ? 0 : (hora - h0) / (h1 - h0);
        return mezclar(paleta[n0][parte], paleta[n1][parte], t);
      }
    }
    return mezclar(paleta.noche[parte], paleta.noche[parte], 0);
  }

  // ------------------------------------------------------------- Interfaz

  function montar(contenedor) {
    contenedor.innerHTML = escena() + nubes() + taxi();
  }

  /* Cielo según la hora; de noche, luna, estrellas, ventanas encendidas y faros. */
  function dibujar(contenedor, estado) {
    const dibujo = contenedor.querySelector('svg.esc-calle');
    if (!dibujo) return;
    if (!paleta) leerPaleta();
    const minutos = estado.reloj.minutos;
    const hora = Libre.sim.infoReloj(minutos).minutoDelDia / 60;
    const alto = colorCielo(hora, 'alto');
    const bajo = colorCielo(hora, 'bajo');
    dibujo.querySelector('[data-cielo="alto"]').setAttribute('stop-color', alto);
    dibujo.querySelector('[data-cielo="bajo"]').setAttribute('stop-color', bajo);
    // Más allá del dibujo (pantallas muy anchas), el mismo cielo.
    contenedor.style.backgroundColor = bajo;
    const noche = hora >= 20.5 || hora < 7;
    contenedor.classList.toggle('noche', noche);
    contenedor.classList.toggle('lloviendo', Libre.sim.lloviendo(estado, minutos));
    contenedor.dataset.momento = noche ? 'noche' : 'dia';
  }

  Libre.ambiente = { montar, dibujar };
})(globalThis);
