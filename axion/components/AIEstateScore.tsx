'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const STALE_HOURS = 24

function scoreColor(score: number) {
  if (score >= 86) return '#00cc66'
  if (score >= 71) return '#00aaff'
  if (score >= 51) return '#ffaa00'
  if (score >= 31) return '#ff8844'
  return '#ff6688'
}

function scoreBg(score: number) {
  if (score >= 86) return 'rgba(0,204,102,0.25)'
  if (score >= 71) return 'rgba(0,170,255,0.25)'
  if (score >= 51) return 'rgba(255,170,0,0.25)'
  if (score >= 31) return 'rgba(255,136,68,0.25)'
  return 'rgba(255,102,136,0.25)'
}

export default function AIEstateScore() {
  const [data, setData] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const analyzingRef = useRef(false)

  const runAnalysis = useCallback(async () => {
    if (analyzingRef.current) return
    analyzingRef.current = true
    setAnalyzing(true)
    try {
      const res = await fetch('/api/ai/analyze', { method: 'POST' })
      const json = await res.json()
      setData(json)
    } catch {}
    analyzingRef.current = false
    setAnalyzing(false)
    setLoaded(true)
  }, [])

  useEffect(() => {
    fetch('/api/ai/insights')
      .then(r => r.json())
      .then(({ insights }) => {
        if (!insights) { runAnalysis(); return }
        const ageHours = (Date.now() - new Date(insights.generated_at).getTime()) / 3_600_000
        setData(insights)
        setLoaded(true)
        if (ageHours > STALE_HOURS) runAnalysis()
      })
      .catch(() => runAnalysis())
  }, [runAnalysis])

  // Live subscription — score updates the moment ai_insights row changes
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('ai-score-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_insights' }, payload => {
        const updated = payload.new as any
        if (updated?.estate_score != null) setData(updated)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const card: React.CSSProperties = {
    background: 'rgba(8,14,40,0.7)',
    border: '1px solid rgba(0,100,255,0.16)',
    borderRadius: '16px',
    padding: '20px 22px',
    backdropFilter: 'blur(20px)',
  }

  if (!loaded && analyzing) {
    return (
      <div style={{ ...card, gridColumn: 'span 2' }}>
        <style>{`@keyframes ai-spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '14px', height: '14px', border: '2px solid rgba(102,68,255,0.3)', borderTopColor: '#6644ff', borderRadius: '50%', display: 'inline-block', animation: 'ai-spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '13px', color: '#9966ff', fontWeight: 600 }}>AI analyzing your estate...</span>
        </div>
      </div>
    )
  }

  if (!loaded || !data) return null

  const score = data.estate_score ?? 0
  const label = data.score_label ?? ''
  const summary = data.summary ?? ''
  const insights: any[] = data.insights ?? []
  const topCritical = insights.filter((i: any) => i.severity === 'critical').slice(0, 3)
  const color = scoreColor(score)
  const generated = data.generated_at ? new Date(data.generated_at) : null

  return (
    <div style={{ ...card, gridColumn: 'span 2', borderColor: `${color}33` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>

        {/* Score ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <div style={{ position: 'relative', width: '80px', height: '80px' }}>
            <svg viewBox="0 0 80 80" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - score / 100)}`}
                strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color, fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1 }}>{score}</span>
            </div>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color, letterSpacing: '.06em', textTransform: 'uppercase' as const }}>{label}</span>
          <span style={{ fontSize: '10px', color: '#3d4a7a' }}>AI Estate Score</span>
        </div>

        {/* Summary + insights */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7ab8', textTransform: 'uppercase' as const, letterSpacing: '.1em' }}>AI Analysis</span>
            {analyzing && <span style={{ fontSize: '10px', color: '#6644ff' }}>· refreshing...</span>}
            {generated && !analyzing && (
              <span style={{ fontSize: '10px', color: '#3d4a7a', marginLeft: 'auto' }}>
                Last analyzed {generated.toLocaleDateString()}
              </span>
            )}
          </div>
          {summary && (
            <p style={{ fontSize: '13px', color: '#a0aac8', lineHeight: 1.5, margin: '0 0 12px 0' }}>{summary}</p>
          )}
          {topCritical.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {topCritical.map((ins: any) => (
                <div key={ins.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '7px 10px', background: 'rgba(255,102,136,0.06)', border: '1px solid rgba(255,102,136,0.15)', borderRadius: '8px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff6688', flexShrink: 0, marginTop: '4px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#e8eaf6' }}>{ins.title}</div>
                    <div style={{ fontSize: '11px', color: '#6b7ab8', marginTop: '2px' }}>{ins.description}</div>
                  </div>
                  {ins.page && (
                    <Link href={`/${ins.page}`} style={{ fontSize: '11px', color: '#00aaff', textDecoration: 'none', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Fix →</Link>
                  )}
                </div>
              ))}
            </div>
          )}
          {insights.length > topCritical.length && (
            <Link href="/ai" style={{ display: 'inline-block', marginTop: '10px', fontSize: '12px', color: '#6b7ab8', textDecoration: 'none', fontWeight: 600 }}>
              View all {insights.length} AI insights →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
