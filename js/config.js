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
    versionGuardado: 6,

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
      // Tarifa 3: salidas de Barajas a destinos fuera de la M-30 de menos de 9 km.
      t3: { nombre: 'Tarifa 3', fija: 22.00 },
      // Tarifa 4: entre Barajas y el interior de la M-30, sin suplementos.
      t4: { nombre: 'Tarifa 4', fija: 33.00 }
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
      costeContratacion: 600,      // Equilibrio: pago único al contratar.
      nombres: [
        'Ana', 'Luis', 'Carmen', 'Javier', 'Lucía', 'Manuel', 'Elena', 'Antonio',
        'Marta', 'Francisco', 'Laura', 'David', 'Rosa', 'Pablo', 'Isabel', 'Sergio',
        'Pilar', 'Raúl', 'Cristina', 'Jorge', 'Beatriz', 'Alberto', 'Nuria', 'Fernando'
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
     *   viajes       tipos de carrera con su proporción; km y minutos parados
     *                entran en el taxímetro, "minutos" es lo que dura el viaje.
     *                Con tarifaFija se cobra ese precio fijo en vez del taxímetro
     *                (los km siguen contando para el combustible).
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
        colaMin: 35,              // Equilibrio
        variacion: 0.25,
        viajes: [                 // Equilibrio (proporciones y km)
          { proporcion: 0.60, tarifaFija: 't4', km: 15, minParado: 0, minutos: 25 }, // al interior de la M-30
          { proporcion: 0.15, tarifaFija: 't3', km: 7, minParado: 0, minutos: 12 },  // fuera de la M-30, < 9 km
          { proporcion: 0.15, km: 18, minParado: 5, minutos: 24 },                   // con taxímetro, cerca
          { proporcion: 0.10, km: 32, minParado: 7, minutos: 38 }                    // con taxímetro, lejos
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
     *   requiere  otra mejora que hay que tener antes (opcional).
     *   efecto    segundosDia: alarga el día (segundos reales)
     *             consumo / busqueda / cola / demanda: multiplicadores
     *             soloZona: el efecto solo cuenta en esa zona
     *             desbloqueaZona: abre una zona
     *             cuotaEmisora: activa el coste diario de la emisora
     *             dejarVolante: permite dejar de conducir y solo gestionar
     *             seguro: multiplica el seguro diario de cada coche
     * Precios y efectos: Equilibrio.
     */
    mejoras: [
      // Ordenadas por precio: siempre hay una a tiro para que el ritmo no se pare.
      {
        id: 'callejero', nombre: 'Callejero al día', precio: 400,
        descripcion: 'Te sabes todas las calles: un 10 % menos de tiempo buscando cliente.',
        efecto: { busqueda: 0.9 }
      },
      {
        id: 'conduccionEficiente', nombre: 'Curso de conducción eficiente', precio: 800,
        descripcion: 'Todos tus coches gastan un 10 % menos de combustible.',
        efecto: { consumo: 0.9 }
      },
      {
        id: 'limpieza', nombre: 'Taxi impecable', precio: 1200,
        descripcion: 'Coche limpio y agua para el cliente: un 5 % más de demanda en todas las zonas.',
        efecto: { demanda: 1.05 }
      },
      {
        id: 'jornada1', nombre: 'Jornada larga I', precio: 1500,
        descripcion: 'El día dura 10 segundos más: más carreras con los mismos costes fijos diarios.',
        efecto: { segundosDia: 10 }
      },
      {
        id: 'aeropuerto', nombre: 'Acreditación de Barajas', precio: 2000,
        descripcion: 'Abre la zona del aeropuerto, con tarifas fijas de 22 € y 33 €.',
        efecto: { desbloqueaZona: 'aeropuerto' }
      },
      {
        id: 'neumaticos', nombre: 'Neumáticos de bajo consumo', precio: 2200,
        descripcion: 'Todos tus coches gastan un 8 % menos de combustible.',
        efecto: { consumo: 0.92 }
      },
      {
        id: 'estaciones', nombre: 'Parada en Atocha y Chamartín', precio: 2500,
        descripcion: 'Abre la zona de estaciones, con picos al llegar los trenes.',
        efecto: { desbloqueaZona: 'estaciones' }
      },
      {
        id: 'emisora', nombre: 'Emisora de radio-taxi', precio: 3000,
        descripcion: 'Te pasan clientes por radio: un 30 % menos de tiempo buscando. Tiene cuota diaria por coche.',
        efecto: { busqueda: 0.7, cuotaEmisora: true }
      },
      {
        id: 'paradaOcio', nombre: 'Parada junto a las salas de fiesta', precio: 3500,
        descripcion: 'En ocio nocturno: la mitad de tiempo buscando y un 15 % más de demanda.',
        efecto: { busqueda: 0.5, demanda: 1.15, soloZona: 'ocio' }
      },
      {
        id: 'seguroFlota', nombre: 'Póliza de flota', precio: 4000,
        descripcion: 'Aseguras todos los taxis juntos: el seguro de cada coche baja un 20 %.',
        efecto: { seguro: 0.8 }
      },
      {
        id: 'jornada2', nombre: 'Jornada larga II', precio: 4500, requiere: 'jornada1',
        descripcion: 'El día dura otros 10 segundos más.',
        efecto: { segundosDia: 10 }
      },
      {
        id: 'datafono', nombre: 'Pago con tarjeta', precio: 5000,
        descripcion: 'Más gente se sube a tus taxis: un 10 % más de demanda en todas las zonas.',
        efecto: { demanda: 1.1 }
      },
      {
        id: 'clientesFijos', nombre: 'Clientes de siempre', precio: 7000, requiere: 'datafono',
        descripcion: 'Vecinos y oficinas que te llaman a ti: un 8 % más de demanda en todas las zonas.',
        efecto: { demanda: 1.08 }
      },
      {
        id: 'seguridadVial', nombre: 'Curso de seguridad vial', precio: 9000, requiere: 'seguroFlota',
        descripcion: 'Menos partes de accidente: el seguro de cada coche baja otro 25 %.',
        efecto: { seguro: 0.75 }
      },
      {
        id: 'colaBarajas', nombre: 'Turnos coordinados en Barajas', precio: 10000, requiere: 'aeropuerto',
        descripcion: 'La cola del aeropuerto se reduce un 40 %.',
        efecto: { cola: 0.6, soloZona: 'aeropuerto' }
      },
      {
        id: 'jornada3', nombre: 'Jornada larga III', precio: 11000, requiere: 'jornada2',
        descripcion: 'El día dura otros 10 segundos más.',
        efecto: { segundosDia: 10 }
      },
      {
        id: 'app', nombre: 'App de pedidos', precio: 12000, requiere: 'emisora',
        descripcion: 'Los clientes te piden por el móvil: otro 30 % menos de tiempo buscando.',
        efecto: { busqueda: 0.7 }
      },
      {
        id: 'oficina', nombre: 'Oficina de gestión', precio: 12000,
        descripcion: 'Puedes dejar el volante y dedicarte solo a gestionar la flota. Tu turno queda libre para un conductor.',
        efecto: { dejarVolante: true }
      },
      {
        id: 'hibridos', nombre: 'Flota híbrida', precio: 15000,
        descripcion: 'Pasas todos tus coches a híbridos: un 35 % menos de combustible.',
        efecto: { consumo: 0.65 }
      },
      {
        id: 'jornada4', nombre: 'Jornada larga IV', precio: 22000, requiere: 'jornada3',
        descripcion: 'El día dura 15 segundos más.',
        efecto: { segundosDia: 15 }
      }
    ]
  };
})(globalThis);
