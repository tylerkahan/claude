'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#03040d', padding: '24px',
      backgroundImage: 'linear-gradient(rgba(0,85,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,85,255,0.04) 1px, transparent 1px)',
      backgroundSize: '56px 56px'
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '28px', fontWeight: 800, color: '#fff', letterSpacing: '.07em' }}>
            AXION
          </div>
          <div style={{ fontSize: '13px', color: '#6b7ab8', marginTop: '4px' }}>Estate Planning Platform</div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)',
          borderRadius: '24px', padding: '40px 36px',
          backdropFilter: 'blur(28px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)'
        }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7ab8', marginBottom: '32px' }}>
            {isSignUp ? 'Start organizing your estate today.' : 'Sign in to access your estate.'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '12px 14px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)',
                  borderRadius: '10px', color: '#e8eaf6', fontSize: '14px', outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Password
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••••"
                style={{
                  width: '100%', padding: '12px 14px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)',
                  borderRadius: '10px', color: '#e8eaf6', fontSize: '14px', outline: 'none'
                }}
              />
            </div>

            {error && <div style={{ fontSize: '13px', color: '#ff6666', padding: '10px 14px', background: 'rgba(255,60,60,0.08)', borderRadius: '8px', border: '1px solid rgba(255,60,60,0.2)' }}>{error}</div>}
            {message && <div style={{ fontSize: '13px', color: '#00cc66', padding: '10px 14px', background: 'rgba(0,200,80,0.08)', borderRadius: '8px', border: '1px solid rgba(0,200,80,0.2)' }}>{message}</div>}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg, #0055ff, #00aaff)',
              border: 'none', borderRadius: '12px', color: '#fff',
              fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 0 24px rgba(0,120,255,0.4)',
              marginTop: '4px', opacity: loading ? 0.7 : 1
            }}>
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#6b7ab8' }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }}
              style={{ background: 'none', border: 'none', color: '#00aaff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
