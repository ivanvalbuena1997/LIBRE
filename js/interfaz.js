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

  function chipTarifa(tarifaId) {
    return '<span class="chip chip-' + tarifaId + '">' + esc(Libre.config.tarifas[tarifaId].nombre) + '</span>';
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
  const formatoDisplay = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always'
  });

  function htmlDisplay() {
    return '<div class="taximetro-cuerpo">' +
      '<div class="taximetro-izquierda">' +
      '<span class="piloto" id="tx-piloto">LIBRE</span>' +
      '<span class="tx-tarifa" id="tx-tarifa"></span>' +
      '</div>' +
      '<div class="display">' +
      '<span class="display-etiqueta" id="tx-etiqueta"></span>' +
      '<span class="display-cifras"><span class="display-fantasma" id="tx-fantasma" aria-hidden="true"></span>' +
      '<span class="display-valor" id="tx-valor">0,00</span></span>' +
      '<span class="display-euro">€</span>' +
      '</div>' +
      '</div>';
  }

  function pintarDisplay(valor, etiqueta, tarifaId, libre) {
    const texto = formatoDisplay.format(valor);
    $('tx-valor').textContent = texto;
    $('tx-fantasma').textContent = texto.replace(/\d/g, '8');
    // Con cifras largas (miles de euros) se encoge para que no se salga.
    $('tx-valor').parentNode.style.setProperty('--escala', Math.min(1, 7 / texto.length).toFixed(3));
    $('tx-etiqueta').textContent = etiqueta;
    const t = Libre.config.tarifas[tarifaId];
    $('tx-tarifa').innerHTML = '<small>TARIFA</small>' + esc(t.nombre.replace('Tarifa ', ''));
    $('tx-tarifa').className = 'tx-tarifa tx-' + tarifaId;
    const piloto = $('tx-piloto');
    piloto.classList.toggle('encendido', libre);
    piloto.textContent = libre ? 'LIBRE' : 'OCUPADO';
  }

  /*
   * Dos modos, que cambian solos:
   *   conductor  conduces tú y es tu turno (o aún no tienes conductores):
   *              el taxímetro es el botón de buscar cliente.
   *   flota      el resto del tiempo: el display suma lo recaudado hoy por
   *              toda la flota y al tocarlo se abre el desglose de la caja.
   */
  function modoTaximetro(estado) {
    const s = Libre.sim;
    return s.conduce(estado) && (s.jugadorEnTurno(estado) || !s.hayConductores(estado)) ? 'conductor' : 'flota';
  }
  let modoAnterior = null;

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
          'aria-label="Recaudación de hoy de la flota: ver el desglose">' + htmlDisplay() +
          '<span class="taximetro-pie pie-flota"><span id="tx-resumen"></span><small id="tx-miturno"></small></span></button>';
      }
      return '<button type="button" class="taximetro taximetro-boton' + clase + '" data-accion="buscarCliente" ' +
        'aria-label="Taxímetro: buscar cliente">' + htmlDisplay() +
        '<span class="progreso"><span id="carrera-barra"></span></span>' +
        '<span class="taximetro-pie" id="tx-pie"></span></button>';
    },
    actualizar: function (estado) {
      const c = Libre.config;
      const info = Libre.sim.infoReloj(estado.reloj.minutos);

      if (modoTaximetro(estado) === 'flota') {
        pintarDisplay(estado.caja.hoy.ingresos, 'RECAUDACIÓN HOY ›', info.tarifa, false);
        const piloto = $('tx-piloto');
        piloto.textContent = 'FLOTA';
        piloto.classList.add('flota');
        $('tx-resumen').textContent = resumenFlota(taxisDeLaFlota(estado));
        const u = Libre.sim.ubicacionJugador(estado);
        $('tx-miturno').textContent = u ? 'Tu turno: ' + dos(c.turnos[u.turno].horaInicio) + ':00' : '';
        return;
      }

      const carrera = estado.jugador.carrera;
      const enCurso = Libre.sim.importeEnCurso(estado);
      const conPasajero = enCurso !== null;
      // Libre: la etiqueta del display recuerda la última carrera.
      const ultima = estado.jugador.ultimaCarrera;
      pintarDisplay(conPasajero ? enCurso : 0,
        conPasajero ? 'IMPORTE' : ultima ? 'ÚLTIMA ' + euros(ultima.importe) : '',
        conPasajero ? carrera.tarifa : info.tarifa, !conPasajero);

      const boton = document.querySelector('.taximetro-boton');
      const pausa = Libre.sim.enPausa(estado);
      const parado = estado.jugador.paradoHasta > estado.reloj.minutos;
      const enTurno = Libre.sim.jugadorEnTurno(estado) && !parado;
      const miTurno = c.turnos[Libre.sim.ubicacionJugador(estado).turno];
      boton.disabled = !!carrera || pausa || !enTurno;
      $('tx-pie').textContent = pausa ? 'Día cerrado'
        : conPasajero ? 'Con pasajero · ' + numero(carrera.km) + ' km'
        : carrera ? c.zonas[carrera.zona].textoEspera + '…'
        : parado ? 'Parado hasta las ' + horaDe(estado.jugador.paradoHasta)
        : !enTurno ? 'Tu turno empieza a las ' + dos(miTurno.horaInicio) + ':00'
        : 'Toca para buscar cliente';
      // Latido suave mientras el taxi espera a que lo toques.
      $('tx-pie').classList.toggle('latido', !pausa && !carrera && enTurno);

      const barra = $('carrera-barra');
      const p = carrera ? Math.min(1, (estado.reloj.minutos - carrera.inicio) / (carrera.fin - carrera.inicio)) : 0;
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

  const MOTIVO_PARADA = { pinchazo: 'Pinchazo', vomito: 'Limpieza' };
  const TEXTO_SITUACION = { averia: 'Avería', baja: 'De baja', vacio: 'Sin conductor' };

  /*
   * Todos los taxis con coche, de más a menos facturado en la jornada:
   * { licencia, quien, retrato, zona, facturado, enCarrera, icono,
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
      if (lic.averia && jornada < lic.averia.hasta) icono = 'averia';
      else if (!t) icono = 'vacio';
      else if (t.quien === 'conductor' && t.baja && jornada < t.baja.hasta) icono = 'baja';
      else if ((t.quien === 'jugador' ? estado.jugador.paradoHasta : t.paradoHasta) > ahora) icono = 'fin';
      const motivoParada = t ? (t.quien === 'jugador' ? estado.jugador.motivoParada : t.motivoParada) : null;
      return {
        licencia: lic,
        quien: t ? (t.quien === 'jugador' ? 'Tú' : t.nombre) : 'Sin conductor',
        retrato: t && t.quien === 'conductor' ? t.retrato : null,
        zona: t ? t.zona : null,
        facturado: (lic.facturadoJornada || 0) + (enCurso || 0),
        enCarrera: enCurso !== null && !pausa,
        icono,
        situacion: icono ? 'parado' : enCurso !== null ? 'ocupado' : 'libre',
        motivo: icono === 'fin' ? (MOTIVO_PARADA[motivoParada] || 'Parado') : icono ? TEXTO_SITUACION[icono] : null
      };
    }).sort(function (a, b) { return b.facturado - a.facturado; });
  }

  /*
   * Tira de ambiente encima del taxímetro (js/ambiente.js): un módulo aparte
   * que se monta una vez en su hueco y se dibuja con el estado. Para cambiarla
   * por otra vista basta otro módulo con montar() y dibujar().
   */
  const seccionAmbiente = {
    id: 'sec-ambiente',
    firma: function () { return 'fija'; },
    html: function () { return '<div class="ambiente-hueco" id="ambiente-hueco"></div>'; },
    actualizar: function (estado) {
      const hueco = $('ambiente-hueco');
      if (!hueco.firstChild) Libre.ambiente.montar(hueco);
      Libre.ambiente.dibujar(hueco, estado);
    }
  };

  /*
   * Tus taxis hoy: una fila por taxi, de más a menos facturado en la jornada.
   * Las filas se crean una vez (firma: qué taxis hay y si la lista está
   * desplegada) y en cada fotograma solo se rellenan y se recolocan; cuando
   * un taxi adelanta a otro se deslizan a su sitio (técnica FLIP: se mide,
   * se mueve en el DOM y se anima desde la posición vieja). Al cobrar, la
   * fila destella. Tocar una fila lleva a ese taxi en Flota.
   */
  const MAX_FILAS_TAXIS = 6;
  let taxisDesplegados = false;
  let filasRecienCreadas = false;   // la primera colocación no se anima

  function htmlRetratoFila(t) {
    if (t.retrato !== null && t.retrato !== undefined) {
      return '<span class="retrato' + (t.icono === 'baja' ? ' atenuado' : '') + '">' + Libre.retratos.svg(t.retrato) + '</span>';
    }
    // Tú, o un turno sin conductor.
    return '<span class="retrato retrato-texto' + (t.quien === 'Tú' ? ' tu' : '') + '">' + (t.quien === 'Tú' ? 'TÚ' : '') + '</span>';
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
          '<span class="taxi-quien"><strong></strong><small></small></span>' +
          '<span class="taxi-situacion"></span>' +
          '<span class="taxi-importe"></span>' +
          '<span class="taxi-barra"><span></span></span>' +
          '</button></li>';
      }).join('');
      const resto = ids.length - MAX_FILAS_TAXIS;
      filasRecienCreadas = true;
      return '<div class="taxis-cabecera"><h2>Tus taxis hoy</h2>' +
        '<button type="button" class="taxis-total" data-desglose aria-label="Ver el desglose de la caja de hoy"><span id="taxis-total"></span> ›</button></div>' +
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
        const claveRetrato = t.quien + '|' + t.retrato + '|' + (t.icono === 'baja');
        if (li.dataset.retrato !== claveRetrato) {
          li.querySelector('.taxi-retrato').innerHTML = htmlRetratoFila(t);
          li.dataset.retrato = claveRetrato;
        }
        li.querySelector('.taxi-quien strong').textContent = t.quien;
        const zona = t.zona && Libre.config.zonas[t.zona];
        li.querySelector('.taxi-quien small').textContent = zona ? zona.nombre : Libre.sim.textoLicencia(t.licencia);
        const sit = li.querySelector('.taxi-situacion');
        sit.textContent = t.situacion === 'ocupado' ? 'Ocupado' : t.situacion === 'libre' ? 'Libre' : t.motivo;
        sit.className = 'taxi-situacion ' + t.situacion;
        li.querySelector('.taxi-importe').textContent = euros(t.facturado);
        li.querySelector('.taxi-barra > span').style.width = (Math.max(0, t.facturado) / maximo * 100).toFixed(1) + '%';
        li.classList.toggle('fuera', !taxisDesplegados && i >= MAX_FILAS_TAXIS);
        li.querySelector('button').setAttribute('aria-label',
          t.quien + ', ' + sit.textContent + ', ' + euros(t.facturado) + ' hoy. Ver en Flota');
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
   * Objetivo: la compra más barata que aún no puedes pagar. Se queda fija
   * hasta que la compras (o deja de existir); así, cuando llega el dinero,
   * la barra se pone verde en vez de saltar a otra compra.
   */
  let objetivoId = null;

  /* Todo lo que se puede comprar ahora: { id, nombre, precio, selector }. */
  function comprasPosibles(estado) {
    const c = Libre.config;
    const lista = [];
    estado.licencias.forEach(function (lic) {
      if (!lic.vehiculo) {
        lista.push({
          id: 'coche-' + lic.id, nombre: 'Coche para la licencia ' + Libre.sim.textoLicencia(lic),
          precio: c.vehiculos.modelos[c.vehiculos.modeloInicial].precio,
          selector: '[data-licencia="' + lic.id + '"]'
        });
        return;
      }
      ['dia', 'noche'].forEach(function (turno) {
        if (lic.turnos[turno]) return;
        lista.push({
          id: 'conductor-' + lic.id + '-' + turno,
          nombre: Libre.sim.hayConductores(estado)
            ? 'Conductor de ' + c.turnos[turno].nombre.toLowerCase() + ' (licencia ' + Libre.sim.textoLicencia(lic) + ')'
            : 'Tu primer conductor',
          precio: c.conductores.costeContratacion,
          selector: '[data-accion="contratarConductor"][data-args="' + lic.id + '|' + turno + '"]'
        });
      });
    });
    c.mejoras.forEach(function (m) {
      const siguiente = Libre.sim.siguienteNivel(estado, m.id);
      if (!siguiente || (m.requiere && !Libre.sim.nivelMejora(estado, m.requiere))) return;
      lista.push({
        id: 'mejora-' + m.id + '-' + siguiente.nivel,
        nombre: m.nombre + (m.niveles ? ' ' + siguiente.nivel : ''),
        precio: siguiente.precio, selector: '[data-mejora="' + m.id + '"]', mejora: m.id
      });
    });
    if (estado.licencias.length < c.licencias.maximo) {
      lista.push({
        id: 'licencia-' + (estado.licencias.length + 1), nombre: 'Nueva licencia',
        precio: Libre.sim.precioLicencia(estado), selector: '[data-accion="comprarLicencia"]'
      });
    }
    return lista;
  }

  function objetivoActual(estado) {
    const lista = comprasPosibles(estado);
    if (lista.length === 0) return null;
    let objetivo = lista.find(function (x) { return x.id === objetivoId; });
    if (!objetivo) {
      // sort es estable: a igual precio gana el primero de la lista.
      const porPrecio = lista.slice().sort(function (a, b) { return a.precio - b.precio; });
      objetivo = porPrecio.find(function (x) { return x.precio > estado.dinero; }) || porPrecio[0];
      objetivoId = objetivo.id;
    }
    return objetivo;
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
      return '<button type="button" class="objetivo' + (listo ? ' listo' : '') + '" data-objetivo="' + esc(o.selector) + '"' +
        (o.mejora ? ' data-objetivo-mejora="' + o.mejora + '"' : '') + '>' +
        '<span class="objetivo-texto"><span>Siguiente: <strong>' + esc(o.nombre) + '</strong></span>' +
        '<span id="objetivo-falta"></span></span>' +
        '<span class="objetivo-barra"><span id="objetivo-relleno"></span></span></button>';
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

  function lineasTicket(t) {
    const neto = Libre.sim.netoCaja(t);
    return [
      { texto: 'Carreras', valor: String(Math.floor(t.carreras)) },
      { texto: 'Kilómetros', valor: numero(t.km || 0) + ' km' },
      { texto: 'Recaudación', valor: euros(t.ingresos) },
      { texto: 'Combustible', valor: '−' + euros(t.combustible) },
      { texto: 'Conductores', valor: '−' + euros(t.conductores) },
      { texto: 'Costes fijos', valor: '−' + euros(t.fijos) },
      { texto: 'Neto', valor: euros(neto), total: true }
    ];
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
        return '<div class="ticket-linea" style="--i:' + siguiente() + '"><span>' + esc(nombre) + '</span><span>' + valor + '</span></div>';
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
      const u = Libre.sim.ubicacionJugador(estado);
      // Tu licencia si conduces; si solo gestionas (Oficina), la primera de la flota.
      const licencia = (u && estado.licencias.find(function (l) { return l.id === u.licenciaId; })) || estado.licencias[0];
      const lineas = lineasTicket(t.datos);
      let i = 0;
      const linea = function (l) {
        return '<div class="ticket-linea' + (l.total ? ' ticket-total' : '') + '" style="--i:' + (i++) + '">' +
          '<span>' + esc(l.texto) + '</span><span>' + l.valor + '</span></div>';
      };
      return '<div class="ticket-ranura"><div class="ticket" role="group" aria-label="Ticket de cierre de caja">' +
        '<div class="ticket-cabecera">' +
        '<div class="ticket-linea ticket-nombre" style="--i:' + (i++) + '">Libre</div>' +
        '<div class="ticket-linea" style="--i:' + (i++) + '">Taxi · licencia ' + esc(Libre.sim.textoLicencia(licencia)) + '</div>' +
        '<div class="ticket-linea" style="--i:' + (i++) + '">' + esc(fechaTicket(t.datos)) + '</div>' +
        '</div>' +
        '<div class="ticket-separador"></div>' +
        lineas.filter(function (l) { return !l.total; }).map(linea).join('') +
        '<div class="ticket-separador doble"></div>' +
        lineas.filter(function (l) { return l.total; }).map(linea).join('') +
        htmlIncidencias(t.datos, function () { return i++; }) +
        '</div></div>' +
        '<div class="ticket-pie" style="--i:' + (i++) + '">' +
        (t.pausa
          ? boton('Arrancar día siguiente', 'arrancarDia', [], 'boton-principal')
          : '<button type="button" class="boton-principal" data-cerrar-ticket>Vale</button>') +
        '</div>';
    }
  };

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
  const colaAvisos = [];
  let ultimoAviso = 0;
  function mostrarEventos(eventos) {
    eventos.forEach(function (ev) {
      if (ev.tipo === 'propina') { flotantes.etiqueta = 'propina'; return; }
      if (ev.tipo === 'esterillas' || ev.tipo === 'bolsa') return;
      if (colaAvisos.length < 3) colaAvisos.push(ev);
    });
    soltarAviso();
  }
  function soltarAviso() {
    if (colaAvisos.length === 0 || Date.now() - ultimoAviso < MS_ENTRE_AVISOS) return;
    ultimoAviso = Date.now();
    const ev = colaAvisos.shift();
    mostrarMensaje(ev.texto, ev.retrato);
  }

  function mostrarResumenFuera(r, estado) {
    if (r.cierres.length > 0) {
      if (!estado.cierrePendiente) ticketAviso = Libre.sim.sumarCierres(r.cierres);
    } else if (r.carreras >= 1) {
      mostrarMensaje('Mientras estabas fuera: ' + euros(r.ingresos) + ' en ' + Math.floor(r.carreras) + ' carreras.');
    }
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
      return '<div class="caja-desglose"><div class="caja-titulo"><strong>Caja de hoy</strong>' +
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
   * Zonas: las abiertas, una fila de botones compactos con icono, nombre,
   * dato y medidor de demanda (viajes/h ahora respecto al máximo de la semana
   * en esa zona); sin demanda, atenuada y con la hora a la que abre. Mientras
   * conduces a mano, tocar una elige la zona. Las cerradas, en una sola línea
   * debajo con la mejora que las abre.
   */
  const ICONOS_ZONA = {
    centro: '<path d="M3 21V10l5-3v14M8 21V4h8v17M16 21v-8h5v8M2 21h20M11 8h2M11 12h2M11 16h2"/>',
    ocio: '<path d="M18 2.5a4.5 4.5 0 1 0 3.5 7.3 3.8 3.8 0 0 1-3.5-7.3z"/>' +
      '<path d="M3 10h8l-4 5zM7 15v5M4.5 20h5"/>',
    aeropuerto: '<path class="relleno" d="M12 2.5l1.3 6.6 8.2 4v1.8l-8.2-2.3-.5 6.2 2.8 1.9v1.1L12 21l-3.6.8v-1.1l2.8-1.9-.5-6.2-8.2 2.3v-1.8l8.2-4z"/>',
    estaciones: '<rect x="5" y="3" width="14" height="13" rx="3"/><path d="M5 10h14M8 16l-2 5M16 16l2 5M7 19h10"/>' +
      '<circle class="relleno" cx="9" cy="13" r="1"/><circle class="relleno" cx="15" cy="13" r="1"/>'
  };

  function iconoZona(id) {
    return '<svg class="zona-icono" viewBox="0 0 24 24" aria-hidden="true">' + (ICONOS_ZONA[id] || ICONOS_ZONA.centro) + '</svg>';
  }

  // Máximo de demanda de cada zona en la semana (depende de las mejoras).
  let cacheMaximos = { clave: null, valores: {} };
  function demandaMaxima(estado, zonaId) {
    const clave = JSON.stringify(estado.mejoras);
    if (cacheMaximos.clave !== clave) cacheMaximos = { clave, valores: {} };
    if (cacheMaximos.valores[zonaId] === undefined) {
      let max = 0;
      for (let h = 0; h < 7 * 24; h++) {
        max = Math.max(max, Libre.sim.demandaZona(estado, zonaId, Libre.sim.infoReloj(h * 60)));
      }
      cacheMaximos.valores[zonaId] = max;
    }
    return cacheMaximos.valores[zonaId];
  }

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
      const lineaCerradas = cerradas.length === 0 ? '' :
        '<p class="zonas-cerradas">Cerradas: ' + cerradas.map(function (id) {
          const zona = c.zonas[id];
          const mejora = c.mejoras.find(function (m) { return m.id === zona.requiere; });
          return '<span title="' + esc(zona.descripcion) + '">' + esc(zona.nombre) +
            ' <small>(' + esc(mejora ? mejora.nombre : zona.requiere) + ')</small></span>';
        }).join(' · ') + '</p>';
      return '<div class="zonas-fila" role="group" aria-label="Zonas">' + ids.filter(function (id) {
        return cerradas.indexOf(id) === -1;
      }).map(function (id) {
        const zona = c.zonas[id];
        const cuerpo = iconoZona(id) +
          '<span class="zona-nombre">' + esc(zona.nombre) + '</span>' +
          '<span class="zona-dato" id="zona-dato-' + id + '"></span>' +
          '<span class="zona-medidor"><span id="zona-medidor-' + id + '"></span></span>';
        if (aMano) {
          return '<button type="button" class="zona-tarjeta' + (id === u.datos.zona ? ' activa' : '') + '" id="zona-' + id + '" ' +
            'data-accion="elegirZona" data-args="' + u.licenciaId + '|' + u.turno + '|' + id + '" title="' + esc(zona.descripcion) + '">' +
            cuerpo + '</button>';
        }
        return '<div class="zona-tarjeta" id="zona-' + id + '" title="' + esc(zona.descripcion) + '">' + cuerpo + '</div>';
      }).join('') + '</div>' + lineaCerradas;
    },
    actualizar: function (estado) {
      const info = Libre.sim.infoReloj(estado.reloj.minutos);
      const grupos = Libre.sim.cochesPorZona(estado, info);
      const umbral = Libre.config.economia.demandaMinimaManual;
      const pausa = Libre.sim.enPausa(estado);
      document.querySelectorAll('button.zona-tarjeta').forEach(function (b) { b.disabled = pausa; });
      Libre.sim.zonasDisponibles(estado).forEach(function (id) {
        const coches = grupos[id] ? grupos[id].length : 0;
        const r = Libre.sim.rendimientoZona(estado, id, coches, info);
        const vacia = r.demanda < umbral;
        $('zona-' + id).classList.toggle('vacia', vacia);
        // Texto corto para que quepa en media pantalla de móvil.
        let texto;
        if (vacia) texto = textoApertura(estado, id);
        else if (coches > 0) texto = Math.round(r.demanda) + '/h · ' + coches + (coches === 1 ? ' coche' : ' coches');
        else texto = Math.round(r.demanda) + ' viajes/h';
        $('zona-dato-' + id).textContent = texto;
        const max = demandaMaxima(estado, id);
        $('zona-medidor-' + id).style.width = (max > 0 ? Math.min(1, r.demanda / max) * 100 : 0).toFixed(0) + '%';
      });
    }
  };

  /*
   * Rasgos como etiquetas: la cualidad con «+» y el defecto con «−» (no se
   * distinguen solo por el color). El título explica qué hacen.
   */
  function htmlRasgos(cualidad, defecto) {
    const q = Libre.sim.buscarRasgo(cualidad), d = Libre.sim.buscarRasgo(defecto);
    return (q ? '<span class="rasgo cualidad" title="' + esc(q.descripcion) + '">+ ' + esc(q.nombre) + '</span>' : '') +
      (d ? '<span class="rasgo defecto" title="' + esc(d.descripcion) + '">− ' + esc(d.nombre) + '</span>' : '');
  }

  /* Insignia de nivel con la barra de experiencia hasta el siguiente. */
  function htmlNivel(t) {
    const p = Libre.sim.progresoConductor(t);
    const texto = p.hasta === null ? 'nivel máximo' : Math.floor(p.xp) + ' de ' + p.hasta + ' de experiencia';
    return '<span class="nivel" title="Nivel ' + p.nivel + ': ' + texto + '">' +
      '<span class="nivel-insignia">' + p.nivel + '</span>' +
      '<span class="nivel-barra" role="progressbar" aria-label="Experiencia: ' + texto + '" aria-valuemin="0" aria-valuemax="100" ' +
      'aria-valuenow="' + Math.round(p.avance * 100) + '"><span style="width:' + (p.avance * 100).toFixed(0) + '%"></span></span></span>';
  }

  // Turno en el que estás eligiendo conductor ('licencia|turno') o null.
  let eligiendoConductor = null;

  /* Los candidatos para un turno vacío: retrato, nombre, rasgos y contratar. */
  function htmlCandidatos(estado, lic, turno) {
    const precio = Libre.config.conductores.costeContratacion;
    return '<div class="candidatos">' + Libre.sim.candidatos(estado).map(function (x, i) {
      const q = Libre.sim.buscarRasgo(x.cualidad), d = Libre.sim.buscarRasgo(x.defecto);
      return '<div class="candidato"><span class="retrato">' + Libre.retratos.svg(x.retrato) + '</span>' +
        '<div class="candidato-datos"><strong>' + esc(x.nombre) + '</strong>' +
        '<span class="rasgos">' + htmlRasgos(x.cualidad, x.defecto) + '</span>' +
        '<small>' + esc(q.descripcion) + ' ' + esc(d.descripcion) + '</small></div>' +
        boton('Contratar · ' + euros(precio), 'contratarConductor', [lic.id, turno, i], '', precio) + '</div>';
    }).join('') + '</div>';
  }

  function htmlTurno(estado, lic, turno) {
    const c = Libre.config;
    const t = lic.turnos[turno];
    let cuerpo;
    if (!lic.vehiculo) {
      cuerpo = '<span class="ayuda">Necesita coche</span>';
    } else if (!t) {
      const clave = lic.id + '|' + turno;
      const abierto = eligiendoConductor === clave;
      cuerpo = '<button type="button" data-elegir-conductor="' + clave + '" aria-expanded="' + abierto + '">' +
        (abierto ? 'Cerrar candidatos' : 'Contratar conductor · ' + euros(c.conductores.costeContratacion)) + '</button>' +
        (Libre.sim.conduce(estado) ? '' : boton('Conducir yo', 'conducir', [lic.id, turno])) +
        (abierto ? htmlCandidatos(estado, lic, turno) : '');
    } else if (t.quien === 'jugador') {
      const otro = turno === 'dia' ? 'noche' : 'dia';
      cuerpo = '<span class="quien">Tú</span>' + selectorZona(estado, lic.id, turno, t.zona) +
        (lic.turnos[otro] ? '' : boton('Pasar a ' + c.turnos[otro].nombre.toLowerCase(), 'cambiarTurnoJugador', [])) +
        // Dejar el volante es una mejora (Oficina de gestión).
        (Libre.sim.modificadores(estado).dejarVolante ? boton('Dejar de conducir', 'dejarDeConducir', []) : '');
    } else {
      const jornada = Libre.sim.jornadaDe(estado.reloj.minutos);
      const deBaja = t.baja && jornada < t.baja.hasta;
      cuerpo = '<span class="retrato' + (deBaja ? ' atenuado' : '') + '">' + Libre.retratos.svg(t.retrato) + '</span>' +
        '<span class="quien">' + esc(t.nombre) + '</span>' + htmlNivel(t) +
        '<span class="rasgos">' + htmlRasgos(t.cualidad, t.defecto) + '</span>' +
        // La zona la eligen ellos (al azar, o la mejor con el Curso gestión de zonas).
        '<span class="turno-zona">Trabaja en ' + esc(Libre.config.zonas[t.zona] ? Libre.config.zonas[t.zona].nombre : t.zona) + '</span>' +
        boton('Despedir · ' + euros(Libre.sim.costeDespido(t)), 'despedirConductor', [lic.id, turno], 'boton-peligro',
          Libre.sim.costeDespido(t)) +
        htmlHuecos(estado, lic, turno, t) +
        estadoTurno(estado, lic, t);
    }
    return '<div class="turno"><div class="turno-nombre">' + esc(c.turnos[turno].nombre) + '<br>' + horario(turno) + '</div>' +
      '<div class="turno-cuerpo">' + cuerpo + '</div></div>';
  }

  /* Baja, avería o jornada terminada, en una línea bajo el conductor. */
  function estadoTurno(estado, lic, t) {
    const jornada = Libre.sim.jornadaDe(estado.reloj.minutos);
    let texto = '';
    if (lic.averia && jornada < lic.averia.hasta) texto = 'Coche en el taller hasta el día ' + (lic.averia.hasta + 1);
    else if (t.baja && jornada < t.baja.hasta) {
      const faltan = t.baja.hasta - jornada;
      texto = 'De baja: ' + (faltan === 1 ? 'falta 1 día' : 'faltan ' + faltan + ' días');
    }
    else if (t.paradoHasta > estado.reloj.minutos) texto = 'Parado hasta las ' + horaDe(t.paradoHasta);
    return texto ? '<span class="turno-estado">' + texto + '</span>' : '';
  }

  /*
   * Firma de la flota: lo que se ve, sin las carreras en curso (cambian en
   * cada fotograma y harían que los desplegables no se pudieran usar).
   */
  function firmaFlota(estado) {
    const jornada = Libre.sim.jornadaDe(estado.reloj.minutos);
    return JSON.stringify([estado.licencias.map(function (l) {
      return [l.id, l.numero, l.vehiculo, l.averia && jornada < l.averia.hasta ? l.averia.hasta : 0,
        ['dia', 'noche'].map(function (tn) {
          const t = l.turnos[tn];
          return t ? [t.quien, t.nombre, t.retrato, t.zona, t.baja && jornada < t.baja.hasta ? t.baja.hasta : 0,
            t.paradoHasta > estado.reloj.minutos, t.cualidad, t.defecto,
            t.quien === 'conductor' ? Math.floor(t.xp || 0) : 0, t.objetos] : null;
        })];
    }), !!estado.jugador.carrera, estado.mejoras, jornada, estado.inventario, estado.objetos, eligiendoConductor,
    eligiendoConductor ? estado.candidatos : null]);
  }

  /*
   * Inventario de consumibles (ruedas, bolsas): común a toda la flota. Cada
   * uno se desbloquea con su mejora; se repone con +1 / +10 hasta el máximo.
   */
  /* Objetos para conductores en el almacén: cuántos hay sin equipar y comprar. */
  function htmlObjetosAlmacen(estado) {
    const c = Libre.config.objetos;
    return c.lista.map(function (o) {
      const hay = (estado.objetos || {})[o.id] || 0;
      return '<div class="inventario-fila" data-inventario="' + o.id + '" title="' + esc(o.descripcion) + '">' +
        '<span class="inventario-nombre">' + esc(o.nombre) + '</span>' +
        '<span class="inventario-cuenta">' + hay + '</span>' +
        '<span class="inventario-botones">' + (hay < c.maximo
          ? boton('+1 · ' + euros(o.precio), 'comprarObjeto', [o.id, 1], '', o.precio)
          : '<span class="ayuda">Almacén lleno</span>') + '</span></div>';
    }).join('');
  }

  /*
   * Huecos de objeto de un conductor: lo que lleva (con × para devolverlo al
   * almacén) y, en los libres, un desplegable con lo que hay en el almacén.
   */
  function htmlHuecos(estado, lic, turno, t) {
    const huecos = Libre.sim.huecosConductor(t);
    const llevados = t.objetos || [];
    let html = llevados.map(function (id) {
      const o = Libre.sim.buscarObjeto(id);
      return '<span class="objeto-llevado" title="' + esc(o.descripcion) + '">' + esc(o.nombre) +
        boton('×', 'quitarObjeto', [lic.id, turno, id], 'quitar-objeto') + '</span>';
    }).join('');
    const disponibles = Libre.config.objetos.lista.filter(function (o) {
      return ((estado.objetos || {})[o.id] || 0) > 0 && llevados.indexOf(o.id) === -1;
    });
    for (let i = llevados.length; i < huecos; i++) {
      html += disponibles.length
        ? '<select data-cambio="equiparObjeto" data-args="' + lic.id + '|' + turno + '" aria-label="Equipar objeto">' +
          '<option value="" selected disabled>Hueco libre: equipar…</option>' +
          disponibles.map(function (o) { return '<option value="' + o.id + '">' + esc(o.nombre) + '</option>'; }).join('') +
          '</select>'
        : '<span class="hueco-libre">Hueco libre</span>';
    }
    return '<span class="huecos">' + html + '</span>';
  }

  function htmlInventario(estado) {
    const items = Libre.config.inventario;
    const abiertos = Object.keys(items).filter(function (k) { return Libre.sim.inventarioAbierto(estado, k); });
    return '<div class="inventario"><div class="licencia-titulo"><span>Inventario</span></div>' +
      abiertos.map(function (k) {
        const item = items[k];
        const hay = estado.inventario[k] || 0;
        const hueco = item.maximo - hay;
        const bajo = hay <= item.aviso;
        const botones = [1, 10].filter(function (n) { return n === 1 || hueco > 1; }).map(function (n) {
          const cuantas = Math.min(n, hueco);
          return boton('+' + cuantas + ' · ' + euros(cuantas * item.precio), 'comprarInventario', [k, cuantas], '',
            hueco > 0 ? cuantas * item.precio : undefined);
        }).join('');
        return '<div class="inventario-fila" data-inventario="' + k + '">' +
          '<span class="inventario-nombre">' + esc(item.nombre) + '</span>' +
          '<span class="inventario-cuenta' + (bajo ? ' bajo' : '') + '">' + hay + ' / ' + item.maximo + '</span>' +
          '<span class="inventario-botones">' + (hueco > 0 ? botones : '<span class="ayuda">Almacén lleno</span>') + '</span></div>';
      }).join('') +
      '<div class="licencia-titulo"><span>Objetos para conductores</span></div>' + htmlObjetosAlmacen(estado) + '</div>';
  }

  function inventarioBajo(estado) {
    const items = Libre.config.inventario;
    return Object.keys(items).some(function (k) {
      return Libre.sim.inventarioAbierto(estado, k) && (estado.inventario[k] || 0) <= items[k].aviso;
    });
  }

  const seccionFlota = {
    id: 'sec-flota',
    firma: firmaFlota,
    html: function (estado) {
      const c = Libre.config;
      const ayuda = Libre.sim.hayConductores(estado)
        ? 'Cada coche puede trabajar dos turnos. Tus conductores trabajan solos y se quedan el ' +
          Math.round(c.conductores.porcentaje * 100) + ' % de lo que recaudan. Tu turno, si conduces, es a clic.'
        : 'Contrata a tu primer conductor para el otro turno: el taxi trabajará solo también cuando tú no conduces.';
      return '<h2>Flota</h2><p class="ayuda">' + ayuda + '</p>' + htmlInventario(estado) +
        estado.licencias.map(function (lic) {
          const modelo = lic.vehiculo ? c.vehiculos.modelos[lic.vehiculo].nombre : 'sin coche';
          const modeloCompra = c.vehiculos.modelos[c.vehiculos.modeloInicial];
          return '<div class="licencia" data-licencia="' + lic.id + '"><div class="licencia-titulo"><span>Licencia ' + esc(Libre.sim.textoLicencia(lic)) + '</span>' +
            '<span class="ayuda">' + esc(modelo) + '</span></div>' +
            (lic.vehiculo ? '' : botonCompra('Comprar coche: ' + esc(modeloCompra.nombre), modeloCompra.precio,
              'comprarVehiculo', [lic.id])) +
            htmlTurno(estado, lic, 'dia') + htmlTurno(estado, lic, 'noche') + '</div>';
        }).join('') +
        (estado.licencias.length < c.licencias.maximo
          ? botonCompra('Comprar licencia nueva', Libre.sim.precioLicencia(estado), 'comprarLicencia', [])
          : '<p class="ayuda">Ya tienes todas las licencias de Madrid.</p>');
    }
  };

  /*
   * Árbol de mejoras. Una rama por pestaña; cada mejora es un nodo unido a la
   * anterior de su rama (los requisitos están en la config). Al tocar un nodo
   * se abre su ficha con qué hace, cuánto cuesta y el botón de comprar.
   * Estados: comprada, disponible, sin dinero y bloqueada.
   */
  let ramaActual = null;
  let nodoAbierto = null;
  try { ramaActual = raiz.localStorage.getItem('libre-rama'); } catch (e) { /* sin almacenamiento */ }

  function ramaValida() {
    const ramas = Libre.config.ramasMejoras;
    if (!ramas.some(function (r) { return r.id === ramaActual; })) ramaActual = ramas[0].id;
    return ramaActual;
  }

  function elegirRama(id) {
    ramaActual = id;
    nodoAbierto = null;
    try { raiz.localStorage.setItem('libre-rama', id); } catch (e) { /* da igual */ }
  }

  /* Estado de un nodo: 'comprada', 'bloqueada', 'disponible' o 'sinDinero'. */
  function estadoNodo(estado, m) {
    if (m.requiere && !Libre.sim.nivelMejora(estado, m.requiere)) return 'bloqueada';
    const siguiente = Libre.sim.siguienteNivel(estado, m.id);
    if (!siguiente) return 'comprada';
    return estado.dinero >= siguiente.precio ? 'disponible' : 'sinDinero';
  }

  function nombreMejora(id) {
    const m = Libre.config.mejoras.find(function (x) { return x.id === id; });
    return m ? m.nombre : id;
  }

  /* ¿Hay alguna mejora que se pueda comprar ya? Para la marca del menú. */
  function hayMejoraComprable(estado, rama) {
    return Libre.config.mejoras.some(function (m) {
      return (!rama || m.rama === rama) && estadoNodo(estado, m) === 'disponible';
    });
  }

  function htmlFicha(estado, m) {
    const siguiente = Libre.sim.siguienteNivel(estado, m.id);
    let pie;
    if (m.requiere && !Libre.sim.nivelMejora(estado, m.requiere)) {
      pie = '<p class="nodo-requisito">Antes necesitas «' + esc(nombreMejora(m.requiere)) + '».</p>';
    } else if (!siguiente) {
      pie = '<p class="nodo-completa">Comprada' + (m.niveles ? ' entera: los ' + m.niveles.length + ' niveles' : '') + '.</p>';
    } else {
      pie = (m.niveles ? '<p><strong>Nivel ' + siguiente.nivel + ':</strong> ' + esc(siguiente.descripcion) + '</p>' : '') +
        botonCompra(m.niveles ? 'Comprar nivel ' + siguiente.nivel : 'Comprar', siguiente.precio, 'comprarMejora', [m.id]);
    }
    return '<div class="nodo-ficha"><p>' + esc(m.descripcion) + '</p>' + pie + '</div>';
  }

  function htmlNodo(estado, m, sinEnlace) {
    const nivel = Libre.sim.nivelMejora(estado, m.id);
    const siguiente = Libre.sim.siguienteNivel(estado, m.id);
    const precio = siguiente ? siguiente.precio : null;
    const niveles = m.niveles
      ? '<span class="nodo-niveles" aria-label="Nivel ' + nivel + ' de ' + m.niveles.length + '">' +
        m.niveles.map(function (n, k) { return '<i class="' + (k < nivel ? 'hecho' : '') + '"></i>'; }).join('') + '</span>'
      : '';
    const abierto = nodoAbierto === m.id;
    return '<li class="nodo' + (sinEnlace ? ' sin-enlace' : '') + '" data-mejora="' + m.id + '" data-nodo-estado>' +
      '<button type="button" class="nodo-cabeza" data-nodo="' + m.id + '" aria-expanded="' + abierto + '"' +
      (precio !== null ? ' data-precio-nodo="' + precio + '"' : '') + '>' +
      '<span class="nodo-punto" aria-hidden="true"></span>' +
      '<span class="nodo-texto"><span class="nodo-nombre">' + esc(m.nombre) + '</span>' + niveles + '</span>' +
      '<span class="nodo-precio">' + (precio !== null ? euros(precio) : '') + '</span>' +
      '</button>' + (abierto ? htmlFicha(estado, m) : '') + '</li>';
  }

  const seccionMejoras = {
    id: 'sec-mejoras',
    firma: function (estado) {
      return JSON.stringify([ramaValida(), nodoAbierto, estado.mejoras]);
    },
    html: function (estado) {
      const c = Libre.config;
      const rama = ramaValida();
      const pestanas = c.ramasMejoras.map(function (r) {
        return '<button type="button" class="rama-pestana' + (r.id === rama ? ' activa' : '') +
          '" data-rama="' + r.id + '" aria-pressed="' + (r.id === rama) + '">' + esc(r.nombre) +
          '<i class="marca-rama" data-marca-rama="' + r.id + '"></i></button>';
      }).join('');
      // La línea une un nodo con el siguiente solo si el siguiente lo pide.
      const deRama = c.mejoras.filter(function (m) { return m.rama === rama; });
      const nodos = deRama.map(function (m, k) {
        const enlazado = deRama[k + 1] && deRama[k + 1].requiere === m.id;
        return htmlNodo(estado, m, !enlazado);
      }).join('');
      return '<h2>Mejoras</h2><div class="ramas" role="tablist">' + pestanas + '</div>' +
        '<ol class="rama">' + nodos + '</ol>';
    },
    actualizar: function (estado) {
      // El dinero cambia cada fotograma: el estado de cada nodo se pinta aquí.
      Libre.config.mejoras.forEach(function (m) {
        const nodo = document.querySelector('.nodo[data-mejora="' + m.id + '"]');
        if (nodo) nodo.dataset.nodoEstado = estadoNodo(estado, m);
      });
      document.querySelectorAll('[data-marca-rama]').forEach(function (marca) {
        marca.classList.toggle('visible', hayMejoraComprable(estado, marca.dataset.marcaRama));
      });
    }
  };

  const seccionPartida = {
    id: 'sec-partida',
    firma: function (estado) { return 'ajustes:' + estado.ajustes.pararAlCierre; },
    html: function (estado) {
      return '<h2>Partida</h2>' +
        '<label class="ajuste"><input type="checkbox" data-cambio="cambiarAjuste" data-args="pararAlCierre"' +
        (estado.ajustes.pararAlCierre ? ' checked' : '') + '> Parar al cierre del día</label>' +
        '<p class="ayuda">Se guarda sola en este navegador. Para pasarla a otro dispositivo, exporta el texto y pégalo allí en Importar.</p>' +
        '<textarea id="partida-texto" spellcheck="false" placeholder="Texto de la partida"></textarea>' +
        '<div class="acciones">' +
        '<button type="button" data-partida="exportar">Exportar</button>' +
        '<button type="button" data-partida="importar">Importar</button>' +
        '<button type="button" data-partida="borrar" class="boton-peligro">Borrar partida</button>' +
        '</div>';
    }
  };

  const secciones = [seccionAmbiente, seccionTaximetro, seccionTicket, seccionCaja, seccionObjetivo, seccionTaxis, seccionZonas, seccionFlota, seccionMejoras, seccionPartida];

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
  function alCobrar(licenciaId) { destellarFila(licenciaId); }

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
    } else if (accion === 'comprarInventario') {
      destellar(document.querySelector('[data-inventario="' + args[0] + '"]'));
    }
  }

  // ---------------------------------------------------------- Menú inferior
  /*
   * Pestañas: cada sección pertenece a una vista y solo se ve la activa.
   * La pestaña elegida se recuerda en este navegador (comodidad, no partida).
   */
  const VISTA_DE = {
    'sec-ambiente': 'calle', 'sec-taximetro': 'calle', 'sec-ticket': 'calle',
    'sec-objetivo': 'calle', 'sec-taxis': 'calle', 'sec-zonas': 'calle', 'sec-caja': 'calle',
    'sec-flota': 'flota', 'sec-mejoras': 'mejoras', 'sec-partida': 'partida'
  };
  const CLAVE_VISTA = 'libre-vista';
  let vistaActual = 'calle';
  try {
    const guardada = raiz.localStorage.getItem(CLAVE_VISTA);
    if (guardada && Object.values(VISTA_DE).indexOf(guardada) !== -1) vistaActual = guardada;
  } catch (e) { /* sin almacenamiento: se empieza en Calle */ }

  function cambiarVista(vista) {
    vistaActual = vista;
    try { raiz.localStorage.setItem(CLAVE_VISTA, vista); } catch (e) { /* da igual */ }
    aplicarVista();
    raiz.scrollTo(0, 0);
  }

  function aplicarVista() {
    secciones.forEach(function (s) {
      $(s.id).classList.toggle('fuera-de-vista', VISTA_DE[s.id] !== vistaActual);
    });
    document.querySelectorAll('[data-vista]').forEach(function (b) {
      if (b.dataset.vista === vistaActual) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
  }

  /* Marcas en las pestañas: algo que puedes comprar, o un ticket esperando. */
  function actualizarAvisos(estado) {
    const hay = { calle: !!estado.cierrePendiente, flota: false, mejoras: hayMejoraComprable(estado) };
    document.querySelectorAll('[data-precio]').forEach(function (b) {
      if (b.disabled || b.closest('.inventario')) return;
      if (VISTA_DE[b.closest('section').id] === 'flota') hay.flota = true;
    });
    if (inventarioBajo(estado)) hay.flota = true;
    Object.keys(hay).forEach(function (vista) {
      const marca = document.querySelector('[data-aviso="' + vista + '"]');
      if (marca) marca.classList.toggle('visible', hay[vista] && vista !== vistaActual);
    });
  }

  let ejecutar = null;

  function accionPartida(partida, cual) {
    const caja = $('partida-texto');
    if (cual === 'exportar') {
      caja.value = partida.exportar();
      caja.select();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(caja.value).then(
          function () { mostrarMensaje('Partida copiada al portapapeles.'); },
          function () { mostrarMensaje('Copia el texto de la caja.'); });
      } else {
        mostrarMensaje('Copia el texto de la caja.');
      }
    } else if (cual === 'importar') {
      if (!caja.value.trim()) { mostrarMensaje('Pega primero el texto de una partida.'); return; }
      if (confirm('¿Sustituir la partida actual por la importada?') && partida.importar(caja.value)) caja.value = '';
    } else if (cual === 'borrar') {
      if (confirm('¿Borrar la partida y empezar de cero? No se puede deshacer.')) partida.borrar();
    }
  }

  /* Olvida lo dibujado: hace falta tras importar o borrar la partida. */
  function reiniciar() {
    ultimoCierreVisto = null;
    ticketAviso = null;
    objetivoId = null;
    eligiendoConductor = null;
    flotantes.porLicencia = null;
    flotantes.cola = [];
    modoAnterior = null;
    contador.mostrado = null;
    secciones.forEach(function (s) { s.ultimaFirma = null; });
  }

  /* Despedir siempre pide confirmación, con el nombre y el finiquito. */
  function confirmarDespido(args) {
    const t = estadoActual && estadoActual.licencias.find(function (l) { return String(l.id) === args[0]; });
    const x = t && t.turnos[args[1]];
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

    main.addEventListener('click', function (ev) {
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
      if (ev.target.closest('[data-taxis-mas]')) {
        taxisDesplegados = !taxisDesplegados;
        opciones.redibujar();
        return;
      }
      const filaTaxi = ev.target.closest('[data-ir-licencia]');
      if (filaTaxi) {
        // A ese taxi en la pestaña Flota.
        cambiarVista('flota');
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
        accionPartida(opciones.partida, botonPartida.dataset.partida);
        return;
      }
      const pestanaRama = ev.target.closest('[data-rama]');
      if (pestanaRama) {
        elegirRama(pestanaRama.dataset.rama);
        opciones.redibujar();
        return;
      }
      const nodo = ev.target.closest('[data-nodo]');
      if (nodo) {
        nodoAbierto = nodoAbierto === nodo.dataset.nodo ? null : nodo.dataset.nodo;
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
          elegirRama(m.rama);
          nodoAbierto = m.id;
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
      const elegir = ev.target.closest('[data-elegir-conductor]');
      if (elegir) {
        const clave = elegir.dataset.elegirConductor;
        eligiendoConductor = eligiendoConductor === clave ? null : clave;
        opciones.redibujar();
        return;
      }
      const el = ev.target.closest('button[data-accion]');
      if (!el || el.disabled) return;
      const args = el.dataset.args ? el.dataset.args.split('|') : [];
      if (el.dataset.accion === 'despedirConductor' && !confirmarDespido(args)) return;
      const resultado = ejecutar(el.dataset.accion, args);
      if (resultado && resultado.ok && el.dataset.accion === 'contratarConductor') {
        eligiendoConductor = null;
        opciones.redibujar();
      }
      if (resultado && resultado.ok) destelloTrasCompra(el.dataset.accion, args);
    });

    main.addEventListener('change', function (ev) {
      const el = ev.target.closest('[data-cambio]');
      if (!el) return;
      const valor = el.type === 'checkbox' ? String(el.checked) : el.value;
      ejecutar(el.dataset.cambio, el.dataset.args.split('|').concat([valor]));
    });
  }

  let estadoActual = null;   // el último dibujado (para confirmar acciones)

  function dibujar(estado) {
    estadoActual = estado;
    const info = Libre.sim.infoReloj(estado.reloj.minutos);
    fijarDinero(estado.dinero);
    // Día y barra siguen la jornada (de 7:00 a 7:00): cambian cuando sale el ticket.
    const jornada = jornadaDe(estado.reloj.minutos);
    $('reloj').innerHTML = 'Día ' + (jornada.dia + 1) + ' · ' + textoHora(info) + ' ' + chipTarifa(info.tarifa);
    $('barra-dia').style.width = (jornada.avance * 100).toFixed(2) + '%';

    secciones.forEach(function (s) {
      const el = $(s.id);
      const firma = s.firma(estado);
      if (firma !== s.ultimaFirma) {
        const html = s.html(estado);
        el.innerHTML = html;
        el.classList.toggle('oculto', html === '');
        s.ultimaFirma = firma;
      }
    });

    document.querySelectorAll('[data-precio]').forEach(function (b) {
      b.disabled = estado.dinero < Number(b.dataset.precio);
    });

    secciones.forEach(function (s) {
      if (s.actualizar && !$(s.id).classList.contains('oculto')) s.actualizar(estado);
    });

    vigilarCobros(estado);
    vigilarCierres(estado);
    soltarAviso();
    actualizarAvisos(estado);
  }

  let temporizadorMensaje = null;
  /* Mensaje breve abajo. Con retrato, sale la cara del conductor al lado. */
  function mostrarMensaje(texto, retrato) {
    const el = $('mensaje');
    if (retrato !== undefined && retrato !== null) {
      el.innerHTML = '<span class="retrato">' + Libre.retratos.svg(retrato) + '</span><span>' + esc(texto) + '</span>';
      el.classList.add('con-retrato');
    } else {
      el.textContent = texto;
      el.classList.remove('con-retrato');
    }
    el.classList.remove('oculto');
    clearTimeout(temporizadorMensaje);
    temporizadorMensaje = setTimeout(function () { el.classList.add('oculto'); }, 3500);
  }

  Libre.ui = { iniciar, reiniciar, mostrarResumenFuera, mostrarEventos, dibujar, mostrarMensaje, euros, numero, esc };
})(globalThis);
