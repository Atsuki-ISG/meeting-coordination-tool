'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MemberRequest {
  id: string;
  email: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewer?: { name: string; email: string } | null;
}

type TabType = 'all' | 'pending' | 'approved' | 'rejected';

export default function MemberRequestsPage() {
  const [requests, setRequests] = useState<MemberRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const statusParam = activeTab !== 'all' ? `?status=${activeTab}` : '';
      const response = await fetch(`/api/member-requests${statusParam}`);
      const data = await response.json();

      if (response.ok) {
        setRequests(data.requests || []);
      } else {
        setError(data.error);
      }
    } catch {
      setError('申請一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (id: string) => {
    if (!confirm('この登録申請を承認しますか？')) return;

    setProcessingId(id);
    try {
      const response = await fetch(`/api/member-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      const data = await response.json();

      if (response.ok) {
        fetchRequests();
        alert('メンバーを承認しました');
      } else {
        setError(data.error);
      }
    } catch {
      setError('承認に失敗しました');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('拒否理由を入力してください（任意）:');
    if (reason === null) return; // User cancelled

    setProcessingId(id);
    try {
      const response = await fetch(`/api/member-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason: reason || undefined }),
      });

      const data = await response.json();

      if (response.ok) {
        fetchRequests();
      } else {
        setError(data.error);
      }
    } catch {
      setError('拒否に失敗しました');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この申請を削除しますか？')) return;

    try {
      const response = await fetch(`/api/member-requests/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchRequests();
      }
    } catch {
      setError('削除に失敗しました');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      pending: { label: '承認待ち', className: 'bg-yellow-100 text-yellow-800' },
      approved: { label: '承認済み', className: 'bg-green-100 text-green-800' },
      rejected: { label: '拒否', className: 'bg-red-100 text-red-800' },
    };
    const badge = badges[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
    return (
      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', badge.className)}>
        {badge.label}
      </span>
    );
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'pending', label: '承認待ち' },
    { key: 'approved', label: '承認済み' },
    { key: 'rejected', label: '拒否' },
    { key: 'all', label: 'すべて' },
  ];

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">登録申請管理</h1>
        <p className="text-slate-500 mt-1">新規メンバーの登録申請を承認・拒否します</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            閉じる
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors relative',
              activeTab === tab.key
                ? 'bg-brand-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {tab.label}
            {tab.key === 'pending' && pendingCount > 0 && activeTab !== 'pending' && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">読み込み中...</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            {activeTab === 'pending' ? '承認待ちの申請はありません' : '申請がありません'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  申請者
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  申請日時
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{request.name}</div>
                    <div className="text-sm text-slate-500">{request.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(request.status)}
                    {request.rejection_reason && (
                      <div className="text-xs text-slate-500 mt-1">
                        理由: {request.rejection_reason}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {format(new Date(request.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                    {request.reviewed_at && (
                      <div className="text-xs text-slate-400 mt-1">
                        処理: {format(new Date(request.reviewed_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {request.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                            disabled={processingId === request.id}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            {processingId === request.id ? '処理中...' : '承認'}
                          </Button>
                          <button
                            onClick={() => handleReject(request.id)}
                            disabled={processingId === request.id}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
                          >
                            拒否
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(request.id)}
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
    </div>
  );
}
