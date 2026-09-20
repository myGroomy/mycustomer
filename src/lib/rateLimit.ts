type Entry = { count: number; resetAt: number }

const entries = new Map<string, Entry>()

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const current = entries.get(key)
  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (current.count >= limit) return false
  current.count += 1
  return true
}
