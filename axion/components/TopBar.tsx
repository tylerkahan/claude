'use client'
import Link from 'next/link'

interface TopBarProps {
  title: string
  subtitle?: string
  primaryAction?: { label: string; href?: string; onClick?: () => void }
  secondaryAction?: { label: string; href?: string; onClick?: () => void }
}

export default function TopBar({ title, subtitle, primaryAction, secondaryAction }: TopBarProps) {
  return (
    <div style={{
      height: '58px', flexShrink: 0,
      background: 'rgba(6,10,32,0.9)',
      borderBottom: '1px solid rgba(0,100,255,0.12)',
      display: 'flex', alignItems: 'center',
      padding: '0 28px', gap: '16px',
      position: 'sticky', top: 0, zIndex: 10,
      backdropFilter: 'blur(20px)'
    }}>
      <div>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>{title}</span>
        {subtitle && <span style={{ fontSize: '12px', color: '#6b7ab8', marginLeft: '8px' }}>{subtitle}</span>}
      </div>
      <div style={{ flex: 1 }} />
      {secondaryAction && (
        secondaryAction.href
          ? <Link href={secondaryAction.href} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', color: '#6b7ab8' }}>{secondaryAction.label}</Link>
          : <button onClick={secondaryAction.onClick} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', color: '#6b7ab8' }}>{secondaryAction.label}</button>
      )}
      {primaryAction && (
        primaryAction.href
          ? <Link href={primaryAction.href} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', background: 'linear-gradient(135deg,#0055ff,#00aaff)', color: '#fff' }}>{primaryAction.label}</Link>
          : <button onClick={primaryAction.onClick} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg,#0055ff,#00aaff)', color: '#fff' }}>{primaryAction.label}</button>
      )}
    </div>
  )
}
