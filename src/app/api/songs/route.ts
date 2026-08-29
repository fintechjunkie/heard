import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Columns that actually exist on the songs table.
 *
 * The client-side Song type carries extra camelCase fields (artistFlagged,
 * artistFlagTime, artistReaction) that are derived, not stored. Passing a whole
 * Song object to Supabase made it reject the write with "Could not find the
 * 'artistFlagTime' column" — which the admin UI swallowed, so edits silently
 * did nothing. Filter here so no caller can reintroduce that.
 */
const SONG_COLUMNS = [
  'title',
  'writers',
  'writer_ids',
  'genre',
  'bpm',
  'key',
  'mood',
  'tier1_days_remaining',
  'days_in_bank',
  'audio_url',
  'audio_duration_seconds',
  'color',
  'gradient',
  'status',
  'reserved_by',
  'reserved_until',
  'purchased_by',
  'purchased_at',
  'credit_type',
  'is_new',
  'season_id',
  'artist_flagged',
  'artist_flag_time',
  'artist_reaction',
  'legal_doc_url',
  'deleted_at',
] as const;

function pickSongColumns(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const col of SONG_COLUMNS) {
    if (col in body) out[col] = body[col];
  }
  return out;
}

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET — list all songs
export async function GET() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map DB fields to frontend Song type
  const songs = (data || []).map(s => ({
    ...s,
    artist_flagged: false,
    artistFlagged: false,
    artistFlagTime: null,
    artistReaction: null,
    writer_ids: s.writer_ids || [],
    writers: s.writers || [],
    mood: s.mood || [],
    reserved_by: s.reserved_by || null,
    reserved_until: s.reserved_until || null,
    purchased_by: s.purchased_by || null,
    purchased_at: s.purchased_at || null,
  }));

  return NextResponse.json(songs);
}

// POST — create a song
export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = getClient();

  const { data, error } = await supabase
    .from('songs')
    .insert({
      title: body.title,
      writers: body.writers || [],
      writer_ids: body.writer_ids || [],
      genre: body.genre || 'Pop',
      bpm: body.bpm || 120,
      key: body.key || 'C Major',
      mood: body.mood || [],
      tier1_days_remaining: body.tier1_days_remaining || 180,
      days_in_bank: body.days_in_bank || 0,
      audio_url: body.audio_url || '',
      audio_duration_seconds: body.audio_duration_seconds || 0,
      color: body.color || '#FFB830',
      gradient: body.gradient || '',
      status: body.status || 'available',
      credit_type: body.credit_type || 'fixed',
      is_new: body.is_new !== false,
      season_id: body.season_id || 1,
      legal_doc_url: body.legal_doc_url || '',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// PUT — update a song
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing song id' }, { status: 400 });
  }

  const updates = pickSongColumns(body);
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }
  updates.updated_at = new Date().toISOString();

  const supabase = getClient();
  const { data, error } = await supabase
    .from('songs')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // maybeSingle rather than single: a missing row is a 404, not a 500 with
  // PostgREST's "cannot coerce the result to a single JSON object".
  if (!data) {
    return NextResponse.json({ error: `No song with id ${id}` }, { status: 404 });
  }
  return NextResponse.json(data);
}

// DELETE — delete a song
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing song id' }, { status: 400 });
  }

  const supabase = getClient();
  const { error } = await supabase
    .from('songs')
    .delete()
    .eq('id', parseInt(id));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
