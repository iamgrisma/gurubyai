import { NextResponse, type NextRequest } from 'next/server';

const AUTH_COOKIE_RE = /^sb-[^-]+-auth-token(?:\.\d+)?$/;

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Early gate only. The dashboard validates the authenticated profile and
  // Supabase RPCs remain the final server-side authorization boundary.
  const hasAuthCookie = request.cookies
    .getAll()
    .some(({ name }) => AUTH_COOKIE_RE.test(name));

  if (!hasAuthCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      'next',
      request.nextUrl.pathname + request.nextUrl.search
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
