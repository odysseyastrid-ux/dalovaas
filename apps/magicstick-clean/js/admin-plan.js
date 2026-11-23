// "Mon plan": the marketing plan as small tasks, one at a time, on the dashboard home.
// Built for an owner who studies, works and has ADHD (owner's request, Nov 23, 2026):
// one short task in focus, precise steps, a timer, and no guilt — a task can be pushed to
// tomorrow, 3 days, a week or a date, taken out of the plan, or the whole plan paused until a
// date (the daily prospects email pauses with it). Late tasks are never shown as "late".
// Data: plan_tasks + plan_settings (migration 0038). All DB text is set with textContent.
(function () {
  'use strict';
  const A = () => window.MagicAdmin;
  const t = (k, v) => (window.MagicstickI18N ? window.MagicstickI18N.t(k, v) : k);
  const lang = () => (window.MagicstickI18N ? window.MagicstickI18N.getLang() : 'fr');
  const STEPS_KEY = 'magicstick_plan_steps';

  let tasks = [];
  let settings = null;
  let focusId = null;      // a task the owner chose to do now ("Do it now" / "One more?")
  let timer = null;        // { id, end, handle, up }
  let ready = false;

  const card = () => document.getElementById('planCard');

  // ---- dates (Eastern time, YYYY-MM-DD strings) -------------------------------------------
  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
  const addDays = (d, n) => {
    const [y, m, day] = d.split('-').map(Number);
    const x = new Date(Date.UTC(y, m - 1, day + n));
    return x.toISOString().slice(0, 10);
  };
  const dayOf = (ts) => (ts ? new Date(ts).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }) : '');
  const nice = (d) => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString(lang() === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'long', day: 'numeric', month: 'long' });
  };
  const short = (d) => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString(lang() === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short' });
  };

  // ---- tiny DOM helper ----------------------------------------------------------------------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    kids.flat().forEach((c) => { if (c != null) el.append(c); });
    return el;
  }
  const title = (x) => (lang() === 'fr' ? x.title_fr : x.title_en) || x.title_fr;
  const steps = (x) => ((lang() === 'fr' ? x.steps_fr : x.steps_en) || x.steps_fr || '').split('\n').map((s) => s.trim()).filter(Boolean);

  function readSteps() { try { return JSON.parse(localStorage.getItem(STEPS_KEY) || '{}') || {}; } catch (_) { return {}; } }
  function writeSteps(v) { try { localStorage.setItem(STEPS_KEY, JSON.stringify(v)); } catch (_) { /* private mode */ } }

  // ---- data ---------------------------------------------------------------------------------
  async function load() {
    const sb = A() && A().supabase;
    if (!sb) return;
    const [tk, st] = await Promise.all([
      sb.from('plan_tasks').select('*').order('due_on').order('phase').order('sort'),
      sb.from('plan_settings').select('*').eq('id', 'main').maybeSingle(),
    ]);
    if (tk.error || !tk.data) { if (card()) card().hidden = true; return; } // migration not applied yet
    tasks = tk.data;
    settings = st.data || { id: 'main', per_day: 1, paused_until: null, digest_was_on: null };
    ready = true;
    if (settings.paused_until && settings.paused_until < today()) await resume(true);
    render();
  }

  function order(a, b) {
    return a.due_on.localeCompare(b.due_on) || a.phase - b.phase || a.sort - b.sort;
  }
  const todo = () => tasks.filter((x) => x.status === 'todo').sort(order);
  const due = () => todo().filter((x) => x.due_on <= today());
  const doneToday = () => tasks.filter((x) => x.done_at && dayOf(x.done_at) === today()).length;

  async function save(task, patch) {
    const { error } = await A().supabase.from('plan_tasks').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', task.id);
    if (error) { alert(t('admin.plan.error')); return false; }
    Object.assign(task, patch);
    return true;
  }

  async function markDone(task) {
    stopTimer();
    const now = new Date().toISOString();
    const patch = task.repeat_days
      ? { done_at: now, due_on: addDays(today(), task.repeat_days), snoozes: 0 }
      : { status: 'done', done_at: now };
    if (!(await save(task, patch))) return;
    const s = readSteps(); delete s[task.id]; writeSteps(s);
    if (focusId === task.id) focusId = null;
    if (window.MagicFX) window.MagicFX.win(15, 'growth');
    render();
  }
  async function snooze(task, when) {
    stopTimer();
    if (!when || when <= today()) when = addDays(today(), 1);
    if (!(await save(task, { due_on: when, snoozes: (task.snoozes || 0) + 1 }))) return;
    if (focusId === task.id) focusId = null;
    render();
  }
  async function skip(task) {
    stopTimer();
    if (!(await save(task, { status: 'skipped' }))) return;
    if (focusId === task.id) focusId = null;
    render();
  }
  async function putBack(task) {
    if (!(await save(task, { status: 'todo', due_on: today(), done_at: null }))) return;
    render();
  }

  async function saveSettings(patch) {
    const row = { id: 'main', ...settings, ...patch, updated_at: new Date().toISOString() };
    const { error } = await A().supabase.from('plan_settings').upsert(row);
    if (error) { alert(t('admin.plan.error')); return false; }
    settings = row;
    return true;
  }

  async function pause(until, alsoDigest) {
    const sb = A().supabase;
    let wasOn = null;
    if (alsoDigest) {
      const { data } = await sb.from('automation_settings').select('enabled').eq('kind', 'prospects').maybeSingle();
      wasOn = data ? data.enabled !== false : true;
      if (wasOn) {
        const { error } = await sb.from('automation_settings').upsert({ kind: 'prospects', enabled: false }, { onConflict: 'kind' });
        if (error) wasOn = null;
      }
    }
    stopTimer();
    focusId = null;
    return saveSettings({ paused_until: until, digest_was_on: wasOn });
  }
  async function resume(quiet) {
    if (settings.digest_was_on === true) {
      await A().supabase.from('automation_settings').upsert({ kind: 'prospects', enabled: true }, { onConflict: 'kind' });
    }
    const ok = await saveSettings({ paused_until: null, digest_was_on: null });
    if (ok && !quiet) render();
  }

  // ---- timer --------------------------------------------------------------------------------
  function stopTimer() {
    if (timer) clearInterval(timer.handle);
    timer = null;
  }
  function startTimer(task) {
    stopTimer();
    timer = { id: task.id, end: Date.now() + task.minutes * 60000, up: false };
    timer.handle = setInterval(tick, 1000);
    render();
  }
  function tick() {
    if (!timer) return;
    const left = timer.end - Date.now();
    const out = document.getElementById('planTimerOut');
    if (left <= 0) {
      clearInterval(timer.handle);
      timer.up = true;
      if (window.MagicFX) window.MagicFX.sound('small');
      try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]); } catch (_) { /* not supported */ }
      render();
      return;
    }
    if (out) out.textContent = fmt(left);
  }
  const fmt = (ms) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  // ---- render -------------------------------------------------------------------------------
  function render() {
    const el = card();
    if (!el || !ready) return;
    el.hidden = false;
    el.replaceChildren(head(), body(), foot(), fullPlan());
  }

  function head() {
    return h('div', { class: 'plan-head' },
      h('h3', { text: `🎯 ${t('admin.plan.title')}` }),
      settings.paused_until ? null : h('button', { type: 'button', class: 'plan-link', text: `⏸ ${t('admin.plan.pause')}`, onclick: openPause }));
  }

  function body() {
    if (settings.paused_until) {
      return h('div', { class: 'plan-calm' },
        h('p', { class: 'plan-big', text: `⏸ ${t('admin.plan.paused', { date: nice(settings.paused_until) })}` }),
        h('p', { class: 'plan-sub', text: t('admin.plan.pausedSub') }),
        h('button', { type: 'button', class: 'btn-mini btn-mini-go', text: `▶ ${t('admin.plan.resume')}`, onclick: () => resume(false) }));
    }
    const list = todo();
    if (!list.length) {
      return h('div', { class: 'plan-calm' }, h('p', { class: 'plan-big', text: `🏁 ${t('admin.plan.finished')}` }));
    }
    const dueNow = due();
    const remaining = Math.max(0, (settings.per_day || 1) - doneToday());
    let task = focusId ? list.find((x) => x.id === focusId) : null;
    let label = null;
    if (task) label = t('admin.plan.extra');
    else if (remaining > 0 && dueNow.length) {
      task = dueNow[0];
      const total = Math.min(settings.per_day || 1, doneToday() + dueNow.length);
      label = t('admin.plan.today', { n: doneToday() + 1, total });
    }
    if (!task) {
      const next = dueNow[0] || list[0];
      const doneSome = doneToday() > 0;
      return h('div', { class: 'plan-calm' },
        h('p', { class: 'plan-big', text: doneSome ? `✨ ${t('admin.plan.allDone')}` : `🌿 ${t('admin.plan.nothing')}` }),
        doneSome ? h('p', { class: 'plan-sub', text: t('admin.plan.allDoneSub') }) : null,
        h('p', { class: 'plan-sub', text: t('admin.plan.next', { title: title(next), date: short(next.due_on) }) }),
        h('button', { type: 'button', class: 'btn-mini', text: doneSome ? t('admin.plan.oneMore') : t('admin.plan.doNow'),
          onclick: () => { focusId = next.id; render(); } }));
    }
    return taskView(task, label);
  }

  function taskView(task, label) {
    const ticks = readSteps()[task.id] || [];
    const st = steps(task);
    const allTicked = st.length > 0 && st.every((_, i) => ticks.includes(i));
    const running = timer && timer.id === task.id;
    const stepList = h('ol', { class: 'plan-steps', 'aria-label': t('admin.plan.steps') },
      st.map((s, i) => h('li', {},
        h('label', {},
          h('input', { type: 'checkbox', checked: ticks.includes(i), onchange: (e) => {
            const all = readSteps(); const cur = new Set(all[task.id] || []);
            if (e.target.checked) cur.add(i); else cur.delete(i);
            all[task.id] = [...cur]; writeSteps(all); render();
          } }),
          h('span', { text: s })))));
    const later = h('details', { class: 'plan-later' },
      h('summary', { class: 'btn-mini plan-ghost', text: `📅 ${t('admin.plan.later')}` }),
      h('div', { class: 'plan-later-menu' },
        h('button', { type: 'button', class: 'btn-mini plan-ghost', text: t('admin.plan.in3'), onclick: () => snooze(task, addDays(today(), 3)) }),
        h('button', { type: 'button', class: 'btn-mini plan-ghost', text: t('admin.plan.in7'), onclick: () => snooze(task, addDays(today(), 7)) }),
        h('label', { class: 'plan-pick' },
          h('span', { text: t('admin.plan.pickDate') }),
          h('input', { type: 'date', min: addDays(today(), 1), onchange: (e) => e.target.value && snooze(task, e.target.value) })),
        h('button', { type: 'button', class: 'btn-mini plan-ghost', text: t('admin.plan.skip'), onclick: () => skip(task) })));
    return h('div', { class: 'plan-task' },
      label ? h('p', { class: 'plan-label', text: label }) : null,
      h('p', { class: 'plan-big', text: title(task) }),
      h('p', { class: 'plan-meta' },
        h('span', { class: 'plan-chip', text: `⏱ ${t('admin.plan.min', { m: task.minutes })}` }),
        task.repeat_days ? h('span', { class: 'plan-chip', text: `↻ ${t('admin.plan.repeats', { n: task.repeat_days })}` }) : null),
      stepList,
      (task.snoozes || 0) >= 3 ? h('p', { class: 'plan-sub', text: t('admin.plan.snoozedNote') }) : null,
      running && timer.up ? h('p', { class: 'plan-up', text: `⏰ ${t('admin.plan.timeUp')}` }) : null,
      h('div', { class: 'plan-actions' },
        h('button', { type: 'button', class: `btn-mini btn-mini-go plan-done${allTicked || (running && timer.up) ? ' is-ready' : ''}`, text: `✓ ${t('admin.plan.done')}`, onclick: () => markDone(task) }),
        running && !timer.up
          ? h('button', { type: 'button', class: 'btn-mini plan-ghost', onclick: () => { stopTimer(); render(); } },
            '⏱ ', h('span', { id: 'planTimerOut', text: fmt(timer.end - Date.now()) }), ` · ${t('admin.plan.stop')}`)
          : h('button', { type: 'button', class: 'btn-mini plan-ghost', text: `▶ ${t('admin.plan.start', { m: task.minutes })}`, onclick: () => startTimer(task) }),
        h('button', { type: 'button', class: 'btn-mini plan-ghost', text: `↷ ${t('admin.plan.tomorrow')}`, onclick: () => snooze(task, addDays(today(), 1)) }),
        later));
  }

  function foot() {
    if (settings.paused_until) return null;
    return h('div', { class: 'plan-foot' },
      h('span', { class: 'plan-sub', text: t('admin.plan.perDay') }),
      h('div', { class: 'plan-seg', role: 'group', 'aria-label': t('admin.plan.perDay') },
        [1, 2, 3].map((n) => h('button', { type: 'button', class: (settings.per_day || 1) === n ? 'is-on' : '', 'aria-pressed': String((settings.per_day || 1) === n), text: String(n),
          onclick: async () => { if (await saveSettings({ per_day: n })) render(); } }))));
  }

  function phaseName(p) {
    if (p <= 4) return t('admin.plan.week', { n: p });
    if (p <= 8) return t('admin.plan.month2');
    return t('admin.plan.month3');
  }
  function fullPlan() {
    const doneN = tasks.filter((x) => x.status !== 'todo').length;
    const groups = new Map();
    [...tasks].sort((a, b) => a.phase - b.phase || a.sort - b.sort).forEach((x) => {
      const g = phaseName(x.phase);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(x);
    });
    const pct = tasks.length ? Math.round((doneN / tasks.length) * 100) : 0;
    const det = h('details', { class: 'plan-all' },
      h('summary', {}, h('span', { text: t('admin.plan.all', { done: doneN, total: tasks.length }) }),
        h('span', { class: 'plan-bar', 'aria-hidden': 'true' }, h('i', { style: `width:${pct}%` }))),
      [...groups].map(([g, list]) => h('div', { class: 'plan-group' },
        h('p', { class: 'plan-group-name', text: g }),
        h('ul', {}, list.map((x) => {
          const icon = x.status === 'done' ? '✓' : x.status === 'skipped' ? '–' : x.repeat_days ? '↻' : '○';
          return h('li', { class: `plan-row is-${x.status}` },
            h('span', { class: 'plan-ico', 'aria-hidden': 'true', text: icon }),
            h('span', { class: 'plan-row-title', text: title(x) }),
            h('span', { class: 'plan-row-date', text: x.status === 'todo' ? short(x.due_on) : '' }),
            x.status === 'todo'
              ? (settings.paused_until ? null : h('button', { type: 'button', class: 'btn-mini plan-ghost', text: t('admin.plan.doNow'), onclick: () => { focusId = x.id; render(); card().scrollIntoView({ behavior: 'smooth', block: 'start' }); } }))
              : h('button', { type: 'button', class: 'btn-mini plan-ghost', text: t('admin.plan.putBack'), onclick: () => putBack(x) }));
        })))));
    return det;
  }

  // ---- pause dialog -------------------------------------------------------------------------
  function openPause() {
    const m = document.getElementById('planPauseModal');
    if (!m) return;
    const d = document.getElementById('planPauseDate');
    d.min = addDays(today(), 1);
    d.value = addDays(today(), 7);
    document.getElementById('planPauseNote').textContent = '';
    m.hidden = false;
  }
  function closePause() { const m = document.getElementById('planPauseModal'); if (m) m.hidden = true; }
  function initPause() {
    const m = document.getElementById('planPauseModal');
    if (!m) return;
    m.querySelectorAll('[data-plan-close]').forEach((b) => b.addEventListener('click', closePause));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !m.hidden) closePause(); });
    const dateIn = document.getElementById('planPauseDate');
    dateIn.addEventListener('input', () => { m.querySelector('input[value="date"]').checked = true; });
    document.getElementById('planPauseForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const choice = (m.querySelector('input[name="planPause"]:checked') || {}).value || '7';
      const until = choice === 'date' ? dateIn.value : addDays(today(), Number(choice));
      if (!until || until <= today()) { document.getElementById('planPauseNote').textContent = t('admin.plan.pickDate'); return; }
      if (await pause(until, document.getElementById('planPauseDigest').checked)) { closePause(); render(); }
    });
  }

  document.addEventListener('magicstick:dashready', () => { load(); });
  document.addEventListener('magicstick:langchange', () => { render(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPause); else initPause();
})();
