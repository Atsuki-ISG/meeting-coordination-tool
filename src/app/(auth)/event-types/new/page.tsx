'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sidebar } from '@/components/layout/sidebar';

interface Member {
  id: string;
  name: string;
  email: string;
}

const eventTypeSchema = z.object({
  title: z.string().min(1, 'タイトルを入力してください'),
  description: z.string().optional(),
  durationMinutes: z.enum(['15', '30', '45', '60']),
});

type EventTypeFormData = z.infer<typeof eventTypeSchema>;

export default function NewEventTypePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch('/api/members');
        if (response.ok) {
          const data = await response.json();
          setMembers(data);
        }
      } catch (error) {
        console.error('Failed to fetch members:', error);
      }
    };
    fetchMembers();
  }, []);

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EventTypeFormData>({
    resolver: zodResolver(eventTypeSchema),
    defaultValues: {
      durationMinutes: '30',
    },
  });

  const selectedDuration = watch('durationMinutes');

  const onSubmit = async (data: EventTypeFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch('/api/event-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          memberIds: selectedMemberIds,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create event type');
      }

      router.push('/event-types');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 md:ml-72 p-10">
          {/* Header */}
          <header className="mb-8">
            <Link
              href="/event-types"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              予約メニュー一覧に戻る
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">予約メニューを作成</h1>
          </header>

          {/* Form Card */}
          <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden max-w-2xl">
            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  タイトル
                </label>
                <input
                  type="text"
                  {...register('title')}
                  placeholder="例: 30分ミーティング"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:outline-none transition text-slate-900 placeholder-slate-400"
                />
                {errors.title && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  説明（任意）
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="ミーティングの内容を入力してください"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:outline-none transition text-slate-900 placeholder-slate-400 resize-none"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  所要時間
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {['15', '30', '45', '60'].map((duration) => (
                    <label
                      key={duration}
                      className={`relative flex cursor-pointer items-center justify-center rounded-xl border-2 p-4 transition-all hover:scale-105 ${
                        selectedDuration === duration
                          ? 'border-brand-500 bg-brand-50 shadow-lg shadow-brand-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value={duration}
                        {...register('durationMinutes')}
                        className="peer sr-only"
                      />
                      <span className={`text-lg font-bold ${
                        selectedDuration === duration ? 'text-brand-600' : 'text-slate-700'
                      }`}>
                        {duration}分
                      </span>
                    </label>
                  ))}
                </div>
                {errors.durationMinutes && (
                  <p className="mt-1.5 text-sm text-red-500">
                    {errors.durationMinutes.message}
                  </p>
                )}
              </div>

              {/* Members Selection */}
              {members.length > 1 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    参加メンバー（複数選択可）
                  </label>
                  <p className="text-sm text-slate-500 mb-4">
                    選択したメンバーのカレンダーをマージして空き時間を計算します
                  </p>
                  <div className="space-y-2">
                    {members.map((member) => (
                      <label
                        key={member.id}
                        className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all ${
                          selectedMemberIds.includes(member.id)
                            ? 'border-brand-500 bg-brand-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                          selectedMemberIds.includes(member.id)
                            ? 'border-brand-500 bg-brand-500'
                            : 'border-slate-300'
                        }`}>
                          {selectedMemberIds.includes(member.id) && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.includes(member.id)}
                          onChange={() => toggleMember(member.id)}
                          className="sr-only"
                        />
                        <div>
                          <p className="font-semibold text-slate-900">{member.name}</p>
                          <p className="text-sm text-slate-500">{member.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Link href="/event-types" className="flex-1">
                  <button
                    type="button"
                    className="w-full px-6 py-3.5 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
                  >
                    キャンセル
                  </button>
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-xl text-white font-bold shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-[1.01] transition-all active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 bg-gradient-to-r from-brand-500 to-brand-600"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
                      作成中...
                    </span>
                  ) : (
                    '作成する'
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
