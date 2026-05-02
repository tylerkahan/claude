'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const TIMELINE_ITEMS = [
  { status: 'done', title: 'Account Created', desc: 'Joined Axion Estate Platform', date: 'Today' },
  { status: 'active', title: 'Estate Organization', desc: 'Upload documents, add assets & beneficiaries', date: 'In progress' },
  { status: 'future', title: 'Review with Attorney', desc: 'Have a licensed estate attorney review your plan', date: 'Recommended' },
  { status: 'future', title: 'Execute Documents', desc: 'Sign will, trust, and POA with witnesses and notary', date: 'Upcoming' },
  { status: 'future', title: 'Fund the Trust', desc: 'Transfer assets into your trust if applicable', date: 'After execution' },
  { status: 'future', title: 'Notify Beneficiaries', desc: 'Inform key people of their roles and where documents are stored', date: 'After execution' },
  { status: 'future', title: 'Annual Review', desc: 'Review and update your estate plan every 1–2 years', date: 'Recurring' },
]

const STATUS_STYLES: Record<string, { dot: string; shadow: string }> = {
  done: { dot: '#00cc66', shadow: 'rgba(0,200,80,0.4)' },
  active: { dot: '#00aaff', shadow: 'rgba(0,170,255,0.5)' },
  warn: { dot: '#ffaa00', shadow: 'rgba(255,170,0,0.4)' },
  future: { dot: 'transparent', shadow: 'none' },
}

export default function TimelinePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Estate Timeline</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8', marginLeft: '10px' }}>Your estate planning journey</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px' }}>
          <div style={{ maxWidth: '680px' }}>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '32px' }}>
              {[{ color: '#00cc66', label: 'Completed' }, { color: '#00aaff', label: 'In Progress' }, { color: '#3d4a7a', label: 'Upcoming' }].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6b7ab8' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div style={{ position: 'relative', paddingLeft: '32px' }}>
              {/* Vertical line */}
              <div style={{ position: 'absolute', left: '9px', top: '8px', bottom: '8px', width: '2px', background: 'rgba(0,100,255,0.15)', borderRadius: '1px' }} />

              {TIMELINE_ITEMS.map((item, i) => {
                const s = STATUS_STYLES[item.status]
                return (
                  <div key={i} style={{ position: 'relative', marginBottom: '28px' }}>
                    {/* Dot */}
                    <div style={{ position: 'absolute', left: '-27px', top: '4px', width: '16px', height: '16px', borderRadius: '50%', background: item.status === 'future' ? 'var(--bg, #03040d)' : s.dot, border: item.status === 'future' ? '2px solid #3d4a7a' : `2px solid ${s.dot}`, boxShadow: item.status !== 'future' ? `0 0 10px ${s.shadow}` : 'none' }} />

                    <div style={{ background: 'rgba(8,14,40,0.7)', border: `1px solid ${item.status === 'active' ? 'rgba(0,170,255,0.3)' : item.status === 'done' ? 'rgba(0,204,102,0.2)' : 'rgba(0,100,255,0.12)'}`, borderRadius: '14px', padding: '18px 20px', backdropFilter: 'blur(20px)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: item.status === 'future' ? '#6b7ab8' : '#fff' }}>{item.title}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: item.status === 'done' ? '#00cc66' : item.status === 'active' ? '#00aaff' : '#3d4a7a' }}>{item.date}</div>
                      </div>
                      <div style={{ fontSize: '13px', color: item.status === 'future' ? '#3d4a7a' : '#6b7ab8' }}>{item.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
