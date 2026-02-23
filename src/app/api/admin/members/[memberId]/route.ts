import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';

const updateMemberSchema = z.object({
  status: z.enum(['active', 'suspended']).optional(),
  is_system_admin: z.boolean().optional(),
  team_id: z.string().uuid().nullable().optional(),
  role: z.enum(['admin', 'member']).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.isSystemAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { memberId } = await params;
    const body = await request.json();
    const validatedData = updateMemberSchema.parse(body);

    const supabase = await createServiceClient();

    // Prevent removing your own system admin status
    if (
      memberId === session.memberId &&
      validatedData.is_system_admin === false
    ) {
      return NextResponse.json(
        { error: '自分自身のシステム管理者権限を解除することはできません' },
        { status: 400 }
      );
    }

    // Prevent suspending yourself
    if (
      memberId === session.memberId &&
      validatedData.status === 'suspended'
    ) {
      return NextResponse.json(
        { error: '自分自身を停止することはできません' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
    }

    if (validatedData.is_system_admin !== undefined) {
      updateData.is_system_admin = validatedData.is_system_admin;
    }

    if (validatedData.team_id !== undefined) {
      updateData.team_id = validatedData.team_id;
      // チームに追加する場合は自動的に有効化
      if (validatedData.team_id !== null) {
        updateData.status = 'active';
        updateData.is_active = true;
      }
    }

    if (validatedData.role !== undefined) {
      updateData.role = validatedData.role;
    }

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

    // team_id が指定された場合は team_memberships も更新
    if (validatedData.team_id) {
      const { error: membershipError } = await supabase
        .from('team_memberships')
        .upsert(
          {
            member_id: memberId,
            team_id: validatedData.team_id,
            role: validatedData.role ?? 'member',
          },
          { onConflict: 'member_id,team_id' }
        );

      if (membershipError) {
        console.error('Failed to upsert team_memberships:', membershipError);
        return NextResponse.json(
          { error: 'Failed to update team membership' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Admin member update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
