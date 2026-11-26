/*
 * Libre · interfaz: pestaña Mejoras (el árbol).
 * Parte de Libre.ui (ver la cabecera de js/interfaz.js).
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};
  const ui = Libre.ui = Libre.ui || {};

  ui.nodoAbierto = null;
  ui.enfocarMejora = false;

  /* Iconos de trazo (24 × 24) de cada mejora. */
  const ICONOS_MEJORA = {
    callejero: '<path d="M4 5l5-2 6 2 5-2v16l-5 2-6-2-5 2z"/><path d="M9 3v16M15 5v16"/>',
    limpieza: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    publicidad: '<path d="M3 10v4h4l8 4V6l-8 4z"/><path d="M18 9a4 4 0 0 1 0 6M7 14l1.5 5h3L10 15"/>',
    propinas: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.3c-.4-.9-1.4-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2 0 2.8 5 1.5 5 4.3 0 1.2-1.1 2-2.5 2-1.1 0-2.1-.6-2.5-1.5M12 6v1.8M12 16.2V18"/>',
    datafono: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/>',
    clientesFijos: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14a5 5 0 0 1 4.5 5"/>',
    hoteles: '<path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 11V8.5M10 8.5h4M3 20h18"/>',
    emisora: '<circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
    estaciones: '<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 11h12M9 14h.01M15 14h.01M8.5 21l2-4M15.5 21l-2-4"/>',
    aeropuerto: '<path d="M2.5 15.5l8-3.5V5.5a1.5 1.5 0 0 1 3 0V12l8 3.5V18l-8-2v3.5l2 1.5v1l-3.5-1-3.5 1v-1l2-1.5V16l-8 2z"/>',
    paradaOcio: '<path d="M5 4h14l-7 8zM12 12v7M8 20h8M15 7.5l3-3.5"/>',
    colaBarajas: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    app: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    deflectores: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
    conduccionEficiente: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15zM5 19l7-7"/>',
    neumaticos: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21"/>',
    // Neumático con escudo: resiste los pinchazos.
    // La rueda de los neumáticos con un «+»: la versión mejorada (Iván, 20-11-2026).
    neumaticosAltaGama: '<circle cx="10" cy="14" r="7.5"/><circle cx="10" cy="14" r="2.8"/><path d="M10 6.5v4.7M10 16.8v4.7M2.5 14h4.7M12.8 14h4.7"/><path d="M16.5 4.5h5M19 2v5"/>',
    hibridos: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10v4M12 8.5l-2.5 4h3l-2.5 4"/>',
    // Bombona de gas (GLP).
    glp: '<rect x="6" y="7" width="12" height="14" rx="5"/><path d="M9 7V4h6v3M12 2v2M6 13h12"/>',
    // Climatizador bizona (Iván, 23-11-2026, con una imagen de referencia): una
    // hélice de cuatro aspas dentro de un aro abierto, con líneas de aire.
    climatizador: '<path d="M19.2 8.2A8.5 8.5 0 1 0 19.2 15.8"/><circle cx="11.5" cy="12" r="1.3"/>' +
      [0, 90, 180, 270].map(function (a) {
        return '<path transform="rotate(' + a + ' 11.5 12)" d="M11.5 10.7C10.8 8.6 11.2 6.2 13 5.9c1.6-.2 2 1.6 1.1 3.1-.7 1-1.6 1.6-2.6 1.7z"/>';
      }).join('') + '<path d="M17 5.5h4.5M2.5 18.5h4.5"/>',
    // Máquina de café: una taza humeante.
    cafeCochera: '<path d="M5 10h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z"/><path d="M16 12h1.5a2.5 2.5 0 0 1 0 5H16M8 3c-1 1 1 2 0 4M12 3c-1 1 1 2 0 4"/>',
    mecanico: '<path d="M15 4a4 4 0 0 0-4.5 5.5L4 16l4 4 6.5-6.5A4 4 0 0 0 20 9l-3 1-2-2 1-3z"/>',
    seguridadVial: '<path d="M12 3l9 17H3z"/><path d="M12 10v4M12 17h.01"/>',
    seguroFlota: '<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    esterillas: '<ellipse cx="12" cy="6" rx="6" ry="2.5"/><path d="M6 6v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V6M6 10v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4M6 14v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4"/>',
    jornadaLarga: '<circle cx="11" cy="13" r="8"/><path d="M11 9v4l3 2M18 2v4M16 4h4"/>',
    taquillas: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M12 3v18M7.5 7h2M14.5 7h2M7.5 10h2M14.5 10h2"/>',
    gestionZonas: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    rrhh: '<circle cx="10" cy="8" r="3.5"/><path d="M3 20a7 7 0 0 1 14 0M19.5 8v6M16.5 11h6"/>',
    mampara: '<path d="M7 3.5h4.5a2 2 0 0 1 2 2.2L12.8 13H18a2 2 0 0 1 2 2v3H7.5L5.5 6a2.2 2.2 0 0 1 1.5-2.5z"/><path d="M8 18v3M18 18v3"/>',
    grua: '<path d="M3 17h11V9H8l-3 4H3z"/><path d="M14 13l6-8M20 5v8"/><path d="M20 13a1.5 1.5 0 1 1-1.5 1.5"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="11.5" cy="17.5" r="1.8"/>',
    leasing: '<path d="M4 15l1.5-5h13L20 15v3H4z"/><path d="M7 10l1.5-3h7l1.5 3M7 18v2M17 18v2"/><path d="M9 14h6"/>',
    // Gestoría propia: una carpeta con papeles.
    gestoria: '<path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M8 13h8M8 16h5"/>',
    oficina: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12h18"/>',
    // Tu incógnito: medio volante y las gafas del de incógnito.
    // Sombrero y gafas, como el icono de incógnito de Chrome (Iván, 20-11-2026).
    // Cazatalentos: una lupa con una persona dentro.
    cazatalentos: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.2 15.2L21 21"/><circle cx="10.5" cy="8.8" r="2"/><path d="M7 14c.7-1.6 2-2.4 3.5-2.4s2.8.8 3.5 2.4"/>',
    incognito: '<path d="M2 11h20"/><path d="M5.5 11l1.8-6a1 1 0 0 1 1.3-.6L12 5.6l3.4-1.2a1 1 0 0 1 1.3.6l1.8 6"/><circle cx="7.5" cy="16.5" r="3"/><circle cx="16.5" cy="16.5" r="3"/><path d="M10.5 16.5c1-.7 2-.7 3 0"/>'
  };
  function iconoMejora(id) {
    return '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true">' + (ICONOS_MEJORA[id] || ICONOS_MEJORA.limpieza) + '</svg>';
  }

  /* Estado de un nodo: 'comprada', 'bloqueada', 'disponible' o 'sinDinero'. */
  function estadoNodo(estado, m) {
    if (Libre.sim.faltaParaMejora(estado, m)) return 'bloqueada';
    const siguiente = Libre.sim.siguienteNivel(estado, m.id);
    if (!siguiente) return 'comprada';
    return estado.dinero >= siguiente.precio ? 'disponible' : 'sinDinero';
  }

  function nombreMejora(id) {
    const m = Libre.config.mejoras.find(function (x) { return x.id === id; });
    return m ? m.nombre : id;
  }

  /* ¿Hay alguna mejora que se pueda comprar ya? Para la marca del menú. */
  function hayMejoraComprable(estado) {
    return Libre.config.mejoras.some(function (m) { return estadoNodo(estado, m) === 'disponible'; });
  }

  /* «1.800 €» (sin céntimos): cabe debajo de un nodo. */
  function eurosCorto(n) {
    // Con punto también en los miles de 4 cifras («1.200 €», como el resto del juego).
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
  }

  function htmlNiveles(m, nivel) {
    return m.niveles
      ? '<span class="nodo-niveles" aria-label="Nivel ' + nivel + ' de ' + m.niveles.length + '">' +
        m.niveles.map(function (n, k) { return '<i class="' + (k < nivel ? 'hecho' : '') + '"></i>'; }).join('') + '</span>'
      : '';
  }

  /* Qué hace, el nivel que toca y el botón de comprar (o lo que falta). */
  function htmlFicha(estado, m) {
    const siguiente = Libre.sim.siguienteNivel(estado, m.id);
    let texto = ui.esc(m.descripcion);
    let pie = '';
    const falta = Libre.sim.faltaParaMejora(estado, m);
    if (falta) {
      pie = '<p class="nodo-requisito">' + (falta.sociedad ? 'Antes tienes que montar una SL (en Conductores, al comprar la 4.ª licencia).'
        : falta.licencias ? 'Se abre con tu ' + falta.licencias + '.ª licencia: con una sola, de cada rama solo la primera mejora.'
        : 'Antes necesitas «' + ui.esc(nombreMejora(falta.mejora)) + '».') + '</p>';
    } else if (!siguiente) {
      pie = '<p class="nodo-completa">Comprada' + (m.niveles ? ' entera: los ' + m.niveles.length + ' niveles' : '') + '.</p>';
    } else {
      if (m.niveles) texto += ' Nivel ' + siguiente.nivel + ': ' + ui.esc(siguiente.descripcion);
      pie = ui.boton('<span>' + (m.niveles ? 'Comprar nivel ' + siguiente.nivel : 'Comprar') + '</span><span>' + ui.euros(siguiente.precio) + '</span>',
        'comprarMejora', [m.id], 'ui-boton ui-boton--principal ui-boton--ancho nodo-comprar', siguiente.precio);
    }
    return '<p class="mejora-texto">' + texto + '</p>' + htmlGanadoMejora(estado, m) + pie;
  }

  /*
   * Lo que te ha hecho ganar o ahorrar una mejora comprada (idea 16, Iván
   * 22-11-2026). Solo en las que se puede contar directamente
   * (Libre.sim.cuentaDeMejora); en las demás no sale nada.
   */
  function htmlGanadoMejora(estado, m) {
    const cuenta = Libre.sim.cuentaDeMejora(m.id);
    if (!cuenta || !Libre.sim.nivelMejora(estado, m.id)) return '';
    const antes = (estado.mejorasAntesDeCuenta || []).indexOf(m.id) !== -1;
    return '<div class="mejora-ganado"><span>' + (cuenta === 'ganado' ? 'Te ha hecho ganar' : 'Te ha ahorrado') + '</span>' +
      '<strong id="mejora-ganado">' + ui.euros(Libre.sim.ganadoMejora(estado, m.id)) + '</strong>' +
      '<small>' + (antes ? 'Desde la actualización 93: de antes no se llevaba la cuenta.' : 'Desde que la compraste.') + '</small></div>';
  }

  const ICONO_HECHO = '<svg class="icono icono-hecho" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const ICONO_CANDADO = '<svg class="icono icono-candado" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  /*
   * Nodo: círculo con el icono de la mejora (y una marca: ✓ comprada,
   * candado bloqueada), debajo las rayitas de sus niveles y el precio de lo
   * siguiente. La línea de arriba sale verde si lo anterior ya está comprado.
   */
  function htmlNodo(estado, m) {
    const nivel = Libre.sim.nivelMejora(estado, m.id);
    const siguiente = Libre.sim.siguienteNivel(estado, m.id);
    const unido = !m.requiere || Libre.sim.nivelMejora(estado, m.requiere) > 0;
    return '<li class="nodo' + (unido ? ' unido' : '') + '" data-mejora="' + m.id + '" data-nodo-estado="' + estadoNodo(estado, m) + '">' +
      '<button type="button" class="nodo-boton" data-nodo="' + m.id + '" aria-label="' + ui.esc(m.nombre) +
      (m.niveles ? ', nivel ' + nivel + ' de ' + m.niveles.length : '') + '">' +
      iconoMejora(m.id) + '<span class="nodo-marca">' + ICONO_HECHO + ICONO_CANDADO + '</span></button>' +
      htmlNiveles(m, nivel) +
      '<span class="nodo-precio">' + (siguiente ? eurosCorto(siguiente.precio) : 'Hecha') + '</span></li>';
  }

  /* Hoja con la ficha de la mejora tocada. */
  function htmlHojaMejora(estado) {
    const m = ui.nodoAbierto && Libre.config.mejoras.find(function (x) { return x.id === ui.nodoAbierto; });
    if (!m) return '';
    const rama = Libre.config.ramasMejoras.find(function (r) { return r.id === m.rama; });
    const nivel = Libre.sim.nivelMejora(estado, m.id);
    return '<div class="hoja-fondo" data-cerrar-mejora></div>' +
      '<div class="hoja hoja-mejora" role="dialog" aria-modal="true" aria-labelledby="mejora-titulo" data-mejora="' + m.id +
      '" data-nodo-estado="' + estadoNodo(estado, m) + '">' +
      '<span class="hoja-asa" aria-hidden="true"></span>' +
      '<div class="mejora-cabecera"><span class="mejora-icono">' + iconoMejora(m.id) + '</span>' +
      '<span class="mejora-quien"><h3 id="mejora-titulo">' + ui.esc(m.nombre) + '</h3><span>' + ui.esc(rama ? rama.nombre : '') +
      (m.niveles ? ' · nivel ' + nivel + ' de ' + m.niveles.length : '') + '</span>' + htmlNiveles(m, nivel) + '</span>' +
      ui.botonCerrarHoja('data-cerrar-mejora', 'Cerrar') + '</div>' + htmlFicha(estado, m) + '</div>';
  }

  const seccionMejoras = {
    id: 'sec-mejoras',
    firma: function (estado) {
      return JSON.stringify([ui.nodoAbierto, estado.mejoras]);
    },
    html: function (estado) {
      const c = Libre.config;
      const columnas = c.ramasMejoras.map(function (r) {
        const nodos = c.mejoras.filter(function (m) { return m.rama === r.id; }).map(function (m) {
          return htmlNodo(estado, m);
        }).join('');
        return '<div class="arbol-rama"><span class="arbol-rama-nombre">' + ui.esc(r.corto || r.nombre) + '</span>' +
          '<ol aria-label="' + ui.esc(r.nombre) + '">' + nodos + '</ol></div>';
      }).join('');
      return '<div class="pantalla-titulo"><h2 class="ui-titulo ui-titulo--pantalla">Mejoras</h2>' +
        '<span>' + Object.keys(estado.mejoras).filter(function (k) { return estado.mejoras[k]; }).length + ' de ' + c.mejoras.length + '</span></div>' +
        '<div class="arbol"><div class="arbol-raiz"><img src="docs/logo/libre-icono.svg" alt="Libre"></div>' +
        '<div class="arbol-ramas">' + columnas + '</div></div>' + htmlHojaMejora(estado);
    },
    actualizar: function (estado) {
      // El dinero cambia cada fotograma: el estado de cada nodo se pinta aquí.
      document.querySelectorAll('#sec-mejoras [data-nodo-estado]').forEach(function (el) {
        const m = Libre.config.mejoras.find(function (x) { return x.id === el.dataset.mejora; });
        if (m) el.dataset.nodoEstado = estadoNodo(estado, m);
      });
      // Lo ganado sube con cada carrera (el combustible): al día sin redibujar.
      const ganado = ui.$('mejora-ganado');
      if (ganado && ui.nodoAbierto) ganado.textContent = ui.euros(Libre.sim.ganadoMejora(estado, ui.nodoAbierto));
      if (ui.enfocarMejora) {
        ui.enfocarMejora = false;
        const cerrar = document.querySelector('.hoja-mejora .hoja-cerrar');
        if (cerrar) cerrar.focus({ preventScroll: true });
      }
    }
  };


  Object.assign(ui, { ICONO_CANDADO, eurosCorto, hayMejoraComprable, seccionMejoras });
})(globalThis);
