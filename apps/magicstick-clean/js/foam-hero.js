// ActiveFoamHero — replaces the splash's WebGL warp shader with interactive
// detergent foam in the two side bands around the before/after fridge photo.
//
// The foam body is a real photographic texture (assets/images/foam/foam-band.jpg:
// dense wet violet / lavender / indigo suds with electric-blue glossy bubbles on a
// deep indigo ground, already in the site palette). It is layered across two depth
// planes for parallax, overlaid with a few glassy secondary bubbles and a cursor
// glow. All of it is masked to the bands AROUND the photo and fades organically
// UNDER the photo's outer edges — the mask cut is computed from the photo's real
// on-screen rectangle (object-fit:contain), so foam and photo meet on a soft wet
// seam, never a hard rectangle; the centre before/after seam stays crisp.
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

  const FOAM_SRC = 'assets/images/foam/foam-band.jpg';
  const mq = (q) => window.matchMedia(q);
  const reduceMotion = mq('(prefers-reduced-motion: reduce)').matches;
  const canHover = mq('(hover: hover) and (pointer: fine)').matches;
  const isMobile = () => mq('(max-width: 640px)').matches;

  // --- Build DOM ---------------------------------------------------------
  // Two depth planes share the one foam photo. The front plane is mirrored,
  // zoomed and softened (CSS) so it reads as nearer foam, not a visible copy.
  root.classList.add('foam-root');
  root.innerHTML = '';
  const bands = document.createElement('div');
  bands.className = 'foam-bands';
  const planeDefs = [
    { cls: 'foam-depth foam-back', amp: 6 },
    { cls: 'foam-depth foam-front', amp: 18 },
  ];
  const planes = [];
  planeDefs.forEach((d) => {
    const amb = document.createElement('div');  // ambient drift (CSS keyframes)
    amb.className = 'foam-amb';
    const ptr = document.createElement('div');  // cursor parallax (JS transform)
    ptr.className = 'foam-ptr';
    const tex = document.createElement('div');
    tex.className = d.cls;
    tex.style.backgroundImage = 'url(' + FOAM_SRC + ')';
    ptr.appendChild(tex);
    amb.appendChild(ptr);
    bands.appendChild(amb);
    planes.push({ ptr, amp: d.amp });
  });
  root.appendChild(bands);

  // Secondary glassy bubbles (ride just above the scrim, over the seam) +
  // the cursor glow. These give the local "soft matter" reaction.
  const bubbleLayer = document.createElement('div');
  bubbleLayer.className = 'foam-bubbles';
  bubbleLayer.setAttribute('aria-hidden', 'true');
  const N = isMobile() ? 6 : 12;
  const bubbles = [];
  for (let i = 0; i < N; i++) {
    const side = i % 2 === 0 ? 'L' : 'R';
    const inner = Math.random() < 0.45;              // bias some to the inner seam
    const xPct = side === 'L'
      ? (inner ? 20 + Math.random() * 12 : Math.random() * 15)
      : (inner ? 68 + Math.random() * 12 : 85 + Math.random() * 15);
    const size = (inner ? 16 : 30) + Math.random() * (inner ? 26 : 72);
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

  const glow = document.createElement('div');
  glow.className = 'foam-glow';
  bubbleLayer.appendChild(glow);

  const scrim = gate.querySelector('.splash-scrim');
  if (scrim && scrim.nextSibling) gate.insertBefore(bubbleLayer, scrim.nextSibling);
  else gate.appendChild(bubbleLayer);

  // --- Organic seam: mask foam to the bands around the measured photo -----
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
  const TR = 'rgba(0,0,0,0)', OP = '#000';
  function setMask(el, img, intersect) {
    el.style.webkitMaskImage = img; el.style.maskImage = img;
    el.style.webkitMaskComposite = intersect ? 'source-in' : 'source-over';
    el.style.maskComposite = intersect ? 'intersect' : 'add';
  }
  function applyMasks() {
    const r = imageRectPct();
    const ov = 7;                                    // soft overlap zone (% of axis)
    if (isMobile()) {
      const bottom = `linear-gradient(180deg,${TR} 0%,${TR} ${(r.b - ov).toFixed(1)}%,${OP} ${(r.b + 1).toFixed(1)}%,${OP} 100%)`;
      const right = `linear-gradient(90deg,${TR} 0%,${TR} 76%,${OP} 92%,${OP} 100%)`;
      setMask(bands, bottom + ',' + right);
      setMask(bubbleLayer, bottom + ',' + right);
      setMask(photo, `linear-gradient(180deg,${OP} 0%,${OP} ${(r.b - ov).toFixed(1)}%,${TR} ${r.b.toFixed(1)}%)`);
    } else {
      const band = `linear-gradient(90deg,${OP} 0%,${OP} ${Math.max(0, r.l - 1).toFixed(1)}%,` +
        `${TR} ${(r.l + ov).toFixed(1)}%,${TR} ${(r.r - ov).toFixed(1)}%,` +
        `${OP} ${Math.min(100, r.r + 1).toFixed(1)}%,${OP} 100%)`;
      setMask(bands, band);
      setMask(bubbleLayer, band);
      const hp = `linear-gradient(90deg,${TR} ${r.l.toFixed(1)}%,${OP} ${(r.l + ov).toFixed(1)}%,` +
        `${OP} ${(r.r - ov).toFixed(1)}%,${TR} ${r.r.toFixed(1)}%)`;
      const vp = `linear-gradient(180deg,${TR} 0%,${OP} 7%,${OP} 93%,${TR} 100%)`;
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

    // Depth-plane parallax — the foam mass itself shifts, bounded; the planes
    // overscan so no edge is ever revealed.
    for (let i = 0; i < planes.length; i++) {
      const p = planes[i];
      p.ptr.style.transform = 'translate3d(' + (curX * p.amp).toFixed(2) + 'px,' + (curY * p.amp).toFixed(2) + 'px,0)';
    }

    // Local bubble repel with per-bubble inertia (soft-matter reaction).
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

    if (pointerPx >= 0) {
      glow.style.opacity = '0.9';
      glow.style.transform = 'translate3d(' + (pointerPx - 160) + 'px,' + (pointerPy - 160) + 'px,0)';
    } else {
      glow.style.opacity = '0';
    }

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

  if (canHover) {
    gate.addEventListener('pointermove', onMove, { passive: true });
    gate.addEventListener('pointerleave', onLeave, { passive: true });
  }
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('scroll', refreshRect, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (pointerPx >= 0) start(); });

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
