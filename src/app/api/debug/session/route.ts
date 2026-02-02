import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  const sessionCookie = request.cookies.get('session');
  const testCookie = request.cookies.get('test-cookie');
  const redirectTestCookie = request.cookies.get('redirect-test');

  return NextResponse.json({
    hasCookies: allCookies.length > 0,
    cookieNames: allCookies.map(c => c.name),
    hasSessionCookie: !!sessionCookie,
    hasTestCookie: !!testCookie,
    hasRedirectTestCookie: !!redirectTestCookie,
    testCookieValue: testCookie?.value,
    redirectTestValue: redirectTestCookie?.value,
    sessionCookiePreview: sessionCookie?.value?.substring(0, 50) + '...',
    headers: {
      cookie: request.headers.get('cookie')?.substring(0, 100),
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    }
  });
}
