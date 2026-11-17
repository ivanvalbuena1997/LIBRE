/*
 * Libre · sonidos.
 *
 * Sonidos sintetizados con Web Audio (sin archivos): cobro, propina, nivel,
 * objeto, avería, ticket y tic. Solo interfaz: la simulación no sabe nada
 * de ellos.
 *
 * Silenciado hasta el primer toque: los navegadores no dejan sonar nada
 * antes de que el jugador toque la página, así que el contexto de audio se
 * crea en el primer pointerdown o tecla. Antes de eso, tocar() no hace nada.
 *
 * Ajustes (sonido sí o no y volumen) en localStorage ('libre-sonido'),
 * aparte de la partida, como la pestaña elegida: no cambian el guardado.
 *
 *   Libre.sonidos.tocar('cobro')
 *   Libre.sonidos.ajustes()               → { activo, volumen }  (volumen 0–1)
 *   Libre.sonidos.cambiar({ volumen: 0.5 })
 *   Libre.sonidos.situacion()             → 'bloqueado', 'running'…
 *
 * Las notas y tiempos son de oído (Equilibrio de sonido, no de juego): se
 * ajustan escuchando.
 */
(function (raiz) {
  'use strict';
  const Libre = raiz.Libre = raiz.Libre || {};

  const CLAVE = 'libre-sonido';
  const ajustesBase = { activo: true, volumen: 0.7 };
  let ajustesActuales = Object.assign({}, ajustesBase);
  try {
    const guardados = JSON.parse(raiz.localStorage.getItem(CLAVE) || 'null');
    if (guardados) ajustesActuales = Object.assign({}, ajustesBase, guardados);
  } catch (e) { /* sin almacenamiento: los de serie */ }

  let ctx = null;        // AudioContext, al primer toque
  let salida = null;     // ganancia general (volumen)
  let ruido = null;      // medio segundo de ruido blanco, para chasquidos
  const ultimoToque = {};

  // Lo mínimo entre dos veces el mismo sonido (ms): con muchos taxis
  // cobrando a la vez, uno cada poco basta.
  const SEPARACION = { cobro: 300, propina: 250, tic: 60, ticket: 1500, averia: 400, nivel: 300, objeto: 300 };

  function aplicarVolumen() {
    if (salida) salida.gain.value = ajustesActuales.activo ? ajustesActuales.volumen * 0.6 : 0;
  }

  function desbloquear() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const Contexto = raiz.AudioContext || raiz.webkitAudioContext;
    if (!Contexto) return;
    ctx = new Contexto();
    salida = ctx.createGain();
    salida.connect(ctx.destination);
    aplicarVolumen();
    ruido = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const datos = ruido.getChannelData(0);
    for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;   // ruido: no afecta a la partida
  }

  if (raiz.document) {
    ['pointerdown', 'keydown'].forEach(function (tipo) {
      raiz.document.addEventListener(tipo, desbloquear, { capture: true, passive: true });
    });
  }

  // ------------------------------------------------------------ piezas

  /* Una nota con ataque corto y caída exponencial. */
  function nota(t, frecuencia, duracion, onda, volumen, hasta) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = onda;
    o.frequency.setValueAtTime(frecuencia, t);
    if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t + duracion);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volumen, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
    o.connect(g);
    g.connect(salida);
    o.start(t);
    o.stop(t + duracion + 0.02);
    return { o, g };
  }

  /* Un golpe de ruido filtrado (chasquido de impresora, golpe de chapa). */
  function chasquido(t, duracion, filtro, frecuencia, volumen) {
    const s = ctx.createBufferSource();
    s.buffer = ruido;
    const f = ctx.createBiquadFilter();
    f.type = filtro;
    f.frequency.value = frecuencia;
    const g = ctx.createGain();
    g.gain.setValueAtTime(volumen, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
    s.connect(f);
    f.connect(g);
    g.connect(salida);
    s.start(t, Math.random() * 0.4);
    s.stop(t + duracion + 0.02);
  }

  // ------------------------------------------------------------ sonidos

  const SONIDOS = {
    // Caja registradora: «ding» de dos notas.
    cobro: function (t) {
      chasquido(t, 0.03, 'highpass', 4000, 0.08);
      nota(t, 1318.5, 0.22, 'triangle', 0.3);
      nota(t + 0.07, 1760, 0.32, 'triangle', 0.26);
    },
    // Monedas: tres notas agudas que suben.
    propina: function (t) {
      [1568, 2093, 2637].forEach(function (f, i) { nota(t + i * 0.06, f, 0.18, 'sine', 0.22); });
    },
    // Subir de nivel: arpegio mayor.
    nivel: function (t) {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        nota(t + i * 0.09, f, i === 3 ? 0.55 : 0.28, 'triangle', 0.26);
      });
    },
    // Objeto encontrado: brillo de tres notas con eco más agudo.
    objeto: function (t) {
      [987.77, 1318.5, 1975.5].forEach(function (f, i) {
        nota(t + i * 0.08, f, 0.42, 'sine', 0.2);
        nota(t + i * 0.08 + 0.03, f * 2, 0.3, 'sine', 0.05);
      });
    },
    // Avería o pinchazo: golpe sordo y un quejido que baja.
    averia: function (t) {
      chasquido(t, 0.09, 'lowpass', 900, 0.35);
      const v = nota(t + 0.02, 170, 0.4, 'sawtooth', 0.12, 65);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 700;
      v.o.disconnect();
      v.o.connect(f);
      f.connect(v.g);
    },
    // Ticket: la impresora térmica, una ráfaga de chasquidos.
    ticket: function (t) {
      for (let i = 0; i < 14; i++) chasquido(t + i * 0.045, 0.025, 'bandpass', 3200, 0.16);
      nota(t + 14 * 0.045 + 0.05, 880, 0.12, 'square', 0.04);
    },
    // Tic del taxímetro al bajar la bandera.
    tic: function (t) {
      nota(t, 2100, 0.035, 'square', 0.08);
    }
  };

  function tocar(nombre) {
    if (!ctx || !ajustesActuales.activo || ajustesActuales.volumen <= 0 || !SONIDOS[nombre]) return;
    if (raiz.document && raiz.document.hidden) return;
    const ahora = Date.now();
    if (ahora - (ultimoToque[nombre] || 0) < (SEPARACION[nombre] || 100)) return;
    ultimoToque[nombre] = ahora;
    if (ctx.state === 'suspended') ctx.resume();
    try { SONIDOS[nombre](ctx.currentTime + 0.01); } catch (e) { /* un sonido que falla no para el juego */ }
  }

  function ajustes() { return Object.assign({}, ajustesActuales); }

  function cambiar(nuevos) {
    ajustesActuales = Object.assign({}, ajustesActuales, nuevos);
    ajustesActuales.volumen = Math.max(0, Math.min(1, Number(ajustesActuales.volumen) || 0));
    try { raiz.localStorage.setItem(CLAVE, JSON.stringify(ajustesActuales)); } catch (e) { /* da igual */ }
    aplicarVolumen();
  }

  /* 'bloqueado' hasta el primer toque; luego el estado del AudioContext. */
  function situacion() { return ctx ? ctx.state : 'bloqueado'; }

  Libre.sonidos = { tocar, ajustes, cambiar, situacion, nombres: Object.keys(SONIDOS) };
})(globalThis);
