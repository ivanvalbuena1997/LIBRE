# Libre · convenciones del proyecto

Juego incremental de gestión de taxis en Madrid. El diseño completo está en
`DISENO.md` (pensado para leerlo como diseñador, con capturas en
`docs/capturas/`); la versión actual cubre solo las etapas 1 y 2 (apartado
«Alcance de la versión actual»). No añadir nada de lo que ese apartado
deja fuera (VTC, gerentes, otras ciudades, el prestigio de la etapa 3). El
prestigio de tu personaje sí entra (Iván, 24-11-2026). Si cambia una regla o
un número, se actualiza también DISENO.md. Las averías y bajas entran como eventos
aleatorios desde el 16 de noviembre de 2026, y la libranza desde el 17 (Iván).

## Técnica

- HTML, CSS y JavaScript sin frameworks ni compilación. Se juega abriendo
  `index.html` con doble clic y se publica tal cual en GitHub Pages.
- **Sin módulos ES** (`import`/`export`): no funcionan desde `file://`. Cada
  archivo es un script clásico envuelto en `(function (raiz) { ... })(globalThis)`
  que cuelga lo suyo de un único global `Libre`:
  - `Libre.config` → `js/config.js`
  - `Libre.sim` → `js/simulacion.js`
  - `Libre.guardado` → `js/guardado.js`
  - `Libre.ambiente` → `js/ambiente.js` (calle SVG de la cabecera; solo interfaz)
  - `Libre.retratos` → `js/retratos.js` (retratos SVG de conductores; solo interfaz)
  - `Libre.sonidos` → `js/sonidos.js` (sonidos con Web Audio; solo interfaz)
  - `Libre.actualizaciones` → `js/actualizaciones.js` (historial de
    actualizaciones para el panel de Ajustes; solo interfaz)
  - `Libre.ui` → `js/ui-*.js` y `js/interfaz.js` (ver «Mapa de la interfaz»)
- Ilustraciones (hechas por Iván con IA) en `imagenes/`, sin pasar por la
  lista de `index.html`: se piden con `<img>`.
- El orden de los `<script>` en `index.html` importa: config, simulación,
  fflate, guardado, ambiente, retratos, sonidos, actualizaciones, los `ui-*`
  (ver «Mapa de la interfaz»), interfaz y main.
  `js/fflate.js` es la única librería de terceros (fflate 0.8.2, MIT, copiada
  tal cual de npm; deja el global `fflate`): comprime el texto de exportar.
  No van escritos a mano: una lista en `index.html` los escribe con
  `document.write` y `?v=<Date.now()>` (también `css/estilos.css`), para que
  el navegador descargue siempre los nuevos (Iván, 21-11-2026: no veía las
  actualizaciones). Un archivo nuevo de `js/` se añade a esa lista.

## Reglas de arquitectura

1. **Todos los números del juego en `js/config.js`.** Ni la simulación ni la
   interfaz contienen cifras de juego. Comentarios en la config:
   - `Dato real`: sale de DISENO.md. No tocar sin fuente.
   - `PROVISIONAL`: falta el dato real; valor inventado. Mantener la lista de
     provisionales de este archivo al día.
   - `Equilibrio`: valor de juego para ajustar jugando.
2. **La simulación no toca el DOM.** `simulacion.js` solo lee y modifica el
   objeto de estado. Funciona igual en el navegador y en Node.
3. **Una sola función avanza el tiempo:** `Libre.sim.avanzar(estado, segundosReales)`.
   La usan el bucle del juego y `saltarAlCierre()`. No hay progreso sin
   conexión (Iván, 22-11-2026): la partida solo corre abierta y a la vista.
4. **Las acciones del jugador** (comprar, contratar, elegir zona…) son funciones
   de `Libre.sim` que devuelven `{ ok, mensaje }`. La interfaz solo las llama y
   muestra el mensaje.
5. **El estado es JSON plano** (sin clases ni funciones) para poder guardarlo
   tal cual. Si cambia su forma: subir `versionGuardado` en la config y añadir
   una migración en `guardado.js`.

## Estilo

- Código, nombres, comentarios, interfaz y commits en español.
- Interfaz pensada primero para móvil: una columna, botones de 44 px mínimo.
- Colores solo como variables CSS en el `:root` de `css/estilos.css` (paleta
  «Cielo de Madrid»: papel claro, azul de marca, verde del dinero, amarillo
  sol, rojo de peligro). Ningún color escrito a mano fuera de ese bloque
  (los dibujos de `iconos/` traen los suyos). Sin modo oscuro; la cabecera
  de noche no es un modo oscuro, solo la escena.
- Sistema visual del rework (referencia en `libre-rework/`, fuera de git;
  descrito en DISENO.md, «Sistema visual»):
  paleta y tipografía como tokens en `:root`
  (`--marca`, `--dinero`, `--tinte-*`, `--rareza-*`, `--taxi-*`,
  `--letra-*`, `--t-*`, `--esp-*`, `--r-*`) y componentes base con
  prefijo `ui-` (`.ui-tarjeta`, `.ui-chip`, `.ui-boton`, `.ui-barra`,
  `.ui-rareza`…). Fuentes autoalojadas en `fuentes/`. Las pantallas nuevas
  usan estos tokens y componentes; quedan variables viejas (`--texto`,
  `--suave`, `--borde`, `--verde-*`…) en estilos sin rehacer (mensajes,
  botones genéricos, panel de tu turno, elección de placa).
- Dinero con `Libre.ui.euros()` (formato es-ES).
- Sonidos (`js/sonidos.js`): sintetizados con Web Audio, sin archivos:
  cobro (al cobrar cualquier taxi, como mucho uno cada 300 ms), propina,
  nivel, objeto (hallazgo), avería (también pinchazo), ticket (al salir
  uno nuevo), tic (al buscar cliente) y los de la racha: `racha` (al
  encadenar, más agudo y lleno cuanto más alta; `tocar(nombre, arg)` con
  arg = n / tope), `rachaMax` (fanfarria al llegar al tope) y `rachaFin`
  (al perderla); los decide `sonarRacha()` comparando fotogramas. Mudos hasta el primer toque de la
  página; sonido sí/no y volumen en la hoja de Ajustes, guardados en
  `localStorage` (`libre-sonido`), aparte de la partida. La interfaz los
  pide con `sonar()`; `SONIDO_EVENTO` dice qué evento lleva cuál. Con la
  pestaña en segundo plano no suenan.
- Animaciones: todas desactivadas con `prefers-reduced-motion` (CSS y JS).
  Los importes flotantes salen de comparar `estado.totales` entre fotogramas,
  con tope de 4 a la vez y uno cada 300 ms; lo que no cabe se suma al
  siguiente. Nada de animación puede depender solo de `requestAnimationFrame`
  (se pausa en segundo plano): el bucle del juego también la hace avanzar.

## Mapa de la interfaz

`Libre.ui` está repartida en varios archivos (26-11-2026). Todos empiezan con
`const ui = Libre.ui = Libre.ui || {}` y acaban con `Object.assign(ui, {…})`
de lo que usan los demás; lo de otro archivo se escribe `ui.nombre`, y las
variables de estado de la interfaz (hoja abierta, pestaña, selección…) viven
en `ui` (`ui.vistaActual`, `ui.fichaAbierta`…) para que todos las vean.
Nada se llama al cargar el archivo: solo dentro de funciones, así que el
orden solo importa para que `interfaz.js` vaya el último.

- `ui-comun.js`: utilidades (`$`, `esc`, `euros`, `numero`, `boton`),
  iconos, rarezas y caras, avisos de eventos (`mostrarEventos`) y sonidos.
- `ui-calle.js`: taxímetro, ticket, caja de hoy, zonas, «Siguiente» y «Tus
  taxis hoy», con los importes flotantes y la racha.
- `ui-conductores.js`: licencias, reserva, ficha, candidatos, comparar,
  equipar, coche y arrastrar conductores.
- `ui-almacen.js`: almacén, combinar y vender.
- `ui-estadisticas.js`, `ui-mejoras.js` (árbol y hoja de mejora),
  `ui-ajustes.js` (Ajustes y partida), `ui-personaje.js` (hoja del
  personaje, prestigio y nombre) y `ui-historia.js` (intro y eventos de
  clientes).
- `interfaz.js`: estado común, `dibujar()`, `actualizar()`, el bucle, los
  clics (un solo `addEventListener` por tipo, que reparte por `data-*`),
  `iniciar()`, `reiniciar()` y `mostrarMensaje()`.

## Modelo de juego (resumen)

El detalle de cada sistema (funciones, campos, versión del guardado en que
entró y lo que decidió Iván) está en **`docs/notas-tecnicas.md`**: léelo antes
de tocar un sistema y cambia su apartado si lo cambias.

- Reloj: `estado.reloj.minutos` cuenta minutos de juego. La caja se cierra a
  las 7:00 (costes fijos, ticket); la interfaz enseña el día por jornada
  (`jornadaDe()`). Con `estado.cierrePendiente` (ajuste `pararAlCierre`)
  `avanzar()` no hace nada hasta `arrancarDia()`; tampoco con la intro sin
  ver ni con un evento de cliente pendiente.
- Tu turno es siempre a clic (`buscarCliente()`), solo en su franja; los
  conductores trabajan solos con carreras reales. Licencias con libranza
  por letra, dos turnos (día y noche), coche con km, desgaste y gamas.
- Conductores: categoría (B, A, S, S+, LEGENDARIO), rasgos, nivel, objetos
  equipados, energía y topes (`factoresConductor()`, `topeConductor()`,
  `topesDe()`); `statsConductor()` repite las cuentas de la simulación (hay
  una prueba que las compara). ÚNICOS (`config.conductores.unicos`): un
  conductor normal con `t.unico`, sin topes y con reglas propias.
- Objetos: se encuentran al terminar carreras, van al almacén (o a la
  bandeja), se combinan, se venden y se equipan.
- Eventos: por carrera, al empezar el turno, lluvia, y eventos de clientes
  con decisiones (`config.historia.eventos`).
- Mejoras en ramas en cadena (`requiere`), con niveles; mejoras de tu
  personaje con puntos y prestigio (`empezarDeCero()`).
- Azar de la flota y de tu turno solo con `Libre.sim.azar(estado)` /
  `generador(estado)`: prohibido `Math.random` en lo que afecta a la partida.
- Para probar en la consola: `Libre.darDinero(n)`, `Libre.darExperiencia()`,
  `Libre.forzarEvento()`, `Libre.forzarEventoCliente()`,
  `Libre.forzarUnico()`, `Libre.darMejoraPersonaje()`.

## Valores PROVISIONALES (falta el dato real)

Solo los del Tesla (abajo). Iván confirmó el 13 de noviembre de 2026 combustible,
consumo, cuota de autónomo (535 €/mes), seguro, emisora y porcentaje del
conductor (marcados «Dato de Iván»). Licencia (2.500 €, desde el 18-11-2026) y coche (1.500 €, ×1,10 por coche desde el 21-11-2026) son valores de juego
fijados por Iván, no precios reales. Si aparece un valor sin fuente, se marca
`PROVISIONAL` y se apunta aquí.

- `combustible.precioKwh` (0,225 €) y `vehiculos.modelos.tesla.kwh100Km`
  (15): estimaciones de Claude para el Tesla (24-11-2026), sin fuente.

## Pruebas

- `node tests/simulacion.test.js` prueba la lógica sin navegador. Debe pasar
  antes de cada commit.
- Probar en el navegador abriendo `index.html`, o con un servidor local
  cualquiera sobre la carpeta (mismo resultado).
- `node tests/progresion.js [semillas] [minutos]` (con `REACCION=0.4` delante,
  un jugador más atento que los 0,7 s de serie) no es una prueba: un bot
  juega varias partidas con cuatro perfiles de compra y da cómo va a los
  30/60/90/120/150 minutos y cuándo llega cada hito (unos 25 s). Sirve para
  medir cambios de equilibrio; el último informe está en
  `docs/analisis-progresion.md`.
- `node tests/prestigio.js [semillas] [niveles]` tampoco: un bot reinicia en
  cada nivel objetivo (3,5,7,9) hasta tener todas las mejoras del personaje
  y da cuántos reinicios y horas hacen falta. Usa `jugar()` de
  `tests/progresion.js` (que lo exporta, con `opciones`: `personaje`,
  `hastaNivel`, `minutos`). Informe en `docs/analisis-prestigio.md`.
- `node tests/objetos.js [semillas] [jornadas]` tampoco es una prueba: mide
  cuánto deja cada objeto por conductor y jornada (sin mejoras y con
  propinas y otras mejoras). Informe en `docs/analisis-objetos.md`.
- `node tests/unicos.js [semillas] [jornadas]` tampoco: compara a Paconi
  (con y sin su planta y tocayos) y a El Pelado (con y sin chicles, con y
  sin doble turno) con un LEGENDARIO en la misma flota (16 × 80: 4 min).
  Informe en `docs/analisis-unicos.md`.

## Forma de trabajar

- Pasos pequeños, probables en el navegador, con un commit al terminar cada uno.
- Mantener este archivo al día cuando cambien las convenciones.
