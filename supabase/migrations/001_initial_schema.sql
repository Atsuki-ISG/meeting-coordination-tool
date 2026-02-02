-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Members table (internal users)
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  google_refresh_token TEXT,  -- Encrypted with AES-256
  google_token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event types table
CREATE TABLE event_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (15, 30, 45, 60)),
  organizer_id UUID REFERENCES members(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event type members (many-to-many)
CREATE TABLE event_type_members (
  event_type_id UUID REFERENCES event_types(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (event_type_id, member_id)
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type_id UUID REFERENCES event_types(id) ON DELETE SET NULL,
  google_event_id TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  note TEXT,
  cancel_token_hash TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'canceled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  canceled_at TIMESTAMPTZ
);

-- API usage logs (for cost tracking)
CREATE TABLE api_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  request_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System settings
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_event_types_slug ON event_types(slug);
CREATE INDEX idx_event_types_organizer ON event_types(organizer_id);
CREATE INDEX idx_bookings_event_type ON bookings(event_type_id);
CREATE INDEX idx_bookings_start_at ON bookings(start_at);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX idx_api_usage_logs_created_at ON api_usage_logs(created_at);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to members table
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to system_settings table
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default system settings
INSERT INTO system_settings (key, value) VALUES
  ('maintenance_mode', '{"enabled": false, "message": ""}'),
  ('usage_alerts', '{"threshold_80_notified": false, "threshold_100_notified": false}'),
  ('budget', '{"monthly_limit": null, "current_usage": 0}');

-- Row Level Security (RLS) policies
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_type_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Members: authenticated users can read their own data
CREATE POLICY "Members can view own data" ON members
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Members can update own data" ON members
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Event types: authenticated users can manage their own event types
CREATE POLICY "Members can view all active event types" ON event_types
  FOR SELECT USING (is_active = true);

CREATE POLICY "Members can manage own event types" ON event_types
  FOR ALL USING (auth.uid()::text = organizer_id::text);

-- Event type members: allow reading for active event types
CREATE POLICY "Anyone can view event type members" ON event_type_members
  FOR SELECT USING (true);

CREATE POLICY "Organizers can manage event type members" ON event_type_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM event_types
      WHERE event_types.id = event_type_members.event_type_id
      AND event_types.organizer_id::text = auth.uid()::text
    )
  );

-- Bookings: public can create, authenticated can view all
CREATE POLICY "Anyone can create bookings" ON bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view bookings" ON bookings
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update bookings" ON bookings
  FOR UPDATE USING (true);

-- API usage logs: only authenticated users
CREATE POLICY "Authenticated users can view usage logs" ON api_usage_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create usage logs" ON api_usage_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- System settings: only authenticated users
CREATE POLICY "Authenticated users can view settings" ON system_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update settings" ON system_settings
  FOR UPDATE USING (auth.role() = 'authenticated');
