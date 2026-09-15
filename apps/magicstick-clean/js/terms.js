// Mobile menu toggle (same behavior as the main site)
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

// Legal-section accordion: every section starts open (a Terms page should
// be scannable without extra clicks); clicking a heading just lets a
// visitor collapse the ones they don't need right now.
document.querySelectorAll('.legal-item').forEach(item => {
  const btn = item.querySelector('.legal-q');
  btn.addEventListener('click', () => {
    const nowClosed = item.classList.toggle('closed');
    btn.setAttribute('aria-expanded', nowClosed ? 'false' : 'true');
  });
});

// Mobile table-of-contents toggle
const legalToc = document.getElementById('legalToc');
const legalTocToggle = document.getElementById('legalTocToggle');
legalTocToggle.addEventListener('click', () => {
  const isOpen = legalToc.classList.toggle('open');
  legalTocToggle.setAttribute('aria-expanded', isOpen);
});
legalToc.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    legalToc.classList.remove('open');
    legalTocToggle.setAttribute('aria-expanded', 'false');
  });
});

// Highlight the current section in the table of contents while scrolling
const legalItems = Array.from(document.querySelectorAll('.legal-item'));
const tocLinks = Array.from(legalToc.querySelectorAll('a'));
function setActiveTocLink(id) {
  tocLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
}
if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActiveTocLink(entry.target.id);
    });
  }, { rootMargin: '-100px 0px -70% 0px' });
  legalItems.forEach(item => sectionObserver.observe(item));
}

// Keyword search: filters sections by title + body text, opening any match
// so its content is visible right away.
const legalSearch = document.getElementById('legalSearch');
const legalNoResults = document.getElementById('legalNoResults');
legalSearch.addEventListener('input', () => {
  const query = legalSearch.value.trim().toLowerCase();
  let anyVisible = false;
  legalItems.forEach(item => {
    const text = item.textContent.toLowerCase();
    const matches = !query || text.includes(query);
    item.hidden = !matches;
    if (matches) {
      anyVisible = true;
      if (query) item.classList.remove('closed');
    }
  });
  legalNoResults.hidden = anyVisible;
});

// Back-to-top button + sticky CTA bar: both appear once the visitor has
// scrolled past the hero, and the sticky CTA hides again once the footer
// (with its own contact info) comes into view.
const backToTop = document.getElementById('backToTop');
const legalStickyCta = document.getElementById('legalStickyCta');
const footerEl = document.querySelector('footer');
let footerVisible = false;

if ('IntersectionObserver' in window && footerEl) {
  const footerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { footerVisible = entry.isIntersecting; });
    updateStickyCta();
  });
  footerObserver.observe(footerEl);
}

function updateStickyCta() {
  const pastHero = window.scrollY > 400;
  backToTop.hidden = !pastHero;
  backToTop.classList.toggle('show', pastHero);
  legalStickyCta.classList.toggle('show', pastHero && !footerVisible);
}
window.addEventListener('scroll', updateStickyCta, { passive: true });
updateStickyCta();

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
