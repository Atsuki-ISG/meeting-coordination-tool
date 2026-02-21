'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/sidebar';
import type { EventType } from '@/types';

export default function EventTypesPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchEventTypes = async () => {
      try {
        const response = await fetch('/api/event-types');
        if (response.ok) {
          const data = await response.json();
          setEventTypes(data);
        }
      } catch (error) {
        console.error('Failed to fetch event types:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchCurrentUser = async () => {
      try {
        const res = await fetch('/api/teams');
        if (res.ok) {
          const data = await res.json();
          setCurrentMemberId(data.memberId ?? null);
          setCurrentRole(data.role ?? null);
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    };

    fetchEventTypes();
    fetchCurrentUser();
  }, []);

  const copyBookingLink = async (id: string, slug: string) => {
    const url = `${window.location.origin}/book/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
          <header className="sticky top-0 -mx-4 md:-mx-10 px-4 md:px-10 py-4 md:py-6 bg-slate-50/80 backdrop-blur-md z-20 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 md:mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mb-1">予約タイプ</h1>
              <p className="text-sm md:text-base text-slate-500 font-medium">予約タイプの作成・管理</p>
            </div>
            <Link href="/event-types/new" className="self-start sm:self-auto">
              <button className="flex items-center gap-2 px-5 md:px-6 py-3 md:py-3.5 rounded-full text-white font-bold text-sm shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105 transition-all active:scale-95 bg-gradient-to-r from-brand-500 to-brand-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                <span>新規作成</span>
              </button>
            </Link>
          </header>

          {/* Event Types List */}
          {eventTypes.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 p-12 text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">予約タイプがまだありません</h3>
              <p className="text-slate-500 mb-6">最初の予約タイプを作成して、予約の受付を始めましょう。</p>
              <Link href="/event-types/new">
                <button className="px-6 py-3 rounded-full text-white font-bold text-sm shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105 transition-all active:scale-95 bg-gradient-to-r from-brand-500 to-brand-600">
                  最初の予約タイプを作成
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {eventTypes.map((eventType) => (
                <div
                  key={eventType.id}
                  className="bg-white rounded-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-slate-100 p-4 md:p-6 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${eventType.is_active ? 'bg-brand-500' : 'bg-slate-300'}`} />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-base md:text-lg text-slate-900 break-words">{eventType.title}</h3>
                        {eventType.description && (
                          <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{eventType.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {eventType.duration_minutes}分
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            eventType.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${eventType.is_active ? 'bg-green-500' : 'bg-slate-400'}`} />
                            {eventType.is_active ? '募集中' : '募集停止'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 ml-6 md:ml-0">
                      <button
                        onClick={() => copyBookingLink(eventType.id, eventType.slug)}
                        className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                          copiedId === eventType.id
                            ? 'bg-brand-500 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {copiedId === eventType.id ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="hidden sm:inline">コピー完了</span>
                            <span className="sm:hidden">完了</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span className="hidden sm:inline">リンクをコピー</span>
                            <span className="sm:hidden">コピー</span>
                          </>
                        )}
                      </button>
                      <Link href={`/book/${eventType.slug}`} target="_blank">
                        <button className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs md:text-sm font-semibold hover:bg-slate-200 transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span className="hidden sm:inline">予約ページを表示</span>
                        </button>
                      </Link>
                      {(currentRole === 'admin' || eventType.organizer_id === currentMemberId) && (
                        <Link href={`/event-types/${eventType.id}`}>
                          <button className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-700 text-xs md:text-sm font-semibold hover:border-brand-500 hover:text-brand-600 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="hidden sm:inline">編集</span>
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
