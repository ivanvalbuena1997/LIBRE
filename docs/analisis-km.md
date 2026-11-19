# Estudio: ¿y si los coches hicieran más kilómetros?

19 de noviembre de 2026 · pedido por Iván antes de la idea 7 (avería
definitiva por kilómetros) · medido con un script de una sola vez (no está en
el repositorio): 6 partidas por escenario, 40 jornadas cada una, sin
libranza, con las mismas semillas en todos los escenarios.

## El punto de partida

Iván: un taxi real a doble jornada hace **entre 550 y 750 km**. En el juego:

| Flota medida | km por coche y jornada | De ellos, en carrera | En vacío |
| --- | --- | --- | --- |
| 1 licencia, 2 conductores, sin mejoras | **333** | 201 (60 %) | 132 (40 %) |
| 3 licencias, 6 conductores, Estaciones, Aeropuerto, Curso de zonas y Callejero | **394** | 342 (87 %) | 52 (13 %) |

**Por qué hay pocos km:** los coches del juego van despacio. Por cada hora
moviéndose recorren:

- en carrera, 12–16 km/h en Centro, 22–27 km/h en Ocio, 16–23 km/h en
  Estaciones y 35–51 km/h en Aeropuerto;
- en vacío (buscando cliente), 18 km/h (`conduccion.velocidadVacioKmH`);
- en la cola de una parada, nada: el coche está quieto.

Para llegar a 600 km en 24 horas haría falta una media de 25 km/h todo el
día. No tengo una fuente verificada de la velocidad media real de un taxi en
Madrid, así que no sé cuál de estas velocidades se aleja más de la realidad.

**Lo importante para la jugabilidad:** una jornada dura los mismos segundos
reales hagas los km que hagas. Los km solo cambian tres cosas:

1. **El combustible.** Hoy es poco: unos 31 € por coche y jornada frente a 642 €
   de recaudación, menos del 5 %.
2. **La cifra que se ve** bajo la placa y en Estadísticas, es decir, el realismo.
3. **Lo rápido que se gasta un coche** con la idea 7. Esto se puede ajustar
   igual moviendo los umbrales de la avería, así que no obliga a cambiar los km.

## Escenarios medidos

El neto es el de toda la flota por jornada. Entre paréntesis, la diferencia
con el juego actual.

### 1 licencia, 2 conductores, sin mejoras

| Escenario | km/coche | Carreras/coche | Recaudación/coche | Combustible/coche | Neto |
| --- | --- | --- | --- | --- | --- |
| Actual | 333 | 60 | 642 € | 31 € | 290 € |
| Vacío a 30 km/h | 422 | 60 | 642 € | 39 € | 281 € (−3 %) |
| Vacío a 45 km/h | 533 | 60 | 642 € | 50 € | 271 € (−7 %) |
| Carreras con ×1,5 km (mismo tiempo) | 434 | 60 | 791 € | 40 € | 366 € (+26 %) |
| Carreras ×1,5 km y vacío a 30 km/h | 522 | 60 | 791 € | 49 € | 358 € (+23 %) |
| Carreras con ×2 km (mismo tiempo) | 534 | 60 | 940 € | 50 € | 443 € (+53 %) |
| Carreras ×1,5 km **y ×1,5 tiempo** | 322 | 45 | 598 € | 30 € | 272 € (−6 %) |

### 3 licencias, 6 conductores, con zonas y Curso de zonas

| Escenario | km/coche | Neto |
| --- | --- | --- |
| Actual | 394 | 1.161 € |
| Vacío a 30 km/h | 420 | 1.134 € (−2 %) |
| Vacío a 45 km/h | 446 | 1.098 € (−5 %) |
| Carreras ×1,5 km (mismo tiempo) | 549 | 1.479 € (+27 %) |
| Carreras ×1,5 km y vacío a 30 km/h | 565 | 1.436 € (+24 %) |
| Carreras ×2 km (mismo tiempo) | 738 | 1.919 € (+65 %) |

## Qué se ve en los números

- **Subir los km de las carreras sube la recaudación**, porque el taxímetro
  cobra por km (tarifa real). Con ×1,5 km el neto sube un 23–27 %. Eso
  obligaría a reequilibrar todo el juego: precios, demanda y lo medido con
  el bot. **No lo recomiendo.**
- **Alargar las carreras en km y en tiempo no sube los km.** El tiempo que el
  coche pasa en la carrera más larga se lo quita al vacío, y las dos cosas van
  a una velocidad parecida. Salen menos carreras y un 6 % menos de neto.
- **Subir solo la velocidad en vacío** sube los km y el combustible sin tocar
  la recaudación. El coste es pequeño: entre −2 % y −7 % de neto. Pero en
  una flota avanzada se nota poco (de 394 a 420–446 km), porque allí el
  vacío es solo el 13 % de los km.
- **Con 45 km/h en vacío** casi se llega a los km reales al principio de la
  partida (533), pero un taxi buscando cliente a 45 km/h de media por Madrid
  no me parece creíble. No tengo un dato que lo confirme ni lo descarte.

## Opciones

| | Qué cambia | km/coche | Neto | Comentario |
| --- | --- | --- | --- | --- |
| **A. No tocar** | Nada | 333–394 | igual | Los umbrales de la idea 7 se fijan en km del juego, más bajos que los reales |
| **B. Vacío a 30 km/h** | Una cifra de la config | 420–422 | −2/−3 % | Un poco más real; más combustible |
| **C. Vacío a 45 km/h** | Una cifra | 446–533 | −5/−7 % | Cerca de lo real al principio; velocidad poco creíble |
| **D. Carreras más largas** | Los km de todos los viajes | 522–738 | +23/+65 % | Lo más real; obliga a reequilibrar la economía entera |

## Efecto en la idea 7

Lo que importa para jugar es **cuántas jornadas dura un coche**, no los km.
Con la curva propuesta (sin riesgo hasta un umbral U, máximo 150.000 km
después), un coche se rompe de media hacia U + 60.000 km. Con U = 200.000:

| Opción | km/jornada | Coche inicial (~92.000 km) | Coche nuevo (0 km) |
| --- | --- | --- | --- |
| A | ~333 | ~505 jornadas (~14 h) | ~780 jornadas (~22 h) |
| B | ~420 | ~400 jornadas (~11 h) | ~620 jornadas (~17 h) |
| C | ~530 | ~315 jornadas (~9 h) | ~490 jornadas (~14 h) |

Horas con jornadas de 100 s, sin Jornada larga, que las alarga hasta 160 s.
Son aproximadas.

Como referencia, el bot llega a unas **90 jornadas en 150 minutos**
(`analisis-progresion.md`). Con cualquiera de las opciones, el primer coche
aguantaría muchas horas de juego. Si se quiere que la avería definitiva se
note antes, hay que bajar U, sea cual sea la opción.

Además, los coches que van a Aeropuerto hacen más km, así que **se gastan
antes**. Esto sale solo y tiene sentido: las zonas largas pagan más, pero
gastan más coche.

## Decisión (19-11-2026)

Iván: un taxi real hace **25–35 km/h de media en la jornada**. Con solo la
velocidad en vacío no se llega a eso en una flota avanzada, porque allí el
coche pasa mucho tiempo quieto en la cola de una parada. Iván eligió subir el
vacío para acercarse a 30 km/h al principio de la partida y que el
combustible de más se note, sin compensarlo.

**Aplicado: `conduccion.velocidadVacioKmH` de 18 a 72.**

| Medida | Antes (18) | Ahora (72) |
| --- | --- | --- |
| km/coche y jornada, principio (sin libranza) | 333 | 727–732 (~30 km/h) |
| Lo mismo, con libranza, por jornada trabajada | — | ~630 |
| km/coche y jornada, flota avanzada | 394 | 502 (~21 km/h) |
| Combustible por coche y jornada, principio | 31 € | 68 € |
| Neto, principio | 290 € | 253 € (−13 %) |
| Neto, flota avanzada | 1.161 € | 1.094 € (−6 %) |

Bot de progresión (`tests/progresion.js`, 10 semillas), minuto medio en que
llega a cada número de licencias:

| Perfil | 2 licencias | 3 licencias | 5 licencias |
| --- | --- | --- | --- |
| Siguiente | 22 → 24 | 46 → 52 | 92 → 102 |
| Flota y Zonas | 27 → 29 | 53 → 57 | 89 → 98 |
| Equilibrado y Gestor | 115 → 125 | 137 → 146 (7 de 10 llegan antes del minuto 150) | — |

La partida va entre un 8 y un 12 % más lenta. Las mejoras de consumo
(Conducción eficiente, Híbridos) ahorran ahora el doble.
