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
    versionGuardado: 1,

    reloj: {
      // Decisión de diseño: un día de juego dura 2 minutos reales al principio.
      segundosPorDia: 120,
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
      t2: { nombre: 'Tarifa 2', inicio: 3.20, porKm: 1.60, porHora: 29.00 }
    },

    economia: {
      dineroInicial: 50,          // Equilibrio: caja con la que empiezas.
      // Equilibrio: por debajo de estos viajes por hora la zona se considera
      // vacía y no se puede buscar cliente a mano.
      demandaMinimaManual: 0.5
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
      // PROVISIONAL: parte de la recaudación que se queda el conductor.
      // Iván pondrá el valor habitual del sector.
      porcentaje: 0.40,
      costeContratacion: 1200,     // Equilibrio: pago único al contratar.
      nombres: [
        'Ana', 'Luis', 'Carmen', 'Javier', 'Lucía', 'Manuel', 'Elena', 'Antonio',
        'Marta', 'Francisco', 'Laura', 'David', 'Rosa', 'Pablo', 'Isabel', 'Sergio',
        'Pilar', 'Raúl', 'Cristina', 'Jorge', 'Beatriz', 'Alberto', 'Nuria', 'Fernando'
      ]
    },

    combustible: {
      precioLitro: 1.55            // PROVISIONAL: precio medio del litro.
    },

    // Costes fijos: se cobran una vez al día, al cerrar la caja.
    costesFijos: {
      autonomoDiario: 10,          // PROVISIONAL: cuota de autónomo repartida por día.
      seguroDiarioPorVehiculo: 4   // PROVISIONAL: seguro del taxi repartido por día.
    },

    vehiculos: {
      modeloInicial: 'turismo',
      // Un solo modelo en la primera versión.
      modelos: {
        turismo: {
          nombre: 'Turismo',
          consumoLitros100Km: 7      // PROVISIONAL: consumo medio en ciudad.
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
     *   viajes       tipos de carrera con su proporción; km y minutos parados
     *                entran en el taxímetro, "minutos" es lo que dura el viaje.
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
        variacion: 0.3,
        viajes: [
          { proporcion: 1, km: 3.2, minParado: 6, minutos: 15 } // Equilibrio
        ],
        demanda: {                // Equilibrio
          //            0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23
          laborable:   [4,  3,  2,  2,  2,  4,  8, 16, 24, 26, 22, 20, 22, 24, 24, 20, 20, 22, 26, 26, 22, 16, 10,  6],
          finDeSemana: [10, 9,  7,  5,  3,  3,  4,  8, 12, 16, 20, 22, 24, 24, 22, 20, 20, 22, 24, 22, 18, 14, 12, 12]
        }
      },

      ocio: {
        nombre: 'Ocio nocturno',
        descripcion: 'Solo de noche y sobre todo en fin de semana. Siempre en tarifa 2.',
        textoEspera: 'Esperando a la salida de los locales',
        busquedaMin: 4,           // Equilibrio
        colaMin: 0,
        variacion: 0.35,
        viajes: [
          { proporcion: 1, km: 5.5, minParado: 4, minutos: 16 } // Equilibrio
        ],
        demanda: {                // Equilibrio
          //            0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23
          laborable:   [6,  4,  3,  2,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  3,  4,  6],
          finDeSemana: [24, 26, 24, 18, 12, 6,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, 10, 16, 22]
        },
        // Equilibrio: el viernes noche se anima; la madrugada del sábado y del
        // domingo usan la tabla de fin de semana.
        //            L    M    X    J    V    S    D
        factorPorDia: [0.5, 0.5, 0.6, 0.9, 1.6, 1.0, 0.7]
      }
    }
  };
})(globalThis);
