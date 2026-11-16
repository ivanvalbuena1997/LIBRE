/*
 * Libre · escena.
 *
 * Tira SVG encima del taxímetro: cielo que sigue el reloj del juego, dos
 * capas de edificios y un carril por taxi (hasta 5). Cada taxi va más
 * adelantado cuanto más lleva facturado en la jornada, avanza mientras lleva
 * pasajero y, si está parado por algo, enseña un icono con el motivo.
 * Es solo interfaz: recibe datos ya calculados y no sabe nada de la simulación.
 *
 * Colores: variables CSS del :root (ver estilos.css). El cielo se interpola
 * en JS, así que lee esas variables una vez y las mezcla.
 * Movimiento: transiciones y animaciones CSS, anuladas con prefers-reduced-motion.
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};

  const ANCHO = 560;        // un tramo de calle; se repite dos veces para el bucle
  const SUELO = 46;         // donde empieza la calzada
  const CARRIL = 18;        // alto de cada carril
  const ESCALA_TAXI = 0.7;  // el dibujo del taxi mide unas 45 × 26 unidades
  const X_SALIDA = 6;       // donde arrancan todos al empezar la jornada
  const X_META = ANCHO - 34;

  /* Azar con semilla: los edificios salen siempre iguales. */
  function azar(semilla) {
    let s = semilla;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  /* Un tramo de edificios de ANCHO unidades, con ventanas si se pide. */
  function tramoEdificios(semilla, altoMin, altoMax, anchoMin, anchoMax, clase, ventanas) {
    const r = azar(semilla);
    let x = 0;
    let svg = '';
    while (x < ANCHO) {
      const w = Math.min(ANCHO - x, Math.round(anchoMin + r() * (anchoMax - anchoMin)));
      const h = Math.round(altoMin + r() * (altoMax - altoMin));
      const y = SUELO - h;
      svg += '<rect class="' + clase + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>';
      if (ventanas) {
        for (let vy = y + 4; vy < SUELO - 5; vy += 6) {
          for (let vx = x + 3; vx < x + w - 4; vx += 6) {
            svg += '<rect class="ventanal' + (r() < 0.5 ? ' encendible' : '') +
              '" x="' + vx + '" y="' + vy + '" width="2.5" height="3"/>';
          }
        }
      }
      x += w + (ventanas ? 2 : 0);
    }
    return svg;
  }

  /* Capa que se repite dos veces seguidas para desplazarse sin cortes. */
  function capa(clase, contenido) {
    return '<g class="capa ' + clase + '"><g>' + contenido + '</g>' +
      '<g transform="translate(' + ANCHO + ' 0)">' + contenido + '</g></g>';
  }

  function rueda(cx) {
    return '<g transform="translate(' + cx + ' 16)"><circle class="neumatico" r="4"/>' +
      '<g class="radios"><circle class="llanta" r="1.8"/><path class="radio" d="M-1.8 0H1.8M0 -1.8V1.8"/></g></g>';
  }

  /* Taxi de Madrid mirando a la derecha: blanco con franja roja diagonal. */
  function dibujoTaxi() {
    return '<g class="taxi-cuerpo">' +
      '<rect class="taxi-luminoso" x="19" y="-4" width="7" height="4" rx="1"/>' +
      '<circle class="piloto-taxi" cx="22.5" cy="-6" r="2"/>' +
      '<path class="taxi-chapa" d="M9 6 L14 0 H30 L36 6 Z"/>' +
      '<path class="taxi-cristal" d="M15.5 1.5 H21.5 V5.2 H12.6 Z"/>' +
      '<path class="taxi-cristal" d="M23 1.5 H29.4 L33.2 5.2 H23 Z"/>' +
      '<rect class="taxi-chapa" x="1" y="5.5" width="43" height="9" rx="3"/>' +
      '<polygon class="taxi-franja" points="15,14.5 20,14.5 27,5.5 22,5.5"/>' +
      '<rect class="taxi-faro" x="41.5" y="7.5" width="2.5" height="2" rx="0.8"/>' +
      '</g>' + rueda(10) + rueda(35);
  }

  /*
   * Iconos del motivo por el que un taxi está parado, encima del techo.
   * Solo se ve el que toca (clase data-icono en el taxi).
   */
  const ICONOS = {
    averia: '<circle class="icono-fondo" r="6"/><path class="icono-trazo" d="M-3 3 L1.5 -1.5 M0.5 -3.5 a2.3 2.3 0 1 0 3 3"/>',
    baja: '<circle class="icono-fondo" r="6"/><path class="icono-cruz" d="M-3 0 H3 M0 -3 V3"/>',
    vacio: '<circle class="icono-fondo" r="6"/><circle class="icono-trazo" cy="-1.8" r="1.6"/>' +
      '<path class="icono-trazo" d="M-3 3.5 Q0 0 3 3.5"/><path class="icono-raya" d="M-4 -4 L4 4"/>',
    fin: '<circle class="icono-fondo" r="6"/><path class="icono-luna" d="M1.5 -3.5 A3.6 3.6 0 1 0 1.5 3.5 A2.8 2.8 0 1 1 1.5 -3.5 Z"/>'
  };

  function taxiEnCarril(i) {
    const y = SUELO + i * CARRIL + 1;
    let iconos = '';
    Object.keys(ICONOS).forEach(function (k) {
      iconos += '<g class="icono icono-' + k + '" transform="translate(' + 32 + ' ' + -3 + ')">' + ICONOS[k] + '</g>';
    });
    return '<g class="taxi" data-carril="' + i + '" style="transform: translate(' + X_SALIDA + 'px, ' + y + 'px)">' +
      '<g transform="scale(' + ESCALA_TAXI + ')">' + dibujoTaxi() + '</g>' + iconos + '</g>';
  }

  /* SVG con `carriles` carriles (1 a 5). */
  function html(carriles) {
    const n = Math.max(1, carriles || 1);
    const alto = SUELO + n * CARRIL;
    const lejos = tramoEdificios(7, 14, 34, 18, 34, 'edificio-lejos', false);
    const cerca = tramoEdificios(11, 10, 26, 16, 28, 'edificio-cerca', true);
    let lineas = '';
    for (let c = 1; c < n; c++) {
      for (let x = 0; x < ANCHO; x += 28) {
        lineas += '<rect class="carril" x="' + x + '" y="' + (SUELO + c * CARRIL - 0.6) + '" width="14" height="1.2"/>';
      }
    }
    let estrellas = '';
    const r = azar(3);
    for (let i = 0; i < 18; i++) {
      estrellas += '<circle class="estrella" cx="' + Math.round(r() * ANCHO) + '" cy="' + Math.round(2 + r() * 18) + '" r="0.7"/>';
    }
    let gotas = '';
    const g = azar(5);
    for (let i = 0; i < 60; i++) {
      const x = Math.round(g() * ANCHO), y = Math.round(g() * alto);
      gotas += '<path class="gota" d="M' + x + ' ' + y + ' l-2 6"/><path class="gota" d="M' + x + ' ' + (y - alto) + ' l-2 6"/>';
    }
    let taxis = '';
    for (let i = 0; i < n; i++) taxis += taxiEnCarril(i);
    return '<svg class="escena" viewBox="0 0 ' + ANCHO + ' ' + alto + '" preserveAspectRatio="xMinYMax meet" ' +
      'role="img" aria-label="Calle de Madrid con tus taxis">' +
      '<defs><linearGradient id="escena-cielo" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" id="cielo-alto"/><stop offset="1" id="cielo-bajo"/></linearGradient></defs>' +
      '<rect width="' + ANCHO + '" height="' + SUELO + '" fill="url(#escena-cielo)"/>' +
      '<g class="estrellas">' + estrellas + '</g>' +
      '<circle class="luna" cx="470" cy="12" r="5"/>' +
      capa('capa-lejos', lejos) +
      capa('capa-cerca', cerca) +
      '<rect class="asfalto" y="' + SUELO + '" width="' + ANCHO + '" height="' + (n * CARRIL) + '"/>' +
      capa('capa-carril', lineas) +
      taxis +
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

  /*
   * datos: {
   *   hora (decimal 0–24), lluvia (bool),
   *   taxis: [{ avance 0–1, enCarrera, icono: null|'averia'|'baja'|'vacio'|'fin' }]
   * }
   * De noche se encienden ventanas, salen estrellas y luna, y los taxis libres
   * llevan el piloto verde encendido.
   */
  function actualizar(svg, datos) {
    if (!paleta) leerPaleta();
    svg.querySelector('#cielo-alto').setAttribute('stop-color', colorCielo(datos.hora, 'alto'));
    svg.querySelector('#cielo-bajo').setAttribute('stop-color', colorCielo(datos.hora, 'bajo'));
    const noche = datos.hora >= 20.5 || datos.hora < 7;
    svg.classList.toggle('noche', noche);
    svg.classList.toggle('lloviendo', !!datos.lluvia);
    const algunoEnMarcha = datos.taxis.some(function (t) { return t.enCarrera; });
    svg.classList.toggle('moviendo', algunoEnMarcha);
    svg.querySelectorAll('.taxi').forEach(function (g, i) {
      const t = datos.taxis[i];
      g.classList.toggle('oculto-taxi', !t);
      if (!t) return;
      const x = X_SALIDA + Math.max(0, Math.min(1, t.avance)) * (X_META - X_SALIDA);
      g.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + (SUELO + i * CARRIL + 1) + 'px)';
      g.classList.toggle('en-carrera', !!t.enCarrera);
      g.classList.toggle('piloto-on', noche && !t.enCarrera && !t.icono);
      g.dataset.icono = t.icono || '';
    });
  }

  Libre.escena = { html, actualizar };
})(globalThis);
