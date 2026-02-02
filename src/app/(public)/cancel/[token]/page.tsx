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
      setError('Invalid cancel link');
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
        throw new Error(result.error || 'Failed to cancel booking');
      }

      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStep('error');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          {step === 'confirm' && 'Cancel Booking'}
          {step === 'processing' && 'Canceling...'}
          {step === 'success' && 'Booking Canceled'}
          {step === 'error' && 'Error'}
        </CardTitle>
        {step === 'confirm' && (
          <CardDescription>
            Are you sure you want to cancel this booking? All attendees will be notified.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              This action cannot be undone. If you need to reschedule, please cancel
              and create a new booking.
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleCancel}
              >
                Cancel Booking
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center py-8">
            <svg
              className="h-8 w-8 animate-spin text-blue-600"
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
            <p className="mt-4 text-sm text-gray-500">
              Processing cancellation...
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
            <p className="text-gray-600">
              Your booking has been canceled successfully. All attendees have been notified.
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
            <p className="text-gray-600">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setStep('confirm')}
            >
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">Loading...</p>
          </CardContent>
        </Card>
      }>
        <CancelContent />
      </Suspense>
    </div>
  );
}
