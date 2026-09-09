const t = (key, vars) => (window.MagicstickI18N ? window.MagicstickI18N.t(key, vars) : key);

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

// Digital gift card preview: tap/click to flip (in addition to hover), and
// keep the shown amount in sync with the form's amount picker.
const passCard = document.getElementById('passCard');
if (passCard) {
  passCard.addEventListener('click', () => passCard.classList.toggle('flipped'));
}
const passAmount = document.getElementById('passAmount');
const gAmountSelect = document.getElementById('gAmount');
if (passAmount && gAmountSelect) {
  gAmountSelect.addEventListener('change', () => {
    passAmount.textContent = /^\$\d/.test(gAmountSelect.value) ? gAmountSelect.value : '$100';
  });
}

// Gift card request form: validate, then hand off to the visitor's email app
const form = document.getElementById('giftCardForm');
const note = document.getElementById('giftCardNote');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  let valid = true;
  const nameField = document.getElementById('gName').closest('.field');
  const contactField = document.getElementById('gContact').closest('.field');
  nameField.classList.toggle('invalid', document.getElementById('gName').value.trim() === '');
  contactField.classList.toggle('invalid', document.getElementById('gContact').value.trim() === '');
  if (nameField.classList.contains('invalid') || contactField.classList.contains('invalid')) valid = false;

  if (!valid) {
    note.textContent = t('form.note.invalid');
    note.classList.remove('sent');
    return;
  }

  const name = document.getElementById('gName').value.trim();
  const contact = document.getElementById('gContact').value.trim();
  const amount = document.getElementById('gAmount').value;
  const recipient = document.getElementById('gRecipient').value.trim();
  const message = document.getElementById('gMsg').value.trim();

  const subject = `Gift card request — ${amount}`;
  const body =
    `${t('mail.label.name')}: ${name}\n` +
    `${t('mail.label.contact')}: ${contact}\n` +
    `Amount: ${amount}\n` +
    `Recipient: ${recipient || t('common.none')}\n` +
    `${t('mail.label.notes')}: ${message || t('common.none')}\n`;

  const mailto = `mailto:magicstickclean@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;

  note.textContent = t('giftcards.form.note.opening');
  note.classList.add('sent');
});
