-- Add include_note_takers flag to event_types
-- When true, members with is_note_taker=true are automatically invited to calendar events

ALTER TABLE event_types
  ADD COLUMN IF NOT EXISTS include_note_takers BOOLEAN NOT NULL DEFAULT false;
