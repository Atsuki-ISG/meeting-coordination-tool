-- Member Registration Requests table
-- Used to manage pending member registrations (approval system)
CREATE TABLE member_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  google_id TEXT UNIQUE NOT NULL,
  google_refresh_token TEXT,  -- Encrypted refresh token from OAuth
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES members(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,  -- Optional reason for rejection
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_member_requests_email ON member_requests(email);
CREATE INDEX idx_member_requests_status ON member_requests(status);
CREATE INDEX idx_member_requests_google_id ON member_requests(google_id);

-- Apply updated_at trigger
CREATE TRIGGER update_member_requests_updated_at
  BEFORE UPDATE ON member_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE member_requests ENABLE ROW LEVEL SECURITY;

-- Admins can view all member requests
CREATE POLICY "Admins can view member requests" ON member_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id::text = auth.uid()::text
      AND members.role = 'admin'
    )
  );

-- Anyone can create a request (for OAuth callback)
CREATE POLICY "Anyone can create member requests" ON member_requests
  FOR INSERT WITH CHECK (true);

-- Only admins can update requests
CREATE POLICY "Admins can update member requests" ON member_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id::text = auth.uid()::text
      AND members.role = 'admin'
    )
  );

-- Only admins can delete requests
CREATE POLICY "Admins can delete member requests" ON member_requests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id::text = auth.uid()::text
      AND members.role = 'admin'
    )
  );

-- Add registration_open setting to system_settings
INSERT INTO system_settings (key, value)
VALUES ('registration_open', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Comment explaining the setting
COMMENT ON TABLE member_requests IS 'Stores pending member registration requests awaiting admin approval';
