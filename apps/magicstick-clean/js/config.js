// Fill these in once you've created the Supabase + Stripe projects — see
// SETUP.md. Leaving them blank keeps the site fully working as a
// quote-request-only, no-backend site (the forms fall back to email).
window.MAGICSTICK_CONFIG = {
  SUPABASE_URL: "https://siqpcnhfpseorjuwfrop.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_6zNlOOQPq75Cm4rijZNoqg_EVdTpk5T",
  STRIPE_PUBLISHABLE_KEY: "pk_live_51UFjOM9onWXuh0tc6yuTyzLcTqGuuGdN7gjRXlRVYd824okYTcOms3eN9ePRDIsDLWLSxH9AjWmznCn0csmdt9iQ00aLW9vxqp",
  // Base URL of the deployed edge functions, e.g.
  // "https://YOUR-PROJECT-REF.supabase.co/functions/v1"
  FUNCTIONS_URL: "https://siqpcnhfpseorjuwfrop.supabase.co/functions/v1",
  // Online card payments (paying a quote on pay.html, gift-card purchase). Off
  // until the Stripe account is activated and one real payment has gone
  // through end to end: meanwhile pay.html shows Interac e-Transfer and gift
  // cards are ordered through the request form. Card on pay.html also needs
  // the Supabase secret QUOTE_CARD_PAYMENTS = "on" (quote-pay function).
  ONLINE_PAYMENTS: false,
  // Gift cards are bought and paid by card right on gift-cards.html (owner's
  // decision, Nov 16 2026); the card is emailed automatically once Stripe
  // confirms the payment. Set to false to go back to the request form.
  GIFT_CARD_PAYMENTS: true,
};
