import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/api';
import { isSlotAvailable, isSlotWithinBookableWindow } from '@/lib/availability/calculator';
import {
  createCalendarClient,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
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
import { assignMember } from '@/lib/booking/assign-member';
import type { Member, WeeklyAvailability, TimeRestrictionCustom } from '@/types';
import { DEFAULT_AVAILABILITY } from '@/types';

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
      event_type:event_types(id, title, slug, duration_minutes),
      assigned_member:members!bookings_assigned_member_id_fkey(id, name, email)
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
  name: z.string().min(1).max(100),
  email: z.string().email().max(254),
  companyName: z.string().min(1, '会社名は必須です').max(200),
  phoneNumber: z.string().min(1, '電話番号は必須です').max(50),
  note: z.string().min(1, 'ご相談内容・備考は必須です').max(2000),
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

    // Get note-taker email if a specific member is designated
    let noteTakerEmails: string[] = [];
    if (eventType.note_taker_member_id) {
      const { data: noteTaker } = await supabase
        .from('members')
        .select('email')
        .eq('id', eventType.note_taker_member_id)
        .eq('is_active', true)
        .single();
      if (noteTaker) noteTakerEmails = [noteTaker.email];
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

    // Server-side validation of the requested slot. The client availability list
    // is not a trust boundary: this POST can be called directly with arbitrary
    // times, so re-validate duration, notice period, working hours and the
    // event type's time restriction here.
    const durationMs = eventType.duration_minutes * 60 * 1000;
    if (slot.end.getTime() - slot.start.getTime() !== durationMs) {
      return NextResponse.json(
        { error: '予約時間の長さが不正です。' },
        { status: 400 }
      );
    }

    // Resolve the event type's time restriction (same logic as availability API)
    let timeRestriction: TimeRestrictionCustom | null = null;
    if (
      eventType.time_restriction_type === 'preset' &&
      eventType.time_restriction_preset_id
    ) {
      const { data: preset } = await supabase
        .from('time_slot_presets')
        .select('days, start_time, end_time')
        .eq('id', eventType.time_restriction_preset_id)
        .single();
      if (preset) {
        timeRestriction = {
          days: preset.days,
          start_time: preset.start_time,
          end_time: preset.end_time,
        };
      }
    } else if (
      eventType.time_restriction_type === 'custom' &&
      eventType.time_restriction_custom
    ) {
      timeRestriction = eventType.time_restriction_custom as TimeRestrictionCustom;
    }

    const weeklyAvailability: WeeklyAvailability =
      (eventType.organizer as Member | null)?.availability_settings ||
      DEFAULT_AVAILABILITY;

    if (
      !isSlotWithinBookableWindow(slot, {
        weeklyAvailability,
        minBookingNoticeMinutes: eventType.min_notice_minutes ?? 60,
        timeRestriction,
      })
    ) {
      return NextResponse.json(
        { error: '選択された日時は予約を受け付けていません。' },
        { status: 400 }
      );
    }

    // Check each member individually so we know who is free
    const availableMembers: Member[] = [];

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
        if (isSlotAvailable(slot, [busySlots])) {
          availableMembers.push(member);
        }
      } catch (error) {
        console.error(`Failed to check availability for member ${member.id}:`, error);
      }
    }

    if (eventType.participation_mode === 'all_required') {
      if (availableMembers.length !== members.length) {
        return NextResponse.json(
          { error: 'Selected time slot is no longer available' },
          { status: 409 }
        );
      }
    } else {
      // any_available: at least one member must be free
      if (availableMembers.length === 0) {
        return NextResponse.json(
          { error: 'Selected time slot is no longer available' },
          { status: 409 }
        );
      }
    }

    // Decide the assigned member for any_available mode
    let assignedMember: Member | null = null;
    if (eventType.participation_mode === 'any_available') {
      assignedMember = await assignMember(supabase, {
        eventTypeId: eventType.id,
        strategy: (eventType.assignment_strategy as 'balanced' | 'priority') || 'balanced',
        availableMembers,
      });
      if (!assignedMember) {
        return NextResponse.json(
          { error: 'Failed to assign member' },
          { status: 500 }
        );
      }
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

    // --- イベント1: ゲスト用（Meetリンク発行）---
    // 日時は JST 固定で整形する（Cloud Run は UTC のため timeZone 指定が無いと9時間ズレる）
    const dateStr = slot.start.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const timeStr = slot.start.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo',
    });
    const noteExcerpt = validatedData.note.substring(0, 50);
    // 全変数を1パスで置換する。逐次 .replace だと (1) 各変数の最初の1回しか置換されず、
    // (2) ゲスト入力中の {メニュー名} 等が後段で再置換される問題があるため、正規表現で一括処理する。
    const applyTemplate = (template: string, meetUrl: string) => {
      const vars: Record<string, string> = {
        '予約者名': validatedData.name,
        'メール': validatedData.email,
        'メニュー名': eventType.title,
        '会社名': validatedData.companyName,
        '日付': dateStr,
        '時刻': timeStr,
        '備考': noteExcerpt,
        'meet_link': meetUrl,
        // Legacy English variables
        'guest_name': validatedData.name,
        'guest_email': validatedData.email,
        'event_type': eventType.title,
        'company_name': validatedData.companyName,
        'date': dateStr,
        'time': timeStr,
        'notes': noteExcerpt,
      };
      return template.replace(
        /\{(予約者名|メール|メニュー名|会社名|日付|時刻|備考|meet_link|guest_name|guest_email|event_type|company_name|date|time|notes)\}/g,
        (_, key) => vars[key] ?? ''
      );
    };

    const guestTitle = applyTemplate(eventType.guest_title_template || '{メニュー名}', '');
    const { eventId: guestEventId, meetLink } = await createCalendarEvent(calendar, {
      summary: guestTitle,
      start: slot.start,
      end: slot.end,
      attendees: [validatedData.email, organizer.email],
      organizerEmail: organizer.email,
      addMeetLink: true,
    });

    // Meetリンク確定後にゲスト用イベントの説明欄を更新
    const guestDescription = applyTemplate(eventType.guest_description_template || '{meet_link}', meetLink || '') || undefined;
    if (guestDescription) {
      try {
        await updateCalendarEvent(calendar, guestEventId, { description: guestDescription });
      } catch (err) {
        console.error('Failed to update guest event description:', err);
      }
    }

    // --- イベント2: チーム内部用（ゲストは招待せず、メモ欄に記載）---
    // any_available モードでは担当1人 + 議事録担当のみ招待
    const attendingMembers =
      eventType.participation_mode === 'any_available' && assignedMember
        ? [assignedMember]
        : members;
    const internalAttendees = [
      ...attendingMembers.map((m) => m.email),
      ...noteTakerEmails.filter((e) => !attendingMembers.some((m) => m.email === e)),
    ];

    const companyLine = `\n【会社名】\n${validatedData.companyName}`;
    const phoneLine = `\n【電話番号】\n${validatedData.phoneNumber}`;
    const meetLine = meetLink ? `\n\n【Google Meet】\n${meetLink}` : '';

    // Generate calendar title from template
    const calendarTitle = applyTemplate(eventType.calendar_title_template || '{メニュー名} - {予約者名}', meetLink || '');

    const { eventId: googleEventId } = await createCalendarEvent(calendar, {
      summary: calendarTitle,
      description: `${validatedData.name} 様からのご予約${companyLine}${phoneLine}${meetLine}\n\n【ご相談内容・備考】\n${validatedData.note}`,
      start: slot.start,
      end: slot.end,
      attendees: internalAttendees,
      organizerEmail: organizer.email,
      addMeetLink: false,
    });

    // Generate cancel token
    const cancelToken = generateToken();
    const cancelTokenHash = await hashToken(cancelToken);

    // Create booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        event_type_id: validatedData.eventTypeId,
        google_event_id: googleEventId,
        guest_event_id: guestEventId,
        start_at: validatedData.startAt,
        end_at: validatedData.endAt,
        requester_name: validatedData.name,
        requester_email: validatedData.email,
        company_name: validatedData.companyName,
        phone_number: validatedData.phoneNumber,
        note: validatedData.note,
        cancel_token_hash: cancelTokenHash,
        assigned_member_id: assignedMember?.id ?? null,
        status: 'confirmed',
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Failed to create booking record:', bookingError);
      // 予約レコードを作れなかった場合、既に作成済みのカレンダーイベント2件を
      // ロールバックしてゲスト・主催者のカレンダーに孤児イベントを残さない。
      for (const eid of [guestEventId, googleEventId]) {
        if (!eid) continue;
        try {
          await deleteCalendarEvent(calendar, eid);
        } catch (rollbackErr) {
          console.error(`Failed to roll back calendar event ${eid}:`, rollbackErr);
        }
      }
      // 23P01 = exclusion_violation（ダブルブッキング防止のDB制約に抵触）
      if ((bookingError as { code?: string }).code === '23P01') {
        return NextResponse.json(
          { error: 'この時間帯はすでに予約が入りました。別の時間をお選びください。' },
          { status: 409 }
        );
      }
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
