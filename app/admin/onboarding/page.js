'use client'
import { useState, useEffect } from 'react'
import { supabase, seedNewRestaurantMenu } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Verificar si ya tiene restaurante
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return router.push('/admin')
      
      supabase.from('restaurants').select('id').eq('owner_id', user.id).single()
        .then(({ data }) => {
          if (data) router.push('/admin/dashboard')
        })
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setStatusText('Creando tu cuenta...')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Calcular fin de trial (14 días)
      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 14)

      const { data: rest, error: insError } = await supabase.from('restaurants').insert({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        whatsapp_number: whatsapp,
        owner_id: user.id,
        trial_ends_at: trialEndsAt.toISOString(),
        subscription_status: 'trial'
      }).select().single()

      if (insError) throw insError

      // SEEDING: Cargar el menú de ejemplo premium
      setStatusText('Diseñando tu menú premium...')
      await seedNewRestaurantMenu(rest.id)

      router.push('/admin/dashboard')
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f8f9fa', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'#fff', borderRadius:24, padding:40, width:'100%', maxWidth:450, boxShadow:'0 10px 40px rgba(0,0,0,0.05)' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🚀</div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#1a1a2e' }}>¡Casi listo!</h1>
          <p style={{ fontSize:14, color:'#666', marginTop:8 }}>Configura los datos básicos de tu restaurante para comenzar tus 14 días de prueba.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div>
            <label style={{ fontSize:13, fontWeight:700, color:'#444', display:'block', marginBottom:8 }}>Nombre del Restaurante</label>
            <input 
              value={name} onChange={e => { setName(e.target.value); if(!slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-')) }}
              placeholder="Ej: La Brasería" required
              style={{ width:'100%', padding:'12px 16px', borderRadius:12, border:'1.5px solid #eee', fontSize:15, outline:'none' }}
              disabled={loading}
            />
          </div>

          <div>
            <label style={{ fontSize:13, fontWeight:700, color:'#444', display:'block', marginBottom:8 }}>Link de tu menú (Slug)</label>
            <div style={{ display:'flex', alignItems:'center', background:'#f0f0f0', borderRadius:12, padding:'0 16px', border:'1.5px solid #eee' }}>
              <span style={{ fontSize:14, color:'#888' }}>app.com/</span>
              <input 
                value={slug} onChange={e => setSlug(e.target.value)}
                placeholder="la-braseria" required
                style={{ flex:1, padding:'12px 8px', background:'transparent', border:'none', fontSize:15, outline:'none', fontWeight:600 }}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize:13, fontWeight:700, color:'#444', display:'block', marginBottom:8 }}>WhatsApp para Pedidos</label>
            <input 
              value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
              placeholder="Ej: 573234187831" required
              style={{ width:'100%', padding:'12px 16px', borderRadius:12, border:'1.5px solid #eee', fontSize:15, outline:'none' }}
              disabled={loading}
            />
          </div>

          {error && <div style={{ color:'#c00', fontSize:13, background:'#fff0f0', padding:12, borderRadius:10 }}>{error}</div>}

          <button 
            type="submit" disabled={loading}
            style={{ width:'100%', padding:16, background:'#E85D04', color:'#fff', border:'none', borderRadius:14, fontSize:16, fontWeight:800, cursor:'pointer', marginTop:10, opacity: loading ? .7 : 1 }}
          >
            {loading ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                <div className="spin" style={{ width:16, height:16 }} />
                <span>{statusText}</span>
              </div>
            ) : 'Comenzar mi Prueba Gratis'}
          </button>
        </form>
      </div>
    </div>
  )
}
