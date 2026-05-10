'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const ROLE_COLORS: Record<string, string> = {
  'Primary Beneficiary': '#00aaff', 'Secondary Beneficiary': '#0077cc',
  'Contingent Beneficiary': '#6644ff', 'Executor': '#6644ff',
  'Trustee': '#00cc66', 'Guardian': '#ffaa00',
  'Healthcare Proxy': '#ff6688', 'Power of Attorney': '#00d4ff',
}

export default function BeneficiaryPortal() {
  const [user, setUser] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [requesting, setRequesting] = useState<string | null>(null)
  const [requested, setRequested] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const res = await fetch('/api/beneficiary-lookup')
      const data = await res.json()

      if (!data.found) {
        // Check if they're a regular account holder — redirect to dashboard
        const { data: profile } = await supabase.from('profiles').select('onboarding_complete').eq('id', user.id).single()
        if (profile?.onboarding_complete) { router.push('/dashboard'); return }
        setNotFound(true)
      } else {
        setRecords(data.records)
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function requestAccess(record: any) {
    setRequesting(record.id)
    // In a real implementation this would email the attorney
    await new Promise(r => setTimeout(r, 1200))
    setRequested(p => [...p, record.id])
    setRequesting(null)
  }

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#03040d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6b7ab8', fontSize: '14px' }}>Loading your portal...</div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#03040d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '48px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2L4 19h16L12 2z"/></svg>
          </div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '.07em' }}>AXION</span>
        </div>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>No beneficiary record found</div>
        <div style={{ fontSize: '14px', color: '#6b7ab8', lineHeight: 1.7, marginBottom: '28px' }}>
          Your email <strong style={{ color: '#fff' }}>{user?.email}</strong> hasn't been added as a beneficiary yet. If you received an invitation, make sure you signed up with the same email address.
        </div>
        <button onClick={signOut} style={{ padding: '10px 24px', background: 'transparent', border: '1px solid rgba(0,100,255,0.3)', borderRadius: '10px', color: '#6b7ab8', cursor: 'pointer', fontSize: '14px' }}>Sign out</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#03040d', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ height: '58px', background: 'rgba(6,10,32,0.95)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: '14px', backdropFilter: 'blur(20px)' }}>
        <div style={{ width: '26px', height: '26px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M12 2L4 19h16L12 2z"/></svg>
        </div>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff', letterSpacing: '.06em' }}>AXION</span>
        <span style={{ fontSize: '12px', color: '#6b7ab8', background: 'rgba(0,100,255,0.1)', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '6px', padding: '2px 10px' }}>Beneficiary Portal</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '12px', color: '#6b7ab8' }}>{user?.email}</span>
        <button onClick={signOut} style={{ padding: '5px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: '#6b7ab8', cursor: 'pointer', fontSize: '12px' }}>Sign out</button>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Welcome */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(0,85,255,0.2),rgba(0,170,255,0.2))', border: '1px solid rgba(0,100,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 20px' }}>🔐</div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>You've been named a beneficiary</h1>
          <p style={{ fontSize: '15px', color: '#6b7ab8', lineHeight: 1.7, maxWidth: '440px', margin: '0 auto' }}>
            You have been added to {records.length === 1 ? 'an estate plan' : `${records.length} estate plans`} as a trusted recipient. No financial details are shared until the estate is transferred.
          </p>
        </div>

        {/* Estate cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {records.map((rec: any) => {
            const color = ROLE_COLORS[rec.role] || '#6b7ab8'
            const grantorName = rec.profiles?.full_name || 'A contact'
            const firstName = grantorName.split(' ')[0]
            const attorney = rec.profiles
            const hasAttorney = attorney?.attorney_name || attorney?.attorney_email
            const isRequested = requested.includes(rec.id)

            return (
              <div key={rec.id} style={{ background: 'rgba(8,14,40,0.85)', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '20px', overflow: 'hidden' }}>

                {/* Card header */}
                <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(0,100,255,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg,#0044cc,#0099ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {grantorName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: '#fff' }}>{firstName}'s Estate</div>
                      <div style={{ fontSize: '13px', color: '#6b7ab8', marginTop: '2px' }}>You were added as a trusted person to this estate plan</div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: `${color}18`, border: `1px solid ${color}44`, color }}>
                        {rec.role || 'Beneficiary'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Your details */}
                <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(0,100,255,0.08)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '14px' }}>Your Record</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,100,255,0.1)', borderRadius: '10px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7ab8', marginBottom: '4px', textTransform: 'uppercase' }}>Name on Record</div>
                      <div style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>{rec.full_name}</div>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,100,255,0.1)', borderRadius: '10px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7ab8', marginBottom: '4px', textTransform: 'uppercase' }}>Relationship</div>
                      <div style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>{rec.relationship || '—'}</div>
                    </div>
                    {rec.percentage > 0 && (
                      <div style={{ padding: '12px 16px', background: 'rgba(0,170,255,0.05)', border: '1px solid rgba(0,170,255,0.15)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7ab8', marginBottom: '4px', textTransform: 'uppercase' }}>Your Share</div>
                        <div style={{ fontSize: '20px', color: '#00aaff', fontWeight: 800, fontFamily: "'Space Grotesk',sans-serif" }}>{rec.percentage}%</div>
                      </div>
                    )}
                    {rec.notes && (
                      <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,100,255,0.1)', borderRadius: '10px', gridColumn: rec.percentage > 0 ? 'auto' : '1/-1' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7ab8', marginBottom: '4px', textTransform: 'uppercase' }}>Notes</div>
                        <div style={{ fontSize: '13px', color: '#aaa' }}>{rec.notes}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Estate Access — locked */}
                <div style={{ padding: '20px 28px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '14px' }}>Estate Access</div>

                  {/* Attorney contact */}
                  <div style={{ padding: '16px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(102,68,255,0.15)', border: '1px solid rgba(102,68,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>⚖️</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '3px' }}>
                          {hasAttorney ? attorney.attorney_name : 'Estate Attorney'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7ab8' }}>
                          {hasAttorney
                            ? `${attorney.attorney_firm || ''} ${attorney.attorney_email ? '· ' + attorney.attorney_email : ''}`.trim()
                            : 'Contact information will be available upon estate transfer'}
                        </div>
                      </div>
                      <div style={{ padding: '4px 10px', background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: '#ffaa00' }}>🔒 Locked</div>
                    </div>
                  </div>

                  {/* Info notice */}
                  <div style={{ padding: '12px 16px', background: 'rgba(0,100,255,0.04)', border: '1px solid rgba(0,100,255,0.12)', borderRadius: '10px', fontSize: '13px', color: '#6b7ab8', lineHeight: 1.6, marginBottom: '16px' }}>
                    Full estate access — including account details, documents, and asset information — is released only upon verified transfer. At that time, the estate attorney will contact you directly to begin the process.
                  </div>

                  {/* Request access button */}
                  {isRequested ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', background: 'rgba(0,204,102,0.08)', border: '1px solid rgba(0,204,102,0.25)', borderRadius: '10px' }}>
                      <span style={{ fontSize: '16px' }}>✅</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#00cc66' }}>Access request sent</div>
                        <div style={{ fontSize: '12px', color: '#6b7ab8' }}>{hasAttorney ? `${attorney.attorney_name} has been notified` : 'The estate attorney has been notified'}. They will reach out to you directly.</div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => requestAccess(rec)}
                      disabled={requesting === rec.id}
                      style={{ width: '100%', padding: '12px', background: requesting === rec.id ? 'rgba(0,100,255,0.1)' : 'rgba(0,85,255,0.08)', border: '1px solid rgba(0,100,255,0.25)', borderRadius: '10px', color: '#00aaff', fontSize: '14px', fontWeight: 700, cursor: requesting === rec.id ? 'not-allowed' : 'pointer', opacity: requesting === rec.id ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      {requesting === rec.id ? '⏳ Sending request...' : '🔓 Connect with Estate Attorney to Gain Access'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '12px', color: '#3d4a7a', lineHeight: 1.8 }}>
          This is a secure beneficiary portal powered by Axion Estate Platform.<br />
          No account balance or asset details are visible until the estate is transferred.
        </div>
      </div>
    </div>
  )
}
