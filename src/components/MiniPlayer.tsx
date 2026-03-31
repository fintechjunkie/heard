'use client';

import { usePlayer } from '@/lib/player';

interface MiniPlayerProps {
  onOpenDetail: (songId: number) => void;
  onReserve: (songId: number) => void;
  onBuy: (songId: number) => void;
}

// CSS class names must be written in full for Tailwind to detect them
const EQ_CLASSES = ['animate-eq-1', 'animate-eq-2', 'animate-eq-3', 'animate-eq-1', 'animate-eq-2'];

export default function MiniPlayer({ onOpenDetail, onReserve, onBuy }: MiniPlayerProps) {
  const { activeSong, isPlaying, progress, toggle, seek } = usePlayer();

  if (!activeSong) return null;

  return (
    <div
      className="absolute left-0 right-0 z-[90] cursor-pointer"
      style={{
        bottom: 58,
        background: 'var(--black)',
        borderTop: '1px solid var(--b3)',
        transition: 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={() => onOpenDetail(activeSong.id)}
    >
      {/* Progress bar — clickable for seeking */}
      <div
        className="absolute top-0 left-0 right-0 h-[12px] -mt-[4px] cursor-pointer z-10"
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = ((e.clientX - rect.left) / rect.width) * 100;
          seek(Math.max(0, Math.min(100, percent)));
        }}
      >
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'var(--b3)' }}>
          <div
            className={`h-full transition-[width] duration-300 ${isPlaying ? 'animate-progress-shimmer' : ''}`}
            style={{ width: `${progress}%`, background: isPlaying ? undefined : 'var(--acid)' }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-[8px]">
        {/* Play/Pause */}
        <button
          onClick={(e) => { e.stopPropagation(); toggle(activeSong); }}
          className={`w-[32px] h-[32px] rounded-full flex items-center justify-center text-[13px] flex-shrink-0 cursor-pointer border-none ${
            isPlaying ? 'animate-pulse-glow' : ''
          }`}
          style={{ background: 'var(--acid)', color: 'var(--black)' }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Song info */}
        <div className="flex-1 min-w-0">
          <div className="truncate text-[13px] tracking-[1px]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#FFFFFF' }}>
            {activeSong.title}
          </div>
          <div className="truncate text-[8px] tracking-[0.5px]"
            style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.4)' }}>
            {activeSong.writers.join(' · ')}
          </div>
        </div>

        {/* Info button */}
        <button
          onClick={(e) => { e.stopPropagation(); onOpenDetail(activeSong.id); }}
          className="text-[8px] tracking-[1px] uppercase px-[8px] py-[4px] rounded cursor-pointer border-none"
          style={{ fontFamily: "'DM Mono', monospace", background: 'var(--b3)', color: 'rgba(255,255,255,0.5)', border: '1px solid var(--b4)' }}
        >
          Info
        </button>
      </div>
    </div>
  );
}
