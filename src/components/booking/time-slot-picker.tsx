'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { TimeSlot } from '@/types';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  isLoading?: boolean;
}

interface DateInfo {
  date: Date;
  slots: TimeSlot[];
  earliestTime: string;
  slotCount: number;
}

export function TimeSlotPicker({
  slots,
  selectedSlot,
  onSelectSlot,
  isLoading = false,
}: TimeSlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Group slots by date with additional info
  const dateInfoMap = useMemo(() => {
    const map = new Map<string, DateInfo>();

    for (const slot of slots) {
      const slotDate = new Date(slot.start);
      const dateKey = format(slotDate, 'yyyy-MM-dd');

      if (!map.has(dateKey)) {
        map.set(dateKey, {
          date: startOfDay(slotDate),
          slots: [],
          earliestTime: format(slotDate, 'HH:mm'),
          slotCount: 0,
        });
      }

      const info = map.get(dateKey)!;
      info.slots.push(slot);
      info.slotCount++;

      // Update earliest time if this slot is earlier
      const currentEarliest = info.earliestTime;
      const slotTime = format(slotDate, 'HH:mm');
      if (slotTime < currentEarliest) {
        info.earliestTime = slotTime;
      }
    }

    return map;
  }, [slots]);

  // Get slots for the selected date
  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return dateInfoMap.get(dateKey)?.slots || [];
  }, [selectedDate, dateInfoMap]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { locale: ja });
    const calendarEnd = endOfWeek(monthEnd, { locale: ja });

    const days: Date[] = [];
    let day = calendarStart;

    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => addDays(startOfMonth(prev), -1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addDays(endOfMonth(prev), 1));
  };

  const handleDateClick = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const info = dateInfoMap.get(dateKey);
    if (info && info.slotCount > 0) {
      setSelectedDate(date);
    }
  };

  const handleBackToCalendar = () => {
    setSelectedDate(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
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
          <p className="text-sm text-slate-500">空き状況を確認中...</p>
        </div>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">予約可能な時間枠がありません</p>
      </div>
    );
  }

  // Time slot selection view
  if (selectedDate) {
    return (
      <div className="space-y-6">
        {/* Back button and selected date */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToCalendar}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            カレンダーに戻る
          </button>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {format(selectedDate, 'M月d日 (E)', { locale: ja })}
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            {slotsForSelectedDate.length}件の空き枠があります
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {slotsForSelectedDate.map((slot) => {
              const isSelected =
                selectedSlot &&
                new Date(slot.start).getTime() === new Date(selectedSlot.start).getTime();

              return (
                <button
                  key={slot.start.toString()}
                  onClick={() => onSelectSlot(slot)}
                  className={cn(
                    'px-3 py-3 rounded-xl border-2 text-sm font-semibold transition-all',
                    isSelected
                      ? 'border-brand-500 bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-brand-500 hover:text-brand-600 hover:shadow-md'
                  )}
                >
                  {format(new Date(slot.start), 'HH:mm')}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Calendar view
  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-slate-900">日付を選択</h3>

      {/* Calendar navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h4 className="text-lg font-bold text-slate-900">
          {format(currentMonth, 'yyyy年M月', { locale: ja })}
        </h4>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
            <div
              key={day}
              className={cn(
                'py-3 text-center text-xs font-semibold',
                index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-slate-600'
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const info = dateInfoMap.get(dateKey);
            const hasSlots = info && info.slotCount > 0;
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isPast = isBefore(day, startOfDay(new Date()));
            const dayOfWeek = day.getDay();

            return (
              <button
                key={index}
                onClick={() => handleDateClick(day)}
                disabled={!hasSlots || isPast}
                className={cn(
                  'relative min-h-[80px] p-2 border-b border-r border-slate-100 transition-all text-left',
                  hasSlots && !isPast
                    ? 'hover:bg-blue-50 cursor-pointer'
                    : 'cursor-default',
                  !isCurrentMonth && 'bg-slate-50',
                  isToday(day) && 'bg-blue-50/50'
                )}
              >
                {/* Date number */}
                <div
                  className={cn(
                    'text-sm font-medium mb-1',
                    !isCurrentMonth && 'text-slate-300',
                    isPast && isCurrentMonth && 'text-slate-400',
                    isCurrentMonth && !isPast && dayOfWeek === 0 && 'text-red-500',
                    isCurrentMonth && !isPast && dayOfWeek === 6 && 'text-blue-500',
                    isCurrentMonth && !isPast && dayOfWeek !== 0 && dayOfWeek !== 6 && 'text-slate-900',
                    isToday(day) && 'text-brand-600 font-bold'
                  )}
                >
                  {format(day, 'd')}
                  {isToday(day) && (
                    <span className="ml-1 text-[10px] text-brand-500 font-normal">今日</span>
                  )}
                </div>

                {/* Slot info */}
                {hasSlots && !isPast && isCurrentMonth && (
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-brand-600">
                      {info.earliestTime}〜
                    </div>
                    <div className="text-[10px] text-slate-500">
                      残り{info.slotCount}枠
                    </div>
                  </div>
                )}

                {/* Available indicator */}
                {hasSlots && !isPast && isCurrentMonth && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          <span>予約可能</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-slate-200 rounded-full" />
          <span>予約不可</span>
        </div>
      </div>
    </div>
  );
}
