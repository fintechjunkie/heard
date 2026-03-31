-- ═══════════════════════════════════════════════
-- HEARD — Fix reaction CHECK constraint
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- The reactions table was created with CHECK (reaction IN ('yes', 'maybe', 'pass'))
-- but the app now uses: musthave, hit, love, notsure, notforme
-- This migration updates the constraint to allow the new values.

-- 1. Drop the old constraint
ALTER TABLE deal_room_reactions DROP CONSTRAINT IF EXISTS deal_room_reactions_reaction_check;

-- 2. Add the new constraint with updated values
ALTER TABLE deal_room_reactions ADD CONSTRAINT deal_room_reactions_reaction_check
  CHECK (reaction IN ('musthave', 'hit', 'love', 'notsure', 'notforme', 'yes', 'maybe', 'pass'));

-- 3. Migrate any existing old-format reactions to new format
UPDATE deal_room_reactions SET reaction = 'musthave' WHERE reaction = 'yes';
UPDATE deal_room_reactions SET reaction = 'notsure' WHERE reaction = 'maybe';
UPDATE deal_room_reactions SET reaction = 'notforme' WHERE reaction = 'pass';

-- 4. Add legal_doc_url column to songs if missing
ALTER TABLE songs ADD COLUMN IF NOT EXISTS legal_doc_url TEXT DEFAULT '';

-- 5. Add avatar_url and banner_url to members if missing
ALTER TABLE members ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
ALTER TABLE members ADD COLUMN IF NOT EXISTS banner_url TEXT DEFAULT '';
