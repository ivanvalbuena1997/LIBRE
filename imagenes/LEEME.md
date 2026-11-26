# Ilustraciones

Ilustraciones hechas por Iván con IA (no se dibujan en el código). Formato
vertical 2:3 (1024 × 1536 o similar), en WebP o JPG de unos 200 KB como
mucho. Lo importante, en el centro y la mitad de arriba: la parte de abajo
la tapa el texto.

- `intro-1.webp`, `intro-2.webp`, `intro-3.webp`: las tres escenas de la
  introducción (`config.historia.intro`), 848 × 1264, de 41 a 63 KB. Si
  falta una, el juego enseña un fondo azul provisional con «Ilustración N».
- `unico-<id>.webp`: retrato de cada conductor ÚNICO
  (`config.conductores.unicos.<id>.imagen`), cuadrado, 256 × 256 (se ve en
  círculos de 36 a 88 px). `unico-paconi.webp`: Paconi; `unico-pelado.webp`: El Pelado.
- `caras/`: retratos ilustrados de los conductores normales (256 × 256),
  recortados de hojas de 3 × 3 que genera Iván: `h01`… hombres, `m01`…
  mujeres (`config.conductores.caras`). Para añadir más: recortarlas y
  apuntar su id en el banco de su sexo.
- `calle-dia.webp`, `calle-noche.webp`: los edificios de la cabecera
  (3900 × 260, se ven a 1950 × 130), recortados de dos ilustraciones de
  Iván con el cielo verde (se quita el verde) y alargados a los lados
  repitiendo sus casas; el Metrópolis y Cibeles, en el centro.
- `coche-turismo.webp`, `coche-tesla.webp`, `coche-mercedes.webp`: los coches de cada gama, de
  lado y mirando a la derecha (440 px de ancho), recortados del fondo verde
  de las imágenes de Iván (la luz verde del techo se respeta a mano; el
  Tesla, volteado: su imagen miraba a la izquierda). Los
  usan la cabecera, la miniatura de los km y la hoja de elegir coche
  (`config.vehiculos.modelos.<id>.imagen`). `coche-<id>-rueda-1.webp` y
  `-2.webp`: sus llantas trasera y delantera (solo la llanta, con el centro
  buscado por la simetría de los radios) recortadas en círculo, para que
  giren encima en la cabecera (`ruedas` y `aspecto` en la config).
- `autobus.webp` (800 × 189) y `autobus-rueda-1..3.webp`: el autobús
  articulado de la EMT de la cabecera, recortado del fondo verde, y sus
  tres llantas para que giren. Los letreros los pone `js/ambiente.js`.
- `bici-naranja.webp`, `bici-verde.webp` (230 px de ancho) : el repartidor de la
  cabecera, recortado de una ilustración de Iván. La verde es la misma con
  la mochila recoloreada; a las dos se les quitaron los radios, que dibuja
  `js/ambiente.js` detrás, girando (el neumático se queda). El nombre de la mochila lo pone `js/ambiente.js`.
- `gente-<id>-1.webp` y `-2.webp` (3x de 28 px de alto): la gente que
  pasea por la cabecera, en dos posturas (piernas abiertas y juntas),
  recortadas de dos hojas de Iván y alineadas por la cabeza y los pies.
- `personaje.webp`: tu retrato (256 × 256), el protagonista; lo usa
  `config.personaje.imagen` en la cabecera, «Tus taxis hoy», Conductores y
  Estadísticas.
- `evento-base.webp`: imagen base de los eventos de clientes (848 × 1264):
  el interior del Corolla visto desde el salpicadero, el protagonista al
  volante a la derecha y el copiloto vacío a la izquierda. Cada evento se
  genera a partir de ella (prompts en `docs/eventos-clientes.md`).
- `evento-<id>.webp`: la ilustración de cada evento (848 × 1264), hecha a
  partir de la base. `evento-paconi.webp`: Paconi y su hija en el 12 de
  Octubre; `evento-pelado.webp`: El Pelado en Alcorcón;
  `evento-cena.webp`: las tres de la cena de empresa;
  `evento-rivas.webp`: el de «Rivas por 20 €» en Las Ventas;
  `evento-boadilla.webp`: el control en Boadilla;
  `evento-conseguidor.webp`: el conseguidor;
  `evento-trapero.webp`: el trapero;
  `evento-ruso.webp`: el ruso y sus dos rubias;
  `evento-maletero.webp`: cinco en un coche de cuatro.
- Protagonista de referencia (para que salga igual en todas): hombre de
  unos 30 años, pelo castaño oscuro corto con tupé, mejillas sonrosadas,
  americana verde azulado oscuro sobre camisa blanca, pantalón marrón
  oscuro. Estilo: ilustración plana editorial vectorial, formas limpias,
  sombras planas, poco grano; paleta verde azulado, naranja tostado, crema
  y marrón oscuro.
