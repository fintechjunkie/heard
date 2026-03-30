'use client';

import { MEMBERS } from '@/data/members';
import { useStore } from '@/lib/store';

interface WritersTabProps {
  onOpenProfile: (memberId: number) => void;
}

export default function WritersTab({ onOpenProfile }: WritersTabProps) {
  const { songs } = useStore();

  return (
    <div className="p-5">
      <div className="text-[38px] tracking-[2px] leading-[0.95] mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
        The Collective
      </div>
      <div className="text-[11px] mb-5" style={{ color: '#6a6660' }}>
        {MEMBERS.length} members · Award-winning songwriters & producers
      </div>

      <div className="flex flex-col gap-[1px] rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--border)' }}>
        {MEMBERS.map(member => {
          const inBank = songs.filter(s => s.writer_ids.includes(member.id) && s.status !== 'purchased').length;
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 active:bg-cream"
              style={{ background: 'var(--th-white)' }}
              onClick={() => onOpenProfile(member.id)}
            >
              <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  background: `${member.color}22`,
                  color: member.color,
                  border: `1px solid ${member.color}55`,
                }}>
                {member.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium">{member.name}</div>
                <div className="text-[10px]" style={{ fontFamily: "'DM Mono', monospace", color: '#6a6660' }}>
                  {member.role} · {member.streams} streams
                </div>
              </div>
              {inBank > 0 && (
                <span className="px-[8px] py-[3px] rounded-full text-[7px] tracking-[1px] uppercase"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    background: 'var(--acid)',
                    color: 'var(--black)',
                  }}>
                  {inBank} in bank
                </span>
              )}
              <span style={{ color: 'var(--muted-l)', fontSize: 14 }}>›</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
