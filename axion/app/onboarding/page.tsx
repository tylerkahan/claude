'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const TOTAL_STEPS = 6

const CRYPTO_COINS = ['BTC', 'ETH', 'SOL', 'USDC', 'BNB', 'XRP', 'ADA', 'AVAX', 'DOGE', 'MATIC', 'LTC', 'LINK']

export default function OnboardingPage() {
  const [user, setUser] = useState<any>(null)
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  // Step 1 — Personal Info
  const [personal, setPersonal] = useState({ full_name: '', date_of_birth: '', state: '', marital_status: 'Single' })

  // Step 2 — Family
  const [family, setFamily] = useState({ spouse_name: '', num_children: '0', has_dependents_special_needs: false })
  const [children, setChildren] = useState<{ name: string; age: string }[]>([])

  // Step 3 — Assets
  const [assetTypes, setAssetTypes] = useState<string[]>([])
  const [estateEstimate, setEstateEstimate] = useState('')

  // Step 4 — Integrations
  const [plaidReady, setPlaidReady] = useState(false)
  const [plaidConfigured, setPlaidConfigured] = useState(true)
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([])
  const [accountBalances, setAccountBalances] = useState<any[]>([])
  const [cryptoForm, setCryptoForm] = useState({ symbol: 'BTC', amount: '' })
  const [cryptoPrice, setCryptoPrice] = useState<number | null>(null)
  const [cryptoSaving, setCryptoSaving] = useState(false)
  const [showCryptoForm, setShowCryptoForm] = useState(false)
  const [propForm, setPropForm] = useState({ address: '', value: '' })
  const [propSaving, setPropSaving] = useState(false)
  const [showPropForm, setShowPropForm] = useState(false)

  // Step 5 — Documents
  const [docs, setDocs] = useState({ has_will: '', has_trust: '', has_poa: '', has_healthcare: '' })

  // Step 6 — Goals
  const [goals, setGoals] = useState<string[]>([])

  const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
  const ASSET_TYPES = ['Real Estate', 'Investment Accounts', 'Bank Accounts', 'Crypto / Digital Assets', 'Business Interest', 'Life Insurance', 'Retirement Accounts (401k/IRA)']
  const GOAL_OPTIONS = ['Protect my family if I die', 'Organize all my documents', 'Reduce estate taxes', 'Avoid probate', 'Plan for incapacity', 'Pass on my business', 'Protect assets from creditors']

  // Load Plaid script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    script.onload = () => setPlaidReady(true)
    document.body.appendChild(script)
  }, [])

  // Live crypto price
  useEffect(() => {
    if (!cryptoForm.symbol) return
    fetch(`/api/crypto/prices?symbols=${cryptoForm.symbol}`)
      .then(r => r.json())
      .then(d => setCryptoPrice(d[cryptoForm.symbol] ?? null))
      .catch(() => setCryptoPrice(null))
  }, [cryptoForm.symbol])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: profile } = await supabase.from('profiles').select('onboarding_complete').eq('id', user.id).single()
      if (profile?.onboarding_complete) { router.push('/dashboard'); return }
    }
    load()
  }, [router])

  async function refreshConnected(userId: string) {
    const supabase = createClient()
    const [{ data: c }, { data: b }] = await Promise.all([
      supabase.from('connected_accounts').select('*').eq('user_id', userId),
      supabase.from('account_balances').select('*').eq('user_id', userId),
    ])
    setConnectedAccounts(c ?? [])
    setAccountBalances(b ?? [])
  }

  function updateChildCount(n: number) {
    setFamily(f => ({ ...f, num_children: String(n) }))
    setChildren(prev => {
      const arr = [...prev]
      while (arr.length < n) arr.push({ name: '', age: '' })
      return arr.slice(0, n)
    })
  }

  function toggleAsset(a: string) { setAssetTypes(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]) }
  function toggleGoal(g: string) { setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]) }

  // ── Plaid ─────────────────────────────────────────────
  async function openPlaidLink() {
    try {
      const res = await fetch('/api/plaid/link-token', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        if (data.error.includes('not configured')) { setPlaidConfigured(false); return }
        alert(data.error); return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (window as any).Plaid.create({
        token: data.link_token,
        onSuccess: async (public_token: string, metadata: any) => {
          const r = await fetch('/api/plaid/exchange-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_token, metadata }),
          })
          if ((await r.json()).success) await refreshConnected(user.id)
        },
        onExit: () => {},
      })
      handler.open()
    } catch { alert('Failed to open Plaid Link') }
  }

  // ── Crypto ────────────────────────────────────────────
  async function saveCrypto(e: React.FormEvent) {
    e.preventDefault()
    setCryptoSaving(true)
    const amount = parseFloat(cryptoForm.amount)
    const value = cryptoPrice ? cryptoPrice * amount : 0
    await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        integration_type: 'crypto',
        institution_name: `${cryptoForm.symbol} Wallet`,
        category: 'crypto',
        account_name: `${cryptoForm.amount} ${cryptoForm.symbol}`,
        account_type: 'crypto',
        current_balance: value,
      }),
    })
    setCryptoForm({ symbol: 'BTC', amount: '' })
    setShowCryptoForm(false)
    await refreshConnected(user.id)
    setCryptoSaving(false)
  }

  // ── Property ──────────────────────────────────────────
  async function saveProperty(e: React.FormEvent) {
    e.preventDefault()
    setPropSaving(true)
    await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        integration_type: 'real_estate',
        institution_name: propForm.address || 'Property',
        category: 'real_estate',
        account_name: propForm.address || 'Real Estate',
        account_type: 'real_estate',
        current_balance: parseFloat(propForm.value) || 0,
      }),
    })
    setPropForm({ address: '', value: '' })
    setShowPropForm(false)
    await refreshConnected(user.id)
    setPropSaving(false)
  }

  // ── Finish ────────────────────────────────────────────
  async function finish() {
    setSaving(true)
    const supabase = createClient()

    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: personal.full_name,
      date_of_birth: personal.date_of_birth || null,
      state: personal.state,
      marital_status: personal.marital_status,
      spouse_name: family.spouse_name,
      num_children: parseInt(family.num_children) || 0,
      estate_estimate: estateEstimate,
      goals: goals.join(', '),
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    })

    const complianceMap: Record<string, string> = { has_will: 'will', has_trust: 'trust', has_poa: 'poa', has_healthcare: 'healthcare' }
    const checks = Object.entries(docs).filter(([, v]) => v === 'yes').map(([k]) => ({
      user_id: user.id, check_id: complianceMap[k], completed: true, updated_at: new Date().toISOString()
    }))
    if (checks.length > 0) await supabase.from('compliance_checks').upsert(checks, { onConflict: 'user_id,check_id' })

    // Add manual asset categories (skip Crypto — that went through integrations)
    const nonCryptoTypes = assetTypes.filter(t => !t.toLowerCase().includes('crypto'))
    if (nonCryptoTypes.length > 0 && estateEstimate) {
      const estVal = parseFloat(estateEstimate.replace(/[^0-9.]/g, '')) || 0
      const perAsset = Math.floor(estVal / nonCryptoTypes.length)
      const assetRows = nonCryptoTypes.map(type => ({
        user_id: user.id,
        name: type,
        category: type.includes('Real') ? 'Real Estate' : type.includes('Investment') ? 'Investment Account' : type.includes('Bank') ? 'Bank Account' : type.includes('Business') ? 'Business' : type.includes('Life') ? 'Life Insurance' : 'Other',
        value: perAsset, institution: '',
      }))
      await supabase.from('assets').insert(assetRows)
    }

    router.push('/dashboard')
  }

  const inputStyle = { width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '10px', color: '#e8eaf6', fontSize: '14px', outline: 'none', fontFamily: 'Inter, sans-serif' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '.06em' }

  const steps = [
    { num: 1, label: 'You' },
    { num: 2, label: 'Family' },
    { num: 3, label: 'Assets' },
    { num: 4, label: 'Connect' },
    { num: 5, label: 'Docs' },
    { num: 6, label: 'Goals' },
  ]

  const connectedTotal = accountBalances.reduce((s, b) => s + (b.current_balance || 0), 0)
  const fmt = (n: number) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${(n/1_000).toFixed(1)}K` : `$${n.toLocaleString()}`

  return (
    <div style={{ minHeight: '100vh', background: '#03040d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: step === 4 ? '640px' : '560px', transition: 'max-width .3s ease' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '40px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(0,120,255,0.4)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2L4 19h16L12 2z"/></svg>
          </div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '.07em' }}>AXION</span>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            {steps.map(s => (
              <div key={s.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: step > s.num ? '#00cc66' : step === s.num ? 'linear-gradient(135deg,#0055ff,#00aaff)' : 'rgba(255,255,255,0.05)', border: step >= s.num ? 'none' : '1px solid rgba(0,100,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: step >= s.num ? '#fff' : '#3d4a7a', transition: 'all .3s' }}>
                  {step > s.num ? '✓' : s.num}
                </div>
                <span style={{ fontSize: '10px', color: step >= s.num ? '#6b7ab8' : '#3d4a7a', fontWeight: 600 }}>{s.label}</span>
              </div>
            ))}
          </div>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%`, background: 'linear-gradient(90deg,#0055ff,#00aaff)', borderRadius: '2px', transition: 'width .4s ease' }} />
          </div>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '20px', padding: '36px', backdropFilter: 'blur(20px)' }}>

          {/* ── Step 1 — Personal ── */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>Let's get to know you</h2>
              <p style={{ fontSize: '14px', color: '#6b7ab8', marginBottom: '28px' }}>This helps us personalize your estate plan.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={labelStyle}>Full Legal Name</label>
                  <input value={personal.full_name} onChange={e => setPersonal(p => ({ ...p, full_name: e.target.value }))} placeholder="Jane Smith" style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Date of Birth</label>
                    <input type="date" value={personal.date_of_birth} onChange={e => setPersonal(p => ({ ...p, date_of_birth: e.target.value }))} style={{ ...inputStyle, colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>State of Residence</label>
                    <select value={personal.state} onChange={e => setPersonal(p => ({ ...p, state: e.target.value }))} style={inputStyle}>
                      <option value="" style={{ background: '#060818' }}>Select...</option>
                      {US_STATES.map(s => <option key={s} value={s} style={{ background: '#060818' }}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Marital Status</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {['Single', 'Married', 'Divorced', 'Widowed', 'Domestic Partnership'].map(s => (
                      <button key={s} type="button" onClick={() => setPersonal(p => ({ ...p, marital_status: s }))} style={{ padding: '8px 16px', borderRadius: '20px', border: `1px solid ${personal.marital_status === s ? 'rgba(0,170,255,0.5)' : 'rgba(0,100,255,0.2)'}`, background: personal.marital_status === s ? 'rgba(0,120,255,0.12)' : 'transparent', color: personal.marital_status === s ? '#00aaff' : '#6b7ab8', fontSize: '13px', cursor: 'pointer', fontWeight: personal.marital_status === s ? 700 : 400, transition: 'all .15s' }}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2 — Family ── */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>Your family</h2>
              <p style={{ fontSize: '14px', color: '#6b7ab8', marginBottom: '28px' }}>Who are you planning for?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {(personal.marital_status === 'Married' || personal.marital_status === 'Domestic Partnership') && (
                  <div>
                    <label style={labelStyle}>Spouse / Partner Name</label>
                    <input value={family.spouse_name} onChange={e => setFamily(f => ({ ...f, spouse_name: e.target.value }))} placeholder="Partner's full name" style={inputStyle} />
                  </div>
                )}
                <div>
                  <label style={labelStyle}>Number of Children</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {[0,1,2,3,4,5,'6+'].map(n => (
                      <button key={n} type="button" onClick={() => updateChildCount(n === '6+' ? 6 : Number(n))} style={{ width: '44px', height: '44px', borderRadius: '10px', border: `1px solid ${family.num_children === String(n === '6+' ? 6 : n) ? 'rgba(0,170,255,0.5)' : 'rgba(0,100,255,0.2)'}`, background: family.num_children === String(n === '6+' ? 6 : n) ? 'rgba(0,120,255,0.12)' : 'transparent', color: family.num_children === String(n === '6+' ? 6 : n) ? '#00aaff' : '#6b7ab8', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>{n}</button>
                    ))}
                  </div>
                </div>
                {children.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={labelStyle}>Children&apos;s Names &amp; Ages</label>
                    {children.map((c, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                        <input value={c.name} onChange={e => { const a = [...children]; a[i] = { ...a[i], name: e.target.value }; setChildren(a) }} placeholder={`Child ${i + 1} name`} style={inputStyle} />
                        <input type="number" value={c.age} onChange={e => { const a = [...children]; a[i] = { ...a[i], age: e.target.value }; setChildren(a) }} placeholder="Age" style={{ ...inputStyle, width: '70px' }} />
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <label style={{ ...labelStyle, marginBottom: '10px' }}>Any dependents with special needs?</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {['Yes', 'No'].map(v => (
                      <button key={v} type="button" onClick={() => setFamily(f => ({ ...f, has_dependents_special_needs: v === 'Yes' }))} style={{ padding: '8px 24px', borderRadius: '20px', border: `1px solid ${family.has_dependents_special_needs === (v === 'Yes') ? 'rgba(0,170,255,0.5)' : 'rgba(0,100,255,0.2)'}`, background: family.has_dependents_special_needs === (v === 'Yes') ? 'rgba(0,120,255,0.12)' : 'transparent', color: family.has_dependents_special_needs === (v === 'Yes') ? '#00aaff' : '#6b7ab8', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>{v}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3 — Assets ── */}
          {step === 3 && (
            <div>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>Your assets</h2>
              <p style={{ fontSize: '14px', color: '#6b7ab8', marginBottom: '28px' }}>Select everything that applies. We&apos;ll help you connect the accounts in the next step.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
                {ASSET_TYPES.map(a => (
                  <button key={a} type="button" onClick={() => toggleAsset(a)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${assetTypes.includes(a) ? 'rgba(0,170,255,0.4)' : 'rgba(0,100,255,0.15)'}`, background: assetTypes.includes(a) ? 'rgba(0,120,255,0.1)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: `2px solid ${assetTypes.includes(a) ? '#00aaff' : 'rgba(0,100,255,0.3)'}`, background: assetTypes.includes(a) ? '#00aaff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {assetTypes.includes(a) && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: '14px', color: assetTypes.includes(a) ? '#fff' : '#6b7ab8', fontWeight: assetTypes.includes(a) ? 600 : 400 }}>{a}</span>
                  </button>
                ))}
              </div>
              <div>
                <label style={labelStyle}>Rough total estate value (optional)</label>
                <select value={estateEstimate} onChange={e => setEstateEstimate(e.target.value)} style={inputStyle}>
                  <option value="" style={{ background: '#060818' }}>Prefer not to say</option>
                  <option value="250000" style={{ background: '#060818' }}>Under $500K</option>
                  <option value="750000" style={{ background: '#060818' }}>$500K – $1M</option>
                  <option value="2000000" style={{ background: '#060818' }}>$1M – $3M</option>
                  <option value="6000000" style={{ background: '#060818' }}>$3M – $10M</option>
                  <option value="15000000" style={{ background: '#060818' }}>$10M+</option>
                </select>
              </div>
            </div>
          )}

          {/* ── Step 4 — Connect Accounts ── */}
          {step === 4 && (
            <div>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>Connect your accounts</h2>
              <p style={{ fontSize: '14px', color: '#6b7ab8', marginBottom: '24px' }}>Link your financial accounts for a live, accurate estate value. Everything is optional — you can always add more later.</p>

              {/* Connected total pill */}
              {connectedTotal > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,200,80,0.07)', border: '1px solid rgba(0,200,80,0.2)', borderRadius: '12px', padding: '10px 16px', marginBottom: '20px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00cc66', boxShadow: '0 0 6px #00cc66', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: '13px', color: '#6b7ab8' }}>Connected so far:</span>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff', fontFamily: "'Space Grotesk',sans-serif", marginLeft: 'auto' }}>{fmt(connectedTotal)}</span>
                </div>
              )}

              {/* Connected accounts list */}
              {connectedAccounts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {connectedAccounts.map(conn => {
                    const bal = accountBalances.filter(b => b.connected_account_id === conn.id).reduce((s, b) => s + (b.current_balance || 0), 0)
                    return (
                      <div key={conn.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'rgba(0,200,80,0.05)', border: '1px solid rgba(0,200,80,0.15)', borderRadius: '10px' }}>
                        <span style={{ fontSize: '16px' }}>{conn.category === 'crypto' ? '₿' : conn.category === 'real_estate' ? '🏠' : conn.category === 'investment' ? '📈' : '🏦'}</span>
                        <span style={{ fontSize: '13px', color: '#e8eaf6', flex: 1, fontWeight: 600 }}>{conn.institution_name}</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#00cc66' }}>{fmt(bal)}</span>
                        <span style={{ fontSize: '11px', color: '#00cc66' }}>✓</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Connection options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* Plaid — Bank / Brokerage */}
                <div style={{ background: 'rgba(0,85,255,0.06)', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '14px', padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '26px' }}>🏦</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>Bank &amp; Brokerage Accounts</div>
                      <div style={{ fontSize: '12px', color: '#6b7ab8' }}>Fidelity, Schwab, Chase, and 12,000+ more via Plaid</div>
                    </div>
                    {!plaidConfigured ? (
                      <span style={{ fontSize: '11px', color: '#ffaa00', fontWeight: 600, background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: '6px', padding: '4px 10px' }}>Setup required</span>
                    ) : (
                      <button onClick={openPlaidLink} disabled={!plaidReady} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: plaidReady ? 'pointer' : 'not-allowed', opacity: plaidReady ? 1 : 0.6, flexShrink: 0 }}>
                        + Connect
                      </button>
                    )}
                  </div>
                  {!plaidConfigured && (
                    <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7ab8', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '10px 12px' }}>
                      Add <code style={{ color: '#00aaff' }}>PLAID_CLIENT_ID</code>, <code style={{ color: '#00aaff' }}>PLAID_SECRET</code>, and <code style={{ color: '#00aaff' }}>PLAID_ENV=sandbox</code> to your Vercel environment variables to enable bank connections.
                    </div>
                  )}
                </div>

                {/* Crypto */}
                <div style={{ background: 'rgba(247,147,26,0.05)', border: '1px solid rgba(247,147,26,0.18)', borderRadius: '14px', padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '26px' }}>₿</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>Crypto Holdings</div>
                      <div style={{ fontSize: '12px', color: '#6b7ab8' }}>Connect Coinbase for live balances, or enter manually</div>
                    </div>
                  </div>

                  {/* Coinbase OAuth row */}
                  {(() => {
                    const cbConnected = connectedAccounts.some(a => a.integration_type === 'coinbase')
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: cbConnected ? 'rgba(0,204,102,0.06)' : 'rgba(0,82,255,0.06)', border: `1px solid ${cbConnected ? 'rgba(0,204,102,0.2)' : 'rgba(0,82,255,0.2)'}`, borderRadius: '10px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '16px' }}>🔵</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: cbConnected ? '#00cc66' : '#fff' }}>
                            {cbConnected ? '✓ Coinbase connected' : 'Coinbase'}
                          </span>
                          <span style={{ fontSize: '11px', color: '#6b7ab8', marginLeft: '8px' }}>{cbConnected ? 'Live balances synced' : 'Live wallet balances via OAuth'}</span>
                        </div>
                        {cbConnected ? (
                          <button onClick={() => refreshConnected(user.id)} style={{ padding: '5px 12px', background: 'transparent', border: '1px solid rgba(0,204,102,0.3)', borderRadius: '7px', color: '#00cc66', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>↻ Refresh</button>
                        ) : (
                          <a href="/api/coinbase/auth?source=onboarding" target="_blank" rel="noopener noreferrer" onClick={() => setTimeout(() => refreshConnected(user?.id), 8000)}
                            style={{ padding: '5px 14px', background: 'rgba(247,147,26,0.15)', border: '1px solid rgba(247,147,26,0.35)', borderRadius: '7px', color: '#f7931a', fontSize: '11px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', flexShrink: 0 }}>
                            Connect →
                          </a>
                        )}
                      </div>
                    )
                  })()}

                  {/* Manual toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showCryptoForm ? '12px' : '0' }}>
                    <span style={{ fontSize: '12px', color: '#6b7ab8' }}>Other wallets / self-custody (manual)</span>
                    <button onClick={() => setShowCryptoForm(v => !v)} style={{ padding: '5px 14px', background: showCryptoForm ? 'transparent' : 'rgba(247,147,26,0.12)', border: '1px solid rgba(247,147,26,0.3)', borderRadius: '7px', color: '#f7931a', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                      {showCryptoForm ? 'Cancel' : '+ Add Manually'}
                    </button>
                  </div>

                  {showCryptoForm && (
                    <form onSubmit={saveCrypto} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={labelStyle}>Coin</label>
                          <select value={cryptoForm.symbol} onChange={e => setCryptoForm(p => ({ ...p, symbol: e.target.value }))}
                            style={{ ...inputStyle, border: '1px solid rgba(247,147,26,0.25)' }}>
                            {CRYPTO_COINS.map(c => <option key={c} style={{ background: '#060818' }}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Amount</label>
                          <input required type="number" step="any" min="0" value={cryptoForm.amount} onChange={e => setCryptoForm(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 0.5"
                            style={{ ...inputStyle, border: '1px solid rgba(247,147,26,0.25)' }} />
                        </div>
                      </div>
                      {cryptoPrice && cryptoForm.amount && (
                        <div style={{ background: 'rgba(247,147,26,0.08)', border: '1px solid rgba(247,147,26,0.2)', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#6b7ab8' }}>Live value ({cryptoForm.symbol} @ ${cryptoPrice.toLocaleString()})</span>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#f7931a' }}>{fmt(cryptoPrice * parseFloat(cryptoForm.amount || '0'))}</span>
                        </div>
                      )}
                      <button type="submit" disabled={cryptoSaving} style={{ padding: '9px', background: 'rgba(247,147,26,0.15)', border: '1px solid rgba(247,147,26,0.3)', borderRadius: '8px', color: '#f7931a', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                        {cryptoSaving ? 'Saving...' : 'Add Holding'}
                      </button>
                    </form>
                  )}
                </div>

                {/* Real Estate */}
                <div style={{ background: 'rgba(102,68,255,0.05)', border: '1px solid rgba(102,68,255,0.18)', borderRadius: '14px', padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: showPropForm ? '16px' : '0' }}>
                    <span style={{ fontSize: '26px' }}>🏠</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>Real Estate</div>
                      <div style={{ fontSize: '12px', color: '#6b7ab8' }}>Add properties by address and estimated value</div>
                    </div>
                    <button onClick={() => setShowPropForm(v => !v)} style={{ padding: '8px 18px', background: showPropForm ? 'transparent' : 'rgba(102,68,255,0.12)', border: '1px solid rgba(102,68,255,0.3)', borderRadius: '8px', color: '#aa88ff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                      {showPropForm ? 'Cancel' : '+ Add Property'}
                    </button>
                  </div>
                  {showPropForm && (
                    <form onSubmit={saveProperty} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={labelStyle}>Property Address</label>
                        <input required value={propForm.address} onChange={e => setPropForm(p => ({ ...p, address: e.target.value }))} placeholder="e.g. 123 Oak Drive, Austin, TX 78701"
                          style={{ ...inputStyle, border: '1px solid rgba(102,68,255,0.25)' }} />
                      </div>
                      <div>
                        <label style={labelStyle}>Estimated Value ($)</label>
                        <input required type="number" min="0" value={propForm.value} onChange={e => setPropForm(p => ({ ...p, value: e.target.value }))} placeholder="e.g. 850000"
                          style={{ ...inputStyle, border: '1px solid rgba(102,68,255,0.25)' }} />
                      </div>
                      <button type="submit" disabled={propSaving} style={{ padding: '9px', background: 'rgba(102,68,255,0.12)', border: '1px solid rgba(102,68,255,0.3)', borderRadius: '8px', color: '#aa88ff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                        {propSaving ? 'Saving...' : 'Add Property'}
                      </button>
                    </form>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ── Step 5 — Documents ── */}
          {step === 5 && (
            <div>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>Your documents</h2>
              <p style={{ fontSize: '14px', color: '#6b7ab8', marginBottom: '28px' }}>Do you already have these? We&apos;ll mark them complete in your checklist.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { key: 'has_will', label: 'Last Will & Testament', desc: 'A signed, witnessed will' },
                  { key: 'has_trust', label: 'Trust', desc: 'Revocable living trust or irrevocable trust' },
                  { key: 'has_poa', label: 'Power of Attorney', desc: 'Durable POA for finances' },
                  { key: 'has_healthcare', label: 'Healthcare Directive / Living Will', desc: 'Medical wishes and proxy' },
                ].map(item => (
                  <div key={item.key} style={{ padding: '16px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,100,255,0.12)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '3px' }}>{item.label}</div>
                    <div style={{ fontSize: '12px', color: '#6b7ab8', marginBottom: '12px' }}>{item.desc}</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['yes', 'no', 'not sure'].map(v => (
                        <button key={v} type="button" onClick={() => setDocs(d => ({ ...d, [item.key]: v }))} style={{ padding: '6px 16px', borderRadius: '20px', border: `1px solid ${(docs as any)[item.key] === v ? 'rgba(0,170,255,0.5)' : 'rgba(0,100,255,0.18)'}`, background: (docs as any)[item.key] === v ? 'rgba(0,120,255,0.12)' : 'transparent', color: (docs as any)[item.key] === v ? '#00aaff' : '#6b7ab8', fontSize: '12px', cursor: 'pointer', fontWeight: (docs as any)[item.key] === v ? 700 : 400, textTransform: 'capitalize' }}>{v}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 6 — Goals ── */}
          {step === 6 && (
            <div>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>What brings you here?</h2>
              <p style={{ fontSize: '14px', color: '#6b7ab8', marginBottom: '28px' }}>Select all that apply. This helps us prioritize what matters most.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {GOAL_OPTIONS.map(g => (
                  <button key={g} type="button" onClick={() => toggleGoal(g)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', borderRadius: '12px', border: `1px solid ${goals.includes(g) ? 'rgba(0,170,255,0.4)' : 'rgba(0,100,255,0.15)'}`, background: goals.includes(g) ? 'rgba(0,120,255,0.1)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${goals.includes(g) ? '#00aaff' : 'rgba(0,100,255,0.3)'}`, background: goals.includes(g) ? '#00aaff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {goals.includes(g) && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: '14px', color: goals.includes(g) ? '#fff' : '#6b7ab8', fontWeight: goals.includes(g) ? 600 : 400 }}>{g}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '10px', color: '#6b7ab8', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>← Back</button>
            ) : (
              <button onClick={() => router.push('/dashboard')} style={{ padding: '10px 20px', background: 'transparent', border: 'none', color: '#3d4a7a', cursor: 'pointer', fontSize: '13px' }}>Skip setup</button>
            )}

            {step === 4 && (
              <button onClick={() => setStep(s => s + 1)} style={{ padding: '10px 20px', background: 'transparent', border: 'none', color: '#3d4a7a', cursor: 'pointer', fontSize: '13px' }}>Skip for now →</button>
            )}

            {step < TOTAL_STEPS ? (
              <button onClick={() => setStep(s => s + 1)} style={{ padding: '11px 28px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 20px rgba(0,100,255,0.25)' }}>
                {step === 4 && connectedAccounts.length > 0 ? 'Continue →' : step === 4 ? 'Continue →' : 'Continue →'}
              </button>
            ) : (
              <button onClick={finish} disabled={saving} style={{ padding: '11px 28px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 0 20px rgba(0,100,255,0.25)', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Setting up...' : '🎉 Go to my dashboard'}
              </button>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#3d4a7a' }}>
          Your information is encrypted and never shared.
        </div>
      </div>
    </div>
  )
}
