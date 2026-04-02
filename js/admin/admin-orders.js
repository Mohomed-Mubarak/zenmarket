/* ============================================================
   ZENMARKET — ADMIN ORDERS
   ============================================================ */
import { requireAdmin } from './admin-auth.js';
import { getOrders, saveOrders } from '../store.js';
import { adminConfirm } from './admin-confirm.js';
import { injectAdminLayout } from './admin-layout.js';
import { formatPrice, formatDateTime, orderStatusBadge, paymentStatusBadge } from '../utils.js';
import { withLoader } from '../loader.js';
import toast from '../toast.js';
import { esc } from '../security-utils.js';

let allOrders = [];
let filtered  = [];
let page = 1;
const PER_PAGE = 15;

withLoader(async () => {
  if (!requireAdmin()) return;
  injectAdminLayout('Orders');
  allOrders = getOrders();
  filtered  = [...allOrders];
  renderTable();
  bindSearch();
  bindFilters();
});

function renderTable() {
  const start = (page-1)*PER_PAGE;
  const slice = filtered.slice(start, start+PER_PAGE);
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:3rem;color:var(--clr-text-3)">No orders found</td></tr>`;
  } else {
    tbody.innerHTML = slice.map(o => `
      <tr data-id="${o.id}">
        <td style="width:36px">
          <input type="checkbox" class="order-checkbox" data-id="${o.id}"
            style="accent-color:var(--clr-gold);width:14px;height:14px;cursor:pointer">
        </td>
        <td class="text-main">
          <a href="order-detail.html?id=${o.id}" style="color:var(--clr-gold);font-family:var(--ff-mono)">${o.id}</a>
        </td>
        <td>
          <div class="order-customer">
            <span class="cust-name">${esc(o.customerName)}</span>
            <span class="cust-email">${esc(o.customerEmail)}</span>
          </div>
        </td>
        <td class="hide-mobile" style="color:var(--clr-text-2)">${o.items.length} item${o.items.length>1?'s':''}</td>
        <td class="text-main" style="font-family:var(--ff-mono)">${formatPrice(o.total)}</td>
        <td>${orderStatusBadge(o.status)}</td>
        <td class="hide-mobile">${paymentStatusBadge(o.paymentStatus)}</td>
        <td class="hide-mobile" style="color:var(--clr-text-3);font-size:.8125rem">${formatDateTime(o.createdAt)}</td>
        <td>
          <div style="display:flex;gap:.4rem;align-items:center">
            <a href="order-detail.html?id=${o.id}" class="btn btn-ghost btn-sm">
              <i class="fa-regular fa-eye"></i> View
            </a>
            <button class="btn btn-ghost btn-sm delete-order-btn"
              data-id="${o.id}" data-total="${o.total}"
              title="Delete order"
              style="color:var(--clr-error)">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`).join('');
  }
  renderPagination();
  document.getElementById('orders-count').textContent = `${filtered.length} orders`;
  bindDeleteButtons();
  bindBulkSelect();
}

function renderPagination() {
  const totalPages = Math.ceil(filtered.length/PER_PAGE);
  const pag = document.getElementById('orders-pagination');
  if (!pag || totalPages <= 1) { if(pag) pag.innerHTML=''; return; }
  let html = `<button class="page-btn" onclick="goPage(${page-1})" ${page<=1?'disabled':''}><i class="fa-solid fa-chevron-left"></i></button>`;
  for (let i=1; i<=totalPages; i++) {
    html += `<button class="page-btn ${i===page?'active':''}" onclick="goPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="goPage(${page+1})" ${page>=totalPages?'disabled':''}><i class="fa-solid fa-chevron-right"></i></button>`;
  pag.innerHTML = html;
}

window.goPage = p => {
  page = p; renderTable();
};

function bindSearch() {
  document.getElementById('order-search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    filtered = allOrders.filter(o =>
      o.id.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q)
    );
    page = 1; renderTable();
  });
}

function bindFilters() {
  document.getElementById('filter-status')?.addEventListener('change', applyFilter);
  document.getElementById('filter-payment')?.addEventListener('change', applyFilter);
  document.getElementById('sort-orders')?.addEventListener('change', applySort);
}

function applyFilter() {
  const status  = document.getElementById('filter-status')?.value  || '';
  const payment = document.getElementById('filter-payment')?.value || '';
  filtered = allOrders.filter(o => {
    if (status  && o.status !== status)        return false;
    if (payment && o.paymentStatus !== payment) return false;
    return true;
  });
  page = 1; renderTable();
}

function applySort() {
  const s = document.getElementById('sort-orders')?.value || '';
  if (s === 'newest')   filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (s === 'oldest')   filtered.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (s === 'amount-h') filtered.sort((a,b) => b.total - a.total);
  if (s === 'amount-l') filtered.sort((a,b) => a.total - b.total);
  page = 1; renderTable();
}

// ── Delete order ─────────────────────────────────────────────
function bindDeleteButtons() {
  document.querySelectorAll('.delete-order-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id    = btn.dataset.id;
      const total = btn.dataset.total;
      const ok = await adminConfirm({ title: `Delete order ${id}?`, message: `Total: Rs. ${Number(total).toLocaleString()} — this cannot be undone.`, confirm: 'Delete', danger: true });
      if (!ok) return;
      allOrders  = allOrders.filter(o => o.id !== id);
      filtered   = filtered.filter(o => o.id !== id);
      saveOrders(allOrders);
      toast.success('Deleted', `Order ${id} removed`);
      renderTable();
    });
  });
}

// ── Bulk select & delete ─────────────────────────────────────
function bindBulkSelect() {
  const selectAll = document.getElementById('select-all-orders');
  const bulkBtn   = document.getElementById('bulk-delete-btn');
  const countEl   = document.getElementById('selected-count');

  const updateBulkBar = () => {
    const checked = document.querySelectorAll('.order-checkbox:checked');
    const n = checked.length;
    if (bulkBtn) bulkBtn.style.display = n > 0 ? '' : 'none';
    if (countEl) countEl.textContent = n;
  };

  selectAll?.addEventListener('change', () => {
    document.querySelectorAll('.order-checkbox').forEach(cb => {
      cb.checked = selectAll.checked;
    });
    updateBulkBar();
  });

  document.getElementById('orders-tbody')?.addEventListener('change', e => {
    if (e.target.classList.contains('order-checkbox')) {
      const allChecked = [...document.querySelectorAll('.order-checkbox')].every(cb => cb.checked);
      if (selectAll) selectAll.checked = allChecked;
      updateBulkBar();
    }
  });

  bulkBtn?.addEventListener('click', async () => {
    const checked = [...document.querySelectorAll('.order-checkbox:checked')];
    if (!checked.length) return;
    const ids = checked.map(cb => cb.dataset.id);
    const ok = await adminConfirm({ title: `Delete ${ids.length} selected order${ids.length > 1 ? 's' : ''}?`, message: 'This cannot be undone.', confirm: 'Delete All', danger: true });
    if (!ok) return;
    allOrders = allOrders.filter(o => !ids.includes(o.id));
    filtered  = filtered.filter(o => !ids.includes(o.id));
    saveOrders(allOrders);
    if (selectAll) selectAll.checked = false;
    if (bulkBtn)   bulkBtn.style.display = 'none';
    if (countEl)   countEl.textContent = '0';
    renderTable();
    toast.success('Deleted', `${ids.length} order${ids.length > 1 ? 's' : ''} removed`);
  });
}

// ── Update order status (used in order-detail.html) ───────────
window.updateOrderStatus = (id, status) => {
  const orders = getOrders();
  const o = orders.find(x => x.id === id);
  if (!o) return;
  o.status = status;
  o.updatedAt = new Date().toISOString();
  saveOrders(orders);
  toast.success('Status updated', `Order ${id} → ${status}`);
};

window.updatePaymentStatus = (id, status) => {
  const orders = getOrders();
  const o = orders.find(x => x.id === id);
  if (!o) return;
  o.paymentStatus = status;
  o.updatedAt = new Date().toISOString();
  saveOrders(orders);
  toast.success('Payment updated', `Order ${id} payment → ${status}`);
};
