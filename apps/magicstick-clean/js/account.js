(function () {
  const t = (key, vars) => (window.MagicstickI18N ? window.MagicstickI18N.t(key, vars) : key);
  const lang = () => (window.MagicstickI18N ? window.MagicstickI18N.getLang() : 'en');

  // Matrix rain background: a fixed number of columns of falling glyphs,
  // built once at load — purely decorative, no interaction.
  const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const matrixBg = document.getElementById('matrixBg');
  if (matrixBg) {
    const columnCount = Math.ceil(window.innerWidth / 22);
    for (let i = 0; i < columnCount; i++) {
      const col = document.createElement('div');
      col.className = 'matrix-column';
      col.textContent = GLYPHS;
      col.style.left = ((i / columnCount) * 100) + '%';
      col.style.animationDelay = (-Math.random() * 5).toFixed(2) + 's';
      col.style.animationDuration = (2.5 + Math.random() * 2.5).toFixed(2) + 's';
      matrixBg.appendChild(col);
    }
  }

  const backend = window.MagicstickBackend;
  const backendNotice = document.getElementById('backendNotice');

  if (!backend || !backend.isBackendConfigured()) {
    backendNotice.hidden = false;
    return;
  }

  const supabase = backend.getSupabaseClient();
  const authPanel = document.getElementById('authPanel');
  const dashboardPanel = document.getElementById('dashboardPanel');

  let lastBookings = null;
  let lastQuoteRequests = null;

  function renderBookings() {
    const list = document.getElementById('bookingsList');
    if (!lastBookings) return;
    if (!lastBookings.length) {
      list.innerHTML = `<p class="fine">${t('account.bookings.empty')}</p>`;
      return;
    }
    list.innerHTML = lastBookings.map((b) => {
      const serviceName = (lang() === 'fr' && b.services?.name_fr) ? b.services.name_fr : (b.services?.name ?? b.service_id);
      return `
        <div class="booking-card">
          <div>
            <div class="booking-card-service">${serviceName}</div>
            <div class="fine">${b.requested_date} · ${b.time_window}</div>
          </div>
          <span class="status-pill status-${b.status}">${t('status.' + b.status)}</span>
        </div>
      `;
    }).join('');
  }

  function renderQuoteRequests() {
    const list = document.getElementById('quoteRequestsList');
    if (!list || !lastQuoteRequests) return;
    if (!lastQuoteRequests.length) {
      list.innerHTML = `<p class="fine">${t('account.quoteRequests.empty')}</p>`;
      return;
    }
    list.innerHTML = lastQuoteRequests.map((q) => `
      <div class="booking-card">
        <div>
          <div class="booking-card-service">${q.service}</div>
          <div class="fine">${new Date(q.created_at).toLocaleDateString(lang() === 'fr' ? 'fr-CA' : 'en-CA')}</div>
        </div>
        <span class="status-pill status-${q.status}">${t('status.' + q.status)}</span>
      </div>
    `).join('');
  }

  async function loadBookings() {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, services(name, name_fr)')
      .order('requested_date', { ascending: false });
    const list = document.getElementById('bookingsList');
    if (error) {
      list.textContent = t('account.bookings.loadError');
      return;
    }
    lastBookings = data;
    renderBookings();
  }

  async function loadQuoteRequests() {
    const list = document.getElementById('quoteRequestsList');
    if (!list) return;
    const { data, error } = await supabase
      .from('quote_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      list.textContent = t('account.quoteRequests.loadError');
      return;
    }
    lastQuoteRequests = data;
    renderQuoteRequests();
  }

  document.addEventListener('magicstick:langchange', () => {
    renderBookings();
    renderQuoteRequests();
  });

  async function showDashboard(user) {
    authPanel.hidden = true;
    dashboardPanel.hidden = false;
    document.getElementById('accountEmail').textContent = user.email;
    loadBookings();
    loadQuoteRequests();
  }

  async function checkSession() {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user) {
      showDashboard(data.session.user);
    } else {
      authPanel.hidden = false;
    }
  }
  checkSession();

  window.MagicstickAuthWidget.initAuthWidget(document, {
    tabs: '.portal-tab',
    loginForm: '#loginForm',
    loginEmail: '#loginEmail',
    loginPassword: '#loginPassword',
    loginNote: '#loginNote',
    forgotBtn: '#forgotPasswordBtn',
    signupForm: '#signupForm',
    signupName: '#signupName',
    signupEmail: '#signupEmail',
    signupPassword: '#signupPassword',
    signupNote: '#signupNote',
    googleBtn: '#googleOAuthBtn',
    appleBtn: '#appleOAuthBtn',
  }, supabase, showDashboard);

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });
})();
