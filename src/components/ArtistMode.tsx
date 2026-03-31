'use client';

import { useState, useEffect, useCallback } from 'react';
import { Song } from '@/data/types';
import { useStore } from '@/lib/store';
import { usePlayer } from '@/lib/player';
import PlayerVisualizer, { VizMode } from './PlayerVisualizer';

const REACTIONS = [
  { key: 'musthave', emoji: '🔥', label: 'Must Have' },
  { key: 'hit', emoji: '⚡', label: 'Definite Hit' },
  { key: 'love', emoji: '♥', label: 'Love It' },
  { key: 'notsure', emoji: '〰', label: 'Not Sure' },
  { key: 'notforme', emoji: '✕', label: 'Pass' },
];

const MOOD_MAP: Record<string, (s: Song) => boolean> = {
  all: () => true,
  cinematic: s => s.mood.some(m => ['Cinematic', 'Anthemic', 'Triumphant', 'Expansive'].includes(m)),
  intimate: s => s.mood.some(m => ['Intimate', 'Vulnerable', 'Confessional', 'Sensual', 'Dreamy'].includes(m)),
  energy: s => s.mood.some(m => ['High Energy', 'Defiant', 'Tension', 'Release'].includes(m)),
  euphoric: s => s.mood.some(m => ['Euphoric'].includes(m)),
  dark: s => s.mood.some(m => ['Heartbreak', 'Nostalgic', 'Dark', 'Brooding'].includes(m)),
  feelgood: s => s.mood.some(m => ['Lift', 'Feel-Good', 'Happy', 'Dreamy'].includes(m)),
};

const MOOD_CHIPS = [
  { key: 'all', label: 'All Feels' },
  { key: 'cinematic', label: 'Cinematic' },
  { key: 'intimate', label: 'Intimate' },
  { key: 'energy', label: 'High Energy' },
  { key: 'euphoric', label: 'Euphoric' },
  { key: 'dark', label: 'Dark & Brooding' },
  { key: 'feelgood', label: 'Feel-Good' },
];

interface ArtistModeProps {
  open: boolean;
  onClose: () => void;
}

export default function ArtistMode({ open, onClose }: ArtistModeProps) {
  const { songs, artistReactions, setArtistReaction, showToast } = useStore();
  const { activeSong, isPlaying, progress, toggle, playSong } = usePlayer();
  const [activeMood, setActiveMood] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [vizMode, setVizMode] = useState<VizMode>('waveform');

  const filterFn = MOOD_MAP[activeMood] || (() => true);
  const filteredSongs = songs.filter(s => s.status !== 'purchased' && filterFn(s));

  // Clamp index when filter changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [activeMood]);

  useEffect(() => {
    if (currentIndex >= filteredSongs.length && filteredSongs.length > 0) {
      setCurrentIndex(filteredSongs.length - 1);
    }
  }, [filteredSongs.length, currentIndex]);

  const song = filteredSongs[currentIndex] || null;

  const goNext = useCallback(() => {
    if (filteredSongs.length <= 1) return;
    const next = (currentIndex + 1) % filteredSongs.length;
    setCurrentIndex(next);
    playSong(filteredSongs[next]);
  }, [currentIndex, filteredSongs, playSong]);

  const goPrev = useCallback(() => {
    if (filteredSongs.length <= 1) return;
    const prev = (currentIndex - 1 + filteredSongs.length) % filteredSongs.length;
    setCurrentIndex(prev);
    playSong(filteredSongs[prev]);
  }, [currentIndex, filteredSongs, playSong]);

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

  return (
    <div
      className="absolute inset-0 z-[170] flex flex-col overflow-hidden"
      style={{
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
          <span className="w-[6px] h-[6px] rounded-full animate-blink" style={{ background: 'var(--violet)' }} />
          <span className="text-[18px] tracking-[3px]" style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'var(--th-white)' }}>Artist Mode</span>
        </div>
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
      </div>

      {/* Mood chips */}
      <div className="flex gap-[6px] overflow-x-auto scrollbar-hide px-5 pb-3 flex-shrink-0">
        {MOOD_CHIPS.map(chip => (
          <button
            key={chip.key}
            onClick={() => setActiveMood(chip.key)}
            className="flex-shrink-0 whitespace-nowrap px-[12px] py-[6px] rounded-full text-[8px] tracking-[1px] uppercase cursor-pointer transition-all duration-150"
            style={{
              fontFamily: "'DM Mono', monospace",
              border: activeMood === chip.key ? '1px solid var(--violet)' : '1px solid rgba(255,255,255,0.12)',
              background: activeMood === chip.key ? 'rgba(181,123,255,0.15)' : 'transparent',
              color: activeMood === chip.key ? 'var(--violet)' : 'rgba(255,255,255,0.4)',
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Song picker strip */}
      {filteredSongs.length > 1 && (
        <div className="flex gap-[6px] overflow-x-auto scrollbar-hide px-5 pb-3 flex-shrink-0">
          {filteredSongs.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setCurrentIndex(i); playSong(s); }}
              className="flex-shrink-0 whitespace-nowrap px-[10px] py-[5px] rounded-full text-[7px] tracking-[0.5px] uppercase cursor-pointer transition-all duration-150"
              style={{
                fontFamily: "'DM Mono', monospace",
                border: i === currentIndex ? `1px solid ${s.color}` : '1px solid rgba(255,255,255,0.1)',
                background: i === currentIndex ? `${s.color}22` : 'transparent',
                color: i === currentIndex ? s.color : 'rgba(255,255,255,0.35)',
              }}
            >
              {s.title.length > 14 ? s.title.slice(0, 14) + '…' : s.title}
            </button>
          ))}
        </div>
      )}

      {/* Focused song card */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-[20px]">
        {!song ? (
          <div className="text-center py-12">
            <p className="text-[32px] tracking-[2px]" style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'rgba(255,255,255,0.18)' }}>Nothing Here</p>
            <p className="text-[12px] mt-[6px]" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.22)' }}>Try a different feel.</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden relative">
            {/* Gradient background */}
            <div className="absolute inset-0" style={{ background: song.gradient || '#111' }} />
            <div className="relative p-5">
              {/* Song title + nav arrows */}
              <div className="flex items-center gap-2 mb-1">
                {filteredSongs.length > 1 && (
                  <button onClick={goPrev}
                    className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[14px] cursor-pointer border-none flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                    ‹
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[8px] tracking-[1.5px] uppercase mb-1"
                    style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.65)' }}>
                    {song.mood.join(' · ').toLowerCase() || song.genre.toLowerCase()} · {song.bpm} bpm
                  </div>
                  <div className="text-[40px] tracking-[2px] leading-[0.95] truncate"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'white' }}>
                    {song.title}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.72)' }}>
                    {song.writers.join(' · ')}
                  </div>
                </div>
                {filteredSongs.length > 1 && (
                  <button onClick={goNext}
                    className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[14px] cursor-pointer border-none flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
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
                />
              </div>

              {/* Play row */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={(e) => { e.stopPropagation(); toggle(song); }}
                  className={`w-[56px] h-[56px] rounded-full flex items-center justify-center text-[22px] cursor-pointer border-none flex-shrink-0 active:scale-[0.92] transition-transform ${
                    isSongPlaying && isPlaying ? 'animate-pulse-glow' : ''
                  }`}
                  style={{ background: song.color, color: '#000' }}
                >
                  {isSongPlaying && isPlaying ? '⏸' : '▶'}
                </button>
                <div className="flex-1 mx-1">
                  <div className="text-[8px] tracking-[2px] uppercase mb-1"
                    style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.35)' }}>
                    {song.genre} · {song.key}
                  </div>
                  <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${currentProgress}%`, background: song.color }} />
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleFlag(song.id); }}
                  className="w-[46px] h-[46px] rounded-full flex items-center justify-center text-[20px] cursor-pointer border-none flex-shrink-0"
                  style={{
                    background: song.artistFlagged ? 'rgba(181,123,255,0.15)' : 'rgba(255,255,255,0.08)',
                    border: song.artistFlagged ? '1px solid rgba(181,123,255,0.4)' : '1px solid rgba(255,255,255,0.12)',
                    color: song.artistFlagged ? 'var(--violet)' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {song.artistFlagged ? '♥' : '♡'}
                </button>
              </div>

              {/* Reaction buttons - 3+2 grid */}
              <div className="grid grid-cols-3 gap-[6px] mb-[6px]">
                {REACTIONS.slice(0, 3).map(r => (
                  <button key={r.key}
                    onClick={(e) => { e.stopPropagation(); handleReaction(song.id, r.key); }}
                    className="py-[9px] rounded-lg text-[8px] tracking-[0.5px] uppercase text-center cursor-pointer transition-all duration-150"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      background: rx === r.key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                      border: rx === r.key ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.1)',
                      color: rx === r.key ? 'white' : 'rgba(255,255,255,0.55)',
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
                      background: rx === r.key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                      border: rx === r.key ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.1)',
                      color: rx === r.key ? 'white' : 'rgba(255,255,255,0.55)',
                    }}>
                    <span className="text-[14px] block mb-[2px]">{r.emoji}</span>{r.label}
                  </button>
                ))}
              </div>

              {/* Status strip */}
              {rxData && (
                <div className="flex items-center gap-[6px] mt-3 px-[10px] py-[8px] rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
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
