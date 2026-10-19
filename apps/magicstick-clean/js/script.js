const t = (key, vars) => (window.MagicstickI18N ? window.MagicstickI18N.t(key, vars) : key);

// The homepage nav floats transparent over the hero's photo, then becomes
// the site's normal solid cream bar once it's scrolled past the hero (or
// as soon as the mobile menu opens under it, so a solid dropdown never
// hangs beneath a see-through bar).
const siteHeader = document.getElementById('siteHeader');
const headerFloatsOnPhoto = Boolean(siteHeader && siteHeader.classList.contains('header-on-photo'));
function updateHeaderScrolled() {
  if (!headerFloatsOnPhoto) return;
  const heroEl = document.querySelector('.hero');
  const threshold = heroEl ? Math.max(heroEl.offsetHeight - 120, 60) : 60;
  siteHeader.classList.toggle('scrolled', window.scrollY > threshold);
}
if (headerFloatsOnPhoto) {
  updateHeaderScrolled();
  window.addEventListener('scroll', updateHeaderScrolled, { passive: true });
}

// The hero's before/after proof clip is decorative background footage —
// respect prefers-reduced-motion by freezing it on the poster frame instead
// of autoplaying/looping.
const heroProofVideo = document.getElementById('heroProofVideo');
if (heroProofVideo && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  heroProofVideo.removeAttribute('autoplay');
  heroProofVideo.removeAttribute('loop');
  heroProofVideo.pause();
}

// "What I offer" sits below the fold, so its attention-grabbing accent-word
// mark plays on scroll-into-view rather than on page load (where it would
// already be finished by the time anyone sees it).
document.querySelectorAll('.reveal-heading').forEach((heading) => {
  if (!('IntersectionObserver' in window)) { heading.classList.add('in-view'); return; }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        heading.classList.add('in-view');
        observer.disconnect();
      }
    });
  }, { threshold: 0.4 });
  observer.observe(heading);
});

// Splash gate: dismiss on click/tap or Enter/Space, remember for the rest
// of this tab's session (see the inline script next to #splashGate in
// index.html, which hides it instantly on repeat visits before this file
// even loads).
const splashGate = document.getElementById('splashGate');
if (splashGate) {
  const dismissSplash = () => {
    splashGate.classList.add('splash-hide');
    document.documentElement.classList.remove('splash-locked');
    try { sessionStorage.setItem('magicstick_splash_seen', '1'); } catch (err) {}
    setTimeout(() => { splashGate.style.display = 'none'; }, 550);
  };
  splashGate.addEventListener('click', dismissSplash);
  splashGate.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dismissSplash();
    }
  });
}

// Smooth-scroll every in-page link ourselves, instead of relying on default
// anchor navigation (which can misbehave inside an embedded preview).
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Highlights tabs (Gallery / Testimonials): only one panel shown at a time,
// so the before/after photos and the testimonials each get their own space
// without crowding one another off the homepage.
document.querySelectorAll('.tabs-nav .tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs-nav .tab-btn').forEach(b => {
      const isActive = b === btn;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    document.querySelectorAll('.tabs-panels .tab-panel').forEach(panel => {
      const isActive = panel.id === `tab-${btn.dataset.tab}`;
      panel.classList.toggle('active', isActive);
      panel.hidden = !isActive;
    });
  });
});

// Before/after gallery: click any photo to view it full-size
const photoButtons = Array.from(document.querySelectorAll('.ba-pair .photo-btn'));
const lightbox = document.getElementById('lightbox');
if (lightbox) {
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxFig = lightbox.querySelector('.lightbox-fig');
  let lightboxIndex = 0;
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Same curves as the CSS (styles.css "FLUID LAYER"): a critically damped
  // spring by default, a little bounce only after a flick carried momentum.
  const SPRING = 'transform var(--dur-spring) var(--ease-spring), opacity .2s ease';
  const BOUNCE = 'transform var(--dur-bounce) var(--ease-bounce), opacity .2s ease';
  let navTimer = null;

  function setPhoto(index){
    lightboxIndex = (index + photoButtons.length) % photoButtons.length;
    const btn = photoButtons[lightboxIndex];
    const img = btn.querySelector('img');
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = btn.dataset.captionKey ? t(btn.dataset.captionKey) : img.alt;
  }

  function resetImg(){
    lightboxImg.style.transition = '';
    lightboxImg.style.transform = '';
    lightboxImg.style.opacity = '';
  }

  // Next leaves to the left and the new photo arrives from the right (and the
  // reverse for previous): enter and exit along the same path.
  function showPhoto(index, dir = 0, fromFlick = false){
    clearTimeout(navTimer);
    if (!dir || reduceMotion()) { resetImg(); setPhoto(index); return; }
    const dist = Math.min(window.innerWidth * 0.5, 480);
    lightboxImg.style.transition = 'transform .18s cubic-bezier(.4,0,1,1), opacity .18s ease-in';
    lightboxImg.style.transform = `translateX(${-dir * dist}px)`;
    lightboxImg.style.opacity = '0';
    navTimer = setTimeout(() => {
      setPhoto(index);
      lightboxImg.style.transition = 'none';
      lightboxImg.style.transform = `translateX(${dir * dist}px)`;
      void lightboxImg.offsetWidth;
      lightboxImg.style.transition = fromFlick ? BOUNCE : SPRING;
      lightboxImg.style.transform = 'translateX(0)';
      lightboxImg.style.opacity = '1';
    }, 180);
  }

  // The photo grows out of the thumbnail that was tapped, and shrinks back into it.
  function openLightbox(index){
    resetImg();
    setPhoto(index);
    const r = photoButtons[index].getBoundingClientRect();
    lightboxFig.style.setProperty('--lb-ox', `${r.left + r.width / 2 - lightboxFig.offsetLeft}px`);
    lightboxFig.style.setProperty('--lb-oy', `${r.top + r.height / 2 - lightboxFig.offsetTop}px`);
    lightbox.classList.add('show');
  }

  function closeLightbox(){
    clearTimeout(navTimer);
    lightbox.classList.remove('show');
    setTimeout(resetImg, 300);
  }

  photoButtons.forEach((btn, index) => {
    btn.addEventListener('click', () => openLightbox(index));
  });
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightboxPrev').addEventListener('click', () => showPhoto(lightboxIndex - 1, -1));
  document.getElementById('lightboxNext').addEventListener('click', () => showPhoto(lightboxIndex + 1, 1));

  // ---- Direct manipulation: swipe sideways to change photo, down to close ----
  // 1:1 tracking from where the photo was grabbed, a 10px dead zone before
  // committing to an axis, momentum projection at release, rubber-banding
  // past the edges, and grabbing a photo mid-animation starts from where it
  // is on screen (never jumps).
  const project = (v, d = 0.998) => (v / 1000) * d / (1 - d);
  const rubberband = (over, dim, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over));
  let drag = null;
  let suppressClick = false;

  lightboxImg.addEventListener('dragstart', (e) => e.preventDefault());
  lightboxImg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !lightbox.classList.contains('show')) return;
    clearTimeout(navTimer);
    const m = new DOMMatrixReadOnly(getComputedStyle(lightboxImg).transform);
    const opacity = parseFloat(getComputedStyle(lightboxImg).opacity) || 1;
    lightboxImg.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, bx: m.m41, by: m.m42, x: m.m41, y: m.m42, axis: null, hist: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }] };
    lightboxImg.style.transition = 'none';
    lightboxImg.style.transform = `translate(${m.m41}px, ${m.m42}px)`;
    lightboxImg.style.opacity = String(opacity);
    lightboxImg.classList.add('is-dragging');
  });

  lightboxImg.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    if (!drag.axis) {
      if (Math.hypot(dx, dy) < 10) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    drag.hist.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    if (drag.hist.length > 8) drag.hist.shift();
    if (drag.axis === 'x') {
      let x = drag.bx + dx;
      if (photoButtons.length < 2) x = rubberband(x, window.innerWidth);
      drag.x = x; drag.y = 0;
      lightboxImg.style.transform = `translateX(${x}px)`;
    } else {
      let y = drag.by + dy;
      if (y < 0) y = rubberband(y, window.innerHeight);
      drag.x = 0; drag.y = y;
      lightboxImg.style.transform = `translateY(${y}px)`;
      lightboxImg.style.opacity = String(1 - Math.min(Math.max(y, 0) / 500, 0.45));
    }
  });

  function endDrag(e){
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    lightboxImg.classList.remove('is-dragging');
    if (!d.axis) { resetImg(); return; }
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    // Release velocity from the last ~100 ms of movement (px/s).
    const last = d.hist[d.hist.length - 1];
    const first = d.hist.find((p) => last.t - p.t <= 100) || d.hist[0];
    const dt = Math.max(last.t - first.t, 1);
    const vx = ((last.x - first.x) / dt) * 1000;
    const vy = ((last.y - first.y) / dt) * 1000;

    if (d.axis === 'x' && photoButtons.length > 1) {
      // Snap to the target nearest the *projected* resting point, not the release point.
      const projected = d.x + project(vx);
      const w = window.innerWidth;
      const flick = Math.abs(vx) > 400;
      if (projected < -w / 3) return showPhoto(lightboxIndex + 1, 1, flick);
      if (projected > w / 3) return showPhoto(lightboxIndex - 1, -1, flick);
    }
    if (d.axis === 'y' && d.y + project(vy) > 180) {
      lightboxImg.style.transition = 'transform .22s cubic-bezier(.2,.7,.4,1), opacity .22s ease';
      lightboxImg.style.transform = `translateY(${Math.min(window.innerHeight * 0.6, 520)}px)`;
      lightboxImg.style.opacity = '0';
      return closeLightbox();
    }
    // Not far enough: spring back home from where it is (interruptible).
    lightboxImg.style.transition = SPRING;
    lightboxImg.style.transform = 'translate(0, 0)';
    lightboxImg.style.opacity = '1';
  }
  lightboxImg.addEventListener('pointerup', endDrag);
  lightboxImg.addEventListener('pointercancel', endDrag);

  lightbox.addEventListener('click', (e) => {
    if (suppressClick) return;
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('show')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showPhoto(lightboxIndex - 1, -1);
    if (e.key === 'ArrowRight') showPhoto(lightboxIndex + 1, 1);
  });
}

// Mobile menu toggle
const burger = document.getElementById('burgerBtn');
const mobileMenu = document.getElementById('mobileMenu');
burger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  burger.classList.toggle('open', isOpen);
  burger.setAttribute('aria-expanded', isOpen);
  if (headerFloatsOnPhoto) {
    if (isOpen) siteHeader.classList.add('scrolled');
    else updateHeaderScrolled();
  }
});
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  });
});

// Homepage contest promo: show the banner in the visitor's language.
const homeContestImg = document.getElementById('homeContestImg');
if (homeContestImg) {
  const setContestImg = () => {
    const l = window.MagicstickI18N && window.MagicstickI18N.getLang() === 'fr' ? 'fr' : 'en';
    homeContestImg.src = `assets/images/marketing/concours/concours-web-carre-${l}.webp`;
  };
  setContestImg();
  document.addEventListener('magicstick:langchange', setContestImg);
}
