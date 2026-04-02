/* ============================================================
   ZENMARKET — ADMIN COUPONS  (fixed)
   ============================================================ */
import { adminConfirm } from './admin-confirm.js';
import { requireAdmin }      from './admin-auth.js';
import { injectAdminLayout } from './admin-layout.js';
import { withLoader }        from '../loader.js';
import { getCoupons, saveCoupons } from '../store.js';
import { formatPrice, formatDate } from '../utils.js';
import toast                 from '../toast.js';

// ── Load & save helpers ───────────────────────────────────────
function loadCoupons() {
  return getCoupons();
}

// ── Render table ──────────────────────────────────────────────
function renderCoupons() {
  const coupons = loadCoupons();
  const tbody   = document.getElementById('coupons-tbody');
  const countEl = document.getElementById('coupon-count');
  if (!tbody) return;

  if (countEl) countEl.textContent = `${coupons.length} coupon${coupons.length !== 1 ? 's' : ''}`;

  if (!coupons.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--clr-text-3)">No coupons yet — create one →</td></tr>`;
    return;
  }

  tbody.innerHTML = coupons.map(c => {
    const discountLabel =
      c.type === 'percent'  ? `${c.value}% off` :
      c.type === 'shipping' ? 'Free shipping'    :
                              `Rs. ${Number(c.value).toLocaleString('en-LK')} off`;
    const discountClass =
      c.type === 'percent'  ? 'badge-blue'   :
      c.type === 'shipping' ? 'badge-green'  : 'badge-amber';

    return `
      <tr>
        <td style="font-family:var(--ff-mono);font-weight:600;color:var(--clr-gold)">${c.code}</td>
        <td><span class="badge ${discountClass}">${discountLabel}</span></td>
        <td style="font-family:var(--ff-mono);color:var(--clr-text-2)">${formatPrice(c.minOrder || 0)}</td>
        <td style="color:var(--clr-text-2)">${c.used || 0} / ${c.maxUses || '∞'}</td>
        <td><span class="badge ${c.active ? 'badge-green' : 'badge-gray'}">${c.active ? 'Active' : 'Inactive'}</span></td>
        <td style="color:var(--clr-text-3);font-size:.8125rem">${formatDate(c.expires || '')}</td>
        <td>
          <div style="display:flex;gap:.5rem;align-items:center">
            <button class="btn btn-ghost btn-sm toggle-btn"
              data-id="${c.id}"
              style="color:${c.active ? 'var(--clr-warning)' : 'var(--clr-success)'}">
              <i class="fa-solid ${c.active ? 'fa-toggle-off' : 'fa-toggle-on'}"></i>
              ${c.active ? 'Disable' : 'Enable'}
            </button>
            <button class="btn btn-ghost btn-sm delete-btn"
              data-id="${c.id}" data-code="${c.code}"
              style="color:var(--clr-error)" title="Delete">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');

  // Bind toggle buttons
  tbody.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id      = btn.dataset.id;
      const coupons = loadCoupons();
      const idx     = coupons.findIndex(c => c.id === id);
      if (idx < 0) return;
      coupons[idx].active = !coupons[idx].active;
      saveCoupons(coupons);
      toast.info('Updated', `${coupons[idx].code} ${coupons[idx].active ? 'activated' : 'deactivated'}`);
      renderCoupons();
    });
  });

  // Bind delete buttons
  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id   = btn.dataset.id;
      const code = btn.dataset.code;
      const ok = await adminConfirm({ title: `Delete coupon "${code}"?`, message: 'Customers with this code will no longer be able to use it.', confirm: 'Delete', danger: true });
      if (!ok) return;
      const coupons = loadCoupons().filter(c => c.id !== id);
      saveCoupons(coupons);
      toast.success('Deleted', `Coupon ${code} removed`);
      renderCoupons();
    });
  });
}

// ── Add coupon ────────────────────────────────────────────────
function bindAddForm() {
  document.getElementById('add-coupon-btn')?.addEventListener('click', () => {
    const code   = (document.getElementById('coupon-code')?.value   || '').trim().toUpperCase();
    const type   =  document.getElementById('coupon-type')?.value   || 'percent';
    const value  = parseFloat(document.getElementById('coupon-value')?.value  || '0');
    const min    = parseFloat(document.getElementById('coupon-min')?.value    || '0');
    const max    = parseInt(document.getElementById('coupon-max')?.value     || '100', 10);
    const exp    =  document.getElementById('coupon-expires')?.value || '';

    if (!code)              { toast.error('Required', 'Enter a coupon code');    return; }
    if (isNaN(value) || value <= 0) { toast.error('Required', 'Enter a valid discount value'); return; }

    const coupons = loadCoupons();
    if (coupons.find(c => c.code === code)) {
      toast.error('Duplicate', `Code "${code}" already exists`);
      return;
    }

    coupons.push({
      id:       `CPN-${Date.now()}`,
      code, type, value,
      minOrder: isNaN(min) ? 0 : min,
      maxUses:  isNaN(max) ? 100 : max,
      used:     0,
      active:   true,
      expires:  exp || '2099-12-31',
    });

    saveCoupons(coupons);
    toast.success('Created', `Coupon "${code}" created successfully`);

    // Reset form
    ['coupon-code','coupon-value','coupon-min','coupon-expires'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const maxEl = document.getElementById('coupon-max');
    if (maxEl) maxEl.value = '100';

    renderCoupons();
  });
}

// ── Init ──────────────────────────────────────────────────────
withLoader(async () => {
  if (!requireAdmin()) return;
  injectAdminLayout('Coupons');
  renderCoupons();
  bindAddForm();
});
