// In-memory stand-in for @supabase/supabase-js, used only by the function
// tests (see deno.json "imports" in this folder). It implements just the query
// surface the edge functions use, plus JS versions of the SQL helpers
// (rate_limit_hit, reserve_booking_deposit, expire_pending_booking) so the
// functions' wiring can be exercised without a database. The SQL itself is
// tested against a real Postgres (see supabase/tests/README.md).
// deno-lint-ignore-file no-explicit-any

export type Row = Record<string, any>;
type RpcResult = { data: any; error: any };

export const state = {
  tables: {} as Record<string, Row[]>,
  rpcHandlers: {} as Record<string, (args: any) => RpcResult | Promise<RpcResult>>,
  rpcLog: [] as { fn: string; args: any }[],
  users: {} as Record<string, string>,                       // access token -> user id
  storageObjects: {} as Record<string, { name: string; created_at?: string; metadata: { size: number } }[]>,
  removed: [] as string[],
  signed: [] as string[],
  counters: new Map<string, number>(),
  failures: new Set<string>(),                                // e.g. "bookings:update"
  reset() {
    this.failures = new Set();
    this.tables = {};
    this.rpcHandlers = {};
    this.rpcLog = [];
    this.users = {};
    this.storageObjects = {};
    this.removed = [];
    this.signed = [];
    this.counters = new Map();
  },
  table(name: string): Row[] {
    return (this.tables[name] ??= []);
  },
};

class Query implements PromiseLike<any> {
  private op: "select" | "insert" | "update" = "select";
  private filters: ((r: Row) => boolean)[] = [];
  private payload: any;
  private head = false;
  private wantCount = false;
  private max: number | null = null;
  private orderKey: string | null = null;
  private asc = true;
  private mode: "many" | "single" | "maybe" = "many";
  constructor(private name: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op === "select") { this.head = !!opts?.head; this.wantCount = !!opts?.count; }
    return this;
  }
  insert(row: Row) { this.op = "insert"; this.payload = row; return this; }
  update(patch: Row) { this.op = "update"; this.payload = patch; return this; }
  eq(k: string, v: any) { this.filters.push((r) => r[k] === v); return this; }
  in(k: string, vs: any[]) { this.filters.push((r) => vs.includes(r[k])); return this; }
  lt(k: string, v: any) { this.filters.push((r) => r[k] < v); return this; }
  order(k: string, o?: { ascending?: boolean }) { this.orderKey = k; this.asc = o?.ascending !== false; return this; }
  limit(n: number) { this.max = n; return this; }
  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  then<T1, T2>(res?: any, rej?: any): Promise<T1 | T2> { return Promise.resolve(this.run()).then(res, rej); }

  private shape(rows: Row[]): RpcResult {
    if (this.mode === "single") {
      return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { message: "expected one row" } };
    }
    if (this.mode === "maybe") return { data: rows[0] ?? null, error: null };
    return { data: rows, error: null };
  }

  private run(): any {
    if (state.failures.has(`${this.name}:${this.op}`)) {
      return { data: null, error: { message: "simulated database failure" } };
    }
    const rows = state.table(this.name);
    if (this.op === "insert") {
      const row: Row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...this.payload };
      const key = row.idempotency_key;
      if ((key && rows.some((r) => r.idempotency_key === key)) || (this.payload.id && rows.some((r) => r.id === this.payload.id))) {
        return { data: null, error: { code: "23505", message: "duplicate key" } };
      }
      rows.push(row);
      return this.shape([row]);
    }
    let matched = rows.filter((r) => this.filters.every((f) => f(r)));
    if (this.op === "update") {
      for (const r of matched) Object.assign(r, this.payload);
      return this.shape(matched);
    }
    if (this.orderKey) {
      const k = this.orderKey;
      matched = [...matched].sort((a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * (this.asc ? 1 : -1));
    }
    if (this.max !== null) matched = matched.slice(0, this.max);
    if (this.head) return { data: null, count: matched.length, error: null };
    const out = this.shape(matched) as any;
    if (this.wantCount) out.count = matched.length;
    return out;
  }
}

// ---- JS twins of the SQL helpers (the real SQL is tested on Postgres) ------

function rateLimitHit(a: { p_key: string; p_window_seconds: number; p_max: number }): RpcResult {
  const bucket = `${a.p_key}@${Math.floor(Date.now() / 1000 / a.p_window_seconds)}`;
  const hits = (state.counters.get(bucket) ?? 0) + 1;
  state.counters.set(bucket, hits);
  return { data: hits <= a.p_max, error: null };
}

function reserveBookingDeposit(a: any): RpcResult {
  const booking = state.table("bookings").find((b) => b.id === a.p_booking);
  if (!booking) return { data: null, error: { message: "booking not found" } };
  let held = 0;
  const card = a.p_card ? state.table("gift_cards").find((c) => c.id === a.p_card && c.status === "active") : null;
  if (card && a.p_planned > 0) {
    held = Math.min(card.balance_cents, a.p_planned);
    card.balance_cents -= held;
  }
  let due = Math.max(0, a.p_deposit - held);
  if (due > 0 && due < a.p_min_charge) due = 0;
  Object.assign(booking, {
    deposit_cents: due, gift_card_planned_cents: held, gift_card_applied_cents: held,
    ...(due === 0 ? { status: "confirmed", paid_at: new Date().toISOString() } : {}),
  });
  return { data: [{ applied_cents: held, online_due_cents: due, confirmed: due === 0 }], error: null };
}

function expirePendingBooking(a: any): RpcResult {
  const booking = state.table("bookings").find((b) => b.id === a.p_booking);
  if (!booking || booking.status !== "pending_payment") return { data: false, error: null };
  const card = booking.gift_card_id ? state.table("gift_cards").find((c) => c.id === booking.gift_card_id) : null;
  if (card) card.balance_cents += booking.gift_card_applied_cents ?? 0;
  Object.assign(booking, { status: "cancelled", gift_card_applied_cents: 0, gift_card_planned_cents: 0, idempotency_key: null });
  return { data: true, error: null };
}

const defaults: Record<string, (args: any) => RpcResult> = {
  rate_limit_hit: rateLimitHit,
  reserve_booking_deposit: reserveBookingDeposit,
  expire_pending_booking: expirePendingBooking,
  redeem_gift_card: () => ({ data: 0, error: null }),
};

class FakeClient {
  from(name: string) { return new Query(name); }
  async rpc(fn: string, args: any): Promise<RpcResult> {
    state.rpcLog.push({ fn, args });
    const handler = state.rpcHandlers[fn] ?? defaults[fn];
    if (!handler) return { data: null, error: { message: `no rpc ${fn}` } };
    return await handler(args);
  }
  auth = {
    getUser: async (token: string) => {
      const id = state.users[token];
      return id ? { data: { user: { id } }, error: null } : { data: { user: null }, error: { message: "invalid token" } };
    },
  };
  storage = {
    from: (_bucket: string) => ({
      createSignedUploadUrl: async (path: string) => {
        state.signed.push(path);
        return { data: { signedUrl: `https://storage.test/${path}`, token: `tok-${path}`, path }, error: null };
      },
      list: async (folder: string, _opts?: unknown) => ({ data: state.storageObjects[folder] ?? [], error: null }),
      remove: async (paths: string[]) => { state.removed.push(...paths); return { data: [], error: null }; },
    }),
  };
}

export function createClient(_url: string, _key: string) {
  return new FakeClient();
}
