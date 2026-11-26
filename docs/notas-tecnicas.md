# Libre · notas técnicas de cada sistema

Detalle de cómo está hecho cada sistema del juego: funciones, campos del
estado, versiones del guardado y decisiones de Iván con su fecha. Antes,
dentro de `CLAUDE.md` («Modelo de juego»); desde el 26-11-2026 va aquí para
que `CLAUDE.md` quede en las reglas y el mapa de archivos. Se mantiene al
día igual: si cambia un sistema, se cambia su apartado.

Las funciones de pantalla (`html…()`, `seccion…()`) están repartidas en
`js/ui-*.js` (ver el mapa de archivos en `CLAUDE.md`); el texto de aquí las
nombra sin decir en qué archivo están: búscalas con grep.


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
- Caras ilustradas (Iván, 26-11-2026; versión 39 del guardado):
  `config.conductores.caras` (`carpeta`, bancos `h` y `m` de ids; archivos
  en `imagenes/caras/<id>.webp`, recortados de hojas de 3 × 3) y `sexo` en
  cada personaje. Cada candidato lleva `cara` (`sortearCara()`: de su sexo,
  sin repetir las de la flota, la reserva ni los otros candidatos) y
  `nuevoConductor()` la copia. Para dibujar, siempre `Libre.sim.caraDe(t)`
  (la cara; en un ÚNICO, su retrato; sin cara, el personaje por piezas) con
  `Libre.retratos.svg()`, que da `<img class="retrato-cara">`. Los avisos
  llevan `retrato: caraDe(t)`. La migración 38 → 39 da cara
  (`asignarCara()`) a conductores, candidatos y despedidos.
- Personajes (`config.conductores.personajes`, 35 desde el 26-11-2026: Daniela pasó a ser Fátima y entraron Ionuț, Mamadou y Mei): el
  índice es el retrato que guarda cada conductor, así que los nuevos van
  siempre al final. Piezas en `js/retratos.js`: además de cara, pelo, gafas
  y barba, `gafas: 'sol'`, `gorra` (color de ropa 1–6), `cuello`
  ('pajarita' o 'corbata', que pone camisa y corbata) y `pendientes`;
  colores en `--retrato-*`.
- Iconos de objetos: dibujos SVG en `iconos/` (del paquete de
  diseño, con sus propios colores), con `<img>` desde `icono()`. Se llaman
  como el objeto salvo los de `ARCHIVO_ICONO` (escaner → radio, paconi →
  planta, alfombrillas → alfombrilla, bolsaVomito → bolsa; con extensión,
  una imagen: colines → `colines.webp`, hecho con IA y recortado del verde,
  192 px). Los
  de turnos y rasgos siguen siendo trazos en `ICONOS`.
- Experiencia (`turno.xp`): cada carrera terminada de un conductor da
  `config.conductores.niveles.porCarrera`; `nivelConductor()` sale de la
  tabla `niveles.experiencia` (10 niveles) y cada nivel acorta la espera.
  También se guardan `carreras` y `facturado` desde que lo contrataste.
  Subir de nivel avisa con su retrato (evento 'nivel', no va al ticket).
  Para probar:
  `Libre.darExperiencia('Laura', 100)` en la consola (y dinero:
  `Libre.darDinero(50000)`).
- Objetos de conductor (`config.objetos`, 41 con categoría de
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
- Filtros del Almacén (Iván, 26-11-2026; `ui-almacen.js`): `ui.filtroCategoria`
  y `ui.filtroStat`, guardados en `localStorage` (`libre-filtro-almacen`),
  aparte de la partida. `statsQueMejora(o)` traduce los efectos a la stat
  que mejoran (`STAT_DE_EFECTO`: espera de día/noche → espera, `sinImpagos`,
  `rueda` y `bolsa` → la suya) con `ui.MAS_ES_MEJOR`; `TEXTO_FILTRO` da el
  texto y el orden del desplegable (solo las que mejora algún objeto).
  Chips `data-filtro-categoria`, desplegable `data-filtro-stat`.
- Combinar solo (Iván, 26-11-2026; versión 40 del guardado):
  `estado.ajustes.combinarHasta` (null o la categoría más alta que se
  fabrica sola; en `ajustes`, así `empezarDeCero()` lo conserva).
  `combinarAutomatico(estado, resumen)` lo hace con `combinarObjetos()` y
  `elegidos` (uno cada vez del que más copias tiene), de la categoría más
  baja a la más alta, sin tocar `objetosProtegidos()` (las `sinergias` de
  los ÚNICOS en la flota o la reserva); deja eventos 'combinado' (aviso con
  la etiqueta de su categoría). Se llama tras el `guardarObjeto()` de
  `hallazgo()` y de los eventos de clientes, y desde
  `cambiarCombinarHasta()` (acción del desplegable `#combinar-hasta`, al pie
  del Almacén, `htmlCombinarSolo()`). Quitar un objeto a un conductor o
  despedirlo no lo dispara.
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
  Con menos de `config.licenciasParaRestoDeRama` (2) licencias, solo la
  primera de cada rama: `faltaParaMejora()` devuelve `{ licencias }` para
  las demás (Iván, 25-11-2026; las pruebas la apagan y la suya la enciende).
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
  Tu incógnito (`incognitoTu`; versión 28; desde el 24-11-2026, mejora de
  tu personaje, versión 34):
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
  nombre va en `#empresa`, debajo del logo (`.cabecera-marca`, en columna en
  Calle y en fila en las demás pestañas, con la cabecera compacta).
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
- Estadísticas (`seccionEstadisticas`, Iván 18-11-2026): ocho cifras
  (`estado.totales`, con `totales.km`, y `estado.mejorDia`; desde el
  26-11-2026, versión 42, también `vomitos`, `sinPagar`, `hallazgos` y
  `devueltos`, que suma `incidencia()` según su tipo y `hallazgo()`), facturación por día (barras en
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
  acción tuya (`mostrarMensaje()` directo) sale siempre. Mientras se ve,
  `mostrarMensaje()` pone `--hueco-aviso` (su alto + 12 px) en el `body` y
  `main` lo suma a su relleno de abajo, para llegar a lo que tapa.
- Ajustes y partida no es una pestaña: el engranaje de la cabecera abre una
  hoja (`seccionPartida`, vista 'siempre'; se cierra con ×, el fondo o
  Escape). Exportar copia el texto (portapapeles o, si no hay, selección y
  `execCommand`); importar y borrar se confirman en la propia hoja
  (`confirmarPartida`, sin `confirm()`, que algunos navegadores del móvil
  bloquean) y el texto pegado vive en `textoPartida`, así que redibujar la
  hoja no lo borra. `Libre.guardado.limpiarTexto()` quita lo que no es
  base64 (espacios duros, invisibles, comillas, saltos) antes de importar
  (Iván, 19-11-2026: una importación falló). Exportar comprime (Iván,
  23-11-2026): `PREFIJO_COMPRIMIDO` ('LIBRE2') + base64 del JSON con
  `fflate.deflateSync`; `importar()` acepta ese formato y el de antes (base64
  del JSON, empieza por «eyJ»). Al final, el panel plegado «Actualizaciones» (`htmlActualizaciones()`,
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
  luna y estrellas, edificios ilustrados con IA (Iván, 26-11-2026:
  `edificios()`, dos `<image>`, `imagenes/calle-dia.webp` y
  `calle-noche.webp`, 1950 × 130 a doble densidad, recortadas del cielo
  verde de las imágenes de Iván y alargadas a los lados con sus casas; la
  de noche, `.esc-edificios-noche`, entra con un fundido; antes, siluetas
  dibujadas con `tramo()`, `tramoCentro()` y `arbol()`, ya borradas),
  grano por encima (`.cabecera-escena::after`, ruido SVG), farolas en la acera de detrás (`farolas()`,
  cada `SEP_FAROLA`; de noche `.esc-farolas-luz` con halo y luz en el
  suelo, `--esc-farola-*`; Iván, 22-11-2026), gente paseando (`personas()`, `PERSONAS`: desde
  el 26-11-2026, ilustraciones con IA, `imagenes/gente-<id>-1.webp` y
  `-2.webp`, dos posturas por persona que se turnan con `pose-a`/`pose-b`
  en `steps(1)`; con `prefers-reduced-motion`, quieta en la primera; una
  va con su perro), repartidores en bici (`REPARTIDORES`,
  `repartidor()`, `BICI`: desde el 26-11-2026, ilustración con IA, la misma
  bici con mochila naranja o verde recoloreada, `imagenes/bici-*.webp`, sin
  radios: los dibuja `repartidor()` detrás, girando, `RADIOS_BICI`; el
  nombre de la mochila, encima; Uber Eats
  verde y Just Eat naranja, en sentidos contrarios; el que vuelve va en
  espejo salvo el texto), un
  autobús articulado de la EMT (`autobus()`: desde el 26-11-2026, ilustración
  con IA, `imagenes/autobus.webp`, `BUS`, con sus tres llantas recortadas
  girando, `RUEDAS_BUS`, y los letreros LED de la línea 34 dibujados encima,
  `--bus-letrero`/`--bus-led`), nubes (`NUBES`, tres `<img>`
  `imagenes/nube-N.webp` desde el 26-11-2026; con tormenta, `filter`),
  un taxi que pasa (desde el 26-11-2026, ilustración con IA,
  `.esc-taxi-img`; en cada pasada, uno de los modelos de tu flota:
  `ponerModeloTaxi()` en `animationiteration` del propio taxi (`ev.target`:
  las ruedas también lo lanzan y sube), otro modelo que el de antes si hay,
  que llama a `vestirTaxi()`:
  pone su `imagen` y encima sus `ruedas` (recortes `coche-<id>-rueda-N.webp`
  con su `caja` en fracciones del dibujo y el `aspecto` del modelo) dentro
  de `.an-rueda`, para que giren; de noche, `.esc-brillo`: haz del faro
  con degradado lineal que sale del dibujo, `.esc-taxi` con
  `overflow: visible`) y lluvia (`lluvia()`: otra capa `svg.esc-capa-lluvia`,
  la última de `montar()`, para que caiga por delante de todo; Iván,
  26-11-2026). Carriles (se circula por la
  derecha): taxi y bici de Uber Eats, hacia la derecha, por el de delante;
  autobús y bici de Just Eat, hacia la izquierda, por el de detrás. El orden
  en `montar()` decide quién tapa a quién; con tormenta (clase `.tormenta`, Iván
  18-11-2026) el cielo se oscurece sin sol ni luna y hay relámpagos con
  rayo (un destello doble cada 7 s), lluvia inclinada, viento y hojas. Se dibuja a escala 1 pegada abajo (la cabecera
  compacta enseña solo la calle). Es un módulo aparte con
  `montar(contenedor)` y `dibujar(contenedor, estado)`, que deja
  `contenedor.dataset.momento` ('dia' o 'noche'); para cambiarla por otra
  vista (un mapa) basta otro módulo con esas dos funciones. No enseña datos
  de la partida. Animaciones solo CSS (taxi 16 s, nubes 40/55/70 s, sol 5 s,
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
  `actualizar` (`data-energia`). Rasgos y objetos (paso 3): factores
  `cansancio` (lo que gasta) y `descanso` (lo que dura), en
  `VALORES_CONDUCTOR`, con topes; las mejoras, en `modificadores()` (también
  para ti). `factoresCansancio()` y `minutosDescanso()`; en sus stats,
  'cansancio' y 'descanso'. Mejoras (paso 4): «Climatizador bizona» (final
  de Vehículo) y «Máquina de café en la cochera» (`cafeCochera`, entre el
  Curso de zonas y RRHH, que ahora la pide). Tu turno usa la misma barra en
  `estado.jugador` (`cansarse()` desde `terminarCarrera()`); el taxímetro
  enseña «Energía N % · Toca para buscar» y «Descansando hasta…».
- Racha (idea 21, Iván 23-11-2026; a prueba, `config.racha`): solo tu turno.
  `estado.jugador.racha = { n, turno, desde, hasta }`; `buscarCliente()` llama a
  `encadenarRacha()` (n + 1 si `rachaViva()`, si no 0; tope `topeRacha()`)
  y sube `carrera.importe` un `porCarrera` × n; `terminarCarrera()` abre
  la ventana (`abrirVentanaRacha()`: `segundosVentana()` reales, de `reaccion.inicial` a `reaccion.final`
  según n / tope, en minutos
  de juego) o la corta si toca descansar; el pesetas la corta. Al cambiar
  de turno (`claveTurnoCansancio`) se pierde sola. Para mejoras y objetos
  del personaje: `rachaMaximo` y `rachaReaccion` en `modificadores()`.
  Desde el 24-11-2026 la da la mejora del personaje `racha`
  (`modificadoresPersonaje().racha`); `rachaLarga` y `reflejos` suman a
  `rachaMaximo` y `rachaReaccion`; las dos piden también `fondoFisico`
  (`requiere` puede ser una lista en las mejoras del personaje) y cada
  nivel de Racha larga pide su nivel de Fondo físico (`requiere: { id:
  nivel }` en el nivel, lo mira `faltaParaMejoraPersonaje()`). En el taxímetro, delante
  de la etiqueta: «RACHA ×1,04 · …» (`rachaActual()`, que da también `nivel`, n / tope,
  y `ventana`, lo que queda de 1 a 0). Recreativa: `.taximetro.racha-viva`
  con `--racha` (brillo de marco y cifras, `--racha-brillo`), `#racha-luces`
  (10 luces bajo la tarifa), `#carrera-barra.racha-ventana` (raya que se
  vacía) y `.racha-max` (parpadeo en el tope). Sin cambio de
  versión del guardado (campo nuevo opcional).
- Tu personaje (Iván, 24-11-2026; idea 12; versión 33 del guardado):
  `estado.personaje = { xp }`. `ganarExperienciaPersonaje(estado, resumen,
  puntos)` suma `config.personaje.experiencia` (tuCarrera 4 en
  `terminarCarrera()`, carreraConductor 1 en `terminarCarreraConductor()`,
  legendarioVendido 25 en `venderObjeto()`; 1 hasta el 26-11-2026) y, al subir, deja el evento
  'nivelPersonaje' (aviso y sonido 'nivel'). `nivelPersonaje()` (solo
  lectura: nivel, xp, desde, hasta, progreso) con la curva de
  `experienciaParaNivel(n)` = base × (factor^n − 1) / (factor − 1). Hoja
  del personaje (paso 2): botón `#abrir-personaje` (silueta, a la izquierda
  del engranaje, insignia `#nivel-personaje` al día en `dibujar()`) que abre
  `seccionPersonaje` (`personajeAbierto`, vista 'siempre'; se cierra con ×,
  el fondo o Escape; barra y cifra al día en `actualizar`). La marca de la
  cabecera deja 124 px a la derecha para los dos botones. Mejoras del
  personaje (paso 3; versión 34): `config.personaje.mejoras` (grupo,
  requiere y `niveles` con `coste` en puntos y efecto total; 300 puntos
  entre todas, hay una prueba) y `estado.personaje = { xp, puntos,
  mejoras: { id: nivel } }`. `modificadoresPersonaje()` las suma (racha,
  incognitoTu, rachaMaximo, rachaReaccion, cansancio y espera solo tuyos en
  `factoresCansancio()` y `buscarCliente()`, experiencia, y las de arranque:
  dineroInicial, cocheNuevo, candidatosMinimo, que aplica
  `aplicarArranque()`; gamas: ver «Gamas de coche»). `faltaParaMejoraPersonaje()`
  y `costeMejoraPersonaje()`. En la hoja, `htmlMejorasPersonaje()` (solo
  lectura). `sortearCategoria()` reparte sobre el total de los pesos (con
  `sortearCandidatos(estado, minimo)` no suman 1). Para probar:
  `Libre.darMejoraPersonaje('racha')` en la consola. Prestigio (paso 4):
  `puntosPrestigio()` (`puntosDeNivel(nivel)` = `puntosPorNivel` × 1 + 2 + …
  + N, más `personaje.puntos` guardados; Iván 24-11-2026, tras medir: con
  1 punto por nivel compensaba reiniciar siempre en el 3),
  `faltaParaReiniciar()` (desde `nivelPrestigio`, 3),
  `probarComprasPersonaje(estado, compras)` (lista de ids; repetido, otro
  nivel: requisitos y puntos) y `empezarDeCero(estado, compras, ahoraMs)`,
  que devuelve `{ ok, mensaje, nuevo }`: partida nueva con las mejoras del
  personaje, los puntos sobrantes, los ajustes y `personaje.reinicios`, con
  `aplicarArranque()`. `main.js` la cambia (`partida.empezarDeCero`). En la
  hoja: `htmlBloquePrestigio()` y, con `prestigio = { compras, confirmar }`,
  `htmlHojaPrestigio()` (`data-pj-comprar`/`quitar`/`seguir`/`volver`/
  `reiniciar`; el pie, `.pj-prestigio-pie`, fijo abajo). Aspecto y nombre
  (Iván, 24-11-2026; versión 35): `estado.personaje.aspecto` (piezas de
  `config.personaje.aspecto.opciones`, las mismas que los retratos) y
  `nombre` (null = «Tú»); `cambiarAspecto(estado, campo, valor)`,
  `renombrarPersonaje()`, `aspectoPersonaje()` y `nombrePersonaje()`; se
  conservan en `empezarDeCero()`. `Libre.retratos.svg()` acepta también un
  objeto de rasgos. Desde el 26-11-2026 (Iván) tu cara es un retrato fijo
  hecho con IA (`config.personaje.imagen`, `htmlImgTu()`): el editor
  (`htmlHojaAspecto()`) solo cambia el nombre; `aspecto` y
  `cambiarAspecto()` siguen en la simulación, sin uso. En pantalla: `htmlCaraTu()` en la cabecera
  (`#cara-personaje`), «Tus taxis hoy» (`tu`, `aspecto` en
  `taxisDeLaFlota()`), Conductores y Estadísticas. Hoja:
  `htmlCabeceraPersonaje()`, pestañas (`pjGrupo`, `data-pj-grupo`) y
  tarjetas con `ICONOS_PERSONAJE` (una mejora nueva necesita el suyo);
  editor `htmlHojaAspecto()` (`editandoAspecto`, `data-pj-aspecto`; el
  nombre se escribe en `nombreEditado` y se guarda al cerrar: guardarlo al
  salir del campo redibujaba la hoja bajo el dedo).
- Gamas de coche (idea 23, Iván 24-11-2026): `config.vehiculos.modelos`
  (turismo = Toyota Corolla, tesla, mercedes) con `precio`, consumo
  (`consumoLitros100Km`, o `electrico` + `kwh100Km` × `combustible.precioKwh`)
  y `efecto` (averia, cansancio, propinaProb, propinaImporte, sinPagar,
  averiaCoste, pinchazoCoste: multiplican aparte, sobre los topes del
  conductor; `esperaZonas` en `planearCarrera()`). `gamasDisponibles()`
  (Corolla + las de `modificadoresPersonaje().gamas`), `comprarVehiculo(estado,
  licenciaId, modeloId)`, `precioCoche(estado, sustituye, modeloId)`,
  `modeloCoche()`, `efectoCoche(lic)` y `efectoCocheDe(estado, quien)`.
  Cada modelo puede llevar `imagen` (ilustración de lado, `imagenes/coche-<id>.webp`):
  la usan la cabecera, la miniatura junto a los km (`htmlCocheMini()`) y
  la hoja de elegir coche; sin ella, el icono de trazo.
  Híbridos y GLP usan `consumoCombustion` (no en eléctricos; `gastar()` lo
  apunta aparte). `carrera.vehiculo` guarda el modelo. En `statsConductor()`,
  fuente 'coche'. En Conductores, `botonComprarCoche()` y, con más de una
  gama, la hoja `htmlHojaElegirCoche()` (`eligiendoCoche`,
  `data-elegir-coche`).
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
- Historia (Iván, 25-11-2026; versión 36 del guardado): `config.historia.intro`
  (escenas con `imagen`, `titulo` y `texto`; ilustraciones de Iván en
  `imagenes/`, ver su LEEME). `estado.historia.introVista`: mientras sea
  false, `avanzar()` no hace nada; `terminarIntro()` la cierra. Solo en la
  primera partida (`empezarDeCero()` la deja vista; la migración también).
  Pantalla: `seccionIntro` (`introPaso`, `data-intro-siguiente`/`saltar`/
  `empezar`; sin imagen, `.sin-imagen` con «Ilustración N»). Las pruebas
  envuelven `crearEstadoInicial()` para darla por vista (y el bot llama a
  `terminarIntro()`). Siguen los conductores ÚNICOS y los eventos de
  clientes (DISENO.md, 5.10).
- Daniela (ÚNICA #03, Iván 26-11-2026): `noConduce`, `dirige`
  (`efecto`, `porcentaje`, `sobre`), `paga` y `baja.texto` en su config.
  `noConduce(t)`; `enTurno()` da null en su turno, así que nada la cuenta
  como coche que trabaja (reparto, zonas, inicio de turno, eventos) y el
  coche se queda parado. `quienesDirigen(estado, minutos)`: las que tienen
  turno en una licencia y no están de baja; `aportesConductor(t, estado)`
  (con `estado`) añade su `efecto` a los demás (tipo 'unico', también en
  `statsConductor()`) y lo de `sobre` a Paconi (baja);
  `porcentajeConductor()` resta `porcentaje`; `ajustesUnicos()` recorta el
  ajuste de Paconi y cobra `paga` (incidencia 'paga'). Su baja (cuidar de
  Álvaro) se sortea aparte al empezar su turno en
  `sortearInicioDeTurnos()`, sin factores. En «Tus taxis hoy»,
  `taxisDeLaFlota()` la enseña con `icono` 'dirigiendo'. Su evento lleva
  `requiereSociedad` (`eventoPosible()`). Sin experiencia: no hace carreras.
- Conductores ÚNICOS (fase 2; versión 37 del guardado): `config.conductores.unicos`
  (id → nombre, `categoriaBase`, imagen, frases, soloTurno, sinIncognito,
  incompatibles, baja, ajuste, tocayos, sinergias). Un único es un conductor
  normal de `categoriaBase` con `t.unico = id` (null en los demás; también
  en los candidatos, con `retrato` = id): todo lo de siempre le vale.
  `unicoDe(t)`, `buscarUnico()`, `unicoEnFlota()`, `ofrecerUnico()` (lo pone
  el primero entre los candidatos; lo llamarán los eventos),
  `faltaParaTurnoUnico(lic, turno, t, apartar)` (turno fijo e incompatibles;
  la usan `contratarConductor()` y `moverConductor()`), `fraseUnico()`,
  `bonoTocayos()` (en `empezarCarrerasConductores()`) y `ajustesUnicos()`
  (al empezar `cerrarCaja()`, incidencia 'ajuste'). El ajuste y el plus por km
  cuentan como facturado del ÚNICO (`sumarAFacturado()`: `t.facturado` y
  `caja.hoy.porConductor`), para las estadísticas. Sin topes: `topesDe()`
  da [0, ∞]. Sinergias: aporte 'sinergia' en `aportesConductor()`. Bajas
  propias en `sortearInicioDeTurnos()` y en `statsConductor()`.
  `trabajaIncognito()` respeta `sinIncognito`. El Pelado (#02): `efecto`
  de serie (aporte tipo 'unico': pinchazo, sinImpagos; el que intenta irse
  sin pagar paga y sale el evento 'unicoFrena'), `factorImporteUnico()`
  (tocayos y sinergias con `importe`), `combustible` (factor en
  `terminarCarreraConductor()`), `caja.hoy.kmPorConductor`
  (`apuntarKmConductor()`) y, al cerrar, `plusKmUnico()` (suma `kmExtra`
  en vacío con su combustible y paga `plusKm` por km; incidencia
  'plusKm'). `dobleTurno`: `enTurno(lic, turno)` da quién conduce ese turno
  (el suyo o, si está vacío, el ÚNICO del otro); lo usan
  `cochesPorZona()`, `asignarZonasConductores()`,
  `sortearInicioDeTurnos()`, `monedasFinDeTurno()` y `taxisDeLaFlota()`;
  en Conductores, el hueco vacío enseña su cara atenuada («Doble») y sigue
  abierto para contratar. `incompatibles` son
  `{ id, nombre }` (el nombre, para el texto aunque aún no exista). En
  pantalla: `Libre.retratos.svg(id)` da su imagen con marco granate
  (`.retrato-unico`); `rarezaDe(t)` da la insignia 'U' (`--rareza-unico`,
  `--tinte-unico`) y `htmlUnico()` sustituye a los rasgos en ficha y
  candidatos (descripción, habilidades, debilidades y sinergias; sin frase desde el 26-11-2026). Consola:
  `Libre.forzarUnico('paconi')`.
- Eventos de clientes (fase 3, Iván 25-11-2026; versión 38 del guardado):
  `config.historia.eventos` (`activos`, `cadaJornadas`, `lista` de eventos
  con `momento`, `unico` y `opciones` → `resultados` con `prob` y efectos
  `dinero`, `coste`, `parado`, `xp`, `objeto`, `unico`). Estado en
  `estado.historia.eventos` (`proximo` minuto, `pendiente`, `resultado`,
  `vistos`, `ultimo`, `forzado`) y `estado.historia.agenda` (ÚNICOS que
  `sortearCandidatos()` vuelve a ofrecer; `nuevoConductor()` los quita).
  `avanzar()` no hace nada con un evento pendiente (`eventoPendiente()`),
  para en `proximo` y llama a `dispararEvento()` (tras el cierre de caja;
  `quienesParaEvento()`, `eventoPosible()`); sin nadie trabajando,
  reintenta en `reintentoMinutos`. `elegirOpcionEvento(estado, i)` sortea y
  aplica (incidencia 'cliente', `paradoHasta` con `motivoParada` 'evento',
  experiencia, `guardarObjeto()`, agenda y `descuento` en el candidato, que
  lee `precioCandidato()`) y devuelve los eventos de la partida;
  `cerrarEventoCliente()` sigue. Pantalla: `seccionEvento` (vista
  'siempre', `data-evento-opcion`, `data-evento-seguir`), la misma hoja que
  la intro. Consola: `Libre.forzarEventoCliente('paconi')`. Las pruebas los
  apagan (`activos = false`; las suyas los encienden) y el bot de
  progresión elige al azar tras `LEER_EVENTO` segundos.
- Azar con semilla también en tu turno (25-11-2026): `buscarCliente()` y
  `crearEstadoInicial()` usan `generador(estado)` si no les pasan un
  generador; `Math.random` solo queda para la semilla inicial y la
  migración 24 (km del coche de partidas antiguas).

- El grupo de la flota (chat; Iván, 26-11-2026; versión 41 del guardado):
  `estado.chat` (null hasta `montarSociedad()`, que lo crea con
  `chatNuevo()`: `{ iniciado, mensajes, noLeidos, recientes }`). Cada
  mensaje: `{ dia, de ('tu', un ÚNICO o el id del conductor), nombre, cara,
  texto, foto }`; como mucho `config.chat.maxMensajes`. `pistaChat(estado,
  tipo, t)` apunta en `caja.hoy.chat` lo que pasa (lo llama `incidencia()`
  con su tipo, 'tormenta' si la lluvia lo es, y además el nivel, un
  LEGENDARIO encontrado, coche y licencia nuevos y conductor nuevo); al
  cerrar la caja, `chatAlCierre()` (tras `registrarDia()`, con 'record' y
  'negativo') escribe de `porCierre.min` a `max` conversaciones
  (`escribirConversacion()`: c1 es quien lo vivió; los ÚNICOS solo si
  tienen turno, `cumpleRequisitos()`; sin repetir las `recientes`).
  `enviarPrimerMensaje()` (el texto propuesto, `primerMensajeChat()`) lo
  estrena; antes no se escribe nada. `leerChat()`. Daniela no hace de c1
  ni c2 (`conductoresDelChat()`): habla con sus frases. Pantalla:
  `ui-chat.js` (`seccionChat`, `chatAbierto`, `borradorChat`,
  `dibujarBotonChat()`); botón `#abrir-chat` con `#chat-sin-leer`, y la
  cabecera `.con-chat` deja sitio a tres botones.
