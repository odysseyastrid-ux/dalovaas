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

// Job application form: validate, then hand off to the visitor's email app
const form = document.getElementById('applyForm');
const note = document.getElementById('applyNote');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  let valid = true;
  const nameField = document.getElementById('aName').closest('.field');
  const contactField = document.getElementById('aContact').closest('.field');
  nameField.classList.toggle('invalid', document.getElementById('aName').value.trim() === '');
  contactField.classList.toggle('invalid', document.getElementById('aContact').value.trim() === '');
  if (nameField.classList.contains('invalid') || contactField.classList.contains('invalid')) valid = false;

  if (!valid) {
    note.textContent = t('form.note.invalid');
    note.classList.remove('sent');
    return;
  }

  const name = document.getElementById('aName').value.trim();
  const contact = document.getElementById('aContact').value.trim();
  const availability = document.getElementById('aAvailability').value;
  const experience = document.getElementById('aExperience').value;
  const message = document.getElementById('aMsg').value.trim();

  const subject = t('mail.subject.application', { availability });
  const body =
    `${t('mail.label.name')}: ${name}\n` +
    `${t('mail.label.contact')}: ${contact}\n` +
    `${t('mail.label.availability')}: ${availability}\n` +
    `${t('mail.label.experience')}: ${experience}\n` +
    `${t('mail.label.notes')}: ${message || t('common.none')}\n`;

  const mailto = `mailto:magicstickclean@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;

  note.textContent = t('careers.form.note.opening');
  note.classList.add('sent');
});
