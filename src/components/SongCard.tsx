'use client';

import { Song } from '@/data/types';
import { useStore } from '@/lib/store';
import { usePlayer } from '@/lib/player';
import Waveform from './Waveform';

interface SongCardProps {
  song: Song;
  index: number;
  onOpenDetail: (songId: number) => void;
  onOpenDealRoom: (songId: number) => void;
  onOpenShare: (songId: number) => void;
  onOpenRightsPassport: (songId: number) => void;
  onOpenProfile: (memberId: number) => void;
  onReserve: (songId: number) => void;
}

const REACTION_MAP: Record<string, { emoji: string; label: string }> = {
  musthave: { emoji: '🔥', label: 'Must Have' },
  hit: { emoji: '⚡', label: 'Definite Hit' },
  love: { emoji: '♥', label: 'Love It' },
  notsure: { emoji: '〰', label: 'Not Sure' },
  notforme: { emoji: '✕', label: 'Pass' },
};

export default function SongCard({
  song, index, onOpenDetail, onOpenDealRoom, onOpenShare,
  onOpenRightsPassport, onOpenProfile, onReserve,
}: SongCardProps) {
  const { savedSongIds, toggleSave, showToast, artistReactions } = useStore();
  const { activeSong, isPlaying } = usePlayer();
  const isSaved = savedSongIds.includes(song.id);
  const isActive = activeSong?.id === song.id && isPlaying;
  const isPlayingSong = activeSong?.id === song.id;

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSave(song.id);
    showToast(isSaved ? `"${song.title}" removed.` : `"${song.title}" saved.`);
  };

  const artistReaction = artistReactions[song.id] || song.artistReaction;
  const reactionData = artistReaction ? REACTION_MAP[artistReaction] : null;

  return (
    <div
      className={`relative cursor-pointer transition-colors duration-150 ${
        isPlayingSong ? 'border-l-[3px]' : 'border-l-[3px] border-l-transparent'
      }`}
      style={{
        background: isPlayingSong ? 'var(--black)' : 'var(--th-white)',
        borderLeftColor: isPlayingSong ? 'var(--acid)' : 'transparent',
        padding: '16px 16px 13px',
      }}
      onClick={() => onOpenDetail(song.id)}
    >
      {/* Status ribbons */}
      {song.status === 'reserved' && (
        <span className="absolute top-0 right-0 text-[7px] tracking-[2px] uppercase px-2 py-[3px] font-medium"
          style={{ fontFamily: "'DM Mono', monospace", background: 'var(--sky)', color: 'var(--black)' }}>
          Reserved
        </span>
      )}
      {song.status === 'purchased' && (
        <span className="absolute top-0 right-0 text-[7px] tracking-[2px] uppercase px-2 py-[3px] font-medium"
          style={{ fontFamily: "'DM Mono', monospace", background: 'var(--acid)', color: 'var(--black)' }}>
          Purchased
        </span>
      )}

      {/* Row 1: Number + Actions */}
      <div className="flex items-start justify-between mb-[2px]">
        <span className="text-[8px] tracking-[2px]"
          style={{
            fontFamily: "'DM Mono', monospace",
            color: isPlayingSong ? 'rgba(255,255,255,0.3)' : 'var(--muted-l)',
          }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex gap-[6px] items-center">
          <button onClick={handleSave} className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[12px] cursor-pointer transition-all duration-150 ${isSaved ? 'saved' : ''}`}
            style={{
              border: isSaved
                ? '1px solid var(--coral)'
                : isPlayingSong ? '1px solid var(--b4)' : '1px solid var(--border)',
              background: isSaved ? 'rgba(255,104,72,0.1)' : 'transparent',
              color: isSaved ? 'var(--coral)' : isPlayingSong ? 'rgba(255,255,255,0.4)' : 'var(--muted)',
            }}>
            {isSaved ? '♥' : '♡'}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onOpenDetail(song.id); }}
            title="Song Details"
            className="flex flex-col items-center gap-[2px] cursor-pointer bg-transparent border-none"
            style={{ color: isPlayingSong ? 'rgba(255,255,255,0.4)' : 'var(--muted)' }}>
            <span className="w-[26px] h-[26px] rounded-full flex items-center justify-center border"
              style={{ borderColor: isPlayingSong ? 'var(--b4)' : 'var(--border)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </span>
            <span className="text-[5px] tracking-[0.8px] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>Info</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onOpenDealRoom(song.id); }}
            title="Deal Room"
            className="flex flex-col items-center gap-[2px] cursor-pointer bg-transparent border-none"
            style={{ color: 'var(--sky)' }}>
            <span className="w-[26px] h-[26px] rounded-full flex items-center justify-center"
              style={{ border: '1px solid rgba(90,180,255,0.3)', background: 'rgba(90,180,255,0.06)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/>
              </svg>
            </span>
            <span className="text-[5px] tracking-[0.8px] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>Deals</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onOpenShare(song.id); }}
            title="Share"
            className="flex flex-col items-center gap-[2px] cursor-pointer bg-transparent border-none"
            style={{ color: isPlayingSong ? 'rgba(255,255,255,0.4)' : 'var(--muted)' }}>
            <span className="w-[26px] h-[26px] rounded-full flex items-center justify-center border"
              style={{ borderColor: isPlayingSong ? 'var(--b4)' : 'var(--border)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </span>
            <span className="text-[5px] tracking-[0.8px] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>Share</span>
          </button>
        </div>
      </div>

      {/* Row 2: Title + Price */}
      <div className="flex items-baseline justify-between gap-2 mb-[2px]">
        <span className="text-[26px] tracking-[1.5px] leading-none flex-1"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: isPlayingSong ? 'var(--th-white)' : 'var(--black)' }}>
          {song.title}
        </span>
        <span className="text-[18px] tracking-[1px] flex-shrink-0"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            color: song.status === 'purchased'
              ? 'var(--acid)'
              : isPlayingSong ? 'var(--th-white)' : 'var(--black)',
          }}>
          {song.status === 'purchased' ? '✓ Yours' : '$85K'}
        </span>
      </div>

      {/* Row 3: Writers */}
      <div className="flex flex-wrap gap-x-1 mb-[6px]">
        {song.writers.map((w, i) => {
          const memberId = song.writer_ids[i];
          return (
            <span key={i}>
              <button
                onClick={(e) => { e.stopPropagation(); if (memberId) onOpenProfile(memberId); }}
                className="text-[11px] cursor-pointer bg-transparent border-none underline"
                style={{ color: isPlayingSong ? 'rgba(255,255,255,0.55)' : '#5a5650' }}
              >
                {w}
              </button>
              {i < song.writers.length - 1 && (
                <span style={{ color: isPlayingSong ? 'rgba(255,255,255,0.3)' : '#8C8778', fontSize: 11 }}> · </span>
              )}
            </span>
          );
        })}
      </div>

      {/* Row 4: Waveform */}
      <div className="mb-[8px]">
        <Waveform
          song={song}
          barCount={44}
          fillColor={isPlayingSong ? 'var(--acid)' : 'var(--sky)'}
          baseColor={isPlayingSong ? 'rgba(255,255,255,0.2)' : 'rgba(140,135,120,0.25)'}
          height={32}
        />
      </div>

      {/* Row 5: Tags */}
      <div className="flex items-center gap-[5px] flex-wrap mb-[6px]">
        <span className="px-[8px] py-[2px] rounded-full text-[8px] tracking-[1px] uppercase"
          style={{
            fontFamily: "'DM Mono', monospace",
            background: isPlayingSong ? 'var(--b3)' : 'var(--black)',
            color: isPlayingSong ? 'rgba(255,255,255,0.7)' : 'var(--th-white)',
          }}>
          {song.genre}
        </span>
        {song.days_in_bank <= 30 && song.status !== 'purchased' && (
          <span className="px-[8px] py-[2px] rounded-full text-[8px] tracking-[1px] uppercase animate-tag-pulse"
            style={{
              fontFamily: "'DM Mono', monospace",
              background: 'rgba(255,184,48,0.15)',
              color: 'var(--amber)',
              border: '1px solid rgba(255,184,48,0.3)',
            }}>
            ✦ New
          </span>
        )}
        {song.mood.map(m => (
          <span key={m} className="px-[6px] py-[2px] rounded-full text-[7px] tracking-[0.5px]"
            style={{
              fontFamily: "'DM Mono', monospace",
              background: 'rgba(181,123,255,0.08)',
              color: isPlayingSong ? 'rgba(181,123,255,0.8)' : 'rgba(181,123,255,0.7)',
              border: '1px solid rgba(181,123,255,0.15)',
            }}>
            {m}
          </span>
        ))}
        <button
          onClick={(e) => { e.stopPropagation(); onOpenRightsPassport(song.id); }}
          className="ml-auto px-[8px] py-[2px] rounded-full text-[7px] tracking-[1px] uppercase cursor-pointer border-none"
          style={{
            fontFamily: "'DM Mono', monospace",
            background: 'rgba(42,122,42,0.1)',
            color: '#2a7a2a',
            border: '1px solid rgba(42,122,42,0.2)',
          }}>
          ✓ Cleared
        </button>
      </div>

      {/* Row 6: Window strip */}
      <div className="flex items-center gap-[6px] text-[9px]"
        style={{ color: isPlayingSong ? 'rgba(255,255,255,0.4)' : '#6a6660' }}>
        {song.status === 'purchased' ? (
          <span style={{ color: '#2a7a2a' }}>Rights Transferred · Closed</span>
        ) : (
          <>
            <span className="w-[5px] h-[5px] rounded-full animate-blink" style={{ background: 'var(--acid)' }} />
            <span>Tier 1 Closes</span>
            <span style={{ color: song.tier1_days_remaining <= 14 ? 'var(--coral)' : 'inherit', fontWeight: song.tier1_days_remaining <= 14 ? 600 : 400 }}>
              {song.tier1_days_remaining}d
            </span>
          </>
        )}
      </div>

      {/* Row 7: Artist flag (conditional) */}
      {(song.artistFlagged || reactionData) && (
        <div className="flex items-center gap-[6px] mt-[6px] px-[8px] py-[5px] rounded-lg"
          style={{
            background: 'rgba(181,123,255,0.06)',
            border: '1px solid rgba(181,123,255,0.2)',
          }}>
          <span className="w-[5px] h-[5px] rounded-full animate-blink" style={{ background: 'var(--violet)' }} />
          <span className="text-[9px]" style={{ color: 'rgba(181,123,255,0.9)', fontFamily: "'DM Mono', monospace" }}>
            {reactionData
              ? `${reactionData.emoji} Artist: ${reactionData.label} · ${song.artistFlagTime || 'Just now'}`
              : `♥ Flagged · ${song.artistFlagTime || 'Just now'}`}
          </span>
        </div>
      )}
    </div>
  );
}
