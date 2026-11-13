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
      if (estado.jugador.automatico) return 'automatico';
      const t = Libre.sim.turnoDelJugador(estado);
      return [t.zona, Libre.sim.zonasDisponibles(estado)].join();
    },
    html: function (estado) {
      if (estado.jugador.automatico) {
        return '<div class="taximetro">' + htmlDisplay() + '</div>' +
          '<p class="estado-carrera">Tu flota trabaja sola. El taxímetro suma lo que llevas recaudado hoy.</p>';
      }
      const c = Libre.config;
      const u = Libre.sim.ubicacionJugador(estado);
      const zonas = Libre.sim.zonasDisponibles(estado).map(function (id) {
        return '<button type="button" data-accion="elegirZona" data-args="' + u.licenciaId + '|' + u.turno + '|' + id +
          '" class="' + (id === u.datos.zona ? 'activa' : '') + '">' +
          esc(c.zonas[id].nombre) + '<small data-demanda="' + id + '"></small></button>';
      }).join('');
      return '<button type="button" class="taximetro taximetro-boton" data-accion="buscarCliente" ' +
        'aria-label="Taxímetro: buscar cliente">' + htmlDisplay() +
        '<span class="taximetro-pie" id="tx-pie"></span></button>' +
        '<div class="progreso"><div id="carrera-barra"></div></div>' +
        '<div class="estado-carrera" id="carrera-estado"></div>' +
        '<div class="zonas-selector">' + zonas + '</div>';
    },
    actualizar: function (estado) {
      const c = Libre.config;
      const info = Libre.sim.infoReloj(estado.reloj.minutos);

      if (estado.jugador.automatico) {
        pintarDisplay(estado.caja.hoy.ingresos, 'FLOTA · HOY', info.tarifa, false);
        return;
      }

      document.querySelectorAll('[data-demanda]').forEach(function (el) {
        const d = Libre.sim.demandaZona(estado, el.dataset.demanda, info);
        el.textContent = numero(d) + ' viajes/h';
      });

      const carrera = estado.jugador.carrera;
      const enCurso = Libre.sim.importeEnCurso(estado);
      const conPasajero = enCurso !== null;
      pintarDisplay(conPasajero ? enCurso : 0, conPasajero ? 'IMPORTE' : '',
        conPasajero ? carrera.tarifa : info.tarifa, !conPasajero);

      const boton = document.querySelector('.taximetro-boton');
      boton.disabled = !!carrera;
      $('tx-pie').textContent = carrera ? '' : 'Toca para buscar cliente';

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
          : 'Elige zona y toca el taxímetro para salir a buscar cliente.';
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

  /* Aviso de cierre de caja: aparece al terminar cada día hasta que lo cierras. */
  let avisoCerradoDia = -1;
  const seccionAviso = {
    id: 'sec-aviso',
    firma: function (estado) {
      const ayer = estado.caja.ayer;
      return ayer && ayer.dia !== avisoCerradoDia ? 'dia' + ayer.dia : 'nada';
    },
    html: function (estado) {
      const ayer = estado.caja.ayer;
      if (!ayer || ayer.dia === avisoCerradoDia) return '';
      const neto = Libre.sim.netoCaja(ayer);
      $('sec-aviso').classList.toggle('malo', neto < 0);
      return '<div class="aviso-cabecera"><h2>Cierre de caja · día ' + (ayer.dia + 1) + '</h2>' +
        '<button type="button" data-cerrar-aviso="' + ayer.dia + '">Vale</button></div>' +
        filasCaja(ayer, 'ayer', false);
    }
  };

  /* Resumen de lo ocurrido mientras el juego estaba cerrado. */
  let resumenFuera = null;
  function textoDuracion(segundos) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    if (h > 0) return h + ' h ' + m + ' min';
    if (m > 0) return m + ' min';
    return Math.round(segundos) + ' s';
  }
  const seccionFuera = {
    id: 'sec-fuera',
    firma: function () { return resumenFuera ? 'si' : 'no'; },
    html: function () {
      const r = resumenFuera;
      if (!r) return '';
      const gastos = r.combustible + r.conductores + r.fijos;
      const neto = r.ingresos - gastos;
      const recortado = r.segundosSimulados < r.segundosFuera
        ? '<p class="ayuda">Solo cuentan las primeras ' + textoDuracion(r.segundosSimulados) + '.</p>' : '';
      return '<div class="aviso-cabecera"><h2>Mientras estabas fuera</h2>' +
        '<button type="button" data-cerrar-fuera>Vale</button></div>' +
        '<p class="ayuda">Has estado fuera ' + textoDuracion(r.segundosFuera) + ': ' +
        r.cierres.length + (r.cierres.length === 1 ? ' día cerrado' : ' días cerrados') + '.</p>' + recortado +
        '<dl class="filas">' +
        '<div><dt>Carreras</dt><dd>' + Math.floor(r.carreras) + '</dd></div>' +
        '<div><dt>Recaudación</dt><dd>' + euros(r.ingresos) + '</dd></div>' +
        '<div><dt>Gastos</dt><dd>−' + euros(gastos) + '</dd></div>' +
        '<div class="total"><dt>Neto</dt><dd class="' + (neto < 0 ? 'negativo-texto' : 'positivo') + '">' + euros(neto) + '</dd></div>' +
        '</dl>';
    }
  };

  const seccionCaja = {
    id: 'sec-caja',
    firma: function () { return 'fija'; },
    html: function () {
      return '<h2>Caja de hoy</h2>' + filasCaja(null, 'hoy', true);
    },
    actualizar: function (estado) {
      const hoy = estado.caja.hoy;
      const fijos = Libre.sim.costesFijosDiarios(estado);
      $('hoy-carreras').textContent = Math.floor(hoy.carreras);
      ['ingresos', 'combustible', 'conductores'].forEach(function (campo) {
        $('hoy-' + campo).textContent = (campo === 'ingresos' ? '' : '−') + euros(hoy[campo]);
      });
      $('hoy-fijos').textContent = '−' + euros(fijos);
      const neto = Libre.sim.netoCaja(hoy) - fijos;
      const el = $('hoy-neto');
      el.textContent = euros(neto);
      el.className = neto < 0 ? 'negativo-texto' : 'positivo';
    }
  };

  const seccionZonas = {
    id: 'sec-zonas',
    firma: function (estado) { return Libre.sim.zonasDisponibles(estado).join(); },
    html: function (estado) {
      const c = Libre.config;
      return '<h2>Zonas</h2>' + Object.keys(c.zonas).map(function (id) {
        const zona = c.zonas[id];
        const abierta = Libre.sim.zonaDesbloqueada(estado, id);
        const mejora = zona.requiere && c.mejoras.find(function (m) { return m.id === zona.requiere; });
        return '<div class="zona-fila">' +
          '<div class="nombre">' + esc(zona.nombre) + (abierta ? '' : ' <span class="chip chip-gris">Cerrada</span>') + '</div>' +
          '<div class="datos">' + esc(zona.descripcion) + '</div>' +
          (abierta
            ? '<div class="datos" id="zona-' + id + '"></div><div class="medidor"><div id="medidor-' + id + '"></div></div>'
            : '<div class="datos">Se abre con la mejora «' + esc(mejora ? mejora.nombre : zona.requiere) + '».</div>') +
          '</div>';
      }).join('');
    },
    actualizar: function (estado) {
      const info = Libre.sim.infoReloj(estado.reloj.minutos);
      const grupos = Libre.sim.cochesPorZona(estado, info);
      Libre.sim.zonasDisponibles(estado).forEach(function (id) {
        const coches = grupos[id] ? grupos[id].length : 0;
        const r = Libre.sim.rendimientoZona(estado, id, coches, info);
        let texto = 'Ahora: ' + numero(r.demanda) + ' viajes/h · carrera media ' + euros(r.importe);
        if (coches > 0) {
          texto += ' · ' + coches + (coches === 1 ? ' coche' : ' coches') + ', ocupados al ' +
            Math.round(r.ocupacion * 100) + ' %';
        }
        $('zona-' + id).textContent = texto;
        // Medidor: parte de la demanda de la zona que cubren tus coches ahora.
        $('medidor-' + id).style.width = (r.demanda > 0 ? Math.min(1, r.capacidad / r.demanda) * 100 : 0).toFixed(0) + '%';
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
          return '<div class="licencia"><div class="licencia-titulo"><span>Licencia ' + lic.id + '</span>' +
            '<span class="ayuda">' + esc(modelo) + '</span></div>' +
            (lic.vehiculo ? '' : botonCompra('Comprar coche: ' + esc(modeloCompra.nombre), modeloCompra.precio,
              'comprarVehiculo', [lic.id])) +
            htmlTurno(estado, lic, 'dia') + htmlTurno(estado, lic, 'noche') + '</div>';
        }).join('') +
        (estado.licencias.length < c.licencias.maximo
          ? botonCompra('Comprar licencia ' + (estado.licencias.length + 1), Libre.sim.precioLicencia(estado), 'comprarLicencia', [])
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
        return '<div class="mejora' + (tenida ? ' comprada' : '') + '">' +
          '<div class="mejora-titulo">' + esc(m.nombre) + '</div>' +
          '<p>' + esc(m.descripcion) + '</p>' + pie + '</div>';
      }).join('');
    }
  };

  const seccionPartida = {
    id: 'sec-partida',
    firma: function () { return 'fija'; },
    html: function () {
      return '<h2>Partida</h2>' +
        '<p class="ayuda">Se guarda sola en este navegador. Para pasarla a otro dispositivo, exporta el texto y pégalo allí en Importar.</p>' +
        '<textarea id="partida-texto" spellcheck="false" placeholder="Texto de la partida"></textarea>' +
        '<div class="acciones">' +
        '<button type="button" data-partida="exportar">Exportar</button>' +
        '<button type="button" data-partida="importar">Importar</button>' +
        '<button type="button" data-partida="borrar" class="boton-peligro">Borrar partida</button>' +
        '</div>';
    }
  };

  const secciones = [seccionTaximetro, seccionFuera, seccionAviso, seccionCaja, seccionFlota, seccionZonas, seccionMejoras, seccionPartida];

  // ---------------------------------------------------------- Ciclo

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
    avisoCerradoDia = -1;
    resumenFuera = null;
    secciones.forEach(function (s) { s.ultimaFirma = null; });
  }

  function iniciar(opciones) {
    ejecutar = opciones.ejecutar;
    const main = $('juego');
    main.innerHTML = secciones.map(function (s) {
      const aviso = s === seccionAviso || s === seccionFuera;
      return '<section class="tarjeta' + (aviso ? ' aviso' : '') + '" id="' + s.id + '"></section>';
    }).join('');

    main.addEventListener('click', function (ev) {
      const botonPartida = ev.target.closest('[data-partida]');
      if (botonPartida) {
        accionPartida(opciones.partida, botonPartida.dataset.partida);
        return;
      }
      if (ev.target.closest('[data-cerrar-fuera]')) {
        resumenFuera = null;
        opciones.redibujar();
        return;
      }
      const cerrar = ev.target.closest('[data-cerrar-aviso]');
      if (cerrar) {
        avisoCerradoDia = Number(cerrar.dataset.cerrarAviso);
        opciones.redibujar();
        return;
      }
      const el = ev.target.closest('button[data-accion]');
      if (!el || el.disabled) return;
      ejecutar(el.dataset.accion, el.dataset.args ? el.dataset.args.split('|') : []);
    });

    main.addEventListener('change', function (ev) {
      const el = ev.target.closest('[data-cambio]');
      if (!el) return;
      ejecutar(el.dataset.cambio, el.dataset.args.split('|').concat([el.value]));
    });
  }

  function dibujar(estado) {
    const info = Libre.sim.infoReloj(estado.reloj.minutos);
    const dinero = $('dinero');
    dinero.textContent = euros(estado.dinero);
    dinero.classList.toggle('negativo', estado.dinero < 0);
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
  }

  let temporizadorMensaje = null;
  function mostrarMensaje(texto) {
    const el = $('mensaje');
    el.textContent = texto;
    el.classList.remove('oculto');
    clearTimeout(temporizadorMensaje);
    temporizadorMensaje = setTimeout(function () { el.classList.add('oculto'); }, 3500);
  }

  function mostrarResumenFuera(resumen) { resumenFuera = resumen; }

  Libre.ui = { iniciar, reiniciar, mostrarResumenFuera, dibujar, mostrarMensaje, euros, numero, esc };
})(globalThis);
