// ============================================================
// Edge Function: mp-webhook
// Recibe notificaciones IPN de Mercado Pago
// Deploy en: supabase functions deploy mp-webhook
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Mercado Pago envía el payment ID por query param
    const url = new URL(req.url)
    const paymentId = url.searchParams.get('data.id') || url.searchParams.get('id')
    const topic = url.searchParams.get('topic') || url.searchParams.get('type')

    if (!paymentId || topic !== 'payment') {
      return new Response(JSON.stringify({ ok: true, msg: 'not a payment notification' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Consultar el estado del pago en la API de Mercado Pago
    // Necesitamos el access_token del restaurante asociado a este pago
    // Primero buscamos la orden por mp_preference_id
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, restaurants(mp_access_token, uchat_webhook_url, name)')
      .eq('mp_payment_id', paymentId)
      .maybeSingle()

    if (orderError || !order) {
      // Buscar por preference_id (puede llegar antes de que guardemos el payment_id)
      console.log('Payment ID not found in orders, may need to search by preference')
    }

    // Verificar el pago con la API de MP
    const mpToken = order?.restaurants?.mp_access_token || Deno.env.get('MP_DEFAULT_TOKEN')
    
    if (!mpToken) {
      return new Response(JSON.stringify({ error: 'No MP token found' }), { status: 400 })
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${mpToken}` }
    })

    const mpPayment = await mpResponse.json()
    console.log('MP Payment status:', mpPayment.status)

    if (mpPayment.status === 'approved') {
      // 1. Actualizar la orden como pagada
      const { data: updatedOrder } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          mp_payment_id: String(paymentId),
          status: 'received'
        })
        .eq('mp_preference_id', mpPayment.external_reference)
        .select('*, restaurants(name, uchat_webhook_url)')
        .single()

      // 2. Disparar notificación a UChat (Edge Function separada)
      if (updatedOrder) {
        const uchatUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/uchat-notify`
        await fetch(uchatUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
          },
          body: JSON.stringify({ order: updatedOrder })
        })
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('mp-webhook error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
