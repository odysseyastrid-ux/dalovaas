// book.html: book a Standard Cleaning and pay right away (owner's decision,
// Nov 4, 2026: only this service is booked and paid directly; the others go
// through a free personalized quote). The price shown here is only a preview:
// the quote-pay function recomputes it from the services table (floor
// $39.50/h) and returns a pay code; the client then pays on pay.html.
(function () {
  const cfg = window.MAGICSTICK_CONFIG || {};
  const i18n = window.MagicstickI18N;
  const t = (k, v) => (i18n ? i18n.t(k, v) : k);
  const lang = () => (i18n ? i18n.getLang() : 'en');
  const $ = (id) => document.getElementById(id);
  const form = $('bookForm');
  const err = $('bookError');
  const MIN_RATE = 3950;
  let rateCents = null;

  const money = (cents) => new Intl.NumberFormat(lang() === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);
  const hours = () => parseFloat($('bHours').value) || 3;
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isPhone = (v) => v.replace(/\D/g, '').length >= 10;

  function renderTotal() {
    if (rateCents === null) { $('bookTotal').textContent = '…'; return; }
    const full = Math.round(rateCents * hours());
    $('bookTotal').innerHTML = `<s>${money(full)}</s> ${money(Math.round(full * 0.8))}`;
    $('bookRate').textContent = t('book.rateLine', { hours: String(hours()).replace('.', lang() === 'fr' ? ',' : '.'), rate: money(rateCents) }) + ' · ' + t('book.firstDiscount');
  }

  async function loadRate() {
    try {
      const res = await fetch(`${cfg.SUPABASE_URL}/rest/v1/services?id=eq.standard&select=base_price_cents,duration_minutes`, {
        headers: { apikey: cfg.SUPABASE_ANON_KEY },
      });
      const [sv] = await res.json();
      rateCents = Math.max(MIN_RATE, Math.round(sv.base_price_cents / ((sv.duration_minutes || 180) / 60)));
    } catch (_) {
      rateCents = MIN_RATE;
    }
    renderTotal();
  }

  const guard = window.MagicstickFormGuard ? window.MagicstickFormGuard.attach($('bookFormGuard')) : () => 'ok';
  if (window.MagicstickDatePicker) window.MagicstickDatePicker.attach($('bDateDisplay'), $('bDate'));

  function flag(id, bad) {
    const field = $(id).closest('.field');
    if (field) field.classList.toggle('invalid', bad);
    return bad;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    const phone = $('bPhone').value.trim();
    const email = $('bEmail').value.trim();
    const date = $('bDate').value;
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const bad = [
      flag('bName', !$('bName').value.trim()),
      flag('bPhone', (!phone && !email) || (!!phone && !isPhone(phone))),
      flag('bEmail', !!email && !isEmail(email)),
      flag('bAddress', !$('bAddress').value.trim()),
      flag('bDateDisplay', !date || date < tomorrow),
    ].some(Boolean);
    if (bad) return;
    const g = guard();
    if (g === 'wrong-answer') return;
    if (!cfg.FUNCTIONS_URL) { err.textContent = t('book.err.unavailable'); err.hidden = false; return; }
    const btn = $('bookSubmit');
    btn.disabled = true;
    try {
      const res = await fetch(`${cfg.FUNCTIONS_URL}/quote-pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'book_standard', lang: lang(), name: $('bName').value.trim(), phone, email,
          address: $('bAddress').value.trim(), zone: $('bZone').value, preferred_date: date,
          preferred_time: $('bTime').value, frequency: $('bFrequency').value, hours: hours(), message: $('bMessage').value.trim(),
          website: g === 'honeypot' ? 'x' : '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.code) { location.href = `pay.html?code=${data.code}&lang=${lang()}`; return; }
      if (res.ok) { form.reset(); err.textContent = t('book.err.unavailable'); err.hidden = false; return; }
      const key = { invalid_date: 'book.dateErr', rate_limited: 'pay.err.tooMany', invalid_phone: 'form.phoneOrEmailErr', invalid_email: 'form.emailErr', invalid_contact: 'form.phoneOrEmailErr' }[data.error] || 'book.err.unavailable';
      err.textContent = t(key);
      err.hidden = false;
    } catch (_) {
      err.textContent = t('book.err.unavailable');
      err.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });

  $('bHours').addEventListener('change', renderTotal);
  document.addEventListener('magicstick:langchange', renderTotal);
  loadRate();
})();
