// ActiveFoamHero — replaces the splash's WebGL warp shader with interactive
// detergent foam in the two side bands around the before/after fridge photo.
//
// Design: dense, wet, translucent foam in the site palette (violet / lavender /
// indigo / electric blue). A canvas-generated foam texture (drawn once) is
// layered across three depth planes; a handful of secondary bubbles drift up
// and react locally to the cursor. The foam is masked to the bands AROUND the
// photo and fades organically UNDER the photo's outer edges — the mask cut is
// computed from the photo's real on-screen rectangle (object-fit:contain), so
// foam and photo always meet on a soft wet seam, never a hard rectangle.
//
// No external animation library: ambient drift is CSS keyframes (transform /
// opacity only) and the cursor reaction is a hand-written critically-damped
// spring in requestAnimationFrame (equivalent to Motion's useSpring with
// stiffness 100 / damping 24 / mass 0.8). Decorative, aria-hidden, never
// intercepts clicks. Respects reduced-motion, pauses off-screen / hidden tab,
// and cleans up when the splash is dismissed.
(function () {
  const gate = document.getElementById('splashGate');
  const root = document.getElementById('splashShaderBg');
  if (!gate || !root) return;
  const photo = gate.querySelector('.splash-photo');

  const mq = (q) => window.matchMedia(q);
  const reduceMotion = mq('(prefers-reduced-motion: reduce)').matches;
  const canHover = mq('(hover: hover) and (pointer: fine)').matches;
  const isMobile = () => mq('(max-width: 640px)').matches;

  // --- Foam texture generator (drawn once per depth layer) ---------------
  // opts.base > 0 paints an opaque violet froth body (no dark gaps show
  // through); layers without base add translucent volume on top of it.
  function foamTexture(w, h, opts) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const rnd = (a, b) => a + Math.random() * (b - a);
    const TAU = Math.PI * 2;

    if (opts.base) {
      const bg = g.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, 'rgba(62,29,140,0.97)');    // indigo depth
      bg.addColorStop(0.5, 'rgba(91,47,214,0.95)');  // violet body
      bg.addColorStop(1, 'rgba(49,26,120,0.97)');    // deep indigo
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      // soft lavender volume blooms to make the body uneven, not flat
      for (let i = 0; i < opts.base; i++) {
        const r = rnd(70, 200), x = rnd(0, w), y = rnd(0, h);
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, 'rgba(176,148,246,' + rnd(0.1, 0.3).toFixed(2) + ')');
        grd.addColorStop(1, 'rgba(176,148,246,0)');
        g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
    }

    // Densely packed, heavily overlapping suds → reads as froth, not dots.
    for (let i = 0; i < opts.count; i++) {
      const r = rnd(opts.rMin, opts.rMax);
      const x = rnd(-r, w + r), y = rnd(-r, h + r);
      const grd = g.createRadialGradient(x - r * 0.32, y - r * 0.34, r * 0.06, x, y, r);
      grd.addColorStop(0, 'rgba(236,228,252,' + rnd(0.85, 0.98).toFixed(2) + ')'); // pearl crest
      grd.addColorStop(0.4, 'rgba(176,148,246,' + rnd(0.5, 0.72).toFixed(2) + ')'); // lavender
      grd.addColorStop(0.78, 'rgba(107,63,230,' + rnd(0.35, 0.55).toFixed(2) + ')'); // violet volume
      grd.addColorStop(1, 'rgba(62,29,140,0)');       // dissolve into body
      g.globalAlpha = rnd(0.55, 0.95);
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      // specular bead
      g.globalAlpha = rnd(0.4, 0.85);
      g.fillStyle = 'rgba(255,255,255,' + rnd(0.6, 0.95).toFixed(2) + ')';
      g.beginPath(); g.arc(x - r * 0.32, y - r * 0.33, r * 0.14, 0, TAU); g.fill();
      // occasional electric-blue sheen
      if (Math.random() < 0.3) {
        g.globalAlpha = rnd(0.18, 0.4);
        g.fillStyle = 'rgba(111,166,242,0.7)';
        g.beginPath(); g.arc(x + r * 0.28, y + r * 0.3, r * 0.2, 0, TAU); g.fill();
      }
    }

    // Fine wet sparkle speckle.
    if (opts.speckle) {
      g.fillStyle = 'rgba(255,255,255,0.92)';
      for (let i = 0; i < opts.speckle; i++) {
        g.globalAlpha = rnd(0.3, 0.8);
        g.beginPath(); g.arc(rnd(0, w), rnd(0, h), rnd(0.8, 2.4), 0, TAU); g.fill();
      }
    }
    g.globalAlpha = 1;
    return c.toDataURL('image/png');
  }

  // Texture resolution is capped (generated once, stretched with cover).
  const texW = Math.min(Math.round(window.innerWidth || 1280), 1500);
  const texH = Math.min(Math.round(window.innerHeight || 800), 1000);
  const mob = isMobile();

  // Three depth planes: back (opaque dense body) → front (coarse soft volume).
  const depths = [
    { cls: 'foam-depth foam-back',  amp: 6,
      tex: foamTexture(texW, texH, { base: mob ? 24 : 46, count: mob ? 420 : 820, rMin: 7, rMax: 26, speckle: mob ? 120 : 260 }) },
    { cls: 'foam-depth foam-mid',   amp: 14,
      tex: foamTexture(texW, texH, { count: mob ? 150 : 300, rMin: 16, rMax: 52 }) },
    { cls: 'foam-depth foam-front', amp: 22,
      tex: foamTexture(texW, texH, { count: mob ? 40 : 80, rMin: 40, rMax: 110 }) },
  ];

  // --- Build DOM ---------------------------------------------------------
  root.classList.add('foam-root');
  root.innerHTML = '';
  const bands = document.createElement('div');
  bands.className = 'foam-bands';
  const planes = [];
  depths.forEach((d) => {
    const amb = document.createElement('div');       // ambient drift (CSS keyframes)
    amb.className = 'foam-amb';
    const ptr = document.createElement('div');       // cursor parallax (JS transform)
    ptr.className = 'foam-ptr';
    const tex = document.createElement('div');
    tex.className = d.cls;
    tex.style.backgroundImage = 'url(' + d.tex + ')';
    ptr.appendChild(tex);
    amb.appendChild(ptr);
    bands.appendChild(amb);
    planes.push({ ptr, amp: d.amp });
  });
  root.appendChild(bands);

  // Secondary interactive bubbles (ride just above the scrim, over the seam).
  const bubbleLayer = document.createElement('div');
  bubbleLayer.className = 'foam-bubbles';
  bubbleLayer.setAttribute('aria-hidden', 'true');
  const N = mob ? 6 : 12;
  const bubbles = [];
  for (let i = 0; i < N; i++) {
    const side = i % 2 === 0 ? 'L' : 'R';
    const inner = Math.random() < 0.4;               // some bias to the inner seam
    const xPct = side === 'L'
      ? (inner ? 20 + Math.random() * 12 : Math.random() * 16)
      : (inner ? 68 + Math.random() * 12 : 84 + Math.random() * 16);
    const size = (inner ? 14 : 24) + Math.random() * (inner ? 24 : 64);
    const wrap = document.createElement('div');
    wrap.className = 'foam-bubble';
    wrap.style.left = xPct + '%';
    wrap.style.top = (6 + Math.random() * 84) + '%';
    wrap.style.width = size + 'px';
    wrap.style.height = size + 'px';
    wrap.style.setProperty('--dur', (7 + Math.random() * 7).toFixed(2) + 's');
    wrap.style.animationDelay = (-Math.random() * 12).toFixed(2) + 's';
    const innerEl = document.createElement('div');
    innerEl.className = 'bub';
    wrap.appendChild(innerEl);
    bubbleLayer.appendChild(wrap);
    bubbles.push({ el: innerEl, wrap, depth: 0.4 + Math.random() * 0.6, ox: 0, oy: 0, vx: 0, vy: 0 });
  }

  // Lavender/blue glow that trails the cursor (masked to the bands, so it
  // never recolours the fridge photo in the centre).
  const glow = document.createElement('div');
  glow.className = 'foam-glow';
  bubbleLayer.appendChild(glow);

  // Insert decorative bubble layer just above the scrim, below the content.
  const scrim = gate.querySelector('.splash-scrim');
  if (scrim && scrim.nextSibling) gate.insertBefore(bubbleLayer, scrim.nextSibling);
  else gate.appendChild(bubbleLayer);

  // --- Organic seam: mask the foam to the bands around the measured photo --
  function imageRectPct() {
    const ew = root.clientWidth || window.innerWidth;
    const eh = root.clientHeight || window.innerHeight;
    const iw = photo && photo.naturalWidth ? photo.naturalWidth : 4;
    const ih = photo && photo.naturalHeight ? photo.naturalHeight : 3;
    const scale = Math.min(ew / iw, eh / ih);
    const dw = iw * scale, dh = ih * scale;
    const left = (ew - dw) / 2, top = (eh - dh) / 2;
    return { l: left / ew * 100, r: (left + dw) / ew * 100, t: top / eh * 100, b: (top + dh) / eh * 100 };
  }
  const T = 'rgba(0,0,0,0)', K = '#000';
  function setMask(el, img, intersect) {
    el.style.webkitMaskImage = img; el.style.maskImage = img;
    el.style.webkitMaskComposite = intersect ? 'source-in' : 'source-over';
    el.style.maskComposite = intersect ? 'intersect' : 'add';
  }
  function applyMasks() {
    const r = imageRectPct();
    const ov = 7;                                   // soft overlap zone (% of axis)
    if (isMobile()) {
      // Foam hugs the bottom edge (+ a right sliver), clear of the centred text.
      const bottom = `linear-gradient(180deg,${T} 0%,${T} ${(r.b - ov).toFixed(1)}%,${K} ${(r.b + 1).toFixed(1)}%,${K} 100%)`;
      const right = `linear-gradient(90deg,${T} 0%,${T} 76%,${K} 92%,${K} 100%)`;
      setMask(bands, bottom + ',' + right);
      setMask(bubbleLayer, bottom + ',' + right);
      // Photo fades its bottom edge into the foam.
      setMask(photo, `linear-gradient(180deg,${K} 0%,${K} ${(r.b - ov).toFixed(1)}%,${T} ${r.b.toFixed(1)}%)`);
    } else {
      // Two side bands: foam fills the pillarbox and melts ~ov% under the edges.
      const band = `linear-gradient(90deg,${K} 0%,${K} ${Math.max(0, r.l - 1).toFixed(1)}%,` +
        `${T} ${(r.l + ov).toFixed(1)}%,${T} ${(r.r - ov).toFixed(1)}%,` +
        `${K} ${Math.min(100, r.r + 1).toFixed(1)}%,${K} 100%)`;
      setMask(bands, band);
      setMask(bubbleLayer, band);
      // Photo fades its L/R edges into the foam; gentle top/bottom softening
      // keeps the prior darkening. Centre (and the before/after seam) stays crisp.
      const hp = `linear-gradient(90deg,${T} ${r.l.toFixed(1)}%,${K} ${(r.l + ov).toFixed(1)}%,` +
        `${K} ${(r.r - ov).toFixed(1)}%,${T} ${r.r.toFixed(1)}%)`;
      const vp = `linear-gradient(180deg,${T} 0%,${K} 7%,${K} 93%,${T} 100%)`;
      setMask(photo, hp + ',' + vp, true);
    }
  }
  if (photo && !photo.complete) photo.addEventListener('load', applyMasks, { once: true });
  applyMasks();

  // --- Reduced motion: static composition, no listeners -------------------
  if (reduceMotion) {
    root.classList.add('foam-static'); bubbleLayer.classList.add('foam-static');
    window.addEventListener('resize', applyMasks, { passive: true });
    return;
  }

  // --- Cursor spring engine ----------------------------------------------
  // Pointer position in normalized [-1,1] from hero centre, critically-damped.
  const SK = 100, SD = 24, SM = 0.8;       // spring constants (≈ Motion useSpring)
  let targX = 0, targY = 0, curX = 0, curY = 0, velX = 0, velY = 0;
  let pointerPx = -1, pointerPy = -1;      // raw pixel pos, -1 = outside
  let rect = gate.getBoundingClientRect();
  let running = false, rafId = 0;

  const refreshRect = () => { rect = gate.getBoundingClientRect(); };

  function onMove(e) {
    pointerPx = e.clientX - rect.left;
    pointerPy = e.clientY - rect.top;
    targX = Math.max(-1, Math.min(1, (pointerPx / rect.width) * 2 - 1));
    targY = Math.max(-1, Math.min(1, (pointerPy / rect.height) * 2 - 1));
    start();
  }
  function onLeave() { targX = 0; targY = 0; pointerPx = -1; pointerPy = -1; }

  function springStep(cur, vel, target) {
    const dt = 1 / 60;
    const a = (-SK * (cur - target) - SD * vel) / SM;
    vel += a * dt; cur += vel * dt;
    return [cur, vel];
  }

  function frame() {
    [curX, velX] = springStep(curX, velX, targX);
    [curY, velY] = springStep(curY, velY, targY);

    // Depth-plane parallax (bounded; textures overscan so no edge shows).
    for (let i = 0; i < planes.length; i++) {
      const p = planes[i];
      p.ptr.style.transform = 'translate3d(' + (curX * p.amp).toFixed(2) + 'px,' + (curY * p.amp).toFixed(2) + 'px,0)';
    }

    // Local bubble repel with per-bubble inertia.
    const R = isMobile() ? 120 : 170;      // reaction radius
    const MAXP = 22;                        // max local push
    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      let fx = 0, fy = 0;
      if (pointerPx >= 0) {
        const br = b.wrap.getBoundingClientRect();
        const bx = br.left - rect.left + br.width / 2;
        const by = br.top - rect.top + br.height / 2;
        const dx = bx - pointerPx, dy = by - pointerPy;
        const dist = Math.hypot(dx, dy);
        if (dist < R && dist > 0.001) {
          const force = (1 - dist / R) * MAXP;
          fx = (dx / dist) * force;
          fy = (dy / dist) * force;
        }
      }
      const tx = fx + curX * (6 + b.depth * 10);
      const ty = fy + curY * (6 + b.depth * 10);
      const ax = (-SK * (b.ox - tx) - SD * b.vx) / SM;
      const ay = (-SK * (b.oy - ty) - SD * b.vy) / SM;
      const dt = 1 / 60;
      b.vx += ax * dt; b.ox += b.vx * dt;
      b.vy += ay * dt; b.oy += b.vy * dt;
      b.el.style.transform = 'translate3d(' + b.ox.toFixed(2) + 'px,' + b.oy.toFixed(2) + 'px,0)';
    }

    // Cursor glow.
    if (pointerPx >= 0) {
      glow.style.opacity = '0.9';
      glow.style.transform = 'translate3d(' + (pointerPx - 160) + 'px,' + (pointerPy - 160) + 'px,0)';
    } else {
      glow.style.opacity = '0';
    }

    // Stop when everything has settled and the pointer has left.
    const settled = pointerPx < 0 &&
      Math.abs(curX) < 0.001 && Math.abs(curY) < 0.001 &&
      Math.abs(velX) < 0.001 && Math.abs(velY) < 0.001 &&
      bubbles.every((b) => Math.abs(b.ox) < 0.05 && Math.abs(b.oy) < 0.05);
    if (settled) { running = false; return; }
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running || document.hidden) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

  const onResize = () => { refreshRect(); applyMasks(); };

  // --- Wire up (only where hover is available) ---------------------------
  if (canHover) {
    gate.addEventListener('pointermove', onMove, { passive: true });
    gate.addEventListener('pointerleave', onLeave, { passive: true });
  }
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('scroll', refreshRect, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (pointerPx >= 0) start(); });

  // Tear down once the splash is dismissed (class toggled by i18n/splash logic).
  const mo = new MutationObserver(() => {
    if (gate.classList.contains('splash-hide') || !document.body.contains(gate)) {
      stop();
      if (canHover) { gate.removeEventListener('pointermove', onMove); gate.removeEventListener('pointerleave', onLeave); }
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', refreshRect);
      mo.disconnect();
    }
  });
  mo.observe(gate, { attributes: true, attributeFilter: ['class'] });
})();
