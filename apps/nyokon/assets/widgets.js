// Small, page-agnostic UI widgets shared by every storefront page (both the
// streetwear and classic skins) and injected purely by JS so no HTML needed
// to change on any of the ~12 pages beyond one <script> include:
//   - skip-to-content link
//   - scroll progress bar
//   - back-to-top button
//   - cookie banner (local-storage only — nothing to actually consent to)
//   - first-touch UTM capture
//   - password show/hide toggles (auto-detects every <input type=password>,
//     including ones rendered later by page-specific inline scripts)
//   - window.nyokonConfirm(message) -> Promise<boolean>, a small modal used
//     in place of window.confirm()
//   - window.nyokonCopy(text, triggerEl) -> copies to clipboard with
//     inline "Copied!" feedback on the trigger element
//   - mobile hamburger menu (only activates on the one page that has the
//     full desktop nav — index.html — detected by #categoriesBtn's presence)
(function(){
  var isFr = document.documentElement.lang === 'fr';

  function ready(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function initSkipLink(){
    var main = document.querySelector('main');
    if (!main) return;
    if (!main.id) main.id = 'nyk-main-content';
    var link = document.createElement('a');
    link.href = '#' + main.id;
    link.className = 'nyk-skip-link';
    link.textContent = isFr ? 'Aller au contenu' : 'Skip to content';
    document.body.insertBefore(link, document.body.firstChild);
  }

  function initScrollProgress(){
    var bar = document.createElement('div');
    bar.className = 'nyk-scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    var fill = document.createElement('div');
    fill.className = 'nyk-scroll-progress-fill';
    bar.appendChild(fill);
    document.body.appendChild(bar);
    function update(){
      var doc = document.documentElement;
      var scrollTop = doc.scrollTop || document.body.scrollTop;
      var height = (doc.scrollHeight || document.body.scrollHeight) - doc.clientHeight;
      fill.style.width = (height > 0 ? (scrollTop / height) * 100 : 0) + '%';
    }
    document.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function initFloatingContact(){
    var link = document.createElement('a');
    link.href = 'info.html?topic=contact';
    link.className = 'nyk-float-contact';
    link.setAttribute('aria-label', isFr ? 'Contact' : 'Contact');
    link.innerHTML = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z"/></svg>';
    document.body.appendChild(link);
  }

  function initScrollTop(){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nyk-scroll-top';
    btn.setAttribute('aria-label', isFr ? 'Remonter en haut de la page' : 'Back to top');
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(btn);
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function toggle(){ btn.classList.toggle('is-visible', window.scrollY > 480); }
    window.addEventListener('scroll', toggle, { passive: true });
    btn.addEventListener('click', function(){
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    toggle();
  }

  function initCookieBanner(){
    var already;
    try { already = localStorage.getItem('nyokon-cookie-ok'); } catch (e) { return; }
    if (already === '1') return;
    var banner = document.createElement('div');
    banner.className = 'nyk-cookie-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookies');
    var msg = document.createElement('p');
    msg.textContent = isFr
      ? 'Ce site utilise le stockage de ton navigateur pour ton panier, ta langue et tes préférences — rien n’est partagé avec qui que ce soit.'
      : 'This site uses your browser’s local storage for your cart, language, and preferences — nothing is shared with anyone.';
    var ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'btn btn-light nyk-cookie-ok';
    ok.textContent = isFr ? 'Compris' : 'Got it';
    banner.appendChild(msg);
    banner.appendChild(ok);
    document.body.appendChild(banner);
    requestAnimationFrame(function(){ banner.classList.add('is-visible'); });
    ok.addEventListener('click', function(){
      try { localStorage.setItem('nyokon-cookie-ok', '1'); } catch (e) {}
      banner.classList.remove('is-visible');
      setTimeout(function(){ banner.remove(); }, 300);
    });
  }

  function initUTM(){
    try {
      if (localStorage.getItem('nyokon-utm')) return;
      var params = new URLSearchParams(location.search);
      var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
      var utm = {};
      var found = false;
      keys.forEach(function(k){
        var v = params.get(k);
        if (v) { utm[k] = v; found = true; }
      });
      if (found) {
        utm.landing_page = location.pathname;
        utm.captured_at = new Date().toISOString();
        localStorage.setItem('nyokon-utm', JSON.stringify(utm));
      }
    } catch (e) {}
  }

  function wrapPasswordField(input){
    if (input.dataset.nykWrapped) return;
    input.dataset.nykWrapped = '1';
    var wrap = document.createElement('div');
    wrap.className = 'nyk-pw-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nyk-pw-toggle';
    btn.setAttribute('aria-label', isFr ? 'Afficher le mot de passe' : 'Show password');
    btn.innerHTML = '<svg class="nyk-pw-eye" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg><svg class="nyk-pw-eye-off" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.5 5.2A11 11 0 0 1 12 5c7 0 11 7 11 7a13.4 13.4 0 0 1-3.2 3.8M6.6 6.6C4 8.3 2 12 2 12s2.2 4 6.1 6a10.7 10.7 0 0 0 3.9 1"/></svg>';
    wrap.appendChild(btn);
    btn.addEventListener('click', function(){
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.classList.toggle('is-shown', show);
      btn.setAttribute('aria-label', (show ? (isFr ? 'Masquer le mot de passe' : 'Hide password') : (isFr ? 'Afficher le mot de passe' : 'Show password')));
    });
  }

  function initPasswordToggles(){
    function scan(){ document.querySelectorAll('input[type="password"]').forEach(wrapPasswordField); }
    scan();
    var mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
  }

  window.nyokonConfirm = function(message, opts){
    opts = opts || {};
    return new Promise(function(resolve){
      var overlay = document.createElement('div');
      overlay.className = 'nyk-modal-overlay';
      var modal = document.createElement('div');
      modal.className = 'nyk-modal';
      var msgEl = document.createElement('p');
      msgEl.className = 'nyk-modal-msg';
      msgEl.textContent = message;
      var actions = document.createElement('div');
      actions.className = 'nyk-modal-actions';
      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn-outline';
      cancelBtn.textContent = opts.cancelLabel || (isFr ? 'Annuler' : 'Cancel');
      var confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'btn btn-light';
      confirmBtn.textContent = opts.confirmLabel || (isFr ? 'Confirmer' : 'Confirm');
      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
      modal.appendChild(msgEl);
      modal.appendChild(actions);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      requestAnimationFrame(function(){ overlay.classList.add('is-visible'); });
      function close(result){
        overlay.classList.remove('is-visible');
        document.removeEventListener('keydown', onKey);
        setTimeout(function(){ overlay.remove(); }, 200);
        resolve(result);
      }
      function onKey(e){ if (e.key === 'Escape') close(false); }
      cancelBtn.addEventListener('click', function(){ close(false); });
      confirmBtn.addEventListener('click', function(){ close(true); });
      overlay.addEventListener('click', function(e){ if (e.target === overlay) close(false); });
      document.addEventListener('keydown', onKey);
      confirmBtn.focus();
    });
  };

  window.nyokonCopy = function(text, btnEl){
    function feedback(ok){
      if (!btnEl) return;
      var original = btnEl.getAttribute('data-nyk-original');
      if (original === null) {
        original = btnEl.textContent;
        btnEl.setAttribute('data-nyk-original', original);
      }
      btnEl.textContent = ok ? (isFr ? 'Copié !' : 'Copied!') : (isFr ? 'Erreur' : 'Error');
      btnEl.classList.add('is-copied');
      setTimeout(function(){
        btnEl.textContent = original;
        btnEl.classList.remove('is-copied');
      }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function(){ feedback(true); }, function(){ feedback(false); });
    } else {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        feedback(true);
      } catch (e) { feedback(false); }
    }
  };

  function initMobileMenu(){
    var header = document.querySelector('.site-header');
    var catBtn = document.getElementById('categoriesBtn');
    if (!header || !catBtn) return; // only the full-nav header (index.html) gets a hamburger

    var burger = document.createElement('button');
    burger.type = 'button';
    burger.className = 'nyk-burger';
    burger.setAttribute('aria-label', isFr ? 'Menu' : 'Menu');
    burger.setAttribute('aria-expanded', 'false');
    burger.innerHTML = '<span></span><span></span><span></span>';
    header.insertBefore(burger, header.firstChild);

    var overlay = document.createElement('div');
    overlay.className = 'nyk-mobile-nav';
    var inner = document.createElement('div');
    inner.className = 'nyk-mobile-nav-inner';
    overlay.appendChild(inner);
    document.body.appendChild(overlay);

    function buildLinks(){
      inner.innerHTML = '';
      var seen = {};
      function addLink(a){
        var href = a.getAttribute('href');
        var label = a.textContent.trim();
        if (!href || !label || seen[href + '|' + label]) return;
        seen[href + '|' + label] = true;
        var clone = document.createElement('a');
        clone.href = href;
        clone.textContent = label;
        inner.appendChild(clone);
      }
      // Same links already shown (translated) in the categories dropdown
      // and the footer — cloning them keeps the mobile menu in sync with
      // whatever language/content the page already renders, with no
      // separate copy to maintain here.
      document.querySelectorAll('#categoriesPanel a, .footer-col a[href$=".html"], .footer-col a[href^="#shop"], .footer-col a[href^="account.html"]').forEach(addLink);
    }
    buildLinks();

    function close(){
      overlay.classList.remove('is-open');
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nyk-nav-locked');
    }
    function open(){
      buildLinks();
      overlay.classList.add('is-open');
      burger.classList.add('is-open');
      burger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('nyk-nav-locked');
    }
    burger.addEventListener('click', function(){
      overlay.classList.contains('is-open') ? close() : open();
    });
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    inner.addEventListener('click', function(e){ if (e.target.tagName === 'A') close(); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
  }

  ready(function(){
    initSkipLink();
    initScrollProgress();
    initScrollTop();
    initFloatingContact();
    initUTM();
    initCookieBanner();
    initPasswordToggles();
    initMobileMenu();
  });
})();
