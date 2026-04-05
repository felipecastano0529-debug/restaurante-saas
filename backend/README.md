# RestauranteSaaS — Backend Real

## Estructura del proyecto

```
backend/
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql   ← Ejecutar primero en Supabase
│   │   └── 002_seed_demo.sql        ← Datos de demo
│   └── functions/
│       ├── mp-webhook/              ← IPN de Mercado Pago
│       ├── uchat-notify/            ← Notificar a UChat
│       └── create-mp-preference/    ← Crear checkout de MP
├── lib/
│   └── supabase.js                  ← Cliente y funciones de API
└── .env.example                     ← Plantilla de variables de entorno
```

---

## Paso 1: Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un nuevo proyecto
2. Ve a **SQL Editor** y ejecuta los archivos en este orden:
   - `001_initial_schema.sql`
   - `002_seed_demo.sql`
3. Ve a **Settings > API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

## Paso 2: Instalar Supabase CLI y hacer deploy de Edge Functions

```bash
# Instalar Supabase CLI
brew install supabase/tap/supabase

# Login
supabase login

# Vincular con tu proyecto
supabase link --project-ref TU-PROJECT-REF

# Deploy de Edge Functions
supabase functions deploy mp-webhook
supabase functions deploy uchat-notify
supabase functions deploy create-mp-preference

# Configurar secrets (variables de entorno en el servidor)
supabase secrets set MP_DEFAULT_TOKEN=TEST-XXX...
supabase secrets set APP_URL=https://restaurante-saas.vercel.app
```

## Paso 3: Mercado Pago

1. Ve a [mercadopago.com.co/developers](https://www.mercadopago.com.co/developers)
2. Crea una aplicación nueva
3. Copia el **Access Token de pruebas** → `MP_DEFAULT_TOKEN`
4. El IPN de MP apuntará automáticamente a tu Edge Function de Supabase

## Paso 4: Deploy en Vercel

```bash
# Dentro de la carpeta Next.js (restaurante-saas/)
npm install -g vercel
vercel login
vercel deploy

# Configurar variables de entorno en Vercel:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Paso 5: Configurar UChat

1. En UChat, crea un Bot nuevo
2. Ve a Integraciones > Webhook de Entrada
3. Copia la URL del webhook
4. En el Panel Admin de tu restaurante en la app, pega la URL
5. La Edge Function `uchat-notify` enviará el payload automáticamente

---

## ¿Qué es real vs. simulado?

| Función | Estado | Notas |
|---------|--------|-------|
| Base de datos (Supabase) | ✅ Real | 100% funcional con Supabase gratis |
| Autenticación de dueños | ✅ Real | Supabase Auth |
| Menú dinámico multi-tenant | ✅ Real | Por slug: /la-braseria |
| Row Level Security | ✅ Real | Cada dueño solo ve sus datos |
| Edge Function MP-Webhook | ✅ Real | Necesita MP token real |
| Edge Function UChat | ✅ Real | Necesita URL de webhook UChat |
| Pago con Mercado Pago | ✅ Real | Necesita cuenta MP comercio |
| Realtime (nuevas órdenes) | ✅ Real | Supabase Realtime incluido |
| Deploy en internet | ✅ Real | Vercel gratuito |
