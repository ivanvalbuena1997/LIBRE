# Revisión de objetos (2.ª medición)

18 de noviembre de 2026, por la tarde, con todos los cambios del día aplicados:

- **Objetos y precios:**
  - Venta rebajada: B 20 €, A 50 €, S 150 €, S+ 400 €, LEGENDARIO 1.200 €.
  - Bolsa, Cámara y Rueda pasan de mejoras a objetos.
  - 37 objetos con su frase y la cualidad Urraca (con su opuesto, Desastre).
- **Sucesos:** pinchazos 4 %, bajas 2 % y averías 0,3 % por turno; clientes sin pagar 2 % por carrera.
- **Ritmo:** licencia a 2.500 €, «Siguiente» hacia crecer, RRHH, Oficina con el 45 % y combinar.

La primera medición (con los precios y reglas de la mañana) está en el historial de git.

## Cómo se ha medido

Lo mide `node tests/objetos.js 16 80`, en unos 8 minutos:

- **La flota:** 3 licencias con **5 conductores B de nivel 5, sin rasgos**, todos con lo mismo. Se compara con la misma flota sin nada.
- **El tamaño:** 16 semillas de 80 jornadas.
- **Neto:** € por conductor y jornada.
- **Encontrado:** lo que vale vendido lo que encuentran (Linterna, Gato, Detector y Urraca viven de esto). No se cuenta en el neto.
- **Dos momentos:**
  - **Pronto:** sin mejoras. Base: 97 € de neto y 14 € encontrados.
  - **Tarde:** Callejero, Taxi impecable, Propinas 3, Pago con tarjeta, Mecánico 3 y Deflectores. Base: 115 € y 17 €.
- **Ruido:** cada cifra tiene unos ±1,5 €. **Diferencias de menos de 3 € no son seguras**, y los B quedan casi todos dentro del ruido.
- **Turno:** lo que vale solo de día o solo de noche se reparte entre toda la flota. En un conductor de su turno vale **el doble**.

## Resultados (momento «tarde»)

| Objeto | Cat. | Neto | Encontrado | **Total** |
| --- | --- | --- | --- | --- |
| Detector de metales | S+ | −0,1 | +26,3 | **+26,2** |
| Gato de la suerte | S+ | +3,2 | +11,5 | **+14,6** |
| Porción de pizza | L | +12,8 | +1,0 | **+13,8** |
| Planta de Paconi | L | +11,6 | +0,9 | **+12,5** |
| Navegador con tráfico | S+ | +7,5 | +0,9 | **+8,5** |
| Nevera con agua fría | S+ | +9,6 | −1,1 | **+8,5** |
| Bidón energético | L | +8,0 | −0,1 | **+7,9** (de noche, ~16) |
| Bolsa para vómitos | S+ | +7,3 | −1,4 | **+5,9** (de noche, ~12) |
| Linterna de bolsillo | A | +0,6 | +4,9 | **+5,6** |
| Silla ergonómica | S+ | +4,8 | +0,8 | **+5,6** |
| Bocata de calamares | L | +5,2 | +0,3 | **+5,5** (de día, ~11) |
| Rueda de repuesto | S | +5,7 | −0,5 | **+5,2** |
| Radio-escáner | S | +5,2 | 0 | **+5,2** |
| Bufanda mitad y mitad | S | +4,9 | +0,1 | **+5,0** |
| Botiquín | S | +3,9 | +0,5 | +4,4 |
| Calcetines de la suerte | S | +4,0 | +0,2 | +4,2 |
| Cargador para clientes | S | +5,3 | −1,5 | +3,7 |
| Detector de baches | S+ | +3,6 | −0,2 | +3,4 |
| Alfombrillas de goma | A | +4,7 | −1,7 | +3,0 |
| Vitaminas | A | +3,1 | −0,4 | +2,7 |
| GPS | A | +2,0 | −0,2 | +1,9 |
| Chicles de menta | A | +2,7 | −0,9 | +1,8 |
| Callejero de papel | B | +2,1 | −0,3 | +1,7 |
| Kit de herramientas | S | +1,7 | −0,2 | +1,5 |
| Caramelos | A | +2,9 | −1,4 | +1,5 |
| Cámara de seguridad | S | +2,4 | −1,2 | +1,2 |
| Cojín lumbar | B | +1,6 | −0,4 | +1,2 |
| Manómetro | A | +2,1 | −0,9 | +1,1 |
| Espejo panorámico | A | +0,3 | −0,3 | 0 |
| Mapa del Metro de 1998 | B | 0 | 0 | 0 (a propósito) |
| Ambientador, Perrito, Rosario, Termo, Gafas, Funda | B | | | entre −2 y +1 (ruido) |
| Datáfono portátil | S | +0,2 | −1,3 | −1,1 (ruido) |

**Rasgos, para comparar:**

| Rasgo | Total |
| --- | --- |
| Simpático | +9,5 |
| Conoce la ciudad | +7,3 |
| **Urraca** | **+6,0** (casi todo en lo que encuentra) |
| **Desastre** | **−6,0** |
| Lento | −8,6 |

La Urraca y el Desastre quedan donde deben, a la altura de los otros rasgos.

## Tierlist

| Tier | Objetos |
| --- | --- |
| **S** (más de 12 €) | Detector de metales · Gato de la suerte · Porción de pizza · Planta de Paconi |
| **A** (7–12 €) | Navegador · Nevera · Bidón energético (en un conductor de noche, S) |
| **B** (4,5–7 €) | Bolsa para vómitos (de noche, A) · Linterna · Silla ergonómica · Bocata (de día, A) · Rueda de repuesto · Radio-escáner · Bufanda |
| **C** (2,5–4,5 €) | Botiquín · Calcetines · Cargador · Detector de baches · Alfombrillas · Vitaminas |
| **D** (menos de 2,5 €) | GPS · Chicles · Callejero · Kit de herramientas · Caramelos · Cámara de seguridad · Cojín · Manómetro · Espejo · Datáfono · todos los B · Mapa del Metro |

## Qué ha cambiado y qué se ve

1. **Ya no hay objetos muertos.**
   - Sin las mejoras de Bolsas y Cámara, la Funda, las Alfombrillas (+3 €), el Espejo y el Datáfono vuelven a hacer algo.
   - Con más pinchazos y bajas, los que los reducen ya se notan: Botiquín +4,4 €, Detector de baches +3,4 €, Vitaminas +2,7 € (antes, entre 0 y 1 €).
2. **La Rueda (+5,2 €) y la Bolsa (+5,9 €; ~12 € de noche) valen lo que su categoría.**
3. **La Cámara se queda corta para ser S** (+1,2 €). Un cliente que no paga solo te quita la mitad del importe, porque el conductor tampoco cobra su parte. Con un 2 % de impagos, evitarlos da poco.
4. **El Detector de metales está roto** (+26 €, el doble que la Pizza). Encuentra un 80 % más y un 30 % sube de categoría. El Gato (+15 €) también se pasa un poco para S+. Lo que encuentran vale además para combinar, así que en la partida pesan aún más.
5. **Los LEGENDARIOS:** la Pizza y la Paconi son los mejores objetos «normales». El Bocata sigue flojo (+5,5 €), aunque en un conductor de día ronda +11 €.
6. **Los B quedan todos entre −2 y +2 €**, dentro del ruido. Es lo esperable (sus efectos son de un 2–10 %), pero la diferencia con la A es pequeña.

## Progresión con todo aplicado

Medido con el bot (`node tests/progresion.js`, 10 semillas):

| Perfil | 2.ª licencia | 3 licencias | A los 150 min |
| --- | --- | --- | --- |
| **Sigue «Siguiente»** | minuto 22 | minuto 45 | 9,5 licencias · 1.820 € de neto por jornada |
| Flota | 26 | 49 | 9,2 licencias · 1.830 € |
| Equilibrado (mejoras baratas primero) | 107 | 126 | 4 licencias · 1.000 € |
| Gestor (deja el volante) | — | — | 1 licencia · 420 € |

- **Esta mañana** (antes de todos los cambios), la 2.ª licencia llegaba al minuto 33 en el mejor caso y al 109 siguiendo la tarjeta.
- **A los 150 minutos** hay algo menos de neto que a mediodía (1.820 € frente a 2.100 €), porque los sucesos ahora cuestan más.
- **Oficina de gestión:** dejar el volante baja el neto un 7 % (antes, un 30 %). El bot gestor sigue con una licencia porque gasta en mejoras baratas, no por la Oficina.
- **Casi todos los conductores siguen siendo B** (17 de 18 a los 150 minutos). «Siguiente» no propone RRHH (1.500 €), porque no cuenta como crecer, y el bot no lo compra.

## Propuestas (sin aplicar)

| # | Problema | Propuesta |
| --- | --- | --- |
| 1 | Detector de metales roto | Bajarlo a un 30 % más de hallazgo y un 15 % de suerte (unos +11 €). |
| 2 | El Gato se pasa un poco | Un 20 % más de hallazgo en vez de un 40 % (unos +10 €). |
| 3 | Cámara floja para S | Bajarla a A, o que además dé un +10 % de propinas («el cliente se porta mejor si sabe que le graban»). |
| 4 | El Bocata, flojo para LEGENDARIO | Que su −12 % de espera valga de día y de noche. |
| 5 | Casi todos los conductores son B | Que «Siguiente» proponga RRHH cuando tienes 3 licencias o más. |
| 6 | Los B no se distinguen | Subir algo sus efectos (por ejemplo, Ambientador +15 %) o dejarlos como relleno para combinar, que ahora tiene sentido. |
