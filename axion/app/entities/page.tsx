'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AIPageInsight from '@/components/AIPageInsight'

const ENTITY_TYPES = ['Grantor (You)', 'Revocable Trust', 'Irrevocable Trust', 'LLC', 'LP', 'Limited Partnership', 'Corporation', 'Asset']
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  'Grantor (You)':     { bg: 'rgba(0,170,255,0.08)',   border: 'rgba(0,170,255,0.5)',   text: '#00aaff', glow: '0 0 24px rgba(0,170,255,0.15)' },
  'Revocable Trust':   { bg: 'rgba(102,68,255,0.08)',  border: 'rgba(102,68,255,0.5)',  text: '#aa88ff', glow: '0 0 24px rgba(102,68,255,0.12)' },
  'Irrevocable Trust': { bg: 'rgba(102,68,255,0.08)',  border: 'rgba(102,68,255,0.5)',  text: '#aa88ff', glow: '0 0 24px rgba(102,68,255,0.12)' },
  'LLC':               { bg: 'rgba(0,204,102,0.08)',   border: 'rgba(0,204,102,0.45)',  text: '#00cc66', glow: '0 0 24px rgba(0,204,102,0.1)'  },
  'LP':                { bg: 'rgba(255,160,0,0.08)',   border: 'rgba(255,160,0,0.45)',  text: '#ffaa00', glow: '0 0 24px rgba(255,160,0,0.1)'  },
  'Limited Partnership':{ bg: 'rgba(255,160,0,0.08)', border: 'rgba(255,160,0,0.45)',  text: '#ffaa00', glow: '0 0 24px rgba(255,160,0,0.1)'  },
  'Corporation':       { bg: 'rgba(255,102,136,0.08)', border: 'rgba(255,102,136,0.4)', text: '#ff6688', glow: '0 0 24px rgba(255,102,136,0.1)' },
  'Asset':             { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.12)',text: '#6b7ab8', glow: 'none' },
}

const fmt = (n: number) => {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`
  return `$${Math.round(n).toLocaleString()}`
}

const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,100,255,0.18)', borderRadius: '8px', color: '#e8eaf6', fontSize: '14px', outline: 'none', fontFamily: 'Inter,sans-serif', boxSizing: 'border-box' }
const lbl = (text: string) => <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7ab8', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>{text}</label>

export default function EntitiesPage() {
  const [user, setUser]           = useState<any>(null)
  const [entities, setEntities]   = useState<any[]>([])
  const [assets, setAssets]       = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [balances, setBalances]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'LLC', state: '', ein: '',
    ownership_pct: '', description: '', parent_name: ''
  })
  const router = useRouter()
  const sf = (p: any) => setForm(f => ({ ...f, ...p }))

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [{ data: ents }, { data: ass }, { data: conns }, { data: bals }] = await Promise.all([
        supabase.from('entities').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('assets').select('*').eq('user_id', user.id),
        supabase.from('connected_accounts').select('*').eq('user_id', user.id),
        supabase.from('account_balances').select('*').eq('user_id', user.id),
      ])
      setEntities(ents ?? [])
      setAssets(ass ?? [])
      setConnections(conns ?? [])
      setBalances(bals ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  // Compute value + asset count held per entity name
  const entityValueMap = useMemo(() => {
    const map: Record<string, { value: number; count: number }> = {}
    assets.forEach(a => {
      const en = a.metadata?.entity_name
      if (en) {
        if (!map[en]) map[en] = { value: 0, count: 0 }
        map[en].value += (a.value || 0) - (a.mortgage || 0)
        map[en].count++
      }
    })
    balances.forEach(b => {
      const conn = connections.find((c: any) => c.id === b.connected_account_id)
      const en = conn?.entity_name
      if (en) {
        if (!map[en]) map[en] = { value: 0, count: 0 }
        map[en].value += (b.current_balance || 0)
        map[en].count++
      }
    })
    return map
  }, [assets, balances, connections])

  async function fetchEntities(userId: string) {
    const supabase = createClient()
    const { data } = await supabase.from('entities').select('*').eq('user_id', userId).order('created_at')
    setEntities(data ?? [])
  }

  async function addEntity(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('entities').insert({
      user_id: user.id,
      name: form.name,
      type: form.type,
      state: form.state || null,
      ein: form.ein || null,
      ownership_pct: form.ownership_pct ? parseFloat(form.ownership_pct) : null,
      description: form.description || null,
      parent_name: form.parent_name || null,
    })
    setForm({ name: '', type: 'LLC', state: '', ein: '', ownership_pct: '', description: '', parent_name: '' })
    setShowForm(false)
    await fetchEntities(user.id)
    setSaving(false)
  }

  async function deleteEntity(id: string) {
    const supabase = createClient()
    await supabase.from('entities').delete().eq('id', id)
    await fetchEntities(user.id)
  }

  // Root = no parent or parent not found in entity list
  const roots = entities.filter(e => !e.parent_name || !entities.find((p: any) => p.name === e.parent_name))

  function EntityCard({ entity }: { entity: any }) {
    const c = TYPE_COLORS[entity.type] || TYPE_COLORS['Asset']
    const ev = entityValueMap[entity.name]
    return (
      <div style={{ width: '220px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '14px', padding: '16px', boxShadow: c.glow, position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => deleteEntity(entity.id)}
          style={{ position: 'absolute', top: '8px', right: '8px', padding: '2px 6px', background: 'transparent', border: '1px solid rgba(255,60,60,0.2)', borderRadius: '4px', color: '#ff6666', cursor: 'pointer', fontSize: '10px' }}
        >✕</button>

        {/* Type badge */}
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: `${c.border}33`, color: c.text, border: `1px solid ${c.border}66` }}>
            {entity.type}
          </span>
        </div>

        {/* Name */}
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', lineHeight: 1.3, paddingRight: '18px', marginBottom: '8px' }}>
          {entity.name}
        </div>

        {/* State / EIN */}
        {(entity.state || entity.ein) && (
          <div style={{ fontSize: '11px', color: '#6b7ab8', marginBottom: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {entity.state && <span>📍 {entity.state}</span>}
            {entity.ein && <span style={{ fontFamily: 'monospace', color: '#4a5578' }}>EIN {entity.ein}</span>}
          </div>
        )}

        {entity.description && (
          <div style={{ fontSize: '11px', color: '#4a5578', marginBottom: '6px', lineHeight: 1.4 }}>{entity.description}</div>
        )}

        {/* Divider + live value */}
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${c.border}44` }}>
          {ev && ev.value > 0 ? (
            <>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#fff', fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1 }}>
                {fmt(ev.value)}
              </div>
              <div style={{ fontSize: '10px', color: '#6b7ab8', marginTop: '3px' }}>
                {ev.count} asset{ev.count !== 1 ? 's' : ''} held
              </div>
            </>
          ) : (
            <div style={{ fontSize: '11px', color: '#4a5578' }}>No assets linked</div>
          )}
        </div>
      </div>
    )
  }

  function TreeNode({ entity }: { entity: any }) {
    const children = entities.filter((e: any) => e.parent_name === entity.name)
    return (
      <div className="tree-node">
        <EntityCard entity={entity} />
        {children.length > 0 && (
          <>
            <div className="tree-line-down" />
            <div className="tree-children">
              {children.map((child: any, i: number) => {
                const isFirst = i === 0
                const isLast  = i === children.length - 1
                const isOnly  = children.length === 1
                const cls = ['tree-child-wrap', isFirst ? 'first' : '', isLast ? 'last' : '', isOnly ? 'only' : ''].join(' ').trim()
                return (
                  <div key={child.id} className={cls}>
                    <div className="tree-drop">
                      {child.ownership_pct != null && child.ownership_pct > 0 && (
                        <span className="tree-pct">{child.ownership_pct}%</span>
                      )}
                    </div>
                    <TreeNode entity={child} />
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: '58px', flexShrink: 0, background: 'rgba(6,10,32,0.9)', borderBottom: '1px solid rgba(0,100,255,0.12)', display: 'flex', alignItems: 'center', padding: '0 28px', backdropFilter: 'blur(20px)' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' }}>Entity Tree</span>
          <span style={{ fontSize: '12px', color: '#6b7ab8', marginLeft: '10px' }}>Your estate structure</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '7px 16px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>+ Add Entity</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '24px 28px' }}>
          <AIPageInsight page="entities" />

          {showForm && (
            <div style={{ background: 'rgba(8,14,40,0.9)', border: '1px solid rgba(0,100,255,0.25)', borderRadius: '16px', padding: '24px', marginBottom: '32px', maxWidth: '680px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '18px' }}>Add Entity</h3>
              <form onSubmit={addEntity} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  {lbl('Entity Name')}
                  <input required value={form.name} onChange={e => sf({ name: e.target.value })} placeholder="e.g. Smith Family Trust" style={inp} />
                </div>
                <div>
                  {lbl('Type')}
                  <select value={form.type} onChange={e => sf({ type: e.target.value })} style={inp}>
                    {ENTITY_TYPES.map(t => <option key={t} style={{ background: '#060818' }}>{t}</option>)}
                  </select>
                </div>
                <div>
                  {lbl('State of Formation')}
                  <select value={form.state} onChange={e => sf({ state: e.target.value })} style={inp}>
                    <option value="" style={{ background: '#060818' }}>— optional —</option>
                    {US_STATES.map(s => <option key={s} style={{ background: '#060818' }}>{s}</option>)}
                  </select>
                </div>
                <div>
                  {lbl('EIN / Tax ID')}
                  <input value={form.ein} onChange={e => sf({ ein: e.target.value })} placeholder="e.g. 82-1234567 (optional)" style={inp} />
                </div>
                <div>
                  {lbl('Owned By (parent)')}
                  <select value={form.parent_name} onChange={e => sf({ parent_name: e.target.value })} style={inp}>
                    <option value="" style={{ background: '#060818' }}>— None (root) —</option>
                    {entities.map((e: any) => <option key={e.id} value={e.name} style={{ background: '#060818' }}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  {lbl('Ownership %')}
                  <input type="number" min="0" max="100" step="0.01" value={form.ownership_pct} onChange={e => sf({ ownership_pct: e.target.value })} placeholder="e.g. 100 (optional)" style={inp} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  {lbl('Description')}
                  <input value={form.description} onChange={e => sf({ description: e.target.value })} placeholder="e.g. Holds primary residence and investment property (optional)" style={inp} />
                </div>
                <div style={{ gridColumn: '1/-1', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(0,100,255,0.2)', borderRadius: '8px', color: '#6b7ab8', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                  <button type="submit" disabled={saving} style={{ padding: '9px 22px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    {saving ? 'Saving...' : 'Add Entity'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {entities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 40px', color: '#6b7ab8' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🌳</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>No entities yet</div>
              <div style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto', lineHeight: '1.7' }}>
                Add your trusts, LLCs, and partnerships to visualize your estate structure with live asset values.
              </div>
              <button onClick={() => setShowForm(true)} style={{ marginTop: '20px', padding: '10px 24px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>+ Add Your First Entity</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '64px', justifyContent: 'center', flexWrap: 'wrap', paddingBottom: '60px', paddingTop: '8px' }}>
              {roots.map((root: any) => (
                <TreeNode key={root.id} entity={root} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
