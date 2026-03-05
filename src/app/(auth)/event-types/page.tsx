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
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const duplicateEventType = async (eventType: EventType) => {
    setDuplicatingId(eventType.id);
    setErrorMessage(null);
    try {
      // Fetch members of the original event type
      const membersRes = await fetch(`/api/event-types/${eventType.id}/members`);
      const memberIds = membersRes.ok
        ? (await membersRes.json()).map((m: { member_id: string }) => m.member_id)
        : [];

      const response = await fetch('/api/event-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${eventType.title}（コピー）`,
          description: eventType.description || '',
          durationMinutes: eventType.duration_minutes,
          memberIds,
          participationMode: eventType.participation_mode,
          noteTakerMemberId: eventType.note_taker_member_id,
          calendarTitleTemplate: eventType.calendar_title_template,
          bufferMinutes: eventType.buffer_minutes,
          daysAhead: eventType.days_ahead,
          minNoticeMinutes: eventType.min_notice_minutes,
          timeRestrictionType: eventType.time_restriction_type,
          timeRestrictionPresetId: eventType.time_restriction_preset_id,
          timeRestrictionCustom: eventType.time_restriction_custom,
        }),
      });

      if (response.ok) {
        // Refresh the list
        const res = await fetch('/api/event-types');
        if (res.ok) {
          setEventTypes(await res.json());
        }
      } else {
        const error = await response.json();
        setErrorMessage(error.error || '複製に失敗しました');
      }
    } catch (error) {
      console.error('Failed to duplicate event type:', error);
      setErrorMessage('複製に失敗しました');
    } finally {
      setDuplicatingId(null);
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
          <p className="text-sm text-slate-500">読み込み中…</p>
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
            <Link href="/event-types/new" className="self-start sm:self-auto flex items-center gap-2 px-5 md:px-6 py-3 md:py-3.5 rounded-full text-white font-bold text-sm shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105 transition-all active:scale-95 bg-gradient-to-r from-brand-500 to-brand-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                <span>新規作成</span>
            </Link>
          </header>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm font-medium text-red-700">{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

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
              <Link href="/event-types/new" className="inline-flex px-6 py-3 rounded-full text-white font-bold text-sm shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105 transition-all active:scale-95 bg-gradient-to-r from-brand-500 to-brand-600">
                  最初の予約タイプを作成
              </Link>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {eventTypes.map((eventType) => {
                const canEdit = currentRole === 'admin' || eventType.organizer_id === currentMemberId;
                return (
                  <div
                    key={eventType.id}
                    className="bg-white rounded-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-slate-100 p-4 md:p-6 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-300"
                  >
                    {/* Info area */}
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${eventType.is_active ? 'bg-brand-500' : 'bg-slate-300'}`} />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-base md:text-lg text-slate-900 break-words">{eventType.title}</h3>
                        {eventType.calendar_title_template && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate flex items-center gap-1">
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate">{eventType.calendar_title_template}</span>
                          </p>
                        )}
                        {eventType.description && (
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{eventType.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {eventType.duration_minutes}分
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            eventType.is_active
                              ? 'bg-green-50 text-green-600'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${eventType.is_active ? 'bg-green-500' : 'bg-slate-400'}`} />
                            {eventType.is_active ? '募集中' : '募集停止'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions row - separated below for clarity */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 ml-6 md:ml-7">
                      {/* Copy link - always visible */}
                      <button
                        onClick={() => copyBookingLink(eventType.id, eventType.slug)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          copiedId === eventType.id
                            ? 'bg-brand-500 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {copiedId === eventType.id ? (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            コピー完了
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            リンクをコピー
                          </>
                        )}
                      </button>

                      <span className="w-px h-4 bg-slate-200" />

                      {/* Preview page */}
                      <Link href={`/book/${eventType.slug}`} target="_blank" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          プレビュー
                      </Link>

                      {canEdit && (
                        <>
                          {/* Duplicate - secondary */}
                          <span className="w-px h-4 bg-slate-200" />
                          <button
                            onClick={() => duplicateEventType(eventType)}
                            disabled={duplicatingId === eventType.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all disabled:opacity-50"
                          >
                            {duplicatingId === eventType.id ? (
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                              </svg>
                            )}
                            複製
                          </button>

                          {/* Edit - primary action, pushed to right */}
                          <div className="flex-1" />
                          <Link href={`/event-types/${eventType.id}`} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 transition-all">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              編集
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
