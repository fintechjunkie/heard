-- ═══════════════════════════════════════════════
-- HEARD — Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ═══════════════════════════════════════════════

-- 1. PROFILES — extends Supabase auth.users with app-specific fields
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'artist', 'manager', 'ar', 'label_admin', 'admin')),
  tier TEXT NOT NULL DEFAULT 'tier2' CHECK (tier IN ('tier1', 'tier2')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  company TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MEMBERS — the songwriter/producer collective
CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  initials TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'Songwriter',
  color TEXT NOT NULL DEFAULT '#FFB830',
  bio TEXT DEFAULT '',
  streams TEXT DEFAULT '',
  awards TEXT[] DEFAULT '{}',
  hits JSONB DEFAULT '[]',
  member_type TEXT NOT NULL DEFAULT 'general' CHECK (member_type IN ('founding', 'general')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SEASONS
CREATE TABLE IF NOT EXISTS seasons (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  season_type TEXT NOT NULL DEFAULT 'C' CHECK (season_type IN ('C', 'P')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  platform_take_pct NUMERIC(5,2) DEFAULT 18.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SONGS
CREATE TABLE IF NOT EXISTS songs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  writers TEXT[] DEFAULT '{}',
  writer_ids INTEGER[] DEFAULT '{}',
  genre TEXT NOT NULL DEFAULT 'Pop',
  bpm INTEGER DEFAULT 120,
  key TEXT DEFAULT 'C Major',
  mood TEXT[] DEFAULT '{}',
  tier1_days_remaining INTEGER DEFAULT 180,
  days_in_bank INTEGER DEFAULT 0,
  audio_url TEXT DEFAULT '',
  audio_duration_seconds INTEGER DEFAULT 0,
  color TEXT DEFAULT '#FFB830',
  gradient TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'purchased')),
  reserved_by UUID REFERENCES auth.users(id),
  reserved_until TIMESTAMPTZ,
  purchased_by UUID REFERENCES auth.users(id),
  purchased_at TIMESTAMPTZ,
  credit_type TEXT DEFAULT 'fixed' CHECK (credit_type IN ('fixed', 'open')),
  is_new BOOLEAN DEFAULT TRUE,
  season_id INTEGER REFERENCES seasons(id),
  artist_flagged BOOLEAN DEFAULT FALSE,
  artist_flag_time TEXT,
  artist_reaction TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. USER_SAVES — which songs a user has saved
CREATE TABLE IF NOT EXISTS user_saves (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, song_id)
);

-- 6. ARTIST_REACTIONS — artist reactions to songs
CREATE TABLE IF NOT EXISTS artist_reactions (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('musthave', 'hit', 'love', 'notsure', 'notforme')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, song_id)
);

-- 7. ARTIST_QUEUE — songs queued for artist mode
CREATE TABLE IF NOT EXISTS artist_queue (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, song_id)
);

-- ═══════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_queue ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own, admins can read all
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role full access to profiles" ON profiles FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Members: everyone can read (public data)
CREATE POLICY "Anyone can view members" ON members FOR SELECT USING (true);
CREATE POLICY "Service role full access to members" ON members FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Seasons: everyone can read
CREATE POLICY "Anyone can view seasons" ON seasons FOR SELECT USING (true);
CREATE POLICY "Service role full access to seasons" ON seasons FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Songs: approved users can read non-deleted songs
CREATE POLICY "Approved users can view songs" ON songs FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Service role full access to songs" ON songs FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- User saves: users manage their own
CREATE POLICY "Users manage own saves" ON user_saves FOR ALL USING (auth.uid() = user_id);

-- Artist reactions: users manage their own
CREATE POLICY "Users manage own reactions" ON artist_reactions FOR ALL USING (auth.uid() = user_id);

-- Artist queue: users manage their own
CREATE POLICY "Users manage own queue" ON artist_queue FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════
-- AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ═══════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════

-- Default season
INSERT INTO seasons (id, name, season_type, status, platform_take_pct)
VALUES (1, 'Season 1C', 'C', 'active', 18.00)
ON CONFLICT (id) DO NOTHING;

-- Members
INSERT INTO members (id, name, initials, role, color, bio, streams, awards, hits, member_type, joined_at)
VALUES
  (1, 'Jody Lynn', 'JL', 'Songwriter', '#FFB830', '', '', '{}', '[]', 'founding', '2025-01-01T00:00:00Z'),
  (2, 'Esjay Jones', 'EJ', 'Songwriter', '#5AB4FF', '', '', '{}', '[]', 'founding', '2025-01-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- Songs
INSERT INTO songs (id, title, writers, writer_ids, genre, bpm, key, mood, tier1_days_remaining, days_in_bank, audio_url, audio_duration_seconds, color, status, is_new, season_id, created_at)
VALUES
  (1, 'ASKING FOR A FRIEND', '{Jody Lynn,Esjay Jones}', '{1,2}', 'Pop', 120, 'C Major', '{}', 180, 0, 'https://ujin0c5kgzpfp573.public.blob.vercel-storage.com/audio/afaf-master.wav', 170, '#FFB830', 'available', TRUE, 1, '2026-03-31T01:56:55.665Z'),
  (2, 'BENZO', '{Jody Lynn,Esjay Jones}', '{1,2}', 'Pop', 120, 'C Major', '{}', 180, 0, 'https://ujin0c5kgzpfp573.public.blob.vercel-storage.com/audio/benzo-master.wav', 184, '#FFB830', 'available', TRUE, 1, '2026-03-31T01:57:00.000Z'),
  (3, 'ELECTRIC HEART', '{Jody Lynn,Esjay Jones}', '{1,2}', 'Dance / EDM', 120, 'C Major', '{}', 180, 0, 'https://ujin0c5kgzpfp573.public.blob.vercel-storage.com/audio/electric-heart-master.wav', 202, '#FFB830', 'available', TRUE, 1, '2026-03-31T01:57:05.000Z')
ON CONFLICT (id) DO NOTHING;

-- Reset sequences
SELECT setval('members_id_seq', (SELECT MAX(id) FROM members));
SELECT setval('songs_id_seq', (SELECT MAX(id) FROM songs));
SELECT setval('seasons_id_seq', (SELECT MAX(id) FROM seasons));
