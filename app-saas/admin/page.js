'use client'
// app/admin/page.js — Login con Supabase Auth
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const router = useRouter()

  async function handleAuth(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setError('✅ Revisa tu email para confirmar tu cuenta.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/admin/dashboard')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'40px 36px', width:'100%', maxWidth:380, boxShadow:'0 20px 60px rgba(0,0,0,.3)' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🍽️</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#1a1a2e' }}>RestauranteSaaS</div>
          <div style={{ fontSize:13, color:'#888', marginTop:4 }}>
            {isSignup ? 'Crea tu cuenta de restaurante' : 'Panel de administración'}
          </div>
        </div>

        <form onSubmit={handleAuth} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:5 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="admin@tubraseria.com"
              style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #e0e0e0', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box', transition:'border .2s' }}
              onFocus={e => e.target.style.borderColor = '#E85D04'}
              onBlur={e => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:5 }}>Contraseña</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #e0e0e0', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box' }}
              onFocus={e => e.target.style.borderColor = '#E85D04'}
              onBlur={e => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>

          {error && (
            <div style={{ fontSize:12, padding:'8px 12px', borderRadius:8, background: error.startsWith('✅') ? '#e8fdf5' : '#fff0f0', color: error.startsWith('✅') ? '#10b981' : '#c00' }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{ width:'100%', padding:'13px', background:'#E85D04', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', marginTop:4, opacity: loading ? .7 : 1 }}
          >
            {loading ? '⏳ Procesando…' : isSignup ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </form>

        <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#888' }}>
          {isSignup ? '¿Ya tienes cuenta?' : '¿Primera vez?'}{' '}
          <button
            onClick={() => { setIsSignup(!isSignup); setError('') }}
            style={{ background:'none', border:'none', color:'#E85D04', fontWeight:600, cursor:'pointer', fontSize:13 }}
          >
            {isSignup ? 'Iniciar sesión' : 'Registrarse'}
          </button>
        </div>
      </div>
    </div>
  )
}
