'use client';

import { Song } from '@/data/types';
import { useStore } from '@/lib/store';
import { FEATURES } from '@/lib/features';
import { usePlayer } from '@/lib/player';
import Waveform from './Waveform';

interface SongCardProps {
  song: Song;
  index: number;
  /** Give the list a visual anchor when no track is playing yet. */
  highlighted?: boolean;
  onOpenDetail: (songId: number) => void;
  onOpenDealRoom: (songId: number) => void;
  onOpenRightsPassport: (songId: number) => void;
  onOpenProfile: (memberId: number) => void;
  onReserve: (songId: number) => void;
}

// Each row action carries its own accent so the three read as distinct
// choices at a glance rather than three identical grey buttons.
const ACTION_VIOLET = '#B57BFF';
const ACTION_SKY = '#5AB4FF';
const ACTION_CORAL = '#FF6848';

const REACTION_MAP: Record<string, { emoji: string; label: string }> = {
  musthave: { emoji: '🔥', label: 'Must Have' },
  hit: { emoji: '⚡', label: 'Definite Hit' },
  love: { emoji: '♥', label: 'Love It' },
  notsure: { emoji: '〰', label: 'Not Sure' },
  notforme: { emoji: '✕', label: 'Pass' },
};

export default function SongCard({
  song, index, highlighted = false, onOpenDetail, onOpenDealRoom,
  onOpenRightsPassport, onOpenProfile, onReserve,
}: SongCardProps) {
  const { savedSongIds, toggleSave, artistQueue, toggleArtistQueue, showToast, artistReactions, releaseReserve, noInterestIds, toggleNoInterest } = useStore();
  const { activeSong, isPlaying, toggle, playSong, previewMode, currentTime } = usePlayer();
  const isSaved = savedSongIds.includes(song.id);
  const isNoInterest = noInterestIds.includes(song.id);
  const isQueued = artistQueue.includes(song.id);
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
        // A playing card goes fully dark. A highlighted-but-not-playing card
        // gets the same accent rail with a soft wash instead, so it anchors the
        // list without pretending to be the active track.
        background: isPlayingSong
          ? 'var(--black)'
          : highlighted
            ? 'linear-gradient(90deg, rgba(200,255,69,0.16), rgba(200,255,69,0) 55%), var(--th-white)'
            : 'var(--th-white)',
        borderLeftColor: isPlayingSong
          ? 'var(--acid)'
          : highlighted
            ? 'var(--acid)'
            : 'transparent',
        padding: '16px 16px 13px',
      }}
      onClick={() => {
        if (activeSong?.id === song.id) {
          // If preview ended, restart from beginning
          if (previewMode && currentTime >= 19.5 && !isPlaying) {
            playSong(song);
          } else {
            toggle(song);
          }
        } else {
          playSong(song);
        }
      }}
    >
      {/* Status ribbons */}
      {FEATURES.commerce && song.status === 'reserved' && (
        <span className="absolute top-0 right-0 text-micro tracking-[2px] uppercase px-2 py-[3px] font-medium"
          style={{ fontFamily: "'DM Mono', monospace", background: 'var(--sky)', color: 'var(--black)' }}>
          Reserved
        </span>
      )}
      {FEATURES.commerce && song.status === 'purchased' && (
        <span className="absolute top-0 right-0 text-micro tracking-[2px] uppercase px-2 py-[3px] font-medium"
          style={{ fontFamily: "'DM Mono', monospace", background: 'var(--acid)', color: 'var(--black)' }}>
          Purchased
        </span>
      )}

      {/* Row 1: Number + Actions */}
      <div className="flex items-start justify-between mb-[2px]">
        <span className="text-caption tracking-[2px]"
          style={{
            fontFamily: "'DM Mono', monospace",
            color: isPlayingSong ? 'rgba(255,255,255,0.3)' : 'var(--muted-l)',
          }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex gap-[10px] items-center">
          <button onClick={(e) => {
              e.stopPropagation();
              toggleArtistQueue(song.id);
              showToast(isQueued ? `"${song.title}" removed from Pocket Songs.` : `"${song.title}" added to Pocket Songs.`);
            }}
            title="Add to Pocket Songs"
            className="flex flex-col items-center gap-[3px] cursor-pointer bg-transparent border-none"
            style={{ color: ACTION_VIOLET }}>
            {/* Queued state is a solid fill, not a tint: an outlined icon that
                merely changes hue reads as decoration, a filled one reads as on. */}
            <span className="relative w-[28px] h-[28px] rounded-full flex items-center justify-center transition-all duration-150"
              style={{
                border: `1px solid ${isQueued ? ACTION_VIOLET : 'rgba(181,123,255,0.35)'}`,
                background: isQueued ? ACTION_VIOLET : 'transparent',
                color: isQueued ? '#FFFFFF' : ACTION_VIOLET,
                boxShadow: isQueued ? `0 0 0 3px rgba(181,123,255,0.22)` : 'none',
              }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
              {isQueued && (
                <span className="absolute -top-[3px] -right-[3px] w-[13px] h-[13px] rounded-full flex items-center justify-center"
                  style={{ background: ACTION_VIOLET, border: '1.5px solid var(--th-white)' }}>
                  <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
              )}
            </span>
            <span className="text-micro tracking-[0.8px] uppercase" style={{ fontFamily: "'DM Mono', monospace", fontWeight: isQueued ? 600 : 400 }}>
              {isQueued ? 'In Pocket' : 'Pocket'}
            </span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onOpenDetail(song.id); }}
            title="Song Details"
            className="flex flex-col items-center gap-[3px] cursor-pointer bg-transparent border-none"
            style={{ color: ACTION_SKY }}>
            <span className="w-[28px] h-[28px] rounded-full flex items-center justify-center"
              style={{ border: '1px solid rgba(90,180,255,0.35)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </span>
            <span className="text-micro tracking-[0.8px] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>Info</span>
          </button>
          {FEATURES.dealRooms && <button onClick={(e) => { e.stopPropagation(); onOpenDealRoom(song.id); }}
            title="Deal Room"
            className="flex flex-col items-center gap-[2px] cursor-pointer bg-transparent border-none"
            style={{ color: 'var(--sky)' }}>
            <span className="w-[26px] h-[26px] rounded-full flex items-center justify-center"
              style={{ border: '1px solid rgba(90,180,255,0.3)', background: 'rgba(90,180,255,0.06)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/>
              </svg>
            </span>
            <span className="text-micro tracking-[0.8px] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>Deals</span>
          </button>}
          <button onClick={(e) => {
              e.stopPropagation();
              toggleNoInterest(song.id);
              showToast(isNoInterest
                ? `"${song.title}" back in the bank.`
                : `"${song.title}" moved to Nope.`);
            }}
            title={isNoInterest ? 'Move back into the bank' : 'Collapse and move to the bottom'}
            className="flex flex-col items-center gap-[3px] cursor-pointer bg-transparent border-none"
            style={{ color: ACTION_CORAL }}>
            <span className="w-[28px] h-[28px] rounded-full flex items-center justify-center transition-all duration-150"
              style={{
                border: `1px solid ${isNoInterest ? ACTION_CORAL : 'rgba(255,104,72,0.35)'}`,
                background: isNoInterest ? ACTION_CORAL : 'transparent',
                color: isNoInterest ? '#FFFFFF' : ACTION_CORAL,
                boxShadow: isNoInterest ? '0 0 0 3px rgba(255,104,72,0.22)' : 'none',
              }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </span>
            <span className="text-micro tracking-[0.8px] uppercase whitespace-nowrap"
              style={{ fontFamily: "'DM Mono', monospace", fontWeight: isNoInterest ? 600 : 400 }}>
              {isNoInterest ? 'Undo' : 'Nope'}
            </span>
          </button>
        </div>
      </div>

      {/* Row 2: Title + Price */}
      <div className="flex items-baseline justify-between gap-2 mb-[2px]">
        <span className="text-[26px] tracking-[1.5px] leading-none flex-1"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: isPlayingSong ? '#FFFFFF' : 'var(--black)' }}>
          {song.title}
        </span>
        {FEATURES.pricing && (
          <span className="text-[18px] tracking-[1px] flex-shrink-0"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              color: song.status === 'purchased'
                ? 'var(--acid)'
                : isPlayingSong ? 'var(--th-white)' : 'var(--black)',
            }}>
            {song.status === 'purchased' ? '✓ Yours' : '$85K'}
          </span>
        )}
      </div>

      {/* Row 3: Writers */}
      <div className="flex flex-wrap gap-x-1 mb-[6px]">
        {song.writers.map((w, i) => {
          const memberId = song.writer_ids[i];
          return (
            <span key={i}>
              <button
                onClick={(e) => { e.stopPropagation(); if (memberId) onOpenProfile(memberId); }}
                className="text-body cursor-pointer bg-transparent border-none underline"
                style={{ color: isPlayingSong ? 'rgba(255,255,255,0.55)' : '#5a5650' }}
              >
                {w}
              </button>
              {i < song.writers.length - 1 && (
                <span style={{ color: isPlayingSong ? 'rgba(255,255,255,0.3)' : '#8C8778', fontSize: 15 }}> · </span>
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
        <span className="px-[8px] py-[2px] rounded-full text-caption tracking-[1px] uppercase"
          style={{
            fontFamily: "'DM Mono', monospace",
            background: isPlayingSong ? 'var(--b3)' : 'rgba(10,10,10,0.08)',
            color: isPlayingSong ? 'rgba(255,255,255,0.7)' : 'var(--black)',
            border: isPlayingSong ? 'none' : '1px solid var(--border)',
          }}>
          {song.genre}
        </span>
        {FEATURES.songRecency && song.days_in_bank <= 30 && song.status !== 'purchased' && (
          <span className="px-[8px] py-[2px] rounded-full text-caption tracking-[1px] uppercase animate-tag-pulse"
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
          <span key={m} className="px-[6px] py-[2px] rounded-full text-micro tracking-[0.5px]"
            style={{
              fontFamily: "'DM Mono', monospace",
              background: 'rgba(181,123,255,0.08)',
              color: isPlayingSong ? 'rgba(181,123,255,0.8)' : 'rgba(181,123,255,0.7)',
              border: '1px solid rgba(181,123,255,0.15)',
            }}>
            {m}
          </span>
        ))}
        {FEATURES.commerce && <button
          onClick={(e) => { e.stopPropagation(); onOpenRightsPassport(song.id); }}
          className="ml-auto px-[8px] py-[2px] rounded-full text-micro tracking-[1px] uppercase cursor-pointer border-none"
          style={{
            fontFamily: "'DM Mono', monospace",
            background: 'rgba(42,122,42,0.1)',
            color: '#2a7a2a',
            border: '1px solid rgba(42,122,42,0.2)',
          }}>
          ✓ Cleared
        </button>}
      </div>

      {/* Row 6: Window strip */}
      {FEATURES.commerce && <div className="flex items-center gap-[6px] text-caption"
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
      </div>}

      {/* Row 7: Artist flag (conditional) */}
      {FEATURES.sharedReactions && (song.artistFlagged || reactionData) && (
        <div className="flex items-center gap-[6px] mt-[6px] px-[8px] py-[5px] rounded-lg"
          style={{
            background: 'rgba(181,123,255,0.06)',
            border: '1px solid rgba(181,123,255,0.2)',
          }}>
          <span className="w-[5px] h-[5px] rounded-full animate-blink" style={{ background: 'var(--violet)' }} />
          <span className="text-caption" style={{ color: 'rgba(181,123,255,0.9)', fontFamily: "'DM Mono', monospace" }}>
            {reactionData
              ? `${reactionData.emoji} Artist: ${reactionData.label} · ${song.artistFlagTime || 'Just now'}`
              : `♥ Flagged · ${song.artistFlagTime || 'Just now'}`}
          </span>
        </div>
      )}

      {/* Release Reserve button */}
      {FEATURES.commerce && song.status === 'reserved' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            releaseReserve(song.id);
            showToast(`"${song.title}" reserve released. Song is back on the market.`);
          }}
          className="mt-[8px] w-full py-[8px] rounded-lg text-caption tracking-[1.5px] uppercase cursor-pointer"
          style={{
            fontFamily: "'DM Mono', monospace",
            background: 'transparent',
            border: isPlayingSong ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border)',
            color: isPlayingSong ? 'rgba(255,255,255,0.5)' : 'var(--muted)',
          }}>
          Release Reserve
        </button>
      )}
    </div>
  );
}
