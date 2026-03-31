import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET — list all teams (admin) or user's teams
export async function GET(request: NextRequest) {
  const supabase = getClient();
  const userId = request.nextUrl.searchParams.get('userId');

  if (userId) {
    // Get teams for a specific user
    const { data, error } = await supabase
      .from('team_members')
      .select('team_id, role_in_team, teams(id, name, description, created_at)')
      .eq('user_id', userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const teams = (data || []).map(tm => ({
      ...(tm.teams as unknown as Record<string, unknown>),
      role_in_team: tm.role_in_team,
    }));
    return NextResponse.json(teams);
  }

  // Admin: get all teams with member counts
  const { data, error } = await supabase
    .from('teams')
    .select('*, team_members(count)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const teams = (data || []).map(t => ({
    ...t,
    member_count: t.team_members?.[0]?.count || 0,
  }));
  return NextResponse.json(teams);
}

// POST — create a team
export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = getClient();

  const { data, error } = await supabase
    .from('teams')
    .insert({
      name: body.name,
      description: body.description || '',
      created_by: body.created_by || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PUT — update a team
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: 'Missing team id' }, { status: 400 });

  const supabase = getClient();
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — delete a team
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing team id' }, { status: 400 });

  const supabase = getClient();
  const { error } = await supabase.from('teams').delete().eq('id', parseInt(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
