'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const SCENARIOS = [
  { id: 'standard', title: 'Standard Distribution', desc: 'Assets distributed per your will with probate', probate: true, timline: '12–24 months', cost: '3–5% of estate' },
  { id: 'trust', title: 'Revocable Living Trust', desc: 'Assets pass directly to beneficiaries, avoiding probate', probate: false, timline: '4–8 weeks', cost: '<1% of estate' },
  { id: 'spouse', title: 'Surviving Spouse First', desc: 'Everything passes to spouse, then to children', probate: false, timline: 'Immediate', cost: 'Minimal' },
]

export default function SimulatorPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState('trust')
  const [estateValue, setEstateValue] = useState(0)
  const [beneficiaries, setBeneficiaries] = useState<any[]>([])
  const [splits, setSplits] = useState<Record<string, number>>({})
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [{ data: assets }, { data: bens }] = await Promise.all([
        supabase.from('assets').select('value').eq('user_id', user.id),
        supabase.from('beneficiaries').select('*').eq('user_id', user.id)
      ])
      const total = assets?.reduce((s, a) => s + (a.value || 0), 0) ?? 0
      setEstateValue(total)
      setBeneficiaries(bens ?? [])
      // Default equal split
      if (bens && bens.length > 0) {
        const eq = Math.floor(100 / bens.length)
        const s: Record<string, number> = {}
        bens.forEach((b, i) => { s[b.id] = i === bens.length - 1 ? 100 - eq * (bens.length - 1) : eq })
        setSplits(s)
      }
      setLoading(false)
    }
    load()
  }, [router])

  const scenario = SCENARIOS.find(s => s.id === selected)!
  const totalSplit = Object.values(splits).reduce((a, b) => a + b, 0)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Inheritance Simulator</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8', marginLeft: '10px' }}>Model how your estate will be distributed</span>
          <span style={{ marginLeft: '10px', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', background: 'rgba(0,170,255,0.15)', border: '1px solid rgba(0,170,255,0.3)', color: '#00aaff' }}>New</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

            {/* Left: Scenario + splits */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.16)', borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '14px' }}>Distribution Scenario</div>
                {SCENARIOS.map(s => (
                  <div key={s.id} onClick={() => setSelected(s.id)} style={{ padding: '14px 16px', borderRadius: '12px', border: `1px solid ${selected === s.id ? 'rgba(0,170,255,0.4)' : 'rgba(0,100,255,0.14)'}`, background: selected === s.id ? 'rgba(0,120,255,0.08)' : 'transparent', cursor: 'pointer', marginBottom: '8px', transition: 'all .15s' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '3px' }}>{s.title}</div>
                    <div style={{ fontSize: '12px', color: '#6b7ab8' }}>{s.desc}</div>
                  </div>
                ))}
              </div>

              {/* Beneficiary splits */}
              {beneficiaries.length > 0 ? (
                <div style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.16)', borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em' }}>Allocation %</span>
                    <span style={{ fontSize: '11px', color: totalSplit === 100 ? '#00cc66' : '#ff6688', fontWeight: 700 }}>{totalSplit}% allocated</span>
                  </div>
                  {beneficiaries.map(b => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', color: '#e8eaf6', flex: 1 }}>{b.full_name}</div>
                      <input type="number" min="0" max="100" value={splits[b.id] || 0} onChange={e => setSplits(p => ({ ...p, [b.id]: parseInt(e.target.value) || 0 }))}
                        style={{ width: '60px', padding: '6px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#e8eaf6', fontSize: '13px', textAlign: 'center', outline: 'none' }} />
                      <span style={{ fontSize: '12px', color: '#6b7ab8' }}>%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.14)', borderRadius: '16px', padding: '20px', textAlign: 'center', color: '#6b7ab8', fontSize: '13px' }}>
                  Add beneficiaries to simulate inheritance splits
                </div>
              )}
            </div>

            {/* Right: Results */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.16)', borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '16px' }}>Scenario Results</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '36px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>${estateValue.toLocaleString()}</div>
                <div style={{ fontSize: '13px', color: '#6b7ab8', marginBottom: '20px' }}>Total estate to distribute</div>
                {[
                  { label: 'Probate Required', value: scenario.probate ? 'Yes' : 'No', color: scenario.probate ? '#ff6688' : '#00cc66' },
                  { label: 'Settlement Time', value: scenario.timline, color: '#00aaff' },
                  { label: 'Transfer Costs', value: scenario.cost, color: '#ffaa00' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(0,100,255,0.08)' }}>
                    <span style={{ fontSize: '13px', color: '#6b7ab8' }}>{r.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: r.color }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Per-beneficiary breakdown */}
              {beneficiaries.length > 0 && (
                <div style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.16)', borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '14px' }}>Each Beneficiary Receives</div>
                  {beneficiaries.map(b => {
                    const pct = splits[b.id] || 0
                    const amount = Math.round((pct / 100) * estateValue)
                    return (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#0055ff,#00aaff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {b.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>{b.full_name}</div>
                          <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '4px' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#0055ff,#00aaff)', borderRadius: '2px' }} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '14px', fontWeight: 700, color: '#fff' }}>${amount.toLocaleString()}</div>
                          <div style={{ fontSize: '11px', color: '#6b7ab8' }}>{pct}%</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
