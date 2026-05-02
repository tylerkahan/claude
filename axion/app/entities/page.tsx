'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function EntitiesPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  const BOX = ({ type, name, sub, color, borderColor }: any) => (
    <div style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: `rgba(${color},0.08)`, minWidth: '150px', textAlign: 'center' }}>
      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: '4px', marginBottom: '6px', display: 'inline-block', background: `rgba(${color},0.15)`, color: `rgb(${color})` }}>{type}</div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{name}</div>
      {sub && <div style={{ fontSize: '10px', color: '#6b7ab8', marginTop: '3px' }}>{sub}</div>}
    </div>
  )

  const LINE = () => <div style={{ width: '2px', height: '28px', background: 'rgba(0,100,255,0.2)', margin: '0 auto' }} />
  const HLINE = ({ width }: { width: string }) => <div style={{ height: '2px', width, background: 'rgba(0,100,255,0.2)', position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)' }} />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Entity Tree</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8', marginLeft: '10px' }}>Visualize your estate structure</span>
          <span style={{ marginLeft: '10px', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', background: 'rgba(0,170,255,0.15)', border: '1px solid rgba(0,170,255,0.3)', color: '#00aaff' }}>New</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 28px' }}>

          {/* Tree visualization */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
            {/* Root */}
            <BOX type="Grantor" name="You" sub="Settlor & Trustee" color="0,170,255" borderColor="rgba(0,170,255,0.4)" />
            <LINE />

            {/* Level 1 */}
            <div style={{ display: 'flex', gap: '40px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: '25%', right: '25%', height: '2px', background: 'rgba(0,100,255,0.2)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '2px', height: '28px', background: 'rgba(0,100,255,0.2)' }} />
                <BOX type="Trust" name="Revocable Living Trust" sub="Primary entity" color="102,68,255" borderColor="rgba(102,68,255,0.4)" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '2px', height: '28px', background: 'rgba(0,100,255,0.2)' }} />
                <BOX type="LLC" name="Holding LLC" sub="Asset protection" color="0,204,102" borderColor="rgba(0,204,102,0.35)" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '40px', marginTop: '0' }}>
              {/* Trust children */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <LINE />
                <div style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '2px', background: 'rgba(0,100,255,0.2)' }} />
                  {[{ type: 'Asset', name: 'Primary Residence', sub: '62%' }, { type: 'Asset', name: 'Brokerage', sub: '28%' }].map(a => (
                    <div key={a.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '2px', height: '28px', background: 'rgba(0,100,255,0.2)' }} />
                      <BOX type={a.type} name={a.name} sub={a.sub} color="255,255,255" borderColor="rgba(255,255,255,0.1)" />
                    </div>
                  ))}
                </div>
              </div>

              {/* LLC children */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <LINE />
                <div style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '2px', background: 'rgba(0,100,255,0.2)' }} />
                  {[{ type: 'Asset', name: 'Rental Property' }, { type: 'Asset', name: 'Business Interest' }].map(a => (
                    <div key={a.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '2px', height: '28px', background: 'rgba(0,100,255,0.2)' }} />
                      <BOX type={a.type} name={a.name} sub={undefined} color="255,255,255" borderColor="rgba(255,255,255,0.1)" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Info callout */}
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ background: 'rgba(0,100,255,0.05)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '14px', padding: '18px 22px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>What is an Entity Tree?</div>
              <div style={{ fontSize: '13px', color: '#6b7ab8', lineHeight: '1.7' }}>
                An entity tree maps how your assets flow through legal structures — trusts, LLCs, partnerships — to your beneficiaries. This helps visualize asset protection, tax efficiency, and what your heirs will actually receive. Work with your estate attorney to customize your structure.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[
                { type: 'Grantor', color: '0,170,255', desc: 'You — the creator and controller of the estate' },
                { type: 'Trust', color: '102,68,255', desc: 'Holds assets and distributes them per your wishes' },
                { type: 'LLC', color: '0,204,102', desc: 'Provides liability protection for business/rental assets' },
                { type: 'Asset', color: '200,200,200', desc: 'Individual properties, accounts, or interests' },
              ].map(l => (
                <div key={l.type} style={{ flex: 1, background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.12)', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: `rgb(${l.color})`, marginBottom: '4px' }}>{l.type}</div>
                  <div style={{ fontSize: '11px', color: '#6b7ab8', lineHeight: '1.5' }}>{l.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
