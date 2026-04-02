/* ============================================================
   ZENMARKET — CHECKOUT  (PayHere · Bank Transfer · COD)
   ============================================================ */
import { withLoader }         from './loader.js';
import { injectLayout }       from './layout.js';
import { getCart, clearCart } from './cart.js';
import { getShippingRate, getDeliveryDays, saveOrders, getOrders, getProducts, getCoupons, saveCoupons } from './store.js';
import { formatPrice }        from './utils.js';
import { getCurrentUser, isLoggedIn, getAddresses } from './auth.js';
import { initPhoneInput, getPhoneValue } from './phone-input.js';
import { sendOrderSuccessNotification, sendNewOrderAdminNotification } from './notifications.js';
import { LS, WA_PHONE }       from './config.js';
import toast                  from './toast.js';

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

let shippingCost    = 350;
let selectedPayment = 'payhere';
let slipDataUrl     = null;

const DEFAULT_BANK = {
  bankName:      'Bank of Ceylon',
  accountName:   'ZenMarket (Pvt) Ltd',
  accountNumber: '1234567890',
  branchName:    'Colombo Main Branch',
  branchCode:    '001',
  swiftCode:     'BCEYLKLX',
};

// ── CRITICAL: auth guard + form bind, outside withLoader ──────
// Runs synchronously on DOMContentLoaded so it always fires,
// even if the async layout loader is slow or fails.
document.addEventListener('DOMContentLoaded', () => {
  // ── Auth guard (hard wall — no guest checkout) ────────────
  if (!isLoggedIn()) {
    sessionStorage.setItem('zm_return_url', 'checkout.html');
    window.location.href = 'login.html?next=checkout.html';
    return;
  }

  const cart = getCart();

  // Redirect to cart if empty
  if (!cart.length) {
    window.location.href = 'cart.html';
    return;
  }

  // Bind the form immediately
  bindForm(cart);
  initPhoneInput(document.getElementById('phone'));
  bindDistrictChange();
  bindPaymentSelect();
  bindBankUpload();
  renderOrderItems(cart);
  updateTotals(cart);

  // Auto-fill form fields for the logged-in user
  prefillUser();
});

// ── Layout + UI enhancements (non-critical) ───────────────────
withLoader(async () => {
  injectLayout({});

  const cart = getCart();
  if (!cart.length) return; // already redirected above

  // Apply enabled payment methods from admin settings
  let settings = {};
  try { settings = JSON.parse(localStorage.getItem(LS.siteSettings) || '{}'); } catch {}

  const payhereEnabled = settings.payhereEnabled !== false && settings.payhereEnabled !== 'false';
  const bankEnabled    = settings.bankEnabled    !== false && settings.bankEnabled    !== 'false';
  const codEnabled     = settings.codEnabled     !== false && settings.codEnabled     !== 'false';

  const payhereOpt = document.querySelector('input[name="payment"][value="payhere"]')?.closest('.payment-option');
  const bankOpt    = document.querySelector('input[name="payment"][value="bank"]')?.closest('.payment-option');
  const codOpt     = document.querySelector('input[name="payment"][value="cod"]')?.closest('.payment-option');

  if (payhereOpt && !payhereEnabled) payhereOpt.style.display = 'none';
  if (bankOpt    && !bankEnabled)    bankOpt.style.display    = 'none';
  if (codOpt     && !codEnabled)     codOpt.style.display     = 'none';

  // Select first visible payment method
  const firstVisible = [...document.querySelectorAll('input[name="payment"]')]
    .find(r => r.closest('.payment-option')?.style.display !== 'none');
  if (firstVisible) {
    document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
    firstVisible.checked = true;
    selectedPayment = firstVisible.value;
    firstVisible.closest('.payment-option')?.classList.add('selected');
  }

  loadBankDetails();
});

// ── Load bank details ─────────────────────────────────────────
function loadBankDetails() {
  let settings = {};
  try { settings = JSON.parse(localStorage.getItem(LS.siteSettings) || '{}'); } catch {}
  const bank = {
    bankName:      settings.bankName      || DEFAULT_BANK.bankName,
    accountName:   settings.accountName   || DEFAULT_BANK.accountName,
    accountNumber: settings.accountNumber || DEFAULT_BANK.accountNumber,
    branchName:    settings.branchName    || DEFAULT_BANK.branchName,
    branchCode:    settings.branchCode    || DEFAULT_BANK.branchCode,
    swiftCode:     settings.swiftCode     || DEFAULT_BANK.swiftCode,
  };

  const infoEl = document.getElementById('bank-account-info');
  if (!infoEl) return;
  infoEl.innerHTML = [
    ['Bank',           bank.bankName],
    ['Account Name',   bank.accountName],
    ['Account Number', `<span style="font-family:var(--ff-mono);font-weight:700;color:var(--clr-gold);font-size:1rem;letter-spacing:.05em">${bank.accountNumber}</span>`],
    ['Branch',         bank.branchName],
    ['Branch Code',    bank.branchCode],
    ['SWIFT / BIC',    bank.swiftCode],
  ].map(([label, val]) =>
    `<span style="color:var(--clr-text-3);font-size:.8125rem">${label}</span>
     <span style="color:var(--clr-text-2)">${val}</span>`
  ).join('');
}

// ── Render order items ────────────────────────────────────────
function renderOrderItems(cart) {
  const el = document.getElementById('checkout-items');
  if (!el) return;
  el.innerHTML = cart.map(item => `
    <div style="display:flex;gap:.75rem;align-items:center;padding:.625rem 0;border-bottom:1px solid var(--clr-border)">
      <div style="position:relative;flex-shrink:0">
        <img src="${item.image || ''}" style="width:52px;height:52px;border-radius:6px;object-fit:cover;background:var(--clr-bg-2)" alt="${esc(item.name)}"
             onerror="window.__imgErr&&window.__imgErr(this)">
        <span style="position:absolute;top:-6px;right:-6px;background:var(--clr-surface-2);color:var(--clr-text-2);border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:.7rem;border:1px solid var(--clr-border)">${item.qty}</span>
      </div>
      <div style="flex:1;font-size:.875rem">
        <div style="font-weight:500;color:var(--clr-text)">${esc(item.name)}</div>
        ${item.variant ? `<div style="font-size:.75rem;color:var(--clr-text-3)">${esc(item.variant)}</div>` : ''}
      </div>
      <span style="font-family:var(--ff-mono);font-size:.875rem;color:var(--clr-text-2)">${formatPrice(item.price * item.qty)}</span>
    </div>`).join('');
}

// ── Totals ────────────────────────────────────────────────────
function updateTotals(cart) {
  let discountData = {};
  try { discountData = JSON.parse(sessionStorage.getItem('zm_cart_discount') || '{}'); } catch {}
  const subtotal      = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount      = discountData.discount || 0;
  const effectiveShip = discountData.freeShipping ? 0 : shippingCost;
  const total         = Math.max(0, subtotal + effectiveShip - discount);

  const sub  = document.getElementById('co-subtotal');
  const ship = document.getElementById('co-shipping');
  const tot  = document.getElementById('co-total');
  const drow = document.getElementById('co-discount-row');
  const disc = document.getElementById('co-discount');

  if (sub)  sub.textContent  = formatPrice(subtotal);
  if (ship) ship.textContent = discountData.freeShipping ? 'FREE' : formatPrice(effectiveShip);
  if (tot)  tot.textContent  = formatPrice(total);

  if (drow) {
    if (discount > 0) {
      drow.style.display = '';
      if (disc) disc.textContent = `-${formatPrice(discount)}`;
    } else if (discountData.freeShipping) {
      drow.style.display = '';
      if (disc) disc.textContent = 'Free shipping applied';
    } else {
      drow.style.display = 'none';
    }
  }
}

// ── Prefill user ──────────────────────────────────────────────
function prefillUser() {
  const user = getCurrentUser();
  if (!user) return;
  const names = (user.name || '').split(' ');
  setVal('first-name', names[0] || '');
  setVal('last-name',  names.slice(1).join(' ') || '');
  setVal('email',      user.email  || '');
  setVal('phone',      user.phone  || '');

  // Render the saved-address picker and auto-fill the default
  renderSavedAddressPicker(user);
}

// ── Saved Address Picker ──────────────────────────────────────
function renderSavedAddressPicker(user) {
  const addresses = getAddresses(user.id);
  if (!addresses || !addresses.length) return;

  // Auto-fill with default address immediately
  const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
  if (defaultAddr) fillAddressFields(defaultAddr);

  // Build the picker UI above the shipping address fields
  const shippingSection = document.querySelector('.checkout-section:nth-child(2)');
  if (!shippingSection) return;

  const picker = document.createElement('div');
  picker.id = 'saved-address-picker';
  picker.style.cssText = 'margin-bottom:1.25rem;';

  picker.innerHTML = `
    <label class="form-label" style="margin-bottom:.5rem;display:block">
      <i class="fa-solid fa-location-dot" style="color:var(--clr-gold);margin-right:.35rem"></i>
      Saved Addresses
    </label>
    <div id="saved-addr-cards" style="display:flex;flex-direction:column;gap:.5rem;">
      ${addresses.map(addr => `
        <label class="saved-addr-card${addr.isDefault ? ' selected' : ''}"
               data-aid="${addr.id}"
               style="display:flex;align-items:flex-start;gap:.75rem;padding:.875rem 1rem;
                      border-radius:var(--r-md);border:2px solid ${addr.isDefault ? 'var(--clr-gold)' : 'var(--clr-border)'};
                      background:${addr.isDefault ? 'var(--clr-gold-bg)' : 'var(--clr-bg-2)'};
                      cursor:pointer;transition:all .2s;position:relative">
          <input type="radio" name="saved_address" value="${addr.id}"
                 ${addr.isDefault ? 'checked' : ''}
                 style="margin-top:.2rem;accent-color:var(--clr-gold)">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.2rem;flex-wrap:wrap">
              <span style="font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;
                           padding:.1rem .45rem;border-radius:999px;
                           background:var(--clr-surface-2);color:var(--clr-text-3)">
                <i class="fa-solid fa-house" style="font-size:.65rem;margin-right:.2rem"></i>${esc(addr.label || 'Home')}
              </span>
              ${addr.isDefault ? `<span style="font-size:.7rem;font-weight:600;color:var(--clr-gold);padding:.1rem .45rem;border-radius:999px;background:var(--clr-gold-bg);border:1px solid var(--clr-gold-dim)"><i class="fa-solid fa-star" style="font-size:.6rem;margin-right:.2rem"></i>Default</span>` : ''}
              <strong style="font-size:.875rem;color:var(--clr-text)">${esc(addr.fullName || '')}</strong>
              ${addr.phone ? `<span style="font-size:.8rem;color:var(--clr-text-3)"><i class="fa-solid fa-phone" style="font-size:.7rem;margin-right:.2rem"></i>${esc(addr.phone)}</span>` : ''}
            </div>
            <div style="font-size:.8125rem;color:var(--clr-text-2);line-height:1.5">
              ${esc(addr.line1)}${addr.line2 ? ', ' + esc(addr.line2) : ''}, ${esc(addr.city)}, ${esc(addr.district)}${addr.province ? ', ' + esc(addr.province) + ' Province' : ''}
            </div>
          </div>
        </label>`).join('')}
    </div>
    <div style="margin-top:.625rem">
      <button type="button" id="use-diff-addr-btn"
              style="font-size:.8125rem;color:var(--clr-text-3);background:none;border:none;
                     cursor:pointer;padding:0;display:flex;align-items:center;gap:.35rem;
                     text-decoration:underline;text-underline-offset:2px">
        <i class="fa-solid fa-pen-to-square"></i> Enter a different address
      </button>
    </div>`;

  // Insert before the address form fields
  const firstFormGroup = shippingSection.querySelector('.form-group');
  if (firstFormGroup) shippingSection.insertBefore(picker, firstFormGroup);

  // Initially hide the manual form fields
  toggleManualFields(false);

  // Radio change → fill address
  picker.querySelectorAll('input[name="saved_address"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const chosen = addresses.find(a => a.id === radio.value);
      if (!chosen) return;
      fillAddressFields(chosen);
      // Update card highlight
      picker.querySelectorAll('.saved-addr-card').forEach(card => {
        const isSelected = card.dataset.aid === radio.value;
        card.style.borderColor = isSelected ? 'var(--clr-gold)' : 'var(--clr-border)';
        card.style.background  = isSelected ? 'var(--clr-gold-bg)' : 'var(--clr-bg-2)';
      });
    });
  });

  // "Enter a different address" toggle
  document.getElementById('use-diff-addr-btn')?.addEventListener('click', () => {
    const isHidden = document.getElementById('manual-addr-fields')?.style.display === 'none';
    toggleManualFields(isHidden);
    const btn = document.getElementById('use-diff-addr-btn');
    if (btn) btn.innerHTML = isHidden
      ? '<i class="fa-solid fa-xmark"></i> Cancel — use saved address'
      : '<i class="fa-solid fa-pen-to-square"></i> Enter a different address';
    if (isHidden) {
      // Clear autofilled values so user starts fresh
      ['addr-line1','addr-line2','city','district','province','zip'].forEach(id => setVal(id, ''));
      // Deselect all saved address radios
      picker.querySelectorAll('input[name="saved_address"]').forEach(r => r.checked = false);
      picker.querySelectorAll('.saved-addr-card').forEach(card => {
        card.style.borderColor = 'var(--clr-border)';
        card.style.background  = 'var(--clr-bg-2)';
      });
    } else {
      // Re-fill from currently selected radio or default
      const checkedRadio = picker.querySelector('input[name="saved_address"]:checked');
      const addr = checkedRadio
        ? addresses.find(a => a.id === checkedRadio.value)
        : defaultAddr;
      if (addr) fillAddressFields(addr);
    }
  });
}

function fillAddressFields(addr) {
  setVal('addr-line1', addr.line1    || '');
  setVal('addr-line2', addr.line2    || '');
  setVal('city',       addr.city     || '');
  setVal('zip',        addr.zip      || '');

  // Optionally fill name & phone from saved address if they are empty
  if (addr.fullName) {
    const names = addr.fullName.split(' ');
    const fn = document.getElementById('first-name');
    const ln = document.getElementById('last-name');
    if (fn && !fn.value) setVal('first-name', names[0] || '');
    if (ln && !ln.value) setVal('last-name', names.slice(1).join(' ') || '');
  }
  if (addr.phone) {
    const ph = document.getElementById('phone');
    if (ph && !ph.value) setVal('phone', addr.phone);
  }

  // Select district
  const districtEl = document.getElementById('district');
  if (districtEl && addr.district) {
    [...districtEl.options].forEach(o => {
      o.selected = o.text === addr.district || o.value === addr.district;
    });
    districtEl.dispatchEvent(new Event('change'));
  }

  // Select province
  const provinceEl = document.getElementById('province');
  if (provinceEl && addr.province) {
    const prov = addr.province.replace(' Province', '');
    [...provinceEl.options].forEach(o => {
      o.selected = o.text === prov || o.value === prov;
    });
  }
}

function toggleManualFields(show) {
  let wrapper = document.getElementById('manual-addr-fields');
  if (!wrapper) {
    // Wrap existing address form-groups on first call
    const shippingSection = document.querySelector('.checkout-section:nth-child(2)');
    if (!shippingSection) return;
    const groups = [...shippingSection.querySelectorAll('.form-group, .form-row')];
    // Exclude the notes field and shipping indicator — wrap only the pure address fields
    const addrGroups = groups.filter(el => {
      const inputs = el.querySelectorAll('#addr-line1,#addr-line2,#city,#district,#province,#zip');
      return inputs.length > 0;
    });
    if (!addrGroups.length) {
      // fallback: wrap all form-groups inside section
      wrapper = document.createElement('div');
      wrapper.id = 'manual-addr-fields';
      const firstGroup = shippingSection.querySelector('.form-group');
      if (firstGroup) shippingSection.insertBefore(wrapper, firstGroup);
      groups.forEach(g => {
        if (!['notes','shipping-indicator'].some(id => g.id === id || g.querySelector(`#${id}`)))
          wrapper.appendChild(g);
      });
    } else {
      wrapper = document.createElement('div');
      wrapper.id = 'manual-addr-fields';
      addrGroups[0].parentNode.insertBefore(wrapper, addrGroups[0]);
      addrGroups.forEach(g => wrapper.appendChild(g));
    }
  }
  wrapper.style.display = show ? '' : 'none';
}

// ── District → shipping rate ──────────────────────────────────
function bindDistrictChange() {
  document.getElementById('district')?.addEventListener('change', e => {
    const d = e.target.value;
    const indicator = document.getElementById('shipping-indicator');
    if (!d) { if (indicator) indicator.style.display = 'none'; return; }
    shippingCost = getShippingRate(d);
    if (indicator) indicator.style.display = '';
    const nameEl = document.getElementById('shipping-district-name');
    const rateEl = document.getElementById('shipping-rate-val');
    if (nameEl) nameEl.textContent = d;
    if (rateEl) rateEl.textContent = formatPrice(shippingCost);
    // Show delivery days estimate
    const daysEl = document.getElementById('shipping-days-val');
    if (daysEl) {
      const days = getDeliveryDays(d);
      if (days) {
        daysEl.innerHTML = `<i class="fa-regular fa-clock" style="margin-right:.35rem"></i>Estimated delivery: <strong>${days} working days</strong>`;
        daysEl.style.display = '';
      } else {
        daysEl.style.display = 'none';
      }
    }
    updateTotals(getCart());
  });
}

// ── Payment method select ─────────────────────────────────────
function bindPaymentSelect() {
  document.querySelectorAll('input[name="payment"]').forEach(radio => {
    radio.addEventListener('change', () => {
      selectedPayment = radio.value;
      document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
      radio.closest('.payment-option')?.classList.add('selected');
      const bankPanel = document.getElementById('bank-details-panel');
      if (bankPanel) bankPanel.style.display = radio.value === 'bank' ? '' : 'none';
    });
  });
}

// ── Bank slip upload ──────────────────────────────────────────
function bindBankUpload() {
  const zone  = document.getElementById('slip-upload-zone');
  const input = document.getElementById('slip-file');
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--clr-gold)'; zone.style.background = 'var(--clr-gold-bg)'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; zone.style.background = ''; });
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.style.borderColor = ''; zone.style.background = '';
    if (e.dataTransfer.files[0]) handleSlipFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => { if (input.files[0]) handleSlipFile(input.files[0]); });
}

function handleSlipFile(file) {
  // SECURITY: Block SVGs (can contain scripts), enforce 500KB limit, verify extension+MIME
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const ALLOWED_EXT   = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

  if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXT.includes(ext)) {
    toast.error('Invalid file type', 'Please upload a JPG, PNG, WebP, or PDF file.');
    return;
  }
  if (file.size > 500 * 1024) { toast.error('Too large', 'File must be under 500KB to store safely'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    slipDataUrl = e.target.result;
    const preview = document.getElementById('slip-preview');
    if (!preview) return;
    preview.style.display = '';
    if (file.type.startsWith('image/')) {
      preview.innerHTML = `
        <div style="position:relative;display:inline-block">
          <img src="${slipDataUrl}" style="max-height:140px;border-radius:8px;border:1px solid var(--clr-border)">
          <button type="button" id="remove-slip" style="position:absolute;top:-8px;right:-8px;width:22px;height:22px;background:var(--clr-error);color:#fff;border:none;border-radius:50%;cursor:pointer;font-size:.75rem">×</button>
        </div>
        <div style="font-size:.8125rem;color:var(--clr-success);margin-top:.375rem"><i class="fa-solid fa-circle-check"></i> Payment slip attached</div>`;
    } else {
      preview.innerHTML = `
        <div style="display:flex;align-items:center;gap:.75rem;padding:.75rem;background:var(--clr-bg-2);border-radius:8px;border:1px solid var(--clr-border)">
          <i class="fa-solid fa-file-pdf" style="font-size:1.5rem;color:var(--clr-error)"></i>
          <div>
            <div style="font-size:.875rem;font-weight:500">${file.name}</div>
            <div style="font-size:.75rem;color:var(--clr-text-3)">${(file.size/1024).toFixed(0)} KB</div>
          </div>
          <button type="button" id="remove-slip" style="margin-left:auto;color:var(--clr-error);background:none;border:none;cursor:pointer;font-size:1.125rem">×</button>
        </div>`;
    }
    document.getElementById('remove-slip')?.addEventListener('click', () => {
      slipDataUrl = null;
      if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
      const slipFile = document.getElementById('slip-file');
      if (slipFile) slipFile.value = '';
    });
  };
  reader.readAsDataURL(file);
}

// ── Form submit ───────────────────────────────────────────────
function bindForm(cart) {
  const form = document.getElementById('checkout-form');
  const btn  = document.getElementById('place-order-btn');
  if (!form || !btn) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    e.stopPropagation();

    if (!validateForm()) return;

    // ── Hard auth re-check before creating order ──────────────
    // Guards against session expiring mid-session or direct POST attacks.
    const user = getCurrentUser();
    if (!user || !user.id) {
      toast.error('Session expired', 'Please log in again to place your order.');
      sessionStorage.setItem('zm_return_url', 'checkout.html');
      setTimeout(() => window.location.href = 'login.html?next=checkout.html', 1200);
      return;
    }

    // Prevent double-submit
    if (btn.disabled) return;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing…';

    try {
      let discountData = {};
      try { discountData = JSON.parse(sessionStorage.getItem('zm_cart_discount') || '{}'); } catch {}

      // CRIT-07: Re-validate prices from the authoritative product catalog —
      // never trust cart prices stored in localStorage (user-editable).
      const catalogProducts = getProducts();
      const subtotal = cart.reduce((s, i) => {
        const canonical = catalogProducts.find(p => p.id === i.productId);
        const safePrice = (canonical && typeof canonical.price === 'number') ? canonical.price : i.price;
        return s + safePrice * i.qty;
      }, 0);

      // CRIT-08: Re-validate coupon from the authoritative coupon store —
      // never trust the discount amount stored in sessionStorage (user-editable).
      let discount    = 0;
      let freeShip    = false;
      let appliedCode = null;
      if (discountData.coupon?.code) {
        const coupons = getCoupons();
        const coupon  = coupons.find(c => c.code === discountData.coupon.code && c.active);
        if (coupon) {
          if (coupon.type === 'percent') {
            discount = Math.round(subtotal * coupon.value / 100);
          } else if (coupon.type === 'fixed') {
            discount = Math.min(coupon.value, subtotal);
          } else if (coupon.type === 'shipping') {
            // free-shipping coupon — no monetary discount, just zero shipping
          }
          freeShip    = coupon.type === 'shipping';   // Bug 2 fix: was !!coupon.freeShipping (always false)
          appliedCode = coupon.code;
          // Bug 1 fix: use correct schema fields (used / maxUses) not usageCount / usageLimit
          coupon.used = (coupon.used || 0) + 1;
          if (coupon.maxUses && coupon.used >= coupon.maxUses) coupon.active = false;
          saveCoupons(coupons);
        }
        // If coupon not found/inactive, discount stays 0 — tampered sessionStorage silently ignored
      }

      const effectiveShip = freeShip ? 0 : shippingCost;
      const total         = Math.max(0, subtotal + effectiveShip - discount);
      const isBank        = selectedPayment === 'bank';
      const isCOD         = selectedPayment === 'cod';

      // ── Build order — customerId is ALWAYS the real user.id ──
      const order = {
        id:            `ORD-${Date.now()}`,
        customerId:    user.id,          // never 'guest'
        customerName:  `${getVal('first-name')} ${getVal('last-name')}`.trim(),
        customerEmail: user.email,       // authoritative from session, not form input
        customerPhone: getPhoneValue(document.getElementById('phone')) || getVal('phone'),
        items: cart.map(i => ({
          productId: i.productId,
          name:      i.name,
          slug:      i.slug  || '',
          qty:       i.qty,
          price:     i.price,
          variant:   i.variant || '',
        })),
        subtotal,
        shipping:      effectiveShip,
        discount,
        total,
        status:        (isCOD || isBank) ? 'pending' : 'processing',
        paymentStatus: (isCOD || isBank) ? 'pending' : 'pending',
        paymentMethod: selectedPayment,
        address: {
          line1:    getVal('addr-line1'),
          line2:    getVal('addr-line2'),
          city:     getVal('city'),
          district: getVal('district'),
          province: getVal('province'),
          zip:      getVal('zip'),
        },
        notes:       getVal('notes'),
        coupon:      appliedCode,
        bankRef:     isBank ? getVal('bank-ref') : null,
        paymentSlip: isBank ? slipDataUrl : null,
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      };

      // Payment flow
      if (isCOD) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Placing Order…';
        await delay(600);

      } else if (isBank) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Recording Order…';
        await delay(600);
        toast.info('Bank Transfer', 'Please complete your bank transfer and send the slip via WhatsApp.');

      } else {
        // PayHere (demo simulation)
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting to PayHere…';
        await delay(800);
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying Payment…';
        await delay(800);
        order.status        = 'processing';
        order.paymentStatus = 'paid';
        order.updatedAt     = new Date().toISOString();
        toast.success('Payment Verified', 'Your payment was processed successfully');
        await delay(300);
      }

      // Save order
      const orders = getOrders();
      orders.unshift(order);
      saveOrders(orders);

      // User notification
      sendOrderSuccessNotification(user.id, order.id, order.total);

      // Admin notification — new order alert
      sendNewOrderAdminNotification(order.id, order.customerName, order.total);

      // WhatsApp admin notification
      sendAdminWhatsApp(order);

      // Clear cart and discount
      clearCart();
      try { sessionStorage.removeItem('zm_cart_discount'); } catch {}

      // Store last order for fallback lookup on success page
      try { sessionStorage.setItem('zm_last_order', JSON.stringify(order)); } catch {}

      // Redirect to success page
      window.location.href = `order-success.html?id=${encodeURIComponent(order.id)}`;

    } catch (err) {
      console.error('[Checkout] Order failed:', err);
      toast.error('Order Failed', 'Something went wrong. Please try again.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-lock"></i> <span>Place Order</span>';
    }
  });
}

// ── Validate form with scroll-to-error ───────────────────────
function validateForm() {
  const required = [
    { id: 'first-name', label: 'First Name' },
    { id: 'last-name',  label: 'Last Name'  },
    { id: 'email',      label: 'Email'      },
    { id: 'phone',      label: 'Phone'      },
    { id: 'addr-line1', label: 'Address'    },
    { id: 'city',       label: 'City'       },
    { id: 'district',   label: 'District'   },
    { id: 'province',   label: 'Province'   },
  ];

  let firstInvalid = null;
  let valid = true;

  required.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!el.value?.trim()) {
      el.classList.add('error');
      if (!firstInvalid) firstInvalid = el;
      valid = false;
    } else {
      el.classList.remove('error');
    }
  });

  if (!valid) {
    toast.error('Required Fields', 'Please fill in all highlighted fields.');
    // Scroll to first error with offset for sticky navbar
    if (firstInvalid) {
      const top = firstInvalid.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: 'smooth' });
      setTimeout(() => firstInvalid.focus(), 400);
    }
  }

  return valid;
}

// ── WhatsApp Admin Notification ───────────────────────────────
function sendAdminWhatsApp(order) {
  try {
    const itemLines = order.items
      .map(i => `  • ${i.name}${i.variant ? ` (${i.variant})` : ''} × ${i.qty} — Rs.${(i.price * i.qty).toLocaleString()}`)
      .join('\n');
    const paymentLabel = {
      payhere: 'PayHere (Online)',
      bank:    'Bank Transfer',
      cod:     'Cash on Delivery',
    }[order.paymentMethod] || order.paymentMethod;

    const msg = [
      '🛒 *NEW ORDER — ZenMarket*',
      '─────────────────────────',
      `📦 *Order ID:* ${order.id}`,
      `👤 *Customer:* ${order.customerName}`,
      `📞 *Phone:* ${order.customerPhone}`,
      `📧 *Email:* ${order.customerEmail}`,
      '',
      '*Items:*',
      itemLines,
      '',
      `🚚 *Shipping:* Rs.${order.shipping.toLocaleString()} (${order.address.district})`,
      order.discount > 0 ? `🎟️ *Discount:* -Rs.${order.discount.toLocaleString()}` : null,
      `💰 *Total: Rs.${order.total.toLocaleString()}*`,
      `💳 *Payment:* ${paymentLabel}`,
      '',
      `📍 *Address:* ${order.address.line1}, ${order.address.city}`,
      order.notes ? `📝 *Notes:* ${order.notes}` : null,
    ].filter(Boolean).join('\n');

    const phone = (WA_PHONE || '').replace(/\D/g, '');
    if (!phone) return;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    // Open in background tab — admin sees it without interrupting checkout
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (e) {
    console.warn('[WhatsApp] Notification failed:', e);
  }
}

// ── Helpers ───────────────────────────────────────────────────
const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
const getVal = id         => document.getElementById(id)?.value?.trim() || '';
const delay  = ms         => new Promise(r => setTimeout(r, ms));
