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
          <span class="human-tick" aria-hidden="true"></span>
          <span class="human-text">${t('form.human.label')}</span>
          <span class="human-shield" aria-hidden="true">🛡️</span>
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
    box.addEventListener('change', () => { if (box.checked) field.classList.remove('invalid'); });

    return function check() {
      if (honeypot.value.trim() !== '') return 'honeypot';
      const tooFast = Date.now() - loadedAt < 2500;
      if (!box.checked || !realGesture || tooFast) {
        if (tooFast && box.checked) box.checked = false;
        field.classList.add('invalid');
        return 'wrong-answer';
      }
      field.classList.remove('invalid');
      return 'ok';
    };
  }

  return { attach };
})();
