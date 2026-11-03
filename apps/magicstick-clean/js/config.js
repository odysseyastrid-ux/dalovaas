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
  // Online card payments (booking deposit, gift-card purchase). Off until the
  // Stripe account is activated and one real payment has gone through end to
  // end: meanwhile booking.html sends a free booking request and gift cards
  // are ordered through the request form (paid by e-transfer).
  ONLINE_PAYMENTS: false,
};
