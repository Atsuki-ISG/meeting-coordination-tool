---
name: deploy
description: "MeetFlow のデプロイとドキュメント更新を行う。使用タイミング: ユーザーが「デプロイして」「ドキュメント更新して」「リリースして」と言った場合。手順: 1) テスト・型チェック 2) Gitコミット・プッシュ 3) ドキュメント更新（docs/USER_GUIDE.md, docs/FEATURES.md, src/app/(public)/help/page.tsx） 4) Cloud Run デプロイ"
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

### 1. テスト・型チェック

```bash
npm test && npx tsc --noEmit
```

どちらかが失敗した場合は修正してから次へ。テストはロジック単体テスト（Supabase・Google Calendar はモック）。

### 2. Git コミット・プッシュ

#### ① 現在の状態を確認

```bash
git status
git diff --stat
git log --oneline -5
```

#### ② 変更をステージング

```bash
git add -A
```

#### ③ コミット

変更内容を反映した詳細なコミットメッセージを作成：

```bash
git commit -m "$(cat <<'EOF'
[タイトル: feat/fix/docs など]

## 主な変更
- 変更内容1
- 変更内容2

## 詳細
- 具体的な変更点
- 追加した機能
- 修正したバグ

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

#### ④ プッシュ

```bash
git push
```

### 3. ドキュメント更新（3ファイル必須）

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

### 4. Cloud Run デプロイ

```bash
gcloud run deploy meetflow --source . --region asia-northeast1 --allow-unauthenticated
```

**注意**:
- ローカルのソースコード（Dockerfile含む）をCloud Buildにアップロード
- クラウド上でDockerイメージをビルド → Cloud Runにデプロイ
- Gitの状態に関わらず、ローカルのファイルシステムを使用

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
