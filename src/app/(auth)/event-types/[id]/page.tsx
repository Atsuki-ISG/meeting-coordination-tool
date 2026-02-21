'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sidebar } from '@/components/layout/sidebar';
import type { EventType } from '@/types';

interface Member {
  id: string;
  name: string;
  email: string;
  is_note_taker: boolean;
}

interface TimeSlotPreset {
  id: string;
  name: string;
  days: number[];
  start_time: string;
  end_time: string;
  color?: string;
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const eventTypeSchema = z.object({
  title: z.string().min(1, 'タイトルを入力してください'),
  description: z.string().optional(),
  durationMinutes: z.string().min(1),
  isActive: z.boolean(),
});

type EventTypeFormData = z.infer<typeof eventTypeSchema>;

export default function EventTypeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [participationMode, setParticipationMode] = useState<'all_required' | 'any_available'>('all_required');
  const [includeNoteTakers, setIncludeNoteTakers] = useState(false);
  const [copied, setCopied] = useState(false);
  const [calendarTitleTemplate, setCalendarTitleTemplate] = useState('{メニュー名} - {予約者名}');
  const [timeRestrictionType, setTimeRestrictionType] = useState<'none' | 'preset' | 'custom'>('none');
  const [timeRestrictionPresetId, setTimeRestrictionPresetId] = useState<string | null>(null);
  const [timeRestrictionCustom, setTimeRestrictionCustom] = useState({ days: [1, 2, 3, 4, 5], start_time: '09:00', end_time: '17:00' });
  const [presets, setPresets] = useState<TimeSlotPreset[]>([]);

  const copyBookingLink = async () => {
    if (!eventType) return;
    const url = `${window.location.origin}/book/${eventType.slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    reset,
    watch,
    formState: { errors },
  } = useForm<EventTypeFormData>({
    resolver: zodResolver(eventTypeSchema),
  });

  const selectedDuration = watch('durationMinutes');
  const isActive = watch('isActive');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventTypeRes, membersRes, eventTypeMembersRes, presetsRes] = await Promise.all([
          fetch(`/api/event-types?id=${params.id}`),
          fetch('/api/members'),
          fetch(`/api/event-types/${params.id}/members`),
          fetch('/api/time-slot-presets'),
        ]);

        if (eventTypeRes.ok) {
          const data = await eventTypeRes.json();
          setEventType(data);
          setParticipationMode(data.participation_mode || 'all_required');
          setIncludeNoteTakers(data.include_note_takers ?? false);
          setCalendarTitleTemplate(data.calendar_title_template || '{メニュー名} - {予約者名}');
          setTimeRestrictionType(data.time_restriction_type || 'none');
          setTimeRestrictionPresetId(data.time_restriction_preset_id || null);
          if (data.time_restriction_custom) {
            setTimeRestrictionCustom(data.time_restriction_custom);
          }
          reset({
            title: data.title,
            description: data.description || '',
            durationMinutes: String(data.duration_minutes),
            isActive: data.is_active,
          });
        }

        if (membersRes.ok) {
          const data = await membersRes.json();
          setMembers(data);
        }

        if (eventTypeMembersRes.ok) {
          const data = await eventTypeMembersRes.json();
          setSelectedMemberIds(data.map((m: { member_id: string }) => m.member_id));
        }

        if (presetsRes.ok) {
          const data = await presetsRes.json();
          setPresets(data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.id, reset]);

  const onSubmit = async (data: EventTypeFormData) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/event-types/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          durationMinutes: Number(data.durationMinutes),
          isActive: data.isActive,
          memberIds: selectedMemberIds,
          participationMode,
          includeNoteTakers,
          calendarTitleTemplate,
          timeRestrictionType,
          timeRestrictionPresetId: timeRestrictionType === 'preset' ? timeRestrictionPresetId : null,
          timeRestrictionCustom: timeRestrictionType === 'custom' ? timeRestrictionCustom : null,
        }),
      });

      if (response.ok) {
        router.push('/event-types');
      } else {
        const error = await response.json();
        alert(error.error || '更新に失敗しました');
      }
    } catch (error) {
      console.error('Failed to update event type:', error);
      alert('更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('この予約タイプを削除しますか？この操作は取り消せません。')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/event-types/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/event-types');
      } else {
        const error = await response.json();
        alert(error.error || '削除に失敗しました');
      }
    } catch (error) {
      console.error('Failed to delete event type:', error);
      alert('削除に失敗しました');
    } finally {
      setIsDeleting(false);
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

  if (!eventType) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">予約タイプが見つかりません</h2>
          <Link href="/event-types">
            <button className="mt-4 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition">
              戻る
            </button>
          </Link>
        </div>
      </div>
    );
  }

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
              予約タイプ一覧に戻る
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">予約タイプを編集</h1>
          </header>

          <div className="max-w-2xl space-y-6">
            {/* Form Card */}
            <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
              <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    タイトル
                  </label>
                  <input
                    type="text"
                    {...register('title')}
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
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:outline-none transition text-slate-900 placeholder-slate-400 resize-none"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    所要時間
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {['15', '30', '45', '60', '90', '120'].map((duration) => (
                      <label
                        key={duration}
                        className={`relative flex cursor-pointer items-center justify-center rounded-xl border-2 p-3 transition-all hover:scale-105 ${
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
                        <span className={`text-sm font-bold ${
                          selectedDuration === duration ? 'text-brand-600' : 'text-slate-700'
                        }`}>
                          {duration}分
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Members Selection */}
                {members.filter((m) => !m.is_note_taker).length > 1 && (
                  <div>
                    {/* Participation Mode */}
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      参加方式
                    </label>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {([
                        { value: 'all_required', label: '全員参加', desc: '全員が空いている時間のみ表示' },
                        { value: 'any_available', label: '誰か1名参加', desc: '1人でも空いていれば表示' },
                      ] as const).map(({ value, label, desc }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setParticipationMode(value)}
                          className={`flex flex-col items-start rounded-xl border-2 p-4 transition-all text-left ${
                            participationMode === value
                              ? 'border-brand-500 bg-brand-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className={`font-semibold text-sm ${participationMode === value ? 'text-brand-700' : 'text-slate-700'}`}>{label}</span>
                          <span className="text-xs text-slate-500 mt-0.5">{desc}</span>
                        </button>
                      ))}
                    </div>

                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      参加メンバー（複数選択可）
                    </label>
                    <p className="text-sm text-slate-500 mb-4">
                      選択したメンバーの予定から共通の空き時間を見つけます
                    </p>
                    <div className="space-y-2">
                      {members.filter((m) => !m.is_note_taker).map((member) => (
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

                {/* Note-takers */}
                {members.some((m) => m.is_note_taker) && (
                  <div className="flex items-center justify-between rounded-xl border-2 border-slate-200 p-4">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">メモ取り担当者を自動招待</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        メモ取り担当に設定されたメンバーをカレンダー招待に自動で追加します
                      </p>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={includeNoteTakers}
                          onChange={(e) => setIncludeNoteTakers(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                      </div>
                    </label>
                  </div>
                )}

                {/* Calendar Title Template */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    カレンダータイトル
                    <span className="ml-1 text-xs font-normal text-slate-400">チーム内部のみ・ゲストには表示されません</span>
                  </label>
                  <input
                    id="calendarTitleTemplateEdit"
                    type="text"
                    value={calendarTitleTemplate}
                    onChange={(e) => setCalendarTitleTemplate(e.target.value)}
                    placeholder="{メニュー名} - {予約者名}"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:outline-none transition text-slate-900 placeholder-slate-400"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {([
                      { var: '{予約者名}', label: '予約者名' },
                      { var: '{メニュー名}', label: 'メニュー名' },
                      { var: '{日付}', label: '日付' },
                      { var: '{時刻}', label: '時刻' },
                      { var: '{メール}', label: 'メール' },
                      { var: '{備考}', label: '備考' },
                    ] as const).map(({ var: v, label }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('calendarTitleTemplateEdit') as HTMLInputElement;
                          const pos = input?.selectionStart ?? calendarTitleTemplate.length;
                          setCalendarTitleTemplate(
                            calendarTitleTemplate.slice(0, pos) + v + calendarTitleTemplate.slice(pos)
                          );
                          setTimeout(() => { input?.focus(); input?.setSelectionRange(pos + v.length, pos + v.length); }, 0);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-brand-50 text-brand-600 text-xs font-medium border border-brand-200 hover:bg-brand-100 transition cursor-pointer"
                      >
                        + {label}
                      </button>
                    ))}
                  </div>
                  {calendarTitleTemplate && (
                    <div className="mt-3 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs text-slate-400 mb-1">プレビュー</p>
                      <p className="text-sm font-medium text-slate-700">
                        {calendarTitleTemplate
                          .replace('{予約者名}', '山田太郎')
                          .replace('{メール}', 'yamada@example.com')
                          .replace('{メニュー名}', watch('title') || eventType?.title || '初回相談')
                          .replace('{日付}', '2026/2/20')
                          .replace('{時刻}', '14:00')
                          .replace('{備考}', 'サービスについて相談')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Time Restriction */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    予約を受け付ける時間帯
                  </label>
                  <div className="space-y-3">
                    {([
                      { value: 'none', label: 'すべての空き時間', desc: '設定ページの営業時間内で空いている時間をすべて表示' },
                      { value: 'preset', label: 'テンプレートから選択', desc: 'チーム設定で作成した時間帯テンプレートを使う' },
                      { value: 'custom', label: '曜日・時間を指定', desc: 'この予約タイプ専用に曜日と時間帯を絞り込む' },
                    ] as const).map(({ value, label, desc }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTimeRestrictionType(value)}
                        className={`w-full flex items-start gap-3 rounded-xl border-2 p-4 transition-all text-left ${
                          timeRestrictionType === value
                            ? 'border-brand-500 bg-brand-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          timeRestrictionType === value ? 'border-brand-500' : 'border-slate-300'
                        }`}>
                          {timeRestrictionType === value && (
                            <div className="w-2 h-2 rounded-full bg-brand-500" />
                          )}
                        </div>
                        <div>
                          <span className={`font-semibold text-sm ${timeRestrictionType === value ? 'text-brand-700' : 'text-slate-700'}`}>{label}</span>
                          <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Preset selector */}
                  {timeRestrictionType === 'preset' && (
                    <div className="mt-3 pl-7">
                      {presets.length === 0 ? (
                        <p className="text-sm text-slate-500">テンプレートがありません。チーム設定から作成してください。</p>
                      ) : (
                        <select
                          value={timeRestrictionPresetId || ''}
                          onChange={(e) => setTimeRestrictionPresetId(e.target.value || null)}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-800 focus:border-brand-500 focus:outline-none"
                        >
                          <option value="">テンプレートを選択</option>
                          {presets.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                              {preset.name}（{preset.days.map((d) => DAY_LABELS[d]).join('・')}{preset.start_time}〜{preset.end_time}）
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Custom settings */}
                  {timeRestrictionType === 'custom' && (
                    <div className="mt-3 pl-7 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-2">曜日</p>
                        <div className="flex gap-2">
                          {DAY_LABELS.map((label, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setTimeRestrictionCustom((prev) => ({
                                  ...prev,
                                  days: prev.days.includes(i)
                                    ? prev.days.filter((d) => d !== i)
                                    : [...prev.days, i].sort(),
                                }));
                              }}
                              className={`w-10 h-10 rounded-lg text-sm font-bold transition ${
                                timeRestrictionCustom.days.includes(i)
                                  ? 'bg-brand-500 text-white'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-3 items-center">
                        <input
                          type="time"
                          value={timeRestrictionCustom.start_time}
                          onChange={(e) => setTimeRestrictionCustom((prev) => ({ ...prev, start_time: e.target.value }))}
                          className="px-4 py-2 border-2 border-slate-200 rounded-xl text-slate-800 focus:border-brand-500 focus:outline-none"
                        />
                        <span className="text-slate-500 font-medium">〜</span>
                        <input
                          type="time"
                          value={timeRestrictionCustom.end_time}
                          onChange={(e) => setTimeRestrictionCustom((prev) => ({ ...prev, end_time: e.target.value }))}
                          className="px-4 py-2 border-2 border-slate-200 rounded-xl text-slate-800 focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                  <div>
                    <p className="font-semibold text-slate-900">予約を受け付ける</p>
                    <p className="text-sm text-slate-500">無効にすると予約ページにアクセスできなくなります</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('isActive')}
                      className="sr-only peer"
                    />
                    <div className={`w-14 h-8 rounded-full peer transition-all ${
                      isActive ? 'bg-brand-500' : 'bg-slate-300'
                    }`}>
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${
                        isActive ? 'left-7' : 'left-1'
                      }`} />
                    </div>
                  </label>
                </div>

                {/* Booking Link */}
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-slate-900">予約リンク</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={copyBookingLink}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          copied
                            ? 'bg-brand-500 text-white'
                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                        }`}
                      >
                        {copied ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            コピー完了
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
                      <Link href={`/book/${eventType.slug}`} target="_blank">
                        <button type="button" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 border border-slate-200 transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          開く
                        </button>
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center rounded-xl bg-white border border-blue-200 px-4 py-3">
                    <code className="flex-1 text-sm text-slate-600 break-all">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/book/{eventType.slug}
                    </code>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <Link href="/event-types">
                    <button
                      type="button"
                      className="px-6 py-3.5 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
                    >
                      キャンセル
                    </button>
                  </Link>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3.5 rounded-xl text-white font-bold shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-[1.01] transition-all active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 bg-gradient-to-r from-brand-500 to-brand-600"
                  >
                    {isSaving ? (
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
                        保存中...
                      </span>
                    ) : (
                      '保存する'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-red-100 overflow-hidden">
              <div className="p-8">
                <h3 className="text-lg font-bold text-red-600 mb-2">危険な操作</h3>
                <p className="text-sm text-slate-500 mb-4">
                  この予約タイプを削除すると、関連する予約データも削除されます。この操作は取り消せません。
                </p>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-red-200 text-red-600 font-semibold hover:bg-red-50 transition disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
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
                      削除中...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      予約タイプを削除
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
