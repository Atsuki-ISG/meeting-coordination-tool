import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assignMember } from './assign-member';
import type { Member } from '@/types';

// --- Supabase mock ---
function buildChain(resolveValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    then: (
      resolve: (v: typeof resolveValue) => unknown,
      reject?: (e: unknown) => unknown
    ) => Promise.resolve(resolveValue).then(resolve, reject),
  };
  return chain;
}

function makeSupabase(handlers: {
  event_type_members?: { data: unknown; error: unknown };
  bookings?: { data: unknown; error: unknown };
}) {
  const from = vi.fn((table: string) => {
    if (table === 'event_type_members') {
      return buildChain(handlers.event_type_members ?? { data: [], error: null });
    }
    if (table === 'bookings') {
      return buildChain(handlers.bookings ?? { data: [], error: null });
    }
    return buildChain({ data: [], error: null });
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from } as any;
}

const mkMember = (id: string, overrides: Partial<Member> = {}): Member =>
  ({
    id,
    team_id: 't1',
    email: `${id}@ex.com`,
    name: id,
    google_refresh_token: 'rt',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as Member;

describe('assignMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('availableMembers が空なら null を返す', async () => {
    const supabase = makeSupabase({});
    const result = await assignMember(supabase, {
      eventTypeId: 'et1',
      strategy: 'balanced',
      availableMembers: [],
    });
    expect(result).toBeNull();
  });

  it('availableMembers が1人ならその1人を返す（DB 参照しない）', async () => {
    const supabase = makeSupabase({});
    const only = mkMember('m1');
    const result = await assignMember(supabase, {
      eventTypeId: 'et1',
      strategy: 'balanced',
      availableMembers: [only],
    });
    expect(result).toBe(only);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  describe('balanced 戦略', () => {
    it('過去30日の担当件数が最少のメンバーを返す', async () => {
      const m1 = mkMember('m1');
      const m2 = mkMember('m2');
      const m3 = mkMember('m3');
      // m1=2件, m2=0件, m3=1件 → m2 が選ばれる
      const supabase = makeSupabase({
        bookings: {
          data: [
            { assigned_member_id: 'm1' },
            { assigned_member_id: 'm1' },
            { assigned_member_id: 'm3' },
          ],
          error: null,
        },
      });
      const result = await assignMember(supabase, {
        eventTypeId: 'et1',
        strategy: 'balanced',
        availableMembers: [m1, m2, m3],
      });
      expect(result?.id).toBe('m2');
    });

    it('同数の場合は id 昇順で決定的に選ぶ', async () => {
      const m1 = mkMember('m1');
      const m2 = mkMember('m2');
      const supabase = makeSupabase({
        bookings: { data: [], error: null },
      });
      const result = await assignMember(supabase, {
        eventTypeId: 'et1',
        strategy: 'balanced',
        availableMembers: [m2, m1], // 入力順が逆でも m1 が選ばれる
      });
      expect(result?.id).toBe('m1');
    });

    it('他イベントタイプの担当件数はカウントされない（avail 外 id は無視）', async () => {
      const m1 = mkMember('m1');
      const m2 = mkMember('m2');
      const supabase = makeSupabase({
        bookings: {
          data: [
            // m1 に紐づく件数はあるが avail にいない other-id は無視
            { assigned_member_id: 'other-id' },
            { assigned_member_id: 'other-id' },
            { assigned_member_id: 'other-id' },
            { assigned_member_id: 'm2' },
          ],
          error: null,
        },
      });
      const result = await assignMember(supabase, {
        eventTypeId: 'et1',
        strategy: 'balanced',
        availableMembers: [m1, m2],
      });
      // m1=0, m2=1 → m1
      expect(result?.id).toBe('m1');
    });
  });

  describe('priority 戦略', () => {
    it('event_type_members.priority が最小のメンバーを返す', async () => {
      const m1 = mkMember('m1');
      const m2 = mkMember('m2');
      const m3 = mkMember('m3');
      const supabase = makeSupabase({
        event_type_members: {
          data: [
            { member_id: 'm1', priority: 2 },
            { member_id: 'm2', priority: 0 },
            { member_id: 'm3', priority: 1 },
          ],
          error: null,
        },
      });
      const result = await assignMember(supabase, {
        eventTypeId: 'et1',
        strategy: 'priority',
        availableMembers: [m1, m2, m3],
      });
      expect(result?.id).toBe('m2');
    });

    it('priority 行が存在しないメンバーは最下位として扱う（強制追加された主催者対策）', async () => {
      const m1 = mkMember('m1');
      const m2 = mkMember('m2');
      const supabase = makeSupabase({
        event_type_members: {
          data: [
            { member_id: 'm1', priority: 5 },
            // m2 の行はない（例: event_type_members 未登録の主催者）
          ],
          error: null,
        },
      });
      const result = await assignMember(supabase, {
        eventTypeId: 'et1',
        strategy: 'priority',
        availableMembers: [m1, m2],
      });
      // m1=5, m2=行なし(最下位) → m1。行の無いメンバーが最優先になってはいけない。
      expect(result?.id).toBe('m1');
    });

    it('priority 同値の場合は id 昇順', async () => {
      const m1 = mkMember('m1');
      const m2 = mkMember('m2');
      const supabase = makeSupabase({
        event_type_members: {
          data: [
            { member_id: 'm1', priority: 1 },
            { member_id: 'm2', priority: 1 },
          ],
          error: null,
        },
      });
      const result = await assignMember(supabase, {
        eventTypeId: 'et1',
        strategy: 'priority',
        availableMembers: [m2, m1],
      });
      expect(result?.id).toBe('m1');
    });

    it('優先度が最高でも空いていない(availableMembers に含まれない)なら選ばれない', async () => {
      const m2 = mkMember('m2');
      const m3 = mkMember('m3');
      const supabase = makeSupabase({
        event_type_members: {
          data: [
            { member_id: 'm1', priority: 0 }, // 最優先だが avail にいない
            { member_id: 'm2', priority: 1 },
            { member_id: 'm3', priority: 2 },
          ],
          error: null,
        },
      });
      const result = await assignMember(supabase, {
        eventTypeId: 'et1',
        strategy: 'priority',
        availableMembers: [m2, m3], // m1 は空いていない
      });
      expect(result?.id).toBe('m2');
    });
  });
});
