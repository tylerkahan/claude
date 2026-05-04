import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: documents }, { data: assets }, { data: beneficiaries }, { data: digitalAssets }, { data: compliance }, { data: connectedAccounts }, { data: accountBalances }] = await Promise.all([
    supabase.from('documents').select('*').eq('user_id', user.id),
    supabase.from('assets').select('*').eq('user_id', user.id),
    supabase.from('beneficiaries').select('*').eq('user_id', user.id),
    supabase.from('digital_assets').select('*').eq('user_id', user.id),
    supabase.from('compliance_checks').select('*').eq('user_id', user.id),
    supabase.from('connected_accounts').select('*').eq('user_id', user.id),
    supabase.from('account_balances').select('*').eq('user_id', user.id),
  ])

  const totalPhysical = assets?.reduce((s, a) => s + (a.value || 0), 0) ?? 0
  const totalDigital = digitalAssets?.reduce((s, a) => s + (a.estimated_value || 0), 0) ?? 0
  const totalConnected = accountBalances?.reduce((s, b) => s + (b.current_balance || 0), 0) ?? 0
  const totalValue = totalPhysical + totalDigital + totalConnected
  const docCount = documents?.length ?? 0
  const beneficiaryCount = beneficiaries?.length ?? 0

  const CHECKLIST_TOTAL = 12
  const checkedCount = compliance?.filter((c: any) => c.completed).length ?? 0
  const score = Math.round((checkedCount / CHECKLIST_TOTAL) * 100)

  // Build unified allocation from both manual assets and connected account balances
  const allocationMap: Record<string, number> = {}
  assets?.forEach((a: any) => { allocationMap[a.category] = (allocationMap[a.category] || 0) + (a.value || 0) })
  // Map connected account categories to display names
  const CAT_MAP: Record<string, string> = { banking: 'Bank Account', investment: 'Investment Account', crypto: 'Crypto', real_estate: 'Real Estate' }
  connectedAccounts?.forEach((conn: any) => {
    const label = CAT_MAP[conn.category] || conn.category
    const connTotal = accountBalances?.filter((b: any) => b.connected_account_id === conn.id).reduce((s: number, b: any) => s + (b.current_balance || 0), 0) ?? 0
    allocationMap[label] = (allocationMap[label] || 0) + connTotal
  })
  const assetsByCategory = Object.entries(allocationMap).sort(([, a]: any, [, b]: any) => b - a).slice(0, 5)

  const CAT_COLORS: Record<string, string> = {
    'Real Estate': '#0055ff', 'Investment Account': '#0099ff', 'Bank Account': '#6644ff',
    'Crypto': '#f7931a', 'Business': '#00cc66', 'Life Insurance': '#ff6688', 'Other': '#6b7ab8'
  }

  const recentDocs = documents?.slice(0, 3) ?? []

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user.email!} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '100vh' }}>
        {/* Top bar */}
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: '16px', backdropFilter: 'blur(20px)' }}>
          <div>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Dashboard</span>
            <span style={{ fontSize: '12px', color: '#6b7ab8', marginLeft: '8px' }}>Estate overview</span>
          </div>
          <div style={{ flex: 1 }} />
          <Link href="/vault" style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', color: '#6b7ab8' }}>↑ Upload Document</Link>
          <Link href="/compliance" style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', background: 'linear-gradient(135deg,#0055ff,#00aaff)', color: '#fff' }}>View Checklist</Link>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* Row 1: 3 stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.16)', borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em' }}>Total Estate Value</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(0,200,80,0.1)', border: '1px solid rgba(0,200,80,0.22)', borderRadius: '100px', padding: '3px 9px', fontSize: '10px', fontWeight: 700, color: '#00cc66' }}>
                  <span style={{ width: '5px', height: '5px', background: '#00cc66', borderRadius: '50%', boxShadow: '0 0 6px #00cc66', display: 'inline-block' }} />Live
                </span>
              </div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '32px', fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: '6px' }}>
                ${totalValue.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7ab8' }}>
                {(assets?.length ?? 0) + (digitalAssets?.length ?? 0)} manual · {connectedAccounts?.length ?? 0} connected
              </div>
            </div>

            <div style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.16)', borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em' }}>Documents</span>
                <Link href="/vault" style={{ fontSize: '12px', color: '#00aaff', textDecoration: 'none', fontWeight: 500 }}>View all →</Link>
              </div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '32px', fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: '6px' }}>{docCount}</div>
              <div style={{ fontSize: '12px', color: '#6b7ab8' }}>{docCount === 0 ? 'No documents yet' : `${docCount} file${docCount !== 1 ? 's' : ''} stored`}</div>
            </div>

            <div style={{ background: 'rgba(8,14,40,0.7)', border: `1px solid ${score >= 80 ? 'rgba(0,204,102,0.25)' : score >= 50 ? 'rgba(255,170,0,0.25)' : 'rgba(255,102,136,0.25)'}`, borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em' }}>Estate Score</span>
                <Link href="/compliance" style={{ fontSize: '12px', color: '#00aaff', textDecoration: 'none', fontWeight: 500 }}>Improve →</Link>
              </div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '32px', fontWeight: 800, color: score >= 80 ? '#00cc66' : score >= 50 ? '#ffaa00' : '#ff6688', lineHeight: 1, marginBottom: '6px' }}>{score}%</div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '5px', marginTop: '10px' }}>
                <div style={{ height: '100%', width: `${score}%`, background: score >= 80 ? '#00cc66' : score >= 50 ? '#ffaa00' : '#ff6688', borderRadius: '4px', transition: 'width .5s' }} />
              </div>
            </div>
          </div>

          {/* Row 2: Asset allocation + Action items */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '16px', marginBottom: '20px' }}>

            {/* Asset allocation */}
            <div style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.16)', borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em' }}>Asset Allocation</span>
                <Link href="/networth" style={{ fontSize: '12px', color: '#00aaff', textDecoration: 'none', fontWeight: 500 }}>Full breakdown →</Link>
              </div>
              {assetsByCategory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#6b7ab8' }}>
                  <div style={{ fontSize: '13px', marginBottom: '8px' }}>No assets tracked yet</div>
                  <Link href="/networth" style={{ fontSize: '12px', color: '#00aaff', textDecoration: 'none', fontWeight: 600 }}>+ Add your first asset</Link>
                </div>
              ) : (
                assetsByCategory.map(([cat, val]: any) => {
                  const pct = totalValue > 0 ? Math.round((val / totalValue) * 100) : 0
                  const color = CAT_COLORS[cat] || '#6b7ab8'
                  return (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: '12px', color: '#6b7ab8' }}>{cat}</div>
                      <div style={{ flex: 1.5, height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px' }} />
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#e8eaf6', minWidth: '60px', textAlign: 'right' }}>${val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : val >= 1000 ? `${(val/1000).toFixed(0)}K` : val.toLocaleString()}</div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Action items */}
            <div style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.16)', borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em' }}>Action Items</span>
              </div>
              {docCount === 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', borderRadius: '10px', marginBottom: '8px', background: 'rgba(255,160,0,0.07)', border: '1px solid rgba(255,160,0,0.18)' }}>
                  <div style={{ fontSize: '18px', marginTop: '1px' }}>⚠️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8eaf6', marginBottom: '2px' }}>No documents uploaded</div>
                    <div style={{ fontSize: '12px', color: '#6b7ab8' }}>Upload your will or trust to get started</div>
                  </div>
                  <Link href="/vault" style={{ fontSize: '12px', color: '#00aaff', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', marginTop: '2px' }}>Fix →</Link>
                </div>
              )}
              {beneficiaryCount === 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', borderRadius: '10px', marginBottom: '8px', background: 'rgba(0,80,255,0.07)', border: '1px solid rgba(0,100,255,0.18)' }}>
                  <div style={{ fontSize: '18px', marginTop: '1px' }}>💡</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8eaf6', marginBottom: '2px' }}>No beneficiaries added</div>
                    <div style={{ fontSize: '12px', color: '#6b7ab8' }}>Add your executor and heirs</div>
                  </div>
                  <Link href="/beneficiaries" style={{ fontSize: '12px', color: '#00aaff', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', marginTop: '2px' }}>Add →</Link>
                </div>
              )}
              {score === 100 && docCount > 0 && beneficiaryCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(0,200,80,0.06)', border: '1px solid rgba(0,200,80,0.18)' }}>
                  <div style={{ fontSize: '18px' }}>✅</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8eaf6', marginBottom: '2px' }}>Estate fully organized</div>
                    <div style={{ fontSize: '12px', color: '#6b7ab8' }}>All checklist items complete</div>
                  </div>
                </div>
              )}
              {score > 0 && score < 100 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(0,200,80,0.06)', border: '1px solid rgba(0,200,80,0.18)' }}>
                  <div style={{ fontSize: '18px' }}>📋</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8eaf6', marginBottom: '2px' }}>{checkedCount} of {CHECKLIST_TOTAL} items done</div>
                    <div style={{ fontSize: '12px', color: '#6b7ab8' }}>Complete your estate checklist</div>
                  </div>
                  <Link href="/compliance" style={{ fontSize: '12px', color: '#00aaff', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', marginTop: '2px' }}>View →</Link>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Recent docs + Beneficiaries */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

            {/* Recent docs */}
            <div style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.16)', borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em' }}>Recent Documents</span>
                <Link href="/vault" style={{ fontSize: '12px', color: '#00aaff', textDecoration: 'none', fontWeight: 500 }}>All documents →</Link>
              </div>
              {recentDocs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7ab8', fontSize: '13px' }}>
                  No documents yet · <Link href="/vault" style={{ color: '#00aaff', textDecoration: 'none' }}>Upload one</Link>
                </div>
              ) : recentDocs.map((doc: any) => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', borderRadius: '10px', marginBottom: '8px', background: 'rgba(0,80,255,0.07)', border: '1px solid rgba(0,100,255,0.14)' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(0,80,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>📄</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8eaf6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                    <div style={{ fontSize: '11px', color: '#00aaff', marginTop: '1px' }}>{doc.category}</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', background: 'rgba(0,200,80,0.12)', color: '#00cc66', flexShrink: 0 }}>Stored</span>
                </div>
              ))}
            </div>

            {/* Beneficiaries */}
            <div style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.16)', borderRadius: '16px', padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.1em' }}>Beneficiaries</span>
                <Link href="/beneficiaries" style={{ fontSize: '12px', color: '#00aaff', textDecoration: 'none', fontWeight: 500 }}>Manage →</Link>
              </div>
              {(beneficiaries?.length ?? 0) === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7ab8', fontSize: '13px' }}>
                  No beneficiaries yet · <Link href="/beneficiaries" style={{ color: '#00aaff', textDecoration: 'none' }}>Add one</Link>
                </div>
              ) : beneficiaries?.slice(0, 4).map((b: any) => {
                const initials = b.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                const colors = ['#0055ff','#6644ff','#00cc66','#ff6688','#ffaa00','#00aaff']
                const color = colors[b.full_name.charCodeAt(0) % colors.length]
                return (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(0,100,255,0.08)' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8eaf6' }}>{b.full_name}</div>
                      <div style={{ fontSize: '11px', color: '#6b7ab8' }}>{b.role}</div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7ab8' }}>{b.relationship}</div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
