'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const NETWORK_ATTORNEYS = [
  { initials: 'PS', name: 'Priya Sharma, Esq.', title: 'Estate & Trust Law', firm: 'Dallas, TX', rating: 5.0, reviews: 38, tags: ['ILITs', 'CRTs', 'Medicaid'], color: '#6644ff' },
  { initials: 'JC', name: 'James Chen, Esq.', title: 'Estate Planning Attorney', firm: 'Chen Law Group, Houston TX', rating: 4.8, reviews: 61, tags: ['Wills & Trusts', 'Business Succession', 'Tax Planning'], color: '#00cc66' },
  { initials: 'AR', name: 'Amanda Rodriguez, Esq.', title: 'Elder Law & Estate Planning', firm: 'Rodriguez & Partners, Austin TX', rating: 4.9, reviews: 44, tags: ['Elder Law', 'Medicaid', 'Special Needs Trusts'], color: '#ffaa00' },
  { initials: 'MW', name: 'Marcus Webb, Esq.', title: 'Estate Planning Attorney', firm: 'Webb & Associates, Austin TX', rating: 4.9, reviews: 52, tags: ['Wills & Trusts', 'Tax Planning', 'Probate', 'Texas Licensed'], color: '#0055ff' },
]

export default function AttorneyPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([
    { from: 'attorney', text: "Tyler, I've reviewed your Power of Attorney draft. A few changes needed — I'll send a revised version by end of day. Looking good overall." },
    { from: 'user', text: 'Thanks Marcus. Also can we schedule a call about the healthcare directive?' },
    { from: 'attorney', text: 'Absolutely. I have availability Thursday May 7 at 2pm or Friday May 8 at 10am. Which works better?' },
  ])
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

  function sendMessage() {
    if (!message.trim()) return
    setMessages(m => [...m, { from: 'user', text: message }])
    setMessage('')
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: '12px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Attorney Connect</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8' }}>Licensed estate attorneys</span>
          <div style={{ flex: 1 }} />
          <button style={{ padding: '7px 14px', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#6b7ab8', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Filter by State</button>
          <button style={{ padding: '7px 16px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>+ Invite My Attorney</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* Connected attorney */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: '12px' }}>Your Attorney</div>
            <div style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,170,255,0.3)', borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(20px)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#0055ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>MW</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>Marcus Webb, Esq.</div>
                  <div style={{ fontSize: '13px', color: '#6b7ab8', marginBottom: '8px' }}>Estate Planning Attorney · Webb & Associates, Austin TX</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['Wills & Trusts', 'Tax Planning', 'Probate', 'Texas Licensed'].map(t => (
                      <span key={t} style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '6px', background: 'rgba(0,100,255,0.12)', border: '1px solid rgba(0,100,255,0.2)', color: '#00aaff' }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', color: '#ffaa00', marginBottom: '6px' }}>★★★★★ 4.9</div>
                  <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '8px', background: 'rgba(0,204,102,0.1)', border: '1px solid rgba(0,204,102,0.3)', color: '#00cc66' }}>Connected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Message thread */}
          <div style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.16)', borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(20px)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.12em' }}>Messages — Marcus Webb</span>
              <span style={{ fontSize: '12px', color: '#00aaff', cursor: 'pointer', fontWeight: 500 }}>View all →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
              {messages.map((m, i) => (
                <div key={i} style={{ maxWidth: '80%', padding: '12px 16px', borderRadius: m.from === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.from === 'user' ? 'rgba(255,255,255,0.04)' : 'rgba(0,50,180,0.15)', border: m.from === 'user' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,100,255,0.2)', color: m.from === 'user' ? '#6b7ab8' : '#e8eaf6', fontSize: '13px', lineHeight: '1.6', alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
                  {m.text}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Message Marcus..."
                style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '10px', padding: '10px 14px', color: '#e8eaf6', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif' }} />
              <button onClick={sendMessage} style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>

          {/* Upcoming meetings */}
          <div style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.16)', borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(20px)', marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.12em' }}>Upcoming Meetings</span>
              <span style={{ fontSize: '12px', color: '#00aaff', cursor: 'pointer', fontWeight: 500 }}>Schedule →</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'rgba(0,80,255,0.07)', border: '1px solid rgba(0,100,255,0.16)', borderRadius: '12px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(0,100,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px' }}>📅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Call — Healthcare Directive Review</div>
                <div style={{ fontSize: '12px', color: '#6b7ab8', marginTop: '2px' }}>Thu May 7 · 2:00 PM CST · 30 min · Zoom</div>
              </div>
              <button style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(0,100,255,0.25)', borderRadius: '8px', color: '#00aaff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Join →</button>
            </div>
          </div>

          {/* Network attorneys */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: '14px' }}>Network Attorneys</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {NETWORK_ATTORNEYS.filter(a => a.initials !== 'MW').map(a => (
                <div key={a.initials} style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.14)', borderRadius: '14px', padding: '18px 20px', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{a.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{a.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7ab8', marginBottom: '8px' }}>{a.title} · {a.firm}</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {a.tags.map(t => <span key={t} style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: 'rgba(0,100,255,0.1)', border: '1px solid rgba(0,100,255,0.18)', color: '#00aaff' }}>{t}</span>)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '12px', color: '#ffaa00', marginBottom: '8px' }}>{'★'.repeat(Math.floor(a.rating))} {a.rating}</div>
                    <button style={{ padding: '6px 16px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Connect</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
