import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const hostWithoutPort = hostname.split(':')[0];
  const { pathname } = request.nextUrl;

  // ─── Subdomain routing ────────────────────────────────────────────────────
  const match = hostWithoutPort.match(/^([a-zA-Z0-9-]+)\.localhost$/);
  const subdomain = match?.[1];

  if (subdomain && subdomain !== 'www') {
    const url = request.nextUrl.clone();
    url.pathname = pathname === '/' ? `/s/${subdomain}` : `/s/${subdomain}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // ─── Role-based redirect ──────────────────────────────────────────────────
  const isAdminRoute = pathname.startsWith('/admin');
  const isAppRoute = pathname.startsWith('/app');

  if (isAdminRoute || isAppRoute) {
    const user = await stackServerApp.getUser();

    // Not logged in — let Stack Auth handle it
    if (!user) return NextResponse.next();

    const permission = await user.getPermission('access_admin_dashboard');
    const isAdmin = !!permission;

    // Admin trying to access /app/** → send to admin
    if (isAdmin && isAppRoute) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    // Normal user trying to access /admin/** → send to app
    if (!isAdmin && isAdminRoute) {
      return NextResponse.redirect(new URL('/app/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};