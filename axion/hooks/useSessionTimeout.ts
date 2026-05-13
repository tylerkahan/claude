'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const TIMEOUT_MS = 30 * 60 * 1000  // 30 minutes
const WARN_MS = 2 * 60 * 1000      // warn 2 minutes before

export function useSessionTimeout() {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const warnRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const [showWarning, setShowWarning] = useState(false)

  const reset = useCallback(() => {
    setShowWarning(false)
    clearTimeout(timeoutRef.current)
    clearTimeout(warnRef.current)
    warnRef.current = setTimeout(() => setShowWarning(true), TIMEOUT_MS - WARN_MS)
    timeoutRef.current = setTimeout(async () => {
      await createClient().auth.signOut()
      router.push('/login?reason=timeout')
    }, TIMEOUT_MS)
  }, [router])

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
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
