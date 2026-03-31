'use client';

import { useStore } from '@/lib/store';

const TABS = [
  { key: 'bank', icon: '▦', label: 'Bank' },
  { key: 'pocket', icon: '♫', label: 'Pocket', badge: true },
  { key: 'reserved', icon: '◷', label: 'Reserved' },
  { key: 'writers', icon: '◈', label: 'Writers' },
  { key: 'purchased', icon: '✓', label: 'Purchased' },
];

export default function BottomTabBar() {
  const { activeTab, setActiveTab, artistQueue, songs } = useStore();
  const validQueueCount = artistQueue.filter(id => songs.some(s => s.id === id)).length;

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
            <span className="text-[18px]">{tab.icon}</span>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 7,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}>
              {tab.label}
            </span>
            {tab.badge && validQueueCount > 0 && (
              <span className="absolute -top-1 -right-2 text-[7px] min-w-[14px] h-[14px] flex items-center justify-center rounded-full"
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
