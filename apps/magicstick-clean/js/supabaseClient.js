// Thin wrapper around the Supabase JS UMD client (loaded via CDN in each
// page's <head>, no build step needed). Every page can call
// getSupabaseClient() and check isBackendConfigured() before using it.
(function () {
  const config = window.MAGICSTICK_CONFIG || {};

  function isBackendConfigured() {
    // Also false if the CDN script failed to load, so pages fall back
    // gracefully instead of throwing on window.supabase.createClient.
    return Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY && window.supabase);
  }

  let client = null;
  function getSupabaseClient() {
    if (!isBackendConfigured()) return null;
    if (!client) {
      // Login tokens live in sessionStorage, not localStorage: they never
      // outlive the browser tab/session on the device. (Same-tab navigation
      // keeps you signed in; a new browser session asks to log in again.)
      let storage;
      try { storage = window.sessionStorage; } catch (err) { storage = undefined; }
      client = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
        auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
      // Remove any token an older version of the site left in localStorage.
      try {
        Object.keys(window.localStorage)
          .filter((k) => /^sb-.*-auth-token/.test(k))
          .forEach((k) => window.localStorage.removeItem(k));
      } catch (err) { /* storage blocked: nothing to clean */ }
      startIdleSignOut(client);
    }
    return client;
  }

  // Idle sign-out, on top of sessionStorage: a signed-in tab left alone is
  // signed out (30 min on the admin dashboard, 60 min elsewhere). The last
  // activity is kept in sessionStorage, so moving between pages doesn't reset
  // it, and it is checked again as soon as the tab is shown (after a sleep).
  const IDLE_KEY = 'magicstick_last_activity';
  const IDLE_NOTICE_KEY = 'magicstick_idle_signed_out';
  function startIdleSignOut(sb) {
    const isAdmin = /\/admin(\.html)?$/.test(window.location.pathname);
    const limitMs = (isAdmin ? 30 : 60) * 60 * 1000;
    const read = () => { try { return Number(sessionStorage.getItem(IDLE_KEY)) || 0; } catch (e) { return 0; } };
    const write = (v) => { try { v ? sessionStorage.setItem(IDLE_KEY, String(v)) : sessionStorage.removeItem(IDLE_KEY); } catch (e) { /* blocked */ } };
    let lastWrite = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite > 15000) { lastWrite = now; write(now); }
    };
    let checking = false;
    async function check() {
      if (checking) return;
      checking = true;
      try {
        const last = read();
        // Judge the idle time BEFORE asking for the session: getSession() may
        // refresh the token, which must not happen for an expired tab.
        if (last && Date.now() - last > limitMs) {
          const { data } = await sb.auth.getSession();
          write(0);
          if (data && data.session) {
            try { sessionStorage.setItem(IDLE_NOTICE_KEY, '1'); } catch (e) { /* blocked */ }
            await sb.auth.signOut({ scope: 'local' });
            if (/\/(admin|account)(\.html)?$/.test(window.location.pathname)) window.location.reload();
          }
          return;
        }
        if (!last) write(Date.now());
      } finally {
        checking = false;
      }
    }
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) =>
      window.addEventListener(ev, onActivity, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    window.addEventListener('focus', check);
    setInterval(check, 30000);
    check();
  }

  // True once after an idle sign-out, so the login form can say why.
  function consumeIdleNotice() {
    try {
      const seen = sessionStorage.getItem(IDLE_NOTICE_KEY) === '1';
      sessionStorage.removeItem(IDLE_NOTICE_KEY);
      return seen;
    } catch (e) { return false; }
  }

  window.MagicstickBackend = { getSupabaseClient, isBackendConfigured, consumeIdleNotice, config };
})();
