'use client';

import { useEffect, useState } from 'react';

export default function PendingApprovalPage() {
  const [checkingStatus, setCheckingStatus] = useState(false);

  const checkStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'active') {
          // Redirect to appropriate page
          window.location.href = data.teamId ? '/dashboard' : '/team';
        }
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Check status periodically
  useEffect(() => {
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] p-8 text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            承認待ち
          </h1>

          {/* Description */}
          <p className="text-slate-600 mb-6">
            アカウントの承認をお待ちください。
            <br />
            システム管理者が確認後、利用可能になります。
          </p>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-6">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            承認待ち状態
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <a
              href="/team"
              className="block w-full px-6 py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition text-center"
            >
              招待コードで参加する
            </a>

            <button
              onClick={checkStatus}
              disabled={checkingStatus}
              className="w-full px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition disabled:opacity-50"
            >
              {checkingStatus ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  確認中...
                </span>
              ) : (
                'ステータスを確認'
              )}
            </button>

            <a
              href="/api/auth/logout"
              className="block w-full px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition text-center"
            >
              ログアウト
            </a>
          </div>

          {/* Info */}
          <p className="mt-6 text-xs text-slate-400">
            招待コードをお持ちの場合は「招待コードで参加する」から即時参加できます
          </p>
        </div>
      </div>
    </div>
  );
}
