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
      '<pattern id="esc-gotas" width="40" height="40" patternUnits="userSpaceOnUse">' +
      '<path class="esc-gota" d="M8 4l-2 6M28 14l-2 6M18 26l-2 6M36 32l-2 6"/></pattern>' +
      // Tormenta: más gotas y más largas, inclinadas por el viento.
      '<pattern id="esc-gotas-fuerte" width="24" height="24" patternUnits="userSpaceOnUse">' +
      '<path class="esc-gota esc-gota-fuerte" d="M8 1l-4 9M20 7l-4 9M14 15l-4 9M3 17l-3 6"/></pattern>' +
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
   * Gente que pasea por la acera (Iván, 20-11-2026): tres personas en
   * dibujos aparte que cruzan despacio; las piernas y los brazos se mueven.
   * Colores de los retratos (piel, ropa, pelo). Una va con su perro.
   */
  // Iván, 20-11-2026: más gente, en los dos sentidos (vuelve = hacia la izquierda).
  const PERSONAS = [
    { piel: 2, ropa: 2, pelo: 'castano', pantalon: 6, bolso: true },
    { piel: 4, ropa: 1, pelo: 'negro', pantalon: 4, perro: true, vuelve: true },
    { piel: 1, ropa: 5, pelo: 'rubio', pantalon: 1 },
    { piel: 3, ropa: 3, pelo: 'gris', pantalon: 6, vuelve: true },
    { piel: 2, ropa: 4, pelo: 'pelirrojo', pantalon: 1, bolso: true, vuelve: true },
    { piel: 1, ropa: 6, pelo: 'castano', pantalon: 2 }
  ];
  function personas() {
    return PERSONAS.map(function (p, i) {
      // Iván, 21-11-2026: el perro, con más detalle (cuatro patas que giran
      // desde la cadera y pisan el suelo, orejas, cola que se mueve, collar
      // y pelaje). Antes las patas giraban desde la esquina del dibujo y
      // flotaban. Las de cada diagonal van a la vez, como al andar.
      // La correa va antes que el perro: la tapa la cabeza y llega al collar.
      const perro = p.perro ? '<path class="esc-correa" d="M12.6 14.6Q19 17.6 25.2 19.9"/><g class="esc-perro">' +
        '<path class="pata pata-lejos pata-atras an-pata" d="M19.2 23.4v3.6"/><path class="pata pata-lejos pata-delante an-pata2" d="M23.9 23.4v3.6"/>' +
        '<path class="esc-perro-cola an-cola" d="M17.8 21.6q-1.8-.6-2-3"/>' +
        '<path class="esc-perro-cuerpo" d="M17.4 22.2c0-1.6 1.2-2.2 3.2-2.2h3.6c1.2 0 1.8.8 1.8 2 0 1.4-.8 2.2-2.2 2.2h-4.6c-1.2 0-1.8-.8-1.8-2z"/>' +
        '<path class="esc-perro-claro" d="M19.4 24.1c1.2.4 3 .4 4.4 0"/>' +
        '<path class="esc-perro-pelo" d="M19 20.6l.5-.6M20.4 20.4l.5-.6M21.8 20.4l.5-.6M18 23.4l-.6.5"/>' +
        '<path class="pata pata-atras an-pata2" d="M18.4 23.4v3.6"/><path class="pata pata-delante an-pata" d="M24.8 23.4v3.6"/>' +
        '<circle class="esc-perro-cuerpo" cx="26.4" cy="19.4" r="2"/>' +
        '<ellipse class="esc-perro-claro" cx="28.3" cy="20.2" rx="1.4" ry="0.95"/>' +
        '<circle class="esc-perro-nariz" cx="29.5" cy="19.9" r="0.5"/>' +
        '<circle class="esc-perro-nariz" cx="26.9" cy="18.8" r="0.35"/>' +
        '<path class="esc-perro-oreja" d="M25.2 17.9c-.9.2-1.3 1.4-1 2.8.5.2 1 0 1.3-.6.2-.8.1-1.6-.3-2.2z"/>' +
        '<path class="esc-perro-collar" d="M24.6 19.6q.3 1.6 1 2.2"/></g>' : '';
      return '<svg class="esc-persona esc-persona-' + (i + 1) + (p.vuelve ? ' vuelve' : '') + ' an-persona" width="' + (p.perro ? 32 : 20) + '" height="30" viewBox="0 0 ' +
        (p.perro ? 32 : 20) + ' 30" aria-hidden="true" focusable="false">' +
        '<g class="r-ropa-' + p.pantalon + '"><path class="an-pierna" d="M9 18.5l-2 9h2.2l1.4-9z"/><path class="an-pierna2" d="M11 18.5l2 9h-2.2l-1.4-9z"/></g>' +
        '<path class="r-ropa-' + p.ropa + '" d="M6.6 19.5c0-4.6.6-9 3.4-9s3.4 4.4 3.4 9z"/>' +
        '<path class="r-ropa-' + p.ropa + ' an-brazo" d="M8 11.8l-1.6 6.6h1.6l1.4-6z"/>' +
        '<circle class="r-piel-' + p.piel + '" cx="10" cy="7.2" r="2.8"/>' +
        '<path class="r-pelo-' + p.pelo + '" d="M7.2 6.8c0-2.4 1.4-3.6 2.8-3.6s2.8 1.2 2.8 3.6c-1-.9-4.6-.9-5.6 0z"/>' +
        (p.bolso ? '<rect class="r-ropa-6" x="12.4" y="14" width="3" height="3.4" rx="0.8"/>' : '') +
        perro + '</svg>';
    }).join('');
  }

  /*
   * Repartidores en bici con su mochila de reparto: Uber Eats (verde) y
   * Just Eat (naranja), uno en cada sentido (Iván, 20-11-2026: «es un juego
   * personal»). Va por la calzada, más rápido que la
   * gente; las bielas giran. Bici con radios, cadena, sillín, guardabarros y
   * manillar.
   */
  function rueda(x, y) {
    // Iván, 21-11-2026: el giro no se veía (radios de medio píxel y
    // simétricos). Ahora gira todo un grupo con un reflectante naranja en
    // los radios; el círculo invisible (esc-eje) centra el giro.
    return '<circle class="esc-bici-cubierta" cx="' + x + '" cy="' + y + '" r="7.4"/>' +
      '<circle class="esc-bici-llanta" cx="' + x + '" cy="' + y + '" r="6"/>' +
      '<g class="an-rueda"><circle class="esc-eje" cx="' + x + '" cy="' + y + '" r="6"/>' +
      '<path class="esc-bici-radios" d="M' + (x - 6) + ' ' + y + 'h12M' + x + ' ' + (y - 6) + 'v12M' + (x - 4.2) + ' ' + (y - 4.2) +
      'l8.4 8.4M' + (x + 4.2) + ' ' + (y - 4.2) + 'l-8.4 8.4"/>' +
      '<rect class="esc-reflectante" x="' + (x - 1) + '" y="' + (y - 5.4) + '" width="2" height="3" rx="0.6"/></g>' +
      '<circle class="esc-bici-buje" cx="' + x + '" cy="' + y + '" r="1.1"/>';
  }
  // Repartidores: mochila y sentido (Iván, 20-11-2026: uno de cada).
  const REPARTIDORES = [
    { clase: 'uber', texto: ['Uber', 'Eats'], ropa: 1, piel: 3 },
    { clase: 'justeat', texto: ['Just', 'Eat'], ropa: 5, piel: 1, vuelve: true }
  ];
  function repartidor(r, i) {
    // El que va hacia la izquierda se dibuja en espejo, salvo el texto de la mochila.
    const espejo = r.vuelve ? ' transform="translate(48 0) scale(-1 1)"' : '';
    const giro = r.vuelve ? 'rotate(16 32 9)' : 'rotate(-16 16 9)';
    const cx = r.vuelve ? 31.9 : 16.1;
    return '<svg class="esc-bici esc-bici-' + (i + 1) + (r.vuelve ? ' vuelve' : '') + ' an-bici" width="48" height="40" viewBox="0 0 48 40" aria-hidden="true" focusable="false">' +
      '<g' + espejo + '>' +
      rueda(10, 31) + rueda(38, 31) +
      // Guardabarros, cadena y cuadro.
      '<path class="esc-bici-guarda" d="M2.6 29.4a8 8 0 0 1 12.2-5.8"/>' +
      '<path class="esc-bici-cadena" d="M10 29.6L21 28.2M10 32.4L21 33.2"/>' +
      '<g class="esc-bici-cuadro"><path d="M10 31L21 31L18 19L10 31M18 19L31.4 18.4L21 31M31.4 18.4L32.4 21.6L38 31"/>' +
      '<path d="M31.4 18.4L31 15.2M29.6 15.2h3.6l1.4 1.2"/></g>' +
      '<path class="esc-bici-sillin" d="M15.4 18.2h5.2l-.6 1.2h-4z"/>' +
      '<circle class="esc-bici-plato" cx="21" cy="31" r="2.6"/>' +
      // Pierna de detrás, bielas que giran y pierna de delante.
      '<path class="esc-bici-pierna" d="M18.4 17.4L22.6 22.8L20.4 28.6"/>' +
      '<g class="an-pedal"><path class="esc-bici-biela" d="M21 27.4V34.6M19.4 27.4h3.2M19.4 34.6h3.2"/></g>' +
      '<path class="esc-bici-pierna" d="M18.4 17.4L24 21.6L21.8 33"/>' +
      // Cuerpo inclinado, brazo al manillar y cabeza con casco.
      '<path class="r-ropa-' + r.ropa + '" d="M16.4 18.6c-.4-5 2.4-9.6 7-10.4l2.6 2c-2.6 2.2-4 5.2-4.4 8.4z"/>' +
      '<path class="esc-bici-brazo r-trazo-' + r.ropa + '" d="M23.4 10.6L29 13.8L32.6 15.2"/>' +
      '<circle class="r-piel-' + r.piel + '" cx="27.2" cy="6.6" r="2.8"/>' +
      '<path class="esc-casco" d="M24.2 6.4c0-2.8 1.8-4.4 3.8-4.4s3.6 1.4 3.8 3.6z"/>' +
      '</g>' +
      // Mochila de reparto con su nombre (sin espejo, para que se lea).
      '<g class="esc-mochila-' + r.clase + '" transform="' + giro + '">' +
      '<rect class="esc-mochila" x="' + (cx - 6.7) + '" y="2.6" width="13.4" height="12.4" rx="1.6"/>' +
      '<rect class="esc-mochila-franja" x="' + (cx - 6.7) + '" y="2.6" width="13.4" height="2.4" rx="1.2"/>' +
      '<text class="esc-mochila-texto" x="' + cx + '" y="9.4" text-anchor="middle">' + r.texto[0] + '</text>' +
      '<text class="esc-mochila-texto" x="' + cx + '" y="13.2" text-anchor="middle">' + r.texto[1] + '</text>' +
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
  function autobus() {
    // Huecos de cristal de la banda negra (Iván, 20-11-2026: que se vea un poco
    // lo de detrás): la banda se dibuja con agujeros y los cristales encima,
    // semitransparentes.
    const huecosBanda = [];
    const ventanas = function (desde, hasta, huecos) {
      let v = '';
      for (let x = desde; x + 19 <= hasta - 2; x += 21) {
        if (huecos.some(function (h) { return x + 19 > h[0] && x < h[1]; })) continue;
        v += '<rect class="esc-bus-ventana" x="' + x + '" y="14" width="19" height="20" rx="1.4"/>';
        huecosBanda.push('M' + x + ' 14h19v20h-19z');
      }
      return v;
    };
    const puerta = function (x) {
      return '<g class="esc-bus-puerta"><rect x="' + x + '" y="13.4" width="13" height="42" rx="1"/>' +
        '<path class="esc-bus-hojas" d="M' + (x + 6.5) + ' 13.4V55.4"/>' +
        '<path class="esc-bus-pasamanos" d="M' + (x + 3) + ' 18V52M' + (x + 10) + ' 18V52"/></g>';
    };
    const ruedaBus = function (x) {
      // Cinco tuercas alrededor del buje: son lo que se ve girar (Iván,
      // 21-11-2026). El círculo invisible (esc-eje) centra el giro.
      let tuercas = '<circle class="esc-eje" cx="' + x + '" cy="57" r="5.2"/>';
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + k * 2 * Math.PI / 5;
        tuercas += '<circle cx="' + (x + 3.2 * Math.cos(a)).toFixed(2) + '" cy="' + (57 + 3.2 * Math.sin(a)).toFixed(2) + '" r="1"/>';
      }
      return '<circle class="esc-rueda" cx="' + x + '" cy="57" r="8.4"/><circle class="esc-bus-llanta" cx="' + x + '" cy="57" r="5.2"/>' +
        '<g class="esc-bus-tuercas an-rueda">' + tuercas + '</g>' +
        '<circle class="esc-buje" cx="' + x + '" cy="57" r="1.6"/>';
    };
    const ventanasHtml = ventanas(36, 118, [[60, 74]]) + ventanas(130, 246, [[150, 164]]);
    // Agujeros de la banda: ventanillas, parabrisas y la parte alta de las puertas.
    const bandaHuecos = huecosBanda.join('') + 'M5.6 17H20V35H5.6z' +
      [22, 61, 151].map(function (x) { return 'M' + x + ' 13.4h13v22.6h-13z'; }).join('');
    let fuelle = '';
    for (let x = 119.6; x < 127; x += 1.8) fuelle += 'M' + x + ' 9V55';
    return '<svg class="esc-bus an-bus" width="232" height="60" viewBox="-4 0 254 66" aria-hidden="true" focusable="false">' +
      '<ellipse class="esc-sombra-coche" cx="122" cy="65" rx="124" ry="1.8"/>' +
      // Techo blanco y equipos de aire acondicionado.
      '<rect class="esc-bus-techo" x="30" y="1.6" width="44" height="6" rx="2.6"/>' +
      '<rect class="esc-bus-techo" x="150" y="1.6" width="52" height="6" rx="2.6"/>' +
      // Las dos secciones: cuerpo azul (con el techo blanco) y banda negra.
      '<path class="esc-bus-cuerpo" d="M4 50V15Q4 6 12 6H118V50Z"/>' +
      '<path class="esc-bus-cuerpo" d="M128 6H239Q246 6 246 13V50H128Z"/>' +
      '<path class="esc-bus-techo" d="M10 6H118V10H5.4Q6.4 6 10 6ZM128 6H239Q245.6 6 246 10H128Z"/>' +
      '<path class="esc-bus-banda" fill-rule="evenodd" d="M4 11.6h114v24.4H4zM128 11.6h118v24.4H128z' + bandaHuecos + '"/>' +
      // Parabrisas con el letrero de la línea encima.
      '<path class="esc-bus-cristal" d="M5.6 35V18Q5.6 13 10 13H20V35Z"/>' +
      '<rect class="esc-bus-letrero" x="5.6" y="12.6" width="14.4" height="4.6" rx="0.6"/>' +
      '<text class="esc-bus-linea" x="12.8" y="16.2" text-anchor="middle">34</text>' +
      // Ventanillas (sin las puertas) y letrero lateral.
      ventanasHtml +
      '<rect class="esc-bus-letrero" x="36" y="13.6" width="22" height="3.6" rx="0.5"/>' +
      '<text class="esc-bus-linea esc-bus-linea-chica" x="47" y="16.4" text-anchor="middle">34 LAS ÁGUILAS</text>' +
      // Faldón gris con los pasos de rueda.
      '<path class="esc-bus-falda" d="M4 50H118V58.4H110.4A10.4 10.4 0 0 0 89.6 58.4H48.4A10.4 10.4 0 0 0 27.6 58.4H7Q4 58.4 4 55.4Z"/>' +
      '<path class="esc-bus-falda" d="M128 50H246V55.4Q246 58.4 243 58.4H222.4A10.4 10.4 0 0 0 201.6 58.4H128Z"/>' +
      // Fuelle de la articulación.
      '<rect class="esc-bus-fuelle" x="118" y="8" width="10" height="48" rx="1"/>' +
      '<path class="esc-bus-pliegues" d="' + fuelle + '"/>' +
      // Puertas: delantera, la del medio y la de la sección trasera.
      puerta(22) + puerta(61) + puerta(151) +
      // Rótulos, retrovisor de brazo, faro, matrícula y piloto trasero.
      '<text class="esc-bus-rotulo" x="88" y="44" text-anchor="middle">EMT 573</text>' +
      '<text class="esc-bus-rotulo esc-bus-rotulo-chico" x="12" y="44" text-anchor="middle">573</text>' +
      '<path class="esc-bus-retrovisor" d="M6.4 11.6C2 11 -1.6 12.6 -1.6 16.4V23.4H1V17C1 15.2 3 14.2 6.4 14.8Z"/>' +
      '<path class="esc-bus-faro" d="M4 46.6L10.6 47.4V50.6L4 50.4Z"/>' +
      '<rect class="esc-bus-matricula" x="6" y="52.4" width="9" height="2.6" rx="0.4"/>' +
      '<rect class="esc-trasero" x="244" y="38" width="2.4" height="10" rx="1"/>' +
      ruedaBus(38) + ruedaBus(100) + ruedaBus(212) +
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
    // Orden de delante a detrás: lo último tapa a lo anterior. Carril de detrás
    // (hacia la izquierda): la bici de Just Eat y el autobús; de delante (hacia
    // la derecha): el taxi y la bici de Uber Eats.
    contenedor.innerHTML = escena() + nubes() + personas() + repartidor(REPARTIDORES[1], 1) + autobus() + taxi() +
      repartidor(REPARTIDORES[0], 0) + hojas();
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
    const dibujo = contenedor.querySelector('svg.esc-calle');
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
