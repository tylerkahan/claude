'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const TOTAL_STEPS = 5

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

  // Step 4 — Documents
  const [docs, setDocs] = useState({ has_will: '', has_trust: '', has_poa: '', has_healthcare: '' })

  // Step 5 — Goals
  const [goals, setGoals] = useState<string[]>([])

  const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
  const ASSET_TYPES = ['Real Estate', 'Investment Accounts', 'Bank Accounts', 'Crypto / Digital Assets', 'Business Interest', 'Life Insurance', 'Retirement Accounts (401k/IRA)']
  const GOAL_OPTIONS = ['Protect my family if I die', 'Organize all my documents', 'Reduce estate taxes', 'Avoid probate', 'Plan for incapacity', 'Pass on my business', 'Protect assets from creditors']

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      // If already onboarded, skip to dashboard
      const { data: profile } = await supabase.from('profiles').select('onboarding_complete').eq('id', user.id).single()
      if (profile?.onboarding_complete) { router.push('/dashboard'); return }
    }
    load()
  }, [router])

  function updateChildCount(n: number) {
    setFamily(f => ({ ...f, num_children: String(n) }))
    setChildren(prev => {
      const arr = [...prev]
      while (arr.length < n) arr.push({ name: '', age: '' })
      return arr.slice(0, n)
    })
  }

  function toggleAsset(a: string) {
    setAssetTypes(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
  }

  function toggleGoal(g: string) {
    setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
  }

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
      spouse_name: family.spouse_name,
      num_children: parseInt(family.num_children) || 0,
      estate_estimate: estateEstimate,
      goals: goals.join(', '),
      onboarding_complete: true,
      updated_at: new Date().toISOString()
    })

    // Pre-fill compliance based on what they said they have
    const complianceMap: Record<string, string> = {
      has_will: 'will', has_trust: 'trust', has_poa: 'poa', has_healthcare: 'healthcare'
    }
    const checks = Object.entries(docs).filter(([, v]) => v === 'yes').map(([k]) => ({
      user_id: user.id, check_id: complianceMap[k], completed: true, updated_at: new Date().toISOString()
    }))
    if (checks.length > 0) {
      await supabase.from('compliance_checks').upsert(checks, { onConflict: 'user_id,check_id' })
    }

    // Add asset categories as net worth entries if they have an estimate
    if (assetTypes.length > 0 && estateEstimate) {
      const estVal = parseFloat(estateEstimate.replace(/[^0-9.]/g, '')) || 0
      const perAsset = Math.floor(estVal / assetTypes.length)
      const assetRows = assetTypes.map(type => ({
        user_id: user.id, name: type, category: type.includes('Real') ? 'Real Estate' : type.includes('Investment') ? 'Investment Account' : type.includes('Bank') ? 'Bank Account' : type.includes('Crypto') ? 'Crypto' : type.includes('Business') ? 'Business' : type.includes('Life') ? 'Life Insurance' : 'Other',
        value: perAsset, institution: ''
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
    { num: 4, label: 'Documents' },
    { num: 5, label: 'Goals' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#03040d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>

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

          {/* Step 1 — Personal */}
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
                      <button key={s} type="button" onClick={() => setPersonal(p => ({ ...p, marital_status: s }))} style={{ padding: '8px 16px', borderRadius: '20px', border: `1px solid ${personal.marital_status === s ? 'rgba(0,170,255,0.5)' : 'rgba(0,100,255,0.2)'}`, background: personal.marital_status === s ? 'rgba(0,120,255,0.12)' : 'transparent', color: personal.marital_status === s ? '#00aaff' : '#6b7ab8', fontSize: '13px', cursor: 'pointer', fontWeight: personal.marital_status === s ? 700 : 400, transition: 'all .15s' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Family */}
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
                    <label style={labelStyle}>Children's Names & Ages</label>
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

          {/* Step 3 — Assets */}
          {step === 3 && (
            <div>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>Your assets</h2>
              <p style={{ fontSize: '14px', color: '#6b7ab8', marginBottom: '28px' }}>Select everything that applies. This helps us set up your net worth tracker.</p>
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

          {/* Step 4 — Documents */}
          {step === 4 && (
            <div>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>Your documents</h2>
              <p style={{ fontSize: '14px', color: '#6b7ab8', marginBottom: '28px' }}>Do you already have these estate planning documents? We'll mark them complete in your checklist.</p>
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

          {/* Step 5 — Goals */}
          {step === 5 && (
            <div>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>What brings you here?</h2>
              <p style={{ fontSize: '14px', color: '#6b7ab8', marginBottom: '28px' }}>Select all that apply. This helps us prioritize what matters most to you.</p>
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

            {step < TOTAL_STEPS ? (
              <button onClick={() => setStep(s => s + 1)} style={{ padding: '11px 28px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 20px rgba(0,100,255,0.25)' }}>
                Continue →
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
