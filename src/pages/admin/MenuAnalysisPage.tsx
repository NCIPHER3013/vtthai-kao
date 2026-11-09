import { useState, useEffect, useMemo } from 'react';
import { fetchSalesByDateRange, fetchRecipes, fetchStockItems } from '../../lib/api/orders';
import { fetchProducts } from '../../lib/api/products';
import { DbError } from '../../lib/api/errors';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Loader2, ChefHat, AlertCircle, Download, X } from 'lucide-react';
import formatCurrency from '../../lib/formatCurrency';
import { exportToCSV } from '../../lib/exportCSV';

export default function MenuAnalysisPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'7D' | '30D' | 'YTD'>('30D');
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'revenue' | 'quantity' | 'margin'>('revenue');
  const [detailProduct, setDetailProduct] = useState<any>(null);

  const COLORS = ['#D4AF37', '#808080', '#E5E4E2', '#C0C0C0', '#1A1A1A', '#4a4a4a', '#7a7a7a', '#aaa'];

  useEffect(() => {
    fetchData();
  }, [timeframe]);

  async function fetchData() {
    setIsLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      if (timeframe === '7D') startDate.setDate(now.getDate() - 7);
      if (timeframe === '30D') startDate.setDate(now.getDate() - 30);
      if (timeframe === 'YTD') startDate.setMonth(0, 1);

      const [ordersWithItems, productsData, recipesData, stockData] = await Promise.all([
        fetchSalesByDateRange(startDate.toISOString(), now.toISOString()),
        fetchProducts(true),
        fetchRecipes(),
        fetchStockItems(),
      ]);

      setOrders(ordersWithItems);
      setProducts(productsData);
      setRecipes(recipesData);
      setStockItems(stockData);

      const allItems: any[] = [];
      for (const o of ordersWithItems) {
        if (o.order_items) {
          for (const item of o.order_items) {
            allItems.push(item);
          }
        }
      }
      setOrderItems(allItems);
    } catch (error) {
      console.error('Error fetching menu analysis:', error instanceof DbError ? error.userMessage : error);
    } finally {
      setIsLoading(false);
    }
  }

  const stockCostMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of stockItems) {
      if (s.cost_per_unit > 0) map.set(s.id, s.cost_per_unit);
    }
    return map;
  }, [stockItems]);

  const productCostMap = useMemo(() => {
    const map = new Map<string, { cost: number; hasCost: boolean }>();

    for (const product of products) {
      const productRecipes = recipes.filter(r => r.product_id === product.id);
      if (productRecipes.length === 0) {
        map.set(product.id, { cost: 0, hasCost: false });
        continue;
      }

      const baseRecipes = productRecipes.filter(r => !r.variant);
      if (baseRecipes.length === 0) {
        map.set(product.id, { cost: 0, hasCost: true });
        continue;
      }

      let totalCost = 0;
      let anyCost = false;
      for (const recipe of baseRecipes) {
        const unitCost = stockCostMap.get(recipe.inventory_item_id) || 0;
        totalCost += unitCost * recipe.quantity;
        if (unitCost > 0) anyCost = true;
      }
      map.set(product.id, { cost: totalCost, hasCost: anyCost });
    }
    return map;
  }, [products, recipes, stockCostMap]);

  const menuItems = useMemo(() => {
    const prodMap = new Map(products.map(p => [p.id, p]));
    const salesMap = new Map<string, { quantity: number; revenue: number }>();

    for (const item of orderItems) {
      const key = item.product_id;
      const existing = salesMap.get(key) || { quantity: 0, revenue: 0 };
      const prod = prodMap.get(item.product_id);
      const price = (prod as any)?.price || (item.products as any)?.price || 0;
      existing.quantity += Number(item.quantity || 0);
      existing.revenue += price * Number(item.quantity || 0);
      salesMap.set(key, existing);
    }

    return products.map(p => {
      const sales = salesMap.get(p.id) || { quantity: 0, revenue: 0 };
      const costInfo = productCostMap.get(p.id) || { cost: 0, hasCost: false };
      const price = p.price || 0;
      const margin = price > 0 && costInfo.hasCost ? ((price - costInfo.cost) / price) * 100 : 0;
      const profit = sales.quantity > 0 ? (price - costInfo.cost) * sales.quantity : 0;

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        price,
        cost: costInfo.cost,
        hasCost: costInfo.hasCost,
        margin,
        quantitySold: sales.quantity,
        revenue: sales.revenue,
        profit,
      };
    });
  }, [products, orderItems, productCostMap]);

  const sortedItems = useMemo(() => {
    return [...menuItems].filter(i => i.quantitySold > 0).sort((a, b) => {
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      if (sortBy === 'quantity') return b.quantitySold - a.quantitySold;
      return b.margin - a.margin;
    });
  }, [menuItems, sortBy]);

  const topPerformers = sortedItems.slice(0, 10);
  const bottomPerformers = [...sortedItems].sort((a, b) => a.margin - b.margin).slice(0, 5);

  const categoryBreakdown = useMemo(() => {
    const cats = new Map<string, { revenue: number; cost: number; quantity: number }>();
    for (const item of menuItems) {
      if (item.quantitySold === 0) continue;
      const existing = cats.get(item.category) || { revenue: 0, cost: 0, quantity: 0 };
      existing.revenue += item.revenue;
      existing.cost += item.cost * item.quantitySold;
      existing.quantity += item.quantitySold;
      cats.set(item.category, existing);
    }
    return Array.from(cats.entries()).map(([name, data]) => ({
      name,
      revenue: data.revenue,
      cost: data.cost,
      profit: data.revenue - data.cost,
      margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0,
      quantity: data.quantity,
    }));
  }, [menuItems]);

  const kpis = useMemo(() => {
    const totalRevenue = menuItems.reduce((s, i) => s + i.revenue, 0);
    const totalCOGS = menuItems.reduce((s, i) => s + i.cost * i.quantitySold, 0);
    const avgMargin = menuItems.filter(i => i.quantitySold > 0 && i.hasCost).length > 0
      ? menuItems.filter(i => i.quantitySold > 0 && i.hasCost).reduce((s, i) => s + i.margin, 0) / menuItems.filter(i => i.quantitySold > 0 && i.hasCost).length
      : 0;
    const totalItemsSold = menuItems.reduce((s, i) => s + i.quantitySold, 0);
    return { totalRevenue, totalCOGS, avgMargin, totalItemsSold };
  }, [menuItems]);

  const marginDistribution = useMemo(() => {
    const buckets = [
      { name: '>70%', count: 0 },
      { name: '50-70%', count: 0 },
      { name: '30-50%', count: 0 },
      { name: '10-30%', count: 0 },
      { name: '<10%', count: 0 },
    ];
    for (const item of menuItems) {
      if (item.quantitySold === 0 || !item.hasCost) continue;
      const m = item.margin;
      if (m >= 70) buckets[0].count++;
      else if (m >= 50) buckets[1].count++;
      else if (m >= 30) buckets[2].count++;
      else if (m >= 10) buckets[3].count++;
      else buckets[4].count++;
    }
    return buckets;
  }, [menuItems]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-theme-ink mb-2">Menu Analysis</h1>
          <p className="text-theme-ink-dim text-sm">Menu performance, margins, and profitability insights.</p>
        </div>
        <div className="flex gap-2">
          {['7D', '30D', 'YTD'].map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t as any)}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold transition-colors border ${
                timeframe === t
                  ? 'bg-theme-surface border-theme-accent text-theme-accent'
                  : 'bg-theme-bg border-theme-border text-theme-ink-dim hover:text-theme-ink hover:bg-theme-surface-alt'
              }`}
            >
              {t}
            </button>
          ))}
          <button
            onClick={() => exportToCSV(sortedItems.map(i => ({
              Item: i.name, Category: i.category, Price: i.price.toFixed(2),
              Cost: i.cost.toFixed(2), 'Margin %': i.margin.toFixed(1),
              'Qty Sold': i.quantitySold, Revenue: i.revenue.toFixed(2), Profit: i.profit.toFixed(2),
            })), `menu_analysis_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`)}
            className="flex items-center gap-2 bg-theme-ink text-theme-bg px-4 py-2 text-xs uppercase tracking-wider font-semibold ml-4 hover:bg-opacity-90"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-theme-surface border border-theme-border p-5">
              <div className="flex items-center gap-2 mb-2 text-theme-ink-dim">
                <DollarSign className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-wider">Total Revenue</span>
              </div>
              <p className="font-serif text-2xl text-theme-ink">{formatCurrency(kpis.totalRevenue)}</p>
            </div>
            <div className="bg-theme-surface border border-theme-border p-5">
              <div className="flex items-center gap-2 mb-2 text-theme-ink-dim">
                <ChefHat className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-wider">COGS</span>
              </div>
              <p className="font-serif text-2xl text-theme-ink">{formatCurrency(kpis.totalCOGS)}</p>
            </div>
            <div className="bg-theme-surface border border-theme-border p-5">
              <div className="flex items-center gap-2 mb-2 text-theme-ink-dim">
                <TrendingUp className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-wider">Avg Margin</span>
              </div>
              <p className="font-serif text-2xl text-theme-ink">{kpis.avgMargin.toFixed(1)}%</p>
            </div>
            <div className="bg-theme-surface border border-theme-border p-5">
              <div className="flex items-center gap-2 mb-2 text-theme-ink-dim">
                <ShoppingBag className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-wider">Items Sold</span>
              </div>
              <p className="font-serif text-2xl text-theme-ink">{kpis.totalItemsSold}</p>
            </div>
          </div>

          {orderItems.length === 0 ? (
            <div className="bg-theme-surface border border-theme-border p-12 text-center text-theme-ink-dim">
              <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No sales data for this period. Place orders via POS to see analysis.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-theme-surface border border-theme-border p-6">
                  <h3 className="font-serif text-xl text-theme-ink mb-6">Category Profit</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryBreakdown} layout="vertical" margin={{ top: 0, right: 0, left: 80, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                        <XAxis type="number" stroke="#666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                        <YAxis type="category" dataKey="name" stroke="#666" fontSize={11} tickLine={false} axisLine={false} width={75} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }} formatter={(v: any) => formatCurrency(v)} />
                        <Bar dataKey="profit" fill="#D4AF37" radius={[0, 4, 4, 0]} name="Profit" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-theme-surface border border-theme-border p-6">
                  <h3 className="font-serif text-xl text-theme-ink mb-6">Margin Distribution</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={marginDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="count" nameKey="name">
                          {marginDistribution.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-theme-surface border border-theme-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-serif text-xl text-theme-ink">Menu Performance</h3>
                  <div className="flex gap-2">
                    {(['revenue', 'quantity', 'margin'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setSortBy(s)}
                        className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold transition-colors border rounded-sm ${
                          sortBy === s
                            ? 'bg-theme-accent border-theme-accent text-black'
                            : 'bg-theme-bg border-theme-border text-theme-ink-dim hover:text-theme-ink'
                        }`}
                      >
                        {s === 'revenue' ? 'Revenue' : s === 'quantity' ? 'Qty Sold' : 'Margin'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-theme-border text-theme-ink-dim">
                        <th className="pb-3 px-2 text-[11px] uppercase tracking-wider font-medium">Item</th>
                        <th className="pb-3 px-2 text-[11px] uppercase tracking-wider font-medium">Category</th>
                        <th className="pb-3 px-2 text-[11px] uppercase tracking-wider font-medium text-right">Price</th>
                        <th className="pb-3 px-2 text-[11px] uppercase tracking-wider font-medium text-right">Cost</th>
                        <th className="pb-3 px-2 text-[11px] uppercase tracking-wider font-medium text-right">Margin</th>
                        <th className="pb-3 px-2 text-[11px] uppercase tracking-wider font-medium text-right">Qty Sold</th>
                        <th className="pb-3 px-2 text-[11px] uppercase tracking-wider font-medium text-right">Revenue</th>
                        <th className="pb-3 px-2 text-[11px] uppercase tracking-wider font-medium text-right">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-border/50">
                      {sortedItems.map(item => (
                        <tr key={item.id} className="hover:bg-theme-surface-alt transition-colors cursor-pointer" onClick={() => setDetailProduct(item)}>
                          <td className="py-3 px-2 text-theme-ink text-sm">{item.name}</td>
                          <td className="py-3 px-2 text-theme-ink-dim text-xs">{item.category}</td>
                          <td className="py-3 px-2 text-right font-mono text-sm">{formatCurrency(item.price)}</td>
                          <td className="py-3 px-2 text-right font-mono text-sm text-theme-ink-dim">
                            {item.hasCost ? formatCurrency(item.cost) : '-'}
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-sm">
                            {item.hasCost ? (
                              <span className={item.margin >= 50 ? 'text-emerald-400' : item.margin >= 30 ? 'text-amber-400' : 'text-red-400'}>
                                {item.margin.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-theme-ink-dim">N/A</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-sm text-theme-accent">{item.quantitySold}</td>
                          <td className="py-3 px-2 text-right font-mono text-sm">{formatCurrency(item.revenue)}</td>
                          <td className={`py-3 px-2 text-right font-mono text-sm font-medium ${item.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(item.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sortedItems.length === 0 && (
                    <div className="py-12 text-center text-theme-ink-dim text-sm">No items sold in this period.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {detailProduct && (() => {
        const detailRecipes = recipes.filter(r => r.product_id === detailProduct.id && !r.variant);
        const variantRecipes = detailProduct.customizations?.length > 0
          ? recipes.filter(r => r.product_id === detailProduct.id && r.variant)
          : [];
        const detailRows = detailRecipes.map(r => ({
          name: stockItems.find(s => s.id === r.inventory_item_id)?.name || 'Unknown',
          qty: r.quantity,
          unitCost: stockCostMap.get(r.inventory_item_id) || 0,
          total: (stockCostMap.get(r.inventory_item_id) || 0) * r.quantity,
          isSubRecipe: stockItems.find(s => s.id === r.inventory_item_id)?.category === 'Sub-Recipe',
        }));
        const baseCost = detailRows.reduce((s, r) => s + r.total, 0);
        return (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDetailProduct(null)}>
            <div className="bg-theme-surface border border-theme-border w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-theme-border flex items-center justify-between shrink-0">
                <div>
                  <h2 className="font-serif text-xl text-theme-ink">{detailProduct.name}</h2>
                  <p className="text-theme-ink-dim text-xs mt-1">Price: {formatCurrency(detailProduct.price)} &middot; Cost: {formatCurrency(detailProduct.cost)} &middot; Margin: {detailProduct.margin.toFixed(1)}%</p>
                </div>
                <button onClick={() => setDetailProduct(null)} className="text-theme-ink-dim hover:text-theme-ink"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 border-b border-theme-border">
                <p className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-3">Base Ingredients ({detailRows.length})</p>
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b border-theme-border/50 text-theme-ink-dim">
                    <th className="pb-2 text-[10px] uppercase">Ingredient</th>
                    <th className="pb-2 text-[10px] uppercase text-right">Qty</th>
                    <th className="pb-2 text-[10px] uppercase text-right">Unit Cost</th>
                    <th className="pb-2 text-[10px] uppercase text-right">Cost</th>
                    <th className="pb-2 text-[10px] uppercase text-right">%</th>
                  </tr></thead>
                  <tbody>
                    {detailRows.map((r, i) => (
                      <tr key={i} className="border-b border-theme-border/20">
                        <td className="py-2 text-theme-ink text-xs">{r.name} {r.isSubRecipe && <span className="text-theme-accent">(sub)</span>}</td>
                        <td className="py-2 text-right font-mono text-xs">{r.qty.toFixed(3)}</td>
                        <td className="py-2 text-right font-mono text-xs text-theme-ink-dim">{formatCurrency(r.unitCost)}</td>
                        <td className="py-2 text-right font-mono text-xs">{formatCurrency(r.total)}</td>
                        <td className="py-2 text-right font-mono text-xs text-theme-ink-dim">{baseCost > 0 ? (r.total / baseCost * 100).toFixed(1) + '%' : '-'}</td>
                      </tr>
                    ))}
                    <tr className="font-medium">
                      <td className="py-2 text-theme-ink">Total Base Cost</td>
                      <td colSpan={3} />
                      <td className="py-2 text-right font-mono text-theme-accent">{formatCurrency(baseCost)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
                {variantRecipes.length > 0 && (
                  <p className="text-[10px] text-theme-ink-dim mt-4">+ variant-specific ingredients (see recipe management for details)</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
