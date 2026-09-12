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

// Close/back button: return to wherever the visitor came from, or home.
const quoteClose = document.getElementById('quoteClose');
if (quoteClose) {
  quoteClose.addEventListener('click', (e) => {
    if (window.history.length > 1) {
      e.preventDefault();
      window.history.back();
    }
  });
}

// Zone selector: which area, then a first-time-client discount message.
// Landing on this page already signals intent (the visitor clicked "Get a
// quote"), so the card shows automatically, once, shortly after arriving.
let selectedZone = '';
let discountClaimed = false;
const zoneBackdrop = document.getElementById('zoneBackdrop');
const zoneTag = document.getElementById('zoneTag');
const zoneStep1 = document.getElementById('zoneStep1');
const zoneStep2 = document.getElementById('zoneStep2');
const zoneStep2Text = document.getElementById('zoneStep2Text');
const zoneStep3 = document.getElementById('zoneStep3');

function closeZoneModal(){
  zoneBackdrop.classList.remove('show');
}

let zoneModalShown = false;
function maybeShowZoneModal(){
  if (zoneModalShown) return;
  zoneModalShown = true;
  setTimeout(() => zoneBackdrop.classList.add('show'), 300);
}
window.addEventListener('load', maybeShowZoneModal);
// Inside the bundled single-file preview, pages are toggled in place rather
// than fully reloaded, so window's "load" event never fires again — this
// custom event (dispatched by that preview's router) covers that case.
document.addEventListener('spa:pageshown', (e) => {
  if (e.detail && e.detail.page === 'quote') maybeShowZoneModal();
});

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

document.querySelectorAll('.zone-btn[data-zone]').forEach(btn => {
  btn.addEventListener('click', () => chooseZone(btn.dataset.zone));
});
document.getElementById('zoneSkip').addEventListener('click', () => chooseZone(''));
document.getElementById('zoneClose').addEventListener('click', closeZoneModal);
document.getElementById('zoneDismiss').addEventListener('click', closeZoneModal);
document.getElementById('zoneClaim').addEventListener('click', () => {
  zoneStep2.style.display = 'none';
  zoneStep3.style.display = 'block';
});
document.getElementById('zoneLeadForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const nameInput = document.getElementById('zName');
  const contactInput = document.getElementById('zContact');
  const nameField = nameInput.closest('.field');
  const contactField = contactInput.closest('.field');
  nameField.classList.toggle('invalid', nameInput.value.trim() === '');
  contactField.classList.toggle('invalid', contactInput.value.trim() === '');
  if (nameField.classList.contains('invalid') || contactField.classList.contains('invalid')) return;

  discountClaimed = true;
  document.getElementById('qName').value = nameInput.value.trim();
  document.getElementById('qContact').value = contactInput.value.trim();
  closeZoneModal();
  document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
});
zoneBackdrop.addEventListener('click', (e) => {
  if (e.target === zoneBackdrop) closeZoneModal();
});

// Preferred day: custom calendar dropdown (see js/date-picker.js) instead of
// the native <input type="date">, with every past day greyed out.
const qDateDisplay = document.getElementById('qDateDisplay');
const qDateHidden = document.getElementById('qDate');
if (qDateDisplay && qDateHidden && window.MagicstickDatePicker) {
  window.MagicstickDatePicker.attach(qDateDisplay, qDateHidden);
}

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

// Optional account connection, shown above the quote form: a customer can
// sign in (or create an account) to see this request later under
// "My account" — or just continue as a guest. Never blocks submitting.
let quoteCustomerId = null;
const quoteAuthCard = document.getElementById('quoteAuthCard');
const quoteSignedIn = document.getElementById('quoteSignedIn');
const backendForAuth = window.MagicstickBackend;

function fillContactFromUser(user) {
  const nameInput = document.getElementById('qName');
  const contactInput = document.getElementById('qContact');
  if (!nameInput.value.trim()) nameInput.value = user.user_metadata?.full_name || '';
  if (!contactInput.value.trim()) contactInput.value = user.email || '';
}

function showSignedIn(user) {
  quoteCustomerId = user.id;
  quoteAuthCard.hidden = true;
  quoteSignedIn.hidden = false;
  document.getElementById('quoteSignedInEmail').textContent = user.email;
  fillContactFromUser(user);
}

function showGuestAuthCard() {
  quoteCustomerId = null;
  quoteSignedIn.hidden = true;
  quoteAuthCard.hidden = false;
}

if (backendForAuth && backendForAuth.isBackendConfigured() && quoteAuthCard) {
  const supabaseForAuth = backendForAuth.getSupabaseClient();

  window.MagicstickAuthWidget.initAuthWidget(document, {
    tabs: '#quoteAuthCard .portal-tab',
    loginForm: '#qaLoginForm',
    loginEmail: '#qaLoginEmail',
    loginPassword: '#qaLoginPassword',
    loginNote: '#qaLoginNote',
    forgotBtn: '#qaForgotPasswordBtn',
    signupForm: '#qaSignupForm',
    signupName: '#qaSignupName',
    signupEmail: '#qaSignupEmail',
    signupPassword: '#qaSignupPassword',
    signupNote: '#qaSignupNote',
    googleBtn: '#qaGoogleOAuthBtn',
    appleBtn: '#qaAppleOAuthBtn',
  }, supabaseForAuth, showSignedIn);

  document.getElementById('qaContinueGuest').addEventListener('click', () => {
    quoteAuthCard.hidden = true;
  });

  document.getElementById('quoteSwitchAccount').addEventListener('click', async () => {
    await supabaseForAuth.auth.signOut();
    showGuestAuthCard();
  });

  supabaseForAuth.auth.getSession().then(({ data }) => {
    if (data?.session?.user) {
      showSignedIn(data.session.user);
    } else {
      quoteAuthCard.hidden = false;
    }
  });
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
      customer_id: quoteCustomerId,
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
