'use client';

import { Song } from '@/data/types';
import BottomSheet from './BottomSheet';
import { useStore } from '@/lib/store';

const CERTIFICATIONS = [
  { name: 'Publisher PPA Signed', sub: 'All publisher rights pre-cleared for sale' },
  { name: 'No Uncleared Samples', sub: '100% original composition — no samples' },
  { name: 'Contract: Loeb & Loeb LLP', sub: 'Standardized sale agreement on file' },
  { name: 'PRO Registration Verified', sub: 'ASCAP / BMI / SESAC registration confirmed' },
  { name: 'Writer Credits Fixed', sub: 'Immutable credits logged in the unit ledger' },
  { name: 'Master Separation Confirmed', sub: 'Composition sold separately from demo master' },
];

interface RightsPassportSheetProps {
  song: Song | null;
  open: boolean;
  onClose: () => void;
}

export default function RightsPassportSheet({ song, open, onClose }: RightsPassportSheetProps) {
  const { showToast } = useStore();

  if (!song) return null;

  const handleCopy = () => {
    const txt = `HEARD — RIGHTS PASSPORT\n"${song.title}"\n\n` +
      CERTIFICATIONS.map(c => `✓ ${c.name}\n  ${c.sub}`).join('\n\n') +
      '\n\nDrafted by Loeb & Loeb LLP · heard.com';
    navigator.clipboard.writeText(txt).catch(() => {});
    onClose();
    showToast('Rights Passport copied — paste it to your attorney.');
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div>
        {/* Header */}
        <div className="px-5 pt-5 pb-4" style={{ background: '#1a3a2a' }}>
          <div className="text-[8px] tracking-[2px] uppercase mb-1" style={{ fontFamily: "'DM Mono', monospace", color: '#4ade80' }}>
            ✓ Rights Verified
          </div>
          <div className="text-[24px] tracking-[2px] leading-none mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'white' }}>
            {song.title}
          </div>
          <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
            All certifications cleared prior to listing.
          </div>
        </div>

        {/* Certifications */}
        <div className="px-5 py-4">
          {CERTIFICATIONS.map((cert, i) => (
            <div key={i} className="flex items-start gap-3 py-3" style={{ borderBottom: i < CERTIFICATIONS.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="w-[24px] h-[24px] rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-[2px]"
                style={{ background: 'rgba(42,122,42,0.1)', color: '#2a7a2a', border: '1px solid rgba(42,122,42,0.2)' }}>
                ✓
              </div>
              <div>
                <div className="text-[12px] font-medium mb-[2px]">{cert.name}</div>
                <div className="text-[10px]" style={{ color: '#6a6660' }}>{cert.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button onClick={handleCopy}
            className="w-full py-[14px] rounded-xl text-[10px] tracking-[1.5px] uppercase cursor-pointer border-none mb-2"
            style={{ fontFamily: "'DM Mono', monospace", background: '#1a3a2a', color: '#4ade80' }}>
            ⎘ Copy for Your Attorney
          </button>
          <button onClick={onClose}
            className="w-full py-[10px] text-[10px] tracking-[1px] uppercase cursor-pointer bg-transparent border-none"
            style={{ fontFamily: "'DM Mono', monospace", color: 'var(--muted)' }}>
            Close
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
