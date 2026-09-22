// Shared sitewide utilities: skip link, scroll progress bar, floating
// contact button, dark mode toggle, cookie banner, copy-to-clipboard,
// confirmation modal, password visibility toggle, back-to-top, UTM capture,
// and the footer newsletter form. One script tag on every page picks all of
// this up — nothing else needs page-specific markup.
(function () {
  const t = (key, vars) => (window.MagicstickI18N ? window.MagicstickI18N.t(key, vars) : key);
  const esc = (v) => (window.MagicstickI18N ? window.MagicstickI18N.escapeHtml(v) : String(v ?? ''));

  // ---------- Skip to content ----------
  function initSkipLink() {
    const header = document.querySelector('header');
    const anchorHtml = '<span id="mainContent" tabindex="-1"></span>';
    if (header) {
      header.insertAdjacentHTML('afterend', anchorHtml);
    } else {
      document.body.insertAdjacentHTML('afterbegin', anchorHtml);
    }
    const link = document.createElement('a');
    link.className = 'skip-link';
    link.href = '#mainContent';
    link.textContent = t('a11y.skipToContent');
    document.body.insertBefore(link, document.body.firstChild);
  }

  // ---------- Scroll progress bar ----------
  function initScrollProgress() {
    if (document.getElementById('scrollProgress')) return;
    const bar = document.createElement('div');
    bar.id = 'scrollProgress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    function update() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    }
    document.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // ---------- Floating contact button ----------
  function initFloatingContact() {
    if (document.querySelector('.floating-contact')) return;
    const wrap = document.createElement('div');
    wrap.className = 'floating-contact';
    wrap.innerHTML = `
      <div class="floating-contact-menu">
        <button type="button" class="floating-contact-link" id="aiChatOpen">
          <span class="contact-badge"><svg class="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></span>
          ${esc(t('aiChat.toggle'))}
        </button>
        <a class="floating-contact-link" href="tel:3438437761">
          <span class="contact-badge"><svg class="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>
          ${esc(t('floatingContact.call'))}
        </a>
        <a class="floating-contact-link" href="mailto:magicstickclean@gmail.com">
          <span class="contact-badge"><svg class="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg></span>
          ${esc(t('floatingContact.email'))}
        </a>
      </div>
      <button type="button" class="floating-contact-toggle" aria-label="${esc(t('floatingContact.toggle'))}" aria-expanded="false">
        <svg class="icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    document.body.appendChild(wrap);
    const toggle = wrap.querySelector('.floating-contact-toggle');
    toggle.addEventListener('click', () => {
      const open = wrap.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });
  }

  // ---------- Sitewide back-to-top (skipped where a page already has one, e.g. terms.html) ----------
  function initBackToTop() {
    if (document.getElementById('backToTop')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'backToTop';
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', t('a11y.backToTop'));
    btn.innerHTML = '&uarr;';
    btn.hidden = true;
    document.body.appendChild(btn);
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.addEventListener('scroll', () => {
      btn.hidden = window.scrollY < 500;
      if (!btn.hidden) btn.classList.add('show'); else btn.classList.remove('show');
    }, { passive: true });
  }

  // ---------- Dark mode toggle ----------
  const THEME_KEY = 'magicstick_theme';
  function applyTheme(theme) {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }
  function themeToggleHtml() {
    return `
      <button type="button" class="theme-toggle" aria-label="${esc(t('a11y.toggleDarkMode'))}">
        <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66 4.93 19.07M19.07 4.93l-1.41 1.41"/></svg>
        <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
    `;
  }
  function initThemeToggle() {
    // A leading toggle already applied any stored theme synchronously (see
    // the inline snippet at the top of <body>) — this just wires up the
    // visible switch(es) and keeps them in sync with each other.
    const targets = document.querySelectorAll('.lang-toggle:not(.splash-lang)');
    const toggles = [];
    targets.forEach((el) => {
      el.insertAdjacentHTML('afterend', themeToggleHtml());
      toggles.push(el.nextElementSibling);
    });
    toggles.forEach((btn) => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        const next = currentTheme() === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        try { localStorage.setItem(THEME_KEY, next); } catch (err) { /* ignore */ }
      });
    });
  }

  // ---------- Cookie banner ----------
  const COOKIE_KEY = 'magicstick_cookie_ack';
  function initCookieBanner() {
    let acked = false;
    try { acked = localStorage.getItem(COOKIE_KEY) === '1'; } catch (err) { /* ignore */ }
    if (acked) return;
    const banner = document.createElement('div');
    banner.id = 'cookieBanner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', t('cookies.bannerLabel'));
    banner.innerHTML = `
      <p>${esc(t('cookies.text'))} <a href="privacy.html">${esc(t('cookies.learnMore'))}</a></p>
      <button type="button" class="btn" id="cookieAcceptBtn">${esc(t('cookies.accept'))}</button>
    `;
    document.body.appendChild(banner);
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('show')));
    banner.querySelector('#cookieAcceptBtn').addEventListener('click', () => {
      try { localStorage.setItem(COOKIE_KEY, '1'); } catch (err) { /* ignore */ }
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 400);
    });
  }

  // ---------- Copy to clipboard ----------
  function copyIconHtml() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  }
  function checkIconHtml() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
  }
  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (err) {
      return false;
    }
  }
  function attachCopyButton(afterEl, value, label) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.innerHTML = copyIconHtml();
    btn.setAttribute('aria-label', label);
    afterEl.insertAdjacentElement('afterend', btn);
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ok = await copyText(value);
      if (ok) {
        btn.classList.add('copied');
        btn.innerHTML = checkIconHtml();
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = copyIconHtml(); }, 1600);
      }
    });
  }
  function initCopyButtons() {
    if (!navigator.clipboard) return;
    document.querySelectorAll('.foot-contact-link').forEach((link) => {
      const href = link.getAttribute('href') || '';
      const value = href.startsWith('tel:')
        ? '343-843-7761'
        : href.startsWith('mailto:')
          ? 'magicstickclean@gmail.com'
          : null;
      if (value) attachCopyButton(link, value, t('a11y.copy'));
    });
    // Quote reference code, if this page has one — the visitor asked for a
    // real thing worth copying (they'll quote it back over phone/email).
    const refEl = document.getElementById('quoteRefCode');
    if (refEl && !refEl.closest('.quote-success-ref-row')) {
      const row = document.createElement('span');
      row.className = 'quote-success-ref-row';
      refEl.parentNode.insertBefore(row, refEl);
      row.appendChild(refEl);
      attachCopyButton(refEl, refEl.textContent.trim(), t('a11y.copy'));
      // Keep the copy value in sync if the code is filled in after this runs.
      new MutationObserver(() => {
        const btn = row.querySelector('.copy-btn');
        if (btn) btn.onclick = async (e) => {
          e.preventDefault();
          const ok = await copyText(refEl.textContent.trim());
          if (ok) {
            btn.classList.add('copied'); btn.innerHTML = checkIconHtml();
            setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = copyIconHtml(); }, 1600);
          }
        };
      }).observe(refEl, { childList: true });
    }
  }

  // ---------- Confirmation modal (generic, reusable) ----------
  function initConfirmModal() {
    if (document.getElementById('confirmBackdrop')) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'confirm-backdrop';
    backdrop.id = 'confirmBackdrop';
    backdrop.innerHTML = `
      <div class="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle">
        <h3 id="confirmTitle"></h3>
        <p id="confirmBody"></p>
        <div class="confirm-modal-actions">
          <button type="button" class="btn-outline" id="confirmCancelBtn"></button>
          <button type="button" class="btn" id="confirmOkBtn"></button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeConfirm(); });
    function closeConfirm() { backdrop.classList.remove('show'); }
    window.MagicstickConfirm = {
      ask(options) {
        return new Promise((resolve) => {
          backdrop.querySelector('#confirmTitle').textContent = options.title || t('confirm.defaultTitle');
          backdrop.querySelector('#confirmBody').textContent = options.body || '';
          const okBtn = backdrop.querySelector('#confirmOkBtn');
          const cancelBtn = backdrop.querySelector('#confirmCancelBtn');
          okBtn.textContent = options.confirmLabel || t('confirm.defaultConfirm');
          cancelBtn.textContent = options.cancelLabel || t('confirm.defaultCancel');
          const onOk = () => { cleanup(); closeConfirm(); resolve(true); };
          const onCancel = () => { cleanup(); closeConfirm(); resolve(false); };
          function cleanup() {
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
          }
          okBtn.addEventListener('click', onOk);
          cancelBtn.addEventListener('click', onCancel);
          backdrop.classList.add('show');
        });
      },
    };
  }

  // ---------- Password visibility toggle ----------
  function eyeIconHtml() {
    return `
      <svg class="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      <svg class="icon-eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.6 10.6 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    `;
  }
  function initPasswordToggles() {
    document.querySelectorAll('input[type="password"]').forEach((input) => {
      if (input.dataset.pwToggleAdded) return;
      input.dataset.pwToggleAdded = '1';
      // A tight wrapper right around the input (not a whole .field, which
      // may also contain a label) keeps the toggle button's absolute
      // centering aligned to the input itself, wherever it sits.
      let wrap = input.closest('.portal-inputWrap');
      if (!wrap) {
        wrap = document.createElement('span');
        wrap.className = 'pw-inline-wrap';
        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(input);
      }
      wrap.classList.add('pw-field-wrap');
      wrap.style.position = wrap.style.position || 'relative';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pw-toggle';
      btn.setAttribute('aria-label', t('a11y.showPassword'));
      btn.innerHTML = eyeIconHtml();
      wrap.appendChild(btn);
      btn.addEventListener('click', () => {
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        btn.classList.toggle('showing', !showing);
        btn.setAttribute('aria-label', t(showing ? 'a11y.showPassword' : 'a11y.hidePassword'));
      });
    });
  }

  // ---------- UTM capture + propagation ----------
  const UTM_KEY = 'magicstick_utm';
  function initUtmCapture() {
    const params = new URLSearchParams(window.location.search);
    const utm = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((k) => {
      const v = params.get(k);
      if (v) utm[k] = v;
    });
    if (Object.keys(utm).length) {
      try { sessionStorage.setItem(UTM_KEY, JSON.stringify(utm)); } catch (err) { /* ignore */ }
    }
  }
  // Read back anywhere (quote.js/booking.js) via window.MagicstickUtm.get().
  window.MagicstickUtm = {
    get() {
      try {
        const raw = sessionStorage.getItem(UTM_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (err) {
        return null;
      }
    },
    describe() {
      const utm = window.MagicstickUtm.get();
      if (!utm) return '';
      const parts = Object.entries(utm).map(([k, v]) => `${k.replace('utm_', '')}=${v}`);
      return parts.join(', ');
    },
  };

  // ---------- Footer newsletter form ----------
  function initNewsletterForm() {
    const form = document.getElementById('newsletterForm');
    if (!form || form.dataset.wired) return;
    form.dataset.wired = '1';
    const note = document.getElementById('newsletterNote');
    const honeypot = form.querySelector('input[name="company"]');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (honeypot && honeypot.value.trim() !== '') {
        // Looks like a bot — pretend success without sending anything.
        if (note) { note.textContent = t('footer.newsletter.thanks'); note.classList.add('sent'); }
        form.reset();
        return;
      }
      const email = form.querySelector('input[type="email"]').value.trim();
      if (!email) return;
      const subject = t('footer.newsletter.mailSubject');
      const body = `${t('footer.newsletter.mailBody')}\n\nEmail: ${email}`;
      const mailto = `mailto:magicstickclean@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      try {
        const a = document.createElement('a');
        a.href = mailto;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err) { /* ignore */ }
      if (note) { note.textContent = t('footer.newsletter.thanks'); note.classList.add('sent'); }
      form.reset();
    });
  }

  function init() {
    initSkipLink();
    initScrollProgress();
    initFloatingContact();
    initBackToTop();
    initThemeToggle();
    initCookieBanner();
    initCopyButtons();
    initConfirmModal();
    initPasswordToggles();
    initUtmCapture();
    initNewsletterForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Some auth widgets (login/signup tab switches) swap forms in and out of
  // `hidden` after this script already ran once — catch any password field
  // or newsletter form that shows up later.
  document.addEventListener('click', () => {
    initPasswordToggles();
    initNewsletterForm();
  });
})();
