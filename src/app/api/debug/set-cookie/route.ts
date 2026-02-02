import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.json({ message: 'Cookie set!' });

  response.cookies.set('test-cookie', 'hello-world', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  });

  return response;
}
