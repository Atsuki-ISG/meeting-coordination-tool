'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { TimeSlot } from '@/types';

interface CalendarPickerProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  isLoading?: boolean;
}

interface DayInfo {
  date: Date;
  slots: TimeSlot[];
  earliestTime: string | null;
  slotCount: number;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function CalendarPicker({
  slots,
  selectedSlot,
  onSelectSlot,
  isLoading = false,
}: CalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    // Start with the month of the first available slot, or current month
    if (slots.length > 0) {
      return startOfMonth(new Date(slots[0].start));
    }
    return startOfMonth(new Date());
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const grouped = new Map<string, TimeSlot[]>();

    for (const slot of slots) {
      const dateKey = format(new Date(slot.start), 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(slot);
    }

    // Sort slots within each day
    for (const [key, daySlots] of grouped) {
      daySlots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      grouped.set(key, daySlots);
    }

    return grouped;
  }, [slots]);

  // Generate calendar days for the current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: DayInfo[] = [];
    let day = calendarStart;

    while (day <= calendarEnd) {
      const dateKey = format(day, 'yyyy-MM-dd');
      const daySlots = slotsByDate.get(dateKey) || [];

      days.push({
        date: day,
        slots: daySlots,
        earliestTime: daySlots.length > 0 ? format(new Date(daySlots[0].start), 'HH:mm') : null,
        slotCount: daySlots.length,
      });

      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth, slotsByDate]);

  // Get slots for selected date
  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return slotsByDate.get(dateKey) || [];
  }, [selectedDate, slotsByDate]);

  // Check if there are slots in the previous/next month
  const hasSlotsBefore = useMemo(() => {
    const prevMonthEnd = endOfMonth(subMonths(currentMonth, 1));
    return slots.some((slot) => {
      const slotDate = new Date(slot.start);
      return isBefore(slotDate, startOfMonth(currentMonth)) && !isBefore(slotDate, new Date());
    });
  }, [slots, currentMonth]);

  const hasSlotsAfter = useMemo(() => {
    const nextMonthStart = startOfMonth(addMonths(currentMonth, 1));
    return slots.some((slot) => {
      const slotDate = new Date(slot.start);
      return !isBefore(slotDate, nextMonthStart);
    });
  }, [slots, currentMonth]);

  const goToPrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
    setSelectedDate(null);
  };

  const handleDateClick = (dayInfo: DayInfo) => {
    if (dayInfo.slotCount === 0) return;
    if (!isSameMonth(dayInfo.date, currentMonth)) return;

    setSelectedDate(dayInfo.date);
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

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">
          {format(currentMonth, 'yyyy年M月', { locale: ja })}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            disabled={!hasSlotsBefore}
            aria-label="前の月"
            className={cn(
              'p-2.5 rounded-lg transition-all',
              hasSlotsBefore
                ? 'hover:bg-slate-100 text-slate-600'
                : 'text-slate-300 cursor-not-allowed'
            )}
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNextMonth}
            disabled={!hasSlotsAfter}
            aria-label="次の月"
            className={cn(
              'p-2.5 rounded-lg transition-all',
              hasSlotsAfter
                ? 'hover:bg-slate-100 text-slate-600'
                : 'text-slate-300 cursor-not-allowed'
            )}
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {WEEKDAYS.map((day, index) => (
            <div
              key={day}
              className={cn(
                'py-3 text-center text-sm font-semibold',
                index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-slate-600'
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((dayInfo, index) => {
            const isCurrentMonth = isSameMonth(dayInfo.date, currentMonth);
            const isSelected = selectedDate && isSameDay(dayInfo.date, selectedDate);
            const hasSlots = dayInfo.slotCount > 0;
            const isPast = isBefore(dayInfo.date, new Date()) && !isToday(dayInfo.date);
            const dayOfWeek = dayInfo.date.getDay();

            return (
              <button
                key={index}
                onClick={() => handleDateClick(dayInfo)}
                disabled={!hasSlots || !isCurrentMonth || isPast}
                className={cn(
                  'relative min-h-[80px] md:min-h-[90px] p-1 md:p-2 border-b border-r border-slate-100 transition-all text-left flex flex-col',
                  isCurrentMonth ? 'bg-white' : 'bg-slate-50',
                  hasSlots && isCurrentMonth && !isPast
                    ? 'hover:bg-brand-50 cursor-pointer'
                    : 'cursor-default',
                  isSelected && 'bg-brand-50 ring-2 ring-inset ring-brand-500'
                )}
              >
                {/* Date number */}
                <span
                  className={cn(
                    'text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full',
                    !isCurrentMonth && 'text-slate-300',
                    isCurrentMonth && isPast && 'text-slate-300',
                    isCurrentMonth && !isPast && dayOfWeek === 0 && 'text-red-500',
                    isCurrentMonth && !isPast && dayOfWeek === 6 && 'text-blue-500',
                    isCurrentMonth && !isPast && dayOfWeek !== 0 && dayOfWeek !== 6 && 'text-slate-700',
                    isToday(dayInfo.date) && 'bg-slate-900 text-white'
                  )}
                >
                  {format(dayInfo.date, 'd')}
                </span>

                {/* Slot info */}
                {isCurrentMonth && hasSlots && !isPast && (
                  <div className="mt-auto">
                    <p className="text-xs md:text-sm font-bold text-brand-600">
                      {dayInfo.earliestTime}
                    </p>
                    <p className="text-[10px] md:text-xs text-slate-500">
                      残り{dayInfo.slotCount}件
                    </p>
                  </div>
                )}

                {/* No slots indicator */}
                {isCurrentMonth && !hasSlots && !isPast && (
                  <div className="mt-auto">
                    <p className="text-xs text-slate-300">ー</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots for selected date */}
      {selectedDate && slotsForSelectedDate.length > 0 && (
        <div className="border border-slate-200 rounded-2xl p-4 md:p-6 bg-slate-50">
          <h4 className="text-base font-bold text-slate-900 mb-4">
            {format(selectedDate, 'M月d日（E）', { locale: ja })}の空き枠
          </h4>
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
                    'px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                    isSelected
                      ? 'border-brand-500 bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-brand-500 hover:text-brand-600 hover:scale-105'
                  )}
                >
                  {format(new Date(slot.start), 'HH:mm')}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
