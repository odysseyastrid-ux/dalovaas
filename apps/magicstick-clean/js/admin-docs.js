// "Reports and plans" (Growth tab): the owner's research reports and plans, stored in the
// admin-only table owner_docs (migration 0039) in French and English. Markdown is rendered by a
// small, safe renderer: every piece of text is escaped first, links only allow http(s).
(function () {
  'use strict';
  const A = () => window.MagicAdmin;
  const t = (k, v) => (window.MagicstickI18N ? window.MagicstickI18N.t(k, v) : k);
  const lang = () => (window.MagicstickI18N ? window.MagicstickI18N.getLang() : 'fr');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let docs = [];
  const shown = new Map(); // doc id -> 'fr' | 'en' chosen by the owner

  // ---- markdown → safe HTML -----------------------------------------------------------------
  function inline(s) {
    let h = esc(s);
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, txt, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${txt}</a>`);
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    return h;
  }
  function render(md) {
    const lines = String(md || '').replace(/\r/g, '').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      let m;
      if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
        const lvl = Math.min(4, m[1].length + 1);
        out.push(`<h${lvl}>${inline(m[2])}</h${lvl}>`); i++; continue;
      }
      if (/^\s*\|/.test(line)) {
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(lines[i]); i++; }
        const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const body = rows.filter((r) => !(/^[\s|:-]+$/.test(r) && r.includes('-'))); // drop the |---| row
        const [head, ...rest] = body;
        out.push('<div class="doc-table"><table><thead><tr>' + cells(head).map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
          rest.map((r) => '<tr>' + cells(r).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
        continue;
      }
      if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
        const ordered = /^\s*\d+\./.test(line);
        const items = [];
        while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, '').replace(/^\[ \]\s*/, '☐ ').replace(/^\[x\]\s*/i, '☑ '));
          i++;
        }
        const tag = ordered ? 'ol' : 'ul';
        out.push(`<${tag}>` + items.map((x) => `<li>${inline(x)}</li>`).join('') + `</${tag}>`);
        continue;
      }
      if (/^>\s?/.test(line)) {
        const q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
        out.push(`<blockquote>${inline(q.join(' '))}</blockquote>`);
        continue;
      }
      if (/^-{3,}$/.test(line.trim())) { out.push('<hr>'); i++; continue; }
      const para = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\s*\||\s*([-*]|\d+\.)\s+|>)/.test(lines[i])) { para.push(lines[i]); i++; }
      out.push(`<p>${inline(para.join(' '))}</p>`);
    }
    return out.join('');
  }

  // ---- UI -----------------------------------------------------------------------------------
  async function load() {
    const sb = A() && A().supabase;
    const card = document.getElementById('docsCard');
    if (!sb || !card) return;
    const { data, error } = await sb.from('owner_docs').select('id, title_fr, title_en, body_fr, body_en, updated_at').order('sort').order('updated_at', { ascending: false });
    if (error) { card.hidden = true; return; } // migration not applied yet
    card.hidden = false;
    docs = data || [];
    draw();
  }

  function draw() {
    const list = document.getElementById('docsList');
    const empty = document.getElementById('docsEmpty');
    if (!list) return;
    list.replaceChildren();
    if (empty) empty.hidden = docs.length > 0;
    docs.forEach((d) => {
      const pick = shown.get(d.id) || (lang() === 'fr' ? 'fr' : 'en');
      const has = { fr: !!d.body_fr, en: !!d.body_en };
      const l = has[pick] ? pick : (has.fr ? 'fr' : 'en');
      const det = document.createElement('details');
      det.className = 'doc-item';
      det.dataset.id = d.id;
      const sum = document.createElement('summary');
      const title = document.createElement('span');
      title.className = 'doc-title';
      title.textContent = (l === 'fr' ? d.title_fr : d.title_en) || d.title_fr || d.title_en;
      const date = document.createElement('span');
      date.className = 'doc-date';
      date.textContent = new Date(d.updated_at).toLocaleDateString(lang() === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short', year: 'numeric' });
      sum.append(title, date);
      const bar = document.createElement('div');
      bar.className = 'doc-bar';
      ['fr', 'en'].forEach((code) => {
        if (!has[code]) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `btn-mini${code === l ? ' btn-mini-go' : ' doc-ghost'}`;
        b.textContent = code === 'fr' ? 'Français' : 'English';
        b.setAttribute('aria-pressed', String(code === l));
        b.addEventListener('click', () => { shown.set(d.id, code); draw(); const again = list.querySelector(`[data-id="${CSS.escape(d.id)}"]`); if (again) again.open = true; });
        bar.append(b);
      });
      const body = document.createElement('div');
      body.className = 'doc-body';
      body.innerHTML = render(l === 'fr' ? d.body_fr : d.body_en); // every text node escaped in render()
      det.append(sum, bar, body);
      list.append(det);
    });
  }

  document.addEventListener('magicstick:dashready', load);
  document.addEventListener('magicstick:langchange', draw);
})();
