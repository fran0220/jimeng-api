/**
 * Simple in-memory sliding window rate limiter.
 * For production at scale, consider using Upstash Redis.
 */

interface WindowEntry {
  timestamps: number[]
}

const windows: Map<string, WindowEntry> = new Map()

// Clean up old entries every 60 seconds
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of windows) {
    entry.timestamps = entry.timestamps.filter(t => now - t < 60_000)
    if (entry.timestamps.length === 0) {
      windows.delete(key)
    }
  }
}, 60_000)

/**
 * Check if a request is within rate limit.
 * Returns { allowed, remaining, resetMs }
 */
export function checkRateLimit(
  keyId: string,
  limitPerMinute: number
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now()
  const windowMs = 60_000

  let entry = windows.get(keyId)
  if (!entry) {
    entry = { timestamps: [] }
    windows.set(keyId, entry)
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(t => now - t < windowMs)

  if (entry.timestamps.length >= limitPerMinute) {
    const oldestInWindow = entry.timestamps[0]
    const resetMs = windowMs - (now - oldestInWindow)
    return {
      allowed: false,
      remaining: 0,
      resetMs,
    }
  }

  // Add current request
  entry.timestamps.push(now)

  return {
    allowed: true,
    remaining: limitPerMinute - entry.timestamps.length,
    resetMs: 0,
  }
}
