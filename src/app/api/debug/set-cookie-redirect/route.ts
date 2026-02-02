import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.redirect(
    new URL('/api/debug/session', process.env.NEXT_PUBLIC_APP_URL)
  );

  response.cookies.set('redirect-test', 'it-works', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });

  return response;
}
