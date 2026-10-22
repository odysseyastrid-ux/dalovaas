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
    }
    return client;
  }

  window.MagicstickBackend = { getSupabaseClient, isBackendConfigured, config };
})();
