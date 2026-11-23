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

  // Tabs switch only the panels named by their own group's buttons.
  document.querySelectorAll('.admin-tabs').forEach((group) => {
    const tabs = [...group.querySelectorAll('.auth-tab')];
    tabs.forEach((tab) => tab.addEventListener('click', () => {
      tabs.forEach((tb) => {
        tb.classList.toggle('active', tb === tab);
        const panel = document.getElementById(`${tb.dataset.tab}Panel`);
        if (panel) panel.hidden = tb !== tab;
      });
    }));
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
    if (q.home_size) parts.push(q.home_size);
    return parts.length ? parts.join(', ') : '—';
  }

  // Phone and email are separate since the quote form v2; older rows only
  // have `contact`. Each one is a tap-to-call / tap-to-email link.
  function contactCell(q) {
    const lines = [];
    if (q.phone) lines.push(`<a href="tel:${esc(q.phone.replace(/[^0-9+]/g, ''))}">${esc(q.phone)}</a>`);
    if (q.email) lines.push(`<a href="mailto:${esc(q.email)}">${esc(q.email)}</a>`);
    if (!lines.length) lines.push(esc(q.contact));
    if (q.address) lines.push(`<span class="fine">${esc(q.address)}</span>`);
    return lines.join('<br>');
  }

  let lastQuotes = null;

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

  // ---------- Orders (Commandes): one pipeline per client ----------
  // Stage is derived from the row: declined -> cancelled, completed_at ->
  // done, scheduled_date -> planned, paid_at -> paid, a price -> priced, else new.
  const STAGES = ['new', 'priced', 'paid', 'planned', 'done', 'cancelled'];
  const TIME_WINDOWS = ['Morning (8am–11am)', 'Midday (11am–2pm)', 'Afternoon (2pm–5pm)'];
  function stageOf(q) {
    if (q.status === 'declined') return 'cancelled';
    if (q.completed_at) return 'done';
    if (q.scheduled_date) return 'planned';
    if (q.paid_at) return 'paid';
    if (q.quoted_amount_cents) return 'priced';
    return 'new';
  }
  let orderStage = 'active';
  let orderQuery = '';
  const dateFmt = (d) => new Date(d).toLocaleDateString(lang() === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short' });
  const dayFmt = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString(lang() === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'short', day: 'numeric', month: 'short' }) : '');
  const windowLabel = (w) => {
    const i = TIME_WINDOWS.indexOf(w);
    return i >= 0 ? t(['admin.window.morning', 'admin.window.midday', 'admin.window.afternoon'][i]) : (w || '');
  };
  const serviceLabel = (s) => (window.MagicstickI18N && window.MagicstickI18N.localizeLabel
    ? window.MagicstickI18N.localizeLabel(s, ['pay.service.standardBooking', 'form.service.standard', 'form.service.moveInOut',
      'form.service.deep', 'form.service.office', 'form.service.airbnb', 'form.service.postConstruction',
      'form.service.retail', 'form.service.windows', 'form.service.notSure'])
    : (s || ''));

  async function updateQuote(q, patch) {
    const { error } = await supabase.from('quote_requests').update(patch).eq('id', q.id);
    if (error) { alert(t('admin.orders.saveError')); return false; }
    Object.assign(q, patch);
    renderQuotes();
    renderHome();
    pingAutomations();
    return true;
  }

  function renderStageChips() {
    const box = document.getElementById('stageChips');
    if (!box) return;
    const counts = { active: 0 };
    STAGES.forEach((s) => { counts[s] = 0; });
    (lastQuotes || []).forEach((q) => {
      const s = stageOf(q);
      counts[s] += 1;
      if (s !== 'done' && s !== 'cancelled') counts.active += 1;
    });
    box.innerHTML = '';
    ['active', ...STAGES].forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `stage-chip stage-${s}${orderStage === s ? ' is-on' : ''}`;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(orderStage === s));
      b.innerHTML = `<span>${esc(t(`admin.stage.${s}`))}</span><b>${counts[s]}</b>`;
      b.addEventListener('click', () => { orderStage = s; renderQuotes(); });
      box.appendChild(b);
    });
    setBadge('orders', counts.new);
  }

  function orderActions(q, stage) {
    const wrap = document.createElement('div');
    wrap.className = 'order-actions';
    const add = (label, cls, fn) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = cls; b.textContent = label;
      b.addEventListener('click', fn);
      wrap.appendChild(b);
      return b;
    };
    if (stage !== 'cancelled' && stage !== 'done' && !q.partner_id) wrap.appendChild(priceButton(q));
    if (stage === 'paid' || stage === 'planned') {
      const plan = document.createElement('div');
      plan.className = 'order-plan';
      plan.innerHTML = `<label>${esc(t('admin.orders.confirmedDate'))}<input type="date" value="${esc(q.scheduled_date || q.preferred_date || '')}"></label>
        <select>${TIME_WINDOWS.map((w) => `<option value="${esc(w)}"${(q.scheduled_window || q.preferred_time) === w ? ' selected' : ''}>${esc(windowLabel(w))}</option>`).join('')}</select>`;
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button'; saveBtn.className = 'btn-mini';
      saveBtn.textContent = stage === 'planned' ? t('admin.orders.reschedule') : t('admin.orders.plan');
      saveBtn.addEventListener('click', () => {
        const d = plan.querySelector('input').value;
        if (!d) return;
        updateQuote(q, { scheduled_date: d, scheduled_window: plan.querySelector('select').value });
      });
      plan.appendChild(saveBtn);
      wrap.appendChild(plan);
    }
    if (stage === 'planned') add(t('admin.orders.markDone'), 'btn-mini btn-mini-go', () => (q.partner_id ? markPartnerDone(q) : updateQuote(q, { completed_at: new Date().toISOString(), status: 'booked' })));
    if (stage === 'done') {
      if (!q.partner_id) wrap.appendChild(reviewButton({ table: 'quote_requests', row: q, name: q.name, contact: q.contact, onChange: renderQuotes }));
      add(t('admin.orders.undoDone'), 'btn-mini btn-mini-ghost', () => updateQuote(q, q.partner_id && !q.paid_at ? { completed_at: null, actual_hours: null, final_amount_cents: null } : { completed_at: null }));
    }
    if (stage === 'cancelled') add(t('admin.orders.restore'), 'btn-mini btn-mini-ghost', () => updateQuote(q, { status: 'new' }));
    else if (stage !== 'done') {
      add(t('admin.orders.cancel'), 'btn-mini btn-mini-ghost', () => {
        if (confirm(t('admin.orders.cancelConfirm', { name: q.name || '' }))) updateQuote(q, { status: 'declined' });
      });
    }
    return wrap;
  }

  function renderQuotes() {
    const list = document.getElementById('ordersList');
    if (!list) return;
    renderStageChips();
    list.innerHTML = '';
    if (!lastQuotes) return;
    const qy = orderQuery.trim().toLowerCase().replace(/[-\s]/g, '');
    const rows = lastQuotes.filter((q) => {
      const s = stageOf(q);
      const inStage = orderStage === 'active' ? (s !== 'done' && s !== 'cancelled') : s === orderStage;
      if (!inStage) return false;
      if (!qy) return true;
      return [q.name, q.phone, q.email, q.contact, q.pay_code, q.address].some((v) => String(v || '').toLowerCase().replace(/[-\s]/g, '').includes(qy));
    });
    document.getElementById('ordersEmpty').hidden = rows.length > 0;
    rows.forEach((q, i) => {
      const stage = stageOf(q);
      const card = document.createElement('article');
      card.className = `order-card stage-${stage}`;
      card.style.setProperty('--i', String(Math.min(i, 12)));
      const when = q.scheduled_date
        ? `<span class="order-when is-confirmed">${esc(dayFmt(q.scheduled_date))} · ${esc(windowLabel(q.scheduled_window))}</span>`
        : q.preferred_date ? `<span class="order-when">${esc(t('admin.orders.wished'))} ${esc(dayFmt(q.preferred_date))}${q.preferred_time ? ` · ${esc(windowLabel(q.preferred_time))}` : ''}</span>` : '';
      const freqKey = { 'One-time': 'form.frequency.oneTime', Weekly: 'form.frequency.weekly', Biweekly: 'form.frequency.biweekly', Monthly: 'form.frequency.monthly' }[q.frequency];
      const facts = [serviceLabel(q.service), freqKey ? t(freqKey) : q.frequency, q.zone, formatHome(q), q.pets ? `${t('admin.col.pets')}: ${q.pets}` : ''].filter(Boolean);
      card.innerHTML = `
        <div class="order-head">
          <div><h4>${esc(q.name || '—')}</h4><span class="fine">${esc(dateFmt(q.created_at))}${q.source === 'booking' ? ` · ${esc(t('admin.quote.bookingRequest'))}` : ''}${q.pay_code ? ` · #${esc(q.pay_code.replace(/^(.{4})(.{4})(.{2})$/, '$1-$2-$3'))}` : ''}</span></div>
          <span class="stage-pill stage-${stage}">${esc(t(`admin.stage.${stage}`))}</span>
        </div>
        <p class="order-facts">${facts.map((f) => `<span>${esc(f)}</span>`).join('')}</p>
        ${when}
        ${q.quoted_amount_cents ? `<p class="order-amount">${esc(cad(amountOf(q), lang()))}${q.paid_at ? ` <span class="paid-tag">✓ ${esc(t('admin.stage.paid'))}</span>` : ''}</p>` : ''}
        <div class="order-contact">${contactCell(q)}</div>
        ${q.message ? `<p class="order-msg">${esc(q.message)}</p>` : ''}
        <div class="order-files"></div>`;
      card.querySelector('.order-files').appendChild(filesCell(q));
      if (q.partner_id) card.appendChild(partnerBlock(q, stage));
      if (stage !== 'cancelled') card.appendChild(assignBlock(q));
      card.appendChild(orderActions(q, stage));
      list.appendChild(card);
    });
  }
  document.getElementById('ordersSearch')?.addEventListener('input', (e) => { orderQuery = e.target.value; renderQuotes(); });

  // ---------- Automations: run right after a dashboard action ----------
  // The automations function also runs every 15 min on its own; this just
  // makes receipts and job sheets leave within seconds.
  let pingTimer = null;
  function pingAutomations() {
    const base = (window.MAGICSTICK_CONFIG || {}).FUNCTIONS_URL;
    if (!base) return;
    clearTimeout(pingTimer);
    pingTimer = setTimeout(() => {
      fetch(`${base}/automations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"source":"dashboard"}' })
        .then(() => setTimeout(loadQuotes, 2500))
        .catch(() => { /* the 15-minute run will catch up */ });
    }, 1200);
  }

  // ---------- Team (employees) ----------
  let lastStaff = null;
  async function loadStaff() {
    const { data, error } = await supabase.from('employees').select('*').order('name');
    if (error || !data) return;
    lastStaff = data;
    renderStaff();
    renderQuotes();
  }
  function renderStaff() {
    const ul = document.getElementById('staffList');
    if (!ul || !lastStaff) return;
    ul.innerHTML = lastStaff.length ? '' : `<li class="fine">${esc(t('admin.team.staffEmpty'))}</li>`;
    lastStaff.forEach((e, i) => {
      const li = document.createElement('li');
      li.style.setProperty('--i', String(i));
      li.className = e.active ? '' : 'is-off';
      li.innerHTML = `<div><b>${esc(e.name)}</b><span class="fine">${esc([e.email, e.phone].filter(Boolean).join(' · '))}</span></div>
        <div class="stock-ctrl"><label class="care-switch"><input type="checkbox" ${e.active ? 'checked' : ''}><span class="fine">${esc(t('admin.team.active'))}</span></label><button type="button" class="stock-del" aria-label="${esc(t('admin.care.stockDelete'))}">×</button></div>`;
      li.querySelector('input').addEventListener('change', async (ev) => {
        const { error } = await supabase.from('employees').update({ active: ev.target.checked }).eq('id', e.id);
        if (!error) { e.active = ev.target.checked; renderStaff(); renderQuotes(); }
      });
      li.querySelector('.stock-del').addEventListener('click', async () => {
        if (!confirm(t('admin.team.deleteConfirm', { name: e.name }))) return;
        const { error } = await supabase.from('employees').delete().eq('id', e.id);
        if (!error) { lastStaff = lastStaff.filter((x) => x.id !== e.id); renderStaff(); loadQuotes(); }
      });
      ul.appendChild(li);
    });
  }
  document.getElementById('staffForm')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const row = {
      name: document.getElementById('staffName').value.trim(),
      email: document.getElementById('staffEmail').value.trim().toLowerCase(),
      phone: document.getElementById('staffPhone').value.trim() || null,
    };
    if (!row.name || !row.email) return;
    const { error } = await supabase.from('employees').insert(row);
    if (error) { alert(t('admin.orders.saveError')); return; }
    ev.target.reset();
    loadStaff();
  });

  // Who does the job + what the automations already sent, on each order card.
  function assignBlock(q) {
    const box = document.createElement('div');
    box.className = 'order-assign';
    const staff = (lastStaff || []).filter((e) => e.active || e.id === q.assigned_employee_id);
    if (staff.length) {
      const sel = document.createElement('select');
      sel.innerHTML = `<option value="">${esc(t('admin.team.assignNone'))}</option>` +
        staff.map((e) => `<option value="${esc(e.id)}"${e.id === q.assigned_employee_id ? ' selected' : ''}>${esc(e.name)}</option>`).join('');
      sel.addEventListener('change', () => updateQuote(q, { assigned_employee_id: sel.value || null }));
      const lab = document.createElement('label');
      lab.innerHTML = `<span>${esc(t('admin.team.assign'))}</span>`;
      lab.appendChild(sel);
      box.appendChild(lab);
    }
    const sent = [
      [q.receipt_sent_at && q.paid_at, 'admin.auto.receipt'],
      [q.job_sheet_sent_at && q.job_sheet_employee_id, 'admin.auto.sheet'],
      [q.reminder_sent_at && q.scheduled_date, 'admin.auto.reminder'],
      [q.unpaid_reminder_at && !q.paid_at && q.quoted_at, 'admin.auto.unpaid'],
      [q.thanks_sent_at && q.completed_at, 'admin.auto.thanks'],
      [q.confirmation_date && q.confirmation_date === q.scheduled_date, 'admin.auto.confirm'],
      [q.deposit_reminder_at && !q.deposit_paid_at, 'admin.auto.depositReminder'],
      [q.deposit_receipt_at && q.deposit_paid_at, 'admin.auto.depositReceipt'],
      [q.invoice_sent_at && q.final_amount_cents, 'admin.auto.invoice'],
      [q.balance_reminder_at && !q.paid_at, 'admin.auto.balanceReminder'],
    ].filter(([on]) => on);
    if (sent.length) {
      const p = document.createElement('p');
      p.className = 'auto-sent';
      p.innerHTML = sent.map(([, k]) => `<span>✓ ${esc(t(k))}</span>`).join('');
      box.appendChild(p);
    }
    return box;
  }

  // ---------- Partner agencies (migration 0031) ----------
  // An agency books a cleaning at its own rate. Its deposit (50% by default)
  // is due BEFORE the job; the balance is invoiced from the actual hours
  // (3-hour minimum) when the job is marked done. Emails: automations function.
  let lastPartners = null;
  const amountOf = (x) => x.final_amount_cents || x.quoted_amount_cents || 0;
  const hoursNum = (v) => { const n = Number(String(v || '').replace(',', '.')); return Number.isFinite(n) ? Math.round(n * 2) / 2 : NaN; };
  async function loadPartners() {
    const { data, error } = await supabase.from('partners').select('*').order('name');
    if (error || !data) return;
    lastPartners = data;
    renderPartners();
    renderQuotes();
  }
  const partnerOf = (q) => (lastPartners || []).find((p) => p.id === q.partner_id) || null;
  function renderPartners() {
    const ul = document.getElementById('partnerList');
    if (ul && lastPartners) {
      ul.innerHTML = lastPartners.length ? '' : `<li class="fine">${esc(t('admin.partners.empty'))}</li>`;
      lastPartners.forEach((p, i) => {
        const owed = (lastQuotes || []).filter((q) => q.partner_id === p.id && q.status !== 'declined' && !q.paid_at)
          .reduce((sum, q) => sum + (q.deposit_paid_at ? amountOf(q) - (q.deposit_cents || 0) : (q.deposit_cents || 0)), 0);
        const jobs = (lastQuotes || []).filter((q) => q.partner_id === p.id && q.completed_at).length;
        const li = document.createElement('li');
        li.style.setProperty('--i', String(i));
        li.className = p.active ? '' : 'is-off';
        li.innerHTML = `<div><b>${esc(p.name)}</b><span class="fine">${esc([p.contact_name, p.email, p.phone].filter(Boolean).join(' · '))}</span>
          <span class="fine">${esc(t('admin.partners.terms', { rate: cad(p.hourly_rate_cents, lang()), pct: p.deposit_percent, days: p.payment_terms_days }))}</span>
          <span class="fine">${esc(t('admin.partners.stats', { jobs, owed: cad(Math.max(0, owed), lang()) }))}</span></div>
          <div class="stock-ctrl"><label class="care-switch"><input type="checkbox" ${p.active ? 'checked' : ''}><span class="fine">${esc(t('admin.team.active'))}</span></label></div>`;
        li.querySelector('input').addEventListener('change', async (ev) => {
          const { error } = await supabase.from('partners').update({ active: ev.target.checked }).eq('id', p.id);
          if (!error) { p.active = ev.target.checked; renderPartners(); }
        });
        ul.appendChild(li);
      });
    }
    const sel = document.getElementById('pjPartner');
    if (sel && lastPartners) {
      const keep = sel.value;
      sel.innerHTML = `<option value="">${esc(t('admin.partners.choose'))}</option>` +
        lastPartners.filter((p) => p.active).map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
      sel.value = keep;
    }
    const box = document.getElementById('partnerJobCard');
    if (box) box.hidden = !(lastPartners || []).some((p) => p.active);
    refreshPartnerJob();
  }
  document.getElementById('partnerForm')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const val = (id) => document.getElementById(id).value.trim();
    const rate = Math.round(Number(val('ptRate').replace(',', '.')) * 100);
    const row = {
      name: val('ptName'), contact_name: val('ptContact') || null, email: val('ptEmail').toLowerCase() || null,
      phone: val('ptPhone') || null, hourly_rate_cents: rate,
      deposit_percent: Math.round(Number(val('ptDeposit') || 50)), payment_terms_days: Math.round(Number(val('ptTerms') || 7)),
      lang: document.getElementById('ptLang').value === 'fr' ? 'fr' : 'en',
    };
    if (!row.name || !(rate >= 1000)) { alert(t('admin.partners.invalid')); return; }
    const { error } = await supabase.from('partners').insert(row);
    if (error) { alert(t('admin.orders.saveError')); return; }
    ev.target.reset();
    loadPartners();
  });

  // New partner job: estimate = rate x estimated hours; deposit = % of it.
  function partnerJobNumbers() {
    const p = (lastPartners || []).find((x) => x.id === document.getElementById('pjPartner')?.value);
    const h = hoursNum(document.getElementById('pjHours')?.value);
    if (!p || !(h >= 0.5)) return null;
    const est = Math.round(p.hourly_rate_cents * Math.max(3, h));
    const raw = document.getElementById('pjDeposit')?.value;
    const pct = raw === '' || raw == null ? p.deposit_percent : Math.min(100, Math.max(0, Math.round(Number(raw))));
    return { p, h, est, pct, dep: Math.round(est * pct / 100) };
  }
  function refreshPartnerJob() {
    const out = document.getElementById('pjSummary');
    if (!out) return;
    const n = partnerJobNumbers();
    out.textContent = n ? t(n.dep ? 'admin.partners.jobSummary' : 'admin.partners.jobSummaryNoDeposit', { est: cad(n.est, lang()), pct: n.pct, dep: cad(n.dep, lang()) }) : '';
  }
  ['pjDeposit', 'pjHours'].forEach((id) => document.getElementById(id)?.addEventListener('input', refreshPartnerJob));
  // Choosing a partner pre-fills its usual deposit %, which can be changed for one job.
  document.getElementById('pjPartner')?.addEventListener('change', (ev) => {
    const p = (lastPartners || []).find((x) => x.id === ev.target.value);
    const d = document.getElementById('pjDeposit');
    if (d && p) d.value = String(p.deposit_percent);
    refreshPartnerJob();
  });
  document.getElementById('partnerJobForm')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const n = partnerJobNumbers();
    const val = (id) => document.getElementById(id).value.trim();
    const date = val('pjDate');
    if (!n || !date || !val('pjAddress')) { alert(t('admin.partners.jobInvalid')); return; }
    const p = n.p;
    const row = {
      name: p.contact_name ? `${p.contact_name} (${p.name})` : p.name,
      contact: p.email || p.phone || p.name, email: p.email || null, phone: p.phone || null,
      address: val('pjAddress'), service: document.getElementById('pjService').value, frequency: 'One-time',
      message: val('pjNotes'), source: 'partner', lang: p.lang, status: 'booked',
      partner_id: p.id, hourly_rate_cents: p.hourly_rate_cents, estimated_hours: n.h,
      quoted_amount_cents: n.est, deposit_cents: n.dep, quoted_at: new Date().toISOString(),
      preferred_date: date, scheduled_date: date, scheduled_window: document.getElementById('pjWindow').value,
    };
    let error = null;
    for (let i = 0; i < 3; i++) {
      ({ error } = await supabase.from('quote_requests').insert({ ...row, pay_code: newPayCode() }));
      if (!error || error.code !== '23505') break;
    }
    if (error) { alert(t('admin.orders.saveError')); return; }
    ev.target.reset();
    refreshPartnerJob();
    await loadQuotes();
    pingAutomations();
  });

  // On a partner order card: deposit status, deposit received, hours done, balance received.
  function partnerBlock(q, stage) {
    const box = document.createElement('div');
    box.className = 'order-partner';
    const p = partnerOf(q);
    const dep = q.deposit_cents || 0;
    const balance = Math.max(0, amountOf(q) - (q.deposit_paid_at ? dep : 0));
    const lines = [`<b>${esc(t('admin.partners.badge', { name: p ? p.name : '' }))}</b>`];
    if (q.estimated_hours && q.hourly_rate_cents) lines.push(esc(t('admin.partners.estimate', { h: q.estimated_hours, rate: cad(q.hourly_rate_cents, lang()) })));
    if (dep) lines.push(q.deposit_paid_at ? `✓ ${esc(t('admin.partners.depositPaid', { amount: cad(dep, lang()) }))}` : `<span class="is-due">${esc(t('admin.partners.depositDue', { amount: cad(dep, lang()) }))}</span>`);
    if (q.actual_hours) lines.push(esc(t('admin.partners.actual', { h: q.actual_hours, total: cad(amountOf(q), lang()) })));
    if (q.completed_at && !q.paid_at) lines.push(`<span class="is-due">${esc(t('admin.partners.balanceDue', { amount: cad(balance, lang()) }))}</span>`);
    box.innerHTML = `<p>${lines.join('<br>')}</p>`;
    const add = (label, cls, fn) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = cls; b.textContent = label;
      b.addEventListener('click', fn);
      box.appendChild(b);
    };
    if (stage !== 'cancelled' && dep && !q.deposit_paid_at) add(t('admin.partners.markDeposit'), 'btn-mini btn-mini-go', () => updateQuote(q, { deposit_paid_at: new Date().toISOString() }));
    if (stage !== 'cancelled' && dep && q.deposit_paid_at && !q.completed_at) add(t('admin.partners.undoDeposit'), 'btn-mini btn-mini-ghost', () => updateQuote(q, { deposit_paid_at: null }));
    if (q.completed_at && !q.paid_at) add(t('admin.partners.markBalance'), 'btn-mini btn-mini-go', () => updateQuote(q, { paid_at: new Date().toISOString(), payment_method: 'interac' }));
    return box;
  }
  // "Done" on a partner order asks for the hours actually worked (3-hour minimum billed).
  function markPartnerDone(q) {
    if (dep0(q)) { if (!confirm(t('admin.partners.depositMissingConfirm'))) return; }
    const h = hoursNum(prompt(t('admin.partners.hoursPrompt'), String(q.estimated_hours || '')));
    if (!(h >= 0.5 && h <= 24)) return;
    const final = Math.round((q.hourly_rate_cents || 0) * Math.max(3, h));
    const patch = { completed_at: new Date().toISOString(), status: 'booked', actual_hours: h, final_amount_cents: final };
    if (final - (q.deposit_paid_at ? (q.deposit_cents || 0) : 0) <= 0) Object.assign(patch, { paid_at: new Date().toISOString(), payment_method: 'interac' });
    updateQuote(q, patch);
  }
  const dep0 = (q) => (q.deposit_cents || 0) > 0 && !q.deposit_paid_at;

  // ---------- Prospecting (migration 0033) ----------
  // The owner works this list; automations emails a daily "contact today" list.
  // Buttons move a prospect forward and schedule the follow-up automatically.
  let lastProspects = null;
  let prospectFilter = 'today';
  const PROSPECT_CATS = ['request', 'agency', 'airbnb', 'property', 'realtor', 'contractor', 'channel'];
  const PROSPECT_OPEN = ['todo', 'contacted', 'interested'];
  const isoDay = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const inDaysIso = (n) => isoDay(Date.now() + n * 864e5);
  // Same order as the daily email: due follow-ups, then new prospects by category.
  function prospectsToday() {
    const today = isoDay(Date.now());
    const rows = lastProspects || [];
    const due = rows.filter((p) => (p.status === 'contacted' || p.status === 'interested') && p.next_action_on && p.next_action_on <= today)
      .sort((a, b) => String(a.next_action_on).localeCompare(String(b.next_action_on)));
    const fresh = rows.filter((p) => p.status === 'todo' && (!p.next_action_on || p.next_action_on <= today))
      .sort((a, b) => PROSPECT_CATS.indexOf(a.category) - PROSPECT_CATS.indexOf(b.category) || String(a.created_at).localeCompare(String(b.created_at)));
    return [...due, ...fresh].slice(0, 10);
  }
  async function loadProspects() {
    const { data, error } = await supabase.from('prospects').select('*').order('created_at');
    if (error || !data) return;
    lastProspects = data;
    renderProspects();
    renderHome();
  }
  async function updateProspect(p, patch) {
    const { error } = await supabase.from('prospects').update(patch).eq('id', p.id);
    if (error) { alert(t('admin.orders.saveError')); return; }
    Object.assign(p, patch);
    renderProspects();
    renderHome();
  }
  const contacted = (p, status, days) => ({
    status, next_action_on: days == null ? null : inDaysIso(days),
    last_contact_at: new Date().toISOString(), contact_count: (p.contact_count || 0) + 1,
  });
  function introMail(p) {
    const fr = p.lang === 'fr';
    const subject = fr ? 'Ménage fiable à Clarence-Rockland, Orléans, Ottawa et Gatineau' : 'Reliable cleaning in Orléans, Ottawa, Clarence-Rockland and Gatineau';
    const body = fr
      ? 'Bonjour,\n\nJe suis Louis de Magicstick Clean, une entreprise de ménage locale à Clarence-Rockland, Orléans, Ottawa et Gatineau. Je fais les ménages entre locataires, de déménagement, en profondeur et après chantier. J’apporte tous les produits, je réponds le jour même et j’envoie une facture claire après chaque ménage.\n\nSi vous avez besoin d’une personne fiable, même à court préavis, je serais heureux de faire un premier ménage pour que vous jugiez du travail.\n\nLouis\nMagicstick Clean · 343-843-7761 · magicstickclean.ca\n\n(Si vous ne souhaitez pas recevoir d’autre message, répondez simplement « non merci ».)'
      : 'Hi,\n\nI’m Louis from Magicstick Clean, a local cleaning business serving Orléans, Ottawa, Clarence-Rockland and Gatineau. I handle turnover, move-out, deep and post-construction cleans, bring all supplies, reply the same day, and send a clear invoice after each job.\n\nIf you ever need a reliable cleaner on short notice, I’d be glad to do a first job so you can judge the work.\n\nLouis\nMagicstick Clean · 343-843-7761 · magicstickclean.ca\n\n(If you’d rather not hear from me again, just reply “no thanks”.)';
    return `mailto:${encodeURIComponent(p.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  function renderProspects() {
    const list = document.getElementById('prospectList');
    if (!list || !lastProspects) return;
    const today = isoDay(Date.now());
    const todayList = prospectsToday();
    const count = (st) => lastProspects.filter((p) => p.status === st).length;
    document.getElementById('prospectStats').innerHTML = [
      ['admin.prospects.stat.today', todayList.length], ['admin.prospects.stat.todo', count('todo')],
      ['admin.prospects.stat.contacted', count('contacted')], ['admin.prospects.stat.interested', count('interested')],
      ['admin.prospects.stat.client', count('client')],
    ].map(([k, n]) => `<span><b>${n}</b> ${esc(t(k))}</span>`).join('');
    const chips = document.getElementById('prospectChips');
    chips.innerHTML = '';
    ['today', 'todo', 'contacted', 'interested', 'client', 'not_interested', 'all'].forEach((f) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `stage-chip stage-${f}${prospectFilter === f ? ' is-on' : ''}`;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(prospectFilter === f));
      b.textContent = t(`admin.prospects.filter.${f}`);
      b.addEventListener('click', () => { prospectFilter = f; renderProspects(); });
      chips.appendChild(b);
    });
    const rows = prospectFilter === 'today' ? todayList
      : prospectFilter === 'all' ? lastProspects
      : prospectFilter === 'not_interested' ? lastProspects.filter((p) => p.status === 'not_interested' || p.status === 'do_not_contact')
      : lastProspects.filter((p) => p.status === prospectFilter);
    document.getElementById('prospectEmpty').hidden = rows.length > 0;
    list.innerHTML = '';
    rows.forEach((p, i) => {
      const card = document.createElement('article');
      card.className = 'order-card prospect-card';
      card.style.setProperty('--i', String(Math.min(i, 12)));
      const due = PROSPECT_OPEN.includes(p.status) && p.next_action_on && p.next_action_on <= today;
      const next = PROSPECT_OPEN.includes(p.status) && p.next_action_on
        ? `<p class="prospect-next${due ? ' is-due' : ''}">${esc(t('admin.prospects.next', { date: dayFmt(p.next_action_on) }))}</p>` : '';
      const last = p.last_contact_at ? ` · ${esc(t('admin.prospects.last', { date: dateFmt(p.last_contact_at), n: p.contact_count || 1 }))}` : '';
      card.innerHTML = `
        <div class="order-head">
          <div><h4>${esc(p.name)}</h4><span class="fine">${esc(t(`admin.prospects.cat.${p.category}`))}${p.area ? ` · ${esc(p.area)}` : ''}${last}</span></div>
          <span class="stage-pill">${esc(t(`admin.prospects.status.${p.status}`))}</span>
        </div>
        ${p.notes ? `<p class="order-msg">${esc(p.notes)}</p>` : ''}
        ${next}
        <div class="prospect-links"></div>
        <div class="order-actions"></div>`;
      const links = card.querySelector('.prospect-links');
      const link = (href, label, onClick) => {
        const a = document.createElement('a');
        a.href = href; a.textContent = label;
        if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
        if (onClick) a.addEventListener('click', onClick);
        links.appendChild(a);
      };
      if (p.phone) link(`tel:${String(p.phone).replace(/[^0-9+]/g, '')}`, `📞 ${p.phone}`);
      if (p.email && p.status !== 'do_not_contact' && p.status !== 'not_interested') {
        link(introMail(p), `✉️ ${t(p.intro_sent_at ? 'admin.prospects.emailAgain' : 'admin.prospects.email')}`, () => {
          if (!p.intro_sent_at) updateProspect(p, { ...contacted(p, p.status === 'todo' ? 'contacted' : p.status, 5), intro_sent_at: new Date().toISOString() });
        });
      }
      if (p.website) link(p.website, p.category === 'request' ? `👀 ${t('admin.prospects.openRequest')}` : `🌐 ${t('admin.prospects.site')}`);
      // A public "looking for a cleaner" post: answer where they asked, with a ready reply.
      if (p.category === 'request' && PROSPECT_OPEN.includes(p.status)) {
        link('#', `📋 ${t('admin.prospects.copyReply')}`, async (ev) => {
          ev.preventDefault();
          await copyToClipboard(t(p.lang === 'fr' ? 'admin.prospects.replyFr' : 'admin.prospects.replyEn'));
          ev.target.textContent = `✓ ${t('admin.prospects.copied')}`;
        });
      }
      if (!p.website && p.source) link(p.source, `🔎 ${t('admin.prospects.source')}`);
      const actions = card.querySelector('.order-actions');
      const add = (label, cls, fn) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = cls; b.textContent = label;
        b.addEventListener('click', fn);
        actions.appendChild(b);
      };
      if (PROSPECT_OPEN.includes(p.status)) {
        add(t('admin.prospects.act.contacted'), 'btn-mini', () => updateProspect(p, contacted(p, p.status === 'interested' ? 'interested' : 'contacted', 5)));
        add(t('admin.prospects.act.interested'), 'btn-mini btn-mini-go', () => updateProspect(p, contacted(p, 'interested', 2)));
        add(t('admin.prospects.act.client'), 'btn-mini btn-mini-go', () => makeClient(p));
        add(t('admin.prospects.act.later'), 'btn-mini btn-mini-ghost', () => updateProspect(p, { next_action_on: inDaysIso(7) }));
        add(t('admin.prospects.act.no'), 'btn-mini btn-mini-ghost', () => updateProspect(p, { status: 'not_interested', next_action_on: null }));
      } else {
        add(t('admin.prospects.act.reopen'), 'btn-mini btn-mini-ghost', () => updateProspect(p, { status: 'todo', next_action_on: null }));
      }
      add(t('admin.prospects.act.note'), 'btn-mini btn-mini-ghost', () => {
        const note = prompt(t('admin.prospects.notePrompt'), p.notes || '');
        if (note !== null) updateProspect(p, { notes: note.trim().slice(0, 1000) || null });
      });
      list.appendChild(card);
    });
    setBadge('clients', todayList.length);
  }
  // A prospect who says yes becomes a partner: the partner form is pre-filled.
  function makeClient(p) {
    updateProspect(p, { ...contacted(p, 'client', null) });
    const set = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = v; };
    set('ptName', p.name); set('ptEmail', p.email); set('ptPhone', p.phone);
    const lang = document.getElementById('ptLang'); if (lang) lang.value = p.lang === 'fr' ? 'fr' : 'en';
    if (p.category !== 'channel') {
      alert(t('admin.prospects.clientHint'));
      document.getElementById('partnerForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('ptRate')?.focus();
    }
  }
  document.getElementById('prospectForm')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const val = (id) => document.getElementById(id).value.trim();
    let website = val('psWebsite');
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    const row = {
      name: val('psName'), category: document.getElementById('psCategory').value, area: val('psArea') || null,
      phone: val('psPhone') || null, email: val('psEmail').toLowerCase() || null, website: website || null,
      lang: document.getElementById('psLang').value === 'fr' ? 'fr' : 'en', notes: val('psNotes') || null,
    };
    if (!row.name) return;
    const { error } = await supabase.from('prospects').insert(row);
    if (error) { alert(t('admin.orders.saveError')); return; }
    ev.target.reset();
    loadProspects();
  });

  // ---------- Website visits (page_views, anonymous) ----------
  let lastVisits = null;
  async function loadVisits() {
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const { data, error } = await supabase.from('page_views').select('at, path, ref_host, device, tz, session_id')
      .gte('at', since).order('at', { ascending: false }).limit(20000);
    if (error || !data) return;
    lastVisits = data;
  }
  const PAGE_NAMES = { '/': 'Accueil', '/index.html': 'Accueil', '/quote.html': 'Soumission', '/book.html': 'Réservation', '/pay.html': 'Paiement', '/services.html': 'Services', '/gift-cards.html': 'Cartes-cadeaux', '/careers.html': 'Emplois', '/learn-more.html': 'En savoir plus', '/about.html': 'À propos', '/locations.html': 'Zones' };
  const pageName = (p) => PAGE_NAMES[p] || p.replace(/^\//, '').replace(/\.html$/, '').replace(/-/g, ' ');
  const sourceName = (h) => {
    if (!h) return t('admin.visits.direct');
    if (/google\./.test(h)) return 'Google';
    if (/bing\.|msn\./.test(h)) return 'Bing';
    if (/facebook\.|fb\.|instagram\./.test(h)) return 'Facebook / Instagram';
    if (/chatgpt|openai|perplexity|claude|copilot|gemini/.test(h)) return t('admin.visits.ai');
    if (/nextdoor/.test(h)) return 'Nextdoor';
    return h.replace(/^www\./, '');
  };
  const regionName = (tz) => ({ 'America/Toronto': 'Ontario / Québec (Est)', 'America/Montreal': 'Québec', 'America/New_York': 'Est (É.-U.)', 'America/Vancouver': 'C.-B. / Pacifique', 'America/Edmonton': 'Alberta', 'America/Winnipeg': 'Manitoba', 'America/Halifax': 'Atlantique' }[tz] || tz || t('admin.home.unknown'));
  function renderVisits(fr, tally, doughnut, money) {
    const v = lastVisits || [];
    const sessions = new Set(v.map((x) => x.session_id || x.at)).size;
    const kpiBox = document.getElementById('homeKpis');
    if (kpiBox && !kpiBox.querySelector('.kpi-visits')) {
      const el = document.createElement('div');
      el.className = 'dash-kpi kpi-anim kpi-visits';
      el.style.setProperty('--i', '5');
      el.innerHTML = `<div class="dash-kpi-label">${esc(t('admin.visits.kpi'))}</div><div class="dash-kpi-value"></div><div class="dash-kpi-delta">${esc(t('admin.visits.kpiSub', { n: v.length }))}</div>`;
      kpiBox.appendChild(el);
      countUp(el.querySelector('.dash-kpi-value'), sessions, (n) => String(Math.round(n)));
    }
    const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(Date.now() - (29 - i) * 864e5); return d.toISOString().slice(0, 10); });
    const perDay = days.map((d) => new Set(v.filter((x) => x.at.slice(0, 10) === d).map((x) => x.session_id || x.at)).size);
    drawChart('chartVisits', {
      type: 'line',
      data: { labels: days.map((d) => new Date(`${d}T12:00:00`).toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short' })),
        datasets: [{ data: perDay, borderColor: '#2E8BE6', backgroundColor: 'rgba(46,139,230,.14)', fill: true, tension: .35, pointRadius: 2 }] },
    });
    const pages = tally(v, (x) => pageName(x.path));
    drawChart('chartPages', {
      type: 'bar',
      data: { labels: pages.map((p) => p[0]), datasets: [{ data: pages.map((p) => p[1]), backgroundColor: '#8B4DE6', borderRadius: 6 }] },
      options: { indexAxis: 'y' },
    });
    const firstHits = [...new Map(v.slice().reverse().map((x) => [x.session_id || x.at, x])).values()];
    doughnut('chartSources', tally(firstHits, (x) => sourceName(x.ref_host)));
    doughnut('chartDevices', tally(firstHits, (x) => t(`admin.visits.device.${x.device || 'desktop'}`)));
    const hours = new Array(24).fill(0);
    v.forEach((x) => { hours[new Date(x.at).getHours()] += 1; });
    drawChart('chartVisitHours', { type: 'bar', data: { labels: hours.map((_, h) => `${h}h`), datasets: [{ data: hours, backgroundColor: '#22B8A6', borderRadius: 5 }] } });
    const regions = tally(firstHits, (x) => regionName(x.tz));
    drawChart('chartRegions', {
      type: 'bar',
      data: { labels: regions.map((p) => p[0]), datasets: [{ data: regions.map((p) => p[1]), backgroundColor: '#F2A33A', borderRadius: 6 }] },
      options: { indexAxis: 'y' },
    });
  }

  // ---------- Navigation (7 sections) ----------
  function setBadge(section, n) {
    const el = document.getElementById(`navBadge-${section}`);
    if (!el) return;
    el.textContent = String(n);
    el.hidden = !n;
  }
  function openSection(name) {
    document.querySelectorAll('.dash-nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.section === name));
    document.querySelectorAll('.dash-section').forEach((s) => s.classList.toggle('active', s.id === `dashSection-${name}`));
    try { sessionStorage.setItem('magicstick_admin_section', name); } catch (_) { /* private mode */ }
    if (name === 'home') renderHome(true);
    if (name === 'care') { renderActivity(); runHealth(); }
    window.scrollTo({ top: document.getElementById('adminDashboard').offsetTop - 12, behavior: 'smooth' });
  }
  document.querySelectorAll('.dash-nav-btn').forEach((b) => b.addEventListener('click', () => openSection(b.dataset.section)));

  // ---------- Team & applicants ----------
  let lastJobs = null;
  const JOB_STATUSES = ['new', 'contacted', 'interview', 'hired', 'declined'];
  async function loadJobs() {
    const { data, error } = await supabase.from('job_applications').select('*').order('created_at', { ascending: false });
    if (error || !data) return;
    lastJobs = data;
    renderJobs();
  }
  function renderJobs() {
    const list = document.getElementById('jobsList');
    if (!list || !lastJobs) return;
    list.innerHTML = '';
    document.getElementById('jobsEmpty').hidden = lastJobs.length > 0;
    lastJobs.forEach((j, i) => {
      const card = document.createElement('article');
      card.className = 'order-card';
      card.style.setProperty('--i', String(Math.min(i, 12)));
      card.innerHTML = `
        <div class="order-head"><div><h4>${esc(j.name || '—')}</h4><span class="fine">${esc(dateFmt(j.created_at))}</span></div></div>
        <p class="order-facts">${[j.availability, j.experience].filter(Boolean).map((f) => `<span>${esc(f)}</span>`).join('')}</p>
        <div class="order-contact">${contactCell({ contact: j.contact, phone: /@/.test(j.contact || '') ? '' : j.contact, email: /@/.test(j.contact || '') ? j.contact : '' })}</div>
        ${j.message ? `<p class="order-msg">${esc(j.message)}</p>` : ''}
        <div class="order-actions"></div>`;
      card.querySelector('.order-actions').appendChild(statusSelect(j.status || 'new', JOB_STATUSES, async (value) => {
        const { error } = await supabase.from('job_applications').update({ status: value }).eq('id', j.id);
        if (!error) { j.status = value; renderJobs(); renderHome(); }
      }));
      list.appendChild(card);
    });
    setBadge('team', lastJobs.filter((j) => !j.status || j.status === 'new').length);
  }

  // ---------- Home: KPIs, to-do, animated charts (real data only) ----------
  const charts = {};
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PALETTE = ['#6B3FE6', '#2E8BE6', '#8B4DE6', '#22B8A6', '#F2A33A', '#E2557B', '#7DB8F4', '#B9A1F7'];

  function countUp(el, to, fmt) {
    if (reduceMotion) { el.textContent = fmt(to); return; }
    const start = performance.now(), dur = 900;
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function weekStart(d) {
    const x = new Date(d); x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }

  function drawChart(id, config) {
    const el = document.getElementById(id);
    if (!el || !window.Chart) return;
    if (charts[id]) charts[id].destroy();
    const text = css('--charcoal') || '#17151F';
    const grid = css('--line') || '#E6E1D7';
    config.options = Object.assign({
      responsive: true, maintainAspectRatio: false,
      animation: reduceMotion ? false : { duration: 1100, easing: 'easeOutQuart' },
      plugins: { legend: { display: false, labels: { color: text } }, tooltip: { padding: 10, cornerRadius: 10 } },
    }, config.options || {});
    if (config.type === 'bar' || config.type === 'line') {
      config.options.scales = Object.assign({
        x: { grid: { display: false }, ticks: { color: text, font: { size: 11 } } },
        y: { beginAtZero: true, grid: { color: grid }, ticks: { color: text, font: { size: 11 }, precision: 0 } },
      }, config.options.scales || {});
    }
    charts[id] = new window.Chart(el, config);
  }

  function renderHome(replay) {
    const kpiBox = document.getElementById('homeKpis');
    if (!kpiBox || !lastQuotes) return;
    const fr = lang() === 'fr';
    const now = new Date();
    document.getElementById('homeDate').textContent = now.toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { weekday: 'long', day: 'numeric', month: 'long' });
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const q = lastQuotes;
    const paidIn = (a, b) => q.filter((x) => x.paid_at && new Date(x.paid_at) >= a && new Date(x.paid_at) < b).reduce((s, x) => s + amountOf(x), 0);
    const revMonth = paidIn(monthStart, new Date(8.64e15));
    const revPrev = paidIn(prevStart, monthStart);
    const reqMonth = q.filter((x) => new Date(x.created_at) >= monthStart).length;
    const since90 = new Date(now - 90 * 864e5);
    const last90 = q.filter((x) => new Date(x.created_at) >= since90);
    const conv = last90.length ? Math.round((last90.filter((x) => x.paid_at).length / last90.length) * 100) : 0;
    const leads = (lastLeads || []).filter((l) => !l.unsubscribed_at);
    const leadsMonth = leads.filter((l) => new Date(l.created_at) >= monthStart).length;
    const giftSold = (lastGiftCards || []).filter((g) => g.source === 'online').reduce((s, g) => s + (g.initial_cents || 0), 0);
    const money = (c) => cad(Math.round(c), lang()).replace(/[.,]00(?=\D*$)/, '');
    const delta = revPrev ? Math.round(((revMonth - revPrev) / revPrev) * 100) : null;
    const KPIS = [
      { label: t('admin.home.kpi.revenue'), value: revMonth, fmt: (v) => money(v), sub: delta === null ? t('admin.home.kpi.revenueSub') : t('admin.home.kpi.vsLast', { pct: `${delta >= 0 ? '+' : ''}${delta}` }), cls: delta === null ? '' : delta >= 0 ? 'up' : 'down' },
      { label: t('admin.home.kpi.requests'), value: reqMonth, fmt: (v) => String(Math.round(v)), sub: t('admin.home.kpi.requestsSub') },
      { label: t('admin.home.kpi.conversion'), value: conv, fmt: (v) => `${Math.round(v)} %`, sub: t('admin.home.kpi.conversionSub') },
      { label: t('admin.home.kpi.leads'), value: leads.length, fmt: (v) => String(Math.round(v)), sub: t('admin.home.kpi.leadsSub', { n: leadsMonth }) },
      { label: t('admin.home.kpi.gifts'), value: giftSold, fmt: (v) => money(v), sub: t('admin.home.kpi.giftsSub') },
    ];
    kpiBox.innerHTML = '';
    KPIS.forEach((k, i) => {
      const el = document.createElement('div');
      el.className = 'dash-kpi kpi-anim';
      el.style.setProperty('--i', String(i));
      el.innerHTML = `<div class="dash-kpi-label">${esc(k.label)}</div><div class="dash-kpi-value"></div><div class="dash-kpi-delta ${k.cls || ''}">${esc(k.sub)}</div>`;
      kpiBox.appendChild(el);
      countUp(el.querySelector('.dash-kpi-value'), k.value, k.fmt);
    });

    // To do: what needs the owner now.
    const todayIso = new Date(now.getTime() - now.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    const tomorrowIso = new Date(now.getTime() + 864e5 - now.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    const stages = q.map((x) => ({ x, s: stageOf(x) }));
    const todo = [
      { n: stages.filter((o) => o.s === 'new').length, key: 'admin.home.todo.new', go: 'new' },
      { n: stages.filter((o) => o.s === 'priced' && o.x.quoted_at && (now - new Date(o.x.quoted_at)) > 3 * 864e5).length, key: 'admin.home.todo.unpaid', go: 'priced' },
      { n: stages.filter((o) => o.s === 'paid').length, key: 'admin.home.todo.toPlan', go: 'paid' },
      { n: stages.filter((o) => o.s === 'planned' && (o.x.scheduled_date === todayIso || o.x.scheduled_date === tomorrowIso)).length, key: 'admin.home.todo.soon', go: 'planned' },
      { n: stages.filter((o) => o.s === 'done' && !o.x.review_requested_at).length, key: 'admin.home.todo.review', go: 'done' },
      { n: (lastJobs || []).filter((j) => !j.status || j.status === 'new').length, key: 'admin.home.todo.jobs', section: 'team' },
      { n: (lastGiftRequests || []).filter((g) => g.status === 'new').length, key: 'admin.home.todo.giftReq', section: 'gifts' },
      { n: (lastSupplies || []).filter((x) => Number(x.quantity) <= Number(x.min_quantity)).length, key: 'admin.home.todo.stock', section: 'care' },
      { n: lastProspects ? prospectsToday().length : 0, key: 'admin.home.todo.prospects', section: 'clients' },
    ].filter((x) => x.n > 0);
    const ul = document.getElementById('homeTodo');
    ul.innerHTML = todo.length ? '' : `<li class="todo-empty">${esc(t('admin.home.todo.none'))}</li>`;
    todo.forEach((item, i) => {
      const li = document.createElement('li');
      li.style.setProperty('--i', String(i));
      li.innerHTML = `<button type="button"><b>${item.n}</b><span>${esc(t(item.key))}</span><span aria-hidden="true">→</span></button>`;
      li.querySelector('button').addEventListener('click', () => {
        if (item.section) return openSection(item.section);
        orderStage = item.go; renderQuotes(); openSection('orders');
      });
      ul.appendChild(li);
    });

    if (!document.getElementById('dashSection-home').classList.contains('active') && !replay) return;
    const accent = css('--teal') || '#6B3FE6';
    // Revenue per week, last 12 weeks.
    const w0 = weekStart(new Date(now - 11 * 7 * 864e5));
    const weeks = Array.from({ length: 12 }, (_, i) => new Date(w0.getTime() + i * 7 * 864e5));
    const weekIdx = (d) => Math.floor((weekStart(d) - w0) / (7 * 864e5));
    const rev = new Array(12).fill(0), reqW = new Array(12).fill(0), leadW = new Array(12).fill(0);
    q.forEach((x) => {
      if (x.paid_at) { const i = weekIdx(new Date(x.paid_at)); if (i >= 0 && i < 12) rev[i] += amountOf(x) / 100; }
      const j = weekIdx(new Date(x.created_at)); if (j >= 0 && j < 12) reqW[j] += 1;
    });
    leads.forEach((l) => { const i = weekIdx(new Date(l.created_at)); if (i >= 0 && i < 12) leadW[i] += 1; });
    const wLabels = weeks.map((d) => d.toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short' }));
    drawChart('chartRevenue', {
      type: 'bar',
      data: { labels: wLabels, datasets: [{ data: rev, backgroundColor: accent, borderRadius: 8, maxBarThickness: 34 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => money(c.raw * 100) } } } },
    });
    const f = [last90.length, last90.filter((x) => x.quoted_amount_cents).length, last90.filter((x) => x.paid_at).length, last90.filter((x) => x.completed_at).length];
    drawChart('chartFunnel', {
      type: 'bar',
      data: { labels: [t('admin.funnel.requests'), t('admin.funnel.priced'), t('admin.funnel.paid'), t('admin.funnel.done')], datasets: [{ data: f, backgroundColor: ['#B9A1F7', '#8B4DE6', '#6B3FE6', '#22B8A6'], borderRadius: 8 }] },
      options: { indexAxis: 'y' },
    });
    const tally = (arr, key) => {
      const m = new Map();
      arr.forEach((x) => { const k = key(x) || t('admin.home.unknown'); m.set(k, (m.get(k) || 0) + 1); });
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
    };
    const doughnut = (id, pairs) => drawChart(id, {
      type: 'doughnut',
      data: { labels: pairs.map((p) => p[0]), datasets: [{ data: pairs.map((p) => p[1]), backgroundColor: PALETTE, borderWidth: 0, hoverOffset: 8 }] },
      options: { cutout: '62%', plugins: { legend: { display: true, position: 'bottom', labels: { color: css('--charcoal'), boxWidth: 10, font: { size: 11 } } } } },
    });
    doughnut('chartServices', tally(q, (x) => serviceLabel(x.service)));
    doughnut('chartZones', tally(q, (x) => x.zone));
    const hours = new Array(24).fill(0);
    q.forEach((x) => { hours[new Date(x.created_at).getHours()] += 1; });
    drawChart('chartHours', {
      type: 'bar',
      data: { labels: hours.map((_, h) => `${h}h`), datasets: [{ data: hours, backgroundColor: '#2E8BE6', borderRadius: 5 }] },
    });
    drawChart('chartLeads', {
      type: 'line',
      data: { labels: wLabels, datasets: [
        { label: t('admin.home.series.requests'), data: reqW, borderColor: accent, backgroundColor: 'rgba(107,63,230,.12)', fill: true, tension: .35, pointRadius: 3 },
        { label: t('admin.home.series.leads'), data: leadW, borderColor: '#22B8A6', backgroundColor: 'rgba(34,184,166,.10)', fill: true, tension: .35, pointRadius: 3 },
      ] },
      options: { plugins: { legend: { display: true, position: 'bottom', labels: { color: css('--charcoal'), boxWidth: 10 } } } },
    });
    renderVisits(fr, tally, doughnut, money);
  }
  document.addEventListener('magicstick:langchange', () => { renderQuotes(); renderHome(true); renderJobs(); renderStaff(); });


  // ---------- Google review requests ----------
  // One window to send a ready-made review request by text, WhatsApp, email or
  // copy. Sending stamps review_requested_at so nobody is asked twice; the owner
  // co-pilot (owner-assistant) reads the same column to list who is due.
  // Never attach an incentive to a review request (Google policy).
  const REVIEW_LINK = 'https://g.page/r/CXlL7jiMiQp2EBI/review';
  const REVIEW_TEMPLATES = {
    fr: {
      subject: 'Votre avis sur Magicstick Clean',
      body: (name) => `Bonjour${name ? ' ' + name : ''} ! Merci de nous avoir fait confiance 😊 Votre opinion sur Magicstick Clean nous intéresse : si vous êtes satisfait·e, pourriez-vous publier un avis sur notre fiche Google ? Ça prend 30 secondes : ${REVIEW_LINK}\nMerci ! L’équipe Magicstick Clean · (343) 843-7761`,
    },
    en: {
      subject: 'Your feedback on Magicstick Clean',
      body: (name) => `Hi${name ? ' ' + name : ''}! Thank you for trusting us 😊 Your opinion of Magicstick Clean matters to us: if you’re happy with the result, could you post a review on our Google listing? It takes 30 seconds: ${REVIEW_LINK}\nThank you! The Magicstick Clean team · (343) 843-7761`,
    },
  };
  const firstNameOf = (name) => String(name || '').trim().split(/\s+/)[0] || '';
  const emailOf = (contact) => (String(contact || '').match(/[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+/) || [''])[0];
  function phoneOf(contact) {
    const raw = String(contact || '').replace(/[^\s@,;<>]+@[^\s@,;<>]+/g, '');
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return '1' + digits;
    if (digits.length === 11 && digits[0] === '1') return digits;
    return '';
  }
  const fmtDate = (iso) => new Date(iso).toLocaleDateString(lang() === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long', year: 'numeric' });

  async function copyToClipboard(txt) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(txt); return true; } } catch (e) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e) { return false; }
  }

  const reviewDialog = document.getElementById('reviewDialog');
  const reviewMessage = document.getElementById('reviewMessage');
  const reviewSms = document.getElementById('reviewSms');
  const reviewWhatsapp = document.getElementById('reviewWhatsapp');
  const reviewEmail = document.getElementById('reviewEmail');
  const reviewCopy = document.getElementById('reviewCopy');
  const reviewStatus = document.getElementById('reviewDialogStatus');
  const reviewReset = document.getElementById('reviewReset');
  let reviewTarget = null; // { table, row, name, contact, onChange }
  let reviewLang = 'fr';

  function setReviewLang(l) {
    reviewLang = l === 'en' ? 'en' : 'fr';
    reviewDialog.querySelectorAll('[data-review-lang]').forEach((b) => {
      b.classList.toggle('active', b.dataset.reviewLang === reviewLang);
      b.setAttribute('aria-pressed', b.dataset.reviewLang === reviewLang ? 'true' : 'false');
    });
    reviewMessage.value = REVIEW_TEMPLATES[reviewLang].body(firstNameOf(reviewTarget && reviewTarget.name));
    refreshReviewLinks();
  }

  function refreshReviewLinks() {
    if (!reviewTarget) return;
    const text = reviewMessage.value;
    const phone = phoneOf(reviewTarget.contact);
    const email = emailOf(reviewTarget.contact);
    reviewSms.hidden = !phone;
    reviewWhatsapp.hidden = !phone;
    reviewEmail.hidden = !email;
    // "?&body=" is understood by both iOS and Android messaging apps.
    reviewSms.href = phone ? `sms:+${phone}?&body=${encodeURIComponent(text)}` : '#';
    reviewWhatsapp.href = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : '#';
    reviewEmail.href = email
      ? `mailto:${email}?subject=${encodeURIComponent(REVIEW_TEMPLATES[reviewLang].subject)}&body=${encodeURIComponent(text)}`
      : '#';
  }

  function showReviewStamp() {
    const at = reviewTarget && reviewTarget.row.review_requested_at;
    reviewStatus.textContent = at ? t('admin.review.askedOn', { date: fmtDate(at) }) : '';
    reviewReset.hidden = !at;
  }

  async function stampReview(value) {
    if (!reviewTarget) return;
    const { table, row } = reviewTarget;
    const stamp = value === null ? null : new Date().toISOString();
    const { error } = await supabase.from(table).update({ review_requested_at: stamp }).eq('id', row.id);
    if (error) { reviewStatus.textContent = t('admin.review.saveError'); return; }
    row.review_requested_at = stamp;
    showReviewStamp();
    if (reviewTarget.onChange) reviewTarget.onChange();
  }

  function openReviewDialog(target) {
    reviewTarget = target;
    const contact = String(target.contact || '');
    document.getElementById('reviewDialogClient').textContent = `${target.name || '—'} · ${contact || '—'}`;
    setReviewLang(lang());
    showReviewStamp();
    if (!phoneOf(contact) && !emailOf(contact)) reviewStatus.textContent = t('admin.review.noContact');
    if (typeof reviewDialog.showModal === 'function') reviewDialog.showModal();
    else reviewDialog.setAttribute('open', '');
  }

  if (reviewDialog) {
    reviewDialog.querySelectorAll('[data-review-lang]').forEach((b) => b.addEventListener('click', () => setReviewLang(b.dataset.reviewLang)));
    reviewMessage.addEventListener('input', refreshReviewLinks);
    [reviewSms, reviewWhatsapp, reviewEmail].forEach((a) => a.addEventListener('click', () => { stampReview(); }));
    reviewCopy.addEventListener('click', async () => {
      const ok = await copyToClipboard(reviewMessage.value);
      if (!ok) { reviewMessage.select(); return; }
      reviewCopy.textContent = t('admin.review.copied');
      setTimeout(() => { reviewCopy.textContent = t('admin.review.copy'); }, 2000);
      stampReview();
    });
    reviewReset.addEventListener('click', () => stampReview(null));
    reviewDialog.addEventListener('close', () => { reviewTarget = null; });
  }

  function reviewButton(target) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'booking-review-btn' + (target.row.review_requested_at ? ' is-done' : '');
    btn.textContent = target.row.review_requested_at ? t('admin.review.btnDone') : t('admin.booking.review');
    btn.title = target.row.review_requested_at
      ? t('admin.review.askedOn', { date: fmtDate(target.row.review_requested_at) })
      : t('admin.booking.reviewTitle');
    btn.addEventListener('click', () => openReviewDialog(target));
    return btn;
  }


  // ---------- Price & payment link (prices are never shown on the site) ----------
  // The owner sets the client's price here. Saving creates a random 10-character
  // pay_code; the client opens pay.html?code=… to see the price and pay
  // (Interac now, card once ONLINE_PAYMENTS is on). The webhook marks card
  // payments; e-Transfer / cash payments are marked here by hand.
  const PAY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const priceDialog = document.getElementById('priceDialog');
  const priceAmount = document.getElementById('priceAmount');
  const priceNote = document.getElementById('priceNote');
  const priceSend = document.getElementById('priceSend');
  const priceMessage = document.getElementById('priceMessage');
  const priceStatus = document.getElementById('priceStatus');
  let priceTarget = null;
  let priceLang = 'fr';
  const newPayCode = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    return Array.from(bytes, (b) => PAY_ALPHABET[b % 32]).join('');
  };
  const prettyCode = (c) => c.replace(/^(.{4})(.{4})(.{2})$/, '$1-$2-$3');
  const payLink = (q) => `https://magicstickclean.ca/pay.html?code=${q.pay_code}`;
  const cad = (cents, l) => new Intl.NumberFormat(l === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);
  const PRICE_TEMPLATES = {
    fr: (q) => `Bonjour ${firstNameOf(q.name)}, merci pour votre demande ! Votre prix pour ${q.service} : ${cad(q.quoted_amount_cents, 'fr')}.` +
      `${q.quote_note ? `\n${q.quote_note}` : ''}\n\nPour accepter et payer : ${payLink(q)} (code ${prettyCode(q.pay_code)}). ` +
      `Vous pouvez aussi payer le jour du ménage.\n\n— Magicstick Clean, (343) 843-7761`,
    en: (q) => `Hi ${firstNameOf(q.name)}, thanks for your request! Your price for ${q.service}: ${cad(q.quoted_amount_cents, 'en')}.` +
      `${q.quote_note ? `\n${q.quote_note}` : ''}\n\nTo accept and pay: ${payLink(q)} (code ${prettyCode(q.pay_code)}). ` +
      `You can also pay on the day of the cleaning.\n\n— Magicstick Clean, (343) 843-7761`,
  };

  function refreshPriceDialog() {
    const q = priceTarget;
    if (!q) return;
    const ready = !!(q.quoted_amount_cents && q.pay_code);
    priceSend.hidden = !ready;
    if (!ready) return;
    priceDialog.querySelectorAll('[data-price-lang]').forEach((b) => b.classList.toggle('is-active', b.dataset.priceLang === priceLang));
    priceMessage.value = PRICE_TEMPLATES[priceLang](q);
    refreshPriceLinks();
    document.getElementById('priceLink').textContent = payLink(q);
    document.getElementById('pricePaid').hidden = !!q.paid_at;
    document.getElementById('priceUnpaid').hidden = !q.paid_at;
    priceStatus.textContent = q.paid_at ? t('admin.price.paidOn', { date: fmtDate(q.paid_at), method: q.payment_method || '' }) : '';
  }
  function refreshPriceLinks() {
    const q = priceTarget;
    const phone = phoneOf(q.phone || q.contact);
    const email = emailOf(q.email || q.contact);
    const sms = document.getElementById('priceSms');
    const mail = document.getElementById('priceEmail');
    sms.hidden = !phone;
    mail.hidden = !email;
    document.getElementById('priceSendEmail').hidden = !email;
    sms.href = phone ? `sms:+${phone}?&body=${encodeURIComponent(priceMessage.value)}` : '#';
    const subject = priceLang === 'fr' ? 'Votre prix Magicstick Clean' : 'Your Magicstick Clean price';
    mail.href = email ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(priceMessage.value)}` : '#';
  }
  function openPriceDialog(q) {
    priceTarget = q;
    priceLang = q.lang === 'en' ? 'en' : 'fr';
    document.getElementById('priceDialogClient').textContent = `${q.name} · ${q.service}`;
    priceAmount.value = q.quoted_amount_cents ? (q.quoted_amount_cents / 100).toFixed(2) : '';
    priceNote.value = q.quote_note || '';
    priceStatus.textContent = '';
    refreshPriceDialog();
    setupCalc(q);
    if (typeof priceDialog.showModal === 'function') priceDialog.showModal(); else priceDialog.setAttribute('open', '');
  }
  async function savePriceFields(patch) {
    const { error } = await supabase.from('quote_requests').update(patch).eq('id', priceTarget.id);
    if (error) { priceStatus.textContent = t('admin.review.saveError'); return false; }
    Object.assign(priceTarget, patch);
    refreshPriceDialog();
    renderQuotes();
    pingAutomations();
    return true;
  }
  if (priceDialog) {
    document.getElementById('priceSave').addEventListener('click', async () => {
      const cents = Math.round(parseFloat(String(priceAmount.value).replace(',', '.')) * 100);
      if (!Number.isFinite(cents) || cents < 100 || cents > 2000000) { priceStatus.textContent = t('admin.price.amountErr'); return; }
      const patch = { quoted_amount_cents: cents, quote_note: priceNote.value.trim().slice(0, 500) || null, quoted_at: new Date().toISOString() };
      if (!priceTarget.pay_code) patch.pay_code = newPayCode();
      if (await savePriceFields(patch)) priceStatus.textContent = t('admin.price.saved');
    });
    priceDialog.querySelectorAll('[data-price-lang]').forEach((b) => b.addEventListener('click', () => { priceLang = b.dataset.priceLang; refreshPriceDialog(); }));
    priceMessage.addEventListener('input', refreshPriceLinks);
    document.getElementById('priceSendEmail').addEventListener('click', async (ev) => {
      const btn = ev.currentTarget;
      btn.disabled = true;
      priceStatus.textContent = '…';
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const res = await fetch(`${backend.config.FUNCTIONS_URL}/quote-pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData?.session?.access_token || ''}` },
          body: JSON.stringify({ action: 'send_link', quote_id: priceTarget.id }),
        });
        const r = await res.json().catch(() => ({}));
        priceStatus.textContent = res.ok ? t('admin.price.emailSent', { to: r.to })
          : r.error === 'no_email' ? t('admin.price.noEmail') : t('admin.price.emailFailed');
      } catch (_) {
        priceStatus.textContent = t('admin.price.emailFailed');
      } finally {
        btn.disabled = false;
      }
    });
    document.getElementById('priceCopy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(priceMessage.value); priceStatus.textContent = t('admin.review.copied'); } catch (_) { priceMessage.select(); }
    });
    document.getElementById('pricePaid').addEventListener('click', () => {
      const method = window.confirm(t('admin.price.confirmInterac')) ? 'interac' : 'cash';
      savePriceFields({ paid_at: new Date().toISOString(), payment_method: method });
    });
    document.getElementById('priceUnpaid').addEventListener('click', () => savePriceFields({ paid_at: null, payment_method: null }));
  }

  // ---------- Price calculator (inside the price dialog, owner-only) ----------
  // Rates come from the services table (base_price_cents for duration_minutes,
  // editable in the Services tab), never below MIN_RATE (owner, Nov 4, 2026).
  // Hours are only a suggestion from the home size / rooms; the owner adjusts.
  const MIN_RATE = 39.5;
  const EXTRA_SERVICES = [{ id: 'outdoor', name: 'Outdoor & seasonal (lawn / snow)', name_fr: 'Extérieur et saisonnier (pelouse / neige)', rate: 50 }];
  const HOURS_FACTOR = { deep: 1.5, 'move-in-out': 1.5, 'post-construction': 1.75 };
  const SIZE_HOURS = { 'Under 1,000 sq ft': 3, '1,000–1,500 sq ft': 4, '1,500–2,000 sq ft': 5, '2,000–3,000 sq ft': 6, 'Over 3,000 sq ft': 8 };
  let calcServices = null;
  const calcEl = (id) => document.getElementById(id);
  const num = (id) => { const v = parseFloat(String(calcEl(id).value).replace(',', '.')); return Number.isFinite(v) ? v : 0; };
  const halfUp = (h) => Math.ceil(h * 2) / 2;

  async function loadCalcServices() {
    if (calcServices) return calcServices;
    const { data } = await supabase.from('services').select('id, name, name_fr, base_price_cents, duration_minutes').eq('active', true).order('sort_order');
    calcServices = (data || []).map((sv) => ({
      ...sv, rate: Math.max(MIN_RATE, sv.duration_minutes ? (sv.base_price_cents / 100) / (sv.duration_minutes / 60) : MIN_RATE),
    })).concat(EXTRA_SERVICES);
    return calcServices;
  }
  function guessService(q, list) {
    const label = String(q.service || '').toLowerCase();
    const hit = list.find((sv) => [sv.name, sv.name_fr].some((n) => n && label && (n.toLowerCase() === label || label.includes(n.toLowerCase().split(' ')[0]))));
    if (hit) return hit;
    if (/outdoor|ext[ée]rieur|snow|neige|lawn|pelouse/.test(label)) return list.find((sv) => sv.id === 'outdoor');
    if (/deep|profondeur|grand/.test(label)) return list.find((sv) => sv.id === 'deep');
    if (/move|d[ée]m[ée]nag/.test(label)) return list.find((sv) => sv.id === 'move-in-out');
    if (/construction/.test(label)) return list.find((sv) => sv.id === 'post-construction');
    return list[0];
  }
  function suggestHours(q, sv) {
    let h = SIZE_HOURS[q.home_size];
    let why = h ? t('admin.calc.fromSize', { size: q.home_size }) : '';
    if (!h) {
      const bed = parseFloat(q.bedrooms) || 0;
      const bath = parseFloat(q.bathrooms) || 0;
      if (bed || bath) { h = 2 + 0.5 * bed + 0.5 * bath; why = t('admin.calc.fromRooms', { bed: bed || 0, bath: bath || 0 }); }
    }
    if (!h) { h = 3; why = t('admin.calc.noInfo'); }
    h = Math.max(3, halfUp(h * (HOURS_FACTOR[sv.id] || 1)));
    return { h, why };
  }
  function calcTotalCents() {
    const hours = Math.max(3, num('calcHours'));
    const base = num('calcRate') * hours;
    const afterDiscount = base * (1 - Math.min(50, Math.max(0, num('calcDiscount'))) / 100) + Math.max(0, num('calcExtras'));
    return Math.round(afterDiscount * (1 + Math.max(0, num('calcTax')) / 100) * 100);
  }
  function refreshCalc() {
    const cents = calcTotalCents();
    const hours = Math.max(3, num('calcHours'));
    calcEl('calcTotal').textContent = t('admin.calc.total', {
      hours: String(hours).replace('.', lang() === 'fr' ? ',' : '.'), rate: cad(Math.round(num('calcRate') * 100), lang()), total: cad(cents, lang()),
    });
  }
  async function setupCalc(q) {
    const list = await loadCalcServices();
    const sel = calcEl('calcService');
    sel.innerHTML = '';
    list.forEach((sv) => {
      const o = document.createElement('option');
      o.value = sv.id;
      o.textContent = `${lang() === 'fr' && sv.name_fr ? sv.name_fr : sv.name} · ${cad(Math.round(sv.rate * 100), lang())}/h`;
      sel.appendChild(o);
    });
    const apply = (sv, keepHours) => {
      calcEl('calcRate').value = sv.rate.toFixed(2);
      const s = suggestHours(q, sv);
      if (!keepHours) calcEl('calcHours').value = s.h;
      calcEl('calcHint').textContent = t('admin.calc.hint', { hours: s.h, why: s.why });
      refreshCalc();
    };
    const sv = guessService(q, list);
    sel.value = sv.id;
    try { calcEl('calcTax').value = localStorage.getItem('magicstick_calc_tax') || '0'; } catch (_) { /* private mode */ }
    // First cleaning: 20% off unless this phone/email already paid a quote.
    const same = (x) => x.id !== q.id && x.paid_at && ((q.phone && x.phone === q.phone) || (q.email && x.email === q.email));
    calcEl('calcDiscount').value = (lastQuotes || []).some(same) ? '0' : '20';
    calcEl('calcExtras').value = '0';
    apply(sv, false);
    sel.onchange = () => apply(list.find((x) => x.id === sel.value), false);
  }
  if (priceDialog) {
    ['calcRate', 'calcHours', 'calcDiscount', 'calcExtras', 'calcTax'].forEach((id) => calcEl(id).addEventListener('input', refreshCalc));
    calcEl('calcTax').addEventListener('change', () => { try { localStorage.setItem('magicstick_calc_tax', calcEl('calcTax').value); } catch (_) { /* ignore */ } });
    calcEl('calcUse').addEventListener('click', () => {
      const cents = calcTotalCents();
      priceAmount.value = (cents / 100).toFixed(2);
      if (!priceNote.value.trim()) {
        const sv = (calcServices || []).find((x) => x.id === calcEl('calcService').value);
        const svName = sv ? (priceTarget.lang === 'en' ? sv.name : (sv.name_fr || sv.name)) : priceTarget.service;
        const hours = Math.max(3, num('calcHours'));
        priceNote.value = priceTarget.lang === 'en' ? `About ${hours} h of ${svName.toLowerCase()}.` : `Environ ${String(hours).replace('.', ',')} h de ${svName.toLowerCase()}.`;
        if (num('calcDiscount') === 20) priceNote.value += priceTarget.lang === 'en' ? ' First-cleaning 20% off included.' : ' Rabais premier ménage −20 % inclus.';
      }
      document.getElementById('priceSave').click();
    });
  }

  function priceButton(q) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'booking-review-btn' + (q.paid_at ? ' is-done' : '');
    btn.textContent = q.paid_at
      ? t('admin.price.btnPaid', { amount: cad(q.quoted_amount_cents, lang()) })
      : q.quoted_amount_cents ? t('admin.price.btnSent', { amount: cad(q.quoted_amount_cents, lang()) }) : t('admin.price.btn');
    btn.addEventListener('click', () => openPriceDialog(q));
    return btn;
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
    if (lastPartners) renderPartners();
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
    fillCategoryPicker();
    renderServices();
    renderAddons();
    renderGiftCards();
    renderGiftRequests();
    renderLeads();
  });

  // ---------- Prospects: popup leads + newsletter (newsletter_subscribers) ----------
  let lastLeads = null;
  async function loadLeads() {
    const { data, error } = await supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false });
    if (error || !data) return;
    lastLeads = data;
    renderLeads();
  }
  function renderLeads() {
    const tbody = document.querySelector('#leadsTable tbody');
    if (!tbody || !lastLeads) return;
    const active = lastLeads.filter((r) => !r.unsubscribed_at);
    document.getElementById('leadsCount').textContent = String(active.length);
    tbody.innerHTML = active.length ? '' : `<tr><td colspan="6">${esc(t('admin.leads.empty'))}</td></tr>`;
    const fmt = (d) => new Date(d).toLocaleDateString(lang() === 'fr' ? 'fr-CA' : 'en-CA');
    active.forEach((r) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(fmt(r.created_at))}</td><td>${esc(r.name) || '—'}</td>` +
        `<td>${contactCell({ phone: r.phone, email: r.email, contact: '' })}</td><td>${esc(r.zone) || '—'}</td>` +
        `<td>${esc(r.source || 'newsletter')}</td><td>${r.consent_at ? esc(fmt(r.consent_at)) : (r.source === 'newsletter' ? '✓' : '—')}</td>`;
      tbody.appendChild(tr);
    });
  }
  document.getElementById('leadsExport').addEventListener('click', () => {
    if (!lastLeads) return;
    const head = ['date', 'name', 'email', 'phone', 'area', 'language', 'source', 'consent_at'];
    const lines = [head.join(',')].concat(lastLeads.filter((r) => !r.unsubscribed_at).map((r) =>
      [r.created_at, r.name, r.email, r.phone, r.zone, r.lang, r.source, r.consent_at || ''].map(csvCell).join(',')));
    const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `prospects-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  async function showDashboard() {
    dashboard.hidden = false;
    let start = 'home';
    try { start = sessionStorage.getItem('magicstick_admin_section') || 'home'; } catch (_) { /* private mode */ }
    if (!document.getElementById(`dashSection-${start}`)) start = 'home';
    await Promise.all([loadQuotes(), loadGiftCards(), loadGiftRequests(), loadLeads(), loadJobs(), loadSupplies(), loadSiteSettingsAdmin(), loadStaff(), loadVisits(), loadPartners(), loadProspects()]);
    openSection(start);
    renderHome(true);
    await loadCategories();
    loadServices();
    loadAddons();
    initAi();
  }

  // ---------- Site care (Entretien): health, top-bar message, inventory, backup ----------
  const careCfg = window.MAGICSTICK_CONFIG || {};
  let lastSupplies = null;
  const agoText = (iso) => {
    if (!iso) return t('admin.care.never');
    const days = Math.floor((Date.now() - new Date(iso)) / 864e5);
    return days <= 0 ? t('admin.care.today') : t('admin.care.daysAgo', { n: days });
  };

  async function timed(fn) {
    const t0 = performance.now();
    try { const ok = await fn(); return { ok, ms: Math.round(performance.now() - t0) }; } catch (_) { return { ok: false, ms: Math.round(performance.now() - t0) }; }
  }
  async function runHealth() {
    const ul = document.getElementById('careHealth');
    if (!ul) return;
    const page = (path) => () => fetch(path, { cache: 'no-store' }).then((r) => r.ok);
    const fn = (name, body, okStatuses) => () => fetch(`${careCfg.FUNCTIONS_URL}/${name}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).then((r) => okStatuses.includes(r.status));
    const checks = [
      ['admin.care.chk.home', page('/')],
      ['admin.care.chk.quote', page('/quote.html')],
      ['admin.care.chk.book', page('/book.html')],
      ['admin.care.chk.pay', page('/pay.html')],
      ['admin.care.chk.gifts', page('/gift-cards.html')],
      ['admin.care.chk.careers', page('/careers.html')],
      ['admin.care.chk.db', async () => !(await supabase.from('site_settings').select('id').limit(1)).error],
      ['admin.care.chk.payments', fn('quote-pay', { action: 'get', code: 'AAAAAAAAAA' }, [200, 404])],
      ['admin.care.chk.giftFn', fn('gift-cards', { action: 'check', code: 'MSC-0000-0000-0000' }, [200])],
    ];
    ul.innerHTML = checks.map(([k], i) => `<li style="--i:${i}"><span class="dot is-wait"></span><span>${esc(t(k))}</span><span class="fine">…</span></li>`).join('');
    const items = [...ul.children];
    let bad = 0;
    await Promise.all(checks.map(async ([, check], i) => {
      const r = await timed(check);
      if (!r.ok) bad += 1;
      items[i].querySelector('.dot').className = `dot ${r.ok ? 'is-ok' : 'is-bad'}`;
      items[i].querySelector('.fine').textContent = r.ok ? `${r.ms} ms` : t('admin.care.down');
    }));
    setBadge('care', bad + lowStock().length);
  }

  function renderActivity() {
    const ul = document.getElementById('careActivity');
    if (!ul) return;
    const newest = (arr, key = 'created_at') => (arr || []).reduce((m, x) => (x[key] && (!m || x[key] > m) ? x[key] : m), null);
    const rows = [
      ['admin.care.act.quote', newest(lastQuotes), 21],
      ['admin.care.act.paid', newest(lastQuotes, 'paid_at'), 0],
      ['admin.care.act.lead', newest(lastLeads), 0],
      ['admin.care.act.job', newest(lastJobs), 0],
      ['admin.care.act.gift', newest(lastGiftCards), 0],
    ];
    ul.innerHTML = rows.map(([k, iso, warnDays], i) => {
      const old = warnDays && (!iso || (Date.now() - new Date(iso)) > warnDays * 864e5);
      return `<li style="--i:${i}"><span class="dot ${old ? 'is-warn' : 'is-ok'}"></span><span>${esc(t(k))}</span><span class="fine">${esc(agoText(iso))}</span></li>`;
    }).join('') + (rows[0][1] && (Date.now() - new Date(rows[0][1])) > 21 * 864e5 ? `<li class="care-tip">${esc(t('admin.care.quietTip'))}</li>` : '');
  }

  async function loadSiteSettingsAdmin() {
    const { data } = await supabase.from('site_settings').select('*').eq('id', 'main').maybeSingle();
    if (!data) return;
    document.getElementById('carePromoOn').checked = data.promo_enabled !== false;
    document.getElementById('carePromoFr').value = data.promo_text_fr || '';
    document.getElementById('carePromoEn').value = data.promo_text_en || '';
    document.getElementById('careNoticeOn').checked = !!data.notice_enabled;
    document.getElementById('careNoticeFr').value = data.notice_fr || '';
    document.getElementById('careNoticeEn').value = data.notice_en || '';
    document.getElementById('careNoticeUntil').value = data.notice_until || '';
  }
  document.getElementById('careBarForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const note = document.getElementById('careBarNote');
    const v = (id) => document.getElementById(id).value.trim() || null;
    const patch = {
      promo_enabled: document.getElementById('carePromoOn').checked,
      promo_text_fr: v('carePromoFr'), promo_text_en: v('carePromoEn'),
      notice_enabled: document.getElementById('careNoticeOn').checked,
      notice_fr: v('careNoticeFr'), notice_en: v('careNoticeEn'), notice_until: v('careNoticeUntil'),
      updated_at: new Date().toISOString(),
    };
    if (patch.notice_enabled && !patch.notice_fr && !patch.notice_en) { note.textContent = t('admin.care.noticeEmpty'); return; }
    const { error } = await supabase.from('site_settings').update(patch).eq('id', 'main');
    note.textContent = error ? t('admin.orders.saveError') : t('admin.care.saved');
  });

  const lowStock = () => (lastSupplies || []).filter((x) => Number(x.quantity) <= Number(x.min_quantity));
  async function loadSupplies() {
    const { data, error } = await supabase.from('supplies').select('*').order('name');
    if (error || !data) return;
    lastSupplies = data;
    renderSupplies();
  }
  function renderSupplies() {
    const ul = document.getElementById('careStock');
    if (!ul || !lastSupplies) return;
    ul.innerHTML = lastSupplies.length ? '' : `<li class="fine">${esc(t('admin.care.stockEmpty'))}</li>`;
    lastSupplies.forEach((x, i) => {
      const low = Number(x.quantity) <= Number(x.min_quantity);
      const li = document.createElement('li');
      li.className = low ? 'is-low' : '';
      li.style.setProperty('--i', String(i));
      li.innerHTML = `<div><b>${esc(x.name)}</b><span class="fine">${esc(t('admin.care.stockMin', { n: x.min_quantity }))}${low ? ` · ${esc(t('admin.care.toBuy'))}` : ''}</span></div>
        <div class="stock-ctrl"><button type="button" data-d="-1" aria-label="−">−</button><output>${esc(String(Number(x.quantity)))}</output><span class="fine">${esc(x.unit || '')}</span><button type="button" data-d="1" aria-label="+">+</button><button type="button" class="stock-del" aria-label="${esc(t('admin.care.stockDelete'))}">×</button></div>`;
      li.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', async () => {
        const q = Math.max(0, Number(x.quantity) + Number(b.dataset.d));
        const { error } = await supabase.from('supplies').update({ quantity: q, updated_at: new Date().toISOString() }).eq('id', x.id);
        if (!error) { x.quantity = q; renderSupplies(); renderHome(); }
      }));
      li.querySelector('.stock-del').addEventListener('click', async () => {
        if (!confirm(t('admin.care.stockDeleteConfirm', { name: x.name }))) return;
        const { error } = await supabase.from('supplies').delete().eq('id', x.id);
        if (!error) { lastSupplies = lastSupplies.filter((y) => y.id !== x.id); renderSupplies(); renderHome(); }
      });
      ul.appendChild(li);
    });
    setBadge('care', lowStock().length);
  }
  document.getElementById('careStockForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const row = {
      name: document.getElementById('stockName').value.trim(),
      unit: document.getElementById('stockUnit').value.trim() || null,
      quantity: Number(document.getElementById('stockQty').value) || 0,
      min_quantity: Number(document.getElementById('stockMin').value) || 0,
    };
    if (!row.name) return;
    const { error } = await supabase.from('supplies').insert(row);
    if (error) { alert(t('admin.orders.saveError')); return; }
    e.target.reset();
    loadSupplies();
  });

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);
  document.getElementById('careBackupJson')?.addEventListener('click', async () => {
    const note = document.getElementById('careBackupNote');
    note.textContent = t('admin.care.backupWorking');
    const tables = ['quote_requests', 'newsletter_subscribers', 'job_applications', 'gift_cards', 'gift_card_requests', 'gift_card_transactions', 'services', 'service_addons', 'supplies', 'site_settings', 'bookings', 'partners', 'employees', 'prospects'];
    const out = { exported_at: new Date().toISOString(), site: 'magicstickclean.ca' };
    for (const tb of tables) {
      const { data, error } = await supabase.from(tb).select('*');
      out[tb] = error ? { error: error.message } : data;
    }
    download(`magicstick-sauvegarde-${stamp()}.json`, JSON.stringify(out, null, 2), 'application/json');
    note.textContent = t('admin.care.backupDone');
  });
  document.getElementById('careBackupCsv')?.addEventListener('click', () => {
    const cols = ['created_at', 'name', 'phone', 'email', 'address', 'zone', 'service', 'frequency', 'home_size', 'preferred_date', 'scheduled_date', 'quoted_amount_cents', 'paid_at', 'payment_method', 'completed_at', 'status', 'pay_code', 'message'];
    const cell = (v) => {
      let s = v == null ? '' : String(v);
      if (/^[=+\-@]/.test(s)) s = `'${s}`; // no spreadsheet formulas
      return `"${s.replace(/"/g, '""')}"`;
    };
    const rows = (lastQuotes || []).map((q) => cols.map((c) => cell(c === 'quoted_amount_cents' && q[c] != null ? (q[c] / 100).toFixed(2) : q[c])).join(','));
    download(`magicstick-commandes-${stamp()}.csv`, '﻿' + [cols.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8');
  });
  document.getElementById('careCheckBtn')?.addEventListener('click', runHealth);

  // ---------- AI assistant section ----------
  let aiInited = false;
  const aiOwnerMessages = [];
  function initAi() {
    if (aiInited) return;
    aiInited = true;
    const clientEn = document.getElementById('aiClientEn');
    const clientFr = document.getElementById('aiClientFr');
    const ownerNotes = document.getElementById('aiOwnerNotes');
    if (!clientEn) return;

    // Load saved knowledge
    (async () => {
      const { data } = await supabase.from('ai_knowledge').select('id, content, content_fr');
      (data || []).forEach((row) => {
        if (row.id === 'client') { clientEn.value = row.content || ''; clientFr.value = row.content_fr || ''; }
        if (row.id === 'owner' && ownerNotes) { ownerNotes.value = row.content || ''; }
      });
    })();

    async function saveRow(id, content, content_fr, noteEl, btn) {
      const original = btn.textContent;
      btn.disabled = true; noteEl.style.color = ''; noteEl.textContent = t('admin.ai.saving');
      const payload = { content: content || '' };
      if (content_fr !== null) payload.content_fr = content_fr || '';
      payload.updated_at = new Date().toISOString();
      const { error } = await supabase.from('ai_knowledge').update(payload).eq('id', id);
      btn.disabled = false; btn.textContent = original;
      if (error) { noteEl.style.color = '#c0392b'; noteEl.textContent = t('admin.ai.saveError'); return; }
      noteEl.style.color = 'var(--teal, #2E8BE6)'; noteEl.textContent = t('admin.ai.saved');
      setTimeout(() => { noteEl.textContent = ''; }, 2500);
    }

    document.getElementById('aiClientSave').addEventListener('click', () => {
      saveRow('client', clientEn.value, clientFr.value, document.getElementById('aiClientNote'), document.getElementById('aiClientSave'));
    });
    const notesSave = document.getElementById('aiOwnerNotesSave');
    if (notesSave) notesSave.addEventListener('click', () => {
      saveRow('owner', ownerNotes.value, null, document.getElementById('aiOwnerNotesNote'), notesSave);
    });

    // Owner private chat
    const log = document.getElementById('aiOwnerLog');
    const form = document.getElementById('aiOwnerForm');
    const input = document.getElementById('aiOwnerInput');
    const sendBtn = document.getElementById('aiOwnerSend');

    function bubble(role, text) {
      const el = document.createElement('div');
      el.className = 'ai-msg ai-msg-' + role;
      el.textContent = text;
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
      return el;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      bubble('user', text);
      aiOwnerMessages.push({ role: 'user', content: text });
      sendBtn.disabled = true;
      const thinking = bubble('assistant', t('admin.ai.thinking'));
      thinking.classList.add('ai-msg-thinking');
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token ?? '';
        const res = await fetch(`${backend.config.FUNCTIONS_URL}/owner-assistant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messages: aiOwnerMessages.slice(-24), lang: lang() }),
        });
        const result = await res.json();
        thinking.remove();
        if (!res.ok || !result.reply) {
          bubble('assistant', t('admin.ai.error'));
        } else {
          bubble('assistant', result.reply);
          aiOwnerMessages.push({ role: 'assistant', content: result.reply });
        }
      } catch (err) {
        thinking.remove();
        bubble('assistant', t('admin.ai.error'));
      }
      sendBtn.disabled = false;
      input.focus();
    });
  }

  // ---------- Two-step sign-in (password + authenticator app) ----------
  // The database only hands admin data to sessions that passed the second
  // step (aal2, migration 0027), so this screen is not just cosmetic.
  const mfaForm = document.getElementById('adminMfaForm');
  let mfaFactorId = null;

  async function showMfa() {
    loginForm.hidden = true;
    mfaForm.hidden = false;
    const note = document.getElementById('adminMfaNote');
    note.textContent = '';
    const { data: factors, error } = await supabase.auth.mfa.listFactors();
    if (error) { note.textContent = t('admin.mfa.error'); return; }
    const verified = (factors.totp || []).find((f) => f.status === 'verified');
    const enrollBox = document.getElementById('adminMfaEnroll');
    if (verified) {
      mfaFactorId = verified.id;
      enrollBox.hidden = true;
      document.getElementById('adminMfaTitle').textContent = t('admin.mfa.verifyTitle');
      document.getElementById('adminMfaLede').textContent = t('admin.mfa.verifyLede');
    } else {
      // First time: drop half-finished setups, then show a fresh QR code.
      for (const f of (factors.all || []).filter((x) => x.status !== 'verified')) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp', friendlyName: `Magicstick Clean ${new Date().toISOString().slice(0, 10)}`,
      });
      if (enrollError) { note.textContent = t('admin.mfa.error'); return; }
      mfaFactorId = enrolled.id;
      // Supabase returns the QR code as an un-encoded SVG data URL; encode it
      // so every browser draws it.
      const qr = String(enrolled.totp.qr_code || '');
      const m = qr.match(/^data:image\/svg\+xml;(?:utf-8|charset=utf-8),([\s\S]*)$/i);
      document.getElementById('adminMfaQr').src = m && /[<>#]/.test(m[1])
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(m[1])}`
        : qr;
      document.getElementById('adminMfaSecret').textContent = enrolled.totp.secret;
      enrollBox.hidden = false;
      document.getElementById('adminMfaTitle').textContent = t('admin.mfa.enrollTitle');
      document.getElementById('adminMfaLede').textContent = t('admin.mfa.enrollLede');
    }
    setTimeout(() => document.getElementById('adminMfaCode').focus(), 30);
  }

  mfaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const note = document.getElementById('adminMfaNote');
    const code = document.getElementById('adminMfaCode').value.replace(/\D/g, '');
    if (code.length !== 6 || !mfaFactorId) { note.textContent = t('admin.mfa.badCode'); return; }
    note.textContent = t('admin.mfa.checking');
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code });
    if (error) {
      note.textContent = t('admin.mfa.badCode');
      document.getElementById('adminMfaCode').select();
      return;
    }
    mfaForm.hidden = true;
    mfaForm.reset();
    checkAccess();
  });

  document.getElementById('adminMfaCancel').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });

  async function checkAccess() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) {
      loginForm.hidden = false;
      if (backend.consumeIdleNotice && backend.consumeIdleNotice()) {
        document.getElementById('adminLoginNote').textContent = t('auth.idleSignedOut');
      }
      return;
    }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!aal || aal.currentLevel !== 'aal2') {
      showMfa();
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

  // ---------- Change password ----------
  (function initChangePassword() {
    const modal = document.getElementById('adminPwModal');
    const openBtn = document.getElementById('adminChangePwBtn');
    const cancelBtn = document.getElementById('adminPwCancel');
    const backdrop = document.getElementById('adminPwBackdrop');
    const form = document.getElementById('adminPwForm');
    if (!modal || !openBtn || !form) return;
    const note = document.getElementById('adminPwNote');
    const pw1 = document.getElementById('adminNewPw');
    const pw2 = document.getElementById('adminNewPw2');

    function open() { note.textContent = ''; form.reset(); modal.hidden = false; setTimeout(() => pw1.focus(), 30); }
    function close() { modal.hidden = true; }

    openBtn.addEventListener('click', open);
    cancelBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      note.style.color = '';
      if (pw1.value.length < 8) { note.textContent = t('admin.changePw.tooShort'); return; }
      if (pw1.value !== pw2.value) { note.textContent = t('admin.changePw.mismatch'); return; }
      note.textContent = t('admin.changePw.saving');
      const { error } = await supabase.auth.updateUser({ password: pw1.value });
      if (error) { note.textContent = translateAuthError(error.message); return; }
      note.style.color = 'var(--teal, #2E8BE6)';
      note.textContent = t('admin.changePw.done');
      setTimeout(close, 1400);
    });
  })();
})();
