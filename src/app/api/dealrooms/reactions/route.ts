import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET — get all reactions for a deal room (with user names)
export async function GET(request: NextRequest) {
  const dealRoomId = request.nextUrl.searchParams.get('dealRoomId');
  if (!dealRoomId) return NextResponse.json({ error: 'Missing dealRoomId' }, { status: 400 });

  const supabase = getClient();
  const { data, error } = await supabase
    .from('deal_room_reactions')
    .select('id, user_id, reaction, updated_at, profiles(full_name, avatar_url)')
    .eq('deal_room_id', parseInt(dealRoomId))
    .order('updated_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reactions = (data || []).map(r => ({
    id: r.id,
    user_id: r.user_id,
    reaction: r.reaction,
    updated_at: r.updated_at,
    full_name: (r.profiles as unknown as Record<string, string>)?.full_name || 'Unknown',
    avatar_url: (r.profiles as unknown as Record<string, string>)?.avatar_url || '',
  }));

  return NextResponse.json(reactions);
}

// POST — upsert a reaction
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { dealRoomId, userId, reaction } = body;

  if (!dealRoomId || !userId || !reaction) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from('deal_room_reactions')
    .upsert(
      {
        deal_room_id: dealRoomId,
        user_id: userId,
        reaction,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'deal_room_id,user_id' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
