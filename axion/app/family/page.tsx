'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AIPageInsight from '@/components/AIPageInsight'

const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none', fontFamily: 'Inter,sans-serif', boxSizing: 'border-box' }
const lbl = (text: string) => <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>{text}</label>

const ACCESS_LEVELS = ['Full Access', 'View Only', 'Emergency Only']
const ACCESS_COLORS: Record<string, string> = {
  'Full Access': '#00cc66', 'View Only': '#00aaff', 'Emergency Only': '#ffaa00'
}
const RELATIONSHIPS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Sibling', 'Attorney', 'Accountant', 'Financial Advisor', 'Trusted Friend', 'Other']

type FormState = {
  name: string; email: string; phone: string; relationship: string;
  access_level: string; date_of_birth: string; is_dependent: boolean; notes: string;
}
const EMPTY: FormState = { name: '', email: '', phone: '', relationship: 'Spouse', access_level: 'View Only', date_of_birth: '', is_dependent: false, notes: '' }

export default function FamilyPage() {
  const [user, setUser] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const router = useRouter()
  const sf = (p: Partial<FormState>) => setForm(f => ({ ...f, ...p }))

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
    setForm(EMPTY)
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: '16px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Family & Contacts</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8' }}>Trusted contacts &amp; access control</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '7px 16px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>+ Add Member</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <AIPageInsight page="family" />

          <div style={{ background: 'rgba(0,100,255,0.06)', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '14px', padding: '18px 22px', marginBottom: '24px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '20px' }}>🔒</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Access Control</div>
              <div style={{ fontSize: '12px', color: '#6b7ab8', lineHeight: '1.6' }}>
                Family members listed here are trusted contacts who should have access to your estate information. Keep this list current — your executor and attorney should always be included.
              </div>
            </div>
          </div>

          {/* Add form */}
          {showForm && (
            <div style={{ background: 'rgba(8,14,40,0.9)', border: '1px solid rgba(0,100,255,0.25)', borderRadius: '16px', padding: '28px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>Add Family Member / Contact</h3>
              <form onSubmit={addMember} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  {lbl('Full Name')}
                  <input required value={form.name} onChange={e => sf({ name: e.target.value })} placeholder="Sarah Kahan" style={inp} />
                </div>
                <div>
                  {lbl('Relationship')}
                  <select value={form.relationship} onChange={e => sf({ relationship: e.target.value })} style={inp}>
                    {RELATIONSHIPS.map(r => <option key={r} style={{ background: '#060818' }}>{r}</option>)}
                  </select>
                </div>
                <div>
                  {lbl('Email (optional)')}
                  <input type="email" value={form.email} onChange={e => sf({ email: e.target.value })} placeholder="sarah@example.com" style={inp} />
                </div>
                <div>
                  {lbl('Phone (optional)')}
                  <input type="tel" value={form.phone} onChange={e => sf({ phone: e.target.value })} placeholder="+1 (555) 000-0000" style={inp} />
                </div>
                <div>
                  {lbl('Date of Birth (optional)')}
                  <input type="date" value={form.date_of_birth} onChange={e => sf({ date_of_birth: e.target.value })} style={{ ...inp, colorScheme: 'dark' }} />
                </div>
                <div>
                  {lbl('Access Level')}
                  <select value={form.access_level} onChange={e => sf({ access_level: e.target.value })} style={inp}>
                    {ACCESS_LEVELS.map(l => <option key={l} style={{ background: '#060818' }}>{l}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '20px' }}>
                  <input type="checkbox" id="dep" checked={form.is_dependent} onChange={e => sf({ is_dependent: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#0055ff' }} />
                  <label htmlFor="dep" style={{ fontSize: '13px', color: '#6b7ab8', cursor: 'pointer' }}>Financial dependent (minor / dependent adult)</label>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  {lbl('Notes (optional)')}
                  <input value={form.notes} onChange={e => sf({ notes: e.target.value })} placeholder="e.g. Has copy of will, primary emergency contact" style={inp} />
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
                const displayName = m.name || m.full_name || '?'
                const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                const age = m.date_of_birth ? Math.floor((Date.now() - new Date(m.date_of_birth).getTime()) / 3.156e10) : null
                return (
                  <div key={m.id} style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '14px', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,#0044cc,#0099ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', color: '#fff', flexShrink: 0 }}>{initials}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{displayName}</span>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: `${color}18`, border: `1px solid ${color}44`, color }}>{m.access_level}</span>
                          {m.is_dependent && <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.25)', color: '#ffaa00' }}>Dependent</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7ab8' }}>
                          {m.relationship}
                          {age !== null ? ` · Age ${age}` : ''}
                          {m.email ? ` · ${m.email}` : ''}
                          {m.phone ? ` · ${m.phone}` : ''}
                        </div>
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
    </div>
  )
}
