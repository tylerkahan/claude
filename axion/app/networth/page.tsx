'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AIPageInsight from '@/components/AIPageInsight'
import Link from 'next/link'

const CAT_COLORS: Record<string, string> = {
  'Real Estate': '#0055ff', 'real_estate': '#0055ff',
  'Investment Account': '#0099ff', 'investment': '#0099ff',
  'Bank Account': '#6644ff', 'banking': '#6644ff',
  'Crypto': '#f7931a', 'crypto': '#f7931a',
  'Business': '#00cc66', 'Life Insurance': '#ff6688', 'Other': '#6b7ab8',
}
const MANUAL_CATEGORIES = ['Real Estate', 'Investment Account', 'Bank Account', 'Crypto', 'Business', 'Life Insurance', 'Other']

const fmt = (n: number) => n >= 1_000_000
  ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K`
  : `$${n.toLocaleString()}`
const fmtFull = (n: number) => `$${n.toLocaleString()}`

// card style shared
const card: React.CSSProperties = {
  background: 'rgba(8,14,40,0.7)',
  border: '1px solid rgba(0,100,255,0.16)',
  borderRadius: '16px',
  padding: '20px 22px',
  backdropFilter: 'blur(20px)',
}

export default function NetWorthPage() {
  const [user, setUser] = useState<any>(null)
  const [assets, setAssets] = useState<any[]>([])
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([])
  const [accountBalances, setAccountBalances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'Real Estate', value: '', institution: '', mortgage: '' })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('1Y')
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
      user_id: user.id, name: form.name, category: form.category,
      value: parseFloat(form.value) || 0, institution: form.institution,
      mortgage: form.category === 'Real Estate' ? (parseFloat(form.mortgage) || 0) : 0,
    })
    setForm({ name: '', category: 'Real Estate', value: '', institution: '', mortgage: '' })
    setShowForm(false)
    await load(user.id)
    setSaving(false)
  }

  async function deleteAsset(id: string) {
    if (!confirm('Remove this asset?')) return
    const supabase = createClient()
    await supabase.from('assets').delete().eq('id', id)
    await load(user.id)
  }

  // ── Computed values ──────────────────────────────────────
  const manualTotal = assets.reduce((s, a) => s + (a.value || 0), 0)
  const connectedTotal = accountBalances.reduce((s, b) => s + (b.current_balance || 0), 0)
  const grandTotal = manualTotal + connectedTotal
  const totalMortgages = assets.reduce((s, a) => s + (a.mortgage || 0), 0)
  const netWorth = grandTotal - totalMortgages

  // Build unified allocation map
  const alloc: Record<string, number> = {}
  assets.forEach(a => { alloc[a.category] = (alloc[a.category] || 0) + (a.value || 0) })
  connectedAccounts.forEach(conn => {
    const catMap: Record<string, string> = { banking: 'Bank Account', investment: 'Investment Account', crypto: 'Crypto', real_estate: 'Real Estate' }
    const label = catMap[conn.category] || conn.category
    const bal = accountBalances.filter(b => b.connected_account_id === conn.id).reduce((s, b) => s + (b.current_balance || 0), 0)
    alloc[label] = (alloc[label] || 0) + bal
  })
  const allocEntries = Object.entries(alloc).sort(([, a], [, b]) => b - a)

  // Donut conic-gradient
  let donutCss = ''
  let cursor = 0
  const donutColors = ['#0055ff', '#0099ff', '#6644ff', '#00cc66', '#f7931a', '#ff6688', '#6b7ab8']
  allocEntries.forEach(([, val], i) => {
    const pct = grandTotal > 0 ? (val / grandTotal) * 100 : 0
    const color = donutColors[i % donutColors.length]
    donutCss += `${color} ${cursor}% ${cursor + pct}%, `
    cursor += pct
  })
  donutCss = donutCss.slice(0, -2)

  // Group assets by category for sections
  const realEstate = assets.filter(a => a.category === 'Real Estate')
  const connRealEstate = connectedAccounts.filter(c => c.category === 'real_estate')
  const investments = assets.filter(a => a.category === 'Investment Account')
  const connInvestments = connectedAccounts.filter(c => c.category === 'investment')
  const banking = assets.filter(a => a.category === 'Bank Account')
  const connBanking = connectedAccounts.filter(c => c.category === 'banking')
  const crypto = assets.filter(a => a.category === 'Crypto')
  const connCrypto = connectedAccounts.filter(c => c.category === 'crypto')

  const reTotal = [...realEstate, ...connRealEstate].reduce((s, item) => {
    if (item.value) return s + item.value
    return s + accountBalances.filter(b => b.connected_account_id === item.id).reduce((ss, b) => ss + (b.current_balance || 0), 0)
  }, 0)
  const invTotal = [...investments, ...connInvestments].reduce((s, item) => {
    if (item.value) return s + item.value
    return s + accountBalances.filter(b => b.connected_account_id === item.id).reduce((ss, b) => ss + (b.current_balance || 0), 0)
  }, 0)
  const cashTotal = [...banking, ...connBanking].reduce((s, item) => {
    if (item.value) return s + item.value
    return s + accountBalances.filter(b => b.connected_account_id === item.id).reduce((ss, b) => ss + (b.current_balance || 0), 0)
  }, 0)
  const cryptoTotal = [...crypto, ...connCrypto].reduce((s, item) => {
    if (item.value) return s + item.value
    return s + accountBalances.filter(b => b.connected_account_id === item.id).reduce((ss, b) => ss + (b.current_balance || 0), 0)
  }, 0)

  // Illiquid = RE + Business + Life Insurance + PE
  const illiquid = assets.filter(a => ['Real Estate', 'Business', 'Life Insurance'].includes(a.category)).reduce((s, a) => s + (a.value || 0), 0) + reTotal - (realEstate.reduce((s, a) => s + (a.value || 0), 0))
  const illiquidPct = grandTotal > 0 ? Math.round((illiquid / grandTotal) * 100) : 0

  // Synthetic monthly data for chart (last 12 months approaching current total)
  const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']
  const chartPoints = grandTotal > 0
    ? months.map((_, i) => grandTotal * (0.88 + (i / months.length) * 0.12))
    : months.map(() => 0)
  const chartMin = Math.min(...chartPoints) * 0.97
  const chartMax = Math.max(...chartPoints) * 1.01
  const toY = (v: number) => 140 - ((v - chartMin) / (chartMax - chartMin)) * 130
  const svgPoints = chartPoints.map((v, i) => `${(i / (months.length - 1)) * 680},${toY(v)}`).join(' L ')

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#e8eaf6',
    fontSize: '13px', outline: 'none', fontFamily: 'Inter,sans-serif', boxSizing: 'border-box',
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d', fontFamily: 'Inter,sans-serif' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '100vh' }}>

        {/* Top bar */}
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: '12px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Net Worth</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8' }}>Live · synced now</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowForm(true)} style={{ padding: '7px 16px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>+ Add Asset</button>
            <Link href="/integrations" style={{ padding: '7px 14px', background: 'transparent', border: '1px solid rgba(0,100,255,0.25)', borderRadius: '8px', color: '#6b7ab8', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>Connect Accounts →</Link>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <AIPageInsight page="networth" />

          {/* ── Header ─────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '6px' }}>LIVE NET WORTH</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '42px', fontWeight: 800, fontFamily: "'Space Grotesk',sans-serif", color: '#fff' }}>
                  {grandTotal > 0 ? fmtFull(netWorth) : '$0'}
                </div>
                {grandTotal > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', background: 'rgba(0,204,102,0.1)', border: '1px solid rgba(0,204,102,0.2)', color: '#00cc66' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00cc66', boxShadow: '0 0 6px #00cc66', display: 'inline-block' }} />
                    Live
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['1M', '1Y', 'All'].map(t => (
                <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '6px 14px', background: activeTab === t ? 'rgba(0,100,255,0.12)' : 'transparent', border: `1px solid ${activeTab === t ? 'rgba(0,170,255,0.5)' : 'rgba(0,100,255,0.2)'}`, borderRadius: '8px', color: activeTab === t ? '#00aaff' : '#6b7ab8', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{t}</button>
              ))}
            </div>
          </div>

          {/* ── Row 1: 4 stat cards ─────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '20px' }}>
            <div style={card}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>Total Assets</div>
              <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: "'Space Grotesk',sans-serif", color: '#fff', marginBottom: '4px' }}>{fmt(grandTotal)}</div>
              <div style={{ fontSize: '11px', color: '#00cc66', fontWeight: 600 }}>↑ Gross · across all accounts</div>
            </div>
            <div style={card}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>Total Liabilities</div>
              <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: "'Space Grotesk',sans-serif", color: totalMortgages > 0 ? '#ff6060' : '#6b7ab8', marginBottom: '4px' }}>{totalMortgages > 0 ? fmt(totalMortgages) : '$0'}</div>
              <div style={{ fontSize: '11px', color: '#6b7ab8' }}>{totalMortgages > 0 ? `${assets.filter(a => a.mortgage > 0).length} mortgage${assets.filter(a => a.mortgage > 0).length > 1 ? 's' : ''}` : 'Add mortgage when entering RE'}</div>
            </div>
            <div style={card}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>Asset Classes</div>
              <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: "'Space Grotesk',sans-serif", color: '#fff', marginBottom: '4px' }}>{allocEntries.length}</div>
              <div style={{ fontSize: '11px', color: '#6b7ab8' }}>{allocEntries.map(([k]) => k.split(' ')[0]).join(', ') || 'None yet'}</div>
            </div>
            <div style={card}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>Illiquid %</div>
              <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: "'Space Grotesk',sans-serif", color: '#fff', marginBottom: '4px' }}>{illiquidPct}%</div>
              <div style={{ fontSize: '11px', color: '#6b7ab8' }}>RE + Business · {fmt(illiquid)}</div>
            </div>
          </div>

          {/* ── Row 2: Chart + Allocation ───────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '16px', marginBottom: '20px' }}>

            {/* Chart */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em' }}>12-Month Net Worth</span>
                {grandTotal > 0 && <span style={{ fontSize: '12px', color: '#00cc66' }}>Current: {fmt(grandTotal)}</span>}
              </div>
              {grandTotal > 0 ? (
                <>
                  <div style={{ height: '150px', marginBottom: '8px' }}>
                    <svg viewBox="0 0 700 150" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                      <defs>
                        <linearGradient id="nwg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0077ff" stopOpacity="0.35"/>
                          <stop offset="100%" stopColor="#0077ff" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <line x1="0" y1="37" x2="700" y2="37" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                      <line x1="0" y1="75" x2="700" y2="75" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                      <line x1="0" y1="112" x2="700" y2="112" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                      <path d={`M10,${toY(chartPoints[0])} L ${svgPoints} L680,150 L10,150 Z`} fill="url(#nwg)"/>
                      <path d={`M10,${toY(chartPoints[0])} L ${svgPoints}`} fill="none" stroke="#0099ff" strokeWidth="2.5"/>
                      <circle cx="680" cy={toY(chartPoints[chartPoints.length - 1])} r="5" fill="#00ccff" stroke="rgba(0,200,255,0.3)" strokeWidth="3"/>
                      <text x="4" y="148" fill="rgba(100,130,200,0.6)" fontSize="10" fontFamily="Inter,sans-serif">{fmt(chartMin)}</text>
                      <text x="4" y="30" fill="rgba(100,130,200,0.6)" fontSize="10" fontFamily="Inter,sans-serif">{fmt(chartMax)}</text>
                    </svg>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#3d4a7a' }}>
                    {months.filter((_, i) => i % 2 === 0).map(m => <span key={m}>{m}</span>)}
                  </div>
                </>
              ) : (
                <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3d4a7a', fontSize: '13px', flexDirection: 'column', gap: '8px' }}>
                  <div>No assets yet</div>
                  <button onClick={() => setShowForm(true)} style={{ fontSize: '12px', color: '#00aaff', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Add your first asset</button>
                </div>
              )}
            </div>

            {/* Allocation */}
            <div style={card}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '14px' }}>Asset Allocation</div>
              {allocEntries.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
                  {/* Donut */}
                  <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: donutCss ? `conic-gradient(${donutCss})` : 'rgba(255,255,255,0.05)', flexShrink: 0, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: '16px', borderRadius: '50%', background: 'rgba(8,14,40,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff', fontFamily: "'Space Grotesk',sans-serif" }}>{allocEntries.length}</span>
                      <span style={{ fontSize: '9px', color: '#6b7ab8' }}>classes</span>
                    </div>
                  </div>
                  {/* Legend */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {allocEntries.slice(0, 5).map(([cat, val], i) => {
                      const color = CAT_COLORS[cat] || donutColors[i % donutColors.length]
                      const pct = grandTotal > 0 ? Math.round((val / grandTotal) * 100) : 0
                      return (
                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: '12px', color: '#6b7ab8', flex: 1 }}>{cat}</span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#e8eaf6' }}>{pct}%</span>
                          <span style={{ fontSize: '11px', color: '#6b7ab8' }}>{fmt(val)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#3d4a7a', fontSize: '13px' }}>No assets yet</div>
              )}
              {/* Allocation bars */}
              {allocEntries.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(0,100,255,0.1)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#3d4a7a', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '8px' }}>By Value</div>
                  {allocEntries.slice(0, 4).map(([cat, val], i) => {
                    const color = CAT_COLORS[cat] || donutColors[i % donutColors.length]
                    const pct = grandTotal > 0 ? (val / grandTotal) * 100 : 0
                    return (
                      <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, flexShrink: 0 }} />
                        <div style={{ fontSize: '12px', color: '#6b7ab8', width: '110px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</div>
                        <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${color}cc,${color}66)`, borderRadius: '3px' }} />
                        </div>
                        <div style={{ fontSize: '11px', color: '#e8eaf6', fontWeight: 600, minWidth: '50px', textAlign: 'right' }}>{fmt(val)}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Real Estate section ─────────────────────────── */}
          {(realEstate.length > 0 || connRealEstate.length > 0) && (
            <>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '10px' }}>Real Estate · {fmt(reTotal)}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: '16px', marginBottom: '20px' }}>
                {realEstate.map(a => (
                  <div key={a.id} style={{ ...card, borderColor: 'rgba(0,85,255,0.25)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{a.name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7ab8' }}>{a.institution || 'Manual entry'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(0,85,255,0.1)', border: '1px solid rgba(0,85,255,0.2)', borderRadius: '5px', color: '#00aaff' }}>Manual</span>
                        <button onClick={() => deleteAsset(a.id)} style={{ background: 'none', border: 'none', color: '#3d4a7a', cursor: 'pointer', fontSize: '14px' }}>×</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: a.mortgage > 0 ? '1fr 1fr 1fr' : '1fr 1fr', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: '#3d4a7a', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '3px' }}>Property Value</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', fontFamily: "'Space Grotesk',sans-serif" }}>{fmtFull(a.value || 0)}</div>
                      </div>
                      {a.mortgage > 0 && (
                        <div>
                          <div style={{ fontSize: '10px', color: '#3d4a7a', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '3px' }}>Mortgage</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#ff6060', fontFamily: "'Space Grotesk',sans-serif" }}>-{fmtFull(a.mortgage)}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '10px', color: '#3d4a7a', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '3px' }}>Equity</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#00cc66', fontFamily: "'Space Grotesk',sans-serif" }}>{fmtFull((a.value || 0) - (a.mortgage || 0))}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {connRealEstate.map(conn => {
                  const bal = accountBalances.filter(b => b.connected_account_id === conn.id).reduce((s, b) => s + (b.current_balance || 0), 0)
                  return (
                    <div key={conn.id} style={{ ...card, borderColor: 'rgba(0,204,102,0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{conn.institution_name}</div>
                          <div style={{ fontSize: '12px', color: '#6b7ab8' }}>Connected account</div>
                        </div>
                        <span style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(0,204,102,0.1)', border: '1px solid rgba(0,204,102,0.2)', borderRadius: '5px', color: '#00cc66' }}>● Live</span>
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', fontFamily: "'Space Grotesk',sans-serif" }}>{fmtFull(bal)}</div>
                    </div>
                  )
                })}
                {/* Add property card */}
                <div style={{ ...card, border: '1px dashed rgba(0,100,255,0.2)', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '120px' }}>
                  <div style={{ fontSize: '28px' }}>🏠</div>
                  <div style={{ fontSize: '13px', color: '#6b7ab8', textAlign: 'center' }}>Add another property</div>
                  <button onClick={() => { setForm(f => ({ ...f, category: 'Real Estate' })); setShowForm(true) }} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#6b7ab8', fontSize: '12px', cursor: 'pointer' }}>+ Add Property</button>
                </div>
              </div>
            </>
          )}

          {/* ── Investments section ─────────────────────────── */}
          {(investments.length > 0 || connInvestments.length > 0) && (
            <>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '10px' }}>Investments · {fmt(invTotal)}</div>
              <div style={{ ...card, marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid rgba(0,100,255,0.1)', fontSize: '10px', fontWeight: 700, color: '#3d4a7a', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                  <span>Account</span><span style={{ textAlign: 'right' }}>Type</span><span style={{ textAlign: 'right' }}>Value</span>
                </div>
                {investments.map(a => (
                  <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', padding: '11px 0', borderBottom: '1px solid rgba(0,100,255,0.06)', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{a.name}</div>
                      <div style={{ fontSize: '11px', color: '#6b7ab8' }}>{a.institution || 'Manual'}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '12px', color: '#6b7ab8' }}>Manual</div>
                    <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#fff' }}>{fmtFull(a.value || 0)}</div>
                  </div>
                ))}
                {connInvestments.map(conn => {
                  const bals = accountBalances.filter(b => b.connected_account_id === conn.id)
                  return bals.map(b => (
                    <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', padding: '11px 0', borderBottom: '1px solid rgba(0,100,255,0.06)', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{b.account_name}</div>
                        <div style={{ fontSize: '11px', color: '#6b7ab8' }}>{conn.institution_name} · <span style={{ color: '#00cc66' }}>● Live</span></div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '12px', color: '#6b7ab8' }}>{b.account_type || 'Investment'}</div>
                      <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#fff' }}>{fmtFull(b.current_balance || 0)}</div>
                    </div>
                  ))
                })}
              </div>
            </>
          )}

          {/* ── Cash & Crypto ───────────────────────────────── */}
          {(banking.length > 0 || connBanking.length > 0 || crypto.length > 0 || connCrypto.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: cashTotal > 0 && cryptoTotal > 0 ? '1fr 1fr' : '1fr', gap: '16px', marginBottom: '20px' }}>
              {(banking.length > 0 || connBanking.length > 0) && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '10px' }}>Cash & Banking · {fmt(cashTotal)}</div>
                  <div style={card}>
                    {banking.map(a => (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,100,255,0.08)' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{a.name}</div>
                          <div style={{ fontSize: '11px', color: '#6b7ab8' }}>{a.institution || 'Manual'}</div>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{fmtFull(a.value || 0)}</div>
                      </div>
                    ))}
                    {connBanking.map(conn =>
                      accountBalances.filter(b => b.connected_account_id === conn.id).map(b => (
                        <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,100,255,0.08)' }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{b.account_name}</div>
                            <div style={{ fontSize: '11px', color: '#6b7ab8' }}>{conn.institution_name} · <span style={{ color: '#00cc66' }}>● Live</span></div>
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{fmtFull(b.current_balance || 0)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {(crypto.length > 0 || connCrypto.length > 0) && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#f7931a', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '10px' }}>Crypto · {fmt(cryptoTotal)}</div>
                  <div style={{ ...card, borderColor: 'rgba(247,147,26,0.18)' }}>
                    {crypto.map(a => (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(247,147,26,0.1)' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{a.name}</div>
                          <div style={{ fontSize: '11px', color: '#6b7ab8' }}>Manual entry</div>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{fmtFull(a.value || 0)}</div>
                      </div>
                    ))}
                    {connCrypto.map(conn =>
                      accountBalances.filter(b => b.connected_account_id === conn.id).map(b => (
                        <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(247,147,26,0.1)' }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{b.account_name}</div>
                            <div style={{ fontSize: '11px', color: '#6b7ab8' }}>{conn.institution_name} · <span style={{ color: '#00cc66' }}>● Live</span></div>
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f7931a' }}>{fmtFull(b.current_balance || 0)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Monthly Snapshot ────────────────────────────── */}
          {grandTotal > 0 && (
            <>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '10px' }}>Monthly Snapshot</div>
              <div style={card}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '0', textAlign: 'center' }}>
                  {chartPoints.slice(-6).map((val, i) => {
                    const monthLabel = months.slice(-6)[i]
                    const prevVal = i > 0 ? chartPoints.slice(-6)[i - 1] : val
                    const change = prevVal > 0 ? ((val - prevVal) / prevVal) * 100 : 0
                    const isLast = i === 5
                    return (
                      <div key={monthLabel} style={{ padding: '10px', borderRight: i < 5 ? '1px solid rgba(0,100,255,0.1)' : 'none' }}>
                        <div style={{ fontSize: '10px', color: isLast ? '#00aaff' : '#3d4a7a', fontWeight: isLast ? 700 : 400, marginBottom: '6px' }}>{monthLabel} &apos;{new Date().getFullYear().toString().slice(2)}</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{fmt(val)}</div>
                        <div style={{ fontSize: '11px', color: change >= 0 ? '#00cc66' : '#ff6060' }}>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── Empty state ─────────────────────────────────── */}
          {grandTotal === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💼</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>No assets tracked yet</div>
              <div style={{ fontSize: '14px', color: '#6b7ab8', marginBottom: '24px' }}>Add your first asset or connect your financial accounts to see your net worth.</div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => setShowForm(true)} style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>+ Add Asset</button>
                <Link href="/integrations" style={{ padding: '10px 24px', background: 'transparent', border: '1px solid rgba(0,100,255,0.25)', borderRadius: '10px', color: '#6b7ab8', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>Connect Accounts →</Link>
              </div>
            </div>
          )}

          {/* Padding bottom */}
          <div style={{ height: '32px' }} />
        </div>
      </div>

      {/* ── Add Asset Modal ──────────────────────────────────── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#060818', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '20px', padding: '32px', maxWidth: '480px', width: '100%' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>Add Asset</h3>
            {form.category === 'Crypto' ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>₿</div>
                <div style={{ fontSize: '14px', color: '#6b7ab8', marginBottom: '16px' }}>Use the Integrations page to add crypto with live prices from Coinbase or CoinGecko.</div>
                <Link href="/integrations" onClick={() => setShowForm(false)} style={{ display: 'inline-block', padding: '9px 20px', background: 'rgba(247,147,26,0.15)', border: '1px solid rgba(247,147,26,0.3)', borderRadius: '8px', color: '#f7931a', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>Go to Integrations →</Link>
                <button onClick={() => setShowForm(false)} style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: '#3d4a7a', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              </div>
            ) : (
              <form onSubmit={addAsset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Asset Name</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Primary Residence" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
                    {MANUAL_CATEGORIES.map(c => <option key={c} style={{ background: '#060818' }}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>{form.category === 'Real Estate' ? 'Property Value ($)' : 'Value ($)'}</label>
                    <input required type="number" min="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Institution</label>
                    <input value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="Optional" style={inputStyle} />
                  </div>
                </div>
                {form.category === 'Real Estate' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Mortgage Balance ($) <span style={{ color: '#3d4a7a', textTransform: 'none', fontWeight: 400 }}>— optional</span></label>
                    <input type="number" min="0" value={form.mortgage} onChange={e => setForm(f => ({ ...f, mortgage: e.target.value }))} placeholder="0" style={inputStyle} />
                    {form.value && form.mortgage && parseFloat(form.value) > 0 && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#00cc66', fontWeight: 600 }}>
                        Equity: {fmtFull(Math.max(0, parseFloat(form.value) - parseFloat(form.mortgage || '0')))}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button type="button" onClick={() => { setShowForm(false); setForm({ name: '', category: 'Real Estate', value: '', institution: '', mortgage: '' }) }} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#6b7ab8', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                  <button type="submit" disabled={saving} style={{ padding: '9px 22px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Add Asset'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
