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
  - `Libre.ambiente` → `js/ambiente.js` (calle SVG de la cabecera; solo interfaz)
  - `Libre.retratos` → `js/retratos.js` (retratos SVG de conductores; solo interfaz)
  - `Libre.sonidos` → `js/sonidos.js` (sonidos con Web Audio; solo interfaz)
  - `Libre.actualizaciones` → `js/actualizaciones.js` (historial de
    actualizaciones para el panel de Ajustes; solo interfaz)
  - `Libre.ui` → `js/interfaz.js`
- El orden de los `<script>` en `index.html` importa: config, simulación,
  guardado, ambiente, retratos, sonidos, actualizaciones, interfaz, main.
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
  uno nuevo) y tic (al buscar cliente). Mudos hasta el primer toque de la
  página; sonido sí/no y volumen en la hoja de Ajustes, guardados en
  `localStorage` (`libre-sonido`), aparte de la partida. La interfaz los
  pide con `sonar()`; `SONIDO_EVENTO` dice qué evento lleva cuál. Con la
  pestaña en segundo plano no suenan.
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
  número de jornada, así que el mismo día da siempre lo mismo.
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
  `factoresConductor()` los multiplica y `topeConductor(valor, factor, t)`
  los recorta a los topes de ese conductor (`topesDe()`): los de
  `config.conductores.topes` con el lado bueno abierto según
  `aperturaTopes()` (`aperturaTope` de su categoría + `topesAbiertos.porNivel`
  por nivel; con 1 llega a `topesAbiertos.extremo`). Pasa siempre el turno
  `t`: sin él, salen los topes de un B de nivel 1. Tu turno no tiene rasgos.
- Categoría del conductor (`turno.categoria`, de `config.categorias`):
  sale al azar en cada candidato con los mismos pesos que los objetos
  (salvo con la mejora «Departamento de RRHH»: `pesosCandidatos()`) y
  fija su precio (`precioCandidato()`), cuántas cualidades tiene (los
  LEGENDARIOS, dos), cuántos defectos (B, dos; A, uno; S, uno la mitad de
  las veces; S+ y LEGENDARIO, ninguno), la fuerza de sus rasgos, cuánto
  encuentra, su plus de espera de serie (`esperaBase`, un aporte más en
  `aportesConductor()`) y cuánto abre sus topes (`aperturaTope`). Iván
  (17-11-2026): la categoría debe notarse más que el nivel; un LEGENDARIO
  deja ~+50 % que un B al final de la partida (medido con un bot). Campos: `cualidad`, `cualidad2`, `cualidad3`, `defecto`,
  `defecto2` (null si no los tiene); léelos con `cualidadesDe()` y
  `defectosDe()`. Cazatalentos (idea 11, Iván 22-11-2026; versión 31 del
  guardado): mejora de 25.000 € al final de Conductores y jornada
  (`efecto.rebuscar`); `rebuscarCandidatos()` cobra `precioRebuscar()`
  (`conductores.rebuscar`: base × factor^`estado.rebuscasHoy`), sortea
  otros candidatos y suma una búsqueda; `cerrarCaja()` la pone a 0. En la
  hoja de candidatos, `htmlRebuscar()`. Al llegar al nivel 10 (`premioNivelMaximo()`) pierde un
  defecto (el segundo primero) o, si no tiene, gana una cualidad nueva. Los candidatos cambian cada día (`cerrarCaja()` llama a
  `sortearCandidatos()`) y tras cada contrato; si
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
  coche. En Conductores: arrastrar el retrato (ratón: al mover; dedo: tras
  mantener pulsado 450 ms) sobre un conductor, un turno libre o la reserva
  (`data-arrastrable` y `data-destino`, solo en pausa). Coger y tocar
  (`cogido`, para el móvil, donde el navegador puede quedarse el gesto para
  desplazar): mantener pulsado coge al conductor y, si se suelta sin destino
  o el navegador cancela el arrastre (`pointercancel`), sigue cogido; la
  barra «Toca dónde poner a…» (`#barra-cogido`) y tocar el destino lo
  mueven. «Cambiar de sitio» de la ficha también lo coge. Tocar fuera,
  «Cancelar», Escape o cambiar de pestaña lo sueltan.
- Rareza (categoría) en pantalla: insignia `ui-rareza` (`claseRareza()`,
  `etiquetaCategoria()`): la letra o el nombre (B, A, S, S+, LEGENDARIO)
  sobre su color (`--rareza-*` en `:root`; gris, verde, azul, morado y
  amarillo). Las casillas de objeto llevan además el dibujo sobre un tinte
  de su categoría (`claseFondo()`).
- Personajes (`config.conductores.personajes`, 32 desde el 20-11-2026): el
  índice es el retrato que guarda cada conductor, así que los nuevos van
  siempre al final. Piezas en `js/retratos.js`: además de cara, pelo, gafas
  y barba, `gafas: 'sol'`, `gorra` (color de ropa 1–6), `cuello`
  ('pajarita' o 'corbata', que pone camisa y corbata) y `pendientes`;
  colores en `--retrato-*`.
- Iconos de objetos: dibujos SVG en `iconos/` (del paquete de
  diseño, con sus propios colores), con `<img>` desde `icono()`. Se llaman
  como el objeto salvo los de `ARCHIVO_ICONO` (escaner → radio, paconi →
  planta, alfombrillas → alfombrilla, bolsaVomito → bolsa). Los
  de turnos y rasgos siguen siendo trazos en `ICONOS`.
- Experiencia (`turno.xp`): cada carrera terminada de un conductor da
  `config.conductores.niveles.porCarrera`; `nivelConductor()` sale de la
  tabla `niveles.experiencia` (10 niveles) y cada nivel acorta la espera.
  También se guardan `carreras` y `facturado` desde que lo contrataste.
  Subir de nivel avisa con su retrato (evento 'nivel', no va al ticket).
  Para probar:
  `Libre.darExperiencia('Laura', 100)` en la consola.
- Objetos de conductor (`config.objetos`, 37 con categoría de
  `config.categorias`: B, A, S, S+ y LEGENDARIO). No se compran: un
  conductor puede encontrar uno al terminar cada carrera (`hallazgo()`;
  categoría por pesos y objeto al azar dentro de ella), con aviso y sin ir
  al ticket; tú no encuentras. Van al almacén
  (`estado.objetos`, como mucho `capacidadAlmacen()` sin equipar: 10, y
  hasta 40 con la mejora «Taquillas» de Conductores y jornada) y, si está
  lleno, a `estado.bandeja` hasta que vendas algo (nada se vende solo).
  `combinarObjetos(estado, id, elegidos)` cambia
  `cuantosParaCombinar(categoría)` sin equipar de una categoría
  (`config.objetos.combinar`: 3 B, 4 A, 4 S, 5 S+; Iván, 19-11-2026) por
  uno al azar de la siguiente. `elegidos` (lista o «a,a,b») son los que el
  jugador decide gastar; sin ella, los de `objetosParaCombinar()` (el
  tocado, sus copias y los más repetidos), que es también la propuesta
  inicial del panel (`combinarSel`, con «−»/«+» por objeto:
  `data-combinar-mas`/`menos`). Hallazgo: `probHallazgo` 0,009 (antes
  0,012).
  `venderObjeto()` vende uno del almacén o de la bandeja por el precio de
  su categoría (incidencia «Venta de objetos»). Se equipan en los huecos
  del conductor (`turno.objetos`, sin repetir; 1, 2 en nivel 4 y 3 en nivel
  8). Quitar uno lo devuelve al almacén (no si está lleno). Su efecto entra
  en `factoresConductor()` con los rasgos y el nivel, bajo los mismos topes.
  Tres efectos no son factores ni tienen tope: `bolsa` (no vomitan en su
  taxi), `sinImpagos` (nadie se va sin pagar) y `rueda` (un pinchazo no
  cuesta ni para); `conEfecto(t, clave)` los busca. Son la Bolsa para
  vómitos, la Cámara de seguridad y la Rueda de repuesto, que hasta el
  18-11-2026 eran mejoras con consumibles (versión 22 del guardado). Tu
  turno no lleva objetos: no tiene esas protecciones. Para probar:
  `Libre.forzarEvento('hallazgo', 'S+')` (o el id de un objeto).
  Cada objeto lleva `frase` (su chiste, en el panel del Almacén). Tres
  factores más (Iván, 18-11-2026): `importeLluvia` (Anfibio: multiplica el
  importe de la carrera de un conductor si el cliente sube lloviendo, en
  `empezarCarrerasConductores()`; tope [1, 3,1] y sale en sus stats solo si
  algo lo cambia), `hallazgo` (probabilidad de encontrar,
  con tope) y `suerte` (1,15 = un 15 % de que lo encontrado suba una
  categoría: `probSubir()`); los usan Linterna, Gato, Detector y la
  cualidad Urraca (su opuesto, Desastre).
- Despedir (`despedirConductor()`) cuesta el finiquito de
  `costeDespido()`: base más un importe por nivel
  (`config.conductores.finiquito`). Sin dinero no se puede; va a la caja
  como incidencia «Finiquitos» y sus objetos vuelven al almacén (o a la
  bandeja si no caben). La interfaz siempre pide confirmación.
- Pestañas Almacén y Conductores (antes, juntas en Flota). Almacén
  (`seccionAlmacen`, maqueta almacen.html): título con lo que vale
  (`valorAlmacen()`: venta de almacén y bandeja) y «Objetos N de M»;
  los objetos sin equipar en casillas de 3 columnas, de
  mejor a peor, sin nombre a la vista (Iván: rareza, ×cantidad y dibujo; el
  nombre va en el título y en el panel). Al tocar una se abre debajo su
  panel (nombre, rareza, descripción, combinar y vender). Con la bandeja llena, arriba
  sale lo que espera y la lista para vender. En Conductores (`seccionConductores`,
  maquetas conductores.html y ficha-conductor.html): título y número de
  licencias, la reserva (tarjeta discontinua con sus 5 huecos: caras de 44
  px y huecos «+» que abren los candidatos) y las licencias de dos en dos
  (rejilla `.licencias`; la última casilla es «Comprar licencia»). Cada
  licencia: su placa (libranza en el título, chip «Libra» si toca) y dos
  casillas de turno con un sol o una luna, la cara (`htmlCara()`) y el
  nombre; la que tiene candidatos o tu panel abiertos ocupa la fila entera.
  Cara: retrato con la rareza (`ui-rareza`, abajo a la izquierda), el nivel
  (abajo a la derecha) y un «!» rojo si está parado. Tocar un conductor
  abre su ficha (hoja que sube desde abajo, con scroll por dentro desde las
  estadísticas; se cierra con ×, el fondo o Escape): cabecera, nivel con barra, rasgos,
  mosaico de 3 casillas de objetos (puesto con su «×» para quitar,
  «Equipar» o el nivel que abre el hueco; el efecto en corto con
  `textoEfecto()`). «Equipar» abre encima otra hoja (`equipando`,
  `htmlHojaEquipar()`) con los objetos del almacén en casillas iguales, de
  mejor a peor; los que ya lleva, atenuados; tocar uno lo equipa y vuelve a
  la ficha, carreras, facturado y zona (solo lectura), los botones
  «Comparar», «Cambiar de sitio» (desactivado durante la jornada, con una
  línea que lo explica) y «Despedir · finiquito», y después la línea del
  coche y las estadísticas (Iván, 20-11-2026: los botones, antes de ellas). «Cambiar de sitio» cierra la
  ficha y coge al conductor (ver «Reorganizar»). Tocar un turno
  libre o un hueco de la reserva («+») abre los candidatos en una hoja
  (`htmlHojaCandidatos()`): una tarjeta por candidato con retrato, rareza,
  rasgos (las mismas filas que la ficha, `htmlFilasRasgos()`), «Contratar»
  y «A la reserva», «Te faltan…» y, al pie, vender objetos para contratar.
  Cada candidato lleva «Comparar con…» (lista de tus conductores).
  Comparar (`comparando`, `htmlHojaComparar()`): desde la ficha, «Comparar
  con otro conductor» coge al conductor en modo 'comparar' (vale durante
  la jornada; se toca a otro). Hoja encima con las dos caras, el resumen
  de cuántas stats gana cada uno, una fila por stat de `statsConductor()`
  (el mejor en verde con «▲»; cada uno en su turno, null en reserva y
  candidatos) y rasgos, objetos, carreras y facturado; con el día cerrado,
  «Intercambiarlos». Un candidato es la clave 'candidato|i'.
  Escape cierra la hoja de encima. Tocar «TÚ», tu zona y opciones.
- Estadísticas de la ficha (`htmlStatsConductor()`, Iván 17-11-2026): todas
  las stats con su valor real (probabilidad por carrera o por turno; la
  espera, en %; la limpieza, euros y minutos) y el desglose de dónde sale.
  Los números salen de `Libre.sim.statsConductor(estado, t, turno)`, que
  repite las cuentas de `eventosDeCarrera()`, `sortearInicioDeTurnos()`,
  `hallazgo()` y el reparto de carreras: si cambia una, cambiar también
  esta (hay una prueba que las compara). `aportesConductor()` da de dónde
  sale cada factor y `factoresConductor()` los multiplica.
- Zonas de los conductores: las eligen ellos (`asignarZonasConductores()`,
  una vez por hora de juego). Sin el «Curso gestión de
  zonas», al empezar su turno o si su zona se queda sin clientes eligen al
  azar entre las zonas con clientes; con el curso, cada hora la que más deja
  al dueño contando a los compañeros. En Conductores no se puede elegir su zona;
  la tuya, sí.
- Eventos (`config.eventos`): por carrera (propina, sin pagar, objeto
  devuelto, vómito; también en las tuyas), al empezar cada turno (baja,
  pinchazo, avería y avería definitiva; en el tuyo, sin baja) y lluvia una
  vez por jornada como mucho: chubasco o tormenta (`estado.lluvia.tipo`,
  sorteado por pesos de `config.eventos.lluvia.tipos`, cada uno con su
  duración; versión 24 del guardado). Van a la caja como `extras` (dinero que entra), `otros`
  (gastos) e `incidencias` agrupadas por tipo, que salen en el ticket.
  Desde el 18-11-2026 (Iván) restan: pinchazos 4 %, bajas 2 % y averías
  0,3 % por turno, sin pagar 2 % por carrera; con 5 conductores B, un 18 %
  frente a no tenerlos (antes un 8 %, casi compensado por propinas). Los
  vómitos: a propósito (Iván) son un coste que se evita con la
  Bolsa para vómitos (1 % por carrera de noche, 3 % en Ocio nocturno, 1
  hora parado).
  Para probar: `Libre.forzarEvento(tipo, arg)` en la consola.
- Árbol de mejoras: cada mejora tiene `rama` (`config.ramasMejoras`) y
  `requiere` la anterior de su rama (basta su nivel 1); el orden de la lista
  en la config es el de la rama. Cada rama es una cadena (Iván, 18-11-2026):
  solo la primera no tiene `requiere` y cada una pide la de antes, con el
  precio subiendo (hay una prueba). La interfaz no inventa requisitos: los lee.
  «Publicidad en el taxi» cobra al cerrar la caja por cada carrera del día
  (incidencia «Publicidad»); «Enchufe en los hoteles» baja la búsqueda en el
  Centro. «Neumáticos de alta gama» (Vehículo, tras los de bajo consumo;
  `modificadores().pinchazo`, ×0,65) baja los pinchazos de toda la flota,
  también tu turno; en los conductores, con su tope. «Grúa propia» deja un pinchazo sin rueda en una hora parado
  (`pinchazoHoras`) y a mitad de precio; «Leasing de coches» abarata cada
  coche (`precioCoche()`); «Mampara y asientos de cuero» sube la demanda.
  En pantalla (Iván, 18-11-2026): el árbol entero, sin chips. Del logo salen
  las cinco ramas en columnas (`corto` de `config.ramasMejoras`); cada
  mejora es un círculo con su icono de trazo (`ICONOS_MEJORA`; una mejora
  nueva necesita el suyo), unido al de antes (línea verde si está comprado),
  con rayitas de nivel y precio corto (`eurosCorto()`). Estados: comprada
  (verde con ✓), disponible (azul), sin dinero y bloqueada (candado). Al
  tocar uno sube su hoja (`nodoAbierto`, `htmlHojaMejora()`): qué hace y
  «Comprar nivel N · precio»; se cierra con ×, el fondo o Escape.
- Lo que deja cada mejora (idea 16, Iván 22-11-2026; versión 30 del
  guardado): `estado.ganadoMejoras = { id: euros }`, solo en las que se
  cuentan directamente (`CUENTA_MEJORAS`, `cuentaDeMejora()`: 'ganado' para
  publicidad y monedas de esterillas, 'ahorrado' para consumo, seguro,
  averiaCoste, pinchazoCoste y precioCoche). `apuntarGanado()` y
  `apuntarAhorro(estado, clave, pagado)` (cada mejora con ese factor f:
  pagado × (1/f − 1)) se llaman donde se cobra: `gastar()` del combustible,
  `cerrarCaja()` (seguro y publicidad), monedas, pinchazo, avería,
  `comprarVehiculo()` y `renovarCoche()`. `estado.mejorasAntesDeCuenta`:
  las que ya tenía una partida migrada. En la hoja de la mejora,
  `htmlGanadoMejora()`, al día en `actualizar` (`#mejora-ganado`).
- Mejoras: `estado.mejoras[id]` guarda el nivel (número; 0 o ausente si no
  la tienes). Con `niveles` en la config, cada nivel tiene su precio y su
  efecto total; `nivelMejora()` y `siguienteNivel()` lo resuelven.
- Tu turno siempre es a clic, también con conductores contratados: solo
  producen solos los turnos de conductores. Solo se trabaja dentro de la
  franja de tu turno (`jugadorEnTurno()`). Dejar el volante y quedarte solo
  como gestor (`dejarDeConducir()`) requiere la mejora «Oficina de gestión»,
  que además rebaja lo que se quedan los conductores (`porcentajeConductor()`);
  `conducir()` te devuelve a un turno libre. Usan azar para variar km y tipo de viaje.
  `importeEnCurso()` (solo lectura) da lo que marca el taxímetro en vivo.
- El ticket de cierre va dentro de la página, justo debajo del taxímetro, y
  desaparece al arrancar el día (no tapa la página: en pausa se compra).
  Aspecto de papel térmico, en bloques separados (Iván, 18-11-2026): carreras
  y kilómetros; recaudación, combustible, conductores y costes fijos; el
  bloque de incidencias, y al final, tras la doble raya, el neto (que ya
  cuenta las incidencias; «Sin pagar» no, es dinero que no entró).
  `lineasTicket()` da los bloques. Los importes que restan, en rojo
  (`.ticket-negativo`, `--peligro`); el neto, solo si es negativo. No añadir líneas de ticket inventadas. En la
  cabecera, las licencias que trabajaron (facturaron) esos días: la caja
  las apunta en `caja.licencias` (`sumarFacturado()`) y `sumarCierres()`
  junta las de varios días.
- Licencias: `numero` al azar entre 1 y el máximo de Madrid, sin repetir. La
  letra (día de libranza) sale de la última cifra (`config.licencias.letraPorCifra`)
  y se muestra como `15288-L` con `textoLicencia()`, siempre con
  `config.licencias.digitosPlaca` (5) cifras rellenando con ceros (`00607-L`, Iván). Al comprar eliges entre
  las placas de `placasEnVenta()` (letras distintas; se guardan hasta que
  compras).
- Kilometraje (Iván, 19-11-2026; versión 25 del guardado): `lic.km` son
  los km del coche de esa licencia y `estado.totales.km` los de toda la
  partida. Solo se suman con `sumarKm()`, en los mismos sitios que
  `caja.hoy.km` (carrera tuya, de conductor o tramo en vacío), así que
  cuadran con el ticket.
  El coche inicial sale usado (`kmCocheUsado()`, entre
  `config.vehiculos.kmInicialMin` y `kmInicialMax`); `comprarVehiculo()`
  lo pone a 0. Precio (Iván, 21-11-2026): `precioCoche(estado, sustituye)`
  sube `vehiculos.factorSubida` (×1,10) por cada coche propio
  (`cochesPropios()`, sin alquilados) menos el primero; con `sustituye`
  (renovar, venta del viejo, reponer tras rotura), el del último coche.
  `precioAlquiler()` sube igual, sin Leasing. En Conductores, bajo la placa (`.licencia-km`, al día en
  `actualizar` con `data-km-licencia`).
- Desgaste del coche (idea 7, Iván 19-11-2026): `factorAveriaKm(lic)`
  multiplica la avería normal (`eventos.averia.kmDoble`, `factorKmMax`) y
  `probRotura(lic)` da la avería definitiva por turno (`eventos.rotura`:
  0 hasta `kmDesde`, cuadrática hasta `probMax` en `kmMax`). Las dos se
  sortean al empezar cada turno (`sortearInicioDeTurnos()`, pendiente
  'rotura'), también en el tuyo, y sin azar si no hay riesgo
  (`tocaRotura()`). `aplicarRotura()` deja `lic.vehiculo = null` (la
  licencia sin coche ya existía), cobra la chatarra (incidencia 'rotura')
  y para lo que hubiera en curso. `roturaPosible()`: nunca si deja la flota
  sin coche en marcha y no te llega para otro (la partida no se bloquea).
  `averiaPosible()` ya no excluye tu licencia. Sin coche o en el taller
  (`motivoSinCoche()`), `buscarCliente()` falla y `puedeSaltarDia()` deja
  saltar como en la libranza (el taxímetro lo dice con `textoSalto()`).
  `estadoCoche()` (solo lectura) da km, nivel ('nuevo', 'rodado',
  'gastado', 'limite'), factores, `venta` y `precioRenovar`;
  `renovarCoche()` (solo en pausa) compra uno a 0 km y vende el viejo
  (`valorVentaCoche()`, `config.vehiculos.venta`). En pantalla: los km de
  la licencia son un botón (`data-coche`) que abre la hoja del coche
  (`cocheAbierto`, `htmlHojaCoche()`); la ficha del conductor lo enlaza
  (`htmlCocheEnFicha()`). El botón de los km es una pastilla (coche,
  km y «›») con el fondo del estado (`.coche--gastado`, `.coche--limite`).
  Alquiler (idea 5, Iván 20-11-2026; versión 26 del guardado):
  `alquilarCoche()` pone coche a una licencia sin él (o alarga uno
  alquilado) por `config.vehiculos.alquiler` (3 jornadas, 400 € de base);
  `lic.alquiler = { hasta }` (jornada en la que se devuelve,
  `devolverAlquilados()` desde `cerrarCaja()`, incidencia 'alquiler').
  No se gasta: `probRotura()` 0, `factorAveriaKm()` 1, sin renovar;
  `comprarVehiculo()` lo sustituye. `estadoCoche()` da nivel 'alquilado'
  y `quedan` (`jornadasAlquiler()`); la hoja es `htmlHojaAlquilado()`.
  Botones con `data-solo-pausa`: el bucle los
  desactiva también fuera de la pausa, además de por precio.
- Libranza (`libra()`, desde el 17 de noviembre de 2026, Iván): la licencia
  no trabaja esa jornada (los dos turnos, también el tuyo): entre semana el
  día de su letra; en fin de semana, si la paridad de su número no coincide
  con la del «Día N». `puedeTrabajar()` la tiene en cuenta.
  `config.licencias.libranza = false` la apaga (las pruebas lo
  hacen; las de libranza la encienden).
- Modo incógnito (idea 17, Iván 20-11-2026; mejora `incognito`, tras la
  Oficina; versión 27 del guardado): `trabajaIncognito()` deja trabajar en
  la libranza de su licencia a los conductores de nivel máximo;
  `puedeTrabajar()` lo usa, así que vale en todo (también en las
  estadísticas). Pesetas (`eventos.pesetas`, 2 % y 2.000 €): pendiente
  'pesetas' al empezar el turno; multa (incidencia 'pesetas') y parado el
  resto del turno (`motivoParada` 'pesetas'). En «Tus taxis hoy», chip morado «Incógnito».
  Tu incógnito (mejora `incognitoTu`, la primera de la rama; versión 28):
  `trabajaIncognito()` también vale para tu turno, así que `buscarCliente()`
  te deja conducir en la libranza y `puedeSaltarDia()` no salta. El pesetas
  contigo (`eventos.pesetas.tu`) es interactivo: un pendiente 'pesetas' en
  tu turno pone `estado.jugador.vigilancia = { desde, hasta }`
  (`vigilanciaActiva()`, `segundosVigilancia()`) y, si llamas a
  `buscarCliente()` mientras dura y pasado `graciaSegundos`, multa, te para
  el turno y devuelve `pillado`. El taxímetro (clase `.vigilado`, piloto
  'vigilado' con `ICONO_OJO`) enseña la cuenta atrás; el sonido es
  `pesetas`. Para probar: `Libre.forzarEvento('vigilancia')`. El bot de
  progresión espera a que se vaya.
- Sociedad limitada (idea 1, Iván 20-11-2026; versión 29 del guardado):
  con `config.sociedad.licenciasSinSociedad` (3) licencias, `comprarLicencia()`
  falla hasta `montarSociedad(estado, nombre)` (3.000 €, incidencia
  'sociedad'; `estado.empresa = { nombre, jornada }`). `necesitaSociedad()`
  lo dice; `comprasPosibles()` ofrece entonces `{ tipo: 'sociedad' }` en vez
  de la licencia. Coste diario: `costeSociedadDiario()` (10 € por conductor
  con turno, × `tasaSociedad` de la mejora «Gestoría propia») dentro de
  `costesFijosDiarios()`. Gestoría (idea 18, 22-11-2026): al final de
  Taller y seguros, con `requiereSociedad`; lo que falta para una mejora
  (la anterior o montar la SL) lo da `faltaParaMejora()`, que usan
  `comprarMejora()`, `comprasPosibles()`, la interfaz y el bot. `renombrarSociedad()` en
  Ajustes. En pantalla: la casilla «Montar una SL» (`data-montar-sl`) abre
  `htmlHojaSociedad()` (`montandoSL`, el nombre escrito en `nombreSL`; la hoja
  baja desde arriba, `.hoja-sociedad`, para que el teclado no la tape) y el
  nombre va en la placa `#empresa` junto al logo (`.cabecera-marca`).
- Saltar al cierre (Iván, 17-11-2026): `puedeSaltarDia()` es cierto si libra
  tu licencia, ningún conductor puede trabajar esa jornada (`puedeTrabajar()`)
  y no tienes otra licencia a la que pasarte (con coche, que no libre y con
  un turno libre, y solo si tienes `dejarVolante`). `saltarAlCierre()` llama
  a `avanzar()` con el tiempo hasta las 7:00 (no es otra forma de mover el
  reloj). El taxímetro tiene entonces un tercer modo, **libranza**, que es el
  botón: «HOY LIBRAS · Toca para saltar al cierre ›».
- Tarjeta «Siguiente»: la propone `Libre.sim.objetivoCompra(estado, fija)`
  (coche o conductor que falte; si no, licencia o mejoras de hasta
  `config.objetivo.mejorasHasta` de crecer; con
  `licenciasParaPersonal` licencias, también `mejorasPersonal`: Curso de
  zonas y RRHH). La interfaz solo le pone nombre
  y destino (`decorarCompra()`) y recuerda la fija. El bot la usa en su
  perfil «siguiente».
- Menú inferior fijo (78 px) con pestañas Calle, Conductores, Almacén,
  Mejoras y Estadísticas (`VISTA_DE` en `interfaz.js` dice a qué pestaña va cada sección;
  `body[data-vista]` la pestaña elegida). Una marca roja avisa de compras
  posibles (Conductores, Mejoras), de la bandeja (Almacén) o de un ticket esperando (Calle). La pestaña elegida se recuerda
  en `localStorage` (`libre-vista`), aparte de la partida; las antiguas
  `flota` y `partida` se traducen a `conductores` y `calle`.
- Estadísticas (`seccionEstadisticas`, Iván 18-11-2026): cuatro cifras
  (`estado.totales`, con `totales.km`, y `estado.mejorDia`), facturación por día (barras en
  HTML, raya del neto; tocar una la elige: `diaEstadistica`), media diaria
  (`Libre.sim.mediasDiarias()`: tú y los conductores con turno, entre las
  jornadas que estuvieron en la flota; las de libranza de su licencia no se
  apuntan) y top 10 (`clasificacionConductores()`,
  con los despedidos de `estado.exConductores`). Datos: al cerrar la caja,
  `registrarDia()` guarda en `estado.historial` (como mucho
  `config.estadisticas.dias`, 30) lo que entró, el neto, las carreras, lo
  tuyo (`tu`, null sin turno) y lo de cada conductor con turno
  (`conductores: { id: euros }`, de `caja.hoy.porConductor` y `caja.hoy.tuyo`,
  que apunta `apuntarFacturado()`). Cada conductor lleva un `id` fijo
  (`estado.ultimoIdConductor`). Fuera de su pestaña no se dibuja. Medallas
  con `--medalla-oro`, `--medalla-plata` y `--medalla-bronce`.
- Hojas al redibujar (Iván, 19-11-2026): si la sección de una hoja abierta
  se redibuja (un aviso, un objeto encontrado…), `dibujar()` le devuelve su
  scroll y le pone `.ya-abierta` (sin la animación de subir); se reconocen
  por sus clases (`claveHoja()`). Antes la ficha volvía arriba en cada aviso.
- Avisos (`mostrarMensaje()`, `#mensaje`): de lado a lado con 16 px de
  margen (antes, centrado con translate, solo usaba media pantalla). Los de
  eventos de la partida (`mostrarEventos()`: de conductores y generales,
  como lluvia o la avería de tu coche) solo salen en `VISTAS_AVISOS_EVENTOS`
  (Calle; Iván, 20-11-2026): `avisoVisible()` los descarta en las demás,
  también si cambias de pestaña con uno en la cola. Lo que responde a una
  acción tuya (`mostrarMensaje()` directo) sale siempre.
- Ajustes y partida no es una pestaña: el engranaje de la cabecera abre una
  hoja (`seccionPartida`, vista 'siempre'; se cierra con ×, el fondo o
  Escape). Exportar copia el texto (portapapeles o, si no hay, selección y
  `execCommand`); importar y borrar se confirman en la propia hoja
  (`confirmarPartida`, sin `confirm()`, que algunos navegadores del móvil
  bloquean) y el texto pegado vive en `textoPartida`, así que redibujar la
  hoja no lo borra. `Libre.guardado.limpiarTexto()` quita lo que no es
  base64 (espacios duros, invisibles, comillas, saltos) antes de importar
  (Iván, 19-11-2026: una importación falló). Al final, el panel plegado «Actualizaciones» (`htmlActualizaciones()`,
  un `<details>`): **cada actualización que se termine se apunta en
  `js/actualizaciones.js` (número siguiente, en el grupo de su día, en
  lenguaje de jugador) y en `docs/historial.md`**.
- Cabecera (`#cabecera`): la calle de fondo, «Libre», el engranaje y la
  placa «Caja total» (`--velo-dia`/`--velo-noche` al ~70 %: deja ver la calle) (dinero y, en Calle, «Día N · Mié 07:00 · Tarifa 1»).
  Alta (220 px) en Calle y compacta (124 px) en las demás; en pantallas de
  menos de 830 px de alto, la alta baja a 180 px. Es `sticky` con `top`
  negativo: al desplazar solo queda la placa a la vista. De noche (lo dice
  la escena) cambia sus colores.
- Pestaña Calle en móvil, de arriba abajo: cabecera, taxímetro (y el
  ticket o la caja si están abiertos), zonas, «Siguiente» y «Tus taxis hoy»
  (Iván, 22-11-2026: las zonas, antes al final, no se veían con muchos
  taxis; el orden es el de `secciones` en `interfaz.js`). Con hasta 5 taxis debe caber sin
  scroll en 390×844 y en 375×800 px (cabecera de 180) por encima del menú
  inferior. Cualquier texto nuevo ahí, a una línea y sin añadir alto.
  Va justo (medido el 17-11-2026: 0 px de scroll en las dos): el relleno de
  abajo de `main` es el alto del menú más su borde y 4 px, menos el margen de
  la última sección, y Calle empieza con `--esp-1` arriba.
- No hay línea «Hoy»: el desglose de la caja de hoy sale bajo el taxímetro
  al tocar el display en modo flota o el total de «Tus taxis hoy»
  (`cajaAbierta`), y se cierra con su ×.
- Escena de la cabecera (`js/ambiente.js`): cielo según la hora, sol o
  luna y estrellas, edificios con ventanas que se encienden de noche (el
  tramo del centro, `tramoCentro()`, con monumentos de Madrid; los demás,
  `tramo()`), árboles (`arbol()`), farolas en la acera de detrás (`farolas()`,
  cada `SEP_FAROLA`; de noche `.esc-farolas-luz` con halo y luz en el
  suelo, `--esc-farola-*`; Iván, 22-11-2026), gente paseando (`personas()`, colores de
  los retratos; Iván, 20-11-2026; una con perro, `--esc-perro-*`, con
  patas que giran desde la cadera: `transform-origin` propio de cada par), repartidores en bici (`REPARTIDORES`,
  `repartidor()`, `rueda()`: Uber Eats verde y Just Eat naranja, en
  sentidos contrarios; el que vuelve va en espejo salvo la mochila), un
  autobús articulado de la EMT (`autobus()`, `--bus-*`), nubes,
  un taxi que pasa (berlina con las formas de un Corolla, colores
  `--coche-*`; Iván, 20-11-2026; de noche, `.esc-brillo`: haz del faro
  con degradado lineal que sale del dibujo, `.esc-taxi` con
  `overflow: visible`) y lluvia. Carriles (se circula por la
  derecha): taxi y bici de Uber Eats, hacia la derecha, por el de delante;
  autobús y bici de Just Eat, hacia la izquierda, por el de detrás. El orden
  en `montar()` decide quién tapa a quién; con tormenta (clase `.tormenta`, Iván
  18-11-2026) el cielo se oscurece sin sol ni luna y hay relámpagos con
  rayo (un destello doble cada 7 s), lluvia inclinada, viento y hojas. Se dibuja a escala 1 pegada abajo (la cabecera
  compacta enseña solo la calle). Es un módulo aparte con
  `montar(contenedor)` y `dibujar(contenedor, estado)`, que deja
  `contenedor.dataset.momento` ('dia' o 'noche'); para cambiarla por otra
  vista (un mapa) basta otro módulo con esas dos funciones. No enseña datos
  de la partida. Animaciones solo CSS (taxi 16 s, nubes 40/55 s, sol 5 s,
  ventanas 4/6 s; ruedas `.an-rueda`, grupos que giran sobre su centro con
  `transform-box: fill-box` (un círculo invisible `.esc-eje` del tamaño
  de la llanta centra la caja) a la velocidad de su vehículo; dibujo
  asimétrico para que se vea: 5 radios, reflectante, 5 tuercas; Iván, 21-11-2026), fuera con `prefers-reduced-motion`.
- Zonas: las abiertas, en una fila de chips (`ui-chip-zona`, se desliza de
  lado si no caben) con nombre y viajes/h (o cuándo abre); en azul las que
  tienen clientes ahora, y la tuya rellena cuando conduces (sirven para
  elegir zona a mano). Las cerradas, en un último chip discontinuo
  (`zona-cerradas`, «2 cerradas · Qué las abre ›»); tocarlo saca un aviso
  con la mejora que abre cada una (`textoZonasCerradas()`). Antes eran una
  línea debajo, que con 5 taxis quedaba tapada por el menú.
- El taxímetro (132 px, maqueta calle.html) debe verse entero en el móvil
  sin scroll: piloto y tarifa a la izquierda y un display de LED con la
  letra DSEG7 (sin coma ni €: `textoLed()` da «1234.56» y el € va aparte;
  con más de 4 cifras se encoge). Encima de las cifras, la etiqueta y una
  segunda línea con el estado (no hay pie). Tiene tres modos
  que cambian solos (`modoTaximetro()`; el tercero, **libranza**, arriba): **conductor** si conduces y es tu
  turno (o aún no tienes conductores), y es el botón de buscar cliente;
  **flota** el resto del tiempo: piloto «FLOTA» (amarillo), el display suma
  `caja.hoy.ingresos` (sube con cada cobro de cualquier taxi), la segunda
  línea resume «N ocupados · N libres · N parados», el cuadro de la tarifa
  enseña la hora de tu turno, y tocarlo abre el desglose de la caja de hoy. Los importes flotantes salen
  por taxi (diferencia de `facturadoJornada`) con el nombre del conductor.
- «Tus taxis hoy» (`seccionTaxis`): una fila de 44 px por taxi con retrato
  (los conductores, con su rareza y su nivel como en Conductores:
  `htmlCirculos()` en pequeño), nombre, licencia y zona («15288-L ·
  Centro»; si no cabe, se corta solo la zona), chip de estado (`ui-chip`: Ocupado, Libre, Libranza, De baja o el
  motivo de la parada en ámbar), barra
  proporcional al que más lleva y lo facturado en la jornada. Las filas se
  crean una vez y en cada fotograma solo se rellenan y recolocan (FLIP);
  destellan al cobrar y llevan a su licencia en Conductores. Más de 6 taxis:
  «Ver los N restantes». Los datos salen de `taxisDeLaFlota()`.
- Taxis parados: la simulación guarda `motivoParada` ('pinchazo',
  'vomito', 'lluvia', 'descanso') junto a `paradoHasta`, solo para enseñarlo.
- Cansancio (Iván, 23-11-2026; `config.cansancio`): cada turno guarda
  `cansancio` (energía, de 0 a `maximo`) y `cansancioTurno`
  (`claveTurnoCansancio()`: al cambiar de turno, la barra está llena; no
  hizo falta subir la versión del guardado). `cansarse()` la gasta al
  terminar cada carrera o tramo en vacío (`gastoCansancio()`: espera, por
  minuto de juego buscando o en cola, y viaje con pasajero) y, a 0, para
  `descansoMinutos` de juego con `motivoParada` 'descanso'. `energia()`
  (solo lectura) la da; en la ficha, `htmlEnergia()`, al día en
  `actualizar` (`data-energia`). Tu turno usa la misma barra en
  `estado.jugador` (`cansarse()` desde `terminarCarrera()`); el taxímetro
  enseña «Energía N % · Toca para buscar» y «Descansando hasta…».
- Azucarillo (Iván, 18-11-2026; defecto opuesto de Anfibio): efecto sí/no
  `paraConLluvia`. `pararPorLluvia()` (al empezar las carreras de
  conductores) deja parado hasta que escampa al que no lleva carrera, y el
  final de la lluvia es un punto de parada de `avanzar()` para que vuelva
  enseguida. En sus stats, la de la lluvia sale como «No trabaja».
  `reforzar()` deja tal cual los efectos que no son números.
- Sin progreso fuera (Iván, 22-11-2026): la partida solo avanza con el
  juego abierto y a la vista. `main.js` ya no llama a `progresoSinConexion()`
  al cargar; `tic()` no avanza con `document.hidden` y cada vuelta avanza
  como mucho `MAX_SEGUNDOS_POR_VUELTA` (1 s), para que una pestaña dormida
  no recupere el tiempo al volver. Se borró el código que lo hacía
  (`progresoSinConexion()`, el modo `agregado` y `sinPausa` de `avanzar()`,
  `config.sinConexion` y `estado.pesetasFuera`; versión 32 del guardado).

## Valores PROVISIONALES (falta el dato real)

Ahora mismo ninguno: Iván confirmó el 13 de noviembre de 2026 combustible,
consumo, cuota de autónomo (535 €/mes), seguro, emisora y porcentaje del
conductor (marcados «Dato de Iván»). Licencia (2.500 €, desde el 18-11-2026) y coche (1.500 €, ×1,10 por coche desde el 21-11-2026) son valores de juego
fijados por Iván, no precios reales. Si aparece un valor sin fuente, se marca
`PROVISIONAL` y se apunta aquí.

## Pruebas

- `node tests/simulacion.test.js` prueba la lógica sin navegador. Debe pasar
  antes de cada commit.
- Probar en el navegador abriendo `index.html`, o con un servidor local
  cualquiera sobre la carpeta (mismo resultado).
- `node tests/progresion.js [semillas] [minutos]` no es una prueba: un bot
  juega varias partidas con cuatro perfiles de compra y da cómo va a los
  30/60/90/120/150 minutos y cuándo llega cada hito (unos 25 s). Sirve para
  medir cambios de equilibrio; el último informe está en
  `docs/analisis-progresion.md`.
- `node tests/objetos.js [semillas] [jornadas]` tampoco es una prueba: mide
  cuánto deja cada objeto por conductor y jornada (sin mejoras y con
  propinas y otras mejoras). Informe en `docs/analisis-objetos.md`.

## Forma de trabajar

- Pasos pequeños, probables en el navegador, con un commit al terminar cada uno.
- Mantener este archivo al día cuando cambien las convenciones.
