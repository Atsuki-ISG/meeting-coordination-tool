'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Invitation {
  id: string;
  email: string;
  token: string;
  status: 'pending' | 'approved' | 'rejected' | 'used';
  max_bookings: number;
  bookings_count: number;
  expires_at: string | null;
  note: string | null;
  created_at: string;
  invited_by_member?: { name: string; email: string } | null;
  approved_by_member?: { name: string; email: string } | null;
}

type TabType = 'all' | 'pending' | 'approved' | 'used';

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    maxBookings: '1',
    note: '',
    sendEmail: false,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    try {
      setIsLoading(true);
      const statusParam = activeTab !== 'all' ? `?status=${activeTab}` : '';
      const response = await fetch(`/api/invitations${statusParam}`);
      const data = await response.json();

      if (response.ok) {
        setInvitations(data.invitations || []);
      } else {
        setError(data.error);
      }
    } catch {
      setError('招待一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createForm.email,
          maxBookings: parseInt(createForm.maxBookings, 10),
          note: createForm.note || undefined,
          autoApprove: true,
          sendEmail: createForm.sendEmail,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowCreateModal(false);
        setCreateForm({ email: '', maxBookings: '1', note: '', sendEmail: false });
        fetchInvitations();
        // Copy the booking URL to clipboard
        if (data.bookingUrl) {
          navigator.clipboard.writeText(data.bookingUrl);
          const emailMessage = data.emailSent ? '\n招待メールも送信されました。' : '';
          alert(`招待リンクがクリップボードにコピーされました:\n${data.bookingUrl}${emailMessage}`);
        }
      } else {
        setError(data.error);
      }
    } catch {
      setError('招待の作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async (invitation: Invitation) => {
    const baseUrl = window.location.origin;
    const bookingUrl = `${baseUrl}/book?invitation=${invitation.token}`;
    await navigator.clipboard.writeText(bookingUrl);
    setCopiedId(invitation.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/invitations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (response.ok) {
        fetchInvitations();
      }
    } catch {
      setError('承認に失敗しました');
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('この招待を拒否しますか？')) return;

    try {
      const response = await fetch(`/api/invitations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });

      if (response.ok) {
        fetchInvitations();
      }
    } catch {
      setError('拒否に失敗しました');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この招待を削除しますか？')) return;

    try {
      const response = await fetch(`/api/invitations/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchInvitations();
      }
    } catch {
      setError('削除に失敗しました');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      pending: { label: '承認待ち', className: 'bg-yellow-100 text-yellow-800' },
      approved: { label: '有効', className: 'bg-green-100 text-green-800' },
      rejected: { label: '拒否', className: 'bg-red-100 text-red-800' },
      used: { label: '使用済み', className: 'bg-slate-100 text-slate-600' },
    };
    const badge = badges[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
    return (
      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', badge.className)}>
        {badge.label}
      </span>
    );
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'all', label: 'すべて' },
    { key: 'pending', label: '承認待ち' },
    { key: 'approved', label: '有効' },
    { key: 'used', label: '使用済み' },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">招待管理</h1>
          <p className="text-slate-500 mt-1">予約ページへの招待リンクを管理します</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          招待を作成
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-brand-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invitations List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">読み込み中...</div>
        ) : invitations.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            招待がありません
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  メールアドレス
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  使用状況
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  作成日
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invitations.map((invitation) => (
                <tr key={invitation.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{invitation.email}</div>
                    {invitation.note && (
                      <div className="text-sm text-slate-500 mt-1">{invitation.note}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(invitation.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {invitation.bookings_count} / {invitation.max_bookings} 回
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {format(new Date(invitation.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {invitation.status === 'approved' && (
                        <button
                          onClick={() => handleCopyLink(invitation)}
                          className={cn(
                            'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                            copiedId === invitation.id
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          )}
                        >
                          {copiedId === invitation.id ? 'コピー済み' : 'リンクをコピー'}
                        </button>
                      )}
                      {invitation.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(invitation.id)}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                          >
                            承認
                          </button>
                          <button
                            onClick={() => handleReject(invitation.id)}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                          >
                            拒否
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(invitation.id)}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-slate-900 mb-4">新しい招待を作成</h2>
            <form onSubmit={handleCreateInvitation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="example@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  最大予約回数
                </label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={createForm.maxBookings}
                  onChange={(e) => setCreateForm({ ...createForm, maxBookings: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">
                  この招待リンクで予約できる最大回数です
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  メモ（管理用）
                </label>
                <Textarea
                  value={createForm.note}
                  onChange={(e) => setCreateForm({ ...createForm, note: e.target.value })}
                  placeholder="例: 〇〇株式会社の田中様"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={createForm.sendEmail}
                  onChange={(e) => setCreateForm({ ...createForm, sendEmail: e.target.checked })}
                  className="w-4 h-4 text-brand-500 border-slate-300 rounded focus:ring-brand-500"
                />
                <label htmlFor="sendEmail" className="text-sm text-slate-700">
                  招待メールを送信する
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={isCreating} className="flex-1">
                  {isCreating ? '作成中...' : '作成してリンクをコピー'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
