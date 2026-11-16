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
      combustible: 0, conductores: 0, fijos: 0, otros: 0, incidencias: {}
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
          turnos: {
            dia: { quien: 'jugador', nombre: 'Tú', zona: c.zonaInicial },
            noche: null
          }
        }
      ],
      // Tu turno siempre es a clic. zona recuerda dónde trabajabas para cuando
      // vuelvas a conducir tras dejarlo.
      jugador: { carrera: null, ultimaCarrera: null, zona: c.zonaInicial },
      conductoresContratados: 0,
      mejoras: {},
      // Consumibles de toda la flota (se desbloquean con mejoras).
      inventario: { ruedas: 0, bolsas: 0 },
      caja: { hoy: cajaVacia(0), ayer: null },
      totales: { carreras: 0, ingresos: 0 },
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
    estado.licencias[0].numero = sortearNumeroLicencia(estado, rng);
    // Los tres candidatos que verás al contratar.
    sortearCandidatos(estado);
    return estado;
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

  /* Texto de la licencia: número y letra de libranza, p. ej. "15288-L". */
  function textoLicencia(licencia) {
    const letra = cfg().licencias.letraPorCifra[licencia.numero % 10];
    return licencia.numero + '-' + letra;
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
      segundosDia: 0, consumo: 1, busqueda: 1, cola: 1, demanda: 1, seguro: 1,
      cuotaEmisora: false, dejarVolante: false, gestionZonas: false,
      propinaProb: 0, propinaImporte: 1, sinImpagos: false, averiaDias: 1, averiaCoste: 1,
      monedasMin: 0, monedasMax: 0
    };
    cfg().mejoras.forEach(function (mejora) {
      const nivel = nivelMejora(estado, mejora.id);
      if (!nivel) return;
      const e = mejora.niveles ? mejora.niveles[nivel - 1].efecto : mejora.efecto;
      if (e.soloZona && e.soloZona !== zonaId) return;
      if (e.segundosDia) m.segundosDia += e.segundosDia;
      if (e.consumo) m.consumo *= e.consumo;
      if (e.busqueda) m.busqueda *= e.busqueda;
      if (e.cola) m.cola *= e.cola;
      if (e.demanda) m.demanda *= e.demanda;
      if (e.seguro) m.seguro *= e.seguro;
      if (e.cuotaEmisora) m.cuotaEmisora = true;
      if (e.dejarVolante) m.dejarVolante = true;
      if (e.propinaProb) m.propinaProb += e.propinaProb;
      if (e.propinaImporte) m.propinaImporte *= e.propinaImporte;
      if (e.sinImpagos) m.sinImpagos = true;
      if (e.averiaDias) m.averiaDias *= e.averiaDias;
      if (e.averiaCoste) m.averiaCoste *= e.averiaCoste;
      if (e.monedasMax) { m.monedasMin = e.monedasMin; m.monedasMax = e.monedasMax; }
      if (e.gestionZonas) m.gestionZonas = true;
    });
    return m;
  }

  /* Nivel comprado de una mejora: 0 si no la tienes (las de un nivel valen 1). */
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
    if (mejora.requiere && !nivelMejora(estado, mejora.requiere)) {
      return fallo('Antes necesitas: ' + buscarMejora(mejora.requiere).nombre + '.');
    }
    if (estado.dinero < siguiente.precio) return fallo('No te llega el dinero.');
    estado.dinero -= siguiente.precio;
    estado.mejoras[id] = siguiente.nivel;
    return exito(mejora.nombre + (mejora.niveles ? ' nivel ' + siguiente.nivel : '') + ': hecho.');
  }

  /* ¿Está desbloqueado ese consumible del inventario? */
  function inventarioAbierto(estado, tipo) {
    const item = cfg().inventario[tipo];
    return !!item && nivelMejora(estado, item.mejora) > 0;
  }

  /* Compra unidades de un consumible, hasta llenar el almacén. */
  function comprarInventario(estado, tipo, cantidad) {
    const item = cfg().inventario[tipo];
    if (!item) return fallo('Ese consumible no existe.');
    if (!inventarioAbierto(estado, tipo)) return fallo('Antes necesitas la mejora «' + buscarMejora(item.mejora).nombre + '».');
    const hay = estado.inventario[tipo] || 0;
    const n = Math.min(Number(cantidad) || 1, item.maximo - hay);
    if (n <= 0) return fallo('El almacén de ' + item.nombre.toLowerCase() + ' está lleno.');
    if (estado.dinero < n * item.precio) return fallo('No te llega el dinero.');
    estado.dinero -= n * item.precio;
    estado.inventario[tipo] = hay + n;
    return exito('+' + n + ' ' + item.nombre.toLowerCase() + ' (' + estado.inventario[tipo] + ' en el almacén).');
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
   * siempre da lo mismo para el mismo día, así el progreso sin conexión
   * coincide con jugar.
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

  /* Euros de combustible por km recorrido con un modelo de coche. */
  function costePorKm(estado, modeloId) {
    const c = cfg();
    const modelo = c.vehiculos.modelos[modeloId || c.vehiculos.modeloInicial];
    return modelo.consumoLitros100Km / 100 * c.combustible.precioLitro * modificadores(estado).consumo;
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
    return f.autonomoDiario + vehiculosEnServicio(estado) * porVehiculo;
  }

  function gastar(estado, resumen, concepto, importe) {
    estado.dinero -= importe;
    estado.caja.hoy[concepto] += importe;
    resumen[concepto] += importe;
  }

  /* Cierra la caja del día: cobra los costes fijos y empieza un día nuevo. */
  function cerrarCaja(estado, resumen) {
    gastar(estado, resumen, 'fijos', costesFijosDiarios(estado));
    const cerrada = estado.caja.hoy;
    estado.caja.ayer = cerrada;
    estado.caja.hoy = cajaVacia(cerrada.dia + 1);
    estado.licencias.forEach(function (l) { l.facturadoJornada = 0; });
    resumen.cierres.push(cerrada);
  }

  // --------------------------------------------------- Pausa al cierre

  const CAMPOS_CAJA = ['carreras', 'km', 'ingresos', 'extras', 'combustible', 'conductores', 'fijos', 'otros'];

  /* Suma varias cajas cerradas en un solo ticket { desdeDia, hastaDia, ... }. */
  function sumarCierres(cajas) {
    const ticket = { desdeDia: cajas[0].dia, hastaDia: cajas[cajas.length - 1].dia, incidencias: {} };
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

  function comprarLicencia(estado, rng) {
    const c = cfg();
    if (estado.licencias.length >= c.licencias.maximo) return fallo('No quedan licencias en Madrid.');
    const precio = precioLicencia(estado);
    if (estado.dinero < precio) return fallo('No te llega el dinero.');
    estado.dinero -= precio;
    const id = estado.licencias.reduce(function (m, l) { return Math.max(m, l.id); }, 0) + 1;
    const licencia = { id, numero: sortearNumeroLicencia(estado, rng), vehiculo: null, turnos: { dia: null, noche: null } };
    estado.licencias.push(licencia);
    return exito('Licencia ' + textoLicencia(licencia) + ' comprada. Ahora necesita un coche.');
  }

  function comprarVehiculo(estado, licenciaId) {
    const c = cfg();
    const lic = buscarLicencia(estado, licenciaId);
    if (!lic) return fallo('Esa licencia no existe.');
    if (lic.vehiculo) return fallo('Esa licencia ya tiene coche.');
    const modelo = c.vehiculos.modelos[c.vehiculos.modeloInicial];
    if (estado.dinero < modelo.precio) return fallo('No te llega el dinero.');
    estado.dinero -= modelo.precio;
    lic.vehiculo = c.vehiculos.modeloInicial;
    return exito(modelo.nombre + ' listo en la licencia ' + textoLicencia(lic) + '. Contrata conductores para sus turnos.');
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
    const precio = c.conductores.costeContratacion;
    if (estado.dinero < precio) return fallo('No te llega el dinero.');
    const candidato = candidatos(estado)[Number(indice) || 0];
    if (!candidato) return fallo('Ese candidato no existe.');

    const otro = lic.turnos[turno === 'dia' ? 'noche' : 'dia'];
    const nombre = candidato.nombre;
    const primero = !hayConductores(estado);
    estado.dinero -= precio;
    estado.conductoresContratados++;
    lic.turnos[turno] = {
      quien: 'conductor', nombre, retrato: candidato.retrato, zona: otro ? otro.zona : c.zonaInicial,
      cualidad: candidato.cualidad, defecto: candidato.defecto
    };
    sortearCandidatos(estado);

    if (primero) {
      return exito(nombre + ' se encarga del turno de ' + c.turnos[turno].nombre.toLowerCase() +
        ': ahora tu taxi también trabaja cuando tú no conduces.');
    }
    return exito(nombre + ' empieza en el turno de ' + c.turnos[turno].nombre.toLowerCase() + '.');
  }

  /*
   * Personaje (índice en config.conductores.personajes) para un conductor
   * nuevo: al azar entre los que no trabajan ya para ti; si están todos, entre
   * todos. Se guarda con el conductor, así no cambia al recargar.
   */
  function sortearPersonaje(estado, apartados) {
    const total = cfg().conductores.personajes.length;
    const usados = Object.assign({}, apartados);
    estado.licencias.forEach(function (l) {
      TURNOS.forEach(function (t) {
        const x = l.turnos[t];
        if (x && x.quien === 'conductor' && x.retrato !== undefined) usados[x.retrato] = true;
      });
    });
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

  /* Una cualidad y un defecto al azar que no sean opuestos (sin las cualidades `evitar`). */
  function sortearRasgos(estado, evitar) {
    const c = cfg().conductores;
    const posibles = c.cualidades.filter(function (q) { return !(evitar && evitar[q.id]); });
    const cualidad = posibles[Math.floor(azar(estado) * posibles.length)];
    const defectos = c.defectos.filter(function (d) { return d.id !== cualidad.opuesto; });
    const defecto = defectos[Math.floor(azar(estado) * defectos.length)];
    return { cualidad: cualidad.id, defecto: defecto.id };
  }

  /* Candidatos para el próximo contrato: personajes y cualidades distintos. */
  function sortearCandidatos(estado) {
    const c = cfg().conductores;
    const apartados = {}, cualidades = {};
    estado.candidatos = [];
    for (let i = 0; i < c.candidatos; i++) {
      const retrato = sortearPersonaje(estado, apartados);
      apartados[retrato] = true;
      const r = sortearRasgos(estado, cualidades);
      cualidades[r.cualidad] = true;
      estado.candidatos.push({ retrato, nombre: c.personajes[retrato].nombre, cualidad: r.cualidad, defecto: r.defecto });
    }
    return estado.candidatos;
  }

  function candidatos(estado) {
    return estado.candidatos && estado.candidatos.length ? estado.candidatos : sortearCandidatos(estado);
  }

  const VALORES_CONDUCTOR = ['espera', 'propina', 'sinPagar', 'objeto', 'baja', 'pinchazo', 'averia', 'limpieza'];

  /*
   * Factores de un conductor sobre cada valor (1 = sin efecto): producto de
   * su cualidad y su defecto. Lo que depende del turno (esperaDia,
   * esperaNoche) mira el turno de la hora actual, que es el suyo mientras
   * trabaja. Para tu turno, todo 1. Sin tope: lo pone topeConductor().
   */
  function factoresConductor(estado, t) {
    const f = {};
    VALORES_CONDUCTOR.forEach(function (k) { f[k] = 1; });
    if (!t || t.quien !== 'conductor') return f;
    const turno = turnoDeHora(infoReloj(estado.reloj.minutos).hora);
    function aplicar(efecto) {
      Object.keys(efecto || {}).forEach(function (k) {
        if (k === 'esperaDia') { if (turno === 'dia') f.espera *= efecto[k]; }
        else if (k === 'esperaNoche') { if (turno === 'noche') f.espera *= efecto[k]; }
        else if (f[k] !== undefined) f[k] *= efecto[k];
      });
    }
    [t.cualidad, t.defecto].forEach(function (id) { const r = buscarRasgo(id); if (r) aplicar(r.efecto); });
    return f;
  }

  /* El factor recortado a los topes de la config: nada llega a cero ni se dispara. */
  function topeConductor(valor, factor) {
    const t = cfg().conductores.topes[valor];
    return Math.min(t[1], Math.max(t[0], factor));
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

  function despedirConductor(estado, licenciaId, turno) {
    const lic = buscarLicencia(estado, licenciaId);
    const t = lic && lic.turnos[turno];
    if (!t || t.quien !== 'conductor') return fallo('Ahí no hay ningún conductor.');
    // Si estaba en una carrera, se pierde: se va con el cliente.
    lic.turnos[turno] = null;
    return exito(t.nombre + ' ya no trabaja para ti.');
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
      const t = lic.turnos[turnoActual];
      if (lic.vehiculo && t && t.quien === 'conductor' && puedeTrabajar(estado, lic, t, ahora)) conductores.push({ lic, t });
    });
    if (modificadores(estado).gestionZonas) {
      const cuenta = {};
      const parte = 1 - cfg().conductores.porcentaje;
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
    const fe = factorEspera || 1;

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
      combustible: (km + kmVacio) * costePorKm(estado, vehiculo)
    };
  }

  /*
   * El jugador sale a buscar cliente en su zona. La espera depende de la
   * demanda: con poca demanda tardas más en encontrar a alguien.
   */
  function buscarCliente(estado, rng) {
    const rnd = rng || Math.random;
    const c = cfg();
    if (!conduce(estado)) return fallo('Ahora no conduces. Elige un turno libre en Flota.');
    if (enPausa(estado)) return fallo('El día está cerrado. Arranca el día siguiente.');
    if (estado.jugador.carrera) return fallo('Ya estás en una carrera.');
    if (estado.jugador.paradoHasta > estado.reloj.minutos) {
      const vuelta = infoReloj(estado.jugador.paradoHasta);
      return fallo('Estás parado hasta las ' + String(vuelta.hora).padStart(2, '0') + ':' +
        String(vuelta.minuto).padStart(2, '0') + '.');
    }
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

    // Con mucha demanda esperas lo normal; con poca, hasta que aparece alguien.
    const porCoche = Math.min(demanda, 60 / minutosPorCarrera(estado, turno.zona, info.tarifa));
    const lic = buscarLicencia(estado, ubicacionJugador(estado).licenciaId);
    estado.jugador.carrera = planearCarrera(estado, turno.zona, lic.vehiculo, porCoche, rnd, 'media');
    return exito();
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
    gastar(estado, resumen, 'combustible', carrera.combustible);
    estado.caja.hoy.km += carrera.km + (carrera.kmVacio || 0);
    const antes = estado.totales.ingresos;
    eventosDeCarrera(estado, resumen, carrera, { quien: 'jugador', nombre: 'Tú' });
    const u = ubicacionJugador(estado);
    if (u) sumarFacturado(buscarLicencia(estado, u.licenciaId), estado.totales.ingresos - antes);
  }

  /* Lo que lleva facturado cada taxi en la jornada (para la lista de taxis). */
  function sumarFacturado(lic, importe) {
    if (lic && importe > 0) lic.facturadoJornada = (lic.facturadoJornada || 0) + importe;
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
      const t = lic.turnos[turnoActual];
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
        const fe = topeConductor('espera', factoresConductor(estado, x.turno).espera);
        const carrera = planearCarrera(estado, zonaId, x.licencia.vehiculo, porCoche, rnd, 'azar', fe);
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
      importe: 0, km: 0, kmVacio, combustible: kmVacio * costePorKm(estado, vehiculo)
    };
  }

  /* Cobra (o solo gasta, si fue un rato en vacío) la carrera de un conductor. */
  function terminarCarreraConductor(estado, resumen, turno) {
    const carrera = turno.carrera;
    turno.carrera = null;
    gastar(estado, resumen, 'combustible', carrera.combustible);
    estado.caja.hoy.km += carrera.km + carrera.kmVacio;
    if (carrera.vacio) return;
    const antes = estado.totales.ingresos;
    eventosDeCarrera(estado, resumen, carrera, turno);
    sumarFacturado(estado.licencias.find(function (l) { return l.turnos.dia === turno || l.turnos.noche === turno; }),
      estado.totales.ingresos - antes);
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
    const baseProp = ev.propina.probCarrera;
    const probPropina = baseProp * topeConductor('propina', (baseProp + m.propinaProb) / baseProp * f.propina);
    if (!m.sinImpagos && toca(estado, 'sinPagar', ev.sinPagar.probCarrera * topeConductor('sinPagar', f.sinPagar))) {
      consumirForzado(estado, 'sinPagar');
      incidencia(estado, resumen, 'sinPagar',
        (esConductor ? 'A ' + sujeto + ' se le' : 'Se te') + ' va un cliente sin pagar: ' +
        Libre.ui_euros(carrera.importe) + ' perdidos.', -carrera.importe, null, quien);
      return;
    }
    cobrar(estado, resumen, carrera.importe, 1);
    if (esConductor) gastar(estado, resumen, 'conductores', carrera.importe * cfg().conductores.porcentaje);

    if (toca(estado, 'propina', probPropina)) {
      consumirForzado(estado, 'propina');
      const propina = carrera.importe * entre(estado, ev.propina.porcentajeMin, ev.propina.porcentajeMax) * m.propinaImporte;
      incidencia(estado, resumen, 'propina', 'Propina de ' + Libre.ui_euros(propina) + '.', propina, 'extras', quien);
    }

    if (toca(estado, 'objeto', ev.objeto.probCarrera * topeConductor('objeto', f.objeto))) {
      const forzado = consumirForzado(estado, 'objeto');
      const objeto = forzado && forzado.arg ? ev.objeto.objetos[Number(forzado.arg) - 1] : elegirObjeto(estado);
      incidencia(estado, resumen, 'objeto',
        (esConductor ? sujeto + ' devuelve ' : 'Devuelves ') + objeto.nombre +
        ' olvidado en el taxi: el cliente ' + (esConductor ? 'le' : 'te') + ' da ' +
        Libre.ui_euros(objeto.recompensa) + ' de recompensa.', objeto.recompensa, 'extras', quien);
    }

    if (toca(estado, 'vomito', probVomito(estado, carrera))) {
      consumirForzado(estado, 'vomito');
      if (estado.inventario.bolsas > 0) {
        // Con una bolsa a mano no pasa nada: se gasta y sale en el ticket.
        estado.inventario.bolsas--;
        incidencia(estado, resumen, 'bolsa', 'Un cliente se marea, pero había bolsa: el coche queda limpio.', 0, null, quien);
        return;
      }
      const limpieza = topeConductor('limpieza', f.limpieza);
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

  /* ¿Puede trabajar ese turno ahora? No con baja, avería o jornada terminada. */
  function puedeTrabajar(estado, lic, turno, minutos) {
    const jornada = jornadaDe(minutos);
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
      const t = lic.turnos[turnoActual];
      if (!lic.vehiculo || !t || t.sorteado === clave) return;
      t.sorteado = clave;
      if (t.quien === 'jugador') {
        if (azar(estado) < ev.pinchazo.probTurno) t.pendiente = { tipo: 'pinchazo', minuto: entre(estado, ahora, fin) };
        return;
      }
      if (!puedeTrabajar(estado, lic, t, ahora)) return;
      const f = factoresConductor(estado, t);
      if (azar(estado) < ev.baja.probTurno * topeConductor('baja', f.baja)) {
        const jornadas = enteroEntre(estado, ev.baja.jornadasMin, ev.baja.jornadasMax);
        t.baja = { hasta: jornada + jornadas };
        incidencia(estado, resumen, 'baja', t.nombre + ' está de baja por enfermedad: ' + jornadas +
          (jornadas === 1 ? ' jornada' : ' jornadas') + ' sin trabajar.', 0, null, t);
        return;
      }
      if (azar(estado) < ev.pinchazo.probTurno * topeConductor('pinchazo', f.pinchazo)) {
        t.pendiente = { tipo: 'pinchazo', minuto: entre(estado, ahora, fin) };
      } else if (averiaPosible(estado, lic) && azar(estado) < ev.averia.probTurno * topeConductor('averia', f.averia)) {
        t.pendiente = { tipo: 'averia', minuto: entre(estado, ahora, fin) };
      }
    });
  }

  /*
   * Solo hay averías con 2 coches o más, nunca en el coche que conduces tú y
   * nunca si dejaría la flota sin ningún coche en marcha.
   */
  function averiaPosible(estado, lic) {
    const jornada = jornadaDe(estado.reloj.minutos);
    const conCoche = estado.licencias.filter(function (l) { return !!l.vehiculo; });
    if (conCoche.length < cfg().eventos.averia.cochesMinimos) return false;
    if (TURNOS.some(function (t) { return lic.turnos[t] && lic.turnos[t].quien === 'jugador'; })) return false;
    if (lic.averia && jornada < lic.averia.hasta) return false;
    const enMarcha = conCoche.filter(function (l) { return l !== lic && !(l.averia && jornada < l.averia.hasta); });
    return enMarcha.length > 0;
  }

  /* Turnos con un evento pendiente (pinchazo o avería) para esta hora. */
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
      if (estado.inventario.ruedas > 0) {
        estado.inventario.ruedas--;
        incidencia(estado, resumen, 'pinchazo', 'Pinchazo' + (esConductor ? ' en el taxi de ' + turno.nombre : '') +
          ': se cambia la rueda de repuesto y ' + (esConductor ? 'sigue' : 'sigues') + ' trabajando (quedan ' +
          estado.inventario.ruedas + ').', 0, null, turno);
        return;
      }
      pararHastaFinDeTurno(estado, turno, 'pinchazo');
      incidencia(estado, resumen, 'pinchazo', 'Pinchazo' + (esConductor ? ' en el taxi de ' + turno.nombre : '') +
        ': neumático de ' + Libre.ui_euros(ev.pinchazo.coste) + ' y ' + (esConductor ? 'no factura' : 'no facturas') +
        ' más hoy.', -ev.pinchazo.coste, 'otros', turno);
    } else if (p.tipo === 'averia') {
      if (!averiaPosible(estado, lic)) return;
      aplicarAveria(estado, resumen, lic);
    }
  }

  function aplicarAveria(estado, resumen, lic) {
    const ev = cfg().eventos.averia;
    const m = modificadores(estado);
    const jornadas = Math.max(1, Math.round(enteroEntre(estado, ev.jornadasMin, ev.jornadasMax) * m.averiaDias));
    const coste = entre(estado, ev.costeMin, ev.costeMax) * m.averiaCoste;
    lic.averia = { hasta: jornadaDe(estado.reloj.minutos) + jornadas };
    TURNOS.forEach(function (t) { if (lic.turnos[t]) lic.turnos[t].carrera = null; });
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
      const t = lic.turnos[terminado];
      if (!lic.vehiculo || !t || t.quien !== 'conductor') return;
      if (!puedeTrabajar(estado, lic, Object.assign({}, t, { paradoHasta: 0 }), ahora - 1)) return;
      const monedas = entre(estado, m.monedasMin, m.monedasMax);
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
    const horas = forzada && forzada.arg ? Number(forzada.arg) : entre(estado, ev.horasMin, ev.horasMax);
    estado.lluvia = { jornada, desde, hasta: desde + horas * 60, avisada: false };
  }

  function avisarLluvia(estado, resumen) {
    const l = estado.lluvia;
    if (!l || l.avisada || estado.reloj.minutos < l.desde) return;
    l.avisada = true;
    const fin = infoReloj(l.hasta);
    incidencia(estado, resumen, 'lluvia', 'Empieza a llover: hasta las ' + String(fin.hora).padStart(2, '0') + ':' +
      String(fin.minuto).padStart(2, '0') + ' hay el doble de clientes.', 0, null);
  }

  /*
   * Para probar desde la consola. Los eventos de carrera (propina, sinPagar,
   * objeto, vomito) se aplican en la próxima carrera que termine; lluvia,
   * pinchazo, baja y averia ocurren ya.
   */
  function forzarEvento(estado, tipo, arg) {
    const resumen = resumenVacio();
    const tipos = ['propina', 'sinPagar', 'objeto', 'vomito', 'lluvia', 'pinchazo', 'baja', 'averia'];
    if (tipos.indexOf(tipo) === -1) return { ok: false, mensaje: 'Eventos: ' + tipos.join(', '), eventos: [] };
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

  /*
   * Cuenta agrupada (sin conexión): ingresos y gastos medios de todos los
   * coches con conductor durante `minutos`, por zona y hora.
   */
  function producirAgregado(estado, minutos, info, resumen) {
    const c = cfg();
    const grupos = cochesPorZona(estado, info);
    const horas = minutos / 60 * factorJornada(estado);
    Object.keys(grupos).forEach(function (zonaId) {
      const coches = grupos[zonaId];
      const r = rendimientoZona(estado, zonaId, coches.length, info);
      // Cada coche hace su parte de los viajes; si su conductor espera menos
      // (rasgo, nivel, objetos), su ciclo es más corto y hace más.
      const porCoche = r.viajesHora / coches.length;
      const ciclo = porCoche > 0 ? 60 / porCoche : 0;
      const viaje = viajeMedio(zonaId, info.tarifa).minutos;
      const espera = Math.max(0, ciclo - viaje);
      const pesos = coches.map(function (x) {
        if (ciclo === 0) return 1;
        const fe = topeConductor('espera', factoresConductor(estado, x.turno).espera);
        return ciclo / (espera * fe + viaje);
      });
      const k = pesos.reduce(function (a, b) { return a + b; }, 0) / coches.length;
      const viajes = r.viajesHora * horas * k;
      const ingresos = viajes * r.importe;
      if (viajes > 0) cobrar(estado, resumen, ingresos, viajes);
      coches.forEach(function (x, i) { sumarFacturado(x.licencia, ingresos * pesos[i] / (k * coches.length)); });

      let costeKmMedio = 0;
      let conConductor = 0;
      coches.forEach(function (x) {
        costeKmMedio += costePorKm(estado, x.licencia.vehiculo) / coches.length;
        if (x.turno.quien === 'conductor') conConductor++;
      });
      gastar(estado, resumen, 'combustible', r.kmHora * horas * k * costeKmMedio);
      estado.caja.hoy.km += r.kmHora * horas * k;
      if (conConductor > 0 && ingresos > 0) {
        gastar(estado, resumen, 'conductores', ingresos * conConductor / coches.length * c.conductores.porcentaje);
      }
    });
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
   * tiempo: la usan el bucle del juego y el progreso sin conexión.
   * Trocea el avance en horas enteras para que la tarifa y la demanda sean
   * constantes en cada trozo. Devuelve un resumen de lo ocurrido.
   *
   * Pausa: con un cierre pendiente no pasa nada. Al cerrar la caja, si el
   * ajuste pararAlCierre está activo, deja el cierre pendiente y se para (el
   * resto del tiempo se descarta). opciones.sinPausa cierra los días sin
   * pararse: lo usa el progreso sin conexión.
   *
   * Conductores: con el juego abierto hacen carreras reales y cobran al
   * terminar cada una. opciones.agregado usa en su lugar la cuenta media por
   * zona y hora (sin conexión, sin simular carrera a carrera).
   */
  function avanzar(estado, segundos, opciones) {
    const resumen = resumenVacio();
    if (enPausa(estado) || !(segundos > 0)) return resumen;
    const pararse = estado.ajustes.pararAlCierre && !(opciones && opciones.sinPausa);
    const agregado = !!(opciones && opciones.agregado);
    let restante = segundos * MIN_DIA / segundosPorDia(estado);
    resumen.minutos = restante;

    if (agregado) {
      // Las carreras que estaban a medias se cobran ya, enteras.
      turnosConCarrera(estado).forEach(function (t) { terminarCarreraConductor(estado, resumen, t); });
    }

    while (restante > 1e-9) {
      const ahora = estado.reloj.minutos;
      if (!agregado) {
        sortearLluvia(estado);
        empezarCarrerasConductores(estado, resumen);
      }
      let limite = (Math.floor(ahora / 60) + 1) * 60;
      const carrera = estado.jugador.carrera;
      if (carrera && carrera.fin > ahora && carrera.fin < limite) limite = carrera.fin;
      const enCurso = agregado ? [] : turnosConCarrera(estado);
      enCurso.forEach(function (t) {
        if (t.carrera.fin > ahora && t.carrera.fin < limite) limite = t.carrera.fin;
      });
      const pendientes = agregado ? [] : turnosConPendiente(estado);
      pendientes.forEach(function (x) {
        if (x.turno.pendiente.minuto > ahora && x.turno.pendiente.minuto < limite) limite = x.turno.pendiente.minuto;
      });
      if (!agregado && estado.lluvia && !estado.lluvia.avisada &&
          estado.lluvia.desde > ahora && estado.lluvia.desde < limite) limite = estado.lluvia.desde;

      const llega = restante >= limite - ahora;
      const paso = llega ? limite - ahora : restante;
      if (agregado) {
        asignarZonasConductores(estado);
        producirAgregado(estado, paso, infoReloj(ahora), resumen);
      }
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
      if (!agregado) avisarLluvia(estado, resumen);
      if (!agregado && llega && limite % 60 === 0) {
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
    }
    return resumen;
  }

  /* Segundos reales que faltan para el último cierre de caja que cabe en `segundos`, o 0. */
  function segundosHastaUltimoCierre(estado, segundos) {
    const minutosPorSegundo = MIN_DIA / segundosPorDia(estado);
    const disponibles = segundos * minutosPorSegundo;
    const minutoDelDia = estado.reloj.minutos % MIN_DIA;
    let primero = (cfg().reloj.minutoCierreCaja - minutoDelDia + MIN_DIA) % MIN_DIA;
    if (primero === 0) primero = MIN_DIA;
    if (disponibles < primero) return 0;
    const dias = Math.floor((disponibles - primero) / MIN_DIA);
    return (primero + dias * MIN_DIA) / minutosPorSegundo;
  }

  /*
   * Progreso mientras el juego estaba cerrado. Usa la misma avanzar().
   * Mientras conduces a mano el taxi se queda parado contigo, y si cerraste
   * con el ticket en pantalla el día sigue parado: el reloj no avanza.
   * Con pararAlCierre, los días que terminan fuera se cierran solos; el reloj
   * se queda en el último cierre (lo que sobra se descarta) y queda un único
   * cierre pendiente con la suma de esos días.
   * Devuelve el resumen, o null si no ha pasado nada.
   */
  function progresoSinConexion(estado, segundosFuera) {
    const c = cfg().sinConexion;
    if (!hayConductores(estado) || enPausa(estado) || !(segundosFuera >= c.minimoSegundos)) return null;
    let segundos = Math.min(segundosFuera, c.maximoHoras * 3600);
    if (estado.ajustes.pararAlCierre) {
      const hastaCierre = segundosHastaUltimoCierre(estado, segundos);
      // Una millonésima de más asegura cruzar el cierre pese al redondeo.
      if (hastaCierre > 0) segundos = hastaCierre + 1e-6;
    }
    const resumen = avanzar(estado, segundos, { sinPausa: true, agregado: true });
    if (estado.ajustes.pararAlCierre && resumen.cierres.length > 0) {
      estado.cierrePendiente = sumarCierres(resumen.cierres);
    }
    resumen.segundosFuera = segundosFuera;
    resumen.segundosSimulados = segundos;
    return resumen;
  }

  Libre.sim = {
    MIN_DIA,
    crearEstadoInicial,
    infoReloj,
    segundosPorDia,
    factorJornada,
    modificadores,
    comprarMejora,
    nivelMejora,
    siguienteNivel,
    inventarioAbierto,
    comprarInventario,
    zonaDesbloqueada,
    zonasDisponibles,
    precioTaximetro,
    precioTarifa3,
    viajeMedio,
    netoCaja,
    costePorKm,
    costesFijosDiarios,
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
    textoLicencia,
    sortearNumeroLicencia,
    comprarLicencia,
    comprarVehiculo,
    cambiarTurnoJugador,
    contratarConductor,
    despedirConductor,
    buscarCliente,
    importeEnCurso,
    importeDeCarrera,
    enPausa,
    arrancarDia,
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
    factoresConductor,
    topeConductor,
    avanzar,
    progresoSinConexion
  };
})(globalThis);
