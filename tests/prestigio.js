/*
 * Libre · bot del prestigio (Iván, 24-11-2026).
 *
 * No es una prueba: mide el ritmo de los reinicios. El bot juega como el
 * perfil «equilibrado» de tests/progresion.js (conduce, 0,7 s de reacción,
 * compra flota y mejoras); en cuanto tu personaje llega al nivel objetivo,
 * empieza de cero gastando los puntos por orden de PRIORIDAD (compra
 * niveles mientras le llegan; si el siguiente no le llega, se los guarda) y
 * repite hasta tener todas las mejoras del personaje.
 *
 *   node tests/prestigio.js                  niveles 3, 5, 7 y 9, 1 semilla
 *   node tests/prestigio.js 2 5,7            2 semillas, niveles 5 y 7
 *
 * Da, por nivel objetivo: cuántos reinicios hacen falta, el tiempo total y
 * cada reinicio (minutos reales, licencias al reiniciar y puntos gastados en
 * total). Informe en docs/analisis-prestigio.md.
 */
'use strict';
const { jugar } = require('./progresion.js');
const sim = globalThis.Libre.sim;
const c = globalThis.Libre.config;

const SEMILLAS = Number(process.argv[2]) || 1;
const NIVELES = (process.argv[3] || '3,5,7,9').split(',').map(Number);
const TOPE_MINUTOS = 1500;       // por reinicio, por si no llega
const MAX_REINICIOS = 60;

// Lo que compra primero: lo que acelera el arranque y tu turno; al final, las gamas.
const PRIORIDAD = ['racha', 'ahorros', 'cocheNuevo', 'veterano', 'agenda', 'fondoFisico', 'callejero', 'ahorros',
  'rachaLarga', 'reflejos', 'veterano', 'fondoFisico', 'callejero', 'ahorros', 'rachaLarga', 'reflejos', 'incognitoTu',
  'fondoFisico', 'rachaLarga', 'fondoFisico', 'tesla', 'fondoFisico', 'mercedes'];
const TOTAL = c.personaje.mejoras.reduce(function (s, m) {
  return s + m.niveles.reduce(function (a, n) { return a + n.coste; }, 0);
}, 0);

function elegir(e) {
  const compras = [];
  for (const id of PRIORIDAD) {
    const r = sim.probarComprasPersonaje(e, compras.concat([id]));
    if (r.ok) { compras.push(id); continue; }
    if (/máximo/.test(r.mensaje)) continue;   // ya la tiene entera
    break;                                     // no le llega: ahorra
  }
  return compras;
}
function gastado(personaje) {
  return c.personaje.mejoras.reduce(function (a, m) {
    return a + m.niveles.slice(0, personaje.mejoras[m.id] || 0).reduce(function (x, y) { return x + y.coste; }, 0);
  }, 0);
}

const inicio = Date.now();
const lineas = ['| Reinicia en | Semilla | Reinicios | Tiempo total | 1.º | Último | Puntos de cada partida |', '| --- | --- | --- | --- | --- | --- | --- |'];
const detalle = [];
NIVELES.forEach(function (objetivo) {
  for (let s = 1; s <= SEMILLAS; s++) {
    let personaje = { xp: 0, puntos: 0, mejoras: {} };
    let total = 0;
    const ciclos = [];
    for (let k = 0; k < MAX_REINICIOS; k++) {
      const r = jugar(s * 100 + k, 'equilibrado', { personaje, hastaNivel: objetivo, minutos: TOPE_MINUTOS });
      const e = r.estado;
      total += r.minutos;
      if (sim.nivelPersonaje(e).nivel < objetivo) { ciclos.push({ falla: true, min: r.minutos }); break; }
      const puntos = sim.puntosPrestigio(e) - (personaje.puntos || 0);
      const nuevo = sim.empezarDeCero(e, elegir(e), 0);
      if (!nuevo.ok) { ciclos.push({ falla: true, min: r.minutos, mensaje: nuevo.mensaje }); break; }
      personaje = nuevo.nuevo.personaje;
      ciclos.push({ min: r.minutos, lic: e.licencias.length, puntos, gastado: gastado(personaje) });
      if (gastado(personaje) >= TOTAL) break;
    }
    const buenos = ciclos.filter(function (x) { return !x.falla; });
    const h = function (m) { return Math.floor(m / 60) + ' h ' + String(Math.round(m % 60)).padStart(2, '0') + ' min'; };
    lineas.push('| Nivel ' + objetivo + ' | ' + s + ' | ' + buenos.length + (ciclos.length > buenos.length ? ' (no llega)' : '') +
      ' | ' + h(total) + ' | ' + (buenos[0] ? h(buenos[0].min) : '—') + ' | ' + (buenos.length ? h(buenos[buenos.length - 1].min) : '—') +
      ' | ' + (buenos[0] ? buenos[0].puntos : 0) + ' |');
    detalle.push('Nivel ' + objetivo + ', semilla ' + s + ': ' + ciclos.map(function (x) {
      return x.falla ? 'no llega (' + Math.round(x.min) + ' min)' : Math.round(x.min) + ' min, ' + x.lic + ' lic. → ' + x.gastado;
    }).join(' · '));
  }
});
console.log('Para tenerlo todo hacen falta ' + TOTAL + ' puntos.\n');
console.log(lineas.join('\n'));
console.log('\nCada reinicio (minutos reales, licencias al reiniciar → puntos gastados en total):\n');
console.log(detalle.join('\n\n'));
console.log('\n_En ' + Math.round((Date.now() - inicio) / 1000) + ' s._');
