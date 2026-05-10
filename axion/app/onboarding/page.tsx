'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const TOTAL_STEPS = 8

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
const CRYPTO_COINS = ['BTC','ETH','SOL','USDC','BNB','XRP','ADA','AVAX','DOGE','MATIC','LTC','LINK']
const ENTITY_TYPES = ['Revocable Trust','Irrevocable Trust','LLC','LP','S-Corp','C-Corp','Other']
const DA_TYPES = ['Email','Social Media','Crypto Wallet','Exchange Account','Streaming','Domain/Website','Password Manager','Banking App','Other']
const GOAL_OPTIONS = ['Protect my family if I die','Organize all my documents','Reduce estate taxes','Avoid probate','Plan for incapacity','Pass on my business','Protect assets from creditors']

export default function OnboardingPage() {
  const [user, setUser] = useState<any>(null)
  const [step, setStep]   = useState(1)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const router = useRouter()

  // ── Step 1 — Personal ─────────────────────────────────────────────────────
  const [personal, setPersonal] = useState({ full_name:'', date_of_birth:'', state:'', marital_status:'Single' })

  // ── Step 2 — Contact ──────────────────────────────────────────────────────
  const [contact, setContact] = useState({ address:'', city:'', zip:'', phone:'' })

  // ── Step 3 — Family ───────────────────────────────────────────────────────
  const [spouseInfo, setSpouseInfo] = useState({ name:'', phone:'', date_of_birth:'' })
  const [numChildren, setNumChildren] = useState(0)
  const [children, setChildren] = useState<{name:string;date_of_birth:string;phone:string;is_dependent:boolean}[]>([])
  const [hasSpecialNeeds, setHasSpecialNeeds] = useState(false)

  // ── Step 4 — Beneficiaries ────────────────────────────────────────────────
  const [beneficiaries, setBeneficiaries] = useState<any[]>([])
  const [showBenForm, setShowBenForm] = useState(false)
  const [benForm, setBenForm] = useState({ full_name:'', relationship:'', email:'', phone:'', percentage:'', role:'Primary' })
  const [benSaving, setBenSaving] = useState(false)

  // ── Step 5 — Entities ─────────────────────────────────────────────────────
  const [entities, setEntities] = useState<any[]>([])
  const [showEntityForm, setShowEntityForm] = useState(false)
  const [entityForm, setEntityForm] = useState({ name:'', type:'LLC', state:'', ein:'', ownership_display:'', est_date:'' })
  const [entitySaving, setEntitySaving] = useState(false)

  // ── Step 6 — Accounts (Plaid / Crypto / Real Estate) ─────────────────────
  const [plaidReady, setPlaidReady] = useState(false)
  const [plaidConfigured, setPlaidConfigured] = useState(true)
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([])
  const [accountBalances, setAccountBalances] = useState<any[]>([])
  const [cryptoForm, setCryptoForm] = useState({ symbol:'BTC', amount:'' })
  const [cryptoPrice, setCryptoPrice] = useState<number|null>(null)
  const [cryptoSaving, setCryptoSaving] = useState(false)
  const [showCryptoForm, setShowCryptoForm] = useState(false)
  const [propForm, setPropForm] = useState({ address:'', value:'', mortgage:'' })
  const [propSaving, setPropSaving] = useState(false)
  const [showPropForm, setShowPropForm] = useState(false)

  // ── Step 7 — Digital Assets ───────────────────────────────────────────────
  const [digitalAssets, setDigitalAssets] = useState<any[]>([])
  const [showDaForm, setShowDaForm] = useState(false)
  const [daForm, setDaForm] = useState({ platform:'', type:'Email', username:'', password:'', notes:'', instructions:'No action needed' })
  const [daSaving, setDaSaving] = useState(false)
  const [revealPw, setRevealPw] = useState<Record<string,boolean>>({})

  // ── Step 8 — Documents & Goals ────────────────────────────────────────────
  const [docs, setDocs] = useState({ has_will:'', has_trust:'', has_poa:'', has_healthcare:'' })
  const [goals, setGoals] = useState<string[]>([])
  const [estateEstimate, setEstateEstimate] = useState('')

  // ── Plaid script ─────────────────────────────────────────────────────────
  useEffect(() => {
    const s = document.createElement('script')
    s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    s.onload = () => setPlaidReady(true)
    document.body.appendChild(s)
  }, [])

  // ── Live crypto price ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!cryptoForm.symbol) return
    fetch(`/api/crypto/prices?symbols=${cryptoForm.symbol}`)
      .then(r => r.json()).then(d => setCryptoPrice(d[cryptoForm.symbol] ?? null)).catch(() => setCryptoPrice(null))
  }, [cryptoForm.symbol])

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: profile } = await supabase.from('profiles').select('onboarding_complete').eq('id', user.id).single()
      if (profile?.onboarding_complete) { router.push('/dashboard'); return }
      // Pre-load existing data
      const [{ data: bens }, { data: ents }, { data: das }] = await Promise.all([
        supabase.from('beneficiaries').select('*').eq('user_id', user.id),
        supabase.from('entities').select('*').eq('user_id', user.id),
        supabase.from('digital_assets').select('*').eq('user_id', user.id),
      ])
      setBeneficiaries(bens ?? [])
      setEntities(ents ?? [])
      setDigitalAssets(das ?? [])
      await refreshConnected(user.id)
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

  // ── Validation per step ───────────────────────────────────────────────────
  function validate(): string {
    if (step === 1) {
      if (!personal.full_name.trim()) return 'Your full legal name is required.'
      if (!personal.state) return 'Please select your state of residence.'
    }
    return ''
  }

  function next() {
    const e = validate()
    if (e) { setErr(e); return }
    setErr('')
    setStep(s => s + 1)
  }

  // ── Child count helper ────────────────────────────────────────────────────
  function updateChildCount(n: number) {
    setNumChildren(n)
    setChildren(prev => {
      const arr = [...prev]
      while (arr.length < n) arr.push({ name:'', date_of_birth:'', phone:'', is_dependent:false })
      return arr.slice(0, n)
    })
  }

  // ── Add Beneficiary ───────────────────────────────────────────────────────
  async function addBeneficiary(e: React.FormEvent) {
    e.preventDefault()
    if (!benForm.full_name.trim()) return
    setBenSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('beneficiaries').insert({
      user_id: user.id,
      full_name: benForm.full_name,
      relationship: benForm.relationship || null,
      email: benForm.email || null,
      phone: benForm.phone || null,
      percentage: parseFloat(benForm.percentage) || null,
      role: benForm.role,
    }).select().single()
    if (data) setBeneficiaries(p => [...p, data])
    setBenForm({ full_name:'', relationship:'', email:'', phone:'', percentage:'', role:'Primary' })
    setShowBenForm(false)
    setBenSaving(false)
  }

  async function removeBeneficiary(id: string) {
    await createClient().from('beneficiaries').delete().eq('id', id)
    setBeneficiaries(p => p.filter(b => b.id !== id))
  }

  // ── Add Entity ────────────────────────────────────────────────────────────
  async function addEntity(e: React.FormEvent) {
    e.preventDefault()
    if (!entityForm.name.trim()) return
    setEntitySaving(true)
    const supabase = createClient()
    const meta: any = {}
    if (entityForm.ownership_display) meta.ownership_display = entityForm.ownership_display
    const { data } = await supabase.from('entities').insert({
      user_id: user.id,
      name: entityForm.name,
      type: entityForm.type,
      state: entityForm.state || null,
      ein: entityForm.ein || null,
      est_date: entityForm.est_date || null,
      status: 'Active',
      metadata: Object.keys(meta).length ? meta : null,
    }).select().single()
    if (data) setEntities(p => [...p, data])
    setEntityForm({ name:'', type:'LLC', state:'', ein:'', ownership_display:'', est_date:'' })
    setShowEntityForm(false)
    setEntitySaving(false)
  }

  async function removeEntity(id: string) {
    await createClient().from('entities').delete().eq('id', id)
    setEntities(p => p.filter(en => en.id !== id))
  }

  // ── Plaid ─────────────────────────────────────────────────────────────────
  async function openPlaidLink() {
    try {
      const res = await fetch('/api/plaid/link-token', { method: 'POST' })
      const data = await res.json()
      if (data.error) { if (data.error.includes('not configured')) { setPlaidConfigured(false); return }; alert(data.error); return }
      const handler = (window as any).Plaid.create({
        token: data.link_token,
        onSuccess: async (public_token: string, metadata: any) => {
          const r = await fetch('/api/plaid/exchange-token', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ public_token, metadata }) })
          if ((await r.json()).success) await refreshConnected(user.id)
        },
        onExit: () => {},
      })
      handler.open()
    } catch { alert('Failed to open Plaid Link') }
  }

  // ── Crypto ────────────────────────────────────────────────────────────────
  async function saveCrypto(e: React.FormEvent) {
    e.preventDefault(); setCryptoSaving(true)
    const amount = parseFloat(cryptoForm.amount)
    const value = cryptoPrice ? cryptoPrice * amount : 0
    await fetch('/api/accounts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ integration_type:'crypto', institution_name:`${cryptoForm.symbol} Wallet`, category:'crypto', account_name:`${cryptoForm.amount} ${cryptoForm.symbol}`, account_type:'crypto', current_balance: value }) })
    setCryptoForm({ symbol:'BTC', amount:'' }); setShowCryptoForm(false)
    await refreshConnected(user.id); setCryptoSaving(false)
  }

  // ── Property ──────────────────────────────────────────────────────────────
  async function saveProperty(e: React.FormEvent) {
    e.preventDefault(); setPropSaving(true)
    const value = parseFloat(propForm.value) || 0
    const mortgage = parseFloat(propForm.mortgage) || 0
    await fetch('/api/accounts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ integration_type:'real_estate', institution_name: propForm.address || 'Property', category:'real_estate', account_name: propForm.address || 'Real Estate', account_type:'real_estate', current_balance: value - mortgage }) })
    setPropForm({ address:'', value:'', mortgage:'' }); setShowPropForm(false)
    await refreshConnected(user.id); setPropSaving(false)
  }

  // ── Digital Asset ─────────────────────────────────────────────────────────
  async function addDigitalAsset(e: React.FormEvent) {
    e.preventDefault()
    if (!daForm.platform.trim()) return
    setDaSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('digital_assets').insert({
      user_id: user.id,
      platform: daForm.platform,
      type: daForm.type,
      username: daForm.username || null,
      password: daForm.password || null,
      instructions: daForm.instructions,
      notes: daForm.notes || null,
    }).select().single()
    if (data) setDigitalAssets(p => [...p, data])
    setDaForm({ platform:'', type:'Email', username:'', password:'', notes:'', instructions:'No action needed' })
    setShowDaForm(false); setDaSaving(false)
  }

  async function removeDigitalAsset(id: string) {
    await createClient().from('digital_assets').delete().eq('id', id)
    setDigitalAssets(p => p.filter(d => d.id !== id))
  }

  // ── Finish ────────────────────────────────────────────────────────────────
  async function finish() {
    setSaving(true)
    const supabase = createClient()

    // Save profile
    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: personal.full_name,
      date_of_birth: personal.date_of_birth || null,
      state: personal.state,
      marital_status: personal.marital_status,
      address: contact.address || null,
      city: contact.city || null,
      zip: contact.zip || null,
      phone: contact.phone || null,
      spouse_name: spouseInfo.name || null,
      num_children: numChildren,
      estate_estimate: estateEstimate,
      goals: goals.join(', '),
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    })

    // Save family members
    const familyRows: any[] = []
    if (spouseInfo.name && (personal.marital_status === 'Married' || personal.marital_status === 'Domestic Partnership')) {
      familyRows.push({ user_id: user.id, name: spouseInfo.name, relationship: 'Spouse', phone: spouseInfo.phone || null, date_of_birth: spouseInfo.date_of_birth || null, is_dependent: false, email: null })
    }
    children.forEach(c => {
      if (c.name) familyRows.push({ user_id: user.id, name: c.name, relationship: 'Child', phone: c.phone || null, date_of_birth: c.date_of_birth || null, is_dependent: c.is_dependent, email: null })
    })
    if (familyRows.length > 0) {
      const { error: upsertErr } = await supabase.from('family_members').upsert(familyRows, { onConflict: 'user_id,name' })
      if (upsertErr) await supabase.from('family_members').insert(familyRows)
    }

    // Save compliance checks
    const complianceMap: Record<string,string> = { has_will:'will', has_trust:'trust', has_poa:'poa', has_healthcare:'healthcare' }
    const checks = Object.entries(docs).filter(([,v]) => v === 'yes').map(([k]) => ({ user_id: user.id, check_id: complianceMap[k], completed: true, updated_at: new Date().toISOString() }))
    if (checks.length > 0) await supabase.from('compliance_checks').upsert(checks, { onConflict: 'user_id,check_id' })

    router.push('/dashboard')
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputStyle = { width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(0,100,255,0.2)', borderRadius:'10px', color:'#e8eaf6', fontSize:'14px', outline:'none', fontFamily:'Inter, sans-serif' }
  const labelStyle: React.CSSProperties = { display:'block', fontSize:'11px', fontWeight:700, color:'#6b7ab8', marginBottom:'7px', textTransform:'uppercase', letterSpacing:'.06em' }

  const steps = [
    { num:1, label:'You' }, { num:2, label:'Contact' }, { num:3, label:'Family' },
    { num:4, label:'Beneficiaries' }, { num:5, label:'Entities' },
    { num:6, label:'Accounts' }, { num:7, label:'Digital' }, { num:8, label:'Finish' },
  ]

  const connectedTotal = accountBalances.reduce((s,b) => s + (b.current_balance || 0), 0)
  const fmt = (n: number) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${(n/1_000).toFixed(1)}K` : `$${n.toLocaleString()}`

  const chipStyle = (active: boolean, color = '#00aaff'): React.CSSProperties => ({
    padding:'8px 16px', borderRadius:'20px', border:`1px solid ${active ? color+'88' : 'rgba(0,100,255,0.2)'}`,
    background: active ? color+'18' : 'transparent', color: active ? color : '#6b7ab8',
    fontSize:'13px', cursor:'pointer', fontWeight: active ? 700 : 400, transition:'all .15s'
  })

  return (
    <div style={{ minHeight:'100vh', background:'#03040d', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px', fontFamily:'Inter, sans-serif' }}>
      <div style={{ width:'100%', maxWidth: step === 6 ? '660px' : '580px', transition:'max-width .3s ease' }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', justifyContent:'center', marginBottom:'36px' }}>
          <div style={{ width:'32px', height:'32px', background:'linear-gradient(135deg,#0055ff,#00aaff)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 16px rgba(0,120,255,0.4)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2L4 19h16L12 2z"/></svg>
          </div>
          <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'22px', fontWeight:800, color:'#fff', letterSpacing:'.07em' }}>AXION</span>
        </div>

        {/* Progress */}
        <div style={{ marginBottom:'28px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
            {steps.map(s => (
              <div key={s.num} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'5px', flex:1 }}>
                <div style={{ width:'26px', height:'26px', borderRadius:'50%', background: step > s.num ? '#00cc66' : step === s.num ? 'linear-gradient(135deg,#0055ff,#00aaff)' : 'rgba(255,255,255,0.04)', border: step >= s.num ? 'none' : '1px solid rgba(0,100,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700, color: step >= s.num ? '#fff' : '#3d4a7a', transition:'all .3s' }}>
                  {step > s.num ? '✓' : s.num}
                </div>
                <span style={{ fontSize:'9px', color: step >= s.num ? '#6b7ab8' : '#3d4a7a', fontWeight:600, textAlign:'center' }}>{s.label}</span>
              </div>
            ))}
          </div>
          <div style={{ height:'3px', background:'rgba(255,255,255,0.04)', borderRadius:'2px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${((step-1)/(TOTAL_STEPS-1))*100}%`, background:'linear-gradient(90deg,#0055ff,#00aaff)', borderRadius:'2px', transition:'width .4s ease' }} />
          </div>
        </div>

        {/* Card */}
        <div style={{ background:'rgba(8,14,40,0.85)', border:'1px solid rgba(0,100,255,0.18)', borderRadius:'20px', padding:'36px', backdropFilter:'blur(20px)' }}>

          {/* ── Step 1 — Personal ─────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'22px', fontWeight:800, color:'#fff', marginBottom:'6px' }}>Let's get to know you</h2>
              <p style={{ fontSize:'14px', color:'#6b7ab8', marginBottom:'28px' }}>This information personalizes your estate plan and powers AI recommendations.</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
                <div>
                  <label style={labelStyle}>Full Legal Name <span style={{ color:'#ff6688' }}>*</span></label>
                  <input value={personal.full_name} onChange={e => setPersonal(p => ({...p, full_name: e.target.value}))} placeholder="Jane Elizabeth Smith" style={{ ...inputStyle, borderColor: err && !personal.full_name.trim() ? 'rgba(255,80,80,0.5)' : 'rgba(0,100,255,0.2)' }} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                  <div>
                    <label style={labelStyle}>Date of Birth</label>
                    <input type="date" value={personal.date_of_birth} onChange={e => setPersonal(p => ({...p, date_of_birth: e.target.value}))} style={{ ...inputStyle, colorScheme:'dark' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>State of Residence <span style={{ color:'#ff6688' }}>*</span></label>
                    <select value={personal.state} onChange={e => setPersonal(p => ({...p, state: e.target.value}))} style={{ ...inputStyle, borderColor: err && !personal.state ? 'rgba(255,80,80,0.5)' : 'rgba(0,100,255,0.2)' }}>
                      <option value="" style={{ background:'#060818' }}>Select state...</option>
                      {US_STATES.map(s => <option key={s} value={s} style={{ background:'#060818' }}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Marital Status</label>
                  <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                    {['Single','Married','Divorced','Widowed','Domestic Partnership'].map(s => (
                      <button key={s} type="button" onClick={() => setPersonal(p => ({...p, marital_status: s}))} style={chipStyle(personal.marital_status === s)}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2 — Contact ─────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'22px', fontWeight:800, color:'#fff', marginBottom:'6px' }}>Contact & Address</h2>
              <p style={{ fontSize:'14px', color:'#6b7ab8', marginBottom:'28px' }}>Used in documents and reports. Stored securely and never shared.</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                <div>
                  <label style={labelStyle}>Street Address</label>
                  <input value={contact.address} onChange={e => setContact(p => ({...p, address: e.target.value}))} placeholder="123 Maple Street" style={inputStyle} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:'12px' }}>
                  <div>
                    <label style={labelStyle}>City</label>
                    <input value={contact.city} onChange={e => setContact(p => ({...p, city: e.target.value}))} placeholder="Austin" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>State</label>
                    <input value={personal.state} readOnly style={{ ...inputStyle, width:'60px', color:'#6b7ab8' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>ZIP</label>
                    <input value={contact.zip} onChange={e => setContact(p => ({...p, zip: e.target.value}))} placeholder="78701" style={{ ...inputStyle, width:'90px' }} maxLength={10} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input type="tel" value={contact.phone} onChange={e => setContact(p => ({...p, phone: e.target.value}))} placeholder="+1 (512) 555-0100" style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3 — Family ──────────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'22px', fontWeight:800, color:'#fff', marginBottom:'6px' }}>Your Family</h2>
              <p style={{ fontSize:'14px', color:'#6b7ab8', marginBottom:'28px' }}>Who are you planning for? This populates your Family Access section.</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

                {/* Spouse */}
                {(personal.marital_status === 'Married' || personal.marital_status === 'Domestic Partnership') && (
                  <div style={{ padding:'18px', background:'rgba(0,170,255,0.04)', border:'1px solid rgba(0,170,255,0.15)', borderRadius:'12px' }}>
                    <div style={{ fontSize:'13px', fontWeight:700, color:'#00aaff', marginBottom:'14px' }}>Spouse / Partner</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                      <div>
                        <label style={labelStyle}>Full Name</label>
                        <input value={spouseInfo.name} onChange={e => setSpouseInfo(p => ({...p, name: e.target.value}))} placeholder="Spouse's full name" style={inputStyle} />
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                        <div>
                          <label style={labelStyle}>Date of Birth</label>
                          <input type="date" value={spouseInfo.date_of_birth} onChange={e => setSpouseInfo(p => ({...p, date_of_birth: e.target.value}))} style={{ ...inputStyle, colorScheme:'dark' }} />
                        </div>
                        <div>
                          <label style={labelStyle}>Phone</label>
                          <input type="tel" value={spouseInfo.phone} onChange={e => setSpouseInfo(p => ({...p, phone: e.target.value}))} placeholder="+1 (512) 555-0100" style={inputStyle} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Children count */}
                <div>
                  <label style={labelStyle}>Number of Children</label>
                  <div style={{ display:'flex', gap:'8px' }}>
                    {[0,1,2,3,4,5,'6+'].map(n => {
                      const val = n === '6+' ? 6 : Number(n)
                      return (
                        <button key={n} type="button" onClick={() => updateChildCount(val)} style={{ width:'44px', height:'44px', borderRadius:'10px', border:`1px solid ${numChildren === val ? 'rgba(0,170,255,0.5)' : 'rgba(0,100,255,0.2)'}`, background: numChildren === val ? 'rgba(0,120,255,0.12)' : 'transparent', color: numChildren === val ? '#00aaff' : '#6b7ab8', fontSize:'14px', fontWeight:700, cursor:'pointer' }}>{n}</button>
                      )
                    })}
                  </div>
                </div>

                {/* Children details */}
                {children.length > 0 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                    {children.map((c, i) => (
                      <div key={i} style={{ padding:'14px', background:'rgba(0,204,102,0.04)', border:'1px solid rgba(0,204,102,0.12)', borderRadius:'10px' }}>
                        <div style={{ fontSize:'12px', fontWeight:700, color:'#00cc66', marginBottom:'10px' }}>Child {i+1}</div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
                          <div>
                            <label style={labelStyle}>Name</label>
                            <input value={c.name} onChange={e => { const a = [...children]; a[i] = {...a[i], name: e.target.value}; setChildren(a) }} placeholder={`Child ${i+1} name`} style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Date of Birth</label>
                            <input type="date" value={c.date_of_birth} onChange={e => { const a = [...children]; a[i] = {...a[i], date_of_birth: e.target.value}; setChildren(a) }} style={{ ...inputStyle, colorScheme:'dark' }} />
                          </div>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'10px', alignItems:'center' }}>
                          <div>
                            <label style={labelStyle}>Phone (if adult)</label>
                            <input type="tel" value={c.phone} onChange={e => { const a = [...children]; a[i] = {...a[i], phone: e.target.value}; setChildren(a) }} placeholder="+1 (512) 555-0100" style={inputStyle} />
                          </div>
                          <div style={{ paddingTop:'22px' }}>
                            <button type="button" onClick={() => { const a = [...children]; a[i] = {...a[i], is_dependent: !a[i].is_dependent}; setChildren(a) }}
                              style={{ padding:'9px 14px', borderRadius:'8px', border:`1px solid ${c.is_dependent ? 'rgba(255,170,0,0.4)' : 'rgba(0,100,255,0.2)'}`, background: c.is_dependent ? 'rgba(255,170,0,0.1)' : 'transparent', color: c.is_dependent ? '#ffaa00' : '#6b7ab8', fontSize:'12px', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                              {c.is_dependent ? '✓ Dependent' : 'Dependent?'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label style={{ ...labelStyle, marginBottom:'10px' }}>Any dependents with special needs?</label>
                  <div style={{ display:'flex', gap:'8px' }}>
                    {['Yes','No'].map(v => (
                      <button key={v} type="button" onClick={() => setHasSpecialNeeds(v === 'Yes')} style={chipStyle(hasSpecialNeeds === (v === 'Yes'))}>{v}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4 — Beneficiaries ───────────────────────────────────── */}
          {step === 4 && (
            <div>
              <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'22px', fontWeight:800, color:'#fff', marginBottom:'6px' }}>Beneficiaries</h2>
              <p style={{ fontSize:'14px', color:'#6b7ab8', marginBottom:'24px' }}>Who receives your assets? Add primary and contingent beneficiaries.</p>

              {beneficiaries.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
                  {beneficiaries.map(b => (
                    <div key={b.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', background:'rgba(0,200,80,0.05)', border:'1px solid rgba(0,200,80,0.15)', borderRadius:'10px' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'14px', fontWeight:700, color:'#fff' }}>{b.full_name}</div>
                        <div style={{ fontSize:'12px', color:'#6b7ab8', marginTop:'2px' }}>
                          {b.relationship && <span>{b.relationship} · </span>}
                          <span style={{ color: b.role === 'Primary' ? '#00aaff' : '#ffaa00' }}>{b.role}</span>
                          {b.percentage && <span style={{ color:'#00cc66' }}> · {b.percentage}%</span>}
                        </div>
                      </div>
                      <button onClick={() => removeBeneficiary(b.id)} style={{ padding:'4px 10px', background:'transparent', border:'1px solid rgba(255,60,60,0.2)', borderRadius:'6px', color:'#ff6666', cursor:'pointer', fontSize:'11px' }}>✕</button>
                    </div>
                  ))}
                  {beneficiaries.filter(b => b.role === 'Primary').reduce((s,b) => s + (b.percentage||0), 0) > 0 && (
                    <div style={{ fontSize:'12px', color: beneficiaries.filter(b => b.role === 'Primary').reduce((s,b) => s + (b.percentage||0), 0) === 100 ? '#00cc66' : '#ffaa00', textAlign:'right', paddingRight:'4px' }}>
                      Primary total: {beneficiaries.filter(b => b.role === 'Primary').reduce((s,b) => s + (b.percentage||0), 0)}%
                      {beneficiaries.filter(b => b.role === 'Primary').reduce((s,b) => s + (b.percentage||0), 0) !== 100 && ' (should equal 100%)'}
                    </div>
                  )}
                </div>
              )}

              {!showBenForm ? (
                <button onClick={() => setShowBenForm(true)} style={{ width:'100%', padding:'12px', background:'rgba(0,85,255,0.06)', border:'1px dashed rgba(0,100,255,0.3)', borderRadius:'12px', color:'#00aaff', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
                  + Add Beneficiary
                </button>
              ) : (
                <form onSubmit={addBeneficiary} style={{ background:'rgba(0,85,255,0.05)', border:'1px solid rgba(0,100,255,0.2)', borderRadius:'14px', padding:'20px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={labelStyle}>Full Name <span style={{ color:'#ff6688' }}>*</span></label>
                      <input required value={benForm.full_name} onChange={e => setBenForm(p => ({...p, full_name: e.target.value}))} placeholder="Full legal name" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Relationship</label>
                      <select value={benForm.relationship} onChange={e => setBenForm(p => ({...p, relationship: e.target.value}))} style={inputStyle}>
                        <option value="" style={{ background:'#060818' }}>Select...</option>
                        {['Spouse','Child','Parent','Sibling','Grandchild','Trust','Charity','Other'].map(r => <option key={r} style={{ background:'#060818' }}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Role</label>
                      <select value={benForm.role} onChange={e => setBenForm(p => ({...p, role: e.target.value}))} style={inputStyle}>
                        <option style={{ background:'#060818' }}>Primary</option>
                        <option style={{ background:'#060818' }}>Contingent</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Share %</label>
                      <input type="number" min="0" max="100" value={benForm.percentage} onChange={e => setBenForm(p => ({...p, percentage: e.target.value}))} placeholder="e.g. 50" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input type="email" value={benForm.email} onChange={e => setBenForm(p => ({...p, email: e.target.value}))} placeholder="email@example.com" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      <input type="tel" value={benForm.phone} onChange={e => setBenForm(p => ({...p, phone: e.target.value}))} placeholder="+1 (512) 555-0100" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                    <button type="button" onClick={() => setShowBenForm(false)} style={{ padding:'9px 18px', background:'transparent', border:'1px solid rgba(0,100,255,0.2)', borderRadius:'8px', color:'#6b7ab8', cursor:'pointer', fontSize:'13px' }}>Cancel</button>
                    <button type="submit" disabled={benSaving} style={{ padding:'9px 20px', background:'linear-gradient(135deg,#0055ff,#00aaff)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>{benSaving ? 'Adding...' : 'Add Beneficiary'}</button>
                  </div>
                </form>
              )}

              {beneficiaries.length === 0 && !showBenForm && (
                <div style={{ textAlign:'center', padding:'24px', color:'#3d4a7a', fontSize:'13px', marginTop:'8px' }}>
                  You can skip this and add beneficiaries later from the Beneficiaries page.
                </div>
              )}
            </div>
          )}

          {/* ── Step 5 — Entities ────────────────────────────────────────── */}
          {step === 5 && (
            <div>
              <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'22px', fontWeight:800, color:'#fff', marginBottom:'6px' }}>Legal Entities</h2>
              <p style={{ fontSize:'14px', color:'#6b7ab8', marginBottom:'24px' }}>Trusts, LLCs, partnerships — add any entities that hold your assets.</p>

              {entities.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
                  {entities.map(en => (
                    <div key={en.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', background:'rgba(0,85,255,0.06)', border:'1px solid rgba(0,100,255,0.2)', borderRadius:'10px' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'14px', fontWeight:700, color:'#fff' }}>{en.name}</div>
                        <div style={{ fontSize:'12px', color:'#6b7ab8', marginTop:'2px' }}>
                          {en.type}{en.state ? ` · ${en.state}` : ''}{en.ein ? ` · EIN: ${en.ein}` : ''}
                        </div>
                      </div>
                      <button onClick={() => removeEntity(en.id)} style={{ padding:'4px 10px', background:'transparent', border:'1px solid rgba(255,60,60,0.2)', borderRadius:'6px', color:'#ff6666', cursor:'pointer', fontSize:'11px' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {!showEntityForm ? (
                <button onClick={() => setShowEntityForm(true)} style={{ width:'100%', padding:'12px', background:'rgba(0,85,255,0.06)', border:'1px dashed rgba(0,100,255,0.3)', borderRadius:'12px', color:'#00aaff', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
                  + Add Entity
                </button>
              ) : (
                <form onSubmit={addEntity} style={{ background:'rgba(0,85,255,0.05)', border:'1px solid rgba(0,100,255,0.2)', borderRadius:'14px', padding:'20px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={labelStyle}>Entity Name <span style={{ color:'#ff6688' }}>*</span></label>
                      <input required value={entityForm.name} onChange={e => setEntityForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Smith Family Trust" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Type</label>
                      <select value={entityForm.type} onChange={e => setEntityForm(p => ({...p, type: e.target.value}))} style={inputStyle}>
                        {ENTITY_TYPES.map(t => <option key={t} style={{ background:'#060818' }}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>State of Formation</label>
                      <select value={entityForm.state} onChange={e => setEntityForm(p => ({...p, state: e.target.value}))} style={inputStyle}>
                        <option value="" style={{ background:'#060818' }}>Select...</option>
                        {US_STATES.map(s => <option key={s} value={s} style={{ background:'#060818' }}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>EIN (Tax ID)</label>
                      <input value={entityForm.ein} onChange={e => setEntityForm(p => ({...p, ein: e.target.value}))} placeholder="XX-XXXXXXX" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Est. Date</label>
                      <input type="date" value={entityForm.est_date} onChange={e => setEntityForm(p => ({...p, est_date: e.target.value}))} style={{ ...inputStyle, colorScheme:'dark' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Ownership %</label>
                      <input value={entityForm.ownership_display} onChange={e => setEntityForm(p => ({...p, ownership_display: e.target.value}))} placeholder="e.g. 100" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                    <button type="button" onClick={() => setShowEntityForm(false)} style={{ padding:'9px 18px', background:'transparent', border:'1px solid rgba(0,100,255,0.2)', borderRadius:'8px', color:'#6b7ab8', cursor:'pointer', fontSize:'13px' }}>Cancel</button>
                    <button type="submit" disabled={entitySaving} style={{ padding:'9px 20px', background:'linear-gradient(135deg,#0055ff,#00aaff)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>{entitySaving ? 'Adding...' : 'Add Entity'}</button>
                  </div>
                </form>
              )}

              {entities.length === 0 && !showEntityForm && (
                <div style={{ textAlign:'center', padding:'24px', color:'#3d4a7a', fontSize:'13px', marginTop:'8px' }}>
                  No entities yet — you can add trusts, LLCs, and more from the Entity Tree page later.
                </div>
              )}
            </div>
          )}

          {/* ── Step 6 — Accounts ────────────────────────────────────────── */}
          {step === 6 && (
            <div>
              <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'22px', fontWeight:800, color:'#fff', marginBottom:'6px' }}>Connect Your Accounts</h2>
              <p style={{ fontSize:'14px', color:'#6b7ab8', marginBottom:'20px' }}>Link financial accounts for a live estate value. All optional — add more anytime.</p>

              {connectedTotal > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:'10px', background:'rgba(0,200,80,0.07)', border:'1px solid rgba(0,200,80,0.2)', borderRadius:'12px', padding:'10px 16px', marginBottom:'16px' }}>
                  <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#00cc66', boxShadow:'0 0 6px #00cc66', flexShrink:0, display:'inline-block' }} />
                  <span style={{ fontSize:'13px', color:'#6b7ab8' }}>Connected so far:</span>
                  <span style={{ fontSize:'16px', fontWeight:800, color:'#fff', fontFamily:"'Space Grotesk',sans-serif", marginLeft:'auto' }}>{fmt(connectedTotal)}</span>
                </div>
              )}

              {connectedAccounts.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'16px' }}>
                  {connectedAccounts.map(conn => {
                    const bal = accountBalances.filter(b => b.connected_account_id === conn.id).reduce((s,b) => s+(b.current_balance||0), 0)
                    return (
                      <div key={conn.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 14px', background:'rgba(0,200,80,0.05)', border:'1px solid rgba(0,200,80,0.15)', borderRadius:'9px' }}>
                        <span style={{ fontSize:'15px' }}>{conn.category==='crypto'?'₿':conn.category==='real_estate'?'🏠':conn.category==='investment'?'📈':'🏦'}</span>
                        <span style={{ fontSize:'13px', color:'#e8eaf6', flex:1, fontWeight:600 }}>{conn.institution_name}</span>
                        <span style={{ fontSize:'13px', fontWeight:700, color:'#00cc66' }}>{fmt(bal)}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                {/* Plaid */}
                <div style={{ background:'rgba(0,85,255,0.06)', border:'1px solid rgba(0,100,255,0.2)', borderRadius:'14px', padding:'16px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                    <span style={{ fontSize:'24px' }}>🏦</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'14px', fontWeight:700, color:'#fff', marginBottom:'2px' }}>Bank & Brokerage</div>
                      <div style={{ fontSize:'12px', color:'#6b7ab8' }}>Fidelity, Schwab, Chase & 12,000+ via Plaid</div>
                    </div>
                    {!plaidConfigured ? (
                      <span style={{ fontSize:'11px', color:'#ffaa00', fontWeight:600, background:'rgba(255,170,0,0.1)', border:'1px solid rgba(255,170,0,0.25)', borderRadius:'6px', padding:'4px 10px' }}>Setup required</span>
                    ) : (
                      <button onClick={openPlaidLink} disabled={!plaidReady} style={{ padding:'8px 18px', background:'linear-gradient(135deg,#0055ff,#00aaff)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'12px', fontWeight:700, cursor: plaidReady?'pointer':'not-allowed', opacity: plaidReady?1:0.6 }}>+ Connect</button>
                    )}
                  </div>
                </div>

                {/* Crypto */}
                <div style={{ background:'rgba(247,147,26,0.05)', border:'1px solid rgba(247,147,26,0.18)', borderRadius:'14px', padding:'16px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom: showCryptoForm?'14px':'0' }}>
                    <span style={{ fontSize:'24px' }}>₿</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'14px', fontWeight:700, color:'#fff', marginBottom:'2px' }}>Crypto Holdings</div>
                      <div style={{ fontSize:'12px', color:'#6b7ab8' }}>Coinbase (live) or manual entry</div>
                    </div>
                  </div>
                  {/* Coinbase */}
                  {(() => {
                    const cbConnected = connectedAccounts.some(a => a.integration_type === 'coinbase')
                    return (
                      <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 14px', background: cbConnected?'rgba(0,204,102,0.06)':'rgba(0,82,255,0.06)', border:`1px solid ${cbConnected?'rgba(0,204,102,0.2)':'rgba(0,82,255,0.2)'}`, borderRadius:'10px', marginBottom:'10px' }}>
                        <span style={{ fontSize:'14px' }}>🔵</span>
                        <span style={{ fontSize:'13px', fontWeight:700, color: cbConnected?'#00cc66':'#fff', flex:1 }}>{cbConnected?'✓ Coinbase connected':'Coinbase — live balances'}</span>
                        {cbConnected ? (
                          <button onClick={() => refreshConnected(user.id)} style={{ padding:'4px 10px', background:'transparent', border:'1px solid rgba(0,204,102,0.3)', borderRadius:'6px', color:'#00cc66', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>↻</button>
                        ) : (
                          <a href="/api/coinbase/auth?source=onboarding" target="_blank" rel="noopener noreferrer" onClick={() => setTimeout(()=>refreshConnected(user?.id),8000)}
                            style={{ padding:'4px 12px', background:'rgba(247,147,26,0.15)', border:'1px solid rgba(247,147,26,0.35)', borderRadius:'6px', color:'#f7931a', fontSize:'11px', fontWeight:700, cursor:'pointer', textDecoration:'none' }}>Connect →</a>
                        )}
                      </div>
                    )
                  })()}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:'12px', color:'#6b7ab8' }}>Other wallets (manual)</span>
                    <button onClick={() => setShowCryptoForm(v => !v)} style={{ padding:'4px 12px', background: showCryptoForm?'transparent':'rgba(247,147,26,0.12)', border:'1px solid rgba(247,147,26,0.3)', borderRadius:'6px', color:'#f7931a', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>{showCryptoForm?'Cancel':'+ Add'}</button>
                  </div>
                  {showCryptoForm && (
                    <form onSubmit={saveCrypto} style={{ marginTop:'12px', display:'flex', flexDirection:'column', gap:'10px' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                        <div>
                          <label style={labelStyle}>Coin</label>
                          <select value={cryptoForm.symbol} onChange={e => setCryptoForm(p=>({...p,symbol:e.target.value}))} style={{ ...inputStyle, border:'1px solid rgba(247,147,26,0.25)' }}>
                            {CRYPTO_COINS.map(c => <option key={c} style={{ background:'#060818' }}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Amount</label>
                          <input required type="number" step="any" min="0" value={cryptoForm.amount} onChange={e => setCryptoForm(p=>({...p,amount:e.target.value}))} placeholder="e.g. 0.5" style={{ ...inputStyle, border:'1px solid rgba(247,147,26,0.25)' }} />
                        </div>
                      </div>
                      {cryptoPrice && cryptoForm.amount && (
                        <div style={{ background:'rgba(247,147,26,0.08)', border:'1px solid rgba(247,147,26,0.2)', borderRadius:'8px', padding:'8px 12px', display:'flex', justifyContent:'space-between' }}>
                          <span style={{ fontSize:'12px', color:'#6b7ab8' }}>{cryptoForm.symbol} @ ${cryptoPrice.toLocaleString()}</span>
                          <span style={{ fontSize:'14px', fontWeight:800, color:'#f7931a' }}>{fmt(cryptoPrice*parseFloat(cryptoForm.amount||'0'))}</span>
                        </div>
                      )}
                      <button type="submit" disabled={cryptoSaving} style={{ padding:'8px', background:'rgba(247,147,26,0.15)', border:'1px solid rgba(247,147,26,0.3)', borderRadius:'8px', color:'#f7931a', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>{cryptoSaving?'Saving...':'Add Holding'}</button>
                    </form>
                  )}
                </div>

                {/* Real Estate */}
                <div style={{ background:'rgba(102,68,255,0.05)', border:'1px solid rgba(102,68,255,0.18)', borderRadius:'14px', padding:'16px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom: showPropForm?'14px':'0' }}>
                    <span style={{ fontSize:'24px' }}>🏠</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'14px', fontWeight:700, color:'#fff', marginBottom:'2px' }}>Real Estate</div>
                      <div style={{ fontSize:'12px', color:'#6b7ab8' }}>Properties by address and value</div>
                    </div>
                    <button onClick={() => setShowPropForm(v=>!v)} style={{ padding:'8px 16px', background: showPropForm?'transparent':'rgba(102,68,255,0.12)', border:'1px solid rgba(102,68,255,0.3)', borderRadius:'8px', color:'#aa88ff', fontSize:'12px', fontWeight:700, cursor:'pointer' }}>{showPropForm?'Cancel':'+ Add'}</button>
                  </div>
                  {showPropForm && (
                    <form onSubmit={saveProperty} style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                      <div>
                        <label style={labelStyle}>Property Address</label>
                        <input required value={propForm.address} onChange={e => setPropForm(p=>({...p,address:e.target.value}))} placeholder="123 Oak Drive, Austin, TX 78701" style={{ ...inputStyle, border:'1px solid rgba(102,68,255,0.25)' }} />
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                        <div>
                          <label style={labelStyle}>Estimated Value ($)</label>
                          <input required type="number" min="0" value={propForm.value} onChange={e => setPropForm(p=>({...p,value:e.target.value}))} placeholder="850000" style={{ ...inputStyle, border:'1px solid rgba(102,68,255,0.25)' }} />
                        </div>
                        <div>
                          <label style={labelStyle}>Mortgage Balance ($)</label>
                          <input type="number" min="0" value={propForm.mortgage} onChange={e => setPropForm(p=>({...p,mortgage:e.target.value}))} placeholder="0" style={{ ...inputStyle, border:'1px solid rgba(102,68,255,0.25)' }} />
                        </div>
                      </div>
                      <button type="submit" disabled={propSaving} style={{ padding:'9px', background:'rgba(102,68,255,0.12)', border:'1px solid rgba(102,68,255,0.3)', borderRadius:'8px', color:'#aa88ff', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>{propSaving?'Saving...':'Add Property'}</button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 7 — Digital Assets ──────────────────────────────────── */}
          {step === 7 && (
            <div>
              <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'22px', fontWeight:800, color:'#fff', marginBottom:'6px' }}>Digital Accounts</h2>
              <p style={{ fontSize:'14px', color:'#6b7ab8', marginBottom:'24px' }}>Email, social, crypto, streaming, domains — and store passwords securely.</p>

              {digitalAssets.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
                  {digitalAssets.map(a => (
                    <div key={a.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 14px', background:'rgba(0,85,255,0.06)', border:'1px solid rgba(0,100,255,0.2)', borderRadius:'10px' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px', fontWeight:700, color:'#fff' }}>{a.platform}</div>
                        <div style={{ fontSize:'11px', color:'#6b7ab8', marginTop:'2px' }}>
                          {a.type}{a.username ? ` · ${a.username}` : ''}
                          {a.password && (
                            <span style={{ marginLeft:'8px' }}>
                              · 🔑 <span style={{ fontFamily:'monospace', letterSpacing: revealPw[a.id]?'0':'2px' }}>{revealPw[a.id] ? a.password : '••••••'}</span>
                              <button onClick={() => setRevealPw(p=>({...p,[a.id]:!p[a.id]}))} style={{ marginLeft:'4px', padding:'0 5px', background:'transparent', border:'none', color:'#00aaff', cursor:'pointer', fontSize:'10px' }}>{revealPw[a.id]?'hide':'show'}</button>
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => removeDigitalAsset(a.id)} style={{ padding:'4px 10px', background:'transparent', border:'1px solid rgba(255,60,60,0.2)', borderRadius:'6px', color:'#ff6666', cursor:'pointer', fontSize:'11px' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {!showDaForm ? (
                <button onClick={() => setShowDaForm(true)} style={{ width:'100%', padding:'12px', background:'rgba(0,85,255,0.06)', border:'1px dashed rgba(0,100,255,0.3)', borderRadius:'12px', color:'#00aaff', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
                  + Add Account
                </button>
              ) : (
                <form onSubmit={addDigitalAsset} style={{ background:'rgba(0,85,255,0.05)', border:'1px solid rgba(0,100,255,0.2)', borderRadius:'14px', padding:'20px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                    <div>
                      <label style={labelStyle}>Platform / Account Name <span style={{ color:'#ff6688' }}>*</span></label>
                      <input required value={daForm.platform} onChange={e => setDaForm(p=>({...p,platform:e.target.value}))} placeholder="Gmail, Netflix, Coinbase..." style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Type</label>
                      <select value={daForm.type} onChange={e => setDaForm(p=>({...p,type:e.target.value}))} style={inputStyle}>
                        {DA_TYPES.map(t => <option key={t} style={{ background:'#060818' }}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Username / Email</label>
                      <input value={daForm.username} onChange={e => setDaForm(p=>({...p,username:e.target.value}))} placeholder="your@email.com" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Password (optional)</label>
                      <input type="password" value={daForm.password} onChange={e => setDaForm(p=>({...p,password:e.target.value}))} placeholder="Stored securely" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>After-Death Instructions</label>
                      <select value={daForm.instructions} onChange={e => setDaForm(p=>({...p,instructions:e.target.value}))} style={inputStyle}>
                        {['Log in and delete','Transfer to heir','Memorialize','Close account','Download data first','No action needed'].map(i => <option key={i} style={{ background:'#060818' }}>{i}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Notes</label>
                      <input value={daForm.notes} onChange={e => setDaForm(p=>({...p,notes:e.target.value}))} placeholder="Any additional info" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                    <button type="button" onClick={() => setShowDaForm(false)} style={{ padding:'9px 18px', background:'transparent', border:'1px solid rgba(0,100,255,0.2)', borderRadius:'8px', color:'#6b7ab8', cursor:'pointer', fontSize:'13px' }}>Cancel</button>
                    <button type="submit" disabled={daSaving} style={{ padding:'9px 20px', background:'linear-gradient(135deg,#0055ff,#00aaff)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>{daSaving?'Adding...':'Add Account'}</button>
                  </div>
                </form>
              )}

              {digitalAssets.length === 0 && !showDaForm && (
                <div style={{ textAlign:'center', padding:'24px', color:'#3d4a7a', fontSize:'13px', marginTop:'8px' }}>
                  You can skip this and manage digital accounts from the Digital Assets page later.
                </div>
              )}
            </div>
          )}

          {/* ── Step 8 — Documents & Goals ──────────────────────────────── */}
          {step === 8 && (
            <div>
              <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'22px', fontWeight:800, color:'#fff', marginBottom:'6px' }}>Almost done!</h2>
              <p style={{ fontSize:'14px', color:'#6b7ab8', marginBottom:'24px' }}>Tell us about your existing documents and what you want to accomplish.</p>

              <div style={{ marginBottom:'28px' }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:'#fff', marginBottom:'14px' }}>Do you have these documents?</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  {[
                    { key:'has_will', label:'Last Will & Testament', desc:'A signed, witnessed will' },
                    { key:'has_trust', label:'Trust', desc:'Revocable or irrevocable' },
                    { key:'has_poa', label:'Power of Attorney', desc:'Durable POA for finances' },
                    { key:'has_healthcare', label:'Healthcare Directive', desc:'Medical wishes and proxy' },
                  ].map(item => (
                    <div key={item.key} style={{ padding:'14px 16px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(0,100,255,0.12)', borderRadius:'12px' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <div>
                          <div style={{ fontSize:'14px', fontWeight:600, color:'#fff' }}>{item.label}</div>
                          <div style={{ fontSize:'12px', color:'#6b7ab8' }}>{item.desc}</div>
                        </div>
                        <div style={{ display:'flex', gap:'6px' }}>
                          {['yes','no','not sure'].map(v => (
                            <button key={v} type="button" onClick={() => setDocs(d => ({...d,[item.key]:v}))} style={{ padding:'5px 12px', borderRadius:'20px', border:`1px solid ${(docs as any)[item.key]===v?'rgba(0,170,255,0.5)':'rgba(0,100,255,0.15)'}`, background:(docs as any)[item.key]===v?'rgba(0,120,255,0.12)':'transparent', color:(docs as any)[item.key]===v?'#00aaff':'#6b7ab8', fontSize:'11px', cursor:'pointer', fontWeight:(docs as any)[item.key]===v?700:400, textTransform:'capitalize' as const }}>{v}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:'24px' }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:'#fff', marginBottom:'14px' }}>Estate value (helps the AI calibrate recommendations)</div>
                <select value={estateEstimate} onChange={e => setEstateEstimate(e.target.value)} style={inputStyle}>
                  <option value="" style={{ background:'#060818' }}>Prefer not to say</option>
                  <option value="250000" style={{ background:'#060818' }}>Under $500K</option>
                  <option value="750000" style={{ background:'#060818' }}>$500K – $1M</option>
                  <option value="2000000" style={{ background:'#060818' }}>$1M – $3M</option>
                  <option value="6000000" style={{ background:'#060818' }}>$3M – $10M</option>
                  <option value="15000000" style={{ background:'#060818' }}>$10M+</option>
                </select>
              </div>

              <div>
                <div style={{ fontSize:'13px', fontWeight:700, color:'#fff', marginBottom:'14px' }}>What brings you here? <span style={{ color:'#6b7ab8', fontWeight:400 }}>(select all that apply)</span></div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {GOAL_OPTIONS.map(g => (
                    <button key={g} type="button" onClick={() => setGoals(p => p.includes(g) ? p.filter(x=>x!==g) : [...p,g])} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'11px 14px', borderRadius:'10px', border:`1px solid ${goals.includes(g)?'rgba(0,170,255,0.4)':'rgba(0,100,255,0.12)'}`, background: goals.includes(g)?'rgba(0,120,255,0.09)':'rgba(255,255,255,0.01)', cursor:'pointer', textAlign:'left' }}>
                      <div style={{ width:'16px', height:'16px', borderRadius:'50%', border:`2px solid ${goals.includes(g)?'#00aaff':'rgba(0,100,255,0.3)'}`, background: goals.includes(g)?'#00aaff':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {goals.includes(g) && <span style={{ color:'#fff', fontSize:'10px', fontWeight:700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize:'13px', color: goals.includes(g)?'#fff':'#6b7ab8', fontWeight: goals.includes(g)?600:400 }}>{g}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {err && (
            <div style={{ marginTop:'16px', padding:'10px 14px', background:'rgba(255,60,60,0.08)', border:'1px solid rgba(255,60,60,0.25)', borderRadius:'8px', color:'#ff6688', fontSize:'13px', fontWeight:600 }}>
              ⚠️ {err}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'28px' }}>
            {step > 1 ? (
              <button onClick={() => { setErr(''); setStep(s => s-1) }} style={{ padding:'10px 20px', background:'transparent', border:'1px solid rgba(0,100,255,0.2)', borderRadius:'10px', color:'#6b7ab8', cursor:'pointer', fontSize:'14px', fontWeight:600 }}>← Back</button>
            ) : (
              <button onClick={() => router.push('/dashboard')} style={{ padding:'10px 20px', background:'transparent', border:'none', color:'#3d4a7a', cursor:'pointer', fontSize:'13px' }}>Skip setup</button>
            )}

            {/* Skip link for optional steps */}
            {[4,5,6,7].includes(step) && (
              <button onClick={() => { setErr(''); setStep(s => s+1) }} style={{ padding:'10px', background:'transparent', border:'none', color:'#3d4a7a', cursor:'pointer', fontSize:'13px' }}>Skip →</button>
            )}

            {step < TOTAL_STEPS ? (
              <button onClick={next} style={{ padding:'11px 28px', background:'linear-gradient(135deg,#0055ff,#00aaff)', border:'none', borderRadius:'10px', color:'#fff', fontSize:'14px', fontWeight:700, cursor:'pointer', boxShadow:'0 0 20px rgba(0,100,255,0.25)' }}>
                Continue →
              </button>
            ) : (
              <button onClick={finish} disabled={saving} style={{ padding:'11px 28px', background:'linear-gradient(135deg,#0055ff,#00aaff)', border:'none', borderRadius:'10px', color:'#fff', fontSize:'14px', fontWeight:700, cursor: saving?'not-allowed':'pointer', boxShadow:'0 0 20px rgba(0,100,255,0.25)', opacity: saving?0.7:1 }}>
                {saving ? 'Setting up your account...' : '🎉 Go to my dashboard'}
              </button>
            )}
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:'14px', fontSize:'12px', color:'#3d4a7a' }}>
          Your information is encrypted and never shared. · Step {step} of {TOTAL_STEPS}
        </div>
      </div>
    </div>
  )
}
