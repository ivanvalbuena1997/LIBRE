# Libre: documento de diseño

13 de noviembre de 2026 · Iván

## Concepto

Juego incremental de gestión para navegador: empiezas como taxista autónomo en Madrid con un solo coche y creces hasta dirigir un imperio de transporte mundial. Se llama "Libre", por la luz verde del taxi.

Decisiones ya tomadas:

- **Plataforma**: web, jugable en PC y móvil.
- **Género**: gestión idle, no clicker puro. El interés está en equilibrar piezas que dependen entre sí.
- **Tono**: realista. Tarifas, licencias, turnos y zonas basados en el taxi real de Madrid.
- **Objetivo**: proyecto personal para divertirse y aprender a trabajar con Claude Code.

## Datos reales de Madrid

El juego calcula cada carrera con la fórmula real del taxímetro: inicio de servicio + kilómetros × precio por km + tiempo parado × precio por hora. Estas son las tarifas de 2026, en vigor desde el 1 de enero ([Europa Press](https://www.ultimahora.es/noticias/comunidades/2025/12/07/2526987/tarifas-taxi-ciudad-madrid-suben-partir-del-enero-2026.html), [Time Out Madrid](https://www.timeout.es/madrid/es/noticias/estos-seran-los-nuevos-precios-para-viajar-en-taxi-por-madrid-a-partir-de-2026-una-subida-de-mas-del-2-120925)).

| Tarifa | Cuándo se aplica | Precio por km | Precio por hora |
| --- | --- | --- | --- |
| Tarifa 1 | Laborables de lunes a viernes, 7:00 a 21:00 | 1,40 € | 27,00 € |
| Tarifa 2 | Todos los días de 21:00 a 7:00; sábados, domingos y festivos de 7:00 a 21:00 | 1,60 € | 29,00 € |

Tarifas especiales que el juego puede usar como mecánicas:

- **Tarifa 3, carrera mínima del aeropuerto**: salidas desde las paradas de Barajas con destino fuera de la M-30 y menos de 9 km.
- **Tarifa 4, fija del aeropuerto**: entre Barajas y el interior de la M-30, en ambos sentidos, sin suplementos.
- **Tarifa 7**: recorridos de menos de 1.450 metros, con inicio de servicio de 8,00 €.
- **Suplemento de Nochebuena y Nochevieja**: 7,00 € en los viajes que terminan entre las 21:00 y las 7:00.

Datos confirmados por Iván el 13 de noviembre de 2026:

- Inicio de servicio: 2,55 € en tarifa 1 y 3,20 € en tarifa 2.
- Tarifa 3: 22 € de bajada de bandera, que cubren los primeros 9 km; si el viaje pasa de 9 km, se aplica la tarifa 1 o 2 según corresponda. Tarifa 4: 33 €. (Precisión del 16 de noviembre de 2026.)
- Espera en la parada del aeropuerto: entre 1 y 2 horas (16 de noviembre de 2026).
- Licencias en el área de Madrid: 15.812.
- Régimen de descanso: cada licencia tiene día de libranza obligatorio, fijado por resolución anual del Ayuntamiento.
- Número de licencia: número y letra, por ejemplo 15288-L. La letra es el día de libranza y sale de la última cifra: lunes (L) si acaba en 7 u 8, martes (M) en 9 o 0, miércoles en 1 o 2, jueves (J) en 3 o 4 y viernes (V) en 5 o 6. En fin de semana libra según la paridad del día del mes: una licencia par trabaja el sábado 10 y libra el domingo 11; una impar, al revés. La letra del miércoles está por confirmar (el juego usa X).

Sin dato real: precio de una licencia, del coche y costes mensuales de un autónomo. El juego usa valores provisionales elegidos por equilibrio, no cifras reales, hasta que haya una fuente.

## Sistemas de juego

El dinero sale de tres piezas que dependen entre sí: licencias con su vehículo, conductores y demanda. Si falta una, las otras dos no rinden, y el cuello de botella va cambiando según creces.

**Licencias y vehículos.** Cada taxi necesita una licencia, que es la compra cara y limitada del juego. El vehículo va aparte: modelos con distinto consumo, averías y capacidad. Un coche sin conductor no produce nada.

**Conductores y turnos.** El jugador conduce su taxi él mismo, siempre a clic y solo dentro de la franja de su turno (día o noche). Los conductores que contrata trabajan solos y cubren el resto de turnos; un coche con dos turnos rinde casi el doble que con uno. Con la mejora «Oficina de gestión» el jugador puede dejar el volante y dedicarse solo a gestionar la flota, y volver a conducir cuando quiera en un turno libre. Cada licencia tiene su día de libranza obligatorio.

**Demanda por zonas.** Madrid se divide en zonas con un número máximo de viajes por hora que cambia según el momento del día. Si asignas más coches de los que una zona pide, circulan vacíos y solo gastan combustible. Zonas previstas:

- Centro: muchas carreras cortas, demanda constante.
- Aeropuerto de Barajas: carreras caras con tarifa fija, pero con cola de espera.
- Estaciones de Atocha y Chamartín: picos con la llegada de trenes.
- Ocio nocturno: solo de noche y en fin de semana, con tarifa 2.
- Barrios periféricos: poca demanda, carreras largas.

**Reloj del juego.** El día avanza de forma acelerada y decide qué tarifa se aplica y cuánta demanda hay en cada zona. Es la pieza que más sabor realista da.

**Costes.** Combustible por kilómetro, incluidos los kilómetros en vacío; mantenimiento y averías; porcentaje de los conductores; cuota de autónomo, seguro y emisora.

**Mejoras.** Emisora o app para reducir el tiempo en vacío, coches híbridos y eléctricos para gastar menos, taller propio para reducir averías, oficina de gestión para dejar de conducir, y gerentes que reasignan coches entre zonas de forma automática.

## Progresión

El juego tiene cinco etapas; cada una añade un tipo de vehículo y una mecánica nueva, sin quitar las anteriores.

| Etapa | Qué gestionas | Mecánica nueva |
| --- | --- | --- |
| 1. Autónomo | Un taxi que conduces tú | Elegir zona y horario; primer conductor para el segundo turno |
| 2. Flota de Madrid | Varias licencias y conductores | Reparto de coches por zonas, emisora, aeropuerto y estaciones |
| 3. Empresa de movilidad | VTC, furgonetas, autobuses | Gerentes que automatizan, taller propio, contratos con hoteles y empresas |
| 4. Operador nacional | Autocares, trenes, logística | Varias ciudades y rutas entre ellas |
| 5. Imperio mundial | Aerolíneas y navieras | Rutas entre continentes |

**Prestigio.** A partir de la etapa 3 puedes vender la empresa y empezar en otra ciudad con una ventaja permanente, por ejemplo reputación que aumenta la demanda. Queda fuera de la primera versión.

## Primera versión jugable

La primera versión cubre solo las etapas 1 y 2, en Madrid, y debe ser divertida por sí sola antes de añadir nada más.

Incluye:

- Reloj del juego con día, noche y fin de semana, que cambia entre tarifa 1 y tarifa 2.
- Cuatro zonas: Centro, Aeropuerto, Estaciones y Ocio nocturno.
- Compra de licencias y vehículos, con un solo modelo de coche al principio.
- Contratación de conductores y asignación de turno y zona.
- Ingresos calculados con la fórmula real del taxímetro, y costes de combustible y conductores.
- Carreras a clic en el turno del jugador; los conductores contratados trabajan solos.
- Unas 10 mejoras, entre ellas las que alargan el día.
- Guardado automático y progreso mientras el juego está cerrado.

Queda fuera: VTC y otros vehículos, día de libranza, gerentes, otras ciudades y prestigio.

Añadido el 16 de noviembre de 2026: los conductores hacen carreras reales y cobran al terminar cada una, y hay eventos aleatorios (propinas, clientes que no pagan, vómitos, objetos devueltos, pinchazos, bajas por enfermedad, averías y lluvia) que quedan apuntados como incidencias en el ticket del día.

Añadido el 16 de noviembre de 2026: cada conductor tiene una cualidad y un defecto (al contratar se elige entre tres candidatos), gana experiencia con cada carrera hasta el nivel 10, puede llevar objetos (GPS, ambientador, cojín lumbar, termo de café, gafas de sol, funda de asientos) en uno a tres huecos según su nivel, y despedirlo cuesta un finiquito que crece con el nivel. Todo modifica valores que ya existían (espera entre carreras y probabilidades de los eventos), con topes.

## Técnica

HTML, CSS y JavaScript sin framework ni paso de compilación, publicado en GitHub Pages.

- **Datos separados del código.** Tarifas, zonas, vehículos y mejoras van en un archivo de configuración propio. Así el equilibrio se ajusta sin tocar la lógica, y actualizar las tarifas cada año es cambiar unos números.
- **Lógica separada de la pantalla.** La simulación avanza con un paso de tiempo y no sabe nada del HTML. Eso permite calcular el progreso sin conexión con la misma función y probar la lógica sin navegador.
- **Guardado.** `localStorage`, con exportar e importar la partida como texto. Cada guardado lleva un número de versión para poder migrar partidas antiguas.
- **Números.** Los números normales de JavaScript bastan para las primeras etapas. En las etapas 4 y 5 habrá que decidir entre abreviar cifras o usar una librería de números grandes.
- **Diseño.** Pensado primero para móvil, en una sola columna.

## Decisiones de diseño

Seis decisiones cerradas el 13 de noviembre de 2026.

- **Reloj.** El día dura 2 minutos reales al principio y se alarga unos segundos con mejoras. Para que la mejora tenga sentido, los costes fijos (cuota de autónomo, seguro, emisora) se cobran una vez por día: cada segundo extra es facturación contra el mismo coste diario. Al cerrar el día se muestra la caja.
- **Conductores.** Cobran un porcentaje de la recaudación. El porcentaje va en la configuración; Iván pone el valor habitual del sector.
- **Licencias.** El precio sube con cada compra.
- **Clic manual.** Las carreras del jugador se hacen siempre a clic, también cuando ya tiene conductores. Al contratar al primer conductor empieza la automatización de los demás turnos, y el jugador nota el salto. Dejar de conducir es una mejora (oficina de gestión); sin conducir, el taxímetro se apaga. *(Cambiado el 13 de noviembre de 2026: antes el primer conductor automatizaba también el taxi del jugador.)*
- **VTC.** Aparecen en la etapa 3 como rival que resta demanda en algunas zonas, antes de que el jugador pueda tener las suyas.
- **Nombre.** El juego se llama Libre.

Decisiones añadidas el 13 de noviembre de 2026, durante la construcción de la primera versión:

- **Cierre del día.** La jornada va de 7:00 a 7:00 y el día del juego cambia a las 7:00. Al cerrar, el reloj se para y sale un ticket de taxímetro con el resumen; el día siguiente empieza cuando el jugador lo arranca. Se puede desactivar con el ajuste «Parar al cierre del día». Con el juego cerrado, los días se resuelven solos y al volver sale un único ticket con la suma.
- **Ocio nocturno.** De noche rinde claramente más que el centro, sobre todo de jueves a sábado; el centro se vacía de madrugada.
- **Número de licencia.** Cada licencia comprada recibe un número al azar con su letra. Por ahora solo se muestra: la libranza sigue fuera de la primera versión.

## Primer prompt para Claude Code

Este es el prompt que se pega en Claude Code, con este archivo guardado como `DISENO.md` en la carpeta del proyecto. Los precios de licencia, coche y costes de autónomo irán como valores provisionales.

```text
Vamos a crear un juego incremental de gestión para navegador. El diseño completo
está en DISENO.md: léelo entero antes de hacer nada.

En esta sesión construimos SOLO lo que pone en la sección "Primera versión
jugable". No añadas nada de lo que esa sección deja fuera.

Requisitos técnicos:
- HTML, CSS y JavaScript sin frameworks ni paso de compilación. Debe funcionar
  abriendo index.html y publicándolo en GitHub Pages.
- Todos los números del juego (tarifas, zonas, vehículos, costes, mejoras) en un
  archivo de configuración separado de la lógica.
- La simulación separada de la interfaz: una función que avanza el estado un
  intervalo de tiempo, sin tocar el HTML. El progreso sin conexión usa esa misma
  función.
- Guardado automático en localStorage con número de versión, más exportar e
  importar partida como texto.
- Interfaz en español, pensada primero para móvil.

Sobre los datos:
- Usa las tarifas reales de DISENO.md tal cual. No inventes cifras reales de
  Madrid: si te falta un dato, pon un valor provisional en la configuración,
  márcalo con un comentario "PROVISIONAL" y dame la lista al final.
- Los valores de equilibrio (demanda por zona, precios de compra, coste de las
  mejoras) sí los propones tú, también en la configuración, para que yo los ajuste
  jugando.

Forma de trabajar:
1. Primero propón un plan: estructura de archivos, modelo de datos del estado
   y orden de construcción. Espera a que lo apruebe antes de escribir código.
2. Construye por pasos pequeños que se puedan probar en el navegador, empezando
   por un solo taxi que genera dinero con el reloj del juego.
3. Crea un CLAUDE.md con las convenciones del proyecto y mantenlo al día.
4. Haz un commit de git al terminar cada paso.
```
