'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', badge: null, badgeRed: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
      { label: 'Net Worth', href: '/networth', badge: 'Live', badgeRed: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-6"/></svg> },
    ]
  },
  {
    label: 'Estate',
    items: [
      { label: 'Documents', href: '/vault', badge: null, badgeRed: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg> },
      { label: 'Beneficiaries', href: '/beneficiaries', badge: null, badgeRed: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
      { label: 'Vault', href: '/vault', badge: null, badgeRed: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> },
    ]
  },
  {
    label: 'Tools',
    items: [
      { label: 'AI Advisor', href: '/ai', badge: null, badgeRed: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
      { label: 'Tax Optimizer', href: '/tax', badge: 'New', badgeRed: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M12 6v6l4 2"/></svg> },
      { label: 'Estate Timeline', href: '/timeline', badge: null, badgeRed: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
      { label: 'Inheritance Sim', href: '/simulator', badge: 'New', badgeRed: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> },
      { label: 'Attorney Connect', href: '/attorney', badge: null, badgeRed: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg> },
      { label: 'Digital Assets', href: '/digital', badge: null, badgeRed: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
      { label: 'Entity Tree', href: '/entities', badge: 'New', badgeRed: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v4M12 11l-5.5 6M12 11l5.5 6"/></svg> },
      { label: 'Compliance', href: '/compliance', badge: null, badgeRed: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> },
      { label: 'Integrations', href: '/integrations', badge: null, badgeRed: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> },
      { label: 'Family Access', href: '/family', badge: null, badgeRed: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    ]
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile', href: '/profile', badge: null, badgeRed: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
      { label: 'Settings', href: '/settings', badge: null, badgeRed: false, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
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
  const name = email ? email.split('@')[0] : 'User'

  return (
    <div style={{
      width: '220px', flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
      background: 'rgba(6,10,32,0.98)', borderRight: '1px solid rgba(0,100,255,0.12)',
      display: 'flex', flexDirection: 'column', overflowY: 'auto'
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px 16px', borderBottom: '1px solid rgba(0,100,255,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 12px rgba(0,120,255,0.4)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2L4 19h16L12 2z"/></svg>
        </div>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '.07em' }}>AXION</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '6px 10px', overflowY: 'auto' }}>
        {NAV_SECTIONS.map(section => (
          <div key={section.label} style={{ marginBottom: '2px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#3d4a7a', letterSpacing: '.15em', textTransform: 'uppercase', padding: '10px 8px 4px' }}>
              {section.label}
            </div>
            {section.items.map((item: any) => {
              const active = pathname === item.href || (item.href === '/vault' && item.label === 'Documents' && pathname === '/vault')
              return (
                <Link key={item.label + item.href} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: '9px',
                  padding: '7px 10px', borderRadius: '9px', textDecoration: 'none',
                  background: active ? 'rgba(0,80,255,0.14)' : 'transparent',
                  color: active ? '#fff' : '#6b7ab8',
                  fontSize: '13px', fontWeight: active ? 600 : 400,
                  marginBottom: '1px', transition: 'all .15s'
                }}>
                  <span style={{ width: '16px', height: '16px', flexShrink: 0, color: active ? '#00aaff' : '#6b7ab8', display: 'flex', alignItems: 'center' }}>
                    {item.icon}
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '10px', background: item.badgeRed ? 'rgba(255,60,60,0.15)' : 'rgba(0,170,255,0.15)', border: item.badgeRed ? '1px solid rgba(255,60,60,0.3)' : '1px solid rgba(0,170,255,0.3)', color: item.badgeRed ? '#ff6060' : '#00aaff' }}>
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
      <div style={{ padding: '10px', borderTop: '1px solid rgba(0,100,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,100,255,0.1)' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#0055ff,#00aaff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#e8eaf6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: '10px', color: '#3d4a7a' }}>Free Plan</div>
          </div>
        </div>
        <button onClick={signOut} style={{ width: '100%', marginTop: '6px', padding: '6px', background: 'transparent', border: '1px solid rgba(255,60,60,0.15)', borderRadius: '8px', color: '#ff6666', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>Sign Out</button>
      </div>
    </div>
  )
}
