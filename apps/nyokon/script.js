// nyøkøn storefront — replace PRODUCTS with real inventory (and swap
// placeholder-img blocks for real <img> tags) when you have product photos.
// Product prices below are stored in USD and converted at render time.

const SIZES_APPAREL = ['S','M','L','XL'];
const SIZES_KIDS = ['4-5Y','6-7Y','8-9Y','10-11Y'];
const SIZES_SHOES = ['40','41','42','43','44','45'];

const PRODUCTS = [
  // Men
  { id:'m1', price:168, was:null, category:'men', tag:'new', sizes:SIZES_APPAREL,
    name:{en:'Flight Bomber Jacket', fr:'Blouson Bomber'}, sub:{en:'Navy', fr:'Marine'} },
  { id:'m2', price:98,  was:null, category:'men', tag:'new', sizes:SIZES_APPAREL,
    name:{en:'Oversized Hoodie', fr:'Hoodie Oversize'}, sub:{en:'Off-Black', fr:'Noir Anthracite'} },
  { id:'m3', price:110, was:130,  category:'men', tag:'sale', sizes:SIZES_APPAREL,
    name:{en:'Cargo Pant', fr:'Pantalon Cargo'}, sub:{en:'Charcoal', fr:'Anthracite'} },
  { id:'m4', price:145, was:null, category:'men', tag:null, sizes:SIZES_APPAREL,
    name:{en:'Denim Jacket', fr:'Veste en Jean'}, sub:{en:'Washed Blue', fr:'Bleu Délavé'} },

  // Women
  { id:'w1', price:128, was:null, category:'women', tag:'new', sizes:SIZES_APPAREL,
    name:{en:'Cropped Puffer Vest', fr:'Doudoune Crop Sans Manches'}, sub:{en:'Black', fr:'Noir'} },
  { id:'w2', price:118, was:null, category:'women', tag:null, sizes:SIZES_APPAREL,
    name:{en:'Wide Leg Trouser', fr:'Pantalon Large'}, sub:{en:'Sand', fr:'Sable'} },
  { id:'w3', price:96,  was:null, category:'women', tag:'new', sizes:SIZES_APPAREL,
    name:{en:'Pleated Midi Skirt', fr:'Jupe Midi Plissée'}, sub:{en:'Ivory', fr:'Ivoire'} },
  { id:'w4', price:38,  was:null, category:'women', tag:null, sizes:SIZES_APPAREL,
    name:{en:'Ribbed Tank Top', fr:'Débardeur Côtelé'}, sub:{en:'White', fr:'Blanc'} },

  // Kids
  { id:'k1', price:58, was:null, category:'kids', tag:'new', sizes:SIZES_KIDS,
    name:{en:'Kids Logo Hoodie', fr:'Hoodie Logo Enfant'}, sub:{en:'Grey Marl', fr:'Gris Chiné'} },
  { id:'k2', price:52, was:null, category:'kids', tag:null, sizes:SIZES_KIDS,
    name:{en:'Kids Cargo Pant', fr:'Pantalon Cargo Enfant'}, sub:{en:'Khaki', fr:'Kaki'} },
  { id:'k3', price:64, was:null, category:'kids', tag:'new', sizes:SIZES_KIDS,
    name:{en:'Kids Windbreaker', fr:'Coupe-Vent Enfant'}, sub:{en:'Red', fr:'Rouge'} },

  // Shoes
  { id:'s1', price:145, was:null, category:'shoes', tag:'new', sizes:SIZES_SHOES,
    name:{en:'Chunky Trainer', fr:'Sneaker Chunky'}, sub:{en:'White / Black', fr:'Blanc / Noir'} },
  { id:'s2', price:110, was:null, category:'shoes', tag:null, sizes:SIZES_SHOES,
    name:{en:'Low-Top Sneaker', fr:'Sneaker Basse'}, sub:{en:'Triple White', fr:'Tout Blanc'} },
  { id:'s3', price:158, was:185,  category:'shoes', tag:'sale', sizes:SIZES_SHOES,
    name:{en:'Combat Boot', fr:'Rangers'}, sub:{en:'Black Leather', fr:'Cuir Noir'} },

  // Bags
  { id:'b1', price:64,  was:null, category:'bags', tag:null,
    name:{en:'Crossbody Bag', fr:'Sacoche Bandoulière'}, sub:{en:'Black Nylon', fr:'Nylon Noir'} },
  { id:'b2', price:48,  was:null, category:'bags', tag:'new',
    name:{en:'Canvas Tote Bag', fr:'Tote Bag en Toile'}, sub:{en:'Natural', fr:'Écru'} },
  { id:'b3', price:135, was:null, category:'bags', tag:'new',
    name:{en:'Weekend Duffel', fr:'Sac Week-end'}, sub:{en:'Olive', fr:'Olive'} },

  // Accessories
  { id:'a1', price:32, was:null, category:'accessories', tag:null,
    name:{en:'Beanie', fr:'Bonnet'}, sub:{en:'Black', fr:'Noir'} },
  { id:'a2', price:34, was:null, category:'accessories', tag:null,
    name:{en:'Snapback Cap', fr:'Casquette Snapback'}, sub:{en:'Black', fr:'Noir'} },
  { id:'a3', price:42, was:null, category:'accessories', tag:'new',
    name:{en:'Reversible Belt', fr:'Ceinture Réversible'}, sub:{en:'Black / Brown', fr:'Noir / Marron'} },

  // Fragrance
  { id:'f1', price:78,  was:null, category:'fragrance', tag:'new',
    name:{en:'Eau de Parfum 50ml', fr:'Eau de Parfum 50ml'}, sub:{en:'Signature Scent', fr:'Fragrance Signature'} },
  { id:'f2', price:110, was:null, category:'fragrance', tag:null,
    name:{en:'Eau de Parfum 100ml', fr:'Eau de Parfum 100ml'}, sub:{en:'Signature Scent', fr:'Fragrance Signature'} },
  { id:'f3', price:28,  was:null, category:'fragrance', tag:null,
    name:{en:'Travel Spray 15ml', fr:'Vaporisateur Nomade 15ml'}, sub:{en:'Signature Scent', fr:'Fragrance Signature'} },
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

// UI translations. English and French copy for every static string on the
// page; keys match the data-i18n / data-i18n-placeholder / data-i18n-aria
// attributes in index.html.
const TRANSLATIONS = {
  en: {
    announce:'FREE SHIPPING ON ORDERS $150+  •  NEW DROP EVERY MONTH  •  MADE TO ORDER',
    nav_men:'MEN', nav_women:'WOMEN', nav_kids:'KIDS', nav_shop:'SHOP', nav_lookbook:'LOOKBOOK', nav_about:'ABOUT', nav_contact:'CONTACT',
    hero_eyebrow:'FALL COLLECTION', hero_title_1:'BUILT', hero_title_2:'DIFFERENT', hero_cta:'SHOP THE DROP',
    marquee_1:'CUSTOM STREETWEAR', marquee_2:'MADE TO ORDER', marquee_3:'LIMITED RUNS',
    shop_title:'THE COLLECTION', search_placeholder:'SEARCH', no_results:'No products match your search.',
    filter_all:'ALL', filter_men:'MEN', filter_women:'WOMEN', filter_kids:'KIDS',
    filter_shoes:'SHOES', filter_bags:'BAGS', filter_accessories:'ACCESSORIES', filter_fragrance:'FRAGRANCE',
    quick_add:'QUICK ADD', tag_new:'NEW', tag_sale:'SALE', sizes_label:'Sizes',
    editorial_eyebrow:'THE STORY', editorial_title:'NOT OFF THE RACK.',
    editorial_text:"nyøkøn started as one-off pieces made for friends. Every drop is small-batch, cut and finished by hand, built for people who want something that doesn't look like everyone else's closet. This is where you swap in your real brand copy — origin story, materials, what makes a nyøkøn piece different.",
    editorial_cta:'OUR STORY',
    lookbook_title:'LOOKBOOK',
    newsletter_title:'GET FIRST ACCESS', newsletter_text:'Sign up for early access to new drops and restocks.',
    newsletter_placeholder:'EMAIL ADDRESS', newsletter_btn:'JOIN', newsletter_note:"You're on the list.",
    footer_tagline:'Custom streetwear. Made to order.',
    footer_shop_h:'SHOP', footer_shop_all:'All Products', footer_shop_new:'New Arrivals', footer_shop_best:'Best Sellers',
    footer_support_h:'SUPPORT', footer_shipping:'Shipping', footer_returns:'Returns', footer_size:'Size Guide', footer_contact:'Contact',
    footer_follow_h:'FOLLOW',
    footer_rights:'All rights reserved.', footer_note:'Placeholder storefront — replace product images, copy, and links.',
    cart_title:'YOUR CART', cart_empty:'Your cart is empty.', cart_subtotal:'SUBTOTAL', cart_checkout:'CHECKOUT',
    aria_menu:'Menu', aria_currency:'Currency', aria_theme:'Toggle light/dark theme',
    aria_search:'Search', aria_account:'Account', aria_cart:'Cart', aria_cart_close:'Close cart',
  },
  fr: {
    announce:'LIVRAISON GRATUITE DÈS 150$  •  NOUVEAU DROP CHAQUE MOIS  •  FAIT SUR COMMANDE',
    nav_men:'HOMME', nav_women:'FEMME', nav_kids:'ENFANT', nav_shop:'BOUTIQUE', nav_lookbook:'LOOKBOOK', nav_about:'À PROPOS', nav_contact:'CONTACT',
    hero_eyebrow:'COLLECTION AUTOMNE', hero_title_1:'CONSTRUIT', hero_title_2:'AUTREMENT', hero_cta:'VOIR LE DROP',
    marquee_1:'STREETWEAR SUR MESURE', marquee_2:'FAIT SUR COMMANDE', marquee_3:'SÉRIES LIMITÉES',
    shop_title:'LA COLLECTION', search_placeholder:'RECHERCHER', no_results:'Aucun produit ne correspond à ta recherche.',
    filter_all:'TOUT', filter_men:'HOMME', filter_women:'FEMME', filter_kids:'ENFANT',
    filter_shoes:'CHAUSSURES', filter_bags:'SACS', filter_accessories:'ACCESSOIRES', filter_fragrance:'PARFUMS',
    quick_add:'AJOUT RAPIDE', tag_new:'NOUVEAU', tag_sale:'SOLDE', sizes_label:'Tailles',
    editorial_eyebrow:"L'HISTOIRE", editorial_title:'PAS DU PRÊT-À-PORTER.',
    editorial_text:"nyøkøn a commencé avec des pièces uniques faites pour des amis. Chaque drop est produit en petite série, coupé et fini à la main, pensé pour ceux qui ne veulent pas ressembler à tout le monde. C'est ici que tu remplaces ce texte par ton vrai discours de marque — l'histoire d'origine, les matières, ce qui rend une pièce nyøkøn différente.",
    editorial_cta:'NOTRE HISTOIRE',
    lookbook_title:'LOOKBOOK',
    newsletter_title:'SOIS LE PREMIER INFORMÉ', newsletter_text:'Inscris-toi pour un accès anticipé aux nouveaux drops et réassorts.',
    newsletter_placeholder:'ADRESSE E-MAIL', newsletter_btn:'REJOINDRE', newsletter_note:'Tu es sur la liste.',
    footer_tagline:'Streetwear sur mesure. Fait sur commande.',
    footer_shop_h:'BOUTIQUE', footer_shop_all:'Tous les produits', footer_shop_new:'Nouveautés', footer_shop_best:'Meilleures ventes',
    footer_support_h:'ASSISTANCE', footer_shipping:'Livraison', footer_returns:'Retours', footer_size:'Guide des tailles', footer_contact:'Contact',
    footer_follow_h:'SUIVRE',
    footer_rights:'Tous droits réservés.', footer_note:'Boutique de démonstration — remplace les images produits, les textes et les liens.',
    cart_title:'TON PANIER', cart_empty:'Ton panier est vide.', cart_subtotal:'SOUS-TOTAL', cart_checkout:'COMMANDER',
    aria_menu:'Menu', aria_currency:'Devise', aria_theme:'Basculer thème clair/sombre',
    aria_search:'Recherche', aria_account:'Compte', aria_cart:'Panier', aria_cart_close:'Fermer le panier',
  },
};
const DEFAULT_LANG = navigator.language && navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';

function loadLang(){
  try {
    const saved = localStorage.getItem('nyokon-lang');
    if (saved === 'en' || saved === 'fr') return saved;
  } catch (e) { /* localStorage unavailable */ }
  return DEFAULT_LANG;
}

let currentLang = loadLang();

function t(key){
  return TRANSLATIONS[currentLang][key] ?? TRANSLATIONS.en[key] ?? key;
}

function applyStaticTranslations(){
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.querySelectorAll('.lang-switch button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
}

const grid = document.getElementById('productGrid');
const noResultsEl = document.getElementById('noResults');
const cart = new Map();

function money(usd){
  const c = CURRENCIES.find(c => c.code === currentCurrency) || CURRENCIES[0];
  const amount = usd * c.rate;
  return new Intl.NumberFormat(c.locale, { style:'currency', currency:c.code, maximumFractionDigits:0 }).format(amount);
}

function loadCurrency(){
  try {
    const saved = localStorage.getItem('nyokon-currency');
    if (saved && CURRENCIES.some(c => c.code === saved)) return saved;
  } catch (e) { /* localStorage unavailable */ }
  return DEFAULT_CURRENCY;
}

let currentCurrency = loadCurrency();
let currentFilter = 'all';
let searchQuery = '';

function renderProducts(filter=currentFilter){
  currentFilter = filter;
  grid.innerHTML = '';
  let list = filter === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === filter);
  if (searchQuery){
    const q = searchQuery.toLowerCase();
    list = list.filter(p => (p.name[currentLang] || p.name.en).toLowerCase().includes(q));
  }
  noResultsEl.hidden = list.length > 0;
  for (const p of list){
    const name = p.name[currentLang] || p.name.en;
    const sub = p.sub[currentLang] || p.sub.en;
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-media">
        ${p.tag ? `<span class="product-tag">${t('tag_' + p.tag)}</span>` : ''}
        <div class="placeholder-img primary" data-placeholder="${name.toUpperCase()}"></div>
        <div class="placeholder-img secondary" data-placeholder="${name.toUpperCase()} — ALT"></div>
        <button class="quick-add" data-id="${p.id}">${t('quick_add')} — ${money(p.price)}</button>
      </div>
      <div class="product-info">
        <div>
          <div class="product-name">${name}</div>
          <div class="product-sub">${sub}</div>
          ${p.sizes ? `<div class="product-sizes">${t('sizes_label')}: ${p.sizes.join(' · ')}</div>` : ''}
        </div>
        <div class="product-price">
          ${p.was ? `<span class="was">${money(p.was)}</span>` : ''}${money(p.price)}
        </div>
      </div>
    `;
    grid.appendChild(card);
  }
}

function refreshFilterLabels(){
  document.querySelectorAll('.filter').forEach(btn => {
    const key = 'filter_' + btn.dataset.filter;
    if (TRANSLATIONS.en[key]) btn.textContent = t(key);
  });
}

function setActiveFilter(filter){
  document.querySelectorAll('.filter').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
  renderProducts(filter);
}

document.querySelectorAll('.filter').forEach(btn => {
  btn.addEventListener('click', () => setActiveFilter(btn.dataset.filter));
});

// Category links in the nav (Men/Women/Kids/Shop) jump to the shop
// section and pre-select the matching filter pill.
document.querySelectorAll('[data-filter]').forEach(link => {
  if (link.classList.contains('filter')) return; // pills handled above
  link.addEventListener('click', () => setActiveFilter(link.dataset.filter));
});

// Search
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  renderProducts();
});
document.querySelector('a[data-i18n-aria="aria_search"]').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('shop').scrollIntoView({ behavior:'smooth' });
  searchInput.focus();
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
    cartItemsEl.innerHTML = `<p>${t('cart_empty')}</p>`;
  } else {
    cartItemsEl.innerHTML = [...cart.values()].map(item => `
      <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--line);">
        <span>${item.name[currentLang] || item.name.en} × ${item.qty}</span>
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
  try { return localStorage.getItem('nyokon-theme'); } catch (e) { return null; }
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
  try { localStorage.setItem('nyokon-theme', currentTheme); } catch (e) { /* localStorage unavailable */ }
  syncThemeToggle();
});

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!currentTheme) syncThemeToggle();
  });
}

// Currency
const currencySelects = document.querySelectorAll('.currency-select');
currencySelects.forEach(sel => { sel.value = currentCurrency; });
currencySelects.forEach(sel => {
  sel.addEventListener('change', () => {
    currentCurrency = sel.value;
    currencySelects.forEach(other => { if (other !== sel) other.value = currentCurrency; });
    try { localStorage.setItem('nyokon-currency', currentCurrency); } catch (e) { /* localStorage unavailable */ }
    renderProducts();
    renderCart();
  });
});

// Language
document.querySelectorAll('.lang-switch button').forEach(btn => {
  btn.addEventListener('click', () => {
    currentLang = btn.dataset.lang;
    try { localStorage.setItem('nyokon-lang', currentLang); } catch (e) { /* localStorage unavailable */ }
    applyStaticTranslations();
    refreshFilterLabels();
    renderProducts();
    renderCart();
  });
});

// Newsletter (demo only — wire up to real email provider)
document.getElementById('newsletterForm').addEventListener('submit', (e) => {
  e.preventDefault();
  document.getElementById('newsletterNote').textContent = t('newsletter_note');
  e.target.reset();
});

// Initial render
applyStaticTranslations();
refreshFilterLabels();
renderProducts();
document.getElementById('year').textContent = new Date().getFullYear();
