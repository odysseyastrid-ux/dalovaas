// pay.html: a client pays the personalized quote the owner sent them.
// The code comes from the link (?code=…) or is typed in. The amount always
// comes from the server (quote-pay function), never from the page.
// Card payment appears only when ONLINE_PAYMENTS is on in js/config.js AND the
// server says card payment is available; otherwise Interac e-Transfer.
(function () {
  const cfg = window.MAGICSTICK_CONFIG || {};
  const i18n = window.MagicstickI18N;
  const t = (k, v) => (i18n ? i18n.t(k, v) : k);
  const lang = () => (i18n ? i18n.getLang() : 'en');
  const url = cfg.FUNCTIONS_URL ? `${cfg.FUNCTIONS_URL}/quote-pay` : null;
  const CODE_RE = /^[A-HJ-NP-Z2-9]{10}$/;

  const form = document.getElementById('payLookup');
  const input = document.getElementById('payCode');
  const codeErr = document.getElementById('payCodeError');
  const result = document.getElementById('payResult');
  const $ = (id) => document.getElementById(id);
  let current = null; // { code, data }
  let stripe = null, elements = null;

  const clean = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const pretty = (c) => c.replace(/^(.{4})(.{4})(.{2})$/, '$1-$2-$3');
  const money = (cents) => new Intl.NumberFormat(lang() === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);

  function showError(el, key) { el.textContent = t(key); el.hidden = false; }

  async function call(action, code) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, code }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  function render() {
    if (!current) return;
    const d = current.data;
    $('payHello').textContent = d.first_name ? t('pay.hello', { name: d.first_name }) : t('pay.helloNoName');
    $('payService').textContent = d.service || '';
    $('payAmount').textContent = money(d.amount_cents);
    $('payNote').textContent = d.note || '';
    $('payNote').hidden = !d.note;
    document.querySelectorAll('.pay-code-inline').forEach((el) => { el.textContent = pretty(current.code); });
    $('payPaid').hidden = !d.paid;
    $('payOther').hidden = !!d.paid;
    const cardOk = !d.paid && d.card === true && cfg.ONLINE_PAYMENTS === true && !!cfg.STRIPE_PUBLISHABLE_KEY;
    $('payCard').hidden = !cardOk;
    if (cardOk && !elements) mountCard();
    result.hidden = false;
    form.hidden = true;
  }

  async function lookup(code) {
    codeErr.hidden = true;
    if (!CODE_RE.test(code)) return showError(codeErr, 'pay.err.code');
    if (!url) return showError(codeErr, 'pay.err.unavailable');
    try {
      const r = await call('get', code);
      if (r.status === 404 || r.status === 400) return showError(codeErr, 'pay.err.notFound');
      if (r.status === 429) return showError(codeErr, 'pay.err.tooMany');
      if (!r.ok) return showError(codeErr, 'pay.err.unavailable');
      current = { code, data: r.data };
      if (new URLSearchParams(location.search).get('paid') === '1' && !r.data.paid) r.data.processing = true;
      render();
      if (r.data.processing) { $('payPaid').hidden = false; $('payOther').hidden = true; $('payCard').hidden = true; }
      history.replaceState(null, '', `pay.html?code=${code}`);
    } catch (_) {
      showError(codeErr, 'pay.err.unavailable');
    }
  }

  function loadStripe() {
    return new Promise((resolve, reject) => {
      if (window.Stripe) return resolve();
      const tag = document.createElement('script');
      tag.src = 'https://js.stripe.com/v3/';
      tag.onload = resolve;
      tag.onerror = reject;
      document.head.appendChild(tag);
    });
  }

  async function mountCard() {
    const err = $('payCardError');
    try {
      await loadStripe();
      const r = await call('intent', current.code);
      if (!r.ok || !r.data.client_secret) throw new Error('intent');
      stripe = window.Stripe(cfg.STRIPE_PUBLISHABLE_KEY);
      elements = stripe.elements({ clientSecret: r.data.client_secret, locale: lang() });
      elements.create('payment').mount('#payElement');
    } catch (_) {
      $('payCard').hidden = true; // Interac stays available
    }
    $('payCardBtn').addEventListener('click', async () => {
      if (!stripe || !elements) return;
      err.hidden = true;
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${location.origin}/pay.html?code=${current.code}&paid=1` },
      });
      if (error) { err.textContent = error.message || t('pay.err.card'); err.hidden = false; }
    });
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); lookup(clean(input.value)); });
  document.addEventListener('magicstick:langchange', render);

  const fromUrl = clean(new URLSearchParams(location.search).get('code'));
  if (fromUrl) { input.value = pretty(fromUrl); lookup(fromUrl); }
})();
