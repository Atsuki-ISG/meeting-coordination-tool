-- Booking Invitations table
-- Used to control who can make bookings (invitation-only system)
CREATE TABLE booking_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,  -- Unique invitation token
  invited_by UUID REFERENCES members(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'used')),
  approved_by UUID REFERENCES members(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,  -- When the invitation was used to make a booking
  expires_at TIMESTAMPTZ,  -- Optional expiration date
  max_bookings INTEGER DEFAULT 1,  -- Maximum number of bookings allowed with this invitation
  bookings_count INTEGER DEFAULT 0,  -- Current number of bookings made
  note TEXT,  -- Admin note about this invitation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_booking_invitations_email ON booking_invitations(email);
CREATE INDEX idx_booking_invitations_token ON booking_invitations(token);
CREATE INDEX idx_booking_invitations_status ON booking_invitations(status);
CREATE INDEX idx_booking_invitations_team_id ON booking_invitations(team_id);

-- Apply updated_at trigger
CREATE TRIGGER update_booking_invitations_updated_at
  BEFORE UPDATE ON booking_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE booking_invitations ENABLE ROW LEVEL SECURITY;

-- Team members can view invitations for their team
CREATE POLICY "Team members can view team invitations" ON booking_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id::text = auth.uid()::text
      AND members.team_id = booking_invitations.team_id
    )
  );

-- Only admins can create invitations
CREATE POLICY "Admins can create invitations" ON booking_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id::text = auth.uid()::text
      AND members.role = 'admin'
    )
  );

-- Only admins can update invitations
CREATE POLICY "Admins can update invitations" ON booking_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id::text = auth.uid()::text
      AND members.role = 'admin'
    )
  );

-- Only admins can delete invitations
CREATE POLICY "Admins can delete invitations" ON booking_invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id::text = auth.uid()::text
      AND members.role = 'admin'
    )
  );

-- Add invitation_required setting to teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS require_invitation BOOLEAN DEFAULT true;

-- Add comment explaining the setting
COMMENT ON COLUMN teams.require_invitation IS 'When true, bookings require a valid invitation token';
