-- ============================================================
-- ZENMARKET — SUPABASE PRODUCTION SQL  (v29 — Full Stack)
-- ============================================================
-- Run this entire file in: Supabase → SQL Editor → New query
--
-- Order matters — run sections top to bottom.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- ============================================================


-- ── 1. TABLES ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,
  description   text,
  price         numeric(10,2) NOT NULL,
  compare_price numeric(10,2),
  stock         integer DEFAULT 0,
  category      text,
  category_slug text,
  sku           text,
  tags          text[],
  images        text[],
  variants      jsonb,
  active        boolean DEFAULT true,
  featured      boolean DEFAULT false,
  rating        numeric(3,2) DEFAULT 0,
  review_count  integer DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,
  description   text,
  icon          text,
  parent_id     text REFERENCES categories(id),
  active        boolean DEFAULT true,
  sort_order    integer DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id               text PRIMARY KEY,
  customer_id      text,
  customer_name    text,
  customer_email   text,
  customer_phone   text,
  items            jsonb NOT NULL,
  subtotal         numeric(10,2),
  shipping         numeric(10,2) DEFAULT 0,
  discount         numeric(10,2) DEFAULT 0,
  total            numeric(10,2) NOT NULL,
  status           text DEFAULT 'pending',
  payment_status   text DEFAULT 'pending',
  payment_method   text,
  payment_id       text,
  address          jsonb,
  notes            text,
  coupon           text,
  bank_ref         text,
  payment_slip     text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupons (
  id          text PRIMARY KEY,
  code        text UNIQUE NOT NULL,
  type        text NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value       numeric(10,2) NOT NULL,
  min_order   numeric(10,2) DEFAULT 0,
  usage_limit integer,
  used_count  integer DEFAULT 0,
  expires_at  timestamptz,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipping_zones (
  id        text PRIMARY KEY,
  name      text NOT NULL,
  districts text[],
  rate      numeric(10,2) NOT NULL,
  min_days  integer DEFAULT 1,
  max_days  integer DEFAULT 7,
  active    boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text,
  phone      text,
  role       text DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id         text PRIMARY KEY,
  product_id text REFERENCES products(id) ON DELETE CASCADE,
  user_id    text,
  user_name  text NOT NULL,
  rating     integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title      text,
  body       text,
  verified   boolean DEFAULT false,
  approved   boolean DEFAULT false,
  rejected   boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         text PRIMARY KEY,
  first_name text,
  last_name  text,
  email      text,
  phone      text,
  subject    text,
  message    text,
  read       boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id           text PRIMARY KEY,
  title        text NOT NULL,
  slug         text UNIQUE NOT NULL,
  excerpt      text,
  body         text,
  cover_image  text,
  author       text,
  tags         text[],
  published    boolean DEFAULT false,
  published_at timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         text PRIMARY KEY,
  type       text NOT NULL,
  title      text NOT NULL,
  message    text,
  data       jsonb,
  read       boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);


-- ── 2. INDEXES ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_products_slug         ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category     ON products(category_slug) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_products_featured     ON products(featured) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_orders_customer       ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status         ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created        ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_product       ON reviews(product_id) WHERE approved = true;
CREATE INDEX IF NOT EXISTS idx_coupons_code          ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug       ON blog_posts(slug) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_notifications_read    ON notifications(read, created_at DESC);


-- ── 3. ROW LEVEL SECURITY ─────────────────────────────────────────

ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (safe for re-runs)
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname
    FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Public storefront reads
CREATE POLICY "Public read active products"
  ON products FOR SELECT USING (active = true);

CREATE POLICY "Public read categories"
  ON categories FOR SELECT USING (active = true);

CREATE POLICY "Public read shipping zones"
  ON shipping_zones FOR SELECT USING (active = true);

CREATE POLICY "Public read approved reviews"
  ON reviews FOR SELECT USING (approved = true);

CREATE POLICY "Public read published blog posts"
  ON blog_posts FOR SELECT USING (published = true);

CREATE POLICY "Public read site settings"
  ON site_settings FOR SELECT USING (true);

-- Active coupons (lookup by code — no anon browsing of all coupons)
CREATE POLICY "Authenticated read active coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (active = true);

-- Customer order access
CREATE POLICY "Customers insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid()::text);

CREATE POLICY "Customers view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid()::text);

-- Customer profile
CREATE POLICY "Customers view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Customers update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Customers insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Review submission (authenticated customers)
CREATE POLICY "Customers submit reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

-- Contact messages (anyone can submit)
CREATE POLICY "Anyone submit contact message"
  ON contact_messages FOR INSERT
  WITH CHECK (true);


-- ── 4. SQL FUNCTIONS (used by supabase-store.js) ──────────────────

-- Decrement product stock (floor at 0)
CREATE OR REPLACE FUNCTION decrement_stock(product_id text, amount integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE products
  SET    stock      = GREATEST(0, stock - amount),
         updated_at = now()
  WHERE  id = product_id;
$$;

-- Increment coupon usage counter
CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE coupons
  SET used_count = used_count + 1
  WHERE code = coupon_code;
$$;

-- Recalculate product average rating after review moderation
CREATE OR REPLACE FUNCTION refresh_product_rating(p_product_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  avg_rating numeric;
  total_count integer;
BEGIN
  SELECT AVG(rating), COUNT(*)
  INTO avg_rating, total_count
  FROM reviews
  WHERE product_id = p_product_id AND approved = true;

  UPDATE products
  SET    rating       = ROUND(COALESCE(avg_rating, 0)::numeric, 2),
         review_count = COALESCE(total_count, 0),
         updated_at   = now()
  WHERE  id = p_product_id;
END;
$$;

-- Auto-update updated_at on orders
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_updated_at   ON orders;
DROP TRIGGER IF EXISTS products_updated_at ON products;
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create profile after signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'customer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ── 5. SUPABASE REALTIME ──────────────────────────────────────────
-- Enable Realtime publication for live updates (js/realtime.js)

-- Create the realtime publication if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Add tables to realtime publication (safe — skips if already a member)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['orders','products','reviews','notifications']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;

-- NOTE: In the Supabase dashboard you can also enable Realtime via:
-- Database → Replication → enable for each table above


-- ── 6. SEED: DEFAULT SHIPPING ZONES ──────────────────────────────

INSERT INTO shipping_zones (id, name, districts, rate, min_days, max_days) VALUES
  ('sz-colombo',   'Colombo Metro',      ARRAY['Colombo', 'Gampaha', 'Kalutara'],  350,  1, 2),
  ('sz-central',   'Central Province',   ARRAY['Kandy', 'Matale', 'Nuwara Eliya'], 450,  2, 4),
  ('sz-southern',  'Southern Province',  ARRAY['Galle', 'Matara', 'Hambantota'],   450,  2, 4),
  ('sz-northern',  'Northern Province',  ARRAY['Jaffna', 'Kilinochchi', 'Mannar', 'Mullaitivu', 'Vavuniya'], 650, 3, 6),
  ('sz-eastern',   'Eastern Province',   ARRAY['Ampara', 'Batticaloa', 'Trincomalee'], 600, 3, 5),
  ('sz-northwest', 'North Western',      ARRAY['Kurunegala', 'Puttalam'],           450, 2, 4),
  ('sz-ncpuva',    'North Central',      ARRAY['Anuradhapura', 'Polonnaruwa'],      550, 2, 5),
  ('sz-uva',       'Uva Province',       ARRAY['Badulla', 'Monaragala'],            550, 2, 5),
  ('sz-sabara',    'Sabaragamuwa',       ARRAY['Ratnapura', 'Kegalle'],             500, 2, 4)
ON CONFLICT (id) DO NOTHING;


-- ── 7. SEED: DEFAULT SITE SETTINGS ───────────────────────────────

INSERT INTO site_settings (key, value) VALUES
  ('store', '{"name":"ZenMarket","tagline":"Premium Shopping in Sri Lanka","currency":"LKR","currencySymbol":"Rs.","email":"hello@zenmarket.lk","phone":"+94 77 123 4567","address":"Colombo 03, Sri Lanka"}'),
  ('seo',   '{"title":"ZenMarket — Premium Shopping in Sri Lanka","description":"Shop the best products in Sri Lanka. Fast delivery, secure payments via PayHere, genuine products.","keywords":"online shopping sri lanka, buy online sri lanka, payhere"}')
ON CONFLICT (key) DO NOTHING;


-- ── Done ──────────────────────────────────────────────────────────
-- ✓ Tables created
-- ✓ Indexes created
-- ✓ RLS enabled with policies
-- ✓ SQL functions created
-- ✓ Realtime enabled
-- ✓ Default data seeded
