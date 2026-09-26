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
      client = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    }
    return client;
  }

  window.MagicstickBackend = { getSupabaseClient, isBackendConfigured, config };
})();
