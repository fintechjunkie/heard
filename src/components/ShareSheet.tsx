'use client';

import { useState } from 'react';
import { Song } from '@/data/types';
import BottomSheet from './BottomSheet';
import { useStore } from '@/lib/store';

interface ShareSheetProps {
  song: Song | null;
  open: boolean;
  onClose: () => void;
}

const MOCK_RECIPIENTS = [
  { initials: 'SA', name: 'Sarah A.', role: 'A&R · Atlantic', color: '#5AB4FF' },
  { initials: 'DL', name: 'David L.', role: 'Artist Manager (Co.)', color: '#FFB830' },
];

export default function ShareSheet({ song, open, onClose }: ShareSheetProps) {
  const { showToast } = useStore();
  const [email, setEmail] = useState('');
  const [recipients, setRecipients] = useState(MOCK_RECIPIENTS);

  const handleAdd = () => {
    if (!email.trim()) return;
    const initials = email.split('@')[0].slice(0, 2).toUpperCase();
    setRecipients([...recipients, { initials, name: email, role: 'Pending', color: 'var(--muted)' }]);
    setEmail('');
  };

  const handleSend = () => {
    onClose();
    showToast(song ? 'Song shared with your team.' : 'Song Bank shared with your team.');
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="p-5">
        <div className="text-[8px] tracking-[2px] uppercase mb-1" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--muted)' }}>
          {song ? `Sharing: ${song.title}` : 'Sharing the full Song Bank'}
        </div>
        <div className="text-[22px] tracking-[2px] mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          Share with Team
        </div>

        {/* Email input */}
        <div className="flex gap-2 mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="flex-1 px-3 py-[10px] rounded-lg text-[13px] outline-none"
            style={{ background: 'var(--th-white)', border: '1px solid var(--border)', fontFamily: "'DM Sans', sans-serif" }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd}
            className="px-3 py-[10px] rounded-lg text-[9px] tracking-[1px] uppercase cursor-pointer border-none"
            style={{ fontFamily: "'DM Mono', monospace", background: 'var(--black)', color: 'var(--th-white)' }}>
            + Add
          </button>
        </div>

        {/* Recipients */}
        <div className="flex flex-col gap-2 mb-4 max-h-[200px] overflow-y-auto scrollbar-hide">
          {recipients.map((r, i) => (
            <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: 'var(--th-white)', border: '1px solid var(--border)' }}>
              <div className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[9px] font-medium flex-shrink-0"
                style={{ fontFamily: "'DM Mono', monospace", background: `${r.color}22`, color: r.color }}>
                {r.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium truncate">{r.name}</div>
                <div className="text-[9px]" style={{ fontFamily: "'DM Mono', monospace", color: '#6a6660' }}>{r.role}</div>
              </div>
              <button onClick={() => setRecipients(recipients.filter((_, j) => j !== i))}
                className="text-[12px] cursor-pointer bg-transparent border-none" style={{ color: 'var(--muted)' }}>✕</button>
            </div>
          ))}
        </div>

        {/* Note */}
        <textarea
          placeholder="Add a note (optional)"
          rows={2}
          className="w-full px-3 py-[10px] rounded-lg text-[13px] outline-none resize-none mb-4"
          style={{ background: 'var(--th-white)', border: '1px solid var(--border)', fontFamily: "'DM Sans', sans-serif" }}
        />

        <button onClick={handleSend}
          className="w-full py-[14px] rounded-xl text-[10px] tracking-[1.5px] uppercase cursor-pointer border-none"
          style={{ fontFamily: "'DM Mono', monospace", background: 'var(--sky)', color: 'var(--black)' }}>
          Send to Team
        </button>
      </div>
    </BottomSheet>
  );
}
