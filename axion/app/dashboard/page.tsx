import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: documents } = await supabase.from('documents').select('*').eq('user_id', user.id)
  const { data: assets } = await supabase.from('assets').select('*').eq('user_id', user.id)
  const { data: beneficiaries } = await supabase.from('beneficiaries').select('*').eq('user_id', user.id)
  const { data: digitalAssets } = await supabase.from('digital_assets').select('*').eq('user_id', user.id)

  const totalValue = assets?.reduce((sum, a) => sum + (a.value || 0), 0) ?? 0
  const totalDigital = digitalAssets?.reduce((sum, a) => sum + (a.estimated_value || 0), 0) ?? 0
  const docCount = documents?.length ?? 0
  const beneficiaryCount = beneficiaries?.length ?? 0

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user.email!} />

      {/* Main */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '28px', fontWeight: 800, color: '#fff' }}>Dashboard</h1>
          <p style={{ color: '#6b7ab8', fontSize: '14px', marginTop: '4px' }}>Welcome back — here&apos;s your estate overview.</p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {[
            { label: 'Total Estate Value', value: `$${(totalValue + totalDigital).toLocaleString()}`, color: '#00aaff' },
            { label: 'Documents Stored', value: String(docCount), color: '#6644ff' },
            { label: 'Beneficiaries', value: String(beneficiaryCount), color: '#00cc66' },
            { label: 'Estate Health', value: docCount > 0 && beneficiaryCount > 0 ? 'Good' : 'Needs Setup', color: docCount > 0 && beneficiaryCount > 0 ? '#00cc66' : '#ffaa00' },
          ].map(card => (
            <div key={card.label} style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ fontSize: '12px', color: '#6b7ab8', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{card.label}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '30px', fontWeight: 800, color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '16px', padding: '28px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>Quick Actions</h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { href: '/vault', label: '+ Upload Document', primary: true },
              { href: '/networth', label: 'Add Asset', primary: false },
              { href: '/beneficiaries', label: 'Add Beneficiary', primary: false },
              { href: '/digital', label: 'Add Digital Asset', primary: false },
              { href: '/compliance', label: 'View Checklist', primary: false },
            ].map(action => (
              <Link key={action.href} href={action.href} style={{
                padding: '12px 20px',
                background: action.primary ? 'linear-gradient(135deg, #0055ff, #00aaff)' : 'transparent',
                border: action.primary ? 'none' : '1px solid rgba(0,100,255,0.25)',
                borderRadius: '10px', color: action.primary ? '#fff' : '#6b7ab8',
                textDecoration: 'none', fontSize: '14px', fontWeight: action.primary ? 700 : 600
              }}>
                {action.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Getting started / checklist preview */}
        {docCount === 0 && (
          <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: '16px', padding: '28px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '24px' }}>🚀</span>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Get started with Axion</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { done: docCount > 0, label: 'Upload your first document (will, trust, or insurance policy)', href: '/vault' },
                    { done: (assets?.length ?? 0) > 0, label: 'Add your assets to track your net worth', href: '/networth' },
                    { done: beneficiaryCount > 0, label: 'Add your beneficiaries and key contacts', href: '/beneficiaries' },
                    { done: (digitalAssets?.length ?? 0) > 0, label: 'Catalog your digital assets and accounts', href: '/digital' },
                  ].map((step, i) => (
                    <Link key={i} href={step.href} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: step.done ? '#00cc66' : 'rgba(0,100,255,0.15)', border: step.done ? '2px solid #00cc66' : '2px solid rgba(0,100,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {step.done && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: '13px', color: step.done ? '#4a5578' : '#6b7ab8', textDecoration: step.done ? 'line-through' : 'none' }}>{step.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
