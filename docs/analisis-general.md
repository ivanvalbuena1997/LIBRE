# Análisis general del juego (25-11-2026)

Una pasada completa por el estado del juego tras la fase 2 (racha, tu
personaje, prestigio y gamas de coche). Lo medido es con bots (juegan sin
despistarse, así que una persona irá algo más lenta) y en el navegador
(Chromium, sin móvil real).

## 1. Salud del código

- **Pruebas:** 130, todas pasan (`node tests/simulacion.test.js`).
- **Tamaño:** unas 16.600 líneas. Lo grande: `js/interfaz.js` (3.884),
  `js/simulacion.js` (3.578), `css/estilos.css` (2.560) y las pruebas
  (2.585). `interfaz.js` empieza a ser difícil de recorrer: un día valdría la
  pena partirlo por pantallas (sin módulos ES: varios scripts que cuelgan de
  `Libre.ui`).
- **Guardado:** versión 35, con migraciones desde la 1.
- **Errores en el navegador:** ninguno al cargar ni al recorrer todas las
  pestañas y la hoja del personaje.

**Cosas pequeñas encontradas** (sin arreglar):

1. `buscarCliente()` usa `Math.random` si no le pasan un generador, y la
   interfaz no se lo pasa: tus carreras (tipo de viaje y km) salen de
   `Math.random`, no del azar con semilla. CLAUDE.md prohíbe `Math.random`
   «en lo que afecta a la flota»; tu turno es parte de la flota, así que
   conviene pasarle `azarDe(estado)`. Lo mismo, menos importante, en
   `sortearNumeroLicencia()` y `kmCocheUsado()`.
2. El aviso de `buscarCliente()` sin conducir dice «Elige un turno libre en
   **Flota**»: esa pestaña ya no existe (es Conductores).
3. En el bot, el dinero mínimo del perfil «siguiente» a los 150 min sale
   **negativo (−14 €)**: los costes del cierre pueden dejar la caja en rojo
   un momento. No bloquea la partida, pero conviene saber si se quiere así.
4. Valores **PROVISIONALES** pendientes: precio del kWh (0,225 €) y consumo
   del Tesla (15 kWh/100 km).

## 2. Pantallas (móvil)

| Tamaño | Calle con 3–4 taxis | Desborde lateral (todas las pestañas y la hoja del personaje) |
| --- | --- | --- |
| 390 × 844 | sin scroll | ninguno |
| 375 × 800 | sin scroll | ninguno |
| 320 × 640 | 72–116 px de scroll (no es requisito) | ninguno |

No he llegado a comprobar el caso de **5 taxis** en 375 × 800 (la regla de
CLAUDE.md): el montaje de la prueba se quedó en 3–4 licencias.

## 3. Progresión (bot, 6 partidas por perfil, 150 min)

| Perfil | Licencias a los 60 / 150 min | Conductores a los 150 | Neto por jornada a los 150 |
| --- | --- | --- | --- |
| Siguiente (sigue la tarjeta) | 2,3 / 5,3 | 8,8 | 813 € |
| Flota (casi todo a crecer) | 2 / 5 | 8,5 | 558 € |
| Zonas | 2 / 4 | 6,8 | 543 € |
| Equilibrado (30 % en mejoras) | 1 / 1,8 | 1,5 | 379 € |
| Gestor (va a por la Oficina) | 1 / 1 | 2 | 316 € |

Hitos del perfil «Siguiente»: 2.ª licencia en el minuto 27, 3.ª en el 61,
SL en el 111, 4.ª en el 120, 5.ª en el 136 y 6.ª hacia el 147 (2 de 6
partidas); primer conductor de nivel 10 en el 86; primer LEGENDARIO en el
84 (solo en 3 de 6 partidas).

**Lo que sale de aquí:**

- **Seguir la tarjeta «Siguiente» es lo mejor**, con diferencia: el doble de
  licencias que los perfiles que gastan más en mejoras.
- **Gastar en mejoras frena mucho:** «Equilibrado» y «Gestor» se quedan en
  1–2 licencias a las 2 h y media. Para un jugador que compra mejoras «por
  probar», el juego se siente lento. Puede ser buena idea que la tarjeta
  «Siguiente» o un aviso lo oriente más, o abaratar el arranque.
- Respecto al informe del 21-11-2026 (antes del cansancio y de quitar el
  progreso fuera), la partida va más despacio (el perfil Flota tenía 8,6
  licencias a los 150 min; hoy, 5). Encaja con el −15/20 % medido del
  cansancio y con los cambios de los perfiles del bot; no he encontrado un
  fallo que lo explique.
- Las **zonas** compradas (Estaciones y Aeropuerto) solo las abre el perfil
  Zonas: los demás terminan con 2 zonas. El aeropuerto queda lejos para quien
  no lo busca.

## 4. Fase 2: tu personaje, prestigio y gamas

- **Prestigio** ([analisis-prestigio.md](analisis-prestigio.md)): con el
  nivel N dando N puntos, tenerlo todo pide 45–49 h reinicie donde reinicie;
  llegando al nivel 7, unos 11 reinicios de 4–6 h. Sano.
- **Gamas de coche** (DISENO.md): el Tesla deja +24 € por coche y jornada al
  principio y casi nada con Híbridos y GLP; el Mercedes, +33–39 €. Se pagan
  en 80–105 jornadas.
- **Sin medir todavía:**
  - Cuánto deja la **racha** desde que la ventana se estrecha (1 → 0,5 s) y
    con Racha larga y Reflejos.
  - **Fondo físico V (Incansable)**: quitar del todo los descansos de tu turno
    puede ser muy fuerte (el cansancio costaba un 31–35 % del neto).
  - El **bot no usa todavía** las mejoras del personaje dentro de la
    partida ni las gamas de coche (solo `tests/prestigio.js` reparte puntos).

## 5. Documentación

- DISENO.md, CLAUDE.md, el historial (114 actualizaciones) y las ideas
  están al día.
- CLAUDE.md ronda las 700 líneas: casi todo es detalle de funciones que ya
  cuenta el código. Valdría la pena resumirlo para que siga siendo útil.

## 6. Propuestas, por orden

1. Arreglar las dos cosas pequeñas del código (azar con semilla en tus
   carreras y el texto de «Flota»).
2. Medir la racha nueva e Incansable con el bot.
3. Mirar el arranque para quien gasta en mejoras (perfil Equilibrado).
4. Comprobar Calle con 5 taxis en 375 × 800.
5. Seguir con la fase 2: personajes guía (13 y 15) y café a voluntad (B2).

## 7. Pasos 1 a 4 (25-11-2026, después del análisis)

**1. Arreglos del código (hecho).** Tu carrera, el número de la primera
licencia y los km del coche inicial salen ya del azar con semilla de la
partida (`generador(estado)`), no de `Math.random`; solo quedan la semilla
inicial y la migración de partidas muy antiguas. El aviso de no conducir
dice «Conductores». Prueba nueva: misma partida, misma carrera.

**2. Racha e Incansable, medidos.** Bot «Flota» (conduce), 4 partidas de
90 min, con 0,7 s de reacción (jugador normal) y 0,4 s (muy atento); tu
facturación por jornada:

| Tu personaje | 0,7 s | 0,4 s |
| --- | --- | --- |
| Sin mejoras | 232 € | 245 € |
| Racha | 251 € (+8 %) | 272 € (+11 %) |
| Racha + Racha larga III + Reflejos II | 247 € (igual) | 272 € (igual) |
| Incansable (Fondo físico V) | 255 € (+10 %) | 300 € (+22 %) |
| Todo lo de tu turno (Racha, Larga III, Reflejos II, Fondo físico V, Callejero II) | 304 € (+31 %) | 344 € (+40 %) |

- **Racha larga y Reflejos no hacen nada solas:** el descanso corta la
  racha cada 8–10 carreras, antes de pasar del +10 %. Solo valen con Fondo
  físico (en «todo», juntas, dan +50 € más que Incansable sola). Hay que
  decidir: que pidan Fondo físico, que el descanso pause la racha en vez de
  cortarla, o avisarlo en su descripción.
- **Incansable** es fuerte (+10–22 % de tu turno) pero cuesta 90 puntos en
  total (los cinco niveles de Fondo físico): razonable como meta larga.
- Con todo, la partida crece algo más rápido (3,8–4 licencias a los 90 min
  frente a 3).

**3. El arranque de quien gasta en mejoras (revisado, sin cambiar números).**
El perfil «Equilibrado» (compra toda mejora que cueste hasta el 30 % de
crecer) compra en la primera hora Mecánico, Deflectores, Callejero,
Esterillas, Jornada larga, Limpieza, Taquillas, Seguridad vial, Conducción
eficiente y Publicidad, y no llega a la **2.ª licencia hasta el minuto 142**
(siguiendo «Siguiente», en el 27). El umbral sube con el precio de crecer,
así que siempre hay otra mejora que comprar antes. Varias de esas mejoras
apenas dejan nada con una sola licencia (Taquillas, Seguridad vial,
Publicidad). Opciones para que no se atasque quien compra mejoras «por
probar»:
  a) Que la hoja de cada mejora diga en cuánto se paga con tu flota de hoy
     (las que se pueden contar) o avise «con 1 licencia casi no se nota».
  b) Que la 2.ª licencia sea más barata (hoy 2.500 €).
  c) Que algunas mejoras de flota pidan tener 2 licencias.

**4. Calle con 5 taxis (comprobado).** Con una partida real del bot (5
licencias con coche), sin scroll en 390 × 844 y en 375 × 800, sin errores.

## 8. Los dos cambios de Iván, medidos (25-11-2026)

**Con una sola licencia, solo la primera mejora de cada rama.** Bot, 6
partidas por perfil, 150 min:

| Perfil | 2.ª licencia | Licencias a los 150 | Neto por jornada a los 150 |
| --- | --- | --- | --- |
| Equilibrado | minuto 142 → **80** | 1,8 → 2 | 379 € → **592 €** |
| Gestor | — → **80** | 1 → 2 | 316 € → **433 €** |
| Siguiente, Flota, Zonas | sin cambios (ya crecían antes de gastar en mejoras) | | |

En la primera hora el Equilibrado deja algo menos (242 → 198 € por
jornada a los 60 min, porque no puede comprar mejoras), pero a la larga
gana mucho. Tras la 2.ª licencia vuelve a gastar en mejoras y se queda en
2 licencias a los 150 min: la regla le empuja una vez, no del todo.

**Racha larga y Reflejos piden Fondo físico.** Tu facturación por jornada
(bot Flota, 4 partidas de 90 min):

| Tu personaje | 0,7 s | 0,4 s |
| --- | --- | --- |
| Racha | 251 € | 272 € |
| Racha + Fondo físico I | 249 € | 288 € |
| Racha + FF I + Racha larga III + Reflejos II | 243 € | 288 € |
| Racha + FF III + Racha larga III + Reflejos II | 267 € | 301 € |

Con Fondo físico I la racha sigue cortándose antes del +10 %: Racha larga
y Reflejos solo se notan con Fondo físico III (unos +4–7 %). Si se quiere
que valgan más, que el descanso pause la racha en vez de cortarla, o que
cada nivel de Racha larga pida un nivel más de Fondo físico.

