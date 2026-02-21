-- Time slot presets for per-event-type time restrictions
-- Allows team admins to create reusable time slot templates

CREATE TABLE IF NOT EXISTS time_slot_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- days: array of weekday numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
  days INTEGER[] NOT NULL DEFAULT '{}',
  -- time stored as HH:MM format in JST
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_slot_presets_team_id ON time_slot_presets(team_id);

-- Add time restriction to event types
-- Can be: null (no restriction), preset_id (use preset), or JSON custom config
ALTER TABLE event_types
ADD COLUMN IF NOT EXISTS time_restriction_type TEXT DEFAULT 'none' CHECK (time_restriction_type IN ('none', 'preset', 'custom')),
ADD COLUMN IF NOT EXISTS time_restriction_preset_id UUID REFERENCES time_slot_presets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS time_restriction_custom JSONB;

-- Custom format example: {"days": [1,2,3,4,5], "start_time": "09:00", "end_time": "12:00"}

CREATE INDEX IF NOT EXISTS idx_event_types_preset ON event_types(time_restriction_preset_id);
