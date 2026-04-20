import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Skip everything we don't want to touch
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/s/') ||     // prevent infinite loop
    pathname.includes('.') ||         // static files
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Improved subdomain detection for complex names like "thannikode-complex"
  let subdomain: string | null = null;
  const hostWithoutPort = hostname.split(':')[0];


  // This regex handles "anything.localhost" including hyphens
  const match = hostWithoutPort.match(/^([a-zA-Z0-9-]+)\.localhost$/);
  
  if (match) {
    subdomain = match[1];
    if (subdomain !== 'www' && subdomain !== 'localhost') {
      console.log('✅ Subdomain detected:', subdomain);
    } else {
      subdomain = null;
    }
  }

  if (subdomain) {
    const newPath = pathname === '/' || pathname === '' 
      ? `/s/${subdomain}` 
      : `/s/${subdomain}${pathname}`;

    url.pathname = newPath;

    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};