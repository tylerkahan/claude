'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const DOC_TYPE_LABELS: Record<string, string> = {
  will: 'Last Will & Testament',
  healthcare_directive: 'Healthcare Directive',
  poa_financial: 'Power of Attorney (Financial)',
  healthcare_proxy: 'Healthcare Proxy',
  living_trust: 'Revocable Living Trust',
  advance_directive: 'Advance Directive (DNR)',
}

interface ReviewData {
  score: number
  issues: Array<{ severity: string; title: string; detail: string }>
  covered_assets: string[]
  missing_assets: string[]
  summary: string
}

export default function AttorneyPortalPage() {
  const params = useParams()
  const token = params?.token as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [doc, setDoc] = useState<any>(null)
  const [grantor, setGrantor] = useState<{ name: string; state: string | null; email: string | null } | null>(null)
  const [content, setContent] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [finalState, setFinalState] = useState<'approved' | 'rejected' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/attorney-portal?token=${encodeURIComponent(token)}`)
        if (!res.ok) {
          setError('Invalid or expired link')
          setLoading(false)
          return
        }
        const data = await res.json()
        setDoc(data.document)
        setGrantor(data.grantor)
        setContent(data.document?.content ?? '')
        setNotes(data.document?.attorney_notes ?? '')
      } catch {
        setError('Failed to load document')
      }
      setLoading(false)
    }
    if (token) load()
  }, [token])

  async function handleSaveChanges() {
    setSaving(true)
    setActionError(null)
    try {
      const res = await fetch('/api/attorney-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'save', content }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setActionError(d.error || 'Failed to save')
      } else {
        setSavedAt(new Date().toLocaleTimeString())
      }
    } catch (e: any) {
      setActionError(e.message)
    }
    setSaving(false)
  }

  async function handleApprove() {
    setSubmitting(true)
    setActionError(null)
    try {
      const res = await fetch('/api/attorney-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'approve', content, notes }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setActionError(d.error || 'Failed to approve')
        setSubmitting(false)
        return
      }
      setFinalState('approved')
    } catch (e: any) {
      setActionError(e.message)
    }
    setSubmitting(false)
  }

  async function handleReject() {
    if (!notes.trim()) {
      setActionError('Please add review notes before requesting changes.')
      return
    }
    setSubmitting(true)
    setActionError(null)
    try {
      const res = await fetch('/api/attorney-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'reject', notes }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setActionError(d.error || 'Failed to submit feedback')
        setSubmitting(false)
        return
      }
      setFinalState('rejected')
    } catch (e: any) {
      setActionError(e.message)
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: '#03040d', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6b7ab8', fontSize: '14px' }}>Loading review portal...</div>
      </div>
    )
  }

  if (error || !doc || !grantor) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: '#03040d', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{
          background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '16px',
          padding: '40px 36px', maxWidth: '420px', width: '100%', textAlign: 'center',
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '10px',
            background: 'linear-gradient(135deg,#0055ff,#00aaff)', margin: '0 auto 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '20px', fontWeight: 800,
          }}>A</div>
          <h1 style={{ color: '#e8eaf6', fontSize: '20px', fontWeight: 700, margin: '0 0 8px', fontFamily: "'Space Grotesk', sans-serif" }}>
            Invalid or expired link
          </h1>
          <p style={{ color: '#6b7ab8', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
            This attorney review link is no longer valid. Please contact the client who sent it to request a new review link.
          </p>
        </div>
      </div>
    )
  }

  const docTypeLabel = DOC_TYPE_LABELS[doc.type] ?? 'Legal Document'
  const review: ReviewData | null = doc.ai_review ?? null
  const submittedDate = doc.submitted_at ? new Date(doc.submitted_at).toLocaleDateString() : '—'

  // Final confirmation state
  if (finalState) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#03040d' }}>
        <PortalHeader grantorName={grantor.name} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{
            background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)', borderRadius: '16px',
            padding: '48px 40px', maxWidth: '480px', width: '100%', textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {finalState === 'approved' ? '✓' : '↩️'}
            </div>
            <h1 style={{
              color: finalState === 'approved' ? '#00cc66' : '#ffaa00',
              fontSize: '22px', fontWeight: 700, margin: '0 0 12px',
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              {finalState === 'approved' ? 'Approved' : 'Changes Requested'}
            </h1>
            <p style={{ color: '#9aa3c8', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
              The client has been notified.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#03040d', overflow: 'hidden' }}>
      <PortalHeader grantorName={grantor.name} />

      {/* Disclaimer banner */}
      <div style={{
        background: 'rgba(255,170,0,0.1)', borderBottom: '1px solid rgba(255,170,0,0.25)',
        padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
      }}>
        <span style={{ fontSize: '16px' }}>⚠️</span>
        <span style={{ color: '#ffaa00', fontSize: '12px', fontWeight: 600 }}>SECURE ATTORNEY REVIEW</span>
        <span style={{ color: '#c8a060', fontSize: '12px' }}>
          You are reviewing a legal document draft for {grantor.name}. This is an Axion secure review link. All edits and approval status are recorded.
        </span>
      </div>

      {/* Main split */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: editor 65% */}
        <div style={{ flex: '0 0 65%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid rgba(0,100,255,0.1)' }}>
          <div style={{
            padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px',
            borderBottom: '1px solid rgba(0,100,255,0.08)', flexShrink: 0,
            background: 'rgba(6,10,32,0.5)',
          }}>
            <button
              onClick={handleSaveChanges}
              disabled={saving}
              style={{
                background: 'rgba(0,85,255,0.12)', border: '1px solid rgba(0,100,255,0.25)',
                color: '#00aaff', borderRadius: '7px', padding: '5px 14px',
                fontSize: '12px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {savedAt && <span style={{ color: '#00cc66', fontSize: '11px' }}>✓ Saved at {savedAt}</span>}
            <span style={{ color: '#3d4a7a', fontSize: '11px', marginLeft: 'auto' }}>{doc.title || docTypeLabel}</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: '#0a0f1e' }}>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              style={{
                background: '#ffffff',
                color: '#1a1a2e',
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                lineHeight: 1.8,
                padding: '48px 56px',
                borderRadius: '4px',
                minHeight: '800px',
                width: '100%',
                border: 'none',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Right: review panel 35% */}
        <div style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(6,10,32,0.4)' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Doc info card */}
            <div style={{
              background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)',
              borderRadius: '12px', padding: '16px 18px',
            }}>
              <InfoRow label="Document Type" value={docTypeLabel} />
              <InfoRow label="Grantor" value={grantor.name} />
              <InfoRow label="State" value={grantor.state || '—'} />
              <InfoRow label="Submitted" value={submittedDate} last />
            </div>

            {/* AI Review (read-only) */}
            {review && (
              <div style={{
                background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)',
                borderRadius: '12px', padding: '16px 18px',
              }}>
                <div style={{ color: '#e8eaf6', fontSize: '12px', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  AI Pre-Review
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                  <div style={{
                    width: '54px', height: '54px', borderRadius: '50%', flexShrink: 0,
                    background: `conic-gradient(${review.score >= 80 ? '#00cc66' : review.score >= 60 ? '#ffaa00' : '#ff6060'} ${review.score * 3.6}deg, rgba(0,100,255,0.1) 0deg)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#08111f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#e8eaf6', fontSize: '13px', fontWeight: 700 }}>{review.score}</span>
                    </div>
                  </div>
                  <div style={{ color: '#9aa3c8', fontSize: '12px', lineHeight: 1.5 }}>{review.summary}</div>
                </div>
                {review.issues?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {review.issues.map((issue, i) => {
                      const color = issue.severity === 'critical' ? '#ff6060' : issue.severity === 'warning' ? '#ffaa00' : '#00aaff'
                      return (
                        <div key={i} style={{ background: color + '11', border: '1px solid ' + color + '33', borderRadius: '8px', padding: '8px 10px' }}>
                          <div style={{ color, fontSize: '11px', fontWeight: 600, marginBottom: '2px' }}>
                            {issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵'} {issue.title}
                          </div>
                          <div style={{ color: '#9ba3c8', fontSize: '11px', lineHeight: 1.4 }}>{issue.detail}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div style={{
              background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)',
              borderRadius: '12px', padding: '16px 18px',
            }}>
              <div style={{ color: '#e8eaf6', fontSize: '12px', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Review Notes
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add review notes for the client..."
                style={{
                  width: '100%', minHeight: '120px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.15)',
                  borderRadius: '8px', color: '#e8eaf6', fontSize: '13px', padding: '10px 12px',
                  resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            </div>

            {actionError && (
              <div style={{
                background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.3)',
                borderRadius: '8px', padding: '10px 12px', color: '#ffaa00', fontSize: '12px',
              }}>
                {actionError}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleApprove}
                disabled={submitting}
                style={{
                  background: 'linear-gradient(135deg, #00aa55, #00cc66)',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  padding: '14px 18px', fontSize: '14px', fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Submitting...' : '✓ Approve Document'}
              </button>
              <button
                onClick={handleReject}
                disabled={submitting}
                style={{
                  background: 'transparent', color: '#ffaa00',
                  border: '1px solid rgba(255,170,0,0.4)', borderRadius: '10px',
                  padding: '14px 18px', fontSize: '14px', fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Submitting...' : '↩️ Request Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PortalHeader({ grantorName }: { grantorName: string }) {
  return (
    <div style={{
      height: '60px', flexShrink: 0,
      background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.15)',
      display: 'flex', alignItems: 'center', padding: '0 24px', gap: '14px',
    }}>
      <div style={{
        width: '34px', height: '34px', borderRadius: '8px',
        background: 'linear-gradient(135deg,#0055ff,#00aaff)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: '16px', fontWeight: 800,
      }}>A</div>
      <div style={{ color: '#e8eaf6', fontSize: '14px', fontWeight: 700, letterSpacing: '0.04em', fontFamily: "'Space Grotesk', sans-serif" }}>
        AXION <span style={{ color: '#6b7ab8', fontWeight: 500, marginLeft: '8px' }}>· Attorney Review Portal</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ color: '#9aa3c8', fontSize: '12px' }}>
        Reviewing for <strong style={{ color: '#e8eaf6' }}>{grantorName}</strong>
      </div>
    </div>
  )
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: last ? 'none' : '1px solid rgba(0,100,255,0.08)',
    }}>
      <span style={{ color: '#6b7ab8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ color: '#e8eaf6', fontSize: '13px', fontWeight: 500 }}>{value}</span>
    </div>
  )
}
