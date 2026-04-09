-- 参加者の決定方法（誰か1人が参加モード用）
ALTER TABLE event_types
  ADD COLUMN assignment_strategy TEXT
  NOT NULL DEFAULT 'balanced'
  CHECK (assignment_strategy IN ('balanced', 'priority'));

-- event_type_members に優先度カラム（小さいほど優先。デフォルト0）
ALTER TABLE event_type_members
  ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;

-- 予約ごとの担当メンバー（any_available モードで決定した1名）
ALTER TABLE bookings
  ADD COLUMN assigned_member_id UUID REFERENCES members(id) ON DELETE SET NULL;

CREATE INDEX idx_bookings_assigned_member_id ON bookings(assigned_member_id);
CREATE INDEX idx_bookings_event_type_start ON bookings(event_type_id, start_at);
