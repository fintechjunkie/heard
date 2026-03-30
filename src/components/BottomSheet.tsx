'use client';

import { ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  fullHeight?: boolean;
}

export default function BottomSheet({ open, onClose, children, fullHeight }: BottomSheetProps) {
  return (
    <div
      className={`fixed inset-0 z-[150] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.5)',
          opacity: open ? 1 : 0,
        }}
      />
      {/* Sheet */}
      <div
        className={`absolute left-0 right-0 bottom-0 rounded-t-[20px] overflow-hidden ${
          fullHeight ? 'top-[40px]' : 'max-h-[90vh]'
        }`}
        style={{
          background: 'var(--th-white)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: open
            ? 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1)'
            : 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
