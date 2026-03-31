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

  // Try admin.createUser first, fall back to signUp
  let userId: string;

  const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (adminError) {
    // Fall back to regular signUp (works with newer sb_secret_ keys)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (signUpError) {
      return NextResponse.json({ error: '[signUp] ' + signUpError.message + ' | [admin] ' + adminError.message }, { status: 400 });
    }

    if (!signUpData.user) {
      return NextResponse.json({ error: '[signUp] No user returned. Admin error was: ' + adminError.message }, { status: 500 });
    }

    userId = signUpData.user.id;
  } else {
    if (!adminData.user) {
      return NextResponse.json({ error: '[admin] No user returned' }, { status: 500 });
    }
    userId = adminData.user.id;
  }

  // Upsert profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
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
    return NextResponse.json({ error: 'Profile creation failed: ' + profileError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId });
}
