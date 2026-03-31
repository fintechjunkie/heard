-- ═══════════════════════════════════════════════
-- HEARD — Teams + Image Fields Migration
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- 1. TEAMS
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TEAM MEMBERS (many-to-many: users <-> teams)
CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_team TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 3. Add image fields to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
ALTER TABLE members ADD COLUMN IF NOT EXISTS banner_url TEXT DEFAULT '';

-- 4. Add team_id to interaction tables for team-scoped actions
ALTER TABLE user_saves ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);
ALTER TABLE artist_reactions ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);
ALTER TABLE artist_queue ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);

-- 5. RLS Policies for teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read teams they belong to
DROP POLICY IF EXISTS "Users can view their teams" ON teams;
CREATE POLICY "Users can view their teams" ON teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Allow authenticated users to view team members of their teams
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
CREATE POLICY "Users can view team members" ON team_members
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Service role (admin API) bypasses RLS, so admin can manage all teams
