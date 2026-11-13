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

  const formatoEuros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  const formatoNumero = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

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

  function boton(texto, accion, args, clase) {
    return '<button type="button" class="' + (clase || '') + '" data-accion="' + accion +
      '" data-args="' + esc((args || []).join('|')) + '">' + texto + '</button>';
  }

  // ---------------------------------------------------------- Secciones

  const seccionTaxi = {
    id: 'sec-taxi',
    firma: function (estado) {
      const t = Libre.sim.turnoDelJugador(estado);
      return [t.zona, estado.jugador.carrera ? 1 : 0].join();
    },
    html: function (estado) {
      const c = Libre.config;
      const u = Libre.sim.ubicacionJugador(estado);
      const zonas = Object.keys(c.zonas).map(function (id) {
        return '<button type="button" data-accion="elegirZona" data-args="' + u.licenciaId + '|' + u.turno + '|' + id +
          '" class="' + (id === u.datos.zona ? 'activa' : '') + '">' +
          esc(c.zonas[id].nombre) + '<small data-demanda="' + id + '"></small></button>';
      }).join('');
      return '<h2>Tu taxi</h2>' +
        '<p class="ayuda">Conduces tú. Elige zona y sal a buscar cliente: cada carrera se cobra con el taxímetro.</p>' +
        '<div class="zonas-selector">' + zonas + '</div>' +
        boton('Buscar cliente', 'buscarCliente', [], 'boton-principal') +
        '<div class="progreso"><div id="carrera-barra"></div></div>' +
        '<div class="estado-carrera" id="carrera-estado"></div>';
    },
    actualizar: function (estado) {
      const c = Libre.config;
      const info = Libre.sim.infoReloj(estado.reloj.minutos);
      document.querySelectorAll('[data-demanda]').forEach(function (el) {
        const d = Libre.sim.demandaZona(estado, el.dataset.demanda, info);
        el.textContent = numero(d) + ' viajes/h';
      });
      const carrera = estado.jugador.carrera;
      const barra = $('carrera-barra');
      const texto = $('carrera-estado');
      const botonBuscar = document.querySelector('[data-accion="buscarCliente"]');
      if (botonBuscar) botonBuscar.disabled = !!carrera;
      if (carrera) {
        const ahora = estado.reloj.minutos;
        const p = Math.min(1, (ahora - carrera.inicio) / (carrera.fin - carrera.inicio));
        barra.style.width = (p * 100).toFixed(1) + '%';
        texto.innerHTML = ahora < carrera.finEspera
          ? esc(c.zonas[carrera.zona].textoEspera) + '…'
          : 'Con pasajero · ' + chipTarifa(carrera.tarifa) + ' · ' + numero(carrera.km) + ' km';
      } else {
        barra.style.width = '0';
        const u = estado.jugador.ultimaCarrera;
        texto.innerHTML = u
          ? 'Última carrera: <strong>' + euros(u.importe) + '</strong> · ' + chipTarifa(u.tarifa) + ' · ' + numero(u.km) + ' km'
          : 'Luz verde: libre.';
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
    firma: function () { return Object.keys(Libre.config.zonas).join(); },
    html: function () {
      const c = Libre.config;
      return '<h2>Zonas</h2>' + Object.keys(c.zonas).map(function (id) {
        return '<div class="zona-fila">' +
          '<div class="nombre">' + esc(c.zonas[id].nombre) + '</div>' +
          '<div class="datos">' + esc(c.zonas[id].descripcion) + '</div>' +
          '<div class="datos" id="zona-' + id + '"></div>' +
          '</div>';
      }).join('');
    },
    actualizar: function (estado) {
      const info = Libre.sim.infoReloj(estado.reloj.minutos);
      Object.keys(Libre.config.zonas).forEach(function (id) {
        const d = Libre.sim.demandaZona(estado, id, info);
        const v = Libre.sim.viajeMedio(id, info.tarifa);
        $('zona-' + id).textContent = 'Ahora: ' + numero(d) + ' viajes/h · carrera media ' + euros(v.importe);
      });
    }
  };

  const secciones = [seccionAviso, seccionTaxi, seccionCaja, seccionZonas];

  // ---------------------------------------------------------- Ciclo

  let ejecutar = null;

  function iniciar(opciones) {
    ejecutar = opciones.ejecutar;
    const main = $('juego');
    main.innerHTML = secciones.map(function (s) {
      return '<section class="tarjeta' + (s === seccionAviso ? ' aviso' : '') + '" id="' + s.id + '"></section>';
    }).join('');

    main.addEventListener('click', function (ev) {
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
      if (s.actualizar && !el.classList.contains('oculto')) s.actualizar(estado);
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

  Libre.ui = { iniciar, dibujar, mostrarMensaje, euros, numero, esc };
})(globalThis);
