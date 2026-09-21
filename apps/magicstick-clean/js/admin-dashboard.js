// Owner dashboard shell: sidebar navigation + demo/mock data for every
// module the owner asked for (local research, SEO, content/local marketing,
// report generator, agency pack, API, SMM, file manager, notifications,
// ad manager, booking calendar, backups, audits, AI research notes).
//
// IMPORTANT — this is a functional mockup, not a wired backend: nothing here
// talks to a real database, a real social network, or a real AI API. State
// lives in localStorage so the demo feels persistent across reloads. The
// existing Quote requests / Bookings / Services tabs (js/admin.js) are the
// only part of this page that talk to a real backend (Supabase), once it's
// provisioned — this script does not touch them.
(function () {
  const shell = document.getElementById('dashShell');
  if (!shell) return;

  const t = (key, vars) => (window.MagicstickI18N ? window.MagicstickI18N.t(key, vars) : key);
  const esc = (v) => (window.MagicstickI18N ? window.MagicstickI18N.escapeHtml(v) : String(v ?? ''));

  const STORE_KEY = 'magicstick_admin_mock_v1';
  const todayISO = () => new Date().toISOString().slice(0, 10);

  function seedData() {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleDateString('en', { month: 'short' }));
    }
    return {
      seededAt: new Date().toISOString(),
      revenueByMonth: months.map((m, i) => ({ label: m, revenue: 2200 + i * 340 + (i % 2 ? 180 : -90), bookings: 14 + i * 2 })),
      trafficByMonth: months.map((m, i) => ({ label: m, sessions: 480 + i * 95, leads: 18 + i * 3 })),
      notifications: [
        { id: 'n1', type: 'order', title: 'New booking request', detail: 'Sophie L. — Deep Cleaning, Ottawa', time: '10 min ago', unread: true },
        { id: 'n2', type: 'payment', title: 'Payment proof received', detail: 'Deposit for booking #A2291 — $60', time: '52 min ago', unread: true },
        { id: 'n3', type: 'order', title: 'New quote request', detail: 'Marc T. — Standard Cleaning, Gatineau', time: '3 hours ago', unread: false },
        { id: 'n4', type: 'payment', title: 'Payment proof received', detail: 'Deposit for booking #A2287 — $75', time: 'Yesterday', unread: false },
      ],
      bookings: [
        { date: offsetDate(0), time: '09:00', hours: 2, name: 'Sophie L.', location: 'Ottawa — Centretown', service: 'Deep Cleaning' },
        { date: offsetDate(0), time: '13:30', hours: 1.5, name: 'Marc T.', location: 'Gatineau — Hull', service: 'Standard Cleaning' },
        { date: offsetDate(2), time: '10:00', hours: 3, name: 'Family Dubois', location: 'Clarence-Rockland', service: 'Move-In/Move-Out' },
        { date: offsetDate(5), time: '08:30', hours: 2, name: 'Airbnb — Le Nid', location: 'Ottawa — ByWard', service: 'Airbnb Turnover' },
        { date: offsetDate(8), time: '14:00', hours: 4, name: 'Bureau Lacroix', location: 'Gatineau — Aylmer', service: 'Office Cleaning' },
        { date: offsetDate(12), time: '09:30', hours: 2, name: 'Jean P.', location: 'Ottawa — Orléans', service: 'Standard Cleaning' },
      ],
      localListings: [
        { name: 'Google Business Profile', status: 'good', note: 'Verified, 4.9★ (38 reviews)' },
        { name: 'Bing Places', status: 'good', note: 'Verified' },
        { name: 'Yelp', status: 'warn', note: 'Claimed, missing photos' },
        { name: 'Yellow Pages', status: 'warn', note: 'Listing outdated (old phone number)' },
        { name: 'Facebook Business', status: 'good', note: 'Active, posts weekly' },
      ],
      keywords: [
        { term: 'cleaning service ottawa', pos: 4, delta: 2, volume: '2.4K' },
        { term: 'femme de ménage gatineau', pos: 7, delta: -1, volume: '880' },
        { term: 'airbnb turnover cleaning ottawa', pos: 3, delta: 1, volume: '320' },
        { term: 'deep cleaning clarence-rockland', pos: 2, delta: 0, volume: '210' },
        { term: 'move out cleaning ottawa', pos: 9, delta: 3, volume: '590' },
      ],
      contentIdeas: [
        { title: '5 signes qu’il est temps de faire un grand ménage', status: 'idea' },
        { title: 'Airbnb hosts: the 45-minute turnover checklist', status: 'drafting' },
        { title: 'Avant/après: cuisine de restaurant après rénovation', status: 'scheduled' },
        { title: 'Why we bring our own eco-friendly supplies', status: 'published' },
      ],
      smmAccounts: [
        { name: 'Instagram', connected: true, followers: 612 },
        { name: 'Facebook', connected: true, followers: 940 },
        { name: 'Google Business Profile', connected: true, followers: null },
        { name: 'TikTok', connected: false, followers: 0 },
      ],
      smmQueue: [
        { date: offsetDate(1), platform: 'Instagram', copy: 'Before/after: hardwood floor reset in Rockland ✨' },
        { date: offsetDate(3), platform: 'Facebook', copy: 'First-time client special — 15% off your first clean' },
      ],
      ads: [
        { name: 'First-time client special (hero tag)', page: 'Homepage hero', on: true, text: 'First-time client special', link: 'quote.html' },
        { name: 'Contact band lede', page: 'Every page — contact band', on: true, text: 'Come home to a house that breathes.', link: '' },
        { name: 'Gift card promo banner', page: 'Gift cards page', on: false, text: 'Give the gift of a clean home', link: 'gift-cards.html' },
      ],
      files: [],
      backups: [
        { date: offsetDate(-7), size: '412 KB', label: 'Weekly auto-backup' },
        { date: offsetDate(-14), size: '398 KB', label: 'Weekly auto-backup' },
      ],
      audits: [
        { name: 'Security audit (XSS, RLS, auth hardening)', date: offsetDate(-9), score: 92, kind: 'security' },
        { name: 'Sitewide UX & accessibility pass', date: offsetDate(-4), score: 88, kind: 'ux' },
        { name: 'SEO technical audit', date: offsetDate(-20), score: 76, kind: 'seo' },
      ],
      apiKey: 'msk_live_' + Math.random().toString(36).slice(2, 18),
    };
  }

  function offsetDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (err) { /* ignore, reseed */ }
    const seeded = seedData();
    saveData(seeded);
    return seeded;
  }
  function saveData(d) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch (err) { /* storage full/blocked */ }
  }

  let data = loadData();

  // ---------- Sidebar navigation ----------
  function initNav() {
    const buttons = shell.querySelectorAll('.dash-nav-btn[data-section]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        shell.querySelectorAll('.dash-section').forEach((s) => s.classList.remove('active'));
        const target = shell.querySelector(`#dashSection-${btn.dataset.section}`);
        if (target) target.classList.add('active');
        renderSection(btn.dataset.section);
      });
    });
  }

  const renderers = {};
  function renderSection(name) {
    if (renderers[name]) renderers[name]();
  }

  // ---------- Bell / notifications dropdown ----------
  function initBell() {
    const btn = document.getElementById('dashBellBtn');
    const panel = document.getElementById('dashBellPanel');
    if (!btn || !panel) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('show');
      if (panel.classList.contains('show')) renderBellPanel();
    });
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && e.target !== btn) panel.classList.remove('show');
    });
    updateBellDot();
  }
  function updateBellDot() {
    const dot = document.getElementById('dashBellDot');
    const hasUnread = data.notifications.some((n) => n.unread);
    if (dot) dot.hidden = !hasUnread;
  }
  function notifIconSvg(type) {
    if (type === 'payment') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';
  }
  function renderBellPanel() {
    const list = document.getElementById('dashBellList');
    if (!list) return;
    list.innerHTML = data.notifications.slice(0, 6).map((n) => `
      <div class="dash-notif-item ${n.unread ? 'unread' : ''}">
        <span class="dash-notif-icon ${n.type === 'payment' ? 'pay' : ''}">${notifIconSvg(n.type)}</span>
        <div class="dash-notif-body" style="flex:1;">
          <strong>${esc(n.title)}</strong>
          <span>${esc(n.detail)}</span>
        </div>
        <span class="dash-notif-time">${esc(n.time)}</span>
      </div>
    `).join('') || `<div class="dash-empty">${esc(t('admin.dash.notifEmpty'))}</div>`;
  }
  document.addEventListener('DOMContentLoaded', () => {}, { once: true });

  // ================================================================
  // 1. OVERVIEW
  // ================================================================
  renderers.overview = function renderOverview() {
    const kpis = document.getElementById('dashOverviewKpis');
    const totalRevenue = data.revenueByMonth.reduce((s, m) => s + m.revenue, 0);
    const totalBookings = data.bookings.length;
    const lastMonth = data.revenueByMonth[data.revenueByMonth.length - 1];
    const prevMonth = data.revenueByMonth[data.revenueByMonth.length - 2] || lastMonth;
    const delta = prevMonth.revenue ? Math.round(((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100) : 0;
    if (kpis) {
      kpis.innerHTML = `
        <div class="dash-kpi">
          <div class="dash-kpi-label">${esc(t('admin.dash.kpi.revenue'))}</div>
          <div class="dash-kpi-value">$${lastMonth.revenue.toLocaleString()}</div>
          <div class="dash-kpi-delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}%</div>
        </div>
        <div class="dash-kpi">
          <div class="dash-kpi-label">${esc(t('admin.dash.kpi.bookings'))}</div>
          <div class="dash-kpi-value">${totalBookings}</div>
          <div class="dash-kpi-delta up">▲ 12%</div>
        </div>
        <div class="dash-kpi">
          <div class="dash-kpi-label">${esc(t('admin.dash.kpi.leads'))}</div>
          <div class="dash-kpi-value">${data.trafficByMonth[data.trafficByMonth.length - 1].leads}</div>
          <div class="dash-kpi-delta up">▲ 8%</div>
        </div>
        <div class="dash-kpi">
          <div class="dash-kpi-label">${esc(t('admin.dash.kpi.rating'))}</div>
          <div class="dash-kpi-value">4.9★</div>
          <div class="dash-kpi-delta up">38 ${esc(t('admin.dash.reviews'))}</div>
        </div>
      `;
    }
    makeLineChart('dashOverviewChart', data.revenueByMonth.map((m) => m.label), [
      { label: t('admin.dash.kpi.revenue'), data: data.revenueByMonth.map((m) => m.revenue), color: '#0B5D52' },
    ]);
    const activity = document.getElementById('dashOverviewActivity');
    if (activity) {
      activity.innerHTML = data.notifications.slice(0, 5).map((n) => `
        <div class="dash-notif-item">
          <span class="dash-notif-icon ${n.type === 'payment' ? 'pay' : ''}">${notifIconSvg(n.type)}</span>
          <div class="dash-notif-body" style="flex:1;"><strong>${esc(n.title)}</strong><span>${esc(n.detail)}</span></div>
          <span class="dash-notif-time">${esc(n.time)}</span>
        </div>
      `).join('');
    }
  };

  // ================================================================
  // 2. CALENDAR / BOOKINGS
  // ================================================================
  let calCursor = new Date();
  calCursor.setDate(1);
  renderers.calendar = function renderCalendar() {
    drawCalendar();
    const prev = document.getElementById('dashCalPrev');
    const next = document.getElementById('dashCalNext');
    if (prev && !prev.dataset.wired) { prev.dataset.wired = '1'; prev.addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth() - 1); drawCalendar(); }); }
    if (next && !next.dataset.wired) { next.dataset.wired = '1'; next.addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth() + 1); drawCalendar(); }); }
  };
  function bookingsOn(dateStr) { return data.bookings.filter((b) => b.date === dateStr); }
  function drawCalendar() {
    const label = document.getElementById('dashCalLabel');
    const grid = document.getElementById('dashCalGrid');
    if (!grid) return;
    if (label) label.textContent = calCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const year = calCursor.getFullYear(), month = calCursor.getMonth();
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const todayStr = todayISO();
    const cells = [];
    const dowLabels = [t('admin.dash.cal.mon'), t('admin.dash.cal.tue'), t('admin.dash.cal.wed'), t('admin.dash.cal.thu'), t('admin.dash.cal.fri'), t('admin.dash.cal.sat'), t('admin.dash.cal.sun')];
    let html = dowLabels.map((d) => `<div class="dash-cal-dow">${esc(d)}</div>`).join('');
    for (let i = 0; i < firstDow; i++) {
      const dayNum = daysInPrev - firstDow + 1 + i;
      html += `<div class="dash-cal-day other-month"><div class="dash-cal-daynum">${dayNum}</div></div>`;
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const events = bookingsOn(dateStr);
      const isToday = dateStr === todayStr;
      let evHtml = events.slice(0, 2).map((e) => `<div class="dash-cal-event">${e.time} ${esc(e.name)}</div>`).join('');
      if (events.length > 2) evHtml += `<div class="dash-cal-more">+${events.length - 2} ${esc(t('admin.dash.cal.more'))}</div>`;
      html += `<div class="dash-cal-day ${isToday ? 'today' : ''}" data-date="${dateStr}"><div class="dash-cal-daynum">${day}</div>${evHtml}</div>`;
    }
    grid.innerHTML = html;
    grid.querySelectorAll('.dash-cal-day[data-date]').forEach((cell) => {
      cell.addEventListener('click', () => showBookingsForDate(cell.dataset.date));
    });
    const firstWithBookings = data.bookings.find((b) => b.date >= todayStr) || data.bookings[0];
    if (firstWithBookings) showBookingsForDate(firstWithBookings.date);
    else showBookingsForDate(todayStr);
  }
  function showBookingsForDate(dateStr) {
    const list = document.getElementById('dashBookingList');
    const heading = document.getElementById('dashBookingListDate');
    if (!list) return;
    if (heading) heading.textContent = new Date(dateStr + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const events = bookingsOn(dateStr);
    list.innerHTML = events.length ? events.map((b) => `
      <div class="dash-booking-row">
        <div class="dash-booking-time">${b.time}</div>
        <div class="dash-booking-main">
          <strong>${esc(b.name)} — ${esc(b.service)}</strong>
          <div class="dash-booking-meta">${esc(b.location)} · ${b.hours}h</div>
        </div>
        <span class="dash-pill good">${esc(t('admin.dash.confirmed'))}</span>
      </div>
    `).join('') : `<div class="dash-empty">${esc(t('admin.dash.cal.noBookings'))}</div>`;
  }

  // ================================================================
  // 3. LOCAL RESEARCH
  // ================================================================
  renderers['local-research'] = function () {
    const kw = document.getElementById('dashLocalKeywords');
    if (kw) {
      kw.innerHTML = data.keywords.map((k) => `
        <tr>
          <td>${esc(k.term)}</td>
          <td>#${k.pos}</td>
          <td class="${k.delta > 0 ? '' : k.delta < 0 ? '' : ''}">${k.delta > 0 ? '▲' : k.delta < 0 ? '▼' : '–'} ${Math.abs(k.delta)}</td>
          <td>${esc(k.volume)}/mo</td>
        </tr>
      `).join('');
    }
    const listings = document.getElementById('dashLocalCompetitors');
    if (listings) {
      const competitors = [
        { name: 'CleanPro Ottawa', reviews: 210, rating: 4.6 },
        { name: 'Gatineau Éclat Ménager', reviews: 84, rating: 4.4 },
        { name: 'Rockland Home Services', reviews: 47, rating: 4.7 },
      ];
      listings.innerHTML = competitors.map((c) => `
        <div class="dash-booking-row">
          <div class="dash-booking-main">
            <strong>${esc(c.name)}</strong>
            <div class="dash-booking-meta">${c.rating}★ · ${c.reviews} ${esc(t('admin.dash.reviews'))}</div>
          </div>
        </div>
      `).join('');
    }
  };

  // ================================================================
  // 4. CONTENT MARKETING
  // ================================================================
  const STATUS_LABELS = { idea: 'idea', drafting: 'drafting', scheduled: 'scheduled', published: 'published' };
  renderers['content-marketing'] = function renderContent() {
    const board = document.getElementById('dashContentBoard');
    if (!board) return;
    const cols = ['idea', 'drafting', 'scheduled', 'published'];
    board.innerHTML = cols.map((col) => `
      <div class="dash-card" style="margin-bottom:0;">
        <div class="dash-card-head"><h3>${esc(t('admin.dash.content.' + col))}</h3></div>
        <div data-col="${col}">
          ${data.contentIdeas.filter((c) => c.status === col).map((c) => `<div class="dash-booking-row"><div class="dash-booking-main"><strong>${esc(c.title)}</strong></div></div>`).join('') || `<div class="dash-empty">—</div>`}
        </div>
      </div>
    `).join('');
    const form = document.getElementById('dashContentForm');
    if (form && !form.dataset.wired) {
      form.dataset.wired = '1';
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('dashContentInput');
        const title = input.value.trim();
        if (!title) return;
        data.contentIdeas.unshift({ title, status: 'idea' });
        saveData(data);
        input.value = '';
        renderContent();
      });
    }
  };

  // ================================================================
  // 5. LOCAL MARKETING
  // ================================================================
  renderers['local-marketing'] = function () {
    const body = document.getElementById('dashLocalListingsBody');
    if (!body) return;
    body.innerHTML = data.localListings.map((l) => `
      <tr>
        <td>${esc(l.name)}</td>
        <td><span class="dash-pill ${l.status}">${l.status === 'good' ? esc(t('admin.dash.ok')) : esc(t('admin.dash.attention'))}</span></td>
        <td>${esc(l.note)}</td>
      </tr>
    `).join('');
  };

  // ================================================================
  // 6. SEO DASHBOARD
  // ================================================================
  renderers.seo = function renderSeo() {
    const ring = document.getElementById('dashSeoScore');
    if (ring) {
      const score = 78;
      ring.style.setProperty('--pct', score);
      ring.querySelector('strong').textContent = score;
    }
    makeLineChart('dashSeoTrafficChart', data.trafficByMonth.map((m) => m.label), [
      { label: t('admin.dash.seo.sessions'), data: data.trafficByMonth.map((m) => m.sessions), color: '#0B5D52' },
      { label: t('admin.dash.seo.leads'), data: data.trafficByMonth.map((m) => m.leads), color: '#C9A227' },
    ]);
    const kwBody = document.getElementById('dashSeoKeywordsBody');
    if (kwBody) {
      kwBody.innerHTML = data.keywords.map((k) => `
        <tr>
          <td>${esc(k.term)}</td>
          <td>#${k.pos}</td>
          <td>${k.delta > 0 ? '▲' : k.delta < 0 ? '▼' : '–'} ${Math.abs(k.delta)}</td>
        </tr>
      `).join('');
    }
    const issues = document.getElementById('dashSeoIssues');
    if (issues) {
      const list = [
        { sev: 'warn', text: '3 images without descriptive alt text' },
        { sev: 'good', text: 'All pages have unique meta descriptions' },
        { sev: 'warn', text: 'Location pages could use more internal links' },
        { sev: 'good', text: 'Core Web Vitals: good on mobile & desktop' },
      ];
      issues.innerHTML = list.map((i) => `<div class="dash-booking-row"><span class="dash-pill ${i.sev}">${i.sev === 'good' ? '✓' : '!'}</span><div class="dash-booking-main"><strong>${esc(i.text)}</strong></div></div>`).join('');
    }
  };

  // ================================================================
  // 7. AUDITS
  // ================================================================
  renderers.audits = function () {
    const list = document.getElementById('dashAuditsList');
    if (!list) return;
    list.innerHTML = data.audits.map((a) => `
      <div class="dash-booking-row">
        <div class="dash-booking-main">
          <strong>${esc(a.name)}</strong>
          <div class="dash-booking-meta">${esc(a.date)}</div>
        </div>
        <span class="dash-pill ${a.score >= 85 ? 'good' : a.score >= 70 ? 'warn' : 'bad'}">${a.score}/100</span>
        <button type="button" class="dash-btn" data-print-audit="${esc(a.name)}">${esc(t('admin.dash.viewReport'))}</button>
      </div>
    `).join('');
    list.querySelectorAll('[data-print-audit]').forEach((btn) => {
      btn.addEventListener('click', () => openPrintableReport(btn.dataset.printAudit));
    });
  };

  // ================================================================
  // 8. AI RESEARCH
  // ================================================================
  renderers['ai-research'] = function () {
    const btn = document.getElementById('dashAiDraftBtn');
    const output = document.getElementById('dashAiOutput');
    if (btn && !btn.dataset.wired) {
      btn.dataset.wired = '1';
      btn.addEventListener('click', () => {
        const topic = document.getElementById('dashAiTopic').value.trim() || 'seasonal cleaning tips';
        output.value = `Draft idea — "${topic}"\n\n` +
          `Hook: Start with the one thing homeowners always forget.\n` +
          `Body: 3 quick, practical tips tied to Magicstick Clean's services.\n` +
          `CTA: "Book your next clean" → quote.html\n\n` +
          `(This is a placeholder draft generated locally — connect a real Claude API key in Settings → API to generate this live.)`;
      });
    }
  };

  // ================================================================
  // 9. REPORT GENERATOR
  // ================================================================
  renderers['report-generator'] = function () {
    const btn = document.getElementById('dashReportBtn');
    if (btn && !btn.dataset.wired) {
      btn.dataset.wired = '1';
      btn.addEventListener('click', () => openPrintableReport('Monthly performance report'));
    }
  };

  function openPrintableReport(title) {
    const win = window.open('', '_blank');
    if (!win) return;
    const rev = data.revenueByMonth[data.revenueByMonth.length - 1];
    win.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#1F2937;max-width:720px;margin:40px auto;padding:0 20px;}
        h1{font-size:22px;} h2{font-size:16px;margin-top:28px;border-bottom:1px solid #E4E0D4;padding-bottom:6px;}
        table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;}
        td,th{padding:6px 8px;border-bottom:1px solid #E4E0D4;text-align:left;}
        .brand{color:#0B5D52;font-weight:700;}
      </style></head><body>
      <p class="brand">Magicstick Clean</p>
      <h1>${esc(title)}</h1>
      <p>Generated ${new Date().toLocaleDateString()}</p>
      <h2>Revenue &amp; bookings (last 6 months)</h2>
      <table><tr><th>Month</th><th>Revenue</th><th>Bookings</th></tr>
      ${data.revenueByMonth.map((m) => `<tr><td>${m.label}</td><td>$${m.revenue}</td><td>${m.bookings}</td></tr>`).join('')}
      </table>
      <h2>Top keywords</h2>
      <table><tr><th>Keyword</th><th>Position</th><th>Monthly volume</th></tr>
      ${data.keywords.map((k) => `<tr><td>${k.term}</td><td>#${k.pos}</td><td>${k.volume}</td></tr>`).join('')}
      </table>
      <p style="margin-top:32px;color:#6B7280;font-size:12px;">This report was generated from demo data in the Owner dashboard mockup. Use the browser's Print dialog to save as PDF.</p>
      </body></html>
    `);
    win.document.close();
  }

  // ================================================================
  // 10. AGENCY PACK
  // ================================================================
  renderers['agency-pack'] = function () {
    const btn = document.getElementById('dashMediaKitBtn');
    if (btn && !btn.dataset.wired) {
      btn.dataset.wired = '1';
      btn.addEventListener('click', () => {
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`
          <!DOCTYPE html><html><head><meta charset="utf-8"><title>Magicstick Clean — Media Kit</title>
          <style>body{font-family:Arial,sans-serif;max-width:680px;margin:40px auto;color:#1F2937;}
          h1{color:#0B5D52;} .tag{background:#EEF8F6;color:#0B5D52;padding:4px 12px;border-radius:100px;font-size:12px;font-weight:700;display:inline-block;}
          </style></head><body>
          <span class="tag">Media Kit</span>
          <h1>Magicstick Clean</h1>
          <p>Locally owned home &amp; commercial cleaning serving Clarence-Rockland, Ottawa &amp; Gatineau.</p>
          <h3>Services</h3>
          <ul><li>Standard &amp; deep cleaning</li><li>Move-in / move-out</li><li>Airbnb turnovers</li><li>Office &amp; retail cleaning</li><li>Post-construction cleanup</li></ul>
          <h3>Contact</h3>
          <p>343-843-7761 · magicstickclean@gmail.com</p>
          <p style="color:#6B7280;font-size:12px;margin-top:24px;">Print or save as PDF to share as a one-pager.</p>
          </body></html>
        `);
        win.document.close();
      });
    }
  };

  // ================================================================
  // 11. API
  // ================================================================
  renderers.api = function renderApi() {
    const keyEl = document.getElementById('dashApiKey');
    if (keyEl) keyEl.textContent = data.apiKey;
    const regen = document.getElementById('dashApiRegenBtn');
    if (regen && !regen.dataset.wired) {
      regen.dataset.wired = '1';
      regen.addEventListener('click', () => {
        data.apiKey = 'msk_live_' + Math.random().toString(36).slice(2, 18);
        saveData(data);
        renderApi();
      });
    }
    const copy = document.getElementById('dashApiCopyBtn');
    if (copy && !copy.dataset.wired) {
      copy.dataset.wired = '1';
      copy.addEventListener('click', () => {
        navigator.clipboard?.writeText(data.apiKey).then(() => {
          copy.textContent = t('admin.dash.copied');
          setTimeout(() => { copy.textContent = t('admin.dash.copy'); }, 1500);
        });
      });
    }
  };

  // ================================================================
  // 12. SMM
  // ================================================================
  renderers.smm = function renderSmm() {
    const accs = document.getElementById('dashSmmAccounts');
    if (accs) {
      accs.innerHTML = data.smmAccounts.map((a, i) => `
        <div class="dash-ad-row">
          <div class="dash-ad-main">
            <strong>${esc(a.name)}</strong>
            <span>${a.connected ? (a.followers != null ? a.followers + ' ' + esc(t('admin.dash.followers')) : esc(t('admin.dash.connected'))) : esc(t('admin.dash.notConnected'))}</span>
          </div>
          <button type="button" class="dash-switch ${a.connected ? 'on' : ''}" data-idx="${i}" aria-label="${esc(t('admin.dash.toggle'))}"></button>
        </div>
      `).join('');
      accs.querySelectorAll('.dash-switch').forEach((sw) => {
        sw.addEventListener('click', () => {
          const idx = Number(sw.dataset.idx);
          data.smmAccounts[idx].connected = !data.smmAccounts[idx].connected;
          saveData(data);
          renderSmm();
        });
      });
    }
    const queue = document.getElementById('dashSmmQueueBody');
    if (queue) {
      queue.innerHTML = data.smmQueue.map((q) => `<tr><td>${esc(q.date)}</td><td>${esc(q.platform)}</td><td>${esc(q.copy)}</td></tr>`).join('') || `<tr><td colspan="3">—</td></tr>`;
    }
    const form = document.getElementById('dashSmmForm');
    if (form && !form.dataset.wired) {
      form.dataset.wired = '1';
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const platform = document.getElementById('dashSmmPlatform').value;
        const copy2 = document.getElementById('dashSmmCopy').value.trim();
        if (!copy2) return;
        data.smmQueue.push({ date: todayISO(), platform, copy: copy2 });
        saveData(data);
        document.getElementById('dashSmmCopy').value = '';
        renderSmm();
      });
    }
  };

  // ================================================================
  // 13. FILES
  // ================================================================
  renderers.files = function renderFiles() {
    const zone = document.getElementById('dashDropzone');
    const input = document.getElementById('dashFileInput');
    const list = document.getElementById('dashFileList');
    const bar = document.getElementById('dashStorageFill');
    const label = document.getElementById('dashStorageLabel');

    function refreshList() {
      if (list) {
        list.innerHTML = data.files.map((f, i) => `
          <div class="dash-file-row">
            <span class="dash-file-icon">${esc((f.name.split('.').pop() || 'F').slice(0, 3).toUpperCase())}</span>
            <div class="dash-file-main"><strong>${esc(f.name)}</strong><span>${formatBytes(f.size)}</span></div>
            <button type="button" class="dash-file-del" data-idx="${i}" aria-label="${esc(t('a11y.remove') || 'Remove')}">✕</button>
          </div>
        `).join('') || `<div class="dash-empty">${esc(t('admin.dash.files.empty'))}</div>`;
        list.querySelectorAll('.dash-file-del').forEach((b) => b.addEventListener('click', () => {
          data.files.splice(Number(b.dataset.idx), 1);
          saveData(data);
          refreshList();
        }));
      }
      const used = data.files.reduce((s, f) => s + f.size, 0);
      const quota = 500 * 1024 * 1024;
      if (bar) bar.style.width = Math.min(100, (used / quota) * 100) + '%';
      if (label) label.textContent = `${formatBytes(used)} / ${formatBytes(quota)}`;
    }
    function addFiles(fileList) {
      Array.from(fileList).forEach((f) => data.files.push({ name: f.name, size: f.size }));
      saveData(data);
      refreshList();
    }
    if (zone && !zone.dataset.wired) {
      zone.dataset.wired = '1';
      zone.addEventListener('click', () => input.click());
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag');
        if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
      });
    }
    if (input && !input.dataset.wired) {
      input.dataset.wired = '1';
      input.addEventListener('change', () => { if (input.files.length) addFiles(input.files); input.value = ''; });
    }
    refreshList();
  };
  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ================================================================
  // 14. NOTIFICATIONS (full page)
  // ================================================================
  renderers.notifications = function renderNotifPage() {
    const list = document.getElementById('dashNotifPageList');
    function draw() {
      if (!list) return;
      list.innerHTML = data.notifications.map((n) => `
        <div class="dash-notif-item ${n.unread ? 'unread' : ''}">
          <span class="dash-notif-icon ${n.type === 'payment' ? 'pay' : ''}">${notifIconSvg(n.type)}</span>
          <div class="dash-notif-body" style="flex:1;"><strong>${esc(n.title)}</strong><span>${esc(n.detail)}</span></div>
          <span class="dash-notif-time">${esc(n.time)}</span>
        </div>
      `).join('') || `<div class="dash-empty">${esc(t('admin.dash.notifEmpty'))}</div>`;
    }
    draw();
    const markAll = document.getElementById('dashNotifMarkAll');
    if (markAll && !markAll.dataset.wired) {
      markAll.dataset.wired = '1';
      markAll.addEventListener('click', () => {
        data.notifications.forEach((n) => { n.unread = false; });
        saveData(data);
        draw();
        updateBellDot();
      });
    }
    const simOrder = document.getElementById('dashSimOrderBtn');
    if (simOrder && !simOrder.dataset.wired) {
      simOrder.dataset.wired = '1';
      simOrder.addEventListener('click', () => {
        data.notifications.unshift({ id: 'n' + Date.now(), type: 'order', title: t('admin.dash.newOrderSim'), detail: 'Client démo — Standard Cleaning', time: t('admin.dash.justNow'), unread: true });
        saveData(data);
        draw();
        updateBellDot();
      });
    }
    const simPay = document.getElementById('dashSimPayBtn');
    if (simPay && !simPay.dataset.wired) {
      simPay.dataset.wired = '1';
      simPay.addEventListener('click', () => {
        data.notifications.unshift({ id: 'n' + Date.now(), type: 'payment', title: t('admin.dash.newPaySim'), detail: 'Deposit — $65', time: t('admin.dash.justNow'), unread: true });
        saveData(data);
        draw();
        updateBellDot();
      });
    }
  };

  // ================================================================
  // 15. ADS / ANIMATIONS
  // ================================================================
  renderers.ads = function renderAds() {
    const list = document.getElementById('dashAdsList');
    if (!list) return;
    list.innerHTML = data.ads.map((ad, i) => `
      <div class="dash-ad-row">
        <span class="dash-ad-preview"><span>${esc(ad.text.slice(0, 40))}</span></span>
        <div class="dash-ad-main">
          <strong>${esc(ad.name)}</strong>
          <span>${esc(ad.page)}</span>
        </div>
        <button type="button" class="dash-switch ${ad.on ? 'on' : ''}" data-idx="${i}"></button>
      </div>
    `).join('');
    list.querySelectorAll('.dash-switch').forEach((sw) => {
      sw.addEventListener('click', () => {
        const idx = Number(sw.dataset.idx);
        data.ads[idx].on = !data.ads[idx].on;
        saveData(data);
        renderAds();
      });
    });
  };

  // ================================================================
  // 16. BACKUPS
  // ================================================================
  renderers.backups = function renderBackups() {
    const list = document.getElementById('dashBackupsList');
    if (list) {
      list.innerHTML = data.backups.map((b) => `
        <div class="dash-booking-row">
          <div class="dash-booking-main"><strong>${esc(b.label)}</strong><div class="dash-booking-meta">${esc(b.date)} · ${esc(b.size)}</div></div>
        </div>
      `).join('');
    }
    const btn = document.getElementById('dashBackupNowBtn');
    if (btn && !btn.dataset.wired) {
      btn.dataset.wired = '1';
      btn.addEventListener('click', () => {
        const json = JSON.stringify(data, null, 2);
        data.backups.unshift({ date: todayISO(), size: formatBytes(new Blob([json]).size), label: t('admin.dash.manualBackup') });
        saveData(data);
        renderBackups();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `magicstick-dashboard-backup-${todayISO()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      });
    }
  };

  // ---------- Chart helper (Chart.js) ----------
  const chartInstances = {};
  function makeLineChart(canvasId, labels, series) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof window.Chart === 'undefined') return;
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    chartInstances[canvasId] = new window.Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: series.map((s) => ({
          label: s.label,
          data: s.data,
          borderColor: s.color,
          backgroundColor: s.color + '22',
          tension: 0.35,
          fill: true,
          pointRadius: 3,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: series.length > 1, labels: { boxWidth: 10 } } },
        scales: { y: { beginAtZero: true, grid: { color: '#E4E0D4' } }, x: { grid: { display: false } } },
      },
    });
  }

  // ---------- Init ----------
  initNav();
  initBell();
  renderSection('overview');
})();
