import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/api';

// Remove member from team (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { memberId } = await params;
  const supabase = await createServiceClient();

  // Check if current user is admin
  const { data: currentMember } = await supabase
    .from('members')
    .select('team_id, role')
    .eq('id', user.memberId)
    .single();

  if (!currentMember?.team_id || currentMember.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admin can remove members' },
      { status: 403 }
    );
  }

  // Can't remove yourself
  if (memberId === user.memberId) {
    return NextResponse.json(
      { error: 'Cannot remove yourself' },
      { status: 400 }
    );
  }

  // Check if target member belongs to the same team
  const { data: targetMember } = await supabase
    .from('members')
    .select('team_id')
    .eq('id', memberId)
    .single();

  if (!targetMember || targetMember.team_id !== currentMember.team_id) {
    return NextResponse.json(
      { error: 'Member not found in your team' },
      { status: 404 }
    );
  }

  // Remove from team_memberships
  const { error } = await supabase
    .from('team_memberships')
    .delete()
    .eq('member_id', memberId)
    .eq('team_id', currentMember.team_id);

  if (error) {
    console.error('Failed to remove member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }

  // If this was their active team, switch to another or null
  const { data: nextMembership } = await supabase
    .from('team_memberships')
    .select('team_id, role')
    .eq('member_id', memberId)
    .order('joined_at', { ascending: true })
    .limit(1)
    .single();

  await supabase
    .from('members')
    .update({
      team_id: nextMembership?.team_id ?? null,
      role: nextMembership?.role ?? 'member',
    })
    .eq('id', memberId)
    .eq('team_id', currentMember.team_id); // only update if this team was active

  return NextResponse.json({ success: true });
}

// Update member role (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { memberId } = await params;
  const body = await request.json();
  const { role, isNoteTaker } = body;

  if (role !== undefined && !['admin', 'member'].includes(role)) {
    return NextResponse.json(
      { error: 'Invalid role' },
      { status: 400 }
    );
  }

  if (role === undefined && isNoteTaker === undefined) {
    return NextResponse.json(
      { error: 'Nothing to update' },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  // Check current user's team and role
  const { data: currentMember } = await supabase
    .from('members')
    .select('team_id, role')
    .eq('id', user.memberId)
    .single();

  if (!currentMember?.team_id) {
    return NextResponse.json(
      { error: 'Not a team member' },
      { status: 403 }
    );
  }

  const isAdmin = currentMember.role === 'admin';
  const isSelf = memberId === user.memberId;

  // Non-admin can only update their own is_note_taker flag
  if (!isAdmin && !(isSelf && isNoteTaker !== undefined && role === undefined)) {
    return NextResponse.json(
      { error: 'Only admin can change other member settings' },
      { status: 403 }
    );
  }

  // Check if target member belongs to the same team
  const { data: targetMember } = await supabase
    .from('members')
    .select('team_id')
    .eq('id', memberId)
    .single();

  if (!targetMember || targetMember.team_id !== currentMember.team_id) {
    return NextResponse.json(
      { error: 'Member not found in your team' },
      { status: 404 }
    );
  }

  // Build update object
  const updateData: Record<string, unknown> = {};
  if (role !== undefined) updateData.role = role;
  if (isNoteTaker !== undefined) updateData.is_note_taker = isNoteTaker;

  const { error } = await supabase
    .from('members')
    .update(updateData)
    .eq('id', memberId);

  if (error) {
    console.error('Failed to update member:', error);
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }

  // Sync role change to team_memberships
  if (role !== undefined) {
    await supabase
      .from('team_memberships')
      .update({ role })
      .eq('member_id', memberId)
      .eq('team_id', currentMember.team_id);
  }

  return NextResponse.json({ success: true });
}
