'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { usePlayer, formatTime } from '@/lib/player';
import PlayerVisualizer, { VizMode } from './PlayerVisualizer';
import { FEATURES } from '@/lib/features';

const REACTIONS = [
  { key: 'musthave', emoji: '🔥', label: 'Must Have' },
  { key: 'hit', emoji: '⚡', label: 'Definite Hit' },
  { key: 'love', emoji: '♥', label: 'Love It' },
  { key: 'notsure', emoji: '〰', label: 'Not Sure' },
  { key: 'notforme', emoji: '✕', label: 'Pass' },
];

interface ArtistModeProps {
  open: boolean;
  onClose: () => void;
  onOpenProfile?: (memberId: number) => void;
  onOpenDetail?: (songId: number) => void;
  inline?: boolean;
}

export default function ArtistMode({ open, onClose, onOpenProfile, onOpenDetail, inline }: ArtistModeProps) {
  const { songs, members, artistQueue, artistReactions, setArtistReaction, showToast,
    pocketVizMode, setPocketVizMode } = useStore();
  const { activeSong, isPlaying, progress, currentTime, duration, seek, toggle, playSong, skipForward, skipBack, setPreviewMode } = usePlayer();
  const [currentIndex, setCurrentIndex] = useState(0);
  // Which visualizer is showing survives leaving the tab, which unmounts this
  // component. The palette is no longer chosen — it drifts from the song's own
  // colour inside the visualizer.
  const vizMode = (pocketVizMode === 'composition' ? 'composition' : 'aurora') as VizMode;
  const setVizMode = (mode: VizMode) => setPocketVizMode(mode);

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

  // Open on whatever is playing. This is React's "adjust state when a value
  // changes" pattern — done during render rather than in an effect, so it
  // resolves before paint and does not cause a cascading re-render. It fires
  // only when the playing track actually changes, so browsing the picker to a
  // different song is never fought.
  const [syncedSongId, setSyncedSongId] = useState<number | null>(null);
  if (activeSong && activeSong.id !== syncedSongId) {
    setSyncedSongId(activeSong.id);
    const idx = queuedSongs.findIndex(s => s.id === activeSong.id);
    if (idx >= 0 && idx !== currentIndex) setCurrentIndex(idx);
  }

  const song = queuedSongs[currentIndex] || null;

  const goNext = () => {
    if (queuedSongs.length <= 1) return;
    setCurrentIndex((currentIndex + 1) % queuedSongs.length);
  };

  const goPrev = () => {
    if (queuedSongs.length <= 1) return;
    setCurrentIndex((currentIndex - 1 + queuedSongs.length) % queuedSongs.length);
  };

  // Dragging the progress bar. Pointer events cover mouse and touch alike, and
  // pointer capture keeps the drag alive when a finger slides off the bar.
  const scrubTrackRef = useRef<HTMLDivElement | null>(null);
  const [scrubbing, setScrubbing] = useState(false);

  const seekFromPointer = (clientX: number) => {
    const el = scrubTrackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    seek(Math.max(0, Math.min(100, pct)));
  };

  // Next + play, as opposed to goNext which only moves the selection.
  const playNext = () => {
    if (queuedSongs.length <= 1) return;
    const next = (currentIndex + 1) % queuedSongs.length;
    setCurrentIndex(next);
    playSong(queuedSongs[next]);
  };

  const handleReaction = (songId: number, key: string) => {
    const current = artistReactions[songId];
    if (current === key) {
      setArtistReaction(songId, null);
    } else {
      setArtistReaction(songId, key);
      // A private reaction needs no announcement — the button state is the
      // whole feedback. Only tell the user when someone else will see it.
      if (FEATURES.sharedReactions) {
        const rxData = REACTIONS.find(r => r.key === key);
        const s = songs.find(x => x.id === songId);
        if (rxData && s) {
          showToast(`${rxData.emoji} "${s.title}" — your team sees "${rxData.label}"`);
        }
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
      if (FEATURES.sharedReactions) showToast(`♥ "${s.title}" flagged — your team will see this.`);
    } else {
      setArtistReaction(songId, null);
      showToast(`Flag removed from "${s.title}".`);
    }
  };

  const isSongPlaying = song && activeSong?.id === song.id;
  const currentProgress = isSongPlaying ? progress : 0;
  const rx = song ? (artistReactions[song.id] || null) : null;
  const rxData = rx ? REACTIONS.find(r => r.key === rx) : null;

  // The anchor colour. The visualizer drifts around the wheel from here; the
  // surrounding controls stay on it so they do not shift under the eye.
  const effectiveColor = song?.color || '#B57BFF';

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
          <span className="text-[18px] tracking-[3px]" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#FFFFFF' }}>Pocket Songs</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-caption tracking-[1px]" style={{ fontFamily: "'DM Mono', monospace", color: effectiveColor }}>
            {queuedSongs.length} song{queuedSongs.length !== 1 ? 's' : ''}
          </span>
          {!inline && (
            <button onClick={onClose}
              className="px-[10px] py-[5px] rounded-full text-caption tracking-[1.5px] uppercase cursor-pointer"
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

      {/* Song picker strip */}
      {queuedSongs.length > 1 && (
        <div className="flex gap-[6px] overflow-x-auto scrollbar-hide px-5 pb-3 flex-shrink-0">
          {queuedSongs.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setCurrentIndex(i); }}
              className="flex-shrink-0 whitespace-nowrap px-[10px] py-[5px] rounded-full text-micro tracking-[0.5px] uppercase cursor-pointer transition-all duration-150"
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
            <p className="text-body leading-relaxed max-w-[240px] mx-auto" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.25)' }}>
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
                  <button onClick={goPrev} aria-label="Previous song"
                    className="w-[44px] h-[44px] rounded-full flex items-center justify-center cursor-pointer flex-shrink-0 active:scale-90 transition-transform"
                    style={{
                      background: `${effectiveColor}1f`,
                      border: `1px solid ${effectiveColor}55`,
                      color: effectiveColor,
                      fontSize: 26,
                      lineHeight: 1,
                      paddingBottom: 3,
                    }}>
                    ‹
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[38px] tracking-[2px] leading-[0.95] truncate"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'white' }}>
                    {song.title}
                  </div>
                  {/* Clickable writers */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {song.writers.map((writer, wi) => {
                      const member = members.find(m => m.name === writer);
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
                            className="bg-transparent border-none cursor-pointer underline text-body"
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
                  <button onClick={goNext} aria-label="Next song"
                    className="w-[44px] h-[44px] rounded-full flex items-center justify-center cursor-pointer flex-shrink-0 active:scale-90 transition-transform"
                    style={{
                      background: `${effectiveColor}1f`,
                      border: `1px solid ${effectiveColor}55`,
                      color: effectiveColor,
                      fontSize: 26,
                      lineHeight: 1,
                      paddingBottom: 3,
                    }}>
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
                  extraAction={onOpenDetail ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenDetail(song.id); }}
                      className="flex flex-col items-center gap-[3px] cursor-pointer bg-transparent border-none"
                    >
                      <span className="w-[10px] h-[10px] rounded-full flex items-center justify-center"
                        style={{ border: '1px solid rgba(255,255,255,0.35)' }} />
                      <span className="text-micro tracking-[0.5px] uppercase"
                        style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.4)' }}>
                        Info
                      </span>
                    </button>
                  ) : undefined}
                />
              </div>

              {/* Transport controls */}
              <div className="flex items-center justify-center gap-3 mb-3">
                {/* Start Over */}
                <button
                  onClick={(e) => { e.stopPropagation(); playSong(song); }}
                  className="w-[34px] h-[34px] rounded-full flex items-center justify-center cursor-pointer border-none active:scale-90 transition-transform"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  title="Start over"
                >
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>⏮</span>
                </button>

                {/* Rewind 10s */}
                <button
                  onClick={(e) => { e.stopPropagation(); skipBack(10); }}
                  className="w-[38px] h-[38px] rounded-full flex items-center justify-center cursor-pointer border-none active:scale-90 transition-transform"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  <div className="flex flex-col items-center">
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1 }}>↺</span>
                    <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>10</span>
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
                    <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>10</span>
                  </div>
                </button>

                {/* Next track — jumps and starts playing, unlike the ‹ › arrows
                    beside the title, which only change what is on screen. */}
                <button
                  onClick={(e) => { e.stopPropagation(); playNext(); }}
                  disabled={queuedSongs.length <= 1}
                  aria-label="Next track"
                  className="h-[38px] px-[12px] rounded-full flex items-center gap-[5px] cursor-pointer border-none active:scale-90 transition-transform"
                  style={{
                    background: queuedSongs.length <= 1 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    opacity: queuedSongs.length <= 1 ? 0.4 : 1,
                  }}
                >
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>⏭</span>
                  <span className="text-micro tracking-[1px] uppercase"
                    style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.55)' }}>
                    Next
                  </span>
                </button>
              </div>

              {/* Progress bar + transport clock */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-[6px]">
                  <span className="text-micro" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.3)' }}>
                    {currentIndex + 1} / {queuedSongs.length}
                  </span>
                  <span className="text-micro tabular-nums" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.55)' }}>
                    <span style={{ color: effectiveColor }}>{formatTime(isSongPlaying ? currentTime : 0)}</span>
                    <span style={{ color: 'rgba(255,255,255,0.25)' }}> / </span>
                    {formatTime(isSongPlaying && duration > 0 ? duration : song.audio_duration_seconds)}
                  </span>
                </div>
                {/* Draggable scrubber. touch-none stops the page scrolling
                    under a finger that is dragging the bar. */}
                <div
                  className="py-[12px] -my-[8px] cursor-pointer touch-none select-none"
                  onPointerDown={(e) => {
                    if (!isSongPlaying) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setScrubbing(true);
                    seekFromPointer(e.clientX);
                  }}
                  onPointerMove={(e) => {
                    if (!scrubbing) return;
                    seekFromPointer(e.clientX);
                  }}
                  onPointerUp={(e) => {
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                    setScrubbing(false);
                  }}
                  onPointerCancel={() => setScrubbing(false)}
                >
                  <div
                    ref={scrubTrackRef}
                    className="relative rounded-full"
                    style={{
                      height: scrubbing ? 10 : 8,
                      background: 'rgba(255,255,255,0.12)',
                      transition: 'height 120ms ease',
                    }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${currentProgress}%`,
                        background: effectiveColor,
                        boxShadow: `0 0 6px ${effectiveColor}66`,
                      }}
                    />
                    {/* Thumb: gives the finger something to aim at, and shows
                        where the playhead is when the bar is near empty. */}
                    <div
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        left: `${currentProgress}%`,
                        top: '50%',
                        width: scrubbing ? 20 : 16,
                        height: scrubbing ? 20 : 16,
                        transform: 'translate(-50%, -50%)',
                        background: effectiveColor,
                        border: '2px solid rgba(0,0,0,0.35)',
                        boxShadow: `0 0 10px ${effectiveColor}88`,
                        opacity: isSongPlaying ? 1 : 0.45,
                        transition: 'width 120ms ease, height 120ms ease',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Reactions */}
              <div className="grid grid-cols-5 gap-[6px] mb-[6px]">
                {REACTIONS.map(r => {
                  const isSelected = rx === r.key;
                  return (
                    <button key={r.key}
                      onClick={(e) => { e.stopPropagation(); handleReaction(song.id, r.key); }}
                      className="px-[4px] py-[10px] rounded-lg text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-start"
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        // Five columns on a 393px screen leaves ~66px per cell,
                        // so two-word labels wrap. Reserve the room up front and
                        // keep the text off the border.
                        minHeight: 74,
                        background: isSelected ? `${effectiveColor}40` : 'rgba(255,255,255,0.04)',
                        border: isSelected ? `2px solid ${effectiveColor}` : '1px solid rgba(255,255,255,0.1)',
                        color: isSelected ? 'white' : 'rgba(255,255,255,0.55)',
                        boxShadow: isSelected ? `0 0 12px ${effectiveColor}44, inset 0 0 12px ${effectiveColor}22` : 'none',
                      }}>
                      <span className={`block leading-none ${isSelected ? 'text-[20px]' : 'text-[16px]'}`}>{r.emoji}</span>
                      <span className={`uppercase block mt-[5px] px-[2px] ${isSelected ? 'font-medium' : ''}`}
                        style={{
                          color: isSelected ? 'white' : 'rgba(255,255,255,0.45)',
                          fontSize: 11,
                          letterSpacing: 0.2,
                          lineHeight: 1.25,
                          overflowWrap: 'break-word',
                          hyphens: 'auto',
                        }}>
                        {r.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {FEATURES.sharedReactions && rxData && (
                <div className="flex items-center gap-[6px] mt-3 px-[10px] py-[8px] rounded-lg"
                  style={{ background: `${effectiveColor}0a`, border: `1px solid ${effectiveColor}22` }}>
                  <span className="text-[14px]">{rxData.emoji}</span>
                  <span className="text-label" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    You said: <strong style={{ color: '#fff' }}>{rxData.label}</strong> · shared with your team
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
