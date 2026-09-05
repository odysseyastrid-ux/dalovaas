(function () {
  const backend = window.MagicstickBackend;
  const backendNotice = document.getElementById('backendNotice');
  const statusBanner = document.getElementById('statusBanner');
  const form = document.getElementById('bookingForm');

  // Handle the redirect back from Stripe Checkout.
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');
  if (status === 'success') {
    statusBanner.hidden = false;
    statusBanner.textContent = "Payment received! Your booking is confirmed — check your email for the details.";
  } else if (status === 'cancelled') {
    statusBanner.hidden = false;
    statusBanner.classList.remove('notice-success');
    statusBanner.textContent = 'Checkout was cancelled — no payment was taken. You can try again below.';
  }

  if (!backend || !backend.isBackendConfigured()) {
    backendNotice.hidden = false;
    return;
  }

  const supabase = backend.getSupabaseClient();
  const dateInput = document.getElementById('bDate');
  dateInput.min = new Date().toISOString().slice(0, 10);

  let services = [];
  let selectedServiceId = null;

  function centsToDollars(cents) {
    return (cents / 100).toFixed(2);
  }

  function renderServiceOptions() {
    const container = document.getElementById('serviceOptions');
    container.innerHTML = '';
    services.forEach((service, index) => {
      const label = document.createElement('label');
      label.className = 'service-option';
      label.innerHTML = `
        <input type="radio" name="serviceId" value="${service.id}" ${index === 0 ? 'checked' : ''}>
        <span class="service-option-body">
          <span class="service-option-name">${service.name}</span>
          <span class="service-option-desc">${service.description}</span>
          <span class="service-option-price">From $${centsToDollars(service.base_price_cents)} · $${centsToDollars(service.deposit_cents)} deposit today</span>
        </span>
      `;
      container.appendChild(label);
    });
    if (services.length) {
      selectedServiceId = services[0].id;
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
    summary.textContent = `Deposit due today: $${centsToDollars(service.deposit_cents)} CAD — remaining $${centsToDollars(service.base_price_cents - service.deposit_cents)} due at the appointment.`;
  }

  async function loadServices() {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    if (error || !data || !data.length) {
      backendNotice.hidden = false;
      backendNotice.querySelector('p').textContent = 'Online booking is temporarily unavailable. Please use the quote request form or call/text 343-843-7761 instead.';
      return;
    }
    services = data;
    renderServiceOptions();
    form.hidden = false;
  }

  loadServices();

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
      note.textContent = 'Please fill in your name, contact info, and a date.';
      return;
    }

    submitBtn.disabled = true;
    note.textContent = 'Setting up secure checkout...';

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const res = await fetch(`${backend.config.FUNCTIONS_URL}/create-checkout-session`, {
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
          notes,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.url) {
        throw new Error(result.error || 'Could not start checkout.');
      }
      window.location.href = result.url;
    } catch (err) {
      console.error(err);
      note.textContent = 'Something went wrong starting checkout. Please try again, or call/text 343-843-7761.';
      submitBtn.disabled = false;
    }
  });
})();
