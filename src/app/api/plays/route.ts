import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * POST — record that a track was started.
 *
 * Fire-and-forget from the player, so a failure here must never be loud: if
 * the song_plays table has not been created yet, playback still works and we
 * simply record nothing.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { songId, userEmail, userId } = body;

  if (!songId) {
    return NextResponse.json({ error: 'Missing songId' }, { status: 400 });
  }

  const supabase = getClient();
  const { error } = await supabase.from('song_plays').insert({
    song_id: songId,
    user_id: userId || null,
    user_email: userEmail || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

/**
 * GET — per-listener totals for the admin Users tab.
 *
 * Aggregated in JS rather than SQL: Supabase's client has no GROUP BY, and at
 * demo scale the row count is trivial. Revisit with an RPC or a view if this
 * ever holds real traffic.
 */
export async function GET() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('song_plays')
    .select('song_id, user_email, user_id');

  if (error) {
    // Most likely the migration has not been run. Report it without failing
    // the whole Users tab.
    return NextResponse.json({ available: false, reason: error.message, byEmail: {} });
  }

  const byEmail: Record<string, { plays: number; songs: number }> = {};
  const seen: Record<string, Set<number>> = {};

  for (const row of data || []) {
    const key = (row.user_email || '').toLowerCase();
    if (!key) continue;
    if (!byEmail[key]) {
      byEmail[key] = { plays: 0, songs: 0 };
      seen[key] = new Set();
    }
    byEmail[key].plays += 1;
    if (row.song_id != null) seen[key].add(row.song_id);
  }
  for (const key of Object.keys(byEmail)) {
    byEmail[key].songs = seen[key].size;
  }

  return NextResponse.json({ available: true, byEmail });
}
