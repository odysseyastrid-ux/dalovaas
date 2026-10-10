// Public endpoints that talk to paid services or send email: gift-cards,
// submit-form, ai-chat (audit S04 + S05) — limits are atomic, shared, and fail
// closed; provider errors are never echoed to the visitor.
// deno-lint-ignore-file no-explicit-any
import assert from "node:assert/strict";
import { state } from "./fake_supabase.ts";
import { fetchCalls, installFetch, loadHandler, post, resetAll, setProviderReply } from "./harness.ts";

installFetch();
const giftCards = await loadHandler("../gift-cards/index.ts");
const submitForm = await loadHandler("../submit-form/index.ts");
const aiChat = await loadHandler("../ai-chat/index.ts");

async function call(h: (r: Request) => Promise<Response> | Response, body: unknown, headers: Record<string, string> = {}) {
  const res = await h(post(body, headers));
  return { status: res.status, json: await res.json() as any };
}
const breakLimiter = () => { state.rpcHandlers.rate_limit_hit = () => ({ data: null, error: { message: "down" } }); };

// ---------------------------------------------------------------- gift-cards
Deno.test("S05 gift-cards: the 21st balance check in an hour from one visitor is refused", async () => {
  resetAll();
  const out: number[] = [];
  for (let i = 0; i < 22; i++) out.push((await call(giftCards, { action: "check", code: "MSC-AAAA-BBBB-CCCC" })).status);
  assert.deepEqual(out.slice(0, 20).every((s) => s === 200), true);
  assert.deepEqual(out.slice(20), [429, 429]);
});

Deno.test("S05 gift-cards: concurrent purchases cannot slip past the limit (atomic counter)", async () => {
  resetAll();
  const body = {
    action: "purchase", amount_cents: 5000, purchaser_name: "Ana", purchaser_email: "ana@example.com",
    recipient_email: "friend@example.com", deliver_to: "recipient",
  };
  // Twelve requests started at the same instant, as in the audit's scenario.
  const results = await Promise.all(Array.from({ length: 12 }, () => call(giftCards, body)));
  const accepted = results.filter((r) => r.status === 200).length;
  assert.equal(accepted, 8, "exactly the 8-per-hour limit is accepted");
  assert.equal(results.filter((r) => r.status === 429).length, 4);
});

Deno.test("S05 gift-cards: when the limiter errors, NO PaymentIntent / card row is created (fail closed)", async () => {
  resetAll();
  breakLimiter();
  const r = await call(giftCards, {
    action: "purchase", amount_cents: 5000, purchaser_name: "Ana", purchaser_email: "ana@example.com",
    recipient_email: "friend@example.com", deliver_to: "recipient",
  });
  assert.equal(r.status, 503);
  assert.equal(state.table("gift_cards").length, 0);
});

Deno.test("gift-cards: admin and internal actions are unaffected by the public limits and still require credentials", async () => {
  resetAll();
  assert.equal((await call(giftCards, { action: "issue", amount_cents: 5000 })).status, 401);
  assert.equal((await call(giftCards, { action: "deliver", gift_card_id: "x" })).status, 401);
  assert.equal((await call(giftCards, { action: "nope" })).json.error, "unknown_action");
});

// --------------------------------------------------------------- submit-form
Deno.test("S05 submit-form: the 9th submission in an hour from one visitor is refused", async () => {
  resetAll();
  const out: number[] = [];
  for (let i = 0; i < 10; i++) out.push((await call(submitForm, { form: "newsletter", email: `a${i}@example.com`, lang: "en" })).status);
  assert.deepEqual(out, [200, 200, 200, 200, 200, 200, 200, 200, 429, 429]);
});

Deno.test("S05 submit-form: concurrent submissions respect the limit exactly", async () => {
  resetAll();
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) =>
    call(submitForm, { form: "newsletter", email: `c${i}@example.com`, lang: "en" })));
  assert.equal(results.filter((r) => r.status === 200).length, 8);
});

Deno.test("S05 submit-form: when the limiter errors nothing is stored and no email is sent (fail closed)", async () => {
  resetAll();
  breakLimiter();
  const r = await call(submitForm, { form: "newsletter", email: "a@example.com", lang: "en" });
  assert.equal(r.status, 503);
  assert.equal(state.table("newsletter_subscribers").length, 0);
  assert.equal(fetchCalls.filter((c) => c.url.includes("resend")).length, 0);
});

Deno.test("S05: the visitor's address comes from cf-connecting-ip — a forged x-forwarded-for does not dodge the limit", async () => {
  resetAll();
  const out: number[] = [];
  for (let i = 0; i < 10; i++) {
    out.push((await call(submitForm, { form: "newsletter", email: `d${i}@example.com`, lang: "en" },
      { "x-forwarded-for": `10.0.0.${i}` })).status);
  }
  assert.deepEqual(out.slice(8), [429, 429]);
});

// ------------------------------------------------------------------- ai-chat
const chat = (extra: Record<string, unknown> = {}) => ({ lang: "en", messages: [{ role: "user", content: "Hi" }], ...extra });

Deno.test("ai-chat: a normal question gets the model's reply", async () => {
  resetAll();
  const r = await call(aiChat, chat());
  assert.equal(r.status, 200);
  assert.equal(r.json.reply, "Hello from Louis");
});

Deno.test("S04 ai-chat: after 25 requests in 10 minutes from one visitor the provider is no longer called", async () => {
  resetAll();
  const out: number[] = [];
  for (let i = 0; i < 30; i++) out.push((await call(aiChat, chat())).status);
  assert.equal(out.filter((s) => s === 200).length, 25);
  assert.equal(out.filter((s) => s === 429).length, 5);
  assert.equal(fetchCalls.filter((c) => c.url.includes("groq")).length, 25, "refused requests never reach the provider");
});

Deno.test("S04/S05 ai-chat: when the limiter errors the provider is not called (fail closed)", async () => {
  resetAll();
  breakLimiter();
  const r = await call(aiChat, chat());
  assert.equal(r.status, 503);
  assert.equal(fetchCalls.filter((c) => c.url.includes("groq")).length, 0);
});

Deno.test("ai-chat: provider errors are not echoed to the visitor", async () => {
  resetAll();
  setProviderReply({ error: { message: "Invalid API key gsk_live_SECRET" } }, 401);
  const r = await call(aiChat, chat());
  assert.equal(r.status, 502);
  assert.deepEqual(r.json, { error: "assistant_unavailable" });
});

Deno.test("ai-chat: oversized bodies and malformed input are refused cleanly", async () => {
  resetAll();
  const big = await aiChat(post(chat({ messages: [{ role: "user", content: "x".repeat(30_000) }] })));
  assert.equal(big.status, 413);
  assert.equal((await call(aiChat, [1])).json.error, "invalid_body");
  assert.equal((await call(aiChat, { lang: "en", messages: [] })).status, 400);
});
