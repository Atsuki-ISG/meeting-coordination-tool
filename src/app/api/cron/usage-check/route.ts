import { NextRequest, NextResponse } from 'next/server';
import { checkAndAlertUsage, getThreshold } from '@/lib/notifications/usage-monitor';

// Vercel Cron認証用のシークレット
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Vercelからのcronリクエストを認証
  const authHeader = request.headers.get('authorization');

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await checkAndAlertUsage();

    return NextResponse.json({
      ...result,
      threshold: getThreshold(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron usage-check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
