-- Add calendar title template to event types
-- Allows customizing the calendar event title for team members
-- Variables: {guest_name}, {guest_email}, {event_type}, {date}, {time}, {notes}

ALTER TABLE event_types
ADD COLUMN IF NOT EXISTS calendar_title_template TEXT DEFAULT '{event_type} - {guest_name}';

-- Update existing records to use default template
UPDATE event_types
SET calendar_title_template = '{event_type} - {guest_name}'
WHERE calendar_title_template IS NULL;
