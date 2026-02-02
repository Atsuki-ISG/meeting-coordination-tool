import { NextResponse } from 'next/server';
import { sendSimpleMessage } from '@/lib/notifications/google-chat';

export async function GET() {
  try {
    const success = await sendSimpleMessage('✅ MeetFlow通知テスト - Google Chat連携が正常に動作しています！');

    return NextResponse.json({
      success,
      message: success ? 'Test notification sent' : 'Failed to send notification',
    });
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
