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
      // automatico pasa a true al contratar al primer conductor: desde entonces
      // tu turno también trabaja solo y se acaban las carreras a mano.
      jugador: { automatico: false, carrera: null, ultimaCarrera: null },
      conductoresContratados: 0,
      mejoras: {},
      caja: { hoy: cajaVacia(0), ayer: null },
      totales: { carreras: 0, ingresos: 0 },
      // Pausa al cierre del día: mientras no sea null el reloj está parado y
      // guarda el ticket por enseñar (los días que cubre y sus sumas).
      cierrePendiente: null,
      ajustes: { pararAlCierre: true },
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
    const m = { segundosDia: 0, consumo: 1, busqueda: 1, cola: 1, demanda: 1, cuotaEmisora: false };
    cfg().mejoras.forEach(function (mejora) {
      if (!estado.mejoras[mejora.id]) return;
      const e = mejora.efecto;
      if (e.soloZona && e.soloZona !== zonaId) return;
      if (e.segundosDia) m.segundosDia += e.segundosDia;
      if (e.consumo) m.consumo *= e.consumo;
      if (e.busqueda) m.busqueda *= e.busqueda;
      if (e.cola) m.cola *= e.cola;
      if (e.demanda) m.demanda *= e.demanda;
      if (e.cuotaEmisora) m.cuotaEmisora = true;
    });
    return m;
  }

  function buscarMejora(id) {
    return cfg().mejoras.find(function (m) { return m.id === id; }) || null;
  }

  function comprarMejora(estado, id) {
    const mejora = buscarMejora(id);
    if (!mejora) return fallo('Esa mejora no existe.');
    if (estado.mejoras[id]) return fallo('Ya la tienes.');
    if (mejora.requiere && !estado.mejoras[mejora.requiere]) {
      return fallo('Antes necesitas: ' + buscarMejora(mejora.requiere).nombre + '.');
    }
    if (estado.dinero < mejora.precio) return fallo('No te llega el dinero.');
    estado.dinero -= mejora.precio;
    estado.mejoras[id] = true;
    return exito(mejora.nombre + ': hecho.');
  }

  function zonaDesbloqueada(estado, zonaId) {
    const zona = cfg().zonas[zonaId];
    return !!zona && (!zona.requiere || !!estado.mejoras[zona.requiere]);
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
    return precioTaximetro(tarifaId, km, minParado);
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

  function demandaZona(estado, zonaId, info) {
    const zona = cfg().zonas[zonaId];
    const tabla = info.finDeSemana ? zona.demanda.finDeSemana : zona.demanda.laborable;
    const factorDia = zona.factorPorDia ? zona.factorPorDia[info.diaSemana] : 1;
    return tabla[info.hora] * factorDia * modificadores(estado, zonaId).demanda;
  }

  /* Minutos que tarda un coche en completar una carrera: buscar + cola + viaje. */
  function minutosPorCarrera(estado, zonaId, tarifaId) {
    const zona = cfg().zonas[zonaId];
    const m = modificadores(estado, zonaId);
    return zona.busquedaMin * m.busqueda + zona.colaMin * m.cola + viajeMedio(zonaId, tarifaId).minutos;
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
    const porVehiculo = f.seguroDiarioPorVehiculo +
      (modificadores(estado).cuotaEmisora ? f.emisoraDiariaPorVehiculo : 0);
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
    resumen.cierres.push(cerrada);
  }

  // --------------------------------------------------- Pausa al cierre

  const CAMPOS_CAJA = ['carreras', 'ingresos', 'combustible', 'conductores', 'fijos'];

  /* Suma varias cajas cerradas en un solo ticket { desdeDia, hastaDia, ... }. */
  function sumarCierres(cajas) {
    const ticket = { desdeDia: cajas[0].dia, hastaDia: cajas[cajas.length - 1].dia };
    CAMPOS_CAJA.forEach(function (campo) {
      ticket[campo] = cajas.reduce(function (s, caja) { return s + (caja[campo] || 0); }, 0);
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
    return ubicacionJugador(estado).datos;
  }

  // ------------------------------------------------- Licencias y coches

  /* El precio de la licencia sube con cada compra. */
  function precioLicencia(estado) {
    const l = cfg().licencias;
    return l.precioBase * Math.pow(l.factorSubida, estado.licencias.length - 1);
  }

  function comprarLicencia(estado) {
    const c = cfg();
    if (estado.licencias.length >= c.licencias.maximo) return fallo('No quedan licencias en Madrid.');
    const precio = precioLicencia(estado);
    if (estado.dinero < precio) return fallo('No te llega el dinero.');
    estado.dinero -= precio;
    const id = estado.licencias.reduce(function (m, l) { return Math.max(m, l.id); }, 0) + 1;
    estado.licencias.push({ id, vehiculo: null, turnos: { dia: null, noche: null } });
    return exito('Licencia ' + id + ' comprada. Ahora necesita un coche.');
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
    return exito(modelo.nombre + ' listo en la licencia ' + lic.id + '. Contrata conductores para sus turnos.');
  }

  /* Pasa al jugador al otro turno de su licencia, si está libre. */
  function cambiarTurnoJugador(estado) {
    const u = ubicacionJugador(estado);
    const lic = buscarLicencia(estado, u.licenciaId);
    const otro = u.turno === 'dia' ? 'noche' : 'dia';
    if (lic.turnos[otro]) return fallo('El otro turno ya está ocupado.');
    lic.turnos[otro] = u.datos;
    lic.turnos[u.turno] = null;
    return exito('Ahora conduces en el turno de ' + cfg().turnos[otro].nombre.toLowerCase() + '.');
  }

  /* Contrata un conductor para un turno libre de una licencia con coche. */
  function contratarConductor(estado, licenciaId, turno) {
    const c = cfg();
    const lic = buscarLicencia(estado, licenciaId);
    if (!lic || TURNOS.indexOf(turno) === -1) return fallo('Ese turno no existe.');
    if (!lic.vehiculo) return fallo('Esa licencia aún no tiene coche.');
    if (lic.turnos[turno]) return fallo('Ese turno ya está cubierto.');
    if (!estado.jugador.automatico && estado.jugador.carrera) return fallo('Termina antes la carrera en curso.');
    const precio = c.conductores.costeContratacion;
    if (estado.dinero < precio) return fallo('No te llega el dinero.');

    const otro = lic.turnos[turno === 'dia' ? 'noche' : 'dia'];
    const nombre = c.conductores.nombres[estado.conductoresContratados % c.conductores.nombres.length];
    estado.dinero -= precio;
    estado.conductoresContratados++;
    lic.turnos[turno] = { quien: 'conductor', nombre, zona: otro ? otro.zona : c.zonaInicial };

    if (!estado.jugador.automatico) {
      estado.jugador.automatico = true;
      return exito(nombre + ' se encarga del turno de ' + c.turnos[turno].nombre.toLowerCase() +
        '. Desde ahora tu taxi trabaja solo, también en tu turno.');
    }
    return exito(nombre + ' empieza en el turno de ' + c.turnos[turno].nombre.toLowerCase() + '.');
  }

  function despedirConductor(estado, licenciaId, turno) {
    const lic = buscarLicencia(estado, licenciaId);
    const t = lic && lic.turnos[turno];
    if (!t || t.quien !== 'conductor') return fallo('Ahí no hay ningún conductor.');
    lic.turnos[turno] = null;
    return exito(t.nombre + ' ya no trabaja para ti.');
  }

  /* Cambia la zona de trabajo de un turno (tuyo o de un conductor). */
  function elegirZona(estado, licenciaId, turno, zonaId) {
    const lic = buscarLicencia(estado, licenciaId);
    if (!lic || !lic.turnos[turno]) return fallo('Ese turno no existe.');
    if (!zonaDesbloqueada(estado, zonaId)) return fallo('Esa zona aún no está disponible.');
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
    if (estado.jugador.automatico) return fallo('Tu taxi ya trabaja solo.');
    if (enPausa(estado)) return fallo('El día está cerrado. Arranca el día siguiente.');
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
    const importe = importeViaje(viaje, info.tarifa, km, minParado);

    // Con mucha demanda esperas lo normal; con poca, hasta que aparece alguien.
    const medio = viajeMedio(turno.zona, info.tarifa);
    const ciclo = Math.max(minutosPorCarrera(estado, turno.zona, info.tarifa), 60 / demanda);
    const espera = ciclo - medio.minutos;

    // Buscando cliente se gasta combustible; en la cola de una parada, no.
    const cola = zona.colaMin * modificadores(estado, turno.zona).cola;
    const kmVacio = Math.max(0, espera - cola) / 60 * c.conduccion.velocidadVacioKmH;
    const lic = buscarLicencia(estado, ubicacionJugador(estado).licenciaId);

    const f = factorJornada(estado);
    const ahora = estado.reloj.minutos;
    estado.jugador.carrera = {
      zona: turno.zona,
      tarifa: viaje.tarifaFija || info.tarifa,
      inicio: ahora,
      finEspera: ahora + espera / f,
      fin: ahora + (espera + minutosViaje) / f,
      importe,
      km,
      combustible: (km + kmVacio) * costePorKm(estado, lic.vehiculo)
    };
    return exito();
  }

  /*
   * Solo lectura, para la interfaz: lo que marca ahora el taxímetro de tu
   * carrera a mano. null mientras buscas cliente o sin carrera. Con pasajero,
   * sube del inicio de servicio al importe final según avanza el viaje; con
   * tarifa fija marca el precio fijo desde el principio.
   */
  function importeEnCurso(estado) {
    const carrera = estado.jugador.carrera;
    if (!carrera || estado.reloj.minutos < carrera.finEspera) return null;
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
      if (t.quien === 'jugador' && !estado.jugador.automatico) return;
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

  /* Ingresos y gastos de todos los coches automáticos durante `minutos`. */
  function producirAutomatico(estado, minutos, info, resumen) {
    const c = cfg();
    const grupos = cochesPorZona(estado, info);
    const horas = minutos / 60 * factorJornada(estado);
    Object.keys(grupos).forEach(function (zonaId) {
      const coches = grupos[zonaId];
      const r = rendimientoZona(estado, zonaId, coches.length, info);
      const viajes = r.viajesHora * horas;
      const ingresos = viajes * r.importe;
      if (viajes > 0) cobrar(estado, resumen, ingresos, viajes);

      let costeKmMedio = 0;
      let conConductor = 0;
      coches.forEach(function (x) {
        costeKmMedio += costePorKm(estado, x.licencia.vehiculo) / coches.length;
        if (x.turno.quien === 'conductor') conConductor++;
      });
      gastar(estado, resumen, 'combustible', r.kmHora * horas * costeKmMedio);
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
      cierres: []
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
   */
  function avanzar(estado, segundos, opciones) {
    const resumen = resumenVacio();
    if (enPausa(estado) || !(segundos > 0)) return resumen;
    const pararse = estado.ajustes.pararAlCierre && !(opciones && opciones.sinPausa);
    let restante = segundos * MIN_DIA / segundosPorDia(estado);
    resumen.minutos = restante;

    while (restante > 1e-9) {
      const ahora = estado.reloj.minutos;
      let limite = (Math.floor(ahora / 60) + 1) * 60;
      const carrera = estado.jugador.carrera;
      if (carrera && carrera.fin > ahora && carrera.fin < limite) limite = carrera.fin;

      const llega = restante >= limite - ahora;
      const paso = llega ? limite - ahora : restante;
      producirAutomatico(estado, paso, infoReloj(ahora), resumen);
      estado.reloj.minutos = llega ? limite : ahora + paso;
      restante -= paso;

      if (carrera && estado.reloj.minutos >= carrera.fin) terminarCarrera(estado, resumen);
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
    if (!estado.jugador.automatico || enPausa(estado) || !(segundosFuera >= c.minimoSegundos)) return null;
    let segundos = Math.min(segundosFuera, c.maximoHoras * 3600);
    if (estado.ajustes.pararAlCierre) {
      const hastaCierre = segundosHastaUltimoCierre(estado, segundos);
      // Una millonésima de más asegura cruzar el cierre pese al redondeo.
      if (hastaCierre > 0) segundos = hastaCierre + 1e-6;
    }
    const resumen = avanzar(estado, segundos, { sinPausa: true });
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
    zonaDesbloqueada,
    zonasDisponibles,
    precioTaximetro,
    viajeMedio,
    netoCaja,
    costePorKm,
    costesFijosDiarios,
    demandaZona,
    turnoDeHora,
    turnoDelJugador,
    ubicacionJugador,
    cochesPorZona,
    rendimientoZona,
    elegirZona,
    precioLicencia,
    comprarLicencia,
    comprarVehiculo,
    cambiarTurnoJugador,
    contratarConductor,
    despedirConductor,
    buscarCliente,
    importeEnCurso,
    enPausa,
    arrancarDia,
    cambiarAjuste,
    sumarCierres,
    avanzar,
    progresoSinConexion
  };
})(globalThis);
