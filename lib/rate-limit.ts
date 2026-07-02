import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const FAILURE_THRESHOLD = 5;      // errors before we stop trying
const COOLDOWN_MS       = 60_000; // 1 min cooldown before retrying

let consecutiveFailures = 0;
let circuitOpenAt: number | null = null;

function isCircuitOpen(): boolean {
  if (circuitOpenAt === null) return false;
  if (Date.now() - circuitOpenAt > COOLDOWN_MS) {
    // cooldown passed — half-open: try again
    circuitOpenAt       = null;
    consecutiveFailures = 0;
    return false;
  }
  return true;
}

function recordFailure() {
  consecutiveFailures += 1;
  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    circuitOpenAt = Date.now();
    console.warn('[rate-limit] Circuit open — Upstash unreachable or quota exceeded. Failing open silently.');
  }
}

function recordSuccess() {
  consecutiveFailures = 0;
  circuitOpenAt       = null;
}

// ---------------------------------------------------------------------------
// Redis client — lazy, only created if env vars present
// ---------------------------------------------------------------------------

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

// ---------------------------------------------------------------------------
// Limiters — one instance per tier, created lazily
// Sliding window: smoothest distribution, no burst at window reset
// Keep windows short and limits conservative to stay within free tier
//
// Free tier: 500K commands/month
// Each limit check = 2 commands (GET + SET)
// Budget: ~250K checks/month across all tiers
// ---------------------------------------------------------------------------

type TierName = 'ai' | 'auth' | 'strict';

interface TierConfig {
  maxRequests: number;
  window: `${number} s` | `${number} m` | `${number} h`;
  prefix: string;
}

const TIER_CONFIG: Record<TierName, TierConfig> = {
  ai:     { maxRequests: 10,  window: '1 m', prefix: 'rl:ai'     },
  auth:   { maxRequests: 20,  window: '1 m', prefix: 'rl:auth'   },
  strict: { maxRequests: 30,  window: '1 m', prefix: 'rl:strict' },
};

const limiters = new Map<TierName, Ratelimit>();

function getLimiter(tier: TierName): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  if (limiters.has(tier)) return limiters.get(tier)!;

  const cfg     = TIER_CONFIG[tier];
  const limiter = new Ratelimit({
    redis:   r,
    limiter: Ratelimit.slidingWindow(cfg.maxRequests, cfg.window),
    prefix:  cfg.prefix,
    // No analytics — each analytics write costs extra commands, save the quota
    analytics: false,
  });

  limiters.set(tier, limiter);
  return limiter;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  success:   boolean;
  remaining: number;
  reset:     number; // unix ms
  limited:   boolean;
}

/** Pass-through result used when rate limiting is disabled or circuit is open */
const PASS: RateLimitResult = { success: true, remaining: 999, reset: 0, limited: false };

/** Block result used when limit is exceeded */
function blockResult(reset: number): RateLimitResult {
  return { success: false, remaining: 0, reset, limited: true };
}

/**
 * Check rate limit for a given tier and identifier.
 * - Returns PASS silently if env var RATE_LIMIT_ENABLED !== 'true'
 * - Returns PASS silently if Upstash credentials are missing
 * - Returns PASS silently if circuit breaker is open (quota exceeded / outage)
 * - Never throws — all errors fail open
 */
export async function checkRateLimit(
  tier: TierName,
  identifier: string,
): Promise<RateLimitResult> {
  // Feature flag — easy kill switch
  if (process.env.RATE_LIMIT_ENABLED !== 'true') return PASS;

  // Circuit open — Upstash is down or quota exceeded
  if (isCircuitOpen()) return PASS;

  const limiter = getLimiter(tier);

  // No Redis configured — skip silently
  if (!limiter) return PASS;

  try {
    const result = await limiter.limit(identifier);
    recordSuccess();
    return {
      success:   result.success,
      remaining: result.remaining,
      reset:     result.reset,
      limited:   !result.success,
    };
  } catch (err) {
    // Quota exceeded error from Upstash comes as an HTTP 429 or an error message
    const msg = err instanceof Error ? err.message.toLowerCase() : String(err);
    const isQuotaError = msg.includes('max daily request limit') ||
                         msg.includes('quota')                   ||
                         msg.includes('429')                     ||
                         msg.includes('rate limit');

    if (isQuotaError) {
      console.warn('[rate-limit] Upstash quota exceeded — disabling rate limiting until cooldown.');
    } else {
      console.error('[rate-limit] Upstash error:', err);
    }

    recordFailure();
    return PASS; // fail open — never block users due to our own infra issues
  }
}

/**
 * Resolve the tier for a given API pathname.
 * Returns null if the route should not be rate limited.
 */
export function getTier(pathname: string): TierName | null {
  if ([
    '/api/ai',
    '/api/enhance',
    '/api/generate-image',
    '/api/generate-reply',
    '/api/chat',
    '/api/chats',
    '/api/serp',
  ].some(r => pathname.startsWith(r))) return 'ai';

  if ([
    '/api/auth',
    '/api/contact',
  ].some(r => pathname.startsWith(r))) return 'auth';

  if ([
    '/api/gmb',
    '/api/batch-update',
    '/api/grid',
    '/api/review-poster',
    '/api/tracked-review',
    '/api/websites',
  ].some(r => pathname.startsWith(r))) return 'strict';

  return null; // not rate limited
}

/**
 * Build the identifier key from request headers.
 * Prefer authenticated user ID — falls back to IP.
 * IP-only limiting is weaker but fine as a fallback.
 */
export function getIdentifier(headers: Headers): string {
  const userId = headers.get('x-user-id');
  if (userId) return `user:${userId}`;

  const ip =
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip')                              ??
    'unknown';

  return `ip:${ip}`;
}