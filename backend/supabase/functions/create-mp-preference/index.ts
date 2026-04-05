// ============================================================
// Edge Function: create-mp-preference
// Crea una preferencia de pago real en Mercado Pago
// Deploy en: supabase functions deploy create-mp-preference
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import MercadoPagoConfig, { Preference } from 'https://esm.sh/mercadopago@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { order_data, restaurant_slug } = await req.json()

    if (!order_data || !restaurant_slug) {
      return new Response(JSON.stringify({ error: 'Missing order_data or restaurant_slug' }), { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener token de MP del restaurante
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('id, name, mp_access_token')
      .eq('slug', restaurant_slug)
      .single()

    if (error || !restaurant?.mp_access_token) {
      return new Response(JSON.stringify({ error: 'Restaurant MP not configured' }), { status: 400 })
    }

    // Guardar la orden en estado "pending" primero
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurant.id,
        customer_name: order_data.customer_name,
        customer_phone: order_data.customer_phone,
        customer_address: order_data.customer_address,
        items: order_data.items,
        subtotal: order_data.subtotal,
        delivery_fee: order_data.delivery_fee || 0,
        discount_amount: order_data.discount_amount || 0,
        total_price: order_data.total_price,
        payment_method: 'mercadopago',
        payment_status: 'pending',
        notes: order_data.notes
      })
      .select()
      .single()

    if (orderError) {
      return new Response(JSON.stringify({ error: orderError.message }), { status: 500 })
    }

    // Inicializar SDK de Mercado Pago con el token del restaurante
    const mpClient = new MercadoPagoConfig({ accessToken: restaurant.mp_access_token })
    const preference = new Preference(mpClient)

    // Construir items para MP
    const mpItems = order_data.items.map((item: any) => ({
      id: item.product_id,
      title: item.product_name,
      quantity: item.quantity,
      unit_price: Math.round(item.unit_price / 100), // MP trabaja en unidades enteras
      currency_id: 'COP'
    }))

    // Añadir domicilio como item si aplica
    if (order_data.delivery_fee > 0) {
      mpItems.push({
        id: 'delivery',
        title: 'Costo de domicilio',
        quantity: 1,
        unit_price: Math.round(order_data.delivery_fee / 100),
        currency_id: 'COP'
      })
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://restaurante-saas.vercel.app'

    // Crear preferencia real en MP
    const createdPreference = await preference.create({
      body: {
        items: mpItems,
        payer: {
          name: order_data.customer_name,
          phone: { area_code: '57', number: order_data.customer_phone?.replace(/\D/g,'') }
        },
        external_reference: order.id, // El ID de nuestra orden en Supabase
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`,
        back_urls: {
          success: `${appUrl}/${restaurant_slug}/pedido/${order.id}?status=success`,
          failure: `${appUrl}/${restaurant_slug}/pedido/${order.id}?status=failure`,
          pending: `${appUrl}/${restaurant_slug}/pedido/${order.id}?status=pending`,
        },
        auto_return: 'approved'
      }
    })

    // Guardar el preference_id en la orden
    await supabase
      .from('orders')
      .update({ mp_preference_id: createdPreference.id })
      .eq('id', order.id)

    return new Response(JSON.stringify({
      preference_id: createdPreference.id,
      init_point: createdPreference.init_point,      // URL del checkout de MP
      sandbox_init_point: createdPreference.sandbox_init_point, // Para pruebas
      order_id: order.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('create-mp-preference error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
