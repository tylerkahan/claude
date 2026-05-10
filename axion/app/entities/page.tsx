'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AIPageInsight from '@/components/AIPageInsight'

// ── Constants ─────────────────────────────────────────────────────────────────
const ENTITY_TYPES = ['Revocable Trust','Irrevocable Trust','LLC','LP','Limited Partnership','Corporation','Asset / Account']
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

const TC: Record<string, { bg:string; border:string; text:string; glow:string; label:string }> = {
  'Revocable Trust':    { bg:'rgba(102,68,255,0.09)',  border:'rgba(102,68,255,0.55)', text:'#aa88ff', glow:'0 0 28px rgba(102,68,255,0.14)', label:'REVOCABLE TRUST'    },
  'Irrevocable Trust':  { bg:'rgba(102,68,255,0.09)',  border:'rgba(102,68,255,0.55)', text:'#aa88ff', glow:'0 0 28px rgba(102,68,255,0.14)', label:'IRREVOCABLE TRUST'  },
  'LLC':                { bg:'rgba(0,204,102,0.07)',   border:'rgba(0,204,102,0.5)',   text:'#00cc66', glow:'0 0 28px rgba(0,204,102,0.1)',   label:'LLC'                },
  'LP':                 { bg:'rgba(255,160,0,0.07)',   border:'rgba(255,160,0,0.5)',   text:'#ffaa00', glow:'0 0 28px rgba(255,160,0,0.1)',    label:'LP'                 },
  'Limited Partnership':{ bg:'rgba(255,160,0,0.07)',   border:'rgba(255,160,0,0.5)',   text:'#ffaa00', glow:'0 0 28px rgba(255,160,0,0.1)',    label:'LIMITED PARTNERSHIP'},
  'Corporation':        { bg:'rgba(255,102,136,0.07)', border:'rgba(255,102,136,0.45)',text:'#ff6688', glow:'0 0 28px rgba(255,102,136,0.1)',  label:'CORPORATION'        },
  'Asset / Account':    { bg:'rgba(255,255,255,0.03)', border:'rgba(255,255,255,0.13)',text:'#6b7ab8', glow:'none',                           label:'ASSET'              },
}
const FALLBACK_C = { bg:'rgba(255,255,255,0.03)', border:'rgba(255,255,255,0.13)', text:'#6b7ab8', glow:'none', label:'ENTITY' }
const GRANTOR_C  = { bg:'rgba(0,170,255,0.1)', border:'rgba(0,170,255,0.55)', text:'#00aaff', glow:'0 0 32px rgba(0,170,255,0.18)' }

const ASSET_TC: Record<string,{text:string;label:string}> = {
  'Real Estate':        { text:'#00aaff', label:'REAL ESTATE'  },
  'Investment Account': { text:'#00cc66', label:'BROKERAGE'    },
  'Private Equity':     { text:'#ffaa00', label:'PE FUND'      },
  'Bank Account':       { text:'#6b7ab8', label:'BANK'         },
  'Crypto':             { text:'#ff6688', label:'CRYPTO'       },
  'Business':           { text:'#aa88ff', label:'BUSINESS'     },
  'Life Insurance':     { text:'#00d4ff', label:'INSURANCE'    },
  'Other':              { text:'#6b7ab8', label:'OTHER'        },
}

const LEGEND = [
  { label:'Grantor / Individual', color:'#00aaff' },
  { label:'Trust',  color:'#aa88ff' },
  { label:'LLC',    color:'#00cc66' },
  { label:'LP',     color:'#ffaa00' },
  { label:'Asset / Account', color:'#6b7ab8' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${Math.round(n/1e3)}K` : `$${Math.round(n).toLocaleString()}`
const maskEIN = (ein: string|null) => { if (!ein) return null; const p = ein.split('-'); return p.length===2 && p[1].length>=4 ? `${p[0]}-••••${p[1].slice(-4)}` : ein }
const fmtShort = (d: string|null) => d ? new Date(d).toLocaleDateString('en-US',{month:'short',year:'numeric'}) : null
const fmtFull  = (d: string|null) => d ? new Date(d).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : null

const inp: React.CSSProperties = { width:'100%', padding:'10px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(0,100,255,0.18)', borderRadius:'8px', color:'#e8eaf6', fontSize:'14px', outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box' }
const lbl = (t: string) => <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#6b7ab8', marginBottom:'6px', textTransform:'uppercase' as const, letterSpacing:'.06em' }}>{t}</label>

// ── Sub-components (defined OUTSIDE main component to avoid React remount issues) ──

function DRow({ label, value, color }: { label:string; value:string; color?:string }) {
  return (
    <div style={{ fontSize:'12px', display:'flex', gap:'6px', lineHeight:1.5 }}>
      <span style={{ color:'#6b7ab8', flexShrink:0 }}>{label}:</span>
      <span style={{ color:color||'#e8eaf6', fontWeight:color?600:400 }}>{value}</span>
    </div>
  )
}

function AssetLeaf({ asset }: { asset: any }) {
  const cat = ASSET_TC[asset.category] || { text:'#6b7ab8', label:(asset.category||'ASSET').toUpperCase() }
  const equity = (asset.value||0) - (asset.mortgage||0)
  return (
    <div style={{ width:'130px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'10px 12px', flexShrink:0, textAlign:'center' }}>
      <div style={{ marginBottom:'5px' }}>
        <span style={{ fontSize:'8px', fontWeight:800, letterSpacing:'0.07em', padding:'2px 6px', borderRadius:'3px', background:`${cat.text}18`, color:cat.text, border:`1px solid ${cat.text}44` }}>{cat.label}</span>
      </div>
      <div style={{ fontSize:'11px', fontWeight:700, color:'#e8eaf6', lineHeight:1.3, marginBottom:'3px' }}>{asset.name}</div>
      <div style={{ fontSize:'12px', fontWeight:800, color:'#fff', fontFamily:"'Space Grotesk',sans-serif" }}>{fmt(equity)}</div>
    </div>
  )
}

function TreeCard({ entity, entityValueMap }: { entity:any; entityValueMap:Record<string,{value:number;count:number}> }) {
  const c = TC[entity.type] || FALLBACK_C
  const ev = entityValueMap[entity.name]
  const meta = entity.metadata || {}
  return (
    <div style={{ width:'168px', background:c.bg, border:`1px solid ${c.border}`, borderRadius:'10px', padding:'11px 13px', boxShadow:c.glow, flexShrink:0, textAlign:'center' }}>
      <div style={{ marginBottom:'6px' }}>
        <span style={{ fontSize:'8px', fontWeight:800, letterSpacing:'0.08em', padding:'2px 7px', borderRadius:'3px', background:`${c.border}44`, color:c.text, border:`1px solid ${c.border}88` }}>{c.label}</span>
      </div>
      <div style={{ fontSize:'12px', fontWeight:700, color:'#fff', lineHeight:1.3, marginBottom:meta.ownership_display?'5px':'3px' }}>{entity.name}</div>
      {meta.ownership_display && (
        <div style={{ fontSize:'11px', fontWeight:700, color:c.text, marginBottom:'4px' }}>{meta.ownership_display}</div>
      )}
      <div style={{ fontSize:'10px', color:'#6b7ab8' }}>
        {[fmtShort(entity.est_date), entity.state, entity.ein ? `EIN ${maskEIN(entity.ein)}` : null].filter(Boolean).join(' · ')}
      </div>
      {ev && ev.value > 0 && (
        <div style={{ marginTop:'6px', fontSize:'12px', fontWeight:800, color:'#fff', fontFamily:"'Space Grotesk',sans-serif" }}>{fmt(ev.value)}</div>
      )}
    </div>
  )
}

type TreeNodeProps = {
  entity: any
  entities: any[]
  entityValueMap: Record<string,{value:number;count:number}>
  topAssetsPerEntity: Record<string,any[]>
}
function TreeNode({ entity, entities, entityValueMap, topAssetsPerEntity }: TreeNodeProps) {
  const children   = entities.filter((e: any) => e.parent_name === entity.name)
  const leafAssets = topAssetsPerEntity[entity.name] || []
  const allLeaves  = [
    ...children.map((c: any)  => ({ kind:'entity' as const, data:c })),
    ...leafAssets.map((a: any) => ({ kind:'asset'  as const, data:a })),
  ]
  return (
    <div className="tree-node">
      <TreeCard entity={entity} entityValueMap={entityValueMap} />
      {allLeaves.length > 0 && (
        <>
          <div className="tree-line-down" />
          <div className="tree-children">
            {allLeaves.map((item, i) => {
              const isFirst = i === 0, isLast = i === allLeaves.length-1, isOnly = allLeaves.length === 1
              const cls = ['tree-child-wrap', isFirst?'first':'', isLast?'last':'', isOnly?'only':''].join(' ').trim()
              return (
                <div key={item.kind==='entity' ? item.data.id : item.data.id+'_a'} className={cls}>
                  <div className="tree-drop">
                    {item.kind==='entity' && item.data.metadata?.ownership_display && (
                      <span className="tree-pct">{item.data.metadata.ownership_display.split('·')[0].trim()}</span>
                    )}
                  </div>
                  {item.kind==='entity'
                    ? <TreeNode entity={item.data} entities={entities} entityValueMap={entityValueMap} topAssetsPerEntity={topAssetsPerEntity} />
                    : <AssetLeaf asset={item.data} />}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function DetailCard({ entity, entityValueMap, onDelete }: { entity:any; entityValueMap:Record<string,{value:number;count:number}>; onDelete:(id:string)=>void }) {
  const c    = TC[entity.type] || FALLBACK_C
  const ev   = entityValueMap[entity.name]
  const meta = entity.metadata || {}
  const isTrust = entity.type==='Revocable Trust' || entity.type==='Irrevocable Trust'
  const isLLC   = entity.type==='LLC'
  const isLP    = entity.type==='LP' || entity.type==='Limited Partnership'
  const ar    = meta.annual_report || ''
  const arDue = ar.toLowerCase().startsWith('due')
  return (
    <div style={{ background:'rgba(8,14,40,0.85)', border:`1px solid ${c.border}44`, borderRadius:'16px', padding:'20px', position:'relative', display:'flex', flexDirection:'column', gap:'0' }}>
      <button onClick={() => onDelete(entity.id)} style={{ position:'absolute', top:'12px', right:'12px', padding:'3px 7px', background:'transparent', border:'1px solid rgba(255,60,60,0.2)', borderRadius:'4px', color:'#ff6666', cursor:'pointer', fontSize:'10px' }}>✕</button>
      <div style={{ display:'flex', gap:'7px', alignItems:'center', marginBottom:'12px', flexWrap:'wrap' }}>
        <span style={{ fontSize:'9px', fontWeight:800, letterSpacing:'0.08em', padding:'3px 8px', borderRadius:'4px', background:`${c.border}33`, color:c.text, border:`1px solid ${c.border}66` }}>{c.label}</span>
        <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'20px', background:'rgba(0,204,102,0.1)', border:'1px solid rgba(0,204,102,0.3)', color:'#00cc66' }}>{entity.status||'Active'}</span>
      </div>
      <div style={{ fontSize:'18px', fontWeight:800, color:'#fff', marginBottom:'14px', lineHeight:1.2, fontFamily:"'Space Grotesk',sans-serif" }}>{entity.name}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'12px' }}>
        {isTrust && meta.trustee           && <DRow label="Trustee"   value={meta.trustee}           color={c.text} />}
        {isTrust && meta.successor_trustee && <DRow label="Successor" value={meta.successor_trustee} color={c.text} />}
        {isTrust && entity.state          && <DRow label="Situs"     value={entity.state} />}
        {isLLC   && meta.manager          && <DRow label="Manager"   value={meta.manager}   color={c.text} />}
        {isLLC   && meta.members          && <DRow label="Member"    value={meta.members}   color={c.text} />}
        {isLLC   && entity.state          && <DRow label="State"     value={entity.state} />}
        {isLP    && meta.gp               && <DRow label="GP"        value={meta.gp}        color={c.text} />}
        {isLP    && meta.lp               && <DRow label="LP"        value={meta.lp}        color={c.text} />}
        {isLP    && entity.state          && <DRow label="State"     value={entity.state} />}
        {entity.ein                        && <DRow label="EIN"      value={maskEIN(entity.ein)||''} />}
        {ev && ev.value > 0               && <DRow label="Assets"   value={`${fmt(ev.value)} · ${ev.count} held`} />}
        {entity.est_date                   && <DRow label="Est."     value={fmtFull(entity.est_date)||''} />}
      </div>
      {ar && (
        <div style={{ marginTop:'auto', padding:'8px 12px', borderRadius:'8px', background:arDue?'rgba(255,170,0,0.08)':'rgba(0,204,102,0.08)', border:`1px solid ${arDue?'rgba(255,170,0,0.28)':'rgba(0,204,102,0.28)'}` }}>
          <span style={{ fontSize:'11px', fontWeight:600, color:'#6b7ab8' }}>Annual Report: </span>
          <span style={{ fontSize:'11px', fontWeight:700, color:arDue?'#ffaa00':'#00cc66' }}>{ar}</span>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EntitiesPage() {
  const [user, setUser]             = useState<any>(null)
  const [profile, setProfile]       = useState<any>(null)
  const [entities, setEntities]     = useState<any[]>([])
  const [assets, setAssets]         = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [balances, setBalances]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [form, setForm] = useState({
    name:'', type:'LLC', state:'', ein:'', status:'Active',
    est_date:'', ownership_display:'', parent_name:'',
    trustee:'', successor_trustee:'', manager:'', members:'',
    gp:'', lp:'', annual_report:'',
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
    const map: Record<string,{value:number;count:number}> = {}
    assets.forEach((a: any) => {
      const en = a.metadata?.entity_name
      if (en) { if (!map[en]) map[en]={value:0,count:0}; map[en].value+=(a.value||0)-(a.mortgage||0); map[en].count++ }
    })
    balances.forEach((b: any) => {
      const conn = connections.find((c: any) => c.id === b.connected_account_id)
      const en = conn?.entity_name
      if (en) { if (!map[en]) map[en]={value:0,count:0}; map[en].value+=(b.current_balance||0); map[en].count++ }
    })
    return map
  }, [assets, balances, connections])

  const topAssetsPerEntity = useMemo(() => {
    const map: Record<string,any[]> = {}
    assets.forEach((a: any) => {
      const en = a.metadata?.entity_name
      if (en) { if (!map[en]) map[en]=[]; map[en].push(a) }
    })
    Object.keys(map).forEach(k => { map[k] = map[k].sort((a,b)=>(b.value||0)-(a.value||0)).slice(0,2) })
    return map
  }, [assets])

  async function fetchEntities(userId: string) {
    const { data } = await createClient().from('entities').select('*').eq('user_id', userId).order('created_at')
    setEntities(data ?? [])
  }

  async function addEntity(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const meta: any = {}
    if (form.ownership_display)  meta.ownership_display  = form.ownership_display
    if (form.trustee)            meta.trustee            = form.trustee
    if (form.successor_trustee)  meta.successor_trustee  = form.successor_trustee
    if (form.manager)            meta.manager            = form.manager
    if (form.members)            meta.members            = form.members
    if (form.gp)                 meta.gp                 = form.gp
    if (form.lp)                 meta.lp                 = form.lp
    if (form.annual_report)      meta.annual_report      = form.annual_report
    await createClient().from('entities').insert({
      user_id: user.id, name: form.name, type: form.type,
      state: form.state||null, ein: form.ein||null,
      status: form.status, est_date: form.est_date||null,
      parent_name: form.parent_name||null,
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

  function exportPDF() {
    const ownerName = profile?.full_name || user?.email?.split('@')[0] || 'Owner'
    const today = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
    const totalValue = Object.values(entityValueMap).reduce((s,v)=>s+v.value,0)

    const typeColors: Record<string,string> = {
      'Revocable Trust':'#00aaff','Irrevocable Trust':'#7b61ff',
      'LLC':'#00cc66','LP':'#ffaa00','S-Corp':'#ff6688','C-Corp':'#ff6688','Other':'#6b7ab8'
    }
    const getColor = (type: string) => {
      for (const [k,v] of Object.entries(typeColors)) if (type.includes(k.split(' ')[0])) return v
      return '#6b7ab8'
    }

    const buildTreeHTML = (ents: any[], parentName: string|null, depth: number): string => {
      const children = ents.filter((e: any) =>
        parentName === null
          ? (!e.parent_name || !ents.find((p:any) => p.name === e.parent_name))
          : e.parent_name === parentName
      )
      if (!children.length) return ''
      return children.map((e: any) => {
        const color = getColor(e.type)
        const val = entityValueMap[e.name]
        const pct = e.metadata?.ownership_display || e.ownership_pct ? `${e.metadata?.ownership_display || e.ownership_pct}%` : ''
        return `
          <tr>
            <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;">
              <div style="padding-left:${depth*24}px;display:flex;align-items:center;gap:8px;">
                ${depth > 0 ? `<span style="color:#bbb;font-size:12px;">└─</span>` : ''}
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></span>
                <strong style="font-size:14px;color:#111;">${e.name}</strong>
                ${pct ? `<span style="font-size:11px;color:#0055ff;font-weight:700;background:#e8f0ff;padding:1px 6px;border-radius:10px;">${pct}</span>` : ''}
              </div>
            </td>
            <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;font-size:12px;color:#555;">${e.type}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;font-size:12px;color:#555;">${e.state||'—'}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;font-size:12px;color:#555;">${e.ein ? `EIN: ${e.ein}` : '—'}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;font-size:13px;font-weight:700;color:#111;text-align:right;">${val ? '$'+Math.round(val.value).toLocaleString() : '—'}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;text-align:center;">
              <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:${e.status==='Active'?'#e6f9f0':'#fff3e0'};color:${e.status==='Active'?'#00aa55':'#cc7700'};">${e.status||'Active'}</span>
            </td>
          </tr>
          ${buildTreeHTML(ents, e.name, depth+1)}
        `
      }).join('')
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Entity Structure — ${ownerName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; background: #fff; padding: 40px 48px; }
    @media print {
      body { padding: 20px 32px; }
      .no-print { display: none; }
      @page { margin: 0.5in; }
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 2px solid #0055ff; }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-box { width: 36px; height: 36px; background: #0055ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 18px; }
    .logo-text { font-size: 22px; font-weight: 800; color: #0055ff; letter-spacing: -0.5px; }
    .header-right { text-align: right; font-size: 12px; color: #666; line-height: 1.8; }
    .title { font-size: 26px; font-weight: 800; color: #0a0a1a; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: #666; margin-bottom: 32px; }
    .summary-row { display: flex; gap: 16px; margin-bottom: 32px; }
    .stat-box { flex: 1; border: 1px solid #e0e4ef; border-radius: 10px; padding: 16px 20px; }
    .stat-label { font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px; }
    .stat-value { font-size: 22px; font-weight: 800; color: #0055ff; }
    .section-title { font-size: 13px; font-weight: 700; color: #0055ff; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    thead th { background: #f4f6ff; padding: 10px 14px; font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: .07em; text-align: left; border-bottom: 2px solid #dce1f0; }
    thead th:last-child { text-align: right; }
    tbody tr:hover { background: #fafbff; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e0e4ef; display: flex; justify-content: space-between; font-size: 11px; color: #aaa; }
    .print-btn { position: fixed; top: 24px; right: 24px; padding: 10px 22px; background: #0055ff; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; }
  </style>
</head>
<body>
  <button class="no-print print-btn" onclick="window.print()">⬇ Save as PDF</button>
  <div class="header">
    <div class="logo">
      <div class="logo-box">A</div>
      <span class="logo-text">AXION</span>
    </div>
    <div class="header-right">
      <div><strong>Entity Structure Report</strong></div>
      <div>${ownerName}</div>
      <div>Generated ${today}</div>
      <div style="color:#0055ff;font-weight:600;">CONFIDENTIAL</div>
    </div>
  </div>

  <div class="title">Ownership Tree</div>
  <div class="subtitle">${entities.length} entit${entities.length===1?'y':'ies'} · ${[...new Set(entities.map((e:any)=>e.type))].join(' · ')}</div>

  <div class="summary-row">
    <div class="stat-box">
      <div class="stat-label">Total Entities</div>
      <div class="stat-value">${entities.length}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Total Entity Value</div>
      <div class="stat-value">$${Math.round(totalValue).toLocaleString()}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Grantor</div>
      <div class="stat-value" style="font-size:16px;">${ownerName}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Active Entities</div>
      <div class="stat-value">${entities.filter((e:any)=>e.status!=='Inactive').length}</div>
    </div>
  </div>

  <div class="section-title">Entity Details</div>
  <table>
    <thead>
      <tr>
        <th>Entity Name</th>
        <th>Type</th>
        <th>State</th>
        <th>EIN</th>
        <th style="text-align:right">Holdings</th>
        <th style="text-align:center">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#00d4ff;flex-shrink:0;"></span>
            <strong style="font-size:14px;color:#111;">${ownerName}</strong>
            <span style="font-size:11px;color:#0055ff;font-weight:700;background:#e8f0ff;padding:1px 6px;border-radius:10px;">GRANTOR</span>
          </div>
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;font-size:12px;color:#555;">Individual</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;font-size:12px;color:#555;">${profile?.state || profile?.city || '—'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;font-size:12px;color:#555;">—</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;font-size:13px;font-weight:700;color:#111;text-align:right;">—</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;text-align:center;">—</td>
      </tr>
      ${buildTreeHTML(entities, null, 1)}
    </tbody>
  </table>

  ${entities.some((e:any)=>e.metadata?.trustee||e.metadata?.manager||e.ein) ? `
  <div class="section-title">Additional Details</div>
  <table>
    <thead>
      <tr><th>Entity</th><th>Established</th><th>Key Role</th><th>Annual Report</th><th>Notes</th></tr>
    </thead>
    <tbody>
      ${entities.map((e:any) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;font-weight:600;font-size:13px;">${e.name}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;font-size:12px;color:#555;">${e.est_date ? new Date(e.est_date).getFullYear() : '—'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;font-size:12px;color:#555;">${e.metadata?.trustee||e.metadata?.manager||e.metadata?.gp||'—'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;font-size:12px;color:#555;">${e.metadata?.annual_report||'—'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;font-size:12px;color:#555;">${e.metadata?.members||e.metadata?.lp||e.metadata?.successor_trustee||''}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  <div class="footer">
    <span>Generated by Axion Estate Platform · axion-app-nine.vercel.app</span>
    <span>This report is confidential and intended for the named individual only.</span>
  </div>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
  }

  const roots = entities.filter((e: any) => !e.parent_name || !entities.find((p: any) => p.name === e.parent_name))
  const typeSummary = [...new Set(entities.map((e: any) => e.type.split(' ')[0]))].slice(0,4).join(' · ')

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color:'#6b7ab8' }}>Loading...</div>

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#03040d' }}>
      <Sidebar email={user?.email} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ height:'58px', flexShrink:0, background:'rgba(6,10,32,0.9)', borderBottom:'1px solid rgba(0,100,255,0.12)', display:'flex', alignItems:'center', padding:'0 28px', gap:'10px', backdropFilter:'blur(20px)' }}>
          <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'16px', fontWeight:700, color:'#fff' }}>Entity Tree</span>
          {typeSummary && <span style={{ fontSize:'12px', color:'#6b7ab8' }}>{typeSummary} · {entities.length} {entities.length===1?'entity':'entities'}</span>}
          <div style={{ flex:1 }} />
        </div>

        <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:'24px 28px' }}>
          <AIPageInsight page="entities" />

          {/* Section title row */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'12px' }}>
            <div>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#6b7ab8', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:'4px' }}>Entity Structure</div>
              <div style={{ fontSize:'28px', fontWeight:800, color:'#fff', fontFamily:"'Space Grotesk',sans-serif", lineHeight:1 }}>Ownership Tree</div>
            </div>
            <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
              <button onClick={exportPDF} style={{ padding:'8px 16px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'8px', color:'#e8eaf6', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>Export PDF</button>
              <button onClick={() => setShowForm(!showForm)} style={{ padding:'8px 18px', background:'linear-gradient(135deg,#0055ff,#00aaff)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>+ Add Entity</button>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display:'flex', gap:'20px', flexWrap:'wrap', marginBottom:'20px' }}>
            {LEGEND.map(l => (
              <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'#6b7ab8' }}>
                <div style={{ width:'9px', height:'9px', borderRadius:'50%', background:l.color }} />{l.label}
              </div>
            ))}
          </div>

          {/* Add form */}
          {showForm && (
            <div style={{ background:'rgba(8,14,40,0.9)', border:'1px solid rgba(0,100,255,0.25)', borderRadius:'16px', padding:'24px', marginBottom:'28px' }}>
              <h3 style={{ fontSize:'15px', fontWeight:700, color:'#fff', marginBottom:'18px' }}>Add Entity</h3>
              <form onSubmit={addEntity} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                <div>{lbl('Entity Name')}<input required value={form.name} onChange={e=>sf({name:e.target.value})} placeholder="e.g. Kahan Family Trust" style={inp} /></div>
                <div>{lbl('Type')}<select value={form.type} onChange={e=>sf({type:e.target.value})} style={inp}>{ENTITY_TYPES.map(t=><option key={t} style={{background:'#060818'}}>{t}</option>)}</select></div>
                <div>{lbl('State of Formation')}<select value={form.state} onChange={e=>sf({state:e.target.value})} style={inp}><option value="" style={{background:'#060818'}}>— optional —</option>{US_STATES.map(s=><option key={s} style={{background:'#060818'}}>{s}</option>)}</select></div>
                <div>{lbl('EIN / Tax ID')}<input value={form.ein} onChange={e=>sf({ein:e.target.value})} placeholder="e.g. 82-1234567" style={inp} /></div>
                <div>{lbl('Owned By (parent)')}<select value={form.parent_name} onChange={e=>sf({parent_name:e.target.value})} style={inp}><option value="" style={{background:'#060818'}}>— None (root) —</option>{entities.map((e:any)=><option key={e.id} value={e.name} style={{background:'#060818'}}>{e.name}</option>)}</select></div>
                <div>{lbl('Ownership Display')}<input value={form.ownership_display} onChange={e=>sf({ownership_display:e.target.value})} placeholder="e.g. Trust 99% · TK 1%" style={inp} /></div>
                <div>{lbl('Est. / Formation Date')}<input type="date" value={form.est_date} onChange={e=>sf({est_date:e.target.value})} style={{...inp,colorScheme:'dark'}} /></div>
                <div>{lbl('Status')}<select value={form.status} onChange={e=>sf({status:e.target.value})} style={inp}>{['Active','Inactive','Dissolved'].map(s=><option key={s} style={{background:'#060818'}}>{s}</option>)}</select></div>
                {(form.type==='Revocable Trust'||form.type==='Irrevocable Trust')&&<><div>{lbl('Trustee')}<input value={form.trustee} onChange={e=>sf({trustee:e.target.value})} placeholder="e.g. Tyler Kahan" style={inp} /></div><div>{lbl('Successor Trustee')}<input value={form.successor_trustee} onChange={e=>sf({successor_trustee:e.target.value})} placeholder="e.g. Sarah Kahan" style={inp} /></div></>}
                {form.type==='LLC'&&<><div>{lbl('Manager')}<input value={form.manager} onChange={e=>sf({manager:e.target.value})} placeholder="e.g. Tyler Kahan (1%)" style={inp} /></div><div>{lbl('Members')}<input value={form.members} onChange={e=>sf({members:e.target.value})} placeholder="e.g. Kahan Family Trust (99%)" style={inp} /></div></>}
                {(form.type==='LP'||form.type==='Limited Partnership')&&<><div>{lbl('General Partner (GP)')}<input value={form.gp} onChange={e=>sf({gp:e.target.value})} placeholder="e.g. Kahan Holdings LLC (1%)" style={inp} /></div><div>{lbl('Limited Partner (LP)')}<input value={form.lp} onChange={e=>sf({lp:e.target.value})} placeholder="e.g. Kahan Family Trust (99%)" style={inp} /></div></>}
                <div style={{gridColumn:'1/-1'}}>{lbl('Annual Report')}<input value={form.annual_report} onChange={e=>sf({annual_report:e.target.value})} placeholder="e.g. Filed Mar 2025  —or—  Due Jun 2026" style={inp} /></div>
                <div style={{gridColumn:'1/-1',display:'flex',gap:'10px',justifyContent:'flex-end'}}>
                  <button type="button" onClick={()=>setShowForm(false)} style={{padding:'9px 18px',background:'transparent',border:'1px solid rgba(0,100,255,0.2)',borderRadius:'8px',color:'#6b7ab8',cursor:'pointer',fontSize:'13px'}}>Cancel</button>
                  <button type="submit" disabled={saving} style={{padding:'9px 22px',background:'linear-gradient(135deg,#0055ff,#00aaff)',border:'none',borderRadius:'8px',color:'#fff',fontSize:'13px',fontWeight:700,cursor:'pointer'}}>{saving?'Saving…':'Add Entity'}</button>
                </div>
              </form>
            </div>
          )}

          {/* ── Tree container ── */}
          <div style={{ background:'rgba(5,9,28,0.95)', border:'1px solid rgba(0,100,255,0.14)', borderRadius:'20px', padding:'32px 24px 40px', marginBottom:'32px', overflowX:'auto' }}>
            {entities.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 40px', color:'#6b7ab8' }}>
                <div style={{ fontSize:'36px', marginBottom:'12px' }}>🌳</div>
                <div style={{ fontSize:'16px', fontWeight:600, color:'#fff', marginBottom:'6px' }}>No entities yet</div>
                <div style={{ fontSize:'13px', maxWidth:'360px', margin:'0 auto', lineHeight:'1.7' }}>Add your trusts, LLCs, and partnerships to visualize your estate structure with live asset values.</div>
                <button onClick={()=>setShowForm(true)} style={{ marginTop:'18px', padding:'9px 22px', background:'linear-gradient(135deg,#0055ff,#00aaff)', border:'none', borderRadius:'9px', color:'#fff', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>+ Add Your First Entity</button>
              </div>
            ) : (
              /* zoom wrapper — scales whole tree down to fit on screen */
              <div style={{ zoom: 0.9, display:'flex', flexDirection:'column', alignItems:'center' }}>
                {/* Grantor node */}
                <div style={{ width:'220px', background:GRANTOR_C.bg, border:`1px solid ${GRANTOR_C.border}`, borderRadius:'12px', padding:'14px 18px', boxShadow:GRANTOR_C.glow, textAlign:'center' }}>
                  <div style={{ marginBottom:'8px' }}>
                    <span style={{ fontSize:'9px', fontWeight:800, letterSpacing:'0.1em', padding:'2px 9px', borderRadius:'4px', background:'rgba(0,170,255,0.15)', color:'#00aaff', border:'1px solid rgba(0,170,255,0.45)' }}>GRANTOR</span>
                  </div>
                  <div style={{ fontSize:'17px', fontWeight:800, color:'#fff', marginBottom:'3px', fontFamily:"'Space Grotesk',sans-serif" }}>{profile?.full_name || user?.email?.split('@')[0] || 'You'}</div>
                  <div style={{ fontSize:'12px', color:'#6b7ab8' }}>Individual{profile?.state ? ` · ${profile.state}` : ''}</div>
                </div>

                <div className="tree-line-down" />

                <div className="tree-children">
                  {roots.map((entity: any, i: number) => {
                    const isFirst=i===0, isLast=i===roots.length-1, isOnly=roots.length===1
                    const cls=['tree-child-wrap',isFirst?'first':'',isLast?'last':'',isOnly?'only':''].join(' ').trim()
                    return (
                      <div key={entity.id} className={cls}>
                        <div className="tree-drop">
                          {entity.metadata?.ownership_display && (
                            <span className="tree-pct">{entity.metadata.ownership_display.split('·')[0].trim()}</span>
                          )}
                        </div>
                        <TreeNode entity={entity} entities={entities} entityValueMap={entityValueMap} topAssetsPerEntity={topAssetsPerEntity} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Detail cards ── */}
          {entities.length > 0 && (
            <>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#6b7ab8', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:'16px' }}>Entity Details</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'16px', paddingBottom:'40px' }}>
                {entities.map((e: any) => <DetailCard key={e.id} entity={e} entityValueMap={entityValueMap} onDelete={deleteEntity} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
