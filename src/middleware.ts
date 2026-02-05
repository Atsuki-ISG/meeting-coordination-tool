import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'session';

function getSecret(): Uint8Array {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  return new TextEncoder().encode(process.env.ENCRYPTION_KEY);
}

// Routes that require authentication AND team membership AND active status
const protectedRoutes = ['/dashboard', '/event-types', '/bookings', '/members', '/settings'];

// Routes that require authentication AND active status but NOT team membership
const authOnlyRoutes = ['/team'];

// Routes that require authentication AND system admin
const systemAdminRoutes = ['/admin'];

// Routes that should redirect to dashboard if already authenticated with active status
const authRoutes = ['/login'];

// Routes accessible by pending users
const pendingRoutes = ['/pending-approval'];

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
  let memberStatus: 'pending' | 'active' | 'suspended' = 'pending';
  let isSystemAdmin = false;

  if (sessionToken) {
    try {
      const { payload } = await jwtVerify(sessionToken, getSecret());
      isAuthenticated = true;
      hasTeam = !!payload.teamId;
      memberStatus = (payload.status as 'pending' | 'active' | 'suspended') || 'active';
      isSystemAdmin = (payload.isSystemAdmin as boolean) || false;
    } catch {
      // Invalid token
      isAuthenticated = false;
    }
  }

  const isActive = memberStatus === 'active';
  const isPending = memberStatus === 'pending';
  const isSuspended = memberStatus === 'suspended';

  // Redirect suspended users to login with error
  if (isAuthenticated && isSuspended) {
    const response = NextResponse.redirect(new URL('/login?error=suspended', request.url));
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  // Redirect authenticated active users away from auth routes
  if (isAuthenticated && isActive && authRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL(hasTeam ? '/dashboard' : '/team', request.url));
  }

  // Redirect pending users away from auth routes to pending page
  if (isAuthenticated && isPending && authRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/pending-approval', request.url));
  }

  // Handle pending approval page
  if (pathname.startsWith('/pending-approval')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (isActive) {
      return NextResponse.redirect(new URL(hasTeam ? '/dashboard' : '/team', request.url));
    }
    // Pending user can stay on this page
    return NextResponse.next();
  }

  // Redirect pending users to pending page for all protected routes
  if (isAuthenticated && isPending &&
      (protectedRoutes.some((route) => pathname.startsWith(route)) ||
       authOnlyRoutes.some((route) => pathname.startsWith(route)) ||
       systemAdminRoutes.some((route) => pathname.startsWith(route)))) {
    return NextResponse.redirect(new URL('/pending-approval', request.url));
  }

  // Handle system admin routes
  if (systemAdminRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (!isSystemAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Handle team page - redirect to dashboard if user already has a team
  if (isAuthenticated && isActive && pathname.startsWith('/team') && hasTeam) {
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
  if (isAuthenticated && isActive && !hasTeam && protectedRoutes.some((route) => pathname.startsWith(route))) {
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
