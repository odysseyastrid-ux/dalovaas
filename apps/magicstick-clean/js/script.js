// Zone selector: which area, then a first-time-client discount message
  let selectedZone = '';
  let discountClaimed = false;
  const zoneBackdrop = document.getElementById('zoneBackdrop');
  const zoneTag = document.getElementById('zoneTag');
  const zoneStep1 = document.getElementById('zoneStep1');
  const zoneStep2 = document.getElementById('zoneStep2');
  const zoneStep2Text = document.getElementById('zoneStep2Text');

  function closeZoneModal(){
    zoneBackdrop.classList.remove('show');
  }

  function chooseZone(zone){
    selectedZone = zone;
    if (zone){
      zoneTag.textContent = 'Serving ' + zone;
      zoneTag.classList.add('show');
      zoneStep2Text.textContent = 'Get 15% off your first cleaning in ' + zone + '.';
      zoneStep1.style.display = 'none';
      zoneStep2.style.display = 'block';
    } else {
      closeZoneModal();
    }
  }

  window.addEventListener('load', () => {
    setTimeout(() => zoneBackdrop.classList.add('show'), 350);
  });

  document.querySelectorAll('.zone-btn[data-zone]').forEach(btn => {
    btn.addEventListener('click', () => chooseZone(btn.dataset.zone));
  });
  document.getElementById('zoneSkip').addEventListener('click', () => chooseZone(''));
  document.getElementById('zoneClose').addEventListener('click', closeZoneModal);
  document.getElementById('zoneClaim').addEventListener('click', () => {
    discountClaimed = true;
    closeZoneModal();
    document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
  });
  zoneBackdrop.addEventListener('click', (e) => {
    if (e.target === zoneBackdrop) closeZoneModal();
  });

  // Smooth-scroll every in-page link ourselves, instead of relying on default
  // anchor navigation (which can misbehave inside an embedded preview).
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // FAQ accordion
  document.querySelectorAll('.faq-item').forEach(item => {
    item.querySelector('.faq-q').addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  // Mobile menu toggle
  const burger = document.getElementById('burgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  burger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    burger.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', isOpen);
  });
  // Close mobile menu after tapping any link in it
  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });

  // Before/after gallery: click any photo to view it full-size
  const photoButtons = Array.from(document.querySelectorAll('.ba-pair .photo-btn'));
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  let lightboxIndex = 0;

  function showPhoto(index){
    lightboxIndex = (index + photoButtons.length) % photoButtons.length;
    const btn = photoButtons[lightboxIndex];
    const img = btn.querySelector('img');
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = btn.dataset.caption || img.alt;
  }

  function openLightbox(index){
    showPhoto(index);
    lightbox.classList.add('show');
  }

  function closeLightbox(){
    lightbox.classList.remove('show');
  }

  photoButtons.forEach((btn, index) => {
    btn.addEventListener('click', () => openLightbox(index));
  });
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightboxPrev').addEventListener('click', () => showPhoto(lightboxIndex - 1));
  document.getElementById('lightboxNext').addEventListener('click', () => showPhoto(lightboxIndex + 1));
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('show')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showPhoto(lightboxIndex - 1);
    if (e.key === 'ArrowRight') showPhoto(lightboxIndex + 1);
  });

  // Pill-button groups (bedrooms, bathrooms, home type): single-select,
  // click the active one again to clear it — every field here is optional.
  let selectedBedrooms = '';
  let selectedBathrooms = '';
  let selectedHomeType = '';

  function setupPillGroup(groupId, onSelect) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wasActive = btn.classList.contains('active');
        group.querySelectorAll('.pill-btn').forEach((b) => b.classList.remove('active'));
        if (!wasActive) {
          btn.classList.add('active');
          onSelect(btn.dataset.value);
        } else {
          onSelect('');
        }
      });
    });
  }

  setupPillGroup('bedroomsGroup', (value) => { selectedBedrooms = value; });
  setupPillGroup('bathroomsGroup', (value) => { selectedBathrooms = value; });
  setupPillGroup('homeTypeGroup', (value) => { selectedHomeType = value; });

  // Quote request form: validate, then save it to the backend (if
  // configured) or fall back to opening the visitor's email app.
  const form = document.getElementById('quoteForm');
  const note = document.getElementById('formNote');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let valid = true;
    const nameField = document.getElementById('qName').closest('.field');
    const contactField = document.getElementById('qContact').closest('.field');
    nameField.classList.toggle('invalid', document.getElementById('qName').value.trim() === '');
    contactField.classList.toggle('invalid', document.getElementById('qContact').value.trim() === '');
    if (nameField.classList.contains('invalid') || contactField.classList.contains('invalid')) valid = false;

    if (!valid){
      note.textContent = 'Please fill in your name and a way to reach you.';
      note.classList.remove('sent');
      return;
    }

    const name = document.getElementById('qName').value.trim();
    const contact = document.getElementById('qContact').value.trim();
    const service = document.getElementById('qService').value;
    const frequency = document.getElementById('qFrequency').value;
    const message = document.getElementById('qMsg').value.trim();
    const freqDiscounts = { 'Weekly': 15, 'Biweekly': 10, 'Monthly': 10, 'One-time': 0 };
    const discountPct = freqDiscounts[frequency] || 0;

    const backend = window.MagicstickBackend;
    if (backend && backend.isBackendConfigured()) {
      note.textContent = 'Sending your request...';
      note.classList.remove('sent');
      const { error } = await backend.getSupabaseClient().from('quote_requests').insert({
        name,
        contact,
        service,
        frequency,
        zone: selectedZone || null,
        message,
        first_time_offer_claimed: discountClaimed,
        bedrooms: selectedBedrooms || null,
        bathrooms: selectedBathrooms || null,
        home_type: selectedHomeType || null,
      });
      if (!error) {
        form.reset();
        document.querySelectorAll('.pill-btn.active').forEach((b) => b.classList.remove('active'));
        selectedBedrooms = '';
        selectedBathrooms = '';
        selectedHomeType = '';
        note.textContent = "Thanks! Your request is in — we'll get back to you the same day.";
        note.classList.add('sent');
        return;
      }
      console.error('Quote request insert failed, falling back to email:', error);
    }

    const subject = `Free quote request: ${service}`;
    const body =
      `Name: ${name}\n` +
      `Phone or email: ${contact}\n` +
      `Area: ${selectedZone || 'Not specified'}\n` +
      `Frequency: ${frequency}\n` +
      `Service: ${service}\n` +
      `Home: ${selectedHomeType || 'Not specified'}` +
        `${selectedBedrooms ? ', ' + selectedBedrooms + ' bed' : ''}` +
        `${selectedBathrooms ? ', ' + selectedBathrooms + ' bath' : ''}\n` +
      `Discount: ${discountPct > 0 ? discountPct + '% ' + frequency.toLowerCase() + ' discount' : 'None'}\n` +
      `First-time offer: ${discountClaimed ? '15% first cleaning offer claimed' : 'Not claimed'}\n` +
      `Notes: ${message || '(none)'}\n`;

    const mailto = `mailto:magicstickclean@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;

    note.textContent = 'Opening your email app with your request filled in...';
    note.classList.add('sent');
  });
