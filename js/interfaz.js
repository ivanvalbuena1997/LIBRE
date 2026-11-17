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
      const libras = Libre.sim.libra(estado, estado.licencias.find(function (l) {
        return l.id === Libre.sim.ubicacionJugador(estado).licenciaId;
      }));
      boton.disabled = !!carrera || pausa || !enTurno || libras;
      $('tx-pie').textContent = pausa ? 'Día cerrado'
        : libras ? 'Hoy libra tu licencia: descansas'
        : conPasajero ? 'Con pasajero · ' + numero(carrera.km) + ' km'
        : carrera ? c.zonas[carrera.zona].textoEspera + '…'
        : parado ? 'Parado hasta las ' + horaDe(estado.jugador.paradoHasta)
        : !enTurno ? 'Tu turno empieza a las ' + dos(miTurno.horaInicio) + ':00'
        : 'Toca para buscar cliente';
      // Latido suave mientras el taxi espera a que lo toques.
      $('tx-pie').classList.toggle('latido', !pausa && !carrera && enTurno && !libras);

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
  const TEXTO_SITUACION = { libranza: 'Libranza', averia: 'Avería', baja: 'De baja', vacio: 'Sin conductor' };

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
      if (Libre.sim.libra(estado, lic)) icono = 'libranza';
      else if (lic.averia && jornada < lic.averia.hasta) icono = 'averia';
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
          precio: precioMasBarato(estado),
          selector: '[data-elegir-conductor="' + lic.id + '|' + turno + '"]'
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
        precio: Libre.sim.precioLicencia(estado), selector: '[data-elegir-placa]'
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
    mostrarMensaje(ev.texto, ev.retrato, ev.tipo === 'hallazgo' ? ev.categoria : null);
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

  // ---------------------------------------------------------------- Flota
  /*
   * Pestaña Flota: inventario en fichas, una tarjeta por licencia (su número
   * en una placa y los dos turnos) y la ficha de cada
   * conductor, que se abre al tocarlo.
   */

  /* Iconos de trazo (24 × 24): turnos, rasgos, objetos y consumibles. */
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
    gps: '<path d="M3 11l18-8-8 18-2-8z"/>',
    ambientador: '<path d="M12 3l5 7h-3l4 6H6l4-6H7zM12 16v5"/>',
    cojin: '<rect x="4" y="6" width="16" height="12" rx="4"/><path d="M8 12h8"/>',
    termo: '<path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2"/>',
    gafas: '<circle cx="7" cy="14" r="3.5"/><circle cx="17" cy="14" r="3.5"/><path d="M10.5 14h3M3.5 14L5 7M20.5 14L19 7"/>',
    funda: '<path d="M7 3h7a2 2 0 0 1 2 2v9H7zM5 14h14v3H5zM8 17v4M16 17v4"/>',
    callejero: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/>',
    manometro: '<circle cx="12" cy="13" r="8"/><path d="M12 13l4-4M8 18h8"/>',
    caramelos: '<circle cx="12" cy="12" r="4"/><path d="M8.5 10L4 7v10l4.5-3M15.5 10L20 7v10l-4.5-3"/>',
    espejo: '<rect x="3" y="8" width="18" height="7" rx="3.5"/><path d="M12 8V5"/>',
    vitaminas: '<path d="M7 17L17 7a3.5 3.5 0 0 0-5-5L2 12a3.5 3.5 0 0 0 5 5zM7 7l5 5"/>',
    alfombrillas: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h8"/>',
    escaner: '<path d="M12 12v9M8 21h8"/><circle cx="12" cy="10" r="2"/><path d="M7.8 5.8a6 6 0 0 0 0 8.4M16.2 5.8a6 6 0 0 1 0 8.4"/>',
    herramientas: '<path d="M14.7 6.3a4 4 0 0 0 5 5L12 19l-3 1-1-1 1-3z"/>',
    cargador: '<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/>',
    botiquin: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M12 10v7M8.5 13.5h7"/>',
    datafono: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M9 6h6M9 11h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15h.01"/>',
    navegador: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4M8 13l3-5 2 3 3-4"/>',
    silla: '<path d="M7 3h10v9H7zM5 12h14v3H5zM8 15l-1 6M16 15l1 6"/>',
    nevera: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 9h14M8 5v2M8 12v3"/>',
    baches: '<path d="M2 18h5l2-3 3 3h10M6 10a6 6 0 0 1 12 0M9 10a3 3 0 0 1 6 0"/>',
    paconi: '<path d="M8 21h8l1-6H7zM12 15V9M12 9c0-3-2-5-5-5 0 3 2 5 5 5zM12 11c0-3 2-5 5-5 0 3-2 5-5 5z"/>',
    bocata: '<path d="M3 12c0-3 4-5 9-5s9 2 9 5zM3 12h18M4 15h16c0 2-3.5 3-8 3s-8-1-8-3z"/>',
    bidon: '<path d="M7 5h10v15a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1zM9 2h6l2 3H7zM12 9l-2 4h4l-2 4"/>',
    ruedas: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/>',
    bolsas: '<path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2"/>'
  };

  /* Etiqueta con el nombre de la categoría (B, A, S, S+, LEGENDARIO). */
  function etiquetaCategoria(id) {
    const c = Libre.sim.buscarCategoria(id);
    return c ? '<span class="categoria cat-' + (id === 'S+' ? 'Smas' : id) + '">' + esc(c.nombre) + '</span>' : '';
  }

  function icono(nombre, clase) {
    return '<svg class="icono ' + (clase || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONOS[nombre] || '') + '</svg>';
  }

  /*
   * Rasgos como etiquetas con su icono y «+» o «−»: no se distinguen solo por
   * el color. El título explica qué hacen.
   */
  function htmlRasgo(id, clase) {
    const r = Libre.sim.buscarRasgo(id);
    if (!r) return '';
    return '<span class="rasgo ' + clase + '" title="' + esc(r.descripcion) + '">' + icono(id) +
      (clase === 'cualidad' ? '+ ' : '− ') + esc(r.nombre) + '</span>';
  }
  /* Cualidades (una o dos) y defecto (si tiene) de un conductor o candidato. */
  function htmlRasgos(x) {
    return '<span class="rasgos">' + Libre.sim.cualidadesDe(x).map(function (id) { return htmlRasgo(id, 'cualidad'); }).join('') +
      Libre.sim.defectosDe(x).map(function (id) { return htmlRasgo(id, 'defecto'); }).join('') + '</span>';
  }

  /* Lo menos que cuesta contratar ahora (el candidato más barato). */
  function precioMasBarato(estado) {
    return Math.min.apply(null, Libre.sim.candidatos(estado).map(Libre.sim.precioCandidato));
  }

  function nivelDe(t) { return Libre.sim.progresoConductor(t); }
  function textoExperiencia(p) {
    return p.hasta === null ? 'Nivel máximo' : Math.floor(p.xp) + ' de ' + p.hasta + ' de experiencia';
  }

  /* Barra de experiencia; data-xp permite moverla sin rehacer la tarjeta. */
  function htmlBarraXp(clave, p) {
    return '<span class="xp-barra" role="progressbar" aria-label="' + textoExperiencia(p) + '" aria-valuemin="0" ' +
      'aria-valuemax="100" aria-valuenow="' + Math.round(p.avance * 100) + '" data-xp="' + clave + '">' +
      '<span style="width:' + (p.avance * 100).toFixed(0) + '%"></span></span>';
  }

  // Turno en el que estás eligiendo conductor ('licencia|turno') o null.
  let eligiendoConductor = null;
  // Conductor con la ficha abierta ('licencia|turno') o null.
  let fichaConductor = null;
  let enfocarFicha = false;
  // Ficha del inventario abierta (id de consumible u objeto) o null.
  let fichaInventario = null;

  // ¿Está abierta la lista para vender objetos mientras contratas?
  let ventaParaContratar = false;

  /*
   * Los candidatos para un turno vacío: retrato, categoría, rasgos y su
   * precio (según la categoría). Si no te llega, cuánto falta y la opción
   * de vender objetos ahí mismo.
   */
  function htmlCandidatos(estado, lic, turno) {
    let falta = false;
    const hayHuecoReserva = (estado.reserva || []).length < Libre.config.conductores.reserva;
    const lista = Libre.sim.candidatos(estado).map(function (x, i) {
      const precio = Libre.sim.precioCandidato(x);
      const textos = Libre.sim.cualidadesDe(x).concat(Libre.sim.defectosDe(x)).map(Libre.sim.buscarRasgo).filter(Boolean)
        .map(function (r) { return esc(r.descripcion); }).join(' ');
      if (estado.dinero < precio) falta = true;
      return '<div class="candidato"><span class="retrato">' + Libre.retratos.svg(x.retrato) + '</span>' +
        '<div class="candidato-datos"><strong>' + esc(x.nombre) + ' ' + etiquetaCategoria(x.categoria) + '</strong>' +
        htmlRasgos(x) + '<small>' + textos + '</small>' + htmlFuerzaCategoria(x) + '</div>' +
        '<div class="candidato-pie">' +
        (lic ? boton('Contratar · ' + euros(precio), 'contratarConductor', [lic.id, turno, i], '', precio) : '') +
        (hayHuecoReserva ? boton(lic ? 'A la reserva' : 'A la reserva · ' + euros(precio), 'contratarAReserva', [i],
          lic ? 'boton-secundario' : '', precio) : '') +
        (estado.dinero < precio ? '<small class="falta">Te faltan ' + euros(precio - estado.dinero) + '</small>' : '') +
        '</div></div>';
    }).join('');
    const hayObjetos = Libre.sim.objetosEnAlmacen(estado) > 0;
    return '<div class="candidatos">' + lista +
      (falta && hayObjetos
        ? '<button type="button" class="boton-venta" data-venta-contratar aria-expanded="' + ventaParaContratar + '">' +
          (ventaParaContratar ? 'Cerrar la venta' : 'Vender objetos para contratar') + '</button>' +
          (ventaParaContratar ? htmlListaVenta(estado) : '')
        : '') + '</div>';
  }

  /* Baja, avería o parado, en una línea bajo el conductor. */
  function textoEstadoTurno(estado, lic, t) {
    const jornada = Libre.sim.jornadaDe(estado.reloj.minutos);
    if (lic && Libre.sim.libra(estado, lic)) return 'Hoy libra (libranza de la licencia)';
    if (lic && lic.averia && jornada < lic.averia.hasta) return 'Coche en el taller hasta el día ' + (lic.averia.hasta + 1);
    if (t.baja && jornada < t.baja.hasta) {
      const faltan = t.baja.hasta - jornada;
      return 'De baja: ' + (faltan === 1 ? 'falta 1 día' : 'faltan ' + faltan + ' días');
    }
    if (t.paradoHasta > estado.reloj.minutos) return 'Parado hasta las ' + horaDe(t.paradoHasta);
    return '';
  }

  /*
   * Cara de un conductor: su retrato con dos círculos (abajo a la izquierda,
   * la letra y el color de su categoría; abajo a la derecha, su nivel) y su
   * nombre debajo. Al tocarla se abre su ficha; con el día cerrado se puede
   * arrastrar y soltar sobre otro sitio. Si está parado (baja, avería,
   * libranza…) sale atenuada con un aviso.
   */
  function htmlCirculos(t) {
    const cat = Libre.sim.buscarCategoria(t.categoria);
    const letra = cat ? (cat.id === 'L' ? 'L' : cat.nombre) : '';
    return (cat ? '<span class="cara-categoria cat-' + (cat.id === 'S+' ? 'Smas' : cat.id) + '" aria-hidden="true">' + esc(letra) + '</span>' : '') +
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
        '<span class="cara-foto"><span class="retrato retrato-texto">+</span></span><span class="cara-nombre">Libre</span></button>';
    } else if (t.quien === 'jugador') {
      cara = '<button type="button" class="cara" data-panel-tu="' + clave + '" aria-expanded="' + (panelTu === clave) + '"' +
        ' aria-label="Tu turno: zona y opciones">' +
        '<span class="cara-foto"><span class="retrato retrato-texto tu">TÚ</span></span><span class="cara-nombre">Tú</span></button>';
    } else {
      cara = htmlCara(estado, clave, t, lic);
    }
    return '<div class="hueco-turno turno-' + turno + '" title="' + esc(c.turnos[turno].nombre + ', ' + horario(turno)) + '">' +
      icono(turno) + cara + '</div>';
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
    const destino = Libre.sim.enPausa(estado) && reserva.length < max ? ' data-destino="reserva"' : '';
    return '<div class="reserva"' + destino + '><h3 class="flota-titulo">Reserva <small>· ' + reserva.length + ' de ' + max + '</small></h3>' +
      (reserva.length
        ? '<div class="reserva-caras">' + reserva.map(function (t, i) { return htmlCara(estado, 'reserva|' + i, t, null); }).join('') + '</div>'
        : '<p class="ayuda">Conductores contratados que esperan turno. No trabajan ni cuestan nada mientras están aquí.</p>') +
      (reserva.length < max
        ? '<button type="button" class="reserva-contratar" data-elegir-conductor="reserva" aria-expanded="' + abierto + '">' +
          (abierto ? 'Cerrar candidatos' : 'Contratar para la reserva · desde ' + euros(precioMasBarato(estado))) + '</button>'
        : '') +
      (abierto ? htmlCandidatos(estado, null, null) : '') + '</div>';
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
      return '<p class="ficha-zona">Podrás cambiarlo de licencia o de turno al cerrar el día, con el ticket en pantalla.</p>';
    }
    const c = Libre.config;
    const opciones = [];
    estado.licencias.forEach(function (l) {
      if (!l.vehiculo) return;
      ['dia', 'noche'].forEach(function (tn) {
        const otro = l.turnos[tn];
        if (otro && otro.quien === 'jugador') return;
        if (!x.enReserva && l.id === x.licId && tn === x.turno) return;
        opciones.push('<option value="' + l.id + '|' + tn + '">Licencia ' + esc(Libre.sim.textoLicencia(l)) + ' · ' +
          esc(c.turnos[tn].nombre) + (otro ? ' (cambiar con ' + esc(otro.nombre) + ')' : ' (libre)') + '</option>');
      });
    });
    if (!x.enReserva && (estado.reserva || []).length < c.conductores.reserva) opciones.push('<option value="reserva">A la reserva</option>');
    if (!x.enReserva) {
      (estado.reserva || []).forEach(function (r, i) {
        opciones.push('<option value="reserva|' + i + '">Reserva (cambiar con ' + esc(r.nombre) + ')</option>');
      });
    }
    return '<p class="ficha-zona">También puedes arrastrarlo sobre otro conductor, un turno libre o la reserva.</p>' +
      '<select data-cambio="moverConductor" data-args="' + x.licId + '|' + x.turno + '" aria-label="Mover a">' +
      '<option value="" selected disabled>Mover a…</option>' + opciones.join('') + '</select>';
  }

  /* Lo que cambia su categoría: cualidad reforzada y defecto suavizado. */
  function htmlFuerzaCategoria(t) {
    const cat = Libre.sim.buscarCategoria(t.categoria);
    if (!cat || (cat.fuerzaCualidad === 1 && cat.fuerzaDefecto === 1)) return '';
    const nDefectos = Libre.sim.defectosDe(t).length;
    const partes = ['su categoría ' + cat.nombre + ' refuerza ' + (Libre.sim.cualidadesDe(t).length > 1 ? 'sus cualidades' : 'su cualidad') +
      ' ×' + factor(cat.fuerzaCualidad)];
    if (nDefectos) partes.push('deja ' + (nDefectos > 1 ? 'sus defectos' : 'su defecto') + ' en ×' + factor(cat.fuerzaDefecto));
    return '<p class="ficha-fuerza">' + partes.join(' y ').replace(/^./, function (c) { return c.toUpperCase(); }) + '.</p>';
  }

  /*
   * Ficha del conductor (hoja que sube desde abajo): retrato grande, nivel y
   * experiencia, rasgos explicados, objetos con quitar o equipar, lo que lleva
   * hecho, su zona (la elige el conductor) y despedir con su finiquito.
   */
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
    let objetos = llevados.map(function (id) {
      const o = Libre.sim.buscarObjeto(id);
      return '<li class="ficha-objeto">' + icono(o.id) + '<span><strong>' + esc(o.nombre) + ' ' + etiquetaCategoria(o.categoria) + '</strong><small>' +
        esc(o.descripcion) + '</small></span>' + boton('Quitar', 'quitarObjeto', [licId, turno, o.id]) + '</li>';
    }).join('');
    for (let i = llevados.length; i < huecos; i++) {
      objetos += '<li class="ficha-objeto libre"><span class="hueco" aria-hidden="true"></span><span><strong>Hueco libre</strong>' +
        (disponibles.length ? '' : '<small>Tus conductores encuentran objetos al hacer carreras.</small>') + '</span>' +
        (disponibles.length
          ? '<select data-cambio="equiparObjeto" data-args="' + licId + '|' + turno + '" aria-label="Equipar un objeto">' +
            '<option value="" selected disabled>Equipar…</option>' +
            disponibles.map(function (o) {
              return '<option value="' + o.id + '">' + esc(o.nombre) + ' (' + esc(Libre.sim.buscarCategoria(o.categoria).nombre) + ')</option>';
            }).join('') +
            '</select>'
          : '') + '</li>';
    }
    // Huecos que aún no tiene: a qué nivel llegan.
    for (let n = p.nivel + 1; n <= tabla.length; n++) {
      if (tabla[n - 1] > tabla[n - 2]) {
        objetos += '<li class="ficha-objeto bloqueado"><span class="hueco" aria-hidden="true"></span><span><small>Otro hueco en el nivel ' +
          n + '</small></span></li>';
      }
    }
    const zona = c.zonas[t.zona] ? c.zonas[t.zona].nombre : t.zona;
    const coste = Libre.sim.costeDespido(t);
    const aviso = textoEstadoTurno(estado, lic, t);
    return '<div class="hoja-fondo" data-cerrar-ficha></div>' +
      '<div class="hoja" role="dialog" aria-modal="true" aria-labelledby="ficha-nombre">' +
      '<button type="button" class="hoja-cerrar" data-cerrar-ficha aria-label="Cerrar la ficha">×</button>' +
      '<div class="ficha-cabecera"><span class="cara-foto grande"><span class="retrato">' + Libre.retratos.svg(t.retrato) + '</span>' +
      htmlCirculos(t) + '</span><div>' +
      '<h3 id="ficha-nombre">' + esc(t.nombre) + ' ' + etiquetaCategoria(t.categoria) + '</h3>' +
      (x.enReserva
        ? '<p>En la reserva: no trabaja hasta que le des un turno.</p>'
        : '<p>Licencia ' + esc(Libre.sim.textoLicencia(lic)) + ' · ' + icono(turno) + esc(c.turnos[turno].nombre) + ' ' + horario(turno) + '</p>') +
      (aviso ? '<p class="turno-estado">' + aviso + '</p>' : '') + '</div></div>' +
      '<div class="ficha-nivel"><span class="nivel-insignia grande">' + p.nivel + '</span><div>' +
      '<strong>Nivel ' + p.nivel + '</strong>' + htmlBarraXp(fichaConductor, p) +
      '<small id="ficha-xp">' + textoExperiencia(p) + '</small></div></div>' +
      '<h4>' + (Libre.sim.cualidadesDe(t).length > 1 ? 'Cualidades' : 'Cualidad') +
        (Libre.sim.defectosDe(t).length > 1 ? ' y defectos' : Libre.sim.defectosDe(t).length ? ' y defecto' : '') +
        '</h4><ul class="ficha-rasgos">' +
      Libre.sim.cualidadesDe(t).map(function (id) { return ['cualidad', id]; })
        .concat(Libre.sim.defectosDe(t).map(function (id) { return ['defecto', id]; })).map(function (r) {
        const rasgo = Libre.sim.buscarRasgo(r[1]);
        return rasgo ? '<li>' + htmlRasgo(r[1], r[0]) + '<span>' + esc(rasgo.descripcion) + '</span></li>' : '';
      }).join('') + '</ul>' + htmlFuerzaCategoria(t) +
      '<h4>Objetos · ' + llevados.length + ' de ' + huecos + (huecos === 1 ? ' hueco' : ' huecos') + '</h4>' +
      '<ul class="ficha-objetos">' + objetos + '</ul>' +
      '<h4>Desde que trabaja para ti</h4><dl class="filas">' +
      '<div><dt>Carreras</dt><dd id="ficha-carreras"></dd></div>' +
      '<div><dt>Facturado</dt><dd id="ficha-facturado"></dd></div></dl>' +
      (x.enReserva ? '' : '<h4>Zona</h4><p class="ficha-zona">Ahora trabaja en <strong>' + esc(zona) + '</strong>. ' +
        (Libre.sim.modificadores(estado).gestionZonas
          ? 'Con el Curso gestión de zonas va cada hora a la que más te deja.'
          : 'Elige su propia zona, al azar entre las que tienen clientes.') + '</p>') +
      '<h4>Cambiar de sitio</h4>' + htmlMoverConductor(estado, x) +
      '<div class="ficha-despedir">' + boton('Despedir · finiquito ' + euros(coste), 'despedirConductor', [licId, turno],
        'boton-peligro', coste) + '</div>' +
      '</div>';
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
    }), !!estado.jugador.carrera, estado.mejoras, jornada, estado.inventario, estado.objetos, estado.bandeja, eligiendoConductor,
    eligiendoConductor ? estado.candidatos : null, ventaParaContratar, fichaConductor, fichaInventario,
    eligiendoPlaca, eligiendoPlaca ? Libre.sim.placasEnVenta(estado) : null, panelTu,
    (estado.reserva || []).map(function (t) {
      return [t.nombre, t.retrato, t.categoria, t.cualidad, t.cualidad2, t.cualidad3, t.defecto, t.defecto2,
        Libre.sim.nivelConductor(t), t.objetos,
        t.baja && jornada < t.baja.hasta ? t.baja.hasta : 0];
    })]);
  }

  /*
   * Inventario: una ficha por consumible (ruedas, bolsas; con barra sobre el
   * máximo del almacén) y por objeto de conductor. Al tocar una ficha se
   * abre debajo su explicación y los botones de compra.
   */
  const TEXTO_CONSUMIBLE = {
    ruedas: 'Un pinchazo gasta una y el taxi sigue trabajando, en vez de parar hasta el final del turno.',
    bolsas: 'Si un cliente se marea se gasta una y el taxi no tiene que parar a limpiar.'
  };

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

  function htmlFichaInventario(id, nombre, hay, maximo, bajo, conBarra, categoria) {
    const abierta = fichaInventario === id;
    return '<button type="button" class="ficha-inv' + (bajo ? ' bajo' : '') + (abierta ? ' abierta' : '') +
      (categoria ? ' con-categoria' : '') + '" ' +
      'data-ficha-inventario="' + id + '" data-inventario="' + id + '" aria-expanded="' + abierta + '">' +
      icono(id) + '<span class="ficha-inv-nombre">' + esc(nombre) + (categoria ? ' ' + etiquetaCategoria(categoria) : '') + '</span>' +
      '<span class="ficha-inv-cantidad">' + hay + (conBarra ? '<small> / ' + maximo + '</small>' : '') + '</span>' +
      (conBarra ? '<span class="ficha-inv-barra"><span style="width:' + Math.min(100, hay / maximo * 100).toFixed(0) + '%"></span></span>' : '') +
      '</button>';
  }

  function htmlPanelInventario(estado) {
    const c = Libre.config;
    const id = fichaInventario;
    if (!id) return '';
    const consumible = c.inventario[id];
    if (consumible) {
      if (!Libre.sim.inventarioAbierto(estado, id)) return '';
      const hay = estado.inventario[id] || 0;
      const hueco = consumible.maximo - hay;
      const botones = [1, 10].filter(function (n) { return n === 1 || hueco > 1; }).map(function (n) {
        const cuantas = Math.min(n, hueco);
        return boton('+' + cuantas + ' · ' + euros(cuantas * consumible.precio), 'comprarInventario', [id, cuantas], '',
          cuantas * consumible.precio);
      }).join('');
      return '<div class="ficha-panel"><strong>' + esc(consumible.nombre) + ' · ' + hay + ' de ' + consumible.maximo + '</strong>' +
        '<p>' + esc(TEXTO_CONSUMIBLE[id] || '') + '</p>' +
        '<div class="acciones">' + (hueco > 0 ? botones : '<span class="ayuda">Almacén lleno</span>') + '</div></div>';
    }
    const o = Libre.sim.buscarObjeto(id);
    if (!o) return '';
    const hay = (estado.objetos || {})[id] || 0;
    const puestos = equipados(estado, id);
    return '<div class="ficha-panel"><strong>' + esc(o.nombre) + ' ' + etiquetaCategoria(o.categoria) + ' · ' + hay +
      ' sin equipar' + (puestos ? ', ' + puestos + (puestos === 1 ? ' equipado' : ' equipados') : '') + '</strong>' +
      '<p>' + esc(o.descripcion) + ' Se equipa desde la ficha de cada conductor.</p>' +
      '<div class="acciones">' + (hay > 0 ? botonVenta(o.id) : '') + '</div></div>';
  }

  /* Botón de vender un objeto (del almacén, o de la bandeja con su posición). */
  function botonVenta(id, deBandeja) {
    const o = Libre.sim.buscarObjeto(id);
    const precio = Libre.sim.buscarCategoria(o.categoria).venta;
    return boton('Vender · ' + euros(precio), 'venderObjeto', deBandeja === undefined ? [id] : [id, deBandeja], 'boton-venta');
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
      return '<li>' + icono(o.id) + '<span>' + esc(o.nombre) + ' ' + etiquetaCategoria(o.categoria) +
        ' <small>×' + estado.objetos[o.id] + '</small></span>' + botonVenta(o.id) + '</li>';
    }).join('') + '</ul>';
  }

  /*
   * Bandeja: lo encontrado con el almacén lleno. Se vende ahí mismo o se
   * hace sitio vendiendo algo del almacén (entra solo).
   */
  function htmlBandeja(estado) {
    const bandeja = estado.bandeja || [];
    if (bandeja.length === 0) return '';
    return '<div class="bandeja"><strong>Almacén lleno · ' + bandeja.length + ' por guardar</strong>' +
      '<ul class="lista-venta">' + bandeja.map(function (x, i) {
        const o = Libre.sim.buscarObjeto(x.id);
        return '<li>' + icono(o.id) + '<span>' + esc(o.nombre) + ' ' + etiquetaCategoria(o.categoria) +
          '<small>Lo encontró ' + esc(x.conductor) + '</small></span>' + botonVenta(o.id, i) + '</li>';
      }).join('') + '</ul>' +
      '<p>O vende algo del almacén y entrará solo:</p>' + htmlListaVenta(estado) + '</div>';
  }

  function htmlInventario(estado) {
    const c = Libre.config;
    const consumibles = Object.keys(c.inventario).filter(function (k) { return Libre.sim.inventarioAbierto(estado, k); })
      .map(function (k) {
        const item = c.inventario[k];
        const hay = estado.inventario[k] || 0;
        return htmlFichaInventario(k, item.nombre, hay, item.maximo, hay <= item.aviso, true);
      }).join('');
    // Solo los objetos que tienes sin equipar, de mejor a peor.
    const objetos = objetosDelAlmacen(estado).map(function (o) {
      return htmlFichaInventario(o.id, o.nombre, estado.objetos[o.id], 0, false, false, o.categoria);
    }).join('');
    const total = Libre.sim.objetosEnAlmacen(estado);
    return '<div class="inventario"><h3 class="flota-titulo">Inventario <small>· objetos ' + total + ' de ' +
      c.objetos.almacen + '</small></h3>' + htmlBandeja(estado) +
      '<div class="fichas">' + consumibles + objetos + '</div>' +
      (objetos ? '' : '<p class="ayuda">Tus conductores encuentran objetos al hacer carreras. Se equipan desde su ficha.</p>') +
      htmlPanelInventario(estado) + '</div>';
  }

  function inventarioBajo(estado) {
    const items = Libre.config.inventario;
    return Object.keys(items).some(function (k) {
      return Libre.sim.inventarioAbierto(estado, k) && (estado.inventario[k] || 0) <= items[k].aviso;
    });
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
    const precio = Libre.sim.precioLicencia(estado);
    if (!eligiendoPlaca) {
      return '<button type="button" class="boton-compra" data-elegir-placa data-precio="' + precio + '">' +
        '<span>Comprar licencia nueva</span><span class="precio">' + euros(precio) + '</span></button>';
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
    const modeloCompra = c.vehiculos.modelos[c.vehiculos.modeloInicial];
    const eligiendo = ['dia', 'noche'].find(function (t) { return eligiendoConductor === lic.id + '|' + t; });
    const tuAbierto = ['dia', 'noche'].find(function (t) {
      return panelTu === lic.id + '|' + t && lic.turnos[t] && lic.turnos[t].quien === 'jugador';
    });
    const abierta = eligiendo || tuAbierto;
    return '<div class="licencia' + (abierta ? ' abierta' : '') + '" data-licencia="' + lic.id + '">' +
      '<div class="licencia-placa"><span class="placa" title="' + esc(textoLibranza(lic.numero)) + '">' +
      esc(Libre.sim.textoLicencia(lic)) + '</span>' +
      (Libre.sim.libra(estado, lic) ? '<span class="hoy-libra">Hoy libra</span>' : '') + '</div>' +
      (lic.vehiculo
        ? '<div class="licencia-turnos">' + htmlHuecoTurno(estado, lic, 'dia') + htmlHuecoTurno(estado, lic, 'noche') + '</div>'
        : '<div class="licencia-sin-coche">' + botonCompra('Coche', modeloCompra.precio, 'comprarVehiculo', [lic.id]) + '</div>') +
      (eligiendo
        ? (Libre.sim.conduce(estado) ? '' : '<div class="acciones">' + boton('Conducir yo este turno', 'conducir', [lic.id, eligiendo]) + '</div>') +
          htmlCandidatos(estado, lic, eligiendo)
        : '') +
      (tuAbierto ? htmlPanelTu(estado, lic, tuAbierto) : '') + '</div>';
  }

  const seccionFlota = {
    id: 'sec-flota',
    firma: firmaFlota,
    html: function (estado) {
      const c = Libre.config;
      if (fichaConductor && !conductorDe(estado, fichaConductor)) fichaConductor = null;
      const hayAlguno = Libre.sim.todosLosConductores(estado).length > 0;
      const ayuda = !hayAlguno
        ? 'Contrata a tu primer conductor para el otro turno: el taxi trabajará solo también cuando tú no conduces.'
        : Libre.sim.enPausa(estado)
          ? 'Día cerrado: arrastra a un conductor sobre otro, un turno libre o la reserva para reorganizarlos ' +
            '(en el móvil, mantén pulsado su retrato). También desde su ficha.'
          : 'Tus conductores trabajan solos y se quedan el ' + Math.round(c.conductores.porcentaje * 100) +
            ' % de lo que recaudan. Toca uno para ver su ficha; al cerrar el día podrás cambiarlos de sitio.';
      return '<h2>Flota</h2><p class="ayuda">' + ayuda + '</p>' + htmlInventario(estado) + htmlReserva(estado) +
        '<h3 class="flota-titulo">Licencias <small>· ' + estado.licencias.length + '</small></h3>' +
        '<div class="licencias">' + estado.licencias.map(function (lic) { return htmlLicencia(estado, lic); }).join('') + '</div>' +
        htmlComprarLicencia(estado) +
        htmlFichaConductor(estado);
    },
    // La experiencia y lo hecho cambian con cada carrera: se mueven aquí.
    actualizar: function (estado) {
      document.querySelectorAll('#sec-flota [data-xp]').forEach(function (barra) {
        const x = conductorDe(estado, barra.dataset.xp);
        if (!x) return;
        const p = nivelDe(x.t);
        barra.firstChild.style.width = (p.avance * 100).toFixed(0) + '%';
        barra.setAttribute('aria-valuenow', Math.round(p.avance * 100));
        barra.setAttribute('aria-label', textoExperiencia(p));
      });
      const x = conductorDe(estado, fichaConductor);
      if (x && $('ficha-xp')) {
        $('ficha-xp').textContent = textoExperiencia(nivelDe(x.t));
        $('ficha-carreras').textContent = numero(Math.floor(x.t.carreras || 0));
        $('ficha-facturado').textContent = euros(x.t.facturado || 0);
      }
      if (enfocarFicha) {
        enfocarFicha = false;
        const cerrar = document.querySelector('.hoja-cerrar');
        if (cerrar) cerrar.focus({ preventScroll: true });
      }
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
      if (b.disabled || b.closest('.inventario, .hoja')) return;
      if (VISTA_DE[b.closest('section').id] === 'flota') hay.flota = true;
    });
    if (inventarioBajo(estado) || (estado.bandeja || []).length > 0) hay.flota = true;
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
    fichaConductor = null;
    fichaInventario = null;
    eligiendoPlaca = false;
    panelTu = null;
    flotantes.porLicencia = null;
    flotantes.cola = [];
    modoAnterior = null;
    contador.mostrado = null;
    secciones.forEach(function (s) { s.ultimaFirma = null; });
  }

  /*
   * Arrastrar conductores (solo con el día cerrado: las filas llevan
   * data-arrastrable y los sitios donde soltar, data-destino). Con ratón,
   * empieza al mover unos píxeles; con el dedo, tras mantener pulsado medio
   * segundo (si mueve antes, es que desplaza la página). Al soltar sobre un
   * destino se llama a moverConductor. Un retrato sigue al puntero (sin
   * animación: solo se coloca donde está el dedo).
   */
  const MS_PULSACION_LARGA = 450;
  let arrastre = null;
  let ignorarClic = false;

  function iniciarArrastre(opciones) {
    const main = $('juego');

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

    main.addEventListener('pointerdown', function (ev) {
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
        ignorarClic = true;   // el clic que sigue no abre la ficha
        setTimeout(function () { ignorarClic = false; }, 0);   // si no llega ese clic, no se queda colgado
        terminar();
        if (destino && destino.dataset.destino !== origen) {
          ejecutar('moverConductor', origen.split('|').concat([destino.dataset.destino]));
          opciones.redibujar();
        }
        return;
      }
      terminar();
    });
    document.addEventListener('pointercancel', terminar);
    main.addEventListener('contextmenu', function (ev) {
      if (arrastre) ev.preventDefault();
    });
    main.addEventListener('click', function (ev) {
      if (!ignorarClic) return;
      ignorarClic = false;
      ev.stopPropagation();
      ev.preventDefault();
    }, true);
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
      if (ev.target.closest('[data-cerrar-ficha]')) {
        fichaConductor = null;
        opciones.redibujar();
        return;
      }
      const abrirFicha = ev.target.closest('[data-ficha-conductor]');
      if (abrirFicha) {
        fichaConductor = abrirFicha.dataset.fichaConductor;
        enfocarFicha = true;
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
      if (resultado && resultado.ok && el.dataset.accion === 'comprarLicencia') {
        eligiendoPlaca = false;
        opciones.redibujar();
      }
      if (resultado && resultado.ok && (el.dataset.accion === 'contratarConductor' || el.dataset.accion === 'contratarAReserva')) {
        eligiendoConductor = null;
        ventaParaContratar = false;
        opciones.redibujar();
      }
      if (resultado && resultado.ok) destelloTrasCompra(el.dataset.accion, args);
    });

    iniciarArrastre(opciones);

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && fichaConductor) {
        const clave = fichaConductor;
        fichaConductor = null;
        opciones.redibujar();
        const origen = document.querySelector('[data-ficha-conductor="' + clave + '"]');
        if (origen) origen.focus({ preventScroll: true });
      }
    });

    main.addEventListener('change', function (ev) {
      const el = ev.target.closest('[data-cambio]');
      if (!el) return;
      const valor = el.type === 'checkbox' ? String(el.checked) : el.value;
      if (el.dataset.cambio === 'moverConductor') fichaConductor = null;
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

  Libre.ui = { iniciar, reiniciar, mostrarResumenFuera, mostrarEventos, dibujar, mostrarMensaje, euros, numero, esc };
})(globalThis);
