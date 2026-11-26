# Conductores ÚNICOS: Paconi frente a un LEGENDARIO (25-11-2026)

Medido con `node tests/unicos.js 16 80` (16 partidas de 80 jornadas, sin
libranza). Flota de 3 licencias: tu turno vacío y 4 conductores B de nivel
5 sin rasgos; en el turno de día de la 2.ª licencia, el que se mide (nivel
5, dos huecos de objeto). Cifra: neto de la flota por jornada frente a
tener ahí un B más (entre paréntesis, el error de la media). «Pronto», sin
mejoras; «tarde», con Callejero, Taxi impecable, Propinas 3, Pago con
tarjeta, Mecánico 3 y Deflectores.

Neto de la flota con un B: 308 € (pronto) y 403 € (tarde) por jornada.

| En el turno de día | Pronto | Tarde |
| --- | --- | --- |
| LEGENDARIO (Simpático + Conoce la ciudad) | +48,5 (7,9) | +62,2 (6,7) |
| LEGENDARIO + Planta de Paconi | +64,5 (5,6) | +87,2 (5,0) |
| Paconi, sin objetos | +62,4 (5,8) | +48,7 (5,2) |
| Paconi + su planta | +79,9 (5,1) | +75,0 (5,2) |
| Paconi + su planta + 3 Pacos en la flota (+15 %) | +112,6 (5,2) | +110,5 (5,7) |

**Lo que sale:**

- Paconi rinde **como un LEGENDARIO**: algo más al principio (el «ajuste de
  periodos anteriores» se nota más cuando todo lo demás deja poco) y algo
  menos al final (no tiene cualidades: Simpático dobla las propinas, que
  con Propinas 3 valen mucho más).
- Con su planta, el LEGENDARIO con la misma planta le gana al final
  (+87 frente a +75).
- Solo se dispara con **tocayos**: con 3 Pacos o Franciscos, +110 €, casi
  el doble que un LEGENDARIO. Pero conseguirlos depende del azar de los
  candidatos (2 nombres de 32).
- «Sin topes» apenas cambia nada con lo que lleva hoy.
- Sus debilidades no entran en la cifra: aquí ya trabaja de día y no hay
  libranza, incógnito ni El Pelado. En una partida real le restan algo.

**Prueba: ajuste del 12–18 % (hoy, 8–12 %).** Paconi +78 / +65; con su
planta, +97 / +92 (ya por encima del LEGENDARIO con planta en los dos
momentos); con 3 Pacos, +132 / +130.

**Decisión de Iván (25-11-2026):** el ajuste pasa al 12–18 %.

## El Pelado (25-11-2026)

Misma medida (`node tests/unicos.js 16 80`), ya con el ajuste de Paconi
al 12–18 %. En las filas de «doble turno», la 2.ª licencia tiene solo a
El Pelado (el turno de día vacío, que hace él) en vez de dos conductores B.

| En la 2.ª licencia | Pronto | Tarde |
| --- | --- | --- |
| LEGENDARIO de día (Simpático + Conoce la ciudad) | +48,5 (7,9) | +62,2 (6,7) |
| LEGENDARIO de día + Chicles de menta | +47,6 (6,5) | +66,5 (4,4) |
| El Pelado de día, con un B de noche | +91,4 (6,2) | +78,4 (5,4) |
| El Pelado de día + chicles, con un B de noche | +128,1 (5,4) | +122,9 (4,1) |
| El Pelado solo en su coche (doble turno) | +205,4 (7,2) | +199,7 (5,6) |
| El Pelado solo (doble turno) + chicles | +261,3 (9,3) | +270,3 (6,2) |

**Lo que sale:**

- En un solo turno ya deja más que un LEGENDARIO (+78–91 frente a
  +49–62); con chicles, el doble.
- **Con el doble turno es, con diferencia, lo más fuerte del juego:**
  +200 € por jornada él solo, +265 con chicles. Dos LEGENDARIOS en el
  mismo coche dejarían, sumando, unos +110–125.
- Lo que no entra en la cifra: el desgaste del coche (a doble turno y con
  un 25 % de km de más hace unos 900 km por jornada, así que llega antes a
  las averías y a la avería definitiva), y que te ahorras contratar a otro.

**Decisión de Iván (25-11-2026):** se queda así, como un ÚNICO muy por encima de los demás y difícil de conseguir.

## Daniela (26-11-2026)

Misma flota que arriba (tu turno vacío, conductores B de nivel 5 sin
rasgos), con Daniela en el turno de día de la 2.ª licencia: ese coche se
queda parado de día. Frente a un B en ese hueco, con la misma flota de 3 o
de 6 licencias (`SOLO=dan,leg6,dan6,dan6Pac node tests/unicos.js 6 30`,
6 semillas × 30 jornadas; pocas, así que hay bastante ruido):

| En el turno de día | Pronto (±) | Tarde (±) |
| --- | --- | --- |
| Daniela (3 licencias) | −98,6 (11,2) | −123,1 (11,1) |
| LEGENDARIO (6 licencias) | +31,7 (22,2) | +58,9 (23,2) |
| Daniela (6 licencias) | −65,3 (13,6) | −77,2 (19,7) |
| Daniela (6 licencias) con Paconi de día en la 3.ª | −59,7 (20,5) | −91,1 (5,9) |

Con los números aprobados (−6 % de espera, 3 puntos menos, −30 % de
bajas), **deja menos que un B**: el turno de día parado pesa más que lo
que ahorra. Probando otros (5 × 25, mucho ruido):

| Espera / puntos | 3 licencias (pronto / tarde) | 6 licencias (pronto / tarde) |
| --- | --- | --- |
| −10 % / 5 puntos | −64 / −105 | −16 / +5 |
| −15 % / 6 puntos | −85 / −99 | +21 / +45 |

Con −15 % y 6 puntos, con 6 licencias se acerca a un LEGENDARIO y con
más licencias lo pasaría (cuantos más conductores, más rinde). Pendiente
de que Iván decida; de momento, los aprobados.
