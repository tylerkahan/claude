'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const STRATEGIES = [
  { title: 'Annual Gift Exclusion', desc: 'Give up to $18,000 per person per year tax-free. A couple can give $36,000 per recipient.', savings: 'Up to $36K/yr', color: '#00aaff', difficulty: 'Easy' },
  { title: 'Irrevocable Life Insurance Trust (ILIT)', desc: 'Keep life insurance proceeds out of your taxable estate by placing the policy in an ILIT.', savings: 'Varies by policy', color: '#6644ff', difficulty: 'Moderate' },
  { title: 'Charitable Remainder Trust', desc: 'Donate assets to charity, receive income during your lifetime, and reduce your taxable estate.', savings: 'Depends on gift', color: '#00cc66', difficulty: 'Moderate' },
  { title: 'Grantor Retained Annuity Trust (GRAT)', desc: 'Transfer appreciating assets out of your estate while retaining annuity payments for a set term.', savings: 'Significant for HNW', color: '#ffaa00', difficulty: 'Complex' },
  { title: '529 Superfunding', desc: '5-year gift tax averaging lets you contribute up to $90K ($180K per couple) to a 529 at once.', savings: 'Up to $180K', color: '#ff6688', difficulty: 'Easy' },
  { title: 'Qualified Opportunity Zone', desc: 'Defer and reduce capital gains taxes by investing in designated Opportunity Zone funds.', savings: 'Varies', color: '#00d4ff', difficulty: 'Complex' },
]

export default function TaxPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [estateValue, setEstateValue] = useState(0)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: assets } = await supabase.from('assets').select('value').eq('user_id', user.id)
      const total = assets?.reduce((s, a) => s + (a.value || 0), 0) ?? 0
      setEstateValue(total)
      setLoading(false)
    }
    load()
  }, [router])

  const FEDERAL_EXEMPTION = 13610000
  const exposure = Math.max(0, estateValue - FEDERAL_EXEMPTION)
  const taxEstimate = Math.round(exposure * 0.4)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Tax Optimizer</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8', marginLeft: '10px' }}>Reduce your estate tax exposure</span>
          <span style={{ marginLeft: '10px', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', background: 'rgba(0,170,255,0.15)', border: '1px solid rgba(0,170,255,0.3)', color: '#00aaff' }}>New</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* Exposure cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '28px' }}>
            <div style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.16)', borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>Your Estate Value</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '28px', fontWeight: 800, color: '#fff' }}>${estateValue.toLocaleString()}</div>
              <div style={{ fontSize: '12px', color: '#6b7ab8', marginTop: '4px' }}>From tracked assets</div>
            </div>
            <div style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.16)', borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>Federal Exemption</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '28px', fontWeight: 800, color: '#00cc66' }}>$13.61M</div>
              <div style={{ fontSize: '12px', color: '#6b7ab8', marginTop: '4px' }}>2024 per individual</div>
            </div>
            <div style={{ background: 'rgba(8,14,40,0.7)', border: `1px solid ${taxEstimate > 0 ? 'rgba(255,170,0,0.25)' : 'rgba(0,204,102,0.25)'}`, borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>Estimated Tax Exposure</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '28px', fontWeight: 800, color: taxEstimate > 0 ? '#ffaa00' : '#00cc66' }}>
                {taxEstimate > 0 ? `$${taxEstimate.toLocaleString()}` : '$0'}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7ab8', marginTop: '4px' }}>{taxEstimate > 0 ? 'At 40% federal rate' : 'Below federal threshold'}</div>
            </div>
          </div>

          {taxEstimate === 0 && (
            <div style={{ background: 'rgba(0,204,102,0.06)', border: '1px solid rgba(0,204,102,0.2)', borderRadius: '14px', padding: '18px 22px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '20px' }}>✅</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Below federal threshold</div>
                <div style={{ fontSize: '13px', color: '#6b7ab8' }}>Your estate is currently below the $13.61M federal exemption. No federal estate tax applies. State taxes may still apply depending on your state of residence.</div>
              </div>
            </div>
          )}

          {/* Strategies */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '16px' }}>Tax Reduction Strategies</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {STRATEGIES.map(s => (
                <div key={s.title} style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.14)', borderRadius: '14px', padding: '18px 20px', backdropFilter: 'blur(20px)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{s.title}</div>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: s.difficulty === 'Easy' ? 'rgba(0,204,102,0.1)' : s.difficulty === 'Moderate' ? 'rgba(255,170,0,0.1)' : 'rgba(255,102,136,0.1)', color: s.difficulty === 'Easy' ? '#00cc66' : s.difficulty === 'Moderate' ? '#ffaa00' : '#ff6688', flexShrink: 0, marginLeft: '8px' }}>{s.difficulty}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7ab8', lineHeight: '1.6', marginBottom: '12px' }}>{s.desc}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: s.color }}>Potential savings: {s.savings}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(0,100,255,0.05)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '14px', padding: '16px 20px', fontSize: '12px', color: '#6b7ab8', lineHeight: '1.6' }}>
            ⚠️ This is an informational overview only. Tax laws change frequently and estate tax strategies require personalized legal and financial advice. Connect with a licensed estate attorney via <span style={{ color: '#00aaff', cursor: 'pointer' }}>Attorney Connect</span>.
          </div>
        </div>
      </div>
    </div>
  )
}
