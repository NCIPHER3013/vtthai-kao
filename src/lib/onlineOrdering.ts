export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export interface DayHours {
  open: string;
  close: string;
}

export interface OnlineOrderingConfig {
  enabled: boolean;
  timezone: string;
  hours: Record<DayKey, DayHours | null>;
  last_order_minutes_before_close: number;
  prep_minutes: number;
  delivery_extra_minutes: number;
  slot_minutes: number;
  schedule_days_ahead: number;
  delivery_fee: number;
  free_delivery_threshold: number;
  lunch: { enabled: boolean; end_time: string; min_days_ahead: number };
}

export const SHOP_TIMEZONE = 'Australia/Melbourne';

const DEFAULT_DAY: DayHours = { open: '16:30', close: '21:30' };

export const DEFAULT_ONLINE_CONFIG: OnlineOrderingConfig = {
  enabled: true,
  timezone: SHOP_TIMEZONE,
  hours: { mon: DEFAULT_DAY, tue: DEFAULT_DAY, wed: DEFAULT_DAY, thu: DEFAULT_DAY, fri: DEFAULT_DAY, sat: DEFAULT_DAY, sun: DEFAULT_DAY },
  last_order_minutes_before_close: 30,
  prep_minutes: 30,
  delivery_extra_minutes: 15,
  slot_minutes: 15,
  schedule_days_ahead: 7,
  delivery_fee: 8,
  free_delivery_threshold: 250,
  lunch: { enabled: true, end_time: '', min_days_ahead: 1 },
};

export function resolveOnlineConfig(raw: any): OnlineOrderingConfig {
  const d = DEFAULT_ONLINE_CONFIG;
  if (!raw || typeof raw !== 'object') return d;
  const hours = {} as Record<DayKey, DayHours | null>;
  DAY_KEYS.forEach((k) => {
    const h = raw.hours && k in raw.hours ? raw.hours[k] : d.hours[k];
    hours[k] = h && typeof h === 'object' && h.open && h.close ? { open: String(h.open), close: String(h.close) } : null;
  });
  const num = (v: any, fallback: number) => (typeof v === 'number' && isFinite(v) ? v : fallback);
  return {
    enabled: raw.enabled !== false,
    timezone: typeof raw.timezone === 'string' && raw.timezone ? raw.timezone : d.timezone,
    hours,
    last_order_minutes_before_close: num(raw.last_order_minutes_before_close, d.last_order_minutes_before_close),
    prep_minutes: num(raw.prep_minutes, d.prep_minutes),
    delivery_extra_minutes: num(raw.delivery_extra_minutes, d.delivery_extra_minutes),
    slot_minutes: Math.max(5, num(raw.slot_minutes, d.slot_minutes)),
    schedule_days_ahead: Math.max(1, num(raw.schedule_days_ahead, d.schedule_days_ahead)),
    delivery_fee: num(raw.delivery_fee, d.delivery_fee),
    free_delivery_threshold: num(raw.free_delivery_threshold, d.free_delivery_threshold),
    lunch: {
      enabled: raw.lunch?.enabled !== false,
      end_time: typeof raw.lunch?.end_time === 'string' ? raw.lunch.end_time : d.lunch.end_time,
      min_days_ahead: Math.max(0, num(raw.lunch?.min_days_ahead, d.lunch.min_days_ahead)),
    },
  };
}

interface Zoned {
  y: number;
  m: number;
  d: number;
  h: number;
  mi: number;
  dow: DayKey;
  minutes: number;
}

const WEEKDAY_MAP: Record<string, DayKey> = { Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun' };
const JS_DOW: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function zonedParts(date: Date, tz: string): Zoned {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  });
  const parts: Record<string, string> = {};
  fmt.formatToParts(date).forEach((p) => {
    parts[p.type] = p.value;
  });
  const h = parseInt(parts.hour, 10) % 24;
  const mi = parseInt(parts.minute, 10);
  return {
    y: parseInt(parts.year, 10),
    m: parseInt(parts.month, 10),
    d: parseInt(parts.day, 10),
    h,
    mi,
    dow: WEEKDAY_MAP[parts.weekday] || 'mon',
    minutes: h * 60 + mi,
  };
}

function tzOffsetMinutes(utcMs: number, tz: string): number {
  const p = zonedParts(new Date(utcMs), tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi);
  return (asUtc - Math.floor(utcMs / 60000) * 60000) / 60000;
}

export function zonedToUtc(y: number, m: number, d: number, minutes: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  const off = tzOffsetMinutes(guess, tz);
  let res = guess - off * 60000;
  const off2 = tzOffsetMinutes(res, tz);
  if (off2 !== off) res = guess - off2 * 60000;
  return new Date(res);
}

export function addDays(y: number, m: number, d: number, n: number) {
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), dow: JS_DOW[dt.getUTCDay()] };
}

export function parseHM(s: string): number {
  const [h, m] = s.split(':').map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

export function formatTime(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-AU', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(date)
    .replace(/\s?([ap])m/i, (_, x) => ` ${x.toLowerCase()}m`);
}

export function formatHM(hm: string): string {
  const mins = parseHM(hm);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatDayLabel(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-AU', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

export function formatScheduled(iso: string, tz: string): string {
  const d = new Date(iso);
  return `${formatDayLabel(d, tz)}, ${formatTime(d, tz)}`;
}

export interface OpenStatus {
  enabled: boolean;
  isOpen: boolean;
  canAsap: boolean;
  closeLabel: string | null;
  lastOrderLabel: string | null;
  nextOpen: Date | null;
}

function minutesToHM(mins: number): string {
  const m = Math.max(0, mins);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function getOpenStatus(cfg: OnlineOrderingConfig, now: Date): OpenStatus {
  const p = zonedParts(now, cfg.timezone);
  const win = cfg.hours[p.dow];
  let isOpen = false;
  let canAsap = false;
  let closeLabel: string | null = null;
  let lastOrderLabel: string | null = null;
  if (win) {
    const open = parseHM(win.open);
    const close = parseHM(win.close);
    isOpen = p.minutes >= open && p.minutes < close;
    canAsap = p.minutes >= open && p.minutes <= close - cfg.last_order_minutes_before_close;
    closeLabel = formatHM(win.close);
    lastOrderLabel = formatHM(minutesToHM(close - cfg.last_order_minutes_before_close));
  }
  let nextOpen: Date | null = null;
  if (!canAsap) {
    for (let i = 0; i <= 7 && !nextOpen; i++) {
      const day = addDays(p.y, p.m, p.d, i);
      const w = cfg.hours[day.dow];
      if (!w) continue;
      const openMin = parseHM(w.open);
      if (i === 0 && p.minutes >= openMin) continue;
      nextOpen = zonedToUtc(day.y, day.m, day.d, openMin, cfg.timezone);
    }
  }
  return { enabled: cfg.enabled, isOpen, canAsap, closeLabel, lastOrderLabel, nextOpen };
}

export interface SlotDay {
  key: string;
  label: string;
  times: { iso: string; label: string }[];
}

export function buildSlots(
  cfg: OnlineOrderingConfig,
  now: Date,
  opts: { delivery: boolean; lunch: boolean }
): SlotDay[] {
  const p = zonedParts(now, cfg.timezone);
  const lead = cfg.prep_minutes + (opts.delivery ? cfg.delivery_extra_minutes : 0);
  const earliest = now.getTime() + lead * 60000;
  const lunchEnd = cfg.lunch.end_time ? parseHM(cfg.lunch.end_time) : 24 * 60;
  const out: SlotDay[] = [];
  for (let i = 0; i <= cfg.schedule_days_ahead; i++) {
    if (opts.lunch && i < cfg.lunch.min_days_ahead) continue;
    const day = addDays(p.y, p.m, p.d, i);
    const win = cfg.hours[day.dow];
    if (!win) continue;
    const open = parseHM(win.open);
    const last = parseHM(win.close) - cfg.last_order_minutes_before_close;
    const times: { iso: string; label: string }[] = [];
    for (let t = open; t <= last; t += cfg.slot_minutes) {
      if (opts.lunch && t > lunchEnd) break;
      const utc = zonedToUtc(day.y, day.m, day.d, t, cfg.timezone);
      if (utc.getTime() < earliest) continue;
      times.push({ iso: utc.toISOString(), label: formatTime(utc, cfg.timezone) });
    }
    if (times.length === 0) continue;
    const first = new Date(times[0].iso);
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : formatDayLabel(first, cfg.timezone);
    out.push({ key: `${day.y}-${day.m}-${day.d}`, label, times });
  }
  return out;
}

export function deliveryFeeFor(cfg: OnlineOrderingConfig, mode: string, subtotal: number): number {
  if (mode !== 'delivery') return 0;
  return subtotal >= cfg.free_delivery_threshold ? 0 : cfg.delivery_fee;
}

export function describeHours(cfg: OnlineOrderingConfig): string {
  const entries = DAY_KEYS.map((k) => cfg.hours[k]);
  const first = entries[0];
  const same = entries.every((h) => h && first && h.open === first.open && h.close === first.close);
  if (same && first) return `Daily ${formatHM(first.open)} – ${formatHM(first.close)}`;
  return DAY_KEYS.filter((k) => cfg.hours[k])
    .map((k) => `${DAY_LABELS[k].slice(0, 3)} ${formatHM(cfg.hours[k]!.open)}–${formatHM(cfg.hours[k]!.close)}`)
    .join(' · ');
}

const ERROR_MESSAGES: Record<string, string> = {
  ONLINE_ORDERING_DISABLED: 'Online ordering is paused right now. Please call us to place your order.',
  STORE_CLOSED: 'We are not taking ASAP orders right now. Please choose a scheduled time instead.',
  SLOT_TOO_SOON: 'That time is too soon. Please pick a later time.',
  SLOT_TOO_FAR: 'That date is too far ahead. Please pick an earlier date.',
  SLOT_OUTSIDE_HOURS: 'That time is outside our opening hours. Please pick another time.',
  LUNCH_PREORDER_ONLY: 'Lunch specials are pre-order only. Please schedule your order for tomorrow or later.',
  LUNCH_DISABLED: 'Lunch special pre-orders are not available right now.',
  LUNCH_SLOT_INVALID: 'Lunch specials must be scheduled for a later day, before the lunch cut-off time.',
  INVALID_PHONE: 'Please enter a valid phone number.',
  INVALID_ADDRESS: 'Please enter your full delivery address.',
  INVALID_NAME: 'Please enter your name.',
  INVALID_ITEMS: 'Your cart is empty or too large.',
  INVALID_QUANTITY: 'One of your items has an invalid quantity.',
  PRODUCT_UNAVAILABLE: 'One of the items in your cart is no longer available. Please remove it and try again.',
};

export function onlineOrderErrorMessage(err: any): string {
  const msg: string = err?.message || '';
  for (const code of Object.keys(ERROR_MESSAGES)) {
    if (msg.includes(code)) return ERROR_MESSAGES[code];
  }
  return 'We could not place your order. Please try again or call us.';
}
