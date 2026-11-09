import { useState } from 'react';
import { X, Loader2, Gift } from 'lucide-react';
import { fetchGiftCardByCode } from '../../lib/api/giftcards';
import { DbError } from '../../lib/api/errors';
import { GiftCard } from '../../types';

interface GiftCardRedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRedeem: (giftCard: GiftCard) => void;
}

export default function GiftCardRedeemModal({ isOpen, onClose, onRedeem }: GiftCardRedeemModalProps) {
  const [code, setCode] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [errorStr, setErrorStr] = useState('');

  if (!isOpen) return null;

  const handleCheck = async () => {
    if (!code.trim()) return;
    setIsChecking(true);
    setErrorStr('');
    
    try {
      const data = await fetchGiftCardByCode(code.trim().toUpperCase());

      if (!data) {
        setErrorStr('Gift card not found.');
        return;
      }

      if (data.status !== 'active') {
        setErrorStr(`Gift card is ${data.status}.`);
        return;
      }

      if (data.current_balance <= 0) {
        setErrorStr('Gift card has zero balance.');
        return;
      }

      onRedeem(data as GiftCard);
      setCode('');
      onClose();

    } catch (err) {
      console.error('Error checking gift card:', err);
      setErrorStr(err instanceof DbError ? err.message : 'Failed to verify gift card.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-theme-surface border border-theme-border w-full max-w-sm shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-theme-ink-dim hover:text-theme-ink">
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6 text-theme-accent">
            <Gift className="w-6 h-6" />
            <h2 className="font-serif text-xl text-theme-ink">Redeem Gift Card</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim mb-2">Gift Card Code</label>
              <input
                type="text"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                placeholder="XXXXX-XXXX"
                className="w-full bg-theme-bg border border-theme-border p-3 text-theme-ink focus:border-theme-accent focus:outline-none placeholder-gray-600 font-mono text-center tracking-widest text-lg uppercase"
              />
            </div>

            {errorStr && (
              <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 border border-red-400/20">{errorStr}</p>
            )}

            <button
              onClick={handleCheck}
              disabled={!code.trim() || isChecking}
              className="w-full bg-theme-accent text-black p-4 font-semibold hover:bg-opacity-90 transition-colors uppercase tracking-[1px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
