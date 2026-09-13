(function () {
  const t = (key, vars) => (window.MagicstickI18N ? window.MagicstickI18N.t(key, vars) : key);
  const lang = () => (window.MagicstickI18N ? window.MagicstickI18N.getLang() : 'en');

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
        <td>${new Date(q.created_at).toLocaleDateString()}</td>
        <td>${q.name}</td>
        <td>${q.contact}</td>
        <td>${q.service}</td>
        <td>${q.frequency}</td>
        <td>${q.zone || '—'}</td>
        <td>${formatHome(q)}</td>
        <td>${q.preferred_date || '—'}</td>
        <td>${q.pets || '—'}</td>
        <td class="files-cell"></td>
        <td>${q.message || '—'}</td>
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
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${b.requested_date}</td>
        <td>${b.time_window}</td>
        <td>${b.guest_name}</td>
        <td>${b.guest_contact}</td>
        <td>${serviceName}</td>
        <td>${b.zone || '—'}</td>
        <td>$${(b.deposit_cents / 100).toFixed(2)}${b.paid_at ? ' ✓' : ''}</td>
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
        <td>${name}</td>
        <td class="category-cell"></td>
        <td class="price-cell"></td>
        <td class="deposit-cell"></td>
        <td>${s.duration_minutes} ${t('admin.services.minutes')}</td>
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

  document.addEventListener('magicstick:langchange', () => {
    renderQuotes();
    renderBookings();
    fillCategoryPicker();
    renderServices();
  });

  async function showDashboard() {
    dashboard.hidden = false;
    loadQuotes();
    loadBookings();
    await loadCategories();
    loadServices();
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
