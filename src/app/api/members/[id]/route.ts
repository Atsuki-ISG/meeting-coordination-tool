import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/api';

const updateMemberSchema = z.object({
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateMemberSchema.parse(body);

    const supabase = await createServiceClient();

    // Authorization: only a team admin may change another member's active state,
    // and only for members of their own team. Without this any logged-in user
    // could deactivate arbitrary members across teams (IDOR).
    const { data: currentMember } = await supabase
      .from('members')
      .select('team_id, role')
      .eq('id', user.memberId)
      .single();

    if (!currentMember?.team_id || currentMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admin can update members' },
        { status: 403 }
      );
    }

    if (id === user.memberId) {
      return NextResponse.json(
        { error: 'Cannot change your own active state' },
        { status: 400 }
      );
    }

    const { data: targetMember } = await supabase
      .from('members')
      .select('team_id')
      .eq('id', id)
      .single();

    if (!targetMember || targetMember.team_id !== currentMember.team_id) {
      return NextResponse.json(
        { error: 'Member not found in your team' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (validatedData.isActive !== undefined) {
      updateData.is_active = validatedData.isActive;
    }

    const { data, error } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update member:', error);
      return NextResponse.json(
        { error: 'Failed to update member' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Update member error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const supabase = await createServiceClient();

  // Only allow viewing members within the caller's own team.
  const { data: currentMember } = await supabase
    .from('members')
    .select('team_id')
    .eq('id', user.memberId)
    .single();

  if (!currentMember?.team_id) {
    return NextResponse.json(
      { error: 'Not a team member' },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from('members')
    .select('id, name, email, is_active, created_at, team_id')
    .eq('id', id)
    .single();

  if (error || !data || data.team_id !== currentMember.team_id) {
    return NextResponse.json(
      { error: 'Member not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
