'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Mode = 'select' | 'create' | 'join';

export default function TeamPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('select');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTeam, setCreatedTeam] = useState<{ name: string; invite_code: string } | null>(null);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'チームの作成に失敗しました');
      }

      const team = await response.json();
      setCreatedTeam(team);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.toUpperCase() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'チームへの参加に失敗しました');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const goToDashboard = () => {
    router.push('/dashboard');
  };

  // Show success screen after team creation
  if (createdTeam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <CardTitle>チームを作成しました</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600">チーム名</p>
              <p className="text-xl font-semibold text-gray-900">{createdTeam.name}</p>
            </div>

            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-900">招待コード</p>
              <p className="mt-2 text-center text-3xl font-bold tracking-widest text-blue-600">
                {createdTeam.invite_code}
              </p>
              <p className="mt-3 text-sm text-blue-700">
                このコードをチームメンバーに共有してください。
                メンバーはこのコードを入力してチームに参加できます。
              </p>
            </div>

            <Button onClick={goToDashboard} className="w-full">
              ダッシュボードへ進む
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>
            {mode === 'select' && 'チームを選択'}
            {mode === 'create' && '新しいチームを作成'}
            {mode === 'join' && 'チームに参加'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mode === 'select' && (
            <div className="space-y-4">
              <p className="text-center text-gray-600">
                チームを作成するか、既存のチームに参加してください
              </p>
              <Button
                onClick={() => setMode('create')}
                className="w-full"
              >
                新しいチームを作成
              </Button>
              <Button
                onClick={() => setMode('join')}
                variant="outline"
                className="w-full"
              >
                招待コードでチームに参加
              </Button>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <Input
                label="チーム名"
                placeholder="例: 営業チーム"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
              />

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMode('select');
                    setError(null);
                  }}
                  className="flex-1"
                >
                  戻る
                </Button>
                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="flex-1"
                >
                  作成
                </Button>
              </div>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoinTeam} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  招待コード
                </label>
                <input
                  type="text"
                  placeholder="例: ABC12345"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="flex h-12 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-xl font-bold tracking-widest text-gray-900 uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMode('select');
                    setError(null);
                  }}
                  className="flex-1"
                >
                  戻る
                </Button>
                <Button
                  type="submit"
                  isLoading={isLoading}
                  disabled={inviteCode.length !== 8}
                  className="flex-1"
                >
                  参加
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
