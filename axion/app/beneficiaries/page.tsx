'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AIPageInsight from '@/components/AIPageInsight'

const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none', fontFamily: 'Inter,sans-serif', boxSizing: 'border-box' }
const lbl = (text: string) => <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>{text}</label>

const ROLES = ['Primary Beneficiary', 'Secondary Beneficiary', 'Contingent Beneficiary', 'Executor', 'Trustee', 'Guardian', 'Healthcare Proxy', 'Power of Attorney']
const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Friend', 'Business Partner', 'Charity / Organization', 'Other']
const ROLE_COLORS: Record<string, string> = {
  'Primary Beneficiary': '#00aaff', 'Secondary Beneficiary': '#0077cc',
  'Contingent Beneficiary': '#6644ff', 'Executor': '#6644ff',
  'Trustee': '#00cc66', 'Guardian': '#ffaa00',
  'Healthcare Proxy': '#ff6688', 'Power of Attorney': '#00d4ff'
}

type FormState = {
  full_name: string; relationship: string; email: string; phone: string;
  role: string; percentage: string; date_of_birth: string; notes: string;
}
const EMPTY: FormState = { full_name: '', relationship: 'Spouse', email: '', phone: '', role: 'Primary Beneficiary', percentage: '', date_of_birth: '', notes: '' }

export default function BeneficiariesPage() {
  const [user, setUser] = useState<any>(null)
  const [people, setPeople] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [inviting, setInviting] = useState<string | null>(null)
  const [inviteMsg, setInviteMsg] = useState<{id: string; msg: string; ok: boolean} | null>(null)
  const router = useRouter()
  const sf = (p: Partial<FormState>) => setForm(f => ({ ...f, ...p }))

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setProfile(prof)
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
    await supabase.from('beneficiaries').insert({
      user_id: user.id,
      full_name: form.full_name,
      relationship: form.relationship,
      email: form.email || null,
      phone: form.phone || null,
      role: form.role,
      percentage: form.percentage ? parseFloat(form.percentage) : null,
      date_of_birth: form.date_of_birth || null,
      notes: form.notes || null,
    })
    setForm(EMPTY)
    setShowForm(false)
    await fetchPeople(user.id)
    setSaving(false)
  }

  async function deletePerson(id: string) {
    const supabase = createClient()
    await supabase.from('beneficiaries').delete().eq('id', id)
    await fetchPeople(user.id)
  }

  async function sendInvite(person: any) {
    if (!person.email) return
    setInviting(person.id)
    setInviteMsg(null)
    try {
      const res = await fetch('/api/invite-beneficiary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiary_id: person.id,
          email: person.email,
          grantor_name: profile?.full_name || user?.email?.split('@')[0],
        }),
      })
      const data = await res.json()
      if (data.success) {
        setInviteMsg({ id: person.id, msg: data.fallback ? `Invite link: ${data.signupUrl}` : `Invite sent to ${person.email}`, ok: true })
        await fetchPeople(user.id)
      } else {
        setInviteMsg({ id: person.id, msg: data.error || 'Failed to send invite', ok: false })
      }
    } catch {
      setInviteMsg({ id: person.id, msg: 'Network error — try again', ok: false })
    }
    setInviting(null)
  }

  // Warn if beneficiary percentages don't add to 100
  const primaryPct = people.filter(p => p.role === 'Primary Beneficiary').reduce((s, p) => s + (p.percentage || 0), 0)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: '16px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Beneficiaries</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8' }}>Heirs, executors &amp; key roles</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '7px 16px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>+ Add Person</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <AIPageInsight page="beneficiaries" />

          {/* Percentage warning */}
          {people.length > 0 && primaryPct > 0 && primaryPct !== 100 && (
            <div style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', fontSize: '13px', color: '#ffaa00', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>⚠</span>
              <span>Primary beneficiary allocations total <strong>{primaryPct}%</strong> — should equal 100%</span>
            </div>
          )}

          {/* Add form */}
          {showForm && (
            <div style={{ background: 'rgba(8,14,40,0.9)', border: '1px solid rgba(0,100,255,0.25)', borderRadius: '16px', padding: '28px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>Add Person</h3>
              <form onSubmit={addPerson} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  {lbl('Full Name')}
                  <input required value={form.full_name} onChange={e => sf({ full_name: e.target.value })} placeholder="Jane Kahan" style={inp} />
                </div>
                <div>
                  {lbl('Relationship')}
                  <select value={form.relationship} onChange={e => sf({ relationship: e.target.value })} style={inp}>
                    {RELATIONSHIPS.map(r => <option key={r} style={{ background: '#060818' }}>{r}</option>)}
                  </select>
                </div>
                <div>
                  {lbl('Email (optional)')}
                  <input type="email" value={form.email} onChange={e => sf({ email: e.target.value })} placeholder="jane@example.com" style={inp} />
                </div>
                <div>
                  {lbl('Phone (optional)')}
                  <input type="tel" value={form.phone} onChange={e => sf({ phone: e.target.value })} placeholder="+1 (555) 000-0000" style={inp} />
                </div>
                <div>
                  {lbl('Role')}
                  <select value={form.role} onChange={e => sf({ role: e.target.value })} style={inp}>
                    {ROLES.map(r => <option key={r} style={{ background: '#060818' }}>{r}</option>)}
                  </select>
                </div>
                <div>
                  {lbl('Inheritance % (optional)')}
                  <input type="number" min="0" max="100" step="0.01" value={form.percentage} onChange={e => sf({ percentage: e.target.value })} placeholder="e.g. 50" style={inp} />
                </div>
                <div>
                  {lbl('Date of Birth (optional)')}
                  <input type="date" value={form.date_of_birth} onChange={e => sf({ date_of_birth: e.target.value })} style={{ ...inp, colorScheme: 'dark' }} />
                </div>
                <div />
                <div style={{ gridColumn: '1/-1' }}>
                  {lbl('Notes (optional)')}
                  <input value={form.notes} onChange={e => sf({ notes: e.target.value })} placeholder="e.g. Minor — per stirpes, holds copy of will" style={inp} />
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
                const initials = (p.full_name || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                const color = ROLE_COLORS[p.role] || '#6b7ab8'
                const age = p.date_of_birth ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / 3.156e10) : null
                return (
                  <div key={p.id} style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '16px', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,#0044cc,#0099ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', color: '#fff', flexShrink: 0 }}>{initials}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{p.full_name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7ab8', marginTop: '2px' }}>
                          {p.relationship}{age !== null ? ` · Age ${age}` : ''}
                        </div>
                      </div>
                      {p.percentage != null && p.percentage > 0 && (
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', fontFamily: "'Space Grotesk',sans-serif" }}>{p.percentage}%</div>
                      )}
                      <button onClick={() => deletePerson(p.id)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid rgba(255,60,60,0.2)', borderRadius: '6px', color: '#ff6666', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: `${color}18`, border: `1px solid ${color}44`, color }}>
                        {p.role}
                      </span>
                      {p.invite_status === 'accepted' && (
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: 'rgba(0,204,102,0.12)', border: '1px solid rgba(0,204,102,0.3)', color: '#00cc66' }}>✓ Portal Active</span>
                      )}
                      {p.invite_status === 'invited' && (
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.25)', color: '#ffaa00' }}>⏳ Invite Sent</span>
                      )}
                    </div>
                    {(p.email || p.phone) && (
                      <div style={{ fontSize: '12px', color: '#6b7ab8', marginBottom: '10px' }}>
                        {p.email}{p.email && p.phone ? ' · ' : ''}{p.phone}
                      </div>
                    )}
                    {p.notes && <div style={{ fontSize: '12px', color: '#4a5578', marginBottom: '10px' }}>{p.notes}</div>}

                    {/* Invite button */}
                    {p.email && p.invite_status !== 'accepted' && (
                      <div>
                        <button
                          onClick={() => sendInvite(p)}
                          disabled={inviting === p.id}
                          style={{ width: '100%', padding: '8px 14px', background: p.invite_status === 'invited' ? 'transparent' : 'rgba(0,85,255,0.08)', border: `1px solid ${p.invite_status === 'invited' ? 'rgba(255,170,0,0.2)' : 'rgba(0,100,255,0.25)'}`, borderRadius: '8px', color: p.invite_status === 'invited' ? '#ffaa00' : '#00aaff', fontSize: '12px', fontWeight: 700, cursor: inviting === p.id ? 'not-allowed' : 'pointer', opacity: inviting === p.id ? 0.6 : 1 }}>
                          {inviting === p.id ? '⏳ Sending...' : p.invite_status === 'invited' ? '↻ Resend Invite' : '✉ Send Beneficiary Portal Invite'}
                        </button>
                        {inviteMsg?.id === p.id && inviteMsg && (
                          <div style={{ marginTop: '6px', fontSize: '11px', color: inviteMsg.ok ? '#00cc66' : '#ff6688', padding: '6px 10px', background: inviteMsg.ok ? 'rgba(0,204,102,0.06)' : 'rgba(255,60,60,0.06)', borderRadius: '6px', wordBreak: 'break-all' }}>
                            {inviteMsg.ok ? '✓ ' : '⚠ '}{inviteMsg.msg}
                          </div>
                        )}
                      </div>
                    )}
                    {!p.email && (
                      <div style={{ fontSize: '11px', color: '#3d4a7a', fontStyle: 'italic' }}>Add an email to send a portal invite</div>
                    )}
                    {p.invite_status === 'accepted' && (
                      <div style={{ fontSize: '11px', color: '#00cc66' }}>✓ Beneficiary has created their portal account</div>
                    )}
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
