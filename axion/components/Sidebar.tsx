'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV = [
  { label: 'Dashboard',        href: '/dashboard',      icon: '▦' },
  { label: 'Document Vault',   href: '/vault',          icon: '🔒' },
  { label: 'Net Worth',        href: '/networth',       icon: '📈' },
  { label: 'Beneficiaries',    href: '/beneficiaries',  icon: '👥' },
  { label: 'Digital Assets',   href: '/digital',        icon: '₿'  },
  { label: 'Family Access',    href: '/family',         icon: '🏠' },
  { label: 'Compliance',       href: '/compliance',     icon: '✅' },
  { label: 'Settings',         href: '/settings',       icon: '⚙️' },
]

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{
      width: '240px', flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
      background: 'rgba(8,14,40,0.95)', borderRight: '1px solid rgba(0,100,255,0.12)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(0,100,255,0.1)' }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '.07em' }}>AXION</div>
        <div style={{ fontSize: '10px', color: '#3d4a7a', marginTop: '2px', letterSpacing: '.08em', textTransform: 'uppercase' }}>Estate Platform</div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV.map(item => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: '10px', textDecoration: 'none',
              background: active ? 'rgba(0,100,255,0.18)' : 'transparent',
              color: active ? '#fff' : '#6b7ab8',
              fontSize: '13.5px', fontWeight: active ? 600 : 400,
              border: active ? '1px solid rgba(0,100,255,0.3)' : '1px solid transparent',
              transition: 'all .15s'
            }}>
              <span style={{ width: '18px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(0,100,255,0.1)' }}>
        <div style={{ fontSize: '12px', color: '#6b7ab8', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
        <button onClick={signOut} style={{
          width: '100%', padding: '8px', background: 'transparent',
          border: '1px solid rgba(255,60,60,0.2)', borderRadius: '8px',
          color: '#ff6666', cursor: 'pointer', fontSize: '12px', fontWeight: 600
        }}>Sign Out</button>
      </div>
    </div>
  )
}
