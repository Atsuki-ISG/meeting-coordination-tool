-- Add note_taker_member_id to event_types
-- Replaces the boolean include_note_takers with a specific member selection

ALTER TABLE event_types
  ADD COLUMN note_taker_member_id UUID REFERENCES members(id) ON DELETE SET NULL;
