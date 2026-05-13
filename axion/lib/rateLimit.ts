const store = new Map<string, { count: number; reset: number }>()

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const rec = store.get(key)
  if (!rec || now > rec.reset) {
    store.set(key, { count: 1, reset: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }
  if (rec.count >= limit) return { allowed: false, remaining: 0 }
  rec.count++
  return { allowed: true, remaining: limit - rec.count }
}
