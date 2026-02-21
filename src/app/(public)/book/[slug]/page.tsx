'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarPicker } from '@/components/booking/calendar-picker';
import { BookingForm } from '@/components/booking/booking-form';
import type { TimeSlot } from '@/types';

interface EventTypeInfo {
  title: string;
  description: string | null;
  durationMinutes: number;
}

type BookingStep = 'select-time' | 'fill-form' | 'confirmed';

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [step, setStep] = useState<BookingStep>('select-time');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [eventType, setEventType] = useState<EventTypeInfo | null>(null);
  const [eventTypeId, setEventTypeId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<{
    id: string;
    cancelUrl: string;
  } | null>(null);

  // Fetch event type and availability
  const fetchAvailability = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First, get event type ID from slug
      const eventTypeRes = await fetch(`/api/event-types?slug=${slug}`);
      if (!eventTypeRes.ok) {
        throw new Error('Event type not found');
      }
      const eventTypeData = await eventTypeRes.json();
      setEventTypeId(eventTypeData.id);

      // Then fetch availability
      const availRes = await fetch(
        `/api/availability?eventTypeId=${eventTypeData.id}`
      );
      if (!availRes.ok) {
        throw new Error('Failed to fetch availability');
      }
      const availData = await availRes.json();

      setEventType(availData.eventType);
      setSlots(
        availData.slots.map((s: { start: string; end: string }) => ({
          start: new Date(s.start),
          end: new Date(s.end),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep('fill-form');
  };

  const handleBack = () => {
    setStep('select-time');
  };

  const handleSubmit = async (data: { name: string; email: string; companyName?: string; note?: string }) => {
    if (!selectedSlot || !eventTypeId) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventTypeId,
          startAt: selectedSlot.start.toISOString(),
          endAt: selectedSlot.end.toISOString(),
          name: data.name,
          email: data.email,
          companyName: data.companyName,
          note: data.note,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking');
      }

      setBookingResult({
        id: result.booking.id,
        cancelUrl: result.cancelUrl,
      });
      setStep('confirmed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error && step === 'select-time') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">エラー</h2>
            <p className="mt-2 text-sm text-slate-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-500/20">
              M
            </div>
            <span className="font-bold text-lg text-slate-900">MeetFlow</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Step Indicator */}
        {step !== 'confirmed' && (
          <div className="flex items-center justify-center mb-8">
            {([
              { key: 'select-time', label: '日時を選ぶ', n: 1 },
              { key: 'fill-form',   label: '情報を入力', n: 2 },
              { key: 'confirmed',   label: '予約確定',   n: 3 },
            ] as const).map(({ key, label, n }, i) => {
              const stepOrder: Record<BookingStep, number> = { 'select-time': 1, 'fill-form': 2, 'confirmed': 3 };
              const isActive = step === key;
              const isDone   = stepOrder[step] > n;
              return (
                <div key={key} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      isDone
                        ? 'bg-brand-500 text-white'
                        : isActive
                        ? 'bg-brand-500 text-white ring-4 ring-brand-100'
                        : 'bg-slate-200 text-slate-400'
                    }`}>
                      {isDone ? (
                        <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : n}
                    </div>
                    <span className={`text-xs font-medium whitespace-nowrap ${isActive ? 'text-brand-600' : isDone ? 'text-brand-400' : 'text-slate-400'}`}>
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className={`w-16 sm:w-24 h-0.5 mx-2 mb-5 transition-colors ${isDone ? 'bg-brand-500' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
          {/* Event Info Header */}
          <div className="p-8 border-b border-slate-100">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {eventType?.title || '読み込み中...'}
            </h1>
            {eventType?.description && (
              <p className="text-slate-500 mb-4">{eventType.description}</p>
            )}
            {eventType && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-800 font-medium text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {eventType.durationMinutes}分
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-8">
            {step === 'select-time' && (
              <CalendarPicker
                slots={slots}
                selectedSlot={selectedSlot}
                onSelectSlot={handleSelectSlot}
                isLoading={isLoading}
              />
            )}

            {step === 'fill-form' && selectedSlot && eventType && (
              <BookingForm
                selectedSlot={selectedSlot}
                durationMinutes={eventType.durationMinutes}
                eventTitle={eventType.title}
                onSubmit={handleSubmit}
                onBack={handleBack}
                isSubmitting={isSubmitting}
              />
            )}

            {step === 'confirmed' && selectedSlot && eventType && bookingResult && (
              <div className="space-y-6">
                {/* Success Icon & Message */}
                <div className="text-center">
                  <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">予約が確定しました</h2>
                  <p className="text-slate-500 mt-2">確認メールとカレンダー招待をお送りしました。</p>
                </div>

                {/* Booking Details */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                  <h3 className="font-semibold text-slate-900">{eventType.title}</h3>
                  <p className="text-slate-700 mt-2">
                    {format(selectedSlot.start, 'yyyy年M月d日 (E)', { locale: ja })}
                  </p>
                  <p className="text-lg font-medium text-blue-600">
                    {format(selectedSlot.start, 'HH:mm', { locale: ja })}
                    {' - '}
                    {format(selectedSlot.end, 'HH:mm', { locale: ja })}
                  </p>
                </div>

                {/* Cancel Info */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <h4 className="font-medium text-amber-800">キャンセルする場合</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    以下のリンクからキャンセルできます。このリンクを保存しておいてください。
                  </p>
                  <a
                    href={bookingResult.cancelUrl}
                    className="mt-3 inline-block px-4 py-2 rounded-lg bg-amber-100 text-amber-800 text-sm font-medium hover:bg-amber-200 transition-colors"
                  >
                    キャンセルページを開く
                  </a>
                </div>
              </div>
            )}

            {error && step !== 'select-time' && (
              <div className="mt-4 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-16">
        <div className="max-w-2xl mx-auto px-6 py-8 text-center">
          <p className="text-sm text-slate-400 font-medium">Powered by MeetFlow</p>
        </div>
      </footer>
    </div>
  );
}
