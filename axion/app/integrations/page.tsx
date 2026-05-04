'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

// ── Types ─────────────────────────────────────────────────
type ConnectedAccount = {
  id: string
  institution_name: string
  integration_type: string
  category: string
  last_synced_at: string | null
  status: string
}
type AccountBalance = {
  id: string
  connected_account_id: string
  account_name: string
  account_type: string
  current_balance: number
  currency_code: string
  last_updated: string
}

// ── Supported institutions (Plaid covers all banking/investment) ──
const PLAID_INSTITUTIONS = [
  { id: 'fidelity', name: 'Fidelity', logo: '📊', desc: 'Brokerage, IRA, 401k accounts', category: 'investment' },
  { id: 'schwab', name: 'Charles Schwab', logo: '📈', desc: 'Brokerage and banking accounts', category: 'investment' },
  { id: 'vanguard', name: 'Vanguard', logo: '🏛️', desc: 'Index funds, ETFs, retirement', category: 'investment' },
  { id: 'robinhood', name: 'Robinhood', logo: '🟢', desc: 'Stocks, ETFs, crypto', category: 'investment' },
  { id: 'chase', name: 'Chase', logo: '🏦', desc: 'Checking, savings, investments', category: 'banking' },
  { id: 'bofa', name: 'Bank of America', logo: '🏦', desc: 'Banking and Merrill accounts', category: 'banking' },
  { id: 'wells', name: 'Wells Fargo', logo: '🏦', desc: 'Bank and brokerage accounts', category: 'banking' },
  { id: 'other', name: 'Other Institution', logo: '🔗', desc: '12,000+ banks and brokerages supported', category: 'banking' },
]

const CRYPTO_COINS = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'BNB', 'XRP', 'ADA', 'AVAX', 'DOGE', 'MATIC', 'DOT', 'LINK', 'UNI', 'LTC']

const fmt = (n: number) => n >= 1_000_000
  ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}K`
  : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  banking:     { bg: 'rgba(0,170,255,0.08)',  border: 'rgba(0,170,255,0.3)',  text: '#00aaff' },
  investment:  { bg: 'rgba(0,204,102,0.08)',  border: 'rgba(0,204,102,0.3)',  text: '#00cc66' },
  crypto:      { bg: 'rgba(247,147,26,0.08)', border: 'rgba(247,147,26,0.3)', text: '#f7931a' },
  real_estate: { bg: 'rgba(102,68,255,0.08)', border: 'rgba(102,68,255,0.3)', text: '#aa88ff' },
}

export default function IntegrationsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [connections, setConnections] = useState<ConnectedAccount[]>([])
  const [balances, setBalances] = useState<AccountBalance[]>([])
  const [syncing, setSyncing] = useState(false)
  const [activeModal, setActiveModal] = useState<null | 'plaid' | 'crypto' | 'property' | 'coinbase_setup'>(null)
  const [plaidReady, setPlaidReady] = useState(false)
  const [plaidConfigured, setPlaidConfigured] = useState(true)
  const [coinbaseConfigured, setCoinbaseConfigured] = useState(true)

  // crypto form
  const [cryptoForm, setCryptoForm] = useState({ symbol: 'BTC', amount: '' })
  const [cryptoPrice, setCryptoPrice] = useState<number | null>(null)
  const [cryptoSaving, setCryptoSaving] = useState(false)

  // property form
  const [propForm, setPropForm] = useState({ address: '', value: '' })
  const [propSaving, setPropSaving] = useState(false)

  const router = useRouter()

  // Load Plaid script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    script.onload = () => setPlaidReady(true)
    document.body.appendChild(script)
  }, [])

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)

    const [{ data: conns }, { data: bals }] = await Promise.all([
      supabase.from('connected_accounts').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('account_balances').select('*').eq('user_id', user.id),
    ])
    setConnections(conns ?? [])
    setBalances(bals ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  // Check for Coinbase callback result in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('coinbase') === 'connected') {
      window.history.replaceState({}, '', '/integrations')
    }
    if (params.get('error') === 'coinbase_not_configured') {
      setCoinbaseConfigured(false)
      setActiveModal('coinbase_setup')
      window.history.replaceState({}, '', '/integrations')
    }
  }, [])

  // Fetch live crypto price when symbol changes
  useEffect(() => {
    if (!cryptoForm.symbol) return
    fetch(`/api/crypto/prices?symbols=${cryptoForm.symbol}`)
      .then(r => r.json())
      .then(data => setCryptoPrice(data[cryptoForm.symbol] ?? null))
      .catch(() => setCryptoPrice(null))
  }, [cryptoForm.symbol])

  // ── Plaid flow ──────────────────────────────────────────
  async function openPlaidLink() {
    try {
      const res = await fetch('/api/plaid/link-token', { method: 'POST' })
      const data = await res.json()

      if (data.error) {
        if (data.error.includes('not configured')) {
          setPlaidConfigured(false)
          setActiveModal('plaid')
          return
        }
        alert(data.error)
        return
      }

      const { link_token } = data

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (window as any).Plaid.create({
        token: link_token,
        onSuccess: async (public_token: string, metadata: any) => {
          const exchangeRes = await fetch('/api/plaid/exchange-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_token, metadata }),
          })
          const result = await exchangeRes.json()
          if (result.error) { alert(result.error); return }
          await load()
        },
        onExit: () => {},
      })
      handler.open()
    } catch (err) {
      console.error(err)
      alert('Failed to open Plaid Link')
    }
  }

  // ── Sync all live connections ────────────────────────────
  async function syncAll() {
    setSyncing(true)
    const syncs: Promise<any>[] = []
    if (connections.some(c => c.integration_type === 'plaid')) syncs.push(fetch('/api/plaid/sync', { method: 'POST' }))
    if (connections.some(c => c.integration_type === 'coinbase')) syncs.push(fetch('/api/coinbase/sync', { method: 'POST' }))
    await Promise.all(syncs)
    await load()
    setSyncing(false)
  }

  // ── Disconnect ───────────────────────────────────────────
  async function disconnect(conn: ConnectedAccount) {
    if (!confirm(`Disconnect ${conn.institution_name}? This will remove all synced balances.`)) return
    let endpoint: string, method: string
    if (conn.integration_type === 'plaid') { endpoint = '/api/plaid/disconnect'; method = 'POST' }
    else if (conn.integration_type === 'coinbase') { endpoint = '/api/coinbase/disconnect'; method = 'POST' }
    else { endpoint = '/api/accounts'; method = 'DELETE' }
    await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: conn.id }),
    })
    await load()
  }

  // ── Connect Coinbase ─────────────────────────────────────
  function connectCoinbase() {
    window.location.href = '/api/coinbase/auth?source=integrations'
  }

  // ── Add Crypto ───────────────────────────────────────────
  async function saveCrypto(e: React.FormEvent) {
    e.preventDefault()
    setCryptoSaving(true)
    const amount = parseFloat(cryptoForm.amount)
    const value = cryptoPrice ? cryptoPrice * amount : 0
    await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        integration_type: 'crypto',
        institution_name: `${cryptoForm.symbol} Wallet`,
        category: 'crypto',
        account_name: `${cryptoForm.amount} ${cryptoForm.symbol}`,
        account_type: 'crypto',
        current_balance: value,
      }),
    })
    setCryptoForm({ symbol: 'BTC', amount: '' })
    setActiveModal(null)
    await load()
    setCryptoSaving(false)
  }

  // ── Add Property ─────────────────────────────────────────
  async function saveProperty(e: React.FormEvent) {
    e.preventDefault()
    setPropSaving(true)
    await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        integration_type: 'real_estate',
        institution_name: propForm.address || 'Property',
        category: 'real_estate',
        account_name: propForm.address || 'Real Estate',
        account_type: 'real_estate',
        current_balance: parseFloat(propForm.value) || 0,
      }),
    })
    setPropForm({ address: '', value: '' })
    setActiveModal(null)
    await load()
    setPropSaving(false)
  }

  // ── Compute totals ────────────────────────────────────────
  const totalByCategory = connections.reduce((acc, conn) => {
    const connBalances = balances.filter(b => b.connected_account_id === conn.id)
    const total = connBalances.reduce((s, b) => s + (b.current_balance || 0), 0)
    acc[conn.category] = (acc[conn.category] || 0) + total
    return acc
  }, {} as Record<string, number>)

  const grandTotal = Object.values(totalByCategory).reduce((a, b) => a + b, 0)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: '12px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Integrations</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8' }}>Connected accounts &amp; live data</span>
          <div style={{ flex: 1 }} />
          {connections.some(c => ['plaid', 'coinbase'].includes(c.integration_type)) && (
            <button onClick={syncAll} disabled={syncing} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(0,170,255,0.3)', borderRadius: '8px', color: '#00aaff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              {syncing ? '⟳ Syncing...' : '⟳ Sync Now'}
            </button>
          )}
          <button onClick={() => setActiveModal('property')} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#6b7ab8', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>+ Add Property</button>
          <button onClick={() => setActiveModal('crypto')} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid rgba(247,147,26,0.3)', borderRadius: '8px', color: '#f7931a', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>+ Add Crypto</button>
          <button onClick={openPlaidLink} disabled={!plaidReady} style={{ padding: '7px 16px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: plaidReady ? 1 : 0.6 }}>+ Connect Bank / Brokerage</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* Summary cards (if any connected) */}
          {grandTotal > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(0,55,180,0.12)', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '14px', padding: '16px 20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' }}>Total Connected</div>
                <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: "'Space Grotesk',sans-serif", color: '#fff' }}>{fmt(grandTotal)}</div>
              </div>
              {Object.entries(totalByCategory).filter(([,v]) => v > 0).map(([cat, val]) => {
                const c = CATEGORY_COLORS[cat] || CATEGORY_COLORS.banking
                return (
                  <div key={cat} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '14px', padding: '16px 20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: c.text, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' }}>{cat.replace('_', ' ')}</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: "'Space Grotesk',sans-serif", color: '#fff' }}>{fmt(val)}</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Connected accounts */}
          {connections.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: '12px' }}>Connected Accounts</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {connections.map(conn => {
                  const connBalances = balances.filter(b => b.connected_account_id === conn.id)
                  const total = connBalances.reduce((s, b) => s + (b.current_balance || 0), 0)
                  const c = CATEGORY_COLORS[conn.category] || CATEGORY_COLORS.banking
                  return (
                    <div key={conn.id} style={{ background: 'rgba(8,14,40,0.7)', border: `1px solid ${c.border}`, borderRadius: '14px', padding: '16px 20px', backdropFilter: 'blur(20px)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: connBalances.length > 0 ? '12px' : '0' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                          {conn.integration_type === 'coinbase' ? '🔵' : conn.category === 'crypto' ? '₿' : conn.category === 'real_estate' ? '🏠' : conn.category === 'investment' ? '📈' : '🏦'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{conn.institution_name}</span>
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{conn.category.replace('_', ' ')}</span>
                            {['plaid', 'coinbase'].includes(conn.integration_type) && <span style={{ fontSize: '10px', color: '#00cc66', fontWeight: 600 }}>● Live</span>}
                          </div>
                          {conn.last_synced_at && (
                            <div style={{ fontSize: '11px', color: '#3d4a7a' }}>
                              Last synced: {new Date(conn.last_synced_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: "'Space Grotesk',sans-serif", color: '#fff' }}>{fmt(total)}</div>
                          <div style={{ fontSize: '11px', color: '#6b7ab8' }}>{connBalances.length} account{connBalances.length !== 1 ? 's' : ''}</div>
                        </div>
                        <button onClick={() => disconnect(conn)} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid rgba(255,60,60,0.2)', borderRadius: '6px', color: '#ff6666', cursor: 'pointer', fontSize: '11px', flexShrink: 0 }}>Disconnect</button>
                      </div>

                      {/* Individual accounts */}
                      {connBalances.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '10px', borderTop: '1px solid rgba(0,100,255,0.1)' }}>
                          {connBalances.map(bal => (
                            <div key={bal.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)' }}>
                              <div>
                                <span style={{ fontSize: '13px', color: '#e8eaf6' }}>{bal.account_name}</span>
                                <span style={{ fontSize: '11px', color: '#3d4a7a', marginLeft: '8px' }}>{bal.account_type}</span>
                              </div>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{fmt(bal.current_balance)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Available integrations */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: '14px' }}>Available Integrations</div>

            {/* Plaid section */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7ab8', marginBottom: '10px' }}>🏦 Banks &amp; Brokerages — via Plaid</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '10px' }}>
                {PLAID_INSTITUTIONS.map(inst => {
                  const isConnected = connections.some(c => c.institution_name.toLowerCase().includes(inst.id === 'other' ? '' : inst.name.toLowerCase().split(' ')[0].toLowerCase()))
                  return (
                    <div key={inst.id} style={{ background: 'rgba(8,14,40,0.7)', border: `1px solid ${isConnected ? 'rgba(0,204,102,0.25)' : 'rgba(0,100,255,0.14)'}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(0,100,255,0.1)', border: '1px solid rgba(0,100,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{inst.logo}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{inst.name}</div>
                        <div style={{ fontSize: '11px', color: '#6b7ab8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.desc}</div>
                      </div>
                      <button onClick={openPlaidLink} disabled={!plaidReady} style={{ padding: '5px 12px', background: isConnected ? 'rgba(0,204,102,0.1)' : 'linear-gradient(135deg,#0055ff,#00aaff)', border: isConnected ? '1px solid rgba(0,204,102,0.3)' : 'none', borderRadius: '7px', color: isConnected ? '#00cc66' : '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                        {isConnected ? '✓ Add More' : 'Connect'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Crypto section */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7ab8', marginBottom: '10px' }}>₿ Cryptocurrency</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                {/* Coinbase OAuth */}
                {(() => {
                  const isConnected = connections.some(c => c.integration_type === 'coinbase')
                  return (
                    <div style={{ background: 'rgba(8,14,40,0.7)', border: `1px solid ${isConnected ? 'rgba(0,204,102,0.25)' : 'rgba(247,147,26,0.18)'}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(0,82,255,0.15)', border: '1px solid rgba(0,82,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>🔵</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '1px' }}>Coinbase</div>
                        <div style={{ fontSize: '11px', color: '#6b7ab8' }}>Live wallet balances via OAuth — BTC, ETH, SOL, and all your coins</div>
                      </div>
                      <button onClick={connectCoinbase} style={{ padding: '5px 14px', background: isConnected ? 'rgba(0,204,102,0.1)' : 'rgba(247,147,26,0.15)', border: `1px solid ${isConnected ? 'rgba(0,204,102,0.3)' : 'rgba(247,147,26,0.35)'}`, borderRadius: '7px', color: isConnected ? '#00cc66' : '#f7931a', fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                        {isConnected ? '+ Add Another' : 'Connect'}
                      </button>
                    </div>
                  )
                })()}

                {/* Manual holdings */}
                <div style={{ background: 'rgba(247,147,26,0.04)', border: '1px solid rgba(247,147,26,0.13)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(247,147,26,0.1)', border: '1px solid rgba(247,147,26,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>₿</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '1px' }}>Manual Entry</div>
                    <div style={{ fontSize: '11px', color: '#6b7ab8' }}>Self-custody wallets or other exchanges — prices from CoinGecko</div>
                  </div>
                  <button onClick={() => setActiveModal('crypto')} style={{ padding: '5px 14px', background: 'rgba(247,147,26,0.12)', border: '1px solid rgba(247,147,26,0.3)', borderRadius: '7px', color: '#f7931a', fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>+ Add Holding</button>
                </div>

              </div>
            </div>

            {/* Real estate */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7ab8', marginBottom: '10px' }}>🏠 Real Estate — Manual Entry</div>
              <div style={{ background: 'rgba(102,68,255,0.05)', border: '1px solid rgba(102,68,255,0.15)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '32px' }}>🏠</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '3px' }}>Property Value</div>
                  <div style={{ fontSize: '12px', color: '#6b7ab8' }}>Add properties by address and estimated value. Use Zillow or Redfin to look up current estimates.</div>
                </div>
                <button onClick={() => setActiveModal('property')} style={{ padding: '8px 18px', background: 'rgba(102,68,255,0.12)', border: '1px solid rgba(102,68,255,0.3)', borderRadius: '8px', color: '#aa88ff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>+ Add Property</button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────── */}

      {/* Plaid not configured modal */}
      {activeModal === 'plaid' && !plaidConfigured && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#060818', border: '1px solid rgba(0,100,255,0.25)', borderRadius: '20px', padding: '32px', maxWidth: '520px', width: '100%' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔑</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Plaid API Keys Required</h3>
            <p style={{ fontSize: '14px', color: '#6b7ab8', lineHeight: '1.7', marginBottom: '20px' }}>
              To connect banks and brokerages, you need free Plaid API keys. Sign up at{' '}
              <a href="https://dashboard.plaid.com/signup" target="_blank" rel="noopener noreferrer" style={{ color: '#00aaff' }}>dashboard.plaid.com</a>, then add these to your Vercel environment variables:
            </p>
            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '10px', padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px', color: '#00d4ff', marginBottom: '20px', lineHeight: '2' }}>
              PLAID_CLIENT_ID=your_client_id<br/>
              PLAID_SECRET=your_sandbox_secret<br/>
              PLAID_ENV=sandbox
            </div>
            <div style={{ fontSize: '12px', color: '#6b7ab8', marginBottom: '20px' }}>
              💡 Sandbox is free and uses test credentials. When ready for production, change <code style={{color:'#00aaff'}}>PLAID_ENV=production</code> and use your production secret.
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setActiveModal(null)} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#6b7ab8', cursor: 'pointer', fontSize: '13px' }}>Close</button>
              <a href="https://dashboard.plaid.com/signup" target="_blank" rel="noopener noreferrer" style={{ padding: '9px 20px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>Get Plaid Keys →</a>
            </div>
          </div>
        </div>
      )}

      {/* Crypto modal */}
      {activeModal === 'crypto' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#060818', border: '1px solid rgba(247,147,26,0.25)', borderRadius: '20px', padding: '32px', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>Add Crypto Holding</h3>
            <form onSubmit={saveCrypto} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Coin</label>
                <select value={cryptoForm.symbol} onChange={e => setCryptoForm(p => ({ ...p, symbol: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(247,147,26,0.2)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }}>
                  {CRYPTO_COINS.map(c => <option key={c} style={{ background: '#060818' }}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Amount (how many coins)</label>
                <input required type="number" step="any" min="0" value={cryptoForm.amount} onChange={e => setCryptoForm(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 0.5"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(247,147,26,0.2)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
              </div>
              {cryptoPrice && cryptoForm.amount && (
                <div style={{ background: 'rgba(247,147,26,0.08)', border: '1px solid rgba(247,147,26,0.2)', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#6b7ab8' }}>Current value ({cryptoForm.symbol} @ ${cryptoPrice.toLocaleString()})</span>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#f7931a' }}>{fmt(cryptoPrice * parseFloat(cryptoForm.amount || '0'))}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => setActiveModal(null)} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#6b7ab8', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                <button type="submit" disabled={cryptoSaving} style={{ padding: '9px 22px', background: 'rgba(247,147,26,0.15)', border: '1px solid rgba(247,147,26,0.3)', borderRadius: '8px', color: '#f7931a', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  {cryptoSaving ? 'Saving...' : 'Add Holding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coinbase not configured modal */}
      {activeModal === 'coinbase_setup' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#060818', border: '1px solid rgba(247,147,26,0.25)', borderRadius: '20px', padding: '32px', maxWidth: '540px', width: '100%' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔑</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Coinbase API Keys Required</h3>
            <p style={{ fontSize: '14px', color: '#6b7ab8', lineHeight: '1.7', marginBottom: '20px' }}>
              To connect Coinbase, create a free OAuth app at{' '}
              <a href="https://www.coinbase.com/settings/api" target="_blank" rel="noopener noreferrer" style={{ color: '#f7931a' }}>coinbase.com/settings/api</a> and add these to your Vercel environment variables:
            </p>
            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(247,147,26,0.15)', borderRadius: '10px', padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px', color: '#f7931a', marginBottom: '16px', lineHeight: '2' }}>
              COINBASE_CLIENT_ID=your_client_id<br/>
              COINBASE_CLIENT_SECRET=your_client_secret<br/>
              NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
            </div>
            <div style={{ background: 'rgba(247,147,26,0.06)', border: '1px solid rgba(247,147,26,0.15)', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#6b7ab8', marginBottom: '20px', lineHeight: '1.7' }}>
              <strong style={{ color: '#f7931a' }}>Redirect URI to add in Coinbase dashboard:</strong><br/>
              <code style={{ color: '#fff' }}>https://your-app.vercel.app/api/coinbase/callback</code><br/>
              Set the scope to <code style={{ color: '#f7931a' }}>wallet:accounts:read</code>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setActiveModal(null)} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#6b7ab8', cursor: 'pointer', fontSize: '13px' }}>Close</button>
              <a href="https://www.coinbase.com/settings/api" target="_blank" rel="noopener noreferrer" style={{ padding: '9px 20px', background: 'rgba(247,147,26,0.15)', border: '1px solid rgba(247,147,26,0.4)', borderRadius: '8px', color: '#f7931a', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>Open Coinbase Settings →</a>
            </div>
          </div>
        </div>
      )}

      {/* Property modal */}
      {activeModal === 'property' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#060818', border: '1px solid rgba(102,68,255,0.25)', borderRadius: '20px', padding: '32px', maxWidth: '440px', width: '100%' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Add Real Estate Property</h3>
            <p style={{ fontSize: '13px', color: '#6b7ab8', marginBottom: '20px', lineHeight: '1.6' }}>
              Enter your property&apos;s address and current estimated value. Check{' '}
              <a href="https://www.zillow.com" target="_blank" rel="noopener noreferrer" style={{ color: '#00aaff' }}>Zillow</a> or{' '}
              <a href="https://www.redfin.com" target="_blank" rel="noopener noreferrer" style={{ color: '#00aaff' }}>Redfin</a> for the latest estimate.
            </p>
            <form onSubmit={saveProperty} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Property Address</label>
                <input required value={propForm.address} onChange={e => setPropForm(p => ({ ...p, address: e.target.value }))} placeholder="e.g. 123 Oak Drive, Austin, TX 78701"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(102,68,255,0.2)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Estimated Value ($)</label>
                <input required type="number" min="0" value={propForm.value} onChange={e => setPropForm(p => ({ ...p, value: e.target.value }))} placeholder="e.g. 850000"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(102,68,255,0.2)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
              </div>
              {propForm.value && (
                <div style={{ background: 'rgba(102,68,255,0.08)', border: '1px solid rgba(102,68,255,0.2)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#aa88ff', fontWeight: 600 }}>
                  🏠 {fmt(parseFloat(propForm.value))} will be added to your estate value
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => setActiveModal(null)} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#6b7ab8', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                <button type="submit" disabled={propSaving} style={{ padding: '9px 22px', background: 'rgba(102,68,255,0.15)', border: '1px solid rgba(102,68,255,0.3)', borderRadius: '8px', color: '#aa88ff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  {propSaving ? 'Saving...' : 'Add Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
