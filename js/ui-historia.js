/*
 * Libre · interfaz: introducción y eventos de clientes.
 * Parte de Libre.ui (ver la cabecera de js/interfaz.js).
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};
  const ui = Libre.ui = Libre.ui || {};

  ui.introPaso = 0;
  const seccionIntro = {
    id: 'sec-intro',
    firma: function (estado) {
      return 'intro:' + !!(estado.historia && !estado.historia.introVista) + ':' + ui.introPaso;
    },
    html: function (estado) {
      if (!estado.historia || estado.historia.introVista) return '';
      const escenas = Libre.config.historia.intro;
      // Las tres escenas, cargadas de antemano: así no se ve el fondo al pasar.
      if (!ui.introPrecargada) {
        ui.introPrecargada = true;
        escenas.forEach(function (x) { const im = new raiz.Image(); im.src = x.imagen; });
      }
      const i = Math.min(ui.introPaso, escenas.length - 1);
      const e = escenas[i];
      const ultima = i === escenas.length - 1;
      return '<div class="intro" role="dialog" aria-modal="true" aria-labelledby="intro-titulo">' +
        '<div class="intro-ilustracion" data-escena="' + (i + 1) + '">' +
        '<img src="' + ui.esc(e.imagen) + '" alt="" onload="this.classList.add(\'cargada\')" onerror="this.parentNode.classList.add(\'sin-imagen\'); this.remove();">' +
        '<span class="intro-provisional" aria-hidden="true">Ilustración ' + (i + 1) + '</span></div>' +
        '<div class="intro-texto"><p class="intro-paso">' + (i + 1) + ' de ' + escenas.length + '</p>' +
        '<h2 id="intro-titulo">' + ui.esc(e.titulo) + '</h2><p>' + ui.esc(e.texto) + '</p>' +
        '<div class="intro-botones">' +
        (ultima ? '' : '<button type="button" class="ui-boton ui-boton--secundario" data-intro-saltar>Saltar</button>') +
        '<button type="button" class="ui-boton ui-boton--principal" data-intro-' + (ultima ? 'empezar' : 'siguiente') + '>' +
        (ultima ? 'Empezar' : 'Siguiente ›') + '</button></div></div></div>';
    }
  };

  /*
   * Eventos de clientes (fase 3, Iván 25-11-2026): pantalla completa como la
   * introducción, con la ilustración del evento, a quién le pasa, el texto y
   * las tres opciones; al elegir, el resultado y «Seguir». El reloj está
   * parado mientras tanto (Libre.sim.eventoPendiente()).
   */
  const seccionEvento = {
    id: 'sec-evento',
    firma: function (estado) {
      const p = Libre.sim.eventoPendiente(estado);
      const r = p && estado.historia.eventos.resultado;
      return 'evento:' + (p ? p.id + '|' + p.quien : '') + ':' + (r ? r.opcion : '-');
    },
    html: function (estado) {
      const p = Libre.sim.eventoPendiente(estado);
      if (!p) return '';
      const e = Libre.sim.buscarEventoCliente(p.id);
      if (!e) return '';
      const r = estado.historia.eventos.resultado;
      const lic = Libre.sim.buscarLicencia(estado, p.licenciaId);
      const placa = lic ? ' · ' + ui.esc(Libre.sim.textoLicencia(lic)) : '';
      const quien = p.quien === 'tu' ? 'Te pasa a ti' + placa : 'Le pasa a ' + ui.esc(p.nombre) + placa + ' · decides tú';
      let abajo;
      if (!r) {
        abajo = '<div class="evento-opciones">' + e.opciones.map(function (o, i) {
          return '<button type="button" class="ui-boton ui-boton--secundario" data-evento-opcion="' + i + '">' + ui.esc(o.texto) + '</button>';
        }).join('') + '</div>';
      } else {
        const chips = [];
        if (Math.abs(r.neto) > 0.005) {
          chips.push('<span class="ui-chip ' + (r.neto > 0 ? 'evento-gana' : 'evento-pierde') + '">' + (r.neto > 0 ? '+' : '−') + ui.esc(ui.euros(Math.abs(r.neto))) + '</span>');
        }
        if (r.parado) chips.push('<span class="ui-chip">' + r.parado + ' min parado</span>');
        if (r.xp) chips.push('<span class="ui-chip">+' + r.xp + ' de experiencia</span>');
        if (r.objeto) {
          const o = Libre.sim.buscarObjeto(r.objeto);
          chips.push('<span class="ui-chip">' + ui.esc(o ? o.nombre : r.objeto) + ' al almacén</span>');
        }
        if (r.unico) {
          const u = Libre.sim.buscarUnico(e.unico);
          chips.push('<span class="ui-chip evento-unico">' + ui.esc(u ? u.nombre : e.unico) +
            (r.unico === 'oferta' ? (Libre.config.historia.eventos.descuentoOferta >= 1 ? ': gratis si lo contratas hoy' : ': hoy, más barato') : ': en tu agenda') + '</span>');
        }
        abajo = '<p class="evento-resultado"><strong>' + ui.esc(e.opciones[r.opcion].texto) + '.</strong> ' + ui.esc(r.texto) + '</p>' +
          (chips.length ? '<div class="evento-chips">' + chips.join('') + '</div>' : '') +
          '<div class="intro-botones"><button type="button" class="ui-boton ui-boton--principal" data-evento-seguir>Seguir</button></div>';
      }
      return '<div class="intro evento" role="dialog" aria-modal="true" aria-labelledby="evento-titulo">' +
        '<div class="intro-ilustracion">' +
        '<img src="' + ui.esc(e.imagen) + '" alt="" onload="this.classList.add(\'cargada\')" onerror="this.parentNode.classList.add(\'sin-imagen\'); this.remove();">' +
        '<span class="intro-provisional" aria-hidden="true">' + ui.esc(e.titulo) + '</span></div>' +
        '<div class="intro-texto"><p class="intro-paso">' + quien + '</p>' +
        '<h2 id="evento-titulo">' + ui.esc(e.titulo) + '</h2>' +
        (r ? '' : '<p>' + ui.esc(e.texto) + '</p>') + abajo + '</div></div>';
    }
  };


  Object.assign(ui, { seccionEvento, seccionIntro });
})(globalThis);
