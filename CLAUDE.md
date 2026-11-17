# Libre · convenciones del proyecto

Juego incremental de gestión de taxis en Madrid. El diseño completo está en
`DISENO.md` (pensado para leerlo como diseñador, con capturas en
`docs/capturas/`); la versión actual cubre solo las etapas 1 y 2 (apartado
«Alcance de la versión actual»). No añadir nada de lo que ese apartado
deja fuera (VTC, gerentes, otras ciudades, prestigio). Si cambia una regla o
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
  - `Libre.ambiente` → `js/ambiente.js` (tira SVG de ambiente; solo interfaz)
  - `Libre.retratos` → `js/retratos.js` (retratos SVG de conductores; solo interfaz)
  - `Libre.ui` → `js/interfaz.js`
- El orden de los `<script>` en `index.html` importa: config, simulación,
  guardado, ambiente, retratos, interfaz, main.

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
- La mejora «Jornada larga» (5 niveles; su nivel 1 abre la Oficina de
  gestión) alarga el día en segundos reales; los coches
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
- Rasgos de los conductores (`config.conductores.cualidades` y `defectos`):
  una cualidad y un defecto por conductor, nunca opuestos, guardados en el
  turno (`cualidad`, `defecto`). Al contratar eliges entre los candidatos de
  `estado.candidatos` (personajes y cualidades distintos; se sortean otros
  tras cada contrato). Solo modifican valores que ya existen: espera entre
  carreras (no la cola de las paradas), probabilidades de propina, sin
  pagar, objeto, baja, pinchazo y avería, y la limpieza de un vómito.
  `factoresConductor()` los multiplica y `topeConductor()` los recorta a
  `config.conductores.topes`. Tu turno no tiene rasgos.
- Categoría del conductor (`turno.categoria`, de `config.categorias`):
  sale al azar en cada candidato con los mismos pesos que los objetos y
  fija su precio (`precioCandidato()`), cuántas cualidades tiene (los
  LEGENDARIOS, dos), cuántos defectos (B, dos; A, uno; S, uno la mitad de
  las veces; S+ y LEGENDARIO, ninguno), la fuerza de sus rasgos y cuánto
  encuentra. Campos: `cualidad`, `cualidad2`, `cualidad3`, `defecto`,
  `defecto2` (null si no los tiene); léelos con `cualidadesDe()` y
  `defectosDe()`. Al llegar al nivel 10 (`premioNivelMaximo()`) pierde un
  defecto (el segundo primero) o, si no tiene, gana una cualidad nueva. Los candidatos se quedan hasta que contratas a uno; si
  no te llega, la tarjeta dice cuánto falta y deja vender objetos ahí.
- Reserva (`estado.reserva`, hasta `config.conductores.reserva`):
  conductores contratados sin turno (`contratarAReserva()`). No trabajan,
  no ganan experiencia ni cuestan nada; conservan objetos y nivel, y se
  pueden despedir. En las acciones de conductor, la reserva se nombra con
  licencia 'reserva' y turno = su posición (`turnoConductor()`,
  `todosLosConductores()`).
- Reorganizar conductores (`moverConductor(origenLicencia, origenTurno,
  destino)`): solo entre jornadas, con el día cerrado (`enPausa()`). Entre
  turnos de cualquier licencia con coche y la reserva; si el destino está
  ocupado, se intercambian; nunca sobre tu turno. Pierden lo que estuvieran
  esperando; baja, objetos y nivel van con ellos y la avería se queda en el
  coche. En Flota: arrastrar el retrato (ratón: al mover; dedo: tras
  mantener pulsado 450 ms) sobre un conductor, un turno libre o la reserva
  (`data-arrastrable` y `data-destino`, solo en pausa), o el selector
  «Mover a…» de la ficha.
- Etiqueta de categoría (`etiquetaCategoria()` en la interfaz): el nombre
  (B, A, S, S+, LEGENDARIO) sobre su color (`--cat-*` en `:root`; gris,
  verde, azul, morado y oro). Sale en conductores, candidatos, objetos,
  fichas del inventario (con raya de color) y en el aviso de un hallazgo.
- Experiencia (`turno.xp`): cada carrera terminada de un conductor da
  `config.conductores.niveles.porCarrera`; `nivelConductor()` sale de la
  tabla `niveles.experiencia` (10 niveles) y cada nivel acorta la espera.
  También se guardan `carreras` y `facturado` desde que lo contrataste.
  Subir de nivel avisa con su retrato (evento 'nivel', no va al ticket);
  sin conexión la experiencia se suma agrupada y sin aviso. Para probar:
  `Libre.darExperiencia('Laura', 100)` en la consola.
- Objetos de conductor (`config.objetos`, 24 con categoría de
  `config.categorias`: B, A, S, S+ y LEGENDARIO). No se compran: un
  conductor puede encontrar uno al terminar cada carrera (`hallazgo()`;
  categoría por pesos y objeto al azar dentro de ella), con aviso y sin ir
  al ticket; tú no encuentras, y sin conexión tampoco. Van al almacén
  (`estado.objetos`, como mucho `capacidadAlmacen()` sin equipar: 10, y
  hasta 40 con la mejora «Taquillas» de Conductores y jornada) y, si está
  lleno, a `estado.bandeja` hasta que vendas algo (nada se vende solo).
  `venderObjeto()` vende uno del almacén o de la bandeja por el precio de
  su categoría (incidencia «Venta de objetos»). Se equipan en los huecos
  del conductor (`turno.objetos`, sin repetir; 1, 2 en nivel 4 y 3 en nivel
  8). Quitar uno lo devuelve al almacén (no si está lleno). Su efecto entra
  en `factoresConductor()` con los rasgos y el nivel, bajo los mismos topes.
  Ruedas y bolsas siguen siendo consumibles que se compran. Para probar:
  `Libre.forzarEvento('hallazgo', 'S+')` (o el id de un objeto).
- Despedir (`despedirConductor()`) cuesta el finiquito de
  `costeDespido()`: base más un importe por nivel
  (`config.conductores.finiquito`). Sin dinero no se puede; va a la caja
  como incidencia «Finiquitos» y sus objetos vuelven al almacén (o a la
  bandeja si no caben). La interfaz siempre pide confirmación.
- Pestaña Flota: el almacén (en la interfaz se llama así; en el código
  sigue siendo `inventario` para los consumibles) es una cuadrícula de fichas pequeñas, sin
  nombre a la vista (va en el título y en la ficha abierta): icono,
  cantidad y debajo la categoría (objetos) o la barra sobre el máximo
  (consumibles). Solo los objetos que tienes sin equipar, de mejor a peor
  categoría; al tocar una se abre debajo su panel para comprar
  (consumibles) o vender (objetos). Con la bandeja llena, arriba sale lo
  que espera y la lista para vender. Las licencias van de dos en
  dos (rejilla `.licencias`): cada una, su placa a la izquierda (libranza
  en el título, «Hoy libra» debajo si toca) y los dos turnos, cada uno con un sol
  o una luna pequeños sobre una cara (`htmlCara()`); la que tiene candidatos
  o tu panel abiertos ocupa la fila entera. Cara:
  retrato con un círculo de categoría (color y letra, abajo a la izquierda)
  y otro con el nivel (abajo a la derecha) y el nombre debajo. Tocar un
  conductor abre su ficha (hoja que sube desde abajo; se cierra con ×, el
  fondo o Escape) con experiencia, rasgos, objetos, despedir y mover. Tocar
  un turno libre («+») abre los candidatos debajo de la licencia; tocar
  «TÚ», tu zona y opciones. La reserva es una fila de caras.
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
  (puede haber varias: Bolsas y Callejero; Deflectores y Conducción eficiente;
  Curso de zonas, Taquillas y Esterillas), y la
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
  rueda si hay; un vómito, una bolsa. Se repone en la tarjeta «Almacén» de
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
  el bloque de incidencias. No añadir líneas de ticket inventadas. En la
  cabecera, las licencias que trabajaron (facturaron) esos días: la caja
  las apunta en `caja.licencias` (`sumarFacturado()`) y `sumarCierres()`
  junta las de varios días.
- Licencias: `numero` al azar entre 1 y el máximo de Madrid, sin repetir. La
  letra (día de libranza) sale de la última cifra (`config.licencias.letraPorCifra`)
  y se muestra como `15288-L` con `textoLicencia()`. Al comprar eliges entre
  las placas de `placasEnVenta()` (letras distintas; se guardan hasta que
  compras).
- Libranza (`libra()`, desde el 17 de noviembre de 2026, Iván): la licencia
  no trabaja esa jornada (los dos turnos, también el tuyo): entre semana el
  día de su letra; en fin de semana, si la paridad de su número no coincide
  con la del «Día N». `puedeTrabajar()` la tiene en cuenta (también sin
  conexión). `config.licencias.libranza = false` la apaga (las pruebas lo
  hacen; las de libranza la encienden).
- Menú inferior fijo con pestañas Calle, Flota, Mejoras y Partida
  (`VISTA_DE` en `interfaz.js` dice a qué pestaña va cada sección). Una marca
  roja avisa de compras posibles o de un ticket esperando. La pestaña elegida
  se recuerda en `localStorage` (`libre-vista`), aparte de la partida.
- Pestaña Calle en móvil, de arriba abajo: tira de ambiente, taxímetro,
  «Siguiente», «Tus taxis hoy» y zonas. Con hasta 5 taxis debe caber sin
  scroll en 375×800 px por encima del menú inferior (con 1 taxi, en
  375×600). Cualquier texto nuevo ahí, a una línea y sin añadir alto.
- No hay línea «Hoy»: el desglose de la caja de hoy sale bajo el taxímetro
  al tocar el display en modo flota o el total de «Tus taxis hoy»
  (`cajaAbierta`), y se cierra con su ×.
- Tira de ambiente (`js/ambiente.js`, 36 px): cielo según la hora, perfil
  de edificios y lluvia. Es un módulo aparte con `montar(contenedor)` y
  `dibujar(contenedor, estado)`; para cambiarla por otra vista (un mapa)
  basta otro módulo con esas dos funciones. No enseña datos de la partida.
- Zonas: las abiertas, en una fila de botones compactos (sirven para
  elegir zona mientras conduces a mano); las cerradas, en una sola línea
  debajo con la mejora que las abre.
- El taxímetro debe verse entero en el móvil sin scroll. Tiene dos modos
  que cambian solos (`modoTaximetro()`): **conductor** si conduces y es tu
  turno (o aún no tienes conductores), y es el botón de buscar cliente;
  **flota** el resto del tiempo: piloto «FLOTA», el display suma
  `caja.hoy.ingresos` (sube con cada cobro de cualquier taxi), el pie
  resume «N ocupados · N libres · N parados» y la hora de tu turno, y
  tocarlo abre el desglose de la caja de hoy. Los importes flotantes salen
  por taxi (diferencia de `facturadoJornada`) con el nombre del conductor.
- «Tus taxis hoy» (`seccionTaxis`): una fila por taxi con retrato, nombre,
  zona, estado (Ocupado, Libre o el motivo de la parada), barra
  proporcional al que más lleva y lo facturado en la jornada. Las filas se
  crean una vez y en cada fotograma solo se rellenan y recolocan (FLIP);
  destellan al cobrar y llevan a su licencia en Flota. Más de 6 taxis:
  «Ver los N restantes». Los datos salen de `taxisDeLaFlota()`.
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
