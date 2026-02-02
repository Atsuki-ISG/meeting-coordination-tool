import { startOfMonth, endOfMonth, format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { createServiceClient } from '@/lib/supabase/server';
import { sendUsageAlert, sendDailyReport } from './google-chat';

const USAGE_ALERT_THRESHOLD = parseInt(process.env.USAGE_ALERT_THRESHOLD || '800000', 10);

interface UsageStats {
  totalRequests: number;
  availabilityRequests: number;
  bookingRequests: number;
  cancelRequests: number;
}

export async function getMonthlyUsageStats(): Promise<UsageStats> {
  const supabase = await createServiceClient();

  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  const { data: logs } = await supabase
    .from('api_usage_logs')
    .select('endpoint, request_count')
    .gte('created_at', monthStart)
    .lte('created_at', monthEnd);

  const stats: UsageStats = {
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

  return stats;
}

export async function checkAndAlertUsage(): Promise<{ alerted: boolean; percentUsed: number; stats: UsageStats }> {
  const stats = await getMonthlyUsageStats();
  const percentUsed = (stats.totalRequests / USAGE_ALERT_THRESHOLD) * 100;

  // Alert if usage is at 80% or above
  if (percentUsed >= 80) {
    await sendUsageAlert({
      totalRequests: stats.totalRequests,
      threshold: USAGE_ALERT_THRESHOLD,
      percentUsed,
    });
    return { alerted: true, percentUsed, stats };
  }

  return { alerted: false, percentUsed, stats };
}

export async function sendDailyUsageReport(): Promise<boolean> {
  const stats = await getMonthlyUsageStats();
  const today = format(new Date(), 'yyyy年M月d日', { locale: ja });

  return sendDailyReport({
    ...stats,
    date: today,
  });
}

export function getThreshold(): number {
  return USAGE_ALERT_THRESHOLD;
}
