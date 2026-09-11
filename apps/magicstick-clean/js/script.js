const t = (key, vars) => (window.MagicstickI18N ? window.MagicstickI18N.t(key, vars) : key);

// The hero's before/after proof clip is decorative background footage —
// respect prefers-reduced-motion by freezing it on the poster frame instead
// of autoplaying/looping.
const heroProofVideo = document.getElementById('heroProofVideo');
if (heroProofVideo && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  heroProofVideo.removeAttribute('autoplay');
  heroProofVideo.removeAttribute('loop');
  heroProofVideo.pause();
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
  let lightboxIndex = 0;

  function showPhoto(index){
    lightboxIndex = (index + photoButtons.length) % photoButtons.length;
    const btn = photoButtons[lightboxIndex];
    const img = btn.querySelector('img');
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = btn.dataset.captionKey ? t(btn.dataset.captionKey) : img.alt;
  }

  function openLightbox(index){
    showPhoto(index);
    lightbox.classList.add('show');
  }

  function closeLightbox(){
    lightbox.classList.remove('show');
  }

  photoButtons.forEach((btn, index) => {
    btn.addEventListener('click', () => openLightbox(index));
  });
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightboxPrev').addEventListener('click', () => showPhoto(lightboxIndex - 1));
  document.getElementById('lightboxNext').addEventListener('click', () => showPhoto(lightboxIndex + 1));
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('show')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showPhoto(lightboxIndex - 1);
    if (e.key === 'ArrowRight') showPhoto(lightboxIndex + 1);
  });
}

// Mobile menu toggle
const burger = document.getElementById('burgerBtn');
const mobileMenu = document.getElementById('mobileMenu');
burger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  burger.classList.toggle('open', isOpen);
  burger.setAttribute('aria-expanded', isOpen);
});
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  });
});
