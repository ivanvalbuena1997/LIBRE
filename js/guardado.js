/*
 * Libre · guardado.
 *
 * Guarda el estado en localStorage con su número de versión, lo exporta e
 * importa como texto y migra partidas antiguas. No toca el HTML.
 *
 * Para cambiar la forma del estado:
 *   1. Sube Libre.config.versionGuardado.
 *   2. Añade aquí migraciones[versiónAntigua] que convierta el estado
 *      a la versión siguiente.
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};

  const CLAVE = 'libre-partida';

  // migraciones[n] recibe un estado de la versión n y lo deja en la n + 1.
  const migraciones = {
    // Versión 2: mejoras. También completa campos que faltaban en partidas
    // de la versión 1 guardadas a medio desarrollo.
    1: function (estado) {
      estado.mejoras = estado.mejoras || {};
      estado.conductoresContratados = estado.conductoresContratados || 0;
      estado.jugador.automatico = !!estado.jugador.automatico;
    },
    // Versión 3: pausa al cierre del día y ajustes de la partida.
    2: function (estado) {
      estado.cierrePendiente = null;
      estado.ajustes = { pararAlCierre: true };
    },
    // Versión 4: número de licencia (con su letra) y kilómetros en la caja.
    3: function (estado) {
      estado.licencias.forEach(function (l) {
        if (!l.numero) l.numero = Libre.sim.sortearNumeroLicencia(estado);
      });
      [estado.caja.hoy, estado.caja.ayer, estado.cierrePendiente].forEach(function (caja) {
        if (caja && caja.km === undefined) caja.km = 0;
      });
    },
    // Versión 5: tu turno siempre es a clic (desaparece jugador.automatico) y
    // se recuerda tu zona por si dejas de conducir.
    4: function (estado) {
      delete estado.jugador.automatico;
      let zona = null;
      estado.licencias.forEach(function (l) {
        ['dia', 'noche'].forEach(function (t) {
          if (l.turnos[t] && l.turnos[t].quien === 'jugador') zona = l.turnos[t].zona;
        });
      });
      estado.jugador.zona = zona || Libre.config.zonaInicial;
    },
    // Versión 6: los conductores hacen carreras reales con azar con semilla.
    5: function (estado) {
      estado.azar = Math.floor(Math.random() * 4294967296) >>> 0;
    },
    // Versión 7: eventos (incidencias en la caja, lluvia, evento forzado).
    6: function (estado) {
      [estado.caja.hoy, estado.caja.ayer, estado.cierrePendiente].forEach(function (caja) {
        if (!caja) return;
        caja.extras = caja.extras || 0;
        caja.otros = caja.otros || 0;
        caja.incidencias = caja.incidencias || {};
      });
      estado.lluvia = null;
      estado.eventosForzados = [];
    },
    // Versión 8: mejoras por niveles (las ya compradas pasan a nivel 1).
    7: function (estado) {
      Object.keys(estado.mejoras).forEach(function (id) {
        if (estado.mejoras[id] === true) estado.mejoras[id] = 1;
      });
    },
    // Versión 9: árbol de mejoras. Una rueda ya comprada cuenta como mejora
    // (abre el mecánico). Las mejoras compradas se respetan aunque ahora
    // pidan otra antes.
    8: function (estado) {
      if (estado.licencias.some(function (l) { return l.ruedaRepuesto; })) estado.mejoras.rueda = 1;
    },
    // Versión 10: retratos. Los conductores ya contratados conservan su nombre
    // y reciben retrato: el del personaje con su nombre si existe; si no, uno
    // al azar.
    9: function (estado) {
      const personajes = Libre.config.conductores.personajes;
      estado.licencias.forEach(function (l) {
        ['dia', 'noche'].forEach(function (t) {
          const x = l.turnos[t];
          if (!x || x.quien !== 'conductor' || x.retrato !== undefined) return;
          const mismo = personajes.findIndex(function (p) { return p.nombre === x.nombre; });
          x.retrato = mismo !== -1 ? mismo : Math.floor(Math.random() * personajes.length);
        });
      });
    },
    // Versión 11: inventario de consumibles. Las ruedas de repuesto que
    // llevaban los coches pasan al almacén común.
    10: function (estado) {
      let ruedas = 0;
      estado.licencias.forEach(function (l) {
        if (l.ruedaRepuesto) ruedas++;
        delete l.ruedaRepuesto;
      });
      estado.inventario = { ruedas, bolsas: 0 };
    }
  };

  function migrar(estado) {
    const actual = Libre.config.versionGuardado;
    if (typeof estado.version !== 'number') throw new Error('La partida no tiene número de versión.');
    if (estado.version > actual) throw new Error('La partida es de una versión más nueva del juego.');
    while (estado.version < actual) {
      const paso = migraciones[estado.version];
      if (!paso) throw new Error('No sé convertir partidas de la versión ' + estado.version + '.');
      paso(estado);
      estado.version++;
    }
    return estado;
  }

  function validar(estado) {
    const bien = estado && typeof estado === 'object' &&
      typeof estado.dinero === 'number' && isFinite(estado.dinero) &&
      estado.reloj && typeof estado.reloj.minutos === 'number' &&
      Array.isArray(estado.licencias) && estado.licencias.length > 0 &&
      estado.caja && estado.caja.hoy;
    if (!bien) throw new Error('El texto no es una partida de Libre válida.');
    return estado;
  }

  function guardar(estado) {
    try {
      raiz.localStorage.setItem(CLAVE, JSON.stringify(estado));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Devuelve el estado guardado, o null si no hay partida o está dañada. */
  function cargar() {
    let texto = null;
    try { texto = raiz.localStorage.getItem(CLAVE); } catch (e) { return null; }
    if (!texto) return null;
    try {
      return validar(migrar(JSON.parse(texto)));
    } catch (e) {
      return null;
    }
  }

  function borrar() {
    try { raiz.localStorage.removeItem(CLAVE); } catch (e) { /* nada que borrar */ }
  }

  /* Texto en base64 (con acentos a salvo) para copiar y pegar. */
  function exportar(estado) {
    const json = JSON.stringify(estado);
    const bytes = new TextEncoder().encode(json);
    let binario = '';
    bytes.forEach(function (b) { binario += String.fromCharCode(b); });
    return btoa(binario);
  }

  /* Convierte el texto exportado en un estado. Lanza un Error si no vale. */
  function importar(texto) {
    let json;
    try {
      const binario = atob(String(texto).trim());
      const bytes = Uint8Array.from(binario, function (ch) { return ch.charCodeAt(0); });
      json = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      throw new Error('El texto no es una partida de Libre válida.');
    }
    return validar(migrar(json));
  }

  Libre.guardado = { CLAVE, guardar, cargar, borrar, exportar, importar, migrar };
})(globalThis);
