-- Add phone_number column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS phone_number TEXT;
