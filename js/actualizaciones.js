/*
 * Libre · historial de actualizaciones (Iván, 19-11-2026). Lo enseña el
 * panel «Actualizaciones» de la hoja de Ajustes. Solo interfaz: no son
 * números del juego. Al terminar una actualización, se añade aquí (número
 * siguiente, en el grupo de su día) y en docs/historial.md.
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};
  Libre.actualizaciones = [
    {
      "fecha": "2026-11-13",
      "titulo": "Base del juego",
      "cambios": [
        {
          "n": 1,
          "texto": "Primera versión: el reloj del juego y tu taxi, que conduces a clic."
        },
        {
          "n": 2,
          "texto": "Zonas Centro y Ocio nocturno, combustible y cierre de caja diario."
        },
        {
          "n": 3,
          "texto": "La partida se guarda sola; puedes exportarla e importarla."
        },
        {
          "n": 4,
          "texto": "Primer conductor: turnos de día y de noche, y el taxi trabaja solo."
        },
        {
          "n": 5,
          "texto": "Comprar licencias (cada una más cara) y coches."
        },
        {
          "n": 6,
          "texto": "Aeropuerto (tarifas 3 y 4), Estaciones y las 11 primeras mejoras."
        },
        {
          "n": 7,
          "texto": "Progreso sin conexión, con un resumen al volver."
        },
        {
          "n": 8,
          "texto": "Taxímetro en el centro con el importe en vivo, importes que saltan al cobrar, barra hacia la siguiente compra, cielo según la hora y zonas en tarjetas."
        },
        {
          "n": 9,
          "texto": "Pausa al cerrar el día y resumen como ticket de papel térmico."
        },
        {
          "n": 10,
          "texto": "Solo haces carreras dentro de tu turno; el día cambia a las 7:00."
        },
        {
          "n": 11,
          "texto": "Menú inferior con pestañas."
        },
        {
          "n": 12,
          "texto": "Tu turno siempre es a clic; dejar el volante es la mejora «Oficina de gestión»."
        },
        {
          "n": 13,
          "texto": "Combustible, cuota de autónomo, seguro, emisora y porcentaje del conductor con cifras reales."
        },
        {
          "n": 14,
          "texto": "Viajes más variados y demanda distinta cada jornada."
        },
        {
          "n": 15,
          "texto": "Ritmo de la partida: día más corto, seis mejoras intermedias y precios de licencia y coche revisados."
        }
      ]
    },
    {
      "fecha": "2026-11-16",
      "titulo": "Conductores y eventos",
      "cambios": [
        {
          "n": 16,
          "texto": "El coche cuesta 1.500 € y los conductores hacen carreras de verdad, cobrando al terminar cada una."
        },
        {
          "n": 17,
          "texto": "Eventos: propinas, clientes que no pagan, vómitos, objetos olvidados, pinchazos, bajas, averías y lluvia."
        },
        {
          "n": 18,
          "texto": "Mejoras nuevas (propinas, rueda de repuesto, cámara, mecánico propio y esterillas) y árbol de mejoras con cinco ramas."
        },
        {
          "n": 19,
          "texto": "Retratos de los conductores y varios taxis en la calle."
        },
        {
          "n": 20,
          "texto": "Los conductores eligen su zona; nueva mejora «Curso gestión de zonas»."
        },
        {
          "n": 21,
          "texto": "Ruedas de repuesto y bolsas como consumibles; más vómitos de noche y en Ocio."
        },
        {
          "n": 22,
          "texto": "Tarifa 3 y cola de Barajas con datos reales."
        },
        {
          "n": 23,
          "texto": "Nueva pantalla Calle: taxímetro con modo conductor y modo flota, «Tus taxis hoy» y zonas compactas."
        },
        {
          "n": 24,
          "texto": "Conductores con cualidades y defectos, experiencia y 10 niveles, objetos equipables y finiquito al despedir."
        }
      ]
    },
    {
      "fecha": "2026-11-17",
      "titulo": "Categorías, objetos y nuevo aspecto",
      "cambios": [
        {
          "n": 25,
          "texto": "Los conductores encuentran objetos: 24 con categoría, que se venden o esperan en la bandeja."
        },
        {
          "n": 26,
          "texto": "Categorías de conductor: B, A, S, S+ y LEGENDARIO, cada una con su color."
        },
        {
          "n": 27,
          "texto": "Reserva de conductores y cambiarlos de sitio entre jornadas."
        },
        {
          "n": 28,
          "texto": "Libranza según la letra de la licencia; al comprar eliges entre dos placas."
        },
        {
          "n": 29,
          "texto": "Premio al llegar al nivel 10; los conductores B traen dos defectos."
        },
        {
          "n": 30,
          "texto": "Pantalla de conductores más compacta: dos licencias por fila."
        },
        {
          "n": 31,
          "texto": "Almacén de 10 objetos y mejora «Taquillas» para ampliarlo."
        },
        {
          "n": 32,
          "texto": "Jornada larga en una sola mejora de 5 niveles y mejora nueva «Deflectores de viento»."
        },
        {
          "n": 33,
          "texto": "El ticket dice qué licencias trabajaron ese día."
        },
        {
          "n": 34,
          "texto": "Nuevo aspecto del juego: letras, colores, cabecera con la calle, todas las pantallas rehechas, dibujos de los objetos, sonidos y logo."
        },
        {
          "n": 35,
          "texto": "Los días de libranza puedes saltar al cierre si nadie puede trabajar."
        },
        {
          "n": 36,
          "texto": "«Tus taxis hoy» con rareza, nivel y licencia; Calle cabe sin desplazar con 5 taxis."
        },
        {
          "n": 37,
          "texto": "Ficha del conductor con sus estadísticas reales y de dónde sale cada una."
        },
        {
          "n": 38,
          "texto": "Candidatos nuevos cada día."
        },
        {
          "n": 39,
          "texto": "Rasgos equilibrados y tres nuevos: Pulcro, Guarro y Aprovechado."
        },
        {
          "n": 40,
          "texto": "La categoría pesa más que el nivel (un LEGENDARIO deja ~50 % más que un B) y precios de contratación según lo que deja cada categoría."
        }
      ]
    },
    {
      "fecha": "2026-11-18",
      "titulo": "Mejoras, objetos y estadísticas",
      "cambios": [
        {
          "n": 41,
          "texto": "Mover conductores en el móvil (mantener y tocar) y comparar dos conductores."
        },
        {
          "n": 42,
          "texto": "Nuevos precios: licencia a 2.500 €, Oficina a 4.000 € y Curso de zonas a 2.000 €."
        },
        {
          "n": 43,
          "texto": "«Siguiente» propone lo que hace crecer tu flota."
        },
        {
          "n": 44,
          "texto": "Mejora «Departamento de RRHH»: candidatos de mejor categoría."
        },
        {
          "n": 45,
          "texto": "Combinar objetos: tres de una categoría por uno de la siguiente."
        },
        {
          "n": 46,
          "texto": "Objetos: venta más barata, Bolsa, Cámara y Rueda pasan a ser objetos, diez objetos nuevos y una frase para cada uno."
        },
        {
          "n": 47,
          "texto": "Pinchazos, bajas, averías y clientes que no pagan pasan más a menudo."
        },
        {
          "n": 48,
          "texto": "Cualidad Urraca y su opuesto, Desastre."
        },
        {
          "n": 49,
          "texto": "Árbol de mejoras entero en una pantalla, con un icono por mejora y cada rama en orden."
        },
        {
          "n": 50,
          "texto": "Mejoras nuevas, entre ellas Grúa propia, Leasing de coches y Mampara."
        },
        {
          "n": 51,
          "texto": "Ticket ordenado por bloques, con el neto al final y los gastos en rojo."
        },
        {
          "n": 52,
          "texto": "Pestaña Estadísticas: facturación por día, medias y top 10."
        },
        {
          "n": 53,
          "texto": "Nueva frase del Rosario del retrovisor; placas siempre con 5 cifras."
        },
        {
          "n": 54,
          "texto": "Cualidad Anfibio (cobra más con lluvia) y defecto Azucarillo (no trabaja con lluvia)."
        },
        {
          "n": 55,
          "texto": "Chubascos y tormentas, con escena de tormenta: rayos, viento y hojas."
        }
      ]
    },
    {
      "fecha": "2026-11-19",
      "titulo": "Coches y kilómetros",
      "cambios": [
        {
          "n": 56,
          "texto": "Avisos de lado a lado de la pantalla; los de conductores salen solo en Calle y Conductores."
        },
        {
          "n": 57,
          "texto": "Cada coche lleva sus kilómetros; el primero es de segunda mano."
        },
        {
          "n": 58,
          "texto": "Mejora «Neumáticos de alta gama»: un 35 % menos de pinchazos."
        },
        {
          "n": 59,
          "texto": "Mecánico, Mampara y App de pedidos un 10 % más baratos; Salas de fiesta a 2.700 € con +30 % de demanda en Ocio."
        },
        {
          "n": 60,
          "texto": "Los coches hacen más kilómetros, como en la realidad (y gastan más combustible)."
        },
        {
          "n": 61,
          "texto": "Avería definitiva por kilómetros y «Renovar coche» en la hoja de cada coche."
        },
        {
          "n": 62,
          "texto": "Panel de actualizaciones en Ajustes."
        },
        {
          "n": 63,
          "texto": "Salen menos objetos (0,9 % por carrera), subir de categoría combinando cuesta más (3 B, 4 A, 4 S y 5 S+) y eliges qué objetos gastas."
        },
        {
          "n": 64,
          "texto": "Los kilómetros de cada licencia son ahora un botón del color del estado del coche: tócalo para ver el coche y renovarlo."
        },
        {
          "n": 65,
          "texto": "Arreglos: importar partida ya acepta el texto copiado desde el móvil y se confirma en la misma hoja; las fichas no vuelven arriba cuando sale un aviso."
        }
      ]
    },
    {
      "fecha": "2026-11-20",
      "titulo": "Alquiler, modo incógnito y avisos",
      "cambios": [
        {
          "n": 66,
          "texto": "Los avisos de eventos (conductores, lluvia, averías…) salen solo en la pestaña Calle."
        },
        {
          "n": 67,
          "texto": "Alquilar coche: una licencia sin coche puede alquilar uno 3 días por 400 € (no se gasta y se devuelve solo); los conductores de una licencia sin coche se siguen viendo."
        },
        {
          "n": 68,
          "texto": "Mejora «Modo incógnito» (15.000 €, tras la Oficina): tus conductores de nivel 10 trabajan también los días que libra su licencia… si no los pilla un pesetas (multa de 2.000 €)."
        },
        {
          "n": 69,
          "texto": "Iconos nuevos: Modo incógnito (sombrero y gafas) y Neumáticos de alta gama (rueda con un +)."
        },
        {
          "n": 70,
          "texto": "Mejora «Depósito de GLP» (4.800 €), la última de la rama Vehículo: un 30 % menos de combustible."
        },
        {
          "n": 71,
          "texto": "16 conductores nuevos (32 en total) y retratos con gafas de sol, gorra, pajarita, traje y pendientes."
        },
        {
          "n": 72,
          "texto": "Mejora «Incógnito al volante» (400 €): conduces en la libranza de tu licencia. Si un pesetas te mira, el taxímetro avisa con una cuenta atrás: no cargues hasta que se vaya o te cae una multa de 2.000 €."
        },
        {
          "n": 73,
          "texto": "Taxi nuevo en la cabecera: una berlina más detallada (ventanillas, puertas, manetas, faros y llantas)."
        },
        {
          "n": 74,
          "texto": "El taxi de la cabecera, un 15 % más grande, y el Almacén dice cuánto vale todo lo que guardas."
        },
        {
          "n": 75,
          "texto": "Nuevo fondo de Madrid en la cabecera: Cuatro Torres, Torrespaña, Torres KIO, Metrópolis, Telefónica y la Puerta de Alcalá, árboles más detallados y gente paseando."
        },
        {
          "n": 76,
          "texto": "Un repartidor en bici con su mochila verde cruza la calle de la cabecera."
        },
        {
          "n": 77,
          "texto": "La bici del repartidor, con más detalle, y su mochila de Uber Eats."
        },
        {
          "n": 78,
          "texto": "Más gente por la acera, un segundo repartidor (Just Eat) en sentido contrario y la placa de la caja más transparente para ver la calle."
        },
        {
          "n": 79,
          "texto": "Un autobús azul de la EMT cruza la cabecera en sentido contrario al taxi, cada uno por su carril."
        },
        {
          "n": 80,
          "texto": "Arreglo: el taxi de la cabecera ya se ve entero también en móviles de pantalla baja."
        },
        {
          "n": 81,
          "texto": "El autobús de la EMT, ahora articulado y con mucho más detalle: fuelle, puertas, letreros de la línea y llantas azules."
        },
        {
          "n": 82,
          "texto": "Los cristales del autobús dejan ver un poco lo que hay detrás."
        },
        {
          "n": 83,
          "texto": "Para tener más de 3 licencias hay que montar una sociedad limitada (3.000 € y 10 € por conductor cada jornada) y ponerle nombre a tu flota, que sale en una placa junto al logo."
        },
        {
          "n": 84,
          "texto": "Arreglos: la hoja para ponerle nombre a la SL sale arriba (el teclado del móvil ya no la tapa) y en la ficha del conductor los botones van antes de las estadísticas."
        }
      ]
    }
  ];
})(globalThis);
