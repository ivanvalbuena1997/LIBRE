/*
 * Libre · interfaz: pestaña Estadísticas.
 * Parte de Libre.ui (ver la cabecera de js/interfaz.js).
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};
  const ui = Libre.ui = Libre.ui || {};

  // ---------------------------------------------------------- Estadísticas
  /*
   * Pestaña Estadísticas (Iván, 18-11-2026): tres cifras de la partida, la
   * facturación de cada día de los últimos 30 (barra verde y raya del neto;
   * tocar una enseña sus cifras), tu media diaria y la de cada conductor con
   * turno, y los diez mejores conductores de la partida (también despedidos).
   * Los datos salen de estado.historial y de Libre.sim (mediasDiarias,
   * clasificacionConductores). Fuera de su pestaña no se dibuja.
   */
  ui.diaEstadistica = null;   // día elegido en el gráfico (null: el último)

  function nombreDia(dia) {
    const dias = Libre.config.reloj.diasSemana;
    return dias[dia % 7] + ' · día ' + (dia + 1);
  }

  function htmlCifrasPartida(estado) {
    const mejor = estado.mejorDia;
    const t = estado.totales;
    const cifra = function (etiqueta, valor, pie, clase) {
      return '<div class="ui-tarjeta estad-cifra' + (clase ? ' ' + clase : '') + '"><span>' + etiqueta + '</span><strong class="ui-dinero">' + valor + '</strong>' +
        (pie ? '<small>' + ui.esc(pie) + '</small>' : '') + '</div>';
    };
    return '<div class="estad-cifras">' +
      cifra('Facturado', ui.eurosCorto(estado.totales.ingresos), 'en la partida') +
      cifra('Carreras', ui.numero(Math.floor(estado.totales.carreras)), 'en la partida') +
      cifra('Mejor día', mejor ? ui.eurosCorto(mejor.ingresos) : '—', mejor ? nombreDia(mejor.dia) : 'sin cerrar') +
      cifra('Km recorridos', ui.numero(Math.floor(estado.totales.km || 0)) + ' km', 'por tu flota') +
      // Iván, 26-11-2026: lo que ha pasado en los taxis de toda la flota.
      cifra('Vómitos', ui.numero(t.vomitos || 0), 'en toda la flota', 'estad-cifra--cuenta') +
      cifra('Sin pagar', ui.eurosCorto(t.sinPagar || 0), 'perdidos con los que se van', 'estad-cifra--perdido') +
      cifra('Objetos encontrados', ui.numero(t.hallazgos || 0), 'por tus conductores', 'estad-cifra--cuenta') +
      cifra('Objetos devueltos', ui.numero(t.devueltos || 0), 'olvidos de clientes', 'estad-cifra--cuenta') +
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
    const elegido = historial.find(function (r) { return r.dia === ui.diaEstadistica; }) || historial[historial.length - 1];
    const vacios = [];
    for (let i = historial.length; i < dias; i++) vacios.push('<span class="estad-barra vacia"></span>');
    const barras = historial.map(function (r) {
      return '<button type="button" class="estad-barra' + (r === elegido ? ' elegida' : '') + '" data-dia-estadistica="' + r.dia + '"' +
        ' aria-label="' + ui.esc(nombreDia(r.dia) + ': ' + ui.euros(r.ingresos) + ', neto ' + ui.euros(r.neto)) + '"' +
        (r === elegido ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' +
        '<i class="estad-ingresos" style="bottom:' + cero.toFixed(2) + '%;height:' + pct(r.ingresos) + '"></i>' +
        '<i class="estad-neto' + (r.neto < 0 ? ' negativo' : '') + '" style="bottom:' + (cero + r.neto / rango * 100).toFixed(2) + '%"></i>' +
        '</button>';
    }).join('');
    return '<div class="estad-grafico" style="--cero:' + cero.toFixed(2) + '%">' +
      '<span class="estad-eje">' + ui.eurosCorto(maximo) + '</span>' +
      '<div class="estad-barras">' + vacios.join('') + barras + '</div></div>' +
      '<p class="estad-detalle"><strong>' + ui.esc(nombreDia(elegido.dia)) + '</strong>' +
      '<span>' + ui.euros(elegido.ingresos) + ' · neto <b class="' + (elegido.neto < 0 ? 'ui-dinero--negativo' : 'ui-dinero--positivo') + '">' +
      ui.euros(elegido.neto) + '</b> · ' + ui.numero(Math.floor(elegido.carreras)) + ' carreras</span></p>' +
      '<p class="estad-leyenda"><i class="estad-muestra"></i>Facturado <i class="estad-muestra neto"></i>Neto</p>';
  }

  /* Tu media diaria y la de cada conductor con turno, en barras de mayor a menor. */
  function htmlMedias(estado) {
    const m = Libre.sim.mediasDiarias(estado);
    const filas = [];
    if (m.tu) filas.push({ nombre: Libre.sim.nombrePersonaje(estado), retrato: ui.htmlCaraTu(estado), media: m.tu.media, dias: m.tu.dias, tu: true });
    m.conductores.forEach(function (x) {
      filas.push({
        nombre: x.t.nombre, media: x.media, dias: x.dias, clave: x.licenciaId + '|' + x.turno,
        retrato: '<span class="cara-foto"><span class="retrato">' + Libre.retratos.svg(Libre.sim.caraDe(x.t)) + '</span>' + ui.htmlCirculos(x.t) + '</span>'
      });
    });
    if (filas.length === 0 || (estado.historial || []).length === 0) {
      return '<p class="estad-vacio">Cuando cierres una jornada verás aquí lo que deja de media cada uno.</p>';
    }
    const mayor = Math.max.apply(null, filas.map(function (f) { return f.media || 0; }).concat([1]));
    return '<ol class="estad-lista">' + filas.map(function (f) {
      const valor = f.media === null ? '<span class="estad-sin">Sin jornadas</span>'
        : '<span class="ui-dinero">' + ui.eurosCorto(f.media) + '</span><small>/día</small>';
      const contenido = '<span class="estad-retrato">' + f.retrato + '</span>' +
        '<span class="estad-quien"><strong>' + ui.esc(f.nombre) + '</strong><small>' +
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
        Libre.retratos.svg(Libre.sim.caraDe(x)) + '</span>' + ui.htmlCirculos(x) + '</span></span>' +
        '<span class="estad-quien"><strong>' + ui.esc(x.nombre) + '</strong><small>' +
        (x.despedido ? '<span class="ui-chip ui-chip--libranza">Despedido</span> ' : '') +
        ui.numero(Math.floor(x.carreras)) + ' carreras</small></span>' +
        '<span class="estad-valor"><span class="ui-dinero">' + ui.eurosCorto(x.facturado) + '</span></span>' +
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
      if (ui.vistaActual !== 'estadisticas') return 'fuera';
      const h = estado.historial || [];
      // Se redibuja al cerrar un día, al cambiar la flota o cada 20 € facturados.
      return JSON.stringify([h.length, h.length ? h[h.length - 1].dia : -1, ui.diaEstadistica,
        Math.floor(estado.totales.ingresos / 20), Math.floor((estado.totales.km || 0) / 100), (estado.exConductores || []).length,
        estado.totales.vomitos, estado.totales.sinPagar, estado.totales.hallazgos, estado.totales.devueltos,
        Libre.sim.todosLosConductores(estado).map(function (x) { return x.t.id + '@' + x.licenciaId + x.turno; })]);
    },
    html: function (estado) {
      if (ui.vistaActual !== 'estadisticas') return '';
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

  Object.assign(ui, { seccionEstadisticas });
})(globalThis);
