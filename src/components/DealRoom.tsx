'use client';

import { useState, useEffect, useRef } from 'react';
import { Song } from '@/data/types';
import { DEAL_ROOM_TEAM } from '@/data/users';
import { useStore } from '@/lib/store';

interface DealRoomProps {
  song: Song | null;
  open: boolean;
  onClose: () => void;
  onReserve: (songId: number) => void;
  onBuy: (songId: number) => void;
}

function formatCountdown(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function DealRoom({ song, open, onClose, onReserve, onBuy }: DealRoomProps) {
  const { dealRoomReaction, setDealRoomReaction, dealRoomNote, setDealRoomNote, showToast } = useStore();
  const [countdown, setCountdown] = useState(68 * 3600 + 24 * 60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isHeld = song?.status === 'reserved';

  useEffect(() => {
    if (open && isHeld) {
      setCountdown(68 * 3600 + 24 * 60);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            showToast('Hold expired — song is back on the market.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, isHeld, showToast]);

  if (!song) return null;

  // Calculate consensus
  const votes = { yes: 1, maybe: 1, no: 0, waiting: dealRoomReaction ? 1 : 2 };
  if (dealRoomReaction === 'yes') { votes.yes++; votes.waiting--; }
  else if (dealRoomReaction === 'maybe') { votes.maybe++; votes.waiting--; }
  else if (dealRoomReaction === 'no') { votes.no++; votes.waiting--; }
  const total = 4;

  return (
    <div
      className="absolute inset-0 z-[160] flex flex-col overflow-hidden"
      style={{
        background: 'var(--cream)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: open
          ? 'transform 380ms cubic-bezier(0.16, 1, 0.3, 1)'
          : 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Nav */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3" style={{ background: 'var(--black)' }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-[18px] cursor-pointer bg-transparent border-none" style={{ color: '#FFFFFF' }}>←</button>
          <span className="text-[14px] font-medium" style={{ fontFamily: "'DM Mono', monospace", color: '#FFFFFF' }}>Deal Room</span>
        </div>
        <button onClick={onClose} className="w-[28px] h-[28px] rounded-full flex items-center justify-center cursor-pointer border-none text-[12px]"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-[120px]">
        {/* Song Hero */}
        <div className="px-5 py-5" style={{ background: 'var(--black)' }}>
          <div className="text-[8px] tracking-[2px] uppercase mb-1" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.45)' }}>Evaluating</div>
          <div className="text-[32px] tracking-[2px] leading-none mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#FFFFFF' }}>{song.title}</div>
          <div className="text-[11px] mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>{song.writers.join(' · ')}</div>

          {/* Hold box */}
          {isHeld ? (
            <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'var(--b2)', border: '1px solid var(--b3)' }}>
              <div>
                <div className="text-[8px] tracking-[2px] uppercase mb-[3px]" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.5)' }}>Hold Expires In</div>
                <div className="text-[32px] tracking-[2px] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'var(--acid)' }}>{formatCountdown(countdown)}</div>
              </div>
              <div className="text-[10px] text-right max-w-[110px]" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>Song is off-market. 72 hours to complete.</div>
            </div>
          ) : (
            <div className="flex items-center gap-[10px] rounded-xl px-4 py-3" style={{ background: 'var(--b2)', border: '1px solid var(--b3)' }}>
              <span className="text-[18px]">◷</span>
              <div className="text-[11px] flex-1" style={{ color: 'rgba(255,255,255,0.58)', lineHeight: 1.5 }}>
                No hold placed yet. Reserve to lock this song for 72 hours while your team decides.
              </div>
            </div>
          )}
        </div>

        {/* Consensus */}
        <div className="mx-5 mt-[14px] rounded-xl p-4" style={{ background: 'var(--th-white)', border: '1px solid var(--border)' }}>
          <div className="text-[8px] tracking-[2px] uppercase mb-[10px]" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650', fontWeight: 500 }}>
            Team Consensus · {total} Members
          </div>
          <div className="flex gap-[2px] h-[6px] rounded-full overflow-hidden mb-2">
            <div className="rounded-l-[3px] transition-[flex] duration-500" style={{ flex: votes.yes, background: '#2a7a2a' }} />
            <div className="transition-[flex] duration-500" style={{ flex: votes.maybe, background: 'var(--amber)' }} />
            <div className="transition-[flex] duration-500" style={{ flex: votes.no, background: 'var(--coral)' }} />
            <div className="rounded-r-[3px] transition-[flex] duration-500" style={{ flex: votes.waiting, background: 'var(--border)' }} />
          </div>
          <div className="flex gap-3">
            {[
              { label: 'Yes', count: votes.yes, color: '#2a7a2a' },
              { label: 'Maybe', count: votes.maybe, color: 'var(--amber)' },
              { label: 'Pass', count: votes.no, color: 'var(--coral)' },
              { label: 'Waiting', count: votes.waiting, color: 'var(--border)' },
            ].map(v => (
              <div key={v.label} className="flex items-center gap-1" style={{ fontFamily: "'DM Mono', monospace", fontSize: 7.5, color: '#6a6660' }}>
                <div className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: v.color }} />
                {v.label} {v.count}
              </div>
            ))}
          </div>
        </div>

        {/* Team Members */}
        <div className="px-5 pt-[14px]">
          <div className="text-[8px] tracking-[3px] uppercase mb-[10px]" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650', fontWeight: 500 }}>Team</div>
          {DEAL_ROOM_TEAM.map((m, i) => (
            <div key={i} className="rounded-xl p-[13px] mb-2" style={{ background: 'var(--th-white)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-[10px] mb-[10px]">
                <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[9px] font-medium flex-shrink-0"
                  style={{ fontFamily: "'DM Mono', monospace", background: `${m.color}22`, color: m.color }}>
                  {m.initials}
                </div>
                <div>
                  <div className="text-[13px] font-medium" style={{ color: 'var(--black)' }}>{m.name}</div>
                  <div className="text-[10px]" style={{ fontFamily: "'DM Mono', monospace", color: '#6a6660' }}>{m.role}</div>
                </div>
                <div className="ml-auto">
                  <span className={`inline-flex items-center gap-[5px] px-[9px] py-1 rounded-full text-[8px] tracking-[1px] uppercase ${
                    m.reaction === 'yes' ? '' : m.reaction === 'maybe' ? '' : m.reaction === 'no' ? '' : ''
                  }`} style={{
                    fontFamily: "'DM Mono', monospace",
                    ...(m.reaction === 'yes' ? { background: 'rgba(42,122,42,0.1)', border: '1px solid rgba(42,122,42,0.3)', color: '#2a7a2a' } :
                       m.reaction === 'maybe' ? { background: 'rgba(255,184,48,0.1)', border: '1px solid rgba(255,184,48,0.3)', color: '#9a7000' } :
                       m.reaction === 'no' ? { background: 'rgba(255,104,72,0.08)', border: '1px solid rgba(255,104,72,0.3)', color: 'var(--coral)' } :
                       { background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--muted-l)' }),
                  }}>
                    {m.reaction === 'yes' ? '✓ Yes' : m.reaction === 'maybe' ? '〰 Maybe' : m.reaction === 'no' ? '✗ Pass' : 'Waiting'}
                  </span>
                </div>
              </div>
              {m.note && (
                <div className="text-[11px] px-[10px] py-2 rounded-md" style={{ background: 'var(--cream)', color: 'var(--muted)', fontWeight: 300, lineHeight: 1.5 }}>{m.note}</div>
              )}
              {m.artistFlag && (
                <div className="flex items-center gap-[6px] px-[10px] py-2 rounded-lg mt-[2px]" style={{ background: 'rgba(181,123,255,0.06)', border: '1px solid rgba(181,123,255,0.2)' }}>
                  <span className="text-[14px]">♥</span>
                  <span className="text-[11px]" style={{ color: 'rgba(181,123,255,0.9)', lineHeight: 1.4 }}>Flagged this song {m.flagTime} — no other notes yet.</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* My Reaction */}
        <div className="px-5 pt-[14px]">
          <div className="text-[8px] tracking-[3px] uppercase mb-[10px]" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650', fontWeight: 500 }}>My Reaction</div>
          <div className="rounded-xl p-[13px]" style={{ background: 'var(--th-white)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-[10px] mb-[10px]">
              <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[9px] font-medium flex-shrink-0"
                style={{ fontFamily: "'DM Mono', monospace", background: 'var(--acid)', color: 'var(--black)' }}>MJ</div>
              <div>
                <div className="text-[13px] font-medium">Marcus Johnson</div>
                <div className="text-[10px]" style={{ fontFamily: "'DM Mono', monospace", color: '#6a6660' }}>Artist Manager</div>
              </div>
              <div className="ml-auto">
                <span className="inline-flex items-center gap-[5px] px-[9px] py-1 rounded-full text-[8px] tracking-[1px] uppercase"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    ...(dealRoomReaction === 'yes' ? { background: 'rgba(42,122,42,0.1)', border: '1px solid rgba(42,122,42,0.3)', color: '#2a7a2a' } :
                       dealRoomReaction === 'maybe' ? { background: 'rgba(255,184,48,0.1)', border: '1px solid rgba(255,184,48,0.3)', color: '#9a7000' } :
                       dealRoomReaction === 'no' ? { background: 'rgba(255,104,72,0.08)', border: '1px solid rgba(255,104,72,0.3)', color: 'var(--coral)' } :
                       { background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--muted-l)' }),
                  }}>
                  {dealRoomReaction === 'yes' ? '✓ Yes' : dealRoomReaction === 'maybe' ? '〰 Maybe' : dealRoomReaction === 'no' ? '✗ Pass' : 'Reviewing'}
                </span>
              </div>
            </div>

            {/* Reaction buttons */}
            <div className="flex gap-[6px] mb-[9px]">
              {[
                { key: 'yes', label: '✓ Yes', style: { borderColor: 'rgba(42,122,42,0.4)', background: 'rgba(42,122,42,0.08)', color: '#2a7a2a' } },
                { key: 'maybe', label: '〰 Maybe', style: { borderColor: 'rgba(255,184,48,0.4)', background: 'rgba(255,184,48,0.08)', color: '#8a6000' } },
                { key: 'no', label: '✗ Pass', style: { borderColor: 'rgba(255,104,72,0.35)', background: 'rgba(255,104,72,0.06)', color: 'var(--coral)' } },
              ].map(btn => (
                <button
                  key={btn.key}
                  onClick={() => setDealRoomReaction(dealRoomReaction === btn.key ? null : btn.key)}
                  className="flex-1 py-[9px] rounded-lg text-[8px] tracking-[1px] uppercase text-center cursor-pointer transition-all duration-150"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    border: `1px solid ${dealRoomReaction === btn.key ? btn.style.borderColor : 'var(--border)'}`,
                    background: dealRoomReaction === btn.key ? btn.style.background : 'var(--cream)',
                    color: dealRoomReaction === btn.key ? btn.style.color : 'var(--muted)',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Note input */}
            <textarea
              value={dealRoomNote}
              onChange={(e) => setDealRoomNote(e.target.value)}
              placeholder={
                dealRoomReaction === 'yes' ? 'What makes this the one…' :
                dealRoomReaction === 'maybe' ? 'What needs to be right…' :
                dealRoomReaction === 'no' ? "Why it's not right…" :
                'Add a note for your team…'
              }
              rows={2}
              className="w-full px-3 py-[9px] rounded-lg text-[12px] outline-none resize-none"
              style={{
                background: 'var(--cream)',
                border: '1px solid var(--border)',
                fontFamily: "'DM Sans', sans-serif",
                color: 'var(--black)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer CTAs */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-2 px-5 pb-5 pt-3" style={{ background: '#F2EDE3', borderTop: '1px solid var(--border)', boxShadow: '0 -8px 20px rgba(0,0,0,0.08)' }}>
        <button
          onClick={() => { onClose(); setTimeout(() => onReserve(song.id), 100); }}
          className="w-full py-[12px] rounded-xl text-[10px] tracking-[1.5px] uppercase cursor-pointer border-none"
          style={{
            fontFamily: "'DM Mono', monospace",
            background: 'var(--sky)',
            color: 'var(--black)',
            opacity: isHeld ? 0.5 : 1,
          }}
          disabled={isHeld}
        >
          {isHeld ? '⏱ Hold Active' : 'Reserve · 72-Hour Hold'}
        </button>
        <button
          onClick={() => { onClose(); setTimeout(() => onBuy(song.id), 100); }}
          className="w-full py-[12px] rounded-xl text-[10px] tracking-[1.5px] uppercase cursor-pointer border-none"
          style={{ fontFamily: "'DM Mono', monospace", background: 'var(--coral)', color: 'white' }}>
          Buy Now — $85,000
        </button>
      </div>
    </div>
  );
}
