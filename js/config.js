/*
 * Libre · configuración del juego.
 *
 * TODOS los números del juego viven aquí: tarifas, reloj, zonas, vehículos,
 * costes y mejoras. La lógica (simulacion.js) los lee de Libre.config y no
 * contiene cifras propias.
 *
 * Convención de comentarios:
 *   - "Dato real": viene de DISENO.md (tarifas oficiales de Madrid 2026).
 *   - "PROVISIONAL": falta el dato real; valor inventado hasta tener fuente.
 *   - "Equilibrio": valor de juego para ajustar jugando.
 */
(function (raiz) {
  'use strict';
  var Libre = raiz.Libre = raiz.Libre || {};

  Libre.config = {
    // Sube este número cuando cambie la forma del estado guardado y añade
    // una migración en guardado.js.
    versionGuardado: 11,

    reloj: {
      // Decisión de diseño: un día de juego dura 2 minutos reales al principio.
      segundosPorDia: 100,
      // La partida empieza el lunes a las 7:00 (minutos desde medianoche).
      minutoInicial: 7 * 60,
      // La caja se cierra cada día a esta hora: la jornada va de 7:00 a 7:00.
      minutoCierreCaja: 7 * 60,
      diasSemana: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
      // Índices de diasSemana que cuentan como fin de semana (tarifa 2 todo el día).
      diasFinDeSemana: [5, 6]
    },

    tarifas: {
      // Dato real: tarifa 1 en laborables de lunes a viernes de 7:00 a 21:00;
      // tarifa 2 el resto (noches, sábados y domingos). Festivos fuera de esta versión.
      horaInicioTarifa1: 7,
      horaFinTarifa1: 21,
      // Dato real (DISENO.md): inicio de servicio, precio por km y por hora de espera.
      t1: { nombre: 'Tarifa 1', inicio: 2.55, porKm: 1.40, porHora: 27.00 },
      t2: { nombre: 'Tarifa 2', inicio: 3.20, porKm: 1.60, porHora: 29.00 },
      // Dato real: tarifas fijas del aeropuerto.
      // Tarifa 3 (Dato de Iván, 16-11-2026): salidas de Barajas a destinos fuera
      // de la M-30. 22 € de bajada de bandera que cubren los primeros 9 km; a
      // partir de ahí corre el taxímetro con la tarifa 1 o 2 que toque.
      t3: { nombre: 'Tarifa 3', inicio: 22.00, kmIncluidos: 9 },
      // Tarifa 4: entre Barajas y el interior de la M-30, sin suplementos.
      t4: { nombre: 'Tarifa 4', fija: 33.00 }
    },

    /*
     * Eventos aleatorios. Equilibrio: sin mejoras, el efecto neto de todos
     * sobre el beneficio debe quedar cerca de cero.
     *   probCarrera  probabilidad en cada carrera terminada (tuya o de conductor)
     *   probTurno    probabilidad al empezar cada turno de cada taxi
     *   probJornada  probabilidad una vez por jornada (general)
     * nombre: cómo sale en el ticket.
     */
    eventos: {
      propina: {
        nombre: 'Propinas', probCarrera: 0.15,
        porcentajeMin: 0.05, porcentajeMax: 0.25    // sobre el importe de la carrera
      },
      sinPagar: { nombre: 'Sin pagar', probCarrera: 0.01 },
      // Vómitos (Iván): mucho más de noche y, sobre todo, a la salida del ocio.
      // probCarrera es de día; probNoche, de horaNocheInicio a horaNocheFin;
      // probPorZona manda sobre las dos. Efecto: limpieza y horasParado sin trabajar.
      vomito: {
        nombre: 'Vómitos', probCarrera: 0.0008, probNoche: 0.01, probPorZona: { ocio: 0.03 },
        horaNocheInicio: 21, horaNocheFin: 7, costeMin: 50, costeMax: 90, horasParado: 1
      },
      objeto: {
        nombre: 'Objetos devueltos', probCarrera: 0.01,
        // De menos a más valor; «peso» es cuánto sale cada uno (menos, más raro).
        objetos: [
          { nombre: 'un paraguas', recompensa: 5, peso: 30 },
          { nombre: 'una bufanda', recompensa: 8, peso: 22 },
          { nombre: 'unas gafas de sol', recompensa: 12, peso: 16 },
          { nombre: 'un libro dedicado', recompensa: 15, peso: 12 },
          { nombre: 'una cartera con el DNI', recompensa: 25, peso: 8 },
          { nombre: 'las llaves de casa', recompensa: 30, peso: 6 },
          { nombre: 'un móvil', recompensa: 50, peso: 3 },
          { nombre: 'una tablet', recompensa: 70, peso: 1.6 },
          { nombre: 'un portátil del trabajo', recompensa: 120, peso: 0.9 },
          { nombre: 'un maletín con documentos', recompensa: 300, peso: 0.5 }
        ]
      },
      pinchazo: { nombre: 'Pinchazos', probTurno: 0.015, coste: 120 },
      baja: { nombre: 'Bajas', probTurno: 0.008, jornadasMin: 1, jornadasMax: 5 },
      averia: {
        nombre: 'Averías', probTurno: 0.0008, jornadasMin: 10, jornadasMax: 20,
        costeMin: 150, costeMax: 400,
        cochesMinimos: 2           // con menos coches no hay averías
      },
      lluvia: { nombre: 'Lluvia', probJornada: 0.2, horasMin: 1, horasMax: 3, factorDemanda: 2 },
      // Bolsa del inventario gastada en vez de un vómito (solo sale en el ticket).
      bolsa: { nombre: 'Bolsas usadas' },
      // Solo con la mejora «Sacudir esterillas»: monedas al final de cada turno.
      esterillas: { nombre: 'Monedas de las esterillas' }
    },

    /*
     * Inventario de consumibles, común a toda la flota. Cada uno se desbloquea
     * con su mejora; luego se compran unidades hasta el máximo del almacén.
     * aviso: con estas unidades o menos, la pestaña Flota avisa. Equilibrio.
     */
    inventario: {
      ruedas: { nombre: 'Ruedas de repuesto', unidad: 'rueda', precio: 80, maximo: 10, aviso: 1, mejora: 'rueda' },
      bolsas: { nombre: 'Bolsas de papel', unidad: 'bolsa', precio: 2, maximo: 50, aviso: 5, mejora: 'bolsas' }
    },

    sinConexion: {
      maximoHoras: 8,              // Equilibrio: horas reales que se recuperan como mucho.
      minimoSegundos: 10           // Por debajo de esto no se muestra el resumen.
    },

    economia: {
      dineroInicial: 50,          // Equilibrio: caja con la que empiezas.
      // Equilibrio: por debajo de estos viajes por hora la zona se considera
      // vacía y no se puede buscar cliente a mano.
      demandaMinimaManual: 0.5,
      // Equilibrio: cada jornada, la demanda de cada zona se mueve al azar
      // hasta este porcentaje arriba o abajo (0,2 = ±20 %). El azar sale del
      // número de día, así que jugando y sin conexión da lo mismo.
      variacionDiariaDemanda: 0.2
    },

    conduccion: {
      // Equilibrio: velocidad media circulando en vacío buscando cliente.
      velocidadVacioKmH: 18
    },

    // Turnos de 12 horas. Equilibrio: no coinciden con el cambio de tarifa de las 21:00.
    turnos: {
      dia: { nombre: 'Día', horaInicio: 7, horaFin: 19 },
      noche: { nombre: 'Noche', horaInicio: 19, horaFin: 7 }
    },

    conductores: {
      // Dato de Iván: parte de la recaudación que se queda el conductor.
      porcentaje: 0.50,
      costeContratacion: 400,      // Equilibrio: pago único al contratar.
      /*
       * Personajes: se sortea uno al contratar (sin repetir mientras se pueda).
       * Rasgos del retrato (js/retratos.js):
       *   piel 1–4 · cara redonda | alargada | cuadrada
       *   pelo corto | largo | rizado | coleta | moño | calvo
       *   colorPelo negro | castano | rubio | pelirrojo | gris | blanco
       *   gafas null | redondas | cuadradas · barba null | bigote | barba | perilla
       *   ropa 1–6 · edad joven | media | mayor (la mayor lleva arrugas)
       */
      personajes: [
        { nombre: 'Ana', edad: 'joven', piel: 2, cara: 'redonda', pelo: 'largo', colorPelo: 'castano', gafas: null, barba: null, ropa: 1 },
        { nombre: 'Luis', edad: 'media', piel: 1, cara: 'cuadrada', pelo: 'corto', colorPelo: 'negro', gafas: null, barba: 'bigote', ropa: 2 },
        { nombre: 'Carmen', edad: 'mayor', piel: 2, cara: 'alargada', pelo: 'moño', colorPelo: 'blanco', gafas: 'redondas', barba: null, ropa: 3 },
        { nombre: 'Javier', edad: 'joven', piel: 3, cara: 'redonda', pelo: 'rizado', colorPelo: 'negro', gafas: null, barba: 'perilla', ropa: 4 },
        { nombre: 'Lucía', edad: 'media', piel: 1, cara: 'alargada', pelo: 'coleta', colorPelo: 'rubio', gafas: 'cuadradas', barba: null, ropa: 5 },
        { nombre: 'Manuel', edad: 'mayor', piel: 2, cara: 'cuadrada', pelo: 'calvo', colorPelo: 'gris', gafas: null, barba: 'barba', ropa: 6 },
        { nombre: 'Elena', edad: 'joven', piel: 4, cara: 'redonda', pelo: 'rizado', colorPelo: 'negro', gafas: null, barba: null, ropa: 3 },
        { nombre: 'Antonio', edad: 'mayor', piel: 1, cara: 'redonda', pelo: 'corto', colorPelo: 'blanco', gafas: 'cuadradas', barba: 'bigote', ropa: 1 },
        { nombre: 'Marta', edad: 'media', piel: 3, cara: 'alargada', pelo: 'largo', colorPelo: 'pelirrojo', gafas: null, barba: null, ropa: 2 },
        { nombre: 'Francisco', edad: 'media', piel: 2, cara: 'cuadrada', pelo: 'corto', colorPelo: 'castano', gafas: null, barba: 'barba', ropa: 4 },
        { nombre: 'Laura', edad: 'joven', piel: 1, cara: 'redonda', pelo: 'coleta', colorPelo: 'castano', gafas: 'redondas', barba: null, ropa: 6 },
        { nombre: 'David', edad: 'joven', piel: 2, cara: 'alargada', pelo: 'corto', colorPelo: 'rubio', gafas: null, barba: null, ropa: 5 },
        { nombre: 'Rosa', edad: 'mayor', piel: 3, cara: 'redonda', pelo: 'moño', colorPelo: 'gris', gafas: null, barba: null, ropa: 6 },
        { nombre: 'Pablo', edad: 'media', piel: 4, cara: 'cuadrada', pelo: 'calvo', colorPelo: 'negro', gafas: null, barba: 'barba', ropa: 1 },
        { nombre: 'Isabel', edad: 'media', piel: 2, cara: 'redonda', pelo: 'largo', colorPelo: 'negro', gafas: 'cuadradas', barba: null, ropa: 2 },
        { nombre: 'Sergio', edad: 'joven', piel: 3, cara: 'alargada', pelo: 'rizado', colorPelo: 'castano', gafas: null, barba: 'bigote', ropa: 3 }
      ]
    },

    combustible: {
      precioLitro: 1.55            // Dato de Iván: precio medio del litro.
    },

    // Costes fijos: se cobran una vez al día, al cerrar la caja.
    costesFijos: {
      // Dato de Iván: cuota máxima de autónomo en España, 535 € al mes.
      autonomoDiario: 535 / 30,
      seguroDiarioPorVehiculo: 10, // Dato de Iván: seguro del taxi por día.
      emisoraDiariaPorVehiculo: 3  // Dato de Iván: cuota de la emisora, solo si tienes la mejora.
    },

    licencias: {
      precioBase: 3000,            // Iván (valor de juego): precio de la segunda licencia.
      factorSubida: 1.15,          // Equilibrio: cada licencia cuesta un 15 % más que la anterior.
      maximo: 15812,               // Dato real: licencias en el área de Madrid.
      // Dato real (Iván): la letra de la licencia indica el día de libranza y
      // sale de la última cifra del número. Ej.: 15288-L libra los lunes.
      // Por ahora solo se muestra; la libranza no tiene efecto en el juego.
      // La X del miércoles está por confirmar.
      letraPorCifra: { 7: 'L', 8: 'L', 9: 'M', 0: 'M', 1: 'X', 2: 'X', 3: 'J', 4: 'J', 5: 'V', 6: 'V' }
    },

    vehiculos: {
      modeloInicial: 'turismo',
      // Un solo modelo en la primera versión.
      modelos: {
        turismo: {
          nombre: 'Turismo',
          precio: 1500,              // Iván (valor de juego): precio del coche.
          consumoLitros100Km: 6      // Dato de Iván: consumo medio en ciudad.
        }
      }
    },

    // Zona en la que empieza el jugador.
    zonaInicial: 'centro',

    /*
     * Zonas de Madrid.
     *   busquedaMin  minutos de juego dando vueltas hasta encontrar cliente
     *                cuando hay demanda de sobra (consume combustible).
     *   colaMin      minutos de cola en una parada (no consume combustible).
     *   colaMax      si está, la cola dura al azar entre colaMin y colaMax.
     *   viajes       tipos de carrera con su proporción; km y minutos parados
     *                entran en el taxímetro, "minutos" es lo que dura el viaje.
     *                Con tarifaFija se cobra ese precio fijo en vez del taxímetro
     *                (los km siguen contando para el combustible). Con
     *                tarifa: 't3', bajada de bandera de la tarifa 3 y taxímetro
     *                normal a partir de sus km incluidos.
     *   requiere     mejora que desbloquea la zona (si falta, está abierta).
     *   Los coches que sobran en una zona con cola esperan sin gastar; en una
     *   zona sin cola dan vueltas en vacío y gastan combustible.
     *   variacion    cuánto varía al azar una carrera hecha a mano (0,3 = ±30 %).
     *   demanda      viajes por hora que la zona ofrece a tu empresa, por hora
     *                del día (0 a 23), en laborable y en fin de semana.
     *   factorPorDia multiplica la demanda según el día (lunes a domingo).
     *                Opcional; si falta, vale 1 todos los días.
     */
    zonas: {
      centro: {
        nombre: 'Centro',
        descripcion: 'Muchas carreras cortas, demanda constante.',
        textoEspera: 'Buscando cliente por el centro',
        busquedaMin: 6,           // Equilibrio
        colaMin: 0,
        variacion: 0.4,
        viajes: [                 // Equilibrio
          { proporcion: 0.45, km: 1.8, minParado: 4, minutos: 9 },  // corta: dos calles
          { proporcion: 0.40, km: 3.5, minParado: 7, minutos: 16 }, // media
          { proporcion: 0.15, km: 7, minParado: 9, minutos: 26 }    // larga: a otro barrio
        ],
        demanda: {                // Equilibrio
          //            0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23
          // De madrugada el centro se vacía: la noche es del ocio nocturno.
          laborable:   [2, 1.5, 1.5, 1, 1.5, 3,  8, 16, 24, 26, 22, 20, 22, 24, 24, 20, 20, 22, 26, 26, 22, 14,  8,  4],
          finDeSemana: [6,  5,  4,  3,  2,  2,  4,  8, 12, 16, 20, 22, 24, 24, 22, 20, 20, 22, 24, 22, 18, 12,  9,  7]
        }
      },

      ocio: {
        nombre: 'Ocio nocturno',
        descripcion: 'Solo de noche y sobre todo en fin de semana. Siempre en tarifa 2.',
        textoEspera: 'Esperando a la salida de los locales',
        busquedaMin: 2,           // Equilibrio: hay gente esperando a la salida
        colaMin: 0,
        variacion: 0.4,
        viajes: [
          // Equilibrio: carreras más largas (de vuelta a casa) que en el centro.
          { proporcion: 0.30, km: 4, minParado: 2, minutos: 11 },     // a otra zona de copas
          { proporcion: 0.45, km: 8, minParado: 3, minutos: 20 },     // a casa
          { proporcion: 0.25, km: 13.5, minParado: 4.5, minutos: 30 } // a las afueras
        ],
        demanda: {                // Equilibrio
          //            0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23
          laborable:   [8,  6,  4,  2,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  3,  5,  7],
          finDeSemana: [26, 28, 26, 20, 14, 7,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, 12, 18, 24]
        },
        // Equilibrio: el jueves ya hay ambiente y el viernes noche es el pico;
        // la madrugada del sábado y del domingo usan la tabla de fin de semana.
        //            L    M    X    J    V    S    D
        factorPorDia: [0.6, 0.6, 0.7, 1.2, 1.8, 1.2, 0.8]
      },

      aeropuerto: {
        nombre: 'Aeropuerto',
        descripcion: 'Barajas: carreras caras con tarifa fija, pero con cola en la parada.',
        textoEspera: 'En la cola de la parada de Barajas',
        requiere: 'aeropuerto',
        busquedaMin: 0,
        // Dato de Iván: en la parada de Barajas se espera entre 1 y 2 horas.
        colaMin: 60,
        colaMax: 120,
        variacion: 0.25,
        viajes: [                 // Equilibrio (proporciones y km)
          { proporcion: 0.60, tarifaFija: 't4', km: 15, minParado: 0, minutos: 25 }, // al interior de la M-30
          { proporcion: 0.15, tarifa: 't3', km: 7, minParado: 0, minutos: 12 },     // fuera de la M-30, cerca
          { proporcion: 0.15, tarifa: 't3', km: 18, minParado: 5, minutos: 24 },    // fuera de la M-30, media
          { proporcion: 0.10, tarifa: 't3', km: 32, minParado: 7, minutos: 38 }     // fuera de la M-30, lejos
        ],
        demanda: {                // Equilibrio
          //            0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23
          laborable:   [2,  1,  0,  0,  0,  2,  6, 10, 12, 12, 11, 10, 10, 11, 12, 12, 12, 12, 12, 11, 10,  9,  7,  4],
          finDeSemana: [2,  1,  0,  0,  0,  2,  5,  8, 10, 11, 11, 10, 10, 10, 11, 11, 11, 11, 11, 10, 10,  9,  7,  4]
        }
      },

      estaciones: {
        nombre: 'Estaciones',
        descripcion: 'Atocha y Chamartín: picos de demanda con la llegada de los trenes.',
        textoEspera: 'En la parada de la estación',
        requiere: 'estaciones',
        busquedaMin: 2,
        colaMin: 6,               // Equilibrio
        variacion: 0.4,
        viajes: [                 // Equilibrio
          { proporcion: 0.35, km: 3, minParado: 5, minutos: 11 },   // al hotel de al lado
          { proporcion: 0.45, km: 6, minParado: 7, minutos: 18 },   // a casa
          { proporcion: 0.20, km: 11, minParado: 10, minutos: 29 }  // al otro extremo
        ],
        demanda: {                // Equilibrio: picos de llegada de trenes
          //            0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23
          laborable:   [0,  0,  0,  0,  0,  1,  4, 12, 20, 18, 10,  8, 10, 12, 16, 10,  8, 12, 18, 20, 16, 14, 10,  4],
          finDeSemana: [0,  0,  0,  0,  0,  0,  2,  6, 10, 12, 12, 10, 12, 14, 14, 10, 10, 14, 18, 18, 14, 12,  8,  3]
        }
      }
    },

    /*
     * Mejoras. Cada una se compra una vez.
     *   rama      rama del árbol (ramasMejoras); el orden de la lista es el de la rama.
     *   requiere  mejora anterior de su rama (basta su nivel 1). Sin requiere, es
     *             una de las que abren la rama (puede haber más de una).
     *   efecto    segundosDia: alarga el día (segundos reales)
     *             consumo / busqueda / cola / demanda: multiplicadores
     *             soloZona: el efecto solo cuenta en esa zona
     *             desbloqueaZona: abre una zona
     *             cuotaEmisora: activa el coste diario de la emisora
     *             dejarVolante: permite dejar de conducir y solo gestionar
     *             seguro: multiplica el seguro diario de cada coche
     *             gestionZonas: los conductores eligen la mejor zona cada hora
     *                           (sin ella, eligen al azar entre las que tienen clientes)
     *             propinaProb: suma a la probabilidad de propina
     *             propinaImporte: multiplica el importe de la propina
     *             sinImpagos: nadie se va sin pagar
     *             averiaDias / averiaCoste: multiplican días y coste de una avería
     *             monedasMin / monedasMax: € que encuentra cada conductor al acabar su turno
     *   niveles   mejora por niveles: cada nivel tiene su precio y su efecto
     *             (el efecto del nivel es el total, no se suma al anterior).
     *             inventario: desbloquea un consumible del inventario (config.inventario)
     * Precios y efectos: Equilibrio. Precios revisados el 16-11-2026 (propuesta C): cada
     * mejora se paga en unas 1–2 h de juego con 6 coches (medido con un bot).
     */
    /*
     * Ramas del árbol de mejoras, en el orden de las pestañas.
     */
    ramasMejoras: [
      { id: 'clientes', nombre: 'Clientes' },
      { id: 'ciudad', nombre: 'Ciudad y radio' },
      { id: 'vehiculo', nombre: 'Vehículo' },
      { id: 'taller', nombre: 'Taller y seguros' },
      { id: 'jornada', nombre: 'Conductores y jornada' }
    ],

    mejoras: [
      // ---- Rama: Clientes
      {
        id: 'bolsas', nombre: 'Bolsas de papel', rama: 'clientes', precio: 800,
        descripcion: 'Desbloquea las bolsas de papel en el inventario: con una bolsa a mano, el cliente mareado no vomita en el coche.',
        efecto: { inventario: 'bolsas' }
      },
      {
        id: 'callejero', nombre: 'Callejero al día', rama: 'clientes', precio: 400,
        descripcion: 'Te sabes todas las calles: un 10 % menos de tiempo buscando cliente.',
        efecto: { busqueda: 0.9 }
      },
      {
        id: 'limpieza', nombre: 'Taxi impecable', rama: 'clientes', requiere: 'callejero', precio: 600,
        descripcion: 'Coche limpio y agua para el cliente: un 5 % más de demanda en todas las zonas.',
        efecto: { demanda: 1.05 }
      },
      {
        id: 'propinas', nombre: 'Propinas', rama: 'clientes', requiere: 'limpieza',
        descripcion: 'Trato de primera: más clientes dejan propina y dejan más.',
        niveles: [
          { precio: 1350, descripcion: '+3 puntos de probabilidad y propinas un 15 % mayores.', efecto: { propinaProb: 0.03, propinaImporte: 1.15 } },
          { precio: 1980, descripcion: '+6 puntos y un 30 % mayores.', efecto: { propinaProb: 0.06, propinaImporte: 1.3 } },
          { precio: 2700, descripcion: '+9 puntos y un 45 % mayores.', efecto: { propinaProb: 0.09, propinaImporte: 1.45 } },
          { precio: 3600, descripcion: '+12 puntos y un 60 % mayores.', efecto: { propinaProb: 0.12, propinaImporte: 1.6 } },
          { precio: 4500, descripcion: '+15 puntos y un 80 % mayores.', efecto: { propinaProb: 0.15, propinaImporte: 1.8 } }
        ]
      },
      {
        id: 'datafono', nombre: 'Pago con tarjeta', rama: 'clientes', requiere: 'propinas', precio: 1440,
        descripcion: 'Más gente se sube a tus taxis: un 10 % más de demanda en todas las zonas.',
        efecto: { demanda: 1.1 }
      },
      {
        id: 'camara', nombre: 'Cámara de seguridad', rama: 'clientes', requiere: 'datafono', precio: 1000,
        descripcion: 'Con la cámara a la vista, ningún cliente se va sin pagar.',
        efecto: { sinImpagos: true }
      },
      {
        id: 'clientesFijos', nombre: 'Clientes de siempre', rama: 'clientes', requiere: 'camara', precio: 2000,
        descripcion: 'Vecinos y oficinas que te llaman a ti: un 8 % más de demanda en todas las zonas.',
        efecto: { demanda: 1.08 }
      },
      // ---- Rama: Ciudad y radio
      {
        id: 'aeropuerto', nombre: 'Acreditación de Barajas', rama: 'ciudad', precio: 2000,
        descripcion: 'Abre la zona del aeropuerto, con tarifas fijas de 22 € y 33 €.',
        efecto: { desbloqueaZona: 'aeropuerto' }
      },
      {
        id: 'estaciones', nombre: 'Parada en Atocha y Chamartín', rama: 'ciudad', requiere: 'aeropuerto', precio: 2500,
        descripcion: 'Abre la zona de estaciones, con picos al llegar los trenes.',
        efecto: { desbloqueaZona: 'estaciones' }
      },
      {
        id: 'emisora', nombre: 'Emisora de radio-taxi', rama: 'ciudad', requiere: 'estaciones', precio: 1300,
        descripcion: 'Te pasan clientes por radio: un 30 % menos de tiempo buscando. Tiene cuota diaria por coche.',
        efecto: { busqueda: 0.7, cuotaEmisora: true }
      },
      {
        id: 'paradaOcio', nombre: 'Parada junto a las salas de fiesta', rama: 'ciudad', requiere: 'emisora', precio: 2300,
        descripcion: 'En ocio nocturno: la mitad de tiempo buscando y un 15 % más de demanda.',
        efecto: { busqueda: 0.5, demanda: 1.15, soloZona: 'ocio' }
      },
      {
        id: 'colaBarajas', nombre: 'Turnos coordinados en Barajas', rama: 'ciudad', requiere: 'paradaOcio', precio: 10000,
        descripcion: 'La cola del aeropuerto se reduce un 40 %.',
        efecto: { cola: 0.6, soloZona: 'aeropuerto' }
      },
      {
        id: 'app', nombre: 'App de pedidos', rama: 'ciudad', requiere: 'colaBarajas', precio: 4000,
        descripcion: 'Los clientes te piden por el móvil: otro 30 % menos de tiempo buscando.',
        efecto: { busqueda: 0.7 }
      },
      // ---- Rama: Vehículo
      {
        id: 'conduccionEficiente', nombre: 'Curso de conducción eficiente', rama: 'vehiculo', precio: 800,
        descripcion: 'Todos tus coches gastan un 10 % menos de combustible.',
        efecto: { consumo: 0.9 }
      },
      {
        id: 'neumaticos', nombre: 'Neumáticos de bajo consumo', rama: 'vehiculo', requiere: 'conduccionEficiente', precio: 900,
        descripcion: 'Todos tus coches gastan un 8 % menos de combustible.',
        efecto: { consumo: 0.92 }
      },
      {
        id: 'hibridos', nombre: 'Flota híbrida', rama: 'vehiculo', requiere: 'neumaticos', precio: 4000,
        descripcion: 'Pasas todos tus coches a híbridos: un 35 % menos de combustible.',
        efecto: { consumo: 0.65 }
      },
      // ---- Rama: Taller y seguros
      {
        id: 'rueda', nombre: 'Rueda de repuesto', rama: 'taller', precio: 300,
        descripcion: 'Desbloquea las ruedas de repuesto en el inventario: si un taxi pincha, se cambia la rueda y sigue trabajando sin coste.',
        efecto: { inventario: 'ruedas' }
      },
      {
        id: 'mecanico', nombre: 'Mecánico propio', rama: 'taller', requiere: 'rueda',
        descripcion: 'Un mecánico de confianza: las averías duran menos y cuestan menos.',
        niveles: [
          { precio: 300, descripcion: 'Averías un 15 % más cortas y baratas.', efecto: { averiaDias: 0.85, averiaCoste: 0.85 } },
          { precio: 525, descripcion: 'Un 30 % más cortas y baratas.', efecto: { averiaDias: 0.7, averiaCoste: 0.7 } },
          { precio: 750, descripcion: 'Un 45 % más cortas y un 40 % más baratas.', efecto: { averiaDias: 0.55, averiaCoste: 0.6 } },
          { precio: 1050, descripcion: 'Un 55 % más cortas y la mitad de caras.', efecto: { averiaDias: 0.45, averiaCoste: 0.5 } },
          { precio: 1350, descripcion: 'Un 65 % más cortas y un 60 % más baratas.', efecto: { averiaDias: 0.35, averiaCoste: 0.4 } }
        ]
      },
      {
        id: 'seguroFlota', nombre: 'Póliza de flota', rama: 'taller', requiere: 'mecanico', precio: 700,
        descripcion: 'Aseguras todos los taxis juntos: el seguro de cada coche baja un 20 %.',
        efecto: { seguro: 0.8 }
      },
      {
        id: 'seguridadVial', nombre: 'Curso de seguridad vial', rama: 'taller', requiere: 'seguroFlota', precio: 675,
        descripcion: 'Menos partes de accidente: el seguro de cada coche baja otro 25 %.',
        efecto: { seguro: 0.75 }
      },
      // ---- Rama: Conductores y jornada
      {
        id: 'gestionZonas', nombre: 'Curso gestión de zonas', rama: 'jornada', precio: 2500,
        descripcion: 'Tus conductores aprenden a moverse: cada hora se van a la zona que más les conviene, en vez de elegir a ojo.',
        efecto: { gestionZonas: true }
      },
      {
        id: 'esterillas', nombre: 'Sacudir esterillas', rama: 'jornada',
        descripcion: 'Al acabar su turno, cada conductor sacude las esterillas y encuentra unas monedas.',
        niveles: [
          { precio: 450, descripcion: 'De 0,50 a 2 € por turno.', efecto: { monedasMin: 0.5, monedasMax: 2 } },
          { precio: 720, descripcion: 'De 1 a 3 € por turno.', efecto: { monedasMin: 1, monedasMax: 3 } },
          { precio: 990, descripcion: 'De 1,50 a 4,50 € por turno.', efecto: { monedasMin: 1.5, monedasMax: 4.5 } },
          { precio: 1350, descripcion: 'De 2 a 6 € por turno.', efecto: { monedasMin: 2, monedasMax: 6 } },
          { precio: 1800, descripcion: 'De 3 a 8 € por turno.', efecto: { monedasMin: 3, monedasMax: 8 } }
        ]
      },
      {
        id: 'jornada1', nombre: 'Jornada larga I', rama: 'jornada', requiere: 'esterillas', precio: 400,
        descripcion: 'El día dura 10 segundos más: más carreras con los mismos costes fijos diarios.',
        efecto: { segundosDia: 10 }
      },
      {
        id: 'jornada2', nombre: 'Jornada larga II', rama: 'jornada', requiere: 'jornada1', precio: 700,
        descripcion: 'El día dura otros 10 segundos más.',
        efecto: { segundosDia: 10 }
      },
      {
        id: 'jornada3', nombre: 'Jornada larga III', rama: 'jornada', requiere: 'jornada2', precio: 1000,
        descripcion: 'El día dura otros 10 segundos más.',
        efecto: { segundosDia: 10 }
      },
      {
        id: 'oficina', nombre: 'Oficina de gestión', rama: 'jornada', requiere: 'jornada3', precio: 6000,
        descripcion: 'Puedes dejar el volante y dedicarte solo a gestionar la flota. Tu turno queda libre para un conductor.',
        efecto: { dejarVolante: true }
      },
      {
        id: 'jornada4', nombre: 'Jornada larga IV', rama: 'jornada', requiere: 'oficina', precio: 1400,
        descripcion: 'El día dura 15 segundos más.',
        efecto: { segundosDia: 15 }
      }
    ]
  };
})(globalThis);
