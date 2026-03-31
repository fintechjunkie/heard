import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET — list all members
export async function GET() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data || []);
}

// POST — create a member
export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = getClient();

  const { data, error } = await supabase
    .from('members')
    .insert({
      name: body.name,
      initials: body.initials || body.name.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
      role: body.role || 'Songwriter',
      color: body.color || '#FFB830',
      bio: body.bio || '',
      streams: body.streams || '',
      awards: body.awards || [],
      hits: body.hits || [],
      member_type: body.member_type || 'general',
      avatar_url: body.avatar_url || '',
      banner_url: body.banner_url || '',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// PUT — update a member
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing member id' }, { status: 400 });
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// DELETE — delete a member
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing member id' }, { status: 400 });
  }

  const supabase = getClient();
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', parseInt(id));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
