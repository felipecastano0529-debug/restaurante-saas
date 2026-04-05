'use client'
// app/admin/dashboard/page.js — Dashboard protegido por auth
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminDashboard from '@/components/AdminDashboard'

export default function DashboardPage() {
  const [restaurantId, setRestaurantId] = useState(null)
  const [loading, setLoading]           = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Verificar sesión
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/admin'); return }

      // Obtener el restaurante del usuario
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', session.user.id)
        .single()

      if (!restaurant) {
        // Primer login: mostrar onboarding para crear el restaurante
        router.push('/admin/onboarding')
        return
      }

      setRestaurantId(restaurant.id)
      setLoading(false)
    })
  }, [router])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/admin')
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}>
      <div className="spin" style={{ width:40, height:40 }} />
    </div>
  )

  return (
    <div>
      <div style={{ background:'#fff', padding:'8px 20px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'flex-end' }}>
        <button onClick={signOut} style={{ fontSize:12, color:'#888', background:'none', border:'none', cursor:'pointer' }}>
          Cerrar sesión
        </button>
      </div>
      <AdminDashboard restaurantId={restaurantId} />
    </div>
  )
}
