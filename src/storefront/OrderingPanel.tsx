import { useEffect, useMemo, useState } from 'react';
import { Bike, Store, Clock, CalendarClock, Info } from 'lucide-react';
import { buildSlots, describeHours, formatDayLabel, formatHM, formatTime, getOpenStatus, zonedParts, zonedToUtc } from '../lib/onlineOrdering';
import { useStorefront } from './StorefrontContext';
import { formatAUD } from './types';

function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--vt-accent)] text-xs font-bold text-white">{n}</span>
      <span className="text-sm font-semibold text-[color:var(--vt-text)]">{children}</span>
    </div>
  );
}

const tileBase = 'rounded-2xl border p-4 text-left transition-all';
const tileOn = 'border-[color:var(--vt-accent)] bg-[color:var(--vt-accent-soft)] shadow-[0_0_0_1px_var(--vt-accent)]';
const tileOff = 'border-[color:var(--vt-border)] hover:border-[color:var(--vt-muted)]';

export default function OrderingPanel({ hasLunchProducts }: { hasLunchProducts: boolean }) {
  const { mode, setMode, onlineConfig: cfg, fulfilment, setFulfilment, hasLunchItem } = useStorefront();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const status = useMemo(() => getOpenStatus(cfg, now), [cfg, now]);
  const slots = useMemo(
    () => buildSlots(cfg, now, { delivery: mode === 'delivery', lunch: hasLunchItem }),
    [cfg, now, mode, hasLunchItem]
  );
  const allTimes = useMemo(() => slots.flatMap((d) => d.times.map((t) => t.iso)), [slots]);
  const asapAllowed = cfg.enabled && status.canAsap && !hasLunchItem;

  const dayKeyOf = (iso: string) => {
    const p = zonedParts(new Date(iso), cfg.timezone);
    return `${p.y}-${p.m}-${p.d}`;
  };
  const dayRanges = useMemo(
    () =>
      slots.map((d) => ({
        key: d.key,
        start: new Date(d.times[0].iso).getTime(),
        end: new Date(d.times[d.times.length - 1].iso).getTime(),
        startMin: zonedParts(new Date(d.times[0].iso), cfg.timezone).minutes,
        endMin: zonedParts(new Date(d.times[d.times.length - 1].iso), cfg.timezone).minutes,
        y: zonedParts(new Date(d.times[0].iso), cfg.timezone).y,
        m: zonedParts(new Date(d.times[0].iso), cfg.timezone).m,
        d: zonedParts(new Date(d.times[0].iso), cfg.timezone).d,
      })),
    [slots, cfg.timezone]
  );
  const isValidTime = (iso: string | null) => {
    if (!iso) return false;
    const ms = new Date(iso).getTime();
    const key = dayKeyOf(iso);
    return dayRanges.some((r) => r.key === key && ms >= r.start && ms <= r.end);
  };

  useEffect(() => {
    if (!cfg.enabled) return;
    if (fulfilment.when === 'asap') {
      if (!asapAllowed && allTimes.length > 0) setFulfilment({ when: 'scheduled', scheduledFor: allTimes[0] });
      return;
    }
    if (!isValidTime(fulfilment.scheduledFor)) {
      if (allTimes.length > 0) setFulfilment({ when: 'scheduled', scheduledFor: allTimes[0] });
      else if (fulfilment.scheduledFor) setFulfilment({ when: 'scheduled', scheduledFor: null });
    }
  }, [cfg.enabled, asapAllowed, allTimes.join('|'), fulfilment.when, fulfilment.scheduledFor]);

  const selectedDay = (fulfilment.scheduledFor && slots.find((d) => d.key === dayKeyOf(fulfilment.scheduledFor!))) || slots[0] || null;
  const selectedRange = selectedDay ? dayRanges.find((r) => r.key === selectedDay.key) || null : null;
  const minToInput = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const [timeText, setTimeText] = useState('');
  const [timeError, setTimeError] = useState('');
  useEffect(() => {
    if (fulfilment.scheduledFor && isValidTime(fulfilment.scheduledFor)) {
      setTimeText(minToInput(zonedParts(new Date(fulfilment.scheduledFor), cfg.timezone).minutes));
      setTimeError('');
    }
  }, [fulfilment.scheduledFor]);

  const onPickTime = (text: string) => {
    setTimeText(text);
    if (!selectedRange || !/^\d{1,2}:\d{2}$/.test(text)) return;
    const [hh, mm] = text.split(':').map((x) => parseInt(x, 10));
    const mins = hh * 60 + mm;
    const iso = zonedToUtc(selectedRange.y, selectedRange.m, selectedRange.d, mins, cfg.timezone).toISOString();
    if (mins < selectedRange.startMin || mins > selectedRange.endMin || !isValidTime(iso)) {
      setTimeError(`Please choose a time between ${formatTimeMin(selectedRange.startMin)} and ${formatTimeMin(selectedRange.endMin)}.`);
      return;
    }
    setTimeError('');
    setFulfilment({ when: 'scheduled', scheduledFor: iso });
  };
  const selectedTime = fulfilment.scheduledFor && isValidTime(fulfilment.scheduledFor) ? { iso: fulfilment.scheduledFor, label: formatTime(new Date(fulfilment.scheduledFor), cfg.timezone) } : null;
  const formatTimeMin = (m: number) => formatHM(minToInput(m));
  const prepDelivery = cfg.prep_minutes + cfg.delivery_extra_minutes;

  const statusBadge = !cfg.enabled ? (
    <span className="inline-flex items-center gap-2 rounded-full bg-[color:rgba(239,68,68,0.12)] px-3 py-1 text-xs font-semibold text-[color:var(--vt-chili)]">
      <span className="h-2 w-2 rounded-full bg-[color:var(--vt-chili)]" /> Ordering paused — please call us
    </span>
  ) : status.canAsap ? (
    <span className="inline-flex items-center gap-2 rounded-full bg-[color:rgba(34,197,94,0.12)] px-3 py-1 text-xs font-semibold text-[color:var(--vt-leaf)]">
      <span className="h-2 w-2 rounded-full bg-[color:var(--vt-leaf)]" /> Open now · last ASAP order {status.lastOrderLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full bg-[color:rgba(251,191,36,0.12)] px-3 py-1 text-xs font-semibold text-amber-400">
      <span className="h-2 w-2 rounded-full bg-amber-400" />
      Closed now
      {status.nextOpen && ` · opens ${formatDayLabel(status.nextOpen, cfg.timezone)}, ${formatTime(status.nextOpen, cfg.timezone)}`}
    </span>
  );

  return (
    <section id="ordering-panel" className="vt-card mt-6 scroll-mt-24 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {statusBadge}
        <span className="text-xs text-[color:var(--vt-muted)]">{describeHours(cfg)}</span>
      </div>

      {!status.canAsap && cfg.enabled && (
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[color:var(--vt-muted)]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          The kitchen is closed, but you can still order — pick a time below and we will have it ready.
        </p>
      )}

      <div className="mt-6 grid gap-7 md:grid-cols-2">
        <div>
          <StepTitle n={1}>How would you like it?</StepTitle>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setMode('delivery')} className={`${tileBase} ${mode === 'delivery' ? tileOn : tileOff}`}>
              <Bike className="h-5 w-5 text-[color:var(--vt-accent)]" />
              <div className="mt-2 text-sm font-semibold">Delivery</div>
              <div className="mt-0.5 text-[11px] text-[color:var(--vt-muted)]">
                {formatAUD(cfg.delivery_fee)} · free over {formatAUD(cfg.free_delivery_threshold)}
              </div>
            </button>
            <button type="button" onClick={() => setMode('takeaway')} className={`${tileBase} ${mode === 'takeaway' ? tileOn : tileOff}`}>
              <Store className="h-5 w-5 text-[color:var(--vt-accent)]" />
              <div className="mt-2 text-sm font-semibold">Pick up</div>
              <div className="mt-0.5 text-[11px] text-[color:var(--vt-muted)]">503A Burwood Hwy</div>
            </button>
          </div>
        </div>

        <div>
          <StepTitle n={2}>When?</StepTitle>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!asapAllowed}
              onClick={() => setFulfilment({ when: 'asap', scheduledFor: null })}
              className={`${tileBase} disabled:cursor-not-allowed disabled:opacity-40 ${fulfilment.when === 'asap' ? tileOn : tileOff}`}
            >
              <Clock className="h-5 w-5 text-[color:var(--vt-accent)]" />
              <div className="mt-2 text-sm font-semibold">As soon as possible</div>
              <div className="mt-0.5 text-[11px] text-[color:var(--vt-muted)]">
                {hasLunchItem ? 'Not for lunch specials' : asapAllowed ? `About ${mode === 'delivery' ? prepDelivery : cfg.prep_minutes} min` : 'Closed right now'}
              </div>
            </button>
            <button
              type="button"
              disabled={allTimes.length === 0 || !cfg.enabled}
              onClick={() => setFulfilment({ when: 'scheduled', scheduledFor: fulfilment.scheduledFor || allTimes[0] || null })}
              className={`${tileBase} disabled:cursor-not-allowed disabled:opacity-40 ${fulfilment.when === 'scheduled' ? tileOn : tileOff}`}
            >
              <CalendarClock className="h-5 w-5 text-[color:var(--vt-accent)]" />
              <div className="mt-2 text-sm font-semibold">Pick a time</div>
              <div className="mt-0.5 text-[11px] text-[color:var(--vt-muted)]">Book ahead (pre-order)</div>
            </button>
          </div>
        </div>
      </div>

      {fulfilment.when === 'scheduled' && selectedDay && (
        <div className="mt-6 rounded-2xl border border-[color:var(--vt-line)] bg-[color:rgba(255,255,255,0.02)] p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-[color:var(--vt-text)]">Choose a day &amp; time</div>
            {selectedTime && (
              <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--vt-accent-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--vt-accent)]">
                <CalendarClock className="h-3.5 w-3.5" />
                {selectedDay.label === 'Today' || selectedDay.label === 'Tomorrow' ? `${selectedDay.label} · ` : ''}
                {formatDayLabel(new Date(selectedTime.iso), cfg.timezone)} · {selectedTime.label}
              </div>
            )}
          </div>

          <div className="mt-4 flex snap-x gap-2.5 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {slots.map((d) => {
              const dt = new Date(d.times[0].iso);
              const wd = new Intl.DateTimeFormat('en-AU', { timeZone: cfg.timezone, weekday: 'short' }).format(dt);
              const dayNum = new Intl.DateTimeFormat('en-AU', { timeZone: cfg.timezone, day: 'numeric' }).format(dt);
              const mon = new Intl.DateTimeFormat('en-AU', { timeZone: cfg.timezone, month: 'short' }).format(dt);
              const on = selectedDay.key === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setFulfilment({ when: 'scheduled', scheduledFor: d.times[0].iso })}
                  className={`flex w-[76px] shrink-0 snap-start flex-col items-center rounded-2xl border px-2 py-2.5 transition-all ${
                    on
                      ? 'border-transparent bg-gradient-to-b from-[#ff7a52] to-[color:var(--vt-accent)] text-white shadow-lg'
                      : 'border-[color:var(--vt-border)] text-[color:var(--vt-muted)] hover:border-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)]'
                  }`}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{d.label === 'Today' || d.label === 'Tomorrow' ? d.label : wd}</span>
                  <span className="text-xl font-bold leading-tight">{dayNum}</span>
                  <span className="text-[10px] opacity-80">{mon}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 text-[11px] uppercase tracking-widest text-[color:var(--vt-muted)]">
            {mode === 'delivery' ? 'Deliver me at' : 'Ready for pick up at'}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              type="time"
              value={timeText}
              min={selectedRange ? minToInput(selectedRange.startMin) : undefined}
              max={selectedRange ? minToInput(selectedRange.endMin) : undefined}
              onChange={(e) => onPickTime(e.target.value)}
              className="w-44 rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.04)] px-4 py-3 text-lg font-semibold text-[color:var(--vt-text)] [color-scheme:dark] focus:border-[color:var(--vt-accent)] focus:outline-none"
            />
            {selectedRange && (
              <button
                type="button"
                onClick={() => setFulfilment({ when: 'scheduled', scheduledFor: selectedDay!.times[0].iso })}
                className="rounded-full border border-[color:var(--vt-border)] px-3.5 py-2 text-xs font-medium text-[color:var(--vt-muted)] transition-colors hover:border-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)]"
              >
                Earliest · {selectedDay!.times[0].label}
              </button>
            )}
          </div>
          <p className={`mt-2 text-xs ${timeError ? 'text-amber-400' : 'text-[color:var(--vt-muted)]'}`}>
            {timeError || (selectedRange ? `Any time between ${formatTimeMin(selectedRange.startMin)} and ${formatTimeMin(selectedRange.endMin)}.` : '')}
          </p>
        </div>
      )}
      {cfg.enabled && allTimes.length === 0 && (
        <div className="mt-4 text-xs text-amber-400">No pre-order times are available right now.</div>
      )}

      {(hasLunchProducts || hasLunchItem) && cfg.lunch.enabled && (
        <div className="mt-5 rounded-xl border border-[color:var(--vt-line)] bg-[color:rgba(255,255,255,0.02)] px-4 py-3 text-xs leading-relaxed text-[color:var(--vt-muted)]">
          <b className="text-[color:var(--vt-text)]">Lunch specials are pre-order only.</b> Book for tomorrow or later{cfg.lunch.end_time ? `, up to ${formatHM(cfg.lunch.end_time)}` : ''}.
          {hasLunchItem && <span className="text-[color:var(--vt-accent)]"> Your cart has a lunch special — pick a day and time above.</span>}
        </div>
      )}
    </section>
  );
}
