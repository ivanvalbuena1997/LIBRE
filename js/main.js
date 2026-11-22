/*
 * Libre · arranque y bucle del juego.
 *
 * Mantiene el estado, llama a Libre.sim.avanzar() con el tiempo real
 * transcurrido, guarda la partida y pide a la interfaz que lo dibuje.
 */
(function () {
  'use strict';
  const sim = Libre.sim;
  const ui = Libre.ui;
  const guardado = Libre.guardado;

  const SEGUNDOS_ENTRE_GUARDADOS = 5;
  // Iván, 22-11-2026: la partida solo avanza con el juego abierto y a la
  // vista. Al abrirlo sigue donde se guardó (sin progreso fuera), con la
  // pestaña escondida o el móvil bloqueado se para, y si el navegador
  // duerme la pestaña, cada vuelta del bucle avanza como mucho esto.
  const MAX_SEGUNDOS_POR_VUELTA = 1;

  let estado = guardado.cargar() || sim.crearEstadoInicial(Date.now());
  let anterior = Date.now();

  function guardar() {
    estado.ultimaMarca = Date.now();
    guardado.guardar(estado);
  }

  function ejecutar(accion, args) {
    if (typeof sim[accion] !== 'function') return;
    const resultado = sim[accion].apply(null, [estado].concat(args || []));
    if (resultado && resultado.mensaje) ui.mostrarMensaje(resultado.mensaje);
    if (resultado && resultado.ok) guardar();
    ui.dibujar(estado);
    return resultado;
  }

  /* Acciones de la partida que no son del juego: exportar, importar, borrar. */
  const partida = {
    exportar: function () {
      guardar();
      return guardado.exportar(estado);
    },
    importar: function (texto) {
      try {
        estado = guardado.importar(texto);
      } catch (e) {
        ui.mostrarMensaje(e.message);
        return false;
      }
      anterior = Date.now();
      guardar();
      ui.reiniciar();
      ui.dibujar(estado);
      ui.mostrarMensaje('Partida importada.');
      return true;
    },
    borrar: function () {
      guardado.borrar();
      estado = sim.crearEstadoInicial(Date.now());
      anterior = Date.now();
      guardar();
      ui.reiniciar();
      ui.dibujar(estado);
      ui.mostrarMensaje('Partida nueva.');
    }
  };

  ui.iniciar({ ejecutar, partida, redibujar: function () { ui.dibujar(estado); } });

  /*
   * Para probar los eventos desde la consola del navegador:
   *   Libre.forzarEvento('pinchazo')      propina, sinPagar, objeto, vomito,
   *   Libre.forzarEvento('objeto', 10)    lluvia, pinchazo, baja, averia
   *   Libre.forzarEvento('lluvia', 2)     (horas de lluvia; bajas: jornadas)
   */
  /*
   * Para probar los niveles desde la consola:
   *   Libre.darExperiencia('Laura', 100)
   */
  Libre.darExperiencia = function (nombre, puntos) {
    const r = sim.darExperiencia(estado, nombre, puntos);
    if (r.eventos.length > 0) ui.mostrarEventos(r.eventos);
    else if (r.mensaje) ui.mostrarMensaje(r.mensaje);
    guardar();
    ui.dibujar(estado);
    return r.mensaje;
  };

  Libre.forzarEvento = function (tipo, arg) {
    const r = sim.forzarEvento(estado, tipo, arg);
    if (r.eventos.length > 0) ui.mostrarEventos(r.eventos);
    else if (r.mensaje) ui.mostrarMensaje(r.mensaje);
    guardar();
    ui.dibujar(estado);
    return r.mensaje || r.eventos.map(function (e) { return e.texto; }).join(' ');
  };

  let segundosSinGuardar = 0;
  function tic() {
    const ahora = Date.now();
    const segundos = Math.min((ahora - anterior) / 1000, MAX_SEGUNDOS_POR_VUELTA);
    anterior = ahora;
    // Escondida (otra pestaña, móvil bloqueado): el reloj no corre.
    if (document.hidden) return;
    const resumen = sim.avanzar(estado, segundos);
    estado.ultimaMarca = ahora;
    if (resumen.eventos.length > 0) ui.mostrarEventos(resumen.eventos);
    // Al pararse el día se guarda al momento: si recargas, sigue en pausa.
    if (estado.cierrePendiente && resumen.cierres.length > 0) guardar();
    segundosSinGuardar += segundos;
    if (segundosSinGuardar >= SEGUNDOS_ENTRE_GUARDADOS) {
      segundosSinGuardar = 0;
      guardar();
    }
    ui.dibujar(estado);
  }

  // Guardar también al cerrar o esconder la pestaña.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') guardar();
    else anterior = Date.now();   // al volver, sigue desde ahora
  });
  window.addEventListener('pagehide', guardar);

  ui.dibujar(estado);
  setInterval(tic, 100);
})();
