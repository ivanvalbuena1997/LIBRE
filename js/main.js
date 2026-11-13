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

  let estado = guardado.cargar() || sim.crearEstadoInicial(Date.now());
  const resumenFuera = sim.progresoSinConexion(estado, (Date.now() - estado.ultimaMarca) / 1000);
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

  let segundosSinGuardar = 0;
  function tic() {
    const ahora = Date.now();
    const segundos = (ahora - anterior) / 1000;
    anterior = ahora;
    const resumen = sim.avanzar(estado, segundos);
    estado.ultimaMarca = ahora;
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
  });
  window.addEventListener('pagehide', guardar);

  if (resumenFuera) {
    ui.mostrarResumenFuera(resumenFuera, estado);
    guardar();
  }
  ui.dibujar(estado);
  setInterval(tic, 100);
})();
