'use client'
import { useState, useEffect, useRef } from 'react'
import { getRestaurantMenu, validateCoupon, createCashOrder, createMPCheckout } from '@/lib/supabase'

const fmt = (n) => '$' + Math.round(n).toLocaleString('es-CO')

export default function MenuPage({ slug }) {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [openProduct, setOpenProduct] = useState(null)
  const [selectedMods, setSelectedMods] = useState({})
  const [showCheckout, setShowCheckout] = useState(false)
  
  // Datos del form
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [deliveryZone, setDeliveryZone] = useState(null)
  const [payMethod, setPayMethod] = useState('cash')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponMsg, setCouponMsg] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)
  const [orderDone, setOrderDone] = useState(null)

  useEffect(() => {
    getRestaurantMenu(slug).then(({ restaurant, error }) => {
      if (restaurant) {
        setRestaurant(restaurant)
        document.documentElement.style.setProperty('--b', restaurant.primary_color || '#E85D04')
      }
      setLoading(false)
    })
  }, [slug])

  // Lógica del Carrito
  const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0)
  const deliveryFee = deliveryZone?.price || 0
  const discountAmt = appliedCoupon ? (appliedCoupon.discount_type === 'percent' ? Math.round(subtotal * appliedCoupon.discount_value / 100) : appliedCoupon.discount_value) : 0
  const total = subtotal + deliveryFee - discountAmt
  const cartCount = cart.reduce((a, c) => a + c.qty, 0)

  function openModifiers(product) {
    setOpenProduct(product)
    const initial = {}
    product.modifier_groups?.forEach(g => {
      initial[g.id] = g.min_selection === 1 && g.max_selection === 1 
        ? g.modifiers?.[0]?.id || null 
        : []
    })
    setSelectedMods(initial)
  }

  function handleModToggle(group, modId) {
    setSelectedMods(prev => {
      if (group.max_selection === 1) return { ...prev, [group.id]: modId }
      const current = prev[group.id] || []
      if (current.includes(modId)) return { ...prev, [group.id]: current.filter(id => id !== modId) }
      if (current.length >= group.max_selection) return prev
      return { ...prev, [group.id]: [...current, modId] }
    })
  }

  function addToCart() {
    // Validar mínimos
    for (const g of openProduct.modifier_groups || []) {
      const sel = selectedMods[g.id]
      const count = Array.isArray(sel) ? sel.length : (sel ? 1 : 0)
      if (count < g.min_selection) {
        alert(`Por favor selecciona al menos ${g.min_selection} en ${g.name}`)
        return
      }
    }

    const allIds = Object.values(selectedMods).flat().filter(Boolean)
    const extraPrice = allIds.reduce((s, id) => {
      for (const g of openProduct.modifier_groups) {
        const m = g.modifiers.find(x => x.id === id)
        if (m) return s + (m.extra_price || 0)
      }
      return s
    }, 0)

    const modsNames = allIds.map(id => {
      for (const g of openProduct.modifier_groups) {
        const m = g.modifiers.find(x => x.id === id)
        if (m) return m.name
      }
      return ''
    }).filter(Boolean)

    const key = openProduct.id + '|' + allIds.sort().join(',')
    setCart(prev => {
      const idx = prev.findIndex(c => c.key === key)
      if (idx >= 0) return prev.map((c, i) => i === idx ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, {
        key, productId: openProduct.id, productName: openProduct.name,
        qty: 1, unitPrice: openProduct.base_price + extraPrice,
        mods: modsNames, modIds: allIds
      }]
    })
    setOpenProduct(null)
  }

  async function handleApplyCoupon() {
    if (!couponCode) return
    const { valid, coupon, message } = await validateCoupon(restaurant.id, couponCode)
    if (valid) { setAppliedCoupon(coupon); setCouponMsg('¡Cupón aplicado!') }
    else setCouponMsg(message)
  }

  async function checkout() {
    if (!customerName || !customerPhone) return alert('Nombre y Teléfono son obligatorios')
    setCheckingOut(true)

    // Formatear mensaje para WhatsApp
    const itemsText = cart.map(c => `*${c.qty}x ${c.productName}*${c.mods.length > 0 ? ` (${c.mods.join(', ')})` : ''} - ${fmt(c.unitPrice * c.qty)}`).join('\n')
    
    const orderText = `*NUEVO PEDIDO - ${restaurant.name}*\n\n` +
      `👤 *Cliente:* ${customerName}\n` +
      `📞 *Teléfono:* ${customerPhone}\n` +
      `📍 *Entrega:* ${customerAddress}\n` +
      `🚚 *Zona:* ${deliveryZone?.name || 'Recogida'}\n\n` +
      `🛍️ *Detalle:*\n${itemsText}\n\n` +
      `💰 *Subtotal:* ${fmt(subtotal)}\n` +
      (deliveryFee > 0 ? `🚚 *Envío:* ${fmt(deliveryFee)}\n` : '') +
      (discountAmt > 0 ? `🎟️ *Descuento:* -${fmt(discountAmt)}\n` : '') +
      `⭐ *TOTAL:* ${fmt(total)}\n\n` +
      `💳 *Método:* ${payMethod === 'cash' ? '💵 Efectivo' : '🏦 Transferencia'}\n` +
      (notes ? `📝 *Notas:* ${notes}\n` : '') +
      (payMethod === 'mercadopago' ? '' : (payMethod === 'cash' ? '' : `\n⚠️ *Info de Pago:*\nNequi: 3234187831\n(Por favor adjuntar comprobante)`));

    const orderData = {
      restaurant_id: restaurant.id,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      items: cart.map(c => ({ product_id: c.productId, product_name: c.productName, quantity: c.qty, unit_price: c.unitPrice, modifiers: c.mods })),
      subtotal, delivery_fee: deliveryFee, discount_amount: discountAmt, total_price: total, payment_method: payMethod, notes
    }

    try {
      // Guardar en Supabase para el panel admin
      await createCashOrder(orderData)
      
      // Abrir WhatsApp
      const waUrl = `https://wa.me/${restaurant.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(orderText)}`
      window.open(waUrl, '_blank')
      
      setOrderDone(true)
      setCart([])
      setShowCheckout(false)
    } catch (e) { 
      alert('Error: ' + e.message) 
    }
    setCheckingOut(false)
  }

  if (loading) return <div className="animate-fade-in" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}><div className="spin"></div></div>

  if (!restaurant) return (
    <div className="animate-fade-in" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:40 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:64, marginBottom:20 }}>🍽️</div>
        <h2 style={{ fontSize:22, fontWeight:800 }}>Restaurante no encontrado</h2>
        <p style={{ color:'var(--text2)', marginTop:8 }}>Verifica el enlace o contacta al establecimiento.</p>
      </div>
    </div>
  )

  if (orderDone) return (
    <div className="animate-fade-in" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:32 }}>
      <div className="card" style={{ padding:40, textAlign:'center', maxWidth:400 }}>
        <div style={{ fontSize:64, marginBottom:20 }}>🎉</div>
        <h2 style={{ fontSize:24, fontWeight:800 }}>¡Pedido Recibido!</h2>
        <p style={{ color:'var(--text2)', marginTop:12, fontSize:15 }}>Tu orden ha sido enviada con éxito. Te contactaremos pronto al número <strong>{customerPhone}</strong>.</p>
        <button onClick={() => setOrderDone(null)} className="btn-primary" style={{ marginTop:32, width:'100%' }}>Regresar al Menú</button>
      </div>
    </div>
  )

  const categories = restaurant.categories?.sort((a,b) => a.sort_order - b.sort_order) || []

  return (
    <div className="no-scrollbar" style={{ maxWidth:540, margin:'0 auto', background:'#fff', minHeight:'100vh', position:'relative' }}>
      
      {/* HEADER */}
      <header className="glass" style={{ position:'sticky', top:0, zIndex:100, padding:'20px 24px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          {restaurant.logo_url ? <img src={restaurant.logo_url} style={{ width:50, height:50, borderRadius:12, objectFit:'cover' }} /> : <div style={{ width:50, height:50, background:'var(--b)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:18 }}>{restaurant.name.charAt(0)}</div>}
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, marginBottom:2 }}>{restaurant.name}</h1>
            <p style={{ fontSize:12, color:'var(--text2)', display:'flex', alignItems:'center', gap:4 }}><span style={{ width:8, height:8, background:'var(--tl)', borderRadius:50 }}></span> Abierto ahora · {restaurant.address || 'Domicilios'}</p>
          </div>
        </div>
      </header>

      {/* CATEGORY BAR */}
      <nav className="no-scrollbar" style={{ position:'sticky', top:91, zIndex:90, background:'#fff', overflowX:'auto', display:'flex', gap:8, padding:'12px 24px', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior:'smooth', block:'start' })} style={{ padding:'8px 16px', borderRadius:20, fontSize:13, fontWeight:600, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', color:'var(--text2)' }}>
            {cat.name}
          </button>
        ))}
      </nav>

      {/* PRODUCT LIST */}
      <main style={{ padding:'0 24px 120px' }}>
        {categories.map(cat => {
          const prods = (cat.products || []).filter(p => p.is_active).sort((a,b) => a.sort_order - b.sort_order)
          if (!prods.length) return null
          return (
            <section key={cat.id} id={`cat-${cat.id}`} style={{ marginTop:32 }}>
              <h2 style={{ fontSize:15, fontWeight:800, color:'var(--text)', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
                {cat.name} <span style={{ flex:1, height:1, background:'var(--border)' }}></span>
              </h2>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {prods.map(p => (
                  <div key={p.id} onClick={() => openModifiers(p)} className="animate-fade-in" style={{ display:'flex', gap:16, cursor:'pointer' }}>
                    <div style={{ flex:1 }}>
                      <h3 style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>{p.name}</h3>
                      <p style={{ fontSize:12, color:'var(--text2)', marginBottom:8, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{p.description}</p>
                      <span style={{ fontSize:15, fontWeight:800, color:'var(--b)' }}>{fmt(p.base_price)}</span>
                    </div>
                    {p.image_url ? <img src={p.image_url} style={{ width:100, height:100, borderRadius:16, objectFit:'cover' }} /> : <div style={{ width:100, height:100, background:'#f0f0f0', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc', fontSize:10, fontWeight:700 }}>SIN FOTO</div>}
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </main>

      {/* FLOATING CART BAR */}
      {cartCount > 0 && !showCheckout && (
        <div style={{ position:'fixed', bottom:24, left:0, right:0, zIndex:150, padding:'0 24px' }}>
          <button onClick={() => setShowCheckout(true)} className="btn-primary animate-slide-up" style={{ width:'100%', boxShadow:'0 12px 40px rgba(var(--b-rgb), 0.35)', padding:'16px 24px' }}>
            <span style={{ background:'#fff', color:'var(--b)', padding:'2px 8px', borderRadius:8, fontSize:13 }}>{cartCount}</span>
            <span style={{ flex:1, textAlign:'left' }}>Ver Pedido</span>
            <span>{fmt(total)}</span>
          </button>
        </div>
      )}

      {/* MODIFIERS BOTTOM SHEET */}
      {openProduct && (
        <div className="modal-overlay animate-fade-in" onClick={() => setOpenProduct(null)}>
          <div className="bottom-sheet animate-slide-up" onClick={e => e.stopPropagation()}>
            <div style={{ width:40, height:4, background:'#e0e0e0', borderRadius:2, margin:'0 auto 20px' }}></div>
            <div style={{ display:'flex', gap:16, marginBottom:24 }}>
              {openProduct.image_url && <img src={openProduct.image_url} style={{ width:80, height:80, borderRadius:12, objectFit:'cover' }} />}
              <div>
                <h2 style={{ fontSize:20, fontWeight:800 }}>{openProduct.name}</h2>
                <p style={{ fontSize:13, color:'var(--text2)', marginTop:4 }}>{openProduct.description}</p>
              </div>
            </div>

            {openProduct.modifier_groups?.sort((a,b) => a.sort_order - b.sort_order).map(group => (
              <div key={group.id} style={{ marginBottom:28 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:12 }}>
                  <h4 style={{ fontSize:15, fontWeight:700 }}>{group.name}</h4>
                  <span style={{ fontSize:11, color:'var(--b)', fontWeight:600, background:'var(--blight)', padding:'2px 8px', borderRadius:6 }}>
                    {group.min_selection > 0 ? `MÍN ${group.min_selection}` : 'OPCIONAL'}
                  </span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {group.modifiers?.filter(m => m.is_active).map(mod => {
                    const isRadio = group.max_selection === 1
                    const sel = selectedMods[group.id]
                    const checked = isRadio ? sel === mod.id : sel?.includes(mod.id)
                    return (
                      <label key={mod.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderRadius:12, border:`1.5px solid ${checked ? 'var(--b)' : '#f0f0f0'}`, background: checked ? 'var(--blight)' : 'transparent', cursor:'pointer', transition:'all 0.2s' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                          <input type={isRadio ? 'radio' : 'checkbox'} checked={checked} onChange={() => handleModToggle(group, mod.id)} style={{ width:18, height:18, accentColor:'var(--b)' }} />
                          <span style={{ fontSize:14, fontWeight:500 }}>{mod.name}</span>
                        </div>
                        {mod.extra_price > 0 && <span style={{ fontSize:13, color:'var(--b)', fontWeight:700 }}>+{fmt(mod.extra_price)}</span>}
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}

            <button onClick={addToCart} className="btn-primary" style={{ width:'100%', marginTop:10 }}>Agregar al Carrito</button>
          </div>
        </div>
      )}

      {/* CHECKOUT DRAWER */}
      {showCheckout && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowCheckout(false)}>
          <div className="bottom-sheet animate-slide-up" style={{ maxHeight:'95vh' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <h2 style={{ fontSize:22, fontWeight:800 }}>Tu Pedido</h2>
              <button onClick={() => setShowCheckout(false)} style={{ background:'#f0f0f0', border:'none', width:32, height:32, borderRadius:16, cursor:'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom:24 }}>
              {cart.map(c => (
                <div key={c.key} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'12px 0', borderBottom:'1px solid #f0f0f0' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{c.productName} <span style={{ color:'var(--b)' }}>x{c.qty}</span></div>
                    {c.mods.length > 0 && <p style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>{c.mods.join(', ')}</p>}
                  </div>
                  <div style={{ textAlign:'right', paddingLeft:16 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{fmt(c.unitPrice * c.qty)}</div>
                    <button onClick={() => setCart(prev => prev.filter(x => x.key !== c.key))} style={{ fontSize:11, color:'#cc0000', background:'none', border:'none', marginTop:4, cursor:'pointer', fontWeight:600 }}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background:'var(--bg)', borderRadius:16, padding:20, marginBottom:24 }}>
              <div className="fg" style={{ marginBottom:12 }}>
                <label style={{ fontSize:12, fontWeight:700, display:'block', marginBottom:6 }}>Zona de Domicilio</label>
                <select value={deliveryZone?.id || ''} onChange={e => setDeliveryZone(restaurant.delivery_zones.find(z => z.id === e.target.value))} style={{ width:'100%', padding:12, borderRadius:10, border:'1.5px solid #ddd' }}>
                  <option value="">Selecciona zona...</option>
                  {restaurant.delivery_zones?.map(z => <option key={z.id} value={z.id}>{z.name} ({z.price > 0 ? `+${fmt(z.price)}` : 'Gratis'})</option>)}
                </select>
              </div>

              <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="CÓDIGO CUPÓN" style={{ flex:1, padding:12, borderRadius:10, border:'1.5px solid #ddd', textTransform:'uppercase' }} />
                <button onClick={handleApplyCoupon} style={{ padding:'0 16px', borderRadius:10, border:'none', background:'#1a1a1a', color:'#fff', fontWeight:700, fontSize:13 }}>Aplicar</button>
              </div>
              {couponMsg && <p style={{ fontSize:11, marginTop:-12, marginBottom:10, color: couponMsg.includes('!') ? '#10b981' : '#cc0000', fontWeight:600 }}>{couponMsg}</p>}

              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, marginBottom:8 }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              {deliveryFee > 0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, marginBottom:8 }}><span>Envío</span><span>{fmt(deliveryFee)}</span></div>}
              {discountAmt > 0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, marginBottom:8, color:'#10b981', fontWeight:700 }}><span>Descuento</span><span>-{fmt(discountAmt)}</span></div>}
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:18, fontWeight:800, marginTop:12, borderTop:'2.5px solid #ddd', paddingTop:12 }}><span>Total</span><span style={{ color:'var(--b)' }}>{fmt(total)}</span></div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:24 }}>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nombre Completo *" style={{ padding:14, borderRadius:10, border:'1.5px solid #ddd' }} />
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} type="tel" placeholder="WhatsApp / Teléfono *" style={{ padding:14, borderRadius:10, border:'1.5px solid #ddd' }} />
              <input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="Dirección / Número de Mesa *" style={{ padding:14, borderRadius:10, border:'1.5px solid #ddd' }} />
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas (ej. sin cebolla, extra salsa)" style={{ padding:14, borderRadius:10, border:'1.5px solid #ddd', minHeight:80 }}></textarea>
            </div>

            <div style={{ marginBottom:28 }}>
              <label style={{ fontSize:13, fontWeight:700, display:'block', marginBottom:12 }}>Método de Pago</label>
              <div style={{ display:'flex', gap:10 }}>
                {['cash', 'transfer'].map(m => (
                  <button key={m} onClick={() => setPayMethod(m)} style={{ flex:1, padding:'14px', borderRadius:12, border:`2px solid ${payMethod === m ? 'var(--b)' : '#eee'}`, background: payMethod === m ? 'var(--blight)' : '#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                    {m === 'cash' ? '💵 Efectivo' : '🏦 Transferencia'}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={checkout} disabled={checkingOut} className="btn-primary" style={{ width:'100%', padding:18, fontSize:16 }}>
              {checkingOut ? <div className="spin" style={{ borderTopColor:'#fff' }}></div> : (payMethod === 'mercadopago' ? 'Pagar con Mercado Pago' : 'Confirmar Pedido')}
            </button>
          </div>
        </div>
      )}

      {/* ESTILO PARA OCULTAR SCROLLBARS */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
