/*
 * Libre · arranque y bucle del juego.
 *
 * Mantiene el estado, llama a Libre.sim.avanzar() con el tiempo real
 * transcurrido y pide a la interfaz que lo dibuje.
 */
(function () {
  'use strict';
  const sim = Libre.sim;
  const ui = Libre.ui;

  const estado = sim.crearEstadoInicial(Date.now());

  function ejecutar(accion, args) {
    if (typeof sim[accion] !== 'function') return;
    const resultado = sim[accion].apply(null, [estado].concat(args || []));
    if (resultado && resultado.mensaje) ui.mostrarMensaje(resultado.mensaje);
    ui.dibujar(estado);
  }

  ui.iniciar({ ejecutar });

  let anterior = Date.now();
  function tic() {
    const ahora = Date.now();
    sim.avanzar(estado, (ahora - anterior) / 1000);
    anterior = ahora;
    estado.ultimaMarca = ahora;
    ui.dibujar(estado);
  }

  ui.dibujar(estado);
  setInterval(tic, 100);
})();
