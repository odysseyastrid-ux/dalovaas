const t = (key, vars) => (window.MagicstickI18N ? window.MagicstickI18N.t(key, vars) : key);
const lang = () => (window.MagicstickI18N ? window.MagicstickI18N.getLang() : 'en');

// "50 free cleanings to win" contest page. Entries close Dec 31, 2026 at
// 23:59:59 Eastern; the submit-form function enforces the same deadline.
const CONTEST_CLOSES_AT = Date.parse('2027-01-01T05:00:00Z');

// Mobile menu toggle (same behavior as the main site)
const burger = document.getElementById('burgerBtn');
const mobileMenu = document.getElementById('mobileMenu');
burger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  burger.classList.toggle('open', isOpen);
  burger.setAttribute('aria-expanded', isOpen);
});
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  });
});

// Banner in the visitor's language + days-left line.
const banner = document.getElementById('contestBanner');
const countdown = document.getElementById('contestCountdown');
function refreshLangBits() {
  if (banner) {
    banner.src = `assets/images/marketing/concours/concours-web-${lang() === 'fr' ? 'fr' : 'en'}.webp`;
    banner.alt = t('contest.bannerAlt');
  }
  const msLeft = CONTEST_CLOSES_AT - Date.now();
  if (countdown) {
    countdown.hidden = msLeft <= 0;
    const days = Math.ceil(msLeft / 86400000);
    countdown.textContent = days <= 1 ? t('contest.countdownOne') : t('contest.countdown', { days });
  }
}
refreshLangBits();
document.addEventListener('magicstick:langchange', refreshLangBits);

// ---------- Entry form ----------
const form = document.getElementById('contestForm');
const note = document.getElementById('contestNote');
const done = document.getElementById('contestDone');
const closed = document.getElementById('contestClosed');
const checkGuard = window.MagicstickFormGuard
  ? window.MagicstickFormGuard.attach(document.getElementById('contestFormGuard'))
  : () => 'ok';

function showPanel(panel, textKey) {
  form.hidden = true;
  panel.hidden = false;
  if (textKey) {
    const p = panel.querySelector('p');
    p.setAttribute('data-i18n', textKey);
    p.textContent = t(textKey);
  }
  panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function isValidContact(value) {
  const v = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return true;
  let digits = v.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return digits.length === 10;
}

// Where the visitor came from (banner QR, Facebook post...), only with
// analytics consent: MagicstickUtm returns nothing otherwise.
function entrySource() {
  try { return window.MagicstickUtm ? window.MagicstickUtm.describe() : ''; } catch (e) { return ''; }
}

if (Date.now() >= CONTEST_CLOSES_AT) {
  form.hidden = true;
  closed.hidden = false;
} else {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const guardResult = checkGuard();
    if (guardResult === 'honeypot') { showPanel(done); return; }

    const nameEl = document.getElementById('cName');
    const contactEl = document.getElementById('cContact');
    const addressEl = document.getElementById('cAddress');
    const eligibleEl = document.getElementById('cEligible');
    const rulesEl = document.getElementById('cRules');
    nameEl.closest('.field').classList.toggle('invalid', !nameEl.value.trim());
    contactEl.closest('.field').classList.toggle('invalid', !isValidContact(contactEl.value));
    addressEl.closest('.field').classList.toggle('invalid', addressEl.value.trim().length < 3);
    eligibleEl.closest('.field').classList.toggle('invalid', !eligibleEl.checked);
    rulesEl.closest('.field').classList.toggle('invalid', !rulesEl.checked);
    if (form.querySelector('.field.invalid')) {
      note.textContent = (!eligibleEl.checked || !rulesEl.checked) && !form.querySelector('.field.invalid input[type="text"]')
        ? t('contest.form.checkErr')
        : t('form.note.invalid');
      note.classList.remove('sent');
      form.querySelector('.field.invalid input').focus();
      return;
    }
    if (guardResult === 'wrong-answer') {
      note.textContent = t('form.security.error');
      note.classList.remove('sent');
      return;
    }

    const cfg = window.MAGICSTICK_CONFIG || {};
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    note.textContent = t('contest.form.sending');
    note.classList.remove('sent');
    try {
      if (!cfg.FUNCTIONS_URL) throw new Error('backend_unavailable');
      const res = await fetch(`${cfg.FUNCTIONS_URL}/submit-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form: 'contest',
          lang: lang(),
          page: window.location.pathname,
          name: nameEl.value.trim(),
          contact: contactEl.value.trim(),
          address: addressEl.value.trim(),
          eligible: true,
          rules: true,
          source: entrySource(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 410) { form.hidden = true; closed.hidden = false; return; }
      if (res.status === 429) { note.textContent = t('contest.form.tooMany'); return; }
      if (!res.ok || data.ok !== true) throw new Error(data.error || 'submit_failed');
      form.reset();
      showPanel(done, data.already ? 'contest.done.already' : 'contest.done.text');
    } catch (err) {
      console.error(err);
      note.textContent = t('contest.form.error');
    } finally {
      submitBtn.disabled = false;
    }
  });
}
