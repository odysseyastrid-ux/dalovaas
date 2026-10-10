// Public endpoint for the "Get a free quote" form (audit S02 + S03).
//
// Before, the browser inserted straight into `quote_requests` and uploaded
// straight into the `quote-uploads` bucket with the public key, so anyone could
// skip the page's checks and trigger the owner/customer emails (or fill the
// storage) by calling the API directly. Now BOTH anonymous write paths are
// closed in the database (migration 0014) and everything goes through here:
//
//   action "prepare"  { files: { photos:[{type,size}], video?:{type,size} } }
//       validates the declared files, then issues one short-lived signed upload
//       URL per file, for server-chosen paths under a fresh quote id. Nothing
//       is stored in the database yet.
//   action "submit"   { quote_id?, <form fields>, photo_paths, video_path }
//       validates every field, checks the uploaded files really exist and obey
//       the size/type rules, forces status 'new', rate-limits per visitor, per
//       contact address and site-wide, then inserts the quote (which fires the
//       owner notification webhook).
//   action "purge_orphans"  (service-role bearer only; run it on a schedule)
//       deletes uploads that never got a quote after 24 h.
//
// Deployed with --no-verify-jwt (anonymous visitors). It protects itself:
// honeypot, strict validation, and atomic rate limits (per visitor, per
// contact address, site-wide) that fail closed. NOTE: there is no CAPTCHA —
// see SECURITY.md ("Not done") for the recommended next step.
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto).

import { createClient } from "npm:@supabase/supabase-js@2";
import { checkLimits, readLimitedBody } from "./guard.ts";
import {
  BUCKET, isUuid, MAX_BODY_BYTES, MAX_PHOTO_BYTES, MAX_VIDEO_BYTES,
  photoPath, validateFileDeclarations, validateQuote, videoPath,
} from "./validate.ts";

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_ROLE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function blocked(result: "ok" | "limited" | "error"): Response | null {
  if (result === "limited") return json({ ok: false, error: "rate_limited" }, 429);
  if (result === "error") return json({ ok: false, error: "temporarily_unavailable" }, 503);
  return null;
}

// The signed-in customer (if any) a quote should be attached to. A guest — or
// the anon key sent as a bearer — resolves to null.
async function getCustomerId(req: Request): Promise<string | null> {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error || !data.user ? null : data.user.id;
}

async function handlePrepare(req: Request, body: Record<string, unknown>) {
  // A bot that filled the hidden field gets a normal-looking answer and nothing else.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ ok: true, quote_id: crypto.randomUUID(), uploads: [] });
  }
  const stop = blocked(await checkLimits(supabase, req, "quote_prepare", [
    { scope: "ip", windowSeconds: 3600, max: 6 },
    { scope: "ip", windowSeconds: 86400, max: 15 },
    { scope: "global", windowSeconds: 3600, max: 60 },
    { scope: "global", windowSeconds: 86400, max: 150 },
  ]));
  if (stop) return stop;

  const decl = validateFileDeclarations(body.files);
  if (!decl.ok) return json({ ok: false, error: decl.error }, 400);
  if (decl.photos.length === 0 && !decl.video) return json({ ok: false, error: "no_files" }, 400);

  const quoteId = crypto.randomUUID();
  const uploads: { kind: "photo" | "video"; path: string; token: string }[] = [];
  const slots: { kind: "photo" | "video"; path: string }[] = [
    ...decl.photos.map((p, i) => ({ kind: "photo" as const, path: photoPath(quoteId, i, p.ext) })),
    ...(decl.video ? [{ kind: "video" as const, path: videoPath(quoteId, decl.video.ext) }] : []),
  ];
  for (const slot of slots) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(slot.path);
    if (error || !data?.token) throw new Error(`could not sign ${slot.path}: ${error?.message}`);
    uploads.push({ kind: slot.kind, path: slot.path, token: data.token });
  }
  return json({ ok: true, quote_id: quoteId, uploads });
}

// Keeps only the uploads that really exist and respect the size limits; any
// other object under the quote's folder is removed.
async function checkUploads(quoteId: string, photoPaths: string[], video: string | null) {
  const { data: listed, error } = await supabase.storage.from(BUCKET).list(quoteId, { limit: 50 });
  if (error) throw new Error(`could not list uploads: ${error.message}`);
  const byName = new Map((listed ?? []).map((o) => [o.name, o]));
  const keptPhotos: string[] = [];
  let keptVideo: string | null = null;
  const toRemove: string[] = [];

  const sizeOf = (path: string) => {
    const o = byName.get(path.slice(quoteId.length + 1));
    // deno-lint-ignore no-explicit-any
    return o ? Number((o.metadata as any)?.size ?? (o.metadata as any)?.contentLength ?? NaN) : null;
  };
  for (const p of photoPaths) {
    const size = sizeOf(p);
    if (size === null) continue;                       // never uploaded
    if (Number.isFinite(size) && size > 0 && size <= MAX_PHOTO_BYTES) keptPhotos.push(p);
    else toRemove.push(p);
  }
  if (video) {
    const size = sizeOf(video);
    if (size !== null) {
      if (Number.isFinite(size) && size > 0 && size <= MAX_VIDEO_BYTES) keptVideo = video;
      else toRemove.push(video);
    }
  }
  const claimed = new Set([...photoPaths, ...(video ? [video] : [])]);
  for (const o of listed ?? []) {
    const full = `${quoteId}/${o.name}`;
    if (!claimed.has(full)) toRemove.push(full);
  }
  if (toRemove.length) {
    const { error: rmError } = await supabase.storage.from(BUCKET).remove(toRemove);
    if (rmError) console.error("could not remove rejected uploads:", rmError.message);
  }
  return { keptPhotos, keptVideo };
}

async function handleSubmit(req: Request, body: Record<string, unknown>) {
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ ok: true, quote_id: crypto.randomUUID(), uploads_missing: 0 });
  }
  const stop = blocked(await checkLimits(supabase, req, "quote_submit", [
    { scope: "ip", windowSeconds: 3600, max: 6 },
    { scope: "ip", windowSeconds: 86400, max: 15 },
    { scope: "global", windowSeconds: 86400, max: 150 },
  ]));
  if (stop) return stop;

  const quoteId = body.quote_id === undefined || body.quote_id === null ? crypto.randomUUID() : body.quote_id;
  if (!isUuid(quoteId)) return json({ ok: false, error: "invalid_quote_id" }, 400);
  const id = quoteId.toLowerCase();

  const validated = validateQuote(body, id);
  if (!validated.ok) return json({ ok: false, error: validated.error }, 400);
  const quote = validated.value;

  const hasFiles = quote.photo_paths.length > 0 || quote.video_path !== null;

  // The same address can't be used to flood somebody's inbox: the customer
  // confirmation goes to `contact` whenever it is an email.
  const stopContact = blocked(await checkLimits(supabase, req, "quote_contact", [
    { scope: "key", id: quote.contact.toLowerCase(), windowSeconds: 86400, max: 3 },
  ]));
  if (stopContact) return stopContact;

  let uploadsMissing = 0;
  if (hasFiles) {
    const kept = await checkUploads(id, quote.photo_paths, quote.video_path);
    uploadsMissing = (quote.photo_paths.length - kept.keptPhotos.length) +
      (quote.video_path && !kept.keptVideo ? 1 : 0);
    quote.photo_paths = kept.keptPhotos;
    quote.video_path = kept.keptVideo;
  }

  const customerId = await getCustomerId(req);
  const { error } = await supabase.from("quote_requests").insert({
    ...quote,
    customer_id: customerId,
    status: "new",
  });
  if (error) {
    // Same quote id submitted twice (double click / retry): already saved.
    if (error.code === "23505") return json({ ok: true, quote_id: id, uploads_missing: uploadsMissing });
    throw new Error(error.message);
  }
  return json({ ok: true, quote_id: id, uploads_missing: uploadsMissing });
}

// Housekeeping, callable only with the service-role key (schedule it daily).
async function handlePurge(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token || token !== SERVICE_ROLE_KEY) return json({ ok: false, error: "unauthorized" }, 401);

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const { data: folders, error } = await supabase.storage.from(BUCKET).list("", { limit: 1000 });
  if (error) throw new Error(error.message);
  let removedFolders = 0, removedFiles = 0;
  for (const folder of folders ?? []) {
    if (!isUuid(folder.name)) continue;
    const { data: files } = await supabase.storage.from(BUCKET).list(folder.name, { limit: 100 });
    if (!files || files.length === 0) continue;
    const newest = Math.max(...files.map((f) => Date.parse(f.created_at ?? "") || Date.now()));
    if (newest > cutoff) continue;                     // might still be being submitted
    const { count } = await supabase
      .from("quote_requests").select("id", { count: "exact", head: true }).eq("id", folder.name);
    if ((count ?? 0) > 0) continue;                    // a quote owns these files
    const paths = files.map((f) => `${folder.name}/${f.name}`);
    const { error: rmError } = await supabase.storage.from(BUCKET).remove(paths);
    if (rmError) { console.error("purge failed for", folder.name, rmError.message); continue; }
    removedFolders++; removedFiles += paths.length;
  }
  return json({ ok: true, removed_folders: removedFolders, removed_files: removedFiles });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  try {
    const text = await readLimitedBody(req, MAX_BODY_BYTES);
    if (text === null) return json({ ok: false, error: "payload_too_large" }, 413);
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ ok: false, error: "invalid_body" }, 400);
    const body = parsed as Record<string, unknown>;
    switch (body.action) {
      case "prepare": return await handlePrepare(req, body);
      case "submit": return await handleSubmit(req, body);
      case "purge_orphans": return await handlePurge(req);
      default: return json({ ok: false, error: "unknown_action" }, 400);
    }
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: "server_error" }, 500);
  }
});
