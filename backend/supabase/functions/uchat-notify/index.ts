// ============================================================
// Edge Function: uchat-notify
// Envía el payload del pedido al webhook de UChat
// Deploy en: supabase functions deploy uchat-notify
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { order } = await req.json()

    if (!order) {
      return new Response(JSON.stringify({ error: 'No order provided' }), { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener configuración del restaurante (URL de webhook UChat)
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('name, uchat_webhook_url, bot_enabled')
      .eq('id', order.restaurant_id)
      .single()

    if (!restaurant?.uchat_webhook_url || !restaurant.bot_enabled) {
      console.log('UChat not configured or disabled for this restaurant')
      return new Response(JSON.stringify({ ok: true, msg: 'bot disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Formatear el resumen del pedido
    const items = Array.isArray(order.items) ? order.items : []
    const orderSummary = items.map((item: any) => {
      let line = `• ${item.quantity}x ${item.product_name} - $${(item.unit_price * item.quantity).toLocaleString('es-CO')}`
      if (item.modifiers && item.modifiers.length > 0) {
        line += `\n  └ ${item.modifiers.join(', ')}`
      }
      return line
    }).join('\n')

    // Payload exacto para UChat (el formato que definimos en el plan maestro)
    const uchatPayload = {
      restaurant_name: restaurant.name,
      order_id: order.id,
      customer_name: order.customer_name || 'Cliente',
      customer_phone: order.customer_phone || '',
      order_summary: orderSummary,
      total: `$${(order.total_price).toLocaleString('es-CO')}`,
      payment_method: order.payment_method === 'mercadopago' ? 'Mercado Pago ✓ Aprobado' : 'Efectivo',
      delivery_address: order.customer_address || 'Recogida en local',
      notes: order.notes || '',
    }

    console.log('Sending to UChat:', JSON.stringify(uchatPayload, null, 2))

    // POST real hacia UChat
    const uchatResponse = await fetch(restaurant.uchat_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(uchatPayload)
    })

    const uchatStatus = uchatResponse.ok ? 'notified' : 'failed'
    console.log('UChat response status:', uchatResponse.status)

    // Actualizar el estado de sincronización en la orden
    await supabase
      .from('orders')
      .update({ uchat_sync_status: uchatStatus })
      .eq('id', order.id)

    return new Response(JSON.stringify({ ok: true, uchat_status: uchatStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('uchat-notify error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
