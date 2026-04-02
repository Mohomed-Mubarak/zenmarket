/* ============================================================
   ZENMARKET — STORE ADAPTER  (v29 — Full Stack)
   ============================================================
   Unified data access layer that routes to the correct backend:

   DEMO_MODE=true  → js/store.js      (localStorage, works offline)
   DEMO_MODE=false → js/supabase-store.js (PostgreSQL via Supabase)

   USAGE (replace direct store.js imports with this module):

     // Before:
     import { getProducts, saveOrder } from './store.js';

     // After:
     import { getProducts, saveOrder } from './store-adapter.js';

   The adapter exports the same function names as both backends,
   so switching is a one-line import change per file.

   ASYNC NOTE:
     In DEMO_MODE, store.js functions are synchronous.
     In production, supabase-store.js functions are async.
     The adapter wraps demo functions in Promise.resolve() so
     callers can always use await safely.
   ============================================================ */

import { DEMO_MODE } from './config.js';

// ── Dynamic import based on mode ─────────────────────────────────

let _store = null;

async function getStore() {
  if (_store) return _store;
  if (DEMO_MODE) {
    _store = await import('./store.js');
  } else {
    _store = await import('./supabase-store.js');
  }
  return _store;
}

// ── Helper to wrap sync demo functions as async ───────────────────

function wrap(fn) {
  return async (...args) => {
    const store = await getStore();
    const result = store[fn]?.(...args);
    return result instanceof Promise ? result : Promise.resolve(result);
  };
}

// ── Products ──────────────────────────────────────────────────────

export const getProducts      = wrap('getProducts');
export const getProduct       = wrap('getProduct');
export const searchProducts   = wrap('searchProducts');
export const decrementStock   = wrap('decrementStock');

// ── Orders ────────────────────────────────────────────────────────

export const saveOrder    = wrap('saveOrder');
export const getMyOrders  = wrap('getMyOrders');
export const getOrder     = wrap('getOrder');

// ── Categories ────────────────────────────────────────────────────

export const getCategories = wrap('getCategories');

// ── Coupons ───────────────────────────────────────────────────────

export const getCoupon             = wrap('getCoupon');
export const incrementCouponUsage  = wrap('incrementCouponUsage');

// ── Shipping ──────────────────────────────────────────────────────

export const getShippingZones = wrap('getShippingZones');

// ── Reviews ───────────────────────────────────────────────────────

export const getProductReviews = wrap('getProductReviews');
export const submitReview      = wrap('submitReview');

// ── Profile ───────────────────────────────────────────────────────

export const getProfile    = wrap('getProfile');
export const updateProfile = wrap('updateProfile');

// ── Contact ───────────────────────────────────────────────────────

export const saveContactMessage = wrap('saveContactMessage');

// ── Mode info ─────────────────────────────────────────────────────

export const IS_DEMO = DEMO_MODE;

export function getDataMode() {
  return DEMO_MODE ? 'localStorage (demo)' : 'Supabase (production)';
}
