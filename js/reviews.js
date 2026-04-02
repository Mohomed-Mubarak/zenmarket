/* ============================================================
   ZENMARKET — PRODUCT REVIEWS
   Rules:
     • Must be logged-in (registered account) to submit a review
     • Must have a DELIVERED order containing the product (pending/processing/shipped do not qualify)
     • One review per user per product
     • Can edit the review exactly ONE time (editedAt set on edit, blocks further edits)
     • New reviews are submitted as pending — admin must approve before they show publicly
     • Edited reviews go back to pending for re-approval
     • Admin can approve or reject reviews from the admin reviews panel
     • Rejected reviews are hidden from all public views
   ============================================================ */
import { LS } from './config.js';
import { getOrders } from './store.js';
import { addAdminNotification } from './notifications.js';

// ── Storage helpers ───────────────────────────────────────────

/** Returns the raw reviews map (all statuses): { [productId]: [ reviewObj, … ] } */
export function getAllReviews() {
  try {
    return JSON.parse(localStorage.getItem(LS.productReviews) || '{}');
  } catch { return {}; }
}

/**
 * Returns reviews for a specific product.
 * Public view (includeRejected=false): only approved reviews are shown.
 * Admin view (includeRejected=true): all reviews including pending and rejected.
 * @param {string} productId
 * @param {boolean} includeRejected – pass true for admin contexts only
 */
export function getProductReviews(productId, includeRejected = false) {
  const all = getAllReviews();
  const list = all[productId] || [];
  const filtered = includeRejected
    ? list
    : list.filter(r => r.approved === true && r.rejected !== true);
  return filtered.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/** Returns ALL reviews by a specific userId across every product (for the profile panel) */
export function getUserReviews(userId) {
  if (!userId) return [];
  const all = getAllReviews();
  const result = [];
  Object.entries(all).forEach(([productId, reviews]) => {
    reviews.forEach(r => {
      if (r.userId === userId) result.push({ ...r, productId });
    });
  });
  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/** Save back the entire reviews map */
function saveAllReviews(map) {
  localStorage.setItem(LS.productReviews, JSON.stringify(map));
}

// ── Purchase check ────────────────────────────────────────────

/**
 * Returns true if the given userId has a placed order (any active status)
 * that contains the given productId.
 *
 * Accepted statuses: delivered only.
 * Only fully delivered orders qualify — pending, processing, shipped, and
 * cancelled orders do NOT grant review eligibility.
 */
export function hasPurchased(userId, productId) {
  if (!userId || typeof userId !== 'string' || userId === 'guest') return false;
  if (!productId) return false;

  const ALLOWED_STATUSES = new Set(['delivered']);

  const orders = getOrders();
  return orders.some(order => {
    const isOwner  = order.customerId === userId;
    const hasItem  = (order.items || []).some(i => i.productId === productId);
    const validStatus = ALLOWED_STATUSES.has(order.status);
    return isOwner && hasItem && validStatus;
  });
}

/**
 * Returns true only if the user has a non-cancelled order for this product.
 * This is the sole gate for submitting a new review.
 */
export function canReview(userId, productId) {
  return hasPurchased(userId, productId);
}

// ── Review checks ─────────────────────────────────────────────

/** Returns the existing review by this user for this product, or null */
export function getUserReview(userId, productId) {
  if (!userId) return null;
  const reviews = getProductReviews(productId, true); // include rejected so owner can still see their own
  return reviews.find(r => r.userId === userId) || null;
}

/** True if user has already reviewed this product */
export function hasReviewed(userId, productId) {
  return !!getUserReview(userId, productId);
}

/** True if user is allowed to edit (has review but hasn't used the one-time edit yet) */
export function canEdit(userId, productId) {
  const r = getUserReview(userId, productId);
  if (!r) return false;
  return !r.editedAt; // one edit allowed, regardless of approval status
}

// ── Write / Edit ──────────────────────────────────────────────

/**
 * Add a new review (starts as approved:false — pending admin approval).
 * Returns { success, error? }
 */
export function addReview({ productId, userId, userName, rating, title, text }) {
  if (!userId || typeof userId !== 'string' || userId === 'guest')
    return { success: false, error: 'You must be logged in to leave a review.' };
  // Only customers with a placed (non-cancelled) order for this product may review
  if (!canReview(userId, productId))
    return { success: false, error: 'Only customers who have purchased this product can leave a review.' };
  if (hasReviewed(userId, productId))
    return { success: false, error: 'You have already reviewed this product.' };
  if (!rating || rating < 1 || rating > 5)
    return { success: false, error: 'Please select a star rating.' };
  if (!text || text.trim().length < 10)
    return { success: false, error: 'Review must be at least 10 characters.' };

  const now = new Date().toISOString();
  const review = {
    id:        `REV-${Date.now()}`,
    productId,
    userId,
    userName:  userName || 'Anonymous',
    rating:    Number(rating),
    title:     (title || '').trim(),
    text:      text.trim(),
    createdAt: now,
    editedAt:  null,
    verified:  hasPurchased(userId, productId),  // true if verified buyer
    approved:  false,   // ← requires admin approval before showing publicly
    approvedAt: null,
  };

  const all = getAllReviews();
  if (!all[productId]) all[productId] = [];
  all[productId].push(review);
  saveAllReviews(all);

  // Notify admin of new review pending approval
  addAdminNotification({
    type:    'new_review',
    title:   `New Review Pending Approval ⭐`,
    message: `${userName || 'A customer'} submitted a ${rating}-star review for product #${productId}. Please approve or reject it.`,
    refId:   productId,
  });

  return { success: true, review };
}

/**
 * Edit an existing review (one time only).
 * Returns { success, error? }
 */
export function editReview({ productId, userId, rating, title, text }) {
  if (!userId || typeof userId !== 'string' || userId === 'guest')
    return { success: false, error: 'You must be logged in to edit a review.' };
  if (!canEdit(userId, productId))
    return { success: false, error: 'You have already used your one-time edit, or have no review to edit.' };
  if (!rating || rating < 1 || rating > 5)
    return { success: false, error: 'Please select a star rating.' };
  if (!text || text.trim().length < 10)
    return { success: false, error: 'Review must be at least 10 characters.' };

  const all = getAllReviews();
  const list = all[productId] || [];
  const idx  = list.findIndex(r => r.userId === userId);
  if (idx < 0) return { success: false, error: 'Review not found.' };

  list[idx] = {
    ...list[idx],
    rating:   Number(rating),
    title:    (title || '').trim(),
    text:     text.trim(),
    editedAt: new Date().toISOString(),
    // Edited review goes back to pending for re-approval
    approved:   false,
    rejected:   false,
    approvedAt: null,
  };

  all[productId] = list;
  saveAllReviews(all);
  return { success: true, review: list[idx] };
}

// ── Admin approval helpers ────────────────────────────────────

/**
 * Approve a review by productId + reviewId.
 * Called by the admin reviews page.
 */
export function approveReview(productId, reviewId) {
  const all  = getAllReviews();
  const list = all[productId] || [];
  const idx  = list.findIndex(r => r.id === reviewId);
  if (idx < 0) return false;
  list[idx].approved   = true;
  list[idx].approvedAt = new Date().toISOString();
  all[productId] = list;
  saveAllReviews(all);
  return true;
}

/**
 * Reject a review by productId + reviewId.
 */
export function rejectReview(productId, reviewId) {
  const all  = getAllReviews();
  const list = all[productId] || [];
  const idx  = list.findIndex(r => r.id === reviewId);
  if (idx < 0) return false;
  list[idx].approved   = false;
  list[idx].rejected   = true;
  list[idx].approvedAt = null;
  all[productId] = list;
  saveAllReviews(all);
  return true;
}

/** Returns flat array of all user-submitted reviews (for admin dashboard) */
export function getAllReviewsFlat() {
  const all = getAllReviews();
  const result = [];
  Object.entries(all).forEach(([productId, reviews]) => {
    reviews.forEach(r => result.push({ ...r, productId }));
  });
  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ── Stats helper ──────────────────────────────────────────────

/** Returns { avg, count, breakdown: {5:n,4:n,…} } for a product (all non-rejected reviews) */
export function getReviewStats(productId) {
  const reviews = getProductReviews(productId); // all non-rejected reviews
  if (!reviews.length) return { avg: 0, count: 0, breakdown: {} };
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  reviews.forEach(r => { sum += r.rating; breakdown[r.rating] = (breakdown[r.rating] || 0) + 1; });
  return { avg: +(sum / reviews.length).toFixed(1), count: reviews.length, breakdown };
}

// ── Sample review seeder ──────────────────────────────────────

const SEED_NAMES = [
  'Ashan Perera', 'Dilini Fernando', 'Roshan Mendis', 'Kavindi Silva', 'Nimal Wickrama',
  'Tharushi Bandara', 'Sachith Rajapaksa', 'Malini Jayawardena', 'Chamara Kumara', 'Hiruni Tennakoon',
  'Pradeep Niroshan', 'Sanduni Liyanage', 'Kasun Ekanayake', 'Thilini Oshadi', 'Ruwan Herath',
  'Amaya Cooray', 'Dinesh Vitharana', 'Subashi Gunasekara', 'Lahiru Gamage', 'Nadeesha Udayangani',
  'Isuru Madhuranga', 'Charith Fonseka', 'Nimali Rathnayake', 'Dilan Gunawardena', 'Yasoda Senanayake',
];

// Paired title + text pools for richer, varied reviews
const SEED_REVIEWS = [
  {
    title: 'Exceeded my expectations',
    text: "I ordered on a Monday and it arrived Wednesday — much faster than expected. Quality is really impressive for the price. Packaging was neat and secure. I already recommended it to my sister and she placed an order too. Will definitely shop here again.",
    rating: 5,
  },
  {
    title: 'Great value for money',
    text: "Honestly one of the best purchases I've made online in Sri Lanka. The product is solid, looks exactly like the photos, and the price is very fair. Delivery took about 3 days to Kandy which is fine. My only feedback is they could include a small instruction card.",
    rating: 5,
  },
  {
    title: 'Really happy with this purchase',
    text: "Arrived in perfect condition and I've been using it daily for two weeks. No issues so far. Customer service was helpful when I had a question before ordering. The size guide was accurate. Very pleased overall.",
    rating: 5,
  },
  {
    title: 'Good but minor packaging issue',
    text: "The product itself is great — exactly as described and good quality. However the outer packaging was slightly dented on arrival, though the item inside was perfectly fine. Minus one star for that. Would still buy from ZenMarket again.",
    rating: 4,
  },
  {
    title: 'Highly recommend!',
    text: "This is my third order from ZenMarket and they've never let me down. Consistent quality and reliable delivery. I bought this as a gift and the recipient absolutely loved it. The presentation is great straight out of the box.",
    rating: 5,
  },
  {
    title: 'Perfect for what I needed',
    text: "I was looking for something like this for a while and ZenMarket had the best price I found anywhere. Ordered Friday, received Monday. Works perfectly. Solid build. I'm leaving this review because I wish more reviews existed when I was deciding.",
    rating: 5,
  },
  {
    title: 'Exactly as described',
    text: "The photos are accurate and the product lives up to the description. No misleading angles or exaggerated colours. Quality is good for the price point. Delivery was on time. Simple, honest experience — I appreciate that.",
    rating: 4,
  },
  {
    title: 'Will buy again',
    text: "Smooth checkout, fast delivery, good product. Nothing fancy to say — everything just worked the way it should. The item is well-made and sturdy. Already thinking about my next purchase from here.",
    rating: 5,
  },
  {
    title: 'Decent quality, fair price',
    text: "I wouldn't call it premium but it's good quality for what you pay. Took about 4 days to reach me in Galle. Looks nice, functions well. A few friends have asked where I got it. Good everyday option if you don't want to overspend.",
    rating: 4,
  },
  {
    title: 'Fast delivery, great quality',
    text: "Placed the order late at night and it was dispatched the very next morning. Arrived two days later. Product quality is noticeably better than similar items from other local sites. This is now my go-to shop for online purchases.",
    rating: 5,
  },
  {
    title: 'Bought as a gift — they loved it',
    text: "Got this for a birthday and the recipient was thrilled. The product itself is lovely and felt premium. It came well-packaged so no extra gift wrapping was needed. Couldn't be happier with the purchase.",
    rating: 5,
  },
  {
    title: 'Pretty good overall',
    text: "The product is solid and does what it's supposed to. Delivery was within the estimated window. I've had slightly better quality elsewhere but the pricing here makes up for it. Would buy again if the price stays this good.",
    rating: 4,
  },
  {
    title: 'Quality is outstanding',
    text: "I was surprised by how good this feels in person. The photos actually undersell it a bit. Very well made. I've been using it for three weeks and it still looks brand new. Highly recommend to anyone on the fence about ordering.",
    rating: 5,
  },
  {
    title: 'Second time ordering — still excellent',
    text: "Bought this exact item a few months back and came back to order another one. Quality is consistent. Delivery time was the same as before — about 3 days. ZenMarket has earned my repeat business for sure.",
    rating: 5,
  },
  {
    title: 'Took longer than expected',
    text: "The product quality is good and I'm happy with it. However delivery took 6 days instead of the 3–5 stated. It may have been a busy period. The item itself is well worth the price and I'd order again with that in mind.",
    rating: 3,
  },
  {
    title: 'Solid everyday product',
    text: "Nothing flashy but does the job reliably. Good materials, sensible design. Delivery was fast and packaging was secure. Exactly what I was looking for without paying a premium. Simple thumbs up from me.",
    rating: 4,
  },
  {
    title: 'Arrived in pristine condition',
    text: "Well-packaged and no damage at all during transit. The product itself is great — matches the listing photos precisely. Very happy with the purchase. ZenMarket clearly takes care in how they pack their orders.",
    rating: 5,
  },
  {
    title: 'Great experience from start to finish',
    text: "Easy to browse, simple checkout, clear confirmation email, and then the product arrived quickly and in perfect shape. Every step was smooth. This is how online shopping should work. Genuinely impressed.",
    rating: 5,
  },
  {
    title: 'Good product, small suggestion',
    text: "The item is good quality and I use it regularly. My only suggestion is that ZenMarket could provide a bit more detail on sizing — I had to guess and got lucky. Otherwise everything was fine and I'd shop here again.",
    rating: 4,
  },
  {
    title: 'Love it!',
    text: "Absolutely love this purchase. It's become part of my daily routine. Great quality, great price. My family members have all asked where I got it and I've sent them the link. Can't recommend it enough.",
    rating: 5,
  },
];

/**
 * Seeds sample reviews for a product if it has a reviewCount but no
 * localStorage reviews yet. Safe to call on every page load — it checks
 * the seed flag first so it only runs once per product.
 *
 * @param {{ id: string, reviewCount?: number, rating?: number }} product
 */
export function seedReviewsIfNeeded(product) {
  if (!product?.id || !product.reviewCount) return;

  const SEED_FLAG_KEY = 'zm_reviews_seeded_v4';
  let seeded = {};
  try { seeded = JSON.parse(localStorage.getItem(SEED_FLAG_KEY) || '{}'); } catch { /* */ }
  if (seeded[product.id]) return; // already done

  const existing = getProductReviews(product.id, true);

  // Count only real seeded reviews (not user-submitted ones)
  const seededExisting = existing.filter(r => r._seeded);
  if (seededExisting.length >= 20) {
    seeded[product.id] = true;
    localStorage.setItem(SEED_FLAG_KEY, JSON.stringify(seeded));
    return;
  }

  const count     = Math.min(product.reviewCount, 20);
  const targetAvg = product.rating || 4.5;
  const all       = getAllReviews();
  if (!all[product.id]) all[product.id] = [];

  // Remove old seeded reviews before re-seeding so we don't duplicate
  all[product.id] = all[product.id].filter(r => !r._seeded);

  // Build rating distribution matching target average
  const dist = targetAvg >= 4.7
    ? [5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 3, 3, 2, 2, 4, 5]
    : targetAvg >= 4.3
      ? [5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 3, 3, 3, 2, 2, 1, 5, 4, 4]
      : [5, 5, 5, 4, 4, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 1, 1, 5, 4, 3];

  // Use a stable shuffle seeded by product id so results are deterministic per product
  const idSum = product.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const shuffled = SEED_REVIEWS.slice().sort((a, b) => {
    const ha = (a.rating * 13 + idSum) % 17;
    const hb = (b.rating * 13 + idSum) % 17;
    return ha - hb;
  });

  for (let i = 0; i < count; i++) {
    const seed    = shuffled[i % shuffled.length];
    const name    = SEED_NAMES[(i + idSum) % SEED_NAMES.length];
    const rating  = dist[i % dist.length];
    const daysAgo = ((i * 13 + idSum * 7) % 200) + 1; // deterministic spread
    const date    = new Date(Date.now() - daysAgo * 86400000).toISOString();

    all[product.id].push({
      id:         `SEED-${product.id}-${i}`,
      productId:  product.id,
      userId:     `seed-user-${i}`,
      userName:   name,
      rating,
      title:      seed.title,
      text:       seed.text,
      createdAt:  date,
      editedAt:   null,
      verified:   i % 4 !== 0,   // ~75% verified buyers
      approved:   true,
      approvedAt: date,
      _seeded:    true,
    });
  }

  saveAllReviews(all);
  seeded[product.id] = true;
  localStorage.setItem(SEED_FLAG_KEY, JSON.stringify(seeded));
}

/**
 * Seeds reviews for every product in the catalogue in one pass.
 * Call this once from store.js getProducts() or any page's withLoader.
 * After the first run the SEED_FLAG_KEY entries short-circuit all further calls.
 *
 * @param {Array<{id: string, reviewCount?: number, rating?: number}>} products
 */
export function seedAllReviews(products) {
  if (!Array.isArray(products)) return;
  for (const product of products) {
    seedReviewsIfNeeded(product);
  }
}

// ── Demo display review seeder ───────────────────────────────
/**
 * Seeds realistic, pre-approved display reviews under ANONYMOUS user IDs
 * so they appear on product pages and the homepage WITHOUT blocking real
 * demo users (Dinusha/Kasun/Shalini) from writing their own reviews.
 *
 * All entries use userId 'demo-anon-N' — never a real account ID.
 * Safe to call on every page load — the seed flag prevents re-running.
 */
const DEMO_DISPLAY_REVIEWS = [
  // PRD-0001 Men's Premium Linen Shirt
  { userId: 'demo-anon-1',  userName: 'Ruwan M.',      productId: 'PRD-0001', rating: 5, title: 'Perfect for Sri Lankan weather',   text: 'Light, breathable, and looks smart. Exactly what I needed for the office. The M size fits true to measurements. Highly recommend.', daysAgo: 34, verified: true },
  { userId: 'demo-anon-1b', userName: 'Chamara K.',    productId: 'PRD-0001', rating: 5, title: 'Bought three colours already',      text: 'Started with white, loved it so much I grabbed navy and sky blue too. The linen quality is noticeably better than other local brands. Delivery was 2 days both times.', daysAgo: 21, verified: true },
  { userId: 'demo-anon-1c', userName: 'Nimal W.',      productId: 'PRD-0001', rating: 4, title: 'Great shirt, runs slightly large',  text: 'Really nice quality linen. I usually take a medium but had to exchange for a small. Customer support handled it with no fuss. Deducting one star for the sizing discrepancy.', daysAgo: 58, verified: true },

  // PRD-0002 Women's Floral Midi Dress
  { userId: 'demo-anon-2',  userName: 'Hiruni T.',     productId: 'PRD-0002', rating: 4, title: 'Beautiful dress, great quality',   text: 'The fabric feels premium and the floral pattern is lovelier in person than in the photos. Sizing was accurate. One star off only because it took an extra day to arrive.', daysAgo: 49, verified: true },
  { userId: 'demo-anon-2b', userName: 'Kavindi S.',    productId: 'PRD-0002', rating: 5, title: 'Wore this to a wedding — loved it', text: 'Got so many compliments. The midi length is perfect, not too formal and not too casual. Fabric is light enough for a daytime outdoor event. Will definitely shop here again.', daysAgo: 30, verified: true },
  { userId: 'demo-anon-2c', userName: 'Thilini O.',    productId: 'PRD-0002', rating: 5, title: 'Exactly as shown in photos',       text: 'The colours are vibrant and true to the listing images. Stitching quality is excellent. I hand-washed it twice already and it has not faded at all. Very pleased.', daysAgo: 62, verified: true },

  // PRD-0003 Handwoven Silk Batik Saree
  { userId: 'demo-anon-3',  userName: 'Sanduni L.',    productId: 'PRD-0003', rating: 5, title: 'Stunning craftsmanship',           text: 'The forest green saree is absolutely beautiful — rich colour and the batik pattern is so detailed. You can tell real artisans made this. A genuine piece of Sri Lankan heritage.', daysAgo: 65, verified: true },
  { userId: 'demo-anon-3b', userName: 'Malini J.',     productId: 'PRD-0003', rating: 5, title: 'A true work of art',               text: 'I ordered this for my daughter\'s wedding and everyone was asking where I got it. The silk drapes beautifully and the batik pattern is incredibly intricate. Packaging was also very elegant.', daysAgo: 44, verified: true },

  // PRD-0004 Kids' Dinosaur Print Backpack
  { userId: 'demo-anon-4',  userName: 'Sachith R.',    productId: 'PRD-0004', rating: 5, title: 'My son refuses to use any other',  text: 'He has been asking for a dinosaur bag for months and this one is perfect. Sturdy zips, comfortable straps, and the print quality is excellent. It has survived three months of school already.', daysAgo: 28, verified: true },
  { userId: 'demo-anon-4b', userName: 'Tharushi B.',   productId: 'PRD-0004', rating: 4, title: 'Great quality, good size',         text: 'Really well made for a kids\' bag. The compartments are practical and it fits all the school essentials. Only wish it came in purple too. My daughter loves the dinosaurs though!', daysAgo: 40, verified: true },

  // PRD-0005 ProRun Air Running Shoes
  { userId: 'demo-anon-5',  userName: 'Shalini F.',    productId: 'PRD-0005', rating: 5, title: 'Excellent running shoes',          text: "I run 5km every morning and these are incredibly comfortable. Great grip, don't get too hot. Very happy with this purchase.", daysAgo: 33, verified: true },
  { userId: 'demo-anon-5b', userName: 'Dinesh V.',     productId: 'PRD-0005', rating: 5, title: 'Used for a half marathon',         text: 'Finished my first half-marathon in these and my feet felt great throughout. The cushioning absorbs impact well on road and the fit is snug without being tight. Absolutely recommend.', daysAgo: 19, verified: true },
  { userId: 'demo-anon-5c', userName: 'Lahiru G.',     productId: 'PRD-0005', rating: 4, title: 'Comfortable but sizing is narrow', text: 'The shoe performs brilliantly and the sole grip is excellent on wet roads. I do have slightly wide feet so I sized up half a size. If you\'re standard width you will be fine with your regular size.', daysAgo: 55, verified: true },

  // PRD-0006 CrossFit Training Shoes
  { userId: 'demo-anon-6',  userName: 'Pradeep N.',    productId: 'PRD-0006', rating: 5, title: 'Great for gym and CrossFit',      text: 'Flat sole gives brilliant stability for deadlifts and squats. Lateral support is solid for box jumps too. Very comfortable after a full hour session.', daysAgo: 72, verified: true },
  { userId: 'demo-anon-6b', userName: 'Isuru M.',      productId: 'PRD-0006', rating: 5, title: 'My go-to gym shoes now',          text: 'Switched from regular running shoes and my lifts have improved noticeably. The heel-to-toe drop is minimal which is exactly what you want for squats. Durable canvas upper too.', daysAgo: 50, verified: true },

  // PRD-0007 Classic Canvas Sneakers
  { userId: 'demo-anon-7',  userName: 'Kasun B.',      productId: 'PRD-0007', rating: 5, title: 'Comfy and stylish',               text: 'Ordered two pairs and both fit perfectly. The canvas is good quality and they look great with almost anything. Will be ordering more colours.', daysAgo: 11, verified: true },
  { userId: 'demo-anon-7b', userName: 'Amaya C.',      productId: 'PRD-0007', rating: 5, title: 'Classic look, great daily wear',  text: 'I wear these to the office on casual Fridays and on weekends. They pair well with jeans or chinos. Very comfortable out of the box — no breaking-in needed.', daysAgo: 24, verified: true },
  { userId: 'demo-anon-7c', userName: 'Yasoda S.',     productId: 'PRD-0007', rating: 4, title: 'Good value, decent quality',      text: 'For the price these are very good. The canvas stitching is neat and the rubber sole is thick and sturdy. My only note is they run slightly long so size down if you are between sizes.', daysAgo: 38, verified: true },

  // PRD-0008 iPhone 12 — Pre-owned (Grade A)
  { userId: 'demo-anon-8',  userName: 'Dilan G.',      productId: 'PRD-0008', rating: 5, title: 'Great condition, feels brand new', text: 'Ordered the 128GB Black and it arrived in spotless condition. Battery health is 91% and the screen has no scratches at all. Came with a cable and the 30-day warranty gives peace of mind. Great deal.', daysAgo: 16, verified: true },
  { userId: 'demo-anon-8b', userName: 'Nadeesha U.',   productId: 'PRD-0008', rating: 4, title: 'Good value used iPhone',          text: 'Much cheaper than buying new and the phone works perfectly. Face ID, camera, and speakers are all excellent. I deducted one star only because the box was missing but the phone itself is flawless.', daysAgo: 29, verified: true },

  // PRD-0009 Dell G15 Gaming Laptop — Used
  { userId: 'demo-anon-9',  userName: 'Charith F.',    productId: 'PRD-0009', rating: 5, title: 'Excellent used gaming laptop',    text: 'Runs all my games at high settings without any issues. The 6-month warranty gave me confidence and the laptop arrived in genuinely excellent condition. Huge saving over buying new.', daysAgo: 22, verified: true },
  { userId: 'demo-anon-9b', userName: 'Subashi G.',    productId: 'PRD-0009', rating: 4, title: 'Great performance, good price',   text: 'The i7 handles everything I throw at it — video editing, gaming, coding. There is a tiny scratch on the lid but the seller mentioned it and priced accordingly. Very happy with the purchase overall.', daysAgo: 47, verified: true },

  // PRD-0010 Pre-loved Winter Jacket
  { userId: 'demo-anon-10', userName: 'Nimali R.',     productId: 'PRD-0010', rating: 5, title: 'Looks brand new, great price',   text: 'The jacket arrived dry-cleaned and in excellent shape. You would never guess it was pre-loved. Really warm and the quality of the original garment is clearly high. Perfect for travel abroad.', daysAgo: 75, verified: true },
  { userId: 'demo-anon-10b',userName: 'Dinusha P.',    productId: 'PRD-0010', rating: 4, title: 'Good condition, well inspected',  text: 'I was sceptical buying a used jacket but the listing photos were accurate and it arrived in great condition. Fits true to size and kept me warm on my trip to UK. Good sustainable shopping option.', daysAgo: 53, verified: true },

  // PRD-0011 ASUS ROG Strix G16 Gaming Laptop
  { userId: 'demo-anon-11', userName: 'Ruwan M.',      productId: 'PRD-0011', rating: 5, title: 'Best gaming laptop I have owned', text: 'The RTX 4060 handles everything at max settings. The 165Hz display is buttery smooth and the build quality is exceptional. Ryzen 7 stays cool even during long sessions. Worth every rupee.', daysAgo: 20, verified: true },
  { userId: 'demo-anon-11b',userName: 'Hiruni T.',     productId: 'PRD-0011', rating: 5, title: 'Stunning performance and display', text: 'I upgraded from a 60Hz laptop and the difference is night and day. QHD at 165Hz makes gaming incredible. The keyboard backlight is customisable and the speakers are surprisingly good for a gaming laptop.', daysAgo: 41, verified: true },

  // PRD-0012 Lenovo ThinkPad E14 Business Laptop
  { userId: 'demo-anon-12', userName: 'Kavindi S.',    productId: 'PRD-0012', rating: 5, title: 'Perfect work laptop',             text: 'The build quality is exceptional — feels solid and professional. The 12th Gen i5 handles all my office work and video calls without breaking a sweat. Battery easily lasts a full workday.', daysAgo: 18, verified: true },
  { userId: 'demo-anon-12b',userName: 'Tharushi B.',   productId: 'PRD-0012', rating: 5, title: 'Reliable and well-built',         text: 'ThinkPad keyboards are legendary and this one does not disappoint. The display is bright and sharp. I upgraded the RAM to 16GB and it runs everything effortlessly. Great business machine.', daysAgo: 36, verified: true },

  // PRD-0013 Acer Aspire 3 Budget Laptop
  { userId: 'demo-anon-13', userName: 'Sachith R.',    productId: 'PRD-0013', rating: 5, title: 'Excellent value for students',    text: 'I bought this for university and it handles all my assignments, Zoom calls, and light coding perfectly. The SSD makes it feel snappy and fast. Cannot find a better laptop at this price point.', daysAgo: 31, verified: true },
  { userId: 'demo-anon-13b',userName: 'Chamara K.',    productId: 'PRD-0013', rating: 4, title: 'Good everyday laptop, fast SSD',  text: 'Very capable for everyday tasks and even some light gaming. The Ryzen 3 is more powerful than I expected. I wish the battery life was a bit longer but otherwise it is a solid machine for the price.', daysAgo: 60, verified: true },

  // PRD-0014 Mechanical RGB Gaming Keyboard
  { userId: 'demo-anon-14', userName: 'Isuru M.',      productId: 'PRD-0014', rating: 5, title: 'Tactile feedback is satisfying',  text: 'Went with the Brown switches and the typing experience is wonderful — quiet enough for office use but with satisfying feedback. The aluminium frame feels premium and the USB-C cable is a nice touch.', daysAgo: 43, verified: true },
  { userId: 'demo-anon-14b',userName: 'Nimal W.',      productId: 'PRD-0014', rating: 5, title: 'RGB lighting is stunning',        text: 'The per-key RGB is vibrant and customisable. I chose Blue switches for the clicky feedback during gaming and they are very satisfying. Build quality is solid — no flex at all in the frame.', daysAgo: 27, verified: true },

  // PRD-0015 Wireless Ergonomic Mouse
  { userId: 'demo-anon-15', userName: 'Amaya C.',      productId: 'PRD-0015', rating: 5, title: 'Wrist pain completely gone',      text: 'I developed wrist strain from my old flat mouse. After two weeks with this ergonomic one the pain has disappeared. The shape fits the hand naturally and the wireless range is excellent throughout my office.', daysAgo: 50, verified: true },
  { userId: 'demo-anon-15b',userName: 'Malini J.',     productId: 'PRD-0015', rating: 5, title: 'Battery life is incredible',      text: 'The 12-month battery claim is not an exaggeration — I have been using it for 8 months on the original batteries. The scroll wheel is smooth and the six programmable buttons are very handy.', daysAgo: 32, verified: true },

  // PRD-0016 Portable SSD 1TB — USB-C
  { userId: 'demo-anon-16', userName: 'Dinesh V.',     productId: 'PRD-0016', rating: 5, title: 'Blazing fast transfer speeds',    text: 'I transfer large video files daily and this SSD is a game-changer. Massive files move in seconds. Tiny enough to carry in a shirt pocket. Works perfectly with both my laptop and phone via USB-C.', daysAgo: 15, verified: true },
  { userId: 'demo-anon-16b',userName: 'Nimali R.',     productId: 'PRD-0016', rating: 4, title: 'Fast and compact, great value',   text: 'Read speeds are as advertised and the aluminium casing feels sturdy. The only reason for 4 stars is that it gets slightly warm during long transfers, but this seems normal for NVMe-based drives.', daysAgo: 39, verified: true },

  // PRD-0017 27" Curved Gaming Monitor
  { userId: 'demo-anon-17', userName: 'Pradeep N.',    productId: 'PRD-0017', rating: 5, title: 'Immersive gaming experience',     text: 'The 1500R curve wraps the display around your field of view perfectly. At 165Hz games look unbelievably smooth. No ghosting at all and FreeSync eliminates screen tearing with my GPU. A stunning monitor.', daysAgo: 45, verified: true },
  { userId: 'demo-anon-17b',userName: 'Dilan G.',      productId: 'PRD-0017', rating: 5, title: 'Colours are vibrant and accurate', text: 'The QHD resolution makes a huge difference over 1080p. Text is crisp for productivity and games look gorgeous. Response time is fast enough that I notice no blur even in fast-paced shooters.', daysAgo: 23, verified: true },

  // PRD-0018 Premium Wireless Earbuds Pro
  { userId: 'demo-anon-18', userName: 'Dinusha P.',    productId: 'PRD-0018', rating: 5, title: 'Best earbuds I have owned',       text: 'Sound quality is incredible — deep bass, crisp highs, and the noise cancellation actually works. Battery lasts all day. Fast delivery to Dehiwala too.', daysAgo: 12, verified: true },
  { userId: 'demo-anon-18b',userName: 'Kasun B.',      productId: 'PRD-0018', rating: 5, title: 'ANC is genuinely impressive',     text: 'I commute by bus daily and these earbuds have changed my morning. Active noise cancellation cuts out the engine noise completely. Call quality is also crystal clear. Worth every rupee.', daysAgo: 8, verified: true },
  { userId: 'demo-anon-18c',userName: 'Yasoda S.',     productId: 'PRD-0018', rating: 4, title: 'Excellent sound, good fit',       text: 'The large ear tips seal perfectly and the bass response is rich. My only minor gripe is the touch controls take some getting used to. Once you learn them they work flawlessly though. Very happy overall.', daysAgo: 26, verified: true },

  // PRD-0019 Smart Fitness Watch
  { userId: 'demo-anon-19', userName: 'Tharindu K.',   productId: 'PRD-0019', rating: 5, title: 'Best fitness watch I have used',  text: 'The GPS is accurate, heart rate tracking is consistent, and the 7-day battery life is impressive. The health insights motivate me to move more every day. Build quality is excellent for the price.', daysAgo: 55, verified: true },
  { userId: 'demo-anon-19b',userName: 'Charith F.',    productId: 'PRD-0019', rating: 5, title: 'Tracks everything I need',        text: 'Sleep tracking, steps, workouts, SpO2 — this watch does it all. The 44mm screen is easy to read even outdoors. Pairs with my phone instantly and the notifications work flawlessly. Very happy.', daysAgo: 37, verified: true },

  // PRD-0020 Luxury Bamboo Diffuser Set
  { userId: 'demo-anon-20', userName: 'Subashi G.',    productId: 'PRD-0020', rating: 5, title: 'Transforms the whole room',       text: 'The mist output is generous and consistent. I use it with lavender oil every evening and the entire living room fills with a calming scent. The LED glow is beautiful and the auto shut-off is very convenient.', daysAgo: 17, verified: true },
  { userId: 'demo-anon-20b',userName: 'Nadeesha U.',   productId: 'PRD-0020', rating: 5, title: 'Beautiful gift set, great quality',text: 'Bought this as a housewarming gift. The bamboo finish looks premium and the six essential oils are a lovely bonus. The recipient was genuinely delighted. Packaging was elegant and arrived perfectly intact.', daysAgo: 43, verified: true },
];

export function seedDemoUserReviews() {
  const DEMO_SEED_FLAG = 'zm_demo_display_reviews_seeded_v4';
  try {
    if (localStorage.getItem(DEMO_SEED_FLAG) === 'true') return;
  } catch { return; }

  const all = getAllReviews();

  for (const rev of DEMO_DISPLAY_REVIEWS) {
    if (!all[rev.productId]) all[rev.productId] = [];
    // Don't double-seed same anonymous slot
    if (all[rev.productId].some(r => r.userId === rev.userId)) continue;

    const date = new Date(Date.now() - rev.daysAgo * 86_400_000).toISOString();
    all[rev.productId].push({
      id:         `DISP-REV-${rev.userId}-${rev.productId}`,
      productId:  rev.productId,
      userId:     rev.userId,   // always 'demo-anon-N' — never a real user ID
      userName:   rev.userName,
      rating:     rev.rating,
      title:      rev.title,
      text:       rev.text,
      createdAt:  date,
      editedAt:   null,
      verified:   rev.verified,
      approved:   true,
      approvedAt: date,
      rejected:   false,
      _seeded:    true,
    });
  }

  saveAllReviews(all);
  try { localStorage.setItem(DEMO_SEED_FLAG, 'true'); } catch {}
}
