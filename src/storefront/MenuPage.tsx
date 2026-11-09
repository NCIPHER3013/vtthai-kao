import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { Search, ShoppingBag, Plus, Check, X, UtensilsCrossed } from 'lucide-react';
import { fetchProducts, fetchProductCategories } from '../lib/api/products';
import { fetchRecipes, fetchStockItems, fetchAllSubRecipeIngredients } from '../lib/api/orders';
import { fetchSettings } from '../lib/api/settings';
import { calculateProductAvailability } from '../lib/inventoryUtils';
import type { Product, SubRecipeIngredient } from '../lib/supabase';
import { useStorefront } from './StorefrontContext';
import ProductModal from './ProductModal';
import { formatHM, formatScheduled, resolveOnlineConfig } from '../lib/onlineOrdering';
import OrderingPanel from './OrderingPanel';
import { CustomizationGroupRaw, formatAUD, isCustomerFacing, productPrice } from './types';

export default function MenuPage() {
  const store = useStorefront();
  const { mode, setTaxRate, setOnlineConfig, count, subtotal, onlineConfig: cfg, fulfilment } = store;
  const [showSummary, setShowSummary] = useState(false);

  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const [recipes, setRecipes] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [subRecipes, setSubRecipes] = useState<SubRecipeIngredient[]>([]);

  const qrToken = searchParams.get('t');

  useEffect(() => {
    (async () => {
      try {
        const [productsRes, categoriesRes, settingsRes, recipesRes, stockRes, subRes] = await Promise.all([
          fetchProducts(true),
          fetchProductCategories(),
          fetchSettings(),
          fetchRecipes(),
          fetchStockItems(),
          fetchAllSubRecipeIngredients(),
        ]);
        setProducts(productsRes.filter(isCustomerFacing));
        setRecipes(recipesRes);
        setStockItems(stockRes);
        setSubRecipes(subRes);
        const catNames = categoriesRes.map((c) => c.name);
        const used = new Set(productsRes.filter(isCustomerFacing).map((p) => p.category));
        setCategories(catNames.filter((c) => used.has(c)));
        if (settingsRes && typeof settingsRes.tax_rate === 'number') {
          setTaxRate(settingsRes.tax_rate);
        }
        setOnlineConfig(resolveOnlineConfig(settingsRes?.online_ordering));
      } catch (err) {
        console.error('Failed to load menu:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const { productAvailability, variantAvailability } = useMemo(
    () => calculateProductAvailability(products, recipes, stockItems, subRecipes),
    [products, recipes, stockItems, subRecipes]
  );

  const hasAvailableVariant = (p: Product) =>
    Object.keys(variantAvailability).some((k) => k.startsWith(p.id + '::') && variantAvailability[k] !== false);

  const hasLunchProducts = products.some((p) => p.is_lunch_special);
  const sectionOf = (p: Product) => (p.is_lunch_special ? 'Lunch specials' : p.category || 'Other');

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== 'All') list = list.filter((p) => sectionOf(p) === activeCategory);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.middle_name && p.middle_name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, activeCategory, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    filtered.forEach((p) => {
      const key = sectionOf(p);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    const entries = Array.from(map.entries());
    entries.sort((a, b) => (a[0] === 'Lunch specials' ? -1 : b[0] === 'Lunch specials' ? 1 : 0));
    return entries;
  }, [filtered]);

  useEffect(() => {
    if (isLoading) return;
    const el = document.getElementById('ordering-panel');
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setShowSummary(!entry.isIntersecting), { rootMargin: '-70px 0px 0px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [isLoading]);

  const scrollToPanel = () => document.getElementById('ordering-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const summaryWhen =
    fulfilment.when === 'scheduled' && fulfilment.scheduledFor
      ? formatScheduled(fulfilment.scheduledFor, cfg.timezone)
      : `ASAP · about ${mode === 'delivery' ? cfg.prep_minutes + cfg.delivery_extra_minutes : cfg.prep_minutes} min`;
  const freeRemaining = mode === 'delivery' ? Math.max(0, cfg.free_delivery_threshold - subtotal) : 0;
  const freeProgress = Math.min(100, (subtotal / Math.max(1, cfg.free_delivery_threshold)) * 100);

  const openProduct = (product: Product) => {
    const hasOptions = ((product.customizations || []) as CustomizationGroupRaw[]).length > 0;
    if (hasOptions) {
      setSelectedProduct(product);
    } else {
      store.addToCart(product, [], 1, productPrice(product, mode));
      setJustAdded(product.id);
      setTimeout(() => setJustAdded((cur) => (cur === product.id ? null : cur)), 1000);
    }
  };

  if (qrToken) {
    return <Navigate to={`/store?t=${encodeURIComponent(qrToken)}`} replace />;
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-5 pt-12 pb-36">
        <div className="h-4 w-32 rounded vt-shimmer" />
        <div className="mt-4 h-10 w-52 rounded-lg vt-shimmer" />
        <div className="mt-8 h-11 rounded-full vt-shimmer" />
        <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[4/3] rounded-2xl vt-shimmer" />
              <div className="mt-4 h-4 w-3/4 rounded vt-shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pt-12 pb-36">
      <div className="vt-overline">Online ordering · delivery &amp; pick up</div>
      <h1 className="mt-3 text-4xl font-medium tracking-tight md:text-5xl">Order online</h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-[color:var(--vt-muted)]">
        Order any time — we cook when the kitchen is open, and pre-orders are ready when you want them. Pay on delivery
        or pick up. All prices in AUD.
      </p>

      <OrderingPanel hasLunchProducts={hasLunchProducts} />

      <div className="sticky top-[68px] z-30 -mx-5 bg-[color:rgba(11,11,13,0.94)] px-5 pb-3 pt-3 backdrop-blur-md [@media(max-height:560px)]:static">
        {showSummary && cfg.enabled && (
          <button
            type="button"
            onClick={scrollToPanel}
            className="mb-2.5 flex w-full items-center justify-between gap-3 rounded-xl border border-[color:var(--vt-line)] bg-[color:rgba(255,255,255,0.04)] px-4 py-2 text-left text-xs"
          >
            <span className="truncate text-[color:var(--vt-text)]">
              <b>{mode === 'delivery' ? 'Delivery' : 'Pick up'}</b> · {summaryWhen}
            </span>
            <span className="shrink-0 font-semibold text-[color:var(--vt-accent)]">Change</span>
          </button>
        )}
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 w-4 -translate-y-1/2 text-[color:var(--vt-muted)]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search the menu…"
            className="w-full rounded-full border border-[color:var(--vt-line)] bg-[color:rgba(255,255,255,0.03)] py-3 pl-11 pr-10 text-base focus:border-[color:var(--vt-accent)] focus:outline-none sm:py-2.5 sm:text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[color:rgba(255,255,255,0.08)] text-[color:var(--vt-muted)] transition-colors hover:text-[color:var(--vt-text)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {['All', ...(hasLunchProducts ? ['Lunch specials'] : []), ...categories].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-[13px] transition-colors ${
                activeCategory === cat
                  ? 'border-transparent bg-gradient-to-r from-[#ff7a52] to-[color:var(--vt-accent)] font-semibold text-white shadow-[0_6px_20px_-6px_rgba(232,53,63,0.6)]'
                  : 'border-[color:var(--vt-line)] text-[color:var(--vt-muted)] hover:border-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 text-[11px] uppercase tracking-widest text-[color:var(--vt-muted)]">
        {filtered.length} dishes
      </div>

      {grouped.map(([cat, items]) => (
        <section key={cat} className="mt-10">
          <h2 className="font-serif text-xl text-[color:var(--vt-ivory)]">{cat}</h2>
          {cat === 'Lunch specials' && (
            <p className="mt-1 text-xs text-[color:var(--vt-muted)]">
              Pre-order only — book for tomorrow or later{cfg.lunch.end_time ? `, up to ${formatHM(cfg.lunch.end_time)}` : ''}.
            </p>
          )}
          <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => {
              const soldOut = productAvailability[p.id] === false && !hasAvailableVariant(p);
              const hasOptions = ((p.customizations || []) as CustomizationGroupRaw[]).length > 0;
              // Items without their own price (entrees/drinks that only come with the Lunch Combo) cannot be ordered on their own.
              const unpriced = !(productPrice(p, mode) > 0);
              const blocked = soldOut || unpriced;
              return (
                <div
                  key={p.id}
                  className={`vt-card group overflow-hidden transition-all duration-300 ${
                    soldOut
                      ? 'opacity-45'
                      : 'hover:-translate-y-1 hover:border-[color:rgba(232,53,63,0.5)] hover:shadow-[0_20px_45px_-20px_rgba(232,53,63,0.45)]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => !blocked && openProduct(p)}
                    className="relative block w-full overflow-hidden rounded-2xl bg-[color:rgba(255,255,255,0.03)] text-left"
                  >
                    <div className="relative aspect-[4/3]">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[color:rgba(232,53,63,0.08)] via-transparent to-[color:rgba(255,255,255,0.03)]">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.05)]">
                            <UtensilsCrossed className="h-5 w-5 text-[color:var(--vt-accent)]" />
                          </div>
                        </div>
                      )}
                      <div className="absolute left-2.5 top-2.5 flex gap-1">
                        {p.is_lunch_special && (
                          <span className="rounded-full bg-[color:var(--vt-accent)] px-2 py-0.5 text-[10px] font-bold text-white">
                            Lunch · pre-order
                          </span>
                        )}
                        {p.is_vegan && (
                          <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-[color:var(--vt-leaf)] backdrop-blur">
                            Vegan
                          </span>
                        )}
                        {p.is_gluten_free && (
                          <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-[color:var(--vt-ivory)] backdrop-blur">
                            GF
                          </span>
                        )}
                      </div>
                      {soldOut && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[1px]">
                          <span className="rounded-full bg-[color:var(--vt-accent)] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
                            Sold out
                          </span>
                        </div>
                      )}
                      {!soldOut && (
                        <div className="absolute bottom-2.5 left-2.5 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                          {unpriced ? 'Included with Lunch Combo' : formatAUD(productPrice(p, mode))}
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[15px] font-semibold">{p.name}</span>
                      {!blocked && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (justAdded === p.id) return;
                            openProduct(p);
                          }}
                          aria-label={`Add ${p.name}`}
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
                            justAdded === p.id
                              ? 'bg-[color:var(--vt-leaf)] text-white'
                              : 'bg-gradient-to-br from-[#ff7a52] to-[color:var(--vt-accent)] text-white shadow-[0_6px_16px_-6px_rgba(232,53,63,0.7)] hover:scale-110'
                          }`}
                        >
                          {justAdded === p.id ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                    {p.description && (
                      <p className="mt-1 line-clamp-1 text-xs text-[color:var(--vt-muted)]">{p.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[color:var(--vt-muted)]">
                      {justAdded === p.id ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-[color:var(--vt-leaf)]">
                          <Check className="h-3 w-3" /> Added to cart
                        </span>
                      ) : unpriced ? (
                        'Choose it with a Lunch Combo'
                      ) : hasOptions ? (
                        'Tap to customise'
                      ) : (
                        'Quick add'
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {filtered.length === 0 && (
        <div className="py-24 text-center text-[color:var(--vt-muted)]">No dishes match your search.</div>
      )}

      {count > 0 && !store.cartOpen && (
        <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:bottom-6 md:right-6 md:left-auto md:w-96 md:px-0 md:pb-0">
          {mode === 'delivery' && (
            <div className="mb-2 rounded-2xl border border-[color:var(--vt-line)] bg-[color:rgba(11,11,13,0.94)] px-4 py-2.5 text-xs backdrop-blur-md">
              {freeRemaining > 0 ? (
                <span className="text-[color:var(--vt-muted)]">
                  Add <b className="text-[color:var(--vt-text)]">{formatAUD(freeRemaining)}</b> for free delivery
                </span>
              ) : (
                <span className="font-semibold text-[color:var(--vt-leaf)]">Free delivery unlocked</span>
              )}
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color:rgba(255,255,255,0.08)]">
                <div
                  className={`h-full rounded-full transition-all ${freeRemaining > 0 ? 'bg-[color:var(--vt-accent)]' : 'bg-[color:var(--vt-leaf)]'}`}
                  style={{ width: `${freeProgress}%` }}
                />
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => store.setCartOpen(true)}
            className="vt-glow flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#ff7a52] to-[color:var(--vt-accent)] px-7 py-4 text-sm font-bold text-white transition-all hover:brightness-110"
          >
            <ShoppingBag className="h-5 w-5" />
            View cart · {count} item{count > 1 ? 's' : ''} · {formatAUD(subtotal)}
          </button>
        </div>
      )}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          variantAvailability={variantAvailability}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
