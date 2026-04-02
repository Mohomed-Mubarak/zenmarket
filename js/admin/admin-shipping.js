/* ============================================================
   ZENMARKET — ADMIN DELIVERY / SHIPPING ZONES  (grid card layout)
   ============================================================ */
import { requireAdmin }      from './admin-auth.js';
import { injectAdminLayout } from './admin-layout.js';
import { withLoader }        from '../loader.js';
import { SHIPPING_ZONES, getShippingZones, saveShippingZones } from '../store.js';
import { formatPrice }       from '../utils.js';
import toast from '../toast.js';

let zones = [];

// ── KPI row ───────────────────────────────────────────────────
function renderKpis() {
  const kpiEl = document.getElementById('shipping-kpis');
  if (!kpiEl) return;
  const avg  = zones.reduce((s, z) => s + z.rate, 0) / (zones.length || 1);
  const minR = Math.min(...zones.map(z => z.rate));
  const maxR = Math.max(...zones.map(z => z.rate));
  const allD = zones.flatMap(z => z.districts);
  kpiEl.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-icon" style="background:var(--clr-info-bg);color:var(--clr-info)"><i class="fa-solid fa-map"></i></div>
      <div class="kpi-label">Total Zones</div>
      <div class="kpi-value">${zones.length}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:var(--clr-gold-bg);color:var(--clr-gold)"><i class="fa-solid fa-location-dot"></i></div>
      <div class="kpi-label">Districts Covered</div>
      <div class="kpi-value">${allD.length}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:var(--clr-success-bg);color:var(--clr-success)"><i class="fa-solid fa-arrow-down"></i></div>
      <div class="kpi-label">Lowest Rate</div>
      <div class="kpi-value">${formatPrice(minR)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:var(--clr-warning-bg);color:var(--clr-warning)"><i class="fa-solid fa-arrow-up"></i></div>
      <div class="kpi-label">Highest Rate</div>
      <div class="kpi-value">${formatPrice(maxR)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:var(--clr-error-bg);color:var(--clr-error)"><i class="fa-solid fa-coins"></i></div>
      <div class="kpi-label">Avg Rate</div>
      <div class="kpi-value">${formatPrice(Math.round(avg))}</div>
    </div>`;
}

// ── Zone grid cards ───────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('zones-grid');
  if (!grid) return;

  grid.innerHTML = zones.map((z, idx) => `
    <div class="zone-card" data-idx="${idx}" id="zone-card-${idx}">

      <div class="zone-card-header">
        <div>
          <div class="zone-card-name">${z.name}</div>
          <div class="zone-card-id">${z.id}</div>
        </div>
        <i class="fa-solid fa-truck-fast" style="color:var(--clr-gold);opacity:.6;font-size:1.1rem"></i>
      </div>

      <div class="zone-fields">
        <div class="zone-field" style="grid-column:1/-1">
          <label>Delivery Cost</label>
          <div class="field-wrap">
            <span class="field-prefix">Rs.</span>
            <input type="number" class="zone-rate-input" data-idx="${idx}"
              value="${z.rate}" min="0" step="50" aria-label="Delivery rate for ${z.name}">
          </div>
        </div>
        <div class="zone-field">
          <label>From (days)</label>
          <div class="field-wrap">
            <input type="number" class="zone-min-input" data-idx="${idx}"
              value="${z.minDays || 1}" min="1" max="30" aria-label="Min delivery days">
          </div>
        </div>
        <div class="zone-field">
          <label>To (days)</label>
          <div class="field-wrap">
            <input type="number" class="zone-max-input" data-idx="${idx}"
              value="${z.maxDays || 7}" min="1" max="30" aria-label="Max delivery days">
          </div>
        </div>
      </div>

      <div class="zone-districts">
        ${z.districts.map(d => `<span class="district-tag">${d}</span>`).join('')}
      </div>

      <div class="zone-card-footer">
        <button class="btn btn-success btn-sm save-zone-btn" data-idx="${idx}"
          style="font-size:.75rem;padding:.3rem .85rem">
          <i class="fa-solid fa-circle-check"></i> Save
        </button>
      </div>
    </div>`).join('');

  // Per-card save button
  grid.querySelectorAll('.save-zone-btn').forEach(btn => {
    btn.addEventListener('click', () => saveZone(parseInt(btn.dataset.idx)));
  });

  // Enter key on any input saves that card
  grid.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') saveZone(parseInt(inp.dataset.idx));
    });
  });
}

function saveZone(idx) {
  const rateIn = document.querySelector(`.zone-rate-input[data-idx="${idx}"]`);
  const minIn  = document.querySelector(`.zone-min-input[data-idx="${idx}"]`);
  const maxIn  = document.querySelector(`.zone-max-input[data-idx="${idx}"]`);
  if (!rateIn) return;

  const rate    = parseInt(rateIn.value) || 0;
  const minDays = parseInt(minIn?.value) || 1;
  const maxDays = parseInt(maxIn?.value) || 7;

  if (minDays > maxDays) {
    toast.error('Invalid days', 'Min days cannot exceed max days');
    return;
  }

  zones[idx] = { ...zones[idx], rate, minDays, maxDays };
  saveShippingZones(zones);
  renderKpis();
  toast.success('Saved', `${zones[idx].name} updated`);

  // Flash card border green briefly
  const card = document.getElementById(`zone-card-${idx}`);
  if (card) {
    card.classList.add('flash-ok');
    setTimeout(() => card.classList.remove('flash-ok'), 1200);
  }
}

// ── Save all at once ──────────────────────────────────────────
function saveAll() {
  let hasError = false;
  document.querySelectorAll('.zone-rate-input').forEach(inp => {
    const idx     = parseInt(inp.dataset.idx);
    const minIn   = document.querySelector(`.zone-min-input[data-idx="${idx}"]`);
    const maxIn   = document.querySelector(`.zone-max-input[data-idx="${idx}"]`);
    const rate    = parseInt(inp.value) || 0;
    const minDays = parseInt(minIn?.value) || 1;
    const maxDays = parseInt(maxIn?.value) || 7;
    if (minDays > maxDays) { hasError = true; return; }
    zones[idx] = { ...zones[idx], rate, minDays, maxDays };
  });
  if (hasError) { toast.error('Validation', 'Some zones have invalid day ranges'); return; }
  saveShippingZones(zones);
  renderKpis();
  toast.success('All saved', 'All delivery zone settings updated');
}

// ── Reset to defaults ─────────────────────────────────────────
function resetDefaults() {
  if (!confirm('Reset all zones to default rates and delivery days?')) return;
  localStorage.removeItem('zm_shipping_zones');
  zones = JSON.parse(JSON.stringify(SHIPPING_ZONES));
  renderKpis();
  renderGrid();
  toast.info('Reset', 'Delivery zones restored to defaults');
}

// ── Init ──────────────────────────────────────────────────────
withLoader(async () => {
  if (!requireAdmin()) return;
  injectAdminLayout('Delivery');
  zones = getShippingZones();
  renderKpis();
  renderGrid();
  document.getElementById('save-all-btn')?.addEventListener('click', saveAll);
  document.getElementById('reset-defaults-btn')?.addEventListener('click', resetDefaults);
});
