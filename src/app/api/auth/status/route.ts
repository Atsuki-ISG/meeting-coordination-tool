import { NextResponse } from 'next/server';
import { getSession, createSession } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get fresh status from database
    const supabase = await createServiceClient();
    const { data: member } = await supabase
      .from('members')
      .select('status, is_system_admin, team_id')
      .eq('id', session.memberId)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // If status changed, update the session
    if (member.status !== session.status || member.is_system_admin !== session.isSystemAdmin) {
      await createSession({
        memberId: session.memberId,
        email: session.email,
        name: session.name,
        teamId: member.team_id,
        status: member.status,
        isSystemAdmin: member.is_system_admin,
      });
    }

    return NextResponse.json({
      status: member.status,
      isSystemAdmin: member.is_system_admin,
      teamId: member.team_id,
    });
  } catch (error) {
    console.error('Auth status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
