# deploy-and-docs

デプロイとドキュメント更新を並列で実行するスキル。

## トリガー

以下のような指示で使用する:
- 「デプロイしてドキュメント修正して」
- 「デプロイ→ドキュメント更新」
- 「/deploy-and-docs」

## ワークフロー

### Step 1: TypeScript チェック（デプロイ前に必ず実行）

```bash
npx tsc --noEmit
```

エラーがある場合はデプロイせずユーザーに報告する。

### Step 2: 並列実行

以下の2つを **同時に** 実行する（Task tool で parallel 実行）:

**A. デプロイ**
```bash
gcloud run deploy meetflow \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated
```
- サービス名は必ず `meetflow`（`meeting-coordination-tool` は間違い）
- リージョン: `asia-northeast1`

**B. ドキュメント調査**
- 今セッションで行った変更内容を把握する
- 更新が必要なドキュメントを特定する:
  - `README.md`
  - `docs/FEATURES.md`
  - `docs/ADMIN_GUIDE.md`
  - `docs/USER_GUIDE.md`
  - `docs/ARCHITECTURE.md`
  - `docs/SETUP.md`
  - `docs/DEPLOYMENT.md`
- 変更に関係するファイルを Read して現在の内容を確認する

### Step 3: デプロイ完了後にドキュメント更新

- デプロイ結果（リビジョン名など）を確認
- Step 2B の調査結果をもとにドキュメントを更新
- 新しい機能・変更点・削除した機能を正確に反映する
- **書きすぎない**: 実際の変更のみを記述

### Step 4: MEMORY.md 更新（必要な場合のみ）

`/Users/aki/.claude/projects/-Users-aki-Claude-meeting-coordination-tool/memory/MEMORY.md` に
今後のセッションで役立つ情報があれば追記する。

## 注意事項

- デプロイとドキュメント調査は並列で進める（待ち時間を無駄にしない）
- ドキュメント更新はデプロイ完了を待ってから行う（リビジョン名を記録するため）
- TypeScript エラーが出た場合はデプロイを中止してユーザーに報告する
- ドキュメントに嘘の情報を書かない（不明な場合は省略）
