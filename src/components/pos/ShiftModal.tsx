import React, { useState } from 'react';
import { Banknote, Loader2 } from 'lucide-react';

interface ShiftModalProps {
  isOpen: boolean;
  onOpenShift: (amount: number) => void;
  isLoading?: boolean;
  defaultAmount?: number;
}

export default function ShiftModal({ isOpen, onOpenShift, isLoading = false, defaultAmount = 1000 }: ShiftModalProps) {
  const [amount, setAmount] = useState(defaultAmount.toString());

  // Update amount if defaultAmount prop changes while modal is open
  React.useEffect(() => {
    if (isOpen) {
      setAmount(defaultAmount.toString());
    }
  }, [isOpen, defaultAmount]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-theme-surface border border-theme-border p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-theme-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Banknote className="w-8 h-8 text-theme-accent" />
          </div>
          <h2 className="font-serif text-3xl text-theme-ink mb-2">Open Shift</h2>
          <p className="text-theme-ink-dim text-xs uppercase tracking-[1px]">Enter starting cash float in drawer</p>
        </div>
        
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
            <span className="text-theme-ink-dim text-2xl">$</span>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-theme-bg border border-theme-border py-5 pl-12 pr-6 text-theme-ink text-2xl focus:outline-none focus:border-theme-accent transition-colors font-mono"
            placeholder="0.00"
            autoFocus
            disabled={isLoading}
          />
        </div>

        <button
          onClick={() => onOpenShift(Number(amount) || 0)}
          disabled={isLoading}
          className="w-full bg-theme-accent text-black py-5 font-semibold uppercase tracking-[2px] text-xs hover:bg-opacity-90 transition-colors flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>
          ) : (
            <>Start Shift</>
          )}
        </button>
      </div>
    </div>
  );
}
