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
        .select('id, deal_room_id, user_id, is_admin_question, is_admin_response, content, created_at')
        .eq('is_admin_question', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Enrich with profile names and deal room info
      const userIds = [...new Set((data || []).map(c => c.user_id).filter(Boolean))];
      const dealRoomIds = [...new Set((data || []).map(c => c.deal_room_id).filter(Boolean))];

      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
        if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name || 'Unknown']));
      }

      let dealRoomMap: Record<number, { song_title: string; team_name: string }> = {};
      if (dealRoomIds.length > 0) {
        const { data: rooms } = await supabase.from('deal_rooms').select('id, song_id, team_id').in('id', dealRoomIds);
        if (rooms) {
          const songIds = [...new Set(rooms.map(r => r.song_id))];
          const teamIds = [...new Set(rooms.map(r => r.team_id))];
          const [songsRes, teamsRes] = await Promise.all([
            supabase.from('songs').select('id, title').in('id', songIds),
            supabase.from('teams').select('id, name').in('id', teamIds),
          ]);
          const songMap = Object.fromEntries((songsRes.data || []).map(s => [s.id, s.title]));
          const teamMap = Object.fromEntries((teamsRes.data || []).map(t => [t.id, t.name]));
          for (const r of rooms) {
            dealRoomMap[r.id] = { song_title: songMap[r.song_id] || '?', team_name: teamMap[r.team_id] || '?' };
          }
        }
      }

      const enriched = (data || []).map(c => ({
        ...c,
        profiles: { full_name: c.user_id ? (profileMap[c.user_id] || 'Unknown') : 'Unknown' },
        deal_rooms: { songs: { title: dealRoomMap[c.deal_room_id]?.song_title || '?' }, teams: { name: dealRoomMap[c.deal_room_id]?.team_name || '?' } },
      }));

      return NextResponse.json(enriched);
    }
    return NextResponse.json({ error: 'Missing dealRoomId' }, { status: 400 });
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from('deal_room_comments')
    .select('id, deal_room_id, user_id, is_admin_response, is_admin_question, content, created_at')
    .eq('deal_room_id', parseInt(dealRoomId))
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Look up profile names separately
  const userIds = [...new Set((data || []).map(c => c.user_id).filter(Boolean))];
  let profileMap: Record<string, { full_name: string; avatar_url: string }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);
    if (profiles) {
      profileMap = Object.fromEntries(profiles.map(p => [p.id, { full_name: p.full_name || 'Unknown', avatar_url: p.avatar_url || '' }]));
    }
  }

  const comments = (data || []).map(c => ({
    id: c.id,
    deal_room_id: c.deal_room_id,
    user_id: c.user_id,
    is_admin_response: c.is_admin_response,
    is_admin_question: c.is_admin_question,
    content: c.content,
    created_at: c.created_at,
    full_name: c.is_admin_response ? 'Heard Admin' : (c.user_id && profileMap[c.user_id]?.full_name) || 'Unknown',
    avatar_url: (c.user_id && profileMap[c.user_id]?.avatar_url) || '',
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
