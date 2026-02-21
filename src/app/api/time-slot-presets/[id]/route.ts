import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/api';

const updatePresetSchema = z.object({
  name: z.string().min(1).optional(),
  days: z.array(z.number().min(0).max(6)).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  color: z.string().optional(),
});

// PATCH update preset (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();

    if (!user || !user.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createServiceClient();

    // Check if user is admin
    const { data: member } = await supabase
      .from('members')
      .select('role')
      .eq('id', user.memberId)
      .single();

    if (member?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    // Verify preset belongs to user's team
    const { data: existing } = await supabase
      .from('time_slot_presets')
      .select('team_id')
      .eq('id', id)
      .single();

    if (!existing || existing.team_id !== user.teamId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updatePresetSchema.parse(body);

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.days !== undefined) updateData.days = validatedData.days;
    if (validatedData.start_time !== undefined) updateData.start_time = validatedData.start_time;
    if (validatedData.end_time !== undefined) updateData.end_time = validatedData.end_time;
    if (validatedData.color !== undefined) updateData.color = validatedData.color;

    const { data, error } = await supabase
      .from('time_slot_presets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update preset:', error);
      return NextResponse.json({ error: 'Failed to update preset' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }
    console.error('Update preset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE preset (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();

    if (!user || !user.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createServiceClient();

    // Check if user is admin
    const { data: member } = await supabase
      .from('members')
      .select('role')
      .eq('id', user.memberId)
      .single();

    if (member?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    // Verify preset belongs to user's team
    const { data: existing } = await supabase
      .from('time_slot_presets')
      .select('team_id')
      .eq('id', id)
      .single();

    if (!existing || existing.team_id !== user.teamId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Clear references in event_types before deleting (handled by ON DELETE SET NULL)
    const { error } = await supabase
      .from('time_slot_presets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete preset:', error);
      return NextResponse.json({ error: 'Failed to delete preset' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete preset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
