// Google reviews shown on the site (home #avis, learn-more #testimonials).
//
// REAL reviews only, copied word for word from the Google listing
// (https://www.google.com/maps?cid=8505762081586170745). Never edit a quote,
// never add one that isn't on Google. `summary` must mirror what Google shows
// (overall rating + total count), even when a review isn't quoted here.
// To add a review: copy its exact text into `text` (in the language it was
// written), and Google's own translation into `translation` if you have it.
window.MAGICSTICK_REVIEWS = {
  listingUrl: 'https://www.google.com/maps?cid=8505762081586170745',
  writeUrl: 'https://g.page/r/CXlL7jiMiQp2EBI/review',
  summary: { rating: 5.0, count: 1, checked: '2026-10-13' },
  reviews: [
    {
      author: 'Luffy M.',
      rating: 5,
      date: '2026-10',
      lang: 'en',
      text: 'I really appreciated the services; Louis was very diligent and concise. He even cleaned the areas most cleaning companies don\'t clean.',
      translation: { fr: 'J\'ai beaucoup apprécié les services ; Louis était très consciencieux et efficace. Il a même nettoyé des zones que la plupart des entreprises de nettoyage négligent.' },
    },
  ],
};

(function () {
  const t = (key, vars) => (window.MagicstickI18N ? window.MagicstickI18N.t(key, vars) : key);
  const lang = () => (window.MagicstickI18N ? window.MagicstickI18N.getLang() : 'en');
  const data = window.MAGICSTICK_REVIEWS;

  const GOOGLE_G = '<svg class="greviews-g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>';

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function stars(rating) {
    const s = el('span', 'greviews-stars');
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', t('reviews.starsAria', { rating }));
    s.textContent = '★★★★★'.slice(0, Math.round(rating)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(rating));
    return s;
  }
  function formatMonth(ym) {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(lang() === 'fr' ? 'fr-CA' : 'en-CA', { month: 'long', year: 'numeric' });
  }
  function formatRating(r) {
    return lang() === 'fr' ? r.toFixed(1).replace('.', ',') : r.toFixed(1);
  }

  function card(review) {
    const c = el('article', 'greviews-card');
    const head = el('div', 'greviews-card-head');
    head.appendChild(stars(review.rating));
    const badge = el('span', 'greviews-badge');
    badge.innerHTML = GOOGLE_G;
    badge.appendChild(document.createTextNode(t('reviews.badge')));
    head.appendChild(badge);
    c.appendChild(head);

    const translated = review.lang !== lang() && review.translation && review.translation[lang()];
    const quote = el('blockquote', 'greviews-quote');
    const p = el('p', null, translated ? review.translation[lang()] : review.text);
    quote.appendChild(p);
    c.appendChild(quote);

    if (translated) {
      const note = el('p', 'greviews-translated');
      note.appendChild(document.createTextNode(t('reviews.translatedBy', { lang: t(`reviews.lang.${review.lang}`) }) + ' · '));
      const toggle = el('button', 'greviews-original-btn', t('reviews.seeOriginal'));
      toggle.type = 'button';
      let showingOriginal = false;
      toggle.addEventListener('click', () => {
        showingOriginal = !showingOriginal;
        p.textContent = showingOriginal ? review.text : review.translation[lang()];
        p.lang = showingOriginal ? review.lang : lang();
        toggle.textContent = t(showingOriginal ? 'reviews.seeTranslation' : 'reviews.seeOriginal');
      });
      note.appendChild(toggle);
      c.appendChild(note);
    } else {
      p.lang = review.lang;
    }

    const foot = el('p', 'greviews-author');
    foot.appendChild(el('strong', null, review.author));
    foot.appendChild(el('span', null, ` · ${formatMonth(review.date)}`));
    c.appendChild(foot);
    return c;
  }

  function render(root) {
    root.innerHTML = '';
    const { summary, reviews } = data;

    const bar = el('div', 'greviews-summary');
    const left = el('div', 'greviews-summary-score');
    left.innerHTML = GOOGLE_G;
    left.appendChild(el('strong', 'greviews-score', formatRating(summary.rating)));
    const meta = el('div', 'greviews-summary-meta');
    meta.appendChild(stars(summary.rating));
    meta.appendChild(el('span', null, t(summary.count === 1 ? 'reviews.countOne' : 'reviews.count', { count: summary.count })));
    left.appendChild(meta);
    bar.appendChild(left);

    const actions = el('div', 'greviews-actions');
    const read = el('a', 'btn-outline greviews-link', t('reviews.seeOnGoogle'));
    read.href = data.listingUrl; read.target = '_blank'; read.rel = 'noopener';
    const write = el('a', 'btn greviews-write', t('reviews.write'));
    write.href = data.writeUrl; write.target = '_blank'; write.rel = 'noopener';
    actions.appendChild(read);
    actions.appendChild(write);
    bar.appendChild(actions);
    root.appendChild(bar);

    const grid = el('div', 'greviews-grid' + (reviews.length === 1 ? ' greviews-grid--single' : ''));
    reviews.forEach((r) => grid.appendChild(card(r)));
    root.appendChild(grid);

    root.appendChild(el('p', 'greviews-fine', t('reviews.fine')));
  }

  function renderAll() {
    document.querySelectorAll('[data-google-reviews]').forEach(render);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderAll);
  else renderAll();
  document.addEventListener('magicstick:langchange', renderAll);
})();
