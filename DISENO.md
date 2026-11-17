# Libre: documento de diseño

Iván · creado el 13 de noviembre de 2026 · actualizado el 17 de noviembre de 2026

Este documento describe el juego tal como está hoy: qué es, cómo se juega, cada sistema con sus números y por qué está así. Las cifras exactas viven en `js/config.js`; si algo cambia allí, este documento debe seguirle.

---

## 1. Concepto

Juego incremental de gestión para navegador: empiezas como taxista autónomo en Madrid con un solo coche y creces hasta dirigir una flota. A largo plazo, la idea es llegar a un imperio de transporte mundial. Se llama **Libre**, por la luz verde del taxi.

- **Plataforma:** web, jugable en PC y móvil (pensado primero para móvil).
- **Género:** gestión idle, no clicker puro. El interés está en equilibrar piezas que dependen entre sí: licencias, coches, conductores, demanda y costes.
- **Tono:** realista y de barrio. Tarifas, licencias, libranzas, turnos y zonas basados en el taxi real de Madrid; los eventos y objetos tienen humor de taxista (la Planta de Paconi, el Bidón energético).
- **Objetivo del proyecto:** proyecto personal para divertirse y aprender a trabajar con Claude Code.

### Pilares

1. **El taxi de verdad.** Si un dato existe en el mundo real (tarifas, número de licencias, libranzas), el juego lo usa tal cual. Lo inventado se marca como valor de equilibrio.
2. **Decisiones, no clics.** Tus carreras son a clic, pero el juego se gana organizando: qué licencia comprar, a quién contratar, en qué turno ponerlo y qué llevar en el coche.
3. **Cada conductor es alguien.** Retrato, nombre, categoría, cualidades, defectos, nivel y objetos: la flota se recuerda por sus personas.
4. **Cuentas claras.** Cada jornada termina con un ticket de taxímetro que dice qué ha pasado y cuánto se ha ganado.

---

## 2. Bucle de juego

**Bucle corto (segundos).** Tocas el taxímetro, esperas cliente, el taxímetro sube en directo y cobras. Tus conductores hacen lo mismo solos y cada cobro salta en pantalla con su nombre («+14,20 € Marta»).

**Bucle medio (una jornada, unos 100 segundos).** El día avanza de 7:00 a 7:00 con tarifas y demanda que cambian por horas. Al cierre sale el ticket con recaudación, gastos, neto e incidencias; el juego se para hasta que arrancas el día siguiente. Entre jornadas reorganizas a tus conductores.

**Bucle largo (horas).** Compras licencias y coches, contratas conductores, abres zonas y mejoras, encuentras objetos y subes de nivel a tu gente. Cuando tienes la Oficina de gestión puedes dejar el volante y dirigir solo la flota.

**Ritmo medido** (bot que compra flota en cuanto puede y mejoras que se pagan pronto): la segunda licencia llega hacia el minuto 24–44 y **tres licencias con sus seis turnos cubiertos, hacia el minuto 69–78**. Las libranzas alargaron este ritmo desde unos 52–63 minutos; Iván decidió dejarlo así (17-11-2026).

---

## 3. Datos reales de Madrid

El juego calcula cada carrera con la fórmula real del taxímetro: inicio de servicio + kilómetros × precio por km + tiempo parado × precio por hora. Tarifas de 2026, en vigor desde el 1 de enero ([Europa Press](https://www.ultimahora.es/noticias/comunidades/2025/12/07/2526987/tarifas-taxi-ciudad-madrid-suben-partir-del-enero-2026.html), [Time Out Madrid](https://www.timeout.es/madrid/es/noticias/estos-seran-los-nuevos-precios-para-viajar-en-taxi-por-madrid-a-partir-de-2026-una-subida-de-mas-del-2-120925)).

| Tarifa | Cuándo se aplica | Inicio | Precio por km | Precio por hora |
| --- | --- | --- | --- | --- |
| Tarifa 1 | Laborables de lunes a viernes, 7:00 a 21:00 | 2,55 € | 1,40 € | 27,00 € |
| Tarifa 2 | Todos los días de 21:00 a 7:00; sábados, domingos y festivos de 7:00 a 21:00 | 3,20 € | 1,60 € | 29,00 € |
| Tarifa 3 | Salidas de Barajas a destinos fuera de la M-30 | 22 € de bajada de bandera que cubren los primeros 9 km; después, tarifa 1 o 2 | | |
| Tarifa 4 | Fija entre Barajas y el interior de la M-30 | 33 € | | |

Otros datos reales que usa el juego (confirmados por Iván el 13 y el 16 de noviembre de 2026):

- **Licencias en el área de Madrid:** 15.812 (el máximo que puede tener el jugador).
- **Espera en la parada de Barajas:** entre 1 y 2 horas.
- **Combustible:** 1,55 €/litro; el coche gasta 6 litros a los 100 km.
- **Cuota de autónomo:** 535 € al mes (17,83 € por jornada).
- **Seguro:** 10 € por coche y día. **Emisora:** 3 € por coche y día.
- **Conductor asalariado:** se queda el 50 % de lo que recauda.
- **Libranza:** cada licencia libra según su letra, que sale de la última cifra del número: lunes (L) si acaba en 7 u 8, martes (M) en 9 o 0, miércoles (X) en 1 o 2, jueves (J) en 3 o 4 y viernes (V) en 5 o 6. En fin de semana libra según la paridad del día del mes: una licencia par trabaja los días pares y libra los impares; una impar, al revés. La letra del miércoles está por confirmar (el juego usa X).

**Valores de juego, no reales:** licencia 3.000 € (sube un 15 % con cada compra) y coche 1.500 €, fijados por Iván. Todo lo demás que no aparece arriba (demanda, precios de mejoras, probabilidades) es equilibrio y se ajusta jugando.

Datos reales que el juego aún no usa: tarifa 7 (recorridos de menos de 1.450 m, 8 €) y suplemento de Nochebuena y Nochevieja (7 €).

---

## 4. Pantallas

El juego es una sola columna con un menú inferior de cuatro pestañas: **Calle**, **Flota**, **Mejoras** y **Partida**. Una marca roja en la pestaña avisa de que hay algo que comprar, un ticket esperando o un almacén por vaciar.

### Calle

<p>
<img src="docs/capturas/calle-conductor.jpg" width="250" alt="Calle con el taxímetro en modo conductor: ocupado, 6,46 €">
<img src="docs/capturas/calle-flota.jpg" width="250" alt="Calle con el taxímetro en modo flota: recaudación de toda la flota y un aviso de Elena">
</p>

De arriba abajo:

- **Tira de ambiente** (36 px): cielo que sigue la hora, edificios con ventanas que se encienden de noche y lluvia cuando llueve. Es un módulo aparte para poder cambiarlo algún día por un mapa.
- **Taxímetro**, con dos modos que cambian solos:
  - **Conductor** (izquierda), cuando conduces y es tu turno: piloto LIBRE/OCUPADO, tarifa, importe en vivo y barra de la carrera. Todo el taxímetro es el botón de buscar cliente.
  - **Flota** (derecha), el resto del tiempo: piloto FLOTA en ámbar, el display suma lo recaudado hoy por toda la flota y el pie resume «3 ocupados · 2 parados» y la hora de tu turno. Tocarlo abre el desglose de la caja de hoy.
- **Siguiente:** la compra más barata que aún no te puedes permitir, con su barra de progreso. Al tocarla te lleva a ella.
- **Tus taxis hoy:** una fila por taxi con retrato, zona, estado (Ocupado, Libre, Avería, Libranza, De baja, Pinchazo, Limpieza…) y lo facturado en la jornada, con una barra proporcional al que más lleva. Las filas se reordenan con una animación cuando un taxi adelanta a otro y destellan al cobrar. Con más de 6 taxis, «Ver los N restantes». Tocar una fila lleva a ese taxi en Flota.
- **Zonas:** las abiertas como botones compactos con su demanda ahora; las cerradas, en una línea con la mejora que las abre. Mientras conduces, tocar una zona te lleva allí.

Con hasta 5 taxis, Calle cabe sin scroll en un móvil de 375 × 800.

### Flota

<p>
<img src="docs/capturas/flota.jpg" width="250" alt="Flota: almacén, reserva y licencias de dos en dos">
<img src="docs/capturas/ficha-conductor.jpg" width="250" alt="Ficha de Elena, conductora LEGENDARIA de nivel 10">
<img src="docs/capturas/candidatos.jpg" width="250" alt="Candidatos para un turno libre, con su categoría y precio">
</p>

- **Almacén:** fichas pequeñas con icono, cantidad y categoría (los consumibles, con una barra sobre su máximo). El nombre sale al tocar la ficha, que abre su panel para comprar (ruedas, bolsas) o vender (objetos). Si lo encontrado no cabe, arriba aparece la bandeja «Almacén lleno · N por guardar».
- **Reserva:** hasta 5 conductores contratados sin turno, en una fila de caras.
- **Licencias, de dos en dos:** la placa a la izquierda (con «Hoy libra» si toca) y los dos turnos con un sol o una luna. Cada conductor es una cara: retrato, círculo de color con la letra de su categoría (abajo a la izquierda), círculo con su nivel (abajo a la derecha) y su nombre. Un «!» rojo marca a quien está parado.
- **Tocar:** un conductor abre su **ficha** (centro): nivel y experiencia, cualidades y defectos explicados, objetos con quitar o equipar, lo que lleva hecho, su zona, cambiar de sitio y despedir. Un turno libre («+») abre los **candidatos** (derecha). «TÚ» abre tu zona y tus opciones.
- **Entre jornadas** (con el día cerrado), los conductores se arrastran de un sitio a otro.
- **Comprar licencia nueva** abre dos placas para elegir, cada una con su libranza.

### Mejoras

<p>
<img src="docs/capturas/mejoras.jpg" width="250" alt="Árbol de mejoras: rama Conductores y jornada con Jornada larga abierta">
<img src="docs/capturas/ticket.jpg" width="250" alt="Ticket de cierre del lunes con cuatro licencias">
</p>

- **Mejoras (izquierda):** una pestaña por rama y los nodos en vertical, unidos por una línea cuando uno pide el anterior. Cada nodo enseña si está comprado, su precio y, en las de niveles, cuadritos por nivel. Al tocarlo se abre su ficha con qué hace y el botón de compra.
- **Ticket de cierre (derecha):** aparece en Calle al acabar la jornada, con aspecto de papel térmico. Cabecera con las licencias que trabajaron ese día; líneas de carreras, kilómetros, recaudación, combustible, conductores, costes fijos y neto (en ese orden); debajo, las incidencias. El juego se para hasta «Arrancar día siguiente» (se puede desactivar en Partida).

### Partida

Ajuste «Parar al cierre del día», exportar e importar la partida como texto y borrar la partida.

---

## 5. Sistemas

### 5.1 Reloj y jornada

- **Un día de juego dura 100 segundos reales.** La mejora Jornada larga lo alarga hasta 60 s más; los coches trabajan al mismo ritmo real, así que caben más carreras contra el mismo coste fijo diario.
- **Turnos:** día de 7:00 a 19:00 y noche de 19:00 a 7:00.
- **Jornada de 7:00 a 7:00.** A las 7:00 se cierra la caja, se cobran los costes fijos y sale el ticket. La madrugada cuenta como la noche del día anterior.
- **Fin de semana:** sábado y domingo, tarifa 2 todo el día.
- **Sin conexión:** el juego cuenta hasta 8 horas reales fuera, con la media de cada zona y hora (sin eventos nuevos). Si había pausa al cierre, resuelve los días seguidos y deja un único ticket con la suma. Da entre un 1 % y un 2 % más que jugando. Tu turno no produce mientras estás fuera.

### 5.2 Zonas

Cada zona tiene una demanda de viajes por hora que cambia con la hora, el día de la semana y un pequeño azar por jornada (±20 %). Si hay más coches de los que la zona pide, los que sobran esperan más y gastan combustible en vacío (o esperan en la cola sin gastar, en las zonas con parada).

| Zona | Cómo se abre | Carácter | Viajes |
| --- | --- | --- | --- |
| Centro | Desde el principio | Muchas carreras cortas, demanda constante; se vacía de madrugada | 1,8 km (45 %), 3,5 km (40 %), 7 km (15 %) |
| Ocio nocturno | Desde el principio | Solo de noche y sobre todo de jueves a sábado; siempre tarifa 2; rinde claramente más que el centro de noche | 4 km (30 %), 8 km (45 %), 13,5 km (25 %) |
| Estaciones | Mejora Parada en Atocha y Chamartín | Picos con la llegada de los trenes; cola corta de unos 6 min | 3 km (35 %), 6 km (45 %), 11 km (20 %) |
| Aeropuerto | Mejora Acreditación de Barajas | Carreras caras con tarifa fija; cola de 1 a 2 horas en la parada | 60 % tarifa 4 (33 €), 40 % tarifa 3 a 7, 18 o 32 km |

**Lluvia:** el 20 % de las jornadas llueve de 1 a 3 horas y la demanda se duplica en todas las zonas.

### 5.3 Carreras

- **Tus carreras (a clic):** tocas el taxímetro, esperas según la demanda de tu zona (con poca demanda, hasta que aparece alguien), viajas y cobras. Solo puedes trabajar dentro de la franja de tu turno y no el día que libra tu licencia.
- **Las de tus conductores (solas):** cada conductor espera su parte de la demanda de la zona, viaja y cobra al terminar; el 50 % es suyo. Sin clientes, hace un tramo en vacío hasta la hora siguiente.
- **Zonas de los conductores:** las eligen ellos. Sin el Curso gestión de zonas, al azar entre las que tienen clientes; con el curso, cada hora la que más deja al dueño contando a los compañeros. La tuya la eliges tú.

### 5.4 Licencias, coches y libranza

- **Licencia:** 3.000 € la segunda y un 15 % más cara cada siguiente, hasta las 15.812 de Madrid. Al comprarla eliges entre **dos placas con letras distintas**, cada una con su libranza.
- **Coche:** 1.500 € (un solo modelo, Turismo). Sin coche, la licencia no trabaja.
- **Libranza:** el día que le toca, la licencia no trabaja en ninguno de sus dos turnos, tampoco el tuyo. Cada licencia libra unos 2 de cada 7 días (su día de semana y la mitad de los fines de semana). Los costes fijos se pagan igual: elegir bien la placa reparte las libranzas de la flota.

### 5.5 Costes

| Coste | Cuánto | Cuándo |
| --- | --- | --- |
| Combustible | 1,55 €/l × 6 l/100 km, también en vacío | En cada carrera |
| Conductor | 50 % de lo que recauda | En cada carrera |
| Cuota de autónomo | 17,83 € | Al cierre de cada jornada |
| Seguro | 10 € por coche (baja con mejoras) | Al cierre |
| Emisora | 3 € por coche, solo con la mejora Emisora | Al cierre |
| Incidencias | Limpiezas, neumáticos, reparaciones, finiquitos | Cuando pasan |

### 5.6 Conductores

**Contratar.** Hay siempre tres candidatos (personajes y cualidades distintos), con su retrato, categoría, rasgos y precio. Se quedan hasta que contratas a uno; entonces salen otros tres. Si no te llega, la tarjeta dice cuánto falta y deja vender objetos ahí mismo. Se puede contratar para un turno libre o para la reserva.

**Categorías.** Salen al azar, con los mismos pesos que los objetos:

| Categoría | Probabilidad | Precio | Cualidades | Defectos | Fuerza de la cualidad | Fuerza del defecto | Encuentra objetos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B | 65 % | 400 € | 1 | 2 | ×1 | ×1 | ×1 |
| A | 25 % | 900 € | 1 | 1 | ×1,2 | ×0,85 | ×1,15 |
| S | 7,5 % | 2.000 € | 1 | 1 la mitad de las veces | ×1,4 | ×0,7 | ×1,3 |
| S+ | 2 % | 5.000 € | 1 | 0 | ×1,6 | — | ×1,5 |
| LEGENDARIO | 0,5 % | 12.000 € | 2 | 0 | ×1,8 | — | ×2 |

Con tres candidatos, uno de cada 65 contratos más o menos ofrece un LEGENDARIO; al principio no te lo puedes permitir, y esa es la gracia.

**Rasgos.** Una cualidad nunca sale con su defecto opuesto. La fuerza de la categoría escala el efecto («+30 %» con fuerza ×1,8 es «+54 %»).

| Cualidad | Efecto | Defecto opuesto | Efecto |
| --- | --- | --- | --- |
| Simpático | +30 % de propinas | Antipático | −30 % de propinas |
| Cuidadoso | −40 % de pinchazos y averías | Manazas | +50 % de pinchazos y averías |
| Conoce la ciudad | −10 % de espera entre carreras | Lento | +10 % de espera |
| De hierro | La mitad de bajas | Enfermizo | +60 % de bajas |
| Ojo avizor | La mitad de clientes sin pagar | Despistado | +60 % de clientes sin pagar |
| Honrado | +50 % de objetos devueltos | — | |
| Búho | −12 % de espera de noche | Trasnochador flojo | +12 % de espera de noche |
| Madrugador | −12 % de espera de día | Dormilón | +12 % de espera de día |

**Experiencia y niveles.** Cada carrera da 1 punto (un conductor hace unas 25–30 por jornada). Cada nivel acorta la espera un 2,5 %; los niveles 4 y 8 abren un hueco más de objeto. **Al llegar al nivel 10** pierde un defecto o, si no tiene ninguno, gana una cualidad nueva.

| Nivel | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Experiencia total | 0 | 20 | 48 | 87 | 142 | 219 | 326 | 477 | 688 | 983 |
| Huecos de objeto | 1 | 1 | 1 | 2 | 2 | 2 | 2 | 3 | 3 | 3 |

El nivel 5 llega hacia la quinta jornada y el 10 hacia la 35 (cerca de una hora de juego por conductor).

**Topes.** Rasgos, nivel, objetos y mejoras se multiplican, pero el resultado nunca baja ni sube de estos límites sobre el valor normal:

| Valor | Mínimo | Máximo |
| --- | --- | --- |
| Espera entre carreras (sin contar las mejoras de búsqueda) | ×0,6 | ×1,4 |
| Propinas (con la mejora Propinas) | ×0,5 | ×2,5 |
| Sin pagar, objetos devueltos, bajas, pinchazos, averías | ×0,3 | ×2 |
| Limpieza de un vómito | ×0,4 | ×1,5 |

La Cámara de seguridad sigue dejando a cero los clientes sin pagar.

**Reserva.** Hasta 5 conductores contratados sin turno. No trabajan, no ganan experiencia y no cuestan nada; conservan objetos y nivel.

**Reorganizar.** Solo entre jornadas, con el día cerrado: un conductor se arrastra (o se mueve desde su ficha) a otro turno, otra licencia o la reserva; si el sitio está ocupado, se intercambian. Baja, objetos y nivel van con él; la avería se queda en el coche.

**Despedir.** Cuesta un finiquito de 100 € + 60 € por nivel (160 € en el nivel 1, 700 € en el 10), pide confirmación y sale en el ticket. Sus objetos vuelven al almacén.

**Tú.** Tu turno es siempre a clic y no tiene rasgos ni nivel. Con la Oficina de gestión puedes dejar el volante y volver a un turno libre cuando quieras.

### 5.7 Objetos y almacén

- **Encontrarlos:** cada carrera de un conductor tiene un 1,2 % de dar un objeto (más según su categoría). Tú no encuentras, y sin conexión tampoco. Se sortea la categoría con los pesos de la tabla de arriba y, dentro de ella, el objeto. Sale un aviso con su retrato.
- **Almacén:** guarda 10 objetos sin equipar (hasta 40 con Taquillas). Si está lleno, lo encontrado espera en una **bandeja** hasta que vendes algo: nada se vende solo.
- **Equipar:** desde la ficha de cada conductor, en sus huecos, sin repetir objeto. Quitarlo lo devuelve al almacén.
- **Vender:** B 40 €, A 120 €, S 400 €, S+ 1.200 €, LEGENDARIO 4.000 €. Entra en la caja como «Venta de objetos».

| Categoría | Objeto | Efecto |
| --- | --- | --- |
| B | Ambientador | +10 % de propinas |
| B | Cojín lumbar | −15 % de bajas |
| B | Termo de café | −4 % de espera de noche |
| B | Gafas de sol | −4 % de espera de día |
| B | Funda de asientos | Vómito sin bolsa: −25 % de limpieza y menos rato parado |
| B | Callejero de papel | −3 % de espera |
| A | GPS | −6 % de espera |
| A | Manómetro de ruedas | −30 % de pinchazos |
| A | Caramelos para clientes | +20 % de propinas |
| A | Espejo panorámico | −30 % de clientes sin pagar |
| A | Vitaminas | −30 % de bajas |
| A | Alfombrillas de goma | Vómito: −45 % de limpieza y menos rato parado |
| S | Radio-escáner | −10 % de espera |
| S | Kit de herramientas | −35 % de averías y −20 % de pinchazos |
| S | Cargador para clientes | +30 % de propinas y +20 % de objetos devueltos |
| S | Botiquín | −45 % de bajas |
| S | Datáfono portátil | La mitad de clientes sin pagar |
| S+ | Navegador con tráfico en directo | −14 % de espera |
| S+ | Silla ergonómica | La mitad de bajas y −7 % de espera de noche |
| S+ | Nevera con agua fría | +45 % de propinas y −30 % de limpieza |
| S+ | Detector de baches | La mitad de pinchazos y −30 % de averías |
| LEGENDARIO | Planta de Paconi | −10 % de espera, +30 % de propinas y −30 % de bajas |
| LEGENDARIO | Bocata de calamares infinito | −60 % de bajas y −12 % de espera de día |
| LEGENDARIO | Bidón energético | −22 % de espera de noche y −20 % de bajas |

**Consumibles** (comunes a toda la flota, se compran): **ruedas de repuesto** (80 €, hasta 10; un pinchazo gasta una y el taxi sigue) y **bolsas de papel** (2 €, hasta 50; un vómito gasta una y no pasa nada). Cada uno se desbloquea con su mejora; con pocas unidades, la pestaña Flota avisa.

### 5.8 Eventos

Van a la caja y salen como incidencias en el ticket. Sin mejoras, su efecto neto queda cerca de cero, salvo los vómitos, que a propósito son un coste que se evita con bolsas.

| Evento | Cuándo | Probabilidad | Efecto |
| --- | --- | --- | --- |
| Propina | Por carrera (también las tuyas) | 15 % | 5 a 25 % del importe |
| Sin pagar | Por carrera | 1 % | Se pierde el importe |
| Objeto devuelto | Por carrera | 1 % | Recompensa de 5 € (paraguas) a 300 € (maletín) |
| Vómito | Por carrera | 0,08 % de día, 1 % de noche, 3 % en Ocio nocturno | Limpieza de 50 a 90 € y una hora parado (con bolsa, nada) |
| Pinchazo | Al empezar un turno | 1,5 % | Neumático de 120 € y parado el resto del turno (con rueda de repuesto, nada) |
| Baja | Al empezar un turno de conductor | 0,8 % | De 1 a 5 jornadas sin trabajar |
| Avería | Al empezar un turno de conductor, con 2 coches o más | 0,08 % | De 10 a 20 jornadas en el taller y 150 a 400 € |
| Lluvia | Una vez por jornada | 20 % | De 1 a 3 horas con el doble de demanda |
| Objeto encontrado | Por carrera de conductor | 1,2 % | Un objeto para el almacén (ver 5.7) |

### 5.9 Mejoras

Cinco ramas. Las que no piden otra abren su rama; las demás piden la anterior (basta su nivel 1). Precios ajustados para que cada mejora se pague en una o dos horas de juego con 6 coches.

**Clientes**

| Mejora | Precio | Efecto |
| --- | --- | --- |
| Bolsas de papel | 800 € | Desbloquea las bolsas en el almacén |
| Callejero al día | 400 € | −10 % de tiempo buscando cliente |
| Taxi impecable | 600 € | +5 % de demanda en todas las zonas |
| Propinas (5 niveles) | 1.350 / 1.980 / 2.700 / 3.600 / 4.500 € | De +3 a +15 puntos de probabilidad y propinas de un 15 a un 80 % mayores |
| Pago con tarjeta | 1.440 € | +10 % de demanda |
| Cámara de seguridad | 1.000 € | Nadie se va sin pagar |
| Clientes de siempre | 2.000 € | +8 % de demanda |

**Ciudad y radio**

| Mejora | Precio | Efecto |
| --- | --- | --- |
| Parada en Atocha y Chamartín | 2.500 € | Abre Estaciones |
| Acreditación de Barajas | 2.000 € | Abre el Aeropuerto |
| Emisora de radio-taxi | 1.300 € | −30 % de tiempo buscando; cuota de 3 € por coche y día |
| Parada junto a las salas de fiesta | 2.300 € | En Ocio: la mitad de tiempo buscando y +15 % de demanda |
| Turnos coordinados en Barajas | 3.000 € | La cola del aeropuerto, a la mitad (30–60 min) |
| App de pedidos | 4.000 € | Otro −30 % de tiempo buscando |

**Vehículo**

| Mejora | Precio | Efecto |
| --- | --- | --- |
| Deflectores de viento | 350 € | −15 % de bajas: los conductores ventilan sin corrientes |
| Curso de conducción eficiente | 800 € | −10 % de combustible |
| Neumáticos de bajo consumo | 900 € | −8 % de combustible |
| Flota híbrida | 4.000 € | −35 % de combustible |

**Taller y seguros**

| Mejora | Precio | Efecto |
| --- | --- | --- |
| Rueda de repuesto | 300 € | Desbloquea las ruedas en el almacén |
| Mecánico propio (5 niveles) | 300 / 525 / 750 / 1.050 / 1.350 € | Averías de un 15 a un 65 % más cortas y de un 15 a un 60 % más baratas |
| Póliza de flota | 700 € | −20 % de seguro |
| Curso de seguridad vial | 675 € | Otro −25 % de seguro |

**Conductores y jornada**

| Mejora | Precio | Efecto |
| --- | --- | --- |
| Curso gestión de zonas | 2.500 € | Los conductores van cada hora a la zona que más deja |
| Taquillas (3 niveles) | 600 / 1.800 / 4.500 € | Almacén de 20, 30 y 40 objetos |
| Sacudir esterillas (5 niveles) | 450 / 720 / 990 / 1.350 / 1.800 € | Cada conductor encuentra de 0,50–2 € a 3–8 € al acabar su turno |
| Jornada larga (5 niveles) | 400 / 700 / 1.000 / 1.400 / 1.900 € | El día dura 10, 20, 30, 45 y 60 s más |
| Oficina de gestión | 6.000 € | Puedes dejar el volante y solo gestionar (pide el nivel 1 de Jornada larga) |

---

## 6. Progresión a largo plazo

El juego completo tiene cinco etapas; cada una añade un tipo de vehículo y una mecánica nueva, sin quitar las anteriores. **Hoy solo existen las etapas 1 y 2.**

| Etapa | Qué gestionas | Mecánica nueva |
| --- | --- | --- |
| 1. Autónomo | Un taxi que conduces tú | Elegir zona y horario; primer conductor para el segundo turno |
| 2. Flota de Madrid | Varias licencias y conductores | Zonas, aeropuerto y estaciones, conductores con categorías, objetos |
| 3. Empresa de movilidad | VTC, furgonetas, autobuses | Gerentes que automatizan, contratos con hoteles y empresas |
| 4. Operador nacional | Autocares, trenes, logística | Varias ciudades y rutas entre ellas |
| 5. Imperio mundial | Aerolíneas y navieras | Rutas entre continentes |

**VTC:** aparecerán en la etapa 3 como rival que resta demanda en algunas zonas, antes de que el jugador pueda tener las suyas.

**Prestigio:** a partir de la etapa 3, vender la empresa y empezar en otra ciudad con una ventaja permanente (por ejemplo, reputación que aumenta la demanda).

### Alcance de la versión actual

Incluye todo lo descrito en las secciones 4 y 5. Queda fuera: VTC y otros vehículos, gerentes, otras ciudades, prestigio, la tarifa 7 y los suplementos de Nochebuena y Nochevieja.

---

## 7. Técnica

HTML, CSS y JavaScript sin framework ni paso de compilación; se juega abriendo `index.html` y se publica tal cual en GitHub Pages.

- **Datos separados del código:** todos los números están en `js/config.js`, marcados como dato real, dato de Iván o equilibrio.
- **Lógica separada de la pantalla:** una sola función avanza el tiempo (`avanzar`), la misma con el juego abierto y sin conexión; la simulación no sabe nada del HTML y se prueba sin navegador (`node tests/simulacion.test.js`).
- **Azar con semilla:** todo lo que afecta a la flota sale de un generador guardado en la partida.
- **Guardado:** `localStorage` con número de versión (hoy, la 21) y migraciones para que las partidas antiguas sigan cargando; exportar e importar como texto.
- **Diseño:** primero para móvil, en una sola columna, con los colores del taxi de Madrid (blanco, rojo de la franja y verde de «libre»). Todas las animaciones se apagan con «reducir movimiento».

Las convenciones de código están en `CLAUDE.md`.

---

## 8. Historial de decisiones

**13 de noviembre de 2026**

- El día dura 100 segundos y se alarga con mejoras; los costes fijos se cobran una vez por jornada.
- Los conductores cobran un porcentaje de lo que recaudan (50 %, dato de Iván).
- El precio de la licencia sube con cada compra.
- Tus carreras son siempre a clic, también con conductores. Dejar de conducir es una mejora (Oficina de gestión).
- La jornada va de 7:00 a 7:00, con pausa y ticket al cierre (desactivable).
- Ocio nocturno rinde más que el centro de noche, sobre todo de jueves a sábado.
- Cada licencia recibe un número al azar con su letra.
- El juego se llama Libre.

**16 de noviembre de 2026**

- Los conductores hacen carreras reales y cobran al terminar cada una.
- Eventos aleatorios: propinas, impagos, objetos devueltos, vómitos (con bolsas), pinchazos (con ruedas de repuesto), bajas, averías y lluvia.
- Tarifa 3 con bajada de bandera de 22 € hasta 9 km; espera de 1 a 2 horas en Barajas.
- Conductores con cualidades y defectos, experiencia hasta el nivel 10, objetos equipables y finiquito al despedir.

**17 de noviembre de 2026**

- Los objetos ya no se compran: los encuentran los conductores. 24 objetos en cinco categorías (B, A, S, S+, LEGENDARIO), con venta y bandeja.
- Los conductores también tienen categoría, que fija su precio y la fuerza de sus rasgos; los B tienen dos defectos y el nivel 10 quita un defecto o da una cualidad.
- Reserva de conductores y reorganización entre jornadas, arrastrando.
- La libranza entra en el juego, con elección entre dos placas al comprar. El ritmo se alarga a unos 70–78 minutos para tres licencias con conductores y se deja así.
- Pantalla Calle con taxímetro de dos modos, lista «Tus taxis hoy» y tira de ambiente; pestaña Flota compacta con licencias de dos en dos; ticket con las licencias que trabajaron.
- Almacén de 10 objetos con la mejora Taquillas; Jornada larga en una sola mejora de cinco niveles que abre la Oficina de gestión; Deflectores de viento en Vehículo.

---

## Anexo: primer prompt para Claude Code

Este fue el prompt con el que empezó el proyecto, con este archivo guardado como `DISENO.md`.

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
