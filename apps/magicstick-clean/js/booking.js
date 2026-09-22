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

  function centsToDollars(cents) {
    return (cents / 100).toFixed(2);
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

  function updateDepositSummary() {
    const service = services.find((s) => s.id === selectedServiceId);
    const summary = document.getElementById('depositSummary');
    if (!service) { summary.textContent = ''; return; }
    // An estimate — the server re-checks eligibility (no prior booking on
    // this account) and has the final say once "Continue to payment" runs.
    summary.innerHTML = `
      ${esc(t('booking.deposit.summary', {
        deposit: centsToDollars(service.deposit_cents),
        remaining: centsToDollars(service.first_booking_price_cents - service.deposit_cents),
      }))}
      <br><span class="deposit-summary-discount">${esc(t('booking.firstBooking.note', {
        rate: '37', regular: '43.50',
      }))}</span>
    `;
  }

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

  loadServices();

  document.addEventListener('magicstick:langchange', () => {
    if (services.length) {
      renderServiceOptions();
    }
  });

  // ---------- Step 2: embedded Stripe payment ----------
  const stripePublishableKey = backend.config.STRIPE_PUBLISHABLE_KEY;
  const stripe = (window.Stripe && stripePublishableKey) ? window.Stripe(stripePublishableKey) : null;
  let elements = null;

  function renderPaymentSummary(service, result) {
    const box = document.getElementById('paymentSummary');
    const totalDollars = centsToDollars(result.amount_cents);
    const depositDollars = centsToDollars(result.deposit_cents);
    const remainingDollars = centsToDollars(result.amount_cents - result.deposit_cents);
    box.innerHTML = `
      <p class="payment-summary-service">${esc(serviceName(service))}</p>
      ${result.first_booking_discount_applied
        ? `<p class="payment-summary-discount">${esc(t('booking.firstBooking.applied', { rate: '37' }))}</p>`
        : ''}
      <p class="payment-summary-total">${esc(t('booking.payment.total', { total: totalDollars }))}</p>
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
        }),
      });
      const result = await res.json();
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
