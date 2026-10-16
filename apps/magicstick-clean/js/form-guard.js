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
  function attach(container) {
    const a = 1 + Math.floor(Math.random() * 8);
    const b = 1 + Math.floor(Math.random() * 8);
    const answer = a + b;
    const uid = 'fg' + Math.random().toString(36).slice(2, 8);

    container.innerHTML = `
      <div class="hp-field" aria-hidden="true">
        <label>Leave this field blank
          <input type="text" name="website" id="${uid}-hp" tabindex="-1" autocomplete="off">
        </label>
      </div>
      <div class="field security-question">
        <label for="${uid}-answer">${t('form.security.question', { a, b })}</label>
        <input type="text" id="${uid}-answer" inputmode="numeric" autocomplete="off" placeholder="${t('form.security.placeholder')}" required>
        <span class="err">${t('form.security.error')}</span>
      </div>
    `;

    const honeypot = container.querySelector(`#${uid}-hp`);
    const answerInput = container.querySelector(`#${uid}-answer`);
    const answerField = answerInput.closest('.field');

    return function check() {
      if (honeypot.value.trim() !== '') return 'honeypot';
      const given = parseInt(answerInput.value.trim(), 10);
      if (given !== answer) {
        answerField.classList.add('invalid');
        return 'wrong-answer';
      }
      answerField.classList.remove('invalid');
      return 'ok';
    };
  }

  return { attach };
})();
