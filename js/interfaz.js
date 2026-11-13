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

  function textoHora(info) {
    return info.nombreDia + ' ' + dos(info.hora) + ':' + dos(info.minuto);
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

  const seccionTaximetro = {
    id: 'sec-taximetro',
    firma: function (estado) {
      return estado.jugador.automatico ? 'automatico' : 'a-mano';
    },
    html: function (estado) {
      if (estado.jugador.automatico) {
        return '<div class="taximetro">' + htmlDisplay() + '</div>' +
          '<p class="estado-carrera">Tu flota trabaja sola: recaudación de hoy.</p>';
      }
      return '<button type="button" class="taximetro taximetro-boton" data-accion="buscarCliente" ' +
        'aria-label="Taxímetro: buscar cliente">' + htmlDisplay() +
        '<span class="taximetro-pie" id="tx-pie"></span></button>' +
        '<div class="progreso"><div id="carrera-barra"></div></div>' +
        '<div class="estado-carrera" id="carrera-estado"></div>';
    },
    actualizar: function (estado) {
      const c = Libre.config;
      const info = Libre.sim.infoReloj(estado.reloj.minutos);

      if (estado.jugador.automatico) {
        pintarDisplay(estado.caja.hoy.ingresos, 'FLOTA · HOY', info.tarifa, false);
        return;
      }

      const carrera = estado.jugador.carrera;
      const enCurso = Libre.sim.importeEnCurso(estado);
      const conPasajero = enCurso !== null;
      pintarDisplay(conPasajero ? enCurso : 0, conPasajero ? 'IMPORTE' : '',
        conPasajero ? carrera.tarifa : info.tarifa, !conPasajero);

      const boton = document.querySelector('.taximetro-boton');
      const pausa = Libre.sim.enPausa(estado);
      boton.disabled = !!carrera || pausa;
      $('tx-pie').textContent = pausa ? 'Día cerrado' : carrera ? '' : 'Toca para buscar cliente';
      // Latido suave mientras el taxi espera a que lo toques.
      $('tx-pie').classList.toggle('latido', !pausa && !carrera);

      const barra = $('carrera-barra');
      const texto = $('carrera-estado');
      if (carrera) {
        const ahora = estado.reloj.minutos;
        const p = Math.min(1, (ahora - carrera.inicio) / (carrera.fin - carrera.inicio));
        barra.style.width = (p * 100).toFixed(1) + '%';
        texto.innerHTML = conPasajero
          ? 'Con pasajero · ' + numero(carrera.km) + ' km'
          : esc(c.zonas[carrera.zona].textoEspera) + '…';
      } else {
        barra.style.width = '0';
        const u = estado.jugador.ultimaCarrera;
        texto.innerHTML = u
          ? 'Última carrera: <strong>' + euros(u.importe) + '</strong> · ' + chipTarifa(u.tarifa) + ' · ' + numero(u.km) + ' km'
          : 'Elige zona abajo y toca el taxímetro.';
      }
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
      '<div class="total"><dt>Neto</dt><dd id="' + prefijo + '-neto">' + (caja ? euros(Libre.sim.netoCaja(caja)) : '') + '</dd></div>' +
      '</dl>';
  }

  /*
   * Escena: tira decorativa encima del taxímetro (js/escena.js).
   * A mano, el taxi se mueve solo con pasajero; automatizado, mientras algún
   * coche de la flota tenga viajes a esa hora.
   */
  const seccionEscena = {
    id: 'sec-escena',
    firma: function () { return 'fija'; },
    html: function () { return Libre.escena.html(); },
    actualizar: function (estado) {
      const info = Libre.sim.infoReloj(estado.reloj.minutos);
      let moviendo;
      let ocupado;
      if (estado.jugador.automatico) {
        const grupos = Libre.sim.cochesPorZona(estado, info);
        moviendo = Object.keys(grupos).some(function (zonaId) {
          return Libre.sim.rendimientoZona(estado, zonaId, grupos[zonaId].length, info).viajesHora > 0;
        });
        ocupado = false;
      } else {
        ocupado = Libre.sim.importeEnCurso(estado) !== null;
        moviendo = ocupado;
      }
      if (Libre.sim.enPausa(estado)) {
        moviendo = false;
      }
      Libre.escena.actualizar($('sec-escena').firstChild, {
        hora: info.minutoDelDia / 60,
        moviendo,
        pilotoVisible: !ocupado
      });
    }
  };

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
          nombre: estado.jugador.automatico
            ? 'Conductor de ' + c.turnos[turno].nombre.toLowerCase() + ' (licencia ' + Libre.sim.textoLicencia(lic) + ')'
            : 'Tu primer conductor',
          precio: c.conductores.costeContratacion,
          selector: '[data-accion="contratarConductor"][data-args="' + lic.id + '|' + turno + '"]'
        });
      });
    });
    c.mejoras.forEach(function (m) {
      if (estado.mejoras[m.id] || (m.requiere && !estado.mejoras[m.requiere])) return;
      lista.push({ id: 'mejora-' + m.id, nombre: m.nombre, precio: m.precio, selector: '[data-mejora="' + m.id + '"]' });
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
      return '<button type="button" class="objetivo' + (listo ? ' listo' : '') + '" data-objetivo="' + esc(o.selector) + '">' +
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
    const neto = t.ingresos - t.combustible - t.conductores - t.fijos;
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
      const licencia = estado.licencias.find(function (l) { return l.id === u.licenciaId; }) || estado.licencias[0];
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
  function mostrarResumenFuera(r, estado) {
    if (r.cierres.length > 0) {
      if (!estado.cierrePendiente) ticketAviso = Libre.sim.sumarCierres(r.cierres);
    } else if (r.carreras >= 1) {
      mostrarMensaje('Mientras estabas fuera: ' + euros(r.ingresos) + ' en ' + Math.floor(r.carreras) + ' carreras.');
    }
  }

  /* Caja de hoy: una línea que se despliega con el desglose. */
  const seccionCaja = {
    id: 'sec-caja',
    firma: function () { return 'fija'; },
    html: function () {
      return '<details class="caja-plegable"><summary id="caja-resumen"></summary>' +
        filasCaja(null, 'hoy', true) + '</details>';
    },
    actualizar: function (estado) {
      const hoy = estado.caja.hoy;
      const fijos = Libre.sim.costesFijosDiarios(estado);
      const neto = Libre.sim.netoCaja(hoy) - fijos;
      // Lo ganado hasta ahora (sin los fijos, que se cobran al cierre).
      const ganado = Libre.sim.netoCaja(hoy);
      const carreras = Math.floor(hoy.carreras);
      $('caja-resumen').innerHTML = 'Hoy: ' + carreras + (carreras === 1 ? ' carrera' : ' carreras') +
        ' · <strong class="' + (ganado < 0 ? 'negativo-texto' : '') + '">' + euros(ganado) + '</strong>' +
        ' <span class="caja-fijos">· fijos al cierre −' + euros(fijos) + '</span>';
      $('hoy-carreras').textContent = carreras;
      ['ingresos', 'combustible', 'conductores'].forEach(function (campo) {
        $('hoy-' + campo).textContent = (campo === 'ingresos' ? '' : '−') + euros(hoy[campo]);
      });
      $('hoy-fijos').textContent = '−' + euros(fijos);
      const el = $('hoy-neto');
      el.textContent = euros(neto);
      el.className = neto < 0 ? 'negativo-texto' : 'positivo';
    }
  };

  /*
   * Zonas: tarjetas con icono y medidor de demanda (viajes/h ahora respecto
   * al máximo de la semana en esa zona). Sin demanda, atenuada y con la hora
   * a la que abre. Mientras conduces a mano, tocar una tarjeta elige la zona.
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
    const ahora = Libre.sim.infoReloj(estado.reloj.minutos);
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
        const dias = info.dia - ahora.dia;
        texto = dias === 0 ? 'Abre ' + a
          : dias === 1 ? 'Abre mañana ' + a
          : 'Abre el ' + info.nombreDia.toLowerCase() + ' ' + a;
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
      return [Libre.sim.zonasDisponibles(estado), estado.jugador.automatico, u ? u.datos.zona : ''].join('|');
    },
    html: function (estado) {
      const c = Libre.config;
      const aMano = !estado.jugador.automatico;
      const u = Libre.sim.ubicacionJugador(estado);
      return '<div class="zonas-rejilla" role="group" aria-label="Zonas">' + Object.keys(c.zonas).map(function (id) {
        const zona = c.zonas[id];
        const abierta = Libre.sim.zonaDesbloqueada(estado, id);
        const cuerpo = iconoZona(id) +
          '<span class="zona-nombre">' + esc(zona.nombre) + '</span>' +
          '<span class="zona-dato" id="zona-dato-' + id + '"></span>' +
          '<span class="zona-medidor"><span id="zona-medidor-' + id + '"></span></span>';
        if (!abierta) {
          const mejora = c.mejoras.find(function (m) { return m.id === zona.requiere; });
          return '<div class="zona-tarjeta cerrada" title="' + esc(zona.descripcion) + '">' + iconoZona(id) +
            '<span class="zona-nombre">' + esc(zona.nombre) + '</span>' +
            '<span class="zona-dato">Cerrada: ' + esc(mejora ? mejora.nombre : zona.requiere) + '</span></div>';
        }
        if (aMano) {
          return '<button type="button" class="zona-tarjeta' + (id === u.datos.zona ? ' activa' : '') + '" id="zona-' + id + '" ' +
            'data-accion="elegirZona" data-args="' + u.licenciaId + '|' + u.turno + '|' + id + '" title="' + esc(zona.descripcion) + '">' +
            cuerpo + '</button>';
        }
        return '<div class="zona-tarjeta" id="zona-' + id + '" title="' + esc(zona.descripcion) + '">' + cuerpo + '</div>';
      }).join('') + '</div>';
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

  function htmlTurno(estado, lic, turno) {
    const c = Libre.config;
    const t = lic.turnos[turno];
    let cuerpo;
    if (!lic.vehiculo) {
      cuerpo = '<span class="ayuda">Necesita coche</span>';
    } else if (!t) {
      cuerpo = boton('Contratar conductor · ' + euros(c.conductores.costeContratacion), 'contratarConductor',
        [lic.id, turno], '', c.conductores.costeContratacion);
    } else if (t.quien === 'jugador') {
      const otro = turno === 'dia' ? 'noche' : 'dia';
      cuerpo = '<span class="quien">Tú</span>' + selectorZona(estado, lic.id, turno, t.zona) +
        (lic.turnos[otro] ? '' : boton('Pasar a ' + c.turnos[otro].nombre.toLowerCase(), 'cambiarTurnoJugador', []));
    } else {
      cuerpo = '<span class="quien">' + esc(t.nombre) + '</span>' + selectorZona(estado, lic.id, turno, t.zona) +
        boton('Despedir', 'despedirConductor', [lic.id, turno], 'boton-peligro');
    }
    return '<div class="turno"><div class="turno-nombre">' + esc(c.turnos[turno].nombre) + '<br>' + horario(turno) + '</div>' +
      '<div class="turno-cuerpo">' + cuerpo + '</div></div>';
  }

  const seccionFlota = {
    id: 'sec-flota',
    firma: function (estado) {
      return JSON.stringify([estado.licencias, estado.jugador.automatico, !!estado.jugador.carrera, estado.mejoras]);
    },
    html: function (estado) {
      const c = Libre.config;
      const ayuda = estado.jugador.automatico
        ? 'Cada coche puede trabajar dos turnos. Tus conductores se quedan el ' +
          Math.round(c.conductores.porcentaje * 100) + ' % de lo que recaudan.'
        : 'Contrata a tu primer conductor para el otro turno: desde ese momento el taxi trabaja solo, ' +
          'también en tu turno, y se acaban las carreras a mano.';
      return '<h2>Flota</h2><p class="ayuda">' + ayuda + '</p>' +
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
    },
    actualizar: function (estado) {
      if (!estado.jugador.automatico && estado.jugador.carrera) {
        document.querySelectorAll('[data-accion="contratarConductor"]').forEach(function (b) { b.disabled = true; });
      }
    }
  };

  const seccionMejoras = {
    id: 'sec-mejoras',
    firma: function (estado) { return JSON.stringify(estado.mejoras); },
    html: function (estado) {
      const c = Libre.config;
      const nombreDe = function (id) {
        const m = c.mejoras.find(function (x) { return x.id === id; });
        return m ? m.nombre : id;
      };
      return '<h2>Mejoras</h2>' + c.mejoras.map(function (m) {
        const tenida = !!estado.mejoras[m.id];
        const bloqueada = m.requiere && !estado.mejoras[m.requiere];
        let pie;
        if (tenida) pie = '';
        else if (bloqueada) pie = '<p>Antes necesitas «' + esc(nombreDe(m.requiere)) + '».</p>';
        else pie = botonCompra('Comprar', m.precio, 'comprarMejora', [m.id]);
        return '<div class="mejora' + (tenida ? ' comprada' : '') + '" data-mejora="' + m.id + '">' +
          '<div class="mejora-titulo">' + esc(m.nombre) + '</div>' +
          '<p>' + esc(m.descripcion) + '</p>' + pie + '</div>';
      }).join('');
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

  const secciones = [seccionEscena, seccionTaximetro, seccionTicket, seccionObjetivo, seccionZonas, seccionCaja, seccionFlota, seccionMejoras, seccionPartida];

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
  const flotantes = { vivos: 0, pendiente: 0, ultimo: 0, base: null, lanzados: 0 };

  function vigilarCobros(estado) {
    const t = estado.totales;
    if (!flotantes.base) {
      flotantes.base = { carreras: t.carreras, ingresos: t.ingresos };
      return;
    }
    const completas = Math.floor(t.carreras) - Math.floor(flotantes.base.carreras);
    const ingresado = t.ingresos - flotantes.base.ingresos;
    // Se espera a que se complete al menos una carrera para enseñar su importe.
    if (completas > 0 && ingresado > 0) {
      flotantes.base = { carreras: t.carreras, ingresos: t.ingresos };
      if (!movimientoReducido.matches) flotantes.pendiente += ingresado;
    }
    const ahora = Date.now();
    if (flotantes.pendiente >= 0.005 && flotantes.vivos < MAX_FLOTANTES &&
        ahora - flotantes.ultimo >= MS_ENTRE_FLOTANTES) {
      lanzarFlotante(flotantes.pendiente);
      flotantes.pendiente = 0;
      flotantes.ultimo = ahora;
    }
  }

  function lanzarFlotante(importe) {
    const ancla = document.querySelector('#sec-taximetro .display') || $('dinero');
    const caja = ancla.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'flotante';
    el.textContent = '+' + euros(importe);
    // Dos columnas alternas para que no se pisen.
    el.style.left = (caja.right - 8 - (flotantes.lanzados++ % 2) * 88) + 'px';
    el.style.top = (caja.top + 6) + 'px';
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
    flotantes.base = null;
    flotantes.pendiente = 0;
    contador.mostrado = null;
    secciones.forEach(function (s) { s.ultimaFirma = null; });
  }

  function iniciar(opciones) {
    ejecutar = opciones.ejecutar;
    const main = $('juego');
    main.innerHTML = secciones.map(function (s) {
      return '<section class="tarjeta" id="' + s.id + '"></section>';
    }).join('');

    main.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-cerrar-ticket]')) {
        ticketAviso = null;
        opciones.redibujar();
        return;
      }
      const botonPartida = ev.target.closest('[data-partida]');
      if (botonPartida) {
        accionPartida(opciones.partida, botonPartida.dataset.partida);
        return;
      }
      const objetivo = ev.target.closest('[data-objetivo]');
      if (objetivo) {
        if (!objetivo.classList.contains('listo')) return;
        // Lleva hasta la compra y la señala; no compra sola.
        const destino = document.querySelector(objetivo.dataset.objetivo);
        if (destino) {
          destino.scrollIntoView({ block: 'center' });
          destellar(destino.closest('.licencia, .mejora') || destino);
        }
        return;
      }
      const el = ev.target.closest('button[data-accion]');
      if (!el || el.disabled) return;
      const args = el.dataset.args ? el.dataset.args.split('|') : [];
      const resultado = ejecutar(el.dataset.accion, args);
      if (resultado && resultado.ok) destelloTrasCompra(el.dataset.accion, args);
    });

    main.addEventListener('change', function (ev) {
      const el = ev.target.closest('[data-cambio]');
      if (!el) return;
      const valor = el.type === 'checkbox' ? String(el.checked) : el.value;
      ejecutar(el.dataset.cambio, el.dataset.args.split('|').concat([valor]));
    });
  }

  function dibujar(estado) {
    const info = Libre.sim.infoReloj(estado.reloj.minutos);
    fijarDinero(estado.dinero);
    $('reloj').innerHTML = 'Día ' + (info.dia + 1) + ' · ' + textoHora(info) + ' ' + chipTarifa(info.tarifa);
    $('barra-dia').style.width = (info.minutoDelDia / Libre.sim.MIN_DIA * 100).toFixed(2) + '%';

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
  }

  let temporizadorMensaje = null;
  function mostrarMensaje(texto) {
    const el = $('mensaje');
    el.textContent = texto;
    el.classList.remove('oculto');
    clearTimeout(temporizadorMensaje);
    temporizadorMensaje = setTimeout(function () { el.classList.add('oculto'); }, 3500);
  }

  Libre.ui = { iniciar, reiniciar, mostrarResumenFuera, dibujar, mostrarMensaje, euros, numero, esc };
})(globalThis);
