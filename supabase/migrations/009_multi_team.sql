-- Multi-team support: track all team memberships separately
-- members.team_id remains as "active team" pointer
-- members.role remains as role in the active team (synced on switch)

CREATE TABLE IF NOT EXISTS team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, team_id)
);

-- Migrate existing memberships from members table
INSERT INTO team_memberships (member_id, team_id, role)
SELECT id, team_id, COALESCE(role, 'member')
FROM members
WHERE team_id IS NOT NULL
ON CONFLICT (member_id, team_id) DO NOTHING;

-- Index for fast lookup by member
CREATE INDEX IF NOT EXISTS idx_team_memberships_member_id ON team_memberships(member_id);
-- Index for fast lookup by team
CREATE INDEX IF NOT EXISTS idx_team_memberships_team_id ON team_memberships(team_id);
