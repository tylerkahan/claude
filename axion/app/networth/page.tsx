'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const CATEGORIES = ['Real Estate', 'Investment Account', 'Bank Account', 'Crypto', 'Business', 'Life Insurance', 'Other']
const ICONS: Record<string, string> = {
  'Real Estate': '🏠', 'Investment Account': '📈', 'Bank Account': '🏦',
  'Crypto': '₿', 'Business': '🏢', 'Life Insurance': '🛡', 'Other': '💼'
}

export default function NetWorthPage() {
  const [user, setUser] = useState<any>(null)
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'Real Estate', value: '', institution: '' })
  const [saving, setSaving] = useState(false)
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
    const { data } = await supabase.from('assets').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    setAssets(data ?? [])
  }

  async function addAsset(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('assets').insert({
      user_id: user.id,
      name: form.name,
      category: form.category,
      value: parseFloat(form.value) || 0,
      institution: form.institution
    })
    setForm({ name: '', category: 'Real Estate', value: '', institution: '' })
    setShowForm(false)
    await fetchAssets(user.id)
    setSaving(false)
  }

  async function deleteAsset(id: string) {
    const supabase = createClient()
    await supabase.from('assets').delete().eq('id', id)
    await fetchAssets(user.id)
  }

  const total = assets.reduce((sum, a) => sum + (a.value || 0), 0)

  const byCategory = CATEGORIES.map(cat => ({
    cat, icon: ICONS[cat],
    items: assets.filter(a => a.category === cat),
    total: assets.filter(a => a.category === cat).reduce((s, a) => s + a.value, 0)
  })).filter(g => g.items.length > 0)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: '16px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Net Worth</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8' }}>Track your total estate value</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '7px 16px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>+ Add Asset</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

        {/* Total */}
        <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '20px', padding: '32px', marginBottom: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7ab8', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '8px' }}>Total Estate Value</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '56px', fontWeight: 800, background: 'linear-gradient(135deg,#fff,#00aaff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7ab8', marginTop: '8px' }}>{assets.length} asset{assets.length !== 1 ? 's' : ''} tracked</div>
        </div>

        {/* Add form */}
        {showForm && (
          <div style={{ background: 'rgba(8,14,40,0.9)', border: '1px solid rgba(0,100,255,0.25)', borderRadius: '16px', padding: '28px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>Add New Asset</h3>
            <form onSubmit={addAsset} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { label: 'Asset Name', key: 'name', placeholder: 'e.g. Primary Home', type: 'text' },
                { label: 'Current Value ($)', key: 'value', placeholder: '500000', type: 'number' },
                { label: 'Institution (optional)', key: 'institution', placeholder: 'e.g. Chase, Fidelity', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }}>
                  {CATEGORIES.map(c => <option key={c} style={{ background: '#060818' }}>{c}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#6b7ab8', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Saving...' : 'Add Asset'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Assets by category */}
        {assets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7ab8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📈</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>No assets yet</div>
            <div style={{ fontSize: '13px' }}>Add your first asset to start tracking your estate value.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {byCategory.map(g => (
              <div key={g.cat} style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(0,100,255,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{g.icon}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{g.cat}</span>
                  </div>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#00aaff' }}>
                    ${g.total.toLocaleString()}
                  </span>
                </div>
                {g.items.map(asset => (
                  <div key={asset.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', borderBottom: '1px solid rgba(0,100,255,0.06)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>{asset.name}</div>
                      {asset.institution && <div style={{ fontSize: '12px', color: '#6b7ab8', marginTop: '2px' }}>{asset.institution}</div>}
                    </div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '15px', fontWeight: 700, color: '#e8eaf6' }}>
                      ${(asset.value || 0).toLocaleString()}
                    </div>
                    <button onClick={() => deleteAsset(asset.id)} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid rgba(255,60,60,0.2)', borderRadius: '6px', color: '#ff6666', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
