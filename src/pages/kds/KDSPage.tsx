import { useState, useEffect } from 'react';
import { Clock, CheckCircle, ChefHat, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { subscribeTables } from '../../lib/convex';
import { OrderStatus } from '../../types';
import { fetchActiveOrders as fetchActiveOrdersDb, fetchOrdersByStatus, updateOrderStatus as updateOrderStatusInDb, type OrderWithItems } from '../../lib/api/orders';
import { DbError } from '../../lib/api/errors';
import { formatScheduled, SHOP_TIMEZONE } from '../../lib/onlineOrdering';

interface KDSItem {
  id: string;
  name: string;
  quantity: number;
  modifiers?: string[];
  note?: string;
}

interface KDSOrder {
  id: string;
  timestamp: Date;
  status: OrderStatus;
  items: KDSItem[];
  customerName?: string;
  type: string;
  deliveryAddress?: string;
  deliveryPhone?: string;
  scheduledFor?: Date | null;
}

const SHOW_SCHEDULED_WITHIN_MIN = 60;

export default function KDSPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // Update time every minute for elapsed time calculation
  useEffect(() => {
    // Check for logged in staff
    const adminSession = localStorage.getItem('kungpos_admin');
    const staffData = localStorage.getItem('kungpos_staff');
    
    let isAuthorized = false;
    if (adminSession) {
      isAuthorized = true;
    } else if (staffData) {
      try {
        const staff = JSON.parse(staffData);
        // Kitchen or Manager can view KDS
        if (staff.role === 'manager' || staff.role === 'kitchen' || staff.role === 'admin') isAuthorized = true;
      } catch (e) {}
    }

    if (!isAuthorized) {
      navigate('/login');
      return;
    }

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchActiveOrders();

    return subscribeTables(['orders', 'order_items'], () => {
      fetchActiveOrders();
    });
  }, []);

  const fetchActiveOrders = async () => {
    try {
      const [activeData, readyData] = await Promise.all([
        fetchActiveOrdersDb(),
        fetchOrdersByStatus('ready')
      ]);

      const allOrders: OrderWithItems[] = [...activeData, ...readyData];

      if (allOrders.length === 0) {
        setOrders([]);
        setIsLoading(false);
        return;
      }

      const kdsOrders: KDSOrder[] = allOrders.map(o => ({
        id: o.id,
        timestamp: new Date(o.timestamp),
        status: (o.status || 'pending') as OrderStatus,
        items: (o.order_items || []).map(i => ({
          id: String(i.id),
          name: i.products?.name || 'Unknown Item',
          quantity: i.quantity,
          modifiers: i.modifiers || [],
          note: i.note || ''
        })),
        customerName: o.customer_name || 'Walk-in',
        type: o.order_type === 'dine_in' ? 'Dine-in' : o.order_type === 'delivery' ? 'Delivery' : 'Takeaway',
        deliveryAddress: o.delivery_address,
        deliveryPhone: o.delivery_phone,
        scheduledFor: o.scheduled_for ? new Date(o.scheduled_for) : null
      }));

      setOrders(kdsOrders);
    } catch (error) {
      if (error instanceof DbError) {
        console.error('Error fetching KDS orders:', error.userMessage, error);
      } else {
        console.error('Error fetching KDS orders:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setOrders(prev => prev.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ).filter(order => newStatus !== 'completed' || order.id !== orderId));
      await updateOrderStatusInDb(orderId, newStatus);
    } catch (error) {
      if (error instanceof DbError) {
        console.error('Failed to update status:', error.userMessage, error);
      } else {
        console.error('Failed to update status', error);
      }
      fetchActiveOrders();
    }
  };

  const getElapsedTime = (timestamp: Date) => {
    const diffInMinutes = Math.floor((currentTime.getTime() - timestamp.getTime()) / 60000);
    return Math.max(0, diffInMinutes);
  };

  const getTimeColor = (minutes: number) => {
    if (minutes >= 15) return 'text-red-400 bg-red-400/10 border-red-400/30';
    if (minutes >= 10) return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
  };

  const isLater = (o: KDSOrder) =>
    !!o.scheduledFor && o.status === 'pending' &&
    o.scheduledFor.getTime() - currentTime.getTime() > SHOW_SCHEDULED_WITHIN_MIN * 60000;
  const upcomingOrders = orders.filter(isLater);
  const visibleOrders = orders.filter(o => !isLater(o));
  const activeOrders = visibleOrders.filter(o => o.status !== 'ready');
  const readyOrders = visibleOrders.filter(o => o.status === 'ready');

  return (
    <div className="flex flex-col h-screen w-full bg-theme-bg overflow-hidden font-sans text-theme-ink">
      {/* Header */}
      <header className="bg-theme-surface border-b border-theme-border px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <ChefHat className="w-8 h-8 text-theme-accent" />
          <div>
            <h1 className="font-serif text-2xl text-theme-ink leading-none">Kitchen Display</h1>
            <p className="text-[11px] uppercase tracking-[2px] text-theme-ink-dim mt-1">Station: All Items</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {upcomingOrders.length > 0 && (
            <div
              className="text-xs uppercase tracking-wider font-semibold bg-theme-bg px-4 py-2 border border-theme-accent/40 rounded-sm text-theme-accent"
              title={upcomingOrders
                .map(o => `#${o.id.split('-')[0].toUpperCase()} ${formatScheduled(o.scheduledFor!.toISOString(), SHOP_TIMEZONE)}`)
                .join('\n')}
            >
              {upcomingOrders.length} pre-order{upcomingOrders.length > 1 ? 's' : ''} coming up
            </div>
          )}
          <div className="text-theme-ink-dim text-sm font-mono bg-theme-bg px-4 py-2 border border-theme-border rounded-sm">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <Link to="/pos" className="text-xs uppercase tracking-wider text-theme-accent hover:underline font-semibold">
            Back to POS
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-x-auto p-8 flex gap-6 items-start">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-theme-ink-dim">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading active orders...</p>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-theme-ink-dim">
            <CheckCircle className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-serif">No active orders</p>
            <p className="text-sm">Kitchen is clear.</p>
          </div>
        ) : (
          <>
            {/* Active Orders (Pending & Preparing) */}
            <div className="flex flex-1 gap-6 overflow-x-auto min-w-0 pb-4">
              {activeOrders.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()).map(order => {
                const elapsed = getElapsedTime(order.timestamp);
                const isPreparing = order.status === 'preparing';

                return (
                  <div 
                    key={order.id} 
                    className={`flex-shrink-0 w-80 bg-theme-surface border rounded-xl flex flex-col max-h-full animate-in fade-in slide-in-from-bottom-4 overflow-hidden ${
                      isPreparing ? 'border-theme-accent shadow-[0_0_20px_rgba(197,160,89,0.15)]' : 'border-theme-border shadow-sm'
                    }`}
                  >
                    {/* Card Header */}
                    <div className={`p-5 border-b flex items-start justify-between ${isPreparing ? 'border-theme-accent/30 bg-theme-accent/10' : 'border-theme-border bg-theme-surface-alt'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className={`font-serif text-2xl font-bold tracking-wider ${isPreparing ? 'text-theme-accent' : 'text-theme-ink'}`}>#{order.id.split('-')[0].toUpperCase()}</h2>
                          {isPreparing && <span className="bg-theme-accent text-black text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-sm">Cooking</span>}
                        </div>
                        <p className="text-xs text-theme-ink-dim mt-1.5 font-medium tracking-wide uppercase">{order.type} {order.customerName && <span className="text-theme-ink font-bold border-l border-theme-border pl-1.5 ml-1.5">{order.customerName}</span>}</p>
                        {order.scheduledFor && (
                          <p className="mt-1.5 inline-block text-[10px] uppercase tracking-widest font-bold bg-theme-accent text-black px-1.5 py-0.5 rounded-sm">
                            Pre-order · due {formatScheduled(order.scheduledFor.toISOString(), SHOP_TIMEZONE)}
                          </p>
                        )}
                        {order.type === 'Delivery' && (order.deliveryAddress || order.deliveryPhone) && (
                          <div className="mt-2 text-[10px] bg-theme-bg/50 border border-theme-border rounded p-1.5 text-theme-ink-dim">
                            {order.deliveryPhone && <div><span className="font-bold">Tel:</span> {order.deliveryPhone}</div>}
                            {order.deliveryAddress && <div><span className="font-bold">Addr:</span> {order.deliveryAddress}</div>}
                          </div>
                        )}
                      </div>
                      <div className={`px-3 py-1.5 rounded-md border flex items-center gap-2 text-sm font-mono font-bold shadow-sm ${getTimeColor(elapsed)}`}>
                        <Clock className="w-3.5 h-3.5" />
                        {elapsed}m
                      </div>
                    </div>

                    {/* Card Items */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-4 pb-4 border-b border-theme-border/50 last:border-0 last:pb-0">
                          <div className={`w-8 h-8 shrink-0 rounded-md border flex items-center justify-center text-sm font-mono font-bold shadow-sm ${isPreparing ? 'bg-theme-accent/10 border-theme-accent/30 text-theme-accent' : 'bg-theme-surface-alt border-theme-border text-theme-ink'}`}>
                            {item.quantity}
                          </div>
                          <div className="pt-0.5">
                            <p className="text-theme-ink font-bold text-lg leading-tight">{item.name}</p>
                            {item.modifiers && item.modifiers.length > 0 && (
                              <ul className="mt-2 space-y-1.5">
                                {item.modifiers.map(mod => (
                                  <li key={mod} className="text-xs text-theme-accent uppercase tracking-wider flex items-start gap-1.5">
                                    <ArrowRight className="w-3 h-3 shrink-0 mt-0.5 opacity-70" /> 
                                    <span className="font-medium">{mod}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {item.note && (
                              <p className="mt-3 text-sm text-amber-400 bg-amber-400/10 p-2.5 rounded-md border border-amber-400/20 flex items-start gap-2 shadow-sm font-medium">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                {item.note}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Card Actions */}
                    <div className="p-4 border-t border-theme-border bg-theme-surface-alt shrink-0">
                      {order.status === 'pending' ? (
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                          className="w-full py-4 bg-theme-surface border border-theme-accent rounded-lg text-theme-accent hover:bg-theme-accent hover:text-black transition-all text-xs uppercase tracking-[2px] font-bold shadow-sm"
                        >
                          Start Preparing
                        </button>
                      ) : (
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'ready')}
                          className="w-full py-4 bg-emerald-500 rounded-lg text-black hover:bg-emerald-400 transition-all text-xs uppercase tracking-[2px] font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark as Ready
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {activeOrders.length === 0 && (
                 <div className="w-full flex items-center justify-center text-theme-ink-dim opacity-50 border border-dashed border-theme-border p-8 rounded-sm">
                   Kitchen is clear
                 </div>
              )}
            </div>

            {/* Ready Orders (Expediter / Pickup View) */}
            <div className="w-80 shrink-0 border-l border-theme-border pl-6 flex flex-col h-full overflow-hidden">
              <h2 className="text-[12px] uppercase tracking-[2px] text-emerald-400 font-semibold flex items-center gap-2 mb-4 shrink-0">
                <CheckCircle className="w-4 h-4" /> Ready for Pickup
              </h2>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {readyOrders.length === 0 ? (
                  <p className="text-theme-ink-dim text-sm italic">No orders waiting</p>
                ) : (
                  readyOrders.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()).map(order => (
                    <div key={order.id} className="bg-theme-surface border border-emerald-500/30 p-4 animate-in fade-in slide-in-from-right-4">
                       <div className="flex justify-between items-start mb-3">
                         <div>
                          <h3 className="font-serif text-xl text-theme-ink">#{order.id}</h3>
                          <p className="text-[10px] uppercase text-theme-ink-dim mt-1">{order.type} {order.customerName && `• ${order.customerName}`}</p>
                         </div>
                         <div className="text-xs font-mono text-emerald-400 border border-emerald-400/30 px-2 py-1 bg-emerald-400/10 rounded-sm">
                           {getElapsedTime(order.timestamp)}m
                         </div>
                       </div>
                       
                       <p className="text-xs text-theme-ink-dim mb-4 line-clamp-2">
                         {order.items.reduce((acc, item) => acc + item.quantity, 0)} items ready
                       </p>

                       <button 
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                          className="w-full py-3 border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors text-[10px] uppercase tracking-[2px] font-semibold"
                        >
                          Complete / Handed Out
                        </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
