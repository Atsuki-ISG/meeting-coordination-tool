import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug');
  const id = searchParams.get('id');

  const supabase = await createServiceClient();

  // Get single event type by slug or id (public)
  if (slug || id) {
    const query = supabase
      .from('event_types')
      .select('*')
      .eq('is_active', true);

    if (slug) {
      query.eq('slug', slug);
    } else if (id) {
      query.eq('id', id);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Event type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  }

  // Get all event types (requires authentication)
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

  // Get all event types in the team
  const { data, error } = await supabase
    .from('event_types')
    .select(`
      *,
      organizer:members!event_types_organizer_id_fkey(id, name, email)
    `)
    .eq('team_id', user.teamId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch event types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event types' },
      { status: 500 }
    );
  }

  return NextResponse.json(data || []);
}

const createEventTypeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.union([z.string(), z.number()]).transform((val) => Number(val)),
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

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = createEventTypeSchema.parse(body);

    const supabase = await createServiceClient();

    // Generate slug
    const baseSlug = validatedData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const slug = `${baseSlug}-${randomSuffix}`;

    // Create event type with team_id
    const { data: eventType, error: createError } = await supabase
      .from('event_types')
      .insert({
        title: validatedData.title,
        description: validatedData.description || null,
        duration_minutes: validatedData.durationMinutes,
        participation_mode: validatedData.participationMode || 'all_required',
        include_note_takers: validatedData.includeNoteTakers ?? false,
        calendar_title_template: validatedData.calendarTitleTemplate || '{メニュー名} - {予約者名}',
        time_restriction_type: validatedData.timeRestrictionType || 'none',
        time_restriction_preset_id: validatedData.timeRestrictionPresetId || null,
        time_restriction_custom: validatedData.timeRestrictionCustom || null,
        slug,
        organizer_id: user.memberId,
        team_id: user.teamId,
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create event type:', createError);
      return NextResponse.json(
        { error: 'Failed to create event type' },
        { status: 500 }
      );
    }

    // Add members to event type
    if (validatedData.memberIds && validatedData.memberIds.length > 0) {
      const memberInserts = validatedData.memberIds.map((memberId) => ({
        event_type_id: eventType.id,
        member_id: memberId,
      }));

      const { error: membersError } = await supabase
        .from('event_type_members')
        .insert(memberInserts);

      if (membersError) {
        console.error('Failed to add members to event type:', membersError);
      }
    }

    return NextResponse.json(eventType, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Create event type error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
