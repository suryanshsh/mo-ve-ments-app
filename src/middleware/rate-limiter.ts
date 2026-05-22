type RateLimitTier = 'crud' | 'generation'

type BucketConfig = {
  capacity: number
  refillPerSecond: number
}

type BucketState = {
  tokens: number
  updatedAt: number
}

const BUCKETS: Record<RateLimitTier, BucketConfig> = {
  crud: { capacity: 10, refillPerSecond: 10 },
  generation: { capacity: 2, refillPerSecond: 2 },
}

const buckets = new Map<string, BucketState>()

const getBucketKey = (userId: string, tier: RateLimitTier) => `${tier}:${userId}`

export function checkRateLimit(
  userId: string,
  tier: RateLimitTier
): { allowed: boolean; retryAfter?: number } {
  const config = BUCKETS[tier]
  const key = getBucketKey(userId, tier)
  const now = Date.now()
  const previous = buckets.get(key) ?? { tokens: config.capacity, updatedAt: now }
  const elapsedSeconds = Math.max(0, (now - previous.updatedAt) / 1000)
  const tokens = Math.min(config.capacity, previous.tokens + elapsedSeconds * config.refillPerSecond)

  if (tokens < 1) {
    buckets.set(key, { tokens, updatedAt: now })

    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((1 - tokens) / config.refillPerSecond)),
    }
  }

  buckets.set(key, { tokens: tokens - 1, updatedAt: now })

  return { allowed: true }
}