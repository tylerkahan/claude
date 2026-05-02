import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: documents } = await supabase.from('documents').select('*').eq('user_id', user.id)
  const { data: assets } = await supabase.from('assets').select('*').eq('user_id', user.id)

  const totalValue = assets?.reduce((sum, a) => sum + (a.value || 0), 0) ?? 0
  const docCount = documents?.length ?? 0

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: '⬛', active: true },
    { label: 'Document Vault', href: '/vault', icon: '🔒', active: false },
    { label: 'Net Worth', href: '/networth', icon: '📈', active: false },
    { label: 'Beneficiaries', href: '/beneficiaries', icon: '👥', active: false },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>

      {/* Sidebar */}
      <div style={{
        width: '240px', flexShrink: 0,
        background: 'rgba(8,14,40,0.9)', borderRight: '1px solid rgba(0,100,255,0.12)',
        display: 'flex', flexDirection: 'column', padding: '24px 0'
      }}>
        <div style={{ padding: '0 20px 28px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '.07em', borderBottom: '1px solid rgba(0,100,255,0.1)' }}>
          AXION
        </div>
        <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map(item => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '10px', textDecoration: 'none',
              background: item.active ? 'rgba(0,100,255,0.15)' : 'transparent',
              color: item.active ? '#fff' : '#6b7ab8',
              fontSize: '14px', fontWeight: item.active ? 600 : 400,
              border: item.active ? '1px solid rgba(0,100,255,0.25)' : '1px solid transparent',
              transition: 'all .15s'
            }}>
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid rgba(0,100,255,0.1)' }}>
          <div style={{ fontSize: '12px', color: '#6b7ab8' }}>{user.email}</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '28px', fontWeight: 800, color: '#fff' }}>Dashboard</h1>
          <p style={{ color: '#6b7ab8', fontSize: '14px', marginTop: '4px' }}>Welcome back — here&apos;s your estate overview.</p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
          <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '12px', color: '#6b7ab8', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Total Estate Value</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '32px', fontWeight: 800, background: 'linear-gradient(135deg, #fff, #00aaff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ${totalValue.toLocaleString()}
            </div>
          </div>
          <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '12px', color: '#6b7ab8', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Documents Stored</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '32px', fontWeight: 800, background: 'linear-gradient(135deg, #fff, #00aaff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {docCount}
            </div>
          </div>
          <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '12px', color: '#6b7ab8', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Estate Health</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '32px', fontWeight: 800, color: docCount > 0 ? '#00cc66' : '#ffaa00' }}>
              {docCount > 0 ? 'Good' : 'Setup needed'}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '16px', padding: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>Quick Actions</h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/vault" style={{
              padding: '12px 20px', background: 'linear-gradient(135deg, #0055ff, #00aaff)',
              borderRadius: '10px', color: '#fff', textDecoration: 'none',
              fontSize: '14px', fontWeight: 700
            }}>
              + Upload Document
            </Link>
            <Link href="/networth" style={{
              padding: '12px 20px', background: 'transparent',
              border: '1px solid rgba(0,100,255,0.25)',
              borderRadius: '10px', color: '#6b7ab8', textDecoration: 'none',
              fontSize: '14px', fontWeight: 600
            }}>
              Add Asset
            </Link>
            <Link href="/beneficiaries" style={{
              padding: '12px 20px', background: 'transparent',
              border: '1px solid rgba(0,100,255,0.25)',
              borderRadius: '10px', color: '#6b7ab8', textDecoration: 'none',
              fontSize: '14px', fontWeight: 600
            }}>
              Add Beneficiary
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
