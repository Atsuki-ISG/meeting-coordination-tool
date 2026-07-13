import { NextResponse } from 'next/server';
import { sendSimpleMessage } from '@/lib/notifications/google-chat';
import { getSessionUser } from '@/lib/auth/api';

export async function GET() {
  // 認証必須（システム管理者のみ）。無認証だと誰でもチームの Google Chat に投稿できてしまう。
  const user = await getSessionUser();
  if (!user || !user.isSystemAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
