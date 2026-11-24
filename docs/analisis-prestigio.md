# Análisis del prestigio (24-11-2026)

Medido con `node tests/prestigio.js 2 <nivel>`: el bot juega como el perfil
«equilibrado» de `tests/progresion.js` (conduce con 0,7 s de reacción sin
despistarse, compra flota y mejoras), reinicia en cuanto tu personaje llega
al nivel objetivo y gasta los puntos por orden de prioridad (Racha, Ahorros,
Coche a estrenar, Veterano, Agenda, Fondo físico, Callejero…; si el
siguiente no le llega, se los guarda). Repite hasta tener las 300 de todas
las mejoras del personaje. 2 partidas por nivel: es un orden de magnitud.

## Antes: 1 punto por nivel (100 puntos en total)

| Reinicia en | Reinicios | Tiempo total | Puntos por hora |
| --- | --- | --- | --- |
| Nivel 3 | ~33 | ~29 h | 2,2 → 4 |
| Nivel 5 | 20 | ~49 h | 1,4 → 2,3 |
| Nivel 7 | 15 | ~67 h | 1,2 → 1,8 |
| Nivel 9 | 12 | ~78 h | 1,1 → 1,5 |

Cada nivel pide 1,6 veces más experiencia que el anterior pero daba un solo
punto: lo que más rendía era reiniciar en cuanto se llegaba al nivel 3, con
una sola licencia, unas 33 veces.

## Ahora: el nivel N da N puntos (costes ×3, 300 en total)

Iván eligió esta opción. Una partida que llega al nivel N junta
1 + 2 + … + N puntos (3: 6; 5: 15; 7: 28; 9: 45).

| Reinicia en | Semilla | Reinicios | Tiempo total | 1.º | Último | Puntos de cada partida |
| --- | --- | --- | --- | --- | --- | --- |
| Nivel 3 | 1 | 50 | 44 h 46 min | 1 h 22 min | 0 h 46 min | 6 |
| Nivel 3 | 2 | 50 | 44 h 42 min | 1 h 18 min | 0 h 48 min | 6 |
| Nivel 5 | 1 | 20 | 49 h 17 min | 3 h 41 min | 2 h 08 min | 15 |
| Nivel 5 | 2 | 20 | 49 h 27 min | 3 h 35 min | 2 h 08 min | 15 |
| Nivel 7 | 1 | 11 | 48 h 51 min | 6 h 06 min | 3 h 50 min | 28 |
| Nivel 7 | 2 | 11 | 49 h 05 min | 5 h 56 min | 3 h 52 min | 28 |
| Nivel 9 | 1 | 7 | 46 h 46 min | 8 h 34 min | 5 h 52 min | 45 |
| Nivel 9 | 2 | 7 | 47 h 12 min | 8 h 22 min | 5 h 51 min | 45 |

- **El tiempo para tenerlo todo queda parejo, unas 45–49 h,** reinicie
  donde reinicie: ya no hay una forma claramente mejor. Reiniciar pronto
  (nivel 3) es algo más rápido en total (unas 45 h) pero son 50 partidas de
  menos de hora y media con una licencia; llegar lejos pide muchos menos
  reinicios.
- **Llegando al nivel 7: unos 11 reinicios de 4–6 h**, con 9–12
  licencias, que es lo que pedía Iván (unos 10 reinicios).
- Los reinicios se acortan un 30–35 % del primero al último (Ahorros,
  Veterano, Racha…).
- El bot no se despista nunca: una persona irá más lenta.
