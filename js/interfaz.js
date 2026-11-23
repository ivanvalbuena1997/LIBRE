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
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};

  const formatoEuros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
  const formatoNumero = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1, useGrouping: 'always' });

  function euros(n) { return formatoEuros.format(n); }
  function numero(n) { return formatoNumero.format(n); }
  /* Factor con hasta dos decimales (×0,85). */
  function factor(n) { return n.toLocaleString('es-ES', { maximumFractionDigits: 2 }); }
  function dos(n) { return String(n).padStart(2, '0'); }
  function esc(texto) {
    return String(texto).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function $(id) { return document.getElementById(id); }

  /*
   * Jornada: el día del juego tal como lo vive el taxista, de 7:00 a 7:00
   * (cuando se cierra la caja). La madrugada cuenta como la noche del día
   * anterior: "Lunes 03:00" son las 3 de la madrugada del martes. Solo cambia
   * lo que se enseña; las tarifas y la demanda siguen el calendario.
   */
  function jornadaDe(minutos) {
    const c = Libre.config;
    const dia = Math.floor((minutos - c.reloj.minutoCierreCaja) / Libre.sim.MIN_DIA);
    const enJornada = minutos - c.reloj.minutoCierreCaja - dia * Libre.sim.MIN_DIA;
    return { dia, nombreDia: c.reloj.diasSemana[((dia % 7) + 7) % 7], avance: enJornada / Libre.sim.MIN_DIA };
  }

  /* "HH:MM" de un minuto del reloj. */
  function horaDe(minutos) {
    const i = Libre.sim.infoReloj(minutos);
    return dos(i.hora) + ':' + dos(i.minuto);
  }

  function textoHora(info) {
    return jornadaDe(info.dia * Libre.sim.MIN_DIA + info.minutoDelDia).nombreDia + ' ' +
      dos(info.hora) + ':' + dos(info.minuto);
  }

  /* Botón de acción. Si lleva precio, se desactiva solo cuando no llega el dinero. */
  function boton(texto, accion, args, clase, precio) {
    return '<button type="button" class="' + (clase || '') + '" data-accion="' + accion +
      '" data-args="' + esc((args || []).join('|')) + '"' +
      (precio !== undefined ? ' data-precio="' + precio + '"' : '') + '>' + texto + '</button>';
  }

  function botonCompra(texto, precio, accion, args) {
    return boton('<span>' + texto + '</span><span class="precio">' + euros(precio) + '</span>',
      accion, args, 'boton-compra', precio);
  }

  function selectorZona(estado, licenciaId, turno, zonaActual) {
    const c = Libre.config;
    return '<select data-cambio="elegirZona" data-args="' + licenciaId + '|' + turno + '" aria-label="Zona">' +
      Libre.sim.zonasDisponibles(estado).map(function (id) {
        return '<option value="' + id + '"' + (id === zonaActual ? ' selected' : '') + '>' + esc(c.zonas[id].nombre) + '</option>';
      }).join('') + '</select>';
  }

  function horario(turno) {
    const t = Libre.config.turnos[turno];
    return dos(t.horaInicio) + '–' + dos(t.horaFin) + ' h';
  }

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
  function htmlDisplay() {
    return '<span class="taximetro-izquierda">' +
      '<span class="piloto" id="tx-piloto">LIBRE</span>' +
      '<span class="tx-tarifa" id="tx-tarifa"></span>' +
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
    const v = $('tx-valor');
    if (v.textContent !== texto) {
      v.textContent = texto;
      // Con cifras de más se encoge para que no se salga: en 375 px de ancho
      // caben unas 3,8 cifras de 48 px junto al €.
      const cifras = texto.replace('.', '').length;
      v.parentNode.style.setProperty('--escala', Math.min(1, 3.8 / cifras).toFixed(3));
    }
    $('tx-etiqueta').textContent = etiqueta;
    $('tx-estado').textContent = estadoTexto;
    $('tx-tarifa').innerHTML = chip;
    const p = $('tx-piloto');
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
  let vigilanciaAntes = false;

  function chipTarifa(tarifaId) {
    return esc(Libre.config.tarifas[tarifaId].nombre.toUpperCase());
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
  let modoAnterior = null;

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
      const clase = modoAnterior && modoAnterior !== modo ? ' cambio-modo' : '';
      modoAnterior = modo;
      if (modo === 'flota') {
        return '<button type="button" class="taximetro taximetro-flota' + clase + '" data-desglose ' +
          'aria-label="Recaudación de hoy de la flota: ver el desglose">' + htmlDisplay() + '</button>';
      }
      if (modo === 'libranza') {
        return '<button type="button" class="taximetro taximetro-boton' + clase + '" data-accion="saltarAlCierre" ' +
          'aria-label="' + esc(textoSalto(estado).aria) + '">' + htmlDisplay() + '</button>';
      }
      return '<button type="button" class="taximetro taximetro-boton' + clase + '" data-accion="buscarCliente" ' +
        'aria-label="Taxímetro: buscar cliente">' + htmlDisplay() + '</button>';
    },
    actualizar: function (estado) {
      const c = Libre.config;
      const info = Libre.sim.infoReloj(estado.reloj.minutos);

      if (modoTaximetro(estado) === 'libranza') {
        pintarDisplay(0, textoSalto(estado).etiqueta, 'Toca para saltar al cierre ›', 'libre', chipTarifa(info.tarifa));
        $('tx-estado').classList.remove('latido');
        $('carrera-barra').style.width = '0%';
        return;
      }
      if (modoTaximetro(estado) === 'flota') {
        // Debajo del piloto, la hora de tu turno (la tarifa ya está en la placa).
        const u = Libre.sim.ubicacionJugador(estado);
        const chip = u ? '<small>TU TURNO</small>' + dos(c.turnos[u.turno].horaInicio) + ':00' : chipTarifa(info.tarifa);
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
        : conPasajero ? 'Con pasajero · ' + numero(carrera.km) + ' km'
        : carrera ? c.zonas[carrera.zona].textoEspera + '…'
        : parado ? (estado.jugador.motivoParada === 'descanso' ? 'Descansando' : 'Parado') + ' hasta las ' + horaDe(estado.jugador.paradoHasta)
        : !enTurno ? 'Tu turno empieza a las ' + dos(miTurno.horaInicio) + ':00'
        // Tu energía (cansancio), al lado: a 0 descansas 30 min de juego.
        // Primero la energía: si no cabe (móviles muy estrechos), se corta lo otro.
        : 'Energía ' + Math.round(Libre.sim.energia(estado, estado.jugador) / c.cansancio.maximo * 100) + ' % · Toca para buscar';
      // Un pesetas te mira (Iván, 20-11-2026): marco y piloto amarillos,
      // cuenta atrás y la barra vaciándose. Lo que ya llevas no cuenta.
      $('sec-taximetro').querySelector('.taximetro').classList.toggle('vigilado', vigilado);
      if (vigilado) {
        pintarDisplay(conPasajero ? enCurso : 0, conPasajero ? 'IMPORTE' : 'UN PESETAS TE MIRA',
          (carrera ? 'No cargues la siguiente · ' : 'No cargues · ') + segVigila + ' s', 'vigilado',
          chipTarifa(conPasajero ? carrera.tarifa : info.tarifa));
      } else {
        pintarDisplay(conPasajero ? enCurso : 0,
          conPasajero ? 'IMPORTE' : ultima ? 'ÚLTIMA ' + euros(ultima.importe) : 'IMPORTE',
          estadoTexto, conPasajero ? 'ocupado' : 'libre', chipTarifa(conPasajero ? carrera.tarifa : info.tarifa));
      }
      if (vigilanciaAntes && !vigilado && !parado && vistaActual === 'calle') mostrarMensaje('El pesetas se ha ido: ya puedes cargar.');
      vigilanciaAntes = vigilado;
      // Latido suave mientras el taxi espera a que lo toques.
      $('tx-estado').classList.toggle('latido', !pausa && !carrera && enTurno && !libras && !sinCoche && !vigilado);

      const barra = $('carrera-barra');
      const v = estado.jugador.vigilancia;
      const p = vigilado && !carrera ? (v.hasta - estado.reloj.minutos) / (v.hasta - v.desde)
        : carrera ? Math.min(1, (estado.reloj.minutos - carrera.inicio) / (carrera.fin - carrera.inicio)) : 0;
      barra.style.width = (p * 100).toFixed(1) + '%';
    }
  };

  function filasCaja(caja, prefijo, fijosPrevistos) {
    const fila = function (texto, campo, signo) {
      return '<div><dt>' + texto + '</dt><dd id="' + prefijo + '-' + campo + '">' +
        (caja ? signo + euros(caja[campo]) : '') + '</dd></div>';
    };
    return '<dl class="filas">' +
      '<div><dt>Carreras</dt><dd id="' + prefijo + '-carreras">' + (caja ? Math.floor(caja.carreras) : '') + '</dd></div>' +
      fila('Recaudación', 'ingresos', '') +
      fila('Combustible', 'combustible', '−') +
      fila('Conductores', 'conductores', '−') +
      fila(fijosPrevistos ? 'Costes fijos (al cierre)' : 'Costes fijos', 'fijos', '−') +
      fila('Propinas y recompensas', 'extras', '') +
      fila('Gastos por incidencias', 'otros', '−') +
      '<div class="total"><dt>Neto</dt><dd id="' + prefijo + '-neto">' + (caja ? euros(Libre.sim.netoCaja(caja)) : '') + '</dd></div>' +
      '</dl>';
  }

  const MOTIVO_PARADA = { pinchazo: 'Pinchazo', vomito: 'Limpieza', lluvia: 'Lluvia', pesetas: 'Multa', descanso: 'Descansando' };
  const TEXTO_SITUACION = { libranza: 'Libranza', averia: 'Avería', baja: 'De baja', vacio: 'Sin conductor' };

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
      const t = lic.turnos[turno];
      const carrera = !t ? null : t.quien === 'jugador' ? estado.jugador.carrera : t.carrera;
      const enCurso = Libre.sim.importeDeCarrera(estado, carrera);
      let icono = null;
      // De incógnito (Iván, 20-11-2026): trabaja aunque su licencia libre.
      const incognito = Libre.sim.trabajaIncognito(estado, lic, t, ahora);
      if (Libre.sim.libra(estado, lic) && !incognito) icono = 'libranza';
      else if (lic.averia && jornada < lic.averia.hasta) icono = 'averia';
      else if (!t) icono = 'vacio';
      else if (t.quien === 'conductor' && t.baja && jornada < t.baja.hasta) icono = 'baja';
      else if ((t.quien === 'jugador' ? estado.jugador.paradoHasta : t.paradoHasta) > ahora) icono = 'fin';
      const motivoParada = t ? (t.quien === 'jugador' ? estado.jugador.motivoParada : t.motivoParada) : null;
      return {
        licencia: lic,
        quien: t ? (t.quien === 'jugador' ? 'Tú' : t.nombre) : 'Sin conductor',
        conductor: t && t.quien === 'conductor' ? t : null,
        retrato: t && t.quien === 'conductor' ? t.retrato : null,
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
  let taxisDesplegados = false;
  let filasRecienCreadas = false;   // la primera colocación no se anima

  function htmlRetratoFila(t) {
    if (t.retrato !== null && t.retrato !== undefined) {
      // Con su rareza y su nivel, como la cara de Conductores.
      return '<span class="cara-foto"><span class="retrato' + (t.icono === 'baja' ? ' atenuado' : '') + '">' +
        Libre.retratos.svg(t.retrato) + '</span>' + (t.conductor ? htmlCirculos(t.conductor) : '') + '</span>';
    }
    // Tú, o un turno sin conductor.
    return '<span class="retrato retrato-texto' + (t.quien === 'Tú' ? ' tu' : '') + '">' + (t.quien === 'Tú' ? 'TÚ' : '') + '</span>';
  }

  /* Chip de estado de un taxi: Libre, Ocupado, Libranza, De baja o parado (ámbar). */
  function claseSituacion(t) {
    if (t.incognito && t.situacion !== 'parado') return 'ui-chip ui-chip--incognito';
    if (t.situacion !== 'parado') return 'ui-chip ui-chip--' + t.situacion;
    if (t.icono === 'libranza') return 'ui-chip ui-chip--libranza';
    if (t.icono === 'baja') return 'ui-chip ui-chip--baja';
    return 'ui-chip ui-chip--parado';
  }

  const seccionTaxis = {
    id: 'sec-taxis',
    firma: function (estado) {
      return estado.licencias.filter(function (l) { return l.vehiculo; }).map(function (l) { return l.id; }).join(',') +
        '|' + taxisDesplegados;
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
      filasRecienCreadas = true;
      return '<div class="taxis-cabecera"><h2 class="ui-titulo">Tus taxis hoy</h2>' +
        '<button type="button" class="taxis-total ui-dinero" data-desglose aria-label="Ver el desglose de la caja de hoy"><span id="taxis-total"></span></button></div>' +
        '<ol class="taxis-lista" id="taxis-lista">' + filas + '</ol>' +
        (resto > 0
          ? '<button type="button" class="taxis-mas" data-taxis-mas>' +
            (taxisDesplegados ? 'Ver solo los ' + MAX_FILAS_TAXIS + ' primeros' : 'Ver los ' + resto + ' restantes') + '</button>'
          : '');
    },
    actualizar: function (estado) {
      const lista = $('taxis-lista');
      const taxis = taxisDeLaFlota(estado);
      const maximo = taxis.length ? Math.max(taxis[0].facturado, 0.01) : 1;
      $('taxis-total').textContent = euros(estado.caja.hoy.ingresos);

      // FLIP 1: dónde está cada fila antes de recolocar.
      const filas = {};
      lista.querySelectorAll('[data-fila-taxi]').forEach(function (li) { filas[li.dataset.filaTaxi] = li; });
      const orden = taxis.map(function (t) { return String(t.licencia.id); });
      const actual = Array.prototype.map.call(lista.children, function (li) { return li.dataset.filaTaxi; });
      const cambia = orden.join(',') !== actual.join(',');
      const animar = cambia && !filasRecienCreadas && !movimientoReducido.matches;
      filasRecienCreadas = false;
      const antes = {};
      if (animar) orden.forEach(function (id) { if (filas[id]) antes[id] = filas[id].getBoundingClientRect().top; });

      taxis.forEach(function (t, i) {
        const li = filas[t.licencia.id];
        if (!li) return;
        // El retrato solo se rehace si cambia quién conduce.
        const claveRetrato = t.quien + '|' + t.retrato + '|' + (t.icono === 'baja') +
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
        li.querySelector('.taxi-importe').textContent = euros(t.facturado);
        li.querySelector('.taxi-barra > span').style.width = (Math.max(0, t.facturado) / maximo * 100).toFixed(1) + '%';
        li.classList.toggle('fuera', !taxisDesplegados && i >= MAX_FILAS_TAXIS);
        const cat = t.conductor && Libre.sim.buscarCategoria(t.conductor.categoria);
        li.querySelector('button').setAttribute('aria-label',
          t.quien + (cat ? ', categoría ' + cat.nombre + ', nivel ' + Libre.sim.nivelConductor(t.conductor) : '') +
          ', licencia ' + Libre.sim.textoLicencia(t.licencia) + ', ' + sit.textContent + ', ' + euros(t.facturado) + ' hoy. Ver en Conductores');
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
    if (!li || movimientoReducido.matches) return;
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
  let objetivoId = null;

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
    const o = Libre.sim.objetivoCompra(estado, objetivoId);
    if (!o) return null;
    objetivoId = o.id;
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
      return '<button type="button" class="objetivo ui-tarjeta' + (listo ? ' listo' : '') + '" data-objetivo="' + esc(o.selector) + '"' +
        (o.mejora ? ' data-objetivo-mejora="' + o.mejora + '"' : '') + '>' +
        '<span class="objetivo-texto"><span>Siguiente · <strong>' + esc(o.nombre) + '</strong></span>' +
        '<span id="objetivo-falta"></span></span>' +
        '<span class="objetivo-barra ui-barra"><span class="ui-barra-relleno" id="objetivo-relleno"></span></span></button>';
    },
    actualizar: function (estado) {
      const o = objetivoActual(estado);
      if (!o || !$('objetivo-falta')) return;
      const falta = o.precio - estado.dinero;
      $('objetivo-falta').textContent = falta > 0 ? 'faltan ' + euros(falta) : '¡ya puedes!';
      $('objetivo-relleno').style.width = (Math.max(0, Math.min(1, estado.dinero / o.precio)) * 100).toFixed(1) + '%';
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
  let ticketAviso = null;

  function ticketEnPantalla(estado) {
    if (estado.cierrePendiente) return { datos: estado.cierrePendiente, pausa: true };
    if (ticketAviso) return { datos: ticketAviso, pausa: false };
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
        { texto: 'Kilómetros', valor: numero(t.km || 0) + ' km' }
      ],
      cuentas: [
        { texto: 'Recaudación', valor: '+' + euros(t.ingresos) },
        { texto: 'Combustible', valor: '−' + euros(t.combustible), negativo: t.combustible > 0 },
        { texto: 'Conductores', valor: '−' + euros(t.conductores), negativo: t.conductores > 0 },
        { texto: 'Costes fijos', valor: '−' + euros(t.fijos), negativo: t.fijos > 0 }
      ],
      neto: { texto: 'Neto', valor: euros(neto), total: true, negativo: neto < 0 }
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
        const valor = a.importe === 0 ? '' : (a.importe > 0 ? '+' : '−') + euros(Math.abs(a.importe)) +
          (tipo === 'sinPagar' ? ' sin cobrar' : '');
        return '<div class="ticket-linea" style="--i:' + siguiente() + '"><span>' + esc(nombre) + '</span>' +
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
      sonar('ticket');
      const lineas = lineasTicket(t.datos);
      let i = 0;
      const linea = function (l) {
        return '<div class="ticket-linea' + (l.total ? ' ticket-total' : '') + '" style="--i:' + (i++) + '">' +
          '<span>' + esc(l.texto) + '</span>' + valorTicket(l.valor, l.negativo) + '</div>';
      };
      return '<div class="ticket-ranura"><div class="ticket" role="group" aria-label="Ticket de cierre de caja">' +
        '<div class="ticket-cabecera">' +
        '<div class="ticket-linea ticket-nombre" style="--i:' + (i++) + '">Libre</div>' +
        htmlLicenciasTicket(t.datos, function () { return i++; }) +
        '<div class="ticket-linea" style="--i:' + (i++) + '">' + esc(fechaTicket(t.datos)) + '</div>' +
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
          ? boton('Arrancar día siguiente', 'arrancarDia', [], 'ui-boton ui-boton--principal ui-boton--ancho')
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
    if (lista.length === 1) return '<div class="ticket-linea" style="--i:' + siguiente() + '">Taxi · licencia ' + esc(lista[0]) + '</div>';
    return '<div class="ticket-linea" style="--i:' + siguiente() + '">' + lista.length + ' taxis · licencias</div>' +
      '<div class="ticket-linea ticket-licencias" style="--i:' + siguiente() + '">' + esc(lista.join(' · ')) + '</div>';
  }

  /* Sin pausa al cierre, cada día cerrado se enseña como aviso. */
  let ultimoCierreVisto = null;
  function vigilarCierres(estado) {
    const ayer = estado.caja.ayer;
    // En el primer fotograma solo se anota lo que ya había: no se enseña al cargar.
    if (ultimoCierreVisto === null) { ultimoCierreVisto = ayer ? ayer.dia : -1; return; }
    if (!ayer || ayer.dia === ultimoCierreVisto) return;
    ultimoCierreVisto = ayer.dia;
    if (!estado.cierrePendiente) ticketAviso = Libre.sim.sumarCierres([ayer]);
  }

  /*
   * Al volver tras tener el juego cerrado. Si se cerraron días, el ticket ya
   * está en el estado (o, sin pausa, se enseña como aviso); si no, un mensaje.
   */
  /*
   * Avisos de eventos: un mensaje breve cada pocos segundos como mucho; lo que
   * no cabe queda solo en el ticket. Las propinas van en el importe flotante.
   */
  const MS_ENTRE_AVISOS = 3000;
  /*
   * Los avisos de eventos de la partida (de los conductores: nivel, objeto,
   * baja, pinchazo…; y los generales: lluvia, tormenta, la avería de tu
   * coche…) solo salen en estas pestañas (Iván, 20-11-2026: solo en Calle;
   * el 19-11, los de conductores también en Conductores). En las demás se
   * descartan: suena el sonido igual y lo que cuesta va al ticket. Los
   * mensajes que responden a lo que tocas (comprar, importar…) no son
   * eventos: salen siempre.
   */
  const VISTAS_AVISOS_EVENTOS = ['calle'];
  function avisoVisible() {
    return VISTAS_AVISOS_EVENTOS.indexOf(vistaActual) !== -1;
  }
  const colaAvisos = [];
  let ultimoAviso = 0;
  // Qué sonido lleva cada evento de la simulación (los demás, ninguno).
  const SONIDO_EVENTO = { propina: 'propina', nivel: 'nivel', hallazgo: 'objeto', averia: 'averia', pinchazo: 'averia', rotura: 'averia', vigilancia: 'pesetas' };

  /* Toca un sonido (js/sonidos.js), si el módulo está cargado. */
  function sonar(nombre) {
    if (Libre.sonidos) Libre.sonidos.tocar(nombre);
  }

  function mostrarEventos(eventos) {
    eventos.forEach(function (ev) {
      if (SONIDO_EVENTO[ev.tipo]) sonar(SONIDO_EVENTO[ev.tipo]);
      if (ev.tipo === 'propina') { flotantes.etiqueta = 'propina'; return; }
      if (ev.tipo === 'esterillas' || ev.tipo === 'bolsa') return;
      if (!avisoVisible(ev)) return;
      if (colaAvisos.length < 3) colaAvisos.push(ev);
    });
    soltarAviso();
  }
  function soltarAviso() {
    if (colaAvisos.length === 0 || Date.now() - ultimoAviso < MS_ENTRE_AVISOS) return;
    ultimoAviso = Date.now();
    const ev = colaAvisos.shift();
    // Si cambiaste de pestaña mientras esperaba, ya no toca enseñarlo.
    if (!avisoVisible(ev)) { ultimoAviso = 0; soltarAviso(); return; }
    mostrarMensaje(ev.texto, ev.retrato, ev.tipo === 'hallazgo' ? ev.categoria : null);
  }

  /*
   * Caja de hoy: el desglose, oculto hasta que lo pides tocando el display
   * del taxímetro (modo flota) o el total de «Tus taxis hoy». Sale justo
   * debajo del taxímetro.
   */
  let cajaAbierta = false;
  const seccionCaja = {
    id: 'sec-caja',
    firma: function () { return 'caja:' + cajaAbierta; },
    html: function () {
      if (!cajaAbierta) return '';
      return '<div class="caja-desglose ui-tarjeta"><div class="caja-titulo"><strong class="ui-titulo">Caja de hoy</strong>' +
        '<button type="button" class="caja-cerrar" data-desglose aria-label="Cerrar el desglose">×</button></div>' +
        filasCaja(null, 'hoy', true) + '</div>';
    },
    actualizar: function (estado) {
      const hoy = estado.caja.hoy;
      const fijos = Libre.sim.costesFijosDiarios(estado);
      const neto = Libre.sim.netoCaja(hoy) - fijos;
      const carreras = Math.floor(hoy.carreras);
      $('hoy-carreras').textContent = carreras;
      ['ingresos', 'extras', 'combustible', 'conductores', 'otros'].forEach(function (campo) {
        const suma = campo === 'ingresos' || campo === 'extras';
        $('hoy-' + campo).textContent = (suma ? '' : '−') + euros(hoy[campo] || 0);
      });
      $('hoy-fijos').textContent = '−' + euros(fijos);
      const el = $('hoy-neto');
      el.textContent = euros(neto);
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
  let cacheApertura = {};
  function textoApertura(estado, zonaId) {
    const ahora = jornadaDe(estado.reloj.minutos);
    const horaActual = Math.floor(estado.reloj.minutos / 60);
    const clave = horaActual + '|' + JSON.stringify(estado.mejoras);
    if (cacheApertura.clave !== clave) cacheApertura = { clave };
    if (cacheApertura[zonaId] !== undefined) return cacheApertura[zonaId];
    const umbral = Libre.config.economia.demandaMinimaManual;
    let texto = 'Sin clientes esta semana';
    for (let h = 1; h <= 7 * 24; h++) {
      const info = Libre.sim.infoReloj((horaActual + h) * 60);
      if (Libre.sim.demandaZona(estado, zonaId, info) >= umbral) {
        const a = 'a las ' + dos(info.hora) + ':00';
        const jornada = jornadaDe((horaActual + h) * 60);
        const dias = jornada.dia - ahora.dia;
        texto = dias === 0 ? 'Abre ' + a
          : dias === 1 ? 'Abre mañana ' + a
          : 'Abre el ' + jornada.nombreDia.toLowerCase() + ' ' + a;
        break;
      }
    }
    cacheApertura[zonaId] = texto;
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
        ' aria-label="Zonas cerradas: ' + esc(textoZonasCerradas(estado)) + '">' +
        '<span class="ui-chip-zona-nombre">' + cerradas.length + (cerradas.length === 1 ? ' cerrada' : ' cerradas') + '</span>' +
        '<span class="ui-chip-zona-detalle">Qué las abre ›</span></button>';
      return '<div class="zonas-fila" role="group" aria-label="Zonas">' + ids.filter(function (id) {
        return cerradas.indexOf(id) === -1;
      }).map(function (id) {
        const zona = c.zonas[id];
        const cuerpo = '<span class="ui-chip-zona-nombre">' + esc(zona.nombre) + '</span>' +
          '<span class="ui-chip-zona-detalle" id="zona-dato-' + id + '"></span>';
        if (aMano) {
          const mia = id === u.datos.zona;
          return '<button type="button" class="zona-tarjeta ui-chip-zona' + (mia ? ' mia' : '') + '" id="zona-' + id + '" ' +
            'data-accion="elegirZona" data-args="' + u.licenciaId + '|' + u.turno + '|' + id + '" title="' + esc(zona.descripcion) + '"' +
            ' aria-pressed="' + mia + '">' + cuerpo + '</button>';
        }
        return '<div class="zona-tarjeta ui-chip-zona" id="zona-' + id + '" title="' + esc(zona.descripcion) + '">' + cuerpo + '</div>';
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
        $('zona-' + id).classList.toggle('ui-chip-zona--activa', !vacia);
        $('zona-' + id).classList.toggle('vacia', vacia);
        // Texto corto para que quepa en media pantalla de móvil.
        let texto;
        if (vacia) texto = textoApertura(estado, id);
        else if (coches > 0) texto = Math.round(r.demanda) + '/h · ' + coches + (coches === 1 ? ' coche' : ' coches');
        else texto = Math.round(r.demanda) + ' viajes/h';
        $('zona-dato-' + id).textContent = texto;
      });
    }
  };

  // ---------------------------------------------------------------- Flota
  /*
   * Pestaña Flota: inventario en fichas, una tarjeta por licencia (su número
   * en una placa y los dos turnos) y la ficha de cada
   * conductor, que se abre al tocarlo.
   */

  /* Iconos de trazo (24 × 24): turnos y rasgos. Los de objetos son
     dibujos aparte en iconos/ (ARCHIVO_ICONO). */
  const ICONOS = {
    dia: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    noche: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    simpatico: '<circle cx="12" cy="12" r="9"/><path d="M8 14a4.5 4.5 0 0 0 8 0M9 9.5h.01M15 9.5h.01"/>',
    antipatico: '<circle cx="12" cy="12" r="9"/><path d="M8 16.5a4.5 4.5 0 0 1 8 0M9 9.5h.01M15 9.5h.01"/>',
    cuidadoso: '<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    manazas: '<path d="M15 4l5 5-3 3-5-5zM12 9l-8 8 3 3 8-8"/>',
    conoceCiudad: '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
    lento: '<path d="M7 3h10M7 21h10M8 3v3l4 6-4 6v3M16 3v3l-4 6 4 6v3"/>',
    deHierro: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
    enfermizo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0zM12 17v-5"/>',
    ojoAvizor: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
    despistado: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM4 4l16 16"/>',
    honrado: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    buho: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
    madrugador: '<path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 6v3M5 11l1.5 1.5M19 11l-1.5 1.5"/>',
    dormilon: '<path d="M4 6h6l-6 7h6M13 11h6l-6 7h6"/>',
    trasnochador: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10v4M6 10v4"/>',
    pulcro: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    guarro: '<path d="M8 6c2-2 6-2 8 0 3 1 4 5 2 7 1 3-2 6-5 5-2 2-6 1-6-2-3-1-4-5-1-7 0-1 1-2 2-3z"/><circle cx="19.5" cy="19.5" r="1"/>',
    aprovechado: '<circle cx="15" cy="7" r="3.5"/><path d="M3 15h4l3 2h5a1.5 1.5 0 0 0 0-3h-3M7 15v5M3 20h4l9-1 5-4a1.5 1.5 0 0 0-2-2l-4 2.5"/>',
    anfibio: '<path d="M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9z"/><path d="M2 20c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0"/>',
    // Urraca: un pájaro con un brillo (lo que encuentra).
    urraca: '<path d="M3 15c3 0 5-2 6-5 1-3 3-4 5-4 2.5 0 4 1.5 4 3.5L21 11l-3 1c-.5 3-3 5.5-7 5.5H8l-3 2.5v-3.5"/><circle cx="15" cy="9" r=".6"/><path d="M5 4v3M3.5 5.5h3"/>',
    // Desastre: un bolsillo roto por el que se cae algo.
    desastre: '<path d="M5 4h14v8a7 7 0 0 1-7 7 7 7 0 0 1-7-7z"/><path d="M10 13l2 2 2-2 2 2"/><circle cx="12" cy="22" r=".8"/>',
    // Azucarillo: una nube con gotas y un terrón de azúcar.
    azucarillo: '<path d="M7 13a4 4 0 0 1 .5-8A5 5 0 0 1 17 6a3.5 3.5 0 0 1 0 7z"/><path d="M8 16v2M12 16v2"/><rect x="14.5" y="16" width="5" height="5" rx="1"/>'
  };

  /* Etiqueta con el nombre de la categoría (B, A, S, S+, LEGENDARIO). */
  function etiquetaCategoria(id, corta) {
    const c = Libre.sim.buscarCategoria(id);
    // Corta (fichas pequeñas): «L» en vez de LEGENDARIO; el color es el mismo.
    const texto = corta && id === 'L' ? 'L' : c && c.nombre;
    return c ? '<span class="' + claseRareza(id) + '" title="' + esc(c.nombre) + '">' + esc(texto) + '</span>' : '';
  }

  /*
   * Iconos de objetos (iconos/*.svg, del paquete de diseño): se
   * llaman como el objeto salvo estos. Los dibujos traen sus propios colores.
   */
  const ARCHIVO_ICONO = { escaner: 'radio', paconi: 'planta', alfombrillas: 'alfombrilla', bolsaVomito: 'bolsa' };
  function archivoIcono(nombre) {
    if (ARCHIVO_ICONO[nombre]) return ARCHIVO_ICONO[nombre];
    return Libre.sim.buscarObjeto(nombre) ? nombre : null;
  }

  function icono(nombre, clase) {
    const archivo = archivoIcono(nombre);
    if (archivo) {
      return '<img class="icono icono-dibujo ' + (clase || '') + '" src="iconos/' + archivo + '.svg" alt="" width="48" height="48" draggable="false">';
    }
    return '<svg class="icono ' + (clase || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONOS[nombre] || '') + '</svg>';
  }

  /* Fondo de color de la casilla de un objeto, según su categoría. */
  function claseFondo(categoria) {
    return 'fondo-' + (categoria === 'S+' ? 'Smas' : categoria);
  }

  /* Lo menos que cuesta contratar ahora (el candidato más barato). */
  function precioMasBarato(estado) {
    return Math.min.apply(null, Libre.sim.candidatos(estado).map(Libre.sim.precioCandidato));
  }

  function nivelDe(t) { return Libre.sim.progresoConductor(t); }
  function textoExperiencia(p) {
    return p.hasta === null ? 'Nivel máximo' : Math.floor(p.xp) + ' de ' + p.hasta + ' de experiencia';
  }

  // Turno en el que estás eligiendo conductor ('licencia|turno') o null.
  let eligiendoConductor = null;
  // Conductor con la ficha abierta ('licencia|turno') o null.
  let fichaConductor = null;
  let cocheAbierto = null;   // id de la licencia cuya hoja del coche está abierta
  // Objeto del almacén con su panel abierto (id) o null.
  let fichaInventario = null;
  // Lo que el jugador ha elegido gastar al combinar: { id del objeto abierto, cuenta: { id: n } }.
  let combinarSel = null;

  // ¿Está abierta la lista para vender objetos mientras contratas?
  let ventaParaContratar = false;
  // Conductor ('licencia|turno') al que estás eligiendo qué objeto equipar, o null.
  let equipando = null;
  // Qué hoja hay que enfocar al dibujarla (su botón de cerrar): 'ficha', 'candidatos', 'equipar'.
  let enfocarHoja = null;

  /*
   * Fila de un rasgo (ficha y candidatos): icono redondo verde o rojo, el
   * nombre y lo que hace.
   */
  function htmlFilaRasgo(tipo, id) {
    const rasgo = Libre.sim.buscarRasgo(id);
    if (!rasgo) return '';
    return '<div class="ficha-rasgo ' + tipo + '"><span class="ficha-rasgo-icono">' + icono(id) + '</span>' +
      '<span><strong>' + (tipo === 'cualidad' ? '' : '<span class="solo-lector">Defecto: </span>') + esc(rasgo.nombre) + '</strong>' +
      '<small>' + esc(rasgo.descripcion) + '</small></span></div>';
  }
  function htmlFilasRasgos(t) {
    return Libre.sim.cualidadesDe(t).map(function (id) { return htmlFilaRasgo('cualidad', id); }).join('') +
      Libre.sim.defectosDe(t).map(function (id) { return htmlFilaRasgo('defecto', id); }).join('');
  }

  /* Botón de cerrar de las hojas (×). */
  function botonCerrarHoja(atributo, etiqueta) {
    return '<button type="button" class="hoja-cerrar" ' + atributo + ' aria-label="' + etiqueta + '">' +
      '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
  }

  /*
   * Comparar dos conductores (o un candidato con uno de los tuyos): hoja con
   * las dos caras arriba y una fila por estadística (las mismas cuentas que
   * la ficha, statsConductor()), con el mejor de los dos en verde y «▲».
   * Encima, cuántas gana cada uno; debajo, rasgos, objetos y lo hecho. Con
   * el día cerrado, «Intercambiarlos». comparando: [clave, clave]; un
   * candidato es 'candidato|i'.
   */
  let comparando = null;

  /* Lo que hace falta para comparar a alguien: su turno, dónde está y qué es. */
  function aComparar(estado, clave) {
    const c = Libre.config;
    if (clave.indexOf('candidato|') === 0) {
      const x = Libre.sim.candidatos(estado)[Number(clave.split('|')[1])];
      return x ? { t: x, turno: null, donde: 'Candidato · ' + euros(Libre.sim.precioCandidato(x)), candidato: true } : null;
    }
    const x = conductorDe(estado, clave);
    if (!x) return null;
    return {
      t: x.t, turno: x.enReserva ? null : x.turno, candidato: false,
      donde: x.enReserva ? 'Reserva' : Libre.sim.textoLicencia(x.lic) + ' · ' + c.turnos[x.turno].nombre
    };
  }

  /* Valor corto de una estadística, para que quepan dos por fila. */
  function textoStatCorto(s) {
    if (s.clave === 'espera') {
      // Con una cifra decimal si el cambio es pequeño, para que se vea la diferencia.
      const v = (s.factor - 1) * 100;
      if (Math.abs(v) < 0.05) return 'Normal';
      return (v < 0 ? '−' : '+') + Math.abs(v).toLocaleString('es-ES', { maximumFractionDigits: Math.abs(v) < 10 ? 1 : 0 }) + ' %';
    }
    if (s.clave === 'importeLluvia') return s.factor === 0 ? 'No trabaja' : '×' + s.factor.toLocaleString('es-ES', { maximumFractionDigits: 2 });
    if (s.clave === 'limpieza') {
      if (s.factor === 0) return 'Nunca: lleva bolsa';
      return Math.round(s.valor.minutos) + ' min · ' + Math.round(s.valor.costeMin) + '–' + Math.round(s.valor.costeMax) + ' €';
    }
    return porcentaje(s.valor);
  }

  function htmlCabezaComparar(x) {
    const cat = Libre.sim.buscarCategoria(x.t.categoria);
    return '<div class="comp-quien"><span class="cara-foto"><span class="retrato">' + Libre.retratos.svg(x.t.retrato) + '</span>' +
      htmlCirculos(x.t) + '</span><strong>' + esc(x.t.nombre) + '</strong>' +
      '<span class="comp-categoria">' + (cat ? '<span class="' + claseRareza(cat.id) + '">' + esc(cat.nombre) + '</span>' : '') +
      ' Nivel ' + Libre.sim.nivelConductor(x.t) + '</span><small>' + esc(x.donde) + '</small></div>';
  }

  function htmlHojaComparar(estado) {
    if (!comparando) return '';
    const a = aComparar(estado, comparando[0]);
    const b = aComparar(estado, comparando[1]);
    if (!a || !b) { comparando = null; return ''; }
    const sa = Libre.sim.statsConductor(estado, a.t, a.turno);
    const sb = Libre.sim.statsConductor(estado, b.t, b.turno);
    let ganaA = 0, ganaB = 0;
    const celda = function (texto, mejor) {
      return '<span class="comp-valor' + (mejor ? ' mejor' : '') + '">' + esc(texto) + (mejor ? ' <span aria-label="mejor">▲</span>' : '') + '</span>';
    };
    // Algunas stats solo salen si cuentan (la suerte): se emparejan por clave
    // y a quien no la tiene se le pone la normal (factor 1, 0 %).
    const claves = sa.map(function (s) { return s.clave; });
    sb.forEach(function (s) { if (claves.indexOf(s.clave) === -1) claves.push(s.clave); });
    const deClave = function (lista, clave) {
      return lista.find(function (s) { return s.clave === clave; }) || { clave, factor: 1, valor: 0, fuentes: [] };
    };
    const filas = claves.map(function (clave) {
      const s = deClave(sa, clave);
      const o = deClave(sb, clave);
      let mejor = 0;
      if (Math.abs(s.factor - o.factor) > 1e-6) mejor = (s.factor > o.factor) === !!MAS_ES_MEJOR[s.clave] ? 1 : 2;
      if (mejor === 1) ganaA++;
      if (mejor === 2) ganaB++;
      return '<div class="comp-fila"><span class="comp-nombre">' + esc(NOMBRE_STAT[s.clave]) + '</span>' +
        celda(textoStatCorto(s), mejor === 1) + celda(textoStatCorto(o), mejor === 2) + '</div>';
    }).join('');
    const total = claves.length;
    const resumen = ganaA === ganaB
      ? 'Empatan: ' + ganaA + ' y ' + ganaB + ' de ' + total + ' estadísticas'
      : (ganaA > ganaB ? a.t.nombre + ' es mejor en ' + ganaA : b.t.nombre + ' es mejor en ' + ganaB) + ' de ' + total + ' estadísticas' +
        (Math.min(ganaA, ganaB) ? '; ' + (ganaA > ganaB ? b.t.nombre : a.t.nombre) + ', en ' + Math.min(ganaA, ganaB) : '');
    const rasgos = function (x) {
      return Libre.sim.cualidadesDe(x.t).map(function (id) { return '+ ' + Libre.sim.buscarRasgo(id).nombre; })
        .concat(Libre.sim.defectosDe(x.t).map(function (id) { return '− ' + Libre.sim.buscarRasgo(id).nombre; })).join('<br>') || '—';
    };
    const objetos = function (x) {
      return (x.t.objetos || []).map(function (id) { return esc(Libre.sim.buscarObjeto(id).nombre); }).join('<br>') || '—';
    };
    const hecho = function (x, campo) {
      if (x.candidato) return '—';
      return campo === 'carreras' ? numero(Math.floor(x.t.carreras || 0)) : euros(x.t.facturado || 0);
    };
    const fila = function (nombre, va, vb) {
      return '<div class="comp-fila comp-fila--texto"><span class="comp-nombre">' + nombre + '</span>' +
        '<span class="comp-valor">' + va + '</span><span class="comp-valor">' + vb + '</span></div>';
    };
    const intercambiar = Libre.sim.enPausa(estado) && !a.candidato && !b.candidato;
    return '<div class="hoja-fondo hoja-encima" data-cerrar-comparar></div>' +
      '<div class="hoja hoja-encima hoja-comparar" role="dialog" aria-modal="true" aria-labelledby="comparar-titulo">' +
      '<span class="hoja-asa" aria-hidden="true"></span>' +
      '<div class="hoja-cabecera"><h3 id="comparar-titulo">Comparar</h3>' +
      botonCerrarHoja('data-cerrar-comparar', 'Cerrar la comparación') + '</div>' +
      '<div class="comp-cabezas">' + htmlCabezaComparar(a) + htmlCabezaComparar(b) + '</div>' +
      '<p class="comp-resumen">' + esc(resumen) + '</p>' +
      '<div class="comp-tabla">' + filas +
      fila('Rasgos', rasgos(a), rasgos(b)) + fila('Objetos', objetos(a), objetos(b)) +
      fila('Carreras', hecho(a, 'carreras'), hecho(b, 'carreras')) + fila('Facturado', hecho(a, 'facturado'), hecho(b, 'facturado')) +
      '</div>' +
      '<p class="comp-nota">Cada uno en su turno: lo que es solo de día o de noche cuenta en el suyo (en la reserva y en los candidatos, no cuenta).</p>' +
      (intercambiar ? '<button type="button" class="ui-boton ui-boton--secundario ui-boton--ancho" data-intercambiar>Intercambiarlos</button>' : '') +
      '</div>';
  }

  /* «Comparar con…» de un candidato: la lista de tus conductores. */
  function htmlCompararCandidato(estado, i) {
    const todos = Libre.sim.todosLosConductores(estado);
    if (todos.length === 0) return '';
    const c = Libre.config;
    const opciones = [];
    estado.licencias.forEach(function (l) {
      ['dia', 'noche'].forEach(function (tn) {
        const t = l.turnos[tn];
        if (t && t.quien === 'conductor') {
          opciones.push('<option value="' + l.id + '|' + tn + '">' + esc(t.nombre) + ' · ' + esc(Libre.sim.textoLicencia(l)) + ' · ' +
            esc(c.turnos[tn].nombre) + '</option>');
        }
      });
    });
    (estado.reserva || []).forEach(function (t, k) {
      opciones.push('<option value="reserva|' + k + '">' + esc(t.nombre) + ' · Reserva</option>');
    });
    return '<select class="candidato-comparar" data-comparar-candidato="' + i + '" aria-label="Comparar con uno de tus conductores">' +
      '<option value="" selected disabled>Comparar con…</option>' + opciones.join('') + '</select>';
  }

  /*
   * Hoja de candidatos para un turno vacío (o para la reserva): una tarjeta
   * por candidato con su retrato, rareza, rasgos y su precio (según la
   * categoría). Si no te llega, cuánto falta, y al pie la opción de vender
   * objetos ahí mismo.
   */
  function htmlHojaCandidatos(estado) {
    if (!eligiendoConductor) return '';
    const c = Libre.config;
    const reserva = eligiendoConductor === 'reserva';
    let lic = null, turno = null;
    if (!reserva) {
      const partes = eligiendoConductor.split('|');
      lic = estado.licencias.find(function (l) { return String(l.id) === partes[0]; });
      turno = partes[1];
      if (!lic || lic.turnos[turno]) { eligiendoConductor = null; return ''; }
    }
    let falta = false;
    const hayHuecoReserva = (estado.reserva || []).length < c.conductores.reserva;
    const tarjetas = Libre.sim.candidatos(estado).map(function (x, i) {
      const precio = Libre.sim.precioCandidato(x);
      const cat = Libre.sim.buscarCategoria(x.categoria);
      if (estado.dinero < precio) falta = true;
      return '<div class="candidato ui-tarjeta">' +
        '<div class="candidato-cabecera"><span class="cara-foto"><span class="retrato">' + Libre.retratos.svg(x.retrato) + '</span>' +
        (cat ? '<span class="cara-categoria ' + claseRareza(cat.id) + '" aria-hidden="true">' + esc(cat.id === 'L' ? 'L' : cat.nombre) + '</span>' : '') +
        '</span><div><strong>' + esc(x.nombre) + '</strong>' +
        (cat ? '<span class="' + claseRareza(cat.id) + '">' + esc(cat.nombre) + '</span>' : '') + '</div></div>' +
        '<div class="ficha-rasgos">' + htmlFilasRasgos(x) + htmlFuerzaCategoria(x) + '</div>' +
        '<div class="candidato-pie">' +
        (lic ? boton('Contratar · ' + euros(precio), 'contratarConductor', [lic.id, turno, i], 'ui-boton ui-boton--principal', precio) : '') +
        (hayHuecoReserva
          ? boton(lic ? 'A la reserva' : 'A la reserva · ' + euros(precio), 'contratarAReserva', [i],
            'ui-boton ' + (lic ? 'ui-boton--secundario' : 'ui-boton--principal'), precio)
          : '') +
        '</div>' +
        (estado.dinero < precio ? '<p class="candidato-falta">Te faltan ' + euros(precio - estado.dinero) + '</p>' : '') +
        htmlCompararCandidato(estado, i) +
        '</div>';
    }).join('');
    const hayObjetos = Libre.sim.objetosEnAlmacen(estado) > 0;
    const titulo = reserva ? 'Contratar · Reserva'
      : 'Contratar · Licencia ' + Libre.sim.textoLicencia(lic) + ' · ' + c.turnos[turno].nombre;
    return '<div class="hoja-fondo" data-cerrar-candidatos></div>' +
      '<div class="hoja hoja-candidatos" role="dialog" aria-modal="true" aria-labelledby="candidatos-titulo">' +
      '<span class="hoja-asa" aria-hidden="true"></span>' +
      '<div class="hoja-cabecera"><h3 id="candidatos-titulo">' + esc(titulo) + '</h3>' +
      botonCerrarHoja('data-cerrar-candidatos', 'Cerrar los candidatos') + '</div>' +
      // Sin conductor en el turno y sin conducir tú: puedes cogerlo tú.
      (!reserva && !Libre.sim.conduce(estado)
        ? boton('Conducir yo este turno', 'conducir', [lic.id, turno], 'ui-boton ui-boton--secundario ui-boton--ancho') : '') +
      htmlRebuscar(estado) +
      tarjetas +
      (falta && hayObjetos
        ? '<button type="button" class="ui-boton ui-boton--secundario ui-boton--ancho" data-venta-contratar aria-expanded="' +
          ventaParaContratar + '">' + (ventaParaContratar ? 'Cerrar la venta' : 'Vender objetos para contratar') + '</button>' +
          (ventaParaContratar ? htmlListaVenta(estado) : '')
        : '') +
      '</div>';
  }

  /*
   * Cazatalentos (idea 11): «Buscar otros» con su precio del momento (se
   * dobla con cada búsqueda del día). Sin la mejora, no sale.
   */
  function htmlRebuscar(estado) {
    if (!Libre.sim.nivelMejora(estado, 'cazatalentos')) return '';
    const precio = Libre.sim.precioRebuscar(estado);
    return boton('Buscar otros candidatos · ' + euros(precio), 'rebuscarCandidatos', [],
      'ui-boton ui-boton--secundario ui-boton--ancho candidatos-rebuscar', precio);
  }

  /* Baja, avería o parado, en una línea bajo el conductor. */
  function textoEstadoTurno(estado, lic, t) {
    const jornada = Libre.sim.jornadaDe(estado.reloj.minutos);
    if (lic && Libre.sim.trabajaIncognito(estado, lic, t, estado.reloj.minutos)) {
      return t.paradoHasta > estado.reloj.minutos ? 'Pillado por un pesetas: parado hasta las ' + horaDe(t.paradoHasta)
        : 'Hoy libra su licencia: sale de incógnito';
    }
    if (lic && Libre.sim.libra(estado, lic)) return 'Hoy libra (libranza de la licencia)';
    if (lic && lic.averia && jornada < lic.averia.hasta) return 'Coche en el taller hasta el día ' + (lic.averia.hasta + 1);
    if (t.baja && jornada < t.baja.hasta) {
      const faltan = t.baja.hasta - jornada;
      return 'De baja: ' + (faltan === 1 ? 'falta 1 día' : 'faltan ' + faltan + ' días');
    }
    if (t.paradoHasta > estado.reloj.minutos) return (t.motivoParada === 'descanso' ? 'Descansando' : 'Parado') + ' hasta las ' + horaDe(t.paradoHasta);
    return '';
  }

  /*
   * Cara de un conductor: su retrato con dos círculos (abajo a la izquierda,
   * la letra y el color de su categoría; abajo a la derecha, su nivel) y su
   * nombre debajo. Al tocarla se abre su ficha; con el día cerrado se puede
   * arrastrar y soltar sobre otro sitio. Si está parado (baja, avería,
   * libranza…) sale atenuada con un aviso.
   */
  /* Clase de la insignia de rareza (ui-rareza) de una categoría. */
  function claseRareza(id) {
    return 'ui-rareza ui-rareza--' + (id === 'S+' ? 'Smas' : id);
  }

  function htmlCirculos(t) {
    const cat = Libre.sim.buscarCategoria(t.categoria);
    const letra = cat ? (cat.id === 'L' ? 'L' : cat.nombre) : '';
    return (cat ? '<span class="cara-categoria ' + claseRareza(cat.id) + '" aria-hidden="true">' + esc(letra) + '</span>' : '') +
      '<span class="cara-nivel" aria-hidden="true">' + Libre.sim.nivelConductor(t) + '</span>';
  }

  function htmlCara(estado, clave, t, lic) {
    const aviso = textoEstadoTurno(estado, lic, t);
    const cat = Libre.sim.buscarCategoria(t.categoria);
    const mover = Libre.sim.enPausa(estado) ? ' data-arrastrable data-destino="' + clave + '"' : '';
    return '<button type="button" class="cara' + (aviso ? ' con-aviso' : '') + '" data-ficha-conductor="' + clave + '"' + mover +
      ' title="' + esc(t.nombre + (aviso ? ' · ' + aviso : '')) + '"' +
      ' aria-label="' + esc(t.nombre + ', categoría ' + (cat ? cat.nombre : '') + ', nivel ' + Libre.sim.nivelConductor(t) +
        (aviso ? ', ' + aviso : '') + '. Ver su ficha') + '">' +
      '<span class="cara-foto"><span class="retrato' + (aviso ? ' atenuado' : '') + '">' + Libre.retratos.svg(t.retrato) + '</span>' +
      htmlCirculos(t) + (aviso ? '<span class="cara-aviso" aria-hidden="true">!</span>' : '') + '</span>' +
      '<span class="cara-nombre">' + esc(t.nombre) + '</span></button>';
  }

  /* Icono «+» de los huecos para contratar. */
  const ICONO_MAS = '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

  // ---------------------------------------------------------- Estadísticas
  /*
   * Pestaña Estadísticas (Iván, 18-11-2026): tres cifras de la partida, la
   * facturación de cada día de los últimos 30 (barra verde y raya del neto;
   * tocar una enseña sus cifras), tu media diaria y la de cada conductor con
   * turno, y los diez mejores conductores de la partida (también despedidos).
   * Los datos salen de estado.historial y de Libre.sim (mediasDiarias,
   * clasificacionConductores). Fuera de su pestaña no se dibuja.
   */
  let diaEstadistica = null;   // día elegido en el gráfico (null: el último)

  function nombreDia(dia) {
    const dias = Libre.config.reloj.diasSemana;
    return dias[dia % 7] + ' · día ' + (dia + 1);
  }

  function htmlCifrasPartida(estado) {
    const mejor = estado.mejorDia;
    const cifra = function (etiqueta, valor, pie) {
      return '<div class="ui-tarjeta estad-cifra"><span>' + etiqueta + '</span><strong class="ui-dinero">' + valor + '</strong>' +
        (pie ? '<small>' + esc(pie) + '</small>' : '') + '</div>';
    };
    return '<div class="estad-cifras">' +
      cifra('Facturado', eurosCorto(estado.totales.ingresos), 'en la partida') +
      cifra('Carreras', numero(Math.floor(estado.totales.carreras)), 'en la partida') +
      cifra('Mejor día', mejor ? eurosCorto(mejor.ingresos) : '—', mejor ? nombreDia(mejor.dia) : 'sin cerrar') +
      cifra('Km recorridos', numero(Math.floor(estado.totales.km || 0)) + ' km', 'por tu flota') +
      '</div>';
  }

  /*
   * Barras de la facturación por día. El cero va donde haga falta para que
   * quepa un neto negativo; la raya de cada barra es el neto (roja si se
   * perdió dinero). Siempre 30 huecos: los días aún sin datos quedan vacíos.
   */
  function htmlGraficoDias(estado) {
    const dias = Libre.config.estadisticas.dias;
    const historial = estado.historial || [];
    if (historial.length === 0) {
      return '<p class="estad-vacio">Cierra tu primera jornada para ver aquí lo que facturas cada día.</p>';
    }
    const maximo = Math.max.apply(null, historial.map(function (r) { return Math.max(r.ingresos, r.neto); }).concat([1]));
    const minimo = Math.min.apply(null, historial.map(function (r) { return r.neto; }).concat([0]));
    const rango = maximo - minimo;
    const cero = -minimo / rango * 100;
    const pct = function (v) { return (v / rango * 100).toFixed(2) + '%'; };
    const elegido = historial.find(function (r) { return r.dia === diaEstadistica; }) || historial[historial.length - 1];
    const vacios = [];
    for (let i = historial.length; i < dias; i++) vacios.push('<span class="estad-barra vacia"></span>');
    const barras = historial.map(function (r) {
      return '<button type="button" class="estad-barra' + (r === elegido ? ' elegida' : '') + '" data-dia-estadistica="' + r.dia + '"' +
        ' aria-label="' + esc(nombreDia(r.dia) + ': ' + euros(r.ingresos) + ', neto ' + euros(r.neto)) + '"' +
        (r === elegido ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' +
        '<i class="estad-ingresos" style="bottom:' + cero.toFixed(2) + '%;height:' + pct(r.ingresos) + '"></i>' +
        '<i class="estad-neto' + (r.neto < 0 ? ' negativo' : '') + '" style="bottom:' + (cero + r.neto / rango * 100).toFixed(2) + '%"></i>' +
        '</button>';
    }).join('');
    return '<div class="estad-grafico" style="--cero:' + cero.toFixed(2) + '%">' +
      '<span class="estad-eje">' + eurosCorto(maximo) + '</span>' +
      '<div class="estad-barras">' + vacios.join('') + barras + '</div></div>' +
      '<p class="estad-detalle"><strong>' + esc(nombreDia(elegido.dia)) + '</strong>' +
      '<span>' + euros(elegido.ingresos) + ' · neto <b class="' + (elegido.neto < 0 ? 'ui-dinero--negativo' : 'ui-dinero--positivo') + '">' +
      euros(elegido.neto) + '</b> · ' + numero(Math.floor(elegido.carreras)) + ' carreras</span></p>' +
      '<p class="estad-leyenda"><i class="estad-muestra"></i>Facturado <i class="estad-muestra neto"></i>Neto</p>';
  }

  /* Tu media diaria y la de cada conductor con turno, en barras de mayor a menor. */
  function htmlMedias(estado) {
    const m = Libre.sim.mediasDiarias(estado);
    const filas = [];
    if (m.tu) filas.push({ nombre: 'Tú', retrato: '<span class="retrato retrato-texto tu">TÚ</span>', media: m.tu.media, dias: m.tu.dias, tu: true });
    m.conductores.forEach(function (x) {
      filas.push({
        nombre: x.t.nombre, media: x.media, dias: x.dias, clave: x.licenciaId + '|' + x.turno,
        retrato: '<span class="cara-foto"><span class="retrato">' + Libre.retratos.svg(x.t.retrato) + '</span>' + htmlCirculos(x.t) + '</span>'
      });
    });
    if (filas.length === 0 || (estado.historial || []).length === 0) {
      return '<p class="estad-vacio">Cuando cierres una jornada verás aquí lo que deja de media cada uno.</p>';
    }
    const mayor = Math.max.apply(null, filas.map(function (f) { return f.media || 0; }).concat([1]));
    return '<ol class="estad-lista">' + filas.map(function (f) {
      const valor = f.media === null ? '<span class="estad-sin">Sin jornadas</span>'
        : '<span class="ui-dinero">' + eurosCorto(f.media) + '</span><small>/día</small>';
      const contenido = '<span class="estad-retrato">' + f.retrato + '</span>' +
        '<span class="estad-quien"><strong>' + esc(f.nombre) + '</strong><small>' +
        (f.dias ? f.dias + (f.dias === 1 ? ' jornada' : ' jornadas') : 'Recién llegado') + '</small></span>' +
        '<span class="estad-valor">' + valor + '</span>' +
        '<span class="estad-barra-fila ui-barra' + (f.tu ? ' ui-barra--marca' : '') + '"><span class="ui-barra-relleno" style="width:' +
        ((f.media || 0) / mayor * 100).toFixed(1) + '%"></span></span>';
      return '<li>' + (f.clave
        ? '<button type="button" class="estad-fila" data-ficha-conductor="' + f.clave + '">' + contenido + '</button>'
        : '<div class="estad-fila">' + contenido + '</div>') + '</li>';
    }).join('') + '</ol>';
  }

  /* Los diez mejores conductores de la partida por facturado total. */
  function htmlClasificacion(estado) {
    const top = Libre.sim.clasificacionConductores(estado);
    if (top.length === 0) return '<p class="estad-vacio">Contrata a tu primer conductor para empezar la clasificación.</p>';
    const mayor = Math.max(top[0].facturado, 1);
    return '<ol class="estad-lista">' + top.map(function (x, i) {
      const contenido = '<span class="estad-puesto' + (i < 3 ? ' medalla-' + (i + 1) : '') + '">' + (i + 1) + '</span>' +
        '<span class="estad-retrato"><span class="cara-foto"><span class="retrato' + (x.despedido ? ' atenuado' : '') + '">' +
        Libre.retratos.svg(x.retrato) + '</span>' + htmlCirculos(x) + '</span></span>' +
        '<span class="estad-quien"><strong>' + esc(x.nombre) + '</strong><small>' +
        (x.despedido ? '<span class="ui-chip ui-chip--libranza">Despedido</span> ' : '') +
        numero(Math.floor(x.carreras)) + ' carreras</small></span>' +
        '<span class="estad-valor"><span class="ui-dinero">' + eurosCorto(x.facturado) + '</span></span>' +
        '<span class="estad-barra-fila ui-barra"><span class="ui-barra-relleno" style="width:' + (x.facturado / mayor * 100).toFixed(1) + '%"></span></span>';
      const clave = x.despedido ? null : x.licenciaId + '|' + x.turno;
      return '<li>' + (clave
        ? '<button type="button" class="estad-fila con-puesto" data-ficha-conductor="' + clave + '">' + contenido + '</button>'
        : '<div class="estad-fila con-puesto">' + contenido + '</div>') + '</li>';
    }).join('') + '</ol>';
  }

  const seccionEstadisticas = {
    id: 'sec-estadisticas',
    firma: function (estado) {
      if (vistaActual !== 'estadisticas') return 'fuera';
      const h = estado.historial || [];
      // Se redibuja al cerrar un día, al cambiar la flota o cada 20 € facturados.
      return JSON.stringify([h.length, h.length ? h[h.length - 1].dia : -1, diaEstadistica,
        Math.floor(estado.totales.ingresos / 20), Math.floor((estado.totales.km || 0) / 100), (estado.exConductores || []).length,
        Libre.sim.todosLosConductores(estado).map(function (x) { return x.t.id + '@' + x.licenciaId + x.turno; })]);
    },
    html: function (estado) {
      if (vistaActual !== 'estadisticas') return '';
      const dias = Libre.config.estadisticas.dias;
      const bloque = function (titulo, pie, cuerpo) {
        return '<section class="ui-tarjeta estad-bloque"><div class="estad-cabeza"><h3 class="ui-titulo">' + titulo + '</h3>' +
          '<span>' + pie + '</span></div>' + cuerpo + '</section>';
      };
      return '<div class="pantalla-titulo"><h2 class="ui-titulo ui-titulo--pantalla">Estadísticas</h2></div>' +
        htmlCifrasPartida(estado) +
        bloque('Facturación por día', 'Últimos ' + dias + ' días', htmlGraficoDias(estado)) +
        bloque('Media diaria', 'Últimos ' + dias + ' días', htmlMedias(estado)) +
        bloque('Mejores conductores', 'Top ' + Libre.config.estadisticas.top, htmlClasificacion(estado));
    }
  };

  // Panel abierto bajo una licencia para tu turno ('licencia|turno') o null.
  let panelTu = null;

  /* Un turno de la licencia: su icono y la cara de quien lo lleva (o un hueco). */
  function htmlHuecoTurno(estado, lic, turno) {
    const c = Libre.config;
    const t = lic.turnos[turno];
    const clave = lic.id + '|' + turno;
    const pausa = Libre.sim.enPausa(estado);
    let cara;
    if (!t) {
      const abierto = eligiendoConductor === clave;
      cara = '<button type="button" class="cara cara-vacia" data-elegir-conductor="' + clave + '" aria-expanded="' + abierto + '"' +
        (pausa ? ' data-destino="' + clave + '"' : '') + ' data-precio="' + precioMasBarato(estado) + '"' +
        ' aria-label="Turno de ' + esc(c.turnos[turno].nombre.toLowerCase()) + ' libre: contratar">' +
        '<span class="cara-foto"><span class="retrato retrato-texto">' + ICONO_MAS + '</span></span><span class="cara-nombre">Libre</span></button>';
    } else if (t.quien === 'jugador') {
      cara = '<button type="button" class="cara" data-panel-tu="' + clave + '" aria-expanded="' + (panelTu === clave) + '"' +
        ' aria-label="Tu turno: zona y opciones">' +
        '<span class="cara-foto"><span class="retrato retrato-texto tu">TÚ</span></span><span class="cara-nombre">Tú</span></button>';
    } else {
      cara = htmlCara(estado, clave, t, lic);
    }
    return '<div class="hueco-turno turno-' + turno + '" title="' + esc(c.turnos[turno].nombre + ', ' + horario(turno)) + '">' +
      icono(turno, 'icono-turno') + cara + '</div>';
  }

  /* Tu turno, desplegado bajo la licencia: zona, cambiar de turno, dejar de conducir. */
  function htmlPanelTu(estado, lic, turno) {
    const c = Libre.config;
    const t = lic.turnos[turno];
    const otro = turno === 'dia' ? 'noche' : 'dia';
    return '<div class="panel-tu"><span>Tu turno de ' + esc(c.turnos[turno].nombre.toLowerCase()) + ' · zona</span>' +
      selectorZona(estado, lic.id, turno, t.zona) +
      (lic.turnos[otro] ? '' : boton('Pasar a ' + c.turnos[otro].nombre.toLowerCase(), 'cambiarTurnoJugador', [])) +
      // Dejar el volante es una mejora (Oficina de gestión).
      (Libre.sim.modificadores(estado).dejarVolante ? boton('Dejar de conducir', 'dejarDeConducir', []) : '') + '</div>';
  }

  /*
   * Reserva: conductores contratados que no trabajan, en una fila de caras.
   * Se contrata aquí directamente y, entre jornadas, se les da un turno.
   */
  function htmlReserva(estado) {
    const max = Libre.config.conductores.reserva;
    const reserva = estado.reserva || [];
    const abierto = eligiendoConductor === 'reserva';
    const pausa = Libre.sim.enPausa(estado);
    const huecos = [];
    reserva.forEach(function (t, i) { huecos.push(htmlCara(estado, 'reserva|' + i, t, null)); });
    // Los huecos libres: tocarlos abre los candidatos; entre jornadas, se puede soltar ahí.
    for (let i = reserva.length; i < max; i++) {
      huecos.push('<button type="button" class="cara cara-vacia" data-elegir-conductor="reserva" aria-expanded="' + abierto + '"' +
        (pausa ? ' data-destino="reserva"' : '') +
        ' aria-label="Hueco libre en la reserva: contratar desde ' + euros(precioMasBarato(estado)) + '">' +
        '<span class="cara-foto"><span class="retrato retrato-texto">' + ICONO_MAS + '</span></span>' +
        '<span class="cara-nombre">Libre</span></button>');
    }
    return '<div class="reserva ui-tarjeta ui-tarjeta--hueco">' +
      '<div class="reserva-cabecera"><strong>Reserva</strong><span>' + reserva.length + ' de ' + max + '</span></div>' +
      '<div class="reserva-caras">' + huecos.join('') + '</div>' +
      (reserva.length === 0
        ? '<p class="reserva-ayuda">Contratados que esperan turno: no trabajan ni cuestan nada.</p>' : '') + '</div>';
  }

  /* Turno de conductor de una clave 'licencia|turno', o null. */
  function conductorDe(estado, clave) {
    if (!clave) return null;
    const partes = clave.split('|');
    if (partes[0] === 'reserva') {
      const r = (estado.reserva || [])[Number(partes[1])];
      return r ? { lic: null, licId: 'reserva', turno: partes[1], t: r, enReserva: true } : null;
    }
    const lic = estado.licencias.find(function (l) { return String(l.id) === partes[0]; });
    const t = lic && lic.turnos[partes[1]];
    return t && t.quien === 'conductor' ? { lic, licId: lic.id, turno: partes[1], t, enReserva: false } : null;
  }

  /*
   * Selector «Mover a…» de la ficha: cada turno de las licencias con coche
   * (menos el tuyo y el suyo; si está ocupado, se intercambian) y la
   * reserva. Solo entre jornadas, con el día cerrado.
   */
  function htmlMoverConductor(estado, x) {
    if (!Libre.sim.enPausa(estado)) {
      return '<button type="button" class="ui-boton ui-boton--secundario" disabled>Cambiar de sitio</button>';
    }
    // Cierra la ficha y deja al conductor «cogido»: se toca dónde ponerlo.
    return '<button type="button" class="ui-boton ui-boton--secundario" data-coger="' + fichaConductor + '">Cambiar de sitio</button>';
  }

  /* Lo que cambia su categoría: cualidad reforzada y defecto suavizado. */
  function htmlFuerzaCategoria(t) {
    const cat = Libre.sim.buscarCategoria(t.categoria);
    if (!cat || (cat.fuerzaCualidad === 1 && cat.fuerzaDefecto === 1)) return '';
    const nCualidades = Libre.sim.cualidadesDe(t).length;
    const nDefectos = Libre.sim.defectosDe(t).length;
    // «Categoría A: cualidad ×1,2 · defecto ×0,85» (maqueta).
    const partes = [(nCualidades > 1 ? 'cualidades' : 'cualidad') + ' ×' + factor(cat.fuerzaCualidad)];
    if (nDefectos) partes.push((nDefectos > 1 ? 'defectos' : 'defecto') + ' ×' + factor(cat.fuerzaDefecto));
    return '<p class="ficha-fuerza">Categoría ' + esc(cat.nombre) + ': ' + partes.join(' · ') + '</p>';
  }

  /*
   * Ficha del conductor (hoja que sube desde abajo): retrato grande, nivel y
   * experiencia, rasgos explicados, objetos con quitar o equipar, lo que lleva
   * hecho, su zona (la elige el conductor) y despedir con su finiquito.
   */
  /*
   * Energía del conductor (cansancio, Iván 23-11-2026): barra que se vacía
   * trabajando; a 0, descansa 30 min de juego. Se mueve en `actualizar`.
   */
  function textoEnergia(estado, t) {
    if (t.motivoParada === 'descanso' && t.paradoHasta > estado.reloj.minutos) {
      const v = Libre.sim.infoReloj(t.paradoHasta);
      return 'Descansa hasta las ' + dos(v.hora) + ':' + dos(v.minuto);
    }
    return Math.round(Libre.sim.energia(estado, t) / Libre.config.cansancio.maximo * 100) + ' %';
  }
  function htmlEnergia(estado, t) {
    const pct = Libre.sim.energia(estado, t) / Libre.config.cansancio.maximo * 100;
    return '<div class="ficha-energia"><strong>Energía</strong>' +
      '<span class="ui-barra energia-barra' + (pct < 25 ? ' energia-baja' : '') + '" role="progressbar" aria-label="Energía" ' +
      'aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct) + '" data-energia="' + fichaConductor + '">' +
      '<span class="ui-barra-relleno" style="width:' + pct.toFixed(0) + '%"></span></span>' +
      '<small id="ficha-energia">' + textoEnergia(estado, t) + '</small></div>';
  }

  function htmlFichaConductor(estado) {
    const x = conductorDe(estado, fichaConductor);
    if (!x) return '';
    const c = Libre.config;
    const t = x.t, lic = x.lic, turno = x.turno, licId = x.licId;
    const p = nivelDe(t);
    const huecos = Libre.sim.huecosConductor(t);
    const llevados = t.objetos || [];
    const disponibles = c.objetos.lista.filter(function (o) {
      return ((estado.objetos || {})[o.id] || 0) > 0 && llevados.indexOf(o.id) === -1;
    });
    const tabla = c.conductores.niveles.huecos;
    const cat = Libre.sim.buscarCategoria(t.categoria);

    // Mosaico de 3 huecos: objetos puestos, «Equipar» y los que llegan con el nivel.
    const casillas = llevados.map(function (id) {
      const o = Libre.sim.buscarObjeto(id);
      return '<div class="ficha-objeto" title="' + esc(o.descripcion) + '">' +
        '<span class="ficha-objeto-rareza ' + claseRareza(o.categoria) + '">' + esc(o.categoria === 'L' ? 'L' : o.categoria) + '</span>' +
        boton('<svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>', 'quitarObjeto',
          [licId, turno, o.id], 'ficha-objeto-quitar').replace('<button ', '<button aria-label="Quitar ' + esc(o.nombre) + '" ') +
        '<span class="ficha-objeto-icono fondo-' + (o.categoria === 'S+' ? 'Smas' : o.categoria) + '">' + icono(o.id) + '</span>' +
        '<strong>' + esc(o.nombre) + '</strong><small>' + esc(textoEfecto(o.efecto)) + '</small></div>';
    });
    for (let i = llevados.length; i < huecos; i++) {
      casillas.push(disponibles.length
        ? '<button type="button" class="ficha-objeto ficha-objeto--equipar" data-equipar="' + fichaConductor + '">' +
          ICONO_MAS + 'Equipar</button>'
        : '<span class="ficha-objeto ficha-objeto--vacio">Hueco libre<small>Sin objetos en el almacén</small></span>');
    }
    for (let n = p.nivel + 1; n <= tabla.length && casillas.length < tabla[tabla.length - 1]; n++) {
      if (tabla[n - 1] > tabla[n - 2]) casillas.push('<span class="ficha-objeto ficha-objeto--bloqueado">Nivel ' + n + '</span>');
    }

    const zona = x.enReserva ? 'Reserva' : c.zonas[t.zona] ? c.zonas[t.zona].nombre : t.zona;
    const coste = Libre.sim.costeDespido(t);
    const aviso = textoEstadoTurno(estado, lic, t);
    const pausa = Libre.sim.enPausa(estado);
    return '<div class="hoja-fondo" data-cerrar-ficha></div>' +
      '<div class="hoja hoja-ficha" role="dialog" aria-modal="true" aria-labelledby="ficha-nombre">' +
      '<span class="hoja-asa" aria-hidden="true"></span>' +
      '<div class="ficha-cabecera"><span class="cara-foto grande"><span class="retrato">' + Libre.retratos.svg(t.retrato) + '</span>' +
      htmlCirculos(t) + '</span><div class="ficha-quien">' +
      '<h3 id="ficha-nombre">' + esc(t.nombre) + '</h3>' +
      '<p>' + (cat ? '<span class="' + claseRareza(cat.id) + '">' + esc(cat.nombre) + '</span>' : '') +
      (x.enReserva ? 'En la reserva'
        : 'Licencia ' + esc(Libre.sim.textoLicencia(lic)) + ' · ' + esc(c.turnos[turno].nombre) + ' ' +
          dos(c.turnos[turno].horaInicio) + '–' + dos(c.turnos[turno].horaFin)) + '</p>' +
      (aviso ? '<p class="turno-estado">' + aviso + '</p>' : '') + '</div>' +
      botonCerrarHoja('data-cerrar-ficha', 'Cerrar la ficha') + '</div>' +
      '<div class="ficha-nivel"><strong>Nivel ' + p.nivel + '</strong>' +
      '<span class="ui-barra ui-barra--marca xp-barra" role="progressbar" aria-label="' + textoExperiencia(p) + '" aria-valuemin="0" ' +
      'aria-valuemax="100" aria-valuenow="' + Math.round(p.avance * 100) + '" data-xp="' + fichaConductor + '">' +
      '<span class="ui-barra-relleno" style="width:' + (p.avance * 100).toFixed(0) + '%"></span></span>' +
      '<small id="ficha-xp">' + textoXpCorto(p) + '</small></div>' +
      (x.enReserva ? '' : htmlEnergia(estado, t)) +
      '<div class="ficha-rasgos">' + htmlFilasRasgos(t) + htmlFuerzaCategoria(t) + '</div>' +
      '<div class="ficha-objetos-bloque"><strong>Objetos <span>· ' + llevados.length + ' de ' + huecos +
      (huecos === 1 ? ' hueco' : ' huecos') + '</span></strong>' +
      '<div class="ficha-objetos">' + casillas.join('') + '</div></div>' +
      // Iván, 20-11-2026: los datos y los botones, antes de las estadísticas
      // (antes había que bajar toda la lista para llegar a ellos).
      '<div class="ficha-datos">' +
      '<div><span>Carreras</span><strong id="ficha-carreras"></strong></div>' +
      '<div><span>Facturado</span><strong id="ficha-facturado"></strong></div>' +
      '<div title="' + esc(Libre.sim.modificadores(estado).gestionZonas
        ? 'Con el Curso gestión de zonas va cada hora a la que más te deja.'
        : 'Elige su propia zona, al azar entre las que tienen clientes.') + '"><span>Ahora en</span><strong>' + esc(zona) + '</strong></div>' +
      '</div>' +
      (Libre.sim.todosLosConductores(estado).length > 1
        ? '<button type="button" class="ui-boton ui-boton--secundario ui-boton--ancho" data-comparar="' + fichaConductor + '">' +
          'Comparar con otro conductor</button>' : '') +
      '<div class="ficha-acciones">' + htmlMoverConductor(estado, x) +
      boton('Despedir · ' + euros(coste), 'despedirConductor', [licId, turno], 'ui-boton ui-boton--peligro', coste) + '</div>' +
      (pausa ? '' : '<p class="ficha-nota">Cambiar de sitio solo entre días: cuando se cierre la caja.</p>') +
      htmlCocheEnFicha(estado, x.enReserva ? null : lic) +
      htmlStatsConductor(estado, t, x.enReserva ? null : turno) +
      '</div>';
  }

  /*
   * Selector de objetos: hoja encima de la ficha con los objetos sin equipar
   * del almacén en casillas como las del mosaico, de mejor a peor categoría.
   * Los que ya lleva salen atenuados. Tocar uno lo equipa y vuelve a la ficha.
   */
  function htmlHojaEquipar(estado) {
    const x = equipando && conductorDe(estado, equipando);
    if (!x || fichaConductor !== equipando) { equipando = null; return ''; }
    const llevados = x.t.objetos || [];
    const lista = objetosDelAlmacen(estado).map(function (o) {
      const lleva = llevados.indexOf(o.id) !== -1;
      const contenido = '<span class="ficha-objeto-rareza ' + claseRareza(o.categoria) + '">' + esc(o.categoria === 'L' ? 'L' : o.categoria) + '</span>' +
        '<span class="ficha-objeto-cantidad">×' + estado.objetos[o.id] + '</span>' +
        '<span class="ficha-objeto-icono fondo-' + (o.categoria === 'S+' ? 'Smas' : o.categoria) + '">' + icono(o.id) + '</span>' +
        '<strong>' + esc(o.nombre) + '</strong><small>' + esc(lleva ? 'Ya lo lleva' : textoEfecto(o.efecto)) + '</small>';
      return lleva
        ? '<span class="ficha-objeto ficha-objeto--puesto" title="' + esc(o.descripcion) + '">' + contenido + '</span>'
        : '<button type="button" class="ficha-objeto" data-accion="equiparObjeto" data-args="' + x.licId + '|' + x.turno + '|' + o.id + '"' +
          ' title="' + esc(o.descripcion + (o.frase ? ' ' + o.frase : '')) + '" aria-label="Equipar ' + esc(o.nombre) + ': ' + esc(textoEfecto(o.efecto)) + '">' +
          contenido + '</button>';
    }).join('');
    return '<div class="hoja-fondo hoja-encima" data-cerrar-equipar></div>' +
      '<div class="hoja hoja-encima hoja-equipar" role="dialog" aria-modal="true" aria-labelledby="equipar-titulo">' +
      '<span class="hoja-asa" aria-hidden="true"></span>' +
      '<div class="hoja-cabecera"><h3 id="equipar-titulo">Equipar a ' + esc(x.t.nombre) + '</h3>' +
      botonCerrarHoja('data-cerrar-equipar', 'Volver a la ficha') + '</div>' +
      '<div class="ficha-objetos">' + lista + '</div></div>';
  }

  /*
   * Efecto de un objeto en corto, para su casilla: «−22 % espera de noche,
   * −20 % bajas». La descripción larga va en el título.
   */
  const NOMBRE_EFECTO = {
    espera: 'espera', esperaDia: 'espera de día', esperaNoche: 'espera de noche', propina: 'propinas',
    sinPagar: 'sin pagar', objeto: 'objetos devueltos', baja: 'bajas', pinchazo: 'pinchazos',
    averia: 'averías', limpieza: 'limpieza', hallazgo: 'objetos encontrados', suerte: 'de encontrar algo mejor',
    importeLluvia: 'lo que cobra con lluvia'
  };
  // Efectos que no son un porcentaje.
  const TEXTO_EFECTO_ESPECIAL = { bolsa: 'nadie vomita en su taxi', sinImpagos: 'nadie se va sin pagar', rueda: 'pinchazos sin coste' };
  function textoEfecto(efecto) {
    const textos = Object.keys(efecto || {}).filter(function (k) { return NOMBRE_EFECTO[k] || TEXTO_EFECTO_ESPECIAL[k]; }).map(function (k) {
      if (TEXTO_EFECTO_ESPECIAL[k]) return TEXTO_EFECTO_ESPECIAL[k];
      const v = efecto[k];
      return (v < 1 ? '−' : '+') + Math.round(Math.abs(1 - v) * 100) + ' % ' + NOMBRE_EFECTO[k];
    });
    return textos.length ? textos.join(', ') : 'No hace nada';
  }

  /*
   * Estadísticas de la ficha: el valor real de cada stat (statsConductor())
   * y debajo de dónde sale. En verde si le favorece, en rojo si le perjudica.
   * MAS_ES_MEJOR: las que conviene tener altas.
   */
  const NOMBRE_STAT = {
    espera: 'Espera entre carreras', propina: 'Propina', sinPagar: 'Se va sin pagar',
    objeto: 'Devuelve un olvido', hallazgo: 'Encuentra un objeto', baja: 'Baja',
    pinchazo: 'Pinchazo', averia: 'Avería', limpieza: 'Limpiar un vómito', suerte: 'Encuentra algo mejor',
    importeLluvia: 'Cobra con lluvia'
  };
  const MAS_ES_MEJOR = { propina: true, objeto: true, hallazgo: true, suerte: true, importeLluvia: true };
  const NOMBRE_TIPO_FUENTE = { cualidad: 'Cualidad', defecto: 'Defecto', objeto: 'Objeto', nivel: '', mejora: 'Mejora', categoria: '', coche: '' };

  /* Porcentaje legible con las cifras justas: «18 %», «0,8 %», «0,08 %». */
  function porcentaje(p) {
    const v = p * 100;
    const decimales = v === 0 || v >= 100 ? 0 : v >= 1 ? 1 : 2;
    return v.toLocaleString('es-ES', { maximumFractionDigits: decimales }) + ' %';
  }
  /* Cambio de un factor: «−14 %», «+25 %». */
  function cambio(factor) {
    const v = Math.round((factor - 1) * 100);
    return (v < 0 ? '−' : '+') + Math.abs(v) + ' %';
  }

  function textoStat(s) {
    if (s.clave === 'espera') return s.factor === 1 ? 'Normal' : cambio(s.factor);
    if (s.clave === 'suerte') return porcentaje(s.valor) + ' de lo que encuentra';
    if (s.clave === 'importeLluvia') {
      return s.factor === 0 ? 'No trabaja si llueve' : '×' + s.factor.toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' si llueve';
    }
    if (s.clave === 'limpieza') {
      return euros(s.valor.costeMin) + '–' + euros(s.valor.costeMax) + ' · ' + Math.round(s.valor.minutos) + ' min parado';
    }
    const por = ['baja', 'pinchazo', 'averia'].indexOf(s.clave) !== -1 ? ' de los turnos' : ' de las carreras';
    return porcentaje(s.valor) + por;
  }

  function textoFuente(f) {
    const tipo = NOMBRE_TIPO_FUENTE[f.tipo];
    const quien = (tipo ? tipo + ' ' : '') + f.nombre;
    if (f.anula) return quien + ': lo evita del todo';
    if (f.nota) return quien + ': ' + f.nota;
    return quien + ' ' + (f.multiplica ? '×' + f.factor.toLocaleString('es-ES', { maximumFractionDigits: 2 }) : cambio(f.factor)) +
      (f.soloTurno ? ' (solo de ' + (f.soloTurno === 'dia' ? 'día' : 'noche') + (f.cuenta ? '' : ', no cuenta') + ')' : '');
  }

  function htmlStatsConductor(estado, t, turno) {
    const filas = Libre.sim.statsConductor(estado, t, turno).map(function (s) {
      const efectiva = s.fuentes.filter(function (f) { return f.cuenta !== false; });
      const sentido = s.factor === 1 || (efectiva.length === 0 && s.clave !== 'sinPagar') ? ''
        : (s.factor > 1) === !!MAS_ES_MEJOR[s.clave] ? ' stat--bien' : ' stat--mal';
      // Su tope del lado bueno («tope ×0,42»): crece con la categoría y el nivel.
      const tope = s.limite && s.fuentes.length ? (s.tope ? 'llega a su tope' : 'su tope') + ' ×' +
        s.limite.toLocaleString('es-ES', { maximumFractionDigits: 2 }) : '';
      const desglose = (s.fuentes.length === 0 ? 'Sin cambios: lo normal' : s.fuentes.map(textoFuente).join(' · ')) +
        (tope ? ' · ' + tope : '');
      return '<div class="stat' + sentido + '"><span class="stat-nombre">' + esc(NOMBRE_STAT[s.clave]) + '</span>' +
        '<strong class="stat-valor">' + esc(textoStat(s)) + '</strong>' +
        '<small class="stat-desglose">' + esc(desglose) + '</small></div>';
    }).join('');
    return '<div class="ficha-stats"><strong>Estadísticas <span>· con rasgos, objetos, nivel y mejoras</span></strong>' +
      '<div class="stats-lista">' + filas + '</div></div>';
  }

  /* En la ficha del conductor: el coche que lleva, su riesgo de avería definitiva y la hoja del coche. */
  function htmlCocheEnFicha(estado, lic) {
    const e = Libre.sim.estadoCoche(estado, lic);
    if (!e) return '';
    return '<button type="button" class="ficha-coche coche--' + e.nivel + '" data-coche="' + lic.id + '">' +
      (e.nivel === 'alquilado'
        ? '<span>Su coche · de alquiler</span><strong>' + textoQuedan(e.quedan) + ' ›</strong></button>'
        : '<span>Su coche · ' + numero(Math.floor(e.km)) + ' km · ' + NIVEL_COCHE[e.nivel] + '</span>' +
          '<strong>Avería definitiva ' + porcentaje(e.probRotura) + ' ›</strong></button>');
  }

  /* «168 / 219 XP» o «Máximo» (al lado de la barra de la ficha). */
  function textoXpCorto(p) {
    return p.hasta === null ? 'Máximo' : Math.floor(p.xp) + ' / ' + p.hasta + ' XP';
  }

  /*
   * Firma de la flota: lo que se ve, sin las carreras en curso ni la
   * experiencia (cambian a menudo; actualizar() mueve las barras), para que
   * los desplegables no se rehagan mientras los usas.
   */
  function firmaFlota(estado) {
    const jornada = Libre.sim.jornadaDe(estado.reloj.minutos);
    return JSON.stringify([Libre.sim.enPausa(estado), estado.licencias.map(function (l) {
      return [l.id, l.numero, l.vehiculo, l.averia && jornada < l.averia.hasta ? l.averia.hasta : 0,
        ['dia', 'noche'].map(function (tn) {
          const t = l.turnos[tn];
          return t ? [t.quien, t.nombre, t.retrato, t.zona, t.baja && jornada < t.baja.hasta ? t.baja.hasta : 0,
            t.paradoHasta > estado.reloj.minutos, t.cualidad, t.cualidad2, t.cualidad3, t.defecto, t.defecto2, t.categoria,
            t.quien === 'conductor' ? Libre.sim.nivelConductor(t) : 0, t.objetos] : null;
        })];
    }), !!estado.jugador.carrera, estado.mejoras, jornada, estado.objetos, estado.bandeja, eligiendoConductor,
    eligiendoConductor ? estado.candidatos : null, ventaParaContratar, fichaConductor, fichaInventario, equipando, comparando,
    eligiendoPlaca, eligiendoPlaca ? Libre.sim.placasEnVenta(estado) : null, panelTu, cocheAbierto, combinarSel,
    montandoSL, estado.empresa,
    estado.licencias.map(function (l) {
      const e = Libre.sim.estadoCoche(estado, l);
      // Abierta, la hoja cambia con cada 1.000 km; cerrada, solo el color del estado.
      if (!e) return null;
      if (e.nivel === 'alquilado') return ['alquilado', e.quedan];
      return cocheAbierto === l.id ? [e.nivel, Math.floor(e.km / 1000)] : e.nivel;
    }),
    (estado.reserva || []).map(function (t) {
      return [t.nombre, t.retrato, t.categoria, t.cualidad, t.cualidad2, t.cualidad3, t.defecto, t.defecto2,
        Libre.sim.nivelConductor(t), t.objetos,
        t.baja && jornada < t.baja.hasta ? t.baja.hasta : 0];
    })]);
  }

  function equipados(estado, id) {
    let n = 0;
    estado.licencias.forEach(function (l) {
      ['dia', 'noche'].forEach(function (tn) {
        const t = l.turnos[tn];
        if (t && (t.objetos || []).indexOf(id) !== -1) n++;
      });
    });
    return n;
  }

  /*
   * Casilla de un objeto en el almacén (maqueta almacen.html, sin el nombre:
   * va en el título y en el panel al tocarla): rareza, cantidad y el dibujo
   * sobre el color de su categoría.
   */
  function htmlCasillaObjeto(estado, o) {
    const abierta = fichaInventario === o.id;
    const cat = Libre.sim.buscarCategoria(o.categoria);
    const hay = estado.objetos[o.id];
    return '<button type="button" class="almacen-objeto' + (abierta ? ' abierta' : '') + '" ' +
      'data-ficha-inventario="' + o.id + '" data-inventario="' + o.id + '" aria-expanded="' + abierta + '"' +
      ' title="' + esc(o.nombre) + '" aria-label="' + esc(o.nombre + ': ' + hay + ', categoría ' + cat.nombre) + '">' +
      '<span class="ficha-objeto-rareza ' + claseRareza(o.categoria) + '">' + esc(o.categoria === 'L' ? 'L' : o.categoria) + '</span>' +
      '<span class="almacen-cantidad">×' + hay + '</span>' +
      '<span class="almacen-icono ' + claseFondo(o.categoria) + '">' + icono(o.id) + '</span></button>';
  }

  /* Panel bajo la cuadrícula del objeto tocado: qué es, cuántos y vender. */
  function htmlPanelInventario(estado) {
    const id = fichaInventario;
    const o = id && Libre.sim.buscarObjeto(id);
    if (!o) return '';
    const hay = (estado.objetos || {})[id] || 0;
    if (!hay) return '';
    const puestos = equipados(estado, id);
    return '<div class="almacen-panel ui-tarjeta">' +
      '<div class="almacen-panel-cabecera"><span class="almacen-icono ' + claseFondo(o.categoria) + '">' + icono(o.id) + '</span>' +
      '<span><strong>' + esc(o.nombre) + '</strong><span class="' + claseRareza(o.categoria) + '">' +
      esc(Libre.sim.buscarCategoria(o.categoria).nombre) + '</span></span></div>' +
      '<p>' + esc(o.descripcion) + '</p>' +
      (o.frase ? '<p class="almacen-frase">' + esc(o.frase) + '</p>' : '') +
      '<p class="almacen-panel-nota">' + hay + ' sin equipar' + (puestos ? ' · ' + puestos + (puestos === 1 ? ' equipado' : ' equipados') : '') +
      '. Se equipa desde la ficha de cada conductor.</p>' + htmlCombinar(estado, o) + botonVenta(o.id) + '</div>';
  }

  /*
   * Combinar (Iván, 18-11-2026; desde el 19-11, eligiendo qué se gasta):
   * los objetos sin equipar de la categoría, cada uno con − y +, y el botón
   * cuando hay justo los que pide la categoría. Empieza con la propuesta de
   * objetosParaCombinar() (el tocado, sus copias y los más repetidos).
   * Los LEGENDARIOS no tienen categoría siguiente: no sale nada.
   */
  function seleccionCombinar(estado, o) {
    const n = Libre.sim.cuantosParaCombinar(o.categoria);
    if (!combinarSel || combinarSel.id !== o.id) {
      const cuenta = {};
      (Libre.sim.objetosParaCombinar(estado, o.id) || []).forEach(function (id) { cuenta[id] = (cuenta[id] || 0) + 1; });
      combinarSel = { id: o.id, cuenta };
    }
    // Lo vendido o equipado entretanto deja de contar; nunca más de n.
    let total = 0;
    Object.keys(combinarSel.cuenta).forEach(function (id) {
      const k = Math.min(combinarSel.cuenta[id], (estado.objetos || {})[id] || 0, n - total);
      if (k > 0) { combinarSel.cuenta[id] = k; total += k; } else delete combinarSel.cuenta[id];
    });
    return { n, total, cuenta: combinarSel.cuenta };
  }

  function htmlCombinar(estado, o) {
    const siguiente = Libre.sim.categoriaSiguiente(o.categoria);
    if (!siguiente) return '';
    const cat = Libre.sim.buscarCategoria(o.categoria).nombre;
    const iguales = Libre.config.objetos.lista.filter(function (x) {
      return x.categoria === o.categoria && (estado.objetos[x.id] || 0) > 0;
    });
    const hay = iguales.reduce(function (s, x) { return s + estado.objetos[x.id]; }, 0);
    const sel = seleccionCombinar(estado, o);
    const n = sel.n;
    const cabeza = '<p><strong>Combinar</strong> ' + n + ' de categoría ' + esc(cat) + ' por uno al azar de categoría ' +
      '<span class="' + claseRareza(siguiente.id) + '">' + esc(siguiente.nombre) + '</span>. ';
    if (hay < n) {
      return '<div class="almacen-combinar">' + cabeza + 'Te ' + (n - hay === 1 ? 'falta 1' : 'faltan ' + (n - hay)) +
        ' de categoría ' + esc(cat) + ' sin equipar.</p></div>';
    }
    const elegidos = [];
    Object.keys(sel.cuenta).forEach(function (id) { for (let i = 0; i < sel.cuenta[id]; i++) elegidos.push(id); });
    const filas = iguales.map(function (x) {
      const k = sel.cuenta[x.id] || 0;
      return '<li class="' + (k ? 'elegido' : '') + '"><span class="almacen-icono pequeno ' + claseFondo(x.categoria) + '">' + icono(x.id) + '</span>' +
        '<span><strong>' + esc(x.nombre) + '</strong><small>' + estado.objetos[x.id] + ' sin equipar</small></span>' +
        '<span class="combinar-paso">' +
        '<button type="button" data-combinar-menos="' + x.id + '" aria-label="Gastar uno menos de ' + esc(x.nombre) + '"' + (k ? '' : ' disabled') + '>−</button>' +
        '<output aria-label="' + esc(x.nombre) + ' que se gastan">' + k + '</output>' +
        '<button type="button" data-combinar-mas="' + x.id + '" aria-label="Gastar uno más de ' + esc(x.nombre) + '"' +
        (k < estado.objetos[x.id] && sel.total < n ? '' : ' disabled') + '>+</button></span></li>';
    }).join('');
    return '<div class="almacen-combinar">' + cabeza + 'Elige cuáles gastas: <strong>' + sel.total + ' de ' + n + '</strong>.</p>' +
      '<ul class="combinar-lista">' + filas + '</ul>' +
      '<button type="button" class="ui-boton ui-boton--principal boton-combinar" data-accion="combinarObjetos" data-args="' +
      o.id + '|' + elegidos.join(',') + '"' + (sel.total === n ? '' : ' disabled') + '>Combinar ' + n + ' → 1 ' +
      esc(siguiente.nombre) + '</button></div>';
  }

  /* Botón de vender un objeto (del almacén, o de la bandeja con su posición). */
  function botonVenta(id, deBandeja) {
    const o = Libre.sim.buscarObjeto(id);
    const precio = Libre.sim.buscarCategoria(o.categoria).venta;
    return boton('Vender · ' + euros(precio), 'venderObjeto', deBandeja === undefined ? [id] : [id, deBandeja], 'ui-boton ui-boton--secundario boton-venta');
  }

  /* Objetos sin equipar del almacén, de mejor a peor categoría. */
  function objetosDelAlmacen(estado) {
    const orden = Libre.config.categorias.map(function (c) { return c.id; });
    return Libre.config.objetos.lista.filter(function (o) { return ((estado.objetos || {})[o.id] || 0) > 0; })
      .sort(function (a, b) { return orden.indexOf(b.categoria) - orden.indexOf(a.categoria); });
  }

  /* Lista para vender: cada objeto del almacén con su botón. */
  function htmlListaVenta(estado) {
    return '<ul class="lista-venta">' + objetosDelAlmacen(estado).map(function (o) {
      return '<li><span class="almacen-icono pequeno ' + claseFondo(o.categoria) + '">' + icono(o.id) + '</span>' +
        '<span><strong>' + esc(o.nombre) + '</strong><small><span class="' + claseRareza(o.categoria) + '">' +
        esc(o.categoria === 'L' ? 'L' : o.categoria) + '</span> ×' + estado.objetos[o.id] + '</small></span>' + botonVenta(o.id) + '</li>';
    }).join('') + '</ul>';
  }

  /*
   * Bandeja: lo encontrado con el almacén lleno. Se vende ahí mismo o se
   * hace sitio vendiendo algo del almacén (entra solo).
   */
  function htmlBandeja(estado) {
    const bandeja = estado.bandeja || [];
    if (bandeja.length === 0) return '';
    return '<div class="bandeja ui-tarjeta"><strong>Almacén lleno · ' + bandeja.length + ' por guardar</strong>' +
      '<ul class="lista-venta">' + bandeja.map(function (x, i) {
        const o = Libre.sim.buscarObjeto(x.id);
        return '<li><span class="almacen-icono pequeno ' + claseFondo(o.categoria) + '">' + icono(o.id) + '</span>' +
          '<span><strong>' + esc(o.nombre) + '</strong><small><span class="' + claseRareza(o.categoria) + '">' +
          esc(o.categoria === 'L' ? 'L' : o.categoria) + '</span> Lo encontró ' + esc(x.conductor) + '</small></span>' +
          botonVenta(o.id, i) + '</li>';
      }).join('') + '</ul>' +
      '<p>O vende algo del almacén y entrará solo:</p>' + htmlListaVenta(estado) + '</div>';
  }

  function htmlInventario(estado) {
    // Solo los objetos que tienes sin equipar, de mejor a peor.
    const objetos = objetosDelAlmacen(estado).map(function (o) { return htmlCasillaObjeto(estado, o); }).join('');
    return htmlBandeja(estado) +
      (objetos
        ? '<div class="almacen-objetos">' + objetos + '</div>'
        : '<p class="ayuda">Tus conductores encuentran objetos al hacer carreras. Se equipan desde su ficha.</p>') +
      htmlPanelInventario(estado);
  }

  /* «Libra los lunes · fin de semana: días impares» (según letra y paridad). */
  function textoLibranza(numero) {
    const c = Libre.config;
    const dia = c.reloj.diasSemana[c.licencias.diaPorLetra[Libre.sim.letraLicencia(numero)]].toLowerCase();
    return 'Libra los ' + dia + ' · fin de semana: los días ' + (numero % 2 === 0 ? 'impares' : 'pares');
  }

  // ¿Está abierta la elección de placa para comprar una licencia?
  let eligiendoPlaca = false;

  /* Comprar licencia: un botón que abre las placas a elegir, cada una con su libranza. */
  function htmlComprarLicencia(estado) {
    const c = Libre.config;
    if (estado.licencias.length >= c.licencias.maximo) return '<p class="ayuda">Ya tienes todas las licencias de Madrid.</p>';
    // Con 3 licencias, antes de la 4.ª hay que montar la SL (idea 1).
    if (Libre.sim.necesitaSociedad(estado)) {
      const coste = c.sociedad.coste;
      return '<button type="button" class="licencia-comprar licencia-sl" data-montar-sl data-precio="' + coste + '">' + ICONO_MAS +
        '<span>Montar una SL</span><small>' + euros(coste) + ' · para la 4.ª licencia</small></button>';
    }
    const precio = Libre.sim.precioLicencia(estado);
    if (!eligiendoPlaca) {
      return '<button type="button" class="licencia-comprar" data-elegir-placa data-precio="' + precio + '">' + ICONO_MAS +
        '<span>Comprar licencia</span><small>' + euros(precio) + '</small></button>';
    }
    return '<div class="placas-venta"><div class="placas-titulo"><strong>Elige la placa</strong>' +
      '<button type="button" data-elegir-placa>Cerrar</button></div>' +
      Libre.sim.placasEnVenta(estado).map(function (numero, i) {
        return '<div class="placa-opcion"><span class="placa">' + esc(Libre.sim.textoLicencia({ numero })) + '</span>' +
          '<small>' + esc(textoLibranza(numero)) + '</small>' +
          boton('Comprar · ' + euros(precio), 'comprarLicencia', ['', i], '', precio) + '</div>';
      }).join('') + '</div>';
  }

  /*
   * Licencia en una línea: su placa (con la libranza en el título) y los dos
   * turnos. Debajo, si toca, los candidatos de un turno libre o tu panel.
   */
  function htmlLicencia(estado, lic) {
    const c = Libre.config;
    const tuAbierto = ['dia', 'noche'].find(function (t) {
      return panelTu === lic.id + '|' + t && lic.turnos[t] && lic.turnos[t].quien === 'jugador';
    });
    const abierta = tuAbierto;
    return '<div class="licencia ui-tarjeta' + (abierta ? ' abierta' : '') + '" data-licencia="' + lic.id + '">' +
      '<div class="licencia-placa"><span class="placa" title="' + esc(textoLibranza(lic.numero)) + '">' +
      esc(Libre.sim.textoLicencia(lic)) + '</span>' +
      (Libre.sim.libra(estado, lic) ? '<span class="hoy-libra">Libra</span>' : '') + '</div>' +
      // Kilometraje del coche (Iván, 19-11-2026); el bucle lo pone al día.
      // Tocarlo abre la hoja del coche (idea 7): estado, riesgo y «Renovar».
      // Pastilla del color de su estado con el coche, los km y «›» (Iván, 19-11-2026).
      (lic.vehiculo ? '<button type="button" class="licencia-km coche--' + Libre.sim.estadoCoche(estado, lic).nivel +
        '" data-coche="' + lic.id + '" aria-label="Ver el coche de la licencia ' + esc(Libre.sim.textoLicencia(lic)) + '">' +
        '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true">' + ICONO_COCHE + '</svg>' +
        (lic.alquiler
          // Corto para que quepa: «Alquiler · 3 días» (la hoja lo explica).
          ? '<span class="licencia-km-texto">Alquiler · ' + Libre.sim.jornadasAlquiler(estado, lic) +
            (Libre.sim.jornadasAlquiler(estado, lic) === 1 ? ' día' : ' días') + '</span>'
          : '<span class="licencia-km-texto"><span data-km-licencia="' + lic.id + '">' + numero(Math.floor(lic.km || 0)) + '</span> km</span>') +
        '<span class="licencia-km-flecha" aria-hidden="true">›</span></button>' : '') +
      // Sin coche pero con gente (tras una avería definitiva o un alquiler
      // devuelto), los turnos se siguen viendo: esperan al coche.
      (lic.vehiculo || lic.turnos.dia || lic.turnos.noche
        ? '<div class="licencia-turnos">' + htmlHuecoTurno(estado, lic, 'dia') + htmlHuecoTurno(estado, lic, 'noche') + '</div>' : '') +
      (lic.vehiculo ? ''
        : '<div class="licencia-sin-coche">' + botonCompra('Coche', Libre.sim.precioCoche(estado), 'comprarVehiculo', [lic.id]) +
          // Alquilar (idea 5, Iván 20-11-2026): un apaño de pocas jornadas.
          botonCompra('Alquilar', Libre.sim.precioAlquiler(estado), 'alquilarCoche', [lic.id]) +
          '<small class="sin-coche-nota">Alquiler de ' + Libre.config.vehiculos.alquiler.jornadas + ' días</small></div>') +
      (tuAbierto ? htmlPanelTu(estado, lic, tuAbierto) : '') + '</div>';
  }

  /*
   * Hoja del coche de una licencia (idea 7, Iván 19-11-2026): km, estado,
   * averías por los km, riesgo de avería definitiva, lo que te dan por él y
   * «Renovar» (con el día cerrado).
   */
  // Trazo de un coche (el mismo que el de la mejora Leasing).
  const ICONO_COCHE = '<path d="M4 15l1.5-5h13L20 15v3H4z"/><path d="M7 10l1.5-3h7l1.5 3M7 18v2M17 18v2"/><path d="M9 14h6"/>';
  const NIVEL_COCHE = { nuevo: 'Nuevo', rodado: 'Rodado', gastado: 'Gastado', limite: 'Al límite', alquilado: 'Alquilado' };
  /* «queda 1 jornada», «quedan 3 jornadas». */
  function textoQuedan(n) {
    return n === 1 ? 'queda 1 jornada' : 'quedan ' + n + ' jornadas';
  }

  /* Hoja del coche de alquiler: cuánto le queda, alargarlo o comprar uno propio. */
  function htmlHojaAlquilado(estado, lic, e, fila) {
    const a = Libre.config.vehiculos.alquiler;
    const precio = Libre.sim.precioCoche(estado);
    const alquiler = Libre.sim.precioAlquiler(estado);
    return '<div class="stats-lista">' +
      fila('Alquiler', textoQuedan(e.quedan), 'Contando la de hoy. Al cerrar la caja de la última, lo devuelves y la licencia se queda sin coche', '') +
      fila('Desgaste', 'No se gasta', 'Sin avería definitiva ni más averías por los kilómetros', '') +
      fila('Kilómetros', numero(Math.floor(e.km)) + ' km', 'Los que lleva contigo', '') +
      '</div>' +
      boton('Alquilar ' + a.jornadas + ' jornadas más · ' + euros(alquiler), 'alquilarCoche', [lic.id],
        'ui-boton ui-boton--secundario ui-boton--ancho', alquiler) +
      boton('Comprar uno propio · ' + euros(precio), 'comprarVehiculo', [lic.id], 'ui-boton ui-boton--principal ui-boton--ancho', precio) +
      '<p class="coche-nota">Si compras uno, devuelves el de alquiler y pierdes lo que quedaba.</p>';
  }
  function htmlHojaCoche(estado) {
    const lic = cocheAbierto && estado.licencias.find(function (l) { return l.id === cocheAbierto; });
    const e = Libre.sim.estadoCoche(estado, lic);
    if (!e) return '';
    const ev = Libre.config.eventos;
    const fila = function (nombre, valor, desglose, clase) {
      return '<div class="stat' + (clase || '') + '"><span class="stat-nombre">' + esc(nombre) + '</span>' +
        '<strong class="stat-valor">' + esc(valor) + '</strong>' + (desglose ? '<small class="stat-desglose">' + esc(desglose) + '</small>' : '') + '</div>';
    };
    const mal = e.nivel === 'gastado' || e.nivel === 'limite' ? ' stat--mal' : '';
    const pausa = Libre.sim.enPausa(estado);
    const cabeza = '<div class="hoja-fondo" data-cerrar-coche></div>' +
      '<div class="hoja hoja-coche" role="dialog" aria-modal="true" aria-labelledby="coche-titulo">' +
      '<span class="hoja-asa" aria-hidden="true"></span>' +
      '<div class="hoja-cabecera"><h3 id="coche-titulo">' + esc(Libre.config.vehiculos.modelos[lic.vehiculo].nombre) +
      (lic.alquiler ? ' de alquiler' : '') + ' · ' + esc(Libre.sim.textoLicencia(lic)) + '</h3>' +
      botonCerrarHoja('data-cerrar-coche', 'Cerrar') + '</div>';
    if (lic.alquiler) return cabeza + htmlHojaAlquilado(estado, lic, e, fila) + '</div>';
    return cabeza +
      '<div class="stats-lista">' +
      fila('Kilómetros', numero(Math.floor(e.km)) + ' km', '', '') +
      fila('Estado', NIVEL_COCHE[e.nivel], e.probRotura > 0 ? 'Cuantos más km, más se rompe' :
        'Sin riesgo de avería definitiva hasta los ' + numero(ev.rotura.kmDesde) + ' km', mal) +
      fila('Avería definitiva', porcentaje(e.probRotura) + ' de los turnos',
        'Va al desguace (' + euros(ev.rotura.chatarra) + ' de chatarra) y tienes que comprar otro coche', e.probRotura > 0 ? ' stat--mal' : '') +
      fila('Averías', porcentaje(ev.averia.probTurno * e.factorAveria) + ' de los turnos',
        'Kilómetros del coche ' + cambio(e.factorAveria) + ' (y lo que cambie cada conductor)', e.factorAveria > 1 ? ' stat--mal' : '') +
      fila('Te dan por él', euros(e.venta), 'Menos cuantos más km tenga; como poco, la chatarra', '') +
      '</div>' +
      boton('Renovar coche · ' + euros(e.precioRenovar), 'renovarCoche', [lic.id], 'ui-boton ui-boton--principal ui-boton--ancho', e.precioRenovar)
        .replace('<button ', '<button data-solo-pausa ') +
      '<p class="coche-nota">' + (pausa ? 'Compras uno nuevo a 0 km y vendes este.'
        : 'Solo puedes renovarlo con el día cerrado: cuando se cierre la caja.') + '</p>' +
      '</div>';
  }

  /*
   * Montar la sociedad limitada (idea 1, Iván 20-11-2026): hoja con qué es,
   * lo que cuesta (ahora y cada jornada) y el nombre de tu flota.
   */
  let montandoSL = false;
  let nombreSL = '';
  function htmlHojaSociedad(estado) {
    if (!montandoSL || !Libre.sim.necesitaSociedad(estado)) return '';
    const s = Libre.config.sociedad;
    let conductores = 0;
    estado.licencias.forEach(function (l) {
      ['dia', 'noche'].forEach(function (t) { if (l.turnos[t] && l.turnos[t].quien === 'conductor') conductores++; });
    });
    return '<div class="hoja-fondo" data-cerrar-sl></div>' +
      '<div class="hoja hoja-sociedad" role="dialog" aria-modal="true" aria-labelledby="sl-titulo">' +
      '<span class="hoja-asa" aria-hidden="true"></span>' +
      '<div class="hoja-cabecera"><h3 id="sl-titulo">Monta tu sociedad limitada</h3>' + botonCerrarHoja('data-cerrar-sl', 'Cerrar') + '</div>' +
      '<p class="sl-explica">Con ' + s.licenciasSinSociedad + ' taxis ya facturas como una empresa: para pasar de ' + s.licenciasSinSociedad +
      ' licencias tienes que dejar de ser autónomo y montar una SL. Cuesta <strong>' + euros(s.coste) + '</strong> ahora y <strong>' +
      euros(s.porConductorDiario) + ' por conductor</strong> en los costes fijos de cada jornada (hoy, ' + conductores +
      (conductores === 1 ? ' conductor: ' : ' conductores: ') + euros(s.porConductorDiario * conductores) + ').</p>' +
      '<label class="sl-etiqueta" for="nombre-sl">Nombre de tu flota</label>' +
      '<input class="sl-nombre" id="nombre-sl" type="text" maxlength="' + s.nombreMax + '" autocomplete="off" placeholder="Taxis Libre SL" value="' +
      esc(nombreSL) + '">' +
      '<button type="button" class="ui-boton ui-boton--principal ui-boton--ancho" data-constituir data-precio="' + s.coste + '">' +
      'Pagar y constituir · ' + euros(s.coste) + '</button></div>';
  }

  /* Pestaña Almacén: objetos sin equipar y la bandeja. */
  const seccionAlmacen = {
    id: 'sec-almacen',
    firma: firmaFlota,
    html: function (estado) {
      return '<div class="pantalla-titulo"><h2 class="ui-titulo ui-titulo--pantalla">Almacén</h2>' +
        // Lo que vale todo lo guardado (venta de almacén y bandeja).
        '<span class="almacen-valor" title="Lo que te darían si lo vendieras todo">Vale ' + euros(Libre.sim.valorAlmacen(estado)) + '</span>' +
        '<span>Objetos ' + Libre.sim.objetosEnAlmacen(estado) + ' de ' + Libre.sim.capacidadAlmacen(estado) + '</span></div>' +
        htmlInventario(estado);
    }
  };

  /* Pestaña Conductores: reserva, licencias con sus turnos y la ficha. */
  const seccionConductores = {
    id: 'sec-conductores',
    firma: firmaFlota,
    html: function (estado) {
      const c = Libre.config;
      if (fichaConductor && !conductorDe(estado, fichaConductor)) fichaConductor = null;
      if (cocheAbierto && !Libre.sim.estadoCoche(estado, estado.licencias.find(function (l) { return l.id === cocheAbierto; }))) cocheAbierto = null;
      const hayAlguno = Libre.sim.todosLosConductores(estado).length > 0;
      const ayuda = !hayAlguno
        ? 'Contrata a tu primer conductor para el otro turno: el taxi trabajará solo también cuando tú no conduces.'
        : Libre.sim.enPausa(estado)
          ? 'Día cerrado: arrastra a un conductor sobre otro, un turno libre o la reserva para reorganizarlos. ' +
            'En el móvil, mantén pulsado su retrato y toca dónde ponerlo (o «Cambiar de sitio» en su ficha).'
          : 'Tus conductores trabajan solos y se quedan el ' + Math.round(Libre.sim.porcentajeConductor(estado) * 100) +
            ' % de lo que recaudan. Toca uno para ver su ficha; al cerrar el día podrás cambiarlos de sitio.';
      const n = estado.licencias.length;
      return '<div class="pantalla-titulo"><h2 class="ui-titulo ui-titulo--pantalla">Conductores</h2>' +
        '<span>' + n + (n === 1 ? ' licencia' : ' licencias') + '</span></div>' +
        '<p class="ayuda">' + ayuda + '</p>' + htmlReserva(estado) +
        '<div class="licencias">' + estado.licencias.map(function (lic) { return htmlLicencia(estado, lic); }).join('') +
        htmlComprarLicencia(estado) + '</div>' +
        htmlFichaConductor(estado) + htmlHojaEquipar(estado) + htmlHojaCandidatos(estado) + htmlHojaComparar(estado) +
        htmlHojaCoche(estado) + htmlHojaSociedad(estado);
    },
    // La experiencia y lo hecho cambian con cada carrera: se mueven aquí.
    actualizar: function (estado) {
      document.querySelectorAll('#sec-conductores [data-km-licencia]').forEach(function (el) {
        const lic = estado.licencias.find(function (l) { return String(l.id) === el.dataset.kmLicencia; });
        const texto = lic ? numero(Math.floor(lic.km || 0)) : '';
        if (el.textContent !== texto) el.textContent = texto;
      });
      document.querySelectorAll('#sec-conductores [data-xp]').forEach(function (barra) {
        const x = conductorDe(estado, barra.dataset.xp);
        if (!x) return;
        const p = nivelDe(x.t);
        barra.firstElementChild.style.width = (p.avance * 100).toFixed(0) + '%';
        barra.setAttribute('aria-valuenow', Math.round(p.avance * 100));
        barra.setAttribute('aria-label', textoExperiencia(p));
      });
      document.querySelectorAll('#sec-conductores [data-energia]').forEach(function (barra) {
        const y = conductorDe(estado, barra.dataset.energia);
        if (!y) return;
        const pct = Libre.sim.energia(estado, y.t) / Libre.config.cansancio.maximo * 100;
        barra.firstElementChild.style.width = pct.toFixed(0) + '%';
        barra.classList.toggle('energia-baja', pct < 25);
        barra.setAttribute('aria-valuenow', Math.round(pct));
        if ($('ficha-energia')) $('ficha-energia').textContent = textoEnergia(estado, y.t);
      });
      const x = conductorDe(estado, fichaConductor);
      if (x && $('ficha-xp')) {
        $('ficha-xp').textContent = textoXpCorto(nivelDe(x.t));
        $('ficha-carreras').textContent = numero(Math.floor(x.t.carreras || 0));
        $('ficha-facturado').textContent = euros(x.t.facturado || 0);
      }
      if (enfocarHoja) {
        // El botón de cerrar de la hoja recién abierta (la de encima).
        const sel = { ficha: '.hoja-ficha', candidatos: '.hoja-candidatos', equipar: '.hoja-equipar', comparar: '.hoja-comparar' }[enfocarHoja];
        enfocarHoja = null;
        const cerrar = document.querySelector(sel + ' .hoja-cerrar');
        if (cerrar) cerrar.focus({ preventScroll: true });
      }
    }
  };

  /*
   * Árbol de mejoras (Iván, 18-11-2026): todo en una pantalla. Un punto
   * principal (el logo) del que salen las cinco ramas en columnas; cada
   * mejora es un círculo con su icono, unido al anterior de su rama (cada
   * rama es una cadena: los requisitos están en la config). Al tocar uno se
   * abre su ficha en una hoja que sube desde abajo.
   * Estados: comprada, disponible, sin dinero y bloqueada.
   */
  let nodoAbierto = null;
  let enfocarMejora = false;

  /* Iconos de trazo (24 × 24) de cada mejora. */
  const ICONOS_MEJORA = {
    callejero: '<path d="M4 5l5-2 6 2 5-2v16l-5 2-6-2-5 2z"/><path d="M9 3v16M15 5v16"/>',
    limpieza: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    publicidad: '<path d="M3 10v4h4l8 4V6l-8 4z"/><path d="M18 9a4 4 0 0 1 0 6M7 14l1.5 5h3L10 15"/>',
    propinas: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.3c-.4-.9-1.4-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2 0 2.8 5 1.5 5 4.3 0 1.2-1.1 2-2.5 2-1.1 0-2.1-.6-2.5-1.5M12 6v1.8M12 16.2V18"/>',
    datafono: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/>',
    clientesFijos: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14a5 5 0 0 1 4.5 5"/>',
    hoteles: '<path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 11V8.5M10 8.5h4M3 20h18"/>',
    emisora: '<circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
    estaciones: '<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 11h12M9 14h.01M15 14h.01M8.5 21l2-4M15.5 21l-2-4"/>',
    aeropuerto: '<path d="M2.5 15.5l8-3.5V5.5a1.5 1.5 0 0 1 3 0V12l8 3.5V18l-8-2v3.5l2 1.5v1l-3.5-1-3.5 1v-1l2-1.5V16l-8 2z"/>',
    paradaOcio: '<path d="M5 4h14l-7 8zM12 12v7M8 20h8M15 7.5l3-3.5"/>',
    colaBarajas: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    app: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    deflectores: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
    conduccionEficiente: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15zM5 19l7-7"/>',
    neumaticos: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21"/>',
    // Neumático con escudo: resiste los pinchazos.
    // La rueda de los neumáticos con un «+»: la versión mejorada (Iván, 20-11-2026).
    neumaticosAltaGama: '<circle cx="10" cy="14" r="7.5"/><circle cx="10" cy="14" r="2.8"/><path d="M10 6.5v4.7M10 16.8v4.7M2.5 14h4.7M12.8 14h4.7"/><path d="M16.5 4.5h5M19 2v5"/>',
    hibridos: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10v4M12 8.5l-2.5 4h3l-2.5 4"/>',
    // Bombona de gas (GLP).
    glp: '<rect x="6" y="7" width="12" height="14" rx="5"/><path d="M9 7V4h6v3M12 2v2M6 13h12"/>',
    mecanico: '<path d="M15 4a4 4 0 0 0-4.5 5.5L4 16l4 4 6.5-6.5A4 4 0 0 0 20 9l-3 1-2-2 1-3z"/>',
    seguridadVial: '<path d="M12 3l9 17H3z"/><path d="M12 10v4M12 17h.01"/>',
    seguroFlota: '<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    esterillas: '<ellipse cx="12" cy="6" rx="6" ry="2.5"/><path d="M6 6v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V6M6 10v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4M6 14v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4"/>',
    jornadaLarga: '<circle cx="11" cy="13" r="8"/><path d="M11 9v4l3 2M18 2v4M16 4h4"/>',
    taquillas: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M12 3v18M7.5 7h2M14.5 7h2M7.5 10h2M14.5 10h2"/>',
    gestionZonas: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    rrhh: '<circle cx="10" cy="8" r="3.5"/><path d="M3 20a7 7 0 0 1 14 0M19.5 8v6M16.5 11h6"/>',
    mampara: '<path d="M7 3.5h4.5a2 2 0 0 1 2 2.2L12.8 13H18a2 2 0 0 1 2 2v3H7.5L5.5 6a2.2 2.2 0 0 1 1.5-2.5z"/><path d="M8 18v3M18 18v3"/>',
    grua: '<path d="M3 17h11V9H8l-3 4H3z"/><path d="M14 13l6-8M20 5v8"/><path d="M20 13a1.5 1.5 0 1 1-1.5 1.5"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="11.5" cy="17.5" r="1.8"/>',
    leasing: '<path d="M4 15l1.5-5h13L20 15v3H4z"/><path d="M7 10l1.5-3h7l1.5 3M7 18v2M17 18v2"/><path d="M9 14h6"/>',
    // Gestoría propia: una carpeta con papeles.
    gestoria: '<path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M8 13h8M8 16h5"/>',
    oficina: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12h18"/>',
    // Tu incógnito: medio volante y las gafas del de incógnito.
    incognitoTu: '<path d="M4 11a8 8 0 0 1 16 0"/><path d="M2.5 11h19M12 11V7"/><circle cx="7.5" cy="16.5" r="3"/><circle cx="16.5" cy="16.5" r="3"/><path d="M10.5 16.5c1-.7 2-.7 3 0"/>',
    // Sombrero y gafas, como el icono de incógnito de Chrome (Iván, 20-11-2026).
    // Cazatalentos: una lupa con una persona dentro.
    cazatalentos: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.2 15.2L21 21"/><circle cx="10.5" cy="8.8" r="2"/><path d="M7 14c.7-1.6 2-2.4 3.5-2.4s2.8.8 3.5 2.4"/>',
    incognito: '<path d="M2 11h20"/><path d="M5.5 11l1.8-6a1 1 0 0 1 1.3-.6L12 5.6l3.4-1.2a1 1 0 0 1 1.3.6l1.8 6"/><circle cx="7.5" cy="16.5" r="3"/><circle cx="16.5" cy="16.5" r="3"/><path d="M10.5 16.5c1-.7 2-.7 3 0"/>'
  };
  function iconoMejora(id) {
    return '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true">' + (ICONOS_MEJORA[id] || ICONOS_MEJORA.limpieza) + '</svg>';
  }

  /* Estado de un nodo: 'comprada', 'bloqueada', 'disponible' o 'sinDinero'. */
  function estadoNodo(estado, m) {
    if (Libre.sim.faltaParaMejora(estado, m)) return 'bloqueada';
    const siguiente = Libre.sim.siguienteNivel(estado, m.id);
    if (!siguiente) return 'comprada';
    return estado.dinero >= siguiente.precio ? 'disponible' : 'sinDinero';
  }

  function nombreMejora(id) {
    const m = Libre.config.mejoras.find(function (x) { return x.id === id; });
    return m ? m.nombre : id;
  }

  /* ¿Hay alguna mejora que se pueda comprar ya? Para la marca del menú. */
  function hayMejoraComprable(estado) {
    return Libre.config.mejoras.some(function (m) { return estadoNodo(estado, m) === 'disponible'; });
  }

  /* «1.800 €» (sin céntimos): cabe debajo de un nodo. */
  function eurosCorto(n) {
    // Con punto también en los miles de 4 cifras («1.200 €», como el resto del juego).
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
  }

  function htmlNiveles(m, nivel) {
    return m.niveles
      ? '<span class="nodo-niveles" aria-label="Nivel ' + nivel + ' de ' + m.niveles.length + '">' +
        m.niveles.map(function (n, k) { return '<i class="' + (k < nivel ? 'hecho' : '') + '"></i>'; }).join('') + '</span>'
      : '';
  }

  /* Qué hace, el nivel que toca y el botón de comprar (o lo que falta). */
  function htmlFicha(estado, m) {
    const siguiente = Libre.sim.siguienteNivel(estado, m.id);
    let texto = esc(m.descripcion);
    let pie = '';
    const falta = Libre.sim.faltaParaMejora(estado, m);
    if (falta) {
      pie = '<p class="nodo-requisito">' + (falta.sociedad ? 'Antes tienes que montar una SL (en Conductores, al comprar la 4.ª licencia).'
        : 'Antes necesitas «' + esc(nombreMejora(falta.mejora)) + '».') + '</p>';
    } else if (!siguiente) {
      pie = '<p class="nodo-completa">Comprada' + (m.niveles ? ' entera: los ' + m.niveles.length + ' niveles' : '') + '.</p>';
    } else {
      if (m.niveles) texto += ' Nivel ' + siguiente.nivel + ': ' + esc(siguiente.descripcion);
      pie = boton('<span>' + (m.niveles ? 'Comprar nivel ' + siguiente.nivel : 'Comprar') + '</span><span>' + euros(siguiente.precio) + '</span>',
        'comprarMejora', [m.id], 'ui-boton ui-boton--principal ui-boton--ancho nodo-comprar', siguiente.precio);
    }
    return '<p class="mejora-texto">' + texto + '</p>' + htmlGanadoMejora(estado, m) + pie;
  }

  /*
   * Lo que te ha hecho ganar o ahorrar una mejora comprada (idea 16, Iván
   * 22-11-2026). Solo en las que se puede contar directamente
   * (Libre.sim.cuentaDeMejora); en las demás no sale nada.
   */
  function htmlGanadoMejora(estado, m) {
    const cuenta = Libre.sim.cuentaDeMejora(m.id);
    if (!cuenta || !Libre.sim.nivelMejora(estado, m.id)) return '';
    const antes = (estado.mejorasAntesDeCuenta || []).indexOf(m.id) !== -1;
    return '<div class="mejora-ganado"><span>' + (cuenta === 'ganado' ? 'Te ha hecho ganar' : 'Te ha ahorrado') + '</span>' +
      '<strong id="mejora-ganado">' + euros(Libre.sim.ganadoMejora(estado, m.id)) + '</strong>' +
      '<small>' + (antes ? 'Desde la actualización 93: de antes no se llevaba la cuenta.' : 'Desde que la compraste.') + '</small></div>';
  }

  const ICONO_HECHO = '<svg class="icono icono-hecho" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const ICONO_CANDADO = '<svg class="icono icono-candado" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  /*
   * Nodo: círculo con el icono de la mejora (y una marca: ✓ comprada,
   * candado bloqueada), debajo las rayitas de sus niveles y el precio de lo
   * siguiente. La línea de arriba sale verde si lo anterior ya está comprado.
   */
  function htmlNodo(estado, m) {
    const nivel = Libre.sim.nivelMejora(estado, m.id);
    const siguiente = Libre.sim.siguienteNivel(estado, m.id);
    const unido = !m.requiere || Libre.sim.nivelMejora(estado, m.requiere) > 0;
    return '<li class="nodo' + (unido ? ' unido' : '') + '" data-mejora="' + m.id + '" data-nodo-estado="' + estadoNodo(estado, m) + '">' +
      '<button type="button" class="nodo-boton" data-nodo="' + m.id + '" aria-label="' + esc(m.nombre) +
      (m.niveles ? ', nivel ' + nivel + ' de ' + m.niveles.length : '') + '">' +
      iconoMejora(m.id) + '<span class="nodo-marca">' + ICONO_HECHO + ICONO_CANDADO + '</span></button>' +
      htmlNiveles(m, nivel) +
      '<span class="nodo-precio">' + (siguiente ? eurosCorto(siguiente.precio) : 'Hecha') + '</span></li>';
  }

  /* Hoja con la ficha de la mejora tocada. */
  function htmlHojaMejora(estado) {
    const m = nodoAbierto && Libre.config.mejoras.find(function (x) { return x.id === nodoAbierto; });
    if (!m) return '';
    const rama = Libre.config.ramasMejoras.find(function (r) { return r.id === m.rama; });
    const nivel = Libre.sim.nivelMejora(estado, m.id);
    return '<div class="hoja-fondo" data-cerrar-mejora></div>' +
      '<div class="hoja hoja-mejora" role="dialog" aria-modal="true" aria-labelledby="mejora-titulo" data-mejora="' + m.id +
      '" data-nodo-estado="' + estadoNodo(estado, m) + '">' +
      '<span class="hoja-asa" aria-hidden="true"></span>' +
      '<div class="mejora-cabecera"><span class="mejora-icono">' + iconoMejora(m.id) + '</span>' +
      '<span class="mejora-quien"><h3 id="mejora-titulo">' + esc(m.nombre) + '</h3><span>' + esc(rama ? rama.nombre : '') +
      (m.niveles ? ' · nivel ' + nivel + ' de ' + m.niveles.length : '') + '</span>' + htmlNiveles(m, nivel) + '</span>' +
      botonCerrarHoja('data-cerrar-mejora', 'Cerrar') + '</div>' + htmlFicha(estado, m) + '</div>';
  }

  const seccionMejoras = {
    id: 'sec-mejoras',
    firma: function (estado) {
      return JSON.stringify([nodoAbierto, estado.mejoras]);
    },
    html: function (estado) {
      const c = Libre.config;
      const columnas = c.ramasMejoras.map(function (r) {
        const nodos = c.mejoras.filter(function (m) { return m.rama === r.id; }).map(function (m) {
          return htmlNodo(estado, m);
        }).join('');
        return '<div class="arbol-rama"><span class="arbol-rama-nombre">' + esc(r.corto || r.nombre) + '</span>' +
          '<ol aria-label="' + esc(r.nombre) + '">' + nodos + '</ol></div>';
      }).join('');
      return '<div class="pantalla-titulo"><h2 class="ui-titulo ui-titulo--pantalla">Mejoras</h2>' +
        '<span>' + Object.keys(estado.mejoras).filter(function (k) { return estado.mejoras[k]; }).length + ' de ' + c.mejoras.length + '</span></div>' +
        '<div class="arbol"><div class="arbol-raiz"><img src="docs/logo/libre-icono.svg" alt="Libre"></div>' +
        '<div class="arbol-ramas">' + columnas + '</div></div>' + htmlHojaMejora(estado);
    },
    actualizar: function (estado) {
      // El dinero cambia cada fotograma: el estado de cada nodo se pinta aquí.
      document.querySelectorAll('#sec-mejoras [data-nodo-estado]').forEach(function (el) {
        const m = Libre.config.mejoras.find(function (x) { return x.id === el.dataset.mejora; });
        if (m) el.dataset.nodoEstado = estadoNodo(estado, m);
      });
      // Lo ganado sube con cada carrera (el combustible): al día sin redibujar.
      const ganado = $('mejora-ganado');
      if (ganado && nodoAbierto) ganado.textContent = euros(Libre.sim.ganadoMejora(estado, nodoAbierto));
      if (enfocarMejora) {
        enfocarMejora = false;
        const cerrar = document.querySelector('.hoja-mejora .hoja-cerrar');
        if (cerrar) cerrar.focus({ preventScroll: true });
      }
    }
  };

  let ajustesAbiertos = false;

  /*
   * Sonido sí o no y volumen (se guardan aparte de la partida, en
   * js/sonidos.js). Sin sonido, el volumen se queda desactivado.
   */
  /*
   * Panel «Actualizaciones» de Ajustes (Iván, 19-11-2026): el historial de
   * js/actualizaciones.js, de la más nueva a la más vieja. Plegado; se abre
   * con su título (un <details>, sin estado propio).
   */
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function htmlActualizaciones() {
    const grupos = (Libre.actualizaciones || []).slice().reverse();
    if (!grupos.length) return '';
    const ultima = grupos[0].cambios[grupos[0].cambios.length - 1];
    const fecha = function (iso) {
      const p = iso.split('-');
      return Number(p[2]) + ' de ' + MESES[Number(p[1]) - 1] + ' de ' + p[0];
    };
    return '<details class="actualizaciones"><summary><strong>Actualizaciones</strong>' +
      '<span>La última, n.º ' + ultima.n + ' · ' + esc(fecha(grupos[0].fecha)) + '</span></summary>' +
      grupos.map(function (g) {
        return '<section><h3>' + esc(fecha(g.fecha)) + ' · ' + esc(g.titulo) + '</h3><ol>' +
          g.cambios.slice().reverse().map(function (c) {
            return '<li value="' + c.n + '">' + esc(c.texto) + '</li>';
          }).join('') + '</ol></section>';
      }).join('') + '</details>';
  }

  function htmlAjustesSonido() {
    if (!Libre.sonidos) return '';
    const a = Libre.sonidos.ajustes();
    return '<label class="ajuste"><input type="checkbox" data-sonido="activo"' + (a.activo ? ' checked' : '') + '> Sonido</label>' +
      '<label class="ajuste ajuste-volumen">Volumen' +
      '<input type="range" min="0" max="100" step="5" value="' + Math.round(a.volumen * 100) + '" data-sonido="volumen"' +
      (a.activo ? '' : ' disabled') + ' aria-label="Volumen"></label>';
  }
  let enfocarAjustes = false;
  // Exportar e importar (Iván, 19-11-2026, tras un fallo al importar): el
  // texto de la caja y la confirmación ('importar' o 'borrar') van en la
  // propia hoja, sin confirm(), que algunos navegadores del móvil bloquean
  // (entonces no pasaba nada).
  let textoPartida = '';
  let nuevoNombreSL = null;   // lo que escribes para renombrar tu SL

  /* Cambiar el nombre de tu SL (solo si la tienes). */
  function htmlAjustesEmpresa(estado) {
    if (!estado.empresa) return '';
    const valor = nuevoNombreSL === null ? estado.empresa.nombre : nuevoNombreSL;
    return '<label class="sl-etiqueta" for="renombrar-sl">Nombre de tu empresa</label>' +
      '<input class="sl-nombre" id="renombrar-sl" type="text" maxlength="' + Libre.config.sociedad.nombreMax +
      '" autocomplete="off" value="' + esc(valor) + '">' +
      '<button type="button" class="ui-boton ui-boton--secundario ui-boton--ancho" data-renombrar-sl>Cambiar el nombre</button>';
  }
  let confirmarPartida = null;

  function htmlAccionesPartida() {
    if (confirmarPartida) {
      const importar = confirmarPartida === 'importar';
      return '<p class="ayuda aviso-partida">' + (importar
        ? '¿Sustituir la partida actual por la que has pegado? La de ahora se pierde.'
        : '¿Borrar la partida y empezar de cero? No se puede deshacer.') + '</p>' +
        '<div class="acciones">' +
        '<button type="button" data-partida="' + (importar ? 'importar-si' : 'borrar-si') + '" class="boton-peligro">' +
        (importar ? 'Sí, importar' : 'Sí, borrar') + '</button>' +
        '<button type="button" data-partida="cancelar">Cancelar</button></div>';
    }
    return '<div class="acciones">' +
      '<button type="button" data-partida="exportar">Exportar</button>' +
      '<button type="button" data-partida="importar">Importar</button>' +
      '<button type="button" data-partida="borrar" class="boton-peligro">Borrar partida</button></div>';
  }

  const seccionPartida = {
    id: 'sec-partida',
    firma: function (estado) {
      return 'ajustes:' + ajustesAbiertos + ':' + confirmarPartida + ':' + (estado.empresa ? estado.empresa.nombre : '') + ':' +
        estado.ajustes.pararAlCierre + ':' +
        (Libre.sonidos ? JSON.stringify(Libre.sonidos.ajustes()) : '');
    },
    html: function (estado) {
      if (!ajustesAbiertos) return '';
      return '<div class="hoja-fondo" data-cerrar-ajustes></div>' +
        '<div class="hoja" role="dialog" aria-modal="true" aria-labelledby="ajustes-titulo">' +
        '<button type="button" class="hoja-cerrar" data-cerrar-ajustes aria-label="Cerrar los ajustes">×</button>' +
        '<h2 id="ajustes-titulo">Ajustes y partida</h2>' +
        '<label class="ajuste"><input type="checkbox" data-cambio="cambiarAjuste" data-args="pararAlCierre"' +
        (estado.ajustes.pararAlCierre ? ' checked' : '') + '> Parar al cierre del día</label>' +
        htmlAjustesSonido() + htmlAjustesEmpresa(estado) +
        '<p class="ayuda">Se guarda sola en este navegador. Para pasarla a otro dispositivo, exporta el texto y pégalo allí en Importar.</p>' +
        // El texto pegado se guarda en textoPartida: redibujar la hoja no lo borra.
        '<textarea id="partida-texto" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="Texto de la partida">' +
        esc(textoPartida) + '</textarea>' + htmlAccionesPartida() + htmlActualizaciones() + '</div>';
    },
    actualizar: function () {
      if (enfocarAjustes) {
        enfocarAjustes = false;
        const cerrar = document.querySelector('#sec-partida .hoja-cerrar');
        if (cerrar) cerrar.focus({ preventScroll: true });
      }
    }
  };

  // Iván, 22-11-2026: las zonas, justo debajo del taxímetro (y del ticket o
  // la caja si están abiertos); antes iban al final y con muchos taxis no se
  // veían a la vez que el taxímetro.
  const secciones = [seccionTaximetro, seccionTicket, seccionCaja, seccionZonas, seccionObjetivo, seccionTaxis,
    seccionConductores, seccionAlmacen, seccionMejoras, seccionEstadisticas, seccionPartida];

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
    destellarFila(licenciaId);
    sonar('cobro');
  }

  function lanzarFlotante(importe, nombre) {
    const ancla = document.querySelector('#sec-taximetro .display') || $('dinero');
    const caja = ancla.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'flotante';
    el.textContent = '+' + euros(importe) + (nombre ? ' ' + nombre : '') +
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
    const el = $('dinero');
    el.textContent = euros(valor);
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
    'sec-estadisticas': 'estadisticas', 'sec-partida': 'siempre'
  };
  // Pestañas de antes del rework: Flota se partió y Partida es ahora una hoja.
  const VISTA_ANTIGUA = { flota: 'conductores', partida: 'calle' };
  const CLAVE_VISTA = 'libre-vista';
  let vistaActual = 'calle';
  try {
    let guardada = raiz.localStorage.getItem(CLAVE_VISTA);
    if (VISTA_ANTIGUA[guardada]) guardada = VISTA_ANTIGUA[guardada];
    if (guardada && guardada !== 'siempre' && Object.values(VISTA_DE).indexOf(guardada) !== -1) vistaActual = guardada;
  } catch (e) { /* sin almacenamiento: se empieza en Calle */ }

  function cambiarVista(vista) {
    soltarCogido();
    vistaActual = vista;
    try { raiz.localStorage.setItem(CLAVE_VISTA, vista); } catch (e) { /* da igual */ }
    aplicarVista();
    raiz.scrollTo(0, 0);
  }

  function aplicarVista() {
    secciones.forEach(function (s) {
      $(s.id).classList.toggle('fuera-de-vista', VISTA_DE[s.id] !== vistaActual && VISTA_DE[s.id] !== 'siempre');
    });
    document.body.dataset.vista = vistaActual;
    document.querySelectorAll('[data-vista]').forEach(function (b) {
      if (b.dataset.vista === vistaActual) b.setAttribute('aria-current', 'page');
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
      mejoras: hayMejoraComprable(estado)
    };
    document.querySelectorAll('#sec-conductores [data-precio]').forEach(function (b) {
      if (!b.disabled && !b.closest('.hoja')) hay.conductores = true;
    });
    Object.keys(hay).forEach(function (vista) {
      const marca = document.querySelector('[data-aviso="' + vista + '"]');
      if (marca) marca.classList.toggle('visible', hay[vista] && vista !== vistaActual);
    });
  }

  let ejecutar = null;

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
    const caja = $('partida-texto');
    if (caja) textoPartida = caja.value;
    if (cual === 'exportar') {
      textoPartida = partida.exportar();
      caja.value = textoPartida;
      copiarTexto(caja);
    } else if (cual === 'importar') {
      if (!Libre.guardado.limpiarTexto(textoPartida)) { mostrarMensaje('Pega primero en la caja el texto de una partida exportada.'); return; }
      confirmarPartida = 'importar';
      redibujar();
    } else if (cual === 'importar-si') {
      confirmarPartida = null;
      // Si falla, la hoja sigue abierta con el texto para revisarlo.
      if (partida.importar(textoPartida)) textoPartida = '';
      else redibujar();
    } else if (cual === 'borrar') {
      confirmarPartida = 'borrar';
      redibujar();
    } else if (cual === 'borrar-si') {
      confirmarPartida = null;
      partida.borrar();
    } else if (cual === 'cancelar') {
      confirmarPartida = null;
      redibujar();
    }
  }

  /* Olvida lo dibujado: hace falta tras importar o borrar la partida. */
  function reiniciar() {
    ultimoCierreVisto = null;
    ticketAviso = null;
    objetivoId = null;
    eligiendoConductor = null;
    equipando = null;
    comparando = null;
    fichaConductor = null;
    fichaInventario = null;
    ajustesAbiertos = false;
    confirmarPartida = null;
    montandoSL = false;
    cogido = null;
    eligiendoPlaca = false;
    panelTu = null;
    flotantes.porLicencia = null;
    flotantes.cola = [];
    modoAnterior = null;
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
  let arrastre = null;
  let ignorarClic = false;
  // Conductor cogido: { origen: 'licencia|turno', nombre, modo } o null.
  // modo 'mover' (solo con el día cerrado) o 'comparar' (siempre: solo mira).
  let cogido = null;

  function coger(origen, modo) {
    modo = modo || 'mover';
    const x = estadoActual && conductorDe(estadoActual, origen);
    if (!x || (modo === 'mover' && !Libre.sim.enPausa(estadoActual))) return;
    cogido = { origen, nombre: x.t.nombre, modo };
    pintarCogido();
  }

  function soltarCogido() {
    if (!cogido) return;
    cogido = null;
    pintarCogido();
  }

  /* Marca al cogido, resalta los destinos y enseña la barra (también tras redibujar). */
  function pintarCogido() {
    document.body.classList.toggle('eligiendo-destino', !!cogido && cogido.modo === 'mover');
    document.body.classList.toggle('eligiendo-comparar', !!cogido && cogido.modo === 'comparar');
    document.querySelectorAll('.cogido').forEach(function (el) { el.classList.remove('cogido'); });
    const barra = $('barra-cogido');
    if (!cogido) { barra.classList.add('oculto'); return; }
    const origen = document.querySelector('[data-ficha-conductor="' + cogido.origen + '"]');
    if (origen) origen.classList.add('cogido');
    barra.querySelector('span').textContent = cogido.modo === 'comparar'
      ? 'Toca a otro conductor para comparar con ' + cogido.nombre
      : 'Toca dónde poner a ' + cogido.nombre;
    barra.classList.remove('oculto');
  }

  function iniciarArrastre(opciones) {
    const main = $('juego');

    function moverA(origen, destino) {
      ejecutar('moverConductor', origen.split('|').concat([destino]));
      opciones.redibujar();
    }

    function marcarDestino(x, y) {
      document.querySelectorAll('.destino-activo').forEach(function (d) { d.classList.remove('destino-activo'); });
      const bajo = document.elementFromPoint(x, y);
      const destino = bajo && bajo.closest('[data-destino]');
      if (destino && destino.dataset.destino !== arrastre.origen) destino.classList.add('destino-activo');
      return destino;
    }

    function activar() {
      if (!arrastre) return;
      arrastre.activo = true;
      clearTimeout(arrastre.temporizador);
      // Con el dedo, un toque de vibración al cogerlo (si el móvil puede).
      if (!arrastre.raton && navigator.vibrate) { try { navigator.vibrate(15); } catch (e) { /* da igual */ } }
      const fantasma = document.createElement('div');
      fantasma.className = 'fantasma-arrastre';
      fantasma.innerHTML = arrastre.fila.querySelector('.retrato').outerHTML;
      document.body.appendChild(fantasma);
      arrastre.fantasma = fantasma;
      document.body.classList.add('arrastrando');
      arrastre.fila.classList.add('arrastrado');
      mover(arrastre.x, arrastre.y);
    }

    function mover(x, y) {
      arrastre.fantasma.style.left = x + 'px';
      arrastre.fantasma.style.top = y + 'px';
      marcarDestino(x, y);
    }

    function terminar() {
      if (!arrastre) return;
      clearTimeout(arrastre.temporizador);
      if (arrastre.fantasma) arrastre.fantasma.remove();
      arrastre.fila.classList.remove('arrastrado');
      document.body.classList.remove('arrastrando');
      document.querySelectorAll('.destino-activo').forEach(function (d) { d.classList.remove('destino-activo'); });
      arrastre = null;
    }

    /* El clic que sigue a soltar no abre la ficha (si no llega, no se queda colgado). */
    function saltarClic() {
      ignorarClic = true;
      setTimeout(function () { ignorarClic = false; }, 0);
    }

    main.addEventListener('pointerdown', function (ev) {
      if (cogido) return;   // con uno cogido, se toca el destino
      const fila = ev.target.closest('[data-arrastrable]');
      if (!fila || ev.button > 0) return;
      arrastre = { fila, origen: fila.dataset.fichaConductor, x: ev.clientX, y: ev.clientY, activo: false, raton: ev.pointerType === 'mouse' };
      if (!arrastre.raton) arrastre.temporizador = setTimeout(activar, MS_PULSACION_LARGA);
    });

    document.addEventListener('pointermove', function (ev) {
      if (!arrastre) return;
      if (!arrastre.activo) {
        const d = Math.hypot(ev.clientX - arrastre.x, ev.clientY - arrastre.y);
        if (arrastre.raton && d > 6) { arrastre.x = ev.clientX; arrastre.y = ev.clientY; activar(); }
        else if (!arrastre.raton && d > 10) terminar();   // desplaza la página
        return;
      }
      ev.preventDefault();
      mover(ev.clientX, ev.clientY);
    });

    // Mientras se arrastra con el dedo, la página no se desplaza.
    document.addEventListener('touchmove', function (ev) {
      if (arrastre && arrastre.activo) ev.preventDefault();
    }, { passive: false });

    document.addEventListener('pointerup', function (ev) {
      if (!arrastre) return;
      if (arrastre.activo) {
        const destino = marcarDestino(ev.clientX, ev.clientY);
        const origen = arrastre.origen;
        const conDedo = !arrastre.raton;
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
      if (!arrastre) return;
      const origen = arrastre.activo && !arrastre.raton ? arrastre.origen : null;
      terminar();
      if (origen) { saltarClic(); coger(origen); }
    });
    main.addEventListener('contextmenu', function (ev) {
      if (arrastre || cogido) ev.preventDefault();
    });
    main.addEventListener('click', function (ev) {
      if (!ignorarClic) return;
      ignorarClic = false;
      ev.stopImmediatePropagation();
      ev.preventDefault();
    }, true);
    // Con uno cogido, el siguiente toque dice dónde va, o con quién se compara
    // (antes que cualquier otro clic).
    main.addEventListener('click', function (ev) {
      if (!cogido) return;
      ev.stopImmediatePropagation();
      ev.preventDefault();
      const origen = cogido.origen;
      const modo = cogido.modo;
      soltarCogido();
      if (modo === 'comparar') {
        const otro = ev.target.closest('[data-ficha-conductor]');
        if (otro && otro.dataset.fichaConductor !== origen) {
          comparando = [origen, otro.dataset.fichaConductor];
          opciones.alComparar();
        }
        return;
      }
      const destino = ev.target.closest('[data-destino]');
      if (destino && destino.dataset.destino !== origen) moverA(origen, destino.dataset.destino);
    }, true);
    $('barra-cogido').addEventListener('click', function (ev) {
      if (ev.target.closest('[data-soltar]')) soltarCogido();
    });
  }

  /* Despedir siempre pide confirmación, con el nombre y el finiquito. */
  function confirmarDespido(args) {
    const hallado = estadoActual && conductorDe(estadoActual, args[0] + '|' + args[1]);
    const x = hallado && hallado.t;
    if (!x) return false;
    return confirm('¿Despedir a ' + x.nombre + '? El finiquito cuesta ' + euros(Libre.sim.costeDespido(x)) +
      ((x.objetos || []).length ? ' y sus objetos vuelven al almacén.' : '.'));
  }

  function iniciar(opciones) {
    ejecutar = opciones.ejecutar;
    const main = $('juego');
    main.innerHTML = secciones.map(function (s) {
      return '<section class="tarjeta" id="' + s.id + '"></section>';
    }).join('');

    document.querySelector('.menu-inferior').addEventListener('click', function (ev) {
      const b = ev.target.closest('[data-vista]');
      if (b) { cambiarVista(b.dataset.vista); opciones.redibujar(); }
    });
    aplicarVista();

    function abrirAjustes(abrir) {
      ajustesAbiertos = abrir;
      confirmarPartida = null;
      enfocarAjustes = abrir;
      opciones.redibujar();
      if (!abrir) $('abrir-ajustes').focus({ preventScroll: true });
    }
    $('abrir-ajustes').addEventListener('click', function () { abrirAjustes(true); });

    main.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-cerrar-ajustes]')) {
        abrirAjustes(false);
        return;
      }
      if (ev.target.closest('[data-cerrar-ticket]')) {
        ticketAviso = null;
        opciones.redibujar();
        return;
      }
      if (ev.target.closest('[data-desglose]')) {
        cajaAbierta = !cajaAbierta;
        opciones.redibujar();
        if (cajaAbierta) $('sec-caja').scrollIntoView({ block: 'nearest' });
        return;
      }
      if (ev.target.closest('[data-zonas-cerradas]')) {
        mostrarMensaje('Zonas cerradas. ' + textoZonasCerradas(estadoActual) + '.');
        return;
      }
      if (ev.target.closest('[data-taxis-mas]')) {
        taxisDesplegados = !taxisDesplegados;
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
        nodoAbierto = nodo.dataset.nodo;
        enfocarMejora = true;
        opciones.redibujar();
        return;
      }
      if (ev.target.closest('[data-cerrar-mejora]')) {
        nodoAbierto = null;
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
          nodoAbierto = m.id;
          enfocarMejora = true;
          cambiarVista('mejoras');
          opciones.redibujar();
        }
        const destino = document.querySelector(objetivo.dataset.objetivo);
        if (destino) {
          // La compra puede estar en otra pestaña: se va a ella primero.
          const vista = VISTA_DE[destino.closest('section').id];
          if (vista !== vistaActual) cambiarVista(vista);
          destino.scrollIntoView({ block: 'center' });
          destellar(destino.closest('.licencia, .nodo') || destino);
        }
        return;
      }
      if (ev.target.closest('[data-cerrar-equipar]')) {
        equipando = null;
        enfocarHoja = 'ficha';
        opciones.redibujar();
        return;
      }
      const masMenos = ev.target.closest('[data-combinar-mas], [data-combinar-menos]');
      if (masMenos) {
        if (masMenos.disabled || !combinarSel) return;
        const id = masMenos.dataset.combinarMas || masMenos.dataset.combinarMenos;
        combinarSel.cuenta[id] = Math.max(0, (combinarSel.cuenta[id] || 0) + (masMenos.dataset.combinarMas ? 1 : -1));
        opciones.redibujar();
        return;
      }
      if (ev.target.closest('[data-renombrar-sl]')) {
        if (nuevoNombreSL === null) return;   // no has cambiado nada
        const r = ejecutar('renombrarSociedad', [nuevoNombreSL]);
        if (r && r.ok) nuevoNombreSL = null;
        return;
      }
      if (ev.target.closest('[data-montar-sl]')) {
        montandoSL = true;
        opciones.redibujar();
        const campo = document.getElementById('nombre-sl');
        if (campo) campo.focus({ preventScroll: true });
        return;
      }
      if (ev.target.closest('[data-cerrar-sl]')) {
        montandoSL = false;
        opciones.redibujar();
        return;
      }
      const constituir = ev.target.closest('[data-constituir]');
      if (constituir) {
        if (constituir.disabled) return;
        const r = ejecutar('montarSociedad', [nombreSL]);
        if (r && r.ok) { montandoSL = false; nombreSL = ''; sonar('nivel'); opciones.redibujar(); }
        return;
      }
      const coche = ev.target.closest('[data-coche]');
      if (coche) {
        fichaConductor = null;
        cocheAbierto = Number(coche.dataset.coche);
        opciones.redibujar();
        return;
      }
      if (ev.target.closest('[data-cerrar-coche]')) {
        const id = cocheAbierto;
        cocheAbierto = null;
        opciones.redibujar();
        const origen = document.querySelector('[data-coche="' + id + '"]');
        if (origen) origen.focus({ preventScroll: true });
        return;
      }
      if (ev.target.closest('[data-cerrar-ficha]')) {
        fichaConductor = null;
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
        const par = comparando;
        comparando = null;
        ejecutar('moverConductor', par[0].split('|').concat([par[1]]));
        opciones.redibujar();
        return;
      }
      const botonComparar = ev.target.closest('[data-comparar]');
      if (botonComparar) {
        fichaConductor = null;
        opciones.redibujar();
        coger(botonComparar.dataset.comparar, 'comparar');
        return;
      }
      const botonCoger = ev.target.closest('[data-coger]');
      if (botonCoger) {
        fichaConductor = null;
        opciones.redibujar();
        coger(botonCoger.dataset.coger);
        return;
      }
      const barraDia = ev.target.closest('[data-dia-estadistica]');
      if (barraDia) {
        diaEstadistica = Number(barraDia.dataset.diaEstadistica);
        opciones.redibujar();
        return;
      }
      const abrirEquipar = ev.target.closest('[data-equipar]');
      if (abrirEquipar) {
        equipando = abrirEquipar.dataset.equipar;
        enfocarHoja = 'equipar';
        opciones.redibujar();
        return;
      }
      const abrirFicha = ev.target.closest('[data-ficha-conductor]');
      if (abrirFicha) {
        fichaConductor = abrirFicha.dataset.fichaConductor;
        enfocarHoja = 'ficha';
        // Desde Estadísticas: la ficha vive en Conductores.
        if (vistaActual !== 'conductores') cambiarVista('conductores');
        opciones.redibujar();
        return;
      }
      const fichaInv = ev.target.closest('[data-ficha-inventario]');
      if (fichaInv) {
        const id = fichaInv.dataset.fichaInventario;
        fichaInventario = fichaInventario === id ? null : id;
        opciones.redibujar();
        return;
      }
      const botonTu = ev.target.closest('[data-panel-tu]');
      if (botonTu) {
        panelTu = panelTu === botonTu.dataset.panelTu ? null : botonTu.dataset.panelTu;
        opciones.redibujar();
        return;
      }
      if (ev.target.closest('[data-elegir-placa]')) {
        eligiendoPlaca = !eligiendoPlaca;
        opciones.redibujar();
        return;
      }
      if (ev.target.closest('[data-venta-contratar]')) {
        ventaParaContratar = !ventaParaContratar;
        opciones.redibujar();
        return;
      }
      const elegir = ev.target.closest('[data-elegir-conductor]');
      if (elegir) {
        eligiendoConductor = elegir.dataset.elegirConductor;
        ventaParaContratar = false;
        enfocarHoja = 'candidatos';
        opciones.redibujar();
        return;
      }
      const el = ev.target.closest('button[data-accion]');
      if (!el || el.disabled) return;
      const args = el.dataset.args ? el.dataset.args.split('|') : [];
      if (el.dataset.accion === 'despedirConductor' && !confirmarDespido(args)) return;
      const resultado = ejecutar(el.dataset.accion, args);
      if (resultado && resultado.ok && el.dataset.accion === 'buscarCliente') sonar('tic');
      if (resultado && resultado.pillado) sonar('averia');
      if (resultado && resultado.ok && el.dataset.accion === 'comprarLicencia') {
        eligiendoPlaca = false;
        opciones.redibujar();
      }
      if (resultado && resultado.ok && (el.dataset.accion === 'contratarConductor' || el.dataset.accion === 'contratarAReserva' ||
          el.dataset.accion === 'conducir')) {
        eligiendoConductor = null;
        ventaParaContratar = false;
        opciones.redibujar();
      }
      if (resultado && resultado.ok && el.dataset.accion === 'combinarObjetos') {
        // Se abre el panel de lo que ha salido.
        fichaInventario = resultado.objeto;
        sonar('objeto');
        opciones.redibujar();
      }
      if (resultado && resultado.ok && el.dataset.accion === 'equiparObjeto') {
        equipando = null;
        enfocarHoja = 'ficha';
        opciones.redibujar();
      }
      if (resultado && resultado.ok) destelloTrasCompra(el.dataset.accion, args);
    });

    // La comparación se abre encima de lo que haya (candidatos) y enfoca su ×.
    function abrirComparar() {
      enfocarHoja = 'comparar';
      opciones.redibujar();
    }
    function cerrarComparar() {
      comparando = null;
      opciones.redibujar();
    }
    iniciarArrastre({ redibujar: opciones.redibujar, alComparar: abrirComparar });

    main.addEventListener('change', function (ev) {
      const el = ev.target.closest('[data-comparar-candidato]');
      if (!el || !el.value) return;
      comparando = ['candidato|' + el.dataset.compararCandidato, el.value];
      abrirComparar();
    });

    // Al cerrar los candidatos, el foco vuelve al hueco que los abrió.
    function cerrarCandidatos() {
      const clave = eligiendoConductor;
      eligiendoConductor = null;
      ventaParaContratar = false;
      opciones.redibujar();
      const origen = document.querySelector('[data-elegir-conductor="' + clave + '"]');
      if (origen) origen.focus({ preventScroll: true });
    }

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && ajustesAbiertos) {
        abrirAjustes(false);
        return;
      }
      if (ev.key === 'Escape' && cogido) {
        soltarCogido();
        return;
      }
      if (ev.key === 'Escape' && montandoSL) {
        montandoSL = false;
        opciones.redibujar();
        return;
      }
      if (ev.key === 'Escape' && cocheAbierto) {
        const id = cocheAbierto;
        cocheAbierto = null;
        opciones.redibujar();
        const origen = document.querySelector('[data-coche="' + id + '"]');
        if (origen) origen.focus({ preventScroll: true });
        return;
      }
      if (ev.key === 'Escape' && comparando) {
        cerrarComparar();
        return;
      }
      // Escape cierra la hoja de encima: el selector de objetos, luego los candidatos o la ficha.
      if (ev.key === 'Escape' && equipando) {
        equipando = null;
        enfocarHoja = 'ficha';
        opciones.redibujar();
        return;
      }
      if (ev.key === 'Escape' && eligiendoConductor) {
        cerrarCandidatos();
        return;
      }
      if (ev.key === 'Escape' && nodoAbierto && vistaActual === 'mejoras') {
        const id = nodoAbierto;
        nodoAbierto = null;
        opciones.redibujar();
        const origen = document.querySelector('[data-nodo="' + id + '"]');
        if (origen) origen.focus({ preventScroll: true });
        return;
      }
      if (ev.key === 'Escape' && fichaConductor) {
        const clave = fichaConductor;
        fichaConductor = null;
        opciones.redibujar();
        const origen = document.querySelector('[data-ficha-conductor="' + clave + '"]');
        if (origen) origen.focus({ preventScroll: true });
      }
    });

    // Sonido y volumen: no son de la partida, van al módulo de sonidos.
    // Lo que se escribe o pega en la caja de la partida se guarda al momento.
    main.addEventListener('input', function (ev) {
      if (ev.target.id === 'partida-texto') textoPartida = ev.target.value;
      if (ev.target.id === 'nombre-sl') nombreSL = ev.target.value;
      if (ev.target.id === 'renombrar-sl') nuevoNombreSL = ev.target.value;
    });

    main.addEventListener('change', function (ev) {
      const el = ev.target.closest('[data-sonido]');
      if (!el || !Libre.sonidos) return;
      if (el.dataset.sonido === 'activo') Libre.sonidos.cambiar({ activo: el.checked });
      else Libre.sonidos.cambiar({ volumen: Number(el.value) / 100 });
      opciones.redibujar();
      sonar('cobro');   // para oír cómo queda
    });

    main.addEventListener('change', function (ev) {
      const el = ev.target.closest('[data-cambio]');
      if (!el) return;
      const valor = el.type === 'checkbox' ? String(el.checked) : el.value;
      ejecutar(el.dataset.cambio, el.dataset.args.split('|').concat([valor]));
    });
  }

  let estadoActual = null;   // el último dibujado (para confirmar acciones)

  /*
   * Calle de fondo de la cabecera (js/ambiente.js): se monta una vez y se
   * pone al día con el estado. La escena dice si es de noche, y la cabecera
   * cambia con ella sus colores (logo, engranaje y placa).
   */
  function dibujarEscena(estado) {
    const escena = $('cabecera-escena');
    if (!escena.firstChild) Libre.ambiente.montar(escena);
    Libre.ambiente.dibujar(escena, estado);
    $('cabecera').classList.toggle('noche', escena.dataset.momento === 'noche');
  }

  /* Qué hoja es (sus clases sin las de estado), para reconocerla al redibujar. */
  function claveHoja(h) {
    return Array.prototype.filter.call(h.classList, function (c) { return c !== 'ya-abierta'; }).sort().join(' ');
  }

  function dibujar(estado) {
    estadoActual = estado;
    const info = Libre.sim.infoReloj(estado.reloj.minutos);
    fijarDinero(estado.dinero);
    // El día sigue la jornada (de 7:00 a 7:00): cambia cuando sale el ticket.
    const jornada = jornadaDe(estado.reloj.minutos);
    // «Día 3 · Mié 07:00 · Tarifa 1»: el día de la semana abreviado, como en la maqueta.
    const reloj = 'Día ' + (jornada.dia + 1) + ' · ' + textoHora(info).replace(/^(\S{3})\S*/, '$1') + ' · ' +
      Libre.config.tarifas[info.tarifa].nombre;
    if ($('reloj').textContent !== reloj) $('reloj').textContent = reloj;
    // Placa con el nombre de tu SL, junto al logo.
    const empresa = estado.empresa ? estado.empresa.nombre : '';
    if ($('empresa').textContent !== empresa) { $('empresa').textContent = empresa; $('empresa').hidden = !empresa; }
    dibujarEscena(estado);

    secciones.forEach(function (s) {
      const el = $(s.id);
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
      if (s.actualizar && !$(s.id).classList.contains('oculto')) s.actualizar(estado);
    });

    // Cogido para moverlo: solo con el día cerrado; si no, se suelta. Tras
    // redibujar, se vuelve a marcar.
    if (cogido && cogido.modo === 'mover' && !Libre.sim.enPausa(estado)) soltarCogido();
    else if (cogido && !document.querySelector('.cogido')) pintarCogido();

    vigilarCobros(estado);
    vigilarCierres(estado);
    soltarAviso();
    actualizarAvisos(estado);
  }

  let temporizadorMensaje = null;
  /* Mensaje breve abajo. Con retrato, sale la cara del conductor al lado. */
  function mostrarMensaje(texto, retrato, categoria) {
    const el = $('mensaje');
    if (retrato !== undefined && retrato !== null) {
      // Con categoría (un objeto encontrado), su etiqueta de color al final.
      el.innerHTML = '<span class="retrato">' + Libre.retratos.svg(retrato) + '</span><span>' + esc(texto) +
        (categoria ? ' ' + etiquetaCategoria(categoria) : '') + '</span>';
      el.classList.add('con-retrato');
    } else {
      el.textContent = texto;
      el.classList.remove('con-retrato');
    }
    el.classList.remove('oculto');
    clearTimeout(temporizadorMensaje);
    temporizadorMensaje = setTimeout(function () { el.classList.add('oculto'); }, 3500);
  }

  Libre.ui = { iniciar, reiniciar, mostrarEventos, dibujar, mostrarMensaje, euros, numero, esc };
})(globalThis);
