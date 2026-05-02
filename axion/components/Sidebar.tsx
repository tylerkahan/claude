'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
      { label: 'Net Worth', href: '/networth', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-6"/></svg>, badge: 'Live', badgeRed: false },
    ]
  },
  {
    label: 'Estate',
    items: [
      { label: 'Document Vault', href: '/vault', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg> },
      { label: 'Beneficiaries', href: '/beneficiaries', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
      { label: 'Digital Assets', href: '/digital', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
      { label: 'Family Access', href: '/family', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    ]
  },
  {
    label: 'Tools',
    items: [
      { label: 'Compliance', href: '/compliance', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> },
    ]
  },
  {
    label: 'Account',
    items: [
      { label: 'Settings', href: '/settings', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
    ]
  }
]

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = email ? email.slice(0, 2).toUpperCase() : 'AX'

  return (
    <div style={{
      width: '220px', flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
      background: 'rgba(6,10,32,0.95)', borderRight: '1px solid rgba(0,100,255,0.12)',
      display: 'flex', flexDirection: 'column', overflowY: 'auto'
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 18px', borderBottom: '1px solid rgba(0,100,255,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 0 6px rgba(0,170,255,0.5))' }}>
          <path d="M12 2L2 19h20L12 2z" fill="url(#lg)" />
          <defs><linearGradient id="lg" x1="12" y1="2" x2="12" y2="19" gradientUnits="userSpaceOnUse"><stop stopColor="#0055ff"/><stop offset="1" stopColor="#00aaff"/></linearGradient></defs>
        </svg>
        <div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '17px', fontWeight: 800, color: '#fff', letterSpacing: '.07em' }}>AXION</div>
          <div style={{ fontSize: '9px', color: '#3d4a7a', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: '1px' }}>Estate Platform</div>
        </div>
      </div>

      {/* Nav sections */}
      <nav style={{ flex: 1, padding: '8px 10px' }}>
        {NAV_SECTIONS.map(section => (
          <div key={section.label} style={{ marginBottom: '4px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#3d4a7a', letterSpacing: '.15em', textTransform: 'uppercase', padding: '10px 8px 5px' }}>
              {section.label}
            </div>
            {section.items.map((item: any) => {
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: '9px',
                  padding: '8px 10px', borderRadius: '9px', textDecoration: 'none',
                  background: active ? 'rgba(0,80,255,0.14)' : 'transparent',
                  color: active ? '#fff' : '#6b7ab8',
                  fontSize: '13px', fontWeight: active ? 600 : 500,
                  marginBottom: '1px', transition: 'all .15s'
                }}>
                  <span style={{ width: '16px', height: '16px', flexShrink: 0, color: active ? '#00aaff' : '#6b7ab8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.icon}
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', background: item.badgeRed ? 'rgba(255,60,60,0.15)' : 'rgba(0,170,255,0.15)', border: item.badgeRed ? '1px solid rgba(255,60,60,0.25)' : '1px solid rgba(0,170,255,0.25)', color: item.badgeRed ? '#ff6060' : '#00aaff' }}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User pill */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(0,100,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,100,255,0.1)' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#0055ff,#00aaff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#e8eaf6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
            <div style={{ fontSize: '10px', color: '#3d4a7a', marginTop: '1px' }}>Free Plan</div>
          </div>
        </div>
        <button onClick={signOut} style={{ width: '100%', marginTop: '8px', padding: '7px', background: 'transparent', border: '1px solid rgba(255,60,60,0.15)', borderRadius: '8px', color: '#ff6666', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
          Sign Out
        </button>
      </div>
    </div>
  )
}
