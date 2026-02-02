# パブリック公開手順

## 概要
Next.js日程調整ツールを本番環境にデプロイするための手順。

---

## デプロイ先の選択肢

| プラットフォーム | メリット | デメリット |
|----------------|---------|-----------|
| **Vercel** | Next.js最適化、設定簡単、無料枠あり | 商用利用は有料プラン推奨 |
| **Cloud Run** | GCP統合、スケーラビリティ | Dockerfile作成必要 |
| **Cloudflare Pages** | 高速、無料枠大きい | Edge Runtimeの制約 |

**推奨**: Vercel（最も簡単、Next.jsとの相性◎）

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

### Step 3: Vercelデプロイ

**3-1. GitHubリポジトリ連携**
```bash
# リポジトリをGitHubにプッシュ（まだの場合）
git remote add origin https://github.com/your-username/meeting-tool.git
git push -u origin main
```

**3-2. Vercelプロジェクト作成**
1. [Vercel](https://vercel.com) にログイン
2. 「New Project」→ GitHubリポジトリをインポート
3. Framework Preset: Next.js（自動検出）

**3-3. 環境変数設定**
Vercelダッシュボード → Settings → Environment Variables に以下を設定:

| 変数名 | 値 | 環境 |
|-------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabaseプロジェクトの URL | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabaseの anon key | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseの service_role key | All |
| `GOOGLE_CLIENT_ID` | Google OAuthクライアントID | All |
| `GOOGLE_CLIENT_SECRET` | Google OAuthクライアントシークレット | All |
| `ENCRYPTION_KEY` | 暗号化キー（32バイトhex） | All |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` | All |

**暗号化キー生成（まだの場合）:**
```bash
openssl rand -hex 32
```

**3-4. デプロイ実行**
- 「Deploy」ボタンをクリック
- 自動でビルド＆デプロイが実行される

### Step 4: カスタムドメイン設定（任意）

1. Vercel → Settings → Domains
2. カスタムドメインを追加
3. DNSレコードを設定（CNAME or A record）
4. SSL証明書は自動発行

### Step 5: 動作確認

1. **ログイン確認**: `/login` でGoogleログインが機能するか
2. **カレンダー連携**: ログイン後、カレンダーが連携されるか
3. **予約ページ**: `/book/{slug}` で空き枠が表示されるか
4. **予約作成**: 外部ユーザーとして予約ができるか
5. **Google Meet**: 予約後にMeetリンクが生成されるか

---

## セキュリティチェックリスト

- [ ] `.env.local` がリポジトリにコミットされていないことを確認
- [ ] 本番用に新しいENCRYPTION_KEYを生成
- [ ] Google OAuthの本番URLが設定済み
- [ ] Supabaseの許可URLが設定済み
- [ ] Rate Limiting の検討（必要に応じて）

---

## Cloud Run デプロイ（代替案）

Vercelの代わりにCloud Runを使う場合:

**必要なファイル作成:**
- `Dockerfile`
- `cloudbuild.yaml`（任意）
- `.dockerignore`

```dockerfile
# Dockerfile
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

**next.config.ts に追加:**
```typescript
output: 'standalone',
```

---

## 検証方法

1. Vercelのプレビューデプロイで事前確認
2. 本番デプロイ後、全機能を手動テスト
3. Google Calendar連携が正常に動作することを確認
4. 外部ユーザーからの予約フローをテスト
