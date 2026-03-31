'use client';

import { useState, useEffect } from 'react';

interface HoldCountdownProps {
  reservedUntil: string | null;
  compact?: boolean;
}

export default function HoldCountdown({ reservedUntil, compact }: HoldCountdownProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!reservedUntil) return;

    const update = () => {
      const now = Date.now();
      const end = new Date(reservedUntil).getTime();
      const diff = Math.max(0, end - now);

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [reservedUntil]);

  if (!reservedUntil) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: 'rgba(90,180,255,0.1)', border: '1px solid rgba(90,180,255,0.25)' }}>
        <span className="text-[8px] tracking-[1.5px] uppercase" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--sky)' }}>
          Hold expires in
        </span>
        <span className="text-[14px] tracking-[2px] font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'var(--sky)' }}>
          {timeLeft}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl px-4 py-3" style={{ background: 'var(--b2)', border: '1px solid var(--b3)' }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[8px] tracking-[2px] uppercase mb-[3px]" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.5)' }}>
            Hold Expires In
          </div>
          <div className="text-[32px] tracking-[2px] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'var(--acid)' }}>
            {timeLeft}
          </div>
        </div>
        <div className="text-[10px] text-right max-w-[110px]" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
          Song is off-market. 72 hours to complete.
        </div>
      </div>
    </div>
  );
}
