// Strict input validation for create-payment-intent (audit S06).
// Pure functions only (no network, no database) so they are unit-tested in
// supabase/functions/tests/validate.test.ts.

export const MAX_BODY_BYTES = 20_000;

// Must match the <option value="..."> of #bTime in booking.html.
export const TIME_WINDOWS = [
  "Morning (8am–11am)",
  "Midday (11am–2pm)",
  "Afternoon (2pm–5pm)",
] as const;

// Must match the <option value="..."> of #bZone in booking.html.
export const ZONES = ["Rockland-Orléans", "Ottawa-Gatineau", "Other"] as const;

export const SERVICE_TZ = "America/Toronto";
export const MAX_DAYS_AHEAD = 365;

const LIMITS = { name: 120, contact: 200, notes: 2000, giftCode: 40, key: 64 };

export type BookingInput = {
  service_id: string;
  requested_date: string;       // YYYY-MM-DD
  time_window: string;
  guest_name: string;
  guest_contact: string;
  zone: string | null;
  notes: string;
  idempotency_key: string | null;
};

export type Validated =
  | { ok: true; value: BookingInput }
  | { ok: false; error: string };

// "YYYY-MM-DD" for `now` in the service's time zone (a booking for "today"
// must be judged on the business's calendar, not the server's UTC one).
export function todayInServiceTz(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SERVICE_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

function isRealDate(ymd: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const f = Date.parse(`${fromYmd}T00:00:00Z`);
  const t = Date.parse(`${toYmd}T00:00:00Z`);
  return Math.round((t - f) / 86_400_000);
}

// Drops control characters (keeping \n and \t when `multiline`), trims.
function clean(value: unknown, multiline = false): string | null {
  if (typeof value !== "string") return null;
  // deno-lint-ignore no-control-regex
  const re = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g;
  return value.replace(re, "").trim();
}

export function isEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value: string): boolean {
  if (!/^[0-9+()\-.\s]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function validateBooking(body: unknown, now: Date = new Date()): Validated {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "invalid_body" };
  const b = body as Record<string, unknown>;

  const serviceId = clean(b.service_id);
  if (!serviceId || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(serviceId)) return { ok: false, error: "invalid_service" };

  const date = clean(b.requested_date);
  if (!date || !isRealDate(date)) return { ok: false, error: "invalid_date" };
  const today = todayInServiceTz(now);
  const ahead = daysBetween(today, date);
  if (ahead < 0) return { ok: false, error: "date_in_past" };
  if (ahead > MAX_DAYS_AHEAD) return { ok: false, error: "date_too_far" };

  const timeWindow = clean(b.time_window);
  if (!timeWindow || !(TIME_WINDOWS as readonly string[]).includes(timeWindow)) {
    return { ok: false, error: "invalid_time_window" };
  }

  const name = clean(b.guest_name);
  if (!name || name.length > LIMITS.name) return { ok: false, error: "invalid_name" };

  const contact = clean(b.guest_contact);
  if (!contact || contact.length < 3 || contact.length > LIMITS.contact || !(isEmail(contact) || isPhone(contact))) {
    return { ok: false, error: "invalid_contact" };
  }

  let zone: string | null = null;
  if (b.zone !== undefined && b.zone !== null && b.zone !== "") {
    const z = clean(b.zone);
    if (!z || !(ZONES as readonly string[]).includes(z)) return { ok: false, error: "invalid_zone" };
    zone = z;
  }

  let notes = "";
  if (b.notes !== undefined && b.notes !== null) {
    const n = clean(b.notes, true);
    if (n === null) return { ok: false, error: "invalid_notes" };
    if (n.length > LIMITS.notes) return { ok: false, error: "notes_too_long" };
    notes = n;
  }

  let key: string | null = null;
  if (b.idempotency_key !== undefined && b.idempotency_key !== null && b.idempotency_key !== "") {
    const k = clean(b.idempotency_key);
    if (!k || !/^[A-Za-z0-9_-]{8,64}$/.test(k)) return { ok: false, error: "invalid_idempotency_key" };
    key = k;
  }

  return {
    ok: true,
    value: {
      service_id: serviceId, requested_date: date, time_window: timeWindow,
      guest_name: name, guest_contact: contact, zone, notes, idempotency_key: key,
    },
  };
}
