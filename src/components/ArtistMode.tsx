'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { usePlayer } from '@/lib/player';
import { MEMBERS } from '@/data/members';
import PlayerVisualizer, { VizMode } from './PlayerVisualizer';

const REACTIONS = [
  { key: 'musthave', emoji: '🔥', label: 'Must Have' },
  { key: 'hit', emoji: '⚡', label: 'Definite Hit' },
  { key: 'love', emoji: '♥', label: 'Love It' },
  { key: 'notsure', emoji: '〰', label: 'Not Sure' },
  { key: 'notforme', emoji: '✕', label: 'Pass' },
];

// Mood chips now change the color theme of the player surface
const MOOD_THEMES = [
  { key: 'default', label: 'Default', color: '' }, // uses song color
  { key: 'neon', label: 'Neon', color: '#C8FF45' },
  { key: 'midnight', label: 'Midnight', color: '#5AB4FF' },
  { key: 'fire', label: 'Fire', color: '#FF6848' },
  { key: 'violet', label: 'Violet', color: '#B57BFF' },
  { key: 'gold', label: 'Gold', color: '#FFB830' },
  { key: 'ice', label: 'Ice', color: '#00F5C4' },
];

interface ArtistModeProps {
  open: boolean;
  onClose: () => void;
  onOpenProfile?: (memberId: number) => void;
  inline?: boolean;
}

export default function ArtistMode({ open, onClose, onOpenProfile, inline }: ArtistModeProps) {
  const { songs, artistQueue, artistReactions, setArtistReaction, showToast } = useStore();
  const { activeSong, isPlaying, progress, toggle, playSong, skipForward, skipBack, setPreviewMode } = usePlayer();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [vizMode, setVizMode] = useState<VizMode>('waveform');
  const [activeTheme, setActiveTheme] = useState('default');

  // Disable preview mode when in Pocket Songs, re-enable when leaving
  useEffect(() => {
    if (open || inline) {
      setPreviewMode(false);
    }
    return () => { setPreviewMode(true); };
  }, [open, inline, setPreviewMode]);

  // Queue-based song list
  const queuedSongs = songs.filter(s => artistQueue.includes(s.id));

  // Clamp index
  useEffect(() => {
    if (currentIndex >= queuedSongs.length && queuedSongs.length > 0) {
      setCurrentIndex(queuedSongs.length - 1);
    }
  }, [queuedSongs.length, currentIndex]);

  const song = queuedSongs[currentIndex] || null;
  const themeColor = MOOD_THEMES.find(t => t.key === activeTheme)?.color || '';

  const goNext = useCallback(() => {
    if (queuedSongs.length <= 1) return;
    const next = (currentIndex + 1) % queuedSongs.length;
    setCurrentIndex(next);
  }, [currentIndex, queuedSongs.length]);

  const goPrev = useCallback(() => {
    if (queuedSongs.length <= 1) return;
    const prev = (currentIndex - 1 + queuedSongs.length) % queuedSongs.length;
    setCurrentIndex(prev);
  }, [currentIndex, queuedSongs.length]);

  const handleReaction = (songId: number, key: string) => {
    const current = artistReactions[songId];
    if (current === key) {
      setArtistReaction(songId, null);
    } else {
      setArtistReaction(songId, key);
      const rxData = REACTIONS.find(r => r.key === key);
      const s = songs.find(x => x.id === songId);
      if (rxData && s) {
        showToast(`${rxData.emoji} "${s.title}" — your manager sees "${rxData.label}"`);
      }
    }
  };

  const handleFlag = (songId: number) => {
    const s = songs.find(x => x.id === songId);
    if (!s) return;
    if (!s.artistFlagged) {
      if (!artistReactions[songId]) {
        setArtistReaction(songId, 'love');
      }
      showToast(`♥ "${s.title}" flagged — your manager will see this.`);
    } else {
      setArtistReaction(songId, null);
      showToast(`Flag removed from "${s.title}".`);
    }
  };

  const isSongPlaying = song && activeSong?.id === song.id;
  const currentProgress = isSongPlaying ? progress : 0;
  const rx = song ? (artistReactions[song.id] || null) : null;
  const rxData = rx ? REACTIONS.find(r => r.key === rx) : null;

  // Get the effective color for theming
  const effectiveColor = themeColor || (song?.color || '#B57BFF');

  return (
    <div
      className={inline ? "flex flex-col overflow-hidden h-full" : "absolute inset-0 z-[170] flex flex-col overflow-hidden"}
      style={inline ? {
        background: '#06060e',
      } : {
        background: '#06060e',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: open
          ? 'transform 480ms cubic-bezier(0.16, 1, 0.3, 1)'
          : 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-[6px] h-[6px] rounded-full animate-blink" style={{ background: effectiveColor }} />
          <span className="text-[18px] tracking-[3px]" style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'var(--th-white)' }}>Pocket Songs</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] tracking-[1px]" style={{ fontFamily: "'DM Mono', monospace", color: effectiveColor }}>
            {queuedSongs.length} song{queuedSongs.length !== 1 ? 's' : ''}
          </span>
          {!inline && (
            <button onClick={onClose}
              className="px-[10px] py-[5px] rounded-full text-[8px] tracking-[1.5px] uppercase cursor-pointer"
              style={{
                fontFamily: "'DM Mono', monospace",
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.55)',
              }}>
              ✕ Exit
            </button>
          )}
        </div>
      </div>

      {/* Theme chips (color/vibe selector) */}
      <div className="flex gap-[6px] overflow-x-auto scrollbar-hide px-5 pb-3 flex-shrink-0">
        {MOOD_THEMES.map(theme => (
          <button
            key={theme.key}
            onClick={() => setActiveTheme(theme.key)}
            className="flex-shrink-0 whitespace-nowrap px-[12px] py-[6px] rounded-full text-[8px] tracking-[1px] uppercase cursor-pointer transition-all duration-200"
            style={{
              fontFamily: "'DM Mono', monospace",
              border: activeTheme === theme.key
                ? `1px solid ${theme.color || effectiveColor}`
                : '1px solid rgba(255,255,255,0.12)',
              background: activeTheme === theme.key
                ? `${theme.color || effectiveColor}22`
                : 'transparent',
              color: activeTheme === theme.key
                ? (theme.color || effectiveColor)
                : 'rgba(255,255,255,0.4)',
            }}
          >
            {theme.color && (
              <span className="inline-block w-[6px] h-[6px] rounded-full mr-[5px]" style={{ background: theme.color }} />
            )}
            {theme.label}
          </button>
        ))}
      </div>

      {/* Song picker strip */}
      {queuedSongs.length > 1 && (
        <div className="flex gap-[6px] overflow-x-auto scrollbar-hide px-5 pb-3 flex-shrink-0">
          {queuedSongs.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setCurrentIndex(i); playSong(s); }}
              className="flex-shrink-0 whitespace-nowrap px-[10px] py-[5px] rounded-full text-[7px] tracking-[0.5px] uppercase cursor-pointer transition-all duration-150"
              style={{
                fontFamily: "'DM Mono', monospace",
                border: i === currentIndex ? `1px solid ${effectiveColor}` : '1px solid rgba(255,255,255,0.1)',
                background: i === currentIndex ? `${effectiveColor}22` : 'transparent',
                color: i === currentIndex ? effectiveColor : 'rgba(255,255,255,0.35)',
              }}
            >
              {s.title.length > 14 ? s.title.slice(0, 14) + '…' : s.title}
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-[20px]">
        {queuedSongs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-[48px] mb-4" style={{ opacity: 0.3 }}>🎵</div>
            <p className="text-[28px] tracking-[2px] mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'rgba(255,255,255,0.2)' }}>No Songs Selected</p>
            <p className="text-[11px] leading-relaxed max-w-[240px] mx-auto" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.25)' }}>
              Tap the <span style={{ color: 'var(--violet)' }}>♫ Artist</span> button on songs in the bank to add them to your queue.
            </p>
          </div>
        ) : song && (
          <div className="rounded-2xl overflow-hidden relative">
            {/* Background with theme tint */}
            <div className="absolute inset-0" style={{
              background: `linear-gradient(135deg, ${effectiveColor}15 0%, #111 40%, ${effectiveColor}08 100%)`,
            }} />
            <div className="relative p-5">
              {/* Title + nav */}
              <div className="flex items-center gap-2 mb-1">
                {queuedSongs.length > 1 && (
                  <button onClick={goPrev}
                    className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[14px] cursor-pointer border-none flex-shrink-0 active:scale-90 transition-transform"
                    style={{ background: `${effectiveColor}15`, color: effectiveColor }}>
                    ‹
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[8px] tracking-[1.5px] uppercase mb-1"
                    style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.5)' }}>
                    {song.genre} · {song.bpm} bpm · {song.key}
                  </div>
                  <div className="text-[38px] tracking-[2px] leading-[0.95] truncate"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'white' }}>
                    {song.title}
                  </div>
                  {/* Clickable writers */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {song.writers.map((writer, wi) => {
                      const member = MEMBERS.find(m => m.name === writer);
                      return (
                        <span key={wi}>
                          {wi > 0 && <span style={{ color: 'rgba(255,255,255,0.3)' }}> · </span>}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (member && onOpenProfile) {
                                onClose();
                                setTimeout(() => onOpenProfile(member.id), 300);
                              }
                            }}
                            className="bg-transparent border-none cursor-pointer underline text-[11px]"
                            style={{ color: 'rgba(255,255,255,0.72)', textDecorationColor: 'rgba(255,255,255,0.3)' }}
                          >
                            {writer}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
                {queuedSongs.length > 1 && (
                  <button onClick={goNext}
                    className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[14px] cursor-pointer border-none flex-shrink-0 active:scale-90 transition-transform"
                    style={{ background: `${effectiveColor}15`, color: effectiveColor }}>
                    ›
                  </button>
                )}
              </div>

              {/* Visualizer */}
              <div className="my-4">
                <PlayerVisualizer
                  song={song}
                  isPlaying={!!(isSongPlaying && isPlaying)}
                  progress={currentProgress}
                  onToggle={() => toggle(song)}
                  mode={vizMode}
                  onModeChange={setVizMode}
                  themeColor={themeColor || undefined}
                />
              </div>

              {/* Transport controls */}
              <div className="flex items-center justify-center gap-4 mb-3">
                {/* Rewind 10s */}
                <button
                  onClick={(e) => { e.stopPropagation(); skipBack(10); }}
                  className="w-[38px] h-[38px] rounded-full flex items-center justify-center cursor-pointer border-none active:scale-90 transition-transform"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  <div className="flex flex-col items-center">
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1 }}>↺</span>
                    <span style={{ fontSize: 6, fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>10</span>
                  </div>
                </button>

                {/* Play/Pause */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggle(song); }}
                  className={`w-[56px] h-[56px] rounded-full flex items-center justify-center text-[22px] cursor-pointer border-none flex-shrink-0 active:scale-[0.92] transition-transform ${
                    isSongPlaying && isPlaying ? 'animate-pulse-glow' : ''
                  }`}
                  style={{
                    background: effectiveColor,
                    color: '#000',
                    boxShadow: isSongPlaying && isPlaying ? `0 0 20px ${effectiveColor}44` : 'none',
                  }}
                >
                  {isSongPlaying && isPlaying ? '⏸' : '▶'}
                </button>

                {/* Skip 10s */}
                <button
                  onClick={(e) => { e.stopPropagation(); skipForward(10); }}
                  className="w-[38px] h-[38px] rounded-full flex items-center justify-center cursor-pointer border-none active:scale-90 transition-transform"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  <div className="flex flex-col items-center">
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1 }}>↻</span>
                    <span style={{ fontSize: 6, fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>10</span>
                  </div>
                </button>

                {/* Flag */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleFlag(song.id); }}
                  className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-[16px] cursor-pointer border-none flex-shrink-0"
                  style={{
                    background: song.artistFlagged ? 'rgba(181,123,255,0.15)' : 'rgba(255,255,255,0.06)',
                    border: song.artistFlagged ? '1px solid rgba(181,123,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
                    color: song.artistFlagged ? 'var(--violet)' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {song.artistFlagged ? '♥' : '♡'}
                </button>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[7px]" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.3)' }}>
                    {currentIndex + 1} / {queuedSongs.length}
                  </span>
                </div>
                <div className="h-[4px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full transition-[width] duration-300"
                    style={{ width: `${currentProgress}%`, background: effectiveColor, boxShadow: `0 0 6px ${effectiveColor}66` }} />
                </div>
              </div>

              {/* Reactions */}
              <div className="grid grid-cols-3 gap-[6px] mb-[6px]">
                {REACTIONS.slice(0, 3).map(r => (
                  <button key={r.key}
                    onClick={(e) => { e.stopPropagation(); handleReaction(song.id, r.key); }}
                    className="py-[9px] rounded-lg text-[8px] tracking-[0.5px] uppercase text-center cursor-pointer transition-all duration-150"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      background: rx === r.key ? `${effectiveColor}20` : 'rgba(255,255,255,0.04)',
                      border: rx === r.key ? `1px solid ${effectiveColor}55` : '1px solid rgba(255,255,255,0.08)',
                      color: rx === r.key ? 'white' : 'rgba(255,255,255,0.45)',
                    }}>
                    <span className="text-[14px] block mb-[2px]">{r.emoji}</span>{r.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-[6px]">
                {REACTIONS.slice(3).map(r => (
                  <button key={r.key}
                    onClick={(e) => { e.stopPropagation(); handleReaction(song.id, r.key); }}
                    className="py-[9px] rounded-lg text-[8px] tracking-[0.5px] uppercase text-center cursor-pointer transition-all duration-150"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      background: rx === r.key ? `${effectiveColor}20` : 'rgba(255,255,255,0.04)',
                      border: rx === r.key ? `1px solid ${effectiveColor}55` : '1px solid rgba(255,255,255,0.08)',
                      color: rx === r.key ? 'white' : 'rgba(255,255,255,0.45)',
                    }}>
                    <span className="text-[14px] block mb-[2px]">{r.emoji}</span>{r.label}
                  </button>
                ))}
              </div>

              {rxData && (
                <div className="flex items-center gap-[6px] mt-3 px-[10px] py-[8px] rounded-lg"
                  style={{ background: `${effectiveColor}0a`, border: `1px solid ${effectiveColor}22` }}>
                  <span className="text-[14px]">{rxData.emoji}</span>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    You said: <strong style={{ color: '#fff' }}>{rxData.label}</strong> · shared with your manager
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
