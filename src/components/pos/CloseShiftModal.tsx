import { useState } from 'react';
import { LogOut, Loader2, X } from 'lucide-react';
import formatCurrency from '../../lib/formatCurrency';

interface CloseShiftModalProps {
  isOpen: boolean;
  expectedCash: number;
  totalSales: number;
  shiftStart: string | null;
  onClose: () => void;
  onConfirm: (actualCash: number, notes: string) => void;
  isProcessing: boolean;
}

export default function CloseShiftModal({ 
  isOpen, 
  expectedCash, 
  totalSales,
  shiftStart, 
  onClose, 
  onConfirm, 
  isProcessing 
}: CloseShiftModalProps) {
  const [actualCash, setActualCash] = useState<string>('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-theme-surface border border-theme-border w-full max-w-md shadow-2xl flex flex-col">
        <div className="p-6 border-b border-theme-border flex items-center justify-between bg-theme-surface-alt">
          <h2 className="font-serif text-xl text-theme-ink flex items-center gap-2">
            <LogOut className="w-5 h-5 text-red-400" />
            Close Shift
          </h2>
          <button onClick={onClose} className="text-theme-ink-dim hover:text-theme-ink">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-theme-bg p-4 border border-theme-border rounded space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-theme-ink-dim">Started At:</span>
              <span className="text-theme-ink font-mono">{formatDate(shiftStart)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-theme-ink-dim">Total Sales:</span>
              <span className="text-theme-ink font-mono">{formatCurrency(totalSales)}</span>
            </div>
            <div className="flex justify-between text-sm pt-3 border-t border-theme-border">
              <span className="text-theme-accent uppercase tracking-wider font-semibold">Expected Cash in Drawer:</span>
              <span className="text-theme-accent font-mono font-semibold">{formatCurrency(expectedCash)}</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim mb-2">Actual Cash Counted *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-theme-ink-dim">$</span>
              </div>
              <input 
                type="number" 
                value={actualCash}
                onChange={e => setActualCash(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border py-4 pl-8 pr-4 text-theme-ink focus:outline-none focus:border-theme-accent font-mono text-lg"
                placeholder="0.00"
                autoFocus
              />
            </div>
            {actualCash !== '' && Number(actualCash) !== expectedCash && (
              <p className={`text-xs mt-2 ${Number(actualCash) < expectedCash ? 'text-red-400' : 'text-emerald-400'}`}>
                Difference: {formatCurrency(Number(actualCash) - expectedCash)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim mb-2">Shift Notes (Optional)</label>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-theme-bg border border-theme-border p-3 text-sm text-theme-ink focus:outline-none focus:border-theme-accent min-h-[80px]"
              placeholder="Record any discrepancies or notes..."
            />
          </div>
        </div>

        <div className="p-6 border-t border-theme-border bg-theme-surface-alt flex justify-end gap-4">
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="px-6 py-3 text-xs uppercase tracking-wider text-theme-ink-dim hover:text-theme-ink font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(Number(actualCash), notes)}
            disabled={actualCash === '' || isProcessing}
            className="bg-red-500/10 text-red-500 border border-red-500/50 px-8 py-3 text-xs uppercase tracking-wider font-semibold hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing && <Loader2 className="w-3 h-3 animate-spin"/>}
            {isProcessing ? 'Closing...' : 'Close Shift'}
          </button>
        </div>
      </div>
    </div>
  );
}
