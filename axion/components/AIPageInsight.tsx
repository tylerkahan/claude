'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Rec = {
  id: string
  severity: 'critical' | 'high' | 'medium'
  title: string
  description: string
  actionPath: string
}

// Which recommendation IDs are relevant to each page
const PAGE_REC_MAP: Record<string, string[]> = {
  vault:        ['no_documents', 'no_will', 'no_trust'],
  beneficiaries:['no_beneficiaries', 'accounts_no_bens'],
  family:       ['no_family', 'spouse_not_added', 'no_guardian'],
  compliance:   ['no_will', 'no_poa', 'no_healthcare', 'no_trust', 'no_guardian'],
  digital:      ['no_documents'],
  entities:     ['federal_estate_tax', 'state_estate_tax', 'no_trust'],
  attorney:     ['no_will', 'no_trust', 'no_poa', 'no_healthcare', 'federal_estate_tax', 'state_estate_tax'],
  integrations: ['accounts_no_bens', 'no_beneficiaries'],
  networth:     ['federal_estate_tax', 'state_estate_tax', 'no_trust'],
  tax:          ['federal_estate_tax', 'state_estate_tax'],
  simulator:    ['federal_estate_tax', 'state_estate_tax', 'no_trust'],
}

const SEVERITY_COLOR = {
  critical: { bg: 'rgba(255,102,136,0.07)', border: 'rgba(255,102,136,0.22)', dot: '#ff6688', label: 'Critical' },
  high:     { bg: 'rgba(255,170,0,0.07)',   border: 'rgba(255,170,0,0.22)',   dot: '#ffaa00', label: 'High Priority' },
  medium:   { bg: 'rgba(0,170,255,0.07)',   border: 'rgba(0,170,255,0.22)',   dot: '#00aaff', label: 'Note' },
}

// Build a pre-filled AI question for each page
const PAGE_AI_QUESTION: Record<string, string> = {
  vault:        'What documents should I have in my estate plan and in what order should I get them?',
  beneficiaries:'Who should I name as my beneficiaries and how should I split my estate?',
  family:       'How do I make sure my family is protected in my estate plan?',
  compliance:   'What are the most critical gaps in my estate plan right now?',
  digital:      'How should I handle my digital assets and online accounts in my estate plan?',
  entities:     'How do I protect my business entities and plan for succession?',
  attorney:     'What type of estate planning attorney do I need and what should I ask them?',
  integrations: 'How do my connected financial accounts affect my estate plan?',
  networth:     'Based on my estate value, what planning strategies should I consider?',
  tax:          'What are my estate tax exposure risks and how can I minimize them?',
  simulator:    'Walk me through what would happen to my estate if I died today.',
}

export default function AIPageInsight({ page }: { page: string }) {
  const [recs, setRecs] = useState<Rec[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/recommendations')
      .then(r => r.json())
      .then(data => {
        const relevantIds = PAGE_REC_MAP[page] ?? []
        const filtered = (data.recommendations ?? []).filter((r: Rec) =>
          relevantIds.includes(r.id)
        )
        setRecs(filtered)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [page])

  if (!loaded) return null

  const top = recs[0]
  const question = encodeURIComponent(PAGE_AI_QUESTION[page] || 'What should I focus on for my estate plan?')
  const aiHref = `/ai?q=${question}`

  if (!top) {
    // No gaps for this page — show a clean green state
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', margin: '0 0 20px 0', background: 'rgba(0,204,102,0.06)', border: '1px solid rgba(0,204,102,0.18)', borderRadius: '12px' }}>
        <span style={{ fontSize: '14px' }}>✓</span>
        <span style={{ fontSize: '12px', color: '#00cc66', fontWeight: 600 }}>No issues detected for this section</span>
        <Link href={aiHref} style={{ marginLeft: 'auto', fontSize: '11px', color: '#6b7ab8', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>Ask AI →</Link>
      </div>
    )
  }

  const c = SEVERITY_COLOR[top.severity]

  return (
    <div style={{ padding: '11px 16px', marginBottom: '20px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: c.dot, boxShadow: `0 0 6px ${c.dot}`, flexShrink: 0, display: 'inline-block' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: c.dot, textTransform: 'uppercase', letterSpacing: '.06em', marginRight: '8px' }}>{c.label}</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#e8eaf6' }}>{top.title}</span>
        {recs.length > 1 && (
          <span style={{ fontSize: '11px', color: '#6b7ab8', marginLeft: '8px' }}>+{recs.length - 1} more issue{recs.length > 2 ? 's' : ''}</span>
        )}
        <div style={{ fontSize: '11px', color: '#6b7ab8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top.description}</div>
      </div>
      <Link href={aiHref} style={{ fontSize: '12px', fontWeight: 700, color: '#00aaff', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, padding: '5px 12px', border: '1px solid rgba(0,170,255,0.25)', borderRadius: '8px' }}>
        Ask AI →
      </Link>
    </div>
  )
}
