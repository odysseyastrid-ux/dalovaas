// submit-quote (audit S02 + S03).
// deno-lint-ignore-file no-explicit-any
import assert from "node:assert/strict";
import { state } from "./fake_supabase.ts";
import { futureDate, installFetch, loadHandler, post, resetAll } from "./harness.ts";

installFetch();
const handler = await loadHandler("../submit-quote/index.ts");

async function call(body: unknown, headers: Record<string, string> = {}) {
  const res = await handler(post(body, headers));
  return { status: res.status, json: await res.json() as any };
}
const QID = "11111111-2222-4333-8444-555555555555";

function quote(overrides: Record<string, unknown> = {}) {
  return {
    action: "submit", name: "Ana Tremblay", contact: "ana@example.com", service: "Standard Cleaning",
    frequency: "One-time", zone: "Rockland-Orléans", message: "Hello", ...overrides,
  };
}

Deno.test("S02: a quote is saved with status 'new' — a client-chosen status is ignored", async () => {
  resetAll();
  const r = await call(quote({ status: "contacted", customer_id: "someone-else" }));
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  const [row] = state.table("quote_requests");
  assert.equal(row.status, "new");
  assert.equal(row.customer_id, null, "a guest is never attached to another user's account");
});

Deno.test("S02: a signed-in customer's quote is attached to their own account only", async () => {
  resetAll();
  state.users["user-jwt"] = "user-1";
  await call(quote(), { Authorization: "Bearer user-jwt" });
  assert.equal(state.table("quote_requests")[0].customer_id, "user-1");
  resetAll();
  await call(quote(), { Authorization: "Bearer the-public-anon-key" });
  assert.equal(state.table("quote_requests")[0].customer_id, null);
});

Deno.test("S02: invalid fields are refused and nothing is stored", async () => {
  resetAll();
  assert.equal((await call(quote({ contact: "not a contact" }))).json.error, "invalid_contact");
  assert.equal((await call(quote({ name: "" }))).json.error, "invalid_name");
  assert.equal((await call(quote({ frequency: "Daily" }))).json.error, "invalid_frequency");
  assert.equal((await call(quote({ message: "x".repeat(4001) }))).json.error, "message_too_long");
  assert.equal((await call(quote({ preferred_date: "2020-01-01" }))).json.error, "date_in_past");
  assert.equal(state.table("quote_requests").length, 0);
});

Deno.test("S02: a huge body is refused before parsing", async () => {
  resetAll();
  const res = await handler(post(quote({ message: "x".repeat(60_000) })));
  assert.equal(res.status, 413);
  assert.equal(state.table("quote_requests").length, 0);
});

Deno.test("S02: a bot that fills the hidden field gets a normal answer and nothing is stored", async () => {
  resetAll();
  const r = await call(quote({ website: "http://spam.example" }));
  assert.equal(r.status, 200);
  assert.equal(state.table("quote_requests").length, 0);
});

Deno.test("S02: a burst is limited before any row (and therefore any email) is created", async () => {
  resetAll();
  const statuses: number[] = [];
  for (let i = 0; i < 8; i++) statuses.push((await call(quote({ contact: `p${i}@example.com` }))).status);
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 200, 429, 429]);
  assert.equal(state.table("quote_requests").length, 6);
});

Deno.test("S02: one address cannot be mailed more than 3 times a day, even from different networks", async () => {
  resetAll();
  const out: number[] = [];
  for (let i = 0; i < 5; i++) out.push((await call(quote({ contact: "victim@example.com" }), { "cf-connecting-ip": `198.51.100.${i + 1}` })).status);
  assert.deepEqual(out, [200, 200, 200, 429, 429]);
  assert.equal(state.table("quote_requests").length, 3);
});

Deno.test("S05: the limiter fails CLOSED on a counter error", async () => {
  resetAll();
  state.rpcHandlers.rate_limit_hit = () => ({ data: null, error: { message: "down" } });
  const r = await call(quote());
  assert.equal(r.status, 503);
  assert.equal(state.table("quote_requests").length, 0);
});

Deno.test("S03: prepare issues one signed upload per file, on server-chosen paths", async () => {
  resetAll();
  const r = await call({
    action: "prepare",
    files: { photos: [{ type: "image/jpeg", size: 1000 }, { type: "image/heic", size: 2000 }], video: { type: "video/mp4", size: 5000 } },
  });
  assert.equal(r.status, 200);
  assert.equal(r.json.uploads.length, 3);
  const id = r.json.quote_id;
  assert.deepEqual(r.json.uploads.map((u: any) => u.path), [`${id}/photo-0.jpg`, `${id}/photo-1.heic`, `${id}/video.mp4`]);
  assert.ok(r.json.uploads.every((u: any) => u.token));
  assert.equal(state.table("quote_requests").length, 0, "nothing is stored until the quote is submitted");
});

Deno.test("S03: prepare refuses wrong types, too many files and oversized files", async () => {
  resetAll();
  const p = (files: unknown) => call({ action: "prepare", files });
  assert.equal((await p({ photos: [{ type: "application/x-msdownload", size: 10 }] })).json.error, "unsupported_file_type");
  assert.equal((await p({ photos: Array(7).fill({ type: "image/png", size: 10 }) })).json.error, "too_many_photos");
  assert.equal((await p({ photos: [{ type: "image/png", size: 11 * 1024 * 1024 }] })).json.error, "file_too_large");
  assert.equal((await p({ video: { type: "video/mp4", size: 51 * 1024 * 1024 } })).json.error, "file_too_large");
  assert.equal((await p({})).json.error, "no_files");
  assert.equal(state.signed.length, 0, "no upload permission was issued for any refused request");
});

Deno.test("S03: the visitor's own file name never reaches a storage path", async () => {
  resetAll();
  const r = await call({ action: "prepare", files: { photos: [{ type: "image/png", size: 10, name: "../../etc/passwd" }] } });
  assert.match(r.json.uploads[0].path, /^[0-9a-f-]{36}\/photo-0\.png$/);
});

Deno.test("S03: prepare is limited per visitor", async () => {
  resetAll();
  const files = { photos: [{ type: "image/png", size: 10 }] };
  const out: number[] = [];
  for (let i = 0; i < 8; i++) out.push((await call({ action: "prepare", files })).status);
  assert.deepEqual(out, [200, 200, 200, 200, 200, 200, 429, 429]);
});

Deno.test("S03: submit keeps only uploads that exist and fit; strays and oversized files are deleted", async () => {
  resetAll();
  state.storageObjects[QID] = [
    { name: "photo-0.jpg", metadata: { size: 1000 } },
    { name: "photo-1.png", metadata: { size: 11 * 1024 * 1024 } },     // over the 10 MB photo limit
    { name: "stray.bin", metadata: { size: 5 } },                       // never claimed
  ];
  const r = await call(quote({
    quote_id: QID,
    photo_paths: [`${QID}/photo-0.jpg`, `${QID}/photo-1.png`, `${QID}/photo-2.webp`],   // third never uploaded
  }));
  assert.equal(r.status, 200);
  assert.equal(r.json.uploads_missing, 2);
  assert.deepEqual(state.table("quote_requests")[0].photo_paths, [`${QID}/photo-0.jpg`]);
  assert.deepEqual([...state.removed].sort(), [`${QID}/photo-1.png`, `${QID}/stray.bin`].sort());
});

Deno.test("S03: paths that belong to another quote, or that traverse folders, are refused", async () => {
  resetAll();
  const other = "99999999-2222-4333-8444-555555555555";
  assert.equal((await call(quote({ quote_id: QID, photo_paths: [`${other}/photo-0.jpg`] }))).json.error, "invalid_files");
  assert.equal((await call(quote({ quote_id: QID, photo_paths: [`${QID}/../x/photo-0.jpg`] }))).json.error, "invalid_files");
  assert.equal((await call(quote({ quote_id: QID, video_path: `${QID}/video.exe` }))).json.error, "invalid_files");
  assert.equal(state.table("quote_requests").length, 0);
});

Deno.test("the same quote id submitted twice is saved once and answered ok (double click / retry)", async () => {
  resetAll();
  const first = await call(quote({ quote_id: QID }));
  const second = await call(quote({ quote_id: QID }));
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(second.json.quote_id, QID);
  assert.equal(state.table("quote_requests").length, 1);
});

Deno.test("purge_orphans: needs the service key, removes old unowned uploads only", async () => {
  resetAll();
  const OLD_ORPHAN = "aaaaaaaa-2222-4333-8444-555555555555";
  const OLD_OWNED = "bbbbbbbb-2222-4333-8444-555555555555";
  const RECENT = "cccccccc-2222-4333-8444-555555555555";
  const old = new Date(Date.now() - 30 * 3600 * 1000).toISOString();
  state.storageObjects[""] = [OLD_ORPHAN, OLD_OWNED, RECENT].map((name) => ({ name, metadata: { size: 0 } }));
  state.storageObjects[OLD_ORPHAN] = [{ name: "photo-0.jpg", created_at: old, metadata: { size: 1 } }];
  state.storageObjects[OLD_OWNED] = [{ name: "photo-0.jpg", created_at: old, metadata: { size: 1 } }];
  state.storageObjects[RECENT] = [{ name: "photo-0.jpg", created_at: new Date().toISOString(), metadata: { size: 1 } }];
  state.table("quote_requests").push({ id: OLD_OWNED });

  assert.equal((await call({ action: "purge_orphans" })).status, 401);
  assert.equal((await call({ action: "purge_orphans" }, { Authorization: "Bearer wrong" })).status, 401);
  const r = await call({ action: "purge_orphans" }, { Authorization: "Bearer service-role-key" });
  assert.equal(r.status, 200);
  assert.deepEqual(state.removed, [`${OLD_ORPHAN}/photo-0.jpg`]);
});
