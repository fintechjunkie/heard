'use client';

import BottomSheet from './BottomSheet';
import { useStore } from '@/lib/store';
import { FEATURES } from '@/lib/features';

interface SortSheetProps {
  open: boolean;
  onClose: () => void;
}

const SORT_OPTIONS = [
  { key: 'default', label: 'Default' },
  { key: 'title-az', label: 'Title A–Z' },
  { key: 'genre', label: 'Genre' },
  { key: 'pocket', label: 'Crate First' },
  { key: 'writer-az', label: 'Writer A–Z' },
  { key: 'bpm-low', label: 'BPM Low → High' },
  { key: 'bpm-high', label: 'BPM High → Low' },
  // Closing Soonest is a Tier-1 window concept, so it rides with commerce.
  ...(FEATURES.commerce ? [{ key: 'closing', label: 'Closing Soonest' }] : []),
];

export default function SortSheet({ open, onClose }: SortSheetProps) {
  const { sortMode, setSortMode } = useStore();

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="pt-2 pb-5">
        {/* Grab handle, so the sheet reads as a sheet */}
        <div className="w-[36px] h-[4px] rounded-full mx-auto mb-3" style={{ background: 'var(--border)' }} />

        <div className="flex items-center justify-between px-5 mb-3">
          <div className="text-[22px] tracking-[2px] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            Sort Songs
          </div>
          <button onClick={onClose}
            className="w-[28px] h-[28px] rounded-full flex items-center justify-center cursor-pointer text-[13px]"
            style={{ background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-[6px] px-5">
          {SORT_OPTIONS.map(opt => {
            const selected = sortMode === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => { setSortMode(opt.key); onClose(); }}
                className="flex items-center justify-between px-[14px] py-[12px] rounded-lg cursor-pointer text-left"
                style={{
                  // Unselected rows previously used the same colour as the
                  // sheet itself, leaving them with no edge at all.
                  background: selected ? 'var(--black)' : 'var(--cream)',
                  border: `1px solid ${selected ? 'var(--black)' : 'var(--border)'}`,
                  color: selected ? 'var(--acid)' : 'var(--black)',
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 15,
                  letterSpacing: 0.5,
                }}
              >
                {opt.label}
                {selected && <span>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
}
