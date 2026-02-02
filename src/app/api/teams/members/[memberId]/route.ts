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

  // Remove member from team
  const { error } = await supabase
    .from('members')
    .update({ team_id: null, role: 'member' })
    .eq('id', memberId);

  if (error) {
    console.error('Failed to remove member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }

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
  const { role } = body;

  if (!role || !['admin', 'member'].includes(role)) {
    return NextResponse.json(
      { error: 'Invalid role' },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  // Check if current user is admin
  const { data: currentMember } = await supabase
    .from('members')
    .select('team_id, role')
    .eq('id', user.memberId)
    .single();

  if (!currentMember?.team_id || currentMember.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admin can change roles' },
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

  // Update role
  const { error } = await supabase
    .from('members')
    .update({ role })
    .eq('id', memberId);

  if (error) {
    console.error('Failed to update role:', error);
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
