'use strict';
/* Progreso del jugador (se guarda en el móvil): monedas, mejoras, disfraces y misiones */
window.KVJP = (() => {
  const KEY = 'kvj_progress';
  const fmt = (n) => Math.round(n).toLocaleString('es-ES');

  // values[i] = valor con i mejoras compradas; prices[i] = precio de pasar de i a i+1
  const UPGRADES = [
    { id: 'vidas', icon: '❤️', name: 'Vidas extra', desc: 'Empiezas con más vidas', values: [3, 4, 5], prices: [80, 220], show: (v) => `${v} vidas` },
    { id: 'fuerza', icon: '🦴', name: 'Huesos fuertes', desc: 'Más daño a Joselito', values: [1, 1.5, 2, 2.5], prices: [60, 160, 340], show: (v) => `daño x${String(v).replace('.', ',')}` },
    { id: 'mochila', icon: '🎒', name: 'Mochila de huesos', desc: 'Puedes llevar más huesos', values: [10, 14, 18, 24], prices: [50, 130, 260], show: (v) => `${v} huesos` },
    { id: 'iman', icon: '🧲', name: 'Imán de caramelos', desc: 'Atrae los caramelos cercanos', values: [0, 60, 100, 140], prices: [90, 190, 350], show: (v) => (v ? `alcance ${v}` : 'sin imán') },
    { id: 'escudo', icon: '🎃', name: 'Escudo calabaza', desc: 'El escudo dura más', values: [7, 9, 11, 14], prices: [50, 120, 250], show: (v) => `${v} s` },
    { id: 'dash', icon: '💨', name: 'Dash', desc: 'El dash se recarga antes', values: [1.6, 1.2, 0.85], prices: [70, 180], show: (v) => `recarga ${String(v).replace('.', ',')} s` },
    { id: 'ladrido', icon: '📣', name: 'Súper ladrido', desc: 'La barra de GUAU se llena antes', values: [1, 1.3, 1.7], prices: [90, 230], show: (v) => `carga x${String(v).replace('.', ',')}` },
    { id: 'reloj', icon: '⏱️', name: 'Más tiempo', desc: 'Más segundos en Aplasta a Joselito', values: [30, 34, 38, 43], prices: [60, 150, 290], show: (v) => `${v} s` },
  ];

  const COSTUMES = [
    { id: 'jack', name: 'Jack Skellington', price: 0 },
    { id: 'bruja', name: 'Bruja', price: 150 },
    { id: 'vampiro', name: 'Vampiro', price: 250 },
    { id: 'calabaza', name: 'Cabeza de calabaza', price: 350 },
    { id: 'rey', name: 'Rey de Halloween', price: 700 },
  ];

  // game: true = cuenta lo mejor de una sola partida; si no, se va sumando entre partidas
  const MISSIONS = {
    candies: { text: (n) => `Coge ${fmt(n)} caramelos`, targets: [40, 100, 200, 400, 800], rewards: [30, 50, 80, 120, 200] },
    golds: { text: (n) => `Coge ${n} caramelos dorados`, targets: [3, 8, 15, 30], rewards: [30, 60, 100, 150] },
    beatJ: { text: (n) => (n === 1 ? 'Derrota a Joselito' : `Derrota a Joselito ${n} veces`), targets: [1, 3, 6, 10, 20], rewards: [40, 70, 110, 160, 250] },
    spidersShot: { text: (n) => `Destruye ${n} arañas con huesos`, targets: [10, 30, 60, 120], rewards: [30, 60, 100, 150] },
    barks: { text: (n) => `Usa el súper ladrido ${n} veces`, targets: [2, 5, 10, 20], rewards: [30, 50, 90, 140] },
    whacked: { text: (n) => `Aplasta ${n} Joselitos`, targets: [30, 80, 150, 300], rewards: [30, 60, 100, 150] },
    level: { game: true, text: (n) => `Llega al nivel ${n} en una partida`, targets: [2, 3, 4, 6, 8], rewards: [40, 70, 110, 170, 260] },
    combo: { game: true, text: (n) => `Haz un combo de ${n}`, targets: [15, 25, 40, 60], rewards: [30, 60, 100, 160] },
    score: { game: true, text: (n) => `Haz ${fmt(n)} puntos en Kaska contraataca`, targets: [1000, 2500, 5000, 10000], rewards: [40, 80, 130, 200] },
    whackScore: { game: true, text: (n) => `Haz ${fmt(n)} puntos en Aplasta`, targets: [500, 1000, 1600, 2400], rewards: [30, 70, 120, 180] },
  };

  function load() {
    const base = { coins: 0, totalCoins: 0, up: {}, owned: ['jack'], costume: 'jack', missions: [], tiers: {} };
    let x = null;
    try { x = JSON.parse(localStorage.getItem(KEY)); } catch (e) { x = null; }
    if (!x || typeof x !== 'object') x = {};
    const d = Object.assign(base, x);
    if (!Array.isArray(d.owned) || !d.owned.includes('jack')) d.owned = ['jack'].concat(Array.isArray(d.owned) ? d.owned : []);
    if (!COSTUMES.some((c) => c.id === d.costume)) d.costume = 'jack';
    if (!Array.isArray(d.missions)) d.missions = [];
    d.missions = d.missions.filter((m) => m && MISSIONS[m.type]);
    return d;
  }
  const d = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* sin guardado */ } }

  function makeMission(type) {
    const def = MISSIONS[type], tier = d.tiers[type] || 0, n = def.targets.length;
    const extra = Math.max(0, tier - n + 1);
    const target = tier < n ? def.targets[tier] : Math.round(def.targets[n - 1] * Math.pow(1.6, extra));
    const reward = tier < n ? def.rewards[tier] : Math.round(def.rewards[n - 1] * Math.pow(1.3, extra));
    return { type, target, reward, progress: 0 };
  }
  if (!d.missions.length) d.missions = ['candies', 'level', 'whacked'].map(makeMission);
  while (d.missions.length < 3) {
    const used = d.missions.map((m) => m.type);
    d.missions.push(makeMission(Object.keys(MISSIONS).find((t) => !used.includes(t))));
  }

  function complete(i, done) {
    const m = d.missions[i];
    d.coins += m.reward; d.totalCoins += m.reward;
    d.tiers[m.type] = (d.tiers[m.type] || 0) + 1;
    done.push({ text: MISSIONS[m.type].text(m.target), reward: m.reward });
    const used = d.missions.map((x) => x.type);
    const pool = Object.keys(MISSIONS).filter((t) => !used.includes(t));
    d.missions[i] = makeMission(pool[Math.floor(Math.random() * pool.length)]);
  }

  // contador que se suma entre partidas (caramelos, arañas...). Devuelve las misiones cumplidas.
  function event(type, n = 1) {
    const done = [];
    d.missions.forEach((m, i) => {
      if (m.type !== type || MISSIONS[type].game) return;
      m.progress += n;
      if (m.progress >= m.target) complete(i, done);
    });
    if (done.length) save();
    return done;
  }
  // mejor marca dentro de una partida (nivel, combo, puntos)
  function peak(type, v) {
    const done = [];
    d.missions.forEach((m, i) => {
      if (m.type !== type || !MISSIONS[type].game) return;
      if (v > m.progress) m.progress = v;
      if (m.progress >= m.target) complete(i, done);
    });
    if (done.length) save();
    return done;
  }

  const upgrade = (id) => UPGRADES.find((u) => u.id === id);
  const upLevel = (id) => d.up[id] || 0;
  const val = (id) => { const u = upgrade(id); return u.values[Math.min(upLevel(id), u.values.length - 1)]; };
  function buyUpgrade(id) {
    const u = upgrade(id), lv = upLevel(id);
    if (!u || lv >= u.prices.length || d.coins < u.prices[lv]) return false;
    d.coins -= u.prices[lv];
    d.up[id] = lv + 1;
    save();
    return true;
  }
  // compra (si hace falta) y se pone el disfraz
  function useCostume(id) {
    const c = COSTUMES.find((x) => x.id === id);
    if (!c) return false;
    if (!d.owned.includes(id)) {
      if (d.coins < c.price) return false;
      d.coins -= c.price;
      d.owned.push(id);
    }
    d.costume = id;
    save();
    return true;
  }
  function addCoins(n) { d.coins += n; d.totalCoins += n; save(); }

  return {
    UPGRADES, COSTUMES,
    coins: () => d.coins,
    addCoins, upLevel, val, buyUpgrade, useCostume, save, event, peak,
    owned: (id) => d.owned.includes(id),
    costume: () => d.costume,
    missions: () => d.missions.map((m) => ({ text: MISSIONS[m.type].text(m.target), progress: Math.min(m.progress, m.target), target: m.target, reward: m.reward })),
  };
})();
