import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'session';
const SECRET = new TextEncoder().encode(
  process.env.ENCRYPTION_KEY || 'fallback-secret-key-for-development'
);

// Routes that require authentication AND team membership
const protectedRoutes = ['/dashboard', '/event-types', '/bookings', '/members', '/admin', '/settings', '/invitations'];

// Routes that require authentication but NOT team membership
const authOnlyRoutes = ['/team'];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Skip auth check for RSC requests without cookies (they use CORS mode which doesn't send cookies)
  const isRscRequest = request.headers.get('rsc') === '1';
  if (isRscRequest && !sessionToken) {
    return NextResponse.next();
  }

  let isAuthenticated = false;
  let hasTeam = false;

  if (sessionToken) {
    try {
      const { payload } = await jwtVerify(sessionToken, SECRET);
      isAuthenticated = true;
      hasTeam = !!payload.teamId;
    } catch {
      // Invalid token
      isAuthenticated = false;
    }
  }

  // Redirect authenticated users away from auth routes
  if (isAuthenticated && authRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL(hasTeam ? '/dashboard' : '/team', request.url));
  }

  // Handle team page - redirect to dashboard if user already has a team
  if (isAuthenticated && pathname.startsWith('/team') && hasTeam) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect unauthenticated users to login for protected routes
  if (!isAuthenticated && protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect unauthenticated users to login for auth-only routes
  if (!isAuthenticated && authOnlyRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users WITHOUT team to team page for protected routes
  if (isAuthenticated && !hasTeam && protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/team', request.url));
  }

  // Add cache control headers for authenticated routes
  const response = NextResponse.next();

  if (protectedRoutes.some((route) => pathname.startsWith(route)) ||
      authOnlyRoutes.some((route) => pathname.startsWith(route))) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|book|cancel|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
