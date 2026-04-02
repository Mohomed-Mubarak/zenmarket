/* ============================================================
   ZENMARKET — ADMIN CATEGORIES  (v3 — subcategory support)
   ============================================================ */
import { adminConfirm } from './admin-confirm.js';
import { requireAdmin }      from './admin-auth.js';
import { injectAdminLayout } from './admin-layout.js';
import { withLoader }        from '../loader.js';
import { LS }                from '../config.js';
import { DEFAULT_CATEGORIES, getProducts, saveCategories } from '../store.js';
import toast from '../toast.js';

// ── Load / Save ───────────────────────────────────────────────
function loadCats() {
  try {
    const raw = localStorage.getItem(LS.categories);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    const p = JSON.parse(raw);
    // Merge defaults with any missing subcategory arrays
    return Array.isArray(p) && p.length
      ? p.map(c => ({ subcategories: [], ...c }))
      : JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
  } catch { return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)); }
}

function saveCats(cats) {
  saveCategories(cats);
}

function getCounts() {
  const map = {};
  getProducts().forEach(p => {
    if (p.categorySlug) map[p.categorySlug] = (map[p.categorySlug] || 0) + 1;
  });
  return map;
}

// ── Generate slug ─────────────────────────────────────────────
function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Populate parent-category dropdown ─────────────────────────
function populateParentSelect() {
  const sel = document.getElementById('sub-parent-cat');
  if (!sel) return;
  const cats = loadCats();
  sel.innerHTML = `<option value="">Select parent category…</option>` +
    cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// ── Render table ──────────────────────────────────────────────
function renderTable() {
  const cats    = loadCats();
  const counts  = getCounts();
  const tbody   = document.getElementById('cats-tbody');
  const countEl = document.getElementById('cat-count');
  if (!tbody) return;

  const total  = cats.length;
  const active = cats.filter(c => c.active !== false).length;
  if (countEl) countEl.textContent = `${total} categories · ${active} active`;

  let html = '';

  cats.forEach(c => {
    const subs     = c.subcategories || [];
    const isActive = c.active !== false;
    const hasSubs  = subs.length > 0;
    const rowId    = `cat-row-${c.id}`;

    // Parent row
    html += `
      <tr id="${rowId}" style="${!isActive ? 'opacity:.5' : ''}">
        <td style="text-align:center;padding:.5rem">
          ${hasSubs ? `
            <button class="expand-btn" data-target="${c.id}" title="Expand subcategories">
              <i class="fa-solid fa-chevron-right" style="font-size:.7rem"></i>
            </button>` : ''}
        </td>
        <td style="text-align:center">
          <i class="${c.icon || 'fa-solid fa-tag'}" style="color:${isActive ? 'var(--clr-gold)' : 'var(--clr-text-3)'};font-size:1.1rem"></i>
        </td>
        <td>
          <div style="font-weight:600;color:var(--clr-text)">${c.name}</div>
          <div style="font-size:.75rem;color:var(--clr-text-3);font-family:var(--ff-mono)">${c.slug}</div>
        </td>
        <td>
          <div style="display:flex;flex-wrap:wrap;max-width:260px">
            ${subs.map(s => `
              <span class="subcat-tag">
                ${s.name}
                <button class="remove-sub" data-cat="${c.id}" data-sub="${s.id}" title="Remove subcategory">×</button>
              </span>`).join('')}
            ${!subs.length ? `<span style="font-size:.75rem;color:var(--clr-text-3);font-style:italic">No subcategories</span>` : ''}
          </div>
        </td>
        <td>
          <span class="badge badge-blue">${counts[c.slug] || 0}</span>
        </td>
        <td>
          <span class="badge ${isActive ? 'badge-green' : 'badge-gray'}">
            ${isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <div style="display:flex;gap:.4rem;align-items:center">
            <button class="btn btn-ghost btn-sm toggle-cat" data-id="${c.id}"
              title="${isActive ? 'Deactivate' : 'Activate'}"
              style="color:${isActive ? 'var(--clr-warning)' : 'var(--clr-success)'}">
              <i class="fa-solid ${isActive ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
            </button>
            ${!c.isDefault ? `
              <button class="btn btn-ghost btn-sm delete-cat" data-id="${c.id}" data-name="${c.name}"
                style="color:var(--clr-error)" title="Delete">
                <i class="fa-solid fa-trash"></i>
              </button>` : `
              <span style="font-size:.7rem;color:var(--clr-text-3);font-style:italic">Default</span>`}
          </div>
        </td>
      </tr>`;

    // Expandable subcat detail rows (hidden by default)
    if (hasSubs) {
      html += `
        <tr class="subcat-expand-row" id="subs-${c.id}" style="display:none">
          <td colspan="7">
            <div style="padding:.5rem 1rem .75rem 3.5rem">
              <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:var(--clr-text-3);margin-bottom:.5rem">
                Subcategories in ${c.name}
              </div>
              <table style="width:100%;font-size:.8125rem">
                <tbody>
                  ${subs.map(s => `
                    <tr>
                      <td style="padding:.375rem .5rem;color:var(--clr-text-2)">
                        <i class="fa-solid fa-chevron-right" style="font-size:.6rem;color:var(--clr-text-3);margin-right:.375rem"></i>
                        ${s.name}
                      </td>
                      <td style="padding:.375rem .5rem;font-family:var(--ff-mono);color:var(--clr-text-3);font-size:.75rem">${s.slug}</td>
                      <td style="padding:.375rem .5rem;text-align:right">
                        <button class="btn btn-ghost btn-sm remove-sub-btn"
                          data-cat="${c.id}" data-sub="${s.id}"
                          style="color:var(--clr-error)" title="Remove">
                          <i class="fa-solid fa-trash"></i> Remove
                        </button>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </td>
        </tr>`;
    }
  });

  tbody.innerHTML = html;
  bindTableEvents();
}

// ── Bind all table row events ─────────────────────────────────
function bindTableEvents() {
  const tbody = document.getElementById('cats-tbody');
  if (!tbody) return;

  // Expand/collapse
  tbody.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id      = btn.dataset.target;
      const subRow  = document.getElementById(`subs-${id}`);
      const isOpen  = subRow.style.display !== 'none';
      subRow.style.display = isOpen ? 'none' : '';
      btn.classList.toggle('open', !isOpen);
    });
  });

  // Toggle active (all cats)
  tbody.querySelectorAll('.toggle-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      const cats = loadCats();
      const idx  = cats.findIndex(c => c.id === btn.dataset.id);
      if (idx < 0) return;
      cats[idx].active = cats[idx].active === false;
      saveCats(cats);
      toast.info('Updated', `"${cats[idx].name}" ${cats[idx].active ? 'activated' : 'deactivated'}`);
      renderTable();
      populateParentSelect();
    });
  });

  // Delete category (non-default only)
  tbody.querySelectorAll('.delete-cat').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await adminConfirm({ title: `Delete category "${btn.dataset.name}"?`, message: 'Products in this category will become uncategorised.', confirm: 'Delete', danger: true });
      if (!ok) return;
      saveCats(loadCats().filter(c => c.id !== btn.dataset.id));
      toast.success('Deleted', `"${btn.dataset.name}" removed`);
      renderTable();
      populateParentSelect();
    });
  });

  // Remove subcategory (inline tag × button)
  tbody.querySelectorAll('.remove-sub, .remove-sub-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const catId = btn.dataset.cat;
      const subId = btn.dataset.sub;
      const cats  = loadCats();
      const cat   = cats.find(c => c.id === catId);
      if (!cat) return;
      const subName = cat.subcategories.find(s => s.id === subId)?.name || 'Subcategory';
      const ok2 = await adminConfirm({ title: `Remove subcategory "${subName}"?`, message: `It will be removed from ${cat.name}.`, confirm: 'Remove', danger: true });
      if (!ok2) return;
      cat.subcategories = cat.subcategories.filter(s => s.id !== subId);
      saveCats(cats);
      toast.success('Removed', `"${subName}" subcategory removed`);
      renderTable();
      populateParentSelect();
    });
  });
}

// ── Bind Add Category form ────────────────────────────────────
function bindAddCatForm() {
  const nameInput  = document.getElementById('new-cat-name');
  const iconInput  = document.getElementById('new-cat-icon');
  const iconPreview= document.getElementById('icon-preview');

  iconInput?.addEventListener('input', () => {
    const cls = iconInput.value.trim() || 'fa-solid fa-tag';
    if (iconPreview) { iconPreview.className = cls; iconPreview.style.cssText = 'color:var(--clr-gold);margin-left:.25rem'; }
  });

  document.getElementById('add-cat-btn')?.addEventListener('click', () => {
    const name = (nameInput?.value || '').trim();
    if (!name) { toast.error('Required', 'Enter a category name'); nameInput?.focus(); return; }

    const cats = loadCats();
    const slug = toSlug(name);
    if (cats.find(c => c.slug === slug)) { toast.error('Duplicate', `"${slug}" already exists`); return; }

    cats.push({
      id:            `cat-${Date.now()}`,
      name, slug,
      icon:          iconInput?.value.trim() || 'fa-solid fa-tag',
      isDefault:     false,
      active:        true,
      subcategories: [],
    });

    saveCats(cats);
    toast.success('Created', `Category "${name}" added`);
    if (nameInput)   nameInput.value  = '';
    if (iconInput)   iconInput.value  = '';
    if (iconPreview) { iconPreview.className = 'fa-solid fa-tag'; iconPreview.style.cssText = 'color:var(--clr-gold);margin-left:.25rem'; }
    renderTable();
    populateParentSelect();
  });
}

// ── Bind Add Subcategory form ─────────────────────────────────
function bindAddSubForm() {
  document.getElementById('add-sub-btn')?.addEventListener('click', () => {
    const parentId = document.getElementById('sub-parent-cat')?.value;
    const subName  = (document.getElementById('new-sub-name')?.value || '').trim();

    if (!parentId) { toast.error('Required', 'Select a parent category'); return; }
    if (!subName)  { toast.error('Required', 'Enter a subcategory name'); return; }

    const cats  = loadCats();
    const cat   = cats.find(c => c.id === parentId);
    if (!cat) return;

    const slug = toSlug(subName);
    if (!cat.subcategories) cat.subcategories = [];

    if (cat.subcategories.find(s => s.slug === slug)) {
      toast.error('Duplicate', `"${subName}" already exists in ${cat.name}`);
      return;
    }

    cat.subcategories.push({ id: `sub-${Date.now()}`, name: subName, slug });
    saveCats(cats);
    toast.success('Added', `"${subName}" added to ${cat.name}`);
    document.getElementById('new-sub-name').value = '';
    renderTable();
    populateParentSelect();
  });
}

// ── Init ──────────────────────────────────────────────────────
withLoader(async () => {
  if (!requireAdmin()) return;
  injectAdminLayout('Categories');

  // Clear stale localStorage so new category structure is loaded
  // (only on first load of this version — check for subcategories key)
  const raw = localStorage.getItem(LS.categories);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const hasSubcats = parsed.some(c => Array.isArray(c.subcategories));
      if (!hasSubcats) {
        // Old structure — reset to new defaults
        localStorage.removeItem(LS.categories);
        toast.info('Updated', 'Category structure upgraded to include subcategories');
      }
    } catch { localStorage.removeItem(LS.categories); }
  }

  renderTable();
  populateParentSelect();
  bindAddCatForm();
  bindAddSubForm();
});
