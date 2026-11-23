// Game feel for the owner dashboard only (Nov 23, 2026). The public site is
// untouched. Everything here is decoration: if this file fails to load, the
// dashboard works exactly the same.
//
// Motion
//   - Every tap: a crisp "hit spark" (thin ring + radial streaks) where the
//     finger/mouse lands and a springy squash on the button.
//   - Real wins (admin.js calls MagicFX.win): a bloom at the tap point, XP orbs
//     that fly along curved paths into the XP chip, the chip counts up as they
//     land, and a glass "+50 XP · Cleaning done" tag rises.
//   - Level up (every 250 XP): a dark stage with slow light rays, shockwave
//     rings and a card with a light sweep. No confetti.
//   - Cards tilt in 3D under the mouse/trackpad and catch the light.
// Sound (Web Audio, synthesized: no files to download)
//   - Different sound per control: menu tabs play notes of a scale, filters
//     tick, confirm buttons pop, switches click up/down, panels whoosh.
//   - Different sound per win: a glass chime for small steps, a "cash" chime
//     for payments, an arpeggio for a finished clean, a full chord for a new
//     client and a rising chord for a level up.
//   - A speaker button in the top bar turns sound off/on (remembered).
// Reduced-motion users get no particles, tilt or squash: the XP chip and the
// sounds (if on) still work.
(function () {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const t = (k, v) => (window.MagicstickI18N ? window.MagicstickI18N.t(k, v) : k);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* private mode */ } },
  };
  // "Mode jeu" (the controller on the home tab): master switch for effects + sounds.
  let game = store.get('magicstick_admin_game') !== 'off';
  // Fine settings (Réglages > Effets et sons), remembered on this device.
  const PREF_DEFAULTS = { volume: 70, tap: true, wins: true, levelup: true, tilt: true, vibrate: true };
  let prefs = { ...PREF_DEFAULTS };
  try { prefs = { ...PREF_DEFAULTS, ...JSON.parse(store.get('magicstick_admin_fx') || '{}') }; } catch (_) { /* defaults */ }
  const savePrefs = () => store.set('magicstick_admin_fx', JSON.stringify(prefs));

  // ------------------------------------------------------------------ sound
  const Sound = (() => {
    let ctx = null, master = null, wet = null, noiseBuf = null;
    let on = store.get('magicstick_admin_sound') !== 'off';
    const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note → Hz

    function init() {
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 4;
      comp.attack.value = 0.003; comp.release.value = 0.2;
      master = ctx.createGain(); master.gain.value = 0.7 * (prefs.volume / 100);
      master.connect(comp); comp.connect(ctx.destination);
      // Small, soft room: decaying stereo noise as impulse response.
      const len = Math.floor(ctx.sampleRate * 1.4);
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5);
      }
      const conv = ctx.createConvolver(); conv.buffer = ir;
      const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 5200;
      wet = ctx.createGain(); wet.gain.value = 0.3;
      wet.connect(conv); conv.connect(tone); tone.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const nd = noiseBuf.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      return ctx;
    }
    function ready() {
      if (!on || !init()) return false;
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    function env(g, at, attack, peak, dur) {
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    }
    function send(node, rev) {
      node.connect(master);
      if (rev) { const s = ctx.createGain(); s.gain.value = rev; node.connect(s); s.connect(wet); }
    }
    // Plain oscillator voice with optional pitch glide.
    function tone({ f, f2, type = 'sine', at = 0, dur = 0.2, vol = 0.1, attack = 0.004, rev = 0.25, pan = 0 }) {
      const now = ctx.currentTime + at;
      const o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f, now);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + dur * 0.8);
      const g = ctx.createGain(); env(g, now, attack, vol, dur);
      let last = g;
      if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); last = p; }
      o.connect(g); send(last, rev);
      o.start(now); o.stop(now + dur + 0.05);
    }
    // FM bell: glassy, expensive-sounding chime.
    function bell(f, { at = 0, vol = 0.1, dur = 1.1, ratio = 3.5, depth = 2, rev = 0.55, pan = 0 } = {}) {
      const now = ctx.currentTime + at;
      const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
      car.frequency.value = f; mod.frequency.value = f * ratio;
      mg.gain.setValueAtTime(f * depth, now); mg.gain.exponentialRampToValueAtTime(f * 0.02, now + dur * 0.7);
      mod.connect(mg); mg.connect(car.frequency);
      env(g, now, 0.005, vol, dur);
      let last = g;
      if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); last = p; }
      car.connect(g); send(last, rev);
      car.start(now); mod.start(now); car.stop(now + dur + 0.05); mod.stop(now + dur + 0.05);
    }
    // Filtered noise: clicks, swishes, shimmer.
    function noise({ at = 0, dur = 0.1, vol = 0.05, from = 1000, to = 4000, q = 1, type = 'bandpass', rev = 0.15 }) {
      const now = ctx.currentTime + at;
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const flt = ctx.createBiquadFilter(); flt.type = type; flt.Q.value = q;
      flt.frequency.setValueAtTime(from, now); flt.frequency.exponentialRampToValueAtTime(to, now + dur);
      const g = ctx.createGain(); env(g, now, Math.min(0.02, dur / 3), vol, dur);
      src.connect(flt); flt.connect(g); send(g, rev);
      src.start(now, Math.random() * 0.5); src.stop(now + dur + 0.05);
    }
    // Soft sustained pad under big moments.
    function pad(notes, { at = 0, dur = 1.6, vol = 0.03 } = {}) {
      const now = ctx.currentTime + at;
      const flt = ctx.createBiquadFilter(); flt.type = 'lowpass';
      flt.frequency.setValueAtTime(500, now); flt.frequency.exponentialRampToValueAtTime(3200, now + dur * 0.4);
      flt.frequency.exponentialRampToValueAtTime(700, now + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(vol, now + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      flt.connect(g); send(g, 0.6);
      notes.forEach((n) => [-7, 7].forEach((det) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NOTE(n); o.detune.value = det;
        o.connect(flt); o.start(now); o.stop(now + dur + 0.05);
      }));
    }

    const SCALE = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93]; // C major pentatonic, from C5
    const S = {
      tap() { tone({ f: 2100, f2: 1500, type: 'triangle', dur: 0.05, vol: 0.06, rev: 0.08 }); noise({ dur: 0.025, vol: 0.025, from: 6000, to: 4000, q: 2, rev: 0 }); },
      soft() { tone({ f: 950, f2: 720, dur: 0.07, vol: 0.05, rev: 0.1 }); },
      confirm() { tone({ f: 880, dur: 0.07, vol: 0.07, rev: 0.12 }); tone({ f: 1318.5, at: 0.045, dur: 0.16, vol: 0.06, rev: 0.25 }); },
      select(i = 0) { const n = NOTE(SCALE[i % SCALE.length] + 12); tone({ f: n, f2: n * 1.02, dur: 0.08, vol: 0.05, rev: 0.15 }); noise({ dur: 0.02, vol: 0.015, from: 7000, to: 5000, q: 3, rev: 0 }); },
      nav(i = 0) {
        const n = NOTE(SCALE[i % SCALE.length]);
        noise({ dur: 0.16, vol: 0.03, from: 500, to: 3500, q: 0.7, rev: 0.2 });
        bell(n, { vol: 0.06, dur: 0.7, ratio: 2, depth: 0.8, rev: 0.45 });
        tone({ f: n * 2, dur: 0.25, vol: 0.015, rev: 0.4 });
      },
      toggleOn() { tone({ f: 660, dur: 0.06, vol: 0.06 }); tone({ f: 990, at: 0.06, dur: 0.14, vol: 0.06, rev: 0.3 }); },
      toggleOff() { tone({ f: 990, dur: 0.06, vol: 0.05 }); tone({ f: 620, at: 0.06, dur: 0.12, vol: 0.05, rev: 0.2 }); },
      open() { noise({ dur: 0.22, vol: 0.035, from: 350, to: 2600, q: 0.6, rev: 0.3 }); tone({ f: 440, f2: 660, dur: 0.2, vol: 0.03, rev: 0.3 }); },
      orb(i = 0) { bell(NOTE(84 + [0, 4, 7, 12, 16, 19, 24, 28][i % 8]), { vol: 0.028, dur: 0.35, ratio: 4, depth: 1, rev: 0.4, pan: (i % 2 ? 0.25 : -0.25) }); },
      small() { bell(NOTE(88), { vol: 0.09, dur: 1 }); bell(NOTE(95), { at: 0.08, vol: 0.05, dur: 0.9 }); },
      interested() { bell(NOTE(86), { vol: 0.08 }); bell(NOTE(90), { at: 0.07, vol: 0.07 }); bell(NOTE(93), { at: 0.14, vol: 0.06, dur: 1.3 }); },
      money() {
        tone({ f: NOTE(83), type: 'triangle', dur: 0.09, vol: 0.08, rev: 0.15 });
        tone({ f: NOTE(88), type: 'triangle', at: 0.075, dur: 0.5, vol: 0.09, rev: 0.4 });
        bell(NOTE(100), { at: 0.075, vol: 0.035, dur: 0.9, ratio: 5 });
        noise({ at: 0.07, dur: 0.6, vol: 0.02, from: 9000, to: 6000, type: 'highpass', q: 0.5, rev: 0.5 });
      },
      done() {
        [72, 76, 79, 84].forEach((n, i) => bell(NOTE(n + 12), { at: i * 0.07, vol: 0.08, dur: 1.2, pan: (i - 1.5) * 0.2 }));
        pad([60, 64, 67], { at: 0.1, dur: 1.4, vol: 0.022 });
      },
      client() {
        [67, 71, 74, 79, 83, 86].forEach((n, i) => bell(NOTE(n + 12), { at: i * 0.06, vol: 0.08, dur: 1.4, pan: (i - 2.5) * 0.15 }));
        tone({ f: NOTE(43), dur: 1.3, vol: 0.09, attack: 0.08, rev: 0.2 });
        pad([55, 59, 62, 67], { at: 0.05, dur: 1.9, vol: 0.026 });
        noise({ at: 0.3, dur: 0.9, vol: 0.018, from: 10000, to: 7000, type: 'highpass', rev: 0.6 });
      },
      powerOn() {
        noise({ dur: 0.45, vol: 0.04, from: 200, to: 5000, q: 0.7, rev: 0.3 });
        tone({ f: 110, f2: 440, dur: 0.45, vol: 0.06, type: 'triangle', rev: 0.2 });
        [72, 79, 84].forEach((n, i) => bell(NOTE(n + 12), { at: 0.32 + i * 0.07, vol: 0.06, dur: 0.9 }));
      },
      powerOff() {
        tone({ f: 660, f2: 90, dur: 0.5, vol: 0.06, type: 'triangle', rev: 0.25 });
        noise({ dur: 0.35, vol: 0.03, from: 3000, to: 200, q: 0.7, rev: 0.2 });
      },
      levelUp() {
        noise({ dur: 0.7, vol: 0.05, from: 250, to: 7000, q: 0.6, rev: 0.4 });
        [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => bell(NOTE(n + 12), { at: 0.35 + i * 0.055, vol: 0.075, dur: 1.5, pan: (i - 3) * 0.12 }));
        tone({ f: NOTE(36), at: 0.35, dur: 1.8, vol: 0.1, attack: 0.05, rev: 0.25 });
        pad([60, 64, 67, 71], { at: 0.35, dur: 2.4, vol: 0.03 });
      },
    };
    return {
      play(name, arg, force) { if ((!game && !force) || !ready() || !S[name]) return; try { S[name](arg); } catch (_) { /* audio is optional */ } },
      get on() { return on; },
      set(v) { on = v; store.set('magicstick_admin_sound', v ? 'on' : 'off'); if (v) { this.play('toggleOn'); } },
      volume(v) { if (master) master.gain.value = 0.7 * (v / 100); },
    };
  })();

  // ------------------------------------------------------------------ motion
  let layer = null;
  const ensureLayer = () => {
    if (layer) return layer;
    layer = document.createElement('div');
    layer.className = 'fx-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    return layer;
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  let last = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  function spawn(cls, x, y, extra) {
    const el = document.createElement('span');
    el.className = cls;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    if (extra) extra(el);
    ensureLayer().appendChild(el);
    return el;
  }
  const done = (anim, el) => { anim.onfinish = () => el.remove(); anim.oncancel = () => el.remove(); };

  // Hit spark: one thin ring + short radial streaks, like a precise game hit.
  function hit(x, y, strong) {
    if (calm || !game || !prefs.tap) return;
    const ring = spawn('fx-ring', x, y);
    done(ring.animate([
      { transform: 'translate(-50%,-50%) scale(.25)', opacity: 0.95 },
      { transform: `translate(-50%,-50%) scale(${strong ? 1.25 : 1})`, opacity: 0 },
    ], { duration: 420, easing: 'cubic-bezier(.15,.85,.3,1)' }), ring);
    const n = strong ? 10 : 8;
    const rot = rand(0, 360 / n);
    for (let i = 0; i < n; i++) {
      const a = rot + (360 / n) * i;
      const s = spawn('fx-streak', x, y);
      const d0 = 8, d1 = strong ? rand(34, 44) : rand(26, 34);
      done(s.animate([
        { transform: `translate(-50%,-50%) rotate(${a}deg) translateX(${d0}px) scaleX(1)`, opacity: 1 },
        { transform: `translate(-50%,-50%) rotate(${a}deg) translateX(${d1}px) scaleX(.15)`, opacity: 0 },
      ], { duration: rand(280, 360), easing: 'cubic-bezier(.1,.9,.25,1)' }), s);
    }
  }

  // ---- XP chip state (display can lag behind the real value while orbs fly)
  const LEVEL_XP = 250;
  let target = null, shown = null, flying = 0, applyTimer = 0, countAnim = 0;
  const chipEl = () => document.getElementById('fxXp');
  let hud = null, hudTimer = 0;
  function paint(xp) {
    const level = Math.floor(xp / LEVEL_XP) + 1;
    [chipEl(), hud].forEach((box) => {
      if (!box) return;
      box.querySelector('.fx-xp-level').textContent = String(level);
      box.querySelector('.fx-xp-points').textContent = Math.round(xp).toLocaleString();
      box.querySelector('.fx-xp-fill').style.width = `${((xp % LEVEL_XP) / LEVEL_XP) * 100}%`;
    });
  }
  // When the XP chip is scrolled away, a small floating copy (game HUD)
  // slides in under the header to catch the orbs, then leaves.
  function showHud() {
    if (!hud) {
      hud = document.createElement('div');
      hud.className = 'fx-hud';
      hud.setAttribute('aria-hidden', 'true');
      hud.innerHTML = '<span class="fx-xp-badge fx-xp-level"></span><span class="fx-hud-text"><span><span class="fx-xp-points"></span> XP</span>'
        + '<span class="fx-xp-bar"><span class="fx-xp-fill"></span></span></span>';
      document.body.appendChild(hud);
    }
    paint(shown == null ? (target || 0) : shown);
    clearTimeout(hudTimer);
    hud.classList.remove('is-out'); hud.classList.add('is-in');
    return hud.querySelector('.fx-xp-badge');
  }
  function hideHudSoon() {
    if (!hud) return;
    clearTimeout(hudTimer);
    hudTimer = setTimeout(() => { hud.classList.remove('is-in'); hud.classList.add('is-out'); }, 1300);
  }
  function countTo(to, ms) {
    cancelAnimationFrame(countAnim);
    const from = shown == null ? to : shown;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      const v = from + (to - from) * (1 - Math.pow(1 - k, 3));
      paint(v);
      if (k < 1) countAnim = requestAnimationFrame(step);
    };
    countAnim = requestAnimationFrame(step);
    shown = to;
  }
  function apply() {
    if (target == null || flying > 0) return;
    const chip = chipEl();
    if (!chip) return;
    chip.hidden = false;
    const first = shown == null;
    if (first) { paint(target); shown = target; } else if (target !== shown) countTo(target, 700);
    const level = Math.floor(target / LEVEL_XP) + 1;
    const seen = Number(store.get('magicstick_admin_level')) || null;
    store.set('magicstick_admin_level', String(level));
    if (seen && level > seen && game && prefs.levelup) setTimeout(() => levelUp(seen, level), first ? 400 : 750);
  }
  function setXP(xp) {
    target = xp;
    clearTimeout(applyTimer);
    applyTimer = setTimeout(apply, 40); // lets a win() in the same task take over the count
  }
  function pulseChip() {
    if (calm) return;
    [chipEl(), hud && hud.classList.contains('is-in') ? hud : null].forEach((box) => {
      if (!box) return;
      box.classList.remove('fx-gain'); void box.offsetWidth; box.classList.add('fx-gain');
    });
  }

  // XP orbs: curved flight from the tap point into the XP chip.
  function orbs(x, y, count, onAllLanded) {
    const chip = chipEl();
    let badge = chip && !chip.hidden ? chip.querySelector('.fx-xp-badge') : null;
    if (badge) {
      const r = badge.getBoundingClientRect();
      const header = document.querySelector('.site-header');
      const top = header ? header.getBoundingClientRect().bottom : 0;
      if (r.top < top || r.bottom > window.innerHeight) badge = null;
    }
    if (!game) { onAllLanded(); return; }
    if (!badge) badge = showHud();
    const r = badge.getBoundingClientRect();
    // The HUD is still sliding in: aim where it will settle.
    const tx = r.left + r.width / 2, ty = badge.closest('.fx-hud') ? 108 : r.top + r.height / 2;
    if (calm) { onAllLanded(); return; }
    let left = count;
    for (let i = 0; i < count; i++) {
      const o = spawn('fx-orb', x, y);
      // Quadratic Bézier with a control point pushed sideways: each orb arcs differently.
      const sx = x + rand(-60, 60), sy = y + rand(-50, 20);
      const mx = (sx + tx) / 2 + rand(-160, 160), my = Math.min(sy, ty) - rand(60, 180);
      const frames = [];
      const STEPS = 16;
      for (let k = 0; k <= STEPS; k++) {
        const u = k / STEPS;
        const bx = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * mx + u * u * tx;
        const by = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * my + u * u * ty;
        const sc = k === 0 ? 0.2 : u < 0.15 ? 1.15 : 1 - u * 0.55;
        frames.push({ transform: `translate(${bx - x}px, ${by - y}px) translate(-50%,-50%) scale(${sc.toFixed(3)})`, opacity: k === 0 ? 0 : 1, offset: u });
      }
      const timing = { duration: rand(720, 900), delay: i * 55, easing: 'cubic-bezier(.55,.05,.35,1)', fill: 'backwards' };
      const trail = spawn('fx-orb fx-orb-trail', x, y);
      done(trail.animate(frames, { ...timing, delay: timing.delay + 45 }), trail);
      const anim = o.animate(frames, timing);
      anim.onfinish = () => {
        o.remove();
        Sound.play('orb', i);
        pulseChip();
        if (--left === 0) onAllLanded();
      };
      anim.oncancel = () => { o.remove(); if (--left === 0) onAllLanded(); };
    }
  }

  // Glass tag: "+50 XP" and what was achieved.
  function tag(x, y, points, label) {
    const el = spawn('fx-tag', x, y, (e) => {
      e.innerHTML = '<b></b><span></span>';
      e.querySelector('b').textContent = `+${points} XP`;
      e.querySelector('span').textContent = label || '';
    });
    const w = 200, cx = Math.max(w / 2 + 12, Math.min(window.innerWidth - w / 2 - 12, x));
    el.style.left = `${cx}px`;
    done(el.animate([
      { transform: 'translate(-50%,-30%) scale(.7)', opacity: 0, filter: 'blur(6px)' },
      { transform: 'translate(-50%,-120%) scale(1.04)', opacity: 1, filter: 'blur(0)', offset: 0.18 },
      { transform: 'translate(-50%,-130%) scale(1)', opacity: 1, filter: 'blur(0)', offset: 0.78 },
      { transform: 'translate(-50%,-175%) scale(.96)', opacity: 0, filter: 'blur(4px)' },
    ], { duration: calm ? 1600 : 1900, easing: 'cubic-bezier(.2,.8,.2,1)' }), el);
  }

  function bloom(x, y, big) {
    if (calm) return;
    const g = spawn('fx-bloom', x, y);
    done(g.animate([
      { transform: 'translate(-50%,-50%) scale(.2)', opacity: 0.9 },
      { transform: `translate(-50%,-50%) scale(${big ? 1.6 : 1.1})`, opacity: 0 },
    ], { duration: 650, easing: 'cubic-bezier(.15,.85,.3,1)' }), g);
    [0, 110].forEach((delay) => {
      const r = spawn('fx-ring fx-ring-win', x, y);
      done(r.animate([
        { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0.9 },
        { transform: `translate(-50%,-50%) scale(${big ? 2.6 : 1.9})`, opacity: 0 },
      ], { duration: 700, delay, easing: 'cubic-bezier(.15,.85,.3,1)', fill: 'backwards' }), r);
    });
  }

  const WIN_SOUND = { done: 'done', paid: 'money', deposit: 'money', client: 'client', interested: 'interested' };
  // A real win (called by admin.js after the save succeeded).
  function win(points, kind) {
    const { x, y } = last;
    if (!game) { apply(); return; }
    if (!prefs.wins) { Sound.play(WIN_SOUND[kind] || 'small'); apply(); return; }
    flying += 1;
    bloom(x, y, points >= 50);
    Sound.play(WIN_SOUND[kind] || 'small');
    tag(x, y - 18, points, kind ? t(`admin.fx.win.${kind}`) : '');
    const n = Math.max(4, Math.min(14, Math.round(points / 8)));
    orbs(x, y, n, () => { flying -= 1; apply(); hideHudSoon(); });
    if (navigator.vibrate && prefs.vibrate) { try { navigator.vibrate(points >= 100 ? [12, 40, 12, 40, 24] : points >= 30 ? [10, 30, 14] : 12); } catch (_) { /* not allowed */ } }
  }

  // Level up: a short, cinematic moment that never blocks the work.
  function levelUp(from, level) {
    const stage = document.createElement('div');
    stage.className = 'fx-levelup';
    stage.setAttribute('role', 'status');
    stage.innerHTML = '<div class="fx-levelup-rays"></div><div class="fx-levelup-card">'
      + '<span class="fx-levelup-kicker"></span><b class="fx-levelup-num"></b><span class="fx-levelup-sub"></span><i class="fx-levelup-shine"></i></div>';
    stage.querySelector('.fx-levelup-kicker').textContent = t('admin.fx.levelUp');
    stage.querySelector('.fx-levelup-num').textContent = t('admin.fx.level', { n: level });
    stage.querySelector('.fx-levelup-sub').textContent = t('admin.fx.levelSub');
    document.body.appendChild(stage);
    Sound.play('levelUp');
    if (!calm) {
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      [380, 520, 680].forEach((delay, i) => {
        const r = spawn('fx-ring fx-ring-win', cx, cy);
        r.style.zIndex = '10000';
        done(r.animate([
          { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0.8 },
          { transform: `translate(-50%,-50%) scale(${6 + i * 2})`, opacity: 0 },
        ], { duration: 1200, delay, easing: 'cubic-bezier(.1,.8,.3,1)', fill: 'backwards' }), r);
      });
    }
    try { if (navigator.vibrate && prefs.vibrate) navigator.vibrate([20, 60, 20, 60, 40]); } catch (_) { /* not allowed */ }
    const close = () => { stage.classList.add('is-out'); setTimeout(() => stage.remove(), 600); };
    const timer = setTimeout(close, 2800);
    stage.addEventListener('click', () => { clearTimeout(timer); close(); });
  }

  // ------------------------------------------------------------------ input
  const PRESSABLE = 'button, a.btn-mini, .btn-mini, .dash-nav-btn, .stage-chip, .care-switch, summary, input[type="checkbox"], label.growth-check';
  function soundFor(el) {
    if (el.matches('.dash-nav-btn')) {
      const all = Array.from(document.querySelectorAll('.dash-nav-btn'));
      return ['nav', Math.max(0, all.indexOf(el))];
    }
    if (el.matches('.stage-chip')) {
      const all = Array.from(el.parentElement ? el.parentElement.children : []);
      return ['select', Math.max(0, all.indexOf(el))];
    }
    if (el.matches('summary')) return ['open'];
    if (el.matches('input[type="checkbox"]')) return [el.checked ? 'toggleOff' : 'toggleOn']; // state before the change
    if (el.matches('.care-switch, .care-switch *')) return ['tap'];
    if (el.matches('#fxSound, #msGameMode')) return null;
    if (el.matches('.btn-mini-go, .btn-primary, [type="submit"]')) return ['confirm'];
    if (el.matches('.btn-mini-ghost, .btn-outline, .btn-ghost')) return ['soft'];
    return ['tap'];
  }
  document.addEventListener('pointerdown', (e) => {
    last = { x: e.clientX, y: e.clientY };
    let el = e.target instanceof Element ? e.target : null;
    if (!el || !el.closest('#adminDashboard')) return;
    if (el.matches('label') || el.closest('label')) {
      const box = (el.closest('label') || el).querySelector('input[type="checkbox"]');
      if (box) el = box;
    }
    el = el.matches(PRESSABLE) ? el : el.closest(PRESSABLE);
    if (!el || el.disabled) return;
    const s = soundFor(el);
    if (s) Sound.play(s[0], s[1]);
    const strong = el.matches('.btn-mini-go, .btn-primary, [type="submit"]');
    hit(e.clientX, e.clientY, strong);
    if (!calm && game && prefs.tap && !el.matches('input')) {
      el.classList.remove('fx-squash'); void el.offsetWidth; el.classList.add('fx-squash');
    }
  }, { passive: true });
  document.addEventListener('animationend', (e) => {
    if (e.animationName === 'fxSquash' || e.animationName === 'fxPop') e.target.classList.remove('fx-squash', 'fx-pop');
  });
  document.addEventListener('click', (e) => {
    const nav = e.target instanceof Element ? e.target.closest('.dash-nav-btn') : null;
    if (!nav || calm) return;
    nav.classList.remove('fx-pop'); void nav.offsetWidth; nav.classList.add('fx-pop');
  });

  // Sound on/off button.
  function initSoundButton() {
    const b = document.getElementById('fxSound');
    if (!b) return;
    const sync = () => {
      b.setAttribute('aria-pressed', String(Sound.on));
      b.classList.toggle('is-muted', !Sound.on);
      const label = t(Sound.on ? 'admin.fx.soundOn' : 'admin.fx.soundOff');
      b.setAttribute('aria-label', label); b.title = label;
    };
    b.hidden = false;
    sync();
    b.addEventListener('click', () => setSoundOn(!Sound.on));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSoundButton); else initSoundButton();

  // 3D tilt + light on cards (mouse/trackpad only).
  if (fine && !calm) {
    const TILT = '#adminDashboard .order-card, #adminDashboard .dash-kpi, #adminDashboard .dash-card';
    let raf = 0, ev = null, current = null;
    const reset = (el) => { el.style.removeProperty('transform'); el.style.removeProperty('--gx'); el.style.removeProperty('--gy'); el.classList.remove('fx-tilting'); };
    document.addEventListener('pointermove', (e) => {
      ev = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = game && prefs.tilt && ev.target instanceof Element ? ev.target.closest(TILT) : null;
        if (current && current !== el) reset(current);
        current = el;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width - 0.5;
        const py = (ev.clientY - r.top) / r.height - 0.5;
        const big = el.classList.contains('dash-card') && r.height > 260; // long cards: barely tilt
        const max = big ? 1.2 : 5;
        const ang = Math.min(1, Math.hypot(px, py) * 2) * max;
        el.classList.add('fx-tilting');
        el.style.transform = `perspective(900px) rotate3d(${(-py).toFixed(3)}, ${px.toFixed(3)}, 0, ${ang.toFixed(2)}deg) translateZ(0)`;
        el.style.setProperty('--gx', `${((px + 0.5) * 100).toFixed(1)}%`);
        el.style.setProperty('--gy', `${((py + 0.5) * 100).toFixed(1)}%`);
      });
    }, { passive: true });
    document.addEventListener('pointerleave', () => { if (current) reset(current); current = null; });
  }

  // ------------------------------------------------------------------ widgets
  function initGameSwitch() {
    const box = document.getElementById('msGameMode');
    if (!box) return;
    box.checked = game;
    const device = box.nextElementSibling;
    const hint = () => { if (device) device.dataset.hint = t('admin.game.hint'); };
    hint();
    document.addEventListener('magicstick:langchange', hint);
    box.addEventListener('change', () => setGame(box.checked));
    document.documentElement.classList.toggle('ms-game-off', !game);
  }

  function setGame(on) {
    if (on === game) return;
    if (on) { game = true; store.set('magicstick_admin_game', 'on'); Sound.play('powerOn'); }
    else { Sound.play('powerOff', undefined, true); game = false; store.set('magicstick_admin_game', 'off'); }
    document.documentElement.classList.toggle('ms-game-off', !game);
    const box = document.getElementById('msGameMode'); if (box) box.checked = game;
    syncPanel();
  }
  function setSoundOn(on) {
    if (on !== Sound.on) Sound.set(on);
    const b = document.getElementById('fxSound');
    if (b) {
      b.setAttribute('aria-pressed', String(Sound.on)); b.classList.toggle('is-muted', !Sound.on);
      const label = t(Sound.on ? 'admin.fx.soundOn' : 'admin.fx.soundOff'); b.setAttribute('aria-label', label); b.title = label;
    }
    syncPanel();
  }
  // Réglages > Effets et sons: every [data-fx-pref] control.
  function syncPanel() {
    document.querySelectorAll('[data-fx-pref]').forEach((el) => {
      const k = el.dataset.fxPref;
      const v = k === 'game' ? game : k === 'sound' ? Sound.on : prefs[k];
      if (el.type === 'checkbox') el.checked = !!v; else el.value = String(v);
      if (el.type === 'range') { const out = document.querySelector(`[data-fx-out="${k}"]`); if (out) out.textContent = `${v} %`; }
    });
  }
  function initPanel() {
    document.querySelectorAll('[data-fx-pref]').forEach((el) => {
      el.addEventListener(el.type === 'range' ? 'input' : 'change', () => {
        const k = el.dataset.fxPref;
        if (k === 'game') return setGame(el.checked);
        if (k === 'sound') return setSoundOn(el.checked);
        prefs[k] = el.type === 'checkbox' ? el.checked : Number(el.value);
        if (k === 'volume') Sound.volume(prefs.volume);
        savePrefs(); syncPanel();
      });
      if (el.type === 'range') el.addEventListener('change', () => Sound.play('small'));
    });
    document.querySelector('[data-fx-test="sound"]')?.addEventListener('click', () => Sound.play('done'));
    document.querySelector('[data-fx-test="win"]')?.addEventListener('click', (e) => {
      const r = e.currentTarget.getBoundingClientRect(); last = { x: r.left + r.width / 2, y: r.top };
      win(30, 'paid');
    });
    document.querySelector('[data-fx-reset]')?.addEventListener('click', () => {
      prefs = { ...PREF_DEFAULTS }; savePrefs(); Sound.volume(prefs.volume); setGame(true); setSoundOn(true); syncPanel();
    });
    syncPanel();
  }

  // Clock: smooth sweeping second hand, digital time, greeting.
  function initClock() {
    const root = document.getElementById('msClock');
    if (!root) return;
    const ticks = root.querySelector('.ms-clock-ticks');
    for (let i = 0; i < 60; i++) {
      const hour = i % 5 === 0;
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', '60'); l.setAttribute('x2', '60');
      l.setAttribute('y1', hour ? '7' : '8'); l.setAttribute('y2', hour ? '15' : '11');
      l.setAttribute('transform', `rotate(${i * 6} 60 60)`);
      if (hour) l.classList.add('is-hour');
      ticks.appendChild(l);
    }
    const H = root.querySelector('.ms-clock-h'), M = root.querySelector('.ms-clock-m'), Sg = root.querySelector('.ms-clock-s');
    const hm = document.getElementById('msClockHM'), sec = document.getElementById('msClockS');
    const date = document.getElementById('msClockDate'), hello = document.getElementById('msClockHello');
    let lastSec = -1;
    const frame = () => {
      const now = new Date();
      const s = now.getSeconds() + (calm ? 0 : now.getMilliseconds() / 1000);
      const m = now.getMinutes() + s / 60;
      const h = (now.getHours() % 12) + m / 60;
      Sg.setAttribute('transform', `rotate(${s * 6} 60 60)`);
      M.setAttribute('transform', `rotate(${m * 6} 60 60)`);
      H.setAttribute('transform', `rotate(${h * 30} 60 60)`);
      if (now.getSeconds() !== lastSec) {
        lastSec = now.getSeconds();
        const fr = document.documentElement.lang === 'fr';
        const p2 = (n) => String(n).padStart(2, '0');
        hm.innerHTML = `${p2(now.getHours())}<span class="ms-colon">:</span>${p2(now.getMinutes())}`;
        sec.textContent = p2(now.getSeconds());
        date.textContent = now.toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { weekday: 'long', day: 'numeric', month: 'long' });
        const hr = now.getHours();
        hello.textContent = t(hr < 12 ? 'admin.clock.morning' : hr < 18 ? 'admin.clock.afternoon' : 'admin.clock.evening');
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  // Sign-in button: one span per letter (the animation staggers them), in the current language.
  function buildJoin() {
    document.querySelectorAll('.ms-join-char[data-chars]').forEach((box) => {
      const text = t(box.dataset.chars);
      box.innerHTML = '';
      Array.from(text).forEach((ch, i) => {
        const sp = document.createElement('span');
        const c = ch === ' ' ? '\u00a0' : ch;
        sp.dataset.label = c; sp.textContent = c; sp.style.setProperty('--i', String(i + 1));
        box.appendChild(sp);
      });
    });
  }

  // Tables and chart cards: give each row/card its place in the cascade.
  function stagger() {
    document.querySelectorAll('#adminDashboard .admin-table tbody').forEach((tb) => {
      Array.from(tb.children).forEach((tr, i) => tr.style.setProperty('--i', String(Math.min(i, 14))));
    });
    document.querySelectorAll('#adminDashboard .home-charts').forEach((g) => {
      Array.from(g.children).forEach((c, i) => c.style.setProperty('--i', String(i)));
    });
  }
  function initStagger() {
    const dash = document.getElementById('adminDashboard');
    if (!dash) return;
    stagger();
    let pending = 0;
    const mo = new MutationObserver(() => { cancelAnimationFrame(pending); pending = requestAnimationFrame(stagger); });
    dash.querySelectorAll('.admin-table').forEach((tb) => mo.observe(tb, { childList: true, subtree: true }));
  }

  const boot = () => { initGameSwitch(); initClock(); buildJoin(); initStagger(); initPanel(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  document.addEventListener('magicstick:langchange', buildJoin);

  window.MagicFX = { win, setXP, hit, sound: (name, arg) => Sound.play(name, arg) };
})();
