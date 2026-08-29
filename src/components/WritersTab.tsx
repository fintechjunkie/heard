'use client';

import { useStore } from '@/lib/store';
import { FEATURES } from '@/lib/features';

interface WritersTabProps {
  onOpenProfile: (memberId: number) => void;
}

export default function WritersTab({ onOpenProfile }: WritersTabProps) {
  const { songs, members } = useStore();

  return (
    <div className="p-5">
      <div className="text-[38px] tracking-[2px] leading-[0.95] mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
        The Collective
      </div>
      <div className="text-body mb-5" style={{ color: '#6a6660' }}>
        {members.length} members · Award-winning songwriters & producers
      </div>

      <div className="flex flex-col gap-[1px] rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--border)' }}>
        {members.map((member, i) => {
          const inBank = songs.filter(s => s.writer_ids.includes(member.id) && s.status !== 'purchased').length;
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 active:bg-cream border-l-[3px]"
              style={{
                background: i % 2 === 0 ? 'var(--th-white)' : '#F6F2E8',
                borderLeftColor: member.color,
              }}
              onClick={() => onOpenProfile(member.id)}
            >
              {member.avatar_url ? (
                <img src={member.avatar_url} alt={member.name}
                  className="w-[38px] h-[38px] rounded-full object-cover flex-shrink-0"
                  style={{ border: `1px solid ${member.color}66` }} />
              ) : (
                <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-body font-medium flex-shrink-0"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    background: `${member.color}22`,
                    color: member.color,
                    border: `1px solid ${member.color}55`,
                  }}>
                  {member.initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium">{member.name}</div>
                <div className="text-label" style={{ fontFamily: "'DM Mono', monospace", color: '#6a6660' }}>
                  {FEATURES.memberCredentials && member.streams
                    ? `${member.role} · ${member.streams} streams`
                    : member.role}
                </div>
              </div>
              {inBank > 0 && (
                <span className="px-[8px] py-[3px] rounded-full text-micro tracking-[1px] uppercase"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    background: `${member.color}1f`,
                    color: member.color,
                    border: `1px solid ${member.color}55`,
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
