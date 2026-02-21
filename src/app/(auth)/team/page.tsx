'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';

interface MyTeam {
  id: string;
  name: string;
  invite_code: string;
  role: 'admin' | 'member';
  isActive: boolean;
}

export default function TeamPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create mode
  const [showCreate, setShowCreate] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdTeam, setCreatedTeam] = useState<{ name: string; invite_code: string } | null>(null);

  // Join mode
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/my-teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const switchTeam = async (teamId: string) => {
    setSwitchingId(teamId);
    try {
      const res = await fetch('/api/teams/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });
      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        const d = await res.json();
        setMessage({ type: 'error', text: d.error || '切り替えに失敗しました' });
      }
    } catch {
      setMessage({ type: 'error', text: '切り替えに失敗しました' });
    } finally {
      setSwitchingId(null);
    }
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName }),
      });
      if (res.ok) {
        const team = await res.json();
        setCreatedTeam(team);
        setTeamName('');
        setShowCreate(false);
        await fetchTeams();
      } else {
        const d = await res.json();
        setMessage({ type: 'error', text: d.error || '作成に失敗しました' });
      }
    } catch {
      setMessage({ type: 'error', text: '作成に失敗しました' });
    } finally {
      setIsCreating(false);
    }
  };

  const joinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoining(true);
    try {
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.toUpperCase() }),
      });
      if (res.ok) {
        setInviteCode('');
        setShowJoin(false);
        setMessage({ type: 'success', text: 'チームに参加しました（アクティブチームに切り替えました）' });
        await fetchTeams();
      } else {
        const d = await res.json();
        setMessage({ type: 'error', text: d.error || '参加に失敗しました' });
      }
    } catch {
      setMessage({ type: 'error', text: '参加に失敗しました' });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 md:ml-72 p-4 pt-20 md:p-10 md:pt-10">
          <header className="sticky top-0 -mx-10 px-10 py-6 bg-slate-50/80 backdrop-blur-md z-20 mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">マイチーム</h1>
            <p className="text-slate-500 font-medium">所属チームの確認と切り替え</p>
          </header>

          {/* Message */}
          {message && (
            <div className={`mb-6 rounded-2xl p-4 flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <span className="font-medium">{message.text}</span>
              <button onClick={() => setMessage(null)} className="ml-auto">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Created team success */}
          {createdTeam && (
            <div className="mb-8 bg-green-50 border border-green-200 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-green-900">「{createdTeam.name}」を作成しました</p>
                  <p className="text-sm text-green-700">アクティブチームに切り替えました</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 inline-block">
                <p className="text-xs font-medium text-slate-500 mb-1">招待コード</p>
                <p className="text-2xl font-bold tracking-[0.3em] text-slate-900 font-mono">{createdTeam.invite_code}</p>
              </div>
              <p className="mt-3 text-sm text-green-700">このコードをメンバーに共有してください</p>
              <button onClick={() => setCreatedTeam(null)} className="mt-4 text-sm text-green-600 underline">閉じる</button>
            </div>
          )}

          {/* Teams list */}
          <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 mb-6">
            <div className="p-8 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">所属チーム</h3>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-slate-400">読み込み中...</div>
            ) : teams.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                まだチームに所属していません
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {teams.map((team) => (
                  <div key={team.id} className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xl">
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">{team.name}</p>
                          {team.isActive && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-700">
                              アクティブ
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            team.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {team.role === 'admin' ? '管理者' : 'メンバー'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {team.isActive ? (
                      <button
                        onClick={() => router.push('/settings/team')}
                        className="px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-xl transition"
                      >
                        チーム設定 →
                      </button>
                    ) : (
                      <button
                        onClick={() => switchTeam(team.id)}
                        disabled={!!switchingId}
                        className="px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition disabled:opacity-50"
                      >
                        {switchingId === team.id ? '切り替え中...' : '切り替える'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Create team */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <button
                onClick={() => { setShowCreate(!showCreate); setShowJoin(false); }}
                className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 transition text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-slate-900">新しいチームを作成</p>
                  <p className="text-sm text-slate-500">チームを作成して管理者になる</p>
                </div>
              </button>
              {showCreate && (
                <form onSubmit={createTeam} className="px-6 pb-6 pt-0 border-t border-slate-100">
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="チーム名"
                    required
                    className="w-full mt-4 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:outline-none text-slate-900"
                  />
                  <div className="flex gap-3 mt-3">
                    <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition text-sm">
                      キャンセル
                    </button>
                    <button type="submit" disabled={isCreating || !teamName.trim()} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition disabled:opacity-50 text-sm">
                      {isCreating ? '作成中...' : '作成する'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Join team */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <button
                onClick={() => { setShowJoin(!showJoin); setShowCreate(false); }}
                className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 transition text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-slate-900">招待コードで参加</p>
                  <p className="text-sm text-slate-500">既存のチームに招待コードで参加する</p>
                </div>
              </button>
              {showJoin && (
                <form onSubmit={joinTeam} className="px-6 pb-6 pt-0 border-t border-slate-100">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="招待コード（8文字）"
                    maxLength={8}
                    required
                    className="w-full mt-4 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:outline-none text-slate-900 text-center font-mono text-xl tracking-widest uppercase"
                  />
                  <div className="flex gap-3 mt-3">
                    <button type="button" onClick={() => setShowJoin(false)} className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition text-sm">
                      キャンセル
                    </button>
                    <button type="submit" disabled={isJoining || inviteCode.length !== 8} className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition disabled:opacity-50 text-sm">
                      {isJoining ? '参加中...' : '参加する'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
