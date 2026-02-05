import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  getTokensFromCode,
  getUserInfo,
  encryptRefreshToken,
} from '@/lib/google-calendar/client';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, process.env.NEXT_PUBLIC_APP_URL)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=missing_code', process.env.NEXT_PUBLIC_APP_URL)
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing tokens');
    }

    // Get user info
    const userInfo = await getUserInfo(tokens.access_token);

    // Encrypt refresh token for storage
    const encryptedRefreshToken = encryptRefreshToken(tokens.refresh_token);

    // Create or update member in database
    const supabase = await createServiceClient();

    const { data: existingMember } = await supabase
      .from('members')
      .select('id, team_id')
      .eq('email', userInfo.email)
      .single();

    let memberId: string;
    let teamId: string | null = null;

    // Check if this user is the system admin (from environment variable)
    const systemAdminEmails = (process.env.SYSTEM_ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const isSystemAdmin = systemAdminEmails.includes(userInfo.email.toLowerCase());

    let memberStatus: 'pending' | 'active' = 'pending';

    if (existingMember) {
      // Update existing member
      await supabase
        .from('members')
        .update({
          name: userInfo.name,
          google_refresh_token: encryptedRefreshToken,
          google_token_expires_at: tokens.expiry_date
            ? new Date(tokens.expiry_date).toISOString()
            : null,
          // Promote to system admin if in env var (but don't demote)
          ...(isSystemAdmin ? { is_system_admin: true, status: 'active' } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingMember.id);
      memberId = existingMember.id;
      teamId = existingMember.team_id;

      // Get current status
      const { data: memberData } = await supabase
        .from('members')
        .select('status')
        .eq('id', existingMember.id)
        .single();
      memberStatus = memberData?.status || 'pending';
    } else {
      // Create new member
      // System admin from env is auto-approved, others are pending
      const { data: newMember, error: insertError } = await supabase
        .from('members')
        .insert({
          email: userInfo.email,
          name: userInfo.name,
          google_refresh_token: encryptedRefreshToken,
          google_token_expires_at: tokens.expiry_date
            ? new Date(tokens.expiry_date).toISOString()
            : null,
          status: isSystemAdmin ? 'active' : 'pending',
          is_system_admin: isSystemAdmin,
        })
        .select('id')
        .single();

      if (insertError || !newMember) {
        throw new Error('Failed to create member');
      }
      memberId = newMember.id;
      teamId = null;
      memberStatus = isSystemAdmin ? 'active' : 'pending';
    }

    // Create session token
    const { token, expiresAt } = await createSessionToken({
      memberId,
      email: userInfo.email,
      name: userInfo.name,
      teamId,
      status: memberStatus,
      isSystemAdmin,
    });

    // Redirect based on member status and team membership
    let defaultRedirect: string;
    if (memberStatus === 'pending') {
      defaultRedirect = '/pending-approval';
    } else if (teamId) {
      defaultRedirect = '/dashboard';
    } else {
      defaultRedirect = '/team';
    }
    const redirectUrl = memberStatus === 'pending' ? '/pending-approval' : (state || defaultRedirect);
    const response = NextResponse.redirect(
      new URL(redirectUrl, process.env.NEXT_PUBLIC_APP_URL)
    );

    // Set cookie on the redirect response
    const isProduction = process.env.NODE_ENV === 'production' ||
      process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://');

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(
      new URL('/login?error=auth_failed', process.env.NEXT_PUBLIC_APP_URL)
    );
  }
}
