import { NextRequest, NextResponse } from 'next/server';
import { addDays } from 'date-fns';
import { createServiceClient } from '@/lib/supabase/server';
import { calculateAvailability } from '@/lib/availability/calculator';
import {
  getFreeBusy,
  createCalendarClient,
  refreshAccessToken,
} from '@/lib/google-calendar/client';
import type { BusySlot, Member, WeeklyAvailability } from '@/types';
import { DEFAULT_AVAILABILITY } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventTypeId = searchParams.get('eventTypeId');
    const daysAhead = parseInt(searchParams.get('daysAhead') || '14', 10);

    if (!eventTypeId) {
      return NextResponse.json(
        { error: 'eventTypeId is required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Get event type with members
    const { data: eventType, error: eventTypeError } = await supabase
      .from('event_types')
      .select('*, organizer:members!event_types_organizer_id_fkey(*)')
      .eq('id', eventTypeId)
      .eq('is_active', true)
      .single();

    if (eventTypeError || !eventType) {
      return NextResponse.json(
        { error: 'Event type not found' },
        { status: 404 }
      );
    }

    // Get event type members
    const { data: eventTypeMembers } = await supabase
      .from('event_type_members')
      .select('member_id')
      .eq('event_type_id', eventTypeId);

    const memberIds = eventTypeMembers?.map((m) => m.member_id) || [];
    // Include organizer
    if (!memberIds.includes(eventType.organizer_id)) {
      memberIds.push(eventType.organizer_id);
    }

    // Get members with calendar access
    const { data: members } = await supabase
      .from('members')
      .select('*')
      .in('id', memberIds)
      .eq('is_active', true)
      .not('google_refresh_token', 'is', null);

    if (!members || members.length === 0) {
      return NextResponse.json(
        { error: 'No members with calendar access' },
        { status: 400 }
      );
    }

    // Calculate date range
    const timeMin = new Date();
    const timeMax = addDays(timeMin, daysAhead);

    // Get busy times for all members
    const busySlotsArrays: BusySlot[][] = [];

    for (const member of members) {
      try {
        // Refresh access token if needed
        const { accessToken } = await refreshAccessToken(
          member.google_refresh_token!
        );

        const calendar = createCalendarClient(accessToken);
        const busySlots = await getFreeBusy(
          calendar,
          'primary',
          timeMin,
          timeMax
        );
        busySlotsArrays.push(busySlots);
      } catch (error) {
        console.error(`Failed to get busy times for member ${member.id}:`, error);
        // Continue with other members
      }
    }

    // Get organizer's availability settings
    const organizer = eventType.organizer as Member;
    const weeklyAvailability: WeeklyAvailability =
      organizer.availability_settings || DEFAULT_AVAILABILITY;

    // Calculate available slots
    const availableSlots = calculateAvailability(
      busySlotsArrays,
      { start: timeMin, end: timeMax },
      eventType.duration_minutes,
      { weeklyAvailability }
    );

    // Log API usage
    await supabase.from('api_usage_logs').insert({
      endpoint: 'availability',
      member_id: eventType.organizer_id,
      request_count: members.length, // Count FreeBusy API calls
    });

    return NextResponse.json({
      slots: availableSlots,
      timezone: 'Asia/Tokyo',
      eventType: {
        title: eventType.title,
        description: eventType.description,
        durationMinutes: eventType.duration_minutes,
      },
    });
  } catch (error) {
    console.error('Availability API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
