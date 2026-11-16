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
/* Compra una mejora y, antes, las anteriores de su rama (árbol de mejoras). */
function comprarConRequisitos(e, id) {
  const m = config.mejoras.find(function (x) { return x.id === id; });
  if (m.requiere && !sim.nivelMejora(e, m.requiere)) comprarConRequisitos(e, m.requiere);
  return sim.comprarMejora(e, id);
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
  // Puede salir un evento (propina, objeto…): va aparte, en extras y otros.
  const cobrado = e.caja.hoy.incidencias.sinPagar ? 0 : carrera.importe;
  cerca(e.dinero, antes + cobrado - carrera.combustible + e.caja.hoy.extras - e.caja.hoy.otros);
  assert.strictEqual(e.caja.hoy.carreras, cobrado ? 1 : 0);
});

prueba('el taxímetro sube en vivo del inicio de servicio al importe final', function () {
  const e = sim.crearEstadoInicial(0);
  sim.buscarCliente(e, azarFijo(0.5));
  const carrera = e.jugador.carrera;
  assert.strictEqual(sim.importeEnCurso(e), null, 'buscando cliente: libre');
  e.reloj.minutos = carrera.finEspera;
  cerca(sim.importeEnCurso(e), config.tarifas[carrera.tarifa].inicio);
  e.reloj.minutos = (carrera.finEspera + carrera.fin) / 2;
  const mitad = sim.importeEnCurso(e);
  assert.ok(mitad > config.tarifas[carrera.tarifa].inicio && mitad < carrera.importe);
  e.reloj.minutos = carrera.fin;
  cerca(sim.importeEnCurso(e), carrera.importe);
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

prueba('el conductor trabaja solo y tu turno sigue siendo a clic', function () {
  const e = sim.crearEstadoInicial(0);
  e.dinero = 5000;
  assert.ok(!sim.contratarConductor(e, 1, 'dia').ok, 'el turno de día es tuyo');
  assert.ok(sim.contratarConductor(e, 1, 'noche').ok);
  assert.ok(sim.buscarCliente(e, azarFijo(0.5)).ok, 'tú sigues conduciendo a clic');
  e.jugador.carrera = null;
  // Si no haces clic, tu turno de día no produce nada: solo cobra el de noche.
  e.reloj.minutos = 8 * 60;
  const deDia = sim.avanzar(e, config.reloj.segundosPorDia / 24 * 2);   // 8:00 a 10:00
  assert.strictEqual(deDia.carreras, 0, 'sin tus clics tu turno no factura');
  e.reloj.minutos = 20 * 60;
  const deNoche = sim.avanzar(e, config.reloj.segundosPorDia / 24 * 2);
  assert.ok(deNoche.carreras > 0, 'el conductor de noche trabaja solo');
  assert.ok(deNoche.conductores > 0, 'y cobra su parte');
});

prueba('con la oficina puedes dejar de conducir y volver a un turno libre', function () {
  const e = sim.crearEstadoInicial(0);
  e.dinero = 5000;
  sim.elegirZona(e, 1, 'dia', 'ocio');
  assert.ok(!sim.dejarDeConducir(e).ok, 'sin la oficina no se deja el volante');
  e.dinero = 100000;
  assert.ok(comprarConRequisitos(e, 'oficina').ok);
  assert.ok(sim.dejarDeConducir(e).ok);
  assert.ok(!sim.conduce(e));
  assert.ok(!sim.buscarCliente(e).ok, 'sin turno no hay carreras a mano');
  assert.ok(sim.contratarConductor(e, 1, 'dia').ok, 'tu turno queda libre para un conductor');
  assert.ok(!sim.conducir(e, 1, 'dia').ok, 'ese turno ya está cubierto');
  assert.ok(sim.conducir(e, 1, 'noche').ok);
  assert.strictEqual(sim.turnoDelJugador(e).zona, 'ocio', 'vuelves a tu zona');
  assert.ok(!sim.dejarDeConducir(Object.assign(e, { jugador: Object.assign(e.jugador, { carrera: {} }) })).ok,
    'no se deja el turno a mitad de carrera');
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
  assert.ok(comprarConRequisitos(e, 'aeropuerto').ok);
  assert.ok(sim.elegirZona(e, 1, 'dia', 'aeropuerto').ok);
  e.reloj.minutos = 10 * 60;                  // lunes 10:00
  assert.ok(sim.buscarCliente(e, azarFijo(0.1)).ok);   // 0,1 → primer tipo de viaje: tarifa 4
  assert.strictEqual(e.jugador.carrera.tarifa, 't4');
  cerca(e.jugador.carrera.importe, config.tarifas.t4.fija);
});

prueba('las mejoras de jornada alargan el día y requieren la anterior', function () {
  const e = sim.crearEstadoInicial(0);
  e.dinero = 100000;
  assert.ok(!sim.comprarMejora(e, 'jornada2').ok, 'sin la Jornada I no se puede');
  assert.ok(comprarConRequisitos(e, 'jornada1').ok);
  assert.strictEqual(sim.segundosPorDia(e), config.reloj.segundosPorDia + 10);
});

prueba('un día más largo da más carreras con el mismo coste fijo', function () {
  function unDia(conMejora) {
    const e = sim.crearEstadoInicial(0);
    e.dinero = 100000;
    sim.contratarConductor(e, 1, 'noche');
    if (conMejora) comprarConRequisitos(e, 'jornada1');
    return sim.avanzar(e, sim.segundosPorDia(e), { agregado: true });   // cuenta media, sin azar
  }
  const normal = unDia(false), largo = unDia(true);
  assert.ok(largo.carreras > normal.carreras);
  cerca(largo.fijos, normal.fijos);
});

function conConductor() {
  const e = sim.crearEstadoInicial(0);
  e.dinero = 5000;
  sim.contratarConductor(e, 1, 'noche');
  return e;
}
const DIA = function () { return config.reloj.segundosPorDia; };

prueba('sin conexión solo avanza con el taxi automatizado y con tope', function () {
  const e = sim.crearEstadoInicial(0);
  assert.strictEqual(sim.progresoSinConexion(e, 3600), null, 'a mano el taxi espera');
  const f = conConductor();
  f.ajustes.pararAlCierre = false;
  const r = sim.progresoSinConexion(f, 100 * 3600);
  assert.strictEqual(r.segundosSimulados, config.sinConexion.maximoHoras * 3600);
  assert.ok(r.carreras > 0);
});

prueba('sin conexión da casi lo mismo que jugando (30 días, ±5 %)', function () {
  function flota() {
    const e = sim.crearEstadoInicial(0);
    e.azar = 777;   // los mismos conductores (y rasgos) en las dos flotas
    sim.sortearCandidatos(e);
    e.dinero = 1e6;
    e.ajustes.pararAlCierre = false;
    sim.dejarDeConducir(Object.assign(e, { mejoras: { oficina: true } }));
    for (let i = 0; i < 4; i++) sim.comprarLicencia(e);
    e.licencias.forEach(function (l) {
      if (!l.vehiculo) sim.comprarVehiculo(e, l.id);
      ['dia', 'noche'].forEach(function (t) { if (!l.turnos[t]) sim.contratarConductor(e, l.id, t); });
    });
    return e;
  }
  // Mide el modelo de carreras: sin eventos (una avería mueve mucho 30 días)
  // y con la semilla fija.
  const eventos = JSON.parse(JSON.stringify(config.eventos));
  Object.keys(config.eventos).forEach(function (k) {
    ['probCarrera', 'probTurno', 'probJornada'].forEach(function (p) { if (p in config.eventos[k]) config.eventos[k][p] = 0; });
  });
  const fuera = flota(), jugando = flota();
  jugando.azar = 20261116;
  const inicio = fuera.dinero;
  const r = sim.avanzar(fuera, 30 * DIA(), { sinPausa: true, agregado: true });
  for (let i = 0; i < 300 * DIA(); i++) sim.avanzar(jugando, 0.1);
  config.eventos = eventos;
  const a = fuera.dinero - inicio, b = jugando.dinero - inicio;
  assert.ok(r.carreras > 0);
  assert.ok(Math.abs(b / a - 1) < 0.05, 'jugando ' + b.toFixed(0) + ' frente a sin conexión ' + a.toFixed(0));
});

prueba('los conductores cobran a saltos, al terminar cada carrera', function () {
  const e = conConductor();
  e.reloj.minutos = 20 * 60;                       // turno de noche, el del conductor
  // Sin bajas, pinchazos ni averías: que el conductor trabaje seguro.
  const turno = { baja: config.eventos.baja.probTurno, pinchazo: config.eventos.pinchazo.probTurno };
  config.eventos.baja.probTurno = config.eventos.pinchazo.probTurno = 0;
  let saltos = 0, antes = e.totales.ingresos;
  for (let i = 0; i < 200; i++) {
    sim.avanzar(e, 0.1);
    if (e.totales.ingresos !== antes) { saltos++; antes = e.totales.ingresos; }
    assert.strictEqual(e.totales.carreras % 1, 0, 'carreras enteras');
  }
  config.eventos.baja.probTurno = turno.baja;
  config.eventos.pinchazo.probTurno = turno.pinchazo;
  assert.ok(saltos > 0 && saltos < 60, 'cobra solo a veces, no en cada instante: ' + saltos);
});

prueba('al cerrar el día el reloj se para hasta arrancar el siguiente', function () {
  const e = conConductor();
  sim.avanzar(e, DIA() * 1.5);                   // cruza un cierre
  assert.ok(sim.enPausa(e));
  const parado = { minutos: e.reloj.minutos, dinero: e.dinero };
  cerca(parado.minutos % sim.MIN_DIA, config.reloj.minutoCierreCaja);
  sim.avanzar(e, DIA() * 3);                     // en pausa no pasa nada
  assert.strictEqual(e.reloj.minutos, parado.minutos);
  assert.strictEqual(e.dinero, parado.dinero);
  assert.ok(sim.arrancarDia(e).ok);
  sim.avanzar(e, 1);
  assert.ok(e.reloj.minutos > parado.minutos);
});

prueba('en pausa no se busca cliente pero se puede comprar', function () {
  const e = sim.crearEstadoInicial(0);
  e.dinero = 100000;
  sim.avanzar(e, DIA());
  assert.ok(sim.enPausa(e));
  assert.ok(!sim.buscarCliente(e).ok);
  assert.ok(sim.comprarLicencia(e).ok);
  assert.ok(comprarConRequisitos(e, 'jornada1').ok);
});

prueba('sin el ajuste de pausa el día siguiente empieza solo', function () {
  const e = conConductor();
  sim.cambiarAjuste(e, 'pararAlCierre', 'false');
  const r = sim.avanzar(e, DIA() * 2.5);
  assert.strictEqual(r.cierres.length, 2);
  assert.ok(!sim.enPausa(e));
});

prueba('sin conexión varios días: un solo ticket con la suma, parado en el último cierre', function () {
  const e = conConductor();
  const r = sim.progresoSinConexion(e, DIA() * 4.5);
  assert.strictEqual(r.cierres.length, 4);
  assert.ok(sim.enPausa(e));
  const t = e.cierrePendiente;
  assert.strictEqual(t.hastaDia - t.desdeDia, 3);
  cerca(t.ingresos, r.cierres.reduce(function (s, c) { return s + c.ingresos; }, 0));
  cerca(e.reloj.minutos % sim.MIN_DIA, config.reloj.minutoCierreCaja, 1e-3);
  // Si se vuelve a cerrar el juego con el ticket en pantalla, el tiempo no corre.
  assert.strictEqual(sim.progresoSinConexion(e, DIA() * 3), null);
});

prueba('sin conexión sin llegar al cierre: avanza normal y sin ticket', function () {
  const e = conConductor();
  e.reloj.minutos = 19 * 60;                     // turno de noche: el del conductor
  const r = sim.progresoSinConexion(e, DIA() * 0.4);   // de 19:00 a 4:36, antes del cierre
  assert.strictEqual(r.cierres.length, 0);
  assert.ok(!sim.enPausa(e));
  assert.ok(r.carreras > 0);
});

prueba('las partidas de la versión 2 cargan y quedan sin pausa', function () {
  require('../js/guardado.js');
  const viejo = sim.crearEstadoInicial(0);
  delete viejo.cierrePendiente;
  delete viejo.ajustes;
  viejo.version = 2;
  const migrado = globalThis.Libre.guardado.migrar(viejo);
  assert.strictEqual(migrado.version, config.versionGuardado);
  assert.strictEqual(migrado.cierrePendiente, null);
  assert.strictEqual(migrado.ajustes.pararAlCierre, true);
});

prueba('cada licencia tiene número único y su letra sale de la última cifra', function () {
  const e = sim.crearEstadoInicial(0);
  e.dinero = 1e7;
  for (let i = 0; i < 20; i++) sim.comprarLicencia(e);
  const numeros = e.licencias.map(function (l) { return l.numero; });
  assert.strictEqual(new Set(numeros).size, numeros.length);
  numeros.forEach(function (n) { assert.ok(n >= 1 && n <= config.licencias.maximo); });
  assert.strictEqual(sim.textoLicencia({ numero: 15288 }), '15288-L');
  assert.strictEqual(sim.textoLicencia({ numero: 4720 }), '4720-M');
  assert.strictEqual(sim.textoLicencia({ numero: 31 }), '31-X');
});

prueba('la caja cuenta los kilómetros y el ticket los suma', function () {
  const e = conConductor();
  sim.avanzar(e, DIA() * 1.2);
  assert.ok(e.caja.ayer.km > 0);
  cerca(e.cierrePendiente.km, e.caja.ayer.km);
});

prueba('las partidas de la versión 4 pierden «automatico» y recuerdan tu zona', function () {
  const viejo = sim.crearEstadoInicial(0);
  delete viejo.jugador.zona;
  viejo.jugador.automatico = true;
  viejo.licencias[0].turnos.dia.zona = 'ocio';
  viejo.version = 4;
  const migrado = globalThis.Libre.guardado.migrar(viejo);
  assert.strictEqual(migrado.jugador.automatico, undefined);
  assert.strictEqual(migrado.jugador.zona, 'ocio');
});

prueba('las partidas de la versión 3 reciben número de licencia y km', function () {
  const viejo = sim.crearEstadoInicial(0);
  delete viejo.licencias[0].numero;
  delete viejo.caja.hoy.km;
  viejo.version = 3;
  const migrado = globalThis.Libre.guardado.migrar(viejo);
  assert.ok(migrado.licencias[0].numero >= 1);
  assert.strictEqual(migrado.caja.hoy.km, 0);
});

prueba('a mano solo se trabaja en la franja de tu turno', function () {
  const e = sim.crearEstadoInicial(0);          // lunes 7:00, turno de día
  e.reloj.minutos = 20 * 60;                     // 20:00, fuera del turno de día
  assert.ok(!sim.jugadorEnTurno(e));
  assert.ok(!sim.buscarCliente(e, azarFijo(0.5)).ok);
  assert.ok(sim.cambiarTurnoJugador(e).ok);      // pasa a noche
  assert.ok(sim.jugadorEnTurno(e));
  assert.ok(sim.buscarCliente(e, azarFijo(0.5)).ok);
});

prueba('cada jornada la demanda de una zona cambia, siempre igual para el mismo día', function () {
  const e = sim.crearEstadoInicial(0);
  const v = config.economia.variacionDiariaDemanda;
  const factores = [];
  for (let d = 0; d < 30; d++) {
    const f = sim.factorDeJornada(sim.infoReloj(d * sim.MIN_DIA + 12 * 60), 'centro');
    assert.ok(f >= 1 - v && f <= 1 + v);
    factores.push(f);
  }
  assert.ok(new Set(factores.map(function (f) { return f.toFixed(3); })).size > 10, 'los días varían');
  // La madrugada pertenece a la jornada anterior.
  cerca(sim.factorDeJornada(sim.infoReloj(sim.MIN_DIA + 3 * 60), 'ocio'),
        sim.factorDeJornada(sim.infoReloj(22 * 60), 'ocio'));
  // Mismo día, mismo resultado.
  cerca(sim.demandaZona(e, 'centro', sim.infoReloj(5 * sim.MIN_DIA + 600)),
        sim.demandaZona(e, 'centro', sim.infoReloj(5 * sim.MIN_DIA + 600)));
});

prueba('las carreras a mano salen de varios tipos y longitudes', function () {
  const kms = [];
  for (let i = 0; i < 40; i++) {
    const e = sim.crearEstadoInicial(0);
    let semilla = 12345 + i * 7919;
    const rng = function () { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };
    rng(); rng();   // calentar el generador
    sim.buscarCliente(e, rng);
    kms.push(e.jugador.carrera.km);
  }
  assert.ok(Math.max.apply(null, kms) > 3 * Math.min.apply(null, kms), 'hay cortas y largas');
});

// --------------------------------------------------------------- Eventos

function flotaDe(n) {
  const e = sim.crearEstadoInicial(0, function () { return 0.5; });
  e.dinero = 1e6;
  for (let i = 1; i < n; i++) sim.comprarLicencia(e);
  e.licencias.forEach(function (l) {
    if (!l.vehiculo) sim.comprarVehiculo(e, l.id);
    ['dia', 'noche'].forEach(function (t) { if (!l.turnos[t]) sim.contratarConductor(e, l.id, t); });
  });
  e.ajustes.pararAlCierre = false;
  return e;
}

prueba('los eventos forzados de carrera salen en la próxima carrera y van a la caja', function () {
  const e = flotaDe(1);
  e.reloj.minutos = 22 * 60;                     // noche: trabaja el conductor
  sim.forzarEvento(e, 'objeto', 10);             // el maletín: 300 €
  sim.forzarEvento(e, 'vomito');
  let eventos = [];
  for (let i = 0; i < 400 && !e.caja.hoy.incidencias.vomito; i++) eventos = eventos.concat(sim.avanzar(e, 0.1).eventos);
  assert.strictEqual(e.caja.hoy.incidencias.objeto.importe, 300);
  assert.ok(e.caja.hoy.extras >= 300);
  assert.ok(e.caja.hoy.otros >= 50 && e.caja.hoy.otros <= 90, 'limpieza entre 50 y 90 €');
  assert.ok(eventos.some(function (ev) { return ev.tipo === 'vomito'; }));
  assert.ok(e.licencias[0].turnos.noche.paradoHasta > e.reloj.minutos, 'el conductor termina la jornada');
});

prueba('pinchazo, baja y avería paran el turno; la avería exige dos coches', function () {
  const uno = flotaDe(1);
  uno.reloj.minutos = 22 * 60;
  assert.ok(!sim.forzarEvento(uno, 'averia').ok, 'con un coche no hay averías');
  const e = flotaDe(3);
  e.reloj.minutos = 22 * 60;
  assert.ok(sim.forzarEvento(e, 'averia').ok);
  const averiada = e.licencias.find(function (l) { return l.averia; });
  assert.ok(averiada.averia.hasta - sim.jornadaDe(e.reloj.minutos) >= 10);
  assert.ok(!sim.puedeTrabajar(e, averiada, averiada.turnos.noche, e.reloj.minutos));
  assert.ok(sim.forzarEvento(e, 'baja', 2).ok);
  assert.ok(sim.forzarEvento(e, 'pinchazo').ok);
  assert.strictEqual(e.caja.hoy.incidencias.pinchazo.importe, -config.eventos.pinchazo.coste);
});

prueba('la lluvia dobla la demanda mientras dura', function () {
  const e = flotaDe(1);
  e.reloj.minutos = 10 * 60;
  const antes = sim.demandaZona(e, 'centro', sim.infoReloj(e.reloj.minutos));
  sim.forzarEvento(e, 'lluvia', 1);
  assert.ok(sim.lloviendo(e, e.reloj.minutos));
  cerca(sim.demandaZona(e, 'centro', sim.infoReloj(e.reloj.minutos)), antes * config.eventos.lluvia.factorDemanda);
});

prueba('sin conexión no hay eventos nuevos, pero la avería sigue contando jornadas', function () {
  const e = flotaDe(3);
  e.reloj.minutos = 22 * 60;
  sim.forzarEvento(e, 'averia');
  const averiada = e.licencias.find(function (l) { return l.averia; });
  const r = sim.avanzar(e, 25 * DIA(), { sinPausa: true, agregado: true });
  assert.strictEqual(r.eventos.length, 0);
  assert.ok(sim.jornadaDe(e.reloj.minutos) >= averiada.averia.hasta, 'la avería ya ha terminado');
  assert.ok(sim.puedeTrabajar(e, averiada, averiada.turnos.noche, e.reloj.minutos));
});

// --------------------------------------------------------- Mejoras nuevas

prueba('las mejoras por niveles se compran de una en una hasta el máximo', function () {
  const e = sim.crearEstadoInicial(0);
  e.dinero = 1e6;
  for (let n = 1; n <= 5; n++) {
    assert.ok(comprarConRequisitos(e, 'propinas').ok);
    assert.strictEqual(sim.nivelMejora(e, 'propinas'), n);
  }
  assert.ok(!comprarConRequisitos(e, 'propinas').ok, 'no hay nivel 6');
  cerca(sim.modificadores(e).propinaProb, 0.15);
  cerca(sim.modificadores(e).propinaImporte, 1.8);
});

prueba('con cámara nadie se va sin pagar', function () {
  const e = flotaDe(1);
  e.reloj.minutos = 22 * 60;
  comprarConRequisitos(e, 'camara');
  sim.forzarEvento(e, 'sinPagar');
  const antes = e.totales.carreras;
  for (let i = 0; i < 400 && e.totales.carreras === antes; i++) sim.avanzar(e, 0.1);
  assert.ok(!e.caja.hoy.incidencias.sinPagar);
});

prueba('las ruedas del inventario se gastan en los pinchazos y se reponen', function () {
  const e = flotaDe(1);
  e.reloj.minutos = 22 * 60;
  assert.ok(!sim.comprarInventario(e, 'ruedas', 1).ok, 'sin la mejora no hay inventario de ruedas');
  comprarConRequisitos(e, 'rueda');
  assert.ok(sim.comprarInventario(e, 'ruedas', 2).ok);
  assert.strictEqual(e.inventario.ruedas, 2);
  sim.forzarEvento(e, 'pinchazo');
  assert.strictEqual(e.inventario.ruedas, 1, 'se ha gastado una');
  assert.strictEqual(e.caja.hoy.incidencias.pinchazo.importe, 0, 'sin coste');
  assert.ok(!(e.licencias[0].turnos.noche.paradoHasta > e.reloj.minutos), 'sigue trabajando');
  assert.ok(sim.comprarInventario(e, 'ruedas', 100).ok);
  assert.strictEqual(e.inventario.ruedas, config.inventario.ruedas.maximo, 'no pasa del máximo del almacén');
  assert.ok(!sim.comprarInventario(e, 'ruedas', 1).ok, 'almacén lleno');
});

prueba('con bolsas en el inventario no hay vómito: se gasta una', function () {
  const e = flotaDe(1);
  e.reloj.minutos = 22 * 60;
  comprarConRequisitos(e, 'bolsas');
  sim.comprarInventario(e, 'bolsas', 3);
  sim.forzarEvento(e, 'vomito');
  for (let i = 0; i < 400 && e.inventario.bolsas === 3; i++) sim.avanzar(e, 0.1);
  assert.strictEqual(e.inventario.bolsas, 2);
  assert.ok(!e.caja.hoy.incidencias.vomito, 'no hay vómito');
  assert.strictEqual(e.caja.hoy.incidencias.bolsa.veces, 1);
});

prueba('las partidas de la versión 10 pasan sus ruedas de repuesto al inventario', function () {
  const viejo = flotaDe(3);
  viejo.licencias[0].ruedaRepuesto = true;
  viejo.licencias[2].ruedaRepuesto = true;
  delete viejo.inventario;
  viejo.version = 10;
  const migrado = globalThis.Libre.guardado.migrar(viejo);
  assert.strictEqual(migrado.inventario.ruedas, 2);
  assert.strictEqual(migrado.inventario.bolsas, 0);
  assert.ok(migrado.licencias.every(function (l) { return l.ruedaRepuesto === undefined; }));
});

prueba('el mecánico propio acorta y abarata las averías', function () {
  function averia(nivelMecanico) {
    const e = flotaDe(3);
    e.reloj.minutos = 22 * 60;
    e.azar = 12345;
    for (let i = 0; i < nivelMecanico; i++) comprarConRequisitos(e, 'mecanico');
    sim.forzarEvento(e, 'averia');
    const lic = e.licencias.find(function (l) { return l.averia; });
    return { dias: lic.averia.hasta - sim.jornadaDe(e.reloj.minutos), coste: e.caja.hoy.otros };
  }
  const sin = averia(0), con = averia(5);
  assert.ok(con.dias < sin.dias);
  cerca(con.coste, sin.coste * 0.4, 0.01);
});

prueba('sacudir esterillas da monedas a cada conductor al acabar su turno', function () {
  const e = flotaDe(2);
  comprarConRequisitos(e, 'esterillas');
  e.reloj.minutos = 18 * 60 + 50;                 // justo antes de las 19:00
  sim.avanzar(e, DIA() / 24 / 3);                 // cruza el fin del turno de día
  const a = e.caja.hoy.incidencias.esterillas;
  // De día, en la licencia 1 conduces tú: solo cuenta el conductor de la 2.
  assert.strictEqual(a.veces, 1);
  assert.ok(a.importe >= 0.5 && a.importe <= 2);
});

prueba('las partidas de la versión 7 pasan sus mejoras a nivel 1', function () {
  const viejo = sim.crearEstadoInicial(0);
  viejo.mejoras = { callejero: true, aeropuerto: true };
  viejo.version = 7;
  const migrado = globalThis.Libre.guardado.migrar(viejo);
  assert.strictEqual(migrado.mejoras.callejero, 1);
  assert.ok(sim.zonaDesbloqueada(migrado, 'aeropuerto'));
});

prueba('cada conductor recibe un personaje distinto y se guarda con él', function () {
  const e = flotaDe(6);                          // 11 conductores
  const retratos = [];
  e.licencias.forEach(function (l) {
    ['dia', 'noche'].forEach(function (t) {
      const x = l.turnos[t];
      if (x && x.quien === 'conductor') {
        assert.ok(x.retrato >= 0 && x.retrato < config.conductores.personajes.length);
        assert.strictEqual(x.nombre, config.conductores.personajes[x.retrato].nombre);
        retratos.push(x.retrato);
      }
    });
  });
  assert.strictEqual(new Set(retratos).size, retratos.length, 'sin repetir mientras haya personajes libres');
  const copia = globalThis.Libre.guardado.migrar(JSON.parse(JSON.stringify(e)));
  assert.strictEqual(copia.licencias[1].turnos.dia.retrato, e.licencias[1].turnos.dia.retrato, 'no cambia al recargar');
});

prueba('los conductores de la versión 9 reciben retrato y conservan su nombre', function () {
  const viejo = flotaDe(2);
  viejo.licencias[1].turnos.dia.nombre = 'Pilar';
  delete viejo.licencias[1].turnos.dia.retrato;
  viejo.version = 9;
  const migrado = globalThis.Libre.guardado.migrar(viejo);
  const t = migrado.licencias[1].turnos.dia;
  assert.strictEqual(t.nombre, 'Pilar');
  assert.ok(t.retrato >= 0);
});

prueba('sin el curso, los conductores eligen al azar una zona con clientes; con él, la mejor', function () {
  const e = flotaDe(4);
  comprarConRequisitos(e, 'aeropuerto');
  e.reloj.minutos = 10 * 60;                     // de día: el ocio no tiene clientes
  sim.avanzar(e, 0.1);
  const zonas = function () {
    return e.licencias.map(function (l) { return l.turnos.dia; })
      .filter(function (t) { return t && t.quien === 'conductor'; }).map(function (t) { return t.zona; });
  };
  zonas().forEach(function (z) { assert.notStrictEqual(z, 'ocio', 'nadie se va a una zona vacía'); });
  assert.ok(!sim.elegirZona(e, 2, 'dia', 'centro').ok, 'ya no se elige la zona de un conductor');
  comprarConRequisitos(e, 'gestionZonas');
  e.reloj.minutos = 11 * 60;
  sim.avanzar(e, 0.1);
  // Con el curso, alguno está en la zona que más deja a un solo coche.
  const info = sim.infoReloj(e.reloj.minutos);
  let mejor = null, valor = -Infinity;
  sim.zonasDisponibles(e).forEach(function (z) {
    const r = sim.rendimientoZona(e, z, 1, info);
    const v = r.viajesHora * r.importe * (1 - config.conductores.porcentaje) - r.kmHora * sim.costePorKm(e);
    if (v > valor) { valor = v; mejor = z; }
  });
  assert.ok(zonas().indexOf(mejor) !== -1, 'con el curso, alguno va a ' + mejor + ', la zona que más deja');
});

prueba('el vómito depende de la zona y la hora, y deja una hora parado', function () {
  const e = flotaDe(1);
  const v = config.eventos.vomito;
  e.reloj.minutos = 12 * 60;
  assert.strictEqual(sim.probVomito(e, { zona: 'centro' }), v.probCarrera, 'de día');
  e.reloj.minutos = 23 * 60;
  assert.strictEqual(sim.probVomito(e, { zona: 'centro' }), v.probNoche, 'de noche');
  assert.strictEqual(sim.probVomito(e, { zona: 'ocio' }), v.probPorZona.ocio, 'a la salida del ocio');
  sim.forzarEvento(e, 'vomito');
  for (let i = 0; i < 400 && !e.caja.hoy.incidencias.vomito; i++) sim.avanzar(e, 0.1);
  const parado = e.licencias[0].turnos.noche.paradoHasta - e.reloj.minutos;
  assert.ok(parado > 0 && parado <= v.horasParado * 60 + 1e-6, 'una hora parado, no toda la jornada: ' + parado);
});

prueba('tarifa 3: 22 € hasta 9 km y después taxímetro; cola de 1 a 2 horas en Barajas', function () {
  const t3 = config.tarifas.t3;
  cerca(sim.precioTarifa3('t1', 7, 0), t3.inicio, 1e-9);
  cerca(sim.precioTarifa3('t1', 18, 0), t3.inicio + 9 * config.tarifas.t1.porKm, 1e-9);
  cerca(sim.precioTarifa3('t2', 18, 0), t3.inicio + 9 * config.tarifas.t2.porKm, 1e-9);
  const e = flotaDe(1);
  comprarConRequisitos(e, 'aeropuerto');
  sim.elegirZona(e, 1, 'dia', 'aeropuerto');
  e.reloj.minutos = 10 * 60;
  assert.ok(sim.buscarCliente(e, azarFijo(0.1)).ok);
  const espera = e.jugador.carrera.finEspera - e.jugador.carrera.inicio;
  assert.ok(espera >= 60 && espera <= 120, 'espera en la cola: ' + espera);
});

// ------------------------------------------------------ Conductores

prueba('rasgos: una cualidad y un defecto, nunca opuestos', function () {
  const e = sim.crearEstadoInicial(0);
  const c = config.conductores;
  for (let i = 0; i < 300; i++) {
    const r = sim.sortearRasgos(e);
    const cualidad = c.cualidades.find(function (x) { return x.id === r.cualidad; });
    assert.ok(cualidad, 'cualidad válida');
    assert.ok(c.defectos.some(function (x) { return x.id === r.defecto; }), 'defecto válido');
    assert.notStrictEqual(r.defecto, cualidad.opuesto, r.cualidad + ' con ' + r.defecto);
  }
});

prueba('al contratar eliges entre tres candidatos distintos, al mismo precio', function () {
  const e = sim.crearEstadoInicial(0);
  e.dinero = 5000;
  const lista = sim.candidatos(e);
  assert.strictEqual(lista.length, config.conductores.candidatos);
  assert.strictEqual(new Set(lista.map(function (x) { return x.retrato; })).size, lista.length, 'personajes distintos');
  assert.strictEqual(new Set(lista.map(function (x) { return x.cualidad; })).size, lista.length, 'cualidades distintas');
  const elegido = lista[2];
  const antes = e.dinero;
  assert.ok(sim.contratarConductor(e, 1, 'noche', 2).ok);
  assert.strictEqual(antes - e.dinero, config.conductores.costeContratacion);
  const t = e.licencias[0].turnos.noche;
  assert.strictEqual(t.retrato, elegido.retrato);
  assert.strictEqual(t.cualidad, elegido.cualidad);
  assert.strictEqual(t.defecto, elegido.defecto);
  assert.notStrictEqual(e.candidatos[0], lista[0], 'después salen otros candidatos');
});

prueba('los rasgos cambian los valores, con tope', function () {
  const e = flotaDe(1);
  const t = e.licencias[0].turnos.noche;
  t.cualidad = 'simpatico'; t.defecto = 'manazas';
  let f = sim.factoresConductor(e, t);
  cerca(f.propina, 1.3); cerca(f.pinchazo, 1.5); cerca(f.averia, 1.5); cerca(f.espera, 1);
  t.cualidad = 'buho'; t.defecto = 'dormilon';
  e.reloj.minutos = 23 * 60;
  cerca(sim.factoresConductor(e, t).espera, 0.88, 1e-9);
  e.reloj.minutos = 12 * 60;
  cerca(sim.factoresConductor(e, t).espera, 1.12, 1e-9);
  assert.strictEqual(sim.factoresConductor(e, e.licencias[0].turnos.dia).propina, 1, 'tú no tienes rasgos');
  const tope = config.conductores.topes.espera;
  assert.strictEqual(sim.topeConductor('espera', 0.01), tope[0]);
  assert.strictEqual(sim.topeConductor('espera', 50), tope[1]);
});

prueba('un conductor Lento hace menos carreras que uno que Conoce la ciudad', function () {
  function carreras(cualidad, defecto) {
    const e = flotaDe(1);
    e.azar = 4242;
    const t = e.licencias[0].turnos.dia;
    sim.dejarDeConducir(e);
    e.mejoras.oficina = 1;
    sim.dejarDeConducir(e);
    sim.contratarConductor(e, 1, 'dia');
    ['dia', 'noche'].forEach(function (n) {
      e.licencias[0].turnos[n].cualidad = cualidad;
      e.licencias[0].turnos[n].defecto = defecto;
    });
    for (let i = 0; i < 20 * DIA() * 10; i++) sim.avanzar(e, 0.1);
    return e.totales.carreras;
  }
  const rapido = carreras('conoceCiudad', 'antipatico'), lento = carreras('honrado', 'lento');
  assert.ok(rapido > lento * 1.05, rapido + ' frente a ' + lento);
});

prueba('las partidas de la versión 11 dan rasgos a sus conductores', function () {
  require('../js/guardado.js');
  const viejo = flotaDe(2);
  viejo.version = 11;  // y la 12 le pone la experiencia
  delete viejo.candidatos;
  viejo.licencias.forEach(function (l) {
    ['dia', 'noche'].forEach(function (t) { if (l.turnos[t]) { delete l.turnos[t].cualidad; delete l.turnos[t].defecto; } });
  });
  const migrado = globalThis.Libre.guardado.migrar(viejo);
  migrado.licencias.forEach(function (l) {
    ['dia', 'noche'].forEach(function (t) {
      const x = l.turnos[t];
      if (x && x.quien === 'conductor') assert.ok(sim.buscarRasgo(x.cualidad) && sim.buscarRasgo(x.defecto));
    });
  });
  assert.strictEqual(migrado.candidatos.length, config.conductores.candidatos);
});

prueba('cada carrera da experiencia; el nivel sube con la curva y acorta la espera', function () {
  const e = flotaDe(1);
  const t = e.licencias[0].turnos.noche;
  t.cualidad = 'honrado'; t.defecto = 'antipatico';
  const umbrales = config.conductores.niveles.experiencia;
  assert.strictEqual(sim.nivelConductor(t), 1);
  t.xp = umbrales[4];
  assert.strictEqual(sim.nivelConductor(t), 5);
  t.xp = umbrales[4] - 0.5;
  assert.strictEqual(sim.nivelConductor(t), 4);
  t.xp = 1e6;
  assert.strictEqual(sim.nivelConductor(t), umbrales.length);
  t.xp = umbrales[4];
  cerca(sim.factoresConductor(e, t).espera, 1 - 4 * config.conductores.niveles.esperaPorNivel, 1e-9);
  // Jugando: la experiencia es igual a las carreras que hace.
  t.xp = 0; t.carreras = 0;
  for (let i = 0; i < 2 * DIA() * 10; i++) sim.avanzar(e, 0.1);
  assert.ok(t.carreras > 10, 'hace carreras: ' + t.carreras);
  cerca(t.xp, t.carreras * config.conductores.niveles.porCarrera, 1e-9);
  assert.ok(t.facturado > 0);
});

prueba('subir de nivel avisa; darExperiencia lo prueba desde la consola', function () {
  const e = flotaDe(1);
  const t = e.licencias[0].turnos.noche;
  const r = sim.darExperiencia(e, t.nombre, config.conductores.niveles.experiencia[3]);
  assert.ok(r.ok);
  assert.strictEqual(sim.nivelConductor(t), 4);
  assert.strictEqual(r.eventos.length, 1);
  assert.strictEqual(r.eventos[0].tipo, 'nivel');
  assert.strictEqual(r.eventos[0].retrato, t.retrato);
  assert.ok(!sim.darExperiencia(e, 'Nadie', 10).ok);
});

prueba('sin conexión la experiencia se cuenta agrupada', function () {
  const e = flotaDe(2);
  const r = sim.avanzar(e, 2 * DIA(), { sinPausa: true, agregado: true });
  let xp = 0;
  e.licencias.forEach(function (l) {
    ['dia', 'noche'].forEach(function (t) { const x = l.turnos[t]; if (x && x.quien === 'conductor') xp += x.xp; });
  });
  cerca(xp, r.carreras * config.conductores.niveles.porCarrera, 1e-6);
});

prueba('las partidas de la versión 12 empiezan en nivel 1', function () {
  require('../js/guardado.js');
  const viejo = flotaDe(1);
  viejo.version = 12;
  const t = viejo.licencias[0].turnos.noche;
  delete t.xp; delete t.carreras; delete t.facturado;
  const migrado = globalThis.Libre.guardado.migrar(viejo);
  const x = migrado.licencias[0].turnos.noche;
  assert.strictEqual(x.xp, 0);
  assert.strictEqual(sim.nivelConductor(x), 1);
});

prueba('objetos: se compran al almacén, se equipan sin repetir y según los huecos', function () {
  const e = flotaDe(1);
  const t = e.licencias[0].turnos.noche;
  t.cualidad = 'honrado'; t.defecto = 'antipatico';
  const gps = config.objetos.lista.find(function (o) { return o.id === 'gps'; });
  const antes = e.dinero;
  assert.ok(sim.comprarObjeto(e, 'gps', 2).ok);
  assert.strictEqual(antes - e.dinero, 2 * gps.precio);
  assert.ok(sim.comprarObjeto(e, 'cojin').ok);
  assert.ok(sim.equiparObjeto(e, 1, 'noche', 'gps').ok);
  assert.strictEqual(e.objetos.gps, 1);
  cerca(sim.factoresConductor(e, t).espera, gps.efecto.espera, 1e-9);
  assert.ok(!sim.equiparObjeto(e, 1, 'noche', 'gps').ok, 'no dos iguales');
  assert.ok(!sim.equiparObjeto(e, 1, 'noche', 'cojin').ok, 'nivel 1: un solo hueco');
  t.xp = config.conductores.niveles.experiencia[3];
  assert.strictEqual(sim.huecosConductor(t), 2, 'nivel 4: dos huecos');
  assert.ok(sim.equiparObjeto(e, 1, 'noche', 'cojin').ok);
  t.xp = config.conductores.niveles.experiencia[7];
  assert.strictEqual(sim.huecosConductor(t), 3, 'nivel 8: tres huecos');
  assert.ok(!sim.equiparObjeto(e, 1, 'noche', 'ambientador').ok, 'no hay ambientador en el almacén');
  assert.ok(sim.quitarObjeto(e, 1, 'noche', 'gps').ok);
  assert.strictEqual(e.objetos.gps, 2);
  assert.ok(!sim.equiparObjeto(e, 1, 'dia', 'gps').ok, 'tu turno no lleva objetos');
  e.objetos.funda = config.objetos.maximo;
  assert.ok(!sim.comprarObjeto(e, 'funda').ok, 'almacén lleno');
});

prueba('rasgo, nivel y objetos se combinan con tope', function () {
  const e = flotaDe(1);
  const t = e.licencias[0].turnos.noche;
  e.reloj.minutos = 23 * 60;
  t.cualidad = 'buho'; t.defecto = 'antipatico';
  t.xp = 1e6;
  t.objetos = ['gps', 'termo'];
  const f = sim.factoresConductor(e, t);
  const sinTope = 0.88 * 0.9 * 0.9 * (1 - 9 * config.conductores.niveles.esperaPorNivel);
  cerca(f.espera, sinTope, 1e-9);
  assert.strictEqual(sim.topeConductor('espera', f.espera), config.conductores.topes.espera[0], 'se queda en el tope');
  t.cualidad = 'simpatico'; t.defecto = 'lento'; t.objetos = ['ambientador'];
  e.mejoras.propinas = 5;
  // Propinas al máximo (×2) × 1,3 × 1,25 pasa del tope de ×2,5.
  const m = sim.modificadores(e);
  const base = config.eventos.propina.probCarrera;
  const total = (base + m.propinaProb) / base * sim.factoresConductor(e, t).propina;
  assert.ok(total > config.conductores.topes.propina[1]);
  assert.strictEqual(sim.topeConductor('propina', total), config.conductores.topes.propina[1]);
});

prueba('las partidas de la versión 13 tienen el almacén de objetos vacío', function () {
  require('../js/guardado.js');
  const viejo = flotaDe(1);
  viejo.version = 13;
  delete viejo.objetos;
  delete viejo.licencias[0].turnos.noche.objetos;
  const migrado = globalThis.Libre.guardado.migrar(viejo);
  assert.deepStrictEqual(migrado.objetos, {});
  assert.deepStrictEqual(migrado.licencias[0].turnos.noche.objetos, []);
});

prueba('despedir cuesta un finiquito según el nivel y devuelve los objetos', function () {
  const e = flotaDe(1);
  const t = e.licencias[0].turnos.noche;
  const f = config.conductores.finiquito;
  t.xp = config.conductores.niveles.experiencia[4];
  t.objetos = ['gps', 'cojin'];
  e.objetos = { gps: 1 };
  const coste = f.base + 5 * f.porNivel;
  assert.strictEqual(sim.costeDespido(t), coste);
  e.dinero = coste - 1;
  assert.ok(!sim.despedirConductor(e, 1, 'noche').ok, 'sin dinero no se despide');
  assert.ok(e.licencias[0].turnos.noche, 'sigue trabajando');
  e.dinero = coste + 10;
  assert.ok(sim.despedirConductor(e, 1, 'noche').ok);
  cerca(e.dinero, 10);
  assert.strictEqual(e.licencias[0].turnos.noche, null);
  assert.deepStrictEqual(e.objetos, { gps: 2, cojin: 1 });
  assert.strictEqual(e.caja.hoy.incidencias.finiquito.veces, 1);
  cerca(e.caja.hoy.otros, coste);
});

console.log(pasadas + ' pruebas correctas');
