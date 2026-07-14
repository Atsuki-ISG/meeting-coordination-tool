import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- モック対象 ---
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('@/lib/rate-limit', () => ({
  isShortTermRateLimited: vi.fn(() => false),
  isMonthlyLimitExceeded: vi.fn(async () => ({ exceeded: false })),
  getClientIp: vi.fn(() => '127.0.0.1'),
  invalidateMonthlyCache: vi.fn(),
}));

vi.mock('@/lib/google-calendar/client', () => ({
  createCalendarClient: vi.fn(() => ({})),
  createCalendarEvent: vi.fn(async () => ({ eventId: 'evt', meetLink: 'https://meet.example/x' })),
  updateCalendarEvent: vi.fn(async () => undefined),
  deleteCalendarEvent: vi.fn(async () => undefined),
  refreshAccessToken: vi.fn(async () => ({ accessToken: 'at', expiresAt: new Date() })),
  getFreeBusy: vi.fn(async () => []),
}));

vi.mock('@/lib/utils/token', () => ({
  generateToken: vi.fn(() => 'cancel-token'),
  hashToken: vi.fn(async () => 'cancel-hash'),
}));

vi.mock('@/lib/booking/assign-member', () => ({
  assignMember: vi.fn(async (_s: unknown, p: { availableMembers: { id: string }[] }) => p.availableMembers[0]),
}));

import { POST } from './route';
import { createCalendarEvent } from '@/lib/google-calendar/client';

const mockCreateCalendarEvent = vi.mocked(createCalendarEvent);

// 平日 9:00-18:00 のみ有効
const weekdaysOnly = {
  '0': { enabled: false, startTime: '09:00', endTime: '18:00' },
  '1': { enabled: true, startTime: '09:00', endTime: '18:00' },
  '2': { enabled: true, startTime: '09:00', endTime: '18:00' },
  '3': { enabled: true, startTime: '09:00', endTime: '18:00' },
  '4': { enabled: true, startTime: '09:00', endTime: '18:00' },
  '5': { enabled: true, startTime: '09:00', endTime: '18:00' },
  '6': { enabled: false, startTime: '09:00', endTime: '18:00' },
};

const organizer = {
  id: 'm1',
  email: 'org@example.com',
  google_refresh_token: 'rt',
  is_active: true,
  availability_settings: weekdaysOnly,
};

const eventType = {
  id: 'et1',
  organizer_id: 'm1',
  is_active: true,
  title: '相談',
  duration_minutes: 30,
  participation_mode: 'all_required',
  min_notice_minutes: 60,
  buffer_minutes: 0,
  time_restriction_type: 'none',
  calendar_title_template: null,
  guest_title_template: null,
  guest_description_template: null,
  organizer,
};

// from(table) をテーブル名でディスパッチ
function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    in: () => c,
    not: () => c,
    order: () => c,
    insert: () => c,
    single: () => Promise.resolve(result),
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej),
  };
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // 2024-01-14 20:00 UTC = 2024-01-15 05:00 JST（月曜早朝）
  vi.setSystemTime(new Date('2024-01-14T20:00:00Z'));

  mockFrom.mockImplementation((table: string) => {
    switch (table) {
      case 'system_settings':
        return chain({ data: null, error: null });
      case 'event_types':
        return chain({ data: eventType, error: null });
      case 'event_type_members':
        return chain({ data: [], error: null });
      case 'members':
        return chain({ data: [organizer], error: null });
      case 'bookings':
        return chain({ data: { id: 'b1', start_at: '', end_at: '' }, error: null });
      case 'api_usage_logs':
        return chain({ data: null, error: null });
      default:
        return chain({ data: null, error: null });
    }
  });
});

afterEach(() => {
  vi.useRealTimers();
});

function makeRequest(body: Record<string, unknown>) {
  return {
    headers: new Headers(),
    json: async () => body,
  } as unknown as Parameters<typeof POST>[0];
}

const baseBody = {
  eventTypeId: '00000000-0000-4000-8000-000000000000',
  name: '山田太郎',
  email: 'guest@example.com',
  companyName: '株式会社テスト',
  phoneNumber: '09000000000',
  note: '相談したいことがあります',
};

describe('POST /api/bookings 予約スロットのサーバー側検証', () => {
  it('所要時間が duration_minutes と一致しないと 400（カレンダーイベントは作らない）', async () => {
    // 30分枠なのに 60分で送信
    const res = await POST(
      makeRequest({
        ...baseBody,
        startAt: '2024-01-15T01:00:00.000Z', // 月 10:00 JST
        endAt: '2024-01-15T02:00:00.000Z', // 60分
      })
    );
    expect(res.status).toBe(400);
    expect(mockCreateCalendarEvent).not.toHaveBeenCalled();
  });

  it('営業時間外の枠は 400（カレンダーイベントは作らない）', async () => {
    // 月 20:00 JST（営業終了18:00より後）
    const res = await POST(
      makeRequest({
        ...baseBody,
        startAt: '2024-01-15T11:00:00.000Z',
        endAt: '2024-01-15T11:30:00.000Z',
      })
    );
    expect(res.status).toBe(400);
    expect(mockCreateCalendarEvent).not.toHaveBeenCalled();
  });

  it('過去日時の枠は 400（カレンダーイベントは作らない）', async () => {
    // 先週の月曜
    const res = await POST(
      makeRequest({
        ...baseBody,
        startAt: '2024-01-08T01:00:00.000Z',
        endAt: '2024-01-08T01:30:00.000Z',
      })
    );
    expect(res.status).toBe(400);
    expect(mockCreateCalendarEvent).not.toHaveBeenCalled();
  });

  it('営業時間内・正しい所要時間なら予約が成立する（200）', async () => {
    const res = await POST(
      makeRequest({
        ...baseBody,
        startAt: '2024-01-15T01:00:00.000Z', // 月 10:00 JST
        endAt: '2024-01-15T01:30:00.000Z', // 30分
      })
    );
    expect(res.status).toBe(200);
    // ゲスト用 + 内部用の2イベントが作られる
    expect(mockCreateCalendarEvent).toHaveBeenCalledTimes(2);
  });
});
