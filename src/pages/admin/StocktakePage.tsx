import { useState, useEffect, useMemo } from 'react';
import { ClipboardCheck, Plus, Save, X, Loader2, AlertTriangle, CheckCircle2, ArrowUpDown, History, Download } from 'lucide-react';
import formatCurrency from '../../lib/formatCurrency';
import { exportToCSV } from '../../lib/exportCSV';
import { useToast } from '../../components/Toast';
import { fetchInventory, completeStocktakeAtomic } from '../../lib/api/inventory';
import {
  fetchStocktakes as fetchStocktakesQuery,
  fetchStocktakeItems as fetchStocktakeItemsQuery,
  fetchStocktakeItemsRaw,
  createStocktake as createStocktakeQuery,
  batchInsertStocktakeItems,
  updateStocktakeItem,
  updateStocktake as updateStocktakeQuery,
  writeStocktakeLedger,
} from '../../lib/api/stocktakes';
import { DbError } from '../../lib/api/errors';

interface Stocktake {
  id: string;
  name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  total_items: number;
  total_variance: number;
}

interface StocktakeItem {
  id: string;
  stocktake_id: string;
  stock_item_id: number;
  system_quantity: number;
  actual_quantity: number;
  variance: number;
  unit: string;
  unit_cost: number;
  variance_value: number;
  note: string | null;
  stock_items?: { name: string; category: string };
}

export default function StocktakePage() {
  const { toast } = useToast();
  const [stocktakes, setStocktakes] = useState<Stocktake[]>([]);
  const [stocktakeItems, setStocktakeItems] = useState<StocktakeItem[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [selectedStocktake, setSelectedStocktake] = useState<Stocktake | null>(null);
  const [viewingStocktake, setViewingStocktake] = useState<Stocktake | null>(null);
  const [viewingItems, setViewingItems] = useState<StocktakeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [edits, setEdits] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchStocktakes();
  }, []);

  async function fetchStocktakes() {
    setIsLoading(true);
    try {
      const data = await fetchStocktakesQuery();
      setStocktakes(data || []);
      const active = (data || []).find(s => s.status === 'draft');
      if (active) {
        setSelectedStocktake(active);
        await fetchStocktakeItems(active.id);
      } else {
        setSelectedStocktake(null);
      }
    } catch (error) {
      console.error('Error fetching stocktakes:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchStocktakeItems(stocktakeId: string) {
    try {
      const data = await fetchStocktakeItemsQuery(stocktakeId);
      setStocktakeItems(data || []);
      const e: Record<number, number> = {};
      for (const item of data || []) {
        e[item.stock_item_id] = item.actual_quantity;
      }
      setEdits(e);
    } catch (error) {
      console.error('Error fetching stocktake items:', error);
    }
  }

  async function startStocktake() {
    setIsCreating(true);
    try {
      const allStock = await fetchInventory();
      setStockItems(allStock || []);

      const newSt = await createStocktakeQuery({
        name: 'Stocktake ' + new Date().toLocaleDateString(),
        status: 'draft',
      });

      const items = (allStock || []).map((s: any) => ({
        stocktake_id: newSt.id,
        stock_item_id: s.id,
        system_quantity: s.current_stock || 0,
        actual_quantity: s.current_stock || 0,
        unit: s.unit || '',
        unit_cost: s.cost_per_unit || 0,
      }));

      if (items.length > 0) {
        const BATCH = 200;
        for (let i = 0; i < items.length; i += BATCH) {
          await batchInsertStocktakeItems(items.slice(i, i + BATCH));
        }
      }

      setSelectedStocktake(newSt);
      await fetchStocktakeItems(newSt.id);
      setStocktakes(prev => [newSt, ...prev]);
    } catch (error: any) {
      console.error('Error creating stocktake:', error);
      toast(error instanceof DbError ? error.userMessage : (error.message || 'Failed to create stocktake'), 'error');
    } finally {
      setIsCreating(false);
    }
  }

  function handleEdit(itemId: number, value: number) {
    setEdits(prev => ({ ...prev, [itemId]: value }));
  }

  async function completeStocktake() {
    if (!selectedStocktake) return;
    setIsSaving(true);
    try {
      const countedItems = Object.entries(edits).map(([itemId, qty]) => ({
        stock_item_id: itemId,
        counted_qty: qty as number,
      }));

      try {
        await completeStocktakeAtomic(selectedStocktake.id, countedItems);
      } catch {
        for (const [itemId, qty] of Object.entries(edits)) {
          await updateStocktakeItem(selectedStocktake.id, itemId, { actual_quantity: qty });
        }

        const finalItems = await fetchStocktakeItemsRaw(selectedStocktake.id);

        const totalItems = finalItems?.length || 0;
        const totalVariance = (finalItems || []).reduce((sum: number, i: any) => sum + Number(i.variance || 0), 0);

        await updateStocktakeQuery(selectedStocktake.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          total_items: totalItems,
          total_variance: totalVariance,
        });

        for (const item of finalItems || []) {
          if (Number(item.variance) !== 0) {
            const adjType = Number(item.variance) > 0 ? 'IN' : 'OUT';
            try {
              await writeStocktakeLedger({
                item_id: String(item.stock_item_id),
                type: adjType,
                amount: Math.abs(Number(item.variance)),
                previous_stock: Number(item.system_quantity),
                new_stock: Number(item.actual_quantity),
                note: 'Stocktake adjustment: ' + (selectedStocktake.name || selectedStocktake.id),
              });
            } catch (lErr) {
              console.error('Ledger err for item', item.stock_item_id, lErr);
            }
          }
        }

        setSelectedStocktake({ ...selectedStocktake, status: 'completed', total_items: totalItems, total_variance: totalVariance });
      }
      await fetchStocktakes();
    } catch (error: any) {
      console.error('Error completing stocktake:', error);
      toast(error instanceof DbError ? error.userMessage : (error.message || 'Failed to complete stocktake'), 'error');
    } finally {
      setIsSaving(false);
    }
  }

  const categories = useMemo(() => {
    const cats = new Set<string>();
    stocktakeItems.forEach(i => {
      if (i.stock_items?.category) cats.add(i.stock_items.category);
    });
    return ['All', ...Array.from(cats).sort()];
  }, [stocktakeItems]);

  const filteredItems = useMemo(() => {
    return stocktakeItems.filter(i => {
      const matchesSearch = !searchQuery || (i.stock_items?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = categoryFilter === 'All' || i.stock_items?.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [stocktakeItems, searchQuery, categoryFilter]);

  const summary = useMemo(() => {
    const items = stocktakeItems;
    const counted = items.filter(i => edits[i.stock_item_id] !== i.system_quantity).length;
    const totalVariance = items.reduce((sum, i) => {
      const actual = edits[i.stock_item_id] ?? i.actual_quantity;
      return sum + (actual - i.system_quantity);
    }, 0);
    const totalValueVariance = items.reduce((sum, i) => {
      const actual = edits[i.stock_item_id] ?? i.actual_quantity;
      return sum + (actual - i.system_quantity) * (i.unit_cost || 0);
    }, 0);
    return { total: items.length, counted, totalVariance, totalValueVariance };
  }, [stocktakeItems, edits]);

  const completedStocktakes = stocktakes.filter(s => s.status === 'completed' || s.status === 'voided');

  async function viewStocktake(st: Stocktake) {
    try {
      const data = await fetchStocktakeItemsQuery(st.id);
      setViewingItems(data || []);
      setViewingStocktake(st);
    } catch (error: any) {
      console.error('Error:', error instanceof DbError ? error.userMessage : error.message);
      setViewingItems([]);
      setViewingStocktake(st);
    }
  }

  async function voidStocktake(st: Stocktake) {
    if (!confirm('Void this stocktake and revert all stock adjustments?')) return;
    try {
      const items = await fetchStocktakeItemsRaw(st.id);
      for (const item of items || []) {
        if (Number(item.variance) === 0) continue;
        const reverseType = Number(item.variance) > 0 ? 'OUT' : 'IN';
        try {
          await writeStocktakeLedger({
            item_id: String(item.stock_item_id),
            type: reverseType,
            amount: Math.abs(Number(item.variance)),
            previous_stock: Number(item.actual_quantity),
            new_stock: Number(item.system_quantity),
            note: 'Void stocktake: ' + (st.name || st.id),
          });
        } catch (lErr) {
          console.error('Ledger revert err:', lErr);
        }
      }
      await updateStocktakeQuery(st.id, { status: 'voided' });
      await fetchStocktakes();
      setViewingStocktake(null);
    } catch (error: any) {
      console.error('Error voiding stocktake:', error);
      toast(error instanceof DbError ? error.userMessage : (error.message || 'Failed to void stocktake'), 'error');
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-theme-ink mb-2">Stocktake</h1>
          <p className="text-theme-ink-dim text-sm">Count physical inventory and track variance against system stock.</p>
        </div>
        <div className="flex gap-2">
          {['active', 'history'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t as any)}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold transition-colors border ${
                activeTab === t
                  ? 'bg-theme-surface border-theme-accent text-theme-accent'
                  : 'bg-theme-bg border-theme-border text-theme-ink-dim hover:text-theme-ink hover:bg-theme-surface-alt'
              }`}
            >
              {t === 'active' ? 'Active' : 'History'}
            </button>
          ))}
          {!selectedStocktake && activeTab === 'active' && (
            <button
              onClick={startStocktake}
              disabled={isCreating}
              className="flex items-center gap-2 bg-theme-accent text-black px-6 py-2 text-xs uppercase tracking-wider font-semibold hover:bg-opacity-90 disabled:opacity-50"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              New Stocktake
            </button>
          )}
          <button
            onClick={() => exportToCSV(stocktakeItems.map(i => ({
              Item: i.stock_items?.name || '', Category: i.stock_items?.category || '',
              'System Qty': Number(i.system_quantity).toFixed(2),
              'Actual Qty': Number(edits[i.stock_item_id] ?? i.actual_quantity).toFixed(2),
              Variance: (Number(edits[i.stock_item_id] ?? i.actual_quantity) - Number(i.system_quantity)).toFixed(2),
              'Variance Value': ((Number(edits[i.stock_item_id] ?? i.actual_quantity) - Number(i.system_quantity)) * i.unit_cost).toFixed(2),
            })), `stocktake_${selectedStocktake?.id || 'draft'}_${new Date().toISOString().slice(0, 10)}.csv`)}
            disabled={stocktakeItems.length === 0}
            className="flex items-center gap-2 bg-theme-ink text-theme-bg px-4 py-2 text-xs uppercase tracking-wider font-semibold hover:bg-opacity-90 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
        </div>
      ) : activeTab === 'history' ? (
        <div className="space-y-4">
          {completedStocktakes.length === 0 ? (
            <div className="bg-theme-surface border border-theme-border p-12 text-center text-theme-ink-dim">
              No completed stocktakes yet.
            </div>
          ) : (
            completedStocktakes.map(s => (
              <div key={s.id} className="bg-theme-surface border border-theme-border p-6 flex items-center justify-between hover:border-theme-accent/50 transition-colors">
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => viewStocktake(s)}>
                  {s.status === 'voided' ? (
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                  <div>
                    <p className="text-theme-ink font-medium">{s.name}</p>
                    <p className="text-theme-ink-dim text-xs mt-1">
                      {new Date(s.started_at).toLocaleDateString()} &middot; {s.total_items} items &middot;
                      Variance: <span className={Number(s.total_variance) !== 0 ? 'text-red-400' : 'text-emerald-400'}>
                        {Number(s.total_variance).toFixed(2)}
                      </span>
                      {s.status === 'voided' && <span className="text-red-400 ml-2">(VOIDED)</span>}
                    </p>
                  </div>
                </div>
                {s.status === 'completed' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => viewStocktake(s)}
                      className="px-3 py-1.5 text-xs uppercase tracking-wider border border-theme-border text-theme-ink-dim hover:text-theme-ink hover:bg-theme-surface-alt rounded-sm"
                    >View</button>
                    <button
                      onClick={() => voidStocktake(s)}
                      className="px-3 py-1.5 text-xs uppercase tracking-wider border border-red-400/30 text-red-400 hover:bg-red-400/10 rounded-sm"
                    >Void</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : !selectedStocktake ? (
        <div className="bg-theme-surface border border-theme-border p-12 text-center">
          <ClipboardCheck className="w-12 h-12 text-theme-ink-dim mx-auto mb-4" />
          <p className="text-theme-ink text-lg mb-2">No active stocktake</p>
          <p className="text-theme-ink-dim text-sm">Click "New Stocktake" to start counting inventory.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-theme-surface border border-theme-border p-5">
              <p className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-1">Total Items</p>
              <p className="font-serif text-2xl text-theme-ink">{summary.total}</p>
            </div>
            <div className="bg-theme-surface border border-theme-border p-5">
              <p className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-1">Adjusted</p>
              <p className="font-serif text-2xl text-theme-accent">{summary.counted}</p>
            </div>
            <div className="bg-theme-surface border border-theme-border p-5">
              <p className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-1">Total Variance (qty)</p>
              <p className={`font-serif text-2xl ${summary.totalVariance !== 0 ? (summary.totalVariance > 0 ? 'text-emerald-400' : 'text-red-400') : 'text-theme-ink'}`}>
                {summary.totalVariance > 0 ? '+' : ''}{summary.totalVariance.toFixed(2)}
              </p>
            </div>
            <div className="bg-theme-surface border border-theme-border p-5">
              <p className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-1">Variance Value</p>
              <p className={`font-serif text-2xl ${summary.totalValueVariance !== 0 ? (summary.totalValueVariance > 0 ? 'text-emerald-400' : 'text-red-400') : 'text-theme-ink'}`}>
                {formatCurrency(summary.totalValueVariance)}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="flex-1 px-4 py-2.5 bg-theme-surface border border-theme-border rounded-sm text-sm text-theme-ink placeholder:text-theme-ink-dim focus:outline-none focus:border-theme-accent"
            />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 bg-theme-surface border border-theme-border rounded-sm text-sm text-theme-ink focus:outline-none focus:border-theme-accent"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={completeStocktake}
              disabled={isSaving}
              className="flex items-center gap-2 bg-theme-accent text-black px-6 py-2.5 text-xs uppercase tracking-wider font-semibold hover:bg-opacity-90 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Complete Stocktake
            </button>
          </div>

          <div className="bg-theme-surface border border-theme-border overflow-hidden rounded-xl shadow-sm">
            <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-theme-surface-alt z-10">
                  <tr className="border-b border-theme-border text-theme-ink-dim">
                    <th className="px-4 py-3 text-[11px] uppercase tracking-wider font-medium">Item</th>
                    <th className="px-4 py-3 text-[11px] uppercase tracking-wider font-medium">Category</th>
                    <th className="px-4 py-3 text-[11px] uppercase tracking-wider font-medium text-right">System Qty</th>
                    <th className="px-4 py-3 text-[11px] uppercase tracking-wider font-medium text-right">Actual Qty</th>
                    <th className="px-4 py-3 text-[11px] uppercase tracking-wider font-medium text-right">Variance</th>
                    <th className="px-4 py-3 text-[11px] uppercase tracking-wider font-medium text-right">Variance Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border/50">
                  {filteredItems.map(item => {
                    const actual = edits[item.stock_item_id] ?? item.actual_quantity;
                    const variance = actual - item.system_quantity;
                    return (
                      <tr key={item.id} className={`transition-colors ${variance !== 0 ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-theme-surface-alt'}`}>
                        <td className="px-4 py-3 text-theme-ink text-sm">{item.stock_items?.name || 'Unknown'}</td>
                        <td className="px-4 py-3 text-theme-ink-dim text-xs">{item.stock_items?.category || '-'}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-theme-ink-dim">
                          {Number(item.system_quantity).toFixed(2)} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={edits[item.stock_item_id] ?? item.actual_quantity}
                            onChange={e => handleEdit(item.stock_item_id, parseFloat(e.target.value) || 0)}
                            className="w-24 text-right bg-theme-bg border border-theme-border rounded-sm px-2 py-1 font-mono text-sm text-theme-ink focus:outline-none focus:border-theme-accent"
                          />
                        </td>
                        <td className={`px-4 py-3 text-right font-mono text-sm font-medium ${variance > 0 ? 'text-emerald-400' : variance < 0 ? 'text-red-400' : 'text-theme-ink-dim'}`}>
                          {variance > 0 ? '+' : ''}{variance.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono text-sm ${variance !== 0 ? (variance * item.unit_cost > 0 ? 'text-emerald-400' : 'text-red-400') : 'text-theme-ink-dim'}`}>
                          {formatCurrency(variance * item.unit_cost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredItems.length === 0 && (
                <div className="py-12 text-center text-theme-ink-dim text-sm">No items found.</div>
              )}
            </div>
          </div>
        </div>
      )}
      {viewingStocktake && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewingStocktake(null)}>
          <div className="bg-theme-surface border border-theme-border w-full max-w-3xl shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-theme-border flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-serif text-xl text-theme-ink">{viewingStocktake.name}</h2>
                <p className="text-theme-ink-dim text-xs mt-1">{new Date(viewingStocktake.started_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setViewingStocktake(null)} className="text-theme-ink-dim hover:text-theme-ink"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-theme-surface-alt">
                  <tr className="border-b border-theme-border text-theme-ink-dim">
                    <th className="px-4 py-2 text-[11px] uppercase tracking-wider">Item</th>
                    <th className="px-4 py-2 text-[11px] uppercase tracking-wider text-right">System</th>
                    <th className="px-4 py-2 text-[11px] uppercase tracking-wider text-right">Actual</th>
                    <th className="px-4 py-2 text-[11px] uppercase tracking-wider text-right">Variance</th>
                    <th className="px-4 py-2 text-[11px] uppercase tracking-wider text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border/50">
                  {viewingItems.map(item => (
                    <tr key={item.id} className={`text-sm ${Number(item.variance) !== 0 ? 'bg-red-500/5' : ''}`}>
                      <td className="px-4 py-2 text-theme-ink">{item.stock_items?.name}</td>
                      <td className="px-4 py-2 text-right font-mono text-theme-ink-dim">{Number(item.system_quantity).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-mono text-theme-ink">{Number(item.actual_quantity).toFixed(2)}</td>
                      <td className={`px-4 py-2 text-right font-mono ${Number(item.variance) > 0 ? 'text-emerald-400' : Number(item.variance) < 0 ? 'text-red-400' : 'text-theme-ink-dim'}`}>
                        {Number(item.variance) > 0 ? '+' : ''}{Number(item.variance).toFixed(2)}
                      </td>
                      <td className={`px-4 py-2 text-right font-mono ${Number(item.variance_value) !== 0 ? 'text-red-400' : 'text-theme-ink-dim'}`}>
                        {formatCurrency(Number(item.variance_value))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
