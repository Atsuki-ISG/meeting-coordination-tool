import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';

const updateMemberSchema = z.object({
  status: z.enum(['active', 'suspended']).optional(),
  is_system_admin: z.boolean().optional(),
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
