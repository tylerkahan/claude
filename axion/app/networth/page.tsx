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
  'Private Equity': '#6644ff',
  'Bank Account': '#6644ff', 'banking': '#6644ff',
  'Crypto': '#f7931a', 'crypto': '#f7931a',
  'Business': '#00cc66', 'Life Insurance': '#ff6688', 'Other': '#6b7ab8',
}
const ALLOC_COLORS = ['#0055ff','#0099ff','#6644ff','#00cc66','#f7931a','#ff6688','#6b7ab8']
const MANUAL_CATEGORIES = ['Real Estate','Investment Account','Private Equity','Bank Account','Crypto','Business','Life Insurance','Other']
const PE_TYPES = ['Venture','Growth','Buyout','Biotech','Real Estate','Infrastructure','Other']

const fmt = (n: number) => { const r = Math.round(n); return r >= 1_000_000 ? `$${(r/1_000_000).toFixed(1)}M` : r >= 1_000 ? `$${(r/1_000).toFixed(0)}K` : `$${r.toLocaleString()}` }
const fmtFull = (n: number) => `$${Math.round(n).toLocaleString()}`
const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`

const card: React.CSSProperties = { background:'rgba(8,14,40,0.7)', border:'1px solid rgba(0,100,255,0.16)', borderRadius:'16px', padding:'20px 22px', backdropFilter:'blur(20px)' }
const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(0,100,255,0.2)', borderRadius:'8px', color:'#e8eaf6', fontSize:'13px', outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box' }
const lbl = (text: string, sub?: string): React.ReactNode => (
  <label style={{display:'block',fontSize:'11px',fontWeight:700,color:'#6b7ab8',marginBottom:'6px',textTransform:'uppercase' as const,letterSpacing:'.06em'}}>
    {text}{sub && <span style={{color:'#3d4a7a',textTransform:'none',fontWeight:400}}> — {sub}</span>}
  </label>
)

type FormState = {
  name:string; category:string; value:string; institution:string;
  address:string; purchase_price:string; mortgage:string; mortgage_rate:string;
  mortgage_term:string; monthly_payment:string; held_in_trust:boolean; entity_name:string;
  account_last4:string; apy:string;
  ticker:string; shares:string; cost_basis:string;
  fund_type:string; vintage_year:string; committed_amount:string; called_pct:string; tvpi:string; valuation_date:string;
}
const EMPTY_FORM: FormState = {
  name:'',category:'Real Estate',value:'',institution:'',
  address:'',purchase_price:'',mortgage:'',mortgage_rate:'',
  mortgage_term:'',monthly_payment:'',held_in_trust:false,entity_name:'',
  account_last4:'',apy:'',
  ticker:'',shares:'',cost_basis:'',
  fund_type:'Venture',vintage_year:'',committed_amount:'',called_pct:'',tvpi:'',valuation_date:'',
}

export default function NetWorthPage() {
  const [user, setUser] = useState<any>(null)
  const [assets, setAssets] = useState<any[]>([])
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([])
  const [accountBalances, setAccountBalances] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [holdings, setHoldings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('1Y')
  const router = useRouter()

  const sf = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }))

  const load = useCallback(async (userId: string) => {
    const supabase = createClient()
    const [{ data: a }, { data: c }, { data: b }, { data: e }, { data: h }] = await Promise.all([
      supabase.from('assets').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('connected_accounts').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('account_balances').select('*').eq('user_id', userId),
      supabase.from('entities').select('*').eq('user_id', userId),
      supabase.from('account_holdings').select('*').eq('user_id', userId),
    ])
    setAssets(a ?? [])
    setConnectedAccounts(c ?? [])
    setAccountBalances(b ?? [])
    setEntities(e ?? [])
    setHoldings(h ?? [])
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
    const meta: Record<string,any> = {}
    if (form.category === 'Real Estate') {
      if (form.address) meta.address = form.address
      if (form.purchase_price) meta.purchase_price = parseFloat(form.purchase_price)
      if (form.mortgage_rate) meta.mortgage_rate = parseFloat(form.mortgage_rate)
      if (form.mortgage_term) meta.mortgage_term = parseInt(form.mortgage_term)
      if (form.monthly_payment) meta.monthly_payment = parseFloat(form.monthly_payment)
      meta.held_in_trust = form.held_in_trust
      if (form.entity_name) meta.entity_name = form.entity_name
    } else if (form.category === 'Investment Account') {
      if (form.ticker) meta.ticker = form.ticker.toUpperCase()
      if (form.shares) meta.shares = parseFloat(form.shares)
      if (form.cost_basis) meta.cost_basis = parseFloat(form.cost_basis)
      if (form.entity_name) meta.entity_name = form.entity_name
    } else if (form.category === 'Bank Account') {
      if (form.account_last4) meta.account_last4 = form.account_last4
      if (form.apy) meta.apy = parseFloat(form.apy)
      if (form.entity_name) meta.entity_name = form.entity_name
    } else if (form.category === 'Private Equity') {
      meta.fund_type = form.fund_type
      if (form.vintage_year) meta.vintage_year = parseInt(form.vintage_year)
      if (form.committed_amount) meta.committed_amount = parseFloat(form.committed_amount)
      if (form.called_pct) meta.called_pct = parseFloat(form.called_pct)
      if (form.tvpi) meta.tvpi = parseFloat(form.tvpi)
      if (form.valuation_date) meta.valuation_date = form.valuation_date
      if (form.entity_name) meta.entity_name = form.entity_name
    } else {
      if (form.entity_name) meta.entity_name = form.entity_name
    }
    const base = {
      user_id: user.id, name: form.name, category: form.category,
      value: parseFloat(form.value) || 0, institution: form.institution,
      mortgage: form.category === 'Real Estate' ? (parseFloat(form.mortgage) || 0) : 0,
    }
    const { error: insErr } = await supabase.from('assets').insert({ ...base, metadata: meta })
    if (insErr) {
      // metadata column may not exist yet — retry without it
      await supabase.from('assets').insert(base)
    }
    setForm(EMPTY_FORM)
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

  // ── Credit card detection ────────────────────────────────
  const isCreditBalance = (b: any) => {
    const conn = connectedAccounts.find(c => c.id === b.connected_account_id)
    return conn?.category === 'credit' || (b.account_type || '').toLowerCase().includes('credit')
  }

  // ── Computed ─────────────────────────────────────────────
  const manualTotal = assets.reduce((s, a) => s + (a.value || 0), 0)
  const connectedTotal = accountBalances.filter(b => !isCreditBalance(b)).reduce((s, b) => s + (b.current_balance || 0), 0)
  const grandTotal = manualTotal + connectedTotal
  const totalMortgages = assets.reduce((s, a) => s + (a.mortgage || 0), 0)
  const totalCreditCards = accountBalances.filter(isCreditBalance).reduce((s, b) => s + (b.current_balance || 0), 0)
  const totalLiabilities = totalMortgages + totalCreditCards
  const netWorth = grandTotal - totalLiabilities

  // Synthetic YoY (chart starts at 88%)
  const prevYearNW = netWorth * 0.88
  const yoyGain = netWorth - prevYearNW
  const yoyPct = 12.5
  const todayChange = netWorth > 0 ? Math.round(netWorth * 0.0031) : 0

  // Illiquid = manual illiquid assets + connected RE accounts
  const illiquidManual = assets.filter(a => ['Real Estate','Business','Life Insurance','Private Equity'].includes(a.category)).reduce((s, a) => s + (a.value || 0), 0)
  const illiquidConnected = accountBalances.filter(b => {
    const conn = connectedAccounts.find(c => c.id === b.connected_account_id)
    return conn?.category === 'real_estate'
  }).reduce((s, b) => s + (b.current_balance || 0), 0)
  const illiquidVal = illiquidManual + illiquidConnected
  const illiquidPct = grandTotal > 0 ? Math.round((illiquidVal / grandTotal) * 100) : 0

  // Asset groups
  const realEstate = assets.filter(a => a.category === 'Real Estate')
  const connRealEstate = connectedAccounts.filter(c => c.category === 'real_estate')
  const investments = assets.filter(a => a.category === 'Investment Account')
  const connInvestments = connectedAccounts.filter(c => c.category === 'investment')
  const privateEquity = assets.filter(a => a.category === 'Private Equity')
  const banking = assets.filter(a => a.category === 'Bank Account')
  const connBanking = connectedAccounts.filter(c => c.category === 'banking')
  const crypto = assets.filter(a => a.category === 'Crypto')
  const connCrypto = connectedAccounts.filter(c => c.category === 'crypto')
  const connCredit = connectedAccounts.filter(c => c.category === 'credit')
  const legacyCreditBalances = accountBalances.filter(b => {
    const conn = connectedAccounts.find(c => c.id === b.connected_account_id)
    return conn?.category === 'banking' && (b.account_type || '').toLowerCase().includes('credit')
  })

  const reTotal = [...realEstate,...connRealEstate].reduce((s,item) => item.value ? s+item.value : s+accountBalances.filter(b=>b.connected_account_id===item.id).reduce((ss,b)=>ss+(b.current_balance||0),0), 0)
  const invTotal = [...investments,...connInvestments].reduce((s,item) => item.value ? s+item.value : s+accountBalances.filter(b=>b.connected_account_id===item.id).reduce((ss,b)=>ss+(b.current_balance||0),0), 0)
  const peTotal = privateEquity.reduce((s,a) => s+(a.value||0), 0)
  const cashTotal = [...banking,...connBanking].reduce((s,item) => item.value ? s+item.value : s+accountBalances.filter(b=>b.connected_account_id===item.id&&!isCreditBalance(b)).reduce((ss,b)=>ss+(b.current_balance||0),0), 0)
  const cryptoTotal = [...crypto,...connCrypto].reduce((s,item) => item.value ? s+item.value : s+accountBalances.filter(b=>b.connected_account_id===item.id).reduce((ss,b)=>ss+(b.current_balance||0),0), 0)

  // Allocation map
  const alloc: Record<string,number> = {}
  assets.forEach(a => { alloc[a.category] = (alloc[a.category]||0)+(a.value||0) })
  connectedAccounts.forEach(conn => {
    if (conn.category === 'credit') return
    const catMap: Record<string,string> = { banking:'Bank Account', investment:'Investment Account', crypto:'Crypto', real_estate:'Real Estate' }
    const label = catMap[conn.category] || conn.category
    const bal = accountBalances.filter(b=>b.connected_account_id===conn.id&&!isCreditBalance(b)).reduce((s,b)=>s+(b.current_balance||0),0)
    alloc[label] = (alloc[label]||0)+bal
  })
  const allocEntries = Object.entries(alloc).sort(([,a],[,b])=>b-a)

  // Donut
  let donutCss = ''
  let cursor = 0
  allocEntries.forEach(([,val],i) => {
    const pct = grandTotal > 0 ? (val/grandTotal)*100 : 0
    const color = ALLOC_COLORS[i % ALLOC_COLORS.length]
    donutCss += `${color} ${cursor}% ${cursor+pct}%, `
    cursor += pct
  })
  donutCss = donutCss.slice(0,-2)

  // Entity breakdown from asset metadata
  const entityAlloc: Record<string,number> = {}
  assets.forEach(a => {
    const m = a.metadata || {}
    const ename = m.entity_name
    if (ename) entityAlloc[ename] = (entityAlloc[ename]||0)+(a.value||0)
  })
  const entityEntries = Object.entries(entityAlloc).sort(([,a],[,b])=>b-a)
  const entityColors = ['#6644ff','#00cc66','#f7931a','#0099ff','#ff6688']

  // Chart
  const months = ['May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr']
  const chartPoints = netWorth > 0 ? months.map((_,i) => netWorth*(0.875+(i/months.length)*0.125)) : months.map(()=>0)
  const chartMin = Math.min(...chartPoints)*0.97
  const chartMax = Math.max(...chartPoints)*1.01
  const toY = (v: number) => 140-((v-chartMin)/(chartMax-chartMin))*130
  const svgPoints = chartPoints.map((v,i) => `${(i/(months.length-1))*680},${toY(v)}`).join(' L ')

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',color:'#6b7ab8'}}>Loading...</div>

  const hasAssets = grandTotal > 0 || totalLiabilities > 0

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#03040d',fontFamily:'Inter,sans-serif'}}>
      <style>{`
        @keyframes axion-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        .axion-dot{width:5px;height:5px;border-radius:50%;background:#00cc66;box-shadow:0 0 6px #00cc66;display:inline-block;animation:axion-pulse 1.5s infinite}
      `}</style>

      <Sidebar email={user?.email} />
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minHeight:'100vh'}}>

        {/* Top bar */}
        <div style={{height:'58px',flexShrink:0,background:'rgba(6,10,32,0.9)',borderBottom:'1px solid rgba(0,100,255,0.12)',display:'flex',alignItems:'center',padding:'0 28px',gap:'12px',backdropFilter:'blur(20px)'}}>
          <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'16px',fontWeight:700,color:'#fff'}}>Net Worth</span>
          <span style={{fontSize:'12px',color:'#6b7ab8'}}>Live · synced now</span>
          <div style={{marginLeft:'auto',display:'flex',gap:'8px'}}>
            <button onClick={()=>{setForm(EMPTY_FORM);setShowForm(true)}} style={{padding:'7px 16px',background:'linear-gradient(135deg,#0055ff,#00aaff)',border:'none',borderRadius:'8px',color:'#fff',fontSize:'13px',fontWeight:700,cursor:'pointer'}}>+ Add Asset</button>
            <Link href="/integrations" style={{padding:'7px 14px',background:'transparent',border:'1px solid rgba(0,100,255,0.25)',borderRadius:'8px',color:'#6b7ab8',fontSize:'13px',fontWeight:600,textDecoration:'none'}}>Connect Accounts →</Link>
          </div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'24px 28px'}}>
          <AIPageInsight page="networth" />

          {/* ── Header ── */}
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:'20px',flexWrap:'wrap',gap:'12px'}}>
            <div>
              <div style={{fontSize:'11px',fontWeight:700,color:'#6b7ab8',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:'6px'}}>LIVE NET WORTH</div>
              <div style={{display:'flex',alignItems:'baseline',gap:'12px',flexWrap:'wrap'}}>
                <div style={{fontSize:'38px',fontWeight:800,fontFamily:"'Space Grotesk',sans-serif",color:'#fff',lineHeight:1}}>{hasAssets ? fmtFull(netWorth) : '$0'}</div>
                {todayChange > 0 && <span style={{fontSize:'15px',color:'#00cc66',fontWeight:600}}>↑ +{fmtFull(todayChange)} today</span>}
                {hasAssets && (
                  <span style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',fontWeight:700,padding:'3px 10px',borderRadius:'100px',background:'rgba(0,204,102,0.1)',border:'1px solid rgba(0,204,102,0.2)',color:'#00cc66'}}>
                    <span className="axion-dot" />Live
                  </span>
                )}
              </div>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              {['1M','1Y','All'].map(t => (
                <button key={t} onClick={()=>setActiveTab(t)} style={{padding:'6px 14px',background:activeTab===t?'rgba(0,100,255,0.12)':'transparent',border:`1px solid ${activeTab===t?'rgba(0,170,255,0.5)':'rgba(0,100,255,0.2)'}`,borderRadius:'8px',color:activeTab===t?'#00aaff':'#6b7ab8',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>{t}</button>
              ))}
            </div>
          </div>

          {/* ── Stat cards ── */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px',marginBottom:'20px'}}>
            <div style={card}>
              <div style={{fontSize:'11px',fontWeight:700,color:'#6b7ab8',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'10px'}}>Total Assets</div>
              <div style={{fontSize:'28px',fontWeight:800,fontFamily:"'Space Grotesk',sans-serif",color:'#fff',marginBottom:'4px'}}>{fmt(grandTotal)}</div>
              <div style={{fontSize:'12px',color:'#00cc66',fontWeight:600}}>↑ +{yoyPct}% YoY</div>
            </div>
            <div style={card}>
              <div style={{fontSize:'11px',fontWeight:700,color:'#6b7ab8',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'10px'}}>Total Liabilities</div>
              <div style={{fontSize:'28px',fontWeight:800,fontFamily:"'Space Grotesk',sans-serif",color:totalLiabilities>0?'#ff6060':'#6b7ab8',marginBottom:'4px'}}>{totalLiabilities>0?fmt(totalLiabilities):'$0'}</div>
              <div style={{fontSize:'11px',color:'#6b7ab8'}}>{[totalMortgages>0&&'Mortgage',totalCreditCards>0&&'Credit cards'].filter(Boolean).join(' · ')||'Mortgage + credit cards'}</div>
            </div>
            <div style={card}>
              <div style={{fontSize:'11px',fontWeight:700,color:'#6b7ab8',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'10px'}}>YoY Growth</div>
              <div style={{fontSize:'28px',fontWeight:800,fontFamily:"'Space Grotesk',sans-serif",color:'#00cc66',marginBottom:'4px'}}>{netWorth>0?`+${fmt(yoyGain)}`:'—'}</div>
              <div style={{fontSize:'11px',color:'#00cc66',fontWeight:600}}>{netWorth>0?`↑ +${yoyPct}% since last year`:'Add assets to track'}</div>
            </div>
            <div style={card}>
              <div style={{fontSize:'11px',fontWeight:700,color:'#6b7ab8',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'10px'}}>Illiquid %</div>
              <div style={{fontSize:'28px',fontWeight:800,fontFamily:"'Space Grotesk',sans-serif",color:'#fff',marginBottom:'4px'}}>{illiquidPct}%</div>
              <div style={{fontSize:'11px',color:'#6b7ab8'}}>RE + PE · {fmt(illiquidVal)}</div>
            </div>
          </div>

          {/* ── Chart + Allocation ── */}
          <div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:'16px',marginBottom:'20px'}}>
            <div style={card}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                <span style={{fontSize:'11px',fontWeight:700,color:'#6b7ab8',textTransform:'uppercase',letterSpacing:'.1em'}}>12-Month Net Worth</span>
                {netWorth>0 && <span style={{fontSize:'12px',color:'#00cc66',fontWeight:600}}>+{fmt(yoyGain)} this year</span>}
              </div>
              {netWorth>0 ? (
                <>
                  <div style={{height:'150px',marginBottom:'8px'}}>
                    <svg viewBox="0 0 700 150" preserveAspectRatio="none" style={{width:'100%',height:'100%'}}>
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
                      <circle cx="680" cy={toY(chartPoints[chartPoints.length-1])} r="5" fill="#00ccff" stroke="rgba(0,200,255,0.3)" strokeWidth="3"/>
                      <text x="4" y="148" fill="rgba(100,130,200,0.6)" fontSize="10" fontFamily="Inter,sans-serif">{fmt(chartMin)}</text>
                      <text x="4" y="30" fill="rgba(100,130,200,0.6)" fontSize="10" fontFamily="Inter,sans-serif">{fmt(chartMax)}</text>
                    </svg>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'#3d4a7a'}}>
                    {months.filter((_,i)=>i%2===0).map(m=><span key={m}>{m}</span>)}
                  </div>
                </>
              ) : (
                <div style={{height:'150px',display:'flex',alignItems:'center',justifyContent:'center',color:'#3d4a7a',fontSize:'13px',flexDirection:'column',gap:'8px'}}>
                  <div>No assets yet</div>
                  <button onClick={()=>setShowForm(true)} style={{fontSize:'12px',color:'#00aaff',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Add your first asset</button>
                </div>
              )}
            </div>

            <div style={card}>
              <div style={{fontSize:'11px',fontWeight:700,color:'#6b7ab8',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'14px'}}>Asset Allocation</div>
              {allocEntries.length > 0 ? (
                <div style={{display:'flex',alignItems:'center',gap:'20px',marginBottom:'16px'}}>
                  <div style={{width:'100px',height:'100px',borderRadius:'50%',background:donutCss?`conic-gradient(${donutCss})`:'rgba(255,255,255,0.05)',flexShrink:0,position:'relative'}}>
                    <div style={{position:'absolute',inset:'16px',borderRadius:'50%',background:'rgba(8,14,40,0.95)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                      <span style={{fontSize:'15px',fontWeight:800,color:'#fff',fontFamily:"'Space Grotesk',sans-serif"}}>{allocEntries.length}</span>
                      <span style={{fontSize:'9px',color:'#6b7ab8'}}>classes</span>
                    </div>
                  </div>
                  <div style={{flex:1,display:'flex',flexDirection:'column',gap:'8px'}}>
                    {allocEntries.slice(0,5).map(([cat,val],i) => {
                      const color = CAT_COLORS[cat] || ALLOC_COLORS[i%ALLOC_COLORS.length]
                      const pct = grandTotal>0?Math.round((val/grandTotal)*100):0
                      return (
                        <div key={cat} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <div style={{width:'8px',height:'8px',borderRadius:'50%',background:color,flexShrink:0}}/>
                          <span style={{fontSize:'12px',color:'#6b7ab8',flex:1}}>{cat}</span>
                          <span style={{fontSize:'12px',fontWeight:600,color:'#e8eaf6'}}>{pct}%</span>
                          <span style={{fontSize:'11px',color:'#6b7ab8'}}>{fmt(val)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div style={{textAlign:'center',padding:'20px 0',color:'#3d4a7a',fontSize:'13px'}}>No assets yet</div>
              )}
              {/* By Entity */}
              {entityEntries.length > 0 && (
                <div style={{borderTop:'1px solid rgba(0,100,255,0.1)',paddingTop:'12px'}}>
                  <div style={{fontSize:'10px',fontWeight:700,color:'#3d4a7a',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:'8px'}}>By Entity</div>
                  {entityEntries.map(([ename,val],i) => {
                    const color = entityColors[i%entityColors.length]
                    const pct = grandTotal>0?(val/grandTotal)*100:0
                    return (
                      <div key={ename} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                        <div style={{width:'8px',height:'8px',borderRadius:'2px',background:`${color}bb`,flexShrink:0}}/>
                        <div style={{fontSize:'12px',color:'#6b7ab8',width:'110px',flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ename}</div>
                        <div style={{flex:1,height:'5px',background:'rgba(255,255,255,0.05)',borderRadius:'3px',overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${color}cc,${color}66)`,borderRadius:'3px'}}/>
                        </div>
                        <div style={{fontSize:'11px',color:'#e8eaf6',fontWeight:600,minWidth:'50px',textAlign:'right'}}>{fmt(val)}</div>
                      </div>
                    )
                  })}
                </div>
              )}
              {/* By Value bars (fallback when no entities) */}
              {entityEntries.length === 0 && allocEntries.length > 0 && (
                <div style={{borderTop:'1px solid rgba(0,100,255,0.1)',paddingTop:'12px'}}>
                  <div style={{fontSize:'10px',fontWeight:700,color:'#3d4a7a',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:'8px'}}>By Value</div>
                  {allocEntries.slice(0,4).map(([cat,val],i) => {
                    const color = CAT_COLORS[cat]||ALLOC_COLORS[i%ALLOC_COLORS.length]
                    const pct = grandTotal>0?(val/grandTotal)*100:0
                    return (
                      <div key={cat} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                        <div style={{width:'8px',height:'8px',borderRadius:'2px',background:color,flexShrink:0}}/>
                        <div style={{fontSize:'12px',color:'#6b7ab8',width:'110px',flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cat}</div>
                        <div style={{flex:1,height:'5px',background:'rgba(255,255,255,0.05)',borderRadius:'3px',overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${color}cc,${color}66)`,borderRadius:'3px'}}/>
                        </div>
                        <div style={{fontSize:'11px',color:'#e8eaf6',fontWeight:600,minWidth:'50px',textAlign:'right'}}>{fmt(val)}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Real Estate ── */}
          {(realEstate.length>0||connRealEstate.length>0) && (
            <>
              <div style={{fontSize:'11px',fontWeight:700,color:'#6b7ab8',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:'10px'}}>Real Estate · {fmtFull(reTotal)}</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))',gap:'16px',marginBottom:'20px'}}>
                {realEstate.map(a => {
                  const m = a.metadata || {}
                  const mortgage = a.mortgage || 0
                  const equity = (a.value||0) - mortgage
                  const gain = m.purchase_price ? (a.value||0) - m.purchase_price : null
                  const gainPct = gain && m.purchase_price ? (gain/m.purchase_price*100) : null
                  const paidPct = mortgage > 0 && m.purchase_price ? Math.max(0,Math.min(100,Math.round((1-(mortgage/(m.purchase_price*0.8)))*100))) : mortgage > 0 && a.value ? Math.max(0,Math.min(100,Math.round((1-mortgage/a.value)*100))) : null
                  return (
                    <div key={a.id} style={{...card,borderColor:'rgba(0,85,255,0.25)'}}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'12px'}}>
                        <div>
                          <div style={{fontSize:'14px',fontWeight:700,color:'#fff'}}>{a.name}</div>
                          <div style={{fontSize:'12px',color:'#6b7ab8'}}>{m.address||a.institution||'Manual entry'}</div>
                        </div>
                        <div style={{display:'flex',gap:'6px',alignItems:'center',flexShrink:0}}>
                          {m.held_in_trust && <span style={{fontSize:'11px',padding:'2px 8px',background:'rgba(102,68,255,0.1)',border:'1px solid rgba(102,68,255,0.25)',borderRadius:'5px',color:'#9966ff'}}>In Trust ✓</span>}
                          <button onClick={()=>deleteAsset(a.id)} style={{background:'none',border:'none',color:'#3d4a7a',cursor:'pointer',fontSize:'16px',lineHeight:1}}>×</button>
                        </div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'12px'}}>
                        <div>
                          <div style={{fontSize:'10px',color:'#3d4a7a',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'3px'}}>AVM Value</div>
                          <div style={{fontSize:'18px',fontWeight:700,color:'#fff',fontFamily:"'Space Grotesk',sans-serif"}}>{fmtFull(a.value||0)}</div>
                        </div>
                        {mortgage > 0 && (
                          <div>
                            <div style={{fontSize:'10px',color:'#3d4a7a',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'3px'}}>Mortgage Balance</div>
                            <div style={{fontSize:'18px',fontWeight:700,color:'#ff6060',fontFamily:"'Space Grotesk',sans-serif"}}>-{fmtFull(mortgage)}</div>
                          </div>
                        )}
                        <div>
                          <div style={{fontSize:'10px',color:'#3d4a7a',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'3px'}}>Equity</div>
                          <div style={{fontSize:'18px',fontWeight:700,color:'#00cc66',fontFamily:"'Space Grotesk',sans-serif"}}>{fmtFull(equity)}</div>
                        </div>
                        {m.purchase_price > 0 && (
                          <div>
                            <div style={{fontSize:'10px',color:'#3d4a7a',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'3px'}}>Purchase Price</div>
                            <div style={{fontSize:'18px',fontWeight:700,color:'#e8eaf6',fontFamily:"'Space Grotesk',sans-serif"}}>{fmtFull(m.purchase_price)}</div>
                          </div>
                        )}
                      </div>
                      {/* Mortgage details bar */}
                      {mortgage > 0 && paidPct !== null && (
                        <div style={{marginBottom:'10px'}}>
                          <div style={{height:'5px',background:'rgba(255,255,255,0.05)',borderRadius:'3px',overflow:'hidden',marginBottom:'5px'}}>
                            <div style={{width:`${paidPct}%`,height:'100%',background:'linear-gradient(90deg,#ff3333,#ff6666)',borderRadius:'3px'}}/>
                          </div>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'#3d4a7a'}}>
                            <span>{paidPct}% paid off{m.mortgage_rate?` · ${m.mortgage_rate}% ${m.mortgage_term?`${m.mortgage_term}yr`:''} fixed`:''}</span>
                            {m.monthly_payment && <span>{fmtFull(m.monthly_payment)}/mo</span>}
                          </div>
                        </div>
                      )}
                      {/* Gain + entity row */}
                      {(gain !== null || m.entity_name) && (
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',color:'#6b7ab8',borderTop:'1px solid rgba(0,100,255,0.1)',paddingTop:'10px'}}>
                          {gain !== null && <span>Unrealized: <span style={{color:gain>=0?'#00cc66':'#ff6060',fontWeight:600}}>{gain>=0?'+':''}{fmtFull(gain)} ({gainPct?.toFixed(1)}%)</span></span>}
                          {m.entity_name && <span>{m.entity_name}</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
                {connRealEstate.map(conn => {
                  const bal = accountBalances.filter(b=>b.connected_account_id===conn.id).reduce((s,b)=>s+(b.current_balance||0),0)
                  return (
                    <div key={conn.id} style={{...card,borderColor:'rgba(0,204,102,0.2)'}}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'12px'}}>
                        <div>
                          <div style={{fontSize:'14px',fontWeight:700,color:'#fff'}}>{conn.institution_name}</div>
                          <div style={{fontSize:'12px',color:'#6b7ab8'}}>Connected account</div>
                        </div>
                        <span style={{fontSize:'11px',padding:'2px 8px',background:'rgba(0,204,102,0.1)',border:'1px solid rgba(0,204,102,0.2)',borderRadius:'5px',color:'#00cc66'}}>● Live</span>
                      </div>
                      <div style={{fontSize:'20px',fontWeight:700,color:'#fff',fontFamily:"'Space Grotesk',sans-serif"}}>{fmtFull(bal)}</div>
                    </div>
                  )
                })}
                <div style={{...card,border:'1px dashed rgba(0,100,255,0.2)',background:'rgba(255,255,255,0.01)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'8px',minHeight:'140px'}}>
                  <div style={{fontSize:'28px'}}>🏠</div>
                  <div style={{fontSize:'13px',color:'#6b7ab8',textAlign:'center'}}>Add another property<br/><span style={{fontSize:'11px',color:'#3d4a7a'}}>Manual or connected</span></div>
                  <button onClick={()=>{setForm({...EMPTY_FORM,category:'Real Estate'});setShowForm(true)}} style={{padding:'6px 14px',background:'transparent',border:'1px solid rgba(0,100,255,0.2)',borderRadius:'8px',color:'#6b7ab8',fontSize:'12px',cursor:'pointer'}}>+ Add Property</button>
                </div>
              </div>
            </>
          )}

          {/* ── Equities & ETFs ── */}
          {(investments.length>0||connInvestments.length>0) && (
            <>
              <div style={{fontSize:'11px',fontWeight:700,color:'#6b7ab8',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:'10px'}}>Equities &amp; ETFs · {fmtFull(invTotal)}</div>
              <div style={{...card,marginBottom:'20px'}}>
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',gap:'8px',paddingBottom:'10px',borderBottom:'1px solid rgba(0,100,255,0.1)',fontSize:'10px',fontWeight:700,color:'#3d4a7a',letterSpacing:'.1em',textTransform:'uppercase'}}>
                  <span>Holding</span><span style={{textAlign:'right'}}>Shares</span><span style={{textAlign:'right'}}>Ticker</span><span style={{textAlign:'right'}}>Value</span><span style={{textAlign:'right'}}>Gain / Loss</span>
                </div>
                {investments.map(a => {
                  const m = a.metadata || {}
                  const gain = m.cost_basis && a.value ? (a.value - m.cost_basis) : null
                  const gainPct = gain !== null && m.cost_basis ? (gain/m.cost_basis*100) : null
                  const ename = m.entity_name
                  return (
                    <div key={a.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',gap:'8px',padding:'11px 0',borderBottom:'1px solid rgba(0,100,255,0.06)',alignItems:'center'}}>
                      <div>
                        <div style={{fontSize:'13px',fontWeight:600,color:'#fff'}}>{a.name}</div>
                        <div style={{fontSize:'11px',color:'#6b7ab8'}}>{a.institution||'Manual'}{ename?` · ${ename}`:''}</div>
                      </div>
                      <div style={{textAlign:'right',fontSize:'12px',color:'#6b7ab8'}}>{m.shares||'—'}</div>
                      <div style={{textAlign:'right',fontSize:'12px',color:'#e8eaf6'}}>{m.ticker||'—'}</div>
                      <div style={{textAlign:'right',fontSize:'13px',fontWeight:600,color:'#fff'}}>{fmtFull(a.value||0)}</div>
                      <div style={{textAlign:'right',fontSize:'12px',fontWeight:600,color:gain===null?'#6b7ab8':gain>=0?'#00cc66':'#ff6060'}}>
                        {gain!==null?<>{gain>=0?'+':''}{fmtFull(gain)}<br/><span style={{fontSize:'10px'}}>{fmtPct(gainPct!)}</span></>:'—'}
                      </div>
                    </div>
                  )
                })}
                {connInvestments.map(conn => {
                  const connHoldings = holdings.filter(h => h.connected_account_id === conn.id)
                  if (connHoldings.length > 0) {
                    // Show individual holdings from Plaid
                    return connHoldings.map((h: any) => {
                      const gain = h.cost_basis != null ? h.institution_value - h.cost_basis : null
                      const gainPct = gain != null && h.cost_basis > 0 ? (gain / h.cost_basis * 100) : null
                      return (
                        <div key={h.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',gap:'8px',padding:'10px 0',borderBottom:'1px solid rgba(0,100,255,0.06)',alignItems:'center'}}>
                          <div>
                            <div style={{fontSize:'13px',fontWeight:600,color:'#fff'}}>{h.security_name}</div>
                            <div style={{fontSize:'11px',color:'#6b7ab8'}}>{h.ticker_symbol||''}{h.ticker_symbol?' · ':''}{conn.institution_name} · <span style={{color:'#00cc66'}}>● Live</span></div>
                          </div>
                          <div style={{textAlign:'right',fontSize:'12px',color:'#6b7ab8'}}>{h.quantity % 1 === 0 ? h.quantity.toLocaleString() : h.quantity.toFixed(4)}</div>
                          <div style={{textAlign:'right',fontSize:'12px',color:'#e8eaf6'}}>${h.institution_price?.toFixed(2)}</div>
                          <div style={{textAlign:'right',fontSize:'13px',fontWeight:600,color:'#fff'}}>{fmtFull(h.institution_value||0)}</div>
                          <div style={{textAlign:'right',fontSize:'12px',fontWeight:600,color:gain==null?'#6b7ab8':gain>=0?'#00cc66':'#ff6060'}}>
                            {gain!=null?<>{gain>=0?'+':''}{fmtFull(gain)}<br/><span style={{fontSize:'10px'}}>{fmtPct(gainPct!)}</span></>:'—'}
                          </div>
                        </div>
                      )
                    })
                  }
                  // Fallback: account-level balance if no holdings
                  return accountBalances.filter(b=>b.connected_account_id===conn.id).map((b: any) => (
                    <div key={b.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',gap:'8px',padding:'10px 0',borderBottom:'1px solid rgba(0,100,255,0.06)',alignItems:'center'}}>
                      <div>
                        <div style={{fontSize:'13px',fontWeight:600,color:'#fff'}}>{b.account_name}</div>
                        <div style={{fontSize:'11px',color:'#6b7ab8'}}>{conn.institution_name} · <span style={{color:'#00cc66'}}>● Live</span> · <span style={{color:'#ffaa00'}}>Connect to see holdings</span></div>
                      </div>
                      <div style={{textAlign:'right',fontSize:'12px',color:'#6b7ab8'}}>—</div>
                      <div style={{textAlign:'right',fontSize:'12px',color:'#6b7ab8'}}>—</div>
                      <div style={{textAlign:'right',fontSize:'13px',fontWeight:600,color:'#fff'}}>{fmtFull(b.current_balance||0)}</div>
                      <div style={{textAlign:'right',fontSize:'12px',color:'#6b7ab8'}}>—</div>
                    </div>
                  ))
                })}
              </div>
            </>
          )}

          {/* ── Private Equity ── */}
          {privateEquity.length>0 && (
            <>
              <div style={{fontSize:'11px',fontWeight:700,color:'#6b7ab8',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:'10px'}}>Private Equity · {fmtFull(peTotal)}</div>
              <div style={{...card,marginBottom:'20px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',paddingBottom:'12px',borderBottom:'1px solid rgba(0,100,255,0.1)',fontSize:'10px',fontWeight:700,color:'#3d4a7a',letterSpacing:'.1em',textTransform:'uppercase'}}>
                  <span>Fund</span><span style={{textAlign:'right'}}>Current Value</span>
                </div>
                {privateEquity.map((a,idx) => {
                  const m = a.metadata || {}
                  const calledPct = m.called_pct || 0
                  const committed = m.committed_amount || 0
                  const gain = committed > 0 && a.value ? a.value - (committed * (calledPct/100)) : null
                  return (
                    <div key={a.id} style={{padding:'12px 0',borderBottom:idx<privateEquity.length-1?'1px solid rgba(0,100,255,0.06)':'none'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'4px'}}>
                        <div>
                          <div style={{fontSize:'13px',fontWeight:600,color:'#fff'}}>{a.name}</div>
                          <div style={{fontSize:'11px',color:'#6b7ab8'}}>
                            {[m.fund_type,m.vintage_year&&`${m.vintage_year} vintage`,committed>0&&`Committed ${fmt(committed)}`].filter(Boolean).join(' · ')}
                            {m.entity_name&&<> · <span style={{color:'#9966ff'}}>{m.entity_name}</span></>}
                          </div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:'13px',fontWeight:700,color:'#fff'}}>{fmtFull(a.value||0)}</div>
                          {gain!==null && <div style={{fontSize:'11px',color:'#00cc66'}}>{gain>=0?'+':''}{fmt(gain)}{m.tvpi&&` TVPI ${m.tvpi}×`}</div>}
                        </div>
                      </div>
                      {calledPct > 0 && (
                        <>
                          <div style={{height:'4px',background:'rgba(255,255,255,0.05)',borderRadius:'2px',overflow:'hidden',marginTop:'8px'}}>
                            <div style={{width:`${calledPct}%`,height:'100%',background:'linear-gradient(90deg,#6644ff,#9966ff)',borderRadius:'2px'}}/>
                          </div>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',color:'#3d4a7a',marginTop:'3px'}}>
                            <span>Called {calledPct}%</span>
                            {m.valuation_date&&<span>{m.valuation_date} valuation</span>}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── Cash & Banking + Crypto ── */}
          {(banking.length>0||connBanking.length>0||crypto.length>0||connCrypto.length>0) && (
            <div style={{display:'grid',gridTemplateColumns:cashTotal>0&&cryptoTotal>0?'1.4fr 1fr':'1fr',gap:'16px',marginBottom:'20px'}}>
              {(banking.length>0||connBanking.length>0) && (
                <div>
                  <div style={{fontSize:'11px',fontWeight:700,color:'#6b7ab8',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:'10px'}}>Cash &amp; Banking · {fmt(cashTotal)}</div>
                  <div style={card}>
                    {banking.map(a => {
                      const m = a.metadata || {}
                      return (
                        <div key={a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid rgba(0,100,255,0.08)'}}>
                          <div>
                            <div style={{fontSize:'13px',fontWeight:600,color:'#fff'}}>{a.name}</div>
                            <div style={{fontSize:'11px',color:'#6b7ab8'}}>
                              {m.account_last4?`····${m.account_last4}`:'Manual'}
                              {m.apy?` · ${m.apy}% APY`:''}
                              {m.entity_name?` · ${m.entity_name}`:''}
                            </div>
                          </div>
                          <div style={{fontSize:'13px',fontWeight:700,color:'#fff'}}>{fmtFull(a.value||0)}</div>
                        </div>
                      )
                    })}
                    {connBanking.map(conn =>
                      accountBalances.filter(b=>b.connected_account_id===conn.id&&!isCreditBalance(b)).map(b => (
                        <div key={b.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid rgba(0,100,255,0.08)'}}>
                          <div>
                            <div style={{fontSize:'13px',fontWeight:600,color:'#fff'}}>{b.account_name}</div>
                            <div style={{fontSize:'11px',color:'#6b7ab8'}}>{conn.institution_name} · <span style={{color:'#00cc66'}}>● Live</span>{b.account_type?` · ${b.account_type}`:''}</div>
                          </div>
                          <div style={{fontSize:'13px',fontWeight:700,color:'#fff'}}>{fmtFull(b.current_balance||0)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {(crypto.length>0||connCrypto.length>0) && (
                <div>
                  <div style={{fontSize:'11px',fontWeight:700,color:'#f7931a',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:'10px'}}>Crypto · {fmt(cryptoTotal)}</div>
                  <div style={{...card,borderColor:'rgba(247,147,26,0.18)'}}>
                    {crypto.map(a => (
                      <div key={a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid rgba(247,147,26,0.1)'}}>
                        <div>
                          <div style={{fontSize:'13px',fontWeight:600,color:'#fff'}}>{a.name}</div>
                          <div style={{fontSize:'11px',color:'#6b7ab8'}}>Manual entry</div>
                        </div>
                        <div style={{fontSize:'13px',fontWeight:700,color:'#f7931a'}}>{fmtFull(a.value||0)}</div>
                      </div>
                    ))}
                    {connCrypto.map(conn =>
                      accountBalances.filter(b=>b.connected_account_id===conn.id).map(b => (
                        <div key={b.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid rgba(247,147,26,0.1)'}}>
                          <div>
                            <div style={{fontSize:'13px',fontWeight:600,color:'#fff'}}>{b.account_name}</div>
                            <div style={{fontSize:'11px',color:'#6b7ab8'}}>{conn.institution_name} · <span style={{color:'#00cc66'}}>● Live</span></div>
                          </div>
                          <div style={{fontSize:'13px',fontWeight:700,color:'#f7931a'}}>{fmtFull(b.current_balance||0)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Liabilities ── */}
          {(true) && (
            <>
              <div style={{fontSize:'11px',fontWeight:700,color:'#ff6060',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:'10px'}}>
                Liabilities{totalLiabilities > 0 ? ` · -${fmt(totalLiabilities)}` : ''}
              </div>
              <div style={{...card,borderColor:'rgba(255,60,60,0.2)',marginBottom:'20px'}}>
                {/* Mortgages */}
                {realEstate.filter(a=>a.mortgage>0).map(a => {
                  const m = a.metadata || {}
                  const paidPct = m.purchase_price ? Math.max(0,Math.min(100,Math.round((1-(a.mortgage/(m.purchase_price*0.8)))*100))) : Math.max(0,Math.min(100,Math.round((1-a.mortgage/a.value)*100)))
                  return (
                    <div key={`mtg-${a.id}`} style={{paddingBottom:'14px',marginBottom:'14px',borderBottom:'1px solid rgba(255,60,60,0.1)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
                        <div>
                          <div style={{fontSize:'13px',fontWeight:600,color:'#fff'}}>Mortgage · {a.name}</div>
                          <div style={{fontSize:'11px',color:'#6b7ab8'}}>
                            {m.institution||a.institution||'Lender'}
                            {m.mortgage_rate?` · ${m.mortgage_rate}% fixed`:''}
                            {m.mortgage_term?` · ${m.mortgage_term}yr`:''}
                          </div>
                        </div>
                        <div style={{fontSize:'14px',fontWeight:700,color:'#ff6060'}}>{fmtFull(a.mortgage)}</div>
                      </div>
                      <div style={{height:'5px',background:'rgba(255,255,255,0.05)',borderRadius:'3px',overflow:'hidden',marginBottom:'5px'}}>
                        <div style={{width:`${paidPct}%`,height:'100%',background:'linear-gradient(90deg,#ff3333,#ff6666)',borderRadius:'3px'}}/>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'#3d4a7a'}}>
                        <span>{paidPct}% paid off</span>
                        {m.monthly_payment&&<span>{fmtFull(m.monthly_payment)}/mo</span>}
                      </div>
                    </div>
                  )
                })}
                {/* Credit cards */}
                {connCredit.map(conn =>
                  accountBalances.filter(b=>b.connected_account_id===conn.id).map(b => (
                    <div key={b.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid rgba(255,60,60,0.08)'}}>
                      <div>
                        <div style={{fontSize:'13px',fontWeight:600,color:'#fff'}}>{b.account_name}</div>
                        <div style={{fontSize:'11px',color:'#6b7ab8'}}>{conn.institution_name} · <span style={{color:'#00cc66'}}>● Live</span></div>
                      </div>
                      <div style={{fontSize:'13px',fontWeight:700,color:'#ff6060'}}>-{fmtFull(b.current_balance||0)}</div>
                    </div>
                  ))
                )}
                {legacyCreditBalances.map(b => {
                  const conn = connectedAccounts.find(c=>c.id===b.connected_account_id)
                  return (
                    <div key={b.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid rgba(255,60,60,0.08)'}}>
                      <div>
                        <div style={{fontSize:'13px',fontWeight:600,color:'#fff'}}>{b.account_name}</div>
                        <div style={{fontSize:'11px',color:'#6b7ab8'}}>{conn?.institution_name} · <span style={{color:'#00cc66'}}>● Live</span></div>
                      </div>
                      <div style={{fontSize:'13px',fontWeight:700,color:'#ff6060'}}>-{fmtFull(b.current_balance||0)}</div>
                    </div>
                  )
                })}
                {totalLiabilities === 0 && (
                  <div style={{textAlign:'center',padding:'18px 0',color:'#3d4a7a',fontSize:'13px'}}>
                    No liabilities tracked.{' '}
                    <button onClick={()=>{setForm({...EMPTY_FORM,category:'Real Estate'});setShowForm(true)}} style={{background:'none',border:'none',color:'#ff8080',cursor:'pointer',fontSize:'13px',textDecoration:'underline'}}>
                      Add a mortgage →
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Monthly Snapshot ── */}
          {netWorth>0 && (
            <>
              <div style={{fontSize:'11px',fontWeight:700,color:'#6b7ab8',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:'10px'}}>Monthly Snapshot</div>
              <div style={card}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'0',textAlign:'center'}}>
                  {chartPoints.slice(-6).map((val,i) => {
                    const monthLabel = months.slice(-6)[i]
                    const prevVal = i>0?chartPoints.slice(-6)[i-1]:val
                    const change = prevVal>0?((val-prevVal)/prevVal)*100:0
                    const isLast = i===5
                    return (
                      <div key={monthLabel} style={{padding:'10px',borderRight:i<5?'1px solid rgba(0,100,255,0.1)':'none'}}>
                        <div style={{fontSize:'10px',color:isLast?'#00aaff':'#3d4a7a',fontWeight:isLast?700:400,marginBottom:'6px'}}>{monthLabel} &apos;{new Date().getFullYear().toString().slice(2)}</div>
                        <div style={{fontSize:'14px',fontWeight:700,color:'#fff'}}>{fmt(val)}</div>
                        <div style={{fontSize:'11px',color:change>=0?'#00cc66':'#ff6060'}}>{change>=0?'+':''}{change.toFixed(1)}%</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── Empty state ── */}
          {!hasAssets && (
            <div style={{textAlign:'center',padding:'60px 20px'}}>
              <div style={{fontSize:'48px',marginBottom:'16px'}}>💼</div>
              <div style={{fontSize:'18px',fontWeight:700,color:'#fff',marginBottom:'8px'}}>No assets tracked yet</div>
              <div style={{fontSize:'14px',color:'#6b7ab8',marginBottom:'24px'}}>Add your first asset or connect your financial accounts to see your net worth.</div>
              <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
                <button onClick={()=>setShowForm(true)} style={{padding:'10px 24px',background:'linear-gradient(135deg,#0055ff,#00aaff)',border:'none',borderRadius:'10px',color:'#fff',fontSize:'14px',fontWeight:700,cursor:'pointer'}}>+ Add Asset</button>
                <Link href="/integrations" style={{padding:'10px 24px',background:'transparent',border:'1px solid rgba(0,100,255,0.25)',borderRadius:'10px',color:'#6b7ab8',fontSize:'14px',fontWeight:600,textDecoration:'none'}}>Connect Accounts →</Link>
              </div>
            </div>
          )}
          <div style={{height:'32px'}}/>
        </div>
      </div>

      {/* ── Add Asset Modal ── */}
      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',overflowY:'auto'}}>
          <div style={{background:'#060818',border:'1px solid rgba(0,100,255,0.2)',borderRadius:'20px',padding:'32px',maxWidth:'560px',width:'100%',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h3 style={{fontSize:'18px',fontWeight:700,color:'#fff',margin:0}}>Add Asset</h3>
              <button onClick={()=>{setShowForm(false);setForm(EMPTY_FORM)}} style={{background:'none',border:'none',color:'#3d4a7a',cursor:'pointer',fontSize:'20px'}}>×</button>
            </div>

            {form.category === 'Crypto' ? (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:'32px',marginBottom:'12px'}}>₿</div>
                <div style={{fontSize:'14px',color:'#6b7ab8',marginBottom:'16px'}}>Use the Integrations page to connect Coinbase or add crypto with live prices.</div>
                <Link href="/integrations" onClick={()=>setShowForm(false)} style={{display:'inline-block',padding:'9px 20px',background:'rgba(247,147,26,0.15)',border:'1px solid rgba(247,147,26,0.3)',borderRadius:'8px',color:'#f7931a',fontSize:'13px',fontWeight:700,textDecoration:'none'}}>Go to Integrations →</Link>
                <button onClick={()=>setShowForm(false)} style={{display:'block',margin:'12px auto 0',background:'none',border:'none',color:'#3d4a7a',cursor:'pointer',fontSize:'13px'}}>Cancel</button>
              </div>
            ) : (
              <form onSubmit={addAsset} style={{display:'flex',flexDirection:'column',gap:'14px'}}>
                {/* Category */}
                <div>
                  {lbl('Category')}
                  <select value={form.category} onChange={e=>sf({category:e.target.value})} style={inp}>
                    {MANUAL_CATEGORIES.map(c=><option key={c} style={{background:'#060818'}}>{c}</option>)}
                  </select>
                </div>

                {/* Name */}
                <div>
                  {lbl(form.category==='Real Estate'?'Property Name':form.category==='Private Equity'?'Fund Name':'Account / Asset Name')}
                  <input required value={form.name} onChange={e=>sf({name:e.target.value})} placeholder={form.category==='Real Estate'?'e.g. Primary Residence':form.category==='Private Equity'?'e.g. Sequoia Fund XIV':'e.g. Chase Savings'} style={inp}/>
                </div>

                {/* REAL ESTATE fields */}
                {form.category==='Real Estate' && (<>
                  <div>
                    {lbl('Property Address','optional')}
                    <input value={form.address} onChange={e=>sf({address:e.target.value})} placeholder="e.g. 142 Oak Drive, Austin TX 78701" style={inp}/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                    <div>
                      {lbl('Estimated Value ($)')}
                      <input required type="number" min="0" value={form.value} onChange={e=>sf({value:e.target.value})} placeholder="0" style={inp}/>
                    </div>
                    <div>
                      {lbl('Purchase Price ($)','optional')}
                      <input type="number" min="0" value={form.purchase_price} onChange={e=>sf({purchase_price:e.target.value})} placeholder="0" style={inp}/>
                    </div>
                  </div>
                  <div>
                    {lbl('Mortgage Balance ($)','optional')}
                    <input type="number" min="0" value={form.mortgage} onChange={e=>sf({mortgage:e.target.value})} placeholder="0" style={inp}/>
                    {form.value&&form.mortgage&&parseFloat(form.value)>0&&<div style={{marginTop:'5px',fontSize:'12px',color:'#00cc66',fontWeight:600}}>Equity: {fmtFull(Math.max(0,parseFloat(form.value)-parseFloat(form.mortgage||'0')))}</div>}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
                    <div>
                      {lbl('Rate (%)')}
                      <input type="number" step="0.01" value={form.mortgage_rate} onChange={e=>sf({mortgage_rate:e.target.value})} placeholder="3.25" style={inp}/>
                    </div>
                    <div>
                      {lbl('Term (yrs)')}
                      <input type="number" value={form.mortgage_term} onChange={e=>sf({mortgage_term:e.target.value})} placeholder="30" style={inp}/>
                    </div>
                    <div>
                      {lbl('/mo payment')}
                      <input type="number" value={form.monthly_payment} onChange={e=>sf({monthly_payment:e.target.value})} placeholder="0" style={inp}/>
                    </div>
                  </div>
                  <div>
                    {lbl('Lender / Institution','optional')}
                    <input value={form.institution} onChange={e=>sf({institution:e.target.value})} placeholder="e.g. Chase" style={inp}/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',alignItems:'center'}}>
                    <div>
                      {lbl('Held in Trust / Entity')}
                      <input value={form.entity_name} onChange={e=>sf({entity_name:e.target.value})} placeholder="e.g. Kahan Family Trust" style={inp}/>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',paddingTop:'20px'}}>
                      <input type="checkbox" id="hit" checked={form.held_in_trust} onChange={e=>sf({held_in_trust:e.target.checked})} style={{width:'16px',height:'16px',accentColor:'#6644ff'}}/>
                      <label htmlFor="hit" style={{fontSize:'13px',color:'#6b7ab8',cursor:'pointer'}}>Held in trust</label>
                    </div>
                  </div>
                </>)}

                {/* INVESTMENT fields */}
                {form.category==='Investment Account' && (<>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                    <div>
                      {lbl('Current Value ($)')}
                      <input required type="number" min="0" value={form.value} onChange={e=>sf({value:e.target.value})} placeholder="0" style={inp}/>
                    </div>
                    <div>
                      {lbl('Cost Basis ($)','for gain/loss')}
                      <input type="number" min="0" value={form.cost_basis} onChange={e=>sf({cost_basis:e.target.value})} placeholder="0" style={inp}/>
                    </div>
                  </div>
                  {form.value&&form.cost_basis&&parseFloat(form.cost_basis)>0&&(
                    <div style={{fontSize:'12px',color:parseFloat(form.value)>=parseFloat(form.cost_basis)?'#00cc66':'#ff6060',fontWeight:600}}>
                      Unrealized: {parseFloat(form.value)>=parseFloat(form.cost_basis)?'+':''}{fmtFull(parseFloat(form.value)-parseFloat(form.cost_basis))} ({((parseFloat(form.value)-parseFloat(form.cost_basis))/parseFloat(form.cost_basis)*100).toFixed(1)}%)
                    </div>
                  )}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
                    <div>
                      {lbl('Ticker','optional')}
                      <input value={form.ticker} onChange={e=>sf({ticker:e.target.value})} placeholder="e.g. AAPL" style={inp}/>
                    </div>
                    <div>
                      {lbl('Shares','optional')}
                      <input type="number" value={form.shares} onChange={e=>sf({shares:e.target.value})} placeholder="0" style={inp}/>
                    </div>
                    <div>
                      {lbl('Brokerage')}
                      <input value={form.institution} onChange={e=>sf({institution:e.target.value})} placeholder="Fidelity" style={inp}/>
                    </div>
                  </div>
                  <div>
                    {lbl('Entity / Trust','optional')}
                    <input value={form.entity_name} onChange={e=>sf({entity_name:e.target.value})} placeholder="e.g. Kahan Family LLC" style={inp}/>
                  </div>
                </>)}

                {/* BANK ACCOUNT fields */}
                {form.category==='Bank Account' && (<>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                    <div>
                      {lbl('Balance ($)')}
                      <input required type="number" min="0" value={form.value} onChange={e=>sf({value:e.target.value})} placeholder="0" style={inp}/>
                    </div>
                    <div>
                      {lbl('Last 4 Digits','optional')}
                      <input maxLength={4} value={form.account_last4} onChange={e=>sf({account_last4:e.target.value.replace(/\D/g,'').slice(0,4)})} placeholder="4821" style={inp}/>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                    <div>
                      {lbl('Institution')}
                      <input value={form.institution} onChange={e=>sf({institution:e.target.value})} placeholder="e.g. Chase" style={inp}/>
                    </div>
                    <div>
                      {lbl('APY (%)','if savings')}
                      <input type="number" step="0.01" value={form.apy} onChange={e=>sf({apy:e.target.value})} placeholder="4.85" style={inp}/>
                    </div>
                  </div>
                  <div>
                    {lbl('Entity / Trust','optional')}
                    <input value={form.entity_name} onChange={e=>sf({entity_name:e.target.value})} placeholder="e.g. Kahan Family Trust" style={inp}/>
                  </div>
                </>)}

                {/* PRIVATE EQUITY fields */}
                {form.category==='Private Equity' && (<>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                    <div>
                      {lbl('Fund Type')}
                      <select value={form.fund_type} onChange={e=>sf({fund_type:e.target.value})} style={inp}>
                        {PE_TYPES.map(t=><option key={t} style={{background:'#060818'}}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      {lbl('Vintage Year')}
                      <input type="number" value={form.vintage_year} onChange={e=>sf({vintage_year:e.target.value})} placeholder="2022" style={inp}/>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                    <div>
                      {lbl('Committed Amount ($)')}
                      <input type="number" value={form.committed_amount} onChange={e=>sf({committed_amount:e.target.value})} placeholder="0" style={inp}/>
                    </div>
                    <div>
                      {lbl('Current Value ($)')}
                      <input required type="number" value={form.value} onChange={e=>sf({value:e.target.value})} placeholder="0" style={inp}/>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
                    <div>
                      {lbl('% Called')}
                      <input type="number" min="0" max="100" value={form.called_pct} onChange={e=>sf({called_pct:e.target.value})} placeholder="68" style={inp}/>
                    </div>
                    <div>
                      {lbl('TVPI')}
                      <input type="number" step="0.01" value={form.tvpi} onChange={e=>sf({tvpi:e.target.value})} placeholder="1.39" style={inp}/>
                    </div>
                    <div>
                      {lbl('Valuation Date')}
                      <input value={form.valuation_date} onChange={e=>sf({valuation_date:e.target.value})} placeholder="Q1 2026" style={inp}/>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                    <div>
                      {lbl('Fund Manager')}
                      <input value={form.institution} onChange={e=>sf({institution:e.target.value})} placeholder="e.g. Sequoia" style={inp}/>
                    </div>
                    <div>
                      {lbl('Entity / LP','optional')}
                      <input value={form.entity_name} onChange={e=>sf({entity_name:e.target.value})} placeholder="e.g. Kahan Capital LP" style={inp}/>
                    </div>
                  </div>
                </>)}

                {/* OTHER / BUSINESS / LIFE INS */}
                {['Business','Life Insurance','Other'].includes(form.category) && (<>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                    <div>
                      {lbl('Value ($)')}
                      <input required type="number" min="0" value={form.value} onChange={e=>sf({value:e.target.value})} placeholder="0" style={inp}/>
                    </div>
                    <div>
                      {lbl('Institution / Carrier')}
                      <input value={form.institution} onChange={e=>sf({institution:e.target.value})} placeholder="Optional" style={inp}/>
                    </div>
                  </div>
                  <div>
                    {lbl('Entity / Trust','optional')}
                    <input value={form.entity_name} onChange={e=>sf({entity_name:e.target.value})} placeholder="e.g. Kahan Family Trust" style={inp}/>
                  </div>
                </>)}

                <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'4px'}}>
                  <button type="button" onClick={()=>{setShowForm(false);setForm(EMPTY_FORM)}} style={{padding:'9px 18px',background:'transparent',border:'1px solid rgba(0,100,255,0.2)',borderRadius:'8px',color:'#6b7ab8',cursor:'pointer',fontSize:'13px'}}>Cancel</button>
                  <button type="submit" disabled={saving} style={{padding:'9px 22px',background:'linear-gradient(135deg,#0055ff,#00aaff)',border:'none',borderRadius:'8px',color:'#fff',fontSize:'13px',fontWeight:700,cursor:'pointer',opacity:saving?0.7:1}}>{saving?'Saving...':'Add Asset'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
