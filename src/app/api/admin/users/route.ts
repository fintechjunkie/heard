import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin API uses service role to bypass RLS
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET — list all profiles
export async function GET() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('applied_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// PATCH — update a user profile (approve, reject, change tier)
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { userId, updates } = body;

  if (!userId || !updates) {
    return NextResponse.json({ error: 'Missing userId or updates' }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
