-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add team_id to members
ALTER TABLE members ADD COLUMN team_id UUID REFERENCES teams(id);

-- Add team_id to event_types for team-scoped access
ALTER TABLE event_types ADD COLUMN team_id UUID REFERENCES teams(id);

-- Create index for faster lookups
CREATE INDEX idx_members_team_id ON members(team_id);
CREATE INDEX idx_event_types_team_id ON event_types(team_id);
CREATE INDEX idx_teams_invite_code ON teams(invite_code);

-- Function to generate random invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
