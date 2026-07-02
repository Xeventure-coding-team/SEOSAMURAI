import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Maintenance mode — simple in-memory cache, refreshes every 30s
// ---------------------------------------------------------------------------

let maintenanceCache: { value: boolean; ts: number } | null = null;
const CACHE_TTL = 30_000;

async function isMaintenanceMode(baseUrl: string): Promise<boolean> {
  const now = Date.now();
  if (maintenanceCache && now - maintenanceCache.ts < CACHE_TTL) {
    return maintenanceCache.value;
  }
  try {
    const res = await fetch(`${baseUrl}/api/admin/settings`, { cache: 'no-store' });
    const data = await res.json();
    maintenanceCache = { value: !!data.maintenanceMode, ts: now };
    return maintenanceCache.value;
  } catch {
    return maintenanceCache?.value ?? false;
  }
}

// ---------------------------------------------------------------------------
// In-memory rate limiter
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > 300_000) store.delete(key);
  }
}, 300_000);

interface LimitConfig {
  maxRequests: number;
  windowMs: number;
}

function rateLimit(key: string, config: LimitConfig) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > config.windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { success: true, remaining: config.maxRequests - 1, reset: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0, reset: entry.windowStart + config.windowMs };
  }

  entry.count += 1;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    reset: entry.windowStart + config.windowMs,
  };
}

const TIERS: Record<string, LimitConfig> = {
  ai:      { maxRequests: 10,  windowMs: 60_000 },
  auth:    { maxRequests: 20,  windowMs: 60_000 },
  webhook: { maxRequests: 200, windowMs: 60_000 },
  default: { maxRequests: 60,  windowMs: 60_000 },
};

const RATE_LIMIT_SKIP = ['/api/blog'];

function getTier(pathname: string): string {
  if (['/api/ai', '/api/enhance', '/api/generate-image', '/api/generate-reply', '/api/chat', '/api/chats'].some(r => pathname.startsWith(r))) return 'ai';
  if (pathname.startsWith('/api/auth')) return 'auth';
  if (['/api/webhooks', '/api/stripe'].some(r => pathname.startsWith(r))) return 'webhook';
  return 'default';
}

function getIdentifier(req: NextRequest): string {
  const userId = req.headers.get('x-user-id');
  if (userId) return `user:${userId}`;
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';
  return `ip:${ip}`;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const hostname       = request.headers.get('host') || '';
  const hostWithoutPort = hostname.split(':')[0];
  const { pathname }   = request.nextUrl;

  // ── 1. Rate limiting — API routes only ─────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    if (!RATE_LIMIT_SKIP.some(r => pathname.startsWith(r))) {
      const tier       = getTier(pathname);
      const config     = TIERS[tier];
      const identifier = `${tier}:${getIdentifier(request)}`;
      const { success, remaining, reset } = rateLimit(identifier, config);

      const rlHeaders = {
        'X-RateLimit-Limit':     String(config.maxRequests),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset':     String(reset),
      };

      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        return NextResponse.json(
          { error: 'Too many requests. Please slow down.', retryAfter },
          { status: 429, headers: { ...rlHeaders, 'Retry-After': String(retryAfter) } }
        );
      }

      const res = NextResponse.next();
      Object.entries(rlHeaders).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    return NextResponse.next();
  }

  // ── 2. Maintenance mode — non-API, non-admin routes only ───────────────────
  const isAdminRoute      = pathname.startsWith('/admin');
  const isMaintenancePage = pathname === '/maintenance';

  if (!isAdminRoute) {
    const baseUrl    = `${request.nextUrl.protocol}//${hostname}`;
    const maintenance = await isMaintenanceMode(baseUrl);

    if (maintenance && !isMaintenancePage) {
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }
    if (!maintenance && isMaintenancePage) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // ── 3. Subdomain routing ───────────────────────────────────────────────────
  const match     = hostWithoutPort.match(/^([a-zA-Z0-9-]+)\.localhost$/);
  const subdomain = match?.[1];

  if (subdomain && subdomain !== 'www') {
    const url    = request.nextUrl.clone();
    url.pathname = pathname === '/' ? `/s/${subdomain}` : `/s/${subdomain}${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};