'use client';

import { useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type CancelStep = 'confirm' | 'processing' | 'success' | 'error';

function CancelContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const bookingId = searchParams.get('bookingId');

  const [step, setStep] = useState<CancelStep>('confirm');
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!bookingId) {
      setError('無効なキャンセルリンクです');
      setStep('error');
      return;
    }

    try {
      setStep('processing');
      setError(null);

      const response = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          token,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'キャンセルに失敗しました');
      }

      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setStep('error');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          {step === 'confirm' && '予約のキャンセル'}
          {step === 'processing' && 'キャンセル中…'}
          {step === 'success' && 'キャンセル完了'}
          {step === 'error' && 'エラー'}
        </CardTitle>
        {step === 'confirm' && (
          <CardDescription>
            この予約をキャンセルしますか？参加者全員に通知されます。
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              この操作は取り消せません。日程を変更したい場合は、キャンセル後に新しい予約を作成してください。
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.history.back()}
              >
                戻る
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleCancel}
              >
                予約をキャンセル
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center py-8">
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
            <p className="mt-4 text-sm text-slate-500">
              キャンセルを処理しています…
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-slate-700">
              予約がキャンセルされました。参加者全員に通知が送信されます。
            </p>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-slate-700">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setStep('confirm')}
            >
              もう一度試す
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-slate-500">読み込み中…</p>
          </CardContent>
        </Card>
      }>
        <CancelContent />
      </Suspense>
    </div>
  );
}
