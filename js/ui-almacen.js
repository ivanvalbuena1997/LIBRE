/*
 * Libre · interfaz: pestaña Almacén (objetos, combinar, vender y bandeja).
 * Parte de Libre.ui (ver la cabecera de js/interfaz.js).
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};
  const ui = Libre.ui = Libre.ui || {};

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
    const abierta = ui.fichaInventario === o.id;
    const cat = Libre.sim.buscarCategoria(o.categoria);
    const hay = estado.objetos[o.id];
    return '<button type="button" class="almacen-objeto' + (abierta ? ' abierta' : '') + '" ' +
      'data-ficha-inventario="' + o.id + '" data-inventario="' + o.id + '" aria-expanded="' + abierta + '"' +
      ' title="' + ui.esc(o.nombre) + '" aria-label="' + ui.esc(o.nombre + ': ' + hay + ', categoría ' + cat.nombre) + '">' +
      '<span class="ficha-objeto-rareza ' + ui.claseRareza(o.categoria) + '">' + ui.esc(o.categoria === 'L' ? 'L' : o.categoria) + '</span>' +
      '<span class="almacen-cantidad">×' + hay + '</span>' +
      '<span class="almacen-icono ' + ui.claseFondo(o.categoria) + '">' + ui.icono(o.id) + '</span></button>';
  }

  /* Panel bajo la cuadrícula del objeto tocado: qué es, cuántos y vender. */
  function htmlPanelInventario(estado) {
    const id = ui.fichaInventario;
    const o = id && Libre.sim.buscarObjeto(id);
    if (!o) return '';
    const hay = (estado.objetos || {})[id] || 0;
    if (!hay) return '';
    const puestos = equipados(estado, id);
    return '<div class="almacen-panel ui-tarjeta">' +
      '<div class="almacen-panel-cabecera"><span class="almacen-icono ' + ui.claseFondo(o.categoria) + '">' + ui.icono(o.id) + '</span>' +
      '<span><strong>' + ui.esc(o.nombre) + '</strong><span class="' + ui.claseRareza(o.categoria) + '">' +
      ui.esc(Libre.sim.buscarCategoria(o.categoria).nombre) + '</span></span></div>' +
      '<p>' + ui.esc(o.descripcion) + '</p>' +
      (o.frase ? '<p class="almacen-frase">' + ui.esc(o.frase) + '</p>' : '') +
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
    if (!ui.combinarSel || ui.combinarSel.id !== o.id) {
      const cuenta = {};
      (Libre.sim.objetosParaCombinar(estado, o.id) || []).forEach(function (id) { cuenta[id] = (cuenta[id] || 0) + 1; });
      ui.combinarSel = { id: o.id, cuenta };
    }
    // Lo vendido o equipado entretanto deja de contar; nunca más de n.
    let total = 0;
    Object.keys(ui.combinarSel.cuenta).forEach(function (id) {
      const k = Math.min(ui.combinarSel.cuenta[id], (estado.objetos || {})[id] || 0, n - total);
      if (k > 0) { ui.combinarSel.cuenta[id] = k; total += k; } else delete ui.combinarSel.cuenta[id];
    });
    return { n, total, cuenta: ui.combinarSel.cuenta };
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
    const cabeza = '<p><strong>Combinar</strong> ' + n + ' de categoría ' + ui.esc(cat) + ' por uno al azar de categoría ' +
      '<span class="' + ui.claseRareza(siguiente.id) + '">' + ui.esc(siguiente.nombre) + '</span>. ';
    if (hay < n) {
      return '<div class="almacen-combinar">' + cabeza + 'Te ' + (n - hay === 1 ? 'falta 1' : 'faltan ' + (n - hay)) +
        ' de categoría ' + ui.esc(cat) + ' sin equipar.</p></div>';
    }
    const elegidos = [];
    Object.keys(sel.cuenta).forEach(function (id) { for (let i = 0; i < sel.cuenta[id]; i++) elegidos.push(id); });
    const filas = iguales.map(function (x) {
      const k = sel.cuenta[x.id] || 0;
      return '<li class="' + (k ? 'elegido' : '') + '"><span class="almacen-icono pequeno ' + ui.claseFondo(x.categoria) + '">' + ui.icono(x.id) + '</span>' +
        '<span><strong>' + ui.esc(x.nombre) + '</strong><small>' + estado.objetos[x.id] + ' sin equipar</small></span>' +
        '<span class="combinar-paso">' +
        '<button type="button" data-combinar-menos="' + x.id + '" aria-label="Gastar uno menos de ' + ui.esc(x.nombre) + '"' + (k ? '' : ' disabled') + '>−</button>' +
        '<output aria-label="' + ui.esc(x.nombre) + ' que se gastan">' + k + '</output>' +
        '<button type="button" data-combinar-mas="' + x.id + '" aria-label="Gastar uno más de ' + ui.esc(x.nombre) + '"' +
        (k < estado.objetos[x.id] && sel.total < n ? '' : ' disabled') + '>+</button></span></li>';
    }).join('');
    return '<div class="almacen-combinar">' + cabeza + 'Elige cuáles gastas: <strong>' + sel.total + ' de ' + n + '</strong>.</p>' +
      '<ul class="combinar-lista">' + filas + '</ul>' +
      '<button type="button" class="ui-boton ui-boton--principal boton-combinar" data-accion="combinarObjetos" data-args="' +
      o.id + '|' + elegidos.join(',') + '"' + (sel.total === n ? '' : ' disabled') + '>Combinar ' + n + ' → 1 ' +
      ui.esc(siguiente.nombre) + '</button></div>';
  }

  /* Botón de vender un objeto (del almacén, o de la bandeja con su posición). */
  function botonVenta(id, deBandeja) {
    const o = Libre.sim.buscarObjeto(id);
    const precio = Libre.sim.buscarCategoria(o.categoria).venta;
    return ui.boton('Vender · ' + ui.euros(precio), 'venderObjeto', deBandeja === undefined ? [id] : [id, deBandeja], 'ui-boton ui-boton--secundario boton-venta');
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
      return '<li><span class="almacen-icono pequeno ' + ui.claseFondo(o.categoria) + '">' + ui.icono(o.id) + '</span>' +
        '<span><strong>' + ui.esc(o.nombre) + '</strong><small><span class="' + ui.claseRareza(o.categoria) + '">' +
        ui.esc(o.categoria === 'L' ? 'L' : o.categoria) + '</span> ×' + estado.objetos[o.id] + '</small></span>' + botonVenta(o.id) + '</li>';
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
        return '<li><span class="almacen-icono pequeno ' + ui.claseFondo(o.categoria) + '">' + ui.icono(o.id) + '</span>' +
          '<span><strong>' + ui.esc(o.nombre) + '</strong><small><span class="' + ui.claseRareza(o.categoria) + '">' +
          ui.esc(o.categoria === 'L' ? 'L' : o.categoria) + '</span> Lo encontró ' + ui.esc(x.conductor) + '</small></span>' +
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

  const seccionAlmacen = {
    id: 'sec-almacen',
    firma: ui.firmaFlota,
    html: function (estado) {
      return '<div class="pantalla-titulo"><h2 class="ui-titulo ui-titulo--pantalla">Almacén</h2>' +
        // Lo que vale todo lo guardado (venta de almacén y bandeja).
        '<span class="almacen-valor" title="Lo que te darían si lo vendieras todo">Vale ' + ui.euros(Libre.sim.valorAlmacen(estado)) + '</span>' +
        '<span>Objetos ' + Libre.sim.objetosEnAlmacen(estado) + ' de ' + Libre.sim.capacidadAlmacen(estado) + '</span></div>' +
        htmlInventario(estado);
    }
  };

  /* Pestaña Conductores: reserva, licencias con sus turnos y la ficha. */

  Object.assign(ui, { htmlListaVenta, objetosDelAlmacen, seccionAlmacen });
})(globalThis);
