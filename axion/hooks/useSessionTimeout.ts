'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const TIMEOUT_MS = 30 * 60 * 1000  // 30 minutes
const WARN_MS = 2 * 60 * 1000      // warn 2 minutes before
const MIN_DELAY_MS = 60 * 1000     // never show warning sooner than 1 min after mount (safety)

export function useSessionTimeout() {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const warnRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const mountedAt = useRef<number>(0)
  const [showWarning, setShowWarning] = useState(false)

  const reset = useCallback(() => {
    setShowWarning(false)
    clearTimeout(timeoutRef.current)
    clearTimeout(warnRef.current)
    // Compute warn delay; never less than MIN_DELAY_MS since mount, never less than 1s overall
    const warnDelay = Math.max(MIN_DELAY_MS, TIMEOUT_MS - WARN_MS)
    warnRef.current = setTimeout(() => setShowWarning(true), warnDelay)
    timeoutRef.current = setTimeout(async () => {
      try { await createClient().auth.signOut() } catch {}
      router.push('/login?reason=timeout')
    }, TIMEOUT_MS)
  }, [router])

  useEffect(() => {
    mountedAt.current = Date.now()
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      clearTimeout(timeoutRef.current)
      clearTimeout(warnRef.current)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [reset])

  return { showWarning, reset }
}
