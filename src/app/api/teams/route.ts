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

    // Add to team_memberships
    await supabase
      .from('team_memberships')
      .upsert({ member_id: user.memberId, team_id: team.id, role: 'admin' });

    // Switch active team to the newly created one
    await supabase
      .from('members')
      .update({ team_id: team.id, role: 'admin' })
      .eq('id', user.memberId);

    // Update session with team_id
    await createSession({
      memberId: user.memberId,
      email: user.email,
      name: user.name,
      teamId: team.id,
      status: user.status,
      isSystemAdmin: user.isSystemAdmin,
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

  return NextResponse.json({ team: teamData, role: member.role, memberId: user.memberId });
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

  // Get all members of this team from team_memberships
  const { data: teamMemberships } = await supabase
    .from('team_memberships')
    .select('member_id')
    .eq('team_id', teamId);

  // Remove team_memberships for this team
  await supabase
    .from('team_memberships')
    .delete()
    .eq('team_id', teamId);

  // For each member whose active team was this team, switch to another or null
  if (teamMemberships && teamMemberships.length > 0) {
    for (const { member_id } of teamMemberships) {
      const { data: nextMembership } = await supabase
        .from('team_memberships')
        .select('team_id, role')
        .eq('member_id', member_id)
        .order('joined_at', { ascending: true })
        .limit(1)
        .single();

      await supabase
        .from('members')
        .update({
          team_id: nextMembership?.team_id ?? null,
          role: nextMembership?.role ?? 'member',
        })
        .eq('id', member_id)
        .eq('team_id', teamId); // only update if this was their active team
    }
  }

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
    status: user.status,
    isSystemAdmin: user.isSystemAdmin,
  });

  return NextResponse.json({ success: true });
}
