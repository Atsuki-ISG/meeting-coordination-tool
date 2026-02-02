-- Add role column to members (admin or member)
ALTER TABLE members ADD COLUMN role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member'));

-- Set the team creator as admin
UPDATE members m
SET role = 'admin'
FROM teams t
WHERE m.id = t.created_by AND m.team_id = t.id;

-- Create index for role lookups
CREATE INDEX idx_members_role ON members(role);
