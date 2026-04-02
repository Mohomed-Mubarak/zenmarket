/* ============================================================
   ZENMARKET — PROFILE PAGE  (v23 — bug-fixed + modern UI)
   ============================================================ */
import { withLoader }    from './loader.js';
import { injectLayout }  from './layout.js';
import { getCurrentUser, isLoggedIn, logout, updateProfile,
         getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress } from './auth.js';
import { initPhoneInput, getPhoneValue } from './phone-input.js';
import { getUserNotifications, getUnreadCount, markRead, markAllRead,
         deleteNotification, notifIcon } from './notifications.js';
import { getOrders, getProducts }  from './store.js';
import { getWishlist }             from './cart.js';
import { formatPrice, formatDate, orderStatusBadge } from './utils.js';
import { getUserReview, canEdit, getUserReviews, addReview, editReview, canReview, hasPurchased } from './reviews.js';
import toast from './toast.js';

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
import { confirmModal } from './modal.js';

withLoader(async () => {
  if (!isLoggedIn()) { window.location.href = 'login.html'; return; }
  injectLayout({});

  const user = getCurrentUser();

  // ── Sidebar info ──────────────────────────────────────────
  const avatarEl = document.getElementById('profile-avatar');
  if (avatarEl) {
    avatarEl.textContent = (user.name || '?')[0].toUpperCase();
    avatarEl.classList.add('has-initial');
  }
  const nameEl  = document.getElementById('profile-name');
  const emailEl = document.getElementById('profile-email');
  if (nameEl)  nameEl.textContent  = user.name  || 'User';
  if (emailEl) emailEl.textContent = user.email || '';

  // ── Settings form prefill ─────────────────────────────────
  const settingsName  = document.getElementById('settings-name');
  const settingsPhone = document.getElementById('settings-phone');
  const settingsEmail = document.getElementById('settings-email');
  if (settingsName)  settingsName.value  = user.name  || '';
  if (settingsEmail) settingsEmail.value = user.email || '';
  if (settingsPhone) {
    initPhoneInput(settingsPhone);
    if (user.phone) settingsPhone.value = user.phone;
  }

  // ── Auto-open panel from URL ──────────────────────────────
  const urlPanel = new URLSearchParams(window.location.search).get('panel') || 'orders';
  activatePanel(urlPanel);

  // ── Init everything ───────────────────────────────────────
  initNav();
  renderOrders(user);
  renderWishlist();
  renderMyReviews(user);
  initSettings(user);
  renderNotifications(user);
  renderAddresses(user);
  updateProfileNotifBadge(user);

  window.addEventListener('notifications:updated', () => {
    renderNotifications(user);
    updateProfileNotifBadge(user);
  });

  document.getElementById('mark-all-read-btn')?.addEventListener('click', () => {
    markAllRead(user.id);
    renderNotifications(user);
    updateProfileNotifBadge(user);
    toast.success('Done', 'All notifications marked as read');
  });

  document.getElementById('logout-btn')?.addEventListener('click', e => {
    e.preventDefault();
    logout();
  });
});

// ── Panel helpers ─────────────────────────────────────────────
function activatePanel(panelId) {
  document.querySelectorAll('.profile-nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.profile-panel').forEach(p => { p.style.display = 'none'; });
  const link  = document.querySelector(`.profile-nav-link[data-panel="${panelId}"]`);
  const panel = document.getElementById(`panel-${panelId}`);
  if (link)  link.classList.add('active');
  if (panel) panel.style.display = '';
}

function initNav() {
  document.querySelectorAll('.profile-nav-link[data-panel]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      activatePanel(link.dataset.panel);
    });
  });
}

// ── Orders ────────────────────────────────────────────────────
function renderOrders(user) {
  const container = document.getElementById('orders-list');
  if (!container) return;
  const orders = getOrders().filter(o =>
    o.customerEmail === user.email || o.customerId === user.id
  );
  if (!orders.length) {
    container.innerHTML = `
      <div class="pnl-empty">
        <div class="pnl-empty__icon"><i class="fa-solid fa-bag-shopping"></i></div>
        <h3>No orders yet</h3>
        <p>Your order history will appear here once you place your first order.</p>
        <a href="shop.html" class="btn btn-primary">Start Shopping</a>
      </div>`;
    return;
  }
  const allProducts = getProducts();
  const slugById = {};
  allProducts.forEach(p => { slugById[p.id] = p.slug; });

  container.innerHTML = orders.map(o => {
    const canReview = o.status === 'delivered';
    const itemsHtml = (o.items || []).map(item => {
      const slug = item.slug || slugById[item.productId] || '';
      let reviewBadge = '';
      if (canReview && slug) {
        const already = getUserReview(user.id, item.productId);
        const editOk  = canEdit(user.id, item.productId);
        if (already && !editOk)
          reviewBadge = `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Reviewed</span>`;
        else if (already && editOk)
          reviewBadge = `<a href="product.html?slug=${encodeURIComponent(slug)}&review=1" class="badge badge-warning"><i class="fa-solid fa-pen"></i> Edit</a>`;
        else
          reviewBadge = `<a href="product.html?slug=${encodeURIComponent(slug)}&review=1" class="badge badge-gold"><i class="fa-solid fa-star"></i> Review</a>`;
      }
      return `
        <div class="order-item">
          <div class="order-item__name">
            <span>${esc(item.name)}</span>
            ${item.variant ? `<span class="order-item__variant">${esc(item.variant)}</span>` : ''}
            <span class="order-item__qty">×${item.qty}</span>
          </div>
          <div>${reviewBadge}</div>
        </div>`;
    }).join('');

    return `
      <div class="order-card">
        <div class="order-card__header">
          <div>
            <span class="order-card__id">${o.id}</span>
            <span class="order-card__date">${formatDate(o.createdAt)}</span>
          </div>
          <div class="order-card__right">
            ${orderStatusBadge(o.status)}
            <span class="order-card__total">${formatPrice(o.total)}</span>
          </div>
        </div>
        <div class="order-card__items">${itemsHtml}</div>
        <div class="order-card__footer">
          <a href="order-success.html?id=${o.id}" class="btn btn-ghost btn-sm">
            <i class="fa-solid fa-receipt"></i> View Details
          </a>
        </div>
      </div>`;
  }).join('');
}

// ── Wishlist ──────────────────────────────────────────────────
function renderWishlist() {
  const grid = document.getElementById('wishlist-grid');
  if (!grid) return;
  const list = getWishlist();
  if (!list.length) {
    grid.innerHTML = `
      <div class="pnl-empty" style="grid-column:1/-1">
        <div class="pnl-empty__icon"><i class="fa-regular fa-heart"></i></div>
        <h3>Your wishlist is empty</h3>
        <p>Save items you love to find them easily later.</p>
        <a href="shop.html" class="btn btn-primary">Browse Products</a>
      </div>`;
    return;
  }
  grid.innerHTML = list.map(p => `
    <div class="product-card">
      <div class="product-card__image">
        <a href="product.html?slug=${encodeURIComponent(esc(p.slug))}">
          <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">
        </a>
      </div>
      <div class="product-card__body">
        <a href="product.html?slug=${encodeURIComponent(esc(p.slug))}" class="product-card__name">${esc(p.name)}</a>
        <div class="product-card__footer">
          <span class="product-card__price">${formatPrice(p.price)}</span>
        </div>
      </div>
    </div>`).join('');
}

// ── Reviews ───────────────────────────────────────────────────
function starsHtml(rating) {
  return Array.from({ length: 5 }, (_, i) =>
    `<i class="fa-${i < rating ? 'solid' : 'regular'} fa-star" style="color:var(--clr-warning);font-size:.75rem"></i>`
  ).join('');
}

function reviewStatusBadge(r) {
  if (r.approved) return `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Approved</span>`;
  if (r.rejected) return `<span class="badge badge-error"><i class="fa-solid fa-circle-xmark"></i> Not Approved</span>`;
  return `<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Pending Approval</span>`;
}

// ── Inline review form (used inside profile My Reviews panel) ─
function buildInlineReviewForm({ user, productId, productName, productImg, slug, existing, isEdit, container, onSuccess }) {
  const formId    = `prf-rv-form-${productId}`;
  const errorId   = `prf-rv-err-${productId}`;
  const charId    = `prf-rv-char-${productId}`;
  const ratingId  = `prf-rv-rating-${productId}`;
  const titleId   = `prf-rv-title-${productId}`;
  const textId    = `prf-rv-text-${productId}`;

  const imgHtml = productImg
    ? `<img src="${productImg}" alt="${productName}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0;">`
    : `<div style="width:56px;height:56px;border-radius:8px;background:var(--clr-surface-2);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa-solid fa-box" style="color:var(--clr-text-3)"></i></div>`;

  const starInputHtml = [1,2,3,4,5].map(n => `
    <button type="button" class="prf-star-btn" data-val="${n}" data-fid="${productId}" style="
      background:none;border:none;cursor:pointer;padding:.1rem .15rem;font-size:1.4rem;
      color:${existing && n <= existing.rating ? 'var(--clr-gold,#f59e0b)' : 'var(--clr-border)'};
      transition:color .12s;line-height:1;
    ">★</button>`).join('');

  const editNote = isEdit
    ? `<div style="padding:.5rem .75rem;background:rgba(243,156,18,.08);border:1px solid rgba(243,156,18,.25);border-radius:6px;font-size:.78rem;color:var(--clr-warning,#f59e0b);margin-bottom:.75rem;">
        <i class="fa-solid fa-triangle-exclamation" style="margin-right:.3rem;"></i>
        You can edit your review <strong>one time only</strong>. This edit is final.
       </div>` : '';

  container.innerHTML = `
    <div class="prf-inline-form" style="
      background:var(--clr-surface);border:1px solid var(--clr-gold,#f59e0b);border-radius:12px;
      padding:1.25rem;margin-bottom:.75rem;
    ">
      <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem;">
        ${imgHtml}
        <div>
          <div style="font-weight:700;font-size:.9375rem;color:var(--clr-text)">${productName}</div>
          <div style="font-size:.78rem;color:var(--clr-text-3);margin-top:.15rem;">
            ${isEdit ? 'Edit your review' : 'Write your review'}
          </div>
        </div>
      </div>
      ${editNote}
      <div style="margin-bottom:.875rem;">
        <div style="font-size:.78rem;font-weight:600;color:var(--clr-text-2);margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.05em;">Your Rating *</div>
        <div id="${ratingId}" style="display:flex;gap:.1rem;align-items:center;">${starInputHtml}</div>
      </div>
      <div style="margin-bottom:.75rem;">
        <label for="${titleId}" style="font-size:.78rem;font-weight:600;color:var(--clr-text-2);display:block;margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.05em;">Title <span style="font-weight:400;opacity:.6">(optional)</span></label>
        <input id="${titleId}" type="text" maxlength="80" placeholder="Summarise your experience"
          value="${existing ? existing.title || '' : ''}"
          style="width:100%;padding:.6rem .75rem;border-radius:8px;border:1px solid var(--clr-border);background:var(--clr-surface-2);color:var(--clr-text);font-size:.875rem;box-sizing:border-box;">
      </div>
      <div style="margin-bottom:.875rem;">
        <label for="${textId}" style="font-size:.78rem;font-weight:600;color:var(--clr-text-2);display:block;margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.05em;">Review * <span id="${charId}" style="float:right;font-weight:400;font-size:.72rem;opacity:.55"></span></label>
        <textarea id="${textId}" rows="4" maxlength="1000" placeholder="Share your experience with this product (min 10 characters)…"
          style="width:100%;padding:.6rem .75rem;border-radius:8px;border:1px solid var(--clr-border);background:var(--clr-surface-2);color:var(--clr-text);font-size:.875rem;resize:vertical;box-sizing:border-box;font-family:inherit;">${existing ? existing.text || '' : ''}</textarea>
      </div>
      <div id="${errorId}" style="color:var(--clr-error,#ef4444);font-size:.8rem;margin-bottom:.5rem;min-height:1.2em;"></div>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap;">
        <button type="button" class="btn btn-primary btn-sm prf-rv-submit" data-pid="${productId}" style="gap:.4rem;">
          <i class="fa-solid fa-${isEdit ? 'pen' : 'paper-plane'}"></i>
          ${isEdit ? 'Save Edit' : 'Submit Review'}
        </button>
        <button type="button" class="btn btn-ghost btn-sm prf-rv-cancel" data-pid="${productId}">
          Cancel
        </button>
      </div>
    </div>`;

  // Rating stars interaction
  let selectedRating = existing ? existing.rating : 0;
  const ratingWrap = container.querySelector(`#${ratingId}`);
  const stars = ratingWrap ? Array.from(ratingWrap.querySelectorAll('.prf-star-btn')) : [];

  function paintStars(hoverVal) {
    stars.forEach(s => {
      const v = parseInt(s.dataset.val);
      s.style.color = v <= (hoverVal || selectedRating) ? 'var(--clr-gold,#f59e0b)' : 'var(--clr-border)';
    });
  }
  stars.forEach(s => {
    s.addEventListener('mouseenter', () => paintStars(parseInt(s.dataset.val)));
    s.addEventListener('mouseleave', () => paintStars(0));
    s.addEventListener('click', () => { selectedRating = parseInt(s.dataset.val); paintStars(0); });
  });

  // Char counter
  const textarea = container.querySelector(`#${textId}`);
  const charEl   = container.querySelector(`#${charId}`);
  if (textarea && charEl) {
    const update = () => { charEl.textContent = `${textarea.value.length}/1000`; };
    textarea.addEventListener('input', update);
    update();
  }

  // Submit
  container.querySelector('.prf-rv-submit')?.addEventListener('click', () => {
    const errEl = container.querySelector(`#${errorId}`);
    const title = container.querySelector(`#${titleId}`)?.value || '';
    const text  = textarea?.value || '';

    if (!selectedRating) { errEl.textContent = 'Please select a star rating.'; return; }
    if (text.trim().length < 10) { errEl.textContent = 'Review must be at least 10 characters.'; return; }
    errEl.textContent = '';

    const result = isEdit
      ? editReview({ productId, userId: user.id, rating: selectedRating, title, text })
      : addReview({ productId, userId: user.id, userName: user.name, rating: selectedRating, title, text });

    if (!result.success) { errEl.textContent = result.error; return; }

    toast.success('Review submitted!', isEdit
      ? 'Your updated review is pending admin approval.'
      : 'Review submitted! It will appear once our team approves it.');

    onSuccess();
  });

  // Cancel — collapse back
  container.querySelector('.prf-rv-cancel')?.addEventListener('click', onSuccess);
}

function renderMyReviews(user) {
  const container = document.getElementById('my-reviews-list');
  if (!container) return;

  // Build product lookup maps
  const allProducts = getProducts();
  const slugById  = {};
  const nameById  = {};
  const imgById   = {};
  allProducts.forEach(p => {
    slugById[p.id] = p.slug;
    nameById[p.id] = p.name;
    imgById[p.id]  = (p.images || [])[0] || '';
  });

  function reRender() { renderMyReviews(user); }

  // All reviews this user has submitted
  const reviews      = getUserReviews(user.id);
  const reviewedPids = new Set(reviews.map(r => r.productId));

  // Count badge on nav
  const countEl = document.getElementById('my-reviews-count');
  if (countEl) countEl.textContent = reviews.length ? String(reviews.length) : '';

  // Products from delivered orders NOT yet reviewed → "Ready to Review"
  const deliveredOrders = getOrders().filter(o =>
    (o.customerId === user.id || o.customerEmail === user.email) && o.status === 'delivered'
  );
  const seenPids    = new Set();
  const pendingItems = [];
  deliveredOrders.forEach(order => {
    (order.items || []).forEach(item => {
      const pid = item.productId;
      if (!pid || reviewedPids.has(pid) || seenPids.has(pid)) return;
      seenPids.add(pid);
      pendingItems.push({
        productId:   pid,
        productName: item.name || nameById[pid] || pid,
        slug:        item.slug || slugById[pid] || '',
        img:         imgById[pid] || '',
      });
    });
  });

  // Empty state
  if (!reviews.length && !pendingItems.length) {
    container.innerHTML = `
      <div class="pnl-empty">
        <div class="pnl-empty__icon"><i class="fa-regular fa-star"></i></div>
        <h3>No reviews yet</h3>
        <p>Once your orders are delivered you can share your experience here.</p>
        <a href="shop.html" class="btn btn-primary">Browse Products</a>
      </div>`;
    return;
  }

  // ── "Ready to Review" section ───────────────────────────────
  let readyHtml = '';
  if (pendingItems.length) {
    const itemsHtml = pendingItems.map(item => {
      const imgHtml = item.img
        ? `<img src="${item.img}" alt="${item.productName}" style="width:52px;height:52px;object-fit:cover;border-radius:8px;flex-shrink:0;">`
        : `<div style="width:52px;height:52px;border-radius:8px;background:var(--clr-surface-2);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa-solid fa-box" style="color:var(--clr-text-3)"></i></div>`;
      return `
        <div class="pending-review-item" id="prf-item-${item.productId}">
          ${imgHtml}
          <div class="pending-review-item__body">
            <div class="pending-review-item__name">${item.productName}</div>
            <div class="pending-review-item__sub">Delivered · Share your experience</div>
          </div>
          <button type="button" class="btn btn-primary btn-sm prf-open-form"
            data-pid="${item.productId}"
            data-name="${item.productName.replace(/"/g, '&quot;')}"
            data-img="${(item.img || '').replace(/"/g, '&quot;')}"
            data-slug="${item.slug}">
            <i class="fa-solid fa-star"></i> Write Review
          </button>
          <div class="prf-form-slot" id="prf-slot-${item.productId}"></div>
        </div>`;
    }).join('');

    readyHtml = `
      <div class="reviews-section">
        <div class="reviews-section__title">
          <i class="fa-solid fa-star" style="color:var(--clr-gold)"></i>
          Ready to Review
          <span class="count-badge">${pendingItems.length}</span>
        </div>
        <div class="pending-reviews">${itemsHtml}</div>
      </div>`;
  }

  // ── Submitted reviews ───────────────────────────────────────
  let submittedHtml = '';
  if (reviews.length) {
    const cardsHtml = reviews.map(r => {
      const slug        = slugById[r.productId] || '';
      const productName = nameById[r.productId] || r.productId;
      const editAllowed = !r.editedAt;
      const isPending   = !r.approved && !r.rejected;
      return `
        <div class="review-card${isPending ? ' review-card--pending' : ''}" id="prf-rc-${r.productId}">
          ${isPending ? `<div class="review-card__pending-bar">
            <i class="fa-solid fa-clock"></i> Pending admin approval — not yet visible on the product page
          </div>` : ''}
          <div class="review-card__header">
            <div>
              <div class="review-card__product">${productName}</div>
              <div class="review-card__meta">
                <span>${starsHtml(r.rating)}</span>
                <span class="review-card__date">${formatDate(r.createdAt)}</span>
                ${r.editedAt ? `<span class="review-card__edited">(edited)</span>` : ''}
              </div>
            </div>
            ${reviewStatusBadge(r)}
          </div>
          ${r.title ? `<div class="review-card__title">${esc(r.title)}</div>` : ''}
          <p class="review-card__text">${esc(r.text)}</p>
          <div class="review-card__actions">
            ${slug ? `<a href="product.html?slug=${encodeURIComponent(slug)}" class="btn btn-ghost btn-sm">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> View Product
            </a>` : ''}
            ${editAllowed ? `<button type="button" class="btn btn-ghost btn-sm prf-open-edit"
                style="color:var(--clr-warning)"
                data-pid="${r.productId}"
                data-name="${(productName).replace(/"/g, '&quot;')}"
                data-img="${(imgById[r.productId] || '').replace(/"/g, '&quot;')}"
                data-slug="${slug}">
                <i class="fa-solid fa-pen"></i> Edit <span style="font-size:.7rem;opacity:.7">(1 left)</span>
              </button>` : ''}
          </div>
          <div class="prf-edit-slot" id="prf-edit-slot-${r.productId}"></div>
        </div>`;
    }).join('');

    submittedHtml = `
      <div class="reviews-section">
        <div class="reviews-section__title">
          <i class="fa-regular fa-star" style="color:var(--clr-text-3)"></i>
          My Submitted Reviews
          <span class="count-badge count-badge--muted">${reviews.length}</span>
        </div>
        ${cardsHtml}
      </div>`;
  }

  container.innerHTML = readyHtml + submittedHtml;

  // ── Wire up "Write Review" buttons ────────────────────────
  container.querySelectorAll('.prf-open-form').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid   = btn.dataset.pid;
      const name  = btn.dataset.name;
      const img   = btn.dataset.img;
      const slug  = btn.dataset.slug;
      const slot  = document.getElementById(`prf-slot-${pid}`);
      if (!slot) return;

      // Toggle: if already open, close it
      if (slot.children.length > 0) { slot.innerHTML = ''; return; }

      // Scroll the parent item into view
      slot.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      buildInlineReviewForm({
        user, productId: pid, productName: name, productImg: img, slug,
        existing: null, isEdit: false,
        container: slot,
        onSuccess: reRender,
      });
    });
  });

  // ── Wire up "Edit" buttons ────────────────────────────────
  container.querySelectorAll('.prf-open-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid      = btn.dataset.pid;
      const name     = btn.dataset.name;
      const img      = btn.dataset.img;
      const slug     = btn.dataset.slug;
      const slot     = document.getElementById(`prf-edit-slot-${pid}`);
      const existing = getUserReview(user.id, pid);
      if (!slot || !existing) return;

      if (slot.children.length > 0) { slot.innerHTML = ''; return; }

      slot.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      buildInlineReviewForm({
        user, productId: pid, productName: name, productImg: img, slug,
        existing, isEdit: true,
        container: slot,
        onSuccess: reRender,
      });
    });
  });
}

// ── Addresses ─────────────────────────────────────────────────
const SL_DISTRICTS = [
  'Colombo','Gampaha','Kalutara','Kandy','Matale','Nuwara Eliya',
  'Galle','Matara','Hambantota','Jaffna','Kilinochchi','Mannar',
  'Vavuniya','Mullaitivu','Trincomalee','Batticaloa','Ampara',
  'Kurunegala','Puttalam','Anuradhapura','Polonnaruwa','Badulla',
  'Monaragala','Ratnapura','Kegalle',
];
const SL_PROVINCES = [
  'Western','Central','Southern','Northern','Eastern',
  'North Western','North Central','Uva','Sabaragamuwa',
];

function districtOptions(selected = '') {
  return SL_DISTRICTS.map(d =>
    `<option value="${d}" ${d === selected ? 'selected' : ''}>${d}</option>`
  ).join('');
}
function provinceOptions(selected = '') {
  return SL_PROVINCES.map(p =>
    `<option value="${p}" ${p === selected ? 'selected' : ''}>${p}</option>`
  ).join('');
}

function addressFormHTML(addr = null) {
  const v = (key, def = '') => addr ? (addr[key] || def) : def;
  return `
    <div class="addr-form-grid">
      <div class="form-group">
        <label class="form-label">Label</label>
        <select class="form-control" name="label">
          ${['Home','Work','Other'].map(l =>
            `<option value="${l}" ${v('label','Home') === l ? 'selected' : ''}>${l}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label required">Full Name</label>
        <input class="form-control" type="text" name="fullName" value="${v('fullName')}" placeholder="Recipient name" required>
      </div>
      <div class="form-group">
        <label class="form-label required">Phone</label>
        <input class="form-control" type="tel" name="phone" value="${v('phone')}" placeholder="+94 7X XXX XXXX" required>
      </div>
      <div class="form-group addr-form-full">
        <label class="form-label required">Address Line 1</label>
        <input class="form-control" type="text" name="line1" value="${v('line1')}" placeholder="House/Flat no., Street" required>
      </div>
      <div class="form-group addr-form-full">
        <label class="form-label">Address Line 2</label>
        <input class="form-control" type="text" name="line2" value="${v('line2')}" placeholder="Area, Landmark (optional)">
      </div>
      <div class="form-group">
        <label class="form-label required">City</label>
        <input class="form-control" type="text" name="city" value="${v('city')}" placeholder="City" required>
      </div>
      <div class="form-group">
        <label class="form-label required">District</label>
        <select class="form-control" name="district" required>
          <option value="">Select District</option>
          ${districtOptions(v('district'))}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label required">Province</label>
        <select class="form-control" name="province" required>
          <option value="">Select Province</option>
          ${provinceOptions(v('province'))}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Postal Code</label>
        <input class="form-control" type="text" name="zip" value="${v('zip')}" placeholder="Optional">
      </div>
    </div>`;
}

function getFormData(container) {
  const get = name => container.querySelector(`[name="${name}"]`)?.value?.trim() || '';
  return {
    label:    get('label'),
    fullName: get('fullName'),
    phone:    get('phone'),
    line1:    get('line1'),
    line2:    get('line2'),
    city:     get('city'),
    district: get('district'),
    province: get('province'),
    zip:      get('zip'),
  };
}

function validateAddressForm(data) {
  if (!data.fullName) return 'Full name is required.';
  if (!data.phone)    return 'Phone number is required.';
  if (!data.line1)    return 'Address line 1 is required.';
  if (!data.city)     return 'City is required.';
  if (!data.district) return 'Please select a district.';
  if (!data.province) return 'Please select a province.';
  return null;
}

function labelIcon(label) {
  if (label === 'Work')  return 'fa-solid fa-briefcase';
  if (label === 'Other') return 'fa-solid fa-location-dot';
  return 'fa-solid fa-house';
}

function renderAddresses(user) {
  const container = document.getElementById('addresses-list');
  const addBtn    = document.getElementById('add-address-btn');
  const addBtnEmpty = document.getElementById('add-address-empty-btn');
  if (!container) return;

  function reRender() { renderAddresses(user); }

  const addresses = getAddresses(user.id);

  // ── Empty state ──
  if (!addresses.length) {
    container.innerHTML = `
      <div class="pnl-empty" id="addr-empty-state">
        <div class="pnl-empty__icon"><i class="fa-solid fa-location-dot"></i></div>
        <h3>No addresses saved</h3>
        <p>Add a delivery address to speed up your checkout.</p>
        <button class="btn btn-primary" id="add-address-empty-btn">
          <i class="fa-solid fa-plus"></i> Add Address
        </button>
      </div>
      <div id="addr-form-container"></div>`;

    document.getElementById('add-address-empty-btn')?.addEventListener('click', () => {
      openAddressModal(user, null, reRender);
    });
  } else {
    // ── Address cards ──
    container.innerHTML = `
      <div class="addr-cards-grid" id="addr-cards-grid">
        ${addresses.map(addr => `
          <div class="addr-card${addr.isDefault ? ' addr-card--default' : ''}" data-aid="${addr.id}">
            <div class="addr-card__header">
              <div class="addr-card__label">
                <i class="${labelIcon(addr.label)}"></i> ${esc(addr.label)}
              </div>
              ${addr.isDefault ? `<span class="badge badge-gold"><i class="fa-solid fa-star"></i> Default</span>` : ''}
            </div>
            <div class="addr-card__body">
              <div class="addr-card__name">${esc(addr.fullName)}</div>
              <div class="addr-card__phone"><i class="fa-solid fa-phone" style="font-size:.7rem;opacity:.6"></i> ${esc(addr.phone)}</div>
              <div class="addr-card__lines">
                ${esc(addr.line1)}${addr.line2 ? ', ' + esc(addr.line2) : ''},<br>
                ${esc(addr.city)}, ${esc(addr.district)},<br>
                ${esc(addr.province)} Province${addr.zip ? ' — ' + esc(addr.zip) : ''}
              </div>
            </div>
            <div class="addr-card__actions">
              ${!addr.isDefault ? `
                <button class="btn btn-ghost btn-sm addr-set-default" data-aid="${addr.id}">
                  <i class="fa-regular fa-circle-check"></i> Set Default
                </button>` : ''}
              <button class="btn btn-ghost btn-sm addr-edit" data-aid="${addr.id}">
                <i class="fa-solid fa-pen"></i> Edit
              </button>
              <button class="btn btn-ghost btn-sm addr-delete" data-aid="${addr.id}"
                style="color:var(--clr-error)">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>`).join('')}
      </div>`;

    // Wire actions
    container.querySelectorAll('.addr-set-default').forEach(btn => {
      btn.addEventListener('click', () => {
        setDefaultAddress(user.id, btn.dataset.aid);
        toast.success('Default set', 'This is now your default delivery address.');
        reRender();
      });
    });

    container.querySelectorAll('.addr-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const addr = getAddresses(user.id).find(a => a.id === btn.dataset.aid);
        if (addr) openAddressModal(user, addr, reRender);
      });
    });

    container.querySelectorAll('.addr-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        confirmModal({
          title: 'Delete Address',
          message: 'Are you sure you want to remove this address? This action cannot be undone.',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          danger: true,
          onConfirm: () => {
            deleteAddress(user.id, btn.dataset.aid);
            toast.success('Deleted', 'Address removed.');
            reRender();
          },
        });
      });
    });
  }

  // Wire header "Add Address" button
  document.getElementById('add-address-btn')?.addEventListener('click', () => {
    openAddressModal(user, null, reRender);
  });
}

function openAddressModal(user, existing, onSave) {
  document.getElementById('addr-modal')?.remove();

  const isEdit = !!existing;
  const modal  = document.createElement('div');
  modal.id = 'addr-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal modal-md">
      <div class="modal-header">
        <h3 class="modal-title">
          <i class="fa-solid fa-location-dot" style="color:var(--clr-gold)"></i>
          ${isEdit ? 'Edit Address' : 'Add New Address'}
        </h3>
        <button class="modal-close" id="addr-modal-close" aria-label="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body">
        ${addressFormHTML(existing)}
        <div id="addr-modal-error" style="display:none;margin-top:.75rem;padding:.65rem .875rem;background:var(--clr-error-bg,rgba(239,68,68,.1));color:var(--clr-error,#ef4444);border-radius:var(--r-md);font-size:.85rem"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="addr-modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="addr-modal-save">
          <i class="fa-solid fa-floppy-disk"></i> ${isEdit ? 'Save Changes' : 'Save Address'}
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));

  const close = () => {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 280);
  };

  document.getElementById('addr-modal-close')?.addEventListener('click', close);
  document.getElementById('addr-modal-cancel')?.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  document.getElementById('addr-modal-save')?.addEventListener('click', () => {
    const data  = getFormData(modal);
    const error = validateAddressForm(data);
    const errEl = document.getElementById('addr-modal-error');
    if (!errEl) return;
    if (error) {
      errEl.textContent    = error;
      errEl.style.display  = '';
      return;
    }
    errEl.style.display = 'none';

    if (isEdit) {
      updateAddress(user.id, existing.id, data);
      toast.success('Updated!', 'Address saved successfully.');
    } else {
      addAddress(user.id, data);
      toast.success('Added!', 'New address saved.');
    }
    close();
    onSave();
  });
}

// ── Settings ──────────────────────────────────────────────────
function initSettings(user) {
  document.getElementById('profile-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const name  = document.getElementById('settings-name')?.value.trim() || '';
    const phone = getPhoneValue(document.getElementById('settings-phone')) || '';
    const result = await updateProfile({ name, phone });
    if (result.success) {
      toast.success('Saved!', 'Profile updated successfully');
      const nameEl = document.getElementById('profile-name');
      if (nameEl) nameEl.textContent = name;
    }
  });

  document.getElementById('password-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const newPass = document.getElementById('new-pass')?.value || '';
    const confirm = document.getElementById('confirm-pass')?.value || '';
    if (newPass !== confirm) { toast.error('Error', 'Passwords do not match'); return; }
    if (newPass.length < 6)  { toast.error('Error', 'Password must be at least 6 characters'); return; }
    toast.success('Updated!', 'Password changed successfully');
    document.getElementById('password-form').reset();
  });
}

// ── Notifications ─────────────────────────────────────────────
function updateProfileNotifBadge(user) {
  const badge = document.getElementById('profile-notif-badge');
  if (!badge) return;
  const count = getUnreadCount(user.id);
  badge.textContent   = count > 9 ? '9+' : String(count);
  badge.style.display = count > 0 ? '' : 'none';
}

function renderNotifications(user) {
  const list = document.getElementById('notifications-list');
  if (!list) return;
  const notifs = getUserNotifications(user.id);

  if (!notifs.length) {
    list.innerHTML = `
      <div class="pnl-empty">
        <div class="pnl-empty__icon"><i class="fa-regular fa-bell"></i></div>
        <h3>No notifications yet</h3>
        <p>Order confirmations, review approvals and messages will appear here.</p>
      </div>`;
    return;
  }

  function timeAgo(iso) {
    const diff  = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)  return 'Just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 7)  return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-LK', { day: 'numeric', month: 'short' });
  }

  list.innerHTML = notifs.map(n => {
    const { icon, color } = notifIcon(n.type);
    const isLink = n.refId && n.type === 'order_success';
    const href   = isLink ? `order-success.html?id=${encodeURIComponent(n.refId)}` : null;
    return `
      <div data-notif-id="${n.id}" class="notif-card${n.read ? '' : ' notif-card--unread'}">
        <div class="notif-card__dot${n.read ? ' notif-card__dot--read' : ''}"></div>
        <div class="notif-card__icon" style="background:${color}22;color:${color}">
          <i class="${icon}"></i>
        </div>
        <div class="notif-card__body">
          ${href ? `<a href="${href}" class="notif-card__title">${esc(n.title)}</a>`
                 : `<div class="notif-card__title">${esc(n.title)}</div>`}
          <div class="notif-card__msg">${esc(n.message)}</div>
          <div class="notif-card__time">${timeAgo(n.createdAt)}</div>
        </div>
        <div class="notif-card__actions">
          ${!n.read ? `<button class="notif-action-btn notif-read-btn" data-id="${n.id}" title="Mark as read">
            <i class="fa-solid fa-check"></i>
          </button>` : ''}
          <button class="notif-action-btn notif-del-btn" data-id="${n.id}" title="Delete">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('.notif-read-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      markRead(btn.dataset.id);
      renderNotifications(user);
      updateProfileNotifBadge(user);
    });
  });

  list.querySelectorAll('.notif-del-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteNotification(btn.dataset.id);
      renderNotifications(user);
      updateProfileNotifBadge(user);
    });
  });

  list.querySelectorAll('.notif-card').forEach(card => {
    card.addEventListener('click', () => {
      markRead(card.dataset.notifId);
      renderNotifications(user);
      updateProfileNotifBadge(user);
    });
  });
}
