'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
 import AIPageInsight from '@/components/AIPageInsight'
import Link from 'next/link'

const MANUAL_CATEGORIES = ['Real Estate', 'Investment Account', 'Bank Account', 'Crypto', 'Business', 'Life Insurance', 'Other']
const ICONS: Record<string, string> = {
  'Real Estate': '🏠', 'Investment Account': '📈', 'Bank Account': '🏦',
  'Crypto': '₿', 'Business': '🏢', 'Life Insurance': '🛡️', 'Other': '💼',
  'banking': '🏦', 'investment': '📈', 'crypto': '₿', 'real_estate': '🏠',
}
const CAT_COLORS: Record<string, string> = {
  'Real Estate': '#0055ff', 'real_estate': '#0055ff',
  'Investment Account': '#0099ff', 'investment': '#0099ff',
  'Bank Account': '#6644ff', 'banking': '#6644ff',
  'Crypto': '#f7931a', 'crypto': '#f7931a',
  'Business': '#00cc66', 'Life Insurance': '#ff6688', 'Other': '#6b7ab8',
}

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export default function NetWorthPage() {
  const [user, setUser] = useState<any>(null)
  const [assets, setAssets] = useState<any[]>([])
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([])
  const [accountBalances, setAccountBalances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'Real Estate', value: '', institution: '' })
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const load = useCallback(async (userId: string) => {
    const supabase = createClient()
    const [{ data: a }, { data: c }, { data: b }] = await Promise.all([
      supabase.from('assets').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('connected_accounts').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('account_balances').select('*').eq('user_id', userId),
    ])
    setAssets(a ?? [])
    setConnectedAccounts(c ?? [])
    setAccountBalances(b ?? [])
  }, [])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await load(user.id)
      setLoading(false)
    }
    init()
  }, [router, load])

  async function addAsset(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('assets').insert({
      user_id: user.id,
      name: form.name,
      category: form.category,
      value: parseFloat(form.value) || 0,
      institution: form.institution,
    })
    setForm({ name: '', category: 'Real Estate', value: '', institution: '' })
    setShowForm(false)
    await load(user.id)
    setSaving(false)
  }

  async function deleteAsset(id: string) {
    const supabase = createClient()
    await supabase.from('assets').delete().eq('id', id)
    await load(user.id)
  }

  // Totals
  const manualTotal = assets.reduce((s, a) => s + (a.value || 0), 0)
  const connectedTotal = accountBalances.reduce((s, b) => s + (b.current_balance || 0), 0)
  const grandTotal = manualTotal + connectedTotal

  // Manual by category
  const manualByCategory = MANUAL_CATEGORIES.map(cat => ({
    cat, icon: ICONS[cat], color: CAT_COLORS[cat] || '#6b7ab8',
    items: assets.filter(a => a.category === cat),
    total: assets.filter(a => a.category === cat).reduce((s, a) => s + (a.value || 0), 0),
  })).filter(g => g.items.length > 0)

  // Connected account groups
  const connectedGroups = connectedAccounts.map(conn => ({
    conn,
    balances: accountBalances.filter(b => b.connected_account_id === conn.id),
    total: accountBalances.filter(b => b.connected_account_id === conn.id).reduce((s, b) => s + (b.current_balance || 0), 0),
  }))

  // Allocation for the bar chart (combined)
  const allocMap: Record<string, number> = {}
  assets.forEach(a => { allocMap[a.category] = (allocMap[a.category] || 0) + (a.value || 0) })
  const CAT_MAP: Record<string, string> = { banking: 'Bank Account', investment: 'Investment Account', crypto: 'Crypto', real_estate: 'Real Estate' }
  connectedAccounts.forEach(conn => {
    const label = CAT_MAP[conn.category] || conn.category
    const t = accountBalances.filter(b => b.connected_account_id === conn.id).reduce((s, b) => s + (b.current_balance || 0), 0)
    allocMap[label] = (allocMap[label] || 0) + t
  })
  const allocation = Object.entries(allocMap).sort(([, a]: any, [, b]: any) => b - a)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: '16px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Net Worth</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8' }}>Your total estate value</span>
          <div style={{ flex: 1 }} />
          <Link href="/integrations" style={{ padding: '7px 14px', background: 'transparent', border: '1px solid rgba(0,170,255,0.3)', borderRadius: '8px', color: '#00aaff', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>⚡ Connect Accounts</Link>
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '7px 16px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>+ Add Asset</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          <AIPageInsight page="networth" />

          {/* Grand total hero */}
          <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '20px', padding: '28px 32px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Total Estate Value</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '52px', fontWeight: 800, background: 'linear-gradient(135deg,#fff,#00aaff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
                  {fmt(grandTotal)}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7ab8', marginTop: '8px' }}>
                  {assets.length} manual asset{assets.length !== 1 ? 's' : ''} · {connectedAccounts.length} connected account{connectedAccounts.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Mini breakdown */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {manualTotal > 0 && (
                  <div style={{ background: 'rgba(0,100,255,0.08)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '12px', padding: '12px 18px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#6b7ab8', fontWeight: 600, marginBottom: '4px' }}>Manual</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', fontFamily: "'Space Grotesk',sans-serif" }}>{fmt(manualTotal)}</div>
                  </div>
                )}
                {connectedTotal > 0 && (
                  <div style={{ background: 'rgba(0,200,80,0.07)', border: '1px solid rgba(0,200,80,0.2)', borderRadius: '12px', padding: '12px 18px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#00cc66', fontWeight: 600, marginBottom: '4px' }}>● Live</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', fontFamily: "'Space Grotesk',sans-serif" }}>{fmt(connectedTotal)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Allocation bars */}
            {allocation.length > 0 && (
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {allocation.map(([cat, val]: any) => {
                  const pct = grandTotal > 0 ? (val / grandTotal) * 100 : 0
                  const color = CAT_COLORS[cat] || '#6b7ab8'
                  return (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <div style={{ width: '160px', fontSize: '12px', color: '#6b7ab8', flexShrink: 0 }}>{cat}</div>
                      <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width .6s ease' }} />
                      </div>
                      <div style={{ width: '100px', fontSize: '13px', fontWeight: 700, color: '#e8eaf6', textAlign: 'right', flexShrink: 0 }}>{fmt(val)}</div>
                      <div style={{ width: '40px', fontSize: '11px', color: '#6b7ab8', textAlign: 'right', flexShrink: 0 }}>{pct.toFixed(0)}%</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Add form */}
          {showForm && (
            <div style={{ background: 'rgba(8,14,40,0.9)', border: '1px solid rgba(0,100,255,0.25)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '18px' }}>Add Asset</h3>
              <form onSubmit={addAsset} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }}>
                    {MANUAL_CATEGORIES.map(c => <option key={c} style={{ background: '#060818' }}>{c}</option>)}
                  </select>
                </div>

                {/* Crypto redirect — show instead of the rest of the form */}
                {form.category === 'Crypto' ? (
                  <div style={{ gridColumn: '1/-1' }}>
                    <div style={{ background: 'rgba(247,147,26,0.07)', border: '1px solid rgba(247,147,26,0.25)', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '28px' }}>₿</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '3px' }}>Use live crypto prices</div>
                        <div style={{ fontSize: '12px', color: '#6b7ab8', lineHeight: '1.5' }}>
                          Add your holdings on the Integrations page — prices update automatically from CoinGecko so your estate value stays accurate.
                        </div>
                      </div>
                      <Link href="/integrations" style={{ padding: '9px 18px', background: 'rgba(247,147,26,0.15)', border: '1px solid rgba(247,147,26,0.35)', borderRadius: '8px', color: '#f7931a', fontSize: '13px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        Add Crypto →
                      </Link>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                      <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#6b7ab8', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {[
                      { label: 'Asset Name', key: 'name', placeholder: form.category === 'Real Estate' ? 'e.g. 123 Oak Drive' : form.category === 'Investment Account' ? 'e.g. Fidelity IRA' : 'e.g. Primary Checking', type: 'text' },
                      { label: 'Current Value ($)', key: 'value', placeholder: '500000', type: 'number' },
                      { label: 'Institution (optional)', key: 'institution', placeholder: 'e.g. Chase, Fidelity', type: 'text' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>{f.label}</label>
                        <input type={f.type} required={f.key === 'name' || f.key === 'value'} placeholder={f.placeholder} value={(form as any)[f.key]}
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                          style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
                      </div>
                    ))}
                    <div style={{ gridColumn: '1/-1', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#6b7ab8', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                      <button type="submit" disabled={saving} style={{ padding: '9px 22px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                        {saving ? 'Saving...' : 'Add Asset'}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          )}

          {/* Connected accounts section */}
          {connectedGroups.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00cc66', display: 'inline-block', boxShadow: '0 0 6px #00cc66' }} />
                Live Connected Accounts
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {connectedGroups.map(({ conn, balances, total }) => {
                  const color = CAT_COLORS[conn.category] || '#6b7ab8'
                  return (
                    <div key={conn.id} style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '14px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderBottom: balances.length > 0 ? '1px solid rgba(0,100,255,0.1)' : 'none' }}>
                        <span style={{ fontSize: '20px' }}>{ICONS[conn.category] || '🔗'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{conn.institution_name}</div>
                          <div style={{ fontSize: '11px', color: '#00cc66', marginTop: '1px' }}>● Live · {conn.integration_type === 'plaid' ? 'Plaid' : 'Manual'}</div>
                        </div>
                        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '18px', fontWeight: 800, color: color }}>{fmt(total)}</div>
                      </div>
                      {balances.map(bal => (
                        <div key={bal.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px', borderBottom: '1px solid rgba(0,100,255,0.06)' }}>
                          <div>
                            <span style={{ fontSize: '13px', color: '#e8eaf6' }}>{bal.account_name}</span>
                            <span style={{ fontSize: '11px', color: '#3d4a7a', marginLeft: '8px', textTransform: 'capitalize' }}>{bal.account_type}</span>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{fmt(bal.current_balance)}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Manual assets section */}
          {assets.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: '10px' }}>Manual Assets</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {manualByCategory.map(g => (
                  <div key={g.cat} style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '14px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(0,100,255,0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>{g.icon}</span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{g.cat}</span>
                      </div>
                      <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: g.color }}>{fmt(g.total)}</span>
                    </div>
                    {g.items.map(asset => (
                      <div key={asset.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 18px', borderBottom: '1px solid rgba(0,100,255,0.06)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', color: '#e8eaf6', fontWeight: 500 }}>{asset.name}</div>
                          {asset.institution && <div style={{ fontSize: '11px', color: '#6b7ab8', marginTop: '2px' }}>{asset.institution}</div>}
                        </div>
                        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '14px', fontWeight: 700, color: '#e8eaf6' }}>{fmt(asset.value || 0)}</div>
                        <button onClick={() => deleteAsset(asset.id)} style={{ padding: '4px 9px', background: 'transparent', border: '1px solid rgba(255,60,60,0.2)', borderRadius: '6px', color: '#ff6666', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {grandTotal === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7ab8' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📈</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>No assets tracked yet</div>
              <div style={{ fontSize: '13px', maxWidth: '340px', margin: '0 auto', lineHeight: '1.7' }}>
                Connect your bank or brokerage for live balances, or add assets manually.
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
                <Link href="/integrations" style={{ padding: '9px 20px', background: 'rgba(0,170,255,0.12)', border: '1px solid rgba(0,170,255,0.3)', borderRadius: '10px', color: '#00aaff', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>⚡ Connect Accounts</Link>
                <button onClick={() => setShowForm(true)} style={{ padding: '9px 20px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>+ Add Manually</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
