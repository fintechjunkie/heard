-- ═══════════════════════════════════════════════
-- HEARD — Deal Rooms Migration
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- 1. DEAL ROOMS — explicitly created by a team member for a song
CREATE TABLE IF NOT EXISTS deal_rooms (
  id SERIAL PRIMARY KEY,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'reserved', 'purchased', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(song_id, team_id)
);

-- 2. REACTIONS — team members' votes on a deal room
CREATE TABLE IF NOT EXISTS deal_room_reactions (
  id SERIAL PRIMARY KEY,
  deal_room_id INTEGER NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('yes', 'maybe', 'pass')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_room_id, user_id)
);

-- 3. COMMENTS — threaded discussion in a deal room
CREATE TABLE IF NOT EXISTS deal_room_comments (
  id SERIAL PRIMARY KEY,
  deal_room_id INTEGER NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_admin_response BOOLEAN DEFAULT FALSE,
  is_admin_question BOOLEAN DEFAULT FALSE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS Policies
ALTER TABLE deal_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_room_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_room_comments ENABLE ROW LEVEL SECURITY;

-- Users can view deal rooms for their teams
DROP POLICY IF EXISTS "Users can view team deal rooms" ON deal_rooms;
CREATE POLICY "Users can view team deal rooms" ON deal_rooms
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Users can view reactions in their team's deal rooms
DROP POLICY IF EXISTS "Users can view deal room reactions" ON deal_room_reactions;
CREATE POLICY "Users can view deal room reactions" ON deal_room_reactions
  FOR SELECT USING (
    deal_room_id IN (
      SELECT id FROM deal_rooms WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Users can view comments in their team's deal rooms
DROP POLICY IF EXISTS "Users can view deal room comments" ON deal_room_comments;
CREATE POLICY "Users can view deal room comments" ON deal_room_comments
  FOR SELECT USING (
    deal_room_id IN (
      SELECT id FROM deal_rooms WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );
