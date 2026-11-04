// Area picker popup (quote.html and book.html): "Which area are you in?",
// then "Good news, we clean {zone}" with the first-cleaning offer (20% off,
// owner's offer of Nov 4, 2026, applied by the server / the owner's quote).
// The chosen area fills the form's area field. Shown once per browser session.
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
          <button type="button" class="zone-btn zone-btn-claim" data-close>${t('zone.claimOffer')}</button>
        </div>
        <button type="button" class="zone-skip" data-close>${t('zone.later')}</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  const close = () => {
    wrap.classList.remove('show');
    try { sessionStorage.setItem('magicstick_zone_seen', '1'); } catch (_) { /* ignore */ }
    setTimeout(() => wrap.remove(), 400);
  };
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap || e.target.closest('[data-close]')) { close(); if (e.target.closest('.zone-btn-claim')) select.closest('form')?.scrollIntoView({ behavior: 'smooth' }); }
    const zb = e.target.closest('[data-zone]');
    if (!zb) return;
    select.value = zb.dataset.zone;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const zoneName = zb.dataset.zone === 'Other' ? '' : zb.textContent;
    wrap.querySelector('[data-offer]').innerHTML = zoneName ? t('zone.offerZone', { zone: zoneName }) : t('zone.offer');
    wrap.querySelector('[data-step="1"]').hidden = true;
    wrap.querySelector('[data-step="2"]').hidden = false;
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && wrap.isConnected) close(); });
  setTimeout(() => wrap.classList.add('show'), 600);
})();
