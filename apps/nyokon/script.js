// nyøkøn storefront. The real catalog lives in Supabase and is managed
// from staff.html; FALLBACK_PRODUCTS below is only what renders before
// that loads (or if it's unreachable). Prices are stored in USD and
// converted at render time.

// Staff-uploaded site images (hero/lookbook) — see staff.html. The anon
// key is safe to expose publicly; write access is gated by Supabase
// auth + RLS policies (see supabase-schema.sql), not by keeping this secret.
const SUPABASE_URL = 'https://ejbuwatgnvxsfmwewyfu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_A49q39M9BU_QkJGPR8fc-g_d4FAIMKW';
let _sbClient = null;
function getSb(){
  if (typeof supabase === 'undefined') return null;
  if (!_sbClient) _sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _sbClient;
}

const SIZES_APPAREL = ['S','M','L','XL'];
const SIZES_KIDS = ['4-5Y','6-7Y','8-9Y','10-11Y'];

// Shoe sizes are stored as the EU value; SHOE_SIZE_CHART gives the US
// and UK equivalents shown once a customer picks a size (approximate
// standard conversions — real per-brand sizing can vary slightly).
const SHOE_SIZE_CHART = {
  '39': { us:'6.5',  uk:'5.5' },
  '40': { us:'7',    uk:'6'   },
  '41': { us:'8',    uk:'7'   },
  '42': { us:'8.5',  uk:'7.5' },
  '43': { us:'9.5',  uk:'8.5' },
  '44': { us:'10.5', uk:'9.5' },
  '45': { us:'11',   uk:'10'  },
  '46': { us:'12',   uk:'11'  },
};
const SIZES_SHOES = Object.keys(SHOE_SIZE_CHART);

// Every product has a gender (men/women/kids/unisex — unisex shows
// under both Men and Women) and a type (clothing/shoes/bags/
// accessories/fragrance), so all subcategories nest inside Hommes/
// Femmes/Enfants instead of sitting as their own top-level tabs. Kids
// items also carry kidsGroup (girls/boys/unisex).
const FALLBACK_PRODUCTS = [
  // Men
  { id:'m1', price:168, was:null, gender:'men', type:'clothing', tag:'new', sizes:SIZES_APPAREL,
    name:{en:'Flight Bomber Jacket', fr:'Blouson Bomber'}, sub:{en:'Navy', fr:'Marine'} },
  { id:'m2', price:98,  was:null, gender:'men', type:'clothing', tag:'new', sizes:SIZES_APPAREL,
    name:{en:'Oversized Hoodie', fr:'Hoodie Oversize'}, sub:{en:'Off-Black', fr:'Noir Anthracite'} },
  { id:'m3', price:110, was:130,  gender:'men', type:'clothing', tag:'sale', sizes:SIZES_APPAREL,
    name:{en:'Cargo Pant', fr:'Pantalon Cargo'}, sub:{en:'Charcoal', fr:'Anthracite'} },
  { id:'m4', price:145, was:null, gender:'men', type:'clothing', tag:null, sizes:SIZES_APPAREL,
    name:{en:'Denim Jacket', fr:'Veste en Jean'}, sub:{en:'Washed Blue', fr:'Bleu Délavé'} },

  // Women
  { id:'w1', price:128, was:null, gender:'women', type:'clothing', tag:'new', sizes:SIZES_APPAREL,
    name:{en:'Cropped Puffer Vest', fr:'Doudoune Crop Sans Manches'}, sub:{en:'Black', fr:'Noir'} },
  { id:'w2', price:118, was:null, gender:'women', type:'clothing', tag:null, sizes:SIZES_APPAREL,
    name:{en:'Wide Leg Trouser', fr:'Pantalon Large'}, sub:{en:'Sand', fr:'Sable'} },
  { id:'w3', price:96,  was:null, gender:'women', type:'clothing', tag:'new', sizes:SIZES_APPAREL,
    name:{en:'Pleated Midi Skirt', fr:'Jupe Midi Plissée'}, sub:{en:'Ivory', fr:'Ivoire'} },
  { id:'w4', price:38,  was:null, gender:'women', type:'clothing', tag:null, sizes:SIZES_APPAREL,
    name:{en:'Ribbed Tank Top', fr:'Débardeur Côtelé'}, sub:{en:'White', fr:'Blanc'} },

  // Kids
  { id:'k1', price:58, was:null, gender:'kids', type:'clothing', kidsGroup:'unisex', tag:'new', sizes:SIZES_KIDS,
    name:{en:'Kids Logo Hoodie', fr:'Hoodie Logo Enfant'}, sub:{en:'Grey Marl', fr:'Gris Chiné'} },
  { id:'k2', price:52, was:null, gender:'kids', type:'clothing', kidsGroup:'unisex', tag:null, sizes:SIZES_KIDS,
    name:{en:'Kids Cargo Pant', fr:'Pantalon Cargo Enfant'}, sub:{en:'Khaki', fr:'Kaki'} },
  { id:'k3', price:64, was:null, gender:'kids', type:'clothing', kidsGroup:'unisex', tag:'new', sizes:SIZES_KIDS,
    name:{en:'Kids Windbreaker', fr:'Coupe-Vent Enfant'}, sub:{en:'Red', fr:'Rouge'} },

  // Shoes
  { id:'s1', price:145, was:null, gender:'unisex', type:'shoes', tag:'new', sizes:SIZES_SHOES,
    name:{en:'Chunky Trainer', fr:'Sneaker Chunky'}, sub:{en:'White / Black', fr:'Blanc / Noir'} },
  { id:'s2', price:110, was:null, gender:'unisex', type:'shoes', tag:null, sizes:SIZES_SHOES,
    name:{en:'Low-Top Sneaker', fr:'Sneaker Basse'}, sub:{en:'Triple White', fr:'Tout Blanc'} },
  { id:'s3', price:158, was:185,  gender:'unisex', type:'shoes', tag:'sale', sizes:SIZES_SHOES,
    name:{en:'Combat Boot', fr:'Rangers'}, sub:{en:'Black Leather', fr:'Cuir Noir'} },

  // Bags
  { id:'b1', price:64,  was:null, gender:'unisex', type:'bags', tag:null,
    name:{en:'Crossbody Bag', fr:'Sacoche Bandoulière'}, sub:{en:'Black Nylon', fr:'Nylon Noir'} },
  { id:'b2', price:48,  was:null, gender:'unisex', type:'bags', tag:'new',
    name:{en:'Canvas Tote Bag', fr:'Tote Bag en Toile'}, sub:{en:'Natural', fr:'Écru'} },
  { id:'b3', price:135, was:null, gender:'unisex', type:'bags', tag:'new',
    name:{en:'Weekend Duffel', fr:'Sac Week-end'}, sub:{en:'Olive', fr:'Olive'} },

  // Accessories
  { id:'a1', price:32, was:null, gender:'unisex', type:'accessories', tag:null,
    name:{en:'Beanie', fr:'Bonnet'}, sub:{en:'Black', fr:'Noir'} },
  { id:'a2', price:34, was:null, gender:'unisex', type:'accessories', tag:null,
    name:{en:'Snapback Cap', fr:'Casquette Snapback'}, sub:{en:'Black', fr:'Noir'} },
  { id:'a3', price:42, was:null, gender:'unisex', type:'accessories', tag:'new',
    name:{en:'Reversible Belt', fr:'Ceinture Réversible'}, sub:{en:'Black / Brown', fr:'Noir / Marron'} },

  // Fragrance
  { id:'f1', price:78,  was:null, gender:'unisex', type:'fragrance', tag:'new',
    name:{en:'Eau de Parfum 50ml', fr:'Eau de Parfum 50ml'}, sub:{en:'Signature Scent', fr:'Fragrance Signature'} },
  { id:'f2', price:110, was:null, gender:'unisex', type:'fragrance', tag:null,
    name:{en:'Eau de Parfum 100ml', fr:'Eau de Parfum 100ml'}, sub:{en:'Signature Scent', fr:'Fragrance Signature'} },
  { id:'f3', price:28,  was:null, gender:'unisex', type:'fragrance', tag:null,
    name:{en:'Travel Spray 15ml', fr:'Vaporisateur Nomade 15ml'}, sub:{en:'Signature Scent', fr:'Fragrance Signature'} },
];

// Live catalog. Starts from the fallback list above (so the site works
// even offline or before Supabase loads), then gets replaced by the
// real database catalog once it's fetched — see loadProductsFromSupabase()
// below. Staff manage the real catalog from staff.html.
let PRODUCTS = FALLBACK_PRODUCTS;

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
    announce:'FREE SHIPPING ON ORDERS 25,000 FCFA+  •  NEW DROP EVERY MONTH  •  MADE TO ORDER',
    nav_categories:'CATEGORIES', nav_shop:'SHOP ALL',
    settings_language:'LANGUAGE', settings_currency:'CURRENCY', settings_theme:'THEME', aria_settings:'Settings',
    intro_eyebrow:'STEP IN', intro_title:'NYØKØN', intro_tagline:'The collection starts here.', intro_hint:'SCROLL', intro_skip:'SKIP',
    hero_eyebrow:'DRY SEASON COLLECTION', hero_cta:'SHOP THE DROP',
    marquee_1:'CUSTOM STREETWEAR', marquee_2:'MADE TO ORDER', marquee_3:'LIMITED RUNS',
    shop_title:'THE COLLECTION', search_placeholder:'SEARCH', no_results:'No products match your search.',
    filter_all:'ALL', filter_men:'MEN', filter_women:'WOMEN', filter_kids:'KIDS',
    filter_clothing:'CLOTHING', filter_shoes:'SHOES', filter_bags:'BAGS',
    filter_accessories:'ACCESSORIES', filter_fragrance:'FRAGRANCE',
    filter_girls:'GIRLS', filter_boys:'BOYS',
    quick_add:'QUICK ADD', tag_new:'NEW', tag_sale:'SALE', tag_sold_out:'SOLD OUT', sizes_label:'Sizes',
    color_singular:'Colour', color_plural:'Colours',
    filter_favorites:'FAVOURITES', sort_label:'Sort', sort_featured:'FEATURED',
    sort_price_asc:'PRICE: LOW TO HIGH', sort_price_desc:'PRICE: HIGH TO LOW', sort_newest:'NEWEST',
    result_count_singular:'{n} product', result_count_plural:'{n} products',
    no_favorites:'You have not favourited any products yet.',
    quick_add_title:'QUICK ADD', quick_add_submit:'ADD TO CART',
    pdp_you_may_also_like:'YOU MAY ALSO LIKE', pdp_size_not_in_stock:'Size not in stock?',
    pdp_back:'BACK', pdp_add_to_cart:'ADD TO CART', pdp_added:'Added to cart',
    pdp_view_cart:'VIEW CART', pdp_not_found:'Product not found.',
    size_choose_error:'Please select a size.',
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
    aria_currency:'Currency', aria_theme:'Toggle light/dark theme',
    aria_search:'Search', aria_cart:'Cart', aria_cart_close:'Close cart',
    checkout_name_label:'FULL NAME', checkout_phone_label:'PHONE NUMBER',
    checkout_fulfillment_label:'FULFILLMENT', checkout_pickup:'Pickup', checkout_delivery:'Delivery',
    checkout_city_label:'CITY', checkout_city_placeholder:'Select your city', checkout_city_other:'Other city',
    checkout_address_label:'DELIVERY ADDRESS', checkout_address_placeholder:'Neighbourhood / landmark',
    checkout_payment_label:'PAYMENT METHOD',
    checkout_error_city:'Please select your city.',
    checkout_cash:'Cash on pickup', checkout_fidelity:'Loyalty points', checkout_receipt_label:'PAYMENT RECEIPT (SCREENSHOT)',
    checkout_card_unavailable:'Card payment isn’t available online yet — please contact us directly to pay by card.',
    checkout_fidelity_enter_phone:'Enter your phone number above to see your points balance.',
    checkout_fidelity_xof_only:'Paying with points is only available in FCFA (XOF) — change your currency in settings.',
    checkout_fidelity_balance:'You have {points} points ({value}) — enough to cover this order.',
    checkout_fidelity_insufficient:'You have {points} points ({value}) — not enough for this order. Choose another payment method.',
    checkout_fidelity_changed:'Your points balance changed since this page loaded. Please try again.',
    checkout_dial:'Dial to pay', checkout_copy:'Copy', checkout_copied:'Copied',
    checkout_submit:'PLACE ORDER', checkout_back:'Back to cart',
    checkout_error_fields:'Please fill in your name and phone number.',
    checkout_error_receipt:'Please attach a screenshot of your payment before submitting.',
    checkout_error_generic:'Something went wrong. Please try again.',
    checkout_error_stock:"Sorry, one of the sizes in your cart just sold out. Please review your cart and try again.",
    checkout_confirm_title:'Order received', checkout_confirm_note:'We will confirm your order and payment shortly.',
    checkout_continue:'CONTINUE SHOPPING', checkout_ref_prefix:'Order ',
  },
  fr: {
    announce:'LIVRAISON GRATUITE DÈS 25 000 FCFA  •  NOUVEAU DROP CHAQUE MOIS  •  FAIT SUR COMMANDE',
    nav_categories:'CATÉGORIES', nav_shop:'TOUT VOIR',
    settings_language:'LANGUE', settings_currency:'DEVISE', settings_theme:'THÈME', aria_settings:'Réglages',
    intro_eyebrow:'ENTREZ', intro_title:'NYØKØN', intro_tagline:'La collection commence ici.', intro_hint:'DÉFILER', intro_skip:'PASSER',
    hero_eyebrow:'COLLECTION SAISON SÈCHE', hero_cta:'VOIR LE DROP',
    marquee_1:'STREETWEAR SUR MESURE', marquee_2:'FAIT SUR COMMANDE', marquee_3:'SÉRIES LIMITÉES',
    shop_title:'LA COLLECTION', search_placeholder:'RECHERCHER', no_results:'Aucun produit ne correspond à ta recherche.',
    filter_all:'TOUT', filter_men:'HOMME', filter_women:'FEMME', filter_kids:'ENFANT',
    filter_clothing:'VÊTEMENTS', filter_shoes:'CHAUSSURES', filter_bags:'SACS',
    filter_accessories:'ACCESSOIRES', filter_fragrance:'PARFUMS',
    filter_girls:'FILLES', filter_boys:'GARÇONS',
    quick_add:'AJOUT RAPIDE', tag_new:'NOUVEAU', tag_sale:'SOLDE', tag_sold_out:'ÉPUISÉ', sizes_label:'Tailles',
    color_singular:'Couleur', color_plural:'Couleurs',
    filter_favorites:'FAVORIS', sort_label:'Trier', sort_featured:'RECOMMANDÉS',
    sort_price_asc:'PRIX CROISSANT', sort_price_desc:'PRIX DÉCROISSANT', sort_newest:'NOUVEAUTÉS',
    result_count_singular:'{n} produit', result_count_plural:'{n} produits',
    no_favorites:"Tu n'as encore ajouté aucun produit à tes favoris.",
    quick_add_title:'AJOUT RAPIDE', quick_add_submit:'AJOUTER AU PANIER',
    pdp_you_may_also_like:'VOUS AIMEREZ AUSSI', pdp_size_not_in_stock:'Taille indisponible ?',
    pdp_back:'RETOUR', pdp_add_to_cart:'AJOUTER AU PANIER', pdp_added:'Ajouté au panier',
    pdp_view_cart:'VOIR LE PANIER', pdp_not_found:'Produit introuvable.',
    size_choose_error:'Choisis une taille.',
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
    aria_currency:'Devise', aria_theme:'Basculer thème clair/sombre',
    aria_search:'Recherche', aria_cart:'Panier', aria_cart_close:'Fermer le panier',
    checkout_name_label:'NOM COMPLET', checkout_phone_label:'NUMÉRO DE TÉLÉPHONE',
    checkout_fulfillment_label:'MODE DE RÉCUPÉRATION', checkout_pickup:'Retrait', checkout_delivery:'Livraison',
    checkout_city_label:'VILLE', checkout_city_placeholder:'Choisis ta ville', checkout_city_other:'Autre ville',
    checkout_address_label:'ADRESSE DE LIVRAISON', checkout_address_placeholder:'Quartier / point de repère',
    checkout_payment_label:'MODE DE PAIEMENT',
    checkout_error_city:'Merci de sélectionner ta ville.',
    checkout_cash:'Cash à la récupération', checkout_fidelity:'Points fidélité', checkout_receipt_label:'PREUVE DE PAIEMENT (CAPTURE)',
    checkout_card_unavailable:'Le paiement par carte n’est pas encore disponible en ligne — contacte-nous directement pour payer par carte.',
    checkout_fidelity_enter_phone:'Entre ton numéro de téléphone ci-dessus pour voir ton solde de points.',
    checkout_fidelity_xof_only:'Le paiement par points est disponible uniquement en FCFA (XOF) — change la devise dans les réglages.',
    checkout_fidelity_balance:'Tu as {points} points ({value}) — de quoi couvrir cette commande.',
    checkout_fidelity_insufficient:'Tu as {points} points ({value}) — pas assez pour cette commande. Choisis un autre mode de paiement.',
    checkout_fidelity_changed:'Ton solde de points a changé depuis le chargement de cette page. Réessaie.',
    checkout_dial:'Composer pour payer', checkout_copy:'Copier', checkout_copied:'Copié',
    checkout_submit:'COMMANDER', checkout_back:'Retour au panier',
    checkout_error_fields:'Merci de renseigner ton nom et ton numéro.',
    checkout_error_receipt:'Merci de joindre une capture de ton paiement avant de valider.',
    checkout_error_generic:'Une erreur est survenue. Réessaie.',
    checkout_error_stock:"Désolé, une des tailles de ton panier vient d'être épuisée. Vérifie ton panier et réessaie.",
    checkout_confirm_title:'Commande reçue', checkout_confirm_note:'Nous allons confirmer ta commande et ton paiement sous peu.',
    checkout_continue:'CONTINUER MES ACHATS', checkout_ref_prefix:'Commande ',
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
const resultCountEl = document.getElementById('resultCount');
const cart = new Map();

// Persisted so the cart survives navigating to a product page and back
// (product.html is a separate page load, not a client-side route).
function saveCart(){
  try { localStorage.setItem('nyokon-cart', JSON.stringify([...cart.entries()])); } catch (e) { /* localStorage unavailable */ }
}
(function loadCartFromStorage(){
  try {
    const raw = localStorage.getItem('nyokon-cart');
    if (!raw) return;
    JSON.parse(raw).forEach(([key, item]) => cart.set(key, item));
  } catch (e) { /* corrupt or unavailable — start with an empty cart */ }
})();

function colorImage(product, colorName){
  if (colorName && product.colorImages && product.colorImages[colorName]) return product.colorImages[colorName];
  return product.image || null;
}

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
// Products nest gender (men/women/kids — unisex items show under both
// men and women) > type (clothing/shoes/bags/accessories/fragrance),
// with an extra girls/boys split inside kids.
let currentGender = 'all';
let currentType = 'all';
let currentKidsGroup = 'all';
let searchQuery = '';
let currentSort = 'featured';
let favoritesOnly = false;

function loadFavorites(){
  try {
    const raw = localStorage.getItem('nyokon-favorites');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) { return new Set(); }
}
function saveFavorites(){
  try { localStorage.setItem('nyokon-favorites', JSON.stringify([...favorites])); } catch (e) { /* localStorage unavailable */ }
}
const favorites = loadFavorites();

function sizeChartNote(type, size){
  if (type !== 'shoes') return '';
  const c = SHOE_SIZE_CHART[size];
  return c ? `EU ${size} — US ${c.us} / UK ${c.uk}` : '';
}

function renderProducts(){
  grid.innerHTML = '';
  let list = PRODUCTS.filter(p => {
    if (currentGender !== 'all'){
      if (currentGender === 'kids'){ if (p.gender !== 'kids') return false; }
      else if (p.gender !== currentGender && p.gender !== 'unisex') return false;
    }
    if (currentType !== 'all' && p.type !== currentType) return false;
    if (currentGender === 'kids' && currentKidsGroup !== 'all'){
      const kg = p.kidsGroup || 'unisex';
      if (kg !== currentKidsGroup && kg !== 'unisex') return false;
    }
    return true;
  });
  if (searchQuery){
    const q = searchQuery.toLowerCase();
    list = list.filter(p => (p.name[currentLang] || p.name.en).toLowerCase().includes(q));
  }
  if (favoritesOnly) list = list.filter(p => favorites.has(p.id));
  if (currentSort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
  else if (currentSort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
  else if (currentSort === 'newest') list = [...list].sort((a, b) => PRODUCTS.indexOf(b) - PRODUCTS.indexOf(a));

  noResultsEl.hidden = list.length > 0;
  noResultsEl.textContent = favoritesOnly ? t('no_favorites') : t('no_results');
  resultCountEl.textContent = t(list.length === 1 ? 'result_count_singular' : 'result_count_plural').replace('{n}', list.length);

  for (const p of list){
    const name = p.name[currentLang] || p.name.en;
    const sub = p.sub[currentLang] || p.sub.en;
    const initialImage = colorImage(p, p.colors && p.colors.length ? p.colors[0].name : null);
    const altImage = p.gallery && p.gallery.length > 1 ? p.gallery.find(url => url !== initialImage) : null;
    const isFavorite = favorites.has(p.id);
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = p.id;
    card.dataset.type = p.type;
    const pdpHref = `product.html?id=${encodeURIComponent(p.id)}`;
    card.innerHTML = `
      <div class="product-media">
        ${p.soldOut ? `<span class="product-tag product-tag-soldout">${t('tag_sold_out')}</span>`
          : p.tag ? `<span class="product-tag">${t('tag_' + p.tag)}</span>` : ''}
        <button type="button" class="product-favorite-btn${isFavorite ? ' active' : ''}" data-id="${p.id}" aria-pressed="${isFavorite}" aria-label="${t('filter_favorites')}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7.5-4.7-10-9.3C.3 8.1 2 4.5 5.6 4c2-.3 3.9.6 5 2.2C11.7 4.6 13.6 3.7 15.6 4c3.6.5 5.3 4.1 3.6 7.7C16.7 16.3 12 21 12 21z"/></svg>
        </button>
        <a class="product-media-link" href="${pdpHref}" aria-label="${name}">
          ${initialImage
            ? `<img class="product-photo" src="${initialImage}" alt="${name}">${altImage ? `<img class="product-photo product-photo-alt" src="${altImage}" alt="">` : ''}`
            : `<div class="placeholder-img primary" data-placeholder="${name.toUpperCase()}"></div>
          <div class="placeholder-img secondary" data-placeholder="${name.toUpperCase()} — ALT"></div>`}
        </a>
        <button type="button" class="quick-add-fab" data-id="${p.id}" aria-label="${t('quick_add')}" ${p.soldOut ? 'disabled' : ''}>+</button>
      </div>
      <div class="product-info">
        <div>
          <a class="product-name-link" href="${pdpHref}"><div class="product-name">${name}</div></a>
          <div class="product-sub">${sub}</div>
          ${p.colors && p.colors.length ? `
          <div class="product-colors">
            <div class="color-swatch-row">${p.colors.map((c, i) => `<button type="button" class="color-swatch${i === 0 ? ' active' : ''}" data-idx="${i}" style="background:${c.hex}" title="${c.name || ''}"></button>`).join('')}</div>
            <span class="color-count">${p.colors.length} ${p.colors.length > 1 ? t('color_plural') : t('color_singular')}</span>
          </div>` : ''}
        </div>
        <div class="product-price">
          ${p.was ? `<span class="was">${money(p.was)}</span>` : ''}${money(p.price)}
        </div>
      </div>
    `;
    grid.appendChild(card);
  }
}

// Color swatches and the "+" quick-add button (product cards render
// their own — event delegation since the grid is rebuilt on every
// filter/search/currency/language change).
grid.addEventListener('click', (e) => {
  const swatch = e.target.closest('.color-swatch');
  if (swatch){
    const card = swatch.closest('.product-card');
    const product = PRODUCTS.find(p => p.id === card.dataset.id);
    if (!product || !product.colors) return;
    const color = product.colors[parseInt(swatch.dataset.idx, 10)];
    if (!color) return;
    card.querySelectorAll('.color-swatch').forEach(s => s.classList.toggle('active', s === swatch));
    const img = card.querySelector('.product-photo');
    if (img) img.src = colorImage(product, color.name) || img.src;
    return;
  }
  const fab = e.target.closest('.quick-add-fab');
  if (fab) { openQuickAdd(fab.dataset.id); return; }
  const favBtn = e.target.closest('.product-favorite-btn');
  if (favBtn){
    const id = favBtn.dataset.id;
    if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
    saveFavorites();
    favBtn.classList.toggle('active', favorites.has(id));
    favBtn.setAttribute('aria-pressed', favorites.has(id));
    if (favoritesOnly) renderProducts();
  }
});

const favoritesToggleBtn = document.getElementById('favoritesToggle');
favoritesToggleBtn.addEventListener('click', () => {
  favoritesOnly = !favoritesOnly;
  favoritesToggleBtn.classList.toggle('active', favoritesOnly);
  favoritesToggleBtn.setAttribute('aria-pressed', favoritesOnly);
  renderProducts();
});

document.getElementById('sortSelect').addEventListener('change', (e) => {
  currentSort = e.target.value;
  renderProducts();
});

function refreshFilterLabels(){
  document.querySelectorAll('.filter').forEach(btn => {
    const key = 'filter_' + (btn.dataset.gender || btn.dataset.type || btn.dataset.kidsGroup);
    if (TRANSLATIONS.en[key]) btn.textContent = t(key);
  });
}

const filtersKidsRow = document.getElementById('filtersKids');

function setGender(gender){
  currentGender = gender;
  document.querySelectorAll('#filtersGender .filter').forEach(b => b.classList.toggle('active', b.dataset.gender === gender));
  filtersKidsRow.hidden = gender !== 'kids';
  if (gender !== 'kids') currentKidsGroup = 'all';
  renderProducts();
}
function setType(type){
  currentType = type;
  document.querySelectorAll('#filtersType .filter').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  renderProducts();
}
function setKidsGroup(group){
  currentKidsGroup = group;
  document.querySelectorAll('#filtersKids .filter').forEach(b => b.classList.toggle('active', b.dataset.kidsGroup === group));
  renderProducts();
}

document.querySelectorAll('#filtersGender .filter').forEach(btn => {
  btn.addEventListener('click', () => setGender(btn.dataset.gender));
});
document.querySelectorAll('#filtersType .filter').forEach(btn => {
  btn.addEventListener('click', () => setType(btn.dataset.type));
});
document.querySelectorAll('#filtersKids .filter').forEach(btn => {
  btn.addEventListener('click', () => setKidsGroup(btn.dataset.kidsGroup));
});

// Gender links in the header dropdown jump to the shop section and
// pre-select the matching gender pill.
document.querySelectorAll('[data-gender]').forEach(link => {
  if (link.classList.contains('filter')) return; // pills handled above
  link.addEventListener('click', () => setGender(link.dataset.gender));
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

// Header dropdowns (categories / settings)
const dropdowns = document.querySelectorAll('.nav-dropdown');
function closeDropdown(dd){
  dd.classList.remove('open');
  dd.querySelector('button').setAttribute('aria-expanded', 'false');
}
function closeAllDropdowns(except){
  dropdowns.forEach(dd => { if (dd !== except) closeDropdown(dd); });
}
dropdowns.forEach(dd => {
  const trigger = dd.querySelector('button');
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !dd.classList.contains('open');
    closeAllDropdowns();
    if (willOpen){
      dd.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    }
  });
  dd.querySelectorAll('a[data-gender]').forEach(link => {
    link.addEventListener('click', () => closeDropdown(dd));
  });
});
document.addEventListener('click', (e) => { if (!e.target.closest('.nav-dropdown')) closeAllDropdowns(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllDropdowns(); });

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
        <span>${item.name[currentLang] || item.name.en}${item.color ? ' — ' + item.color : ''}${item.size ? ' — ' + item.size : ''} × ${item.qty}</span>
        <span>${money(item.price * item.qty)}</span>
      </div>
    `).join('');
  }
  const total = [...cart.values()].reduce((sum, i) => sum + i.price * i.qty, 0);
  cartTotalEl.textContent = money(total);
  const count = [...cart.values()].reduce((sum, i) => sum + i.qty, 0);
  cartCountEl.textContent = count;
  saveCart();
}

function addToCart(product, size, color, qty){
  const key = `${product.id}::${size || ''}::${color || ''}`;
  const existing = cart.get(key);
  if (existing) existing.qty += qty;
  else cart.set(key, { ...product, size: size || null, color: color || null, qty });
  renderCart();
}

// Quick Add drawer — opened from a card's "+" button, lets the
// customer pick a color and size without leaving the catalog.
const quickAddDrawer = document.getElementById('quickAddDrawer');
const quickAddScrim = document.getElementById('quickAddScrim');
const quickAddPhoto = document.getElementById('quickAddPhoto');
const quickAddNameEl = document.getElementById('quickAddName');
const quickAddSubEl = document.getElementById('quickAddSub');
const quickAddPriceEl = document.getElementById('quickAddPrice');
const quickAddColorsEl = document.getElementById('quickAddColors');
const quickAddSizesEl = document.getElementById('quickAddSizes');
const quickAddNoteEl = document.getElementById('quickAddNote');
const quickAddSubmitBtn = document.getElementById('quickAddSubmit');
let quickAddProduct = null;
let quickAddSelectedColor = null;
let quickAddSelectedSize = null;

function openQuickAddDrawer(){ quickAddDrawer.classList.add('open'); quickAddScrim.classList.add('open'); }
function closeQuickAddDrawer(){ quickAddDrawer.classList.remove('open'); quickAddScrim.classList.remove('open'); }
document.getElementById('quickAddClose').addEventListener('click', closeQuickAddDrawer);
quickAddScrim.addEventListener('click', closeQuickAddDrawer);

function renderQuickAddColors(){
  quickAddColorsEl.innerHTML = (quickAddProduct.colors || []).map(c =>
    `<button type="button" class="color-swatch${c.name === quickAddSelectedColor ? ' active' : ''}" data-name="${c.name}" style="background:${c.hex}" title="${c.name || ''}"></button>`
  ).join('');
}
function renderQuickAddSizes(){
  quickAddSizesEl.innerHTML = (quickAddProduct.sizes || []).map(s => {
    const outOfStock = quickAddProduct.stockBySize && (quickAddProduct.stockBySize[s] || 0) <= 0;
    return `<button type="button" class="size-chip${s === quickAddSelectedSize ? ' active' : ''}${outOfStock ? ' is-out' : ''}" data-size="${s}" ${outOfStock ? 'disabled' : ''}>${s}</button>`;
  }).join('');
}

function openQuickAdd(id){
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;
  quickAddProduct = product;
  quickAddSelectedColor = product.colors && product.colors.length ? product.colors[0].name : null;
  quickAddSelectedSize = null;
  quickAddNoteEl.textContent = '';
  const name = product.name[currentLang] || product.name.en;
  quickAddPhoto.src = colorImage(product, quickAddSelectedColor) || '';
  quickAddPhoto.alt = name;
  quickAddNameEl.textContent = name;
  quickAddSubEl.textContent = quickAddSelectedColor || (product.sub[currentLang] || product.sub.en);
  quickAddPriceEl.innerHTML = `${product.was ? `<span class="was">${money(product.was)}</span>` : ''}${money(product.price)}`;
  renderQuickAddColors();
  renderQuickAddSizes();
  openQuickAddDrawer();
}

quickAddColorsEl.addEventListener('click', (e) => {
  const swatch = e.target.closest('.color-swatch');
  if (!swatch || !quickAddProduct) return;
  quickAddSelectedColor = swatch.dataset.name;
  quickAddPhoto.src = colorImage(quickAddProduct, quickAddSelectedColor) || quickAddPhoto.src;
  quickAddSubEl.textContent = quickAddSelectedColor;
  renderQuickAddColors();
});

quickAddSizesEl.addEventListener('click', (e) => {
  const chip = e.target.closest('.size-chip');
  if (!chip || !quickAddProduct) return;
  quickAddSelectedSize = chip.dataset.size;
  quickAddNoteEl.textContent = '';
  renderQuickAddSizes();
});

quickAddSubmitBtn.addEventListener('click', () => {
  if (!quickAddProduct) return;
  if (quickAddProduct.sizes && quickAddProduct.sizes.length && !quickAddSelectedSize){
    quickAddNoteEl.textContent = t('size_choose_error');
    return;
  }
  addToCart(quickAddProduct, quickAddSelectedSize, quickAddSelectedColor, 1);
  closeQuickAddDrawer();
  openCart();
});

// Checkout — mobile-money (Orange Money / MTN MoMo) or cash on pickup,
// same pattern as Chez Sanji: no payment gateway, customer sends money
// manually and uploads a receipt for staff to verify.
(function initCheckout(){
  const cartFooter = document.getElementById('cartFooter');
  const checkoutView = document.getElementById('checkoutView');
  const checkoutConfirm = document.getElementById('checkoutConfirm');
  const cartCheckoutBtn = document.getElementById('cartCheckoutBtn');
  const checkoutBack = document.getElementById('checkoutBack');
  const checkoutContinueBtn = document.getElementById('checkoutContinueBtn');
  const checkoutAddressField = document.getElementById('checkoutAddressField');
  const checkoutPaymentDetails = document.getElementById('checkoutPaymentDetails');
  const checkoutError = document.getElementById('checkoutError');
  const checkoutSubmitBtn = document.getElementById('checkoutSubmitBtn');
  const checkoutRef = document.getElementById('checkoutRef');
  if (!checkoutView) return;

  let paymentSettings = { orange_money_number: '', orange_money_name: '', mtn_momo_number: '', mtn_momo_name: '' };
  (async function loadPaymentSettings(){
    const sb = getSb();
    if (!sb) return;
    try {
      const { data } = await sb.from('settings').select('key,value');
      (data || []).forEach(row => { paymentSettings[row.key] = row.value || ''; });
    } catch (e) { /* keep blank defaults */ }
  })();

  function showCart(){
    checkoutView.style.display = 'none';
    checkoutConfirm.style.display = 'none';
    cartItemsEl.style.display = '';
    cartFooter.style.display = '';
  }
  function showCheckoutForm(){
    cartItemsEl.style.display = 'none';
    cartFooter.style.display = 'none';
    checkoutConfirm.style.display = 'none';
    checkoutView.style.display = 'flex';
    renderPaymentDetails();
  }
  function showConfirm(ref){
    checkoutView.style.display = 'none';
    checkoutRef.textContent = t('checkout_ref_prefix') + ref;
    checkoutConfirm.style.display = 'flex';
  }

  cartCheckoutBtn.addEventListener('click', () => {
    if (cart.size === 0) return;
    showCheckoutForm();
  });
  checkoutBack.addEventListener('click', showCart);
  checkoutContinueBtn.addEventListener('click', () => { showCart(); closeCart(); });

  checkoutView.querySelectorAll('input[name=fulfillment]').forEach(r => {
    r.addEventListener('change', () => {
      checkoutAddressField.style.display = r.value === 'delivery' && r.checked ? 'block' : checkoutAddressField.style.display;
    });
  });
  checkoutView.addEventListener('change', (e) => {
    if (e.target.name === 'fulfillment') {
      checkoutAddressField.style.display = e.target.value === 'delivery' ? 'block' : 'none';
    }
    if (e.target.name === 'payment') renderPaymentDetails();
  });
  document.getElementById('checkoutPhone').addEventListener('input', () => {
    if (selectedPaymentMethod() === 'fidelity') renderPaymentDetails();
  });

  function selectedPaymentMethod(){
    const checked = checkoutView.querySelector('input[name=payment]:checked');
    return checked ? checked.value : 'cash';
  }

  function cartTotalInCurrentCurrency(){
    const rate = (CURRENCIES.find(c => c.code === currentCurrency) || CURRENCIES[0]).rate;
    const totalUSD = [...cart.values()].reduce((sum, i) => sum + i.price * i.qty, 0);
    return Math.round(totalUSD * rate);
  }
  function formatXOF(amount){
    return new Intl.NumberFormat('fr-SN', { style:'currency', currency:'XOF', maximumFractionDigits:0 }).format(amount);
  }

  async function renderFidelityPanel(){
    if (currentCurrency !== 'XOF') {
      checkoutPaymentDetails.innerHTML = `<div class="checkout-info-message is-error">${t('checkout_fidelity_xof_only')}</div>`;
      checkoutSubmitBtn.disabled = true;
      return;
    }
    const phone = document.getElementById('checkoutPhone').value.trim();
    if (!phone) {
      checkoutPaymentDetails.innerHTML = `<div class="checkout-info-message">${t('checkout_fidelity_enter_phone')}</div>`;
      checkoutSubmitBtn.disabled = true;
      return;
    }
    const sb = getSb();
    if (!sb) {
      checkoutPaymentDetails.innerHTML = `<div class="checkout-info-message is-error">${t('checkout_error_generic')}</div>`;
      checkoutSubmitBtn.disabled = true;
      return;
    }
    try {
      const { data } = await sb.from('customers').select('points').eq('phone', phone).maybeSingle();
      const points = (data && data.points) || 0;
      const pointValue = parseFloat(paymentSettings.loyalty_point_value) || 10;
      const pointsWorth = Math.round(points * pointValue);
      const total = cartTotalInCurrentCurrency();
      const enoughPoints = pointsWorth >= total && total > 0;
      const msg = t(enoughPoints ? 'checkout_fidelity_balance' : 'checkout_fidelity_insufficient')
        .replace('{points}', points).replace('{value}', formatXOF(pointsWorth));
      checkoutPaymentDetails.innerHTML = `<div class="checkout-info-message ${enoughPoints ? 'is-ok' : 'is-error'}">${msg}</div>`;
      checkoutSubmitBtn.disabled = !enoughPoints;
    } catch (e) {
      checkoutPaymentDetails.innerHTML = `<div class="checkout-info-message is-error">${t('checkout_error_generic')}</div>`;
      checkoutSubmitBtn.disabled = true;
    }
  }

  function renderPaymentDetails(){
    const method = selectedPaymentMethod();
    checkoutSubmitBtn.disabled = false;
    if (method === 'cash') {
      checkoutPaymentDetails.innerHTML = '';
      return;
    }
    if (method === 'bank_card') {
      checkoutPaymentDetails.innerHTML = `<div class="checkout-info-message is-error">${t('checkout_card_unavailable')}</div>`;
      checkoutSubmitBtn.disabled = true;
      return;
    }
    if (method === 'fidelity') {
      renderFidelityPanel();
      return;
    }
    const label = method === 'orange_money' ? 'Orange Money' : 'MTN MoMo';
    const number = paymentSettings[method === 'orange_money' ? 'orange_money_number' : 'mtn_momo_number'] || '—';
    const holderName = paymentSettings[method === 'orange_money' ? 'orange_money_name' : 'mtn_momo_name'] || '';
    const dialCode = method === 'orange_money' ? '#150#' : '*126#';
    checkoutPaymentDetails.innerHTML = `
      <div class="checkout-account-number">
        <span>${label}: ${number}${holderName ? ' — ' + holderName : ''}</span>
        <button type="button" class="checkout-account-copy" data-number="${number}">${t('checkout_copy')}</button>
      </div>
      <a class="checkout-dial-link" href="tel:${encodeURIComponent(dialCode)}">${t('checkout_dial')} (${dialCode})</a>
      <div class="checkout-field">
        <label>${t('checkout_receipt_label')}</label>
        <input type="file" accept="image/*,.pdf" id="checkoutReceipt" />
      </div>
    `;
    const copyBtn = checkoutPaymentDetails.querySelector('.checkout-account-copy');
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyBtn.dataset.number);
        copyBtn.textContent = t('checkout_copied');
        setTimeout(() => { copyBtn.textContent = t('checkout_copy'); }, 1500);
      } catch (e) { /* clipboard unavailable — number is already shown inline */ }
    });
  }

  checkoutView.addEventListener('submit', async (e) => {
    e.preventDefault();
    checkoutError.textContent = '';
    const name = document.getElementById('checkoutName').value.trim();
    const phone = document.getElementById('checkoutPhone').value.trim();
    if (!name || !phone) {
      checkoutError.textContent = t('checkout_error_fields');
      return;
    }
    const fulfillmentChoice = checkoutView.querySelector('input[name=fulfillment]:checked').value;
    const cityValue = document.getElementById('checkoutCity').value;
    if (fulfillmentChoice === 'delivery' && !cityValue) {
      checkoutError.textContent = t('checkout_error_city');
      return;
    }
    const method = selectedPaymentMethod();
    if (method === 'bank_card') {
      checkoutError.textContent = t('checkout_card_unavailable');
      return;
    }
    const receiptInput = document.getElementById('checkoutReceipt');
    const receiptFile = receiptInput && receiptInput.files[0];
    if (method !== 'cash' && method !== 'fidelity' && !receiptFile) {
      checkoutError.textContent = t('checkout_error_receipt');
      return;
    }

    const sb = getSb();
    if (!sb) {
      checkoutError.textContent = t('checkout_error_generic');
      return;
    }

    checkoutSubmitBtn.disabled = true;
    const ref = 'NYK-' + Date.now().toString(36).toUpperCase();

    try {
      let receiptPath = null;
      if (receiptFile) {
        const ext = receiptFile.name.split('.').pop();
        receiptPath = `${ref}.${ext}`;
        const { error: uploadError } = await sb.storage.from('order-receipts').upload(receiptPath, receiptFile);
        if (uploadError) throw uploadError;
      }

      // Atomically check + reserve stock before the order is recorded,
      // so a customer never gets a "confirmed" order for a size that
      // sold out while they were checking out. Only items staff is
      // actually tracking stock for (a matching product_variants row)
      // take part — everything else stays always-available, as before.
      const productIds = [...new Set([...cart.values()].map(i => i.id))];
      const stockDeductions = [];
      if (productIds.length) {
        const { data: variants } = await sb.from('product_variants').select('id,product_id,size,color_name').in('product_id', productIds);
        for (const item of cart.values()) {
          if (!item.size) continue;
          const match = (variants || []).find(v => v.product_id === item.id && v.size === item.size && (v.color_name || null) === (item.color || null));
          if (match) stockDeductions.push({ variant_id: match.id, qty: item.qty });
        }
      }
      if (stockDeductions.length) {
        const { error: stockError } = await sb.rpc('decrement_variant_stock', { items: stockDeductions });
        if (stockError) {
          checkoutError.textContent = (stockError.message || '').includes('INSUFFICIENT_STOCK')
            ? t('checkout_error_stock')
            : t('checkout_error_generic');
          return;
        }
      }

      const address = document.getElementById('checkoutAddress').value.trim();
      const subtotalAmount = cartTotalInCurrentCurrency();

      // Same "check then spend" atomicity as the stock deduction above —
      // redeem points before the order is recorded, so an order is
      // never created for points the customer didn't actually have.
      if (method === 'fidelity') {
        const pointValue = parseFloat(paymentSettings.loyalty_point_value) || 10;
        const pointsToSpend = Math.ceil(subtotalAmount / pointValue);
        const { error: redeemError } = await sb.rpc('redeem_loyalty_points', { p_phone: phone, p_points: pointsToSpend });
        if (redeemError) {
          checkoutError.textContent = (redeemError.message || '').includes('INSUFFICIENT_POINTS')
            ? t('checkout_fidelity_changed')
            : t('checkout_error_generic');
          return;
        }
      }

      const items = [...cart.values()].map(i => ({
        id: i.id, name: i.name[currentLang] || i.name.en, size: i.size || null, color: i.color || null, price: i.price, qty: i.qty,
      }));

      const { error: insertError } = await sb.from('orders').insert({
        ref,
        customer_name: name,
        customer_phone: phone,
        fulfillment: fulfillmentChoice,
        city: fulfillmentChoice === 'delivery' ? cityValue : null,
        address: fulfillmentChoice === 'delivery' ? address : null,
        items,
        subtotal: subtotalAmount,
        currency: currentCurrency,
        payment_method: method,
        receipt_path: receiptPath,
      });
      if (insertError) throw insertError;

      cart.clear();
      renderCart();
      checkoutView.reset();
      checkoutAddressField.style.display = 'none';
      showConfirm(ref);
    } catch (err) {
      checkoutError.textContent = t('checkout_error_generic');
    } finally {
      checkoutSubmitBtn.disabled = false;
    }
  });
})();

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
    applyPromotionText();
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
renderCart();
document.getElementById('year').textContent = new Date().getFullYear();

// Live product catalog — replaces FALLBACK_PRODUCTS once fetched, so
// edits staff make in staff.html (new products, price changes, photos,
// hiding a sold-out item) show up on the site without a code deploy.
(async function loadProductsFromSupabase(){
  const sb = getSb();
  if (!sb) return;
  try {
    const { data, error } = await sb
      .from('products')
      .select('id,gender,type,kids_group,tag,tags,price,was,sizes,colors,material,fit,care_instructions,volume_ml,olfactory_family,concentration,sold_out,model_stats,name_en,name_fr,sub_en,sub_fr,image_url')
      .eq('active', true)
      .order('created_at', { ascending: true });
    if (error || !data || !data.length) return;

    // Per-size stock, when staff tracks it (product_variants). A
    // product with no variant rows stays always-available, same as
    // before — variants are an opt-in stock layer, not required.
    let variantsByProduct = {};
    try {
      const { data: variants } = await sb.from('product_variants').select('product_id,size,stock');
      (variants || []).forEach(v => {
        (variantsByProduct[v.product_id] = variantsByProduct[v.product_id] || []).push(v);
      });
    } catch (e) { /* stock tracking is optional */ }

    // The product's photo gallery — ordered, optionally tagged with a
    // color so picking a colorway swaps the card/PDP image (see
    // colorImage()). Missing entirely just falls back to image_url.
    let imagesByProduct = {};
    try {
      const { data: images } = await sb.from('product_images').select('product_id,color_name,url,position').order('position', { ascending: true });
      (images || []).forEach(img => {
        (imagesByProduct[img.product_id] = imagesByProduct[img.product_id] || []).push(img);
      });
    } catch (e) { /* gallery is optional */ }

    PRODUCTS = data.map(r => {
      const variants = variantsByProduct[r.id] || [];
      const stockBySize = {};
      variants.forEach(v => {
        if (!v.size) return;
        stockBySize[v.size] = (stockBySize[v.size] || 0) + (Number(v.stock) || 0);
      });
      const soldOut = r.sold_out === true || (variants.length > 0 && variants.every(v => (Number(v.stock) || 0) <= 0));
      const images = imagesByProduct[r.id] || [];
      const colorImages = {};
      const gallery = [];
      images.forEach(img => {
        if (img.color_name && !colorImages[img.color_name]) colorImages[img.color_name] = img.url;
        gallery.push(img.url);
      });
      return {
        id: r.id,
        price: Number(r.price),
        was: r.was != null ? Number(r.was) : null,
        gender: r.gender || 'unisex',
        type: r.type || 'clothing',
        kidsGroup: r.kids_group || null,
        tag: r.tag || null,
        tags: r.tags || null,
        sizes: r.sizes && r.sizes.length ? r.sizes : null,
        stockBySize: Object.keys(stockBySize).length ? stockBySize : null,
        colors: r.colors && r.colors.length ? r.colors : null,
        colorImages: Object.keys(colorImages).length ? colorImages : null,
        gallery: gallery.length ? gallery : null,
        material: r.material || null,
        fit: r.fit || null,
        careInstructions: r.care_instructions || null,
        volumeMl: r.volume_ml || null,
        olfactoryFamily: r.olfactory_family || null,
        concentration: r.concentration || null,
        modelStats: r.model_stats || null,
        soldOut,
        image: r.image_url || null,
        name: { en: r.name_en, fr: r.name_fr },
        sub: { en: r.sub_en || '', fr: r.sub_fr || '' },
      };
    });
    renderProducts();
  } catch (e) { /* keep FALLBACK_PRODUCTS on any failure */ }
})();

// Scheduled promotions — if staff has a campaign active right now
// (see staff.html), it replaces the default announcement bar text.
let activePromotion = null;
function applyPromotionText(){
  if (!activePromotion) return;
  const announceEl = document.querySelector('.announce');
  if (announceEl) announceEl.textContent = currentLang === 'fr' ? activePromotion.title_fr : activePromotion.title_en;
}
(async function loadActivePromotion(){
  const sb = getSb();
  if (!sb) return;
  try {
    const nowIso = new Date().toISOString();
    const { data } = await sb
      .from('promotions')
      .select('title_en,title_fr')
      .eq('active', true)
      .lte('starts_at', nowIso)
      .gte('ends_at', nowIso)
      .order('starts_at', { ascending: false })
      .limit(1);
    if (data && data.length) {
      activePromotion = data[0];
      applyPromotionText();
    }
  } catch (e) { /* keep default announcement text */ }
})();

// Staff-uploaded photos — overrides the static hero/lookbook placeholders
// when a staff member has uploaded one via staff.html. Fails silently
// (keeps the static defaults) if Supabase is unreachable or empty.
(async function loadStaffImages(){
  const sb = getSb();
  if (!sb) return;
  try {
    const { data, error } = await sb.from('site_images').select('slot,image_url');
    if (error || !data) return;
    data.forEach(row => {
      if (!row.image_url) return;
      const el = document.querySelector(`[data-slot="${row.slot}"]`);
      if (!el) return;
      let img = el.querySelector('img');
      if (!img) {
        el.classList.remove('placeholder-img');
        el.removeAttribute('data-placeholder');
        img = document.createElement('img');
        img.alt = 'nyøkøn';
        el.insertBefore(img, el.firstChild);
      }
      img.src = row.image_url;
    });
  } catch (e) { /* Supabase unreachable — keep static defaults */ }
})();

// Intro hero — scroll-locked video scrub, then unlocks into the normal page.
(function initIntroHero(){
  const section = document.getElementById('introHero');
  const video = document.getElementById('introHeroVideo');
  if (!section || !video) return;

  const titleEl = document.getElementById('introHeroTitle');
  const taglineEl = document.getElementById('introHeroTagline');
  const hintEl = document.getElementById('introHeroHint');
  const progressBar = document.getElementById('introHeroProgress');
  const skipBtn = document.getElementById('introHeroSkip');
  const scrubDistance = 1400;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    section.classList.add('is-unlocked');
    video.classList.add('is-ready');
    titleEl.classList.add('is-drawn');
    titleEl.style.opacity = '0';
    taglineEl.style.opacity = '1';
    hintEl.style.opacity = '0';
    progressBar.style.transform = 'scaleX(1)';
    return;
  }

  function clamp(v, min, max){ return Math.min(max, Math.max(min, v)); }

  let duration = 0;
  let targetProgress = 0;
  let currentProgress = 0;
  let hasStartedScrolling = false;
  let isSeeking = false;
  let pendingTime = null;
  let locked = false;
  let lockedScrollY = 0;
  let touchStartY = 0;
  let rafId = 0;

  video.addEventListener('loadeddata', () => {
    duration = video.duration || 0;
    video.classList.add('is-ready');
    // Some browsers (notably iOS/Safari) never paint a decoded frame until
    // playback has actually started at least once — seeking alone leaves
    // the element blank. A muted play-then-immediate-pause primes the
    // decoder so subsequent currentTime scrubbing renders correctly.
    const primePlayback = video.play();
    if (primePlayback && typeof primePlayback.then === 'function') {
      primePlayback.then(() => video.pause()).catch(() => {});
    }
  });

  video.addEventListener('seeked', () => {
    isSeeking = false;
    if (pendingTime !== null) {
      const t = pendingTime;
      pendingTime = null;
      isSeeking = true;
      video.currentTime = t;
    }
  });

  function seekTo(t){
    if (isSeeking) { pendingTime = t; return; }
    isSeeking = true;
    video.currentTime = t;
  }

  function engageLock(){
    if (locked) return;
    locked = true;
    lockedScrollY = window.scrollY;
    const b = document.body.style;
    b.position = 'fixed';
    b.top = `-${lockedScrollY}px`;
    b.left = '0';
    b.right = '0';
    b.width = '100%';
    section.classList.remove('is-unlocked');
  }

  function releaseLock(){
    if (!locked) return;
    locked = false;
    const y = lockedScrollY;
    const b = document.body.style;
    b.position = '';
    b.top = '';
    b.left = '';
    b.right = '';
    b.width = '';
    window.scrollTo(0, y);
    section.classList.add('is-unlocked');
  }

  engageLock();
  requestAnimationFrame(() => requestAnimationFrame(() => titleEl.classList.add('is-drawn')));

  function addDelta(deltaY){
    targetProgress = clamp(targetProgress + deltaY / scrubDistance, 0, 1);
    if (targetProgress > 0.001) hasStartedScrolling = true;
  }

  function onWheel(e){
    if (!locked) return;
    addDelta(e.deltaY);
    e.preventDefault();
    if (targetProgress >= 1 && e.deltaY > 0) releaseLock();
  }

  function onTouchStart(e){
    touchStartY = e.touches[0] ? e.touches[0].clientY : 0;
  }
  function onTouchMove(e){
    if (!locked) return;
    const y = e.touches[0] ? e.touches[0].clientY : touchStartY;
    const deltaY = touchStartY - y;
    touchStartY = y;
    addDelta(deltaY);
    e.preventDefault();
    if (targetProgress >= 1 && deltaY > 0) releaseLock();
  }

  function onWindowScroll(){
    if (!locked && window.scrollY <= 0) engageLock();
  }

  function onKeydown(e){
    if (!locked) return;
    if (['ArrowDown','PageDown',' ','Spacebar'].includes(e.key)) { addDelta(220); e.preventDefault(); }
    else if (['ArrowUp','PageUp'].includes(e.key)) { addDelta(-220); e.preventDefault(); }
  }

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('scroll', onWindowScroll, { passive: true });
  window.addEventListener('keydown', onKeydown);
  skipBtn.addEventListener('click', () => { targetProgress = 1; releaseLock(); });

  // Safety net: never let a stuck video or missed input trap the page.
  setTimeout(() => { if (locked) releaseLock(); }, 12000);

  function frame(){
    currentProgress += (targetProgress - currentProgress) * 0.18;

    if (duration > 0) seekTo(currentProgress * duration);

    const scale = 1 + currentProgress * 0.06;
    video.style.transform = `scale(${scale})`;

    const titleT = 1 - clamp(currentProgress / 0.35, 0, 1);
    titleEl.style.opacity = String(titleT);
    titleEl.style.transform = `translateY(${(1 - titleT) * -24}px) scale(${0.96 + titleT * 0.04})`;
    titleEl.style.filter = `blur(${(1 - titleT) * 10}px)`;

    hintEl.style.opacity = hasStartedScrolling ? '0' : '1';

    const taglineT = clamp((currentProgress - 0.82) / 0.18, 0, 1);
    taglineEl.style.opacity = String(taglineT);
    taglineEl.style.transform = `translateY(${(1 - taglineT) * 20}px) scale(${0.97 + taglineT * 0.03})`;
    taglineEl.style.filter = `blur(${(1 - taglineT) * 8}px)`;

    progressBar.style.transform = `scaleX(${currentProgress})`;

    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);
})();
