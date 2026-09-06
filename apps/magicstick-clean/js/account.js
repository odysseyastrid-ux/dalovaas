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
  const authPanel = document.getElementById('authPanel');
  const dashboardPanel = document.getElementById('dashboardPanel');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach((tb) => tb.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = tab.dataset.tab === 'login';
      loginForm.hidden = !isLogin;
      signupForm.hidden = isLogin;
    });
  });

  // Best-effort translation for Supabase Auth's own English error messages.
  const AUTH_ERROR_KEYS = {
    'Invalid login credentials': 'authError.invalidCredentials',
    'User already registered': 'authError.alreadyRegistered',
  };
  function translateAuthError(message) {
    const key = AUTH_ERROR_KEYS[message];
    return key ? t(key) : message;
  }

  let lastBookings = null;

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

  document.addEventListener('magicstick:langchange', () => renderBookings());

  async function showDashboard(user) {
    authPanel.hidden = true;
    dashboardPanel.hidden = false;
    document.getElementById('accountEmail').textContent = user.email;
    loadBookings();
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

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const note = document.getElementById('loginNote');
    note.textContent = t('account.login.note.signingIn');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: document.getElementById('loginEmail').value.trim(),
      password: document.getElementById('loginPassword').value,
    });
    if (error) {
      note.textContent = translateAuthError(error.message);
      return;
    }
    showDashboard(data.user);
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const note = document.getElementById('signupNote');
    note.textContent = t('account.signup.note.creating');
    const { data, error } = await supabase.auth.signUp({
      email: document.getElementById('signupEmail').value.trim(),
      password: document.getElementById('signupPassword').value,
      options: { data: { full_name: document.getElementById('signupName').value.trim() } },
    });
    if (error) {
      note.textContent = translateAuthError(error.message);
      return;
    }
    if (data.user && !data.session) {
      note.textContent = t('account.signup.note.checkEmail');
      return;
    }
    showDashboard(data.user);
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });
})();
