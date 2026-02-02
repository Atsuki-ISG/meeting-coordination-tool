import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-calendar/client';

export async function GET() {
  const authUrl = getAuthUrl('/dashboard');
  return NextResponse.redirect(authUrl);
}
