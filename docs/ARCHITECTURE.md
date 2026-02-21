# 基本設計書

## 1. システム構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                        クライアント                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ 社内メンバー │  │ 外部ユーザー │  │ システム管理者          │  │
│  │ /dashboard  │  │ /book/{slug}│  │ /admin                  │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js (Cloud Run)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ App Router                                                │   │
│  │  ├─ (public)/  認証不要ルート                             │   │
│  │  │   ├─ book/[slug]/    予約ページ（カレンダーUI）        │   │
│  │  │   ├─ cancel/[token]/ キャンセルページ                  │   │
│  │  │   ├─ login/          ログインページ                    │   │
│  │  │   └─ pending-approval/ 承認待ち画面                    │   │
│  │  ├─ (auth)/    認証必要ルート                             │   │
│  │  │   └─ admin/          システム管理画面                  │   │
│  │  └─ api/       APIエンドポイント                          │   │
│  │      ├─ admin/members/  ユーザー管理API                   │   │
│  │      └─ auth/status/    ステータス確認API                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Middleware                                                │   │
│  │  ├─ セッション検証                                        │   │
│  │  ├─ ユーザーステータス確認（pending/active/suspended）    │   │
│  │  ├─ システム管理者権限チェック                            │   │
│  │  ├─ チーム所属チェック                                    │   │
│  │  └─ リダイレクト制御                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Rate Limiting                                             │   │
│  │  ├─ 短期制限: 10秒/5リクエスト（IP単位）                  │   │
│  │  └─ 月間制限: USAGE_ALERT_THRESHOLD                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────┬─────────────────────────────────────┬───────────────┘
            │                                     │
            ▼                                     ▼
┌───────────────────────┐         ┌───────────────────────────────┐
│   Supabase            │         │   Google APIs                 │
│  ┌─────────────────┐  │         │  ┌─────────────────────────┐  │
│  │ PostgreSQL      │  │         │  │ OAuth 2.0               │  │
│  │ - members       │  │         │  │ - 認証・認可            │  │
│  │ - teams         │  │         │  └─────────────────────────┘  │
│  │ - event_types   │  │         │  ┌─────────────────────────┐  │
│  │ - bookings      │  │         │  │ Calendar API            │  │
│  │ - api_usage_logs│  │         │  │ - FreeBusy (空き確認)   │  │
│  └─────────────────┘  │         │  │ - Events (予定作成)     │  │
└───────────────────────┘         │  │ - Meet (会議リンク)     │  │
                                  │  └─────────────────────────┘  │
                                  └───────────────────────────────┘
```

---

## 2. ディレクトリ構造

```
src/
├── app/
│   ├── (public)/                 # 認証不要ルート
│   │   ├── book/[slug]/          # 予約ページ（カレンダーUI）
│   │   ├── cancel/[token]/       # キャンセルページ
│   │   ├── login/                # ログインページ
│   │   └── pending-approval/     # 承認待ち画面
│   ├── (auth)/                   # 認証必要ルート
│   │   ├── dashboard/            # ダッシュボード
│   │   ├── event-types/          # 予約メニュー管理
│   │   ├── bookings/             # 予約一覧
│   │   ├── settings/             # 個人の可用性設定
│   │   │   └── team/             # チーム設定・メンバー管理
│   │   ├── admin/                # システム管理画面
│   │   ├── team/                 # チーム作成・参加
│   │   ├── members/              # メンバー一覧（サイドバー非表示・URL有効）
│   │   └── invitations/          # 登録申請（サイドバー非表示・URL有効）
│   ├── api/
│   │   ├── auth/                 # 認証API
│   │   │   ├── login/            # ログイン開始
│   │   │   ├── callback/         # OAuthコールバック
│   │   │   ├── logout/           # ログアウト
│   │   │   └── status/           # ステータス確認
│   │   ├── availability/         # 空き枠取得API
│   │   ├── bookings/             # 予約API
│   │   │   └── cancel/           # キャンセルAPI
│   │   ├── event-types/          # 予約メニューAPI
│   │   ├── members/              # メンバーAPI
│   │   ├── teams/                # チームAPI
│   │   │   └── members/          # チームメンバーAPI
│   │   ├── settings/             # 設定API
│   │   └── admin/                # システム管理API
│   │       └── members/          # ユーザー管理API
│   │           └── [memberId]/   # 個別ユーザー操作
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── booking/                  # 予約関連コンポーネント
│   │   ├── calendar-picker.tsx   # カレンダー形式の日付選択
│   │   └── booking-form.tsx      # 予約フォーム
│   ├── layout/                   # レイアウトコンポーネント
│   │   └── sidebar.tsx           # サイドバー
│   └── ui/                       # 共通UIコンポーネント
├── lib/
│   ├── auth/                     # 認証ヘルパー
│   │   └── session.ts            # セッション管理
│   ├── availability/             # 空き枠計算ロジック
│   ├── google-calendar/          # Google Calendar API
│   ├── rate-limit/               # レート制限
│   │   └── index.ts              # 短期・月間制限
│   ├── supabase/                 # Supabaseクライアント
│   └── utils/                    # ユーティリティ
└── types/                        # 型定義
```

---

## 3. データベース設計

### 3.1 ER図

```
┌─────────────────┐       ┌─────────────────────┐       ┌─────────────┐
│     teams       │       │      members        │       │ event_types │
├─────────────────┤       ├─────────────────────┤       ├─────────────┤
│ id (PK)         │◄──┐   │ id (PK)             │   ┌──►│ id (PK)     │
│ name            │   │   │ email               │   │   │ slug        │
│ invite_code     │   │   │ name                │   │   │ title       │
│ status          │   │   │ team_id (FK)        │───┤   │ description │
│ created_by      │───┼──►│ google_refresh_token│   │   │ duration_   │
│ created_at      │   │   │ is_active           │   │   │   minutes   │
│ updated_at      │   │   │ status              │   │   │ organizer_id│───┐
└─────────────────┘   │   │ is_system_admin     │   │   │ team_id(FK) │   │
                      │   │ availability_       │   │   │ is_active   │   │
                      │   │   settings          │   │   │ created_at  │   │
                      │   │ role                │   │   └─────────────┘   │
                      │   │ created_at          │                         │
                      │   │ updated_at          │                         │
                      │   └─────────────────────┘                         │
                      │           │                                       │
                      │           │ ┌───────────────────────┐             │
                      │           │ │ event_type_members    │             │
                      │           │ ├───────────────────────┤             │
                      │           └►│ event_type_id (PK,FK) │◄────────────┘
                      │             │ member_id (PK,FK)     │
                      │             └───────────────────────┘
                      │
                      │   ┌─────────────────┐
                      │   │    bookings     │
                      │   ├─────────────────┤
                      │   │ id (PK)         │
                      │   │ event_type_id   │───► event_types
                      │   │ google_event_id │
                      │   │ start_at        │
                      │   │ end_at          │
                      │   │ requester_name  │
                      │   │ requester_email │
                      │   │ note            │
                      │   │ cancel_token_   │
                      │   │   hash          │
                      │   │ status          │
                      │   │ created_at      │
                      │   │ canceled_at     │
                      │   └─────────────────┘
                      │
                      │   ┌─────────────────┐    ┌─────────────────┐
                      │   │ api_usage_logs  │    │ system_settings │
                      │   ├─────────────────┤    ├─────────────────┤
                      │   │ id (PK)         │    │ key (PK)        │
                      │   │ endpoint        │    │ value (JSONB)   │
                      │   │ member_id (FK)  │    │ updated_at      │
                      │   │ request_count   │    └─────────────────┘
                      │   │ created_at      │
                      │   └─────────────────┘
```

### 3.2 テーブル定義

#### teams（チーム）
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | UUID | PK | チームID |
| name | TEXT | NOT NULL | チーム名 |
| invite_code | TEXT | UNIQUE, NOT NULL | 招待コード（8文字） |
| status | TEXT | DEFAULT 'active' | ステータス（active/suspended） |
| created_by | UUID | FK → members | 作成者 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新日時 |

#### members（メンバー）
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | UUID | PK | メンバーID |
| email | TEXT | UNIQUE, NOT NULL | メールアドレス |
| name | TEXT | NOT NULL | 表示名 |
| team_id | UUID | FK → teams | 所属チーム |
| google_refresh_token | TEXT | - | 暗号化されたリフレッシュトークン |
| google_token_expires_at | TIMESTAMPTZ | - | トークン有効期限 |
| is_active | BOOLEAN | DEFAULT true | 有効フラグ |
| status | TEXT | DEFAULT 'pending' | ユーザーステータス（pending/active/suspended） |
| is_system_admin | BOOLEAN | DEFAULT false | システム管理者フラグ |
| role | TEXT | DEFAULT 'member' | チーム内ロール（admin/member） |
| is_note_taker | BOOLEAN | DEFAULT false | 議事録担当フラグ |
| availability_settings | JSONB | - | 予約可能時間設定 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新日時 |

#### event_types（予約メニュー）
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | UUID | PK | 予約メニューID |
| slug | TEXT | UNIQUE, NOT NULL | URL用スラッグ |
| title | TEXT | NOT NULL | タイトル |
| description | TEXT | - | 説明 |
| duration_minutes | INTEGER | CHECK (15,30,45,60) | 所要時間（分） |
| organizer_id | UUID | FK → members | 主催者 |
| team_id | UUID | FK → teams | 所属チーム |
| participation_mode | TEXT | DEFAULT 'all_required' | 参加モード（all_required/any_available） |
| is_active | BOOLEAN | DEFAULT true | 有効フラグ |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |

#### bookings（予約）
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | UUID | PK | 予約ID |
| event_type_id | UUID | FK → event_types | 予約メニュー |
| google_event_id | TEXT | - | GoogleカレンダーイベントID |
| start_at | TIMESTAMPTZ | NOT NULL | 開始日時 |
| end_at | TIMESTAMPTZ | NOT NULL | 終了日時 |
| requester_name | TEXT | NOT NULL | 予約者名 |
| requester_email | TEXT | NOT NULL | 予約者メール |
| note | TEXT | - | 備考 |
| cancel_token_hash | TEXT | - | キャンセルトークンハッシュ |
| status | TEXT | CHECK (confirmed,canceled) | ステータス |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| canceled_at | TIMESTAMPTZ | - | キャンセル日時 |

---

## 4. 認証・認可フロー

### 4.1 ログインフロー

```
ユーザー          Next.js           Google           Supabase
   │                │                 │                 │
   │  ログイン要求   │                 │                 │
   │───────────────►│                 │                 │
   │                │  OAuth認可URL   │                 │
   │                │────────────────►│                 │
   │                │◄────────────────│                 │
   │   リダイレクト  │                 │                 │
   │◄───────────────│                 │                 │
   │                │                 │                 │
   │  Google認証    │                 │                 │
   │────────────────┼────────────────►│                 │
   │                │                 │                 │
   │  コールバック   │  認可コード     │                 │
   │────────────────┼────────────────►│                 │
   │                │  トークン取得   │                 │
   │                │────────────────►│                 │
   │                │◄────────────────│                 │
   │                │                 │                 │
   │                │  メンバー作成/更新                │
   │                │  (新規: status=pending)          │
   │                │  (SYSTEM_ADMIN_EMAILS: active)   │
   │                │────────────────────────────────►│
   │                │◄────────────────────────────────│
   │                │                 │                 │
   │                │  JWTセッション作成               │
   │                │  (status, isSystemAdmin含む)     │
   │◄───────────────│                 │                 │
   │                │                 │                 │
   │  ステータスに応じたリダイレクト                    │
   │  - pending → /pending-approval                    │
   │  - active (チームなし) → /team                    │
   │  - active (チームあり) → /dashboard               │
```

### 4.2 セッション管理

- **方式**: JWTトークンをHTTPOnly Cookieに保存
- **有効期限**: 7日間
- **更新**: アクセス時に自動更新
- **署名**: ENCRYPTION_KEY を使用したHS256
- **ペイロード**:
  - memberId
  - email
  - name
  - teamId
  - status (pending/active/suspended)
  - isSystemAdmin (boolean)

### 4.3 認可レベル

| レベル | 対象ルート | 条件 |
|--------|-----------|------|
| 公開 | `/book/*`, `/cancel/*`, `/login` | なし |
| 承認待ち | `/pending-approval` | セッションあり + status=pending |
| 認証のみ | `/team` | セッションあり + status=active |
| 認証+チーム | `/dashboard`, `/event-types`, etc. | セッション + status=active + チーム所属 |
| システム管理者 | `/admin` | セッション + isSystemAdmin=true |

### 4.4 ユーザーステータスフロー

```
新規登録 → pending（承認待ち）
              ↓
    システム管理者が承認
              ↓
         active（有効）
              ↓
    システム管理者が停止
              ↓
       suspended（停止）
```

---

## 5. 空き枠計算ロジック

### 5.1 処理フロー

```
1. イベントタイプの参加メンバーを取得
2. 各メンバーのGoogleカレンダーからFreeBusyを取得
3. 全メンバーのbusy区間をマージ
4. 予約可能時間設定（曜日・時間帯）でフィルタ
5. 指定された所要時間でスロット化
6. 空きスロットを返却
```

### 5.2 マージアルゴリズム

```typescript
// 重複するbusy区間をマージ
function mergeBusySlots(busySlotsArrays: BusySlot[][]): BusySlot[] {
  const allSlots = busySlotsArrays.flat().sort((a, b) =>
    a.start.getTime() - b.start.getTime()
  );

  const merged: BusySlot[] = [];
  for (const slot of allSlots) {
    const last = merged[merged.length - 1];
    if (last && slot.start <= last.end) {
      last.end = new Date(Math.max(last.end.getTime(), slot.end.getTime()));
    } else {
      merged.push({ ...slot });
    }
  }
  return merged;
}
```

---

## 6. レート制限設計

### 6.1 短期レート制限

```typescript
// IP単位で10秒間に5リクエストまで
const RATE_LIMIT_WINDOW_MS = 10000;
const RATE_LIMIT_MAX_REQUESTS = 5;

// インメモリMapで管理
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
```

### 6.2 月間使用量制限

```typescript
// 月間使用量をDBで管理
const USAGE_ALERT_THRESHOLD = process.env.USAGE_ALERT_THRESHOLD || 800000;

// api_usage_logsテーブルから月間合計を取得
// 80%でアラート、100%で制限
```

---

## 7. セキュリティ設計

### 7.1 データ保護

| データ | 保護方式 |
|--------|---------|
| Googleリフレッシュトークン | AES-256-GCM暗号化 |
| キャンセルトークン | bcryptハッシュ |
| セッション | HS256署名JWT |

### 7.2 通信セキュリティ

- HTTPS強制（Cloud Run自動）
- HTTPOnly Cookie
- SameSite=Lax

### 7.3 アクセス制御

- Middleware による認証チェック
- ユーザーステータスチェック（pending/active/suspended）
- システム管理者権限チェック
- チームベースのデータ分離
- RLS（Row Level Security）による DB レベルの制御
- IPベースのレート制限
