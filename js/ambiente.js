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

  // Ventanas del perfil (x, y), de la maqueta.
  const VENTANAS = [
    [10, 150], [10, 166], [26, 150], [26, 182], [40, 150], [40, 166],
    [308, 150], [308, 182], [322, 150], [322, 166], [336, 166], [336, 182],
    [352, 150], [352, 166], [368, 150], [368, 182]
  ];
  // Estrellas de un tramo (x, y), de la maqueta.
  const ESTRELLAS = [[30, 30], [74, 58], [126, 24], [170, 66], [214, 28], [262, 70], [352, 98], [58, 96], [246, 100]];

  /*
   * Un árbol con más detalle (Iván, 20-11-2026): tronco con una rama, copa
   * de tres bolas, una sombra por debajo y un brillo arriba. (x, suelo, r).
   */
  function arbol(x, suelo, r) {
    const cy = suelo - r * 1.45;
    return '<path class="esc-tronco" d="M' + (x - 2.2) + ' ' + suelo + 'L' + (x - 1.4) + ' ' + (cy + 2) + 'h2.8L' + (x + 2.2) + ' ' + suelo +
      'zM' + x + ' ' + (cy + r * 0.7) + 'l' + (r * 0.45) + ' ' + (-r * 0.45) + 'l1 1z"/>' +
      '<circle class="esc-copa-oscura" cx="' + (x + r * 0.35) + '" cy="' + (cy + r * 0.25) + '" r="' + (r * 0.8) + '"/>' +
      '<circle class="esc-copa" cx="' + (x - r * 0.35) + '" cy="' + (cy + r * 0.15) + '" r="' + (r * 0.78) + '"/>' +
      '<circle class="esc-copa" cx="' + x + '" cy="' + (cy - r * 0.35) + '" r="' + (r * 0.8) + '"/>' +
      '<circle class="esc-copa-clara" cx="' + (x - r * 0.25) + '" cy="' + (cy - r * 0.55) + '" r="' + (r * 0.32) + '"/>';
  }

  /* Un tramo del perfil: edificios, ventanas y árboles. */
  function tramo() {
    return '<path class="esc-lejos" d="M0 150V120h28v-18h22v30h26v-24h30v34h24v-14h34v28h30v-22h28v30h30v-20h34v22h40v50H0z"/>' +
      '<path class="esc-medio" d="M0 170V132h36v-20h30v44h28v-30h38v54h30v-26h34v34h30v-40h36v36h28v-18h34V200H0z"/>' +
      '<path class="esc-cerca" d="M0 200V160h52v-12h34v52zM300 200v-52h42v-14h48v66z"/>' +
      VENTANAS.map(function (v, i) {
        return '<rect class="esc-ventana ' + (i % 3 === 1 ? 'an-v2' : 'an-v1') + '" x="' + v[0] + '" y="' + v[1] +
          '" width="8" height="9" rx="1.5"/>';
      }).join('') +
      arbol(98, 198, 13) + arbol(264, 198, 13);
  }

  /*
   * El tramo del centro, el que se ve en el móvil (Iván, 20-11-2026): Madrid
   * reconocible, en siluetas planas con los colores de la escena. Al fondo,
   * las Cuatro Torres (izquierda), Torrespaña («el Pirulí») y las Torres KIO
   * (derecha); en medio, el edificio Metrópolis con su cúpula y la Victoria,
   * y Telefónica; delante, la Puerta de Alcalá, árboles y casas con ventanas.
   */
  function tramoCentro() {
    let v = '';
    const ventana = function (x, y, i) {
      return '<rect class="esc-ventana ' + (i % 3 === 1 ? 'an-v2' : 'an-v1') + '" x="' + x + '" y="' + y + '" width="6" height="7" rx="1"/>';
    };
    // Fondo: perfil bajo de la ciudad.
    v += '<path class="esc-lejos" d="M0 160V136h20v-10h18v18h22v-8h40v12h30v-16h26v20h40v-10h34v14h30v-12h36v8h34v-14h30v18h30V200H0z"/>';
    // Cuatro Torres: Cepsa (con su arco arriba), PwC, Cristal y Espacio.
    v += '<path class="esc-lejos" fill-rule="evenodd" d="M6 136V64h16v72zM9 68v8h10v-8z"/>' +
      '<path class="esc-lejos" d="M27 136V58c0-4 3-6 7-6s7 2 7 6v78z"/>' +
      '<path class="esc-lejos" d="M46 136V50l16-6v92z"/>' +
      '<path class="esc-lejos" d="M67 136V70c4-6 10-8 14-10v76z"/>';
    // Torrespaña: el mástil con su cabeza.
    v += '<path class="esc-lejos" d="M282 140V96h3V70h1V52h1v18h1v26h3v44z"/>' +
      '<rect class="esc-lejos" x="278" y="92" width="17" height="8" rx="3"/>';
    // Torres KIO: inclinadas la una hacia la otra.
    v += '<path class="esc-lejos" d="M332 150l10-62h14l-10 62z"/><path class="esc-lejos" d="M372 150l-10-62h-14l10 62z"/>';
    // En medio: casas, Telefónica (escalonada) y el Metrópolis.
    v += '<path class="esc-medio" d="M0 170V146h30v-8h26v32h28v-20h34v20h22V200H0z"/>' +
      '<path class="esc-medio" d="M232 200V130h6v-10h6v-12h4v12h6v10h6v70z"/>' +
      '<path class="esc-medio" d="M262 200V150h30v-8h28v58z"/>';
    // Metrópolis: torre redonda, cúpula oscura, linterna y la Victoria dorada.
    v += '<path class="esc-medio" d="M156 200V132c0-6 4-10 10-10h16c6 0 10 4 10 10v68z"/>' +
      '<path class="esc-cerca" d="M158 124c0-12 8-20 16-20s16 8 16 20z"/>' +
      '<rect class="esc-cerca" x="171" y="96" width="6" height="9" rx="1"/>' +
      '<path class="esc-ventana" d="M172 96l2-8 2 8zM169 90l5-2 5 2-5 1z"/>' +
      '<path class="esc-cerca" d="M156 140h36v1.2h-36zM156 152h36v1.2h-36zM156 164h36v1.2h-36z"/>';
    for (let y = 144, i = 0; y < 196; y += 12) {
      v += ventana(160, y, i++) + ventana(171, y, i++) + ventana(182, y, i++);
    }
    // Telefónica: ventanas en columna.
    for (let y = 134, i = 1; y < 196; y += 11) v += ventana(239, y, i++) + ventana(247, y, i++);
    // Delante: la Puerta de Alcalá (cinco vanos, frontón y remate).
    v += '<g class="esc-puerta">' +
      '<path class="esc-acera" d="M88 198v-30h-4v-4h78v4h-4v30z"/>' +
      '<path class="esc-acera" d="M100 164v-4h46v4zM112 160l11-8 11 8z"/>' +
      '<path class="esc-cerca" d="M93 198v-14h7v14zM104 198v-18a4 4 0 0 1 8 0v18zM119 198v-20a4 4 0 0 1 8 0v20zM134 198v-18a4 4 0 0 1 8 0v18zM146 198v-14h7v14z"/>' +
      '</g>';
    // Casas de delante con ventanas, a los lados.
    v += '<path class="esc-cerca" d="M0 200V162h44v-10h30v48zM300 200v-46h40v-12h50v58z"/>';
    [[8, 168], [8, 182], [22, 168], [36, 182], [50, 160], [62, 174], [306, 162], [306, 178], [320, 170], [346, 150],
      [346, 166], [360, 150], [360, 182], [374, 166]].forEach(function (p, i) { v += ventana(p[0], p[1], i); });
    // Árboles.
    v += arbol(78, 198, 10) + arbol(208, 198, 13) + arbol(290, 198, 9);
    return v;
  }

  function escena() {
    let tramos = '';
    let estrellas = '';
    for (let i = 0; i < TRAMOS; i++) {
      tramos += '<g transform="translate(' + (i * TRAMO) + ' 0)">' + (i === 2 ? tramoCentro() : tramo()) + '</g>';
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
      '<circle class="esc-sol an-sol" cx="' + (CENTRO + 250) + '" cy="74" r="46"/>' +
      '<circle class="esc-sol" cx="' + (CENTRO + 250) + '" cy="74" r="28"/></g>' +
      '<g class="esc-noche"><g class="esc-estrellas">' + estrellas + '</g>' +
      '<circle class="esc-luna" cx="' + (CENTRO + 250) + '" cy="62" r="24" mask="url(#esc-creciente)"/></g>' +
      tramos +
      '<rect class="esc-acera" x="0" y="198" width="' + ANCHO + '" height="8"/>' +
      '<rect class="esc-asfalto" x="0" y="206" width="' + ANCHO + '" height="44"/>' +
      '<path class="esc-raya" d="' + rayas() + '"/>' +
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
  function taxi() {
    // 15 % más grande que el dibujo (Iván, 20-11-2026): 150 × 58 en vez de 130 × 50.
    return '<svg class="esc-taxi an-taxi" width="150" height="58" viewBox="0 -20 130 50" aria-hidden="true" focusable="false">' +
      '<defs><radialGradient id="esc-faro"><stop offset="0" class="esc-faro-centro"/><stop offset="1" class="esc-faro-borde"/></radialGradient></defs>' +
      // Brillo de los faros de noche: degradado que se pierde (no una mancha).
      '<ellipse class="esc-brillo" cx="122" cy="13" rx="22" ry="8" fill="url(#esc-faro)"/>' +
      // Sombra en el suelo; carrocería de berlina (Corolla como referencia).
      '<ellipse class="esc-sombra-coche" cx="52" cy="28.4" rx="52" ry="2"/>' +
      '<path class="esc-carroceria" d="M1.5 21.5 L0.5 11 Q0.5 6.4 2.8 5.7 L10.5 4.5 C16 3.6 22 0.4 27.5 -2.4 C33.5 -4.6 46 -4.7 54 -3.7 C60.5 -3 66 0.2 75.4 5.4 L92 8.6 C98.5 9.7 102.5 11 103.6 13.6 L104 19 Q104 23 101.5 23.2 L92.4 23.2 A8.4 8.4 0 0 0 75.6 23.2 L29.9 23.2 A8.4 8.4 0 0 0 13.1 23.2 L3.6 23.2 Q1.7 23 1.5 21.5 Z"/>' +
      // Ventanillas, pilar trasero, líneas de puertas, nervio y estribo.
      '<path class="esc-cristal" d="M73.4 6.2 C66 1.6 61 -1.3 54.5 -2.3 L49.6 -2.6 L49.6 5.5 Z"/>' +
      '<path class="esc-cristal" d="M47.4 5.4 L47.4 -2.7 L40 -2.8 C35 -2.6 31.6 -1.4 28.6 0.6 L25.6 4.9 Z"/>' +
      '<path class="esc-pilar" d="M30 5.2 L31.2 -0.4 L33.6 -1.5 L32.6 5.2 Z"/>' +
      '<path class="esc-linea" d="M74.8 6.6 C74.4 12 74.2 18 74.6 23 M48.5 5.4 V23 M24.6 5 C25.6 11 26.6 16 27.4 21.5 M73.6 11.4 C58 10.6 38 9.6 12 8.4 M30.5 21.8 H75"/>' +
      // Franja roja del taxi de Madrid en la puerta delantera.
      '<path class="esc-franja" d="M55.2 6 h5.6 l8.2 16.8 h-5.6 z"/>' +
      '<rect class="esc-maneta" x="51" y="8.4" width="4.4" height="1.4" rx="0.7"/>' +
      '<rect class="esc-maneta" x="27.2" y="7.4" width="4.4" height="1.4" rx="0.7"/>' +
      '<path class="esc-retrovisor" d="M68.4 4 h3.8 q1.1 0 1.1 1.1 v1.3 h-4.9 z"/>' +
      '<path class="esc-faro" d="M88.6 9.3 L101.6 11.6 L102.8 13.2 L90.4 12.2 Z"/>' +
      '<path class="esc-trasero" d="M1.2 6.5 L11.2 5.6 L9.8 8.6 L1 9.8 Z"/>' +
      '<rect class="esc-cartel" x="37.5" y="-9.2" width="12.5" height="4.6" rx="1.4"/>' +
      // Módulo del techo con la luz verde de libre.
      '<circle class="esc-piloto" cx="47.6" cy="-6.9" r="1.4"/>' +
      '<g><circle class="esc-rueda" cx="84" cy="21.2" r="6.8"/><circle class="esc-llanta" cx="84" cy="21.2" r="4.3"/><path class="esc-radios" d="M84 17.2 V25.2 M80 21.2 H88 M81.2 18.4 L86.8 24 M86.8 18.4 L81.2 24"/><circle class="esc-buje" cx="84" cy="21.2" r="1.1"/></g>' +
      // Ruedas con llanta de radios.
      '<g><circle class="esc-rueda" cx="21.5" cy="21.2" r="6.8"/><circle class="esc-llanta" cx="21.5" cy="21.2" r="4.3"/><path class="esc-radios" d="M21.5 17.2 V25.2 M17.5 21.2 H25.5 M18.7 18.4 L24.3 24 M24.3 18.4 L18.7 24"/><circle class="esc-buje" cx="21.5" cy="21.2" r="1.1"/></g>' +
      '</svg>';
  }

  /*
   * Gente que pasea por la acera (Iván, 20-11-2026): tres personas en
   * dibujos aparte que cruzan despacio; las piernas y los brazos se mueven.
   * Colores de los retratos (piel, ropa, pelo). Una va con su perro.
   */
  const PERSONAS = [
    { piel: 2, ropa: 2, pelo: 'castano', pantalon: 6, bolso: true },
    { piel: 4, ropa: 1, pelo: 'negro', pantalon: 4, perro: true },
    { piel: 1, ropa: 5, pelo: 'rubio', pantalon: 1 }
  ];
  function personas() {
    return PERSONAS.map(function (p, i) {
      const perro = p.perro ? '<g class="esc-perro"><ellipse cx="22" cy="23" rx="4.2" ry="2.2"/><circle cx="26" cy="21" r="1.8"/>' +
        '<path class="an-pata" d="M19.5 24.5v2.8M24.5 24.5v2.8"/><path d="M17.6 22.4l-1.6-1.4"/></g>' +
        '<path class="esc-correa" d="M12.6 14.6Q19 18 24.5 20.6"/>' : '';
      return '<svg class="esc-persona esc-persona-' + (i + 1) + ' an-persona" width="' + (p.perro ? 32 : 20) + '" height="30" viewBox="0 0 ' +
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
   * Un repartidor en bici con su mochila verde de reparto (Iván, 20-11-2026;
   * sin logotipos de marcas reales). Va por la calzada, más rápido que la
   * gente; los pedales giran.
   */
  function repartidor() {
    return '<svg class="esc-bici an-bici" width="40" height="34" viewBox="0 0 40 34" aria-hidden="true" focusable="false">' +
      // Ruedas y cuadro.
      '<g class="esc-bici-cuadro"><circle cx="9" cy="26" r="6.2"/><circle cx="31" cy="26" r="6.2"/>' +
      '<path d="M9 26l7-10h11l4 10M16 16l4 10h-11M27 16l-1.4-4h3M20 26l-3.6-12h-2.6"/></g>' +
      // Piernas pedaleando (giran con el pedal).
      '<g class="an-pedal"><path class="esc-bici-pierna" d="M20 26l-2-6"/><path class="esc-bici-pierna" d="M20 26l2 5"/></g>' +
      '<path class="r-ropa-6" d="M15.4 15.8l2.6 5 2.2-1.2-2.4-5.2z"/>' +
      // Cuerpo inclinado, brazo al manillar y cabeza con casco.
      '<path class="r-ropa-1" d="M14 15.4c0-4 2.4-7.4 6-7.4l2.4 1.6c-2 2-3 4.4-3.2 7z"/>' +
      '<path class="r-ropa-1" d="M20.6 9.6l6.8 3-0.8 1.6-6.6-2.4z"/>' +
      '<circle class="r-piel-3" cx="23.4" cy="5.6" r="2.6"/>' +
      '<path class="esc-casco" d="M20.6 5.4c0-2.6 1.6-4 3.4-4s3.2 1.2 3.4 3.2z"/>' +
      // Mochila de reparto: caja verde con su franja.
      '<rect class="esc-mochila" x="8.4" y="4.6" width="9" height="9.4" rx="1.4" transform="rotate(-14 13 9)"/>' +
      '<rect class="esc-mochila-franja" x="8.6" y="8.4" width="8.6" height="1.6" transform="rotate(-14 13 9)"/>' +
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
    contenedor.innerHTML = escena() + nubes() + personas() + repartidor() + taxi() + hojas();
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
    const llueve = Libre.sim.lloviendo(estado, minutos);
    contenedor.classList.toggle('lloviendo', llueve);
    contenedor.classList.toggle('tormenta', llueve && !!estado.lluvia && estado.lluvia.tipo === 'tormenta');
    contenedor.dataset.momento = noche ? 'noche' : 'dia';
  }

  Libre.ambiente = { montar, dibujar };
})(globalThis);
