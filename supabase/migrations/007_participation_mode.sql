-- 参加方式カラムをevent_typesに追加
ALTER TABLE event_types
  ADD COLUMN participation_mode TEXT
  NOT NULL DEFAULT 'all_required'
  CHECK (participation_mode IN ('all_required', 'any_available'));

-- 議事録担当フラグをmembersに追加
ALTER TABLE members
  ADD COLUMN is_note_taker BOOLEAN NOT NULL DEFAULT false;

-- 会社名カラムをbookingsに追加
ALTER TABLE bookings
  ADD COLUMN company_name TEXT;
