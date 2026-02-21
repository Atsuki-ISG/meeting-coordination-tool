---
name: deploy
description: "MeetFlow のデプロイとドキュメント更新を行う。使用タイミング: ユーザーが「デプロイして」「ドキュメント更新して」「リリースして」と言った場合。手順: 1) TypeScript型チェック 2) ドキュメント更新（docs/USER_GUIDE.md, docs/FEATURES.md, src/app/(public)/help/page.tsx） 3) Cloud Run デプロイ"
---

# MeetFlow デプロイ & ドキュメント更新スキル

## デプロイ情報

| 項目 | 値 |
|------|-----|
| サービス名 | `meetflow` |
| リージョン | `asia-northeast1` |
| プロジェクト | `meeting-scheduler-485623` |
| URL | `https://meetflow-958232880627.asia-northeast1.run.app` |
| コマンド | `gcloud run deploy meetflow --source . --region asia-northeast1 --allow-unauthenticated` |

⚠️ `meeting-coordination-tool` は誤ったサービス名。使わない。

---

## 実行手順

### 1. TypeScript型チェック

```bash
npx tsc --noEmit
```

エラーがあれば修正してから次へ。

### 2. ドキュメント更新（3ファイル必須）

変更内容に応じて以下を必ず更新する。更新漏れがないように。

#### ① docs/USER_GUIDE.md
- ユーザー向け操作手順書（マークダウン）
- 新機能・変更された操作フローを追記/修正

#### ② docs/FEATURES.md
- 機能仕様書（マークダウン）
- 機能一覧テーブル、API仕様などを更新

#### ③ src/app/(public)/help/page.tsx（取説・最重要）
- 公開ヘルプページ。誰でも閲覧可能（ログイン不要）
- USER_GUIDE.md の内容を JSX で表現したもの
- `SubSection`, `Steps`, `Note` コンポーネントを使って整形
- 必ず USER_GUIDE.md と同期した内容にすること
- 印刷ボタンは `src/app/(public)/help/print-button.tsx`（クライアントコンポーネント）に分離済み

### 3. Cloud Run デプロイ

```bash
gcloud run deploy meetflow --source . --region asia-northeast1 --allow-unauthenticated
```

認証エラーが出た場合:
```bash
gcloud auth login
```

---

## 主要ファイル

| 役割 | パス |
|------|------|
| 操作手順書（MD） | `docs/USER_GUIDE.md` |
| 機能仕様書（MD） | `docs/FEATURES.md` |
| **公開ヘルプページ（取説）** | `src/app/(public)/help/page.tsx` |
| ヘルプ印刷ボタン | `src/app/(public)/help/print-button.tsx` |
| サイドバー | `src/components/layout/sidebar.tsx` |

---

## アプリ機能サマリー（最新）

### 認証・ユーザー管理
- Google OAuth ログイン（承認制）
- システム管理者による承認/拒否
- OAuth未検証警告: ログインページに回避手順を表示済み

### チーム管理
- 複数チーム所属対応（`team_memberships` テーブル）
- チーム作成・招待コードで参加
- サイドバー「チームを切り替え」ボタン → `/team`（マイチーム）ページ
- ロール: admin（管理者） / member（メンバー）

### 予約メニュー（event_types）
- メンバーは自分が作成した予約メニューのみ編集・削除可
- 管理者はすべての予約メニューを編集・削除可
- リンクコピー・プレビューは全員可
- 参加モード: 全員必須 / 誰か空いていれば
- 議事録担当者の自動招待オプション（`include_note_takers`）

### 可用性設定
- 曜日ごとに有効/無効・時間帯を設定
- 「終日」トグルで丸一日オープン（Googleカレンダー予定は自動除外）
- JST基準でスロット生成

### 予約
- 外部ユーザーが `/book/{slug}` で予約
- Google Meet リンク自動生成
- キャンセル URL をメールで通知

---

## マイグレーション状況

| ファイル | 適用済み |
|----------|---------|
| 001〜007 | ✅ |
| 008_include_note_takers.sql | ✅ |
| 009_multi_team.sql | ✅ |
