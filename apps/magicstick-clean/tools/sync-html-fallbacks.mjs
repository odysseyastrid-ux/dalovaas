// Keeps the text written in the HTML pages equal to the English strings of
// js/i18n.js. Google and visitors without JavaScript read that HTML text, so
// after changing a string in i18n.js, run:
//   node tools/sync-html-fallbacks.mjs          (preview the differences)
//   node tools/sync-html-fallbacks.mjs --write  (apply them)
// Elements with nested markup are skipped (they are listed by tools/i18n-check.mjs).
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export function loadStrings() {
  const ctx = { window: {}, document: { documentElement: {}, addEventListener() {}, querySelectorAll() { return []; }, readyState: 'loading' },
    localStorage: { getItem() { return null; }, setItem() {} }, sessionStorage: { getItem() { return null; } },
    navigator: { language: 'en' }, location: { search: '', pathname: '/' }, URLSearchParams, console };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/i18n-content.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/i18n.js'), 'utf8')
    .replace('window.MagicstickI18N = { t,', 'window.__S = STRINGS; window.MagicstickI18N = { t,'), ctx);
  return ctx.__S;
}
const S = loadStrings();
const escText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const decode = (s) => s.replace(/&rsquo;/g, '’').replace(/&rarr;/g, '→').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
const write = process.argv[2] === '--write';
let changes = 0;
for (const f of fs.readdirSync(root).filter((f) => f.endsWith('.html'))) {
  const orig = fs.readFileSync(path.join(root, f), 'utf8');
  const html = orig.replace(/<([a-z0-9]+)(\b[^>]*?)\sdata-i18n(-html)?="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/g, (all, tag, a1, isHtml, key, a2, inner) => {
    const v = S[key]; if (!v || !v.en) return all;
    if (isHtml ? new RegExp('<' + tag + '[\\s>]').test(inner) : /<[a-z]/i.test(inner)) return all;
    if (decode(inner.trim()) === decode(v.en.trim())) return all;
    changes++;
    if (!write) console.log(`${f}  ${key}\n   - ${inner.trim().slice(0, 100)}\n   + ${v.en.slice(0, 100)}`);
    return isHtml ? `<${tag}${a1} data-i18n-html="${key}"${a2}>${v.en}</${tag}>` : `<${tag}${a1} data-i18n="${key}"${a2}>${escText(v.en)}</${tag}>`;
  });
  if (write && html !== orig) fs.writeFileSync(path.join(root, f), html);
}
console.log(write ? `updated ${changes} element(s)` : `${changes} difference(s)`);
