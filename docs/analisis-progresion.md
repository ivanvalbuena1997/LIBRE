# Auditoría de la progresión

18 de noviembre de 2026 · versión del juego con el reequilibrio de Iván (rasgos a ±5 %, topes por categoría, precios por categoría) · medido con `tests/progresion.js`.

## Cómo se ha medido

Un bot juega solo **10 partidas por perfil** (semillas 1 a 10, las mismas en todos los perfiles) durante **150 minutos reales** de partida abierta, sin tiempo sin conexión. Juega como un jugador atento:

- Hace sus carreras a clic en su turno, siempre en la zona con más demanda, con 0,7 s de reacción.
- Tarda 3 s en arrancar el día tras cada ticket. Si su licencia libra y nadie puede trabajar, salta al cierre (2 s).
- Cada 2 s mira la tienda. Primero la flota: coche para cada licencia y el **mejor candidato que le llega** para cada turno libre; si falta algo de eso, ahorra y no compra nada más. Con todo cubierto, ahorra para crecer (licencia, coche y dos conductores B) y mientras compra las mejoras más baratas según su perfil. Elige placas con letras de libranza que aún no tiene.
- Equipa lo que encuentran sus conductores, de mejor a peor, vende lo que llega a la bandeja y repone bolsas y ruedas.

| Perfil | Qué hace distinto |
| --- | --- |
| **Equilibrado** | Compra mejoras de hasta el 30 % de lo que cuesta crecer (al principio, hasta unos 1.600 €). Es lo que hace un jugador que sigue la tarjeta «Siguiente». |
| **Flota** | Solo mejoras de hasta el 10 % (unos 530 €): casi todo va a licencias, coches y conductores. |
| **Zonas** | Como Flota, pero con 2 licencias abre Estaciones y Aeropuerto antes que nada. |
| **Gestor** | Como Equilibrado, pero en cuanto tiene Jornada larga ahorra para la Oficina de gestión y deja el volante. |

Todas las cifras: **media (mínimo–máximo)** de las 10 semillas. «Jornadas» cuenta también los días de libranza saltados.

## Resultados por cortes

### Perfil Flota (el más rápido)

| Min | Jornadas | Licencias | Conductores | Neto por jornada (últimas 5) | Dinero | Nivel medio (máx.) | Mejoras | Objetos hallados (equipados) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 30 | 22 | 1 | 1 | 257 € (224–321) | 2.407 € | 7 (7) | 6 | 5 (2) |
| 60 | 42 | 2,9 (2–3) | 3,1 | 497 € (380–575) | 1.108 € | 6,5 (9) | 6 | 16 (7) |
| 90 | 58 | 4,2 (4–5) | 6,8 | 828 € (590–1.220) | 1.319 € | 6,3 (10) | 8 | 37 (15) |
| 120 | 73 | 6 (5–7) | 10,6 | 1.463 € (1.161–1.798) | 2.243 € | 7 (10) | 11 | 70 (25) |
| 150 | 87 | 8,6 (8–10) | 16 | 2.226 € (1.674–3.083) | 2.454 € | 7,1 (10) | 13 | 124 (38) |

Hitos: 2.ª licencia al **minuto 33** (32–36); 3 licencias con sus 6 turnos, al **65** (60–70); 4 licencias, al 86; 5, al 100; 6, al 117; 8, al 140.

### Perfil Equilibrado (el que sigue «Siguiente»)

| Min | Jornadas | Licencias | Conductores | Neto por jornada | Dinero | Nivel medio (máx.) | Mejoras (niveles) | Objetos hallados (equipados) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 30 | 22 | 1 | 1 | 252 € (206–323) | 400 € | 7 (7) | 9 (10) | 5 (2) |
| 60 | 43 | 1 | 1 | 319 € (282–413) | 452 € | 9,5 | 13 (18) | 13 (3) |
| 90 | 61 | 1,1 (1–2) | 1 | 422 € (392–464) | 632 € | 10 | 14 (24) | 20 (3) |
| 120 | 77 | 2,2 (2–3) | 2,6 | 535 € (374–962) | 511 € | 6,6 (10) | 16 (26) | 29 (5) |
| 150 | 90 | 3,3 (3–5) | 5,4 | 1.142 € (814–1.942) | 1.390 € | 6,8 (10) | 16 (29) | 48 (13) |

Hitos: 2.ª licencia al **minuto 109** (86–116); 3 licencias cubiertas, al **134** (111–142).

### Perfil Zonas

| Min | Licencias | Conductores | Neto por jornada | Zonas abiertas |
| --- | --- | --- | --- | --- |
| 30 | 1 | 1 | 257 € | 2 |
| 60 | 2 | 3 | 502 € | 3,6 |
| 90 | 3,5 | 5,1 | 777 € | 4 |
| 120 | 5,2 | 9,2 | 1.224 € | 4 |
| 150 | 7,7 (6–9) | 14,4 | 2.043 € (1.347–3.102) | 4 |

Estaciones llega al minuto 53 y Aeropuerto al 60; las 3 licencias cubiertas, al **80** (15 minutos más tarde que Flota). A los 150 minutos va algo por detrás de Flota: 7,7 licencias frente a 8,6, y un 8 % menos de neto.

### Perfil Gestor

| Min | Licencias | Conductores | Neto por jornada | Dinero |
| --- | --- | --- | --- | --- |
| 30 | 1 | 1 | 257 € | 2.932 € (ahorrando) |
| 60 | 1 | 2 | 177 € (52–269) | 257 € |
| 90 | 1 | 2 | 261 € | 474 € |
| 120 | 1 | 2 | 359 € | 604 € |
| 150 | 1 | 2 | 533 € (306–1.278) | 807 € |

Oficina y deja el volante al **minuto 45** (43–48); contrata a alguien para su turno al 54. A los 150 minutos **sigue con una licencia** en las 10 partidas.

### Comparación rápida a los 150 minutos

| Perfil | Licencias | Conductores | Neto por jornada |
| --- | --- | --- | --- |
| Flota | 8,6 | 16 | 2.226 € |
| Zonas | 7,7 | 14,4 | 2.043 € |
| Equilibrado | 3,3 | 5,4 | 1.142 € |
| Gestor | 1 | 2 | 533 € |

## Lo que dicen los datos

1. **El orden de compra lo decide todo.** Entre comprar mejoras baratas y crecer en flota hay 76 minutos de diferencia para la 2.ª licencia (109 frente a 33). A los 150 minutos, el que crece tiene 2,6 veces más licencias y casi el doble de neto. Hay **27 niveles de mejora por debajo de 1.590 €** (de 44), y todos se ponen delante de una licencia de 3.000 €.

2. **La tarjeta «Siguiente» empuja hacia el camino lento.** Señala la compra más barata que aún no puedes pagar, y casi siempre es una mejora. Un jugador que la sigue juega como el perfil Equilibrado: más de hora y media con una sola licencia.

3. **La primera media hora es plana.** En todos los perfiles, a los 30 minutos hay 1 licencia y 1 conductor, con unos 250 € por jornada. El primer conductor llega al minuto 2 (400 €), y luego no hay nada grande hasta la 2.ª licencia (minuto 33 en el mejor caso). Es lo que ya decía DISENO.md (24–44 minutos).

4. **Luego la flota se dispara.** Con la estrategia de flota, el ritmo de compra de licencias se acelera: de una cada 24 minutos (2.ª a 3.ª) a una cada 6–8 minutos (7.ª a 8.ª). La licencia sube un 15 % cada vez, pero el neto crece más deprisa: a los 150 minutos, una licencia nueva cuesta unas 4 jornadas de neto. No hay nada que frene ese crecimiento, así que hacia las 3 horas el dinero dejará de ser una decisión.

5. **La Oficina de gestión es una trampa económica.** Dejar el volante baja el neto de 257 € a 177 € (un −30 %): tus carreras te dejan el 100 % y las de un conductor, el 50 %. Además cuesta 6.000 €, el doble de la 2.ª licencia. Quien la compra pronto no sale de una licencia en dos horas y media. Tiene sentido como comodidad para jugar en idle, pero no como inversión, y el juego no lo avisa.

6. **Abrir zonas no compensa pronto.** Estaciones y Aeropuerto (4.500 € entre las dos) retrasan las 3 licencias 15 minutos y a los 150 minutos dejan menos que no abrirlas. Una razón probable: sin el Curso gestión de zonas, los conductores eligen zona al azar entre las que tienen clientes, y la cola de Barajas (1–2 horas) les come el turno.

7. **Casi todo son conductores B.** A los 150 minutos, el perfil Flota tiene 15,7 B de 16 conductores; ningún S+ ni LEGENDARIO en 40 partidas, y un S en una sola. El bot contrata en cuanto puede, con poco dinero, y lo que le llega es B (400 €) o como mucho A. Las categorías, que son lo más vistoso de los conductores, casi no aparecen si no esperas a propósito.

8. **Llueven objetos.** El perfil Flota encuentra 124 en 150 minutos (más de 1 por jornada al final) y solo puede llevar 38 a la vez. El almacén de 10 se llena enseguida y el resto se vende. Se encuentra algún objeto LEGENDARIO en la mitad de las partidas, de media hacia el minuto 80.

9. **Los niveles suben deprisa.** El primer conductor llega al nivel 10 hacia el minuto 61–75 (unas 40 jornadas), como dice DISENO.md.

## Propuestas (sin aplicar: decides tú)

| # | Problema | Propuesta |
| --- | --- | --- |
| 1 | «Siguiente» lleva al camino lento | Que señale lo que hace crecer: la siguiente licencia, coche o conductor, y solo mejoras si son mucho más baratas (por ejemplo, menos del 25 % de crecer). |
| 2 | Muchas mejoras baratas tapan la licencia | Subir los primeros niveles de las mejoras de 300–900 € o dejarlas para cuando tienes 2 licencias. También se puede bajar la 2.ª licencia a 2.000 € (ya se habló el 17-11). |
| 3 | Media hora plana | Un objetivo intermedio antes de la 2.ª licencia: más demanda pronto, una mejora barata que se note mucho o un primer evento guiado. |
| 4 | Crecimiento sin freno | Subir el aumento de precio de la licencia a partir de la 5.ª (por ejemplo, del 15 % al 25 %), o costes que crezcan con la flota (gestoría, seguro por coche más caro). |
| 5 | Oficina como trampa | Decirlo en su ficha («tu turno pasará a un conductor, que se queda la mitad») o darle un plus: menos espera para toda la flota, o menos costes fijos. |
| 6 | Zonas que no compensan | Que los conductores prefieran las zonas nuevas, o abaratar el Curso gestión de zonas y ponerlo en la misma rama. |
| 7 | Casi todo B | Candidatos mejores con más licencias, o un «buscar candidatos» de pago. Otra opción: que la reserva sirva para esperar a uno bueno sin perder el turno. |
| 8 | Demasiados objetos | Bajar el 1,2 % por carrera según crece la flota, o darles más uso (por ejemplo, combinar tres iguales en uno de la categoría siguiente). |

## Cómo repetirlo

```
node tests/progresion.js              # 10 semillas por perfil, 150 minutos (unos 25 s)
node tests/progresion.js 4 90         # 4 semillas, 90 minutos
node tests/progresion.js 10 150 json  # además, los datos de cada partida
```

El bot lee los números de `js/config.js`: tras cualquier cambio de equilibrio se puede volver a pasar y comparar con estas tablas.

## Arreglo del bot: perfiles Zonas y Gestor (21-11-2026)

Desde el 18-11-2026 cada rama de mejoras es una cadena (Estaciones pide
Hoteles y Emisora; la Oficina pide Incógnito al volante, Esterillas, Jornada
larga, Taquillas, Curso de zonas y RRHH). El bot solo daba prioridad a la
mejora final, que nunca tenía los requisitos, así que **«Zonas» jugaba igual
que «Flota» y «Gestor» igual que «Equilibrado»** (salían cifras idénticas).
Ahora compra la cadena en orden (`pasoHacia()` en `tests/progresion.js`).

Medido después (10 semillas, 240 minutos; coches a ×1,10 desde el 21-11):

| Perfil | 2 lic. | 3 lic. | 4 lic. | 6 lic. | 10 lic. | Neto/jornada a los 150 min |
| --- | --- | --- | --- | --- | --- | --- |
| Siguiente | 27 | 55 | 101 | 129 | 190 | 1.363 € |
| Flota | 32 | 60 | 92 | 140 | 213 | 995 € |
| Zonas | 32 | 86 | 111 | 148 | 208 | 1.079 € |
| Equilibrado | 137 | 161 | 187 | 232 (7 de 10) | — | 602 € |
| Gestor | 207 (9 de 10) | 227 (7 de 10) | 239 (1 de 10) | — | — | 333 € |

- **Zonas** abre Estaciones al minuto 66 y Aeropuerto al 75. Llega a la 3.ª
  licencia 26 minutos más tarde que Flota, pero rinde más por licencia: a
  los 150 minutos deja un 8 % más con menos licencias (5,6 frente a 5,9) y
  la 10.ª llega un poco antes (208 frente a 213).
- **Gestor** compra la Oficina al minuto 72 y deja el volante con una sola
  licencia. Desde ahí va muy despacio: su turno pasa a un conductor que se
  queda su parte, y a los 150 minutos deja 333 € por jornada (Equilibrado,
  602 €). Es decir, **dejar el volante pronto sale muy caro**. No he cambiado
  nada del juego por esto; queda apuntado por si se quiere revisar la
  Oficina o cuándo la propone el juego.

## Sin progreso fuera: cuánto cambia (23-11-2026)

Desde el 22-11-2026 la partida solo avanza con el juego abierto y a la vista
(antes contaba hasta 8 horas fuera, a la media). El bot siempre juega sin
parar, así que **su ritmo por minuto jugado no cambia**: todas las cifras de
arriba siguen valiendo.

Lo que cambia es el ritmo **por día real** de quien juega a ratos. Medido
con el código de antes (mismas flotas, 3 semillas, sin comprar nada mientras
tanto):

| Flota | 20 min jugando | 4 h fuera (antes) | 8 h fuera (antes, el tope) |
| --- | --- | --- | --- |
| 1 licencia | 258 € · 11 jornadas | 7.337 € · 144 jornadas | 15.272 € · 288 jornadas |
| 3 licencias | 2.324 € · 11 jornadas | 40.021 € · 144 jornadas | 78.844 € · 288 jornadas |
| 6 licencias | 5.162 € · 11 jornadas | 69.581 € · 144 jornadas | 137.878 € · 288 jornadas |

Una jornada dura 100 s, así que 8 horas fuera eran 288 jornadas de golpe.
Con un horario de 3 sesiones de 20 minutos al día (descansos de 4, 4 y 16
horas; el de 16, recortado a 8), antes el **~95 % del avance de cada día
salía de las horas fuera** (unas 576 jornadas fuera frente a unas 33
jugando). Ahora solo cuentan esas ~33: unas **17 veces menos por día real**
con ese horario. Quien juega seguido no nota nada.

Un intento de medirlo con el bot jugando a ratos no terminó: con el
progreso fuera, la flota crecía tanto que la simulación no acababa en una
hora.

## Fase 1: medidas tras el cansancio (23-11-2026)

Flotas fijas de conductores B sin rasgos (tu turno sin tocar, salvo en la
Oficina), sin libranza, 30 jornadas y entre 4 y 12 semillas. Ojo: el azar de
las carreras mete mucho ruido (±40 € por jornada); las cifras pequeñas no son
fiables.

**Lo que cuesta el cansancio** (neto por jornada, con y sin cansancio):

| Flota | Con cansancio | Sin cansancio | Diferencia |
| --- | --- | --- | --- |
| 3 licencias | 208 € | 321 € | −113 € (−35 %) |
| 6 licencias | 381 € | 552 € | −171 € (−31 %) |

En neto pesa más que en facturación (−8 a −18 %), porque los costes fijos no
bajan. Con el bot, la partida va un 15–20 % más lenta en todos los tramos
(Siguiente: 2.ª licencia 27 → 31 min, 4.ª 101 → 121, 6.ª 129 → 154).

**Lo que deja cada mejora del cansancio.** Medidas directas (ruidosas) y una
cuenta más estable: cada minuto de descanso cuesta unos 0,25 € (3
licencias) o 0,17 € (6), lo que quita el cansancio entre los minutos de
descanso de la flota.

| Mejora | Precio | Medido | Por la cuenta | Se paga en (cuenta, 6 lic.) |
| --- | --- | --- | --- | --- |
| Máquina de café, nivel 1 | 2.200 € | +51 / +69 € | +19 / +29 € | ~75 jornadas |
| Máquina de café, nivel 2 | 3.300 € | +22 / +8 € más | +19 / +29 € más | ~115 jornadas |
| Climatizador bizona | 5.500 € | entre −41 y +26 € (ruido) | +17 / +26 € | ~210 jornadas |
| (ref.) Callejero al día | 400 € | +18 / +66 € | — | ~6 jornadas |
| (ref.) Curso de zonas | 2.000 € | +143 / +347 € | — | ~6 jornadas |
| (ref.) Pago con tarjeta | 1.500 € | +19 / +10 € | — | ~80–150 jornadas |

El Climatizador rinde poco para lo que cuesta (y el bot no llega a
comprarlo). La Máquina de café, nivel 1, la compran Siguiente (minuto 96) y
Gestor (55). De paso: «Pago con tarjeta» también se paga muy despacio.

**La Oficina de gestión (idea 19)**, neto por jornada:

| Flota | Tú conduces, sin Oficina | Con Oficina y sigues conduciendo | Con Oficina y dejas el volante |
| --- | --- | --- | --- |
| 1 licencia | 230 € | 307 € | 230 € |
| 3 licencias | 484 € | 743 € | 621 € |
| 6 licencias | 647 € | 1.209 € | 1.037 € |

La Oficina en sí rinde mucho (los conductores se quedan menos). Lo que
pierde es **dejar el volante**: tu turno pasa a un conductor que se queda su
parte. Con 1 licencia, dejarlo te deja igual que sin la Oficina. Ahora que no
hay progreso fuera, dejar el volante es la forma de que la partida avance
sola con el juego abierto; perder un 15–20 % por ello puede ser razonable.

**Tras los ajustes del 23-11-2026** (tarjeta +15 %, Climatizador −25 %,
Máquina de café −22 % / −38 %): el bot (10 semillas, 180 min) da lo mismo que
antes de los ajustes, porque compra esas mejoras tarde (Pago con tarjeta, el
perfil Equilibrado hacia el minuto 171; la Máquina de café, Siguiente hacia
el 96 y Gestor hacia el 55) o nunca (el Climatizador). Por la cuenta de 0,17 €
por minuto de descanso (6 licencias), el Climatizador pasa a dejar unos 42 €
por jornada (se paga en ~130 jornadas, antes ~210) y la Máquina de café,
nivel 1, unos 37 € (~60 jornadas, antes ~75). La partida sigue un 15–20 %
más lenta que sin cansancio hasta el minuto 180.
