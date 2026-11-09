import { useState, useEffect } from 'react';
import { Search, Receipt, RotateCcw, Eye, X, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { Order } from '../../lib/supabase';
import { fetchOrders as apiFetchOrders, updateOrderStatus as apiUpdateOrderStatus, type OrderWithItems } from '../../lib/api/orders';
import { DbError } from '../../lib/api/errors';
import { format } from 'date-fns';
import { formatScheduled, SHOP_TIMEZONE } from '../../lib/onlineOrdering';
import formatCurrency from '../../lib/formatCurrency';
import { useSettings } from '../../hooks/useSettings';
import { buildReceiptHTML } from '../../lib/print/receiptTemplate';
import { printHtml } from '../../lib/print/printHtml';
import { Pagination } from '../../components/ui/Pagination';

export default function OrdersPage() {
  const { storeName } = useSettings();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  async function fetchOrders() {
    setIsLoading(true);
    try {
      const data = await apiFetchOrders();
      setOrders(data);
    } catch (error: any) {
      console.error('Error fetching orders:', error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.customer_name && o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || 'completed';
    if (s === 'completed' || s === 'paid') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
    if (s === 'pending') return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    if (s === 'refunded' || s === 'cancelled' || s === 'voided') return 'text-red-400 bg-red-400/10 border-red-400/30';
    return 'text-theme-ink-dim bg-theme-bg border-theme-border';
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await apiUpdateOrderStatus(orderId, newStatus);
      await fetchOrders();
      setSelectedOrder(null);
    } catch (error: any) {
      const msg = error instanceof DbError ? error.userMessage : error.message;
      alert(`Failed to update status to ${newStatus}: ${msg}`);
    }
  };

  const handlePrint = (o: OrderWithItems) => {
    printHtml(buildReceiptHTML({
      storeName: storeName || 'Vermont Thai',
      orderId: o.id,
      timestamp: o.timestamp,
      customer: o.customer_name,
      phone: o.delivery_phone,
      address: o.delivery_address,
      orderType: o.order_type,
      status: o.status,
      lines: (o.order_items || []).map(it => ({
        quantity: it.quantity,
        name: it.products?.name || 'Unknown Item',
        modifiers: Array.isArray(it.modifiers) ? it.modifiers.map(String) : undefined,
        note: it.note,
        lineTotal: Math.round(((it as { unit_price?: number | null }).unit_price ?? it.products?.price ?? 0) * it.quantity * 100) / 100,
      })),
      subtotal: o.subtotal,
      tax: o.tax,
      total: o.total,
      paymentMethod: o.payment_method,
    }));
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="font-serif text-3xl text-theme-ink mb-2">Order History</h1>
          <p className="text-theme-ink-dim text-sm">View past transactions, reprint receipts, and process refunds.</p>
        </div>
      </header>
      
      <div className="bg-theme-surface border border-theme-border flex flex-col no-print">
        {/* Toolbar */}
        <div className="p-4 border-b border-theme-border flex items-center justify-between bg-theme-surface-alt">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-ink-dim" />
            <input
              type="text"
              placeholder="Search by Order ID or Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-theme-bg border border-theme-border py-2 pl-10 pr-4 text-sm text-theme-ink focus:outline-none focus:border-theme-accent transition-colors"
            />
          </div>
          <button 
            onClick={fetchOrders}
            className="p-2 text-theme-ink-dim hover:text-theme-accent transition-colors"
            title="Refresh"
          >
            <Loader2 className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-theme-border bg-theme-bg">
                <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Order ID</th>
                <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Date & Time</th>
                <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Customer</th>
                <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Total</th>
                <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Method</th>
                <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Status</th>
                <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-theme-accent mx-auto mb-2" />
                    <span className="text-theme-ink-dim text-xs uppercase tracking-widest">Loading transactions...</span>
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-theme-ink-dim italic">No orders found on this page.</td>
                </tr>
              ) : (
                paginatedOrders.map(order => (
                  <tr key={order.id} className="hover:bg-theme-surface-alt transition-colors group">
                    <td className="py-5 px-4 font-mono text-theme-ink font-bold text-lg">#{order.id.slice(0, 8)}</td>
                    <td className="py-5 px-4 text-sm text-theme-ink-dim">
                      {order.timestamp ? format(new Date(order.timestamp), 'dd MMM yyyy HH:mm') : '-'}
                      {order.order_source === 'online' && (
                        <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-theme-accent">Online</div>
                      )}
                      {order.scheduled_for && (
                        <div className="mt-1 text-[10px] font-bold text-amber-400">
                          Pre-order · due {formatScheduled(order.scheduled_for, SHOP_TIMEZONE)} (shop time)
                        </div>
                      )}
                    </td>
                    <td className="py-5 px-4 text-sm text-theme-ink font-medium">
                      <div>{order.customer_name || 'Walk-in'}</div>
                      {order.delivery_phone && <div className="text-[10px] text-theme-ink-dim mt-1">📞 {order.delivery_phone}</div>}
                      {order.delivery_address && <div className="text-[10px] text-theme-ink-dim max-w-[200px] truncate" title={order.delivery_address}>📍 {order.delivery_address}</div>}
                    </td>
                    <td className="py-5 px-4 text-base text-theme-accent font-bold font-mono tracking-tight">{formatCurrency(order.total)}</td>
                    <td className="py-5 px-4 text-xs text-theme-ink-dim uppercase font-bold tracking-wider">{order.payment_method}</td>
                    <td className="py-5 px-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 border rounded-full ${getStatusColor(order.status)}`}>
                        {order.status || 'Completed'}
                      </span>
                    </td>
                    <td className="py-5 px-4 text-right">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="text-xs uppercase tracking-wider text-theme-accent hover:underline font-bold transition-opacity flex items-center justify-end gap-1 w-full"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <Pagination 
          currentPage={currentPage}
          totalItems={filteredOrders.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Receipt / Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 no-print">
          <div className="bg-theme-surface border border-theme-border w-full max-w-md shadow-2xl flex flex-col rounded-xl overflow-hidden max-h-[90vh]">
            <div className="p-6 border-b border-theme-border flex items-center justify-between bg-theme-surface-alt shrink-0">
              <h2 className="font-serif text-xl text-theme-ink">Order Details</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-theme-ink-dim hover:text-theme-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div id="receipt-content" className="p-8 overflow-y-auto flex-1 bg-[#F9F9F9] text-black font-mono text-sm shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] border-b border-theme-border relative">
              {/* Receipt edge effect */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/5 to-transparent no-print" />
              
              {/* Receipt Mockup */}
              <div className="text-center mb-6">
                <h3 className="font-bold text-2xl tracking-tighter mb-1">{storeName || 'Vermont Thai'}</h3>
                <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">Transaction Receipt</p>
                <div className="mt-6 border-b-2 border-dashed border-gray-300 pb-4 text-left space-y-1.5 text-xs">
                  <div className="flex justify-between"><span>ORDER ID:</span> <span className="font-bold">#{selectedOrder.id}</span></div>
                  <div className="flex justify-between"><span>DATE:</span> <span className="font-bold">{selectedOrder.timestamp ? format(new Date(selectedOrder.timestamp), 'yyyy-MM-dd HH:mm') : '-'}</span></div>
                  <div className="flex justify-between"><span>TYPE:</span> <span className="font-bold uppercase">{selectedOrder.order_type?.replace('_', ' ') || 'UNKNOWN'}</span></div>
                  <div className="flex justify-between"><span>CUSTOMER:</span> <span className="font-bold">{selectedOrder.customer_name || 'WALK-IN'}</span></div>
                  {selectedOrder.delivery_phone && <div className="flex justify-between"><span>TEL:</span> <span className="font-bold">{selectedOrder.delivery_phone}</span></div>}
                  {selectedOrder.delivery_address && <div className="flex justify-between flex-col mt-1 pt-1 border-t border-gray-200 border-dashed"><span className="text-gray-500 text-[10px]">DELIVERY ADDRESS:</span> <span className="font-bold whitespace-pre-wrap">{selectedOrder.delivery_address}</span></div>}
                </div>
              </div>

              <div className="space-y-3 mb-6 border-b-2 border-dashed border-gray-300 pb-6">
                {selectedOrder.order_items?.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm font-bold">
                      <span>{item.quantity}x {item.products?.name || 'Unknown Item'}</span>
                      <span>{formatCurrency((item.products?.price || 0) * item.quantity)}</span>
                    </div>
                    {item.note && <p className="text-[10px] text-gray-500 ml-4 italic">Note: {item.note}</p>}
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-right font-bold text-base">
                <div className="flex justify-between text-xs font-normal text-gray-600">
                  <span>SUBTOTAL</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs font-normal text-gray-600">
                  <span>TAX</span>
                  <span>{formatCurrency(selectedOrder.tax)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-gray-300 pt-2 mt-2 text-lg">
                  <span>TOTAL</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold mt-6 border-t-2 border-dashed border-gray-300 pt-4">
                  <span className="uppercase text-gray-500">PAID VIA {selectedOrder.payment_method}</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>
              
              {(selectedOrder.status?.toLowerCase() === 'refunded') && (
                <div className="mt-10 text-center text-red-600 font-bold border-4 border-red-600 py-3 rotate-[-3deg] uppercase tracking-widest text-lg opacity-80">
                  Voided / Refunded
                </div>
              )}
            </div>

            <div className="p-6 border-t border-theme-border bg-theme-surface-alt flex justify-between gap-4 shrink-0">
              {selectedOrder.status?.toLowerCase() === 'pending' ? (
                <button 
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                  className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-xs uppercase tracking-wider font-semibold transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete Order
                </button>
              ) : (!selectedOrder.status || selectedOrder.status.toLowerCase() === 'completed' || selectedOrder.status.toLowerCase() === 'paid') ? (
                <button 
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'refunded')}
                  className="flex items-center gap-2 text-red-400 hover:text-red-300 text-xs uppercase tracking-wider font-semibold transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Refund Order
                </button>
              ) : (
                <div /> 
              )}
              <button
                onClick={() => handlePrint(selectedOrder)}
                className="bg-theme-accent text-black px-6 py-3 rounded-lg text-xs uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(197,160,89,0.3)] hover:shadow-[0_0_20px_rgba(197,160,89,0.5)] transition-all flex items-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
