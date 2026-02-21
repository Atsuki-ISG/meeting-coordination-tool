import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/api';
import { createSession } from '@/lib/auth/session';

const joinTeamSchema = z.object({
  inviteCode: z.string().length(8, '招待コードは8文字です'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = joinTeamSchema.parse(body);

    const supabase = await createServiceClient();

    // Find team by invite code (case insensitive)
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('invite_code', validatedData.inviteCode.toUpperCase())
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: '招待コードが見つかりません' },
        { status: 404 }
      );
    }

    // Check if already a member of this team
    const { data: existing } = await supabase
      .from('team_memberships')
      .select('id')
      .eq('member_id', user.memberId)
      .eq('team_id', team.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Already a member of this team' },
        { status: 400 }
      );
    }

    // Add to team_memberships
    const { error: membershipError } = await supabase
      .from('team_memberships')
      .insert({ member_id: user.memberId, team_id: team.id, role: 'member' });

    if (membershipError) {
      console.error('Failed to join team:', membershipError);
      return NextResponse.json(
        { error: 'Failed to join team' },
        { status: 500 }
      );
    }

    // Switch active team and activate account if pending
    await supabase
      .from('members')
      .update({ team_id: team.id, role: 'member', status: 'active' })
      .eq('id', user.memberId);

    // Update session with team_id and active status
    await createSession({
      memberId: user.memberId,
      email: user.email,
      name: user.name,
      teamId: team.id,
      status: 'active',
      isSystemAdmin: user.isSystemAdmin,
    });

    return NextResponse.json({ team });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Join team error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
