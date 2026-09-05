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
    note.textContent = 'Please fill in your name and a way to reach you.';
    note.classList.remove('sent');
    return;
  }

  const name = document.getElementById('aName').value.trim();
  const contact = document.getElementById('aContact').value.trim();
  const availability = document.getElementById('aAvailability').value;
  const experience = document.getElementById('aExperience').value;
  const message = document.getElementById('aMsg').value.trim();

  const subject = `Job application: Cleaning Technician (${availability})`;
  const body =
    `Name: ${name}\n` +
    `Phone or email: ${contact}\n` +
    `Availability: ${availability}\n` +
    `Cleaning experience: ${experience}\n` +
    `Notes: ${message || '(none)'}\n`;

  const mailto = `mailto:magicstickclean@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;

  note.textContent = 'Opening your email app with your application filled in...';
  note.classList.add('sent');
});
