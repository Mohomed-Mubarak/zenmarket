/* ============================================================
   ZENMARKET — STORE (Demo Data + localStorage persistence)
   ============================================================ */
import { LS } from './config.js';
// One-time flag so we only seed reviews once per page lifecycle
let _reviewsSeeded = false;
export { LS };  // re-export so admin pages can do: import { LS } from '../js/store.js'

// ── Default Categories ────────────────────────────────────────
// ── Default Categories (with Subcategories) ───────────────────
export const DEFAULT_CATEGORIES = [
  {
    id: 'cat-001', name: 'Clothing', slug: 'clothing',
    icon: 'fa-solid fa-shirt', isDefault: true, active: true,
    subcategories: [
      { id: 'sub-001-1', name: "Men's Wear",      slug: 'mens-wear'      },
      { id: 'sub-001-2', name: "Women's Wear",    slug: 'womens-wear'    },
      { id: 'sub-001-3', name: "Kids' Wear",      slug: 'kids-wear'      },
      { id: 'sub-001-4', name: 'Traditional Wear', slug: 'traditional-wear' },
    ],
  },
  {
    id: 'cat-002', name: 'Sport Shoes', slug: 'sport-shoes',
    icon: 'fa-solid fa-shoe-prints', isDefault: true, active: true,
    subcategories: [
      { id: 'sub-002-1', name: 'Running Shoes',   slug: 'running-shoes'  },
      { id: 'sub-002-2', name: 'Training Shoes',  slug: 'training-shoes' },
      { id: 'sub-002-3', name: 'Casual Sneakers', slug: 'casual-sneakers'},
    ],
  },
  {
    id: 'cat-003', name: 'Second Hand', slug: 'second-hand',
    icon: 'fa-solid fa-recycle', isDefault: true, active: true,
    subcategories: [
      { id: 'sub-003-1', name: 'Used Electronics', slug: 'used-electronics'},
      { id: 'sub-003-2', name: 'Used Clothing',    slug: 'used-clothing'   },
      { id: 'sub-003-3', name: 'Used Furniture',   slug: 'used-furniture'  },
      { id: 'sub-003-4', name: 'Used Books',       slug: 'used-books'      },
    ],
  },
  {
    id: 'cat-004', name: 'Laptops', slug: 'laptops',
    icon: 'fa-solid fa-laptop', isDefault: true, active: true,
    subcategories: [
      { id: 'sub-004-1', name: 'Gaming Laptops',   slug: 'gaming-laptops'  },
      { id: 'sub-004-2', name: 'Business Laptops', slug: 'business-laptops'},
      { id: 'sub-004-3', name: 'Budget Laptops',   slug: 'budget-laptops'  },
    ],
  },
  {
    id: 'cat-005', name: 'Computer Accessories', slug: 'computer-accessories',
    icon: 'fa-solid fa-computer-mouse', isDefault: true, active: true,
    subcategories: [
      { id: 'sub-005-1', name: 'Keyboards',  slug: 'keyboards' },
      { id: 'sub-005-2', name: 'Mice',       slug: 'mice'      },
      { id: 'sub-005-3', name: 'Monitors',   slug: 'monitors'  },
      { id: 'sub-005-4', name: 'Storage',    slug: 'storage'   },
      { id: 'sub-005-5', name: 'Cables & Hubs', slug: 'cables-hubs' },
    ],
  },
  {
    id: 'cat-006', name: 'Electronics', slug: 'electronics',
    icon: 'fa-solid fa-microchip', isDefault: true, active: true,
    subcategories: [
      { id: 'sub-006-1', name: 'Phones',     slug: 'phones'     },
      { id: 'sub-006-2', name: 'Audio',      slug: 'audio'      },
      { id: 'sub-006-3', name: 'Cameras',    slug: 'cameras'    },
      { id: 'sub-006-4', name: 'Wearables',  slug: 'wearables'  },
    ],
  },
  {
    id: 'cat-007', name: 'Home & Living', slug: 'home-living',
    icon: 'fa-solid fa-couch', isDefault: true, active: true,
    subcategories: [
      { id: 'sub-007-1', name: 'Furniture',  slug: 'furniture'  },
      { id: 'sub-007-2', name: 'Kitchen',    slug: 'kitchen'    },
      { id: 'sub-007-3', name: 'Decor',      slug: 'decor'      },
    ],
  },
  {
    id: 'cat-008', name: 'Beauty', slug: 'beauty',
    icon: 'fa-solid fa-spa', isDefault: true, active: true,
    subcategories: [
      { id: 'sub-008-1', name: 'Skincare',   slug: 'skincare'   },
      { id: 'sub-008-2', name: 'Makeup',     slug: 'makeup'     },
      { id: 'sub-008-3', name: 'Hair Care',  slug: 'hair-care'  },
    ],
  },
];

// ── Default Products ──────────────────────────────────────────
export const DEFAULT_PRODUCTS = [
  // ── CLOTHING ──────────────────────────────────────────────
  {
    id: 'PRD-0001', slug: 'mens-casual-linen-shirt',
    name: "Men's Premium Linen Shirt",
    category: 'Clothing', categorySlug: 'clothing',
    subcategory: "Men's Wear", subcategorySlug: 'mens-wear',
    price: 2800, comparePrice: 3900,
    images: [
      'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=600&q=80',
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&q=80',
    ],
    description: "Breathable premium linen shirt, perfect for Sri Lanka's tropical climate. Relaxed fit with a clean collar.",
    tags: ['shirt', 'linen', 'mens', 'casual'],
    variants: [
      { name: 'Size',  options: ['S', 'M', 'L', 'XL', 'XXL'] },
      { name: 'Color', options: ['White', 'Sky Blue', 'Olive Green', 'Beige'] },
    ],
    stock: 80, sku: 'SKU-CLO-0001', featured: true, active: true,
    rating: 4.6, reviewCount: 94, weight: '0.3kg', createdAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'PRD-0002', slug: 'womens-floral-midi-dress',
    name: "Women's Floral Midi Dress",
    category: 'Clothing', categorySlug: 'clothing',
    subcategory: "Women's Wear", subcategorySlug: 'womens-wear',
    price: 4500, comparePrice: 6200,
    images: [
      'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80',
      'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=600&q=80',
    ],
    description: 'Elegant floral midi dress in light chiffon fabric. Perfect for casual outings, parties, or work events.',
    tags: ['dress', 'floral', 'womens', 'midi'],
    variants: [
      { name: 'Size',  options: ['XS', 'S', 'M', 'L', 'XL'] },
      { name: 'Color', options: ['Pink Floral', 'Blue Floral', 'Yellow Floral'] },
    ],
    stock: 55, sku: 'SKU-CLO-0002', featured: true, active: true,
    rating: 4.8, reviewCount: 143, weight: '0.4kg', createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'PRD-0003', slug: 'silk-batik-saree',
    name: 'Handwoven Silk Batik Saree',
    category: 'Clothing', categorySlug: 'clothing',
    subcategory: 'Traditional Wear', subcategorySlug: 'traditional-wear',
    price: 24500, comparePrice: 32000,
    images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
    ],
    description: 'Authentic handwoven silk batik saree crafted by Sri Lankan artisans. Each piece is unique with traditional Kandy-style patterns.',
    tags: ['saree', 'silk', 'batik', 'traditional'],
    variants: [{ name: 'Color', options: ['Royal Blue', 'Crimson Red', 'Forest Green', 'Golden Yellow'] }],
    stock: 12, sku: 'SKU-CLO-0003', featured: true, active: true,
    rating: 4.9, reviewCount: 87, weight: '0.8kg', createdAt: '2024-01-20T10:00:00Z',
  },
  {
    id: 'PRD-0004', slug: 'kids-school-uniform-set',
    name: "Kids' School Uniform Set",
    category: 'Clothing', categorySlug: 'clothing',
    subcategory: "Kids' Wear", subcategorySlug: 'kids-wear',
    price: 1850, comparePrice: 2400,
    images: [
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&q=80',
      'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=600&q=80',
    ],
    description: "Complete school uniform set — white shirt and navy trousers/skirt. Durable fabric, easy wash.",
    tags: ['kids', 'school', 'uniform', 'children'],
    variants: [
      { name: 'Size',  options: ['Age 4–5', 'Age 6–7', 'Age 8–9', 'Age 10–11', 'Age 12–13'] },
      { name: 'Type',  options: ['Shirt + Trousers', 'Shirt + Skirt'] },
    ],
    stock: 120, sku: 'SKU-CLO-0004', featured: false, active: true,
    rating: 4.5, reviewCount: 201, weight: '0.5kg', createdAt: '2024-01-25T10:00:00Z',
  },

  // ── SPORT SHOES ───────────────────────────────────────────
  {
    id: 'PRD-0005', slug: 'nike-running-shoes-air',
    name: 'ProRun Air Running Shoes',
    category: 'Sport Shoes', categorySlug: 'sport-shoes',
    subcategory: 'Running Shoes', subcategorySlug: 'running-shoes',
    price: 12900, comparePrice: 16500,
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
      'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80',
    ],
    description: 'Lightweight running shoes with responsive cushioning, breathable mesh upper, and durable rubber outsole. Great for daily training.',
    tags: ['running', 'shoes', 'sport', 'fitness'],
    variants: [
      { name: 'Size', options: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'] },
      { name: 'Color', options: ['Black/White', 'Blue/Grey', 'Red/Black'] },
    ],
    stock: 40, sku: 'SKU-SHO-0001', featured: true, active: true,
    rating: 4.7, reviewCount: 182, weight: '0.7kg', createdAt: '2024-02-01T10:00:00Z',
  },
  {
    id: 'PRD-0006', slug: 'training-cross-fit-shoes',
    name: 'CrossFit Training Shoes',
    category: 'Sport Shoes', categorySlug: 'sport-shoes',
    subcategory: 'Training Shoes', subcategorySlug: 'training-shoes',
    price: 9800, comparePrice: 13500,
    images: [
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=80',
    ],
    description: 'Versatile training shoes for gym, CrossFit, and HIIT workouts. Flat sole for lifting stability, lateral support for side movements.',
    tags: ['training', 'gym', 'crossfit', 'shoes'],
    variants: [
      { name: 'Size', options: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'] },
      { name: 'Color', options: ['All Black', 'White/Blue', 'Grey/Orange'] },
    ],
    stock: 30, sku: 'SKU-SHO-0002', featured: false, active: true,
    rating: 4.5, reviewCount: 76, weight: '0.8kg', createdAt: '2024-02-05T10:00:00Z',
  },
  {
    id: 'PRD-0007', slug: 'casual-canvas-sneakers',
    name: 'Classic Canvas Sneakers',
    category: 'Sport Shoes', categorySlug: 'sport-shoes',
    subcategory: 'Casual Sneakers', subcategorySlug: 'casual-sneakers',
    price: 3500, comparePrice: 4800,
    images: [
      'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&q=80',
      'https://images.unsplash.com/photo-1484515991647-c5760fcecfc7?w=600&q=80',
    ],
    description: 'Timeless canvas sneakers for everyday wear. Lightweight, comfortable, and available in a wide range of colours.',
    tags: ['sneakers', 'canvas', 'casual', 'unisex'],
    variants: [
      { name: 'Size', options: ['UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10'] },
      { name: 'Color', options: ['White', 'Black', 'Navy', 'Red', 'Olive'] },
    ],
    stock: 95, sku: 'SKU-SHO-0003', featured: true, active: true,
    rating: 4.4, reviewCount: 259, weight: '0.5kg', createdAt: '2024-02-10T10:00:00Z',
  },

  // ── SECOND HAND ───────────────────────────────────────────
  {
    id: 'PRD-0008', slug: 'second-hand-iphone-12',
    name: 'iPhone 12 — Pre-owned (Grade A)',
    category: 'Second Hand', categorySlug: 'second-hand',
    subcategory: 'Used Electronics', subcategorySlug: 'used-electronics',
    price: 68000, comparePrice: 95000,
    images: [
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&q=80',
      'https://images.unsplash.com/photo-1611791484670-ce19b801d192?w=600&q=80',
    ],
    description: 'Grade A pre-owned iPhone 12. Battery health 88%+. No scratches, fully functional. Comes with cable and 30-day seller warranty.',
    tags: ['iphone', 'used', 'second-hand', 'phone', 'apple'],
    variants: [
      { name: 'Storage', options: ['64GB', '128GB'] },
      { name: 'Color',   options: ['Black', 'White', 'Blue', 'Red'] },
    ],
    stock: 8, sku: 'SKU-SH-0001', featured: true, active: true,
    rating: 4.3, reviewCount: 42, weight: '0.2kg', createdAt: '2024-02-15T10:00:00Z',
    badge: 'Used',
  },
  {
    id: 'PRD-0009', slug: 'second-hand-gaming-laptop',
    name: 'Dell G15 Gaming Laptop — Used',
    category: 'Second Hand', categorySlug: 'second-hand',
    subcategory: 'Used Electronics', subcategorySlug: 'used-electronics',
    price: 145000, comparePrice: 210000,
    images: [
      'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&q=80',
      'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80',
    ],
    description: 'Dell G15 — Intel i7, 16GB RAM, 512GB SSD, GTX 1650. Lightly used, excellent condition. 6-month seller warranty.',
    tags: ['laptop', 'dell', 'gaming', 'used', 'second-hand'],
    variants: [],
    stock: 3, sku: 'SKU-SH-0002', featured: true, active: true,
    rating: 4.5, reviewCount: 18, weight: '2.5kg', createdAt: '2024-02-20T10:00:00Z',
    badge: 'Used',
  },
  {
    id: 'PRD-0010', slug: 'second-hand-winter-jacket',
    name: "Pre-loved Winter Jacket",
    category: 'Second Hand', categorySlug: 'second-hand',
    subcategory: 'Used Clothing', subcategorySlug: 'used-clothing',
    price: 1200, comparePrice: 4500,
    images: [
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80',
      'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=600&q=80',
    ],
    description: 'Good condition pre-loved winter jacket. Dry-cleaned and inspected before listing.',
    tags: ['jacket', 'winter', 'used', 'second-hand'],
    variants: [{ name: 'Size', options: ['S', 'M', 'L', 'XL'] }],
    stock: 5, sku: 'SKU-SH-0003', featured: false, active: true,
    rating: 4.1, reviewCount: 11, weight: '0.9kg', createdAt: '2024-03-01T10:00:00Z',
    badge: 'Used',
  },

  // ── LAPTOPS ───────────────────────────────────────────────
  {
    id: 'PRD-0011', slug: 'asus-rog-gaming-laptop',
    name: 'ASUS ROG Strix G16 Gaming Laptop',
    category: 'Laptops', categorySlug: 'laptops',
    subcategory: 'Gaming Laptops', subcategorySlug: 'gaming-laptops',
    price: 395000, comparePrice: 450000,
    images: [
      'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&q=80',
      'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600&q=80',
    ],
    description: 'ASUS ROG Strix G16 — AMD Ryzen 7, 16GB DDR5, 1TB NVMe SSD, RTX 4060. 165Hz QHD display. Brand new.',
    tags: ['asus', 'gaming', 'laptop', 'rtx', 'rog'],
    variants: [
      { name: 'RAM',  options: ['16GB', '32GB'] },
      { name: 'Storage', options: ['512GB SSD', '1TB SSD'] },
    ],
    stock: 10, sku: 'SKU-LAP-0001', featured: true, active: true,
    rating: 4.8, reviewCount: 53, weight: '2.3kg', createdAt: '2024-03-05T10:00:00Z',
  },
  {
    id: 'PRD-0012', slug: 'lenovo-thinkpad-business-laptop',
    name: 'Lenovo ThinkPad E14 Business Laptop',
    category: 'Laptops', categorySlug: 'laptops',
    subcategory: 'Business Laptops', subcategorySlug: 'business-laptops',
    price: 248000, comparePrice: 295000,
    images: [
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&q=80',
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80',
    ],
    description: 'Lenovo ThinkPad E14 — Intel i5 12th Gen, 8GB RAM, 256GB SSD, 14" FHD display. Perfect for professionals.',
    tags: ['lenovo', 'thinkpad', 'business', 'laptop', 'office'],
    variants: [
      { name: 'RAM',  options: ['8GB', '16GB'] },
    ],
    stock: 15, sku: 'SKU-LAP-0002', featured: true, active: true,
    rating: 4.6, reviewCount: 38, weight: '1.6kg', createdAt: '2024-03-08T10:00:00Z',
  },
  {
    id: 'PRD-0013', slug: 'acer-aspire-budget-laptop',
    name: 'Acer Aspire 3 Budget Laptop',
    category: 'Laptops', categorySlug: 'laptops',
    subcategory: 'Budget Laptops', subcategorySlug: 'budget-laptops',
    price: 115000, comparePrice: 138000,
    images: [
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&q=80',
      'https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=600&q=80',
    ],
    description: 'Acer Aspire 3 — AMD Ryzen 3, 8GB RAM, 512GB SSD, 15.6" FHD. Ideal for students and everyday use.',
    tags: ['acer', 'budget', 'laptop', 'student'],
    variants: [],
    stock: 22, sku: 'SKU-LAP-0003', featured: false, active: true,
    rating: 4.2, reviewCount: 88, weight: '1.9kg', createdAt: '2024-03-10T10:00:00Z',
  },

  // ── COMPUTER ACCESSORIES ──────────────────────────────────
  {
    id: 'PRD-0014', slug: 'mechanical-gaming-keyboard',
    name: 'Mechanical RGB Gaming Keyboard',
    category: 'Computer Accessories', categorySlug: 'computer-accessories',
    subcategory: 'Keyboards', subcategorySlug: 'keyboards',
    price: 8900, comparePrice: 12500,
    images: [
      'https://images.unsplash.com/photo-1601445638532-1f2aecc63bff?w=600&q=80',
      'https://images.unsplash.com/photo-1595225476474-87563907a212?w=600&q=80',
    ],
    description: 'Full-size mechanical keyboard with Cherry MX switches, RGB backlighting, aluminium top frame, and USB-C connection.',
    tags: ['keyboard', 'mechanical', 'gaming', 'rgb'],
    variants: [{ name: 'Switch', options: ['Red (Linear)', 'Blue (Clicky)', 'Brown (Tactile)'] }],
    stock: 35, sku: 'SKU-ACC-0001', featured: true, active: true,
    rating: 4.7, reviewCount: 127, weight: '1.1kg', createdAt: '2024-03-12T10:00:00Z',
  },
  {
    id: 'PRD-0015', slug: 'wireless-ergonomic-mouse',
    name: 'Wireless Ergonomic Mouse',
    category: 'Computer Accessories', categorySlug: 'computer-accessories',
    subcategory: 'Mice', subcategorySlug: 'mice',
    price: 3200, comparePrice: 4500,
    images: [
      'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&q=80',
      'https://images.unsplash.com/photo-1610547189313-1fbea2dcd059?w=600&q=80',
    ],
    description: 'Ergonomic wireless mouse with 2.4GHz receiver, 6 programmable buttons, 1600 DPI, and 12-month battery life.',
    tags: ['mouse', 'wireless', 'ergonomic', 'office'],
    variants: [{ name: 'Color', options: ['Black', 'White', 'Blue'] }],
    stock: 60, sku: 'SKU-ACC-0002', featured: false, active: true,
    rating: 4.5, reviewCount: 94, weight: '0.1kg', createdAt: '2024-03-14T10:00:00Z',
  },
  {
    id: 'PRD-0016', slug: 'portable-ssd-1tb',
    name: 'Portable SSD 1TB — USB-C',
    category: 'Computer Accessories', categorySlug: 'computer-accessories',
    subcategory: 'Storage', subcategorySlug: 'storage',
    price: 14500, comparePrice: 18000,
    images: [
      'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&q=80',
      'https://images.unsplash.com/photo-1618424181497-157f25b6ddd5?w=600&q=80',
    ],
    description: 'Ultra-fast portable SSD. 1TB capacity, up to 1,050MB/s read speed. USB-C & USB-A compatible. Pocket-sized.',
    tags: ['ssd', 'storage', 'portable', 'usb-c'],
    variants: [{ name: 'Capacity', options: ['512GB', '1TB', '2TB'] }],
    stock: 28, sku: 'SKU-ACC-0003', featured: true, active: true,
    rating: 4.8, reviewCount: 61, weight: '0.05kg', createdAt: '2024-03-15T10:00:00Z',
  },
  {
    id: 'PRD-0017', slug: 'curved-gaming-monitor-27',
    name: '27" Curved Gaming Monitor',
    category: 'Computer Accessories', categorySlug: 'computer-accessories',
    subcategory: 'Monitors', subcategorySlug: 'monitors',
    price: 52000, comparePrice: 68000,
    images: [
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80',
      'https://images.unsplash.com/photo-1498075702571-ecb018f3752d?w=600&q=80',
    ],
    description: '27" 1500R curved display, 165Hz, 1ms response, FHD resolution. AMD FreeSync Premium. HDMI & DisplayPort.',
    tags: ['monitor', 'gaming', 'curved', '165hz'],
    variants: [{ name: 'Resolution', options: ['FHD 1080p', 'QHD 1440p'] }],
    stock: 12, sku: 'SKU-ACC-0004', featured: true, active: true,
    rating: 4.7, reviewCount: 44, weight: '4.5kg', createdAt: '2024-03-16T10:00:00Z',
  },

  // ── ELECTRONICS ───────────────────────────────────────────
  {
    id: 'PRD-0018', slug: 'premium-wireless-earbuds',
    name: 'Premium Wireless Earbuds Pro',
    category: 'Electronics', categorySlug: 'electronics',
    subcategory: 'Audio', subcategorySlug: 'audio',
    price: 14900, comparePrice: 19900,
    images: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80',
      'https://images.unsplash.com/photo-1608156639585-b3a032ef9689?w=600&q=80',
    ],
    description: 'Experience studio-quality audio with active noise cancellation, 30-hour battery life, and crystal-clear calls.',
    tags: ['wireless', 'audio', 'bluetooth', 'earbuds'],
    variants: [{ name: 'Color', options: ['Midnight Black', 'Pearl White', 'Navy Blue'] }],
    stock: 45, sku: 'SKU-ELC-0001', featured: true, active: true,
    rating: 4.7, reviewCount: 128, weight: '0.2kg', createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'PRD-0019', slug: 'smart-fitness-watch',
    name: 'Smart Fitness Watch',
    category: 'Electronics', categorySlug: 'electronics',
    subcategory: 'Wearables', subcategorySlug: 'wearables',
    price: 18500, comparePrice: 25000,
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&q=80',
    ],
    description: 'Track your fitness journey with advanced health monitoring, GPS, and 7-day battery life.',
    tags: ['smartwatch', 'fitness', 'health', 'wearable'],
    variants: [
      { name: 'Size', options: ['40mm', '44mm'] },
      { name: 'Color', options: ['Black', 'Silver', 'Rose Gold'] },
    ],
    stock: 28, sku: 'SKU-ELC-0002', featured: false, active: true,
    rating: 4.5, reviewCount: 96, weight: '0.1kg', createdAt: '2024-02-10T10:00:00Z',
  },

  // ── HOME & LIVING ─────────────────────────────────────────
  {
    id: 'PRD-0020', slug: 'bamboo-diffuser-set',
    name: 'Luxury Bamboo Diffuser Set',
    category: 'Home & Living', categorySlug: 'home-living',
    subcategory: 'Decor', subcategorySlug: 'decor',
    price: 7800, comparePrice: 9500,
    images: [
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&q=80',
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&q=80',
    ],
    description: 'Transform your home with our premium bamboo ultrasonic diffuser and 6 essential oils.',
    tags: ['diffuser', 'aromatherapy', 'bamboo', 'wellness'],
    variants: [],
    stock: 35, sku: 'SKU-HML-0001', featured: true, active: true,
    rating: 4.6, reviewCount: 67, weight: '1.5kg', createdAt: '2024-02-15T10:00:00Z',
  },
];

export const DEFAULT_ORDERS = [
  {
    id: 'ORD-20240001',
    customerId: 'USR-0001',
    customerName: 'Dinusha Perera',
    customerEmail: 'dinusha@gmail.com',
    customerPhone: '+94 71 234 5678',
    items: [
      { productId: 'PRD-0018', name: 'Premium Wireless Earbuds Pro', qty: 1, price: 14900, variant: 'Midnight Black' },
      { productId: 'PRD-0007', name: 'Classic Canvas Sneakers',      qty: 2, price: 3500,  variant: 'White / UK 7'  },
    ],
    subtotal: 21900,
    shipping: 350,
    discount: 0,
    total: 22250,
    status: 'delivered',
    paymentStatus: 'paid',
    paymentMethod: 'payhere',
    address: { line1: '45/3 Galle Road', line2: 'Dehiwala', city: 'Colombo', district: 'Colombo', province: 'Western', zip: '10350' },
    notes: '',
    createdAt: '2024-03-10T14:23:00Z',
    updatedAt: '2024-03-13T09:00:00Z',
  },
  {
    id: 'ORD-20240002',
    customerId: 'USR-0002',
    customerName: 'Kasun Bandara',
    customerEmail: 'kasun@hotmail.com',
    customerPhone: '+94 77 987 6543',
    items: [
      { productId: 'PRD-0003', name: 'Handwoven Silk Batik Saree', qty: 1, price: 24500, variant: 'Royal Blue' },
    ],
    subtotal: 24500,
    shipping: 500,
    discount: 2450,
    total: 22550,
    status: 'processing',
    paymentStatus: 'paid',
    paymentMethod: 'payhere',
    address: { line1: '12 Temple Road', line2: 'Kandy Town', city: 'Kandy', district: 'Kandy', province: 'Central', zip: '20000' },
    notes: 'Please gift wrap',
    createdAt: '2024-03-12T09:15:00Z',
    updatedAt: '2024-03-12T09:15:00Z',
  },
  {
    id: 'ORD-20240003',
    customerId: 'USR-0003',
    customerName: 'Shalini Fernando',
    customerEmail: 'shalini@gmail.com',
    customerPhone: '+94 76 555 4321',
    items: [
      { productId: 'PRD-0020', name: 'Luxury Bamboo Diffuser Set', qty: 1, price: 7800, variant: '' },
      { productId: 'PRD-0001', name: "Men's Premium Linen Shirt",  qty: 1, price: 2800, variant: 'M / White' },
    ],
    subtotal: 10600,
    shipping: 350,
    discount: 0,
    total: 10950,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'cod',
    address: { line1: '88/1 Nawala Road', line2: 'Rajagiriya', city: 'Rajagiriya', district: 'Colombo', province: 'Western', zip: '10107' },
    notes: '',
    createdAt: '2024-03-14T16:45:00Z',
    updatedAt: '2024-03-14T16:45:00Z',
  },
  // ── Extra delivered orders — enable demo users to write reviews ──
  {
    id: 'ORD-20240004',
    customerId: 'USR-0001',
    customerName: 'Dinusha Perera',
    customerEmail: 'dinusha@gmail.com',
    customerPhone: '+94 71 234 5678',
    items: [
      { productId: 'PRD-0001', name: "Men's Premium Linen Shirt",    qty: 1, price: 2800,  variant: 'M / White'         },
      { productId: 'PRD-0005', name: 'ProRun Air Running Shoes',     qty: 1, price: 12900, variant: 'UK 8 / Black/White' },
      { productId: 'PRD-0007', name: 'Classic Canvas Sneakers',      qty: 2, price: 3500,  variant: 'Navy / UK 7'       },
    ],
    subtotal: 23700,
    shipping: 350,
    discount: 0,
    total: 24050,
    status: 'delivered',
    paymentStatus: 'paid',
    paymentMethod: 'payhere',
    address: { line1: '45/3 Galle Road', line2: 'Dehiwala', city: 'Colombo', district: 'Colombo', province: 'Western', zip: '10350' },
    notes: '',
    createdAt: '2024-02-20T11:05:00Z',
    updatedAt: '2024-02-24T08:30:00Z',
  },
  {
    id: 'ORD-20240005',
    customerId: 'USR-0001',
    customerName: 'Dinusha Perera',
    customerEmail: 'dinusha@gmail.com',
    customerPhone: '+94 71 234 5678',
    items: [
      { productId: 'PRD-0002', name: "Women's Floral Midi Dress",    qty: 1, price: 4500,  variant: 'M / Pink Floral' },
      { productId: 'PRD-0015', name: 'Wireless Ergonomic Mouse',     qty: 1, price: 3200,  variant: 'Black'           },
      { productId: 'PRD-0020', name: 'Luxury Bamboo Diffuser Set',   qty: 1, price: 7800,  variant: ''                },
    ],
    subtotal: 15500,
    shipping: 350,
    discount: 500,
    total: 15350,
    status: 'delivered',
    paymentStatus: 'paid',
    paymentMethod: 'payhere',
    address: { line1: '45/3 Galle Road', line2: 'Dehiwala', city: 'Colombo', district: 'Colombo', province: 'Western', zip: '10350' },
    notes: '',
    createdAt: '2024-02-05T14:10:00Z',
    updatedAt: '2024-02-09T10:00:00Z',
  },
  {
    id: 'ORD-20240006',
    customerId: 'USR-0002',
    customerName: 'Kasun Bandara',
    customerEmail: 'kasun@hotmail.com',
    customerPhone: '+94 77 987 6543',
    items: [
      { productId: 'PRD-0019', name: 'Smart Fitness Watch',          qty: 1, price: 18500, variant: '44mm / Black'     },
      { productId: 'PRD-0006', name: 'CrossFit Training Shoes',      qty: 1, price: 9800,  variant: 'UK 9 / All Black' },
    ],
    subtotal: 28300,
    shipping: 450,
    discount: 2830,
    total: 25920,
    status: 'delivered',
    paymentStatus: 'paid',
    paymentMethod: 'payhere',
    address: { line1: '12 Temple Road', line2: 'Kandy Town', city: 'Kandy', district: 'Kandy', province: 'Central', zip: '20000' },
    notes: '',
    createdAt: '2024-01-28T09:20:00Z',
    updatedAt: '2024-02-03T14:00:00Z',
  },
  {
    id: 'ORD-20240007',
    customerId: 'USR-0002',
    customerName: 'Kasun Bandara',
    customerEmail: 'kasun@hotmail.com',
    customerPhone: '+94 77 987 6543',
    items: [
      { productId: 'PRD-0005', name: 'ProRun Air Running Shoes',          qty: 1, price: 12900, variant: 'UK 9 / Blue/Grey'  },
      { productId: 'PRD-0016', name: 'Portable SSD 1TB — USB-C',         qty: 1, price: 14500, variant: ''                  },
      { productId: 'PRD-0014', name: 'Mechanical RGB Gaming Keyboard',    qty: 1, price: 8900,  variant: 'Blue (Clicky)'     },
    ],
    subtotal: 36300,
    shipping: 350,
    discount: 0,
    total: 36650,
    status: 'delivered',
    paymentStatus: 'paid',
    paymentMethod: 'cod',
    address: { line1: '12 Temple Road', line2: 'Kandy Town', city: 'Kandy', district: 'Kandy', province: 'Central', zip: '20000' },
    notes: '',
    createdAt: '2024-01-10T16:40:00Z',
    updatedAt: '2024-01-15T11:00:00Z',
  },
  {
    id: 'ORD-20240008',
    customerId: 'USR-0003',
    customerName: 'Shalini Fernando',
    customerEmail: 'shalini@gmail.com',
    customerPhone: '+94 76 555 4321',
    items: [
      { productId: 'PRD-0002', name: "Women's Floral Midi Dress",    qty: 1, price: 4500,  variant: 'S / Blue Floral' },
      { productId: 'PRD-0003', name: 'Handwoven Silk Batik Saree',   qty: 1, price: 24500, variant: 'Forest Green'    },
      { productId: 'PRD-0020', name: 'Luxury Bamboo Diffuser Set',   qty: 1, price: 7800,  variant: ''                },
    ],
    subtotal: 36800,
    shipping: 450,
    discount: 3000,
    total: 34250,
    status: 'delivered',
    paymentStatus: 'paid',
    paymentMethod: 'payhere',
    address: { line1: '88/1 Nawala Road', line2: 'Rajagiriya', city: 'Rajagiriya', district: 'Colombo', province: 'Western', zip: '10107' },
    notes: '',
    createdAt: '2024-01-20T10:30:00Z',
    updatedAt: '2024-01-24T09:15:00Z',
  },
  {
    id: 'ORD-20240009',
    customerId: 'USR-0003',
    customerName: 'Shalini Fernando',
    customerEmail: 'shalini@gmail.com',
    customerPhone: '+94 76 555 4321',
    items: [
      { productId: 'PRD-0014', name: 'Mechanical RGB Gaming Keyboard',    qty: 1, price: 8900,  variant: 'Red (Linear)'  },
      { productId: 'PRD-0018', name: 'Premium Wireless Earbuds Pro',       qty: 1, price: 14900, variant: 'Pearl White'   },
      { productId: 'PRD-0017', name: '27" Curved Gaming Monitor',          qty: 1, price: 52000, variant: 'QHD 1440p'    },
    ],
    subtotal: 75800,
    shipping: 350,
    discount: 5000,
    total: 71150,
    status: 'delivered',
    paymentStatus: 'paid',
    paymentMethod: 'payhere',
    address: { line1: '88/1 Nawala Road', line2: 'Rajagiriya', city: 'Rajagiriya', district: 'Colombo', province: 'Western', zip: '10107' },
    notes: '',
    createdAt: '2024-02-14T13:20:00Z',
    updatedAt: '2024-02-18T10:45:00Z',
  },
];

// ── Default Users ─────────────────────────────────────────────
export const DEFAULT_USERS = [
  // Bug 4 fix: orders count and totalSpent now match actual DEFAULT_ORDERS (all non-cancelled orders summed)
  { id: 'USR-0001', name: 'Dinusha Perera',   email: 'dinusha@gmail.com', phone: '+94 71 234 5678', role: 'customer', orders: 3, totalSpent: 61650,  createdAt: '2024-01-05' },
  { id: 'USR-0002', name: 'Kasun Bandara',    email: 'kasun@hotmail.com', phone: '+94 77 987 6543', role: 'customer', orders: 3, totalSpent: 85120,  createdAt: '2024-02-10' },
  { id: 'USR-0003', name: 'Shalini Fernando', email: 'shalini@gmail.com', phone: '+94 76 555 4321', role: 'customer', orders: 3, totalSpent: 116350, createdAt: '2024-02-20' },
  { id: 'USR-0004', name: 'Admin User',       email: 'admin@zenmarket.lk', phone: '+94 11 234 5678', role: 'admin',    orders: 0, totalSpent: 0,     createdAt: '2024-01-01' },
];

// ── Default Coupons ───────────────────────────────────────────
export const DEFAULT_COUPONS = [
  { id: 'CPN-001', code: 'WELCOME10', type: 'percent', value: 10, minOrder: 2000, maxUses: 100, used: 34, active: true, expires: '2025-12-31' },
  { id: 'CPN-002', code: 'SAVE500',   type: 'fixed',   value: 500, minOrder: 5000, maxUses: 50, used: 12, active: true, expires: '2025-06-30' },
  { id: 'CPN-003', code: 'FREESHIP',  type: 'shipping', value: 100, minOrder: 3000, maxUses: 200, used: 89, active: false, expires: '2025-03-31' },
];

// ── Shipping Zones ────────────────────────────────────────────
export const SHIPPING_ZONES = [
  { id: 'sz-1',  name: 'Colombo',        districts: ['Colombo'],                                                  rate: 250, minDays: 1, maxDays: 2 },
  { id: 'sz-2',  name: 'Western Other',  districts: ['Gampaha', 'Kalutara'],                                     rate: 350, minDays: 1, maxDays: 3 },
  { id: 'sz-3',  name: 'Central',        districts: ['Kandy', 'Matale', 'Nuwara Eliya'],                         rate: 450, minDays: 2, maxDays: 4 },
  { id: 'sz-4',  name: 'Southern',       districts: ['Galle', 'Matara', 'Hambantota'],                           rate: 500, minDays: 2, maxDays: 4 },
  { id: 'sz-5',  name: 'Northern',       districts: ['Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu'], rate: 600, minDays: 3, maxDays: 6 },
  { id: 'sz-6',  name: 'Eastern',        districts: ['Trincomalee', 'Batticaloa', 'Ampara'],                     rate: 600, minDays: 3, maxDays: 6 },
  { id: 'sz-7',  name: 'NW Province',    districts: ['Kurunegala', 'Puttalam'],                                  rate: 450, minDays: 2, maxDays: 4 },
  { id: 'sz-8',  name: 'North Central',  districts: ['Anuradhapura', 'Polonnaruwa'],                             rate: 500, minDays: 2, maxDays: 5 },
  { id: 'sz-9',  name: 'Uva',            districts: ['Badulla', 'Monaragala'],                                   rate: 550, minDays: 2, maxDays: 5 },
  { id: 'sz-10', name: 'Sabaragamuwa',   districts: ['Ratnapura', 'Kegalle'],                                    rate: 450, minDays: 2, maxDays: 4 },
];

// ── Editable shipping zones (reads localStorage, falls back to defaults) ──
export function getShippingZones() {
  try {
    const saved = localStorage.getItem('zm_shipping_zones');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return JSON.parse(JSON.stringify(SHIPPING_ZONES));
}

export function saveShippingZones(zones) {
  localStorage.setItem('zm_shipping_zones', JSON.stringify(zones));
}

export function getDeliveryDays(district) {
  if (!district) return null;
  const zones = getShippingZones();
  const zone = zones.find(z => z.districts.includes(district));
  if (!zone) return '3–7';
  return `${zone.minDays}–${zone.maxDays}`;
}

// ── Store Data Access ─────────────────────────────────────────
export function getProducts() {
  let products;
  try {
    const edited = JSON.parse(localStorage.getItem(LS.editedProducts) || '{}');
    const extra  = JSON.parse(localStorage.getItem(LS.extraProducts)  || '[]');
    const base   = DEFAULT_PRODUCTS.map(p => edited[p.id] ? { ...p, ...edited[p.id] } : { ...p });
    products = [...base, ...extra];
  } catch { products = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS)); }

  // Auto-seed reviews for all products on first call per page lifecycle.
  // Dynamic import breaks the store ↔ reviews circular dependency — by the
  // time this microtask runs both modules are fully initialised.
  if (!_reviewsSeeded) {
    _reviewsSeeded = true;
    import('./reviews.js').then(({ seedAllReviews, seedDemoUserReviews }) => {
      seedDemoUserReviews();   // inject pre-approved demo-user reviews first
      seedAllReviews(products); // then seed generic sample reviews for remaining products
    });
  }

  return products;
}

export function getCategories() {
  try {
    const raw = localStorage.getItem(LS.categories);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    const saved = JSON.parse(raw);
    return Array.isArray(saved) && saved.length > 0 ? saved : JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
  } catch { return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)); }
}

export function getOrders() {
  try {
    const raw = localStorage.getItem(LS.orders);
    if (raw === null) return JSON.parse(JSON.stringify(DEFAULT_ORDERS)); // never saved → seed with demo data
    const saved = JSON.parse(raw);
    return Array.isArray(saved) ? saved : JSON.parse(JSON.stringify(DEFAULT_ORDERS));
  } catch { return JSON.parse(JSON.stringify(DEFAULT_ORDERS)); }
}

export function saveUsers(users) {
  localStorage.setItem(LS.users, JSON.stringify(users));
}

export function saveCategories(cats) {
  localStorage.setItem(LS.categories, JSON.stringify(cats));
}

export function saveOrders(orders) {
  localStorage.setItem(LS.orders, JSON.stringify(orders));
  _syncAllUserStats(orders);
}

// ── Auto-sync orders count + totalSpent for every user ────────
function _syncAllUserStats(orders) {
  try {
    const users = getUsers();
    if (!Array.isArray(users) || !users.length) return;

    // Build a per-user aggregation map from ALL orders
    const statsMap = {};
    orders.forEach(order => {
      const uid = order.customerId;
      if (!uid || uid === 'guest') return;
      if (!statsMap[uid]) statsMap[uid] = { orders: 0, totalSpent: 0 };
      statsMap[uid].orders += 1;
      // Count only non-cancelled orders toward totalSpent
      if (order.status !== 'cancelled') {
        statsMap[uid].totalSpent += (order.total || 0);
      }
    });

    // Apply stats back to users array
    let changed = false;
    const updated = users.map(u => {
      const s = statsMap[u.id];
      if (!s) return u;
      const newOrders = s.orders;
      const newSpent  = s.totalSpent;
      if (u.orders !== newOrders || u.totalSpent !== newSpent) {
        changed = true;
        return { ...u, orders: newOrders, totalSpent: newSpent };
      }
      return u;
    });

    if (changed) saveUsers(updated);
  } catch (e) {
    console.warn('[ZenMarket] _syncAllUserStats failed:', e);
  }
}

export function getUsers() {
  try {
    const raw = localStorage.getItem(LS.users);
    if (raw === null) return DEFAULT_USERS;
    const saved = JSON.parse(raw);
    return Array.isArray(saved) && saved.length > 0 ? saved : DEFAULT_USERS;
  } catch { return DEFAULT_USERS; }
}

export function getCoupons() {
  try {
    const raw = localStorage.getItem(LS.coupons);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_COUPONS));
    const saved = JSON.parse(raw);
    return Array.isArray(saved) && saved.length > 0 ? saved : JSON.parse(JSON.stringify(DEFAULT_COUPONS));
  } catch { return JSON.parse(JSON.stringify(DEFAULT_COUPONS)); }
}

export function saveCoupons(coupons) {
  localStorage.setItem(LS.coupons, JSON.stringify(coupons));
}

export function saveProduct(product) {
  if (DEFAULT_PRODUCTS.find(p => p.id === product.id)) {
    const edited = JSON.parse(localStorage.getItem(LS.editedProducts) || '{}');
    edited[product.id] = product;
    localStorage.setItem(LS.editedProducts, JSON.stringify(edited));
  } else {
    const extra = JSON.parse(localStorage.getItem(LS.extraProducts) || '[]');
    const idx = extra.findIndex(p => p.id === product.id);
    if (idx >= 0) extra[idx] = product; else extra.push(product);
    localStorage.setItem(LS.extraProducts, JSON.stringify(extra));
  }
}

export function deleteProduct(id) {
  const edited = JSON.parse(localStorage.getItem(LS.editedProducts) || '{}');
  delete edited[id];
  localStorage.setItem(LS.editedProducts, JSON.stringify(edited));
  const extra = JSON.parse(localStorage.getItem(LS.extraProducts) || '[]');
  localStorage.setItem(LS.extraProducts, JSON.stringify(extra.filter(p => p.id !== id)));
}

export function generateProductId() {
  const products = getProducts();
  const maxNum = products.reduce((max, p) => {
    const n = parseInt(p.id.replace('PRD-', ''));
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  return `PRD-${String(maxNum + 1).padStart(4, '0')}`;
}

export function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function getShippingRate(district) {
  const zones = getShippingZones();
  const zone = zones.find(z => z.districts.includes(district));
  return zone ? zone.rate : 600;
}
