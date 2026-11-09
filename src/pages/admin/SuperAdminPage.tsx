import { useState, useEffect } from 'react';
import { fetchSalesByDateRange } from '../../lib/api/orders';
import { DbError } from '../../lib/api/errors';
import formatCurrency from '../../lib/formatCurrency';
import { TrendingUp, Users, DollarSign, Receipt, Loader2, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { format, subDays, startOfDay, endOfDay, parseISO, isSameDay } from 'date-fns';

interface DashboardMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  totalOrders: number;
  ordersGrowth: number;
  avgOrderValue: number;
  aovGrowth: number;
  totalCustomers: number;
  customerGrowth: number;
}

export default function SuperAdminPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0, revenueGrowth: 0, totalOrders: 0, ordersGrowth: 0, avgOrderValue: 0, aovGrowth: 0, totalCustomers: 0, customerGrowth: 0
  });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const now = new Date();
        const thirtyDaysAgo = subDays(now, 30);
        const sixtyDaysAgo = subDays(now, 60);

        const ordersWithItems = await fetchSalesByDateRange(sixtyDaysAgo.toISOString(), now.toISOString());
        const ordersData = ordersWithItems.filter(o => o.status !== 'cancelled');

        const currentPeriod = ordersData.filter(o => new Date(o.timestamp) >= thirtyDaysAgo);
        const previousPeriod = ordersData.filter(o => {
          const d = new Date(o.timestamp);
          return d >= sixtyDaysAgo && d < thirtyDaysAgo;
        });

        const currentRev = currentPeriod.reduce((sum, o) => sum + Number(o.total || 0), 0);
        const prevRev = previousPeriod.reduce((sum, o) => sum + Number(o.total || 0), 0);
        
        const currentAOV = currentPeriod.length > 0 ? currentRev / currentPeriod.length : 0;
        const prevAOV = previousPeriod.length > 0 ? prevRev / previousPeriod.length : 0;

        const currentCustomers = new Set(currentPeriod.map(o => o.customer_id).filter(Boolean)).size;
        const prevCustomers = new Set(previousPeriod.map(o => o.customer_id).filter(Boolean)).size;

        setMetrics({
          totalRevenue: currentRev,
          revenueGrowth: prevRev === 0 ? 100 : ((currentRev - prevRev) / prevRev) * 100,
          totalOrders: currentPeriod.length,
          ordersGrowth: previousPeriod.length === 0 ? 100 : ((currentPeriod.length - previousPeriod.length) / previousPeriod.length) * 100,
          avgOrderValue: currentAOV,
          aovGrowth: prevAOV === 0 ? 100 : ((currentAOV - prevAOV) / prevAOV) * 100,
          totalCustomers: currentCustomers,
          customerGrowth: prevCustomers === 0 ? 100 : ((currentCustomers - prevCustomers) / prevCustomers) * 100
        });

        // Process Sales Chart Data (Last 14 days)
        const fourteenDaysAgo = subDays(now, 14);
        const chartData = [];
        for (let i = 14; i >= 0; i--) {
          const date = subDays(now, i);
          const dayOrders = currentPeriod.filter(o => isSameDay(new Date(o.timestamp), date));
          chartData.push({
            date: format(date, 'MMM dd'),
            sales: dayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)
          });
        }
        setSalesData(chartData);

        if (currentPeriod.length > 0) {
          const allItems: any[] = [];
          currentPeriod.forEach(o => {
            if (o.order_items) {
              o.order_items.forEach(item => {
                allItems.push(item);
              });
            }
          });

          const itemCounts: Record<string, {name: string, qty: number}> = {};
          allItems.forEach((item: any) => {
            if (!item.products) return;
            const pid = item.product_id;
            if (!itemCounts[pid]) {
              itemCounts[pid] = { name: item.products.name, qty: 0 };
            }
            itemCounts[pid].qty += Number(item.quantity || 1);
          });

          const sortedItems = Object.values(itemCounts)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);
          setTopItems(sortedItems);
        } else {
          setTopItems([]);
        }

      } catch (error) {
        console.error('Error loading dashboard data:', error instanceof DbError ? error.userMessage : error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const MetricCard = ({ title, value, growth, prefix = '', suffix = '', icon: Icon }: any) => {
    const isPositive = growth >= 0;
    return (
      <div className="bg-theme-surface border border-theme-border p-6 relative overflow-hidden group">
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-full bg-theme-accent/10 flex items-center justify-center text-theme-accent">
            <Icon className="w-5 h-5" />
          </div>
          <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(growth).toFixed(1)}%
          </div>
        </div>
        <h3 className="text-[11px] uppercase tracking-widest text-theme-ink-dim mb-1">{title}</h3>
        <p className="text-3xl font-serif text-theme-ink">{prefix}{typeof value === 'number' && !prefix && !suffix ? value.toLocaleString() : value}{suffix}</p>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-theme-accent/0 via-theme-accent/50 to-theme-accent/0 translate-y-1 group-hover:translate-y-0 transition-transform" />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-theme-ink mb-1">Owner Overview</h1>
          <p className="text-[12px] uppercase tracking-wider text-theme-ink-dim">Performance Dashboard • Last 30 Days</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Gross Volume" value={formatCurrency(metrics.totalRevenue).replace('$', '')} prefix="$" growth={metrics.revenueGrowth} icon={DollarSign} />
        <MetricCard title="Total Orders" value={metrics.totalOrders} growth={metrics.ordersGrowth} icon={Receipt} />
        <MetricCard title="Average Order" value={formatCurrency(metrics.avgOrderValue).replace('$', '')} prefix="$" growth={metrics.aovGrowth} icon={TrendingUp} />
        <MetricCard title="Active Customers" value={metrics.totalCustomers} growth={metrics.customerGrowth} icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-theme-surface border border-theme-border p-6 flex flex-col">
          <h3 className="text-[11px] uppercase tracking-widest text-theme-ink-dim mb-6">Revenue Trend (14 Days)</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-theme-border)" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--color-theme-ink-dim)' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--color-theme-ink-dim)' }}
                  tickFormatter={(val) => `$${val}`}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--color-theme-surface)', borderColor: 'var(--color-theme-border)', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: 'var(--color-theme-ink)' }}
                  formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                />
                <Area type="monotone" dataKey="sales" stroke="#eab308" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Items */}
        <div className="bg-theme-surface border border-theme-border p-6 flex flex-col relative">
          <h3 className="text-[11px] uppercase tracking-widest text-theme-ink-dim mb-6">Top Menu Items</h3>
          <div className="flex-1 min-h-0 relative">
            {topItems.length > 0 ? (
              <div className="flex h-full gap-4">
                {/* Names Column - Far Left */}
                <div className="w-32 flex flex-col justify-around py-2 shrink-0">
                  {topItems.map((item, i) => (
                    <span key={i} className="text-[11px] font-medium text-theme-ink truncate" title={item.name}>
                      {item.name}
                    </span>
                  ))}
                </div>

                {/* Chart Column - Right */}
                <div className="flex-1 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topItems} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-theme-border)" opacity={0.2} />
                      <XAxis type="number" hide />
                      <YAxis type="category" hide dataKey="name" />
                      <RechartsTooltip 
                        cursor={{fill: 'var(--color-theme-surface-alt)', opacity: 0.4}}
                        contentStyle={{ backgroundColor: 'var(--color-theme-surface)', borderColor: 'var(--color-theme-border)', borderRadius: '8px', fontSize: '12px' }}
                        itemStyle={{ color: 'var(--color-theme-ink)' }}
                        labelStyle={{ color: 'var(--color-theme-ink)', fontWeight: 'bold', marginBottom: '4px' }}
                        formatter={(value: any) => [`${value} sold`, 'Volume']}
                      />
                      <Bar dataKey="qty" radius={[0, 4, 4, 0]} barSize={16}>
                        {topItems.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#eab308' : 'var(--color-theme-border)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Units overlay on the right of the bars */}
                  <div className="absolute top-0 right-0 bottom-0 flex flex-col justify-around py-2 pointer-events-none">
                    {topItems.map((item, i) => (
                      <span key={i} className="text-[10px] font-mono text-theme-ink-dim pr-2">
                        {item.qty} units
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-theme-ink-dim opacity-50">
                <Package className="w-8 h-8 mb-2" />
                <p className="text-xs uppercase tracking-wider">No Sales Data</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
