/*
 * Libre · bot de progresión.
 *
 * Juega solo varias partidas (una por semilla) como un jugador sensato y
 * apunta cómo va a los 30, 60, 90, 120 y 150 minutos reales, además de
 * cuándo llega cada hito. No es una prueba: es una medida para equilibrar.
 *
 *   node tests/progresion.js                 10 semillas por perfil, 150 min
 *   node tests/progresion.js 4 90            4 semillas, 90 minutos
 *   node tests/progresion.js 10 150 json     además, los datos en bruto
 *
 * Cómo juega (los dos perfiles):
 *   - Hace sus carreras a clic en su turno, en la zona con más demanda, con
 *     0,7 s de reacción entre una y otra.
 *   - Tras cada ticket tarda 3 s en arrancar el día; si libra y nadie puede
 *     trabajar, salta al cierre (otros 2 s).
 *   - Cada 2 s mira la tienda. Primero la flota: coche para una licencia
 *     sin él y el mejor candidato que le llega para cada turno libre (si
 *     falta un coche o hay un turno libre, ahorra para eso y no compra
 *     nada más). Con todo cubierto ahorra para crecer (licencia, coche y
 *     dos conductores B) y mientras compra las mejoras que cuestan como
 *     mucho un 30 % de eso, de la más barata a la más cara. La placa, con
 *     una letra de libranza que aún no tenga la flota.
 *   - Equipa lo que encuentran sus conductores, de mejor a peor categoría
 *     (cambia uno peor por uno mejor), y vende lo que llega a la bandeja.
 *   Perfiles (PERFILES):
 *   - «siguiente»: compra solo lo que propone la tarjeta «Siguiente»
 *     (Libre.sim.objetivoCompra), en cuanto le llega el dinero.
 *   - «equilibrado»: conduce toda la partida; mejoras de hasta el 30 % de
 *     lo que cuesta crecer.
 *   - «flota»: igual, pero solo mejoras de hasta el 10 %: casi todo a
 *     licencias, coches y conductores.
 *   - «zonas»: como el de flota, pero con 2 licencias o más abre antes que
 *     nada las zonas que se compran (Estaciones y Aeropuerto), con las
 *     mejoras de su rama que piden antes (Hoteles y Emisora).
 *   - «gestor»: como el equilibrado, pero en cuanto puede (tiene Jornada
 *     larga) ahorra para la Oficina de gestión y las de su rama que la
 *     preceden (Taquillas, Curso de zonas y RRHH) antes que para nada más, y
 *     al tenerla deja el volante (su turno lo cubre un conductor).
 * No usa el modo sin conexión: todo el tiempo es partida abierta.
 */
'use strict';
require('../js/config.js');
require('../js/simulacion.js');
const sim = globalThis.Libre.sim;
const c = globalThis.Libre.config;

const SEMILLAS = Number(process.argv[2]) || 10;
const MINUTOS = Number(process.argv[3]) || 150;
const JSON_BRUTO = process.argv[4] === 'json';
const CORTES = [30, 60, 90, 120, 150].filter(function (m) { return m <= MINUTOS; });
const DT = 0.25;                 // paso de la simulación (s reales)
const REACCION = 0.7;            // entre carreras a clic
const LEER_TICKET = 3;           // s hasta «Arrancar día siguiente»
const MIRAR_TIENDA = 2;          // cada cuántos s mira qué comprar
const ORDEN_CAT = c.categorias.map(function (x) { return x.id; });
const PERFILES = {
  siguiente: { sigue: true },
  equilibrado: { ratio: 0.3, oficina: false, zonas: false },
  flota: { ratio: 0.1, oficina: false, zonas: false },
  zonas: { ratio: 0.1, oficina: false, zonas: true },
  gestor: { ratio: 0.3, oficina: true, zonas: false }
};
// Mejoras que abren zonas (el perfil «zonas» las compra en cuanto tiene 2 licencias).
const MEJORAS_ZONA = c.mejoras.filter(function (m) { return m.efecto && m.efecto.desbloqueaZona; }).map(function (m) { return m.id; });
const MEJORA_POR_ID = {};
c.mejoras.forEach(function (m) { MEJORA_POR_ID[m.id] = m; });
/*
 * Desde el 18-11-2026 cada rama es una cadena: para llegar a una mejora hay
 * que comprar antes las de delante. Da la primera de la cadena que falta
 * (la propia mejora si ya se puede comprar). Antes el bot solo miraba la
 * mejora final, nunca la alcanzaba, y «zonas» y «gestor» jugaban igual que
 * «flota» y «equilibrado» (arreglado el 21-11-2026).
 */
function pasoHacia(e, id) {
  let paso = id;
  while (MEJORA_POR_ID[paso].requiere && !sim.nivelMejora(e, MEJORA_POR_ID[paso].requiere)) paso = MEJORA_POR_ID[paso].requiere;
  return paso;
}

function generador(semilla) {
  let s = semilla % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function rangoCat(id) { return ORDEN_CAT.indexOf(id); }

function jugar(semilla, perfil) {
  const rng = generador(semilla * 7919 + 13);
  const e = sim.crearEstadoInicial(0, rng);
  e.azar = semilla * 104729 + 7;
  let t = 0, espera = 0, tienda = 0, ticket = 0;
  const hitos = {};
  const hallados = { total: 0 };
  ORDEN_CAT.forEach(function (id) { hallados[id] = 0; });
  const cortes = [];
  const netos = [];               // neto de cada jornada cerrada
  let ultimoCierre = null;

  function hito(clave) { if (hitos[clave] === undefined) hitos[clave] = t / 60; }

  function conductores() { return sim.todosLosConductores(e).map(function (x) { return x.t || x; }); }

  function turnosCubiertos() {
    return e.licencias.every(function (l) {
      return l.vehiculo && l.turnos.dia && l.turnos.noche;
    });
  }

  function equipar() {
    e.licencias.forEach(function (l) {
      ['dia', 'noche'].forEach(function (tn) {
        const tu = l.turnos[tn];
        if (!tu || tu.quien !== 'conductor') return;
        const disponibles = c.objetos.lista.filter(function (o) {
          return (e.objetos[o.id] || 0) > 0 && (tu.objetos || []).indexOf(o.id) === -1;
        }).sort(function (a, b) { return rangoCat(b.categoria) - rangoCat(a.categoria); });
        if (disponibles.length === 0) return;
        if ((tu.objetos || []).length < sim.huecosConductor(tu)) {
          sim.equiparObjeto(e, l.id, tn, disponibles[0].id);
          return;
        }
        // Lleno: cambia el peor que lleva por uno mejor, si lo hay.
        const peor = (tu.objetos || []).slice().sort(function (a, b) {
          return rangoCat(sim.buscarObjeto(a).categoria) - rangoCat(sim.buscarObjeto(b).categoria);
        })[0];
        if (peor && rangoCat(disponibles[0].categoria) > rangoCat(sim.buscarObjeto(peor).categoria) &&
            sim.objetosEnAlmacen(e) < sim.capacidadAlmacen(e)) {
          sim.quitarObjeto(e, l.id, tn, peor);
          sim.equiparObjeto(e, l.id, tn, disponibles[0].id);
        }
      });
    });
    // Lo que no cabe, se vende.
    while ((e.bandeja || []).length > 0) sim.venderObjeto(e, e.bandeja[0].id, 0);
  }

  function letrasFlota() { return e.licencias.map(function (l) { return sim.letraLicencia(l.numero); }); }

  function comprarLicencia() {
    // Con 3 licencias, primero la sociedad limitada (idea 1, 20-11-2026).
    if (sim.necesitaSociedad(e)) {
      if (!sim.montarSociedad(e, 'Taxis Bot SL').ok) return false;
      hito('sociedad');
      return true;
    }
    const placas = sim.placasEnVenta(e);
    const letras = letrasFlota();
    let indice = placas.findIndex(function (n) { return letras.indexOf(sim.letraLicencia(n)) === -1; });
    if (indice < 0) indice = 0;
    if (sim.comprarLicencia(e, rng, indice).ok) { hito('licencias ' + e.licencias.length); return true; }
    return false;
  }

  function contratarMejor(licenciaId, tn) {
    const cands = sim.candidatos(e).map(function (x, i) { return { x, i, p: sim.precioCandidato(x) }; })
      .filter(function (k) { return k.p <= e.dinero; })
      .sort(function (a, b) { return rangoCat(b.x.categoria) - rangoCat(a.x.categoria) || a.p - b.p; });
    if (cands.length && sim.contratarConductor(e, licenciaId, tn, cands[0].i).ok) {
      hito('conductores ' + conductores().length);
      if (rangoCat(cands[0].x.categoria) >= rangoCat('S')) hito('primer S o mejor');
      return true;
    }
    return false;
  }

  /* Perfil «siguiente»: lo que diga la tarjeta, en cuanto llega el dinero. */
  let fija = null;
  function comprarObjetivo() {
    for (let vueltas = 0; vueltas < 20; vueltas++) {
      const o = sim.objetivoCompra(e, fija);
      fija = o ? o.id : null;
      if (!o || o.precio > e.dinero) return;
      let ok = false;
      if (o.tipo === 'coche') ok = sim.comprarVehiculo(e, o.licenciaId).ok;
      else if (o.tipo === 'conductor') ok = contratarMejor(o.licenciaId, o.turno);
      else if (o.tipo === 'mejora') { ok = sim.comprarMejora(e, o.mejora).ok; if (ok) hito('mejora ' + o.mejora); }
      else ok = comprarLicencia();
      if (!ok) return;
      fija = null;
    }
  }

  function comprar() {
    let algo = true;
    let vueltas = 0;
    if (PERFILES[perfil].sigue) { comprarObjetivo(); algo = false; }
    while (algo && vueltas++ < 20) {
      algo = false;
      // Coches que faltan (si no llega, ahorra para él).
      let ahorrar = false;
      for (const l of e.licencias) {
        if (l.vehiculo) continue;
        if (sim.comprarVehiculo(e, l.id).ok) algo = true;
        else ahorrar = true;
      }
      // Turnos libres: el mejor candidato que le llega.
      for (const l of e.licencias) {
        if (!l.vehiculo) continue;
        for (const tn of ['dia', 'noche']) {
          if (l.turnos[tn]) continue;
          if (contratarMejor(l.id, tn)) algo = true;
          else ahorrar = true;
        }
      }
      if (ahorrar) break;
      // Con todo cubierto: ahorra para crecer (licencia, coche y dos
      // conductores B) y, mientras, compra solo las mejoras que cuestan como
      // mucho la parte de eso que diga su perfil. El gestor, en cuanto puede, va a por la
      // Oficina de gestión antes que nada.
      const precioB = c.categorias[0].contratar;
      const precioCrecer = sim.necesitaSociedad(e) ? c.sociedad.coste : sim.precioLicencia(e);
      const expansion = precioCrecer + sim.precioCoche(e) + 2 * precioB;
      const mejoras = [];
      // Lo que el perfil persigue antes que nada: el siguiente paso de su cadena.
      const objetivos = [];
      if (PERFILES[perfil].oficina && sim.nivelMejora(e, 'jornadaLarga') && !sim.nivelMejora(e, 'oficina')) objetivos.push(pasoHacia(e, 'oficina'));
      if (PERFILES[perfil].zonas && e.licencias.length >= 2) {
        MEJORAS_ZONA.forEach(function (id) { if (!sim.nivelMejora(e, id)) objetivos.push(pasoHacia(e, id)); });
      }
      c.mejoras.forEach(function (m) {
        if (m.requiere && !sim.nivelMejora(e, m.requiere)) return;
        const sig = sim.siguienteNivel(e, m.id);
        if (!sig) return;
        const prioritaria = objetivos.indexOf(m.id) !== -1;
        if (prioritaria || sig.precio <= PERFILES[perfil].ratio * expansion) mejoras.push({ precio: sig.precio, id: m.id, prioritaria });
      });
      mejoras.sort(function (a, b) { return (b.prioritaria - a.prioritaria) || a.precio - b.precio; });
      const m = mejoras[0];
      if (m && m.prioritaria) {
        if (m.precio <= e.dinero && sim.comprarMejora(e, m.id).ok) {
          algo = true;
          hito('mejora ' + m.id);
        }
        continue;   // ahorra para la Oficina o la zona
      }
      if (m && m.precio <= e.dinero) {
        if (sim.comprarMejora(e, m.id).ok) { algo = true; hito('mejora ' + m.id); }
      } else if (e.licencias.length < c.licencias.maximo && precioCrecer <= e.dinero) {
        if (comprarLicencia()) algo = true;
      }
    }
    // El gestor deja el volante en cuanto tiene la Oficina (con pasajero no
    // se puede: lo intenta en la siguiente vuelta).
    if (PERFILES[perfil].oficina && sim.nivelMejora(e, 'oficina') && sim.conduce(e) && !e.jugador.carrera &&
        sim.dejarDeConducir(e).ok) hito('deja el volante');
    if (turnosCubiertos()) hito('todo cubierto con ' + e.licencias.length + ' licencias');
    equipar();
  }

  function foto(minuto) {
    const todos = conductores();
    const porCat = {};
    ORDEN_CAT.forEach(function (id) { porCat[id] = 0; });
    todos.forEach(function (x) { porCat[x.categoria]++; });
    const niveles = todos.map(function (x) { return sim.nivelConductor(x); });
    const ultimos = netos.slice(-5);
    return {
      minuto,
      dinero: e.dinero,
      jornadas: sim.jornadaDe(e.reloj.minutos),
      netoMedio5: ultimos.length ? ultimos.reduce(function (a, b) { return a + b; }, 0) / ultimos.length : 0,
      licencias: e.licencias.length,
      coches: e.licencias.filter(function (l) { return l.vehiculo; }).length,
      conductores: todos.length,
      porCat,
      nivelMedio: niveles.length ? niveles.reduce(function (a, b) { return a + b; }, 0) / niveles.length : 0,
      nivelMax: niveles.length ? Math.max.apply(null, niveles) : 0,
      mejoras: Object.keys(e.mejoras).filter(function (k) { return e.mejoras[k] > 0; }).length,
      nivelesMejora: Object.keys(e.mejoras).reduce(function (s, k) { return s + (e.mejoras[k] || 0); }, 0),
      zonas: sim.zonasDisponibles(e).length,
      hallados: Object.assign({}, hallados),
      equipados: todos.reduce(function (s, x) { return s + (x.objetos || []).length; }, 0),
      conduce: sim.conduce(e)
    };
  }

  const fin = MINUTOS * 60;
  let corte = 0;
  while (t < fin) {
    // Ticket en pantalla: lo lee y arranca.
    if (e.cierrePendiente) {
      ticket += DT;
      if (ticket >= LEER_TICKET) { sim.arrancarDia(e); ticket = 0; }
    } else {
      // Libra y nadie trabaja: salta al cierre.
      if (sim.puedeSaltarDia(e)) {
        const r = sim.saltarAlCierre(e);
        if (r && r.ok !== false) { t += 2; }
      }
      // Sus carreras a clic.
      if (sim.conduce(e) && sim.jugadorEnTurno(e) && !e.jugador.carrera) {
        espera -= DT;
        if (espera <= 0) {
          const u = sim.ubicacionJugador(e);
          const info = sim.infoReloj(e.reloj.minutos);
          const zonas = sim.zonasDisponibles(e).slice().sort(function (a, b) {
            return sim.demandaZona(e, b, info) - sim.demandaZona(e, a, info);
          });
          if (u && zonas.length && u.datos.zona !== zonas[0]) sim.elegirZona(e, u.licenciaId, u.turno, zonas[0]);
          // Como un jugador atento: si le mira un pesetas, espera a que se vaya.
          if (!sim.vigilanciaActiva(e)) sim.buscarCliente(e, rng);
          espera = REACCION;
        }
      }
    }
    tienda += DT;
    if (tienda >= MIRAR_TIENDA) { tienda = 0; comprar(); }

    const r = sim.avanzar(e, DT);
    (r.eventos || []).forEach(function (ev) {
      if (ev.tipo === 'hallazgo') {
        hallados.total++;
        hallados[ev.categoria]++;
        if (ev.categoria === 'L') hito('primer objeto LEGENDARIO');
      }
      if (ev.tipo === 'nivel' && ev.nivel === c.conductores.niveles.experiencia.length) hito('primer nivel 10');
    });
    if (e.caja.ayer && e.caja.ayer.dia !== ultimoCierre) {
      ultimoCierre = e.caja.ayer.dia;
      netos.push(sim.netoCaja(e.caja.ayer));
    }
    t += DT;
    while (corte < CORTES.length && t >= CORTES[corte] * 60) { cortes.push(foto(CORTES[corte])); corte++; }
  }
  return { semilla, perfil, cortes, hitos };
}

// ------------------------------------------------------------ resumen

function stats(valores) {
  const v = valores.slice().sort(function (a, b) { return a - b; });
  const media = v.reduce(function (a, b) { return a + b; }, 0) / v.length;
  return { media, min: v[0], max: v[v.length - 1], mediana: v[Math.floor(v.length / 2)] };
}
function euros(n) { return Math.round(n).toLocaleString('es-ES') + ' €'; }
function num(n, d) { return n.toLocaleString('es-ES', { maximumFractionDigits: d === undefined ? 1 : d }); }
function rango(s, f) { return f(s.media) + ' (' + f(s.min) + '–' + f(s.max) + ')'; }

const resultados = [];
const inicio = Date.now();
Object.keys(PERFILES).forEach(function (perfil) {
  for (let i = 1; i <= SEMILLAS; i++) resultados.push(jugar(i, perfil));
});

const lineas = [];
Object.keys(PERFILES).forEach(function (perfil) {
  const rs = resultados.filter(function (r) { return r.perfil === perfil; });
  lineas.push('## Perfil ' + perfil + ' (' + rs.length + ' semillas)', '');
  lineas.push('| Min | Jornadas | Dinero | Neto/jornada (últ. 5) | Licencias | Conductores | B/A/S/S+/L | Nivel medio (máx) | Mejoras (niveles) | Zonas | Objetos hallados (equipados) |');
  lineas.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  CORTES.forEach(function (m, k) {
    const fs = rs.map(function (r) { return r.cortes[k]; });
    const g = function (f) { return stats(fs.map(f)); };
    const cat = ORDEN_CAT.map(function (id) { return num(g(function (f) { return f.porCat[id]; }).media); }).join('/');
    lineas.push('| ' + [m,
      rango(g(function (f) { return f.jornadas; }), function (x) { return num(x, 0); }),
      rango(g(function (f) { return f.dinero; }), euros),
      rango(g(function (f) { return f.netoMedio5; }), euros),
      rango(g(function (f) { return f.licencias; }), function (x) { return num(x, 1); }),
      rango(g(function (f) { return f.conductores; }), function (x) { return num(x, 1); }),
      cat,
      num(g(function (f) { return f.nivelMedio; }).media) + ' (' + num(g(function (f) { return f.nivelMax; }).media) + ')',
      num(g(function (f) { return f.mejoras; }).media) + ' (' + num(g(function (f) { return f.nivelesMejora; }).media) + ')',
      num(g(function (f) { return f.zonas; }).media),
      num(g(function (f) { return f.hallados.total; }).media) + ' (' + num(g(function (f) { return f.equipados; }).media) + ')'
    ].join(' | ') + ' |');
  });
  lineas.push('');
  // Hitos: minuto medio y cuántas semillas lo alcanzan.
  const claves = {};
  rs.forEach(function (r) { Object.keys(r.hitos).forEach(function (k) { claves[k] = true; }); });
  const ordenados = Object.keys(claves).map(function (k) {
    const vs = rs.map(function (r) { return r.hitos[k]; }).filter(function (v) { return v !== undefined; });
    return { k, s: stats(vs), n: vs.length };
  }).sort(function (a, b) { return a.s.media - b.s.media; });
  lineas.push('| Hito | Minuto (medio, mín–máx) | Semillas que llegan |', '| --- | --- | --- |');
  ordenados.forEach(function (h) {
    lineas.push('| ' + h.k + ' | ' + rango(h.s, function (x) { return num(x, 0); }) + ' | ' + h.n + ' de ' + rs.length + ' |');
  });
  lineas.push('');
});
lineas.push('_' + resultados.length + ' partidas de ' + MINUTOS + ' min en ' + Math.round((Date.now() - inicio) / 1000) + ' s._');
console.log(lineas.join('\n'));
if (JSON_BRUTO) console.log(JSON.stringify(resultados));
