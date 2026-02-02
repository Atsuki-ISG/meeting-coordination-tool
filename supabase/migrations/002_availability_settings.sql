-- Add availability settings to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS availability_settings JSONB DEFAULT '{
  "0": {"enabled": false, "startTime": "09:00", "endTime": "18:00"},
  "1": {"enabled": true, "startTime": "09:00", "endTime": "18:00"},
  "2": {"enabled": true, "startTime": "09:00", "endTime": "18:00"},
  "3": {"enabled": true, "startTime": "09:00", "endTime": "18:00"},
  "4": {"enabled": true, "startTime": "09:00", "endTime": "18:00"},
  "5": {"enabled": true, "startTime": "09:00", "endTime": "18:00"},
  "6": {"enabled": false, "startTime": "09:00", "endTime": "18:00"}
}'::jsonb;

-- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
-- Default: Mon-Fri 9:00-18:00, Sat-Sun disabled
