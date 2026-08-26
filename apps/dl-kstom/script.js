// DL KSTOM storefront — replace PRODUCTS with real inventory (and swap
// placeholder-img blocks for real <img> tags) when you have product photos.
// Product prices below are stored in USD and converted at render time.

const PRODUCTS = [
  { id:'p1', name:'Oversized Hoodie', sub:'Off-Black', price:98, was:null, category:'tops', tag:'NEW' },
  { id:'p2', name:'Boxy Tee', sub:'Vintage White', price:42, was:null, category:'tops', tag:null },
  { id:'p3', name:'Cargo Pant', sub:'Charcoal', price:110, was:130, category:'bottoms', tag:'SALE' },
  { id:'p4', name:'Track Jacket', sub:'Bone', price:135, was:null, category:'tops', tag:null },
  { id:'p5', name:'Denim Short', sub:'Washed Indigo', price:78, was:null, category:'bottoms', tag:null },
  { id:'p6', name:'Beanie', sub:'Black', price:32, was:null, category:'accessories', tag:null },
  { id:'p7', name:'Wide Leg Trouser', sub:'Sand', price:118, was:null, category:'bottoms', tag:'NEW' },
  { id:'p8', name:'Crossbody Bag', sub:'Black Nylon', price:64, was:null, category:'accessories', tag:null },
];

// Static, illustrative FX rates (USD -> currency). Wire these to a live
// rates API (e.g. exchangerate.host) before taking real payments.
const CURRENCIES = [
  { code:'XOF', rate:600,  locale:'fr-SN' },
  { code:'USD', rate:1,    locale:'en-US' },
  { code:'EUR', rate:0.92, locale:'de-DE' },
  { code:'GBP', rate:0.79, locale:'en-GB' },
  { code:'CAD', rate:1.37, locale:'en-CA' },
  { code:'NGN', rate:1550, locale:'en-NG' },
  { code:'GHS', rate:15.5, locale:'en-GH' },
  { code:'ZAR', rate:18.5, locale:'en-ZA' },
];
const DEFAULT_CURRENCY = 'XOF';

function loadCurrency(){
  try {
    const saved = localStorage.getItem('dlkstom-currency');
    if (saved && CURRENCIES.some(c => c.code === saved)) return saved;
  } catch (e) { /* localStorage unavailable */ }
  return DEFAULT_CURRENCY;
}

let currentCurrency = loadCurrency();

const grid = document.getElementById('productGrid');
const cart = new Map();

function money(usd){
  const c = CURRENCIES.find(c => c.code === currentCurrency) || CURRENCIES[0];
  const amount = usd * c.rate;
  return new Intl.NumberFormat(c.locale, { style:'currency', currency:c.code, maximumFractionDigits:0 }).format(amount);
}

let currentFilter = 'all';

function renderProducts(filter=currentFilter){
  currentFilter = filter;
  grid.innerHTML = '';
  const list = filter === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === filter);
  for (const p of list){
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-media">
        ${p.tag ? `<span class="product-tag">${p.tag}</span>` : ''}
        <div class="placeholder-img primary" data-placeholder="${p.name.toUpperCase()}"></div>
        <div class="placeholder-img secondary" data-placeholder="${p.name.toUpperCase()} — ALT"></div>
        <button class="quick-add" data-id="${p.id}">QUICK ADD — ${money(p.price)}</button>
      </div>
      <div class="product-info">
        <div>
          <div class="product-name">${p.name}</div>
          <div class="product-sub">${p.sub}</div>
        </div>
        <div class="product-price">
          ${p.was ? `<span class="was">${money(p.was)}</span>` : ''}${money(p.price)}
        </div>
      </div>
    `;
    grid.appendChild(card);
  }
}
renderProducts();

document.querySelectorAll('.filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderProducts(btn.dataset.filter);
  });
});

// Mobile menu
const navToggle = document.getElementById('navToggle');
const mobileMenu = document.getElementById('mobileMenu');
navToggle.addEventListener('click', () => mobileMenu.classList.toggle('open'));
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

// Cart
const cartDrawer = document.getElementById('cartDrawer');
const cartScrim = document.getElementById('cartScrim');
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const cartCountEl = document.querySelector('.cart-count');

function openCart(){ cartDrawer.classList.add('open'); cartScrim.classList.add('open'); }
function closeCart(){ cartDrawer.classList.remove('open'); cartScrim.classList.remove('open'); }

document.querySelector('.cart-link').addEventListener('click', (e) => { e.preventDefault(); openCart(); });
document.getElementById('cartClose').addEventListener('click', closeCart);
cartScrim.addEventListener('click', closeCart);

function renderCart(){
  if (cart.size === 0){
    cartItemsEl.innerHTML = '<p>Your cart is empty.</p>';
  } else {
    cartItemsEl.innerHTML = [...cart.values()].map(item => `
      <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--line);">
        <span>${item.name} × ${item.qty}</span>
        <span>${money(item.price * item.qty)}</span>
      </div>
    `).join('');
  }
  const total = [...cart.values()].reduce((sum, i) => sum + i.price * i.qty, 0);
  cartTotalEl.textContent = money(total);
  const count = [...cart.values()].reduce((sum, i) => sum + i.qty, 0);
  cartCountEl.textContent = count;
}

grid.addEventListener('click', (e) => {
  const btn = e.target.closest('.quick-add');
  if (!btn) return;
  const product = PRODUCTS.find(p => p.id === btn.dataset.id);
  if (!product) return;
  const existing = cart.get(product.id);
  if (existing) existing.qty += 1;
  else cart.set(product.id, { ...product, qty: 1 });
  renderCart();
  openCart();
});

// Theme (light/dark)
function loadTheme(){
  try { return localStorage.getItem('dlkstom-theme'); } catch (e) { return null; }
}
function systemPrefersDark(){
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function applyTheme(theme){
  if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
  else document.documentElement.removeAttribute('data-theme');
}

let currentTheme = loadTheme();
applyTheme(currentTheme);

const themeToggle = document.getElementById('themeToggle');
function syncThemeToggle(){
  const isDark = currentTheme === 'dark' || (!currentTheme && systemPrefersDark());
  themeToggle.classList.toggle('is-dark', isDark);
}
syncThemeToggle();

themeToggle.addEventListener('click', () => {
  const isDark = currentTheme === 'dark' || (!currentTheme && systemPrefersDark());
  currentTheme = isDark ? 'light' : 'dark';
  applyTheme(currentTheme);
  try { localStorage.setItem('dlkstom-theme', currentTheme); } catch (e) { /* localStorage unavailable */ }
  syncThemeToggle();
});

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!currentTheme) syncThemeToggle();
  });
}

// Currency
const currencySelect = document.getElementById('currencySelect');
currencySelect.value = currentCurrency;
currencySelect.addEventListener('change', () => {
  currentCurrency = currencySelect.value;
  try { localStorage.setItem('dlkstom-currency', currentCurrency); } catch (e) { /* localStorage unavailable */ }
  renderProducts();
  renderCart();
});

// Newsletter (demo only — wire up to real email provider)
document.getElementById('newsletterForm').addEventListener('submit', (e) => {
  e.preventDefault();
  document.getElementById('newsletterNote').textContent = "You're on the list.";
  e.target.reset();
});

document.getElementById('year').textContent = new Date().getFullYear();
