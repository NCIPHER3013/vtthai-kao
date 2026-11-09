import { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import formatCurrency from '../../lib/formatCurrency';
import { Product } from '../../types';
import { isMeatGroup } from '../../lib/meatOptions';

interface ModifierModalProps {
  isOpen: boolean;
  product: Product | null;
  orderType?: string;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, modifiers: string[], note: string) => void;
  variantAvailability?: Record<string, boolean>;
}

export default function ModifierModal({ isOpen, product, orderType = 'dine_in', onClose, onAddToCart, variantAvailability = {} }: ModifierModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setNote('');
      setSelectedModifiers([]);
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const getOptionPriceAdj = (opt: any) => {
    if (orderType === 'delivery' && opt.price_delivery !== undefined && opt.price_delivery !== null) return Number(opt.price_delivery);
    if (orderType === 'takeaway' && opt.price_takeaway !== undefined && opt.price_takeaway !== null) return Number(opt.price_takeaway);
    return Number(opt.price_adjustment !== undefined && opt.price_adjustment !== null ? opt.price_adjustment : (opt.price || 0));
  };

  const getProductBasePrice = () => {
    if (orderType === 'delivery' && product.price_delivery !== undefined && product.price_delivery !== null) return Number(product.price_delivery);
    if (orderType === 'takeaway' && product.price_takeaway !== undefined && product.price_takeaway !== null) return Number(product.price_takeaway);
    return Number(product.price || 0);
  };

  const groupModNames = (group: any) =>
    group.options.map((o: any) => {
      const adj = getOptionPriceAdj(o);
      return adj > 0 ? `${o.name} (+$${adj.toFixed(2)})` : o.name;
    });

  const toggleModifier = (group: any, mod: string) => {
    setSelectedModifiers(prev => {
      const names = groupModNames(group);
      if (group.multiple) {
        return prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod];
      }
      return [...prev.filter(m => !names.includes(m)), mod];
    });
  };

  const missingRequired = (product.customizations || [])
    .filter((g: any) => g.required)
    .filter((g: any) => !groupModNames(g).some((m: string) => selectedModifiers.includes(m)))
    .map((g: any) => g.name);

  const meatGroupDef = (product.customizations || []).find((g: any) => isMeatGroup(g));
  const meatMissing = !!meatGroupDef && !groupModNames(meatGroupDef).some((m: string) => selectedModifiers.includes(m));
  const isLockedGroup = (group: any) => meatMissing && !isMeatGroup(group);
  const orderedCustomizations = [...(product.customizations || [])].sort((a: any, b: any) => Number(isMeatGroup(b)) - Number(isMeatGroup(a)));

  const handleAdd = () => {
    if (missingRequired.length > 0) return;
    // Keep the product unmodified so POSPage can calculate the correct price based on the selected tier.
    onAddToCart(product, quantity, selectedModifiers, note);
    onClose();
  };

  const currentDisplayPrice = () => {
    let price = getProductBasePrice();
    if (product.customizations) {
      selectedModifiers.forEach(modName => {
        product.customizations!.forEach(group => {
           const opt = group.options.find(o => {
               const priceAdj = getOptionPriceAdj(o);
               return priceAdj > 0 ? `${o.name} (+$${priceAdj.toFixed(2)})` === modName || modName.startsWith(o.name) : o.name === modName;
           });
           if (opt) {
              price += getOptionPriceAdj(opt);
           }
        });
      });
    }
    return price * quantity;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-theme-surface border border-theme-border w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-theme-border flex items-center justify-between shrink-0 bg-theme-surface-alt">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="font-serif text-2xl text-theme-ink mr-2">{product.name}</h2>
              {product.is_vegan && (
                <span className="bg-green-500/20 text-green-500 text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm font-semibold border border-green-500/30">
                  Vegan
                </span>
              )}
              {product.is_gluten_free && (
                <span className="bg-amber-500/20 text-amber-500 text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm font-semibold border border-amber-500/30">
                  Gluten-Free
                </span>
              )}
              {product.is_healthy && (
                <span className="bg-emerald-500/20 text-emerald-500 text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm font-semibold border border-emerald-500/30">
                  Health & Wellness
                </span>
              )}
            </div>
            
            {product.description && (
              <p className="text-[12px] text-theme-ink-dim font-medium italic mt-1 mb-2 leading-snug max-w-md">{product.description}</p>
            )}
            
            <p className="text-theme-accent font-medium mt-2">{formatCurrency(product.price)}</p>
          </div>
          <button onClick={onClose} className="text-theme-ink-dim hover:text-theme-ink bg-theme-bg p-2 rounded-full self-start mt-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          
          {/* Nutrition Facts */}
          {(product.calories || product.protein || product.carbs || product.fat) && (
            <div>
              <h3 className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-3">Nutrition Facts</h3>
              <div className="flex flex-wrap gap-4 text-sm font-mono text-theme-ink bg-theme-bg/50 p-4 border border-theme-border rounded-sm">
                {product.calories != null && <div className="flex flex-col"><span className="text-theme-ink-dim text-[10px] uppercase">Calories</span><span className="font-semibold">{product.calories} kcal</span></div>}
                {product.protein != null && <div className="flex flex-col"><span className="text-theme-ink-dim text-[10px] uppercase">Protein</span><span>{product.protein}g</span></div>}
                {product.carbs != null && <div className="flex flex-col"><span className="text-theme-ink-dim text-[10px] uppercase">Carbs</span><span>{product.carbs}g</span></div>}
                {product.fat != null && <div className="flex flex-col"><span className="text-theme-ink-dim text-[10px] uppercase">Fat</span><span>{product.fat}g</span></div>}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <h3 className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-4">Quantity</h3>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 flex items-center justify-center border border-theme-border text-theme-ink hover:border-theme-accent transition-colors"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-2xl font-mono w-12 text-center">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 flex items-center justify-center border border-theme-border text-theme-ink hover:border-theme-accent transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Dynamic Modifiers based on product.customizations */}
          {product.customizations && product.customizations.length > 0 && (
            orderedCustomizations.map((group: any, gIdx: number) => (
              <div key={gIdx} className="mb-6">
                <h3 className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-4">
                  {group.name} {group.required ? '(Required)' : ''}
                  {isLockedGroup(group) && <span className="ml-2 normal-case tracking-normal text-theme-accent">Choose your meat first</span>}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {group.options.map((opt: any) => {
                    const priceAdj = getOptionPriceAdj(opt);
                    const modName = priceAdj > 0 ? `${opt.name} (+$${priceAdj.toFixed(2)})` : opt.name;
                    const locked = isLockedGroup(group);
                    const isAvailable = variantAvailability[`${product.id}::${opt.name}`] !== false && !locked;
                    const isSelected = selectedModifiers.includes(modName);
                    return (
                      <button
                        key={opt.name}
                        onClick={() => isAvailable && toggleModifier(group, modName)}
                        disabled={!isAvailable}
                        className={`py-3 px-2 text-xs text-center border transition-colors relative flex flex-col items-center justify-center ${
                          isSelected 
                            ? 'border-theme-accent bg-theme-accent/10 text-theme-accent font-medium' 
                            : 'border-theme-border text-theme-ink-dim hover:border-theme-ink'
                        } ${!isAvailable ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                      >
                        <span>{modName}</span>
                        {!isAvailable && !locked && (
                          <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider mt-0.5">Sold Out</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}

          {/* Fallback Mock Modifiers solely for backward compat on coffee if no JSON exists */}
          {!product.customizations && product.category === 'Coffee' && (
            <div>
              <h3 className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-4">Sweetness</h3>
              <div className="grid grid-cols-3 gap-3">
                {['Normal Sweet', 'Less Sweet (50%)', 'No Sugar'].map(mod => (
                  <button
                    key={mod}
                    onClick={() => toggleModifier({ name: 'Sweetness', multiple: false, options: [{ name: mod }] }, mod)}
                    className={`py-3 px-2 text-xs text-center border transition-colors ${
                      selectedModifiers.includes(mod) 
                        ? 'border-theme-accent bg-theme-accent/10 text-theme-accent font-medium' 
                        : 'border-theme-border text-theme-ink-dim hover:border-theme-ink'
                    }`}
                  >
                    {mod}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <h3 className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-4">Special Instructions</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Allergy info, extra hot..."
              className="w-full bg-theme-bg border border-theme-border p-4 text-sm text-theme-ink focus:outline-none focus:border-theme-accent resize-none h-24"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-theme-border shrink-0 bg-theme-surface-alt">
          {missingRequired.length > 0 && (
            <div className="mb-3 text-center text-xs font-semibold text-theme-accent">
              Please select: {missingRequired.join(', ')}
            </div>
          )}
          <button
            onClick={handleAdd}
            disabled={missingRequired.length > 0}
            className={`w-full py-4 font-semibold uppercase tracking-[2px] text-xs transition-colors ${
              missingRequired.length > 0
                ? 'bg-theme-surface border border-theme-border text-theme-ink-dim cursor-not-allowed'
                : 'bg-theme-accent text-black hover:bg-opacity-90'
            }`}
          >
            {missingRequired.length > 0
              ? `Select ${missingRequired.join(' & ')} to continue`
              : `Add to Order - ${formatCurrency(currentDisplayPrice())}`}
          </button>
        </div>
      </div>
    </div>
  );
}
