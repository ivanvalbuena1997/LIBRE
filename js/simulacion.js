/*
 * Libre · simulación.
 *
 * Lógica pura: lee los números de Libre.config y modifica un objeto de estado
 * en JSON plano. No toca el HTML ni el navegador, así que también funciona en
 * Node (tests/simulacion.test.js).
 *
 * Unidades:
 *   - El reloj del juego cuenta minutos de juego desde el inicio de la partida
 *     (estado.reloj.minutos). Un día son 1440 minutos.
 *   - avanzar() recibe segundos reales y los convierte según la duración del día.
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};

  const MIN_DIA = 24 * 60;

  function cfg() { return Libre.config; }

  /* Euros con formato es-ES para los textos de los eventos (sin DOM). */
  const formatoEuros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
  Libre.ui_euros = function (n) { return formatoEuros.format(n); };

  function fallo(mensaje) { return { ok: false, mensaje }; }
  function exito(mensaje) { return { ok: true, mensaje: mensaje || '' }; }

  // ------------------------------------------------------------------ Estado

  /*
   * Caja de una jornada. extras: propinas y recompensas; otros: gastos por
   * incidencias (limpieza, neumático, reparación). incidencias: lo que pasó,
   * agrupado por tipo { veces, importe } para el ticket.
   */
  function cajaVacia(dia) {
    return {
      dia, carreras: 0, km: 0, ingresos: 0, extras: 0,
      combustible: 0, conductores: 0, fijos: 0, otros: 0, incidencias: {},
      licencias: [],  // números de las licencias que han facturado (para el ticket)
      // Lo facturado por cada conductor ({ id: euros }) y por ti (Estadísticas).
      porConductor: {}, tuyo: 0
    };
  }

  /* Beneficio de una caja: ingresos y extras menos todos los gastos. */
  function netoCaja(caja) {
    return caja.ingresos + (caja.extras || 0) - caja.combustible - caja.conductores -
      caja.fijos - (caja.otros || 0);
  }

  function crearEstadoInicial(ahoraMs, rng) {
    const c = cfg();
    const estado = {
      version: c.versionGuardado,
      dinero: c.economia.dineroInicial,
      reloj: { minutos: c.reloj.minutoInicial },
      licencias: [
        {
          id: 1,
          numero: 0,              // se sortea abajo
          vehiculo: c.vehiculos.modeloInicial,
          km: 0,                  // de segunda mano: se sortea abajo
          turnos: {
            dia: { quien: 'jugador', nombre: 'Tú', zona: c.zonaInicial },
            noche: null
          }
        }
      ],
      // Tu turno siempre es a clic. zona recuerda dónde trabajabas para cuando
      // vuelvas a conducir tras dejarlo.
      jugador: { carrera: null, ultimaCarrera: null, zona: c.zonaInicial, vigilancia: null },
      // Tu personaje: experiencia de esta partida (el nivel sale de ella),
      // puntos de prestigio sin gastar y sus mejoras (nivel de cada una).
      personaje: { xp: 0, puntos: 0, mejoras: {}, nombre: null, aspecto: Object.assign({}, c.personaje.aspecto.inicial) },
      // Historia: si ya viste la introducción (sale una vez, al empezar).
      historia: { introVista: false, eventos: { proximo: null, pendiente: null, resultado: null, vistos: {}, ultimo: null, forzado: null }, agenda: [] },
      conductoresContratados: 0,
      mejoras: {},
      // Objetos para conductores en el almacén (sin equipar): { id: unidades }.
      objetos: {},
      // Objetos encontrados con el almacén lleno: esperan a que vendas algo.
      bandeja: [],
      // Conductores contratados que no trabajan: esperan a que les des un turno.
      reserva: [],
      caja: { hoy: cajaVacia(0), ayer: null },
      totales: { carreras: 0, ingresos: 0, km: 0 },
      // Tu sociedad limitada: { nombre, jornada } desde que la montas (idea 1).
      empresa: null,
      // Lo que te ha hecho ganar o ahorrar cada mejora (idea 16): { id: euros }.
      ganadoMejoras: {},
      // Búsquedas de candidatos pagadas hoy (Cazatalentos, idea 11).
      rebuscasHoy: 0,
      mejorasAntesDeCuenta: [],
      // Estadísticas: las últimas jornadas cerradas (registroDelDia()), el
      // mejor día de la partida y los despedidos que entran en el top.
      historial: [],
      mejorDia: null,
      exConductores: [],
      // Cada conductor contratado lleva un id fijo (para el historial).
      ultimoIdConductor: 0,
      // Pausa al cierre del día: mientras no sea null el reloj está parado y
      // guarda el ticket por enseñar (los días que cubre y sus sumas).
      cierrePendiente: null,
      ajustes: { pararAlCierre: true },
      // Semilla del azar de la flota (carreras de conductores y eventos).
      // Vive en el estado: al recargar, la partida sigue igual.
      azar: semillaInicial(rng),
      // Lluvia de la jornada en curso { jornada, desde, hasta, avisada }.
      lluvia: null,
      // Eventos forzados desde la consola para probar: se aplican en las
      // próximas carreras, en orden.
      eventosForzados: [],
      ultimaMarca: ahoraMs || 0
    };
    // Sin generador, el azar con semilla de la partida (nunca Math.random).
    estado.licencias[0].numero = sortearNumeroLicencia(estado, rng || generador(estado));
    estado.licencias[0].km = kmCocheUsado(rng || generador(estado));
    // Los tres candidatos que verás al contratar.
    sortearCandidatos(estado);
    return estado;
  }

  /* Km del coche de segunda mano con el que empiezas (entero, en su rango). */
  function kmCocheUsado(rng) {
    const v = cfg().vehiculos;
    return Math.round(v.kmInicialMin + (rng || Math.random)() * (v.kmInicialMax - v.kmInicialMin));
  }

  /*
   * Suma kilómetros al coche de una licencia y a los de toda la partida
   * (estado.totales.km, que no se pierden aunque cambie el coche).
   */
  function sumarKm(estado, lic, km) {
    if (!lic || !(km > 0)) return;
    lic.km = (lic.km || 0) + km;
    estado.totales.km = (estado.totales.km || 0) + km;
  }

  /* La licencia en la que está un turno (conductor o tú). */
  function licenciaDelTurno(estado, turno) {
    return estado.licencias.find(function (l) { return l.turnos.dia === turno || l.turnos.noche === turno; }) || null;
  }

  // ------------------------------------------------------------------- Azar

  function semillaInicial(rng) {
    return Math.floor((rng || Math.random)() * 4294967296) >>> 0;
  }

  /*
   * Generador con semilla guardada en estado.azar (mulberry32). Todo el azar
   * de la flota sale de aquí, nunca de Math.random.
   */
  function azar(estado) {
    estado.azar = (estado.azar + 0x6D2B79F5) >>> 0;
    let t = estado.azar;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function generador(estado) {
    return function () { return azar(estado); };
  }

  // --------------------------------------------------- Número de licencia

  /* Número al azar entre 1 y el total de licencias de Madrid, sin repetir en la partida. */
  function sortearNumeroLicencia(estado, rng) {
    const rnd = rng || Math.random;
    const maximo = cfg().licencias.maximo;
    const usados = {};
    estado.licencias.forEach(function (l) { if (l.numero) usados[l.numero] = true; });
    for (let intento = 0; intento < 1000; intento++) {
      const n = 1 + Math.floor(rnd() * maximo);
      if (!usados[n]) return n;
    }
    for (let n = 1; n <= maximo; n++) if (!usados[n]) return n;
    return 0;
  }

  /* Letra de libranza de un número de licencia (L, M, X, J o V). */
  function letraLicencia(numero) {
    return cfg().licencias.letraPorCifra[numero % 10];
  }

  /*
   * ¿Libra esa licencia en la jornada de `minutos`? Entre semana, el día de
   * su letra; en fin de semana, si la paridad de su número no coincide con
   * la del día (el «Día N» de la jornada). Libra el coche entero, los dos
   * turnos.
   */
  function libra(estado, lic, minutos) {
    if (!cfg().licencias.libranza || !lic || !lic.numero) return false;
    const jornada = jornadaDe(minutos === undefined ? estado.reloj.minutos : minutos);
    const diaSemana = ((jornada % 7) + 7) % 7;
    if (diaSemana < 5) return cfg().licencias.diaPorLetra[letraLicencia(lic.numero)] === diaSemana;
    return lic.numero % 2 !== (jornada + 1) % 2;
  }

  /*
   * Las placas entre las que eliges al comprar la próxima licencia: números
   * libres con letras distintas (se sortean con el azar de la partida y se
   * guardan hasta que compras).
   */
  function placasEnVenta(estado) {
    const n = cfg().licencias.placasAElegir;
    if (estado.placasEnVenta && estado.placasEnVenta.length === n) return estado.placasEnVenta;
    const rnd = function () { return azar(estado); };
    const lista = [];
    for (let intento = 0; lista.length < n && intento < 200; intento++) {
      const numero = sortearNumeroLicencia({ licencias: estado.licencias.concat(lista.map(function (x) { return { numero: x }; })) }, rnd);
      const repetida = lista.some(function (x) { return letraLicencia(x) === letraLicencia(numero); });
      if (!repetida || intento > 100) lista.push(numero);
    }
    estado.placasEnVenta = lista;
    return lista;
  }

  /* Texto de la licencia: número de 5 cifras y letra de libranza, p. ej. "15288-L" o "00607-L". */
  function textoLicencia(licencia) {
    const letra = cfg().licencias.letraPorCifra[licencia.numero % 10];
    // Siempre con las mismas cifras, rellenando con ceros: 607 → «00607-L».
    return String(licencia.numero).padStart(cfg().licencias.digitosPlaca, '0') + '-' + letra;
  }

  // ------------------------------------------------------------------- Reloj

  function infoReloj(minutos) {
    const c = cfg();
    const dia = Math.floor(minutos / MIN_DIA);
    const minutoDelDia = minutos - dia * MIN_DIA;
    const hora = Math.floor(minutoDelDia / 60);
    const diaSemana = dia % 7;
    const finDeSemana = c.reloj.diasFinDeSemana.indexOf(diaSemana) !== -1;
    const esTarifa1 = !finDeSemana &&
      hora >= c.tarifas.horaInicioTarifa1 && hora < c.tarifas.horaFinTarifa1;
    return {
      dia,
      minutoDelDia,
      hora,
      minuto: Math.floor(minutoDelDia % 60),
      diaSemana,
      nombreDia: c.reloj.diasSemana[diaSemana],
      finDeSemana,
      tarifa: esTarifa1 ? 't1' : 't2'
    };
  }

  /* Jornada (de 7:00 a 7:00) de un minuto del reloj: 0 es la primera. */
  function jornadaDe(minutos) {
    return Math.floor((minutos - cfg().reloj.minutoCierreCaja) / MIN_DIA);
  }

  /* Minuto en que termina el turno que está en curso en `minutos`. */
  function finDeTurno(minutos, turno) {
    const t = cfg().turnos[turno];
    const dia = Math.floor(minutos / MIN_DIA);
    let fin = dia * MIN_DIA + t.horaFin * 60;
    if (fin <= minutos) fin += MIN_DIA;
    return fin;
  }

  /* Turno que está trabajando a una hora dada: 'dia' o 'noche'. */
  function turnoDeHora(hora) {
    const d = cfg().turnos.dia;
    return hora >= d.horaInicio && hora < d.horaFin ? 'dia' : 'noche';
  }

  function segundosPorDia(estado) {
    return cfg().reloj.segundosPorDia + modificadores(estado).segundosDia;
  }

  /*
   * Al alargar el día con mejoras, el reloj va más lento pero los coches
   * siguen trabajando al mismo ritmo en tiempo real: caben más carreras en el
   * mismo día y los costes fijos diarios se reparten entre más facturación.
   */
  function factorJornada(estado) {
    return segundosPorDia(estado) / cfg().reloj.segundosPorDia;
  }

  // ----------------------------------------------------------------- Mejoras

  /*
   * Suma los efectos de las mejoras compradas. Con zonaId incluye también
   * las mejoras que solo valen en esa zona.
   */
  function modificadores(estado, zonaId) {
    const m = {
      segundosDia: 0, consumo: 1, consumoCombustion: 1, busqueda: 1, cola: 1, demanda: 1, seguro: 1,
      cuotaEmisora: false, dejarVolante: false, gestionZonas: false, incognito: false,
      propinaProb: 0, propinaImporte: 1, averiaDias: 1, averiaCoste: 1,
      monedasMin: 0, monedasMax: 0, almacen: 0, baja: 1, pinchazo: 1, porcentajeConductor: 1,
      pesosCandidatos: null, publicidad: 0, pinchazoHoras: 0, pinchazoCoste: 1, precioCoche: 1, tasaSociedad: 1, rebuscar: false, cansancio: 1, descanso: 1, rachaMaximo: 0, rachaReaccion: 0
    };
    cfg().mejoras.forEach(function (mejora) {
      const nivel = nivelMejora(estado, mejora.id);
      if (!nivel) return;
      const e = mejora.niveles ? mejora.niveles[nivel - 1].efecto : mejora.efecto;
      if (e.soloZona && e.soloZona !== zonaId) return;
      if (e.segundosDia) m.segundosDia += e.segundosDia;
      if (e.consumo) m.consumo *= e.consumo;
      if (e.consumoCombustion) m.consumoCombustion *= e.consumoCombustion;
      if (e.busqueda) m.busqueda *= e.busqueda;
      if (e.cola) m.cola *= e.cola;
      if (e.demanda) m.demanda *= e.demanda;
      if (e.seguro) m.seguro *= e.seguro;
      if (e.cuotaEmisora) m.cuotaEmisora = true;
      if (e.dejarVolante) m.dejarVolante = true;
      if (e.incognito) m.incognito = true;
      if (e.propinaProb) m.propinaProb += e.propinaProb;
      if (e.propinaImporte) m.propinaImporte *= e.propinaImporte;
      if (e.averiaDias) m.averiaDias *= e.averiaDias;
      if (e.averiaCoste) m.averiaCoste *= e.averiaCoste;
      if (e.monedasMax) { m.monedasMin = e.monedasMin; m.monedasMax = e.monedasMax; }
      if (e.gestionZonas) m.gestionZonas = true;
      if (e.almacen) m.almacen += e.almacen;
      if (e.baja) m.baja *= e.baja;
      if (e.pinchazo) m.pinchazo *= e.pinchazo;
      if (e.porcentajeConductor) m.porcentajeConductor *= e.porcentajeConductor;
      if (e.pesosCandidatos) m.pesosCandidatos = e.pesosCandidatos;
      if (e.publicidad) m.publicidad += e.publicidad;
      if (e.pinchazoHoras) m.pinchazoHoras = e.pinchazoHoras;
      if (e.pinchazoCoste) m.pinchazoCoste *= e.pinchazoCoste;
      if (e.precioCoche) m.precioCoche *= e.precioCoche;
      if (e.tasaSociedad) m.tasaSociedad *= e.tasaSociedad;
      if (e.rebuscar) m.rebuscar = true;
      if (e.cansancio) m.cansancio *= e.cansancio;
      if (e.descanso) m.descanso *= e.descanso;
      if (e.rachaMaximo) m.rachaMaximo += e.rachaMaximo;
      if (e.rachaReaccion) m.rachaReaccion += e.rachaReaccion;
    });
    return m;
  }

  /* Parte de cada carrera que se queda el conductor (la Oficina la rebaja). */
  function porcentajeConductor(estado) {
    return cfg().conductores.porcentaje * modificadores(estado).porcentajeConductor;
  }

  /* Nivel comprado de una mejora: 0 si no la tienes (las de un nivel valen 1). */
  /*
   * Lo que te ha hecho ganar cada mejora (idea 16, Iván 22-11-2026), solo
   * en las que se puede contar directamente: lo que cobran (Publicidad,
   * Sacudir las esterillas) o lo que ahorran de forma visible (combustible,
   * seguro, averías, pinchazos y precio de los coches). Las que cambian
   * cuántas carreras se hacen no se cuentan.
   * Ahorro de una mejora con factor f sobre lo pagado: pagado × (1/f − 1),
   * lo que habrías pagado de más sin ella (con las demás que tengas).
   */
  const CUENTA_MEJORAS = {
    publicidad: 'ganado', monedasMax: 'ganado', consumo: 'ahorrado', consumoCombustion: 'ahorrado', seguro: 'ahorrado',
    averiaCoste: 'ahorrado', pinchazoCoste: 'ahorrado', precioCoche: 'ahorrado',
    tasaSociedad: 'ahorrado'
  };
  function efectoMejora(mejora, nivel) {
    return mejora.niveles ? mejora.niveles[Math.max(1, nivel) - 1].efecto : mejora.efecto;
  }
  /* 'ganado', 'ahorrado' o null si de esa mejora no se lleva la cuenta. */
  function cuentaDeMejora(id) {
    const mejora = buscarMejora(id);
    if (!mejora) return null;
    const e = efectoMejora(mejora, 1);
    const clave = Object.keys(CUENTA_MEJORAS).find(function (k) { return e[k] !== undefined; });
    return clave ? CUENTA_MEJORAS[clave] : null;
  }
  function apuntarGanado(estado, id, euros) {
    if (!(euros > 0)) return;
    if (!estado.ganadoMejoras) estado.ganadoMejoras = {};
    estado.ganadoMejoras[id] = (estado.ganadoMejoras[id] || 0) + euros;
  }
  /* Reparte el ahorro de lo pagado (ya rebajado) entre las mejoras con ese factor. */
  function apuntarAhorro(estado, clave, pagado) {
    if (!(pagado > 0)) return;
    cfg().mejoras.forEach(function (mejora) {
      const nivel = nivelMejora(estado, mejora.id);
      if (!nivel) return;
      const f = efectoMejora(mejora, nivel)[clave];
      if (typeof f === 'number' && f > 0 && f < 1) apuntarGanado(estado, mejora.id, pagado * (1 / f - 1));
    });
  }
  /* Lo que lleva una mejora (0 si no se cuenta o aún nada). */
  function ganadoMejora(estado, id) {
    return (estado.ganadoMejoras && estado.ganadoMejoras[id]) || 0;
  }

  /*
   * Lo que falta para poder comprar una mejora, o null: la anterior de su
   * rama ({ mejora: id }) o, con requiereSociedad, montar la SL
   * ({ sociedad: true }). La interfaz y el bot lo leen de aquí.
   */
  function faltaParaMejora(estado, mejora) {
    if (mejora.requiere && !nivelMejora(estado, mejora.requiere)) {
      return { mejora: mejora.requiere, texto: buscarMejora(mejora.requiere).nombre };
    }
    // Con una sola licencia, solo la primera de cada rama (Iván, 25-11-2026).
    const minimo = cfg().licenciasParaRestoDeRama || 0;
    if (mejora.requiere && estado.licencias.length < minimo) {
      return { licencias: minimo, texto: 'tener ' + minimo + ' licencias' };
    }
    if (mejora.requiereSociedad && !estado.empresa) return { sociedad: true, texto: 'montar una SL' };
    return null;
  }

  function nivelMejora(estado, id) {
    const v = estado.mejoras[id];
    return v === true ? 1 : Number(v) || 0;
  }

  /*
   * Lo siguiente que se puede comprar de una mejora: { nivel, precio, descripcion }
   * o null si ya está completa (o es por vehículo: se compra coche a coche).
   */
  function siguienteNivel(estado, id) {
    const mejora = buscarMejora(id);
    const nivel = nivelMejora(estado, id);
    if (mejora.niveles) {
      if (nivel >= mejora.niveles.length) return null;
      const n = mejora.niveles[nivel];
      return { nivel: nivel + 1, precio: n.precio, descripcion: n.descripcion };
    }
    return nivel ? null : { nivel: 1, precio: mejora.precio, descripcion: mejora.descripcion };
  }

  function buscarMejora(id) {
    return cfg().mejoras.find(function (m) { return m.id === id; }) || null;
  }

  function comprarMejora(estado, id) {
    const mejora = buscarMejora(id);
    if (!mejora) return fallo('Esa mejora no existe.');
    const siguiente = siguienteNivel(estado, id);
    if (!siguiente) return fallo('Ya la tienes completa.');
    const falta = faltaParaMejora(estado, mejora);
    if (falta) return fallo('Antes necesitas: ' + falta.texto + '.');
    if (estado.dinero < siguiente.precio) return fallo('No te llega el dinero.');
    estado.dinero -= siguiente.precio;
    estado.mejoras[id] = siguiente.nivel;
    // Con mejores probabilidades de candidatos, salen otros nuevos al momento.
    const e = mejora.niveles ? mejora.niveles[siguiente.nivel - 1].efecto : mejora.efecto;
    if (e.pesosCandidatos) sortearCandidatos(estado);
    return exito(mejora.nombre + (mejora.niveles ? ' nivel ' + siguiente.nivel : '') + ': hecho.');
  }

  function zonaDesbloqueada(estado, zonaId) {
    const zona = cfg().zonas[zonaId];
    return !!zona && (!zona.requiere || nivelMejora(estado, zona.requiere) > 0);
  }

  function zonasDisponibles(estado) {
    return Object.keys(cfg().zonas).filter(function (id) { return zonaDesbloqueada(estado, id); });
  }

  // ---------------------------------------------------------------- Taxímetro

  /* Fórmula real: inicio de servicio + km × precio/km + tiempo parado × precio/hora. */
  function precioTaximetro(tarifaId, km, minParado) {
    const t = cfg().tarifas[tarifaId];
    return t.inicio + km * t.porKm + (minParado / 60) * t.porHora;
  }

  /* Precio de un viaje: tarifa fija si la tiene; si no, taxímetro. */
  function importeViaje(viaje, tarifaId, km, minParado) {
    if (viaje.tarifaFija) return cfg().tarifas[viaje.tarifaFija].fija;
    if (viaje.tarifa === 't3') return precioTarifa3(tarifaId, km, minParado);
    return precioTaximetro(tarifaId, km, minParado);
  }

  /*
   * Tarifa 3 (salidas de Barajas fuera de la M-30): la bajada de bandera cubre
   * los primeros km; el resto, con la tarifa 1 o 2 que toque, y el tiempo
   * parado en la misma proporción que los km de más.
   */
  function precioTarifa3(tarifaId, km, minParado) {
    const t3 = cfg().tarifas.t3;
    const t = cfg().tarifas[tarifaId];
    const deMas = Math.max(0, km - t3.kmIncluidos);
    const parte = km > 0 ? deMas / km : 0;
    return t3.inicio + deMas * t.porKm + (minParado * parte / 60) * t.porHora;
  }

  /* Minutos medios de cola en una zona (si la cola varía, el punto medio). */
  function colaMedia(zona) {
    return zona.colaMax ? (zona.colaMin + zona.colaMax) / 2 : zona.colaMin;
  }

  /* Viaje medio de una zona con la tarifa dada: importe, km y minutos esperados. */
  function viajeMedio(zonaId, tarifaId) {
    const zona = cfg().zonas[zonaId];
    const medio = { importe: 0, km: 0, minutos: 0 };
    zona.viajes.forEach(function (v) {
      medio.importe += v.proporcion * importeViaje(v, tarifaId, v.km, v.minParado);
      medio.km += v.proporcion * v.km;
      medio.minutos += v.proporcion * v.minutos;
    });
    return medio;
  }

  /*
   * Número entre 0 y 1 que depende solo de la jornada y la zona: «azar» que
   * siempre da lo mismo para el mismo día.
   */
  function azarDeJornada(jornada, zonaId) {
    let h = 2166136261 ^ jornada;
    for (let i = 0; i < zonaId.length; i++) h = Math.imul(h ^ zonaId.charCodeAt(i), 16777619);
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  /* Cuánto se anima hoy una zona: entre 1 − v y 1 + v (v en la config). */
  function factorDeJornada(info, zonaId) {
    const jornada = info.minutoDelDia < cfg().reloj.minutoCierreCaja ? info.dia - 1 : info.dia;
    const v = cfg().economia.variacionDiariaDemanda;
    return 1 + (azarDeJornada(jornada, zonaId) * 2 - 1) * v;
  }

  function demandaZona(estado, zonaId, info) {
    const zona = cfg().zonas[zonaId];
    const tabla = info.finDeSemana ? zona.demanda.finDeSemana : zona.demanda.laborable;
    const factorDia = zona.factorPorDia ? zona.factorPorDia[info.diaSemana] : 1;
    return tabla[info.hora] * factorDia * factorDeJornada(info, zonaId) * modificadores(estado, zonaId).demanda *
      factorLluvia(estado, info.dia * MIN_DIA + info.minutoDelDia);
  }

  function lloviendo(estado, minutos) {
    const l = estado.lluvia;
    return !!l && minutos >= l.desde && minutos < l.hasta;
  }

  function factorLluvia(estado, minutos) {
    return lloviendo(estado, minutos) ? cfg().eventos.lluvia.factorDemanda : 1;
  }

  /* Minutos que tarda un coche en completar una carrera: buscar + cola + viaje. */
  function minutosPorCarrera(estado, zonaId, tarifaId) {
    const zona = cfg().zonas[zonaId];
    const m = modificadores(estado, zonaId);
    return zona.busquedaMin * m.busqueda + colaMedia(zona) * m.cola + viajeMedio(zonaId, tarifaId).minutos;
  }

  // ------------------------------------------------------------ Costes

  /* Euros de combustible (o de carga, el Tesla) por km recorrido con un modelo de coche. */
  function costePorKm(estado, modeloId) {
    const c = cfg();
    const modelo = modeloCoche(modeloId);
    const m = modificadores(estado);
    if (modelo.electrico) return modelo.kwh100Km / 100 * c.combustible.precioKwh * m.consumo;
    return modelo.consumoLitros100Km / 100 * c.combustible.precioLitro * m.consumo * m.consumoCombustion;
  }
  /* El modelo de coche (de config.vehiculos.modelos); sin id, el Corolla. */
  function modeloCoche(id) {
    const v = cfg().vehiculos;
    return v.modelos[id] || v.modelos[v.modeloInicial];
  }
  /* Lo que cambia el coche de una licencia ({} sin coche o con el Corolla). */
  function efectoCoche(lic) {
    return (lic && lic.vehiculo && modeloCoche(lic.vehiculo).efecto) || {};
  }
  /* Efecto del coche que lleva un turno (conductor o tú). */
  function efectoCocheDe(estado, quien) {
    if (!quien) return {};
    if (quien.quien === 'jugador') {
      const u = ubicacionJugador(estado);
      return efectoCoche(u && buscarLicencia(estado, u.licenciaId));
    }
    return efectoCoche(licenciaDelTurno(estado, quien));
  }
  /* Gamas que puedes comprar: el Corolla y las desbloqueadas por tu personaje. */
  function gamasDisponibles(estado) {
    const v = cfg().vehiculos;
    const gamas = modificadoresPersonaje(estado).gamas;
    return Object.keys(v.modelos).filter(function (id) { return id === v.modeloInicial || gamas.indexOf(id) !== -1; });
  }

  function vehiculosEnServicio(estado) {
    return estado.licencias.filter(function (l) { return !!l.vehiculo; }).length;
  }

  /* Costes fijos que se cobrarán en el próximo cierre de caja. */
  function costesFijosDiarios(estado) {
    const f = cfg().costesFijos;
    const m = modificadores(estado);
    const porVehiculo = f.seguroDiarioPorVehiculo * m.seguro +
      (m.cuotaEmisora ? f.emisoraDiariaPorVehiculo : 0);
    return f.autonomoDiario + vehiculosEnServicio(estado) * porVehiculo + costeSociedadDiario(estado);
  }

  // ------------------------------------------------ Sociedad limitada (idea 1)

  /* Conductores con turno (no los de la reserva): los que paga la SL cada día. */
  function conductoresConTurno(estado) {
    let n = 0;
    estado.licencias.forEach(function (l) {
      TURNOS.forEach(function (t) { if (l.turnos[t] && l.turnos[t].quien === 'conductor') n++; });
    });
    return n;
  }

  /* Lo que cuesta la SL cada jornada (0 si no la tienes). */
  function costeSociedadDiario(estado) {
    return estado.empresa ? cfg().sociedad.porConductorDiario * conductoresConTurno(estado) * modificadores(estado).tasaSociedad : 0;
  }

  /* ¿Te hace falta montar la SL para comprar la siguiente licencia? */
  function necesitaSociedad(estado) {
    return !estado.empresa && estado.licencias.length >= cfg().sociedad.licenciasSinSociedad;
  }

  /* El nombre limpio (espacios de más fuera) o un mensaje de error. */
  function nombreSociedad(nombre) {
    const s = cfg().sociedad;
    const limpio = String(nombre || '').replace(/\s+/g, ' ').trim();
    if (limpio.length < s.nombreMin) return { error: 'Ponle un nombre a tu empresa (al menos ' + s.nombreMin + ' letras).' };
    if (limpio.length > s.nombreMax) return { error: 'El nombre puede tener como mucho ' + s.nombreMax + ' letras.' };
    return { nombre: limpio };
  }

  /*
   * Montar la SL: paga `sociedad.coste` (va a la caja como incidencia
   * «Constitución de la SL») y guarda el nombre de la flota. Desbloquea
   * las licencias a partir de la 4.ª.
   */
  function montarSociedad(estado, nombre) {
    const s = cfg().sociedad;
    if (estado.empresa) return fallo('Ya tienes tu sociedad: ' + estado.empresa.nombre + '.');
    if (estado.licencias.length < s.licenciasSinSociedad) {
      return fallo('Aún no te hace falta: la SL se monta al tener ' + s.licenciasSinSociedad + ' licencias.');
    }
    const n = nombreSociedad(nombre);
    if (n.error) return fallo(n.error);
    if (estado.dinero < s.coste) return fallo('No te llega el dinero.');
    incidencia(estado, resumenVacio(), 'sociedad', 'Constitución de ' + n.nombre + '.', -s.coste, 'otros');
    estado.empresa = { nombre: n.nombre, jornada: jornadaDe(estado.reloj.minutos) };
    return exito('¡Enhorabuena! ' + n.nombre + ' ya es una sociedad limitada. Ya puedes comprar más licencias.');
  }

  /* Cambiar el nombre de tu sociedad (gratis). */
  function renombrarSociedad(estado, nombre) {
    if (!estado.empresa) return fallo('Todavía no tienes sociedad.');
    const n = nombreSociedad(nombre);
    if (n.error) return fallo(n.error);
    estado.empresa.nombre = n.nombre;
    return exito('Tu empresa se llama ahora ' + n.nombre + '.');
  }

  function gastar(estado, resumen, concepto, importe, modeloId) {
    if (concepto === 'combustible') {
      apuntarAhorro(estado, 'consumo', importe);
      if (!modeloCoche(modeloId).electrico) apuntarAhorro(estado, 'consumoCombustion', importe);
    }
    estado.dinero -= importe;
    estado.caja.hoy[concepto] += importe;
    resumen[concepto] += importe;
  }

  /* Cierra la caja del día: cobra los costes fijos y empieza un día nuevo. */
  function cerrarCaja(estado, resumen) {
    ajustesUnicos(estado, resumen);
    gastar(estado, resumen, 'fijos', costesFijosDiarios(estado));
    apuntarAhorro(estado, 'seguro', vehiculosEnServicio(estado) * cfg().costesFijos.seguroDiarioPorVehiculo * modificadores(estado).seguro);
    apuntarAhorro(estado, 'tasaSociedad', costeSociedadDiario(estado));
    // Publicidad en el taxi: un tanto por cada carrera del día.
    const porCarrera = modificadores(estado).publicidad;
    const carreras = Math.round(estado.caja.hoy.carreras);
    if (porCarrera > 0 && carreras > 0) {
      apuntarGanado(estado, 'publicidad', carreras * porCarrera);
      incidencia(estado, resumen, 'publicidad', 'Publicidad en el taxi: ' + carreras + ' carreras a ' +
        Libre.ui_euros(porCarrera) + '.', carreras * porCarrera, 'extras');
    }
    const cerrada = estado.caja.hoy;
    devolverAlquilados(estado, resumen, cerrada.dia + 1);
    registrarDia(estado, cerrada);
    estado.caja.ayer = cerrada;
    estado.caja.hoy = cajaVacia(cerrada.dia + 1);
    estado.licencias.forEach(function (l) { l.facturadoJornada = 0; });
    // Cada día se presentan otros candidatos (Iván, 17-11-2026), y las
    // búsquedas del Cazatalentos vuelven a su precio de partida.
    sortearCandidatos(estado);
    estado.rebuscasHoy = 0;
    resumen.cierres.push(cerrada);
  }

  // ------------------------------------------------------- Estadísticas

  /*
   * Al cerrar la caja se guarda un resumen de la jornada en el historial
   * (como mucho config.estadisticas.dias): lo que entró, el neto, las
   * carreras, lo tuyo (null si no tenías turno) y lo de cada conductor que
   * tenía turno ese día (0 si no facturó: baja, avería…). La reserva no
   * cuenta: no está en la flota. Si su licencia libraba esa jornada, ni él ni
   * tú contáis ese día: la media no debe bajar por la libranza (Iván,
   * 18-11-2026).
   */
  function registrarDia(estado, caja) {
    const porConductor = {};
    // Un minuto dentro de la jornada que se cierra (libra() la saca de ahí).
    const minuto = cfg().reloj.minutoCierreCaja + caja.dia * MIN_DIA + 60;
    const u = ubicacionJugador(estado);
    estado.licencias.forEach(function (l) {
      const libraba = libra(estado, l, minuto);
      TURNOS.forEach(function (tn) {
        const t = l.turnos[tn];
        // El que salió de incógnito trabajó: su día cuenta.
        if (libraba && !trabajaIncognito(estado, l, t, minuto)) return;
        if (t && t.quien === 'conductor' && t.id) porConductor[t.id] = (caja.porConductor || {})[t.id] || 0;
      });
    });
    const registro = {
      dia: caja.dia, ingresos: caja.ingresos, extras: caja.extras || 0, neto: netoCaja(caja),
      carreras: caja.carreras, conductores: porConductor,
      tu: u && (!libra(estado, buscarLicencia(estado, u.licenciaId), minuto) ||
        trabajaIncognito(estado, buscarLicencia(estado, u.licenciaId), u.datos, minuto)) ? caja.tuyo || 0 : null
    };
    estado.historial = estado.historial || [];
    estado.historial.push(registro);
    const sobran = estado.historial.length - cfg().estadisticas.dias;
    if (sobran > 0) estado.historial.splice(0, sobran);
    if (!estado.mejorDia || caja.ingresos > estado.mejorDia.ingresos) {
      estado.mejorDia = { dia: caja.dia, ingresos: caja.ingresos };
    }
  }

  /* Apunta en la caja de hoy lo que acaba de facturar un turno (tuyo o de un conductor). */
  function apuntarFacturado(estado, turno, importe) {
    if (!(importe > 0)) return;
    const caja = estado.caja.hoy;
    if (turno.quien === 'jugador') { caja.tuyo = (caja.tuyo || 0) + importe; return; }
    if (!turno.id) return;
    caja.porConductor = caja.porConductor || {};
    caja.porConductor[turno.id] = (caja.porConductor[turno.id] || 0) + importe;
  }

  /*
   * Media diaria de los últimos días del historial: la tuya y la de cada
   * conductor con turno ahora, entre las jornadas que estuvo en la flota.
   * { tu: { media, dias } | null, conductores: [{ t, licenciaId, turno, media, dias }] },
   * de mayor a menor (los que aún no tienen jornadas, al final con media null).
   */
  function mediasDiarias(estado) {
    const historial = estado.historial || [];
    const media = function (valores) {
      return valores.length ? { media: valores.reduce(function (a, b) { return a + b; }, 0) / valores.length, dias: valores.length } : null;
    };
    const tuyos = historial.filter(function (r) { return r.tu !== null && r.tu !== undefined; }).map(function (r) { return r.tu; });
    const conductores = [];
    estado.licencias.forEach(function (l) {
      TURNOS.forEach(function (tn) {
        const t = l.turnos[tn];
        if (!t || t.quien !== 'conductor') return;
        const valores = historial.filter(function (r) { return r.conductores && r.conductores[t.id] !== undefined; })
          .map(function (r) { return r.conductores[t.id]; });
        const m = media(valores);
        conductores.push({ t, licenciaId: l.id, turno: tn, media: m ? m.media : null, dias: m ? m.dias : 0 });
      });
    });
    conductores.sort(function (a, b) { return (b.media === null ? -1 : b.media) - (a.media === null ? -1 : a.media); });
    return { tu: media(tuyos), conductores };
  }

  /* Ficha resumida de un conductor para la clasificación. */
  function resumenConductor(t) {
    return {
      id: t.id || null, nombre: t.nombre, retrato: t.retrato, categoria: t.categoria, xp: t.xp || 0,
      carreras: t.carreras || 0, facturado: t.facturado || 0
    };
  }

  /*
   * Los mejores conductores de la partida por facturado total (como mucho
   * config.estadisticas.top): los de ahora (en turno o en la reserva) y los
   * despedidos que se guardaron. Cada uno con despedido, licenciaId y turno.
   */
  function clasificacionConductores(estado) {
    const lista = todosLosConductores(estado).map(function (x) {
      return Object.assign(resumenConductor(x.t), { despedido: false, licenciaId: x.licenciaId, turno: x.turno });
    }).concat((estado.exConductores || []).map(function (x) {
      return Object.assign({}, x, { despedido: true, licenciaId: null, turno: null });
    }));
    lista.sort(function (a, b) { return b.facturado - a.facturado; });
    return lista.slice(0, cfg().estadisticas.top);
  }

  /* Al despedir: se guarda en exConductores si entra entre los mejores despedidos. */
  function recordarDespedido(estado, t) {
    const lista = estado.exConductores = estado.exConductores || [];
    lista.push(resumenConductor(t));
    lista.sort(function (a, b) { return b.facturado - a.facturado; });
    lista.splice(cfg().estadisticas.top);
  }

  // --------------------------------------------------- Pausa al cierre

  const CAMPOS_CAJA = ['carreras', 'km', 'ingresos', 'extras', 'combustible', 'conductores', 'fijos', 'otros'];

  /* Suma varias cajas cerradas en un solo ticket { desdeDia, hastaDia, ... }. */
  function sumarCierres(cajas) {
    const ticket = { desdeDia: cajas[0].dia, hastaDia: cajas[cajas.length - 1].dia, incidencias: {}, licencias: [] };
    // Las licencias que trabajaron en alguno de esos días, de menor a mayor.
    cajas.forEach(function (caja) {
      (caja.licencias || []).forEach(function (n) { if (ticket.licencias.indexOf(n) === -1) ticket.licencias.push(n); });
    });
    ticket.licencias.sort(function (a, b) { return a - b; });
    CAMPOS_CAJA.forEach(function (campo) {
      ticket[campo] = cajas.reduce(function (s, caja) { return s + (caja[campo] || 0); }, 0);
    });
    cajas.forEach(function (caja) {
      Object.keys(caja.incidencias || {}).forEach(function (tipo) {
        const a = ticket.incidencias[tipo] = ticket.incidencias[tipo] || { veces: 0, importe: 0 };
        a.veces += caja.incidencias[tipo].veces;
        a.importe += caja.incidencias[tipo].importe;
      });
    });
    return ticket;
  }

  function enPausa(estado) {
    return !!estado.cierrePendiente;
  }

  /* Terminas (o saltas) la introducción de la historia: empieza el reloj. */
  function terminarIntro(estado) {
    estado.historia = Object.assign({}, estado.historia, { introVista: true });
    return exito('');
  }

  // ------------------------------------------ Eventos de clientes (fase 3)

  function cfgEventos() { return cfg().historia.eventos; }
  /* El estado de los eventos (y la agenda de ÚNICOS), creado si falta. */
  function estadoEventos(estado) {
    const h = estado.historia = estado.historia || { introVista: true };
    if (!h.eventos) h.eventos = { proximo: null, pendiente: null, resultado: null, vistos: {}, ultimo: null, forzado: null };
    if (!h.agenda) h.agenda = [];
    return h.eventos;
  }
  /* El evento pendiente de decidir ({ id, quien, … }) o null. */
  function eventoPendiente(estado) {
    const h = estado.historia;
    return (h && h.eventos && h.eventos.pendiente) || null;
  }
  function buscarEventoCliente(id) {
    return cfgEventos().lista.find(function (e) { return e.id === id; }) || null;
  }
  /* Programa el siguiente: dentro de 5–8 jornadas, a un minuto al azar de esa jornada. */
  function programarEvento(estado) {
    const c = cfgEventos();
    const ev = estadoEventos(estado);
    const jornada = jornadaDe(estado.reloj.minutos) + enteroEntre(estado, c.cadaJornadas.min, c.cadaJornadas.max);
    ev.proximo = jornada * MIN_DIA + cfg().reloj.minutoCierreCaja + entre(estado, c.minutoDesde, c.minutoHasta);
  }
  /* A quién le puede pasar ahora: tú si conduces y trabajas, y los conductores en su turno. */
  function quienesParaEvento(estado) {
    const ahora = estado.reloj.minutos;
    const turno = turnoDeHora(infoReloj(ahora).hora);
    const lista = [];
    const u = ubicacionJugador(estado);
    if (u && u.turno === turno) {
      const lic = buscarLicencia(estado, u.licenciaId);
      if (lic.vehiculo && !motivoSinCoche(estado, lic) && puedeTrabajar(estado, lic, u.datos, ahora) &&
          !(estado.jugador.paradoHasta > ahora)) lista.push({ quien: 'tu', licenciaId: lic.id, turno });
    }
    estado.licencias.forEach(function (lic) {
      const t = enTurno(lic, turno);
      if (lic.vehiculo && t && t.quien === 'conductor' && puedeTrabajar(estado, lic, t, ahora)) {
        lista.push({ quien: t.id, nombre: t.nombre, licenciaId: lic.id, turno });
      }
    });
    return lista;
  }
  /* ¿Puede salir este evento ahora? Por el momento del día y, si trae un ÚNICO, si no lo tienes ya. */
  function eventoPosible(estado, e, turno) {
    if (e.momento && e.momento !== turno) return false;
    if (e.unico) {
      const h = estado.historia;
      if (unicoEnFlota(estado, e.unico) || (h.agenda || []).indexOf(e.unico) !== -1) return false;
      if ((estado.candidatos || []).some(function (x) { return x.unico === e.unico; })) return false;
    }
    return true;
  }
  /* Saca un evento: se para el juego hasta que eliges. Sin nadie trabajando, se reintenta. */
  function dispararEvento(estado, resumen) {
    const c = cfgEventos();
    const ev = estadoEventos(estado);
    const ahora = estado.reloj.minutos;
    const turno = turnoDeHora(infoReloj(ahora).hora);
    const quienes = quienesParaEvento(estado);
    let lista;
    if (ev.forzado) lista = [buscarEventoCliente(ev.forzado)].filter(Boolean);
    else {
      const posibles = c.lista.filter(function (e) { return eventoPosible(estado, e, turno); });
      const nuevos = posibles.filter(function (e) { return !ev.vistos[e.id]; });
      lista = nuevos.length ? nuevos : posibles.filter(function (e) { return e.id !== ev.ultimo; });
      if (!lista.length) lista = posibles;
    }
    if (!quienes.length || !lista.length) { ev.proximo = ahora + c.reintentoMinutos; return; }
    const e = lista[Math.floor(azar(estado) * lista.length)];
    const q = quienes[Math.floor(azar(estado) * quienes.length)];
    ev.forzado = null;
    ev.pendiente = Object.assign({ id: e.id }, q);
    ev.resultado = null;
    ev.vistos[e.id] = (ev.vistos[e.id] || 0) + 1;
    ev.ultimo = e.id;
    programarEvento(estado);
    resumen.eventos.push({ tipo: 'eventoCliente', id: e.id, texto: e.titulo });
  }
  /* El turno (o tú) al que le pasa el evento: { t, tu }. */
  function sujetoEvento(estado, p) {
    if (p.quien === 'tu') return { t: null, tu: true };
    const x = todosLosConductores(estado).find(function (y) { return y.t.id === p.quien; });
    return { t: x ? x.t : null, tu: false };
  }
  /* Valor de un efecto: número o [min, max] al azar. */
  function valorEfecto(estado, v) {
    return Array.isArray(v) ? entre(estado, v[0], v[1]) : (v || 0);
  }
  /* Eliges una opción del evento: se sortea el resultado y se aplica. */
  function elegirOpcionEvento(estado, indice) {
    const ev = estadoEventos(estado);
    const p = ev.pendiente;
    if (!p) return fallo('No hay ningún evento.');
    if (ev.resultado) return fallo('Ya has decidido.');
    const e = buscarEventoCliente(p.id);
    const o = e && e.opciones[Number(indice)];
    if (!o) return fallo('Esa opción no existe.');
    let tirada = azar(estado), r = o.resultados[o.resultados.length - 1];
    for (const x of o.resultados) {
      tirada -= x.prob === undefined ? 1 : x.prob;
      if (tirada < 0) { r = x; break; }
    }
    const resumen = resumenVacio();
    const s = sujetoEvento(estado, p);
    const neto = valorEfecto(estado, r.dinero) - valorEfecto(estado, r.coste);
    if (Math.abs(neto) > 1e-9) {
      incidencia(estado, resumen, 'cliente', e.titulo + ': ' + r.texto, neto, neto > 0 ? 'extras' : 'otros', s.t);
    }
    if (r.parado) {
      const hasta = estado.reloj.minutos + r.parado;
      const quien = s.tu ? estado.jugador : s.t;
      if (quien && !((quien.paradoHasta || 0) > hasta)) { quien.paradoHasta = hasta; quien.motivoParada = 'evento'; }
    }
    if (r.xp) {
      if (s.tu) ganarExperienciaPersonaje(estado, resumen, r.xp);
      else if (s.t) ganarExperiencia(estado, resumen, s.t, Math.max(1, Math.round(r.xp * cfgEventos().xpConductor)));
    }
    let objeto = null;
    if (r.objeto) {
      const posibles = typeof r.objeto === 'string' ? [buscarObjeto(r.objeto)]
        : cfg().objetos.lista.filter(function (x) { return x.categoria === r.objeto.categoria; });
      objeto = posibles[Math.floor(azar(estado) * posibles.length)] || null;
      if (objeto) guardarObjeto(estado, objeto, s.t ? s.t.nombre : nombrePersonaje(estado));
    }
    if (r.unico && e.unico) {
      const h = estado.historia;
      if (h.agenda.indexOf(e.unico) === -1) h.agenda.push(e.unico);
      ofrecerUnico(estado, e.unico);
      if (r.unico === 'oferta') {
        const cand = candidatos(estado).find(function (x) { return x.unico === e.unico; });
        if (cand) cand.descuento = cfgEventos().descuentoOferta;
      }
    }
    ev.resultado = { opcion: Number(indice), texto: r.texto, neto, parado: r.parado || 0,
      xp: r.xp ? (s.tu ? r.xp : Math.max(1, Math.round(r.xp * cfgEventos().xpConductor))) : 0,
      objeto: objeto ? objeto.id : null, unico: r.unico && e.unico ? r.unico : null };
    const r2 = exito('');
    r2.eventos = resumen.eventos;
    return r2;
  }
  /* Tras leer el resultado: sigue el juego. */
  function cerrarEventoCliente(estado) {
    const ev = estadoEventos(estado);
    if (!ev.pendiente) return fallo('No hay ningún evento.');
    if (!ev.resultado) return fallo('Elige antes una opción.');
    ev.pendiente = null;
    ev.resultado = null;
    return exito('');
  }
  /* Para probar (consola): que salga ya ese evento (o uno al azar). */
  function forzarEventoCliente(estado, id) {
    if (id && !buscarEventoCliente(id)) return fallo('Ese evento no existe.');
    const ev = estadoEventos(estado);
    ev.forzado = id || null;
    ev.proximo = estado.reloj.minutos;
    return exito('El evento sale en cuanto corra el reloj (si hay alguien trabajando).');
  }

  /* El jugador arranca el día siguiente desde el ticket. */
  function arrancarDia(estado) {
    if (!estado.cierrePendiente) return fallo('El día ya está en marcha.');
    estado.cierrePendiente = null;
    return exito();
  }

  /* Ajustes de la partida. Por ahora solo pararAlCierre (sí/no). */
  function cambiarAjuste(estado, nombre, valor) {
    if (nombre !== 'pararAlCierre') return fallo('Ese ajuste no existe.');
    estado.ajustes[nombre] = valor === true || valor === 'true';
    return exito();
  }

  // ------------------------------------------------------------ Turnos

  const TURNOS = ['dia', 'noche'];

  function buscarLicencia(estado, licenciaId) {
    const id = Number(licenciaId);
    return estado.licencias.find(function (l) { return l.id === id; }) || null;
  }

  /* Dónde está el jugador: { licenciaId, turno: 'dia'|'noche', datos }. */
  function ubicacionJugador(estado) {
    for (const lic of estado.licencias) {
      for (const turno of TURNOS) {
        const t = lic.turnos[turno];
        if (t && t.quien === 'jugador') return { licenciaId: lic.id, turno, datos: t };
      }
    }
    return null;
  }

  function turnoDelJugador(estado) {
    const u = ubicacionJugador(estado);
    return u ? u.datos : null;
  }

  /* ¿Conduce el jugador? Si no tiene turno, solo trabajan sus conductores. */
  function conduce(estado) {
    return !!ubicacionJugador(estado);
  }

  function hayConductores(estado) {
    return estado.licencias.some(function (lic) {
      return TURNOS.some(function (t) { return lic.turnos[t] && lic.turnos[t].quien === 'conductor'; });
    });
  }

  /* ¿Es ahora la franja horaria del turno del jugador? Solo se trabaja en ella. */
  function jugadorEnTurno(estado) {
    const u = ubicacionJugador(estado);
    return !!u && turnoDeHora(infoReloj(estado.reloj.minutos).hora) === u.turno;
  }

  // ------------------------------------------------- Licencias y coches

  /* El precio de la licencia sube con cada compra. */
  function precioLicencia(estado) {
    const l = cfg().licencias;
    return l.precioBase * Math.pow(l.factorSubida, estado.licencias.length - 1);
  }

  // ------------------------------------------------- Siguiente compra

  /*
   * Todo lo que se puede comprar ahora, sin decidir nada:
   *   { id, tipo: 'coche' | 'conductor' | 'mejora' | 'licencia', precio,
   *     licenciaId, turno, mejora, nivel }
   * La interfaz le pone nombre y a dónde lleva.
   */
  function comprasPosibles(estado) {
    const c = cfg();
    const lista = [];
    const conductor = Math.min.apply(null, candidatos(estado).map(precioCandidato));
    estado.licencias.forEach(function (lic) {
      if (!lic.vehiculo) {
        lista.push({ id: 'coche-' + lic.id, tipo: 'coche', licenciaId: lic.id,
          precio: precioCoche(estado) });
        return;
      }
      ['dia', 'noche'].forEach(function (turno) {
        if (lic.turnos[turno]) return;
        lista.push({ id: 'conductor-' + lic.id + '-' + turno, tipo: 'conductor', licenciaId: lic.id, turno, precio: conductor });
      });
    });
    c.mejoras.forEach(function (m) {
      const siguiente = siguienteNivel(estado, m.id);
      if (!siguiente || faltaParaMejora(estado, m)) return;
      lista.push({ id: 'mejora-' + m.id + '-' + siguiente.nivel, tipo: 'mejora', mejora: m.id,
        nivel: siguiente.nivel, precio: siguiente.precio });
    });
    if (necesitaSociedad(estado)) {
      lista.push({ id: 'sociedad', tipo: 'sociedad', precio: c.sociedad.coste });
    } else if (estado.licencias.length < c.licencias.maximo) {
      lista.push({ id: 'licencia-' + (estado.licencias.length + 1), tipo: 'licencia', precio: precioLicencia(estado) });
    }
    return lista;
  }

  /*
   * Compras que la tarjeta «Siguiente» puede proponer (Iván, 18-11-2026: lo
   * que hace crecer). Si falta un coche o hay un turno libre, solo eso. Si
   * no, la licencia y las mejoras que cuestan como mucho
   * `config.objetivo.mejorasHasta` de crecer (licencia y coche) y, con
   * `licenciasParaPersonal` licencias, las de `mejorasPersonal` (RRHH).
   */
  function comprasParaObjetivo(estado) {
    const lista = comprasPosibles(estado);
    const flota = lista.filter(function (x) { return x.tipo === 'coche' || x.tipo === 'conductor'; });
    if (flota.length) return flota;
    const c = cfg();
    const crecer = precioLicencia(estado) + precioCoche(estado);
    // Las de personal y todo lo que piden antes en su rama, solo su nivel 1:
    // lo justo para abrirlas (los demás niveles, si son baratos).
    const personal = [];
    if (estado.licencias.length >= c.objetivo.licenciasParaPersonal) {
      c.objetivo.mejorasPersonal.forEach(function (id) {
        for (let m = buscarMejora(id); m; m = m.requiere ? buscarMejora(m.requiere) : null) personal.push(m.id);
      });
    }
    return lista.filter(function (x) {
      return x.tipo === 'licencia' || x.tipo === 'sociedad' ||
        (x.tipo === 'mejora' && (x.precio <= c.objetivo.mejorasHasta * crecer || (x.nivel === 1 && personal.indexOf(x.mejora) !== -1)));
    });
  }

  /*
   * La compra que propone «Siguiente»: de las de comprasParaObjetivo(), la
   * más barata que aún no puedes pagar (o la más barata, si llegas a todas).
   * `fija`: id de la que ya se estaba enseñando; se mantiene mientras siga
   * en la lista, para que la barra se ponga verde en vez de saltar a otra.
   */
  function objetivoCompra(estado, fija) {
    const lista = comprasParaObjetivo(estado);
    if (lista.length === 0) return null;
    const sigue = fija && lista.find(function (x) { return x.id === fija; });
    if (sigue) return sigue;
    // sort es estable: a igual precio gana el primero de la lista.
    const porPrecio = lista.slice().sort(function (a, b) { return a.precio - b.precio; });
    return porPrecio.find(function (x) { return x.precio > estado.dinero; }) || porPrecio[0];
  }

  /*
   * Compra una licencia con la placa `indice` de placasEnVenta() (la primera
   * si no se dice). `rng` ya no se usa: las placas salen del azar de la partida.
   */
  function comprarLicencia(estado, rng, indice) {
    const c = cfg();
    if (estado.licencias.length >= c.licencias.maximo) return fallo('No quedan licencias en Madrid.');
    if (necesitaSociedad(estado)) {
      return fallo('Para tener más de ' + c.sociedad.licenciasSinSociedad + ' licencias tienes que montar una sociedad limitada.');
    }
    const precio = precioLicencia(estado);
    if (estado.dinero < precio) return fallo('No te llega el dinero.');
    const numero = placasEnVenta(estado)[Number(indice) || 0];
    if (!numero) return fallo('Esa placa no existe.');
    estado.dinero -= precio;
    const id = estado.licencias.reduce(function (m, l) { return Math.max(m, l.id); }, 0) + 1;
    const licencia = { id, numero, vehiculo: null, turnos: { dia: null, noche: null } };
    estado.licencias.push(licencia);
    estado.placasEnVenta = null;
    return exito('Licencia ' + textoLicencia(licencia) + ' comprada. Ahora necesita un coche.');
  }

  /* Lo que cuesta un coche (el Leasing lo abarata). */
  /*
   * Precio de un coche (Iván, 21-11-2026): sube un vehiculos.factorSubida por
   * cada coche propio que ya tienes, sin contar el primero (los de alquiler
   * no cuentan). Con `sustituye` es el precio de un coche que reemplaza a
   * uno tuyo (renovar, o reponer tras una avería definitiva): el de tu
   * último coche, no el del siguiente.
   */
  function cochesPropios(estado) {
    return estado.licencias.filter(function (l) { return l.vehiculo && !l.alquiler; }).length;
  }
  function escalaCoches(estado, sustituye) {
    const n = cochesPropios(estado) - (sustituye ? 1 : 0);
    return Math.pow(cfg().vehiculos.factorSubida || 1, Math.max(0, n - 1));
  }
  function precioCoche(estado, sustituye, modeloId) {
    return Math.round(modeloCoche(modeloId).precio * escalaCoches(estado, sustituye) * modificadores(estado).precioCoche);
  }
  /* Alquiler: sube igual que el coche (sin el descuento del Leasing). */
  function precioAlquiler(estado) {
    return Math.round(cfg().vehiculos.alquiler.precio * escalaCoches(estado));
  }

  function comprarVehiculo(estado, licenciaId, modeloId) {
    const c = cfg();
    const lic = buscarLicencia(estado, licenciaId);
    if (!lic) return fallo('Esa licencia no existe.');
    if (lic.vehiculo && !lic.alquiler) return fallo('Esa licencia ya tiene coche.');
    const id = modeloId || c.vehiculos.modeloInicial;
    if (!c.vehiculos.modelos[id]) return fallo('Ese coche no existe.');
    if (gamasDisponibles(estado).indexOf(id) === -1) return fallo('Aún no has desbloqueado el ' + c.vehiculos.modelos[id].nombre + ': es una mejora de tu personaje.');
    const modelo = c.vehiculos.modelos[id];
    const precio = precioCoche(estado, false, id);
    if (estado.dinero < precio) return fallo('No te llega el dinero.');
    estado.dinero -= precio;
    apuntarAhorro(estado, 'precioCoche', precio);
    // Con uno de alquiler, lo devuelves: lo que quedaba de alquiler se pierde.
    const devuelto = !!lic.alquiler;
    lic.alquiler = null;
    lic.averia = null;
    lic.vehiculo = id;
    lic.km = 0;   // los coches que compras salen nuevos
    return exito(modelo.nombre + ' listo en la licencia ' + textoLicencia(lic) + '. ' +
      (devuelto ? 'Devuelves el de alquiler.' : 'Contrata conductores para sus turnos.'));
  }

  /*
   * Alquilar coche (idea 5, Iván, 20-11-2026): para una licencia sin coche,
   * config.vehiculos.alquiler.jornadas jornadas (la de hoy cuenta) por su
   * precio, pagado ya. Con uno alquilado, alarga el alquiler otras tantas.
   * Al cerrar la caja de la última, se devuelve (cerrarCaja). No se gasta:
   * sin avería definitiva ni más averías por km.
   */
  function alquilarCoche(estado, licenciaId) {
    const c = cfg();
    const lic = buscarLicencia(estado, licenciaId);
    if (!lic) return fallo('Esa licencia no existe.');
    if (lic.vehiculo && !lic.alquiler) return fallo('Esa licencia ya tiene coche propio.');
    const a = c.vehiculos.alquiler;
    const precio = precioAlquiler(estado);
    if (estado.dinero < precio) return fallo('No te llega el dinero.');
    estado.dinero -= precio;
    const hoy = jornadaDe(estado.reloj.minutos);
    if (lic.alquiler) {
      lic.alquiler.hasta = Math.max(lic.alquiler.hasta, hoy) + a.jornadas;
      return exito('Alargas el alquiler del taxi ' + textoLicencia(lic) + ': ' + jornadasAlquiler(estado, lic) + ' jornadas más.');
    }
    lic.vehiculo = c.vehiculos.modeloInicial;
    lic.km = 0;
    lic.averia = null;
    lic.alquiler = { hasta: hoy + a.jornadas };
    return exito('Coche alquilado para la licencia ' + textoLicencia(lic) + ' durante ' + a.jornadas + ' jornadas.');
  }

  /* Jornadas de alquiler que le quedan (contando la de hoy); 0 si es suyo. */
  function jornadasAlquiler(estado, lic) {
    return lic && lic.alquiler ? Math.max(0, lic.alquiler.hasta - jornadaDe(estado.reloj.minutos)) : 0;
  }

  /* Al cerrar la caja: los coches cuyo alquiler termina con la jornada nueva se devuelven. */
  function devolverAlquilados(estado, resumen, jornadaNueva) {
    estado.licencias.forEach(function (lic) {
      if (!lic.alquiler || lic.alquiler.hasta > jornadaNueva) return;
      lic.vehiculo = null;
      lic.alquiler = null;
      lic.averia = null;
      TURNOS.forEach(function (t) {
        const x = lic.turnos[t];
        if (!x) return;
        if (x.quien === 'jugador') estado.jugador.carrera = null;
        else { x.carrera = null; x.pendiente = null; }
      });
      incidencia(estado, resumen, 'alquiler', 'Se acaba el alquiler del taxi ' + textoLicencia(lic) +
        ': lo devuelves. Alquila otro o compra uno para que vuelva a trabajar.', 0, null);
    });
  }

  /* Pasa al jugador al otro turno de su licencia, si está libre. */
  function cambiarTurnoJugador(estado) {
    const u = ubicacionJugador(estado);
    if (!u) return fallo('Ahora no conduces.');
    if (estado.jugador.carrera) return fallo('Termina antes la carrera en curso.');
    const lic = buscarLicencia(estado, u.licenciaId);
    const otro = u.turno === 'dia' ? 'noche' : 'dia';
    if (lic.turnos[otro]) return fallo('El otro turno ya está ocupado.');
    lic.turnos[otro] = u.datos;
    lic.turnos[u.turno] = null;
    return exito('Ahora conduces en el turno de ' + cfg().turnos[otro].nombre.toLowerCase() + '.');
  }

  /* Contrata un conductor para un turno libre de una licencia con coche. */
  /*
   * Contratas a uno de los candidatos (`indice` en estado.candidatos; el
   * primero si no se dice). Todos cuestan lo mismo. Después se sortean otros.
   */
  function contratarConductor(estado, licenciaId, turno, indice) {
    const c = cfg();
    const lic = buscarLicencia(estado, licenciaId);
    if (!lic || TURNOS.indexOf(turno) === -1) return fallo('Ese turno no existe.');
    if (!lic.vehiculo) return fallo('Esa licencia aún no tiene coche.');
    if (lic.turnos[turno]) return fallo('Ese turno ya está cubierto.');
    const candidato = candidatos(estado)[Number(indice) || 0];
    if (!candidato) return fallo('Ese candidato no existe.');
    const noPuede = faltaParaTurnoUnico(lic, turno, candidato);
    if (noPuede) return fallo(noPuede);
    const precio = precioCandidato(candidato);
    if (estado.dinero < precio) return fallo('No te llega el dinero: ' + candidato.nombre + ' cuesta ' + Libre.ui_euros(precio) + '.');

    const otro = lic.turnos[turno === 'dia' ? 'noche' : 'dia'];
    const nombre = candidato.nombre;
    const primero = !hayConductores(estado);
    estado.dinero -= precio;
    estado.conductoresContratados++;
    lic.turnos[turno] = nuevoConductor(estado, candidato, otro ? otro.zona : c.zonaInicial);
    sortearCandidatos(estado);

    if (primero) {
      return exito(nombre + ' se encarga del turno de ' + c.turnos[turno].nombre.toLowerCase() +
        ': ahora tu taxi también trabaja cuando tú no conduces.');
    }
    // Un ÚNICO con doble turno, solo en su coche, hace también el otro.
    const doble = !otro && unicoDe(lic.turnos[turno]) && unicoDe(lic.turnos[turno]).dobleTurno;
    return exito(nombre + ' empieza en el turno de ' + c.turnos[turno].nombre.toLowerCase() +
      (doble ? ' y, mientras vaya solo en su coche, también hace el de ' + c.turnos[turno === 'dia' ? 'noche' : 'dia'].nombre.toLowerCase() : '') + '.');
  }

  /* Un conductor recién contratado a partir de su candidato. */
  function nuevoConductor(estado, candidato, zona) {
    estado.ultimoIdConductor = (estado.ultimoIdConductor || 0) + 1;
    // Un ÚNICO contratado sale de tu agenda (si lo despides, no vuelve solo).
    if (candidato.unico && estado.historia && estado.historia.agenda) {
      estado.historia.agenda = estado.historia.agenda.filter(function (id) { return id !== candidato.unico; });
    }
    return {
      id: estado.ultimoIdConductor,
      quien: 'conductor', nombre: candidato.nombre, retrato: candidato.retrato, zona,
      categoria: candidato.categoria, cualidad: candidato.cualidad, cualidad2: candidato.cualidad2 || null,
      cualidad3: null, defecto: candidato.defecto, defecto2: candidato.defecto2 || null,
      // Experiencia (da el nivel) y lo que lleva hecho desde que lo contrataste.
      xp: 0, carreras: 0, facturado: 0,
      objetos: [],   // ids de los objetos que lleva equipados
      // Si es un ÚNICO, su id (config.conductores.unicos); si no, null.
      unico: candidato.unico || null
    };
  }

  /*
   * Contratas a un candidato para la reserva: no trabaja hasta que le des un
   * turno (entre jornadas). Mismo precio que para un turno.
   */
  function contratarAReserva(estado, indice) {
    const c = cfg();
    estado.reserva = estado.reserva || [];
    if (estado.reserva.length >= c.conductores.reserva) return fallo('La reserva está llena (' + c.conductores.reserva + ').');
    const candidato = candidatos(estado)[Number(indice) || 0];
    if (!candidato) return fallo('Ese candidato no existe.');
    const precio = precioCandidato(candidato);
    if (estado.dinero < precio) return fallo('No te llega el dinero: ' + candidato.nombre + ' cuesta ' + Libre.ui_euros(precio) + '.');
    estado.dinero -= precio;
    estado.conductoresContratados++;
    estado.reserva.push(nuevoConductor(estado, candidato, c.zonaInicial));
    sortearCandidatos(estado);
    return exito(candidato.nombre + ' entra en la reserva. Dale un turno al cerrar el día.');
  }

  /*
   * Todos tus conductores, trabajando o en la reserva:
   * [{ t, licenciaId, turno }] (en la reserva, licenciaId 'reserva' y turno
   * su posición).
   */
  function todosLosConductores(estado) {
    const lista = [];
    estado.licencias.forEach(function (l) {
      TURNOS.forEach(function (tn) {
        const x = l.turnos[tn];
        if (x && x.quien === 'conductor') lista.push({ t: x, licenciaId: l.id, turno: tn });
      });
    });
    (estado.reserva || []).forEach(function (x, i) { lista.push({ t: x, licenciaId: 'reserva', turno: i }); });
    return lista;
  }

  /*
   * Un sitio para un conductor a partir de su clave: 'licencia|turno',
   * 'reserva|posición' o 'reserva' (al final de la reserva).
   * { lic, turno } o { reserva: true, i }, con el que ocupa ese sitio en t.
   */
  function sitioConductor(estado, clave) {
    const partes = String(clave || '').split('|');
    if (partes[0] === 'reserva') {
      const reserva = estado.reserva || [];
      const i = partes.length > 1 ? Number(partes[1]) : reserva.length;
      if (!(i >= 0 && i <= reserva.length)) return null;
      return { reserva: true, i, t: reserva[i] || null };
    }
    const lic = buscarLicencia(estado, Number(partes[0]));
    if (!lic || TURNOS.indexOf(partes[1]) === -1) return null;
    return { lic, turno: partes[1], t: lic.turnos[partes[1]] };
  }

  function ponerEnSitio(estado, sitio, t) {
    if (sitio.reserva) estado.reserva[sitio.i] = t;   // null se limpia después
    else sitio.lic.turnos[sitio.turno] = t;
  }

  /* «a la reserva» o «al turno de noche de la licencia 1234-X». */
  function haciaSitio(sitio) {
    return sitio.reserva ? 'a la reserva' : 'al turno de ' + cfg().turnos[sitio.turno].nombre.toLowerCase() +
      ' de la licencia ' + textoLicencia(sitio.lic);
  }

  /*
   * Reorganizar conductores: solo entre jornadas, con el día cerrado. Mueve
   * al conductor de (origenLicencia, origenTurno) a `destino` (una clave de
   * sitio). Si allí hay otro conductor, se intercambian. No sobre tu turno
   * ni a una licencia sin coche. Lo que estuvieran esperando se pierde
   * (empiezan de cero en su sitio nuevo); baja, objetos y nivel van con
   * ellos y la avería se queda en el coche.
   */
  function moverConductor(estado, origenLicencia, origenTurno, destino) {
    if (!enPausa(estado)) return fallo('Solo puedes reorganizar a tus conductores con el día cerrado.');
    estado.reserva = estado.reserva || [];
    const a = sitioConductor(estado, origenLicencia + '|' + origenTurno);
    const b = sitioConductor(estado, destino);
    if (!a || !a.t || a.t.quien !== 'conductor') return fallo('Ahí no hay ningún conductor.');
    if (!b) return fallo('Ese sitio no existe.');
    if (a.reserva && b.reserva) return exito('');
    if (!a.reserva && !b.reserva && a.lic === b.lic && a.turno === b.turno) return exito('');
    if (b.t && b.t.quien === 'jugador') return fallo('Ese turno es tuyo.');
    if (b.lic && !b.lic.vehiculo) return fallo('Esa licencia aún no tiene coche.');
    if (b.reserva && !b.t && estado.reserva.length >= cfg().conductores.reserva) return fallo('La reserva está llena.');
    const x = a.t, y = b.t;
    // Los ÚNICOS: su turno fijo y con quién no comparten coche.
    const noX = b.lic ? faltaParaTurnoUnico(b.lic, b.turno, x, x) : '';
    if (noX) return fallo(noX);
    const noY = y && a.lic ? faltaParaTurnoUnico(a.lic, a.turno, y, y) : '';
    if (noY) return fallo(noY);
    ponerEnSitio(estado, b, x);
    ponerEnSitio(estado, a, y);
    estado.reserva = estado.reserva.filter(Boolean);
    [x, y].forEach(function (t) {
      if (!t) return;
      t.carrera = null;
      t.pendiente = null;
      t.zonaTurno = null;   // elige zona de nuevo en su sitio
    });
    return exito(y
      ? x.nombre + ' y ' + y.nombre + ' se cambian el sitio.'
      : x.nombre + ' pasa ' + haciaSitio(b) + '.');
  }

  /*
   * Personaje (índice en config.conductores.personajes) para un conductor
   * nuevo: al azar entre los que no trabajan ya para ti; si están todos, entre
   * todos. Se guarda con el conductor, así no cambia al recargar.
   */
  function sortearPersonaje(estado, apartados) {
    const total = cfg().conductores.personajes.length;
    const usados = Object.assign({}, apartados);
    todosLosConductores(estado).forEach(function (x) { if (x.t.retrato !== undefined) usados[x.t.retrato] = true; });
    const libres = [];
    for (let i = 0; i < total; i++) if (!usados[i]) libres.push(i);
    const lista = libres.length ? libres : Array.from({ length: total }, function (_, i) { return i; });
    return lista[Math.floor(azar(estado) * lista.length)];
  }

  // ----------------------------------------------- Rasgos de los conductores

  /* Cualidad o defecto por id (null si no existe). */
  function buscarRasgo(id) {
    const c = cfg().conductores;
    return c.cualidades.concat(c.defectos).find(function (r) { return r.id === id; }) || null;
  }

  /*
   * Rasgos al azar según la categoría (B si no se dice): una cualidad (sin
   * las de `evitar`), una segunda si la categoría tiene dos, y un defecto
   * que no sea su opuesto con la probabilidad de la categoría.
   */
  function sortearRasgos(estado, evitar, categoriaId) {
    const c = cfg().conductores;
    const cat = buscarCategoria(categoriaId) || cfg().categorias[0];
    const posibles = c.cualidades.filter(function (q) { return !(evitar && evitar[q.id]); });
    const cualidad = posibles[Math.floor(azar(estado) * posibles.length)];
    let cualidad2 = null;
    if (cat.cualidades > 1) {
      const otras = c.cualidades.filter(function (q) { return q.id !== cualidad.id; });
      cualidad2 = otras[Math.floor(azar(estado) * otras.length)].id;
    }
    let defecto = null, defecto2 = null;
    if (cat.probDefecto > 0 && azar(estado) < cat.probDefecto) {
      const defectos = c.defectos.filter(function (d) { return d.id !== cualidad.opuesto; });
      defecto = defectos[Math.floor(azar(estado) * defectos.length)].id;
      if (cat.defectos > 1) {
        const otros = defectos.filter(function (d) { return d.id !== defecto; });
        defecto2 = otros[Math.floor(azar(estado) * otros.length)].id;
      }
    }
    return { cualidad: cualidad.id, cualidad2, defecto, defecto2 };
  }

  /* Lo que cuesta contratar a un candidato (según su categoría). */
  function precioCandidato(candidato) {
    // Un ÚNICO que se ofrece en un evento puede venir con descuento (hasta el cierre).
    return (buscarCategoria(candidato.categoria) || cfg().categorias[0]).contratar * (1 - (candidato.descuento || 0));
  }

  // ------------------------------------------- Conductores ÚNICOS (fase 2)

  /* La ficha de un único (config.conductores.unicos) o null. */
  function buscarUnico(id) {
    return (id && cfg().conductores.unicos && cfg().conductores.unicos[id]) || null;
  }
  /* El único que es un conductor o candidato (null si es normal). */
  function unicoDe(t) {
    return t && t.unico ? buscarUnico(t.unico) : null;
  }
  /* ¿Ya está en tu flota (con turno o en la reserva)? */
  function unicoEnFlota(estado, id) {
    return todosLosConductores(estado).some(function (x) { return x.t.unico === id; });
  }
  /*
   * Ofrece un único entre los candidatos (lo llamarán los eventos de la
   * fase 3; de momento, la consola). No sale si ya lo tienes o ya está.
   */
  function ofrecerUnico(estado, id) {
    const u = buscarUnico(id);
    if (!u) return fallo('Ese conductor no existe.');
    if (unicoEnFlota(estado, id)) return fallo(u.nombre + ' ya trabaja para ti.');
    const lista = candidatos(estado);
    if (lista.some(function (x) { return x.unico === id; })) return fallo(u.nombre + ' ya está entre los candidatos.');
    lista.unshift({ retrato: id, nombre: u.nombre, categoria: u.categoriaBase, unico: id,
      cualidad: null, cualidad2: null, defecto: null, defecto2: null });
    return exito(u.nombre + ' quiere trabajar contigo: lo tienes entre los candidatos.');
  }
  /*
   * Lo que impide poner a un conductor (o candidato) en un turno de una
   * licencia: su turno fijo o un único incompatible en el otro turno.
   * '' si puede. `apartar`: un turno que se va de ahí (al intercambiar).
   */
  function faltaParaTurnoUnico(lic, turno, t, apartar) {
    const u = unicoDe(t);
    if (u && u.soloTurno && u.soloTurno !== turno) {
      return u.nombre + ' solo trabaja en el turno de ' + cfg().turnos[u.soloTurno].nombre.toLowerCase() + '.';
    }
    const otro = lic && lic.turnos[turno === 'dia' ? 'noche' : 'dia'];
    if (!otro || otro === apartar || otro.quien !== 'conductor') return '';
    const v = unicoDe(otro);
    const ids = function (x) { return (x.incompatibles || []).map(function (i) { return i.id || i; }); };
    if (u && v && (ids(u).indexOf(otro.unico) !== -1 || ids(v).indexOf(t.unico) !== -1)) {
      return u.nombre + ' no comparte coche con ' + v.nombre + '.';
    }
    return '';
  }
  /* Una frase suya al azar (o '' si no es único). */
  function fraseUnico(estado, t) {
    const u = unicoDe(t);
    return u && u.frases && u.frases.length ? u.frases[Math.floor(azar(estado) * u.frases.length)] : '';
  }
  /* Extra de sus carreras por sus tocayos con turno (Paconi: Franciscos y Pacos), 0–maximo. */
  function bonoTocayos(estado, t) {
    const u = unicoDe(t);
    if (!u || !u.tocayos) return 0;
    let n = 0;
    estado.licencias.forEach(function (l) {
      TURNOS.forEach(function (tn) {
        const x = l.turnos[tn];
        if (x && x !== t && x.quien === 'conductor' && u.tocayos.nombres.indexOf(x.nombre) !== -1) n++;
      });
    });
    return Math.min(u.tocayos.maximo, n * u.tocayos.porCada);
  }
  /* Lo que multiplica el importe de las carreras de un ÚNICO: tocayos y sinergias con 'importe'. */
  function factorImporteUnico(estado, t) {
    const u = unicoDe(t);
    if (!u) return 1;
    let f = 1 + bonoTocayos(estado, t);
    (u.sinergias || []).forEach(function (s) {
      if (s.efecto.importe && (t.objetos || []).indexOf(s.objeto) !== -1) f *= s.efecto.importe;
    });
    return f;
  }
  /*
   * Quién conduce el coche de una licencia en un turno: el de ese turno o,
   * si está vacío, un ÚNICO con doble turno del otro (El Pelado, solo en
   * su coche, hace el día y la noche del tirón).
   */
  function enTurno(lic, turno) {
    const t = lic && lic.turnos[turno];
    if (t) return t;
    const otro = lic && lic.turnos[turno === 'dia' ? 'noche' : 'dia'];
    const u = unicoDe(otro);
    return u && u.dobleTurno ? otro : null;
  }
  /* Km que lleva un conductor en la jornada (para el plus por km). */
  function apuntarKmConductor(estado, t, km) {
    const hoy = estado.caja.hoy;
    hoy.kmPorConductor = hoy.kmPorConductor || {};
    hoy.kmPorConductor[t.id] = (hoy.kmPorConductor[t.id] || 0) + km;
  }

  /*
   * Al cerrar la caja: el «ajuste de periodos anteriores» de cada único que
   * lo tenga, un extra de lo que facturó en la jornada.
   */
  function ajustesUnicos(estado, resumen) {
    const porConductor = estado.caja.hoy.porConductor || {};
    estado.licencias.forEach(function (l) {
      TURNOS.forEach(function (tn) {
        const t = l.turnos[tn];
        const u = unicoDe(t);
        if (u && u.plusKm) plusKmUnico(estado, resumen, l, t, u);
        const facturado = t && porConductor[t.id];
        if (!u || !u.ajuste || !(facturado > 0)) return;
        const extra = facturado * entre(estado, u.ajuste.min, u.ajuste.max);
        incidencia(estado, resumen, 'ajuste', u.nombre + ' aplica un «ajuste de periodos anteriores»: ' +
          Libre.ui_euros(extra) + ' más en la caja. ' + fraseUnico(estado, t), extra, 'extras', t);
      });
    });
  }

  /*
   * El Pelado al cerrar la caja: los km de más de la jornada (vuelve en
   * vacío de los viajes largos y usa el coche para lo suyo: `kmExtra` de lo
   * que hizo, con su combustible) y el plus por cada km, también esos.
   */
  function plusKmUnico(estado, resumen, lic, t, u) {
    const km = (estado.caja.hoy.kmPorConductor || {})[t.id] || 0;
    if (!(km > 0)) return;
    const extra = km * (u.kmExtra || 0);
    if (extra > 0) {
      gastar(estado, resumen, 'combustible', extra * costePorKm(estado, lic.vehiculo) * (u.combustible || 1), lic.vehiculo);
      estado.caja.hoy.km += extra;
      sumarKm(estado, lic, extra);
    }
    const plus = (km + extra) * u.plusKm;
    incidencia(estado, resumen, 'plusKm', u.nombre + ' hace ' + Math.round(km + extra) + ' km en la jornada' +
      (extra > 0 ? ' (' + Math.round(extra) + ' de vuelta en vacío y para lo suyo)' : '') + ': ' +
      Libre.ui_euros(plus) + ' de plus. «' + fraseUnico(estado, t) + '»', plus, 'extras', t);
  }

  /* Candidatos para el próximo contrato: personajes y cualidades distintos. */
  /*
   * Cazatalentos (idea 11, Iván 22-11-2026): pagar para que salgan otros
   * candidatos al momento. Cada búsqueda del día cuesta el doble que la
   * anterior (conductores.rebuscar); cerrarCaja() pone la cuenta a cero.
   */
  function precioRebuscar(estado) {
    const r = cfg().conductores.rebuscar;
    return r.precioBase * Math.pow(r.factor, estado.rebuscasHoy || 0);
  }
  function rebuscarCandidatos(estado) {
    if (!modificadores(estado).rebuscar) return fallo('Para buscar otros candidatos necesitas el «Cazatalentos».');
    const precio = precioRebuscar(estado);
    if (estado.dinero < precio) return fallo('No te llega el dinero: buscar otros cuesta ' + Libre.ui_euros(precio) + '.');
    estado.dinero -= precio;
    estado.rebuscasHoy = (estado.rebuscasHoy || 0) + 1;
    sortearCandidatos(estado);
    return exito('El cazatalentos te trae tres candidatos nuevos. La próxima búsqueda de hoy cuesta ' +
      Libre.ui_euros(precioRebuscar(estado)) + '.');
  }

  function sortearCandidatos(estado, minimo) {
    const c = cfg().conductores;
    // Con una categoría mínima (Agenda de contactos), las de debajo no salen.
    const pesos = pesosCandidatos(estado);
    if (minimo) {
      const orden = cfg().categorias.map(function (x) { return x.id; });
      orden.slice(0, orden.indexOf(minimo)).forEach(function (id) { pesos[id] = 0; });
    }
    const apartados = {}, cualidades = {};
    estado.candidatos = [];
    for (let i = 0; i < c.candidatos; i++) {
      const retrato = sortearPersonaje(estado, apartados);
      apartados[retrato] = true;
      const categoria = sortearCategoria(estado, pesos);
      const r = sortearRasgos(estado, cualidades, categoria);
      cualidades[r.cualidad] = true;
      estado.candidatos.push({
        retrato, nombre: c.personajes[retrato].nombre, categoria,
        cualidad: r.cualidad, cualidad2: r.cualidad2, defecto: r.defecto, defecto2: r.defecto2
      });
    }
    // Los ÚNICOS de tu agenda (eventos de clientes) siguen ahí hasta que los contrates.
    ((estado.historia && estado.historia.agenda) || []).forEach(function (id) {
      if (buscarUnico(id) && !unicoEnFlota(estado, id)) ofrecerUnico(estado, id);
    });
    return estado.candidatos;
  }

  function candidatos(estado) {
    return estado.candidatos && estado.candidatos.length ? estado.candidatos : sortearCandidatos(estado);
  }

  // ------------------------------------------------ Experiencia y niveles

  /* Nivel de un conductor (1 a 10) según su experiencia. */
  function nivelConductor(t) {
    const umbrales = cfg().conductores.niveles.experiencia;
    const xp = (t && t.xp) || 0;
    let nivel = 0;
    while (nivel < umbrales.length && xp >= umbrales[nivel]) nivel++;
    return Math.max(1, nivel);
  }

  /*
   * Lo que lleva de su nivel: { nivel, xp, desde, hasta, avance 0–1 }
   * (hasta = null en el nivel máximo). Para la interfaz.
   */
  function progresoConductor(t) {
    const umbrales = cfg().conductores.niveles.experiencia;
    const nivel = nivelConductor(t);
    const xp = (t && t.xp) || 0;
    const desde = umbrales[nivel - 1];
    const hasta = nivel < umbrales.length ? umbrales[nivel] : null;
    return { nivel, xp, desde, hasta, avance: hasta === null ? 1 : (xp - desde) / (hasta - desde) };
  }

  /* Ids de las cualidades (1 a 3) y de los defectos (0 a 2) de un conductor. */
  function cualidadesDe(t) {
    return [t.cualidad, t.cualidad2, t.cualidad3].filter(Boolean);
  }
  function defectosDe(t) {
    return [t.defecto, t.defecto2].filter(Boolean);
  }

  /*
   * Al llegar al último nivel: pierde un defecto (el segundo, si tiene dos)
   * o, si no tiene ninguno, gana una cualidad nueva. Devuelve el texto.
   */
  function premioNivelMaximo(estado, t) {
    if (t.defecto2) {
      const d = buscarRasgo(t.defecto2);
      t.defecto2 = null;
      return 'pierde su defecto «' + d.nombre + '»';
    }
    if (t.defecto) {
      const d = buscarRasgo(t.defecto);
      t.defecto = null;
      return 'pierde su defecto «' + d.nombre + '»';
    }
    const tiene = cualidadesDe(t);
    const nuevas = cfg().conductores.cualidades.filter(function (q) { return tiene.indexOf(q.id) === -1; });
    if (!nuevas.length) return '';
    const q = nuevas[Math.floor(azar(estado) * nuevas.length)];
    if (!t.cualidad2) t.cualidad2 = q.id;
    else t.cualidad3 = q.id;
    return 'gana la cualidad «' + q.nombre + '»';
  }

  /* Suma experiencia y, si sube de nivel, lo avisa con su retrato. */
  function ganarExperiencia(estado, resumen, t, puntos) {
    if (!t || t.quien !== 'conductor' || !(puntos > 0)) return;
    const antes = nivelConductor(t);
    t.xp = (t.xp || 0) + puntos;
    const despues = nivelConductor(t);
    const maximo = cfg().conductores.niveles.experiencia.length;
    const premio = despues === maximo && antes < maximo ? premioNivelMaximo(estado, t) : '';
    if (despues > antes) {
      const huecos = cfg().conductores.niveles.huecos;
      const hueco = huecos[despues - 1] > huecos[antes - 1];
      resumen.eventos.push({
        tipo: 'nivel', conductor: t.nombre, retrato: t.retrato, nivel: despues,
        texto: t.nombre + ' sube a nivel ' + despues + ': espera menos entre carreras' +
          (hueco ? ' y tiene un hueco más para objetos' : '') + (premio ? '; además, ' + premio : '') + '.'
      });
    }
  }

  // ---------------------------------------------------- Tu personaje

  /* Experiencia total que pide el nivel n (n = 0 → 0). */
  function experienciaParaNivel(n) {
    const p = cfg().personaje.niveles;
    return Math.round(p.base * (Math.pow(p.factor, n) - 1) / (p.factor - 1));
  }

  /*
   * Solo lectura: { nivel, xp, desde, hasta, progreso } de tu personaje.
   * desde/hasta: experiencia total del nivel actual y del siguiente.
   */
  function nivelPersonaje(estado) {
    const xp = (estado.personaje && estado.personaje.xp) || 0;
    let nivel = 0;
    while (experienciaParaNivel(nivel + 1) <= xp) nivel++;
    const desde = experienciaParaNivel(nivel);
    const hasta = experienciaParaNivel(nivel + 1);
    return { nivel, xp, desde, hasta, progreso: (xp - desde) / (hasta - desde) };
  }

  /* Suma experiencia a tu personaje; avisa (evento 'nivelPersonaje') al subir. Devuelve el texto del aviso o ''. */
  function ganarExperienciaPersonaje(estado, resumen, puntos) {
    if (!(puntos > 0)) return '';
    if (!estado.personaje) estado.personaje = { xp: 0, puntos: 0, mejoras: {} };
    const antes = nivelPersonaje(estado).nivel;
    estado.personaje.xp += puntos * modificadoresPersonaje(estado).experiencia;
    const despues = nivelPersonaje(estado).nivel;
    if (despues <= antes) return '';
    const texto = '¡Subes a nivel ' + despues + ' de taxista!';
    if (resumen) resumen.eventos.push({ tipo: 'nivelPersonaje', nivel: despues, texto });
    return texto;
  }

  /*
   * Mejoras de tu personaje (Iván, 24-11-2026): estado.personaje.mejoras
   * = { id: nivel }. Cada nivel de la config lleva su efecto total.
   */
  function buscarMejoraPersonaje(id) {
    return cfg().personaje.mejoras.find(function (m) { return m.id === id; }) || null;
  }
  function nivelMejoraPersonaje(estado, id) {
    return (estado.personaje && estado.personaje.mejoras && estado.personaje.mejoras[id]) || 0;
  }
  /* Lo que suman tus mejoras del personaje (ver config.personaje.mejoras). */
  function modificadoresPersonaje(estado) {
    const m = {
      racha: false, incognitoTu: false, cocheNuevo: false, candidatosMinimo: null,
      rachaMaximo: 0, rachaReaccion: 0, dineroInicial: 0,
      cansancio: 1, espera: 1, experiencia: 1, gamas: []
    };
    cfg().personaje.mejoras.forEach(function (mej) {
      const n = nivelMejoraPersonaje(estado, mej.id);
      if (!n) return;
      const e = mej.niveles[Math.min(n, mej.niveles.length) - 1].efecto;
      Object.keys(e).forEach(function (k) {
        if (k === 'gama') m.gamas.push(e.gama);
        else if (typeof e[k] === 'boolean' || typeof e[k] === 'string') m[k] = e[k];
        else if (k === 'rachaMaximo' || k === 'rachaReaccion' || k === 'dineroInicial') m[k] += e[k];
        else m[k] *= e[k];
      });
    });
    return m;
  }
  /*
   * Solo lectura: lo que falta para poder tener el siguiente nivel de una
   * mejora del personaje ('' si nada): su requisito o que ya está al máximo.
   */
  function faltaParaMejoraPersonaje(estado, id) {
    const mej = buscarMejoraPersonaje(id);
    if (!mej) return 'Esa mejora no existe.';
    if (nivelMejoraPersonaje(estado, id) >= mej.niveles.length) return 'Ya la tienes al máximo.';
    const pide = [].concat(mej.requiere || []).filter(function (id) { return !nivelMejoraPersonaje(estado, id); });
    if (pide.length) return 'Antes necesitas ' + pide.map(function (id) { return buscarMejoraPersonaje(id).nombre; }).join(' y ') + '.';
    // Lo que pide el siguiente nivel ({ id: nivel }).
    const sig = mej.niveles[nivelMejoraPersonaje(estado, id)];
    const porNivel = Object.keys((sig && sig.requiere) || {}).filter(function (otro) {
      return nivelMejoraPersonaje(estado, otro) < sig.requiere[otro];
    });
    if (porNivel.length) {
      return 'Antes necesitas ' + porNivel.map(function (otro) {
        const m = buscarMejoraPersonaje(otro);
        return m.nombre + (m.niveles.length > 1 ? ' ' + ['I', 'II', 'III', 'IV', 'V'][sig.requiere[otro] - 1] : '');
      }).join(' y ') + '.';
    }
    return '';
  }
  /* Coste del siguiente nivel de una mejora del personaje (null si ya está al máximo). */
  function costeMejoraPersonaje(estado, id) {
    const mej = buscarMejoraPersonaje(id);
    const sig = mej && mej.niveles[nivelMejoraPersonaje(estado, id)];
    return sig ? sig.coste : null;
  }
  /*
   * Prestigio (Iván, 24-11-2026; paso 4). Puntos que puedes gastar al
   * reiniciar: los de esta partida (el nivel N da N × puntosPorNivel: en
   * total, 1 + 2 + … + N) más los que guardaste sin gastar antes.
   */
  function puntosDeNivel(nivel) {
    return cfg().personaje.puntosPorNivel * nivel * (nivel + 1) / 2;
  }
  function puntosPrestigio(estado) {
    return puntosDeNivel(nivelPersonaje(estado).nivel) + ((estado.personaje && estado.personaje.puntos) || 0);
  }
  /* '' si puedes empezar de cero; si no, por qué. */
  function faltaParaReiniciar(estado) {
    const minimo = cfg().personaje.nivelPrestigio;
    const nivel = nivelPersonaje(estado).nivel;
    return nivel >= minimo ? '' : 'Necesitas el nivel ' + minimo + ' de taxista (te ' +
      (minimo - nivel === 1 ? 'falta 1 nivel' : 'faltan ' + (minimo - nivel) + ' niveles') + ').';
  }
  /*
   * Comprueba una lista de compras (ids; un id repetido compra otro nivel)
   * sobre las mejoras que ya tienes: { ok, mensaje, mejoras, gastados }.
   * La usan la hoja (para ir sumando) y empezarDeCero().
   */
  function probarComprasPersonaje(estado, compras) {
    const mejoras = Object.assign({}, (estado.personaje && estado.personaje.mejoras) || {});
    const prueba = { personaje: { mejoras } };
    const disponibles = puntosPrestigio(estado);
    let gastados = 0;
    for (const id of compras || []) {
      const falta = faltaParaMejoraPersonaje(prueba, id);
      if (falta) return { ok: false, mensaje: falta, mejoras, gastados };
      const coste = costeMejoraPersonaje(prueba, id);
      if (gastados + coste > disponibles) return { ok: false, mensaje: 'No te llegan los puntos.', mejoras, gastados };
      gastados += coste;
      mejoras[id] = (mejoras[id] || 0) + 1;
    }
    return { ok: true, mensaje: '', mejoras, gastados };
  }
  /*
   * Empezar de cero: desde el nivel nivelPrestigio, gasta los puntos en
   * `compras` y devuelve { ok, mensaje, nuevo }: una partida nueva donde solo
   * quedan las mejoras del personaje, los puntos sin gastar y los ajustes;
   * el nivel vuelve a 0. Quien la llama cambia la partida por `nuevo`.
   */
  function empezarDeCero(estado, compras, ahoraMs, rng) {
    const falta = faltaParaReiniciar(estado);
    if (falta) return fallo(falta);
    const lista = typeof compras === 'string' ? compras.split(',').filter(Boolean) : (compras || []);
    const p = probarComprasPersonaje(estado, lista);
    if (!p.ok) return fallo(p.mensaje);
    const nuevo = crearEstadoInicial(ahoraMs, rng);
    nuevo.ajustes = JSON.parse(JSON.stringify(estado.ajustes || nuevo.ajustes));
    nuevo.personaje = {
      xp: 0,
      puntos: puntosPrestigio(estado) - p.gastados,
      mejoras: p.mejoras,
      reinicios: ((estado.personaje && estado.personaje.reinicios) || 0) + 1,
      // Tu cara y tu nombre se quedan.
      nombre: (estado.personaje && estado.personaje.nombre) || null,
      aspecto: Object.assign({}, nuevo.personaje.aspecto, estado.personaje && estado.personaje.aspecto)
    };
    // La introducción solo sale al principio de la primera partida.
    nuevo.historia = Object.assign({}, estado.historia, { introVista: true });
    aplicarArranque(nuevo);
    const r = exito('Empiezas de cero' + (nuevo.personaje.puntos ? '; te guardas ' + nuevo.personaje.puntos +
      ' punto' + (nuevo.personaje.puntos === 1 ? '' : 's') + ' para el próximo reinicio.' : '.'));
    r.nuevo = nuevo;
    return r;
  }

  /*
   * Tu aspecto (Iván, 24-11-2026): cambia una pieza del retrato (campo de
   * config.personaje.aspecto.opciones). valor llega como texto desde la
   * interfaz ('null', '3', 'true'…): se busca entre las opciones.
   */
  function cambiarAspecto(estado, campo, valor) {
    const opciones = cfg().personaje.aspecto.opciones[campo];
    if (!opciones) return fallo('Eso no se puede cambiar.');
    const elegido = opciones.find(function (o) { return String(o) === String(valor); });
    if (elegido === undefined) return fallo('Esa opción no existe.');
    estado.personaje.aspecto = Object.assign({}, cfg().personaje.aspecto.inicial, estado.personaje.aspecto);
    estado.personaje.aspecto[campo] = elegido;
    return exito('');
  }
  /* Tu nombre (vacío: «Tú»). */
  function renombrarPersonaje(estado, nombre) {
    const limpio = String(nombre || '').replace(/\s+/g, ' ').trim().slice(0, cfg().personaje.aspecto.nombreMax);
    estado.personaje.nombre = limpio || null;
    return exito(limpio ? 'Ahora te llamas ' + limpio + '.' : 'Vuelves a ser «Tú».');
  }
  /* Solo lectura: tu nombre para la interfaz. */
  function nombrePersonaje(estado) {
    return (estado.personaje && estado.personaje.nombre) || 'Tú';
  }
  /* Solo lectura: tu aspecto completo (con las piezas que falten, las de serie). */
  function aspectoPersonaje(estado) {
    return Object.assign({}, cfg().personaje.aspecto.inicial, estado.personaje && estado.personaje.aspecto);
  }

  /*
   * Lo de las mejoras «de arranque» en una partida recién creada: dinero de
   * más, el primer coche a 0 km y los primeros candidatos de categoría
   * mínima. Lo llamará el reinicio (prestigio) tras crear la partida nueva.
   */
  function aplicarArranque(estado) {
    const m = modificadoresPersonaje(estado);
    estado.dinero += m.dineroInicial;
    if (m.cocheNuevo) estado.licencias[0].km = 0;
    if (m.candidatosMinimo) sortearCandidatos(estado, m.candidatosMinimo);
  }

  /*
   * Para probar desde la consola: da experiencia al conductor que se llama
   * `nombre` (el primero que encuentre). Devuelve los avisos de nivel.
   */
  function darExperiencia(estado, nombre, puntos) {
    const hallado = todosLosConductores(estado).find(function (x) {
      return x.t.nombre.toLowerCase() === String(nombre).toLowerCase();
    });
    const turno = hallado ? hallado.t : null;
    if (!turno) return { ok: false, mensaje: 'No tienes ningún conductor que se llame ' + nombre + '.', eventos: [] };
    const resumen = resumenVacio();
    ganarExperiencia(estado, resumen, turno, Number(puntos) || 0);
    return { ok: true, mensaje: turno.nombre + ': nivel ' + nivelConductor(turno) + ' (' + Math.floor(turno.xp) + ' de experiencia).',
      eventos: resumen.eventos };
  }

  // ------------------------------------------------ Objetos de conductor

  function buscarObjeto(id) {
    return cfg().objetos.lista.find(function (o) { return o.id === id; }) || null;
  }

  /* Huecos de objeto que tiene un conductor por su nivel. */
  function huecosConductor(t) {
    return cfg().conductores.niveles.huecos[nivelConductor(t) - 1];
  }

  /* Turno de conductor de esa licencia, o null. */
  function turnoConductor(estado, licenciaId, turno) {
    if (licenciaId === 'reserva') return (estado.reserva || [])[Number(turno)] || null;
    const lic = buscarLicencia(estado, licenciaId);
    const t = lic && lic.turnos[turno];
    return t && t.quien === 'conductor' ? t : null;
  }

  /* «Categoría LEGENDARIO» en las fuentes de sus stats; un ÚNICO rinde
     como su categoría de base, pero se nombra como ÚNICO. */
  function textoCategoria(t, cat) {
    return unicoDe(t) ? 'ÚNICO' : 'Categoría ' + cat.nombre;
  }

  function buscarCategoria(id) {
    return cfg().categorias.find(function (c) { return c.id === id; }) || null;
  }

  /*
   * Categoría al azar con los pesos de la config, o con `pesos` ({ id: peso },
   * los de los candidatos con la mejora de RRHH).
   */
  function sortearCategoria(estado, pesos) {
    const lista = cfg().categorias;
    const peso = function (c) { return pesos && pesos[c.id] !== undefined ? pesos[c.id] : c.peso; };
    // Sobre el total (con una categoría mínima, los pesos ya no suman 1).
    const total = lista.reduce(function (s, c) { return s + peso(c); }, 0);
    let r = azar(estado) * total;
    for (const c of lista) {
      if (r < peso(c)) return c.id;
      r -= peso(c);
    }
    return lista.filter(function (c) { return peso(c) > 0; }).pop().id;
  }

  /* Probabilidad de cada categoría en los candidatos: { id: peso }. */
  function pesosCandidatos(estado) {
    const m = modificadores(estado).pesosCandidatos;
    const pesos = {};
    cfg().categorias.forEach(function (c) { pesos[c.id] = m && m[c.id] !== undefined ? m[c.id] : c.peso; });
    return pesos;
  }

  /* Cuántos objetos sin equipar caben en el almacén (con la mejora «Taquillas»). */
  function capacidadAlmacen(estado) {
    return cfg().objetos.almacen + modificadores(estado).almacen;
  }

  /* Unidades sin equipar en el almacén (todas las clases juntas). */
  function objetosEnAlmacen(estado) {
    const o = estado.objetos || {};
    return Object.keys(o).reduce(function (s, k) { return s + o[k]; }, 0);
  }

  /*
   * Lo que te darían vendiendo todo lo que no está equipado: el almacén y la
   * bandeja, cada objeto al precio de su categoría (Iván, 20-11-2026).
   */
  function valorAlmacen(estado) {
    const o = estado.objetos || {};
    let total = 0;
    Object.keys(o).forEach(function (id) {
      const x = buscarObjeto(id);
      if (x && o[id] > 0) total += o[id] * buscarCategoria(x.categoria).venta;
    });
    (estado.bandeja || []).forEach(function (b) {
      const x = buscarObjeto(b.id);
      if (x) total += buscarCategoria(x.categoria).venta;
    });
    return total;
  }

  /* Pasa al almacén lo que esperaba en la bandeja, mientras quepa. */
  function guardarBandeja(estado) {
    estado.objetos = estado.objetos || {};
    const bandeja = estado.bandeja || [];
    while (bandeja.length > 0 && objetosEnAlmacen(estado) < capacidadAlmacen(estado)) {
      const x = bandeja.shift();
      estado.objetos[x.id] = (estado.objetos[x.id] || 0) + 1;
    }
  }

  /*
   * Un conductor encuentra un objeto al terminar una carrera: categoría al
   * azar y objeto al azar de esa categoría (o lo forzado desde la consola:
   * una categoría o el id de un objeto). Al almacén o, si está lleno, a la
   * bandeja. Avisa con su retrato; no va al ticket.
   */
  /* Un objeto al almacén o, si está lleno, a la bandeja. Devuelve si estaba lleno. */
  function guardarObjeto(estado, objeto, quien) {
    estado.objetos = estado.objetos || {};
    estado.bandeja = estado.bandeja || [];
    const lleno = objetosEnAlmacen(estado) >= capacidadAlmacen(estado);
    if (lleno) estado.bandeja.push({ id: objeto.id, conductor: quien });
    else estado.objetos[objeto.id] = (estado.objetos[objeto.id] || 0) + 1;
    return lleno;
  }

  function hallazgo(estado, resumen, t) {
    if (!t || t.quien !== 'conductor') return;
    const cat = buscarCategoria(t.categoria) || cfg().categorias[0];
    const f = factoresConductor(estado, t);
    const prob = cfg().objetos.probHallazgo * cat.hallazgo * topeConductor('hallazgo', f.hallazgo, t);
    if (!toca(estado, 'hallazgo', prob)) return;
    const forzado = consumirForzado(estado, 'hallazgo');
    let objeto = forzado && forzado.arg ? buscarObjeto(forzado.arg) : null;
    if (!objeto) {
      const pedida = forzado && forzado.arg && buscarCategoria(forzado.arg) ? forzado.arg : null;
      let categoria = pedida || sortearCategoria(estado);
      // Con suerte (objetos, Urraca) lo encontrado sube una categoría.
      const siguiente = categoriaSiguiente(categoria);
      if (!pedida && siguiente && azar(estado) < probSubir(t, f)) categoria = siguiente.id;
      const posibles = cfg().objetos.lista.filter(function (o) { return o.categoria === categoria; });
      objeto = posibles[Math.floor(azar(estado) * posibles.length)];
    }
    const lleno = guardarObjeto(estado, objeto, t.nombre);
    resumen.eventos.push({
      tipo: 'hallazgo', conductor: t.nombre, retrato: t.retrato, objeto: objeto.id, categoria: objeto.categoria,
      // La interfaz añade la etiqueta de su categoría.
      texto: t.nombre + ' encuentra ' + objeto.nombre + (lleno ? '. El almacén está lleno: vende algo para guardarlo.' : '')
    });
  }

  /*
   * Vende un objeto sin equipar: del almacén o, con `deBandeja`, el que
   * espera en esa posición de la bandeja. Lo que espera en la bandeja entra
   * al almacén si ahora cabe.
   */
  function venderObjeto(estado, id, deBandeja) {
    const o = buscarObjeto(id);
    if (!o) return fallo('Ese objeto no existe.');
    if (deBandeja !== undefined && deBandeja !== null && deBandeja !== '') {
      const i = Number(deBandeja);
      const x = (estado.bandeja || [])[i];
      if (!x || x.id !== id) return fallo('Ese objeto ya no está en la bandeja.');
      estado.bandeja.splice(i, 1);
    } else {
      if (!(estado.objetos && estado.objetos[id] > 0)) return fallo('No te queda ' + o.nombre + ' sin equipar.');
      estado.objetos[id]--;
    }
    const precio = buscarCategoria(o.categoria).venta;
    incidencia(estado, resumenVacio(), 'venta', 'Vendes ' + o.nombre + '.', precio, 'extras');
    guardarBandeja(estado);
    const legendaria = cfg().categorias[cfg().categorias.length - 1].id;
    const subes = o.categoria === legendaria ? ganarExperienciaPersonaje(estado, null, cfg().personaje.experiencia.legendarioVendido) : '';
    return exito('Vendes ' + o.nombre + ' por ' + Libre.ui_euros(precio) + '.' + (subes ? ' ' + subes : ''));
  }

  /*
   * Probabilidad de que lo que encuentra un conductor suba una categoría:
   * su factor de suerte menos 1 (1,15 → 15 %), con el tope de suerte.
   */
  function probSubir(t, f) {
    const bruto = f ? f.suerte : aportesConductor(t).reduce(function (p, a) { return p * ((a.efecto || {}).suerte || 1); }, 1);
    return Math.max(0, topeConductor('suerte', bruto, t) - 1);
  }

  /* Categoría siguiente a la de un objeto (null si ya es la mejor). */
  function categoriaSiguiente(id) {
    const lista = cfg().categorias;
    const i = lista.findIndex(function (c) { return c.id === id; });
    return i >= 0 && i < lista.length - 1 ? lista[i + 1] : null;
  }

  /* Cuántos objetos de esa categoría hacen falta para combinar (0 si no se combina). */
  function cuantosParaCombinar(categoria) {
    return (cfg().objetos.combinar || {})[categoria] || 0;
  }

  /*
   * Los objetos sin equipar que se gastan por defecto al combinar `id`
   * (Iván, 18-11-2026): él y otros de su categoría hasta juntar
   * cuantosParaCombinar(), primero sus copias y luego los que más se
   * repiten. Es la propuesta inicial: desde el 19-11-2026 el jugador elige
   * cuáles gasta (combinarObjetos con `elegidos`). Devuelve la lista de ids
   * (con repetidos) o null si no hay bastantes o ya es de la mejor categoría.
   */
  function objetosParaCombinar(estado, id) {
    const o = buscarObjeto(id);
    const n = o ? cuantosParaCombinar(o.categoria) : 0;
    const hay = estado.objetos || {};
    if (!o || !n || !categoriaSiguiente(o.categoria) || !(hay[id] > 0)) return null;
    const usados = [];
    for (let i = 0; i < Math.min(hay[id], n); i++) usados.push(id);
    const otros = cfg().objetos.lista
      .filter(function (x) { return x.categoria === o.categoria && x.id !== id && hay[x.id] > 0; })
      .sort(function (a, b) { return hay[b.id] - hay[a.id]; });
    for (const x of otros) {
      for (let i = 0; i < hay[x.id] && usados.length < n; i++) usados.push(x.id);
    }
    return usados.length >= n ? usados : null;
  }

  /*
   * Combina objetos sin equipar de la misma categoría en uno al azar de la
   * categoría siguiente. `elegidos` (Iván, 19-11-2026): los que el jugador
   * decide gastar, una lista de ids con repetidos (o el texto «a,a,b», como
   * llega desde un botón); tienen que ser justo cuantosParaCombinar() de la
   * categoría de `id` y estar sin equipar. Sin `elegidos`, los de
   * objetosParaCombinar(). Deja hueco en el almacén, así que entra lo que
   * esperaba en la bandeja.
   */
  function combinarObjetos(estado, id, elegidos) {
    const o = buscarObjeto(id);
    if (!o) return fallo('Ese objeto no existe.');
    const siguiente = categoriaSiguiente(o.categoria);
    if (!siguiente) return fallo('Los LEGENDARIOS no se combinan: ya son lo mejor.');
    const n = cuantosParaCombinar(o.categoria);
    const cat = buscarCategoria(o.categoria).nombre;
    let usados;
    if (elegidos !== undefined && elegidos !== null && elegidos !== '') {
      usados = Array.isArray(elegidos) ? elegidos.slice() : String(elegidos).split(',');
      if (usados.length !== n) return fallo('Elige ' + n + ' objetos de categoría ' + cat + ' para combinar.');
      const cuenta = {};
      for (const x of usados) {
        const ob = buscarObjeto(x);
        if (!ob || ob.categoria !== o.categoria) return fallo('Solo se combinan objetos de la misma categoría.');
        cuenta[x] = (cuenta[x] || 0) + 1;
      }
      for (const x in cuenta) {
        if (((estado.objetos || {})[x] || 0) < cuenta[x]) return fallo('No tienes tantos ' + buscarObjeto(x).nombre + ' sin equipar.');
      }
    } else {
      usados = objetosParaCombinar(estado, id);
      if (!usados) return fallo('Para combinar necesitas ' + n + ' objetos de categoría ' + cat + ' sin equipar.');
    }
    usados.forEach(function (x) { estado.objetos[x]--; });
    const posibles = cfg().objetos.lista.filter(function (x) { return x.categoria === siguiente.id; });
    const nuevo = posibles[Math.floor(azar(estado) * posibles.length)];
    estado.objetos[nuevo.id] = (estado.objetos[nuevo.id] || 0) + 1;
    guardarBandeja(estado);
    const r = exito('Combinas ' + usados.length + ' objetos ' + cat +
      ' y sale ' + nuevo.nombre + ' (' + siguiente.nombre + ').');
    r.objeto = nuevo.id;
    return r;
  }

  /* Del almacén a un conductor: hueco libre y sin repetir objeto. */
  function equiparObjeto(estado, licenciaId, turno, id) {
    const t = turnoConductor(estado, licenciaId, turno);
    const o = buscarObjeto(id);
    if (!t) return fallo('Ahí no hay ningún conductor.');
    if (!o) return fallo('Ese objeto no existe.');
    t.objetos = t.objetos || [];
    if (t.objetos.indexOf(id) !== -1) return fallo(t.nombre + ' ya lleva ' + o.nombre + '.');
    if (t.objetos.length >= huecosConductor(t)) return fallo(t.nombre + ' no tiene huecos libres.');
    if (!(estado.objetos && estado.objetos[id] > 0)) return fallo('No te queda ' + o.nombre + ' en el almacén.');
    estado.objetos[id]--;
    t.objetos.push(id);
    return exito(t.nombre + ' lleva ' + o.nombre + '.');
  }

  /* De un conductor al almacén (para pasarlo a otro). Con el almacén lleno, no. */
  function quitarObjeto(estado, licenciaId, turno, id) {
    const t = turnoConductor(estado, licenciaId, turno);
    if (!t) return fallo('Ahí no hay ningún conductor.');
    const i = (t.objetos || []).indexOf(id);
    if (i === -1) return fallo('No lleva ese objeto.');
    if (objetosEnAlmacen(estado) >= capacidadAlmacen(estado)) return fallo('El almacén está lleno: vende algo antes.');
    t.objetos.splice(i, 1);
    estado.objetos = estado.objetos || {};
    estado.objetos[id] = (estado.objetos[id] || 0) + 1;
    return exito(buscarObjeto(id).nombre + ' vuelve al almacén.');
  }

  const VALORES_CONDUCTOR = ['espera', 'propina', 'sinPagar', 'objeto', 'baja', 'pinchazo', 'averia', 'limpieza', 'hallazgo', 'suerte', 'importeLluvia',
    'cansancio', 'descanso'];

  /*
   * De dónde salen los factores de un conductor: una lista de aportes
   * { tipo ('cualidad', 'defecto', 'objeto' o 'nivel'), id, nombre, efecto },
   * en este orden, y al final 'categoria' (su plus de espera de serie).
   * Cualidades y defectos ya llevan la fuerza de su categoría (la categoría
   * refuerza las cualidades y suaviza los defectos); el nivel acorta la
   * espera (cada nivel por encima del 1, un poco).
   */
  function aportesConductor(t) {
    const lista = [];
    if (!t || t.quien !== 'conductor') return lista;
    const cat = buscarCategoria(t.categoria) || cfg().categorias[0];
    function reforzar(efecto, fuerza) {
      const e = {};
      // Los efectos sí/no (como paraConLluvia) no se refuerzan: pasan tal cual.
      Object.keys(efecto || {}).forEach(function (k) {
        e[k] = typeof efecto[k] === 'number' ? 1 + (efecto[k] - 1) * fuerza : efecto[k];
      });
      return e;
    }
    cualidadesDe(t).forEach(function (id) {
      const r = buscarRasgo(id);
      if (r) lista.push({ tipo: 'cualidad', id, nombre: r.nombre, efecto: reforzar(r.efecto, cat.fuerzaCualidad) });
    });
    defectosDe(t).forEach(function (id) {
      const d = buscarRasgo(id);
      if (d) lista.push({ tipo: 'defecto', id, nombre: d.nombre, efecto: reforzar(d.efecto, cat.fuerzaDefecto) });
    });
    (t.objetos || []).forEach(function (id) {
      const o = buscarObjeto(id);
      if (o) lista.push({ tipo: 'objeto', id, nombre: o.nombre, efecto: o.efecto });
    });
    // Sinergias de un ÚNICO con un objeto equipado (Paconi y su planta).
    const u = unicoDe(t);
    ((u && u.sinergias) || []).forEach(function (s) {
      if ((t.objetos || []).indexOf(s.objeto) === -1) return;
      const o = buscarObjeto(s.objeto);
      lista.push({ tipo: 'sinergia', id: s.objeto, nombre: 'Sinergia: ' + (o ? o.nombre : s.objeto), efecto: s.efecto });
    });
    // Lo suyo de serie (El Pelado: más pinchazos y nadie se le va sin pagar).
    if (u && u.efecto) lista.push({ tipo: 'unico', id: t.unico, nombre: u.nombre, efecto: u.efecto });
    const nivel = nivelConductor(t);
    lista.push({ tipo: 'nivel', id: 'nivel', nombre: 'Nivel ' + nivel,
      efecto: { espera: 1 - cfg().conductores.niveles.esperaPorNivel * (nivel - 1) } });
    // El plus de serie de su categoría (los B no tienen).
    if (cat.esperaBase && cat.esperaBase !== 1) {
      lista.push({ tipo: 'categoria', id: cat.id, nombre: textoCategoria(t, cat), efecto: { espera: cat.esperaBase } });
    }
    return lista;
  }

  /*
   * El primer aporte del conductor (objeto o rasgo) con un efecto especial
   * que no es un factor: 'bolsa', 'sinImpagos' o 'rueda'. null si no lo
   * tiene (y siempre en tu turno).
   */
  function conEfecto(t, clave) {
    return aportesConductor(t).find(function (a) { return a.efecto && a.efecto[clave] === true; }) || null;
  }

  /*
   * Factores de un conductor sobre cada valor (1 = sin efecto): producto de
   * sus aportes (aportesConductor()). Lo que depende del turno (esperaDia,
   * esperaNoche) mira el turno de la hora actual, que es el suyo mientras
   * trabaja. Para tu turno, todo 1. Sin tope: lo pone topeConductor().
   */
  function factoresConductor(estado, t) {
    const f = {};
    VALORES_CONDUCTOR.forEach(function (k) { f[k] = 1; });
    if (!t || t.quien !== 'conductor') return f;
    const turno = turnoDeHora(infoReloj(estado.reloj.minutos).hora);
    aportesConductor(t).forEach(function (a) {
      Object.keys(a.efecto || {}).forEach(function (k) {
        const v = a.efecto[k];
        if (k === 'esperaDia') { if (turno === 'dia') f.espera *= v; }
        else if (k === 'esperaNoche') { if (turno === 'noche') f.espera *= v; }
        else if (f[k] !== undefined) f[k] *= v;
      });
    });
    return f;
  }

  /*
   * Stats de un conductor para su ficha (solo lectura): el valor real de
   * cada una, ya con rasgos, objetos, nivel, mejoras y topes, y de dónde
   * sale. `turno` es el suyo ('dia' o 'noche'); null en la reserva. Lo que
   * es solo de día o de noche lleva `soloTurno` y `cuenta` (false si no es
   * su turno, o en la reserva): se enseña, pero no se suma.
   * Cada stat: { clave, valor, factor (total, 1 = normal), tope (si llega),
   *   limite (su tope del lado bueno, como factor; no en hallazgo),
   *   fuentes: [{ tipo, nombre, factor, soloTurno, cuenta, anula }] }.
   *   espera     valor = factor sobre la espera entre carreras (no hay un
   *              tiempo fijo: depende de la zona y la hora)
   *   propina, sinPagar, objeto, hallazgo   probabilidad por carrera
   *   baja, pinchazo, averia                probabilidad al empezar cada turno
   *   limpieza   valor = { costeMin, costeMax, minutos } de un vómito sin bolsa
   * Mismas cuentas que eventosDeCarrera(), sortearInicioDeTurnos(),
   * hallazgo() y el reparto de carreras; si cambian ellas, cambia esto.
   */
  function statsConductor(estado, t, turno) {
    const ev = cfg().eventos;
    const m = modificadores(estado);
    const aportes = aportesConductor(t);
    const mejoras = cfg().mejoras.filter(function (x) { return nivelMejora(estado, x.id) > 0; }).map(function (x) {
      const n = nivelMejora(estado, x.id);
      return { nombre: x.nombre, efecto: x.niveles ? x.niveles[n - 1].efecto : x.efecto };
    });
    function fuentesDe(clave) {
      const fuentes = [];
      aportes.forEach(function (a) {
        Object.keys(a.efecto || {}).forEach(function (k) {
          const dia = k === 'esperaDia', noche = k === 'esperaNoche';
          if (k !== clave && !(clave === 'espera' && (dia || noche))) return;
          const soloTurno = dia ? 'dia' : noche ? 'noche' : null;
          // Lo de día no cuenta de noche (y al revés), ni en la reserva.
          fuentes.push({ tipo: a.tipo, nombre: a.nombre, factor: a.efecto[k], soloTurno,
            cuenta: !soloTurno || soloTurno === turno });
        });
      });
      return fuentes;
    }
    function producto(fuentes) {
      return fuentes.reduce(function (p, x) { return x.cuenta === false || x.anula ? p : p * x.factor; }, 1);
    }
    // El tope del lado bueno de cada stat para este conductor (topesDe()).
    function limite(clave) {
      return topesDe(clave, t)[MAS_ES_MEJOR[clave] ? 1 : 0];
    }
    function probabilidad(clave, base, extra) {
      const fuentes = fuentesDe(clave).concat(extra || []);
      const bruto = producto(fuentes);
      const factor = topeConductor(clave, bruto, t);
      return { clave, valor: base * factor, factor, tope: factor !== bruto, limite: limite(clave), fuentes };
    }
    const stats = [];

    const espera = fuentesDe('espera');
    const brutoEspera = producto(espera);
    const factorEspera = topeConductor('espera', brutoEspera, t);
    stats.push({ clave: 'espera', valor: factorEspera, factor: factorEspera, tope: factorEspera !== brutoEspera,
      limite: limite('espera'), fuentes: espera });

    // Propinas: las mejoras suman probabilidad, y el tope va sobre el total.
    const extrasPropina = mejoras.filter(function (x) { return x.efecto.propinaProb; }).map(function (x) {
      return { tipo: 'mejora', nombre: x.nombre, factor: (ev.propina.probCarrera + x.efecto.propinaProb) / ev.propina.probCarrera };
    });
    const propina = fuentesDe('propina').concat(extrasPropina);
    const brutoPropina = (ev.propina.probCarrera + m.propinaProb) / ev.propina.probCarrera *
      producto(fuentesDe('propina'));
    const factorPropina = topeConductor('propina', brutoPropina, t);
    // El coche que lleva (gamas, idea 23) va aparte, sobre el tope.
    const suCoche = turno ? efectoCoche(estado.licencias.find(function (l) { return l.turnos[turno] === t; })) : {};
    const nombreCoche = function () {
      const lic = estado.licencias.find(function (l) { return l.turnos[turno] === t; });
      return modeloCoche(lic && lic.vehiculo).nombre;
    };
    function porCoche(stat, clave) {
      const f = suCoche[clave];
      if (!f || f === 1) return stat;
      stat.valor *= f;
      stat.factor *= f;
      stat.fuentes.push({ tipo: 'coche', nombre: nombreCoche(), factor: f });
      return stat;
    }
    stats.push(porCoche({ clave: 'propina', valor: ev.propina.probCarrera * factorPropina, factor: factorPropina, tope: factorPropina !== brutoPropina,
      limite: limite('propina'), fuentes: propina }, 'propinaProb'));

    const sinPagar = porCoche(probabilidad('sinPagar', ev.sinPagar.probCarrera), 'sinPagar');
    const camara = conEfecto(t, 'sinImpagos');
    if (camara) {
      sinPagar.valor = 0;
      sinPagar.factor = 0;
      sinPagar.tope = false;
      sinPagar.fuentes.push({ tipo: camara.tipo, nombre: camara.nombre, factor: 0, anula: true });
    }
    stats.push(sinPagar);
    stats.push(probabilidad('objeto', ev.objeto.probCarrera));

    const cat = buscarCategoria(t.categoria) || cfg().categorias[0];
    const hallazgo = fuentesDe('hallazgo');
    const brutoHallazgo = producto(hallazgo);
    const factorHallazgo = topeConductor('hallazgo', brutoHallazgo, t);
    stats.push({ clave: 'hallazgo', valor: cfg().objetos.probHallazgo * cat.hallazgo * factorHallazgo,
      factor: cat.hallazgo * factorHallazgo, tope: factorHallazgo !== brutoHallazgo, limite: limite('hallazgo'),
      fuentes: (cat.hallazgo === 1 ? [] : [{ tipo: 'categoria', nombre: textoCategoria(t, cat), factor: cat.hallazgo, multiplica: true }])
        .concat(hallazgo) });
    // Lo que cobra con lluvia (Anfibio): solo si algo lo cambia.
    const lluvia = fuentesDe('importeLluvia');
    const azucarillo = conEfecto(t, 'paraConLluvia');
    if (azucarillo) {
      // Azucarillo: con lluvia no trabaja (cobra 0), tenga lo que tenga.
      stats.push({ clave: 'importeLluvia', valor: 0, factor: 0, tope: false,
        fuentes: lluvia.concat([{ tipo: azucarillo.tipo, nombre: azucarillo.nombre, factor: 0, nota: 'no trabaja mientras llueve' }]) });
    } else if (lluvia.length) {
      const brutoLluvia = producto(lluvia);
      const factorLluvia = topeConductor('importeLluvia', brutoLluvia, t);
      stats.push({ clave: 'importeLluvia', valor: factorLluvia, factor: factorLluvia, tope: factorLluvia !== brutoLluvia,
        limite: limite('importeLluvia'), fuentes: lluvia });
    }
    const suerte = fuentesDe('suerte');
    if (suerte.length) {
      const brutoSuerte = producto(suerte);
      const factorSuerte = topeConductor('suerte', brutoSuerte, t);
      stats.push({ clave: 'suerte', valor: factorSuerte - 1, factor: factorSuerte, tope: factorSuerte !== brutoSuerte,
        limite: limite('suerte'), fuentes: suerte });
    }

    const bajaU = unicoDe(t) && unicoDe(t).baja;
    stats.push(probabilidad('baja', bajaU ? bajaU.prob : ev.baja.probTurno, mejoras.filter(function (x) { return x.efecto.baja; }).map(function (x) {
      return { tipo: 'mejora', nombre: x.nombre, factor: x.efecto.baja };
    })));
    const pinchazo = probabilidad('pinchazo', ev.pinchazo.probTurno, mejoras.filter(function (x) { return x.efecto.pinchazo; }).map(function (x) {
      return { tipo: 'mejora', nombre: x.nombre, factor: x.efecto.pinchazo };
    }));
    const rueda = conEfecto(t, 'rueda');
    if (rueda) pinchazo.fuentes.push({ tipo: rueda.tipo, nombre: rueda.nombre, factor: 1, nota: 'cambia la rueda y sigue, sin coste' });
    stats.push(pinchazo);
    // Las averías suben con los km del coche que lleva (no en la reserva ni en candidatos).
    const averia = probabilidad('averia', ev.averia.probTurno);
    const suLicencia = turno && estado.licencias.find(function (l) { return l.turnos[turno] === t; });
    const fk = suLicencia ? factorAveriaKm(suLicencia) : 1;
    if (fk !== 1) {
      averia.valor *= fk;
      averia.factor *= fk;
      averia.fuentes.push({ tipo: 'coche', nombre: 'Kilómetros del coche', factor: fk });
    }
    stats.push(porCoche(averia, 'averia'));

    // Cansancio (Iván, 23-11-2026): lo que gasta (factor) y lo que dura su descanso (minutos).
    function conMejoras(clave) {
      return mejoras.filter(function (x) { return x.efecto[clave]; }).map(function (x) {
        return { tipo: 'mejora', nombre: x.nombre, factor: x.efecto[clave] };
      });
    }
    ['cansancio', 'descanso'].forEach(function (clave) {
      const propias = fuentesDe(clave);
      const bruto = producto(propias);
      const factor = topeConductor(clave, bruto, t) * m[clave];
      stats.push(porCoche({ clave, valor: clave === 'descanso' ? cfg().cansancio.descansoMinutos * factor : factor, factor,
        tope: topeConductor(clave, bruto, t) !== bruto, limite: limite(clave), fuentes: propias.concat(conMejoras(clave)) }, clave));
    });

    const limpieza = fuentesDe('limpieza');
    const brutoLimpieza = producto(limpieza);
    const bolsa = conEfecto(t, 'bolsa');
    if (bolsa) limpieza.push({ tipo: bolsa.tipo, nombre: bolsa.nombre, factor: 0, anula: true });
    const l = bolsa ? 0 : topeConductor('limpieza', brutoLimpieza, t);
    stats.push({ clave: 'limpieza', factor: l, tope: l !== brutoLimpieza, limite: limite('limpieza'), fuentes: limpieza,
      valor: { costeMin: ev.vomito.costeMin * l, costeMax: ev.vomito.costeMax * l, minutos: ev.vomito.horasParado * 60 * l } });
    return stats;
  }

  /* Lo que conviene que sea alto (el resto, cuanto más bajo, mejor). */
  const MAS_ES_MEJOR = { propina: true, objeto: true, hallazgo: true, suerte: true, importeLluvia: true };

  /* Apertura de los topes de un conductor (0 a 1): categoría y nivel. */
  function aperturaTopes(t) {
    if (!t || t.quien !== 'conductor') return 0;
    const cat = buscarCategoria(t.categoria) || cfg().categorias[0];
    return Math.min(1, (cat.aperturaTope || 0) + cfg().conductores.topesAbiertos.porNivel * (nivelConductor(t) - 1) / 9);
  }

  /*
   * Topes [mínimo, máximo] de un valor para un conductor: los de la config
   * con el lado bueno abierto según su apertura (topesAbiertos). Sin
   * conductor (o sin `t`), los de la config tal cual.
   */
  function topesDe(valor, t) {
    // Los ÚNICOS no tienen topes (Iván, 25-11-2026).
    if (unicoDe(t)) return [0, Infinity];
    const base = cfg().conductores.topes[valor];
    const a = aperturaTopes(t);
    if (!a) return base;
    const extremo = cfg().conductores.topesAbiertos.extremo[valor];
    const lado = MAS_ES_MEJOR[valor] ? 1 : 0;
    const abierto = Math.pow(base[lado], 1 - a) * Math.pow(extremo, a);
    return lado ? [base[0], abierto] : [abierto, base[1]];
  }

  /* El factor recortado a los topes del conductor: nada llega a cero ni se dispara. */
  function topeConductor(valor, factor, t) {
    const tope = topesDe(valor, t);
    return Math.min(tope[1], Math.max(tope[0], factor));
  }

  /* Dejas tu turno: queda libre para un conductor. Tu flota sigue trabajando. */
  function dejarDeConducir(estado) {
    const u = ubicacionJugador(estado);
    if (!u) return fallo('Ahora no conduces.');
    if (!modificadores(estado).dejarVolante) return fallo('Para dejar el volante necesitas la mejora «Oficina de gestión».');
    if (estado.jugador.carrera) return fallo('Termina antes la carrera en curso.');
    estado.jugador.zona = u.datos.zona;
    buscarLicencia(estado, u.licenciaId).turnos[u.turno] = null;
    return exito('Dejas de conducir. Ese turno queda libre para un conductor.');
  }

  /* Vuelves a conducir en un turno libre de una licencia con coche. */
  function conducir(estado, licenciaId, turno) {
    if (conduce(estado)) return fallo('Ya conduces en otro turno.');
    const lic = buscarLicencia(estado, licenciaId);
    if (!lic || TURNOS.indexOf(turno) === -1) return fallo('Ese turno no existe.');
    if (!lic.vehiculo) return fallo('Esa licencia aún no tiene coche.');
    if (lic.turnos[turno]) return fallo('Ese turno ya está cubierto.');
    const zona = zonaDesbloqueada(estado, estado.jugador.zona) ? estado.jugador.zona : cfg().zonaInicial;
    lic.turnos[turno] = { quien: 'jugador', nombre: 'Tú', zona };
    return exito('Vuelves a conducir en el turno de ' + cfg().turnos[turno].nombre.toLowerCase() + '.');
  }

  /* Finiquito por despedir a un conductor: base más un importe por nivel. */
  function costeDespido(t) {
    const f = cfg().conductores.finiquito;
    return f.base + f.porNivel * nivelConductor(t);
  }

  /*
   * Despedir cuesta el finiquito (sin dinero no se puede) y sale en el ticket
   * como incidencia. Los objetos que llevaba vuelven al almacén.
   */
  function despedirConductor(estado, licenciaId, turno) {
    const t = turnoConductor(estado, licenciaId, turno);
    if (!t) return fallo('Ahí no hay ningún conductor.');
    const coste = costeDespido(t);
    if (estado.dinero < coste) return fallo('No te llega para el finiquito de ' + t.nombre + ': ' + Libre.ui_euros(coste) + '.');
    estado.objetos = estado.objetos || {};
    estado.bandeja = estado.bandeja || [];
    (t.objetos || []).forEach(function (id) {
      if (objetosEnAlmacen(estado) < capacidadAlmacen(estado)) estado.objetos[id] = (estado.objetos[id] || 0) + 1;
      else estado.bandeja.push({ id, conductor: t.nombre });
    });
    incidencia(estado, resumenVacio(), 'finiquito', 'Finiquito de ' + t.nombre + '.', -coste, 'otros');
    recordarDespedido(estado, t);
    // Si estaba en una carrera, se pierde: se va con el cliente.
    if (licenciaId === 'reserva') estado.reserva.splice(Number(turno), 1);
    else buscarLicencia(estado, licenciaId).turnos[turno] = null;
    return exito(t.nombre + ' ya no trabaja para ti: finiquito de ' + Libre.ui_euros(coste) +
      ((t.objetos || []).length ? '. Sus objetos vuelven al almacén.' : '.'));
  }

  /* Cambia la zona de trabajo de un turno (tuyo o de un conductor). */
  function elegirZona(estado, licenciaId, turno, zonaId) {
    const lic = buscarLicencia(estado, licenciaId);
    if (!lic || !lic.turnos[turno]) return fallo('Ese turno no existe.');
    if (lic.turnos[turno].quien === 'conductor') return fallo('Tus conductores eligen ellos su zona.');
    if (!zonaDesbloqueada(estado, zonaId)) return fallo('Esa zona aún no está disponible.');
    lic.turnos[turno].zona = zonaId;
    return exito();
  }

  /*
   * Los conductores eligen su zona (una vez por hora de juego).
   *   Sin «Curso gestión de zonas»: al empezar su turno, o si su zona se queda
   *   sin clientes, eligen al azar entre las zonas con clientes a esa hora.
   *   Con el curso: cada hora se van a la que más les conviene, contando a los
   *   compañeros que ya hay en cada zona (lo que deja de más al dueño).
   */
  function asignarZonasConductores(estado) {
    const ahora = estado.reloj.minutos;
    const hora = Math.floor(ahora / 60);
    if (estado.horaZonas === hora) return;
    estado.horaZonas = hora;
    const info = infoReloj(ahora);
    const turnoActual = turnoDeHora(info.hora);
    const clave = jornadaDe(ahora) + turnoActual;
    const umbral = cfg().economia.demandaMinimaManual;
    const zonas = zonasDisponibles(estado);
    const conClientes = zonas.filter(function (z) { return demandaZona(estado, z, info) >= umbral; });
    const conductores = [];
    estado.licencias.forEach(function (lic) {
      const t = enTurno(lic, turnoActual);
      if (lic.vehiculo && t && t.quien === 'conductor' && puedeTrabajar(estado, lic, t, ahora)) conductores.push({ lic, t });
    });
    if (modificadores(estado).gestionZonas) {
      const cuenta = {};
      const parte = 1 - porcentajeConductor(estado);
      conductores.forEach(function (x) {
        let mejor = x.t.zona, valor = -Infinity;
        zonas.forEach(function (z) {
          const n = (cuenta[z] || 0) + 1;
          const r1 = rendimientoZona(estado, z, n, info), r0 = rendimientoZona(estado, z, n - 1, info);
          const v = (r1.viajesHora - r0.viajesHora) * r1.importe * parte -
            (r1.kmHora - r0.kmHora) * costePorKm(estado, x.lic.vehiculo);
          if (v > valor) { valor = v; mejor = z; }
        });
        x.t.zona = mejor;
        x.t.zonaTurno = clave;
        cuenta[mejor] = (cuenta[mejor] || 0) + 1;
      });
      return;
    }
    conductores.forEach(function (x) {
      const sinClientes = conClientes.indexOf(x.t.zona) === -1;
      if (x.t.zonaTurno === clave && !sinClientes) return;
      const lista = conClientes.length ? conClientes : zonas;
      x.t.zona = lista[Math.floor(azar(estado) * lista.length)];
      x.t.zonaTurno = clave;
    });
  }

  // ------------------------------------------------------ Carrera a mano

  function elegirViaje(zona, rnd) {
    let r = rnd();
    for (const v of zona.viajes) {
      if (r < v.proporcion) return v;
      r -= v.proporcion;
    }
    return zona.viajes[zona.viajes.length - 1];
  }

  /*
   * Planea una carrera en una zona: espera hasta encontrar cliente y viaje.
   *   viajesHoraPorCoche  carreras por hora que le tocan a este coche
   *   espera              'media' (a mano: tarda lo esperado) o 'azar'
   *                       (conductores: parte fija + parte exponencial, sin
   *                       memoria, para poder cortarla en cada hora).
   * Devuelve la carrera, con su combustible ya calculado.
   */
  /*
   * factorEspera (conductores): multiplica la búsqueda y la espera por poca
   * demanda, no la cola de las paradas. Ya viene con su tope.
   */
  function planearCarrera(estado, zonaId, vehiculo, viajesHoraPorCoche, rnd, modoEspera, factorEspera) {
    const c = cfg();
    const zona = c.zonas[zonaId];
    const info = infoReloj(estado.reloj.minutos);
    const m = modificadores(estado, zonaId);
    // El Mercedes encuentra antes cliente en algunas zonas (esperaZonas).
    const porZona = (modeloCoche(vehiculo).efecto || {}).esperaZonas || {};
    const fe = (factorEspera || 1) * (porZona[zonaId] || 1);

    const viaje = elegirViaje(zona, rnd);
    const variacion = 1 + (rnd() * 2 - 1) * zona.variacion;
    const km = viaje.km * variacion;
    const minParado = viaje.minParado * variacion;
    const minutosViaje = viaje.minutos * variacion;
    const importe = importeViaje(viaje, info.tarifa, km, minParado);

    // Ciclo medio por carrera = 60 / carreras por hora. La parte fija es
    // buscar + cola; lo que falte hasta el ciclo es espera por poca demanda.
    const medio = viajeMedio(zonaId, info.tarifa);
    const cola = (modoEspera === 'azar' && zona.colaMax ? zona.colaMin + rnd() * (zona.colaMax - zona.colaMin) : colaMedia(zona)) * m.cola;
    const busqueda = zona.busquedaMin * m.busqueda;
    const fija = busqueda * fe + cola;
    const extraMedio = Math.max(0, 60 / viajesHoraPorCoche - medio.minutos - (busqueda + colaMedia(zona) * m.cola));
    const extra = (modoEspera === 'azar' ? -Math.log(1 - rnd()) * extraMedio : extraMedio) * fe;
    const espera = fija + extra;

    // Buscando cliente se gasta combustible; en la cola de una parada, no.
    const enMarcha = zona.colaMin > 0 ? busqueda * fe : espera - cola;
    const kmVacio = Math.max(0, enMarcha) / 60 * c.conduccion.velocidadVacioKmH;

    const f = factorJornada(estado);
    const ahora = estado.reloj.minutos;
    return {
      zona: zonaId,
      tarifa: viaje.tarifaFija || viaje.tarifa || info.tarifa,
      inicio: ahora,
      finEspera: ahora + espera / f,
      fin: ahora + (espera + minutosViaje) / f,
      importe,
      km,
      kmVacio,
      vehiculo,
      combustible: (km + kmVacio) * costePorKm(estado, vehiculo)
    };
  }

  /*
   * El jugador sale a buscar cliente en su zona. La espera depende de la
   * demanda: con poca demanda tardas más en encontrar a alguien.
   */
  function buscarCliente(estado, rng) {
    // Tu carrera también sale del azar con semilla de la partida (CLAUDE.md:
    // nada de Math.random en la flota); las pruebas pueden pasar el suyo.
    const rnd = rng || generador(estado);
    const c = cfg();
    if (!conduce(estado)) return fallo('Ahora no conduces. Elige un turno libre en Conductores.');
    if (enPausa(estado)) return fallo('El día está cerrado. Arranca el día siguiente.');
    if (eventoPendiente(estado)) return fallo('Antes decide qué hacer con el cliente.');
    if (estado.jugador.carrera) return fallo('Ya estás en una carrera.');
    if (estado.jugador.paradoHasta > estado.reloj.minutos) {
      const vuelta = infoReloj(estado.jugador.paradoHasta);
      return fallo('Estás parado hasta las ' + String(vuelta.hora).padStart(2, '0') + ':' +
        String(vuelta.minuto).padStart(2, '0') + '.');
    }
    const u = ubicacionJugador(estado);
    if (libra(estado, buscarLicencia(estado, u.licenciaId)) &&
        !trabajaIncognito(estado, buscarLicencia(estado, u.licenciaId), u.datos, estado.reloj.minutos)) {
      return fallo('Hoy libra tu licencia: descansas hasta mañana a las 7:00.');
    }
    const sinCoche = motivoSinCoche(estado, buscarLicencia(estado, u.licenciaId));
    if (sinCoche === 'sinCoche') return fallo('Tu licencia no tiene coche: cómprale uno en Conductores.');
    if (sinCoche === 'taller') return fallo('Tu coche está en el taller.');
    if (!jugadorEnTurno(estado)) {
      const t = c.turnos[ubicacionJugador(estado).turno];
      return fallo('Fuera de tu turno: trabajas de ' + t.nombre.toLowerCase() + ', de ' +
        t.horaInicio + ':00 a ' + t.horaFin + ':00.');
    }
    const turno = turnoDelJugador(estado);
    const zona = c.zonas[turno.zona];
    const info = infoReloj(estado.reloj.minutos);
    const demanda = demandaZona(estado, turno.zona, info);
    if (demanda < c.economia.demandaMinimaManual) {
      return fallo('Ahora no hay clientes en ' + zona.nombre + '. Prueba otra zona u otra hora.');
    }

    // Te mira un pesetas: si cargas ahora (pasado el segundo de cortesía), te pilla.
    if (vigilanciaActiva(estado)) {
      const tu = c.eventos.pesetas.tu;
      const cortesia = tu.graciaSegundos * MIN_DIA / segundosPorDia(estado);
      if (estado.reloj.minutos - estado.jugador.vigilancia.desde >= cortesia) {
        const resumen = resumenVacio();
        estado.jugador.vigilancia = null;
        cortarRacha(estado);
        pararHastaFinDeTurno(estado, turnoDelJugador(estado), 'pesetas');
        incidencia(estado, resumen, 'pesetas', 'El pesetas te ha pillado cargando fuera de tus días de trabajo: ' +
          'multa de ' + Libre.ui_euros(tu.multa) + ' y se acabó tu turno.', -tu.multa, 'otros');
        const r = fallo(resumen.eventos[0].texto);
        r.pillado = true;
        return r;
      }
    }

    // Con mucha demanda esperas lo normal; con poca, hasta que aparece alguien.
    const porCoche = Math.min(demanda, 60 / minutosPorCarrera(estado, turno.zona, info.tarifa));
    const lic = buscarLicencia(estado, ubicacionJugador(estado).licenciaId);
    estado.jugador.carrera = planearCarrera(estado, turno.zona, lic.vehiculo, porCoche, rnd, 'media',
      modificadoresPersonaje(estado).espera);
    // Racha: si encadenas, esta carrera cobra un poco más.
    const r = encadenarRacha(estado);
    estado.jugador.carrera.importe *= 1 + r.bono;
    estado.jugador.carrera.racha = r.n;
    return exito(r.alMaximo ? '¡Racha máxima! Cada carrera cobra un ' + Math.round(r.bono * 100) + ' % más mientras no pares.' : '');
  }

  /*
   * Racha (idea 21, Iván 23-11-2026). estado.jugador.racha = { n, turno,
   * hasta }: n carreras encadenadas, el turno (claveTurnoCansancio) y hasta
   * qué minuto de juego puedes buscar la siguiente sin cortarla (null
   * mientras llevas cliente). Sin la mejora Racha de tu personaje, siempre 0.
   */
  function topeRacha(estado) {
    const r = cfg().racha;
    return Math.round((r.maximo + modificadores(estado).rachaMaximo + modificadoresPersonaje(estado).rachaMaximo) / r.porCarrera);
  }
  function rachaViva(estado) {
    const r = estado.jugador.racha;
    if (!modificadoresPersonaje(estado).racha || !r || r.turno !== claveTurnoCansancio(estado.reloj.minutos)) return false;
    return r.hasta === null || estado.reloj.minutos <= r.hasta;
  }
  function encadenarRacha(estado) {
    if (!modificadoresPersonaje(estado).racha) return { n: 0, bono: 0 };
    const antes = rachaViva(estado) ? estado.jugador.racha.n : -1;
    const n = Math.min(antes + 1, topeRacha(estado));
    estado.jugador.racha = { n, turno: claveTurnoCansancio(estado.reloj.minutos), hasta: null };
    return { n, bono: n * cfg().racha.porCarrera, alMaximo: n === topeRacha(estado) && antes === n - 1 };
  }
  /* Al cobrar: tienes segundosVentana() reales para buscar la siguiente. */
  function abrirVentanaRacha(estado) {
    const r = estado.jugador.racha;
    if (!r) return;
    r.desde = estado.reloj.minutos;
    r.hasta = r.desde + segundosVentana(estado, r.n) * MIN_DIA / segundosPorDia(estado);
  }
  /* Segundos reales para encadenar tras la carrera n: cada vez menos (reaccion.inicial → final). */
  function segundosVentana(estado, n) {
    const re = cfg().racha.reaccion;
    const avance = Math.min(1, n / Math.max(1, topeRacha(estado)));
    return re.inicial - (re.inicial - re.final) * avance + modificadores(estado).rachaReaccion +
      modificadoresPersonaje(estado).rachaReaccion;
  }
  function cortarRacha(estado) { estado.jugador.racha = null; }
  /*
   * Para la interfaz: { n, bono, maximo, nivel (0–1), ventana } de la racha
   * ahora (0 si está cortada). ventana: lo que queda (1 → 0) del tiempo para
   * encadenar, o null si no está corriendo (llevas cliente o no hay racha).
   */
  function rachaActual(estado) {
    const viva = rachaViva(estado);
    const r = estado.jugador.racha;
    const n = viva ? r.n : 0;
    const maximo = topeRacha(estado);
    const ventana = viva && r.hasta !== null && r.hasta > r.desde
      ? Math.max(0, (r.hasta - estado.reloj.minutos) / (r.hasta - r.desde)) : null;
    return { n, bono: n * cfg().racha.porCarrera, maximo, nivel: maximo ? n / maximo : 0, ventana,
      disponible: modificadoresPersonaje(estado).racha };
  }

  /*
   * Solo lectura, para la interfaz: lo que marca ahora el taxímetro de tu
   * carrera a mano. null mientras buscas cliente o sin carrera. Con pasajero,
   * sube del inicio de servicio al importe final según avanza el viaje; con
   * tarifa fija marca el precio fijo desde el principio.
   */
  function importeEnCurso(estado) {
    return importeDeCarrera(estado, estado.jugador.carrera);
  }

  /* Lo mismo para cualquier carrera (tuya o de un conductor). null sin pasajero. */
  function importeDeCarrera(estado, carrera) {
    if (!carrera || carrera.vacio || estado.reloj.minutos < carrera.finEspera) return null;
    const tarifa = cfg().tarifas[carrera.tarifa];
    if (tarifa.fija !== undefined) return tarifa.fija;
    const avance = Math.min(1, (estado.reloj.minutos - carrera.finEspera) / (carrera.fin - carrera.finEspera));
    return tarifa.inicio + (carrera.importe - tarifa.inicio) * avance;
  }

  function terminarCarrera(estado, resumen) {
    const carrera = estado.jugador.carrera;
    estado.jugador.carrera = null;
    estado.jugador.ultimaCarrera = {
      zona: carrera.zona, tarifa: carrera.tarifa, importe: carrera.importe, km: carrera.km
    };
    gastar(estado, resumen, 'combustible', carrera.combustible, carrera.vehiculo);
    // Tú también te cansas (paso 2): la misma barra, en estado.jugador.
    cansarse(estado, estado.jugador, carrera);
    // Racha: si toca descansar se corta; si no, abre el segundo para encadenar.
    if (estado.jugador.motivoParada === 'descanso' && estado.jugador.paradoHasta > estado.reloj.minutos) cortarRacha(estado);
    else abrirVentanaRacha(estado);
    estado.caja.hoy.km += carrera.km + (carrera.kmVacio || 0);
    const enLicencia = ubicacionJugador(estado);
    sumarKm(estado, enLicencia && buscarLicencia(estado, enLicencia.licenciaId), carrera.km + (carrera.kmVacio || 0));
    const antes = estado.totales.ingresos;
    eventosDeCarrera(estado, resumen, carrera, { quien: 'jugador', nombre: 'Tú' });
    const u = ubicacionJugador(estado);
    if (u) sumarFacturado(estado, buscarLicencia(estado, u.licenciaId), estado.totales.ingresos - antes);
    apuntarFacturado(estado, { quien: 'jugador' }, estado.totales.ingresos - antes);
    ganarExperienciaPersonaje(estado, resumen, cfg().personaje.experiencia.tuCarrera);
  }

  /* Lo que lleva facturado cada taxi en la jornada (para la lista de taxis). */
  function sumarFacturado(estado, lic, importe) {
    if (!lic || !(importe > 0)) return;
    lic.facturadoJornada = (lic.facturadoJornada || 0) + importe;
    // La caja de hoy apunta qué licencias han trabajado (salen en el ticket).
    const lista = estado.caja.hoy.licencias = estado.caja.hoy.licencias || [];
    if (lista.indexOf(lic.numero) === -1) lista.push(lic.numero);
  }

  function cobrar(estado, resumen, importe, carreras) {
    estado.dinero += importe;
    estado.caja.hoy.ingresos += importe;
    estado.caja.hoy.carreras += carreras;
    estado.totales.ingresos += importe;
    estado.totales.carreras += carreras;
    resumen.ingresos += importe;
    resumen.carreras += carreras;
  }

  // --------------------------------------------------- Flota automática

  /*
   * Coches trabajando ahora mismo, agrupados por zona:
   * { zonaId: [ { licencia, turno } ] }. Tu propio turno solo cuenta cuando ya
   * es automático.
   */
  function cochesPorZona(estado, info) {
    const turnoActual = turnoDeHora(info.hora);
    const grupos = {};
    estado.licencias.forEach(function (lic) {
      const t = enTurno(lic, turnoActual);
      if (!lic.vehiculo || !t) return;
      if (t.quien === 'jugador') return;   // tu turno siempre es a clic
      if (!puedeTrabajar(estado, lic, t, info.dia * MIN_DIA + info.minutoDelDia)) return;
      (grupos[t.zona] = grupos[t.zona] || []).push({ licencia: lic, turno: t });
    });
    return grupos;
  }

  /*
   * Rendimiento por hora de juego de `coches` coches en una zona.
   * Cada coche hace como mucho 60 / (buscar + cola + viaje) carreras por hora;
   * la zona no da más carreras que su demanda. Los coches que sobran circulan
   * vacíos gastando combustible (o esperan en la cola sin gastar).
   */
  function rendimientoZona(estado, zonaId, coches, info) {
    const c = cfg();
    const zona = c.zonas[zonaId];
    const demanda = demandaZona(estado, zonaId, info);
    const porCoche = 60 / minutosPorCarrera(estado, zonaId, info.tarifa);
    const capacidad = coches * porCoche;
    const viajesHora = Math.min(demanda, capacidad);
    const ocupacion = capacidad > 0 ? viajesHora / capacidad : 0;
    const medio = viajeMedio(zonaId, info.tarifa);
    const vel = c.conduccion.velocidadVacioKmH;
    const kmBusqueda = zona.busquedaMin * modificadores(estado, zonaId).busqueda / 60 * vel;
    const kmOciosos = zona.colaMin > 0 ? 0 : coches * (1 - ocupacion) * vel;
    return {
      demanda,
      capacidad,
      viajesHora,
      ocupacion,
      importe: medio.importe,
      kmHora: viajesHora * (medio.km + kmBusqueda) + kmOciosos
    };
  }

  /*
   * Conductores con carreras reales (juego abierto). Cada turno de conductor
   * que esté en su franja y sin carrera empieza una: espera según la demanda
   * de su zona repartida entre los coches que hay en ella, y luego el viaje.
   * Si la espera pasaría de la hora en curso, ese rato queda «en vacío» hasta
   * la hora (la espera no tiene memoria, así que se puede cortar sin sesgo).
   */
  function empezarCarrerasConductores(estado, resumen) {
    sortearInicioDeTurnos(estado, resumen);
    pararPorLluvia(estado);
    asignarZonasConductores(estado);
    const info = infoReloj(estado.reloj.minutos);
    const grupos = cochesPorZona(estado, info);
    const finHora = (Math.floor(estado.reloj.minutos / 60) + 1) * 60;
    const rnd = generador(estado);
    Object.keys(grupos).forEach(function (zonaId) {
      const coches = grupos[zonaId];
      const r = rendimientoZona(estado, zonaId, coches.length, info);
      const porCoche = r.viajesHora / coches.length;
      coches.forEach(function (x) {
        if (x.turno.carrera) return;
        if (porCoche <= 1e-6) {
          x.turno.carrera = tramoEnVacio(estado, zonaId, x.licencia.vehiculo, finHora);
          return;
        }
        const fe = topeConductor('espera', factoresConductor(estado, x.turno).espera, x.turno);
        const carrera = planearCarrera(estado, zonaId, x.licencia.vehiculo, porCoche, rnd, 'azar', fe);
        // Un ÚNICO cobra algo más con tocayos en la flota (Paconi) o con su
        // objeto de sinergia (El Pelado y sus chicles).
        carrera.importe *= factorImporteUnico(estado, x.turno);
        // Anfibio: cobra más si el cliente sube con lluvia (al acabar la espera).
        if (lloviendo(estado, carrera.finEspera)) {
          carrera.importe *= topeConductor('importeLluvia', factoresConductor(estado, x.turno).importeLluvia, x.turno);
        }
        // En una parada con cola (Barajas: 1–2 h) se guarda el turno aunque pase
        // de la hora; sin cola, la espera se corta en la hora (no tiene memoria).
        x.turno.carrera = carrera.finEspera > finHora && !cfg().zonas[zonaId].colaMin
          ? tramoEnVacio(estado, zonaId, x.licencia.vehiculo, finHora)
          : carrera;
      });
    });
  }

  /* Rato sin cliente hasta `hasta`: gasta combustible si la zona no tiene cola. */
  function tramoEnVacio(estado, zonaId, vehiculo, hasta) {
    const zona = cfg().zonas[zonaId];
    const ahora = estado.reloj.minutos;
    const minutosReales = (hasta - ahora) * factorJornada(estado);
    const kmVacio = zona.colaMin > 0 ? 0 : minutosReales / 60 * cfg().conduccion.velocidadVacioKmH;
    return {
      vacio: true, zona: zonaId, inicio: ahora, finEspera: hasta, fin: hasta,
      importe: 0, km: 0, kmVacio, vehiculo, combustible: kmVacio * costePorKm(estado, vehiculo)
    };
  }

  /*
   * Cansancio (Iván, 23-11-2026). Cada turno lleva su energía en
   * t.cansancio (de 0 a cansancio.maximo) y en t.cansancioTurno el turno al
   * que corresponde: al empezar otro turno, vuelve a estar llena.
   */
  function claveTurnoCansancio(minutos) {
    return Math.floor((minutos - cfg().turnos.dia.horaInicio * 60) / (MIN_DIA / 2));
  }
  /* Energía que le queda a un turno ahora (llena si aún no ha trabajado en este turno). */
  function energia(estado, t) {
    if (!t || t.cansancioTurno !== claveTurnoCansancio(estado.reloj.minutos)) return cfg().cansancio.maximo;
    return Math.max(0, t.cansancio);
  }
  /* Lo que gasta una carrera (o un rato en vacío): espera y viaje por minuto de juego. */
  function gastoCansancio(estado, carrera) {
    const g = cfg().cansancio.gastoPorMinuto;
    const zona = cfg().zonas[carrera.zona];
    const espera = Math.max(0, carrera.finEspera - carrera.inicio);
    const viaje = Math.max(0, carrera.fin - carrera.finEspera);
    return espera * (zona && zona.colaMin > 0 ? g.cola : g.buscando) + viaje * g.pasajero;
  }
  /* Gasta la energía de la carrera que acaba; a 0, descansa (ya sin cliente). */
  /*
   * Factores del cansancio de un turno: lo que gasta y lo que dura su
   * descanso. Rasgos y objetos (conductores, con sus topes) por las mejoras
   * (toda la flota, también tú). Paso 3 del cansancio (Iván, 23-11-2026).
   */
  function factoresCansancio(estado, t) {
    const f = factoresConductor(estado, t);
    const m = modificadores(estado);
    // Tú, además, con Fondo físico (mejora de tu personaje).
    const tuyo = t === estado.jugador ? modificadoresPersonaje(estado).cansancio : 1;
    // Y el coche que lleva (el Tesla cansa menos).
    const coche = (t === estado.jugador ? efectoCocheDe(estado, { quien: 'jugador' }) : efectoCocheDe(estado, t)).cansancio || 1;
    return {
      cansancio: topeConductor('cansancio', f.cansancio, t) * m.cansancio * tuyo * coche,
      descanso: topeConductor('descanso', f.descanso, t) * m.descanso
    };
  }
  /* Minutos de juego que dura su descanso. */
  function minutosDescanso(estado, t) {
    return cfg().cansancio.descansoMinutos * factoresCansancio(estado, t).descanso;
  }
  function cansarse(estado, t, carrera) {
    const c = cfg().cansancio;
    const clave = claveTurnoCansancio(carrera.inicio);
    if (t.cansancioTurno !== clave) { t.cansancio = c.maximo; t.cansancioTurno = clave; }
    t.cansancio -= gastoCansancio(estado, carrera) * factoresCansancio(estado, t).cansancio;
    if (t.cansancio > 0) return;
    const ahora = estado.reloj.minutos;
    const minutos = minutosDescanso(estado, t);
    t.cansancio = c.maximo;
    t.cansancioTurno = claveTurnoCansancio(ahora);
    if ((t.paradoHasta || 0) < ahora + minutos) {
      t.paradoHasta = ahora + minutos;
      t.motivoParada = 'descanso';
    }
  }

  /* Cobra (o solo gasta, si fue un rato en vacío) la carrera de un conductor. */
  function terminarCarreraConductor(estado, resumen, turno) {
    const carrera = turno.carrera;
    turno.carrera = null;
    cansarse(estado, turno, carrera);
    const u = unicoDe(turno);
    gastar(estado, resumen, 'combustible', carrera.combustible * ((u && u.combustible) || 1), carrera.vehiculo);
    estado.caja.hoy.km += carrera.km + carrera.kmVacio;
    apuntarKmConductor(estado, turno, carrera.km + carrera.kmVacio);
    sumarKm(estado, licenciaDelTurno(estado, turno), carrera.km + carrera.kmVacio);
    if (carrera.vacio) return;
    const antes = estado.totales.ingresos;
    eventosDeCarrera(estado, resumen, carrera, turno);
    const cobrado = estado.totales.ingresos - antes;
    sumarFacturado(estado, estado.licencias.find(function (l) { return l.turnos.dia === turno || l.turnos.noche === turno; }), cobrado);
    turno.carreras = (turno.carreras || 0) + 1;
    turno.facturado = (turno.facturado || 0) + cobrado;
    apuntarFacturado(estado, turno, cobrado);
    ganarExperiencia(estado, resumen, turno, cfg().conductores.niveles.porCarrera);
    ganarExperienciaPersonaje(estado, resumen, cfg().personaje.experiencia.carreraConductor);
    hallazgo(estado, resumen, turno);
  }

  // ------------------------------------------------------------- Eventos

  function entre(estado, min, max) {
    return min + azar(estado) * (max - min);
  }

  function enteroEntre(estado, min, max) {
    return Math.floor(entre(estado, min, max + 1));
  }

  /*
   * Apunta una incidencia en la caja de hoy y en la lista de avisos.
   * cuenta: 'extras' (dinero que entra), 'otros' (gasto) o null (solo aviso).
   */
  function incidencia(estado, resumen, tipo, texto, importe, cuenta, turno) {
    const caja = estado.caja.hoy;
    const a = caja.incidencias[tipo] = caja.incidencias[tipo] || { veces: 0, importe: 0 };
    a.veces++;
    a.importe += importe;
    if (cuenta === 'extras') { estado.dinero += importe; caja.extras += importe; }
    if (cuenta === 'otros') { estado.dinero += importe; caja.otros -= importe; }
    const ev = { tipo, texto, importe };
    if (turno && turno.quien === 'conductor') { ev.conductor = turno.nombre; ev.retrato = turno.retrato; }
    resumen.eventos.push(ev);
  }

  /* ¿Toca el evento? Si se forzó desde la consola, sí (y se consume después). */
  function toca(estado, tipo, probabilidad) {
    if ((estado.eventosForzados || []).some(function (f) { return f.tipo === tipo; })) return true;
    return azar(estado) < probabilidad;
  }

  function consumirForzado(estado, tipo) {
    const lista = estado.eventosForzados || [];
    const i = lista.findIndex(function (f) { return f.tipo === tipo; });
    return i === -1 ? null : lista.splice(i, 1)[0];
  }

  /*
   * Al terminar una carrera (tuya o de un conductor): sin pagar, propina,
   * objeto devuelto y vómito. quien: el turno del conductor o { quien: 'jugador' }.
   */
  function eventosDeCarrera(estado, resumen, carrera, quien) {
    const ev = cfg().eventos;
    const esConductor = quien.quien === 'conductor';
    const sujeto = esConductor ? quien.nombre : 'Tú';

    const m = modificadores(estado);
    // Rasgos del conductor (todo 1 en tu turno), con sus topes.
    const f = factoresConductor(estado, quien);
    // El coche (Mercedes) va aparte, sobre los topes del conductor.
    const coche = efectoCocheDe(estado, quien);
    const baseProp = ev.propina.probCarrera;
    const probPropina = baseProp * topeConductor('propina', (baseProp + m.propinaProb) / baseProp * f.propina, quien) * (coche.propinaProb || 1);
    const frena = conEfecto(quien, 'sinImpagos');
    // El Pelado: el que lo intenta no se va (ni vestido). Solo un aviso.
    if (frena && frena.tipo === 'unico' && toca(estado, 'sinPagar', ev.sinPagar.probCarrera)) {
      resumen.eventos.push({ tipo: 'unicoFrena', conductor: quien.nombre, retrato: quien.retrato,
        texto: 'Un cliente intenta irse sin pagar a ' + quien.nombre + '. Paga. «' + fraseUnico(estado, quien) + '»' });
    }
    if (!frena && toca(estado, 'sinPagar', ev.sinPagar.probCarrera * topeConductor('sinPagar', f.sinPagar, quien) * (coche.sinPagar || 1))) {
      consumirForzado(estado, 'sinPagar');
      incidencia(estado, resumen, 'sinPagar',
        (esConductor ? 'A ' + sujeto + ' se le' : 'Se te') + ' va un cliente sin pagar: ' +
        Libre.ui_euros(carrera.importe) + ' perdidos.', -carrera.importe, null, quien);
      return;
    }
    cobrar(estado, resumen, carrera.importe, 1);
    if (esConductor) gastar(estado, resumen, 'conductores', carrera.importe * porcentajeConductor(estado));

    if (toca(estado, 'propina', probPropina)) {
      consumirForzado(estado, 'propina');
      const propina = carrera.importe * entre(estado, ev.propina.porcentajeMin, ev.propina.porcentajeMax) * m.propinaImporte * (coche.propinaImporte || 1);
      incidencia(estado, resumen, 'propina', 'Propina de ' + Libre.ui_euros(propina) + '.', propina, 'extras', quien);
    }

    if (toca(estado, 'objeto', ev.objeto.probCarrera * topeConductor('objeto', f.objeto, quien))) {
      const forzado = consumirForzado(estado, 'objeto');
      const objeto = forzado && forzado.arg ? ev.objeto.objetos[Number(forzado.arg) - 1] : elegirObjeto(estado);
      incidencia(estado, resumen, 'objeto',
        (esConductor ? sujeto + ' devuelve ' : 'Devuelves ') + objeto.nombre +
        ' olvidado en el taxi: el cliente ' + (esConductor ? 'le' : 'te') + ' da ' +
        Libre.ui_euros(objeto.recompensa) + ' de recompensa.', objeto.recompensa, 'extras', quien);
    }

    if (toca(estado, 'vomito', probVomito(estado, carrera))) {
      consumirForzado(estado, 'vomito');
      if (conEfecto(quien, 'bolsa')) {
        // Con la bolsa a mano no pasa nada: sale en el ticket.
        incidencia(estado, resumen, 'bolsa', 'Un cliente se marea en el taxi de ' + sujeto +
          ', pero había bolsa: el coche queda limpio.', 0, null, quien);
        return;
      }
      const limpieza = topeConductor('limpieza', f.limpieza, quien);
      const coste = entre(estado, ev.vomito.costeMin, ev.vomito.costeMax) * limpieza;
      const minutos = ev.vomito.horasParado * 60 * limpieza;
      pararUnRato(estado, quien, minutos, 'vomito');
      incidencia(estado, resumen, 'vomito',
        'Un cliente vomita en el taxi' + (esConductor ? ' de ' + sujeto : '') + ': limpieza de ' +
        Libre.ui_euros(coste) + ' y ' + (minutos === 60 ? 'una hora' : Math.round(minutos) + ' minutos') + ' parado.',
        -coste, 'otros', quien);
    }
  }

  /* Probabilidad de vómito de una carrera: por zona, de noche o de día. */
  function probVomito(estado, carrera) {
    const v = cfg().eventos.vomito;
    if (v.probPorZona && v.probPorZona[carrera.zona] !== undefined) return v.probPorZona[carrera.zona];
    const hora = infoReloj(estado.reloj.minutos).hora;
    const noche = hora >= v.horaNocheInicio || hora < v.horaNocheFin;
    return noche ? v.probNoche : v.probCarrera;
  }

  /*
   * El turno (tuyo o de un conductor) se queda parado `minutos` de juego
   * (al ritmo real de siempre: con jornadas largas el reloj va más lento).
   * `motivo` ('vomito', 'pinchazo') solo sirve para enseñarlo en pantalla.
   */
  /*
   * Azucarillo (paraConLluvia): mientras llueve, el conductor que no lleva
   * una carrera se queda parado hasta que escampa (motivo 'lluvia').
   */
  function pararPorLluvia(estado) {
    const ahora = estado.reloj.minutos;
    if (!lloviendo(estado, ahora)) return;
    estado.licencias.forEach(function (lic) {
      TURNOS.forEach(function (tn) {
        const t = lic.turnos[tn];
        if (!t || t.quien !== 'conductor' || t.carrera || !conEfecto(t, 'paraConLluvia')) return;
        if ((t.paradoHasta || 0) >= estado.lluvia.hasta) return;
        t.paradoHasta = estado.lluvia.hasta;
        t.motivoParada = 'lluvia';
      });
    });
  }

  function pararUnRato(estado, quien, minutos, motivo) {
    const hasta = estado.reloj.minutos + minutos / factorJornada(estado);
    const datos = quien.quien === 'conductor' ? quien : estado.jugador;
    datos.paradoHasta = Math.max(datos.paradoHasta || 0, hasta);
    datos.motivoParada = motivo || null;
    datos.carrera = null;
  }

  function elegirObjeto(estado) {
    const objetos = cfg().eventos.objeto.objetos;
    const total = objetos.reduce(function (s, o) { return s + o.peso; }, 0);
    let r = azar(estado) * total;
    for (const o of objetos) { if (r < o.peso) return o; r -= o.peso; }
    return objetos[0];
  }

  /* El turno (tuyo o de un conductor) no trabaja más hasta que termine. */
  function pararHastaFinDeTurno(estado, quien, motivo) {
    if (quien.quien === 'conductor') {
      const lic = estado.licencias.find(function (l) { return l.turnos.dia === quien || l.turnos.noche === quien; });
      const turno = lic.turnos.dia === quien ? 'dia' : 'noche';
      quien.paradoHasta = finDeTurno(estado.reloj.minutos, turno);
      quien.motivoParada = motivo || null;
      quien.carrera = null;
    } else {
      const u = ubicacionJugador(estado);
      estado.jugador.paradoHasta = finDeTurno(estado.reloj.minutos, u.turno);
      estado.jugador.motivoParada = motivo || null;
      estado.jugador.carrera = null;
    }
  }

  /*
   * Modo incógnito (Iván, 20-11-2026): con la mejora, un conductor de nivel
   * máximo trabaja aunque su licencia libre ese día. Tú no.
   */
  function trabajaIncognito(estado, lic, turno, minutos) {
    if (!turno || !libra(estado, lic, minutos)) return false;
    // Tú, con «Incógnito al volante» (Iván, 20-11-2026).
    if (turno.quien === 'jugador') return modificadoresPersonaje(estado).incognitoTu;
    if (unicoDe(turno) && unicoDe(turno).sinIncognito) return false;
    return turno.quien === 'conductor' && modificadores(estado).incognito &&
      nivelConductor(turno) >= cfg().conductores.niveles.experiencia.length;
  }

  /* ¿Te está mirando un pesetas ahora? (estado.jugador.vigilancia) */
  function vigilanciaActiva(estado) {
    const v = estado.jugador.vigilancia;
    return !!v && estado.reloj.minutos < v.hasta;
  }

  /* Segundos reales que quedan de vigilancia (0 si no hay). */
  function segundosVigilancia(estado) {
    if (!vigilanciaActiva(estado)) return 0;
    return (estado.jugador.vigilancia.hasta - estado.reloj.minutos) * segundosPorDia(estado) / MIN_DIA;
  }

  /* ¿Puede trabajar ese turno ahora? No con baja, avería o jornada terminada. */
  function puedeTrabajar(estado, lic, turno, minutos) {
    const jornada = jornadaDe(minutos);
    if (libra(estado, lic, minutos) && !trabajaIncognito(estado, lic, turno, minutos)) return false;
    if (lic.averia && jornada < lic.averia.hasta) return false;
    if (turno.baja && jornada < turno.baja.hasta) return false;
    if (turno.paradoHasta && turno.paradoHasta > minutos) return false;
    return true;
  }

  /*
   * Al empezar cada turno de cada taxi (conductores) se sortean baja,
   * pinchazo y avería; en tu turno, solo el pinchazo. Pinchazo y avería
   * reciben un minuto al azar dentro del turno.
   */
  function sortearInicioDeTurnos(estado, resumen) {
    const ahora = estado.reloj.minutos;
    const info = infoReloj(ahora);
    const turnoActual = turnoDeHora(info.hora);
    const clave = jornadaDe(ahora) + turnoActual;
    const ev = cfg().eventos;
    const jornada = jornadaDe(ahora);
    const fin = finDeTurno(ahora, turnoActual);

    estado.licencias.forEach(function (lic) {
      const t = enTurno(lic, turnoActual);
      if (!lic.vehiculo || !t || t.sorteado === clave) return;
      t.sorteado = clave;
      if (t.quien === 'jugador') {
        // De incógnito, puede aparecer un pesetas a vigilarte en algún momento del turno.
        if (trabajaIncognito(estado, lic, t, ahora) && azar(estado) < ev.pesetas.tu.probTurno) {
          t.pendiente = { tipo: 'pesetas', minuto: entre(estado, ahora, fin) };
          return;
        }
        // Tu coche: pinchazo, avería definitiva y avería normal (sin rasgos).
        if (azar(estado) < ev.pinchazo.probTurno * modificadores(estado).pinchazo) t.pendiente = { tipo: 'pinchazo', minuto: entre(estado, ahora, fin) };
        else if (tocaRotura(estado, lic)) t.pendiente = { tipo: 'rotura', minuto: entre(estado, ahora, fin) };
        else if (averiaPosible(estado, lic) && azar(estado) < ev.averia.probTurno * factorAveriaKm(lic) * (efectoCoche(lic).averia || 1)) {
          t.pendiente = { tipo: 'averia', minuto: entre(estado, ahora, fin) };
        }
        return;
      }
      if (!puedeTrabajar(estado, lic, t, ahora)) return;
      // De incógnito, un «pesetas» lo puede pillar en algún momento del turno.
      if (trabajaIncognito(estado, lic, t, ahora) && azar(estado) < ev.pesetas.probTurno) {
        t.pendiente = { tipo: 'pesetas', minuto: entre(estado, ahora, fin) };
        return;
      }
      const f = factoresConductor(estado, t);
      // Bajas: rasgo y objetos del conductor y las mejoras (Deflectores), con tope.
      // Un ÚNICO puede tener sus propias bajas (Paconi: más a menudo y más cortas).
      const bajaU = (unicoDe(t) && unicoDe(t).baja) || null;
      const baja = bajaU ? { probTurno: bajaU.prob, jornadasMin: bajaU.jornadasMin, jornadasMax: bajaU.jornadasMax } : ev.baja;
      if (azar(estado) < baja.probTurno * topeConductor('baja', f.baja * modificadores(estado).baja, t)) {
        const jornadas = enteroEntre(estado, baja.jornadasMin, baja.jornadasMax);
        t.baja = { hasta: jornada + jornadas };
        const frase = fraseUnico(estado, t);
        incidencia(estado, resumen, 'baja', t.nombre + ' está de baja por enfermedad: ' + jornadas +
          (jornadas === 1 ? ' jornada' : ' jornadas') + ' sin trabajar.' + (frase ? ' «' + frase + '»' : ''), 0, null, t);
        return;
      }
      if (azar(estado) < ev.pinchazo.probTurno * topeConductor('pinchazo', f.pinchazo * modificadores(estado).pinchazo, t)) {
        t.pendiente = { tipo: 'pinchazo', minuto: entre(estado, ahora, fin) };
      } else if (tocaRotura(estado, lic)) {
        t.pendiente = { tipo: 'rotura', minuto: entre(estado, ahora, fin) };
      } else if (averiaPosible(estado, lic) &&
        azar(estado) < ev.averia.probTurno * topeConductor('averia', f.averia, t) * factorAveriaKm(lic) * (efectoCoche(lic).averia || 1)) {
        t.pendiente = { tipo: 'averia', minuto: entre(estado, ahora, fin) };
      }
    });
  }

  /*
   * Solo hay averías con 2 coches o más y nunca si dejaría la flota sin
   * ningún coche en marcha. Desde el 19-11-2026 (Iván) también en tu coche.
   */
  function averiaPosible(estado, lic) {
    const jornada = jornadaDe(estado.reloj.minutos);
    const conCoche = estado.licencias.filter(function (l) { return !!l.vehiculo; });
    if (conCoche.length < cfg().eventos.averia.cochesMinimos) return false;
    if (!lic.vehiculo) return false;
    if (lic.averia && jornada < lic.averia.hasta) return false;
    const enMarcha = conCoche.filter(function (l) { return l !== lic && !(l.averia && jornada < l.averia.hasta); });
    return enMarcha.length > 0;
  }

  // ------------------------------------------------- Desgaste del coche

  /* Las averías normales suben con los km del coche (×2 a kmDoble). */
  function factorAveriaKm(lic) {
    const a = cfg().eventos.averia;
    if (lic && lic.alquiler) return 1;   // el de alquiler no se gasta
    return Math.min(a.factorKmMax, 1 + (lic && lic.km || 0) / a.kmDoble);
  }

  /* Probabilidad por turno de avería definitiva según los km (0 hasta kmDesde). */
  function probRotura(lic) {
    const r = cfg().eventos.rotura;
    if (!lic || !lic.vehiculo || lic.alquiler) return 0;
    const x = Math.max(0, ((lic.km || 0) - r.kmDesde) / (r.kmMax - r.kmDesde));
    return Math.min(r.probMax, r.probMax * x * x);
  }

  /* ¿Hay en la flota otro coche que pueda trabajar (con coche y sin avería)? */
  function otroCocheEnMarcha(estado, lic) {
    const jornada = jornadaDe(estado.reloj.minutos);
    return estado.licencias.some(function (l) {
      return l !== lic && l.vehiculo && !(l.averia && jornada < l.averia.hasta);
    });
  }

  /*
   * ¿Se puede romper del todo? Con coche y fuera del taller. Nunca si deja
   * la flota sin coche en marcha y no te llega para comprar otro: la
   * partida no se puede quedar bloqueada.
   */
  function roturaPosible(estado, lic) {
    if (!lic.vehiculo || lic.alquiler) return false;
    if (lic.averia && jornadaDe(estado.reloj.minutos) < lic.averia.hasta) return false;
    return otroCocheEnMarcha(estado, lic) || estado.dinero >= precioCoche(estado, true);
  }

  /* Sorteo de la avería definitiva al empezar un turno (sin azar si no hay riesgo). */
  function tocaRotura(estado, lic) {
    const p = probRotura(lic);
    return p > 0 && roturaPosible(estado, lic) && azar(estado) < p;
  }

  /* El coche va al desguace: la licencia se queda sin coche hasta comprar otro. */
  function aplicarRotura(estado, resumen, lic) {
    const chatarra = cfg().eventos.rotura.chatarra;
    const km = Math.floor(lic.km || 0);
    lic.vehiculo = null;
    lic.averia = null;
    TURNOS.forEach(function (t) {
      const x = lic.turnos[t];
      if (!x) return;
      if (x.quien === 'jugador') estado.jugador.carrera = null;
      else { x.carrera = null; x.pendiente = null; }
    });
    incidencia(estado, resumen, 'rotura', 'Avería definitiva: el taxi ' + textoLicencia(lic) + ' (' +
      km.toLocaleString('es-ES') + ' km) no tiene arreglo y va al desguace. Te dan ' + Libre.ui_euros(chatarra) +
      ' por la chatarra. Compra otro coche para esa licencia.', chatarra, 'extras');
  }

  /* Lo que te dan por el coche de una licencia si lo renuevas. */
  function valorVentaCoche(estado, lic) {
    const v = cfg().vehiculos.venta;
    const valor = precioCoche(estado, true, lic.vehiculo) * v.fraccion * (1 - (lic.km || 0) / v.kmSinValor);
    return Math.max(cfg().eventos.rotura.chatarra, Math.round(valor));
  }

  /*
   * Cómo está el coche de una licencia (solo lectura, para la interfaz):
   * { km, nivel: 'nuevo'|'rodado'|'gastado'|'limite', factorAveria,
   *   probRotura, venta, precioRenovar } o null si no tiene coche.
   */
  function estadoCoche(estado, lic) {
    if (!lic || !lic.vehiculo) return null;
    const v = cfg().vehiculos;
    if (lic.alquiler) {
      return { km: lic.km || 0, probRotura: 0, factorAveria: 1, venta: 0, precioRenovar: null,
        nivel: 'alquilado', quedan: jornadasAlquiler(estado, lic) };
    }
    const p = probRotura(lic);
    const km = lic.km || 0;
    const venta = valorVentaCoche(estado, lic);
    return {
      km, probRotura: p, factorAveria: factorAveriaKm(lic), venta,
      precioRenovar: Math.max(0, precioCoche(estado, true, lic.vehiculo) - venta),
      nivel: p >= v.probLimite ? 'limite' : p > 0 ? 'gastado' : km < v.kmNuevo ? 'nuevo' : 'rodado'
    };
  }

  /*
   * Renovar el coche de una licencia: compras uno nuevo (0 km) y vendes el
   * viejo por valorVentaCoche(). Solo con el día cerrado, como reorganizar
   * conductores. Si estaba en el taller, el nuevo sale sin avería.
   */
  function renovarCoche(estado, licenciaId) {
    const lic = buscarLicencia(estado, licenciaId);
    if (!lic) return fallo('Esa licencia no existe.');
    if (!lic.vehiculo) return fallo('Esa licencia no tiene coche: cómprale uno.');
    if (lic.alquiler) return fallo('Ese coche es de alquiler: no se renueva, se devuelve o se compra uno.');
    if (!enPausa(estado)) return fallo('Solo puedes renovar el coche con el día cerrado.');
    const venta = valorVentaCoche(estado, lic);
    const nuevo = precioCoche(estado, true, lic.vehiculo);
    const precio = Math.max(0, nuevo - venta);
    if (estado.dinero < precio) return fallo('No te llega el dinero.');
    estado.dinero -= precio;
    apuntarAhorro(estado, 'precioCoche', nuevo);
    lic.km = 0;
    lic.averia = null;
    return exito('Coche nuevo en la licencia ' + textoLicencia(lic) + '. Por el viejo te dan ' + Libre.ui_euros(venta) + '.');
  }

  /* Turnos con un evento pendiente (pinchazo, avería o avería definitiva) para esta hora. */
  function turnosConPendiente(estado) {
    const lista = [];
    estado.licencias.forEach(function (lic) {
      TURNOS.forEach(function (t) {
        const x = lic.turnos[t];
        if (x && x.pendiente) lista.push({ licencia: lic, turno: x });
      });
    });
    return lista;
  }

  function aplicarPendiente(estado, resumen, lic, turno) {
    const p = turno.pendiente;
    turno.pendiente = null;
    const ev = cfg().eventos;
    if (p.tipo === 'pinchazo') {
      const esConductor = turno.quien === 'conductor';
      if (conEfecto(turno, 'rueda')) {
        incidencia(estado, resumen, 'pinchazo', 'Pinchazo en el taxi de ' + turno.nombre +
          ': cambia la rueda de repuesto y sigue trabajando.', 0, null, turno);
        return;
      }
      const m = modificadores(estado);
      const coste = ev.pinchazo.coste * m.pinchazoCoste * (efectoCoche(lic).pinchazoCoste || 1);
      apuntarAhorro(estado, 'pinchazoCoste', coste);
      if (m.pinchazoHoras) {
        // Con la Grúa propia: un rato en el taller, no el resto del turno.
        pararUnRato(estado, turno, m.pinchazoHoras * 60, 'pinchazo');
        incidencia(estado, resumen, 'pinchazo', 'Pinchazo' + (esConductor ? ' en el taxi de ' + turno.nombre : '') +
          ': la grúa lo lleva al taller, neumático de ' + Libre.ui_euros(coste) + ' y ' +
          (m.pinchazoHoras === 1 ? 'una hora' : m.pinchazoHoras + ' horas') + ' parado.', -coste, 'otros', turno);
        return;
      }
      pararHastaFinDeTurno(estado, turno, 'pinchazo');
      incidencia(estado, resumen, 'pinchazo', 'Pinchazo' + (esConductor ? ' en el taxi de ' + turno.nombre : '') +
        ': neumático de ' + Libre.ui_euros(coste) + ' y ' + (esConductor ? 'no factura' : 'no facturas') +
        ' más hoy.', -coste, 'otros', turno);
    } else if (p.tipo === 'averia') {
      if (!averiaPosible(estado, lic)) return;
      aplicarAveria(estado, resumen, lic);
    } else if (p.tipo === 'rotura') {
      if (!roturaPosible(estado, lic)) return;
      aplicarRotura(estado, resumen, lic);
    } else if (p.tipo === 'pesetas' && turno.quien === 'jugador') {
      if (!trabajaIncognito(estado, lic, turno, estado.reloj.minutos)) return;
      // A ti no te multa de golpe: te vigila un rato (ver buscarCliente).
      const tu = ev.pesetas.tu;
      estado.jugador.vigilancia = { desde: estado.reloj.minutos, hasta: estado.reloj.minutos + tu.minutosVigila };
      resumen.eventos.push({ tipo: 'vigilancia', texto: 'Un pesetas te está mirando: si cargas en los próximos ' +
        Math.ceil(segundosVigilancia(estado)) + ' s, te multa.' });
    } else if (p.tipo === 'pesetas') {
      if (!trabajaIncognito(estado, lic, turno, estado.reloj.minutos)) return;
      const multa = ev.pesetas.multa;
      pararHastaFinDeTurno(estado, turno, 'pesetas');
      incidencia(estado, resumen, 'pesetas', 'Un pesetas ha pillado cargando a ' + turno.nombre +
        ' fuera de sus días de trabajo: te han puesto una multa de ' + Libre.ui_euros(multa) + '.', -multa, 'otros', turno);
    }
  }

  function aplicarAveria(estado, resumen, lic) {
    const ev = cfg().eventos.averia;
    const m = modificadores(estado);
    const jornadas = Math.max(1, Math.round(enteroEntre(estado, ev.jornadasMin, ev.jornadasMax) * m.averiaDias));
    const coste = entre(estado, ev.costeMin, ev.costeMax) * m.averiaCoste * (efectoCoche(lic).averiaCoste || 1);
    apuntarAhorro(estado, 'averiaCoste', coste);
    lic.averia = { hasta: jornadaDe(estado.reloj.minutos) + jornadas };
    TURNOS.forEach(function (t) {
      const x = lic.turnos[t];
      if (!x) return;
      if (x.quien === 'jugador') estado.jugador.carrera = null;
      else x.carrera = null;
    });
    incidencia(estado, resumen, 'averia', 'Avería en el taxi ' + textoLicencia(lic) + ': ' + jornadas +
      ' jornadas en el taller y ' + Libre.ui_euros(coste) + ' de reparación.', -coste, 'otros');
  }

  /*
   * Sacudir esterillas: al terminar un turno (a las 7:00 y a las 19:00), cada
   * conductor que ha trabajado encuentra unas monedas. Sin aviso, solo ticket.
   */
  function monedasFinDeTurno(estado, resumen) {
    const m = modificadores(estado);
    if (!m.monedasMax) return;
    const ahora = estado.reloj.minutos;
    const terminado = turnoDeHora(infoReloj(ahora - 1).hora);
    estado.licencias.forEach(function (lic) {
      const t = enTurno(lic, terminado);
      if (!lic.vehiculo || !t || t.quien !== 'conductor') return;
      if (!puedeTrabajar(estado, lic, Object.assign({}, t, { paradoHasta: 0 }), ahora - 1)) return;
      const monedas = entre(estado, m.monedasMin, m.monedasMax);
      apuntarGanado(estado, 'esterillas', monedas);
      incidencia(estado, resumen, 'esterillas', t.nombre + ' encuentra ' + Libre.ui_euros(monedas) +
        ' en las esterillas.', monedas, 'extras', t);
    });
  }

  /* Una vez por jornada se sortea si llueve, cuándo y cuánto. */
  function sortearLluvia(estado) {
    const jornada = jornadaDe(estado.reloj.minutos);
    if (estado.lluvia && estado.lluvia.jornada === jornada) return;
    const ev = cfg().eventos.lluvia;
    estado.lluvia = { jornada, desde: 0, hasta: 0, avisada: true };
    if (!toca(estado, 'lluvia', ev.probJornada)) return;
    const forzada = consumirForzado(estado, 'lluvia');
    const inicioJornada = jornada * MIN_DIA + cfg().reloj.minutoCierreCaja;
    const desde = forzada ? estado.reloj.minutos : entre(estado, Math.max(estado.reloj.minutos, inicioJornada), inicioJornada + MIN_DIA);
    // Chubasco o tormenta, por pesos; cada uno con su duración.
    const ids = Object.keys(ev.tipos);
    const total = ids.reduce(function (s, id) { return s + ev.tipos[id].peso; }, 0);
    let r = azar(estado) * total, tipo = ids[ids.length - 1];
    for (const id of ids) { if (r < ev.tipos[id].peso) { tipo = id; break; } r -= ev.tipos[id].peso; }
    const horas = forzada && forzada.arg ? Number(forzada.arg) : entre(estado, ev.tipos[tipo].horasMin, ev.tipos[tipo].horasMax);
    estado.lluvia = { jornada, desde, hasta: desde + horas * 60, avisada: false, tipo };
  }

  function avisarLluvia(estado, resumen) {
    const l = estado.lluvia;
    if (!l || l.avisada || estado.reloj.minutos < l.desde) return;
    l.avisada = true;
    const fin = infoReloj(l.hasta);
    const tormenta = l.tipo === 'tormenta';
    incidencia(estado, resumen, 'lluvia', (tormenta ? '¡Tormenta! Hasta las ' : 'Chubasco: hasta las ') +
      String(fin.hora).padStart(2, '0') + ':' + String(fin.minuto).padStart(2, '0') + ' hay el doble de clientes.', 0, null);
  }

  /*
   * Para probar desde la consola. Los eventos de carrera (propina, sinPagar,
   * objeto, vomito) se aplican en la próxima carrera que termine; lluvia,
   * pinchazo, baja y averia ocurren ya.
   */
  function forzarEvento(estado, tipo, arg) {
    const resumen = resumenVacio();
    const tipos = ['propina', 'sinPagar', 'objeto', 'vomito', 'hallazgo', 'lluvia', 'pinchazo', 'baja', 'averia', 'rotura', 'vigilancia'];
    if (tipos.indexOf(tipo) === -1) return { ok: false, mensaje: 'Eventos: ' + tipos.join(', '), eventos: [] };
    if (tipo === 'hallazgo') {
      estado.eventosForzados = (estado.eventosForzados || []).concat([{ tipo, arg: arg || null }]);
      return { ok: true, mensaje: 'Lo encontrará el próximo conductor que termine una carrera.', eventos: [] };
    }
    if (['propina', 'sinPagar', 'objeto', 'vomito'].indexOf(tipo) !== -1) {
      estado.eventosForzados = (estado.eventosForzados || []).concat([{ tipo, arg: arg || null }]);
      return { ok: true, mensaje: 'Pasará en la próxima carrera que termine.', eventos: [] };
    }
    if (tipo === 'lluvia') {
      estado.lluvia = null;
      estado.eventosForzados = (estado.eventosForzados || []).concat([{ tipo, arg: arg || null }]);
      sortearLluvia(estado);
      avisarLluvia(estado, resumen);
      return { ok: true, mensaje: '', eventos: resumen.eventos };
    }
    if (tipo === 'vigilancia') {
      // Un pesetas empieza a vigilarte ya (aunque no estés de incógnito).
      const u = ubicacionJugador(estado);
      if (!u) return { ok: false, mensaje: 'Ahora no conduces.', eventos: [] };
      const tu = cfg().eventos.pesetas.tu;
      estado.jugador.vigilancia = { desde: estado.reloj.minutos, hasta: estado.reloj.minutos + tu.minutosVigila };
      resumen.eventos.push({ tipo: 'vigilancia', texto: 'Un pesetas te está mirando: si cargas en los próximos ' +
        Math.ceil(segundosVigilancia(estado)) + ' s, te multa.' });
      return { ok: true, mensaje: '', eventos: resumen.eventos };
    }
    if (tipo === 'rotura') {
      // Avería definitiva: al coche que tú digas (id de licencia) o al primero que pueda.
      const lic = arg ? buscarLicencia(estado, arg) : estado.licencias.find(function (l) { return roturaPosible(estado, l); });
      if (!lic || !roturaPosible(estado, lic)) return { ok: false, mensaje: 'Ahora no hay coche que se pueda romper.', eventos: [] };
      aplicarRotura(estado, resumen, lic);
      return { ok: true, mensaje: '', eventos: resumen.eventos };
    }
    // Pinchazo, baja y avería: al primer conductor que pueda (o a ti, el pinchazo).
    const ahora = estado.reloj.minutos;
    const turnoActual = turnoDeHora(infoReloj(ahora).hora);
    let objetivo = null;
    estado.licencias.forEach(function (lic) {
      TURNOS.forEach(function (t) {
        const x = lic.turnos[t];
        if (objetivo || !x || !lic.vehiculo) return;
        if (x.quien === 'jugador' && tipo !== 'pinchazo') return;
        if (tipo === 'averia' && !averiaPosible(estado, lic)) return;
        if (t === turnoActual || tipo !== 'pinchazo') objetivo = { licencia: lic, turno: x };
      });
    });
    if (!objetivo) return { ok: false, mensaje: 'Ahora no hay a quién aplicarle ese evento.', eventos: [] };
    if (tipo === 'baja') {
      const jornadas = arg ? Number(arg) : 2;
      objetivo.turno.baja = { hasta: jornadaDe(ahora) + jornadas };
      objetivo.turno.carrera = null;
      incidencia(estado, resumen, 'baja', objetivo.turno.nombre + ' está de baja por enfermedad: ' + jornadas +
        (jornadas === 1 ? ' jornada' : ' jornadas') + ' sin trabajar.', 0, null, objetivo.turno);
    } else if (tipo === 'averia') {
      aplicarAveria(estado, resumen, objetivo.licencia);
    } else {
      objetivo.turno.pendiente = { tipo: 'pinchazo', minuto: ahora };
      aplicarPendiente(estado, resumen, objetivo.licencia, objetivo.turno);
    }
    return { ok: true, mensaje: '', eventos: resumen.eventos };
  }

  /* Todas las carreras de conductores en curso (para buscar el siguiente fin). */
  function turnosConCarrera(estado) {
    const lista = [];
    estado.licencias.forEach(function (lic) {
      TURNOS.forEach(function (t) {
        const x = lic.turnos[t];
        if (x && x.quien === 'conductor' && x.carrera) lista.push(x);
      });
    });
    return lista;
  }

  // ---------------------------------------------------------------- Avanzar

  function resumenVacio() {
    return {
      minutos: 0, carreras: 0, ingresos: 0,
      combustible: 0, conductores: 0, fijos: 0,
      cierres: [], eventos: []
    };
  }

  /*
   * Avanza el estado `segundos` reales. Es la única función que mueve el
   * tiempo: la usan el bucle del juego y saltarAlCierre(). Desde el
   * 22-11-2026 (Iván) no hay progreso sin conexión: solo corre con el juego
   * abierto.
   * Trocea el avance en horas enteras para que la tarifa y la demanda sean
   * constantes en cada trozo. Devuelve un resumen de lo ocurrido.
   *
   * Pausa: con un cierre pendiente no pasa nada. Al cerrar la caja, si el
   * ajuste pararAlCierre está activo, deja el cierre pendiente y se para (el
   * resto del tiempo se descarta).
   *
   * Conductores: hacen carreras reales y cobran al terminar cada una.
   */
  function avanzar(estado, segundos) {
    const resumen = resumenVacio();
    if (enPausa(estado) || !(segundos > 0)) return resumen;
    // Mientras lees la introducción, el reloj no corre.
    if (estado.historia && !estado.historia.introVista) return resumen;
    // Ni mientras decides un evento de clientes.
    if (eventoPendiente(estado)) return resumen;
    const eventos = cfgEventos().activos ? estadoEventos(estado) : null;
    if (eventos && eventos.proximo === null) programarEvento(estado);
    const pararse = estado.ajustes.pararAlCierre;
    let restante = segundos * MIN_DIA / segundosPorDia(estado);
    resumen.minutos = restante;

    while (restante > 1e-9) {
      const ahora = estado.reloj.minutos;
      sortearLluvia(estado);
      empezarCarrerasConductores(estado, resumen);
      let limite = (Math.floor(ahora / 60) + 1) * 60;
      const carrera = estado.jugador.carrera;
      if (carrera && carrera.fin > ahora && carrera.fin < limite) limite = carrera.fin;
      const enCurso = turnosConCarrera(estado);
      enCurso.forEach(function (t) {
        if (t.carrera.fin > ahora && t.carrera.fin < limite) limite = t.carrera.fin;
      });
      const pendientes = turnosConPendiente(estado);
      pendientes.forEach(function (x) {
        if (x.turno.pendiente.minuto > ahora && x.turno.pendiente.minuto < limite) limite = x.turno.pendiente.minuto;
      });
      if (estado.lluvia && !estado.lluvia.avisada &&
          estado.lluvia.desde > ahora && estado.lluvia.desde < limite) limite = estado.lluvia.desde;
      // Al escampar, los que estaban parados por la lluvia (Azucarillo) vuelven ya.
      if (estado.lluvia && estado.lluvia.hasta > ahora && estado.lluvia.hasta < limite) limite = estado.lluvia.hasta;
      if (eventos && eventos.proximo > ahora && eventos.proximo < limite) limite = eventos.proximo;

      const llega = restante >= limite - ahora;
      const paso = llega ? limite - ahora : restante;
      estado.reloj.minutos = llega ? limite : ahora + paso;
      restante -= paso;

      if (carrera && estado.reloj.minutos >= carrera.fin) terminarCarrera(estado, resumen);
      enCurso.forEach(function (t) {
        if (t.carrera && estado.reloj.minutos >= t.carrera.fin) terminarCarreraConductor(estado, resumen, t);
      });
      pendientes.forEach(function (x) {
        if (x.turno.pendiente && estado.reloj.minutos >= x.turno.pendiente.minuto) {
          aplicarPendiente(estado, resumen, x.licencia, x.turno);
        }
      });
      avisarLluvia(estado, resumen);
      if (llega && limite % 60 === 0) {
        const h = (limite % MIN_DIA) / 60;
        if (h === cfg().turnos.dia.horaInicio || h === cfg().turnos.dia.horaFin) monedasFinDeTurno(estado, resumen);
      }
      if (llega && limite % MIN_DIA === cfg().reloj.minutoCierreCaja) {
        cerrarCaja(estado, resumen);
        if (pararse) {
          estado.cierrePendiente = sumarCierres([estado.caja.ayer]);
          break;
        }
      }
      // Un evento de clientes: el juego se para hasta que decides.
      if (eventos && !eventos.pendiente && estado.reloj.minutos >= eventos.proximo) {
        dispararEvento(estado, resumen);
        if (eventos.pendiente) break;
      }
    }
    return resumen;
  }

  /*
   * ¿Puedes saltar al cierre? Solo el día que libra tu licencia (o si tu
   * coche está en el taller o se rompió: motivoSinCoche()), si ningún
   * taxi de la flota puede trabajar en esa jornada (por libranza, baja o
   * avería) y no tienes otra licencia a la que pasarte: con coche, que no
   * libre y con un turno libre, y con la «Oficina de gestión» para dejar el
   * tuyo (sin ella no puedes cambiar de licencia).
   */
  function puedeSaltarDia(estado) {
    if (enPausa(estado) || estado.jugador.carrera) return false;
    const u = ubicacionJugador(estado);
    if (!u) return false;
    const ahora = estado.reloj.minutos;
    const suya = buscarLicencia(estado, u.licenciaId);
    const librasDeVerdad = libra(estado, suya, ahora) && !trabajaIncognito(estado, suya, u.datos, ahora);
    if (!librasDeVerdad && !motivoSinCoche(estado, suya)) return false;
    if (turnosConCarrera(estado).length > 0) return false;
    const alguienTrabaja = estado.licencias.some(function (lic) {
      return lic.vehiculo && TURNOS.some(function (t) {
        const x = lic.turnos[t];
        return x && x.quien === 'conductor' && puedeTrabajar(estado, lic, Object.assign({}, x, { paradoHasta: 0 }), ahora);
      });
    });
    if (alguienTrabaja) return false;
    if (!modificadores(estado).dejarVolante) return true;
    return !estado.licencias.some(function (lic) {
      return lic !== suya && lic.vehiculo && !libra(estado, lic, ahora) &&
        TURNOS.some(function (t) { return !lic.turnos[t]; });
    });
  }

  /* Por qué tu licencia no puede trabajar por el coche: 'sinCoche', 'taller' o null. */
  function motivoSinCoche(estado, lic) {
    if (!lic) return null;
    if (!lic.vehiculo) return 'sinCoche';
    if (lic.averia && jornadaDe(estado.reloj.minutos) < lic.averia.hasta) return 'taller';
    return null;
  }

  /*
   * Saltar al cierre: el reloj corre de golpe hasta las 7:00 con la misma
   * avanzar() (cuesta lo mismo que dejarlo correr: costes fijos y lluvia
   * incluidos). Con pausa al cierre queda el ticket de ese día.
   */
  function saltarAlCierre(estado) {
    if (!puedeSaltarDia(estado)) return fallo('Hoy no puedes saltar al cierre.');
    let minutos = (cfg().reloj.minutoCierreCaja - estado.reloj.minutos % MIN_DIA + MIN_DIA) % MIN_DIA;
    if (minutos === 0) minutos = MIN_DIA;
    // Una millonésima de más asegura cruzar el cierre pese al redondeo.
    avanzar(estado, minutos * segundosPorDia(estado) / MIN_DIA + 1e-6);
    return exito();
  }

  Libre.sim = {
    mediasDiarias,
    clasificacionConductores,
    MIN_DIA,
    crearEstadoInicial,
    infoReloj,
    segundosPorDia,
    factorJornada,
    modificadores,
    comprarMejora,
    nivelMejora,
    siguienteNivel,
    zonaDesbloqueada,
    zonasDisponibles,
    precioTaximetro,
    precioTarifa3,
    viajeMedio,
    netoCaja,
    costePorKm,
    factoresCansancio,
    costesFijosDiarios,
    porcentajeConductor,
    demandaZona,
    factorDeJornada,
    turnoDeHora,
    turnoDelJugador,
    jugadorEnTurno,
    conduce,
    hayConductores,
    dejarDeConducir,
    conducir,
    ubicacionJugador,
    cochesPorZona,
    rendimientoZona,
    elegirZona,
    precioLicencia,
    comprasPosibles,
    comprasParaObjetivo,
    objetivoCompra,
    textoLicencia,
    buscarLicencia,
    buscarMejora,
    letraLicencia,
    libra,
    placasEnVenta,
    sortearNumeroLicencia,
    comprarLicencia,
    comprarVehiculo,
    precioCoche,
    cuentaDeMejora,
    energia,
    rachaActual,
    modificadoresPersonaje,
    nivelMejoraPersonaje,
    faltaParaMejoraPersonaje,
    costeMejoraPersonaje,
    aplicarArranque,
    buscarUnico,
    unicoDe,
    unicoEnFlota,
    ofrecerUnico,
    faltaParaTurnoUnico,
    bonoTocayos,
    factorImporteUnico,
    enTurno,
    eventoPendiente,
    buscarEventoCliente,
    elegirOpcionEvento,
    cerrarEventoCliente,
    forzarEventoCliente,
    programarEvento,
    cambiarAspecto,
    renombrarPersonaje,
    nombrePersonaje,
    aspectoPersonaje,
    gamasDisponibles,
    modeloCoche,
    efectoCoche,
    puntosPrestigio,
    puntosDeNivel,
    faltaParaReiniciar,
    probarComprasPersonaje,
    empezarDeCero,
    nivelPersonaje,
    experienciaParaNivel,
    ganarExperienciaPersonaje,
    segundosVentana,
    minutosDescanso,
    precioRebuscar,
    rebuscarCandidatos,
    faltaParaMejora,
    ganadoMejora,
    precioAlquiler,
    cochesPropios,
    cambiarTurnoJugador,
    contratarConductor,
    despedirConductor,
    contratarAReserva,
    moverConductor,
    todosLosConductores,
    costeDespido,
    buscarCliente,
    importeEnCurso,
    importeDeCarrera,
    enPausa,
    arrancarDia,
    terminarIntro,
    puedeSaltarDia,
    kmCocheUsado,
    factorAveriaKm,
    probRotura,
    roturaPosible,
    valorVentaCoche,
    estadoCoche,
    renovarCoche,
    montarSociedad,
    renombrarSociedad,
    necesitaSociedad,
    costeSociedadDiario,
    alquilarCoche,
    trabajaIncognito,
    vigilanciaActiva,
    segundosVigilancia,
    jornadasAlquiler,
    motivoSinCoche,
    statsConductor,
    aportesConductor,
    conEfecto,
    probSubir,
    hallazgo,
    saltarAlCierre,
    cambiarAjuste,
    sumarCierres,
    azar,
    jornadaDe,
    probVomito,
    puedeTrabajar,
    lloviendo,
    forzarEvento,
    buscarRasgo,
    sortearRasgos,
    sortearCandidatos,
    candidatos,
    precioCandidato,
    factoresConductor,
    nivelConductor,
    cualidadesDe,
    defectosDe,
    premioNivelMaximo,
    buscarObjeto,
    huecosConductor,
    buscarCategoria,
    sortearCategoria,
    pesosCandidatos,
    objetosEnAlmacen,
    capacidadAlmacen,
    venderObjeto,
    categoriaSiguiente,
    objetosParaCombinar,
    combinarObjetos,
    valorAlmacen,
    cuantosParaCombinar,
    equiparObjeto,
    quitarObjeto,
    progresoConductor,
    darExperiencia,
    topeConductor,
    topesDe,
    aperturaTopes,
    avanzar,
  };
})(globalThis);
