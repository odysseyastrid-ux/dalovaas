// Lightweight anti-spam guard for the public forms that write straight to
// Supabase (or fall back to a mailto:) with no server in front of them to
// rate-limit or CAPTCHA-gate: quote.html, careers.html, gift-cards.html.
// A honeypot field plus a small arithmetic question. Neither stops a
// determined attacker who reads this file, but both block the bulk of
// generic automated form-spam, which is the realistic threat against an
// endpoint anyone with the public anon key can already write to directly.
window.MagicstickFormGuard = (function () {
  const t = (key, vars) => (window.MagicstickI18N ? window.MagicstickI18N.t(key, vars) : key);

  // Renders the honeypot + security-question markup into `container` and
  // returns a `check()` function to call at submit time:
  //   'ok'            — looks human, proceed with the real submit.
  //   'honeypot'      — the hidden field got filled in (a bot did it) —
  //                     the caller should show its normal success state
  //                     without actually sending anything, so the bot
  //                     doesn't learn it was caught.
  //   'wrong-answer'  — a person answered the question incorrectly —
  //                     the caller should show a validation error and
  //                     let them retry, same as any other required field.
  // "I'm not a robot" box (owner's request, Nov 2026; replaces the arithmetic
  // question). A bot that fills the form instantly or ticks the box without a
  // real click/keypress is treated like a wrong answer. Not Google reCAPTCHA:
  // real server-side CAPTCHA would need keys from the owner (see AGENTS.md).
  function attach(container) {
    const uid = 'fg' + Math.random().toString(36).slice(2, 8);
    const loadedAt = Date.now();
    container.innerHTML = `
      <div class="hp-field" aria-hidden="true">
        <label>Leave this field blank
          <input type="text" name="website" id="${uid}-hp" tabindex="-1" autocomplete="off">
        </label>
      </div>
      <div class="field human-check">
        <label class="human-box" for="${uid}-human">
          <input type="checkbox" id="${uid}-human">
          <span class="human-tick" aria-hidden="true">
            <svg class="human-ring" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12"/></svg>
            <svg class="human-check-icon" viewBox="0 0 28 28"><path d="M8 14.5l4 4 8-9"/></svg>
          </span>
          <span class="human-copy">
            <span class="human-text">${t('form.human.label')}</span>
            <span class="human-status" aria-live="polite"></span>
          </span>
          <svg class="human-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
        </label>
        <span class="err">${t('form.human.error')}</span>
      </div>
    `;

    const honeypot = container.querySelector(`#${uid}-hp`);
    const box = container.querySelector(`#${uid}-human`);
    const field = box.closest('.field');
    let realGesture = false;
    const mark = (e) => { if (e.isTrusted) realGesture = true; };
    box.addEventListener('pointerdown', mark);
    box.addEventListener('keydown', mark);
    container.querySelector('.human-box').addEventListener('pointerdown', mark);
    // A short "verifying" beat, then the check draws itself: it reads as a
    // real check without making anyone wait.
    const label = container.querySelector('.human-box');
    const status = container.querySelector('.human-status');
    let timer = null;
    box.addEventListener('change', () => {
      clearTimeout(timer);
      label.classList.remove('is-verifying', 'is-verified');
      status.textContent = '';
      if (!box.checked) return;
      field.classList.remove('invalid');
      label.classList.add('is-verifying');
      status.textContent = t('form.human.verifying');
      timer = setTimeout(() => {
        label.classList.remove('is-verifying');
        label.classList.add('is-verified');
        status.textContent = t('form.human.verified');
      }, 650);
    });

    return function check() {
      if (honeypot.value.trim() !== '') return 'honeypot';
      const tooFast = Date.now() - loadedAt < 2500;
      if (!box.checked || !realGesture || tooFast) {
        if (tooFast && box.checked) {
          box.checked = false;
          box.dispatchEvent(new Event('change'));
        }
        field.classList.add('invalid');
        return 'wrong-answer';
      }
      field.classList.remove('invalid');
      return 'ok';
    };
  }

  return { attach };
})();
