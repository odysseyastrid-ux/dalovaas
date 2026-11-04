// Area picker popup (quote.html and book.html): "Which area are you in?",
// then "Good news, we clean {zone}" with the first-cleaning offer (20% off,
// owner's offer of Nov 4, 2026, applied by the server / the owner's quote).
// Step 3 asks for a name + email or phone (lead capture for offers, saved by
// submit-form "lead" ONLY if the consent box is ticked: CASL). The chosen area
// fills the form's area field. Shown once per browser session.
(function () {
  const i18n = window.MagicstickI18N;
  const t = (k, v) => (i18n ? i18n.t(k, v) : k);
  const select = document.getElementById('qZone') || document.getElementById('bZone');
  if (!select) return;
  try { if (sessionStorage.getItem('magicstick_zone_seen')) return; } catch (_) { /* private mode: show it */ }

  const wrap = document.createElement('div');
  wrap.className = 'zone-backdrop';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.innerHTML = `
    <div class="zone-modal">
      <button type="button" class="zone-modal-close" data-close aria-label="${t('zone.dismiss')}">&times;</button>
      <div data-step="1">
        <h2>${t('zone.title1')}</h2>
        <p>${t('zone.desc1')}</p>
        <div class="zone-buttons">
          <button type="button" class="zone-btn" data-zone="Rockland-Orléans">${t('zone.rockland')}</button>
          <button type="button" class="zone-btn" data-zone="Ottawa-Gatineau">${t('zone.ottawaGatineau')}</button>
        </div>
        <button type="button" class="zone-skip" data-zone="Other">${t('zone.skip')}</button>
      </div>
      <div data-step="2" hidden>
        <h2>${t('zone.title2')}</h2>
        <p class="zone-offer" data-offer></p>
        <div class="zone-buttons">
          <button type="button" class="zone-btn zone-btn-claim" data-next>${t('zone.claimOffer')}</button>
        </div>
        <button type="button" class="zone-skip" data-close>${t('zone.later')}</button>
      </div>
      <div data-step="3" hidden>
        <h2>${t('lead.title')}</h2>
        <p>${t('lead.desc')}</p>
        <form class="zone-lead-form" novalidate>
          <label class="zone-field"><span>${t('form.name')}</span><input name="name" maxlength="120" autocomplete="name" required></label>
          <label class="zone-field"><span>${t('form.email')}</span><input name="email" type="email" maxlength="200" autocomplete="email"></label>
          <label class="zone-field"><span>${t('lead.phoneOr')}</span><input name="phone" type="tel" maxlength="40" autocomplete="tel" inputmode="tel"></label>
          <label class="zone-consent"><input type="checkbox" name="consent"> <span>${t('lead.consent')}</span></label>
          <input type="text" name="company" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true">
          <p class="zone-lead-err" role="alert" hidden></p>
          <button type="submit" class="zone-btn zone-btn-claim">${t('lead.submit')}</button>
        </form>
        <button type="button" class="zone-skip" data-close>${t('lead.skip')}</button>
      </div>
      <div data-step="4" hidden>
        <h2>${t('lead.thanksTitle')}</h2>
        <p>${t('lead.thanks')}</p>
        <div class="zone-buttons">
          <button type="button" class="zone-btn zone-btn-claim" data-close data-scroll>${t('lead.continue')}</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  let close = () => {
    wrap.classList.remove('show');
    try { sessionStorage.setItem('magicstick_zone_seen', '1'); } catch (_) { /* ignore */ }
    setTimeout(() => wrap.remove(), 400);
  };
  const step = (n) => wrap.querySelectorAll('[data-step]').forEach((d) => { d.hidden = d.dataset.step !== String(n); });
  let chosenZone = '';
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap || e.target.closest('[data-close]')) { close(); if (e.target.closest('[data-scroll]')) select.closest('form')?.scrollIntoView({ behavior: 'smooth' }); return; }
    if (e.target.closest('[data-next]')) { step(3); wrap.querySelector('input[name="name"]').focus(); return; }
    const zb = e.target.closest('[data-zone]');
    if (!zb) return;
    chosenZone = zb.dataset.zone;
    select.value = zb.dataset.zone;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const zoneName = zb.dataset.zone === 'Other' ? '' : zb.textContent;
    wrap.querySelector('[data-offer]').innerHTML = zoneName ? t('zone.offerZone', { zone: zoneName }) : t('zone.offer');
    step(2);
  });

  const leadForm = wrap.querySelector('.zone-lead-form');
  const leadErr = wrap.querySelector('.zone-lead-err');
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = leadForm.elements;
    const name = f.name.value.trim();
    const email = f.email.value.trim();
    const phone = f.phone.value.trim();
    const fail = (k) => { leadErr.textContent = t(k); leadErr.hidden = false; };
    leadErr.hidden = true;
    if (!name) return fail('form.nameErr');
    if ((!email && !phone) || (email && !isEmail(email)) || (phone && phone.replace(/\D/g, '').length < 10)) return fail('lead.contactErr');
    if (!f.consent.checked) return fail('lead.consentErr');
    // Prefill the page's own form so the visitor doesn't type it twice.
    const fill = (ids, v) => { if (!v) return; for (const id of ids) { const el = document.getElementById(id); if (el && !el.value) { el.value = v; break; } } };
    fill(['qName', 'bName'], name); fill(['qEmail', 'bEmail'], email); fill(['qPhone', 'bPhone'], phone);
    const cfg = window.MAGICSTICK_CONFIG || {};
    const btn = leadForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      if (!cfg.FUNCTIONS_URL) throw new Error('offline');
      const res = await fetch(`${cfg.FUNCTIONS_URL}/submit-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form: 'lead', lang: i18n ? i18n.getLang() : 'en', name, email, phone, zone: chosenZone,
          consent: true, page: location.pathname, company: f.company.value }),
      });
      if (!res.ok) throw new Error(String(res.status));
      step(4);
    } catch (_) {
      fail('lead.sendErr');
    } finally {
      btn.disabled = false;
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && wrap.isConnected) close(); });
  // While the popup is open, the cookie notice waits underneath (it comes back after).
  const cookie = () => document.getElementById('cookieBanner');
  const hideCookie = () => { const c = cookie(); if (c) c.classList.add('zone-hidden'); };
  const showCookie = () => { const c = cookie(); if (c) c.classList.remove('zone-hidden'); };
  const origClose = close;
  close = () => { showCookie(); origClose(); };
  setTimeout(() => { hideCookie(); wrap.classList.add('show'); }, 600);
})();
