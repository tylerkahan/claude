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

const INITIAL_MESSAGES = [
  { role: 'ai', text: "Hi, I'm Axion AI — your estate planning advisor. I can answer questions about wills, trusts, beneficiaries, taxes, and more. What would you like to know?" }
]

export default function AIPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || thinking) return
    setMessages(m => [...m, { role: 'user', text }])
    setInput('')
    setThinking(true)
    await new Promise(r => setTimeout(r, 1200))
    setMessages(m => [...m, { role: 'ai', text: getAIResponse(text) }])
    setThinking(false)
  }

  function getAIResponse(q: string): string {
    const lower = q.toLowerCase()
    if (lower.includes('will') && lower.includes('without')) return "Dying without a will is called dying \"intestate.\" Your state's intestacy laws decide who gets your assets — typically a spouse, then children, then other relatives. This process goes through probate court and can take 1–3 years. It also means you have no control over who receives what, and courts decide guardianship for any minor children. A will costs a few hundred dollars and takes this control back entirely."
    if (lower.includes('trust')) return "A revocable living trust lets you transfer assets into a trust while you're alive, avoiding probate when you die. Unlike a will, it's private and typically settles in weeks rather than years. You remain in control as the trustee while alive. It's especially useful if you own property in multiple states, have a large estate, or want to protect assets for minor children. An irrevocable trust offers stronger asset protection and estate tax benefits, but you give up control."
    if (lower.includes('tax') || lower.includes('estate tax')) return "The federal estate tax only applies to estates over $13.6M (2024). However, some states have lower thresholds — as low as $1M. Common strategies to reduce exposure include: gifting up to $18K/year per person tax-free, using an irrevocable life insurance trust (ILIT), charitable giving, and GRATs (Grantor Retained Annuity Trusts). I'd recommend connecting with an estate attorney to review your specific situation."
    if (lower.includes('executor')) return "Your executor (called a personal representative in some states) manages your estate after you die — paying debts, filing final tax returns, and distributing assets to beneficiaries. Choose someone who is: organized and trustworthy, willing to take on the responsibility, ideally lives nearby, and gets along with your beneficiaries. Many people name a spouse or adult child, but a professional executor (attorney or bank trust department) works well for complex estates."
    if (lower.includes('document') || lower.includes('need')) return "A complete estate plan typically includes: (1) Last Will & Testament — directs asset distribution, (2) Durable Power of Attorney — financial decisions if incapacitated, (3) Healthcare Proxy/Living Will — medical decisions, (4) Revocable Trust — optional but avoids probate, (5) Beneficiary designations on life insurance, 401k, and IRA accounts. These designations override your will, so keep them updated. Upload any existing documents to your Vault for safekeeping."
    return "That's a great estate planning question. The answer depends on your specific situation — state of residence, family structure, and asset types all matter. I'd recommend reviewing your compliance checklist in Axion to identify any gaps, and connecting with an estate attorney for personalized advice. Is there a specific aspect of estate planning I can help clarify?"
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>AI Advisor</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8', marginLeft: '10px' }}>Ask anything about estate planning</span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 28px', overflow: 'hidden' }}>
          {/* Chat messages */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', paddingRight: '4px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {m.role === 'ai' && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: '10px', marginTop: '2px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2L4 19h16L12 2z"/></svg>
                  </div>
                )}
                <div style={{ maxWidth: '75%', padding: '12px 16px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.role === 'user' ? 'rgba(255,255,255,0.05)' : 'rgba(0,70,200,0.12)', border: m.role === 'user' ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,100,255,0.18)', color: m.role === 'user' ? '#6b7ab8' : '#e8eaf6', fontSize: '13px', lineHeight: '1.6' }}>
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2L4 19h16L12 2z"/></svg>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '14px 14px 14px 4px', background: 'rgba(0,70,200,0.12)', border: '1px solid rgba(0,100,255,0.18)', color: '#6b7ab8', fontSize: '13px' }}>Thinking...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)} style={{ padding: '7px 12px', background: 'rgba(0,80,255,0.08)', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '20px', color: '#6b7ab8', fontSize: '12px', cursor: 'pointer', transition: 'all .15s' }}>{s}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage(input)} placeholder="Ask anything about estate planning..."
              style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '12px', padding: '12px 16px', color: '#e8eaf6', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif' }} />
            <button onClick={() => sendMessage(input)} style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <div style={{ fontSize: '11px', color: '#3d4a7a', textAlign: 'center', marginTop: '8px' }}>AI responses are for informational purposes only — not legal advice. Consult a licensed attorney for your specific situation.</div>
        </div>
      </div>
    </div>
  )
}
