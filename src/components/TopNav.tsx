'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';

interface TopNavProps {
  onArtistMode: () => void;
  teamName?: string;
  onSwitchTeam?: () => void;
}

interface UserProfile {
  full_name: string;
  email: string;
  role: string;
  tier: string;
  company: string;
}

export default function TopNav({ onArtistMode, teamName, onSwitchTeam }: TopNavProps) {
  const { searchOpen, setSearchOpen, searchQuery, setSearchQuery, activeTab } = useStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, email, role, tier, company')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data);
      }
    }
    loadProfile();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    }
    if (showProfile) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showProfile]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <div className="flex-shrink-0 relative z-50" style={{ background: 'var(--black)' }}>
      {/* Main nav row */}
      <div className="flex items-center justify-between" style={{ padding: '14px 20px 14px' }}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#FFFFFF', letterSpacing: 4 }}>
            <span className="w-[6px] h-[6px] rounded-full animate-blink" style={{ background: 'var(--acid)' }} />
            HEARD
          </div>
          {teamName && (
            <button onClick={onSwitchTeam}
              className="text-[8px] tracking-[1px] uppercase px-2 py-[3px] rounded cursor-pointer border-none"
              style={{ fontFamily: "'DM Mono', monospace", background: 'var(--b3)', color: 'rgba(255,255,255,0.5)', border: '1px solid var(--b4)' }}>
              {teamName}
            </button>
          )}
        </div>
        <div className="flex items-center gap-[10px]">
          <span className="text-[8px] tracking-[1.5px] uppercase" style={{
            fontFamily: "'DM Mono', monospace",
            color: 'var(--acid)',
            border: '1px solid var(--acid)',
            padding: '3px 8px',
            borderRadius: 3,
          }}>{profile?.tier === 'tier2' ? 'T2' : 'T1'}</span>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[15px] cursor-pointer border-none"
            style={{ background: 'var(--b3)', color: 'rgba(255,255,255,0.55)' }}
          >
            ⌕
          </button>
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[10px] font-semibold cursor-pointer border-none"
              style={{ background: 'var(--acid)', color: 'var(--black)', fontFamily: "'DM Mono', monospace" }}
            >
              {initials}
            </button>

            {showProfile && (
              <div className="absolute right-0 top-[42px] w-[260px] rounded-xl overflow-hidden z-[100]"
                style={{ background: 'var(--b2)', border: '1px solid var(--b4)', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
                {/* Profile header */}
                <div className="p-4 border-b" style={{ borderColor: 'var(--b4)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0"
                      style={{ background: 'var(--acid)', color: 'var(--black)', fontFamily: "'DM Mono', monospace" }}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium truncate" style={{ color: '#FFFFFF', fontFamily: "'DM Sans', sans-serif" }}>
                        {profile?.full_name || 'Loading...'}
                      </div>
                      <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Mono', monospace" }}>
                        {profile?.email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile details */}
                <div className="p-4 space-y-2 border-b" style={{ borderColor: 'var(--b4)' }}>
                  <div className="flex justify-between">
                    <span className="text-[9px] uppercase tracking-[1px]" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Mono', monospace" }}>Role</span>
                    <span className="text-[11px]" style={{ color: '#FFFFFF', fontFamily: "'DM Sans', sans-serif" }}>
                      {profile?.role === 'manager' ? 'Artist Manager' : profile?.role === 'ar' ? 'A&R' : profile?.role === 'artist' ? 'Artist' : profile?.role || '—'}
                    </span>
                  </div>
                  {profile?.company && (
                    <div className="flex justify-between">
                      <span className="text-[9px] uppercase tracking-[1px]" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Mono', monospace" }}>Company</span>
                      <span className="text-[11px]" style={{ color: '#FFFFFF', fontFamily: "'DM Sans', sans-serif" }}>{profile.company}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[9px] uppercase tracking-[1px]" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Mono', monospace" }}>Tier</span>
                    <span className="text-[9px] px-2 py-[2px] rounded-full" style={{ background: 'rgba(200,255,69,0.15)', color: 'var(--acid)', fontFamily: "'DM Mono', monospace" }}>
                      {profile?.tier === 'tier1' ? 'Tier 1' : profile?.tier === 'tier2' ? 'Tier 2' : profile?.tier || '—'}
                    </span>
                  </div>
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-[10px] tracking-[1px] uppercase cursor-pointer border-none"
                  style={{ background: 'transparent', color: 'var(--coral)', fontFamily: "'DM Mono', monospace" }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="mx-5 mb-3 flex items-center gap-2 rounded-xl px-[14px] py-[9px]"
          style={{ background: 'var(--b3)', border: '1px solid var(--b4)' }}>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>⌕</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, writers, BPM, key…"
            className="bg-transparent border-none outline-none text-[14px] w-full"
            style={{ color: '#FFFFFF', fontFamily: "'DM Sans', sans-serif" }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[12px] cursor-pointer bg-transparent border-none" style={{ color: 'rgba(255,255,255,0.4)' }}>✕</button>
          )}
        </div>
      )}

      {/* Genre chips - only on bank tab */}
      {(activeTab === 'bank' || activeTab === 'saved' || activeTab === 'reserved' || activeTab === 'purchased') && (
        <GenreChips />
      )}
    </div>
  );
}

function GenreChips() {
  const { activeGenre, setActiveGenre } = useStore();
  const genres = [
    { key: 'all', label: 'All' },
    { key: 'new', label: '✦ New' },
    { key: 'Pop', label: 'Pop' },
    { key: 'R&B', label: 'R&B' },
    { key: 'Hip-Hop', label: 'Hip-Hop' },
    { key: 'Country', label: 'Country' },
    { key: 'Dance / EDM', label: 'EDM' },
  ];

  return (
    <div className="flex gap-[6px] overflow-x-auto scrollbar-hide flex-shrink-0 pb-3"
      style={{ padding: '0 20px 12px', background: 'var(--black)' }}>
      {genres.map(g => (
        <button
          key={g.key}
          onClick={() => setActiveGenre(g.key)}
          className={`flex-shrink-0 whitespace-nowrap px-[13px] py-[6px] rounded-full cursor-pointer transition-all duration-150 active:scale-[0.96] ${
            g.key === 'new' ? 'chip-new' : ''
          }`}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            border: activeGenre === g.key
              ? g.key === 'new' ? '1px solid var(--amber)' : '1px solid var(--acid)'
              : g.key === 'new' ? '1px solid rgba(255,184,48,0.4)' : '1px solid var(--b4)',
            background: activeGenre === g.key
              ? g.key === 'new' ? 'var(--amber)' : 'var(--acid)'
              : 'transparent',
            color: activeGenre === g.key
              ? 'var(--black)'
              : g.key === 'new' ? 'var(--amber)' : 'rgba(255,255,255,0.45)',
          }}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}
