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
  participationMode: z.enum(['all_required', 'any_available']).optional(),
  includeNoteTakers: z.boolean().optional(),
  calendarTitleTemplate: z.string().optional(),
  timeRestrictionType: z.enum(['none', 'preset', 'custom']).optional(),
  timeRestrictionPresetId: z.string().uuid().optional().nullable(),
  timeRestrictionCustom: z.object({
    days: z.array(z.number().min(0).max(6)),
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    end_time: z.string().regex(/^\d{2}:\d{2}$/),
  }).optional().nullable(),
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

    const { data: existing } = await supabase
      .from('event_types')
      .select('team_id, organizer_id')
      .eq('id', id)
      .single();

    if (!existing || existing.team_id !== user.teamId) {
      return NextResponse.json(
        { error: 'Event type not found' },
        { status: 404 }
      );
    }

    // Only owner or admin can edit
    const isOwner = existing.organizer_id === user.memberId;
    if (!isOwner) {
      const { data: member } = await supabase
        .from('members')
        .select('role')
        .eq('id', user.memberId)
        .single();
      if (member?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.durationMinutes !== undefined) updateData.duration_minutes = validatedData.durationMinutes;
    if (validatedData.isActive !== undefined) updateData.is_active = validatedData.isActive;
    if (validatedData.participationMode !== undefined) updateData.participation_mode = validatedData.participationMode;
    if (validatedData.includeNoteTakers !== undefined) updateData.include_note_takers = validatedData.includeNoteTakers;
    if (validatedData.calendarTitleTemplate !== undefined) updateData.calendar_title_template = validatedData.calendarTitleTemplate;
    if (validatedData.timeRestrictionType !== undefined) updateData.time_restriction_type = validatedData.timeRestrictionType;
    if (validatedData.timeRestrictionPresetId !== undefined) updateData.time_restriction_preset_id = validatedData.timeRestrictionPresetId;
    if (validatedData.timeRestrictionCustom !== undefined) updateData.time_restriction_custom = validatedData.timeRestrictionCustom;

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

    const { data: existing } = await supabase
      .from('event_types')
      .select('team_id, organizer_id')
      .eq('id', id)
      .single();

    if (!existing || existing.team_id !== user.teamId) {
      return NextResponse.json(
        { error: 'Event type not found' },
        { status: 404 }
      );
    }

    // Only owner or admin can delete
    const isOwner = existing.organizer_id === user.memberId;
    if (!isOwner) {
      const { data: member } = await supabase
        .from('members')
        .select('role')
        .eq('id', user.memberId)
        .single();
      if (member?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
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
