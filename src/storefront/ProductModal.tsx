import { useMemo, useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import type { Product } from '../lib/supabase';
import { useStorefront } from './StorefrontContext';
import { isMeatGroup } from '../lib/meatOptions';
import { CustomizationGroupRaw, formatAUD, optionPrice, productPrice } from './types';

export default function ProductModal({
  product,
  variantAvailability,
  onClose,
}: {
  product: Product;
  variantAvailability: Record<string, boolean>;
  onClose: () => void;
}) {
  const { mode, addToCart } = useStorefront();
  const groups: CustomizationGroupRaw[] = (product.customizations || []) as CustomizationGroupRaw[];

  const isOptionSoldOut = (o: any) => variantAvailability[`${product.id}::${o.name}`] === false;

  const [selected, setSelected] = useState<Record<string, any[]>>(() => {
    const init: Record<string, any[]> = {};
    groups.forEach((g) => {
      if (g.required && g.options.length === 1) {
        const first = g.options.find((o) => variantAvailability[`${product.id}::${o.name}`] !== false) || g.options[0];
        init[g.name] = [first];
      } else {
        init[g.name] = [];
      }
    });
    return init;
  });
  const [qty, setQty] = useState(1);

  const unitPrice = useMemo(() => {
    let price = productPrice(product, mode);
    groups.forEach((g) => {
      (selected[g.name] || []).forEach((o) => {
        price += optionPrice(o, mode);
      });
    });
    return price;
  }, [product, mode, selected, groups]);

  const toggle = (g: CustomizationGroupRaw, option: any) => {
    if (isOptionSoldOut(option)) return;
    if (isLockedGroup(g)) return;
    setSelected((prev) => {
      const current = prev[g.name] || [];
      if (g.multiple) {
        const exists = current.find((o) => o.name === option.name);
        return {
          ...prev,
          [g.name]: exists ? current.filter((o) => o.name !== option.name) : [...current, option],
        };
      }
      return { ...prev, [g.name]: [option] };
    });
  };

  const missingRequired = groups
    .filter((g) => g.required && !(selected[g.name] || []).length)
    .map((g) => g.name);
  const canAdd = missingRequired.length === 0;
  const meatGroup = groups.find(isMeatGroup);
  const meatMissing = !!meatGroup && !(selected[meatGroup.name] || []).length;
  const isLockedGroup = (g: CustomizationGroupRaw) => meatMissing && !isMeatGroup(g);
  const orderedGroups = [...groups].sort((a, b) => Number(isMeatGroup(b)) - Number(isMeatGroup(a)));

  const handleAdd = () => {
    if (!canAdd) return;
    const options = groups.flatMap((g) =>
      (selected[g.name] || []).map((o) => ({ group: g.name, name: o.name, price: optionPrice(o, mode) }))
    );
    addToCart(product, options, qty, unitPrice);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-3xl md:rounded-3xl border border-[color:var(--vt-border)] bg-[color:var(--vt-card)] shadow-2xl">
        <div className="relative aspect-[16/10] overflow-hidden bg-[color:rgba(255,255,255,0.03)]">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-[color:var(--vt-accent)]">
              {product.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-xl font-semibold">{product.name}</h3>
            <div className="text-lg text-[color:var(--vt-accent)] whitespace-nowrap">{formatAUD(productPrice(product, mode))}</div>
          </div>
          {product.middle_name && <p className="text-sm text-[color:var(--vt-muted)]">{product.middle_name}</p>}
          {product.description && <p className="mt-2 text-sm text-[color:var(--vt-muted)] leading-relaxed">{product.description}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            {product.is_vegan && (
              <span className="rounded-full bg-[color:rgba(34,197,94,0.12)] text-[color:var(--vt-leaf)] text-xs px-3 py-1">Vegan</span>
            )}
            {product.is_gluten_free && (
              <span className="rounded-full bg-[color:var(--vt-accent-soft)] text-[color:var(--vt-accent)] text-xs px-3 py-1">Gluten free</span>
            )}
            {product.is_healthy && (
              <span className="rounded-full bg-[color:rgba(255,255,255,0.06)] text-[color:var(--vt-muted)] text-xs px-3 py-1">Healthy choice</span>
            )}
          </div>

          {orderedGroups.map((g) => (
            <div key={g.name} className="mt-6">
              <div className="text-[13px] font-semibold uppercase tracking-wider text-[color:var(--vt-muted)]">
                {g.name}
                {g.required ? ' · required' : ''}
                {isLockedGroup(g) && <span className="ml-2 normal-case tracking-normal text-[color:var(--vt-chili)]">Choose your meat first</span>}
              </div>
              <div className="mt-2 grid gap-2">
                {g.options.map((o) => {
                  const isSelected = (selected[g.name] || []).some((s) => s.name === o.name);
                  const extra = optionPrice(o, mode);
                  const soldOutOption = isOptionSoldOut(o);
                  const locked = isLockedGroup(g);
                  return (
                    <button
                      key={o.name}
                      type="button"
                      disabled={soldOutOption || locked}
                      onClick={() => toggle(g, o)}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors ${
                        locked
                          ? 'border-[color:var(--vt-border)] opacity-40 cursor-not-allowed'
                          : soldOutOption
                          ? 'border-[color:var(--vt-border)] opacity-40 line-through cursor-not-allowed'
                          : isSelected
                            ? 'border-[color:var(--vt-accent)] bg-[color:var(--vt-accent-soft)] text-[color:var(--vt-ivory)]'
                            : 'border-[color:var(--vt-border)] hover:border-[color:rgba(255,255,255,0.2)]'
                      }`}
                    >
                      <span>
                        {o.name}
                        {soldOutOption && <span className="ml-2 text-[color:var(--vt-chili)] no-underline text-xs">sold out</span>}
                      </span>
                      {extra !== 0 && <span className="text-[color:var(--vt-muted)]">+{formatAUD(extra)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="sticky bottom-0 -mx-6 mt-8 flex items-center gap-3 border-t border-[color:var(--vt-border)] bg-[color:var(--vt-card)] px-6 py-4">
            <div className="flex items-center gap-3 rounded-xl border border-[color:var(--vt-border)] px-3 py-3">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-6 text-center font-medium">{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Increase">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd}
              className={`vt-glow flex-1 rounded-full py-3.5 text-sm font-bold transition-all ${
                canAdd
                  ? 'bg-gradient-to-r from-[#ff7a52] to-[color:var(--vt-accent)] text-white hover:bg-[color:var(--vt-accent-deep)]'
                  : 'border border-[color:var(--vt-border)] text-[color:var(--vt-muted)] cursor-not-allowed'
              }`}
            >
              {canAdd ? `Add to cart · ${formatAUD(unitPrice * qty)}` : 'Select required options'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
