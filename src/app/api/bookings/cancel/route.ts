import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import {
  createCalendarClient,
  deleteCalendarEvent,
  refreshAccessToken,
} from '@/lib/google-calendar/client';
import { verifyToken } from '@/lib/utils/token';
import {
  isShortTermRateLimited,
  isMonthlyLimitExceeded,
  getClientIp,
  invalidateMonthlyCache,
} from '@/lib/rate-limit';

const cancelSchema = z.object({
  bookingId: z.string().uuid(),
  token: z.string().min(1),
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
    const validatedData = cancelSchema.parse(body);

    const supabase = await createServiceClient();

    // Get booking with event type
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        event_type:event_types(
          *,
          organizer:members!event_types_organizer_id_fkey(*)
        )
      `)
      .eq('id', validatedData.bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if already canceled
    if (booking.status === 'canceled') {
      return NextResponse.json(
        { error: 'Booking is already canceled' },
        { status: 400 }
      );
    }

    // Check if event has already started
    if (new Date(booking.start_at) <= new Date()) {
      return NextResponse.json(
        { error: 'Cannot cancel past or ongoing events' },
        { status: 400 }
      );
    }

    // Verify cancel token
    if (!booking.cancel_token_hash) {
      return NextResponse.json(
        { error: 'Invalid cancel token' },
        { status: 400 }
      );
    }

    const isValidToken = await verifyToken(
      validatedData.token,
      booking.cancel_token_hash
    );

    if (!isValidToken) {
      return NextResponse.json(
        { error: 'Invalid cancel token' },
        { status: 401 }
      );
    }

    // Delete calendar event
    const organizer = booking.event_type?.organizer;
    if (organizer?.google_refresh_token && booking.google_event_id) {
      try {
        const { accessToken } = await refreshAccessToken(
          organizer.google_refresh_token
        );
        const calendar = createCalendarClient(accessToken);
        await deleteCalendarEvent(calendar, booking.google_event_id);
      } catch (error) {
        console.error('Failed to delete calendar event:', error);
        // Continue with booking cancellation even if calendar deletion fails
      }
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        cancel_token_hash: null, // Invalidate token after use
      })
      .eq('id', validatedData.bookingId);

    if (updateError) {
      console.error('Failed to update booking status:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel booking' },
        { status: 500 }
      );
    }

    // Log API usage
    await supabase.from('api_usage_logs').insert({
      endpoint: 'bookings/cancel',
      member_id: booking.event_type?.organizer_id,
      request_count: 1,
    });

    // Invalidate monthly cache after logging
    invalidateMonthlyCache();

    return NextResponse.json({
      success: true,
      message: '予約がキャンセルされました。',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Cancel API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
