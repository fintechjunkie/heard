-- Drop existing policies first, then recreate them
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view members" ON members;
DROP POLICY IF EXISTS "Service role full access to members" ON members;
DROP POLICY IF EXISTS "Anyone can view seasons" ON seasons;
DROP POLICY IF EXISTS "Service role full access to seasons" ON seasons;
DROP POLICY IF EXISTS "Approved users can view songs" ON songs;
DROP POLICY IF EXISTS "Service role full access to songs" ON songs;
DROP POLICY IF EXISTS "Users manage own saves" ON user_saves;
DROP POLICY IF EXISTS "Users manage own reactions" ON artist_reactions;
DROP POLICY IF EXISTS "Users manage own queue" ON artist_queue;

-- Recreate all policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role full access to profiles" ON profiles FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Anyone can view members" ON members FOR SELECT USING (true);
CREATE POLICY "Service role full access to members" ON members FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Anyone can view seasons" ON seasons FOR SELECT USING (true);
CREATE POLICY "Service role full access to seasons" ON seasons FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Approved users can view songs" ON songs FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Service role full access to songs" ON songs FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Users manage own saves" ON user_saves FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own reactions" ON artist_reactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own queue" ON artist_queue FOR ALL USING (auth.uid() = user_id);

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Seed data (skip if already exists)
INSERT INTO seasons (id, name, season_type, status, platform_take_pct)
VALUES (1, 'Season 1C', 'C', 'active', 18.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO members (id, name, initials, role, color, bio, streams, awards, hits, member_type, joined_at)
VALUES
  (1, 'Jody Lynn', 'JL', 'Songwriter', '#FFB830', '', '', '{}', '[]', 'founding', '2025-01-01T00:00:00Z'),
  (2, 'Esjay Jones', 'EJ', 'Songwriter', '#5AB4FF', '', '', '{}', '[]', 'founding', '2025-01-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO songs (id, title, writers, writer_ids, genre, bpm, key, mood, tier1_days_remaining, days_in_bank, audio_url, audio_duration_seconds, color, status, is_new, season_id, created_at)
VALUES
  (1, 'ASKING FOR A FRIEND', '{Jody Lynn,Esjay Jones}', '{1,2}', 'Pop', 120, 'C Major', '{}', 180, 0, 'https://ujin0c5kgzpfp573.public.blob.vercel-storage.com/audio/afaf-master.wav', 170, '#FFB830', 'available', TRUE, 1, '2026-03-31T01:56:55.665Z'),
  (2, 'BENZO', '{Jody Lynn,Esjay Jones}', '{1,2}', 'Pop', 120, 'C Major', '{}', 180, 0, 'https://ujin0c5kgzpfp573.public.blob.vercel-storage.com/audio/benzo-master.wav', 184, '#FFB830', 'available', TRUE, 1, '2026-03-31T01:57:00.000Z'),
  (3, 'ELECTRIC HEART', '{Jody Lynn,Esjay Jones}', '{1,2}', 'Dance / EDM', 120, 'C Major', '{}', 180, 0, 'https://ujin0c5kgzpfp573.public.blob.vercel-storage.com/audio/electric-heart-master.wav', 202, '#FFB830', 'available', TRUE, 1, '2026-03-31T01:57:05.000Z')
ON CONFLICT (id) DO NOTHING;

SELECT setval('members_id_seq', (SELECT MAX(id) FROM members));
SELECT setval('songs_id_seq', (SELECT MAX(id) FROM songs));
SELECT setval('seasons_id_seq', (SELECT MAX(id) FROM seasons));
