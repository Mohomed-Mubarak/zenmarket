/* ============================================================
   ZENMARKET — HOME PAGE
   ============================================================ */
import { withLoader }    from './loader.js';
import { injectLayout }  from './layout.js';
import { getProducts, getCategories } from './store.js';
import { getAllReviews, seedAllReviews, seedDemoUserReviews } from './reviews.js';
import { formatPrice }                from './utils.js';
import { addToCart, toggleWishlist, isWishlisted } from './cart.js';
import { initQuickSearch }            from './search.js';

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
import { productCardHTML, bindCardEvents } from './product-card.js';
import toast from './toast.js';
import { LS } from './config.js';

withLoader(async () => {
  injectLayout({ activePage: 'Home' });
  // Seed reviews for all products so they're ready on product pages
  const _allProducts = getProducts();
  seedDemoUserReviews();
  seedAllReviews(_allProducts);
  initHeroParticles();   // non-blocking — CDN load must not delay the page loader
  renderCategories();
  renderFeatured();
  renderNewArrivals();
  initHeroRotation();
  initQuickSearch(
    document.getElementById('hero-search-input'),
    document.getElementById('search-dropdown')
  );
  document.getElementById('hero-search-btn')?.addEventListener('click', () => {
    const q = document.getElementById('hero-search-input')?.value.trim();
    if (q) window.location.href = `search.html?q=${encodeURIComponent(q)}`;
  });
  initCountdown();
  renderHomepageReviews();
  initNewsletter();
});

// ── Categories ────────────────────────────────────────────────
function renderCategories() {
  const grid = document.getElementById('categories-grid');
  if (!grid) return;
  const cats = getCategories().filter(c => c.active !== false);
  grid.innerHTML = cats.map(c => `
    <a href="shop.html?cat=${c.slug}" class="cat-card hover-lift">
      <i class="${c.icon}"></i>
      <span>${c.name}</span>
      <small>${c.subcategories?.length ? `${c.subcategories.length} subcategories` : 'View all'}</small>
    </a>`).join('');
}

// ── Featured Products ─────────────────────────────────────────
function renderFeatured() {
  const grid = document.getElementById('featured-products');
  if (!grid) return;
  const products = getProducts().filter(p => p.featured && p.active !== false).slice(0, 4);
  grid.innerHTML = products.map(p => { try { return productCardHTML(p); } catch { return ''; } }).join('');
  bindCardEvents(grid, getProducts(), addToCart, toggleWishlist);
}

// ── New Arrivals ──────────────────────────────────────────────
function renderNewArrivals() {
  const grid = document.getElementById('new-arrivals');
  if (!grid) return;
  const products = getProducts()
    .filter(p => p.active !== false && p.badge !== 'Used')
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
  grid.innerHTML = products.map(p => { try { return productCardHTML(p); } catch { return ''; } }).join('');
  bindCardEvents(grid, getProducts(), addToCart, toggleWishlist);
}

// ── Hero product rotation ─────────────────────────────────────
function initHeroRotation() {
  const featured = getProducts().filter(p => p.featured && p.active !== false);
  if (featured.length < 2) return; // need at least 2 to rotate

  let idx = 0;
  const imgEl   = document.getElementById('hero-product-img');
  const nameEl  = document.getElementById('hero-badge-name');
  const priceEl = document.getElementById('hero-badge-price');

  const update = () => {
    idx = (idx + 1) % featured.length;
    const p = featured[idx];
    if (!imgEl) return;

    // Fade out → swap src → fade in
    imgEl.style.opacity = '0';
    setTimeout(() => {
      imgEl.src         = p.images?.[0] || '';
      imgEl.alt         = p.name;
      imgEl.style.opacity = '1';
      if (nameEl)  nameEl.textContent  = p.name;
      if (priceEl) priceEl.textContent = formatPrice(p.price);
    }, 350);
  };

  setInterval(update, 5000);
}

// ── Countdown Timer ───────────────────────────────────────────
function initCountdown() {
  // Load promo settings saved by admin
  let settings = {};
  try { settings = JSON.parse(localStorage.getItem('zm_site_settings') || '{}'); } catch {}

  // Defaults
  const promoEnabled = settings.promoEnabled !== false && settings.promoEnabled !== 'false';
  const eyebrow      = settings.promoEyebrow  || 'Limited Time Offer';
  const title        = settings.promoTitle    || 'Mega Sale — Up to 30% Off';
  const desc         = settings.promoDesc     || "Don't miss out on our biggest sale of the season. Premium products at unbeatable prices.";
  const btnText      = settings.promoBtnText  || 'Shop the Sale';
  const btnUrl       = settings.promoBtnUrl   || 'shop.html';
  const endDateStr   = settings.promoEndDate  || '';

  // Update banner text content
  const sectionEl = document.getElementById('promo-section');
  if (!sectionEl) return;

  if (!promoEnabled) {
    sectionEl.style.display = 'none';
    return;
  }

  const eyebrowEl = document.getElementById('promo-eyebrow-text');
  const titleEl   = document.getElementById('promo-title-text');
  const descEl    = document.getElementById('promo-desc-text');
  const btnEl     = document.getElementById('promo-btn-link');

  if (eyebrowEl) eyebrowEl.textContent = eyebrow;
  if (titleEl)   titleEl.textContent   = title;
  if (descEl)    descEl.textContent    = desc;
  if (btnEl)     { btnEl.textContent   = btnText; btnEl.href = btnUrl; }

  // Determine end time
  const TIMER_KEY = 'zm_promo_timer_end';
  let end;
  if (endDateStr) {
    end = new Date(endDateStr).getTime();
  } else {
    end = parseInt(sessionStorage.getItem(TIMER_KEY) || '0', 10);
    if (!end || end < Date.now()) {
      end = Date.now() + 24 * 60 * 60 * 1000;
      sessionStorage.setItem(TIMER_KEY, String(end));
    }
  }

  const tick = () => {
    const diff = Math.max(0, end - Date.now());
    const h    = Math.floor(diff / 3600000);
    const m    = Math.floor((diff % 3600000) / 60000);
    const s    = Math.floor((diff % 60000) / 1000);
    const pad  = n => String(n).padStart(2, '0');
    const hEl  = document.getElementById('timer-h');
    const mEl  = document.getElementById('timer-m');
    const sEl  = document.getElementById('timer-s');
    if (hEl) hEl.textContent = pad(h);
    if (mEl) mEl.textContent = pad(m);
    if (sEl) sEl.textContent = pad(s);
    // When timer hits zero, show "Sale Ended"
    if (diff === 0) {
      const timerWrap = document.getElementById('promo-timer-wrap');
      if (timerWrap) timerWrap.innerHTML = '<span style="color:var(--clr-text-3);font-size:.875rem">Sale has ended</span>';
    }
  };
  tick();
  const _timerId = setInterval(tick, 1000);
  // Clean up if the section is ever removed (e.g. SPA navigation)
  window.addEventListener('pagehide', () => clearInterval(_timerId), { once: true });
}

// ── Newsletter ────────────────────────────────────────────────
function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = (document.getElementById('newsletter-email').value || '').trim().toLowerCase();
    if (!email) return;

    // Save to localStorage so admin dashboard can view subscribers
    let subs = [];
    try { subs = JSON.parse(localStorage.getItem(LS.newsletterEmails) || '[]'); } catch {}
    if (!subs.find(s => s.email === email)) {
      subs.unshift({ email, subscribedAt: new Date().toISOString() });
      localStorage.setItem(LS.newsletterEmails, JSON.stringify(subs));
      toast.success('Subscribed!', email + ' added to our newsletter.');
    } else {
      toast.info('Already subscribed', email + ' is already on our newsletter.');
    }
    form.reset();
  });
}

// ── Homepage Reviews ──────────────────────────────────────────
function renderHomepageReviews() {
  const section = document.getElementById('reviews-section');
  if (!section) return;

  // Load homepage reviews config saved by admin
  let cfg = {};
  try { cfg = JSON.parse(localStorage.getItem('zm_homepage_reviews') || '{}'); } catch {}

  // Default to enabled — admin can disable from the reviews panel
  const enabled  = cfg.enabled !== false && cfg.enabled !== 'false';
  if (!enabled) { section.style.display = 'none'; return; }

  // Auto-save enabled=true on first load so the admin panel reflects the live state
  if (cfg.enabled === undefined) {
    try {
      const defaultCfg = { enabled: true, title: 'What Our Customers Say', subtitle: 'Real experiences from real shoppers', maxCount: 3, showCta: false };
      localStorage.setItem('zm_homepage_reviews', JSON.stringify(defaultCfg));
      Object.assign(cfg, defaultCfg);
    } catch {}
  }

  // Update editable heading / subtitle
  const titleEl    = document.getElementById('reviews-section-title');
  const subtitleEl = document.getElementById('reviews-section-subtitle');
  const ctaEl      = document.getElementById('reviews-section-cta');
  if (titleEl    && cfg.title)    titleEl.textContent    = cfg.title;
  if (subtitleEl && cfg.subtitle) subtitleEl.textContent = cfg.subtitle;
  if (ctaEl && cfg.ctaText) {
    ctaEl.textContent = cfg.ctaText + ' ';
    ctaEl.insertAdjacentHTML('beforeend', '<i class="fa-solid fa-arrow-right"></i>');
  }
  if (ctaEl) ctaEl.style.display = cfg.showCta ? '' : 'none';

  // ── Load approved reviews from BOTH stores ──────────────────
  // 1. Admin-curated reviews (zm_admin_reviews)
  let adminReviews = [];
  try { adminReviews = JSON.parse(localStorage.getItem('zm_admin_reviews') || '[]'); } catch {}
  if (!adminReviews.length) {
    adminReviews = [
      { id:'rv-001', product:"Men's Premium Linen Shirt",       customer:'Dinusha P.',   rating:5, text:'Excellent quality! Perfect fit and the fabric is very breathable. Fast delivery to Colombo.',                             date:'2024-03-10', status:'approved' },
      { id:'rv-002', product:'ProRun Air Running Shoes',          customer:'Kasun B.',     rating:4, text:'Great shoes for daily running. Very comfortable. Would have given 5 stars but took a day longer to arrive.',               date:'2024-03-08', status:'approved' },
      { id:'rv-005', product:'ASUS ROG Strix G16 Gaming Laptop',  customer:'Tharindu K.', rating:5, text:'Absolute beast of a laptop. Gaming performance is incredible. Worth every rupee!',                                        date:'2024-03-01', status:'approved' },
    ];
  }
  const approvedAdmin = adminReviews.filter(r => r.status === 'approved');

  // 2. User-submitted product reviews (zm_product_reviews) approved by admin
  const productMap  = getAllReviews();
  const productLookup = {};
  getProducts().forEach(p => { productLookup[p.id] = p.name; });
  const approvedProduct = [];
  Object.entries(productMap).forEach(([pid, list]) => {
    list.forEach(r => {
      if (r.approved === true) {
        approvedProduct.push({
          id:       r.id,
          customer: r.userName || 'Anonymous',
          product:  productLookup[pid] || pid,
          rating:   r.rating,
          text:     r.text,
          date:     r.createdAt,   // ISO string — formatDate handles both formats
          status:   'approved',
        });
      }
    });
  });

  // Merge: admin reviews first, then user-submitted; newest first
  let allReviews = [...approvedAdmin, ...approvedProduct]
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Filter to approved only, then optionally to featured IDs
  let approved = allReviews.filter(r => r.status === 'approved');
  if (cfg.featuredIds && cfg.featuredIds.length) {
    const featured = approved.filter(r => cfg.featuredIds.includes(r.id));
    if (featured.length) approved = featured;
  }

  // Limit count
  const maxCount = parseInt(cfg.maxCount, 10) || 3;
  approved = approved.slice(0, maxCount);

  if (!approved.length) { section.style.display = 'none'; return; }

  function starsHtml(n) {
    return Array.from({length:5}, (_,i) =>
      `<i class="fa-${i < n ? 'solid' : 'regular'} fa-star"></i>`
    ).join('');
  }

  function avatarLetter(name) {
    return (name || '?').trim()[0].toUpperCase();
  }

  function formatDate(d) {
    try {
      return new Date(d).toLocaleDateString('en-LK', { day:'numeric', month:'short', year:'numeric' });
    } catch { return d; }
  }

  const grid = document.getElementById('homepage-reviews-grid');
  if (!grid) return;

  grid.innerHTML = approved.map(r => `
    <div class="review-card reveal">
      <div class="review-card__stars">${starsHtml(r.rating)}</div>
      <p class="review-card__text">${esc(r.text)}</p>
      <div class="review-card__footer">
        <div class="review-card__avatar">${avatarLetter(r.customer)}</div>
        <div>
          <div class="review-card__author">${esc(r.customer)}</div>
          <div class="review-card__product">${esc(r.product)}</div>
        </div>
        <span class="review-card__date">${formatDate(r.date)}</span>
      </div>
    </div>`).join('');

  section.style.display = '';
}

// ── Hero Particle Animation + createAnimatable cursor follower ─
async function initHeroParticles() {
  // ── 1. createAnimatable square (follows mouse inside hero-demo) ──
  initAnimatableSquare();

  // ── 2. Canvas particle field ──────────────────────────────────
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;

  const hero   = canvas.closest('.hero');
  const resize = () => { canvas.width = hero.offsetWidth; canvas.height = hero.offsetHeight; };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const COLORS = [
    'rgba(201,168,76,',
    'rgba(226,192,110,',
    'rgba(160,122,48,',
    'rgba(255,255,255,',
  ];

  const particles = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: 0.5 + Math.random() * 1.8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    vx: (Math.random() - 0.5) * 0.3,
    vy: -0.08 - Math.random() * 0.35,
    alpha: 0,
    maxAlpha: 0.1 + Math.random() * 0.22,
    fadeIn: true,
    life: 0,
    maxLife: 200 + Math.random() * 320,
    delay: Math.random() * 180,
  }));

  let frame = 0;
  const draw = () => {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      if (frame < p.delay) return;
      p.life++;
      if (p.fadeIn) {
        p.alpha = Math.min(p.alpha + 0.007, p.maxAlpha);
        if (p.alpha >= p.maxAlpha) p.fadeIn = false;
      } else {
        p.alpha -= 0.004;
      }
      if (p.alpha <= 0 || p.life > p.maxLife) {
        p.x = Math.random() * canvas.width;
        p.y = canvas.height + 5;
        p.alpha = 0; p.fadeIn = true; p.life = 0;
        p.maxLife = 200 + Math.random() * 320;
      }
      p.x += p.vx; p.y += p.vy;
      if (p.x < -5) p.x = canvas.width + 5;
      if (p.x > canvas.width + 5) p.x = -5;
      if (p.alpha <= 0) return;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.alpha.toFixed(3) + ')';
      ctx.fill();
    });
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}

// ── createAnimatable square — exact anime.js v4 API ───────────
async function initAnimatableSquare() {
  const $demo    = document.getElementById('hero-demo');
  const $square  = document.querySelector('.square');
  const $glow    = document.getElementById('cursor-glow');
  if (!$demo || !$square) return;

  let bounds = $demo.getBoundingClientRect();
  const refreshBounds = () => { bounds = $demo.getBoundingClientRect(); };

  // Listen for scroll / resize to keep bounds fresh
  window.addEventListener('scroll', refreshBounds, { passive: true });
  window.addEventListener('resize', refreshBounds, { passive: true });

  // Track whether mouse is inside the demo panel
  let inside = false;
  $demo.addEventListener('mouseenter', () => {
    inside = true;
    $square.style.opacity = '1';
    if ($glow) $glow.style.opacity = '1';
  });
  $demo.addEventListener('mouseleave', () => {
    inside = false;
    $square.style.opacity = '0';
    if ($glow) $glow.style.opacity = '0';
  });

  // Start hidden
  $square.style.opacity = '0';
  $square.style.transition = 'opacity .3s ease';
  if ($glow) { $glow.style.opacity = '0'; $glow.style.transition = 'opacity .3s ease'; }

  try {
    // Load anime.js v4 from esm.sh (as specified in the user's code)
    const { createAnimatable, utils } = await import('https://esm.sh/animejs');

    // ── The exact pattern from the user's snippet ──────────────
    const animatableSquare = createAnimatable('.square', {
      x: 500,            // x animates over 500 ms
      y: 500,            // y animates over 500 ms
      ease: 'out(3)',
    });

    // Separate faster animatable for the glow (softer lag)
    let animatableGlow = null;
    if ($glow) {
      animatableGlow = createAnimatable('#cursor-glow', {
        x: 800,
        y: 800,
        ease: 'out(2)',
      });
    }

    const onMouseMove = e => {
      if (!inside) return;
      const { width, height, left, top } = bounds;
      const hw = width  / 2;
      const hh = height / 2;

      // Clamp to bounds (matching user's snippet exactly)
      const x = utils.clamp(e.clientX - left - hw, -hw, hw);
      const y = utils.clamp(e.clientY - top  - hh, -hh, hh);

      animatableSquare.x(x);   // animate x in 500ms
      animatableSquare.y(y);   // animate y in 500ms

      if (animatableGlow) {
        animatableGlow.x(x);
        animatableGlow.y(y);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    // Refresh bounds on scroll (from the user's snippet)
    document.querySelector('#docs-demos')?.addEventListener('scroll', refreshBounds);
    $demo.addEventListener('scroll', refreshBounds);

  } catch (err) {
    // Fallback: CSS transition-based follower (no CDN needed)
    console.info('[ZenMarket] anime.js createAnimatable unavailable, using CSS fallback');

    const onMouseMoveFallback = e => {
      if (!inside) return;
      const { width, height, left, top } = bounds;
      const hw = width  / 2;
      const hh = height / 2;
      const x  = Math.max(-hw, Math.min(e.clientX - left - hw, hw));
      const y  = Math.max(-hh, Math.min(e.clientY - top  - hh, hh));

      $square.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      $square.style.transition = 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)';
      if ($glow) {
        $glow.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        $glow.style.transition = 'transform 800ms cubic-bezier(0.22, 1, 0.36, 1)';
      }
    };
    window.addEventListener('mousemove', onMouseMoveFallback);
  }
}
