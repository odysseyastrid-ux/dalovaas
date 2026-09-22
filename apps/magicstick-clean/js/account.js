(function () {
  const t = (key, vars) => (window.MagicstickI18N ? window.MagicstickI18N.t(key, vars) : key);
  const lang = () => (window.MagicstickI18N ? window.MagicstickI18N.getLang() : 'en');
  // bookings/quote_requests accept public inserts — never trust their
  // contents as HTML before it goes into innerHTML.
  const esc = (v) => (window.MagicstickI18N ? window.MagicstickI18N.escapeHtml(v) : String(v ?? ''));

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
            <div class="booking-card-service">${esc(serviceName)}</div>
            <div class="fine">${esc(b.requested_date)} · ${esc(b.time_window)}</div>
          </div>
          <span class="status-pill status-${esc(b.status)}">${esc(t('status.' + b.status))}</span>
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
          <div class="booking-card-service">${esc(q.service)}</div>
          <div class="fine">${esc(new Date(q.created_at).toLocaleDateString(lang() === 'fr' ? 'fr-CA' : 'en-CA'))}</div>
        </div>
        <span class="status-pill status-${esc(q.status)}">${esc(t('status.' + q.status))}</span>
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

  const resetPasswordPanel = document.getElementById('resetPasswordPanel');
  const resetPasswordForm = document.getElementById('resetPasswordForm');
  const resetPasswordNote = document.getElementById('resetPasswordNote');

  function showResetPassword() {
    authPanel.hidden = true;
    dashboardPanel.hidden = true;
    resetPasswordPanel.hidden = false;
  }

  // Clicking the link in the password-reset email brings the visitor back
  // here with a #type=recovery fragment; the Supabase client parses it into
  // a real (but reset-only-intended) session and fires this event.
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') showResetPassword();
  });

  resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('resetPassword1').value;
    const confirmPassword = document.getElementById('resetPassword2').value;
    if (newPassword !== confirmPassword) {
      resetPasswordNote.textContent = t('account.resetPassword.note.mismatch');
      return;
    }
    resetPasswordNote.textContent = t('account.resetPassword.note.saving');
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      resetPasswordNote.textContent = window.MagicstickAuthWidget.translateAuthError(t, error.message);
      return;
    }
    resetPasswordPanel.hidden = true;
    showDashboard(data.user);
  });

  async function checkSession() {
    if (window.location.hash.includes('type=recovery')) {
      showResetPassword();
      return;
    }
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
