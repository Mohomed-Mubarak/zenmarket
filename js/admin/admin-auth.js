/* ============================================================
   ZENMARKET — ADMIN AUTH
   ============================================================ */
import { LS, ADMIN_EMAIL, ADMIN_PASSWORD } from '../config.js';
import {
  hashPassword, verifyPassword,
  checkBruteForce, recordFailedAttempt, clearFailedAttempts,
} from '../security-utils.js';

const PW_KEY = 'zm_admin_password_hash'; // localStorage key for changed password (hashed)

// ── Get the current active password hash ─────────────────────
// Returns the stored hash, or null if none (falls back to config password comparison)
async function getActivePasswordHash() {
  try {
    const stored = localStorage.getItem(PW_KEY);
    if (stored) return stored; // already a hash
    // First run: hash the config default and save it
    const h = await hashPassword(ADMIN_PASSWORD);
    localStorage.setItem(PW_KEY, h);
    return h;
  } catch {
    return null;
  }
}

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export function requireAdmin() {
  const session = getAdminSession();
  if (!session) {
    const base = window.location.pathname.includes('/admin/') ? '' : 'admin/';
    window.location.href = base + 'index.html';
    return null;
  }
  // AUTH-03 fix: enforce session TTL — expire sessions older than 8 hours
  if (session.loginAt && (Date.now() - session.loginAt > SESSION_TTL_MS)) {
    adminLogout();
    return null;
  }
  return session;
}

export function getAdminSession() {
  try { return JSON.parse(localStorage.getItem(LS.adminSession) || 'null'); }
  catch { return null; }
}

export async function adminLogin(email, password) {
  // Brute-force guard
  const lockout = checkBruteForce();
  if (lockout) return { success: false, error: lockout };

  if (email !== ADMIN_EMAIL) {
    recordFailedAttempt();
    return { success: false, error: 'Invalid credentials' };
  }

  const activeHash = await getActivePasswordHash();
  const { match } = await verifyPassword(password, activeHash);

  if (!match) {
    recordFailedAttempt();
    return { success: false, error: 'Invalid credentials' };
  }

  clearFailedAttempts();
  const session = {
    email, role: 'admin', name: 'Admin User',
    loginAt: Date.now(),
  };
  localStorage.setItem(LS.adminSession, JSON.stringify(session));
  return { success: true, session };
}

export function adminLogout() {
  localStorage.removeItem(LS.adminSession);
  const base = window.location.pathname.includes('/admin/') ? '' : 'admin/';
  window.location.href = base + 'index.html';
}

/**
 * Change the admin password.
 * @param {string} currentPw  - Must match the active password
 * @param {string} newPw      - New password (min 8 chars)
 * @returns {{ success: boolean, error?: string }}
 */
export async function changeAdminPassword(currentPw, newPw) {
  if (!currentPw || !newPw) return { success: false, error: 'All fields are required.' };

  const activeHash = await getActivePasswordHash();
  const { match } = await verifyPassword(currentPw, activeHash);
  if (!match) return { success: false, error: 'Current password is incorrect.' };
  if (newPw.length < 8) return { success: false, error: 'New password must be at least 8 characters.' };
  if (newPw === currentPw) return { success: false, error: 'New password must be different from current.' };

  const newHash = await hashPassword(newPw);
  localStorage.setItem(PW_KEY, newHash);

  // Invalidate all existing admin sessions — force re-login with new password
  localStorage.removeItem(LS.adminSession);

  return { success: true };
}

