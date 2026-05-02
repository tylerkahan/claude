'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState({ full_name: '', phone: '', date_of_birth: '', state: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState('')
  const router = useRouter()

  const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      // Load profile
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

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)
    setPasswordMsg(error ? `Error: ${error.message}` : 'Password updated successfully!')
    setNewPassword('')
    setTimeout(() => setPasswordMsg(''), 3000)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', maxWidth: '720px' }}>

        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '28px', fontWeight: 800, color: '#fff' }}>Settings</h1>
          <p style={{ color: '#6b7ab8', fontSize: '14px', marginTop: '4px' }}>Manage your account and profile information</p>
        </div>

        {/* Profile section */}
        <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>Profile Information</h2>
          <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Full Name</label>
                <input value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} placeholder="Your full legal name"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Email</label>
                <input value={user?.email || ''} disabled
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,100,255,0.1)', borderRadius: '8px', color: '#4a5578', fontSize: '14px', outline: 'none', cursor: 'not-allowed' }} />
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
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>State of Residence</label>
                <select value={profile.state} onChange={e => setProfile(p => ({ ...p, state: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }}>
                  <option value="" style={{ background: '#060818' }}>Select state...</option>
                  {US_STATES.map(s => <option key={s} value={s} style={{ background: '#060818' }}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button type="submit" disabled={saving} style={{ padding: '10px 28px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
              {saved && <span style={{ fontSize: '13px', color: '#00cc66', fontWeight: 600 }}>✓ Saved!</span>}
            </div>
          </form>
        </div>

        {/* Password section */}
        <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>Change Password</h2>
          <form onSubmit={changePassword} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>New Password</label>
              <input type="password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters"
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none' }} />
            </div>
            <button type="submit" disabled={passwordSaving} style={{ padding: '10px 24px', background: 'rgba(0,100,255,0.15)', border: '1px solid rgba(0,100,255,0.3)', borderRadius: '8px', color: '#00aaff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {passwordSaving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
          {passwordMsg && <div style={{ fontSize: '13px', marginTop: '10px', color: passwordMsg.startsWith('Error') ? '#ff6688' : '#00cc66', fontWeight: 600 }}>{passwordMsg}</div>}
        </div>

        {/* Danger zone */}
        <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(255,60,60,0.15)', borderRadius: '16px', padding: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ff6688', marginBottom: '8px' }}>Danger Zone</h2>
          <p style={{ fontSize: '13px', color: '#6b7ab8', marginBottom: '16px' }}>Permanently delete your account and all associated data. This action cannot be undone.</p>
          <button onClick={() => alert('To delete your account, please contact support@axion.estate')} style={{
            padding: '10px 24px', background: 'transparent', border: '1px solid rgba(255,60,60,0.3)', borderRadius: '8px',
            color: '#ff6666', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
          }}>Delete Account</button>
        </div>
      </div>
    </div>
  )
}
