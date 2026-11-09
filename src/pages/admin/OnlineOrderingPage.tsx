import { useEffect, useMemo, useState } from 'react';
import { Globe, Save, Loader2, Clock, Truck, CalendarClock, Eye, Copy, Search, Check, UtensilsCrossed, AlertTriangle } from 'lucide-react';
import { fetchSettings, updateSettings } from '../../lib/api/settings';
import { fetchProducts, updateProduct } from '../../lib/api/products';
import type { Product } from '../../lib/supabase';
import {
  DAY_KEYS,
  DAY_LABELS,
  DEFAULT_ONLINE_CONFIG,
  buildSlots,
  getOpenStatus,
  formatTime,
  formatDayLabel,
  parseHM,
  resolveOnlineConfig,
  type DayKey,
  type OnlineOrderingConfig,
} from '../../lib/onlineOrdering';

const inputCls =
  'w-full bg-theme-bg border border-theme-border py-2.5 px-3 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm';
const labelCls = 'block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2';
const HIDDEN_CATEGORIES = new Set(['sub-recipe', 'extras']);

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-theme-accent' : 'bg-theme-border'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-black transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
        style={{ background: checked ? '#000' : '#9ca3af' }}
      />
    </button>
  );
}

function Card({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-theme-surface border border-theme-border">
      <div className="px-4 py-4 sm:px-6 border-b border-theme-border bg-theme-surface-alt flex items-start gap-3 text-theme-ink">
        <div className="mt-0.5 text-theme-accent">{icon}</div>
        <div>
          <h2 className="font-serif text-lg leading-tight">{title}</h2>
          {hint && <p className="text-theme-ink-dim text-xs mt-1">{hint}</p>}
        </div>
      </div>
      <div className="space-y-5 p-4 sm:p-6">{children}</div>
    </section>
  );
}

export default function OnlineOrderingPage() {
  const [cfg, setCfg] = useState<OnlineOrderingConfig>(DEFAULT_ONLINE_CONFIG);
  const [savedCfg, setSavedCfg] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [lunchIds, setLunchIds] = useState<Set<string>>(new Set());
  const [savedLunch, setSavedLunch] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [missingMigration, setMissingMigration] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [dishSearch, setDishSearch] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [s, prods] = await Promise.all([fetchSettings(), fetchProducts()]);
        if (s && 'online_ordering' in s) {
          const resolved = resolveOnlineConfig(s.online_ordering);
          setCfg(resolved);
          setSavedCfg(JSON.stringify(resolved));
        } else {
          setMissingMigration(true);
          setSavedCfg(JSON.stringify(DEFAULT_ONLINE_CONFIG));
        }
        const list = prods.filter((p) => !HIDDEN_CATEGORIES.has((p.category || '').toLowerCase()) && p.is_active !== false);
        setProducts(list);
        const ids = new Set(list.filter((p) => p.is_lunch_special).map((p) => p.id));
        setLunchIds(ids);
        setSavedLunch(new Set(ids));
      } catch (e) {
        console.error('Failed to load online ordering settings', e);
        setMissingMigration(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const lunchDirty = useMemo(
    () => lunchIds.size !== savedLunch.size || [...lunchIds].some((id) => !savedLunch.has(id)),
    [lunchIds, savedLunch]
  );
  const dirty = JSON.stringify(cfg) !== savedCfg || lunchDirty;

  const hoursProblems = DAY_KEYS.filter((d) => {
    const h = cfg.hours[d];
    return h && parseHM(h.close) <= parseHM(h.open);
  });

  const status = useMemo(() => getOpenStatus(cfg, now), [cfg, now]);
  const preview = useMemo(() => buildSlots(cfg, now, { delivery: true, lunch: false }).slice(0, 4), [cfg, now]);

  const set = <K extends keyof OnlineOrderingConfig>(key: K, value: OnlineOrderingConfig[K]) => setCfg((c) => ({ ...c, [key]: value }));
  const num = (v: string, fallback: number) => {
    const n = parseFloat(v);
    return isFinite(n) && n >= 0 ? n : fallback;
  };
  const setDay = (day: DayKey, patch: { open?: string; close?: string } | null) =>
    setCfg((c) => ({
      ...c,
      hours: { ...c.hours, [day]: patch === null ? null : { ...(c.hours[day] || { open: '16:30', close: '21:30' }), ...patch } },
    }));

  const copyFirstToAll = () => {
    const first = DAY_KEYS.map((d) => cfg.hours[d]).find((h) => !!h);
    if (!first) return;
    setCfg((c) => {
      const hours = { ...c.hours };
      DAY_KEYS.forEach((d) => (hours[d] = { ...first }));
      return { ...c, hours };
    });
  };

  const save = async () => {
    if (hoursProblems.length > 0) {
      setMessage({ ok: false, text: 'Closing time must be later than opening time.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await updateSettings({ online_ordering: cfg });
      const changed = products.filter((p) => lunchIds.has(p.id) !== !!p.is_lunch_special);
      for (const p of changed) await updateProduct(p.id, { is_lunch_special: lunchIds.has(p.id) });
      setProducts((prev) => prev.map((p) => ({ ...p, is_lunch_special: lunchIds.has(p.id) })));
      setSavedCfg(JSON.stringify(cfg));
      setSavedLunch(new Set(lunchIds));
      setMessage({ ok: true, text: 'Saved. The website uses the new settings straight away.' });
    } catch (e: any) {
      setMessage({ ok: false, text: e?.userMessage || 'Could not save. Please try again.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const grouped = useMemo(() => {
    const q = dishSearch.trim().toLowerCase();
    const map = new Map<string, Product[]>();
    products
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .forEach((p) => {
        const k = p.category || 'Other';
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(p);
      });
    return Array.from(map.entries());
  }, [products, dishSearch]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
      </div>
    );
  }

  const readyDelivery = cfg.prep_minutes + cfg.delivery_extra_minutes;

  return (
    <div className="max-w-4xl mx-auto pb-28 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-theme-ink mb-2 flex items-center gap-3">
            <Globe className="w-7 h-7 text-theme-accent" /> Online Ordering
          </h1>
          <p className="text-theme-ink-dim text-sm">
            Control when customers can order on the website, how fast we cook, delivery fees and lunch specials.
          </p>
        </div>
        <a href="/order" target="_blank" rel="noreferrer" className="text-xs uppercase tracking-wider text-theme-accent font-semibold hover:underline">
          View the order page ↗
        </a>
      </header>

      {missingMigration && (
        <div className="mb-6 flex items-start gap-3 border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-300">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>The online ordering database update has not been applied, so these settings cannot be saved yet.</span>
        </div>
      )}

      <div className="space-y-6">
        {/* 1. Master switch + live status */}
        <section className="bg-theme-surface border border-theme-border p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <Toggle checked={cfg.enabled} onChange={(v) => set('enabled', v)} label="Accept online orders" />
            <div>
              <div className="text-theme-ink font-semibold">Accept online orders</div>
              <div className="text-xs text-theme-ink-dim mt-0.5">Turn off to pause the order page (customers are asked to call).</div>
            </div>
          </div>
          <div
            className={`text-sm font-semibold px-4 py-2 border ${
              !cfg.enabled
                ? 'border-red-400/40 text-red-300 bg-red-400/10'
                : status.canAsap
                  ? 'border-emerald-400/40 text-emerald-300 bg-emerald-400/10'
                  : 'border-amber-400/40 text-amber-300 bg-amber-400/10'
            }`}
          >
            {!cfg.enabled
              ? 'Paused — customers cannot order'
              : status.canAsap
                ? `Open now — ASAP orders accepted until ${status.lastOrderLabel}`
                : status.nextOpen
                  ? `Closed for ASAP — pre-orders only until ${formatDayLabel(status.nextOpen, cfg.timezone)}, ${formatTime(status.nextOpen, cfg.timezone)}`
                  : 'Closed — pre-orders only'}
          </div>
        </section>

        {/* 2. Opening hours */}
        <Card
          icon={<Clock className="w-5 h-5" />}
          title="Opening hours"
          hint="The kitchen cooks only inside these hours. Customers can still place pre-orders for these times at any hour."
        >
          <div className="divide-y divide-theme-border border border-theme-border">
            {DAY_KEYS.map((day) => {
              const h = cfg.hours[day];
              const bad = hoursProblems.includes(day);
              return (
                <div key={day} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3 sm:px-4">
                  <div className="w-24 text-sm font-medium text-theme-ink">{DAY_LABELS[day]}</div>
                  <Toggle checked={!!h} onChange={(v) => setDay(day, v ? {} : null)} label={`${DAY_LABELS[day]} open`} />
                  {h ? (
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                      <input type="time" value={h.open} onChange={(e) => setDay(day, { open: e.target.value })} className={`${inputCls} min-w-0 flex-1 sm:w-32 sm:flex-none`} />
                      <span className="text-theme-ink-dim text-sm">to</span>
                      <input type="time" value={h.close} onChange={(e) => setDay(day, { close: e.target.value })} className={`${inputCls} min-w-0 flex-1 sm:w-32 sm:flex-none ${bad ? 'border-red-400' : ''}`} />
                      {bad && <span className="w-full text-xs text-red-400 sm:w-auto">Must be after opening</span>}
                    </div>
                  ) : (
                    <span className="text-sm text-theme-ink-dim italic">Closed all day</span>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={copyFirstToAll}
            className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-theme-accent hover:underline"
          >
            <Copy className="w-4 h-4" /> Copy the first open day to every day
          </button>
        </Card>

        {/* 3. Timing */}
        <Card
          icon={<CalendarClock className="w-5 h-5" />}
          title="Timing"
          hint="How long orders take and how far ahead customers can book."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Kitchen prep time (minutes)</label>
              <input type="number" min={0} value={cfg.prep_minutes} onChange={(e) => set('prep_minutes', num(e.target.value, 0))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Extra time for delivery (minutes)</label>
              <input type="number" min={0} value={cfg.delivery_extra_minutes} onChange={(e) => set('delivery_extra_minutes', num(e.target.value, 0))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Stop ASAP orders before closing (minutes)</label>
              <input type="number" min={0} value={cfg.last_order_minutes_before_close} onChange={(e) => set('last_order_minutes_before_close', num(e.target.value, 0))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Pre-order time slots (every … minutes)</label>
              <select value={cfg.slot_minutes} onChange={(e) => set('slot_minutes', parseInt(e.target.value, 10))} className={inputCls}>
                {[10, 15, 20, 30, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Customers can pre-order up to (days ahead)</label>
              <input type="number" min={1} max={60} value={cfg.schedule_days_ahead} onChange={(e) => set('schedule_days_ahead', Math.max(1, num(e.target.value, 7)))} className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-theme-ink-dim bg-theme-bg border border-theme-border p-3">
            Example: a customer ordering ASAP for delivery is told <b className="text-theme-ink">about {readyDelivery} minutes</b> ({cfg.prep_minutes} cooking + {cfg.delivery_extra_minutes} delivery). Pick up takes <b className="text-theme-ink">{cfg.prep_minutes} minutes</b>.
          </p>
        </Card>

        {/* 4. Delivery */}
        <Card icon={<Truck className="w-5 h-5" />} title="Delivery fee" hint="Free delivery encourages bigger group orders.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Delivery fee ($)</label>
              <input type="number" min={0} step="0.5" value={cfg.delivery_fee} onChange={(e) => set('delivery_fee', num(e.target.value, 0))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Free delivery on orders from ($)</label>
              <input type="number" min={0} value={cfg.free_delivery_threshold} onChange={(e) => set('free_delivery_threshold', num(e.target.value, 250))} className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-theme-ink-dim bg-theme-bg border border-theme-border p-3">
            Example: a ${(cfg.free_delivery_threshold - 50).toFixed(0)} order pays <b className="text-theme-ink">${cfg.delivery_fee.toFixed(2)}</b> delivery.
            An order of ${cfg.free_delivery_threshold.toFixed(0)} or more gets <b className="text-theme-ink">free delivery</b>. The prices before GST are used.
          </p>
        </Card>

        {/* 5. Lunch specials */}
        <Card
          icon={<UtensilsCrossed className="w-5 h-5" />}
          title="Lunch specials (pre-order only)"
          hint="Tick the dishes that are lunch specials. Customers must book them for another day."
        >
          <div className="flex items-center gap-4">
            <Toggle checked={cfg.lunch.enabled} onChange={(v) => set('lunch', { ...cfg.lunch, enabled: v })} label="Lunch special pre-orders" />
            <div className="text-sm text-theme-ink">Allow lunch special pre-orders</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Lunch pick-up / delivery until (blank = normal opening hours)</label>
              <input type="time" value={cfg.lunch.end_time} onChange={(e) => set('lunch', { ...cfg.lunch, end_time: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Customers must order at least (days ahead)</label>
              <input type="number" min={0} value={cfg.lunch.min_days_ahead} onChange={(e) => set('lunch', { ...cfg.lunch, min_days_ahead: Math.max(0, num(e.target.value, 1)) })} className={inputCls} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className={`${labelCls} mb-0`}>Lunch special dishes ({lunchIds.size} selected)</label>
              {lunchIds.size > 0 && (
                <button type="button" onClick={() => setLunchIds(new Set())} className="text-xs text-theme-ink-dim hover:text-theme-ink underline">
                  Clear all
                </button>
              )}
            </div>
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-ink-dim" />
              <input value={dishSearch} onChange={(e) => setDishSearch(e.target.value)} placeholder="Search dishes…" className={`${inputCls} pl-9`} />
            </div>
            <div className="max-h-80 overflow-y-auto border border-theme-border divide-y divide-theme-border">
              {grouped.length === 0 && <div className="p-4 text-sm text-theme-ink-dim">No dishes match.</div>}
              {grouped.map(([cat, items]) => (
                <div key={cat}>
                  <div className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-theme-ink-dim bg-theme-surface-alt">{cat}</div>
                  {items.map((p) => {
                    const on = lunchIds.has(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-theme-surface-alt text-sm text-theme-ink">
                        <span className={`flex h-5 w-5 items-center justify-center border ${on ? 'bg-theme-accent border-theme-accent' : 'border-theme-border'}`}>
                          {on && <Check className="w-3.5 h-3.5 text-black" />}
                        </span>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={on}
                          onChange={() =>
                            setLunchIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(p.id)) next.delete(p.id);
                              else next.add(p.id);
                              return next;
                            })
                          }
                        />
                        {p.name}
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* 6. Preview */}
        <Card icon={<Eye className="w-5 h-5" />} title="What customers will see" hint="A live preview of the pre-order times shown for delivery.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {preview.length === 0 && <div className="text-sm text-theme-ink-dim">No pre-order times available with these settings.</div>}
            {preview.map((d) => (
              <div key={d.key} className="border border-theme-border bg-theme-bg px-4 py-3">
                <div className="text-sm font-semibold text-theme-ink">{d.label}</div>
                <div className="text-xs text-theme-ink-dim mt-0.5">
                  {d.times[0].label} – {d.times[d.times.length - 1].label} · {d.times.length} time slots
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-theme-border bg-theme-surface/95 backdrop-blur lg:left-64">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="text-sm">
            {message ? (
              <span className={message.ok ? 'text-emerald-400' : 'text-red-400'}>{message.text}</span>
            ) : dirty ? (
              <span className="text-amber-400">You have unsaved changes</span>
            ) : (
              <span className="text-theme-ink-dim">All changes saved</span>
            )}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty || missingMigration}
            className="bg-theme-accent text-black px-8 py-3 text-xs uppercase tracking-wider font-semibold flex items-center gap-2 disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
