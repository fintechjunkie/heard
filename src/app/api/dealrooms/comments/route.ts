import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET — get all comments for a deal room (with user names)
export async function GET(request: NextRequest) {
  const dealRoomId = request.nextUrl.searchParams.get('dealRoomId');

  // Admin mode: get all comments needing admin response
  if (!dealRoomId) {
    const adminOnly = request.nextUrl.searchParams.get('adminOnly');
    if (adminOnly === 'true') {
      const supabase = getClient();
      const { data, error } = await supabase
        .from('deal_room_comments')
        .select('id, deal_room_id, user_id, is_admin_question, is_admin_response, content, created_at, profiles(full_name), deal_rooms(song_id, team_id, songs(title), teams(name))')
        .eq('is_admin_question', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data || []);
    }
    return NextResponse.json({ error: 'Missing dealRoomId' }, { status: 400 });
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from('deal_room_comments')
    .select('id, deal_room_id, user_id, is_admin_response, is_admin_question, content, created_at, profiles(full_name, avatar_url)')
    .eq('deal_room_id', parseInt(dealRoomId))
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const comments = (data || []).map(c => ({
    id: c.id,
    deal_room_id: c.deal_room_id,
    user_id: c.user_id,
    is_admin_response: c.is_admin_response,
    is_admin_question: c.is_admin_question,
    content: c.content,
    created_at: c.created_at,
    full_name: (c.profiles as unknown as Record<string, string>)?.full_name || (c.is_admin_response ? 'Heard Admin' : 'Unknown'),
    avatar_url: (c.profiles as unknown as Record<string, string>)?.avatar_url || '',
  }));

  return NextResponse.json(comments);
}

// POST — add a comment
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { dealRoomId, userId, content, isAdminResponse, isAdminQuestion } = body;

  if (!dealRoomId || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from('deal_room_comments')
    .insert({
      deal_room_id: dealRoomId,
      user_id: userId || null,
      content,
      is_admin_response: isAdminResponse || false,
      is_admin_question: isAdminQuestion || false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
