'use client'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'

export default function SessionGuard() {
  const { showWarning, reset } = useSessionTimeout()
  if (!showWarning) return null
  return (
    <div
      onClick={reset}
      style={{ position:'fixed', inset:0, background:'rgba(3,4,13,0.85)', backdropFilter:'blur(8px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:'rgba(8,14,40,0.95)', border:'1px solid rgba(255,170,0,0.35)', borderRadius:'20px', padding:'36px 40px', maxWidth:'420px', width:'90%', textAlign:'center', position:'relative', cursor:'default' }}
      >
        <button
          onClick={reset}
          aria-label="Dismiss"
          style={{ position:'absolute', top:'12px', right:'14px', background:'transparent', border:'none', color:'#6b7ab8', fontSize:'22px', cursor:'pointer', lineHeight:1, padding:'4px 8px' }}
        >×</button>
        <div style={{ fontSize:'36px', marginBottom:'14px' }}>⏰</div>
        <div style={{ fontSize:'18px', fontWeight:700, color:'#fff', marginBottom:'8px' }}>Session expiring soon</div>
        <div style={{ fontSize:'14px', color:'#9aa3c8', marginBottom:'24px', lineHeight:1.6 }}>You'll be signed out in 2 minutes due to inactivity. Click anywhere or press the button to stay signed in.</div>
        <button onClick={reset} style={{ padding:'11px 28px', background:'linear-gradient(135deg,#0055ff,#00aaff)', border:'none', borderRadius:'10px', color:'#fff', fontSize:'14px', fontWeight:700, cursor:'pointer' }}>
          Stay Signed In
        </button>
      </div>
    </div>
  )
}
