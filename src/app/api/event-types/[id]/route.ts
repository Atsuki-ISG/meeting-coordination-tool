import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/api';

const updateEventTypeSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  durationMinutes: z.number().optional(),
  isActive: z.boolean().optional(),
  memberIds: z.array(z.string().uuid()).optional(),
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

    if (!user.teamId) {
      return NextResponse.json(
        { error: 'Team required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateEventTypeSchema.parse(body);

    const supabase = await createServiceClient();

    // Check team membership (any team member can edit team's event types)
    const { data: existing } = await supabase
      .from('event_types')
      .select('team_id')
      .eq('id', id)
      .single();

    if (!existing || existing.team_id !== user.teamId) {
      return NextResponse.json(
        { error: 'Event type not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.durationMinutes !== undefined) updateData.duration_minutes = validatedData.durationMinutes;
    if (validatedData.isActive !== undefined) updateData.is_active = validatedData.isActive;

    const { data, error } = await supabase
      .from('event_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update event type:', error);
      return NextResponse.json(
        { error: 'Failed to update event type' },
        { status: 500 }
      );
    }

    // Update members if provided
    if (validatedData.memberIds !== undefined) {
      // Delete existing members
      const { error: deleteError } = await supabase
        .from('event_type_members')
        .delete()
        .eq('event_type_id', id);

      if (deleteError) {
        console.error('Failed to delete existing members:', deleteError);
      }

      // Insert new members
      if (validatedData.memberIds.length > 0) {
        const memberInserts = validatedData.memberIds.map((memberId) => ({
          event_type_id: id,
          member_id: memberId,
        }));

        const { error: insertError } = await supabase
          .from('event_type_members')
          .insert(memberInserts);

        if (insertError) {
          console.error('Failed to add members to event type:', insertError);
        }
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Update event type error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    if (!user.teamId) {
      return NextResponse.json(
        { error: 'Team required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const supabase = await createServiceClient();

    // Check team membership (any team member can delete team's event types)
    const { data: existing } = await supabase
      .from('event_types')
      .select('team_id')
      .eq('id', id)
      .single();

    if (!existing || existing.team_id !== user.teamId) {
      return NextResponse.json(
        { error: 'Event type not found' },
        { status: 404 }
      );
    }

    // Delete event type (bookings will be handled by ON DELETE CASCADE if set up)
    const { error } = await supabase
      .from('event_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete event type:', error);
      return NextResponse.json(
        { error: 'Failed to delete event type' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete event type error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
