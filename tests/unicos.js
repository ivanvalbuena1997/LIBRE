/*
 * Libre · cuánto deja un conductor ÚNICO frente a un LEGENDARIO. No es una
 * prueba: es una medida para equilibrar (Iván, 25-11-2026).
 *
 * Flota de 3 licencias: tu turno vacío y 4 conductores B de nivel 5 sin
 * rasgos; en el turno de día de la 2.ª licencia, el que se mide (nivel 5,
 * dos huecos de objeto). Da el neto de la flota por jornada frente a tener
 * ahí un B más. Dos momentos, como tests/objetos.js: «pronto» (sin
 * mejoras) y «tarde» (Callejero, Taxi impecable, Propinas 3, Pago con
 * tarjeta, Mecánico 3 y Deflectores). Sin libranza.
 *
 *   node tests/unicos.js [semillas] [jornadas]
 */
'use strict';
require('../js/config.js');
require('../js/simulacion.js');
const sim = globalThis.Libre.sim;
const c = globalThis.Libre.config;
c.licencias.libranza = false;

const SEMILLAS = Number(process.argv[2]) || 12;
const JORNADAS = Number(process.argv[3]) || 60;
const DT = 0.25;
const XP5 = c.conductores.niveles.experiencia[4];

function generador(semilla) {
  let s = semilla % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const ESCENARIOS = {
  pronto: {},
  tarde: { callejero: 1, limpieza: 1, propinas: 3, datafono: 1, mecanico: 3, deflectores: 1 }
};
const LEG = { categoria: 'L', cualidad: 'simpatico', cualidad2: 'conoceCiudad' };
const PAC = { categoria: 'L', unico: 'paconi' };
const PRUEBAS = [
  { id: 'base', nombre: 'Un B sin rasgos (referencia)', t: { categoria: 'B' } },
  { id: 'leg', nombre: 'LEGENDARIO (Simpático + Conoce la ciudad)', t: LEG },
  { id: 'legPlanta', nombre: 'LEGENDARIO + Planta de Paconi', t: LEG, objetos: ['paconi'] },
  { id: 'pac', nombre: 'Paconi, sin objetos', t: PAC },
  { id: 'pacPlanta', nombre: 'Paconi + su planta', t: PAC, objetos: ['paconi'] },
  { id: 'pacPacos', nombre: 'Paconi + su planta + 3 Pacos en la flota (+15 %)', t: PAC, objetos: ['paconi'], pacos: 3 }
];

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
  let pacos = prueba.pacos || 0;
  const conductores = [];
  e.licencias.forEach(function (l, i) {
    ['dia', 'noche'].forEach(function (tn) {
      const t = l.turnos[tn];
      if (!t || t.quien !== 'conductor') return;
      const sujeto = i === 1 && tn === 'dia';
      Object.assign(t, { categoria: 'B', cualidad: null, cualidad2: null, cualidad3: null, defecto: null, defecto2: null,
        unico: null, xp: XP5, objetos: [], nombre: 'Laura' });
      if (sujeto) Object.assign(t, prueba.t, { objetos: (prueba.objetos || []).slice(), nombre: prueba.t.unico ? 'Paconi' : 'Laura' });
      else if (pacos > 0) { t.nombre = 'Paco'; pacos--; }
      conductores.push(t);
    });
  });
  e.ajustes.pararAlCierre = false;
  e.dinero = 0;
  const netos = [];
  let ultimo = null;
  const pasos = Math.round(JORNADAS * sim.segundosPorDia(e) / DT);
  for (let i = 0; i < pasos; i++) {
    if (i % 40 === 0) {
      conductores.forEach(function (t) { t.xp = XP5; });
      e.objetos = {}; e.bandeja = [];
    }
    sim.avanzar(e, DT);
    if (e.caja.ayer && e.caja.ayer.dia !== ultimo) {
      ultimo = e.caja.ayer.dia;
      netos.push(sim.netoCaja(e.caja.ayer));
    }
  }
  return netos.reduce(function (a, b) { return a + b; }, 0) / netos.length;
}

const inicio = Date.now();
const media = function (v) { return v.reduce(function (a, b) { return a + b; }, 0) / v.length; };
const de = function (v) {
  const m = media(v);
  return Math.sqrt(v.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (v.length - 1) / v.length);
};
const f = function (n) { return (n >= 0 ? '+' : '') + n.toFixed(1).replace('.', ','); };
const res = {};
Object.keys(ESCENARIOS).forEach(function (esc) {
  res[esc] = {};
  const base = [];
  for (let s = 1; s <= SEMILLAS; s++) base.push(partida(s, esc, PRUEBAS[0]));
  res[esc].netoBase = media(base);
  PRUEBAS.slice(1).forEach(function (p) {
    const v = [];
    for (let s = 1; s <= SEMILLAS; s++) v.push(partida(s, esc, p) - base[s - 1]);
    res[esc][p.id] = v;
  });
});
console.log('Neto de la flota con un B: pronto ' + res.pronto.netoBase.toFixed(0) + ' €, tarde ' + res.tarde.netoBase.toFixed(0) + ' € por jornada.\n');
console.log('| En el turno de día | Pronto: € por jornada frente a un B (±) | Tarde (±) |');
console.log('| --- | --- | --- |');
PRUEBAS.slice(1).forEach(function (p) {
  console.log('| ' + p.nombre + ' | ' + f(media(res.pronto[p.id])) + ' (' + de(res.pronto[p.id]).toFixed(1).replace('.', ',') + ') | ' +
    f(media(res.tarde[p.id])) + ' (' + de(res.tarde[p.id]).toFixed(1).replace('.', ',') + ') |');
});
console.log('\n_' + SEMILLAS + ' semillas × ' + JORNADAS + ' jornadas, en ' + Math.round((Date.now() - inicio) / 1000) + ' s._');
