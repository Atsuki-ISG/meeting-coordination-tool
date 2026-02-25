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

const DURATION_PRESETS = ['15', '30', '45', '60', '90', '120'];

const BUFFER_OPTIONS = [
  { value: 0, label: 'なし' },
  { value: 5, label: '5分' },
  { value: 10, label: '10分' },
  { value: 15, label: '15分' },
  { value: 30, label: '30分' },
  { value: 60, label: '60分' },
];

const MIN_NOTICE_OPTIONS = [
  { value: 0, label: 'なし' },
  { value: 30, label: '30分' },
  { value: 60, label: '1時間' },
  { value: 120, label: '2時間' },
  { value: 240, label: '4時間' },
  { value: 480, label: '8時間' },
  { value: 1440, label: '24時間' },
];

const eventTypeSchema = z.object({
  title: z.string().min(1, 'タイトルを入力してください'),
  description: z.string().optional(),
  durationMinutes: z.string().min(1, '所要時間を選択してください'),
  isActive: z.boolean(),
});

type EventTypeFormData = z.infer<typeof eventTypeSchema>;

export default function NewEventTypePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [participationMode, setParticipationMode] = useState<'all_required' | 'any_available'>('all_required');
  const [noteTakerMemberId, setNoteTakerMemberId] = useState<string | null>(null);
  const [calendarTitleTemplate, setCalendarTitleTemplate] = useState('{メニュー名} - {予約者名}');
  const [timeRestrictionType, setTimeRestrictionType] = useState<'none' | 'preset' | 'custom'>('none');
  const [timeRestrictionPresetId, setTimeRestrictionPresetId] = useState<string | null>(null);
  const [timeRestrictionCustom, setTimeRestrictionCustom] = useState({ days: [1, 2, 3, 4, 5], start_time: '09:00', end_time: '17:00' });
  const [presets, setPresets] = useState<TimeSlotPreset[]>([]);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customDuration, setCustomDuration] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [daysAhead, setDaysAhead] = useState(14);
  const [minNoticeMinutes, setMinNoticeMinutes] = useState(60);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [membersRes, presetsRes] = await Promise.all([
          fetch('/api/members'),
          fetch('/api/time-slot-presets'),
        ]);
        if (membersRes.ok) {
          const data = await membersRes.json();
          setMembers(data);
        }
        if (presetsRes.ok) {
          const data = await presetsRes.json();
          setPresets(data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
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
    setValue,
    formState: { errors },
  } = useForm<EventTypeFormData>({
    resolver: zodResolver(eventTypeSchema),
    defaultValues: {
      durationMinutes: '30',
      isActive: true,
    },
  });

  const selectedDuration = watch('durationMinutes');
  const isActive = watch('isActive');

  const handleDurationSelect = (duration: string) => {
    setIsCustomDuration(false);
    setCustomDuration('');
    setValue('durationMinutes', duration);
  };

  const handleCustomDurationToggle = () => {
    setIsCustomDuration(true);
    setValue('durationMinutes', customDuration || '');
  };

  const handleCustomDurationChange = (value: string) => {
    setCustomDuration(value);
    setValue('durationMinutes', value);
  };

  const noteTakerMembers = members.filter(m => m.is_note_taker);

  const onSubmit = async (data: EventTypeFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch('/api/event-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          durationMinutes: Number(data.durationMinutes),
          isActive: data.isActive,
          memberIds: selectedMemberIds,
          participationMode,
          noteTakerMemberId,
          calendarTitleTemplate,
          timeRestrictionType,
          timeRestrictionPresetId: timeRestrictionType === 'preset' ? timeRestrictionPresetId : null,
          timeRestrictionCustom: timeRestrictionType === 'custom' ? timeRestrictionCustom : null,
          bufferMinutes,
          daysAhead,
          minNoticeMinutes,
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
              予約タイプ一覧に戻る
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">予約タイプを作成</h1>
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
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map((duration) => (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => handleDurationSelect(duration)}
                      className={`px-4 py-3 rounded-xl border-2 font-bold transition-all hover:scale-105 ${
                        !isCustomDuration && selectedDuration === duration
                          ? 'border-brand-500 bg-brand-50 shadow-lg shadow-brand-500/20 text-brand-600'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      {duration}分
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleCustomDurationToggle}
                    className={`px-4 py-3 rounded-xl border-2 font-bold transition-all hover:scale-105 ${
                      isCustomDuration
                        ? 'border-brand-500 bg-brand-50 shadow-lg shadow-brand-500/20 text-brand-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    カスタム
                  </button>
                </div>
                {isCustomDuration && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      min={5}
                      max={480}
                      step={5}
                      value={customDuration}
                      onChange={(e) => handleCustomDurationChange(e.target.value)}
                      placeholder="分数を入力"
                      className="w-32 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:outline-none transition text-slate-900 placeholder-slate-400"
                    />
                    <span className="text-sm text-slate-500">分（5〜480分、5分刻み）</span>
                  </div>
                )}
                {/* Hidden input for react-hook-form */}
                <input type="hidden" {...register('durationMinutes')} />
                {errors.durationMinutes && (
                  <p className="mt-1.5 text-sm text-red-500">
                    {errors.durationMinutes.message}
                  </p>
                )}
              </div>

              {/* Members Selection */}
              {members.length >= 1 && (
                <div>
                  {/* Participation Mode */}
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    参加方式
                  </label>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {([
                      { value: 'all_required', label: '全員参加', desc: '全員の空き時間が一致する時間帯のみ表示されます' },
                      { value: 'any_available', label: '誰か1名参加', desc: '誰か1人でも空いている時間帯が表示されます' },
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

              {/* Note-taker */}
              {members.length >= 1 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    議事録担当
                  </label>
                  <p className="text-sm text-slate-500 mb-3">
                    選択したメンバーをカレンダー招待に自動で追加します
                  </p>
                  {noteTakerMembers.length > 0 ? (
                    <select
                      value={noteTakerMemberId || ''}
                      onChange={(e) => setNoteTakerMemberId(e.target.value || null)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-800 focus:border-brand-500 focus:outline-none"
                    >
                      <option value="">なし</option>
                      {noteTakerMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-slate-500 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                      議事録担当メンバーはチーム設定で指定できます
                    </p>
                  )}
                </div>
              )}

              {/* Calendar Title Template */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  カレンダータイトル
                  <span className="ml-1 text-xs font-normal text-slate-400">チーム内部のみ・ゲストには表示されません</span>
                </label>
                <input
                  id="calendarTitleTemplate"
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
                        const input = document.getElementById('calendarTitleTemplate') as HTMLInputElement;
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
                        .replace('{メニュー名}', watch('title') || '初回相談')
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

              {/* Advanced Settings */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition"
                >
                  <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  詳細設定
                </button>
                {showAdvanced && (
                  <div className="mt-4 space-y-5 pl-6 border-l-2 border-slate-200">
                    {/* Days Ahead */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        公開期間（何日先まで）
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={90}
                          value={daysAhead}
                          onChange={(e) => setDaysAhead(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
                          className="w-24 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:outline-none transition text-slate-900"
                        />
                        <span className="text-sm text-slate-500">日先まで予約可能</span>
                      </div>
                    </div>

                    {/* Min Notice */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        最低予約猶予
                      </label>
                      <p className="text-xs text-slate-500 mb-2">直前すぎる予約を防ぎます</p>
                      <select
                        value={minNoticeMinutes}
                        onChange={(e) => setMinNoticeMinutes(Number(e.target.value))}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-800 focus:border-brand-500 focus:outline-none"
                      >
                        {MIN_NOTICE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Buffer */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        前後のバッファ
                      </label>
                      <p className="text-xs text-slate-500 mb-2">予定の前後に余裕を確保します</p>
                      <select
                        value={bufferMinutes}
                        onChange={(e) => setBufferMinutes(Number(e.target.value))}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-800 focus:border-brand-500 focus:outline-none"
                      >
                        {BUFFER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

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
