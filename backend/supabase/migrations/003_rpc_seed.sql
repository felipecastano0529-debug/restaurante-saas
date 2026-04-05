-- ============================================================
-- RPC: seed_restaurant_menu
-- Inyecta un menú premium completo en un restaurante nuevo
-- ============================================================

CREATE OR REPLACE FUNCTION seed_restaurant_menu(res_id UUID)
RETURNS VOID AS $$
DECLARE
  v_cat_burgers   UUID;
  v_cat_pizzas    UUID;
  v_cat_drinks    UUID;
  v_prod_clasica  UUID;
  v_group_term    UUID;
  v_group_extras  UUID;
BEGIN

  -- 1. Categorías Base
  INSERT INTO categories (restaurant_id, name, sort_order) VALUES (res_id, '🍔 Hamburguesas', 1) RETURNING id INTO v_cat_burgers;
  INSERT INTO categories (restaurant_id, name, sort_order) VALUES (res_id, '🍕 Pizzas', 2) RETURNING id INTO v_cat_pizzas;
  INSERT INTO categories (restaurant_id, name, sort_order) VALUES (res_id, '🥤 Bebidas', 3) RETURNING id INTO v_cat_drinks;

  -- 2. Productos: Hamburguesas
  INSERT INTO products (restaurant_id, category_id, name, description, base_price, sort_order, image_url)
  VALUES (res_id, v_cat_burgers, 'Hamburguesa Clásica', 'Carne 150g, queso americano, lechuga, tomate y salsa de la casa.', 28000, 1, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000&auto=format&fit=crop')
  RETURNING id INTO v_prod_clasica;

  INSERT INTO products (restaurant_id, category_id, name, description, base_price, sort_order, image_url)
  VALUES (res_id, v_cat_burgers, 'Doble Smash Burger', 'Doble carne, doble queso, tocineta crujiente y cebolla grillé.', 38000, 2, 'https://images.unsplash.com/photo-1594212699903-ec8a3eea50f6?q=80&w=1000&auto=format&fit=crop');

  -- 3. Productos: Pizzas
  INSERT INTO products (restaurant_id, category_id, name, description, base_price, sort_order, image_url)
  VALUES (res_id, v_cat_pizzas,  'Pizza Margarita', 'Pomodoro italiano, mozzarella fresca y albahaca del huerto.', 32000, 1, 'https://images.unsplash.com/photo-1574071318508-1cdbad80ad50?q=80&w=1000&auto=format&fit=crop');

  -- 4. Productos: Bebidas
  INSERT INTO products (restaurant_id, category_id, name, description, base_price, sort_order)
  VALUES (res_id, v_cat_drinks,  'Limonada de Coco', 'Cremosa y refrescante con coco natural.', 12000, 1);

  -- 5. Modificadores para Hamburguesa Clásica
  INSERT INTO modifier_groups (product_id, name, min_selection, max_selection, sort_order)
  VALUES (v_prod_clasica, 'Término de la carne', 1, 1, 1)
  RETURNING id INTO v_group_term;

  INSERT INTO modifiers (modifier_group_id, name, extra_price) VALUES
  (v_group_term, '3/4 (Jugoso)', 0),
  (v_group_term, 'Bien Asada', 0);

  INSERT INTO modifier_groups (product_id, name, min_selection, max_selection, sort_order)
  VALUES (v_prod_clasica, 'Adiciones Extra', 0, 3, 2)
  RETURNING id INTO v_group_extras;

  INSERT INTO modifiers (modifier_group_id, name, extra_price) VALUES
  (v_group_extras, 'Extra Queso', 4000),
  (v_group_extras, 'Tocineta', 5000),
  (v_group_extras, 'Aguacate', 4000);

  -- 6. Zonas de Domicilio por defecto
  INSERT INTO delivery_zones (restaurant_id, name, price) VALUES
  (res_id, 'Recogida en Local', 0),
  (res_id, 'Domicilio Cercano (Radio 5km)', 5000),
  (res_id, 'Domicilio Lejano (Radio 10km)', 9000);

  -- 7. Cupón de bienvenida
  INSERT INTO coupons (restaurant_id, code, discount_type, discount_value, is_active)
  VALUES (res_id, 'BIENVENIDO', 'percent', 10, TRUE);

END;
$$ LANGUAGE plpgsql;
