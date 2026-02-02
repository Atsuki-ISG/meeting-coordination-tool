import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/api';
import type { WeeklyAvailability } from '@/types';
import { DEFAULT_AVAILABILITY } from '@/types';

const dayAvailabilitySchema = z.object({
  enabled: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const weeklyAvailabilitySchema = z.object({
  "0": dayAvailabilitySchema,
  "1": dayAvailabilitySchema,
  "2": dayAvailabilitySchema,
  "3": dayAvailabilitySchema,
  "4": dayAvailabilitySchema,
  "5": dayAvailabilitySchema,
  "6": dayAvailabilitySchema,
});

export async function GET() {
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

  const supabase = await createServiceClient();

  const { data: member, error } = await supabase
    .from('members')
    .select('availability_settings')
    .eq('id', user.memberId)
    .single();

  if (error) {
    console.error('Failed to fetch availability settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    availability: member.availability_settings || DEFAULT_AVAILABILITY,
  });
}

export async function PUT(request: NextRequest) {
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

  try {
    const body = await request.json();
    const validatedData = weeklyAvailabilitySchema.parse(body);

    const supabase = await createServiceClient();

    const { error } = await supabase
      .from('members')
      .update({
        availability_settings: validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.memberId);

    if (error) {
      console.error('Failed to update availability settings:', error);
      return NextResponse.json(
        { error: 'Failed to update settings' },
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

    console.error('Update availability error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
