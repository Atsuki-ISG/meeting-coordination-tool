'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Sidebar } from '@/components/layout/sidebar';

interface UsageStats {
  totalRequests: number;
  availabilityRequests: number;
  bookingRequests: number;
  cancelRequests: number;
}

interface SystemSettings {
  maintenanceMode: { enabled: boolean; message: string };
}

interface PendingMember {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface AllMember {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'active' | 'suspended';
  is_system_admin: boolean;
  team_id: string | null;
  created_at: string;
}

export default function AdminPage() {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [allMembers, setAllMembers] = useState<AllMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/admin/members');
      if (res.ok) {
        const data = await res.json();
        setPendingMembers(data.pending || []);
        setAllMembers(data.all || []);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usageRes, settingsRes] = await Promise.all([
          fetch('/api/admin/usage'),
          fetch('/api/admin/settings'),
        ]);

        if (usageRes.ok) {
          const data = await usageRes.json();
          setUsageStats(data);
        }

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings(data);
        }

        await fetchMembers();
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const updateMemberStatus = async (memberId: string, status: 'active' | 'suspended') => {
    setProcessingId(memberId);
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        await fetchMembers();
      }
    } catch (error) {
      console.error('Failed to update member:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const toggleSystemAdmin = async (memberId: string, isSystemAdmin: boolean) => {
    setProcessingId(memberId);
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_system_admin: !isSystemAdmin }),
      });

      if (res.ok) {
        await fetchMembers();
      }
    } catch (error) {
      console.error('Failed to toggle system admin:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const toggleMaintenanceMode = async () => {
    if (!settings) return;

    try {
      setIsSaving(true);
      const newEnabled = !settings.maintenanceMode.enabled;

      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maintenanceMode: {
            enabled: newEnabled,
            message: newEnabled ? 'Service is temporarily unavailable for maintenance.' : '',
          },
        }),
      });

      if (response.ok) {
        setSettings({
          ...settings,
          maintenanceMode: {
            enabled: newEnabled,
            message: newEnabled ? 'Service is temporarily unavailable for maintenance.' : '',
          },
        });
      }
    } catch (error) {
      console.error('Failed to toggle maintenance mode:', error);
    } finally {
      setIsSaving(false);
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

  const currentMonth = format(new Date(), 'yyyy年M月');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 md:ml-72 p-4 pt-20 md:p-10 md:pt-10">
          {/* Header */}
          <header className="sticky top-0 -mx-10 px-10 py-6 bg-slate-50/80 backdrop-blur-md z-20 flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">管理画面</h1>
              <p className="text-slate-500 font-medium">システム設定と使用状況</p>
            </div>
          </header>

          {/* System Status Card */}
          <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 mb-8">
            <div className="p-8 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">システムステータス</h3>
            </div>
            <div className="p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    settings?.maintenanceMode.enabled
                      ? 'bg-amber-100'
                      : 'bg-green-100'
                  }`}>
                    {settings?.maintenanceMode.enabled ? (
                      <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">メンテナンスモード</p>
                    <p className="text-sm text-slate-500">
                      {settings?.maintenanceMode.enabled
                        ? '外部ユーザーはサービスを利用できません'
                        : 'サービスは正常に稼働しています'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleMaintenanceMode}
                  disabled={isSaving}
                  className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                    settings?.maintenanceMode.enabled
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50'
                      : 'bg-red-500 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50'
                  } disabled:opacity-50`}
                >
                  {isSaving ? (
                    <svg className="w-5 h-5 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : settings?.maintenanceMode.enabled ? (
                    'サービスを再開'
                  ) : (
                    'サービスを停止'
                  )}
                </button>
              </div>
              {settings?.maintenanceMode.enabled && (
                <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-amber-800">
                    メンテナンスモードが有効です。外部ユーザーは新しい予約を作成できません。
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* User Management */}
          <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 mb-8">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-900">ユーザー管理</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === 'pending'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    承認待ち ({pendingMembers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === 'all'
                        ? 'bg-brand-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    全ユーザー ({allMembers.length})
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'pending' ? (
              <div className="divide-y divide-slate-100">
                {pendingMembers.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-slate-500">承認待ちのユーザーはいません</p>
                  </div>
                ) : (
                  pendingMembers.map((member) => (
                    <div key={member.id} className="p-6 hover:bg-slate-50/50 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-lg">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{member.name}</p>
                            <p className="text-sm text-slate-500">{member.email}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              登録: {format(new Date(member.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateMemberStatus(member.id, 'active')}
                            disabled={processingId === member.id}
                            className="px-4 py-2 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition disabled:opacity-50"
                          >
                            {processingId === member.id ? '処理中...' : '承認'}
                          </button>
                          <button
                            onClick={() => updateMemberStatus(member.id, 'suspended')}
                            disabled={processingId === member.id}
                            className="px-4 py-2 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition disabled:opacity-50"
                          >
                            拒否
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {allMembers.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-slate-500">ユーザーがいません</p>
                  </div>
                ) : (
                  allMembers.map((member) => (
                    <div key={member.id} className="p-6 hover:bg-slate-50/50 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg ${
                            member.status === 'active'
                              ? 'from-brand-400 to-brand-600'
                              : member.status === 'pending'
                              ? 'from-amber-400 to-amber-600'
                              : 'from-slate-400 to-slate-600'
                          }`}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900">{member.name}</p>
                              {member.is_system_admin && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                                  システム管理者
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">{member.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                member.status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : member.status === 'pending'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {member.status === 'active' ? '有効' : member.status === 'pending' ? '承認待ち' : '停止中'}
                              </span>
                              {member.team_id && (
                                <span className="text-xs text-slate-400">チーム所属</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.status === 'active' ? (
                            <>
                              <button
                                onClick={() => toggleSystemAdmin(member.id, member.is_system_admin)}
                                disabled={processingId === member.id}
                                className={`px-3 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${
                                  member.is_system_admin
                                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {member.is_system_admin ? '管理者解除' : '管理者に昇格'}
                              </button>
                              <button
                                onClick={() => updateMemberStatus(member.id, 'suspended')}
                                disabled={processingId === member.id}
                                className="px-3 py-2 bg-red-100 text-red-600 font-semibold rounded-xl hover:bg-red-200 transition disabled:opacity-50 text-sm"
                              >
                                停止
                              </button>
                            </>
                          ) : member.status === 'suspended' ? (
                            <button
                              onClick={() => updateMemberStatus(member.id, 'active')}
                              disabled={processingId === member.id}
                              className="px-4 py-2 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition disabled:opacity-50"
                            >
                              再有効化
                            </button>
                          ) : (
                            <button
                              onClick={() => updateMemberStatus(member.id, 'active')}
                              disabled={processingId === member.id}
                              className="px-4 py-2 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition disabled:opacity-50"
                            >
                              承認
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Usage Statistics */}
          <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 mb-8">
            <div className="p-8 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">API使用状況 - {currentMonth}</h3>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="relative group p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-bold text-blue-600 tracking-tighter">
                      {usageStats?.totalRequests ?? 0}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-500">総リクエスト数</p>
                </div>
                <div className="relative group p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-bold text-green-600 tracking-tighter">
                      {usageStats?.availabilityRequests ?? 0}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-500">空き状況確認</p>
                </div>
                <div className="relative group p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-bold text-purple-600 tracking-tighter">
                      {usageStats?.bookingRequests ?? 0}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-500">予約作成</p>
                </div>
                <div className="relative group p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-bold text-red-600 tracking-tighter">
                      {usageStats?.cancelRequests ?? 0}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-500">キャンセル</p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-6">
                <h4 className="font-bold text-slate-900 mb-3">使用量に関する注意事項</h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    各空き状況確認でメンバーごとにGoogle Calendar FreeBusy APIを1回呼び出します
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    予約作成には空き状況の再確認とイベント作成が含まれます
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Google Calendar API無料枠: 1日100万クエリ
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100">
            <div className="p-8 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">クイックアクション</h3>
            </div>
            <div className="p-8">
              <div className="grid gap-4 md:grid-cols-2">
                <Link href="/members" className="block">
                  <div className="flex items-center gap-4 p-6 rounded-2xl border-2 border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition-all group">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
                      <svg className="w-6 h-6 text-slate-600 group-hover:text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 group-hover:text-brand-600">メンバー管理</p>
                      <p className="text-sm text-slate-500">チームメンバーを管理</p>
                    </div>
                  </div>
                </Link>
                <Link href="/bookings" className="block">
                  <div className="flex items-center gap-4 p-6 rounded-2xl border-2 border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition-all group">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
                      <svg className="w-6 h-6 text-slate-600 group-hover:text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 group-hover:text-brand-600">予約一覧</p>
                      <p className="text-sm text-slate-500">すべての予約を表示</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
