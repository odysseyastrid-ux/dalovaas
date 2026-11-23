// "Bulle", the owner's AI employee in the dashboard (Nov 23, 2026).
// An original animated soap-bubble creature (no existing character is copied).
// Separate from Louis (the public chat). Talks to the `owner-agent` function,
// which knows the site + the whole back office and can search the web.
// Bulle only PROPOSES actions: each one runs here when the owner clicks
// "Confirm", through the dashboard's own functions (window.MagicAdmin).
(function () {
  const backend = window.MagicstickBackend;
  const t = (k, v) => (window.MagicstickI18N ? window.MagicstickI18N.t(k, v) : k);
  const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'fr');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sound = (n, a) => { if (window.MagicFX && window.MagicFX.sound) window.MagicFX.sound(n, a); };
  let uid = 0;

  // ---------- The creature (inline SVG, animated in css/admin-agent.css) ----------
  function avatarSvg() {
    const id = `bulle${++uid}`;
    return `<svg viewBox="0 0 120 120" class="bulle-svg" aria-hidden="true">
  <defs>
    <radialGradient id="${id}b" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="#E4F1FF"/><stop offset=".8" stop-color="#C9B8FF"/><stop offset="1" stop-color="#9F86F5"/></radialGradient>
    <linearGradient id="${id}i" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF9DCB" stop-opacity=".55"/><stop offset=".35" stop-color="#FFE38A" stop-opacity=".35"/><stop offset=".65" stop-color="#7FF0C2" stop-opacity=".4"/><stop offset="1" stop-color="#7DB8FF" stop-opacity=".55"/></linearGradient>
  </defs>
  <g class="bulle-tail"><ellipse cx="96" cy="88" rx="13" ry="5" fill="#FF9DCB" transform="rotate(-25 96 88)"/><ellipse cx="99" cy="80" rx="12" ry="4.5" fill="#FFE38A" transform="rotate(-50 99 80)"/><ellipse cx="94" cy="95" rx="11" ry="4.5" fill="#7FF0C2" transform="rotate(5 94 95)"/><rect x="82" y="84" width="10" height="5" rx="2.5" fill="#8B6BE8" transform="rotate(-25 87 86)"/></g>
  <g class="bulle-antenna"><path d="M60 24 C58 16 64 12 66 8" stroke="#B49CF7" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="66.5" cy="7.5" r="5" fill="url(#${id}b)" stroke="#fff" stroke-width="1"/></g>
  <g class="bulle-body">
    <circle cx="60" cy="64" r="40" fill="url(#${id}b)"/>
    <circle cx="60" cy="64" r="40" fill="url(#${id}i)" class="bulle-sheen"/>
    <circle cx="60" cy="64" r="39.2" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.6"/>
    <ellipse cx="44" cy="44" rx="12" ry="7" fill="#fff" opacity=".85" transform="rotate(-30 44 44)"/>
    <circle cx="35" cy="56" r="3" fill="#fff" opacity=".9"/>
    <g class="bulle-eyes">
      <g class="bulle-eye"><ellipse cx="48" cy="64" rx="7" ry="9" fill="#2A1F55"/><circle class="bulle-pupil" cx="50" cy="61" r="3" fill="#fff"/><circle cx="46" cy="68" r="1.4" fill="#fff" opacity=".7"/></g>
      <g class="bulle-eye"><ellipse cx="72" cy="64" rx="7" ry="9" fill="#2A1F55"/><circle class="bulle-pupil" cx="74" cy="61" r="3" fill="#fff"/><circle cx="70" cy="68" r="1.4" fill="#fff" opacity=".7"/></g>
    </g>
    <ellipse cx="39" cy="77" rx="6" ry="3.5" fill="#FF8FBF" opacity=".55"/><ellipse cx="81" cy="77" rx="6" ry="3.5" fill="#FF8FBF" opacity=".55"/>
    <path class="bulle-mouth" d="M53 79 Q60 86 67 79" stroke="#2A1F55" stroke-width="2.6" fill="#FF7AA8" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g class="bulle-fizz"><circle cx="18" cy="92" r="4" /><circle cx="24" cy="76" r="2.5"/><circle cx="104" cy="44" r="3"/></g>
</svg>`;
  }
  const fillAvatars = () => document.querySelectorAll('[data-bulle-avatar]:empty').forEach((el) => { el.innerHTML = avatarSvg(); });
  const setMood = (mood) => document.querySelectorAll('.bulle-avatar').forEach((el) => {
    el.classList.remove('is-thinking', 'is-talking', 'is-happy');
    if (mood) el.classList.add(`is-${mood}`);
  });

  // ---------- Drawer ----------
  let drawer, log, input, statusEl, history = [], loaded = false, busy = false;
  function build() {
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'bulle-fab';
    fab.setAttribute('data-bulle-open', '');
    fab.setAttribute('aria-label', t('admin.agent.open'));
    fab.innerHTML = '<span class="bulle-avatar" data-bulle-avatar></span>';
    document.body.appendChild(fab);

    drawer = document.createElement('aside');
    drawer.className = 'bulle-drawer';
    drawer.setAttribute('aria-label', 'Bulle');
    drawer.hidden = true;
    drawer.innerHTML = `
      <header class="bulle-head">
        <span class="bulle-avatar bulle-sm" data-bulle-avatar></span>
        <div class="bulle-id"><b>Bulle</b><small class="bulle-status"></small></div>
        <button type="button" class="bulle-icon" data-bulle-clear title=""><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button type="button" class="bulle-icon" data-bulle-close aria-label="×"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
      </header>
      <div class="bulle-log" role="log" aria-live="polite"></div>
      <div class="bulle-chips"></div>
      <form class="bulle-form">
        <textarea rows="1" class="bulle-input"></textarea>
        <button type="submit" class="bulle-send" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M4 12l16-8-6 16-2.5-6.5z" fill="currentColor"/></svg></button>
      </form>`;
    document.body.appendChild(drawer);
    log = drawer.querySelector('.bulle-log');
    input = drawer.querySelector('.bulle-input');
    statusEl = drawer.querySelector('.bulle-status');
    drawer.querySelector('[data-bulle-close]').addEventListener('click', close);
    drawer.querySelector('[data-bulle-clear]').addEventListener('click', clearChat);
    drawer.querySelector('.bulle-form').addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); } });
    input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(140, input.scrollHeight)}px`; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) close(); });
    document.addEventListener('click', (e) => { if (e.target instanceof Element && e.target.closest('[data-bulle-open]')) open(); });
    texts();
    document.addEventListener('magicstick:langchange', texts);
    fillAvatars();
  }
  function texts() {
    input.placeholder = t('admin.agent.ph');
    drawer.querySelector('[data-bulle-clear]').title = t('admin.agent.clear');
    statusEl.textContent = busy ? t('admin.agent.thinking') : t('admin.agent.ready');
    const chips = drawer.querySelector('.bulle-chips');
    chips.innerHTML = '';
    ['admin.agent.chip.today', 'admin.agent.chip.replies', 'admin.agent.chip.prospects', 'admin.agent.chip.script', 'admin.agent.chip.review'].forEach((k) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'bulle-chip'; b.textContent = t(k);
      b.addEventListener('click', () => ask(t(k)));
      chips.appendChild(b);
    });
  }
  async function open() {
    if (!drawer) return;
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add('is-open'));
    document.body.classList.add('bulle-on');
    sound('open');
    if (!loaded) await loadHistory();
    setTimeout(() => input.focus(), 250);
  }
  function close() {
    drawer.classList.remove('is-open');
    document.body.classList.remove('bulle-on');
    setTimeout(() => { if (!drawer.classList.contains('is-open')) drawer.hidden = true; }, 350);
  }

  // ---------- Messages ----------
  function md(text) {
    let h = esc(text);
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/^#{1,4}\s*(.+)$/gm, '<b>$1</b>').replace(/^\s*[-*]\s+/gm, '• ');
    return h.replace(/\n/g, '<br>');
  }
  function bubble(role, text, actions) {
    const el = document.createElement('div');
    el.className = `bulle-msg bulle-msg-${role}`;
    el.innerHTML = role === 'assistant' ? md(text) : esc(text).replace(/\n/g, '<br>');
    if (actions && actions.length) el.appendChild(actionCards(actions));
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }
  async function loadHistory() {
    loaded = true;
    const { data } = await window.MagicAdmin.supabase.from('agent_messages').select('role, content').order('id', { ascending: false }).limit(30);
    history = (data || []).reverse();
    log.innerHTML = '';
    if (!history.length) bubble('assistant', t('admin.agent.hello'));
    history.forEach((m) => bubble(m.role, m.content));
  }
  async function save(role, content) {
    try { await window.MagicAdmin.supabase.from('agent_messages').insert({ role, content: content.slice(0, 8000) }); } catch (_) { /* history is a convenience */ }
  }
  async function clearChat() {
    if (!window.confirm(t('admin.agent.clearAsk'))) return;
    await window.MagicAdmin.supabase.from('agent_messages').delete().gt('id', 0);
    history = []; log.innerHTML = '';
    bubble('assistant', t('admin.agent.hello'));
  }
  async function ask(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    input.value = ''; input.style.height = 'auto';
    bubble('user', text);
    history.push({ role: 'user', content: text });
    save('user', text);
    busy = true; statusEl.textContent = t('admin.agent.thinking'); setMood('thinking');
    const wait = bubble('assistant', '');
    wait.classList.add('is-typing');
    wait.innerHTML = '<span></span><span></span><span></span>';
    try {
      const { data: { session } } = await window.MagicAdmin.supabase.auth.getSession();
      const res = await fetch(`${backend.config.FUNCTIONS_URL}/owner-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session ? session.access_token : ''}` },
        body: JSON.stringify({ messages: history.slice(-24), lang: lang(), section: window.MagicAdmin.section() }),
      });
      const data = await res.json().catch(() => ({}));
      wait.remove();
      if (!res.ok || !data.reply) throw new Error(data.error || 'ai');
      history.push({ role: 'assistant', content: data.reply });
      save('assistant', data.reply);
      setMood('talking');
      bubble('assistant', data.reply, data.actions);
      sound('small');
      setTimeout(() => setMood(null), 1800);
    } catch (_) {
      wait.remove();
      bubble('assistant', t('admin.agent.error'));
      setMood(null);
    } finally {
      busy = false; statusEl.textContent = t('admin.agent.ready');
    }
  }

  // ---------- Actions (proposed by Bulle, run only on "Confirm") ----------
  const findQ = (id) => window.MagicAdmin.quotes().find((q) => q.id === id);
  const findP = (id) => window.MagicAdmin.prospects().find((p) => p.id === id);
  const inDays = (n) => { const d = new Date(Date.now() + n * 864e5); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const contactOf = (q) => {
    if (!q) return {};
    const all = [q.phone, q.email, q.contact].filter(Boolean).join(' ');
    const email = (all.match(/[^\s@]+@[^\s@]+\.[^\s@]+/) || [])[0];
    const digits = (String(q.phone || q.contact || '').match(/\+?\d[\d\s().-]{8,}/) || [''])[0].replace(/[^\d+]/g, '');
    return { email, phone: digits.length >= 10 ? digits : '' };
  };
  async function run(a) {
    const M = window.MagicAdmin;
    switch (a.type) {
      case 'open_section': M.openSection(a.section); close(); return true;
      case 'send_price': {
        const q = findQ(a.quote_id); if (!q) return false;
        M.openSection('orders'); M.openPriceDialog(q);
        const amt = document.getElementById('priceAmount'), note = document.getElementById('priceNote');
        if (amt) { amt.value = Number(a.amount).toFixed(2); amt.dispatchEvent(new Event('input', { bubbles: true })); }
        if (note && a.note) { note.value = a.note; note.dispatchEvent(new Event('input', { bubbles: true })); }
        close(); return true;
      }
      case 'schedule': { const q = findQ(a.quote_id); return q ? M.updateQuote(q, { scheduled_date: a.date, scheduled_window: a.window || q.scheduled_window || null }) : false; }
      case 'mark_paid': { const q = findQ(a.quote_id); return q ? M.updateQuote(q, { paid_at: new Date().toISOString(), payment_method: q.payment_method || 'interac' }) : false; }
      case 'mark_done': {
        const q = findQ(a.quote_id); if (!q) return false;
        if (q.partner_id) { M.openSection('orders'); close(); return true; } // partner jobs need the real hours: the owner enters them
        return M.updateQuote(q, { completed_at: new Date().toISOString() });
      }
      case 'prospect': {
        const p = findP(a.prospect_id); if (!p) return false;
        const patch = { status: a.status, next_action_on: a.days ? inDays(a.days) : null };
        if (['contacted', 'interested', 'client'].includes(a.status)) Object.assign(patch, { last_contact_at: new Date().toISOString(), contact_count: (p.contact_count || 0) + 1 });
        await M.updateProspect(p, patch); return true;
      }
      case 'growth_tick': await M.toggleGrowth(a.key, true); return true;
      case 'automation': {
        const row = { kind: a.kind, updated_at: new Date().toISOString() };
        ['enabled', 'intro_fr', 'intro_en'].forEach((k) => { if (k in a) row[k] = a[k]; });
        const { error } = await M.supabase.from('automation_settings').upsert(row);
        return !error;
      }
      case 'message': {
        const c = contactOf(a.quote_id ? findQ(a.quote_id) : null);
        if (a.channel === 'sms' && c.phone) { location.href = `sms:${c.phone}?&body=${encodeURIComponent(a.text)}`; return true; }
        if (a.channel === 'email' && c.email) { location.href = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(a.subject || 'Magicstick Clean')}&body=${encodeURIComponent(a.text)}`; return true; }
        try { await navigator.clipboard.writeText(a.text); return 'copied'; } catch (_) { return false; }
      }
      default: return false;
    }
  }
  function actionCards(actions) {
    const box = document.createElement('div');
    box.className = 'bulle-actions';
    actions.forEach((a) => {
      const card = document.createElement('div');
      card.className = `bulle-action${a.sensitive ? ' is-sensitive' : ''}`;
      card.innerHTML = `<div class="bulle-action-text">${a.sensitive ? `<em>${esc(t('admin.agent.sensitive'))}</em>` : ''}<span></span></div>
        <div class="bulle-action-btns"><button type="button" class="bulle-ok"></button><button type="button" class="bulle-skip"></button></div>`;
      card.querySelector('span').textContent = a.label;
      if (a.type === 'message' && a.text) {
        const pre = document.createElement('p'); pre.className = 'bulle-action-preview'; pre.textContent = a.text;
        card.querySelector('.bulle-action-text').appendChild(pre);
      }
      const ok = card.querySelector('.bulle-ok'), skip = card.querySelector('.bulle-skip');
      ok.textContent = t('admin.agent.confirm'); skip.textContent = t('admin.agent.skip');
      ok.addEventListener('click', async () => {
        ok.disabled = true; skip.disabled = true;
        const r = await run(a).catch(() => false);
        card.classList.add(r ? 'is-done' : 'is-failed');
        card.querySelector('.bulle-action-btns').textContent = r === 'copied' ? t('admin.agent.copied') : r ? t('admin.agent.done') : t('admin.agent.failed');
        if (r) { setMood('happy'); sound('confirm'); setTimeout(() => setMood(null), 1200); }
      });
      skip.addEventListener('click', () => { card.classList.add('is-skipped'); card.querySelector('.bulle-action-btns').textContent = t('admin.agent.skipped'); });
      box.appendChild(card);
    });
    return box;
  }

  // Bulle appears once the dashboard is shown (after the two-step sign-in).
  function boot() {
    const dash = document.getElementById('adminDashboard');
    if (!dash || !backend) return;
    const ready = () => { if (!dash.hidden && !drawer && window.MagicAdmin) build(); fillAvatars(); };
    ready();
    new MutationObserver(ready).observe(dash, { attributes: true, attributeFilter: ['hidden'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
