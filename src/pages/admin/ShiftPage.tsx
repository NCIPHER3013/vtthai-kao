import React, { useState, useEffect } from 'react';
import { type Shift, type Order } from '../../lib/supabase';
import { subscribeTables } from '../../lib/convex';
import { fetchShiftOrders as apiFetchShiftOrders } from '../../lib/api/shifts';
import { fetchShifts as apiFetchShifts } from '../../lib/api/shifts';
import { DbError } from '../../lib/api/errors';
import { useSettings } from '../../hooks/useSettings';
import formatCurrency from '../../lib/formatCurrency';
import { Clock, DollarSign, Calendar, TrendingUp, Download, Eye, ChevronDown, ChevronUp, X } from 'lucide-react';

export default function ShiftPage() {
  const { storeName } = useSettings();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);
  const [shiftOrders, setShiftOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

  useEffect(() => {
    fetchShifts();

    const channel = subscribeTables(['shifts'], () => {
        fetchShifts();
      });

    return () => {
      channel();
    };
  }, []);

  async function fetchShifts() {
    try {
      const data = await apiFetchShifts();
      setShifts(data || []);
    } catch (error) {
      console.error('Error fetching shifts', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchShiftOrders(shiftId: string) {
    setIsLoadingOrders(true);
    try {
      const data = await apiFetchShiftOrders(shiftId);
      setShiftOrders((data as unknown as Order[]) || []);
    } catch (error) {
      console.error('Error fetching shift orders', error);
      setShiftOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  }

  function toggleExpand(shiftId: string) {
    if (expandedShiftId === shiftId) {
      setExpandedShiftId(null);
      setShiftOrders([]);
    } else {
      setExpandedShiftId(shiftId);
      fetchShiftOrders(shiftId);
    }
  }

  function getDuration(start: string, end?: string | null): string {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffMs = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  function getCashDifference(shift: Shift): number {
    if (shift.actual_cash == null || shift.expected_cash == null) return 0;
    return shift.actual_cash - shift.expected_cash;
  }

  function getPaymentBreakdown(orders: Order[]) {
    let cash = 0, card = 0, other = 0;
    orders.forEach(o => {
      const method = (o.payment_method || '').toUpperCase();
      if (method === 'CASH') cash += o.total;
      else if (method === 'CARD') card += o.total;
      else other += o.total;
    });
    return { cash, card, other, count: orders.length };
  }

  function exportCSV() {
    const headers = ['Status', 'Started At', 'Ended At', 'Duration', 'Starting Cash', 'Total Sales', 'Expected Cash', 'Actual Cash', 'Difference', 'Opened By', 'Closed By', 'Notes'];
    const rows = filteredShifts.map(s => {
      const diff = getCashDifference(s);
      return [
        s.status,
        new Date(s.started_at).toLocaleString(),
        s.ended_at ? new Date(s.ended_at).toLocaleString() : '',
        getDuration(s.started_at, s.ended_at),
        s.starting_cash.toFixed(2),
        s.total_sales.toFixed(2),
        s.expected_cash?.toFixed(2) || '',
        s.actual_cash?.toFixed(2) || '',
        diff !== 0 ? diff.toFixed(2) : '',
        s.opened_by || '',
        s.closed_by || '',
        (s.notes || '').replace(/,/g, ';')
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shifts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredShifts = shifts.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (dateFilter) {
      const shiftDate = new Date(s.started_at).toISOString().split('T')[0];
      if (!shiftDate.includes(dateFilter)) return false;
    }
    return true;
  });

  const activeShift = shifts.find(s => s.status === 'open');

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-theme-accent border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-theme-ink mb-2">Shift Management</h1>
          <p className="text-theme-ink-dim text-sm">View shift history, cash reconciliation, and order breakdowns.</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={filteredShifts.length === 0}
          className="bg-theme-surface border border-theme-border text-theme-ink px-4 py-2 text-xs uppercase tracking-wider font-semibold hover:border-theme-accent transition-colors disabled:opacity-30 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {activeShift && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <span className="text-emerald-400 font-semibold text-sm uppercase tracking-wider">Active Shift</span>
              <span className="text-theme-ink-dim text-xs ml-4">
                Started {new Date(activeShift.started_at).toLocaleString()} by {activeShift.opened_by || 'Unknown'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm font-mono">
            <span className="text-theme-ink-dim">Starting: <span className="text-theme-ink">{formatCurrency(activeShift.starting_cash)}</span></span>
            <span className="text-theme-ink-dim">Sales: <span className="text-theme-accent font-bold">{formatCurrency(activeShift.total_sales)}</span></span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            placeholder="Filter by date (YYYY-MM-DD)..."
            className="w-full bg-theme-surface border border-theme-border px-4 py-2 text-sm focus:outline-none focus:border-theme-accent transition-colors"
          />
        </div>
        <div className="flex border border-theme-border">
          {(['all', 'open', 'closed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold transition-colors ${
                statusFilter === s
                  ? 'bg-theme-accent/10 text-theme-accent'
                  : 'text-theme-ink-dim hover:text-theme-ink'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-theme-surface border border-theme-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-theme-bg border-b border-theme-border">
              <tr>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-theme-ink-dim">Status</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-theme-ink-dim">Started</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-theme-ink-dim">Duration</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-theme-ink-dim">Staff</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-theme-ink-dim text-right">Start Cash</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-theme-ink-dim text-right">Sales</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-theme-ink-dim text-right">Expected</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-theme-ink-dim text-right">Actual</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-theme-ink-dim text-right">Diff</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-theme-ink-dim w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {filteredShifts.map((shift) => {
                const diff = getCashDifference(shift);
                const isExpanded = expandedShiftId === shift.id;
                return (
                  <React.Fragment key={shift.id}>
                    <tr
                      className="hover:bg-theme-surface-alt transition-colors cursor-pointer"
                      onClick={() => toggleExpand(shift.id)}
                    >
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-mono uppercase tracking-wider border rounded-sm ${
                          shift.status === 'open'
                            ? 'border-emerald-400/30 text-emerald-400 bg-emerald-400/10'
                            : 'border-theme-border text-theme-ink-dim bg-theme-bg'
                        }`}>
                          {shift.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-theme-ink-dim text-xs">
                        {new Date(shift.started_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-theme-ink-dim text-xs">
                        {getDuration(shift.started_at, shift.ended_at)}
                      </td>
                      <td className="px-4 py-3 text-theme-ink-dim text-xs">
                        {shift.opened_by || '-'}
                        {shift.closed_by && shift.closed_by !== shift.opened_by ? (
                          <span className="text-theme-ink-dim"> → {shift.closed_by}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-theme-ink text-xs text-right">
                        {formatCurrency(shift.starting_cash)}
                      </td>
                      <td className="px-4 py-3 font-mono text-theme-accent text-xs text-right font-bold">
                        {formatCurrency(shift.total_sales)}
                      </td>
                      <td className="px-4 py-3 font-mono text-theme-ink-dim text-xs text-right">
                        {shift.expected_cash != null ? formatCurrency(shift.expected_cash) : '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-theme-ink-dim text-xs text-right">
                        {shift.actual_cash != null ? formatCurrency(shift.actual_cash) : '-'}
                      </td>
                      <td className={`px-4 py-3 font-mono text-xs text-right font-bold ${
                        diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-theme-ink-dim'
                      }`}>
                        {shift.actual_cash != null && shift.expected_cash != null ? (
                          diff > 0 ? `+${formatCurrency(diff)}` : diff < 0 ? formatCurrency(diff) : '$0.00'
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-theme-ink-dim">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${shift.id}-detail`}>
                        <td colSpan={10} className="px-6 py-6 bg-theme-bg border-b border-theme-border">
                          {shift.notes && (
                            <div className="mb-4 px-3 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                              <span className="font-semibold uppercase tracking-wider">Notes:</span> {shift.notes}
                            </div>
                          )}

                          {isLoadingOrders ? (
                            <div className="flex justify-center py-4">
                              <div className="animate-spin w-5 h-5 rounded-full border-2 border-theme-accent border-t-transparent" />
                            </div>
                          ) : shiftOrders.length === 0 ? (
                            <p className="text-theme-ink-dim text-xs text-center py-4">No orders in this shift.</p>
                          ) : (
                            <>
                              <div className="grid grid-cols-4 gap-4 mb-4">
                                {(() => {
                                  const bd = getPaymentBreakdown(shiftOrders);
                                  return (
                                    <>
                                      <div className="bg-theme-surface border border-theme-border p-3 text-center">
                                        <p className="text-[10px] uppercase tracking-wider text-theme-ink-dim mb-1">Orders</p>
                                        <p className="font-mono font-bold text-theme-ink">{bd.count}</p>
                                      </div>
                                      <div className="bg-theme-surface border border-theme-border p-3 text-center">
                                        <p className="text-[10px] uppercase tracking-wider text-theme-ink-dim mb-1">Cash</p>
                                        <p className="font-mono font-bold text-emerald-400">{formatCurrency(bd.cash)}</p>
                                      </div>
                                      <div className="bg-theme-surface border border-theme-border p-3 text-center">
                                        <p className="text-[10px] uppercase tracking-wider text-theme-ink-dim mb-1">Card</p>
                                        <p className="font-mono font-bold text-blue-400">{formatCurrency(bd.card)}</p>
                                      </div>
                                      <div className="bg-theme-surface border border-theme-border p-3 text-center">
                                        <p className="text-[10px] uppercase tracking-wider text-theme-ink-dim mb-1">Avg Ticket</p>
                                        <p className="font-mono font-bold text-theme-accent">{formatCurrency(bd.count > 0 ? shift.total_sales / bd.count : 0)}</p>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>

                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-theme-border">
                                    <th className="text-left py-2 font-mono uppercase tracking-wider text-theme-ink-dim">Order ID</th>
                                    <th className="text-left py-2 font-mono uppercase tracking-wider text-theme-ink-dim">Time</th>
                                    <th className="text-left py-2 font-mono uppercase tracking-wider text-theme-ink-dim">Type</th>
                                    <th className="text-left py-2 font-mono uppercase tracking-wider text-theme-ink-dim">Payment</th>
                                    <th className="text-right py-2 font-mono uppercase tracking-wider text-theme-ink-dim">Total</th>
                                    <th className="text-left py-2 font-mono uppercase tracking-wider text-theme-ink-dim">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {shiftOrders.map(order => (
                                    <tr key={order.id} className="border-b border-theme-border/50 hover:bg-theme-surface-alt">
                                      <td className="py-2 font-mono text-theme-ink-dim">{order.id.slice(0, 8)}...</td>
                                      <td className="py-2 font-mono text-theme-ink-dim">{new Date(order.timestamp).toLocaleTimeString()}</td>
                                      <td className="py-2 text-theme-ink-dim uppercase">{order.order_type || '-'}</td>
                                      <td className="py-2 text-theme-ink-dim uppercase">{order.payment_method || '-'}</td>
                                      <td className="py-2 font-mono text-theme-accent text-right">{formatCurrency(order.total)}</td>
                                      <td className="py-2">
                                        <span className={`px-1.5 py-0.5 text-[10px] uppercase font-mono tracking-wider ${
                                          order.status === 'completed' ? 'text-emerald-400' :
                                          order.status === 'cancelled' ? 'text-red-400' :
                                          'text-theme-ink-dim'
                                        }`}>
                                          {order.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {filteredShifts.length === 0 && (
            <div className="p-8 text-center text-theme-ink-dim">
              {shifts.length === 0 ? 'No shifts recorded yet.' : 'No shifts match the current filter.'}
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-[10px] text-theme-ink-dim uppercase tracking-widest">
        {filteredShifts.length} shift{filteredShifts.length !== 1 ? 's' : ''} shown
      </div>
    </div>
  );
}
