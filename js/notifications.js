/* ============================================================
   ZENMARKET — USER NOTIFICATIONS
   Stores and retrieves per-user notifications in localStorage.
   Types: welcome | order_success | review_approved
   ============================================================ */

const KEY = 'zm_user_notifications';
const ADMIN_KEY = 'zm_admin_notifications';

// ── Storage helpers ───────────────────────────────────────────

function loadAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

function saveAll(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  dispatchUpdate();
}

function dispatchUpdate() {
  window.dispatchEvent(new CustomEvent('notifications:updated'));
}

// ── Public API ────────────────────────────────────────────────

/** Returns notifications for a specific userId, newest first */
export function getUserNotifications(userId) {
  if (!userId) return [];
  return loadAll()
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/** Returns count of unread notifications for userId */
export function getUnreadCount(userId) {
  return getUserNotifications(userId).filter(n => !n.read).length;
}

/** Add a notification (deduplicates by type+refId within 24h) */
export function addNotification({ userId, type, title, message, refId = null }) {
  if (!userId) return;
  const all = loadAll();

  // Deduplicate: don't add the same type+refId twice within 24 hours
  const recent = Date.now() - 24 * 60 * 60 * 1000;
  const exists = all.some(n =>
    n.userId === userId &&
    n.type   === type   &&
    n.refId  === refId  &&
    new Date(n.createdAt).getTime() > recent
  );
  if (exists) return;

  all.push({
    id:        `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    userId,
    type,      // 'welcome' | 'order_success' | 'review_approved'
    title,
    message,
    refId,     // orderId or reviewId for deep-linking
    read:      false,
    createdAt: new Date().toISOString(),
  });
  saveAll(all);
}

/** Mark a single notification as read */
export function markRead(notifId) {
  const all = loadAll();
  const idx = all.findIndex(n => n.id === notifId);
  if (idx >= 0) { all[idx].read = true; saveAll(all); }
}

/** Mark all notifications for a user as read */
export function markAllRead(userId) {
  const all = loadAll().map(n =>
    n.userId === userId ? { ...n, read: true } : n
  );
  saveAll(all);
}

/** Delete a notification */
export function deleteNotification(notifId) {
  saveAll(loadAll().filter(n => n.id !== notifId));
}

// ── Convenience senders ───────────────────────────────────────

export function sendWelcomeNotification(userId, name) {
  addNotification({
    userId,
    type:    'welcome',
    title:   'Welcome to ZenMarket! 🎉',
    message: `Hi ${name}! Your account is ready. Explore our products and enjoy shopping.`,
    refId:   null,
  });
}

export function sendOrderSuccessNotification(userId, orderId, total) {
  addNotification({
    userId,
    type:    'order_success',
    title:   'Order Placed Successfully ✅',
    message: `Your order #${orderId} has been received. Total: Rs. ${total.toLocaleString()}. We'll update you when it ships.`,
    refId:   orderId,
  });
}

export function sendReviewApprovedNotification(userId, productName) {
  addNotification({
    userId,
    type:    'review_approved',
    title:   'Your Review is Live ⭐',
    message: `Your review for "${productName}" has been approved and is now visible to other shoppers.`,
    refId:   null,
  });
}

export function sendOrderDeliveredNotification(userId, orderId, productNames) {
  addNotification({
    userId,
    type:    'order_delivered',
    title:   'Order Delivered 📦',
    message: `Your order #${orderId} has been marked as delivered! You can now leave reviews for your purchased items.`,
    refId:   orderId,
  });
}

export function sendPaymentConfirmedNotification(userId, orderId, total) {
  addNotification({
    userId,
    type:    'payment_confirmed',
    title:   'Payment Confirmed ✅',
    message: `Your payment of Rs. ${total.toLocaleString()} for order #${orderId} has been confirmed. Your order is now being processed.`,
    refId:   orderId,
  });
}

// ── Admin Notifications ───────────────────────────────────────

function loadAdminAll() {
  try { return JSON.parse(localStorage.getItem(ADMIN_KEY) || '[]'); }
  catch { return []; }
}

function saveAdminAll(list) {
  localStorage.setItem(ADMIN_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('admin_notifications:updated'));
}

export function addAdminNotification({ type, title, message, refId = null }) {
  const all = loadAdminAll();
  // Deduplicate by type+refId within 30 seconds (prevent double-fire)
  const recent = Date.now() - 30 * 1000;
  const exists = all.some(n =>
    n.type === type && n.refId === refId &&
    new Date(n.createdAt).getTime() > recent
  );
  if (exists) return;
  all.unshift({
    id:        `ANOTIF-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    type,
    title,
    message,
    refId,
    read:      false,
    createdAt: new Date().toISOString(),
  });
  saveAdminAll(all);
}

export function getAdminNotifications() {
  return loadAdminAll().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getAdminUnreadCount() {
  return loadAdminAll().filter(n => !n.read).length;
}

export function markAdminRead(notifId) {
  const all = loadAdminAll();
  const idx = all.findIndex(n => n.id === notifId);
  if (idx >= 0) { all[idx].read = true; saveAdminAll(all); }
}

export function markAllAdminRead() {
  saveAdminAll(loadAdminAll().map(n => ({ ...n, read: true })));
}

export function deleteAdminNotification(notifId) {
  saveAdminAll(loadAdminAll().filter(n => n.id !== notifId));
}

export function sendNewOrderAdminNotification(orderId, customerName, total) {
  addAdminNotification({
    type:    'new_order',
    title:   `New Order #${orderId} 🛒`,
    message: `${customerName} placed an order for Rs. ${total.toLocaleString()}. Review and process it now.`,
    refId:   orderId,
  });
}

export function adminNotifIcon(type) {
  const map = {
    new_order:       { icon: 'fa-solid fa-cart-shopping',   color: 'var(--clr-gold)'    },
    new_review:      { icon: 'fa-solid fa-star',            color: 'var(--clr-warning)'  },
    bank_transfer:   { icon: 'fa-solid fa-building-columns', color: 'var(--clr-info)'    },
  };
  return map[type] || { icon: 'fa-solid fa-bell', color: 'var(--clr-gold)' };
}

// ── Icon map ──────────────────────────────────────────────────
export function notifIcon(type) {
  const map = {
    welcome:            { icon: 'fa-solid fa-party-horn',    color: 'var(--clr-gold)'    },
    order_success:      { icon: 'fa-solid fa-circle-check',  color: 'var(--clr-success)' },
    review_approved:    { icon: 'fa-solid fa-star',          color: 'var(--clr-gold)'    },
    order_delivered:    { icon: 'fa-solid fa-box-open',      color: 'var(--clr-success)' },
    payment_confirmed:  { icon: 'fa-solid fa-credit-card',   color: 'var(--clr-success)' },
  };
  return map[type] || { icon: 'fa-solid fa-bell', color: 'var(--clr-info)' };
}
