/*
 * Libre · interfaz: pestaña Calle (taxímetro, «Tus taxis hoy», «Siguiente», ticket, caja y zonas).
 * Parte de Libre.ui (ver la cabecera de js/interfaz.js).
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};
  const ui = Libre.ui = Libre.ui || {};

  // ---------------------------------------------------------- Secciones

  /*
   * Taxímetro: centro de la pantalla.
   *   A mano: todo el taxímetro es el botón de buscar cliente. El piloto
   *   "LIBRE" se apaga cuando sube el pasajero y el importe sube en vivo.
   *   Automático: suma en vivo la recaudación de hoy de la flota.
   */
  /*
   * Display de LED con la letra DSEG7, que no tiene coma ni €: las cifras
   * llevan punto decimal y sin separador de miles («1234.56»), y el € va
   * aparte con la letra del cuerpo. Encima, la etiqueta (una o dos líneas:
   * qué marca y en qué estás). Sin alto extra: todo cabe en los 132 px de
   * la maqueta.
   */
  // Luces de la racha bajo la tarifa: se encienden de izquierda a derecha
  // según lo cerca que estés del tope (solo interfaz, no es un número de juego).
  const LUCES_RACHA = 10;
  function htmlDisplay() {
    return '<span class="taximetro-izquierda">' +
      '<span class="piloto" id="tx-piloto">LIBRE</span>' +
      '<span class="tx-tarifa" id="tx-tarifa"></span>' +
      '<span class="racha-luces" id="racha-luces" aria-hidden="true">' + '<i></i>'.repeat(LUCES_RACHA) + '</span>' +
      '</span>' +
      '<span class="display">' +
      '<span class="display-etiqueta"><span id="tx-etiqueta"></span><small id="tx-estado"></small></span>' +
      '<span class="display-cifras"><span class="display-valor" id="tx-valor">0.00</span>' +
      '<span class="display-euro">€</span></span>' +
      '<span class="progreso"><span id="carrera-barra"></span></span>' +
      '</span>';
  }

  /* «1234.56»: el LED no tiene coma ni separador de miles. */
  function textoLed(valor) {
    return (Math.round(valor * 100) / 100).toFixed(2);
  }

  /*
   * Rellena el display. etiqueta: qué marca (IMPORTE, RECAUDACIÓN HOY…);
   * estado: la segunda línea (qué pasa ahora). piloto: 'libre', 'ocupado'
   * o 'flota'. chip: el texto del cuadro de debajo del piloto (la tarifa, o
   * en modo flota la hora de tu turno).
   */
  function pintarDisplay(valor, etiqueta, estadoTexto, piloto, chip) {
    const texto = textoLed(valor);
    const v = ui.$('tx-valor');
    if (v.textContent !== texto) {
      v.textContent = texto;
      // Con cifras de más se encoge para que no se salga: en 375 px de ancho
      // caben unas 3,8 cifras de 48 px junto al €.
      const cifras = texto.replace('.', '').length;
      v.parentNode.style.setProperty('--escala', Math.min(1, 3.8 / cifras).toFixed(3));
    }
    ui.$('tx-etiqueta').textContent = etiqueta;
    ui.$('tx-estado').textContent = estadoTexto;
    ui.$('tx-tarifa').innerHTML = chip;
    const p = ui.$('tx-piloto');
    p.className = 'piloto piloto-' + piloto;
    if (piloto === 'vigilado') {
      // Un pesetas te mira: un ojo y «OJO».
      if (!p.querySelector('svg')) p.innerHTML = '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true">' + ICONO_OJO + '</svg>OJO';
    } else {
      p.textContent = piloto === 'flota' ? 'FLOTA' : piloto === 'libre' ? 'LIBRE' : 'OCUPADO';
    }
  }

  const ICONO_OJO = '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
  // Para avisar cuando el pesetas se va (la vigilancia pasa de activa a no).
  ui.vigilanciaAntes = false;

  function chipTarifa(tarifaId) {
    return ui.esc(Libre.config.tarifas[tarifaId].nombre.toUpperCase());
  }

  /*
   * Dos modos, que cambian solos:
   *   conductor  conduces tú y es tu turno (o aún no tienes conductores):
   *              el taxímetro es el botón de buscar cliente.
   *   flota      el resto del tiempo: el display suma lo recaudado hoy por
   *              toda la flota y al tocarlo se abre el desglose de la caja.
   *   libranza   libra tu licencia y nadie puede trabajar hoy
   *              (`puedeSaltarDia()`): tocarlo salta al cierre.
   */
  function modoTaximetro(estado) {
    const s = Libre.sim;
    if (s.puedeSaltarDia(estado)) return 'libranza';
    return s.conduce(estado) && (s.jugadorEnTurno(estado) || !s.hayConductores(estado)) ? 'conductor' : 'flota';
  }
  ui.modoAnterior = null;

  /* Por qué no trabajas hoy, en el modo libranza: libras, sin coche o en el taller. */
  function textoSalto(estado) {
    const u = Libre.sim.ubicacionJugador(estado);
    const lic = u && estado.licencias.find(function (l) { return l.id === u.licenciaId; });
    const motivo = lic && !Libre.sim.libra(estado, lic) ? Libre.sim.motivoSinCoche(estado, lic) : null;
    if (motivo === 'sinCoche') return { etiqueta: 'SIN COCHE', aria: 'Tu licencia no tiene coche: saltar al cierre de caja' };
    if (motivo === 'taller') return { etiqueta: 'COCHE EN EL TALLER', aria: 'Tu coche está en el taller: saltar al cierre de caja' };
    return { etiqueta: 'HOY LIBRAS', aria: 'Hoy libras: saltar al cierre de caja' };
  }

  /* «2 ocupados · 2 libres · 1 parado» (sin los grupos vacíos). */
  function resumenFlota(taxis) {
    const n = { ocupado: 0, libre: 0, parado: 0 };
    taxis.forEach(function (t) { n[t.situacion]++; });
    const partes = [];
    if (n.ocupado) partes.push(n.ocupado + (n.ocupado === 1 ? ' ocupado' : ' ocupados'));
    if (n.libre) partes.push(n.libre + (n.libre === 1 ? ' libre' : ' libres'));
    if (n.parado) partes.push(n.parado + (n.parado === 1 ? ' parado' : ' parados'));
    return partes.join(' · ') || 'Sin taxis';
  }

  const seccionTaximetro = {
    id: 'sec-taximetro',
    firma: function (estado) { return modoTaximetro(estado); },
    html: function (estado) {
      const modo = modoTaximetro(estado);
      // Transición breve solo cuando cambia de modo, no al cargar.
      const clase = ui.modoAnterior && ui.modoAnterior !== modo ? ' cambio-modo' : '';
      ui.modoAnterior = modo;
      if (modo === 'flota') {
        return '<button type="button" class="taximetro taximetro-flota' + clase + '" data-desglose ' +
          'aria-label="Recaudación de hoy de la flota: ver el desglose">' + htmlDisplay() + '</button>';
      }
      if (modo === 'libranza') {
        return '<button type="button" class="taximetro taximetro-boton' + clase + '" data-accion="saltarAlCierre" ' +
          'aria-label="' + ui.esc(textoSalto(estado).aria) + '">' + htmlDisplay() + '</button>';
      }
      return '<button type="button" class="taximetro taximetro-boton' + clase + '" data-accion="buscarCliente" ' +
        'aria-label="Taxímetro: buscar cliente">' + htmlDisplay() + '</button>';
    },
    actualizar: function (estado) {
      const c = Libre.config;
      const info = Libre.sim.infoReloj(estado.reloj.minutos);

      if (modoTaximetro(estado) === 'libranza') {
        pintarDisplay(0, textoSalto(estado).etiqueta, 'Toca para saltar al cierre ›', 'libre', chipTarifa(info.tarifa));
        ui.$('tx-estado').classList.remove('latido');
        ui.$('carrera-barra').style.width = '0%';
        return;
      }
      if (modoTaximetro(estado) === 'flota') {
        // Debajo del piloto, la hora de tu turno (la tarifa ya está en la placa).
        const u = Libre.sim.ubicacionJugador(estado);
        const chip = u ? '<small>TU TURNO</small>' + ui.dos(c.turnos[u.turno].horaInicio) + ':00' : chipTarifa(info.tarifa);
        pintarDisplay(estado.caja.hoy.ingresos, 'RECAUDACIÓN HOY ›', resumenFlota(taxisDeLaFlota(estado)), 'flota', chip);
        return;
      }

      const carrera = estado.jugador.carrera;
      const enCurso = Libre.sim.importeEnCurso(estado);
      const conPasajero = enCurso !== null;
      // Libre: la etiqueta del display recuerda la última carrera.
      const ultima = estado.jugador.ultimaCarrera;

      const boton = document.querySelector('.taximetro-boton');
      const pausa = Libre.sim.enPausa(estado);
      const parado = estado.jugador.paradoHasta > estado.reloj.minutos;
      const enTurno = Libre.sim.jugadorEnTurno(estado) && !parado;
      const miTurno = c.turnos[Libre.sim.ubicacionJugador(estado).turno];
      const suLic = estado.licencias.find(function (l) { return l.id === Libre.sim.ubicacionJugador(estado).licenciaId; });
      // De incógnito («Incógnito al volante») trabajas aunque libre tu licencia.
      const libras = Libre.sim.libra(estado, suLic) &&
        !Libre.sim.trabajaIncognito(estado, suLic, Libre.sim.ubicacionJugador(estado).datos, estado.reloj.minutos);
      const vigilado = Libre.sim.vigilanciaActiva(estado) && !pausa;
      const segVigila = Math.ceil(Libre.sim.segundosVigilancia(estado));
      const sinCoche = Libre.sim.motivoSinCoche(estado, estado.licencias.find(function (l) {
        return l.id === Libre.sim.ubicacionJugador(estado).licenciaId;
      }));
      boton.disabled = !!carrera || pausa || !enTurno || libras || !!sinCoche;
      const estadoTexto = pausa ? 'Día cerrado'
        : libras ? 'Hoy libra tu licencia: descansas'
        : sinCoche === 'sinCoche' ? 'Tu licencia no tiene coche'
        : sinCoche === 'taller' ? 'Tu coche está en el taller'
        : conPasajero ? 'Con pasajero · ' + ui.numero(carrera.km) + ' km'
        : carrera ? c.zonas[carrera.zona].textoEspera + '…'
        : parado ? (estado.jugador.motivoParada === 'descanso' ? 'Descansando' : 'Parado') + ' hasta las ' + ui.horaDe(estado.jugador.paradoHasta)
        : !enTurno ? 'Tu turno empieza a las ' + ui.dos(miTurno.horaInicio) + ':00'
        // Tu energía (cansancio), al lado: a 0 descansas 30 min de juego.
        // Primero la energía: si no cabe (móviles muy estrechos), se corta lo otro.
        : 'Energía ' + Math.round(Libre.sim.energia(estado, estado.jugador) / c.cansancio.maximo * 100) + ' % · Toca para buscar';
      // Un pesetas te mira (Iván, 20-11-2026): marco y piloto amarillos,
      // cuenta atrás y la barra vaciándose. Lo que ya llevas no cuenta.
      ui.$('sec-taximetro').querySelector('.taximetro').classList.toggle('vigilado', vigilado);
      if (vigilado) {
        pintarDisplay(conPasajero ? enCurso : 0, conPasajero ? 'IMPORTE' : 'UN PESETAS TE MIRA',
          (carrera ? 'No cargues la siguiente · ' : 'No cargues · ') + segVigila + ' s', 'vigilado',
          chipTarifa(conPasajero ? carrera.tarifa : info.tarifa));
      } else {
        // Racha (idea 21): «· RACHA ×1,05» junto a la etiqueta, sin añadir alto.
        const racha = Libre.sim.rachaActual(estado);
        // Delante, para que si no cabe se corte lo otro (móviles estrechos).
        const textoRacha = racha.n > 0 ? 'RACHA ×' + (1 + racha.bono).toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' · ' : '';
        pintarDisplay(conPasajero ? enCurso : 0,
          textoRacha + (conPasajero ? 'IMPORTE' : ultima ? 'ÚLTIMA ' + ui.euros(ultima.importe) : 'IMPORTE'),
          estadoTexto, conPasajero ? 'ocupado' : 'libre', chipTarifa(conPasajero ? carrera.tarifa : info.tarifa));
      }
      if (ui.vigilanciaAntes && !vigilado && !parado && ui.vistaActual === 'calle') ui.mostrarMensaje('El pesetas se ha ido: ya puedes cargar.');
      ui.vigilanciaAntes = vigilado;
      // Latido suave mientras el taxi espera a que lo toques.
      ui.$('tx-estado').classList.toggle('latido', !pausa && !carrera && enTurno && !libras && !sinCoche && !vigilado);

      const barra = ui.$('carrera-barra');
      const v = estado.jugador.vigilancia;
      // Racha (Iván, 23-11-2026): el taxímetro se ilumina más cuanto más
      // encadenas (--racha, de 0 a 1) y, tras cobrar, la raya de abajo es el
      // tiempo que te queda para la siguiente.
      const rv = Libre.sim.rachaActual(estado);
      const tx = ui.$('sec-taximetro').querySelector('.taximetro');
      tx.style.setProperty('--racha', rv.nivel.toFixed(2));
      tx.classList.toggle('racha-viva', rv.n > 0);
      tx.classList.toggle('racha-max', rv.n > 0 && rv.n >= rv.maximo);
      ui.sonarRacha(estado, rv);
      const encendidas = rv.n > 0 ? Math.max(1, Math.round(rv.nivel * LUCES_RACHA)) : 0;
      Array.prototype.forEach.call(ui.$('racha-luces').children, function (luz, i) {
        luz.classList.toggle('encendida', i < encendidas);
      });
      const enVentana = !carrera && !vigilado && rv.ventana !== null;
      barra.classList.toggle('racha-ventana', enVentana);
      const p = vigilado && !carrera ? (v.hasta - estado.reloj.minutos) / (v.hasta - v.desde)
        : carrera ? Math.min(1, (estado.reloj.minutos - carrera.inicio) / (carrera.fin - carrera.inicio))
        : enVentana ? rv.ventana : 0;
      barra.style.width = (p * 100).toFixed(1) + '%';
    }
  };

  function filasCaja(caja, prefijo, fijosPrevistos) {
    const fila = function (texto, campo, signo) {
      return '<div><dt>' + texto + '</dt><dd id="' + prefijo + '-' + campo + '">' +
        (caja ? signo + ui.euros(caja[campo]) : '') + '</dd></div>';
    };
    return '<dl class="filas">' +
      '<div><dt>Carreras</dt><dd id="' + prefijo + '-carreras">' + (caja ? Math.floor(caja.carreras) : '') + '</dd></div>' +
      fila('Recaudación', 'ingresos', '') +
      fila('Combustible', 'combustible', '−') +
      fila('Conductores', 'conductores', '−') +
      fila(fijosPrevistos ? 'Costes fijos (al cierre)' : 'Costes fijos', 'fijos', '−') +
      fila('Propinas y recompensas', 'extras', '') +
      fila('Gastos por incidencias', 'otros', '−') +
      '<div class="total"><dt>Neto</dt><dd id="' + prefijo + '-neto">' + (caja ? ui.euros(Libre.sim.netoCaja(caja)) : '') + '</dd></div>' +
      '</dl>';
  }

  const MOTIVO_PARADA = { pinchazo: 'Pinchazo', vomito: 'Limpieza', lluvia: 'Lluvia', pesetas: 'Multa', descanso: 'Descansando', evento: 'Con un cliente' };
  const TEXTO_SITUACION = { libranza: 'Libranza', averia: 'Avería', baja: 'De baja', vacio: 'Sin conductor', dirigiendo: 'Dirigiendo' };

  /*
   * Todos los taxis con coche, de más a menos facturado en la jornada:
   * { licencia, quien, conductor (su turno, o null si eres tú o no hay nadie),
   *   retrato, zona, facturado, enCarrera, icono,
   *   situacion ('ocupado', 'libre' o 'parado'), motivo }.
   */
  function taxisDeLaFlota(estado) {
    const ahora = estado.reloj.minutos;
    const turno = Libre.sim.turnoDeHora(Libre.sim.infoReloj(ahora).hora);
    const jornada = Libre.sim.jornadaDe(ahora);
    const pausa = Libre.sim.enPausa(estado);
    return estado.licencias.filter(function (l) { return l.vehiculo; }).map(function (lic) {
      // El Pelado, solo en su coche, también sale en el turno vacío. Quien
      // no conduce (Daniela) sale con su chip «Dirigiendo» y el coche parado.
      const jefa = Libre.sim.noConduce(lic.turnos[turno]) ? lic.turnos[turno] : null;
      const t = jefa || Libre.sim.enTurno(lic, turno);
      const carrera = !t ? null : t.quien === 'jugador' ? estado.jugador.carrera : t.carrera;
      const enCurso = Libre.sim.importeDeCarrera(estado, carrera);
      let icono = null;
      // De incógnito (Iván, 20-11-2026): trabaja aunque su licencia libre.
      const incognito = Libre.sim.trabajaIncognito(estado, lic, t, ahora);
      if (Libre.sim.libra(estado, lic) && !incognito) icono = 'libranza';
      else if (lic.averia && jornada < lic.averia.hasta) icono = 'averia';
      else if (!t) icono = 'vacio';
      else if (t.quien === 'conductor' && t.baja && jornada < t.baja.hasta) icono = 'baja';
      else if (jefa) icono = 'dirigiendo';
      else if ((t.quien === 'jugador' ? estado.jugador.paradoHasta : t.paradoHasta) > ahora) icono = 'fin';
      const motivoParada = t ? (t.quien === 'jugador' ? estado.jugador.motivoParada : t.motivoParada) : null;
      return {
        licencia: lic,
        quien: t ? (t.quien === 'jugador' ? Libre.sim.nombrePersonaje(estado) : t.nombre) : 'Sin conductor',
        tu: !!t && t.quien === 'jugador',
        aspecto: t && t.quien === 'jugador' ? Libre.sim.aspectoPersonaje(estado) : null,
        conductor: t && t.quien === 'conductor' ? t : null,
        retrato: t && t.quien === 'conductor' ? Libre.sim.caraDe(t) : null,
        zona: t ? t.zona : null,
        facturado: (lic.facturadoJornada || 0) + (enCurso || 0),
        enCarrera: enCurso !== null && !pausa,
        icono,
        situacion: icono ? 'parado' : enCurso !== null ? 'ocupado' : 'libre',
        incognito,
        motivo: icono === 'fin' ? (MOTIVO_PARADA[motivoParada] || 'Parado') : icono ? TEXTO_SITUACION[icono] : null
      };
    }).sort(function (a, b) { return b.facturado - a.facturado; });
  }

  /*
   * Tus taxis hoy: una fila por taxi, de más a menos facturado en la jornada.
   * Las filas se crean una vez (firma: qué taxis hay y si la lista está
   * desplegada) y en cada fotograma solo se rellenan y se recolocan; cuando
   * un taxi adelanta a otro se deslizan a su sitio (técnica FLIP: se mide,
   * se mueve en el DOM y se anima desde la posición vieja). Al cobrar, la
   * fila destella. Tocar una fila lleva a ese taxi en Conductores.
   */
  const MAX_FILAS_TAXIS = 6;
  ui.taxisDesplegados = false;
  ui.filasRecienCreadas = false;   // la primera colocación no se anima

  function htmlRetratoFila(t) {
    if (t.retrato !== null && t.retrato !== undefined) {
      // Con su rareza y su nivel, como la cara de Conductores.
      return '<span class="cara-foto"><span class="retrato' + (t.icono === 'baja' ? ' atenuado' : '') + '">' +
        Libre.retratos.svg(Libre.sim.caraDe(t)) + '</span>' + (t.conductor ? ui.htmlCirculos(t.conductor) : '') + '</span>';
    }
    // Tú, con tu cara; o un turno sin conductor.
    if (t.tu) return '<span class="retrato tu">' + htmlImgTu() + '</span>';
    return '<span class="retrato retrato-texto"></span>';
  }
  /* Tu cara (el retrato que eliges en la hoja del personaje). */
  function htmlCaraTu(estado) {
    return '<span class="retrato tu">' + htmlImgTu() + '</span>';
  }
  /* Tu retrato (imagen hecha con IA; Iván, 26-11-2026). */
  function htmlImgTu() {
    return '<img class="retrato-svg retrato-tu-img" src="' + ui.esc(Libre.config.personaje.imagen) + '" alt="">';
  }

  /* Chip de estado de un taxi: Libre, Ocupado, Libranza, De baja o parado (ámbar). */
  function claseSituacion(t) {
    if (t.incognito && t.situacion !== 'parado') return 'ui-chip ui-chip--incognito';
    if (t.situacion !== 'parado') return 'ui-chip ui-chip--' + t.situacion;
    if (t.icono === 'libranza') return 'ui-chip ui-chip--libranza';
    if (t.icono === 'baja') return 'ui-chip ui-chip--baja';
    if (t.icono === 'dirigiendo') return 'ui-chip ui-chip--incognito';
    return 'ui-chip ui-chip--parado';
  }

  const seccionTaxis = {
    id: 'sec-taxis',
    firma: function (estado) {
      return estado.licencias.filter(function (l) { return l.vehiculo; }).map(function (l) { return l.id; }).join(',') +
        '|' + ui.taxisDesplegados;
    },
    html: function (estado) {
      const ids = estado.licencias.filter(function (l) { return l.vehiculo; }).map(function (l) { return l.id; });
      const filas = ids.map(function (id) {
        return '<li class="taxi-fila" data-fila-taxi="' + id + '"><button type="button" data-ir-licencia="' + id + '">' +
          '<span class="taxi-retrato"></span>' +
          '<span class="taxi-quien"><strong></strong><small class="taxi-licencia"></small><small class="taxi-zona"></small></span>' +
          '<span class="taxi-situacion"></span>' +
          '<span class="taxi-importe ui-dinero"></span>' +
          '<span class="taxi-barra ui-barra"><span class="ui-barra-relleno"></span></span>' +
          '</button></li>';
      }).join('');
      const resto = ids.length - MAX_FILAS_TAXIS;
      ui.filasRecienCreadas = true;
      return '<div class="taxis-cabecera"><h2 class="ui-titulo">Tus taxis hoy</h2>' +
        '<button type="button" class="taxis-total ui-dinero" data-desglose aria-label="Ver el desglose de la caja de hoy"><span id="taxis-total"></span></button></div>' +
        '<ol class="taxis-lista" id="taxis-lista">' + filas + '</ol>' +
        (resto > 0
          ? '<button type="button" class="taxis-mas" data-taxis-mas>' +
            (ui.taxisDesplegados ? 'Ver solo los ' + MAX_FILAS_TAXIS + ' primeros' : 'Ver los ' + resto + ' restantes') + '</button>'
          : '');
    },
    actualizar: function (estado) {
      const lista = ui.$('taxis-lista');
      const taxis = taxisDeLaFlota(estado);
      const maximo = taxis.length ? Math.max(taxis[0].facturado, 0.01) : 1;
      ui.$('taxis-total').textContent = ui.euros(estado.caja.hoy.ingresos);

      // FLIP 1: dónde está cada fila antes de recolocar.
      const filas = {};
      lista.querySelectorAll('[data-fila-taxi]').forEach(function (li) { filas[li.dataset.filaTaxi] = li; });
      const orden = taxis.map(function (t) { return String(t.licencia.id); });
      const actual = Array.prototype.map.call(lista.children, function (li) { return li.dataset.filaTaxi; });
      const cambia = orden.join(',') !== actual.join(',');
      const animar = cambia && !ui.filasRecienCreadas && !ui.movimientoReducido.matches;
      ui.filasRecienCreadas = false;
      const antes = {};
      if (animar) orden.forEach(function (id) { if (filas[id]) antes[id] = filas[id].getBoundingClientRect().top; });

      taxis.forEach(function (t, i) {
        const li = filas[t.licencia.id];
        if (!li) return;
        // El retrato solo se rehace si cambia quién conduce.
        const claveRetrato = t.quien + '|' + t.retrato + '|' + (t.aspecto ? JSON.stringify(t.aspecto) : '') + '|' + (t.icono === 'baja') +
          (t.conductor ? '|' + t.conductor.categoria + '|' + Libre.sim.nivelConductor(t.conductor) : '');
        if (li.dataset.retrato !== claveRetrato) {
          li.querySelector('.taxi-retrato').innerHTML = htmlRetratoFila(t);
          li.dataset.retrato = claveRetrato;
        }
        li.querySelector('.taxi-quien strong').textContent = t.quien;
        const zona = t.zona && Libre.config.zonas[t.zona];
        // Licencia y zona («15288-L · Centro»): si no cabe, se corta solo la zona.
        li.querySelector('.taxi-licencia').textContent = Libre.sim.textoLicencia(t.licencia);
        li.querySelector('.taxi-zona').textContent = zona ? '· ' + zona.nombre : '';
        const sit = li.querySelector('.taxi-situacion');
        sit.textContent = t.incognito && t.situacion !== 'parado' ? 'Incógnito'
          : t.situacion === 'ocupado' ? 'Ocupado' : t.situacion === 'libre' ? 'Libre' : t.motivo;
        sit.className = 'taxi-situacion ' + claseSituacion(t);
        li.querySelector('.taxi-importe').textContent = ui.euros(t.facturado);
        li.querySelector('.taxi-barra > span').style.width = (Math.max(0, t.facturado) / maximo * 100).toFixed(1) + '%';
        li.classList.toggle('fuera', !ui.taxisDesplegados && i >= MAX_FILAS_TAXIS);
        const cat = t.conductor && Libre.sim.buscarCategoria(t.conductor.categoria);
        li.querySelector('button').setAttribute('aria-label',
          t.quien + (cat ? ', categoría ' + cat.nombre + ', nivel ' + Libre.sim.nivelConductor(t.conductor) : '') +
          ', licencia ' + Libre.sim.textoLicencia(t.licencia) + ', ' + sit.textContent + ', ' + ui.euros(t.facturado) + ' hoy. Ver en Conductores');
      });

      if (!cambia) return;
      // FLIP 2: se ordenan en el DOM y se animan desde donde estaban.
      orden.forEach(function (id) { if (filas[id]) lista.appendChild(filas[id]); });
      if (!animar) return;
      orden.forEach(function (id) {
        const li = filas[id];
        if (!li || antes[id] === undefined || li.classList.contains('fuera')) return;
        const delta = antes[id] - li.getBoundingClientRect().top;
        if (Math.abs(delta) < 1) return;
        li.style.transition = 'none';
        li.style.transform = 'translateY(' + delta + 'px)';
        void li.offsetWidth;
        li.style.transition = '';
        li.style.transform = '';
      });
    }
  };

  /* Destello breve en la fila del taxi que acaba de cobrar. */
  function destellarFila(licenciaId) {
    const li = document.querySelector('[data-fila-taxi="' + licenciaId + '"]');
    if (!li || ui.movimientoReducido.matches) return;
    li.classList.remove('cobro');
    void li.offsetWidth;
    li.classList.add('cobro');
    setTimeout(function () { li.classList.remove('cobro'); }, 700);
  }

  /*
   * Objetivo: lo que propone Libre.sim.objetivoCompra() (lo que hace crecer
   * la flota: coche, conductor o licencia, y solo mejoras baratas). Se queda
   * fijo hasta que lo compras (o deja de estar entre lo propuesto); así,
   * cuando llega el dinero, la barra se pone verde en vez de saltar a otra.
   */
  ui.objetivoId = null;

  /* Nombre y a dónde lleva cada compra de la simulación. */
  function decorarCompra(estado, x) {
    const c = Libre.config;
    const lic = x.licenciaId ? Libre.sim.buscarLicencia(estado, x.licenciaId) : null;
    if (x.tipo === 'coche') {
      return Object.assign({ nombre: 'Coche para la licencia ' + Libre.sim.textoLicencia(lic),
        selector: '[data-licencia="' + x.licenciaId + '"]' }, x);
    }
    if (x.tipo === 'conductor') {
      return Object.assign({
        nombre: Libre.sim.hayConductores(estado)
          ? 'Conductor de ' + c.turnos[x.turno].nombre.toLowerCase() + ' (licencia ' + Libre.sim.textoLicencia(lic) + ')'
          : 'Tu primer conductor',
        selector: '[data-elegir-conductor="' + x.licenciaId + '|' + x.turno + '"]'
      }, x);
    }
    if (x.tipo === 'mejora') {
      const m = Libre.sim.buscarMejora(x.mejora);
      return Object.assign({ nombre: m.nombre + (m.niveles ? ' ' + x.nivel : ''),
        selector: '[data-mejora="' + x.mejora + '"]' }, x);
    }
    if (x.tipo === 'sociedad') return Object.assign({ nombre: 'Montar tu sociedad limitada', selector: '[data-montar-sl]' }, x);
    return Object.assign({ nombre: 'Nueva licencia', selector: '[data-elegir-placa]' }, x);
  }

  function objetivoActual(estado) {
    const o = Libre.sim.objetivoCompra(estado, ui.objetivoId);
    if (!o) return null;
    ui.objetivoId = o.id;
    return decorarCompra(estado, o);
  }

  const seccionObjetivo = {
    id: 'sec-objetivo',
    firma: function (estado) {
      const o = objetivoActual(estado);
      return o ? o.id + (estado.dinero >= o.precio ? ':si' : ':no') : 'nada';
    },
    html: function (estado) {
      const o = objetivoActual(estado);
      if (!o) return '';
      const listo = estado.dinero >= o.precio;
      return '<button type="button" class="objetivo ui-tarjeta' + (listo ? ' listo' : '') + '" data-objetivo="' + ui.esc(o.selector) + '"' +
        (o.mejora ? ' data-objetivo-mejora="' + o.mejora + '"' : '') + '>' +
        '<span class="objetivo-texto"><span>Siguiente · <strong>' + ui.esc(o.nombre) + '</strong></span>' +
        '<span id="objetivo-falta"></span></span>' +
        '<span class="objetivo-barra ui-barra"><span class="ui-barra-relleno" id="objetivo-relleno"></span></span></button>';
    },
    actualizar: function (estado) {
      const o = objetivoActual(estado);
      if (!o || !ui.$('objetivo-falta')) return;
      const falta = o.precio - estado.dinero;
      ui.$('objetivo-falta').textContent = falta > 0 ? 'faltan ' + ui.euros(falta) : '¡ya puedes!';
      ui.$('objetivo-relleno').style.width = (Math.max(0, Math.min(1, estado.dinero / o.precio)) * 100).toFixed(1) + '%';
    }
  };

  // ---------------------------------------------------------- Ticket
  /*
   * Ticket de cierre de caja, dentro de la página justo debajo del taxímetro
   * (no tapa nada: en pausa se puede seguir comprando).
   *   - Con pausa al cierre: lo marca estado.cierrePendiente y su botón arranca
   *     el día siguiente (acción de la simulación).
   *   - Sin pausa: aviso de la interfaz (ticketAviso) que se quita con "Vale".
   */
  ui.ticketAviso = null;

  function ticketEnPantalla(estado) {
    if (estado.cierrePendiente) return { datos: estado.cierrePendiente, pausa: true };
    if (ui.ticketAviso) return { datos: ui.ticketAviso, pausa: false };
    return null;
  }

  /*
   * Líneas del ticket en tres bloques, de arriba abajo (Iván, 18-11-2026):
   * la actividad (sin dinero), las cuentas de la jornada y el neto, que va
   * al final, debajo de las incidencias, porque ya las cuenta.
   */
  function lineasTicket(t) {
    const neto = Libre.sim.netoCaja(t);
    return {
      actividad: [
        { texto: 'Carreras', valor: String(Math.floor(t.carreras)) },
        { texto: 'Kilómetros', valor: ui.numero(t.km || 0) + ' km' }
      ],
      cuentas: [
        { texto: 'Recaudación', valor: '+' + ui.euros(t.ingresos) },
        { texto: 'Combustible', valor: '−' + ui.euros(t.combustible), negativo: t.combustible > 0 },
        { texto: 'Conductores', valor: '−' + ui.euros(t.conductores), negativo: t.conductores > 0 },
        { texto: 'Costes fijos', valor: '−' + ui.euros(t.fijos), negativo: t.fijos > 0 }
      ],
      neto: { texto: 'Neto', valor: ui.euros(neto), total: true, negativo: neto < 0 }
    };
  }

  /* El importe de una línea del ticket, en rojo si resta (Iván, 18-11-2026). */
  function valorTicket(valor, negativo) {
    return negativo ? '<span class="ticket-negativo">' + valor + '</span>' : '<span>' + valor + '</span>';
  }

  /*
   * Bloque de incidencias del ticket: cada tipo agrupado, con cuántas veces
   * pasó y cuánto sumó o restó. Lo que no mueve dinero (bajas, lluvia) sale
   * solo con las veces.
   */
  function htmlIncidencias(t, siguiente) {
    const ev = Libre.config.eventos;
    const tipos = Object.keys(t.incidencias || {});
    if (tipos.length === 0) return '';
    return '<div class="ticket-separador"></div>' +
      '<div class="ticket-linea ticket-subtitulo" style="--i:' + siguiente() + '">Incidencias</div>' +
      tipos.map(function (tipo) {
        const a = t.incidencias[tipo];
        const nombre = (ev[tipo] ? ev[tipo].nombre : tipo) + (a.veces > 1 ? ' ×' + a.veces : '');
        const valor = a.importe === 0 ? '' : (a.importe > 0 ? '+' : '−') + ui.euros(Math.abs(a.importe)) +
          (tipo === 'sinPagar' ? ' sin cobrar' : '');
        return '<div class="ticket-linea" style="--i:' + siguiente() + '"><span>' + ui.esc(nombre) + '</span>' +
          valorTicket(valor, a.importe < 0) + '</div>';
      }).join('');
  }

  /* "Martes · día 2" o, si junta varios días, "Lunes a jueves · días 1 a 4". */
  function fechaTicket(t) {
    const dias = Libre.config.reloj.diasSemana;
    const desde = dias[t.desdeDia % 7];
    if (t.desdeDia === t.hastaDia) return desde + ' · día ' + (t.desdeDia + 1);
    return desde + ' a ' + dias[t.hastaDia % 7].toLowerCase() + ' · días ' + (t.desdeDia + 1) + ' a ' + (t.hastaDia + 1);
  }

  /*
   * Ticket de papel térmico. Sale de debajo del taxímetro como si se
   * imprimiera y las líneas aparecen una a una (retardo con --i en CSS).
   * Con movimiento reducido las animaciones se anulan y sale ya impreso.
   */
  const seccionTicket = {
    id: 'sec-ticket',
    firma: function (estado) {
      const t = ticketEnPantalla(estado);
      return t ? [t.pausa, t.datos.desdeDia, t.datos.hastaDia].join('|') : 'nada';
    },
    html: function (estado) {
      const t = ticketEnPantalla(estado);
      if (!t) return '';
      ui.sonar('ticket');
      const lineas = lineasTicket(t.datos);
      let i = 0;
      const linea = function (l) {
        return '<div class="ticket-linea' + (l.total ? ' ticket-total' : '') + '" style="--i:' + (i++) + '">' +
          '<span>' + ui.esc(l.texto) + '</span>' + valorTicket(l.valor, l.negativo) + '</div>';
      };
      return '<div class="ticket-ranura"><div class="ticket" role="group" aria-label="Ticket de cierre de caja">' +
        '<div class="ticket-cabecera">' +
        '<div class="ticket-linea ticket-nombre" style="--i:' + (i++) + '">Libre</div>' +
        htmlLicenciasTicket(t.datos, function () { return i++; }) +
        '<div class="ticket-linea" style="--i:' + (i++) + '">' + ui.esc(fechaTicket(t.datos)) + '</div>' +
        '</div>' +
        '<div class="ticket-separador"></div>' +
        lineas.actividad.map(linea).join('') +
        '<div class="ticket-separador"></div>' +
        lineas.cuentas.map(linea).join('') +
        htmlIncidencias(t.datos, function () { return i++; }) +
        '<div class="ticket-separador doble"></div>' +
        linea(lineas.neto) +
        '</div></div>' +
        '<div class="ticket-pie" style="--i:' + (i++) + '">' +
        (t.pausa
          ? ui.boton('Arrancar día siguiente', 'arrancarDia', [], 'ui-boton ui-boton--principal ui-boton--ancho')
          : '<button type="button" class="ui-boton ui-boton--principal ui-boton--ancho" data-cerrar-ticket>Vale</button>') +
        '</div>';
    }
  };

  /*
   * Cabecera del ticket: las licencias que trabajaron (facturaron) en los
   * días que cubre. Una: «Taxi · licencia 15288-L»; varias: cuántas y la
   * lista. Ninguna (día sin servicio, o ticket guardado antes de apuntarlas):
   * sin línea.
   */
  function htmlLicenciasTicket(datos, siguiente) {
    const lista = (datos.licencias || []).map(function (n) { return Libre.sim.textoLicencia({ numero: n }); });
    if (lista.length === 0) return '';
    if (lista.length === 1) return '<div class="ticket-linea" style="--i:' + siguiente() + '">Taxi · licencia ' + ui.esc(lista[0]) + '</div>';
    return '<div class="ticket-linea" style="--i:' + siguiente() + '">' + lista.length + ' taxis · licencias</div>' +
      '<div class="ticket-linea ticket-licencias" style="--i:' + siguiente() + '">' + ui.esc(lista.join(' · ')) + '</div>';
  }

  /* Sin pausa al cierre, cada día cerrado se enseña como aviso. */
  ui.ultimoCierreVisto = null;
  function vigilarCierres(estado) {
    const ayer = estado.caja.ayer;
    // En el primer fotograma solo se anota lo que ya había: no se enseña al cargar.
    if (ui.ultimoCierreVisto === null) { ui.ultimoCierreVisto = ayer ? ayer.dia : -1; return; }
    if (!ayer || ayer.dia === ui.ultimoCierreVisto) return;
    ui.ultimoCierreVisto = ayer.dia;
    if (!estado.cierrePendiente) ui.ticketAviso = Libre.sim.sumarCierres([ayer]);
  }

  /*
   * Al volver tras tener el juego cerrado. Si se cerraron días, el ticket ya
   * está en el estado (o, sin pausa, se enseña como aviso); si no, un mensaje.
   */
  /*
   * Avisos de eventos: un mensaje breve cada pocos segundos como mucho; lo que
   * no cabe queda solo en el ticket. Las propinas van en el importe flotante.
   */

  ui.cajaAbierta = false;
  const seccionCaja = {
    id: 'sec-caja',
    firma: function () { return 'caja:' + ui.cajaAbierta; },
    html: function () {
      if (!ui.cajaAbierta) return '';
      return '<div class="caja-desglose ui-tarjeta"><div class="caja-titulo"><strong class="ui-titulo">Caja de hoy</strong>' +
        '<button type="button" class="caja-cerrar" data-desglose aria-label="Cerrar el desglose">×</button></div>' +
        filasCaja(null, 'hoy', true) + '</div>';
    },
    actualizar: function (estado) {
      const hoy = estado.caja.hoy;
      const fijos = Libre.sim.costesFijosDiarios(estado);
      const neto = Libre.sim.netoCaja(hoy) - fijos;
      const carreras = Math.floor(hoy.carreras);
      ui.$('hoy-carreras').textContent = carreras;
      ['ingresos', 'extras', 'combustible', 'conductores', 'otros'].forEach(function (campo) {
        const suma = campo === 'ingresos' || campo === 'extras';
        ui.$('hoy-' + campo).textContent = (suma ? '' : '−') + ui.euros(hoy[campo] || 0);
      });
      ui.$('hoy-fijos').textContent = '−' + ui.euros(fijos);
      const el = ui.$('hoy-neto');
      el.textContent = ui.euros(neto);
      el.className = neto < 0 ? 'negativo-texto' : 'positivo';
    }
  };

  /*
   * Zonas: las abiertas, una fila de chips (nombre y dato: viajes/h y coches
   * tuyos ahí, o la hora a la que abre); con clientes ahora van en azul.
   * Mientras conduces a mano, tocar una elige la zona (la tuya, rellena).
   * Las cerradas, en una sola línea debajo con la mejora que las abre.
   */
  // Próxima hora con clientes en una zona, como texto ("Abre a las 21:00").
  ui.cacheApertura = {};
  function textoApertura(estado, zonaId) {
    const ahora = ui.jornadaDe(estado.reloj.minutos);
    const horaActual = Math.floor(estado.reloj.minutos / 60);
    const clave = horaActual + '|' + JSON.stringify(estado.mejoras);
    if (ui.cacheApertura.clave !== clave) ui.cacheApertura = { clave };
    if (ui.cacheApertura[zonaId] !== undefined) return ui.cacheApertura[zonaId];
    const umbral = Libre.config.economia.demandaMinimaManual;
    let texto = 'Sin clientes esta semana';
    for (let h = 1; h <= 7 * 24; h++) {
      const info = Libre.sim.infoReloj((horaActual + h) * 60);
      if (Libre.sim.demandaZona(estado, zonaId, info) >= umbral) {
        const a = 'a las ' + ui.dos(info.hora) + ':00';
        const jornada = ui.jornadaDe((horaActual + h) * 60);
        const dias = jornada.dia - ahora.dia;
        texto = dias === 0 ? 'Abre ' + a
          : dias === 1 ? 'Abre mañana ' + a
          : 'Abre el ' + jornada.nombreDia.toLowerCase() + ' ' + a;
        break;
      }
    }
    ui.cacheApertura[zonaId] = texto;
    return texto;
  }

  /* «Aeropuerto: Acreditación de Barajas · Estaciones: …»: cada zona cerrada y la mejora que la abre. */
  function textoZonasCerradas(estado) {
    const c = Libre.config;
    return Object.keys(c.zonas).filter(function (id) { return !Libre.sim.zonaDesbloqueada(estado, id); }).map(function (id) {
      const zona = c.zonas[id];
      const mejora = c.mejoras.find(function (m) { return m.id === zona.requiere; });
      return zona.nombre + ': ' + (mejora ? mejora.nombre : zona.requiere);
    }).join(' · ');
  }

  const seccionZonas = {
    id: 'sec-zonas',
    firma: function (estado) {
      const u = Libre.sim.ubicacionJugador(estado);
      return [Libre.sim.zonasDisponibles(estado), u ? u.licenciaId + u.turno + u.datos.zona : 'no-conduce'].join('|');
    },
    html: function (estado) {
      const c = Libre.config;
      const aMano = Libre.sim.conduce(estado);
      const u = Libre.sim.ubicacionJugador(estado);
      const ids = Object.keys(c.zonas);
      const cerradas = ids.filter(function (id) { return !Libre.sim.zonaDesbloqueada(estado, id); });
      // Las cerradas, en un último chip («2 cerradas»): al tocarlo dice qué
      // mejora abre cada una (antes era una línea debajo, que no cabía).
      const chipCerradas = cerradas.length === 0 ? '' :
        '<button type="button" class="zona-tarjeta ui-chip-zona zona-cerradas" data-zonas-cerradas' +
        ' aria-label="Zonas cerradas: ' + ui.esc(textoZonasCerradas(estado)) + '">' +
        '<span class="ui-chip-zona-nombre">' + cerradas.length + (cerradas.length === 1 ? ' cerrada' : ' cerradas') + '</span>' +
        '<span class="ui-chip-zona-detalle">Qué las abre ›</span></button>';
      return '<div class="zonas-fila" role="group" aria-label="Zonas">' + ids.filter(function (id) {
        return cerradas.indexOf(id) === -1;
      }).map(function (id) {
        const zona = c.zonas[id];
        const cuerpo = '<span class="ui-chip-zona-nombre">' + ui.esc(zona.nombre) + '</span>' +
          '<span class="ui-chip-zona-detalle" id="zona-dato-' + id + '"></span>';
        if (aMano) {
          const mia = id === u.datos.zona;
          return '<button type="button" class="zona-tarjeta ui-chip-zona' + (mia ? ' mia' : '') + '" id="zona-' + id + '" ' +
            'data-accion="elegirZona" data-args="' + u.licenciaId + '|' + u.turno + '|' + id + '" title="' + ui.esc(zona.descripcion) + '"' +
            ' aria-pressed="' + mia + '">' + cuerpo + '</button>';
        }
        return '<div class="zona-tarjeta ui-chip-zona" id="zona-' + id + '" title="' + ui.esc(zona.descripcion) + '">' + cuerpo + '</div>';
      }).join('') + chipCerradas + '</div>';
    },
    actualizar: function (estado) {
      const info = Libre.sim.infoReloj(estado.reloj.minutos);
      const grupos = Libre.sim.cochesPorZona(estado, info);
      const umbral = Libre.config.economia.demandaMinimaManual;
      const pausa = Libre.sim.enPausa(estado);
      document.querySelectorAll('button.zona-tarjeta[data-accion]').forEach(function (b) { b.disabled = pausa; });
      Libre.sim.zonasDisponibles(estado).forEach(function (id) {
        const coches = grupos[id] ? grupos[id].length : 0;
        const r = Libre.sim.rendimientoZona(estado, id, coches, info);
        const vacia = r.demanda < umbral;
        // Con clientes ahora: azul (la maqueta); sin ellos, blanca y en gris.
        ui.$('zona-' + id).classList.toggle('ui-chip-zona--activa', !vacia);
        ui.$('zona-' + id).classList.toggle('vacia', vacia);
        // Texto corto para que quepa en media pantalla de móvil.
        let texto;
        if (vacia) texto = textoApertura(estado, id);
        else if (coches > 0) texto = Math.round(r.demanda) + '/h · ' + coches + (coches === 1 ? ' coche' : ' coches');
        else texto = Math.round(r.demanda) + ' viajes/h';
        ui.$('zona-dato-' + id).textContent = texto;
      });
    }
  };


  Object.assign(ui, { destellarFila, htmlCaraTu, htmlImgTu, seccionCaja, seccionObjetivo, seccionTaximetro, seccionTaxis, seccionTicket, seccionZonas, textoZonasCerradas, vigilarCierres });
})(globalThis);
