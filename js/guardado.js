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
