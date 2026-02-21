import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/api';
import { createSession } from '@/lib/auth/session';

const switchSchema = z.object({
  teamId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { teamId } = switchSchema.parse(body);

    const supabase = await createServiceClient();

    // Verify membership
    const { data: membership } = await supabase
      .from('team_memberships')
      .select('role')
      .eq('member_id', user.memberId)
      .eq('team_id', teamId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
    }

    // Switch active team
    await supabase
      .from('members')
      .update({ team_id: teamId, role: membership.role })
      .eq('id', user.memberId);

    await createSession({
      memberId: user.memberId,
      email: user.email,
      name: user.name,
      teamId,
      status: user.status,
      isSystemAdmin: user.isSystemAdmin,
    });

    return NextResponse.json({ success: true, teamId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    console.error('Switch team error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
