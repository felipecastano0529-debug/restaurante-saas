// ============================================================
// lib/supabase.js
// Cliente de Supabase para el frontend y servidor
// ============================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Cliente para uso en componentes React (browser)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================================
// lib/api.js
// Funciones para interactuar con la base de datos
// ============================================================

/** Obtener los datos completos del menú de un restaurante por slug */
export async function getRestaurantMenu(slug) {
  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select(`
      id, slug, name, description, whatsapp_number, logo_url, primary_color, address, subscription_status,
      categories(id, name, sort_order,
        products(id, name, description, base_price, image_url, is_active, sort_order,
          modifier_groups(id, name, min_selection, max_selection, sort_order,
            modifiers(id, name, extra_price, is_active)
          )
        )
      ),
      delivery_zones(id, name, price)
    `)
    .eq('slug', slug)
    .eq('subscription_status', 'active')
    .single()

  return { restaurant, error }
}

/** Validar y aplicar un cupón */
export async function validateCoupon(restaurantId, code) {
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .gte('valid_until', new Date().toISOString())
    .single()

  if (error || !coupon) return { valid: false, error: 'Cupón inválido o expirado' }
  if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
    return { valid: false, error: 'Este cupón ya llegó a su límite de usos' }
  }

  return { valid: true, coupon }
}

/** Crear una orden de efectivo directamente en la BD */
export async function createCashOrder(orderData) {
  // Llamar al endpoint de la Edge Function (para efectivo sin MP)
  const response = await fetch(`${supabaseUrl}/functions/v1/uchat-notify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({ order: orderData })
  })
  return response.json()
}

/** Crear preferencia de pago en Mercado Pago */
export async function createMPCheckout(orderData, restaurantSlug) {
  const response = await fetch(`${supabaseUrl}/functions/v1/create-mp-preference`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({ order_data: orderData, restaurant_slug: restaurantSlug })
  })
  return response.json()
}

/** Escuchar nuevas órdenes en tiempo real (para el admin) */
export function subscribeToOrders(restaurantId, callback) {
  const channel = supabase
    .channel(`orders:${restaurantId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'orders',
      filter: `restaurant_id=eq.${restaurantId}`
    }, (payload) => {
      callback(payload.new)
    })
    .subscribe()

  return channel // Retornar para poder desuscribirse
}
