import { useState, useEffect } from 'react';
import { X, Delete, Loader2 } from 'lucide-react';
import formatCurrency from '../../lib/formatCurrency';

interface CheckoutModalProps {
  isOpen: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (tendered: number) => void;
  isProcessing: boolean;
}

export default function CheckoutModal({ isOpen, total, onClose, onConfirm, isProcessing }: CheckoutModalProps) {
  const [tenderedStr, setTenderedStr] = useState('');

  // Physical keyboard support for manual key in
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'].includes(e.key)) {
        if (e.key === '.' && tenderedStr.includes('.')) return;
        if (tenderedStr.includes('.') && tenderedStr.split('.')[1].length >= 2) return;
        setTenderedStr(prev => prev + e.key);
      } else if (e.key === 'Backspace') {
        setTenderedStr(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        const tenderedAmt = parseFloat(tenderedStr) || 0;
        if (tenderedAmt >= total && !isProcessing) {
          onConfirm(tenderedAmt);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, tenderedStr, total, isProcessing, onConfirm, onClose]);

  if (!isOpen) return null;

  const tendered = parseFloat(tenderedStr) || 0;
  const change = Math.max(0, tendered - total);
  const isEnough = tendered >= total;

  const handleNumpad = (num: string) => {
    if (tenderedStr.includes('.') && num === '.') return;
    if (tenderedStr.includes('.') && tenderedStr.split('.')[1].length >= 2) return;
    setTenderedStr(prev => prev + num);
  };

  const handleDelete = () => {
    setTenderedStr(prev => prev.slice(0, -1));
  };

  const handleQuickCash = (amount: number) => {
    setTenderedStr(amount.toString());
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-theme-surface border border-theme-border w-full max-w-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Side: Details */}
        <div className="flex-1 p-8 border-b md:border-b-0 md:border-r border-theme-border bg-theme-surface-alt flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-serif text-2xl text-theme-ink">Cash Payment</h2>
              <button onClick={onClose} className="text-theme-ink-dim hover:text-theme-ink md:hidden">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-1">Total Due</p>
                <p className="font-serif text-4xl text-theme-accent">{formatCurrency(total)}</p>
              </div>
              
              <div>
                <p className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-1">Amount Tendered</p>
                <p className={`font-mono text-3xl ${isEnough ? 'text-green-400' : 'text-theme-ink'}`}>
                  {tenderedStr ? formatCurrency(tendered) : '$0.00'}
                </p>
              </div>

              {isEnough && (
                <div className="pt-6 border-t border-theme-border animate-in fade-in">
                  <p className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-1">Change Due</p>
                  <p className="font-mono text-3xl text-theme-ink">{formatCurrency(change)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3">
            <button onClick={() => handleQuickCash(total)} className="py-3 border border-theme-border text-theme-ink text-sm hover:border-theme-accent transition-colors">Exact</button>
            <button onClick={() => handleQuickCash(Math.ceil(total / 10) * 10)} className="py-3 border border-theme-border text-theme-ink text-sm hover:border-theme-accent transition-colors">${Math.ceil(total / 10) * 10}</button>
            <button onClick={() => handleQuickCash(Math.ceil(total / 50) * 50)} className="py-3 border border-theme-border text-theme-ink text-sm hover:border-theme-accent transition-colors">${Math.ceil(total / 50) * 50}</button>
          </div>
        </div>

        {/* Right Side: Numpad */}
        <div className="flex-1 p-8 flex flex-col">
          <div className="flex justify-end mb-4 hidden md:flex">
            <button onClick={onClose} className="text-theme-ink-dim hover:text-theme-ink">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8 flex-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((num) => (
              <button
                key={num}
                onClick={() => handleNumpad(num)}
                className="bg-theme-bg border border-theme-border py-6 text-2xl font-mono text-theme-ink hover:border-theme-accent hover:text-theme-accent transition-colors active:scale-95"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleDelete}
              className="bg-theme-bg border border-theme-border py-6 flex items-center justify-center text-theme-ink-dim hover:text-red-400 hover:border-red-400 transition-colors active:scale-95"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>

          <button
            onClick={() => onConfirm(tendered)}
            disabled={!isEnough || isProcessing}
            className="w-full bg-theme-accent text-black py-5 font-semibold uppercase tracking-[2px] text-xs hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Payment'}
          </button>
        </div>

      </div>
    </div>
  );
}
