'use client';

import { useStore } from '@/lib/store';
import { FEATURES } from '@/lib/features';

const TABS = [
  { key: 'bank', icon: '▦', label: 'Bank', enabled: FEATURES.songBank },
  { key: 'pocket', icon: '♫', label: 'Crate', badge: true, enabled: FEATURES.pocket },
  { key: 'reserved', icon: '◷', label: 'Reserved', enabled: FEATURES.commerce },
  { key: 'writers', icon: '◈', label: 'Writers', enabled: FEATURES.writers },
  { key: 'purchased', icon: '✓', label: 'Purchased', enabled: FEATURES.commerce },
].filter(t => t.enabled);

export default function BottomTabBar() {
  const { activeTab, setActiveTab, artistQueue, songs } = useStore();
  const validQueueCount = artistQueue.filter(id => songs.some(s => s.id === id)).length;

  // Fewer tabs means each one can carry a larger icon and a roomier label.
  const roomy = TABS.length <= 3;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-[100] flex items-center justify-around"
      style={{
        background: 'var(--black)',
        paddingTop: 8,
        paddingBottom: 22,
        borderTop: '1px solid var(--b3)',
      }}
    >
      {TABS.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex flex-col items-center gap-1 cursor-pointer bg-transparent border-none relative"
            style={{
              color: isActive ? 'var(--acid)' : 'rgba(255,255,255,0.38)',
            }}
          >
            <span style={{ fontSize: roomy ? 22 : 18 }}>{tab.icon}</span>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: roomy ? 14 : 13,
              letterSpacing: roomy ? 1.8 : 1,
              textTransform: 'uppercase',
              color: isActive ? 'var(--acid)' : 'rgba(255,255,255,0.55)',
            }}>
              {tab.label}
            </span>
            {tab.badge && validQueueCount > 0 && (
              <span className="absolute -top-1 -right-2 text-micro min-w-[14px] h-[14px] flex items-center justify-center rounded-full"
                style={{
                  background: 'var(--violet)',
                  color: 'white',
                  fontFamily: "'DM Mono', monospace",
                  fontWeight: 600,
                }}>
                {validQueueCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
