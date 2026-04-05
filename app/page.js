// app/page.js — Homepage del SaaS (Landing pública)
export default function HomePage() {
  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, fontFamily:"'Inter',system-ui,sans-serif", color:'#fff', textAlign:'center' }}>
      <div style={{ fontSize:56, marginBottom:16 }}>🍽️</div>
      <h1 style={{ fontSize:36, fontWeight:800, margin:'0 0 12px', background:'linear-gradient(135deg,#ff6b35,#f7931e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
        RestauranteSaaS
      </h1>
      <p style={{ fontSize:16, opacity:.8, maxWidth:420, lineHeight:1.6, margin:'0 0 32px' }}>
        La plataforma todo-en-uno para que tu restaurante tome pedidos online,
        procese pagos y automatice respuestas por WhatsApp.
      </p>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
        <a href="/admin" style={{ padding:'14px 28px', background:'#E85D04', color:'#fff', borderRadius:12, fontWeight:700, fontSize:15, textDecoration:'none', display:'inline-block' }}>
          🔑 Panel Admin
        </a>
        <a href="/la-braseria" style={{ padding:'14px 28px', background:'rgba(255,255,255,.1)', color:'#fff', borderRadius:12, fontWeight:700, fontSize:15, textDecoration:'none', border:'1px solid rgba(255,255,255,.2)', display:'inline-block' }}>
          🍔 Ver Menú Demo
        </a>
      </div>
      <div style={{ marginTop:48, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:16, maxWidth:600, width:'100%' }}>
        {[
          ['🗄️', 'Supabase', 'Base de datos real y Auth'],
          ['💳', 'Mercado Pago', 'Pagos reales integrados'],
          ['🤖', 'UChat', 'WhatsApp Bot automático'],
          ['⚡', 'Vercel', 'Deploy en segundos'],
        ].map(([icon, title, desc]) => (
          <div key={title} style={{ background:'rgba(255,255,255,.07)', borderRadius:12, padding:'16px 12px', border:'1px solid rgba(255,255,255,.1)' }}>
            <div style={{ fontSize:24, marginBottom:6 }}>{icon}</div>
            <div style={{ fontWeight:700, fontSize:14 }}>{title}</div>
            <div style={{ fontSize:12, opacity:.6, marginTop:3 }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
