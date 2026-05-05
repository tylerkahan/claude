'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AIPageInsight from '@/components/AIPageInsight'

const ROLES = ['Beneficiary', 'Executor', 'Trustee', 'Guardian', 'Healthcare Proxy', 'Power of Attorney']
const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Friend', 'Business Partner', 'Other']
const ROLE_COLORS: Record<string, string> = {
  'Beneficiary': '#00aaff', 'Executor': '#6644ff', 'Trustee': '#00cc66',
  'Guardian': '#ffaa00', 'Healthcare Proxy': '#ff6688', 'Power of Attorney': '#00d4ff'
}

export default function BeneficiariesPage() {
  const [user, setUser] = useState<any>(null)
  const [people, setPeople] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ full_name: '', relationship: 'Spouse', email: '', role: 'Beneficiary' })
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchPeople(user.id)
      setLoading(false)
    }
    load()
  }, [router])

  async function fetchPeople(userId: string) {
    const supabase = createClient()
    const { data } = await supabase.from('beneficiaries').select('*').eq('user_id', userId).order('created_at')
    setPeople(data ?? [])
  }

  async function addPerson(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('beneficiaries').insert({ user_id: user.id, ...form })
    setForm({ full_name: '', relationship: 'Spouse', email: '', role: 'Beneficiary' })
    setShowForm(false)
    await fetchPeople(user.id)
    setSaving(false)
  }

  async function deletePerson(id: string) {
    const supabase = createClient()
    await supabase.from('beneficiaries').delete().eq('id', id)
    await fetchPeople(user.id)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: '16px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Beneficiaries</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8' }}>Manage your heirs and key roles</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '7px 16px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>+ Add Person</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <AIPageInsight page="beneficiaries" />

        {/* Add form */}
        {showForm && (
          <div style={{ background: 'rgba(8,14,40,0.9)', border: '1px solid rgba(0,100,255,0.25)', borderRadius: '16px', padding: '28px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>Add Person</h3>
            <form onSubmit={addPerson} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Full Name</label>
                <input required value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Jane Doe"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Email (optional)</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="jane@example.com"
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
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Role</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }}>
                  {ROLES.map(r => <option key={r} style={{ background: '#060818' }}>{r}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#6b7ab8', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Saving...' : 'Add Person'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* People list */}
        {people.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7ab8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>No beneficiaries yet</div>
            <div style={{ fontSize: '13px' }}>Add your family members, executor, and other key people.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {people.map(p => {
              const initials = p.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <div key={p.id} style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,#0044cc,#0099ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', color: '#fff', flexShrink: 0 }}>{initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{p.full_name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7ab8', marginTop: '2px' }}>{p.relationship}</div>
                    </div>
                    <button onClick={() => deletePerson(p.id)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid rgba(255,60,60,0.2)', borderRadius: '6px', color: '#ff6666', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: `${ROLE_COLORS[p.role] || '#6b7ab8'}18`, border: `1px solid ${ROLE_COLORS[p.role] || '#6b7ab8'}44`, color: ROLE_COLORS[p.role] || '#6b7ab8' }}>
                      {p.role}
                    </span>
                    {p.email && <span style={{ fontSize: '11px', color: '#6b7ab8' }}>{p.email}</span>}
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
