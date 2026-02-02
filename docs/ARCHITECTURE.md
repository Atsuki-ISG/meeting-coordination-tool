# 基本設計書

## 1. システム構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                        クライアント                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ 社内メンバー │  │ 外部ユーザー │  │ 管理者                  │  │
│  │ /dashboard  │  │ /book/{slug}│  │ /admin                  │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js (Vercel)                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ App Router                                                │   │
│  │  ├─ (public)/  認証不要ルート                             │   │
│  │  ├─ (auth)/    認証必要ルート                             │   │
│  │  └─ api/       APIエンドポイント                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Middleware                                                │   │
│  │  └─ セッション検証、チーム所属チェック、リダイレクト       │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────┬─────────────────────────────────┬───────────────────┘
            │                                 │
            ▼                                 ▼
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
│   │   ├── book/[slug]/          # 予約ページ
│   │   ├── cancel/[token]/       # キャンセルページ
│   │   └── login/                # ログインページ
│   ├── (auth)/                   # 認証必要ルート
│   │   ├── dashboard/            # ダッシュボード
│   │   ├── event-types/          # 予約メニュー管理
│   │   ├── bookings/             # 予約一覧
│   │   ├── members/              # メンバー管理
│   │   ├── settings/             # 予約可能時間設定
│   │   ├── admin/                # 管理画面
│   │   └── team/                 # チーム作成・参加
│   ├── api/
│   │   ├── auth/                 # 認証API
│   │   ├── availability/         # 空き枠取得API
│   │   ├── bookings/             # 予約API
│   │   ├── event-types/          # 予約メニューAPI
│   │   ├── members/              # メンバーAPI
│   │   ├── teams/                # チームAPI
│   │   ├── settings/             # 設定API
│   │   └── admin/                # 管理API
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/                       # 共通UIコンポーネント
├── lib/
│   ├── auth/                     # 認証ヘルパー
│   ├── availability/             # 空き枠計算ロジック
│   ├── google-calendar/          # Google Calendar API
│   ├── supabase/                 # Supabaseクライアント
│   └── utils/                    # ユーティリティ
└── types/                        # 型定義
```

---

## 3. データベース設計

### 3.1 ER図

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│   teams     │       │    members      │       │ event_types │
├─────────────┤       ├─────────────────┤       ├─────────────┤
│ id (PK)     │◄──┐   │ id (PK)         │   ┌──►│ id (PK)     │
│ name        │   │   │ email           │   │   │ slug        │
│ invite_code │   │   │ name            │   │   │ title       │
│ created_by  │───┼──►│ team_id (FK)    │───┤   │ description │
│ created_at  │   │   │ google_refresh_ │   │   │ duration_   │
│ updated_at  │   │   │   token         │   │   │   minutes   │
└─────────────┘   │   │ is_active       │   │   │ organizer_id│───┐
                  │   │ availability_   │   │   │ team_id(FK) │   │
                  │   │   settings      │   │   │ is_active   │   │
                  │   │ created_at      │   │   │ created_at  │   │
                  │   │ updated_at      │   │   └─────────────┘   │
                  │   └─────────────────┘                         │
                  │           │                                   │
                  │           │ ┌───────────────────────┐         │
                  │           │ │ event_type_members    │         │
                  │           │ ├───────────────────────┤         │
                  │           └►│ event_type_id (PK,FK) │◄────────┘
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
   │                │────────────────────────────────►│
   │                │◄────────────────────────────────│
   │                │                 │                 │
   │                │  JWTセッション作成               │
   │                │  (HTTPOnly Cookie)               │
   │◄───────────────│                 │                 │
```

### 4.2 セッション管理

- **方式**: JWTトークンをHTTPOnly Cookieに保存
- **有効期限**: 7日間
- **更新**: アクセス時に自動更新
- **署名**: ENCRYPTION_KEY を使用したHS256

### 4.3 認可レベル

| レベル | 対象ルート | 条件 |
|--------|-----------|------|
| 公開 | `/book/*`, `/cancel/*`, `/login` | なし |
| 認証のみ | `/team` | セッションあり |
| 認証+チーム | `/dashboard`, `/event-types`, etc. | セッション + チーム所属 |

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

## 6. セキュリティ設計

### 6.1 データ保護

| データ | 保護方式 |
|--------|---------|
| Googleリフレッシュトークン | AES-256-GCM暗号化 |
| キャンセルトークン | bcryptハッシュ |
| セッション | HS256署名JWT |

### 6.2 通信セキュリティ

- HTTPS強制（Vercel自動）
- HTTPOnly Cookie
- SameSite=Lax

### 6.3 アクセス制御

- Middleware による認証チェック
- チームベースのデータ分離
- RLS（Row Level Security）による DB レベルの制御
