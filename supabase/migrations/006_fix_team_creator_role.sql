-- Fix team creators who have role='member' instead of 'admin'
-- This updates members who created a team but weren't set as admin due to a bug

UPDATE members
SET role = 'admin', updated_at = NOW()
WHERE id IN (
  SELECT created_by FROM teams
)
AND role = 'member';
