'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

type Rec = { id: string; severity: string; title: string; description: string; actionPath: string }

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ff6688',
  high: '#ffaa00',
  medium: '#00aaff',
}

// Generic fallback suggestions
const GENERIC_SUGGESTIONS = [
  'What documents should I have in my estate plan?',
  'How do I reduce estate taxes?',
  'What happens if I die without a will?',
  'What is a revocable living trust?',
  'Who should I name as my executor?',
]

export default function AIPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [recs, setRecs] = useState<Rec[]>([])
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      // Fetch personalized recommendations
      try {
        const res = await fetch('/api/recommendations')
        const data = await res.json()
        if (data.recommendations) setRecs(data.recommendations)
        if (data.profile) setProfile(data.profile)
      } catch (e) {
        console.error('Failed to load recommendations:', e)
      }

      setLoading(false)
    }
    load()
  }, [router])

  // Set personalized welcome message after profile loads
  useEffect(() => {
    if (loading) return
    const name = profile?.full_name?.split(' ')[0] || null
    const criticalCount = recs.filter(r => r.severity === 'critical').length
    const highCount = recs.filter(r => r.severity === 'high').length

    let greeting = `Hi${name ? ` ${name}` : ''} — I'm your Axion estate planning advisor.`
    if (criticalCount > 0) {
      greeting += ` I've reviewed your estate and found **${criticalCount} critical issue${criticalCount > 1 ? 's' : ''}** that need attention.`
    } else if (highCount > 0) {
      greeting += ` I've reviewed your estate and have **${highCount} important recommendation${highCount > 1 ? 's' : ''}** for you.`
    } else if (recs.length === 0) {
      greeting += ` Your estate plan looks solid. I'm here if you have any questions or want to explore planning strategies.`
    } else {
      greeting += ` I've reviewed your estate and have some suggestions to help protect your family.`
    }
    greeting += ` What would you like to discuss?`

    setMessages([{ role: 'ai', text: greeting }])
  }, [loading, profile, recs])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, thinking])

  async function sendMessage(text: string) {
    if (!text.trim() || thinking) return
    const newMessages = [...messages, { role: 'user', text }]
    setMessages(newMessages)
    setInput('')
    setThinking(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      setMessages(m => [...m, {
        role: 'ai',
        text: data.text || `Error: ${data.error || 'Unknown error — status ' + res.status}`,
      }])
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Connection error. Please try again.' }])
    }
    setThinking(false)
  }

  // Build personalized quick suggestions from their gaps
  const quickSuggestions = recs.length > 0
    ? [
        ...recs.slice(0, 3).map(r => {
          if (r.id === 'no_will') return 'What happens if I die without a will?'
          if (r.id === 'no_guardian') return 'How do I name a guardian for my children?'
          if (r.id === 'no_trust') return 'Do I need a trust for my estate?'
          if (r.id === 'no_poa') return 'What is a Power of Attorney and why do I need one?'
          if (r.id === 'no_healthcare') return 'What should my healthcare directive say?'
          if (r.id === 'no_beneficiaries') return 'How do I name beneficiaries on my accounts?'
          if (r.id === 'federal_estate_tax') return 'How can I reduce my estate tax exposure?'
          if (r.id === 'state_estate_tax') return `What are ${profile?.state} estate tax rules?`
          if (r.id === 'no_trust') return 'How does a revocable trust work?'
          return r.title
        }),
        'What is a revocable living trust?',
        'How do I find an estate attorney?',
      ].slice(0, 5)
    : GENERIC_SUGGESTIONS

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>
      Loading...
    </div>
  )

  const criticalRecs = recs.filter(r => r.severity === 'critical')
  const highRecs = recs.filter(r => r.severity === 'high')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', backdropFilter: 'blur(20px)', gap: '12px' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>AI Advisor</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8' }}>Personalized · Powered by Claude · Not legal advice</span>
          {recs.length > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              {criticalRecs.length > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'rgba(255,102,136,0.12)', border: '1px solid rgba(255,102,136,0.3)', color: '#ff6688' }}>
                  {criticalRecs.length} Critical
                </span>
              )}
              {highRecs.length > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.3)', color: '#ffaa00' }}>
                  {highRecs.length} High Priority
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Chat area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 28px', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: '10px' }}>
                  {m.role === 'ai' && (
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2L4 19h16L12 2z"/></svg>
                    </div>
                  )}
                  <div style={{ maxWidth: '75%', padding: '12px 16px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.role === 'user' ? 'rgba(255,255,255,0.05)' : 'rgba(0,70,200,0.12)', border: m.role === 'user' ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,100,255,0.18)', color: m.role === 'user' ? '#6b7ab8' : '#e8eaf6', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                    {m.text.replace(/\*\*(.*?)\*\*/g, '$1')}
                  </div>
                </div>
              ))}
              {thinking && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2L4 19h16L12 2z"/></svg>
                  </div>
                  <div style={{ padding: '12px 16px', borderRadius: '14px 14px 14px 4px', background: 'rgba(0,70,200,0.12)', border: '1px solid rgba(0,100,255,0.18)', color: '#6b7ab8', fontSize: '13px' }}>
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick suggestions — shown until conversation starts */}
            {messages.length <= 1 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {quickSuggestions.map(s => (
                  <button key={s} onClick={() => sendMessage(s)} style={{ padding: '7px 13px', background: 'rgba(0,80,255,0.08)', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '20px', color: '#6b7ab8', fontSize: '12px', cursor: 'pointer', transition: 'all .15s' }}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                placeholder="Ask anything about your estate plan..."
                disabled={thinking}
                style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '12px', padding: '12px 16px', color: '#e8eaf6', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif', opacity: thinking ? 0.6 : 1 }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={thinking || !input.trim()}
                style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', cursor: thinking ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: thinking || !input.trim() ? 0.5 : 1 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#3d4a7a', textAlign: 'center', marginTop: '8px' }}>
              Powered by Claude AI · Personalized to your estate · Not legal advice
            </div>
          </div>

          {/* Right panel — priority gaps */}
          {recs.length > 0 && (
            <div style={{ width: '280px', flexShrink: 0, borderLeft: '1px solid rgba(0,100,255,0.1)', padding: '20px 18px', overflowY: 'auto', background: 'rgba(4,8,28,0.5)' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: '14px' }}>Your Priority Gaps</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recs.map(rec => {
                  const color = SEVERITY_COLOR[rec.severity] || '#6b7ab8'
                  return (
                    <button
                      key={rec.id}
                      onClick={() => sendMessage(`Tell me more about: ${rec.title}`)}
                      style={{ textAlign: 'left', padding: '12px 14px', background: `${color}0d`, border: `1px solid ${color}30`, borderRadius: '12px', cursor: 'pointer', transition: 'all .15s' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.06em' }}>{rec.severity}</span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#e8eaf6', lineHeight: '1.4', marginBottom: '4px' }}>{rec.title}</div>
                      <div style={{ fontSize: '11px', color: '#6b7ab8', lineHeight: '1.5' }}>{rec.description.slice(0, 80)}...</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
