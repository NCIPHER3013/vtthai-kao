import { X, Printer } from 'lucide-react';
import formatCurrency from '../../lib/formatCurrency';
import { Order } from '../../types';
import { buildReceiptHTML, ReceiptData } from '../../lib/print/receiptTemplate';
import { printHtml } from '../../lib/print/printHtml';

interface ReceiptModalProps {
  isOpen: boolean;
  order: Order | null;
  storeName: string;
  headerStr: string;
  footerStr: string;
  cashierName?: string;
  onClose: () => void;
}

export default function ReceiptModal({ isOpen, order, storeName, headerStr, footerStr, cashierName, onClose }: ReceiptModalProps) {
  if (!isOpen || !order) return null;

  const getItemPrice = (item: any) => {
    const currentOrderType = order.order_type || 'takeaway';
    let basePrice = item.product.price;
    if (currentOrderType === 'takeaway' && item.product.price_takeaway) basePrice = item.product.price_takeaway;
    else if (currentOrderType === 'delivery' && item.product.price_delivery) basePrice = item.product.price_delivery;

    const adj = (o: any) => {
      if (currentOrderType === 'takeaway' && o.price_takeaway !== undefined && o.price_takeaway !== null) return Number(o.price_takeaway);
      return Number(o.price_adjustment !== undefined && o.price_adjustment !== null ? o.price_adjustment : (o.price || 0));
    };
    let modsPrice = 0;
    if (item.modifiers && item.product.customizations) {
      item.modifiers.forEach((modName: string) => {
        item.product.customizations!.forEach((group: any) => {
          const opt = group.options.find((o: any) => o.name === modName || modName.startsWith(o.name));
          if (opt) modsPrice += adj(opt);
        });
      });
    }
    return Math.round((basePrice + modsPrice) * 100) / 100;
  };

  const handlePrint = () => {
    const data: ReceiptData = {
      storeName: storeName || 'Vermont Thai',
      header: headerStr,
      footer: footerStr,
      orderId: order.id,
      timestamp: order.timestamp,
      cashier: cashierName,
      customer: order.customerName || order.customer_name,
      phone: order.delivery_phone,
      address: order.delivery_address,
      orderType: order.order_type,
      status: order.status,
      lines: (order.items || []).map(item => ({
        quantity: item.quantity,
        name: item.product.name,
        modifiers: item.modifiers,
        note: item.note,
        lineTotal: getItemPrice(item) * item.quantity,
      })),
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      paymentMethod: order.payment_method || order.paymentMethod,
      giftCards: order.generated_gift_cards?.map(gc => ({ code: gc.code, value: gc.initial_value })),
    };
    printHtml(buildReceiptHTML(data));
  };

  return (
    <div className="receipt-modal-container fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="receipt-content bg-white text-black w-full max-w-sm shadow-2xl relative flex flex-col font-mono text-sm max-h-screen overflow-y-auto border border-gray-200">
        
        {/* Action Bar (Hidden in print) */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50 shrink-0 sticky top-0 z-10">
          <button onClick={onClose} className="p-2 hover:bg-theme-surface rounded-full transition-colors text-theme-ink-dim">
            <X className="w-5 h-5" />
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 bg-theme-accent text-black px-4 py-2 font-bold hover:bg-opacity-90 transition-colors uppercase tracking-wider text-xs">
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>

        {/* Receipt Content */}
        <div className="p-8 pb-12 flex-1">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold uppercase mb-1 tracking-tighter">{storeName || 'Vermont Thai'}</h2>
            {headerStr ? (
              <p className="text-[10px] text-gray-500 mb-6">{headerStr}</p>
            ) : (
              <p className="text-[10px] text-gray-500 mb-6">Welcome to {storeName || 'our restaurant'}!</p>
            )}
            
            <div className="text-left border-y border-dashed border-gray-300 py-4 space-y-1.5 text-[13px]">
              <p className="flex justify-between"><span>Order #:</span> <span className="font-bold">{order.id}</span></p>
              <p className="flex justify-between"><span>Date:</span> <span>{new Date(order.timestamp).toLocaleString()}</span></p>
              <p className="flex justify-between"><span>Cashier:</span> <span>{cashierName || 'Admin'}</span></p>
              {order.customerName && <p className="flex justify-between"><span>Customer:</span> <span>{order.customerName}</span></p>}
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4 mb-8">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex flex-col">
                <div className="flex justify-between items-baseline gap-4">
                  <div className="flex-1">
                    <span className="font-bold text-base">{item.quantity}x {item.product.name}</span>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="text-[11px] text-gray-400 mt-1">
                        {item.modifiers.join(', ')}
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-base">{formatCurrency(getItemPrice(item) * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-gray-300 pt-4 space-y-2 mb-8">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {Number(order.tax) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xl mt-4 pt-4 border-t border-gray-200 text-black">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="border-t border-dashed border-gray-300 pt-6 mb-6 text-[11px] text-gray-600 font-bold uppercase tracking-widest">
            <div className="flex justify-between">
              <span>Paid by</span>
              <span>{order.payment_method || order.paymentMethod || 'CASH'}</span>
            </div>
          </div>

          {order.generated_gift_cards && order.generated_gift_cards.length > 0 && (
            <div className="border-t border-dashed border-gray-300 pt-4 mb-8">
              <h4 className="font-bold text-center mb-2">🎁 GIFT CARDS PURCHASED</h4>
              <div className="space-y-3">
                {order.generated_gift_cards.map((gc, idx) => (
                  <div key={idx} className="border border-gray-800 p-3 rounded text-center break-all">
                    <p className="text-sm font-semibold mb-1">Value: {formatCurrency(gc.initial_value)}</p>
                    <p className="font-mono text-lg font-bold tracking-widest">{gc.code}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Keep this code safe to redeem on your next visit!</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center space-y-6">
            <p className="text-[11px] text-gray-600 font-bold uppercase tracking-widest">
              {footerStr || "Thank you for your visit!"}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300">
              POWERED BY {storeName || 'Vermont Thai'}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
