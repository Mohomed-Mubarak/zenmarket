/* ============================================================
   ZENMARKET — CONTACT MESSAGES  (shared storage module)
   Persists in localStorage under key  zm_contact_messages
   ============================================================ */

export const LS_KEY = 'zm_contact_messages';

/**
 * @typedef {Object} ContactMessage
 * @property {string}  id        – UUID-style unique key
 * @property {string}  firstName
 * @property {string}  lastName
 * @property {string}  email
 * @property {string}  phone
 * @property {string}  subject
 * @property {string}  message
 * @property {string}  createdAt – ISO timestamp
 * @property {boolean} read      – false until admin opens it
 */

/** Load all messages, newest first */
export function getMessages() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch { return []; }
}

/** Persist the full array */
function saveMessages(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}

/** Add a new message, returns the saved object */
export function addMessage(fields) {
  const msg = {
    id:        'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    firstName: fields.firstName  || '',
    lastName:  fields.lastName   || '',
    email:     fields.email      || '',
    phone:     fields.phone      || '',
    subject:   fields.subject    || '',
    message:   fields.message    || '',
    createdAt: new Date().toISOString(),
    read:      false,
  };
  const all = getMessages();
  all.unshift(msg);
  saveMessages(all);
  return msg;
}

/** Mark a single message as read */
export function markRead(id) {
  const all = getMessages();
  const idx = all.findIndex(m => m.id === id);
  if (idx !== -1) { all[idx].read = true; saveMessages(all); }
}

/** Delete a single message by id */
export function deleteMessage(id) {
  const filtered = getMessages().filter(m => m.id !== id);
  saveMessages(filtered);
}

/** Mark ALL unread messages as read */
export function markAllRead() {
  const all = getMessages().map(m => ({ ...m, read: true }));
  saveMessages(all);
}

/** Count of unread messages */
export function unreadCount() {
  return getMessages().filter(m => !m.read).length;
}
