/* ============================================================
   ZENMARKET — ADMIN USERS  (v2 — add / remove / edit / toggle)
   ============================================================ */
import { adminConfirm } from './admin-confirm.js';
import { requireAdmin }      from './admin-auth.js';
import { injectAdminLayout } from './admin-layout.js';
import { withLoader }        from '../loader.js';
import { LS }                from '../config.js';
import { getUsers, saveUsers, getOrders } from '../store.js';
import { formatPrice, formatDate }        from '../utils.js';
import toast from '../toast.js';
import { esc } from '../security-utils.js';

let allUsers = [];

// ── Render table ──────────────────────────────────────────────
function renderTable(filter = '') {
  const shown  = filter
    ? allUsers.filter(u =>
        u.name.toLowerCase().includes(filter) ||
        u.email.toLowerCase().includes(filter) ||
        (u.phone || '').includes(filter))
    : allUsers;

  const tbody  = document.getElementById('users-tbody');
  const countEl= document.getElementById('users-count');
  if (!tbody) return;
  if (countEl) countEl.textContent = `${allUsers.length} users`;

  if (!shown.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--clr-text-3)">No users found</td></tr>`;
    return;
  }

  tbody.innerHTML = shown.map(u => `
    <tr style="${u.active === false ? 'opacity:.5' : ''}">
      <td>
        <div style="display:flex;align-items:center;gap:.75rem">
          <div style="width:38px;height:38px;border-radius:50%;background:var(--clr-gold-bg);
               display:flex;align-items:center;justify-content:center;
               color:var(--clr-gold);font-weight:700;font-size:.9375rem;flex-shrink:0">
            ${(u.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <div style="font-weight:500;color:var(--clr-text);font-size:.9375rem">${esc(u.name)}</div>
            <div style="font-size:.75rem;color:var(--clr-text-3);font-family:var(--ff-mono)">${esc(u.id)}</div>
          </div>
        </div>
      </td>
      <td style="color:var(--clr-text-2)">${esc(u.email)}</td>
      <td style="color:var(--clr-text-2)">${esc(u.phone) || '—'}</td>
      <td>
        <span class="badge ${u.role === 'admin' ? 'badge-gold' : 'badge-blue'}">${u.role}</span>
      </td>
      <td>
        <span class="badge ${u.active !== false ? 'badge-green' : 'badge-gray'}">
          ${u.active !== false ? 'Active' : 'Suspended'}
        </span>
      </td>
      <td style="font-family:var(--ff-mono);color:var(--clr-text-2)">${u.orders || 0}</td>
      <td style="font-family:var(--ff-mono);color:var(--clr-gold)">${formatPrice(u.totalSpent || 0)}</td>
      <td>
        <div style="display:flex;gap:.5rem;align-items:center">
          <button class="btn btn-ghost btn-sm edit-user-btn" data-id="${esc(u.id)}" title="Edit user">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-ghost btn-sm toggle-status-btn" data-id="${esc(u.id)}"
            title="${u.active !== false ? 'Suspend' : 'Restore'}"
            style="color:${u.active !== false ? 'var(--clr-warning)' : 'var(--clr-success)'}">
            <i class="fa-solid ${u.active !== false ? 'fa-ban' : 'fa-circle-check'}"></i>
          </button>
          ${u.role !== 'admin' ? `
            <button class="btn btn-ghost btn-sm delete-user-btn" data-id="${esc(u.id)}" data-name="${esc(u.name)}"
              title="Delete user" style="color:var(--clr-error)">
              <i class="fa-solid fa-trash"></i>
            </button>` : ''}
        </div>
      </td>
    </tr>`).join('');

  // Edit
  tbody.querySelectorAll('.edit-user-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });

  // Toggle active/suspend
  tbody.querySelectorAll('.toggle-status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = allUsers.findIndex(u => u.id === btn.dataset.id);
      if (idx < 0) return;
      if (allUsers[idx].role === 'admin') { toast.error('Blocked', 'Cannot suspend admin account'); return; }
      allUsers[idx].active = allUsers[idx].active === false ? true : false;
      saveUsers(allUsers);
      toast.info('Updated', `${allUsers[idx].name} ${allUsers[idx].active ? 'restored' : 'suspended'}`);
      renderTable(document.getElementById('user-search')?.value.toLowerCase() || '');
    });
  });

  // Delete
  tbody.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { id, name } = btn.dataset;
      const ok = await adminConfirm({ title: `Delete user "${name}"?`, message: 'This will permanently remove the account. Cannot be undone.', confirm: 'Delete', danger: true });
      if (!ok) return;
      allUsers = allUsers.filter(u => u.id !== id);
      saveUsers(allUsers);
      toast.success('Deleted', `${name} has been removed`);
      renderTable(document.getElementById('user-search')?.value.toLowerCase() || '');
    });
  });
}

// ── Edit Modal ────────────────────────────────────────────────
function openEditModal(id) {
  const user = allUsers.find(u => u.id === id);
  if (!user) return;

  // Load addresses for this user
  let userAddresses = [];
  try {
    const allAddrs = JSON.parse(localStorage.getItem('zm_addresses') || '{}');
    userAddresses = allAddrs[id] || user.addresses || [];
  } catch {}

  const addrHtml = userAddresses.length
    ? userAddresses.map(a => `
        <div style="padding:.75rem;border:1px solid var(--clr-border);border-radius:var(--r-md);
             margin-bottom:.5rem;background:var(--clr-surface-2);font-size:.85rem;
             ${a.isDefault ? 'border-color:var(--clr-gold)' : ''}">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.3rem">
            <span style="font-weight:700;text-transform:uppercase;font-size:.75rem;letter-spacing:.04em;color:var(--clr-text)">
              <i class="fa-solid fa-location-dot" style="color:var(--clr-gold);margin-right:.3rem"></i>${a.label}
            </span>
            ${a.isDefault ? `<span class="badge badge-gold" style="font-size:.65rem"><i class="fa-solid fa-star"></i> Default</span>` : ''}
          </div>
          <div style="font-weight:600;color:var(--clr-text)">${a.fullName}</div>
          <div style="color:var(--clr-text-2)">${a.phone}</div>
          <div style="color:var(--clr-text-2)">${a.line1}${a.line2 ? ', ' + a.line2 : ''}</div>
          <div style="color:var(--clr-text-2)">${a.city}, ${a.district}, ${a.province}${a.zip ? ' — ' + a.zip : ''}</div>
        </div>`).join('')
    : `<div style="color:var(--clr-text-3);font-size:.85rem;padding:.75rem;text-align:center;
           border:1px dashed var(--clr-border);border-radius:var(--r-md)">
         <i class="fa-solid fa-location-dot" style="opacity:.4;margin-right:.4rem"></i>No saved addresses
       </div>`;

  // Remove existing
  document.getElementById('user-edit-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'user-edit-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal modal-sm" style="max-width:520px">
      <div class="modal-header">
        <h3 class="modal-title">Edit User</h3>
        <button class="modal-close" id="close-user-modal" aria-label="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input class="form-control" type="text" id="edit-name" value="${esc(user.name)}">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-control" type="email" id="edit-email" value="${esc(user.email)}">
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input class="form-control" type="tel" id="edit-phone" value="${esc(user.phone) || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Role</label>
          <select class="form-control" id="edit-role">
            <option value="customer" ${user.role === 'customer' ? 'selected' : ''}>Customer</option>
            <option value="admin"    ${user.role === 'admin'    ? 'selected' : ''}>Admin</option>
          </select>
        </div>
        <div style="margin-top:1.25rem">
          <div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
               color:var(--clr-text-3);margin-bottom:.6rem;display:flex;align-items:center;gap:.4rem">
            <i class="fa-solid fa-location-dot" style="color:var(--clr-gold)"></i>
            Saved Addresses (${userAddresses.length})
          </div>
          <div id="admin-addr-list" style="max-height:240px;overflow-y:auto;padding-right:.25rem">
            ${addrHtml}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="cancel-user-edit">Cancel</button>
        <button class="btn btn-primary" id="save-user-edit">
          <i class="fa-solid fa-circle-check"></i> Save Changes
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));

  const close = () => { modal.classList.remove('open'); setTimeout(() => modal.remove(), 300); };
  document.getElementById('close-user-modal')?.addEventListener('click', close);
  document.getElementById('cancel-user-edit')?.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  document.getElementById('save-user-edit')?.addEventListener('click', () => {
    const name  = document.getElementById('edit-name')?.value.trim();
    const email = document.getElementById('edit-email')?.value.trim();
    const phone = document.getElementById('edit-phone')?.value.trim();
    const role  = document.getElementById('edit-role')?.value;
    if (!name || !email) { toast.error('Required', 'Name and email are required'); return; }

    const idx = allUsers.findIndex(u => u.id === id);
    if (idx >= 0) {
      allUsers[idx] = { ...allUsers[idx], name, email, phone, role, updatedAt: new Date().toISOString() };
      saveUsers(allUsers);
      toast.success('Saved', `${name} updated successfully`);
      close();
      renderTable(document.getElementById('user-search')?.value.toLowerCase() || '');
    }
  });
}

// ── Add User Modal ────────────────────────────────────────────
function openAddModal() {
  document.getElementById('user-add-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'user-add-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header">
        <h3 class="modal-title">Add New User</h3>
        <button class="modal-close" id="close-add-modal" aria-label="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label required">Full Name</label>
          <input class="form-control" type="text" id="add-name" placeholder="e.g. Dinusha Perera">
        </div>
        <div class="form-group">
          <label class="form-label required">Email Address</label>
          <input class="form-control" type="email" id="add-email" placeholder="user@email.com">
        </div>
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input class="form-control" type="tel" id="add-phone" placeholder="+94 7X XXX XXXX">
        </div>
        <div class="form-group">
          <label class="form-label">Role</label>
          <select class="form-control" id="add-role">
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div id="add-user-error" style="display:none;background:var(--clr-error-bg);color:var(--clr-error);padding:.75rem;border-radius:var(--r-md);font-size:.875rem"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="cancel-add-user">Cancel</button>
        <button class="btn btn-primary" id="confirm-add-user">
          <i class="fa-solid fa-user-plus"></i> Add User
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));

  const close = () => { modal.classList.remove('open'); setTimeout(() => modal.remove(), 300); };
  document.getElementById('close-add-modal')?.addEventListener('click', close);
  document.getElementById('cancel-add-user')?.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  document.getElementById('confirm-add-user')?.addEventListener('click', () => {
    const name  = document.getElementById('add-name')?.value.trim();
    const email = document.getElementById('add-email')?.value.trim();
    const phone = document.getElementById('add-phone')?.value.trim();
    const role  = document.getElementById('add-role')?.value;
    const errEl = document.getElementById('add-user-error');

    if (!name || !email) { errEl.textContent = 'Name and email are required'; errEl.style.display = 'block'; return; }
    if (allUsers.find(u => u.email === email)) { errEl.textContent = 'A user with this email already exists'; errEl.style.display = 'block'; return; }

    errEl.style.display = 'none';
    allUsers.unshift({
      id:         `USR-${Date.now()}`,
      name, email, phone, role,
      orders:     0,
      totalSpent: 0,
      active:     true,
      createdAt:  new Date().toISOString(),
    });
    saveUsers(allUsers);
    toast.success('Added', `${name} has been added`);
    close();
    renderTable(document.getElementById('user-search')?.value.toLowerCase() || '');
  });
}

// ── Stats cards ───────────────────────────────────────────────
function renderStats() {
  const orders   = getOrders();
  const customers= allUsers.filter(u => u.role === 'customer').length;
  const admins   = allUsers.filter(u => u.role === 'admin').length;
  const suspended= allUsers.filter(u => u.active === false).length;

  const statsEl = document.getElementById('user-stats');
  if (!statsEl) return;
  statsEl.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-icon" style="background:var(--clr-info-bg);color:var(--clr-info)"><i class="fa-solid fa-users"></i></div>
      <div class="kpi-label">Total Users</div>
      <div class="kpi-value">${allUsers.length}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:var(--clr-success-bg);color:var(--clr-success)"><i class="fa-regular fa-circle-user"></i></div>
      <div class="kpi-label">Customers</div>
      <div class="kpi-value">${customers}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:var(--clr-gold-bg);color:var(--clr-gold)"><i class="fa-solid fa-shield-halved"></i></div>
      <div class="kpi-label">Admins</div>
      <div class="kpi-value">${admins}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:var(--clr-error-bg);color:var(--clr-error)"><i class="fa-solid fa-ban"></i></div>
      <div class="kpi-label">Suspended</div>
      <div class="kpi-value">${suspended}</div>
    </div>`;
}

// ── Init ──────────────────────────────────────────────────────
withLoader(async () => {
  if (!requireAdmin()) return;
  injectAdminLayout('Users');

  allUsers = getUsers();
  renderStats();
  renderTable();

  document.getElementById('user-search')?.addEventListener('input', e => {
    renderTable(e.target.value.toLowerCase());
  });

  document.getElementById('add-user-btn')?.addEventListener('click', openAddModal);
});
