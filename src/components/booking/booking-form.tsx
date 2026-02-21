'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { TimeSlot } from '@/types';

const bookingSchema = z.object({
  name: z.string().min(1, 'お名前を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  companyName: z.string().optional(),
  note: z.string().min(1, 'ご相談内容・備考を入力してください'),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  selectedSlot: TimeSlot;
  durationMinutes: number;
  eventTitle: string;
  onSubmit: (data: BookingFormData) => Promise<void>;
  onBack: () => void;
  isSubmitting?: boolean;
}

export function BookingForm({
  selectedSlot,
  durationMinutes,
  eventTitle,
  onSubmit,
  onBack,
  isSubmitting = false,
}: BookingFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  });

  return (
    <div className="space-y-6">
      {/* Selected time summary */}
      <div className="bg-blue-50 rounded-xl p-4">
        <h3 className="font-medium text-blue-900">{eventTitle}</h3>
        <p className="text-sm text-blue-700 mt-1">
          {format(new Date(selectedSlot.start), 'M月d日 (E) HH:mm', { locale: ja })}
          {' - '}
          {format(new Date(selectedSlot.end), 'HH:mm', { locale: ja })}
          {' '}
          ({durationMinutes}分)
        </p>
      </div>

      {/* Booking form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            お名前
          </label>
          <input
            type="text"
            {...register('name')}
            placeholder="山田 太郎"
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:outline-none transition text-slate-900 placeholder-slate-400"
          />
          {errors.name && (
            <p className="mt-1.5 text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            メールアドレス
          </label>
          <input
            type="email"
            {...register('email')}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:outline-none transition text-slate-900 placeholder-slate-400"
          />
          {errors.email && (
            <p className="mt-1.5 text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Company Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            会社名（任意）
          </label>
          <input
            type="text"
            {...register('companyName')}
            placeholder="株式会社〇〇"
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:outline-none transition text-slate-900 placeholder-slate-400"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            ご相談内容・備考
          </label>
          <textarea
            {...register('note')}
            rows={4}
            placeholder="ご相談したい内容や、事前に共有したい情報があればご記入ください"
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:outline-none transition text-slate-900 placeholder-slate-400 resize-none"
          />
          {errors.note && (
            <p className="mt-1.5 text-sm text-red-500">{errors.note.message}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition disabled:opacity-50"
          >
            戻る
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-xl text-white font-bold shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-[1.01] transition-all active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 bg-gradient-to-r from-brand-500 to-brand-600"
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
                送信中...
              </span>
            ) : (
              '予約を確定する'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
