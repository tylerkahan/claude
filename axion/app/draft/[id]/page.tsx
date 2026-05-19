'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#6b7ab8' },
  submitted: { label: 'Submitted for Review', color: '#00aaff' },
  attorney_approved: { label: 'Attorney Approved', color: '#00cc66' },
  notary_scheduled: { label: 'Notary Scheduled', color: '#8866ff' },
  finalized: { label: 'Finalized', color: '#ffaa00' },
}

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

export default function DocumentEditorPage() {
  const params = useParams()
  const docId = params?.id as string
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [document, setDocument] = useState<any>(null)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [reviewing, setReviewing] = useState(false)
  const [review, setReview] = useState<ReviewData | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [attorneyOnFile, setAttorneyOnFile] = useState<{ name: string | null; email: string | null; firm: string | null } | null>(null)
  const [submitTarget, setSubmitTarget] = useState<'user_attorney' | 'axion_attorney'>('user_attorney')
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [showNotaryModal, setShowNotaryModal] = useState(false)
  const [notaryNotes, setNotaryNotes] = useState('')
  const [schedulingNotary, setSchedulingNotary] = useState(false)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef(content)
  const titleRef = useRef(title)
  contentRef.current = content
  titleRef.current = title

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      setEmail(user.email ?? '')

      const { data, error } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('id', docId)
        .eq('user_id', user.id)
        .single()

      if (error || !data) { router.push('/draft'); return }

      setDocument(data)
      setContent(data.content ?? '')
      setTitle(data.title ?? '')
      if (data.ai_review) setReview(data.ai_review as ReviewData)

      const { data: profile } = await supabase
        .from('profiles')
        .select('attorney_name, attorney_email, attorney_firm')
        .eq('id', user.id)
        .single()
      setAttorneyOnFile(profile ? { name: profile.attorney_name, email: profile.attorney_email, firm: profile.attorney_firm } : null)

      setLoading(false)
    }
    load()
  }, [docId, router])

  const autoSave = useCallback(async () => {
    if (!user || !docId) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('legal_documents').update({
      content: contentRef.current,
      title: titleRef.current,
      updated_at: new Date().toISOString(),
    }).eq('id', docId).eq('user_id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [user, docId])

  const handleContentChange = useCallback((val: string) => {
    setContent(val)
    setSaved(false)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(autoSave, 2000)
  }, [autoSave])

  const handleTitleChange = useCallback((val: string) => {
    setTitle(val)
    setSaved(false)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(autoSave, 2000)
  }, [autoSave])

  async function handleSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    await autoSave()
  }

  async function handleRunReview() {
    setReviewing(true)
    try {
      const res = await fetch('/api/review-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, content }),
      })
      if (res.ok) {
        const data = await res.json()
        setReview(data)
      }
    } catch (e: any) {
      alert('Review failed: ' + e.message)
    }
    setReviewing(false)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitMessage(null)
    try {
      const res = await fetch('/api/submit-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, target: submitTarget }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitMessage(data.error || 'Failed to submit')
        setSubmitting(false)
        return
      }
      setDocument((prev: any) => ({
        ...prev,
        status: 'submitted',
        submitted_to_name: data.attorney_name ?? prev?.submitted_to_name,
        submitted_to_email: data.attorney_email ?? prev?.submitted_to_email,
      }))
      setShowSubmitConfirm(false)
    } catch (e: any) {
      setSubmitMessage(e.message)
    }
    setSubmitting(false)
  }

  async function handleScheduleNotary() {
    setSchedulingNotary(true)
    const supabase = createClient()
    const { data: updated } = await supabase
      .from('legal_documents')
      .update({
        status: 'notary_scheduled',
        notary_notes: notaryNotes,
        notary_scheduled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', docId)
      .eq('user_id', user.id)
      .select()
      .single()
    if (updated) setDocument(updated)
    else setDocument((prev: any) => ({ ...prev, status: 'notary_scheduled' }))
    setSchedulingNotary(false)
    setShowNotaryModal(false)
  }

  async function handleMarkFinalized() {
    const supabase = createClient()
    const { data: updated } = await supabase
      .from('legal_documents')
      .update({ status: 'finalized', finalized_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', docId)
      .eq('user_id', user.id)
      .select()
      .single()
    if (updated) setDocument(updated)
    else setDocument((prev: any) => ({ ...prev, status: 'finalized' }))
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length
  const hasCriticalIssues = review?.issues.some(i => i.severity === 'critical') ?? false
  const status = document?.status ?? 'draft'
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: '#03040d', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6b7ab8', fontSize: '14px' }}>Loading document...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#03040d', overflow: 'hidden' }}>
      <Sidebar email={email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top disclaimer banner */}
        <div style={{
          background: 'rgba(255,170,0,0.1)', borderBottom: '1px solid rgba(255,170,0,0.25)',
          padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
        }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span style={{ color: '#ffaa00', fontSize: '12px', fontWeight: 600 }}>
            DRAFT DOCUMENT — NOT LEGALLY BINDING
          </span>
          <span style={{ color: '#c8a060', fontSize: '12px' }}>
            This AI-generated document is for reference only and must be reviewed by a licensed attorney before signing or execution.
          </span>
        </div>

        {/* Header bar */}
        <div style={{
          padding: '14px 24px', borderBottom: '1px solid rgba(0,100,255,0.12)',
          display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0,
          background: 'rgba(6,10,32,0.8)',
        }}>
          <button
            onClick={() => router.push('/draft')}
            style={{ background: 'none', border: 'none', color: '#6b7ab8', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            ← Back
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: '#e8eaf6', fontSize: '16px', fontWeight: 700, width: '100%',
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            />
          </div>
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
            background: statusCfg.color + '22', border: '1px solid ' + statusCfg.color + '44',
            color: statusCfg.color, flexShrink: 0,
          }}>
            {statusCfg.label}
          </span>
          <span style={{ color: '#3d4a7a', fontSize: '11px', flexShrink: 0 }}>
            {saving ? 'Saving...' : saved ? '✓ Saved' : `${wordCount} words`}
          </span>
        </div>

        {/* Main area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Left: editor (60%) */}
          <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid rgba(0,100,255,0.1)' }}>

            {/* Toolbar */}
            <div style={{
              padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px',
              borderBottom: '1px solid rgba(0,100,255,0.08)', flexShrink: 0,
              background: 'rgba(6,10,32,0.5)',
            }}>
              <button
                onClick={handleSave}
                style={{
                  background: 'rgba(0,85,255,0.12)', border: '1px solid rgba(0,100,255,0.25)',
                  color: '#00aaff', borderRadius: '7px', padding: '5px 14px',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Save Draft
              </button>
              <button
                onClick={handleRunReview}
                disabled={reviewing}
                style={{
                  background: 'rgba(0,170,255,0.1)', border: '1px solid rgba(0,170,255,0.25)',
                  color: '#00aaff', borderRadius: '7px', padding: '5px 14px',
                  fontSize: '12px', fontWeight: 600, cursor: reviewing ? 'not-allowed' : 'pointer',
                  opacity: reviewing ? 0.6 : 1,
                }}
              >
                {reviewing ? 'Analyzing...' : 'Run AI Review'}
              </button>
              <span style={{ color: '#3d4a7a', fontSize: '11px', marginLeft: 'auto' }}>{wordCount} words</span>
            </div>

            {/* Document textarea */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: '#0a0f1e' }}>
              <textarea
                value={content}
                onChange={e => handleContentChange(e.target.value)}
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

            {/* Status-based action bar */}
            <div style={{
              padding: '14px 20px', borderTop: '1px solid rgba(0,100,255,0.1)',
              background: 'rgba(6,10,32,0.8)', flexShrink: 0,
            }}>
              {status === 'draft' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button onClick={handleSave} style={{ background: 'rgba(0,85,255,0.12)', border: '1px solid rgba(0,100,255,0.25)', color: '#00aaff', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Save Draft
                  </button>
                  <button onClick={handleRunReview} disabled={reviewing} style={{ background: 'rgba(0,170,255,0.1)', border: '1px solid rgba(0,170,255,0.25)', color: '#00aaff', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: reviewing ? 'not-allowed' : 'pointer', opacity: reviewing ? 0.6 : 1 }}>
                    {reviewing ? 'Analyzing...' : 'Run AI Review'}
                  </button>
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={() => setShowSubmitConfirm(true)}
                    style={{
                      background: 'linear-gradient(135deg, #0055ff, #00aaff)',
                      color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Submit for Attorney Review →
                  </button>
                </div>
              )}

              {status === 'submitted' && (
                <div>
                  <div style={{ color: '#00aaff', fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
                    📬 Your document has been submitted for attorney review.
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {['Draft Created', 'Submitted for Review', 'Attorney Review', 'Notary Session', 'Finalized'].map((step, i) => {
                      const done = i <= 1
                      const active = i === 2
                      return (
                        <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: done ? '#00cc66' : active ? '#00aaff' : '#3d4a7a', fontWeight: done || active ? 600 : 400 }}>
                            {done ? '✅' : active ? '⏳' : '○'} {step}
                          </span>
                          {i < 4 && <span style={{ color: '#3d4a7a', fontSize: '11px' }}>→</span>}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ color: '#6b7ab8', fontSize: '12px', marginTop: '8px' }}>
                    {document?.submitted_to_name
                      ? `Sent to ${document.submitted_to_name} — they'll review and respond.`
                      : 'Your estate attorney will review and respond within 2–3 business days.'}
                  </div>
                </div>
              )}

              {status === 'attorney_approved' && (
                <div>
                  <div style={{ color: '#00cc66', fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
                    ✅ Attorney approved! Schedule a notary session to continue.
                  </div>
                  <button
                    onClick={() => setShowNotaryModal(true)}
                    style={{ background: 'rgba(136,102,255,0.15)', border: '1px solid rgba(136,102,255,0.35)', color: '#8866ff', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Schedule Notary Session
                  </button>
                </div>
              )}

              {status === 'notary_scheduled' && (
                <div>
                  <div style={{ color: '#8866ff', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                    🔮 Notary session scheduled. Once both attorney and notary have signed off, your document will be finalized.
                  </div>
                  <button
                    onClick={handleMarkFinalized}
                    style={{ background: 'rgba(255,170,0,0.12)', border: '1px solid rgba(255,170,0,0.3)', color: '#ffaa00', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Mark as Finalized (Demo)
                  </button>
                </div>
              )}

              {status === 'finalized' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ color: '#ffaa00', fontSize: '13px', fontWeight: 600 }}>
                    ✓ This document has been finalized and added to your Document Vault.
                  </div>
                  <button onClick={() => router.push('/vault')} style={{ background: 'rgba(255,170,0,0.12)', border: '1px solid rgba(255,170,0,0.3)', color: '#ffaa00', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    View in Vault →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: AI Review panel (40%) */}
          <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(6,10,32,0.4)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,100,255,0.08)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <span style={{ color: '#e8eaf6', fontSize: '14px', fontWeight: 600, flex: 1 }}>AI Review</span>
              <button
                onClick={handleRunReview}
                disabled={reviewing}
                style={{
                  background: 'rgba(0,85,255,0.15)', border: '1px solid rgba(0,100,255,0.3)',
                  color: '#00aaff', borderRadius: '7px', padding: '5px 14px',
                  fontSize: '12px', fontWeight: 600, cursor: reviewing ? 'not-allowed' : 'pointer',
                  opacity: reviewing ? 0.6 : 1,
                }}
              >
                {reviewing ? 'Analyzing...' : review ? 'Refresh' : 'Analyze Document'}
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {reviewing && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', gap: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid rgba(0,100,255,0.2)', borderTop: '3px solid #00aaff', animation: 'spin 1s linear infinite' }} />
                  <div style={{ color: '#6b7ab8', fontSize: '13px' }}>Analyzing your document...</div>
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {!reviewing && !review && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
                  <div style={{ color: '#6b7ab8', fontSize: '13px', lineHeight: 1.5 }}>
                    Click "Analyze Document" to get an AI review that checks for gaps, missing assets, and legal issues.
                  </div>
                </div>
              )}

              {!reviewing && review && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Score */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '60px', height: '60px', borderRadius: '50%', flexShrink: 0,
                      background: `conic-gradient(${review.score >= 80 ? '#00cc66' : review.score >= 60 ? '#ffaa00' : '#ff6060'} ${review.score * 3.6}deg, rgba(0,100,255,0.1) 0deg)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                    }}>
                      <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#08111f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#e8eaf6', fontSize: '14px', fontWeight: 700 }}>{review.score}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#e8eaf6', fontSize: '13px', fontWeight: 600 }}>Document Score</div>
                      <div style={{ color: '#6b7ab8', fontSize: '12px', marginTop: '2px', lineHeight: 1.4 }}>{review.summary}</div>
                    </div>
                  </div>

                  {/* Issues */}
                  {review.issues.length > 0 && (
                    <div>
                      <div style={{ color: '#e8eaf6', fontSize: '12px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Issues</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {review.issues.map((issue, i) => {
                          const color = issue.severity === 'critical' ? '#ff6060' : issue.severity === 'warning' ? '#ffaa00' : '#00aaff'
                          return (
                            <div key={i} style={{ background: color + '11', border: '1px solid ' + color + '33', borderRadius: '8px', padding: '10px 12px' }}>
                              <div style={{ color, fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>
                                {issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵'} {issue.title}
                              </div>
                              <div style={{ color: '#9ba3c8', fontSize: '11px', lineHeight: 1.4 }}>{issue.detail}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Asset coverage */}
                  {(review.covered_assets.length > 0 || review.missing_assets.length > 0) && (
                    <div>
                      <div style={{ color: '#e8eaf6', fontSize: '12px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Asset Coverage</div>
                      {review.covered_assets.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ color: '#00cc66', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Covered</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {review.covered_assets.map((a, i) => (
                              <span key={i} style={{ background: 'rgba(0,204,102,0.1)', border: '1px solid rgba(0,204,102,0.25)', color: '#00cc66', borderRadius: '6px', padding: '2px 8px', fontSize: '11px' }}>{a}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {review.missing_assets.length > 0 && (
                        <div>
                          <div style={{ color: '#ff6060', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Missing</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {review.missing_assets.map((a, i) => (
                              <span key={i} style={{ background: 'rgba(255,96,96,0.1)', border: '1px solid rgba(255,96,96,0.25)', color: '#ff6060', borderRadius: '6px', padding: '2px 8px', fontSize: '11px' }}>{a}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submit Chooser Modal */}
      {showSubmitConfirm && (() => {
        const hasAttorney = !!attorneyOnFile?.email
        const userCardSelected = submitTarget === 'user_attorney' && hasAttorney
        const confirmDisabled = submitting || !hasAttorney || submitTarget !== 'user_attorney'
        const docTypeLabel = DOC_TYPE_LABELS[document?.type] ?? 'document'
        return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#08111f', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ color: '#e8eaf6', fontSize: '18px', fontWeight: 700, margin: '0 0 6px', fontFamily: "'Space Grotesk', sans-serif" }}>
              Send for review
            </h3>
            <p style={{ color: '#6b7ab8', fontSize: '13px', margin: '0 0 18px', lineHeight: 1.5 }}>
              Choose who will review your {docTypeLabel} draft.
            </p>

            {hasCriticalIssues && (
              <div style={{ background: 'rgba(255,96,96,0.1)', border: '1px solid rgba(255,96,96,0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', color: '#ff9090', fontSize: '12px' }}>
                ⚠️ Your document has critical issues. An attorney will identify these, but consider running AI Review first to fix them yourself.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
              {/* Card 1: User attorney */}
              <div
                onClick={() => {
                  if (!hasAttorney) return
                  setSubmitTarget('user_attorney')
                  setSubmitMessage(null)
                }}
                style={{
                  padding: '16px 18px',
                  border: `2px solid ${userCardSelected ? '#00aaff' : 'rgba(0,100,255,0.15)'}`,
                  borderRadius: '12px',
                  cursor: hasAttorney ? 'pointer' : 'not-allowed',
                  background: userCardSelected ? 'rgba(0,170,255,0.06)' : 'rgba(8,14,40,0.6)',
                  opacity: hasAttorney ? 1 : 0.55,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '10px',
                    background: 'rgba(136,102,255,0.15)', border: '1px solid rgba(136,102,255,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px', flexShrink: 0,
                  }}>⚖️</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {hasAttorney ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ color: '#e8eaf6', fontSize: '14px', fontWeight: 700 }}>
                            {attorneyOnFile?.name || 'Your Attorney'}
                          </span>
                          <span style={{
                            background: 'rgba(0,204,102,0.12)', border: '1px solid rgba(0,204,102,0.3)',
                            color: '#00cc66', fontSize: '10px', fontWeight: 700,
                            padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.05em',
                          }}>On file</span>
                        </div>
                        <div style={{ color: '#9aa3c8', fontSize: '12px', marginBottom: '2px' }}>
                          {attorneyOnFile?.firm || 'Designated Estate Attorney'}
                        </div>
                        <div style={{ color: '#6b7ab8', fontSize: '12px' }}>{attorneyOnFile?.email}</div>
                      </>
                    ) : (
                      <>
                        <div style={{ color: '#e8eaf6', fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
                          No attorney on file
                        </div>
                        <div style={{ color: '#9aa3c8', fontSize: '12px', marginBottom: '6px' }}>
                          Designate one on the Attorney Connect page first.
                        </div>
                        <a
                          href="/attorney"
                          onClick={e => e.stopPropagation()}
                          style={{ color: '#00aaff', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}
                        >
                          Set up →
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: Axion AI Attorney (locked) */}
              <div
                onClick={() => {
                  setSubmitMessage('Axion AI Attorney is a Pro feature launching soon.')
                }}
                style={{
                  padding: '16px 18px',
                  border: '2px solid rgba(0,100,255,0.15)',
                  borderRadius: '12px',
                  cursor: 'not-allowed',
                  background: 'rgba(8,14,40,0.4)',
                  position: 'relative',
                  opacity: 0.85,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '10px',
                    background: 'linear-gradient(135deg,#0055ff,#00aaff)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px', flexShrink: 0,
                  }}>🤖</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ color: '#e8eaf6', fontSize: '14px', fontWeight: 700 }}>
                        Axion AI Attorney
                      </span>
                      <span style={{
                        background: 'rgba(255,170,0,0.12)', border: '1px solid rgba(255,170,0,0.3)',
                        color: '#ffaa00', fontSize: '10px', fontWeight: 700,
                        padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>Pro Feature</span>
                    </div>
                    <div style={{ color: '#9aa3c8', fontSize: '12px', marginBottom: '4px' }}>
                      AI-powered legal review with same-day turnaround
                    </div>
                    <div style={{ color: '#00aaff', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>$100 per review</div>
                    <div style={{
                      background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.2)',
                      borderRadius: '6px', padding: '6px 10px',
                      color: '#ffaa00', fontSize: '11px', fontWeight: 600,
                    }}>🔒 Available with Pro subscription (coming soon)</div>
                  </div>
                </div>
              </div>
            </div>

            {submitMessage && (
              <div style={{
                background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.3)',
                borderRadius: '8px', padding: '10px 14px', marginBottom: '14px',
                color: '#ffaa00', fontSize: '12px',
              }}>
                {submitMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowSubmitConfirm(false); setSubmitMessage(null) }}
                style={{ background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', color: '#6b7ab8', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={confirmDisabled}
                style={{
                  background: 'linear-gradient(135deg, #0055ff, #00aaff)',
                  color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px',
                  fontSize: '13px', fontWeight: 600,
                  cursor: confirmDisabled ? 'not-allowed' : 'pointer',
                  opacity: confirmDisabled ? 0.5 : 1,
                }}
              >
                {submitting ? 'Submitting...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
        )
      })()}

      {/* Notary Modal */}
      {showNotaryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: '#08111f', border: '1px solid rgba(136,102,255,0.3)', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '460px' }}>
            <h3 style={{ color: '#e8eaf6', fontSize: '16px', fontWeight: 700, margin: '0 0 12px', fontFamily: "'Space Grotesk', sans-serif" }}>
              Schedule Notary Session
            </h3>
            <p style={{ color: '#6b7ab8', fontSize: '13px', margin: '0 0 16px', lineHeight: 1.5 }}>
              A notary public will verify your identity and witness the signing of your document. Provide your preferred dates/times below.
            </p>
            <textarea
              value={notaryNotes}
              onChange={e => setNotaryNotes(e.target.value)}
              placeholder="e.g., Weekday mornings preferred, available Mon/Wed 9am–12pm..."
              style={{
                width: '100%', minHeight: '100px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(136,102,255,0.25)', borderRadius: '8px',
                color: '#e8eaf6', fontSize: '13px', padding: '10px 12px',
                resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNotaryModal(false)} style={{ background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', color: '#6b7ab8', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleScheduleNotary} disabled={schedulingNotary} style={{ background: 'rgba(136,102,255,0.2)', border: '1px solid rgba(136,102,255,0.4)', color: '#8866ff', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: schedulingNotary ? 'not-allowed' : 'pointer' }}>
                {schedulingNotary ? 'Scheduling...' : 'Schedule Notary'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
