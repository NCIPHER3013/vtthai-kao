import { useState, useEffect, useMemo } from 'react';
import { fetchSalesByDateRange } from '../../lib/api/orders';
import { DbError } from '../../lib/api/errors';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { Calendar, Download, PieChart as PieChartIcon, TrendingUp, DollarSign, Loader2 } from 'lucide-react';
import formatCurrency from '../../lib/formatCurrency';
import { exportToCSV } from '../../lib/exportCSV';

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'7D' | '30D' | 'YTD'>('30D');
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);

  const COLORS = ['#D4AF37', '#808080', '#E5E4E2', '#C0C0C0', '#1A1A1A']; // Theme matching colors

  useEffect(() => {
    fetchReportData();
  }, [timeframe]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      if (timeframe === '7D') startDate.setDate(now.getDate() - 7);
      if (timeframe === '30D') startDate.setDate(now.getDate() - 30);
      if (timeframe === 'YTD') startDate.setMonth(0, 1);

      const ordersWithItems = await fetchSalesByDateRange(startDate.toISOString(), now.toISOString());
      setOrders(ordersWithItems);

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
      console.error('Error fetching report data:', error instanceof DbError ? error.userMessage : error);
    } finally {
      setIsLoading(false);
    }
  };

  // Memoized Aggregations
  const totalRevenue = useMemo(() => orders.reduce((sum, o) => sum + Number(o.total || o.subtotal || 0), 0), [orders]);
  const totalTax = useMemo(() => orders.reduce((sum, o) => sum + Number(o.tax || 0), 0), [orders]);
  
  const salesByDate = useMemo(() => {
    const daily = new Map<string, number>();
    orders.forEach(o => {
      const d = new Date(o.timestamp).toLocaleDateString();
      daily.set(d, (daily.get(d) || 0) + Number(o.total || o.subtotal || 0));
    });
    return Array.from(daily.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [orders]);

  const salesByPayment = useMemo(() => {
    const methods = new Map<string, number>();
    orders.forEach(o => {
      const m = o.payment_method || o.paymentMethod || 'UNKNOWN';
      methods.set(m, (methods.get(m) || 0) + Number(o.total || o.subtotal || 0));
    });
    return Array.from(methods.entries()).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const salesByCategory = useMemo(() => {
    const cats = new Map<string, number>();
    orderItems.forEach(item => {
      const cat = (item.products as any)?.category || 'Uncategorized';
      cats.set(cat, (cats.get(cat) || 0) + Number(item.quantity || 0));
    });
    return Array.from(cats.entries()).map(([name, value]) => ({ name, value }));
  }, [orderItems]);

  const topSellingItems = useMemo(() => {
    const items = new Map<string, number>();
    orderItems.forEach(item => {
      const name = (item.products as any)?.name || 'Unknown Item';
      items.set(name, (items.get(name) || 0) + Number(item.quantity || 0));
    });
    return Array.from(items.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [orderItems]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-theme-ink mb-2">Reports & Analytics</h1>
          <p className="text-theme-ink-dim text-sm">Deep dive into your business metrics and sales trends.</p>
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
            onClick={() => exportToCSV([
              ...salesByDate.map(d => ({ Date: d.date, Revenue: d.revenue.toFixed(2) })),
              {},
              ...salesByPayment.map(d => ({ 'Payment Method': d.name, Revenue: d.value.toFixed(2) })),
            ], `reports_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`)}
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
          
          {/* Top Line Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-theme-surface border border-theme-border p-6 hover:border-theme-accent/50 transition-colors">
              <div className="flex items-center gap-3 mb-2 text-theme-ink-dim">
                <DollarSign className="w-5 h-5" />
                <h3 className="text-[11px] uppercase tracking-wider">Gross Revenue</h3>
              </div>
              <p className="font-serif text-4xl text-theme-ink">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="bg-theme-surface border border-theme-border p-6 hover:border-theme-accent/50 transition-colors">
              <div className="flex items-center gap-3 mb-2 text-theme-ink-dim">
                <TrendingUp className="w-5 h-5" />
                <h3 className="text-[11px] uppercase tracking-wider">Total Orders</h3>
              </div>
              <p className="font-serif text-4xl text-theme-ink">{orders.length}</p>
            </div>
            <div className="bg-theme-surface border border-theme-border p-6 hover:border-theme-accent/50 transition-colors">
              <div className="flex items-center gap-3 mb-2 text-theme-ink-dim">
                <PieChartIcon className="w-5 h-5" />
                <h3 className="text-[11px] uppercase tracking-wider">Tax Collected</h3>
              </div>
              <p className="font-serif text-4xl text-theme-ink">{formatCurrency(totalTax)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Revenue Trend Line Chart */}
            <div className="lg:col-span-2 bg-theme-surface border border-theme-border p-6">
              <h3 className="font-serif text-xl text-theme-ink mb-6">Revenue Trend</h3>
              <div className="h-[300px] w-full">
                {salesByDate.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesByDate}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }}
                        formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={2} dot={{ r: 4, fill: '#D4AF37', strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-theme-ink-dim text-sm">No data for selected period</div>
                )}
              </div>
            </div>

            {/* Sales by Payment Method Pie Chart */}
            <div className="bg-theme-surface border border-theme-border p-6">
              <h3 className="font-serif text-xl text-theme-ink mb-6">Sales by Payment method</h3>
              <div className="h-[300px] w-full flex items-center justify-center">
                {salesByPayment.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={salesByPayment}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {salesByPayment.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }}
                        formatter={(value: any) => formatCurrency(value)}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-theme-ink-dim text-sm">No data</div>
                )}
              </div>
            </div>

            {/* Top Categories Bar Chart */}
            <div className="bg-theme-surface border border-theme-border p-6 lg:col-span-1">
              <h3 className="font-serif text-xl text-theme-ink mb-6">Items Sold by Category</h3>
              <div className="h-[300px] w-full">
                {salesByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesByCategory} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                      <XAxis type="number" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} width={80} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }}
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      />
                      <Bar dataKey="value" fill="#D4AF37" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-theme-ink-dim text-sm">No data</div>
                )}
              </div>
            </div>

            {/* Top Selling Items (List) */}
            <div className="bg-theme-surface border border-theme-border p-6 lg:col-span-2">
              <h3 className="font-serif text-xl text-theme-ink mb-6">Top Selling Items</h3>
              {topSellingItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-theme-border text-theme-ink-dim">
                        <th className="pb-3 text-[11px] uppercase tracking-wider font-medium">Rank</th>
                        <th className="pb-3 text-[11px] uppercase tracking-wider font-medium">Item Name</th>
                        <th className="pb-3 text-[11px] uppercase tracking-wider font-medium text-right">Qty Sold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-border/50">
                      {topSellingItems.map((item, idx) => (
                        <tr key={idx} className="group hover:bg-theme-surface-alt transition-colors">
                          <td className="py-4 px-2 text-theme-ink-dim font-mono">#{idx + 1}</td>
                          <td className="py-4 text-theme-ink">{item.name}</td>
                          <td className="py-4 text-right font-mono text-theme-accent">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-theme-ink-dim text-sm">
                  No items sold in this period.
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
