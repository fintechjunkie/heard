'use client';

import { useStore } from '@/lib/store';

interface TopNavProps {
  onArtistMode: () => void;
}

export default function TopNav({ onArtistMode }: TopNavProps) {
  const { searchOpen, setSearchOpen, searchQuery, setSearchQuery, activeTab } = useStore();

  return (
    <div className="flex-shrink-0 relative z-50" style={{ background: 'var(--black)' }}>
      {/* Main nav row */}
      <div className="flex items-center justify-between" style={{ padding: '14px 20px 14px' }}>
        <div className="flex items-center gap-2" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--th-white)', letterSpacing: 4 }}>
          <span className="w-[6px] h-[6px] rounded-full animate-blink" style={{ background: 'var(--acid)' }} />
          THE HEARD
        </div>
        <div className="flex items-center gap-[10px]">
          <span className="text-[8px] tracking-[1.5px] uppercase" style={{
            fontFamily: "'DM Mono', monospace",
            color: 'var(--acid)',
            border: '1px solid var(--acid)',
            padding: '3px 8px',
            borderRadius: 3,
          }}>T1</span>
          <button
            onClick={onArtistMode}
            className="flex items-center gap-[6px] px-[10px] py-[5px] rounded-full cursor-pointer"
            style={{
              background: 'var(--b3)',
              border: '1px solid var(--b4)',
              fontFamily: "'DM Mono', monospace",
              fontSize: 8,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            <span className="w-[5px] h-[5px] rounded-full" style={{ background: 'var(--violet)' }} />
            Artist
          </button>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[15px] cursor-pointer border-none"
            style={{ background: 'var(--b3)', color: 'rgba(255,255,255,0.55)' }}
          >
            ⌕
          </button>
          <div
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[10px] font-semibold"
            style={{ background: 'var(--acid)', color: 'var(--black)', fontFamily: "'DM Mono', monospace" }}
          >
            MJ
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
            style={{ color: 'var(--th-white)', fontFamily: "'DM Sans', sans-serif" }}
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
