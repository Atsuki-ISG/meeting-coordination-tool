# 日程調整ツール ドキュメント

社内メンバーのGoogleカレンダーをマージし、外部ユーザーが予約できる日程調整システム。

---

## ドキュメント一覧

| ドキュメント | 内容 | 対象読者 |
|-------------|------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 基本設計書 | 開発者 |
| [SETUP.md](./SETUP.md) | 設定書 | 開発者・管理者 |
| [FEATURES.md](./FEATURES.md) | 機能仕様書 | 開発者・管理者 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | デプロイ手順 | 開発者・管理者 |
| [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) | 運用マニュアル | 管理者 |
| [USER_GUIDE.md](./USER_GUIDE.md) | 操作手順書 | エンドユーザー |
| [auth-cookie-issues.md](./auth-cookie-issues.md) | 認証トラブルシューティング | 開発者 |

---

## システム概要

### 目的
- 社内チーム（最大5名）の空き時間を自動でマージ
- 外部ユーザーが空き枠から予約可能
- Google Meetリンクを自動生成

### 主要機能
- Googleアカウントでログイン・カレンダー連携
- **システム管理者によるユーザー承認制**
- チーム作成・招待コードでの参加
- 予約メニュー（イベントタイプ）の作成・管理
- **カレンダー形式の予約ページ**（日付ごとの空き枠数表示）
- 予約のキャンセル機能
- **APIレート制限**（短期・月間）
- API利用量の監視

### 技術スタック
- **フロントエンド**: Next.js 16 (App Router) + React 19 + TypeScript
- **スタイリング**: Tailwind CSS 4
- **データベース**: Supabase (PostgreSQL)
- **認証**: カスタムJWTセッション + Google OAuth 2.0
- **カレンダー連携**: Google Calendar API
- **デプロイ**: Google Cloud Run

---

## クイックリンク

- [環境構築を始める](./SETUP.md)
- [本番デプロイする](./DEPLOYMENT.md)
- [画面操作を確認する](./USER_GUIDE.md)
