'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AIPageInsight from '@/components/AIPageInsight'

const NETWORK_ATTORNEYS = [
  { initials: 'MW', name: 'Marcus Webb, Esq.', title: 'Estate Planning Attorney', firm: 'Webb & Associates, Austin TX', rating: 4.9, reviews: 52, tags: ['Wills & Trusts', 'Tax Planning', 'Probate', 'Texas'], color: '#0055ff' },
  { initials: 'PS', name: 'Priya Sharma, Esq.', title: 'Estate & Trust Law', firm: 'Sharma Law, Dallas TX', rating: 5.0, reviews: 38, tags: ['ILITs', 'CRTs', 'Medicaid', 'Texas'], color: '#6644ff' },
  { initials: 'JC', name: 'James Chen, Esq.', title: 'Estate Planning Attorney', firm: 'Chen Law Group, Houston TX', rating: 4.8, reviews: 61, tags: ['Business Succession', 'Tax Planning', 'Texas'], color: '#00cc66' },
  { initials: 'AR', name: 'Amanda Rodriguez, Esq.', title: 'Elder Law & Estate Planning', firm: 'Rodriguez & Partners, Austin TX', rating: 4.9, reviews: 44, tags: ['Elder Law', 'Medicaid', 'Special Needs'], color: '#ffaa00' },
]

export default function AttorneyPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ attorney_name: '', message: '', preferred_time: '', topic: 'Will & Trust Review' })
  const [transferContact, setTransferContact] = useState({ attorney_name: '', attorney_firm: '', attorney_email: '', attorney_phone: '', attorney_notes: '' })
  const [transferSaving, setTransferSaving] = useState(false)
  const [transferSaved, setTransferSaved] = useState(false)
  const router = useRouter()

  const TOPICS = ['Will & Trust Review', 'Estate Tax Planning', 'Power of Attorney', 'Healthcare Directive', 'Business Succession', 'Elder Law / Medicaid', 'General Estate Planning']
  const inp = { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' as const }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [{ data: reqs }, { data: prof }] = await Promise.all([
        supabase.from('attorney_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('attorney_name,attorney_firm,attorney_email,attorney_phone,attorney_notes').eq('id', user.id).single(),
      ])
      setRequests(reqs ?? [])
      if (prof) setTransferContact({ attorney_name: prof.attorney_name || '', attorney_firm: prof.attorney_firm || '', attorney_email: prof.attorney_email || '', attorney_phone: prof.attorney_phone || '', attorney_notes: prof.attorney_notes || '' })
      setLoading(false)
    }
    load()
  }, [router])

  async function saveTransferContact(e: React.FormEvent) {
    e.preventDefault()
    setTransferSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').update({
      attorney_name: transferContact.attorney_name || null,
      attorney_firm: transferContact.attorney_firm || null,
      attorney_email: transferContact.attorney_email || null,
      attorney_phone: transferContact.attorney_phone || null,
      attorney_notes: transferContact.attorney_notes || null,
    }).eq('id', user.id)
    setTransferSaving(false)
    setTransferSaved(true)
    setTimeout(() => setTransferSaved(false), 3000)
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('attorney_requests').insert({ user_id: user.id, ...form })
    const { data } = await supabase.from('attorney_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setRequests(data ?? [])
    setForm({ attorney_name: '', message: '', preferred_time: '', topic: 'Will & Trust Review' })
    setShowForm(false)
    setSaving(false)
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 4000)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: '12px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Attorney Connect</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8' }}>Licensed estate attorneys</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowForm(true)} style={{ padding: '7px 16px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>+ Request Consultation</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <AIPageInsight page="attorney" />

          {submitted && (
            <div style={{ background: 'rgba(0,204,102,0.08)', border: '1px solid rgba(0,204,102,0.25)', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '20px' }}>✅</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Consultation request submitted</div>
                <div style={{ fontSize: '12px', color: '#6b7ab8', marginTop: '2px' }}>An attorney from our network will reach out to {user?.email} within 1–2 business days.</div>
              </div>
            </div>
          )}

          {/* Request form */}
          {showForm && (
            <div style={{ background: 'rgba(8,14,40,0.9)', border: '1px solid rgba(0,100,255,0.25)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '18px' }}>Request a Consultation</h3>
              <form onSubmit={submitRequest} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Topic</label>
                  <select value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }}>
                    {TOPICS.map(t => <option key={t} style={{ background: '#060818' }}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Preferred Attorney (optional)</label>
                  <input value={form.attorney_name} onChange={e => setForm(p => ({ ...p, attorney_name: e.target.value }))} placeholder="Leave blank to match automatically"
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Preferred Date/Time</label>
                  <input type="datetime-local" value={form.preferred_time} onChange={e => setForm(p => ({ ...p, preferred_time: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none', colorScheme: 'dark' }} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Tell us about your situation</label>
                  <textarea required value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={3} placeholder="Briefly describe what you need help with..."
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
                </div>
                <div style={{ gridColumn: '1/-1', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#6b7ab8', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                  <button type="submit" disabled={saving} style={{ padding: '9px 22px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    {saving ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* My requests */}
          {requests.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: '12px' }}>Your Requests</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {requests.map((r: any) => (
                  <div key={r.id} style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.16)', borderRadius: '12px', padding: '16px 18px', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '3px' }}>{r.topic}</div>
                      <div style={{ fontSize: '12px', color: '#6b7ab8' }}>{r.message?.slice(0, 80)}{r.message?.length > 80 ? '...' : ''}</div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '8px', background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.25)', color: '#ffaa00', flexShrink: 0 }}>Pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Estate Transfer Contact ──────────────────────────────── */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.12em' }}>Estate Transfer Contact</div>
              <div style={{ flex: 1, height: '1px', background: 'rgba(0,100,255,0.1)' }} />
              {transferContact.attorney_name && (
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '6px', background: 'rgba(0,204,102,0.1)', border: '1px solid rgba(0,204,102,0.25)', color: '#00cc66' }}>✓ Configured</span>
              )}
            </div>

            <div style={{ background: 'rgba(102,68,255,0.06)', border: '1px solid rgba(102,68,255,0.2)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '18px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(102,68,255,0.15)', border: '1px solid rgba(102,68,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>⚖️</div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Designate Your Estate Attorney</div>
                  <div style={{ fontSize: '13px', color: '#6b7ab8', lineHeight: 1.6 }}>
                    This attorney will be the contact point for your beneficiaries after your passing. They will receive access requests and facilitate the transfer of your Axion account and estate documents.
                  </div>
                </div>
              </div>

              {transferSaved && (
                <div style={{ padding: '10px 14px', background: 'rgba(0,204,102,0.08)', border: '1px solid rgba(0,204,102,0.25)', borderRadius: '8px', color: '#00cc66', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>✓ Estate transfer contact saved</div>
              )}

              <form onSubmit={saveTransferContact} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Attorney Full Name</label>
                  <input value={transferContact.attorney_name} onChange={e => setTransferContact(p => ({ ...p, attorney_name: e.target.value }))} placeholder="e.g. James Smith, Esq." style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Law Firm</label>
                  <input value={transferContact.attorney_firm} onChange={e => setTransferContact(p => ({ ...p, attorney_firm: e.target.value }))} placeholder="e.g. Smith & Associates" style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Attorney Email</label>
                  <input type="email" value={transferContact.attorney_email} onChange={e => setTransferContact(p => ({ ...p, attorney_email: e.target.value }))} placeholder="attorney@lawfirm.com" style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Attorney Phone</label>
                  <input type="tel" value={transferContact.attorney_phone} onChange={e => setTransferContact(p => ({ ...p, attorney_phone: e.target.value }))} placeholder="+1 (512) 555-0100" style={inp} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Access Instructions (optional)</label>
                  <textarea value={transferContact.attorney_notes} onChange={e => setTransferContact(p => ({ ...p, attorney_notes: e.target.value }))} rows={2}
                    placeholder="e.g. Only release access after receiving a certified death certificate. Contact my children first."
                    style={{ ...inp, resize: 'vertical' as const }} />
                </div>
                <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={transferSaving} style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#6644ff,#aa88ff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    {transferSaving ? 'Saving...' : '💾 Save Transfer Contact'}
                  </button>
                </div>
              </form>
            </div>

            {/* How it works */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
              {[
                { icon: '✉️', title: 'Beneficiary Invited', desc: 'You send a portal invite to your beneficiaries from the Beneficiaries page' },
                { icon: '🔐', title: 'Portal Created', desc: 'They create a secure account showing only that they are a named beneficiary' },
                { icon: '⚖️', title: 'Attorney Releases Access', desc: 'Upon death, they click "Connect with Attorney" and your lawyer facilitates the transfer' },
              ].map(s => (
                <div key={s.title} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,100,255,0.1)', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{s.icon}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{s.title}</div>
                  <div style={{ fontSize: '11px', color: '#6b7ab8', lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Network attorneys */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: '14px' }}>Network Attorneys</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(420px,1fr))', gap: '12px' }}>
              {NETWORK_ATTORNEYS.map(a => (
                <div key={a.initials} style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.14)', borderRadius: '14px', padding: '18px 20px', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{a.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{a.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7ab8', marginBottom: '8px' }}>{a.title} · {a.firm}</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {a.tags.map(t => <span key={t} style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: 'rgba(0,100,255,0.1)', border: '1px solid rgba(0,100,255,0.18)', color: '#00aaff' }}>{t}</span>)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '12px', color: '#ffaa00', marginBottom: '8px' }}>{'★'.repeat(Math.floor(a.rating))} {a.rating}</div>
                    <button onClick={() => { setForm(p => ({ ...p, attorney_name: a.name })); setShowForm(true) }} style={{ padding: '6px 16px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Connect</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
