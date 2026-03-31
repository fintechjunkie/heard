import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET — list members of a team
export async function GET(request: NextRequest) {
  const teamId = request.nextUrl.searchParams.get('teamId');
  if (!teamId) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });

  const supabase = getClient();
  const { data, error } = await supabase
    .from('team_members')
    .select('id, user_id, role_in_team, joined_at, profiles(full_name, email, role, tier, avatar_url)')
    .eq('team_id', parseInt(teamId))
    .order('joined_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const members = (data || []).map(tm => ({
    id: tm.id,
    user_id: tm.user_id,
    role_in_team: tm.role_in_team,
    joined_at: tm.joined_at,
    ...(tm.profiles as unknown as Record<string, unknown>),
  }));
  return NextResponse.json(members);
}

// POST — add a user to a team
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { team_id, user_id, role_in_team } = body;

  if (!team_id || !user_id) {
    return NextResponse.json({ error: 'Missing team_id or user_id' }, { status: 400 });
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from('team_members')
    .insert({
      team_id,
      user_id,
      role_in_team: role_in_team || 'member',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'User is already on this team' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// DELETE — remove a user from a team
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing membership id' }, { status: 400 });

  const supabase = getClient();
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', parseInt(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
