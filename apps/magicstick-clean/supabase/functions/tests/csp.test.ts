// The site's Content-Security-Policy runs scripts only from files, plus the
// inline scripts listed by hash. If you edit an inline <script> in a page (the
// theme snippet in every <head>, the splash gate in index.html), its hash
// changes: this test fails and prints the new value to put in vercel.json.
import assert from "node:assert/strict";

const site = new URL("../../../", import.meta.url);

async function sha256Base64(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

Deno.test("CSP: no 'unsafe-inline' for scripts, and every inline script is allowed by hash", async () => {
  const vercel = JSON.parse(await Deno.readTextFile(new URL("vercel.json", site)));
  const scriptSrcs: string[] = [];
  for (const rule of vercel.headers) {
    for (const h of rule.headers) {
      if (/^Content-Security-Policy/.test(h.key)) {
        const m = /script-src ([^;]*)/.exec(h.value);
        if (m) scriptSrcs.push(m[1]);
      }
    }
  }
  assert.ok(scriptSrcs.length >= 2);
  for (const src of scriptSrcs) assert.ok(!src.includes("'unsafe-inline'"), src);

  for await (const entry of Deno.readDir(site)) {
    if (!entry.isFile || !entry.name.endsWith(".html")) continue;
    const html = await Deno.readTextFile(new URL(entry.name, site));
    assert.ok(!/\son[a-z]+\s*=\s*["']/i.test(html), `${entry.name}: inline event handler (blocked by the CSP)`);
    assert.ok(!/href\s*=\s*["']javascript:/i.test(html), `${entry.name}: javascript: link (blocked by the CSP)`);
    for (const m of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/ld\+json/.test(m[1])) continue;
      const hash = `'sha256-${await sha256Base64(m[2])}'`;
      for (const src of scriptSrcs) assert.ok(src.includes(hash), `${entry.name}: add ${hash} to script-src in vercel.json`);
    }
  }
});
