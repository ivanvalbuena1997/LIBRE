/*
 * Libre · interfaz: hoja de Ajustes y partida.
 * Parte de Libre.ui (ver la cabecera de js/interfaz.js).
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};
  const ui = Libre.ui = Libre.ui || {};

  ui.ajustesAbiertos = false;

  /*
   * Sonido sí o no y volumen (se guardan aparte de la partida, en
   * js/sonidos.js). Sin sonido, el volumen se queda desactivado.
   */
  /*
   * Panel «Actualizaciones» de Ajustes (Iván, 19-11-2026): el historial de
   * js/actualizaciones.js, de la más nueva a la más vieja. Plegado; se abre
   * con su título (un <details>, sin estado propio).
   */
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function htmlActualizaciones() {
    const grupos = (Libre.actualizaciones || []).slice().reverse();
    if (!grupos.length) return '';
    const ultima = grupos[0].cambios[grupos[0].cambios.length - 1];
    const fecha = function (iso) {
      const p = iso.split('-');
      return Number(p[2]) + ' de ' + MESES[Number(p[1]) - 1] + ' de ' + p[0];
    };
    return '<details class="actualizaciones"><summary><strong>Actualizaciones</strong>' +
      '<span>La última, n.º ' + ultima.n + ' · ' + ui.esc(fecha(grupos[0].fecha)) + '</span></summary>' +
      grupos.map(function (g) {
        return '<section><h3>' + ui.esc(fecha(g.fecha)) + ' · ' + ui.esc(g.titulo) + '</h3><ol>' +
          g.cambios.slice().reverse().map(function (c) {
            return '<li value="' + c.n + '">' + ui.esc(c.texto) + '</li>';
          }).join('') + '</ol></section>';
      }).join('') + '</details>';
  }

  function htmlAjustesSonido() {
    if (!Libre.sonidos) return '';
    const a = Libre.sonidos.ajustes();
    return '<label class="ajuste"><input type="checkbox" data-sonido="activo"' + (a.activo ? ' checked' : '') + '> Sonido</label>' +
      '<label class="ajuste ajuste-volumen">Volumen' +
      '<input type="range" min="0" max="100" step="5" value="' + Math.round(a.volumen * 100) + '" data-sonido="volumen"' +
      (a.activo ? '' : ' disabled') + ' aria-label="Volumen"></label>';
  }
  ui.enfocarAjustes = false;
  // Exportar e importar (Iván, 19-11-2026, tras un fallo al importar): el
  // texto de la caja y la confirmación ('importar' o 'borrar') van en la
  // propia hoja, sin confirm(), que algunos navegadores del móvil bloquean
  // (entonces no pasaba nada).
  ui.textoPartida = '';
  ui.nuevoNombreSL = null;   // lo que escribes para renombrar tu SL

  /* Cambiar el nombre de tu SL (solo si la tienes). */
  function htmlAjustesEmpresa(estado) {
    if (!estado.empresa) return '';
    const valor = ui.nuevoNombreSL === null ? estado.empresa.nombre : ui.nuevoNombreSL;
    return '<label class="sl-etiqueta" for="renombrar-sl">Nombre de tu empresa</label>' +
      '<input class="sl-nombre" id="renombrar-sl" type="text" maxlength="' + Libre.config.sociedad.nombreMax +
      '" autocomplete="off" value="' + ui.esc(valor) + '">' +
      '<button type="button" class="ui-boton ui-boton--secundario ui-boton--ancho" data-renombrar-sl>Cambiar el nombre</button>';
  }
  ui.confirmarPartida = null;

  function htmlAccionesPartida() {
    if (ui.confirmarPartida) {
      const importar = ui.confirmarPartida === 'importar';
      return '<p class="ayuda aviso-partida">' + (importar
        ? '¿Sustituir la partida actual por la que has pegado? La de ahora se pierde.'
        : '¿Borrar la partida y empezar de cero? No se puede deshacer.') + '</p>' +
        '<div class="acciones">' +
        '<button type="button" data-partida="' + (importar ? 'importar-si' : 'borrar-si') + '" class="boton-peligro">' +
        (importar ? 'Sí, importar' : 'Sí, borrar') + '</button>' +
        '<button type="button" data-partida="cancelar">Cancelar</button></div>';
    }
    return '<div class="acciones">' +
      '<button type="button" data-partida="exportar">Exportar</button>' +
      '<button type="button" data-partida="importar">Importar</button>' +
      '<button type="button" data-partida="borrar" class="boton-peligro">Borrar partida</button></div>';
  }

  const seccionPartida = {
    id: 'sec-partida',
    firma: function (estado) {
      return 'ajustes:' + ui.ajustesAbiertos + ':' + ui.confirmarPartida + ':' + (estado.empresa ? estado.empresa.nombre : '') + ':' +
        estado.ajustes.pararAlCierre + ':' +
        (Libre.sonidos ? JSON.stringify(Libre.sonidos.ajustes()) : '');
    },
    html: function (estado) {
      if (!ui.ajustesAbiertos) return '';
      return '<div class="hoja-fondo" data-cerrar-ajustes></div>' +
        '<div class="hoja" role="dialog" aria-modal="true" aria-labelledby="ajustes-titulo">' +
        '<button type="button" class="hoja-cerrar" data-cerrar-ajustes aria-label="Cerrar los ajustes">×</button>' +
        '<h2 id="ajustes-titulo">Ajustes y partida</h2>' +
        '<label class="ajuste"><input type="checkbox" data-cambio="cambiarAjuste" data-args="pararAlCierre"' +
        (estado.ajustes.pararAlCierre ? ' checked' : '') + '> Parar al cierre del día</label>' +
        htmlAjustesSonido() + htmlAjustesEmpresa(estado) +
        '<p class="ayuda">Se guarda sola en este navegador. Para pasarla a otro dispositivo, exporta el texto y pégalo allí en Importar.</p>' +
        // El texto pegado se guarda en textoPartida: redibujar la hoja no lo borra.
        '<textarea id="partida-texto" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="Texto de la partida">' +
        ui.esc(ui.textoPartida) + '</textarea>' + htmlAccionesPartida() + htmlActualizaciones() + '</div>';
    },
    actualizar: function () {
      if (ui.enfocarAjustes) {
        ui.enfocarAjustes = false;
        const cerrar = document.querySelector('#sec-partida .hoja-cerrar');
        if (cerrar) cerrar.focus({ preventScroll: true });
      }
    }
  };

  // Iván, 22-11-2026: las zonas, justo debajo del taxímetro (y del ticket o
  // la caja si están abiertos); antes iban al final y con muchos taxis no se
  // veían a la vez que el taxímetro.
  /*
   * Tu personaje (Iván, 24-11-2026; idea 12): hoja que abre el botón de la
   * gorra, a la izquierda del engranaje. Paso 2: nivel, barra de
   * experiencia y de dónde sale; las mejoras y el prestigio, en los pasos
   * siguientes. La barra y la cifra van al día en actualizar (sin redibujar).
   */

  Object.assign(ui, { seccionPartida });
})(globalThis);
