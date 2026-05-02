'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const INTEGRATIONS = [
  { name: 'Fidelity', category: 'Investment', icon: '📊', desc: 'Sync your brokerage and retirement accounts automatically', connected: false, color: '#00cc66' },
  { name: 'Charles Schwab', category: 'Investment', icon: '📈', desc: 'Import portfolio values and account details', connected: false, color: '#0055ff' },
  { name: 'Coinbase', category: 'Crypto', icon: '₿', desc: 'Track your crypto holdings and wallet balances', connected: false, color: '#f7931a' },
  { name: 'DocuSign', category: 'Documents', icon: '✍️', desc: 'Sign and store estate documents securely', connected: false, color: '#ffaa00' },
  { name: 'Chase', category: 'Banking', icon: '🏦', desc: 'Connect bank accounts for real-time balance tracking', connected: false, color: '#00aaff' },
  { name: 'Google Drive', category: 'Storage', icon: '📁', desc: 'Import documents directly from your Google Drive', connected: false, color: '#6644ff' },
  { name: 'Plaid', category: 'Banking', icon: '🔗', desc: 'Connect any bank or investment account via Plaid', connected: false, color: '#00d4ff' },
  { name: 'Zillow', category: 'Real Estate', icon: '🏠', desc: 'Get live property valuations for your real estate', connected: false, color: '#00cc66' },
]

const CATEGORIES = ['All', 'Investment', 'Crypto', 'Banking', 'Documents', 'Storage', 'Real Estate']

export default function IntegrationsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [connected, setConnected] = useState<Record<string, boolean>>({})
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

  const filtered = filter === 'All' ? INTEGRATIONS : INTEGRATIONS.filter(i => i.category === filter)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Integrations</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8', marginLeft: '10px' }}>Connect your accounts & services</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* Category filter */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setFilter(c)} style={{ padding: '6px 14px', borderRadius: '20px', border: `1px solid ${filter === c ? 'rgba(0,170,255,0.4)' : 'rgba(0,100,255,0.18)'}`, background: filter === c ? 'rgba(0,120,255,0.12)' : 'transparent', color: filter === c ? '#00aaff' : '#6b7ab8', fontSize: '12px', fontWeight: filter === c ? 700 : 400, cursor: 'pointer', transition: 'all .15s' }}>
                {c}
              </button>
            ))}
          </div>

          {/* Integration grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {filtered.map(integration => (
              <div key={integration.name} style={{ background: 'rgba(8,14,40,0.7)', border: `1px solid ${connected[integration.name] ? 'rgba(0,204,102,0.25)' : 'rgba(0,100,255,0.14)'}`, borderRadius: '14px', padding: '20px', backdropFilter: 'blur(20px)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>{integration.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{integration.name}</div>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '6px', background: 'rgba(0,100,255,0.1)', color: '#6b7ab8' }}>{integration.category}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7ab8', lineHeight: '1.5', marginBottom: '14px' }}>{integration.desc}</div>
                    <button onClick={() => setConnected(p => ({ ...p, [integration.name]: !p[integration.name] }))} style={{ width: '100%', padding: '8px', background: connected[integration.name] ? 'rgba(0,204,102,0.1)' : 'linear-gradient(135deg,#0055ff,#00aaff)', border: connected[integration.name] ? '1px solid rgba(0,204,102,0.3)' : 'none', borderRadius: '8px', color: connected[integration.name] ? '#00cc66' : '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all .2s' }}>
                      {connected[integration.name] ? '✓ Connected' : 'Connect'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', background: 'rgba(0,100,255,0.05)', border: '1px solid rgba(0,100,255,0.12)', borderRadius: '14px', padding: '16px 20px', fontSize: '12px', color: '#6b7ab8' }}>
            💡 Integrations are currently in beta. Connecting an account will allow Axion to automatically sync your asset values and keep your net worth up to date.
          </div>
        </div>
      </div>
    </div>
  )
}
