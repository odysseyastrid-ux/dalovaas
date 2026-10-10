// Server-side abuse guard shared by the public edge functions.
//
// This exact file is copied next to every function that uses it
// (ai-chat, create-payment-intent, gift-cards, submit-form, submit-quote) so
// each function stays self-contained when deployed. `deno task` / the test in
// supabase/functions/tests/guard_copies.test.ts fails if the copies drift.
//
// - clientIp(): the visitor's address as set by Cloudflare in front of
//   Supabase (`cf-connecting-ip`, overwritten by Cloudflare so a visitor
//   cannot forge it). `x-forwarded-for` is only a last resort because its
//   first entry is client-controlled.
// - checkLimits(): atomic counters in Postgres (rate_limit_hit), shared by all
//   instances. It FAILS CLOSED: if the counter cannot be reached the caller
//   gets "error" and must refuse the request instead of doing the costly work.

// deno-lint-ignore no-explicit-any
type Db = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: any; error: any }> };

export function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = (req.headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  // The proxy appends the real peer last; the first entry can be forged.
  return forwarded.length ? forwarded[forwarded.length - 1] : "unknown";
}

export async function hashIp(req: Request): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`magicstick:${clientIp(req)}`));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// scope "ip": per visitor. "global": whole site. "key": per caller-supplied
// identifier (e.g. a contact address) — hashed here, never stored raw.
export type Rule =
  | { scope: "ip" | "global"; windowSeconds: number; max: number }
  | { scope: "key"; id: string; windowSeconds: number; max: number };
export type LimitResult = "ok" | "limited" | "error";

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function checkLimits(db: Db, req: Request, name: string, rules: Rule[]): Promise<LimitResult> {
  let ipPart: string | null = null;
  for (const rule of rules) {
    let key: string;
    if (rule.scope === "ip") {
      ipPart ??= await hashIp(req);
      key = `${name}:ip:${ipPart}:${rule.windowSeconds}`;
    } else if (rule.scope === "key") {
      key = `${name}:key:${await sha256Hex(`magicstick:key:${rule.id}`)}:${rule.windowSeconds}`;
    } else {
      key = `${name}:global:${rule.windowSeconds}`;
    }
    try {
      const { data, error } = await db.rpc("rate_limit_hit", {
        p_key: key, p_window_seconds: rule.windowSeconds, p_max: rule.max,
      });
      if (error || typeof data !== "boolean") {
        console.error("rate limit check failed:", error);
        return "error";
      }
      if (!data) return "limited";
    } catch (err) {
      console.error("rate limit check threw:", err);
      return "error";
    }
  }
  return "ok";
}

// Reads a request body as text, refusing anything bigger than `maxBytes`
// (checked on the declared length first, then on what actually arrived).
export async function readLimitedBody(req: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  const text = await req.text();
  return new TextEncoder().encode(text).length > maxBytes ? null : text;
}
