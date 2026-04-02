/* ============================================================
   ZENMARKET — ADMIN API CLIENT  (v29 — Full Stack)
   ============================================================
   Client-side helper for calling the Vercel Serverless Functions
   at /api/admin/*.

   Handles auth headers, error parsing, and JSON serialisation.
   Used by admin JS files when DEMO_MODE=false.

   USAGE:
     import AdminAPI from '../js/admin-api.js';

     const { data } = await AdminAPI.products.list({ page: 1 });
     await AdminAPI.orders.updateStatus('ord-123', 'shipped');
     await AdminAPI.reviews.approve('rev-456');
   ============================================================ */

import { DEMO_MODE } from './config.js';

// ── Token management ─────────────────────────────────────────────
// The admin token is stored in sessionStorage after admin login.
// It's never put in localStorage to reduce XSS exposure window.

const TOKEN_KEY = 'zm_admin_api_token';

export function setAdminToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getAdminToken() {
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

export function clearAdminToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

// ── Core fetch wrapper ────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  if (DEMO_MODE) {
    throw new Error('Admin API is not available in demo mode. Set DEMO_MODE=false.');
  }

  const token = getAdminToken();
  const url   = path.startsWith('/') ? path : `/${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      'X-Admin-Token': token,
      ...(options.headers || {}),
    },
  });

  let body;
  try { body = await response.json(); }
  catch { body = {}; }

  if (!response.ok) {
    const msg = body.error || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  return body;
}

// ── Products ──────────────────────────────────────────────────────

const products = {
  list: ({ page = 1, limit = 50, search = '', category = '' } = {}) => {
    const params = new URLSearchParams({ page, limit, search, category });
    return apiFetch(`/api/admin/products?${params}`);
  },

  create: (product) => apiFetch('/api/admin/products', {
    method: 'POST',
    body:   JSON.stringify(product),
  }),

  update: (id, updates) => apiFetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body:   JSON.stringify(updates),
  }),

  delete: (id) => apiFetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }),
};

// ── Orders ────────────────────────────────────────────────────────

const orders = {
  list: (filters = {}) => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''))
    );
    return apiFetch(`/api/admin/orders?${params}`);
  },

  updateStatus: (id, status, extra = {}) => apiFetch(
    `/api/admin/orders?id=${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify({ status, ...extra }) }
  ),

  updatePayment: (id, paymentStatus, extra = {}) => apiFetch(
    `/api/admin/orders?id=${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify({ payment_status: paymentStatus, ...extra }) }
  ),
};

// ── Reviews ───────────────────────────────────────────────────────

const reviews = {
  list: ({ page = 1, limit = 20, status = 'pending' } = {}) => {
    const params = new URLSearchParams({ page, limit, status });
    return apiFetch(`/api/admin/reviews?${params}`);
  },

  approve: (id) => apiFetch(`/api/admin/reviews?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body:   JSON.stringify({ action: 'approve' }),
  }),

  reject: (id) => apiFetch(`/api/admin/reviews?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body:   JSON.stringify({ action: 'reject' }),
  }),

  delete: (id) => apiFetch(`/api/admin/reviews?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }),
};

// ── WhatsApp ──────────────────────────────────────────────────────

const whatsapp = {
  notifyNewOrder: (order) => apiFetch('/api/whatsapp', {
    method: 'POST',
    body:   JSON.stringify({ type: 'new_order', order }),
  }),

  notifyStatusUpdate: (order, phone, newStatus) => apiFetch('/api/whatsapp', {
    method: 'POST',
    body:   JSON.stringify({ type: 'status_update', order, phone, newStatus }),
  }),
};

// ── Health ────────────────────────────────────────────────────────

const health = {
  check: () => apiFetch('/api/health'),
};

// ── Exports ───────────────────────────────────────────────────────

const AdminAPI = { products, orders, reviews, whatsapp, health };

export default AdminAPI;
