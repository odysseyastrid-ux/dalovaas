// Checks the translations: keys used in the HTML that don't exist, keys with
// no French, and French strings that slipped into "tu" on the customer side
// (the site addresses clients with "vous"; careers/admin may use "tu").
//   node tools/i18n-check.mjs
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {}, document: { documentElement: {}, addEventListener() {}, querySelectorAll() { return []; }, readyState: 'loading' },
  localStorage: { getItem() { return null; }, setItem() {} }, sessionStorage: { getItem() { return null; } },
  navigator: { language: 'en' }, location: { search: '', pathname: '/' }, URLSearchParams, console };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/i18n-content.js'), 'utf8').replace(/^const /m, 'var '), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/i18n.js'), 'utf8')
  .replace('window.MagicstickI18N = { t,', 'window.__S = STRINGS; window.MagicstickI18N = { t,'), ctx);
const S = ctx.__S;
const has = (k) => Boolean(S[k]) || k.startsWith('c.') || k.startsWith('title.');
const missing = new Set();
for (const f of fs.readdirSync(root).filter((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root, f), 'utf8');
  for (const m of html.matchAll(/data-i18n(?:-html|-placeholder|-aria-label|-href|-title)?="([^"]+)"/g)) if (!has(m[1])) missing.add(`${m[1]} (${f})`);
}
const noFr = Object.entries(S).filter(([, v]) => v && v.en && !v.fr).map(([k]) => k);
// Unicode-aware word edges (\b treats « ê » as a boundary, so « êtes » looked like « tes »).
const TU = /(?<![\p{L}’'])(tu|ton|ta|tes|toi|Tu|Ton|Ta|Tes)(?![\p{L}])|(?<![\p{L}])t’/u;
const tu = Object.entries(S).filter(([k, v]) => v && v.fr && !/^(admin|careers)\./.test(k) && TU.test(v.fr)).map(([k]) => k);
console.log('Keys used in HTML but missing:', missing.size ? [...missing] : 'none');
console.log('Keys without French:', noFr.length ? noFr : 'none');
console.log('Customer-facing French in "tu":', tu.length ? tu : 'none');
