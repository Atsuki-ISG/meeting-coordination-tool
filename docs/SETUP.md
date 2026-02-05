# 設定書

## 1. 前提条件

### 必要なアカウント
- Google Cloud Platform アカウント
- Supabase アカウント
- GitHub アカウント（デプロイ用）

### 必要なソフトウェア
- Node.js 20.x 以上
- npm 10.x 以上
- Git
- Google Cloud CLI（Cloud Run デプロイ用）

---

## 2. ローカル開発環境構築

### 2.1 リポジトリのクローン

```bash
git clone <repository-url>
cd meeting-coordination-tool
npm install
```

### 2.2 環境変数ファイルの作成

```bash
cp .env.example .env.local
```

`.env.local` を編集して各値を設定します。

---

## 3. 環境変数一覧

| 変数名 | 必須 | 説明 | 例 |
|--------|------|------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | 必須 | SupabaseプロジェクトURL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 必須 | Supabase匿名キー | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | 必須 | Supabaseサービスロールキー | `eyJhbGci...` |
| `GOOGLE_CLIENT_ID` | 必須 | Google OAuthクライアントID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | 必須 | Google OAuthクライアントシークレット | `GOCSPX-xxx` |
| `ENCRYPTION_KEY` | 必須 | 暗号化キー（32バイトhex） | `64文字のhex` |
| `NEXT_PUBLIC_APP_URL` | 必須 | アプリケーションURL | `http://localhost:3000` |
| `SYSTEM_ADMIN_EMAILS` | 推奨 | システム管理者メールアドレス（カンマ区切り） | `admin@example.com` |
| `USAGE_ALERT_THRESHOLD` | 任意 | 月間API使用量上限 | `800000` |

### 暗号化キーの生成

```bash
openssl rand -hex 32
```

---

## 4. Supabase設定

### 4.1 プロジェクト作成

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. 「New Project」をクリック
3. プロジェクト名、パスワード、リージョンを設定

### 4.2 データベースマイグレーション

Supabase SQL Editor で以下のファイルを順番に実行：

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_availability_settings.sql`
3. `supabase/migrations/003_teams.sql`
4. `supabase/migrations/004_member_roles.sql`
5. `supabase/migrations/005_system_admin.sql`

### 4.3 API設定の取得

Project Settings → API から以下を取得：

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

### 4.4 認証設定（本番用）

Authentication → URL Configuration：

- **Site URL**: `https://your-domain.com`
- **Redirect URLs**: `https://your-domain.com/**`

---

## 5. Google Cloud設定

### 5.1 プロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 「新しいプロジェクト」を作成

### 5.2 APIの有効化

「APIとサービス」→「ライブラリ」から以下を有効化：

- Google Calendar API

### 5.3 OAuth同意画面の設定

「APIとサービス」→「OAuth同意画面」：

1. ユーザータイプ: 外部
2. アプリ名、サポートメール、デベロッパー連絡先を入力
3. スコープを追加:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
4. テストユーザーを追加（開発中のみ）

### 5.4 OAuth クライアントIDの作成

「認証情報」→「認証情報を作成」→「OAuthクライアントID」：

1. アプリケーションの種類: ウェブアプリケーション
2. 名前: 任意
3. 承認済みリダイレクトURI:
   - 開発: `http://localhost:3000/api/auth/callback`
   - 本番: `https://your-domain.com/api/auth/callback`

作成後、クライアントIDとシークレットを環境変数に設定。

### 5.5 本番公開設定

OAuth同意画面で「本番環境に公開」をクリック。

> **注意**: Calendar APIはセンシティブスコープのため、Google審査が必要になる場合があります。

---

## 6. ローカル開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアクセス可能。

---

## 7. 初期システム管理者の設定

システム管理者がいないと新規ユーザーを承認できません。

### 方法1: 環境変数で設定（推奨）

`.env.local` に以下を追加：

```
SYSTEM_ADMIN_EMAILS=your-email@example.com
```

このメールアドレスでログインすると、自動的にシステム管理者になります。

### 方法2: SQLで直接設定

Supabase SQL Editor で実行：

```sql
UPDATE members
SET is_system_admin = true, status = 'active'
WHERE email = 'your-email@example.com';
```

---

## 8. トラブルシューティング

### Google認証エラー

**エラー**: `redirect_uri_mismatch`

**原因**: リダイレクトURIが一致していない

**解決策**:
1. Google Cloud Console でリダイレクトURIを確認
2. `NEXT_PUBLIC_APP_URL` と一致しているか確認
3. 末尾のスラッシュに注意（`/api/auth/callback` ← スラッシュなし）

### Supabase接続エラー

**エラー**: `Failed to fetch`

**原因**: 環境変数が正しく設定されていない

**解決策**:
1. `.env.local` の値を確認
2. `NEXT_PUBLIC_` プレフィックスの有無を確認
3. 開発サーバーを再起動

### 暗号化エラー

**エラー**: `Invalid key length`

**原因**: `ENCRYPTION_KEY` が32バイトでない

**解決策**:
```bash
openssl rand -hex 32  # 64文字のhex文字列が出力される
```

### 承認待ち状態から抜けられない

**原因**: システム管理者が設定されていない

**解決策**:
1. `SYSTEM_ADMIN_EMAILS` 環境変数を設定
2. または SQL で直接 `is_system_admin = true` に設定
3. ログアウト → 再ログイン

---

## 9. 設定チェックリスト

### 開発環境

- [ ] Node.js 20.x インストール済み
- [ ] リポジトリクローン済み
- [ ] `npm install` 完了
- [ ] `.env.local` 作成済み
- [ ] Supabaseプロジェクト作成済み
- [ ] DBマイグレーション実行済み（5ファイル全て）
- [ ] Google Cloud プロジェクト作成済み
- [ ] Calendar API 有効化済み
- [ ] OAuth クライアントID 作成済み
- [ ] localhost のリダイレクトURI 追加済み
- [ ] `SYSTEM_ADMIN_EMAILS` 設定済み

### 本番環境

- [ ] 本番用 `ENCRYPTION_KEY` を新規生成
- [ ] Cloud Run に環境変数を設定
- [ ] Google OAuth リダイレクトURIに本番URL追加
- [ ] Supabase URL Configuration に本番URL追加
- [ ] Google OAuth 同意画面を「本番環境」に変更
- [ ] `SYSTEM_ADMIN_EMAILS` 設定済み
