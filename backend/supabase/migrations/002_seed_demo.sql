-- ============================================================
-- Datos de demostración para "La Brasería"
-- Ejecutar DESPUÉS del esquema inicial
-- ============================================================

-- NOTA: Reemplaza 'TU-USER-UUID' con el UUID de tu usuario en Supabase Auth
-- Lo consigues en: Supabase > Authentication > Users

DO $$
DECLARE
  v_restaurant_id UUID;
  v_cat_burgers   UUID;
  v_cat_pizzas    UUID;
  v_cat_drinks    UUID;
  v_prod_clasica  UUID;
  v_prod_doble    UUID;
  v_group_term    UUID;
  v_group_extras  UUID;
BEGIN

-- Restaurante demo
INSERT INTO restaurants (slug, name, description, whatsapp_number, primary_color, address, transfer_info, subscription_status)
VALUES ('la-braseria', 'La Brasería', 'Las mejores hamburguesas artesanales de la ciudad.', '573234187831', '#E85D04', 'Calle 15 #5-23, Cali', 'Nequi: 3234187831', 'trial')
RETURNING id INTO v_restaurant_id;

-- Categorías
INSERT INTO categories (restaurant_id, name, sort_order) VALUES (v_restaurant_id, 'Hamburguesas', 1) RETURNING id INTO v_cat_burgers;
INSERT INTO categories (restaurant_id, name, sort_order) VALUES (v_restaurant_id, 'Pizzas', 2) RETURNING id INTO v_cat_pizzas;
INSERT INTO categories (restaurant_id, name, sort_order) VALUES (v_restaurant_id, 'Bebidas', 3) RETURNING id INTO v_cat_drinks;

-- Productos
INSERT INTO products (restaurant_id, category_id, name, description, base_price, sort_order)
VALUES (v_restaurant_id, v_cat_burgers, 'Hamburguesa Clásica', 'Carne, queso, lechuga, tomate', 28000, 1)
RETURNING id INTO v_prod_clasica;

INSERT INTO products (restaurant_id, category_id, name, description, base_price, sort_order)
VALUES (v_restaurant_id, v_cat_burgers, 'Doble Smash Burger', 'Doble carne, doble queso, salsa especial', 38000, 2)
RETURNING id INTO v_prod_doble;

INSERT INTO products (restaurant_id, category_id, name, description, base_price) VALUES
(v_restaurant_id, v_cat_burgers, 'Veggie Burger', 'Patty de frijol, aguacate, tomate', 25000),
(v_restaurant_id, v_cat_pizzas,  'Pizza Margarita', 'Tomate, mozzarella, albahaca fresca', 32000),
(v_restaurant_id, v_cat_pizzas,  'Pizza Pepperoni', 'Pepperoni, queso doble', 36000),
(v_restaurant_id, v_cat_drinks,  'Limonada Natural', 'Con o sin gas', 8000),
(v_restaurant_id, v_cat_drinks,  'Jugo de Maracuyá', '100% fruta natural', 9000);

-- Modifier groups para Hamburguesa Clásica
INSERT INTO modifier_groups (product_id, name, min_selection, max_selection, sort_order)
VALUES (v_prod_clasica, 'Término de la carne', 1, 1, 1)
RETURNING id INTO v_group_term;

INSERT INTO modifiers (modifier_group_id, name, extra_price) VALUES
(v_group_term, '3/4 (Recomendado)', 0),
(v_group_term, 'Bien Asada', 0);

INSERT INTO modifier_groups (product_id, name, min_selection, max_selection, sort_order)
VALUES (v_prod_clasica, 'Adiciones Extra', 0, 3, 2)
RETURNING id INTO v_group_extras;

INSERT INTO modifiers (modifier_group_id, name, extra_price) VALUES
(v_group_extras, 'Extra Queso', 3000),
(v_group_extras, 'Tocineta', 4000),
(v_group_extras, 'Aguacate', 3500);

-- Zona de domicilio
INSERT INTO delivery_zones (restaurant_id, name, price) VALUES
(v_restaurant_id, 'Recogida en local', 0),
(v_restaurant_id, 'San Fernando', 5000),
(v_restaurant_id, 'Granada', 6000),
(v_restaurant_id, 'El Peñón', 7000);

-- Cupón de bienvenida
INSERT INTO coupons (restaurant_id, code, discount_type, discount_value, is_active)
VALUES (v_restaurant_id, 'BIENVENIDO10', 'percent', 10, TRUE);

RAISE NOTICE 'Restaurante "La Brasería" creado con ID: %', v_restaurant_id;
END $$;
