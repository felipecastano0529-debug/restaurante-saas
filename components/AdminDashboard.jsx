'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase, updateOrderStatus, subscribeToOrders } from '@/lib/supabase'
import AdminMenuEditor from './AdminMenuEditor'

const fmt = (n) => '$' + Math.round(n).toLocaleString('es-CO')

const STATUS_LABELS = {
  received: 'Recibido', kitchen: 'En Cocina',
  ready: 'Listo', sent: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado'
}
const STATUS_COLORS = {
  received: '#2563eb', kitchen: '#f59e0b', ready: '#10b981',
  sent: '#7c3aed', delivered: '#059669', cancelled: '#ef4444'
}

export default function AdminDashboard({ restaurantId }) {
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [restaurant, setRestaurant] = useState(null)
  const [view, setView]         = useState('orders')  // orders | menu | analytics
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    if (!restaurantId) return
    supabase.from('restaurants').select('*').eq('id', restaurantId).single()
      .then(({ data }) => setRestaurant(data))
  }, [restaurantId])

  useEffect(() => {
    if (!restaurantId) return
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders(data || [])
        setLoading(false)
      })

    const channel = subscribeToOrders(restaurantId, (newOrder) => {
      setOrders(prev => [newOrder, ...prev])
      setNewOrderAlert(true)
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(() => {})
      }
      setTimeout(() => setNewOrderAlert(false), 5000)
    })

    return () => { supabase.removeChannel(channel) }
  }, [restaurantId])

  async function changeStatus(orderId, status) {
    await updateOrderStatus(orderId, status)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
  }

  const totalHoy = orders.filter(o => o.payment_status === 'paid' || o.payment_method === 'cash').reduce((s, o) => s + (o.total_price || 0), 0)
  const pendientes = orders.filter(o => ['received', 'kitchen', 'ready'].includes(o.status)).length

  if (loading || !restaurant) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}>
      <div style={{ textAlign:'center' }}>
        <div className="spin" style={{ width:40, height:40, margin:'0 auto 12px' }} />
        <div style={{ color:'#888', fontSize:14 }}>Cargando dashboard…</div>
      </div>
    </div>
  )

  const trialEnds = new Date(restaurant.trial_ends_at)
  const todayDate = new Date()
  const diffDays = Math.ceil((trialEnds - todayDate) / (1000 * 60 * 60 * 24))
  const isExpired = restaurant.subscription_status === 'trial' && diffDays <= 0

  if (isExpired) return (
    <div style={{ minHeight:'100vh', background:'#1a1a2e', display:'flex', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center', color:'#fff' }}>
      <div className="card animate-scale-in" style={{ padding:48, maxWidth:450, background:'#fff', color:'#1a1a2e' }}>
        <div style={{ fontSize:64, marginBottom:24 }}>⌛</div>
        <h2 style={{ fontSize:28, fontWeight:800, marginBottom:16 }}>Tu prueba ha expirado</h2>
        <p style={{ color:'#666', fontSize:16, lineHeight:1.6, marginBottom:32 }}>
          Tus 14 días de prueba gratuita han terminado. Activa tu plan profesional para continuar.
        </p>
        <button style={{ width:'100%', padding:18, background:'#E85D04', color:'#fff', border:'none', borderRadius:14, fontSize:16, fontWeight:800, cursor:'pointer' }}>
          Activar Plan Pro ($49.000/mes)
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#f7f7f5', fontFamily:'system-ui, sans-serif' }}>
      <audio ref={audioRef} src="/alert.mp3" preload="auto" />
      
      {newOrderAlert && (
        <div style={{ position:'fixed', top:16, right:16, zIndex:9999, background:'#E85D04', color:'#fff', padding:'14px 20px', borderRadius:12, fontWeight:700, fontSize:15, boxShadow:'0 4px 20px rgba(0,0,0,.3)', animation:'slide-in .3s ease' }}>
          🔔 ¡Nuevo pedido recibido!
        </div>
      )}

      {restaurant.subscription_status === 'trial' && diffDays > 0 && (
        <div style={{ background:'linear-gradient(90deg, #E85D04, #F48C06)', color:'#fff', padding:'8px 24px', fontSize:13, fontWeight:600, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>🎁 Tienes <strong>{diffDays} días</strong> restantes de prueba gratuita.</span>
          <button style={{ background:'#fff', color:'#E85D04', border:'none', padding:'4px 12px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>Suscribirme ahora</button>
        </div>
      )}

      <div style={{ background:'#1a1a2e', color:'#fff', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontWeight:700, fontSize:18 }}>Panel Admin</div>
          <div style={{ fontSize:12, opacity:.7 }}>{restaurant.name} — {new Date().toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long' })}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {['orders', 'menu', 'analytics'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:13, background: view === v ? '#E85D04' : 'rgba(255,255,255,.1)', color:'#fff' }}>
              {v === 'orders' ? '📋 Pedidos' : v === 'menu' ? '🍴 Menú' : '📊 Estadísticas'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 0 40px' }}>
        {view === 'menu' && <AdminMenuEditor restaurantId={restaurantId} />}

        {view === 'orders' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12, padding:'16px 20px' }}>
              {[
                { label:'Ventas de hoy', value: fmt(totalHoy), icon:'💰', color:'#10b981' },
                { label:'Pedidos totales', value: orders.length, icon:'📦', color:'#2563eb' },
                { label:'En preparación', value: pendientes, icon:'🍳', color:'#f59e0b' },
                { label:'Entregados', value: orders.filter(o => o.status === 'delivered').length, icon:'✅', color:'#059669' },
              ].map((s, i) => (
                <div key={i} style={{ background:'#fff', borderRadius:12, padding:'16px', borderLeft:`4px solid ${s.color}` }}>
                  <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
                  <div style={{ fontSize:24, fontWeight:800, color:'#1a1a2e' }}>{s.value}</div>
                  <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ padding:'0 20px 24px' }}>
              <div style={{ fontWeight:700, fontSize:16, marginBottom:12 }}>Pedidos de hoy</div>
              {orders.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 20px', color:'#aaa', background:'#fff', borderRadius:12 }}>
                  Sin pedidos aún — ¡el día apenas empieza!
                </div>
              )}
              {orders.map(order => (
                <div key={order.id} style={{ background:'#fff', borderRadius:12, padding:'16px', marginBottom:12, boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14 }}>{order.customer_name}</div>
                      <div style={{ fontSize:12, color:'#888' }}>#{order.id.slice(-8).toUpperCase()} · {new Date(order.created_at).toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' })}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:700, color:'#E85D04' }}>{fmt(order.total_price)}</div>
                    </div>
                  </div>
                  {Array.isArray(order.items) && order.items.map((item, i) => (
                    <div key={i} style={{ fontSize:13, color:'#555', paddingLeft:8 }}>
                      • {item.quantity}x {item.product_name}
                      {item.modifiers?.length > 0 && <span style={{ color:'#E85D04' }}> (+{item.modifiers.join(', ')})</span>}
                    </div>
                  ))}
                  <div style={{ display:'flex', gap:6, marginTop:12 }}>
                    <div style={{ padding:'4px 10px', borderRadius:20, background: `${STATUS_COLORS[order.status] || '#888'}20`, color: STATUS_COLORS[order.status] || '#888', fontSize:11, fontWeight:700 }}>
                      {STATUS_LABELS[order.status] || order.status}
                    </div>
                    <select
                      value={order.status}
                      onChange={e => changeStatus(order.id, e.target.value)}
                      style={{ fontSize:12, padding:'4px 8px', borderRadius:6, border:'1px solid #ddd' }}
                    >
                      {Object.entries(STATUS_LABELS).map(([val, lbl]) => (
                        <option key={val} value={val}>{lbl}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'analytics' && (
          <div style={{ padding:'0 20px 24px' }}>
            <div style={{ background:'#fff', borderRadius:12, padding:24, textAlign:'center', color:'#888' }}>
              📊 Estadísticas detalladas — Próximamente
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
