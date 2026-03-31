import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET — get deal room for a song+team
export async function GET(request: NextRequest) {
  const songId = request.nextUrl.searchParams.get('songId');
  const teamId = request.nextUrl.searchParams.get('teamId');

  if (!songId || !teamId) {
    return NextResponse.json({ error: 'Missing songId or teamId' }, { status: 400 });
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from('deal_rooms')
    .select('*')
    .eq('song_id', parseInt(songId))
    .eq('team_id', parseInt(teamId))
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data); // null if not found
}

// POST — create a deal room
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { songId, teamId, createdBy } = body;

  if (!songId || !teamId) {
    return NextResponse.json({ error: 'Missing songId or teamId' }, { status: 400 });
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from('deal_rooms')
    .insert({
      song_id: songId,
      team_id: teamId,
      created_by: createdBy || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // Already exists, return existing
      const { data: existing } = await supabase
        .from('deal_rooms')
        .select('*')
        .eq('song_id', songId)
        .eq('team_id', teamId)
        .single();
      return NextResponse.json(existing);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// PUT — update deal room status
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, status } = body;

  if (!id) return NextResponse.json({ error: 'Missing deal room id' }, { status: 400 });

  const supabase = getClient();
  const { data, error } = await supabase
    .from('deal_rooms')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
