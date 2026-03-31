'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login')) {
        setError('Invalid email or password.');
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      // Check if user is approved
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', user.id)
          .single();

        if (profile?.status === 'pending') {
          await supabase.auth.signOut();
          setError('Your application is pending approval. You\'ll receive access once approved.');
          setLoading(false);
          return;
        }
        if (profile?.status === 'rejected') {
          await supabase.auth.signOut();
          setError('Your application was not approved.');
          setLoading(false);
          return;
        }
      }
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center dark-form" style={{ background: 'var(--black)' }}>
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-[48px] tracking-[12px] mb-2"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              color: '#ffffff',
              textShadow: '0 0 20px rgba(200,255,69,0.3)',
            }}>
            HEARD
          </div>
          <div className="w-[6px] h-[6px] rounded-full mx-auto mb-3 animate-blink" style={{ background: 'var(--acid)' }} />
          <p className="text-[10px] tracking-[2px] uppercase"
            style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.4)' }}>
            Private Song Marketplace
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full px-4 py-3 rounded-lg text-[13px] outline-none"
            style={{
              background: 'var(--b3)',
              border: '1px solid var(--b4)',
              color: 'var(--th-white)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full px-4 py-3 rounded-lg text-[13px] outline-none"
            style={{
              background: 'var(--b3)',
              border: '1px solid var(--b4)',
              color: 'var(--th-white)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          />

          {error && (
            <div className="text-[11px] px-3 py-2 rounded-lg"
              style={{ background: 'rgba(255,104,72,0.1)', border: '1px solid rgba(255,104,72,0.3)', color: 'var(--coral)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-[11px] tracking-[2px] uppercase cursor-pointer border-none mt-2"
            style={{
              fontFamily: "'DM Mono', monospace",
              background: 'var(--acid)',
              color: 'var(--black)',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Apply link */}
        <div className="text-center mt-6">
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Mono', monospace" }}>
            Don&apos;t have access?
          </p>
          <a href="/apply" className="text-[10px] tracking-[1px] uppercase mt-1 inline-block"
            style={{ color: 'var(--violet)', fontFamily: "'DM Mono', monospace", textDecoration: 'none' }}>
            Apply for an invitation
          </a>
        </div>
      </div>
    </div>
  );
}
