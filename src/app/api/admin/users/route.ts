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

/**
 * PUT — set a user's password.
 *
 * Note there is deliberately no "read password" counterpart: Supabase stores
 * only a bcrypt hash of the password, so the original text cannot be retrieved
 * by this API, by a SQL query, or by anyone. Setting a new one is the only
 * possible operation.
 */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { userId, password } = body;

  if (!userId || !password) {
    return NextResponse.json({ error: 'Missing userId or password' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, { password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

/**
 * POST — create a user directly, without the apply/approve flow.
 *
 * Unlike /api/auth/signup this lands the account approved and with the role
 * and tier the admin chose, so a manually added person can sign in at once.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password, fullName, role, tier, company, bio } = body;

  if (!email || !password || !fullName) {
    return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const supabase = getAdminClient();
  let userId: string;

  const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (adminError) {
    // A duplicate email must not fall through to signUp: for an existing
    // address signUp returns an obfuscated placeholder user whose id is not in
    // auth.users, and upserting a profile against it fails on the foreign key
    // with a message that explains nothing.
    const reason = adminError.message.toLowerCase();
    if (reason.includes('already') || reason.includes('registered') || reason.includes('exists')) {
      return NextResponse.json(
        { error: `${email} already has an account` },
        { status: 409 }
      );
    }

    // Some newer service keys reject the admin endpoint; fall back to signUp,
    // matching what /api/auth/signup does.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }
    if (!signUpData.user) {
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
    }
    // Supabase signals "this email already exists" by returning a user with an
    // empty identities array rather than an error.
    if (signUpData.user.identities && signUpData.user.identities.length === 0) {
      return NextResponse.json(
        { error: `${email} already has an account` },
        { status: 409 }
      );
    }
    userId = signUpData.user.id;
  } else {
    if (!adminData.user) {
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
    }
    userId = adminData.user.id;
  }

  // A signup trigger may already have inserted a bare profile row, so upsert.
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email,
      full_name: fullName,
      role: role || 'manager',
      tier: tier || 'tier1',
      status: 'approved',
      company: company || '',
      bio: bio || '',
      applied_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Profile creation failed: ' + error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
