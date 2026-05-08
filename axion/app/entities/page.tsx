'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AIPageInsight from '@/components/AIPageInsight'

const ENTITY_TYPES = ['Revocable Trust', 'Irrevocable Trust', 'LLC', 'LP', 'Limited Partnership', 'Corporation', 'Asset / Account']
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

const TC: Record<string, { bg: string; border: string; text: string; glow: string; label: string }> = {
  'Revocable Trust':    { bg:'rgba(102,68,255,0.09)',  border:'rgba(102,68,255,0.55)', text:'#aa88ff', glow:'0 0 28px rgba(102,68,255,0.14)', label:'REVOCABLE TRUST'    },
  'Irrevocable Trust':  { bg:'rgba(102,68,255,0.09)',  border:'rgba(102,68,255,0.55)', text:'#aa88ff', glow:'0 0 28px rgba(102,68,255,0.14)', label:'IRREVOCABLE TRUST'  },
  'LLC':                { bg:'rgba(0,204,102,0.07)',   border:'rgba(0,204,102,0.5)',   text:'#00cc66', glow:'0 0 28px rgba(0,204,102,0.1)',   label:'LLC'                },
  'LP':                 { bg:'rgba(255,160,0,0.07)',   border:'rgba(255,160,0,0.5)',   text:'#ffaa00', glow:'0 0 28px rgba(255,160,0,0.1)',    label:'LP'                 },
  'Limited Partnership':{ bg:'rgba(255,160,0,0.07)',   border:'rgba(255,160,0,0.5)',   text:'#ffaa00', glow:'0 0 28px rgba(255,160,0,0.1)',    label:'LIMITED PARTNERSHIP'},
  'Corporation':        { bg:'rgba(255,102,136,0.07)', border:'rgba(255,102,136,0.45)',text:'#ff6688', glow:'0 0 28px rgba(255,102,136,0.1)',  label:'CORPORATION'        },
  'Asset / Account':    { bg:'rgba(255,255,255,0.03)', border:'rgba(255,255,255,0.13)',text:'#6b7ab8', glow:'none',                           label:'ASSET'              },
  'default':            { bg:'rgba(255,255,255,0.03)', border:'rgba(255,255,255,0.13)',text:'#6b7ab8', glow:'none',                           label:'ENTITY'             },
}
const GRANTOR_C = { bg:'rgba(0,170,255,0.1)', border:'rgba(0,170,255,0.55)', text:'#00aaff', glow:'0 0 32px rgba(0,170,255,0.18)' }

const LEGEND = [
  { label:'Grantor / Individual', color:'#00aaff' },
  { label:'Trust',  color:'#aa88ff' },
  { label:'LLC',    color:'#00cc66' },
  { label:'LP',     color:'#ffaa00' },
  { label:'Asset / Account', color:'#6b7ab8' },
]

const ASSET_TC: Record<string, { text: string; label: string }> = {
  'Real Estate':       { text:'#00aaff',  label:'REAL ESTATE'  },
  'Investment Account':{ text:'#00cc66',  label:'BROKERAGE'    },
  'Private Equity':    { text:'#ffaa00',  label:'PE FUND'      },
  'Bank Account':      { text:'#6b7ab8',  label:'BANK'         },
  'Crypto':            { text:'#ff6688',  label:'CRYPTO'       },
  'Business':          { text:'#aa88ff',  label:'BUSINESS'     },
  'Life Insurance':    { text:'#00d4ff',  label:'INSURANCE'    },
  'Other':             { text:'#6b7ab8',  label:'OTHER'        },
}

const fmt = (n: number) => n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${Math.round(n/1e3)}K` : `$${Math.round(n).toLocaleString()}`
const maskEIN = (ein: string | null) => { if (!ein) return null; const p = ein.split('-'); return p.length === 2 && p[1].length >= 4 ? `${p[0]}-••••${p[1].slice(-4)}` : ein }
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month:'short', year:'numeric' }) : null
const fmtDateFull = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) : null

const inp: React.CSSProperties = { width:'100%', padding:'10px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(0,100,255,0.18)', borderRadius:'8px', color:'#e8eaf6', fontSize:'14px', outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box' }
const lbl = (t: string) => <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#6b7ab8', marginBottom:'6px', textTransform:'uppercase' as const, letterSpacing:'.06em' }}>{t}</label>

function DRow({ label, value, color }: { label:string; value:string; color?:string }) {
  return (
    <div style={{ fontSize:'12px', display:'flex', gap:'6px', lineHeight:1.4 }}>
      <span style={{ color:'#6b7ab8', flexShrink:0 }}>{label}:</span>
      <span style={{ color: color || '#e8eaf6', fontWeight: color ? 600 : 400 }}>{value}</span>
    </div>
  )
}

export default function EntitiesPage() {
  const [user, setUser]         = useState<any>(null)
  const [profile, setProfile]   = useState<any>(null)
  const [entities, setEntities] = useState<any[]>([])
  const [assets, setAssets]     = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [balances, setBalances] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm] = useState({
    name:'', type:'LLC', state:'', ein:'', status:'Active',
    est_date:'', ownership_display:'', parent_name:'',
    trustee:'', successor_trustee:'',
    manager:'', members:'',
    gp:'', lp:'',
    annual_report:'',
  })
  const router = useRouter()
  const sf = (p: any) => setForm(f => ({ ...f, ...p }))

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const [{ data: ents }, { data: prof }, { data: ass }, { data: conns }, { data: bals }] = await Promise.all([
        supabase.from('entities').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('assets').select('*').eq('user_id', user.id),
        supabase.from('connected_accounts').select('*').eq('user_id', user.id),
        supabase.from('account_balances').select('*').eq('user_id', user.id),
      ])
      setEntities(ents ?? [])
      setProfile(prof)
      setAssets(ass ?? [])
      setConnections(conns ?? [])
      setBalances(bals ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  const entityValueMap = useMemo(() => {
    const map: Record<string, { value:number; count:number }> = {}
    assets.forEach((a: any) => {
      const en = a.metadata?.entity_name
      if (en) { if (!map[en]) map[en] = { value:0, count:0 }; map[en].value += (a.value||0)-(a.mortgage||0); map[en].count++ }
    })
    balances.forEach((b: any) => {
      const conn = connections.find((c: any) => c.id === b.connected_account_id)
      const en = conn?.entity_name
      if (en) { if (!map[en]) map[en] = { value:0, count:0 }; map[en].value += (b.current_balance||0); map[en].count++ }
    })
    return map
  }, [assets, balances, connections])

  // Top 2 assets per entity for tree leaf nodes
  const topAssetsPerEntity = useMemo(() => {
    const map: Record<string, any[]> = {}
    assets.forEach((a: any) => {
      const en = a.metadata?.entity_name
      if (en) { if (!map[en]) map[en] = []; map[en].push(a) }
    })
    Object.keys(map).forEach(k => { map[k] = map[k].sort((a,b) => (b.value||0)-(a.value||0)).slice(0,2) })
    return map
  }, [assets])

  async function fetchEntities(userId: string) {
    const supabase = createClient()
    const { data } = await supabase.from('entities').select('*').eq('user_id', userId).order('created_at')
    setEntities(data ?? [])
  }

  async function addEntity(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const supabase = createClient()
    const meta: any = {}
    if (form.ownership_display) meta.ownership_display = form.ownership_display
    if (form.trustee) meta.trustee = form.trustee
    if (form.successor_trustee) meta.successor_trustee = form.successor_trustee
    if (form.manager) meta.manager = form.manager
    if (form.members) meta.members = form.members
    if (form.gp) meta.gp = form.gp
    if (form.lp) meta.lp = form.lp
    if (form.annual_report) meta.annual_report = form.annual_report
    await supabase.from('entities').insert({
      user_id: user.id,
      name: form.name, type: form.type,
      state: form.state || null, ein: form.ein || null,
      status: form.status,
      est_date: form.est_date || null,
      parent_name: form.parent_name || null,
      metadata: Object.keys(meta).length ? meta : null,
    })
    setForm({ name:'', type:'LLC', state:'', ein:'', status:'Active', est_date:'', ownership_display:'', parent_name:'', trustee:'', successor_trustee:'', manager:'', members:'', gp:'', lp:'', annual_report:'' })
    setShowForm(false)
    await fetchEntities(user.id)
    setSaving(false)
  }

  async function deleteEntity(id: string) {
    await createClient().from('entities').delete().eq('id', id)
    await fetchEntities(user.id)
  }

  const roots = entities.filter((e: any) => !e.parent_name || !entities.find((p: any) => p.name === e.parent_name))

  // ── Tree card (compact, used inside the visual tree) ──────────────────
  function TreeCard({ entity }: { entity: any }) {
    const c = TC[entity.type] || TC['default']
    const ev = entityValueMap[entity.name]
    const meta = entity.metadata || {}
    return (
      <div style={{ width:'200px', background:c.bg, border:`1px solid ${c.border}`, borderRadius:'12px', padding:'14px 16px', boxShadow:c.glow, flexShrink:0, textAlign:'center', position:'relative' }}>
        <div style={{ marginBottom:'8px' }}>
          <span style={{ fontSize:'9px', fontWeight:800, letterSpacing:'0.08em', padding:'3px 9px', borderRadius:'4px', background:`${c.border}44`, color:c.text, border:`1px solid ${c.border}88` }}>{c.label}</span>
        </div>
        <div style={{ fontSize:'14px', fontWeight:700, color:'#fff', lineHeight:1.3, marginBottom:meta.ownership_display ? '6px' : '4px' }}>{entity.name}</div>
        {meta.ownership_display && <div style={{ fontSize:'12px', fontWeight:700, color:c.text, marginBottom:'6px' }}>{meta.ownership_display}</div>}
        <div style={{ fontSize:'11px', color:'#6b7ab8' }}>
          {[fmtDate(entity.est_date), entity.state, entity.ein ? `EIN ${maskEIN(entity.ein)}` : null].filter(Boolean).join(' · ')}
        </div>
        {ev && ev.value > 0 && <div style={{ marginTop:'8px', fontSize:'13px', fontWeight:800, color:'#fff', fontFamily:"'Space Grotesk',sans-serif" }}>{fmt(ev.value)}</div>}
      </div>
    )
  }

  // ── Asset leaf card (shown under entities in the tree) ────────────────
  function AssetLeaf({ asset }: { asset: any }) {
    const cat = ASSET_TC[asset.category] || { text:'#6b7ab8', label: (asset.category||'ASSET').toUpperCase() }
    const equity = (asset.value||0) - (asset.mortgage||0)
    return (
      <div style={{ width:'160px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'12px 14px', flexShrink:0, textAlign:'center' }}>
        <div style={{ marginBottom:'6px' }}>
          <span style={{ fontSize:'9px', fontWeight:800, letterSpacing:'0.07em', padding:'2px 7px', borderRadius:'4px', background:`${cat.text}18`, color:cat.text, border:`1px solid ${cat.text}44` }}>{cat.label}</span>
        </div>
        <div style={{ fontSize:'12px', fontWeight:700, color:'#e8eaf6', lineHeight:1.3, marginBottom:'4px' }}>{asset.name}</div>
        <div style={{ fontSize:'13px', fontWeight:800, color:'#fff', fontFamily:"'Space Grotesk',sans-serif" }}>{fmt(equity)}</div>
      </div>
    )
  }

  // ── Recursive tree node ───────────────────────────────────────────────
  function TreeNode({ entity }: { entity: any }) {
    const children = entities.filter((e: any) => e.parent_name === entity.name)
    const leafAssets = topAssetsPerEntity[entity.name] || []
    const allLeaves = [
      ...children.map((c: any) => ({ kind:'entity' as const, data:c })),
      ...leafAssets.map((a: any) => ({ kind:'asset' as const, data:a })),
    ]
    return (
      <div className="tree-node">
        <TreeCard entity={entity} />
        {allLeaves.length > 0 && (
          <>
            <div className="tree-line-down" />
            <div className="tree-children">
              {allLeaves.map((item, i) => {
                const isFirst = i === 0, isLast = i === allLeaves.length-1, isOnly = allLeaves.length === 1
                const cls = ['tree-child-wrap', isFirst?'first':'', isLast?'last':'', isOnly?'only':''].join(' ').trim()
                return (
                  <div key={item.kind === 'entity' ? item.data.id : item.data.id+'_asset'} className={cls}>
                    <div className="tree-drop">
                      {item.kind === 'entity' && item.data.ownership_display && (
                        <span className="tree-pct">{item.data.ownership_display.split('·')[0].trim()}</span>
                      )}
                    </div>
                    {item.kind === 'entity' ? <TreeNode entity={item.data} /> : <AssetLeaf asset={item.data} />}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Detail card (shown in bottom grid) ───────────────────────────────
  function DetailCard({ entity }: { entity: any }) {
    const c = TC[entity.type] || TC['default']
    const ev = entityValueMap[entity.name]
    const meta = entity.metadata || {}
    const isTrust = entity.type === 'Revocable Trust' || entity.type === 'Irrevocable Trust'
    const isLLC = entity.type === 'LLC'
    const isLP = entity.type === 'LP' || entity.type === 'Limited Partnership'
    const ar = meta.annual_report || ''
    const arDue = ar.toLowerCase().startsWith('due')
    return (
      <div style={{ background:'rgba(8,14,40,0.85)', border:`1px solid ${c.border}44`, borderRadius:'16px', padding:'20px', position:'relative', display:'flex', flexDirection:'column', gap:'0' }}>
        <button onClick={() => deleteEntity(entity.id)} style={{ position:'absolute', top:'12px', right:'12px', padding:'3px 7px', background:'transparent', border:'1px solid rgba(255,60,60,0.2)', borderRadius:'4px', color:'#ff6666', cursor:'pointer', fontSize:'10px' }}>✕</button>

        {/* Badges */}
        <div style={{ display:'flex', gap:'7px', alignItems:'center', marginBottom:'12px', flexWrap:'wrap' }}>
          <span style={{ fontSize:'9px', fontWeight:800, letterSpacing:'0.08em', padding:'3px 8px', borderRadius:'4px', background:`${c.border}33`, color:c.text, border:`1px solid ${c.border}66` }}>{c.label}</span>
          <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'20px', background:'rgba(0,204,102,0.1)', border:'1px solid rgba(0,204,102,0.3)', color:'#00cc66' }}>{entity.status || 'Active'}</span>
        </div>

        {/* Name */}
        <div style={{ fontSize:'18px', fontWeight:800, color:'#fff', marginBottom:'14px', lineHeight:1.2, fontFamily:"'Space Grotesk',sans-serif" }}>{entity.name}</div>

        {/* Type-specific rows */}
        <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'12px' }}>
          {isTrust && meta.trustee         && <DRow label="Trustee"    value={meta.trustee}           color={c.text} />}
          {isTrust && meta.successor_trustee && <DRow label="Successor" value={meta.successor_trustee} color={c.text} />}
          {isTrust && entity.state         && <DRow label="Situs"      value={entity.state} />}
          {isLLC   && meta.manager         && <DRow label="Manager"    value={meta.manager}   color={c.text} />}
          {isLLC   && meta.members         && <DRow label="Member"     value={meta.members}   color={c.text} />}
          {isLLC   && entity.state         && <DRow label="State"      value={entity.state} />}
          {isLP    && meta.gp              && <DRow label={`GP (${meta.gp_pct||''})`} value={meta.gp} color={c.text} />}
          {isLP    && meta.lp              && <DRow label={`LP (${meta.lp_pct||''})`} value={meta.lp} color={c.text} />}
          {isLP    && entity.state         && <DRow label="State"      value={entity.state} />}
          {entity.ein                      && <DRow label="EIN"        value={maskEIN(entity.ein) || ''} />}
          {ev && ev.value > 0              && <DRow label="Assets"     value={`${fmt(ev.value)} · ${ev.count} held`} />}
          {entity.est_date                 && <DRow label="Est."       value={fmtDateFull(entity.est_date) || ''} />}
        </div>

        {/* Annual report badge */}
        {ar && (
          <div style={{ marginTop:'auto', padding:'8px 12px', borderRadius:'8px', background: arDue ? 'rgba(255,170,0,0.08)' : 'rgba(0,204,102,0.08)', border:`1px solid ${arDue ? 'rgba(255,170,0,0.28)' : 'rgba(0,204,102,0.28)'}` }}>
            <span style={{ fontSize:'11px', fontWeight:600, color:'#6b7ab8' }}>Annual Report: </span>
            <span style={{ fontSize:'11px', fontWeight:700, color: arDue ? '#ffaa00' : '#00cc66' }}>{ar}</span>
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color:'#6b7ab8' }}>Loading...</div>

  // Entity type summary for header
  const typeSummary = [...new Set(entities.map((e: any) => e.type.split(' ')[0]))].slice(0,4).join(' · ')

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Page header */}
        <div style={{ height:'58px', flexShrink:0, background:'rgba(6,10,32,0.9)', borderBottom:'1px solid rgba(0,100,255,0.12)', display:'flex', alignItems:'center', padding:'0 28px', gap:'10px', backdropFilter:'blur(20px)' }}>
          <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'16px', fontWeight:700, color:'#fff' }}>Entity Tree</span>
          {typeSummary && <span style={{ fontSize:'12px', color:'#6b7ab8' }}>{typeSummary} · {entities.length} {entities.length === 1 ? 'entity' : 'entities'}</span>}
          <div style={{ flex:1 }} />
        </div>

        <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:'24px 28px' }}>
          <AIPageInsight page="entities" />

          {/* Section header */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'12px' }}>
            <div>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#6b7ab8', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:'4px' }}>Entity Structure</div>
              <div style={{ fontSize:'28px', fontWeight:800, color:'#fff', fontFamily:"'Space Grotesk',sans-serif", lineHeight:1 }}>Ownership Tree</div>
            </div>
            <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
              <button style={{ padding:'8px 16px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'8px', color:'#e8eaf6', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>Export PDF</button>
              <button onClick={() => setShowForm(!showForm)} style={{ padding:'8px 18px', background:'linear-gradient(135deg,#0055ff,#00aaff)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>+ Add Entity</button>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display:'flex', gap:'20px', flexWrap:'wrap', marginBottom:'20px' }}>
            {LEGEND.map(l => (
              <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'#6b7ab8' }}>
                <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:l.color, opacity:.85 }} />
                {l.label}
              </div>
            ))}
          </div>

          {/* Add form */}
          {showForm && (
            <div style={{ background:'rgba(8,14,40,0.9)', border:'1px solid rgba(0,100,255,0.25)', borderRadius:'16px', padding:'24px', marginBottom:'28px' }}>
              <h3 style={{ fontSize:'15px', fontWeight:700, color:'#fff', marginBottom:'18px' }}>Add Entity</h3>
              <form onSubmit={addEntity} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                <div>{lbl('Entity Name')}<input required value={form.name} onChange={e => sf({ name:e.target.value })} placeholder="e.g. Kahan Family Trust" style={inp} /></div>
                <div>{lbl('Type')}
                  <select value={form.type} onChange={e => sf({ type:e.target.value })} style={inp}>
                    {ENTITY_TYPES.map(t => <option key={t} style={{ background:'#060818' }}>{t}</option>)}
                  </select>
                </div>
                <div>{lbl('State of Formation')}
                  <select value={form.state} onChange={e => sf({ state:e.target.value })} style={inp}>
                    <option value="" style={{ background:'#060818' }}>— optional —</option>
                    {US_STATES.map(s => <option key={s} style={{ background:'#060818' }}>{s}</option>)}
                  </select>
                </div>
                <div>{lbl('EIN / Tax ID')}<input value={form.ein} onChange={e => sf({ ein:e.target.value })} placeholder="e.g. 82-1234567 (optional)" style={inp} /></div>
                <div>{lbl('Owned By (parent)')}
                  <select value={form.parent_name} onChange={e => sf({ parent_name:e.target.value })} style={inp}>
                    <option value="" style={{ background:'#060818' }}>— None (root) —</option>
                    {entities.map((e: any) => <option key={e.id} value={e.name} style={{ background:'#060818' }}>{e.name}</option>)}
                  </select>
                </div>
                <div>{lbl('Ownership Display')}<input value={form.ownership_display} onChange={e => sf({ ownership_display:e.target.value })} placeholder="e.g. Trust 99% · TK 1% (optional)" style={inp} /></div>
                <div>{lbl('Est. / Formation Date')}<input type="date" value={form.est_date} onChange={e => sf({ est_date:e.target.value })} style={{ ...inp, colorScheme:'dark' }} /></div>
                <div>{lbl('Status')}
                  <select value={form.status} onChange={e => sf({ status:e.target.value })} style={inp}>
                    {['Active','Inactive','Dissolved'].map(s => <option key={s} style={{ background:'#060818' }}>{s}</option>)}
                  </select>
                </div>

                {/* Trust fields */}
                {(form.type === 'Revocable Trust' || form.type === 'Irrevocable Trust') && (<>
                  <div>{lbl('Trustee')}<input value={form.trustee} onChange={e => sf({ trustee:e.target.value })} placeholder="e.g. Tyler Kahan" style={inp} /></div>
                  <div>{lbl('Successor Trustee')}<input value={form.successor_trustee} onChange={e => sf({ successor_trustee:e.target.value })} placeholder="e.g. Sarah Kahan" style={inp} /></div>
                </>)}

                {/* LLC fields */}
                {form.type === 'LLC' && (<>
                  <div>{lbl('Manager')}<input value={form.manager} onChange={e => sf({ manager:e.target.value })} placeholder="e.g. Tyler Kahan (1%)" style={inp} /></div>
                  <div>{lbl('Members')}<input value={form.members} onChange={e => sf({ members:e.target.value })} placeholder="e.g. Kahan Family Trust (99%)" style={inp} /></div>
                </>)}

                {/* LP fields */}
                {(form.type === 'LP' || form.type === 'Limited Partnership') && (<>
                  <div>{lbl('General Partner (GP)')}<input value={form.gp} onChange={e => sf({ gp:e.target.value })} placeholder="e.g. Kahan Holdings LLC (1%)" style={inp} /></div>
                  <div>{lbl('Limited Partner (LP)')}<input value={form.lp} onChange={e => sf({ lp:e.target.value })} placeholder="e.g. Kahan Family Trust (99%)" style={inp} /></div>
                </>)}

                <div style={{ gridColumn:'1/-1' }}>{lbl('Annual Report')}<input value={form.annual_report} onChange={e => sf({ annual_report:e.target.value })} placeholder="e.g. Filed Mar 2025 — or — Due Jun 2026" style={inp} /></div>

                <div style={{ gridColumn:'1/-1', display:'flex', gap:'10px', justifyContent:'flex-end' }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ padding:'9px 18px', background:'transparent', border:'1px solid rgba(0,100,255,0.2)', borderRadius:'8px', color:'#6b7ab8', cursor:'pointer', fontSize:'13px' }}>Cancel</button>
                  <button type="submit" disabled={saving} style={{ padding:'9px 22px', background:'linear-gradient(135deg,#0055ff,#00aaff)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>{saving ? 'Saving…' : 'Add Entity'}</button>
                </div>
              </form>
            </div>
          )}

          {/* ── TREE CONTAINER ─────────────────────────────────────────── */}
          <div style={{ background:'rgba(5,9,28,0.95)', border:'1px solid rgba(0,100,255,0.14)', borderRadius:'20px', padding:'48px 40px 56px', marginBottom:'32px', overflowX:'auto', minHeight:'200px' }}>
            {entities.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 40px', color:'#6b7ab8' }}>
                <div style={{ fontSize:'36px', marginBottom:'12px' }}>🌳</div>
                <div style={{ fontSize:'16px', fontWeight:600, color:'#fff', marginBottom:'6px' }}>No entities yet</div>
                <div style={{ fontSize:'13px', maxWidth:'360px', margin:'0 auto', lineHeight:'1.7' }}>Add your trusts, LLCs, and partnerships to visualize your estate structure with live asset values.</div>
                <button onClick={() => setShowForm(true)} style={{ marginTop:'18px', padding:'9px 22px', background:'linear-gradient(135deg,#0055ff,#00aaff)', border:'none', borderRadius:'9px', color:'#fff', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>+ Add Your First Entity</button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:'fit-content', margin:'0 auto' }}>
                {/* Grantor node */}
                <div style={{ width:'260px', background:GRANTOR_C.bg, border:`1px solid ${GRANTOR_C.border}`, borderRadius:'14px', padding:'18px 20px', boxShadow:GRANTOR_C.glow, textAlign:'center' }}>
                  <div style={{ marginBottom:'10px' }}>
                    <span style={{ fontSize:'9px', fontWeight:800, letterSpacing:'0.1em', padding:'3px 10px', borderRadius:'4px', background:'rgba(0,170,255,0.15)', color:'#00aaff', border:'1px solid rgba(0,170,255,0.45)' }}>GRANTOR</span>
                  </div>
                  <div style={{ fontSize:'20px', fontWeight:800, color:'#fff', marginBottom:'4px', fontFamily:"'Space Grotesk',sans-serif" }}>{profile?.full_name || user?.email?.split('@')[0] || 'You'}</div>
                  <div style={{ fontSize:'12px', color:'#6b7ab8' }}>Individual{profile?.state ? ` · ${profile.state}` : ''}</div>
                </div>

                {/* Line from grantor down to roots */}
                <div className="tree-line-down" />

                {/* Root entities */}
                <div className="tree-children">
                  {roots.map((entity: any, i: number) => {
                    const isFirst = i === 0, isLast = i === roots.length-1, isOnly = roots.length === 1
                    const cls = ['tree-child-wrap', isFirst?'first':'', isLast?'last':'', isOnly?'only':''].join(' ').trim()
                    return (
                      <div key={entity.id} className={cls}>
                        <div className="tree-drop">
                          {entity.ownership_display && (
                            <span className="tree-pct">{entity.ownership_display.split('·')[0].trim()}</span>
                          )}
                        </div>
                        <TreeNode entity={entity} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── ENTITY DETAILS ─────────────────────────────────────────── */}
          {entities.length > 0 && (
            <>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#6b7ab8', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:'16px' }}>Entity Details</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'16px', paddingBottom:'40px' }}>
                {entities.map((e: any) => <DetailCard key={e.id} entity={e} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
