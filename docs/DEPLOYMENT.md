# パブリック公開手順

## 概要
Next.js日程調整ツールを本番環境にデプロイするための手順。

---

## デプロイ先の選択肢

| プラットフォーム | メリット | デメリット |
|----------------|---------|-----------|
| **Cloud Run** | GCP統合、スケーラビリティ、Google APIとの親和性 | gcloud CLI 必要 |
| **Vercel** | Next.js最適化、設定簡単、無料枠あり | 商用利用は有料プラン推奨 |
| **Cloudflare Pages** | 高速、無料枠大きい | Edge Runtimeの制約 |

**推奨**: Cloud Run（Google Calendar APIとの統合が容易、スケーラビリティ◎）

---

## 公開までの手順

### Step 1: Google Cloud Console設定

**OAuth同意画面の公開**
1. [Google Cloud Console](https://console.cloud.google.com/) → APIとサービス → OAuth同意画面
2. 「公開ステータス」を「テスト」→「本番環境」に変更
3. 必要に応じてGoogle審査を申請（Calendar APIはセンシティブスコープ）

**リダイレクトURI追加**
1. 認証情報 → OAuth 2.0 クライアントID → 編集
2. 承認済みリダイレクトURIに本番URLを追加:
   ```
   https://your-domain.com/api/auth/callback
   ```

### Step 2: Supabase設定

1. [Supabase Dashboard](https://supabase.com/dashboard) → プロジェクト設定
2. **Authentication** → URL Configuration:
   - Site URL: `https://your-domain.com`
   - Redirect URLs に追加: `https://your-domain.com/**`

### Step 3: Cloud Runデプロイ（推奨）

**3-1. 前提条件**

```bash
# Google Cloud CLI がインストールされていること
gcloud --version

# プロジェクトにログイン
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

**3-2. Dockerfileの確認**

プロジェクトルートに以下の `Dockerfile` があることを確認:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

**3-3. next.config.ts の確認**

```typescript
output: 'standalone',
```

**3-4. デプロイ実行**

```bash
# Cloud Run にデプロイ（環境変数を設定）
gcloud run deploy meetflow \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co" \
  --set-env-vars "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci..." \
  --set-env-vars "SUPABASE_SERVICE_ROLE_KEY=eyJhbGci..." \
  --set-env-vars "GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com" \
  --set-env-vars "GOOGLE_CLIENT_SECRET=GOCSPX-xxx" \
  --set-env-vars "ENCRYPTION_KEY=64文字のhex" \
  --set-env-vars "NEXT_PUBLIC_APP_URL=https://your-domain.com" \
  --set-env-vars "SYSTEM_ADMIN_EMAILS=admin@example.com" \
  --set-env-vars "USAGE_ALERT_THRESHOLD=800000"
```

**3-5. 環境変数一覧**

| 変数名 | 必須 | 説明 |
|-------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 必須 | SupabaseプロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 必須 | Supabase匿名キー |
| `SUPABASE_SERVICE_ROLE_KEY` | 必須 | Supabaseサービスロールキー |
| `GOOGLE_CLIENT_ID` | 必須 | Google OAuthクライアントID |
| `GOOGLE_CLIENT_SECRET` | 必須 | Google OAuthクライアントシークレット |
| `ENCRYPTION_KEY` | 必須 | 暗号化キー（32バイトhex） |
| `NEXT_PUBLIC_APP_URL` | 必須 | アプリケーションURL |
| `SYSTEM_ADMIN_EMAILS` | 推奨 | システム管理者メールアドレス（カンマ区切り） |
| `USAGE_ALERT_THRESHOLD` | 任意 | 月間API使用量上限（デフォルト: 800000） |

**暗号化キー生成（まだの場合）:**
```bash
openssl rand -hex 32
```

### Step 4: カスタムドメイン設定（任意）

**Cloud Run の場合:**

1. Cloud Run コンソール → サービス → ドメインマッピング
2. カスタムドメインを追加
3. DNSレコードを設定（CNAME）
4. SSL証明書は自動発行

### Step 5: 初期システム管理者の設定

システム管理者がいないと新規ユーザーを承認できません。

**方法1: 環境変数で設定（推奨）**

デプロイ時に `SYSTEM_ADMIN_EMAILS` を設定:
```bash
--set-env-vars "SYSTEM_ADMIN_EMAILS=admin@example.com,admin2@example.com"
```

このメールアドレスでログインすると、自動的にシステム管理者になります。

**方法2: SQLで直接設定**

Supabase SQL Editor で実行:
```sql
UPDATE members
SET is_system_admin = true, status = 'active'
WHERE email = 'admin@example.com';
```

### Step 6: 動作確認

1. **ログイン確認**: `/login` でGoogleログインが機能するか
2. **承認フロー**: 新規ユーザーが承認待ち画面に遷移するか
3. **システム管理者**: `/admin` でユーザー承認ができるか
4. **カレンダー連携**: ログイン後、カレンダーが連携されるか
5. **予約ページ**: `/book/{slug}` でカレンダー形式の空き枠が表示されるか
6. **予約作成**: 外部ユーザーとして予約ができるか
7. **Google Meet**: 予約後にMeetリンクが生成されるか

---

## セキュリティチェックリスト

- [ ] `.env.local` がリポジトリにコミットされていないことを確認
- [ ] 本番用に新しいENCRYPTION_KEYを生成
- [ ] Google OAuthの本番URLが設定済み
- [ ] Supabaseの許可URLが設定済み
- [ ] `SYSTEM_ADMIN_EMAILS` が設定済み
- [ ] Rate Limiting が有効（デフォルトで有効）

---

## Vercelデプロイ（代替案）

Cloud Runの代わりにVercelを使う場合:

**1. GitHubリポジトリ連携**
```bash
git remote add origin https://github.com/your-username/meeting-tool.git
git push -u origin main
```

**2. Vercelプロジェクト作成**
1. [Vercel](https://vercel.com) にログイン
2. 「New Project」→ GitHubリポジトリをインポート
3. Framework Preset: Next.js（自動検出）

**3. 環境変数設定**
Vercelダッシュボード → Settings → Environment Variables に上記の環境変数を設定

**4. デプロイ実行**
「Deploy」ボタンをクリック

---

## 検証方法

1. Cloud Run のプレビューURLで事前確認
2. 本番デプロイ後、全機能を手動テスト
3. 新規ユーザー登録 → 承認フローをテスト
4. Google Calendar連携が正常に動作することを確認
5. 外部ユーザーからの予約フローをテスト（カレンダーUI）

---

## レート制限について

本システムには以下のレート制限が実装されています:

### 短期レート制限
- 同一IPから10秒間に5リクエストまで
- 対象: `/api/availability`, `/api/bookings`, `/api/bookings/cancel`

### 月間使用量制限
- `USAGE_ALERT_THRESHOLD` で設定（デフォルト: 800,000）
- 80%到達時に警告
- 上限到達時は予約機能を一時停止

監視は `/admin` 画面で確認できます。

---

## 日常的なデプロイフロー

コード変更後の更新デプロイ手順。

### 1. 変更をコミット＆プッシュ

```bash
cd ~/Claude/meeting-coordination-tool
git add -A
git commit -m "変更内容の説明"
git push origin main
```

### 2. Cloud Runにデプロイ

```bash
# 認証確認（必要な場合のみ）
gcloud auth login

# デプロイ実行
gcloud run deploy meetflow \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated
```

**注意**: 環境変数を変更する場合は `--update-env-vars` を追加：

```bash
gcloud run deploy meetflow \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --update-env-vars "KEY=value"
```

### 3. デプロイ確認

1. Cloud Run コンソールでデプロイ状況を確認
2. サービスURLにアクセスして動作確認
3. 必要に応じてログを確認：
   ```bash
   gcloud run services logs read meetflow --region asia-northeast1
   ```

### クイックデプロイ（ワンライナー）

```bash
cd ~/Claude/meeting-coordination-tool && git add -A && git commit -m "Update" && git push origin main && gcloud run deploy meetflow --source . --region asia-northeast1 --allow-unauthenticated
```
