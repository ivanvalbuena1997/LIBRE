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
    },
    // Versión 12: rasgos. Los conductores ya contratados reciben una cualidad
    // y un defecto al azar, y se sortean los candidatos para contratar.
    11: function (estado) {
      estado.licencias.forEach(function (l) {
        ['dia', 'noche'].forEach(function (t) {
          const x = l.turnos[t];
          if (!x || x.quien !== 'conductor' || x.cualidad) return;
          const r = Libre.sim.sortearRasgos(estado);
          x.cualidad = r.cualidad;
          x.defecto = r.defecto;
        });
      });
      Libre.sim.sortearCandidatos(estado);
    },
    // Versión 13: experiencia. Los conductores ya contratados empiezan en
    // nivel 1, con sus contadores de carreras y facturado a cero.
    12: function (estado) {
      estado.licencias.forEach(function (l) {
        ['dia', 'noche'].forEach(function (t) {
          const x = l.turnos[t];
          if (!x || x.quien !== 'conductor') return;
          x.xp = x.xp || 0;
          x.carreras = x.carreras || 0;
          x.facturado = x.facturado || 0;
        });
      });
    },
    // Versión 14: objetos para conductores. Almacén vacío y nadie lleva nada.
    13: function (estado) {
      estado.objetos = estado.objetos || {};
      estado.licencias.forEach(function (l) {
        ['dia', 'noche'].forEach(function (t) {
          const x = l.turnos[t];
          if (x && x.quien === 'conductor') x.objetos = x.objetos || [];
        });
      });
    },
    // Versión 15: los objetos ya no se compran, se encuentran. Bandeja vacía
    // para lo encontrado con el almacén lleno; lo que tenías se queda.
    14: function (estado) {
      estado.bandeja = estado.bandeja || [];
    },
    // Versión 16: categorías de conductores. Los ya contratados reciben una
    // al azar; en las altas pierden el defecto (S, la mitad de las veces) y
    // los LEGENDARIOS ganan una segunda cualidad. Candidatos nuevos.
    15: function (estado) {
      const sim = Libre.sim;
      estado.licencias.forEach(function (l) {
        ['dia', 'noche'].forEach(function (t) {
          const x = l.turnos[t];
          if (!x || x.quien !== 'conductor' || x.categoria) return;
          x.categoria = sim.sortearCategoria(estado);
          const cat = sim.buscarCategoria(x.categoria);
          if (!(sim.azar(estado) < cat.probDefecto)) x.defecto = null;
          x.cualidad2 = null;
          if (cat.cualidades > 1) {
            const otras = Libre.config.conductores.cualidades.filter(function (q) { return q.id !== x.cualidad; });
            x.cualidad2 = otras[Math.floor(sim.azar(estado) * otras.length)].id;
          }
        });
      });
      sim.sortearCandidatos(estado);
    },
    // Versión 17: reserva de conductores (vacía).
    16: function (estado) {
      estado.reserva = estado.reserva || [];
    },
    // Versión 18: libranzas. Las placas para elegir se sortean al comprar.
    17: function (estado) {
      estado.placasEnVenta = null;
    },
    // Versión 19: los conductores B tienen dos defectos; los que ya están en
    // el último nivel reciben su premio (un defecto menos o una cualidad más).
    18: function (estado) {
      const sim = Libre.sim;
      const c = Libre.config;
      sim.todosLosConductores(estado).forEach(function (x) {
        const t = x.t;
        t.cualidad3 = t.cualidad3 || null;
        t.defecto2 = t.defecto2 || null;
        const cat = sim.buscarCategoria(t.categoria);
        if (cat && cat.defectos > 1 && t.defecto && !t.defecto2) {
          const cualidad = sim.buscarRasgo(t.cualidad);
          const otros = c.conductores.defectos.filter(function (d) {
            return d.id !== t.defecto && (!cualidad || d.id !== cualidad.opuesto);
          });
          t.defecto2 = otros[Math.floor(sim.azar(estado) * otros.length)].id;
        }
        if (sim.nivelConductor(t) === c.conductores.niveles.experiencia.length) sim.premioNivelMaximo(estado, t);
      });
      sim.sortearCandidatos(estado);
    },
    // Versión 20: la caja apunta qué licencias trabajaron (para el ticket).
    // En lo ya guardado no se sabe: hoy cuenta desde ahora.
    19: function (estado) {
      [estado.caja.hoy, estado.caja.ayer, estado.cierrePendiente].forEach(function (caja) {
        if (caja && !caja.licencias) caja.licencias = [];
      });
    },
    // Versión 21: las cuatro «Jornada larga» pasan a ser una mejora con
    // niveles: tantos niveles como tenías comprados.
    20: function (estado) {
      const m = estado.mejoras;
      const nivel = ['jornada1', 'jornada2', 'jornada3', 'jornada4'].filter(function (id) { return m[id]; }).length;
      ['jornada1', 'jornada2', 'jornada3', 'jornada4'].forEach(function (id) { delete m[id]; });
      if (nivel) m.jornadaLarga = nivel;
    },
    // Versión 22 (Iván, 18-11-2026): Bolsas de papel, Rueda de repuesto y
    // Cámara de seguridad dejan de ser mejoras (y desaparecen los
    // consumibles). Se devuelve lo pagado (precios de entonces) y cada una
    // vuelve como objeto en el almacén (o en la bandeja, si no cabe).
    21: function (estado) {
      const m = estado.mejoras || {};
      const inv = estado.inventario || {};
      const pasan = [
        { mejora: 'bolsas', precio: 800, objeto: 'bolsaVomito' },
        { mejora: 'rueda', precio: 300, objeto: 'rueda' },
        { mejora: 'camara', precio: 1000, objeto: 'camara' }
      ];
      let devuelto = (inv.ruedas || 0) * 80 + (inv.bolsas || 0) * 2;
      estado.objetos = estado.objetos || {};
      estado.bandeja = estado.bandeja || [];
      const capacidad = Libre.sim.capacidadAlmacen(estado);
      pasan.forEach(function (x) {
        if (!m[x.mejora]) return;
        delete m[x.mejora];
        devuelto += x.precio;
        if (Libre.sim.objetosEnAlmacen(estado) < capacidad) estado.objetos[x.objeto] = (estado.objetos[x.objeto] || 0) + 1;
        else estado.bandeja.push({ id: x.objeto, conductor: 'la mudanza' });
      });
      estado.dinero += devuelto;
      delete estado.inventario;
    },
    // Pestaña Estadísticas (18-11-2026): historial de jornadas, mejor día,
    // despedidos e id fijo de cada conductor. Lo de antes no se puede
    // reconstruir: el historial empieza con el último cierre (sin el reparto
    // por conductor).
    22: function (estado) {
      const ayer = estado.caja && estado.caja.ayer;
      estado.historial = ayer ? [{
        dia: ayer.dia, ingresos: ayer.ingresos, extras: ayer.extras || 0, neto: Libre.sim.netoCaja(ayer),
        carreras: ayer.carreras, tu: null, conductores: {}
      }] : [];
      estado.mejorDia = ayer ? { dia: ayer.dia, ingresos: ayer.ingresos } : null;
      estado.exConductores = [];
      let id = 0;
      Libre.sim.todosLosConductores(estado).forEach(function (x) { x.t.id = ++id; });
      estado.ultimoIdConductor = id;
      estado.caja.hoy.porConductor = {};
      estado.caja.hoy.tuyo = 0;
    },
    // 23 → 24: la lluvia es chubasco o tormenta (Iván, 18-11-2026). La que
    // ya estaba sorteada se queda como chubasco.
    23: function (estado) {
      if (estado.lluvia && !estado.lluvia.tipo) estado.lluvia.tipo = 'chubasco';
    },
    // 40 → 41: el grupo de la flota (Iván, 26-11-2026): con la SL ya
    // montada, el grupo existe y espera tu primer mensaje.
    40: function (estado) {
      if (estado.chat === undefined) estado.chat = estado.empresa ? { iniciado: false, mensajes: [], noLeidos: 0, recientes: [] } : null;
    },
    // 39 → 40: combinar automáticamente (Iván, 26-11-2026): apagado.
    39: function (estado) {
      estado.ajustes = estado.ajustes || { pararAlCierre: true };
      if (estado.ajustes.combinarHasta === undefined) estado.ajustes.combinarHasta = null;
    },
    // 38 → 39: caras ilustradas (Iván, 26-11-2026): cada conductor (y los
    // candidatos y despedidos) recibe una cara de su sexo, sin repetir.
    38: function (estado) {
      const sim = Libre.sim;
      sim.todosLosConductores(estado).forEach(function (x) { sim.asignarCara(estado, x.t); });
      (estado.candidatos || []).forEach(function (t) { sim.asignarCara(estado, t); });
      (estado.exConductores || []).forEach(function (t) { sim.asignarCara(estado, t); });
    },
    // 37 → 38: eventos de clientes (Iván, 25-11-2026): su estado y tu agenda
    // de ÚNICOS. El primero se programa al correr el reloj.
    37: function (estado) {
      const h = estado.historia = estado.historia || { introVista: true };
      if (!h.eventos) h.eventos = { proximo: null, pendiente: null, resultado: null, vistos: {}, ultimo: null, forzado: null };
      if (!h.agenda) h.agenda = [];
    },
    // 36 → 37: conductores ÚNICOS (Iván, 25-11-2026): campo `unico` en cada
    // conductor (null en los de antes). Nada más que convertir.
    36: function (estado) {
      const marcar = function (t) { if (t && t.quien === 'conductor' && t.unico === undefined) t.unico = null; };
      estado.licencias.forEach(function (l) { marcar(l.turnos.dia); marcar(l.turnos.noche); });
      (estado.reserva || []).forEach(marcar);
    },
    // 35 → 36: historia (Iván, 25-11-2026). Las partidas ya empezadas no
    // ven la introducción: solo sale al principio.
    35: function (estado) {
      if (!estado.historia) estado.historia = { introVista: true };
    },
    // 34 → 35: tu cara y tu nombre (Iván, 24-11-2026): los de serie.
    34: function (estado) {
      const p = estado.personaje = estado.personaje || { xp: 0, puntos: 0, mejoras: {} };
      if (p.nombre === undefined) p.nombre = null;
      if (!p.aspecto) p.aspecto = Object.assign({}, Libre.config.personaje.aspecto.inicial);
    },
    // 33 → 34: mejoras de tu personaje (Iván, 24-11-2026). «Incógnito al
    // volante» sale del árbol: quien la compró la conserva como mejora del
    // personaje, gratis. La racha deja de estar para todos.
    33: function (estado) {
      const p = estado.personaje = estado.personaje || { xp: 0 };
      if (typeof p.puntos !== 'number') p.puntos = 0;
      if (!p.mejoras) p.mejoras = {};
      if (estado.mejoras && estado.mejoras.incognitoTu) p.mejoras.incognitoTu = 1;
      if (estado.mejoras) delete estado.mejoras.incognitoTu;
      if (estado.ganadoMejoras) delete estado.ganadoMejoras.incognitoTu;
      if (Array.isArray(estado.mejorasAntesDeCuenta)) {
        estado.mejorasAntesDeCuenta = estado.mejorasAntesDeCuenta.filter(function (id) { return id !== 'incognitoTu'; });
      }
    },
    // 32 → 33: tu personaje (Iván, 24-11-2026): experiencia de la partida.
    // Empieza a contar ahora.
    32: function (estado) {
      if (!estado.personaje) estado.personaje = { xp: 0 };
    },
    // 31 → 32: sin progreso fuera (Iván, 22-11-2026): las multas medias del
    // pesetas sin conexión ya no existen.
    31: function (estado) {
      delete estado.pesetasFuera;
    },
    // 30 → 31: búsquedas del Cazatalentos pagadas hoy (idea 11).
    30: function (estado) {
      if (typeof estado.rebuscasHoy !== 'number') estado.rebuscasHoy = 0;
    },
    // 29 → 30: lo que te ha hecho ganar cada mejora (idea 16). Se empieza a
    // contar ahora; las que ya tenías se apuntan para que la hoja lo diga.
    29: function (estado) {
      if (!estado.ganadoMejoras) estado.ganadoMejoras = {};
      if (!Array.isArray(estado.mejorasAntesDeCuenta)) {
        estado.mejorasAntesDeCuenta = Object.keys(estado.mejoras || {}).filter(function (id) {
          return Number(estado.mejoras[id]) > 0 || estado.mejoras[id] === true;
        });
      }
    },
    // 28 → 29: la sociedad limitada (estado.empresa, null mientras no la
    // montes). Las partidas con 4 licencias o más ya crecieron sin ella: se
    // les monta una con un nombre por defecto, sin cobrarla.
    28: function (estado) {
      if (estado.empresa === undefined) {
        estado.empresa = estado.licencias.length > Libre.config.sociedad.licenciasSinSociedad
          ? { nombre: 'Taxis Libre SL', jornada: 0 } : null;
      }
    },
    // 27 → 28: el pesetas que te vigila (estado.jugador.vigilancia, null
    // si no hay ninguno). Nada que convertir.
    27: function () {},
    // 26 → 27: multas del pesetas sin conexión (Iván, 20-11-2026):
    // estado.pesetasFuera acumula las que tocan de media hasta cobrar una.
    26: function (estado) {
      if (typeof estado.pesetasFuera !== 'number') estado.pesetasFuera = 0;
    },
    // 25 → 26: coches de alquiler (Iván, 20-11-2026): lic.alquiler, null o
    // ausente si el coche es tuyo. Nada que convertir.
    25: function () {},
    // 24 → 25: kilometraje de cada coche (Iván, 19-11-2026). El de la primera
    // licencia es el coche de segunda mano del principio; los demás, nuevos
    // desde que llegan. Lo rodado hasta hoy no se sabe: empieza a contar ya.
    24: function (estado) {
      estado.licencias.forEach(function (l, i) {
        if (typeof l.km !== 'number') l.km = l.vehiculo && i === 0 ? Libre.sim.kmCocheUsado() : 0;
      });
      if (typeof estado.totales.km !== 'number') estado.totales.km = 0;
    }
  };

  function migrar(estado) {
    const actual = Libre.config.versionGuardado;
    if (typeof estado.version !== 'number') throw new Error('La partida no tiene número de versión.');
    if (estado.version > actual) throw new Error('La partida es de una versión más nueva del juego: recarga la página para tener la última versión e inténtalo otra vez.');
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

  /*
   * Exportar e importar comprimido (Iván, 23-11-2026): el JSON se comprime
   * con deflate (js/fflate.js) antes del base64 y el texto empieza por
   * PREFIJO_COMPRIMIDO. Unas 3 veces más corto. Los textos de antes (base64
   * del JSON, empiezan por «eyJ») se siguen importando.
   */
  const PREFIJO_COMPRIMIDO = 'LIBRE2';
  function compresor() {
    if (raiz.fflate) return raiz.fflate;
    if (typeof require === 'function') return require('./fflate.js');   // en Node (pruebas)
    throw new Error('Falta js/fflate.js');
  }
  function aBase64(bytes) {
    let binario = '';
    for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);
    return btoa(binario);
  }
  function deBase64(texto) {
    return Uint8Array.from(atob(texto), function (ch) { return ch.charCodeAt(0); });
  }

  /* Texto para copiar y pegar: el JSON (con acentos a salvo) comprimido y en base64. */
  function exportar(estado) {
    const bytes = new TextEncoder().encode(JSON.stringify(estado));
    return PREFIJO_COMPRIMIDO + aBase64(compresor().deflateSync(bytes, { level: 9 }));
  }

  /*
   * Deja solo los caracteres del base64. Al copiar y pegar en el móvil (notas,
   * mensajería) el texto puede llegar con espacios duros, caracteres
   * invisibles, comillas o saltos de línea, y atob() falla con ellos
   * (Iván, 19-11-2026: una importación falló). También acepta la variante
   * con - y _ y le repone el relleno = que falte.
   */
  function limpiarTexto(texto) {
    const t = String(texto).replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/]/g, '');
    // El formato comprimido lleva delante el prefijo: el relleno va tras él.
    return t.indexOf(PREFIJO_COMPRIMIDO) === 0 ? PREFIJO_COMPRIMIDO + rellenar(t.slice(PREFIJO_COMPRIMIDO.length)) : rellenar(t);
  }
  function rellenar(t) {
    while (t.length % 4) t += '=';
    return t;
  }

  /* Convierte el texto exportado en un estado. Lanza un Error si no vale. */
  function importar(texto) {
    const limpio = limpiarTexto(texto);
    if (!limpio) throw new Error('No hay ningún texto de partida que importar.');
    let json;
    try {
      // Formato nuevo (comprimido) o el de antes (el JSON en base64).
      const comprimido = limpio.indexOf(PREFIJO_COMPRIMIDO) === 0;
      let bytes = deBase64(comprimido ? rellenar(limpio.slice(PREFIJO_COMPRIMIDO.length)) : limpio);
      if (comprimido) bytes = compresor().inflateSync(bytes);
      json = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      throw new Error('El texto está incompleto o no es una partida de Libre. Copia otra vez todo el texto exportado.');
    }
    return validar(migrar(json));
  }

  Libre.guardado = { CLAVE, guardar, cargar, borrar, exportar, importar, migrar, limpiarTexto };
})(globalThis);
