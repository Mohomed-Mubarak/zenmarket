/* ============================================================
   ZENMARKET — SUPABASE DATA LAYER  (v29 — Production)
   ============================================================
   This module provides the same API as js/store.js but reads
   from / writes to Supabase (PostgreSQL) instead of localStorage.

   USAGE:
     import { getProducts, saveOrder } from './supabase-store.js';

   DEMO_MODE vs PRODUCTION:
     js/store.js     → localStorage (DEMO_MODE=true, default)
     this file       → Supabase     (DEMO_MODE=false, production)

   The calling code in shop.js, product.js, checkout.js etc. should
   import from the correct module based on DEMO_MODE, or use the
   unified adapter in store-adapter.js (recommended).

   SUPABASE TABLE SETUP:
     Run the SQL in ZENMARKET.md § 20 "Supabase Production Database"
     before using this module.
   ============================================================ */

import { getSupabase, query, querySafe } from './supabase.js';

// ── Products ──────────────────────────────────────────────────────

/**
 * Fetch all active products.
 * @param {{ category?: string, limit?: number, featured?: boolean }} opts
 * @returns {Promise<object[]>}
 */
export async function getProducts({ category, limit, featured } = {}) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not initialised');

  let q = sb
    .from('products')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (category) q = q.eq('category_slug', category);
  if (featured)  q = q.eq('featured', true);
  if (limit)     q = q.limit(limit);

  return query(q);
}

/**
 * Fetch a single product by slug or id.
 * @param {{ slug?: string, id?: string }} opts
 * @returns {Promise<object|null>}
 */
export async function getProduct({ slug, id } = {}) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not initialised');

  let q = sb.from('products').select('*').eq('active', true);
  if (slug) q = q.eq('slug', slug).single();
  else if (id) q = q.eq('id', id).single();
  else throw new Error('getProduct requires slug or id');

  return querySafe(q);
}

/**
 * Search products by name (case-insensitive partial match).
 * @param {string} term
 * @param {{ limit?: number }} opts
 * @returns {Promise<object[]>}
 */
export async function searchProducts(term, { limit = 20 } = {}) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not initialised');

  return query(
    sb.from('products')
      .select('*')
      .eq('active', true)
      .or(`name.ilike.%${term}%,description.ilike.%${term}%,tags.cs.{${term}}`)
      .limit(limit)
  );
}

/**
 * Decrement stock after a successful order.
 * Called server-side via the PayHere webhook or after payment confirmation.
 * @param {{ productId: string, qty: number }[]} items
 */
export async function decrementStock(items) {
  const sb = getSupabase();
  if (!sb) return;

  await Promise.all(
    items.map(({ productId, qty }) =>
      sb.rpc('decrement_stock', { product_id: productId, amount: qty })
    )
  );
}

// ── Orders ────────────────────────────────────────────────────────

/**
 * Save a new order to Supabase.
 * @param {object} order
 * @returns {Promise<object>} Saved order row
 */
export async function saveOrder(order) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not initialised');

  const { data, error } = await sb
    .from('orders')
    .insert({
      ...order,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Fetch orders for the currently logged-in customer.
 * @returns {Promise<object[]>}
 */
export async function getMyOrders() {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not initialised');

  return query(
    sb.from('orders')
      .select('*')
      .order('created_at', { ascending: false })
  );
}

/**
 * Fetch a single order by ID.
 * @param {string} orderId
 * @returns {Promise<object|null>}
 */
export async function getOrder(orderId) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not initialised');

  return querySafe(
    sb.from('orders').select('*').eq('id', orderId).single()
  );
}

// ── Categories ────────────────────────────────────────────────────

/**
 * Fetch all active categories.
 * @returns {Promise<object[]>}
 */
export async function getCategories() {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not initialised');

  return query(
    sb.from('categories').select('*').order('name', { ascending: true })
  );
}

// ── Coupons ───────────────────────────────────────────────────────

/**
 * Look up a coupon by code and validate it.
 * @param {string} code
 * @returns {Promise<object|null>}
 */
export async function getCoupon(code) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not initialised');

  const coupon = await querySafe(
    sb.from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('active', true)
      .single()
  );

  if (!coupon) return null;

  // Check expiry
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return null;
  }

  // Check usage limit
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
    return null;
  }

  return coupon;
}

/**
 * Increment a coupon's used_count after successful order.
 * @param {string} couponCode
 */
export async function incrementCouponUsage(couponCode) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.rpc('increment_coupon_usage', { coupon_code: couponCode });
}

// ── Shipping Zones ────────────────────────────────────────────────

/**
 * Fetch all shipping zones.
 * @returns {Promise<object[]>}
 */
export async function getShippingZones() {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not initialised');

  return query(sb.from('shipping_zones').select('*').order('rate', { ascending: true }));
}

// ── Reviews ───────────────────────────────────────────────────────

/**
 * Fetch approved reviews for a product.
 * @param {string} productId
 * @returns {Promise<object[]>}
 */
export async function getProductReviews(productId) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not initialised');

  return query(
    sb.from('reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('approved', true)
      .order('created_at', { ascending: false })
  );
}

/**
 * Submit a new product review.
 * @param {object} review
 * @returns {Promise<object>}
 */
export async function submitReview(review) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not initialised');

  const { data, error } = await sb
    .from('reviews')
    .insert({
      ...review,
      approved:   false,
      rejected:   false,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ── Customer Profile ──────────────────────────────────────────────

/**
 * Fetch the current user's profile.
 * @returns {Promise<object|null>}
 */
export async function getProfile() {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not initialised');

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  return querySafe(
    sb.from('profiles').select('*').eq('id', user.id).single()
  );
}

/**
 * Update the current user's profile.
 * @param {{ name?: string, phone?: string }} updates
 * @returns {Promise<object>}
 */
export async function updateProfile(updates) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not initialised');

  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await sb
    .from('profiles')
    .upsert({ id: user.id, ...updates })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ── Contact Messages ──────────────────────────────────────────────

/**
 * Save a contact form submission.
 * @param {object} msg
 * @returns {Promise<object>}
 */
export async function saveContactMessage(msg) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not initialised');

  const { data, error } = await sb
    .from('contact_messages')
    .insert({ ...msg, read: false, created_at: new Date().toISOString() })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ── Supabase SQL Functions (run once in SQL editor) ───────────────
/*
  -- Required for decrementStock() and incrementCouponUsage() above:

  CREATE OR REPLACE FUNCTION decrement_stock(product_id text, amount integer)
  RETURNS void LANGUAGE sql AS $$
    UPDATE products
    SET stock = GREATEST(0, stock - amount), updated_at = now()
    WHERE id = product_id;
  $$;

  CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_code text)
  RETURNS void LANGUAGE sql AS $$
    UPDATE coupons
    SET used_count = used_count + 1
    WHERE code = coupon_code;
  $$;
*/
