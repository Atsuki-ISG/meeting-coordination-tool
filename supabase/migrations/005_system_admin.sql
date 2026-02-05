-- Add system admin and approval status columns

-- Add status column to members (pending, active, suspended)
ALTER TABLE members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add system admin flag to members
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN DEFAULT false;

-- Add status column to teams (pending, active)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Update existing members to active status (they were already approved implicitly)
UPDATE members SET status = 'active' WHERE status IS NULL OR status = 'pending';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_is_system_admin ON members(is_system_admin);

-- Comment for documentation
COMMENT ON COLUMN members.status IS 'Account status: pending (awaiting approval), active (approved), suspended (disabled by admin)';
COMMENT ON COLUMN members.is_system_admin IS 'Whether this member has system-wide admin privileges';
COMMENT ON COLUMN teams.status IS 'Team status: pending (awaiting approval), active (approved)';
