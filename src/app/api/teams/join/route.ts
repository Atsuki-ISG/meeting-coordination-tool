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

    // Check if user already belongs to a team
    const { data: existingMember } = await supabase
      .from('members')
      .select('team_id')
      .eq('id', user.memberId)
      .single();

    if (existingMember?.team_id) {
      return NextResponse.json(
        { error: 'Already belongs to a team' },
        { status: 400 }
      );
    }

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

    // Update member with team_id
    const { error: updateError } = await supabase
      .from('members')
      .update({ team_id: team.id })
      .eq('id', user.memberId);

    if (updateError) {
      console.error('Failed to join team:', updateError);
      return NextResponse.json(
        { error: 'Failed to join team' },
        { status: 500 }
      );
    }

    // Update session with team_id
    await createSession({
      memberId: user.memberId,
      email: user.email,
      name: user.name,
      teamId: team.id,
      status: user.status,
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
