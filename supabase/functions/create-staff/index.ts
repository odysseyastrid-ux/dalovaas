// Manager-only staff invitation. Creates a real Supabase Auth user (email +
// temporary password) and the matching `staff` row — this is what replaces
// the prototype's single shared "Mode développeur" password.
//
// Called from the dashboard as:
//   supabase.functions.invoke('create-staff', { body: { email, name, role } })
// The caller's JWT is checked against the `staff` table (must be an active
// manager) before anything is created.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await callerClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "not authenticated" }), { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: callerStaff } = await admin
    .from("staff")
    .select("role, active")
    .eq("id", userData.user.id)
    .single();

  if (!callerStaff?.active || callerStaff.role !== "manager") {
    return new Response(JSON.stringify({ error: "manager access required" }), { status: 403 });
  }

  const { email, name, role } = await req.json();
  if (!email || !name || !["cashier", "manager"].includes(role)) {
    return new Response(JSON.stringify({ error: "email, name and a valid role are required" }), { status: 400 });
  }

  const tempPassword = crypto.randomUUID().slice(0, 12);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (createErr || !created?.user) {
    return new Response(JSON.stringify({ error: createErr?.message ?? "failed to create user" }), { status: 400 });
  }

  const { error: staffErr } = await admin.from("staff").insert({
    id: created.user.id,
    name,
    role,
    active: true,
  });
  if (staffErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return new Response(JSON.stringify({ error: staffErr.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ email, tempPassword }), { status: 200 });
});
