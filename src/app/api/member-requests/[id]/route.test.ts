import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Supabase の各テーブル操作をモック
const mockFromImpl: Record<string, unknown> = {};
const mockFrom = vi.fn((table: string) => mockFromImpl[table]);

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('@/lib/auth/api', () => ({
  getSessionUser: vi.fn(),
}));

import { PATCH, DELETE } from './route';
import { getSessionUser } from '@/lib/auth/api';

const mockGetSessionUser = vi.mocked(getSessionUser);

// ヘルパー: Supabase チェーンを生成するビルダー
function makeBuilder(resolveValue: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolveValue),
  };
}

// ヘルパー: PATCH リクエストを作成
function makePatchRequest(id: string, body: object) {
  return new NextRequest(`http://localhost/api/member-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const ADMIN_MEMBER = { role: 'admin', team_id: 'team-1' };
const MEMBER_REQUEST = {
  id: 'req-1',
  email: 'newuser@example.com',
  name: 'New User',
  google_refresh_token: null,
  status: 'pending',
};

describe('PATCH /api/member-requests/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未認証の場合は 401 を返す', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const req = makePatchRequest('req-1', { action: 'approve' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'req-1' }) });

    expect(res.status).toBe(401);
  });

  it('admin でないユーザーは 403 を返す', async () => {
    mockGetSessionUser.mockResolvedValue({
      memberId: 'member-1',
      email: 'user@example.com',
      name: 'User',
      teamId: 'team-1',
      status: 'active' as const,
      isSystemAdmin: false,
    });

    // role: 'member' (非admin)
    mockFromImpl['members'] = makeBuilder({ data: { role: 'member', team_id: 'team-1' }, error: null });

    const req = makePatchRequest('req-1', { action: 'approve' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'req-1' }) });

    expect(res.status).toBe(403);
  });

  it('無効な action は 400 を返す', async () => {
    mockGetSessionUser.mockResolvedValue({
      memberId: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin',
      teamId: 'team-1',
      status: 'active' as const,
      isSystemAdmin: false,
    });
    mockFromImpl['members'] = makeBuilder({ data: ADMIN_MEMBER, error: null });

    const req = makePatchRequest('req-1', { action: 'invalid' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'req-1' }) });

    expect(res.status).toBe(400);
  });

  it('存在しないリクエストは 404 を返す', async () => {
    mockGetSessionUser.mockResolvedValue({
      memberId: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin',
      teamId: 'team-1',
      status: 'active' as const,
      isSystemAdmin: false,
    });

    // members テーブル: admin 確認用
    const memberBuilder = makeBuilder({ data: ADMIN_MEMBER, error: null });
    // member_requests テーブル: not found
    const requestBuilder = makeBuilder({ data: null, error: { code: '404' } });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'members') return memberBuilder;
      if (table === 'member_requests') return requestBuilder;
      return makeBuilder({ data: null, error: null });
    });

    const req = makePatchRequest('nonexistent', { action: 'approve' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'nonexistent' }) });

    expect(res.status).toBe(404);
  });

  it('既に処理済みのリクエストは 400 を返す', async () => {
    mockGetSessionUser.mockResolvedValue({
      memberId: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin',
      teamId: 'team-1',
      status: 'active' as const,
      isSystemAdmin: false,
    });

    const memberBuilder = makeBuilder({ data: ADMIN_MEMBER, error: null });
    const requestBuilder = makeBuilder({
      data: { ...MEMBER_REQUEST, status: 'approved' }, // 既に approved
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'members') return memberBuilder;
      if (table === 'member_requests') return requestBuilder;
      return makeBuilder({ data: null, error: null });
    });

    const req = makePatchRequest('req-1', { action: 'approve' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'req-1' }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Request has already been processed');
  });

  describe('承認 (approve)', () => {
    beforeEach(() => {
      mockGetSessionUser.mockResolvedValue({
        memberId: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        teamId: 'team-1',
        status: 'active' as const,
        isSystemAdmin: false,
      });
    });

    it('新規メンバーが存在しない場合: INSERT して成功を返す', async () => {
      const newMember = { ...MEMBER_REQUEST, id: 'new-member-1', team_id: 'team-1' };

      const adminBuilder = makeBuilder({ data: ADMIN_MEMBER, error: null });
      const requestBuilder = makeBuilder({ data: MEMBER_REQUEST, error: null });

      let membersCallCount = 0;
      const existingMemberBuilder = makeBuilder({ data: null, error: null }); // 既存メンバーなし
      const insertedMemberBuilder = makeBuilder({ data: newMember, error: null });
      const membersBuilder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          membersCallCount++;
          if (membersCallCount === 1) return Promise.resolve({ data: ADMIN_MEMBER, error: null }); // admin check
          if (membersCallCount === 2) return Promise.resolve({ data: null, error: null }); // existing check
          return Promise.resolve({ data: newMember, error: null }); // insert result
        }),
      };

      const teamMembershipsBuilder = makeBuilder({ data: null, error: null });
      const updateRequestBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'members') return membersBuilder;
        if (table === 'member_requests') {
          // 最初の呼び出し (fetch) と2回目 (update) を区別
          return requestBuilder;
        }
        if (table === 'team_memberships') return teamMembershipsBuilder;
        return makeBuilder({ data: null, error: null });
      });

      // 簡略化: insert チェーンでも single が必要なのでビルダーを共用
      membersBuilder.insert.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: newMember, error: null }),
      });

      const req = makePatchRequest('req-1', { action: 'approve' });
      const res = await PATCH(req, { params: Promise.resolve({ id: 'req-1' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('reject すると member_requests が rejected に更新される', async () => {
      const adminBuilder = makeBuilder({ data: ADMIN_MEMBER, error: null });
      const requestBuilder = makeBuilder({ data: MEMBER_REQUEST, error: null });
      const updateBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      let membersCallCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'members') return adminBuilder;
        if (table === 'member_requests') {
          // 最初は fetch (single 付き)、2回目は update
          membersCallCount++;
          if (membersCallCount === 1) return requestBuilder;
          return updateBuilder;
        }
        return makeBuilder({ data: null, error: null });
      });

      const req = makePatchRequest('req-1', {
        action: 'reject',
        rejectionReason: '資格なし',
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: 'req-1' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  // ==================================================
  // [動作記録] 非トランザクション問題
  // ==================================================
  describe('[動作記録] 非トランザクション: 部分失敗の挙動', () => {
    it('team_memberships の upsert 失敗時でも 200 を返す（現状の動作）', async () => {
      // このテストは「現在のコードが部分失敗を無視する」ことを記録するためのもの。
      // 将来的にトランザクション対応する際の基準点になる。
      mockGetSessionUser.mockResolvedValue({
        memberId: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        teamId: 'team-1',
        status: 'active' as const,
        isSystemAdmin: false,
      });

      const newMember = { ...MEMBER_REQUEST, id: 'new-member-1', team_id: 'team-1' };

      let membersCallCount = 0;
      const membersBuilder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: newMember, error: null }),
        }),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          membersCallCount++;
          if (membersCallCount === 1) return Promise.resolve({ data: ADMIN_MEMBER, error: null });
          return Promise.resolve({ data: null, error: null }); // existing check: なし
        }),
      };

      // team_memberships: upsert が失敗
      const failingMembershipBuilder = {
        upsert: vi.fn().mockResolvedValue({ error: { message: 'Membership insert failed' } }),
      };

      const requestBuilder = makeBuilder({ data: MEMBER_REQUEST, error: null });
      const updateRequestBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      let memberRequestCallCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'members') return membersBuilder;
        if (table === 'member_requests') {
          memberRequestCallCount++;
          if (memberRequestCallCount === 1) return requestBuilder;
          return updateRequestBuilder;
        }
        if (table === 'team_memberships') return failingMembershipBuilder;
        return makeBuilder({ data: null, error: null });
      });

      const req = makePatchRequest('req-1', { action: 'approve' });
      const res = await PATCH(req, { params: Promise.resolve({ id: 'req-1' }) });

      // 現状: team_memberships 失敗は console.error のみで 200 を返す
      // これは非トランザクションの問題 — 将来の改善対象
      expect(res.status).toBe(200);
    });
  });
});

describe('DELETE /api/member-requests/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未認証の場合は 401 を返す', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/member-requests/req-1', {
      method: 'DELETE',
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'req-1' }) });

    expect(res.status).toBe(401);
  });

  it('admin でないユーザーは 403 を返す', async () => {
    mockGetSessionUser.mockResolvedValue({
      memberId: 'member-1',
      email: 'user@example.com',
      name: 'User',
      teamId: 'team-1',
      status: 'active' as const,
      isSystemAdmin: false,
    });

    mockFromImpl['members'] = makeBuilder({ data: { role: 'member' }, error: null });

    const req = new NextRequest('http://localhost/api/member-requests/req-1', {
      method: 'DELETE',
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'req-1' }) });

    expect(res.status).toBe(403);
  });
});
