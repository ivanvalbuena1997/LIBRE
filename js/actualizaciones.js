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
    },
    {
      "fecha": "2026-11-21",
      "titulo": "Precio de los coches",
      "cambios": [
        {
          "n": 85,
          "texto": "Los coches suben un 10 % por cada uno que ya tienes, igual que el alquiler, para que al final de la partida no salgan regalados (renovar o reponer uno cuesta lo que tu último coche)."
        },
        {
          "n": 86,
          "texto": "El perro que pasea por la acera ya no mueve las patas en el aire: ahora pisa el suelo y tiene orejas, hocico, collar, pelaje y una cola que se mueve."
        },
        {
          "n": 87,
          "texto": "Las ruedas del taxi, de las bicis y del autobús ya giran cuando avanzan por la calle."
        },
        {
          "n": 88,
          "texto": "Arreglo: el giro de las ruedas casi no se veía. Ahora el taxi lleva llantas de cinco radios, las bicis un reflectante naranja y el autobús tuercas más grandes."
        },
        {
          "n": 89,
          "texto": "El juego descarga siempre sus archivos al abrirlo, así las actualizaciones se ven enseguida sin tener que borrar nada del navegador."
        }
      ]
    },
    {
      "fecha": "2026-11-22",
      "titulo": "Zonas más a mano",
      "cambios": [
        {
          "n": 90,
          "texto": "Las zonas de la pestaña Calle van ahora justo debajo del taxímetro: con muchos taxis ya se ven a la vez que conduces."
        },
        {
          "n": 91,
          "texto": "Arreglo: de noche, la luz del faro del taxi se veía cortada. Ahora es un haz que sale del faro y se apaga poco a poco."
        },
        {
          "n": 92,
          "texto": "Farolas a lo largo de la acera de la calle, que se encienden de noche con una luz suave."
        },
        {
          "n": 93,
          "texto": "En la hoja de cada mejora comprada sale cuánto te ha hecho ganar o ahorrar: Publicidad, esterillas, combustible, seguro, averías, pinchazos y Leasing. En las demás no se puede saber y no sale nada."
        },
        {
          "n": 94,
          "texto": "Nueva mejora «Gestoría propia», al final de Taller y seguros: con la SL montada, abarata su tasa diaria un 30, 60 o 90 % en tres niveles (3.000, 4.500 y 7.000 €)."
        },
        {
          "n": 95,
          "texto": "Nueva mejora «Cazatalentos» (25.000 €), la última de Conductores y jornada: en la hoja de candidatos puedes buscar otros al momento por 1.000 €; cada búsqueda del mismo día cuesta el doble y al cerrar la caja vuelve a 1.000 €."
        },
        {
          "n": 96,
          "texto": "La partida ya no avanza con el juego cerrado ni con la pestaña escondida o el móvil bloqueado: al volver sigue exactamente donde la dejaste."
        },
        {
          "n": 97,
          "texto": "Limpieza: se quita del juego todo lo que hacía avanzar la partida sin estar delante (el cálculo de las horas fuera y sus multas)."
        }
      ]
    },
    {
      "fecha": "2026-11-23",
      "titulo": "Cansancio",
      "cambios": [
        {
          "n": 98,
          "texto": "Los conductores se cansan: una barra de energía se gasta trabajando y, al vaciarse, paran a descansar 30 minutos de juego (unas 3 veces por turno). La energía sale en su ficha."
        },
        {
          "n": 99,
          "texto": "Tú también te cansas: tus carreras gastan tu energía (sale en el taxímetro) y, al vaciarse, descansas 30 minutos de juego."
        },
        {
          "n": 100,
          "texto": "Rasgos y objetos para el cansancio: Incansable y Siesta exprés (y sus contrarios, Blandengue y Remolón), el Antifaz de avión, el Ventilador de pinza y el legendario Café con porras de las 6 de la mañana. El Termo de café y la Silla ergonómica ahora también quitan cansancio."
        },
        {
          "n": 101,
          "texto": "Dos mejoras para el cansancio: el Climatizador bizona (todos se cansan un 15 % menos, tú también) y la Máquina de café en la cochera (descansos de 25 y luego 20 minutos). La máquina va antes del Departamento de RRHH."
        },
        {
          "n": 102,
          "texto": "Los códigos para exportar e importar partidas son unas 3 veces más cortos (van comprimidos y empiezan por LIBRE2). Los de antes se siguen pudiendo importar."
        },
        {
          "n": 103,
          "texto": "Ajustes tras medir: Pago con tarjeta da un 15 % más de demanda (antes un 10 %), el Climatizador bizona quita un 25 % de cansancio (antes un 15 %, y con icono nuevo) y la Máquina de café acorta los descansos un 22 % y un 38 % (antes un 17 % y un 33 %)."
        },
        {
          "n": 104,
          "texto": "A prueba: la racha. Si encadenas carreras sin despistarte (menos de un segundo entre cobrar y buscar la siguiente), cada una cobra un 1 % más, hasta un 10 %. Se corta si te despistas, si descansas o al acabar tu turno. Sale arriba en el taxímetro."
        },
        {
          "n": 105,
          "texto": "La racha es más difícil y se ve mejor. El tiempo para encadenar se acorta a medida que subes: un segundo al empezar y medio segundo en el máximo. Tras cobrar, una raya ámbar bajo las cifras se vacía con el tiempo que te queda. El taxímetro se ilumina como una recreativa: se enciende una luz bajo la tarifa por cada carrera encadenada, el marco y las cifras brillan cada vez más, y en el máximo parpadean."
        },
        {
          "n": 106,
          "texto": "La racha suena como una recreativa: cada carrera que encadenas hace un «blip» más agudo que el anterior, al llegar al máximo suena una fanfarria y, si la pierdes, una nota que se cae."
        }
      ]
    },
    {
      "fecha": "2026-11-24",
      "titulo": "Tu personaje",
      "cambios": [
        {
          "n": 107,
          "texto": "Tu personaje empieza a ganar experiencia: 4 puntos por cada carrera tuya, 1 por cada carrera de tus conductores y 1 por cada objeto legendario que vendas. Al subir de nivel te avisa. Es la base de lo que viene: la hoja de tu personaje, sus mejoras y el prestigio."
        },
        {
          "n": 108,
          "texto": "Botón nuevo en la cabecera, junto al engranaje: tu personaje, con tu nivel en una insignia. Al tocarlo ves tu nivel, la barra de experiencia con lo que falta para el siguiente y cómo se gana. Las gamas de coche (Tesla Model 3 y Mercedes Clase S) quedan anotadas para cuando lleguen las mejoras del personaje."
        },
        {
          "n": 109,
          "texto": "Las mejoras de tu personaje ya existen y salen en su hoja: Racha, Racha larga, Reflejos de taxista, Incógnito al volante, Fondo físico (en el nivel V, Incansable), Callejero de memoria, Ahorros, Coche a estrenar, Agenda de contactos, Veterano y las gamas Tesla y Mercedes. Cuestan puntos de prestigio, no euros, y se conseguirán al reiniciar (próxima actualización). La racha deja de estar para todos e Incógnito al volante sale del árbol de mejoras: si la habías comprado, la conservas."
        },
        {
          "n": 110,
          "texto": "Ya puedes empezar de cero. Desde el nivel 3 de taxista, en la hoja de tu personaje sale el botón «Empezar de cero»: eliges en qué mejoras gastas tus puntos de prestigio (uno por nivel), confirmas y empiezas una partida nueva con ellas. Se pierde todo lo demás y tu nivel vuelve a 0; los puntos que no gastes se guardan para la próxima vez. Además, el coche del principio se llama Toyota Corolla."
        },
        {
          "n": 111,
          "texto": "Prestigio más justo: cada nivel da tantos puntos como su número (el nivel 5 da 5, así que una partida que llega al 5 junta 15) y las mejoras del personaje cuestan el triple. Antes compensaba reiniciar siempre en el nivel 3; ahora llegar lejos también merece la pena: llegando al nivel 7, tenerlo todo pide unos 11 reinicios."
        },
        {
          "n": 112,
          "texto": "Gamas de coche: si las desbloqueas con las mejoras de tu personaje, al comprar coche eliges entre el Toyota Corolla (1.500 €), el Tesla Model 3 (3.500 €: eléctrico, la carga cuesta mucho menos, se avería mucho menos y cansa un 20 % menos) y el Mercedes Clase S (5.000 €: muchas más propinas, la mitad de impagos y más clientes en el Centro y el Aeropuerto, pero gasta más y sus reparaciones cuestan más). Híbridos y GLP ya solo afectan a los coches de gasolina."
        },
        {
          "n": 113,
          "texto": "El Mercedes Clase S, un 10 % mejor: aún más propinas (2,2 veces más a menudo y un 65 % mayores), menos clientes que se van sin pagar y algo más de clientes en el Centro y el Aeropuerto."
        },
        {
          "n": 114,
          "texto": "Tu personaje, rediseñado: tu cara en el botón de la cabecera y en grande en su hoja, con un lápiz para cambiarla (piel, cara, edad, pelo y su color, barba, gafas, ropa, cuello, gorra y pendientes) y ponerte nombre. Las mejoras van en pestañas (Al volante, Al empezar, Coches), cada una en una tarjeta con su icono y el color de su estado. Tu cara y tu nombre salen también en Tus taxis hoy, en Conductores y en Estadísticas, y se conservan al empezar de cero."
        }
      ]
    },
    {
      "fecha": "2026-11-25",
      "titulo": "Arreglos",
      "cambios": [
        {
          "n": 115,
          "texto": "Arreglos: tus carreras siguen el azar guardado en la partida (como las de tus conductores) y el aviso de cuando no conduces ya manda a Conductores (antes decía Flota, una pestaña que ya no existe)."
        },
        {
          "n": 116,
          "texto": "Para guiarte mejor: con una sola licencia, en Mejoras solo puedes comprar la primera mejora de cada rama; el resto se abre con tu 2.ª licencia. Y Racha larga y Reflejos de taxista piden también Fondo físico: sin él, el descanso corta la racha antes de llegar al máximo."
        },
        {
          "n": 117,
          "texto": "Racha larga va ahora de la mano de Fondo físico: cada nivel de Racha larga pide un nivel más de Fondo físico (I, II y III), porque sin aguantar más carreras seguidas el descanso corta la racha antes de llegar a su tope."
        },
        {
          "n": 118,
          "texto": "Nueva introducción: al empezar una partida nueva, la historia de cómo acabas de taxista (te despiden, conoces a un taxista que se jubila y te lanzas con su licencia y su Corolla). Las ilustraciones llegarán pronto."
        },
        {
          "n": 119,
          "texto": "La introducción ya tiene sus tres ilustraciones: el despido, la noche en el taxi del taxista que se jubila y tu primer amanecer al volante."
        },
        {
          "n": 120,
          "texto": "Llegan los conductores ÚNICOS, un rango por encima de LEGENDARIO con marco granate, retrato propio, habilidades y debilidades fijas y sin topes. El primero es Paconi: tocayos, sinergia con su planta, «ajuste de periodos anteriores» al cerrar la caja… y sus frases. De momento llegarán con los eventos de clientes, que vienen pronto."
        },
        {
          "n": 121,
          "texto": "En la ficha de un ÚNICO, sus estadísticas dicen «ÚNICO» en vez de «Categoría LEGENDARIO»."
        },
        {
          "n": 122,
          "texto": "Paconi cuadra mejor las cuentas: su «ajuste de periodos anteriores» deja ahora un 12–18 % de lo que factura (antes, un 8–12 %)."
        },
        {
          "n": 123,
          "texto": "Llega el segundo ÚNICO: El Pelado. Solo en su coche hace el día y la noche del tirón, cobra un plus por cada kilómetro, nadie se le va sin pagar, nunca se pone malo y con los chicles de menta cobra un 20 % más. A cambio gasta más combustible, hace más kilómetros de la cuenta, pincha más y no comparte coche con Paconi."
        },
        {
          "n": 124,
          "texto": "Llegan los eventos de clientes: cada 5–8 jornadas se sube alguien especial a tu taxi o al de uno de tus conductores, el juego se para y tú decides entre tres opciones. Nueve historias, casi todas reales y con su ilustración, y dos de ellas te traen a Paconi y a El Pelado."
        }
      ]
    },
    {
      "fecha": "2026-11-26",
      "titulo": "Eventos de clientes",
      "cambios": [
        {
          "n": 125,
          "texto": "Si le dices a Paconi o a El Pelado «Vente a trabajar conmigo», ahora te sale gratis contratarlo ese mismo día. El Pelado ya no deja chicles."
        },
        {
          "n": 126,
          "texto": "En el ordenador, la introducción y los eventos se ven en una columna en el centro, con la ilustración entera, en vez de estirarse a todo el ancho y recortarse."
        },
        {
          "n": 127,
          "texto": "Vender un objeto LEGENDARIO da ahora 25 puntos de experiencia a tu personaje (antes, 1). En la hoja de tu personaje solo sale cuántos puntos de prestigio te dan si empiezas de cero. Y el ajuste de Paconi y el plus por km de El Pelado cuentan ya como lo que facturan en Estadísticas."
        },
        {
          "n": 128,
          "texto": "Tu taxista tiene cara propia: un retrato ilustrado, el mismo protagonista de la introducción y de los eventos. Ya no se compone por piezas; tu nombre sí se sigue pudiendo cambiar."
        },
        {
          "n": 129,
          "texto": "Las mejoras de tu taxista se explican mejor: cada nivel dice qué mejora (por ejemplo, Veterano: «Tu taxista gana un 25 % más de experiencia»), y el Tesla y el Mercedes cuentan lo que hacen."
        },
        {
          "n": 130,
          "texto": "Tus conductores tienen caras nuevas: retratos ilustrados como el resto del juego, 55 distintos y de todo tipo. Cada candidato saca una al azar, así que la misma Mari Carmen no sale siempre con la misma cara, y nunca hay dos iguales en tu flota. Los conductores que ya tenías también estrenan cara."
        },
        {
          "n": 131,
          "texto": "La calle de arriba se renueva: los edificios son ahora una ilustración de Madrid, con el Metrópolis y Cibeles, de día y de noche con las ventanas encendidas. El cielo, la calle y todo lo que se mueve siguen igual, con los colores del resto de ilustraciones."
        },
        {
          "n": 132,
          "texto": "El taxi que cruza la calle de arriba es ahora una ilustración, como los edificios: el Corolla blanco con su franja roja y la luz verde."
        },
        {
          "n": 133,
          "texto": "Los coches tienen dibujo: el Corolla y el Tesla salen ilustrados al elegir coche y en miniatura junto a los kilómetros de cada licencia, y el taxi que cruza la calle de arriba es, en cada pasada, uno de los coches de tu flota."
        },
        {
          "n": 134,
          "texto": "El Mercedes Clase S también tiene su dibujo: al elegir coche, junto a los kilómetros y cruzando la calle de arriba si tienes uno."
        },
        {
          "n": 135,
          "texto": "El Corolla y el Tesla estrenan llantas de aleación, con más detalle (el Tesla, con la pinza de freno roja)."
        },
        {
          "n": 136,
          "texto": "Las ruedas del taxi que cruza la calle de arriba vuelven a girar, ahora con las llantas de cada coche: Corolla, Tesla y Mercedes."
        },
        {
          "n": 137,
          "texto": "Arreglo: el taxi de la calle de arriba ya no cambia de modelo a mitad de camino. Cada pasada es entera con el mismo coche y, si tienes varios modelos, la siguiente es otro distinto."
        },
        {
          "n": 138,
          "texto": "Arreglo: las ruedas del Tesla y del Mercedes ya giran centradas, sin bailar. Ahora gira solo la llanta, centrada en su eje, y el neumático se queda quieto."
        },
        {
          "n": 139,
          "texto": "El autobús de la EMT de la calle de arriba también es una ilustración, con sus ruedas girando y su letrero de la línea 34 «Las Águilas»."
        },
        {
          "n": 140,
          "texto": "Los repartidores en bici de la calle de arriba también son ilustraciones, con los radios girando y Uber Eats y Just Eat en sus mochilas. El autobús es ahora algo más grande."
        },
        {
          "n": 141,
          "texto": "La gente que pasea por la acera también está ilustrada: una abuela, un chaval con cascos, una mujer con su perro, una chica con coleta, un abuelo con bastón y un chico con sudadera, que van cambiando de paso al andar. Y los radios de las bicis ya giran por detrás del neumático."
        },
        {
          "n": 142,
          "texto": "Arreglos: la lluvia cae por delante de todo (antes los coches, el autobús, las bicis y la gente pasaban por encima de las gotas); el nombre de tu empresa va debajo de «Libre», con su misma letra; mientras se ve un aviso puedes bajar hasta lo que tapa, como «Ver los N restantes»; y hay nombres nuevos de conductores: Fátima, Ionuț, Mamadou y Mei (Daniela se reserva para alguien especial)."
        },
        {
          "n": 143,
          "texto": "El Almacén tiene filtros: chips por categoría (B, A, S, S+, LEGENDARIO) y un desplegable con lo que mejora cada objeto (menos espera, más propinas, menos bajas…). Se pueden juntar y se recuerdan al volver."
        },
        {
          "n": 144,
          "texto": "Combinar solo: al pie del Almacén eliges hasta qué categoría se combinan los objetos por su cuenta (por ejemplo, «hasta S»). Cada vez que entra uno, se combinan los de debajo, primero los repetidos, y nunca la Planta de Paconi ni los Chicles de El Pelado si los tienes."
        },
        {
          "n": 145,
          "texto": "Objeto nuevo, el Saco de 10 kg de colines (categoría S): solo no hace nada, pero equipado a Paconi o a El Pelado se cansan un 40 % menos."
        },
        {
          "n": 146,
          "texto": "Cinco eventos de clientes nuevos: una novia a la fuga, un turista en Barajas, un parto en el asiento de atrás, un maletín olvidado y una noche de final de Champions. De momento salen sin dibujo; las ilustraciones llegarán pronto."
        },
        {
          "n": 147,
          "texto": "Nueva conductora ÚNICA: Daniela, seis años, con las cosas muy claras. No conduce: ocupa el turno de día de un taxi y dirige la flota (los demás esperan menos, se quedan menos de cada carrera y cogen menos bajas; a Paconi lo tiene vigilado). Cobra su paga y sus chuches y algún día se queda cuidando de su hermano Álvaro. Llega con el evento «De Parla a Almería», cuando ya tienes tu SL. Su retrato y su ilustración llegarán pronto."
        },
        {
          "n": 148,
          "texto": "El grupo de la flota: al montar tu SL aparece un chat en la cabecera con tus conductores. Estrénalo con tu primer mensaje (ya escrito, pero lo puedes cambiar) y, cada vez que cierras la caja, comentan lo que ha pasado: pinchazos, impagos, propinas, la lluvia… Paconi, El Pelado y Daniela también escriben si trabajan para ti."
        },
        {
          "n": 149,
          "texto": "Daniela manda más: los conductores esperan un 15 % menos y se quedan 6 puntos menos de cada carrera (antes, un 6 % y 3 puntos). Además estrena retrato, y la novia a la fuga, el turista de Barajas y el viaje de Parla a Almería ya tienen su ilustración. Las nubes de la calle de arriba también son ilustraciones, y ahora son tres."
        },
        {
          "n": 150,
          "texto": "Los eventos «¡Que viene!», «El maletín» y «Noche de final» ya tienen su ilustración. En el grupo de la flota, Paconi estrena mensajes (pide que le rieguen la planta, se pega con un árbol «bien engañoso», pide un adelanto del sueldo y nota el coche bailongo), y las fotos del pinchazo y del árbol serán del coche de quien las manda."
        },
        {
          "n": 151,
          "texto": "El grupo de la flota estrena fotos: el pinchazo, el coche de Paconi contra el árbol y un amanecer desde el taxi. Y Paconi pide que le rieguen la planta a todos: «muchachos»."
        },
        {
          "n": 152,
          "texto": "Más fotos en el grupo de la flota: la planta de Paconi, el bocadillo de El Pelado y el dibujo de Daniela. Ya están todas."
        },
        {
          "n": 153,
          "texto": "La última escena de la introducción ya enseña el Corolla, como dice el texto (antes salía un coche antiguo)."
        },
        {
          "n": 154,
          "texto": "Estadísticas con cuatro contadores nuevos de toda la flota: vómitos, euros perdidos con los que se van sin pagar, objetos encontrados y objetos devueltos. Las caras del grupo de la flota llevan un borde y una sombra para que se distingan del fondo, y la introducción ya no enseña un fondo azul antes de cada ilustración."
        },
        {
          "n": 155,
          "texto": "El botón del grupo de la flota tiene un icono nuevo: dos bocadillos de conversación."
        },
        {
          "n": 156,
          "texto": "La ficha de los conductores ÚNICOS ya no enseña una de sus frases bajo la descripción; sus frases siguen saliendo en sus avisos y en el grupo de la flota."
        },
        {
          "n": 157,
          "texto": "El Saco de 10 kg de colines estrena dibujo: un saco con los colines asomando, más claro en las casillas."
        },
        {
          "n": 158,
          "texto": "Los 41 objetos estrenan dibujo: ilustraciones nuevas, más grandes y con color, en el Almacén, en las fichas y en los avisos."
        },
        {
          "n": 159,
          "texto": "El aviso del «ajuste de periodos anteriores» de Paconi ya no lleva una de sus frases: solo dice cuánto entra en la caja."
        },
        {
          "n": 160,
          "texto": "Estadísticas: debajo de los vómitos sale lo gastado en limpiezas y debajo de los objetos devueltos, lo ganado en recompensas. Y las cifras de arriba ya no se borran al empezar de cero: son de toda tu carrera."
        },
        {
          "n": 161,
          "texto": "Las cifras de Estadísticas tienen rangos: Bronce, Plata, Oro, Platino, Esmeralda y Diamante. Cada tarjeta toma el color de su rango, con una barra de lo que falta para el siguiente, y al subir sale un aviso."
        },
        {
          "n": 162,
          "texto": "Al comprar licencia puedes pagar por «Otras placas» si no te gustan las que salen: 100 € la primera vez del día y el doble cada vez. Y arreglo: Paconi y los demás ÚNICOS salen con su «Ú» en la clasificación de Estadísticas (antes, con la «L» de LEGENDARIO)."
        }
      ]
    },
    {
      "fecha": "2026-11-27",
      "titulo": "Almacén más compacto",
      "cambios": [
        {
          "n": 163,
          "texto": "En el Almacén caben 4 objetos por fila (antes, 3): se ven más de un vistazo sin bajar."
        },
        {
          "n": 164,
          "texto": "Objeto nuevo de categoría S: Spotify Premium. Música para los clientes y para el conductor: un 20 % más de propinas y un 12 % menos de cansancio."
        },
        {
          "n": 165,
          "texto": "El grupo de la flota: El Pelado y sus compañeros hablan de los kilómetros reales de su coche, Daniela solo cuenta que ha cuidado de Álvaro los días que de verdad no ha venido, y algunas respuestas llevan emoji."
        },
        {
          "n": 166,
          "texto": "El grupo de la flota tiene cuatro conversaciones nuevas: los cucarachos, los autobuses de la EMT, El Pelado y el efectivo, y Paconi con la espuma del asiento."
        },
        {
          "n": 167,
          "texto": "Paconi avisa en el grupo cuando se pone de baja, a primera hora y con sus excusas (un tirón cargando maletas, su chamo con un pie torcido, un virus «engañoso»…), y se queja de quien le deja el carro sin gasolina."
        },
        {
          "n": 168,
          "texto": "Siete conversaciones nuevas con foto en el grupo de la flota: el asiento después de un vómito, la tormenta, unas flores olvidadas, las llaves de un coche nuevo, un billete de propina, la cola de Barajas y El Pelado en la reserva. Las fotos llegarán pronto."
        },
        {
          "n": 169,
          "texto": "El grupo de la flota estrena cinco fotos: el asiento después de un vómito, la tormenta en Gran Vía, las flores olvidadas, las llaves del coche nuevo y el billete de propina."
        },
        {
          "n": 170,
          "texto": "Las dos últimas fotos del grupo de la flota: la cola de taxis de Barajas y El Pelado en la reserva."
        },
        {
          "n": 171,
          "texto": "En el grupo de la flota, a veces un conductor se pasa de la raya. Bajo su mensaje sale «Despedir gratis»: si confirmas, se va sin finiquito y le mandas el finiquito en PDF por el grupo."
        }
      ]
    }
  ];
})(globalThis);
