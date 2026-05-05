'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AIPageInsight from '@/components/AIPageInsight'

const CHECKLIST = [
  { id: 'will', category: 'Legal', title: 'Last Will & Testament', desc: 'A signed, witnessed will directing asset distribution', priority: 'critical' },
  { id: 'poa', category: 'Legal', title: 'Power of Attorney', desc: 'Designates someone to make financial decisions if incapacitated', priority: 'critical' },
  { id: 'healthcare', category: 'Legal', title: 'Healthcare Proxy / Living Will', desc: 'Specifies medical wishes and designates a healthcare agent', priority: 'critical' },
  { id: 'trust', category: 'Legal', title: 'Trust (if applicable)', desc: 'Can avoid probate and protect assets for beneficiaries', priority: 'recommended' },
  { id: 'beneficiaries', category: 'Accounts', title: 'Beneficiaries Updated', desc: 'Life insurance, 401k, IRA beneficiaries match your wishes', priority: 'critical' },
  { id: 'life_insurance', category: 'Insurance', title: 'Life Insurance Policy', desc: 'Adequate coverage to support dependents', priority: 'recommended' },
  { id: 'digital', category: 'Digital', title: 'Digital Asset Inventory', desc: 'Crypto, online accounts, and passwords documented', priority: 'recommended' },
  { id: 'property', category: 'Property', title: 'Property Deeds / Titles', desc: 'All real estate and vehicles have clear title documentation', priority: 'recommended' },
  { id: 'tax', category: 'Tax', title: 'Recent Tax Returns', desc: 'Last 3 years of tax returns stored and accessible', priority: 'optional' },
  { id: 'contacts', category: 'People', title: 'Key Contacts Listed', desc: 'Attorney, accountant, financial advisor contact info on file', priority: 'recommended' },
  { id: 'funeral', category: 'Personal', title: 'Funeral / End-of-Life Wishes', desc: 'Preferences documented for family clarity', priority: 'optional' },
  { id: 'review', category: 'Maintenance', title: 'Annual Review Scheduled', desc: 'Estate plan reviewed and updated every 1-2 years', priority: 'recommended' },
]

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#ff6688' },
  recommended: { label: 'Recommended', color: '#ffaa00' },
  optional: { label: 'Optional', color: '#00aaff' },
}

export default function CompliancePage() {
  const [user, setUser] = useState<any>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      // Load saved compliance state
      const { data } = await supabase.from('compliance_checks').select('*').eq('user_id', user.id)
      if (data) {
        const map: Record<string, boolean> = {}
        data.forEach((row: any) => { map[row.check_id] = row.completed })
        setChecked(map)
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function toggleCheck(checkId: string) {
    const supabase = createClient()
    const newVal = !checked[checkId]
    setChecked(p => ({ ...p, [checkId]: newVal }))
    // Upsert
    await supabase.from('compliance_checks').upsert({
      user_id: user.id, check_id: checkId, completed: newVal, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,check_id' })
  }

  const total = CHECKLIST.length
  const done = CHECKLIST.filter(i => checked[i.id]).length
  const critical = CHECKLIST.filter(i => i.priority === 'critical')
  const criticalDone = critical.filter(i => checked[i.id]).length
  const score = Math.round((done / total) * 100)

  const byCategory = CHECKLIST.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, typeof CHECKLIST>)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Compliance</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8', marginLeft: '10px' }}>Estate readiness checklist</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <AIPageInsight page="compliance" />

        {/* Score cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
          <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '48px', fontWeight: 800, background: score >= 80 ? 'linear-gradient(135deg,#00cc66,#00aaff)' : score >= 50 ? 'linear-gradient(135deg,#ffaa00,#ff6688)' : 'linear-gradient(135deg,#ff6688,#ff4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {score}%
            </div>
            <div style={{ fontSize: '12px', color: '#6b7ab8', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', marginTop: '4px' }}>Estate Score</div>
          </div>
          <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '48px', fontWeight: 800, color: '#fff' }}>{done}<span style={{ fontSize: '24px', color: '#6b7ab8' }}>/{total}</span></div>
            <div style={{ fontSize: '12px', color: '#6b7ab8', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', marginTop: '4px' }}>Items Complete</div>
          </div>
          <div style={{ background: 'rgba(8,14,40,0.8)', border: criticalDone === critical.length ? '1px solid rgba(0,204,102,0.3)' : '1px solid rgba(255,102,136,0.3)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '48px', fontWeight: 800, color: criticalDone === critical.length ? '#00cc66' : '#ff6688' }}>
              {criticalDone}<span style={{ fontSize: '24px', color: '#6b7ab8' }}>/{critical.length}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#6b7ab8', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', marginTop: '4px' }}>Critical Items</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '14px', padding: '20px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Overall Progress</span>
            <span style={{ fontSize: '13px', color: '#6b7ab8' }}>{done} of {total} complete</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${score}%`, background: 'linear-gradient(90deg,#0055ff,#00aaff)', borderRadius: '8px', transition: 'width .5s ease' }} />
          </div>
        </div>

        {/* Checklist by category */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {Object.entries(byCategory).map(([category, items]) => (
            <div key={category} style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,100,255,0.1)', fontSize: '12px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                {category}
              </div>
              {items.map(item => {
                const isChecked = !!checked[item.id]
                const pc = PRIORITY_CONFIG[item.priority]
                return (
                  <div key={item.id} onClick={() => toggleCheck(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderBottom: '1px solid rgba(0,100,255,0.06)', cursor: 'pointer', transition: 'background .15s', background: isChecked ? 'rgba(0,204,102,0.03)' : 'transparent' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: isChecked ? '2px solid #00cc66' : '2px solid rgba(0,100,255,0.3)', background: isChecked ? '#00cc66' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                      {isChecked && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: isChecked ? '#6b7ab8' : '#fff', textDecoration: isChecked ? 'line-through' : 'none' }}>{item.title}</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: `${pc.color}18`, border: `1px solid ${pc.color}44`, color: pc.color }}>{pc.label}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#4a5578', marginTop: '2px' }}>{item.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  )
}
