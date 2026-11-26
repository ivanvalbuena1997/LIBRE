/*
 * Libre · interfaz: pestaña Conductores (licencias, ficha, candidatos, comparar, coches y SL).
 * Parte de Libre.ui (ver la cabecera de js/interfaz.js).
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};
  const ui = Libre.ui = Libre.ui || {};

  ui.eligiendoConductor = null;
  // Conductor con la ficha abierta ('licencia|turno') o null.
  ui.fichaConductor = null;
  ui.cocheAbierto = null;   // id de la licencia cuya hoja del coche está abierta
  ui.eligiendoCoche = null; // id de la licencia para la que eliges gama (idea 23)
  // Objeto del almacén con su panel abierto (id) o null.
  ui.fichaInventario = null;
  // Lo que el jugador ha elegido gastar al combinar: { id del objeto abierto, cuenta: { id: n } }.
  ui.combinarSel = null;

  // ¿Está abierta la lista para vender objetos mientras contratas?
  ui.ventaParaContratar = false;
  // Conductor ('licencia|turno') al que estás eligiendo qué objeto equipar, o null.
  ui.equipando = null;
  // Qué hoja hay que enfocar al dibujarla (su botón de cerrar): 'ficha', 'candidatos', 'equipar'.
  ui.enfocarHoja = null;

  /*
   * Fila de un rasgo (ficha y candidatos): icono redondo verde o rojo, el
   * nombre y lo que hace.
   */
  function htmlFilaRasgo(tipo, id) {
    const rasgo = Libre.sim.buscarRasgo(id);
    if (!rasgo) return '';
    return '<div class="ficha-rasgo ' + tipo + '"><span class="ficha-rasgo-icono">' + ui.icono(id) + '</span>' +
      '<span><strong>' + (tipo === 'cualidad' ? '' : '<span class="solo-lector">Defecto: </span>') + ui.esc(rasgo.nombre) + '</strong>' +
      '<small>' + ui.esc(rasgo.descripcion) + '</small></span></div>';
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
  ui.comparando = null;

  /* Lo que hace falta para comparar a alguien: su turno, dónde está y qué es. */
  function aComparar(estado, clave) {
    const c = Libre.config;
    if (clave.indexOf('candidato|') === 0) {
      const x = Libre.sim.candidatos(estado)[Number(clave.split('|')[1])];
      return x ? { t: x, turno: null, donde: 'Candidato · ' + ui.euros(Libre.sim.precioCandidato(x)), candidato: true } : null;
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
    if (s.clave === 'cansancio') return s.factor === 1 ? 'Normal' : cambio(s.factor);
    if (s.clave === 'descanso') return Math.round(s.valor) + ' min';
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
    const cat = rarezaDe(x.t);
    return '<div class="comp-quien"><span class="cara-foto"><span class="retrato">' + Libre.retratos.svg(Libre.sim.caraDe(x.t)) + '</span>' +
      htmlCirculos(x.t) + '</span><strong>' + ui.esc(x.t.nombre) + '</strong>' +
      '<span class="comp-categoria">' + (cat ? '<span class="' + claseRareza(cat.id) + '">' + ui.esc(cat.nombre) + '</span>' : '') +
      ' Nivel ' + Libre.sim.nivelConductor(x.t) + '</span><small>' + ui.esc(x.donde) + '</small></div>';
  }

  function htmlHojaComparar(estado) {
    if (!ui.comparando) return '';
    const a = aComparar(estado, ui.comparando[0]);
    const b = aComparar(estado, ui.comparando[1]);
    if (!a || !b) { ui.comparando = null; return ''; }
    const sa = Libre.sim.statsConductor(estado, a.t, a.turno);
    const sb = Libre.sim.statsConductor(estado, b.t, b.turno);
    let ganaA = 0, ganaB = 0;
    const celda = function (texto, mejor) {
      return '<span class="comp-valor' + (mejor ? ' mejor' : '') + '">' + ui.esc(texto) + (mejor ? ' <span aria-label="mejor">▲</span>' : '') + '</span>';
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
      return '<div class="comp-fila"><span class="comp-nombre">' + ui.esc(NOMBRE_STAT[s.clave]) + '</span>' +
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
      return (x.t.objetos || []).map(function (id) { return ui.esc(Libre.sim.buscarObjeto(id).nombre); }).join('<br>') || '—';
    };
    const hecho = function (x, campo) {
      if (x.candidato) return '—';
      return campo === 'carreras' ? ui.numero(Math.floor(x.t.carreras || 0)) : ui.euros(x.t.facturado || 0);
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
      '<p class="comp-resumen">' + ui.esc(resumen) + '</p>' +
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
          opciones.push('<option value="' + l.id + '|' + tn + '">' + ui.esc(t.nombre) + ' · ' + ui.esc(Libre.sim.textoLicencia(l)) + ' · ' +
            ui.esc(c.turnos[tn].nombre) + '</option>');
        }
      });
    });
    (estado.reserva || []).forEach(function (t, k) {
      opciones.push('<option value="reserva|' + k + '">' + ui.esc(t.nombre) + ' · Reserva</option>');
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
    if (!ui.eligiendoConductor) return '';
    const c = Libre.config;
    const reserva = ui.eligiendoConductor === 'reserva';
    let lic = null, turno = null;
    if (!reserva) {
      const partes = ui.eligiendoConductor.split('|');
      lic = estado.licencias.find(function (l) { return String(l.id) === partes[0]; });
      turno = partes[1];
      if (!lic || lic.turnos[turno]) { ui.eligiendoConductor = null; return ''; }
    }
    let falta = false;
    const hayHuecoReserva = (estado.reserva || []).length < c.conductores.reserva;
    const tarjetas = Libre.sim.candidatos(estado).map(function (x, i) {
      const precio = Libre.sim.precioCandidato(x);
      const cat = rarezaDe(x);
      if (estado.dinero < precio) falta = true;
      return '<div class="candidato ui-tarjeta">' +
        '<div class="candidato-cabecera"><span class="cara-foto"><span class="retrato">' + Libre.retratos.svg(Libre.sim.caraDe(x)) + '</span>' +
        (cat ? '<span class="cara-categoria ' + claseRareza(cat.id) + '" aria-hidden="true">' + ui.esc(cat.letra) + '</span>' : '') +
        '</span><div><strong>' + ui.esc(x.nombre) + '</strong>' +
        (cat ? '<span class="' + claseRareza(cat.id) + '">' + ui.esc(cat.nombre) + '</span>' : '') + '</div></div>' +
        (x.unico ? htmlUnico(estado, x) : '<div class="ficha-rasgos">' + htmlFilasRasgos(x) + htmlFuerzaCategoria(x) + '</div>') +
        '<div class="candidato-pie">' +
        (lic ? ui.boton('Contratar · ' + ui.euros(precio), 'contratarConductor', [lic.id, turno, i], 'ui-boton ui-boton--principal', precio) : '') +
        (hayHuecoReserva
          ? ui.boton(lic ? 'A la reserva' : 'A la reserva · ' + ui.euros(precio), 'contratarAReserva', [i],
            'ui-boton ' + (lic ? 'ui-boton--secundario' : 'ui-boton--principal'), precio)
          : '') +
        '</div>' +
        (estado.dinero < precio ? '<p class="candidato-falta">Te faltan ' + ui.euros(precio - estado.dinero) + '</p>' : '') +
        htmlCompararCandidato(estado, i) +
        '</div>';
    }).join('');
    const hayObjetos = Libre.sim.objetosEnAlmacen(estado) > 0;
    const titulo = reserva ? 'Contratar · Reserva'
      : 'Contratar · Licencia ' + Libre.sim.textoLicencia(lic) + ' · ' + c.turnos[turno].nombre;
    return '<div class="hoja-fondo" data-cerrar-candidatos></div>' +
      '<div class="hoja hoja-candidatos" role="dialog" aria-modal="true" aria-labelledby="candidatos-titulo">' +
      '<span class="hoja-asa" aria-hidden="true"></span>' +
      '<div class="hoja-cabecera"><h3 id="candidatos-titulo">' + ui.esc(titulo) + '</h3>' +
      botonCerrarHoja('data-cerrar-candidatos', 'Cerrar los candidatos') + '</div>' +
      // Sin conductor en el turno y sin conducir tú: puedes cogerlo tú.
      (!reserva && !Libre.sim.conduce(estado)
        ? ui.boton('Conducir yo este turno', 'conducir', [lic.id, turno], 'ui-boton ui-boton--secundario ui-boton--ancho') : '') +
      htmlRebuscar(estado) +
      tarjetas +
      (falta && hayObjetos
        ? '<button type="button" class="ui-boton ui-boton--secundario ui-boton--ancho" data-venta-contratar aria-expanded="' +
          ui.ventaParaContratar + '">' + (ui.ventaParaContratar ? 'Cerrar la venta' : 'Vender objetos para contratar') + '</button>' +
          (ui.ventaParaContratar ? ui.htmlListaVenta(estado) : '')
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
    return ui.boton('Buscar otros candidatos · ' + ui.euros(precio), 'rebuscarCandidatos', [],
      'ui-boton ui-boton--secundario ui-boton--ancho candidatos-rebuscar', precio);
  }

  /* Baja, avería o parado, en una línea bajo el conductor. */
  function textoEstadoTurno(estado, lic, t) {
    const jornada = Libre.sim.jornadaDe(estado.reloj.minutos);
    if (lic && Libre.sim.trabajaIncognito(estado, lic, t, estado.reloj.minutos)) {
      return t.paradoHasta > estado.reloj.minutos ? 'Pillado por un pesetas: parado hasta las ' + ui.horaDe(t.paradoHasta)
        : 'Hoy libra su licencia: sale de incógnito';
    }
    if (lic && Libre.sim.libra(estado, lic)) return 'Hoy libra (libranza de la licencia)';
    if (lic && lic.averia && jornada < lic.averia.hasta) return 'Coche en el taller hasta el día ' + (lic.averia.hasta + 1);
    if (t.baja && jornada < t.baja.hasta) {
      const faltan = t.baja.hasta - jornada;
      return 'De baja: ' + (faltan === 1 ? 'falta 1 día' : 'faltan ' + faltan + ' días');
    }
    if (t.paradoHasta > estado.reloj.minutos) return (t.motivoParada === 'descanso' ? 'Descansando' : 'Parado') + ' hasta las ' + ui.horaDe(t.paradoHasta);
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
  /*
   * La rareza que se enseña de un conductor o candidato: la de su categoría
   * o, si es un ÚNICO, «ÚNICO» (granate). { id, nombre, letra } o null.
   */
  function rarezaDe(t) {
    if (t && t.unico) return { id: 'U', nombre: 'ÚNICO', letra: 'Ú' };
    const c = t && Libre.sim.buscarCategoria(t.categoria);
    return c ? { id: c.id, nombre: c.nombre, letra: c.id === 'L' ? 'L' : c.nombre } : null;
  }
  const NOMBRE_TURNO = function (id) { return Libre.config.turnos[id].nombre.toLowerCase(); };
  function pct(f) { return Math.round(f * 100) + ' %'; }
  /*
   * Ficha de un ÚNICO (candidato o conductor): quién es, una de sus frases,
   * sus habilidades (con la sinergia activa o la que le falta) y sus
   * debilidades. Todo sale de config.conductores.unicos.
   */
  function htmlUnico(estado, t) {
    const u = Libre.sim.unicoDe(t);
    if (!u) return '';
    const hab = [];
    if (u.tocayos) {
      const ahora = estado ? Libre.sim.bonoTocayos(estado, t) : 0;
      hab.push('<strong>Tocayos:</strong> +' + pct(u.tocayos.porCada) + ' en sus carreras por cada ' + u.tocayos.nombres.join(' o ') +
        ' con turno (hasta +' + pct(u.tocayos.maximo) + ').' + (ahora > 0 ? ' <em>Ahora: +' + pct(ahora) + '.</em>' : ''));
    }
    if (u.dobleTurno) hab.push('<strong>Doble turno:</strong> si va solo en su coche, hace el día y la noche del tirón.');
    if (u.plusKm) hab.push('<strong>Plus de kilómetros:</strong> ' + ui.euros(u.plusKm) + ' por cada km de su jornada, al cerrar la caja.');
    if (u.efecto && u.efecto.sinImpagos) hab.push('<strong>Nadie se le va sin pagar.</strong>');
    if (u.baja && !u.baja.prob) hab.push('<strong>Nunca se pone malo.</strong>');
    if (u.dirige) {
      const d = u.dirige;
      if (d.efecto && d.efecto.espera) hab.push('<strong>Segunda jefa:</strong> los demás conductores esperan un ' + pct(1 - d.efecto.espera) + ' menos entre carreras.');
      if (d.porcentaje) hab.push('<strong>Las cuentas claras:</strong> los conductores se quedan ' + Math.round(d.porcentaje * 100) + ' puntos menos de cada carrera.');
      if (d.efecto && d.efecto.baja) hab.push('<strong>Aquí no se escaquea nadie:</strong> un ' + pct(1 - d.efecto.baja) + ' menos de bajas en la flota.');
      Object.keys(d.sobre || {}).forEach(function (id) {
        const v = Libre.sim.buscarUnico(id);
        const s = d.sobre[id];
        hab.push('<strong>«¡' + ui.esc(v ? v.nombre : id) + ', a trabajar!»:</strong> si está en la flota, se pone malo la mitad' +
          (s.ajuste ? '… pero le revisa las cuentas: su ajuste de periodos anteriores, también a la mitad.' : '.'));
      });
    }
    (u.sinergias || []).forEach(function (s) {
      const o = Libre.sim.buscarObjeto(s.objeto);
      const activa = (t.objetos || []).indexOf(s.objeto) !== -1;
      // 'importe' no es un factor de los de siempre: lo que cobra por carrera.
      const resto = Object.assign({}, s.efecto);
      delete resto.importe;
      const partes = [];
      if (s.efecto.importe) partes.push('+' + pct(s.efecto.importe - 1) + ' en lo que cobra por carrera');
      if (Object.keys(resto).length) partes.push(textoEfecto(resto));
      hab.push('<strong>Con ' + ui.esc(o ? o.nombre : s.objeto) + ':</strong> ' + ui.esc(partes.join(', ')) + '. ' +
        (activa ? '<span class="ui-chip unico-activa">Sinergia activa</span>' : '<em>Te falta equipársela.</em>'));
    });
    if (u.ajuste) {
      hab.push('<strong>Ajuste de periodos anteriores:</strong> al cerrar la caja, un ' + pct(u.ajuste.min) + '–' + pct(u.ajuste.max) +
        ' más de lo que facturó.');
    }
    hab.push('<strong>Sin topes</strong> en sus estadísticas.');
    const deb = [];
    if (u.noConduce) deb.push('No conduce: ocupa un turno y ese turno el coche se queda parado.');
    if (u.paga) deb.push('Paga y chuches: ' + ui.euros(u.paga) + ' al cerrar cada jornada.');
    if (u.soloTurno) deb.push('Solo trabaja en el turno de ' + NOMBRE_TURNO(u.soloTurno) + '.');
    if (u.combustible > 1) deb.push('Gasta un ' + pct(u.combustible - 1) + ' más de combustible: le gusta ir rápido.');
    if (u.kmExtra) deb.push('Hace un ' + pct(u.kmExtra) + ' más de km: vuelve en vacío de los viajes largos y usa el coche para lo suyo.');
    if (u.efecto && u.efecto.pinchazo > 1) deb.push('Sufre un ' + pct(u.efecto.pinchazo - 1) + ' más de pinchazos.');
    if (u.baja && u.baja.prob && u.baja.texto) deb.push('El ' + pct(u.baja.prob) + ' de las jornadas no viene («' + ui.esc(u.baja.texto) + '») y ese día no dirige.');
    else if (u.baja && u.baja.prob) deb.push('Se pone malo en el ' + pct(u.baja.prob) + ' de sus turnos (bajas de ' + u.baja.jornadasMin + '–' + u.baja.jornadasMax + ' jornadas).');
    if (u.sinIncognito) deb.push('Nunca trabaja de incógnito.');
    (u.incompatibles || []).forEach(function (i) {
      const v = Libre.sim.buscarUnico(i.id || i);
      deb.push('No comparte coche con ' + ui.esc(v ? v.nombre : i.nombre || i.id || i) + '.');
    });
    // Una frase suya, la misma durante la jornada (sin parpadear al redibujar).
    const jornada = estado ? Libre.sim.jornadaDe(estado.reloj.minutos) : 0;
    const frase = u.frases && u.frases.length ? u.frases[jornada % u.frases.length] : '';
    return '<div class="unico">' +
      (u.descripcion ? '<p class="unico-quien">' + ui.esc(u.descripcion) + '</p>' : '') +
      (frase ? '<p class="unico-frase">«' + ui.esc(frase) + '»</p>' : '') +
      '<p class="unico-titulo">Habilidades</p><ul class="unico-lista unico-hab">' + hab.map(function (h) { return '<li>' + h + '</li>'; }).join('') + '</ul>' +
      '<p class="unico-titulo">Debilidades</p><ul class="unico-lista unico-deb">' + deb.map(function (d) { return '<li>' + d + '</li>'; }).join('') + '</ul>' +
      '</div>';
  }

  function htmlCirculos(t) {
    const cat = rarezaDe(t);
    const letra = cat ? cat.letra : '';
    return (cat ? '<span class="cara-categoria ' + claseRareza(cat.id) + '" aria-hidden="true">' + ui.esc(letra) + '</span>' : '') +
      '<span class="cara-nivel" aria-hidden="true">' + Libre.sim.nivelConductor(t) + '</span>';
  }

  function htmlCara(estado, clave, t, lic) {
    const aviso = textoEstadoTurno(estado, lic, t);
    const cat = rarezaDe(t);
    const mover = Libre.sim.enPausa(estado) ? ' data-arrastrable data-destino="' + clave + '"' : '';
    return '<button type="button" class="cara' + (aviso ? ' con-aviso' : '') + '" data-ficha-conductor="' + clave + '"' + mover +
      ' title="' + ui.esc(t.nombre + (aviso ? ' · ' + aviso : '')) + '"' +
      ' aria-label="' + ui.esc(t.nombre + ', categoría ' + (cat ? cat.nombre : '') + ', nivel ' + Libre.sim.nivelConductor(t) +
        (aviso ? ', ' + aviso : '') + '. Ver su ficha') + '">' +
      '<span class="cara-foto"><span class="retrato' + (aviso ? ' atenuado' : '') + '">' + Libre.retratos.svg(Libre.sim.caraDe(t)) + '</span>' +
      htmlCirculos(t) + (aviso ? '<span class="cara-aviso" aria-hidden="true">!</span>' : '') + '</span>' +
      '<span class="cara-nombre">' + ui.esc(t.nombre) + '</span></button>';
  }

  /* Icono «+» de los huecos para contratar. */
  const ICONO_MAS = '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';


  ui.panelTu = null;

  /* Un turno de la licencia: su icono y la cara de quien lo lleva (o un hueco). */
  function htmlHuecoTurno(estado, lic, turno) {
    const c = Libre.config;
    const t = lic.turnos[turno];
    const clave = lic.id + '|' + turno;
    const pausa = Libre.sim.enPausa(estado);
    let cara;
    if (!t) {
      const abierto = ui.eligiendoConductor === clave;
      // Turno vacío que cubre un ÚNICO con doble turno (El Pelado): sigue
      // libre para contratar, pero se ve que lo hace él.
      const dobla = Libre.sim.enTurno(lic, turno);
      cara = '<button type="button" class="cara cara-vacia' + (dobla ? ' cara-doble' : '') + '" data-elegir-conductor="' + clave + '" aria-expanded="' + abierto + '"' +
        (pausa ? ' data-destino="' + clave + '"' : '') + ' data-precio="' + ui.precioMasBarato(estado) + '"' +
        ' aria-label="Turno de ' + ui.esc(c.turnos[turno].nombre.toLowerCase()) + ' libre' +
        (dobla ? ' (lo dobla ' + ui.esc(dobla.nombre) + ')' : '') + ': contratar">' +
        (dobla
          ? '<span class="cara-foto"><span class="retrato atenuado">' + Libre.retratos.svg(Libre.sim.caraDe(dobla)) + '</span></span><span class="cara-nombre">Doble</span></button>'
          : '<span class="cara-foto"><span class="retrato retrato-texto">' + ICONO_MAS + '</span></span><span class="cara-nombre">Libre</span></button>');
    } else if (t.quien === 'jugador') {
      cara = '<button type="button" class="cara" data-panel-tu="' + clave + '" aria-expanded="' + (ui.panelTu === clave) + '"' +
        ' aria-label="Tu turno: zona y opciones">' +
        '<span class="cara-foto">' + ui.htmlCaraTu(estado) + '</span><span class="cara-nombre">' + ui.esc(Libre.sim.nombrePersonaje(estado)) + '</span></button>';
    } else {
      cara = htmlCara(estado, clave, t, lic);
    }
    return '<div class="hueco-turno turno-' + turno + '" title="' + ui.esc(c.turnos[turno].nombre + ', ' + ui.horario(turno)) + '">' +
      ui.icono(turno, 'icono-turno') + cara + '</div>';
  }

  /* Tu turno, desplegado bajo la licencia: zona, cambiar de turno, dejar de conducir. */
  function htmlPanelTu(estado, lic, turno) {
    const c = Libre.config;
    const t = lic.turnos[turno];
    const otro = turno === 'dia' ? 'noche' : 'dia';
    return '<div class="panel-tu"><span>Tu turno de ' + ui.esc(c.turnos[turno].nombre.toLowerCase()) + ' · zona</span>' +
      ui.selectorZona(estado, lic.id, turno, t.zona) +
      (lic.turnos[otro] ? '' : ui.boton('Pasar a ' + c.turnos[otro].nombre.toLowerCase(), 'cambiarTurnoJugador', [])) +
      // Dejar el volante es una mejora (Oficina de gestión).
      (Libre.sim.modificadores(estado).dejarVolante ? ui.boton('Dejar de conducir', 'dejarDeConducir', []) : '') + '</div>';
  }

  /*
   * Reserva: conductores contratados que no trabajan, en una fila de caras.
   * Se contrata aquí directamente y, entre jornadas, se les da un turno.
   */
  function htmlReserva(estado) {
    const max = Libre.config.conductores.reserva;
    const reserva = estado.reserva || [];
    const abierto = ui.eligiendoConductor === 'reserva';
    const pausa = Libre.sim.enPausa(estado);
    const huecos = [];
    reserva.forEach(function (t, i) { huecos.push(htmlCara(estado, 'reserva|' + i, t, null)); });
    // Los huecos libres: tocarlos abre los candidatos; entre jornadas, se puede soltar ahí.
    for (let i = reserva.length; i < max; i++) {
      huecos.push('<button type="button" class="cara cara-vacia" data-elegir-conductor="reserva" aria-expanded="' + abierto + '"' +
        (pausa ? ' data-destino="reserva"' : '') +
        ' aria-label="Hueco libre en la reserva: contratar desde ' + ui.euros(ui.precioMasBarato(estado)) + '">' +
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
    return '<button type="button" class="ui-boton ui-boton--secundario" data-coger="' + ui.fichaConductor + '">Cambiar de sitio</button>';
  }

  /* Lo que cambia su categoría: cualidad reforzada y defecto suavizado. */
  function htmlFuerzaCategoria(t) {
    const cat = Libre.sim.buscarCategoria(t.categoria);
    if (!cat || (cat.fuerzaCualidad === 1 && cat.fuerzaDefecto === 1)) return '';
    const nCualidades = Libre.sim.cualidadesDe(t).length;
    const nDefectos = Libre.sim.defectosDe(t).length;
    // «Categoría A: cualidad ×1,2 · defecto ×0,85» (maqueta).
    const partes = [(nCualidades > 1 ? 'cualidades' : 'cualidad') + ' ×' + ui.factor(cat.fuerzaCualidad)];
    if (nDefectos) partes.push((nDefectos > 1 ? 'defectos' : 'defecto') + ' ×' + ui.factor(cat.fuerzaDefecto));
    return '<p class="ficha-fuerza">Categoría ' + ui.esc(cat.nombre) + ': ' + partes.join(' · ') + '</p>';
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
      return 'Descansa hasta las ' + ui.dos(v.hora) + ':' + ui.dos(v.minuto);
    }
    return Math.round(Libre.sim.energia(estado, t) / Libre.config.cansancio.maximo * 100) + ' %';
  }
  function htmlEnergia(estado, t) {
    const pct = Libre.sim.energia(estado, t) / Libre.config.cansancio.maximo * 100;
    return '<div class="ficha-energia"><strong>Energía</strong>' +
      '<span class="ui-barra energia-barra' + (pct < 25 ? ' energia-baja' : '') + '" role="progressbar" aria-label="Energía" ' +
      'aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct) + '" data-energia="' + ui.fichaConductor + '">' +
      '<span class="ui-barra-relleno" style="width:' + pct.toFixed(0) + '%"></span></span>' +
      '<small id="ficha-energia">' + textoEnergia(estado, t) + '</small></div>';
  }

  function htmlFichaConductor(estado) {
    const x = conductorDe(estado, ui.fichaConductor);
    if (!x) return '';
    const c = Libre.config;
    const t = x.t, lic = x.lic, turno = x.turno, licId = x.licId;
    const p = ui.nivelDe(t);
    const huecos = Libre.sim.huecosConductor(t);
    const llevados = t.objetos || [];
    const disponibles = c.objetos.lista.filter(function (o) {
      return ((estado.objetos || {})[o.id] || 0) > 0 && llevados.indexOf(o.id) === -1;
    });
    const tabla = c.conductores.niveles.huecos;
    const cat = rarezaDe(t);

    // Mosaico de 3 huecos: objetos puestos, «Equipar» y los que llegan con el nivel.
    const casillas = llevados.map(function (id) {
      const o = Libre.sim.buscarObjeto(id);
      return '<div class="ficha-objeto" title="' + ui.esc(o.descripcion) + '">' +
        '<span class="ficha-objeto-rareza ' + claseRareza(o.categoria) + '">' + ui.esc(o.categoria === 'L' ? 'L' : o.categoria) + '</span>' +
        ui.boton('<svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>', 'quitarObjeto',
          [licId, turno, o.id], 'ficha-objeto-quitar').replace('<button ', '<button aria-label="Quitar ' + ui.esc(o.nombre) + '" ') +
        '<span class="ficha-objeto-icono fondo-' + (o.categoria === 'S+' ? 'Smas' : o.categoria) + '">' + ui.icono(o.id) + '</span>' +
        '<strong>' + ui.esc(o.nombre) + '</strong><small>' + ui.esc(textoEfecto(o.efecto)) + '</small></div>';
    });
    for (let i = llevados.length; i < huecos; i++) {
      casillas.push(disponibles.length
        ? '<button type="button" class="ficha-objeto ficha-objeto--equipar" data-equipar="' + ui.fichaConductor + '">' +
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
      '<div class="ficha-cabecera"><span class="cara-foto grande"><span class="retrato">' + Libre.retratos.svg(Libre.sim.caraDe(t)) + '</span>' +
      htmlCirculos(t) + '</span><div class="ficha-quien">' +
      '<h3 id="ficha-nombre">' + ui.esc(t.nombre) + '</h3>' +
      '<p>' + (cat ? '<span class="' + claseRareza(cat.id) + '">' + ui.esc(cat.nombre) + '</span>' : '') +
      (x.enReserva ? 'En la reserva'
        : 'Licencia ' + ui.esc(Libre.sim.textoLicencia(lic)) + ' · ' + ui.esc(c.turnos[turno].nombre) + ' ' +
          ui.dos(c.turnos[turno].horaInicio) + '–' + ui.dos(c.turnos[turno].horaFin)) + '</p>' +
      (aviso ? '<p class="turno-estado">' + aviso + '</p>' : '') + '</div>' +
      botonCerrarHoja('data-cerrar-ficha', 'Cerrar la ficha') + '</div>' +
      '<div class="ficha-nivel"><strong>Nivel ' + p.nivel + '</strong>' +
      '<span class="ui-barra ui-barra--marca xp-barra" role="progressbar" aria-label="' + ui.textoExperiencia(p) + '" aria-valuemin="0" ' +
      'aria-valuemax="100" aria-valuenow="' + Math.round(p.avance * 100) + '" data-xp="' + ui.fichaConductor + '">' +
      '<span class="ui-barra-relleno" style="width:' + (p.avance * 100).toFixed(0) + '%"></span></span>' +
      '<small id="ficha-xp">' + textoXpCorto(p) + '</small></div>' +
      (x.enReserva ? '' : htmlEnergia(estado, t)) +
      (t.unico ? htmlUnico(estado, t) : '<div class="ficha-rasgos">' + htmlFilasRasgos(t) + htmlFuerzaCategoria(t) + '</div>') +
      '<div class="ficha-objetos-bloque"><strong>Objetos <span>· ' + llevados.length + ' de ' + huecos +
      (huecos === 1 ? ' hueco' : ' huecos') + '</span></strong>' +
      '<div class="ficha-objetos">' + casillas.join('') + '</div></div>' +
      // Iván, 20-11-2026: los datos y los botones, antes de las estadísticas
      // (antes había que bajar toda la lista para llegar a ellos).
      '<div class="ficha-datos">' +
      '<div><span>Carreras</span><strong id="ficha-carreras"></strong></div>' +
      '<div><span>Facturado</span><strong id="ficha-facturado"></strong></div>' +
      '<div title="' + ui.esc(Libre.sim.modificadores(estado).gestionZonas
        ? 'Con el Curso gestión de zonas va cada hora a la que más te deja.'
        : 'Elige su propia zona, al azar entre las que tienen clientes.') + '"><span>Ahora en</span><strong>' + ui.esc(zona) + '</strong></div>' +
      '</div>' +
      (Libre.sim.todosLosConductores(estado).length > 1
        ? '<button type="button" class="ui-boton ui-boton--secundario ui-boton--ancho" data-comparar="' + ui.fichaConductor + '">' +
          'Comparar con otro conductor</button>' : '') +
      '<div class="ficha-acciones">' + htmlMoverConductor(estado, x) +
      ui.boton('Despedir · ' + ui.euros(coste), 'despedirConductor', [licId, turno], 'ui-boton ui-boton--peligro', coste) + '</div>' +
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
    const x = ui.equipando && conductorDe(estado, ui.equipando);
    if (!x || ui.fichaConductor !== ui.equipando) { ui.equipando = null; return ''; }
    const llevados = x.t.objetos || [];
    const lista = ui.objetosDelAlmacen(estado).map(function (o) {
      const lleva = llevados.indexOf(o.id) !== -1;
      const contenido = '<span class="ficha-objeto-rareza ' + claseRareza(o.categoria) + '">' + ui.esc(o.categoria === 'L' ? 'L' : o.categoria) + '</span>' +
        '<span class="ficha-objeto-cantidad">×' + estado.objetos[o.id] + '</span>' +
        '<span class="ficha-objeto-icono fondo-' + (o.categoria === 'S+' ? 'Smas' : o.categoria) + '">' + ui.icono(o.id) + '</span>' +
        '<strong>' + ui.esc(o.nombre) + '</strong><small>' + ui.esc(lleva ? 'Ya lo lleva' : textoEfecto(o.efecto)) + '</small>';
      return lleva
        ? '<span class="ficha-objeto ficha-objeto--puesto" title="' + ui.esc(o.descripcion) + '">' + contenido + '</span>'
        : '<button type="button" class="ficha-objeto" data-accion="equiparObjeto" data-args="' + x.licId + '|' + x.turno + '|' + o.id + '"' +
          ' title="' + ui.esc(o.descripcion + (o.frase ? ' ' + o.frase : '')) + '" aria-label="Equipar ' + ui.esc(o.nombre) + ': ' + ui.esc(textoEfecto(o.efecto)) + '">' +
          contenido + '</button>';
    }).join('');
    return '<div class="hoja-fondo hoja-encima" data-cerrar-equipar></div>' +
      '<div class="hoja hoja-encima hoja-equipar" role="dialog" aria-modal="true" aria-labelledby="equipar-titulo">' +
      '<span class="hoja-asa" aria-hidden="true"></span>' +
      '<div class="hoja-cabecera"><h3 id="equipar-titulo">Equipar a ' + ui.esc(x.t.nombre) + '</h3>' +
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
    importeLluvia: 'lo que cobra con lluvia', cansancio: 'cansancio', descanso: 'descansos'
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
    importeLluvia: 'Cobra con lluvia', cansancio: 'Cansancio', descanso: 'Descanso'
  };
  const MAS_ES_MEJOR = { propina: true, objeto: true, hallazgo: true, suerte: true, importeLluvia: true };
  const NOMBRE_TIPO_FUENTE = { cualidad: 'Cualidad', defecto: 'Defecto', objeto: 'Objeto', nivel: '', mejora: 'Mejora', categoria: '', coche: '', sinergia: '', unico: '' };

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
    if (s.clave === 'cansancio') return s.factor === 1 ? 'Normal' : cambio(s.factor);
    if (s.clave === 'descanso') return Math.round(s.valor) + ' min cada vez';
    if (s.clave === 'suerte') return porcentaje(s.valor) + ' de lo que encuentra';
    if (s.clave === 'importeLluvia') {
      return s.factor === 0 ? 'No trabaja si llueve' : '×' + s.factor.toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' si llueve';
    }
    if (s.clave === 'limpieza') {
      return ui.euros(s.valor.costeMin) + '–' + ui.euros(s.valor.costeMax) + ' · ' + Math.round(s.valor.minutos) + ' min parado';
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
      return '<div class="stat' + sentido + '"><span class="stat-nombre">' + ui.esc(NOMBRE_STAT[s.clave]) + '</span>' +
        '<strong class="stat-valor">' + ui.esc(textoStat(s)) + '</strong>' +
        '<small class="stat-desglose">' + ui.esc(desglose) + '</small></div>';
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
        : '<span>Su coche · ' + ui.numero(Math.floor(e.km)) + ' km · ' + NIVEL_COCHE[e.nivel] + '</span>' +
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
    return JSON.stringify([Libre.sim.enPausa(estado), estado.personaje.nombre, estado.personaje.aspecto, estado.licencias.map(function (l) {
      return [l.id, l.numero, l.vehiculo, l.averia && jornada < l.averia.hasta ? l.averia.hasta : 0,
        ['dia', 'noche'].map(function (tn) {
          const t = l.turnos[tn];
          return t ? [t.quien, t.nombre, t.retrato, t.zona, t.baja && jornada < t.baja.hasta ? t.baja.hasta : 0,
            t.paradoHasta > estado.reloj.minutos, t.cualidad, t.cualidad2, t.cualidad3, t.defecto, t.defecto2, t.categoria,
            t.quien === 'conductor' ? Libre.sim.nivelConductor(t) : 0, t.objetos] : null;
        })];
    }), !!estado.jugador.carrera, estado.mejoras, jornada, estado.objetos, estado.bandeja, ui.eligiendoConductor,
    ui.eligiendoConductor ? estado.candidatos : null, ui.ventaParaContratar, ui.fichaConductor, ui.fichaInventario, ui.equipando, ui.comparando,
    ui.eligiendoPlaca, ui.eligiendoPlaca ? Libre.sim.placasEnVenta(estado) : null, ui.panelTu, ui.cocheAbierto, ui.combinarSel,
    ui.eligiendoCoche, Libre.sim.gamasDisponibles(estado),
    ui.montandoSL, estado.empresa,
    estado.licencias.map(function (l) {
      const e = Libre.sim.estadoCoche(estado, l);
      // Abierta, la hoja cambia con cada 1.000 km; cerrada, solo el color del estado.
      if (!e) return null;
      if (e.nivel === 'alquilado') return ['alquilado', e.quedan];
      return ui.cocheAbierto === l.id ? [e.nivel, Math.floor(e.km / 1000)] : e.nivel;
    }),
    (estado.reserva || []).map(function (t) {
      return [t.nombre, t.retrato, t.categoria, t.cualidad, t.cualidad2, t.cualidad3, t.defecto, t.defecto2,
        Libre.sim.nivelConductor(t), t.objetos,
        t.baja && jornada < t.baja.hasta ? t.baja.hasta : 0];
    })]);
  }


  function textoLibranza(numero) {
    const c = Libre.config;
    const dia = c.reloj.diasSemana[c.licencias.diaPorLetra[Libre.sim.letraLicencia(numero)]].toLowerCase();
    return 'Libra los ' + dia + ' · fin de semana: los días ' + (numero % 2 === 0 ? 'impares' : 'pares');
  }

  // ¿Está abierta la elección de placa para comprar una licencia?
  ui.eligiendoPlaca = false;

  /* Comprar licencia: un botón que abre las placas a elegir, cada una con su libranza. */
  function htmlComprarLicencia(estado) {
    const c = Libre.config;
    if (estado.licencias.length >= c.licencias.maximo) return '<p class="ayuda">Ya tienes todas las licencias de Madrid.</p>';
    // Con 3 licencias, antes de la 4.ª hay que montar la SL (idea 1).
    if (Libre.sim.necesitaSociedad(estado)) {
      const coste = c.sociedad.coste;
      return '<button type="button" class="licencia-comprar licencia-sl" data-montar-sl data-precio="' + coste + '">' + ICONO_MAS +
        '<span>Montar una SL</span><small>' + ui.euros(coste) + ' · para la 4.ª licencia</small></button>';
    }
    const precio = Libre.sim.precioLicencia(estado);
    if (!ui.eligiendoPlaca) {
      return '<button type="button" class="licencia-comprar" data-elegir-placa data-precio="' + precio + '">' + ICONO_MAS +
        '<span>Comprar licencia</span><small>' + ui.euros(precio) + '</small></button>';
    }
    return '<div class="placas-venta"><div class="placas-titulo"><strong>Elige la placa</strong>' +
      '<button type="button" data-elegir-placa>Cerrar</button></div>' +
      Libre.sim.placasEnVenta(estado).map(function (numero, i) {
        return '<div class="placa-opcion"><span class="placa">' + ui.esc(Libre.sim.textoLicencia({ numero })) + '</span>' +
          '<small>' + ui.esc(textoLibranza(numero)) + '</small>' +
          ui.boton('Comprar · ' + ui.euros(precio), 'comprarLicencia', ['', i], '', precio) + '</div>';
      }).join('') + '</div>';
  }

  /*
   * Licencia en una línea: su placa (con la libranza en el título) y los dos
   * turnos. Debajo, si toca, los candidatos de un turno libre o tu panel.
   */
  function htmlLicencia(estado, lic) {
    const c = Libre.config;
    const tuAbierto = ['dia', 'noche'].find(function (t) {
      return ui.panelTu === lic.id + '|' + t && lic.turnos[t] && lic.turnos[t].quien === 'jugador';
    });
    const abierta = tuAbierto;
    return '<div class="licencia ui-tarjeta' + (abierta ? ' abierta' : '') + '" data-licencia="' + lic.id + '">' +
      '<div class="licencia-placa"><span class="placa" title="' + ui.esc(textoLibranza(lic.numero)) + '">' +
      ui.esc(Libre.sim.textoLicencia(lic)) + '</span>' +
      (Libre.sim.libra(estado, lic) ? '<span class="hoy-libra">Libra</span>' : '') + '</div>' +
      // Kilometraje del coche (Iván, 19-11-2026); el bucle lo pone al día.
      // Tocarlo abre la hoja del coche (idea 7): estado, riesgo y «Renovar».
      // Pastilla del color de su estado con el coche, los km y «›» (Iván, 19-11-2026).
      (lic.vehiculo ? '<button type="button" class="licencia-km coche--' + Libre.sim.estadoCoche(estado, lic).nivel +
        '" data-coche="' + lic.id + '" aria-label="Ver el coche de la licencia ' + ui.esc(Libre.sim.textoLicencia(lic)) + '">' +
        htmlCocheMini(lic) +
        (lic.alquiler
          // Corto para que quepa: «Alquiler · 3 días» (la hoja lo explica).
          ? '<span class="licencia-km-texto">Alquiler · ' + Libre.sim.jornadasAlquiler(estado, lic) +
            (Libre.sim.jornadasAlquiler(estado, lic) === 1 ? ' día' : ' días') + '</span>'
          : '<span class="licencia-km-texto"><span data-km-licencia="' + lic.id + '">' + ui.numero(Math.floor(lic.km || 0)) + '</span> km</span>') +
        '<span class="licencia-km-flecha" aria-hidden="true">›</span></button>' : '') +
      // Sin coche pero con gente (tras una avería definitiva o un alquiler
      // devuelto), los turnos se siguen viendo: esperan al coche.
      (lic.vehiculo || lic.turnos.dia || lic.turnos.noche
        ? '<div class="licencia-turnos">' + htmlHuecoTurno(estado, lic, 'dia') + htmlHuecoTurno(estado, lic, 'noche') + '</div>' : '') +
      (lic.vehiculo ? ''
        : '<div class="licencia-sin-coche">' + botonComprarCoche(estado, lic, 'Coche') +
          // Alquilar (idea 5, Iván 20-11-2026): un apaño de pocas jornadas.
          ui.botonCompra('Alquilar', Libre.sim.precioAlquiler(estado), 'alquilarCoche', [lic.id]) +
          '<small class="sin-coche-nota">Alquiler de ' + Libre.config.vehiculos.alquiler.jornadas + ' días</small></div>') +
      (tuAbierto ? htmlPanelTu(estado, lic, tuAbierto) : '') + '</div>';
  }

  /*
   * Hoja del coche de una licencia (idea 7, Iván 19-11-2026): km, estado,
   * averías por los km, riesgo de avería definitiva, lo que te dan por él y
   * «Renovar» (con el día cerrado).
   */
  // Trazo de un coche (el mismo que el de la mejora Leasing).
  /* El coche de una licencia en miniatura (su ilustración) o, sin ella, el icono. */
  function htmlCocheMini(lic) {
    const m = Libre.sim.modeloCoche(lic.vehiculo);
    return m.imagen ? '<img class="coche-mini" src="' + ui.esc(m.imagen) + '" alt="">'
      : '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true">' + ICONO_COCHE + '</svg>';
  }
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
      fila('Kilómetros', ui.numero(Math.floor(e.km)) + ' km', 'Los que lleva contigo', '') +
      '</div>' +
      ui.boton('Alquilar ' + a.jornadas + ' jornadas más · ' + ui.euros(alquiler), 'alquilarCoche', [lic.id],
        'ui-boton ui-boton--secundario ui-boton--ancho', alquiler) +
      (Libre.sim.gamasDisponibles(estado).length > 1
        ? '<button type="button" class="ui-boton ui-boton--principal ui-boton--ancho" data-elegir-coche="' + lic.id + '">Comprar uno propio ›</button>'
        : ui.boton('Comprar uno propio · ' + ui.euros(precio), 'comprarVehiculo', [lic.id], 'ui-boton ui-boton--principal ui-boton--ancho', precio)) +
      '<p class="coche-nota">Si compras uno, devuelves el de alquiler y pierdes lo que quedaba.</p>';
  }
  /*
   * Gamas de coche (idea 23, Iván 24-11-2026): con más de una desbloqueada,
   * «Coche» abre una hoja para elegir; con solo el Corolla, compra directa.
   */
  function botonComprarCoche(estado, lic, texto) {
    if (Libre.sim.gamasDisponibles(estado).length <= 1) {
      return ui.botonCompra(texto, Libre.sim.precioCoche(estado), 'comprarVehiculo', [lic.id]);
    }
    return '<button type="button" class="boton-compra" data-elegir-coche="' + lic.id + '"><span>' + texto +
      '</span><span class="precio">Elegir ›</span></button>';
  }
  function htmlHojaElegirCoche(estado) {
    const lic = ui.eligiendoCoche && estado.licencias.find(function (l) { return l.id === ui.eligiendoCoche; });
    if (!lic || (lic.vehiculo && !lic.alquiler)) return '';
    const sim = Libre.sim;
    const tarjetas = sim.gamasDisponibles(estado).map(function (id) {
      const m = Libre.config.vehiculos.modelos[id];
      const precio = sim.precioCoche(estado, false, id);
      const coste = sim.costePorKm(estado, id) * 100;
      return '<div class="ui-tarjeta gama">' +
        (m.imagen ? '<img class="gama-imagen" src="' + ui.esc(m.imagen) + '" alt="">' : '') +
        '<div class="gama-titulo"><strong>' + ui.esc(m.nombre) + '</strong>' +
        (m.electrico ? '<span class="ui-chip">Eléctrico</span>' : '') + '</div>' +
        (m.descripcion ? '<p>' + ui.esc(m.descripcion) + '</p>' : '<p>El de siempre: el coche más usado por los taxistas.</p>') +
        '<p class="gama-dato">' + (m.electrico ? 'Carga' : 'Combustible') + ': ' + ui.euros(coste) + ' cada 100 km</p>' +
        ui.boton('Comprar · ' + ui.euros(precio), 'comprarVehiculo', [lic.id, id], 'ui-boton ui-boton--principal ui-boton--ancho', precio) +
        '</div>';
    }).join('');
    return '<div class="hoja-fondo" data-cerrar-elegir-coche></div>' +
      '<div class="hoja hoja-gamas" role="dialog" aria-modal="true" aria-labelledby="gamas-titulo">' +
      '<span class="hoja-asa" aria-hidden="true"></span>' +
      '<div class="hoja-cabecera"><h3 id="gamas-titulo">Coche para la licencia ' + ui.esc(sim.textoLicencia(lic)) + '</h3>' +
      botonCerrarHoja('data-cerrar-elegir-coche', 'Cerrar') + '</div>' + tarjetas +
      '<p class="coche-nota">Cada coche propio sube el precio de los siguientes un ' +
      Math.round((Libre.config.vehiculos.factorSubida - 1) * 100) + ' %, sea de la gama que sea.</p></div>';
  }
  function htmlHojaCoche(estado) {
    const lic = ui.cocheAbierto && estado.licencias.find(function (l) { return l.id === ui.cocheAbierto; });
    const e = Libre.sim.estadoCoche(estado, lic);
    if (!e) return '';
    const ev = Libre.config.eventos;
    const fila = function (nombre, valor, desglose, clase) {
      return '<div class="stat' + (clase || '') + '"><span class="stat-nombre">' + ui.esc(nombre) + '</span>' +
        '<strong class="stat-valor">' + ui.esc(valor) + '</strong>' + (desglose ? '<small class="stat-desglose">' + ui.esc(desglose) + '</small>' : '') + '</div>';
    };
    const mal = e.nivel === 'gastado' || e.nivel === 'limite' ? ' stat--mal' : '';
    const pausa = Libre.sim.enPausa(estado);
    const cabeza = '<div class="hoja-fondo" data-cerrar-coche></div>' +
      '<div class="hoja hoja-coche" role="dialog" aria-modal="true" aria-labelledby="coche-titulo">' +
      '<span class="hoja-asa" aria-hidden="true"></span>' +
      '<div class="hoja-cabecera"><h3 id="coche-titulo">' + ui.esc(Libre.config.vehiculos.modelos[lic.vehiculo].nombre) +
      (lic.alquiler ? ' de alquiler' : '') + ' · ' + ui.esc(Libre.sim.textoLicencia(lic)) + '</h3>' +
      botonCerrarHoja('data-cerrar-coche', 'Cerrar') + '</div>';
    if (lic.alquiler) return cabeza + htmlHojaAlquilado(estado, lic, e, fila) + '</div>';
    return cabeza +
      '<div class="stats-lista">' +
      fila('Kilómetros', ui.numero(Math.floor(e.km)) + ' km', '', '') +
      fila('Estado', NIVEL_COCHE[e.nivel], e.probRotura > 0 ? 'Cuantos más km, más se rompe' :
        'Sin riesgo de avería definitiva hasta los ' + ui.numero(ev.rotura.kmDesde) + ' km', mal) +
      fila('Avería definitiva', porcentaje(e.probRotura) + ' de los turnos',
        'Va al desguace (' + ui.euros(ev.rotura.chatarra) + ' de chatarra) y tienes que comprar otro coche', e.probRotura > 0 ? ' stat--mal' : '') +
      fila('Averías', porcentaje(ev.averia.probTurno * e.factorAveria) + ' de los turnos',
        'Kilómetros del coche ' + cambio(e.factorAveria) + ' (y lo que cambie cada conductor)', e.factorAveria > 1 ? ' stat--mal' : '') +
      fila('Te dan por él', ui.euros(e.venta), 'Menos cuantos más km tenga; como poco, la chatarra', '') +
      '</div>' +
      ui.boton('Renovar coche · ' + ui.euros(e.precioRenovar), 'renovarCoche', [lic.id], 'ui-boton ui-boton--principal ui-boton--ancho', e.precioRenovar)
        .replace('<button ', '<button data-solo-pausa ') +
      '<p class="coche-nota">' + (pausa ? 'Compras uno nuevo a 0 km y vendes este.'
        : 'Solo puedes renovarlo con el día cerrado: cuando se cierre la caja.') + '</p>' +
      '</div>';
  }

  /*
   * Montar la sociedad limitada (idea 1, Iván 20-11-2026): hoja con qué es,
   * lo que cuesta (ahora y cada jornada) y el nombre de tu flota.
   */
  ui.montandoSL = false;
  ui.nombreSL = '';
  function htmlHojaSociedad(estado) {
    if (!ui.montandoSL || !Libre.sim.necesitaSociedad(estado)) return '';
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
      ' licencias tienes que dejar de ser autónomo y montar una SL. Cuesta <strong>' + ui.euros(s.coste) + '</strong> ahora y <strong>' +
      ui.euros(s.porConductorDiario) + ' por conductor</strong> en los costes fijos de cada jornada (hoy, ' + conductores +
      (conductores === 1 ? ' conductor: ' : ' conductores: ') + ui.euros(s.porConductorDiario * conductores) + ').</p>' +
      '<label class="sl-etiqueta" for="nombre-sl">Nombre de tu flota</label>' +
      '<input class="sl-nombre" id="nombre-sl" type="text" maxlength="' + s.nombreMax + '" autocomplete="off" placeholder="Taxis Libre SL" value="' +
      ui.esc(ui.nombreSL) + '">' +
      '<button type="button" class="ui-boton ui-boton--principal ui-boton--ancho" data-constituir data-precio="' + s.coste + '">' +
      'Pagar y constituir · ' + ui.euros(s.coste) + '</button></div>';
  }

  /* Pestaña Almacén: objetos sin equipar y la bandeja. */

  const seccionConductores = {
    id: 'sec-conductores',
    firma: firmaFlota,
    html: function (estado) {
      const c = Libre.config;
      if (ui.fichaConductor && !conductorDe(estado, ui.fichaConductor)) ui.fichaConductor = null;
      if (ui.cocheAbierto && !Libre.sim.estadoCoche(estado, estado.licencias.find(function (l) { return l.id === ui.cocheAbierto; }))) ui.cocheAbierto = null;
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
        htmlHojaCoche(estado) + htmlHojaElegirCoche(estado) + htmlHojaSociedad(estado);
    },
    // La experiencia y lo hecho cambian con cada carrera: se mueven aquí.
    actualizar: function (estado) {
      document.querySelectorAll('#sec-conductores [data-km-licencia]').forEach(function (el) {
        const lic = estado.licencias.find(function (l) { return String(l.id) === el.dataset.kmLicencia; });
        const texto = lic ? ui.numero(Math.floor(lic.km || 0)) : '';
        if (el.textContent !== texto) el.textContent = texto;
      });
      document.querySelectorAll('#sec-conductores [data-xp]').forEach(function (barra) {
        const x = conductorDe(estado, barra.dataset.xp);
        if (!x) return;
        const p = ui.nivelDe(x.t);
        barra.firstElementChild.style.width = (p.avance * 100).toFixed(0) + '%';
        barra.setAttribute('aria-valuenow', Math.round(p.avance * 100));
        barra.setAttribute('aria-label', ui.textoExperiencia(p));
      });
      document.querySelectorAll('#sec-conductores [data-energia]').forEach(function (barra) {
        const y = conductorDe(estado, barra.dataset.energia);
        if (!y) return;
        const pct = Libre.sim.energia(estado, y.t) / Libre.config.cansancio.maximo * 100;
        barra.firstElementChild.style.width = pct.toFixed(0) + '%';
        barra.classList.toggle('energia-baja', pct < 25);
        barra.setAttribute('aria-valuenow', Math.round(pct));
        if (ui.$('ficha-energia')) ui.$('ficha-energia').textContent = textoEnergia(estado, y.t);
      });
      const x = conductorDe(estado, ui.fichaConductor);
      if (x && ui.$('ficha-xp')) {
        ui.$('ficha-xp').textContent = textoXpCorto(ui.nivelDe(x.t));
        ui.$('ficha-carreras').textContent = ui.numero(Math.floor(x.t.carreras || 0));
        ui.$('ficha-facturado').textContent = ui.euros(x.t.facturado || 0);
      }
      if (ui.enfocarHoja) {
        // El botón de cerrar de la hoja recién abierta (la de encima).
        const sel = { ficha: '.hoja-ficha', candidatos: '.hoja-candidatos', equipar: '.hoja-equipar', comparar: '.hoja-comparar' }[ui.enfocarHoja];
        ui.enfocarHoja = null;
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

  Object.assign(ui, { botonCerrarHoja, claseRareza, conductorDe, firmaFlota, htmlCirculos, seccionConductores, MAS_ES_MEJOR });
})(globalThis);
