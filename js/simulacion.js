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

  function fallo(mensaje) { return { ok: false, mensaje }; }
  function exito(mensaje) { return { ok: true, mensaje: mensaje || '' }; }

  // ------------------------------------------------------------------ Estado

  function cajaVacia(dia) {
    return { dia, carreras: 0, ingresos: 0, combustible: 0, conductores: 0, fijos: 0 };
  }

  /* Beneficio de una caja: ingresos menos todos los gastos. */
  function netoCaja(caja) {
    return caja.ingresos - caja.combustible - caja.conductores - caja.fijos;
  }

  function crearEstadoInicial(ahoraMs) {
    const c = cfg();
    return {
      version: c.versionGuardado,
      dinero: c.economia.dineroInicial,
      reloj: { minutos: c.reloj.minutoInicial },
      licencias: [
        {
          id: 1,
          vehiculo: c.vehiculos.modeloInicial,
          turnos: {
            dia: { quien: 'jugador', nombre: 'Tú', zona: c.zonaInicial },
            noche: null
          }
        }
      ],
      jugador: { carrera: null, ultimaCarrera: null },
      caja: { hoy: cajaVacia(0), ayer: null },
      totales: { carreras: 0, ingresos: 0 },
      ultimaMarca: ahoraMs || 0
    };
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

  function segundosPorDia(estado) {
    return cfg().reloj.segundosPorDia;
  }

  /*
   * Al alargar el día con mejoras, el reloj va más lento pero los coches
   * siguen trabajando al mismo ritmo en tiempo real: caben más carreras en el
   * mismo día y los costes fijos diarios se reparten entre más facturación.
   */
  function factorJornada(estado) {
    return segundosPorDia(estado) / cfg().reloj.segundosPorDia;
  }

  // ---------------------------------------------------------------- Taxímetro

  /* Fórmula real: inicio de servicio + km × precio/km + tiempo parado × precio/hora. */
  function precioTaximetro(tarifaId, km, minParado) {
    const t = cfg().tarifas[tarifaId];
    return t.inicio + km * t.porKm + (minParado / 60) * t.porHora;
  }

  /* Viaje medio de una zona con la tarifa dada: importe, km y minutos esperados. */
  function viajeMedio(zonaId, tarifaId) {
    const zona = cfg().zonas[zonaId];
    const medio = { importe: 0, km: 0, minutos: 0 };
    zona.viajes.forEach(function (v) {
      medio.importe += v.proporcion * precioTaximetro(tarifaId, v.km, v.minParado);
      medio.km += v.proporcion * v.km;
      medio.minutos += v.proporcion * v.minutos;
    });
    return medio;
  }

  function demandaZona(estado, zonaId, info) {
    const zona = cfg().zonas[zonaId];
    const tabla = info.finDeSemana ? zona.demanda.finDeSemana : zona.demanda.laborable;
    const factorDia = zona.factorPorDia ? zona.factorPorDia[info.diaSemana] : 1;
    return tabla[info.hora] * factorDia;
  }

  /* Minutos que tarda un coche en completar una carrera: buscar + cola + viaje. */
  function minutosPorCarrera(estado, zonaId, tarifaId) {
    const zona = cfg().zonas[zonaId];
    return zona.busquedaMin + zona.colaMin + viajeMedio(zonaId, tarifaId).minutos;
  }

  // ------------------------------------------------------------ Costes

  /* Euros de combustible por km recorrido con un modelo de coche. */
  function costePorKm(estado, modeloId) {
    const c = cfg();
    const modelo = c.vehiculos.modelos[modeloId || c.vehiculos.modeloInicial];
    return modelo.consumoLitros100Km / 100 * c.combustible.precioLitro;
  }

  function vehiculosEnServicio(estado) {
    return estado.licencias.filter(function (l) { return !!l.vehiculo; }).length;
  }

  /* Costes fijos que se cobrarán en el próximo cierre de caja. */
  function costesFijosDiarios(estado) {
    const f = cfg().costesFijos;
    return f.autonomoDiario + vehiculosEnServicio(estado) * f.seguroDiarioPorVehiculo;
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
    resumen.cierres.push(cerrada);
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
    return ubicacionJugador(estado).datos;
  }

  /* Cambia la zona de trabajo de un turno (tuyo o de un conductor). */
  function elegirZona(estado, licenciaId, turno, zonaId) {
    const lic = buscarLicencia(estado, licenciaId);
    if (!lic || !lic.turnos[turno]) return fallo('Ese turno no existe.');
    if (!cfg().zonas[zonaId]) return fallo('Esa zona no existe.');
    lic.turnos[turno].zona = zonaId;
    return exito();
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
   * El jugador sale a buscar cliente en su zona. La espera depende de la
   * demanda: con poca demanda tardas más en encontrar a alguien.
   */
  function buscarCliente(estado, rng) {
    const rnd = rng || Math.random;
    const c = cfg();
    if (estado.jugador.carrera) return fallo('Ya estás en una carrera.');
    const turno = turnoDelJugador(estado);
    const zona = c.zonas[turno.zona];
    const info = infoReloj(estado.reloj.minutos);
    const demanda = demandaZona(estado, turno.zona, info);
    if (demanda < c.economia.demandaMinimaManual) {
      return fallo('Ahora no hay clientes en ' + zona.nombre + '. Prueba otra zona u otra hora.');
    }

    const viaje = elegirViaje(zona, rnd);
    const azar = 1 + (rnd() * 2 - 1) * zona.variacion;
    const km = viaje.km * azar;
    const minParado = viaje.minParado * azar;
    const minutosViaje = viaje.minutos * azar;
    const importe = precioTaximetro(info.tarifa, km, minParado);

    // Con mucha demanda esperas lo normal; con poca, hasta que aparece alguien.
    const medio = viajeMedio(turno.zona, info.tarifa);
    const ciclo = Math.max(minutosPorCarrera(estado, turno.zona, info.tarifa), 60 / demanda);
    const espera = ciclo - medio.minutos;

    // Buscando cliente se gasta combustible; en la cola de una parada, no.
    const kmVacio = Math.max(0, espera - zona.colaMin) / 60 * c.conduccion.velocidadVacioKmH;
    const lic = buscarLicencia(estado, ubicacionJugador(estado).licenciaId);

    const f = factorJornada(estado);
    const ahora = estado.reloj.minutos;
    estado.jugador.carrera = {
      zona: turno.zona,
      tarifa: info.tarifa,
      inicio: ahora,
      finEspera: ahora + espera / f,
      fin: ahora + (espera + minutosViaje) / f,
      importe,
      km,
      combustible: (km + kmVacio) * costePorKm(estado, lic.vehiculo)
    };
    return exito();
  }

  function terminarCarrera(estado, resumen) {
    const carrera = estado.jugador.carrera;
    estado.jugador.carrera = null;
    estado.jugador.ultimaCarrera = {
      zona: carrera.zona, tarifa: carrera.tarifa, importe: carrera.importe, km: carrera.km
    };
    cobrar(estado, resumen, carrera.importe, 1);
    gastar(estado, resumen, 'combustible', carrera.combustible);
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

  // ---------------------------------------------------------------- Avanzar

  function resumenVacio() {
    return {
      minutos: 0, carreras: 0, ingresos: 0,
      combustible: 0, conductores: 0, fijos: 0,
      cierres: []
    };
  }

  /*
   * Avanza el estado `segundos` reales. Es la única función que mueve el
   * tiempo: la usan el bucle del juego y el progreso sin conexión.
   * Trocea el avance en horas enteras para que la tarifa y la demanda sean
   * constantes en cada trozo. Devuelve un resumen de lo ocurrido.
   */
  function avanzar(estado, segundos) {
    const resumen = resumenVacio();
    if (!(segundos > 0)) return resumen;
    let restante = segundos * MIN_DIA / segundosPorDia(estado);
    resumen.minutos = restante;

    while (restante > 1e-9) {
      const ahora = estado.reloj.minutos;
      let limite = (Math.floor(ahora / 60) + 1) * 60;
      const carrera = estado.jugador.carrera;
      if (carrera && carrera.fin > ahora && carrera.fin < limite) limite = carrera.fin;

      const llega = restante >= limite - ahora;
      const paso = llega ? limite - ahora : restante;
      estado.reloj.minutos = llega ? limite : ahora + paso;
      restante -= paso;

      if (carrera && estado.reloj.minutos >= carrera.fin) terminarCarrera(estado, resumen);
      if (llega && limite % MIN_DIA === cfg().reloj.minutoCierreCaja) cerrarCaja(estado, resumen);
    }
    return resumen;
  }

  Libre.sim = {
    MIN_DIA,
    crearEstadoInicial,
    infoReloj,
    segundosPorDia,
    factorJornada,
    precioTaximetro,
    viajeMedio,
    netoCaja,
    costePorKm,
    costesFijosDiarios,
    demandaZona,
    turnoDelJugador,
    ubicacionJugador,
    elegirZona,
    buscarCliente,
    avanzar
  };
})(globalThis);
