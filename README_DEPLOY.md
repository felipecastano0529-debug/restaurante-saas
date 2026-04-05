# Guía de Lanzamiento: RestauranteSaaS 🚀

Sigue estos pasos para poner tu plataforma en línea hoy mismo.

## 1. Actualizar Base de Datos (Supabase)
Copia y pega esto en tu **SQL Editor** de Supabase y dale a **Run**:
```sql
-- Soporte para transferencia manual
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS transfer_info TEXT;
UPDATE restaurants SET transfer_info = 'Nequi: 3234187831' WHERE slug = 'la-braseria';

-- Permitir tipos de pago adicionales
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check 
  CHECK (payment_method IN ('cash','transfer','mercadopago'));
```

## 2. Subir a GitHub
Abre tu terminal en la carpeta del proyecto y ejecuta:
```bash
git init
git add .
git commit -m "feat: lanzamiento mvp con flujo whatsapp"
# Luego crea un repo en github.com y pega los comandos que te den, algo como:
# git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
# git push -u origin main
```

## 3. Desplegar en Vercel
1. Ve a [Vercel.com](https://vercel.com) e importa tu nuevo repositorio de GitHub.
2. **IMPORTANTE**: En la sección de **Environment Variables**, agrega:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Dale a **Deploy**.

¡Y ya está! Tu restaurante tendrá un link oficial para recibir pedidos.
