'use client';

import { useState, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { TimeSlot } from '@/types';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  isLoading?: boolean;
}

export function TimeSlotPicker({
  slots,
  selectedSlot,
  onSelectSlot,
  isLoading = false,
}: TimeSlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    slots.length > 0 ? new Date(slots[0].start) : null
  );

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

    return grouped;
  }, [slots]);

  // Get unique dates for the date selector
  const dates = useMemo(() => {
    return Array.from(slotsByDate.keys()).map((key) => new Date(key));
  }, [slotsByDate]);

  // Get slots for the selected date
  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return slotsByDate.get(dateKey) || [];
  }, [selectedDate, slotsByDate]);

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
    <div className="space-y-8">
      {/* Date selector */}
      <div>
        <h3 className="text-base font-semibold text-slate-900 mb-4">日付を選択</h3>
        <div className="flex flex-wrap gap-3">
          {dates.map((date) => {
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  'flex flex-col items-center px-4 py-3 rounded-xl border-2 transition-all hover:scale-105',
                  isSelected
                    ? 'border-brand-500 bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                    : 'border-slate-200 bg-white text-slate-900 hover:border-brand-500'
                )}
              >
                <span className={cn(
                  "text-xs font-medium",
                  isSelected ? "text-white" : "text-slate-500"
                )}>
                  {format(date, 'E', { locale: ja })}
                </span>
                <span className="text-xl font-bold">
                  {format(date, 'd')}
                </span>
                <span className={cn(
                  "text-xs font-medium",
                  isSelected ? "text-white" : "text-slate-500"
                )}>
                  {format(date, 'M月', { locale: ja })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots for selected date */}
      {selectedDate && (
        <div>
          <h3 className="text-base font-semibold text-slate-900 mb-4">
            {format(selectedDate, 'M月d日 (E)', { locale: ja })} の時間を選択
          </h3>
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
                    'px-3 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all hover:translate-x-0.5',
                    isSelected
                      ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-brand-500 hover:text-brand-600'
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
