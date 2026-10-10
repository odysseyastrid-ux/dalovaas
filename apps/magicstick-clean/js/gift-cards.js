const t = (key, vars) => (window.MagicstickI18N ? window.MagicstickI18N.t(key, vars) : key);
const esc = (v) => (window.MagicstickI18N ? window.MagicstickI18N.escapeHtml(v) : String(v ?? ''));

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

// Gift card request form: validate, then save it and email the team through
// the submit-form function (the email app is only a fallback).
const form = document.getElementById('giftCardForm');
const note = document.getElementById('giftCardNote');
const checkGiftCardFormGuard = window.MagicstickFormGuard
  ? window.MagicstickFormGuard.attach(document.getElementById('giftCardFormGuard'))
  : () => 'ok';
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const guardResult = checkGiftCardFormGuard();
  if (guardResult === 'honeypot') {
    note.textContent = t('giftcards.form.note.opening');
    note.classList.add('sent');
    return;
  }
  if (guardResult === 'wrong-answer') {
    note.textContent = t('form.security.error');
    note.classList.remove('sent');
    return;
  }

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

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  note.textContent = t('giftcards.form.note.sending');
  note.classList.remove('sent');
  const saved = window.MagicstickForms
    ? await window.MagicstickForms.submit('gift_card', { name, contact, amount, recipient, message })
    : false;
  submitBtn.disabled = false;
  if (!saved) {
    if (window.MagicstickForms) window.MagicstickForms.mailFallback(subject, body);
    note.textContent = t('giftcards.form.note.opening');
    note.classList.add('sent');
    return;
  }
  form.reset();
  if (passAmount) passAmount.textContent = '$100';
  note.textContent = t('giftcards.form.note.sent');
  note.classList.add('sent');
});

// ---------- Balance check ----------
const giftCfg = window.MAGICSTICK_CONFIG || {};
const giftFunctionsUrl = giftCfg.FUNCTIONS_URL ? `${giftCfg.FUNCTIONS_URL}/gift-cards` : null;
const giftLang = () => (window.MagicstickI18N ? window.MagicstickI18N.getLang() : 'en');
const giftDollars = (cents) => (cents / 100).toFixed(2);

async function callGiftCards(payload) {
  const res = await fetch(giftFunctionsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

const balanceForm = document.getElementById('balanceForm');
const balanceResult = document.getElementById('balanceResult');
if (balanceForm) {
  balanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('balanceCode');
    const code = input.value.trim();
    if (!code) return;
    balanceResult.className = 'balance-result';
    if (!giftFunctionsUrl) {
      balanceResult.textContent = t('giftcards.balance.unavailable');
      return;
    }
    balanceResult.textContent = t('booking.gift.checking');
    try {
      const { res, data } = await callGiftCards({ action: 'check', code });
      if (res.ok && data.valid) {
        input.value = data.code;
        balanceResult.textContent = t('giftcards.balance.result', { balance: giftDollars(data.balance_cents) });
        balanceResult.classList.add('ok');
      } else {
        balanceResult.textContent = t(res.status === 429 ? 'booking.gift.tooMany' : 'booking.gift.invalid');
        balanceResult.classList.add('error');
      }
    } catch (err) {
      console.error(err);
      balanceResult.textContent = t('booking.gift.error');
      balanceResult.classList.add('error');
    }
  });
}

// ---------- Buy online (Stripe) — falls back to the request form ----------
const giftStripe = (window.Stripe && giftCfg.STRIPE_PUBLISHABLE_KEY && giftFunctionsUrl)
  ? window.Stripe(giftCfg.STRIPE_PUBLISHABLE_KEY)
  : null;
const buyForm = document.getElementById('giftBuyForm');
const buyHead = document.getElementById('giftBuyHead');
const requestHead = document.getElementById('giftRequestHead');
const payForm = document.getElementById('giftPaymentForm');
const successPanel = document.getElementById('giftSuccess');
const showBuyLink = document.getElementById('giftShowBuy');

function showMode(mode) {
  const buying = mode === 'buy';
  buyHead.hidden = !buying;
  buyForm.hidden = !buying;
  requestHead.hidden = buying;
  form.hidden = buying;
  payForm.hidden = true;
  successPanel.hidden = true;
  if (showBuyLink) showBuyLink.hidden = !giftStripe;
}

function showSuccess(message) {
  buyHead.hidden = false;
  requestHead.hidden = true;
  buyForm.hidden = true;
  payForm.hidden = true;
  form.hidden = true;
  document.getElementById('giftSuccessBody').textContent = message;
  successPanel.hidden = false;
  successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

let selectedCents = 10000;
let deliverTo = 'recipient';
let giftElements = null;
let lastPurchase = null;

function currentAmountCents() {
  if (selectedCents !== 'custom') return selectedCents;
  const dollars = Number(document.getElementById('giftCustomAmount').value);
  return Number.isInteger(dollars) && dollars >= 25 && dollars <= 1000 ? dollars * 100 : null;
}

function refreshBuySummary() {
  const cents = currentAmountCents();
  if (passAmount) passAmount.textContent = cents ? `$${cents / 100}` : '$—';
  document.getElementById('giftBuySubmit').textContent = cents
    ? t('giftcards.buy.submit', { amount: giftDollars(cents) })
    : t('giftcards.buy.submitNoAmount');
}

if (giftStripe) {
  document.querySelectorAll('#giftAmountGroup .pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#giftAmountGroup .pill-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCents = btn.dataset.cents === 'custom' ? 'custom' : Number(btn.dataset.cents);
      document.getElementById('giftCustomWrap').hidden = selectedCents !== 'custom';
      if (selectedCents === 'custom') document.getElementById('giftCustomAmount').focus();
      refreshBuySummary();
    });
  });
  document.getElementById('giftCustomAmount').addEventListener('input', refreshBuySummary);

  document.querySelectorAll('#giftDeliverGroup .pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#giftDeliverGroup .pill-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      deliverTo = btn.dataset.deliver;
      document.getElementById('giftRecipientEmailField').hidden = deliverTo !== 'recipient';
    });
  });

  document.getElementById('giftShowRequest').addEventListener('click', () => {
    showMode('request');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  showBuyLink.addEventListener('click', () => {
    showMode('buy');
    buyForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  buyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const buyNote = document.getElementById('giftBuyNote');
    const submitBtn = document.getElementById('giftBuySubmit');
    const nameEl = document.getElementById('giftBuyerName');
    const emailEl = document.getElementById('giftBuyerEmail');
    const recipientEmailEl = document.getElementById('giftRecipientEmail');
    const cents = currentAmountCents();

    const amountField = document.getElementById('giftAmountGroup').closest('.field');
    amountField.classList.toggle('invalid', !cents);
    nameEl.closest('.field').classList.toggle('invalid', !nameEl.value.trim());
    emailEl.closest('.field').classList.toggle('invalid', !emailEl.value.trim() || !emailEl.checkValidity());
    const needRecipientEmail = deliverTo === 'recipient';
    recipientEmailEl.closest('.field').classList.toggle('invalid',
      needRecipientEmail && (!recipientEmailEl.value.trim() || !recipientEmailEl.checkValidity()));
    if (buyForm.querySelector('.field.invalid')) {
      buyNote.textContent = t('giftcards.buy.fixFields');
      return;
    }

    submitBtn.disabled = true;
    buyNote.textContent = t('booking.form.note.settingUp');
    const purchase = {
      action: 'purchase',
      amount_cents: cents,
      purchaser_name: nameEl.value.trim(),
      purchaser_email: emailEl.value.trim(),
      recipient_name: document.getElementById('giftRecipientName').value.trim(),
      recipient_email: needRecipientEmail ? recipientEmailEl.value.trim() : '',
      deliver_to: deliverTo,
      message: document.getElementById('giftMessage').value.trim(),
      company: document.getElementById('giftBuyHp').value,
      lang: giftLang(),
    };
    try {
      const { res, data } = await callGiftCards(purchase);
      if (!res.ok || !data.client_secret) {
        if (data.error === 'stripe_not_configured') {
          showMode('request');
          note.textContent = t('giftcards.buy.unavailable');
          return;
        }
        throw new Error(data.error || 'purchase_failed');
      }
      lastPurchase = purchase;
      buyNote.textContent = '';
      document.getElementById('giftPaymentSummary').innerHTML = `
        <p class="payment-summary-service">${esc(t('giftcards.pay.summaryTitle', { amount: giftDollars(cents) }))}</p>
        <p class="payment-summary-line">${esc(needRecipientEmail
          ? t('giftcards.pay.summaryRecipient', { email: purchase.recipient_email })
          : t('giftcards.pay.summaryMe', { email: purchase.purchaser_email }))}</p>
        <p class="payment-summary-total">${esc(t('giftcards.pay.total', { amount: giftDollars(cents) }))}</p>
      `;
      document.getElementById('giftCardholderName').value = purchase.purchaser_name;
      buyForm.hidden = true;
      payForm.hidden = false;
      payForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      giftElements = giftStripe.elements({
        clientSecret: data.client_secret,
        appearance: {
          theme: 'flat',
          variables: {
            colorPrimary: '#0B5D52', colorBackground: 'transparent', colorText: '#1F2937',
            fontFamily: "'Inter', Arial, sans-serif", borderRadius: '9px',
          },
          rules: {
            '.Input': { backgroundColor: '#F2F2F2', border: '1px solid transparent', padding: '12px' },
            '.Input:focus': { border: '1px solid #0B5D52', boxShadow: 'none' },
            '.Label': { fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '4px' },
          },
        },
      });
      giftElements.create('payment').mount('#giftPaymentElement');
    } catch (err) {
      console.error(err);
      buyNote.textContent = t(err.message === 'rate_limited' ? 'booking.gift.tooMany' : 'booking.form.note.error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.getElementById('giftPayBack').addEventListener('click', () => {
    payForm.hidden = true;
    buyForm.hidden = false;
    document.getElementById('giftPayNote').textContent = '';
  });

  payForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payBtn = document.getElementById('giftPaySubmit');
    const payNote = document.getElementById('giftPayNote');
    const cardholderName = document.getElementById('giftCardholderName').value.trim();
    if (!cardholderName) {
      payNote.textContent = t('booking.payment.note.needName');
      return;
    }
    payBtn.disabled = true;
    payNote.textContent = t('booking.payment.note.processing');
    const { error, paymentIntent } = await giftStripe.confirmPayment({
      elements: giftElements,
      confirmParams: {
        return_url: `${window.location.origin}${window.location.pathname}?gift=success#request`,
        payment_method_data: { billing_details: { name: cardholderName, email: lastPurchase.purchaser_email } },
      },
      redirect: 'if_required',
    });
    if (error) {
      payNote.textContent = error.message || t('booking.payment.note.error');
      payBtn.disabled = false;
      return;
    }
    if (paymentIntent && paymentIntent.status === 'succeeded') {
      showSuccess(lastPurchase.deliver_to === 'recipient'
        ? t('giftcards.success.recipient', { email: lastPurchase.recipient_email, buyer: lastPurchase.purchaser_email })
        : t('giftcards.success.me', { email: lastPurchase.purchaser_email }));
    }
  });

  document.addEventListener('magicstick:langchange', refreshBuySummary);
  showMode('buy');
  refreshBuySummary();
}

if (new URLSearchParams(window.location.search).get('gift') === 'success') {
  showSuccess(t('giftcards.success.generic'));
}
