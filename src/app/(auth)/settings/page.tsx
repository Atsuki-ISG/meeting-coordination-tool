'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import type { WeeklyAvailability, DayAvailability, Member, Team } from '@/types';
import { DEFAULT_AVAILABILITY } from '@/types';

const DAY_NAMES: Record<string, string> = {
  "0": "日曜日",
  "1": "月曜日",
  "2": "火曜日",
  "3": "水曜日",
  "4": "木曜日",
  "5": "金曜日",
  "6": "土曜日",
};

const TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

export default function SettingsPage() {
  const [availability, setAvailability] = useState<WeeklyAvailability>(DEFAULT_AVAILABILITY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [role, setRole] = useState<'admin' | 'member' | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);

  const fetchTeamData = async () => {
    try {
      const [teamRes, membersRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/members'),
      ]);
      if (teamRes.ok) {
        const data = await teamRes.json();
        setTeam(data.team);
        setRole(data.role);
      }
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Failed to fetch team data:', error);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/availability');
        if (response.ok) {
          const data = await response.json();
          setAvailability(data.availability);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
    fetchTeamData();
  }, []);

  const copyInviteCode = async () => {
    if (team?.invite_code) {
      await navigator.clipboard.writeText(team.invite_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
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
        window.location.href = '/team';
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

  const changeRole = async (memberId: string, newRole: 'admin' | 'member') => {
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
    }
  };

  const updateDay = (day: string, updates: Partial<DayAvailability>) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...updates },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(availability),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: '設定を保存しました' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || '保存に失敗しました' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '保存に失敗しました' });
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 md:ml-72 p-4 pt-20 md:p-10 md:pt-10">
          {/* Header */}
          <header className="sticky top-0 -mx-10 px-10 py-6 bg-slate-50/80 backdrop-blur-md z-20 flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">設定</h1>
              <p className="text-slate-500 font-medium">予約可能時間を管理</p>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3.5 rounded-full text-white font-bold text-sm shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105 transition-all active:scale-95 bg-gradient-to-r from-brand-500 to-brand-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSaving ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>設定を保存</span>
                </>
              )}
            </button>
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
            </div>
          )}

          {/* Availability Settings */}
          <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100">
            <div className="p-8 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">曜日ごとの予約受付時間</h3>
              <p className="text-sm text-slate-500 mt-1">予約を受け付ける曜日と時間帯を設定します</p>
            </div>
            <div className="divide-y divide-slate-100">
              {["1", "2", "3", "4", "5", "6", "0"].map((day) => (
                <div
                  key={day}
                  className={`flex items-center gap-6 p-6 transition-colors ${
                    availability[day].enabled ? 'bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  <label className="flex items-center gap-4 cursor-pointer min-w-[140px]">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={availability[day].enabled}
                        onChange={(e) => updateDay(day, { enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                    </div>
                    <span className={`font-semibold ${availability[day].enabled ? 'text-slate-900' : 'text-slate-400'}`}>
                      {DAY_NAMES[day]}
                    </span>
                  </label>

                  {availability[day].enabled ? (
                    <div className="flex items-center gap-3">
                      <select
                        value={availability[day].startTime}
                        onChange={(e) => updateDay(day, { startTime: e.target.value })}
                        className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-brand-500 focus:outline-none transition-colors"
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                      <span className="text-slate-400 font-medium">〜</span>
                      <select
                        value={availability[day].endTime}
                        onChange={(e) => updateDay(day, { endTime: e.target.value })}
                        className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-brand-500 focus:outline-none transition-colors"
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400 font-medium">予約受付なし</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Team Management (Admin only) */}
          {team && (
            <div className="mt-8 bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100">
              <div className="p-8 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-900">チーム設定</h3>
                <p className="text-sm text-slate-500 mt-1">{team.name} の設定を管理します</p>
              </div>

              {/* Invite Code (Admin only) */}
              {role === 'admin' && team.invite_code && (
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">招待コード</p>
                      <p className="text-sm text-slate-500 mt-1">このコードを共有してメンバーを招待できます</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="px-4 py-2 bg-slate-100 rounded-lg font-mono text-lg font-bold text-slate-900 tracking-wider">
                        {team.invite_code}
                      </code>
                      <button
                        onClick={copyInviteCode}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                          copiedCode
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {copiedCode ? 'コピーしました' : 'コピー'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Members List */}
              <div className="p-6 border-b border-slate-100">
                <p className="font-semibold text-slate-900 mb-4">メンバー一覧</p>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{member.name}</p>
                          <p className="text-sm text-slate-500">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {role === 'admin' ? (
                          <>
                            <select
                              value={member.role}
                              onChange={(e) => changeRole(member.id, e.target.value as 'admin' | 'member')}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium bg-white"
                            >
                              <option value="admin">管理者</option>
                              <option value="member">メンバー</option>
                            </select>
                            <button
                              onClick={() => removeMember(member.id)}
                              disabled={removingMemberId === member.id}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
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
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            member.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {member.role === 'admin' ? '管理者' : 'メンバー'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delete Team (Admin only) */}
              {role === 'admin' && (
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-red-600">チームを削除</p>
                      <p className="text-sm text-slate-500 mt-1">この操作は取り消せません。すべてのデータが削除されます。</p>
                    </div>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition"
                    >
                      チームを削除
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                <h3 className="text-xl font-bold text-slate-900 mb-2">チームを削除しますか？</h3>
                <p className="text-slate-500 mb-6">
                  この操作は取り消せません。チームとすべての予約メニューが削除されます。
                  メンバーはチームから外れます。
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={deleteTeam}
                    disabled={isDeletingTeam}
                    className="flex-1 px-4 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition disabled:opacity-50"
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
