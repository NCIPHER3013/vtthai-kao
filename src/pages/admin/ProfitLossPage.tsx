import { useState, useEffect, useMemo } from 'react';
import { fetchExpenses } from '../../lib/api/expenses';
import { fetchSalesByDateRange } from '../../lib/api/orders';
import { fetchRecipes, fetchStockItems } from '../../lib/api/recipes';
import { fetchProducts } from '../../lib/api/products';
import { DbError } from '../../lib/api/errors';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { Calendar, DollarSign, TrendingUp, TrendingDown, Loader2, Package, AlertCircle, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';
import { format, subDays, startOfDay, eachDayOfInterval, isSameDay } from 'date-fns';
import formatCurrency from '../../lib/formatCurrency';
import { exportToCSV } from '../../lib/exportCSV';

export default function ProfitLossPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'7D' | '30D' | 'YTD'>('30D');
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

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

      const [ordersWithItems, productsData, recipesData, stockData, eRes] = await Promise.all([
        fetchSalesByDateRange(startDate.toISOString(), now.toISOString()),
        fetchProducts(),
        fetchRecipes(),
        fetchStockItems(),
        fetchExpenses(startDate.toISOString().slice(0, 10), now.toISOString().slice(0, 10)),
      ]);

      setOrders(ordersWithItems);
      setProducts(productsData);
      setRecipes(recipesData);
      setStockItems(stockData);
      setExpenses((eRes as any[]) || []);

      if (ordersWithItems.length > 0) {
        const allItems: any[] = [];
        for (const o of ordersWithItems) {
          if (o.order_items) {
            for (const item of o.order_items) {
              allItems.push(item);
            }
          }
        }
        setOrderItems(allItems);
      } else {
        setOrderItems([]);
      }
    } catch (error) {
      console.error('Error fetching P&L data:', error instanceof DbError ? error.userMessage : error);
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
    const map = new Map<string, number>();
    for (const product of products) {
      const baseRecipes = recipes.filter(r => r.product_id === product.id && !r.variant);
      if (baseRecipes.length === 0) continue;
      let totalCost = 0;
      for (const recipe of baseRecipes) {
        totalCost += (stockCostMap.get(recipe.inventory_item_id) || 0) * recipe.quantity;
      }
      map.set(product.id, totalCost);
    }
    return map;
  }, [products, recipes, stockCostMap]);

  const calculateOrderCOGS = (order: any): number => {
    if (!orderItems || orderItems.length === 0) return 0;
    const items = orderItems.filter(i => i.order_id === order.id);
    let cogs = 0;
    for (const item of items) {
      const baseCost = productCostMap.get(item.product_id) || 0;
      const modifiers: string[] = item.modifiers || [];
      const proteinVariants = ['Chicken', 'Beef', 'Duck', 'Prawn / Seafood', 'Vegetarian / Tofu'];
      const selectedVariant = modifiers.find(m => proteinVariants.includes(m));
      let itemCost = baseCost;

      if (selectedVariant) {
        const variantRecipes = recipes.filter(
          r => r.product_id === item.product_id && r.variant === selectedVariant
        );
        if (variantRecipes.length > 0) {
          itemCost = 0;
          const baseRecipes = recipes.filter(r => r.product_id === item.product_id && !r.variant);
          for (const r of baseRecipes) {
            itemCost += (stockCostMap.get(r.inventory_item_id) || 0) * r.quantity;
          }
          for (const r of variantRecipes) {
            itemCost += (stockCostMap.get(r.inventory_item_id) || 0) * r.quantity;
          }
        }
      }
      cogs += itemCost * Number(item.quantity || 0);
    }
    return cogs;
  };

  const dailyPL = useMemo(() => {
    if (orders.length === 0 && expenses.length === 0) return [];

    const now = new Date();
    let startDate = new Date();
    if (timeframe === '7D') startDate.setDate(now.getDate() - 7);
    if (timeframe === '30D') startDate.setDate(now.getDate() - 30);
    if (timeframe === 'YTD') startDate.setMonth(0, 1);

    const days = eachDayOfInterval({ start: startOfDay(startDate), end: startOfDay(now) });
    const startDateStr = format(startDate, 'yyyy-MM-dd');

    return days.map(day => {
      const dayOrders = orders.filter(o => isSameDay(new Date(o.timestamp), day));
      const dayExpenses = expenses.filter(e => isSameDay(new Date(e.date), day));
      const revenue = dayOrders.reduce((s, o) => s + Number(o.total || o.subtotal || 0), 0);
      const tax = dayOrders.reduce((s, o) => s + Number(o.tax || 0), 0);
      const cogs = dayOrders.reduce((s, o) => s + calculateOrderCOGS(o), 0);
      const grossProfit = revenue - cogs;
      const totalExpenses = dayExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
      const netProfit = grossProfit - totalExpenses;
      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
      const orderCount = dayOrders.length;
      const avgTicket = orderCount > 0 ? revenue / orderCount : 0;

      return {
        date: format(day, 'MMM d'),
        revenue,
        cogs,
        grossProfit,
        netProfit,
        grossMargin,
        netMargin,
        expenses: totalExpenses,
        tax,
        orderCount,
        avgTicket,
      };
    });
  }, [orders, orderItems, productCostMap, recipes, stockCostMap, expenses, timeframe]);

  const kpis = useMemo(() => {
    const totalRevenue = dailyPL.reduce((s, d) => s + d.revenue, 0);
    const totalCOGS = dailyPL.reduce((s, d) => s + d.cogs, 0);
    const totalGrossProfit = totalRevenue - totalCOGS;
    const totalExpenses = dailyPL.reduce((s, d) => s + d.expenses, 0);
    const totalNetProfit = totalGrossProfit - totalExpenses;
    const grossMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
    const netMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
    const totalOrders = dailyPL.reduce((s, d) => s + d.orderCount, 0);
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const bestDay = dailyPL.reduce((best, d) => d.revenue > (best?.revenue || 0) ? d : best, dailyPL[0]);
    const worstDay = dailyPL.reduce((worst, d) => d.revenue < (worst?.revenue || Infinity) ? d : worst, dailyPL[0]);

    return { totalRevenue, totalCOGS, totalGrossProfit, totalExpenses, totalNetProfit, grossMargin, netMargin, totalOrders, avgTicket, bestDay, worstDay };
  }, [dailyPL]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-theme-ink mb-2">Profit & Loss</h1>
          <p className="text-theme-ink-dim text-sm">Daily revenue, COGS, and gross profit tracking.</p>
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
            onClick={() => exportToCSV(dailyPL.map(d => ({
              Date: d.date, Revenue: d.revenue.toFixed(2), COGS: d.cogs.toFixed(2),
              Expenses: d.expenses.toFixed(2), 'Net Profit': d.netProfit.toFixed(2),
              Orders: d.orderCount, 'Avg Ticket': d.avgTicket.toFixed(2),
            })), `pnl_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`)}
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
      ) : orders.length === 0 ? (
        <div className="bg-theme-surface border border-theme-border p-12 text-center text-theme-ink-dim">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p>No sales data for this period. Place orders via POS to see P&L.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="bg-theme-surface border border-theme-border p-5">
              <p className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-1">Revenue</p>
              <p className="font-serif text-xl text-theme-ink">{formatCurrency(kpis.totalRevenue)}</p>
            </div>
            <div className="bg-theme-surface border border-theme-border p-5">
              <p className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-1">COGS</p>
              <p className="font-serif text-xl text-theme-ink">{formatCurrency(kpis.totalCOGS)}</p>
            </div>
            <div className="bg-theme-surface border border-theme-border p-5">
              <p className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-1">Gross Profit</p>
              <p className={`font-serif text-xl ${kpis.totalGrossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(kpis.totalGrossProfit)}
              </p>
            </div>
            <div className="bg-theme-surface border border-theme-border p-5">
              <p className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-1">Expenses</p>
              <p className="font-serif text-xl text-red-400">{formatCurrency(kpis.totalExpenses)}</p>
            </div>
            <div className="bg-theme-surface border border-theme-border p-5">
              <p className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-1">Net Profit</p>
              <p className={`font-serif text-xl ${kpis.totalNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(kpis.totalNetProfit)}
              </p>
            </div>
            <div className="bg-theme-surface border border-theme-border p-5">
              <p className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-1">Gross Margin</p>
              <p className={`font-serif text-xl ${kpis.grossMargin >= 50 ? 'text-emerald-400' : kpis.grossMargin >= 30 ? 'text-amber-400' : 'text-red-400'}`}>
                {kpis.grossMargin.toFixed(1)}%
              </p>
            </div>
            <div className="bg-theme-surface border border-theme-border p-5">
              <p className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-1">Orders</p>
              <p className="font-serif text-xl text-theme-ink">{kpis.totalOrders}</p>
            </div>
            <div className="bg-theme-surface border border-theme-border p-5">
              <p className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-1">Avg Ticket</p>
              <p className="font-serif text-xl text-theme-accent">{formatCurrency(kpis.avgTicket)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-theme-surface border border-theme-border p-6">
              <h3 className="font-serif text-xl text-theme-ink mb-6">Daily Revenue vs COGS</h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyPL}>
                    <defs>
                      <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradCOGS" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="date" stroke="#666" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }}
                      formatter={(value: any) => formatCurrency(value)}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area type="monotone" dataKey="revenue" stroke="#D4AF37" fill="url(#gradRevenue)" strokeWidth={2} name="Revenue" />
                    <Area type="monotone" dataKey="cogs" stroke="#ef4444" fill="url(#gradCOGS)" strokeWidth={2} name="COGS" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-theme-surface border border-theme-border p-6">
              <h3 className="font-serif text-xl text-theme-ink mb-6">Daily Net Profit</h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyPL}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="date" stroke="#666" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }}
                      formatter={(value: any) => formatCurrency(value)}
                    />
                    <Bar dataKey="netProfit" fill="#D4AF37" radius={[4, 4, 0, 0]} name="Net Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-theme-surface border border-theme-border p-6">
            <h3 className="font-serif text-xl text-theme-ink mb-6">Daily Breakdown</h3>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-theme-surface-alt z-10">
                  <tr className="border-b border-theme-border text-theme-ink-dim">
                    <th className="px-3 py-3 text-[11px] uppercase tracking-wider font-medium">Date</th>
                    <th className="px-3 py-3 text-[11px] uppercase tracking-wider font-medium text-right">Orders</th>
                    <th className="px-3 py-3 text-[11px] uppercase tracking-wider font-medium text-right">Revenue</th>
                    <th className="px-3 py-3 text-[11px] uppercase tracking-wider font-medium text-right">COGS</th>
                    <th className="px-3 py-3 text-[11px] uppercase tracking-wider font-medium text-right">Expenses</th>
                    <th className="px-3 py-3 text-[11px] uppercase tracking-wider font-medium text-right">Net Profit</th>
                    <th className="px-3 py-3 text-[11px] uppercase tracking-wider font-medium text-right">Margin</th>
                    <th className="px-3 py-3 text-[11px] uppercase tracking-wider font-medium text-right">Avg Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border/50">
                  {dailyPL.map((day, idx) => (
                    <tr key={idx} className="hover:bg-theme-surface-alt transition-colors">
                      <td className="px-3 py-3 text-theme-ink text-sm">{day.date}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-theme-ink-dim">{day.orderCount}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-theme-accent">{formatCurrency(day.revenue)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-red-400">{formatCurrency(day.cogs)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-red-400/70">{formatCurrency(day.expenses)}</td>
                      <td className={`px-3 py-3 text-right font-mono text-sm font-medium ${day.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(day.netProfit)}
                      </td>
                      <td className={`px-3 py-3 text-right font-mono text-sm ${day.netMargin >= 50 ? 'text-emerald-400' : day.netMargin >= 30 ? 'text-amber-400' : 'text-red-400'}`}>
                        {day.netMargin.toFixed(1)}%
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-theme-ink-dim">{formatCurrency(day.avgTicket)}</td>
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
