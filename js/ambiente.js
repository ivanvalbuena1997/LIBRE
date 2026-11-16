/*
 * Libre · tira de ambiente.
 *
 * Franja fina encima del taxímetro: cielo que sigue el reloj del juego, el
 * perfil de edificios (con ventanas que se encienden de noche) y lluvia
 * cuando llueve. Es puro adorno: no enseña datos de la partida.
 *
 * Módulo independiente con dos funciones, para poder cambiarlo por otra vista
 * (un mapa, por ejemplo) sin tocar el resto de la pantalla:
 *   montar(contenedor)          crea su dibujo dentro del contenedor (una vez)
 *   dibujar(contenedor, estado) lo pone al día con el estado de la partida
 * Solo lee el estado a través de Libre.sim; no lo modifica.
 *
 * Colores: variables CSS del :root (ver estilos.css). El cielo se interpola
 * en JS, así que lee esas variables una vez y las mezcla.
 * Movimiento: solo la lluvia, anulada con prefers-reduced-motion.
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};

  const ANCHO = 560;   // unidades del dibujo; se recorta a lo ancho de la pantalla
  const ALTO = 36;

  /* Azar con semilla: los edificios salen siempre iguales. */
  function azar(semilla) {
    let s = semilla;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  /* Una fila de edificios a lo ancho, con ventanas si se pide. */
  function edificios(semilla, altoMin, altoMax, anchoMin, anchoMax, clase, ventanas) {
    const r = azar(semilla);
    let x = 0;
    let svg = '';
    while (x < ANCHO) {
      const w = Math.min(ANCHO - x, Math.round(anchoMin + r() * (anchoMax - anchoMin)));
      const h = Math.round(altoMin + r() * (altoMax - altoMin));
      const y = ALTO - h;
      svg += '<rect class="' + clase + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>';
      if (ventanas) {
        for (let vy = y + 3; vy < ALTO - 4; vy += 5) {
          for (let vx = x + 3; vx < x + w - 4; vx += 5) {
            svg += '<rect class="ventanal' + (r() < 0.5 ? ' encendible' : '') +
              '" x="' + vx + '" y="' + vy + '" width="2" height="2.5"/>';
          }
        }
      }
      x += w + (ventanas ? 2 : 0);
    }
    return svg;
  }

  function svg() {
    let estrellas = '';
    const r = azar(3);
    for (let i = 0; i < 18; i++) {
      estrellas += '<circle class="estrella" cx="' + Math.round(r() * ANCHO) + '" cy="' + Math.round(2 + r() * 12) + '" r="0.6"/>';
    }
    // Las gotas se repiten una altura por encima para que caigan sin cortes.
    let gotas = '';
    const g = azar(5);
    for (let i = 0; i < 50; i++) {
      const x = Math.round(g() * ANCHO), y = Math.round(g() * ALTO);
      gotas += '<path class="gota" d="M' + x + ' ' + y + ' l-1.5 4.5"/><path class="gota" d="M' + x + ' ' + (y - ALTO) + ' l-1.5 4.5"/>';
    }
    return '<svg class="ambiente" viewBox="0 0 ' + ANCHO + ' ' + ALTO + '" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
      '<defs><linearGradient id="ambiente-cielo" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" data-cielo="alto"/><stop offset="1" data-cielo="bajo"/></linearGradient></defs>' +
      '<rect width="' + ANCHO + '" height="' + ALTO + '" fill="url(#ambiente-cielo)"/>' +
      '<g class="estrellas">' + estrellas + '</g>' +
      '<circle class="luna" cx="470" cy="9" r="4"/>' +
      edificios(7, 12, 26, 18, 34, 'edificio-lejos', false) +
      edificios(11, 8, 20, 16, 28, 'edificio-cerca', true) +
      '<g class="lluvia">' + gotas + '</g>' +
      '</svg>';
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
    contenedor.innerHTML = svg();
  }

  /* De noche se encienden ventanas y salen estrellas y luna. */
  function dibujar(contenedor, estado) {
    const dibujo = contenedor.querySelector('svg.ambiente');
    if (!dibujo) return;
    if (!paleta) leerPaleta();
    const minutos = estado.reloj.minutos;
    const hora = Libre.sim.infoReloj(minutos).minutoDelDia / 60;
    dibujo.querySelector('[data-cielo="alto"]').setAttribute('stop-color', colorCielo(hora, 'alto'));
    dibujo.querySelector('[data-cielo="bajo"]').setAttribute('stop-color', colorCielo(hora, 'bajo'));
    dibujo.classList.toggle('noche', hora >= 20.5 || hora < 7);
    dibujo.classList.toggle('lloviendo', Libre.sim.lloviendo(estado, minutos));
  }

  Libre.ambiente = { montar, dibujar };
})(globalThis);
