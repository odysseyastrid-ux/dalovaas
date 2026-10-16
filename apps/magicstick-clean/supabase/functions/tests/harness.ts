// Shared helpers for the function tests.
// deno-lint-ignore-file no-explicit-any
import { state } from "./fake_supabase.ts";
import { stripeState } from "./fake_stripe.ts";
import { todayInServiceTz } from "../create-payment-intent/validate.ts";

Deno.env.set("SUPABASE_URL", "https://project.supabase.test");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
Deno.env.set("SUPABASE_ANON_KEY", "anon-key");
Deno.env.set("STRIPE_SECRET_KEY", "sk_test_123");
Deno.env.set("STRIPE_WEBHOOK_SECRET", "whsec_test");
Deno.env.set("RESEND_API_KEY", "re_test");
Deno.env.set("GROQ_API_KEY", "groq_test");
Deno.env.set("OWNER_EMAIL", "owner@example.com");

export type Handler = (req: Request) => Promise<Response> | Response;

let loads = 0;
// Imports a function's index.ts with Deno.serve captured, so the exported
// handler can be called directly with Request objects.
export async function loadHandler(relativePath: string): Promise<Handler> {
  let captured: Handler | undefined;
  const original = (Deno as any).serve;
  (Deno as any).serve = (h: Handler) => { captured = h; return { shutdown() {} }; };
  try {
    await import(`${new URL(relativePath, import.meta.url).href}?load=${++loads}`);
  } finally {
    (Deno as any).serve = original;
  }
  if (!captured) throw new Error(`${relativePath} did not call Deno.serve`);
  return captured;
}

export type Email = { to: string; subject: string; text: string };
export const emails: Email[] = [];
export const fetchCalls: { url: string; body: any }[] = [];
let realFetch: typeof fetch | null = null;
let providerReply: any = { choices: [{ message: { content: "Hello from Louis" } }] };
let providerStatus = 200;

export function setProviderReply(body: any, status = 200) { providerReply = body; providerStatus = status; }

// Intercepts outbound HTTP: Resend emails are recorded, the model provider
// answers with providerReply, anything else is refused.
export function installFetch() {
  if (realFetch) return;
  realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input.url;
    const body = init?.body ? (() => { try { return JSON.parse(init.body); } catch { return init.body; } })() : null;
    fetchCalls.push({ url, body });
    if (url.startsWith("https://api.resend.com/")) {
      emails.push({ to: body.to, subject: body.subject, text: body.text });
      return new Response("{}", { status: 200 });
    }
    if (url.startsWith("https://api.groq.com/")) {
      return new Response(JSON.stringify(providerReply), { status: providerStatus });
    }
    throw new Error(`unexpected outbound request: ${url}`);
  }) as typeof fetch;
}

export function resetAll() {
  state.reset();
  stripeState.reset();
  emails.length = 0;
  fetchCalls.length = 0;
  providerReply = { choices: [{ message: { content: "Hello from Louis" } }] };
  providerStatus = 200;
}

export function seedServices() {
  state.table("services").push({
    id: "standard", name: "Standard Cleaning", active: true,
    base_price_cents: 9000, deposit_cents: 3000, first_booking_price_cents: 0,
  });
}

export function futureDate(daysAhead: number): string {
  const [y, m, d] = todayInServiceTz().split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + daysAhead));
  return dt.toISOString().slice(0, 10);
}

export const MORNING = "Morning (8am–11am)";

export function bookingBody(overrides: Record<string, unknown> = {}) {
  return {
    service_id: "standard",
    requested_date: futureDate(5),
    time_window: MORNING,
    guest_name: "Ana Tremblay",
    guest_contact: "ana@example.com",
    zone: "Rockland-Orléans",
    notes: "",
    ...overrides,
  };
}

export function post(body: unknown, headers: Record<string, string> = {}, raw?: string): Request {
  return new Request("https://functions.test/fn", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.9", ...headers },
    body: raw ?? JSON.stringify(body),
  });
}

export function addGiftCard(balance: number, id = "card-1") {
  state.table("gift_cards").push({ id, code: "MSC-ABCD-EFGH-JKLM", balance_cents: balance, status: "active" });
}
