// ============================================================
// lib/supabase.js  — Cliente de Supabase para toda la app
// ============================================================
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ————————————————————————————————————————————————————————————
// getRestaurantMenu: carga el menú completo de un slug dado
// ————————————————————————————————————————————————————————————
export async function getRestaurantMenu(slug) {
  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      id, slug, name, description, whatsapp_number,
      logo_url, primary_color, address, subscription_status,
      categories(
        id, name, sort_order,
        products(
          id, name, description, base_price, image_url, is_active, sort_order,
          modifier_groups(
            id, name, min_selection, max_selection, sort_order,
            modifiers(id, name, extra_price, is_active)
          )
        )
      ),
      delivery_zones(id, name, price)
    `)
    .eq('slug', slug)
    .single()

  return { restaurant: data, error }
}

// ————————————————————————————————————————————————————————————
// validateCoupon: verifica si un cupón es válido
// ————————————————————————————————————————————————————————————
export async function validateCoupon(restaurantId, code) {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .or(`valid_until.is.null,valid_until.gte.${now}`)
    .single()

  if (error || !data) return { valid: false, message: 'Cupón inválido o expirado' }
  if (data.max_uses && data.uses_count >= data.max_uses) {
    return { valid: false, message: 'Cupón agotado' }
  }
  return { valid: true, coupon: data }
}

// ————————————————————————————————————————————————————————————
// createCashOrder: inserta una orden de efectivo en la BD
// ————————————————————————————————————————————————————————————
export async function createCashOrder(orderData) {
  const { data, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Disparar UChat
  await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/uchat-notify`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ order: data }),
    }
  )
  return data
}

// ————————————————————————————————————————————————————————————
// createMPCheckout: crea preferencia de pago en Mercado Pago
// ————————————————————————————————————————————————————————————
export async function createMPCheckout(orderData, slug) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-mp-preference`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ order_data: orderData, restaurant_slug: slug }),
    }
  )
  return res.json()
}

// ————————————————————————————————————————————————————————————
// subscribeToOrders: escucha nuevas órdenes en tiempo real
// Retorna el canal para poder desuscribirse
// ————————————————————————————————————————————————————————————
export function subscribeToOrders(restaurantId, onNew) {
  return supabase
    .channel(`orders-${restaurantId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      (payload) => onNew(payload.new)
    )
    .subscribe()
}

// ————————————————————————————————————————————————————————————
// updateOrderStatus: cambia el estado de una orden
// ————————————————————————————————————————————————————————————
export async function updateOrderStatus(orderId, status) {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
  return { error }
}

// ————————————————————————————————————————————————————————————
// GESTIÓN DE MENÚ (ADMIN SaaS)
// ————————————————————————————————————————————————————————————

export async function seedNewRestaurantMenu(restaurantId) {
  const { error } = await supabase.rpc('seed_restaurant_menu', { res_id: restaurantId })
  if (error) throw error
}

export async function getCategories(restaurantId) {
  const { data, error } = await supabase
    .from('categories')
    .select('*, products(*)')
    .eq('restaurant_id', restaurantId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function upsertCategory(cat) {
  const { data, error } = await supabase.from('categories').upsert(cat).select().single()
  if (error) throw error
  return data
}

export async function upsertProduct(prod) {
  const { data, error } = await supabase.from('products').upsert(prod).select().single()
  if (error) throw error
  return data
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}
