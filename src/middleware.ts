import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const hostWithoutPort = hostname.split(':')[0];

  const match = hostWithoutPort.match(/^([a-zA-Z0-9-]+)\.localhost$/);
  const subdomain = match?.[1];

  if (!subdomain || subdomain === 'www') {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' ? `/s/${subdomain}` : `/s/${subdomain}${pathname}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};