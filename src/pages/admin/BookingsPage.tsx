import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Phone, Users, RefreshCw, Check, X, CheckCheck, Loader2 } from 'lucide-react';
import { subscribeTables } from '../../lib/convex';
import { fetchReservations, updateReservationStatus } from '../../lib/api/reservations';
import { DbError } from '../../lib/api/errors';
import type { Reservation } from '../../lib/supabase';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  completed: 'bg-theme-surface-alt text-theme-ink-dim border-theme-border',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

export default function BookingsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await fetchReservations();
      setReservations(data);
    } catch (error) {
      if (error instanceof DbError) console.error('Failed to load bookings:', error.userMessage, error);
      else console.error('Failed to load bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();

    const channel = subscribeTables(['reservations'], () => {
        load();
      });

    return () => {
      channel();
    };
  }, []);

  const setStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await updateReservationStatus(id, status);
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (error) {
      if (error instanceof DbError) console.error('Failed to update booking:', error.userMessage, error);
      else console.error('Failed to update booking:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(
    () => (filter === 'all' ? reservations : reservations.filter((r) => r.status === filter)),
    [reservations, filter]
  );

  const pendingCount = reservations.filter((r) => r.status === 'pending').length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = reservations.filter((r) => r.date === todayStr && r.status !== 'cancelled').length;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif italic text-theme-ink">Table Bookings</h1>
          <p className="text-xs uppercase tracking-widest text-theme-accent mt-2">
            Reservations from the website — new bookings appear here instantly
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-theme-border text-xs uppercase tracking-wider text-theme-ink-dim hover:text-theme-ink hover:bg-theme-surface-alt"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-theme-border bg-theme-surface p-4">
          <div className="text-[10px] uppercase tracking-widest text-theme-ink-dim">Total</div>
          <div className="mt-1 text-2xl font-semibold text-theme-ink">{reservations.length}</div>
        </div>
        <div className="rounded-xl border border-theme-border bg-theme-surface p-4">
          <div className="text-[10px] uppercase tracking-widest text-theme-ink-dim">Awaiting confirm</div>
          <div className="mt-1 text-2xl font-semibold text-amber-400">{pendingCount}</div>
        </div>
        <div className="rounded-xl border border-theme-border bg-theme-surface p-4">
          <div className="text-[10px] uppercase tracking-widest text-theme-ink-dim">Today</div>
          <div className="mt-1 text-2xl font-semibold text-theme-accent">{todayCount}</div>
        </div>
      </div>

      <div className="mt-6 flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              filter === f
                ? 'bg-theme-accent/10 text-theme-accent'
                : 'text-theme-ink-dim hover:text-theme-ink hover:bg-theme-surface-alt'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-theme-border py-16 text-center text-theme-ink-dim text-sm">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
            No bookings {filter !== 'all' ? `with status "${filter}"` : 'yet'} — website bookings will show up here in real time.
          </div>
        ) : (
          filtered.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-theme-border bg-theme-surface p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4"
            >
              <div className="flex items-center gap-4 md:w-44 shrink-0">
                <div className="h-12 w-12 rounded-lg bg-theme-accent/10 flex flex-col items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-theme-accent" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-theme-ink">{r.date}</div>
                  <div className="text-xs text-theme-ink-dim">{r.time}</div>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-theme-ink">{r.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                      STATUS_STYLES[r.status] || STATUS_STYLES.pending
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-4 text-xs text-theme-ink-dim">
                  <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 hover:text-theme-accent">
                    <Phone className="w-3.5 h-3.5" /> {r.phone}
                  </a>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> {r.guests} guests
                  </span>
                </div>
                {r.notes && <div className="mt-2 text-xs text-theme-ink-dim italic">"{r.notes}"</div>}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {updatingId === r.id && <Loader2 className="w-4 h-4 animate-spin text-theme-accent" />}
                {r.status === 'pending' && (
                  <button
                    onClick={() => setStatus(r.id, 'confirmed')}
                    disabled={updatingId === r.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" /> Confirm
                  </button>
                )}
                {r.status === 'confirmed' && (
                  <button
                    onClick={() => setStatus(r.id, 'completed')}
                    disabled={updatingId === r.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-theme-surface-alt text-theme-ink-dim border border-theme-border text-[11px] font-bold uppercase tracking-wider hover:text-theme-ink disabled:opacity-50"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Done
                  </button>
                )}
                {(r.status === 'pending' || r.status === 'confirmed') && (
                  <button
                    onClick={() => setStatus(r.id, 'cancelled')}
                    disabled={updatingId === r.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-[11px] font-bold uppercase tracking-wider hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
