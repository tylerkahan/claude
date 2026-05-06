'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const WATCHED_TABLES = [
  'assets',
  'beneficiaries',
  'family_members',
  'documents',
  'digital_assets',
  'entities',
  'compliance_checks',
  'connected_accounts',
  'account_balances',
  'profiles',
]

// Debounce delay — if multiple tables change at once, only run once
const DEBOUNCE_MS = 2000

export default function AIAnalysisTrigger() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerAnalysis = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/ai/analyze', { method: 'POST' })
      } catch {}
    }, DEBOUNCE_MS)
  }

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to all watched tables via Realtime
    const channels = WATCHED_TABLES.map(table =>
      supabase
        .channel(`ai-watch-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          triggerAnalysis()
        })
        .subscribe()
    )

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
