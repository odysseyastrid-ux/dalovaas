// Scheduled Edge Function (Supabase Cron) — flips orders from "Preparing"
// to "Ready" once their 7-minute step_deadline has passed. This is the
// server-side replacement for the prototype's client-side setInterval,
// which stopped advancing orders the moment a browser tab was closed.
//
// Wire up in the Supabase dashboard: Edge Functions > advance-order-status >
// Cron, schedule `*/1 * * * *`. Redundant with the pg_cron job installed in
// migration 0002 if your project has the pg_cron extension enabled — both
// call the same idempotent RPC, so it's safe to run either or both.

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async () => {
  const { data, error } = await supabase.rpc("run_order_status_cron");
  if (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ advanced: data }), { status: 200 });
});
