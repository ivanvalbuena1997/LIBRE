/*
 * Libre · cuánto deja cada objeto (y algunos rasgos). No es una prueba: es
 * una medida para equilibrar.
 *
 * Flota de 3 licencias con 5 conductores B de nivel 5 sin rasgos (tu
 * turno, vacío); todos llevan lo mismo. Se compara con la misma flota sin
 * nada: € de neto por conductor y jornada, y aparte el valor de venta de
 * lo que encuentran (los objetos encontrados no se equipan ni se venden
 * durante la medida). Dos momentos: «pronto» (sin mejoras) y «tarde»
 * (Callejero, Taxi impecable, Propinas 3, Pago con tarjeta, Mecánico 3 y
 * Deflectores).
 *
 *   node tests/objetos.js [semillas] [jornadas] [json]   (16 × 80: unos 8 minutos)
 */
'use strict';
require('../js/config.js');
require('../js/simulacion.js');
const sim = globalThis.Libre.sim;
const c = globalThis.Libre.config;
c.licencias.libranza = false;
c.historia.eventos.activos = false;

const SEMILLAS = Number(process.argv[2]) || 6;
const JORNADAS = Number(process.argv[3]) || 40;
const JSON_BRUTO = process.argv[4] === 'json';
const DT = 0.25;
const VENTA = {};
c.categorias.forEach(function (k) { VENTA[k.id] = k.venta; });

function generador(semilla) {
  let s = semilla % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const ESCENARIOS = {
  pronto: {},
  tarde: { callejero: 1, limpieza: 1, propinas: 3, datafono: 1, mecanico: 3, deflectores: 1 }
};

// Qué se mide: cada objeto y, para comparar, unos rasgos.
const PRUEBAS = c.objetos.lista.map(function (o) {
  return { id: o.id, nombre: o.nombre, cat: o.categoria, objetos: [o.id] };
}).concat(['urraca', 'conoceCiudad', 'simpatico'].map(function (id) {
  return { id, nombre: 'Cualidad ' + sim.buscarRasgo(id).nombre, cat: 'rasgo', cualidad: id };
})).concat(['desastre', 'lento'].map(function (id) {
  return { id, nombre: 'Defecto ' + sim.buscarRasgo(id).nombre, cat: 'rasgo', defecto: id };
}));

function partida(semilla, escenario, prueba) {
  const rng = generador(semilla * 31 + 7);
  const e = sim.crearEstadoInicial(0, rng);
  e.azar = semilla * 7919 + 1;
  sim.terminarIntro(e);
  e.dinero = 1e7;
  sim.comprarLicencia(e); sim.comprarLicencia(e);
  e.licencias.forEach(function (l) {
    if (!l.vehiculo) sim.comprarVehiculo(e, l.id);
    ['dia', 'noche'].forEach(function (t) { if (!l.turnos[t]) sim.contratarConductor(e, l.id, t, 0); });
  });
  Object.assign(e.mejoras, ESCENARIOS[escenario]);
  const conductores = [];
  e.licencias.forEach(function (l) {
    ['dia', 'noche'].forEach(function (tn) {
      const t = l.turnos[tn];
      if (!t || t.quien !== 'conductor') return;
      Object.assign(t, { categoria: 'B', cualidad: prueba.cualidad || null, cualidad2: null, cualidad3: null,
        defecto: prueba.defecto || null, defecto2: null,
        xp: c.conductores.niveles.experiencia[4], objetos: (prueba.objetos || []).slice() });
      conductores.push(t);
    });
  });
  e.ajustes.pararAlCierre = false;
  e.dinero = 0;
  const netos = [];
  let ultimo = null, hallado = 0;
  const pasos = Math.round(JORNADAS * sim.segundosPorDia(e) / DT);
  for (let i = 0; i < pasos; i++) {
    // Mismo nivel toda la partida; lo encontrado se cuenta y se tira.
    if (i % 40 === 0) {
      conductores.forEach(function (t) { t.xp = c.conductores.niveles.experiencia[4]; });
      e.objetos = {}; e.bandeja = [];
    }
    const r = sim.avanzar(e, DT);
    (r.eventos || []).forEach(function (ev) { if (ev.tipo === 'hallazgo') hallado += VENTA[ev.categoria]; });
    if (e.caja.ayer && e.caja.ayer.dia !== ultimo) {
      ultimo = e.caja.ayer.dia;
      netos.push(sim.netoCaja(e.caja.ayer));
    }
  }
  const media = netos.reduce(function (a, b) { return a + b; }, 0) / netos.length;
  return { neto: media / conductores.length, hallado: hallado / JORNADAS / conductores.length };
}

const out = {};
const inicio = Date.now();
Object.keys(ESCENARIOS).forEach(function (esc) {
  out[esc] = {};
  const base = [];
  for (let s = 1; s <= SEMILLAS; s++) base.push(partida(s, esc, {}));
  out[esc].base = base;
  PRUEBAS.forEach(function (p) {
    const vs = [];
    for (let s = 1; s <= SEMILLAS; s++) {
      const r = partida(s, esc, p);
      vs.push({ neto: r.neto - base[s - 1].neto, hallado: r.hallado - base[s - 1].hallado });
    }
    out[esc][p.id] = vs;
  });
});
const media = function (v) { return v.reduce(function (a, b) { return a + b; }, 0) / v.length; };
const de = function (v) {
  const m = media(v);
  return Math.sqrt(v.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (v.length - 1) / v.length);
};
const f = function (n) { return n.toFixed(1).replace('.', ','); };
['pronto', 'tarde'].forEach(function (esc) {
  const b = out[esc].base;
  console.log('Base ' + esc + ': neto ' + f(media(b.map(function (x) { return x.neto; }))) + ' € y encuentra ' +
    f(media(b.map(function (x) { return x.hallado; }))) + ' € por conductor y jornada');
});
console.log('| Qué | Cat. | Pronto: neto (±) | Pronto: encontrado | Tarde: neto (±) | Tarde: encontrado | Tarde: total |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
PRUEBAS.forEach(function (p) {
  const pr = out.pronto[p.id], ta = out.tarde[p.id];
  const n = function (v) { return v.map(function (x) { return x.neto; }); };
  const h = function (v) { return v.map(function (x) { return x.hallado; }); };
  console.log('| ' + p.nombre + ' | ' + p.cat + ' | ' + f(media(n(pr))) + ' (' + f(de(n(pr))) + ') | ' + f(media(h(pr))) + ' | ' +
    f(media(n(ta))) + ' (' + f(de(n(ta))) + ') | ' + f(media(h(ta))) + ' | ' + f(media(n(ta)) + media(h(ta))) + ' |');
});
console.log('_' + Math.round((Date.now() - inicio) / 1000) + ' s_');
if (JSON_BRUTO) console.log(JSON.stringify(out));
