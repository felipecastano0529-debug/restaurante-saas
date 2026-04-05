'use client'
import { useState, useEffect } from 'react'
import { getCategories, upsertCategory, upsertProduct, deleteProduct } from '@/lib/supabase'

export default function AdminMenuEditor({ restaurantId }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState(null)

  useEffect(() => {
    loadMenu()
  }, [restaurantId])

  async function loadMenu() {
    try {
      const data = await getCategories(restaurantId)
      setCategories(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddCategory() {
    const name = prompt('Nombre de la nueva categoría:')
    if (!name) return
    const newCat = await upsertCategory({ 
      restaurant_id: restaurantId, 
      name, 
      sort_order: categories.length + 1 
    })
    setCategories([...categories, { ...newCat, products: [] }])
  }

  async function handleUpdateProduct(e) {
    e.preventDefault()
    const { data: updated } = await upsertProduct(editingProduct)
    setCategories(categories.map(c => ({
      ...c,
      products: c.products.map(p => p.id === editingProduct.id ? editingProduct : p)
    })))
    setEditingProduct(null)
  }

  if (loading) return <div style={{ padding:40, textAlign:'center' }}>Cargando editor...</div>

  return (
    <div style={{ padding:'0 20px 40px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 style={{ fontSize:20, fontWeight:800 }}>Gestión de Menú</h2>
        <button onClick={handleAddCategory} style={{ padding:'10px 16px', background:'#1a1a2e', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' }}>
          + Nueva Categoría
        </button>
      </div>

      {categories.map(cat => (
        <div key={cat.id} style={{ marginBottom:30, background:'#fff', borderRadius:16, overflow:'hidden', border:'1px solid #eee' }}>
          <div style={{ background:'#f8f9fa', padding:'12px 20px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:800, fontSize:15 }}>{cat.name}</span>
            <button style={{ color:'#888', background:'none', border:'none', fontSize:12, cursor:'pointer' }}>Editar orden</button>
          </div>
          
          <div style={{ padding:'12px 20px' }}>
            {cat.products?.map(prod => (
              <div key={prod.id} style={{ display:'flex', gap:16, padding:'12px 0', borderBottom:'1px solid #f0f0f0', alignItems:'center' }}>
                <div style={{ width:50, height:50, borderRadius:8, background:'#eee', overflow:'hidden' }}>
                    {prod.image_url && <img src={prod.image_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{prod.name}</div>
                  <div style={{ fontSize:13, color:'#E85D04', fontWeight:600 }}>${prod.base_price.toLocaleString()}</div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button 
                    onClick={() => setEditingProduct({...prod})}
                    style={{ padding:'6px 12px', borderRadius:8, background:'#fff8e1', color:'#f59e0b', border:'1px solid #fcf2d1', fontSize:12, fontWeight:700, cursor:'pointer' }}
                  >
                    ✏️ Editar
                  </button>
                  <button 
                    onClick={() => { if(confirm('¿Borrar producto?')) deleteProduct(prod.id).then(loadMenu) }}
                    style={{ padding:'6px 12px', borderRadius:8, background:'#fff0f0', color:'#c00', border:'1px solid #ffebeb', fontSize:12, fontWeight:700, cursor:'pointer' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
            <button 
              onClick={() => setEditingProduct({ name:'', base_price:0, category_id: cat.id, restaurant_id: restaurantId })}
              style={{ width:'100%', padding:'10px', marginTop:12, border:'1.5px dashed #ccc', borderRadius:10, background:'none', color:'#888', fontSize:13, fontWeight:600, cursor:'pointer' }}
            >
              + Añadir Producto a {cat.name}
            </button>
          </div>
        </div>
      ))}

      {/* Modal de edición de producto */}
      {editingProduct && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:10000 }}>
          <form onSubmit={handleUpdateProduct} style={{ background:'#fff', padding:32, borderRadius:20, width:'100%', maxWidth:400 }}>
            <h3 style={{ marginBottom:20, fontWeight:800 }}>{editingProduct.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <input 
                placeholder="Nombre" value={editingProduct.name} 
                onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                style={{ width:'100%', padding:'12px', borderRadius:10, border:'1.5px solid #eee' }} required
              />
              <input 
                type="number" placeholder="Precio" value={editingProduct.base_price} 
                onChange={e => setEditingProduct({...editingProduct, base_price: parseInt(e.target.value)})}
                style={{ width:'100%', padding:'12px', borderRadius:10, border:'1.5px solid #eee' }} required
              />
              <input 
                placeholder="URL Imagen (Unsplash, etc)" value={editingProduct.image_url || ''} 
                onChange={e => setEditingProduct({...editingProduct, image_url: e.target.value})}
                style={{ width:'100%', padding:'12px', borderRadius:10, border:'1.5px solid #eee' }}
              />
              <div style={{ display:'flex', gap:12, marginTop:10 }}>
                <button type="button" onClick={() => setEditingProduct(null)} style={{ flex:1, padding:14, borderRadius:12, border:'none', background:'#eee', fontWeight:700 }}>Cancelar</button>
                <button type="submit" style={{ flex:1, padding:14, borderRadius:12, border:'none', background:'#E85D04', color:'#fff', fontWeight:700 }}>Guardar</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
