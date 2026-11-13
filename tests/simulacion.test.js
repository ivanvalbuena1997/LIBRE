/*
 * Pruebas de la simulación sin navegador.
 * Uso: node tests/simulacion.test.js
 */
'use strict';
require('../js/config.js');
require('../js/simulacion.js');

const assert = require('assert');
const sim = globalThis.Libre.sim;
const config = globalThis.Libre.config;

let pasadas = 0;
function prueba(nombre, fn) {
  try {
    fn();
    pasadas++;
    console.log('  ok  ' + nombre);
  } catch (e) {
    console.error('  MAL ' + nombre);
    console.error(e);
    process.exitCode = 1;
  }
}
function cerca(a, b, margen) {
  assert.ok(Math.abs(a - b) <= (margen || 1e-6), a + ' no está cerca de ' + b);
}
/* Segundos reales que dura `minutos` de juego con la duración de día actual. */
function segundosDe(estado, minutos) {
  return minutos / sim.MIN_DIA * sim.segundosPorDia(estado);
}
/* Generador de azar fijo para que las pruebas den siempre lo mismo. */
function azarFijo(valor) { return function () { return valor; }; }

console.log('Simulación');

prueba('el taxímetro usa la fórmula real', function () {
  // Tarifa 1: 2,55 + 10 km × 1,40 + 30 min × 27 €/h = 30,05 €
  cerca(sim.precioTaximetro('t1', 10, 30), 30.05);
  // Tarifa 2: 3,20 + 10 km × 1,60 + 30 min × 29 €/h = 33,70 €
  cerca(sim.precioTaximetro('t2', 10, 30), 33.70);
});

prueba('el reloj elige tarifa 1 o 2', function () {
  const lunes = function (h) { return sim.infoReloj(h * 60).tarifa; };
  assert.strictEqual(lunes(6), 't2');
  assert.strictEqual(lunes(7), 't1');
  assert.strictEqual(lunes(20), 't1');
  assert.strictEqual(lunes(21), 't2');
  const sabado = 5 * sim.MIN_DIA + 12 * 60;
  assert.strictEqual(sim.infoReloj(sabado).tarifa, 't2');
  assert.strictEqual(sim.infoReloj(sabado).nombreDia, 'Sábado');
});

prueba('avanzar mueve el reloj según la duración del día', function () {
  const e = sim.crearEstadoInicial(0);
  sim.avanzar(e, config.reloj.segundosPorDia / 2);
  cerca(e.reloj.minutos, config.reloj.minutoInicial + 720);
});

prueba('una carrera a mano cobra al terminar', function () {
  const e = sim.crearEstadoInicial(0);
  const antes = e.dinero;
  assert.ok(sim.buscarCliente(e, azarFijo(0.5)).ok);
  assert.ok(!sim.buscarCliente(e, azarFijo(0.5)).ok, 'no se puede buscar dos veces');
  const carrera = e.jugador.carrera;
  sim.avanzar(e, segundosDe(e, carrera.fin - carrera.inicio + 1));
  assert.strictEqual(e.jugador.carrera, null);
  cerca(e.dinero, antes + carrera.importe - carrera.combustible);
  assert.strictEqual(e.caja.hoy.carreras, 1);
});

prueba('sin clientes no se puede buscar', function () {
  const e = sim.crearEstadoInicial(0);
  sim.elegirZona(e, 1, 'dia', 'ocio');   // lunes 7:00: ocio vacío
  assert.ok(!sim.buscarCliente(e, azarFijo(0.5)).ok);
});

prueba('la caja se cierra a las 7:00 y cobra los costes fijos', function () {
  const e = sim.crearEstadoInicial(0);
  const fijos = sim.costesFijosDiarios(e);
  const r = sim.avanzar(e, config.reloj.segundosPorDia);
  assert.strictEqual(r.cierres.length, 1);
  cerca(e.caja.ayer.fijos, fijos);
  cerca(e.dinero, config.economia.dineroInicial - fijos);
  assert.strictEqual(e.caja.hoy.dia, 1);
});

prueba('el primer conductor automatiza el taxi', function () {
  const e = sim.crearEstadoInicial(0);
  e.dinero = 5000;
  assert.ok(!sim.contratarConductor(e, 1, 'dia').ok, 'el turno de día es tuyo');
  assert.ok(sim.contratarConductor(e, 1, 'noche').ok);
  assert.strictEqual(e.jugador.automatico, true);
  assert.ok(!sim.buscarCliente(e).ok, 'ya no hay carreras a mano');
  const antes = e.totales.carreras;
  const r = sim.avanzar(e, config.reloj.segundosPorDia);   // un día completo
  assert.ok(e.totales.carreras > antes, 'el taxi trabaja solo');
  assert.ok(r.conductores > 0, 'el conductor cobra su parte');
});

prueba('los coches que sobran en una zona no facturan más', function () {
  const e = sim.crearEstadoInicial(0);
  const info = sim.infoReloj(3 * 60);  // lunes 3:00, poca demanda
  const uno = sim.rendimientoZona(e, 'centro', 1, info);
  const diez = sim.rendimientoZona(e, 'centro', 10, info);
  cerca(uno.viajesHora, diez.viajesHora);
  assert.ok(diez.kmHora > uno.kmHora, 'pero gastan más combustible');
});

prueba('la licencia sube de precio y necesita coche y conductores', function () {
  const e = sim.crearEstadoInicial(0);
  e.dinero = 100000;
  const p1 = sim.precioLicencia(e);
  assert.ok(sim.comprarLicencia(e).ok);
  assert.ok(sim.precioLicencia(e) > p1);
  assert.ok(!sim.contratarConductor(e, 2, 'dia').ok, 'sin coche no se contrata');
  assert.ok(sim.comprarVehiculo(e, 2).ok);
  assert.ok(sim.contratarConductor(e, 2, 'dia').ok);
  assert.ok(sim.contratarConductor(e, 2, 'noche').ok);
  assert.strictEqual(e.licencias.length, 2);
});

prueba('el aeropuerto está cerrado hasta comprar su mejora y cobra tarifa fija', function () {
  const e = sim.crearEstadoInicial(0);
  e.dinero = 100000;
  assert.ok(!sim.elegirZona(e, 1, 'dia', 'aeropuerto').ok);
  assert.ok(sim.comprarMejora(e, 'aeropuerto').ok);
  assert.ok(sim.elegirZona(e, 1, 'dia', 'aeropuerto').ok);
  e.reloj.minutos = 10 * 60;                  // lunes 10:00
  assert.ok(sim.buscarCliente(e, azarFijo(0.1)).ok);   // 0,1 → primer tipo de viaje: tarifa 4
  assert.strictEqual(e.jugador.carrera.tarifa, 't4');
  cerca(e.jugador.carrera.importe, config.tarifas.t4.fija);
});

prueba('las mejoras de jornada alargan el día y requieren la anterior', function () {
  const e = sim.crearEstadoInicial(0);
  e.dinero = 100000;
  assert.ok(!sim.comprarMejora(e, 'jornada2').ok);
  assert.ok(sim.comprarMejora(e, 'jornada1').ok);
  assert.strictEqual(sim.segundosPorDia(e), config.reloj.segundosPorDia + 10);
});

prueba('un día más largo da más carreras con el mismo coste fijo', function () {
  function unDia(conMejora) {
    const e = sim.crearEstadoInicial(0);
    e.dinero = 100000;
    sim.contratarConductor(e, 1, 'noche');
    if (conMejora) sim.comprarMejora(e, 'jornada1');
    return sim.avanzar(e, sim.segundosPorDia(e));
  }
  const normal = unDia(false), largo = unDia(true);
  assert.ok(largo.carreras > normal.carreras);
  cerca(largo.fijos, normal.fijos);
});

prueba('sin conexión solo avanza con el taxi automatizado y con tope', function () {
  const e = sim.crearEstadoInicial(0);
  assert.strictEqual(sim.progresoSinConexion(e, 3600), null, 'a mano el taxi espera');
  e.dinero = 5000;
  sim.contratarConductor(e, 1, 'noche');
  const r = sim.progresoSinConexion(e, 100 * 3600);
  assert.strictEqual(r.segundosSimulados, config.sinConexion.maximoHoras * 3600);
  assert.ok(r.carreras > 0);
});

prueba('sin conexión da lo mismo que jugando', function () {
  function partida() {
    const e = sim.crearEstadoInicial(0);
    e.dinero = 5000;
    sim.contratarConductor(e, 1, 'noche');
    return e;
  }
  const fuera = partida();
  sim.progresoSinConexion(fuera, 590);   // no justo en un cierre de caja
  const jugando = partida();
  for (let i = 0; i < 5900; i++) sim.avanzar(jugando, 0.1);
  cerca(fuera.dinero, jugando.dinero, 0.01);
});

console.log(pasadas + ' pruebas correctas');
