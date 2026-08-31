-- ═══════════════════════════════════════════════
-- HEARD — Song play tracking
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ═══════════════════════════════════════════════

-- One row per time a track is started.
--
-- user_id is nullable on purpose: while the app runs on the shared demo
-- password there is no Supabase session, so the only identity available is the
-- email typed at the login screen. Both columns are recorded, so the data
-- keeps working if real per-user auth is turned back on.
CREATE TABLE IF NOT EXISTS song_plays (
  id BIGSERIAL PRIMARY KEY,
  song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS song_plays_email_idx ON song_plays (user_email);
CREATE INDEX IF NOT EXISTS song_plays_song_idx ON song_plays (song_id);

ALTER TABLE song_plays ENABLE ROW LEVEL SECURITY;

-- Writes and admin reads both go through the service role, which bypasses RLS.
DROP POLICY IF EXISTS "Service role full access to song_plays" ON song_plays;
CREATE POLICY "Service role full access to song_plays" ON song_plays
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
