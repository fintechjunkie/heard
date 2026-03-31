'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ApplyPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'manager',
    company: '',
    bio: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    // Create the auth user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Update the profile with additional info
    if (data.user) {
      await supabase
        .from('profiles')
        .update({
          full_name: form.fullName,
          role: form.role,
          company: form.company,
          bio: form.bio,
          status: 'pending',
        })
        .eq('id', data.user.id);

      // Sign out — they can't access until approved
      await supabase.auth.signOut();
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--black)' }}>
        <div className="w-full max-w-sm px-6 text-center">
          <div className="text-[48px] tracking-[12px] mb-4"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#ffffff', textShadow: '0 0 20px rgba(200,255,69,0.3)' }}>
            HEARD
          </div>
          <div className="text-[20px] tracking-[3px] mb-3"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'var(--acid)' }}>
            Application Received
          </div>
          <p className="text-[11px] leading-relaxed mb-6"
            style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.5)' }}>
            Thank you, {form.fullName}. Your application is under review.
            You&apos;ll receive access once approved by our team.
          </p>
          <a href="/login" className="text-[10px] tracking-[1px] uppercase"
            style={{ color: 'var(--violet)', fontFamily: "'DM Mono', monospace", textDecoration: 'none' }}>
            ← Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--black)' }}>
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-[48px] tracking-[12px] mb-2"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#ffffff', textShadow: '0 0 20px rgba(200,255,69,0.3)' }}>
            HEARD
          </div>
          <p className="text-[10px] tracking-[2px] uppercase"
            style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.4)' }}>
            Apply for Access
          </p>
        </div>

        <form onSubmit={handleApply} className="flex flex-col gap-3">
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Full Name"
            required
            className="w-full px-4 py-3 rounded-lg text-[13px] outline-none"
            style={{ background: 'var(--b3)', border: '1px solid var(--b4)', color: 'var(--th-white)', fontFamily: "'DM Sans', sans-serif" }}
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
            required
            className="w-full px-4 py-3 rounded-lg text-[13px] outline-none"
            style={{ background: 'var(--b3)', border: '1px solid var(--b4)', color: 'var(--th-white)', fontFamily: "'DM Sans', sans-serif" }}
          />
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Create Password (min 6 characters)"
            required
            className="w-full px-4 py-3 rounded-lg text-[13px] outline-none"
            style={{ background: 'var(--b3)', border: '1px solid var(--b4)', color: 'var(--th-white)', fontFamily: "'DM Sans', sans-serif" }}
          />

          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full px-4 py-3 rounded-lg text-[13px] outline-none"
            style={{ background: 'var(--b3)', border: '1px solid var(--b4)', color: 'var(--th-white)', fontFamily: "'DM Sans', sans-serif" }}
          >
            <option value="manager">Artist Manager</option>
            <option value="ar">A&R Representative</option>
            <option value="artist">Artist</option>
            <option value="label_admin">Label Admin</option>
          </select>

          <input
            type="text"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            placeholder="Company / Label (optional)"
            className="w-full px-4 py-3 rounded-lg text-[13px] outline-none"
            style={{ background: 'var(--b3)', border: '1px solid var(--b4)', color: 'var(--th-white)', fontFamily: "'DM Sans', sans-serif" }}
          />

          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Tell us briefly why you're interested (optional)"
            rows={3}
            className="w-full px-4 py-3 rounded-lg text-[13px] outline-none resize-none"
            style={{ background: 'var(--b3)', border: '1px solid var(--b4)', color: 'var(--th-white)', fontFamily: "'DM Sans', sans-serif" }}
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
            style={{ fontFamily: "'DM Mono', monospace", background: 'var(--violet)', color: '#fff', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>

        <div className="text-center mt-5">
          <a href="/login" className="text-[10px] tracking-[1px] uppercase"
            style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Mono', monospace", textDecoration: 'none' }}>
            ← Already have access? Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
