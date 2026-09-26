(function () {
  const t = (key, vars) => (window.MagicstickI18N ? window.MagicstickI18N.t(key, vars) : key);
  const lang = () => (window.MagicstickI18N ? window.MagicstickI18N.getLang() : 'en');
  // Every value rendered below comes from quote_requests/bookings/services,
  // tables the public can insert into directly (see supabase RLS policies)
  // — never trust it as HTML. Escape before it goes into any innerHTML.
  const esc = (v) => (window.MagicstickI18N ? window.MagicstickI18N.escapeHtml(v) : String(v ?? ''));

  const backend = window.MagicstickBackend;
  const backendNotice = document.getElementById('backendNotice');

  if (!backend || !backend.isBackendConfigured()) {
    backendNotice.hidden = false;
    return;
  }

  const supabase = backend.getSupabaseClient();
  const loginForm = document.getElementById('adminLoginForm');
  const notAdminNotice = document.getElementById('notAdminNotice');
  const dashboard = document.getElementById('adminDashboard');

  const QUOTE_STATUSES = ['new', 'contacted', 'booked', 'declined'];
  const BOOKING_STATUSES = ['pending_payment', 'confirmed', 'completed', 'cancelled'];

  const AUTH_ERROR_KEYS = {
    'Invalid login credentials': 'authError.invalidCredentials',
  };
  function translateAuthError(message) {
    const key = AUTH_ERROR_KEYS[message];
    return key ? t(key) : message;
  }

  document.querySelectorAll('.admin-tabs .auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tabs .auth-tab').forEach((tb) => tb.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('quotesPanel').hidden = tab.dataset.tab !== 'quotes';
      document.getElementById('bookingsPanel').hidden = tab.dataset.tab !== 'bookings';
      document.getElementById('servicesPanel').hidden = tab.dataset.tab !== 'services';
      const extrasPanel = document.getElementById('extrasPanel');
      if (extrasPanel) extrasPanel.hidden = tab.dataset.tab !== 'extras';
    });
  });

  function statusSelect(current, options, onchange) {
    const select = document.createElement('select');
    select.className = 'status-select';
    options.forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = t('status.' + opt);
      if (opt === current) o.selected = true;
      select.appendChild(o);
    });
    select.addEventListener('change', () => onchange(select.value));
    return select;
  }

  function formatHome(q) {
    const parts = [];
    if (q.home_type) parts.push(q.home_type);
    if (q.bedrooms) parts.push(`${q.bedrooms} ${t('bed.suffix')}`);
    if (q.bathrooms) parts.push(`${q.bathrooms} ${t('bath.suffix')}`);
    return parts.length ? parts.join(', ') : '—';
  }

  let lastQuotes = null;
  let lastBookings = null;

  async function showFilesForQuote(quote, container) {
    const paths = [...(quote.photo_paths || [])];
    const hasVideo = Boolean(quote.video_path);
    if (hasVideo) paths.push(quote.video_path);
    const { data, error } = await supabase.storage.from('quote-uploads').createSignedUrls(paths, 3600);
    if (error || !data) {
      container.textContent = t('admin.files.loadError');
      return;
    }
    container.innerHTML = '';
    data.forEach((entry, index) => {
      if (!entry.signedUrl) return;
      const isVideo = hasVideo && index === data.length - 1;
      const a = document.createElement('a');
      a.href = entry.signedUrl;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = isVideo ? t('admin.files.video') : t('admin.files.photo', { n: index + 1 });
      container.appendChild(a);
    });
  }

  function filesCell(q) {
    const count = (q.photo_paths?.length || 0) + (q.video_path ? 1 : 0);
    if (!count) return document.createTextNode(t('admin.files.none'));
    const wrap = document.createElement('div');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'files-btn';
    btn.textContent = t('admin.files.view', { count });
    const links = document.createElement('div');
    links.className = 'files-links';
    links.hidden = true;
    let loaded = false;
    btn.addEventListener('click', async () => {
      links.hidden = !links.hidden;
      if (!links.hidden && !loaded) {
        loaded = true;
        links.textContent = '…';
        await showFilesForQuote(q, links);
      }
    });
    wrap.appendChild(btn);
    wrap.appendChild(links);
    return wrap;
  }

  function renderQuotes() {
    const tbody = document.querySelector('#quotesTable tbody');
    tbody.innerHTML = '';
    if (!lastQuotes) return;
    lastQuotes.forEach((q) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${esc(new Date(q.created_at).toLocaleDateString(lang() === 'fr' ? 'fr-CA' : 'en-CA'))}</td>
        <td>${esc(q.name)}</td>
        <td>${esc(q.contact)}${q.address ? `<br><span class="fine">${esc(q.address)}</span>` : ''}</td>
        <td>${esc(q.service)}</td>
        <td>${esc(q.frequency)}</td>
        <td>${esc(q.zone) || '—'}</td>
        <td>${esc(formatHome(q))}</td>
        <td>${esc(q.preferred_date) || '—'}</td>
        <td>${esc(q.pets) || '—'}</td>
        <td class="files-cell"></td>
        <td>${esc(q.message) || '—'}</td>
        <td class="status-cell"></td>
      `;
      tr.querySelector('.files-cell').appendChild(filesCell(q));
      tr.querySelector('.status-cell').appendChild(
        statusSelect(q.status, QUOTE_STATUSES, async (value) => {
          await supabase.from('quote_requests').update({ status: value }).eq('id', q.id);
        })
      );
      tbody.appendChild(tr);
    });
  }

  function renderBookings() {
    const tbody = document.querySelector('#bookingsTable tbody');
    tbody.innerHTML = '';
    if (!lastBookings) return;
    lastBookings.forEach((b) => {
      const serviceName = (lang() === 'fr' && b.services?.name_fr) ? b.services.name_fr : (b.services?.name ?? b.service_id);
      const sizeBits = [];
      if (b.bedrooms != null) sizeBits.push(`${b.bedrooms} ${t('bed.suffix')}`);
      if (b.bathrooms != null) sizeBits.push(`${b.bathrooms} ${t('bath.suffix')}`);
      if (b.half_bathrooms) sizeBits.push(`${b.half_bathrooms} ${t('halfbath.suffix')}`);
      const addonList = Array.isArray(b.addons) ? b.addons : [];
      const addonNote = addonList.length
        ? `<br><span class="fine">${esc(addonList.map((a) => `${(lang() === 'fr' && a.name_fr) ? a.name_fr : a.name}${a.unit && a.unit !== 'flat' ? ` ×${a.qty}` : ''}`).join(', '))} (+$${((b.addons_cents || 0) / 100).toFixed(2)})</span>`
        : '';
      const sizeNote = sizeBits.length ? `<br><span class="fine">${esc(sizeBits.join(' · '))}</span>` : '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${esc(b.requested_date)}</td>
        <td>${esc(b.time_window)}</td>
        <td>${esc(b.guest_name)}</td>
        <td>${esc(b.guest_contact)}</td>
        <td>${esc(serviceName)}${sizeNote}${addonNote}</td>
        <td>${esc(b.zone) || '—'}</td>
        <td>$${(b.deposit_cents / 100).toFixed(2)}${b.paid_at ? ' ✓' : ''}${b.gift_card_applied_cents ? `<br><span class="fine">${esc(t('admin.gift.bookingLine', { amount: (b.gift_card_applied_cents / 100).toFixed(2) }))}</span>` : ''}</td>
        <td class="status-cell"></td>
      `;
      tr.querySelector('.status-cell').appendChild(
        statusSelect(b.status, BOOKING_STATUSES, async (value) => {
          await supabase.from('bookings').update({ status: value }).eq('id', b.id);
        })
      );
      tbody.appendChild(tr);
    });
  }

  let currentAdminId = null;
  let lastCategories = [];
  let lastServices = null;

  async function logActivity(action, details) {
    await supabase.from('activity_logs').insert({ admin_id: currentAdminId, action, details });
  }

  function categorySelect(current, onchange) {
    const select = document.createElement('select');
    select.className = 'status-select';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = '—';
    select.appendChild(none);
    lastCategories.forEach((cat) => {
      const o = document.createElement('option');
      o.value = cat.id;
      o.textContent = lang() === 'fr' && cat.name_fr ? cat.name_fr : cat.name;
      if (cat.id === current) o.selected = true;
      select.appendChild(o);
    });
    select.addEventListener('change', () => onchange(select.value || null));
    return select;
  }

  function activeSelect(current, onchange) {
    return statusSelect(current ? 'active' : 'inactive', ['active', 'inactive'], (value) => onchange(value === 'active'));
  }

  function moneyInput(cents, onchange) {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '0.01';
    input.style.width = '90px';
    input.value = (cents / 100).toFixed(2);
    input.addEventListener('change', () => {
      const value = Math.round(parseFloat(input.value || '0') * 100);
      if (!Number.isFinite(value) || value < 0) return;
      onchange(value);
    });
    return input;
  }

  function renderServices() {
    const tbody = document.querySelector('#servicesTable tbody');
    tbody.innerHTML = '';
    if (!lastServices) return;
    lastServices.forEach((s) => {
      const name = lang() === 'fr' && s.name_fr ? s.name_fr : s.name;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${esc(name)}</td>
        <td class="category-cell"></td>
        <td class="price-cell"></td>
        <td class="deposit-cell"></td>
        <td>${esc(s.duration_minutes)} ${esc(t('admin.services.minutes'))}</td>
        <td class="active-cell"></td>
      `;
      tr.querySelector('.category-cell').appendChild(
        categorySelect(s.category_id, async (value) => {
          await supabase.from('services').update({ category_id: value }).eq('id', s.id);
          logActivity('update_service_category', `${s.id} -> ${value || '—'}`);
        })
      );
      tr.querySelector('.price-cell').appendChild(
        moneyInput(s.base_price_cents, async (cents) => {
          await supabase.from('services').update({ base_price_cents: cents }).eq('id', s.id);
          logActivity('update_service_price', `${s.id} -> $${(cents / 100).toFixed(2)}`);
        })
      );
      tr.querySelector('.deposit-cell').appendChild(
        moneyInput(s.deposit_cents, async (cents) => {
          await supabase.from('services').update({ deposit_cents: cents }).eq('id', s.id);
          logActivity('update_service_deposit', `${s.id} -> $${(cents / 100).toFixed(2)}`);
        })
      );
      tr.querySelector('.active-cell').appendChild(
        activeSelect(s.active, async (value) => {
          await supabase.from('services').update({ active: value }).eq('id', s.id);
          logActivity('update_service_status', `${s.id} -> ${value ? 'active' : 'inactive'}`);
        })
      );
      tbody.appendChild(tr);
    });
  }

  let lastAddons = null;
  const ADDON_UNITS = ['flat', 'window', 'room', 'load', 'hour'];

  function renderAddons() {
    const table = document.getElementById('addonsTable');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    if (!lastAddons) return;
    lastAddons.forEach((a) => {
      const name = lang() === 'fr' && a.name_fr ? a.name_fr : a.name;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${esc(name)}</td>
        <td>${esc(t('admin.extras.unit.' + a.unit))}</td>
        <td class="price-cell"></td>
        <td class="active-cell"></td>
      `;
      tr.querySelector('.price-cell').appendChild(
        moneyInput(a.price_cents, async (cents) => {
          await supabase.from('service_addons').update({ price_cents: cents }).eq('id', a.id);
          logActivity('update_addon_price', `${a.id} -> $${(cents / 100).toFixed(2)}`);
        })
      );
      tr.querySelector('.active-cell').appendChild(
        activeSelect(a.active, async (value) => {
          await supabase.from('service_addons').update({ active: value }).eq('id', a.id);
          logActivity('update_addon_status', `${a.id} -> ${value ? 'active' : 'inactive'}`);
        })
      );
      tbody.appendChild(tr);
    });
  }

  async function loadAddons() {
    const { data, error } = await supabase.from('service_addons').select('*').order('sort_order');
    if (error || !data) return;
    lastAddons = data;
    renderAddons();
  }

  const addAddonForm = document.getElementById('addAddonForm');
  if (addAddonForm) {
    addAddonForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const note = document.getElementById('addAddonNote');
      const name = document.getElementById('addonName').value.trim();
      const unit = document.getElementById('addonUnit').value;
      const id = slugify(name);
      if (!name || !ADDON_UNITS.includes(unit)) { note.textContent = t('admin.extras.invalid'); return; }
      const { error } = await supabase.from('service_addons').insert({
        id,
        name,
        name_fr: document.getElementById('addonNameFr').value.trim() || name,
        unit,
        price_cents: Math.round(parseFloat(document.getElementById('addonPrice').value || '0') * 100),
        sort_order: (lastAddons?.length || 0) + 1,
      });
      if (error) { note.textContent = error.message; return; }
      await logActivity('create_addon', id);
      note.textContent = t('admin.extras.added');
      e.target.reset();
      loadAddons();
    });
  }

  function fillCategoryPicker() {
    const select = document.getElementById('svcCategory');
    select.innerHTML = '';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = '—';
    select.appendChild(none);
    lastCategories.forEach((cat) => {
      const o = document.createElement('option');
      o.value = cat.id;
      o.textContent = lang() === 'fr' && cat.name_fr ? cat.name_fr : cat.name;
      select.appendChild(o);
    });
  }

  async function loadCategories() {
    const { data, error } = await supabase.from('service_categories').select('*').order('sort_order');
    if (error || !data) return;
    lastCategories = data;
    fillCategoryPicker();
  }

  async function loadServices() {
    const { data, error } = await supabase.from('services').select('*').order('sort_order');
    if (error || !data) return;
    lastServices = data;
    renderServices();
  }

  function slugify(name) {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `service-${Date.now()}`;
  }

  document.getElementById('addServiceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const note = document.getElementById('addServiceNote');
    const name = document.getElementById('svcName').value.trim();
    const id = slugify(name);
    const { error } = await supabase.from('services').insert({
      id,
      name,
      name_fr: document.getElementById('svcNameFr').value.trim(),
      description: document.getElementById('svcDescription').value.trim(),
      description_fr: document.getElementById('svcDescriptionFr').value.trim(),
      category_id: document.getElementById('svcCategory').value || null,
      base_price_cents: Math.round(parseFloat(document.getElementById('svcPrice').value || '0') * 100),
      deposit_cents: Math.round(parseFloat(document.getElementById('svcDeposit').value || '0') * 100),
      duration_minutes: parseInt(document.getElementById('svcDuration').value || '0', 10),
      sort_order: (lastServices?.length || 0) + 1,
    });
    if (error) {
      note.textContent = error.message;
      return;
    }
    await logActivity('create_service', id);
    note.textContent = t('admin.services.added');
    e.target.reset();
    loadServices();
  });

  async function loadQuotes() {
    const { data, error } = await supabase
      .from('quote_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return;
    lastQuotes = data;
    renderQuotes();
  }

  async function loadBookings() {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, services(name, name_fr)')
      .order('requested_date', { ascending: false });
    if (error || !data) return;
    lastBookings = data;
    renderBookings();
  }

  // ---------- Gift cards ----------
  const GIFT_REQUEST_STATUSES = ['new', 'contacted', 'paid', 'delivered', 'cancelled'];
  let lastGiftCards = null;
  let lastGiftRequests = null;
  const money = (cents) => `$${(cents / 100).toFixed(2)}`;

  async function callGiftCards(payload) {
    const { data: sessionData } = await supabase.auth.getSession();
    const res = await fetch(`${backend.config.FUNCTIONS_URL}/gift-cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData?.session?.access_token ?? ''}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  function renderGiftCards() {
    const tbody = document.querySelector('#giftCardsTable tbody');
    tbody.innerHTML = '';
    document.getElementById('giftCardsEmpty').hidden = Boolean(lastGiftCards && lastGiftCards.length);
    if (!lastGiftCards) return;
    lastGiftCards.forEach((g) => {
      const tr = document.createElement('tr');
      const who = (name, email) => [name, email].filter(Boolean).map(esc).join('<br>') || '—';
      tr.innerHTML = `
        <td>${esc(new Date(g.created_at).toLocaleDateString(lang() === 'fr' ? 'fr-CA' : 'en-CA'))}</td>
        <td><code class="gift-code">${esc(g.code || '—')}</code></td>
        <td>${money(g.initial_cents)}</td>
        <td><strong>${g.status === 'active' ? money(g.balance_cents) : '—'}</strong></td>
        <td>${who(g.recipient_name, g.recipient_email)}</td>
        <td>${who(g.purchaser_name, g.purchaser_email)}</td>
        <td>${esc(t('admin.gift.source.' + g.source))}</td>
        <td class="gift-status-cell">${esc(t('admin.gift.status.' + g.status))}</td>
      `;
      if (g.status === 'active') {
        const voidBtn = document.createElement('button');
        voidBtn.type = 'button';
        voidBtn.className = 'portal-link gift-void-btn';
        voidBtn.textContent = t('admin.gift.void');
        voidBtn.addEventListener('click', async () => {
          if (window.MagicstickConfirm) {
            const ok = await window.MagicstickConfirm.ask({
              title: t('admin.gift.voidConfirmTitle'),
              body: t('admin.gift.voidConfirmBody', { code: g.code, balance: money(g.balance_cents) }),
              confirmLabel: t('admin.gift.void'),
              cancelLabel: t('booking.confirm.cancelLabel'),
            });
            if (!ok) return;
          }
          try {
            await callGiftCards({ action: 'void', gift_card_id: g.id });
            logActivity('gift_card_void', { code: g.code });
            loadGiftCards();
          } catch (err) {
            console.error(err);
          }
        });
        tr.querySelector('.gift-status-cell').appendChild(document.createElement('br'));
        tr.querySelector('.gift-status-cell').appendChild(voidBtn);
      }
      tbody.appendChild(tr);
    });
  }

  function renderGiftRequests() {
    const tbody = document.querySelector('#giftRequestsTable tbody');
    tbody.innerHTML = '';
    document.getElementById('giftRequestsEmpty').hidden = Boolean(lastGiftRequests && lastGiftRequests.length);
    if (!lastGiftRequests) return;
    lastGiftRequests.forEach((r) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${esc(new Date(r.created_at).toLocaleDateString(lang() === 'fr' ? 'fr-CA' : 'en-CA'))}</td>
        <td>${esc(r.name)}</td>
        <td>${esc(r.contact)}</td>
        <td>${esc(r.amount)}</td>
        <td>${esc(r.recipient) || '—'}</td>
        <td>${esc(r.message) || '—'}</td>
        <td class="status-cell"></td>
        <td class="action-cell"></td>
      `;
      tr.querySelector('.status-cell').appendChild(
        statusSelect(r.status, GIFT_REQUEST_STATUSES, async (value) => {
          await supabase.from('gift_card_requests').update({ status: value }).eq('id', r.id);
        })
      );
      if (r.status !== 'delivered' && r.status !== 'cancelled') {
        const issueBtn = document.createElement('button');
        issueBtn.type = 'button';
        issueBtn.className = 'btn-outline gift-issue-btn';
        issueBtn.textContent = t('admin.gift.issueFromRequest');
        issueBtn.addEventListener('click', () => {
          const dollars = parseInt(String(r.amount).replace(/[^0-9]/g, ''), 10);
          document.getElementById('issueAmount').value = Number.isFinite(dollars) ? dollars : '';
          document.getElementById('issueRecipientName').value = r.recipient || '';
          document.getElementById('issueRecipientEmail').value = '';
          document.getElementById('issueBuyerName').value = r.name || '';
          document.getElementById('issueBuyerEmail').value = /@/.test(r.contact) ? r.contact : '';
          document.getElementById('issueMessage').value = r.message || '';
          document.getElementById('issueRequestId').value = r.id;
          document.getElementById('issueGiftNote').textContent = t('admin.gift.fromRequestNote', { name: r.name });
          document.getElementById('issueGiftForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        tr.querySelector('.action-cell').appendChild(issueBtn);
      }
      tbody.appendChild(tr);
    });
  }

  async function loadGiftCards() {
    const { data, error } = await supabase
      .from('gift_cards')
      .select('*')
      .neq('status', 'pending_payment')
      .order('created_at', { ascending: false });
    if (error || !data) return;
    lastGiftCards = data;
    renderGiftCards();
  }

  async function loadGiftRequests() {
    const { data, error } = await supabase
      .from('gift_card_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return;
    lastGiftRequests = data;
    renderGiftRequests();
  }

  document.getElementById('issueGiftForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const note = document.getElementById('issueGiftNote');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const dollars = Number(document.getElementById('issueAmount').value);
    if (!Number.isInteger(dollars) || dollars < 5 || dollars > 2000) {
      note.textContent = t('admin.gift.amountErr');
      return;
    }
    const sendEmail = document.getElementById('issueSendEmail').checked;
    const recipientEmail = document.getElementById('issueRecipientEmail').value.trim();
    const buyerEmail = document.getElementById('issueBuyerEmail').value.trim();
    submitBtn.disabled = true;
    note.textContent = t('admin.gift.issuing');
    try {
      const { gift_card: card } = await callGiftCards({
        action: 'issue',
        amount_cents: dollars * 100,
        recipient_name: document.getElementById('issueRecipientName').value.trim(),
        recipient_email: recipientEmail,
        purchaser_name: document.getElementById('issueBuyerName').value.trim(),
        purchaser_email: buyerEmail,
        message: document.getElementById('issueMessage').value.trim(),
        lang: document.getElementById('issueLang').value,
        request_id: document.getElementById('issueRequestId').value || undefined,
        send_email: sendEmail,
      });
      logActivity('gift_card_issue', { code: card.code, amount_cents: card.initial_cents });
      note.textContent = sendEmail && (recipientEmail || buyerEmail)
        ? t('admin.gift.issuedSent', { code: card.code, email: recipientEmail || buyerEmail })
        : t('admin.gift.issued', { code: card.code });
      e.target.reset();
      document.getElementById('issueRequestId').value = '';
      loadGiftCards();
      loadGiftRequests();
    } catch (err) {
      console.error(err);
      note.textContent = t('admin.gift.issueError');
    }
    submitBtn.disabled = false;
  });

  document.addEventListener('magicstick:langchange', () => {
    renderQuotes();
    renderBookings();
    fillCategoryPicker();
    renderServices();
    renderAddons();
    renderGiftCards();
    renderGiftRequests();
  });

  async function showDashboard() {
    dashboard.hidden = false;
    loadQuotes();
    loadBookings();
    loadGiftCards();
    loadGiftRequests();
    await loadCategories();
    loadServices();
    loadAddons();
  }

  async function checkAccess() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) {
      loginForm.hidden = false;
      return;
    }
    const { data: adminRow } = await supabase.from('admin_users').select('id').eq('id', user.id).maybeSingle();
    if (!adminRow) {
      notAdminNotice.hidden = false;
      return;
    }
    currentAdminId = adminRow.id;
    showDashboard();
  }
  checkAccess();

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const note = document.getElementById('adminLoginNote');
    note.textContent = t('account.login.note.signingIn');
    const { error } = await supabase.auth.signInWithPassword({
      email: document.getElementById('adminEmail').value.trim(),
      password: document.getElementById('adminPassword').value,
    });
    if (error) {
      note.textContent = translateAuthError(error.message);
      return;
    }
    loginForm.hidden = true;
    checkAccess();
  });

  document.getElementById('adminLogoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });
})();
