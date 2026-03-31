'use client';

import { useStore } from '@/lib/store';

export default function Toast() {
  const { toastMessage } = useStore();

  return (
    <div
      className={`absolute left-4 right-4 z-[200] px-4 py-3 rounded-lg shadow-lg pointer-events-none font-mono text-xs tracking-wide ${
        toastMessage ? 'toast-visible' : 'toast-hidden'
      }`}
      style={{
        bottom: 90,
        background: 'var(--black)',
        borderLeft: '3px solid var(--acid)',
        color: '#FFFFFF',
        fontFamily: "'DM Mono', monospace",
      }}
    >
      {toastMessage}
    </div>
  );
}
