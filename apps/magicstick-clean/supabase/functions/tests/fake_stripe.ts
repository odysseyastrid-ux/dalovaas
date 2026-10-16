// Stand-in for the Stripe SDK, used only by the function tests.
// deno-lint-ignore-file no-explicit-any

export const stripeState = {
  intents: [] as any[],
  cancelled: [] as string[],
  failCreate: null as Error | null,
  reset() {
    this.intents = [];
    this.cancelled = [];
    this.failCreate = null;
  },
};

export default class Stripe {
  static createFetchHttpClient() { return {}; }
  constructor(_key: string, _opts?: unknown) {}

  paymentIntents = {
    create: async (params: any, opts?: any) => {
      if (stripeState.failCreate) throw stripeState.failCreate;
      const n = stripeState.intents.length + 1;
      const pi = { id: `pi_test_${n}`, client_secret: `pi_test_${n}_secret`, status: "requires_payment_method", ...params, opts };
      stripeState.intents.push(pi);
      return pi;
    },
    cancel: async (id: string) => {
      const pi = stripeState.intents.find((p) => p.id === id);
      if (!pi) throw new Error("no such payment_intent");
      if (pi.status === "succeeded") throw new Error("payment_intent_unexpected_state");
      pi.status = "canceled";
      stripeState.cancelled.push(id);
      return pi;
    },
    retrieve: async (id: string) => {
      const pi = stripeState.intents.find((p) => p.id === id);
      if (!pi) throw new Error("no such payment_intent");
      return pi;
    },
  };

  webhooks = {
    // The real SDK verifies the signature over the raw body; the tests accept
    // the literal signature "valid" and reject anything else.
    constructEventAsync: async (raw: string, signature: string | null, _secret: string) => {
      if (signature !== "valid") throw new Error("bad signature");
      return JSON.parse(raw);
    },
  };
}
