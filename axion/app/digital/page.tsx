'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const TYPES = ['Crypto Wallet', 'Exchange Account', 'Email', 'Social Media', 'Streaming', 'Domain/Website', 'Password Manager', 'Banking App', 'Other']
const TYPE_ICONS: Record<string, string> = {
  'Crypto Wallet': '₿', 'Exchange Account': '📊', 'Email': '✉️',
  'Social Media': '📱', 'Streaming': '🎬', 'Domain/Website': '🌐',
  'Password Manager': '🔑', 'Banking App': '🏦', 'Other': '💻'
}
const TYPE_COLORS: Record<string, string> = {
  'Crypto Wallet': '#f7931a', 'Exchange Account': '#00aaff', 'Email': '#6644ff',
  'Social Media': '#ff6688', 'Streaming': '#e50914', 'Domain/Website': '#00cc66',
  'Password Manager': '#ffaa00', 'Banking App': '#00d4ff', 'Other': '#6b7ab8'
}
const INSTRUCTIONS = ['Log in and delete', 'Transfer to heir', 'Memorialize', 'Close account', 'Download data first', 'No action needed']

export default function DigitalPage() {
  const [user, setUser] = useState<any>(null)
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ platform: '', type: 'Crypto Wallet', username: '', estimated_value: '', instructions: 'No action needed', notes: '' })
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchAssets(user.id)
      setLoading(false)
    }
    load()
  }, [router])

  async function fetchAssets(userId: string) {
    const supabase = createClient()
    const { data } = await supabase.from('digital_assets').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    setAssets(data ?? [])
  }

  async function addAsset(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('digital_assets').insert({
      user_id: user.id,
      platform: form.platform,
      type: form.type,
      username: form.username,
      estimated_value: parseFloat(form.estimated_value) || 0,
      instructions: form.instructions,
      notes: form.notes
    })
    setForm({ platform: '', type: 'Crypto Wallet', username: '', estimated_value: '', instructions: 'No action needed', notes: '' })
    setShowForm(false)
    await fetchAssets(user.id)
    setSaving(false)
  }

  async function deleteAsset(id: string) {
    const supabase = createClient()
    await supabase.from('digital_assets').delete().eq('id', id)
    await fetchAssets(user.id)
  }

  const totalValue = assets.reduce((sum, a) => sum + (a.estimated_value || 0), 0)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: '16px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Digital Assets</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8' }}>Crypto, accounts & digital footprint</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '7px 16px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>+ Add Account</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '12px', color: '#6b7ab8', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Total Digital Value</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '36px', fontWeight: 800, background: 'linear-gradient(135deg,#fff,#f7931a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </div>
          </div>
          <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '12px', color: '#6b7ab8', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Accounts Tracked</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '36px', fontWeight: 800, color: '#fff' }}>{assets.length}</div>
          </div>
        </div>

        {/* Add form */}
        {showForm && (
          <div style={{ background: 'rgba(8,14,40,0.9)', border: '1px solid rgba(0,100,255,0.25)', borderRadius: '16px', padding: '28px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>Add Digital Account</h3>
            <form onSubmit={addAsset} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Platform Name</label>
                <input required value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))} placeholder="e.g. Coinbase, Gmail"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }}>
                  {TYPES.map(t => <option key={t} style={{ background: '#060818' }}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Username / Email</label>
                <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="your@email.com"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Estimated Value ($)</label>
                <input type="number" value={form.estimated_value} onChange={e => setForm(p => ({ ...p, estimated_value: e.target.value }))} placeholder="0"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>After-Death Instructions</label>
                <select value={form.instructions} onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }}>
                  {INSTRUCTIONS.map(i => <option key={i} style={{ background: '#060818' }}>{i}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Notes (optional)</label>
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any additional info"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#6b7ab8', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Saving...' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Asset list */}
        {assets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7ab8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>₿</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>No digital assets yet</div>
            <div style={{ fontSize: '13px' }}>Add your crypto wallets, email accounts, and online profiles.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {assets.map(a => {
              const color = TYPE_COLORS[a.type] || '#6b7ab8'
              const icon = TYPE_ICONS[a.type] || '💻'
              return (
                <div key={a.id} style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}18`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{a.platform}</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: `${color}18`, border: `1px solid ${color}44`, color }}>{a.type}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7ab8' }}>
                        {a.username && <span>{a.username}</span>}
                        <span style={{ color: '#ffaa00' }}>{a.instructions}</span>
                      </div>
                      {a.notes && <div style={{ fontSize: '12px', color: '#4a5578', marginTop: '4px' }}>{a.notes}</div>}
                    </div>
                    <div style={{ textAlign: 'right', marginRight: '12px' }}>
                      {a.estimated_value > 0 && (
                        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>${(a.estimated_value || 0).toLocaleString()}</div>
                      )}
                    </div>
                    <button onClick={() => deleteAsset(a.id)} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid rgba(255,60,60,0.2)', borderRadius: '6px', color: '#ff6666', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
