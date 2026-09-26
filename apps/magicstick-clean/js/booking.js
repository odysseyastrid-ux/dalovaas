(function () {
  const t = (key, vars) => (window.MagicstickI18N ? window.MagicstickI18N.t(key, vars) : key);
  const lang = () => (window.MagicstickI18N ? window.MagicstickI18N.getLang() : 'en');
  const esc = (v) => (window.MagicstickI18N ? window.MagicstickI18N.escapeHtml(v) : String(v ?? ''));

  const backend = window.MagicstickBackend;
  const backendNotice = document.getElementById('backendNotice');
  const statusBanner = document.getElementById('statusBanner');
  const form = document.getElementById('bookingForm');
  const paymentStep = document.getElementById('paymentStep');

  // Handle the redirect back from a payment method that required leaving
  // the page (some wallets/banks do; card payments usually resolve without
  // ever navigating away — see confirmPayment below).
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');
  if (status === 'success') {
    statusBanner.hidden = false;
    statusBanner.textContent = t('booking.status.success');
  } else if (status === 'cancelled') {
    statusBanner.hidden = false;
    statusBanner.classList.remove('notice-success');
    statusBanner.textContent = t('booking.status.cancelled');
  }

  if (!backend || !backend.isBackendConfigured()) {
    backendNotice.hidden = false;
    return;
  }

  const supabase = backend.getSupabaseClient();
  const bDateDisplay = document.getElementById('bDateDisplay');
  const bDateHidden = document.getElementById('bDate');
  if (bDateDisplay && bDateHidden && window.MagicstickDatePicker) {
    window.MagicstickDatePicker.attach(bDateDisplay, bDateHidden);
  }

  let services = [];
  let selectedServiceId = null;
  let addons = [];
  // Selected extras: addon id -> quantity (flat add-ons use qty 1 when on).
  const addonQty = new Map();
  // Home size: bedrooms / bathrooms / half_bathrooms -> count.
  const sizeCount = { bedrooms: 0, bathrooms: 0, half_bathrooms: 0 };
  const SIZE_MAX = 20;

  function centsToDollars(cents) {
    return (cents / 100).toFixed(2);
  }

  function addonName(addon) {
    return (lang() === 'fr' && addon.name_fr) ? addon.name_fr : addon.name;
  }
  function addonDescription(addon) {
    return (lang() === 'fr' && addon.description_fr) ? addon.description_fr : addon.description;
  }
  function addonUnitLabel(addon) {
    const price = centsToDollars(addon.price_cents);
    switch (addon.unit) {
      case 'window': return t('booking.extras.perWindow', { price });
      case 'room': return t('booking.extras.perRoom', { price });
      case 'load': return t('booking.extras.perLoad', { price });
      case 'hour': return t('booking.extras.perHour', { price });
      default: return t('booking.extras.each', { price });
    }
  }

  // Sum of selected extras, priced from the loaded add-ons (the server
  // re-prices authoritatively — this is only the on-screen estimate).
  function addonsCents() {
    let cents = 0;
    addons.forEach((a) => {
      const qty = addonQty.get(a.id) || 0;
      if (qty > 0) cents += a.price_cents * (a.unit === 'flat' ? 1 : qty);
    });
    return cents;
  }

  // The [{ id, qty }] payload the booking function expects.
  function selectedAddonsPayload() {
    const out = [];
    addons.forEach((a) => {
      const qty = addonQty.get(a.id) || 0;
      if (qty > 0) out.push({ id: a.id, qty: a.unit === 'flat' ? 1 : qty });
    });
    return out;
  }

  function serviceName(service) {
    return (lang() === 'fr' && service.name_fr) ? service.name_fr : service.name;
  }
  function serviceDescription(service) {
    return (lang() === 'fr' && service.description_fr) ? service.description_fr : service.description;
  }

  function renderServiceOptions() {
    const container = document.getElementById('serviceOptions');
    container.innerHTML = '';
    const requestedServiceId = params.get('service');
    const preselectedId = services.some((s) => s.id === requestedServiceId) ? requestedServiceId : services[0]?.id;
    services.forEach((service) => {
      const label = document.createElement('label');
      label.className = 'service-option';
      label.innerHTML = `
        <input type="radio" name="serviceId" value="${esc(service.id)}" ${service.id === preselectedId ? 'checked' : ''}>
        <span class="service-option-body">
          <span class="service-option-name">${esc(serviceName(service))}</span>
          <span class="service-option-desc">${esc(serviceDescription(service))}</span>
          <span class="service-option-price">${esc(t('booking.priceFrom', { price: centsToDollars(service.first_booking_price_cents) }))} <s>${esc(centsToDollars(service.base_price_cents))}$</s> · ${esc(t('booking.depositToday', { deposit: centsToDollars(service.deposit_cents) }))}</span>
        </span>
      `;
      container.appendChild(label);
    });
    if (services.length) {
      selectedServiceId = preselectedId;
      updateDepositSummary();
    }
    container.querySelectorAll('input[name="serviceId"]').forEach((input) => {
      input.addEventListener('change', () => {
        selectedServiceId = input.value;
        updateDepositSummary();
      });
    });
  }

  function renderAddons() {
    const grid = document.getElementById('addonGrid');
    const field = document.getElementById('addonsField');
    if (!grid || !field) return;
    if (!addons.length) { field.hidden = true; return; }
    field.hidden = false;
    grid.innerHTML = '';
    addons.forEach((addon) => {
      const isFlat = addon.unit === 'flat';
      const qty = addonQty.get(addon.id) || 0;
      const card = document.createElement('div');
      card.className = 'addon-card' + (qty > 0 ? ' selected' : '');
      card.dataset.addonId = addon.id;
      const desc = addonDescription(addon);
      card.innerHTML = `
        <div class="addon-card-main">
          <span class="addon-card-name">${esc(addonName(addon))}</span>
          ${desc ? `<span class="addon-card-desc">${esc(desc)}</span>` : ''}
          <span class="addon-card-price">${esc(addonUnitLabel(addon))}</span>
        </div>
        <div class="addon-card-control">
          ${isFlat
            ? `<span class="addon-card-check" aria-hidden="true">✓</span>`
            : `<div class="stepper stepper-sm">
                 <button type="button" class="stepper-btn" data-step="-1" aria-label="${esc(t('booking.size.decrease'))}">−</button>
                 <span class="stepper-value" data-value>${qty}</span>
                 <button type="button" class="stepper-btn" data-step="1" aria-label="${esc(t('booking.size.increase'))}">+</button>
               </div>`}
        </div>
      `;
      if (isFlat) {
        card.classList.add('addon-card-toggle');
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-pressed', qty > 0 ? 'true' : 'false');
        const toggle = () => {
          const on = (addonQty.get(addon.id) || 0) > 0;
          addonQty.set(addon.id, on ? 0 : 1);
          card.classList.toggle('selected', !on);
          card.setAttribute('aria-pressed', on ? 'false' : 'true');
          updateDepositSummary();
        };
        card.addEventListener('click', toggle);
        card.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); }
        });
      } else {
        const valueEl = card.querySelector('[data-value]');
        card.querySelectorAll('.stepper-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            const step = Number(btn.dataset.step);
            const current = addonQty.get(addon.id) || 0;
            const next = Math.max(0, Math.min(50, current + step));
            addonQty.set(addon.id, next);
            valueEl.textContent = String(next);
            card.classList.toggle('selected', next > 0);
            updateDepositSummary();
          });
        });
      }
      grid.appendChild(card);
    });
  }

  function initSizeSteppers() {
    document.querySelectorAll('.size-steppers .stepper[data-size]').forEach((stepper) => {
      const key = stepper.dataset.size;
      const valueEl = stepper.querySelector('[data-value]');
      stepper.querySelectorAll('.stepper-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const step = Number(btn.dataset.step);
          sizeCount[key] = Math.max(0, Math.min(SIZE_MAX, sizeCount[key] + step));
          valueEl.textContent = String(sizeCount[key]);
        });
      });
    });
  }

  // Gift card applied on this form (checked against the server); the server
  // re-validates the code and has the final say when the booking is created.
  let appliedGift = null;
  const STRIPE_MIN_CHARGE_CENTS = 50;

  function estimateSplit(service) {
    const extras = addonsCents();
    const total = service.first_booking_price_cents + extras;
    const gift = appliedGift ? Math.min(appliedGift.balance_cents, total) : 0;
    // Extras add to the total but never to the online deposit — the deposit
    // stays the service's fixed deposit; extras are collected at the visit.
    let dueToday = Math.max(0, service.deposit_cents - gift);
    if (dueToday > 0 && dueToday < STRIPE_MIN_CHARGE_CENTS) dueToday = 0;
    return { total, extras, gift, dueToday, dueLater: total - gift - dueToday };
  }

  function updateDepositSummary() {
    const service = services.find((s) => s.id === selectedServiceId);
    const summary = document.getElementById('depositSummary');
    const submitBtn = document.getElementById('bookingSubmit');
    if (!service) { summary.textContent = ''; return; }
    // An estimate — the server re-checks eligibility (no prior booking on
    // this account) and has the final say once "Continue to payment" runs.
    const split = estimateSplit(service);
    const lines = [];
    if (split.extras > 0) {
      lines.push(`<span class="deposit-summary-extras">${esc(t('booking.extras.summary', {
        amount: centsToDollars(split.extras),
      }))}</span>`);
    }
    if (split.gift > 0) {
      lines.push(`<span class="deposit-summary-gift">${esc(t('booking.gift.summary', {
        amount: centsToDollars(split.gift), today: centsToDollars(split.dueToday), later: centsToDollars(split.dueLater),
      }))}</span>`);
    } else {
      lines.push(esc(t('booking.deposit.summary', {
        deposit: centsToDollars(service.deposit_cents),
        remaining: centsToDollars(split.total - service.deposit_cents),
      })));
    }
    lines.push(`<span class="deposit-summary-discount">${esc(t('booking.firstBooking.note', {
      rate: '37', regular: '43.50',
    }))}</span>`);
    summary.innerHTML = lines.join('<br>');
    const bookingNote = document.getElementById('bookingNote');
    bookingNote.textContent = t(split.gift > 0 && split.dueToday === 0 ? 'booking.gift.noPaymentNote' : 'booking.form.note.default');
    submitBtn.textContent = t(split.gift > 0 && split.dueToday === 0 ? 'booking.form.submitGift' : 'booking.form.submit');
  }

  const giftInput = document.getElementById('bGiftCode');
  const giftStatus = document.getElementById('bGiftStatus');
  const giftApplyBtn = document.getElementById('bGiftApply');

  giftInput.addEventListener('input', () => {
    if (appliedGift) {
      appliedGift = null;
      giftStatus.textContent = '';
      giftStatus.className = 'gift-code-status';
      updateDepositSummary();
    }
  });

  giftApplyBtn.addEventListener('click', async () => {
    const code = giftInput.value.trim();
    if (!code) return;
    giftApplyBtn.disabled = true;
    giftStatus.className = 'gift-code-status';
    giftStatus.textContent = t('booking.gift.checking');
    try {
      const res = await fetch(`${backend.config.FUNCTIONS_URL}/gift-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', code }),
      });
      const data = await res.json();
      if (res.ok && data.valid && data.balance_cents > 0) {
        appliedGift = { code: data.code, balance_cents: data.balance_cents };
        giftInput.value = data.code;
        giftStatus.textContent = t('booking.gift.valid', { balance: centsToDollars(data.balance_cents) });
        giftStatus.classList.add('ok');
      } else {
        appliedGift = null;
        giftStatus.textContent = t(res.status === 429 ? 'booking.gift.tooMany' : 'booking.gift.invalid');
        giftStatus.classList.add('error');
      }
    } catch (err) {
      console.error(err);
      giftStatus.textContent = t('booking.gift.error');
      giftStatus.classList.add('error');
    }
    giftApplyBtn.disabled = false;
    updateDepositSummary();
  });

  async function loadServices() {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    if (error || !data || !data.length) {
      backendNotice.hidden = false;
      backendNotice.querySelector('p').textContent = t('booking.notice.unavailable');
      return;
    }
    services = data;
    renderServiceOptions();
    form.hidden = false;
  }

  async function loadAddons() {
    const { data, error } = await supabase
      .from('service_addons')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    if (error || !data) return;
    addons = data;
    renderAddons();
  }

  initSizeSteppers();
  loadServices();
  loadAddons();

  document.addEventListener('magicstick:langchange', () => {
    if (services.length) {
      renderServiceOptions();
    }
    if (addons.length) {
      renderAddons();
    }
  });

  // ---------- Step 2: embedded Stripe payment ----------
  const stripePublishableKey = backend.config.STRIPE_PUBLISHABLE_KEY;
  const stripe = (window.Stripe && stripePublishableKey) ? window.Stripe(stripePublishableKey) : null;
  let elements = null;

  function renderPaymentSummary(service, result) {
    const box = document.getElementById('paymentSummary');
    const gift = result.gift_card_planned_cents || 0;
    const extras = result.addons_cents || 0;
    const totalCents = result.amount_cents + extras;
    const totalDollars = centsToDollars(totalCents);
    const depositDollars = centsToDollars(result.deposit_cents);
    const remainingDollars = centsToDollars(totalCents - result.deposit_cents - gift);
    box.innerHTML = `
      <p class="payment-summary-service">${esc(serviceName(service))}</p>
      ${result.first_booking_discount_applied
        ? `<p class="payment-summary-discount">${esc(t('booking.firstBooking.applied', { rate: '37' }))}</p>`
        : ''}
      ${extras > 0 ? `<p class="payment-summary-line payment-summary-extras">${esc(t('booking.extras.summary', { amount: centsToDollars(extras) }))}</p>` : ''}
      <p class="payment-summary-total">${esc(t('booking.payment.total', { total: totalDollars }))}</p>
      ${gift > 0 ? `<p class="payment-summary-line payment-summary-gift">${esc(t('booking.payment.gift', { amount: centsToDollars(gift) }))}</p>` : ''}
      <p class="payment-summary-line">${esc(t('booking.payment.dueToday', { deposit: depositDollars }))}</p>
      <p class="payment-summary-line">${esc(t('booking.payment.dueLater', { remaining: remainingDollars }))}</p>
    `;
  }

  async function showPaymentStep(result, service) {
    if (!stripe) {
      document.getElementById('bookingNote').textContent = t('booking.form.note.stripeUnavailable');
      return;
    }
    renderPaymentSummary(service, result);
    form.hidden = true;
    paymentStep.hidden = false;
    paymentStep.scrollIntoView({ behavior: 'smooth', block: 'start' });

    elements = stripe.elements({
      clientSecret: result.client_secret,
      appearance: {
        theme: 'flat',
        variables: {
          colorPrimary: '#0B5D52',
          colorBackground: 'transparent',
          colorText: '#1F2937',
          fontFamily: "'Inter', Arial, sans-serif",
          borderRadius: '9px',
        },
        rules: {
          '.Input': { backgroundColor: '#F2F2F2', border: '1px solid transparent', padding: '12px' },
          '.Input:focus': { border: '1px solid #0B5D52', boxShadow: 'none' },
          '.Label': { fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '4px' },
        },
      },
    });
    const paymentElement = elements.create('payment');
    paymentElement.mount('#paymentElement');
  }

  document.getElementById('paymentBackBtn').addEventListener('click', () => {
    paymentStep.hidden = true;
    form.hidden = false;
    document.getElementById('paymentNote').textContent = '';
  });

  document.getElementById('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payBtn = document.getElementById('paymentSubmitBtn');
    const note = document.getElementById('paymentNote');
    const cardholderName = document.getElementById('cardholderName').value.trim();
    if (!cardholderName) {
      note.textContent = t('booking.payment.note.needName');
      return;
    }
    payBtn.disabled = true;
    note.textContent = t('booking.payment.note.processing');

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking.html?status=success`,
        payment_method_data: { billing_details: { name: cardholderName } },
      },
      redirect: 'if_required',
    });

    if (error) {
      note.textContent = error.message || t('booking.payment.note.error');
      payBtn.disabled = false;
      return;
    }
    if (paymentIntent && paymentIntent.status === 'succeeded') {
      window.location.href = `${window.location.pathname}?status=success`;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('bookingSubmit');
    const note = document.getElementById('bookingNote');
    const name = document.getElementById('bName').value.trim();
    const contact = document.getElementById('bContact').value.trim();
    const date = document.getElementById('bDate').value;
    const time = document.getElementById('bTime').value;
    const zone = document.getElementById('bZone').value;
    const notes = document.getElementById('bNotes').value.trim();

    if (!name || !contact || !date || !selectedServiceId) {
      note.textContent = t('booking.form.note.invalid');
      return;
    }

    if (window.MagicstickConfirm) {
      const confirmed = await window.MagicstickConfirm.ask({
        title: t('booking.confirm.title'),
        body: t('booking.confirm.body'),
        confirmLabel: t('booking.confirm.confirmLabel'),
        cancelLabel: t('booking.confirm.cancelLabel'),
      });
      if (!confirmed) return;
    }

    submitBtn.disabled = true;
    note.textContent = t('booking.form.note.settingUp');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const utm = window.MagicstickUtm ? window.MagicstickUtm.get() : null;
      const notesWithUtm = utm ? `${notes}${notes ? '\n\n' : ''}[${window.MagicstickUtm.describe()}]` : notes;

      const res = await fetch(`${backend.config.FUNCTIONS_URL}/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          service_id: selectedServiceId,
          requested_date: date,
          time_window: time,
          guest_name: name,
          guest_contact: contact,
          zone,
          notes: notesWithUtm,
          bedrooms: sizeCount.bedrooms,
          bathrooms: sizeCount.bathrooms,
          half_bathrooms: sizeCount.half_bathrooms,
          addons: selectedAddonsPayload(),
          gift_card_code: appliedGift ? appliedGift.code : giftInput.value.trim(),
        }),
      });
      const result = await res.json();
      if (result.error === 'invalid_gift_card') {
        appliedGift = null;
        giftStatus.className = 'gift-code-status error';
        giftStatus.textContent = t('booking.gift.invalid');
        updateDepositSummary();
        note.textContent = t('booking.gift.invalid');
        submitBtn.disabled = false;
        giftInput.focus();
        return;
      }
      if (res.ok && result.confirmed) {
        // The gift card covered everything due today — no online payment.
        window.location.href = `${window.location.pathname}?status=success`;
        return;
      }
      if (!res.ok || !result.client_secret) {
        throw new Error(result.error || 'Could not start payment.');
      }
      const service = services.find((s) => s.id === selectedServiceId);
      submitBtn.disabled = false;
      note.textContent = '';
      await showPaymentStep(result, service);
    } catch (err) {
      console.error(err);
      note.textContent = t('booking.form.note.error');
      submitBtn.disabled = false;
    }
  });
})();
