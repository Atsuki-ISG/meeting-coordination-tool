-- 019: スキーマドリフト是正（マイグレーションから本番を再現できるようにする）
--
-- 本番の event_types には buffer_minutes / days_ahead / min_notice_minutes カラムと
-- 正しい duration_minutes CHECK（5〜480）が存在するが、それらを作るマイグレーションが
-- 無く、001 の CHECK は IN(15,30,45,60) のまま。fresh DB を 001 から構築すると本番と
-- 一致せず、90/120 分やバッファ設定の予約タイプ作成が DB で弾かれる。
-- ここで追補し、本番・新規どちらでも同じ最終状態にする。すべて存在ガード付きで本番は no-op。

ALTER TABLE event_types ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE event_types ADD COLUMN IF NOT EXISTS days_ahead INTEGER NOT NULL DEFAULT 14;
ALTER TABLE event_types ADD COLUMN IF NOT EXISTS min_notice_minutes INTEGER NOT NULL DEFAULT 60;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_types_buffer_minutes_check') THEN
    ALTER TABLE event_types ADD CONSTRAINT event_types_buffer_minutes_check
      CHECK (buffer_minutes >= 0 AND buffer_minutes <= 120);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_types_days_ahead_check') THEN
    ALTER TABLE event_types ADD CONSTRAINT event_types_days_ahead_check
      CHECK (days_ahead >= 1 AND days_ahead <= 90);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_types_min_notice_minutes_check') THEN
    ALTER TABLE event_types ADD CONSTRAINT event_types_min_notice_minutes_check
      CHECK (min_notice_minutes >= 0 AND min_notice_minutes <= 10080);
  END IF;
END $$;

-- duration_minutes の CHECK を 5〜480 に是正（旧 IN(15,30,45,60) を差し替え）
DO $$
DECLARE cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
  WHERE c.relname = 'event_types' AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%duration_minutes%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE event_types DROP CONSTRAINT %I', cname);
  END IF;
  ALTER TABLE event_types ADD CONSTRAINT event_types_duration_minutes_check
    CHECK (duration_minutes >= 5 AND duration_minutes <= 480);
END $$;
