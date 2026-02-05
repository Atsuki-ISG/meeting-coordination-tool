'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import type { Member, Team } from '@/types';

export default function TeamSettingsPage() {
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [role, setRole] = useState<'admin' | 'member' | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit states
  const [isEditingName, setIsEditingName] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Copy state
  const [copiedCode, setCopiedCode] = useState(false);

  // Member management states
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  // Delete team states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teamRes, membersRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/members'),
      ]);

      if (teamRes.ok) {
        const data = await teamRes.json();
        setTeam(data.team);
        setRole(data.role);
        setTeamName(data.team?.name || '');
      }

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteCode = async () => {
    if (team?.invite_code) {
      await navigator.clipboard.writeText(team.invite_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const saveTeamName = async () => {
    if (!teamName.trim()) return;

    setIsSavingName(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setTeam(data.team);
        setIsEditingName(false);
        setMessage({ type: 'success', text: 'チーム名を更新しました' });
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'チーム名の更新に失敗しました' });
      }
    } catch {
      setMessage({ type: 'error', text: 'チーム名の更新に失敗しました' });
    } finally {
      setIsSavingName(false);
    }
  };

  const changeRole = async (memberId: string, newRole: 'admin' | 'member') => {
    setChangingRoleId(memberId);
    try {
      const res = await fetch(`/api/teams/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        );
        setMessage({ type: 'success', text: '権限を変更しました' });
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || '権限の変更に失敗しました' });
      }
    } catch {
      setMessage({ type: 'error', text: '権限の変更に失敗しました' });
    } finally {
      setChangingRoleId(null);
    }
  };

  const removeMember = async (memberId: string) => {
    setRemovingMemberId(memberId);
    try {
      const res = await fetch(`/api/teams/members/${memberId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        setMessage({ type: 'success', text: 'メンバーを削除しました' });
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'メンバーの削除に失敗しました' });
      }
    } catch {
      setMessage({ type: 'error', text: 'メンバーの削除に失敗しました' });
    } finally {
      setRemovingMemberId(null);
    }
  };

  const deleteTeam = async () => {
    setIsDeletingTeam(true);
    try {
      const res = await fetch('/api/teams', { method: 'DELETE' });
      if (res.ok) {
        router.push('/team');
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'チームの削除に失敗しました' });
      }
    } catch {
      setMessage({ type: 'error', text: 'チームの削除に失敗しました' });
    } finally {
      setIsDeletingTeam(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-8 w-8 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-slate-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-500">チームが見つかりません</p>
        </div>
      </div>
    );
  }

  const isAdmin = role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <Sidebar />

        <main className="flex-1 md:ml-72 p-4 pt-20 md:p-10 md:pt-10">
          {/* Header */}
          <header className="sticky top-0 -mx-10 px-10 py-6 bg-slate-50/80 backdrop-blur-md z-20 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">チーム管理</h1>
              <p className="text-slate-500 font-medium">チームの設定とメンバーを管理</p>
            </div>
          </header>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 rounded-2xl p-4 flex items-center gap-3 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="font-medium">{message.text}</span>
              <button onClick={() => setMessage(null)} className="ml-auto">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Team Info Card */}
          <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 mb-8">
            <div className="p-8 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">チーム情報</h3>
            </div>

            {/* Team Name */}
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-500 mb-1">チーム名</p>
                  {isEditingName && isAdmin ? (
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        className="flex-1 max-w-md px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none text-lg font-semibold"
                        autoFocus
                      />
                      <button
                        onClick={saveTeamName}
                        disabled={isSavingName || !teamName.trim()}
                        className="px-4 py-2 bg-brand-500 text-white font-medium rounded-xl hover:bg-brand-600 transition disabled:opacity-50"
                      >
                        {isSavingName ? '保存中...' : '保存'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingName(false);
                          setTeamName(team.name);
                        }}
                        className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition"
                      >
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <p className="text-2xl font-bold text-slate-900">{team.name}</p>
                      {isAdmin && (
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Invite Code (Admin only) */}
            {isAdmin && team.invite_code && (
              <div className="p-6 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-500 mb-1">招待コード</p>
                <div className="flex items-center gap-4">
                  <code className="px-6 py-3 bg-slate-100 rounded-xl font-mono text-2xl font-bold text-slate-900 tracking-[0.3em]">
                    {team.invite_code}
                  </code>
                  <button
                    onClick={copyInviteCode}
                    className={`px-5 py-3 rounded-xl font-medium transition ${
                      copiedCode
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {copiedCode ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        コピーしました
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        コピー
                      </span>
                    )}
                  </button>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  このコードを共有して新しいメンバーを招待できます
                </p>
              </div>
            )}

            {/* Your Role */}
            <div className="p-6">
              <p className="text-sm font-medium text-slate-500 mb-1">あなたの権限</p>
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                isAdmin
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {isAdmin ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    管理者
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    メンバー
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Members List */}
          <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 mb-8">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-900">メンバー一覧</h3>
                <span className="px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-600">
                  {members.length}人
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {members.map((member) => (
                <div key={member.id} className="p-6 hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-lg">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{member.name}</p>
                        <p className="text-sm text-slate-500">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isAdmin ? (
                        <>
                          <select
                            value={member.role}
                            onChange={(e) => changeRole(member.id, e.target.value as 'admin' | 'member')}
                            disabled={changingRoleId === member.id}
                            className="px-4 py-2 border-2 border-slate-200 rounded-xl bg-white font-medium text-sm focus:border-brand-500 focus:outline-none disabled:opacity-50"
                          >
                            <option value="admin">管理者</option>
                            <option value="member">メンバー</option>
                          </select>
                          <button
                            onClick={() => removeMember(member.id)}
                            disabled={removingMemberId === member.id}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition disabled:opacity-50"
                            title="チームから削除"
                          >
                            {removingMemberId === member.id ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </>
                      ) : (
                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                          member.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {member.role === 'admin' ? '管理者' : 'メンバー'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone (Admin only) */}
          {isAdmin && (
            <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-red-200">
              <div className="p-8 border-b border-red-100">
                <h3 className="font-bold text-lg text-red-600">危険な操作</h3>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">チームを削除</p>
                    <p className="text-sm text-slate-500 mt-1">
                      チームと全ての予約メニューが削除されます。この操作は取り消せません。
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-5 py-2.5 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition shadow-lg shadow-red-500/25"
                  >
                    チームを削除
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
                  本当にチームを削除しますか？
                </h3>
                <p className="text-slate-500 text-center mb-8">
                  「{team.name}」とすべての予約メニューが削除されます。メンバーはチームから外れます。
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={deleteTeam}
                    disabled={isDeletingTeam}
                    className="flex-1 px-4 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition disabled:opacity-50"
                  >
                    {isDeletingTeam ? '削除中...' : '削除する'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
