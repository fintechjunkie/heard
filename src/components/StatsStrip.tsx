'use client';

import { useStore } from '@/lib/store';

export default function StatsStrip() {
  const { getStats } = useStore();
  const stats = getStats();

  const cells = [
    { val: stats.available.toString(), label: 'Avail', cls: 'acid' },
    { val: stats.held.toString(), label: 'Held', cls: 'sky' },
    { val: stats.bought.toString(), label: 'Bought', cls: 'violet' },
    { val: '$85K', label: 'Price', cls: 'dark' },
  ];

  return (
    <div className="flex gap-[1px] mx-5 mb-4 rounded-[10px] overflow-hidden" style={{ background: 'var(--border)', border: '1px solid var(--border)' }}>
      {cells.map((c, i) => (
        <div key={i} className="flex-1 px-3 py-[10px]"
          style={{
            background: c.cls === 'dark' ? 'var(--black)' : 'var(--th-white)',
            borderTop: `3px solid ${
              c.cls === 'acid' ? 'var(--acid)' :
              c.cls === 'sky' ? 'var(--sky)' :
              c.cls === 'violet' ? 'var(--violet)' :
              'var(--coral)'
            }`,
          }}>
          <div className="text-[22px] tracking-[1.5px] leading-none"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              color: c.cls === 'dark' ? 'var(--acid)' : 'var(--black)',
            }}>
            {c.val}
          </div>
          <div className="text-[7px] tracking-[1.5px] uppercase mt-[2px]"
            style={{
              fontFamily: "'DM Mono', monospace",
              fontWeight: 500,
              color: c.cls === 'dark' ? 'rgba(255,255,255,0.5)' : '#6a6660',
            }}>
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}
