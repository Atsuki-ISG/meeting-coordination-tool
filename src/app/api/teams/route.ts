import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/api';
import { createSession } from '@/lib/auth/session';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const createTeamSchema = z.object({
  name: z.string().min(1, 'チーム名を入力してください'),
});

// Create a new team
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
    const validatedData = createTeamSchema.parse(body);

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

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('teams')
        .select('id')
        .eq('invite_code', inviteCode)
        .single();

      if (!existing) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    // Create team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: validatedData.name,
        invite_code: inviteCode,
        created_by: user.memberId,
      })
      .select()
      .single();

    if (teamError) {
      console.error('Failed to create team:', teamError);
      return NextResponse.json(
        { error: 'Failed to create team' },
        { status: 500 }
      );
    }

    // Update member with team_id
    await supabase
      .from('members')
      .update({ team_id: team.id })
      .eq('id', user.memberId);

    // Update any existing event_types to belong to this team
    await supabase
      .from('event_types')
      .update({ team_id: team.id })
      .eq('organizer_id', user.memberId);

    // Update session with team_id
    await createSession({
      memberId: user.memberId,
      email: user.email,
      name: user.name,
      teamId: team.id,
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Create team error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get current user's team
export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabase = await createServiceClient();

  const { data: member } = await supabase
    .from('members')
    .select('team_id, role')
    .eq('id', user.memberId)
    .single();

  if (!member?.team_id) {
    return NextResponse.json({ team: null, role: null });
  }

  const { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', member.team_id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    );
  }

  // Hide invite_code for non-admin members
  const teamData = member.role === 'admin'
    ? team
    : { ...team, invite_code: undefined };

  return NextResponse.json({ team: teamData, role: member.role });
}

// Update team (admin only)
export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabase = await createServiceClient();

  // Check if user is admin
  const { data: member } = await supabase
    .from('members')
    .select('team_id, role')
    .eq('id', user.memberId)
    .single();

  if (!member?.team_id || member.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admin can update team' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json(
      { error: 'Team name is required' },
      { status: 400 }
    );
  }

  const { data: team, error } = await supabase
    .from('teams')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', member.team_id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update team:', error);
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }

  return NextResponse.json({ team });
}

// Delete team (admin only)
export async function DELETE() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabase = await createServiceClient();

  // Check if user is admin
  const { data: member } = await supabase
    .from('members')
    .select('team_id, role')
    .eq('id', user.memberId)
    .single();

  if (!member?.team_id || member.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admin can delete team' },
      { status: 403 }
    );
  }

  const teamId = member.team_id;

  // Remove team_id from all members
  await supabase
    .from('members')
    .update({ team_id: null, role: 'member' })
    .eq('team_id', teamId);

  // Delete event_types belonging to this team
  await supabase
    .from('event_types')
    .delete()
    .eq('team_id', teamId);

  // Delete the team
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (error) {
    console.error('Failed to delete team:', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }

  // Update session to remove teamId
  await createSession({
    memberId: user.memberId,
    email: user.email,
    name: user.name,
    teamId: null,
  });

  return NextResponse.json({ success: true });
}
