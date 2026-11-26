/*
 * Libre · interfaz: el grupo de la flota (chat; Iván, 26-11-2026).
 * Parte de Libre.ui (ver la cabecera de js/interfaz.js).
 *
 * Botón en la cabecera, entre tu cara y el engranaje, desde que montas la
 * SL; con un punto rojo si hay mensajes sin leer o si aún no has escrito.
 * Hoja a pantalla completa como un grupo de mensajería: burbujas con la
 * cara y el nombre de quien escribe, las tuyas a la derecha en verde, un
 * separador por día y las fotos (imagenes/chat-*.webp; si falta, un hueco).
 * Antes de tu primer mensaje, la hoja propone uno ya escrito que puedes
 * cambiar (ui.borradorChat) y «Enviar».
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};
  const ui = Libre.ui = Libre.ui || {};

  ui.chatAbierto = false;
  ui.borradorChat = null;   // el texto de tu primer mensaje mientras lo cambias

  function htmlFoto(clave, coche) {
    const ruta = (Libre.config.chat.fotos || {})[clave];
    const src = ruta && ruta.replace('{coche}', coche || Libre.config.vehiculos.modeloInicial);
    if (!src) return '';
    return '<span class="chat-foto"><img src="' + ui.esc(src) + '" alt="Foto" loading="lazy"' +
      ' onerror="this.parentNode.classList.add(\'chat-foto--falta\'); this.remove();"></span>';
  }

  function htmlMensaje(m, anterior) {
    const tuyo = m.de === 'tu';
    // Seguidos del mismo, sin repetir cara ni nombre.
    const seguido = anterior && anterior.de === m.de && anterior.dia === m.dia;
    const cara = tuyo ? '' : '<span class="chat-cara retrato">' + (seguido ? '' : Libre.retratos.svg(m.cara)) + '</span>';
    return '<li class="chat-mensaje' + (tuyo ? ' chat-mensaje--tuyo' : '') + (seguido ? ' chat-mensaje--seguido' : '') + '">' + cara +
      '<span class="chat-burbuja">' + (!tuyo && !seguido ? '<span class="chat-nombre">' + ui.esc(m.nombre) + '</span>' : '') +
      (m.foto ? htmlFoto(m.foto, m.coche) : '') + '<span class="chat-texto">' + ui.esc(m.texto) + '</span></span></li>';
  }

  function htmlMensajes(estado) {
    const lista = estado.chat.mensajes;
    let html = '';
    let dia = null;
    lista.forEach(function (m, i) {
      if (m.dia !== dia) {
        dia = m.dia;
        html += '<li class="chat-dia"><span>Día ' + (m.dia + 1) + '</span></li>';
      }
      html += htmlMensaje(m, i > 0 && lista[i - 1].dia === m.dia ? lista[i - 1] : null);
    });
    return '<ol class="chat-lista" id="chat-lista">' + html + '</ol>';
  }

  function htmlPrimerMensaje(estado) {
    if (ui.borradorChat === null) ui.borradorChat = Libre.sim.primerMensajeChat(estado);
    return '<div class="chat-vacio"><p>Acabas de montar tu SL: es buen momento para estrenar el grupo con tus conductores.</p></div>' +
      '<div class="chat-escribir"><label class="sl-etiqueta" for="chat-borrador">Tu primer mensaje (puedes cambiarlo)</label>' +
      '<textarea id="chat-borrador" rows="3" maxlength="300">' + ui.esc(ui.borradorChat) + '</textarea>' +
      '<button type="button" class="ui-boton ui-boton--principal ui-boton--ancho" data-chat-enviar>Enviar</button></div>';
  }

  const seccionChat = {
    id: 'sec-chat',
    firma: function (estado) {
      const c = estado.chat;
      return 'chat:' + ui.chatAbierto + ':' + (c ? c.iniciado + ':' + c.mensajes.length + ':' + (c.mensajes.length ? c.mensajes[c.mensajes.length - 1].texto : '') : '') +
        ':' + (estado.empresa ? estado.empresa.nombre : '') + ':' + estado.personaje.nombre;
    },
    html: function (estado) {
      if (!ui.chatAbierto || !estado.chat) return '';
      return '<div class="hoja-fondo" data-cerrar-chat></div>' +
        '<div class="hoja hoja-chat" role="dialog" aria-modal="true" aria-labelledby="chat-titulo">' +
        '<div class="chat-cabecera"><h2 id="chat-titulo">' + ui.esc(estado.empresa.nombre) + ' · Conductores</h2>' +
        '<button type="button" class="hoja-cerrar" data-cerrar-chat aria-label="Cerrar el grupo">×</button></div>' +
        (estado.chat.iniciado ? htmlMensajes(estado) : htmlPrimerMensaje(estado)) + '</div>';
    },
    actualizar: function () {
      // Al abrirlo (o al llegar mensajes nuevos con él abierto), al final.
      if (ui.chatAlFinal) {
        ui.chatAlFinal = false;
        const hoja = document.querySelector('.hoja-chat');
        if (hoja) hoja.scrollTop = hoja.scrollHeight;
      }
    }
  };

  /* Botón de la cabecera: solo con la SL; punto rojo si hay algo que leer o escribir. */
  function dibujarBotonChat(estado) {
    const boton = ui.$('abrir-chat');
    const hay = !!estado.chat;
    if (boton.hidden === hay) boton.hidden = !hay;
    document.getElementById('cabecera').classList.toggle('con-chat', hay);
    const aviso = hay && (!estado.chat.iniciado || estado.chat.noLeidos > 0);
    const punto = ui.$('chat-sin-leer');
    if (punto.hidden === aviso) punto.hidden = !aviso;
    // Con el grupo abierto, lo que llega se da por leído.
    if (ui.chatAbierto && hay && estado.chat.noLeidos > 0) {
      ui.chatAlFinal = true;
      Libre.sim.leerChat(estado);
    }
  }

  Object.assign(ui, { seccionChat, dibujarBotonChat });
})(globalThis);
