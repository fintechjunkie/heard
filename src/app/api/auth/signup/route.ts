import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password, fullName, role, company, bio } = body;

  if (!email || !password || !fullName) {
    return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
  }

  const supabase = getAdminClient();

  // Create the auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  if (!authData.user) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }

  // Upsert profile (in case trigger didn't fire)
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role: role || 'manager',
      company: company || '',
      bio: bio || '',
      status: 'pending',
      tier: 'tier1',
      applied_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (profileError) {
    return NextResponse.json({ error: 'Database error saving profile: ' + profileError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId: authData.user.id });
}
