'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function PhoneFrame({ children }: { children: ReactNode }) {
  const scaleRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Don't wrap admin pages in the phone frame
  const isAdmin = pathname?.startsWith('/admin');

  useEffect(() => {
    const el = scaleRef.current;
    if (!el || isAdmin) return;

    const resize = () => {
      // Only scale on desktop
      if (window.innerWidth < 768) {
        el.style.transform = 'none';
        return;
      }
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.min(vw / 463, vh / 922, 1); // 393+70 padding, 852+70
      el.style.transform = `scale(${scale})`;
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [isAdmin]);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="phone-stage">
      <div className="phone-scale-wrap" ref={scaleRef}>
        <div className="phone-frame-el">
          {/* Dynamic Island */}
          <div className="dynamic-island-el">
            <div className="di-camera-el" />
            <div className="di-sensor-el" />
          </div>
          {/* App content */}
          <div className="phone-screen">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
