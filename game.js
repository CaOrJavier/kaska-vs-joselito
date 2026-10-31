'use strict';
/* Kaska vs Joselito · "Kaska contraataca" (combate por niveles) y "Aplasta a Joselito" */
(() => {
  const P = window.KVJP; // progreso: monedas, mejoras, disfraces, misiones (progress.js)
  const TAU = Math.PI * 2;
  const $ = (id) => document.getElementById(id);
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const fmt = (n) => Math.round(n).toLocaleString('es-ES');
  const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
  const easeOutBack = (t) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; };
  const FT = '"Luckiest Guy", Impact, sans-serif';
  const FB = 'Fredoka, "Trebuchet MS", sans-serif';

  const MAX_LIVES = 6;
  const MAX_MULT = 5;
  const COMBO_STEP = 8;   // golpes/caramelos seguidos para subir el multiplicador (Contraataca)
  const WHACK_STEP = 5;   // Joselitos seguidos para subir el multiplicador (Aplasta)
  const FINAL_LEVEL = 6;  // jefe final: Joselito, Rey de las Arañas
  const COMBO_WORDS = { 2: '¡GENIAL!', 3: '¡BRUTAL!', 4: '¡TREMENDO!', 5: '¡IMPARABLE!' };
  const CREDITS = [
    ['KASKA VS JOSELITO', 'title'], ['', ''], ['Protagonista', 'h'], ['KASKA (el bueno)', ''], ['', ''],
    ['Villano (pero no tanto)', 'h'], ['JOSELITO (el malo)', ''], ['', ''], ['Vestuario', 'h'], ['Jack Skellington y araña peluda', ''],
    ['', ''], ['¡Feliz Halloween! 🎃', 'title'], ['', ''], ['Gracias por jugar', 'h'],
  ];

  const CANDY_COLS = [
    { main: '#ff4f9a', dark: '#c21f69' },
    { main: '#4fd1ff', dark: '#1a8db8' },
    { main: '#9be15d', dark: '#4f9a1c' },
    { main: '#b07cff', dark: '#6f3cc9' },
    { main: '#ff9a3c', dark: '#c25e00' },
  ];
  const GOLD = { main: '#ffd23f', dark: '#c79100' };
  const BOMB_COL = { main: '#4a2266', dark: '#1e0b30' };

  const J_TAUNTS = [
    '¡No me vas a ganar!', '¡Grrrr!', '¡Kaska, eres lentísimo!', '¡Muajajaja!', '¡Truco o trato!',
    '¡Te voy a llenar de arañas!', '¡Ocho patas, cero piedad!', '¡Esos huesos no me hacen nada!',
  ];
  const J_HURT = ['¡Ay!', '¡Auch!', '¡Mis caramelos!', '¡Grr!', '¡Eso duele!'];
  const J_LAUGH = ['¡JA JA JA!', '¡Toma araña!', '¡Pillado!', '¡Muajaja!'];
  const J_DEFEAT = ['¡Volveré!', '¡Esto no ha terminado!', '¡Mis caramelooos!'];
  const K_HAPPY = ['¡Ñam ñam!', '¡Toma ya!', '¡Guau!', '¡A por más!', '¡Qué rico!'];
  const OVER_TITLES = ['¡Joselito te ha pillado!', '¡Atrapado en la telaraña!', '¡Las arañas ganan esta vez!'];
  const RANKS = [
    [0, 'Cachorro miedoso'], [300, 'Lanzahuesos novato'], [800, 'Cazador de caramelos'], [1800, 'Azote de arañas'],
    [3500, 'Terror de Joselito'], [6000, 'Rey de Halloween'], [10000, 'Leyenda canina'],
  ];
  const LEVEL_NEWS = {
    2: 'Nuevo ataque: telarañas pegajosas', 3: 'Nuevo ataque: lluvia de arañas',
    4: 'Nuevo ataque: caramelos bomba', 5: 'Nuevo ataque: ¡la embestida!',
  };

  const W_HIT = ['¡PAF!', '¡ZAS!', '¡BONK!', '¡TOMA!', '¡POW!', '¡CATAPLÁN!'];
  const W_ESCAPE = ['¡Ja! ¡Lento!', '¡No me pillas!', '¡Muajaja!', '¡Fallaste!', '¡Por aquí!'];
  const W_OUCH = ['¡Ay! ¡Que soy el bueno!', '¡Auuu!', '¡Eh, que soy Kaska!', '¡A mí no!'];
  const W_OVER_TITLES = ['¡Se acabó el tiempo!', '¡Joselito sobrevive... por ahora!', '¡Tiempo!'];
  const W_RANKS = [
    [0, 'Aprendiz de aplastador'], [150, 'Martillo novato'], [400, 'Cazador de Joselitos'],
    [800, 'Pesadilla de Joselito'], [1300, 'Aplastador profesional'], [2000, 'Rey de las calabazas'], [3000, 'Leyenda del martillazo'],
  ];
  const MODE_NAMES = { batalla: 'Kaska contraataca', aplasta: 'Aplasta a Joselito' };
  const RING = { jack: '#ffffff', bruja: '#b07cff', vampiro: '#e0203a', calabaza: '#ff8a2a', rey: '#ffd23f' };

  /* ---------- guardado (un ranking por modo) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin guardado */ } },
  };
  const rankKey = (mode) => (mode === 'aplasta' ? 'kvj_ranking_aplasta' : 'kvj_ranking_batalla');
  const getRanking = (mode = S.mode) => { const r = store.get(rankKey(mode), []); return Array.isArray(r) ? r : []; };
  const saveRanking = (r, mode = S.mode) => store.set(rankKey(mode), r);
  const bestScore = (mode = S.mode) => { const r = getRanking(mode); return r.length ? r[0].score : 0; };

  /* ---------- sonido y música: ver audio.js ---------- */
  const Snd = window.KVJA;
  const vib = (p) => { if (Snd.on && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* nada */ } } };

  /* ---------- imágenes ---------- */
  const IMG = {};
  const loadImg = (k, src) => { const i = new Image(); i.src = src; IMG[k] = i; };
  loadImg('k', 'img/kaska.png');
  loadImg('j', 'img/joselito.png');
  loadImg('jf', 'img/joselito-furioso.png');
  const ready = (i) => i && i.complete && i.naturalWidth > 0;

  /* ---------- canvas y estado ---------- */
  const canvas = $('c');
  const ctx = canvas.getContext('2d');
  const bg = document.createElement('canvas');
  let W = 0, H = 0, DPR = 1, U = 1, canvasLeft = 0;

  const S = {
    mode: store.get('kvj_lastmode', 'batalla') === 'aplasta' ? 'aplasta' : 'batalla',
    state: 'menu', clock: 0, t: 0, score: 0, lives: 3, combo: 0, maxCombo: 0, mult: 1, caught: 0,
    items: [], bones: [], parts: [], popups: [], paws: [], bats: [], nextBat: 3, stars: [],
    spawnT: 1, shieldT: 0, invT: 0, shake: 0, flash: 0, scorePulse: 0,
    level: 1, levelT: 0, betweenT: 0, defeats: 0, hitsTaken: 0, ammo: 0, maxAmmo: 10, webT: 0, boneCD: 0, emptyT: 0,
    bark: 0, barkWave: null, barks: 0, spidersShot: 0, golds: 0, nextTaunt: 4, hints: [], barkHinted: false,
    jBub: null, kBub: null, banner: null, dyingT: 0, groundY: 0, myId: null, doneMissions: [],
    whackTime: 30, timeLeft: 30, taps: 0, hits: 0, whacked: 0, wgolds: 0, lastCall: false,
    // cine y sensaciones: barras negras, textos, cámara lenta, parón de impacto, destellos, latido
    cine: null, bars: 0, barsT: 0, barsUntil: 0, caption: null, slowT: 0, slowF: 1, hitStop: 0, wflash: 0,
    koT: 0, koX: 0, koY: 0, hbT: 0, hbPulse: 0, endingT: 0, endless: false, victory: false, musicT: 0, overMusicT: 0, overRun: 0,
  };
  const K = { x: 0, tx: 0, y: 0, r: 40, vx: 0, tilt: 0, squash: 0, dashT: 0, dashV: 0, dashCD: 0, immT: 0, lastDir: 1, trail: [], readyFlash: 0 };
  const J = {
    x: 0, tx: 0, y: 0, baseY: 0, r: 42, phase: 0, retT: 0, throwT: 0, laughT: 0, kick: 0, big: false, enterDur: 1.2,
    hp: 1, maxHp: 1, hpLag: 1, hitT: 0, stunT: 0, atkT: 5, atk: null, dive: null, enterT: 0, defeatT: 0, spin: 0, angry: false,
  };

  for (let i = 0; i < 70; i++) S.stars.push({ x: Math.random(), y: Math.random() * 0.75, s: rand(0.6, 1.8), p: rand(0, TAU) });

  function resize() {
    const r = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height; canvasLeft = r.left;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    U = Math.min(W / 400, H / 700);
    K.r = 44 * U; J.r = 42 * U * (J.big ? 1.3 : 1);
    S.groundY = H - 58 * U;
    K.y = S.groundY - K.r - 6 * U;
    J.baseY = 132 * U + J.r;
    if (!S.cine) { CAM.x = CAM.tx = W / 2; CAM.y = CAM.ty = H / 2; CAM.z = CAM.tz = 1; }
    K.tx = clamp(K.tx || W / 2, K.r, W - K.r); K.x = clamp(K.x || W / 2, K.r, W - K.r);
    J.tx = clamp(J.tx || W / 2, J.r, W - J.r); J.x = clamp(J.x || W / 2, J.r, W - J.r);
    if (!J.dive && J.enterT <= 0 && J.defeatT <= 0) J.y = J.baseY;
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

    const mx = W * 0.8, my = H * 0.26, mr = 44 * U;
    const halo = b.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 4);
    halo.addColorStop(0, 'rgba(255,236,190,.28)'); halo.addColorStop(1, 'rgba(255,236,190,0)');
    b.fillStyle = halo; b.fillRect(0, 0, W, H);
    b.fillStyle = '#fff1c4'; b.beginPath(); b.arc(mx, my, mr, 0, TAU); b.fill();
    b.fillStyle = 'rgba(220,196,140,.5)';
    [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.4, 0.12], [0.35, -0.35, 0.09]].forEach(([dx, dy, rr]) => {
      b.beginPath(); b.arc(mx + dx * mr, my + dy * mr, rr * mr, 0, TAU); b.fill();
    });

    b.fillStyle = '#26103a';
    b.beginPath(); b.moveTo(0, H);
    for (let x = 0; x <= W + 10; x += 10) b.lineTo(x, H * 0.8 - Math.sin(x / W * 5 + 1) * 18 * U - Math.sin(x / W * 13) * 6 * U);
    b.lineTo(W, H); b.closePath(); b.fill();
    b.fillStyle = '#2f1546';
    [0.22, 0.36, 0.62, 0.7].forEach((fx, i) => {
      const x = W * fx, y = H * 0.8 - Math.sin(fx * 5 + 1) * 18 * U - 8 * U, w = (10 + i % 2 * 4) * U, h = (16 + i % 2 * 6) * U;
      roundRectPath(b, x - w / 2, y - h, w, h + 10 * U, [w / 2, w / 2, 2, 2]); b.fill();
    });

    b.strokeStyle = '#1a0a28'; b.lineCap = 'round';
    const tree = (x, y, len, ang, w, depth) => {
      if (depth === 0) return;
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      b.lineWidth = w; b.beginPath(); b.moveTo(x, y); b.lineTo(x2, y2); b.stroke();
      tree(x2, y2, len * 0.72, ang - 0.45, w * 0.65, depth - 1);
      tree(x2, y2, len * 0.68, ang + 0.4, w * 0.65, depth - 1);
    };
    tree(W * 0.08, S.groundY + 6 * U, 70 * U, -Math.PI / 2 + 0.12, 9 * U, 5);

    b.fillStyle = '#170a24';
    b.beginPath(); b.moveTo(0, H);
    for (let x = 0; x <= W + 10; x += 10) b.lineTo(x, S.groundY - Math.sin(x / W * 4) * 5 * U);
    b.lineTo(W, H); b.closePath(); b.fill();
    b.strokeStyle = 'rgba(160,110,200,.25)'; b.lineWidth = 2;
    b.beginPath();
    for (let x = 0; x <= W + 10; x += 10) { const y = S.groundY - Math.sin(x / W * 4) * 5 * U; x ? b.lineTo(x, y) : b.moveTo(x, y); }
    b.stroke();

    [[0.9, 1], [0.78, 0.75]].forEach(([fx, s]) => {
      const x = W * fx, w = 30 * U * s, h = 42 * U * s, y = S.groundY + 4 * U;
      b.fillStyle = '#3a2452'; roundRectPath(b, x - w / 2, y - h, w, h, [w / 2, w / 2, 3, 3]); b.fill();
      b.fillStyle = '#2a1840'; roundRectPath(b, x - w / 2 + 3, y - h + 3, w - 6, h, [w / 2, w / 2, 3, 3]); b.fill();
      b.fillStyle = 'rgba(255,255,255,.22)'; b.font = `${11 * U * s}px ${FT}`; b.textAlign = 'center'; b.textBaseline = 'middle';
      b.fillText('RIP', x, y - h * 0.55);
    });

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
  let HALOS = true; // los iconos de la ayuda y las vistas previas se pintan sin brillo
  function glow(c, x, y, r0, r1, rgb, a) {
    if (!HALOS) return;
    const g = c.createRadialGradient(x, y, r0, x, y, r1);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r1, 0, TAU); c.fill();
  }

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

  function drawGold(c, x, y, r, rot, t) {
    glow(c, x, y, r * 0.4, r * 2.4, '255,220,80', 0.55);
    drawCandy(c, x, y, r, rot, GOLD);
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

  function bonePath(c, r) {
    c.beginPath();
    c.rect(-r * 0.75, -r * 0.2, r * 1.5, r * 0.4);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { c.moveTo(sx * r * 0.85 + r * 0.3, sy * r * 0.24); c.arc(sx * r * 0.85, sy * r * 0.24, r * 0.3, 0, TAU); }
  }
  // hueso con corazón: da una vida
  function drawLife(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = '#fbf3df';
    bonePath(c, r); c.fill();
    c.restore();
    drawHeart(c, x, y, r * 0.32, '#ff4b6e', null);
  }
  // hueso que lanza Kaska
  function drawBoneProj(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = 'rgba(0,0,0,.35)';
    c.save(); c.translate(1.5, 1.5); bonePath(c, r); c.fill(); c.restore();
    c.fillStyle = '#fbf3df';
    bonePath(c, r); c.fill();
    c.restore();
  }

  function drawWeb(c, x, y, r, t) {
    glow(c, x, y, r * 0.3, r * 1.8, '220,220,255', 0.25);
    c.save(); c.translate(x, y); c.rotate(t * 0.8);
    c.fillStyle = 'rgba(255,255,255,.12)';
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = Math.max(1, r * 0.07);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); c.stroke(); }
    for (const k of [0.35, 0.65, 0.95]) {
      c.beginPath();
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * TAU, px = Math.cos(a) * r * k, py = Math.sin(a) * r * k;
        if (i === 0) c.moveTo(px, py);
        else { const am = ((i - 0.5) / 8) * TAU; c.quadraticCurveTo(Math.cos(am) * r * k * 0.8, Math.sin(am) * r * k * 0.8, px, py); }
      }
      c.stroke();
    }
    c.restore();
  }

  function drawBomb(c, x, y, r, rot, t) {
    glow(c, x, y, r * 0.4, r * 2.2, '255,60,200', 0.35);
    drawCandy(c, x, y, r, rot, BOMB_COL);
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(0, -r * 0.08, r * 0.34, 0, TAU); c.fill();
    c.fillRect(-r * 0.18, r * 0.1, r * 0.36, r * 0.2);
    c.fillStyle = '#1e0b30';
    c.beginPath(); c.arc(-r * 0.13, -r * 0.1, r * 0.09, 0, TAU); c.arc(r * 0.13, -r * 0.1, r * 0.09, 0, TAU); c.fill();
    c.strokeStyle = '#d9c38a'; c.lineWidth = Math.max(1.5, r * 0.1); c.lineCap = 'round';
    c.beginPath(); c.moveTo(r * 1.3, 0); c.quadraticCurveTo(r * 1.6, -r * 0.5, r * 1.75, -r * 0.2); c.stroke();
    const f = 0.6 + 0.4 * Math.sin(t * 30);
    c.fillStyle = `rgb(255,${Math.round(150 + 100 * f)},40)`;
    star4(c, r * 1.75, -r * 0.2, r * 0.35 * f + r * 0.15);
    c.restore();
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
      case 'life': drawLife(c, it.x, it.y, it.r, it.rot); break;
      case 'web': drawWeb(c, it.x, it.y, it.r, t + it.seed); break;
      case 'bomb': drawBomb(c, it.x, it.y, it.r, it.rot, t); break;
    }
  }

  function token(c, img, x, y, r, ring) {
    c.fillStyle = '#2a2030';
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    if (ready(img)) c.drawImage(img, x - r, y - r, r * 2, r * 2);
    c.lineWidth = Math.max(3, r * 0.13); c.strokeStyle = ring;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
  }

  /* ---------- disfraces de Kaska ---------- */
  function drawKaskaToken(c, x, y, r, costume, ring) {
    if (costume === 'vampiro') drawVampCollar(c, x, y, r);
    token(c, IMG.k, x, y, r, ring || RING[costume] || '#fff');
    if (costume === 'jack') drawBowtie(c, x, y, r);
    else if (costume === 'vampiro') drawMedallion(c, x, y + r * 0.98, r);
    else if (costume === 'bruja') drawWitchHat(c, x, y, r);
    else if (costume === 'calabaza') { const h = HALOS; HALOS = false; drawPumpkin(c, x, y - r * 0.95, r * 0.5, 0, S.clock); HALOS = h; }
    else if (costume === 'rey') drawCrown(c, x, y, r);
  }
  function drawBowtie(c, x, y, r) {
    c.fillStyle = '#111';
    const by = y + r * 0.98, bw = r * 0.42;
    c.beginPath();
    c.moveTo(x, by); c.lineTo(x - bw, by - bw * 0.5); c.quadraticCurveTo(x - bw * 0.7, by, x - bw, by + bw * 0.5); c.closePath();
    c.moveTo(x, by); c.lineTo(x + bw, by - bw * 0.5); c.quadraticCurveTo(x + bw * 0.7, by, x + bw, by + bw * 0.5); c.closePath();
    c.fill();
    c.beginPath(); c.arc(x, by, bw * 0.22, 0, TAU); c.fill();
  }
  function drawVampCollar(c, x, y, r) {
    c.fillStyle = '#16060c';
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(x + s * r * 0.2, y + r * 0.95); c.lineTo(x + s * r * 1.45, y - r * 0.55);
      c.lineTo(x + s * r * 1.05, y + r * 0.15); c.lineTo(x + s * r * 1.2, y + r * 0.9);
      c.closePath(); c.fill();
    }
    c.fillStyle = '#a0001a';
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(x + s * r * 0.4, y + r * 0.85); c.lineTo(x + s * r * 1.3, y - r * 0.38); c.lineTo(x + s * r * 1.0, y + r * 0.2); c.closePath(); c.fill();
    }
  }
  function drawMedallion(c, x, y, r) {
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(x, y, r * 0.2, 0, TAU); c.fill();
    c.fillStyle = '#c8102e'; c.beginPath(); c.arc(x, y, r * 0.11, 0, TAU); c.fill();
  }
  function drawWitchHat(c, x, y, r) {
    c.save(); c.translate(x - r * 0.08, y - r * 0.72); c.rotate(-0.22);
    c.fillStyle = '#2a1240';
    c.beginPath(); c.ellipse(0, 0, r * 0.95, r * 0.2, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-r * 0.5, -r * 0.02); c.quadraticCurveTo(-r * 0.25, -r * 0.7, r * 0.18, -r * 1.25); c.quadraticCurveTo(r * 0.12, -r * 0.6, r * 0.5, -r * 0.02); c.closePath(); c.fill();
    c.fillStyle = '#9b4dff'; c.fillRect(-r * 0.46, -r * 0.24, r * 0.92, r * 0.16);
    c.fillStyle = '#ffd23f'; c.fillRect(-r * 0.1, -r * 0.27, r * 0.2, r * 0.22);
    c.fillStyle = '#2a1240'; c.fillRect(-r * 0.05, -r * 0.22, r * 0.1, r * 0.12);
    c.restore();
  }
  function drawCrown(c, x, y, r) {
    const by = y - r * 0.6, w = r * 1.0, h = r * 0.62;
    c.fillStyle = '#ffd23f'; c.strokeStyle = '#a87400'; c.lineWidth = Math.max(1.5, r * 0.06); c.lineJoin = 'round';
    c.beginPath(); c.moveTo(x - w / 2, by);
    c.lineTo(x - w / 2, by - h * 0.65); c.lineTo(x - w / 4, by - h * 0.3); c.lineTo(x, by - h);
    c.lineTo(x + w / 4, by - h * 0.3); c.lineTo(x + w / 2, by - h * 0.65); c.lineTo(x + w / 2, by);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#e0203a'; c.beginPath(); c.arc(x, by - h * 0.25, r * 0.09, 0, TAU); c.fill();
    c.fillStyle = '#4fd1ff';
    c.beginPath(); c.arc(x - w * 0.3, by - h * 0.15, r * 0.06, 0, TAU); c.arc(x + w * 0.3, by - h * 0.15, r * 0.06, 0, TAU); c.fill();
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
    if (S.parts.length > 450) S.parts.splice(0, S.parts.length - 450);
  }
  function confetti() {
    const cols = ['#ff7b1c', '#ffd23f', '#9be15d', '#ff4f9a', '#4fd1ff', '#b07cff', '#fff'];
    for (let i = 0; i < 160; i++) {
      S.parts.push({ x: rand(0, W), y: rand(-H * 0.4, -10), vx: rand(-60, 60) * U, vy: rand(80, 260) * U, life: rand(2.5, 4), max: 4, color: pick(cols), size: rand(4, 8) * U, g: 120 * U, rot: rand(0, TAU) });
    }
  }
  function explode(x, y, big) {
    burst(x, y, ['#ff9b3d', '#ffd23f', '#b07cff', '#fff', '#ff4f9a'], big ? 28 : 16, big ? 320 : 220);
    Snd.boom();
    S.shake = Math.max(S.shake, (big ? 10 : 5) * U);
  }
  function popup(x, y, text, color = '#fff', size = 22) {
    S.popups.push({ x: clamp(x, 40 * U, W - 40 * U), y, text, color, size: size * U, life: 1 });
  }
  function banner(text, sub, color = '#ffd23f', dur = 2) { S.banner = { text, sub, color, t: 0, dur }; }
  // x/y opcionales: si no se pasan, el bocadillo sale junto al personaje del combate
  function jSay(text, t = 2.2, x = null, y = null) { S.jBub = { text, t, max: t, x, y }; }
  function kSay(text, t = 1.6, x = null, y = null) { S.kBub = { text, t, max: t, x, y }; }
  function addScore(n) { S.score += n; S.scorePulse = 1; }

  // avisos de misiones cumplidas (arriba de la pantalla, de uno en uno)
  const toastQ = [];
  let mtoastT = 0;
  function missionsDone(list) {
    if (!list || !list.length) return;
    for (const m of list) {
      S.doneMissions.push(m);
      toastQ.push(`✅ ¡Misión cumplida! ${m.text} · +${m.reward} 💰`);
    }
  }
  function updateToasts(dt) {
    const el = $('mtoast');
    if (mtoastT > 0) {
      mtoastT -= dt;
      if (mtoastT <= 0) el.classList.add('hidden');
    } else if (toastQ.length && S.state === 'playing') {
      el.textContent = toastQ.shift();
      el.classList.remove('hidden');
      mtoastT = 2.6;
      Snd.coin(); Snd.chime({ v: 0.04, t: 0.15 });
    }
  }

  function bumpCombo() {
    S.combo++;
    S.maxCombo = Math.max(S.maxCombo, S.combo);
    const step = S.mode === 'aplasta' ? WHACK_STEP : COMBO_STEP;
    const m = Math.min(MAX_MULT, 1 + Math.floor(S.combo / step));
    if (m > S.mult) {
      S.mult = m;
      Snd.comboWord(m);
      banner(COMBO_WORDS[m] || `¡COMBO x${m}!`, `combo x${m}`, '#ff9b3d', 1.0);
      if (S.mode === 'batalla') { kSay(pick(K_HAPPY)); punch(1.04); }
    }
    missionsDone(P.peak('combo', S.combo));
  }

  /* =====================================================================
     MODO 1: KASKA CONTRAATACA (combate por niveles)
     ===================================================================== */
  function startLevel(n) {
    const final = n === FINAL_LEVEL && !S.endless;
    S.level = n; S.levelT = 0; S.hitsTaken = 0; S.betweenT = 0;
    J.big = final;
    J.r = 42 * U * (final ? 1.3 : 1);
    J.baseY = 132 * U + J.r;
    J.maxHp = final ? 75 : 10 + n * 6; J.hp = J.maxHp; J.hpLag = 0;
    J.angry = false; J.stunT = 0; J.atk = null; J.dive = null; J.defeatT = 0; J.spin = 0; J.hitT = 0; J.kick = 0;
    J.enterT = J.enterDur = 1.2; J.x = J.tx = W / 2; J.y = -J.r * 2;
    J.atkT = rand(3, 4.5); S.spawnT = 1.5;
    if (n > 1) {
      if (S.lives < MAX_LIVES) { S.lives++; popup(K.x, K.y - K.r * 1.8, '+1 VIDA', '#ff7b9a', 24); }
      S.ammo = Math.max(S.ammo, Math.ceil(S.maxAmmo / 2));
      missionsDone(P.peak('level', n));
      if (!final) {
        banner(`NIVEL ${n}`, LEVEL_NEWS[n] || '¡Joselito vuelve más fuerte!', '#ffd23f', 2.4);
        jSay(n >= 5 ? '¡Ahora sí que vas a ver!' : '¡Esta vez va en serio!', 2);
        S.barsT = 0.55; S.barsUntil = S.clock + 2.2; // barras de cine mientras vuelve
        Snd.whoosh({ v: 0.07, f: 2400, f2: 300, d: 0.5 }); Snd.growl({ d: 0.7, v: 0.12, t: 0.4 });
      }
    }
  }

  const basicInterval = () => Math.max(0.42, 1.0 - (S.level - 1) * 0.07) * (J.angry ? 0.75 : 1) * rand(0.8, 1.2);
  function fallTime() {
    let f = Math.max(0.85, 1.9 - (S.level - 1) * 0.12 - S.levelT * 0.004);
    if (J.angry) f *= 0.88;
    return f;
  }
  const hasItem = (type) => S.items.some((i) => i.type === type && !i.dead);

  function throwItem(type, x, y, vx = rand(-1, 1) * W * 0.22, vyMul = 1) {
    const r = ({ candy: 16, gold: 17, spider: 16, pumpkin: 20, life: 18, web: 18, bomb: 17 })[type] * U;
    const vy = ((K.y - y) / fallTime()) * rand(0.85, 1.15) * vyMul;
    const it = {
      type, r, x: clamp(x, r, W - r), y, vx, vy, rot: rand(0, TAU), vr: rand(-3, 3), col: pick(CANDY_COLS), seed: rand(0, 10),
      wob: type === 'spider' ? Math.min(1, (S.level - 1) * 0.2 + S.levelT / 120) : 0, dead: false, taken: false, gone: false, bonus: false,
    };
    S.items.push(it);
    J.throwT = 0.18;
    return it;
  }

  function spawnBasic() {
    // el nivel 1 empieza suave para aprender a lanzar huesos
    const pSpider = S.level === 1 && S.levelT < 5 ? 0 : Math.min(0.55, 0.26 + S.level * 0.05 + (J.angry ? 0.08 : 0));
    let type = 'candy';
    if (Math.random() < pSpider) type = 'spider';
    else {
      const q = Math.random();
      if (q < 0.07) type = 'gold';
      else if (q < 0.11 && S.shieldT <= 0 && S.levelT > 6 && !hasItem('pumpkin')) type = 'pumpkin';
      else if (q < 0.14 && S.lives < P.val('vidas') && !hasItem('life')) type = 'life';
    }
    throwItem(type, J.x, J.y + J.r * 0.5);
  }

  function specialInterval() { return Math.max(2.6, 6.5 - S.level * 0.35) * (J.angry ? 0.7 : 1) * (J.big ? 0.85 : 1) * rand(0.85, 1.2); }
  function startSpecial() {
    J.atkT = specialInterval();
    const a = [];
    if (S.level >= 2) a.push('web');
    if (S.level >= 3 || J.angry) a.push('rain');
    if (S.level >= 4) a.push('bomb');
    if (S.level >= 5) a.push('dive', 'dive');
    if (!a.length) return;
    const type = pick(a);
    if (type === 'dive') {
      J.dive = { phase: 'warn', t: 0, x: clamp(K.x, J.r + 8 * U, W - J.r - 8 * U) };
      Snd.warn(); jSay('¡Allá voy!', 1);
      return;
    }
    J.atk = { type, t: 0, warn: type === 'rain' ? 0.75 : 0.35, done: false };
    if (type === 'rain') { Snd.warn(); Snd.skitter(); }
  }
  function updateSpecial(dt) {
    const a = J.atk;
    a.t += dt;
    if (a.t >= a.warn && !a.done) {
      a.done = true;
      const y0 = J.y + J.r * 0.5;
      if (a.type === 'web') {
        const n = S.level >= 4 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const aim = ((K.x + (i - (n - 1) / 2) * 90 * U) - J.x) / fallTime();
          throwItem('web', J.x, y0, aim * rand(0.8, 1.1));
        }
        Snd.whoosh({ v: 0.06, f: 900, f2: 400, d: 0.25 });
      } else if (a.type === 'rain') {
        const n = S.level <= 2 ? 3 : S.level >= 6 ? 7 : 5;
        for (let i = 0; i < n; i++) throwItem('spider', J.x, y0, (i / (n - 1) - 0.5) * W * 0.9, 1.05);
        jSay('¡Lluvia de arañas!', 1.2);
        Snd.skitter(); Snd.barkJ({ v: 0.14 });
      } else if (a.type === 'bomb') {
        const n = S.level >= 6 ? 3 : 2;
        for (let i = 0; i < n; i++) throwItem('bomb', J.x, y0, rand(-1, 1) * W * 0.25);
        jSay('¡Caramelos... especiales!', 1.4);
        Snd.laugh({ v: 0.12 });
      }
    }
    if (a.t >= a.warn + 0.3) J.atk = null;
  }

  function updateDive(dt) {
    const d = J.dive;
    d.t += dt;
    if (d.phase === 'warn') {
      J.x += (d.x - J.x) * (1 - Math.exp(-dt * 10));
      J.y = J.baseY + Math.sin(S.clock * 40) * 2 * U;
      if (d.t >= 0.9) { d.phase = 'down'; d.t = 0; Snd.dash(); Snd.barkJ({ v: 0.2, size: 1.3 }); }
    } else if (d.phase === 'down') {
      const k = Math.min(1, d.t / 0.26);
      J.x = d.x; J.y = J.baseY + (K.y - J.baseY) * k * k;
      if (k >= 1) { d.phase = 'bottom'; d.t = 0; S.shake = 10 * U; punch(1.05); Snd.thud({ v: 0.35 }); Snd.boom(); burst(J.x, S.groundY, ['#3a2452', '#fff', '#170a24'], 18); }
    } else if (d.phase === 'bottom') {
      if (d.t >= 0.35) { d.phase = 'up'; d.t = 0; Snd.whoosh({ v: 0.05, f: 400, f2: 1600, d: 0.4 }); }
    } else {
      const k = Math.min(1, d.t / 0.5);
      J.y = K.y + (J.baseY - K.y) * (1 - (1 - k) * (1 - k));
      if (k >= 1) { J.dive = null; J.y = J.baseY; return; }
    }
    if (d.phase === 'down' || d.phase === 'bottom') {
      const rr = J.r * 0.8 + K.r * 0.8;
      if (dist2(J.x, J.y, K.x, K.y) < rr * rr) damageKaska();
    }
  }

  function updateBossAI(dt) {
    if (J.enterT > 0 || J.defeatT > 0 || J.hp <= 0) return;
    if (!J.angry && J.hp <= J.maxHp * 0.5) {
      J.angry = true;
      banner(J.big ? '¡FURIA DEL REY!' : '¡JOSELITO SE ENFADA!', 'Ahora ataca más rápido', '#ff4b4b', 1.8);
      Snd.growlJ(); vib(90); punch(1.06); S.shake = 8 * U;
      jSay('¡¡GRRRRRR!!', 1.6);
    }
    if (J.stunT > 0) return; // aturdido por el súper ladrido
    S.spawnT -= dt;
    if (S.spawnT <= 0 && !J.atk && !J.dive) { spawnBasic(); S.spawnT = basicInterval(); }
    J.atkT -= dt;
    if (J.atkT <= 0 && !J.atk && !J.dive) startSpecial();
    if (J.atk) updateSpecial(dt);
    S.nextTaunt -= dt;
    if (S.nextTaunt <= 0) {
      if (!S.jBub) { jSay(pick(J_TAUNTS)); if (Math.random() < 0.5) Snd.barkJ({ v: 0.12 }); else Snd.growl({ d: 0.5, v: 0.1 }); }
      S.nextTaunt = rand(7, 12);
    }
  }

  function throwBone() {
    if (S.state !== 'playing' || S.mode !== 'batalla' || S.boneCD > 0) return;
    if (S.ammo <= 0) {
      if (S.emptyT <= 0) { popup(K.x, K.y - K.r * 1.7, '¡Sin huesos! Coge caramelos', '#ff9b3d', 17); Snd.empty(); S.emptyT = 1.2; }
      return;
    }
    S.ammo--; S.boneCD = 0.09;
    S.bones.push({ x: K.x, y: K.y - K.r, vy: -980 * U, rot: rand(0, TAU), gone: false });
    Snd.throw();
    if (Math.random() < 0.18) Snd.barkK({ v: 0.08 });
    K.squash = 0.6;
  }

  function dash(dir) {
    if (S.state !== 'playing' || S.mode !== 'batalla' || K.dashCD > 0 || !dir) return false;
    K.dashT = 0.16; K.dashV = (dir * 150 * U) / 0.16; K.dashCD = P.val('dash'); K.immT = 0.32; K.lastDir = dir;
    Snd.dash(); vib(20);
    return true;
  }

  function addBark(v) {
    if (S.bark >= 1) return;
    S.bark = Math.min(1, S.bark + v * P.val('ladrido'));
    if (S.bark >= 1) {
      Snd.ready();
      if (!S.barkHinted) { S.barkHinted = true; kSay('¡Pulsa GUAU para el súper ladrido!', 2.4); }
    }
  }
  function doBark() {
    if (S.state !== 'playing' || S.mode !== 'batalla' || S.bark < 1) return;
    S.bark = 0; S.barks++;
    missionsDone(P.event('barks'));
    S.barkWave = { t: 0 };
    Snd.woof(); vib([40, 30, 90]); S.shake = 14 * U; S.flash = 0;
    S.hitStop = 0.08; punch(1.1); S.wflash = 0.25;
    kSay('¡¡GUAAAU!!', 1.2);
    for (const it of S.items) {
      if (!it.dead && !it.taken && (it.type === 'spider' || it.type === 'web' || it.type === 'bomb')) { destroyEnemy(it, false); addScore(10); }
    }
    if (J.hp > 0 && J.enterT <= 0 && J.defeatT <= 0 && S.betweenT <= 0) {
      J.stunT = 2.5; J.atk = null;
      if (J.dive) { J.dive.phase = 'up'; J.dive.t = 0; }
      J.hp = Math.max(0, J.hp - 3 * P.val('fuerza')); J.hitT = 0.15; J.kick = 16 * U;
      popup(J.x, J.y + J.r * 1.4, '¡ATURDIDO!', '#ffd23f', 24);
      Snd.yelpJ(0.15); Snd.stun();
      if (J.hp <= 0) defeatJoselito();
    }
  }

  function hitJoselito(x, y) {
    const dmg = P.val('fuerza') * (J.stunT > 0 ? 1.5 : 1);
    J.hp = Math.max(0, J.hp - dmg); J.hitT = 0.12; J.kick = Math.min(18 * U, J.kick + 7 * U);
    bumpCombo();
    addScore(5 * S.mult);
    popup(x, y - 10 * U, `+${5 * S.mult}`, '#ffb3b3', 16);
    burst(x, y, ['#fff', '#fbf3df', '#ff9b9b'], 8);
    Snd.thwack(); vib(15);
    addBark(0.03);
    if (J.hp <= 0) { defeatJoselito(); return; }
    // al recibir un golpe se le caen caramelos
    const n = Math.random() < 0.3 ? 2 : 1;
    for (let i = 0; i < n; i++) throwItem(Math.random() < 0.1 ? 'gold' : 'candy', J.x, J.y + J.r * 0.6, rand(-1, 1) * W * 0.2, 0.85);
    if (!S.jBub && Math.random() < 0.2) jSay(pick(J_HURT), 0.8);
  }

  function defeatJoselito() {
    const final = J.big;
    S.defeats++;
    missionsDone(P.event('beatJ'));
    J.defeatT = 1.8; J.spin = 0; J.atk = null; J.dive = null; J.stunT = 0;
    // K.O.: parón, cámara lenta, zoom y destello
    S.hitStop = 0.16; S.slowT = 1.1; S.slowF = 0.3; S.wflash = 0.55;
    S.koT = 1.4; S.koX = J.x; S.koY = J.y;
    camTo(J.x, J.y + 60 * U, 1.35, 9);
    Snd.impact({ v: 0.32 }); Snd.yelpJ(0.05); Snd.whineJ(0.45);
    vib([50, 40, 50, 40, 120]); S.shake = 12 * U;
    for (const it of S.items) if (!it.dead && !it.taken && (it.type === 'spider' || it.type === 'web' || it.type === 'bomb')) destroyEnemy(it, false);
    burst(J.x, J.y, ['#ffd23f', '#ff4f9a', '#4fd1ff', '#9be15d', '#fff'], 40, 380);
    if (final) { // fin de la historia
      addScore(5000);
      S.endingT = 1.5;
      jSay('¡Nooo! ¡Mis caramelos!', 1.6);
      return;
    }
    S.betweenT = 4.4;
    const perfect = S.hitsTaken === 0;
    const bonus = 250 * S.level + (perfect ? 300 : 0);
    addScore(bonus);
    banner('¡JOSELITO DERROTADO!', perfect ? `+${fmt(bonus)} · ¡sin recibir daño!` : `+${fmt(bonus)} puntos`, '#9be15d', 2.6);
    Snd.win(0.7);
    jSay(pick(J_DEFEAT), 1.6);
    // piñata de caramelos
    for (let i = 0; i < 12; i++) throwItem(i < 2 ? 'gold' : 'candy', J.x, J.y, rand(-1, 1) * W * 0.35, rand(0.55, 0.85)).bonus = true;
  }

  function destroyEnemy(it, byBone) {
    if (it.type === 'bomb') { it.taken = true; explode(it.x, it.y, false); addScore(15); popup(it.x, it.y, '+15', '#ff9bf0', 18); }
    else if (it.type === 'web') { it.taken = true; burst(it.x, it.y, ['#fff', '#e0e0ff'], 10); addScore(5); if (byBone) Snd.squish(); }
    else { // araña: sale volando
      it.dead = true; it.vy = -500 * U; it.vx = rand(-1, 1) * 320 * U; it.vr = 14;
      addScore(5);
      if (byBone) Snd.squish();
    }
    if (byBone) {
      if (it.type === 'spider') { S.spidersShot++; missionsDone(P.event('spidersShot')); popup(it.x, it.y, '+5', '#fff', 16); }
      addBark(0.04);
    }
  }

  function damageKaska() {
    if (S.invT > 0 || K.immT > 0 || S.state !== 'playing') return;
    if (S.shieldT > 0) { Snd.bounce(); return; }
    S.lives--; S.hitsTaken++;
    S.invT = 1.6; S.shake = 14 * U; S.flash = 0.45;
    if (S.combo >= COMBO_STEP) popup(K.x, K.y - K.r * 2.2, 'Combo perdido', '#ff6b6b', 20);
    S.combo = 0; S.mult = 1;
    vib(160);
    if (S.lives <= 0) { die(); return; }
    Snd.hit(); punch(1.04);
    J.laughT = 1.4; jSay(pick(J_LAUGH), 1.5);
    if (Math.random() < 0.6) Snd.laugh({ t: 0.3, v: 0.13 });
  }

  function catchItem(it) {
    switch (it.type) {
      case 'candy': case 'gold': {
        it.taken = true;
        const gold = it.type === 'gold';
        S.caught++;
        bumpCombo();
        const before = S.ammo;
        S.ammo = Math.min(S.maxAmmo, S.ammo + (gold ? 3 : 1));
        const pts = (gold ? 50 : 10) * S.mult * (S.shieldT > 0 ? 2 : 1);
        addScore(pts);
        popup(it.x, it.y - it.r, `+${pts}`, gold ? '#ffd23f' : '#fff', gold ? 26 : 20);
        burst(it.x, it.y, gold ? ['#ffd23f', '#fff3a0', '#fff'] : [it.col.main, it.col.dark, '#fff'], gold ? 20 : 10);
        if (gold) {
          S.golds++;
          if (S.ammo > before) popup(K.x + K.r, K.y - K.r * 0.6, `+${S.ammo - before} huesos`, '#fbf3df', 16);
          Snd.gold(); kSay('¡¡Dorado!!');
          missionsDone(P.event('golds'));
        } else Snd.catch(S.combo);
        missionsDone(P.event('candies'));
        addBark(gold ? 0.15 : 0.05);
        K.squash = 1;
        break;
      }
      case 'spider': case 'bomb':
        if (S.shieldT > 0) { destroyEnemy(it, false); popup(it.x, it.y - it.r, '¡FUERA!', '#ff9b3d', 20); Snd.bounce(); }
        else if (S.invT <= 0 && K.immT <= 0) {
          it.taken = true;
          if (it.type === 'bomb') explode(it.x, it.y, true);
          else burst(it.x, it.y, ['#111', '#2a1f33', '#ff3045'], 16);
          damageKaska();
        }
        break;
      case 'web':
        if (S.shieldT > 0) destroyEnemy(it, false);
        else if (K.immT <= 0) {
          it.taken = true;
          S.webT = 2.6;
          popup(K.x, K.y - K.r * 1.7, '¡Pegado!', '#e0e0ff', 22);
          burst(it.x, it.y, ['#fff', '#e0e0ff'], 12);
          Snd.web();
        }
        break;
      case 'pumpkin':
        it.taken = true;
        S.shieldT = P.val('escudo');
        Snd.power(); vib(40);
        banner('¡MODO CALABAZA!', 'Escudo · puntos x2', '#ff8c2a', 1.6);
        burst(it.x, it.y, ['#ff8a2a', '#ffd23f', '#4f8a2a'], 22);
        kSay('¡Soy invencible!');
        break;
      case 'life':
        it.taken = true;
        if (S.lives < MAX_LIVES) { S.lives++; popup(it.x, it.y - it.r, '+1 VIDA', '#ff7b9a', 26); }
        else { addScore(100); popup(it.x, it.y - it.r, '+100', '#ffd23f', 26); }
        Snd.life();
        burst(it.x, it.y, ['#fbf3df', '#ff4b6e', '#fff'], 16);
        kSay('¡Un hueso! ¡Ñam!');
        break;
    }
  }

  function missed(it) {
    if (S.combo >= 4) { popup(it.x, S.groundY - 30 * U, 'Combo perdido', '#ff6b6b', 18); Snd.miss(); }
    S.combo = 0; S.mult = 1;
    if (it.type === 'gold' && !S.jBub) jSay('¡El dorado es para mí!', 1.6);
  }

  function die() {
    J.atk = null; J.dive = null;
    startCine('ko');
  }

  function moveKaska(dt, dying) {
    const px = K.x;
    if (!dying) {
      const kb = 640 * U * (S.webT > 0 ? 0.45 : 1);
      if (keys.left) K.tx -= kb * dt;
      if (keys.right) K.tx += kb * dt;
      K.tx = clamp(K.tx, K.r, W - K.r);
      if (K.dashT > 0) {
        K.dashT -= dt;
        K.x = clamp(K.x + K.dashV * dt, K.r, W - K.r);
        K.tx = K.x;
        K.trail.push({ x: K.x, y: K.y, a: 0.45 });
      } else {
        const maxV = (S.webT > 0 ? 230 : 1500) * U;
        K.x += clamp((K.tx - K.x) * (1 - Math.exp(-dt * 20)), -maxV * dt, maxV * dt);
      }
    }
    K.vx = (K.x - px) / Math.max(dt, 1e-4);
    if (Math.abs(K.vx) > 40 * U) K.lastDir = Math.sign(K.vx);
  }

  function updateBones(dt) {
    for (const b of S.bones) {
      b.y += b.vy * dt; b.rot += 16 * dt;
      if (b.y < -20) { b.gone = true; continue; }
      if (S.state !== 'playing') continue;
      if (J.hp > 0 && J.enterT <= 0 && J.defeatT <= 0 && S.betweenT <= 0) {
        const rr = J.r * 0.95 + 8 * U;
        if (dist2(b.x, b.y, J.x, J.y) < rr * rr) { b.gone = true; hitJoselito(b.x, b.y); continue; }
      }
      for (const it of S.items) {
        if (it.dead || it.taken || (it.type !== 'spider' && it.type !== 'web' && it.type !== 'bomb')) continue;
        const rr = it.r + 9 * U;
        if (dist2(b.x, b.y, it.x, it.y) < rr * rr) { destroyEnemy(it, true); b.gone = true; break; }
      }
    }
    S.bones = S.bones.filter((b) => !b.gone);
  }

  function updateItems(dt, dying) {
    const mag = P.val('iman') * U;
    for (const it of S.items) {
      const good = it.type === 'candy' || it.type === 'gold';
      if (good && mag > 0 && !dying) {
        const dx = K.x - it.x, dy = K.y - it.y, d = Math.hypot(dx, dy), R = mag + K.r;
        if (d < R && d > 1) { const f = (1 - d / R) * 9 * dt; it.x += dx * f; it.y += dy * f * 0.6; }
      }
      it.y += it.vy * dt; it.x += it.vx * dt; it.rot += it.vr * dt;
      if (it.type === 'spider' && !it.dead) it.x += Math.sin(S.t * 4 + it.seed) * it.wob * 90 * U * dt;
      if (it.x < it.r) { it.x = it.r; it.vx = Math.abs(it.vx); }
      if (it.x > W - it.r) { it.x = W - it.r; it.vx = -Math.abs(it.vx); }
      if (it.dead) it.vy += 1600 * U * dt;
      if (!it.dead && !dying) {
        const rr = K.r * 0.92 + it.r * 0.7;
        if (dist2(it.x, it.y, K.x, K.y) < rr * rr) catchItem(it);
      }
      if (it.taken) continue;
      if (it.type === 'bomb' && !it.dead && it.y > S.groundY - it.r * 0.5) { it.gone = true; explode(it.x, S.groundY - 6 * U, false); continue; }
      if (it.y - it.r * 2 > H) {
        it.gone = true;
        if (good && !it.dead && !dying && !it.bonus) missed(it);
      }
    }
    S.items = S.items.filter((i) => !i.gone && !i.taken);
  }

  function updateBattle(dt, dying) {
    if (!dying) { S.t += dt; if (S.betweenT <= 0) S.levelT += dt; }
    moveKaska(dt, dying);
    S.invT = Math.max(0, S.invT - dt);
    S.shieldT = Math.max(0, S.shieldT - dt);
    S.webT = Math.max(0, S.webT - dt);
    S.emptyT = Math.max(0, S.emptyT - dt);
    S.boneCD = Math.max(0, S.boneCD - dt);
    K.immT = Math.max(0, K.immT - dt);
    // botón de disparar mantenido: ráfaga de huesos
    if (S.fireHeld && !dying) { S.fireT -= dt; if (S.fireT <= 0) { throwBone(); S.fireT = 0.18; } }
    if (K.dashCD > 0) { K.dashCD -= dt; if (K.dashCD <= 0) K.readyFlash = 0.35; }
    if (J.stunT > 0) J.stunT -= dt;
    if (!dying) {
      if (S.betweenT > 0) {
        S.betweenT -= dt;
        if (S.betweenT <= 0) {
          const n = S.level + 1;
          startLevel(n);
          if (n === FINAL_LEVEL && !S.endless) startCine('finalboss');
        }
      } else updateBossAI(dt);
      if (J.dive) updateDive(dt);
      if (S.hints.length && S.t >= S.hints[0].t) { const h = S.hints.shift(); kSay(h.text, 2.6); }
      // latido cuando solo queda una vida
      if (S.lives === 1 && S.state === 'playing') {
        S.hbT -= dt;
        if (S.hbT <= 0) { S.hbT = 0.9; S.hbPulse = 1; Snd.heartbeat(); }
      }
    }
    updateBones(dt);
    updateItems(dt, dying);
    if (S.barkWave) { S.barkWave.t += dt; if (S.barkWave.t > 0.6) S.barkWave = null; }
  }

  function updateJ(dt) {
    J.throwT = Math.max(0, J.throwT - dt);
    J.laughT = Math.max(0, J.laughT - dt);
    J.hitT = Math.max(0, J.hitT - dt);
    J.kick *= Math.exp(-dt * 12);
    J.hpLag += (J.hp - J.hpLag) * (1 - Math.exp(-dt * (J.hpLag < J.hp ? 2.5 : 3.5)));
    if (J.enterT > 0) {
      J.enterT -= dt;
      const k = clamp(1 - J.enterT / J.enterDur, 0, 1);
      J.y = -J.r * 2 + (J.baseY + J.r * 2) * easeOutBack(k);
      return;
    }
    if (J.defeatT > 0) {
      J.defeatT -= dt;
      J.spin += dt * 14;
      J.y -= dt * 320 * U * Math.max(0, 1.8 - J.defeatT);
      return;
    }
    if (J.dive) return; // la embestida mueve a Joselito
    const playing = S.state === 'playing' && S.mode === 'batalla';
    const fury = J.angry && playing;
    J.retT -= dt;
    if (J.retT <= 0) {
      const chase = playing && Math.random() < (fury ? 0.55 : 0.35);
      J.tx = clamp(chase ? K.x + rand(-40, 40) * U : rand(0, W), J.r + 8 * U, W - J.r - 8 * U);
      J.retT = fury ? rand(0.35, 0.8) : rand(0.7, 1.8);
    }
    const lvl = playing ? S.level : 1;
    const rate = (2.4 + lvl * 0.25) * (fury ? 1.7 : 1) * (J.stunT > 0 ? 0.15 : 1);
    J.x += (J.tx - J.x) * (1 - Math.exp(-dt * rate));
    J.phase += dt * (fury ? 9 : 2.5);
    J.y = J.baseY + Math.sin(J.phase) * 6 * U;
  }

  /* =====================================================================
     MODO 2: APLASTA A JOSELITO
     ===================================================================== */
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

  function occY(h, o) {
    const e = o.state === 'up' ? easeOutBack(clamp(o.pop, 0, 1)) : o.pop;
    return h.y + HR * 1.15 - e * HR * 1.9;
  }

  function whackInterval() {
    const d = clamp(S.t / S.whackTime, 0, 1);
    let i = 0.85 - d * 0.47;
    if (S.timeLeft <= 5) i *= 0.8;
    return i * rand(0.75, 1.2);
  }

  function whackSpawn() {
    const d = clamp(S.t / S.whackTime, 0, 1);
    const active = holes.filter((h) => h.o).length;
    if (active >= 2 + Math.round(d * 2)) return;
    const free = holes.filter((h) => !h.o);
    if (!free.length) return;
    const h = pick(free);
    const hasGold = holes.some((x) => x.o && x.o.type === 'gold');
    const pK = S.t < 3 ? 0 : 0.17 + d * 0.1;
    const pF = S.t < 5 ? 0 : 0.14;
    const pG = S.t < 7 || hasGold || S.wgolds >= 3 ? 0 : 0.05;
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
      else if (!S.lastCall) { S.lastCall = true; banner('¡ÚLTIMOS SEGUNDOS!', null, '#ff4b4b', 1.2); Snd.warn(); }
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
      const d2 = dist2(x, y, h.x, occY(h, o)), rr = HR * 1.3;
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
      S.hits++; S.wgolds++;
      S.timeLeft += 3;
      addScore(20);
      popup(best.x, cy - HR, '+3 s', '#ffd23f', 30);
      burst(best.x, cy, ['#ffd23f', '#fff3a0', '#fff'], 22);
      Snd.gold(); vib(30);
    } else {
      S.hits++; S.whacked++;
      bumpCombo();
      const pts = (o.type === 'jf' ? 30 : 10) * S.mult;
      addScore(pts);
      popup(best.x, cy - HR * 1.7, `+${pts}`, o.type === 'jf' ? '#ffd23f' : '#9be15d', o.type === 'jf' ? 26 : 22);
      burst(best.x, cy, ['#ffd23f', '#fff', '#ff9b3d', '#1a0726'], 14);
      Snd.bonk(S.combo); vib(25);
      S.shake = Math.max(S.shake, 4 * U);
      missionsDone(P.event('whacked'));
    }
  }

  function whackEscaped(h, o) {
    if (o.type !== 'j' && o.type !== 'jf') return;
    if (S.combo >= 3) popup(h.x, h.y - HR * 2, 'Combo perdido', '#ff6b6b', 18);
    if (S.combo > 0) Snd.miss();
    S.combo = 0; S.mult = 1;
    if (!S.jBub && Math.random() < 0.35) { jSay(pick(W_ESCAPE), 1.2, h.x, h.y - HR * 2.4); Snd.laugh({ v: 0.09 }); }
  }

  function timeUp() {
    S.banner = null;
    startCine('timeup');
  }

  function drawWhack() {
    for (const h of holes) drawHole(h);
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
    drawBowlShape(h.x, h.y, h.w, h.o && h.o.pop > 0 ? () => drawOccupant(h, h.o) : null, true);
  }

  // cubo de calabaza lleno de caramelos (el botín de Kaska en las cinemáticas)
  const BOWL_CANDY = [[-0.2, -0.04, 0], [0.12, -0.08, 1], [0, 0.02, 2], [-0.05, -0.12, 3], [0.24, 0, 4]];
  function drawBowl(x, y, w, candies, shadow) {
    drawBowlShape(x, y, w, candies ? () => {
      for (const [dx, dy, i] of BOWL_CANDY) drawCandy(ctx, x + dx * w, y + dy * w, w * 0.13, i * 1.3, CANDY_COLS[i]);
    } : null, shadow);
  }

  // calabaza con cara de Jack pintada; inner() dibuja lo que asoma por la boca
  function drawBowlShape(x, y, w, inner, shadow) {
    const rx = w * 0.36, ry = w * 0.11, bw = w * 0.5, bh = w * 0.66;
    if (shadow) {
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.ellipse(x, y + bh, bw * 0.95, w * 0.07, 0, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#2b1206';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#a2400a'; ctx.lineWidth = Math.max(2, w * 0.03);
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, Math.PI, TAU); ctx.stroke();
    if (inner) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x - w, y - w * 1.3, w * 2, w * 1.3 + bh * 0.8); ctx.clip();
      inner();
      ctx.restore();
    }
    const g = ctx.createLinearGradient(x - bw, 0, x + bw, 0);
    g.addColorStop(0, '#c2500c'); g.addColorStop(0.45, '#ff8a2a'); g.addColorStop(1, '#b8460a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - rx, y);
    ctx.bezierCurveTo(x - bw * 1.08, y + bh * 0.12, x - bw * 1.05, y + bh, x, y + bh);
    ctx.bezierCurveTo(x + bw * 1.05, y + bh, x + bw * 1.08, y + bh * 0.12, x + rx, y);
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI, false);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,40,0,.45)'; ctx.lineWidth = Math.max(1.5, w * 0.025);
    for (const s of [-0.55, 0.55]) {
      ctx.beginPath();
      ctx.moveTo(x + s * rx, y + ry * 0.85);
      ctx.quadraticCurveTo(x + s * bw * 1.2, y + bh * 0.55, x + s * bw * 0.45, y + bh * 0.98);
      ctx.stroke();
    }
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
      ox = Math.sin(S.clock * 9 + o.seed) * 3 * U;
    }
    if (o.type !== 'k') {
      spiderLegs(ctx, x + ox, cy, HR * 0.85, S.clock + o.seed, o.type === 'jf' ? 18 : 8, 0.55, 1.4, 1.95, '#0b080d', Math.max(2.5, HR * 0.16), true);
    }
    ctx.save();
    ctx.translate(x + ox, cy); ctx.scale(sx, sy);
    if (o.type === 'k') {
      drawKaskaToken(ctx, 0, 0, HR, P.costume(), o.state === 'hit' ? '#ff4b4b' : null);
      if (o.state === 'hit') { ctx.fillStyle = 'rgba(255,40,40,.35)'; ctx.beginPath(); ctx.arc(0, 0, HR, 0, TAU); ctx.fill(); }
    } else {
      const angry = o.type === 'jf' || o.state === 'hit';
      token(ctx, angry ? IMG.jf : IMG.j, 0, 0, HR, o.type === 'jf' ? '#ff3b3b' : '#120a18');
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
    const frac = clamp(S.timeLeft / S.whackTime, 0, 1);
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

  /* =====================================================================
     CINEMÁTICAS: cámara, barras de cine, textos y escenas
     ===================================================================== */
  const CAM = { x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1, k: 5 };
  function camTo(x, y, z, k = 5) { CAM.tx = x; CAM.ty = y; CAM.tz = z; CAM.k = k; }
  function camReset(k = 4) { camTo(W / 2, H / 2, 1, k); }
  function punch(z = 1.06) { CAM.z = Math.max(CAM.z, z); }
  function updateCam(dt) {
    const f = 1 - Math.exp(-dt * CAM.k);
    CAM.x += (CAM.tx - CAM.x) * f; CAM.y += (CAM.ty - CAM.y) * f; CAM.z += (CAM.tz - CAM.z) * f;
  }
  function applyCam() {
    const z = CAM.z;
    if (Math.abs(z - 1) < 0.002 && Math.abs(CAM.x - W / 2) < 0.5 && Math.abs(CAM.y - H / 2) < 0.5) return;
    const hw = W / (2 * z), hh = H / (2 * z);
    // con barras de cine la cámara puede bajar un poco: lo que queda debajo lo tapa la barra negra
    const extra = (H * 0.12 * S.bars) / z;
    const cx = z >= 1 ? clamp(CAM.x, hw, W - hw) : W / 2, cy = z >= 1 ? clamp(CAM.y, hh, H - hh + extra) : H / 2;
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-cx, -cy);
  }

  function caption(text) { S.caption = text ? { text, t0: S.clock } : null; }
  function wrapText(text, maxW) {
    const lines = [];
    let line = '';
    for (const w of text.split(' ')) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }
  function drawBars() {
    if (S.bars < 0.01) return;
    const h = H * 0.12 * S.bars;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h);
    const c = S.caption;
    if (!c || h < 30) return;
    // texto que se va escribiendo letra a letra en la barra de abajo
    ctx.font = `600 ${15.5 * U}px ${FB}`;
    const lines = wrapText(c.text, W - 36 * U);
    let n = Math.floor((S.clock - c.t0) * 40);
    const lh = 21 * U, y0 = H - h / 2 - ((lines.length - 1) * lh) / 2;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    lines.forEach((l, i) => {
      if (n <= 0) return;
      ctx.fillText(l.slice(0, n), W / 2 - ctx.measureText(l).width / 2, y0 + i * lh);
      n -= l.length + 1;
    });
  }
  // texto grande que entra de golpe
  function slam(text, t, y, size, color, sub) {
    if (t < 0) return;
    const k = Math.min(1, t / 0.18);
    ctx.save();
    ctx.globalAlpha = k;
    ctx.translate(W / 2, y); ctx.scale(2.4 - 1.4 * k, 2.4 - 1.4 * k);
    let sz = size;
    ctx.font = `${sz}px ${FT}`;
    const w = ctx.measureText(text).width;
    if (w > W * 0.9) sz *= (W * 0.9) / w;
    txt(text, 0, 0, sz, color, 'center', FT, '#1a0726', sz * 0.2);
    ctx.restore();
    if (sub && t > 0.35) {
      ctx.globalAlpha = Math.min(1, (t - 0.35) / 0.3);
      txt(sub, W / 2, y + size * 0.85, 17 * U, '#fff', 'center', FB, '#1a0726', 4 * U);
      ctx.globalAlpha = 1;
    }
  }
  function drawCredits(t) {
    ctx.fillStyle = `rgba(8,3,14,${Math.min(0.7, t * 1.2)})`;
    ctx.fillRect(0, 0, W, H);
    CREDITS.forEach(([line, kind], i) => {
      if (!line) return;
      const y = H * 0.9 + i * 34 * U - t * 85 * U;
      if (y < -20 || y > H + 20) return;
      ctx.globalAlpha = clamp(Math.min((H - y) / (60 * U), y / (80 * U)), 0, 1);
      if (kind === 'title') txt(line, W / 2, y, 26 * U, '#ffd23f');
      else if (kind === 'h') txt(line, W / 2, y, 14 * U, '#ff9b3d', 'center', FB, '#1a0726', 3 * U);
      else txt(line, W / 2, y, 20 * U, '#fff');
    });
    ctx.globalAlpha = 1;
  }
  // Joselito-araña colgando de su hilo (para las escenas)
  function drawSpiderDog(x, y, r, angry, legSpeed = 4, thread = true) {
    if (thread) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, -H); ctx.lineTo(x, y - r); ctx.stroke(); }
    spiderLegs(ctx, x, y, r, S.clock, legSpeed, 0.55, 1.45, 2.05, '#0b080d', Math.max(4, r * 0.21), true);
    token(ctx, angry ? IMG.jf : IMG.j, x, y, r, angry ? '#ff3b3b' : '#120a18');
  }
  function dizzy(x, y, r) {
    ctx.fillStyle = '#ffd23f';
    for (let i = 0; i < 4; i++) {
      const a = S.clock * 6 + (i * TAU) / 4;
      star4(ctx, x + Math.cos(a) * r * 1.05, y - r * 1.1 + Math.sin(a) * r * 0.25, r * 0.2);
    }
  }

  const cue = (c, time, fn) => { if (c.t >= time && !c.fired.has(time)) { c.fired.add(time); fn(); } };
  const phase = (c, a, b) => clamp((c.t - a) / (b - a), 0, 1);
  const easeOut = (k) => 1 - (1 - k) * (1 - k);

  const CINES = {
    /* Historia: Joselito roba el cubo de caramelos de Kaska */
    intro: {
      skip: true, dur: 11.8, scene: 'custom',
      start(c) {
        c.kr = 52 * U; c.kx = W * 0.3; c.ky = S.groundY - c.kr - 6 * U;
        c.bw = 100 * U; c.bx = W * 0.7; c.by = S.groundY - c.bw * 0.66 - 2 * U;
        c.jr = 46 * U; c.jx = c.bx; c.jy = -c.jr * 3; c.grab = false; c.drops = []; c.angry = false; c.title = -1;
        S.items = []; S.bones = []; S.jBub = null; S.kBub = null; S.banner = null;
        CAM.x = W / 2; CAM.y = H * 0.64; CAM.z = 1.14; camTo(W / 2, H * 0.64, 1.05, 0.6);
        Snd.music('menu');
      },
      update(c, dt) {
        cue(c, 0.25, () => caption('31 de octubre. Noche de Halloween...'));
        cue(c, 1.4, () => { Snd.barkK2(); kSay('¡Guau guau!', 1.3, c.kx, c.ky - c.kr - 30 * U); });
        cue(c, 3.0, () => { caption('Kaska había reunido el mejor botín de caramelos del barrio.'); Snd.pant(); });
        cue(c, 4.0, () => { Snd.chime({ v: 0.06 }); burst(c.bx, c.by - 10 * U, ['#ffd23f', '#fff', '#ff4f9a'], 14, 160); });
        cue(c, 5.6, () => { caption('Pero alguien le vigilaba desde las alturas...'); Snd.stopMusic(0.8); Snd.rumble(2.2); camTo(c.bx, H * 0.58, 1.1, 1.4); });
        cue(c, 6.4, () => Snd.growl({ d: 1.1, v: 0.15 }));
        if (c.t < 7.9) c.jy = -c.jr * 3 + (c.by - c.jr * 1.05 + c.jr * 3) * easeOut(phase(c, 5.8, 7.3));
        cue(c, 7.3, () => {
          c.grab = true; S.shake = 6 * U;
          Snd.laugh();
          jSay('¡MUAJAJA! ¡Ahora son MÍOS!', 1.8, c.jx, c.jy - c.jr - 34 * U);
          for (let i = 0; i < 6; i++) c.drops.push({ x: c.bx + rand(-30, 30) * U, y: c.by - 6 * U, vx: rand(-150, 150) * U, vy: rand(-420, -220) * U, rot: rand(0, TAU), col: pick(CANDY_COLS) });
        });
        if (c.t >= 7.9) c.jy -= dt * (200 + (c.t - 7.9) * 900) * U; // se lo lleva hacia arriba
        cue(c, 7.95, () => Snd.whoosh({ v: 0.08, f: 300, f2: 1800, d: 0.5 }));
        cue(c, 8.9, () => { c.angry = true; caption(null); camTo(c.kx, c.ky - 30 * U, 1.55, 3); Snd.growl({ d: 0.7, v: 0.16, p: 1.4 }); });
        cue(c, 9.4, () => { Snd.barkK2({ v: 0.26 }); kSay('¡GRRR! ¡Devuélvemelos!', 1.4, c.kx, c.ky - c.kr - 30 * U); });
        cue(c, 10.4, () => { c.title = c.t; Snd.impact(); S.shake = 16 * U; S.wflash = 0.5; camReset(6); });
        cue(c, 11.2, () => { S.barsT = 0; });
        for (const d of c.drops) {
          d.vy += 1300 * U * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += 6 * dt;
          if (d.y > S.groundY - 6 * U) { d.y = S.groundY - 6 * U; d.vy *= -0.35; d.vx *= 0.7; }
        }
      },
      draw(c) {
        const by = c.grab ? c.jy + c.jr * 1.05 : c.by;
        if (by > -c.bw * 2) drawBowl(c.bx, by, c.bw, true, !c.grab);
        if (c.jy > -c.jr * 2.5) drawSpiderDog(c.jx, c.jy, c.jr, c.grab, c.grab ? 14 : 4);
        for (const d of c.drops) drawCandy(ctx, d.x, d.y, 13 * U, d.rot, d.col);
        const hop = !c.angry && c.t < 5.6 ? Math.abs(Math.sin(c.t * 7)) * 6 * U : 0;
        const sh = c.angry ? rand(-2, 2) * U : 0;
        drawKaskaToken(ctx, c.kx + sh, c.ky - hop, c.kr, P.costume(), c.angry ? '#ff3b3b' : null);
      },
      overlay(c) {
        if (c.title < 0) return;
        slam('¡KASKA', c.t - c.title, H * 0.36, 54 * U, '#ff7b1c');
        slam('CONTRAATACA!', c.t - c.title - 0.12, H * 0.36 + 58 * U, 44 * U, '#ffd23f');
      },
      end(c) {
        store.set('kvj_intro', true);
        if (c.after === 'menu') { showMenu(); return; }
        startLevel(1);
        startCine('ready');
      },
    },

    /* "¿Listo? ¡A luchar!" antes de empezar */
    ready: {
      skip: false, dur: 2.1, scene: 'auto',
      start() { Snd.music(S.mode === 'aplasta' ? 'whack' : 'battle'); camTo(W / 2, H * 0.56, 1, 4); },
      update(c, dt) {
        if (S.mode === 'batalla') updateJ(dt);
        cue(c, 0.3, () => Snd.tick());
        cue(c, 1.2, () => { Snd.barkK2({ v: 0.22 }); Snd.impact({ v: 0.16 }); S.shake = 6 * U; });
        cue(c, 1.7, () => { S.barsT = 0; });
      },
      overlay(c) {
        const whack = S.mode === 'aplasta';
        if (c.t < 1.2) slam(whack ? '¿LISTO?' : `NIVEL ${S.level}`, c.t - 0.3, H * 0.44, 48 * U, '#ffd23f', whack ? '¡No toques a Kaska!' : '¿Listo?');
        else slam(whack ? '¡A APLASTAR!' : '¡A LUCHAR!', c.t - 1.2, H * 0.44, 52 * U, '#ff7b1c');
      },
      end() { resumePlay(); },
    },

    /* Llega el jefe final */
    finalboss: {
      skip: false, dur: 4.4, scene: 'battle',
      start() {
        Snd.stopMusic(0.5); Snd.rumble(2.6);
        J.enterT = J.enterDur = 2.2;
        camTo(W / 2, J.baseY + 40 * U, 1.3, 1.2);
      },
      update(c, dt) {
        updateJ(dt);
        cue(c, 1.5, () => { Snd.impact({ v: 0.35 }); S.shake = 14 * U; });
        cue(c, 2.2, () => { Snd.laugh(); jSay('¡Nadie había llegado tan lejos! ¡Prepárate!', 2.2); });
        cue(c, 3.4, () => { Snd.growlJ(); camReset(3); });
        cue(c, 3.9, () => { S.barsT = 0; });
      },
      overlay(c) {
        const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.7);
        g.addColorStop(0, 'rgba(60,0,10,0)'); g.addColorStop(1, `rgba(60,0,10,${0.5 * Math.min(1, c.t)})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        slam('¡JEFE FINAL!', c.t - 1.5, H * 0.66, 50 * U, '#ff3b3b', 'Joselito, Rey de las Arañas');
      },
      end() { resumePlay(); },
    },

    /* Final de la historia + créditos */
    ending: {
      skip: true, dur: 17, scene: 'custom',
      start(c) {
        S.items = []; S.bones = []; S.jBub = null; S.kBub = null; S.banner = null;
        Snd.stopMusic(0.3);
        c.kr = K.r; c.kx = K.x; c.ky = K.y;
        c.jr = 50 * U; c.jx = W * 0.7; c.jy = -c.jr * 2; c.jvy = 0; c.landed = false;
        c.bw = 86 * U; c.bx = W * 0.5; c.by = -140 * U; c.bLanded = false; c.gift = -1; c.happy = false; c.hearts = [];
        c.fin = -1; c.credits = -1;
        camTo(W / 2, H * 0.66, 1.12, 1.5);
      },
      update(c, dt) {
        c.kx += (W * 0.28 - c.kx) * (1 - Math.exp(-dt * 2.5));
        if (!c.landed) {
          c.jvy += 1800 * U * dt; c.jy += c.jvy * dt;
          const gy = S.groundY - c.jr - 4 * U;
          if (c.jy >= gy) { c.jy = gy; c.landed = true; Snd.thud(); Snd.stun(); S.shake = 10 * U; burst(c.jx, S.groundY, ['#3a2452', '#fff', '#5a3a72'], 16); }
        }
        cue(c, 1.6, () => caption('Joselito, derrotado, devolvió el cubo de caramelos...'));
        if (c.t > 2.0 && !c.bLanded) {
          c.by += (300 + (c.t - 2) * 1200) * U * dt;
          const gy = S.groundY - c.bw * 0.66 - 2 * U;
          if (c.by >= gy) { c.by = gy; c.bLanded = true; Snd.thud({ v: 0.2 }); Snd.chime({ v: 0.05 }); burst(c.bx, c.by, ['#ffd23f', '#ff4f9a', '#4fd1ff'], 18, 200); }
        }
        cue(c, 3.4, () => { Snd.whineJ(); jSay('Perdón, Kaska... ¿me das uno?', 2.4, c.jx, c.jy - c.jr - 34 * U); });
        cue(c, 6.0, () => caption('Y Kaska, que es el bueno, decidió compartir.'));
        cue(c, 6.6, () => { Snd.barkK2(); kSay('¡Vale! ¡Para los dos!', 2.2, c.kx, c.ky - c.kr - 34 * U); });
        cue(c, 7.3, () => { c.gift = c.t; Snd.whoosh({ v: 0.06 }); });
        cue(c, 8.1, () => { c.happy = true; Snd.chomp(); Snd.chomp({ t: 0.1 }); Snd.pant({ t: 0.3 }); });
        cue(c, 8.8, () => { caption(null); camTo(W / 2, H * 0.6, 1, 1.2); Snd.victory(); });
        cue(c, 9.3, () => { c.fin = c.t; Snd.impact({ v: 0.25 }); });
        cue(c, 10.2, () => { Snd.howl({ p: 1.25 }); Snd.howl({ p: 0.95, t: 0.35 }); });
        cue(c, 11.5, () => { c.credits = c.t; Snd.music('menu'); });
        if (c.happy && Math.random() < dt * 6) c.hearts.push({ x: rand(c.kx, c.jx), y: S.groundY - 80 * U, vy: -rand(40, 90) * U, life: 2 });
        for (const h of c.hearts) { h.y += h.vy * dt; h.life -= dt; }
        c.hearts = c.hearts.filter((h) => h.life > 0);
      },
      draw(c) {
        drawBowl(c.bx, c.by, c.bw, true, c.bLanded);
        if (c.gift >= 0) {
          const k = clamp((c.t - c.gift) / 0.8, 0, 1);
          if (k < 1) drawCandy(ctx, c.bx + (c.jx - c.bx) * k, c.by - 10 * U + (c.jy - c.by) * k - Math.sin(k * Math.PI) * 120 * U, 14 * U, k * 12, GOLD);
        }
        const jHop = c.happy ? Math.abs(Math.sin(c.t * 6 + 1)) * 8 * U : 0;
        drawSpiderDog(c.jx, c.jy - jHop, c.jr, false, c.happy ? 6 : 1.5, !c.landed);
        if (c.landed && !c.happy) dizzy(c.jx, c.jy, c.jr);
        const kHop = c.happy ? Math.abs(Math.sin(c.t * 6)) * 8 * U : 0;
        drawKaskaToken(ctx, c.kx, c.ky - kHop, c.kr, P.costume());
        for (const h of c.hearts) { ctx.globalAlpha = Math.min(1, h.life); drawHeart(ctx, h.x, h.y, 9 * U, '#ff4b6e', null); }
        ctx.globalAlpha = 1;
      },
      overlay(c) {
        if (c.fin >= 0 && c.credits < 0) slam('FIN', c.t - c.fin, H * 0.3, 84 * U, '#ffd23f', '¡Has salvado Halloween!');
        if (c.credits >= 0) drawCredits(c.t - c.credits);
      },
      end() { finishStory(); },
    },

    /* Kaska pierde la última vida */
    ko: {
      skip: false, dur: 2.9, scene: 'battle',
      start() {
        Snd.stopMusic(0.2); Snd.hit();
        camTo(K.x, K.y - 30 * U, 1.6, 7);
        S.flash = 0.6; S.shake = 12 * U;
        vib([80, 60, 220]);
      },
      update(c, dt) {
        const sdt = dt * 0.3;
        updateItems(sdt, true); updateBones(sdt); updateJ(sdt);
        cue(c, 0.7, () => { Snd.laugh(); J.laughT = 3; jSay('¡MUAJAJAJA!', 2); });
        cue(c, 1.1, () => Snd.whineK());
        cue(c, 1.4, () => Snd.over());
      },
      overlay(c) {
        ctx.fillStyle = `rgba(15,0,25,${Math.min(0.45, c.t * 0.4)})`;
        ctx.fillRect(0, 0, W, H);
        slam('¡KASKA HA CAÍDO!', c.t - 1.0, H * 0.4, 40 * U, '#ff4b4b');
      },
      end() { showOver(); },
    },

    /* Se acaba el tiempo en Aplasta */
    timeup: {
      skip: false, dur: 1.9, scene: 'whack',
      start() { Snd.stopMusic(0.2); Snd.whistle(); vib([60, 40, 120]); },
      update(c, dt) { updateWhack(dt, true); cue(c, 0.5, () => Snd.chime({ v: 0.05, base: 784 })); },
      overlay(c) { slam('¡TIEMPO!', c.t - 0.1, H * 0.44, 58 * U, '#ffd23f'); },
      end() { showOver(); },
    },
  };

  function startCine(id, opts = {}) {
    const def = CINES[id];
    S.state = 'cine';
    S.cine = Object.assign({ id, t: 0, fired: new Set() }, opts);
    S.barsT = 1; S.barsUntil = 0;
    S.hitStop = 0; S.slowT = 0;
    hideScreens();
    $('btnPause').classList.add('hidden');
    $('btnSkip').classList.toggle('hidden', !def.skip);
    if (def.start) def.start(S.cine);
  }
  function endCine() {
    const c = S.cine;
    if (!c) return;
    S.cine = null;
    $('btnSkip').classList.add('hidden');
    S.barsT = 0; S.caption = null;
    CINES[c.id].end(c);
  }
  function skipCine() { if (S.cine && CINES[S.cine.id].skip) { Snd.whoosh({ v: 0.06 }); endCine(); } }
  function resumePlay() {
    S.state = 'playing';
    $('btnPause').classList.remove('hidden');
    camReset(4);
    if (S.mode === 'aplasta') { CAM.x = CAM.tx = W / 2; CAM.y = CAM.ty = H / 2; CAM.z = CAM.tz = 1; } // los toques deben caer justo donde se ve
    last = performance.now();
    syncMusic();
  }
  // al terminar la historia: premio y elegir si seguir en modo infinito
  function finishStory() {
    const first = !store.get('kvj_ending', false);
    store.set('kvj_ending', true);
    if (first) P.addCoins(500);
    $('winReward').classList.toggle('hidden', !first);
    S.state = 'win';
    camReset(10);
    show('win');
  }

  // música según lo que esté pasando
  function syncMusic() {
    let m = null;
    if (S.state === 'cine' || S.state === 'over') return; // la escena o el final deciden
    if (S.state === 'playing' || S.state === 'paused') {
      if (S.mode === 'aplasta') m = 'whack';
      else m = J.big ? 'boss' : J.angry ? 'fury' : 'battle';
    } else m = 'menu';
    Snd.music(m, S.mode === 'aplasta' && S.state === 'playing' && S.timeLeft <= 5 ? 1.2 : 1);
  }

  // números que suben poco a poco (pantalla final)
  function countUp(el, to, ms, onTick, onDone, delay = 0) {
    const run = S.overRun;
    const t0 = performance.now() + delay;
    let lastTick = 0;
    el.textContent = '0';
    const stepFn = (now) => {
      if (S.overRun !== run) return;
      const k = clamp((now - t0) / ms, 0, 1);
      el.textContent = fmt(to * (1 - Math.pow(1 - k, 3)));
      if (k > 0 && k < 1 && onTick && now - lastTick > 70) { lastTick = now; onTick(); }
      if (k < 1) requestAnimationFrame(stepFn); else if (onDone) onDone();
    };
    requestAnimationFrame(stepFn);
  }

  /* ---------- actualización general ---------- */
  function updateFx(dt) {
    for (const p of S.parts) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.rot += dt * 6; }
    S.parts = S.parts.filter((p) => p.life > 0);
    for (const p of S.popups) { p.y -= 55 * U * dt; p.life -= dt * 0.9; }
    S.popups = S.popups.filter((p) => p.life > 0);
    for (const p of S.paws) p.t += dt;
    S.paws = S.paws.filter((p) => p.t < 0.35);
    for (const t of K.trail) t.a -= dt * 2.5;
    K.trail = K.trail.filter((t) => t.a > 0);
    if (S.banner) { S.banner.t += dt; if (S.banner.t > S.banner.dur) S.banner = null; }
    if (S.jBub) { S.jBub.t -= dt; if (S.jBub.t <= 0) S.jBub = null; }
    if (S.kBub) { S.kBub.t -= dt; if (S.kBub.t <= 0) S.kBub = null; }
    S.shake *= Math.exp(-dt * 9);
    S.flash = Math.max(0, S.flash - dt);
    S.scorePulse = Math.max(0, S.scorePulse - dt * 5);
    K.squash = Math.max(0, K.squash - dt * 5);
    K.readyFlash = Math.max(0, K.readyFlash - dt);
    K.tilt += (clamp(K.vx / (900 * U), -0.35, 0.35) - K.tilt) * (1 - Math.exp(-dt * 10));
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
    updateToasts(dt);
    updateBarkBtn();
    updateCam(dt);
    S.bars += (S.barsT - S.bars) * (1 - Math.exp(-dt * 7));
    if (S.barsUntil && S.clock >= S.barsUntil) { S.barsT = 0; S.barsUntil = 0; }
    S.wflash = Math.max(0, S.wflash - dt * 1.6);
    S.koT = Math.max(0, S.koT - dt);
    S.hbPulse = Math.max(0, S.hbPulse - dt * 2.2);
    S.musicT -= dt;
    if (S.musicT <= 0) { S.musicT = 0.3; syncMusic(); }
    if (S.state === 'over' && S.overMusicT > 0) { S.overMusicT -= dt; if (S.overMusicT <= 0) Snd.music('menu'); }
    if (S.state === 'paused') return;
    if (S.state === 'cine') {
      const c = S.cine;
      c.t += dt;
      CINES[c.id].update(c, dt);
      if (S.cine === c && c.t >= CINES[c.id].dur) endCine();
      updateFx(dt);
      return;
    }
    // tiempo de juego: parón de impacto y cámara lenta
    let g = dt;
    if (S.hitStop > 0) { S.hitStop -= dt; g = 0; }
    else if (S.slowT > 0) { S.slowT -= dt; g = dt * S.slowF; if (S.slowT <= 0) camReset(3); }
    if (S.state === 'playing') {
      if (S.mode === 'aplasta') updateWhack(g, false); else updateBattle(g, false);
      if (S.endingT > 0) { S.endingT -= dt; if (S.endingT <= 0) startCine('ending'); }
    } else {
      // menú / fin de partida: Kaska pasea solo
      K.tx = W / 2 + Math.sin(S.clock * 0.7) * W * 0.28;
      const px = K.x;
      K.x += (K.tx - K.x) * (1 - Math.exp(-dt * 4));
      K.vx = (K.x - px) / Math.max(dt, 1e-4);
    }
    updateJ(g);
    updateFx(g);
  }

  /* ---------- render ---------- */
  function sceneKind() {
    if (S.state === 'cine') { const sc = CINES[S.cine.id].scene; if (sc !== 'auto') return sc; }
    return S.mode === 'aplasta' && S.state !== 'menu' ? 'whack' : 'battle';
  }

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#08030d'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (S.shake > 0.5) ctx.translate(rand(-1, 1) * S.shake, rand(-1, 1) * S.shake);
    applyCam();
    ctx.drawImage(bg, 0, 0, W, H);

    ctx.fillStyle = '#fff';
    for (const s of S.stars) {
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(S.clock * 2 + s.p);
      ctx.fillRect(s.x * W, s.y * H, s.s * U, s.s * U);
    }
    ctx.globalAlpha = 1;
    for (const b of S.bats) drawBat(b.x, b.y + Math.sin(b.bob) * 10 * U, b.s, b.ph);

    const inGame = S.state !== 'menu';
    const scene = sceneKind();
    if (scene === 'custom') CINES[S.cine.id].draw(S.cine);
    else if (scene === 'whack') drawWhack();
    else {
      if (inGame) drawDiveWarning();
      drawJoselito();
      for (const it of S.items) drawItem(ctx, it, S.clock);
      for (const b of S.bones) {
        ctx.globalAlpha = 0.25; drawBoneProj(ctx, b.x, b.y + 26 * U, 9 * U, b.rot - 0.6);
        ctx.globalAlpha = 0.5; drawBoneProj(ctx, b.x, b.y + 13 * U, 10 * U, b.rot - 0.3);
        ctx.globalAlpha = 1; drawBoneProj(ctx, b.x, b.y, 11 * U, b.rot);
      }
      drawKaska();
      if (S.barkWave) drawBarkWave();
    }
    if (S.koT > 0) {
      const k = 1 - S.koT / 1.4;
      comicBurst(S.koX, S.koY, 70 * U * (k < 0.15 ? k / 0.15 : 1), '¡K.O.!', Math.min(1, S.koT / 0.3));
    }

    for (const p of S.parts) {
      ctx.globalAlpha = clamp((p.life / p.max) * 1.6, 0, 1);
      ctx.fillStyle = p.color;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    for (const p of S.popups) {
      ctx.globalAlpha = clamp(p.life * 1.8, 0, 1);
      const sc = 1 + Math.max(0, p.life - 0.8) * 2;
      ctx.font = `${p.size * sc}px ${FT}`;
      const half = ctx.measureText(p.text).width / 2 + 6;
      txt(p.text, half * 2 < W ? clamp(p.x, half, W - half) : W / 2, p.y, p.size * sc, p.color);
    }
    ctx.globalAlpha = 1;

    const jb = S.jBub, kb = S.kBub;
    if (jb && inGame) {
      if (jb.x == null) { if (J.y > -J.r) drawBubble(jb.text, J.x, J.y + J.r + 40 * U, clamp(jb.t * 4, 0, 1), -1); }
      else drawBubble(jb.text, jb.x, jb.y, clamp(jb.t * 4, 0, 1), 1);
    }
    if (kb && inGame) drawBubble(kb.text, kb.x == null ? K.x : kb.x, kb.y == null ? K.y - K.r - 34 * U : kb.y, clamp(kb.t * 4, 0, 1), 1);
    ctx.restore();

    const live = S.state === 'playing' || S.state === 'paused';
    if (S.mode === 'batalla' && J.angry && J.defeatT <= 0 && live) {
      const a = 0.13 + 0.06 * Math.sin(S.clock * 8);
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(255,20,30,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (S.hbPulse > 0) { // latido con la última vida
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(200,0,20,${0.45 * S.hbPulse})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (S.flash > 0) { ctx.fillStyle = `rgba(255,30,40,${S.flash * 0.55})`; ctx.fillRect(0, 0, W, H); }
    if (S.wflash > 0) { ctx.fillStyle = `rgba(255,255,255,${S.wflash})`; ctx.fillRect(0, 0, W, H); }

    if (live) drawHUD();
    if (S.state === 'cine' && CINES[S.cine.id].overlay) CINES[S.cine.id].overlay(S.cine);
    if (S.banner && S.state !== 'paused') drawBanner();
    drawBars();
  }

  function drawDiveWarning() {
    const d = J.dive;
    if (!d || d.phase !== 'warn') return;
    const w = J.r * 2.3, top = J.baseY + J.r, h = S.groundY - top;
    ctx.fillStyle = `rgba(255,40,40,${0.14 + 0.1 * Math.sin(S.clock * 22)})`;
    ctx.fillRect(d.x - w / 2, top, w, h);
    ctx.save();
    ctx.setLineDash([10 * U, 8 * U]); ctx.strokeStyle = 'rgba(255,90,90,.8)'; ctx.lineWidth = 2;
    ctx.strokeRect(d.x - w / 2, top, w, h);
    ctx.restore();
    txt('¡CUIDADO!', clamp(d.x, 60 * U, W - 60 * U), top + h * 0.5, 22 * U, '#ff4b4b');
  }

  function drawJoselito() {
    const inGame = S.state !== 'menu';
    if (J.y < -J.r * 2.5) return;
    if (inGame && S.betweenT > 0 && J.defeatT <= 0) return;
    const diving = J.dive && J.dive.phase !== 'up';
    const angry = inGame && (J.angry || J.laughT > 0 || J.defeatT > 0 || diving);
    const warn = inGame && J.atk && J.atk.t < J.atk.warn;
    let x = J.x, y = J.y;
    if (warn || (inGame && J.angry && J.stunT <= 0)) { x += rand(-1.5, 1.5) * U; y += rand(-1.5, 1.5) * U; }
    if (J.throwT > 0) y += Math.sin((J.throwT / 0.18) * Math.PI) * 8 * U;
    y -= J.kick; // retrocede al recibir un hueso
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, -H); ctx.lineTo(x, y - J.r); ctx.stroke();
    const legSpeed = J.stunT > 0 ? 1.5 : angry ? 16 : 4;
    spiderLegs(ctx, x, y, J.r, S.clock, legSpeed, 0.55, 1.45, 2.05, '#0b080d', Math.max(4, J.r * 0.21), true);
    if (inGame && (J.angry || J.big) && J.defeatT <= 0) glow(ctx, x, y, J.r, J.r * 1.9, J.big ? '255,60,200' : '255,40,40', 0.6);
    ctx.save();
    ctx.translate(x, y);
    if (J.defeatT > 0) ctx.rotate(J.spin);
    const s = J.throwT > 0 ? 1.06 : 1;
    token(ctx, angry && J.stunT <= 0 ? IMG.jf : IMG.j, 0, 0, J.r * s, angry ? '#ff3b3b' : J.big ? '#b07cff' : '#120a18');
    if (J.hitT > 0) { ctx.fillStyle = `rgba(255,255,255,${(J.hitT / 0.12) * 0.6})`; ctx.beginPath(); ctx.arc(0, 0, J.r * s, 0, TAU); ctx.fill(); }
    if (J.big) drawCrown(ctx, 0, -J.r * 0.12, J.r * s); // corona del Rey de las Arañas
    ctx.restore();
    if (J.stunT > 0) {
      ctx.fillStyle = '#ffd23f';
      for (let i = 0; i < 4; i++) {
        const a = S.clock * 6 + (i * TAU) / 4;
        star4(ctx, x + Math.cos(a) * J.r * 1.05, y - J.r * 1.1 + Math.sin(a) * J.r * 0.25, J.r * 0.2);
      }
    }
    if (warn) txt('!', x + J.r * 1.15, y - J.r * 0.9, 36 * U * (1 + 0.15 * Math.sin(S.clock * 20)), '#ff3b3b');
  }

  function drawKaska() {
    const x = K.x;
    const moving = Math.min(1, Math.abs(K.vx) / (300 * U));
    const hop = S.webT > 0 ? 0 : Math.abs(Math.sin(S.clock * 14)) * 5 * U * moving;
    const y = K.y - hop;
    let rot = K.tilt;
    if (S.state === 'over') rot = K.tilt + Math.sin(S.clock * 3) * 0.1;
    if (S.cine && S.cine.id === 'ko') rot = K.tilt + Math.min(1, S.cine.t * 2.5) * 1.5; // Kaska cae rendido
    const costume = P.costume();

    for (const t of K.trail) {
      ctx.globalAlpha = t.a;
      token(ctx, IMG.k, t.x, t.y, K.r, '#7fd7ff');
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath(); ctx.ellipse(x, S.groundY + 2 * U, K.r * 0.85, K.r * 0.2, 0, 0, TAU); ctx.fill();

    if (S.shieldT > 0) {
      const blink = S.shieldT < 1.5 && Math.floor(S.shieldT * 8) % 2 === 0;
      if (!blink) {
        glow(ctx, x, y, K.r * 0.9, K.r * 1.7, '255,140,40', 0.6);
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
    drawKaskaToken(ctx, 0, 0, K.r, costume, K.immT > 0 ? '#7fd7ff' : null);
    if (S.webT > 0) { const h = HALOS; HALOS = false; ctx.globalAlpha = Math.min(1, S.webT * 2) * 0.5; drawWeb(ctx, 0, 0, K.r * 1.08, 0); HALOS = h; }
    ctx.restore();

    if (S.state === 'playing' && S.mode === 'batalla') {
      if (K.dashCD > 0) {
        const f = 1 - K.dashCD / P.val('dash');
        ctx.strokeStyle = 'rgba(127,215,255,.7)'; ctx.lineWidth = 3 * U; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(x, y, K.r * 1.16, -Math.PI / 2, -Math.PI / 2 + f * TAU); ctx.stroke();
      }
      if (K.readyFlash > 0) {
        ctx.strokeStyle = `rgba(127,215,255,${K.readyFlash / 0.35})`; ctx.lineWidth = 4 * U;
        ctx.beginPath(); ctx.arc(x, y, K.r * (1.15 + (0.35 - K.readyFlash)), 0, TAU); ctx.stroke();
      }
    }
  }

  function drawBarkWave() {
    const k = S.barkWave.t / 0.6;
    const r = k * Math.hypot(W, H);
    ctx.lineWidth = 16 * U * (1 - k) + 2;
    ctx.strokeStyle = `rgba(255,210,63,${1 - k})`;
    ctx.beginPath(); ctx.arc(K.x, K.y, r, 0, TAU); ctx.stroke();
    ctx.lineWidth = 8 * U * (1 - k) + 1;
    ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.8})`;
    ctx.beginPath(); ctx.arc(K.x, K.y, r * 0.7, 0, TAU); ctx.stroke();
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

    if (S.combo > 0) {
      const bw = 84 * U, bh = 8 * U, bx = pad, by = 68 * U;
      const step = S.mode === 'aplasta' ? WHACK_STEP : COMBO_STEP;
      const prog = S.mult >= MAX_MULT ? 1 : (S.combo % step) / step;
      ctx.fillStyle = 'rgba(0,0,0,.45)'; roundRectPath(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = S.mult >= MAX_MULT ? '#ff4f9a' : '#ff9b3d';
      if (prog > 0) { roundRectPath(ctx, bx, by, Math.max(bh, bw * prog), bh, bh / 2); ctx.fill(); }
      txt(`x${S.mult}`, bx + bw + 8 * U, by + bh / 2 + 1, 18 * U, S.mult > 1 ? '#ff9b3d' : '#fff', 'left', FT, '#1a0726', 3.5 * U);
    }

    if (S.mode === 'aplasta') { drawTimer(); return; }

    const slots = Math.max(P.val('vidas'), S.lives);
    for (let i = 0; i < slots; i++) {
      const hx = W - 70 - (slots - 1 - i) * 24 * U, hy = 30 * U;
      if (i < S.lives) drawHeart(ctx, hx, hy, 9.5 * U, '#ff4b6e', '#1a0726');
      else drawHeart(ctx, hx, hy, 9.5 * U, 'rgba(0,0,0,.35)', 'rgba(255,255,255,.35)');
    }
    if (S.shieldT > 0) {
      const bw = 70 * U, bh = 7 * U, bx = W - 62 - bw, by = 54 * U;
      const h = HALOS; HALOS = false; drawPumpkin(ctx, bx - 12 * U, by + bh / 2, 9 * U, 0, S.clock); HALOS = h;
      ctx.fillStyle = 'rgba(0,0,0,.45)'; roundRectPath(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = '#ff8a2a'; roundRectPath(ctx, bx, by, Math.max(bh, (bw * S.shieldT) / P.val('escudo')), bh, bh / 2); ctx.fill();
    }
    drawBossBar();
  }

  function drawBossBar() {
    if (S.betweenT > 0 && J.defeatT <= 0) return;
    const pad = 16 * U, y = 96 * U, h = 11 * U, w = W - pad * 2;
    const label = J.big ? 'REY JOSELITO · JEFE FINAL' : J.angry ? `JOSELITO FURIOSO · NIVEL ${S.level}` : `JOSELITO · NIVEL ${S.level}`;
    txt(label, W / 2, y - 10 * U, 13 * U, J.angry || J.big ? '#ff6b6b' : '#fff', 'center', FT, '#1a0726', 3 * U);
    ctx.fillStyle = 'rgba(0,0,0,.55)'; roundRectPath(ctx, pad, y, w, h, h / 2); ctx.fill();
    const hp = clamp(J.hp / J.maxHp, 0, 1), lag = clamp(J.hpLag / J.maxHp, 0, 1);
    if (lag > hp + 0.002) { ctx.fillStyle = '#ffd23f'; roundRectPath(ctx, pad, y, Math.max(h, w * lag), h, h / 2); ctx.fill(); }
    const fw = w * Math.min(hp, lag);
    if (fw > 0.5) {
      const g = ctx.createLinearGradient(pad, 0, pad + w, 0);
      g.addColorStop(0, '#ff2d55'); g.addColorStop(1, '#ff7b1c');
      ctx.fillStyle = J.hitT > 0 ? '#fff' : g;
      roundRectPath(ctx, pad, y, Math.max(h, fw), h, h / 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(pad + w / 2 - 1, y, 2, h);
  }

  function drawAmmo() {
    const x = 14 * U, y = H - 28 * U;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; roundRectPath(ctx, x, y - 17 * U, 108 * U, 34 * U, 17 * U); ctx.fill();
    drawBoneProj(ctx, x + 22 * U, y, 13 * U, -0.5);
    const empty = S.ammo <= 0;
    const col = empty ? (Math.floor(S.clock * 4) % 2 ? '#ff4b4b' : '#fff') : S.ammo >= S.maxAmmo ? '#9be15d' : '#fff';
    txt(`${S.ammo}/${S.maxAmmo}`, x + 42 * U, y + 1, 19 * U, col, 'left', FT, '#1a0726', 3.5 * U);
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
    if (!(window.kvj && window.kvj.frozen)) update(dt); // (modo prueba: congelar)
    render();
    requestAnimationFrame(frame);
  }

  /* ---------- pantallas ---------- */
  const screens = ['menu', 'help', 'shop', 'missions', 'rank', 'pause', 'over', 'win'];
  function show(id) { for (const s of screens) $(s).classList.toggle('hidden', s !== id); }
  function hideScreens() { show(null); }

  function rankTitle(score, mode = S.mode) {
    const list = mode === 'aplasta' ? W_RANKS : RANKS;
    let t = list[0][1];
    for (const [min, name] of list) if (score >= min) t = name;
    return t;
  }
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
      if (e.lvl) { const sm = document.createElement('small'); sm.textContent = ` · nivel ${e.lvl}${e.win ? ' 👑' : ''}`; nm.appendChild(sm); }
      const sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = fmt(e.score);
      li.append(pos, nm, sc);
      el.appendChild(li);
    });
  }

  function resetJ() {
    Object.assign(J, { hp: 1, maxHp: 1, hpLag: 1, hitT: 0, stunT: 0, atk: null, dive: null, enterT: 0, defeatT: 0, spin: 0, angry: false, laughT: 0, kick: 0, big: false });
    J.r = 42 * U;
    J.baseY = 132 * U + J.r;
    J.y = J.baseY;
  }

  function showMenu() {
    S.state = 'menu'; S.cine = null; S.overRun++;
    S.items = []; S.bones = []; S.banner = null; S.jBub = null; S.kBub = null; S.shieldT = 0; S.webT = 0; S.barkWave = null;
    S.barsT = 0; S.caption = null; S.koT = 0; S.slowT = 0; S.hitStop = 0;
    $('btnSkip').classList.add('hidden');
    for (const h of holes) h.o = null;
    resetJ();
    camReset(5);
    $('bestBattle').textContent = fmt(bestScore('batalla'));
    $('bestWhack').textContent = fmt(bestScore('aplasta'));
    $('menuCoins').textContent = fmt(P.coins());
    $('btnPause').classList.add('hidden');
    show('menu');
    syncMusic();
  }

  function startGame(mode = S.mode) {
    Snd.init();
    S.mode = mode === 'aplasta' ? 'aplasta' : 'batalla';
    store.set('kvj_lastmode', S.mode);
    S.overRun++;
    Object.assign(S, {
      state: 'playing', t: 0, score: 0, lives: P.val('vidas'), combo: 0, maxCombo: 0, mult: 1, caught: 0,
      items: [], bones: [], popups: [], paws: [], spawnT: 1.1, shieldT: 0, invT: 0, shake: 0, flash: 0, scorePulse: 0,
      level: 1, levelT: 0, betweenT: 0, defeats: 0, hitsTaken: 0, maxAmmo: P.val('mochila'), webT: 0, boneCD: 0, emptyT: 0,
      bark: 0, barkWave: null, barks: 0, spidersShot: 0, golds: 0, nextTaunt: 6, hints: [], barkHinted: false,
      jBub: null, kBub: null, banner: null, myId: null, doneMissions: [],
      whackTime: P.val('reloj'), taps: 0, hits: 0, whacked: 0, wgolds: 0, lastCall: false,
      koT: 0, slowT: 0, hitStop: 0, hbT: 0, hbPulse: 0, endingT: 0, endless: false, victory: false, overMusicT: 0,
    });
    S.ammo = Math.min(S.maxAmmo, 6);
    S.timeLeft = S.whackTime;
    toastQ.length = 0; mtoastT = 0; $('mtoast').classList.add('hidden');
    for (const h of holes) h.o = null;
    Object.assign(K, { dashT: 0, dashCD: 0, immT: 0, trail: [], readyFlash: 0, vx: 0 });
    K.x = K.tx = W / 2;
    resetJ();
    camReset(6);
    if (S.mode === 'aplasta') {
      S.spawnT = 0.9;
      startCine('ready');
      return;
    }
    if (store.get('kvj_battles', 0) < 2) {
      S.hints = [{ t: 3.2, text: '¡Pulsa el hueso de la izquierda!' }, { t: 9, text: '¡Coge caramelos para tener más huesos!' }, { t: 16, text: '¡Desliza rápido para esquivar!' }];
    }
    // la primera vez se ve la historia; después, directos al "¿listo?"
    if (!store.get('kvj_intro', false)) { startCine('intro', { after: 'play' }); return; }
    startLevel(1);
    startCine('ready');
  }

  function setStats(stats) {
    stats.forEach(([value, label], i) => { $(`st${i + 1}`).textContent = value; $(`st${i + 1}l`).textContent = label; });
  }

  function showOver() {
    S.state = 'over'; S.cine = null;
    S.overRun++;
    S.barsT = 0; S.caption = null; S.koT = 0;
    $('btnSkip').classList.add('hidden');
    $('btnPause').classList.add('hidden');
    camReset(4);
    const whack = S.mode === 'aplasta';
    if (whack) missionsDone(P.peak('whackScore', S.score));
    else { missionsDone(P.peak('score', S.score)); missionsDone(P.peak('level', S.level)); }
    missionsDone(P.peak('combo', S.maxCombo));
    const coins = whack
      ? Math.round(S.whacked * 0.6) + S.wgolds * 3
      : Math.round(S.caught * 0.5) + 25 * S.defeats + S.golds * 2 + Math.floor(S.score / 500);
    P.addCoins(coins);
    if (!whack) store.set('kvj_battles', store.get('kvj_battles', 0) + 1);
    store.set('kvj_games', store.get('kvj_games', 0) + 1);

    const ranking = getRanking();
    const prevBest = ranking.length ? ranking[0].score : 0;
    const isRecord = S.score > 0 && S.score > prevBest;
    const qualifies = S.score > 0 && (ranking.length < 10 || S.score > ranking[ranking.length - 1].score);
    S.myId = null;
    if (qualifies) {
      const entry = { id: Math.random().toString(36).slice(2, 10), name: store.get('kvj_name', '') || 'Anónimo', score: S.score, date: Date.now() };
      if (!whack) { entry.lvl = S.level; if (S.victory || S.endless) entry.win = true; }
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
      $('overTitle').textContent = S.victory ? '¡HAS SALVADO HALLOWEEN!' : isRecord ? '¡Joselito está furioso!' : S.defeats > 0 ? `¡Has llegado al nivel ${S.level}!` : pick(OVER_TITLES);
      setStats([[S.level, 'nivel'], [S.caught, 'caramelos'], [S.maxCombo, 'combo máx.']]);
    }
    $('overFace').src = S.victory ? 'img/kaska.png' : 'img/joselito-furioso.png';
    $('overFace').classList.toggle('win', !!S.victory);
    $('overRank').textContent = rankTitle(S.score);
    $('overCoinsTotal').textContent = `(tienes ${fmt(P.coins())})`;
    const ul = $('overMissions');
    ul.innerHTML = '';
    for (const m of S.doneMissions) { const li = document.createElement('li'); li.textContent = `✅ ${m.text} · +${m.reward} 💰`; ul.appendChild(li); }
    ul.classList.toggle('hidden', !S.doneMissions.length);
    toastQ.length = 0; mtoastT = 0; $('mtoast').classList.add('hidden');
    $('newRecord').classList.add('hidden');
    $('nameBox').classList.toggle('hidden', !qualifies);
    $('nameInput').value = store.get('kvj_name', '');
    renderRanking($('overList'), 3);
    show('over');
    // los números suben poco a poco y al final, si hay récord, sale el sello
    Snd.stopMusic(0.3);
    S.overMusicT = 3;
    countUp($('overScore'), S.score, 1200, () => Snd.countTick(), () => {
      if (isRecord || S.victory) {
        const nr = $('newRecord');
        nr.textContent = isRecord ? '🏆 ¡NUEVO RÉCORD! 🏆' : '👑 ¡HISTORIA COMPLETADA! 👑';
        nr.classList.remove('hidden');
        Snd.stamp(); Snd.record(); confetti(); vib([30, 30, 60]);
      } else Snd.chime({ v: 0.05, base: 1046 });
    }, 300);
    countUp($('overCoins'), coins, 700, null, () => { if (coins > 0) Snd.coin(); }, 1500);
  }

  function pause() {
    if (S.state !== 'playing') return;
    S.state = 'paused';
    $('btnPause').classList.add('hidden');
    P.save();
    Snd.duck(true);
    show('pause');
  }
  function resume() {
    if (S.state !== 'paused') return;
    S.state = 'playing';
    hideScreens();
    $('btnPause').classList.remove('hidden');
    Snd.duck(false);
    last = performance.now();
  }

  let toastTimer = 0;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
  }

  async function share() {
    const url = location.href.split('#')[0].split('?')[0];
    const text = S.mode === 'aplasta'
      ? `🎃 He hecho ${fmt(S.score)} puntos en "Aplasta a Joselito" y soy ${rankTitle(S.score)}. ¿Me superas?`
      : `🎃 He llegado al nivel ${S.level} con ${fmt(S.score)} puntos en "Kaska contraataca" y soy ${rankTitle(S.score)}. ¿Me superas?`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Kaska vs Joselito', text, url }); } catch (e) { /* cancelado */ }
      return;
    }
    try { await navigator.clipboard.writeText(`${text} ${url}`); toast('¡Copiado! Pégalo donde quieras'); }
    catch (e) { toast('No se pudo copiar el enlace'); }
  }

  function updateSoundBtn() {
    $('btnSound').textContent = Snd.on ? '🔊' : '🔇';
    $('btnMusic').classList.toggle('off', !Snd.musicOn);
  }

  // botones de la izquierda: disparar (con los huesos que quedan) y súper ladrido.
  // Solo se toca el DOM cuando algo cambia.
  let barkVis = null, barkP = -1, barkRdy = null, ammoShown = '', ammoCls = '';
  function updateBarkBtn() {
    const btn = $('btnBark'), fire = $('btnFire');
    const vis = S.mode === 'batalla' && S.state === 'playing';
    if (vis !== barkVis) { barkVis = vis; btn.classList.toggle('hidden', !vis); fire.classList.toggle('hidden', !vis); }
    if (!vis) { S.fireHeld = false; return; }
    const p = Math.round(S.bark * 50) / 50;
    if (p !== barkP) { barkP = p; btn.style.setProperty('--p', p); }
    const rdy = S.bark >= 1;
    if (rdy !== barkRdy) { barkRdy = rdy; btn.classList.toggle('ready', rdy); }
    const txtAmmo = `${S.ammo}/${S.maxAmmo}`;
    if (txtAmmo !== ammoShown) { ammoShown = txtAmmo; $('ammoTxt').textContent = txtAmmo; }
    const cls = S.ammo <= 0 ? 'empty' : S.ammo >= S.maxAmmo ? 'full' : '';
    if (cls !== ammoCls) { fire.classList.remove('empty', 'full'); if (cls) fire.classList.add(cls); ammoCls = cls; }
  }

  /* ---------- tienda y misiones ---------- */
  function renderShop() {
    $('shopCoins').textContent = fmt(P.coins());
    const ul = $('upList');
    ul.innerHTML = '';
    for (const u of P.UPGRADES) {
      const lv = P.upLevel(u.id), max = u.prices.length, isMax = lv >= max;
      const li = document.createElement('li');
      li.innerHTML = `<span class="ic"></span><div class="info"><b></b><span class="d"></span><span class="next"></span><div class="pips">${'<i></i>'.repeat(max)}</div></div><button class="buy"></button>`;
      li.querySelector('.ic').textContent = u.icon;
      li.querySelector('b').textContent = u.name;
      li.querySelector('.d').textContent = u.desc;
      li.querySelector('.next').textContent = isMax ? `${u.show(u.values[lv])} · ¡al máximo!` : `${u.show(u.values[lv])} → ${u.show(u.values[lv + 1])}`;
      li.querySelectorAll('.pips i').forEach((p, i) => p.classList.toggle('on', i < lv));
      const b = li.querySelector('.buy');
      if (isMax) { b.textContent = 'MÁX'; b.disabled = true; b.classList.add('max'); }
      else {
        const price = u.prices[lv];
        b.textContent = `💰 ${fmt(price)}`;
        b.disabled = P.coins() < price;
        b.addEventListener('click', () => {
          if (!P.buyUpgrade(u.id)) return;
          Snd.init(); Snd.purchase(); vib(20);
          toast(`¡${u.name} mejorado!`);
          renderShop();
        });
      }
      ul.appendChild(li);
    }
    const grid = $('costumeGrid');
    grid.innerHTML = '';
    for (const c of P.COSTUMES) {
      const owned = P.owned(c.id), on = P.costume() === c.id;
      const div = document.createElement('div');
      div.className = 'costume' + (on ? ' on' : '');
      const cv = document.createElement('canvas');
      const d = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = 96 * d; cv.height = 96 * d;
      const cc = cv.getContext('2d');
      cc.setTransform(d, 0, 0, d, 0, 0);
      const h = HALOS; HALOS = false;
      drawKaskaToken(cc, 48, 60, 30, c.id);
      HALOS = h;
      const name = document.createElement('b'); name.textContent = c.name;
      const b = document.createElement('button'); b.className = 'buy';
      if (on) { b.textContent = 'Puesto ✓'; b.classList.add('equipped'); }
      else if (owned) b.textContent = 'Ponérselo';
      else { b.textContent = `💰 ${fmt(c.price)}`; b.disabled = P.coins() < c.price; }
      b.addEventListener('click', () => {
        if (on || !P.useCostume(c.id)) return;
        Snd.init(); Snd.purchase();
        if (!owned) toast(`¡Disfraz de ${c.name} comprado!`);
        renderShop();
      });
      div.append(cv, name, b);
      grid.appendChild(div);
    }
  }

  function renderMissions() {
    const ul = $('missionList');
    ul.innerHTML = '';
    for (const m of P.missions()) {
      const li = document.createElement('li');
      li.innerHTML = '<div class="top"><span class="tx"></span><span class="rw"></span></div><div class="bar"><i></i></div><div class="num"></div>';
      li.querySelector('.tx').textContent = m.text;
      li.querySelector('.rw').textContent = `💰 ${m.reward}`;
      li.querySelector('.bar i').style.width = `${Math.round((m.progress / m.target) * 100)}%`;
      li.querySelector('.num').textContent = `${fmt(m.progress)} / ${fmt(m.target)}`;
      ul.appendChild(li);
    }
  }

  function drawIcons() {
    HALOS = false;
    document.querySelectorAll('canvas[data-icon]').forEach((cv) => {
      const d = Math.min(window.devicePixelRatio || 1, 2), s = 44;
      cv.width = s * d; cv.height = s * d;
      const c = cv.getContext('2d');
      c.setTransform(d, 0, 0, d, 0, 0);
      const type = cv.dataset.icon;
      const r = type === 'pumpkin' ? 14 : type === 'spider' ? 11 : type === 'bomb' ? 11 : 13;
      drawItem(c, { type, x: s / 2 - (type === 'bomb' ? 3 : 0), y: s / 2 + (type === 'pumpkin' ? 3 : 0), r, rot: type === 'life' ? -0.5 : -0.3, col: CANDY_COLS[0], seed: 0 }, 0.6);
    });
    HALOS = true;
  }

  /* ---------- controles ---------- */
  const keys = { left: false, right: false };
  const touches = new Map(); // dedos en pantalla: { x0, t0, moved, lastX, hist }
  let dragId = null;

  canvas.addEventListener('pointerdown', (e) => {
    if (S.state !== 'playing') return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (S.mode === 'aplasta') { whackTap(x, y); return; }
    if (e.pointerType === 'mouse') { K.tx = clamp(x, K.r, W - K.r); throwBone(); return; }
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
    const now = performance.now();
    if (dragId !== null && touches.has(dragId)) {
      // segundo dedo mientras el primero arrastra: lanza al momento
      throwBone();
      touches.set(e.pointerId, { x0: e.clientX, t0: now, moved: true, lastX: e.clientX, hist: [], second: true });
      return;
    }
    dragId = e.pointerId;
    touches.set(e.pointerId, { x0: e.clientX, t0: now, moved: false, lastX: e.clientX, hist: [{ x: e.clientX, t: now }], second: false });
  });
  canvas.addEventListener('pointermove', (e) => {
    if (S.state !== 'playing' || S.mode === 'aplasta') return;
    if (e.pointerType === 'mouse') { K.tx = clamp(e.clientX - canvasLeft, K.r, W - K.r); return; }
    const tp = touches.get(e.pointerId);
    if (!tp || e.pointerId !== dragId) return;
    const now = performance.now();
    const dx = e.clientX - tp.lastX;
    tp.lastX = e.clientX;
    if (Math.abs(e.clientX - tp.x0) > 10) tp.moved = true;
    K.tx = clamp(K.tx + dx * 1.6, K.r, W - K.r);
    // deslizamiento rápido = dash
    tp.hist.push({ x: e.clientX, t: now });
    while (tp.hist.length > 1 && now - tp.hist[0].t > 90) tp.hist.shift();
    const h0 = tp.hist[0];
    const span = e.clientX - h0.x, v = span / Math.max(1, now - h0.t);
    if (Math.abs(v) > 1.6 && Math.abs(span) > 28 && dash(Math.sign(v))) tp.hist = [{ x: e.clientX, t: now }];
  });
  const endTouch = (e) => {
    const tp = touches.get(e.pointerId);
    touches.delete(e.pointerId);
    if (e.pointerId === dragId) dragId = null;
    if (!tp || S.state !== 'playing' || S.mode !== 'batalla') return;
    if (e.type === 'pointerup' && !tp.moved && !tp.second && performance.now() - tp.t0 < 350) throwBone();
  };
  canvas.addEventListener('pointerup', endTouch);
  canvas.addEventListener('pointercancel', endTouch);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  $('btnBark').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); doBark(); });
  // disparar: un hueso al pulsar y, si se mantiene, ráfaga
  const fireBtn = $('btnFire');
  fireBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    try { fireBtn.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
    S.fireHeld = true; S.fireT = 0.3;
    fireBtn.classList.add('down');
    throwBone();
  });
  const fireUp = () => { S.fireHeld = false; fireBtn.classList.remove('down'); };
  fireBtn.addEventListener('pointerup', fireUp);
  fireBtn.addEventListener('pointercancel', fireUp);
  fireBtn.addEventListener('lostpointercapture', fireUp);
  fireBtn.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = true; K.lastDir = -1; }
    if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = true; K.lastDir = 1; }
    if (S.state === 'cine' && (k === 'Escape' || k === 'Enter' || k === ' ')) { e.preventDefault(); skipCine(); return; }
    if (k === 'Escape' || k === 'p' || k === 'P') { if (S.state === 'playing') pause(); else if (S.state === 'paused') resume(); }
    if (S.state === 'playing' && S.mode === 'batalla') {
      if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); throwBone(); }
      if (k === 'Shift') dash(K.lastDir);
      if (k === 'b' || k === 'B') doBark();
    } else if ((k === ' ' || k === 'Enter') && (S.state === 'menu' || S.state === 'over')) { e.preventDefault(); startGame(S.mode); }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); P.save(); Snd.stopMusic(0.05); } });
  window.addEventListener('blur', () => { keys.left = keys.right = false; });
  window.addEventListener('resize', resize);

  // pestañas de modo (ayuda, ranking, tienda)
  function selectTab(group, mode) {
    document.querySelectorAll(`[data-tabs="${group}"] button`).forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    document.querySelectorAll(`[data-pane="${group}"]`).forEach((p) => p.classList.toggle('hidden', p.dataset.mode !== mode));
    if (group === 'rank') renderRanking($('rankList'), 10, mode);
  }
  document.querySelectorAll('[data-tabs] button').forEach((b) => {
    b.addEventListener('click', () => selectTab(b.parentElement.dataset.tabs, b.dataset.mode));
  });

  const openShop = () => { Snd.init(); renderShop(); show('shop'); };
  $('playBattle').addEventListener('click', () => startGame('batalla'));
  $('playWhack').addEventListener('click', () => startGame('aplasta'));
  $('btnAgain').addEventListener('click', () => startGame(S.mode));
  $('btnMenu').addEventListener('click', showMenu);
  $('btnShop').addEventListener('click', openShop);
  $('btnShop2').addEventListener('click', openShop);
  $('btnCoins').addEventListener('click', openShop);
  $('btnMissions').addEventListener('click', () => { renderMissions(); show('missions'); });
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
    Snd.init(); Snd.setSfx(!Snd.on); updateSoundBtn();
    if (Snd.on) Snd.barkK2({ v: 0.15 });
  });
  $('btnMusic').addEventListener('click', () => { Snd.init(); Snd.setMusic(!Snd.musicOn); updateSoundBtn(); syncMusic(); });
  $('btnSkip').addEventListener('click', skipCine);
  $('btnStory').addEventListener('click', () => { Snd.init(); startCine('intro', { after: 'menu' }); });
  $('btnEndless').addEventListener('click', () => {
    // seguir después del final: modo infinito desde el nivel 7
    hideScreens();
    S.endless = true;
    S.state = 'playing';
    startLevel(FINAL_LEVEL + 1);
    resumePlay();
  });
  $('btnFinish').addEventListener('click', () => { S.victory = true; showOver(); });

  // el audio del móvil solo arranca tras tocar la pantalla; y cada botón hace "clic"
  document.addEventListener('pointerdown', () => { Snd.init(); if (!Snd.musicName()) syncMusic(); }, true);
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('button'); if (b && b.id !== 'btnBark' && b.id !== 'btnFire') Snd.click(); }, true);
  $('nameInput').addEventListener('input', (e) => {
    const name = e.target.value.trim().slice(0, 12);
    store.set('kvj_name', name);
    if (!S.myId) return;
    const r = getRanking();
    const me = r.find((x) => x.id === S.myId);
    if (me) { me.name = name || 'Anónimo'; saveRanking(r); renderRanking($('overList'), 3); }
  });
  $('nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });

  // modo prueba: abre la web con #debug para tocar el estado desde la consola
  if (location.hash === '#debug') {
    window.kvj = {
      S, K, J, P, CAM, holes, startGame, showOver, whackTap, throwBone, doBark, dash, startLevel, renderShop, startCine, skipCine, defeatJoselito,
      occY: (i) => occY(holes[i], holes[i].o),
      step: (dt, n = 1) => { for (let i = 0; i < n; i++) update(dt); render(); },
      tick: (dt) => update(dt),
    };
  }

  /* ---------- arranque ---------- */
  resize();
  updateSoundBtn();
  drawIcons();
  showMenu();
  IMG.k.addEventListener('load', () => { if (!$('shop').classList.contains('hidden')) renderShop(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { buildBg(); drawIcons(); });
  requestAnimationFrame((t) => { last = t; frame(t); });
})();
