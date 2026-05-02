'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState({ full_name: '', phone: '', date_of_birth: '', state: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) setProfile({ full_name: data.full_name || '', phone: data.phone || '', date_of_birth: data.date_of_birth || '', state: data.state || '' })
      setLoading(false)
    }
    load()
  }, [router])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').upsert({ id: user.id, ...profile, updated_at: new Date().toISOString() })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const initials = profile.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : user?.email?.slice(0, 2).toUpperCase() || 'AX'

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Profile</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8', marginLeft: '10px' }}>Your personal information</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px' }}>
          <div style={{ maxWidth: '640px' }}>

            {/* Avatar section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg,#0055ff,#00aaff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, color: '#fff', flexShrink: 0, boxShadow: '0 0 20px rgba(0,100,255,0.3)' }}>{initials}</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>{profile.full_name || user?.email?.split('@')[0] || 'Your Name'}</div>
                <div style={{ fontSize: '13px', color: '#6b7ab8', marginTop: '2px' }}>{user?.email}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '6px', background: 'rgba(0,200,80,0.1)', border: '1px solid rgba(0,200,80,0.22)', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, color: '#00cc66' }}>
                  <span style={{ width: '5px', height: '5px', background: '#00cc66', borderRadius: '50%', display: 'inline-block' }} />Free Plan
                </div>
              </div>
            </div>

            {/* Profile form */}
            <div style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '16px', padding: '24px', backdropFilter: 'blur(20px)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>Personal Information</div>
              <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Full Name</label>
                    <input value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} placeholder="Your full legal name"
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Email</label>
                    <input value={user?.email || ''} disabled style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,100,255,0.08)', borderRadius: '8px', color: '#4a5578', fontSize: '14px', outline: 'none', cursor: 'not-allowed' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Phone</label>
                    <input type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000"
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Date of Birth</label>
                    <input type="date" value={profile.date_of_birth} onChange={e => setProfile(p => ({ ...p, date_of_birth: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none', colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>State</label>
                    <select value={profile.state} onChange={e => setProfile(p => ({ ...p, state: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }}>
                      <option value="" style={{ background: '#060818' }}>Select state...</option>
                      {US_STATES.map(s => <option key={s} value={s} style={{ background: '#060818' }}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '4px' }}>
                  <button type="submit" disabled={saving} style={{ padding: '10px 28px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  {saved && <span style={{ fontSize: '13px', color: '#00cc66', fontWeight: 600 }}>✓ Saved!</span>}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
