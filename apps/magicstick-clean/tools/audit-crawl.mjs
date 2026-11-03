// Visits every page of the LIVE site (or BASE=...) on phone, tablet and
// desktop, in English and French, and reports JavaScript errors, failed
// requests, horizontal scrolling, broken internal links and SEO basics.
// Needs Playwright with Chromium:  npm i -D playwright && npx playwright install chromium
//   node tools/audit-crawl.mjs                 (whole site)
//   PAGES=index.html,quote.html node tools/audit-crawl.mjs
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || 'https://magicstickclean.ca';
const pages = process.env.PAGES ? process.env.PAGES.split(',') : fs.readdirSync(root).filter((f) => f.endsWith('.html') && !f.startsWith('google')).sort();
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const problems = []; const links = new Map();
for (const pg of pages) for (const w of [390, 820, 1366]) for (const lang of ['en', 'fr']) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 500, hasTouch: w < 900 });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { sessionStorage.setItem('magicstick_splash_seen', '1'); } catch (e) {} });
  const where = `${pg} @${w}px ${lang}`;
  p.on('pageerror', (e) => problems.push(`JS error  ${where}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') problems.push(`console   ${where}: ${m.text().slice(0, 160)}`); });
  p.on('response', (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}  ${where}: ${r.url()}`); });
  await p.goto(`${BASE}/${pg}?lang=${lang}`, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => problems.push(`load      ${where}: ${e.message}`));
  const info = await p.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    h1: document.querySelectorAll('h1').length,
    title: document.title, desc: document.querySelector('meta[name=description]')?.content || '',
    links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
  })).catch(() => null);
  if (info) {
    if (info.overflow) problems.push(`overflow  ${where}`);
    if (w === 1366 && info.h1 !== 1) problems.push(`h1=${info.h1}     ${where}`);
    if (w === 1366 && !info.desc && !/account|admin/.test(pg)) problems.push(`no meta description  ${where}`);
    for (const l of info.links) { if (!links.has(l)) links.set(l, pg); }
  }
  await ctx.close();
}
await browser.close();
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const routed = new Set([...(vercel.redirects || []), ...(vercel.rewrites || [])].map((r) => r.source.replace(/^\//, '')));
for (const [href, pg] of links) {
  if (/^(https?:|mailto:|tel:|sms:|javascript:)/.test(href) && !href.includes('magicstickclean.ca')) continue;
  const file = href.replace(/^https:\/\/(www\.)?magicstickclean\.ca\/?/, '').split('#')[0].split('?')[0];
  if (file && !fs.existsSync(path.join(root, file)) && !routed.has(file)) problems.push(`broken link "${href}" on ${pg}`);
}
console.log(problems.length ? problems.join('\n') : 'No problems found.');
