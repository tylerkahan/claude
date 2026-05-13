'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const ACTION_LABELS: Record<string, string> = {
  compliance_scan: '🔍 Compliance Scan',
  beneficiary_invite: '✉️ Beneficiary Invited',
  attorney_designated: '⚖️ Attorney Designated',
}

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

  // MFA state
  const [mfaFactors, setMfaFactors] = useState<any[]>([])
  const [enrolling, setEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [totpSecret, setTotpSecret] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [mfaMsg, setMfaMsg] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [enrollFactorId, setEnrollFactorId] = useState('')

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

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
      // Load MFA factors
      const { data: factorsData } = await supabase.auth.mfa.listFactors()
      setMfaFactors(factorsData?.totp ?? [])
      // Load audit logs
      setLogsLoading(true)
      const { data: logs } = await supabase.from('audit_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
      setAuditLogs(logs ?? [])
      setLogsLoading(false)
      setLoading(false)
    }
    load()
  }, [router])

  async function loadMfaFactors() {
    const supabase = createClient()
    const { data: factorsData } = await supabase.auth.mfa.listFactors()
    setMfaFactors(factorsData?.totp ?? [])
  }

  async function startEnroll() {
    setMfaLoading(true)
    setMfaMsg('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Axion Authenticator' })
    setMfaLoading(false)
    if (error || !data) { setMfaMsg('Error: ' + (error?.message ?? 'Failed to start enrollment')); return }
    setQrCode(data.totp.qr_code)
    setTotpSecret(data.totp.secret)
    setEnrollFactorId(data.id)
    setEnrolling(true)
  }

  async function verifyMfa() {
    if (!verifyCode) return
    setMfaLoading(true)
    setMfaMsg('')
    const supabase = createClient()
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollFactorId, code: verifyCode })
    setMfaLoading(false)
    if (error) { setMfaMsg('Error: ' + error.message); return }
    setMfaMsg('2FA enabled successfully!')
    setEnrolling(false)
    setVerifyCode('')
    setQrCode('')
    setTotpSecret('')
    setEnrollFactorId('')
    await loadMfaFactors()
  }

  async function unenrollMfa(factorId: string) {
    setMfaLoading(true)
    setMfaMsg('')
    const supabase = createClient()
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    setMfaLoading(false)
    if (error) { setMfaMsg('Error: ' + error.message); return }
    setMfaMsg('2FA removed.')
    await loadMfaFactors()
  }

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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Settings</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8', marginLeft: '10px' }}>Account & profile</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', maxWidth: '720px' }}>

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

        {/* Two-Factor Authentication */}
        <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>🔐 Two-Factor Authentication</h2>
          <p style={{ fontSize: '13px', color: '#6b7ab8', marginBottom: '20px' }}>Add an extra layer of security to your account with an authenticator app.</p>

          {mfaFactors.length > 0 && !enrolling && (
            <div>
              {mfaFactors.map((factor: any) => (
                <div key={factor.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(0,204,102,0.07)', border: '1px solid rgba(0,204,102,0.2)', borderRadius: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '14px', color: '#00cc66', fontWeight: 700 }}>✓ 2FA Active</span>
                  <span style={{ fontSize: '13px', color: '#9aa3c8', flex: 1 }}>Authenticator App</span>
                  <button onClick={() => unenrollMfa(factor.id)} disabled={mfaLoading} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(255,60,60,0.3)', borderRadius: '7px', color: '#ff6666', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {mfaFactors.length === 0 && !enrolling && (
            <button onClick={startEnroll} disabled={mfaLoading} style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              {mfaLoading ? 'Loading...' : 'Enable 2FA'}
            </button>
          )}

          {enrolling && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: '#9aa3c8', margin: 0 }}>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to verify.</p>
              {qrCode && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <img src={qrCode} alt="2FA QR Code" style={{ width: '180px', height: '180px', borderRadius: '10px', border: '1px solid rgba(0,100,255,0.2)' }} />
                </div>
              )}
              {totpSecret && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Manual Entry Key</div>
                  <code style={{ display: 'block', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#00aaff', fontSize: '13px', fontFamily: 'monospace', letterSpacing: '.05em', wordBreak: 'break-all' }}>{totpSecret}</code>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>6-Digit Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  style={{ width: '160px', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '18px', outline: 'none', fontFamily: 'monospace', letterSpacing: '.2em', textAlign: 'center' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={verifyMfa} disabled={mfaLoading || verifyCode.length !== 6} style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: verifyCode.length !== 6 ? 0.5 : 1 }}>
                  {mfaLoading ? 'Verifying...' : 'Verify & Enable'}
                </button>
                <button onClick={() => { setEnrolling(false); setQrCode(''); setTotpSecret(''); setVerifyCode(''); setEnrollFactorId(''); setMfaMsg('') }} style={{ padding: '10px 24px', background: 'transparent', border: '1px solid rgba(0,100,255,0.25)', borderRadius: '8px', color: '#6b7ab8', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {mfaMsg && (
            <div style={{ marginTop: '12px', fontSize: '13px', color: mfaMsg.startsWith('Error') ? '#ff6688' : '#00cc66', fontWeight: 600 }}>{mfaMsg}</div>
          )}
        </div>

        {/* Security Activity Log */}
        <div style={{ background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>🛡️ Security Activity Log</h2>
          <p style={{ fontSize: '13px', color: '#6b7ab8', marginBottom: '20px' }}>Recent security-relevant actions on your account.</p>

          {logsLoading && <div style={{ fontSize: '13px', color: '#6b7ab8' }}>Loading...</div>}
          {!logsLoading && auditLogs.length === 0 && (
            <div style={{ fontSize: '13px', color: '#3d4a7a', padding: '16px', textAlign: 'center', borderRadius: '8px', border: '1px solid rgba(0,100,255,0.08)' }}>No activity recorded yet.</div>
          )}
          {!logsLoading && auditLogs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {auditLogs.map((log: any) => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,100,255,0.07)' }}>
                  <code style={{ fontSize: '11px', color: '#3d4a7a', fontFamily: 'monospace', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </code>
                  <span style={{ fontSize: '13px', color: '#e8eaf6', fontWeight: 500 }}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                  {log.resource && (
                    <span style={{ fontSize: '12px', color: '#6b7ab8', marginLeft: 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{log.resource}</span>
                  )}
                </div>
              ))}
            </div>
          )}
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
    </div>
  )
}
