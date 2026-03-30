'use client';

import BottomSheet from './BottomSheet';
import { useStore } from '@/lib/store';

interface SortSheetProps {
  open: boolean;
  onClose: () => void;
}

const SORT_OPTIONS = [
  { key: 'default', label: 'Default' },
  { key: 'closing', label: 'Closing Soonest' },
  { key: 'bpm-low', label: 'BPM Low → High' },
  { key: 'bpm-high', label: 'BPM High → Low' },
  { key: 'writer-az', label: 'Writer A–Z' },
];

export default function SortSheet({ open, onClose }: SortSheetProps) {
  const { sortMode, setSortMode } = useStore();

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="p-5">
        <div className="text-[22px] tracking-[2px] mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          Sort Songs
        </div>
        <div className="flex flex-col gap-1">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => { setSortMode(opt.key); onClose(); }}
              className="flex items-center justify-between px-3 py-[12px] rounded-lg cursor-pointer border-none text-left"
              style={{
                background: sortMode === opt.key ? 'var(--black)' : 'var(--th-white)',
                color: sortMode === opt.key ? 'var(--acid)' : 'var(--black)',
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                letterSpacing: 0.5,
              }}
            >
              {opt.label}
              {sortMode === opt.key && <span>✓</span>}
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
