'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';

interface Member {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  google_refresh_token: string | null;
  created_at: string;
}

// Avatar colors for members
const avatarColors = [
  'from-rose-400 to-rose-600',
  'from-blue-400 to-blue-600',
  'from-amber-400 to-amber-600',
  'from-violet-400 to-violet-600',
  'from-emerald-400 to-emerald-600',
];

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members/all');
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleActive = async (memberId: string, isActive: boolean) => {
    setUpdatingId(memberId);
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId ? { ...m, is_active: !isActive } : m
          )
        );
      }
    } catch (error) {
      console.error('Failed to update member:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="h-8 w-8 animate-spin text-brand-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-sm text-slate-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 md:ml-72 p-4 pt-20 md:p-10 md:pt-10">
          {/* Header */}
          <header className="sticky top-0 -mx-10 px-10 py-6 bg-slate-50/80 backdrop-blur-md z-20 flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">メンバー</h1>
              <p className="text-slate-500 font-medium">チームメンバーを管理</p>
            </div>
          </header>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="relative group p-8 rounded-[2rem] bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 border border-slate-100 overflow-hidden">
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold text-slate-900 tracking-tighter">{members.length}</span>
                </div>
                <p className="text-sm font-medium text-slate-500">総メンバー数</p>
              </div>
            </div>

            <div className="relative group p-8 rounded-[2rem] bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 border border-slate-100 overflow-hidden">
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold text-slate-900 tracking-tighter">
                    {members.filter((m) => m.is_active).length}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-500">有効なメンバー</p>
              </div>
            </div>

            <div className="relative group p-8 rounded-[2rem] bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 border border-slate-100 overflow-hidden">
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold text-slate-900 tracking-tighter">
                    {members.filter((m) => m.google_refresh_token).length}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-500">Google連携済み</p>
              </div>
            </div>
          </div>

          {/* Members List */}
          <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100">
            <div className="p-8 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">メンバー一覧</h3>
            </div>
            {members.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">メンバーがいません</h3>
                <p className="text-slate-500">Googleでログインするとメンバーとして登録されます。</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {members.map((member, index) => (
                  <div
                    key={member.id}
                    className="p-6 hover:bg-slate-50/50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-full bg-gradient-to-br ${
                            member.is_active
                              ? avatarColors[index % avatarColors.length]
                              : 'from-slate-300 to-slate-400'
                          } flex items-center justify-center text-white font-bold text-lg shadow-lg`}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{member.name}</h3>
                          <p className="text-sm text-slate-600">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Calendar connection status */}
                        {member.google_refresh_token ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Google連携済み
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Google未連携
                          </span>
                        )}

                        {/* Active status toggle */}
                        <button
                          onClick={() => toggleActive(member.id, member.is_active)}
                          disabled={updatingId === member.id}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            member.is_active
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'bg-brand-500 text-white shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50'
                          } disabled:opacity-50`}
                        >
                          {updatingId === member.id ? (
                            <svg className="w-4 h-4 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : member.is_active ? (
                            '無効にする'
                          ) : (
                            '有効にする'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="mt-8 rounded-2xl bg-brand-50 border border-brand-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-brand-900">メンバーを追加するには</h3>
                <p className="mt-1 text-sm text-brand-700">
                  新しいメンバーを追加するには、そのユーザーにGoogleアカウントでログインしてもらってください。
                  ログインすると自動的にメンバーとして登録され、カレンダーが連携されます。
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
