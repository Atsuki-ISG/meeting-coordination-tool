'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Sidebar } from '@/components/layout/sidebar';
import type { Booking, BookingWithEventType } from '@/types';

// Avatar colors for bookings
const avatarColors = [
  'from-rose-400 to-rose-600',
  'from-blue-400 to-blue-600',
  'from-amber-400 to-amber-600',
  'from-violet-400 to-violet-600',
  'from-emerald-400 to-emerald-600',
];

// Booking with optional event_type from API
type BookingData = Booking & { event_type?: BookingWithEventType['event_type'] };

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      let url = '/api/bookings';
      if (filter === 'upcoming') {
        url += '?upcoming=true&status=confirmed';
      } else if (filter === 'past') {
        url += '?status=confirmed';
      }

      const response = await fetch(url);
      if (response.ok) {
        let data = await response.json();

        if (filter === 'past') {
          const now = new Date();
          data = data.filter((b: BookingData) => new Date(b.start_at) < now);
        }

        setBookings(data);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setIsLoading(false);
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
          <header className="sticky top-0 -mx-4 md:-mx-10 px-4 md:px-10 py-4 md:py-6 bg-slate-50/80 backdrop-blur-md z-30 flex justify-between items-end mb-6 md:mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">予約一覧</h1>
              <p className="text-slate-600 font-medium">すべての予約を確認</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  filter === 'upcoming'
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                今後の予約
              </button>
              <button
                onClick={() => setFilter('past')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  filter === 'past'
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                過去の予約
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  filter === 'all'
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                すべて
              </button>
            </div>
          </header>

          {/* Bookings List */}
          {bookings.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 p-12 text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {filter === 'upcoming' ? '今後の予約はありません' : '予約がありません'}
              </h3>
              <p className="text-slate-500">予約が入ると、ここに表示されます。</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100">
              <div className="divide-y divide-slate-100">
                {bookings.map((booking, index) => (
                  <div key={booking.id} className="p-6 hover:bg-slate-50/50 transition">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColors[index % avatarColors.length]} flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0`}>
                        {booking.requester_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-slate-900">
                            {booking.requester_name}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              booking.status === 'confirmed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              booking.status === 'confirmed' ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            {booking.status === 'confirmed' ? '確定' : 'キャンセル済み'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mb-2">
                          {booking.requester_email}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {format(new Date(booking.start_at), 'yyyy年M月d日 (E)', { locale: ja })}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {format(new Date(booking.start_at), 'HH:mm')} - {format(new Date(booking.end_at), 'HH:mm')}
                          </span>
                        </div>
                        {booking.event_type && (
                          <p className="mt-2 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              {booking.event_type.title}
                            </span>
                          </p>
                        )}
                        {booking.note && (
                          <div className="mt-3 rounded-xl bg-slate-50 p-4 border border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 mb-1">備考</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">
                              {booking.note}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
