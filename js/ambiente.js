/*
 * Libre · escena de la cabecera.
 *
 * La calle de fondo de la cabecera (maqueta libre-rework/maquetas/
 * cabecera-dia-noche.html): cielo que sigue el reloj del juego, sol o luna
 * y estrellas, edificios con ventanas que se encienden de noche, acera,
 * asfalto, nubes y un taxi que pasa. Lluvia cuando llueve y, si es tormenta
 * (Iván, 18-11-2026), cielo oscuro, relámpagos con rayos, más lluvia,
 * viento y hojas volando. Es puro adorno: no enseña datos de la partida.
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
 * Movimiento: animaciones CSS (taxi, nubes, sol, ventanas, estrellas,
 * lluvia y la tormenta), anuladas con prefers-reduced-motion: sin
 * movimiento no hay destellos y la tormenta es solo el cielo oscuro.
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};

  const TRAMO = 390;            // ancho del perfil de la maqueta
  const TRAMOS = 5;             // se repite: 1950 de ancho, el centro es el tramo 2
  const ANCHO = TRAMO * TRAMOS;
  const CENTRO = TRAMO * 2;     // x donde empieza el tramo del centro

  // Estrellas de un tramo (x, y), de la maqueta.
  const ESTRELLAS = [[30, 30], [74, 58], [126, 24], [170, 66], [214, 28], [262, 70], [352, 98], [58, 96], [246, 100]];

  /*
   * Los edificios (Iván, 26-11-2026): una ilustración hecha con IA, como el
   * resto del juego (imagenes/calle-dia.webp y calle-noche.webp, 1950 × 130
   * a doble densidad; el centro, con el Metrópolis y Cibeles). Va pegada a la
   * acera; la de noche aparece encima con un fundido.
   */
  const ALTO_EDIFICIOS = 130;
  function edificios() {
    const y = 198 - ALTO_EDIFICIOS;
    const imagen = function (momento) {
      return '<image class="esc-edificios-' + momento + '" href="imagenes/calle-' + momento + '.webp" x="0" y="' + y +
        '" width="' + ANCHO + '" height="' + ALTO_EDIFICIOS + '" preserveAspectRatio="none"/>';
    };
    return '<g class="esc-edificios">' + imagen('dia') + imagen('noche') + '</g>';
  }

  function escena() {
    let estrellas = '';
    for (let i = 0; i < TRAMOS; i++) {
      ESTRELLAS.forEach(function (e) {
        estrellas += '<circle class="esc-estrella an-v1" cx="' + (i * TRAMO + e[0]) + '" cy="' + e[1] + '" r="1.3"/>';
      });
    }
    return '<svg class="esc-calle" width="' + ANCHO + '" height="220" viewBox="0 30 ' + ANCHO + ' 220" aria-hidden="true" focusable="false">' +
      '<defs>' +
      '<linearGradient id="esc-cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" data-cielo="alto"/><stop offset="1" data-cielo="bajo"/></linearGradient>' +
      '<mask id="esc-creciente"><circle cx="' + (CENTRO + 250) + '" cy="74" r="24" class="esc-mascara-si"/><circle cx="' + (CENTRO + 261) + '" cy="68" r="21" class="esc-mascara-no"/></mask>' +
      '</defs>' +
      '<rect x="0" y="0" width="' + ANCHO + '" height="250" fill="url(#esc-cielo)"/>' +
      // Tormenta, detrás de los edificios: cielo oscuro, el destello que lo
      // ilumina y dos rayos que caen por turnos (sincronizados con el destello).
      '<g class="esc-tormenta">' +
      '<rect class="esc-oscuro" x="0" y="0" width="' + ANCHO + '" height="250"/>' +
      '<rect class="esc-relampago an-relampago" x="0" y="0" width="' + ANCHO + '" height="250"/>' +
      '<path class="esc-rayo an-rayo" d="' + rayo(CENTRO + 110, 34) + '"/>' +
      '<path class="esc-rayo an-rayo2" d="' + rayo(CENTRO + 300, 40) + '"/>' +
      '</g>' +
      '<g class="esc-dia">' +
      '<circle class="esc-sol an-sol" cx="' + (CENTRO + 250) + '" cy="86" r="46"/>' +
      '<circle class="esc-sol" cx="' + (CENTRO + 250) + '" cy="86" r="28"/></g>' +
      '<g class="esc-noche"><g class="esc-estrellas">' + estrellas + '</g>' +
      '<circle class="esc-luna" cx="' + (CENTRO + 250) + '" cy="74" r="24" mask="url(#esc-creciente)"/></g>' +
      edificios() +
      '<rect class="esc-acera" x="0" y="198" width="' + ANCHO + '" height="8"/>' +
      '<rect class="esc-asfalto" x="0" y="206" width="' + ANCHO + '" height="44"/>' +
      '<path class="esc-raya" d="' + rayas() + '"/>' +
      farolas() +
      '</svg>';
  }

  /*
   * Lluvia y viento, en una capa aparte encima de todo (Iván, 26-11-2026:
   * dentro de la calle, los coches, el autobús, las bicis y la gente pasaban
   * por delante). Mismo tamaño y sitio que la calle (.esc-calle).
   */
  function lluvia() {
    return '<svg class="esc-calle esc-capa-lluvia" width="' + ANCHO + '" height="220" viewBox="0 30 ' + ANCHO + ' 220" aria-hidden="true" focusable="false">' +
      '<defs>' +
      '<pattern id="esc-gotas" width="40" height="40" patternUnits="userSpaceOnUse">' +
      '<path class="esc-gota" d="M8 4l-2 6M28 14l-2 6M18 26l-2 6M36 32l-2 6"/></pattern>' +
      // Tormenta: más gotas y más largas, inclinadas por el viento.
      '<pattern id="esc-gotas-fuerte" width="24" height="24" patternUnits="userSpaceOnUse">' +
      '<path class="esc-gota esc-gota-fuerte" d="M8 1l-4 9M20 7l-4 9M14 15l-4 9M3 17l-3 6"/></pattern>' +
      '</defs>' +
      '<g class="esc-lluvia"><rect class="an-lluvia" x="0" y="-10" width="' + ANCHO + '" height="260" fill="url(#esc-gotas)"/></g>' +
      '<g class="esc-tormenta">' +
      '<rect class="an-lluvia-fuerte" x="0" y="-48" width="' + (ANCHO + 48) + '" height="300" fill="url(#esc-gotas-fuerte)"/>' +
      '<path class="esc-viento an-viento" d="' + viento(0) + '"/>' +
      '<path class="esc-viento an-viento2" d="' + viento(70) + '"/>' +
      '</g>' +
      '</svg>';
  }

  /* Un rayo en zigzag que baja desde (x, y) hasta los tejados. */
  function rayo(x, y) {
    return 'M' + x + ' ' + y + 'l-16 38h13l-20 44l34-52h-13l17-30z';
  }

  /* Rachas de viento: rayas horizontales repartidas por cada tramo. */
  function viento(desfase) {
    let d = '';
    for (let i = 0; i < TRAMOS; i++) {
      const x = i * TRAMO + desfase;
      d += 'M' + (x + 20) + ' 112h70M' + (x + 150) + ' 146h90M' + (x + 260) + ' 98h56M' + (x + 90) + ' 182h60';
    }
    return d;
  }

  /* Hojas que el viento arrastra por la cabecera (solo con tormenta). */
  function hojas() {
    let html = '';
    for (let i = 0; i < 6; i++) {
      html += '<svg class="esc-hoja esc-hoja-' + (i + 1) + (i % 2 ? ' esc-hoja-b' : '') + ' an-hoja" width="14" height="10" viewBox="0 0 14 10" aria-hidden="true" focusable="false">' +
        '<path d="M1 5C3 1 9 0 13 2C11 7 6 10 1 5zM1 5l8-2"/></svg>';
    }
    return html;
  }

  /*
   * Farolas en la acera de detrás (Iván, 22-11-2026), una cada SEP_FAROLA
   * (en el móvil se ven 4). Solo en ese lado: la calzada llega al borde de
   * abajo y unas farolas delante taparían el taxi y las bicis. De día,
   * apagadas; de noche, la lámpara encendida, un halo suave y un poco de
   * luz en el suelo, con poca intensidad.
   */
  const SEP_FAROLA = 97.5;
  function farolas() {
    let postes = '', luces = '';
    for (let x = 48; x < ANCHO; x += SEP_FAROLA) {
      const l = x + 8;   // la lámpara, al final del brazo, hacia la calzada
      postes += '<rect class="esc-farola" x="' + (x - 2.2) + '" y="201.5" width="4.4" height="3" rx="0.8"/>' +
        '<path class="esc-farola-poste" d="M' + x + ' 202V160q0-3 3-3.4L' + (l - 1) + ' 155.6"/>' +
        '<path class="esc-farola" d="M' + (l - 3.6) + ' 157.6h7.2l-1.6-3h-4z"/>' +
        '<ellipse class="esc-farola-luz" cx="' + l + '" cy="158" rx="2.8" ry="1"/>';
      luces += '<circle cx="' + l + '" cy="159" r="11" fill="url(#esc-farola-halo)"/>' +
        '<ellipse cx="' + l + '" cy="205" rx="16" ry="3.2" fill="url(#esc-farola-suelo)"/>';
    }
    return '<defs><radialGradient id="esc-farola-halo"><stop offset="0" class="esc-farola-halo-1"/><stop offset="1" class="esc-farola-halo-0"/></radialGradient>' +
      '<radialGradient id="esc-farola-suelo"><stop offset="0" class="esc-farola-suelo-1"/><stop offset="1" class="esc-farola-halo-0"/></radialGradient></defs>' +
      '<g class="esc-farolas">' + postes + '</g><g class="esc-farolas-luz">' + luces + '</g>';
  }

  /* Rayas discontinuas del centro de la calzada. */
  function rayas() {
    let d = '';
    for (let x = 10; x < ANCHO; x += 70) d += 'M' + x + ' 232h40';
    return d;
  }

  /*
   * El taxi que pasa (dibujo aparte: cruza todo el ancho de la cabecera).
   * Iván, 20-11-2026: una berlina con las formas de un Toyota Corolla (foto
   * de referencia, en espejo: circula hacia la derecha), sin marcas.
   */
  // Caja del dibujo del taxi en las unidades de su svg (la del Corolla de antes).
  const CAJA_TAXI = { x: 0, y: -8.9, w: 104, h: 37.5 };
  /* Pone en el taxi el dibujo de un modelo y coloca sus ruedas encima (para que giren). */
  function vestirTaxi(contenedor, modeloId) {
    const m = Libre.config.vehiculos.modelos[modeloId];
    const img = contenedor.querySelector('.esc-taxi-img');
    if (!m || !m.imagen || !img) return;
    modeloTaxi = modeloId;
    if (img.getAttribute('href') !== m.imagen) img.setAttribute('href', m.imagen);
    // Dónde queda el dibujo dentro de la caja (meet, pegado abajo y centrado).
    const asp = m.aspecto || 2.77;
    let dw = CAJA_TAXI.w, dh = CAJA_TAXI.w / asp;
    if (dh > CAJA_TAXI.h) { dh = CAJA_TAXI.h; dw = dh * asp; }
    const dx = CAJA_TAXI.x + (CAJA_TAXI.w - dw) / 2, dy = CAJA_TAXI.y + CAJA_TAXI.h - dh;
    const ruedas = contenedor.querySelectorAll('.esc-taxi-rueda');
    ruedas.forEach(function (r, i) {
      const def = (m.ruedas || [])[i];
      if (!def) { r.setAttribute('href', ''); return; }
      r.setAttribute('href', def.imagen);
      r.setAttribute('x', dx + def.caja[0] * dw);
      r.setAttribute('y', dy + def.caja[1] * dh);
      r.setAttribute('width', def.caja[2] * dw);
      r.setAttribute('height', def.caja[3] * dh);
    });
  }

  function taxi() {
    // 15 % más grande que el dibujo (Iván, 20-11-2026): 150 × 58 en vez de 130 × 50.
    return '<svg class="esc-taxi an-taxi" width="150" height="58" viewBox="0 -20 130 50" aria-hidden="true" focusable="false">' +
      // Luz de los faros de noche (Iván, 22-11-2026: antes era una mancha
      // que se cortaba en seco en el borde del dibujo). Ahora es un haz que
      // sale del faro, se abre hacia el suelo y se apaga poco a poco; el svg
      // deja ver lo que sale de su caja (.esc-taxi, overflow visible).
      '<defs><radialGradient id="esc-faro"><stop offset="0" class="esc-faro-centro"/><stop offset="1" class="esc-faro-borde"/></radialGradient>' +
      '<linearGradient id="esc-haz" gradientUnits="userSpaceOnUse" x1="101" y1="0" x2="150" y2="0">' +
      '<stop offset="0" class="esc-haz-1"/><stop offset="0.35" class="esc-haz-2"/><stop offset="1" class="esc-faro-borde"/></linearGradient></defs>' +
      '<g class="esc-brillo"><path d="M101.5 11 Q126 8.6 150 9.6 Q153 16 150 23.4 Q126 18.4 101.5 13.2 Z" fill="url(#esc-haz)"/>' +
      '<circle cx="101.5" cy="12" r="4.5" fill="url(#esc-faro)"/></g>' +
      // Sombra en el suelo y el coche: ilustración hecha con IA (Iván,
      // 26-11-2026; imagenes/taxi.webp), sin ruedas que giren.
      '<ellipse class="esc-sombra-coche" cx="52" cy="28.4" rx="52" ry="2"/>' +
      // El modelo cambia en cada pasada: uno de los coches de tu flota
      // (ponerModeloTaxi()); sus ruedas, recortadas del dibujo, giran encima.
      '<image class="esc-taxi-img" href="" x="' + CAJA_TAXI.x + '" y="' + CAJA_TAXI.y + '" width="' + CAJA_TAXI.w +
      '" height="' + CAJA_TAXI.h + '" preserveAspectRatio="xMidYMax meet"/>' +
      '<g class="an-rueda"><image class="esc-taxi-rueda" href="" x="0" y="0" width="0" height="0"/></g>' +
      '<g class="an-rueda"><image class="esc-taxi-rueda" href="" x="0" y="0" width="0" height="0"/></g>' +
      '</svg>';
  }

  /*
   * Gente que pasea por la acera (Iván, 26-11-2026): ilustraciones hechas con
   * IA, cada persona en dos posturas (piernas abiertas y juntas) que se
   * alternan al andar (imagenes/gente-<id>-1.webp y -2.webp, 3x de 28 px de
   * alto, alineadas por la cabeza y los pies). vuelve = hacia la izquierda,
   * en espejo. Antes, dibujos de trazos con piernas que giraban.
   */
  const ALTO_PERSONA = 28;
  const PERSONAS = [
    { id: 'abuela', ancho: 19 },
    { id: 'perro', ancho: 30.67, vuelve: true },
    { id: 'coleta', ancho: 20.33 },
    { id: 'abuelo', ancho: 16.33, vuelve: true, despacio: true },
    { id: 'chaval', ancho: 18.67, vuelve: true },
    { id: 'sudadera', ancho: 18.33 }
  ];
  function personas() {
    return PERSONAS.map(function (p, i) {
      const pose = function (k) {
        return '<image class="esc-pose esc-pose-' + k + '" href="imagenes/gente-' + p.id + '-' + k + '.webp" x="0" y="0" width="' +
          p.ancho + '" height="' + ALTO_PERSONA + '"/>';
      };
      return '<svg class="esc-persona esc-persona-' + (i + 1) + (p.vuelve ? ' vuelve' : '') + (p.despacio ? ' despacio' : '') +
        ' an-persona" width="' + p.ancho + '" height="' + ALTO_PERSONA + '" viewBox="0 0 ' + p.ancho + ' ' + ALTO_PERSONA +
        '" aria-hidden="true" focusable="false">' + pose(1) + pose(2) + '</svg>';
    }).join('');
  }

  /*
   * Repartidores en bici con su mochila de reparto: Uber Eats (verde) y
   * Just Eat (naranja), uno en cada sentido (Iván, 20-11-2026: «es un juego
   * personal»). Va por la calzada, más rápido que la
   * gente; las bielas giran. Bici con radios, cadena, sillín, guardabarros y
   * manillar.
   */
  /*
   * Repartidores en bici (Iván, 26-11-2026): ilustración hecha con IA, la misma
   * bici con la mochila naranja (Just Eat) o verde (Uber Eats, recoloreada).
   * Los radios se quitaron del dibujo y se dibujan aquí, detrás, girando (Iván:
   * el neumático es liso y no se nota que no gira). El nombre, encima de la
   * mochila. El que va hacia la izquierda, en espejo salvo el texto.
   */
  const REPARTIDORES = [
    { clase: 'uber', texto: ['Uber', 'Eats'], imagen: 'imagenes/bici-verde.webp' },
    { clase: 'justeat', texto: ['Just', 'Eat'], imagen: 'imagenes/bici-naranja.webp', vuelve: true }
  ];
  // Medidas en unidades del svg (40 de alto): dibujo, ruedas y mochila.
  // Ruedas: centro y radio de los radios (el neumático sigue en el dibujo;
  // los radios se quitaron de él y se dibujan aquí, detrás, para que giren).
  const BICI = { ancho: 43.74, alto: 40, ruedas: [[8.653, 31.734], [35.448, 31.721]], radio: 7.04, mochila: [12.7, 7.4, 21] };
  const RADIOS_BICI = 12;
  function repartidor(r, i) {
    const espejo = r.vuelve ? ' transform="translate(' + BICI.ancho + ' 0) scale(-1 1)"' : '';
    const ruedas = BICI.ruedas.map(function (c) {
      let d = '';
      for (let k = 0; k < RADIOS_BICI; k++) {
        const ang = k * 2 * Math.PI / RADIOS_BICI;
        d += 'M' + c[0] + ' ' + c[1] + 'L' + (c[0] + BICI.radio * Math.cos(ang)).toFixed(2) + ' ' + (c[1] + BICI.radio * Math.sin(ang)).toFixed(2);
      }
      return '<g class="an-rueda"><circle class="esc-eje" cx="' + c[0] + '" cy="' + c[1] + '" r="' + BICI.radio + '"/>' +
        '<path class="esc-bici-radios-img" d="' + d + '"/></g>';
    }).join('');
    const mx = r.vuelve ? BICI.ancho - BICI.mochila[0] : BICI.mochila[0];
    const giro = 'rotate(' + (r.vuelve ? -BICI.mochila[2] : BICI.mochila[2]) + ' ' + mx + ' ' + BICI.mochila[1] + ')';
    return '<svg class="esc-bici esc-bici-' + (i + 1) + (r.vuelve ? ' vuelve' : '') + ' an-bici" width="44" height="40" viewBox="0 0 ' +
      BICI.ancho + ' ' + BICI.alto + '" aria-hidden="true" focusable="false">' +
      '<g' + espejo + '>' + ruedas +
      '<image class="esc-bici-img" href="' + r.imagen + '" x="0" y="0" width="' + BICI.ancho + '" height="' + BICI.alto + '"/></g>' +
      // El nombre de la mochila, sin espejo para que se lea.
      '<g class="esc-mochila-' + r.clase + '" transform="' + giro + '">' +
      '<text class="esc-mochila-texto" x="' + mx + '" y="' + (BICI.mochila[1] - 0.4) + '" text-anchor="middle">' + r.texto[0] + '</text>' +
      '<text class="esc-mochila-texto" x="' + mx + '" y="' + (BICI.mochila[1] + 2.6) + '" text-anchor="middle">' + r.texto[1] + '</text>' +
      '</g></svg>';
  }

  /*
   * Autobús articulado de la EMT (Iván, 20-11-2026, con una foto de
   * referencia; va hacia la izquierda, así que el morro está a la izquierda):
   * techo blanco con los equipos de aire, banda negra de ventanillas, cuerpo
   * azul claro y faldón gris, fuelle de la articulación, tres puertas con
   * pasamanos amarillos, letreros LED (frontal y lateral), retrovisor de brazo,
   * faros, matrícula, rótulo «EMT 573» y llantas azules. Va en sentido
   * contrario al taxi y por el carril de detrás (en España se circula por la
   * derecha). De noche se encienden las ventanillas.
   */
  /*
   * El autobús articulado de la EMT (Iván, 26-11-2026): ilustración hecha con
   * IA (imagenes/autobus.webp, 800 × 189), con sus tres llantas recortadas
   * encima para que giren y los letreros LED de la línea 34 dibujados aquí
   * (la imagen no lleva texto). Medidas en las unidades del svg de antes; se
   * ve un 15 % más grande (267 × 69 px; Iván, 26-11-2026).
   */
  const BUS = { x: 0, ancho: 246, suelo: 65.5, aspecto: 800 / 189 };
  const RUEDAS_BUS = [[0.15025, 0.73122, 0.05125, 0.21693], [0.42975, 0.73122, 0.05125, 0.21693], [0.78912, 0.73122, 0.05125, 0.21693]];
  function autobus() {
    const alto = BUS.ancho / BUS.aspecto;
    const y0 = BUS.suelo - alto;
    // De la imagen (800 px de ancho) al svg.
    const px = function (v) { return (v * BUS.ancho / 800).toFixed(2); };
    const py = function (v) { return (y0 + v * BUS.ancho / 800).toFixed(2); };
    const ruedas = RUEDAS_BUS.map(function (c, i) {
      return '<g class="an-rueda"><image href="imagenes/autobus-rueda-' + (i + 1) + '.webp" x="' + (BUS.x + c[0] * BUS.ancho).toFixed(2) +
        '" y="' + (y0 + c[1] * alto).toFixed(2) + '" width="' + (c[2] * BUS.ancho).toFixed(2) + '" height="' + (c[3] * alto).toFixed(2) + '"/></g>';
    }).join('');
    return '<svg class="esc-bus an-bus" width="267" height="69" viewBox="-4 0 254 66" aria-hidden="true" focusable="false">' +
      '<ellipse class="esc-sombra-coche" cx="122" cy="65" rx="124" ry="1.8"/>' +
      '<image class="esc-bus-img" href="imagenes/autobus.webp" x="' + BUS.x + '" y="' + y0.toFixed(2) + '" width="' + BUS.ancho +
      '" height="' + alto.toFixed(2) + '"/>' +
      // Letreros LED: el de delante, encima del parabrisas, y el lateral.
      '<rect class="esc-bus-letrero" x="' + px(14) + '" y="' + py(25) + '" width="' + px(46) + '" height="' + px(14) + '" rx="0.5"/>' +
      '<text class="esc-bus-linea" x="' + px(37) + '" y="' + py(35.6) + '" text-anchor="middle">34</text>' +
      '<rect class="esc-bus-letrero" x="' + px(108) + '" y="' + py(26) + '" width="' + px(122) + '" height="' + px(12) + '" rx="0.5"/>' +
      '<text class="esc-bus-linea esc-bus-linea-chica" x="' + px(169) + '" y="' + py(35) + '" text-anchor="middle">34 LAS ÁGUILAS</text>' +
      ruedas + '</svg>';
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
    // Orden de delante a detrás: lo último tapa a lo anterior. Carril de detrás
    // (hacia la izquierda): la bici de Just Eat y el autobús; de delante (hacia
    // la derecha): el taxi y la bici de Uber Eats.
    contenedor.innerHTML = escena() + nubes() + personas() + repartidor(REPARTIDORES[1], 1) + autobus() + taxi() +
      repartidor(REPARTIDORES[0], 0) + hojas() + lluvia();
  }

  /*
   * El taxi que pasa es de uno de los modelos de tu flota (Iván, 26-11-2026):
   * si tienes un Tesla o un Mercedes, a veces pasa ese. Se elige al empezar
   * cada pasada (animationiteration). Es adorno: Math.random vale aquí.
   */
  let modelosFlota = [];
  let modeloTaxi = null;   // el de la pasada en curso
  function ponerModeloTaxi(contenedor) {
    if (!modelosFlota.length) return;
    // Otro coche que el de la pasada anterior, si tu flota tiene más de un modelo.
    const otros = modelosFlota.filter(function (id) { return id !== modeloTaxi; });
    const lista = otros.length ? otros : modelosFlota;
    vestirTaxi(contenedor, lista[Math.floor(Math.random() * lista.length)]);
  }

  /* Cielo según la hora; de noche, luna, estrellas, ventanas encendidas y faros. */
  function dibujar(contenedor, estado) {
    const dibujo = contenedor.querySelector('svg.esc-calle:not(.esc-capa-lluvia)');
    if (!dibujo) return;
    const modelos = Libre.config.vehiculos.modelos;
    const lista = estado.licencias.filter(function (l) { return l.vehiculo && modelos[l.vehiculo] && modelos[l.vehiculo].imagen; })
      .map(function (l) { return l.vehiculo; });
    const nueva = lista.length ? lista : [Libre.config.vehiculos.modeloInicial];
    if (nueva.join('|') !== modelosFlota.join('|')) {
      const antes = modelosFlota.length;
      modelosFlota = nueva;
      if (!antes) ponerModeloTaxi(contenedor);
    }
    const taxi = contenedor.querySelector('.esc-taxi');
    if (taxi && !taxi.dataset.escucha) {
      taxi.dataset.escucha = '1';
      // Solo al acabar la pasada del taxi: las ruedas también lanzan
      // animationiteration (cada vuelta) y el evento sube hasta aquí.
      taxi.addEventListener('animationiteration', function (ev) {
        if (ev.target === taxi) ponerModeloTaxi(contenedor);
      });
    }
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
    const llueve = Libre.sim.lloviendo(estado, minutos);
    contenedor.classList.toggle('lloviendo', llueve);
    contenedor.classList.toggle('tormenta', llueve && !!estado.lluvia && estado.lluvia.tipo === 'tormenta');
    contenedor.dataset.momento = noche ? 'noche' : 'dia';
  }

  Libre.ambiente = { montar, dibujar };
})(globalThis);
