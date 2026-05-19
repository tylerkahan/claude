'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const DOC_TYPES = [
  { id: 'will', label: 'Last Will & Testament', icon: '📜', desc: 'Directs distribution of your assets and names an executor', critical: true },
  { id: 'healthcare_directive', label: 'Healthcare Directive', icon: '🏥', desc: 'Specifies your medical wishes if incapacitated', critical: true },
  { id: 'poa_financial', label: 'Power of Attorney (Financial)', icon: '💼', desc: 'Authorizes someone to manage your finances', critical: true },
  { id: 'healthcare_proxy', label: 'Healthcare Proxy', icon: '🩺', desc: 'Names someone to make medical decisions for you', critical: true },
  { id: 'living_trust', label: 'Revocable Living Trust', icon: '🏛️', desc: 'Avoids probate and manages asset distribution', critical: false },
  { id: 'advance_directive', label: 'Advance Directive (DNR)', icon: '📋', desc: 'Documents end-of-life care preferences', critical: false },
]

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#6b7ab8' },
  submitted: { label: 'Submitted for Review', color: '#00aaff' },
  attorney_approved: { label: 'Attorney Approved', color: '#00cc66' },
  notary_scheduled: { label: 'Notary Scheduled', color: '#8866ff' },
  finalized: { label: 'Finalized', color: '#ffaa00' },
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

export default function DraftPage() {
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<any[]>([])
  const [creating, setCreating] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatingDocId, setGeneratingDocId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      setEmail(user.email ?? '')
      await fetchDocuments(user.id)
      setLoading(false)
    }
    load()
  }, [router])

  const fetchDocuments = useCallback(async (userId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setDocuments(data ?? [])
  }, [])

  async function handleGenerate() {
    if (!selectedType || !user) return
    const docId = generateUUID()
    setGenerating(true)
    setGeneratingDocId(docId)
    try {
      const res = await fetch('/api/draft-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, docId }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error ?? 'Failed to generate document')
        setGenerating(false)
        setGeneratingDocId(null)
        return
      }
      router.push('/draft/' + docId)
    } catch (e: any) {
      alert(e.message)
      setGenerating(false)
      setGeneratingDocId(null)
    }
  }

  const selectedDocType = DOC_TYPES.find(d => d.id === selectedType)

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: '#03040d', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6b7ab8', fontSize: '14px' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#03040d', overflow: 'hidden' }}>
      <Sidebar email={email} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#e8eaf6', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
            Draft Documents
          </h1>
          <p style={{ color: '#6b7ab8', fontSize: '14px', marginTop: '6px', margin: '6px 0 0' }}>
            AI-powered legal document drafting
          </p>
        </div>

        {/* Create new button */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => setCreating(true)}
            style={{
              background: 'linear-gradient(135deg, #0055ff, #00aaff)',
              color: '#fff', border: 'none', borderRadius: '10px',
              padding: '10px 20px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            <span style={{ fontSize: '16px' }}>+</span> Create New Document
          </button>
        </div>

        {/* Document list */}
        {documents.length === 0 ? (
          <div style={{
            background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)',
            borderRadius: '14px', padding: '48px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📄</div>
            <div style={{ color: '#e8eaf6', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
              No documents yet
            </div>
            <div style={{ color: '#6b7ab8', fontSize: '14px' }}>
              Create your first legal document with AI.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {documents.map(doc => {
              const docType = DOC_TYPES.find(d => d.id === doc.type)
              const statusCfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.draft
              return (
                <div key={doc.id} style={{
                  background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)',
                  borderRadius: '12px', padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: '16px',
                }}>
                  <div style={{ fontSize: '28px', flexShrink: 0 }}>{docType?.icon ?? '📄'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#e8eaf6', fontSize: '14px', fontWeight: 600 }}>{doc.title}</div>
                    <div style={{ color: '#6b7ab8', fontSize: '12px', marginTop: '3px' }}>
                      {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                    background: statusCfg.color + '22',
                    border: '1px solid ' + statusCfg.color + '44',
                    color: statusCfg.color,
                  }}>
                    {statusCfg.label}
                  </span>
                  <button
                    onClick={() => router.push('/draft/' + doc.id)}
                    style={{
                      background: 'rgba(0,85,255,0.15)', border: '1px solid rgba(0,100,255,0.3)',
                      color: '#00aaff', borderRadius: '8px', padding: '6px 14px',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Open
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {creating && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{
            background: '#08111f', border: '1px solid rgba(0,100,255,0.2)',
            borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '640px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            {generating ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>
                <div style={{ color: '#e8eaf6', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                  AI is drafting your {selectedDocType?.label ?? 'document'}...
                </div>
                <div style={{ color: '#6b7ab8', fontSize: '13px', marginBottom: '24px' }}>
                  Building a complete document based on your account data. This takes about 20–30 seconds.
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    border: '3px solid rgba(0,100,255,0.2)',
                    borderTop: '3px solid #00aaff',
                    animation: 'spin 1s linear infinite',
                  }} />
                </div>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h2 style={{ color: '#e8eaf6', fontSize: '18px', fontWeight: 700, margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                    Create New Document
                  </h2>
                  <button
                    onClick={() => { setCreating(false); setSelectedType('') }}
                    style={{ background: 'none', border: 'none', color: '#6b7ab8', fontSize: '20px', cursor: 'pointer' }}
                  >
                    ×
                  </button>
                </div>

                <p style={{ color: '#6b7ab8', fontSize: '13px', marginBottom: '20px', marginTop: 0 }}>
                  Select a document type to generate with AI using your account data.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
                  {DOC_TYPES.map(dt => (
                    <button
                      key={dt.id}
                      onClick={() => setSelectedType(dt.id)}
                      style={{
                        background: selectedType === dt.id ? 'rgba(0,85,255,0.2)' : 'rgba(255,255,255,0.03)',
                        border: selectedType === dt.id ? '1px solid rgba(0,150,255,0.5)' : '1px solid rgba(0,100,255,0.12)',
                        borderRadius: '10px', padding: '14px', textAlign: 'left', cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: '22px', marginBottom: '6px' }}>{dt.icon}</div>
                      <div style={{ color: '#e8eaf6', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        {dt.label}
                        {dt.critical && (
                          <span style={{ marginLeft: '6px', fontSize: '10px', color: '#ff6060', background: 'rgba(255,60,60,0.1)', padding: '1px 5px', borderRadius: '4px' }}>
                            Essential
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#6b7ab8', fontSize: '11px', lineHeight: 1.4 }}>{dt.desc}</div>
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setCreating(false); setSelectedType('') }}
                    style={{
                      background: 'transparent', border: '1px solid rgba(0,100,255,0.2)',
                      color: '#6b7ab8', borderRadius: '8px', padding: '9px 18px',
                      fontSize: '13px', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={!selectedType}
                    style={{
                      background: selectedType ? 'linear-gradient(135deg, #0055ff, #00aaff)' : 'rgba(0,100,255,0.1)',
                      color: selectedType ? '#fff' : '#3d4a7a',
                      border: 'none', borderRadius: '8px', padding: '9px 20px',
                      fontSize: '13px', fontWeight: 600, cursor: selectedType ? 'pointer' : 'not-allowed',
                      transition: 'all 0.15s',
                    }}
                  >
                    Generate Draft →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
