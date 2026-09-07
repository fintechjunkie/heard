-- ═══════════════════════════════════════════════
-- HEARD — Song analysis storage (spec §5)
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ═══════════════════════════════════════════════

-- The full analysis object, exactly as the DSP pipeline emits it, minus the
-- _promoted block (which the importer strips and writes to the columns below).
ALTER TABLE songs ADD COLUMN IF NOT EXISTS analysis JSONB;

-- Promoted columns. These exist for filtering and range queries, which are
-- impossible against JSONB paths at any reasonable speed.
ALTER TABLE songs ADD COLUMN IF NOT EXISTS analysis_status TEXT
  DEFAULT 'pending'
  CHECK (analysis_status IN ('pending', 'running', 'complete', 'failed', 'approved'));
ALTER TABLE songs ADD COLUMN IF NOT EXISTS tempo_bpm INTEGER;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS key_display TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS time_to_hook_sec NUMERIC(7,2);

-- Vocal range as MIDI note numbers, not note names: the point of these columns
-- is "does this topline fit inside my artist's range", which is a numeric
-- BETWEEN and cannot be expressed against strings.
ALTER TABLE songs ADD COLUMN IF NOT EXISTS vocal_range_low_midi INTEGER;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS vocal_range_high_midi INTEGER;

-- §11: added now so populating it later is not a migration.
-- JSONB rather than a pgvector column so this does not depend on the
-- extension being enabled; switch to vector(512) when similarity search is
-- actually built.
ALTER TABLE songs ADD COLUMN IF NOT EXISTS clap_embedding JSONB;

-- Buyer-facing queries filter on approved status plus range; admin lists sort
-- by status.
CREATE INDEX IF NOT EXISTS songs_analysis_status_idx ON songs (analysis_status);
CREATE INDEX IF NOT EXISTS songs_vocal_range_idx
  ON songs (vocal_range_low_midi, vocal_range_high_midi);

-- Existing rows predate analysis entirely.
UPDATE songs SET analysis_status = 'pending' WHERE analysis_status IS NULL;
