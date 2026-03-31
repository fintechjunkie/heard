'use client';

import { Song } from '@/data/types';
import { MEMBERS } from '@/data/members';
import BottomSheet from './BottomSheet';
import Waveform from './Waveform';
// Player functionality handled by Waveform component internally

interface SongDetailSheetProps {
  song: Song | null;
  open: boolean;
  onClose: () => void;
  onReserve: (songId: number) => void;
  onBuy: (songId: number) => void;
  onShare: (songId: number) => void;
  onOpenProfile: (memberId: number) => void;
}

export default function SongDetailSheet({
  song, open, onClose, onReserve, onBuy, onShare, onOpenProfile,
}: SongDetailSheetProps) {
  if (!song) return null;

  const songWriters = song.writer_ids.map(id => MEMBERS.find(m => m.id === id)).filter(Boolean);

  return (
    <BottomSheet open={open} onClose={onClose} fullHeight>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Black header */}
        <div style={{ background: 'var(--black)', padding: '20px 20px 16px' }}>
          <div className="text-[8px] tracking-[2px] uppercase mb-1"
            style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.45)' }}>
            {song.genre} · {song.bpm} BPM · {song.key}
          </div>
          <div className="text-[32px] tracking-[2px] leading-none mb-1"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'var(--th-white)' }}>
            {song.title}
          </div>
          <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {song.writers.join(' · ')}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ background: 'var(--cream)' }}>
          {/* Preview waveform */}
          <div className="p-5">
            <div className="text-[8px] tracking-[2px] uppercase mb-2" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650' }}>Preview</div>
            <Waveform song={song} barCount={52} height={48} />
          </div>

          {/* Songwriters & Producers */}
          <div className="px-5 pb-4">
            <div className="text-[8px] tracking-[2px] uppercase mb-2" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650' }}>
              Songwriters & Producers
            </div>
            {songWriters.map(member => member && (
              <div key={member.id}
                className="flex items-center gap-3 py-[10px] cursor-pointer"
                style={{ borderBottom: '1px solid var(--border)' }}
                onClick={() => { onClose(); setTimeout(() => onOpenProfile(member.id), 100); }}
              >
                <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    background: `${member.color}22`,
                    color: member.color,
                    border: `1px solid ${member.color}55`,
                  }}>
                  {member.initials}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium" style={{ color: 'var(--black)' }}>{member.name}</div>
                  <div className="text-[10px]" style={{ fontFamily: "'DM Mono', monospace", color: '#6a6660' }}>{member.role}</div>
                </div>
                <span style={{ color: 'var(--muted-l)', fontSize: 14 }}>›</span>
              </div>
            ))}
          </div>

          {/* Song Details */}
          <div className="px-5 pb-4">
            <div className="text-[8px] tracking-[2px] uppercase mb-2" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650' }}>
              Song Details
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {[
                ['Genre', song.genre],
                ['BPM', song.bpm.toString()],
                ['Key', song.key],
                ['Mood', song.mood.join(' · ')],
                ['Available', song.status === 'purchased' ? 'Purchased' : 'Yes'],
                ...(song.days_in_bank <= 30 && song.status !== 'purchased'
                  ? [['Added', `${song.days_in_bank} days ago · Brand New`]]
                  : []),
              ].map(([label, value], i) => (
                <div key={i} className="flex items-center justify-between px-3 py-[9px]"
                  style={{ background: 'var(--th-white)', borderBottom: '1px solid var(--border)' }}>
                  <span className="text-[10px]" style={{ fontFamily: "'DM Mono', monospace", color: '#6a6660' }}>{label}</span>
                  <span className="text-[11px] font-medium" style={{
                    color: label === 'Added' ? 'var(--amber)' : label === 'Available' && value === 'Yes' ? '#2a7a2a' : 'var(--black)',
                  }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What You Receive */}
          <div className="px-5 pb-4">
            <div className="text-[8px] tracking-[2px] uppercase mb-2" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650' }}>
              What You Receive
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {[
                ['Rights', 'Full Assignment'],
                ['Territories', 'Worldwide · All Formats'],
                ['Contract', 'Standardized'],
                ['Close Time', '48 Hours'],
                ['Tier 1 Closes', `${song.tier1_days_remaining} Days`],
              ].map(([label, value], i) => (
                <div key={i} className="flex items-center justify-between px-3 py-[9px]"
                  style={{ background: 'var(--th-white)', borderBottom: '1px solid var(--border)' }}>
                  <span className="text-[10px]" style={{ fontFamily: "'DM Mono', monospace", color: '#6a6660' }}>{label}</span>
                  <span className="text-[11px] font-medium" style={{ color: 'var(--black)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Spacer for CTAs */}
          <div className="h-[180px]" />
        </div>

        {/* Footer CTAs */}
        <div className="flex-shrink-0 flex flex-col gap-2 px-5 pb-5 pt-3" style={{ background: 'var(--th-white)', borderTop: '1px solid var(--border)' }}>
          <button onClick={() => { onClose(); onShare(song.id); }}
            className="w-full py-[12px] rounded-xl text-[10px] tracking-[1.5px] uppercase cursor-pointer"
            style={{ fontFamily: "'DM Mono', monospace", background: 'var(--b3)', color: 'var(--th-white)', border: 'none' }}>
            Share with Team
          </button>
          <button onClick={() => { onClose(); onReserve(song.id); }}
            className="w-full py-[12px] rounded-xl text-[10px] tracking-[1.5px] uppercase cursor-pointer"
            style={{ fontFamily: "'DM Mono', monospace", background: 'var(--sky)', color: 'var(--black)', border: 'none' }}>
            Reserve · 72-Hour Hold
          </button>
          <button onClick={() => { onClose(); onBuy(song.id); }}
            className="w-full py-[12px] rounded-xl text-[10px] tracking-[1.5px] uppercase cursor-pointer"
            style={{ fontFamily: "'DM Mono', monospace", background: 'var(--coral)', color: 'white', border: 'none' }}>
            Buy Now — $85,000
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
