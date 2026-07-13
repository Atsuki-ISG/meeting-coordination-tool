import { describe, it, expect, vi, beforeEach } from 'vitest';

// Supabase モック
const mockFrom = vi.fn();

// thenable なチェーンを返すビルダー。await するとresolveValueで解決する
function buildChain(resolveValue: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (
      resolve: (v: typeof resolveValue) => unknown,
      reject?: (e: unknown) => unknown
    ) => Promise.resolve(resolveValue).then(resolve, reject),
  };
  return chain;
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

vi.mock('@/lib/auth/api', () => ({
  getSessionUser: vi.fn(),
}));

import { GET } from './route';
import { getSessionUser } from '@/lib/auth/api';

const mockGetSessionUser = vi.mocked(getSessionUser);

// from(table) ごとに異なるチェーンを返すヘルパー
function setupFromMock(
  membersResult: { data: unknown; error: unknown },
  noteTakersResult: { data: unknown; error: unknown } = { data: [], error: null }
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'team_memberships') {
      return buildChain(noteTakersResult);
    }
    return buildChain(membersResult);
  });
}

describe('GET /api/members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未認証の場合は 401 を返す', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('teamId がない場合は 403 を返す', async () => {
    mockGetSessionUser.mockResolvedValue({
      memberId: 'member-1',
      email: 'user@example.com',
      name: 'User',
      teamId: null,
      status: 'active' as const,
      isSystemAdmin: false,
    });

    const res = await GET();

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Team required');
  });

  it('メンバー一覧を返す', async () => {
    mockGetSessionUser.mockResolvedValue({
      memberId: 'member-1',
      email: 'admin@example.com',
      name: 'Admin',
      teamId: 'team-1',
      status: 'active' as const,
      isSystemAdmin: false,
    });

    setupFromMock({
      data: [
        {
          id: 'member-2',
          name: 'Alice',
          email: 'alice@example.com',
          is_active: true,
          role: 'member',
          is_note_taker: false,
          google_refresh_token: 'encrypted-token',
        },
      ],
      error: null,
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].name).toBe('Alice');
  });

  // ==================================================
  // [バグ回帰] google_refresh_token の変換テスト
  // ==================================================
  describe('[回帰] google_refresh_token は has_google_token に変換される', () => {
    beforeEach(() => {
      mockGetSessionUser.mockResolvedValue({
        memberId: 'member-1',
        email: 'admin@example.com',
        name: 'Admin',
        teamId: 'team-1',
        status: 'active' as const,
        isSystemAdmin: false,
      });
    });

    it('google_refresh_token がある → has_google_token: true', async () => {
      setupFromMock({
        data: [{
          id: 'member-2',
          name: 'Alice',
          email: 'alice@example.com',
          is_active: true,
          role: 'member',
          is_note_taker: false,
          google_refresh_token: 'encrypted-token-value',
        }],
        error: null,
      });

      const res = await GET();
      const json = await res.json();

      expect(json[0].has_google_token).toBe(true);
    });

    it('google_refresh_token が null → has_google_token: false', async () => {
      setupFromMock({
        data: [{
          id: 'member-3',
          name: 'Bob',
          email: 'bob@example.com',
          is_active: true,
          role: 'member',
          is_note_taker: false,
          google_refresh_token: null,
        }],
        error: null,
      });

      const res = await GET();
      const json = await res.json();

      expect(json).toHaveLength(1);
      expect(json[0].has_google_token).toBe(false);
    });

    it('レスポンスに google_refresh_token は含まれない（セキュリティ）', async () => {
      setupFromMock({
        data: [{
          id: 'member-2',
          name: 'Alice',
          email: 'alice@example.com',
          is_active: true,
          role: 'member',
          is_note_taker: false,
          google_refresh_token: 'secret-token-value',
        }],
        error: null,
      });

      const res = await GET();
      const json = await res.json();

      expect(json[0].google_refresh_token).toBeUndefined();
    });

    it('連携済み・未連携が混在する場合も正しく変換される', async () => {
      setupFromMock({
        data: [
          {
            id: 'member-2',
            name: 'Alice',
            email: 'alice@example.com',
            is_active: true,
            role: 'admin',
            is_note_taker: false,
            google_refresh_token: 'token',
          },
          {
            id: 'member-3',
            name: 'Bob',
            email: 'bob@example.com',
            is_active: true,
            role: 'member',
            is_note_taker: true,
            google_refresh_token: null,
          },
        ],
        error: null,
      });

      const res = await GET();
      const json = await res.json();

      expect(json).toHaveLength(2);
      expect(json[0].has_google_token).toBe(true);
      expect(json[1].has_google_token).toBe(false);
      expect(json[0].google_refresh_token).toBeUndefined();
      expect(json[1].google_refresh_token).toBeUndefined();
    });

  });

  it('データが空の場合は空配列を返す', async () => {
    mockGetSessionUser.mockResolvedValue({
      memberId: 'member-1',
      email: 'admin@example.com',
      name: 'Admin',
      teamId: 'team-1',
      status: 'active' as const,
      isSystemAdmin: false,
    });

    setupFromMock({ data: null, error: null });

    const res = await GET();
    const json = await res.json();

    expect(json).toEqual([]);
  });

  it('Supabase エラーの場合は 500 を返す', async () => {
    mockGetSessionUser.mockResolvedValue({
      memberId: 'member-1',
      email: 'admin@example.com',
      name: 'Admin',
      teamId: 'team-1',
      status: 'active' as const,
      isSystemAdmin: false,
    });

    // members クエリがエラー → 早期リターンで 500
    mockFrom.mockImplementation(() => buildChain({ data: null, error: { message: 'DB error' } }));

    const res = await GET();

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to fetch members');
  });
});
