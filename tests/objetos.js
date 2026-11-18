/*
 * Mide cuánto deja cada objeto: 3 licencias, 5 conductores B de nivel 5
 * sin rasgos, todos con el mismo objeto; neto por conductor y jornada
 * frente a no llevar nada. Dos escenarios: «pronto» (sin mejoras) y
 * «tarde» (Callejero, Taxi impecable, Propinas 3, Pago con tarjeta,
 * Mecánico 3 y Deflectores).
 *   node tests/objetos.js [semillas] [jornadas]   (16 × 80: unos 6 minutos)
 */
'use strict';
const RAIZ = require('path').join(__dirname, '..');
require(RAIZ + '/js/config.js');
require(RAIZ + '/js/simulacion.js');
const sim = globalThis.Libre.sim;
const c = globalThis.Libre.config;
c.licencias.libranza = false;

const SEMILLAS = Number(process.argv[2]) || 6;
const JORNADAS = Number(process.argv[3]) || 40;
const DT = 0.25;

function generador(semilla) {
  let s = semilla % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const ESCENARIOS = {
  pronto: {},
  tarde: { callejero: 1, limpieza: 1, propinas: 3, datafono: 1, mecanico: 3, deflectores: 1 }
};

function partida(semilla, escenario, objetos) {
  const rng = generador(semilla * 31 + 7);
  const e = sim.crearEstadoInicial(0, rng);
  e.azar = semilla * 7919 + 1;
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
      Object.assign(t, { categoria: 'B', cualidad: null, cualidad2: null, cualidad3: null, defecto: null, defecto2: null,
        xp: c.conductores.niveles.experiencia[4], objetos: objetos.slice() });
      conductores.push(t);
    });
  });
  e.ajustes.pararAlCierre = false;
  e.dinero = 0;
  const netos = [];
  let ultimo = null;
  const pasos = Math.round(JORNADAS * sim.segundosPorDia(e) / DT);
  for (let i = 0; i < pasos; i++) {
    // Mismo nivel toda la partida y existencias llenas.
    if (i % 40 === 0) {
      conductores.forEach(function (t) { t.xp = c.conductores.niveles.experiencia[4]; });
      e.objetos = {}; e.bandeja = [];
    }
    sim.avanzar(e, DT);
    if (e.caja.ayer && e.caja.ayer.dia !== ultimo) {
      ultimo = e.caja.ayer.dia;
      // Los consumibles repuestos no cuentan: el coste está en «otros».
      netos.push(sim.netoCaja(e.caja.ayer));
    }
  }
  const media = netos.reduce(function (a, b) { return a + b; }, 0) / netos.length;
  return media / conductores.length;
}

const lista = [{ id: null, nombre: '(nada)', categoria: '-' }].concat(c.objetos.lista);
const out = {};
const inicio = Date.now();
Object.keys(ESCENARIOS).forEach(function (esc) {
  out[esc] = {};
  const base = [];
  for (let s = 1; s <= SEMILLAS; s++) base.push(partida(s, esc, []));
  out[esc].base = base;
  c.objetos.lista.forEach(function (o) {
    const vs = [];
    for (let s = 1; s <= SEMILLAS; s++) vs.push(partida(s, esc, [o.id]) - base[s - 1]);
    out[esc][o.id] = vs;
  });
});
const media = function (v) { return v.reduce(function (a, b) { return a + b; }, 0) / v.length; };
const de = function (v) { const m = media(v); return Math.sqrt(v.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (v.length - 1) / v.length); };
console.log('Base (neto por conductor y jornada): pronto ' + media(out.pronto.base).toFixed(1) + ' € · tarde ' + media(out.tarde.base).toFixed(1) + ' €');
console.log('| Objeto | Cat | Pronto €/jornada (±) | % | Tarde €/jornada (±) | % |');
c.objetos.lista.forEach(function (o) {
  const p = out.pronto[o.id], t = out.tarde[o.id];
  console.log('| ' + o.nombre + ' | ' + o.categoria + ' | ' + media(p).toFixed(2) + ' (' + de(p).toFixed(2) + ') | ' +
    (100 * media(p) / media(out.pronto.base)).toFixed(1) + ' | ' + media(t).toFixed(2) + ' (' + de(t).toFixed(2) + ') | ' +
    (100 * media(t) / media(out.tarde.base)).toFixed(1) + ' |');
});
console.log('(' + Math.round((Date.now() - inicio) / 1000) + ' s)');
console.log(JSON.stringify(out));
