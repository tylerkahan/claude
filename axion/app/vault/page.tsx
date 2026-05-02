'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const CATEGORIES = ['Will', 'Trust', 'Power of Attorney', 'Insurance', 'Property Deed', 'Tax Return', 'Other']

const CATEGORY_ICONS: Record<string, string> = {
  'Will': '📜', 'Trust': '🏛', 'Power of Attorney': '✍️',
  'Insurance': '🛡', 'Property Deed': '🏠', 'Tax Return': '📋', 'Other': '📄'
}

export default function VaultPage() {
  const [user, setUser] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState('Will')
  const [loading, setLoading] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchDocs(user.id)
      setLoading(false)
    }
    load()
  }, [router])

  async function fetchDocs(userId: string) {
    const supabase = createClient()
    const { data } = await supabase.from('documents').select('*').eq('user_id', userId).order('uploaded_at', { ascending: false })
    setDocuments(data ?? [])
  }

  async function uploadFile(file: File) {
    if (!user) return
    setUploading(true)
    const supabase = createClient()
    const filePath = `${user.id}/${Date.now()}-${file.name}`

    const { error: storageError } = await supabase.storage.from('documents').upload(filePath, file)
    if (storageError) { alert('Upload failed: ' + storageError.message); setUploading(false); return }

    await supabase.from('documents').insert({
      user_id: user.id, name: file.name, category,
      file_path: filePath, file_size: file.size
    })

    await fetchDocs(user.id)
    setUploading(false)
  }

  async function download(filePath: string, fileName: string) {
    const supabase = createClient()
    const { data } = await supabase.storage.from('documents').download(filePath)
    if (data) {
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url; a.download = fileName; a.click()
      URL.revokeObjectURL(url)
    }
  }

  async function deleteDoc(id: string, filePath: string) {
    if (!confirm('Delete this document?')) return
    const supabase = createClient()
    await supabase.storage.from('documents').remove([filePath])
    await supabase.from('documents').delete().eq('id', id)
    await fetchDocs(user.id)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: '12px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Document Vault</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8' }}>{documents.length} file{documents.length !== 1 ? 's' : ''} · 256-bit encrypted</span>
          <div style={{ flex: 1 }} />
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#e8eaf6', fontSize: '13px', cursor: 'pointer' }}>
            {CATEGORIES.map(c => <option key={c} style={{ background: '#060818' }}>{c}</option>)}
          </select>
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ padding: '7px 16px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            {uploading ? 'Uploading...' : '↑ Upload'}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.jpg,.png" style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f) }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'rgba(0,170,255,0.6)' : 'rgba(0,100,255,0.25)'}`,
            borderRadius: '16px', padding: '32px', textAlign: 'center',
            background: dragOver ? 'rgba(0,80,200,0.08)' : 'rgba(0,60,200,0.03)',
            cursor: 'pointer', marginBottom: '24px', transition: 'all .2s'
          }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>⬆</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Drop a file here or click to browse</div>
          <div style={{ fontSize: '12px', color: '#6b7ab8' }}>PDF, Word, or image — up to 50MB</div>
        </div>

        {/* Document list */}
        {documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#6b7ab8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📂</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>No documents yet</div>
            <div style={{ fontSize: '13px' }}>Upload your will, trust, insurance policies, or any estate document.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {documents.map(doc => (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '16px 20px',
                background: 'rgba(8,14,40,0.8)', border: '1px solid rgba(0,100,255,0.15)',
                borderRadius: '14px', transition: 'border-color .2s'
              }}>
                <span style={{ fontSize: '24px' }}>{CATEGORY_ICONS[doc.category] || '📄'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{doc.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b7ab8', marginTop: '2px' }}>
                    {doc.category} · {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : '—'} · {new Date(doc.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
                <button onClick={() => download(doc.file_path, doc.name)} style={{
                  padding: '7px 14px', background: 'transparent',
                  border: '1px solid rgba(0,100,255,0.25)', borderRadius: '8px',
                  color: '#6b7ab8', cursor: 'pointer', fontSize: '13px'
                }}>Download</button>
                <button onClick={() => deleteDoc(doc.id, doc.file_path)} style={{
                  padding: '7px 12px', background: 'transparent',
                  border: '1px solid rgba(255,60,60,0.2)', borderRadius: '8px',
                  color: '#ff6666', cursor: 'pointer', fontSize: '13px'
                }}>Delete</button>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
