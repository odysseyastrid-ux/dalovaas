(function () {
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

  document.querySelectorAll('.admin-tabs .auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tabs .auth-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const isQuotes = tab.dataset.tab === 'quotes';
      document.getElementById('quotesPanel').hidden = !isQuotes;
      document.getElementById('bookingsPanel').hidden = isQuotes;
    });
  });

  function statusSelect(current, options, onchange) {
    const select = document.createElement('select');
    select.className = 'status-select';
    options.forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt.replace(/_/g, ' ');
      if (opt === current) o.selected = true;
      select.appendChild(o);
    });
    select.addEventListener('change', () => onchange(select.value));
    return select;
  }

  async function loadQuotes() {
    const { data, error } = await supabase
      .from('quote_requests')
      .select('*')
      .order('created_at', { ascending: false });
    const tbody = document.querySelector('#quotesTable tbody');
    tbody.innerHTML = '';
    if (error || !data) return;
    data.forEach((q) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${new Date(q.created_at).toLocaleDateString()}</td>
        <td>${q.name}</td>
        <td>${q.contact}</td>
        <td>${q.service}</td>
        <td>${q.frequency}</td>
        <td>${q.zone || '—'}</td>
        <td>${q.message || '—'}</td>
        <td class="status-cell"></td>
      `;
      tr.querySelector('.status-cell').appendChild(
        statusSelect(q.status, QUOTE_STATUSES, async (value) => {
          await supabase.from('quote_requests').update({ status: value }).eq('id', q.id);
        })
      );
      tbody.appendChild(tr);
    });
  }

  async function loadBookings() {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, services(name)')
      .order('requested_date', { ascending: false });
    const tbody = document.querySelector('#bookingsTable tbody');
    tbody.innerHTML = '';
    if (error || !data) return;
    data.forEach((b) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${b.requested_date}</td>
        <td>${b.time_window}</td>
        <td>${b.guest_name}</td>
        <td>${b.guest_contact}</td>
        <td>${b.services?.name ?? b.service_id}</td>
        <td>${b.zone || '—'}</td>
        <td>$${(b.deposit_cents / 100).toFixed(2)}${b.paid_at ? ' ✓ paid' : ''}</td>
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

  async function showDashboard() {
    dashboard.hidden = false;
    loadQuotes();
    loadBookings();
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
    showDashboard();
  }
  checkAccess();

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const note = document.getElementById('adminLoginNote');
    note.textContent = 'Signing in...';
    const { error } = await supabase.auth.signInWithPassword({
      email: document.getElementById('adminEmail').value.trim(),
      password: document.getElementById('adminPassword').value,
    });
    if (error) {
      note.textContent = error.message;
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
