(function () {
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
      document.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = tab.dataset.tab === 'login';
      loginForm.hidden = !isLogin;
      signupForm.hidden = isLogin;
    });
  });

  const STATUS_LABELS = {
    pending_payment: 'Awaiting payment',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  async function loadBookings() {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, services(name)')
      .order('requested_date', { ascending: false });
    const list = document.getElementById('bookingsList');
    if (error) {
      list.textContent = 'Could not load your bookings right now.';
      return;
    }
    if (!data.length) {
      list.innerHTML = `<p class="fine">No bookings yet. <a href="booking.html">Book your first cleaning</a>.</p>`;
      return;
    }
    list.innerHTML = data.map((b) => `
      <div class="booking-card">
        <div>
          <div class="booking-card-service">${b.services?.name ?? b.service_id}</div>
          <div class="fine">${b.requested_date} · ${b.time_window}</div>
        </div>
        <span class="status-pill status-${b.status}">${STATUS_LABELS[b.status] ?? b.status}</span>
      </div>
    `).join('');
  }

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
    note.textContent = 'Signing in...';
    const { data, error } = await supabase.auth.signInWithPassword({
      email: document.getElementById('loginEmail').value.trim(),
      password: document.getElementById('loginPassword').value,
    });
    if (error) {
      note.textContent = error.message;
      return;
    }
    showDashboard(data.user);
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const note = document.getElementById('signupNote');
    note.textContent = 'Creating your account...';
    const { data, error } = await supabase.auth.signUp({
      email: document.getElementById('signupEmail').value.trim(),
      password: document.getElementById('signupPassword').value,
      options: { data: { full_name: document.getElementById('signupName').value.trim() } },
    });
    if (error) {
      note.textContent = error.message;
      return;
    }
    if (data.user && !data.session) {
      note.textContent = 'Account created! Check your email to confirm, then log in.';
      return;
    }
    showDashboard(data.user);
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });
})();
