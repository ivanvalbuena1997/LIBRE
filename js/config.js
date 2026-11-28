/*
 * Libre · configuración del juego.
 *
 * TODOS los números del juego viven aquí: tarifas, reloj, zonas, vehículos,
 * costes y mejoras. La lógica (simulacion.js) los lee de Libre.config y no
 * contiene cifras propias.
 *
 * Convención de comentarios:
 *   - "Dato real": viene de DISENO.md (tarifas oficiales de Madrid 2026).
 *   - "PROVISIONAL": falta el dato real; valor inventado hasta tener fuente.
 *   - "Equilibrio": valor de juego para ajustar jugando.
 */
(function (raiz) {
  'use strict';
  var Libre = raiz.Libre = raiz.Libre || {};

  Libre.config = {
    // Sube este número cuando cambie la forma del estado guardado y añade
    // una migración en guardado.js.
    versionGuardado: 45,

    reloj: {
      // Decisión de diseño: un día de juego dura 2 minutos reales al principio.
      segundosPorDia: 100,
      // La partida empieza el lunes a las 7:00 (minutos desde medianoche).
      minutoInicial: 7 * 60,
      // La caja se cierra cada día a esta hora: la jornada va de 7:00 a 7:00.
      minutoCierreCaja: 7 * 60,
      diasSemana: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
      // Índices de diasSemana que cuentan como fin de semana (tarifa 2 todo el día).
      diasFinDeSemana: [5, 6]
    },

    tarifas: {
      // Dato real: tarifa 1 en laborables de lunes a viernes de 7:00 a 21:00;
      // tarifa 2 el resto (noches, sábados y domingos). Festivos fuera de esta versión.
      horaInicioTarifa1: 7,
      horaFinTarifa1: 21,
      // Dato real (DISENO.md): inicio de servicio, precio por km y por hora de espera.
      t1: { nombre: 'Tarifa 1', inicio: 2.55, porKm: 1.40, porHora: 27.00 },
      t2: { nombre: 'Tarifa 2', inicio: 3.20, porKm: 1.60, porHora: 29.00 },
      // Dato real: tarifas fijas del aeropuerto.
      // Tarifa 3 (Dato de Iván, 16-11-2026): salidas de Barajas a destinos fuera
      // de la M-30. 22 € de bajada de bandera que cubren los primeros 9 km; a
      // partir de ahí corre el taxímetro con la tarifa 1 o 2 que toque.
      t3: { nombre: 'Tarifa 3', inicio: 22.00, kmIncluidos: 9 },
      // Tarifa 4: entre Barajas y el interior de la M-30, sin suplementos.
      t4: { nombre: 'Tarifa 4', fija: 33.00 }
    },

    /*
     * Eventos aleatorios. Equilibrio. Hasta el 17-11-2026, sin mejoras, el
     * efecto neto de todos quedaba cerca de cero. Iván (18-11-2026): que
     * pinchazos, bajas y averías se noten (y así los objetos que los evitan
     * valgan algo): con 5 conductores B, los eventos restan ahora un 18 %
     * frente a no tenerlos (antes un 8 %).
     *   probCarrera  probabilidad en cada carrera terminada (tuya o de conductor)
     *   probTurno    probabilidad al empezar cada turno de cada taxi
     *   probJornada  probabilidad una vez por jornada (general)
     * nombre: cómo sale en el ticket.
     */
    eventos: {
      propina: {
        nombre: 'Propinas', probCarrera: 0.15,
        porcentajeMin: 0.05, porcentajeMax: 0.25    // sobre el importe de la carrera
      },
      sinPagar: { nombre: 'Sin pagar', probCarrera: 0.02 },
      // Vómitos (Iván): mucho más de noche y, sobre todo, a la salida del ocio.
      // probCarrera es de día; probNoche, de horaNocheInicio a horaNocheFin;
      // probPorZona manda sobre las dos. Efecto: limpieza y horasParado sin trabajar.
      vomito: {
        nombre: 'Vómitos', probCarrera: 0.0008, probNoche: 0.01, probPorZona: { ocio: 0.03 },
        horaNocheInicio: 21, horaNocheFin: 7, costeMin: 50, costeMax: 90, horasParado: 1
      },
      objeto: {
        nombre: 'Objetos devueltos', probCarrera: 0.01,
        // De menos a más valor; «peso» es cuánto sale cada uno (menos, más raro).
        objetos: [
          { nombre: 'un paraguas', recompensa: 5, peso: 30 },
          { nombre: 'una bufanda', recompensa: 8, peso: 22 },
          { nombre: 'unas gafas de sol', recompensa: 12, peso: 16 },
          { nombre: 'un libro dedicado', recompensa: 15, peso: 12 },
          { nombre: 'una cartera con el DNI', recompensa: 25, peso: 8 },
          { nombre: 'las llaves de casa', recompensa: 30, peso: 6 },
          { nombre: 'un móvil', recompensa: 50, peso: 3 },
          { nombre: 'una tablet', recompensa: 70, peso: 1.6 },
          { nombre: 'un portátil del trabajo', recompensa: 120, peso: 0.9 },
          { nombre: 'un maletín con documentos', recompensa: 300, peso: 0.5 }
        ]
      },
      pinchazo: { nombre: 'Pinchazos', probTurno: 0.04, coste: 120 },
      // Modo incógnito (Iván, 20-11-2026): un conductor que sale en el día de
      // libranza de su licencia puede ser pillado por un «pesetas» (otro
      // taxista) que se chiva o lo graba cargando: multa y deja de trabajar
      // el resto del turno. Se sortea al empezar cada turno de incógnito.
      // Iván, 20-11-2026: «no te suelen pillar, cada uno va a lo suyo»: 2 %
      // por turno y 2.000 € de multa. Medido (5 licencias, 10 de nivel 10):
      // una multa cada ~20 jornadas y el incógnito deja un +27 % (sin riesgo,
      // +35 %).
      pesetas: {
        nombre: 'Multas por cargar en libranza', probTurno: 0.02, multa: 2000,
        // Tu turno de incógnito (Iván, 20-11-2026): no te pilla de golpe; un
        // pesetas te vigila `minutosVigila` minutos de juego (~12 s reales
        // con el día normal, ~20 s con la Jornada larga al máximo) y te multa
        // si empiezas una carrera mientras mira. Lo que empezaste antes no
        // cuenta, ni lo que tocas en el primer `graciaSegundos` (real).
        tu: { probTurno: 0.05, multa: 2000, minutosVigila: 180, graciaSegundos: 1 }
      },
      baja: { nombre: 'Bajas', probTurno: 0.02, jornadasMin: 1, jornadasMax: 5 },
      averia: {
        nombre: 'Averías', probTurno: 0.003, jornadasMin: 3, jornadasMax: 8,
        costeMin: 150, costeMax: 400,
        cochesMinimos: 2,          // con menos coches no hay averías
        // Iván, 19-11-2026: con los km del coche hay más averías. La
        // probabilidad se multiplica por 1 + km / kmDoble (×2 a los 200.000
        // km), como mucho por factorKmMax. Vale también para tu coche.
        kmDoble: 200000,
        factorKmMax: 2.5
      },
      // Avería definitiva (idea 7, Iván, 19-11-2026): el coche va al desguace
      // y la licencia se queda sin coche. Sin riesgo hasta kmDesde; luego la
      // probabilidad por turno sube como el cuadrado de lo andado hasta
      // probMax en kmMax. Equilibrio: con ~630 km por jornada trabajada, el
      // coche inicial (~92.000 km) aguanta de media ~157 jornadas (~4,4 h de
      // juego) y uno nuevo ~300. Nunca deja la flota sin coche en marcha si
      // no te llega para comprar otro.
      // Fin del alquiler de un coche (solo el aviso y la línea del ticket).
      alquiler: { nombre: 'Fin de alquiler' },
      sociedad: { nombre: 'Constitución de la SL' },
      // El extra de un ÚNICO al cerrar la caja (Paconi).
      ajuste: { nombre: 'Ajuste de periodos anteriores' },
      // El plus por km de un ÚNICO al cerrar la caja (El Pelado).
      plusKm: { nombre: 'Plus de kilómetros' },
      // Lo que cobra un ÚNICO que no conduce al cerrar la caja (Daniela).
      paga: { nombre: 'Paga y chuches' },
      // Lo que dejan (o cuestan) los eventos de clientes (config.historia.eventos).
      cliente: { nombre: 'Eventos de clientes' },
      rotura: {
        nombre: 'Averías definitivas', kmDesde: 130000, kmMax: 230000, probMax: 0.03,
        chatarra: 50               // € que te dan en el desguace
      },
      // Lluvia (Iván, 18-11-2026): chubascos y tormentas largas (Iván: un 35 %
      // de tormentas). Unas 0,47 horas de lluvia por jornada de media.
      // Cada tipo: peso (lo que sale) y duración en horas.
      lluvia: {
        nombre: 'Lluvia', probJornada: 0.25, factorDemanda: 2,
        tipos: {
          chubasco: { nombre: 'Chubasco', peso: 0.65, horasMin: 0.5, horasMax: 1 },
          tormenta: { nombre: 'Tormenta', peso: 0.35, horasMin: 3, horasMax: 5 }
        }
      },
      // Vómito evitado por la Bolsa para vómitos de un conductor (solo sale en el ticket).
      bolsa: { nombre: 'Bolsas usadas' },
      // Solo con la mejora «Sacudir esterillas»: monedas al final de cada turno.
      esterillas: { nombre: 'Monedas de las esterillas' },
      // Con la mejora «Publicidad en el taxi»: al cerrar la caja, por cada carrera.
      publicidad: { nombre: 'Publicidad' },
      // Al despedir a un conductor (sale en el ticket con los gastos).
      finiquito: { nombre: 'Finiquitos' },
      // Objetos vendidos (sale en el ticket con lo que entra).
      venta: { nombre: 'Venta de objetos' }
    },

    /*
     * Categorías (Equilibrio), de peor a mejor. Las comparten los objetos y
     * los conductores.
     *   peso           probabilidad de que salga esa categoría (suman 1),
     *                  al encontrar un objeto y en cada candidato
     *   venta          lo que te dan por vender un objeto de esa categoría
     *                  (Iván, 18-11-2026: rebajado para que equipar
     *                  compense más que vender; ver docs/analisis-objetos.md)
     *   contratar      precio de un conductor de esa categoría (Iván,
     *                  17-11-2026: el del B más lo que deja de más que un B
     *                  en 40 jornadas al principio de la partida, medido)
     *   cualidades     cuántas cualidades tiene (distintas)
     *   defectos       cuántos defectos tiene (si le tocan; distintos)
     *   probDefecto    probabilidad de que tenga defectos
     *   fuerzaCualidad / fuerzaDefecto  cuánto de su efecto aplican: con 1,4
     *                  un +30 % pasa a +42 %; con 0,85 un +10 % pasa a +8,5 %
     *   hallazgo       factor sobre la probabilidad de encontrar objetos
     *   aperturaTope   cuánto abre los topes de sus stats (ver topesAbiertos)
     *   esperaBase     factor de serie sobre su espera, le toquen los rasgos
     *                  que le toquen (Iván, 17-11-2026: que la categoría se
     *                  note más que el nivel)
     */
    categorias: [
      { id: 'B', nombre: 'B', peso: 0.65, venta: 20, contratar: 400,
        cualidades: 1, defectos: 2, probDefecto: 1, fuerzaCualidad: 1, fuerzaDefecto: 1, hallazgo: 1, aperturaTope: 0, esperaBase: 1 },
      { id: 'A', nombre: 'A', peso: 0.25, venta: 50, contratar: 850,
        cualidades: 1, defectos: 1, probDefecto: 1, fuerzaCualidad: 1.2, fuerzaDefecto: 0.85, hallazgo: 1.15, aperturaTope: 0.1, esperaBase: 0.95 },
      { id: 'S', nombre: 'S', peso: 0.075, venta: 150, contratar: 1200,
        cualidades: 1, defectos: 1, probDefecto: 0.5, fuerzaCualidad: 1.4, fuerzaDefecto: 0.7, hallazgo: 1.3, aperturaTope: 0.2, esperaBase: 0.88 },
      { id: 'S+', nombre: 'S+', peso: 0.02, venta: 400, contratar: 1800,
        cualidades: 1, defectos: 0, probDefecto: 0, fuerzaCualidad: 1.6, fuerzaDefecto: 0, hallazgo: 1.5, aperturaTope: 0.3, esperaBase: 0.75 },
      { id: 'L', nombre: 'LEGENDARIO', peso: 0.005, venta: 1200, contratar: 3350,
        cualidades: 2, defectos: 0, probDefecto: 0, fuerzaCualidad: 1.8, fuerzaDefecto: 0, hallazgo: 2, aperturaTope: 0.75, esperaBase: 0.45 }
    ],

    /*
     * Objetos para los conductores (Equilibrio). No se compran: los encuentran
     * los conductores al terminar una carrera (`probHallazgo`; la categoría
     * se sortea con los pesos de `categorias` y el objeto, entre los de esa
     * categoría). Van al almacén de la flota (como mucho `almacen` sin
     * equipar; si está lleno, esperan en una bandeja hasta que vendas algo) y
     * se equipan a un conductor, uno de cada como mucho, en sus huecos.
     * efecto: como el de los rasgos, con los mismos topes.
     * frase: su chiste (Iván, 18-11-2026); sale en su panel del Almacén.
     */
    objetos: {
      almacen: 10,                 // Equilibrio: sin mejoras; «Taquillas» lo amplía.
      // Iván, 19-11-2026: un jugador de final de partida dice que salen
      // demasiados. Antes 0,012 (con 20 conductores, ~218 objetos por hora).
      probHallazgo: 0.009,
      // Cuántos objetos de una categoría se combinan en uno al azar de la
      // siguiente, según la categoría que se gasta (Iván, 18-11-2026; el
      // 19-11, más caro subir: antes 3 en todas). Un LEGENDARIO sale de 240 B
      // (antes 81). Eliges cuáles se gastan. Equilibrio.
      combinar: { B: 3, A: 4, S: 4, 'S+': 5 },
      /*
       * efecto, además de los factores: bolsa (no vomitan en su taxi: se usa
       * la bolsa), sinImpagos (nadie se le va sin pagar), rueda (un pinchazo
       * no cuesta ni le para: cambia la rueda). Iván, 18-11-2026: antes eran
       * mejoras de toda la flota y anulaban otros objetos.
       */
      lista: [
        { id: 'mapaMetro', nombre: 'Mapa del Metro de 1998', categoria: 'B', efecto: {},
          descripcion: 'No sirve para nada. Pero tres objetos B se combinan en uno A.',
          frase: 'No sale ni la línea 8. Lo guardas por si vuelve 1998.' },
        { id: 'perrito', nombre: 'Perrito del salpicadero', categoria: 'B', efecto: { propina: 1.08, espera: 0.97 },
          descripcion: 'Un 8 % más de propinas y un 3 % menos de espera.',
          frase: 'Asiente a todo lo que dice el cliente. El cliente lo agradece.' },
        { id: 'rosario', nombre: 'Rosario del retrovisor', categoria: 'B', efecto: { sinPagar: 0.6, propina: 1.06 },
          descripcion: 'Un 40 % menos de clientes sin pagar y un 6 % más de propinas.',
          frase: 'Lo único que importa es la familia… y que el cliente pague.' },
        { id: 'ambientador', nombre: 'Ambientador', categoria: 'B', efecto: { propina: 1.15 },
          descripcion: 'Un taxi que huele bien: un 15 % más de propinas.',
          frase: 'Pino del bosque. O eso dice la etiqueta.' },
        { id: 'cojin', nombre: 'Cojín lumbar', categoria: 'B', efecto: { baja: 0.75 },
          descripcion: 'Doce horas sentado sin dolor de espalda: un 25 % menos de bajas.',
          frase: 'Doce horas sentado. Tu espalda te lo agradece por escrito.' },
        // Iván, 23-11-2026: con el cansancio, la mitad de su espera de noche pasa a cansancio.
        { id: 'termo', nombre: 'Termo de café', categoria: 'B', efecto: { esperaNoche: 0.97, cansancio: 0.94 },
          descripcion: 'Despierto toda la noche: un 3 % menos de espera en el turno de noche y un 6 % menos de cansancio.',
          frase: 'A las cuatro de la mañana, el café es un derecho fundamental.' },
        { id: 'gafas', nombre: 'Gafas de sol', categoria: 'B', efecto: { esperaDia: 0.94 },
          descripcion: 'Sin deslumbrarse: un 6 % menos de espera en el turno de día.',
          frase: 'Para el sol de la Castellana. Y para no cruzar la mirada con el agente de movilidad.' },
        { id: 'funda', nombre: 'Funda de asientos', categoria: 'B', efecto: { limpieza: 0.6 },
          descripcion: 'Si un cliente vomita, limpiar cuesta un 40 % menos y se para menos rato.',
          frase: 'De cuadros escoceses. Nadie sabe por qué, pero todas son así.' },
        { id: 'callejero', nombre: 'Callejero de papel', categoria: 'B', efecto: { espera: 0.96 },
          descripcion: 'Por si falla el móvil: un 4 % menos de espera entre carreras.',
          frase: 'Edición de 2003. Desde entonces solo han cambiado todas las calles.' },

        { id: 'gps', nombre: 'GPS', categoria: 'A', efecto: { espera: 0.94 },
          descripcion: 'Rutas y avisos de clientes: un 6 % menos de espera entre carreras.',
          frase: '«Gire a la derecha.» No hay derecha. Nunca hay derecha.' },
        { id: 'manometro', nombre: 'Manómetro de ruedas', categoria: 'A', efecto: { pinchazo: 0.7 },
          descripcion: 'Ruedas siempre a su presión: un 30 % menos de pinchazos.',
          frase: 'Dos coma dos bares. Ni uno más, ni uno menos.' },
        { id: 'caramelos', nombre: 'Caramelos para clientes', categoria: 'A', efecto: { propina: 1.2 },
          descripcion: 'Un detalle que se agradece: un 20 % más de propinas.',
          frase: 'Los de café con leche son para los clientes. Los de fresa, no.' },
        { id: 'espejo', nombre: 'Espejo panorámico', categoria: 'A', efecto: { sinPagar: 0.7 },
          descripcion: 'Ve todo el asiento de atrás: un 30 % menos de clientes sin pagar.',
          frase: 'Lo ve todo. A veces, demasiado.' },
        { id: 'vitaminas', nombre: 'Vitaminas', categoria: 'A', efecto: { baja: 0.7 },
          descripcion: 'Defensas altas: un 30 % menos de bajas.',
          frase: 'Una al día. Dos si es lunes.' },
        { id: 'alfombrillas', nombre: 'Alfombrillas de goma', categoria: 'A', efecto: { limpieza: 0.55 },
          descripcion: 'Se limpian con la manguera: un vómito cuesta un 45 % menos y se para menos rato.',
          frase: 'Manguera y listo. Ya lo has visto todo en esta vida.' },

        { id: 'chicles', nombre: 'Paquete de chicles de menta', categoria: 'A', efecto: { propina: 1.1, esperaNoche: 0.95 },
          descripcion: 'Un 10 % más de propinas y un 5 % menos de espera de noche.',
          frase: 'Aliento fresco a las cuatro de la mañana. Los de atrás lo agradecen.' },
        { id: 'linterna', nombre: 'Linterna de bolsillo', categoria: 'A', efecto: { hallazgo: 1.4 },
          descripcion: 'Mira debajo de los asientos: encuentra un 40 % más de objetos.',
          frase: 'Lo que sale de debajo de los asientos, mejor no preguntarlo.' },
        { id: 'camara', nombre: 'Cámara de seguridad', categoria: 'A', efecto: { sinImpagos: true, propina: 1.1 },
          descripcion: 'Con la cámara a la vista, nadie se va sin pagar de su taxi y los clientes se portan mejor: un 10 % más de propinas.',
          frase: 'Sonría. Y pague.' },
        // Cansancio (Iván, 23-11-2026). Equilibrio.
        { id: 'antifaz', nombre: 'Antifaz de avión', categoria: 'A', efecto: { descanso: 0.7 },
          descripcion: 'Se queda frito en cuanto para: sus descansos duran un 30 % menos.',
          frase: 'Lo sacó de un vuelo a Canarias en 2009. Funciona.' },
        { id: 'rueda', nombre: 'Rueda de repuesto', categoria: 'S', efecto: { rueda: true },
          descripcion: 'Si pincha, cambia la rueda y sigue: ni neumático que pagar ni turno perdido.',
          frase: 'La de verdad, no la de galleta. Ya te lo explicó tu cuñado.' },
        { id: 'escaner', nombre: 'Radio-escáner', categoria: 'S', efecto: { espera: 0.9 },
          descripcion: 'Se entera antes que nadie de dónde hay clientes: un 10 % menos de espera.',
          frase: 'Se entera de todo antes que la radio. Y antes que los vecinos.' },
        { id: 'herramientas', nombre: 'Kit de herramientas', categoria: 'S', efecto: { averia: 0.65, pinchazo: 0.8 },
          descripcion: 'Arregla lo pequeño antes de que se rompa: un 35 % menos de averías y un 20 % menos de pinchazos.',
          frase: 'Llave del 13, cinta americana y fe.' },
        { id: 'cargador', nombre: 'Cargador para clientes', categoria: 'S', efecto: { propina: 1.3, objeto: 1.2 },
          descripcion: 'Todo el mundo lo agradece: un 30 % más de propinas y un 20 % más de objetos devueltos.',
          frase: 'Tiene todos los cables del mundo. Menos el tuyo.' },
        { id: 'botiquin', nombre: 'Botiquín', categoria: 'S', efecto: { baja: 0.55 },
          descripcion: 'Lo que pilla, lo cura a tiempo: un 45 % menos de bajas.',
          frase: 'Tiritas, ibuprofeno y una aspirina de 2009.' },
        // Iván, 26-11-2026: solo no hace nada; con Paconi o El Pelado
        // (sinergias de los ÚNICOS), un 40 % menos de cansancio. Equilibrio.
        { id: 'colines', nombre: 'Saco de 10 kg de colines', categoria: 'S', efecto: {},
          descripcion: 'No hace nada… salvo para quien sabe apreciarlos: con Paconi o El Pelado, un 40 % menos de cansancio.',
          frase: 'Diez kilos. Por si acaso. Nadie sabe de qué caso.' },
        // Iván, 27-11-2026: música para los clientes (propinas) y para el
        // conductor (cansancio). Equilibrio: entre el Ventilador y los S+.
        { id: 'spotify', nombre: 'Spotify Premium', categoria: 'S', efecto: { propina: 1.2, cansancio: 0.88 },
          descripcion: 'Música sin anuncios para los clientes y para el conductor: un 20 % más de propinas y un 12 % menos de cansancio.',
          frase: '«¿Puedo poner una canción?» Claro. Una. Y luego otra. Y luego el disco entero.' },
        { id: 'datafono', nombre: 'Datáfono portátil', categoria: 'S', efecto: { sinPagar: 0.5 },
          descripcion: 'Nadie se escapa con la excusa de la tarjeta: la mitad de clientes sin pagar.',
          frase: '«¿Aceptas tarjeta?» Siempre. Se acabaron las excusas.' },

        { id: 'calcetines', nombre: 'Calcetines de la suerte (sin lavar)', categoria: 'S', efecto: { espera: 0.87, propina: 0.85 },
          descripcion: 'Un 13 % menos de espera… y un 15 % menos de propinas.',
          frase: 'No se lavan desde que empezaron a funcionar. No vamos a arriesgarnos ahora.' },
        { id: 'bufanda', nombre: 'Bufanda mitad y mitad', categoria: 'S', efecto: { propina: 1.35, esperaDia: 0.96 },
          descripcion: 'Un 35 % más de propinas y un 4 % menos de espera de día.',
          frase: 'Media de cada equipo: nadie se baja enfadado del taxi.' },
        { id: 'ventilador', nombre: 'Ventilador de pinza', categoria: 'S', efecto: { cansancio: 0.85 },
          descripcion: 'Aire en la cara toda la jornada: un 15 % menos de cansancio.',
          frase: 'Aire en la cara: despierta más que la radio.' },
        { id: 'bolsaVomito', nombre: 'Bolsa para vómitos', categoria: 'S+', efecto: { bolsa: true },
          descripcion: 'Siempre a mano: si un cliente se marea, no vomita en el coche. Ni limpieza ni rato parado.',
          frase: 'El conductor de noche la saca con reflejos de portero.' },
        { id: 'navegador', nombre: 'Navegador con tráfico en directo', categoria: 'S+', efecto: { espera: 0.86 },
          descripcion: 'Esquiva atascos y llega antes: un 14 % menos de espera entre carreras.',
          frase: 'Sabe dónde va a haber atasco antes de que exista.' },
        // Iván, 23-11-2026: su espera de noche pasa a cansancio.
        { id: 'silla', nombre: 'Silla ergonómica', categoria: 'S+', efecto: { baja: 0.5, cansancio: 0.8 },
          descripcion: 'Aguanta el turno entero: la mitad de bajas y un 20 % menos de cansancio.',
          frase: 'Más cara que el coche. Bueno, casi.' },
        { id: 'nevera', nombre: 'Nevera con agua fría', categoria: 'S+', efecto: { propina: 1.45, limpieza: 0.7 },
          descripcion: 'Un lujo en agosto: un 45 % más de propinas y vómitos más llevaderos.',
          frase: 'Agua fría en agosto en Madrid: el único lujo de verdad.' },
        { id: 'baches', nombre: 'Detector de baches', categoria: 'S+', efecto: { pinchazo: 0.5, averia: 0.7 },
          descripcion: 'Ni un bache sin esquivar: la mitad de pinchazos y un 30 % menos de averías.',
          frase: 'Se sabe los baches de la M-30 por su nombre.' },

        { id: 'gato', nombre: 'Gato de la suerte', categoria: 'S+', efecto: { propina: 1.3, hallazgo: 1.2, suerte: 1.15 },
          descripcion: 'Un 30 % más de propinas, un 20 % más de objetos encontrados y un 15 % de que salgan de una categoría mejor.',
          frase: 'Mueve la patita todo el día. Algo hace.' },
        { id: 'detector', nombre: 'Detector de metales', categoria: 'S+', efecto: { hallazgo: 1.3, suerte: 1.15 },
          descripcion: 'Un 30 % más de objetos encontrados y un 15 % de que salgan de una categoría mejor.',
          frase: 'Pita con cada moneda, cada llave… y a veces con algo que vale la pena.' },
        { id: 'paconi', nombre: 'Planta de Paconi', categoria: 'L', efecto: { espera: 0.9, propina: 1.3, baja: 0.7 },
          descripcion: 'Nadie sabe cómo, pero lo arregla todo: un 10 % menos de espera, un 30 % más de propinas y un 30 % menos de bajas.',
          frase: 'Nadie sabe de dónde salió. Nadie se atreve a regarla.' },
        { id: 'bocata', nombre: 'Bocata de calamares infinito', categoria: 'L', efecto: { baja: 0.4, espera: 0.88 },
          descripcion: 'Nunca se acaba: un 60 % menos de bajas y un 12 % menos de espera.',
          frase: 'De la Plaza Mayor. Se acaba uno y aparece otro.' },
        { id: 'pizza', nombre: 'Porción de pizza', categoria: 'L', efecto: { espera: 0.88, baja: 0.6, propina: 1.3 },
          descripcion: 'Un 12 % menos de espera, un 40 % menos de bajas y un 30 % más de propinas.',
          frase: 'De tu 24 horas de confianza.' },
        { id: 'bidon', nombre: 'Bidón energético', categoria: 'L', efecto: { esperaNoche: 0.78, baja: 0.8 },
          descripcion: 'Medio litro que salva las noches: un 22 % menos de espera de noche y un 20 % menos de bajas.',
          frase: 'Medio litro de algo verde. No preguntes.' },
        // Iván, 23-11-2026: el café legendario. Descansos de 10 min (30 × 0,33).
        { id: 'porras', nombre: 'Café con porras de las 6 de la mañana', categoria: 'L', efecto: { descanso: 0.33, cansancio: 0.8 },
          descripcion: 'El desayuno del cambio de turno: descansos de 10 minutos y un 20 % menos de cansancio.',
          frase: 'Si lo mojas en el café, cuenta como desayuno y como siesta.' }
      ]
    },

    /*
     * Tarjeta «Siguiente» (Iván, 18-11-2026: que señale lo que hace crecer).
     * Equilibrio: con la flota cubierta, solo propone mejoras que cuestan
     * como mucho esta parte de crecer (la próxima licencia y su coche).
     */
    objetivo: {
      mejorasHasta: 0.1,
      // Con estas licencias o más propone también estas mejoras y lo que piden
      // antes en su rama: para que lleguen conductores mejores (Iván, 18-11-2026).
      licenciasParaPersonal: 3,
      mejorasPersonal: ['gestionZonas', 'rrhh']
    },

    /*
     * Pestaña Estadísticas (Iván, 18-11-2026). Equilibrio.
     *   dias: jornadas que se guardan en el historial (y que enseñan los
     *         gráficos de facturación por día y de medias)
     *   top:  conductores en la clasificación histórica
     */
    estadisticas: {
      dias: 30, top: 10,
      /*
       * Rangos de las cifras de arriba de Estadísticas (Iván, 26-11-2026):
       * el marco se pone del color del rango alcanzado. Equilibrio: medido
       * con el bot (perfil «Siguiente») y contando que las cifras se suman
       * entre partidas: Bronce ~30 min, Plata ~2 h, Oro ~4 h, Platino ~12 h,
       * Esmeralda ~25–30 h y Diamante ~50 h (todas las mejoras del personaje).
       * Cada clave es una cifra de estado.totales (mejorDia: estado.mejorDia.ingresos).
       */
      rangos: {
        nombres: [
          { id: 'bronce', nombre: 'Bronce' }, { id: 'plata', nombre: 'Plata' }, { id: 'oro', nombre: 'Oro' },
          { id: 'platino', nombre: 'Platino' }, { id: 'esmeralda', nombre: 'Esmeralda' }, { id: 'diamante', nombre: 'Diamante' }
        ],
        umbrales: {
          ingresos: [10000, 50000, 250000, 1000000, 2500000, 5000000],
          carreras: [1000, 4000, 20000, 80000, 200000, 400000],
          mejorDia: [500, 2000, 5000, 15000, 30000, 50000],
          km: [10000, 50000, 250000, 1000000, 2500000, 5000000],
          vomitos: [5, 25, 125, 500, 1250, 2500],
          sinPagar: [150, 800, 4000, 16000, 40000, 80000],
          hallazgos: [5, 35, 175, 700, 1750, 3500],
          devueltos: [10, 40, 200, 850, 2000, 4000]
        },
        // Cómo se llama cada cifra en el aviso de subir de rango.
        etiquetas: {
          ingresos: 'Facturado', carreras: 'Carreras', mejorDia: 'Mejor día', km: 'Km recorridos', vomitos: 'Vómitos',
          sinPagar: 'Sin pagar', hallazgos: 'Objetos encontrados', devueltos: 'Objetos devueltos'
        }
      }
    },

    economia: {
      dineroInicial: 50,          // Equilibrio: caja con la que empiezas.
      // Equilibrio: por debajo de estos viajes por hora la zona se considera
      // vacía y no se puede buscar cliente a mano.
      demandaMinimaManual: 0.5,
      // Equilibrio: cada jornada, la demanda de cada zona se mueve al azar
      // hasta este porcentaje arriba o abajo (0,2 = ±20 %). El azar sale del
      // número de día, así que el mismo día da siempre lo mismo.
      variacionDiariaDemanda: 0.2
    },

    conduccion: {
      // Equilibrio: velocidad media circulando en vacío buscando cliente.
      // Iván, 19-11-2026: antes 18. Un taxi real hace 25–35 km/h de media en
      // la jornada; con 72 un coche sale a ~30 km/h al principio (unos 730 km
      // por jornada sin libranza). No es una velocidad real: compensa que las
      // carreras del juego son lentas. Más combustible, a propósito (−13 % de
      // neto al principio, −6 % con flota avanzada; docs/analisis-km.md).
      velocidadVacioKmH: 72
    },

    // Turnos de 12 horas. Equilibrio: no coinciden con el cambio de tarifa de las 21:00.
    turnos: {
      dia: { nombre: 'Día', horaInicio: 7, horaFin: 19 },
      noche: { nombre: 'Noche', horaInicio: 19, horaFin: 7 }
    },

    /*
     * Cansancio (Iván, 23-11-2026): cada turno tiene una barra de energía
     * (maximo) que se gasta con el tiempo trabajando, por minuto de juego:
     * con pasajero, buscando cliente o esperando en la cola de una parada.
     * Al llegar a 0 (tras terminar la carrera en curso) para descansoMinutos
     * de juego y vuelve con la barra llena; al empezar cada turno, llena.
     * Equilibrio: unos 3 descansos por turno de 12 h (medido con el bot).
     */
    /*
     * Racha (idea 21, Iván 23-11-2026): cada carrera tuya que encadenas
     * (buscas la siguiente a tiempo tras cobrar: ver reaccion)
     * cobra porCarrera más, hasta maximo. Se corta al despistarte, al
     * descansar, al acabar el turno o si te pilla el pesetas. Desde el
     * 24-11-2026 es una mejora de tu personaje (personaje.mejoras: Racha,
     * Racha larga y Reflejos de taxista).
     */
    // reaccion (Iván, 23-11-2026: con 1 s fijo no la perdía nunca): la
    // ventana para encadenar se estrecha con la racha, de inicial (racha 0)
    // a final (en el tope), en segundos reales.
    /*
     * Tu personaje (Iván, 24-11-2026; idea 12, nivel de cuenta): experiencia
     * por cada carrera tuya (tuCarrera), de tus conductores (carreraConductor)
     * y por cada objeto LEGENDARIO que vendes. El nivel N pide en total
     * base × (factor^N − 1) / (factor − 1) puntos: 1.000, 2.600, 5.160…
     * Equilibrio (medido con el bot: nivel 3 hacia la 1 h 20 min, nivel 9
     * hacia las 8 h). Cada nivel dará un punto de prestigio y hará falta
     * nivelPrestigio para reiniciar (pasos siguientes).
     */
    personaje: {
      experiencia: { tuCarrera: 4, carreraConductor: 1, legendarioVendido: 25 },   // legendario: 25 desde el 26-11-2026 (Iván)
      niveles: { base: 1000, factor: 1.6 },
      nivelPrestigio: 3,
      // Puntos de prestigio (Iván, 24-11-2026, tras medir con el bot): el
      // nivel N da N × puntosPorNivel, así que una partida que llega al
      // nivel N junta 1 + 2 + … + N. Con 1 punto por nivel lo que más
      // rendía era reiniciar en cuanto se llegaba al 3.
      puntosPorNivel: 1,
      /*
       * Tu aspecto (Iván, 24-11-2026): las mismas piezas que los retratos de
       * los conductores (js/retratos.js). inicial: el de una partida nueva;
       * opciones: lo que se puede elegir en cada pieza. nombreMax: letras
       * del nombre. Se conservan al empezar de cero.
       */
      // Tu retrato (Iván, 26-11-2026, hecho con IA): sustituye a la cara por
      // piezas, que ya no se edita. El aspecto queda guardado, sin usar.
      imagen: 'imagenes/personaje.webp',
      aspecto: {
        inicial: { edad: 'media', piel: 2, cara: 'redonda', pelo: 'corto', colorPelo: 'castano', gafas: null,
          barba: null, ropa: 6, gorra: null, cuello: null, pendientes: false },
        opciones: {
          piel: [1, 2, 3, 4],
          cara: ['redonda', 'alargada', 'cuadrada'],
          edad: ['joven', 'media', 'mayor'],
          pelo: ['corto', 'largo', 'rizado', 'coleta', 'moño', 'calvo'],
          colorPelo: ['negro', 'castano', 'rubio', 'pelirrojo', 'gris', 'blanco'],
          barba: [null, 'bigote', 'perilla', 'barba'],
          gafas: [null, 'redondas', 'cuadradas', 'sol'],
          ropa: [1, 2, 3, 4, 5, 6],
          cuello: [null, 'pajarita', 'corbata'],
          gorra: [null, 1, 2, 3, 4, 5, 6],
          pendientes: [false, true]
        },
        nombreMax: 14
      },
      /*
       * Mejoras de tu personaje (Iván, 24-11-2026): no se compran con euros
       * sino con puntos de prestigio (uno por nivel), al reiniciar, y son lo
       * único que se conserva. Cada nivel lleva su coste y su efecto total.
       * Equilibrio: entre todas, 300 puntos (costes ×3 el 24-11-2026, con los
       * puntos crecientes por nivel; ver tests/prestigio.js).
       *   grupo     'volante' (tu turno), 'arranque' (cada partida nueva) o
       *             'gamas' (coches que se pueden comprar; sin efecto todavía)
       *   requiere  otra mejora del personaje, o una lista (basta su nivel 1);
       *             un nivel puede pedir además { id: nivel } (su requiere)
       *   efecto    racha / incognitoTu: sí o no
       *             rachaMaximo, rachaReaccion (s), dineroInicial (€): se suman
       *             cansancio, espera, experiencia: multiplican (solo tú)
       *             cocheNuevo: tu primer coche, a 0 km
       *             candidatosMinimo: categoría mínima de los primeros candidatos
       *             gama: coche que desbloquea (idea 23)
       */
      mejoras: [
        { id: 'racha', nombre: 'Racha', grupo: 'volante',
          descripcion: 'Encadena carreras sin despistarte y cada una cobra un 1 % más, hasta un 10 %.',
          niveles: [{ coste: 9, efecto: { racha: true } }] },
        // Racha larga y Reflejos piden también Fondo físico (Iván,
        // 25-11-2026): sin él, el descanso corta la racha antes del +10 %.
        { id: 'rachaLarga', nombre: 'Racha larga', grupo: 'volante', requiere: ['racha', 'fondoFisico'],
          descripcion: 'Sube el tope de la racha.',
          // Cada nivel pide un nivel más de Fondo físico (Iván, 25-11-2026):
          // sin aguantar más carreras seguidas, el tope más alto no se alcanza.
          niveles: [
            { coste: 6, descripcion: 'La racha llega hasta +15 % (de serie, +10 %).', efecto: { rachaMaximo: 0.05 }, requiere: { fondoFisico: 1 } },
            { coste: 12, descripcion: 'La racha llega hasta +20 %.', efecto: { rachaMaximo: 0.10 }, requiere: { fondoFisico: 2 } },
            { coste: 18, descripcion: 'La racha llega hasta +25 %.', efecto: { rachaMaximo: 0.15 }, requiere: { fondoFisico: 3 } }
          ] },
        { id: 'reflejos', nombre: 'Reflejos de taxista', grupo: 'volante', requiere: ['racha', 'fondoFisico'],
          descripcion: 'Más tiempo para encadenar la siguiente carrera.',
          niveles: [
            { coste: 9, descripcion: '0,15 s más para encadenar la siguiente carrera.', efecto: { rachaReaccion: 0.15 } },
            { coste: 15, descripcion: '0,3 s más para encadenar la siguiente carrera.', efecto: { rachaReaccion: 0.3 } }
          ] },
        { id: 'incognitoTu', nombre: 'Incógnito al volante', grupo: 'volante',
          descripcion: 'Puedes conducir también los días que libra tu licencia. Ojo con los pesetas: si uno te está mirando y cargas, 2.000 € de multa.',
          niveles: [{ coste: 6, efecto: { incognitoTu: true } }] },
        { id: 'fondoFisico', nombre: 'Fondo físico', grupo: 'volante',
          descripcion: 'Te cansas menos.',
          niveles: [
            { coste: 6, descripcion: 'Te cansas un 15 % menos.', efecto: { cansancio: 0.85 } },
            { coste: 12, descripcion: 'Te cansas un 30 % menos.', efecto: { cansancio: 0.7 } },
            { coste: 18, descripcion: 'Te cansas un 50 % menos.', efecto: { cansancio: 0.5 } },
            { coste: 24, descripcion: 'Te cansas un 75 % menos.', efecto: { cansancio: 0.25 } },
            { coste: 30, descripcion: 'Incansable: nunca necesitas descansar.', efecto: { cansancio: 0 } }
          ] },
        { id: 'callejero', nombre: 'Callejero de memoria', grupo: 'volante',
          descripcion: 'Encuentras cliente antes.',
          niveles: [
            { coste: 9, descripcion: 'Encuentras cliente un 10 % antes.', efecto: { espera: 0.9 } },
            { coste: 15, descripcion: 'Encuentras cliente un 20 % antes.', efecto: { espera: 0.8 } }
          ] },
        { id: 'ahorros', nombre: 'Ahorros', grupo: 'arranque',
          descripcion: 'Empiezas cada partida con dinero de más.',
          niveles: [
            { coste: 3, descripcion: 'Empiezas con 1.000 € más.', efecto: { dineroInicial: 1000 } },
            { coste: 9, descripcion: 'Empiezas con 3.000 € más.', efecto: { dineroInicial: 3000 } },
            { coste: 15, descripcion: 'Empiezas con 6.000 € más.', efecto: { dineroInicial: 6000 } }
          ] },
        { id: 'cocheNuevo', nombre: 'Coche a estrenar', grupo: 'arranque',
          descripcion: 'Tu primer coche sale de fábrica, a 0 km, en vez de usado.',
          niveles: [{ coste: 3, efecto: { cocheNuevo: true } }] },
        { id: 'agenda', nombre: 'Agenda de contactos', grupo: 'arranque',
          descripcion: 'Los primeros candidatos de cada partida son como mínimo de categoría A.',
          niveles: [{ coste: 12, efecto: { candidatosMinimo: 'A' } }] },
        { id: 'veterano', nombre: 'Veterano', grupo: 'arranque',
          descripcion: 'Ganas más experiencia y llegas antes al siguiente reinicio.',
          niveles: [
            { coste: 12, descripcion: 'Tu taxista gana un 25 % más de experiencia.', efecto: { experiencia: 1.25 } },
            { coste: 18, descripcion: 'Tu taxista gana un 50 % más de experiencia.', efecto: { experiencia: 1.5 } }
          ] },
        { id: 'tesla', nombre: 'Tesla Model 3', grupo: 'gamas',
          descripcion: 'Podrás comprar Teslas (3.500 €) para tus licencias: eléctricos, la carga cuesta mucho menos que la gasolina, un 60 % menos de averías y un 20 % menos de cansancio.',
          niveles: [{ coste: 15, efecto: { gama: 'tesla' } }] },
        { id: 'mercedes', nombre: 'Mercedes Clase S', grupo: 'gamas', requiere: 'tesla',
          descripcion: 'Podrás comprar Mercedes Clase S (5.000 €): más del doble de propinas y más generosas, un 55 % menos de clientes sin pagar y más carreras en Centro y Aeropuerto; gasta un 30 % más y sus reparaciones cuestan un 50 % más.',
          niveles: [{ coste: 24, efecto: { gama: 'mercedes' } }] }
      ]
    },
    racha: { porCarrera: 0.01, maximo: 0.10, reaccion: { inicial: 1, final: 0.5 } },

    cansancio: {
      maximo: 100,
      gastoPorMinuto: { pasajero: 0.75, buscando: 0.55, cola: 0.2 },
      descansoMinutos: 30
    },

    conductores: {
      // Dato de Iván: parte de la recaudación que se queda el conductor.
      porcentaje: 0.50,
      // El precio de contratar depende de la categoría (config.categorias).
      reserva: 5,                  // Equilibrio: conductores en reserva (sin trabajar).
      // Idea 11 (Iván, 22-11-2026): con la mejora «Cazatalentos», buscar otros
      // candidatos cuesta precioBase y cada búsqueda del mismo día el doble
      // (factor); vuelve a precioBase al cerrar la caja.
      rebuscar: { precioBase: 1000, factor: 2 },
      candidatos: 3,               // Equilibrio: entre cuántos eliges al contratar.
      // Equilibrio: despedir cuesta base + porNivel × nivel del conductor
      // (160 € en el nivel 1, 700 € en el 10). Sin dinero no se puede.
      finiquito: { base: 100, porNivel: 60 },

      /*
       * Rasgos (Equilibrio): cada conductor tiene una cualidad y un defecto,
       * sorteados al crearse. Una cualidad nunca sale con su `opuesto`.
       * efecto: factores sobre valores que ya existen en el juego:
       *   espera       minutos buscando cliente o esperando por poca demanda
       *                (no la cola de las paradas)
       *   esperaDia    la espera, solo en el turno de día
       *   esperaNoche  la espera, solo en el turno de noche
       *   propina, sinPagar, objeto   probabilidades por carrera
       *   baja, pinchazo, averia      probabilidades al empezar el turno
       *   limpieza     coste de limpiar un vómito y tiempo parado
       *   hallazgo     probabilidad de encontrar un objeto al terminar una carrera
       *   suerte       lo encontrado sube una categoría con probabilidad suerte − 1
       * Solo afectan a los conductores contratados, nunca a tu turno.
       */
      // Equilibrio (Iván, 17-11-2026): cada cualidad vale cerca de un +5 % de
      // lo que deja un conductor B, y cada defecto un −5 % (medido con un bot,
      // sin mejoras ni bolsas). Los de solo día o solo noche, sobre los
      // conductores de ese turno. Algunos llevan un segundo efecto para que
      // no dependan de sucesos raros, ni se anulen del todo con las mejoras.
      cualidades: [
        { id: 'simpatico', nombre: 'Simpático', opuesto: 'antipatico', efecto: { propina: 2 },
          descripcion: 'Cae bien a los clientes: el doble de propinas.' },
        { id: 'cuidadoso', nombre: 'Cuidadoso', opuesto: 'manazas', efecto: { pinchazo: 0.25, averia: 0.25, limpieza: 0.62 },
          descripcion: 'Trata bien el coche: un 75 % menos de pinchazos y averías, y limpiar un vómito le cuesta un 38 % menos.' },
        { id: 'conoceCiudad', nombre: 'Conoce la ciudad', opuesto: 'lento', efecto: { espera: 0.88 },
          descripcion: 'Sabe dónde están los clientes: un 12 % menos de espera entre carreras.' },
        { id: 'deHierro', nombre: 'De hierro', opuesto: 'enfermizo', efecto: { baja: 0.2, espera: 0.91 },
          descripcion: 'Nunca se pone malo y no para: un 80 % menos de bajas y un 9 % menos de espera.' },
        { id: 'ojoAvizor', nombre: 'Ojo avizor', opuesto: 'despistado', efecto: { sinPagar: 0.2, espera: 0.9 },
          descripcion: 'Ve antes que nadie a los clientes: un 80 % menos de clientes sin pagar y un 10 % menos de espera.' },
        { id: 'honrado', nombre: 'Honrado', opuesto: 'aprovechado', efecto: { objeto: 2, propina: 1.35 },
          descripcion: 'Devuelve todo y los clientes lo saben: el doble de objetos devueltos y un 35 % más de propinas.' },
        { id: 'buho', nombre: 'Búho', opuesto: 'trasnochador', efecto: { esperaNoche: 0.88 },
          descripcion: 'Rinde de noche: un 12 % menos de espera en el turno de noche.' },
        { id: 'madrugador', nombre: 'Madrugador', opuesto: 'dormilon', efecto: { esperaDia: 0.88 },
          descripcion: 'Rinde de día: un 12 % menos de espera en el turno de día.' },
        { id: 'pulcro', nombre: 'Pulcro', opuesto: 'guarro', efecto: { limpieza: 0.5, propina: 1.45 },
          descripcion: 'Taxi siempre impecable: limpiar un vómito le cuesta la mitad y un 45 % más de propinas.' },
        // Iván, 18-11-2026. Equilibrio: cerca de +5 % con la venta de objetos rebajada.
        { id: 'urraca', nombre: 'Urraca', opuesto: 'desastre', efecto: { hallazgo: 1.2, suerte: 1.15 },
          descripcion: 'Ve brillar cualquier cosa: encuentra un 20 % más de objetos y un 15 % de lo que encuentra sube de categoría.' },
        // Iván, 18-11-2026: solo cuenta en las carreras que empiezan con lluvia
        // (un 20 % de las jornadas, 1–3 horas), así que el multiplicador es alto
        // para que valga como las demás cualidades (medido con un bot).
        // Medido con un 35 % de tormentas (480 partidas): ×2 vale +2,3 %,
        // ×3 +4,7 % y ×3,5 +5,8 %; ×3,1 queda en +5 %, como las demás.
        { id: 'anfibio', nombre: 'Anfibio', opuesto: 'azucarillo', efecto: { importeLluvia: 3.1 },
          descripcion: 'Bajo la lluvia está en su salsa: cobra 3,1 veces más en las carreras que empiezan lloviendo.' },
        // Cansancio (Iván, 23-11-2026). Equilibrio.
        { id: 'incansable', nombre: 'Incansable', opuesto: 'blandengue', efecto: { cansancio: 0.75 },
          descripcion: 'No hay quien lo pare: se cansa un 25 % menos.' },
        { id: 'siestaExpres', nombre: 'Siesta exprés', opuesto: 'remolon', efecto: { descanso: 0.5 },
          descripcion: 'Cierra los ojos y como nuevo: sus descansos duran la mitad.' }
      ],
      defectos: [
        { id: 'antipatico', nombre: 'Antipático', efecto: { propina: 0.25, espera: 1.08 },
          descripcion: 'Seco con los clientes: un 75 % menos de propinas y un 8 % más de espera (no le paran).' },
        { id: 'manazas', nombre: 'Manazas', efecto: { pinchazo: 1.75, averia: 1.75, limpieza: 1.5 },
          descripcion: 'Maltrata el coche: un 75 % más de pinchazos y averías, y limpiar un vómito le cuesta un 50 % más.' },
        { id: 'lento', nombre: 'Lento', efecto: { espera: 1.14 },
          descripcion: 'Tarda en encontrar clientes: un 14 % más de espera entre carreras.' },
        { id: 'enfermizo', nombre: 'Enfermizo', efecto: { baja: 2, espera: 1.085 },
          descripcion: 'Siempre está pachucho: el doble de bajas y un 8,5 % más de espera.' },
        { id: 'despistado', nombre: 'Despistado', efecto: { sinPagar: 2, espera: 1.11 },
          descripcion: 'Va en las nubes: el doble de clientes sin pagar y un 11 % más de espera.' },
        { id: 'dormilon', nombre: 'Dormilón', efecto: { esperaDia: 1.16 },
          descripcion: 'Le cuesta arrancar: un 16 % más de espera en el turno de día.' },
        { id: 'trasnochador', nombre: 'Trasnochador flojo', efecto: { esperaNoche: 1.18 },
          descripcion: 'De noche se apaga: un 18 % más de espera en el turno de noche.' },
        { id: 'guarro', nombre: 'Guarro', efecto: { limpieza: 1.7, propina: 0.55 },
          descripcion: 'El taxi da pena: limpiar un vómito le cuesta un 70 % más y un 45 % menos de propinas.' },
        { id: 'aprovechado', nombre: 'Aprovechado', efecto: { objeto: 0.3, propina: 0.4 },
          descripcion: 'Lo que se olvidan, se lo queda: un 70 % menos de objetos devueltos y un 60 % menos de propinas.' },
        { id: 'desastre', nombre: 'Desastre', efecto: { hallazgo: 0.6 },
          descripcion: 'Lo que encuentra, lo pierde por el camino: un 40 % menos de objetos encontrados.' },
        // Iván, 18-11-2026: opuesto de Anfibio. Solo la lluvia: mientras llueve
        // se queda parado en el coche (paraConLluvia, sin factor ni tope).
        { id: 'azucarillo', nombre: 'Azucarillo', efecto: { paraConLluvia: true },
          descripcion: '¡Que no es de azúcar! Mientras llueve no coge clientes: se queda en el coche hasta que escampa.' },
        { id: 'blandengue', nombre: 'Blandengue', efecto: { cansancio: 1.25 },
          descripcion: 'Se cansa enseguida: un 25 % más de cansancio.' },
        { id: 'remolon', nombre: 'Remolón', efecto: { descanso: 1.5 },
          descripcion: 'Cuando para, no hay quien lo levante: sus descansos duran un 50 % más.' }
      ],

      /*
       * Experiencia y niveles (Equilibrio). Cada carrera terminada da
       * `porCarrera` puntos al conductor que la hace (un conductor hace unas
       * 25–30 carreras por jornada). `experiencia[n - 1]` es la experiencia
       * total para tener el nivel n: el 5 llega hacia la quinta jornada y el
       * 10 hacia la 35. Cada nivel por encima del 1 quita `esperaPorNivel` de
       * la espera entre carreras (acumulable, con el tope de la espera).
       */
      niveles: {
        porCarrera: 1,
        // Al llegar al último nivel pierde un defecto o, si no tiene, gana una cualidad.
        experiencia: [0, 20, 48, 87, 142, 219, 326, 477, 688, 983],
        esperaPorNivel: 0.015,
        // Huecos de objeto por nivel (1 a 10): uno más en el 4 y otro en el 8.
        huecos: [1, 1, 1, 2, 2, 2, 2, 3, 3, 3]
      },

      /*
       * Topes (Equilibrio) del efecto combinado sobre cada valor, como factor
       * respecto al valor sin conductor: [mínimo, máximo]. En la espera, el
       * tope es para lo que suman rasgo, nivel y objetos (las mejoras de
       * búsqueda ya bajan solas hasta ×0,35 en el ocio y se respetan). En las
       * propinas incluye la mejora «Propinas». La Cámara de seguridad sigue
       * dejando a cero los clientes sin pagar.
       */
      topes: {
        espera: [0.6, 1.4],
        propina: [0.5, 2.5],
        sinPagar: [0.3, 2],
        objeto: [0.3, 2],
        baja: [0.3, 2],
        pinchazo: [0.3, 2],
        averia: [0.3, 2],
        limpieza: [0.4, 1.5],
        // Iván, 18-11-2026: encontrar objetos (probabilidad) y suerte (1,15 =
        // un 15 % de lo encontrado sube una categoría; nunca baja de 1).
        hallazgo: [0.3, 2.5],
        suerte: [1, 1.4],
        // Lo que cobra en las carreras con lluvia (Anfibio): nunca baja de 1.
        importeLluvia: [1, 3.1],
        // Cansancio (Iván, 23-11-2026): lo que gasta y lo que dura el descanso.
        cansancio: [0.5, 1.6],
        descanso: [0.33, 2]
      },
      /*
       * Topes que crecen (Equilibrio, Iván 17-11-2026): los de arriba son los
       * de un B de nivel 1. Solo se abre el lado bueno de cada tope (lo malo
       * sigue frenado), según una apertura de 0 a 1:
       *   apertura = aperturaTope de su categoría + porNivel × (nivel − 1) / 9
       * Con apertura 1 se llega a `extremo`; entre medias, a medio camino en
       * proporción (media geométrica): tope ^ (1 − a) × extremo ^ a.
       */
      topesAbiertos: {
        porNivel: 0.25,
        extremo: { espera: 0.2, propina: 7, sinPagar: 0.05, objeto: 4, baja: 0.05, pinchazo: 0.05, averia: 0.05, limpieza: 0.15, hallazgo: 4, suerte: 1.7, importeLluvia: 6, cansancio: 0.25, descanso: 0.2 }
      },
      /*
       * Personajes: se sortea uno al contratar (sin repetir mientras se pueda).
       * Rasgos del retrato (js/retratos.js):
       *   piel 1–4 · cara redonda | alargada | cuadrada
       *   pelo corto | largo | rizado | coleta | moño | calvo
       *   colorPelo negro | castano | rubio | pelirrojo | gris | blanco
       *   gafas null | redondas | cuadradas | sol · barba null | bigote | barba | perilla
       *   ropa 1–6 · edad joven | media | mayor (la mayor lleva arrugas)
       *   opcionales: gorra (color, 1–6 como la ropa) · cuello pajarita |
       *   corbata (traje: camisa y corbata) · pendientes true
       */
      /*
       * Caras ilustradas (Iván, 26-11-2026, hechas con IA): banco aparte de
       * los nombres. Cada candidato saca un nombre (personaje) y una cara de
       * su mismo sexo, sin repetir caras en la flota. Archivos en
       * imagenes/caras/<id>.webp. Las caras dibujadas por piezas de los
       * personajes quedan solo de respaldo.
       */
      caras: {
        carpeta: 'imagenes/caras/',
        h: ['h01', 'h02', 'h03', 'h04', 'h05', 'h06', 'h07', 'h08', 'h09', 'h10', 'h11', 'h12', 'h13', 'h14', 'h15', 'h16', 'h17', 'h18', 'h19', 'h20', 'h21', 'h22', 'h23', 'h24', 'h25', 'h26', 'h27', 'h28'],
        m: ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10', 'm11', 'm12', 'm13', 'm14', 'm15', 'm16', 'm17', 'm18', 'm19', 'm20', 'm21', 'm22', 'm23', 'm24', 'm25', 'm26', 'm27']
      },
      personajes: [
        { nombre: 'Ana', sexo: 'm', edad: 'joven', piel: 2, cara: 'redonda', pelo: 'largo', colorPelo: 'castano', gafas: null, barba: null, ropa: 1 },
        { nombre: 'Luis', sexo: 'h', edad: 'media', piel: 1, cara: 'cuadrada', pelo: 'corto', colorPelo: 'negro', gafas: null, barba: 'bigote', ropa: 2 },
        { nombre: 'Carmen', sexo: 'm', edad: 'mayor', piel: 2, cara: 'alargada', pelo: 'moño', colorPelo: 'blanco', gafas: 'redondas', barba: null, ropa: 3 },
        { nombre: 'Javier', sexo: 'h', edad: 'joven', piel: 3, cara: 'redonda', pelo: 'rizado', colorPelo: 'negro', gafas: null, barba: 'perilla', ropa: 4 },
        { nombre: 'Lucía', sexo: 'm', edad: 'media', piel: 1, cara: 'alargada', pelo: 'coleta', colorPelo: 'rubio', gafas: 'cuadradas', barba: null, ropa: 5 },
        { nombre: 'Manuel', sexo: 'h', edad: 'mayor', piel: 2, cara: 'cuadrada', pelo: 'calvo', colorPelo: 'gris', gafas: null, barba: 'barba', ropa: 6 },
        { nombre: 'Elena', sexo: 'm', edad: 'joven', piel: 4, cara: 'redonda', pelo: 'rizado', colorPelo: 'negro', gafas: null, barba: null, ropa: 3 },
        { nombre: 'Antonio', sexo: 'h', edad: 'mayor', piel: 1, cara: 'redonda', pelo: 'corto', colorPelo: 'blanco', gafas: 'cuadradas', barba: 'bigote', ropa: 1 },
        { nombre: 'Marta', sexo: 'm', edad: 'media', piel: 3, cara: 'alargada', pelo: 'largo', colorPelo: 'pelirrojo', gafas: null, barba: null, ropa: 2 },
        { nombre: 'Francisco', sexo: 'h', edad: 'media', piel: 2, cara: 'cuadrada', pelo: 'corto', colorPelo: 'castano', gafas: null, barba: 'barba', ropa: 4 },
        { nombre: 'Laura', sexo: 'm', edad: 'joven', piel: 1, cara: 'redonda', pelo: 'coleta', colorPelo: 'castano', gafas: 'redondas', barba: null, ropa: 6 },
        { nombre: 'David', sexo: 'h', edad: 'joven', piel: 2, cara: 'alargada', pelo: 'corto', colorPelo: 'rubio', gafas: null, barba: null, ropa: 5 },
        { nombre: 'Rosa', sexo: 'm', edad: 'mayor', piel: 3, cara: 'redonda', pelo: 'moño', colorPelo: 'gris', gafas: null, barba: null, ropa: 6 },
        { nombre: 'Pablo', sexo: 'h', edad: 'media', piel: 4, cara: 'cuadrada', pelo: 'calvo', colorPelo: 'negro', gafas: null, barba: 'barba', ropa: 1 },
        { nombre: 'Isabel', sexo: 'm', edad: 'media', piel: 2, cara: 'redonda', pelo: 'largo', colorPelo: 'negro', gafas: 'cuadradas', barba: null, ropa: 2 },
        { nombre: 'Sergio', sexo: 'h', edad: 'joven', piel: 3, cara: 'alargada', pelo: 'rizado', colorPelo: 'castano', gafas: null, barba: 'bigote', ropa: 3 },
        // Iván, 20-11-2026: 16 más, con accesorios (gafas de sol, gorra,
        // pajarita, traje con corbata y pendientes). Siempre al final: el
        // índice es el retrato que guardan los conductores.
        { nombre: 'Paco', sexo: 'h', edad: 'mayor', piel: 2, cara: 'cuadrada', pelo: 'calvo', colorPelo: 'gris', gafas: null, barba: 'bigote', ropa: 6, cuello: 'corbata' },
        { nombre: 'Mari Carmen', sexo: 'm', edad: 'mayor', piel: 1, cara: 'redonda', pelo: 'moño', colorPelo: 'castano', gafas: 'redondas', barba: null, ropa: 2, pendientes: true },
        { nombre: 'José Luis', sexo: 'h', edad: 'media', piel: 2, cara: 'alargada', pelo: 'corto', colorPelo: 'negro', gafas: 'sol', barba: null, ropa: 1, cuello: 'pajarita' },
        { nombre: 'Juan', sexo: 'h', edad: 'joven', piel: 3, cara: 'redonda', pelo: 'corto', colorPelo: 'castano', gafas: null, barba: null, ropa: 5, gorra: 4 },
        { nombre: 'Rafa', sexo: 'h', edad: 'media', piel: 4, cara: 'cuadrada', pelo: 'rizado', colorPelo: 'negro', gafas: 'sol', barba: 'perilla', ropa: 3 },
        { nombre: 'Cristina', sexo: 'm', edad: 'media', piel: 2, cara: 'alargada', pelo: 'largo', colorPelo: 'rubio', gafas: 'sol', barba: null, ropa: 4, pendientes: true },
        { nombre: 'Ángel', sexo: 'h', edad: 'joven', piel: 1, cara: 'redonda', pelo: 'rizado', colorPelo: 'castano', gafas: null, barba: null, ropa: 6, cuello: 'pajarita' },
        { nombre: 'Raquel', sexo: 'm', edad: 'joven', piel: 3, cara: 'redonda', pelo: 'coleta', colorPelo: 'negro', gafas: null, barba: null, ropa: 1, gorra: 2, pendientes: true },
        { nombre: 'Miguel', sexo: 'h', edad: 'mayor', piel: 3, cara: 'cuadrada', pelo: 'corto', colorPelo: 'blanco', gafas: 'cuadradas', barba: 'bigote', ropa: 1, cuello: 'corbata' },
        { nombre: 'Fernando', sexo: 'h', edad: 'media', piel: 1, cara: 'alargada', pelo: 'calvo', colorPelo: 'castano', gafas: 'sol', barba: 'barba', ropa: 2 },
        { nombre: 'Sonia', sexo: 'm', edad: 'media', piel: 4, cara: 'redonda', pelo: 'rizado', colorPelo: 'negro', gafas: null, barba: null, ropa: 5, pendientes: true },
        { nombre: 'Rubén', sexo: 'h', edad: 'joven', piel: 2, cara: 'alargada', pelo: 'corto', colorPelo: 'pelirrojo', gafas: null, barba: null, ropa: 6, gorra: 3 },
        { nombre: 'Lola', sexo: 'm', edad: 'mayor', piel: 2, cara: 'redonda', pelo: 'moño', colorPelo: 'gris', gafas: 'redondas', barba: null, ropa: 4, pendientes: true },
        { nombre: 'Fátima', sexo: 'm', edad: 'joven', piel: 1, cara: 'alargada', pelo: 'largo', colorPelo: 'castano', gafas: 'sol', barba: null, ropa: 3, pendientes: true },
        { nombre: 'Álvaro', sexo: 'h', edad: 'media', piel: 3, cara: 'cuadrada', pelo: 'corto', colorPelo: 'negro', gafas: null, barba: 'barba', ropa: 6, cuello: 'corbata' },
        { nombre: 'Daniel', sexo: 'h', edad: 'joven', piel: 4, cara: 'redonda', pelo: 'corto', colorPelo: 'negro', gafas: null, barba: null, ropa: 2, gorra: 1 },
        // Iván, 26-11-2026: Daniela pasa a ser solo la ÚNICA (en su sitio,
        // Fátima; las que ya se llamaban Daniela lo conservan) y entran
        // nombres de fuera, como en el taxi de verdad.
        { nombre: 'Ionuț', sexo: 'h', edad: 'media', piel: 1, cara: 'cuadrada', pelo: 'corto', colorPelo: 'castano', gafas: null, barba: 'barba', ropa: 4 },
        { nombre: 'Mamadou', sexo: 'h', edad: 'joven', piel: 4, cara: 'alargada', pelo: 'rizado', colorPelo: 'negro', gafas: null, barba: 'perilla', ropa: 5 },
        { nombre: 'Mei', sexo: 'm', edad: 'media', piel: 2, cara: 'redonda', pelo: 'largo', colorPelo: 'negro', gafas: 'redondas', barba: null, ropa: 3, pendientes: true }
      ],
      /*
       * Conductores ÚNICOS (fase 2 de la historia, Iván 25-11-2026): un
       * rango por encima de LEGENDARIO. Cada uno es un personaje fijo (con
       * mote) que solo existe una vez en la partida y llega a través de los
       * eventos de clientes (fase 3). Rinden de base como un LEGENDARIO
       * (categoriaBase), sin rasgos al azar ni topes de estadísticas. Equilibrio.
       *   imagen        su retrato (imagenes/, hecho por Iván con IA)
       *   frases        las suyas: salen en sus avisos
       *   soloTurno     'dia' o 'noche': no trabaja en el otro
       *   sinIncognito  nunca trabaja de incógnito, sea del nivel que sea
       *   incompatibles otros únicos con los que no comparte coche ({ id, nombre })
       *   baja          su probabilidad de baja al empezar el turno y cuánto dura
       *   ajuste        al cerrar la caja, un extra de lo que facturó (min–max)
       *   tocayos       un extra por cada conductor con esos nombres con turno
       *   sinergias     efecto de más si lleva ese objeto equipado ('importe':
       *                 multiplica lo que cobra por carrera)
       *   dobleTurno    si el otro turno de su licencia está vacío, hace los dos
       *   plusKm        € por km de su jornada, al cerrar la caja
       *   kmExtra       km de más en vacío (fracción de los suyos), al cerrar la caja
       *   combustible   factor sobre su combustible
       *   efecto        efectos de serie, como los de un objeto (pinchazo, sinImpagos…)
       *   noConduce     ocupa un turno pero no conduce: ese turno el coche se queda parado
       *   dirige        mientras está en un turno y no está de baja: `efecto` a
       *                 los demás conductores (aporte en sus factores),
       *                 `porcentaje` (puntos que bajan lo que se quedan) y
       *                 `sobre` (efectos sobre otro ÚNICO: baja y ajuste)
       *   paga          € al cerrar cada jornada en que tiene turno
       *   baja.texto    lo que dice el aviso de su baja (si no es por enfermedad)
       */
      unicos: {
        paconi: {
          nombre: 'Paconi', categoriaBase: 'L', imagen: 'imagenes/unico-paconi.webp',
          descripcion: 'Venezolano de origen español, 67 años. No es el más eficiente y se pone malo con facilidad, pero nadie sabe cuadrar las cuentas como él.',
          frases: [
            '¡No jodah, hermano!',
            'Es una trampa, muchachos.',
            'El freno está esponjoso, ¿lo notaron?',
            'Engañoso.',
            'Como dirían los yankees, hermano: Sssssshit happens!',
            'El coche está bailongo, muchachos.',
            'Ya sabes, hermano, tuve que parar porque salía líquido.'
          ],
          soloTurno: 'dia',
          sinIncognito: true,
          incompatibles: [{ id: 'pelado', nombre: 'El Pelado' }],
          baja: { prob: 0.07, jornadasMin: 1, jornadasMax: 2 },
          ajuste: { min: 0.12, max: 0.18 },
          tocayos: { nombres: ['Francisco', 'Paco'], porCada: 0.05, maximo: 0.15 },
          sinergias: [{ objeto: 'paconi', efecto: { propina: 1.2, espera: 0.8, cansancio: 0.8 } }, { objeto: 'colines', efecto: { cansancio: 0.6 } }]
        },
        // #02 (Iván, 25-11-2026). Todo Equilibrio.
        pelado: {
          nombre: 'El Pelado', categoriaBase: 'L', imagen: 'imagenes/unico-pelado.webp',
          descripcion: 'Una bestia de origen argentino: trabaja para dar de comer a sus siete hijos. Una vez se le intentaron ir sin pagar unos dominicanos y acabaron en pelotas. Le encanta hacer kilómetros.',
          frases: [
            'Che, acá no se baja nadie sin pagar.',
            'Siete pibes en casa, hermano: hay que laburar.',
            'Un kilometrito más no le hace mal a nadie.',
            'Mucha lechuga suelta, jefe.',
            '¿Dominicanos? Se fueron en calzoncillos, nada más te digo.'
          ],
          sinIncognito: true,
          dobleTurno: true,               // solo en su coche, hace los dos turnos
          incompatibles: [{ id: 'paconi', nombre: 'Paconi' }],
          baja: { prob: 0, jornadasMin: 1, jornadasMax: 1 },   // nunca se pone malo
          plusKm: 0.20,                   // € por km de su jornada, al cerrar la caja
          kmExtra: 0.25,                  // km de más (en vacío), al cerrar la caja
          combustible: 1.15,              // gasta un 15 % más (va rápido)
          efecto: { pinchazo: 1.1, sinImpagos: true },
          sinergias: [{ objeto: 'chicles', efecto: { importe: 1.2 } }, { objeto: 'colines', efecto: { cansancio: 0.6 } }]
        },
        // Iván, 26-11-2026 (docs/propuesta-novedades.md, 4). Equilibrio: tras
        // medirla con el bot, −15 % de espera y 6 puntos (antes −6 % y 3;
        // docs/analisis-unicos.md).
        daniela: {
          nombre: 'Daniela', categoriaBase: 'L', imagen: 'imagenes/unico-daniela.webp',
          descripcion: 'Seis años y las cosas muy claras. Su padre, Daniel, es su representante; lleva las cuentas de casa, negocia su propia paga y tiene tarjetas de visita. Le tiene manía a Paconi.',
          frases: [
            '¡Paconi, a trabajar!',
            'Aquí no se escaquea nadie.',
            'Las cuentas claras y el chocolate espeso.',
            'Mi papá dice que soy dura negociando.',
            '¿Esto es una flota o una guardería?'
          ],
          soloTurno: 'dia',
          sinIncognito: true,
          noConduce: true,
          dirige: {
            efecto: { espera: 0.85, baja: 0.7 },
            porcentaje: 0.06,
            sobre: { paconi: { baja: 0.5, ajuste: 0.5 } }
          },
          paga: 25,
          // Cuida de su hermano Álvaro: ese día no viene y no dirige.
          baja: { prob: 0.08, jornadasMin: 1, jornadasMax: 1, texto: 'Hoy no puedo, cuido de Álvaro.' }
        }
      }
    },

    combustible: {
      precioLitro: 1.55,           // Dato de Iván: precio medio del litro.
      // PROVISIONAL (estimación de Claude, 24-11-2026, sin fuente): precio
      // del kWh cargando en la cochera, para el Tesla.
      precioKwh: 0.225
    },

    // Costes fijos: se cobran una vez al día, al cerrar la caja.
    costesFijos: {
      // Dato de Iván: cuota máxima de autónomo en España, 535 € al mes.
      autonomoDiario: 535 / 30,
      seguroDiarioPorVehiculo: 10, // Dato de Iván: seguro del taxi por día.
      emisoraDiariaPorVehiculo: 3  // Dato de Iván: cuota de la emisora, solo si tienes la mejora.
    },

    licencias: {
      precioBase: 2500,            // Iván (valor de juego, 18-11-2026): precio de la segunda licencia.
      factorSubida: 1.15,          // Equilibrio: cada licencia cuesta un 15 % más que la anterior.
      maximo: 15812,               // Dato real: licencias en el área de Madrid.
      digitosPlaca: 5,             // Dato de Iván: la placa siempre con 5 cifras (00607-L).
      // Dato real (Iván): la letra de la licencia indica el día de libranza y
      // sale de la última cifra del número. Ej.: 15288-L libra los lunes.
      // La X del miércoles está por confirmar.
      letraPorCifra: { 7: 'L', 8: 'L', 9: 'M', 0: 'M', 1: 'X', 2: 'X', 3: 'J', 4: 'J', 5: 'V', 6: 'V' },
      libranza: true,              // Iván: las licencias libran (false: nunca; lo usan las pruebas).
      // Día de la semana que libra cada letra (índice de reloj.diasSemana).
      diaPorLetra: { L: 0, M: 1, X: 2, J: 3, V: 4 },
      // Dato real (Iván): en fin de semana libra según la paridad del día del
      // mes: una licencia par trabaja los días pares y libra los impares; una
      // impar, al revés. En el juego, el día del mes es el «Día N» de la jornada.
      // Al comprar una licencia eliges entre estas placas (números al azar).
      placasAElegir: 2,
      // Pagar por otras placas (Iván, 26-11-2026), como el cazatalentos:
      // cada vez del día, factor veces la anterior. Equilibrio.
      otrasPlacas: { precioBase: 100, factor: 2 }
    },

    /*
     * Sociedad limitada (idea 1, Iván, 20-11-2026): con `licenciasSinSociedad`
     * licencias, para comprar la siguiente hay que montar una SL (en la
     * realidad, a partir de unos 250.000 € de facturación al año conviene).
     * Cuesta `coste` una vez (capital y gastos; valor de juego) y luego
     * `porConductorDiario` € por conductor con turno en los costes fijos de
     * cada jornada. No da ninguna ventaja: es un trámite para crecer. Al
     * montarla le pones nombre a tu flota (`nombreMin`–`nombreMax` letras).
     */
    sociedad: { licenciasSinSociedad: 3, coste: 3000, porConductorDiario: 10, nombreMin: 2, nombreMax: 24 },

    vehiculos: {
      modeloInicial: 'turismo',
      // Kilometraje (Iván, 19-11-2026): el coche con el que empiezas es de
      // segunda mano; los que compras salen nuevos, a 0 km.
      kmInicialMin: 85000,
      kmInicialMax: 100000,
      // Renovar coche (Iván, 19-11-2026): el viejo se vende por la mitad del
      // precio de un coche, menos cuantos más km tenga (nada a kmSinValor),
      // y nunca por menos que la chatarra (eventos.rotura.chatarra).
      venta: { fraccion: 0.5, kmSinValor: 230000 },
      // Alquilar coche (idea 5, Iván, 20-11-2026): para una licencia sin
      // coche, `jornadas` jornadas por `precio`, pagadas al alquilar (~133 €
      // por jornada). Equilibrio: más caro que comprar a partir de ~11
      // jornadas, para que sea un apaño y no la costumbre. El alquilado no se
      // gasta (sin avería definitiva ni más averías por km).
      alquiler: { jornadas: 3, precio: 400 },
      // Iván, 21-11-2026: cada coche propio cuesta un 10 % más que el
      // anterior (como las licencias, un poco menos), y el alquiler sube
      // igual para que nunca salga más a cuenta alquilar toda la flota.
      // Precio del siguiente = precio × factorSubida^(coches propios − 1).
      factorSubida: 1.10,
      // Estado del coche que se ve en pantalla: «Nuevo» hasta kmNuevo;
      // «Rodado» hasta que hay riesgo de avería definitiva; «Gastado» con
      // riesgo y «Al límite» desde probLimite por turno.
      kmNuevo: 20000,
      probLimite: 0.01,
      /*
       * Gamas de coche (idea 23, Iván 24-11-2026). El Toyota Corolla (id
       * 'turismo', el más usado hoy por los taxistas) lo tiene todo el mundo;
       * el Tesla y el Mercedes se desbloquean con las mejoras de tu personaje
       * (gamas). Precio base de cada uno: sube igual (factorSubida) por cada
       * coche propio, sea de la gama que sea. Equilibrio (precios y efectos
       * acordados con Iván a partir de una estimación de lo que deja cada uno).
       *   electrico: gasta kWh (kwh100Km × combustible.precioKwh); no le
       *              valen las mejoras de consumoCombustion (Híbridos y GLP)
       *   efecto     averia (probabilidad), cansancio (de sus conductores y el
       *              tuyo), propinaProb y propinaImporte, sinPagar,
       *              averiaCoste y pinchazoCoste: multiplican, sobre los topes
       *              del conductor; esperaZonas: su espera en esas zonas
       */
      modelos: {
        turismo: {
          nombre: 'Toyota Corolla',
          imagen: 'imagenes/coche-turismo.webp',   // ilustraciones de Iván (26-11-2026)
          aspecto: 2.7673,                 // ancho / alto del dibujo
          // Llantas recortadas del dibujo (solo la llanta, centrada en su eje por
          // simetría de los radios) para que giren en la cabecera: caja en
          // fracciones del dibujo (x, y, ancho, alto), trasera y delantera.
          ruedas: [{ imagen: 'imagenes/coche-turismo-rueda-1.webp', caja: [0.15001,  0.64013,  0.11591,  0.32075] }, { imagen: 'imagenes/coche-turismo-rueda-2.webp', caja: [0.75422,  0.64013,  0.11591,  0.32075] }],
          precio: 1500,              // Iván (valor de juego): precio del coche.
          consumoLitros100Km: 6      // Dato de Iván: consumo medio en ciudad.
        },
        tesla: {
          nombre: 'Tesla Model 3', descripcion: 'Eléctrico: la carga cuesta mucho menos que la gasolina, se avería mucho menos y el piloto automático cansa menos.',
          imagen: 'imagenes/coche-tesla.webp',
          aspecto: 3.0345,                 // ancho / alto del dibujo
          // Llantas recortadas del dibujo (solo la llanta, centrada en su eje por
          // simetría de los radios) para que giren en la cabecera: caja en
          // fracciones del dibujo (x, y, ancho, alto), trasera y delantera.
          ruedas: [{ imagen: 'imagenes/coche-tesla-rueda-1.webp', caja: [0.13001,  0.61521,  0.12045,  0.36552] }, { imagen: 'imagenes/coche-tesla-rueda-2.webp', caja: [0.76183,  0.61521,  0.12045,  0.36552] }],
          precio: 3500, electrico: true,
          kwh100Km: 15,              // PROVISIONAL (estimación de Claude, sin fuente)
          efecto: { averia: 0.4, cansancio: 0.8 }
        },
        mercedes: {
          imagen: 'imagenes/coche-mercedes.webp',
          aspecto: 3.2117,                 // ancho / alto del dibujo
          // Llantas recortadas del dibujo (solo la llanta, centrada en su eje por
          // simetría de los radios) para que giren en la cabecera: caja en
          // fracciones del dibujo (x, y, ancho, alto), trasera y delantera.
          ruedas: [{ imagen: 'imagenes/coche-mercedes-rueda-1.webp', caja: [0.15155,  0.59,  0.11591,  0.37226] }, { imagen: 'imagenes/coche-mercedes-rueda-2.webp', caja: [0.7741,  0.58964,  0.11591,  0.37226] }],
          nombre: 'Mercedes Clase S', descripcion: 'La gama más alta: muchas más propinas, clientes que pagan y más carreras en el Centro y el Aeropuerto; gasta más y sus reparaciones son más caras.',
          precio: 5000,
          consumoLitros100Km: 7.8,   // un 30 % más que el Corolla (Equilibrio)
          efecto: {
            // Iván, 24-11-2026: sus ventajas, un 10 % más fuertes que al principio.
            propinaProb: 2.2, propinaImporte: 1.65, sinPagar: 0.45,
            esperaZonas: { centro: 0.858, aeropuerto: 0.858 },   // ~+16,5 % de clientes
            averiaCoste: 1.5, pinchazoCoste: 1.5
          }
        }
      }
    },

    // Zona en la que empieza el jugador.
    zonaInicial: 'centro',

    /*
     * Zonas de Madrid.
     *   busquedaMin  minutos de juego dando vueltas hasta encontrar cliente
     *                cuando hay demanda de sobra (consume combustible).
     *   colaMin      minutos de cola en una parada (no consume combustible).
     *   colaMax      si está, la cola dura al azar entre colaMin y colaMax.
     *   viajes       tipos de carrera con su proporción; km y minutos parados
     *                entran en el taxímetro, "minutos" es lo que dura el viaje.
     *                Con tarifaFija se cobra ese precio fijo en vez del taxímetro
     *                (los km siguen contando para el combustible). Con
     *                tarifa: 't3', bajada de bandera de la tarifa 3 y taxímetro
     *                normal a partir de sus km incluidos.
     *   requiere     mejora que desbloquea la zona (si falta, está abierta).
     *   Los coches que sobran en una zona con cola esperan sin gastar; en una
     *   zona sin cola dan vueltas en vacío y gastan combustible.
     *   variacion    cuánto varía al azar una carrera hecha a mano (0,3 = ±30 %).
     *   demanda      viajes por hora que la zona ofrece a tu empresa, por hora
     *                del día (0 a 23), en laborable y en fin de semana.
     *   factorPorDia multiplica la demanda según el día (lunes a domingo).
     *                Opcional; si falta, vale 1 todos los días.
     */
    zonas: {
      centro: {
        nombre: 'Centro',
        descripcion: 'Muchas carreras cortas, demanda constante.',
        textoEspera: 'Buscando cliente por el centro',
        busquedaMin: 6,           // Equilibrio
        colaMin: 0,
        variacion: 0.4,
        viajes: [                 // Equilibrio
          { proporcion: 0.45, km: 1.8, minParado: 4, minutos: 9 },  // corta: dos calles
          { proporcion: 0.40, km: 3.5, minParado: 7, minutos: 16 }, // media
          { proporcion: 0.15, km: 7, minParado: 9, minutos: 26 }    // larga: a otro barrio
        ],
        demanda: {                // Equilibrio
          //            0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23
          // De madrugada el centro se vacía: la noche es del ocio nocturno.
          laborable:   [2, 1.5, 1.5, 1, 1.5, 3,  8, 16, 24, 26, 22, 20, 22, 24, 24, 20, 20, 22, 26, 26, 22, 14,  8,  4],
          finDeSemana: [6,  5,  4,  3,  2,  2,  4,  8, 12, 16, 20, 22, 24, 24, 22, 20, 20, 22, 24, 22, 18, 12,  9,  7]
        }
      },

      ocio: {
        nombre: 'Ocio nocturno',
        descripcion: 'Solo de noche y sobre todo en fin de semana. Siempre en tarifa 2.',
        textoEspera: 'Esperando a la salida de los locales',
        busquedaMin: 2,           // Equilibrio: hay gente esperando a la salida
        colaMin: 0,
        variacion: 0.4,
        viajes: [
          // Equilibrio: carreras más largas (de vuelta a casa) que en el centro.
          { proporcion: 0.30, km: 4, minParado: 2, minutos: 11 },     // a otra zona de copas
          { proporcion: 0.45, km: 8, minParado: 3, minutos: 20 },     // a casa
          { proporcion: 0.25, km: 13.5, minParado: 4.5, minutos: 30 } // a las afueras
        ],
        demanda: {                // Equilibrio
          //            0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23
          laborable:   [8,  6,  4,  2,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  3,  5,  7],
          finDeSemana: [26, 28, 26, 20, 14, 7,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0, 12, 18, 24]
        },
        // Equilibrio: el jueves ya hay ambiente y el viernes noche es el pico;
        // la madrugada del sábado y del domingo usan la tabla de fin de semana.
        //            L    M    X    J    V    S    D
        factorPorDia: [0.6, 0.6, 0.7, 1.2, 1.8, 1.2, 0.8]
      },

      aeropuerto: {
        nombre: 'Aeropuerto',
        descripcion: 'Barajas: carreras caras con tarifa fija, pero con cola en la parada.',
        textoEspera: 'En la cola de la parada de Barajas',
        requiere: 'aeropuerto',
        busquedaMin: 0,
        // Dato de Iván: en la parada de Barajas se espera entre 1 y 2 horas.
        colaMin: 60,
        colaMax: 120,
        variacion: 0.25,
        viajes: [                 // Equilibrio (proporciones y km)
          { proporcion: 0.60, tarifaFija: 't4', km: 15, minParado: 0, minutos: 25 }, // al interior de la M-30
          { proporcion: 0.15, tarifa: 't3', km: 7, minParado: 0, minutos: 12 },     // fuera de la M-30, cerca
          { proporcion: 0.15, tarifa: 't3', km: 18, minParado: 5, minutos: 24 },    // fuera de la M-30, media
          { proporcion: 0.10, tarifa: 't3', km: 32, minParado: 7, minutos: 38 }     // fuera de la M-30, lejos
        ],
        demanda: {                // Equilibrio
          //            0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23
          laborable:   [2,  1,  0,  0,  0,  2,  6, 10, 12, 12, 11, 10, 10, 11, 12, 12, 12, 12, 12, 11, 10,  9,  7,  4],
          finDeSemana: [2,  1,  0,  0,  0,  2,  5,  8, 10, 11, 11, 10, 10, 10, 11, 11, 11, 11, 11, 10, 10,  9,  7,  4]
        }
      },

      estaciones: {
        nombre: 'Estaciones',
        descripcion: 'Atocha y Chamartín: picos de demanda con la llegada de los trenes.',
        textoEspera: 'En la parada de la estación',
        requiere: 'estaciones',
        busquedaMin: 2,
        colaMin: 6,               // Equilibrio
        variacion: 0.4,
        viajes: [                 // Equilibrio
          { proporcion: 0.35, km: 3, minParado: 5, minutos: 11 },   // al hotel de al lado
          { proporcion: 0.45, km: 6, minParado: 7, minutos: 18 },   // a casa
          { proporcion: 0.20, km: 11, minParado: 10, minutos: 29 }  // al otro extremo
        ],
        demanda: {                // Equilibrio: picos de llegada de trenes
          //            0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23
          laborable:   [0,  0,  0,  0,  0,  1,  4, 12, 20, 18, 10,  8, 10, 12, 16, 10,  8, 12, 18, 20, 16, 14, 10,  4],
          finDeSemana: [0,  0,  0,  0,  0,  0,  2,  6, 10, 12, 12, 10, 12, 14, 14, 10, 10, 14, 18, 18, 14, 12,  8,  3]
        }
      }
    },

    /*
     * Mejoras. Cada una se compra una vez.
     *   rama      rama del árbol (ramasMejoras); el orden de la lista es el de la rama.
     *   requiere  mejora anterior de su rama (basta su nivel 1). Cada rama es
     *             una cadena (Iván, 18-11-2026): solo la primera no pide nada.
     *   efecto    segundosDia: alarga el día (segundos reales)
     *             consumo / busqueda / cola / demanda: multiplicadores
     *             consumoCombustion: como consumo, solo en coches de gasolina
     *             soloZona: el efecto solo cuenta en esa zona
     *             desbloqueaZona: abre una zona
     *             cuotaEmisora: activa el coste diario de la emisora
     *             dejarVolante: permite dejar de conducir y solo gestionar
     *             seguro: multiplica el seguro diario de cada coche
     *             gestionZonas: los conductores eligen la mejor zona cada hora
     *                           (sin ella, eligen al azar entre las que tienen clientes)
     *             propinaProb: suma a la probabilidad de propina
     *             propinaImporte: multiplica el importe de la propina
     *             averiaDias / averiaCoste: multiplican días y coste de una avería
     *             monedasMin / monedasMax: € que encuentra cada conductor al acabar su turno
     *             baja: multiplica la probabilidad de baja de los conductores
     *                   (junto con su rasgo y sus objetos, bajo el mismo tope)
     *             almacen: objetos de más que caben en el almacén
     *             publicidad: € por cada carrera del día, al cerrar la caja
     *             pinchazoHoras / pinchazoCoste: un pinchazo sin rueda para esas
     *                           horas (no el resto del turno) y multiplica su coste
     *             precioCoche: multiplica el precio de cada coche
     *             pesosCandidatos: probabilidad de cada categoría en los candidatos
     *             porcentajeConductor: multiplica la parte de cada carrera que se queda el conductor
     *   niveles   mejora por niveles: cada nivel tiene su precio y su efecto
     *             (el efecto del nivel es el total, no se suma al anterior).
     * Precios y efectos: Equilibrio. Precios revisados el 16-11-2026 (propuesta C): cada
     * mejora se paga en unas 1–2 h de juego con 6 coches (medido con un bot).
     */
    /*
     * Historia (fase 1 de los personajes guía, Iván 25-11-2026): la
     * introducción que sale una sola vez, al empezar la primera partida.
     * Cada escena lleva su ilustración (imagenes/, hecha por Iván con IA;
     * si aún no está, se ve un fondo provisional) y su texto.
     */
    historia: {
      intro: [
        { imagen: 'imagenes/intro-1.webp',
          titulo: 'Viernes, 18:00',
          texto: 'Tu jefe te llama al despacho: «Los números no salen. Recoge tus cosas». Diez años en la empresa y sales con una caja de cartón.' },
        { imagen: 'imagenes/intro-2.webp',
          titulo: 'Esa misma noche',
          texto: 'Vuelves a casa en taxi. El taxista, a punto de jubilarse, te cuenta que vende su licencia y su viejo Corolla. Sacas el finiquito y haces cuentas en una servilleta…' },
        { imagen: 'imagenes/intro-3.webp',
          titulo: 'Lunes, 7:00',
          texto: 'Un Corolla con 90.000 km, una licencia y 50 € en la caja. Esta vez el jefe eres tú.' }
      ],
      /*
       * Eventos de clientes (fase 3; Iván, 25-11-2026; docs/eventos-clientes.md).
       * Uno cada `cadaJornadas` jornadas (Equilibrio), en un momento al azar
       * con alguien trabajando: a ti o a un conductor con turno (decides tú
       * por él). El juego se para hasta que eliges una de las tres opciones.
       *   momento   'dia' o 'noche' (turno de la hora); sin él, cualquiera
       *   unico     trae a ese ÚNICO (solo si no está en tu flota ni en tu agenda)
       *   requiereSociedad  solo si ya has montado la SL
       *   opciones  [{ texto, resultados: [{ prob, texto, ...efectos }] }]
       * Efectos de un resultado (todos opcionales):
       *   dinero    € que entran (la carrera y lo que dejen); [min, max] al azar
       *   coste     € que salen; [min, max] al azar
       *   parado    minutos de juego parado (tu taxi o el del conductor)
       *   xp        experiencia de tu personaje; a un conductor, × xpConductor
       *   objeto    id de un objeto o { categoria } (uno al azar): al almacén
       *   unico     'agenda' (en tu agenda: siempre entre los candidatos hasta
       *             contratarlo) u 'oferta' (además, con `descuentoOferta` hasta el cierre: gratis)
       * Los importes son fijos (Iván: los viajes, siempre lo mismo): Pinto
       * 33 € y Aranjuez 82 €, tarifa 1 con km aproximados (Iván los da por buenos).
       */
      eventos: {
        activos: true,
        cadaJornadas: { min: 5, max: 8 },
        // Minutos desde las 7:00 de la jornada en que puede salir (8:00 a 6:00).
        minutoDesde: 60, minutoHasta: 1380,
        reintentoMinutos: 60,        // si en ese momento no trabaja nadie
        xpConductor: 0.25,           // tus carreras dan 4 puntos y las suyas 1
        descuentoOferta: 1,               // «Vente a trabajar conmigo»: gratis (Iván, 26-11-2026)
        lista: [
          { id: 'paconi', titulo: 'Del 12 de Octubre a Pinto', imagen: 'imagenes/evento-paconi.webp', momento: 'dia', unico: 'paconi',
            texto: 'En la puerta del Hospital 12 de Octubre suben un señor de 67 años con acento venezolano y su hija, enfermera, que acaba el turno. Van a Pinto, donde vive él. Por el camino cuenta que en su país fue taxista, que ahora está en paro y que le van a desahuciar. «Es una trampa, muchachos.»',
            opciones: [
              { texto: '«Lo siento, tengo la flota llena»', resultados: [
                { texto: 'Carrera cobrada. Se despide con un «Engañoso.» Quizá vuelvas a verlo.', dinero: 33 }] },
              { texto: '«Toma mi número»', resultados: [
                { texto: 'Carrera cobrada. Paconi queda en tu agenda: lo tienes el primero entre los candidatos hasta que lo contrates.', dinero: 33, unico: 'agenda' }] },
              { texto: '«Vente a trabajar conmigo»', resultados: [
                { texto: 'Carrera cobrada. Paconi trabajaría contigo gratis si lo contratas hoy: lo tienes el primero entre los candidatos. Si no lo contratas antes del cierre, queda en tu agenda a precio normal.', dinero: 33, unico: 'oferta' }] }
            ] },
          { id: 'pelado', titulo: 'De Alcorcón a La Montaña', imagen: 'imagenes/evento-pelado.webp', momento: 'dia', unico: 'pelado',
            texto: 'En Alcorcón sube un argentino enorme y calvo que va a La Montaña, el barrio residencial de Aranjuez. Trabaja para la competencia, en Uber, pero no le dejan echar horas extra y con siete hijos no llega a fin de mes. «Siete pibes en casa, hermano: hay que laburar.»',
            opciones: [
              { texto: '«Lo siento, tengo la flota llena»', resultados: [
                { texto: 'Carrera cobrada. «Mucha lechuga suelta, jefe.» Sigue en Uber; quizá vuelvas a verlo.', dinero: 82 }] },
              { texto: '«Toma mi número»', resultados: [
                { texto: 'Carrera cobrada. El Pelado queda en tu agenda: lo tienes el primero entre los candidatos hasta que lo contrates.', dinero: 82, unico: 'agenda' }] },
              { texto: '«Vente a trabajar conmigo»', resultados: [
                { texto: 'Carrera cobrada. El Pelado trabajaría contigo gratis si lo contratas hoy: lo tienes el primero entre los candidatos. Si no lo contratas antes del cierre, queda en tu agenda a precio normal.', dinero: 82, unico: 'oferta' }] }
            ] },
          { id: 'cena', titulo: 'Las tres de la cena de empresa', imagen: 'imagenes/evento-cena.webp', momento: 'noche',
            texto: 'Tres mujeres de unos cincuenta, con más copas de la cuenta tras una celebración del trabajo. Hay que dejar a cada una en su casa: Pozuelo, Boadilla y Las Rozas. 100 € de carrera. La que va delante está cada vez más pálida.',
            opciones: [
              { texto: '«Paramos las veces que haga falta»', resultados: [
                { texto: 'Seis paradas: una hora perdida. Llegan limpias y dejan 20 € de propina.', dinero: 120, parado: 60 }] },
              { texto: '«Bolsa, ventanilla abajo y conduzco suave»', resultados: [
                { prob: 0.5, texto: 'Llegan sin incidentes, con 20 minutos de más.', dinero: 100, parado: 20 },
                { prob: 0.5, texto: 'No llega a tiempo a la bolsa: limpieza y una hora más parado.', dinero: 100, coste: [50, 90], parado: 80 }] },
              { texto: '«Esto lleva suplemento por paradas»', resultados: [
                { prob: 0.7, texto: 'Pagan 30 € de suplemento sin rechistar. Una hora de paradas.', dinero: 130, parado: 60 },
                { prob: 0.3, texto: 'Pagan el suplemento… y al día siguiente ponen una reclamación: 150 €.', dinero: 130, coste: 150, parado: 60 }] }
            ] },
          { id: 'rivas', titulo: 'Rivas por 20 €', imagen: 'imagenes/evento-rivas.webp', momento: 'dia',
            texto: 'Parada de la plaza de toros de Las Ventas; aún falta un rato para que salga la gente. Un tío muy chulo va preguntando uno por uno a los compañeros de la fila y nadie le quiere llevar. Llega al último: «¿Me llevas a Rivas por 20 €?». Por taxímetro serían unos 35.',
            opciones: [
              { texto: '«Venga, sube»', resultados: [
                { prob: 0.6, texto: '20 € y una buena obra.', dinero: 20, xp: 40 },
                { prob: 0.4, texto: 'Al llegar, agradecido, redondea a 35 €. Una buena obra.', dinero: 35, xp: 40 }] },
              { texto: '«Con taxímetro, sí»', resultados: [
                { prob: 0.5, texto: 'Se lo piensa y acepta: 35 €.', dinero: 35 },
                { prob: 0.5, texto: 'Se va andando, muy digno. Sigues en la fila.', dinero: 0 }] },
              { texto: '«Espero a los toros»', resultados: [
                { texto: 'Media hora de espera y una buena carrera a la salida de los toros: 45 €.', dinero: 45, parado: 30 }] }
            ] },
          { id: 'boadilla', titulo: 'Control en Boadilla', imagen: 'imagenes/evento-boadilla.webp', momento: 'noche',
            texto: 'Saliendo de una urbanización de lujo de Boadilla del Monte, con una clienta camino de la estación. El vigilante abre la verja y, al salir a la calle, se cruzan dos coches de policía de paisano: manos arriba y abrir la ventanilla de atrás. La carrera son 25 €.',
            opciones: [
              { texto: '«Manos arriba, sin rechistar»', resultados: [
                { texto: 'Control rutinario: todo en orden en diez minutos. La clienta, aún temblando, deja 10 € de propina.', dinero: 35, parado: 10 }] },
              { texto: '«¿Otra vez vosotros?»', resultados: [
                { prob: 0.5, texto: 'Les hace gracia. Cinco minutos y a seguir.', dinero: 25, parado: 5 },
                { prob: 0.5, texto: 'No les hace ninguna gracia: revisan el coche entero. 45 minutos.', dinero: 25, parado: 45 }] },
              { texto: '«Me bajo a ver qué pasa»', resultados: [
                { texto: 'Mala idea: una hora retenido y la clienta se va andando. Carrera perdida.', dinero: 0, parado: 60 }] }
            ] },
          { id: 'conseguidor', titulo: 'Little Nico', imagen: 'imagenes/evento-conseguidor.webp', momento: 'dia',
            texto: 'Sube un chaval muy joven con un traje impecable, hablando por dos móviles a la vez. Dice que es asesor de no sé qué ministerio y que conoce a todo el mundo. La carrera son 30 €.',
            opciones: [
              { texto: '«Escucharle»', resultados: [
                { texto: 'Qué historias. 30 € y mucha experiencia.', dinero: 30, xp: 100 }] },
              { texto: '«Aceptar su tarjeta»', resultados: [
                { prob: 0.5, texto: 'Al día siguiente llama: un servicio VIP de 150 €.', dinero: 180 },
                { prob: 0.5, texto: 'Era humo: 50 € «de gestión» por una reunión que nunca existió.', dinero: 30, coste: 50 }] },
              { texto: '«Por adelantado, por favor»', resultados: [
                { texto: 'Paga y se baja ofendido. 30 €.', dinero: 30 }] }
            ] },
          { id: 'trapero', titulo: 'Lit', imagen: 'imagenes/evento-trapero.webp', momento: 'noche',
            texto: 'Sube un trapero argentino muy famoso, con gafas de sol de noche, y dos colegas grabándolo todo con el móvil. La carrera son 40 €.',
            opciones: [
              { texto: '«¿Me firmas una foto?»', resultados: [
                { prob: 0.6, texto: 'Encantado: foto, firma y 50 € de propina.', dinero: 90 },
                { prob: 0.4, texto: 'Se agobia un poco. Solo la carrera.', dinero: 40 }] },
              { texto: '«Le pongo su canción en la radio»', resultados: [
                { prob: 0.5, texto: 'Se viene arriba y la cantan los tres: 80 € de propina.', dinero: 120 },
                { prob: 0.5, texto: 'Vergüenza ajena. Solo la carrera.', dinero: 40 }] },
              { texto: '«Como si no le conociera»', resultados: [
                { texto: '20 € de propina «por la discreción».', dinero: 60 }] }
            ] },
          { id: 'ruso', titulo: 'El ruso y sus dos rubias', imagen: 'imagenes/evento-ruso.webp', momento: 'noche',
            texto: 'Sube un señor ruso con abrigo largo, dos mujeres rubias y ninguna prisa. La carrera son 60 €.',
            opciones: [
              { texto: '«No hacer preguntas»', resultados: [
                { texto: '200 € en efectivo. «Para el silencio.»', dinero: 200 }] },
              { texto: '«Darle conversación»', resultados: [
                { prob: 0.5, texto: 'Le cae bien: 300 € y una de ellas se olvida un reloj en el asiento.', dinero: 300, objeto: { categoria: 'S' } },
                { prob: 0.5, texto: 'No le gusta nada. 60 € justos, y gracias.', dinero: 60 }] },
              { texto: '«Rechazar el viaje»', resultados: [
                { texto: 'Por si acaso.', dinero: 0 }] }
            ] },
          { id: 'maletero', titulo: 'Cinco en un coche de cuatro', imagen: 'imagenes/evento-maletero.webp', momento: 'noche',
            texto: 'Cinco chavales de fiesta y el coche admite cuatro. Piden que uno vaya escondido en el maletero. La carrera son 25 €.',
            opciones: [
              { texto: '«Venga, al maletero»', resultados: [
                { prob: 0.75, texto: 'Llegan sin problemas y dejan 15 € de propina.', dinero: 40 },
                { prob: 0.25, texto: 'Control de policía: 200 € de multa y media hora parado.', dinero: 40, coste: 200, parado: 30 }] },
              { texto: '«Cuatro, y el quinto que pida otro»', resultados: [
                { texto: '25 € y ningún lío.', dinero: 25 }] },
              { texto: '«Llevo a cuatro y vuelvo a por el quinto»', resultados: [
                { texto: 'Dos viajes: 45 € y 40 minutos.', dinero: 45, parado: 40 }] }
            ] },
          // Daniela (Iván, 26-11-2026): solo a partir de la SL (requiereSociedad).
          // Unos 550 km: 700 € y 6 horas fuera (aprobado por Iván).
          { id: 'daniela', titulo: 'De Parla a Almería', imagen: 'imagenes/evento-daniela.webp', momento: 'dia', unico: 'daniela',
            requiereSociedad: true,
            texto: 'En Parla sube una familia con maletas para todo el verano: el padre, Daniel; la madre, Sonia; Álvaro, un bebé de un año en su sillita, y Daniela, una niña de seis con una carpeta bajo el brazo. Van a Almería. Son más de 500 km: Daniel, que además es su representante, cuenta que Daniela lleva las cuentas de casa, negocia su propia paga y ya tiene tarjetas de visita. Daniela mira por el retrovisor: «¿Y tu flota qué tal va?».',
            opciones: [
              { texto: '«Es muy pequeña para trabajar»', resultados: [
                { texto: '700 € y seis horas de viaje. Daniela se cruza de brazos: «Tú te lo pierdes». Quizá vuelvas a verla.', dinero: 700, parado: 360 }] },
              { texto: '«Te doy mi tarjeta, Daniel»', resultados: [
                { texto: '700 € y seis horas de viaje. Daniela queda en tu agenda: la tienes la primera entre los candidatos hasta que la contrates.', dinero: 700, parado: 360, unico: 'agenda' }] },
              { texto: '«¿Cuándo empiezas, jefa?»', resultados: [
                { texto: '700 € y seis horas de viaje. Daniela trabajaría contigo gratis si la contratas hoy: la tienes la primera entre los candidatos. Si no, queda en tu agenda a precio normal.', dinero: 700, parado: 360, unico: 'oferta' }] }
            ] },
          // Cinco más (Iván, 26-11-2026; docs/propuesta-novedades.md, 5). Sin
          // ilustración todavía: la hoja sale con el fondo provisional.
          { id: 'novia', titulo: 'La novia a la fuga', imagen: 'imagenes/evento-novia.webp', momento: 'dia',
            texto: 'A la puerta de una iglesia de Chamberí, una novia con el vestido recogido en los brazos abre la puerta de atrás y se tira dentro: «¡Arranque, por lo que más quiera!». Por el retrovisor, el novio corre hacia el taxi.',
            opciones: [
              { texto: '«Arrancar»', resultados: [
                { prob: 0.7, texto: 'La deja en casa de una amiga: 25 € y 50 € de propina «para que no cuente nada».', dinero: 75 },
                { prob: 0.3, texto: 'El novio los alcanza en un semáforo, se sube y se reconcilian dentro. 25 € y media hora parado.', dinero: 25, parado: 30 }] },
              { texto: '«Esperar al novio»', resultados: [
                { prob: 0.5, texto: 'Suben los dos y piden ir al banquete: 40 €.', dinero: 40 },
                { prob: 0.5, texto: 'Discuten en la acera y se van andando, cada uno por su lado. Nada.', dinero: 0 }] },
              { texto: '«¿Está usted segura?»', resultados: [
                { texto: 'Se lo piensa y vuelve a la iglesia. Al salir, el padrino deja 60 € «por salvar la boda».', dinero: 60, xp: 60 }] }
            ] },
          { id: 'turista', titulo: 'El turista de Barajas', imagen: 'imagenes/evento-turista.webp', momento: 'dia',
            texto: 'Sale de la T4 un turista despistado, con una mochila enorme, que pide «the centre, please». Con tarifa fija son 33 €. Un compañero de la fila guiña un ojo: «Dale una vuelta por la M-40…».',
            opciones: [
              { texto: '«Tarifa fija, como debe ser»', resultados: [
                { texto: '33 € y una reseña de cinco estrellas.', dinero: 33, xp: 40 }] },
              { texto: '«La M-40 es muy bonita»', resultados: [
                { prob: 0.6, texto: 'Ni se entera: 78 €.', dinero: 78 },
                { prob: 0.4, texto: 'Llevaba el GPS en el móvil y pone una denuncia: 78 € y 400 € de multa.', dinero: 78, coste: 400 }] }
            ] },
          { id: 'parto', titulo: '¡Que viene!', imagen: 'imagenes/evento-parto.webp',
            texto: 'Sube una pareja: ella acaba de romper aguas. El hospital está a quince minutos… si no se pilla ningún semáforo.',
            opciones: [
              { texto: '«¡A toda pastilla!»', resultados: [
                { prob: 0.7, texto: 'Llegan a tiempo: 20 € y 100 € de propina. Qué nervios.', dinero: 120, xp: 100 },
                { prob: 0.3, texto: 'Salta un radar: 200 € de multa. Pero llegan a tiempo y dejan 120 €.', dinero: 120, coste: 200, xp: 100 }] },
              { texto: '«Llamar al 112 y esperar la ambulancia»', resultados: [
                { texto: 'La ambulancia tarda veinte minutos. Todo sale bien, pero ni un euro.', dinero: 0, parado: 20, xp: 30 }] }
            ] },
          { id: 'maletin', titulo: 'El maletín', imagen: 'imagenes/evento-maletin.webp', momento: 'dia',
            texto: 'Acaba de bajarse un ejecutivo en AZCA y en el asiento de atrás hay un maletín de cuero. Pesa bastante.',
            opciones: [
              { texto: '«Llevárselo a su oficina»', resultados: [
                { texto: 'Media hora buscando su despacho. Lo agradece con 150 € de propina.', dinero: 150, parado: 30, xp: 40 }] },
              { texto: '«Dejarlo en objetos perdidos»', resultados: [
                { prob: 0.3, texto: 'Un cuarto de hora. Al día siguiente llama para dar las gracias: 100 € de recompensa.', dinero: 100, parado: 15 },
                { prob: 0.7, texto: 'Un cuarto de hora de trámites y nunca más se supo.', dinero: 0, parado: 15 }] },
              { texto: '«Abrirlo, por si acaso»', resultados: [
                { prob: 0.5, texto: 'Papeles aburridos… y un bolígrafo de oro que nadie va a echar de menos. Un objeto de categoría A.', dinero: 0, objeto: { categoria: 'A' } },
                { prob: 0.5, texto: 'Vuelve justo en ese momento: «¿Qué hace?». 100 € de reclamación.', dinero: 0, coste: 100 }] }
            ] },
          { id: 'final', titulo: 'Noche de final', imagen: 'imagenes/evento-final.webp', momento: 'noche',
            texto: 'Noche de final de Champions. Cuatro aficionados con bufandas y la cara pintada, afónicos y felices, quieren ir a la fuente a celebrarlo.',
            opciones: [
              { texto: '«¡A la fuente!»', resultados: [
                { prob: 0.6, texto: '45 € y 40 € de propina de campeones.', dinero: 85 },
                { prob: 0.4, texto: 'Se ponen a botar y arrancan el retrovisor: 45 €, 120 € de taller y media hora parado.', dinero: 45, coste: 120, parado: 30 }] },
              { texto: '«Hoy me voy a casa»', resultados: [
                { texto: 'Luz verde apagada. Otro día será.', dinero: 0 }] }
            ] }
        ]
      }
    },
    /*
     * El grupo de la flota (Iván, 26-11-2026; docs/propuesta-novedades.md, 6):
     * un chat que se abre al montar la SL. El primer mensaje es tuyo (ya
     * escrito; lo puedes cambiar) y contestan dos conductores. Al cerrar
     * cada jornada, de `porCierre.min` a `porCierre.max` conversaciones: las
     * de lo que ha pasado ese día (`cuando`) primero y, si faltan, charla.
     *   cuando   lo que tiene que haber pasado en la jornada (sin él, charla)
     *   requiere ÚNICOS que tienen que estar en la flota (con turno), o
     *            'tocayo' (un Paco o un Francisco con turno) o 'tocayos3' (tres)
     *   foto     clave de `fotos` (imagenes/; sin ella, un hueco «Foto»)
     *   enfado   c1 te falta al respeto: su mensaje lleva «Despedir gratis»
     *            (despedirPorBarbaridad(); nunca un ÚNICO)
     *   prob     probabilidad de que salga cuando le toca (para las raras)
     *   grupo    como mucho una de cada grupo por cierre (el coro de Paconi)
     *   lineas   [quién, texto]: 'p1', 'p2' y 'p3' (tres tocayos de Paconi),
     *            'c1' y 'c2' (conductores de tu flota; en
     *            las de `cuando`, c1 es el que lo vivió), 'tu' o un ÚNICO.
     *            En el texto, {c1}, {c2}, {tu}, {zona}, {empresa} y {km} (los
     *            del coche de quien abre la conversación).
     * Se guardan los últimos `maxMensajes` mensajes; no se repite una
     * conversación de las últimas `sinRepetir`. Equilibrio.
     */
    chat: {
      maxMensajes: 80,
      porCierre: { min: 1, max: 3 },
      sinRepetir: 15,
      primero: {
        texto: 'Equipo: hoy hemos montado {empresa} S.L. El negocio va bien gracias a vosotros. ¡A por más carreras!',
        lineas: [['c1', '¡Enhorabuena, jefe!'], ['c2', '¿Eso significa subida de sueldo?']]
      },
      fotos: {
        rueda: 'imagenes/chat-rueda.webp', arbol: 'imagenes/chat-arbol.webp', amanecer: 'imagenes/chat-amanecer.webp', planta: 'imagenes/chat-planta.webp',
        bocadillo: 'imagenes/chat-bocadillo.webp', dibujo: 'imagenes/chat-dibujo.webp',
        // Iván, 27-11-2026.
        vomito: 'imagenes/chat-vomito.webp', tormenta: 'imagenes/chat-tormenta.webp', flores: 'imagenes/chat-flores.webp',
        llaves: 'imagenes/chat-llaves.webp', billete: 'imagenes/chat-billete.webp', barajas: 'imagenes/chat-barajas.webp',
        reserva: 'imagenes/chat-reserva.webp'
      },
      conversaciones: [
        // Lo que ha pasado en la jornada.
        { id: 'sinPagar1', cuando: 'sinPagar', requiere: ['pelado'], lineas: [['c1', 'Hola grupo, hoy se me fueron sin pagar… ¡Vaya día!'], ['pelado', 'Che, {c1}, mucho ánimo. A mí ya no se me va nadie.']] },
        { id: 'sinPagar2', cuando: 'sinPagar', lineas: [['c1', 'Uno me dijo que iba a sacar dinero al cajero. Sigo esperando.'], ['c2', 'El clásico 😂']] },
        { id: 'pinchazo1', cuando: 'pinchazo', lineas: [['c1', 'Pinchazo en plena Castellana. Con traje y todo.'], ['c2', 'Foto o no pasó. 📸']] },
        { id: 'pinchazo2', cuando: 'pinchazo', foto: 'rueda', lineas: [['c1', 'Esta es mi tarde.']] },
        { id: 'averia', cuando: 'averia', lineas: [['c1', 'El coche ha dicho basta. Me voy al taller, jefe.'], ['tu', 'Ánimo, mañana más. 🔧']] },
        { id: 'baja', cuando: 'baja', lineas: [['c1', 'Jefe, mañana no voy, tengo 39 de fiebre.'], ['c2', 'Ponte bueno 💪']] },
        { id: 'vomito', cuando: 'vomito', lineas: [['c1', 'Hoy he limpiado el coche tres veces. No pregunten.'], ['c2', 'Ocio nocturno, ¿verdad?'], ['c1', 'Ocio nocturno. 🤢']] },
        { id: 'lluvia', cuando: 'lluvia', lineas: [['c1', 'Llueve y todo Madrid quiere taxi a la vez.'], ['c2', 'Es el mejor día del año.']] },
        { id: 'tormenta', cuando: 'tormenta', requiere: ['paconi'], lineas: [['c1', 'Granizo en {zona}. Me he metido en un túnel a esperar.'], ['paconi', 'Es una trampa, muchachos.']] },
        { id: 'propina', cuando: 'propina', lineas: [['c1', '¡Un señor me ha dejado una propina de las buenas!'], ['c2', '¿Le has dado tu número? 😏']] },
        { id: 'nivel', cuando: 'nivel', lineas: [['c1', 'Ya me conozco {zona} mejor que mi casa.'], ['c2', 'Eso es porque no vas por casa.']] },
        { id: 'legendario', cuando: 'legendario', lineas: [['c1', 'Me he encontrado una cosa en el asiento de atrás que no sé ni qué es.'], ['c2', 'Llévala al almacén, que el jefe colecciona.']] },
        { id: 'objeto', cuando: 'objeto', lineas: [['c1', 'Devuelto un móvil a una señora. Me ha dado un abrazo.'], ['c2', 'Qué bonito. Yo encontré una dentadura.']] },
        { id: 'cliente', cuando: 'cliente', lineas: [['c1', 'Hoy he llevado a alguien famoso. No puedo decir quién.'], ['c2', '¿Era el de las gafas?'], ['c1', 'No puedo decir nada.']] },
        { id: 'pesetas', cuando: 'pesetas', lineas: [['c1', 'Me ha pillado un pesetas trabajando en libranza. Una multa como un piano.'], ['c2', 'Ay…']] },
        { id: 'record', cuando: 'record', lineas: [['tu', 'Récord de caja hoy. ¡Sois unos máquinas! 🏆'], ['c1', '¿Eso es una subida de sueldo?'], ['tu', 'Es un «sois unos máquinas».']] },
        { id: 'negativo', cuando: 'negativo', lineas: [['c1', 'Jefe, ¿todo bien? Te veo serio.'], ['tu', 'Mañana remontamos.']] },
        { id: 'cocheNuevo', cuando: 'cocheNuevo', lineas: [['c1', 'Huele a nuevo el coche, jefe. ¡Gracias!'], ['c2', 'Yo quiero el Mercedes. 😎']] },
        { id: 'rotura', cuando: 'rotura', lineas: [['c1', 'El coche ha muerto. Descanse en paz. 🪦'], ['c2', 'Ha sido un buen coche. Cuántos kilómetros de servicio.']] },
        { id: 'licencia', cuando: 'licencia', lineas: [['c1', '¿Licencia nueva? ¡Esto crece!'], ['c2', 'Que contraten a alguien majo.']] },
        { id: 'nuevo', cuando: 'nuevo', lineas: [['c2', 'Bienvenido al grupo, {c1}.'], ['c1', '¡Gracias! ¿Dónde se aparca para comer?'], ['c2', 'Esa es la pregunta del millón.']] },
        // Con foto (Iván, 27-11-2026).
        { id: 'vomitoFoto', cuando: 'vomito', foto: 'vomito', lineas: [['c1', 'Sin comentarios.'], ['c2', 'Te acompaño en el sentimiento.']] },
        { id: 'tormentaFoto', cuando: 'tormenta', foto: 'tormenta', lineas: [['c1', 'Hoy no se ve ni el taxímetro.'], ['c2', 'Pues es cuando más se factura.']] },
        { id: 'flores', cuando: 'objeto', foto: 'flores', lineas: [['c1', 'Alguien se ha quedado sin cita esta noche.'], ['c2', 'O sin perdón 😬']] },
        { id: 'llaves', cuando: 'cocheNuevo', foto: 'llaves', lineas: [['c1', '¡Estreno!'], ['c2', 'Huele a nuevo hasta por foto.']] },
        { id: 'billete', cuando: 'propina', foto: 'billete', lineas: [['c1', 'Hay gente buena en el mundo.'], ['c2', '¿Y dónde estaba esa gente cuando la llevaba yo?']] },
        // Enfados (Iván, 27-11-2026): te dicen una barbaridad y puedes
        // despedirle gratis. Raras: un 30 % de las veces que les toca.
        { id: 'enfadoRata', enfado: true, prob: 0.3, lineas: [['c1', 'Jefe, con lo que pagas no me da ni para el gasoil. Eres un rata.'], ['c2', 'Uff… 😬']] },
        { id: 'enfadoFlota', enfado: true, prob: 0.3, lineas: [['c1', 'Mira, el día que me vaya de esta flota de mierda lo voy a celebrar.'], ['c2', 'Que lo está leyendo el jefe…']] },
        { id: 'enfadoInutil', enfado: true, prob: 0.3, lineas: [['c1', 'Otro pinchazo y otro día sin propinas. El que monta una flota con estos coches es un inútil.'], ['c2', 'Tío, que el jefe está en el grupo.'], ['c1', 'Pues que lo lea.']] },
        // Charla normal.
        { id: 'barajasFoto', foto: 'barajas', lineas: [['c1', 'Hora y media y sigo aquí.'], ['c2', 'Saluda a los de la fila de mi parte.']] },
        { id: 'obras', lineas: [['c1', 'Buenos días, grupo. Hoy hay obras en Gran Vía, ojo.']] },
        { id: 'gasolinera', lineas: [['c1', '¿Alguien sabe a qué hora cierra la gasolinera de Méndez Álvaro?'], ['c2', 'A las 23:00.']] },
        { id: 'barcelona', lineas: [['c1', 'Hoy he visto un taxi de Barcelona en Atocha. Perdidísimo.'], ['c2', 'Pobre hombre.']] },
        { id: 'taper', lineas: [['c1', '¿Quién se ha dejado un táper en la cochera?'], ['c2', 'Es mío, no lo toquéis. 😠']] },
        { id: 'barajas', lineas: [['c1', 'Cola en Barajas de hora y media. Me he leído medio libro.'], ['c2', '¿Cuál?'], ['c1', 'El del carné de conducir, por si acaso.']] },
        { id: 'vida', lineas: [['c1', 'Hoy un cliente me ha contado su vida entera en 8 minutos.'], ['c2', 'Récord.']] },
        { id: 'agosto', lineas: [['c1', 'Madrid en agosto es otra ciudad.'], ['c2', '¿Es agosto?'], ['c1', 'En mi corazón, siempre.']] },
        { id: 'partido', lineas: [['c1', '¿Partido esta noche?'], ['c2', 'Noche de trabajo, entonces.']] },
        { id: 'arbol', lineas: [['c1', 'Me han pedido ir «a la calle esa que tiene un árbol».'], ['c2', '¿Y?'], ['c1', 'La he encontrado.']] },
        { id: 'cafe', lineas: [['c1', 'Café en la parada de Atocha a las 10, ¿quién se viene?'], ['c2', 'Voy. ☕']] },
        { id: 'amanecer', foto: 'amanecer', lineas: [['c1', 'Esto no lo ve un oficinista.']] },
        { id: 'videojuego', lineas: [['c1', 'Un niño me ha preguntado si el taxímetro es un videojuego.'], ['c2', 'Lo es si llevas racha.']] },
        { id: 'sospechoso', lineas: [['c1', 'Hoy no ha llovido, no ha pinchado nadie y no me ha vomitado nadie.'], ['c2', 'Sospechoso. 🤔']] },
        // Iván, 27-11-2026.
        { id: 'cucarachos', lineas: [['c1', 'Cada vez más cucarachos 🤮…'], ['c2', 'Últimamente contratan a cualquiera.']] },
        { id: 'emt', lineas: [['c1', 'Los de la EMT me la tienen jurada, ¡casi me da!'], ['c2', 'Putos rectángulos, siempre jodiendo.']] },
        // Paconi.
        { id: 'paconiM30', requiere: ['paconi'], lineas: [['paconi', 'Buenos días, mis tigres. Recuerden que hoy cortan la M-30 por obras.'], ['paconi', 'No pasen por allá, es una trampa.'], ['c1', 'Ok.'], ['c2', '¡Gracias, Paconi!']] },
        { id: 'paconiAnfibio', requiere: ['paconi'], lineas: [['paconi', 'Buen día, grupo. ¿Saben si el coche es anfibio?… Tuve un pequeño problema, jefe.']] },
        { id: 'paconiFreno', requiere: ['paconi'], lineas: [['paconi', 'El freno está esponjoso, ¿lo notaron?'], ['c1', 'Paconi, es tu pie.']] },
        // Cambiadas por Iván (26-11-2026). «Sheet» mal escrito a propósito.
        { id: 'paconiPlanta', requiere: ['paconi'], foto: 'planta', lineas: [['paconi', 'Espero que me la rieguen, muchachos, no me hagan enfadar. 🌱']] },
        { id: 'paconiShit', requiere: ['paconi'], foto: 'arbol', lineas: [['paconi', 'Como dirían los yankees: sheet happens.'], ['c2', '¿Qué ha pasado?'], ['paconi', 'El árbol lo colocaron bien engañoso.']] },
        { id: 'paconiTocayo', requiere: ['paconi', 'tocayo'], lineas: [['paconi', 'Jefe, creo que debería adelantarnos el sueldo de este mes… vamos bien jodidos.'], ['c1', '¡Ese es nuestro Paconi!'], ['c2', '¡Paconi boss!']] },
        { id: 'paconiEspuma', requiere: ['paconi'], lineas: [['paconi', 'Jefe, la espuma del asiento está jodida…'], ['tu', '??'], ['paconi', 'Nada, jefe, olvídelo.']] },
        // Iván, 27-11-2026. Las de su baja salen en el momento en que se pone
        // de baja, a primera hora (cuando 'baja:paconi'; ver chatAlInstante()).
        { id: 'paconiBaja1', cuando: 'baja:paconi', requiere: ['paconi'], lineas: [['paconi', 'Jefe, ayer terminé el turno a duras penas, estoy burda de jodido.'], ['paconi', 'Hoy me quedo en la cama, ¡qué vaina!']] },
        { id: 'paconiBaja2', cuando: 'baja:paconi', requiere: ['paconi'], lineas: [['paconi', 'Jefe, mi chamo se torció un pie y tengo que llevarlo al médico. Hoy no puedo ir a trabajar, ya sabe.']] },
        { id: 'paconiBaja3', cuando: 'baja:paconi', requiere: ['paconi'], lineas: [['paconi', 'Ayer me dio un tirón en la lumbar cargando unas maletas, pana… No voy a poder trabajar, hermano.']] },
        { id: 'paconiBaja4', cuando: 'baja:paconi', requiere: ['paconi'], lineas: [['paconi', 'Tengo un virus agarrado en el pecho… Es engañoso, vale: yo pensé que ya estaba bueno.']] },
        { id: 'paconiGasolina', requiere: ['paconi'], lineas: [['paconi', 'Buen día, grupo, que tengan un buen servicio hoy.'], ['paconi', '¿Quién cojoneh dejó el carro sin gasolina? ¡NO ME JODAN, SIEMPRE LO ANDO LLENANDO YO!']] },
        { id: 'paconiAmbientador', requiere: ['paconi'], lineas: [['paconi', '¿Dónde pusieron el ambientador, muchachos? No lo encuentro, es urgente.'], ['c1', 'Paconi, ¿qué ha pasado?']] },
        // Con 3 o más Pacos o Franciscos con turno, le corean (Iván, 28-11-2026).
        // p1, p2 y p3: tres de ellos, al azar.
        { id: 'paconiClub', grupo: 'coro', requiere: ['paconi', 'tocayos3'], lineas: [['paconi', 'Mis tocayos, ¿cómo va la familia? Hoy la flota es nuestra, hermanos.'], ['p1', '¡PA-CO-NI! ¡PA-CO-NI! 🙌'], ['p2', '¡El maestro de los tocayos!'], ['p3', 'Cuando sea mayor quiero ser como tú, Paconi.'], ['paconi', 'Engañoso… pero gracias, muchachos.']] },
        { id: 'paconiDiscurso', grupo: 'coro', requiere: ['paconi', 'tocayos3'], lineas: [['paconi', 'Muchachos, en mi país me decían «el rey del volante». Aquí ustedes son mi gente.'], ['p1', '¡Que hable, que hable!'], ['p2', '¡Paconi presidente! 🇻🇪'], ['p3', 'Yo me llamo Paco por algo, jefe.'], ['paconi', 'No jodah, hermano… me van a hacer llorar.']] },
        { id: 'paconiBrindis', grupo: 'coro', requiere: ['paconi', 'tocayos3'], lineas: [['paconi', 'Esta noche, cafecito para todos los Pacos de la flota. Invito yo.'], ['p1', '¡Viva Paconi! ☕'], ['p2', '¡Nuestro ídolo!'], ['p3', '¿Seguro que invitas tú?'], ['paconi', 'Es una trampa, muchachos… pero esta vez no.']] },
        { id: 'paconiBailongo', requiere: ['paconi'], lineas: [['paconi', 'Noto el coche algo bailongo, ¿ustedes también?'], ['c1', 'No sé de qué hablas…']] },
        // El Pelado.
        { id: 'peladoLechuga', requiere: ['pelado'], lineas: [['pelado', 'Che, jefe, mucha lechuga suelta hoy. Me fui un poco antes a casa.']] },
        { id: 'peladoPibes', requiere: ['pelado'], lineas: [['pelado', 'Siete pibes en casa, hermano. Hoy hice el doble turno y cené a las cuatro.']] },
        { id: 'peladoKm', requiere: ['pelado'], lineas: [['pelado', 'Un kilometrito más no le hace mal a nadie.'], ['c1', 'Pelado, el coche tiene {km} km.'], ['pelado', 'Está joven.']] },
        { id: 'peladoCalzoncillos', cuando: 'sinPagar', requiere: ['pelado'], lineas: [['pelado', 'El que se intente ir sin pagar conmigo se va en calzoncillos, ya saben.']] },
        { id: 'peladoEfectivo', requiere: ['pelado'], lineas: [['pelado', 'Che, cómo está tirando el efectivo, no se lo digan al jefe.'], ['c1', 'El jefe está en el grupo.'], ['c2', '¡Estás fenicio, Pelado!']] },
        { id: 'peladoReserva', requiere: ['pelado'], foto: 'reserva', lineas: [['pelado', 'Un kilometrito más y paro, lo juro.'], ['c1', 'Mentira.']] },
        { id: 'peladoBocadillo', requiere: ['pelado'], foto: 'bocadillo', lineas: [['pelado', 'Desayuno de campeones.']] },
        // Daniela.
        { id: 'danielaFiniquito', requiere: ['daniela', 'paconi'], lineas: [['daniela', 'Paconi, tengo el finiquito listo. No me hagas mandártelo.'], ['paconi', 'Sí, jefa, descuide, este mes voy loco.']] },
        { id: 'danielaATrabajar', requiere: ['daniela', 'paconi'], lineas: [['daniela', '¡Paconi, a trabajar!'], ['paconi', 'Si estoy trabajando, muchacha.'], ['daniela', 'Pues más.']] },
        { id: 'danielaCafe', requiere: ['daniela'], lineas: [['daniela', 'Revisando las cuentas. {c1}, ¿por qué hay un café de 7 €?'], ['c1', 'Era con tostada… 🥲']] },
        { id: 'danielaAlvaro', cuando: 'danielaCuida', requiere: ['daniela'], lineas: [['daniela', 'Hoy no he venido, estaba cuidando de Álvaro. ¿Os habéis portado bien?'], ['c1', 'Sí, jefa. 😇']] },
        { id: 'danielaDibujo', requiere: ['daniela', 'pelado'], foto: 'dibujo', lineas: [['daniela', 'Así vamos este mes.'], ['pelado', 'Che, qué buena pinta. 👏']] }
      ]
    },
    /*
     * Para guiar al jugador (Iván, 25-11-2026): con menos licencias que
     * esto, de cada rama solo se puede comprar la primera mejora; el resto
     * espera a la 2.ª licencia (quien compraba mejoras «por probar» no
     * llegaba a la 2.ª licencia hasta el minuto 142; con la tarjeta
     * Siguiente, en el 27). Equilibrio.
     */
    licenciasParaRestoDeRama: 2,
    /*
     * Ramas del árbol de mejoras, en el orden de las pestañas.
     */
    ramasMejoras: [
      // corto: el nombre que cabe encima de su columna en el árbol.
      { id: 'clientes', nombre: 'Clientes', corto: 'Clientes' },
      { id: 'ciudad', nombre: 'Ciudad y radio', corto: 'Ciudad' },
      { id: 'vehiculo', nombre: 'Vehículo', corto: 'Coche' },
      { id: 'taller', nombre: 'Taller y seguros', corto: 'Taller' },
      { id: 'jornada', nombre: 'Conductores y jornada', corto: 'Equipo' }
    ],

    mejoras: [
      // ---- Rama: Clientes
      {
        id: 'callejero', nombre: 'Callejero al día', rama: 'clientes', precio: 400,
        descripcion: 'Te sabes todas las calles: un 10 % menos de tiempo buscando cliente.',
        efecto: { busqueda: 0.9 }
      },
      {
        id: 'limpieza', nombre: 'Taxi impecable', rama: 'clientes', requiere: 'callejero', precio: 600,
        descripcion: 'Coche limpio y agua para el cliente: un 5 % más de demanda en todas las zonas.',
        efecto: { demanda: 1.05 }
      },
      {
        // Iván, 18-11-2026: un ingreso por cada carrera del día (tuyas y de
        // tus conductores), que se cobra al cerrar la caja. Equilibrio.
        id: 'publicidad', nombre: 'Publicidad en el taxi', rama: 'clientes', requiere: 'limpieza',
        descripcion: 'Anuncios en las puertas y en la luneta: al cerrar la caja cobras por cada carrera del día de toda la flota.',
        niveles: [
          { precio: 900, descripcion: '0,25 € por carrera.', efecto: { publicidad: 0.25 } },
          { precio: 1800, descripcion: '0,50 € por carrera.', efecto: { publicidad: 0.5 } },
          { precio: 3200, descripcion: '0,80 € por carrera.', efecto: { publicidad: 0.8 } },
          { precio: 5000, descripcion: '1,20 € por carrera.', efecto: { publicidad: 1.2 } },
          { precio: 7500, descripcion: '1,60 € por carrera.', efecto: { publicidad: 1.6 } }
        ]
      },
      {
        id: 'propinas', nombre: 'Propinas', rama: 'clientes', requiere: 'publicidad',
        descripcion: 'Trato de primera: más clientes dejan propina y dejan más.',
        niveles: [
          { precio: 1350, descripcion: '+3 puntos de probabilidad y propinas un 15 % mayores.', efecto: { propinaProb: 0.03, propinaImporte: 1.15 } },
          { precio: 1980, descripcion: '+6 puntos y un 30 % mayores.', efecto: { propinaProb: 0.06, propinaImporte: 1.3 } },
          { precio: 2700, descripcion: '+9 puntos y un 45 % mayores.', efecto: { propinaProb: 0.09, propinaImporte: 1.45 } },
          { precio: 3600, descripcion: '+12 puntos y un 60 % mayores.', efecto: { propinaProb: 0.12, propinaImporte: 1.6 } },
          { precio: 4500, descripcion: '+15 puntos y un 80 % mayores.', efecto: { propinaProb: 0.15, propinaImporte: 1.8 } }
        ]
      },
      {
        // Iván, 23-11-2026: +15 % (antes +10 %; se pagaba en 80–150 jornadas).
        id: 'datafono', nombre: 'Pago con tarjeta', rama: 'clientes', requiere: 'propinas', precio: 1500,
        descripcion: 'Más gente se sube a tus taxis: un 15 % más de demanda en todas las zonas.',
        efecto: { demanda: 1.15 }
      },
      {
        id: 'clientesFijos', nombre: 'Clientes de siempre', rama: 'clientes', requiere: 'datafono', precio: 2000,
        descripcion: 'Vecinos y oficinas que te llaman a ti: un 8 % más de demanda en todas las zonas.',
        efecto: { demanda: 1.08 }
      },
      // ---- Rama: Ciudad y radio
      {
        // Iván, 18-11-2026: los hoteles del centro te llaman. Equilibrio.
        id: 'hoteles', nombre: 'Enchufe en los hoteles', rama: 'ciudad', precio: 1200,
        descripcion: 'Los conserjes de los hoteles del centro te llaman cuando tienen un cliente: un 25 % menos de tiempo buscando en el Centro.',
        efecto: { busqueda: 0.75, soloZona: 'centro' }
      },
      {
        id: 'emisora', nombre: 'Emisora de radio-taxi', rama: 'ciudad', requiere: 'hoteles', precio: 1800,
        descripcion: 'Te pasan clientes por radio: un 30 % menos de tiempo buscando. Tiene cuota diaria por coche.',
        efecto: { busqueda: 0.7, cuotaEmisora: true }
      },
      {
        id: 'estaciones', nombre: 'Parada en Atocha y Chamartín', rama: 'ciudad', requiere: 'emisora', precio: 2200,
        descripcion: 'Abre la zona de estaciones, con picos al llegar los trenes.',
        efecto: { desbloqueaZona: 'estaciones' }
      },
      {
        id: 'aeropuerto', nombre: 'Acreditación de Barajas', rama: 'ciudad', requiere: 'estaciones', precio: 2600,
        descripcion: 'Abre la zona del aeropuerto, con tarifas fijas de 22 € y 33 €.',
        efecto: { desbloqueaZona: 'aeropuerto' }
      },
      {
        // Iván, 19-11-2026: −10 % de precio y +30 % de demanda (antes 3.000 € y
        // +15 %). Medido: con el Curso de zonas se paga en ~210 jornadas (4
        // conductores); sin él apenas rinde, porque casi nadie va a Ocio.
        id: 'paradaOcio', nombre: 'Parada junto a las salas de fiesta', rama: 'ciudad', requiere: 'aeropuerto', precio: 2700,
        descripcion: 'En ocio nocturno: la mitad de tiempo buscando y un 30 % más de demanda.',
        efecto: { busqueda: 0.5, demanda: 1.3, soloZona: 'ocio' }
      },
      {
        id: 'colaBarajas', nombre: 'Turnos coordinados en Barajas', rama: 'ciudad', requiere: 'paradaOcio', precio: 3500,
        descripcion: 'La cola del aeropuerto se reduce a la mitad: de 1–2 horas a 30–60 minutos.',
        efecto: { cola: 0.5, soloZona: 'aeropuerto' }
      },
      {
        id: 'app', nombre: 'App de pedidos', rama: 'ciudad', requiere: 'colaBarajas', precio: 4050,   // −10 % (Iván, 19-11-2026)
        descripcion: 'Los clientes te piden por el móvil: otro 30 % menos de tiempo buscando.',
        efecto: { busqueda: 0.7 }
      },
      // ---- Rama: Vehículo
      {
        // Equilibrio: barata, para abrir la rama. Comodidad del conductor.
        id: 'deflectores', nombre: 'Deflectores de viento', rama: 'vehiculo', precio: 350,
        descripcion: 'Tus conductores ventilan el coche sin corrientes ni ruido: un 15 % menos de bajas por resfriado.',
        efecto: { baja: 0.85 }
      },
      {
        id: 'conduccionEficiente', nombre: 'Curso de conducción eficiente', rama: 'vehiculo', requiere: 'deflectores', precio: 800,
        descripcion: 'Todos tus coches gastan un 10 % menos de combustible.',
        efecto: { consumo: 0.9 }
      },
      {
        id: 'neumaticos', nombre: 'Neumáticos de bajo consumo', rama: 'vehiculo', requiere: 'conduccionEficiente', precio: 900,
        descripcion: 'Todos tus coches gastan un 8 % menos de combustible.',
        efecto: { consumo: 0.92 }
      },
      {
        // Iván, 19-11-2026: los pinchazos de toda la flota (también tu turno).
        id: 'neumaticosAltaGama', nombre: 'Neumáticos de alta gama', rama: 'vehiculo', requiere: 'neumaticos', precio: 1300,
        descripcion: 'Resisten mejor los baches y los cristales: toda la flota pincha un 35 % menos.',
        efecto: { pinchazo: 0.65 }
      },
      {
        // Iván, 18-11-2026. Equilibrio.
        id: 'mampara', nombre: 'Mampara y asientos de cuero', rama: 'vehiculo', requiere: 'neumaticosAltaGama', precio: 1620,   // −10 % (Iván, 19-11-2026)
        descripcion: 'Coches de categoría: más clientes eligen tus taxis, un 6 % más de demanda en todas las zonas.',
        efecto: { demanda: 1.06 }
      },
      {
        id: 'hibridos', nombre: 'Flota híbrida', rama: 'vehiculo', requiere: 'mampara', precio: 4000,
        descripcion: 'Pasas tus coches de gasolina a híbridos: un 35 % menos de combustible (al Tesla no le afecta).',
        efecto: { consumoCombustion: 0.65 }
      },
      {
        // Iván, 20-11-2026: la última de la rama. En la realidad el GLP sale
        // un 30–40 % más barato por km que la gasolina (sin fuente verificada
        // de los precios de hoy). Equilibrio: con 8 licencias e híbridos
        // ahorra ~53 € por jornada y se paga en ~90 (estimado).
        id: 'glp', nombre: 'Depósito de GLP', rama: 'vehiculo', requiere: 'hibridos', precio: 4800,
        descripcion: 'Instalas un depósito de GLP en tus coches de gasolina: el combustible te cuesta un 30 % menos (al Tesla no le afecta).',
        efecto: { consumoCombustion: 0.7 }
      },
      {
        // Cansancio (Iván, 23-11-2026): toda la flota, tú incluido. Equilibrio.
        id: 'climatizador', nombre: 'Climatizador bizona', rama: 'vehiculo', requiere: 'glp', precio: 5500,
        // Iván, 23-11-2026: −25 % (antes −15 %: se pagaba en ~210 jornadas).
        descripcion: 'Aire acondicionado a gusto de cada uno en toda tu flota: todos se cansan un 25 % menos, tú también.',
        efecto: { cansancio: 0.75 }
      },
      // ---- Rama: Taller y seguros
      {
        id: 'mecanico', nombre: 'Mecánico propio', rama: 'taller',
        descripcion: 'Un mecánico de confianza: las averías duran menos y cuestan menos.',
        // Iván, 19-11-2026: un 10 % más barato en cada nivel, para que se pague
        // un 10 % antes (medido: 392 jornadas con 4 conductores; ahora ~350).
        niveles: [
          { precio: 270, descripcion: 'Averías un 15 % más cortas y baratas.', efecto: { averiaDias: 0.85, averiaCoste: 0.85 } },
          { precio: 470, descripcion: 'Un 30 % más cortas y baratas.', efecto: { averiaDias: 0.7, averiaCoste: 0.7 } },
          { precio: 675, descripcion: 'Un 45 % más cortas y un 40 % más baratas.', efecto: { averiaDias: 0.55, averiaCoste: 0.6 } },
          { precio: 945, descripcion: 'Un 55 % más cortas y la mitad de caras.', efecto: { averiaDias: 0.45, averiaCoste: 0.5 } },
          { precio: 1215, descripcion: 'Un 65 % más cortas y un 60 % más baratas.', efecto: { averiaDias: 0.35, averiaCoste: 0.4 } }
        ]
      },
      {
        id: 'seguridadVial', nombre: 'Curso de seguridad vial', rama: 'taller', requiere: 'mecanico', precio: 675,
        descripcion: 'Menos partes de accidente: el seguro de cada coche baja otro 25 %.',
        efecto: { seguro: 0.75 }
      },
      {
        id: 'seguroFlota', nombre: 'Póliza de flota', rama: 'taller', requiere: 'seguridadVial', precio: 900,
        descripcion: 'Aseguras todos los taxis juntos: el seguro de cada coche baja un 20 %.',
        efecto: { seguro: 0.8 }
      },
      {
        // Iván, 18-11-2026. Equilibrio.
        id: 'grua', nombre: 'Grúa propia', rama: 'taller', requiere: 'seguroFlota', precio: 1200,
        descripcion: 'Si un taxi pincha sin rueda de repuesto, tu grúa lo lleva al taller: solo una hora parado (no el resto del turno) y el neumático a mitad de precio.',
        efecto: { pinchazoHoras: 1, pinchazoCoste: 0.5 }
      },
      {
        id: 'leasing', nombre: 'Leasing de coches', rama: 'taller', requiere: 'grua', precio: 2500,
        descripcion: 'Un acuerdo con el concesionario: cada coche nuevo te cuesta un 30 % menos.',
        efecto: { precioCoche: 0.7 }
      },
      {
        // Idea 18 (Iván, 22-11-2026): rebaja la tasa diaria de la SL
        // (sociedad.porConductorDiario). Pide además tener la SL montada
        // (requiereSociedad). Precios de Iván; los efectos, Equilibrio.
        id: 'gestoria', nombre: 'Gestoría propia', rama: 'taller', requiere: 'leasing', requiereSociedad: true,
        descripcion: 'Llevas tú los papeles de la sociedad: la SL te cuesta menos cada jornada.',
        niveles: [
          { precio: 3000, descripcion: 'La tasa de la SL, un 30 % más barata.', efecto: { tasaSociedad: 0.7 } },
          { precio: 4500, descripcion: 'Un 60 % más barata.', efecto: { tasaSociedad: 0.4 } },
          { precio: 7000, descripcion: 'Un 90 % más barata.', efecto: { tasaSociedad: 0.1 } }
        ]
      },
      // ---- Rama: Conductores y jornada (Incógnito al volante pasó a las
      // mejoras de tu personaje el 24-11-2026: personaje.mejoras).
      {
        id: 'esterillas', nombre: 'Sacudir esterillas', rama: 'jornada',
        descripcion: 'Al acabar su turno, cada conductor sacude las esterillas y encuentra unas monedas.',
        niveles: [
          { precio: 450, descripcion: 'De 0,50 a 2 € por turno.', efecto: { monedasMin: 0.5, monedasMax: 2 } },
          { precio: 720, descripcion: 'De 1 a 3 € por turno.', efecto: { monedasMin: 1, monedasMax: 3 } },
          { precio: 990, descripcion: 'De 1,50 a 4,50 € por turno.', efecto: { monedasMin: 1.5, monedasMax: 4.5 } },
          { precio: 1350, descripcion: 'De 2 a 6 € por turno.', efecto: { monedasMin: 2, monedasMax: 6 } },
          { precio: 1800, descripcion: 'De 3 a 8 € por turno.', efecto: { monedasMin: 3, monedasMax: 8 } }
        ]
      },
      {
        // Equilibrio: los cuatro niveles de antes (mismos precios y segundos)
        // y un quinto. Cada nivel da el total de segundos de más.
        id: 'jornadaLarga', nombre: 'Jornada larga', rama: 'jornada', requiere: 'esterillas',
        descripcion: 'El día dura más: más carreras con los mismos costes fijos diarios.',
        niveles: [
          { precio: 500, descripcion: 'El día dura 10 segundos más.', efecto: { segundosDia: 10 } },
          { precio: 700, descripcion: '20 segundos más en total.', efecto: { segundosDia: 20 } },
          { precio: 1000, descripcion: '30 segundos más en total.', efecto: { segundosDia: 30 } },
          { precio: 1400, descripcion: '45 segundos más en total.', efecto: { segundosDia: 45 } },
          { precio: 1900, descripcion: '60 segundos más en total.', efecto: { segundosDia: 60 } }
        ]
      },
      {
        // Equilibrio: cada nivel costaba más o menos lo que valían vendidos los
        // objetos (sobre todo B y A) que caben de más, con la venta de antes
        // del 18-11-2026 (ahora, más o menos la mitad).
        id: 'taquillas', nombre: 'Taquillas', rama: 'jornada', requiere: 'jornadaLarga',
        descripcion: 'Taquillas para guardar lo que encuentran tus conductores: el almacén guarda más objetos.',
        niveles: [
          { precio: 600, descripcion: 'Almacén de 20 objetos.', efecto: { almacen: 10 } },
          { precio: 1800, descripcion: 'Almacén de 30 objetos.', efecto: { almacen: 20 } },
          { precio: 4500, descripcion: 'Almacén de 40 objetos.', efecto: { almacen: 30 } }
        ]
      },
      {
        id: 'gestionZonas', nombre: 'Curso gestión de zonas', rama: 'jornada', requiere: 'taquillas', precio: 2000,
        descripcion: 'Tus conductores aprenden a moverse: cada hora se van a la zona que más les conviene, en vez de elegir a ojo.',
        efecto: { gestionZonas: true }
      },
      {
        // Cansancio (Iván, 23-11-2026): descansos de 30 a 25 y a 20 minutos,
        // para toda la flota (tú también). Entre el Curso de zonas y RRHH para
        // no quedar al final de la rama (25.000 €). Equilibrio.
        id: 'cafeCochera', nombre: 'Máquina de café en la cochera', rama: 'jornada', requiere: 'gestionZonas',
        descripcion: 'Un buen café antes de volver al taxi: los descansos son más cortos para toda la flota.',
        niveles: [
          // Iván, 23-11-2026: 5 puntos más en cada nivel (antes −17 % y −33 %: 25 y 20 min).
          { precio: 2200, descripcion: 'Descansos un 22 % más cortos (unos 23 minutos).', efecto: { descanso: 0.783 } },
          { precio: 3300, descripcion: 'Descansos un 38 % más cortos (unos 18,5 minutos).', efecto: { descanso: 0.617 } }
        ]
      },
      {
        // Iván (18-11-2026): mejores candidatos en el late-game. Cada nivel da
        // los pesos de las categorías de los candidatos (suman 1; sin la
        // mejora, los `peso` de config.categorias). No cambia los objetos.
        // Precios y pesos: Equilibrio.
        id: 'rrhh', nombre: 'Departamento de RRHH', rama: 'jornada', requiere: 'cafeCochera',
        descripcion: 'Alguien que hace entrevistas de verdad: los candidatos salen de mejor categoría.',
        niveles: [
          { precio: 2500, descripcion: 'B 55 % · A 30 % · S 11 % · S+ 3 % · LEGENDARIO 1 %.',
            efecto: { pesosCandidatos: { B: 0.55, A: 0.30, S: 0.11, 'S+': 0.03, L: 0.01 } } },
          { precio: 3500, descripcion: 'B 45 % · A 33 % · S 15 % · S+ 5 % · LEGENDARIO 2 %.',
            efecto: { pesosCandidatos: { B: 0.45, A: 0.33, S: 0.15, 'S+': 0.05, L: 0.02 } } },
          { precio: 6000, descripcion: 'B 35 % · A 35 % · S 19 % · S+ 8 % · LEGENDARIO 3 %.',
            efecto: { pesosCandidatos: { B: 0.35, A: 0.35, S: 0.19, 'S+': 0.08, L: 0.03 } } },
          { precio: 10000, descripcion: 'B 25 % · A 35 % · S 23 % · S+ 12 % · LEGENDARIO 5 %.',
            efecto: { pesosCandidatos: { B: 0.25, A: 0.35, S: 0.23, 'S+': 0.12, L: 0.05 } } },
          { precio: 15000, descripcion: 'B 15 % · A 33 % · S 27 % · S+ 17 % · LEGENDARIO 8 %.',
            efecto: { pesosCandidatos: { B: 0.15, A: 0.33, S: 0.27, 'S+': 0.17, L: 0.08 } } }
        ]
      },
      {
        // Iván (18-11-2026): 4.000 € y rebaja lo que se quedan los conductores,
        // para que dejar el volante no sea una trampa. El 0,9 es Equilibrio.
        id: 'oficina', nombre: 'Oficina de gestión', rama: 'jornada', requiere: 'rrhh', precio: 4000,
        descripcion: 'Puedes dejar el volante y dedicarte solo a gestionar la flota (tu turno queda libre para un conductor). Con la gestoría al día, tus conductores se quedan el 45 % de cada carrera en vez del 50 %.',
        efecto: { dejarVolante: true, porcentajeConductor: 0.9 }
      },
      {
        // Idea 17 (Iván, 20-11-2026): los de nivel 10 salen en la libranza de
        // su licencia, con el riesgo de que un «pesetas» los pille
        // (eventos.pesetas). Equilibrio.
        // 15.000 €: con 10 conductores de nivel 10 se paga en ~35 jornadas.
        id: 'incognito', nombre: 'Modo incógnito', rama: 'jornada', requiere: 'oficina', precio: 15000,
        descripcion: 'Tus conductores de nivel 10 trabajan también los días que libra su licencia. Ojo: si un «pesetas» los pilla cargando, multa y se acabó el turno.',
        efecto: { incognito: true }
      },
      {
        // Idea 11 (Iván, 22-11-2026): la última de la rama, de final de
        // partida. Precio de Iván; el de cada búsqueda, en conductores.rebuscar.
        id: 'cazatalentos', nombre: 'Cazatalentos', rama: 'jornada', requiere: 'incognito', precio: 25000,
        descripcion: 'Un cazatalentos te busca conductores cuando quieras: en la hoja de candidatos, «Buscar otros» trae tres nuevos al momento. La primera búsqueda del día cuesta 1.000 € y cada una más, el doble; al cerrar la caja vuelve a 1.000 €.',
        efecto: { rebuscar: true }
      }
    ]
  };
})(globalThis);
