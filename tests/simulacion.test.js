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
// Las pruebas miden ritmos sin días de libranza; las de libranza la encienden.
config.licencias.libranza = false;

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

/* Efecto de un rasgo en la config (1 si no toca esa clave): las pruebas no
   copian los números, que se reequilibran. */
function rasgo(id, clave) {
  const r = config.conductores.cualidades.concat(config.conductores.defectos).find(function (x) { return x.id === id; });
  return r.efecto[clave] === undefined ? 1 : r.efecto[clave];
}

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
  // Sin bajas ni pinchazos al empezar su turno (pasan a menudo y lo pararían).
  const ev = config.eventos;
  const antes = [ev.baja.probTurno, ev.pinchazo.probTurno];
  ev.baja.probTurno = 0;
  ev.pinchazo.probTurno = 0;
  let deNoche;
  try {
    deNoche = sim.avanzar(e, config.reloj.segundosPorDia / 24 * 2);
  } finally {
    ev.baja.probTurno = antes[0];
    ev.pinchazo.probTurno = antes[1];
  }
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

prueba('Jornada larga: una mejora de 5 niveles; la Oficina va al final de su rama', function () {
  const e = sim.crearEstadoInicial(0);
  e.dinero = 100000;
  assert.ok(!sim.comprarMejora(e, 'oficina').ok, 'sin lo anterior no hay oficina');
  assert.ok(comprarConRequisitos(e, 'jornadaLarga').ok);
  assert.strictEqual(sim.segundosPorDia(e), config.reloj.segundosPorDia + 10);
  assert.ok(!sim.comprarMejora(e, 'oficina').ok, 'con Jornada larga sola, todavía no');
  assert.ok(comprarConRequisitos(e, 'oficina').ok);
  for (let n = 2; n <= 5; n++) assert.ok(sim.comprarMejora(e, 'jornadaLarga').ok, 'nivel ' + n);
  assert.strictEqual(sim.segundosPorDia(e), config.reloj.segundosPorDia + 60);
  assert.ok(!sim.comprarMejora(e, 'jornadaLarga').ok, 'no hay nivel 6');
});

prueba('las partidas de la versión 20 juntan las cuatro jornadas largas en niveles', function () {
  require('../js/guardado.js');
  const viejo = flotaDe(1);
  viejo.version = 20;
  viejo.mejoras = { esterillas: 1, jornada1: 1, jornada2: 1, jornada3: 1, oficina: 1 };
  const m = globalThis.Libre.guardado.migrar(viejo).mejoras;
  assert.strictEqual(m.jornadaLarga, 3);
  assert.strictEqual(m.jornada1, undefined);
  assert.strictEqual(m.oficina, 1);
});

prueba('un día más largo da más carreras con el mismo coste fijo', function () {
  function unDia(conMejora) {
    const e = sim.crearEstadoInicial(0);
    e.azar = 2026;   // el mismo conductor en las dos (si no, uno mejor que otro falsea la comparación)
    sim.sortearCandidatos(e);
    e.dinero = 100000;
    sim.contratarConductor(e, 1, 'noche');
    if (conMejora) comprarConRequisitos(e, 'jornadaLarga');
    return sim.avanzar(e, sim.segundosPorDia(e), { agregado: true });   // cuenta media, sin azar
  }
  const normal = unDia(false), largo = unDia(true);
  assert.ok(largo.carreras > normal.carreras);
  cerca(largo.fijos, normal.fijos);
});

function conConductor() {
  const e = sim.crearEstadoInicial(0);
  e.azar = 20261117;   // siempre el mismo conductor y la misma suerte
  sim.sortearCandidatos(e);
  e.dinero = 50000;
  sim.contratarConductor(e, 1, 'noche');
  todosB(e);
  e.dinero = 5000;
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
  function flota(semilla) {
    const e = sim.crearEstadoInicial(0);
    e.azar = semilla;   // los mismos conductores (y rasgos) en las dos flotas
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
  // Media de tres flotas: con una sola, unos rasgos de espera fuertes
  // alejan más el cálculo aproximado (medido: del +2 % al +7 %).
  let a = 0, b = 0, carreras = 0;
  [777, 101, 202].forEach(function (semilla) {
    const fuera = flota(semilla), jugando = flota(semilla);
    jugando.azar = 20261116;
    const inicio = fuera.dinero;
    carreras += sim.avanzar(fuera, 30 * DIA(), { sinPausa: true, agregado: true }).carreras;
    for (let i = 0; i < 300 * DIA(); i++) sim.avanzar(jugando, 0.1);
    a += fuera.dinero - inicio;
    b += jugando.dinero - inicio;
  });
  config.eventos = eventos;
  assert.ok(carreras > 0);
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
  assert.ok(comprarConRequisitos(e, 'jornadaLarga').ok);
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
  // Siempre 5 cifras, con ceros delante (Iván).
  assert.strictEqual(sim.textoLicencia({ numero: 4720 }), '04720-M');
  assert.strictEqual(sim.textoLicencia({ numero: 31 }), '00031-X');
  assert.strictEqual(sim.textoLicencia({ numero: 7 }), '00007-L');
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

/* Conductores de categoría B: las pruebas que miden valores exactos no dependen de la suerte. */
function todosB(e) {
  e.licencias.forEach(function (l) {
    ['dia', 'noche'].forEach(function (t) {
      const x = l.turnos[t];
      // Un solo defecto: las pruebas fijan los rasgos a mano.
      if (x && x.quien === 'conductor') { x.categoria = 'B'; x.cualidad2 = null; x.cualidad3 = null; x.defecto2 = null; }
    });
  });
}

function flotaDe(n) {
  const e = sim.crearEstadoInicial(0, function () { return 0.5; });
  e.dinero = 1e6;
  for (let i = 1; i < n; i++) sim.comprarLicencia(e);
  e.licencias.forEach(function (l) {
    if (!l.vehiculo) sim.comprarVehiculo(e, l.id);
    ['dia', 'noche'].forEach(function (t) { if (!l.turnos[t]) sim.contratarConductor(e, l.id, t); });
  });
  todosB(e);
  e.ajustes.pararAlCierre = false;
  return e;
}

prueba('los eventos forzados de carrera salen en la próxima carrera y van a la caja', function () {
  const e = flotaDe(1);
  e.reloj.minutos = 22 * 60;                     // noche: trabaja el conductor
  const t = e.licencias[0].turnos.noche;
  t.cualidad = null; t.defecto = null;           // sin rasgos: limpieza normal
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
  assert.ok(averiada.averia.hasta - sim.jornadaDe(e.reloj.minutos) >= config.eventos.averia.jornadasMin);
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

prueba('con la Cámara de seguridad equipada nadie se le va sin pagar', function () {
  const e = flotaDe(1);
  e.reloj.minutos = 22 * 60;
  e.licencias[0].turnos.noche.objetos = ['camara'];
  sim.forzarEvento(e, 'sinPagar');
  const antes = e.totales.carreras;
  for (let i = 0; i < 400 && e.totales.carreras === antes; i++) sim.avanzar(e, 0.1);
  assert.ok(!e.caja.hoy.incidencias.sinPagar);
  const st = sim.statsConductor(e, e.licencias[0].turnos.noche, 'noche').find(function (x) { return x.clave === 'sinPagar'; });
  assert.strictEqual(st.valor, 0);
});

prueba('con la Rueda de repuesto equipada un pinchazo no cuesta ni para', function () {
  const e = flotaDe(1);
  e.reloj.minutos = 22 * 60;
  e.licencias[0].turnos.noche.objetos = ['rueda'];
  sim.forzarEvento(e, 'pinchazo');
  assert.strictEqual(e.caja.hoy.incidencias.pinchazo.importe, 0, 'sin coste');
  assert.ok(!(e.licencias[0].turnos.noche.paradoHasta > e.reloj.minutos), 'sigue trabajando');
});

prueba('con la Bolsa para vómitos equipada no hay vómito', function () {
  const e = flotaDe(1);
  e.reloj.minutos = 22 * 60;
  e.licencias[0].turnos.noche.objetos = ['bolsaVomito'];
  sim.forzarEvento(e, 'vomito');
  for (let i = 0; i < 400 && !e.caja.hoy.incidencias.bolsa; i++) sim.avanzar(e, 0.1);
  assert.ok(!e.caja.hoy.incidencias.vomito, 'no hay vómito');
  assert.strictEqual(e.caja.hoy.incidencias.bolsa.veces, 1);
});

prueba('las partidas de la versión 21 cambian Bolsas, Rueda y Cámara por objetos y dinero', function () {
  const viejo = flotaDe(1);
  viejo.version = 21;
  viejo.mejoras.bolsas = 1;
  viejo.mejoras.camara = 1;
  viejo.inventario = { ruedas: 2, bolsas: 10 };
  viejo.objetos = {};
  const dinero = viejo.dinero;
  const migrado = globalThis.Libre.guardado.migrar(viejo);
  cerca(migrado.dinero, dinero + 800 + 1000 + 2 * 80 + 10 * 2);
  assert.strictEqual(migrado.objetos.bolsaVomito, 1);
  assert.strictEqual(migrado.objetos.camara, 1);
  assert.ok(!migrado.objetos.rueda, 'la rueda no estaba comprada');
  assert.strictEqual(migrado.inventario, undefined);
  assert.ok(!migrado.mejoras.bolsas && !migrado.mejoras.camara);
});

prueba('las partidas de la versión 10 cobran sus ruedas de repuesto', function () {
  const viejo = flotaDe(3);
  viejo.licencias[0].ruedaRepuesto = true;
  viejo.licencias[2].ruedaRepuesto = true;
  delete viejo.inventario;
  viejo.version = 10;
  const dinero = viejo.dinero;
  const migrado = globalThis.Libre.guardado.migrar(viejo);
  assert.strictEqual(migrado.inventario, undefined);
  assert.ok(migrado.dinero >= dinero + 2 * 80, 'se devuelven las dos ruedas');
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
  e.licencias[0].turnos.noche.cualidad = null;   // sin rasgos: una hora justa
  e.licencias[0].turnos.noche.defecto = null;
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

prueba('al contratar eliges entre tres candidatos distintos; el precio depende de su categoría', function () {
  const e = sim.crearEstadoInicial(0);
  e.dinero = 50000;
  const lista = sim.candidatos(e);
  assert.strictEqual(lista.length, config.conductores.candidatos);
  assert.strictEqual(new Set(lista.map(function (x) { return x.retrato; })).size, lista.length, 'personajes distintos');
  assert.strictEqual(new Set(lista.map(function (x) { return x.cualidad; })).size, lista.length, 'cualidades distintas');
  const elegido = lista[2];
  const antes = e.dinero;
  assert.ok(sim.contratarConductor(e, 1, 'noche', 2).ok);
  const cat = config.categorias.find(function (c) { return c.id === elegido.categoria; });
  assert.strictEqual(antes - e.dinero, cat.contratar);
  assert.strictEqual(e.licencias[0].turnos.noche.categoria, elegido.categoria);
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
  cerca(f.propina, rasgo('simpatico', 'propina')); cerca(f.pinchazo, rasgo('manazas', 'pinchazo'));
  cerca(f.averia, rasgo('manazas', 'averia')); cerca(f.limpieza, rasgo('manazas', 'limpieza')); cerca(f.espera, 1);
  t.cualidad = 'buho'; t.defecto = 'dormilon';
  e.reloj.minutos = 23 * 60;
  cerca(sim.factoresConductor(e, t).espera, rasgo('buho', 'esperaNoche'), 1e-9);
  e.reloj.minutos = 12 * 60;
  cerca(sim.factoresConductor(e, t).espera, rasgo('dormilon', 'esperaDia'), 1e-9);
  assert.strictEqual(sim.factoresConductor(e, e.licencias[0].turnos.dia).propina, 1, 'tú no tienes rasgos');
  const tope = config.conductores.topes.espera;
  assert.strictEqual(sim.topeConductor('espera', 0.01), tope[0]);
  assert.strictEqual(sim.topeConductor('espera', 50), tope[1]);
});

prueba('un conductor Lento hace menos carreras que uno que Conoce la ciudad', function () {
  // Sin sucesos: una baja de varios días mueve más que la espera en 20 días.
  const eventos = JSON.parse(JSON.stringify(config.eventos));
  Object.keys(config.eventos).forEach(function (k) {
    ['probCarrera', 'probTurno', 'probJornada'].forEach(function (p) { if (p in config.eventos[k]) config.eventos[k][p] = 0; });
  });
  function carreras(cualidad, defecto) {
    const e = flotaDe(1);
    e.azar = 4242;
    const t = e.licencias[0].turnos.dia;
    sim.dejarDeConducir(e);
    e.mejoras.oficina = 1;
    sim.dejarDeConducir(e);
    sim.contratarConductor(e, 1, 'dia');
    todosB(e);
    ['dia', 'noche'].forEach(function (n) {
      e.licencias[0].turnos[n].cualidad = cualidad;
      e.licencias[0].turnos[n].defecto = defecto;
    });
    for (let i = 0; i < 20 * DIA() * 10; i++) sim.avanzar(e, 0.1);
    return e.totales.carreras;
  }
  const rapido = carreras('conoceCiudad', 'antipatico'), lento = carreras('honrado', 'lento');
  config.eventos = eventos;
  // La espera es solo una parte del ciclo (el viaje no cambia): unos puntos de diferencia.
  assert.ok(rapido > lento * 1.02, rapido + ' frente a ' + lento);
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
  t.cualidad = 'honrado'; t.defecto = 'guarro';   // ninguno toca la espera
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

function efectoDe(id, clave) {
  return config.objetos.lista.find(function (o) { return o.id === id; }).efecto[clave];
}

prueba('objetos: los encuentran los conductores, se equipan sin repetir y según los huecos', function () {
  const e = flotaDe(1);
  const t = e.licencias[0].turnos.noche;
  t.cualidad = 'honrado'; t.defecto = 'guarro';   // ninguno toca la espera
  // Forzado desde la consola: con un id o con una categoría.
  sim.forzarEvento(e, 'hallazgo', 'gps');
  sim.forzarEvento(e, 'hallazgo', 'B');
  for (let i = 0; i < 3000 && (e.eventosForzados || []).length; i++) sim.avanzar(e, 0.1);
  assert.strictEqual(e.objetos.gps, 1, 'encuentra el GPS');
  const deB = config.objetos.lista.filter(function (o) { return o.categoria === 'B' && e.objetos[o.id] > 0; });
  assert.strictEqual(deB.length, 1, 'y uno de categoría B');
  e.objetos = { gps: 2, cojin: 1 };
  assert.ok(sim.equiparObjeto(e, 1, 'noche', 'gps').ok);
  assert.strictEqual(e.objetos.gps, 1);
  cerca(sim.factoresConductor(e, t).espera, efectoDe('gps', 'espera'), 1e-9);
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
});

prueba('los hallazgos siguen las categorías: muchos B y pocos LEGENDARIOS', function () {
  const e = sim.crearEstadoInicial(0);
  e.azar = 99;
  const cuenta = {};
  for (let i = 0; i < 20000; i++) { const c = sim.sortearCategoria(e); cuenta[c] = (cuenta[c] || 0) + 1; }
  config.categorias.forEach(function (c) { cerca(cuenta[c.id] / 20000, c.peso, Math.max(0.01, c.peso * 0.3)); });
  assert.ok(config.objetos.lista.length >= 20, 'al menos 20 objetos');
  config.categorias.forEach(function (c) {
    assert.ok(config.objetos.lista.some(function (o) { return o.categoria === c.id; }), 'hay objetos ' + c.id);
  });
});

prueba('almacén lleno: lo encontrado espera en la bandeja hasta que vendes algo', function () {
  const e = flotaDe(1);
  const max = sim.capacidadAlmacen(e);
  e.objetos = { callejero: max };
  sim.forzarEvento(e, 'hallazgo', 'paconi');
  for (let i = 0; i < 3000 && (e.eventosForzados || []).length; i++) sim.avanzar(e, 0.1);
  assert.strictEqual(sim.objetosEnAlmacen(e), max, 'el almacén no pasa del máximo');
  assert.deepStrictEqual(e.bandeja.map(function (x) { return x.id; }), ['paconi'], 'espera en la bandeja');
  assert.ok(!sim.quitarObjeto(e, 1, 'noche', 'gps').ok, 'no se puede quitar nada al almacén lleno');
  const antes = e.dinero;
  const venta = config.categorias.find(function (c) { return c.id === 'B'; }).venta;
  assert.ok(sim.venderObjeto(e, 'callejero').ok);
  cerca(e.dinero - antes, venta);
  assert.strictEqual(e.bandeja.length, 0, 'al hacer sitio entra al almacén');
  assert.strictEqual(e.objetos.paconi, 1);
  cerca(e.caja.hoy.extras, venta);
  assert.strictEqual(e.caja.hoy.incidencias.venta.veces, 1);
  // También se puede vender directamente lo de la bandeja.
  e.objetos.callejero = max - 1;
  e.bandeja = [{ id: 'bidon', conductor: 'X' }];
  const l = config.categorias.find(function (c) { return c.id === 'L'; }).venta;
  const antes2 = e.dinero;
  assert.ok(sim.venderObjeto(e, 'bidon', 0).ok);
  cerca(e.dinero - antes2, l);
  assert.ok(!sim.venderObjeto(e, 'bidon').ok, 'no tienes bidón sin equipar');
});

prueba('rasgo, nivel y objetos se combinan con tope', function () {
  const e = flotaDe(1);
  const t = e.licencias[0].turnos.noche;
  e.reloj.minutos = 23 * 60;
  t.cualidad = 'buho'; t.defecto = 'guarro';
  t.xp = 1e6;
  t.objetos = ['navegador', 'bidon'];
  const f = sim.factoresConductor(e, t);
  const sinTope = rasgo('buho', 'esperaNoche') * efectoDe('navegador', 'espera') * efectoDe('bidon', 'esperaNoche') *
    (1 - 9 * config.conductores.niveles.esperaPorNivel);
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

prueba('categorías de conductor: más cualidad, menos defecto, más hallazgos', function () {
  const e = sim.crearEstadoInicial(0);
  e.azar = 7;
  const porCat = {};
  config.categorias.forEach(function (c) { porCat[c.id] = c; });
  for (let i = 0; i < 300; i++) {
    const s = sim.sortearRasgos(e, null, 'S+');
    assert.strictEqual(s.defecto, null, 'S+ sin defecto');
    const l = sim.sortearRasgos(e, null, 'L');
    assert.strictEqual(l.defecto, null, 'LEGENDARIO sin defecto');
    assert.ok(l.cualidad2 && l.cualidad2 !== l.cualidad, 'LEGENDARIO con dos cualidades');
    assert.ok(sim.sortearRasgos(e, null, 'B').defecto, 'B siempre con defecto');
  }
  const f = flotaDe(1);
  const t = f.licencias[0].turnos.noche;
  t.cualidad = 'simpatico'; t.defecto = 'antipatico';
  t.categoria = 'A';
  const q = rasgo('simpatico', 'propina') - 1, d = rasgo('antipatico', 'propina') - 1;
  cerca(sim.factoresConductor(f, t).propina, (1 + q * porCat.A.fuerzaCualidad) * (1 + d * porCat.A.fuerzaDefecto), 1e-9);
  t.categoria = 'L'; t.defecto = null; t.cualidad2 = 'conoceCiudad';
  const fl = sim.factoresConductor(f, t);
  cerca(fl.propina, 1 + q * porCat.L.fuerzaCualidad, 1e-9);
  cerca(fl.espera, (1 + (rasgo('conoceCiudad', 'espera') - 1) * porCat.L.fuerzaCualidad) * porCat.L.esperaBase, 1e-9);
  assert.ok(porCat.L.esperaBase < porCat['S+'].esperaBase && porCat['S+'].esperaBase < porCat.B.esperaBase,
    'el plus de espera crece con la categoría');
  assert.strictEqual(sim.precioCandidato({ categoria: 'L' }), porCat.L.contratar);
  ['B', 'A', 'S', 'S+', 'L'].reduce(function (anterior, id) {
    assert.ok(porCat[id].contratar > anterior, 'cada categoría cuesta más que la anterior');
    return porCat[id].contratar;
  }, 0);
});

prueba('las partidas de la versión 15 dan categoría a sus conductores', function () {
  require('../js/guardado.js');
  const viejo = flotaDe(3);
  viejo.version = 15;
  viejo.licencias.forEach(function (l) {
    ['dia', 'noche'].forEach(function (t) { if (l.turnos[t]) { delete l.turnos[t].categoria; delete l.turnos[t].cualidad2; } });
  });
  const migrado = globalThis.Libre.guardado.migrar(viejo);
  migrado.licencias.forEach(function (l) {
    ['dia', 'noche'].forEach(function (t) {
      const x = l.turnos[t];
      if (!x || x.quien !== 'conductor') return;
      const cat = sim.buscarCategoria(x.categoria);
      assert.ok(cat, 'tiene categoría');
      if (cat.probDefecto === 0) assert.strictEqual(x.defecto, null);
      if (cat.cualidades > 1) assert.ok(x.cualidad2);
    });
  });
  assert.ok(migrado.candidatos.every(function (c) { return sim.buscarCategoria(c.categoria); }));
});

prueba('reserva: contratas sin turno, hasta el máximo; no trabajan; se puede despedir', function () {
  const e = flotaDe(1);
  e.dinero = 1e6;
  const max = config.conductores.reserva;
  for (let i = 0; i < max; i++) assert.ok(sim.contratarAReserva(e, 0).ok);
  assert.strictEqual(e.reserva.length, max);
  assert.ok(!sim.contratarAReserva(e, 0).ok, 'reserva llena');
  const r = e.reserva[0];
  e.objetos = { gps: 1 };
  assert.ok(sim.equiparObjeto(e, 'reserva', 0, 'gps').ok, 'se equipa también en la reserva');
  for (let i = 0; i < DIA() * 10; i++) sim.avanzar(e, 0.1);
  assert.strictEqual(r.xp, 0, 'en la reserva no trabaja');
  const gpsAntes = e.objetos.gps || 0;   // otros conductores pueden haber encontrado alguno
  assert.ok(sim.despedirConductor(e, 'reserva', 0).ok);
  assert.strictEqual(e.reserva.length, max - 1);
  assert.strictEqual(e.objetos.gps, gpsAntes + 1, 'su objeto vuelve al almacén');
  const personajes = sim.todosLosConductores(e).map(function (x) { return x.t.retrato; });
  assert.ok(e.candidatos.every(function (c) { return personajes.indexOf(c.retrato) === -1 || personajes.length >= config.conductores.personajes.length; }),
    'los candidatos no repiten a nadie de la reserva');
});

prueba('las partidas de la versión 16 tienen la reserva vacía', function () {
  require('../js/guardado.js');
  const viejo = flotaDe(1);
  viejo.version = 16;
  delete viejo.reserva;
  assert.deepStrictEqual(globalThis.Libre.guardado.migrar(viejo).reserva, []);
});

prueba('mover conductores: solo con el día cerrado; turnos, licencias y reserva', function () {
  const e = flotaDe(2);
  e.dinero = 1e6;
  sim.contratarAReserva(e, 0);
  const ana = e.licencias[1].turnos.dia, luis = e.licencias[1].turnos.noche, res = e.reserva[0];
  assert.ok(!sim.moverConductor(e, 2, 'dia', '2|noche').ok, 'con el día abierto, no');
  e.cierrePendiente = { dias: 1 };   // día cerrado, ticket en pantalla
  assert.ok(sim.moverConductor(e, 2, 'dia', '2|noche').ok, 'intercambio de turnos');
  assert.strictEqual(e.licencias[1].turnos.noche, ana);
  assert.strictEqual(e.licencias[1].turnos.dia, luis);
  assert.ok(!sim.moverConductor(e, 2, 'dia', '1|dia').ok, 'tu turno no');
  assert.ok(sim.moverConductor(e, 'reserva', 0, '2|dia').ok, 'de la reserva a un turno: se intercambian');
  assert.strictEqual(e.licencias[1].turnos.dia, res);
  assert.strictEqual(e.reserva[0], luis);
  assert.ok(sim.moverConductor(e, 1, 'noche', 'reserva').ok, 'a la reserva, y el turno queda libre');
  assert.strictEqual(e.licencias[0].turnos.noche, null);
  assert.strictEqual(e.reserva.length, 2);
  assert.ok(sim.moverConductor(e, 'reserva', 0, '1|noche').ok, 'a un turno libre');
  assert.strictEqual(e.licencias[0].turnos.noche, luis);
  assert.strictEqual(e.reserva.length, 1);
  e.licencias[1].vehiculo = null;
  assert.ok(!sim.moverConductor(e, 1, 'noche', '2|dia').ok, 'no a una licencia sin coche');
});

prueba('libranza: entre semana según la letra; en fin de semana según la paridad', function () {
  config.licencias.libranza = true;
  try {
    const e = flotaDe(1);
    const lic = e.licencias[0];
    const minutoDe = function (jornada) { return config.reloj.minutoCierreCaja + jornada * sim.MIN_DIA + 60; };
    lic.numero = 15288;   // L: libra los lunes (jornada 0, 7, 14…)
    assert.ok(sim.libra(e, lic, minutoDe(0)), 'lunes');
    assert.ok(!sim.libra(e, lic, minutoDe(1)), 'martes trabaja');
    assert.ok(sim.libra(e, lic, minutoDe(7)), 'el lunes siguiente');
    // Fin de semana: jornada 5 = sábado, «Día 6» (par); jornada 6 = domingo, «Día 7» (impar).
    assert.ok(!sim.libra(e, lic, minutoDe(5)), 'par: trabaja el día par');
    assert.ok(sim.libra(e, lic, minutoDe(6)), 'par: libra el día impar');
    lic.numero = 15283;   // impar
    assert.ok(sim.libra(e, lic, minutoDe(5)) && !sim.libra(e, lic, minutoDe(6)), 'impar: al revés');
    // Libra el coche entero: ni conductores ni tú.
    lic.numero = 15288;
    e.reloj.minutos = minutoDe(0);
    assert.ok(!sim.puedeTrabajar(e, lic, lic.turnos.noche, e.reloj.minutos));
    assert.ok(!sim.buscarCliente(e).ok, 'tú tampoco');
  } finally {
    config.licencias.libranza = false;
  }
});

prueba('al comprar licencia eliges entre dos placas con letras distintas', function () {
  const e = sim.crearEstadoInicial(0);
  e.dinero = 1e6;
  const placas = sim.placasEnVenta(e);
  assert.strictEqual(placas.length, config.licencias.placasAElegir);
  assert.notStrictEqual(sim.letraLicencia(placas[0]), sim.letraLicencia(placas[1]));
  assert.deepStrictEqual(sim.placasEnVenta(e), placas, 'se guardan hasta comprar');
  assert.ok(sim.comprarLicencia(e, null, 1).ok);
  assert.strictEqual(e.licencias[1].numero, placas[1]);
  assert.notDeepStrictEqual(sim.placasEnVenta(e), placas, 'después, otras');
});

prueba('los conductores B tienen dos defectos; el nivel 10 quita uno o da una cualidad', function () {
  const e = sim.crearEstadoInicial(0);
  e.azar = 5;
  for (let i = 0; i < 200; i++) {
    const r = sim.sortearRasgos(e, null, 'B');
    assert.ok(r.defecto && r.defecto2 && r.defecto !== r.defecto2, 'B: dos defectos distintos');
    const q = sim.buscarRasgo(r.cualidad);
    assert.ok(r.defecto !== q.opuesto && r.defecto2 !== q.opuesto, 'ninguno opuesto a su cualidad');
    assert.strictEqual(sim.sortearRasgos(e, null, 'A').defecto2, null, 'A: uno');
  }
  const f = flotaDe(1);
  const t = f.licencias[0].turnos.noche;
  const max = config.conductores.niveles.experiencia;
  t.cualidad = 'simpatico'; t.defecto = 'lento'; t.defecto2 = 'despistado';
  const r = sim.darExperiencia(f, t.nombre, max[max.length - 1]);
  assert.strictEqual(sim.nivelConductor(t), max.length);
  assert.strictEqual(t.defecto2, null, 'pierde el segundo defecto');
  assert.strictEqual(t.defecto, 'lento');
  assert.ok(/pierde su defecto/.test(r.eventos[0].texto));
  // Sin defectos: gana una cualidad nueva.
  t.xp = 0; t.defecto = null;
  sim.darExperiencia(f, t.nombre, max[max.length - 1]);
  assert.ok(t.cualidad2 && t.cualidad2 !== t.cualidad, 'gana una cualidad');
  cerca(sim.factoresConductor(f, t).propina >= 1.3 ? 1 : 0, 1);
});

prueba('las partidas de la versión 18 dan un segundo defecto a sus conductores B', function () {
  require('../js/guardado.js');
  const viejo = flotaDe(2);
  viejo.version = 18;
  const max = config.conductores.niveles.experiencia;
  const lic = viejo.licencias[1];
  lic.turnos.dia.categoria = 'B'; lic.turnos.dia.defecto = 'lento'; delete lic.turnos.dia.defecto2;
  lic.turnos.noche.categoria = 'A'; lic.turnos.noche.defecto = 'lento'; delete lic.turnos.noche.defecto2;
  lic.turnos.noche.xp = max[max.length - 1];
  const migrado = globalThis.Libre.guardado.migrar(viejo);
  const m = migrado.licencias[1];
  assert.ok(m.turnos.dia.defecto2 && m.turnos.dia.defecto2 !== 'lento', 'B: segundo defecto');
  assert.strictEqual(m.turnos.noche.defecto, null, 'A en el nivel 10: pierde el defecto');
});

prueba('el ticket lleva las licencias que trabajaron ese día', function () {
  const e = flotaDe(3);
  sim.dejarDeConducir(Object.assign(e, { mejoras: { oficina: 1 } }));
  // La tercera no trabaja: sin coche.
  e.licencias[2].vehiculo = null;
  e.ajustes.pararAlCierre = true;
  for (let i = 0; i < 2 * DIA() * 10 && !sim.enPausa(e); i++) sim.avanzar(e, 0.1);
  assert.ok(sim.enPausa(e), 'se ha cerrado el día');
  const esperadas = [e.licencias[0].numero, e.licencias[1].numero].sort(function (a, b) { return a - b; });
  assert.deepStrictEqual(e.cierrePendiente.licencias, esperadas);
  // Varios días sin conexión: la unión de todos.
  const t = sim.sumarCierres([{ dia: 0, licencias: [5, 3], incidencias: {} }, { dia: 1, licencias: [3, 9], incidencias: {} }]);
  assert.deepStrictEqual(t.licencias, [3, 5, 9]);
});

prueba('las partidas de la versión 19 empiezan la lista de licencias del ticket vacía', function () {
  require('../js/guardado.js');
  const viejo = flotaDe(1);
  viejo.version = 19;
  delete viejo.caja.hoy.licencias;
  assert.deepStrictEqual(globalThis.Libre.guardado.migrar(viejo).caja.hoy.licencias, []);
});

prueba('el almacén guarda 10 objetos y «Taquillas» lo amplía por niveles', function () {
  const e = flotaDe(1);
  e.dinero = 1e6;
  assert.strictEqual(sim.capacidadAlmacen(e), 10);
  const t = config.mejoras.find(function (m) { return m.id === 'taquillas'; });
  t.niveles.forEach(function (n, i) {
    assert.ok(comprarConRequisitos(e, 'taquillas').ok);
    assert.strictEqual(sim.capacidadAlmacen(e), 10 + n.efecto.almacen, 'nivel ' + (i + 1));
  });
  assert.strictEqual(sim.capacidadAlmacen(e), 40);
});

prueba('Deflectores de viento: barata, abre Vehículo y baja las bajas, con tope', function () {
  const d = config.mejoras.find(function (m) { return m.id === 'deflectores'; });
  assert.strictEqual(d.rama, 'vehiculo');
  assert.ok(!d.requiere, 'abre la rama');
  assert.ok(d.precio <= 500, 'barata');
  const e = flotaDe(1);
  e.dinero = 1e6;
  assert.strictEqual(sim.modificadores(e).baja, 1);
  assert.ok(sim.comprarMejora(e, 'deflectores').ok);
  cerca(sim.modificadores(e).baja, d.efecto.baja);
});

prueba('libranza sin nadie que trabaje: saltas al cierre y sale el ticket', function () {
  config.licencias.libranza = true;
  try {
    const minutoDe = function (jornada) { return config.reloj.minutoCierreCaja + jornada * sim.MIN_DIA + 60; };
    // Solo tú, en una licencia que libra los lunes (jornada 0).
    const e = sim.crearEstadoInicial(0);
    e.licencias[0].numero = 15288;
    e.reloj.minutos = minutoDe(1);
    assert.ok(!sim.puedeSaltarDia(e), 'el martes trabaja: no se salta');
    e.reloj.minutos = minutoDe(0);
    assert.ok(sim.puedeSaltarDia(e));
    const dinero = e.dinero;
    assert.ok(sim.saltarAlCierre(e).ok);
    assert.ok(sim.enPausa(e), 'queda el ticket del día');
    assert.strictEqual(e.reloj.minutos, minutoDe(1) - 60, 'el reloj se para en el cierre');
    assert.ok(e.dinero < dinero, 'se cobran los costes fijos del día');
    assert.ok(!sim.saltarAlCierre(e).ok, 'en pausa no se salta');

    // Sin pausa al cierre, el reloj pasa al día siguiente y sigue.
    const s = sim.crearEstadoInicial(0);
    s.licencias[0].numero = 15288;
    s.ajustes.pararAlCierre = false;
    s.reloj.minutos = minutoDe(0) + 5 * 60;
    assert.ok(sim.saltarAlCierre(s).ok);
    assert.ok(!sim.enPausa(s));
    assert.strictEqual(sim.jornadaDe(s.reloj.minutos), 1);
    assert.ok(!sim.puedeSaltarDia(s));

    // Con un conductor que trabaja hoy en otra licencia, el día corre normal.
    const f = flotaDe(2);
    f.licencias[0].turnos.dia = { quien: 'jugador', nombre: 'Tú', zona: config.zonaInicial };
    f.licencias[0].numero = 15288;   // L: libra el lunes
    f.licencias[1].numero = 15289;   // M: trabaja el lunes
    f.reloj.minutos = minutoDe(0);
    assert.ok(!sim.puedeSaltarDia(f), 'la flota trabaja');
    // Si esa licencia también libra, o sus conductores están de baja, sí se salta.
    f.licencias[1].turnos.dia.baja = { hasta: 1 };
    f.licencias[1].turnos.noche.baja = { hasta: 1 };
    assert.ok(sim.puedeSaltarDia(f), 'nadie puede trabajar hoy');

    // Con la Oficina de gestión y un turno libre en una licencia que no libra,
    // puedes pasarte a ella: no se salta.
    f.licencias[1].turnos.noche = null;
    assert.ok(sim.puedeSaltarDia(f), 'sin Oficina no puedes cambiar de licencia');
    f.mejoras.oficina = 1;
    f.mejoras.jornadaLarga = 1;
    assert.ok(sim.modificadores(f).dejarVolante);
    assert.ok(!sim.puedeSaltarDia(f), 'tienes otra licencia con un turno libre');
  } finally {
    config.licencias.libranza = false;
  }
});

prueba('stats de la ficha: los mismos números que usa la simulación', function () {
  const e = conConductor();
  e.reloj.minutos = 22 * 60;                     // noche: trabaja su turno
  const t = e.licencias[0].turnos.noche;
  t.categoria = 'A';
  t.cualidad = 'madrugador';                     // solo de día: de noche no cuenta
  t.defecto = 'enfermizo';
  t.objetos = ['termo', 'ambientador'];
  t.xp = 300;
  const f = sim.factoresConductor(e, t);
  const stats = sim.statsConductor(e, t, 'noche');
  const de = function (lista, clave) { return lista.find(function (s) { return s.clave === clave; }); };
  const ev = config.eventos;
  cerca(de(stats, 'espera').valor, sim.topeConductor('espera', f.espera));
  const deDia = de(stats, 'espera').fuentes.find(function (x) { return x.nombre === 'Madrugador'; });
  assert.ok(deDia && deDia.soloTurno === 'dia' && deDia.cuenta === false, 'de noche Madrugador sale, pero no cuenta');
  cerca(de(stats, 'propina').valor, ev.propina.probCarrera * sim.topeConductor('propina', f.propina));
  cerca(de(stats, 'baja').valor, ev.baja.probTurno * sim.topeConductor('baja', f.baja));
  assert.ok(de(stats, 'baja').factor > 1, 'Enfermizo sube las bajas');
  cerca(de(stats, 'pinchazo').valor, ev.pinchazo.probTurno * sim.topeConductor('pinchazo', f.pinchazo));
  cerca(de(stats, 'hallazgo').valor, config.objetos.probHallazgo * sim.buscarCategoria('A').hallazgo);
  cerca(de(stats, 'limpieza').valor.minutos, ev.vomito.horasParado * 60 * sim.topeConductor('limpieza', f.limpieza));

  // Mejoras: las propinas suman probabilidad y la baja de Deflectores multiplica.
  e.dinero = 1e6;
  assert.ok(comprarConRequisitos(e, 'propinas').ok);
  assert.ok(comprarConRequisitos(e, 'deflectores').ok);
  const m = sim.modificadores(e);
  const con = sim.statsConductor(e, t, 'noche');
  cerca(de(con, 'propina').valor, ev.propina.probCarrera *
    sim.topeConductor('propina', (ev.propina.probCarrera + m.propinaProb) / ev.propina.probCarrera * f.propina));
  cerca(de(con, 'baja').valor, ev.baja.probTurno * sim.topeConductor('baja', f.baja * m.baja));
  assert.ok(de(con, 'baja').fuentes.some(function (x) { return x.tipo === 'mejora'; }));

  // En la reserva no hay turno: lo de día va marcado y no se suma.
  const reserva = de(sim.statsConductor(e, t, null), 'espera');
  const madrugador = reserva.fuentes.find(function (x) { return x.nombre === 'Madrugador'; });
  assert.ok(madrugador.soloTurno === 'dia' && madrugador.cuenta === false);
  assert.ok(sim.statsConductor(e, t, 'dia').find(function (s) { return s.clave === 'espera'; }).fuentes
    .find(function (x) { return x.nombre === 'Madrugador'; }).cuenta, 'de día sí cuenta');
});

prueba('los candidatos cambian cada día, al cerrar la caja', function () {
  const e = sim.crearEstadoInicial(0);
  e.ajustes.pararAlCierre = true;
  const antes = JSON.stringify(sim.candidatos(e));
  e.reloj.minutos = config.reloj.minutoCierreCaja - 60;
  sim.avanzar(e, segundosDe(e, 59));
  assert.strictEqual(JSON.stringify(e.candidatos), antes, 'durante el día se quedan');
  sim.avanzar(e, segundosDe(e, 2));
  assert.ok(sim.enPausa(e));
  assert.notStrictEqual(JSON.stringify(e.candidatos), antes, 'al cerrar, otros');
  assert.strictEqual(e.candidatos.length, config.conductores.candidatos);
});

prueba('rasgos: cada opuesto existe y nunca salen juntos (Pulcro/Guarro, Honrado/Aprovechado)', function () {
  const c = config.conductores;
  c.cualidades.forEach(function (q) {
    if (q.opuesto) assert.ok(c.defectos.some(function (d) { return d.id === q.opuesto; }), q.id + ': su opuesto existe');
  });
  assert.strictEqual(c.cualidades.find(function (q) { return q.id === 'pulcro'; }).opuesto, 'guarro');
  assert.strictEqual(c.cualidades.find(function (q) { return q.id === 'honrado'; }).opuesto, 'aprovechado');
  const e = sim.crearEstadoInicial(0);
  e.azar = 99;
  for (let i = 0; i < 2000; i++) {
    const r = sim.sortearRasgos(e, null, 'B');
    const q = c.cualidades.find(function (x) { return x.id === r.cualidad; });
    assert.ok(r.defecto !== q.opuesto && r.defecto2 !== q.opuesto, q.nombre + ' con su opuesto');
  }
});

prueba('topes que crecen: con la categoría y el nivel, solo hacia lo bueno', function () {
  const xp = config.conductores.niveles.experiencia;
  const quien = function (cat, nivel) { return { quien: 'conductor', categoria: cat, xp: xp[nivel - 1] }; };
  const base = config.conductores.topes, extremo = config.conductores.topesAbiertos.extremo;
  // Un B de nivel 1 tiene los topes de siempre; tu turno, también.
  assert.deepStrictEqual(sim.topesDe('espera', quien('B', 1)), base.espera);
  assert.deepStrictEqual(sim.topesDe('espera', { quien: 'jugador' }), base.espera);
  // Un LEGENDARIO de nivel 10 llega al extremo del lado bueno; el malo no se mueve.
  const l = quien('L', 10);
  cerca(sim.aperturaTopes(l), 1);
  cerca(sim.topesDe('espera', l)[0], extremo.espera);
  assert.strictEqual(sim.topesDe('espera', l)[1], base.espera[1], 'lo malo sigue frenado');
  cerca(sim.topesDe('propina', l)[1], extremo.propina);
  assert.strictEqual(sim.topesDe('propina', l)[0], base.propina[0]);
  // Crece con la categoría y con el nivel.
  const espera = function (cat, nivel) { return sim.topesDe('espera', quien(cat, nivel))[0]; };
  assert.ok(espera('B', 10) < espera('B', 1), 'el nivel abre');
  assert.ok(espera('S', 1) < espera('A', 1) && espera('L', 1) < espera('S+', 1), 'la categoría abre');
  // El tope de cada conductor manda en lo que usa la simulación.
  assert.strictEqual(sim.topeConductor('espera', 0.01, l), sim.topesDe('espera', l)[0]);
  // Y sale en sus estadísticas.
  const e = flotaDe(1);
  const t = e.licencias[0].turnos.noche;
  Object.assign(t, { categoria: 'L', xp: 1e9 });
  const st = sim.statsConductor(e, t, 'noche').find(function (x) { return x.clave === 'espera'; });
  cerca(st.limite, extremo.espera);
});

prueba('la Oficina de gestión rebaja lo que se quedan los conductores', function () {
  const e = sim.crearEstadoInicial(0);
  cerca(sim.porcentajeConductor(e), config.conductores.porcentaje);
  e.dinero = 100000;
  assert.ok(comprarConRequisitos(e, 'oficina').ok);
  const oficina = config.mejoras.find(function (m) { return m.id === 'oficina'; });
  cerca(sim.porcentajeConductor(e), config.conductores.porcentaje * oficina.efecto.porcentajeConductor);
  assert.ok(sim.porcentajeConductor(e) < config.conductores.porcentaje);
});

prueba('«Siguiente» propone crecer: flota primero, luego licencia y solo mejoras baratas', function () {
  const e = sim.crearEstadoInicial(0, function () { return 0.5; });
  e.dinero = 0;
  // Con un turno libre, solo el conductor.
  assert.strictEqual(sim.objetivoCompra(e).tipo, 'conductor');
  e.dinero = 1e6;
  sim.contratarConductor(e, e.licencias[0].id, 'noche');
  e.dinero = 0;
  const crecer = sim.precioLicencia(e) + config.vehiculos.modelos[config.vehiculos.modeloInicial].precio;
  const lista = sim.comprasParaObjetivo(e);
  assert.ok(lista.some(function (x) { return x.tipo === 'licencia'; }));
  assert.ok(lista.every(function (x) { return x.tipo === 'licencia' || x.precio <= config.objetivo.mejorasHasta * crecer; }),
    'ninguna mejora cara');
  // Con todas las mejoras baratas compradas, la licencia.
  e.dinero = 1e6;
  lista.forEach(function (x) { if (x.tipo === 'mejora') sim.comprarMejora(e, x.mejora); });
  for (let i = 0; i < 20; i++) {
    sim.comprasParaObjetivo(e).forEach(function (x) { if (x.tipo === 'mejora') sim.comprarMejora(e, x.mejora); });
  }
  e.dinero = 0;
  assert.strictEqual(sim.objetivoCompra(e).tipo, 'licencia');
  // Al comprarla, el coche que le falta pasa delante.
  e.dinero = 1e6;
  sim.comprarLicencia(e);
  assert.strictEqual(sim.objetivoCompra(e, 'licencia-2').tipo, 'coche', 'la fija ya no vale si falta un coche');
});

prueba('RRHH: cada nivel suma 1 y sube la categoría de los candidatos (no la de los objetos)', function () {
  const rrhh = config.mejoras.find(function (m) { return m.id === 'rrhh'; });
  rrhh.niveles.forEach(function (n) {
    const suma = Object.keys(n.efecto.pesosCandidatos).reduce(function (a, k) { return a + n.efecto.pesosCandidatos[k]; }, 0);
    cerca(suma, 1);
  });
  const media = function (e) {
    const orden = config.categorias.map(function (c) { return c.id; });
    let total = 0;
    for (let i = 0; i < 400; i++) {
      sim.sortearCandidatos(e).forEach(function (x) { total += orden.indexOf(x.categoria); });
    }
    return total / 1200;
  };
  const e = sim.crearEstadoInicial(0);
  e.azar = 12345;
  const antes = media(e);
  e.dinero = 1e6;
  assert.ok(comprarConRequisitos(e, 'rrhh').ok);
  for (let n = 2; n <= rrhh.niveles.length; n++) assert.ok(sim.comprarMejora(e, 'rrhh').ok);
  const despues = media(e);
  assert.ok(despues > antes + 1, 'candidatos mejores: ' + antes.toFixed(2) + ' → ' + despues.toFixed(2));
  cerca(sim.pesosCandidatos(e).B, rrhh.niveles[rrhh.niveles.length - 1].efecto.pesosCandidatos.B);
});

prueba('combinar: 3 objetos de una categoría dan uno al azar de la siguiente', function () {
  const e = sim.crearEstadoInicial(0);
  e.objetos = { ambientador: 2, cojin: 1, termo: 1, gps: 1 };
  // Gasta las copias del elegido y luego el que más se repite.
  assert.deepStrictEqual(sim.objetosParaCombinar(e, 'cojin'), ['cojin', 'ambientador', 'ambientador']);
  assert.strictEqual(sim.objetosParaCombinar(e, 'gps'), null, 'con un A solo no hay bastantes');
  const r = sim.combinarObjetos(e, 'cojin');
  assert.ok(r.ok, r.mensaje);
  assert.strictEqual(sim.buscarObjeto(r.objeto).categoria, 'A');
  assert.strictEqual(e.objetos.ambientador, 0);
  assert.strictEqual(e.objetos.cojin, 0);
  assert.strictEqual(e.objetos.termo, 1, 'el resto sigue');
  assert.strictEqual(sim.objetosEnAlmacen(e), 3);
  // Los LEGENDARIOS no se combinan.
  e.objetos = { paconi: 3 };
  assert.ok(!sim.combinarObjetos(e, 'paconi').ok);
  // Al dejar hueco entra lo de la bandeja.
  e.objetos = { ambientador: 10 };
  e.bandeja = [{ id: 'gps', conductor: 'Ana' }];
  assert.ok(sim.combinarObjetos(e, 'ambientador').ok);
  assert.strictEqual(e.bandeja.length, 0);
  assert.strictEqual(e.objetos.gps >= 1, true);
});

prueba('hallazgo y suerte: objetos y Urraca encuentran más y mejor, con tope', function () {
  const e = flotaDe(1);
  e.reloj.minutos = 22 * 60;
  const t = e.licencias[0].turnos.noche;
  Object.assign(t, { categoria: 'B', cualidad: null, defecto: null, defecto2: null, xp: 0, objetos: [] });
  const de = function (clave) { return sim.statsConductor(e, t, 'noche').find(function (x) { return x.clave === clave; }); };
  cerca(de('hallazgo').valor, config.objetos.probHallazgo);
  assert.strictEqual(de('suerte'), undefined, 'sin suerte no sale la fila');
  t.objetos = ['linterna'];
  cerca(de('hallazgo').valor, config.objetos.probHallazgo * sim.buscarObjeto('linterna').efecto.hallazgo);
  t.objetos = ['detector'];
  cerca(sim.probSubir(t), sim.buscarObjeto('detector').efecto.suerte - 1);
  cerca(de('suerte').valor, sim.probSubir(t));
  // La suerte tiene tope.
  t.cualidad = 'urraca';
  t.objetos = ['detector', 'gato'];
  cerca(sim.probSubir(t), config.conductores.topes.suerte[1] - 1);
  // Con suerte, lo encontrado sube de categoría más a menudo.
  function media(objetos) {
    const orden = config.categorias.map(function (c) { return c.id; });
    const x = flotaDe(1);
    x.reloj.minutos = 22 * 60;
    x.azar = 777;
    const tt = x.licencias[0].turnos.noche;
    Object.assign(tt, { categoria: 'B', cualidad: null, defecto: null, defecto2: null, objetos });
    x.objetos = {};
    let suma = 0, n = 0;
    for (let i = 0; i < 3000; i++) {
      x.objetos = {};
      x.bandeja = [];
      sim.forzarEvento(x, 'hallazgo');
      sim.hallazgo(x, { eventos: [] }, tt);
      Object.keys(x.objetos).forEach(function (id) { suma += orden.indexOf(sim.buscarObjeto(id).categoria); n++; });
    }
    return suma / n;
  }
  assert.ok(media(['detector']) > media([]) + 0.15, 'con detector, mejores objetos');
});

prueba('cada rama de mejoras es una cadena: solo la primera no pide nada', function () {
  config.ramasMejoras.forEach(function (r) {
    const rama = config.mejoras.filter(function (m) { return m.rama === r.id; });
    assert.strictEqual(rama.filter(function (m) { return !m.requiere; }).length, 1, r.id + ': una sola raíz');
    rama.forEach(function (m, i) {
      if (i > 0) assert.strictEqual(m.requiere, rama[i - 1].id, m.id + ' pide la anterior de su rama');
    });
  });
});

prueba('«Siguiente» propone el Curso de zonas y RRHH a partir de 3 licencias', function () {
  const e = flotaDe(2);
  const ids = function () { return sim.comprasParaObjetivo(e).map(function (x) { return x.mejora; }); };
  assert.ok(ids().indexOf('gestionZonas') === -1, 'con 2 licencias, no');
  e.dinero = 1e6;
  sim.comprarLicencia(e);
  const l = e.licencias[2];
  sim.comprarVehiculo(e, l.id);
  sim.contratarConductor(e, l.id, 'dia');
  sim.contratarConductor(e, l.id, 'noche');
  comprarConRequisitos(e, 'jornadaLarga');
  assert.ok(ids().indexOf('taquillas') !== -1, 'con 3, lo que va antes en su rama (Taquillas, cara para «Siguiente»)');
  comprarConRequisitos(e, 'taquillas');
  assert.ok(ids().indexOf('gestionZonas') !== -1, 'y luego el Curso');
  sim.comprarMejora(e, 'gestionZonas');
  assert.ok(ids().indexOf('rrhh') !== -1, 'y luego RRHH');
});

prueba('Publicidad en el taxi: al cerrar la caja cobra por cada carrera del día', function () {
  const e = flotaDe(1);
  e.dinero = 1e6;
  assert.ok(comprarConRequisitos(e, 'publicidad').ok);
  const porCarrera = config.mejoras.find(function (m) { return m.id === 'publicidad'; }).niveles[0].efecto.publicidad;
  for (let i = 0; i < 5000 && !e.caja.ayer; i++) sim.avanzar(e, 0.1);
  const ayer = e.caja.ayer;
  assert.ok(ayer.carreras > 0);
  cerca(ayer.incidencias.publicidad.importe, Math.round(ayer.carreras) * porCarrera);
  assert.ok(ayer.extras >= ayer.incidencias.publicidad.importe);
});

prueba('Grúa propia: un pinchazo sin rueda para una hora y cuesta la mitad', function () {
  const e = flotaDe(1);
  e.reloj.minutos = 22 * 60;
  e.dinero = 1e6;
  assert.ok(comprarConRequisitos(e, 'grua').ok);
  const t = e.licencias[0].turnos.noche;
  t.objetos = [];
  sim.forzarEvento(e, 'pinchazo');
  cerca(e.caja.hoy.incidencias.pinchazo.importe, -config.eventos.pinchazo.coste * 0.5);
  const horas = (t.paradoHasta - e.reloj.minutos) * sim.factorJornada(e) / 60;
  cerca(horas, 1, 0.01);
});

prueba('Leasing de coches: cada coche cuesta un 30 % menos', function () {
  const e = sim.crearEstadoInicial(0);
  const base = config.vehiculos.modelos[config.vehiculos.modeloInicial].precio;
  cerca(sim.precioCoche(e), base);
  e.dinero = 1e6;
  assert.ok(comprarConRequisitos(e, 'leasing').ok);
  cerca(sim.precioCoche(e), base * 0.7);
  sim.comprarLicencia(e);
  const antes = e.dinero;
  assert.ok(sim.comprarVehiculo(e, e.licencias[1].id).ok);
  cerca(antes - e.dinero, base * 0.7);
});

prueba('Mampara y asientos de cuero: un 6 % más de demanda', function () {
  const e = sim.crearEstadoInicial(0);
  e.dinero = 1e6;
  const antes = sim.modificadores(e).demanda;
  assert.ok(comprarConRequisitos(e, 'mampara').ok);
  cerca(sim.modificadores(e).demanda, antes * 1.06);
});

prueba('estadísticas: cada jornada cerrada va al historial con lo de cada uno', function () {
  const e = flotaDe(2);
  const ids = sim.todosLosConductores(e).map(function (x) { return x.t.id; });
  assert.strictEqual(new Set(ids).size, ids.length, 'cada conductor con su id');
  sim.avanzar(e, segundosDe(e, 24 * 60));
  assert.strictEqual(e.historial.length, 1);
  const r = e.historial[0];
  cerca(r.ingresos, e.caja.ayer.ingresos);
  cerca(r.neto, sim.netoCaja(e.caja.ayer));
  assert.strictEqual(r.tu, 0, 'tienes turno pero no has conducido');
  // Lo de los conductores y lo tuyo suman lo que entró en la caja.
  const suma = Object.keys(r.conductores).reduce(function (a, k) { return a + r.conductores[k]; }, r.tu);
  cerca(suma, r.ingresos, 0.01);
  assert.ok(e.mejorDia && e.mejorDia.ingresos === r.ingresos);
  const m = sim.mediasDiarias(e);
  assert.strictEqual(m.conductores.length, 3);
  assert.strictEqual(m.conductores[0].dias, 1);
  assert.ok(m.conductores[0].media >= m.conductores[2].media, 'de mayor a menor');
  assert.deepStrictEqual(m.tu, { media: 0, dias: 1 });
});

prueba('estadísticas: el historial guarda como mucho los días de la config', function () {
  const e = flotaDe(1);
  const dias = config.estadisticas.dias;
  sim.avanzar(e, segundosDe(e, 24 * 60 * (dias + 3)), { agregado: true });
  assert.strictEqual(e.historial.length, dias);
  assert.ok(e.historial[dias - 1].dia > e.historial[0].dia);
  assert.ok(e.historial.some(function (r) { return Object.keys(r.conductores).length === 1 && r.ingresos > 0; }),
    'sin conexión también se apunta lo del conductor');
});

prueba('estadísticas: la clasificación guarda a los despedidos', function () {
  const e = flotaDe(1);
  const noche = e.licencias[0].turnos.noche;
  noche.facturado = 5000;
  e.dinero = 1e6;
  assert.ok(sim.despedirConductor(e, 1, 'noche').ok);
  const top = sim.clasificacionConductores(e);
  assert.strictEqual(top[0].nombre, noche.nombre);
  assert.strictEqual(top[0].despedido, true);
  assert.ok(top.length <= config.estadisticas.top);
});

prueba('migración a la versión 23: historial, ids y despedidos', function () {
  require('../js/guardado.js');
  const e = flotaDe(1);
  e.version = 22;
  sim.todosLosConductores(e).forEach(function (x) { delete x.t.id; });
  delete e.historial; delete e.mejorDia; delete e.exConductores; delete e.ultimoIdConductor;
  e.caja.ayer = Object.assign({}, e.caja.hoy, { dia: 3, ingresos: 900 });
  const m = globalThis.Libre.guardado.migrar(e);
  assert.strictEqual(m.historial.length, 1);
  assert.strictEqual(m.mejorDia.ingresos, 900);
  assert.deepStrictEqual(sim.todosLosConductores(m).map(function (x) { return x.t.id; }), [1]);
  assert.strictEqual(m.ultimoIdConductor, 1);
  assert.ok(sim.contratarAReserva(m, 0).ok);
  assert.strictEqual(m.reserva[0].id, 2, 'los nuevos no repiten id');
});

prueba('estadísticas: los días de libranza no cuentan para la media', function () {
  const e = flotaDe(1);
  config.licencias.libranza = true;
  try {
    const lic = e.licencias[0];
    const id = lic.turnos.noche.id;
    sim.avanzar(e, segundosDe(e, 24 * 60 * 7), { agregado: true });
    const libres = e.historial.filter(function (r) {
      return sim.libra(e, lic, config.reloj.minutoCierreCaja + r.dia * sim.MIN_DIA + 60);
    });
    assert.ok(libres.length >= 1, 'en una semana libra algún día');
    libres.forEach(function (r) {
      assert.strictEqual(r.conductores[id], undefined, 'el conductor no cuenta ese día');
      assert.strictEqual(r.tu, null, 'tú tampoco');
    });
    const trabajados = e.historial.length - libres.length;
    assert.strictEqual(sim.mediasDiarias(e).conductores[0].dias, trabajados);
  } finally {
    config.licencias.libranza = false;
  }
});

prueba('Anfibio cobra más en las carreras que empiezan lloviendo', function () {
  function primeraCarrera(cualidad, llueve) {
    const e = flotaDe(1);
    e.azar = 31;
    e.reloj.minutos = 22 * 60;                     // noche: trabaja el conductor
    const t = e.licencias[0].turnos.noche;
    Object.assign(t, { categoria: 'B', cualidad: cualidad, cualidad2: null, defecto: null, defecto2: null, objetos: [] });
    e.lluvia = llueve ? { jornada: sim.jornadaDe(e.reloj.minutos), desde: 0, hasta: 1e9, avisada: true }
      : { jornada: sim.jornadaDe(e.reloj.minutos), desde: 0, hasta: 0, avisada: true };
    sim.avanzar(e, 0.01);
    return t.carrera.importe;
  }
  const factor = rasgo('anfibio', 'importeLluvia');
  assert.ok(factor > 1);
  cerca(primeraCarrera('anfibio', true), primeraCarrera(null, true) * factor, 1e-6);
  cerca(primeraCarrera('anfibio', false), primeraCarrera(null, false), 1e-6);
  // Sale en sus estadísticas, con su tope.
  const e = flotaDe(1);
  const t = e.licencias[0].turnos.noche;
  Object.assign(t, { categoria: 'B', cualidad: 'anfibio', cualidad2: null, defecto: null, defecto2: null });
  const st = sim.statsConductor(e, t, 'noche').find(function (x) { return x.clave === 'importeLluvia'; });
  cerca(st.factor, Math.min(factor, sim.topesDe('importeLluvia', t)[1]));
  // Sin Anfibio no sale esa stat.
  t.cualidad = 'honrado';
  assert.ok(!sim.statsConductor(e, t, 'noche').some(function (x) { return x.clave === 'importeLluvia'; }));
});

prueba('Azucarillo no trabaja mientras llueve y vuelve al escampar', function () {
  const e = flotaDe(1);
  e.reloj.minutos = 22 * 60;                     // noche: trabaja el conductor
  const t = e.licencias[0].turnos.noche;
  Object.assign(t, { categoria: 'B', cualidad: 'buho', cualidad2: null, defecto: 'azucarillo', defecto2: null, objetos: [], carrera: null });
  const desde = e.reloj.minutos, hasta = desde + 90;
  e.lluvia = { jornada: sim.jornadaDe(desde), desde: desde, hasta: hasta, avisada: true };
  sim.avanzar(e, segundosDe(e, 1));
  assert.strictEqual(t.paradoHasta, hasta, 'parado hasta que escampa');
  assert.strictEqual(t.motivoParada, 'lluvia');
  assert.ok(!t.carrera, 'sin carrera mientras llueve');
  sim.avanzar(e, segundosDe(e, 89));
  assert.ok(!t.carrera, 'aún llueve');
  sim.avanzar(e, segundosDe(e, 1.01));
  assert.ok(t.carrera, 'escampa y vuelve a trabajar enseguida');
  // Sus estadísticas: con lluvia no trabaja.
  const st = sim.statsConductor(e, t, 'noche').find(function (x) { return x.clave === 'importeLluvia'; });
  assert.strictEqual(st.factor, 0);
  // Nunca sale con Anfibio.
  assert.strictEqual(config.conductores.cualidades.find(function (q) { return q.id === 'anfibio'; }).opuesto, 'azucarillo');
});

prueba('lluvia: chubascos cortos y tormentas largas, más chubascos', function () {
  const ev = config.eventos.lluvia;
  const e = sim.crearEstadoInicial(0);
  e.azar = 77;
  e.ajustes.pararAlCierre = false;
  const vistas = { chubasco: 0, tormenta: 0 };
  let ultima = -1;
  for (let i = 0; i < 400 * 24; i++) {
    sim.avanzar(e, sim.segundosPorDia(e) / 24);
    const l = e.lluvia;
    if (!l || l.jornada === ultima || l.hasta <= l.desde) continue;
    ultima = l.jornada;
    const horas = (l.hasta - l.desde) / 60, t = ev.tipos[l.tipo];
    assert.ok(t, 'tipo conocido: ' + l.tipo);
    assert.ok(horas >= t.horasMin - 1e-9 && horas <= t.horasMax + 1e-9, l.tipo + ' de ' + horas + ' h');
    vistas[l.tipo]++;
  }
  assert.ok(vistas.chubasco > vistas.tormenta && vistas.tormenta > 0, JSON.stringify(vistas));
  // Partidas de la versión 23: la lluvia ya sorteada se queda como chubasco.
  require('../js/guardado.js');
  const viejo = sim.crearEstadoInicial(0);
  viejo.version = 23;
  viejo.lluvia = { jornada: 0, desde: 10, hasta: 100, avisada: false };
  const migrado = globalThis.Libre.guardado.migrar(JSON.parse(JSON.stringify(viejo)));
  assert.strictEqual(migrado.lluvia.tipo, 'chubasco');
});

prueba('kilometraje: coche inicial usado, los comprados nuevos, y cuadra con el ticket', function () {
  const v = config.vehiculos;
  // El primero, de segunda mano en su rango; los que compras, a 0 km.
  for (let i = 0; i < 20; i++) {
    const km = sim.crearEstadoInicial(0).licencias[0].km;
    assert.ok(km >= v.kmInicialMin && km <= v.kmInicialMax && km === Math.round(km), 'inicial: ' + km);
  }
  const e = flotaDe(2);
  assert.strictEqual(e.licencias[1].km, 0, 'comprado nuevo');
  // Los km de los coches suben lo mismo que los del ticket (jugando).
  const antes = e.licencias.reduce(function (s, l) { return s + l.km; }, 0);
  const totalAntes = e.totales.km;
  e.reloj.minutos = 9 * 60;
  let kmCaja = 0;
  for (let i = 0; i < 2 * DIA() * 10; i++) sim.avanzar(e, 0.1).cierres.forEach(function (c) { kmCaja += c.km; });
  kmCaja += e.caja.hoy.km;
  const despues = e.licencias.reduce(function (s, l) { return s + l.km; }, 0);
  assert.ok(despues - antes > 0, 'los coches suman km');
  cerca(despues - antes, kmCaja, 1e-6);
  cerca(e.totales.km - totalAntes, kmCaja, 1e-6);
  // Sin conexión, igual: se reparten entre los coches de cada zona.
  const f = flotaDe(2);
  const fAntes = f.licencias.reduce(function (s, l) { return s + l.km; }, 0);
  const r = sim.avanzar(f, 2 * DIA(), { sinPausa: true, agregado: true });
  let kmFuera = f.caja.hoy.km;
  r.cierres.forEach(function (c) { kmFuera += c.km; });
  cerca(f.licencias.reduce(function (s, l) { return s + l.km; }, 0) - fAntes, kmFuera, 1e-6);
  // Partidas de la versión 24: el primer coche, usado; los demás, desde 0.
  require('../js/guardado.js');
  const viejo = flotaDe(2);
  viejo.version = 24;
  viejo.licencias.forEach(function (l) { delete l.km; });
  delete viejo.totales.km;
  const m = globalThis.Libre.guardado.migrar(JSON.parse(JSON.stringify(viejo)));
  assert.ok(m.licencias[0].km >= v.kmInicialMin && m.licencias[0].km <= v.kmInicialMax);
  assert.strictEqual(m.licencias[1].km, 0);
  assert.strictEqual(m.totales.km, 0);
});

prueba('Neumáticos de alta gama: menos pinchazos en toda la flota, tras los de bajo consumo', function () {
  const m = config.mejoras.find(function (x) { return x.id === 'neumaticosAltaGama'; });
  assert.strictEqual(m.rama, 'vehiculo');
  assert.strictEqual(m.requiere, 'neumaticos');
  assert.strictEqual(config.mejoras.find(function (x) { return x.id === 'mampara'; }).requiere, 'neumaticosAltaGama');
  const e = flotaDe(1);
  const t = e.licencias[0].turnos.noche;
  Object.assign(t, { categoria: 'B', cualidad: null, cualidad2: null, defecto: null, defecto2: null, objetos: [] });
  const antes = sim.statsConductor(e, t, 'noche').find(function (x) { return x.clave === 'pinchazo'; }).valor;
  e.dinero = 1e6;
  assert.ok(comprarConRequisitos(e, 'neumaticosAltaGama').ok);
  cerca(sim.modificadores(e).pinchazo, m.efecto.pinchazo);
  const despues = sim.statsConductor(e, t, 'noche').find(function (x) { return x.clave === 'pinchazo'; }).valor;
  cerca(despues, antes * m.efecto.pinchazo);
});

console.log(pasadas + ' pruebas correctas');
