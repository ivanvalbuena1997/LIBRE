# Libre · convenciones del proyecto

Juego incremental de gestión de taxis en Madrid. El diseño completo está en
`DISENO.md`; la versión actual cubre solo la sección "Primera versión jugable"
(etapas 1 y 2). No añadir nada de lo que esa sección deja fuera (VTC, averías,
día de libranza, gerentes, otras ciudades, prestigio).

## Técnica

- HTML, CSS y JavaScript sin frameworks ni compilación. Se juega abriendo
  `index.html` con doble clic y se publica tal cual en GitHub Pages.
- **Sin módulos ES** (`import`/`export`): no funcionan desde `file://`. Cada
  archivo es un script clásico envuelto en `(function (raiz) { ... })(globalThis)`
  que cuelga lo suyo de un único global `Libre`:
  - `Libre.config` → `js/config.js`
  - `Libre.sim` → `js/simulacion.js`
  - `Libre.guardado` → `js/guardado.js`
  - `Libre.escena` → `js/escena.js` (tira SVG decorativa; solo interfaz)
  - `Libre.ui` → `js/interfaz.js`
- El orden de los `<script>` en `index.html` importa: config, simulación,
  guardado, escena, interfaz, main.

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
   El bucle del juego y el progreso sin conexión usan esa misma función.
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
  del taxi de Madrid: blanco base, rojo de la franja, verde de "libre" para lo
  positivo). Ningún color escrito a mano fuera de ese bloque. Sin modo oscuro.
- Dinero con `Libre.ui.euros()` (formato es-ES).
- Animaciones: todas desactivadas con `prefers-reduced-motion` (CSS y JS).
  Los importes flotantes salen de comparar `estado.totales` entre fotogramas,
  con tope de 4 a la vez y uno cada 300 ms; lo que no cabe se suma al
  siguiente. Nada de animación puede depender solo de `requestAnimationFrame`
  (se pausa en segundo plano): el bucle del juego también la hace avanzar.

## Modelo de juego (resumen)

- Reloj: `estado.reloj.minutos` cuenta minutos de juego desde el inicio. La
  caja se cierra a las 7:00 y entonces se cobran los costes fijos diarios.
- Pausa al cierre (ajuste `estado.ajustes.pararAlCierre`, activado por
  defecto): al cerrar la caja, `estado.cierrePendiente` guarda el ticket (días
  que cubre y sus sumas) y mientras no sea `null` `avanzar()` no hace nada.
  Solo `arrancarDia()` lo quita. En pausa no se busca cliente; comprar sí.
- Las mejoras "Jornada larga" alargan el día en segundos reales; los coches
  trabajan al mismo ritmo real (`factorJornada`), así que caben más carreras
  contra el mismo coste fijo diario.
- Coches automáticos: valores medios, sin azar. Por zona y hora,
  `viajes = min(demanda, coches × 60 / minutos por carrera)`. Los coches que
  sobran dan vueltas en vacío (o esperan en la cola sin gastar si la zona
  tiene cola).
- Carreras a mano: solo hasta contratar al primer conductor
  (`jugador.automatico`). Usan azar para variar km y tipo de viaje.
  `importeEnCurso()` (solo lectura) da lo que marca el taxímetro en vivo.
- El ticket de cierre va dentro de la página, justo debajo del taxímetro, y
  desaparece al arrancar el día (no tapa la página: en pausa se compra).
  Aspecto de papel térmico; sus líneas son carreras, kilómetros, recaudación,
  combustible, conductores, costes fijos y neto, en ese orden (Iván). No
  añadir líneas de ticket inventadas.
- Licencias: `numero` al azar entre 1 y el máximo de Madrid, sin repetir. La
  letra (día de libranza) sale de la última cifra (`config.licencias.letraPorCifra`)
  y se muestra como `15288-L` con `textoLicencia()`. La libranza aún no tiene
  efecto en el juego: está fuera de la primera versión. La
  caja de hoy es un `<details>` de una línea.
- Pantalla principal en móvil, de arriba abajo: escena, taxímetro, objetivo
  y zonas. Debe caber sin scroll en 375×600 px; cualquier texto nuevo ahí, a
  una línea. Las tarjetas de zona sirven para elegir zona mientras conduces a
  mano.
- El taxímetro es la primera tarjeta y debe verse entero en el móvil sin
  scroll. A mano es el botón de buscar cliente; automatizado, suma la
  recaudación de hoy de la flota.
- Sin conexión: `progresoSinConexion()` llama a `avanzar()` con el tiempo
  fuera, con tope en la config. Mientras conduces a mano, o si se cerró con
  el ticket en pantalla, el reloj no avanza. Con pausa al cierre, resuelve los
  días seguidos (`sinPausa`), se queda en el último cierre y deja un único
  ticket con la suma de esos días.

## Valores PROVISIONALES (falta el dato real)

En `js/config.js`, marcados con `PROVISIONAL`:

- Precio del litro de combustible y consumo del turismo.
- Cuota de autónomo, seguro y cuota de la emisora (por día).
- Porcentaje del conductor (pendiente del valor habitual del sector).
- Precio de la licencia y del coche.

## Pruebas

- `node tests/simulacion.test.js` prueba la lógica sin navegador. Debe pasar
  antes de cada commit.
- Probar en el navegador abriendo `index.html`, o con un servidor local
  cualquiera sobre la carpeta (mismo resultado).

## Forma de trabajar

- Pasos pequeños, probables en el navegador, con un commit al terminar cada uno.
- Mantener este archivo al día cuando cambien las convenciones.
