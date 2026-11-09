import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  CreditCard,
  AlertCircle,
  ArrowRight,
  Loader2,
  QrCode,
  X,
  Printer,
  AlertTriangle,
  Banknote
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { QRCodeSVG } from 'qrcode.react';
import { subscribeTables } from '../../lib/convex';
import { fetchSalesByDateRange, type OrderWithItems } from '../../lib/api/orders';
import { fetchStockItems } from '../../lib/api/recipes';
import { fetchTables as apiFetchTables, updateTable as apiUpdateTable } from '../../lib/api/tables';
import { fetchSettings } from '../../lib/api/settings';
import { DbError } from '../../lib/api/errors';
import { Order } from '../../types';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [tables, setTables] = useState<{ id: string; table_number: string; zone: string; qr_token?: string }[]>([]);
  const [qrUrl, setQrUrl] = useState('');
  const [qrTableName, setQrTableName] = useState('');
  const storeUrl = window.location.origin + '/store';
  
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  
  // Real-time states
  const [kpiData, setKpiData] = useState<any[]>([]);
  const [salesChartData, setSalesChartData] = useState<any[]>([]);
  const [topItemsData, setTopItemsData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [paymentRatioTarget, setPaymentRatioTarget] = useState(50);
  const [cashTotal, setCashTotal] = useState(0);
  const [cardTotal, setCardTotal] = useState(0);

  useEffect(() => {
    fetchDashboardData();
    fetchTables();

    // Listen to changes on orders and inventory
    const dashboardChannel = subscribeTables(['orders', 'stock_items'], () => {
        fetchDashboardData();
      });

    return () => {
      dashboardChannel();
    };
  }, [selectedPeriod]);

  const fetchTables = async () => {
    try {
      const data = await apiFetchTables();
      if (data) setTables(data.filter(t => t.is_active).map(t => ({
        id: t.id,
        table_number: t.table_number,
        zone: t.zone,
        qr_token: t.qr_token,
      })));
    } catch (error) {
      if (error instanceof DbError) console.error('Error fetching tables:', error.userMessage);
      else console.error('Error fetching tables:', error);
    }
  };

  const handleSelectTable = (tableId: string) => {
    setSelectedTableId(tableId);
    const table = tables.find(t => t.id === tableId);
    if (table) {
      const token = table.qr_token || 'no-token';
      setQrUrl(`${storeUrl}?t=${token}`);
      setQrTableName(table.table_number);
    }
  };

  const handleRegenerateToken = async () => {
    if (!selectedTableId) return;
    const newToken = crypto.randomUUID();
    try {
      await apiUpdateTable(selectedTableId, { qr_token: newToken });
      setQrUrl(`${storeUrl}?t=${newToken}`);
      fetchTables();
    } catch (error) {
      if (error instanceof DbError) console.error('Error regenerating token:', error.userMessage);
      else console.error('Error regenerating token:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const startOfPeriod = new Date();
      startOfPeriod.setHours(0, 0, 0, 0);
      
      if (selectedPeriod === 'week') {
        startOfPeriod.setDate(startOfPeriod.getDate() - 7);
      } else if (selectedPeriod === 'month') {
        startOfPeriod.setDate(startOfPeriod.getDate() - 30);
      }

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const orders: OrderWithItems[] = await fetchSalesByDateRange(
        startOfPeriod.toISOString(),
        endOfDay.toISOString()
      );

      let cash = 0, card = 0;
      orders.forEach((o) => {
        const method = (o.payment_method || '').toUpperCase();
        const total = Number(o.total || 0);
        if (method === 'CASH') cash += total;
        else if (method === 'CARD') card += total;
      });
      setCashTotal(cash);
      setCardTotal(card);

      const settingsData = await fetchSettings();
      if (settingsData?.payment_ratio_target != null) {
        setPaymentRatioTarget(Number(settingsData.payment_ratio_target));
      }

      const periodSales = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const totalOrders = orders.length;
      const avgTicket = totalOrders > 0 ? periodSales / totalOrders : 0;

      setKpiData([
        { label: `${selectedPeriod === 'today' ? "Today's" : "Period"} Sales`, value: `$${periodSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, trend: "+0.0%", isUp: true, icon: <DollarSign className="w-5 h-5" /> },
        { label: "Total Orders", value: totalOrders.toString(), trend: "+0.0%", isUp: true, icon: <ShoppingBag className="w-5 h-5" /> },
        { label: "Avg. Ticket", value: `$${avgTicket.toFixed(2)}`, trend: "+0.0%", isUp: true, icon: <CreditCard className="w-5 h-5" /> },
        { label: "Customers Walk-in", value: `${totalOrders}`, trend: "+0.0%", isUp: true, icon: <Users className="w-5 h-5" /> },
      ]);

      if (selectedPeriod === 'today') {
        const hourlySales = new Map<number, number>();
        for (let i = 0; i <= 22; i += 2) { hourlySales.set(i, 0); }

        orders.forEach(o => {
          const h = new Date(o.timestamp).getHours();
          const bin = h % 2 === 0 ? h : h - 1; 
          if (hourlySales.has(bin)) {
            hourlySales.set(bin, hourlySales.get(bin)! + Number(o.total || 0));
          }
        });

        const chartData = Array.from(hourlySales.entries()).map(([hour, sales]) => ({
          time: `${hour.toString().padStart(2, '0')}:00`,
          sales: Math.round(sales)
        })).sort((a, b) => a.time.localeCompare(b.time));
        setSalesChartData(chartData);
      } else {
        const days = selectedPeriod === 'week' ? 7 : 30;
        const dailySales = new Map<string, number>();
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          dailySales.set(label, 0);
        }
        orders.forEach(o => {
          const date = new Date(o.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (dailySales.has(date)) {
            dailySales.set(date, (dailySales.get(date) || 0) + Number(o.total || 0));
          }
        });
        const chartData = Array.from(dailySales.entries()).map(([time, sales]) => ({ time, sales }));
        setSalesChartData(chartData);
      }

      if (orders.length > 0) {
        const productSales = new Map<string, number>();
        orders.forEach(o => {
          const items = o.order_items || [];
          items.forEach(item => {
            const name = item.products?.name || 'Unknown';
            productSales.set(name, (productSales.get(name) || 0) + Number(item.quantity || 0));
          });
        });
        
        const sortedItems = Array.from(productSales.entries())
          .map(([name, sales]) => ({ name, sales }))
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5);
          
        setTopItemsData(sortedItems.length > 0 ? sortedItems : [{ name: 'No sales yet', sales: 0 }]);
      } else {
        setTopItemsData([{ name: 'No sales yet', sales: 0 }]);
      }

      const inventoryData = await fetchStockItems();
      const newAlerts: any[] = [];
      inventoryData.forEach(item => {
        if (Number(item.current_stock) <= Number(item.reorder_level || 10)) {
          newAlerts.push({
            id: item.id,
            message: `Low Stock: ${item.name} (${item.current_stock} ${item.unit} left)`,
            type: 'warning'
          });
        }
      });

      if (newAlerts.length === 0) {
        newAlerts.push({ id: 0, message: 'No current alerts. All systems nominal.', type: 'info' });
      }

      setAlerts(newAlerts);

    } catch (error) {
      if (error instanceof DbError) console.error('Error fetching dashboard data:', error.userMessage);
      else console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
      </div>
    );
  }

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-theme-ink mb-2">Dashboard Overview</h1>
            <p className="text-theme-ink-dim text-sm">Welcome back. Here is your store's performance for {selectedPeriod === 'today' ? 'today' : `the last ${selectedPeriod === 'week' ? '7' : '30'} days`}.</p>
          </div>
          <div className="flex gap-2 items-center">
            <button 
              onClick={() => setShowQRModal(true)}
              className="px-4 py-2 text-xs uppercase tracking-wider font-semibold transition-colors border bg-theme-accent text-black hover:bg-opacity-90 flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              Generate QR
            </button>
            <div className="w-px h-6 bg-theme-border mx-2"></div>
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' }
            ].map((p) => (
              <button 
                key={p.id}
                onClick={() => setSelectedPeriod(p.id as any)}
                className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold transition-colors border ${
                  selectedPeriod === p.id 
                  ? 'bg-theme-surface border-theme-accent text-theme-accent' 
                  : 'bg-theme-bg border-theme-border text-theme-ink-dim hover:text-theme-ink hover:bg-theme-surface-alt'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </header>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => (
          <div key={index} className="bg-theme-surface border border-theme-border p-6 flex flex-col justify-between hover:border-theme-accent/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-theme-bg border border-theme-border text-theme-ink-dim rounded-sm">
                {kpi.icon}
              </div>
              <div className={`flex items-center gap-1 text-xs font-mono px-2 py-1 border ${
                kpi.isUp ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10' : 'text-red-400 border-red-400/20 bg-red-400/10'
              }`}>
                {kpi.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {kpi.trend}
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-theme-ink-dim mb-1">{kpi.label}</p>
              <h3 className="font-serif text-3xl text-theme-ink">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Ratio */}
      {(() => {
        const total = cashTotal + cardTotal;

        if (total === 0) {
          return (
            <div className="bg-theme-surface border border-theme-border p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-theme-bg border border-theme-border text-theme-ink-dim rounded-sm">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif text-xl text-theme-ink">Payment Ratio</h2>
                  <p className="text-theme-ink-dim text-xs">Target: {paymentRatioTarget}% Cash / {100 - paymentRatioTarget}% Card</p>
                </div>
              </div>
              <p className="text-theme-ink-dim text-sm mt-4">No sales data for this period yet.</p>
            </div>
          );
        }

        const cashPct = (cashTotal / total) * 100;
        const cardPct = (cardTotal / total) * 100;
        const deviation = cashPct - paymentRatioTarget;
        const isOff = Math.abs(deviation) > 10;
        const isWarning = Math.abs(deviation) > 5 && !isOff;
        const barColor = isOff ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400';
        const borderColor = isOff ? 'border-red-400/50' : isWarning ? 'border-amber-400/50' : 'border-emerald-400/50';

        return (
          <div className={`bg-theme-surface border ${borderColor} p-6`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-theme-bg border border-theme-border text-theme-ink-dim rounded-sm">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif text-xl text-theme-ink">Payment Ratio</h2>
                  <p className="text-theme-ink-dim text-xs">Target: {paymentRatioTarget}% Cash / {100 - paymentRatioTarget}% Card</p>
                </div>
              </div>
              {isOff && (
                <div className="flex items-center gap-2 px-3 py-2 border border-red-400/30 bg-red-400/10 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="leading-tight">
                    Cash {cashPct.toFixed(1)}% — off target by {Math.abs(deviation).toFixed(1)}%
                  </span>
                </div>
              )}
              {isWarning && !isOff && (
                <div className="flex items-center gap-2 px-3 py-2 border border-amber-400/30 bg-amber-400/10 text-amber-400 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="leading-tight">
                    Cash {cashPct.toFixed(1)}% — approaching threshold ({Math.abs(deviation).toFixed(1)}% off target)
                  </span>
                </div>
              )}
            </div>

            <div className="w-full h-8 bg-theme-bg border border-theme-border overflow-hidden flex relative">
              <div
                className={`h-full transition-all duration-500 ${barColor}`}
                style={{ width: `${cashPct}%` }}
              />
              <div
                className="h-full bg-theme-surface-alt transition-all duration-500"
                style={{ width: `${cardPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-3 text-sm">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 ${isOff ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span className="text-theme-ink font-medium">Cash: {cashPct.toFixed(1)}%</span>
                <span className="text-theme-ink-dim font-mono text-xs">${cashTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-theme-ink-dim font-mono text-xs">${cardTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                <span className="text-theme-ink font-medium">Card: {cardPct.toFixed(1)}%</span>
                <span className="w-3 h-3 bg-theme-surface-alt border border-theme-border" />
              </div>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart (Spans 2 columns on lg) */}
        <div className="lg:col-span-2 bg-theme-surface border border-theme-border p-6 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-serif text-xl text-theme-ink">Today's Revenue</h2>
            <button className="text-xs uppercase tracking-wider text-theme-accent flex items-center gap-1 hover:underline">
              View Report <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesChartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#666" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="#666" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `$${value}`}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', color: '#e5e5e5' }}
                  itemStyle={{ color: '#C5A059' }}
                  formatter={(value: any) => [`$${value}`, 'Revenue']}
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#C5A059" 
                  strokeWidth={2} 
                  dot={{ fill: '#1a1a1a', stroke: '#C5A059', strokeWidth: 2, r: 4 }} 
                  activeDot={{ r: 6, fill: '#C5A059', stroke: '#1a1a1a' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Panel (Spans 1 column on lg) */}
        <div className="space-y-6 flex flex-col">
          
          {/* Top Items */}
          <div className="bg-theme-surface border border-theme-border p-6 flex-1 flex flex-col">
            <h2 className="font-serif text-xl text-theme-ink mb-6">Top Sellers</h2>
            <div className="flex-1 w-full min-h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItemsData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" hide />
                  <RechartsTooltip 
                    cursor={{ fill: 'transparent' }} 
                    contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', border: '1px solid #2A2A2A' }}
                    itemStyle={{ color: '#C5A059' }}
                    labelStyle={{ color: '#FFFFFF', marginBottom: '4px', fontWeight: 'bold' }}
                    formatter={(value: any) => [`${value} units`, 'Sales']}
                  />
                  <Bar dataKey="sales" radius={[0, 4, 4, 0]} barSize={24}>
                    {topItemsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#C5A059' : '#333333'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Legend/List format below chart */}
            <div className="mt-4 space-y-3">
              {topItemsData.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-theme-ink flex items-center gap-2">
                    <span className="text-theme-ink-dim w-4 text-xs">{idx + 1}.</span> 
                    {item.name}
                  </span>
                  <span className="font-mono text-theme-ink-dim">{item.sales}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Alerts */}
          <div className="bg-theme-surface border border-theme-border p-6 shrink-0 flex flex-col max-h-[400px]">
            <h2 className="font-serif text-xl text-theme-ink mb-4">Action Items (Inventory)</h2>
            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
              {alerts.map(alert => (
                <div 
                  key={alert.id} 
                  className={`p-3 border text-sm flex items-start gap-3 ${
                    alert.type === 'error' 
                      ? 'border-red-400/30 bg-red-400/5 text-red-500' :
                    alert.type === 'info'
                      ? 'border-emerald-400/30 bg-emerald-400/5 text-emerald-500'
                      : 'border-amber-400/30 bg-amber-400/5 text-amber-500'
                  }`}
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="leading-tight">{alert.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* QR Code Modal */}
    {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={() => setShowQRModal(false)}></div>
          <div className="relative bg-theme-bg border border-theme-border w-full max-w-sm shadow-2xl flex flex-col p-8 items-center text-center animate-in zoom-in-95">
            <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-theme-ink-dim hover:text-theme-ink">
              <X className="w-5 h-5" />
            </button>
            <QrCode className="w-8 h-8 text-theme-accent mb-4" />
            <h2 className="font-serif text-2xl text-theme-ink mb-1">Generate Menu QR</h2>
            <p className="text-sm text-theme-ink-dim mb-6">Select a table to generate a secure QR code with unique token.</p>
            
            <div className="w-full text-left mb-6">
              <label className="block text-xs uppercase tracking-wider text-theme-ink-dim mb-2">Select Table</label>
              <select 
                value={selectedTableId}
                onChange={e => handleSelectTable(e.target.value)}
                className="w-full bg-theme-surface border border-theme-border p-3 text-sm focus:outline-none focus:border-theme-accent appearance-none"
              >
                <option value="">-- Choose a table --</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.zone ? `[${t.zone}] ` : ''}{t.table_number}{!t.qr_token ? ' (no token)' : ''}
                  </option>
                ))}
              </select>
              {!selectedTableId && (
                <p className="text-[10px] text-amber-500 mt-1">If a table shows "no token", run the migration SQL first.</p>
              )}
            </div>

            {qrUrl && (
              <>
                <div className="bg-white p-4 rounded-xl border-4 border-theme-accent mb-4">
                  <QRCodeSVG 
                    value={qrUrl} 
                    size={200}
                    bgColor={"#ffffff"}
                    fgColor={"#000000"}
                    level={"H"}
                  />
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-serif text-lg text-theme-ink">{qrTableName}</span>
                  <span className="text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5">Secure</span>
                </div>
                <p className="text-xs font-mono text-theme-ink-dim mb-4 break-all">
                  {qrUrl}
                </p>

                <button 
                  onClick={handleRegenerateToken}
                  className="w-full py-3 mb-3 border border-theme-border text-theme-ink-dim hover:text-theme-ink hover:border-theme-accent uppercase tracking-widest text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  Regenerate Token
                </button>

                <button 
                  onClick={() => window.print()}
                  className="w-full py-4 bg-theme-accent text-black uppercase tracking-widest text-xs font-semibold hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print QR Code
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
