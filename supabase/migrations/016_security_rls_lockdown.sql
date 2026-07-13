-- 016: Row Level Security の締め直し（情報漏洩・改ざん対策）
--
-- 背景: 本番DBを確認したところ、public スキーマの全テーブルで RLS が「無効」かつ
-- anon / authenticated ロールに全テーブルの SELECT/INSERT/UPDATE/DELETE/TRUNCATE
-- 権限が付与されていた（マイグレーション 001 の ENABLE RLS / CREATE POLICY は実際には
-- 効いていなかった）。anon キーは NEXT_PUBLIC_ としてブラウザに露出しているため、
-- この状態では anon キーだけで members（メール・Google トークン）・bookings（顧客
-- PII）・teams（招待コード）を含む全データを誰でも読み取り・改ざん・全削除できた。
--
-- 対応: 全テーブルで RLS を有効化する。ポリシーを一切作らないので、anon/authenticated
-- からの直接アクセスは default-deny で拒否される。アプリは DB アクセスをすべて
-- service-role（createServiceClient）で行っており、service_role は RLS をバイパスする
-- ため無影響。anon クライアントを使う admin/settings・admin/usage も、テーブルアクセスは
-- service role 経由で、anon は auth.getUser() にしか使っていないため壊れない。
--
-- 冪等性: このマイグレーションは (a) ドリフトした本番（RLS 無効・ポリシー無し）と
-- (b) 001 から順に構築した新規DB（RLS 有効・permissive ポリシー有り）のどちらに当てても
-- 安全な最終状態に収束するよう、テーブル存在ガードと DROP POLICY IF EXISTS を併用する。

-- 1. 存在する全テーブルで RLS を有効化
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'members', 'event_types', 'event_type_members', 'bookings',
    'api_usage_logs', 'system_settings', 'teams', 'team_memberships',
    'time_slot_presets', 'member_requests'
  ]
  LOOP
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- 2. 001 / 005 由来の permissive（USING(true) 等）ポリシーを削除（存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookings') THEN
    DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Anyone can view bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Anyone can update bookings" ON public.bookings;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_type_members') THEN
    DROP POLICY IF EXISTS "Anyone can view event type members" ON public.event_type_members;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_types') THEN
    DROP POLICY IF EXISTS "Members can view all active event types" ON public.event_types;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'member_requests') THEN
    DROP POLICY IF EXISTS "Anyone can create member requests" ON public.member_requests;
  END IF;
END $$;
