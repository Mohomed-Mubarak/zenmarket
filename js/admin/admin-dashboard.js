/* ============================================================
   ZENMARKET — ADMIN DASHBOARD
   
   Bug fixes applied:
   • content-visibility:auto removed from CSS (caused 0-width canvas)
   • Chart poll deadline raised to 3000ms (was 500ms — too short for CDN)
   • Chart rendered in double-rAF after a 100ms settle delay so the
     admin-content layout has finished its CSS transition before
     Chart.js measures the canvas width
   • ResizeObserver added to chart canvas — if width is still 0 after
     initial render, it re-draws as soon as the container gets a size
   • All data sections (KPIs, orders, low-stock, zones) rendered 
     synchronously before chart, so they never get stuck on "Loading…"
   • Removed unused `LS` import
   ============================================================ */
import { adminConfirm }      from './admin-confirm.js';
import { requireAdmin }      from './admin-auth.js';
import { injectAdminLayout } from './admin-layout.js';
import { getOrders, getProducts, getUsers, saveOrders, getShippingZones } from '../store.js';
import { formatPrice, formatDateTime, orderStatusBadge } from '../utils.js';
import { withLoader }        from '../loader.js';
import toast                 from '../toast.js';
import { getAllReviews, approveReview, rejectReview } from '../reviews.js';
import { sendReviewApprovedNotification } from '../notifications.js';

withLoader(async () => {
  if (!requireAdmin()) return;
  injectAdminLayout('Dashboard');

  // ── Read all data once ────────────────────────────────────────
  const orders   = getOrders();
  const products = getProducts();
  const users    = getUsers();

  // ── KPIs (synchronous — rendered immediately) ─────────────────
  const paidOrders    = orders.filter(o => o.paymentStatus === 'paid');
  const totalRevenue  = paidOrders.reduce((s, o) => s + (o.total || 0), 0);
  const todayStr      = new Date().toDateString();
  const todayOrders   = orders.filter(o => new Date(o.createdAt).toDateString() === todayStr).length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const activeProducts = products.filter(p => p.active !== false);
  const customers      = users.filter(u => u.role === 'customer');

  setText('kpi-revenue',   formatPrice(totalRevenue));
  setText('kpi-orders',    orders.length);
  setText('kpi-today',     todayOrders);
  setText('kpi-pending',   pendingOrders);
  setText('kpi-products',  activeProducts.length);
  setText('kpi-customers', customers.length);

  // ── Recent orders table ───────────────────────────────────────
  const tbody = document.getElementById('recent-orders');
  if (tbody) {
    if (!orders.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--clr-text-3)">No orders yet</td></tr>`;
    } else {
      tbody.innerHTML = orders.slice(0, 8).map(o => `
        <tr>
          <td class="text-main">
            <a href="order-detail.html?id=${o.id}" style="color:var(--clr-gold);font-family:var(--ff-mono)">${o.id}</a>
          </td>
          <td>
            <div class="order-customer">
              <span class="cust-name">${esc(o.customerName)}</span>
              <span class="cust-email">${esc(o.customerEmail)}</span>
            </div>
          </td>
          <td class="d-hide-sm text-main" style="font-family:var(--ff-mono)">${formatPrice(o.total)}</td>
          <td>${orderStatusBadge(o.status)}</td>
          <td class="d-hide-sm" style="color:var(--clr-text-3);font-size:.8125rem">${formatDateTime(o.createdAt)}</td>
          <td>
            <div style="display:flex;gap:.4rem">
              <a href="order-detail.html?id=${o.id}" class="btn btn-ghost btn-sm">
                <i class="fa-regular fa-eye"></i> View
              </a>
              <button class="btn btn-ghost btn-sm dash-delete-order" data-id="${o.id}"
                style="color:var(--clr-error)" title="Delete">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>`).join('');

      tbody.querySelectorAll('.dash-delete-order').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const ok = await adminConfirm({
            title:   `Delete order ${id}?`,
            message: 'This cannot be undone.',
            confirm: 'Delete',
            danger:  true,
          });
          if (!ok) return;
          const remaining = getOrders().filter(o => o.id !== id);
          saveOrders(remaining);
          btn.closest('tr').remove();
          setText('kpi-orders',  remaining.length);
          setText('kpi-pending', remaining.filter(o => o.status === 'pending').length);
          toast.success('Deleted', `Order ${id} removed`);
        });
      });
    }
  }

  // ── Low-stock list ────────────────────────────────────────────
  const lowStock   = activeProducts.filter(p => (p.stock ?? Infinity) <= 10);
  const lowStockEl = document.getElementById('low-stock-list');
  if (lowStockEl) {
    if (!lowStock.length) {
      lowStockEl.innerHTML = `
        <div style="padding:1.5rem;text-align:center;color:var(--clr-success);font-size:.875rem">
          <i class="fa-solid fa-circle-check"></i> All products well stocked
        </div>`;
    } else {
      lowStockEl.innerHTML = lowStock.slice(0, 8).map(p => `
        <div style="display:flex;align-items:center;gap:.75rem;padding:.75rem 1.25rem;border-bottom:1px solid var(--clr-border)">
          <img src="${p.images?.[0] || 'https://placehold.co/36x36/1e2330/c9a84c?text=Z'}"
               style="width:36px;height:36px;border-radius:4px;object-fit:cover;flex-shrink:0"
               alt="${esc(p.name)}"
               onerror="this.src='https://placehold.co/36x36/1e2330/c9a84c?text=Z'">
          <div style="flex:1;min-width:0">
            <div style="font-size:.875rem;font-weight:500;color:var(--clr-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</div>
            <div style="font-size:.75rem;color:var(--clr-text-3);font-family:var(--ff-mono)">${esc(p.sku || p.id)}</div>
          </div>
          <span class="badge ${p.stock === 0 ? 'badge-red' : 'badge-amber'}" style="flex-shrink:0">
            ${p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
          </span>
        </div>`).join('');
    }
  }

  // ── Delivery Zones ────────────────────────────────────────────
  renderDeliveryZones();

  // ── Recent Reviews (deferred to not block visible content) ────
  setTimeout(() => renderRecentReviews(), 0);

  // ── Revenue Chart ─────────────────────────────────────────────
  // FIX: Render chart AFTER layout settles to get correct canvas dimensions.
  // The admin sidebar has a CSS transition that briefly makes admin-content 
  // narrower — we wait 150ms for it to complete before Chart.js measures width.
  renderChartWhenReady(orders);
});

// ── Chart rendering with layout-settle wait ───────────────────
async function renderChartWhenReady(orders) {
  const canvas = document.getElementById('revenue-chart');
  if (!canvas) return;

  try {
    // Wait for Chart.js (CDN may still be loading; give it up to 3 seconds)
    if (typeof Chart === 'undefined') {
      await new Promise((resolve, reject) => {
        const deadline = Date.now() + 3000;
        const poll = () => {
          if (typeof Chart !== 'undefined') return resolve();
          if (Date.now() > deadline) return reject(new Error('Chart.js not loaded'));
          requestAnimationFrame(poll);
        };
        poll();
      });
    }

    // Wait for layout to settle (sidebar transition + admin-content reflow)
    await new Promise(r => setTimeout(r, 150));

    // Double rAF: ensures browser has committed layout before Chart measures canvas
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const chartInstance = drawRevenueChart(canvas, orders);

    // ResizeObserver safety net: if canvas has 0 width at render time,
    // redraw as soon as the container gets its real width.
    if (chartInstance && typeof ResizeObserver !== 'undefined') {
      let drawn = canvas.width > 0;
      if (!drawn) {
        const ro = new ResizeObserver(entries => {
          for (const entry of entries) {
            if (entry.contentRect.width > 0 && !drawn) {
              drawn = true;
              ro.disconnect();
              chartInstance.destroy();
              drawRevenueChart(canvas, orders);
            }
          }
        });
        ro.observe(canvas.parentElement);
      }
    }

  } catch (err) {
    console.warn('[Dashboard] Chart failed:', err.message);
    canvas.parentElement.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--clr-text-3);font-size:.875rem;gap:.5rem;flex-direction:column">
        <i class="fa-solid fa-chart-line" style="opacity:.3;font-size:2rem"></i>
        <span>Chart unavailable — requires internet for Chart.js</span>
      </div>`;
  }
}

function drawRevenueChart(canvas, orders) {
  const months         = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const revenueByMonth = Array(12).fill(0);
  const ordersCount    = Array(12).fill(0);

  orders.forEach(o => {
    const m = new Date(o.createdAt).getMonth();
    if (!isNaN(m)) {
      revenueByMonth[m] += (o.total || 0);
      ordersCount[m]++;
    }
  });

  const isMobile = window.innerWidth < 640;

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Revenue (LKR)',
          data: revenueByMonth,
          borderColor: '#c9a84c',
          backgroundColor: 'rgba(201,168,76,.12)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#c9a84c',
          pointBorderColor: '#c9a84c',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
        {
          label: 'Orders',
          data: ordersCount,
          borderColor: 'rgba(59,158,255,.6)',
          backgroundColor: 'rgba(59,158,255,.06)',
          fill: false,
          tension: 0.4,
          pointBackgroundColor: 'rgba(59,158,255,.8)',
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 1.5,
          yAxisID: 'y2',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#9aa5b8',
            font: { family: 'DM Sans', size: isMobile ? 10 : 12 },
            boxWidth: isMobile ? 8 : 12,
            padding: isMobile ? 8 : 16,
          },
        },
        tooltip: {
          backgroundColor: '#1e2330',
          borderColor: '#2a3147',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#9aa5b8',
          padding: isMobile ? 8 : 12,
          callbacks: {
            label: ctx => {
              if (ctx.datasetIndex === 0)
                return `  Revenue: Rs. ${(ctx.raw || 0).toLocaleString('en-LK')}`;
              return `  Orders: ${ctx.raw}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid:  { color: 'rgba(255,255,255,.04)' },
          ticks: {
            color: '#667080',
            font: { family: 'DM Sans', size: isMobile ? 10 : 12 },
            maxTicksLimit: isMobile ? 6 : 12,
          },
        },
        y: {
          position: 'left',
          grid:  { color: 'rgba(255,255,255,.04)' },
          ticks: {
            color: '#667080',
            font: { family: 'DM Sans', size: isMobile ? 10 : 12 },
            callback: v => v === 0 ? '0' : `Rs.${(v / 1000).toFixed(0)}k`,
          },
        },
        y2: {
          position: 'right',
          display: !isMobile,
          grid: { drawOnChartArea: false },
          ticks: {
            color: '#667080',
            font: { family: 'DM Sans', size: 11 },
            precision: 0,
          },
        },
      },
    },
  });

  // Redraw on resize so chart stays crisp after window changes
  window.addEventListener('resize', () => chart.resize(), { passive: true });

  return chart;
}

// ── Helpers ───────────────────────────────────────────────────

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Recent Reviews ────────────────────────────────────────────

function renderRecentReviews() {
  const tbody = document.getElementById('recent-reviews');
  const badge = document.getElementById('dash-pending-reviews-badge');
  if (!tbody) return;

  const map = getAllReviews();
  const all = [];
  Object.entries(map).forEach(([productId, list]) => {
    list.forEach(r => all.push({ ...r, productId }));
  });
  all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const pendingCount = all.filter(r => !r.approved && !r.rejected).length;
  if (badge) {
    badge.textContent   = pendingCount || '';
    badge.style.display = pendingCount ? '' : 'none';
  }

  const recent = all.slice(0, 6);

  if (!recent.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--clr-text-3)">No customer reviews yet</td></tr>`;
    return;
  }

  const starsHtml = n => Array.from({ length: 5 }, (_, i) =>
    `<i class="fa-${i < n ? 'solid' : 'regular'} fa-star" style="color:var(--clr-warning,#f59e0b);font-size:.75rem"></i>`
  ).join('');

  tbody.innerHTML = recent.map(r => {
    const dateStr = new Date(r.createdAt).toLocaleDateString('en-LK', { year:'numeric', month:'short', day:'numeric' });
    const statusBadge = r.approved
      ? `<span class="badge badge-green">Approved</span>`
      : r.rejected
        ? `<span class="badge badge-red">Rejected</span>`
        : `<span class="badge badge-amber">Pending</span>`;

    const approveBtn = !r.approved
      ? `<button class="btn btn-ghost btn-sm dash-approve-review"
           data-pid="${esc(r.productId)}" data-rid="${esc(r.id)}"
           style="color:var(--clr-success)" title="Approve">
           <i class="fa-solid fa-circle-check"></i>
         </button>` : '';
    const rejectBtn = !r.rejected
      ? `<button class="btn btn-ghost btn-sm dash-reject-review"
           data-pid="${esc(r.productId)}" data-rid="${esc(r.id)}"
           style="color:var(--clr-warning)" title="Reject">
           <i class="fa-solid fa-ban"></i>
         </button>` : '';

    return `
      <tr>
        <td>
          <div style="font-weight:500;color:var(--clr-text);font-size:.875rem">${esc(r.userName)}</div>
          ${r.verified ? `<div style="font-size:.7rem;color:var(--clr-text-3)">✓ Verified</div>` : ''}
        </td>
        <td class="d-hide-sm" style="font-size:.8125rem;color:var(--clr-text-2);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.productId)}</td>
        <td>${starsHtml(r.rating)}</td>
        <td class="d-hide-sm" style="font-size:.8125rem;color:var(--clr-text-2);max-width:220px">
          ${r.title ? `<div style="font-weight:600;margin-bottom:.1rem;font-size:.8125rem">${esc(r.title)}</div>` : ''}
          <div style="overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${esc(r.text)}</div>
        </td>
        <td>${statusBadge}</td>
        <td class="d-hide-sm" style="color:var(--clr-text-3);font-size:.8125rem;white-space:nowrap">${dateStr}</td>
        <td><div style="display:flex;gap:.375rem">${approveBtn}${rejectBtn}</div></td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('.dash-approve-review').forEach(btn => {
    btn.addEventListener('click', () => {
      const { pid, rid } = btn.dataset;
      const reviewMap = getAllReviews();
      const rev = (reviewMap[pid] || []).find(r => r.id === rid);
      if (approveReview(pid, rid)) {
        toast.success('Approved', 'Review is now live on the product page');
        if (rev?.userId) {
          const product = getProducts().find(p => p.id === pid);
          sendReviewApprovedNotification(rev.userId, product ? product.name : pid);
        }
        renderRecentReviews();
      }
    });
  });

  tbody.querySelectorAll('.dash-reject-review').forEach(btn => {
    btn.addEventListener('click', () => {
      if (rejectReview(btn.dataset.pid, btn.dataset.rid)) {
        toast.info('Rejected', 'Review hidden from store');
        renderRecentReviews();
      }
    });
  });
}

// ── Delivery Zones ────────────────────────────────────────────

function renderDeliveryZones() {
  const el = document.getElementById('dash-delivery-zones');
  if (!el) return;
  const zones = getShippingZones();
  if (!zones.length) {
    el.innerHTML = `<div style="color:var(--clr-text-3);font-size:.875rem;padding:1rem;grid-column:1/-1">No delivery zones configured</div>`;
    return;
  }
  el.innerHTML = zones.map(z => `
    <div style="background:var(--clr-bg-2);border:1px solid var(--clr-border);border-radius:var(--r-md);padding:.875rem 1rem;display:flex;flex-direction:column;gap:.35rem">
      <div style="font-weight:600;font-size:.875rem;color:var(--clr-text)">${esc(z.name)}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem">
        <span style="font-family:var(--ff-mono);font-size:1rem;color:var(--clr-gold);font-weight:700">${formatPrice(z.rate)}</span>
        <span style="font-size:.75rem;background:var(--clr-info-bg);color:var(--clr-info);border-radius:20px;padding:.1rem .55rem;white-space:nowrap">
          <i class="fa-regular fa-clock" style="font-size:.65rem"></i>
          ${z.minDays || 1}–${z.maxDays || 7} days
        </span>
      </div>
      <div style="font-size:.7rem;color:var(--clr-text-3);line-height:1.5">${(z.districts || []).join(', ')}</div>
    </div>`).join('');
}
