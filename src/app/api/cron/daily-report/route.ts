import { NextRequest, NextResponse } from 'next/server';
import { sendDailyUsageReport } from '@/lib/notifications/usage-monitor';

// Vercel Cron認証用のシークレット
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Vercelからのcronリクエストを認証
  const authHeader = request.headers.get('authorization');

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const success = await sendDailyUsageReport();

    return NextResponse.json({
      success,
      message: success ? 'Daily report sent' : 'Failed to send report',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron daily-report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
