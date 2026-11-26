/*
 * Libre · interfaz.
 *
 * Dibuja el estado en el HTML y traduce los clics en acciones de Libre.sim.
 * No calcula nada del juego: pregunta a Libre.sim y muestra lo que devuelve.
 *
 * Cada sección tiene:
 *   firma(estado)      texto que cambia cuando hay que rehacer su HTML
 *   html(estado)       HTML completo de la sección ('' para ocultarla)
 *   actualizar(estado) refresca números sin rehacer el HTML (opcional)
 * Así no se reconstruyen los botones en cada fotograma.
 *
 * Los botones llevan data-accion="nombreDeAccionDeSim" y data-args="a|b|c".
 *
 * Está partida en varios archivos (Iván, 26-11-2026: «empieza a ser difícil
 * de recorrer»). Todos cuelgan de Libre.ui, que dentro se llama «ui»: lo
 * que un archivo usa de otro se escribe ui.nombre, y las variables de estado
 * (hojas abiertas, filtros…) también viven en ui. Los archivos van antes que
 * este en index.html:
 *   js/ui-comun.js  utilidades comunes (formato, botones, iconos, avisos y sonidos)
 *   js/ui-calle.js  pestaña Calle (taxímetro, «Tus taxis hoy», «Siguiente», ticket, caja y zonas)
 *   js/ui-conductores.js  pestaña Conductores (licencias, ficha, candidatos, comparar, coches y SL)
 *   js/ui-almacen.js  pestaña Almacén (objetos, combinar, vender y bandeja)
 *   js/ui-estadisticas.js  pestaña Estadísticas
 *   js/ui-mejoras.js  pestaña Mejoras (el árbol)
 *   js/ui-ajustes.js  hoja de Ajustes y partida
 *   js/ui-personaje.js  hoja de tu personaje y el prestigio
 *   js/ui-historia.js  introducción y eventos de clientes
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};
  const ui = Libre.ui = Libre.ui || {};

  const secciones = [ui.seccionTaximetro, ui.seccionTicket, ui.seccionCaja, ui.seccionZonas, ui.seccionObjetivo, ui.seccionTaxis,
    ui.seccionConductores, ui.seccionAlmacen, ui.seccionMejoras, ui.seccionEstadisticas, ui.seccionPartida, ui.seccionPersonaje, ui.seccionIntro,
    ui.seccionEvento];

  // ---------------------------------------------------------- Ciclo

  // ---------------------------------------------------------- Efectos
  /*
   * Respuesta visual: importes flotantes al cobrar, contador de dinero que
   * rueda y destello al comprar. Con prefers-reduced-motion no se anima nada.
   */
  const movimientoReducido = raiz.matchMedia
    ? raiz.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  // Importes flotantes. Para no frenar el juego con muchos taxis cobrando a la
  // vez, como mucho MAX_FLOTANTES en pantalla y uno nuevo cada
  // MS_ENTRE_FLOTANTES; lo que no cabe se suma al siguiente.
  const MAX_FLOTANTES = 4;
  const MS_ENTRE_FLOTANTES = 300;
  // Cada taxi se vigila por separado (lo facturado en la jornada) para saber
  // quién ha cobrado: «+14,20 € Marta». Tus carreras salen sin nombre.
  const flotantes = { vivos: 0, ultimo: 0, porLicencia: null, cola: [], etiqueta: '' };

  /* Quién trabaja ahora en esa licencia (para el nombre del importe). */
  function nombreEnTurno(estado, lic) {
    const t = lic.turnos[Libre.sim.turnoDeHora(Libre.sim.infoReloj(estado.reloj.minutos).hora)];
    return t && t.quien === 'conductor' ? t.nombre : '';
  }

  function encolarFlotante(importe, nombre) {
    const cola = flotantes.cola;
    const ultimo = cola[cola.length - 1];
    // Lo que no cabe se suma al último de la cola.
    if (cola.length >= MAX_FLOTANTES) {
      ultimo.importe += importe;
      if (ultimo.nombre !== nombre) ultimo.nombre = '';
    } else {
      cola.push({ importe, nombre });
    }
  }

  function vigilarCobros(estado) {
    const actual = {};
    estado.licencias.forEach(function (l) { actual[l.id] = l.facturadoJornada || 0; });
    if (!flotantes.porLicencia) { flotantes.porLicencia = actual; return; }
    estado.licencias.forEach(function (l) {
      const antes = flotantes.porLicencia[l.id];
      // Licencia nueva o cierre de caja (vuelve a cero): no es un cobro.
      if (antes === undefined || actual[l.id] < antes) return;
      const cobrado = actual[l.id] - antes;
      if (cobrado < 0.005) return;
      alCobrar(l.id);
      if (!movimientoReducido.matches) encolarFlotante(cobrado, nombreEnTurno(estado, l));
    });
    flotantes.porLicencia = actual;

    const ahora = Date.now();
    if (flotantes.cola.length > 0 && flotantes.vivos < MAX_FLOTANTES &&
        ahora - flotantes.ultimo >= MS_ENTRE_FLOTANTES) {
      const f = flotantes.cola.shift();
      lanzarFlotante(f.importe, f.nombre);
      flotantes.ultimo = ahora;
    }
  }

  /* Lo que reacciona a un cobro, aparte del importe flotante. */
  function alCobrar(licenciaId) {
    ui.destellarFila(licenciaId);
    ui.sonar('cobro');
  }

  function lanzarFlotante(importe, nombre) {
    const ancla = document.querySelector('#sec-taximetro .display') || ui.$('dinero');
    const caja = ancla.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'flotante';
    el.textContent = '+' + ui.euros(importe) + (nombre ? ' ' + nombre : '') +
      (!nombre && flotantes.etiqueta ? ' · ' + flotantes.etiqueta : '');
    if (!nombre) flotantes.etiqueta = '';
    // Salen por encima del display para no tapar las cifras.
    el.style.left = (caja.right - 8) + 'px';
    el.style.top = (caja.top - 30) + 'px';
    document.body.appendChild(el);
    flotantes.vivos++;
    let quitado = false;
    const quitar = function () {
      if (quitado) return;
      quitado = true;
      el.remove();
      flotantes.vivos--;
    };
    el.addEventListener('animationend', quitar);
    setTimeout(quitar, 2000);   // por si la animación no llega a terminar
  }

  // Contador de dinero que rueda hasta el valor nuevo.
  const MS_CONTADOR = 400;
  const contador = { mostrado: null, desde: 0, hasta: 0, inicio: 0, animando: false };

  function pintarDinero(valor) {
    const el = ui.$('dinero');
    el.textContent = ui.euros(valor);
    el.classList.toggle('negativo', valor < 0);
  }

  /* Coloca el contador donde toca en el instante t (ms de performance.now). */
  function avanzarContador(t) {
    const p = Math.min(1, (t - contador.inicio) / MS_CONTADOR);
    contador.mostrado = p >= 1
      ? contador.hasta
      : contador.desde + (contador.hasta - contador.desde) * (1 - Math.pow(1 - p, 3));
    pintarDinero(contador.mostrado);
  }

  // requestAnimationFrame da la suavidad; si el navegador lo pausa (pestaña
  // en segundo plano), el bucle del juego sigue moviendo el contador.
  function pasoContador(t) {
    contador.animando = false;
    avanzarContador(t);
    if (contador.mostrado !== contador.hasta) {
      contador.animando = true;
      requestAnimationFrame(pasoContador);
    }
  }

  function fijarDinero(valor) {
    if (contador.mostrado === null || movimientoReducido.matches || !raiz.requestAnimationFrame) {
      contador.mostrado = contador.hasta = valor;
      pintarDinero(valor);
      return;
    }
    const ahora = performance.now();
    if (valor !== contador.hasta) {
      contador.desde = contador.mostrado;
      contador.hasta = valor;
      contador.inicio = ahora;
    }
    avanzarContador(ahora);
    if (contador.mostrado !== contador.hasta && !contador.animando) {
      contador.animando = true;
      requestAnimationFrame(pasoContador);
    }
  }

  // Destello breve en lo que se acaba de comprar.
  function destellar(el) {
    if (!el) return;
    el.classList.remove('destello');
    void el.offsetWidth;   // reinicia la animación si ya estaba puesta
    el.classList.add('destello');
    setTimeout(function () { el.classList.remove('destello'); }, 900);
  }

  function destelloTrasCompra(accion, args) {
    if (accion === 'comprarLicencia') {
      const todas = document.querySelectorAll('[data-licencia]');
      destellar(todas[todas.length - 1]);
    } else if (accion === 'comprarVehiculo') {
      destellar(document.querySelector('[data-licencia="' + args[0] + '"]'));
    } else if (accion === 'comprarMejora') {
      destellar(document.querySelector('[data-mejora="' + args[0] + '"]'));
    }
  }

  // ---------------------------------------------------------- Menú inferior
  /*
   * Pestañas: cada sección pertenece a una vista y solo se ve la activa.
   * Ajustes y partida no es una pestaña: es una hoja que abre el engranaje
   * de la cabecera, encima de cualquier vista ('siempre').
   * La pestaña elegida se recuerda en este navegador (comodidad, no partida).
   * body[data-vista] dice a la cabecera si va alta (Calle) o compacta.
   */
  const VISTA_DE = {
    'sec-taximetro': 'calle', 'sec-ticket': 'calle',
    'sec-objetivo': 'calle', 'sec-taxis': 'calle', 'sec-zonas': 'calle', 'sec-caja': 'calle',
    'sec-conductores': 'conductores', 'sec-almacen': 'almacen', 'sec-mejoras': 'mejoras',
    'sec-estadisticas': 'estadisticas', 'sec-partida': 'siempre', 'sec-personaje': 'siempre', 'sec-intro': 'siempre', 'sec-evento': 'siempre'
  };
  // Pestañas de antes del rework: Flota se partió y Partida es ahora una hoja.
  const VISTA_ANTIGUA = { flota: 'conductores', partida: 'calle' };
  const CLAVE_VISTA = 'libre-vista';
  ui.vistaActual = 'calle';
  try {
    let guardada = raiz.localStorage.getItem(CLAVE_VISTA);
    if (VISTA_ANTIGUA[guardada]) guardada = VISTA_ANTIGUA[guardada];
    if (guardada && guardada !== 'siempre' && Object.values(VISTA_DE).indexOf(guardada) !== -1) ui.vistaActual = guardada;
  } catch (e) { /* sin almacenamiento: se empieza en Calle */ }

  function cambiarVista(vista) {
    soltarCogido();
    ui.vistaActual = vista;
    try { raiz.localStorage.setItem(CLAVE_VISTA, vista); } catch (e) { /* da igual */ }
    aplicarVista();
    raiz.scrollTo(0, 0);
  }

  function aplicarVista() {
    secciones.forEach(function (s) {
      ui.$(s.id).classList.toggle('fuera-de-vista', VISTA_DE[s.id] !== ui.vistaActual && VISTA_DE[s.id] !== 'siempre');
    });
    document.body.dataset.vista = ui.vistaActual;
    document.querySelectorAll('[data-vista]').forEach(function (b) {
      if (b.dataset.vista === ui.vistaActual) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
  }

  /* Marcas en las pestañas: algo que puedes comprar, o un ticket esperando. */
  function actualizarAvisos(estado) {
    const hay = {
      calle: !!estado.cierrePendiente,
      conductores: false,
      // Almacén: objetos esperando en la bandeja.
      almacen: (estado.bandeja || []).length > 0,
      mejoras: ui.hayMejoraComprable(estado)
    };
    document.querySelectorAll('#sec-conductores [data-precio]').forEach(function (b) {
      if (!b.disabled && !b.closest('.hoja')) hay.conductores = true;
    });
    Object.keys(hay).forEach(function (vista) {
      const marca = document.querySelector('[data-aviso="' + vista + '"]');
      if (marca) marca.classList.toggle('visible', hay[vista] && vista !== ui.vistaActual);
    });
  }

  ui.ejecutar = null;

  /*
   * Copia el texto: con la API del portapapeles si la hay (pide https o
   * localhost) y, si no, seleccionándolo y con execCommand, que va en más
   * navegadores. Si nada funciona, el texto queda seleccionado en la caja.
   */
  function copiarTexto(caja) {
    function aMano() {
      caja.focus();
      caja.select();
      caja.setSelectionRange(0, caja.value.length);
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      mostrarMensaje(ok ? 'Partida copiada al portapapeles.' : 'No se pudo copiar solo: selecciona todo el texto de la caja y cópialo.');
    }
    if (navigator.clipboard && raiz.isSecureContext) {
      navigator.clipboard.writeText(caja.value).then(
        function () { mostrarMensaje('Partida copiada al portapapeles.'); }, aMano);
    } else {
      aMano();
    }
  }

  function accionPartida(partida, cual, redibujar) {
    const caja = ui.$('partida-texto');
    if (caja) ui.textoPartida = caja.value;
    if (cual === 'exportar') {
      ui.textoPartida = partida.exportar();
      caja.value = ui.textoPartida;
      copiarTexto(caja);
    } else if (cual === 'importar') {
      if (!Libre.guardado.limpiarTexto(ui.textoPartida)) { mostrarMensaje('Pega primero en la caja el texto de una partida exportada.'); return; }
      ui.confirmarPartida = 'importar';
      redibujar();
    } else if (cual === 'importar-si') {
      ui.confirmarPartida = null;
      // Si falla, la hoja sigue abierta con el texto para revisarlo.
      if (partida.importar(ui.textoPartida)) ui.textoPartida = '';
      else redibujar();
    } else if (cual === 'borrar') {
      ui.confirmarPartida = 'borrar';
      redibujar();
    } else if (cual === 'borrar-si') {
      ui.confirmarPartida = null;
      partida.borrar();
    } else if (cual === 'cancelar') {
      ui.confirmarPartida = null;
      redibujar();
    }
  }

  /* Olvida lo dibujado: hace falta tras importar o borrar la partida. */
  function reiniciar() {
    ui.ultimoCierreVisto = null;
    ui.ticketAviso = null;
    ui.objetivoId = null;
    ui.eligiendoConductor = null;
    ui.equipando = null;
    ui.comparando = null;
    ui.fichaConductor = null;
    ui.fichaInventario = null;
    ui.ajustesAbiertos = false;
    ui.eligiendoCoche = null;
    ui.personajeAbierto = false;
    ui.prestigio = null;
    ui.confirmarPartida = null;
    ui.montandoSL = false;
    ui.cogido = null;
    ui.eligiendoPlaca = false;
    ui.panelTu = null;
    flotantes.porLicencia = null;
    flotantes.cola = [];
    ui.modoAnterior = null;
    contador.mostrado = null;
    secciones.forEach(function (s) { s.ultimaFirma = null; });
  }

  /*
   * Mover conductores entre jornadas (con el día cerrado: las caras llevan
   * data-arrastrable y los sitios donde ponerlos, data-destino). Dos formas,
   * que se mezclan:
   *   - Arrastrar: con ratón, empieza al mover unos píxeles; con el dedo,
   *     tras mantener pulsado medio segundo. Un retrato sigue al puntero y al
   *     soltar sobre un destino se llama a moverConductor.
   *   - Coger y tocar: con el dedo, mantener pulsado «coge» al conductor (y
   *     el móvil vibra un poco). Si el navegador se queda el gesto para
   *     desplazar la página (cancela el arrastre), o se suelta sin moverlo,
   *     sigue cogido: una barra dice «Toca dónde poner a…» y basta tocar el
   *     destino. «Cambiar de sitio» de la ficha también lo coge.
   * Tocar fuera de un destino, el mismo conductor, «Cancelar» o Escape lo
   * suelta sin moverlo.
   */
  const MS_PULSACION_LARGA = 450;
  ui.arrastre = null;
  ui.ignorarClic = false;
  // Conductor cogido: { origen: 'licencia|turno', nombre, modo } o null.
  // modo 'mover' (solo con el día cerrado) o 'comparar' (siempre: solo mira).
  ui.cogido = null;

  function coger(origen, modo) {
    modo = modo || 'mover';
    const x = ui.estadoActual && ui.conductorDe(ui.estadoActual, origen);
    if (!x || (modo === 'mover' && !Libre.sim.enPausa(ui.estadoActual))) return;
    ui.cogido = { origen, nombre: x.t.nombre, modo };
    pintarCogido();
  }

  function soltarCogido() {
    if (!ui.cogido) return;
    ui.cogido = null;
    pintarCogido();
  }

  /* Marca al cogido, resalta los destinos y enseña la barra (también tras redibujar). */
  function pintarCogido() {
    document.body.classList.toggle('eligiendo-destino', !!ui.cogido && ui.cogido.modo === 'mover');
    document.body.classList.toggle('eligiendo-comparar', !!ui.cogido && ui.cogido.modo === 'comparar');
    document.querySelectorAll('.cogido').forEach(function (el) { el.classList.remove('cogido'); });
    const barra = ui.$('barra-cogido');
    if (!ui.cogido) { barra.classList.add('oculto'); return; }
    const origen = document.querySelector('[data-ficha-conductor="' + ui.cogido.origen + '"]');
    if (origen) origen.classList.add('cogido');
    barra.querySelector('span').textContent = ui.cogido.modo === 'comparar'
      ? 'Toca a otro conductor para comparar con ' + ui.cogido.nombre
      : 'Toca dónde poner a ' + ui.cogido.nombre;
    barra.classList.remove('oculto');
  }

  function iniciarArrastre(opciones) {
    const main = ui.$('juego');

    function moverA(origen, destino) {
      ui.ejecutar('moverConductor', origen.split('|').concat([destino]));
      opciones.redibujar();
    }

    function marcarDestino(x, y) {
      document.querySelectorAll('.destino-activo').forEach(function (d) { d.classList.remove('destino-activo'); });
      const bajo = document.elementFromPoint(x, y);
      const destino = bajo && bajo.closest('[data-destino]');
      if (destino && destino.dataset.destino !== ui.arrastre.origen) destino.classList.add('destino-activo');
      return destino;
    }

    function activar() {
      if (!ui.arrastre) return;
      ui.arrastre.activo = true;
      clearTimeout(ui.arrastre.temporizador);
      // Con el dedo, un toque de vibración al cogerlo (si el móvil puede).
      if (!ui.arrastre.raton && navigator.vibrate) { try { navigator.vibrate(15); } catch (e) { /* da igual */ } }
      const fantasma = document.createElement('div');
      fantasma.className = 'fantasma-arrastre';
      fantasma.innerHTML = ui.arrastre.fila.querySelector('.retrato').outerHTML;
      document.body.appendChild(fantasma);
      ui.arrastre.fantasma = fantasma;
      document.body.classList.add('arrastrando');
      ui.arrastre.fila.classList.add('arrastrado');
      mover(ui.arrastre.x, ui.arrastre.y);
    }

    function mover(x, y) {
      ui.arrastre.fantasma.style.left = x + 'px';
      ui.arrastre.fantasma.style.top = y + 'px';
      marcarDestino(x, y);
    }

    function terminar() {
      if (!ui.arrastre) return;
      clearTimeout(ui.arrastre.temporizador);
      if (ui.arrastre.fantasma) ui.arrastre.fantasma.remove();
      ui.arrastre.fila.classList.remove('arrastrado');
      document.body.classList.remove('arrastrando');
      document.querySelectorAll('.destino-activo').forEach(function (d) { d.classList.remove('destino-activo'); });
      ui.arrastre = null;
    }

    /* El clic que sigue a soltar no abre la ficha (si no llega, no se queda colgado). */
    function saltarClic() {
      ui.ignorarClic = true;
      setTimeout(function () { ui.ignorarClic = false; }, 0);
    }

    main.addEventListener('pointerdown', function (ev) {
      if (ui.cogido) return;   // con uno cogido, se toca el destino
      const fila = ev.target.closest('[data-arrastrable]');
      if (!fila || ev.button > 0) return;
      ui.arrastre = { fila, origen: fila.dataset.fichaConductor, x: ev.clientX, y: ev.clientY, activo: false, raton: ev.pointerType === 'mouse' };
      if (!ui.arrastre.raton) ui.arrastre.temporizador = setTimeout(activar, MS_PULSACION_LARGA);
    });

    document.addEventListener('pointermove', function (ev) {
      if (!ui.arrastre) return;
      if (!ui.arrastre.activo) {
        const d = Math.hypot(ev.clientX - ui.arrastre.x, ev.clientY - ui.arrastre.y);
        if (ui.arrastre.raton && d > 6) { ui.arrastre.x = ev.clientX; ui.arrastre.y = ev.clientY; activar(); }
        else if (!ui.arrastre.raton && d > 10) terminar();   // desplaza la página
        return;
      }
      ev.preventDefault();
      mover(ev.clientX, ev.clientY);
    });

    // Mientras se arrastra con el dedo, la página no se desplaza.
    document.addEventListener('touchmove', function (ev) {
      if (ui.arrastre && ui.arrastre.activo) ev.preventDefault();
    }, { passive: false });

    document.addEventListener('pointerup', function (ev) {
      if (!ui.arrastre) return;
      if (ui.arrastre.activo) {
        const destino = marcarDestino(ev.clientX, ev.clientY);
        const origen = ui.arrastre.origen;
        const conDedo = !ui.arrastre.raton;
        saltarClic();
        terminar();
        if (destino && destino.dataset.destino !== origen) moverA(origen, destino.dataset.destino);
        else if (conDedo) coger(origen);   // soltado sin destino: queda cogido
        return;
      }
      terminar();
    });
    // El navegador se ha quedado el gesto (para desplazar): si ya estaba cogido, sigue cogido.
    document.addEventListener('pointercancel', function () {
      if (!ui.arrastre) return;
      const origen = ui.arrastre.activo && !ui.arrastre.raton ? ui.arrastre.origen : null;
      terminar();
      if (origen) { saltarClic(); coger(origen); }
    });
    main.addEventListener('contextmenu', function (ev) {
      if (ui.arrastre || ui.cogido) ev.preventDefault();
    });
    main.addEventListener('click', function (ev) {
      if (!ui.ignorarClic) return;
      ui.ignorarClic = false;
      ev.stopImmediatePropagation();
      ev.preventDefault();
    }, true);
    // Con uno cogido, el siguiente toque dice dónde va, o con quién se compara
    // (antes que cualquier otro clic).
    main.addEventListener('click', function (ev) {
      if (!ui.cogido) return;
      ev.stopImmediatePropagation();
      ev.preventDefault();
      const origen = ui.cogido.origen;
      const modo = ui.cogido.modo;
      soltarCogido();
      if (modo === 'comparar') {
        const otro = ev.target.closest('[data-ficha-conductor]');
        if (otro && otro.dataset.fichaConductor !== origen) {
          ui.comparando = [origen, otro.dataset.fichaConductor];
          opciones.alComparar();
        }
        return;
      }
      const destino = ev.target.closest('[data-destino]');
      if (destino && destino.dataset.destino !== origen) moverA(origen, destino.dataset.destino);
    }, true);
    ui.$('barra-cogido').addEventListener('click', function (ev) {
      if (ev.target.closest('[data-soltar]')) soltarCogido();
    });
  }

  /* Despedir siempre pide confirmación, con el nombre y el finiquito. */
  function confirmarDespido(args) {
    const hallado = ui.estadoActual && ui.conductorDe(ui.estadoActual, args[0] + '|' + args[1]);
    const x = hallado && hallado.t;
    if (!x) return false;
    return confirm('¿Despedir a ' + x.nombre + '? El finiquito cuesta ' + ui.euros(Libre.sim.costeDespido(x)) +
      ((x.objetos || []).length ? ' y sus objetos vuelven al almacén.' : '.'));
  }

  function iniciar(opciones) {
    ui.ejecutar = opciones.ejecutar;
    const main = ui.$('juego');
    main.innerHTML = secciones.map(function (s) {
      return '<section class="tarjeta" id="' + s.id + '"></section>';
    }).join('');

    document.querySelector('.menu-inferior').addEventListener('click', function (ev) {
      const b = ev.target.closest('[data-vista]');
      if (b) { cambiarVista(b.dataset.vista); opciones.redibujar(); }
    });
    aplicarVista();

    function abrirAjustes(abrir) {
      ui.ajustesAbiertos = abrir;
      ui.confirmarPartida = null;
      ui.enfocarAjustes = abrir;
      opciones.redibujar();
      if (!abrir) ui.$('abrir-ajustes').focus({ preventScroll: true });
    }
    ui.$('abrir-ajustes').addEventListener('click', function () { abrirAjustes(true); });
    /* Sale del editor de tu cara guardando el nombre escrito. */
    function cerrarAspecto() {
      if ((ui.nombreEditado.trim() || null) !== (ui.estadoActual.personaje.nombre || null)) ui.ejecutar('renombrarPersonaje', [ui.nombreEditado]);
      ui.editandoAspecto = false;
      opciones.redibujar();
    }
    document.addEventListener('input', function (ev) {
      if (ev.target.matches && ev.target.matches('[data-pj-nombre]')) ui.nombreEditado = ev.target.value;
    });
    function abrirPersonaje(abrir) {
      ui.personajeAbierto = abrir;
      ui.prestigio = null;
      ui.editandoAspecto = false;
      ui.enfocarPersonaje = abrir;
      opciones.redibujar();
      if (!abrir) ui.$('abrir-personaje').focus({ preventScroll: true });
    }
    ui.$('abrir-personaje').addEventListener('click', function () { abrirPersonaje(true); });

    main.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-cerrar-ajustes]')) {
        abrirAjustes(false);
        return;
      }
      if (ev.target.closest('[data-cerrar-personaje]')) {
        abrirPersonaje(false);
        return;
      }
      if (ev.target.closest('[data-intro-siguiente]')) { ui.introPaso++; opciones.redibujar(); return; }
      const opcionEvento = ev.target.closest('[data-evento-opcion]');
      if (opcionEvento) {
        const r = ui.ejecutar('elegirOpcionEvento', [Number(opcionEvento.dataset.eventoOpcion)]);
        if (r && r.eventos) ui.mostrarEventos(r.eventos);
        return;
      }
      if (ev.target.closest('[data-evento-seguir]')) { ui.ejecutar('cerrarEventoCliente', []); return; }
      if (ev.target.closest('[data-intro-saltar]') || ev.target.closest('[data-intro-empezar]')) {
        ui.introPaso = 0;
        ui.ejecutar('terminarIntro', []);
        return;
      }
      const pjGrupoBoton = ev.target.closest('[data-pj-grupo]');
      if (pjGrupoBoton) { ui.pjGrupo = pjGrupoBoton.dataset.pjGrupo; opciones.redibujar(); return; }
      if (ev.target.closest('[data-pj-editar]')) {
        ui.editandoAspecto = true;
        ui.nombreEditado = ui.estadoActual.personaje.nombre || '';
        opciones.redibujar();
        return;
      }
      if (ev.target.closest('[data-pj-cerrar-aspecto]')) { cerrarAspecto(); return; }
      // Prestigio: elegir mejoras, confirmar y empezar de cero.
      if (ev.target.closest('[data-pj-prestigio]')) {
        ui.prestigio = { compras: [], confirmar: false };
        opciones.redibujar();
        return;
      }
      const pjComprar = ev.target.closest('[data-pj-comprar]');
      if (pjComprar && ui.prestigio && !pjComprar.disabled) {
        const lista = ui.prestigio.compras.concat([pjComprar.dataset.pjComprar]);
        if (Libre.sim.probarComprasPersonaje(ui.estadoActual, lista).ok) ui.prestigio.compras = lista;
        opciones.redibujar();
        return;
      }
      const pjQuitar = ev.target.closest('[data-pj-quitar]');
      if (pjQuitar && ui.prestigio) {
        // Quita el último nivel añadido de esa mejora y lo que dependía de él.
        const lista = ui.prestigio.compras.slice();
        lista.splice(lista.lastIndexOf(pjQuitar.dataset.pjQuitar), 1);
        const validas = [];
        lista.forEach(function (id) {
          if (Libre.sim.probarComprasPersonaje(ui.estadoActual, validas.concat([id])).ok) validas.push(id);
        });
        ui.prestigio.compras = validas;
        opciones.redibujar();
        return;
      }
      if (ev.target.closest('[data-pj-cancelar]')) { ui.prestigio = null; opciones.redibujar(); return; }
      if (ev.target.closest('[data-pj-seguir]')) { ui.prestigio.confirmar = true; opciones.redibujar(); return; }
      if (ev.target.closest('[data-pj-volver]')) { ui.prestigio.confirmar = false; opciones.redibujar(); return; }
      if (ev.target.closest('[data-pj-reiniciar]') && ui.prestigio) {
        const compras = ui.prestigio.compras;
        ui.prestigio = null;
        if (opciones.partida.empezarDeCero(compras)) ui.sonar('nivel');
        else opciones.redibujar();
        return;
      }
      if (ev.target.closest('[data-cerrar-ticket]')) {
        ui.ticketAviso = null;
        opciones.redibujar();
        return;
      }
      if (ev.target.closest('[data-desglose]')) {
        ui.cajaAbierta = !ui.cajaAbierta;
        opciones.redibujar();
        if (ui.cajaAbierta) ui.$('sec-caja').scrollIntoView({ block: 'nearest' });
        return;
      }
      if (ev.target.closest('[data-zonas-cerradas]')) {
        mostrarMensaje('Zonas cerradas. ' + ui.textoZonasCerradas(ui.estadoActual) + '.');
        return;
      }
      if (ev.target.closest('[data-taxis-mas]')) {
        ui.taxisDesplegados = !ui.taxisDesplegados;
        opciones.redibujar();
        return;
      }
      const filaTaxi = ev.target.closest('[data-ir-licencia]');
      if (filaTaxi) {
        // A ese taxi en la pestaña Conductores.
        cambiarVista('conductores');
        opciones.redibujar();
        const destino = document.querySelector('.licencia[data-licencia="' + filaTaxi.dataset.irLicencia + '"]');
        if (destino) {
          destino.scrollIntoView({ block: 'center' });
          destellar(destino);
        }
        return;
      }
      const botonPartida = ev.target.closest('[data-partida]');
      if (botonPartida) {
        accionPartida(opciones.partida, botonPartida.dataset.partida, opciones.redibujar);
        return;
      }
      const nodo = ev.target.closest('[data-nodo]');
      if (nodo) {
        ui.nodoAbierto = nodo.dataset.nodo;
        ui.enfocarMejora = true;
        opciones.redibujar();
        return;
      }
      if (ev.target.closest('[data-cerrar-mejora]')) {
        ui.nodoAbierto = null;
        opciones.redibujar();
        return;
      }
      const objetivo = ev.target.closest('[data-objetivo]');
      if (objetivo) {
        if (!objetivo.classList.contains('listo')) return;
        // Lleva hasta la compra y la señala; no compra sola.
        if (objetivo.dataset.objetivoMejora) {
          // En el árbol: abre su rama y su ficha.
          const m = Libre.config.mejoras.find(function (x) { return x.id === objetivo.dataset.objetivoMejora; });
          ui.nodoAbierto = m.id;
          ui.enfocarMejora = true;
          cambiarVista('mejoras');
          opciones.redibujar();
        }
        const destino = document.querySelector(objetivo.dataset.objetivo);
        if (destino) {
          // La compra puede estar en otra pestaña: se va a ella primero.
          const vista = VISTA_DE[destino.closest('section').id];
          if (vista !== ui.vistaActual) cambiarVista(vista);
          destino.scrollIntoView({ block: 'center' });
          destellar(destino.closest('.licencia, .nodo') || destino);
        }
        return;
      }
      if (ev.target.closest('[data-cerrar-equipar]')) {
        ui.equipando = null;
        ui.enfocarHoja = 'ficha';
        opciones.redibujar();
        return;
      }
      const masMenos = ev.target.closest('[data-combinar-mas], [data-combinar-menos]');
      if (masMenos) {
        if (masMenos.disabled || !ui.combinarSel) return;
        const id = masMenos.dataset.combinarMas || masMenos.dataset.combinarMenos;
        ui.combinarSel.cuenta[id] = Math.max(0, (ui.combinarSel.cuenta[id] || 0) + (masMenos.dataset.combinarMas ? 1 : -1));
        opciones.redibujar();
        return;
      }
      if (ev.target.closest('[data-renombrar-sl]')) {
        if (ui.nuevoNombreSL === null) return;   // no has cambiado nada
        const r = ui.ejecutar('renombrarSociedad', [ui.nuevoNombreSL]);
        if (r && r.ok) ui.nuevoNombreSL = null;
        return;
      }
      if (ev.target.closest('[data-montar-sl]')) {
        ui.montandoSL = true;
        opciones.redibujar();
        const campo = document.getElementById('nombre-sl');
        if (campo) campo.focus({ preventScroll: true });
        return;
      }
      if (ev.target.closest('[data-cerrar-sl]')) {
        ui.montandoSL = false;
        opciones.redibujar();
        return;
      }
      const constituir = ev.target.closest('[data-constituir]');
      if (constituir) {
        if (constituir.disabled) return;
        const r = ui.ejecutar('montarSociedad', [ui.nombreSL]);
        if (r && r.ok) { ui.montandoSL = false; ui.nombreSL = ''; ui.sonar('nivel'); opciones.redibujar(); }
        return;
      }
      const coche = ev.target.closest('[data-coche]');
      if (coche) {
        ui.fichaConductor = null;
        ui.cocheAbierto = Number(coche.dataset.coche);
        opciones.redibujar();
        return;
      }
      const elegirCoche = ev.target.closest('[data-elegir-coche]');
      if (elegirCoche) {
        ui.eligiendoCoche = Number(elegirCoche.dataset.elegirCoche);
        ui.cocheAbierto = null;
        opciones.redibujar();
        return;
      }
      if (ev.target.closest('[data-cerrar-elegir-coche]')) {
        ui.eligiendoCoche = null;
        opciones.redibujar();
        return;
      }
      if (ev.target.closest('[data-cerrar-coche]')) {
        const id = ui.cocheAbierto;
        ui.cocheAbierto = null;
        opciones.redibujar();
        const origen = document.querySelector('[data-coche="' + id + '"]');
        if (origen) origen.focus({ preventScroll: true });
        return;
      }
      if (ev.target.closest('[data-cerrar-ficha]')) {
        ui.fichaConductor = null;
        opciones.redibujar();
        return;
      }
      if (ev.target.closest('[data-cerrar-candidatos]')) {
        cerrarCandidatos();
        return;
      }
      if (ev.target.closest('[data-cerrar-comparar]')) {
        cerrarComparar();
        return;
      }
      if (ev.target.closest('[data-intercambiar]')) {
        const par = ui.comparando;
        ui.comparando = null;
        ui.ejecutar('moverConductor', par[0].split('|').concat([par[1]]));
        opciones.redibujar();
        return;
      }
      const botonComparar = ev.target.closest('[data-comparar]');
      if (botonComparar) {
        ui.fichaConductor = null;
        opciones.redibujar();
        coger(botonComparar.dataset.comparar, 'comparar');
        return;
      }
      const botonCoger = ev.target.closest('[data-coger]');
      if (botonCoger) {
        ui.fichaConductor = null;
        opciones.redibujar();
        coger(botonCoger.dataset.coger);
        return;
      }
      const barraDia = ev.target.closest('[data-dia-estadistica]');
      if (barraDia) {
        ui.diaEstadistica = Number(barraDia.dataset.diaEstadistica);
        opciones.redibujar();
        return;
      }
      const abrirEquipar = ev.target.closest('[data-equipar]');
      if (abrirEquipar) {
        ui.equipando = abrirEquipar.dataset.equipar;
        ui.enfocarHoja = 'equipar';
        opciones.redibujar();
        return;
      }
      const abrirFicha = ev.target.closest('[data-ficha-conductor]');
      if (abrirFicha) {
        ui.fichaConductor = abrirFicha.dataset.fichaConductor;
        ui.enfocarHoja = 'ficha';
        // Desde Estadísticas: la ficha vive en Conductores.
        if (ui.vistaActual !== 'conductores') cambiarVista('conductores');
        opciones.redibujar();
        return;
      }
      const filtroCat = ev.target.closest('[data-filtro-categoria]');
      if (filtroCat) {
        ui.filtroCategoria = filtroCat.dataset.filtroCategoria;
        ui.guardarFiltro();
        opciones.redibujar();
        return;
      }
      const fichaInv = ev.target.closest('[data-ficha-inventario]');
      if (fichaInv) {
        const id = fichaInv.dataset.fichaInventario;
        ui.fichaInventario = ui.fichaInventario === id ? null : id;
        opciones.redibujar();
        return;
      }
      const botonTu = ev.target.closest('[data-panel-tu]');
      if (botonTu) {
        ui.panelTu = ui.panelTu === botonTu.dataset.panelTu ? null : botonTu.dataset.panelTu;
        opciones.redibujar();
        return;
      }
      if (ev.target.closest('[data-elegir-placa]')) {
        ui.eligiendoPlaca = !ui.eligiendoPlaca;
        opciones.redibujar();
        return;
      }
      if (ev.target.closest('[data-venta-contratar]')) {
        ui.ventaParaContratar = !ui.ventaParaContratar;
        opciones.redibujar();
        return;
      }
      const elegir = ev.target.closest('[data-elegir-conductor]');
      if (elegir) {
        ui.eligiendoConductor = elegir.dataset.elegirConductor;
        ui.ventaParaContratar = false;
        ui.enfocarHoja = 'candidatos';
        opciones.redibujar();
        return;
      }
      const el = ev.target.closest('button[data-accion]');
      if (!el || el.disabled) return;
      const args = el.dataset.args ? el.dataset.args.split('|') : [];
      if (el.dataset.accion === 'despedirConductor' && !confirmarDespido(args)) return;
      // Comprar el coche cierra la hoja de gamas (antes de redibujar).
      const eligiendo = ui.eligiendoCoche;
      if (el.dataset.accion === 'comprarVehiculo' && ui.eligiendoCoche) ui.eligiendoCoche = null;
      const resultado = ui.ejecutar(el.dataset.accion, args);
      if (eligiendo && el.dataset.accion === 'comprarVehiculo' && !(resultado && resultado.ok)) { ui.eligiendoCoche = eligiendo; opciones.redibujar(); }
      if (resultado && resultado.ok && el.dataset.accion === 'buscarCliente') ui.sonar('tic');
      if (resultado && resultado.pillado) ui.sonar('averia');
      if (resultado && resultado.ok && el.dataset.accion === 'comprarLicencia') {
        ui.eligiendoPlaca = false;
        opciones.redibujar();
      }
      if (resultado && resultado.ok && (el.dataset.accion === 'contratarConductor' || el.dataset.accion === 'contratarAReserva' ||
          el.dataset.accion === 'conducir')) {
        ui.eligiendoConductor = null;
        ui.ventaParaContratar = false;
        opciones.redibujar();
      }
      if (resultado && resultado.ok && el.dataset.accion === 'combinarObjetos') {
        // Se abre el panel de lo que ha salido.
        ui.fichaInventario = resultado.objeto;
        ui.sonar('objeto');
        opciones.redibujar();
      }
      if (resultado && resultado.ok && el.dataset.accion === 'equiparObjeto') {
        ui.equipando = null;
        ui.enfocarHoja = 'ficha';
        opciones.redibujar();
      }
      if (resultado && resultado.ok) destelloTrasCompra(el.dataset.accion, args);
    });

    // La comparación se abre encima de lo que haya (candidatos) y enfoca su ×.
    function abrirComparar() {
      ui.enfocarHoja = 'comparar';
      opciones.redibujar();
    }
    function cerrarComparar() {
      ui.comparando = null;
      opciones.redibujar();
    }
    iniciarArrastre({ redibujar: opciones.redibujar, alComparar: abrirComparar });

    // Filtro del almacén por lo que mejora (ui-almacen.js).
    main.addEventListener('change', function (ev) {
      const el = ev.target.closest('[data-filtro-stat]');
      if (!el) return;
      ui.filtroStat = el.value;
      ui.guardarFiltro();
      opciones.redibujar();
    });

    main.addEventListener('change', function (ev) {
      const el = ev.target.closest('[data-comparar-candidato]');
      if (!el || !el.value) return;
      ui.comparando = ['candidato|' + el.dataset.compararCandidato, el.value];
      abrirComparar();
    });

    // Al cerrar los candidatos, el foco vuelve al hueco que los abrió.
    function cerrarCandidatos() {
      const clave = ui.eligiendoConductor;
      ui.eligiendoConductor = null;
      ui.ventaParaContratar = false;
      opciones.redibujar();
      const origen = document.querySelector('[data-elegir-conductor="' + clave + '"]');
      if (origen) origen.focus({ preventScroll: true });
    }

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && ui.ajustesAbiertos) {
        abrirAjustes(false);
        return;
      }
      if (ev.key === 'Escape' && ui.personajeAbierto && ui.editandoAspecto) {
        cerrarAspecto();
        return;
      }
      if (ev.key === 'Escape' && ui.personajeAbierto) {
        abrirPersonaje(false);
        return;
      }
      if (ev.key === 'Escape' && ui.cogido) {
        soltarCogido();
        return;
      }
      if (ev.key === 'Escape' && ui.montandoSL) {
        ui.montandoSL = false;
        opciones.redibujar();
        return;
      }
      if (ev.key === 'Escape' && ui.eligiendoCoche) {
        ui.eligiendoCoche = null;
        opciones.redibujar();
        return;
      }
      if (ev.key === 'Escape' && ui.cocheAbierto) {
        const id = ui.cocheAbierto;
        ui.cocheAbierto = null;
        opciones.redibujar();
        const origen = document.querySelector('[data-coche="' + id + '"]');
        if (origen) origen.focus({ preventScroll: true });
        return;
      }
      if (ev.key === 'Escape' && ui.comparando) {
        cerrarComparar();
        return;
      }
      // Escape cierra la hoja de encima: el selector de objetos, luego los candidatos o la ficha.
      if (ev.key === 'Escape' && ui.equipando) {
        ui.equipando = null;
        ui.enfocarHoja = 'ficha';
        opciones.redibujar();
        return;
      }
      if (ev.key === 'Escape' && ui.eligiendoConductor) {
        cerrarCandidatos();
        return;
      }
      if (ev.key === 'Escape' && ui.nodoAbierto && ui.vistaActual === 'mejoras') {
        const id = ui.nodoAbierto;
        ui.nodoAbierto = null;
        opciones.redibujar();
        const origen = document.querySelector('[data-nodo="' + id + '"]');
        if (origen) origen.focus({ preventScroll: true });
        return;
      }
      if (ev.key === 'Escape' && ui.fichaConductor) {
        const clave = ui.fichaConductor;
        ui.fichaConductor = null;
        opciones.redibujar();
        const origen = document.querySelector('[data-ficha-conductor="' + clave + '"]');
        if (origen) origen.focus({ preventScroll: true });
      }
    });

    // Sonido y volumen: no son de la partida, van al módulo de sonidos.
    // Lo que se escribe o pega en la caja de la partida se guarda al momento.
    main.addEventListener('input', function (ev) {
      if (ev.target.id === 'partida-texto') ui.textoPartida = ev.target.value;
      if (ev.target.id === 'nombre-sl') ui.nombreSL = ev.target.value;
      if (ev.target.id === 'renombrar-sl') ui.nuevoNombreSL = ev.target.value;
    });

    main.addEventListener('change', function (ev) {
      const el = ev.target.closest('[data-sonido]');
      if (!el || !Libre.sonidos) return;
      if (el.dataset.sonido === 'activo') Libre.sonidos.cambiar({ activo: el.checked });
      else Libre.sonidos.cambiar({ volumen: Number(el.value) / 100 });
      opciones.redibujar();
      ui.sonar('cobro');   // para oír cómo queda
    });

    main.addEventListener('change', function (ev) {
      const el = ev.target.closest('[data-cambio]');
      if (!el) return;
      const valor = el.type === 'checkbox' ? String(el.checked) : el.value;
      ui.ejecutar(el.dataset.cambio, (el.dataset.args ? el.dataset.args.split('|') : []).concat([valor]));
    });
  }

  ui.estadoActual = null;   // el último dibujado (para confirmar acciones)

  /*
   * Calle de fondo de la cabecera (js/ambiente.js): se monta una vez y se
   * pone al día con el estado. La escena dice si es de noche, y la cabecera
   * cambia con ella sus colores (logo, engranaje y placa).
   */
  function dibujarEscena(estado) {
    const escena = ui.$('cabecera-escena');
    if (!escena.firstChild) Libre.ambiente.montar(escena);
    Libre.ambiente.dibujar(escena, estado);
    ui.$('cabecera').classList.toggle('noche', escena.dataset.momento === 'noche');
  }

  /* Qué hoja es (sus clases sin las de estado), para reconocerla al redibujar. */
  function claveHoja(h) {
    return Array.prototype.filter.call(h.classList, function (c) { return c !== 'ya-abierta'; }).sort().join(' ');
  }

  function dibujar(estado) {
    ui.estadoActual = estado;
    const info = Libre.sim.infoReloj(estado.reloj.minutos);
    fijarDinero(estado.dinero);
    // El día sigue la jornada (de 7:00 a 7:00): cambia cuando sale el ticket.
    const jornada = ui.jornadaDe(estado.reloj.minutos);
    // «Día 3 · Mié 07:00 · Tarifa 1»: el día de la semana abreviado, como en la maqueta.
    const reloj = 'Día ' + (jornada.dia + 1) + ' · ' + ui.textoHora(info).replace(/^(\S{3})\S*/, '$1') + ' · ' +
      Libre.config.tarifas[info.tarifa].nombre;
    if (ui.$('reloj').textContent !== reloj) ui.$('reloj').textContent = reloj;
    // Placa con el nombre de tu SL, junto al logo.
    const empresa = estado.empresa ? estado.empresa.nombre : '';
    if (ui.$('empresa').textContent !== empresa) { ui.$('empresa').textContent = empresa; ui.$('empresa').hidden = !empresa; }
    // Tu cara en el botón de la cabecera (solo si ha cambiado).
    const claveCara = Libre.config.personaje.imagen;
    if (ui.$('cara-personaje').dataset.clave !== claveCara) {
      ui.$('cara-personaje').innerHTML = ui.htmlImgTu();
      ui.$('cara-personaje').dataset.clave = claveCara;
    }
    // Nivel de tu personaje en la insignia de su botón.
    const nivelP = String(Libre.sim.nivelPersonaje(estado).nivel);
    if (ui.$('nivel-personaje').textContent !== nivelP) ui.$('nivel-personaje').textContent = nivelP;
    dibujarEscena(estado);

    secciones.forEach(function (s) {
      const el = ui.$(s.id);
      const firma = s.firma(estado);
      if (firma !== s.ultimaFirma) {
        const html = s.html(estado);
        // Las hojas que siguen abiertas tras redibujar (un aviso, un objeto
        // encontrado…) conservan su scroll y no repiten la animación de
        // subir (Iván, 19-11-2026: la ficha volvía arriba en cada aviso).
        const hojas = {};
        el.querySelectorAll('.hoja').forEach(function (h) { hojas[claveHoja(h)] = h.scrollTop; });
        el.innerHTML = html;
        el.querySelectorAll('.hoja').forEach(function (h) {
          const k = claveHoja(h);
          if (!(k in hojas)) return;
          h.classList.add('ya-abierta');
          h.scrollTop = hojas[k];
        });
        el.classList.toggle('oculto', html === '');
        s.ultimaFirma = firma;
      }
    });

    // data-solo-pausa: además, solo con el día cerrado (Renovar coche).
    const pausa = Libre.sim.enPausa(estado);
    document.querySelectorAll('[data-precio]').forEach(function (b) {
      b.disabled = estado.dinero < Number(b.dataset.precio) || (b.hasAttribute('data-solo-pausa') && !pausa);
    });

    secciones.forEach(function (s) {
      if (s.actualizar && !ui.$(s.id).classList.contains('oculto')) s.actualizar(estado);
    });

    // Cogido para moverlo: solo con el día cerrado; si no, se suelta. Tras
    // redibujar, se vuelve a marcar.
    if (ui.cogido && ui.cogido.modo === 'mover' && !Libre.sim.enPausa(estado)) soltarCogido();
    else if (ui.cogido && !document.querySelector('.cogido')) pintarCogido();

    vigilarCobros(estado);
    ui.vigilarCierres(estado);
    ui.soltarAviso();
    actualizarAvisos(estado);
  }

  ui.temporizadorMensaje = null;
  /* Mensaje breve abajo. Con retrato, sale la cara del conductor al lado. */
  function mostrarMensaje(texto, retrato, categoria) {
    const el = ui.$('mensaje');
    if (retrato !== undefined && retrato !== null) {
      // Con categoría (un objeto encontrado), su etiqueta de color al final.
      el.innerHTML = '<span class="retrato">' + Libre.retratos.svg(retrato) + '</span><span>' + ui.esc(texto) +
        (categoria ? ' ' + ui.etiquetaCategoria(categoria) : '') + '</span>';
      el.classList.add('con-retrato');
    } else {
      el.textContent = texto;
      el.classList.remove('con-retrato');
    }
    el.classList.remove('oculto');
    // Mientras se ve, la página tiene debajo un hueco de su alto: así se puede
    // bajar hasta lo que tapa, como «Ver los N restantes» (Iván, 26-11-2026).
    document.body.style.setProperty('--hueco-aviso', (el.offsetHeight + 12) + 'px');
    clearTimeout(ui.temporizadorMensaje);
    ui.temporizadorMensaje = setTimeout(function () {
      el.classList.add('oculto');
      document.body.style.removeProperty('--hueco-aviso');
    }, 3500);
  }

  // Lo que usan los otros archivos de la interfaz y main.js.
  Object.assign(ui, { iniciar, reiniciar, dibujar, mostrarMensaje, flotantes, movimientoReducido });
})(globalThis);
