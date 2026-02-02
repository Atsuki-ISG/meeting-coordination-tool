# 認証・Cookie・プリフェッチ問題のトラブルシューティング

## 概要

本番環境（Cloud Run + HTTPS）でログイン後に画面遷移するとログイン画面に戻される問題が発生した。ローカル開発では再現しにくい問題。

## 発生した問題

1. ログイン後、サイドバーのリンクをクリックすると `/login` にリダイレクトされる
2. 直接URLを入力するとアクセスできる
3. ハードリロード（Cmd+Shift+R）すると一時的に解決する

## 原因

### 1. RSCプリフェッチとCookieの問題

Next.js の React Server Components (RSC) がリンクをプリフェッチする際：
- `sec-fetch-mode: cors` でリクエストが送信される
- CORS モードでは Cookie が自動送信されない
- ミドルウェアが未認証と判断し `/login` へリダイレクト
- そのリダイレクト結果がキャッシュされる

**Network タブでの確認方法:**
```
Request Headers:
  rsc: 1
  next-router-prefetch: 1
  sec-fetch-mode: cors
  Cookie: (なし)  ← ここが問題
```

### 2. Cookie 設定の問題

本番環境（HTTPS）では Cookie の設定が厳格に評価される：

| 属性 | ローカル | 本番 |
|------|----------|------|
| Secure | 不要 | 必須 |
| SameSite | 緩い | 厳格 |
| Domain | localhost | 正確なドメインが必要 |

### 3. NODE_ENV が未設定

Cloud Run の環境変数に `NODE_ENV=production` が設定されていないと、Cookie の `Secure` フラグが設定されない可能性がある。

```typescript
// 問題のあるコード
secure: process.env.NODE_ENV === 'production'

// 改善後のコード
const isProduction = process.env.NODE_ENV === 'production' ||
  process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://');
secure: isProduction
```

## 解決策

### 1. サイドバーのリンクで prefetch を無効化

```tsx
// src/components/layout/sidebar.tsx
<Link
  href={item.href}
  prefetch={false}  // ← これを追加
  className={...}
>
```

### 2. ミドルウェアで RSC リクエストをスキップ

Next.js のクライアントナビゲーションは RSC リクエスト（`rsc: 1` ヘッダー付き）を使用するが、CORS モードのため Cookie が送信されない。Cookie がない RSC リクエストは認証チェックをスキップする。

```typescript
// src/middleware.ts
const isRscRequest = request.headers.get('rsc') === '1';
if (isRscRequest && !sessionToken) {
  return NextResponse.next();
}
```

**注意**: `prefetch={false}` だけでは不十分。プリフェッチを無効にしても、実際のナビゲーション時に RSC リクエストが使用される。

### 3. キャッシュ制御ヘッダーの追加

```typescript
// src/middleware.ts
if (protectedRoutes.some((route) => pathname.startsWith(route))) {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
}
```

### 4. Cookie 設定の改善

```typescript
// src/lib/auth/session.ts, src/app/api/auth/callback/route.ts
const isProduction = process.env.NODE_ENV === 'production' ||
  process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://');

response.cookies.set(SESSION_COOKIE_NAME, token, {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  expires: expiresAt,
  path: '/',
});
```

## デバッグ方法

### 1. Cookie の確認

ブラウザの開発者ツール:
1. F12 → Application タブ → Cookies
2. 対象ドメインを選択
3. `session` Cookie の属性を確認:
   - Domain: 正しいドメインか
   - Secure: チェックされているか
   - SameSite: Lax か Strict か

### 2. デバッグ API

```
https://your-domain.com/api/debug/session
```

レスポンス例:
```json
{
  "hasCookies": true,
  "hasSessionCookie": true,
  "env": {
    "NODE_ENV": "production",
    "APP_URL": "https://..."
  }
}
```

### 3. Network タブでの確認

1. Preserve log にチェック
2. ログイン実行
3. `/api/auth/callback` の Response Headers で `set-cookie` を確認
4. リダイレクト先のリクエストで Request Headers の `Cookie` を確認

## 本番環境と同じ条件でローカルテストする方法

### mkcert でローカル HTTPS 環境を構築

```bash
# mkcert インストール
brew install mkcert
mkcert -install

# 証明書作成
mkcert localhost

# Next.js を HTTPS で起動（カスタムサーバーが必要）
```

## チェックリスト

デプロイ前の確認事項:

- [ ] Cloud Run の環境変数に `NODE_ENV=production` が設定されているか
- [ ] `NEXT_PUBLIC_APP_URL` が HTTPS の正しい URL か
- [ ] `ENCRYPTION_KEY` が設定されているか
- [ ] データベースのマイグレーションが完了しているか
- [ ] サイドバーの Link に `prefetch={false}` が設定されているか

## 関連ファイル

- `src/middleware.ts` - 認証ミドルウェア
- `src/lib/auth/session.ts` - セッション管理
- `src/app/api/auth/callback/route.ts` - OAuth コールバック
- `src/components/layout/sidebar.tsx` - サイドバーナビゲーション
- `src/app/api/debug/session/route.ts` - デバッグ用 API
