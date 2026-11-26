/*
 * Libre · interfaz: utilidades comunes (formato, botones, iconos, avisos y sonidos).
 * Parte de Libre.ui (ver la cabecera de js/interfaz.js).
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};
  const ui = Libre.ui = Libre.ui || {};

  const formatoEuros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
  const formatoNumero = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1, useGrouping: 'always' });

  function euros(n) { return formatoEuros.format(n); }
  function numero(n) { return formatoNumero.format(n); }
  /* Factor con hasta dos decimales (×0,85). */
  function factor(n) { return n.toLocaleString('es-ES', { maximumFractionDigits: 2 }); }
  function dos(n) { return String(n).padStart(2, '0'); }
  function esc(texto) {
    return String(texto).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function $(id) { return document.getElementById(id); }

  /*
   * Jornada: el día del juego tal como lo vive el taxista, de 7:00 a 7:00
   * (cuando se cierra la caja). La madrugada cuenta como la noche del día
   * anterior: "Lunes 03:00" son las 3 de la madrugada del martes. Solo cambia
   * lo que se enseña; las tarifas y la demanda siguen el calendario.
   */
  function jornadaDe(minutos) {
    const c = Libre.config;
    const dia = Math.floor((minutos - c.reloj.minutoCierreCaja) / Libre.sim.MIN_DIA);
    const enJornada = minutos - c.reloj.minutoCierreCaja - dia * Libre.sim.MIN_DIA;
    return { dia, nombreDia: c.reloj.diasSemana[((dia % 7) + 7) % 7], avance: enJornada / Libre.sim.MIN_DIA };
  }

  /* "HH:MM" de un minuto del reloj. */
  function horaDe(minutos) {
    const i = Libre.sim.infoReloj(minutos);
    return dos(i.hora) + ':' + dos(i.minuto);
  }

  function textoHora(info) {
    return jornadaDe(info.dia * Libre.sim.MIN_DIA + info.minutoDelDia).nombreDia + ' ' +
      dos(info.hora) + ':' + dos(info.minuto);
  }

  /* Botón de acción. Si lleva precio, se desactiva solo cuando no llega el dinero. */
  function boton(texto, accion, args, clase, precio) {
    return '<button type="button" class="' + (clase || '') + '" data-accion="' + accion +
      '" data-args="' + esc((args || []).join('|')) + '"' +
      (precio !== undefined ? ' data-precio="' + precio + '"' : '') + '>' + texto + '</button>';
  }

  function botonCompra(texto, precio, accion, args) {
    return boton('<span>' + texto + '</span><span class="precio">' + euros(precio) + '</span>',
      accion, args, 'boton-compra', precio);
  }

  function selectorZona(estado, licenciaId, turno, zonaActual) {
    const c = Libre.config;
    return '<select data-cambio="elegirZona" data-args="' + licenciaId + '|' + turno + '" aria-label="Zona">' +
      Libre.sim.zonasDisponibles(estado).map(function (id) {
        return '<option value="' + id + '"' + (id === zonaActual ? ' selected' : '') + '>' + esc(c.zonas[id].nombre) + '</option>';
      }).join('') + '</select>';
  }

  function horario(turno) {
    const t = Libre.config.turnos[turno];
    return dos(t.horaInicio) + '–' + dos(t.horaFin) + ' h';
  }


  const MS_ENTRE_AVISOS = 3000;
  /*
   * Los avisos de eventos de la partida (de los conductores: nivel, objeto,
   * baja, pinchazo…; y los generales: lluvia, tormenta, la avería de tu
   * coche…) solo salen en estas pestañas (Iván, 20-11-2026: solo en Calle;
   * el 19-11, los de conductores también en Conductores). En las demás se
   * descartan: suena el sonido igual y lo que cuesta va al ticket. Los
   * mensajes que responden a lo que tocas (comprar, importar…) no son
   * eventos: salen siempre.
   */
  const VISTAS_AVISOS_EVENTOS = ['calle'];
  function avisoVisible() {
    return VISTAS_AVISOS_EVENTOS.indexOf(ui.vistaActual) !== -1;
  }
  const colaAvisos = [];
  ui.ultimoAviso = 0;
  // Qué sonido lleva cada evento de la simulación (los demás, ninguno).
  const SONIDO_EVENTO = { propina: 'propina', nivel: 'nivel', hallazgo: 'objeto', averia: 'averia', pinchazo: 'averia', rotura: 'averia', vigilancia: 'pesetas', nivelPersonaje: 'nivel', eventoCliente: 'ticket' };

  /* Toca un sonido (js/sonidos.js), si el módulo está cargado. */
  function sonar(nombre, arg) {
    if (Libre.sonidos) Libre.sonidos.tocar(nombre, arg);
  }

  /*
   * Sonidos de la racha (Iván, 23-11-2026), de recreativa: cada carrera
   * encadenada suena más aguda (racha), al llegar al tope una fanfarria
   * (rachaMax) y, si se pierde, una nota que cae (rachaFin). Se deciden
   * comparando con lo que había en el fotograma anterior.
   */
  const rachaOida = { n: null, carrera: null };
  function sonarRacha(estado, rv) {
    const c = estado.jugador.carrera;
    const clave = c ? c.inicio : null;
    if (rachaOida.n !== null) {
      if (c && clave !== rachaOida.carrera && c.racha > 0) {
        if (c.racha >= rv.maximo && rachaOida.n < rv.maximo) sonar('rachaMax');
        else sonar('racha', c.racha / rv.maximo);
      } else if (rachaOida.n > 0 && rv.n === 0) sonar('rachaFin');
    }
    rachaOida.n = rv.n;
    rachaOida.carrera = clave;
  }

  function mostrarEventos(eventos) {
    eventos.forEach(function (ev) {
      if (SONIDO_EVENTO[ev.tipo]) sonar(SONIDO_EVENTO[ev.tipo]);
      if (ev.tipo === 'propina') { ui.flotantes.etiqueta = 'propina'; return; }
      if (ev.tipo === 'esterillas' || ev.tipo === 'bolsa') return;
      // Un evento de clientes sale en su hoja (seccionEvento), sin aviso.
      if (ev.tipo === 'eventoCliente' || ev.tipo === 'cliente') return;
      if (!avisoVisible(ev)) return;
      if (colaAvisos.length < 3) colaAvisos.push(ev);
    });
    soltarAviso();
  }
  function soltarAviso() {
    if (colaAvisos.length === 0 || Date.now() - ui.ultimoAviso < MS_ENTRE_AVISOS) return;
    ui.ultimoAviso = Date.now();
    const ev = colaAvisos.shift();
    // Si cambiaste de pestaña mientras esperaba, ya no toca enseñarlo.
    if (!avisoVisible(ev)) { ui.ultimoAviso = 0; soltarAviso(); return; }
    ui.mostrarMensaje(ev.texto, ev.retrato, ev.tipo === 'hallazgo' ? ev.categoria : null);
  }

  /*
   * Caja de hoy: el desglose, oculto hasta que lo pides tocando el display
   * del taxímetro (modo flota) o el total de «Tus taxis hoy». Sale justo
   * debajo del taxímetro.
   */

  // ---------------------------------------------------------------- Flota
  /*
   * Pestaña Flota: inventario en fichas, una tarjeta por licencia (su número
   * en una placa y los dos turnos) y la ficha de cada
   * conductor, que se abre al tocarlo.
   */

  /* Iconos de trazo (24 × 24): turnos y rasgos. Los de objetos son
     dibujos aparte en iconos/ (ARCHIVO_ICONO). */
  const ICONOS = {
    dia: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    noche: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    simpatico: '<circle cx="12" cy="12" r="9"/><path d="M8 14a4.5 4.5 0 0 0 8 0M9 9.5h.01M15 9.5h.01"/>',
    antipatico: '<circle cx="12" cy="12" r="9"/><path d="M8 16.5a4.5 4.5 0 0 1 8 0M9 9.5h.01M15 9.5h.01"/>',
    cuidadoso: '<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    manazas: '<path d="M15 4l5 5-3 3-5-5zM12 9l-8 8 3 3 8-8"/>',
    conoceCiudad: '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
    lento: '<path d="M7 3h10M7 21h10M8 3v3l4 6-4 6v3M16 3v3l-4 6 4 6v3"/>',
    deHierro: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
    enfermizo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0zM12 17v-5"/>',
    ojoAvizor: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
    despistado: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM4 4l16 16"/>',
    honrado: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    buho: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
    madrugador: '<path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 6v3M5 11l1.5 1.5M19 11l-1.5 1.5"/>',
    dormilon: '<path d="M4 6h6l-6 7h6M13 11h6l-6 7h6"/>',
    trasnochador: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10v4M6 10v4"/>',
    pulcro: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    guarro: '<path d="M8 6c2-2 6-2 8 0 3 1 4 5 2 7 1 3-2 6-5 5-2 2-6 1-6-2-3-1-4-5-1-7 0-1 1-2 2-3z"/><circle cx="19.5" cy="19.5" r="1"/>',
    aprovechado: '<circle cx="15" cy="7" r="3.5"/><path d="M3 15h4l3 2h5a1.5 1.5 0 0 0 0-3h-3M7 15v5M3 20h4l9-1 5-4a1.5 1.5 0 0 0-2-2l-4 2.5"/>',
    anfibio: '<path d="M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9z"/><path d="M2 20c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0"/>',
    // Urraca: un pájaro con un brillo (lo que encuentra).
    urraca: '<path d="M3 15c3 0 5-2 6-5 1-3 3-4 5-4 2.5 0 4 1.5 4 3.5L21 11l-3 1c-.5 3-3 5.5-7 5.5H8l-3 2.5v-3.5"/><circle cx="15" cy="9" r=".6"/><path d="M5 4v3M3.5 5.5h3"/>',
    // Desastre: un bolsillo roto por el que se cae algo.
    desastre: '<path d="M5 4h14v8a7 7 0 0 1-7 7 7 7 0 0 1-7-7z"/><path d="M10 13l2 2 2-2 2 2"/><circle cx="12" cy="22" r=".8"/>',
    // Cansancio (Iván, 23-11-2026). Incansable: un rayo; Blandengue: una pila casi vacía.
    incansable: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    blandengue: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10v4M6 10v4"/>',
    // Siesta exprés: un reloj con una «z»; Remolón: una almohada.
    siestaExpres: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M14 2h4l-4 4h4"/>',
    remolon: '<path d="M3 9c3-2 15-2 18 0 1 2 1 6 0 8-3 2-15 2-18 0-1-2-1-6 0-8z"/><path d="M8 13h8"/>',
    // Azucarillo: una nube con gotas y un terrón de azúcar.
    azucarillo: '<path d="M7 13a4 4 0 0 1 .5-8A5 5 0 0 1 17 6a3.5 3.5 0 0 1 0 7z"/><path d="M8 16v2M12 16v2"/><rect x="14.5" y="16" width="5" height="5" rx="1"/>'
  };

  /* Etiqueta con el nombre de la categoría (B, A, S, S+, LEGENDARIO). */
  function etiquetaCategoria(id, corta) {
    const c = Libre.sim.buscarCategoria(id);
    // Corta (fichas pequeñas): «L» en vez de LEGENDARIO; el color es el mismo.
    const texto = corta && id === 'L' ? 'L' : c && c.nombre;
    return c ? '<span class="' + ui.claseRareza(id) + '" title="' + esc(c.nombre) + '">' + esc(texto) + '</span>' : '';
  }

  /*
   * Iconos de objetos (iconos/*.svg, del paquete de diseño): se
   * llaman como el objeto salvo estos. Los dibujos traen sus propios colores.
   */
  const ARCHIVO_ICONO = { escaner: 'radio', paconi: 'planta', alfombrillas: 'alfombrilla', bolsaVomito: 'bolsa' };
  function archivoIcono(nombre) {
    if (ARCHIVO_ICONO[nombre]) return ARCHIVO_ICONO[nombre];
    return Libre.sim.buscarObjeto(nombre) ? nombre : null;
  }

  function icono(nombre, clase) {
    const archivo = archivoIcono(nombre);
    if (archivo) {
      return '<img class="icono icono-dibujo ' + (clase || '') + '" src="iconos/' + archivo + '.svg" alt="" width="48" height="48" draggable="false">';
    }
    return '<svg class="icono ' + (clase || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONOS[nombre] || '') + '</svg>';
  }

  /* Fondo de color de la casilla de un objeto, según su categoría. */
  function claseFondo(categoria) {
    return 'fondo-' + (categoria === 'S+' ? 'Smas' : categoria);
  }

  /* Lo menos que cuesta contratar ahora (el candidato más barato). */
  function precioMasBarato(estado) {
    return Math.min.apply(null, Libre.sim.candidatos(estado).map(Libre.sim.precioCandidato));
  }

  function nivelDe(t) { return Libre.sim.progresoConductor(t); }
  function textoExperiencia(p) {
    return p.hasta === null ? 'Nivel máximo' : Math.floor(p.xp) + ' de ' + p.hasta + ' de experiencia';
  }

  // Turno en el que estás eligiendo conductor ('licencia|turno') o null.

  Object.assign(ui, { $, boton, botonCompra, claseFondo, dos, esc, etiquetaCategoria, euros, factor, horaDe, horario, icono, jornadaDe, mostrarEventos, nivelDe, numero, precioMasBarato, selectorZona, soltarAviso, sonar, sonarRacha, textoExperiencia, textoHora });
})(globalThis);
