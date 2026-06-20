import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache — refreshes every 30s
let maintenanceCache: { value: boolean; ts: number } | null = null;
const CACHE_TTL = 30_000;

async function isMaintenanceMode(baseUrl: string): Promise<boolean> {
  const now = Date.now();
  if (maintenanceCache && now - maintenanceCache.ts < CACHE_TTL) {
    return maintenanceCache.value;
  }

  try {
    const res = await fetch(`${baseUrl}/api/admin/settings`, { cache: "no-store" });
    const data = await res.json();
    maintenanceCache = { value: !!data.maintenanceMode, ts: now };
    return maintenanceCache.value;
  } catch {
    return maintenanceCache?.value ?? false; // fail open
  }
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const hostWithoutPort = hostname.split(':')[0];
  const { pathname } = request.nextUrl;

  // Skip admin, maintenance page itself, and static assets
  const isAdminRoute = pathname.startsWith('/admin');
  const isMaintenancePage = pathname === '/maintenance';

  if (!isAdminRoute) {
    const baseUrl = `${request.nextUrl.protocol}//${hostname}`;
    const maintenance = await isMaintenanceMode(baseUrl);

    if (maintenance && !isMaintenancePage) {
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }

    if (!maintenance && isMaintenancePage) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // ─── Subdomain routing ────────────────────────────────────────────────────
  const match = hostWithoutPort.match(/^([a-zA-Z0-9-]+)\.localhost$/);
  const subdomain = match?.[1];

  if (subdomain && subdomain !== 'www') {
    const url = request.nextUrl.clone();
    url.pathname = pathname === '/' ? `/s/${subdomain}` : `/s/${subdomain}${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',],
};