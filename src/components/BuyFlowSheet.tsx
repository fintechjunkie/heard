'use client';

import { useState } from 'react';
import { Song } from '@/data/types';
import BottomSheet from './BottomSheet';

interface BuyFlowSheetProps {
  song: Song | null;
  open: boolean;
  onClose: () => void;
  onComplete: (songId: number) => void;
}

export default function BuyFlowSheet({ song, open, onClose, onComplete }: BuyFlowSheetProps) {
  const [step, setStep] = useState(1);
  const [agreed, setAgreed] = useState(false);

  if (!song) return null;

  const handleClose = () => {
    setStep(1);
    setAgreed(false);
    onClose();
  };

  const handleNext = () => {
    if (step === 1 && !agreed) return;
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete(song.id);
      handleClose();
    }
  };

  return (
    <BottomSheet open={open} onClose={handleClose} fullHeight>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="text-[28px] tracking-[2px] leading-none mb-3" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            {song.title}
          </div>
          {/* Step indicator */}
          <div className="flex gap-2 items-center">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-[24px] h-[24px] rounded-full flex items-center justify-center text-[9px] font-medium"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    background: s === step ? 'var(--black)' : s < step ? 'var(--acid)' : 'var(--border)',
                    color: s === step ? 'var(--th-white)' : s < step ? 'var(--black)' : 'var(--muted)',
                  }}>
                  {s < step ? '✓' : s}
                </div>
                {s < 3 && <div className="w-6 h-[1px]" style={{ background: s < step ? 'var(--acid)' : 'var(--border)' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-5">
          {step === 1 && (
            <>
              <div className="text-[8px] tracking-[2px] uppercase mb-3" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650' }}>
                Step 1 — Contract Review
              </div>
              <div className="rounded-xl p-4 mb-4 text-[10px] leading-[1.6] overflow-y-auto max-h-[300px] scrollbar-hide"
                style={{ background: 'var(--black)', color: 'rgba(255,255,255,0.7)' }}>
                <p className="font-medium text-white mb-3">STANDARDIZED SALE CONTRACT</p>
                <p className="mb-2">This agreement is entered into between the songwriter(s)/producer(s) (&quot;Seller&quot;) and the purchasing party (&quot;Buyer&quot;) through the Heard marketplace platform.</p>
                <p className="mb-2">1. RIGHTS TRANSFER: Seller hereby assigns and transfers to Buyer all rights, title, and interest in the musical composition, including but not limited to publishing rights, mechanical rights, and synchronization rights.</p>
                <p className="mb-2">2. TERRITORIES: The assignment covers worldwide territories and all formats, both existing and future.</p>
                <p className="mb-2">3. CONSIDERATION: The purchase price of $85,000.00 USD shall be paid in full upon execution of this agreement.</p>
                <p className="mb-2">4. WRITER CREDITS: Writer credits as specified in the composition metadata shall remain fixed and immutable.</p>
                <p className="mb-2">5. CLOSING: Transaction shall close within 48 hours of purchase confirmation.</p>
                <p>6. REPRESENTATIONS: Seller represents that the composition is original, free of samples, and that all necessary clearances have been obtained.</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-[2px] w-4 h-4 cursor-pointer accent-[var(--acid)]"
                />
                <span className="text-[11px] leading-[1.5]" style={{ color: '#5a5650' }}>
                  I have read and agree to the Standardized Sale Contract
                </span>
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-[8px] tracking-[2px] uppercase mb-3" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650' }}>
                Step 2 — Payment
              </div>
              <p className="text-[10px] mb-4" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
                Payment processed securely. Credentials stored by your firm, not by Heard.
              </p>
              <div className="flex flex-col gap-3">
                {['Firm / Cardholder Name', 'Card Number', 'Expiry', 'CVV', 'Billing Email'].map(label => (
                  <div key={label}>
                    <div className="text-[8px] tracking-[1px] uppercase mb-1" style={{ fontFamily: "'DM Mono', monospace", color: '#6a6660' }}>{label}</div>
                    <input
                      type={label === 'Billing Email' ? 'email' : 'text'}
                      placeholder={label}
                      className="w-full px-3 py-[10px] rounded-lg text-[13px] outline-none"
                      style={{
                        background: 'var(--th-white)',
                        border: '1px solid var(--border)',
                        color: 'var(--black)',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="text-[8px] tracking-[2px] uppercase mb-3" style={{ fontFamily: "'DM Mono', monospace", color: '#5a5650' }}>
                Step 3 — Confirmation
              </div>
              <div className="text-center mb-5">
                <div className="text-[36px] tracking-[2px] leading-none mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  {song.title}
                </div>
                <div className="text-[11px]" style={{ color: '#6a6660' }}>
                  Rights transfer upon purchase completion
                </div>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--black)' }}>
                {[
                  ['Song', song.title],
                  ['Writers', song.writers.join(' · ')],
                  ['Rights', 'Full Assignment · Worldwide'],
                  ['Amount', '$85,000.00'],
                  ['Close', 'Within 48 Hours'],
                ].map(([label, value], i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-[10px]"
                    style={{ borderBottom: '1px solid var(--b3)' }}>
                    <span className="text-[9px] tracking-[1px] uppercase" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.45)' }}>{label}</span>
                    <span className="text-[12px] font-medium" style={{ color: label === 'Amount' ? 'var(--acid)' : 'var(--th-white)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 pb-5 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleNext}
            disabled={step === 1 && !agreed}
            className="w-full py-[14px] rounded-xl text-[10px] tracking-[1.5px] uppercase cursor-pointer border-none transition-opacity"
            style={{
              fontFamily: "'DM Mono', monospace",
              background: step === 3 ? 'var(--coral)' : 'var(--black)',
              color: step === 3 ? 'white' : 'var(--th-white)',
              opacity: step === 1 && !agreed ? 0.4 : 1,
            }}>
            {step === 1 ? 'Continue to Payment →' : step === 2 ? 'Review Purchase →' : 'Complete Purchase — $85,000'}
          </button>
          <button onClick={handleClose}
            className="w-full py-[10px] mt-2 text-[10px] tracking-[1px] uppercase cursor-pointer bg-transparent border-none"
            style={{ fontFamily: "'DM Mono', monospace", color: 'var(--muted)' }}>
            Cancel
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
