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
    versionGuardado: 21,

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
     * Eventos aleatorios. Equilibrio: sin mejoras, el efecto neto de todos
     * sobre el beneficio debe quedar cerca de cero.
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
      sinPagar: { nombre: 'Sin pagar', probCarrera: 0.01 },
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
      pinchazo: { nombre: 'Pinchazos', probTurno: 0.015, coste: 120 },
      baja: { nombre: 'Bajas', probTurno: 0.008, jornadasMin: 1, jornadasMax: 5 },
      averia: {
        nombre: 'Averías', probTurno: 0.0008, jornadasMin: 10, jornadasMax: 20,
        costeMin: 150, costeMax: 400,
        cochesMinimos: 2           // con menos coches no hay averías
      },
      lluvia: { nombre: 'Lluvia', probJornada: 0.2, horasMin: 1, horasMax: 3, factorDemanda: 2 },
      // Bolsa del inventario gastada en vez de un vómito (solo sale en el ticket).
      bolsa: { nombre: 'Bolsas usadas' },
      // Solo con la mejora «Sacudir esterillas»: monedas al final de cada turno.
      esterillas: { nombre: 'Monedas de las esterillas' },
      // Al despedir a un conductor (sale en el ticket con los gastos).
      finiquito: { nombre: 'Finiquitos' },
      // Objetos vendidos (sale en el ticket con lo que entra).
      venta: { nombre: 'Venta de objetos' }
    },

    /*
     * Inventario de consumibles, común a toda la flota. Cada uno se desbloquea
     * con su mejora; luego se compran unidades hasta el máximo del almacén.
     * aviso: con estas unidades o menos, la pestaña Flota avisa. Equilibrio.
     */
    inventario: {
      ruedas: { nombre: 'Ruedas de repuesto', unidad: 'rueda', precio: 80, maximo: 10, aviso: 1, mejora: 'rueda' },
      bolsas: { nombre: 'Bolsas de papel', unidad: 'bolsa', precio: 2, maximo: 50, aviso: 5, mejora: 'bolsas' }
    },

    /*
     * Categorías (Equilibrio), de peor a mejor. Las comparten los objetos y
     * los conductores.
     *   peso           probabilidad de que salga esa categoría (suman 1),
     *                  al encontrar un objeto y en cada candidato
     *   venta          lo que te dan por vender un objeto de esa categoría
     *   contratar      precio de un conductor de esa categoría
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
      { id: 'B', nombre: 'B', peso: 0.65, venta: 40, contratar: 400,
        cualidades: 1, defectos: 2, probDefecto: 1, fuerzaCualidad: 1, fuerzaDefecto: 1, hallazgo: 1, aperturaTope: 0, esperaBase: 1 },
      { id: 'A', nombre: 'A', peso: 0.25, venta: 120, contratar: 900,
        cualidades: 1, defectos: 1, probDefecto: 1, fuerzaCualidad: 1.2, fuerzaDefecto: 0.85, hallazgo: 1.15, aperturaTope: 0.1, esperaBase: 0.95 },
      { id: 'S', nombre: 'S', peso: 0.075, venta: 400, contratar: 2000,
        cualidades: 1, defectos: 1, probDefecto: 0.5, fuerzaCualidad: 1.4, fuerzaDefecto: 0.7, hallazgo: 1.3, aperturaTope: 0.2, esperaBase: 0.88 },
      { id: 'S+', nombre: 'S+', peso: 0.02, venta: 1200, contratar: 5000,
        cualidades: 1, defectos: 0, probDefecto: 0, fuerzaCualidad: 1.6, fuerzaDefecto: 0, hallazgo: 1.5, aperturaTope: 0.3, esperaBase: 0.8 },
      { id: 'L', nombre: 'LEGENDARIO', peso: 0.005, venta: 4000, contratar: 12000,
        cualidades: 2, defectos: 0, probDefecto: 0, fuerzaCualidad: 1.8, fuerzaDefecto: 0, hallazgo: 2, aperturaTope: 0.75, esperaBase: 0.7 }
    ],

    /*
     * Objetos para los conductores (Equilibrio). No se compran: los encuentran
     * los conductores al terminar una carrera (`probHallazgo`; la categoría
     * se sortea con los pesos de `categorias` y el objeto, entre los de esa
     * categoría). Van al almacén de la flota (como mucho `almacen` sin
     * equipar; si está lleno, esperan en una bandeja hasta que vendas algo) y
     * se equipan a un conductor, uno de cada como mucho, en sus huecos.
     * efecto: como el de los rasgos, con los mismos topes.
     */
    objetos: {
      almacen: 10,                 // Equilibrio: sin mejoras; «Taquillas» lo amplía.
      probHallazgo: 0.012,
      lista: [
        { id: 'ambientador', nombre: 'Ambientador', categoria: 'B', efecto: { propina: 1.1 },
          descripcion: 'Un taxi que huele bien: un 10 % más de propinas.' },
        { id: 'cojin', nombre: 'Cojín lumbar', categoria: 'B', efecto: { baja: 0.85 },
          descripcion: 'Doce horas sentado sin dolor de espalda: un 15 % menos de bajas.' },
        { id: 'termo', nombre: 'Termo de café', categoria: 'B', efecto: { esperaNoche: 0.96 },
          descripcion: 'Despierto toda la noche: un 4 % menos de espera en el turno de noche.' },
        { id: 'gafas', nombre: 'Gafas de sol', categoria: 'B', efecto: { esperaDia: 0.96 },
          descripcion: 'Sin deslumbrarse: un 4 % menos de espera en el turno de día.' },
        { id: 'funda', nombre: 'Funda de asientos', categoria: 'B', efecto: { limpieza: 0.75 },
          descripcion: 'Si un cliente vomita y no hay bolsa, limpiar cuesta un 25 % menos y se para menos rato.' },
        { id: 'callejero', nombre: 'Callejero de papel', categoria: 'B', efecto: { espera: 0.97 },
          descripcion: 'Por si falla el móvil: un 3 % menos de espera entre carreras.' },

        { id: 'gps', nombre: 'GPS', categoria: 'A', efecto: { espera: 0.94 },
          descripcion: 'Rutas y avisos de clientes: un 6 % menos de espera entre carreras.' },
        { id: 'manometro', nombre: 'Manómetro de ruedas', categoria: 'A', efecto: { pinchazo: 0.7 },
          descripcion: 'Ruedas siempre a su presión: un 30 % menos de pinchazos.' },
        { id: 'caramelos', nombre: 'Caramelos para clientes', categoria: 'A', efecto: { propina: 1.2 },
          descripcion: 'Un detalle que se agradece: un 20 % más de propinas.' },
        { id: 'espejo', nombre: 'Espejo panorámico', categoria: 'A', efecto: { sinPagar: 0.7 },
          descripcion: 'Ve todo el asiento de atrás: un 30 % menos de clientes sin pagar.' },
        { id: 'vitaminas', nombre: 'Vitaminas', categoria: 'A', efecto: { baja: 0.7 },
          descripcion: 'Defensas altas: un 30 % menos de bajas.' },
        { id: 'alfombrillas', nombre: 'Alfombrillas de goma', categoria: 'A', efecto: { limpieza: 0.55 },
          descripcion: 'Se limpian con la manguera: un vómito cuesta un 45 % menos y se para menos rato.' },

        { id: 'escaner', nombre: 'Radio-escáner', categoria: 'S', efecto: { espera: 0.9 },
          descripcion: 'Se entera antes que nadie de dónde hay clientes: un 10 % menos de espera.' },
        { id: 'herramientas', nombre: 'Kit de herramientas', categoria: 'S', efecto: { averia: 0.65, pinchazo: 0.8 },
          descripcion: 'Arregla lo pequeño antes de que se rompa: un 35 % menos de averías y un 20 % menos de pinchazos.' },
        { id: 'cargador', nombre: 'Cargador para clientes', categoria: 'S', efecto: { propina: 1.3, objeto: 1.2 },
          descripcion: 'Todo el mundo lo agradece: un 30 % más de propinas y un 20 % más de objetos devueltos.' },
        { id: 'botiquin', nombre: 'Botiquín', categoria: 'S', efecto: { baja: 0.55 },
          descripcion: 'Lo que pilla, lo cura a tiempo: un 45 % menos de bajas.' },
        { id: 'datafono', nombre: 'Datáfono portátil', categoria: 'S', efecto: { sinPagar: 0.5 },
          descripcion: 'Nadie se escapa con la excusa de la tarjeta: la mitad de clientes sin pagar.' },

        { id: 'navegador', nombre: 'Navegador con tráfico en directo', categoria: 'S+', efecto: { espera: 0.86 },
          descripcion: 'Esquiva atascos y llega antes: un 14 % menos de espera entre carreras.' },
        { id: 'silla', nombre: 'Silla ergonómica', categoria: 'S+', efecto: { baja: 0.5, esperaNoche: 0.93 },
          descripcion: 'Aguanta la noche entera: la mitad de bajas y un 7 % menos de espera de noche.' },
        { id: 'nevera', nombre: 'Nevera con agua fría', categoria: 'S+', efecto: { propina: 1.45, limpieza: 0.7 },
          descripcion: 'Un lujo en agosto: un 45 % más de propinas y vómitos más llevaderos.' },
        { id: 'baches', nombre: 'Detector de baches', categoria: 'S+', efecto: { pinchazo: 0.5, averia: 0.7 },
          descripcion: 'Ni un bache sin esquivar: la mitad de pinchazos y un 30 % menos de averías.' },

        { id: 'paconi', nombre: 'Planta de Paconi', categoria: 'L', efecto: { espera: 0.9, propina: 1.3, baja: 0.7 },
          descripcion: 'Nadie sabe cómo, pero lo arregla todo: un 10 % menos de espera, un 30 % más de propinas y un 30 % menos de bajas.' },
        { id: 'bocata', nombre: 'Bocata de calamares infinito', categoria: 'L', efecto: { baja: 0.4, esperaDia: 0.88 },
          descripcion: 'Nunca se acaba: un 60 % menos de bajas y un 12 % menos de espera de día.' },
        { id: 'bidon', nombre: 'Bidón energético', categoria: 'L', efecto: { esperaNoche: 0.78, baja: 0.8 },
          descripcion: 'Medio litro que salva las noches: un 22 % menos de espera de noche y un 20 % menos de bajas.' }
      ]
    },

    sinConexion: {
      maximoHoras: 8,              // Equilibrio: horas reales que se recuperan como mucho.
      minimoSegundos: 10           // Por debajo de esto no se muestra el resumen.
    },

    economia: {
      dineroInicial: 50,          // Equilibrio: caja con la que empiezas.
      // Equilibrio: por debajo de estos viajes por hora la zona se considera
      // vacía y no se puede buscar cliente a mano.
      demandaMinimaManual: 0.5,
      // Equilibrio: cada jornada, la demanda de cada zona se mueve al azar
      // hasta este porcentaje arriba o abajo (0,2 = ±20 %). El azar sale del
      // número de día, así que jugando y sin conexión da lo mismo.
      variacionDiariaDemanda: 0.2
    },

    conduccion: {
      // Equilibrio: velocidad media circulando en vacío buscando cliente.
      velocidadVacioKmH: 18
    },

    // Turnos de 12 horas. Equilibrio: no coinciden con el cambio de tarifa de las 21:00.
    turnos: {
      dia: { nombre: 'Día', horaInicio: 7, horaFin: 19 },
      noche: { nombre: 'Noche', horaInicio: 19, horaFin: 7 }
    },

    conductores: {
      // Dato de Iván: parte de la recaudación que se queda el conductor.
      porcentaje: 0.50,
      // El precio de contratar depende de la categoría (config.categorias).
      reserva: 5,                  // Equilibrio: conductores en reserva (sin trabajar).
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
          descripcion: 'Taxi siempre impecable: limpiar un vómito le cuesta la mitad y un 45 % más de propinas.' }
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
          descripcion: 'Lo que se olvidan, se lo queda: un 70 % menos de objetos devueltos y un 60 % menos de propinas.' }
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
        limpieza: [0.4, 1.5]
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
        extremo: { espera: 0.2, propina: 7, sinPagar: 0.05, objeto: 4, baja: 0.05, pinchazo: 0.05, averia: 0.05, limpieza: 0.15 }
      },
      /*
       * Personajes: se sortea uno al contratar (sin repetir mientras se pueda).
       * Rasgos del retrato (js/retratos.js):
       *   piel 1–4 · cara redonda | alargada | cuadrada
       *   pelo corto | largo | rizado | coleta | moño | calvo
       *   colorPelo negro | castano | rubio | pelirrojo | gris | blanco
       *   gafas null | redondas | cuadradas · barba null | bigote | barba | perilla
       *   ropa 1–6 · edad joven | media | mayor (la mayor lleva arrugas)
       */
      personajes: [
        { nombre: 'Ana', edad: 'joven', piel: 2, cara: 'redonda', pelo: 'largo', colorPelo: 'castano', gafas: null, barba: null, ropa: 1 },
        { nombre: 'Luis', edad: 'media', piel: 1, cara: 'cuadrada', pelo: 'corto', colorPelo: 'negro', gafas: null, barba: 'bigote', ropa: 2 },
        { nombre: 'Carmen', edad: 'mayor', piel: 2, cara: 'alargada', pelo: 'moño', colorPelo: 'blanco', gafas: 'redondas', barba: null, ropa: 3 },
        { nombre: 'Javier', edad: 'joven', piel: 3, cara: 'redonda', pelo: 'rizado', colorPelo: 'negro', gafas: null, barba: 'perilla', ropa: 4 },
        { nombre: 'Lucía', edad: 'media', piel: 1, cara: 'alargada', pelo: 'coleta', colorPelo: 'rubio', gafas: 'cuadradas', barba: null, ropa: 5 },
        { nombre: 'Manuel', edad: 'mayor', piel: 2, cara: 'cuadrada', pelo: 'calvo', colorPelo: 'gris', gafas: null, barba: 'barba', ropa: 6 },
        { nombre: 'Elena', edad: 'joven', piel: 4, cara: 'redonda', pelo: 'rizado', colorPelo: 'negro', gafas: null, barba: null, ropa: 3 },
        { nombre: 'Antonio', edad: 'mayor', piel: 1, cara: 'redonda', pelo: 'corto', colorPelo: 'blanco', gafas: 'cuadradas', barba: 'bigote', ropa: 1 },
        { nombre: 'Marta', edad: 'media', piel: 3, cara: 'alargada', pelo: 'largo', colorPelo: 'pelirrojo', gafas: null, barba: null, ropa: 2 },
        { nombre: 'Francisco', edad: 'media', piel: 2, cara: 'cuadrada', pelo: 'corto', colorPelo: 'castano', gafas: null, barba: 'barba', ropa: 4 },
        { nombre: 'Laura', edad: 'joven', piel: 1, cara: 'redonda', pelo: 'coleta', colorPelo: 'castano', gafas: 'redondas', barba: null, ropa: 6 },
        { nombre: 'David', edad: 'joven', piel: 2, cara: 'alargada', pelo: 'corto', colorPelo: 'rubio', gafas: null, barba: null, ropa: 5 },
        { nombre: 'Rosa', edad: 'mayor', piel: 3, cara: 'redonda', pelo: 'moño', colorPelo: 'gris', gafas: null, barba: null, ropa: 6 },
        { nombre: 'Pablo', edad: 'media', piel: 4, cara: 'cuadrada', pelo: 'calvo', colorPelo: 'negro', gafas: null, barba: 'barba', ropa: 1 },
        { nombre: 'Isabel', edad: 'media', piel: 2, cara: 'redonda', pelo: 'largo', colorPelo: 'negro', gafas: 'cuadradas', barba: null, ropa: 2 },
        { nombre: 'Sergio', edad: 'joven', piel: 3, cara: 'alargada', pelo: 'rizado', colorPelo: 'castano', gafas: null, barba: 'bigote', ropa: 3 }
      ]
    },

    combustible: {
      precioLitro: 1.55            // Dato de Iván: precio medio del litro.
    },

    // Costes fijos: se cobran una vez al día, al cerrar la caja.
    costesFijos: {
      // Dato de Iván: cuota máxima de autónomo en España, 535 € al mes.
      autonomoDiario: 535 / 30,
      seguroDiarioPorVehiculo: 10, // Dato de Iván: seguro del taxi por día.
      emisoraDiariaPorVehiculo: 3  // Dato de Iván: cuota de la emisora, solo si tienes la mejora.
    },

    licencias: {
      precioBase: 3000,            // Iván (valor de juego): precio de la segunda licencia.
      factorSubida: 1.15,          // Equilibrio: cada licencia cuesta un 15 % más que la anterior.
      maximo: 15812,               // Dato real: licencias en el área de Madrid.
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
      placasAElegir: 2
    },

    vehiculos: {
      modeloInicial: 'turismo',
      // Un solo modelo en la primera versión.
      modelos: {
        turismo: {
          nombre: 'Turismo',
          precio: 1500,              // Iván (valor de juego): precio del coche.
          consumoLitros100Km: 6      // Dato de Iván: consumo medio en ciudad.
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
     *   requiere  mejora anterior de su rama (basta su nivel 1). Sin requiere, es
     *             una de las que abren la rama (puede haber más de una).
     *   efecto    segundosDia: alarga el día (segundos reales)
     *             consumo / busqueda / cola / demanda: multiplicadores
     *             soloZona: el efecto solo cuenta en esa zona
     *             desbloqueaZona: abre una zona
     *             cuotaEmisora: activa el coste diario de la emisora
     *             dejarVolante: permite dejar de conducir y solo gestionar
     *             seguro: multiplica el seguro diario de cada coche
     *             gestionZonas: los conductores eligen la mejor zona cada hora
     *                           (sin ella, eligen al azar entre las que tienen clientes)
     *             propinaProb: suma a la probabilidad de propina
     *             propinaImporte: multiplica el importe de la propina
     *             sinImpagos: nadie se va sin pagar
     *             averiaDias / averiaCoste: multiplican días y coste de una avería
     *             monedasMin / monedasMax: € que encuentra cada conductor al acabar su turno
     *             baja: multiplica la probabilidad de baja de los conductores
     *                   (junto con su rasgo y sus objetos, bajo el mismo tope)
     *             almacen: objetos de más que caben en el almacén
     *   niveles   mejora por niveles: cada nivel tiene su precio y su efecto
     *             (el efecto del nivel es el total, no se suma al anterior).
     *             inventario: desbloquea un consumible del inventario (config.inventario)
     * Precios y efectos: Equilibrio. Precios revisados el 16-11-2026 (propuesta C): cada
     * mejora se paga en unas 1–2 h de juego con 6 coches (medido con un bot).
     */
    /*
     * Ramas del árbol de mejoras, en el orden de las pestañas.
     */
    ramasMejoras: [
      { id: 'clientes', nombre: 'Clientes' },
      { id: 'ciudad', nombre: 'Ciudad y radio' },
      { id: 'vehiculo', nombre: 'Vehículo' },
      { id: 'taller', nombre: 'Taller y seguros' },
      { id: 'jornada', nombre: 'Conductores y jornada' }
    ],

    mejoras: [
      // ---- Rama: Clientes
      {
        id: 'bolsas', nombre: 'Bolsas de papel', rama: 'clientes', precio: 800,
        descripcion: 'Desbloquea las bolsas de papel en el almacén: con una bolsa a mano, el cliente mareado no vomita en el coche.',
        efecto: { inventario: 'bolsas' }
      },
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
        id: 'propinas', nombre: 'Propinas', rama: 'clientes', requiere: 'limpieza',
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
        id: 'datafono', nombre: 'Pago con tarjeta', rama: 'clientes', requiere: 'propinas', precio: 1440,
        descripcion: 'Más gente se sube a tus taxis: un 10 % más de demanda en todas las zonas.',
        efecto: { demanda: 1.1 }
      },
      {
        id: 'camara', nombre: 'Cámara de seguridad', rama: 'clientes', requiere: 'datafono', precio: 1000,
        descripcion: 'Con la cámara a la vista, ningún cliente se va sin pagar.',
        efecto: { sinImpagos: true }
      },
      {
        id: 'clientesFijos', nombre: 'Clientes de siempre', rama: 'clientes', requiere: 'camara', precio: 2000,
        descripcion: 'Vecinos y oficinas que te llaman a ti: un 8 % más de demanda en todas las zonas.',
        efecto: { demanda: 1.08 }
      },
      // ---- Rama: Ciudad y radio
      {
        id: 'estaciones', nombre: 'Parada en Atocha y Chamartín', rama: 'ciudad', precio: 2500,
        descripcion: 'Abre la zona de estaciones, con picos al llegar los trenes.',
        efecto: { desbloqueaZona: 'estaciones' }
      },
      {
        id: 'aeropuerto', nombre: 'Acreditación de Barajas', rama: 'ciudad', requiere: 'estaciones', precio: 2000,
        descripcion: 'Abre la zona del aeropuerto, con tarifas fijas de 22 € y 33 €.',
        efecto: { desbloqueaZona: 'aeropuerto' }
      },
      {
        id: 'emisora', nombre: 'Emisora de radio-taxi', rama: 'ciudad', requiere: 'aeropuerto', precio: 1300,
        descripcion: 'Te pasan clientes por radio: un 30 % menos de tiempo buscando. Tiene cuota diaria por coche.',
        efecto: { busqueda: 0.7, cuotaEmisora: true }
      },
      {
        id: 'paradaOcio', nombre: 'Parada junto a las salas de fiesta', rama: 'ciudad', requiere: 'emisora', precio: 2300,
        descripcion: 'En ocio nocturno: la mitad de tiempo buscando y un 15 % más de demanda.',
        efecto: { busqueda: 0.5, demanda: 1.15, soloZona: 'ocio' }
      },
      {
        id: 'colaBarajas', nombre: 'Turnos coordinados en Barajas', rama: 'ciudad', requiere: 'paradaOcio', precio: 3000,
        descripcion: 'La cola del aeropuerto se reduce a la mitad: de 1–2 horas a 30–60 minutos.',
        efecto: { cola: 0.5, soloZona: 'aeropuerto' }
      },
      {
        id: 'app', nombre: 'App de pedidos', rama: 'ciudad', requiere: 'colaBarajas', precio: 4000,
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
        id: 'conduccionEficiente', nombre: 'Curso de conducción eficiente', rama: 'vehiculo', precio: 800,
        descripcion: 'Todos tus coches gastan un 10 % menos de combustible.',
        efecto: { consumo: 0.9 }
      },
      {
        id: 'neumaticos', nombre: 'Neumáticos de bajo consumo', rama: 'vehiculo', requiere: 'conduccionEficiente', precio: 900,
        descripcion: 'Todos tus coches gastan un 8 % menos de combustible.',
        efecto: { consumo: 0.92 }
      },
      {
        id: 'hibridos', nombre: 'Flota híbrida', rama: 'vehiculo', requiere: 'neumaticos', precio: 4000,
        descripcion: 'Pasas todos tus coches a híbridos: un 35 % menos de combustible.',
        efecto: { consumo: 0.65 }
      },
      // ---- Rama: Taller y seguros
      {
        id: 'rueda', nombre: 'Rueda de repuesto', rama: 'taller', precio: 300,
        descripcion: 'Desbloquea las ruedas de repuesto en el almacén: si un taxi pincha, se cambia la rueda y sigue trabajando sin coste.',
        efecto: { inventario: 'ruedas' }
      },
      {
        id: 'mecanico', nombre: 'Mecánico propio', rama: 'taller', requiere: 'rueda',
        descripcion: 'Un mecánico de confianza: las averías duran menos y cuestan menos.',
        niveles: [
          { precio: 300, descripcion: 'Averías un 15 % más cortas y baratas.', efecto: { averiaDias: 0.85, averiaCoste: 0.85 } },
          { precio: 525, descripcion: 'Un 30 % más cortas y baratas.', efecto: { averiaDias: 0.7, averiaCoste: 0.7 } },
          { precio: 750, descripcion: 'Un 45 % más cortas y un 40 % más baratas.', efecto: { averiaDias: 0.55, averiaCoste: 0.6 } },
          { precio: 1050, descripcion: 'Un 55 % más cortas y la mitad de caras.', efecto: { averiaDias: 0.45, averiaCoste: 0.5 } },
          { precio: 1350, descripcion: 'Un 65 % más cortas y un 60 % más baratas.', efecto: { averiaDias: 0.35, averiaCoste: 0.4 } }
        ]
      },
      {
        id: 'seguroFlota', nombre: 'Póliza de flota', rama: 'taller', requiere: 'mecanico', precio: 700,
        descripcion: 'Aseguras todos los taxis juntos: el seguro de cada coche baja un 20 %.',
        efecto: { seguro: 0.8 }
      },
      {
        id: 'seguridadVial', nombre: 'Curso de seguridad vial', rama: 'taller', requiere: 'seguroFlota', precio: 675,
        descripcion: 'Menos partes de accidente: el seguro de cada coche baja otro 25 %.',
        efecto: { seguro: 0.75 }
      },
      // ---- Rama: Conductores y jornada
      {
        id: 'gestionZonas', nombre: 'Curso gestión de zonas', rama: 'jornada', precio: 2500,
        descripcion: 'Tus conductores aprenden a moverse: cada hora se van a la zona que más les conviene, en vez de elegir a ojo.',
        efecto: { gestionZonas: true }
      },
      {
        // Equilibrio: cada nivel cuesta más o menos lo que valen vendidos los
        // objetos (sobre todo B y A) que caben de más.
        id: 'taquillas', nombre: 'Taquillas', rama: 'jornada',
        descripcion: 'Taquillas para guardar lo que encuentran tus conductores: el almacén guarda más objetos.',
        niveles: [
          { precio: 600, descripcion: 'Almacén de 20 objetos.', efecto: { almacen: 10 } },
          { precio: 1800, descripcion: 'Almacén de 30 objetos.', efecto: { almacen: 20 } },
          { precio: 4500, descripcion: 'Almacén de 40 objetos.', efecto: { almacen: 30 } }
        ]
      },
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
          { precio: 400, descripcion: 'El día dura 10 segundos más.', efecto: { segundosDia: 10 } },
          { precio: 700, descripcion: '20 segundos más en total.', efecto: { segundosDia: 20 } },
          { precio: 1000, descripcion: '30 segundos más en total.', efecto: { segundosDia: 30 } },
          { precio: 1400, descripcion: '45 segundos más en total.', efecto: { segundosDia: 45 } },
          { precio: 1900, descripcion: '60 segundos más en total.', efecto: { segundosDia: 60 } }
        ]
      },
      {
        id: 'oficina', nombre: 'Oficina de gestión', rama: 'jornada', requiere: 'jornadaLarga', precio: 6000,
        descripcion: 'Puedes dejar el volante y dedicarte solo a gestionar la flota. Tu turno queda libre para un conductor.',
        efecto: { dejarVolante: true }
      }
    ]
  };
})(globalThis);
