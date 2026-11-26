/*
 * Libre · interfaz: hoja de tu personaje y el prestigio.
 * Parte de Libre.ui (ver la cabecera de js/interfaz.js).
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};
  const ui = Libre.ui = Libre.ui || {};

  ui.personajeAbierto = false;
  ui.enfocarPersonaje = false;
  function textoXpPersonaje(n) {
    return ui.numero(n.xp - n.desde) + ' de ' + ui.numero(n.hasta - n.desde) + ' puntos · faltan ' + ui.numero(n.hasta - n.xp) + ' para el nivel ' + (n.nivel + 1);
  }
  const GRUPOS_PERSONAJE = [
    { id: 'volante', nombre: 'Al volante' },
    { id: 'arranque', nombre: 'Al empezar' },
    { id: 'gamas', nombre: 'Coches' }
  ];
  // Iconos de trazo de las mejoras del personaje (24×24), como los del árbol.
  const ICONOS_PERSONAJE = {
    racha: '<path d="M13 2 L4.5 13.5 H11 L10 22 L19.5 10 H13 Z"/>',
    rachaLarga: '<path d="M3 17 L9 11 L13 15 L21 7"/><path d="M15 7 H21 V13"/>',
    reflejos: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5 V13.5 L14.5 16"/><path d="M10 2.5 H14 M12 2.5 V6"/>',
    incognitoTu: '<path d="M4 11a8 8 0 0 1 16 0"/><path d="M2.5 11h19M12 11V7"/><circle cx="7.5" cy="16.5" r="3"/><circle cx="16.5" cy="16.5" r="3"/><path d="M10.5 16.5c1-.7 2-.7 3 0"/>',
    fondoFisico: '<path d="M20.5 9a4.8 4.8 0 0 0-8.5-3.1A4.8 4.8 0 0 0 3.5 9c0 5.2 8.5 11 8.5 11s8.5-5.8 8.5-11z"/><path d="M5 11.5h4l1.5-2.5 2.5 5 1.5-2.5h4.5"/>',
    callejero: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    ahorros: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    cocheNuevo: '<path d="M3 16l1.5-5h12L18 16v3H3z"/><path d="M6 11l1.5-3h7l1.5 3M6 19v2M15 19v2"/><path d="M20 2.5v4M18 4.5h4"/>',
    agenda: '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="2.5"/><path d="M8.5 16.5c.8-1.8 2-2.5 3.5-2.5s2.7.7 3.5 2.5M3 7.5h2M3 12h2M3 16.5h2"/>',
    veterano: '<circle cx="12" cy="14.5" r="6"/><path d="M12 11.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z"/><path d="M8 3l2 5.2M16 3l-2 5.2"/>',
    tesla: '<path d="M9 2.5v4.5M15 2.5v4.5"/><path d="M6 7h12v3.5a6 6 0 0 1-12 0z"/><path d="M12 16.5v5"/>',
    mercedes: '<path d="M6 3.5h12l4 5.5-10 12L2 9z"/><path d="M2 9h20M12 21L8.5 9 12 3.5 15.5 9z"/>'
  };
  /*
   * Prestigio (paso 4): null o { compras: [ids], confirmar }. compras es la
   * lista de niveles que vas añadiendo (un id repetido, otro nivel); la
   * simulación la comprueba con probarComprasPersonaje().
   */
  ui.prestigio = null;
  function textoPuntos(n) { return n + ' punto' + (n === 1 ? '' : 's'); }
  ui.pjGrupo = 'volante';      // pestaña de mejoras abierta en la hoja
  ui.editandoAspecto = false;  // hoja para cambiar tu cara y tu nombre
  // El nombre que vas escribiendo: se guarda al cerrar el editor (guardarlo al
  // salir del campo redibujaba la hoja justo debajo del dedo).
  ui.nombreEditado = '';
  /*
   * Mejoras del personaje en tarjetas con icono (Iván, 24-11-2026), por
   * pestañas. El círculo dice su estado: la tienes (verde), la puedes coger
   * en el reinicio (azul), aún no (gris) o te falta otra antes (candado).
   * Con `compra` ({ mejoras, restantes }), botones «−» y «+ N».
   */
  function htmlMejorasPersonaje(estado, compra) {
    const sim = Libre.sim;
    const base = estado.personaje.mejoras || {};
    const prueba = compra ? { personaje: { mejoras: compra.mejoras } } : estado;
    const pestañas = '<div class="pj-pestanas" role="tablist">' + GRUPOS_PERSONAJE.map(function (g) {
      const lista = Libre.config.personaje.mejoras.filter(function (m) { return m.grupo === g.id; });
      const tiene = lista.filter(function (m) { return sim.nivelMejoraPersonaje(prueba, m.id) > 0; }).length;
      return '<button type="button" role="tab" class="pj-pestana' + (ui.pjGrupo === g.id ? ' activa' : '') +
        '" aria-selected="' + (ui.pjGrupo === g.id) + '" data-pj-grupo="' + g.id + '">' + g.nombre +
        ' <small>' + tiene + '/' + lista.length + '</small></button>';
    }).join('') + '</div>';
    const filas = Libre.config.personaje.mejoras.filter(function (m) { return m.grupo === ui.pjGrupo; }).map(function (m) {
      const n = sim.nivelMejoraPersonaje(prueba, m.id);
      const antes = base[m.id] || 0;
      const max = m.niveles.length;
      const actual = n ? m.niveles[n - 1] : null;
      const sig = m.niveles[n];
      const falta = sim.faltaParaMejoraPersonaje(prueba, m.id);
      // Le falta otra mejora (o el nivel que pide el siguiente): candado.
      const bloqueada = !!(sig && falta && !/máximo/.test(falta));
      const puede = compra && sig && !falta && sig.coste <= compra.restantes;
      const estadoCss = n > antes ? 'nueva' : n ? 'tiene' : bloqueada ? 'bloqueada' : puede ? 'disponible' : 'no';
      const rayas = max > 1 ? '<span class="nodo-niveles pj-rayas" aria-label="Nivel ' + n + ' de ' + max + '">' +
        m.niveles.map(function (x, i) {
          return '<i' + (i < antes ? ' class="hecho"' : i < n ? ' class="nuevo"' : '') + '></i>';
        }).join('') + '</span>' : '';
      // Una línea: lo que tienes (y lo siguiente) o lo que da.
      const efecto = actual && actual.descripcion
        ? (sig ? ui.esc(actual.descripcion) + ' → ' + ui.esc(sig.descripcion || '') : ui.esc(actual.descripcion))
        : ui.esc((sig && sig.descripcion) || m.descripcion);
      const pie = n >= max
        ? '<span class="ui-chip pj-chip-ok">' + (max > 1 ? 'Al máximo' : 'La tienes') + '</span>'
        : bloqueada ? '<span class="pj-falta">' + ui.esc(falta) + '</span>'
        : '<span class="pj-coste"><strong>' + sig.coste + '</strong> ' + (sig.coste === 1 ? 'punto' : 'puntos') + '</span>';
      const botones = compra ? '<div class="pj-mejora-botones">' +
        (n > antes ? '<button type="button" class="ui-boton ui-boton--secundario" data-pj-quitar="' + m.id +
          '" aria-label="Quitar un nivel de ' + ui.esc(m.nombre) + '">−</button>' : '') +
        (sig ? '<button type="button" class="ui-boton ui-boton--principal" data-pj-comprar="' + m.id + '"' +
          (puede ? '' : ' disabled') + ' aria-label="Añadir ' + ui.esc(m.nombre) + ' por ' + sig.coste + ' puntos">+ ' + sig.coste + '</button>' : '') +
        '</div>' : '';
      return '<li class="pj-mejora pj-' + estadoCss + '">' +
        '<span class="pj-icono" aria-hidden="true">' + (estadoCss === 'bloqueada' ? ui.ICONO_CANDADO
          : '<svg class="icono" viewBox="0 0 24 24">' + (ICONOS_PERSONAJE[m.id] || '') + '</svg>') + '</span>' +
        '<div class="pj-mejora-cuerpo"><div class="pj-mejora-titulo"><strong>' + ui.esc(m.nombre) + '</strong>' + rayas + '</div>' +
        '<p>' + efecto + '</p><div class="pj-mejora-pie">' + pie + botones + '</div></div></li>';
    }).join('');
    return pestañas + '<ul class="pj-mejoras">' + filas + '</ul>';
  }

  /* Cabecera de la hoja: tu cara (con el lápiz para cambiarla), nombre, nivel y experiencia. */
  function htmlCabeceraPersonaje(estado) {
    const n = Libre.sim.nivelPersonaje(estado);
    const reinicios = estado.personaje.reinicios || 0;
    return '<div class="pj-cabecera">' +
      '<button type="button" class="pj-cara" data-pj-editar aria-label="Cambiar tu nombre">' + ui.htmlCaraTu(estado) +
      '<span class="pj-lapiz" aria-hidden="true"><svg class="icono" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg></span></button>' +
      '<div class="pj-quien"><h2 id="personaje-titulo">' + ui.esc(Libre.sim.nombrePersonaje(estado)) + '</h2>' +
      '<p>Taxista de nivel <strong>' + n.nivel + '</strong>' + (reinicios ? ' · ' + reinicios + (reinicios === 1 ? ' reinicio' : ' reinicios') : '') + '</p>' +
      '<span class="ui-barra" role="progressbar" aria-label="Experiencia" aria-valuemin="0" aria-valuemax="100" ' +
      'aria-valuenow="' + Math.round(n.progreso * 100) + '" id="personaje-barra">' +
      '<span class="ui-barra-relleno" style="width:' + (n.progreso * 100).toFixed(1) + '%"></span></span>' +
      '<p class="personaje-xp" id="personaje-xp">' + textoXpPersonaje(n) + '</p></div></div>';
  }

  /*
   * Hoja para cambiar tu cara y tu nombre: arriba, tu cara en grande y el
   * nombre; debajo, una fila por pieza con cada opción dibujada sobre tu
   * cara (tocarla la elige).
   */
  /* Hoja para cambiar tu nombre (la cara es ya un retrato fijo: Iván, 26-11-2026). */
  function htmlHojaAspecto(estado) {
    return '<div class="hoja-fondo" data-pj-cerrar-aspecto></div>' +
      '<div class="hoja hoja-personaje hoja-aspecto" role="dialog" aria-modal="true" aria-labelledby="aspecto-titulo">' +
      '<button type="button" class="hoja-cerrar" data-pj-cerrar-aspecto aria-label="Volver">×</button>' +
      '<h2 id="aspecto-titulo">Tu nombre</h2>' +
      '<div class="pj-aspecto-arriba"><span class="pj-cara pj-cara--grande">' + ui.htmlCaraTu(estado) + '</span>' +
      '<label class="pj-nombre">Nombre<input type="text" id="pj-nombre" maxlength="' + Libre.config.personaje.aspecto.nombreMax +
      '" autocomplete="off" placeholder="Tú" value="' + ui.esc(ui.nombreEditado) + '" data-pj-nombre></label></div>' +
      '<div class="pj-prestigio-pie"><button type="button" class="ui-boton ui-boton--principal" data-pj-cerrar-aspecto>Listo</button></div></div>';
  }

  /* Bloque «Empezar de cero» de la hoja normal. */
  function htmlBloquePrestigio(estado) {
    const falta = Libre.sim.faltaParaReiniciar(estado);
    const puntos = Libre.sim.puntosPrestigio(estado);
    // Solo lo que te dan si haces prestigio (Iván, 26-11-2026: sin explicar de dónde salen).
    return '<div class="pj-prestigio">' +
      '<p><strong>Si haces prestigio: ' + textoPuntos(puntos) + '</strong></p>' +
      (falta ? '<p class="ayuda">' + ui.esc(falta) + '</p>'
        : '<button type="button" class="ui-boton ui-boton--principal ui-boton--ancho" data-pj-prestigio>Empezar de cero</button>') +
      '</div>';
  }

  /* Hoja del reinicio: elegir mejoras y, después, confirmar. */
  function htmlHojaPrestigio(estado) {
    const sim = Libre.sim;
    const total = sim.puntosPrestigio(estado);
    const pr = sim.probarComprasPersonaje(estado, ui.prestigio.compras);
    const restantes = total - pr.gastados;
    const cab = '<div class="hoja-fondo" data-cerrar-personaje></div>' +
      '<div class="hoja hoja-personaje hoja-prestigio" role="dialog" aria-modal="true" aria-labelledby="personaje-titulo">' +
      '<button type="button" class="hoja-cerrar" data-cerrar-personaje aria-label="Cerrar">×</button>' +
      '<h2 id="personaje-titulo">Empezar de cero</h2>';
    if (ui.prestigio.confirmar) {
      const nuevas = {};
      ui.prestigio.compras.forEach(function (id) { nuevas[id] = (nuevas[id] || 0) + 1; });
      const quedan = Libre.config.personaje.mejoras.filter(function (m) { return pr.mejoras[m.id]; }).map(function (m) {
        const n = pr.mejoras[m.id];
        return '<li>' + ui.esc(m.nombre) + (m.niveles.length > 1 ? ' ' + n : '') + (nuevas[m.id] ? ' <strong>(nueva)</strong>' : '') + '</li>';
      }).join('');
      return cab +
        '<p class="pj-aviso"><strong>Se pierde toda la partida:</strong> el dinero, las licencias, los coches, los conductores, los objetos y las mejoras del árbol. Tu nivel vuelve a 0.</p>' +
        '<h3>Te quedas con</h3>' + (quedan ? '<ul class="pj-lista">' + quedan + '</ul>' : '<p class="ayuda">Ninguna mejora.</p>') +
        (restantes ? '<p>Y te guardas <strong>' + textoPuntos(restantes) + '</strong> para el próximo reinicio.</p>' : '') +
        '<div class="pj-prestigio-pie">' +
        '<button type="button" class="ui-boton ui-boton--secundario" data-pj-volver>Volver</button>' +
        '<button type="button" class="ui-boton ui-boton--peligro" data-pj-reiniciar>Empezar de cero</button></div></div>';
    }
    return cab +
      '<p class="pj-puntos">Gastas <strong>' + pr.gastados + '</strong> de <strong>' + textoPuntos(total) + '</strong>' +
      (restantes ? ' · te guardas ' + textoPuntos(restantes) : '') + '</p>' +
      htmlMejorasPersonaje(estado, { mejoras: pr.mejoras, restantes }) +
      '<div class="pj-prestigio-pie">' +
      '<button type="button" class="ui-boton ui-boton--secundario" data-pj-cancelar>Cancelar</button>' +
      '<button type="button" class="ui-boton ui-boton--principal" data-pj-seguir>Seguir</button></div></div>';
  }

  const seccionPersonaje = {
    id: 'sec-personaje',
    firma: function (estado) {
      return 'personaje:' + ui.personajeAbierto + ':' + Libre.sim.nivelPersonaje(estado).nivel + ':' +
        JSON.stringify(estado.personaje.mejoras || {}) + ':' + (estado.personaje.puntos || 0) + ':' + JSON.stringify(ui.prestigio) + ':' +
        ui.pjGrupo + ':' + ui.editandoAspecto + ':' + estado.personaje.nombre + ':' + JSON.stringify(estado.personaje.aspecto);
    },
    html: function (estado) {
      if (!ui.personajeAbierto) return '';
      if (ui.editandoAspecto) return htmlHojaAspecto(estado);
      if (ui.prestigio) return htmlHojaPrestigio(estado);
      const p = Libre.config.personaje;
      const e = p.experiencia;
      return '<div class="hoja-fondo" data-cerrar-personaje></div>' +
        '<div class="hoja hoja-personaje" role="dialog" aria-modal="true" aria-labelledby="personaje-titulo">' +
        '<button type="button" class="hoja-cerrar" data-cerrar-personaje aria-label="Cerrar tu personaje">×</button>' +
        htmlCabeceraPersonaje(estado) +
        // De dónde sale la experiencia, en chips pequeños.
        '<div class="pj-fuentes"><span class="ui-chip">Tu carrera +' + e.tuCarrera + '</span>' +
        '<span class="ui-chip">Carrera de un conductor +' + e.carreraConductor + '</span>' +
        '<span class="ui-chip">Legendario vendido +' + e.legendarioVendido + '</span></div>' +
        htmlBloquePrestigio(estado) +
        '<h3 class="pj-subtitulo">Mejoras de tu taxista</h3>' +
        htmlMejorasPersonaje(estado) + '</div>';
    },
    actualizar: function (estado) {
      if (!ui.personajeAbierto || ui.prestigio || ui.editandoAspecto) return;
      const n = Libre.sim.nivelPersonaje(estado);
      const barra = ui.$('personaje-barra');
      if (barra) {
        barra.firstChild.style.width = (n.progreso * 100).toFixed(1) + '%';
        barra.setAttribute('aria-valuenow', Math.round(n.progreso * 100));
      }
      const t = textoXpPersonaje(n);
      if (ui.$('personaje-xp') && ui.$('personaje-xp').textContent !== t) ui.$('personaje-xp').textContent = t;
      if (ui.enfocarPersonaje) {
        ui.enfocarPersonaje = false;
        const cerrar = document.querySelector('#sec-personaje .hoja-cerrar');
        if (cerrar) cerrar.focus({ preventScroll: true });
      }
    }
  };

  /*
   * Introducción de la historia (Iván, 25-11-2026): pantalla completa, una
   * vez al empezar la primera partida. Una escena por paso (ilustración y
   * texto); «Siguiente ›» y, en la última, «Empezar». Sin ver todavía la
   * ilustración (imagenes/), un fondo provisional con el número de escena.
   */

  Object.assign(ui, { seccionPersonaje });
})(globalThis);
