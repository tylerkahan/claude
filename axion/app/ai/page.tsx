'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const SUGGESTIONS = [
  'What documents should I have in my estate plan?',
  'How do I reduce estate taxes?',
  'What happens if I die without a will?',
  'Who should I name as my executor?',
  'What is a revocable living trust?',
]

export default function AIPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([
    { role: 'ai', text: "Hi, I'm Axion AI — your estate planning advisor. I can answer questions about wills, trusts, beneficiaries, taxes, and more. What would you like to know?" }
  ])
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
      setLoading(false)
    }
    load()
  }, [router])

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
        body: JSON.stringify({ messages: newMessages })
      })
      const data = await res.json()
      if (data.text) {
        setMessages(m => [...m, { role: 'ai', text: data.text }])
      } else {
        setMessages(m => [...m, { role: 'ai', text: 'Sorry, I had trouble responding. Please try again.' }])
      }
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Connection error. Please try again.' }])
    }
    setThinking(false)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>AI Advisor</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8', marginLeft: '10px' }}>Powered by Claude · Not legal advice</span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 28px', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: '10px' }}>
                {m.role === 'ai' && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2L4 19h16L12 2z"/></svg>
                  </div>
                )}
                <div style={{ maxWidth: '75%', padding: '12px 16px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.role === 'user' ? 'rgba(255,255,255,0.05)' : 'rgba(0,70,200,0.12)', border: m.role === 'user' ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,100,255,0.18)', color: m.role === 'user' ? '#6b7ab8' : '#e8eaf6', fontSize: '13px', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2L4 19h16L12 2z"/></svg>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '14px 14px 14px 4px', background: 'rgba(0,70,200,0.12)', border: '1px solid rgba(0,100,255,0.18)', color: '#6b7ab8', fontSize: '13px' }}>
                  <span style={{ animation: 'pulse 1s infinite' }}>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)} style={{ padding: '7px 12px', background: 'rgba(0,80,255,0.08)', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '20px', color: '#6b7ab8', fontSize: '12px', cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)} placeholder="Ask anything about estate planning..." disabled={thinking}
              style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '12px', padding: '12px 16px', color: '#e8eaf6', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif', opacity: thinking ? 0.6 : 1 }} />
            <button onClick={() => sendMessage(input)} disabled={thinking || !input.trim()} style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', cursor: thinking ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: thinking || !input.trim() ? 0.5 : 1 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <div style={{ fontSize: '11px', color: '#3d4a7a', textAlign: 'center', marginTop: '8px' }}>Powered by Claude AI · For informational purposes only · Not legal advice</div>
        </div>
      </div>
    </div>
  )
}
