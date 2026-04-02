/* ============================================================
   ZENMARKET — AUTH  (v29 — Supabase OTP + Demo fallback)

   DEMO_MODE = true  → all auth is localStorage only (no Supabase)
   DEMO_MODE = false → all auth goes through Supabase OTP / magic-link

   Supabase setup:
     1. Authentication → Providers → enable Email (Magic Link / OTP)
     2. Settings → API → copy URL + anon key into config.js
     3. Authentication → URL Configuration → set Site URL + Redirect URL
   ============================================================ */
import { LS, ADMIN_EMAIL, ADMIN_PASSWORD, DEMO_MODE } from './config.js';
import { sendWelcomeNotification } from './notifications.js';
import { getUsers, saveUsers } from './store.js';
import toast from './toast.js';
import { getSupabase } from './supabase.js';
import {
  hashPassword, verifyPassword,
  checkBruteForce, recordFailedAttempt, clearFailedAttempts,
} from './security-utils.js';

// ── Session ───────────────────────────────────────────────────

export function getSession() {
  try { return JSON.parse(localStorage.getItem(LS.session) || 'null'); }
  catch { return null; }
}

export function setSession(user) {
  // Generate a fresh random token on every session write to prevent session fixation
  const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  const session = { ...user, _token: token, _createdAt: Date.now() };
  localStorage.setItem(LS.session, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(LS.session);
}

export function isLoggedIn() {
  return !!getSession();
}

export function getCurrentUser() {
  return getSession();
}

// ── Supabase auth state listener ─────────────────────────────
let _supabaseListenersInited = false;

export function initSupabaseListeners() {
  if (DEMO_MODE || _supabaseListenersInited) return;
  const sb = getSupabase();
  if (!sb) return;
  _supabaseListenersInited = true;

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      const sbUser = session.user;
      const localUser = {
        id:        sbUser.id,
        name:      sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Customer',
        email:     sbUser.email,
        phone:     sbUser.user_metadata?.phone || '',
        role:      'customer',
        createdAt: sbUser.created_at,
        _supabase: true,
      };
      setSession(localUser);
      _syncUserToStore(localUser);
    } else if (event === 'SIGNED_OUT') {
      clearSession();
    } else if (event === 'TOKEN_REFRESHED' && session?.user) {
      const existing = getSession();
      if (existing?._supabase) setSession({ ...existing, _refreshedAt: Date.now() });
    }
  });
}

function _syncUserToStore(user) {
  try {
    const allUsers = getUsers();
    if (!allUsers.find(u => u.id === user.id)) {
      allUsers.unshift({ ...user, orders: 0, totalSpent: 0, active: true });
      saveUsers(allUsers);
    }
  } catch {}
}

// ── Supabase OTP: step 1 — send OTP ──────────────────────────

export async function sendOtp(email) {
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Supabase not initialised.' };

  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Supabase OTP: step 2 — verify OTP ────────────────────────

export async function verifyOtp(email, token) {
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Supabase not initialised.' };

  const { data, error } = await sb.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) return { success: false, error: error.message };

  const sbUser = data.user;
  if (!sbUser) return { success: false, error: 'Verification failed. Please try again.' };

  const localUser = {
    id:        sbUser.id,
    name:      sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Customer',
    email:     sbUser.email,
    phone:     sbUser.user_metadata?.phone || '',
    role:      'customer',
    createdAt: sbUser.created_at,
    _supabase: true,
  };
  setSession(localUser);
  _syncUserToStore(localUser);

  return { success: true, user: localUser };
}

export async function updateSupabaseProfile(name, phone) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.updateUser({ data: { name, phone } });
}

// ── Demo mode: email + password login ─────────────────────────

export async function login(email, password) {
  if (!DEMO_MODE)
    return { success: false, error: 'Use OTP login in production mode.' };

  // Brute-force guard
  const lockout = checkBruteForce();
  if (lockout) return { success: false, error: lockout };

  const registeredUsers = JSON.parse(localStorage.getItem(LS.registeredUsers) || '[]');
  const found = registeredUsers.find(u => u.email === email);

  if (found) {
    const { match, needsRehash } = await verifyPassword(password, found.password);
    if (match) {
      clearFailedAttempts();
      // Auto-migrate plain-text password to hash on successful login
      if (needsRehash) {
        found.password = await hashPassword(password);
        localStorage.setItem(LS.registeredUsers, JSON.stringify(registeredUsers));
      }
      const { password: _pw, ...safeUser } = found;
      setSession(safeUser);
      return { success: true, user: safeUser };
    }
  }

  const storeUser = getUsers().find(u => u.email === email && u.role !== 'admin');
  if (storeUser && !found) {
    // User exists in store but not registered list — legacy path
    const sessionUser = { ...storeUser, password: undefined };
    clearFailedAttempts();
    setSession(sessionUser);
    return { success: true, user: sessionUser };
  }

  recordFailedAttempt();
  return { success: false, error: 'Invalid email or password.' };
}

export async function register(name, email, password, phone = '') {
  if (!DEMO_MODE)
    return { success: false, error: 'Use OTP registration in production mode.' };

  // Basic email format validation
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email))
    return { success: false, error: 'Please enter a valid email address.' };

  const users = JSON.parse(localStorage.getItem(LS.registeredUsers) || '[]');
  if (users.find(u => u.email === email))
    return { success: false, error: 'An account with this email already exists.' };

  const hashedPw = await hashPassword(password);

  const user = {
    id: `USR-${Date.now()}`,
    name, email,
    password: hashedPw,   // never stored plain-text
    phone: phone || '',
    role: 'customer',
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  localStorage.setItem(LS.registeredUsers, JSON.stringify(users));

  const { password: _pw, ...safeUser } = user;
  setSession(safeUser);

  const allUsers = getUsers();
  if (!allUsers.find(u => u.id === user.id)) {
    allUsers.unshift({ ...safeUser, orders: 0, totalSpent: 0, active: true });
    saveUsers(allUsers);
  }

  sendWelcomeNotification(user.id, name);
  return { success: true, user: safeUser };
}

// ── Logout ────────────────────────────────────────────────────

export async function logout() {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
  clearSession();
  window.location.href = 'login.html';
}

// ── Profile update ────────────────────────────────────────────

export async function updateProfile(updates) {
  const user = getSession();
  if (!user) return { success: false, error: 'Not logged in' };

  if (!DEMO_MODE)
    await updateSupabaseProfile(updates.name || user.name, updates.phone || user.phone);

  const updated = { ...user, ...updates };
  setSession(updated);

  const regUsers = JSON.parse(localStorage.getItem(LS.registeredUsers) || '[]');
  const regIdx = regUsers.findIndex(u => u.id === user.id);
  if (regIdx >= 0) {
    regUsers[regIdx] = { ...regUsers[regIdx], ...updates };
    localStorage.setItem(LS.registeredUsers, JSON.stringify(regUsers));
  }

  const allUsers = getUsers();
  const storeIdx = allUsers.findIndex(u => u.id === user.id);
  if (storeIdx >= 0) {
    const { password: _pw, ...safeUpdates } = updates;
    allUsers[storeIdx] = { ...allUsers[storeIdx], ...safeUpdates };
    saveUsers(allUsers);
  }

  return { success: true, user: updated };
}

// ── Addresses ─────────────────────────────────────────────────

export function getAddresses(userId) {
  try {
    const all = JSON.parse(localStorage.getItem(LS.addresses) || '{}');
    return all[userId] || [];
  } catch { return []; }
}

export function saveAddresses(userId, addresses) {
  try {
    const all = JSON.parse(localStorage.getItem(LS.addresses) || '{}');
    all[userId] = addresses;
    localStorage.setItem(LS.addresses, JSON.stringify(all));
  } catch {}
}

export function addAddress(userId, addressData) {
  const addresses = getAddresses(userId);
  const newAddr = {
    id:        `ADDR-${Date.now()}`,
    label:     addressData.label     || 'Home',
    fullName:  addressData.fullName  || '',
    phone:     addressData.phone     || '',
    line1:     addressData.line1     || '',
    line2:     addressData.line2     || '',
    city:      addressData.city      || '',
    district:  addressData.district  || '',
    province:  addressData.province  || '',
    zip:       addressData.zip       || '',
    isDefault: addresses.length === 0,
    createdAt: new Date().toISOString(),
  };
  addresses.push(newAddr);
  saveAddresses(userId, addresses);
  _syncDefaultAddressToUsersStore(userId, addresses);
  return newAddr;
}

export function updateAddress(userId, addressId, updates) {
  const addresses = getAddresses(userId);
  const idx = addresses.findIndex(a => a.id === addressId);
  if (idx < 0) return null;
  addresses[idx] = { ...addresses[idx], ...updates, updatedAt: new Date().toISOString() };
  saveAddresses(userId, addresses);
  _syncDefaultAddressToUsersStore(userId, addresses);
  return addresses[idx];
}

export function deleteAddress(userId, addressId) {
  let addresses = getAddresses(userId);
  const wasDefault = addresses.find(a => a.id === addressId)?.isDefault;
  addresses = addresses.filter(a => a.id !== addressId);
  if (wasDefault && addresses.length > 0) addresses[0].isDefault = true;
  saveAddresses(userId, addresses);
  _syncDefaultAddressToUsersStore(userId, addresses);
}

export function setDefaultAddress(userId, addressId) {
  const addresses = getAddresses(userId);
  addresses.forEach(a => { a.isDefault = a.id === addressId; });
  saveAddresses(userId, addresses);
  _syncDefaultAddressToUsersStore(userId, addresses);
}

function _syncDefaultAddressToUsersStore(userId, addresses) {
  try {
    const allUsers = JSON.parse(localStorage.getItem(LS.users) || '[]');
    const idx = allUsers.findIndex(u => u.id === userId);
    if (idx >= 0) {
      const def = addresses.find(a => a.isDefault) || addresses[0] || null;
      allUsers[idx].addresses      = addresses;
      allUsers[idx].defaultAddress = def;
      localStorage.setItem(LS.users, JSON.stringify(allUsers));
    }
  } catch {}
}

// ── Admin auth ────────────────────────────────────────────────
// All admin auth logic lives in js/admin/admin-auth.js.
// These re-exports are kept for backward compatibility with any page
// that imports from auth.js, but they delegate to admin-auth.js.

export function requireAdmin() {
  const session = JSON.parse(localStorage.getItem(LS.adminSession) || 'null');
  if (!session || session.role !== 'admin') {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

export function getAdminSession() {
  return JSON.parse(localStorage.getItem(LS.adminSession) || 'null');
}

/** @deprecated REMOVED — use adminLogin() from admin-auth.js instead.
 *  This function previously compared plain-text passwords against the config
 *  value, silently bypassing any password the admin had changed. It has been
 *  replaced with a thrown error so any accidental import is caught immediately
 *  rather than silently degrading security. */
export function adminLogin(_email, _password) {
  throw new Error(
    '[ZenMarket] adminLogin() has been removed from auth.js. ' +
    'Import adminLogin from js/admin/admin-auth.js instead.'
  );
}

export function adminLogout() {
  localStorage.removeItem(LS.adminSession);
  window.location.href = 'login.html';
}

// ── Auth UI helpers ───────────────────────────────────────────

export function updateAuthUI() {
  const user = getSession();
  document.querySelectorAll('[data-auth="user"]').forEach(el => {
    el.style.display = user ? '' : 'none';
  });
  document.querySelectorAll('[data-auth="guest"]').forEach(el => {
    el.style.display = user ? 'none' : '';
  });
  document.querySelectorAll('[data-user-name]').forEach(el => {
    if (user) el.textContent = user.name;
  });
}
