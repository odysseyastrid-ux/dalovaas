// Strict validation for the public quote form (audit S02 / S03).
// Pure functions — unit-tested in supabase/functions/tests/quote_validate.test.ts.

export const MAX_BODY_BYTES = 30_000;
export const BUCKET = "quote-uploads";

export const MAX_PHOTOS = 6;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

// Declared MIME type -> the extension the server uses in the stored path.
// (The visitor's own file name is never used in a storage path.)
export const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "image/heic": "heic", "image/heif": "heif",
};
export const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "video/3gpp": "3gp",
};
export const ALLOWED_MIME_TYPES = [...Object.keys(PHOTO_TYPES), ...Object.keys(VIDEO_TYPES)];

export const FREQUENCIES = ["One-time", "Monthly", "Biweekly", "Weekly"] as const;
export const ZONES = ["Rockland-Orléans", "Ottawa-Gatineau", "Other"] as const;
const SERVICE_TZ = "America/Toronto";
const MAX_DAYS_AHEAD = 730;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export type FileDecl = { type: string; size: number };
export type PrepareResult =
  | { ok: true; photos: { type: string; ext: string }[]; video: { type: string; ext: string } | null }
  | { ok: false; error: string };

// Checks the visitor's declared files BEFORE any upload permission is issued.
export function validateFileDeclarations(raw: unknown): PrepareResult {
  const files = (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw as Record<string, unknown> : {};
  const photosIn = Array.isArray(files.photos) ? files.photos : [];
  if (photosIn.length > MAX_PHOTOS) return { ok: false, error: "too_many_photos" };
  const photos: { type: string; ext: string }[] = [];
  for (const p of photosIn) {
    const d = p as Partial<FileDecl> | null;
    if (!d || typeof d.type !== "string" || !Number.isFinite(d.size)) return { ok: false, error: "invalid_file" };
    const ext = PHOTO_TYPES[d.type.toLowerCase()];
    if (!ext) return { ok: false, error: "unsupported_file_type" };
    if ((d.size as number) <= 0 || (d.size as number) > MAX_PHOTO_BYTES) return { ok: false, error: "file_too_large" };
    photos.push({ type: d.type.toLowerCase(), ext });
  }
  let video: { type: string; ext: string } | null = null;
  if (files.video) {
    const d = files.video as Partial<FileDecl>;
    if (typeof d.type !== "string" || !Number.isFinite(d.size)) return { ok: false, error: "invalid_file" };
    const ext = VIDEO_TYPES[d.type.toLowerCase()];
    if (!ext) return { ok: false, error: "unsupported_file_type" };
    if ((d.size as number) <= 0 || (d.size as number) > MAX_VIDEO_BYTES) return { ok: false, error: "file_too_large" };
    video = { type: d.type.toLowerCase(), ext };
  }
  return { ok: true, photos, video };
}

export function photoPath(quoteId: string, index: number, ext: string): string {
  return `${quoteId}/photo-${index}.${ext}`;
}
export function videoPath(quoteId: string, ext: string): string {
  return `${quoteId}/video.${ext}`;
}

export function isPhotoPathFor(quoteId: string, p: unknown): p is string {
  return typeof p === "string" &&
    new RegExp(`^${quoteId}/photo-[0-5]\\.(jpg|png|webp|heic|heif)$`, "i").test(p);
}
export function isVideoPathFor(quoteId: string, p: unknown): p is string {
  return typeof p === "string" && new RegExp(`^${quoteId}/video\\.(mp4|mov|webm|3gp)$`, "i").test(p);
}

export type QuoteInput = {
  id: string;
  name: string;
  contact: string;
  address: string | null;
  service: string;
  frequency: string;
  zone: string | null;
  message: string;
  first_time_offer_claimed: boolean;
  bedrooms: string | null;
  bathrooms: string | null;
  home_type: string | null;
  preferred_date: string | null;
  pets: string | null;
  photo_paths: string[];
  video_path: string | null;
};
export type QuoteValidated = { ok: true; value: QuoteInput } | { ok: false; error: string };

function clean(value: unknown, multiline = false): string | null {
  if (typeof value !== "string") return null;
  // deno-lint-ignore no-control-regex
  const re = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g;
  return value.replace(re, "").trim();
}

export function isEmail(v: string): boolean {
  return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function isPhone(v: string): boolean {
  if (!/^[0-9+()\-.\s]+$/.test(v)) return false;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function todayInServiceTz(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SERVICE_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
function isRealDate(ymd: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

// Optional short text (pill values such as "2", "House", "No pets").
function shortOrNull(v: unknown, max: number): { ok: true; value: string | null } | { ok: false } {
  if (v === undefined || v === null || v === "") return { ok: true, value: null };
  const s = clean(v);
  if (s === null || s.length > max) return { ok: false };
  return { ok: true, value: s || null };
}

export function validateQuote(body: unknown, quoteId: string, now: Date = new Date()): QuoteValidated {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "invalid_body" };
  const b = body as Record<string, unknown>;

  const name = clean(b.name);
  if (!name || name.length > 120) return { ok: false, error: "invalid_name" };

  const contact = clean(b.contact);
  if (!contact || contact.length < 3 || contact.length > 200 || !(isEmail(contact) || isPhone(contact))) {
    return { ok: false, error: "invalid_contact" };
  }

  const address = shortOrNull(b.address, 300);
  if (!address.ok) return { ok: false, error: "invalid_address" };

  // Option labels are translated on the page, so the value can be French:
  // bound its shape and length rather than matching a fixed list.
  const service = clean(b.service);
  if (!service || service.length > 80) return { ok: false, error: "invalid_service" };

  const frequency = clean(b.frequency) ?? "";
  if (!(FREQUENCIES as readonly string[]).includes(frequency)) return { ok: false, error: "invalid_frequency" };

  let zone: string | null = null;
  if (b.zone !== undefined && b.zone !== null && b.zone !== "") {
    const z = clean(b.zone);
    if (!z || !(ZONES as readonly string[]).includes(z)) return { ok: false, error: "invalid_zone" };
    zone = z;
  }

  let message = "";
  if (b.message !== undefined && b.message !== null) {
    const m = clean(b.message, true);
    if (m === null) return { ok: false, error: "invalid_message" };
    if (m.length > 4000) return { ok: false, error: "message_too_long" };
    message = m;
  }

  const bedrooms = shortOrNull(b.bedrooms, 40);
  const bathrooms = shortOrNull(b.bathrooms, 40);
  const homeType = shortOrNull(b.home_type, 60);
  const pets = shortOrNull(b.pets, 60);
  if (!bedrooms.ok || !bathrooms.ok || !homeType.ok || !pets.ok) return { ok: false, error: "invalid_details" };

  let preferred: string | null = null;
  if (b.preferred_date !== undefined && b.preferred_date !== null && b.preferred_date !== "") {
    const d = clean(b.preferred_date);
    if (!d || !isRealDate(d)) return { ok: false, error: "invalid_date" };
    if (d < todayInServiceTz(now)) return { ok: false, error: "date_in_past" };
    const ahead = (Date.parse(`${d}T00:00:00Z`) - Date.parse(`${todayInServiceTz(now)}T00:00:00Z`)) / 86_400_000;
    if (ahead > MAX_DAYS_AHEAD) return { ok: false, error: "date_too_far" };
    preferred = d;
  }

  const photoPaths: string[] = [];
  if (b.photo_paths !== undefined && b.photo_paths !== null) {
    if (!Array.isArray(b.photo_paths) || b.photo_paths.length > MAX_PHOTOS) return { ok: false, error: "invalid_files" };
    for (const p of b.photo_paths) {
      if (!isPhotoPathFor(quoteId, p) || photoPaths.includes(p)) return { ok: false, error: "invalid_files" };
      photoPaths.push(p);
    }
  }
  let video: string | null = null;
  if (b.video_path !== undefined && b.video_path !== null && b.video_path !== "") {
    if (!isVideoPathFor(quoteId, b.video_path)) return { ok: false, error: "invalid_files" };
    video = b.video_path;
  }

  return {
    ok: true,
    value: {
      id: quoteId, name, contact, address: address.value, service, frequency, zone, message,
      first_time_offer_claimed: b.first_time_offer_claimed === true,
      bedrooms: bedrooms.value, bathrooms: bathrooms.value, home_type: homeType.value,
      preferred_date: preferred, pets: pets.value,
      photo_paths: photoPaths, video_path: video,
    },
  };
}
