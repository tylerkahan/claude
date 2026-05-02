'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const ACCESS_LEVELS = ['Full Access', 'View Only', 'Emergency Only']
const ACCESS_COLORS: Record<string, string> = {
  'Full Access': '#00cc66', 'View Only': '#00aaff', 'Emergency Only': '#ffaa00'
}
const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Attorney', 'Accountant', 'Trusted Friend', 'Other']

export default function FamilyPage() {
  const [user, setUser] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', relationship: 'Spouse', access_level: 'View Only', notes: '' })
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchMembers(user.id)
      setLoading(false)
    }
    load()
  }, [router])

  async function fetchMembers(userId: string) {
    const supabase = createClient()
    const { data } = await supabase.from('family_members').select('*').eq('user_id', userId).order('created_at')
    setMembers(data ?? [])
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('family_members').insert({ user_id: user.id, ...form })
    setForm({ name: '', email: '', relationship: 'Spouse', access_level: 'View Only', notes: '' })
    setShowForm(false)
    await fetchMembers(user.id)
    setSaving(false)
  }

  async function deleteMember(id: string) {
    const supabase = createClient()
    await supabase.from('family_members').delete().eq('id', id)
    await fetchMembers(user.id)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '28px', fontWeight: 800, color: '#fff' }}>Family Access</h1>
            <p style={{ color: '#6b7ab8', fontSize: '14px', marginTop: '4px' }}>Control who can access your estate information and when</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{
            padding: '11px 22px', background: 'linear-gradient(135deg,#0055ff,#00aaff)',
            border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px',
            fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 20px rgba(0,120,255,0.3)'
          }}>+ Add Member</button>
        </div>

        {/* Info banner */}
        <div style={{ background: 'rgba(0,100,255,0.06)', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '14px', padding: '18px 22px', marginBottom: '24px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '20px' }}>🔒</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Access Control</div>
            <div style={{ fontSize: '12px', color: '#6b7ab8', lineHeight: '1.6' }}>
              Family members listed here are trusted contacts who should have access to your estate information in the event of your passing or incapacitation. Keep this list current — your executor and attorney should always be included.
            </div>
          </div>
        </div>

        {/* Add form */}
        {showForm && (
          <div style={{ background: 'rgba(8,14,40,0.9)', border: '1px solid rgba(0,100,255,0.25)', borderRadius: '16px', padding: '28px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>Add Trusted Contact</h3>
            <form onSubmit={addMember} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Full Name</label>
                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Jane Doe"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Email</label>
                <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="jane@example.com"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Relationship</label>
                <select value={form.relationship} onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }}>
                  {RELATIONSHIPS.map(r => <option key={r} style={{ background: '#060818' }}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Access Level</label>
                <select value={form.access_level} onChange={e => setForm(p => ({ ...p, access_level: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }}>
                  {ACCESS_LEVELS.map(l => <option key={l} style={{ background: '#060818' }}>{l}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Notes (optional)</label>
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. Primary contact, has copy of will"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#6b7ab8', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Saving...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Member list */}
        {members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7ab8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏠</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>No family members added</div>
            <div style={{ fontSize: '13px' }}>Add trusted contacts who should have access to your estate.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {members.map(m => {
              const color = ACCESS_COLORS[m.access_level] || '#6b7ab8'
              const initials = m.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <div key={m.id} style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,#0044cc,#0099ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', color: '#fff', flexShrink: 0 }}>{initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{m.name}</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: `${color}18`, border: `1px solid ${color}44`, color }}>{m.access_level}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7ab8' }}>{m.relationship}{m.email ? ` · ${m.email}` : ''}</div>
                      {m.notes && <div style={{ fontSize: '12px', color: '#4a5578', marginTop: '3px' }}>{m.notes}</div>}
                    </div>
                    <button onClick={() => deleteMember(m.id)} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid rgba(255,60,60,0.2)', borderRadius: '6px', color: '#ff6666', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
