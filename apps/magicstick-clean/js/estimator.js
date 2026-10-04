// Instant quote estimator for the homepage. Self-contained, no backend call:
// rates mirror the live services (hourly, 3-hour minimum). It gives a live
// ballpark and funnels visitors into the real booking or quote flow.
(function () {
  'use strict';
  const mount = document.getElementById('estimatorMount');
  if (!mount) return;

  const I18N = window.MagicstickI18N;
  const t = (k, v) => (I18N ? I18N.t(k, v) : k);
  const lang = () => (I18N ? I18N.getLang() : 'en');
  const esc = (v) => (I18N ? I18N.escapeHtml(v) : String(v == null ? '' : v));

  // Hourly rate in dollars, 3-hour minimum. recurring = eligible for the 9% plan.
  const SERVICES = [
    { id: 'standard', rate: 33, recurring: true,  en: 'Standard Cleaning',          fr: 'Nettoyage standard' },
    { id: 'deep',     rate: 43, recurring: false, en: 'Deep Cleaning',              fr: 'Nettoyage en profondeur' },
    { id: 'airbnb',   rate: 33, recurring: true,  en: 'Airbnb / Short-term rental', fr: 'Airbnb / court terme' },
    { id: 'commercial', rate: 33, recurring: true, en: 'Commercial Cleaning',       fr: 'Nettoyage commercial' },
    { id: 'windows',  rate: 28.05, recurring: false, en: 'Window & Glass (15% off)', fr: 'Fenêtres et vitres (15% de rabais)' },
    { id: 'post-construction', rate: 50, recurring: false, en: 'Post-Construction',  fr: 'Post-construction' },
    { id: 'move-in-out', rate: 50, recurring: false, en: 'Move-In / Move-Out',       fr: 'Déménagement (entrée/sortie)' },
  ];
  const MIN_HOURS = 3;
  const MAX_HOURS = 12;
  const RECURRING_OFF = 0.09; // 9%

  let serviceId = 'standard';
  let hours = MIN_HOURS;
  let recurring = false;

  function money(v) {
    const n = Math.round(v);
    return lang() === 'fr' ? `${n} $` : `$${n}`;
  }
  function svc() { return SERVICES.find((s) => s.id === serviceId) || SERVICES[0]; }
  function name(s) { return lang() === 'fr' ? s.fr : s.en; }

  function render() {
    const s = svc();
    if (!s.recurring) recurring = false;
    const rate = recurring ? s.rate * (1 - RECURRING_OFF) : s.rate;
    const total = rate * hours;

    mount.innerHTML = `
      <div class="est-card">
        <div class="est-fields">
          <label class="est-field">
            <span class="est-label">${esc(t('est.service'))}</span>
            <select id="estService" class="est-select">
              ${SERVICES.map((x) => `<option value="${esc(x.id)}" ${x.id === serviceId ? 'selected' : ''}>${esc(name(x))} — ${esc(money(x.rate))}/h</option>`).join('')}
            </select>
          </label>

          <div class="est-field">
            <span class="est-label">${esc(t('est.hours'))}</span>
            <div class="est-stepper">
              <button type="button" class="est-step" id="estMinus" aria-label="-">−</button>
              <span class="est-hours" id="estHours">${hours}</span>
              <button type="button" class="est-step" id="estPlus" aria-label="+">+</button>
            </div>
            <span class="est-hint">${esc(t('est.minNote'))}</span>
          </div>

          <div class="est-field">
            <span class="est-label">${esc(t('est.frequency'))}</span>
            <div class="est-freq">
              <button type="button" class="est-pill ${recurring ? '' : 'is-on'}" data-freq="one">${esc(t('est.oneTime'))}</button>
              <button type="button" class="est-pill ${recurring ? 'is-on' : ''}" data-freq="rec" ${s.recurring ? '' : 'disabled'}>${esc(t('est.recurring'))}</button>
            </div>
            ${s.recurring ? '' : `<span class="est-hint">${esc(t('est.recurringNa'))}</span>`}
          </div>
        </div>

        <div class="est-result">
          <span class="est-result-label">${esc(t('est.estimate'))}</span>
          <span class="est-amount">${esc(money(total))}</span>
          <span class="est-breakdown">${esc(money(rate))}/h × ${hours}${esc(t('est.hoursShort'))}${recurring ? ' · ' + esc(t('est.saved9')) : ''}</span>
          <span class="est-disclaimer">${esc(t('est.disclaimer'))}</span>
          <div class="est-ctas">
            <a class="btn" href="booking.html?service=${esc(serviceId)}" data-i18n="nav.bookOnline">${esc(t('nav.bookOnline'))}</a>
            <a class="btn btn-outline" href="quote.html" data-i18n="nav.getQuote">${esc(t('nav.getQuote'))}</a>
          </div>
        </div>
      </div>`;

    document.getElementById('estService').addEventListener('change', (e) => { serviceId = e.target.value; render(); });
    document.getElementById('estMinus').addEventListener('click', () => { hours = Math.max(MIN_HOURS, hours - 1); render(); });
    document.getElementById('estPlus').addEventListener('click', () => { hours = Math.min(MAX_HOURS, hours + 1); render(); });
    mount.querySelectorAll('.est-pill[data-freq]').forEach((b) => b.addEventListener('click', () => {
      if (b.disabled) return;
      recurring = b.dataset.freq === 'rec';
      render();
    }));
  }

  render();
  document.addEventListener('magicstick:langchange', render);
})();
