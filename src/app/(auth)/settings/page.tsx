'use client';

import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import type { WeeklyAvailability, DayAvailability } from '@/types';
import { DEFAULT_AVAILABILITY } from '@/types';

const DAY_NAMES: Record<string, string> = {
  "0": "日曜日",
  "1": "月曜日",
  "2": "火曜日",
  "3": "水曜日",
  "4": "木曜日",
  "5": "金曜日",
  "6": "土曜日",
};

const TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

export default function SettingsPage() {
  const [availability, setAvailability] = useState<WeeklyAvailability>(DEFAULT_AVAILABILITY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const savedAvailability = useRef<WeeklyAvailability>(DEFAULT_AVAILABILITY);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings/availability');
        if (response.ok) {
          const data = await response.json();
          setAvailability(data.availability);
          savedAvailability.current = data.availability;
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // 離脱ガード
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const updateDay = (day: string, updates: Partial<DayAvailability>) => {
    setAvailability((prev) => {
      const next = { ...prev, [day]: { ...prev[day], ...updates } };
      setIsDirty(JSON.stringify(next) !== JSON.stringify(savedAvailability.current));
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(availability),
      });

      if (response.ok) {
        savedAvailability.current = availability;
        setIsDirty(false);
        setMessage({ type: 'success', text: '設定を保存しました' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || '保存に失敗しました' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '保存に失敗しました' });
    } finally {
      setIsSaving(false);
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
          <header className="sticky top-0 -mx-10 px-10 py-6 bg-slate-50/80 backdrop-blur-md z-20 flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">設定</h1>
              <p className="text-slate-500 font-medium">予約を受け付ける時間帯を設定</p>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-2 px-6 py-3.5 rounded-full text-white font-bold text-sm shadow-xl transition-all active:scale-95 bg-gradient-to-r from-brand-500 to-brand-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${isDirty ? 'hover:scale-105 shadow-brand-500/30 hover:shadow-brand-500/50' : 'opacity-60'}`}
            >
              {isSaving ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>設定を保存</span>
                </>
              )}
            </button>
          </header>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 rounded-2xl p-4 flex items-center gap-3 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          {/* Availability Settings */}
          <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100">
            <div className="p-8 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">曜日ごとの予約受付時間</h3>
              <p className="text-sm text-slate-500 mt-1">予約を受け付ける曜日と時間帯を設定します</p>
            </div>
            <div className="divide-y divide-slate-100">
              {["1", "2", "3", "4", "5", "6", "0"].map((day) => (
                <div
                  key={day}
                  className={`flex items-center gap-6 p-6 transition-colors ${
                    availability[day].enabled ? 'bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  <label className="flex items-center gap-4 cursor-pointer min-w-[140px]">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={availability[day].enabled}
                        onChange={(e) => updateDay(day, { enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                    </div>
                    <span className={`font-semibold ${availability[day].enabled ? 'text-slate-900' : 'text-slate-400'}`}>
                      {DAY_NAMES[day]}
                    </span>
                  </label>

                  {availability[day].enabled ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* All-day toggle */}
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={!!availability[day].allDay}
                            onChange={(e) => updateDay(day, { allDay: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
                        </div>
                        <span className="text-sm font-medium text-slate-600">終日</span>
                      </label>

                      {availability[day].allDay ? (
                        <span className="text-sm text-slate-400 font-medium">
                          Googleカレンダーの空き時間のみ
                        </span>
                      ) : (
                        <>
                          <select
                            value={availability[day].startTime}
                            onChange={(e) => updateDay(day, { startTime: e.target.value })}
                            className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-brand-500 focus:outline-none transition-colors"
                          >
                            {TIME_OPTIONS.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                          <span className="text-slate-400 font-medium">〜</span>
                          <select
                            value={availability[day].endTime}
                            onChange={(e) => updateDay(day, { endTime: e.target.value })}
                            className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-brand-500 focus:outline-none transition-colors"
                          >
                            {TIME_OPTIONS.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400 font-medium">予約受付なし</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
