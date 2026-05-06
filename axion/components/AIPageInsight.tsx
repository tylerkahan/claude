'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const STALE_HOURS = 24

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

const SEVERITY_COLOR = {
  critical: { bg: 'rgba(255,102,136,0.07)', border: 'rgba(255,102,136,0.22)', dot: '#ff6688', label: 'Critical' },
  high:     { bg: 'rgba(255,170,0,0.07)',   border: 'rgba(255,170,0,0.22)',   dot: '#ffaa00', label: 'High Priority' },
  medium:   { bg: 'rgba(0,170,255,0.07)',   border: 'rgba(0,170,255,0.22)',   dot: '#00aaff', label: 'Note' },
}

export default function AIPageInsight({ page }: { page: string }) {
  const [pageInsights, setPageInsights] = useState<any[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const analyzingRef = useRef(false)

  const applyInsights = useCallback((insights: any) => {
    const all: any[] = insights?.insights ?? []
    // First try exact page match
    const pageSpecific = all.filter((i: any) => !i.page || i.page === page)
    if (pageSpecific.length > 0) {
      setPageInsights(pageSpecific)
    } else if (all.length > 0) {
      // Fall back to top 2 highest-severity insights from anywhere
      const ranked = [...all].sort((a, b) => {
        const order: Record<string, number> = { critical: 0, high: 1, medium: 2 }
        return (order[a.severity] ?? 3) - (order[b.severity] ?? 3)
      })
      setPageInsights(ranked.slice(0, 2))
    } else {
      setPageInsights([])
    }
    setLoaded(true)
  }, [page])

  const runAnalysis = useCallback(async () => {
    if (analyzingRef.current) return
    analyzingRef.current = true
    setAnalyzing(true)
    try {
      const res = await fetch('/api/ai/analyze', { method: 'POST' })
      const data = await res.json()
      applyInsights(data)
    } catch {}
    analyzingRef.current = false
    setAnalyzing(false)
  }, [applyInsights])

  const fetchInsights = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/insights')
      const { insights } = await res.json()
      if (!insights) { runAnalysis(); return }
      const ageHours = (Date.now() - new Date(insights.generated_at).getTime()) / 3_600_000
      applyInsights(insights)
      if (ageHours > STALE_HOURS) runAnalysis()
    } catch { runAnalysis() }
  }, [applyInsights, runAnalysis])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  // Live subscription — re-render banner the moment ai_insights row updates
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('ai-insights-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_insights' }, payload => {
        const updated = payload.new as any
        if (updated?.insights) applyInsights({ insights: updated.insights })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [applyInsights])

  const question = encodeURIComponent(PAGE_AI_QUESTION[page] || 'What should I focus on for my estate plan?')
  const aiHref = `/ai?q=${question}`

  if (!loaded && analyzing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', margin: '0 0 20px 0', background: 'rgba(102,68,255,0.06)', border: '1px solid rgba(102,68,255,0.18)', borderRadius: '12px' }}>
        <style>{`@keyframes ai-spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ width: '12px', height: '12px', border: '2px solid rgba(102,68,255,0.3)', borderTopColor: '#6644ff', borderRadius: '50%', display: 'inline-block', animation: 'ai-spin 0.8s linear infinite', flexShrink: 0 }} />
        <span style={{ fontSize: '12px', color: '#9966ff', fontWeight: 600 }}>AI is analyzing your estate profile...</span>
      </div>
    )
  }

  if (!loaded) return null

  const top = pageInsights[0]

  if (!top) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', margin: '0 0 20px 0', background: 'rgba(0,204,102,0.06)', border: '1px solid rgba(0,204,102,0.18)', borderRadius: '12px' }}>
        <span style={{ fontSize: '14px' }}>✓</span>
        <span style={{ fontSize: '12px', color: '#00cc66', fontWeight: 600 }}>AI found no issues for this section</span>
        <Link href={aiHref} style={{ marginLeft: 'auto', fontSize: '11px', color: '#6b7ab8', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>Ask AI →</Link>
      </div>
    )
  }

  const c = SEVERITY_COLOR[top.severity as keyof typeof SEVERITY_COLOR] ?? SEVERITY_COLOR.medium

  return (
    <div style={{ padding: '11px 16px', marginBottom: '20px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: c.dot, boxShadow: `0 0 6px ${c.dot}`, flexShrink: 0, display: 'inline-block' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: c.dot, textTransform: 'uppercase' as const, letterSpacing: '.06em', marginRight: '8px' }}>{c.label}</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#e8eaf6' }}>{top.title}</span>
        {pageInsights.length > 1 && (
          <span style={{ fontSize: '11px', color: '#6b7ab8', marginLeft: '8px' }}>+{pageInsights.length - 1} more issue{pageInsights.length > 2 ? 's' : ''}</span>
        )}
        <div style={{ fontSize: '11px', color: '#6b7ab8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top.description}</div>
      </div>
      <Link href={aiHref} style={{ fontSize: '12px', fontWeight: 700, color: '#00aaff', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, padding: '5px 12px', border: '1px solid rgba(0,170,255,0.25)', borderRadius: '8px' }}>
        Ask AI →
      </Link>
    </div>
  )
}
