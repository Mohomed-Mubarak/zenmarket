// ============================================================
// ZENMARKET — ENVIRONMENT TEMPLATE  (safe to commit)
// ============================================================
// Copy this file to js/env.js and fill in your real values,
// OR run `node build.js` with a populated .env file.
//
// js/env.js is gitignored — never commit real credentials.
// ============================================================

export const ENV = Object.freeze({
  // Supabase — required for production (non-demo) mode
  SUPABASE_URL:        `https://YOUR_PROJECT.supabase.co`,
  SUPABASE_ANON_KEY:   `YOUR_SUPABASE_ANON_KEY`,

  // Demo mode: true = localStorage auth (no Supabase needed, offline-capable)
  DEMO_MODE:           true,

  // Admin login — CHANGE THIS before going live. Min 16 characters recommended.
  ADMIN_EMAIL:         `admin@yourdomain.com`,
  ADMIN_PASSWORD:      `CHANGE_ME_USE_A_STRONG_PASSWORD`,

  // PayHere — use sandbox=true for testing, false for live payments
  PAYHERE_MERCHANT_ID: `YOUR_MERCHANT_ID`,
  PAYHERE_SANDBOX:     true,

  // WhatsApp numbers (international format, no leading +)
  WA_PHONE:            `94771234567`,
  WA_PHONE_2:          `94751234567`,

  // PostHog analytics — leave blank to disable
  POSTHOG_KEY:         ``,
  POSTHOG_HOST:        `https://app.posthog.com`,

  // EmailJS — leave blank to disable contact form emails
  EMAILJS_PUBLIC_KEY:  ``,
  EMAILJS_SERVICE_ID:  ``,
  EMAILJS_TEMPLATE_ID: ``,
  EMAILJS_ADMIN_EMAIL: `admin@yourdomain.com`,
});
