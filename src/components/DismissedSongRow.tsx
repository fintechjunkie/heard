'use client';

import { Song } from '@/data/types';
import { useStore } from '@/lib/store';

interface DismissedSongRowProps {
  song: Song;
  onExpand: (songId: number) => void;
}

/**
 * A song the user has marked "No Interest": one slim line instead of the full
 * card, so a long bank stays scannable without losing the song. Tapping opens
 * the full card, where the same button puts it back.
 */
export default function DismissedSongRow({ song, onExpand }: DismissedSongRowProps) {
  const { toggleNoInterest, showToast } = useStore();

  return (
    <div
      onClick={() => onExpand(song.id)}
      className="flex items-center gap-3 px-4 py-[10px] cursor-pointer"
      style={{ background: 'var(--th-white)' }}
    >
      <div className="flex-1 min-w-0">
        <div
          className="text-[15px] tracking-[1px] leading-none truncate"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'var(--muted)' }}
        >
          {song.title}
        </div>
        <div className="text-micro truncate mt-[2px]" style={{ color: 'var(--muted-l)' }}>
          {song.writers.join(' · ')}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleNoInterest(song.id);
          showToast(`"${song.title}" back in the bank.`);
        }}
        className="flex-shrink-0 px-[9px] py-[4px] rounded-full text-micro tracking-[1px] uppercase cursor-pointer"
        style={{
          fontFamily: "'DM Mono', monospace",
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--muted)',
        }}
      >
        Restore
      </button>

      <span className="flex-shrink-0" style={{ color: 'var(--muted-l)', fontSize: 13 }}>›</span>
    </div>
  );
}
