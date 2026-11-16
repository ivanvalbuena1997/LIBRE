# Libre · convenciones del proyecto

Juego incremental de gestión de taxis en Madrid. El diseño completo está en
`DISENO.md`; la versión actual cubre solo la sección "Primera versión jugable"
(etapas 1 y 2). No añadir nada de lo que esa sección deja fuera (VTC, día de
libranza, gerentes, otras ciudades, prestigio). Las averías y bajas entran
como eventos aleatorios desde el 16 de noviembre de 2026 (Iván).

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
  - `Libre.retratos` → `js/retratos.js` (retratos SVG de conductores; solo interfaz)
  - `Libre.ui` → `js/interfaz.js`
- El orden de los `<script>` en `index.html` importa: config, simulación,
  guardado, escena, retratos, interfaz, main.

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
  La interfaz enseña el día por jornada (de 7:00 a 7:00, `jornadaDe()`): la
  cabecera cambia de día a las 7:00, cuando sale el ticket, y la madrugada
  cuenta como la noche del día anterior. Tarifas y demanda siguen el calendario.
- Pausa al cierre (ajuste `estado.ajustes.pararAlCierre`, activado por
  defecto): al cerrar la caja, `estado.cierrePendiente` guarda el ticket (días
  que cubre y sus sumas) y mientras no sea `null` `avanzar()` no hace nada.
  Solo `arrancarDia()` lo quita. En pausa no se busca cliente; comprar sí.
- Las mejoras "Jornada larga" alargan el día en segundos reales; los coches
  trabajan al mismo ritmo real (`factorJornada`), así que caben más carreras
  contra el mismo coste fijo diario.
- Cada zona tiene varios tipos de carrera (cortas, medias, largas) y su
  demanda cambia cada jornada con `factorDeJornada()`: un «azar» que sale del
  número de jornada, así que el mismo día da siempre lo mismo (jugando y sin
  conexión).
- Azar de la flota: solo con `Libre.sim.azar(estado)`, un generador con
  semilla guardada en `estado.azar`. Prohibido `Math.random` en lo que afecta
  a la flota.
- Conductores, con el juego abierto: carreras reales (`turno.carrera`), como
  las tuyas. Esperan según su parte de la demanda de la zona
  (`min(demanda, coches × capacidad) / coches` carreras por hora; espera fija
  + exponencial, que se corta en cada hora), viajan y cobran al terminar,
  descontando el porcentaje del conductor en cada carrera. Sin clientes, un
  «tramo en vacío» hasta la hora. Los coches que sobran esperan más y gastan
  en vacío (o esperan en la cola sin gastar si la zona tiene cola).
- Zonas de los conductores: las eligen ellos (`asignarZonasConductores()`,
  una vez por hora de juego, también sin conexión). Sin el «Curso gestión de
  zonas», al empezar su turno o si su zona se queda sin clientes eligen al
  azar entre las zonas con clientes; con el curso, cada hora la que más deja
  al dueño contando a los compañeros. En Flota no se puede elegir su zona;
  la tuya, sí.
- Eventos (`config.eventos`): por carrera (propina, sin pagar, objeto
  devuelto, vómito; también en las tuyas), al empezar cada turno (baja,
  pinchazo y avería en conductores; en el tuyo solo pinchazo) y lluvia una
  vez por jornada. Van a la caja como `extras` (dinero que entra), `otros`
  (gastos) e `incidencias` agrupadas por tipo, que salen en el ticket. Sin
  conexión no hay eventos nuevos; bajas y averías siguen contando jornadas.
  Sin mejoras, su efecto neto debe quedar cerca de cero (medido con un bot),
  salvo los vómitos: a propósito (Iván) son un coste que se evita con bolsas
  (1 % por carrera de noche, 3 % en Ocio nocturno, 1 hora parado). Con 3
  coches restan un 15 % sin bolsas y un 3 % con ellas.
  Para probar: `Libre.forzarEvento(tipo, arg)` en la consola.
- Árbol de mejoras: cada mejora tiene `rama` (`config.ramasMejoras`) y
  `requiere` la anterior de su rama (basta su nivel 1); el orden de la lista
  en la config es el de la rama. Las que no tienen `requiere` abren la rama
  (puede haber varias: Bolsas y Callejero; Curso de zonas y Esterillas), y la
  línea solo une un nodo con el siguiente si este lo pide. La interfaz no inventa requisitos: los lee.
  En pantalla: una pestaña por rama y los nodos en vertical; al
  tocar uno se abre su ficha.
- Mejoras: `estado.mejoras[id]` guarda el nivel (número; 0 o ausente si no
  la tienes). Con `niveles` en la config, cada nivel tiene su precio y su
  efecto total; `nivelMejora()` y `siguienteNivel()` lo resuelven.
- Inventario de consumibles (`config.inventario`, `estado.inventario`), común
  a toda la flota: ruedas de repuesto y bolsas de papel. Cada uno se
  desbloquea con su mejora (efecto `inventario`) y luego se compran unidades
  hasta el máximo del almacén (`comprarInventario()`). Un pinchazo gasta una
  rueda si hay; un vómito, una bolsa. Se repone en la tarjeta «Inventario» de
  Flota; con pocas unidades, la pestaña avisa.
- Sin conexión (`avanzar(..., { agregado: true })`): cuenta media por zona y
  hora, sin carrera a carrera; las carreras a medias se cobran enteras. Da
  entre un 1 % y un 2 % más que jugando.
- Tu turno siempre es a clic, también con conductores contratados: solo
  producen solos los turnos de conductores. Solo se trabaja dentro de la
  franja de tu turno (`jugadorEnTurno()`). Dejar el volante y quedarte solo
  como gestor (`dejarDeConducir()`) requiere la mejora «Oficina de gestión»;
  `conducir()` te devuelve a un turno libre. Usan azar para variar km y tipo de viaje.
  `importeEnCurso()` (solo lectura) da lo que marca el taxímetro en vivo.
- El ticket de cierre va dentro de la página, justo debajo del taxímetro, y
  desaparece al arrancar el día (no tapa la página: en pausa se compra).
  Aspecto de papel térmico; sus líneas son carreras, kilómetros, recaudación,
  combustible, conductores, costes fijos y neto, en ese orden (Iván), y debajo
  el bloque de incidencias. No añadir líneas de ticket inventadas.
- Licencias: `numero` al azar entre 1 y el máximo de Madrid, sin repetir. La
  letra (día de libranza) sale de la última cifra (`config.licencias.letraPorCifra`)
  y se muestra como `15288-L` con `textoLicencia()`. La libranza aún no tiene
  efecto en el juego: está fuera de la primera versión. La
  caja de hoy es un `<details>` de una línea.
- Menú inferior fijo con pestañas Calle, Flota, Mejoras y Partida
  (`VISTA_DE` en `interfaz.js` dice a qué pestaña va cada sección). Una marca
  roja avisa de compras posibles o de un ticket esperando. La pestaña elegida
  se recuerda en `localStorage` (`libre-vista`), aparte de la partida.
- Pestaña Calle en móvil, de arriba abajo: escena, taxímetro, objetivo y
  zonas. Con un solo taxi debe caber sin scroll en 375×600 px por encima del
  menú inferior; con más taxis la escena crece (un carril por taxi, hasta 5)
  y las zonas pueden quedar debajo, pero el taxímetro siempre entero.
  Cualquier texto nuevo ahí, a una línea y sin añadir alto.
- Escena: un carril por taxi, los 5 que más facturan (el resto en «+N más»).
  La posición sale de `licencia.facturadoJornada` (a cero en cada cierre) más
  lo que marca su taxímetro (`importeDeCarrera`), sobre una escala que solo
  crece dentro de la jornada. Iconos de parado: avería, baja, sin conductor y
  jornada terminada. Con lluvia, gotas. Las tarjetas de zona sirven para elegir zona mientras conduces a
  mano.
- El taxímetro debe verse entero en el móvil sin scroll. Tiene dos modos
  que cambian solos (`modoTaximetro()`): **conductor** si conduces y es tu
  turno (o aún no tienes conductores), y es el botón de buscar cliente;
  **flota** el resto del tiempo: piloto «FLOTA», el display suma
  `caja.hoy.ingresos` (sube con cada cobro de cualquier taxi), el pie
  resume «N ocupados · N libres · N parados» y la hora de tu turno, y
  tocarlo abre el desglose de la caja de hoy. Los importes flotantes salen
  por taxi (diferencia de `facturadoJornada`) con el nombre del conductor.
- Taxis parados: la simulación guarda `motivoParada` ('pinchazo',
  'vomito') junto a `paradoHasta`, solo para enseñarlo.
- Sin conexión: `progresoSinConexion()` llama a `avanzar()` con el tiempo
  fuera, con tope en la config. Sin conductores contratados, o si se cerró
  con el ticket en pantalla, el reloj no avanza. Tu turno no produce fuera. Con pausa al cierre, resuelve los
  días seguidos (`sinPausa`), se queda en el último cierre y deja un único
  ticket con la suma de esos días.

## Valores PROVISIONALES (falta el dato real)

Ahora mismo ninguno: Iván confirmó el 13 de noviembre de 2026 combustible,
consumo, cuota de autónomo (535 €/mes), seguro, emisora y porcentaje del
conductor (marcados «Dato de Iván»). Licencia (3.000 €) y coche (1.500 €) son valores de juego
fijados por Iván, no precios reales. Si aparece un valor sin fuente, se marca
`PROVISIONAL` y se apunta aquí.

## Pruebas

- `node tests/simulacion.test.js` prueba la lógica sin navegador. Debe pasar
  antes de cada commit.
- Probar en el navegador abriendo `index.html`, o con un servidor local
  cualquiera sobre la carpeta (mismo resultado).

## Forma de trabajar

- Pasos pequeños, probables en el navegador, con un commit al terminar cada uno.
- Mantener este archivo al día cuando cambien las convenciones.
