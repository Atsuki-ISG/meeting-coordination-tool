import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/api';
import { isSlotAvailable } from '@/lib/availability/calculator';
import {
  createCalendarClient,
  createCalendarEvent,
  refreshAccessToken,
  getFreeBusy,
} from '@/lib/google-calendar/client';
import { generateToken, hashToken } from '@/lib/utils/token';
import {
  isShortTermRateLimited,
  isMonthlyLimitExceeded,
  getClientIp,
  invalidateMonthlyCache,
} from '@/lib/rate-limit';
import type { BusySlot } from '@/types';

export async function GET(request: NextRequest) {
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

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const upcoming = searchParams.get('upcoming') === 'true';

  const supabase = await createServiceClient();

  // Get event types for the team
  const { data: eventTypes } = await supabase
    .from('event_types')
    .select('id')
    .eq('team_id', user.teamId);

  const eventTypeIds = eventTypes?.map((et) => et.id) || [];

  if (eventTypeIds.length === 0) {
    return NextResponse.json([]);
  }

  let query = supabase
    .from('bookings')
    .select(`
      *,
      event_type:event_types(id, title, slug, duration_minutes)
    `)
    .in('event_type_id', eventTypeIds)
    .order('start_at', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  if (upcoming) {
    query = query.gte('start_at', new Date().toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }

  return NextResponse.json(data || []);
}

const createBookingSchema = z.object({
  eventTypeId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  name: z.string().min(1),
  email: z.string().email(),
  companyName: z.string().optional(),
  note: z.string().min(1, 'ご相談内容・備考は必須です'),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit check: Short-term (IP-based)
    const clientIp = getClientIp(request.headers);
    if (isShortTermRateLimited(clientIp)) {
      return NextResponse.json(
        { error: 'リクエストが多すぎます。しばらく待ってから再試行してください。' },
        { status: 429 }
      );
    }

    // Rate limit check: Monthly usage
    const monthlyLimit = await isMonthlyLimitExceeded();
    if (monthlyLimit.exceeded) {
      return NextResponse.json(
        { error: '月間API上限に達しました。管理者にお問い合わせください。' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validatedData = createBookingSchema.parse(body);

    const supabase = await createServiceClient();

    // Check maintenance mode
    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single();

    if (settings?.value?.enabled) {
      return NextResponse.json(
        { error: settings.value.message || 'Service is temporarily unavailable' },
        { status: 503 }
      );
    }

    // Get event type with organizer
    const { data: eventType, error: eventTypeError } = await supabase
      .from('event_types')
      .select('*, organizer:members!event_types_organizer_id_fkey(*)')
      .eq('id', validatedData.eventTypeId)
      .eq('is_active', true)
      .single();

    if (eventTypeError || !eventType) {
      return NextResponse.json(
        { error: 'Event type not found' },
        { status: 404 }
      );
    }

    // Get all members for this event type
    const { data: eventTypeMembers } = await supabase
      .from('event_type_members')
      .select('member_id')
      .eq('event_type_id', validatedData.eventTypeId);

    const memberIds = eventTypeMembers?.map((m) => m.member_id) || [];
    if (!memberIds.includes(eventType.organizer_id)) {
      memberIds.push(eventType.organizer_id);
    }

    // Get note-taker emails only if this event type opts in
    let noteTakerEmails: string[] = [];
    if (eventType.include_note_takers) {
      const { data: noteTakers } = await supabase
        .from('members')
        .select('email')
        .eq('is_active', true)
        .eq('team_id', eventType.team_id)
        .eq('is_note_taker', true)
        .not('google_refresh_token', 'is', null);
      noteTakerEmails = (noteTakers || []).map((m) => m.email);
    }

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

    // Re-check availability before booking (prevent race conditions)
    const slot = {
      start: new Date(validatedData.startAt),
      end: new Date(validatedData.endAt),
    };

    const busySlotsArrays: BusySlot[][] = [];

    for (const member of members) {
      try {
        const { accessToken } = await refreshAccessToken(
          member.google_refresh_token!
        );
        const calendar = createCalendarClient(accessToken);
        const busySlots = await getFreeBusy(
          calendar,
          'primary',
          slot.start,
          slot.end
        );
        busySlotsArrays.push(busySlots);
      } catch (error) {
        console.error(`Failed to check availability for member ${member.id}:`, error);
      }
    }

    if (!isSlotAvailable(slot, busySlotsArrays)) {
      return NextResponse.json(
        { error: 'Selected time slot is no longer available' },
        { status: 409 }
      );
    }

    // Get organizer's access token to create the event
    const organizer = members.find((m) => m.id === eventType.organizer_id);
    if (!organizer) {
      return NextResponse.json(
        { error: 'Organizer not found' },
        { status: 400 }
      );
    }

    const { accessToken } = await refreshAccessToken(
      organizer.google_refresh_token!
    );
    const calendar = createCalendarClient(accessToken);

    // --- イベント1: チーム内部用（備考・会社名含む）---
    const internalAttendees = [
      ...members.map((m) => m.email),
      ...noteTakerEmails.filter((e) => !members.some((m) => m.email === e)),
    ];

    const companyLine = validatedData.companyName
      ? `\n【会社名】\n${validatedData.companyName}`
      : '';

    // Generate calendar title from template (supports both Japanese and legacy English variables)
    const calendarTitle = (eventType.calendar_title_template || '{メニュー名} - {予約者名}')
      .replace('{予約者名}', validatedData.name)
      .replace('{メール}', validatedData.email)
      .replace('{メニュー名}', eventType.title)
      .replace('{日付}', slot.start.toLocaleDateString('ja-JP'))
      .replace('{時刻}', slot.start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }))
      .replace('{備考}', validatedData.note.substring(0, 50))
      // Legacy English variables for backward compatibility
      .replace('{guest_name}', validatedData.name)
      .replace('{guest_email}', validatedData.email)
      .replace('{event_type}', eventType.title)
      .replace('{date}', slot.start.toLocaleDateString('ja-JP'))
      .replace('{time}', slot.start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }))
      .replace('{notes}', validatedData.note.substring(0, 50));

    const { eventId: googleEventId, meetLink } = await createCalendarEvent(calendar, {
      summary: calendarTitle,
      description: `${validatedData.name} 様からのご予約${companyLine}\n\n【ご相談内容・備考】\n${validatedData.note}`,
      start: slot.start,
      end: slot.end,
      attendees: internalAttendees,
      organizerEmail: organizer.email,
      addMeetLink: true,
    });

    // --- イベント2: ゲスト用（備考なし、Meet リンクのみ）---
    const guestDescription = meetLink
      ? `Google Meet: ${meetLink}`
      : undefined;

    try {
      await createCalendarEvent(calendar, {
        summary: eventType.title,
        description: guestDescription,
        start: slot.start,
        end: slot.end,
        attendees: [validatedData.email],
        organizerEmail: organizer.email,
        addMeetLink: false,
      });
    } catch (err) {
      console.error('Failed to create guest calendar event:', err);
      // ゲスト用イベントの失敗は予約全体を止めない
    }

    // Generate cancel token
    const cancelToken = generateToken();
    const cancelTokenHash = await hashToken(cancelToken);

    // Create booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        event_type_id: validatedData.eventTypeId,
        google_event_id: googleEventId,
        start_at: validatedData.startAt,
        end_at: validatedData.endAt,
        requester_name: validatedData.name,
        requester_email: validatedData.email,
        company_name: validatedData.companyName || null,
        note: validatedData.note,
        cancel_token_hash: cancelTokenHash,
        status: 'confirmed',
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Failed to create booking record:', bookingError);
      // TODO: Consider rolling back the calendar event
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      );
    }

    // Log API usage
    await supabase.from('api_usage_logs').insert({
      endpoint: 'bookings/create',
      member_id: eventType.organizer_id,
      request_count: members.length + 1, // FreeBusy calls + event creation
    });

    // Invalidate monthly cache after logging
    invalidateMonthlyCache();

    // Build cancel URL
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/cancel/${cancelToken}?bookingId=${booking.id}`;

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        startAt: booking.start_at,
        endAt: booking.end_at,
        eventTitle: eventType.title,
      },
      cancelUrl,
      meetLink,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Booking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
