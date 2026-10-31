'use strict';
/* Sonidos y música de Kaska vs Joselito: todo sintetizado con Web Audio, sin archivos.
   Ladridos, gruñidos, gemidos y aullidos de perro + efectos + música de fondo. */
window.KVJA = (() => {
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* nada */ } };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const MUSIC_VOL = 0.5;

  let ctx = null, sfx = null, music = null, echo = null, noiseBuf = null;
  const st = { sfx: get('kvj_sound', true), music: get('kvj_music', true) };

  function init() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
      comp.connect(ctx.destination);
      sfx = ctx.createGain(); sfx.gain.value = st.sfx ? 1 : 0; sfx.connect(comp);
      music = ctx.createGain(); music.gain.value = st.music ? MUSIC_VOL : 0; music.connect(comp);
      // eco para el súper ladrido, aullidos y cinemáticas
      echo = ctx.createGain();
      const dl = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
      dl.delayTime.value = 0.21; fb.gain.value = 0.36; lp.type = 'lowpass'; lp.frequency.value = 2600;
      echo.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(sfx);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  const ok = () => ctx && ctx.state !== 'closed';
  const now = () => ctx.currentTime;

  function env(g, t0, a, d, v) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  // oscilador con envolvente. El tono va de f0 a f durante el ataque y de f a f2 durante la caída.
  function osc(o) {
    if (!ok()) return;
    const { type = 'sine', f = 440, f0 = 0, f2 = 0, a = 0.005, d = 0.2, v = 0.1, t = 0, at = null, out = sfx, filter = null, vib = 0, vibF = 6, wet = false } = o;
    const t0 = at != null ? at : now() + t;
    const end = t0 + a + d;
    const n = ctx.createOscillator();
    n.type = type;
    n.frequency.setValueAtTime(f0 || f, t0);
    if (f0) n.frequency.linearRampToValueAtTime(f, t0 + a);
    if (f2) n.frequency.exponentialRampToValueAtTime(Math.max(20, f2), end);
    let node = n;
    if (filter) {
      const fl = ctx.createBiquadFilter();
      fl.type = filter.type || 'lowpass';
      fl.frequency.setValueAtTime(filter.f, t0);
      if (filter.f2) fl.frequency.exponentialRampToValueAtTime(filter.f2, end);
      fl.Q.value = filter.q || 1;
      n.connect(fl); node = fl;
    }
    if (vib) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = vibF; lg.gain.value = vib;
      l.connect(lg); lg.connect(n.frequency);
      l.start(t0); l.stop(end + 0.05);
    }
    const g = ctx.createGain();
    env(g, t0, a, d, v);
    node.connect(g); g.connect(out);
    if (wet) g.connect(echo);
    n.start(t0); n.stop(end + 0.05);
  }

  // ruido filtrado (soplidos, golpes, explosiones, platillos...)
  function noise(o) {
    if (!ok()) return;
    const { t = 0, at = null, a = 0.003, d = 0.15, v = 0.1, type = 'bandpass', f = 1000, f2 = 0, q = 1, out = sfx, wet = false } = o;
    const t0 = at != null ? at : now() + t, end = t0 + a + d;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter();
    fl.type = type; fl.frequency.setValueAtTime(f, t0);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, end);
    fl.Q.value = q;
    const g = ctx.createGain();
    env(g, t0, a, d, v);
    s.connect(fl); fl.connect(g); g.connect(out);
    if (wet) g.connect(echo);
    s.start(t0, Math.random() * 0.5); s.stop(end + 0.05);
  }

  /* ---------- voces de perro ---------- */
  // p = tono (más alto = perro más pequeño), size = cuerpo (más grande = más grave y largo), rough = raspa
  function bark({ p = 1, size = 1, v = 0.22, t = 0, wet = false, rough = 0.35 } = {}) {
    const f = 430 * p, d = 0.11 * size;
    osc({ type: 'sawtooth', f0: f * 0.7, f, f2: f * 0.55, a: 0.025, d, v: v * 0.8, t, wet, filter: { type: 'bandpass', f: (1400 * p) / size, f2: (800 * p) / size, q: 2.2 } });
    osc({ type: 'square', f0: f * 1.4, f: f * 2, f2: f * 1.1, a: 0.02, d: d * 0.75, v: v * 0.2, t, wet, filter: { type: 'bandpass', f: 2600 * p, q: 5 } });
    noise({ t, a: 0.005, d: d * 0.8, v: v * rough, type: 'bandpass', f: (2000 * p) / size, f2: 900, q: 1.3, wet });
  }
  // Kaska: chihuahua, agudo y limpio. Joselito: más grave y rasposo.
  const barkK = (o = {}) => bark({ p: 1.3, size: 0.85, rough: 0.25, ...o });
  const barkJ = (o = {}) => bark({ p: 1.0, size: 1.1, rough: 0.6, ...o });
  const barkK2 = (o = {}) => { barkK(o); barkK({ ...o, t: (o.t || 0) + 0.17, p: 1.22 }); };

  function yelp({ p = 1, t = 0, v = 0.16 } = {}) { // "¡kai!"
    osc({ type: 'sawtooth', f0: 900 * p, f: 1500 * p, f2: 650 * p, a: 0.03, d: 0.15, v, t, filter: { type: 'bandpass', f: 1900 * p, q: 2 } });
    noise({ t, d: 0.06, v: v * 0.3, type: 'highpass', f: 3000 });
  }
  function whine({ p = 1, t = 0, v = 0.1, d = 0.5 } = {}) { // gemido triste
    osc({ type: 'triangle', f0: 640 * p, f: 920 * p, f2: 560 * p, a: 0.14, d, v, t, vib: 18, vibF: 7, filter: { type: 'bandpass', f: 1100 * p, q: 1 } });
  }
  function howl({ p = 1, t = 0, v = 0.12, d = 1.5 } = {}) { // "¡auuuuu!"
    if (!ok()) return;
    const t0 = now() + t, f = 400 * p;
    const n = ctx.createOscillator(); n.type = 'sawtooth';
    n.frequency.setValueAtTime(f * 0.8, t0);
    n.frequency.linearRampToValueAtTime(f * 1.5, t0 + d * 0.35);
    n.frequency.linearRampToValueAtTime(f * 1.42, t0 + d * 0.75);
    n.frequency.linearRampToValueAtTime(f * 1.0, t0 + d);
    const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.5; lg.gain.value = 10; l.connect(lg); lg.connect(n.frequency);
    const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = 3;
    fl.frequency.setValueAtTime(700 * p, t0); fl.frequency.linearRampToValueAtTime(1150 * p, t0 + d * 0.4); fl.frequency.linearRampToValueAtTime(750 * p, t0 + d);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.18);
    g.gain.setValueAtTime(v, t0 + d * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    n.connect(fl); fl.connect(g); g.connect(sfx); g.connect(echo);
    n.start(t0); n.stop(t0 + d + 0.05); l.start(t0); l.stop(t0 + d + 0.05);
  }
  function growl({ t = 0, d = 0.8, v = 0.16, p = 1 } = {}) { // grrrr
    if (!ok()) return;
    const t0 = now() + t;
    const n = ctx.createOscillator(); n.type = 'sawtooth';
    n.frequency.setValueAtTime(115 * p, t0); n.frequency.linearRampToValueAtTime(92 * p, t0 + d);
    const am = ctx.createGain(); am.gain.value = 0.55;
    const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 27; lg.gain.value = 0.45; l.connect(lg); lg.connect(am.gain);
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 750 * p; fl.Q.value = 3;
    const g = ctx.createGain(); env(g, t0, 0.08, d, v);
    n.connect(fl); fl.connect(am); am.connect(g); g.connect(sfx);
    n.start(t0); n.stop(t0 + d + 0.15); l.start(t0); l.stop(t0 + d + 0.15);
    noise({ t, a: 0.08, d, v: v * 0.35, type: 'lowpass', f: 500 * p });
  }
  function laugh({ t = 0, v = 0.2 } = {}) { // "¡ja ja ja!" de Joselito (risa ladrada)
    for (let i = 0; i < 4; i++) barkJ({ t: t + i * 0.13, p: 1.18 - i * 0.05, size: 0.65, v: v * (1 - i * 0.12) });
    growl({ t: t + 0.5, d: 0.35, v: v * 0.5, p: 1.2 });
  }
  function pant({ t = 0, v = 0.05, n = 4 } = {}) { // jadeo contento
    for (let i = 0; i < n; i++) noise({ t: t + i * 0.14, a: 0.02, d: 0.07, v, type: 'bandpass', f: i % 2 ? 1250 : 1650, q: 1.5 });
  }
  function chomp({ t = 0, v = 0.08, p = 1 } = {}) { // "ñam"
    noise({ t, a: 0.004, d: 0.05, v, type: 'bandpass', f: 750 * p, q: 2 });
    osc({ type: 'square', f: 240 * p, f2: 150 * p, a: 0.004, d: 0.05, v: v * 0.35, t, filter: { type: 'lowpass', f: 900 } });
  }

  /* ---------- efectos ---------- */
  const whoosh = ({ t = 0, v = 0.09, f = 500, f2 = 2600, d = 0.18 } = {}) => noise({ t, a: 0.03, d, v, type: 'bandpass', f, f2, q: 1.4 });
  const thud = ({ t = 0, v = 0.3 } = {}) => { osc({ type: 'sine', f: 120, f2: 45, a: 0.004, d: 0.22, v, t }); noise({ t, d: 0.12, v: v * 0.4, type: 'lowpass', f: 600 }); };
  function impact({ t = 0, v = 0.4 } = {}) { // golpe de título / K.O.
    osc({ type: 'sine', f: 150, f2: 38, a: 0.004, d: 0.7, v, t });
    noise({ t, a: 0.004, d: 0.5, v: v * 0.5, type: 'lowpass', f: 1800, f2: 120 });
    noise({ t, a: 0.004, d: 1.1, v: v * 0.22, type: 'highpass', f: 5500 }); // platillo
  }
  function explosion({ t = 0, v = 0.35 } = {}) {
    noise({ t, a: 0.004, d: 0.6, v, type: 'lowpass', f: 3200, f2: 180 });
    osc({ type: 'sine', f: 120, f2: 38, a: 0.004, d: 0.45, v: v * 0.8, t });
  }
  function chime({ t = 0, v = 0.07, base = 1568 } = {}) {
    [1, 1.26, 1.5, 2].forEach((m, i) => osc({ type: 'triangle', f: base * m, a: 0.004, d: 0.25, v, t: t + i * 0.05, wet: true }));
  }
  function fanfare(notes, { t = 0, v = 0.07, step = 0.11, type = 'square', last = 0.4 } = {}) {
    notes.forEach((f, i) => osc({ type, f, a: 0.01, d: i === notes.length - 1 ? last : step * 1.2, v, t: t + i * step, filter: { type: 'lowpass', f: 3500 } }));
  }
  function sadTrombone({ t = 0, v = 0.12 } = {}) { // "uaa uaa uaa uaaaaa"
    [[392, 370], [370, 349], [349, 330], [330, 300]].forEach(([a, b], i) => {
      const last = i === 3;
      osc({ type: 'sawtooth', f: a, f2: b, a: 0.04, d: last ? 1.0 : 0.32, v, t: t + i * 0.42, vib: last ? 9 : 0, vibF: 6, filter: { type: 'lowpass', f: 1300, q: 2 } });
    });
  }

  /* ---------- música (secuenciador) ---------- */
  const NN = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const midi = (s) => { const m = /^([A-G][#b]?)(\d)$/.exec(s); return m ? 12 * (+m[2] + 1) + NN[m[1]] : 0; };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // melodía: un compás = 8 corcheas separadas por espacios ('-' = silencio)
  const lead = (bars, shift = 0) => bars.map((b) => {
    const steps = new Array(16).fill(0);
    b.split(/\s+/).forEach((tok, i) => { if (tok !== '-') steps[i * 2] = midi(tok) + shift; });
    return steps;
  });
  const DM = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]]; // Rem · Sib · Solm · La
  const AM = [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 44, 47]]; // Lam · Fa · Sol · Mi
  const BATTLE_LEAD = ['D5 - F5 E5 D5 - A4 -', 'Bb4 - D5 C5 Bb4 - F4 -', 'G4 - Bb4 A4 G4 - D5 -', 'A4 - C#5 E5 A5 - G5 E5'];
  const SONGS = {
    menu: {
      bpm: 84, chords: DM, bass: 'R.......F.......', bassV: 0.07, arp: '0.2.4.2.3.2.4.2.', arpOct: 12, arpV: 0.035,
      kick: '', snare: '', hat: '......x.......x.', hatV: 0.012,
      lead: lead(['A5 - - - F5 - - -', 'F5 - - - D5 - - -', 'D5 - - - Bb4 - - -', 'C#5 - E5 - A5 - - -']), leadType: 'bell', leadV: 0.035,
    },
    battle: {
      bpm: 136, chords: DM, bass: 'R.RO.R.RR.RO.RF.', bassV: 0.08, arp: '0.1.2.1.0.1.2.1.', arpOct: 12, arpV: 0.022,
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', hatV: 0.02,
      lead: lead(BATTLE_LEAD), leadType: 'square', leadV: 0.035,
    },
    fury: {
      bpm: 158, chords: DM, bass: 'RROR.RORRROR.RFO', bassV: 0.085, arp: '0120012001200120', arpOct: 12, arpV: 0.02,
      kick: 'x..x..x.x..x..x.', snare: '....x.......x..x', hat: 'xxxxxxxxxxxxxxxx', hatV: 0.016,
      lead: lead(BATTLE_LEAD, 12), leadType: 'saw', leadV: 0.03,
    },
    boss: {
      bpm: 148, chords: [[50, 53, 57], [51, 55, 58], [50, 53, 57], [49, 52, 56]], // Rem · Mib · Rem · Do#dim: más oscuro
      bass: 'R.RRO.RRR.RRO.RF', bassV: 0.09, arp: '0.1.2.4.2.1.0.1.', arpOct: 12, arpV: 0.02,
      kick: 'x.x.x...x.x.x...', snare: '....x.......x.xx', hat: 'x.xxx.xxx.xxx.xx', hatV: 0.016,
      lead: lead(['D5 - - D5 Eb5 - D5 -', 'Eb5 - - G5 F5 - Eb5 -', 'D5 - A4 - D5 - F5 -', 'E5 - - C#5 Bb4 - A4 -']), leadType: 'saw', leadV: 0.032,
    },
    whack: {
      bpm: 152, chords: AM, bass: 'R...O...R...O...', bassV: 0.08, arp: '0.1.2.1.0.1.2.1.', arpOct: 12, arpV: 0.02,
      kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.', hatV: 0.02,
      lead: lead(['A4 C5 E5 C5 A4 - E4 -', 'F4 A4 C5 A4 F4 - C5 -', 'G4 B4 D5 B4 G4 - D5 -', 'E5 - D5 - B4 - G#4 -']), leadType: 'square', leadV: 0.032,
    },
  };

  let mus = null;
  function playStep(m, step, time, spb) {
    const s = m.song, out = m.gain;
    const bar = Math.floor(step / 16) % s.chords.length, i = step % 16, ch = s.chords[bar];
    const b = s.bass[i];
    if (b && b !== '.') {
      const n = (b === 'R' ? ch[0] : b === 'O' ? ch[0] + 12 : b === 'F' ? ch[2] : ch[1]) - 12;
      osc({ at: time, type: 'sawtooth', f: hz(n), a: 0.005, d: spb * 1.6, v: s.bassV, out, filter: { type: 'lowpass', f: 600, q: 2 } });
      osc({ at: time, type: 'sine', f: hz(n - 12), a: 0.005, d: spb * 1.6, v: s.bassV * 0.8, out });
    }
    const a = s.arp[i];
    if (a && a !== '.') {
      const k = +a;
      const n = ch[k % ch.length] + (k >= ch.length ? 12 : 0) + s.arpOct;
      osc({ at: time, type: 'triangle', f: hz(n), a: 0.003, d: 0.14, v: s.arpV, out });
    }
    if (s.kick[i] === 'x') osc({ at: time, type: 'sine', f: 150, f2: 45, a: 0.002, d: 0.14, v: 0.3, out });
    if (s.snare[i] === 'x') { noise({ at: time, d: 0.1, v: 0.09, type: 'bandpass', f: 1800, q: 0.8, out }); osc({ at: time, type: 'triangle', f: 200, f2: 140, d: 0.05, v: 0.05, out }); }
    if (s.hat[i] === 'x') noise({ at: time, d: 0.03, v: s.hatV || 0.02, type: 'highpass', f: 7000, out });
    if (s.lead) {
      const n = s.lead[bar % s.lead.length][i];
      if (n) {
        const f = hz(n);
        if (s.leadType === 'bell') { osc({ at: time, type: 'sine', f, a: 0.003, d: 0.6, v: s.leadV, out }); osc({ at: time, type: 'sine', f: f * 2.01, a: 0.003, d: 0.3, v: s.leadV * 0.4, out }); }
        else osc({ at: time, type: s.leadType === 'saw' ? 'sawtooth' : 'square', f, a: 0.01, d: spb * 1.7, v: s.leadV, out, vib: 4, vibF: 5, filter: { type: 'lowpass', f: 2400 } });
      }
    }
  }
  function schedule() {
    const m = mus;
    if (!m || !ok()) return;
    const spb = 60 / (m.song.bpm * m.rate) / 4;
    if (m.next < now() - 0.25) m.next = now() + 0.05; // la pestaña estuvo dormida
    while (m.next < now() + 0.12) { playStep(m, m.step, m.next, spb); m.next += spb; m.step++; }
  }
  function playMusic(name, rate = 1) {
    if (!ok()) return;
    if (mus && mus.name === name) { mus.rate = rate; return; }
    stopMusic(0.35);
    const song = SONGS[name];
    if (!song) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now()); g.gain.exponentialRampToValueAtTime(1, now() + 0.5);
    g.connect(music);
    mus = { name, song, rate, step: 0, next: now() + 0.08, gain: g, timer: setInterval(schedule, 25) };
  }
  function stopMusic(fade = 0.35) {
    if (!mus) return;
    const m = mus; mus = null;
    clearInterval(m.timer);
    if (ok()) { m.gain.gain.cancelScheduledValues(now()); m.gain.gain.setTargetAtTime(0.0001, now(), fade / 3); }
    setTimeout(() => { try { m.gain.disconnect(); } catch (e) { /* nada */ } }, fade * 1000 + 400);
  }
  function duck(on) { if (ok() && st.music) music.gain.setTargetAtTime(on ? MUSIC_VOL * 0.35 : MUSIC_VOL, now(), 0.15); }

  /* ---------- API para el juego ---------- */
  const api = {
    init,
    get on() { return st.sfx; },
    get musicOn() { return st.music; },
    setSfx(on) { st.sfx = on; set('kvj_sound', on); if (ok()) sfx.gain.setTargetAtTime(on ? 1 : 0, now(), 0.05); },
    setMusic(on) { st.music = on; set('kvj_music', on); if (ok()) music.gain.setTargetAtTime(on ? MUSIC_VOL : 0, now(), 0.1); },
    music: playMusic, stopMusic, duck,
    musicName: () => (mus ? mus.name : null),

    // voces
    barkK, barkJ, barkK2, yelp, whine, howl, growl: (o) => growl(o), laugh, pant, chomp,
    yelpK: (t = 0) => yelp({ p: 1.25, t }),
    yelpJ: (t = 0) => yelp({ p: 0.95, t, v: 0.13 }),
    whineK: (t = 0) => whine({ p: 1.2, t }),
    whineJ: (t = 0) => whine({ p: 0.9, t, v: 0.09 }),

    // efectos del juego
    catch(combo) { chomp({ p: 1 + Math.min(combo, 16) * 0.02 }); osc({ type: 'square', f: 600 + ((combo - 1) % 8) * 60, f2: 900 + ((combo - 1) % 8) * 80, d: 0.06, v: 0.025 }); },
    gold() { chime({ v: 0.08 }); barkK({ v: 0.12, t: 0.05 }); },
    hit() { yelp({ p: 1.25 }); thud({ v: 0.25 }); whine({ p: 1.2, t: 0.22, v: 0.07, d: 0.35 }); },
    power() { fanfare([392, 523, 659, 784, 1047], { step: 0.06, v: 0.05 }); barkK2({ t: 0.3, v: 0.15 }); },
    combo() { chime({ v: 0.06, base: 1318 }); },
    comboWord(m) { fanfare([523, 659, 784, 1047].slice(0, Math.min(4, m)), { step: 0.07, v: 0.05, last: 0.25 }); barkK2({ t: 0.08, v: 0.14 }); },
    life() { chomp({ v: 0.1 }); chomp({ v: 0.1, t: 0.1 }); fanfare([523, 659, 784, 1047], { t: 0.15, step: 0.06, v: 0.05, type: 'triangle' }); },
    miss() { osc({ type: 'triangle', f: 360, f2: 170, d: 0.18, v: 0.05 }); },
    bounce() { osc({ type: 'sine', f: 260, f2: 900, d: 0.12, v: 0.12 }); },
    growlJ() { growl({ d: 0.9, v: 0.18 }); },
    over() { sadTrombone(); },
    record() { fanfare([523, 659, 784, 1047, 784, 1047, 1319], { step: 0.1, v: 0.06, last: 0.6 }); },
    bonk(combo) { const f = 220 + Math.min(combo, 15) * 20; osc({ type: 'square', f: f * 2, f2: f, d: 0.08, v: 0.05 }); osc({ type: 'triangle', f: 700, f2: 320, d: 0.07, v: 0.12 }); noise({ d: 0.04, v: 0.1, type: 'bandpass', f: 2600 }); if (Math.random() < 0.6) yelp({ p: 0.95, t: 0.04, v: 0.1 }); },
    whiff() { whoosh({ v: 0.04, f: 900, f2: 2200, d: 0.08 }); },
    tick() { osc({ type: 'square', f: 1250, d: 0.05, v: 0.04 }); },
    countTick() { osc({ type: 'square', f: 1600, d: 0.025, v: 0.02 }); },
    throw() { whoosh({ v: 0.06, f: 700, f2: 2800, d: 0.11 }); },
    thwack() { osc({ type: 'triangle', f: 760, f2: 330, d: 0.06, v: 0.13 }); noise({ d: 0.035, v: 0.09, type: 'bandpass', f: 2600 }); if (Math.random() < 0.35) yelp({ p: 0.95, t: 0.03, v: 0.1 }); },
    empty() { osc({ type: 'square', f: 150, d: 0.07, v: 0.04 }); whine({ p: 1.3, v: 0.04, d: 0.2 }); },
    woof() { // súper ladrido: grande, con eco y temblor
      bark({ p: 1.05, size: 1.7, v: 0.32, wet: true, rough: 0.4 });
      bark({ p: 0.98, size: 1.9, v: 0.26, t: 0.2, wet: true, rough: 0.45 });
      osc({ type: 'sine', f: 110, f2: 40, d: 0.6, v: 0.3 });
      whoosh({ v: 0.08, f: 300, f2: 4000, d: 0.5 });
    },
    dash() { whoosh({ v: 0.09, f: 400, f2: 3400, d: 0.16 }); osc({ type: 'sine', f: 300, f2: 1100, d: 0.12, v: 0.05 }); },
    boom() { explosion({ v: 0.28 }); },
    squish() { noise({ d: 0.07, v: 0.09, type: 'bandpass', f: 1400, f2: 500, q: 2 }); osc({ type: 'sine', f: 2100, f2: 3200, d: 0.05, v: 0.03 }); },
    web() { noise({ d: 0.25, v: 0.12, type: 'lowpass', f: 1400, f2: 250 }); osc({ type: 'sine', f: 220, f2: 80, d: 0.2, v: 0.08 }); },
    win(t = 0) { fanfare([523, 659, 784, 1047, 1319], { t, step: 0.09, v: 0.06, last: 0.5 }); howl({ p: 1.2, t: t + 0.5, v: 0.09, d: 1.2 }); },
    coin() { osc({ type: 'square', f: 988, d: 0.07, v: 0.04 }); osc({ type: 'square', f: 1319, d: 0.16, v: 0.04, t: 0.07 }); },
    purchase() { noise({ d: 0.08, v: 0.08, type: 'highpass', f: 5000 }); api.coin(); barkK({ t: 0.18, v: 0.1 }); },
    warn() { osc({ type: 'square', f: 440, d: 0.1, v: 0.045 }); osc({ type: 'square', f: 440, d: 0.1, v: 0.045, t: 0.18 }); growl({ d: 0.45, v: 0.12 }); },
    skitter() { for (let i = 0; i < 6; i++) noise({ t: i * 0.035, d: 0.015, v: 0.035, type: 'highpass', f: 4200 }); },
    ready() { chime({ v: 0.06, base: 1046 }); barkK({ t: 0.12, v: 0.12 }); },
    stun() { for (let i = 0; i < 4; i++) osc({ type: 'sine', f0: 2200, f: 2900, f2: 2400, a: 0.03, d: 0.08, v: 0.03, t: i * 0.12 }); },
    heartbeat() { osc({ type: 'sine', f: 70, f2: 45, d: 0.12, v: 0.3 }); osc({ type: 'sine', f: 62, f2: 40, d: 0.12, v: 0.2, t: 0.17 }); },
    click() { osc({ type: 'triangle', f: 1100, f2: 700, d: 0.04, v: 0.04 }); },
    stamp() { impact({ v: 0.25 }); },
    whistle() { osc({ type: 'sine', f: 2100, d: 0.5, v: 0.08, vib: 60, vibF: 28 }); },
    rumble(d = 1.6) { noise({ a: 0.4, d, v: 0.18, type: 'lowpass', f: 160 }); osc({ type: 'sine', f: 45, a: 0.4, d, v: 0.18 }); },
    impact, thud, whoosh, chime, explosion,
    victory() { fanfare([523, 523, 523, 659, 784, 659, 784, 1047], { step: 0.14, v: 0.06, last: 0.9 }); },
  };
  return api;
})();
