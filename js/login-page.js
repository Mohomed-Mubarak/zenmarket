/* ============================================================
   ZENMARKET — LOGIN PAGE  (v29 — OTP + demo dual-mode)

   DEMO_MODE = true  → classic email/password forms (unchanged UX)
   DEMO_MODE = false → 2-step OTP flow:
       Step 1: enter email → OTP sent
       Step 2: enter 6-digit code → verified → redirect
   ============================================================ */
import { withLoader } from './loader.js';
import { login, register, isLoggedIn, sendOtp, verifyOtp,
         initSupabaseListeners } from './auth.js';
import { initPhoneInput, getPhoneValue } from './phone-input.js';
import toast from './toast.js';
import { DEMO_MODE } from './config.js';

import { safeRedirectPath } from './security-utils.js';

// ── Return URL ────────────────────────────────────────────────
function getReturnUrl() {
  try {
    const param = new URLSearchParams(window.location.search).get('next');
    if (param) {
      const safe = safeRedirectPath(param);
      if (safe) return safe;
      // Silently ignore invalid/external redirects — fall through to default
    }
    const stored = sessionStorage.getItem('zm_return_url');
    if (stored) {
      sessionStorage.removeItem('zm_return_url');
      const safe = safeRedirectPath(stored);
      if (safe) return safe;
    }
  } catch { /* ignore */ }
  return 'profile.html';
}

// ── Boot ──────────────────────────────────────────────────────
withLoader(async () => {
  initSupabaseListeners();
  if (isLoggedIn()) { window.location.href = getReturnUrl(); return; }
  initTabs();

  if (DEMO_MODE) {
    // Classic password forms
    initLoginForm();
    initRegisterForm();
    initPasswordToggle();
  } else {
    // OTP forms — hide password-based panels, show OTP panels
    document.getElementById('form-login')?.style && showOtpLoginForm();
    document.getElementById('form-register')?.style && hidePasswordForms();
    initOtpFlow();
  }
});

// ── Tab switching ─────────────────────────────────────────────
function initTabs() {
  const loginTab  = document.getElementById('tab-login-btn');
  const regTab    = document.getElementById('tab-register-btn');
  const loginForm = document.getElementById('form-login');
  const regForm   = document.getElementById('form-register');

  const showLogin = () => {
    if (loginForm) loginForm.style.display = '';
    if (regForm)   regForm.style.display   = 'none';
    loginTab?.classList.add('active');
    regTab?.classList.remove('active');
  };
  const showReg = () => {
    if (loginForm) loginForm.style.display = 'none';
    if (regForm)   regForm.style.display   = '';
    regTab?.classList.add('active');
    loginTab?.classList.remove('active');
  };

  loginTab?.addEventListener('click', showLogin);
  regTab?.addEventListener('click', showReg);
  document.getElementById('switch-to-register')?.addEventListener('click', e => { e.preventDefault(); showReg(); });
  document.getElementById('switch-to-login')?.addEventListener('click', e => { e.preventDefault(); showLogin(); });
}

// ══════════════════════════════════════════════════════════════
//  DEMO MODE — classic email / password
// ══════════════════════════════════════════════════════════════

function initLoginForm() {
  const form  = document.getElementById('login-form');
  const btn   = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  if (!form || !btn || !errEl) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errEl.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in…';

    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const result = await login(email, password);
    if (result.success) {
      toast.success('Welcome back!', result.user.name || email);
      setTimeout(() => window.location.href = getReturnUrl(), 800);
    } else {
      errEl.style.display = 'flex';
      errEl.textContent   = result.error;
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-lock"></i> Sign In';
    }
  });
}

function initRegisterForm() {
  const form  = document.getElementById('register-form');
  const btn   = document.getElementById('register-btn');
  const errEl = document.getElementById('reg-error');
  if (!form || !btn || !errEl) return;

  const phoneInput = document.getElementById('reg-phone');
  if (phoneInput) initPhoneInput(phoneInput);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errEl.style.display = 'none';
    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-confirm').value;
    const phone    = getPhoneValue(document.getElementById('reg-phone')) || '';

    if (password !== confirm) {
      errEl.textContent = 'Passwords do not match.'; errEl.style.display = 'block'; return;
    }
    if (password.length < 6) {
      errEl.textContent = 'Password must be at least 6 characters.'; errEl.style.display = 'block'; return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account…';

    const result = await register(name, email, password, phone);
    if (result.success) {
      toast.success('Account created!', `Welcome, ${name}!`);
      setTimeout(() => window.location.href = getReturnUrl(), 800);
    } else {
      errEl.textContent = result.error; errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });
}

function initPasswordToggle() {
  [['toggle-password','login-password'],
   ['toggle-reg-password','reg-password'],
   ['toggle-reg-confirm','reg-confirm'],
  ].forEach(([btnId, inputId]) => {
    const btn   = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      const icon = btn.querySelector('i');
      if (icon) icon.className = isHidden ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
    });
  });
}

// ══════════════════════════════════════════════════════════════
//  PRODUCTION MODE — Supabase OTP flow
// ══════════════════════════════════════════════════════════════

function hidePasswordForms() {
  // Hide the existing password-based register form; OTP handles both
  const regForm = document.getElementById('form-register');
  if (regForm) regForm.style.display = 'none';
}

function showOtpLoginForm() {
  // Replace the login form inner HTML with the OTP 2-step UI
  const loginForm = document.getElementById('form-login');
  if (!loginForm) return;

  loginForm.innerHTML = `
    <div class="auth-title">Sign In / Register</div>
    <div class="auth-subtitle">Enter your email — we'll send a one-time code</div>

    <!-- Step 1: email input -->
    <div id="otp-step-1">
      <div id="otp-error-1" style="display:none;color:var(--clr-error,#ef4444);font-size:.85rem;margin-bottom:.75rem;padding:.6rem .85rem;background:rgba(239,68,68,.08);border-radius:8px"></div>
      <div class="form-group">
        <label class="form-label required">Email Address</label>
        <div class="input-group">
          <i class="input-icon fa-solid fa-envelope"></i>
          <input class="form-control" type="email" id="otp-email" required autocomplete="email" placeholder="you@example.com">
        </div>
      </div>
      <button id="otp-send-btn" class="btn btn-primary w-100" style="margin-top:.5rem">
        <i class="fa-solid fa-paper-plane"></i> Send OTP
      </button>
      <p style="font-size:.8rem;color:var(--clr-text-3);text-align:center;margin-top:1rem">
        New customers are registered automatically
      </p>
    </div>

    <!-- Step 2: OTP code entry (hidden until email sent) -->
    <div id="otp-step-2" style="display:none">
      <div id="otp-error-2" style="display:none;color:var(--clr-error,#ef4444);font-size:.85rem;margin-bottom:.75rem;padding:.6rem .85rem;background:rgba(239,68,68,.08);border-radius:8px"></div>

      <div style="text-align:center;margin-bottom:1.5rem">
        <div style="width:52px;height:52px;border-radius:50%;background:rgba(201,168,76,.12);display:inline-flex;align-items:center;justify-content:center;margin-bottom:.75rem">
          <i class="fa-solid fa-envelope-open-text" style="color:var(--clr-gold);font-size:1.25rem"></i>
        </div>
        <div style="font-weight:600;color:var(--clr-text)">Check your inbox</div>
        <div id="otp-sent-to" style="font-size:.8rem;color:var(--clr-text-3);margin-top:.25rem"></div>
      </div>

      <div class="form-group">
        <label class="form-label required">6-Digit Code</label>
        <div class="input-group">
          <i class="input-icon fa-solid fa-key"></i>
          <input class="form-control" type="text" id="otp-code"
            inputmode="numeric" maxlength="6" autocomplete="one-time-code"
            placeholder="••••••"
            style="letter-spacing:.35em;font-size:1.25rem;font-weight:700;text-align:center">
        </div>
      </div>

      <button id="otp-verify-btn" class="btn btn-primary w-100">
        <i class="fa-solid fa-circle-check"></i> Verify & Sign In
      </button>

      <div style="text-align:center;margin-top:1rem">
        <span style="font-size:.8rem;color:var(--clr-text-3)">Didn't receive it? </span>
        <button id="otp-resend-btn" style="background:none;border:none;cursor:pointer;font-size:.8rem;color:var(--clr-gold);font-weight:600;padding:0" disabled>
          Resend in <span id="otp-timer">30</span>s
        </button>
      </div>

      <div style="text-align:center;margin-top:.5rem">
        <button id="otp-back-btn" style="background:none;border:none;cursor:pointer;font-size:.8rem;color:var(--clr-text-3);padding:0">
          <i class="fa-solid fa-arrow-left" style="font-size:.7rem"></i> Use a different email
        </button>
      </div>
    </div>
  `;
}

let _otpEmail    = '';
let _timerHandle = null;

function initOtpFlow() {
  showOtpLoginForm();

  // Step 1: send OTP
  document.getElementById('otp-send-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('otp-email')?.value.trim();
    const errEl = document.getElementById('otp-error-1');
    if (!errEl) return;
    errEl.style.display = 'none';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errEl.textContent = 'Please enter a valid email address.';
      errEl.style.display = 'block';
      return;
    }

    const btn = document.getElementById('otp-send-btn');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…';

    const result = await sendOtp(email);

    if (!result.success) {
      errEl.textContent = result.error;
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send OTP';
      return;
    }

    _otpEmail = email;
    // Transition to step 2
    document.getElementById('otp-step-1').style.display = 'none';
    document.getElementById('otp-step-2').style.display = '';
    const sentTo = document.getElementById('otp-sent-to');
    if (sentTo) sentTo.textContent = `Code sent to ${email}`;

    _startResendTimer();
    document.getElementById('otp-code')?.focus();
  });

  // Step 2: verify OTP
  document.getElementById('otp-verify-btn')?.addEventListener('click', _doVerify);
  document.getElementById('otp-code')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') _doVerify();
  });

  // Auto-submit when 6 digits entered
  document.getElementById('otp-code')?.addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
    if (e.target.value.length === 6) _doVerify();
  });

  // Back button
  document.getElementById('otp-back-btn')?.addEventListener('click', () => {
    clearInterval(_timerHandle);
    document.getElementById('otp-step-2').style.display = 'none';
    document.getElementById('otp-step-1').style.display = '';
    document.getElementById('otp-error-1').style.display = 'none';
    const sendBtn = document.getElementById('otp-send-btn');
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send OTP';
    }
  });

  // Resend button
  document.getElementById('otp-resend-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('otp-resend-btn');
    btn.disabled = true;
    await sendOtp(_otpEmail);
    toast.info('Code resent', `A new OTP has been sent to ${_otpEmail}`);
    _startResendTimer();
  });
}

async function _doVerify() {
  const code  = (document.getElementById('otp-code')?.value || '').trim();
  const errEl = document.getElementById('otp-error-2');
  const btn   = document.getElementById('otp-verify-btn');
  if (!errEl || !btn) return;
  errEl.style.display = 'none';

  if (code.length !== 6) {
    errEl.textContent = 'Please enter the 6-digit code from your email.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying…';

  const result = await verifyOtp(_otpEmail, code);

  if (result.success) {
    clearInterval(_timerHandle);
    toast.success('Verified!', `Welcome, ${result.user.name || _otpEmail}!`);
    setTimeout(() => window.location.href = getReturnUrl(), 800);
  } else {
    errEl.textContent = result.error || 'Invalid or expired code. Please try again.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verify & Sign In';
  }
}

function _startResendTimer(seconds = 30) {
  clearInterval(_timerHandle);
  const timerEl  = document.getElementById('otp-timer');
  const resendBtn = document.getElementById('otp-resend-btn');
  let remaining = seconds;

  if (timerEl)   timerEl.textContent = remaining;
  if (resendBtn) {
    resendBtn.disabled = true;
    resendBtn.innerHTML = `Resend in <span id="otp-timer">${remaining}</span>s`;
  }

  _timerHandle = setInterval(() => {
    remaining--;
    const t = document.getElementById('otp-timer');
    if (t) t.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(_timerHandle);
      const rb = document.getElementById('otp-resend-btn');
      if (rb) {
        rb.disabled = false;
        rb.textContent = 'Resend OTP';
      }
    }
  }, 1000);
}
