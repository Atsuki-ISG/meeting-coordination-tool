const WEBHOOK_URL = process.env.GOOGLE_CHAT_WEBHOOK_URL;

interface ChatMessage {
  text?: string;
  cards?: Card[];
}

interface Card {
  header?: {
    title: string;
    subtitle?: string;
    imageUrl?: string;
  };
  sections: Section[];
}

interface Section {
  header?: string;
  widgets: Widget[];
}

interface Widget {
  textParagraph?: { text: string };
  keyValue?: {
    topLabel?: string;
    content: string;
    contentMultiline?: boolean;
    icon?: string;
  };
}

export async function sendGoogleChatMessage(message: ChatMessage): Promise<boolean> {
  if (!WEBHOOK_URL) {
    console.warn('Google Chat webhook URL is not configured');
    return false;
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error('Failed to send Google Chat message:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending Google Chat message:', error);
    return false;
  }
}

export async function sendUsageAlert(stats: {
  totalRequests: number;
  threshold: number;
  percentUsed: number;
}): Promise<boolean> {
  const message: ChatMessage = {
    cards: [
      {
        header: {
          title: '⚠️ API使用量アラート',
          subtitle: 'MeetFlow - 使用量が閾値に近づいています',
        },
        sections: [
          {
            widgets: [
              {
                keyValue: {
                  topLabel: '現在の使用量',
                  content: `${stats.totalRequests.toLocaleString()} リクエスト`,
                },
              },
              {
                keyValue: {
                  topLabel: '閾値',
                  content: `${stats.threshold.toLocaleString()} リクエスト`,
                },
              },
              {
                keyValue: {
                  topLabel: '使用率',
                  content: `${stats.percentUsed.toFixed(1)}%`,
                },
              },
            ],
          },
          {
            widgets: [
              {
                textParagraph: {
                  text: stats.percentUsed >= 100
                    ? '❌ <b>閾値を超過しました！</b> 早急に確認してください。'
                    : stats.percentUsed >= 90
                    ? '🔴 閾値の90%を超えています。注意が必要です。'
                    : '🟡 閾値の80%を超えています。',
                },
              },
            ],
          },
        ],
      },
    ],
  };

  return sendGoogleChatMessage(message);
}

export async function sendDailyReport(stats: {
  totalRequests: number;
  availabilityRequests: number;
  bookingRequests: number;
  cancelRequests: number;
  date: string;
}): Promise<boolean> {
  const message: ChatMessage = {
    cards: [
      {
        header: {
          title: '📊 日次レポート',
          subtitle: `MeetFlow - ${stats.date}`,
        },
        sections: [
          {
            header: 'API使用状況',
            widgets: [
              {
                keyValue: {
                  topLabel: '総リクエスト数',
                  content: stats.totalRequests.toLocaleString(),
                },
              },
              {
                keyValue: {
                  topLabel: '空き状況確認',
                  content: stats.availabilityRequests.toLocaleString(),
                },
              },
              {
                keyValue: {
                  topLabel: '予約作成',
                  content: stats.bookingRequests.toLocaleString(),
                },
              },
              {
                keyValue: {
                  topLabel: 'キャンセル',
                  content: stats.cancelRequests.toLocaleString(),
                },
              },
            ],
          },
        ],
      },
    ],
  };

  return sendGoogleChatMessage(message);
}

export async function sendSimpleMessage(text: string): Promise<boolean> {
  return sendGoogleChatMessage({ text });
}
