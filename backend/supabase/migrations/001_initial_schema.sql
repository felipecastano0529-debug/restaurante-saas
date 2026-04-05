-- ============================================================
-- RestauranteSaaS — Esquema inicial (Multi-Tenant)
-- Aplicar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Extension para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: restaurants
-- Un registro por restaurante (tenant)
-- ============================================================
CREATE TABLE restaurants (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slug                      VARCHAR(60) UNIQUE NOT NULL,
  name                      VARCHAR(120) NOT NULL,
  description               TEXT,
  whatsapp_number           VARCHAR(20),
  logo_url                  TEXT,
  primary_color             VARCHAR(7) DEFAULT '#E85D04',
  address                   TEXT,
  transfer_info             TEXT,      -- Nequi, BANCO, etc.
  subscription_status       VARCHAR(20) DEFAULT 'trial' CHECK (subscription_status IN ('trial','active','suspended')),
  next_billing_date         TIMESTAMPTZ,
  mp_access_token           TEXT,      -- Cifrado en producción (Vault de Supabase)
  uchat_webhook_url         TEXT,
  openai_api_key            TEXT,      -- Cifrado en producción
  bot_system_prompt         TEXT,
  bot_enabled               BOOLEAN DEFAULT FALSE,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: categories
-- ============================================================
CREATE TABLE categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name          VARCHAR(80) NOT NULL,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: products
-- ============================================================
CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  name          VARCHAR(120) NOT NULL,
  description   TEXT,
  base_price    INTEGER NOT NULL,  -- Precio en centavos (ej: 28000 COP)
  image_url     TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: modifier_groups
-- Ej: "Término de la carne", "Salsas", "Adiciones"
-- ============================================================
CREATE TABLE modifier_groups (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID REFERENCES products(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  min_selection INTEGER DEFAULT 0,
  max_selection INTEGER DEFAULT 1,
  sort_order    INTEGER DEFAULT 0
);

-- ============================================================
-- TABLA: modifiers
-- Ej: "Extra Queso +$3.000", "3/4 (sin costo)"
-- ============================================================
CREATE TABLE modifiers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  modifier_group_id UUID REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  extra_price      INTEGER DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- TABLA: delivery_zones
-- Zonas con precio de domicilio
-- ============================================================
CREATE TABLE delivery_zones (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name          VARCHAR(80) NOT NULL,
  price         INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- TABLA: coupons
-- ============================================================
CREATE TABLE coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  code            VARCHAR(30) NOT NULL,
  discount_type   VARCHAR(10) DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value  INTEGER NOT NULL,
  max_uses        INTEGER,
  uses_count      INTEGER DEFAULT 0,
  valid_until     TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, code)
);

-- ============================================================
-- TABLA: orders
-- Pedidos de clientes
-- ============================================================
CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id     UUID REFERENCES restaurants(id),
  customer_name     VARCHAR(120),
  customer_phone    VARCHAR(20),
  customer_address  TEXT,
  items             JSONB NOT NULL DEFAULT '[]',
  subtotal          INTEGER NOT NULL DEFAULT 0,
  delivery_fee      INTEGER DEFAULT 0,
  discount_amount   INTEGER DEFAULT 0,
  total_price       INTEGER NOT NULL DEFAULT 0,
  payment_method    VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash','transfer','mercadopago')),
  payment_status    VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed')),
  mp_preference_id  TEXT,
  mp_payment_id     TEXT,
  status            VARCHAR(30) DEFAULT 'received' CHECK (status IN ('received','kitchen','ready','sent','delivered','cancelled')),
  uchat_sync_status VARCHAR(20) DEFAULT 'pending' CHECK (uchat_sync_status IN ('pending','notified','failed')),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: drivers (Repartidores)
-- ============================================================
CREATE TABLE drivers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name          VARCHAR(80) NOT NULL,
  phone         VARCHAR(20),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Cada dueño solo ve SUS datos. Esto es seguridad real.
-- ============================================================
ALTER TABLE restaurants     ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers         ENABLE ROW LEVEL SECURITY;

-- Policies para que el dueño solo vea sus restaurantes
CREATE POLICY "owner_restaurants" ON restaurants
  FOR ALL USING (owner_id = auth.uid());

-- Policies para tablas que dependen del restaurant
CREATE POLICY "owner_categories" ON categories
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "owner_products" ON products
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "owner_orders" ON orders
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "owner_drivers" ON drivers
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "owner_coupons" ON coupons
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- Menú público: cualquiera puede VER productos activos de un restaurante
CREATE POLICY "public_menu_view" ON products
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "public_category_view" ON categories
  FOR SELECT USING (TRUE);

CREATE POLICY "public_modifier_group_view" ON modifier_groups
  FOR SELECT USING (TRUE);

CREATE POLICY "public_modifier_view" ON modifiers
  FOR SELECT USING (is_active = TRUE);

-- Clientes pueden INSERTAR órdenes (no ver las de otros)
CREATE POLICY "public_insert_orders" ON orders
  FOR INSERT WITH CHECK (TRUE);
