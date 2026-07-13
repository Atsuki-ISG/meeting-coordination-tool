import { describe, it, expect, vi } from 'vitest';
import { getFreeBusy } from './client';
import type { calendar_v3 } from 'googleapis';

// events.list がページごとに順に返す最小の擬似 Calendar
function makeCalendar(pages: Array<{ items: unknown[]; nextPageToken?: string }>) {
  let call = 0;
  const list = vi.fn(async () => {
    const page = pages[Math.min(call, pages.length - 1)];
    call++;
    return { data: page };
  });
  return { events: { list } } as unknown as calendar_v3.Calendar & {
    events: { list: ReturnType<typeof vi.fn> };
  };
}

const min = new Date('2026-07-14T00:00:00Z');
const max = new Date('2026-07-21T00:00:00Z');

describe('getFreeBusy', () => {
  it('時刻付きイベントを busy にする', async () => {
    const cal = makeCalendar([
      {
        items: [
          {
            status: 'confirmed',
            start: { dateTime: '2026-07-15T01:00:00Z' },
            end: { dateTime: '2026-07-15T02:00:00Z' },
          },
        ],
      },
    ]);
    const busy = await getFreeBusy(cal, 'primary', min, max);
    expect(busy).toHaveLength(1);
    expect(busy[0].start.toISOString()).toBe('2026-07-15T01:00:00.000Z');
  });

  it('終日イベントを JST 一日分の busy にする', async () => {
    const cal = makeCalendar([
      { items: [{ status: 'confirmed', start: { date: '2026-07-15' }, end: { date: '2026-07-16' } }] },
    ]);
    const busy = await getFreeBusy(cal, 'primary', min, max);
    expect(busy).toHaveLength(1);
    // 2026-07-15T00:00+09:00 = 2026-07-14T15:00Z
    expect(busy[0].start.toISOString()).toBe('2026-07-14T15:00:00.000Z');
    expect(busy[0].end.toISOString()).toBe('2026-07-15T15:00:00.000Z');
  });

  it('transparency=transparent（空き表示）は除外する', async () => {
    const cal = makeCalendar([
      {
        items: [
          {
            status: 'confirmed',
            transparency: 'transparent',
            start: { dateTime: '2026-07-15T01:00:00Z' },
            end: { dateTime: '2026-07-15T02:00:00Z' },
          },
        ],
      },
    ]);
    expect(await getFreeBusy(cal, 'primary', min, max)).toHaveLength(0);
  });

  it('cancelled / 辞退 / workingLocation を除外する', async () => {
    const cal = makeCalendar([
      {
        items: [
          {
            status: 'cancelled',
            start: { dateTime: '2026-07-15T01:00:00Z' },
            end: { dateTime: '2026-07-15T02:00:00Z' },
          },
          {
            status: 'confirmed',
            attendees: [{ self: true, responseStatus: 'declined' }],
            start: { dateTime: '2026-07-15T03:00:00Z' },
            end: { dateTime: '2026-07-15T04:00:00Z' },
          },
          {
            status: 'confirmed',
            eventType: 'workingLocation',
            start: { date: '2026-07-15' },
            end: { date: '2026-07-16' },
          },
        ],
      },
    ]);
    expect(await getFreeBusy(cal, 'primary', min, max)).toHaveLength(0);
  });

  it('ページネーションで全ページ取得する', async () => {
    const cal = makeCalendar([
      {
        items: [
          {
            status: 'confirmed',
            start: { dateTime: '2026-07-15T01:00:00Z' },
            end: { dateTime: '2026-07-15T02:00:00Z' },
          },
        ],
        nextPageToken: 'p2',
      },
      {
        items: [
          {
            status: 'confirmed',
            start: { dateTime: '2026-07-16T01:00:00Z' },
            end: { dateTime: '2026-07-16T02:00:00Z' },
          },
        ],
      },
    ]);
    const busy = await getFreeBusy(cal, 'primary', min, max);
    expect(busy).toHaveLength(2);
    expect(cal.events.list).toHaveBeenCalledTimes(2);
  });
});
