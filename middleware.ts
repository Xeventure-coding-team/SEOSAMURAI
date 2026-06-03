import { NextRequest, NextResponse } from 'next/server';

const SUBDOMAIN_REGEX = /^([a-zA-Z0-9-]+)\.localhost$/;

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const hostWithoutPort = hostname.split(':')[0];

  // Only rewrite for subdomains — bail early otherwise
  const match = hostWithoutPort.match(SUBDOMAIN_REGEX);
  if (!match) return NextResponse.next();

  const subdomain = match[1];
  if (subdomain === 'www') return NextResponse.next();

  const pathname = request.nextUrl.pathname;

  const newPath = pathname === '/' || pathname === ''
    ? `/s/${subdomain}`
    : `/s/${subdomain}${pathname}`;

  return NextResponse.rewrite(new URL(newPath, request.url));
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|s/|.*\\..*).*)',
  ],
};