'use strict';
/* Kaska vs Joselito · dos juegos: "La noche de los caramelos" y "Aplasta a Joselito" */
(() => {
  const TAU = Math.PI * 2;
  const $ = (id) => document.getElementById(id);
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const fmt = (n) => Math.round(n).toLocaleString('es-ES');
  const FT = '"Luckiest Guy", Impact, sans-serif';
  const FB = 'Fredoka, "Trebuchet MS", sans-serif';

  const MAX_LIVES = 5;
  const START_LIVES = 3;
  const MAX_MULT = 5;
  const COMBO_STEP = 8;        // caramelos seguidos para subir el multiplicador
  const SHIELD_TIME = 7;
  const FURY_TIME = 6.5;

  const CANDY_COLS = [
    { main: '#ff4f9a', dark: '#c21f69' },
    { main: '#4fd1ff', dark: '#1a8db8' },
    { main: '#9be15d', dark: '#4f9a1c' },
    { main: '#b07cff', dark: '#6f3cc9' },
    { main: '#ff9a3c', dark: '#c25e00' },
  ];
  const GOLD = { main: '#ffd23f', dark: '#c79100' };

  const J_TAUNTS = [
    '¡Esos caramelos son MÍOS!', '¡Grrrr!', '¡Kaska, eres lentísimo!', '¡Muajajaja!',
    '¡Truco o trato!', '¡Te voy a llenar de arañas!', '¡Ocho patas, cero piedad!', '¡No los toques!',
  ];
  const J_LAUGH = ['¡JA JA JA!', '¡Toma araña!', '¡Pillado!', '¡Muajaja!'];
  const K_HAPPY = ['¡Ñam ñam!', '¡Toma ya!', '¡Guau!', '¡A por más!', '¡Qué rico!'];
  const OVER_TITLES = [
    '¡Joselito te ha pillado!', '¡Atrapado en la telaraña!', '¡Las arañas ganan esta vez!',
    '¡Joselito se queda los caramelos!',
  ];
  const RANKS = [
    [0, 'Cachorro miedoso'], [150, 'Rastreador de chuches'], [400, 'Cazador de caramelos'],
    [900, 'Azote de arañas'], [1800, 'Terror de Joselito'], [3500, 'Rey de Halloween'], [7000, 'Leyenda canina'],
  ];

  // modo "Aplasta a Joselito"
  const WHACK_TIME = 30;
  const WHACK_STEP = 5;        // Joselitos seguidos para subir el multiplicador
  const W_HIT = ['¡PAF!', '¡ZAS!', '¡BONK!', '¡TOMA!', '¡POW!', '¡CATAPLÁN!'];
  const W_ESCAPE = ['¡Ja! ¡Lento!', '¡No me pillas!', '¡Muajaja!', '¡Fallaste!', '¡Por aquí!'];
  const W_OUCH = ['¡Ay! ¡Que soy el bueno!', '¡Auuu!', '¡Eh, que soy Kaska!', '¡A mí no!'];
  const W_OVER_TITLES = ['¡Se acabó el tiempo!', '¡Joselito sobrevive... por ahora!', '¡Tiempo!'];
  const W_RANKS = [
    [0, 'Aprendiz de aplastador'], [150, 'Martillo novato'], [400, 'Cazador de Joselitos'],
    [800, 'Pesadilla de Joselito'], [1300, 'Aplastador profesional'], [2000, 'Rey de las calabazas'], [3000, 'Leyenda del martillazo'],
  ];
  const MODE_NAMES = { caramelos: 'La noche de los caramelos', aplasta: 'Aplasta a Joselito' };

  /* ---------- guardado (un ranking por modo) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin guardado */ } },
  };
  const rankKey = (mode) => (mode === 'aplasta' ? 'kvj_ranking_aplasta' : 'kvj_ranking');
  const getRanking = (mode = S.mode) => { const r = store.get(rankKey(mode), []); return Array.isArray(r) ? r : []; };
  const saveRanking = (r, mode = S.mode) => store.set(rankKey(mode), r);
  const bestScore = (mode = S.mode) => { const r = getRanking(mode); return r.length ? r[0].score : 0; };

  /* ---------- sonido (sintetizado, sin archivos) ---------- */
  const Snd = {
    ctx: null,
    on: store.get('kvj_sound', true),
    init() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    tone(f, d, type = 'square', v = 0.06, f2 = 0, delay = 0) {
      if (!this.on || !this.ctx) return;
      const c = this.ctx, t = c.currentTime + delay;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + d + 0.03);
    },
    catch(combo) { const f = 520 + ((combo - 1) % COMBO_STEP) * 45; this.tone(f, 0.09, 'square', 0.045, f * 1.5); },
    gold() { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.09, 0, i * 0.055)); },
    hit() { this.tone(240, 0.4, 'sawtooth', 0.11, 50); this.tone(120, 0.3, 'square', 0.05, 40); },
    power() { [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'square', 0.045, 0, i * 0.07)); },
    combo() { this.tone(880, 0.08, 'square', 0.05); this.tone(1320, 0.14, 'square', 0.05, 0, 0.08); },
    life() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.09, 0, i * 0.06)); },
    miss() { this.tone(330, 0.18, 'triangle', 0.06, 160); },
    bounce() { this.tone(300, 0.1, 'triangle', 0.08, 900); },
    growl() { this.tone(110, 0.9, 'sawtooth', 0.09, 55); this.tone(116, 0.9, 'square', 0.04, 60); },
    phew() { [659, 784].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.08, 0, i * 0.1)); },
    over() { [523, 415, 330, 262].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.1, 0, i * 0.17)); },
    record() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'square', 0.05, 0, 0.75 + i * 0.1)); },
    bonk(combo) { const f = 220 + Math.min(combo, 15) * 20; this.tone(f * 2, 0.08, 'square', 0.06, f); this.tone(95, 0.13, 'triangle', 0.13, 50); },
    whiff() { this.tone(520, 0.06, 'triangle', 0.025, 300); },
    tick() { this.tone(1250, 0.05, 'square', 0.04); },
  };
  const vib = (p) => { if (Snd.on && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* nada */ } } };

  /* ---------- imágenes ---------- */
  const IMG = {};
  const loadImg = (k, src) => { const i = new Image(); i.src = src; IMG[k] = i; };
  loadImg('k', 'img/kaska.png');
  loadImg('j', 'img/joselito.png');
  loadImg('jf', 'img/joselito-furioso.png');
  const ready = (i) => i && i.complete && i.naturalWidth > 0;

  /* ---------- canvas ---------- */
  const canvas = $('c');
  const ctx = canvas.getContext('2d');
  const bg = document.createElement('canvas');
  let W = 0, H = 0, DPR = 1, U = 1, canvasLeft = 0;

  const S = {
    mode: store.get('kvj_lastmode', 'caramelos') === 'aplasta' ? 'aplasta' : 'caramelos',
    timeLeft: WHACK_TIME, taps: 0, hits: 0, whacked: 0, golds: 0, lastCall: false, paws: [],
    state: 'menu', clock: 0, t: 0, score: 0, lives: START_LIVES, combo: 0, maxCombo: 0, mult: 1, caught: 0,
    items: [], parts: [], popups: [], bats: [], nextBat: 3, stars: [],
    spawnT: 1, shieldT: 0, invT: 0, shake: 0, flash: 0, scorePulse: 0,
    furyT: 0, nextFury: 24, furyWarned: false, furies: 0, nextTaunt: 4,
    jBub: null, kBub: null, banner: null, dyingT: 0, groundY: 0, myId: null,
  };
  const K = { x: 0, tx: 0, y: 0, r: 40, vx: 0, tilt: 0, squash: 0 };
  const J = { x: 0, tx: 0, y: 0, baseY: 0, r: 42, vx: 0, phase: 0, retT: 0, throwT: 0, laughT: 0 };

  for (let i = 0; i < 70; i++) S.stars.push({ x: Math.random(), y: Math.random() * 0.75, s: rand(0.6, 1.8), p: rand(0, TAU) });

  function resize() {
    const r = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height; canvasLeft = r.left;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    U = Math.min(W / 400, H / 700);
    K.r = 44 * U; J.r = 42 * U;
    S.groundY = H - 58 * U;
    K.y = S.groundY - K.r - 6 * U;
    J.baseY = 100 * U + J.r;
    K.tx = clamp(K.tx || W / 2, K.r, W - K.r); K.x = clamp(K.x || W / 2, K.r, W - K.r);
    J.tx = clamp(J.tx || W / 2, J.r, W - J.r); J.x = clamp(J.x || W / 2, J.r, W - J.r);
    J.y = J.baseY;
    layoutWhack();
    buildBg();
  }

  /* ---------- fondo estático (se pinta una vez) ---------- */
  function buildBg() {
    bg.width = canvas.width; bg.height = canvas.height;
    const b = bg.getContext('2d');
    b.setTransform(DPR, 0, 0, DPR, 0, 0);
    const g = b.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b0519'); g.addColorStop(0.55, '#2a1146'); g.addColorStop(1, '#4a1d4f');
    b.fillStyle = g; b.fillRect(0, 0, W, H);

    // luna
    const mx = W * 0.8, my = H * 0.24, mr = 44 * U;
    const halo = b.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 4);
    halo.addColorStop(0, 'rgba(255,236,190,.28)'); halo.addColorStop(1, 'rgba(255,236,190,0)');
    b.fillStyle = halo; b.fillRect(0, 0, W, H);
    b.fillStyle = '#fff1c4'; b.beginPath(); b.arc(mx, my, mr, 0, TAU); b.fill();
    b.fillStyle = 'rgba(220,196,140,.5)';
    [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.4, 0.12], [0.35, -0.35, 0.09]].forEach(([dx, dy, rr]) => {
      b.beginPath(); b.arc(mx + dx * mr, my + dy * mr, rr * mr, 0, TAU); b.fill();
    });

    // colinas lejanas con tumbas
    b.fillStyle = '#26103a';
    b.beginPath(); b.moveTo(0, H);
    for (let x = 0; x <= W + 10; x += 10) b.lineTo(x, H * 0.8 - Math.sin(x / W * 5 + 1) * 18 * U - Math.sin(x / W * 13) * 6 * U);
    b.lineTo(W, H); b.closePath(); b.fill();
    b.fillStyle = '#2f1546';
    [0.22, 0.36, 0.62, 0.7].forEach((fx, i) => {
      const x = W * fx, y = H * 0.8 - Math.sin(fx * 5 + 1) * 18 * U - 8 * U, w = (10 + i % 2 * 4) * U, h = (16 + i % 2 * 6) * U;
      roundRectPath(b, x - w / 2, y - h, w, h + 10 * U, [w / 2, w / 2, 2, 2]); b.fill();
    });

    // árbol seco
    b.strokeStyle = '#1a0a28'; b.lineCap = 'round';
    const tree = (x, y, len, ang, w, depth) => {
      if (depth === 0) return;
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      b.lineWidth = w; b.beginPath(); b.moveTo(x, y); b.lineTo(x2, y2); b.stroke();
      tree(x2, y2, len * 0.72, ang - 0.45, w * 0.65, depth - 1);
      tree(x2, y2, len * 0.68, ang + 0.4, w * 0.65, depth - 1);
    };
    tree(W * 0.08, S.groundY + 6 * U, 70 * U, -Math.PI / 2 + 0.12, 9 * U, 5);

    // suelo
    b.fillStyle = '#170a24';
    b.beginPath(); b.moveTo(0, H);
    for (let x = 0; x <= W + 10; x += 10) b.lineTo(x, S.groundY - Math.sin(x / W * 4) * 5 * U);
    b.lineTo(W, H); b.closePath(); b.fill();
    b.strokeStyle = 'rgba(160,110,200,.25)'; b.lineWidth = 2;
    b.beginPath();
    for (let x = 0; x <= W + 10; x += 10) { const y = S.groundY - Math.sin(x / W * 4) * 5 * U; x ? b.lineTo(x, y) : b.moveTo(x, y); }
    b.stroke();

    // tumbas delante
    [[0.9, 1], [0.78, 0.75]].forEach(([fx, s]) => {
      const x = W * fx, w = 30 * U * s, h = 42 * U * s, y = S.groundY + 4 * U;
      b.fillStyle = '#3a2452'; roundRectPath(b, x - w / 2, y - h, w, h, [w / 2, w / 2, 3, 3]); b.fill();
      b.fillStyle = '#2a1840'; roundRectPath(b, x - w / 2 + 3, y - h + 3, w - 6, h, [w / 2, w / 2, 3, 3]); b.fill();
      b.fillStyle = 'rgba(255,255,255,.22)'; b.font = `${11 * U * s}px ${FT}`; b.textAlign = 'center'; b.textBaseline = 'middle';
      b.fillText('RIP', x, y - h * 0.55);
    });

    // telaraña en la esquina
    b.strokeStyle = 'rgba(255,255,255,.13)'; b.lineWidth = 1;
    const wr = 120 * U, spokes = 6;
    for (let i = 0; i <= spokes; i++) {
      const a = (i / spokes) * Math.PI / 2;
      b.beginPath(); b.moveTo(0, 0); b.lineTo(Math.cos(a) * wr, Math.sin(a) * wr); b.stroke();
    }
    for (let ring = 1; ring <= 4; ring++) {
      const rr = (ring / 4) * wr * 0.95;
      b.beginPath();
      for (let i = 0; i <= spokes; i++) {
        const a = (i / spokes) * Math.PI / 2;
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        if (i === 0) b.moveTo(x, y);
        else {
          const am = ((i - 0.5) / spokes) * Math.PI / 2, sag = rr * 0.86;
          b.quadraticCurveTo(Math.cos(am) * sag, Math.sin(am) * sag, x, y);
        }
      }
      b.stroke();
    }
  }

  function roundRectPath(c, x, y, w, h, r) {
    const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
    c.beginPath();
    c.moveTo(x + tl, y);
    c.lineTo(x + w - tr, y); c.quadraticCurveTo(x + w, y, x + w, y + tr);
    c.lineTo(x + w, y + h - br); c.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    c.lineTo(x + bl, y + h); c.quadraticCurveTo(x, y + h, x, y + h - bl);
    c.lineTo(x, y + tl); c.quadraticCurveTo(x, y, x + tl, y);
    c.closePath();
  }

  /* ---------- dibujos de objetos ---------- */
  function drawCandy(c, x, y, r, rot, col) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = col.dark;
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(s * r * 0.6, 0); c.lineTo(s * r * 1.4, -r * 0.6); c.lineTo(s * r * 1.25, 0); c.lineTo(s * r * 1.4, r * 0.6); c.closePath(); c.fill();
    }
    c.fillStyle = col.main;
    c.beginPath(); c.ellipse(0, 0, r * 0.88, r * 0.68, 0, 0, TAU); c.fill();
    c.save(); c.clip();
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = r * 0.2;
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * r * 0.5 - r * 0.4, -r); c.lineTo(i * r * 0.5 + r * 0.4, r); c.stroke(); }
    c.restore();
    c.lineWidth = Math.max(1, r * 0.08); c.strokeStyle = col.dark;
    c.beginPath(); c.ellipse(0, 0, r * 0.88, r * 0.68, 0, 0, TAU); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.75)';
    c.beginPath(); c.ellipse(-r * 0.32, -r * 0.3, r * 0.24, r * 0.12, -0.5, 0, TAU); c.fill();
    c.restore();
  }

  let HALOS = true; // los iconos de la ayuda se pintan sin brillo
  function glow(c, x, y, r0, r1, rgb, a) {
    if (!HALOS) return;
    const g = c.createRadialGradient(x, y, r0, x, y, r1);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r1, 0, TAU); c.fill();
  }

  function drawGold(c, x, y, r, rot, t) {
    glow(c, x, y, r * 0.4, r * 2.4, '255,220,80', 0.55);
    drawCandy(c, x, y, r, rot, GOLD);
    // destellos
    c.save(); c.translate(x, y); c.rotate(t * 2);
    c.fillStyle = '#fff';
    for (let i = 0; i < 2; i++) {
      const a = i * Math.PI / 2 + t, d = r * 1.25, s = r * (0.25 + 0.15 * Math.sin(t * 6 + i));
      star4(c, Math.cos(a) * d, Math.sin(a) * d, s);
    }
    c.restore();
  }
  function star4(c, x, y, s) {
    c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.3, y - s * 0.3); c.lineTo(x + s, y); c.lineTo(x + s * 0.3, y + s * 0.3);
    c.lineTo(x, y + s); c.lineTo(x - s * 0.3, y + s * 0.3); c.lineTo(x - s, y); c.lineTo(x - s * 0.3, y - s * 0.3); c.closePath(); c.fill();
  }

  function spiderLegs(c, x, y, R, t, speed, inner, knee, foot, color, width, outline) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    const angles = [-0.85, -0.3, 0.25, 0.8];
    for (const pass of outline ? [0, 1] : [1]) {
      c.strokeStyle = pass === 0 ? 'rgba(255,255,255,.22)' : color;
      c.lineWidth = pass === 0 ? width + 3 : width;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          const w = Math.sin(t * speed + i * 1.3 + (side > 0 ? 0 : Math.PI)) * 0.16;
          const a = angles[i];
          const ak = a - 0.42 + w, af = a + 0.45 + w * 1.5;
          c.beginPath();
          c.moveTo(x + side * Math.cos(a) * R * inner, y + Math.sin(a) * R * inner);
          c.lineTo(x + side * Math.cos(ak) * R * knee, y + Math.sin(ak) * R * knee);
          c.lineTo(x + side * Math.cos(af) * R * foot, y + Math.sin(af) * R * foot);
          c.stroke();
        }
      }
    }
  }

  function drawSpider(c, x, y, r, t) {
    glow(c, x, y, r * 0.3, r * 2.2, '255,40,60', 0.35);
    spiderLegs(c, x, y, r, t, 18, 0.3, 1.15, 1.75, '#0d0a10', Math.max(1.5, r * 0.14), true);
    c.fillStyle = '#17121c';
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1.5;
    c.beginPath(); c.ellipse(x, y + r * 0.15, r * 0.72, r * 0.82, 0, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.arc(x, y - r * 0.62, r * 0.45, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#ff3045';
    c.beginPath(); c.arc(x - r * 0.17, y - r * 0.68, r * 0.13, 0, TAU); c.arc(x + r * 0.17, y - r * 0.68, r * 0.13, 0, TAU); c.fill();
    // reloj de arena rojo en el lomo
    c.beginPath();
    c.moveTo(x - r * 0.2, y - r * 0.05); c.lineTo(x + r * 0.2, y - r * 0.05); c.lineTo(x, y + r * 0.2);
    c.lineTo(x + r * 0.2, y + r * 0.45); c.lineTo(x - r * 0.2, y + r * 0.45); c.lineTo(x, y + r * 0.2); c.closePath(); c.fill();
  }

  function drawPumpkin(c, x, y, r, rot, t) {
    glow(c, x, y, r * 0.5, r * 2.2, '255,150,40', 0.45);
    c.save(); c.translate(x, y); c.rotate(Math.sin(rot) * 0.25);
    c.fillStyle = '#4f8a2a'; c.fillRect(-r * 0.1, -r * 1.05, r * 0.2, r * 0.38);
    c.strokeStyle = '#b84a00'; c.lineWidth = Math.max(1, r * 0.06);
    c.fillStyle = '#e8661a';
    for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * r * 0.42, 0, r * 0.52, r * 0.78, 0, 0, TAU); c.fill(); c.stroke(); }
    c.fillStyle = '#ff8a2a';
    c.beginPath(); c.ellipse(0, 0, r * 0.5, r * 0.82, 0, 0, TAU); c.fill(); c.stroke();
    const shine = 0.75 + 0.25 * Math.sin(t * 8);
    c.fillStyle = `rgba(255,${Math.round(210 * shine + 30)},60,1)`;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * r * 0.42, -r * 0.3); c.lineTo(s * r * 0.15, -r * 0.05); c.lineTo(s * r * 0.55, -r * 0.02); c.closePath(); c.fill(); }
    c.beginPath(); c.moveTo(-r * 0.55, r * 0.18);
    const teeth = 5;
    for (let i = 1; i <= teeth; i++) c.lineTo(-r * 0.55 + (i - 0.5) * (r * 1.1 / teeth), r * 0.18 + (i % 2 ? r * 0.12 : 0));
    c.lineTo(r * 0.55, r * 0.18); c.quadraticCurveTo(0, r * 0.7, -r * 0.55, r * 0.18); c.fill();
    c.restore();
  }

  function drawBone(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = '#fbf3df'; c.strokeStyle = '#b9a98a'; c.lineWidth = Math.max(1, r * 0.08);
    c.beginPath();
    c.rect(-r * 0.75, -r * 0.2, r * 1.5, r * 0.4);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { c.moveTo(sx * r * 0.85 + r * 0.3, sy * r * 0.24); c.arc(sx * r * 0.85, sy * r * 0.24, r * 0.3, 0, TAU); }
    c.fill();
    c.restore();
    // corazoncito encima para dejar claro que es una vida
    drawHeart(c, x, y, r * 0.32, '#ff4b6e', null);
  }

  function drawHeart(c, x, y, s, fill, stroke) {
    c.beginPath();
    c.moveTo(x, y + s * 0.9);
    c.bezierCurveTo(x - s * 1.6, y - s * 0.1, x - s * 0.9, y - s * 1.4, x, y - s * 0.55);
    c.bezierCurveTo(x + s * 0.9, y - s * 1.4, x + s * 1.6, y - s * 0.1, x, y + s * 0.9);
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = Math.max(1.5, s * 0.22); c.stroke(); }
  }

  function drawItem(c, it, t) {
    switch (it.type) {
      case 'candy': drawCandy(c, it.x, it.y, it.r, it.rot, it.col); break;
      case 'gold': drawGold(c, it.x, it.y, it.r, it.rot, t); break;
      case 'spider': drawSpider(c, it.x, it.y, it.r, t + it.seed); break;
      case 'pumpkin': drawPumpkin(c, it.x, it.y, it.r, it.rot, t); break;
      case 'bone': drawBone(c, it.x, it.y, it.r, it.rot); break;
    }
  }

  function drawToken(img, x, y, r, ring) {
    ctx.fillStyle = '#2a2030';
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    if (ready(img)) ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    ctx.lineWidth = Math.max(3, r * 0.13); ctx.strokeStyle = ring;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  }

  function drawBat(x, y, s, ph) {
    const f = Math.sin(ph);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(8,3,14,.85)';
    ctx.beginPath(); ctx.ellipse(0, 0, 4, 6, 0, 0, TAU); ctx.fill();
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(0, -2);
      ctx.quadraticCurveTo(side * 10, -8 - f * 8, side * 22, -3 - f * 10);
      ctx.quadraticCurveTo(side * 17, 0, side * 15, 5);
      ctx.quadraticCurveTo(side * 11, 1, side * 8, 6);
      ctx.quadraticCurveTo(side * 5, 2, 0, 4);
      ctx.fill();
    }
    ctx.restore();
  }

  function txt(s, x, y, size, color, align = 'center', font = FT, stroke = '#1a0726', sw = null) {
    ctx.font = `${size}px ${font}`;
    ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = sw == null ? size * 0.2 : sw; ctx.strokeStyle = stroke;
    ctx.strokeText(s, x, y);
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  }

  function drawBubble(text, x, y, alpha, tailDir) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `600 ${15 * U}px ${FB}`;
    const w = ctx.measureText(text).width + 24 * U, h = 32 * U;
    const bx = clamp(x - w / 2, 8, W - w - 8), by = y - h / 2;
    const tx = clamp(x, bx + 16 * U, bx + w - 16 * U);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1a0726'; ctx.lineWidth = 2;
    roundRectPath(ctx, bx, by, w, h, 12 * U); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    if (tailDir < 0) { ctx.moveTo(tx - 7 * U, by + 1); ctx.lineTo(tx, by - 9 * U); ctx.lineTo(tx + 7 * U, by + 1); }
    else { ctx.moveTo(tx - 7 * U, by + h - 1); ctx.lineTo(tx, by + h + 9 * U); ctx.lineTo(tx + 7 * U, by + h - 1); }
    ctx.fill(); ctx.stroke();
    ctx.fillRect(tx - 6 * U, tailDir < 0 ? by + 1 : by + h - 3, 12 * U, 2);
    ctx.fillStyle = '#1a0726'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + w / 2, by + h / 2 + 1);
    ctx.restore();
  }

  /* ---------- efectos ---------- */
  function burst(x, y, colors, n, spd = 240) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(0.3, 1) * spd * U;
      S.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 90 * U, life: rand(0.4, 0.8), max: 0.8, color: pick(colors), size: rand(3, 6) * U, g: 700 * U, rot: rand(0, TAU) });
    }
    if (S.parts.length > 400) S.parts.splice(0, S.parts.length - 400);
  }
  function confetti() {
    const cols = ['#ff7b1c', '#ffd23f', '#9be15d', '#ff4f9a', '#4fd1ff', '#b07cff', '#fff'];
    for (let i = 0; i < 160; i++) {
      S.parts.push({ x: rand(0, W), y: rand(-H * 0.4, -10), vx: rand(-60, 60) * U, vy: rand(80, 260) * U, life: rand(2.5, 4), max: 4, color: pick(cols), size: rand(4, 8) * U, g: 120 * U, rot: rand(0, TAU) });
    }
  }
  function popup(x, y, text, color = '#fff', size = 22) {
    S.popups.push({ x: clamp(x, 40 * U, W - 40 * U), y, text, color, size: size * U, life: 1 });
  }
  function banner(text, sub, color = '#ffd23f', dur = 2) { S.banner = { text, sub, color, t: 0, dur }; }
  // x/y opcionales: si no se pasan, el bocadillo sale junto al personaje del modo caramelos
  function jSay(text, t = 2.2, x = null, y = null) { S.jBub = { text, t, max: t, x, y }; }
  function kSay(text, t = 1.6, x = null, y = null) { S.kBub = { text, t, max: t, x, y }; }
  function addScore(n) { S.score += n; S.scorePulse = 1; }

  /* ---------- juego ---------- */
  function spawnInterval() {
    let i = Math.max(0.34, 0.95 - S.t * 0.0065);
    if (S.furyT > 0) i *= 0.5;
    return i * rand(0.8, 1.2);
  }
  function fallTime() {
    let f = Math.max(0.95, 2.1 - S.t * 0.011);
    if (S.furyT > 0) f *= 0.85;
    return f;
  }

  function spawn() {
    const fury = S.furyT > 0;
    let pSpider = S.t < 4 ? 0 : Math.min(0.4, 0.16 + S.t * 0.003);
    if (fury) pSpider = 0.55;
    let type = 'candy';
    if (Math.random() < pSpider) type = 'spider';
    else {
      const q = Math.random();
      const pGold = fury ? 0.2 : 0.07;
      const hasPumpkin = S.items.some((i) => i.type === 'pumpkin');
      const hasBone = S.items.some((i) => i.type === 'bone');
      if (q < pGold) type = 'gold';
      else if (q < pGold + 0.04 && S.t > 10 && S.shieldT <= 0 && !hasPumpkin) type = 'pumpkin';
      else if (q < pGold + 0.065 && S.t > 15 && S.lives < START_LIVES && !hasBone) type = 'bone';
    }
    const r = ({ candy: 16, gold: 17, spider: 16, pumpkin: 20, bone: 18 })[type] * U;
    const vy = (K.y - J.y) / fallTime() * rand(0.85, 1.15);
    S.items.push({
      type, r,
      x: clamp(J.x + rand(-12, 12) * U, r, W - r),
      y: J.y + J.r * 0.5,
      vx: rand(-1, 1) * W * (fury ? 0.3 : 0.22),
      vy,
      rot: rand(0, TAU), vr: rand(-3, 3),
      col: pick(CANDY_COLS),
      seed: rand(0, 10),
      wob: type === 'spider' ? Math.min(1, S.t / 90) : 0,
      dead: false, taken: false, gone: false,
    });
    J.throwT = 0.18;
  }

  function collect(it) {
    if (it.type === 'candy' || it.type === 'gold') {
      it.taken = true;
      S.combo++; S.caught++; S.maxCombo = Math.max(S.maxCombo, S.combo);
      const m = Math.min(MAX_MULT, 1 + Math.floor(S.combo / COMBO_STEP));
      if (m > S.mult) {
        S.mult = m; Snd.combo();
        popup(K.x, K.y - K.r * 2.3, `COMBO x${m}!`, '#ff9b3d', 30);
        kSay(pick(K_HAPPY));
      }
      const gold = it.type === 'gold';
      const pts = (gold ? 50 : 10) * S.mult * (S.shieldT > 0 ? 2 : 1);
      addScore(pts);
      popup(it.x, it.y - it.r, `+${pts}`, gold ? '#ffd23f' : '#fff', gold ? 28 : 22);
      burst(it.x, it.y, gold ? ['#ffd23f', '#fff3a0', '#fff'] : [it.col.main, it.col.dark, '#fff'], gold ? 22 : 12);
      if (gold) { Snd.gold(); kSay('¡¡Dorado!!'); } else Snd.catch(S.combo);
      K.squash = 1;
    } else if (it.type === 'spider') {
      if (S.shieldT > 0) {
        it.dead = true;
        it.vy = -650 * U; it.vx = (it.x < K.x ? -1 : 1) * 380 * U; it.vr = 14;
        addScore(5 * S.mult);
        popup(it.x, it.y - it.r, '¡FUERA!', '#ff9b3d', 22);
        Snd.bounce();
      } else if (S.invT <= 0) {
        it.taken = true;
        burst(it.x, it.y, ['#111', '#2a1f33', '#ff3045'], 16);
        hit();
      }
    } else if (it.type === 'pumpkin') {
      it.taken = true;
      S.shieldT = SHIELD_TIME;
      Snd.power(); vib(40);
      banner('¡MODO CALABAZA!', 'Escudo anti-arañas · puntos x2', '#ff8c2a', 1.8);
      burst(it.x, it.y, ['#ff8a2a', '#ffd23f', '#4f8a2a'], 22);
      kSay('¡Soy invencible!');
    } else if (it.type === 'bone') {
      it.taken = true;
      if (S.lives < MAX_LIVES) { S.lives++; popup(it.x, it.y - it.r, '+1 VIDA', '#ff7b9a', 26); }
      else { addScore(100); popup(it.x, it.y - it.r, '+100', '#ffd23f', 26); }
      Snd.life();
      burst(it.x, it.y, ['#fbf3df', '#ff4b6e', '#fff'], 16);
      kSay('¡Un hueso! ¡Ñam!');
    }
  }

  function hit() {
    S.lives--;
    S.invT = 1.6; S.shake = 14 * U; S.flash = 0.45;
    if (S.combo >= COMBO_STEP) popup(K.x, K.y - K.r * 2.2, 'Combo perdido', '#ff6b6b', 20);
    S.combo = 0; S.mult = 1;
    Snd.hit(); vib(160);
    J.laughT = 1.4; jSay(pick(J_LAUGH), 1.5);
    if (S.lives <= 0) die();
  }

  function missed(it) {
    if (S.combo >= 4) { popup(it.x, S.groundY - 30 * U, 'Combo perdido', '#ff6b6b', 18); Snd.miss(); }
    S.combo = 0; S.mult = 1;
    if (it.type === 'gold') jSay('¡El dorado es para mí!', 1.6);
  }

  function die() {
    S.state = 'dying'; S.dyingT = 1.5;
    Snd.over(); vib([80, 60, 220]);
    J.laughT = 3; jSay('¡MUAJAJAJA!', 3);
    $('btnPause').classList.add('hidden');
  }

  function updateGame(dt, dying) {
    if (!dying) {
      S.t += dt;
      if (keys.left) K.tx -= 640 * U * dt;
      if (keys.right) K.tx += 640 * U * dt;
      K.tx = clamp(K.tx, K.r, W - K.r);
    }
    const px = K.x;
    if (!dying) K.x += (K.tx - K.x) * (1 - Math.exp(-dt * 20));
    K.vx = (K.x - px) / Math.max(dt, 1e-4);

    S.invT = Math.max(0, S.invT - dt);
    S.shieldT = Math.max(0, S.shieldT - dt);

    if (!dying) {
      // furia de Joselito
      if (S.furyT > 0) {
        S.furyT -= dt;
        if (S.furyT <= 0) {
          S.furyT = 0; S.furies++;
          const bonus = 100 * S.furies;
          addScore(bonus);
          banner('¡FURIA SUPERADA!', `+${bonus} puntos`, '#9be15d', 1.8);
          Snd.phew(); kSay('¡Uf, por los pelos!');
          S.nextFury = rand(22, 30);
        }
      } else {
        S.nextFury -= dt;
        if (S.nextFury <= 1.6 && !S.furyWarned) {
          S.furyWarned = true;
          banner('¡JOSELITO SE ENFADA!', '¡Lluvia de arañas!', '#ff4b4b', 1.8);
          Snd.growl(); vib(90);
          jSay('¡¡GRRRRRR!!', 1.6);
        }
        if (S.nextFury <= 0) { S.furyT = FURY_TIME; S.furyWarned = false; S.spawnT = 0.15; }
      }

      S.spawnT -= dt;
      if (S.spawnT <= 0) { spawn(); S.spawnT = spawnInterval(); }

      S.nextTaunt -= dt;
      if (S.nextTaunt <= 0) { if (!S.jBub) jSay(pick(J_TAUNTS)); S.nextTaunt = rand(6, 11); }
    }

    for (const it of S.items) {
      it.y += it.vy * dt; it.x += it.vx * dt; it.rot += it.vr * dt;
      if (it.type === 'spider' && !it.dead) it.x += Math.sin(S.t * 4 + it.seed) * it.wob * 90 * U * dt;
      if (it.x < it.r) { it.x = it.r; it.vx = Math.abs(it.vx); }
      if (it.x > W - it.r) { it.x = W - it.r; it.vx = -Math.abs(it.vx); }
      if (it.dead) it.vy += 1600 * U * dt;
      if (!it.dead && !dying) {
        const dx = it.x - K.x, dy = it.y - K.y, rr = K.r * 0.92 + it.r * 0.7;
        if (dx * dx + dy * dy < rr * rr) collect(it);
      }
      if (!it.taken && it.y - it.r * 2 > H) {
        it.gone = true;
        if (!it.dead && !dying && (it.type === 'candy' || it.type === 'gold')) missed(it);
      }
    }
    S.items = S.items.filter((i) => !i.gone && !i.taken);
  }

  function updateJ(dt) {
    const fury = S.furyT > 0;
    J.retT -= dt;
    if (J.retT <= 0) {
      const chase = S.state === 'playing' && Math.random() < (fury ? 0.6 : 0.35);
      J.tx = clamp(chase ? K.x + rand(-40, 40) * U : rand(0, W), J.r + 8 * U, W - J.r - 8 * U);
      J.retT = fury ? rand(0.35, 0.8) : rand(0.8, 2);
    }
    J.x += (J.tx - J.x) * (1 - Math.exp(-dt * (fury ? 6 : 2.6)));
    J.phase += dt * (fury ? 9 : 2.5);
    J.y = J.baseY + Math.sin(J.phase) * 6 * U;
    J.throwT = Math.max(0, J.throwT - dt);
    J.laughT = Math.max(0, J.laughT - dt);
  }

  function updateFx(dt) {
    for (const p of S.parts) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.rot += dt * 6; }
    S.parts = S.parts.filter((p) => p.life > 0);
    for (const p of S.popups) { p.y -= 55 * U * dt; p.life -= dt * 0.9; }
    S.popups = S.popups.filter((p) => p.life > 0);
    for (const p of S.paws) p.t += dt;
    S.paws = S.paws.filter((p) => p.t < 0.35);
    if (S.banner) { S.banner.t += dt; if (S.banner.t > S.banner.dur) S.banner = null; }
    if (S.jBub) { S.jBub.t -= dt; if (S.jBub.t <= 0) S.jBub = null; }
    if (S.kBub) { S.kBub.t -= dt; if (S.kBub.t <= 0) S.kBub = null; }
    S.shake *= Math.exp(-dt * 9);
    S.flash = Math.max(0, S.flash - dt);
    S.scorePulse = Math.max(0, S.scorePulse - dt * 5);
    K.squash = Math.max(0, K.squash - dt * 5);
    K.tilt += (clamp(K.vx / (900 * U), -0.35, 0.35) - K.tilt) * (1 - Math.exp(-dt * 10));
    // murciélagos
    S.nextBat -= dt;
    if (S.nextBat <= 0) {
      const left = Math.random() < 0.5;
      S.bats.push({ x: left ? -30 : W + 30, y: rand(H * 0.25, H * 0.6), vx: (left ? 1 : -1) * rand(50, 100) * U, ph: 0, s: rand(0.7, 1.2) * U, bob: rand(0, TAU) });
      S.nextBat = rand(5, 12);
    }
    for (const b of S.bats) { b.x += b.vx * dt; b.ph += dt * 14; b.bob += dt * 2; }
    S.bats = S.bats.filter((b) => b.x > -60 && b.x < W + 60);
  }

  function update(dt) {
    S.clock += dt;
    if (S.state === 'paused') return;
    const whack = S.mode === 'aplasta';
    if (S.state === 'playing') { if (whack) updateWhack(dt, false); else updateGame(dt, false); }
    else if (S.state === 'dying') {
      S.dyingT -= dt;
      if (whack) updateWhack(dt, true); else updateGame(dt * 0.35, true);
      if (S.dyingT <= 0) showOver();
    } else {
      // menú / fin: Kaska pasea solo
      K.tx = W / 2 + Math.sin(S.clock * 0.7) * W * 0.28;
      const px = K.x;
      K.x += (K.tx - K.x) * (1 - Math.exp(-dt * 4));
      K.vx = (K.x - px) / Math.max(dt, 1e-4);
    }
    updateJ(dt);
    updateFx(dt);
  }

  /* ---------- modo Aplasta a Joselito ---------- */
  // 9 calabazas (3x3). En cada una puede asomar alguien: o = { type: 'j' | 'jf' | 'k' | 'gold', ... }
  const holes = Array.from({ length: 9 }, () => ({ x: 0, y: 0, w: 0, o: null }));
  let HR = 30; // radio de las caras que salen de las calabazas

  function layoutWhack() {
    const top = 112 * U, bot = S.groundY + 6 * U;
    const ch = (bot - top) / 3;
    const w = Math.min((W / 3) * 0.8, ch / 1.36);
    HR = w * 0.36;
    const bh = w * 0.66;
    holes.forEach((h, i) => {
      const c = i % 3, r = Math.floor(i / 3);
      h.x = W / 2 + (c - 1) * (W / 3) * 0.96;
      h.w = w;
      h.y = top + ch * r + (ch - (1.75 * HR + bh)) / 2 + 1.75 * HR; // altura del borde de la calabaza
    });
  }

  const easeOutBack = (t) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; };
  function occY(h, o) {
    const e = o.state === 'up' ? easeOutBack(clamp(o.pop, 0, 1)) : o.pop;
    return h.y + HR * 1.15 - e * HR * 1.9;
  }

  function whackInterval() {
    const d = clamp(S.t / WHACK_TIME, 0, 1);
    let i = 0.85 - d * 0.47;
    if (S.timeLeft <= 5) i *= 0.8;
    return i * rand(0.75, 1.2);
  }

  function whackSpawn() {
    const d = clamp(S.t / WHACK_TIME, 0, 1);
    const active = holes.filter((h) => h.o).length;
    if (active >= 2 + Math.round(d * 2)) return;
    const free = holes.filter((h) => !h.o);
    if (!free.length) return;
    const h = pick(free);
    const hasGold = holes.some((x) => x.o && x.o.type === 'gold');
    const pK = S.t < 3 ? 0 : 0.17 + d * 0.1;
    const pF = S.t < 5 ? 0 : 0.14;
    const pG = S.t < 7 || hasGold || S.golds >= 3 ? 0 : 0.05;
    const r = Math.random();
    let type = 'j';
    if (r < pK) type = 'k';
    else if (r < pK + pF) type = 'jf';
    else if (r < pK + pF + pG) type = 'gold';
    const base = 1.15 - d * 0.55;
    const dur = type === 'jf' ? base * 0.7 : type === 'k' ? base * 1.25 : type === 'gold' ? 0.95 : base;
    h.o = { type, t: 0, dur: dur * rand(0.9, 1.15), state: 'up', pop: 0, hitT: 0, seed: rand(0, TAU), word: '' };
  }

  function updateWhack(dt, ending) {
    if (!ending) {
      S.t += dt;
      const prevSec = Math.ceil(S.timeLeft);
      S.timeLeft -= dt;
      const sec = Math.ceil(S.timeLeft);
      if (sec !== prevSec && sec <= 5 && sec > 0) Snd.tick();
      if (S.timeLeft > 5) S.lastCall = false;
      else if (!S.lastCall) { S.lastCall = true; banner('¡ÚLTIMOS SEGUNDOS!', null, '#ff4b4b', 1.2); }
      S.spawnT -= dt;
      if (S.spawnT <= 0) { whackSpawn(); S.spawnT = whackInterval(); }
      if (S.timeLeft <= 0) { S.timeLeft = 0; timeUp(); }
    }
    for (const h of holes) {
      const o = h.o;
      if (!o) continue;
      if (o.state === 'up') {
        o.pop = Math.min(1, o.pop + dt / 0.13);
        o.t += dt;
        if (ending || o.t >= o.dur) { o.state = 'down'; if (!ending) whackEscaped(h, o); }
      } else if (o.state === 'hit') {
        o.hitT += dt;
        if (o.hitT > 0.42) o.state = 'down';
      } else {
        o.pop -= dt / 0.12;
        if (o.pop <= 0) h.o = null;
      }
    }
  }

  function whackTap(x, y) {
    S.taps++;
    let best = null, bestD = Infinity;
    for (const h of holes) {
      const o = h.o;
      if (!o || o.state !== 'up' || o.pop < 0.35) continue;
      const dx = x - h.x, dy = y - occY(h, o), d2 = dx * dx + dy * dy, rr = HR * 1.3;
      if (d2 < rr * rr && d2 < bestD) { best = h; bestD = d2; }
    }
    S.paws.push({ x, y, t: 0, rot: rand(-0.4, 0.4) });
    if (!best) { Snd.whiff(); return; }
    const o = best.o, cy = occY(best, o);
    o.state = 'hit'; o.hitT = 0; o.word = pick(W_HIT);

    if (o.type === 'k') {
      if (S.combo >= 3) popup(best.x, cy + HR * 0.9, 'Combo perdido', '#ff6b6b', 18);
      S.combo = 0; S.mult = 1;
      const loss = Math.min(S.score, 30);
      S.score -= loss; S.scorePulse = 1;
      popup(best.x, cy, loss ? `-${loss}` : '¡Ay!', '#ff6b6b', 28);
      S.shake = 10 * U; S.flash = 0.3;
      Snd.hit(); vib(150);
      kSay(pick(W_OUCH), 1.4, best.x, cy - HR - 30 * U);
    } else if (o.type === 'gold') {
      S.hits++; S.golds++;
      S.timeLeft += 3;
      addScore(20);
      popup(best.x, cy - HR, '+3 s', '#ffd23f', 30);
      burst(best.x, cy, ['#ffd23f', '#fff3a0', '#fff'], 22);
      Snd.gold(); vib(30);
    } else {
      S.hits++; S.whacked++; S.combo++;
      S.maxCombo = Math.max(S.maxCombo, S.combo);
      const m = Math.min(MAX_MULT, 1 + Math.floor(S.combo / WHACK_STEP));
      if (m > S.mult) { S.mult = m; Snd.combo(); banner(`¡COMBO x${m}!`, null, '#ff9b3d', 0.9); }
      const pts = (o.type === 'jf' ? 30 : 10) * S.mult;
      addScore(pts);
      popup(best.x, cy - HR * 1.7, `+${pts}`, o.type === 'jf' ? '#ffd23f' : '#9be15d', o.type === 'jf' ? 26 : 22);
      burst(best.x, cy, ['#ffd23f', '#fff', '#ff9b3d', '#1a0726'], 14);
      Snd.bonk(S.combo); vib(25);
      S.shake = Math.max(S.shake, 4 * U);
    }
  }

  function whackEscaped(h, o) {
    if (o.type !== 'j' && o.type !== 'jf') return;
    if (S.combo >= 3) popup(h.x, h.y - HR * 2, 'Combo perdido', '#ff6b6b', 18);
    if (S.combo > 0) Snd.miss();
    S.combo = 0; S.mult = 1;
    if (!S.jBub && Math.random() < 0.35) jSay(pick(W_ESCAPE), 1.2, h.x, h.y - HR * 2.4);
  }

  function timeUp() {
    S.state = 'dying'; S.dyingT = 1.5;
    banner('¡TIEMPO!', null, '#ffd23f', 1.5);
    Snd.over(); vib([60, 40, 120]);
    $('btnPause').classList.add('hidden');
  }

  function drawWhack() {
    for (const h of holes) drawHole(h);
    // efectos del golpe por encima de todo
    for (const h of holes) {
      const o = h.o;
      if (!o || o.state !== 'hit' || o.type === 'k') continue;
      const cy = occY(h, o);
      ctx.fillStyle = '#ffd23f';
      for (let i = 0; i < 3; i++) {
        const a = S.clock * 7 + (i * TAU) / 3;
        star4(ctx, h.x + Math.cos(a) * HR * 0.85, cy - HR * 1.05 + Math.sin(a) * HR * 0.22, HR * 0.2);
      }
      if (o.hitT < 0.3) comicBurst(h.x, cy - HR * 0.1, HR * (0.95 + o.hitT * 1.4), o.word, 1 - Math.max(0, o.hitT - 0.2) / 0.1);
    }
    for (const p of S.paws) drawPaw(p.x, p.y, 17 * U * (0.7 + p.t * 1.2), 1 - p.t / 0.35, p.rot);
  }

  function drawHole(h) {
    const x = h.x, y = h.y, w = h.w;
    const rx = w * 0.36, ry = w * 0.11, bw = w * 0.5, bh = w * 0.66;
    // sombra en el suelo
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(x, y + bh, bw * 0.95, w * 0.07, 0, 0, TAU); ctx.fill();
    // boca de la calabaza (por dentro) y borde de atrás
    ctx.fillStyle = '#2b1206';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#a2400a'; ctx.lineWidth = Math.max(2, w * 0.03);
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, Math.PI, TAU); ctx.stroke();
    // quien asoma (recortado para que no se vea por debajo de la calabaza)
    const o = h.o;
    if (o && o.pop > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x - w, y - HR * 3.2, w * 2, HR * 3.2 + bh * 0.8); ctx.clip();
      drawOccupant(h, o);
      ctx.restore();
    }
    // cuerpo de la calabaza (por delante)
    const g = ctx.createLinearGradient(x - bw, 0, x + bw, 0);
    g.addColorStop(0, '#c2500c'); g.addColorStop(0.45, '#ff8a2a'); g.addColorStop(1, '#b8460a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - rx, y);
    ctx.bezierCurveTo(x - bw * 1.08, y + bh * 0.12, x - bw * 1.05, y + bh, x, y + bh);
    ctx.bezierCurveTo(x + bw * 1.05, y + bh, x + bw * 1.08, y + bh * 0.12, x + rx, y);
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI, false);
    ctx.closePath(); ctx.fill();
    // gajos
    ctx.strokeStyle = 'rgba(120,40,0,.45)'; ctx.lineWidth = Math.max(1.5, w * 0.025);
    for (const s of [-0.55, 0.55]) {
      ctx.beginPath();
      ctx.moveTo(x + s * rx, y + ry * 0.85);
      ctx.quadraticCurveTo(x + s * bw * 1.2, y + bh * 0.55, x + s * bw * 0.45, y + bh * 0.98);
      ctx.stroke();
    }
    // cara de Jack pintada (como el cubo de caramelos de la foto)
    ctx.fillStyle = '#1a0b05';
    const fy = y + bh * 0.42;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * w * 0.14, fy, w * 0.075, w * 0.1, s * 0.25, 0, TAU); ctx.fill(); }
    ctx.beginPath();
    ctx.ellipse(x - w * 0.025, fy + w * 0.11, w * 0.013, w * 0.022, 0, 0, TAU);
    ctx.ellipse(x + w * 0.025, fy + w * 0.11, w * 0.013, w * 0.022, 0, 0, TAU);
    ctx.fill();
    const m0 = [x - w * 0.24, fy + w * 0.13], m1 = [x, fy + w * 0.3], m2 = [x + w * 0.24, fy + w * 0.13];
    ctx.strokeStyle = '#1a0b05'; ctx.lineWidth = Math.max(1.5, w * 0.02); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); ctx.quadraticCurveTo(m1[0], m1[1], m2[0], m2[1]); ctx.stroke();
    ctx.lineWidth = Math.max(1, w * 0.013);
    ctx.beginPath();
    for (let i = 1; i <= 6; i++) {
      const t = i / 7, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
      const px = a * m0[0] + b * m1[0] + c * m2[0], py = a * m0[1] + b * m1[1] + c * m2[1];
      ctx.moveTo(px, py - w * 0.035); ctx.lineTo(px, py + w * 0.035);
    }
    ctx.stroke();
    // borde de delante con brillo
    ctx.strokeStyle = '#ffb066'; ctx.lineWidth = Math.max(2, w * 0.03);
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI, false); ctx.stroke();
  }

  function drawOccupant(h, o) {
    const x = h.x;
    let cy = occY(h, o);
    if (o.type === 'gold') { drawGold(ctx, x, cy, HR * 0.55, Math.sin(S.clock * 3) * 0.4, S.clock); return; }
    let sx = 1, sy = 1, ox = 0;
    if (o.state === 'hit') {
      const k = Math.min(1, o.hitT / 0.08);
      if (o.type === 'k') ox = Math.sin(o.hitT * 60) * 4 * U;
      else { sx = 1 + 0.18 * k; sy = 1 - 0.22 * k; cy += HR * 0.2 * k; }
    } else if (o.type !== 'k') {
      ox = Math.sin(S.clock * 9 + o.seed) * 3 * U; // Joselito se burla moviéndose
    }
    if (o.type !== 'k') {
      spiderLegs(ctx, x + ox, cy, HR * 0.85, S.clock + o.seed, o.type === 'jf' ? 18 : 8, 0.55, 1.4, 1.95, '#0b080d', Math.max(2.5, HR * 0.16), true);
    }
    ctx.save();
    ctx.translate(x + ox, cy); ctx.scale(sx, sy);
    if (o.type === 'k') {
      drawToken(IMG.k, 0, 0, HR, o.state === 'hit' ? '#ff4b4b' : '#ffffff');
      drawBowtie(HR);
      if (o.state === 'hit') { ctx.fillStyle = 'rgba(255,40,40,.35)'; ctx.beginPath(); ctx.arc(0, 0, HR, 0, TAU); ctx.fill(); }
    } else {
      const angry = o.type === 'jf' || o.state === 'hit';
      drawToken(angry ? IMG.jf : IMG.j, 0, 0, HR, o.type === 'jf' ? '#ff3b3b' : '#120a18');
    }
    ctx.restore();
  }

  function comicBurst(x, y, r, word, alpha) {
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.translate(x, y); ctx.rotate(-0.12);
    ctx.beginPath();
    const n = 11;
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * TAU, rr = i % 2 ? r * 0.62 : r;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.8;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffd23f'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#1a0726'; ctx.stroke();
    let size = r * 0.5;
    ctx.font = `${size}px ${FT}`;
    const tw = ctx.measureText(word).width;
    if (tw > r * 1.45) size *= (r * 1.45) / tw;
    txt(word, 0, 2, size, '#ff3b3b', 'center', FT, '#fff', size * 0.2);
    ctx.restore();
  }

  function drawPaw(x, y, s, alpha, rot) {
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1) * 0.85;
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(0, s * 0.25, s * 0.5, s * 0.42, 0, 0, TAU); ctx.fill();
    for (const [dx, dy] of [[-0.55, -0.3], [-0.2, -0.62], [0.2, -0.62], [0.55, -0.3]]) {
      ctx.beginPath(); ctx.ellipse(dx * s, dy * s, s * 0.17, s * 0.22, dx * 0.6, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawTimer() {
    const cx = W - 84, cy = 32 * U, r = 19 * U;
    const low = S.timeLeft <= 5;
    const frac = clamp(S.timeLeft / WHACK_TIME, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.arc(cx, cy, r + 4 * U, 0, TAU); ctx.fill();
    ctx.lineCap = 'round'; ctx.lineWidth = 4 * U;
    ctx.strokeStyle = 'rgba(255,255,255,.15)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    if (frac > 0) {
      ctx.strokeStyle = low ? '#ff4b4b' : '#9be15d';
      ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + frac * TAU); ctx.stroke();
    }
    const pulse = low ? 1 + 0.18 * Math.max(0, Math.sin(S.clock * 12)) : 1;
    txt(String(Math.ceil(S.timeLeft)), cx, cy + U, 19 * U * pulse, low ? '#ff6b6b' : '#fff', 'center', FT, '#1a0726', 3.5 * U);
  }

  /* ---------- render ---------- */
  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.save();
    if (S.shake > 0.5) ctx.translate(rand(-1, 1) * S.shake, rand(-1, 1) * S.shake);
    ctx.drawImage(bg, 0, 0, W, H);

    // estrellas que titilan
    ctx.fillStyle = '#fff';
    for (const s of S.stars) {
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(S.clock * 2 + s.p);
      ctx.fillRect(s.x * W, s.y * H, s.s * U, s.s * U);
    }
    ctx.globalAlpha = 1;
    for (const b of S.bats) drawBat(b.x, b.y + Math.sin(b.bob) * 10 * U, b.s, b.ph);

    if (S.mode === 'aplasta' && S.state !== 'menu') drawWhack();
    else {
      drawJoselito();
      for (const it of S.items) drawItem(ctx, it, S.clock);
      drawKaska();
    }

    // partículas
    for (const p of S.parts) {
      ctx.globalAlpha = clamp(p.life / p.max * 1.6, 0, 1);
      ctx.fillStyle = p.color;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    for (const p of S.popups) {
      ctx.globalAlpha = clamp(p.life * 1.8, 0, 1);
      const sc = 1 + Math.max(0, p.life - 0.8) * 2;
      txt(p.text, p.x, p.y, p.size * sc, p.color);
    }
    ctx.globalAlpha = 1;

    const jb = S.jBub, kb = S.kBub;
    if (jb) {
      if (jb.x == null) drawBubble(jb.text, J.x, J.y + J.r + 40 * U, clamp(jb.t * 4, 0, 1), -1);
      else drawBubble(jb.text, jb.x, jb.y, clamp(jb.t * 4, 0, 1), 1);
    }
    if (kb && S.state !== 'menu') drawBubble(kb.text, kb.x == null ? K.x : kb.x, kb.y == null ? K.y - K.r - 34 * U : kb.y, clamp(kb.t * 4, 0, 1), 1);
    ctx.restore();

    // capa roja de furia y golpes
    if (S.furyT > 0 && (S.state === 'playing' || S.state === 'paused')) {
      const a = 0.22 + 0.1 * Math.sin(S.clock * 8);
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(255,20,30,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (S.flash > 0) { ctx.fillStyle = `rgba(255,30,40,${S.flash * 0.55})`; ctx.fillRect(0, 0, W, H); }

    if (S.state === 'playing' || S.state === 'paused' || S.state === 'dying') drawHUD();
    if (S.banner && S.state !== 'paused') drawBanner();
  }

  function drawJoselito() {
    const angry = S.furyT > 0 || S.furyWarned || J.laughT > 0;
    let x = J.x, y = J.y;
    if (S.furyT > 0 || S.furyWarned) { x += rand(-2, 2) * U; y += rand(-2, 2) * U; }
    if (J.throwT > 0) y += Math.sin((J.throwT / 0.18) * Math.PI) * 8 * U;
    // hilo de la telaraña
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y - J.r); ctx.stroke();
    // patas de araña
    spiderLegs(ctx, x, y, J.r, S.clock, angry ? 16 : 4, 0.55, 1.45, 2.05, '#0b080d', Math.max(4, J.r * 0.21), true);
    if (S.furyT > 0) {
      const halo = ctx.createRadialGradient(x, y, J.r, x, y, J.r * 1.8);
      halo.addColorStop(0, 'rgba(255,40,40,.6)'); halo.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, J.r * 1.8, 0, TAU); ctx.fill();
    }
    const s = J.throwT > 0 ? 1.06 : 1;
    drawToken(angry ? IMG.jf : IMG.j, x, y, J.r * s, angry ? '#ff3b3b' : '#120a18');
  }

  function drawKaska() {
    const x = K.x;
    const moving = Math.min(1, Math.abs(K.vx) / (300 * U));
    const hop = Math.abs(Math.sin(S.clock * 14)) * 5 * U * moving;
    let y = K.y - hop;
    let rot = K.tilt;
    if (S.state === 'dying' || S.state === 'over') { rot = K.tilt + Math.sin(S.clock * 3) * 0.1; }

    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath(); ctx.ellipse(x, S.groundY + 2 * U, K.r * 0.85, K.r * 0.2, 0, 0, TAU); ctx.fill();

    if (S.shieldT > 0) {
      const blink = S.shieldT < 1.5 && Math.floor(S.shieldT * 8) % 2 === 0;
      if (!blink) {
        const g = ctx.createRadialGradient(x, y, K.r * 0.9, x, y, K.r * 1.7);
        g.addColorStop(0, 'rgba(255,140,40,.6)'); g.addColorStop(1, 'rgba(255,140,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, K.r * 1.7, 0, TAU); ctx.fill();
        ctx.save();
        ctx.setLineDash([8 * U, 7 * U]); ctx.lineDashOffset = -S.clock * 50;
        ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 3 * U;
        ctx.beginPath(); ctx.arc(x, y, K.r * 1.28, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    const sq = K.squash;
    ctx.scale(1 + sq * 0.14, 1 - sq * 0.14);
    if (S.invT > 0 && Math.floor(S.invT * 12) % 2 === 0) ctx.globalAlpha = 0.35;
    drawToken(IMG.k, 0, 0, K.r, '#ffffff');
    drawBowtie(K.r);
    ctx.restore();
  }

  // pajarita de murciélago (como Jack Skellington), centrada en (0,0) de la cara
  function drawBowtie(r) {
    ctx.fillStyle = '#111';
    const by = r * 0.98, bw = r * 0.42;
    ctx.beginPath();
    ctx.moveTo(0, by); ctx.lineTo(-bw, by - bw * 0.5); ctx.quadraticCurveTo(-bw * 0.7, by, -bw, by + bw * 0.5); ctx.closePath();
    ctx.moveTo(0, by); ctx.lineTo(bw, by - bw * 0.5); ctx.quadraticCurveTo(bw * 0.7, by, bw, by + bw * 0.5); ctx.closePath();
    ctx.fill();
    ctx.beginPath(); ctx.arc(0, by, bw * 0.22, 0, TAU); ctx.fill();
  }

  function drawHUD() {
    const pad = 14 * U;
    const sp = 1 + S.scorePulse * 0.15;
    ctx.save(); ctx.translate(pad, 30 * U); ctx.scale(sp, sp);
    txt(fmt(S.score), 0, 0, 32 * U, '#fff', 'left');
    ctx.restore();
    const best = bestScore();
    const beating = best > 0 && S.score > best;
    txt(beating ? '¡NUEVO RÉCORD!' : `RÉCORD ${fmt(best)}`, pad, 56 * U, 13 * U, beating ? '#9be15d' : '#ffd23f', 'left', FT, '#1a0726', 3 * U);

    // combo
    if (S.combo > 0) {
      const bw = 84 * U, bh = 8 * U, bx = pad, by = 70 * U;
      const step = S.mode === 'aplasta' ? WHACK_STEP : COMBO_STEP;
      const prog = S.mult >= MAX_MULT ? 1 : (S.combo % step) / step;
      ctx.fillStyle = 'rgba(0,0,0,.45)'; roundRectPath(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = S.mult >= MAX_MULT ? '#ff4f9a' : '#ff9b3d';
      if (prog > 0) { roundRectPath(ctx, bx, by, Math.max(bh, bw * prog), bh, bh / 2); ctx.fill(); }
      txt(`x${S.mult}`, bx + bw + 8 * U, by + bh / 2 + 1, 18 * U, S.mult > 1 ? '#ff9b3d' : '#fff', 'left', FT, '#1a0726', 3.5 * U);
    }

    if (S.mode === 'aplasta') { drawTimer(); return; }

    // vidas
    const slots = Math.max(START_LIVES, S.lives);
    for (let i = 0; i < slots; i++) {
      const hx = W - 70 - (slots - 1 - i) * 26 * U, hy = 30 * U;
      if (i < S.lives) drawHeart(ctx, hx, hy, 10 * U, '#ff4b6e', '#1a0726');
      else drawHeart(ctx, hx, hy, 10 * U, 'rgba(0,0,0,.35)', 'rgba(255,255,255,.35)');
    }
    // escudo
    if (S.shieldT > 0) {
      const bw = 70 * U, bh = 7 * U, bx = W - 62 - bw, by = 52 * U;
      drawPumpkin(ctx, bx - 12 * U, by + bh / 2, 9 * U, 0, S.clock);
      ctx.fillStyle = 'rgba(0,0,0,.45)'; roundRectPath(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = '#ff8a2a'; roundRectPath(ctx, bx, by, Math.max(bh, bw * S.shieldT / SHIELD_TIME), bh, bh / 2); ctx.fill();
    }
  }

  function drawBanner() {
    const b = S.banner;
    const inT = Math.min(1, b.t / 0.22);
    const sc = inT < 1 ? 0.4 + inT * 0.75 : 1.15 - Math.min(0.15, (b.t - 0.22) * 0.8);
    const alpha = clamp((b.dur - b.t) / 0.3, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, H * 0.44); ctx.scale(sc, sc);
    let size = 36 * U;
    ctx.font = `${size}px ${FT}`;
    const w = ctx.measureText(b.text).width;
    if (w > W * 0.9) size *= (W * 0.9) / w;
    txt(b.text, 0, 0, size, b.color, 'center', FT, '#1a0726', size * 0.22);
    if (b.sub) txt(b.sub, 0, size * 0.95, 17 * U, '#fff', 'center', FB, '#1a0726', 4 * U);
    ctx.restore();
  }

  /* ---------- bucle ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  /* ---------- pantallas ---------- */
  const screens = ['menu', 'help', 'rank', 'pause', 'over'];
  function show(id) { for (const s of screens) $(s).classList.toggle('hidden', s !== id); }
  function hideScreens() { show(null); }

  function rankTitle(score, mode = S.mode) {
    const list = mode === 'aplasta' ? W_RANKS : RANKS;
    let t = list[0][1];
    for (const [min, name] of list) if (score >= min) t = name;
    return t;
  }
  function fmtTime(s) { s = Math.floor(s); return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`; }
  function medal(i) { return ['🥇', '🥈', '🥉'][i] || `${i + 1}.`; }

  function renderRanking(el, limit, mode = S.mode) {
    const r = getRanking(mode);
    el.innerHTML = '';
    if (!r.length) { el.innerHTML = '<li class="empty">Aún no hay puntuaciones. ¡Estrena el ranking!</li>'; return; }
    const myIdx = mode === S.mode ? r.findIndex((e) => e.id && e.id === S.myId) : -1;
    let gapShown = false;
    r.forEach((e, i) => {
      if (i >= limit && i !== myIdx) return;
      if (i >= limit && !gapShown) { gapShown = true; const g = document.createElement('li'); g.className = 'gap'; g.textContent = '···'; el.appendChild(g); }
      const li = document.createElement('li');
      if (i === myIdx) li.className = 'me';
      const pos = document.createElement('span'); pos.className = 'pos'; pos.textContent = medal(i);
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = e.name || 'Anónimo';
      const sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = fmt(e.score);
      li.append(pos, nm, sc);
      el.appendChild(li);
    });
  }

  function showMenu() {
    S.state = 'menu';
    S.items = []; S.banner = null; S.jBub = null; S.kBub = null; S.furyT = 0; S.furyWarned = false; S.shieldT = 0;
    for (const h of holes) h.o = null;
    $('bestCandy').textContent = fmt(bestScore('caramelos'));
    $('bestWhack').textContent = fmt(bestScore('aplasta'));
    $('btnPause').classList.add('hidden');
    show('menu');
  }

  function startGame(mode = S.mode) {
    Snd.init();
    S.mode = mode === 'aplasta' ? 'aplasta' : 'caramelos';
    store.set('kvj_lastmode', S.mode);
    Object.assign(S, {
      state: 'playing', t: 0, score: 0, lives: START_LIVES, combo: 0, maxCombo: 0, mult: 1, caught: 0,
      items: [], popups: [], paws: [], spawnT: 1.1, shieldT: 0, invT: 0, shake: 0, flash: 0, scorePulse: 0,
      furyT: 0, nextFury: 24, furyWarned: false, furies: 0, nextTaunt: 6, jBub: null, kBub: null, banner: null, myId: null,
      timeLeft: WHACK_TIME, taps: 0, hits: 0, whacked: 0, golds: 0, lastCall: false,
    });
    for (const h of holes) h.o = null;
    K.x = K.tx = W / 2; K.vx = 0;
    hideScreens();
    $('btnPause').classList.remove('hidden');
    if (S.mode === 'aplasta') {
      S.spawnT = 0.9;
      banner('¡APLASTA A JOSELITO!', '¡Pero no toques a Kaska!', '#ffd23f', 2.2);
    } else {
      banner('¡A POR LOS CARAMELOS!', 'Arrastra el dedo para mover a Kaska', '#ffd23f', 2.4);
      jSay('¡Ni se te ocurra tocar mis caramelos!', 2.6);
    }
    last = performance.now();
  }

  function setStats(stats) {
    stats.forEach(([value, label], i) => { $(`st${i + 1}`).textContent = value; $(`st${i + 1}l`).textContent = label; });
  }

  function showOver() {
    S.state = 'over';
    const whack = S.mode === 'aplasta';
    const ranking = getRanking();
    const prevBest = ranking.length ? ranking[0].score : 0;
    store.set('kvj_games', store.get('kvj_games', 0) + 1);
    const isRecord = S.score > 0 && S.score > prevBest;
    const qualifies = S.score > 0 && (ranking.length < 10 || S.score > ranking[ranking.length - 1].score);
    S.myId = null;
    if (qualifies) {
      const entry = { id: Math.random().toString(36).slice(2, 10), name: store.get('kvj_name', '') || 'Anónimo', score: S.score, date: Date.now() };
      ranking.push(entry);
      ranking.sort((a, b) => b.score - a.score);
      ranking.length = Math.min(ranking.length, 10);
      saveRanking(ranking);
      S.myId = entry.id;
    }
    if (whack) {
      $('overTitle').textContent = isRecord ? '¡Joselito ha quedado hecho puré!' : pick(W_OVER_TITLES);
      const acc = S.taps ? Math.round((S.hits / S.taps) * 100) : 0;
      setStats([[S.whacked, 'aplastados'], [S.maxCombo, 'combo máx.'], [`${acc}%`, 'puntería']]);
    } else {
      $('overTitle').textContent = isRecord ? '¡Joselito está furioso!' : pick(OVER_TITLES);
      setStats([[S.caught, 'caramelos'], [S.maxCombo, 'combo máx.'], [fmtTime(S.t), 'tiempo']]);
    }
    $('overScore').textContent = fmt(S.score);
    $('overRank').textContent = rankTitle(S.score);
    $('newRecord').classList.toggle('hidden', !isRecord);
    $('nameBox').classList.toggle('hidden', !qualifies);
    $('nameInput').value = store.get('kvj_name', '');
    renderRanking($('overList'), 5);
    show('over');
    if (isRecord) { confetti(); Snd.record(); }
  }

  function pause() {
    if (S.state !== 'playing') return;
    S.state = 'paused';
    $('btnPause').classList.add('hidden');
    show('pause');
  }
  function resume() {
    if (S.state !== 'paused') return;
    S.state = 'playing';
    hideScreens();
    $('btnPause').classList.remove('hidden');
    last = performance.now();
  }

  let toastTimer = 0;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
  }

  async function share() {
    const url = location.href.split('#')[0].split('?')[0];
    const text = `🎃 He hecho ${fmt(S.score)} puntos en "${MODE_NAMES[S.mode]}" (Kaska vs Joselito) y soy ${rankTitle(S.score)}. ¿Me superas?`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Kaska vs Joselito', text, url }); } catch (e) { /* cancelado */ }
      return;
    }
    try { await navigator.clipboard.writeText(`${text} ${url}`); toast('¡Copiado! Pégalo donde quieras'); }
    catch (e) { toast('No se pudo copiar el enlace'); }
  }

  function updateSoundBtn() { $('btnSound').textContent = Snd.on ? '🔊 Sonido: sí' : '🔇 Sonido: no'; }

  function drawIcons() {
    HALOS = false;
    document.querySelectorAll('canvas[data-icon]').forEach((cv) => {
      const d = Math.min(window.devicePixelRatio || 1, 2), s = 44;
      cv.width = s * d; cv.height = s * d;
      const c = cv.getContext('2d');
      c.setTransform(d, 0, 0, d, 0, 0);
      const type = cv.dataset.icon;
      const r = type === 'pumpkin' ? 14 : type === 'spider' ? 11 : 13;
      drawItem(c, { type, x: s / 2, y: s / 2 + (type === 'pumpkin' ? 3 : 0), r, rot: type === 'bone' ? -0.5 : -0.3, col: CANDY_COLS[0], seed: 0 }, 0.6);
    });
    HALOS = true;
  }

  /* ---------- controles ---------- */
  const keys = { left: false, right: false };
  let dragId = null, lastPX = 0;

  canvas.addEventListener('pointerdown', (e) => {
    if (S.mode === 'aplasta') {
      if (S.state === 'playing') { const r = canvas.getBoundingClientRect(); whackTap(e.clientX - r.left, e.clientY - r.top); }
      return;
    }
    if (e.pointerType === 'mouse') { K.tx = e.clientX - canvasLeft; return; }
    dragId = e.pointerId; lastPX = e.clientX;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (S.state !== 'playing' || S.mode === 'aplasta') return;
    if (e.pointerType === 'mouse') { K.tx = clamp(e.clientX - canvasLeft, K.r, W - K.r); return; }
    if (e.pointerId !== dragId) return;
    const dx = e.clientX - lastPX; lastPX = e.clientX;
    K.tx = clamp(K.tx + dx * 1.6, K.r, W - K.r);
  });
  const endDrag = (e) => { if (e.pointerId === dragId) dragId = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if (S.state === 'playing') pause(); else if (S.state === 'paused') resume(); }
    if ((e.key === ' ' || e.key === 'Enter') && (S.state === 'menu' || S.state === 'over')) { e.preventDefault(); startGame(S.mode); }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', () => { keys.left = keys.right = false; });
  window.addEventListener('resize', resize);

  // pestañas de modo en Ranking y Cómo jugar
  function selectTab(group, mode) {
    document.querySelectorAll(`[data-tabs="${group}"] button`).forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    if (group === 'help') document.querySelectorAll('[data-pane="help"]').forEach((p) => p.classList.toggle('hidden', p.dataset.mode !== mode));
    if (group === 'rank') renderRanking($('rankList'), 10, mode);
  }
  document.querySelectorAll('[data-tabs] button').forEach((b) => {
    b.addEventListener('click', () => selectTab(b.parentElement.dataset.tabs, b.dataset.mode));
  });

  $('playCandy').addEventListener('click', () => startGame('caramelos'));
  $('playWhack').addEventListener('click', () => startGame('aplasta'));
  $('btnAgain').addEventListener('click', () => startGame(S.mode));
  $('btnMenu').addEventListener('click', showMenu);
  $('btnHelp').addEventListener('click', () => { Snd.init(); selectTab('help', S.mode); show('help'); });
  $('btnRank').addEventListener('click', () => {
    S.myId = null;
    selectTab('rank', S.mode);
    const g = store.get('kvj_games', 0);
    $('gamesPlayed').textContent = g ? `Partidas jugadas en este móvil: ${g}` : '';
    show('rank');
  });
  document.querySelectorAll('.back').forEach((b) => b.addEventListener('click', showMenu));
  $('btnPause').addEventListener('click', pause);
  $('btnResume').addEventListener('click', resume);
  $('btnQuit').addEventListener('click', showMenu);
  $('btnShare').addEventListener('click', share);
  $('btnSound').addEventListener('click', () => {
    Snd.on = !Snd.on; store.set('kvj_sound', Snd.on); updateSoundBtn();
    if (Snd.on) { Snd.init(); Snd.catch(1); }
  });
  $('nameInput').addEventListener('input', (e) => {
    const name = e.target.value.trim().slice(0, 12);
    store.set('kvj_name', name);
    if (!S.myId) return;
    const r = getRanking();
    const me = r.find((x) => x.id === S.myId);
    if (me) { me.name = name || 'Anónimo'; saveRanking(r); renderRanking($('overList'), 5); }
  });
  $('nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });

  // modo prueba: abre la web con #debug para tocar el estado desde la consola
  if (location.hash === '#debug') window.kvj = { S, K, J, holes, startGame, showOver, whackTap, occY: (i) => occY(holes[i], holes[i].o), step: (dt, n = 1) => { for (let i = 0; i < n; i++) update(dt); render(); } };

  /* ---------- arranque ---------- */
  resize();
  updateSoundBtn();
  drawIcons();
  showMenu();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { buildBg(); drawIcons(); });
  requestAnimationFrame((t) => { last = t; frame(t); });
})();
