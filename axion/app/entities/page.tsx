'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AIPageInsight from '@/components/AIPageInsight'

const ENTITY_TYPES = ['Grantor (You)', 'Revocable Trust', 'Irrevocable Trust', 'LLC', 'LP', 'Corporation', 'Asset']
const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Grantor (You)': { bg: 'rgba(0,170,255,0.08)', border: 'rgba(0,170,255,0.4)', text: '#00aaff' },
  'Revocable Trust': { bg: 'rgba(102,68,255,0.08)', border: 'rgba(102,68,255,0.4)', text: '#aa88ff' },
  'Irrevocable Trust': { bg: 'rgba(102,68,255,0.08)', border: 'rgba(102,68,255,0.4)', text: '#aa88ff' },
  'LLC': { bg: 'rgba(0,204,102,0.08)', border: 'rgba(0,204,102,0.35)', text: '#00cc66' },
  'LP': { bg: 'rgba(255,160,0,0.08)', border: 'rgba(255,160,0,0.35)', text: '#ffaa00' },
  'Corporation': { bg: 'rgba(255,102,136,0.08)', border: 'rgba(255,102,136,0.3)', text: '#ff6688' },
  'Asset': { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.1)', text: '#6b7ab8' },
}

export default function EntitiesPage() {
  const [user, setUser] = useState<any>(null)
  const [entities, setEntities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'LLC', description: '', parent_name: '' })
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchEntities(user.id)
      setLoading(false)
    }
    load()
  }, [router])

  async function fetchEntities(userId: string) {
    const supabase = createClient()
    const { data } = await supabase.from('entities').select('*').eq('user_id', userId).order('created_at')
    setEntities(data ?? [])
  }

  async function addEntity(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('entities').insert({ user_id: user.id, ...form })
    setForm({ name: '', type: 'LLC', description: '', parent_name: '' })
    setShowForm(false)
    await fetchEntities(user.id)
    setSaving(false)
  }

  async function deleteEntity(id: string) {
    const supabase = createClient()
    await supabase.from('entities').delete().eq('id', id)
    await fetchEntities(user.id)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Entity Tree</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8', marginLeft: '10px' }}>Your estate structure</span>
          <span style={{ marginLeft: '10px', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', background: 'rgba(0,170,255,0.15)', border: '1px solid rgba(0,170,255,0.3)', color: '#00aaff' }}>New</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '7px 16px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>+ Add Entity</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <AIPageInsight page="entities" />

          {showForm && (
            <div style={{ background: 'rgba(8,14,40,0.9)', border: '1px solid rgba(0,100,255,0.25)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '18px' }}>Add Entity</h3>
              <form onSubmit={addEntity} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Entity Name</label>
                  <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Smith Family Trust"
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }}>
                    {ENTITY_TYPES.map(t => <option key={t} style={{ background: '#060818' }}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Owned By (parent entity)</label>
                  <input value={form.parent_name} onChange={e => setForm(p => ({ ...p, parent_name: e.target.value }))} placeholder="e.g. Smith Family Trust or leave blank"
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Description (optional)</label>
                  <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Holds primary residence"
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
                </div>
                <div style={{ gridColumn: '1/-1', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#6b7ab8', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                  <button type="submit" disabled={saving} style={{ padding: '9px 22px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    {saving ? 'Saving...' : 'Add Entity'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {entities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 40px', color: '#6b7ab8' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🌳</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>No entities yet</div>
              <div style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto', lineHeight: '1.7' }}>
                Add your legal entities — trusts, LLCs, and assets — to visualize how your estate is structured and how assets flow to your beneficiaries.
              </div>
              <button onClick={() => setShowForm(true)} style={{ marginTop: '20px', padding: '10px 24px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>+ Add Your First Entity</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Group by parent */}
              {entities.filter(e => !e.parent_name).map(root => {
                const children = entities.filter(e => e.parent_name === root.name)
                const c = TYPE_COLORS[root.type] || TYPE_COLORS['Asset']
                return (
                  <div key={root.id}>
                    {/* Root entity */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '14px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{root.name}</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: `${c.border}33`, color: c.text }}>{root.type}</span>
                        </div>
                        {root.description && <div style={{ fontSize: '12px', color: '#6b7ab8' }}>{root.description}</div>}
                      </div>
                      <button onClick={() => deleteEntity(root.id)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid rgba(255,60,60,0.2)', borderRadius: '6px', color: '#ff6666', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                    </div>

                    {/* Children */}
                    {children.length > 0 && (
                      <div style={{ marginLeft: '32px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '2px solid rgba(0,100,255,0.15)', paddingLeft: '20px' }}>
                        {children.map(child => {
                          const cc = TYPE_COLORS[child.type] || TYPE_COLORS['Asset']
                          return (
                            <div key={child.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', background: cc.bg, border: `1px solid ${cc.border}`, borderRadius: '12px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
                                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{child.name}</span>
                                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: `${cc.border}33`, color: cc.text }}>{child.type}</span>
                                </div>
                                {child.description && <div style={{ fontSize: '12px', color: '#6b7ab8' }}>{child.description}</div>}
                              </div>
                              <button onClick={() => deleteEntity(child.id)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid rgba(255,60,60,0.2)', borderRadius: '6px', color: '#ff6666', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Orphaned children (parent not found) */}
              {entities.filter(e => e.parent_name && !entities.find(p => p.name === e.parent_name)).map(e => {
                const c = TYPE_COLORS[e.type] || TYPE_COLORS['Asset']
                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{e.name}</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: `${c.border}33`, color: c.text }}>{e.type}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#4a5578' }}>Under: {e.parent_name}</div>
                    </div>
                    <button onClick={() => deleteEntity(e.id)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid rgba(255,60,60,0.2)', borderRadius: '6px', color: '#ff6666', cursor: 'pointer', fontSize: '11px' }}>✕</button>
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
