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

  const t = (key, vars) => (window.MagicstickI18N ? window.MagicstickI18N.t(key, vars) : key);

  function chooseZone(zone){
    selectedZone = zone;
    if (zone){
      zoneTag.textContent = t('zone.tagPrefix', { zone });
      zoneTag.classList.add('show');
      zoneStep2Text.textContent = t('zone.desc2Zone', { zone });
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
  document.getElementById('zoneDismiss').addEventListener('click', closeZoneModal);
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
    const btn = item.querySelector('.faq-q');
    btn.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => {
        i.classList.remove('open');
        const b = i.querySelector('.faq-q');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Services accordion: click a service to see what's included
  document.querySelectorAll('.service-item').forEach(item => {
    const btn = item.querySelector('.service-row');
    btn.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.service-item.open').forEach(i => {
        i.classList.remove('open');
        const b = i.querySelector('.service-row');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
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
    lightboxCaption.textContent = btn.dataset.captionKey ? t(btn.dataset.captionKey) : img.alt;
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

  // Preferred day: just a plain date input, can't be in the past.
  const qDateInput = document.getElementById('qDate');
  if (qDateInput) qDateInput.min = new Date().toISOString().slice(0, 10);

  // Pill-button groups (bedrooms, bathrooms, home type, pets): single-select,
  // click the active one again to clear it — every field here is optional.
  let selectedBedrooms = '';
  let selectedBathrooms = '';
  let selectedHomeType = '';
  let selectedPets = '';

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
  setupPillGroup('petsGroup', (value) => { selectedPets = value; });

  // Photo/video attachments on the quote form. Kept as plain File objects
  // until submit — only uploaded to storage if the backend is configured.
  const MAX_PHOTOS = 6;
  const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
  const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
  let selectedPhotos = [];
  let selectedVideo = null;

  function formatFileSize(bytes) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function renderFileList(listEl, files, onRemove) {
    listEl.innerHTML = '';
    files.forEach((file, index) => {
      const li = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = `${file.name} (${formatFileSize(file.size)})`;
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'file-remove';
      removeBtn.innerHTML = '&times;';
      removeBtn.addEventListener('click', () => onRemove(index));
      li.appendChild(label);
      li.appendChild(removeBtn);
      listEl.appendChild(li);
    });
  }

  const qPhotosInput = document.getElementById('qPhotos');
  const qPhotosList = document.getElementById('qPhotosList');
  const qPhotosNote = document.getElementById('qPhotosNote');

  function renderPhotos() {
    renderFileList(qPhotosList, selectedPhotos, (index) => {
      selectedPhotos.splice(index, 1);
      renderPhotos();
    });
  }

  qPhotosInput.addEventListener('change', () => {
    qPhotosNote.hidden = true;
    const incoming = Array.from(qPhotosInput.files || []);
    for (const file of incoming) {
      if (selectedPhotos.length >= MAX_PHOTOS) {
        qPhotosNote.textContent = t('form.photos.tooMany');
        qPhotosNote.classList.add('error');
        qPhotosNote.hidden = false;
        break;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        qPhotosNote.textContent = t('form.photos.tooBig', { name: file.name });
        qPhotosNote.classList.add('error');
        qPhotosNote.hidden = false;
        continue;
      }
      selectedPhotos.push(file);
    }
    qPhotosInput.value = '';
    renderPhotos();
  });

  const qVideoInput = document.getElementById('qVideo');
  const qVideoList = document.getElementById('qVideoList');
  const qVideoNote = document.getElementById('qVideoNote');

  function renderVideo() {
    renderFileList(qVideoList, selectedVideo ? [selectedVideo] : [], () => {
      selectedVideo = null;
      renderVideo();
    });
  }

  qVideoInput.addEventListener('change', () => {
    qVideoNote.hidden = true;
    const file = qVideoInput.files && qVideoInput.files[0];
    qVideoInput.value = '';
    if (!file) return;
    if (file.size > MAX_VIDEO_BYTES) {
      qVideoNote.textContent = t('form.video.tooBig', { name: file.name });
      qVideoNote.classList.add('error');
      qVideoNote.hidden = false;
      return;
    }
    selectedVideo = file;
    renderVideo();
  });

  function makeId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async function uploadQuoteFiles(supabase, quoteId) {
    const photoPaths = [];
    let videoPath = null;
    for (let i = 0; i < selectedPhotos.length; i++) {
      const file = selectedPhotos[i];
      const path = `${quoteId}/photo-${i}-${file.name}`;
      const { error } = await supabase.storage.from('quote-uploads').upload(path, file);
      if (!error) photoPaths.push(path);
    }
    if (selectedVideo) {
      const path = `${quoteId}/video-${selectedVideo.name}`;
      const { error } = await supabase.storage.from('quote-uploads').upload(path, selectedVideo);
      if (!error) videoPath = path;
    }
    return { photoPaths, videoPath };
  }

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
      note.textContent = t('form.note.invalid');
      note.classList.remove('sent');
      return;
    }

    const name = document.getElementById('qName').value.trim();
    const contact = document.getElementById('qContact').value.trim();
    const service = document.getElementById('qService').value;
    const frequency = document.getElementById('qFrequency').value;
    const message = document.getElementById('qMsg').value.trim();
    const preferredDate = document.getElementById('qDate').value;
    const freqDiscounts = { 'Weekly': 15, 'Biweekly': 10, 'Monthly': 10, 'One-time': 0 };
    const freqLowerKeys = { 'Weekly': 'freq.weekly.lower', 'Biweekly': 'freq.biweekly.lower', 'Monthly': 'freq.monthly.lower', 'One-time': 'freq.oneTime.lower' };
    const discountPct = freqDiscounts[frequency] || 0;

    const backend = window.MagicstickBackend;
    if (backend && backend.isBackendConfigured()) {
      const supabase = backend.getSupabaseClient();
      const quoteId = makeId();
      let uploadsFailed = false;
      let photoPaths = [];
      let videoPath = null;

      if (selectedPhotos.length || selectedVideo) {
        note.textContent = t('form.note.uploading');
        note.classList.remove('sent');
        const attemptedPhotos = selectedPhotos.length;
        const attemptedVideo = Boolean(selectedVideo);
        const result = await uploadQuoteFiles(supabase, quoteId);
        photoPaths = result.photoPaths;
        videoPath = result.videoPath;
        if (photoPaths.length < attemptedPhotos || (attemptedVideo && !videoPath)) uploadsFailed = true;
      }

      note.textContent = t('form.note.sending');
      note.classList.remove('sent');
      const { error } = await supabase.from('quote_requests').insert({
        id: quoteId,
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
        preferred_date: preferredDate || null,
        pets: selectedPets || null,
        photo_paths: photoPaths,
        video_path: videoPath,
      });
      if (!error) {
        form.reset();
        document.querySelectorAll('.pill-btn.active').forEach((b) => b.classList.remove('active'));
        selectedBedrooms = '';
        selectedBathrooms = '';
        selectedHomeType = '';
        selectedPets = '';
        selectedPhotos = [];
        selectedVideo = null;
        renderPhotos();
        renderVideo();
        note.textContent = uploadsFailed ? t('form.note.uploadFailed') : t('form.note.success');
        note.classList.add('sent');
        return;
      }
      console.error('Quote request insert failed, falling back to email:', error);
    }

    const homeParts = [selectedBedrooms && `${selectedBedrooms} ${t('bed.suffix')}`, selectedBathrooms && `${selectedBathrooms} ${t('bath.suffix')}`].filter(Boolean);
    const homeLine = (selectedHomeType || t('common.notSpecified')) + (homeParts.length ? ', ' + homeParts.join(', ') : '');
    const discountLine = discountPct > 0
      ? t('mail.discount.pct', { pct: discountPct, frequency: t(freqLowerKeys[frequency]) })
      : t('mail.discount.none');

    const subject = t('mail.subject.quote', { service });
    const body =
      `${t('mail.label.name')}: ${name}\n` +
      `${t('mail.label.contact')}: ${contact}\n` +
      `${t('mail.label.area')}: ${selectedZone || t('common.notSpecified')}\n` +
      `${t('mail.label.frequency')}: ${frequency}\n` +
      `${t('mail.label.service')}: ${service}\n` +
      `${t('mail.label.home')}: ${homeLine}\n` +
      `${t('mail.label.preferredDay')}: ${preferredDate || t('common.notSpecified')}\n` +
      `${t('mail.label.pets')}: ${selectedPets || t('common.notSpecified')}\n` +
      `${t('mail.label.discount')}: ${discountLine}\n` +
      `${t('mail.label.firstTimeOffer')}: ${discountClaimed ? t('mail.discount.claimed') : t('mail.discount.notClaimed')}\n` +
      `${t('mail.label.notes')}: ${message || t('common.none')}\n`;

    const mailto = `mailto:magicstickclean@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;

    if (selectedPhotos.length || selectedVideo) {
      note.textContent = t('form.note.filesNeedBackend');
    } else {
      note.textContent = t('form.note.opening');
    }
    note.classList.add('sent');
  });
