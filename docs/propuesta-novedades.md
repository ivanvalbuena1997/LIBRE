# Propuesta de novedades (26-11-2026)

Borrador para que Iván lo revise antes de programar nada. Los importes son
fijos (el evento deja siempre lo mismo). Los km de los viajes son
aproximados, de memoria, sin mirar un mapa.

---

## 0. ¿Ordenar el código antes?

Hoy: `js/interfaz.js` 4.048 líneas, `js/simulacion.js` 4.038, `js/config.js`
1.569, `css/estilos.css` 2.605 y `CLAUDE.md` 852.

**Recomendación: sí, pero acotado.** Antes del chat y de los filtros del
almacén (que tocan sobre todo la interfaz):

1. **Partir `interfaz.js` por pantallas**, sin cambiar nada de lo que hace:
   `ui-comun.js` (utilidades, iconos, avisos, sonido), `ui-calle.js`
   (taxímetro, ticket, zonas, «Tus taxis hoy»), `ui-conductores.js`
   (licencias, ficha, candidatos, comparar), `ui-almacen.js`,
   `ui-mejoras.js`, `ui-personaje.js`, `ui-historia.js` (intro y eventos) e
   `interfaz.js` (el bucle, los clics y `dibujar()`). Todos cuelgan de
   `Libre.ui`, como ahora.
2. **Resumir `CLAUDE.md`** a lo que sirve para trabajar (reglas,
   arquitectura, dónde está cada cosa), y dejar el detalle de cada función
   en los comentarios del código.

`simulacion.js` lo dejaría como está por ahora: lo cubren las 139 pruebas y
es donde menos se pierde uno.

Riesgo: las pruebas no cubren la interfaz, así que lo comprobaría pantalla
por pantalla en el navegador. Es un commit sin cambios para el jugador.

---

## 1. Arreglos

1. **La lluvia, por encima de todo.** Hoy va dentro del dibujo de la calle y
   los coches, el autobús, las bicis y la gente pasan por delante. La saco a
   una capa aparte, encima de todos.
2. **Nombre de la flota (la SL).** Propuesta: debajo de «Libre», con la
   misma letra, más pequeño (unos 16 px), en el color de la marca, sobre un
   recuadro crema al ~35 % de opacidad con las esquinas redondeadas. De
   noche, letra clara sobre recuadro oscuro. Así deja hueco también para el
   botón nuevo del chat. Te enseño captura antes de subirlo.
3. **Avisos que tapan «Ver los N restantes».** Mientras hay un aviso a la
   vista, la pestaña Calle tiene por debajo un hueco del alto del aviso, así
   se puede bajar hasta el botón. Sin aviso, todo como ahora (sigue cabiendo
   sin scroll con 5 taxis).
4. **Nombres extranjeros.** Quito «Daniela» de los conductores normales
   (pasa a ser solo la ÚNICA) y pongo cuatro nuevos (Paco y Francisco se
   quedan):
   - **Fátima** (en el hueco de Daniela, mujer).
   - **Ionuț** (rumano, hombre).
   - **Mamadou** (senegalés, hombre).
   - **Mei** (china, mujer).
   Los conductores que ya se llamen Daniela en tu partida conservan su
   nombre; solo cambia para los candidatos nuevos.
5. **Nubes ilustradas.** Sí, se puede. Prompt:

   > Three separate soft fluffy clouds of different sizes, flat editorial
   > vector style, clean rounded shapes, flat shadows, subtle grain. Warm
   > cream-white color with soft light teal-grey shadows on the bottom side,
   > like the clouds in a children's book poster. Seen from the side,
   > horizontally elongated, well separated from each other. The background
   > must be **one flat solid pure bright green color (#00FF00)**, completely
   > uniform. **No text, no birds, no sun, no sky gradient.**

   Para la tormenta, las oscurezco yo con un filtro.

---

## 2. Almacén

1. **Filtros.** Una fila de chips arriba: «Todos», «B», «A», «S», «S+»,
   «LEGENDARIO». Y un desplegable «Mejora…» con las estadísticas (espera,
   propinas, sin pagar, objetos, bajas, pinchazos, averías, limpieza,
   hallazgos, suerte, cansancio, descanso, lluvia): enseña solo los objetos
   que mejoran esa. Los dos filtros se pueden juntar. Se recuerdan en el
   navegador, como la pestaña elegida.
2. **Combinar automáticamente.** En el Almacén, «Combinar solo hasta: No ·
   A · S · S+ · LEGENDARIO». Con «hasta S»: cada vez que entra un objeto, si
   hay bastantes B se combinan en A y si hay bastantes A, en S. Los S ya no
   se combinan. Usa los repetidos primero, como el botón de combinar.
   - **Se protegen** los objetos de sinergia de los ÚNICOS que tengas
     (Planta de Paconi, Chicles de menta y el Saco de colines): esos no se
     combinan solos.
   - Se guarda en la partida (sube la versión del guardado).

---

## 3. Objeto nuevo: Saco de 10 kg de colines

- **Categoría S.** Solo no hace nada.
- **Sinergia con Paconi y con El Pelado** (Marcelo es su nombre real; Iván, 26-11-2026): **−40 % de
  cansancio**. Es fuerte a propósito porque solo sirve a dos.
  Con Paconi y su Planta (−20 %), juntos: −52 %.
- Frase (propuesta): «Diez kilos. Por si acaso. Nadie sabe de qué caso.»
- Descripción: «No hace nada… salvo para quien sabe apreciarlos.»
- Si no lo usas, se vende como cualquier S.

---

## 4. Daniela, ÚNICA (#03)

**¿Es viable?** Sí. Es un concepto nuevo (no conduce), pero cabe en lo que
ya hay: ocupa un turno como cualquier conductor y la simulación la salta a
la hora de buscar clientes. Hay que tocar el reparto de carreras, los
eventos de inicio de turno (no pincha ni se avería), «Tus taxis hoy» y su
ficha (sus estadísticas son las de la flota).

**Quién es:** 6 años, las cosas muy claras. Su padre, Daniel, es su
representante; su madre se llama Sonia. Tiene un hermano de 1 año, Álvaro. Le tiene manía a Paconi. Frase
favorita: «¡Paconi, a trabajar!».

### Habilidades (propuesta)

1. **Segunda jefa:** los demás conductores la ven como jefa y no se
   duermen: **−6 % de espera** a todos los conductores de la flota (a ti
   no).
2. **Las cuentas claras:** negocia los sueldos: los conductores se quedan
   **3 puntos menos** de cada carrera (50 % → 47 %).
3. **Aquí no se escaquea nadie:** **−30 % de bajas** en toda la flota.
4. **«¡Paconi, a trabajar!»:** con Paconi en la flota, Paconi se pone malo
   **la mitad** (7 % → 3,5 %)… pero le revisa las cuentas: su «ajuste de
   periodos anteriores» baja a la mitad (12–18 % → 6–9 %).
5. **Sin topes**, como todos los ÚNICOS.

### Debilidades (propuesta)

1. **No conduce:** ocupa un turno y **ese turno el coche se queda
   parado**. En «Tus taxis hoy» sale con un chip morado **«Dirigiendo»** y
   sin facturación.
2. **Solo de día:** a las 21:00, a la cama.
3. **Paga y chuches:** **25 € al cierre** de cada jornada (línea propia en
   el ticket).
4. **Hermana mayor:** el **8 %** de las jornadas se queda cuidando de su
   hermano: ese día sus habilidades no cuentan («Hoy no puedo, cuido de
   Álvaro»).
5. Nunca de incógnito.

Con pocos conductores rinde poco (manda sobre nadie); con una flota grande,
mucho. Lo mediré con el bot, como a Paconi y El Pelado, y lo ajustamos.
Propongo que su evento solo salga **a partir de la SL** (3 licencias).

### Su evento: «De Parla a Almería» (de día)

> En Parla suben una familia con maletas para todo el verano: el padre,
> Daniel; la madre, Sonia; Álvaro, un bebé de un año en su sillita, y
> Daniela, una niña de seis con una carpeta bajo el brazo. Van a
> Almería. Son más de 500 km y da para mucha conversación: el padre, Daniel,
> que además es su representante, te cuenta que Daniela lleva las cuentas
> de casa, negocia su propia paga y ya tiene tarjetas de visita. Daniela te
> mira por el retrovisor: «¿Y tu flota qué tal va?».

Viaje: unos 550 km (aproximado) → por taxímetro saldrían unos 770 €.
**700 €** y **6 horas de juego parado** (aprobado por Iván, 26-11-2026) (el taxi está fuera todo
ese tiempo).

| Decisión | Resultado |
| --- | --- |
| «Es muy pequeña para trabajar» | Cobras 700 €. Daniela se cruza de brazos: «Tú te lo pierdes». Puede volver en otro evento. |
| «Te doy mi tarjeta, Daniel» | Cobras 700 €. Daniela queda en tu agenda: siempre entre los candidatos hasta que la contrates. |
| «¿Cuándo empiezas, jefa?» | Cobras 700 €. Daniela se ofrece **gratis** si la contratas hoy; si no, queda en tu agenda. |

**Prompt del retrato** (cuadrado, como Paconi y El Pelado):

> Square portrait avatar, flat editorial vector style, clean shapes, flat
> shadows, subtle grain. Limited palette: deep teal, toasted orange, cream
> and dark brown. Head and shoulders of a **confident 6-year-old girl** with
> brown hair in a high ponytail, round cheeks, a small knowing smile and one
> raised eyebrow, wearing a tiny navy blazer over a striped t-shirt, holding
> a clipboard against her chest like a boss. Plain soft warm cream
> background, centered, the face filling most of the frame so it reads well
> inside a small circle. **No text, no letters, no numbers, no frame.**

**Prompt del evento** (con la base adjunta):

> Using the attached image as the base: keep exactly the same camera angle,
> car interior, driver (on the right, at the wheel), art style and palette.
> Change only the following:
> - **Daytime**, a long motorway through dry hills and olive groves seen
>   through the windows, bright summer light.
> - In the **front passenger seat**, a friendly father in his thirties with a
>   short beard, talking enthusiastically to the driver and gesturing.
> - In the **back seat**, a **6-year-old girl** in a booster seat with a high
>   ponytail and a small navy blazer, holding a clipboard, looking very
>   seriously at the driver through the rear-view mirror. Next to her, a
>   **1-year-old baby boy** in a rear-facing car seat with a pacifier, and
>   on the other side the **mother**, in her thirties, long dark hair,
>   smiling and holding a bag of snacks.
> - Suitcases and a beach bag piled behind the back seat.
>
> Same lower cream area, kept simple. **Absolutely no text, no letters, no
> signs, no logos, no numbers anywhere in the image.**

---

## 5. Cinco eventos nuevos

Todos con la imagen base adjunta y el mismo comienzo y final de siempre:

> Using the attached image as the base: keep exactly the same camera angle,
> car interior, driver (on the right, at the wheel), art style and palette.
> Change only the following:
> …
> Same lower cream area, kept simple. **Absolutely no text, no letters, no
> signs, no logos, no numbers anywhere in the image.**

### 5.1 «La novia a la fuga» (de día)

> A la puerta de una iglesia de Chamberí, una novia con el vestido recogido
> en los brazos abre la puerta de atrás y se tira dentro: «¡Arranque, por lo
> que más quiera!». Por el retrovisor, el novio corre hacia el taxi.

| Decisión | Resultado |
| --- | --- |
| «Arrancar» | **70 %:** la dejas en casa de una amiga: 25 € y 50 € de propina «para que no cuentes nada». **30 %:** el novio os alcanza en un semáforo, se suben los dos y se reconcilian dentro: 25 € y media hora parado. |
| «Esperar al novio» | **50 %:** suben los dos y te piden ir al banquete: 40 €. **50 %:** discuten en la acera y se van andando: nada. |
| «¿Está usted segura?» | Se lo piensa y vuelve a la iglesia. Al salir, el padrino te da 60 € «por salvar la boda». Experiencia. |

Prompt:
> - **Daytime.** Through the rear window, the steps of an old church with
>   flowers.
> - In the **back seat**, a **bride** in a white wedding dress and veil,
>   holding her bouquet, breathless and determined, pointing forward.
> - Through the **rear window**, far away, a **groom in a suit running**
>   towards the taxi with his arms up.
> - The **driver** looks at the bride in the rear-view mirror, eyebrows up.
> - Front passenger seat empty.

### 5.2 «El turista de Barajas» (de día) · dos opciones

> Sale de la T4 un turista despistado, con una mochila enorme, que pide «el
> centro» en inglés. Por tarifa fija son 33 €. Un compañero de la fila te
> guiña un ojo: «Dale una vuelta por la M-40…».

| Decisión | Resultado |
| --- | --- |
| «Tarifa fija, como debe ser» | 33 € y una reseña de cinco estrellas. Experiencia. |
| «La M-40 es muy bonita» | **60 %:** 78 €. **40 %:** llevaba el GPS en el móvil y te denuncia: 78 € y 400 € de multa. |

Prompt:
> - **Daytime.** Through the windows, the wavy roof of a modern airport
>   terminal.
> - In the **back seat**, a **sunburnt tourist** with a huge hiking backpack,
>   a bucket hat and a Hawaiian shirt, holding up a phone with a map (no text
>   on the screen), smiling and lost.
> - The **driver** looks at him in the rear-view mirror, thinking.
> - Front passenger seat empty.

### 5.3 «¡Que viene!» (a cualquier hora) · dos opciones

> Sube una pareja: ella acaba de romper aguas. El hospital está a quince
> minutos… si no pillas ningún semáforo.

| Decisión | Resultado |
| --- | --- |
| «¡A toda pastilla!» | **70 %:** llegáis a tiempo: 20 € y 100 € de propina. **30 %:** te salta un radar: 120 € y 200 € de multa, pero llegáis a tiempo. Mucha experiencia en los dos casos. |
| «Llamar al 112 y esperar la ambulancia» | La ambulancia tarda veinte minutos. Nada de dinero. Algo de experiencia. |

Prompt:
> - **Night**, city lights through the windows and, ahead, the lit entrance
>   of a hospital.
> - In the **back seat**, a **pregnant woman** breathing hard, one hand on her
>   belly, and her **partner** holding her hand in panic.
> - The **driver**, determined, both hands on the wheel, leaning forward.
> - Front passenger seat empty.

### 5.4 «El maletín» (de día)

> Acabas de dejar a un ejecutivo en AZCA y en el asiento de atrás ves un
> maletín de cuero. Pesa bastante.

| Decisión | Resultado |
| --- | --- |
| «Llevárselo a su oficina» | Media hora parado y 150 € de propina. Experiencia. |
| «Dejarlo en objetos perdidos» | Un cuarto de hora. **30 %:** al día siguiente te llama y te da 100 € de recompensa. |
| «Abrirlo, por si acaso» | **50 %:** papeles aburridos y un bolígrafo de oro que te quedas (un objeto de categoría A). **50 %:** vuelve justo en ese momento: «¿Qué hace?». 100 € de reclamación. |

Prompt:
> - **Daytime.** Through the windows, tall glass office skyscrapers.
> - On the **back seat**, a **brown leather briefcase** forgotten, with a
>   golden clasp.
> - The **driver** has turned around in his seat, looking at it with
>   curiosity.
> - Front passenger seat empty.

### 5.5 «Noche de final» (de noche) · dos opciones

> Noche de final de Champions. Cuatro aficionados con bufandas y la cara
> pintada, afónicos y felices, quieren ir a la fuente a celebrarlo.

| Decisión | Resultado |
| --- | --- |
| «¡A la fuente!» | **60 %:** 45 € y 40 € de propina de campeones. **40 %:** se ponen a botar y arrancan el retrovisor: 45 €, 120 € de taller y media hora parado. |
| «Hoy me voy a casa» | Apagas la luz verde. Nada. |

Prompt:
> - **Night**, crowded street with flags, confetti and fireworks in the sky
>   through the windows.
> - **Four football fans** squeezed in the car (one in the front passenger
>   seat, three in the back) with scarves, painted faces and flags in
>   generic colours (**no team badges, no real team colours**), singing and
>   cheering.
> - The **driver** smiles nervously, ears ringing.

(Paconi, El Pelado y Daniela no cambian sus eventos.)

---

## 6. El grupo de la flota (chat)

### Cómo funciona

- **Botón** en la cabecera, entre tu foto y el engranaje: un bocadillo de
  chat con un punto rojo si hay mensajes sin leer. Cabe porque el nombre de
  la SL baja debajo de «Libre» (arreglo 2).
- **Se desbloquea al montar la SL.** El primer mensaje es tuyo: te lo
  propongo ya escrito y lo puedes cambiar antes de enviarlo (Iván,
  26-11-2026):
  > «Equipo: hoy hemos montado {empresa} S.L. El negocio va bien gracias a
  > vosotros. ¡A por más carreras!»

  Y contestan dos de tus conductores («¡Enhorabuena, jefe!», «¿Eso
  significa subida de sueldo?»).
- **Al cerrar cada jornada**, 1–3 mensajes nuevos. Salen de lo que ha
  pasado ese día (sin pagar, pinchazos, bajas, lluvia, una propina grande,
  un nivel, un LEGENDARIO encontrado, un evento de cliente, una multa…) y,
  si no pasa nada especial, charla normal. Los ÚNICOS solo hablan si están
  en tu flota.
- **Pantalla:** hoja a pantalla completa estilo WhatsApp: cabecera con el
  nombre del grupo («{empresa} · Conductores»), burbujas con la cara de quien
  escribe y su nombre en color, tus mensajes a la derecha en verde, separador
  por día («Día 14») y fotos cuando las haya.
- Se guardan los **últimos 80 mensajes** en la partida (sube la versión del
  guardado). Al empezar de cero, el grupo se borra.

### Los 50 mensajes (propuesta)

`{c1}`, `{c2}` = conductores al azar de tu flota; `{tu}` = tu nombre; `{zona}`
= una zona. Entre paréntesis, cuándo sale.

**Lo que ha pasado en la jornada**

1. (sin pagar) {c1}: Hola grupo, hoy se me fueron dos sin pagar… ¡Vaya día! / El Pelado: Che, {c1}, mucho ánimo. A mí ya no se me va nadie.
2. (sin pagar) {c1}: Uno me dijo que iba a sacar dinero al cajero. Sigo esperando. / {c2}: El clásico 😂
3. (pinchazo) {c1}: Pinchazo en plena Castellana. Con traje y todo. / {c2}: Foto o no pasó.
4. (pinchazo, con foto) {c1}: [foto: rueda pinchada] Esta es mi tarde.
5. (avería) {c1}: El coche ha dicho basta. Me voy al taller, jefe. / {tu}: Ánimo, mañana más.
6. (baja) {c1}: Jefe, mañana no voy, tengo 39 de fiebre. / {c2}: Ponte bueno 💪
7. (vómito) {c1}: Hoy he limpiado el coche tres veces. No pregunten. / {c2}: Ocio nocturno, ¿verdad? / {c1}: Ocio nocturno.
8. (lluvia) {c1}: Llueve y todo Madrid quiere taxi a la vez. / {c2}: Es el mejor día del año.
9. (tormenta) {c1}: Granizo en {zona}. Me he metido en un túnel a esperar. / Paconi: Es una trampa, muchachos.
10. (propina grande) {c1}: ¡Un señor me ha dejado 40 € de propina! / {c2}: ¿Le has dado tu número?
11. (nivel) {c1}: Ya me conozco {zona} mejor que mi casa. / {c2}: Eso es porque no vas por casa.
12. (LEGENDARIO encontrado) {c1}: Me he encontrado una cosa en el asiento de atrás que no sé ni qué es. / {c2}: Llévala al almacén, que el jefe colecciona.
13. (objeto devuelto) {c1}: Devuelto un móvil a una señora. Me ha dado un abrazo. / {c2}: Qué bonito. Yo encontré una dentadura.
14. (evento de cliente) {c1}: Hoy he llevado a alguien famoso. No puedo decir quién. / {c2}: ¿Era el de las gafas? / {c1}: No puedo decir nada.
15. (multa de pesetas) {c1}: Me ha pillado un pesetas trabajando en libranza. 2.000 €. / {c2}: Ay…
16. (mejor día) {tu}: Récord de caja hoy. ¡Sois unos máquinas! / {c1}: ¿Eso es una subida de sueldo? / {tu}: Es un «sois unos máquinas».
17. (ticket negativo) {c1}: Jefe, ¿todo bien? Te veo serio. / {tu}: Mañana remontamos.
18. (coche nuevo) {c1}: Huele a nuevo el coche, jefe. ¡Gracias! / {c2}: Yo quiero el Mercedes.
19. (avería definitiva) {c1}: El coche ha muerto. Descanse en paz. / {c2}: Ha sido un buen coche. 400.000 km de servicio.
20. (licencia nueva) {c1}: ¿Licencia nueva? ¡Esto crece! / {c2}: Que contraten a alguien majo.
21. (conductor nuevo) {c1}: Bienvenido al grupo, {c2}. / {c2}: ¡Gracias! ¿Dónde se aparca para comer? / {c1}: Esa es la pregunta del millón.

**Charla normal**

22. {c1}: Buenos días, grupo. Hoy hay obras en Gran Vía, ojo.
23. {c1}: ¿Alguien sabe a qué hora cierra la gasolinera de Méndez Álvaro? / {c2}: A las 23:00.
24. {c1}: Hoy he visto un taxi de Barcelona en Atocha. Perdidísimo. / {c2}: Pobre hombre.
25. {c1}: ¿Quién se ha dejado un táper en la cochera? / {c2}: Es mío, no lo toquéis.
26. {c1}: Cola en Barajas de hora y media. Me he leído medio libro. / {c2}: ¿Cuál? / {c1}: El del carné de conducir, por si acaso.
27. {c1}: Hoy un cliente me ha contado su vida entera en 8 minutos. / {c2}: Récord.
28. {c1}: Madrid en agosto es otra ciudad. / {c2}: ¿Es agosto? / {c1}: En mi corazón, siempre.
29. {c1}: ¿Partido esta noche? / {c2}: Noche de trabajo, entonces.
30. {c1}: Me han pedido ir «a la calle esa que tiene un árbol». / {c2}: ¿Y? / {c1}: La he encontrado.
31. {c1}: Café en la parada de Atocha a las 10, ¿quién se viene? / {c2}: Voy.
32. (con foto) {c1}: [foto: amanecer desde el taxi] Esto no lo ve un oficinista.
33. {c1}: Un niño me ha preguntado si el taxímetro es un videojuego. / {c2}: Lo es si llevas racha.
34. {c1}: Hoy no ha llovido, no ha pinchado nadie y no me ha vomitado nadie. / {c2}: Sospechoso.

**Paconi** (si está en la flota)

35. Paconi: Buenos días, mis tigres. Recuerden que hoy cortan la M-30 por obras. / Paconi: No pasen por allá, es una trampa. / {c1}: Ok. / {c2}: ¡Gracias, Paconi!
36. Paconi: Buen día, grupo. ¿Saben si el coche es anfibio?… Tuve un pequeño problema, jefe.
37. Paconi: El freno está esponjoso, ¿lo notaron? / {c1}: Paconi, es tu pie.
38. (con foto) Paconi: [foto: la Planta de Paconi en el salpicadero] Les presento a mi copiloto.
39. Paconi: Como dirían los yankees: shit happens. / {c2}: ¿Qué ha pasado? / Paconi: Engañoso.
40. (si hay un Paco o Francisco) Paconi: ¡Tocayo! Hoy invito yo al café. / {c1}: ¿Tú? / Paconi: Es una trampa, no vengas.

**El Pelado** (si está en la flota)

41. El Pelado: Che, jefe, mucha lechuga suelta hoy. Me fui un poco antes a casa.
42. El Pelado: Siete pibes en casa, hermano. Hoy hice el doble turno y cené a las cuatro.
43. El Pelado: Un kilometrito más no le hace mal a nadie. / {c1}: Pelado, el coche tiene 300.000. / El Pelado: Está joven.
44. (sin pagar a otro) El Pelado: El que se intente ir sin pagar conmigo se va en calzoncillos, ya saben.
45. (con foto) El Pelado: [foto: un bocadillo enorme en el salpicadero] Desayuno de campeones.

**Daniela** (si está en la flota)

46. Daniela: Paconi, tengo el finiquito listo. No me hagas mandártelo. / Paconi: Sí, jefa, descuide, este mes voy loco.
47. Daniela: ¡Paconi, a trabajar! / Paconi: Si estoy trabajando, muchacha. / Daniela: Pues más.
48. Daniela: Revisando las cuentas. {c1}, ¿por qué hay un café de 7 €? / {c1}: Era con tostada…
49. Daniela: Mañana no vengo, cuido de mi hermano. Portaos bien. / {c1}: Sí, jefa.
50. (con foto) Daniela: [foto: un dibujo con ceras de un gráfico que sube] Así vamos este mes. / El Pelado: Che, qué buena pinta.

### Prompts de las fotos

Fotos tipo móvil, mismo estilo, formato cuadrado:

Hechas (26-11-2026): las seis. Una sola foto de cada
(Iván: no hace falta una por modelo de coche).

**Pendientes.** Cada prompt lleva el bloque de estilo completo, porque la
IA se salía del estilo con «same style».

- **La planta de Paconi (38)**, foto hecha por él desde su asiento:

  > Square 1:1 illustration in a flat editorial vector style, like a
  > modern magazine illustration: clean geometric shapes, bold simple
  > silhouettes, flat colour fills with one or two flat shadow tones per
  > object, no gradients, no 3D, no photorealism, no outlines thicker than
  > a hairline, and a fine paper grain texture over everything. Limited
  > palette only: deep teal, toasted orange, warm cream, dark brown and a
  > leafy green for the plant; soft warm morning light.
  > Scene: a phone photo taken from the driver's seat of a white Madrid
  > taxi. At the bottom edge, the top of a dark steering wheel. On the
  > dashboard in the centre, a big potted plant with broad glossy green
  > leaves in a terracotta pot, slightly too big for the dashboard, with a
  > pair of dark sunglasses resting next to it. Through the windscreen, a
  > blurred Madrid street with brick buildings and a tree, morning sun.
  > Nobody in the picture. Absolutely no text, letters, numbers, logos or
  > signs anywhere.

- **El bocadillo de El Pelado (45)**:

  > Square 1:1 illustration in a flat editorial vector style, like a
  > modern magazine illustration: clean geometric shapes, bold simple
  > silhouettes, flat colour fills with one or two flat shadow tones per
  > object, no gradients, no 3D, no photorealism, no outlines thicker than
  > a hairline, and a fine paper grain texture over everything. Limited
  > palette only: deep teal, toasted orange, warm cream and dark brown.
  > Scene: a phone photo of a taxi dashboard seen from the driver's seat,
  > early morning. On the dashboard, a gigantic baguette sandwich half
  > unwrapped from aluminium foil, as long as the dashboard, stuffed with
  > ham and cheese; next to it a steel thermos and a dried-gourd mate cup
  > with a metal straw (bombilla). The top of the steering wheel at the
  > bottom edge; through the windscreen, a quiet Madrid street at dawn.
  > Funny and appetising. Nobody in the picture. Absolutely no text,
  > letters, numbers, logos or signs anywhere.

- **El dibujo de Daniela (50)**, un dibujo de niña hecho con ceras:

  > Square 1:1 illustration in a flat editorial vector style with a fine
  > paper grain texture, limited palette of deep teal, toasted orange,
  > warm cream and dark brown. Scene: a phone photo, seen from above, of a
  > sheet of white paper lying on a dark brown table. On the paper, a
  > child's wax crayon drawing made by a six-year-old: wobbly hand-drawn
  > lines, uneven colouring that goes outside the lines, visible crayon
  > texture. The drawing shows a simple bar chart of four bars going up
  > from left to right, an arrow climbing over them, a smiling sun in the
  > corner and a little yellow-and-white taxi with a green light on its
  > roof at the bottom. A couple of crayons (orange and teal) lying next to
  > the paper. Only the drawing on the paper looks childish; the table and
  > crayons are in the flat editorial style. Absolutely no numbers,
  > letters or text anywhere, not even in the drawing.

---

## 7. Orden de los commits

1. **Ordenar el código** (hecho, 26-11-2026): partir `interfaz.js` y resumir
   `CLAUDE.md`. Sin cambios para el jugador.
2. **Arreglos:** lluvia encima, nombre de la flota, hueco bajo los avisos y
   nombres nuevos.
3. **Almacén:** filtros.
4. **Almacén:** combinación automática.
5. **Objeto:** saco de colines.
6. **Cinco eventos nuevos** (salen con el fondo provisional hasta que
   tengas sus ilustraciones).
7. **Daniela:** simulación, pantalla, su evento y la medición con el bot.
8. **El grupo de la flota:** motor, pantalla y los 50 mensajes.
9. **Nubes ilustradas**, cuando tengas la imagen.

Cada commit con sus pruebas, captura en el navegador y su actualización en
el historial.
