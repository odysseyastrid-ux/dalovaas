// CORS hardening for every browser-facing function: only the site itself may
// call them, and a browser on another site is refused BEFORE any work is done
// (a text/plain "simple" POST skips the preflight, so hiding the answer alone
// would still let it spend a model call, send an email or burn rate limits).
// deno-lint-ignore-file no-explicit-any
import assert from "node:assert/strict";
import { state } from "./fake_supabase.ts";
import { stripeState } from "./fake_stripe.ts";
import { bookingBody, emails, fetchCalls, installFetch, loadHandler, resetAll, seedServices } from "./harness.ts";

installFetch();
const functions: Record<string, (r: Request) => Promise<Response> | Response> = {
  "ai-chat": await loadHandler("../ai-chat/index.ts"),
  "create-payment-intent": await loadHandler("../create-payment-intent/index.ts"),
  "gift-cards": await loadHandler("../gift-cards/index.ts"),
  "submit-form": await loadHandler("../submit-form/index.ts"),
  "submit-quote": await loadHandler("../submit-quote/index.ts"),
  "owner-assistant": await loadHandler("../owner-assistant/index.ts"),
};

// A request that would do real work if it got through.
const bodies: Record<string, unknown> = {
  "ai-chat": { lang: "en", messages: [{ role: "user", content: "hi" }] },
  "create-payment-intent": bookingBody(),
  "gift-cards": { action: "check", code: "MSC-AAAA-BBBB-CCCC" },
  "submit-form": { form: "newsletter", email: "victim@example.com" },
  "submit-quote": { action: "submit", name: "A", contact: "a@example.com", service: "Standard", frequency: "One-time" },
  "owner-assistant": { messages: [{ role: "user", content: "hi" }] },
};

const FOREIGN = [
  "https://evil.example",
  "https://magicstickclean-evil.vercel.app",
  "https://magicstickclean-abc123-odysseyastrid-2841s-projects.vercel.app",
  "http://magicstickclean.ca",
  "https://magicstickclean.ca.evil.example",
  "null",
];

function fresh() {
  resetAll();
  seedServices();
  let rpcCalls = 0;
  state.rpcHandlers.rate_limit_hit = () => { rpcCalls++; return { data: true, error: null }; };
  return () => rpcCalls;
}

for (const [name, handler] of Object.entries(functions)) {
  Deno.test(`${name}: a browser on another site is refused with 403 and nothing runs`, async () => {
    for (const origin of FOREIGN) {
      const rpcCalls = fresh();
      // text/plain: the kind of POST a browser sends without a preflight.
      const res = await handler(new Request("https://functions.test/fn", {
        method: "POST",
        headers: { origin, "content-type": "text/plain" },
        body: JSON.stringify(bodies[name]),
      }));
      assert.equal(res.status, 403, `${name} ${origin}`);
      assert.equal((await res.json() as any).error, "forbidden_origin");
      assert.equal(res.headers.get("Access-Control-Allow-Origin"), null);
      assert.equal(rpcCalls(), 0, `${name}: no rate-limit counter touched`);
      assert.equal(fetchCalls.length, 0, `${name}: no outbound call`);
      assert.equal(emails.length, 0);
      assert.equal(stripeState.intents.length, 0);
      for (const table of ["bookings", "newsletter_subscribers", "quote_requests", "gift_cards", "contest_entries"]) {
        assert.equal(state.table(table).length, 0, `${name}: ${table}`);
      }
    }
  });

  Deno.test(`${name}: the site's own origins get the CORS header`, async () => {
    fresh();
    for (const origin of ["https://magicstickclean.ca", "https://www.magicstickclean.ca"]) {
      const res = await handler(new Request("https://functions.test/fn", { method: "OPTIONS", headers: { origin } }));
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("Access-Control-Allow-Origin"), origin);
      assert.match(res.headers.get("Vary") ?? "", /Origin/);
    }
  });
}

Deno.test("owner-assistant keeps the same allow-list as guard.ts", async () => {
  const read = (p: string) => Deno.readTextFile(new URL(p, import.meta.url));
  const list = (src: string) => src.match(/const ALLOWED_ORIGINS = new Set\((\[[^\]]*\])\)/)?.[1];
  const guard = list(await read("../ai-chat/guard.ts"));
  assert.ok(guard);
  assert.equal(list(await read("../owner-assistant/index.ts")), guard);
});

Deno.test("every guard.ts copy is identical", async () => {
  const names = ["ai-chat", "create-payment-intent", "gift-cards", "submit-form", "submit-quote"];
  const texts = await Promise.all(names.map((n) => Deno.readTextFile(new URL(`../${n}/guard.ts`, import.meta.url))));
  for (const t of texts) assert.equal(t, texts[0]);
});
