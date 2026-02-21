'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/layout/sidebar';
import type { EventType, Booking } from '@/types';

// Avatar colors for bookings
const avatarColors = [
  'from-rose-400 to-rose-600',
  'from-blue-400 to-blue-600',
  'from-amber-400 to-amber-600',
  'from-violet-400 to-violet-600',
  'from-emerald-400 to-emerald-600',
];

export default function DashboardPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyBookingLink = async (id: string, slug: string) => {
    const url = `${window.location.origin}/book/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventTypesRes, bookingsRes] = await Promise.all([
          fetch('/api/event-types'),
          fetch('/api/bookings?status=confirmed&upcoming=true'),
        ]);

        if (eventTypesRes.ok) {
          const data = await eventTypesRes.json();
          setEventTypes(data);
        }

        if (bookingsRes.ok) {
          const data = await bookingsRes.json();
          setUpcomingBookings(data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

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
          <header className="sticky top-16 md:top-0 -mx-4 md:-mx-10 px-4 md:px-10 py-4 md:py-6 bg-slate-50/80 backdrop-blur-md z-20 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 md:mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mb-1">ダッシュボード</h1>
              <p className="text-slate-500 font-medium text-sm md:text-base">{format(new Date(), 'yyyy年M月d日（E）', { locale: ja })}</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/event-types/new">
                <button className="flex items-center gap-2 px-5 md:px-6 py-3 md:py-3.5 rounded-full text-white font-bold text-sm shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105 transition-all active:scale-95 bg-gradient-to-r from-brand-500 to-brand-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                  </svg>
                  <span>新規作成</span>
                </button>
              </Link>
            </div>
          </header>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-10">
            {/* Event Types Count */}
            <div className="relative group p-6 md:p-8 rounded-2xl md:rounded-[2rem] bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 border border-slate-100 overflow-hidden">
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold text-slate-900 tracking-tighter">{eventTypes.length}</span>
                </div>
                <p className="text-sm font-medium text-slate-500">予約タイプ</p>
              </div>
            </div>

            {/* Upcoming Bookings Count */}
            <div className="relative group p-6 md:p-8 rounded-2xl md:rounded-[2rem] bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 border border-slate-100 overflow-hidden">
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                  </svg>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold text-slate-900 tracking-tighter">{upcomingBookings.length}</span>
                </div>
                <p className="text-sm font-medium text-slate-500">今後の予約</p>
              </div>
            </div>

            {/* Confirmed Count */}
            <div className="relative group p-6 md:p-8 rounded-2xl md:rounded-[2rem] bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 border border-slate-100 overflow-hidden">
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold text-slate-900 tracking-tighter">
                    {upcomingBookings.filter((b) => b.status === 'confirmed').length}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-500">確定済み</p>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
            {/* Event Types List */}
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100">
              <div className="p-4 md:p-8 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-slate-900">予約タイプ</h3>
                  <Link href="/event-types" className="text-sm text-brand-500 font-semibold hover:text-brand-600 transition">
                    すべて表示 →
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {eventTypes.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-slate-500">予約タイプがまだありません</p>
                    <Link href="/event-types/new">
                      <Button variant="outline" className="mt-4">
                        最初の予約タイプを作成
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    {eventTypes.slice(0, 5).map((eventType) => (
                      <div key={eventType.id} className="p-5 group hover:bg-slate-50/50 transition">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${eventType.is_active ? 'bg-brand-500' : 'bg-slate-300'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold ${eventType.is_active ? 'text-slate-900 group-hover:text-brand-500' : 'text-slate-400'} transition-colors`}>
                              {eventType.title}
                            </p>
                            <p className={`text-sm ${eventType.is_active ? 'text-slate-500' : 'text-slate-400'}`}>
                              {eventType.duration_minutes}分
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyBookingLink(eventType.id, eventType.slug)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                copiedId === eventType.id
                                  ? 'bg-brand-500 text-white'
                                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                              }`}
                            >
                              {copiedId === eventType.id ? (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  完了
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  コピー
                                </>
                              )}
                            </button>
                            <Link href={`/event-types/${eventType.id}`}>
                              <button className="p-2 rounded-lg hover:bg-slate-100 transition">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                    {eventTypes.length > 5 && (
                      <div className="p-4">
                        <Link href="/event-types">
                          <button className="w-full py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition">
                            他 {eventTypes.length - 5} 件を表示
                          </button>
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Upcoming Bookings */}
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100">
              <div className="p-4 md:p-8 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-slate-900">今後の予約</h3>
                  <Link href="/bookings" className="text-sm text-brand-500 font-semibold hover:text-brand-600 transition">
                    すべて表示 →
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {upcomingBookings.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-slate-500">予約がありません</p>
                  </div>
                ) : (
                  <>
                    {upcomingBookings.slice(0, 5).map((booking, index) => (
                      <div key={booking.id} className="p-5 group hover:bg-slate-50/50 transition cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColors[index % avatarColors.length]} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                            {booking.requester_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 group-hover:text-brand-500 transition-colors">
                              {booking.requester_name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {format(new Date(booking.start_at), 'M月d日 (E) HH:mm', { locale: ja })}
                            </p>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            booking.status === 'confirmed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              booking.status === 'confirmed' ? 'bg-green-500' : 'bg-slate-400'
                            }`} />
                            {booking.status === 'confirmed' ? '確定' : 'キャンセル'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {upcomingBookings.length > 5 && (
                      <div className="p-4">
                        <Link href="/bookings">
                          <button className="w-full py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition">
                            他 {upcomingBookings.length - 5} 件を表示
                          </button>
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
