'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Team {
  id: number;
  name: string;
  description: string;
  role_in_team: string;
}

interface TeamPickerProps {
  onSelect: (teamId: number, teamName: string) => void;
}

export default function TeamPicker({ onSelect }: TeamPickerProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const res = await fetch(`/api/teams?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setTeams(data);

          // Auto-select if only one team
          if (data.length === 1) {
            onSelect(data[0].id, data[0].name);
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [onSelect]);

  if (loading) return null;
  if (teams.length <= 1) return null; // Auto-selected or no teams

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-[320px] px-6">
        <div className="text-center mb-8">
          <div className="text-[36px] tracking-[8px] mb-2"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#FFFFFF' }}>
            HEARD
          </div>
          <p className="text-[10px] tracking-[2px] uppercase"
            style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.4)' }}>
            Select Your Team
          </p>
        </div>

        <div className="space-y-3">
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => onSelect(team.id, team.name)}
              className="w-full text-left px-5 py-4 rounded-xl cursor-pointer border-none transition-all active:scale-[0.98]"
              style={{
                background: 'var(--b3)',
                border: '1px solid var(--b4)',
              }}
            >
              <div className="text-[14px] font-medium mb-1" style={{ color: '#FFFFFF', fontFamily: "'DM Sans', sans-serif" }}>
                {team.name}
              </div>
              {team.description && (
                <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Mono', monospace" }}>
                  {team.description}
                </div>
              )}
              <div className="text-[9px] mt-1 uppercase tracking-[1px]" style={{ color: 'var(--violet)', fontFamily: "'DM Mono', monospace" }}>
                {team.role_in_team}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
