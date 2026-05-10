'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

const CHECKLIST = [
  { id: 'will',          category: 'Legal',       title: 'Last Will & Testament',         desc: 'A signed, witnessed will directing asset distribution',             priority: 'critical' },
  { id: 'poa',           category: 'Legal',       title: 'Power of Attorney',              desc: 'Designates someone to make financial decisions if incapacitated',   priority: 'critical' },
  { id: 'healthcare',    category: 'Legal',       title: 'Healthcare Proxy / Living Will', desc: 'Specifies medical wishes and designates a healthcare agent',         priority: 'critical' },
  { id: 'trust',         category: 'Legal',       title: 'Trust (if applicable)',           desc: 'Can avoid probate and protect assets for beneficiaries',            priority: 'recommended' },
  { id: 'beneficiaries', category: 'Accounts',    title: 'Beneficiaries Designated',      desc: 'Primary beneficiaries named and allocations set',                   priority: 'critical' },
  { id: 'life_insurance',category: 'Insurance',   title: 'Life Insurance Policy',          desc: 'Adequate coverage to support dependents',                           priority: 'recommended' },
  { id: 'digital',       category: 'Digital',     title: 'Digital Asset Inventory',        desc: 'Crypto, online accounts, and passwords documented',                 priority: 'recommended' },
  { id: 'property',      category: 'Property',    title: 'Property Deeds / Titles',        desc: 'Real estate and vehicles have clear title documentation',           priority: 'recommended' },
  { id: 'tax',           category: 'Tax',         title: 'Recent Tax Returns',             desc: 'Last 3 years of tax returns stored and accessible',                 priority: 'optional' },
  { id: 'contacts',      category: 'People',      title: 'Estate Attorney on File',        desc: 'Attorney contact designated for account transfer',                  priority: 'recommended' },
  { id: 'funeral',       category: 'Personal',    title: 'End-of-Life Wishes',             desc: 'Funeral and personal preferences documented for family',            priority: 'optional' },
  { id: 'review',        category: 'Maintenance', title: 'Annual Review Scheduled',        desc: 'Estate plan reviewed and updated every 1-2 years',                 priority: 'recommended' },
]

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical:    { label: 'Critical',    color: '#ff6688' },
  recommended: { label: 'Recommended', color: '#ffaa00' },
  optional:    { label: 'Optional',    color: '#00aaff' },
}

export default function CompliancePage() {
  const [user, setUser]               = useState<any>(null)
  const [checked, setChecked]         = useState<Record<string, boolean>>({})
  const [actionSteps, setActionSteps] = useState<Record<string, { action: string; link: string }>>({})
  const [scanning, setScanning]       = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data } = await supabase.from('compliance_checks').select('*').eq('user_id', user.id)
      if (data) {
        const map: Record<string, boolean> = {}
        data.forEach((r: any) => { map[r.check_id] = r.completed })
        setChecked(map)
        if (data.length > 0) {
          const latest = data.reduce((a: any, b: any) => a.updated_at > b.updated_at ? a : b)
          setLastScanned(latest.updated_at)
        }
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function runScan() {
    setScanning(true)
    try {
      const res = await fetch('/api/compliance-scan', { method: 'POST' })
      const data = await res.json()
      if (data.completed)   setChecked(data.completed)
      if (data.actionSteps) setActionSteps(data.actionSteps)
      setLastScanned(new Date().toISOString())
    } catch {}
    setScanning(false)
  }

  async function toggleCheck(checkId: string) {
    const supabase = createClient()
    const newVal = !checked[checkId]
    setChecked(p => ({ ...p, [checkId]: newVal }))
    await supabase.from('compliance_checks').upsert({
      user_id: user.id, check_id: checkId, completed: newVal, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,check_id' })
  }

  const total        = CHECKLIST.length
  const done         = CHECKLIST.filter(i => checked[i.id]).length
  const critical     = CHECKLIST.filter(i => i.priority === 'critical')
  const criticalDone = critical.filter(i => checked[i.id]).length
  const score        = Math.round((done / total) * 100)

  const byCategory = CHECKLIST.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, typeof CHECKLIST>)

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color:'#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ height:'58px', flexShrink:0, background:'rgba(6,10,32,0.9)', borderBottom:'1px solid rgba(0,100,255,0.12)', display:'flex', alignItems:'center', padding:'0 28px', gap:'12px', backdropFilter:'blur(20px)' }}>
          <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'16px', fontWeight:700, color:'#fff' }}>Compliance</span>
          <span style={{ fontSize:'12px', color:'#6b7ab8' }}>Estate readiness checklist</span>
          <div style={{ flex:1 }} />
          {lastScanned && !scanning && (
            <span style={{ fontSize:'11px', color:'#3d4a7a' }}>Last scanned {new Date(lastScanned).toLocaleDateString()}</span>
          )}
          <button
            onClick={runScan}
            disabled={scanning}
            style={{ display:'flex', alignItems:'center', gap:'7px', padding:'7px 16px', background: scanning ? 'rgba(0,100,255,0.1)' : 'linear-gradient(135deg,#0055ff,#00aaff)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:700, cursor: scanning ? 'not-allowed' : 'pointer', opacity: scanning ? 0.8 : 1, whiteSpace:'nowrap' }}>
            {scanning
              ? <><span style={{ display:'inline-block', width:'12px', height:'12px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />Scanning...</>
              : '🤖 AI Scan Account'}
          </button>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        <div style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>

          {/* Scan banner */}
          {scanning && (
            <div style={{ background:'rgba(0,85,255,0.07)', border:'1px solid rgba(0,100,255,0.25)', borderRadius:'14px', padding:'16px 20px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'14px' }}>
              <span style={{ display:'inline-block', width:'16px', height:'16px', border:'2px solid rgba(0,170,255,0.3)', borderTopColor:'#00aaff', borderRadius:'50%', animation:'spin 0.8s linear infinite', flexShrink:0 }} />
              <div>
                <div style={{ fontSize:'14px', fontWeight:600, color:'#fff' }}>AI is scanning your account...</div>
                <div style={{ fontSize:'12px', color:'#6b7ab8', marginTop:'2px' }}>Reading your documents, beneficiaries, entities, and digital assets to auto-check your estate readiness.</div>
              </div>
            </div>
          )}

          {/* Score cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px', marginBottom:'24px' }}>
            <div style={{ background:'rgba(8,14,40,0.8)', border:'1px solid rgba(0,100,255,0.2)', borderRadius:'16px', padding:'24px', textAlign:'center' }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'48px', fontWeight:800, background: score >= 80 ? 'linear-gradient(135deg,#00cc66,#00aaff)' : score >= 50 ? 'linear-gradient(135deg,#ffaa00,#ff6688)' : 'linear-gradient(135deg,#ff6688,#ff4444)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                {score}%
              </div>
              <div style={{ fontSize:'12px', color:'#6b7ab8', fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', marginTop:'4px' }}>Estate Score</div>
            </div>
            <div style={{ background:'rgba(8,14,40,0.8)', border:'1px solid rgba(0,100,255,0.2)', borderRadius:'16px', padding:'24px', textAlign:'center' }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'48px', fontWeight:800, color:'#fff' }}>{done}<span style={{ fontSize:'24px', color:'#6b7ab8' }}>/{total}</span></div>
              <div style={{ fontSize:'12px', color:'#6b7ab8', fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', marginTop:'4px' }}>Items Complete</div>
            </div>
            <div style={{ background:'rgba(8,14,40,0.8)', border: criticalDone === critical.length ? '1px solid rgba(0,204,102,0.3)' : '1px solid rgba(255,102,136,0.3)', borderRadius:'16px', padding:'24px', textAlign:'center' }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'48px', fontWeight:800, color: criticalDone === critical.length ? '#00cc66' : '#ff6688' }}>
                {criticalDone}<span style={{ fontSize:'24px', color:'#6b7ab8' }}>/{critical.length}</span>
              </div>
              <div style={{ fontSize:'12px', color:'#6b7ab8', fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', marginTop:'4px' }}>Critical Items</div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ background:'rgba(8,14,40,0.8)', border:'1px solid rgba(0,100,255,0.15)', borderRadius:'14px', padding:'18px 20px', marginBottom:'24px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
              <span style={{ fontSize:'13px', fontWeight:600, color:'#fff' }}>Overall Progress</span>
              <span style={{ fontSize:'13px', color:'#6b7ab8' }}>{done} of {total} complete</span>
            </div>
            <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:'8px', height:'8px', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${score}%`, background:'linear-gradient(90deg,#0055ff,#00aaff)', borderRadius:'8px', transition:'width .5s ease' }} />
            </div>
          </div>

          {/* Checklist by category */}
          <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
            {Object.entries(byCategory).map(([category, items]) => (
              <div key={category} style={{ background:'rgba(8,14,40,0.8)', border:'1px solid rgba(0,100,255,0.15)', borderRadius:'16px', overflow:'hidden' }}>
                <div style={{ padding:'12px 20px', borderBottom:'1px solid rgba(0,100,255,0.1)', fontSize:'11px', fontWeight:700, color:'#6b7ab8', textTransform:'uppercase', letterSpacing:'.1em' }}>
                  {category}
                </div>
                {items.map((item, idx) => {
                  const isChecked = !!checked[item.id]
                  const pc       = PRIORITY_CONFIG[item.priority]
                  const step     = actionSteps[item.id]
                  const isLast   = idx === items.length - 1

                  return (
                    <div key={item.id}>
                      {/* Main row */}
                      <div
                        onClick={() => toggleCheck(item.id)}
                        style={{ display:'flex', alignItems:'flex-start', gap:'14px', padding:'16px 20px', borderBottom: !isChecked && step ? 'none' : isLast ? 'none' : '1px solid rgba(0,100,255,0.06)', cursor:'pointer', background: isChecked ? 'rgba(0,204,102,0.03)' : 'transparent', transition:'background .15s' }}>
                        {/* Checkbox */}
                        <div style={{ marginTop:'2px', width:'22px', height:'22px', borderRadius:'6px', border: isChecked ? '2px solid #00cc66' : '2px solid rgba(0,100,255,0.3)', background: isChecked ? '#00cc66' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .15s' }}>
                          {isChecked && <span style={{ color:'#fff', fontSize:'12px', fontWeight:700 }}>✓</span>}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                            <span style={{ fontSize:'14px', fontWeight:600, color: isChecked ? '#6b7ab8' : '#fff', textDecoration: isChecked ? 'line-through' : 'none' }}>{item.title}</span>
                            <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 7px', borderRadius:'20px', background:`${pc.color}18`, border:`1px solid ${pc.color}44`, color:pc.color }}>{pc.label}</span>
                            {isChecked && <span style={{ fontSize:'11px', color:'#00cc66', fontWeight:600 }}>✓ Detected</span>}
                          </div>
                          <div style={{ fontSize:'12px', color:'#4a5578', marginTop:'3px' }}>{item.desc}</div>
                        </div>
                      </div>

                      {/* AI action step */}
                      {!isChecked && step && (
                        <div style={{ margin:'0 16px 14px', padding:'12px 16px', background:'rgba(255,170,0,0.05)', border:'1px solid rgba(255,170,0,0.18)', borderRadius:'10px', display:'flex', alignItems:'flex-start', gap:'12px' }}>
                          <span style={{ fontSize:'15px', flexShrink:0 }}>💡</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:'11px', fontWeight:700, color:'#ffaa00', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'.06em' }}>What to do</div>
                            <div style={{ fontSize:'13px', color:'#c8cfe8', lineHeight:1.6 }}>{step.action}</div>
                          </div>
                          <Link href={step.link} onClick={e => e.stopPropagation()} style={{ flexShrink:0, padding:'6px 14px', background:'rgba(255,170,0,0.12)', border:'1px solid rgba(255,170,0,0.3)', borderRadius:'7px', color:'#ffaa00', fontSize:'12px', fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>
                            Fix it →
                          </Link>
                        </div>
                      )}

                      {!isChecked && step && !isLast && <div style={{ height:'1px', background:'rgba(0,100,255,0.06)' }} />}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* First scan prompt */}
          {Object.keys(actionSteps).length === 0 && !scanning && (
            <div style={{ marginTop:'24px', padding:'24px', background:'rgba(0,85,255,0.04)', border:'1px dashed rgba(0,100,255,0.22)', borderRadius:'14px', textAlign:'center' }}>
              <div style={{ fontSize:'28px', marginBottom:'10px' }}>🤖</div>
              <div style={{ fontSize:'14px', fontWeight:600, color:'#fff', marginBottom:'6px' }}>Let AI scan your account</div>
              <div style={{ fontSize:'13px', color:'#6b7ab8', marginBottom:'16px', maxWidth:'400px', margin:'0 auto 16px' }}>
                Automatically checks your documents, beneficiaries, entities, and digital assets — then tells you exactly what's missing and how to fix it.
              </div>
              <button onClick={runScan} style={{ padding:'10px 24px', background:'linear-gradient(135deg,#0055ff,#00aaff)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>
                Run AI Scan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
