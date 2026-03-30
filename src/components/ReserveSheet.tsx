'use client';

import { Song } from '@/data/types';
import BottomSheet from './BottomSheet';
import { useStore } from '@/lib/store';

interface ReserveSheetProps {
  song: Song | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (songId: number) => void;
}

export default function ReserveSheet({ song, open, onClose, onConfirm }: ReserveSheetProps) {
  if (!song) return null;

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="p-5">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-[8px] tracking-[2px] uppercase mb-1" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--muted)' }}>
            Reserve Song
          </div>
          <div className="text-[28px] tracking-[2px]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{song.title}</div>
          <div className="text-[11px]" style={{ color: '#6a6660' }}>{song.writers.join(' · ')}</div>
        </div>

        {/* Timer box */}
        <div className="rounded-xl p-5 mb-4 text-center" style={{ background: 'var(--black)' }}>
          <div className="text-[48px] tracking-[3px] leading-none mb-1"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'var(--acid)' }}>
            72:00:00
          </div>
          <div className="text-[8px] tracking-[2px] uppercase"
            style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.5)' }}>
            Hold Duration
          </div>
          <div className="text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Song goes off-market immediately
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-[1px] rounded-xl overflow-hidden mb-4" style={{ background: 'var(--border)' }}>
          {[
            ['Genre', song.genre],
            ['BPM', `${song.bpm} BPM`],
            ['Key', song.key],
            ['Price', '$85,000'],
          ].map(([label, value], i) => (
            <div key={i} className="px-3 py-[10px]" style={{ background: 'var(--th-white)' }}>
              <div className="text-[7px] tracking-[1.5px] uppercase mb-[2px]" style={{ fontFamily: "'DM Mono', monospace", color: '#6a6660' }}>{label}</div>
              <div className="text-[13px] font-medium" style={{ color: i === 3 ? 'var(--sky)' : 'var(--black)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-center mb-5" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
          Reserving does not obligate purchase. Song auto-relists after 72 hours if not purchased.
        </p>

        {/* CTA */}
        <button
          onClick={() => onConfirm(song.id)}
          className="w-full py-[14px] rounded-xl text-[10px] tracking-[1.5px] uppercase cursor-pointer border-none"
          style={{ fontFamily: "'DM Mono', monospace", background: 'var(--sky)', color: 'var(--black)' }}>
          Confirm Reserve
        </button>
        <button onClick={onClose}
          className="w-full py-[10px] mt-2 text-[10px] tracking-[1px] uppercase cursor-pointer bg-transparent border-none"
          style={{ fontFamily: "'DM Mono', monospace", color: 'var(--muted)' }}>
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
}
