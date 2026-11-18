# Eventos guiados · análisis y propuesta

18 de noviembre de 2026 · sin aplicar: es para decidir qué se hace y en qué orden.

## Qué hay ahora

- Los eventos de hoy son **sucesos sueltos al azar**: propina, sin pagar, objeto devuelto y vómito en cada carrera; baja, pinchazo y avería al empezar el turno; lluvia una vez por jornada.
- No tienen historia ni objetivo: entran en la caja y salen en el ticket.
- El juego **no tiene fecha**. Cuenta jornadas («Día N»), días de la semana y la paridad del día para la libranza. Navidad o Halloween no se pueden poner hasta que haya un calendario.
- **Ritmo:** en 150 minutos se juegan unas 90 jornadas. Un año de juego (365 jornadas) serían unas 10 horas de partida abierta, sin contar las horas sin conexión, que también pasan días.

## Tres familias de eventos

### 1. Fechas señaladas (calendario fijo)

Un día concreto del calendario cambia las reglas durante una jornada (o varias) y trae un **objetivo con premio**.

| Fecha | Qué pasa en Madrid | Efecto en el juego | Objetivo de ejemplo |
| --- | --- | --- | --- |
| **31 oct · Halloween** | Fiestas de disfraces | Ocio nocturno ×2 de 21:00 a 6:00. Clientes disfrazados: más vómitos y más propinas | 20 carreras de noche en Ocio → objeto de evento |
| **Viernes negro** (último viernes de noviembre) | Compras en el centro | Centro ×1,5 de 10:00 a 21:00; carreras cortas cargadas de bolsas | Facturar 1.000 € en el Centro ese día |
| **Puente de diciembre** (6–8 dic) | Medio Madrid se va | Estaciones y Aeropuerto ×1,8 el día 5 y el 8; Centro ×0,7 | — (solo efecto) |
| **Cortilandia y luces** (desde mediados de diciembre) | Turistas y familias | Centro ×1,2 de 17:00 a 22:00 durante 3 semanas | — |
| **24 dic · Nochebuena** | La ciudad se vacía a las 21:00 | Demanda ×0,3 de 21:00 a 1:00 y ×1,5 después | Trabajar esa noche: propina de Nochebuena para cada conductor |
| **31 dic · Nochevieja** | La mejor noche del año para el taxi | Todo ×3 de 0:30 a 7:00, tarifa 2. Vómitos ×3 | Objetivo grande: 40 carreras de flota en la madrugada → objeto LEGENDARIO de evento |
| **5 ene · Cabalgata de Reyes** | Calles cortadas por la tarde | Centro ×0,5 de 17:00 a 21:00 y ×2 después | — |
| **Enero · FITUR** (5 días en IFEMA) | Ferias: el mayor pico de aeropuerto | Aeropuerto ×1,6 y cola −40 % | Hacer 30 carreras al aeropuerto esa semana |
| **15 may · San Isidro** | Verbenas y chotis | Ocio de día (12:00–20:00) con demanda | Objeto de evento: «Parpusa» |
| **Julio · Orgullo** | Una semana de fiesta en el centro | Centro y Ocio ×1,8 de noche, toda la semana | — |

**Objetos de evento:** cada fecha grande da un objeto que **solo se consigue ese día** (un gorro de Papá Noel en Nochevieja, una calabaza en Halloween). Son coleccionables, encajan con la colección y con combinar, y dan un motivo para volver a jugar en esa fecha.

### 2. Pasajeros especiales (raros, al azar)

Una carrera concreta con nombre y una **elección**. En tu turno sale un aviso con dos botones. En los conductores la resuelven sus rasgos, sin preguntarte: un Honrado devuelve el maletín, un Despistado se lo deja olvidado.

| Pasajero | Elección | Resultado |
| --- | --- | --- |
| **Turista que quiere ir a Toledo** | «Vamos» / «Solo Madrid» | Carrera de 75 km (unos 110 €), pero el taxi está 2 h fuera |
| **Parturienta a La Paz** | «Pisa a fondo» / «Con calma» | A fondo: propina enorme y 20 % de multa de tráfico. Con calma: normal |
| **Famoso de incógnito** | «Discreción» / «Selfi» | Discreción: propina ×5. Selfi: +5 % de demanda una semana… y un 30 % de que no vuelva a pedirte taxi |
| **Despedida de soltero** | «Suban» / «No, gracias» | Carrera cara con un 50 % de vómito (sin bolsa, malo) |
| **Cliente que se ha dejado la cartera** | «Fíese» / «Al cajero» | Fiarse: 70 % de que vuelva al día siguiente con el doble |
| **Abuela con la compra** | — | Sin elección: carrera corta, propina de croquetas (+ un objeto B) |

Con una probabilidad baja (por ejemplo, 1 de cada 300 carreras) aparecen lo justo para sorprender sin cansar.

### 3. Sucesos de ciudad (varias jornadas, al azar)

Cambian la demanda unos días y se anuncian en la cabecera:

- **Huelga de metro:** 2–3 días con demanda ×1,6 en todo Madrid.
- **Obras en la Gran Vía:** una semana con −15 % de demanda en el Centro y +10 % en Estaciones.
- **Derbi o final:** una noche con Ocio ×1,5.
- **Ola de calor:** propinas +20 %; un objeto como la Nevera vale el doble.
- **Congreso en IFEMA:** Aeropuerto y Estaciones ×1,3 tres días.

## Cómo encajaría en el código

- **Calendario:** `config.calendario.fechaInicial` (por ejemplo, el 1 de octubre) y `fechaDe(jornada)`, que da día y mes. El «Día N» de la cabecera podría pasar a «Mié 31 oct». Es determinista: no necesita azar y funciona igual sin conexión.
- **Día de la semana:** la partida empieza en lunes, y el 1 de octubre de 2026 es jueves. O la partida empieza en jueves, o el calendario es de otro año (en 2029, el 1 de octubre cae en lunes).
- **Libranza:** ahora la paridad sale del «Día N». Con calendario debería salir del día del mes de verdad, que es como funciona en Madrid. Es un cambio de reglas: hay que decidirlo.
- **Efectos de fecha:** un `factorEvento(estado, zona, hora)` que se multiplica en `demandaZona()`, igual que la lluvia. Funciona solo y sin conexión.
- **Objetivos:** estado nuevo (`estado.evento = { id, progreso, hecho }`), con su tarjeta en Calle encima de «Siguiente». El progreso solo cuenta jugando: sin conexión sigue el efecto, pero no avanza el objetivo. También se puede hacer que sí cuente.
- **Pasajeros especiales:** un evento de carrera más, con `opciones`. Tu carrera se queda esperando la respuesta, como la pausa del ticket; la de los conductores se resuelve sola con sus rasgos.
- **Guardado:** sube `versionGuardado` y la migración pone la fecha de una partida vieja.
- **Ticket:** una línea de incidencias por evento («Nochevieja: +420 €»), como las de ahora.

## Propuesta de orden

1. **Calendario y fechas con efecto** (Halloween, Viernes negro, Puente, Nochebuena, Nochevieja, Reyes): poco código y se nota enseguida. **Empezar el 1 de octubre**: así una primera partida de 2–3 horas pasa por Halloween (jornada 31), Viernes negro (58), Nochebuena (85) y Nochevieja (92).
2. **Objetivos con premio y objetos de evento** para las tres grandes (Halloween, Nochevieja, FITUR).
3. **Pasajeros especiales** con elección, empezando por tres.
4. **Sucesos de ciudad**.

## Lo que tienes que decidir

1. ¿Calendario de verdad (fechas que vuelven cada año de juego), o eventos que se repiten cada cierto número de jornadas?
2. ¿Fecha de inicio? (Recomiendo el 1 de octubre.)
3. ¿La libranza de fin de semana pasa a usar el día del mes real?
4. ¿Los objetivos cuentan sin conexión?
5. ¿Premios en dinero, en objetos de evento o los dos?
6. ¿Qué fechas y qué pasajeros te gustan de la lista, o cuáles añadirías?
