# MeetFlow

チーム向けの予約調整ツール。Google カレンダーと連携し、空き時間を自動計算して外部ユーザーが予約できる仕組みを提供します。

## 機能

- **予約メニュー管理** — 所要時間・参加メンバー・URL スラッグを設定した予約メニューを作成
- **空き時間の自動計算** — チームメンバーの Google カレンダーと可用性設定をもとに空き枠を算出
- **外部向け予約ページ** — ログイン不要の公開 URL からゲストが日時を選択・予約
- **チーム管理** — 招待コードでメンバーを追加、ロール管理（管理者 / メンバー）、議事録担当の設定
- **Google カレンダー連携** — 予約確定時にカレンダーイベントを自動作成

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **データベース**: Supabase (PostgreSQL)
- **認証**: Google OAuth
- **スタイリング**: Tailwind CSS
- **デプロイ**: Google Cloud Run

## ローカル開発

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開く。

環境変数は `.env.local` に設定（`.env.example` を参照）。

## デプロイ

```bash
gcloud run deploy meetflow --source . --region asia-northeast1 --allow-unauthenticated
```

本番 URL: `https://meetflow-958232880627.asia-northeast1.run.app`

## ページ構成

| パス | 説明 |
|---|---|
| `/dashboard` | 予約メニューと直近の予約の概要 |
| `/event-types` | 予約メニューの一覧・作成・編集 |
| `/bookings` | 予約一覧 |
| `/settings` | 個人の可用性設定（曜日・時間帯） |
| `/settings/team` | チーム設定・メンバー管理 |
| `/admin` | システム管理（システム管理者のみ） |
| `/book/[slug]` | 外部向け予約ページ（ログイン不要） |
