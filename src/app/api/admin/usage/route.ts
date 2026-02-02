import { NextResponse } from 'next/server';
import { startOfMonth, endOfMonth } from 'date-fns';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceClient();

    // Get current month's date range
    const now = new Date();
    const monthStart = startOfMonth(now).toISOString();
    const monthEnd = endOfMonth(now).toISOString();

    // Get usage logs for current month
    const { data: logs } = await supabase
      .from('api_usage_logs')
      .select('endpoint, request_count')
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd);

    // Calculate totals
    const stats = {
      totalRequests: 0,
      availabilityRequests: 0,
      bookingRequests: 0,
      cancelRequests: 0,
    };

    if (logs) {
      for (const log of logs) {
        stats.totalRequests += log.request_count;

        if (log.endpoint === 'availability') {
          stats.availabilityRequests += log.request_count;
        } else if (log.endpoint === 'bookings/create') {
          stats.bookingRequests += log.request_count;
        } else if (log.endpoint === 'bookings/cancel') {
          stats.cancelRequests += log.request_count;
        }
      }
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
