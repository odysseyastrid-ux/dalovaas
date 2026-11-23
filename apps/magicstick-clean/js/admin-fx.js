// Game-feel effects for the owner dashboard only (Nov 23, 2026). The public
// site is untouched. Everything here is decoration: if this file fails to
// load, the dashboard works exactly the same.
//
//   - Every tap: a spark burst + shockwave where the finger/mouse lands, a
//     springy squash on the button, a tiny vibration where phones allow it.
//   - Wins (order done, payment, deposit, new client, contact made, growth
//     step): confetti + a floating "+XP" label (called by admin.js).
//   - XP chip in the top bar: points computed from the real work done
//     (admin.js), with a level bar; a level-up gets a full-screen celebration.
//   - Cards tilt in 3D under the pointer (mouse/trackpad) and catch the light.
//   - Menu icons pop when a tab opens.
// Reduced-motion users get no particles, no tilt, no shake: only the XP chip.
(function () {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const COLORS = ['#6B3FE6', '#2E8BE6', '#22C3A6', '#F5B83D', '#FF5DA2', '#FFFFFF'];
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
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
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

  // Small burst for every tap.
  function sparks(x, y, count = 10, spread = 46) {
    if (calm) return;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + rand(-0.3, 0.3);
      const d = rand(spread * 0.5, spread);
      const s = spawn('fx-spark', x, y, (el) => { el.style.background = pick(COLORS); });
      s.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(0)`, opacity: 0 },
      ], { duration: rand(380, 560), easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => s.remove();
    }
    const r = spawn('fx-ring', x, y);
    r.animate([
      { transform: 'translate(-50%,-50%) scale(.2)', opacity: 0.9 },
      { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 },
    ], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => r.remove();
  }

  // Confetti with gravity for wins.
  function confetti(x, y, count = 46) {
    if (calm) return;
    for (let i = 0; i < count; i++) {
      const c = spawn('fx-confetti', x, y, (el) => {
        el.style.background = pick(COLORS);
        el.style.width = `${rand(5, 9)}px`;
        el.style.height = `${rand(8, 14)}px`;
        if (Math.random() < 0.35) el.style.borderRadius = '50%';
      });
      const vx = rand(-1, 1) * rand(90, 220);
      const up = rand(140, 300);
      const spin = rand(-720, 720);
      c.animate([
        { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${vx * 0.6}px), calc(-50% - ${up}px)) rotate(${spin * 0.5}deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate(calc(-50% + ${vx}px), calc(-50% + ${rand(120, 320)}px)) rotate(${spin}deg)`, opacity: 0 },
      ], { duration: rand(1100, 1600), easing: 'cubic-bezier(.25,.6,.4,1)' }).onfinish = () => c.remove();
    }
  }

  function floatText(x, y, text) {
    const t = spawn('fx-float', x, y, (el) => { el.textContent = text; });
    t.animate([
      { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
      { transform: 'translate(-50%,-90%) scale(1.15)', opacity: 1, offset: 0.25 },
      { transform: 'translate(-50%,-260%) scale(1)', opacity: 0 },
    ], { duration: calm ? 900 : 1300, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => t.remove();
  }

  const buzz = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) { /* not allowed */ } };

  // Every tap on something you can press.
  const PRESSABLE = 'button, .btn-mini, a.btn-mini, .dash-nav-btn, .stage-chip, .care-switch, .todo-list button, .prospect-links a';
  document.addEventListener('pointerdown', (e) => {
    last = { x: e.clientX, y: e.clientY };
    const el = e.target instanceof Element ? e.target.closest(PRESSABLE) : null;
    if (!el || !el.closest('#adminDashboard')) return;
    sparks(e.clientX, e.clientY, el.classList.contains('btn-mini-go') ? 14 : 9);
    if (!calm) {
      el.classList.remove('fx-squash');
      void el.offsetWidth; // restart the animation on quick repeated taps
      el.classList.add('fx-squash');
    }
    buzz(8);
  }, { passive: true });
  document.addEventListener('animationend', (e) => {
    if (e.animationName === 'fxSquash' || e.animationName === 'fxPop') e.target.classList.remove('fx-squash', 'fx-pop');
  });

  // Menu icons pop when a section opens.
  document.addEventListener('click', (e) => {
    const nav = e.target instanceof Element ? e.target.closest('.dash-nav-btn') : null;
    if (!nav || calm) return;
    nav.classList.remove('fx-pop'); void nav.offsetWidth; nav.classList.add('fx-pop');
  });

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
        const el = ev.target instanceof Element ? ev.target.closest(TILT) : null;
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

  // XP chip: points come from admin.js (real work done), level every 250 XP.
  const LEVEL_XP = 250;
  let shownXp = null;
  function setXP(xp) {
    const chip = document.getElementById('fxXp');
    if (!chip) return;
    chip.hidden = false;
    const level = Math.floor(xp / LEVEL_XP) + 1;
    const into = xp % LEVEL_XP;
    chip.querySelector('.fx-xp-level').textContent = String(level);
    chip.querySelector('.fx-xp-points').textContent = String(xp);
    chip.querySelector('.fx-xp-fill').style.width = `${(into / LEVEL_XP) * 100}%`;
    let seen = null;
    try { seen = Number(localStorage.getItem('magicstick_admin_level')) || null; } catch (_) { /* private mode */ }
    if (seen && level > seen) levelUp(level);
    try { localStorage.setItem('magicstick_admin_level', String(level)); } catch (_) { /* private mode */ }
    if (shownXp !== null && xp > shownXp && !calm) {
      chip.classList.remove('fx-gain'); void chip.offsetWidth; chip.classList.add('fx-gain');
    }
    shownXp = xp;
  }

  function levelUp(level) {
    const banner = document.createElement('div');
    banner.className = 'fx-levelup';
    banner.setAttribute('role', 'status');
    const t = (k, v) => (window.MagicstickI18N ? window.MagicstickI18N.t(k, v) : k);
    banner.innerHTML = `<div class="fx-levelup-card"><span class="fx-levelup-kicker"></span><b></b><span class="fx-levelup-sub"></span></div>`;
    banner.querySelector('.fx-levelup-kicker').textContent = t('admin.fx.levelUp');
    banner.querySelector('b').textContent = t('admin.fx.level', { n: level });
    banner.querySelector('.fx-levelup-sub').textContent = t('admin.fx.levelSub');
    document.body.appendChild(banner);
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    confetti(cx, cy, 90);
    setTimeout(() => confetti(cx - 160, cy + 40, 40), 250);
    setTimeout(() => confetti(cx + 160, cy + 40, 40), 450);
    buzz([20, 40, 20]);
    setTimeout(() => banner.classList.add('is-out'), 2300);
    setTimeout(() => banner.remove(), 2900);
  }

  // A real win (called by admin.js after the save succeeded).
  function win(points, label) {
    const { x, y } = last;
    confetti(x, y, points >= 100 ? 80 : points >= 30 ? 50 : 26);
    floatText(x, y - 10, label || `+${points} XP`);
    buzz(points >= 100 ? [15, 30, 15] : 14);
  }

  window.MagicFX = { win, setXP, sparks, confetti };
})();
