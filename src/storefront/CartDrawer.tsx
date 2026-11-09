import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Minus, Plus, Trash2, CheckCircle2, Loader2, ShoppingBag, CalendarClock, Clock, Users } from 'lucide-react';
import { processOrderAtomic } from '../lib/api/orders';
import { placeOnlineOrder } from '../lib/api/onlineOrders';
import { fetchCustomerByEmail, createCustomer } from '../lib/api/customers';
import { updateTableSession } from '../lib/api/tables';
import { deliveryFeeFor, formatScheduled, getOpenStatus, onlineOrderErrorMessage } from '../lib/onlineOrdering';
import { useStorefront } from './StorefrontContext';
import { formatAUD } from './types';

type Step = 'cart' | 'details' | 'success';

const INPUT_CLS =
  'mt-1 w-full rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.03)] px-4 py-3 text-base focus:outline-none focus:border-[color:var(--vt-accent)] sm:text-sm';

export default function CartDrawer() {
  const navigate = useNavigate();
  const store = useStorefront();
  const {
    cart,
    changeQty,
    clearCart,
    cartOpen,
    setCartOpen,
    mode,
    table,
    tableSessionId,
    existingOrderId,
    setExistingOrderId,
    customer,
    setCustomer,
    taxRate,
    subtotal,
    onlineConfig: cfg,
    fulfilment,
    hasLunchItem,
  } = store;

  const [step, setStep] = useState<Step>('cart');
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'CASH'>('CARD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [timeError, setTimeError] = useState(false);
  const [placed, setPlaced] = useState<{ id: string; scheduledFor: string | null; total: number } | null>(null);

  const isTableMode = mode === 'dine_in' && !!table;
  const orderType: 'delivery' | 'takeaway' = mode === 'takeaway' ? 'takeaway' : 'delivery';
  const fee = isTableMode ? 0 : deliveryFeeFor(cfg, orderType, subtotal);
  const tax = subtotal * taxRate;
  const total = subtotal + tax + fee;
  const remainingForFree = orderType === 'delivery' && !isTableMode ? Math.max(0, cfg.free_delivery_threshold - subtotal) : 0;

  const close = () => {
    setCartOpen(false);
    if (step === 'success') setStep('cart');
    setErrorMsg('');
    setTimeError(false);
  };

  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [cartOpen]);

  const goChooseTime = () => {
    setCartOpen(false);
    setStep('cart');
    setErrorMsg('');
    setTimeError(false);
    navigate('/order');
    setTimeout(() => document.getElementById('ordering-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
  };

  const timingProblem = (): string | null => {
    if (isTableMode) return null;
    if (!cfg.enabled) return 'Online ordering is paused right now. Please call us to place your order.';
    if (fulfilment.when === 'scheduled') {
      return fulfilment.scheduledFor ? null : 'Please choose a time for your order.';
    }
    if (hasLunchItem) return 'Lunch specials are pre-order only. Please choose a time for tomorrow or later.';
    if (!getOpenStatus(cfg, new Date()).canAsap) return 'We are closed for ASAP orders right now. Please choose a time for your order.';
    return null;
  };

  const validateDetails = () => {
    if (isTableMode) return null;
    if (!name.trim()) return 'Please enter your name.';
    if (!phone.trim()) return 'Please enter your phone number.';
    if (orderType === 'delivery' && !address.trim()) return 'Please enter your delivery address.';
    return null;
  };

  const submitOrder = async () => {
    const timing = timingProblem();
    if (timing) {
      setErrorMsg(timing);
      setTimeError(cfg.enabled);
      return;
    }
    const invalid = validateDetails();
    if (invalid) {
      setErrorMsg(invalid);
      setTimeError(false);
      return;
    }
    setErrorMsg('');
    setTimeError(false);
    setIsSubmitting(true);

    const isAddToExisting = isTableMode && !!existingOrderId;
    const orderId = isAddToExisting ? existingOrderId! : crypto.randomUUID();

    try {
      let customerId: string | null = customer?.id || null;
      if (!isTableMode && !customerId && email.trim()) {
        try {
          const normalizedEmail = email.trim().toLowerCase();
          const existing = await fetchCustomerByEmail(normalizedEmail);
          if (existing) {
            customerId = existing.id;
            setCustomer({ id: existing.id, name: existing.name, email: existing.email ?? undefined, points: existing.points });
          } else {
            const created = await createCustomer({
              name: name.trim(),
              email: normalizedEmail,
              phone: phone.trim() || undefined,
            });
            if (created) {
              customerId = created.id;
              setCustomer({ id: created.id, name: created.name, email: created.email ?? undefined, points: created.points });
            }
          }
        } catch (custErr) {
          console.error('Customer lookup failed (order continues without loyalty):', custErr);
        }
      }

      if (isTableMode) {
        const items = cart.map((line) => ({
          product_id: line.product.id,
          quantity: line.qty,
          note: null as string | null,
          modifiers: line.options.map((o) => `${o.group}: ${o.name}`),
        }));
        if (note.trim() && items.length > 0) items[0].note = note.trim();
        await processOrderAtomic({
          orderId,
          subtotal,
          tax,
          total,
          paymentMethod,
          orderType: mode,
          status: 'pending',
          customerId,
          customerName: `Table ${table!.table_number}`,
          shiftId: null,
          deliveryAddress: null,
          deliveryPhone: null,
          items,
        });
        if (tableSessionId && !existingOrderId) {
          await updateTableSession(tableSessionId, { order_id: orderId });
          setExistingOrderId(orderId);
        }
        setPlaced({ id: orderId, scheduledFor: null, total });
      } else {
        const result = await placeOnlineOrder({
          order_id: orderId,
          order_type: orderType,
          customer_name: name.trim(),
          phone: phone.trim(),
          address: orderType === 'delivery' ? address.trim() : undefined,
          note: note.trim() || undefined,
          payment_method: paymentMethod,
          customer_id: customerId,
          scheduled_for: fulfilment.when === 'scheduled' ? fulfilment.scheduledFor : null,
          items: cart.map((line) => ({
            product_id: line.product.id,
            quantity: line.qty,
            modifiers: line.options.map((o) => `${o.group}: ${o.name}`),
          })),
        });
        setPlaced({ id: result.order_id, scheduledFor: result.scheduled_for, total: Number(result.total) });
      }

      clearCart();
      setNote('');
      setStep('success');
    } catch (err: any) {
      const msg = isTableMode ? err?.userMessage || err?.message || 'Failed to send order.' : onlineOrderErrorMessage(err);
      setErrorMsg(msg);
      setTimeError(/time|schedule|ASAP|lunch|hours|too soon|too far/i.test(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!cartOpen) return null;

  const whenLine =
    fulfilment.when === 'scheduled' && fulfilment.scheduledFor
      ? `Scheduled · ${formatScheduled(fulfilment.scheduledFor, cfg.timezone)}`
      : 'ASAP';

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
      <aside className="vt-slide-in absolute right-0 top-0 h-full w-full max-w-md border-l border-[color:var(--vt-border)] bg-[color:var(--vt-bg)] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between border-b border-[color:var(--vt-border)] px-5 py-4">
          <div className="font-semibold">
            {step === 'cart' && 'Your cart'}
            {step === 'details' && (isTableMode ? `Order for Table ${table!.table_number}` : 'Your details')}
            {step === 'success' && (placed?.scheduledFor ? 'Pre-order placed' : 'Order placed')}
          </div>
          {step !== 'success' && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
              <span className={step === 'cart' ? 'text-[color:var(--vt-accent)]' : 'text-[color:var(--vt-muted)]'}>Cart</span>
              <span className="text-[color:var(--vt-muted)]">›</span>
              <span className={step === 'details' ? 'text-[color:var(--vt-accent)]' : 'text-[color:var(--vt-muted)]'}>
                {isTableMode ? 'Send' : 'Checkout'}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={close}
            className="p-2 rounded-lg text-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)] hover:bg-[color:rgba(255,255,255,0.06)]"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'cart' && (
          <>
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[color:var(--vt-muted)]">
                <ShoppingBag className="w-10 h-10 opacity-50" />
                <div>Your cart is empty</div>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    navigate('/order');
                  }}
                  className="rounded-full bg-gradient-to-r from-[#ff7a52] to-[color:var(--vt-accent)] px-5 py-3 text-sm font-semibold text-white hover:brightness-110"
                >
                  Browse the menu
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-2">
                  {cart.map((line, idx) => (
                    <div key={line.key} className={`flex gap-3 py-3.5 ${idx > 0 ? 'border-t border-[color:var(--vt-line)]' : ''}`}>
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-[color:rgba(255,255,255,0.03)] shrink-0">
                        {line.product.image_url ? (
                          <img src={line.product.image_url} alt={line.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[color:var(--vt-accent)] text-xs font-bold">
                            {line.product.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-medium leading-snug">
                            {line.product.name}
                            {line.product.is_lunch_special && (
                              <span className="ml-2 rounded-full bg-[color:var(--vt-accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--vt-accent)]">
                                Lunch · pre-order
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => changeQty(line.key, -line.qty)}
                            className="-m-2 p-2 text-[color:var(--vt-muted)] hover:text-[color:var(--vt-chili)]"
                            aria-label={`Remove ${line.product.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {line.options.length > 0 && (
                          <div className="text-xs text-[color:var(--vt-muted)] truncate">
                            {line.options.map((o) => o.name).join(', ')}
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-[color:var(--vt-border)]">
                            <button type="button" onClick={() => changeQty(line.key, -1)} aria-label="Decrease" className="flex h-9 w-9 items-center justify-center">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm">{line.qty}</span>
                            <button type="button" onClick={() => changeQty(line.key, 1)} aria-label="Increase" className="flex h-9 w-9 items-center justify-center">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-sm text-[color:var(--vt-accent)]">{formatAUD(line.unitPrice * line.qty)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="max-h-[58dvh] space-y-1 overflow-y-auto border-t border-[color:var(--vt-border)] px-5 py-4 text-sm">
                  {!isTableMode && (
                    <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-[color:var(--vt-line)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2.5 text-xs">
                      <span className="flex items-center gap-2 text-[color:var(--vt-text)]">
                        {fulfilment.when === 'scheduled' ? <CalendarClock className="h-4 w-4 text-[color:var(--vt-accent)]" /> : <Clock className="h-4 w-4 text-[color:var(--vt-accent)]" />}
                        {orderType === 'delivery' ? 'Delivery' : 'Pick up'} · {whenLine}
                      </span>
                      <button type="button" onClick={goChooseTime} className="font-semibold text-[color:var(--vt-accent)] hover:underline">
                        Change
                      </button>
                    </div>
                  )}
                  {remainingForFree > 0 && (
                    <div className="mb-2 flex items-start gap-2 rounded-xl bg-[color:var(--vt-accent-soft)] px-3 py-2 text-xs text-[color:var(--vt-ivory)]">
                      <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--vt-accent)]" />
                      <span>
                        Add <b>{formatAUD(remainingForFree)}</b> more for free delivery — orders over {formatAUD(cfg.free_delivery_threshold)} are free. Great for groups!
                      </span>
                    </div>
                  )}
                  {orderType === 'delivery' && !isTableMode && remainingForFree === 0 && (
                    <div className="mb-2 rounded-xl bg-[color:rgba(34,197,94,0.1)] px-3 py-2 text-xs text-[color:var(--vt-leaf)]">
                      Free delivery unlocked for your group order.
                    </div>
                  )}
                  <div className="flex justify-between text-[color:var(--vt-muted)]">
                    <span>Subtotal</span>
                    <span>{formatAUD(subtotal)}</span>
                  </div>
                  {tax > 0 && (
                    <div className="flex justify-between text-[color:var(--vt-muted)]">
                      <span>GST</span>
                      <span>{formatAUD(tax)}</span>
                    </div>
                  )}
                  {!isTableMode && orderType === 'delivery' && (
                    <div className="flex justify-between text-[color:var(--vt-muted)]">
                      <span>Delivery</span>
                      <span>{fee === 0 ? 'Free' : formatAUD(fee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatAUD(total)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('details')}
                    className="mt-3 w-full rounded-full bg-gradient-to-r from-[#ff7a52] to-[color:var(--vt-accent)] py-4 text-sm font-semibold text-white hover:brightness-110"
                  >
                    {isTableMode ? 'Add to table order' : 'Continue to checkout'}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {step === 'details' && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {errorMsg && (
                <div className="rounded-xl border border-[color:rgba(239,68,68,0.3)] bg-[color:rgba(239,68,68,0.08)] px-4 py-3 text-sm text-[color:var(--vt-chili)]">
                  {errorMsg}
                  {timeError && !isTableMode && (
                    <button type="button" onClick={goChooseTime} className="mt-2 block font-semibold underline">
                      Choose a different time
                    </button>
                  )}
                </div>
              )}
              {isTableMode ? (
                <p className="text-sm text-[color:var(--vt-muted)] leading-relaxed">
                  Your items will be sent to the kitchen for Table {table!.table_number}.
                  {existingOrderId ? ' They will be added to your existing order.' : ''}
                </p>
              ) : (
                <>
                  <div className="rounded-xl border border-[color:var(--vt-line)] bg-[color:rgba(255,255,255,0.02)] px-4 py-3 text-xs text-[color:var(--vt-muted)]">
                    <b className="text-[color:var(--vt-text)]">{orderType === 'delivery' ? 'Delivery' : 'Pick up'}</b> · {whenLine}
                  </div>
                  <label className="block">
                    <span className="text-[13px] text-[color:var(--vt-muted)]">Name *</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={INPUT_CLS} />
                  </label>
                  <label className="block">
                    <span className="text-[13px] text-[color:var(--vt-muted)]">Phone *</span>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="04.. or +61 .." type="tel" className={INPUT_CLS} />
                  </label>
                  <label className="block">
                    <span className="text-[13px] text-[color:var(--vt-muted)]">Email (optional — earn loyalty points)</span>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" type="email" className={INPUT_CLS} />
                  </label>
                  {orderType === 'delivery' && (
                    <label className="block">
                      <span className="text-[13px] text-[color:var(--vt-muted)]">Delivery address *</span>
                      <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, suburb, postcode" className={INPUT_CLS} />
                    </label>
                  )}
                  <div>
                    <span className="text-[13px] text-[color:var(--vt-muted)]">
                      Pay on {orderType === 'delivery' ? 'delivery' : 'pick up'}
                    </span>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {(['CARD', 'CASH'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`rounded-xl border px-2 py-3 text-xs font-semibold ${
                            paymentMethod === m
                              ? 'border-[color:var(--vt-accent)] bg-[color:var(--vt-accent-soft)] text-[color:var(--vt-ivory)]'
                              : 'border-[color:var(--vt-border)]'
                          }`}
                        >
                          {m === 'CARD' ? 'Card' : 'Cash'}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--vt-muted)]">
                      No payment is taken online — you pay when your order arrives or when you collect it.
                    </p>
                  </div>
                </>
              )}
              <label className="block">
                <span className="text-[13px] text-[color:var(--vt-muted)]">Notes (optional)</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Allergies, spice level, extra requests…"
                  rows={3}
                  className={INPUT_CLS}
                />
              </label>
            </div>
            <div className="border-t border-[color:var(--vt-border)] px-5 py-4">
              <div className="flex justify-between font-semibold text-sm mb-3">
                <span>Total</span>
                <span>{formatAUD(total)}</span>
              </div>
              <button
                type="button"
                disabled={isSubmitting || cart.length === 0}
                onClick={submitOrder}
                className="w-full rounded-full bg-gradient-to-r from-[#ff7a52] to-[color:var(--vt-accent)] py-4 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isTableMode
                  ? existingOrderId
                    ? 'Add to order'
                    : 'Send to kitchen'
                  : fulfilment.when === 'scheduled'
                    ? 'Place pre-order'
                    : 'Place order'}
              </button>
              <button
                type="button"
                onClick={() => setStep('cart')}
                className="mt-2 w-full py-2 text-xs text-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)]"
              >
                Back to cart
              </button>
            </div>
          </>
        )}

        {step === 'success' && placed && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-[color:var(--vt-leaf)]" />
            <div className="text-xl font-semibold">
              {isTableMode ? (existingOrderId ? 'Added to your order' : 'Sent to the kitchen') : placed.scheduledFor ? 'Pre-order placed' : 'Order placed'}
            </div>
            <div className="text-sm text-[color:var(--vt-muted)] leading-relaxed">
              {isTableMode
                ? `The kitchen has your items for Table ${table!.table_number}.`
                : placed.scheduledFor
                  ? `Thank you! Your order is booked for ${formatScheduled(placed.scheduledFor, cfg.timezone)}. We may call to confirm.`
                  : 'Thank you! We have your order and will start cooking. We may call to confirm.'}
            </div>
            {!isTableMode && (
              <div className="rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.03)] px-4 py-2 text-xs text-[color:var(--vt-muted)]">
                Total to pay {orderType === 'delivery' ? 'on delivery' : 'on pick up'} · <span className="font-semibold text-[color:var(--vt-text)]">{formatAUD(placed.total)}</span>
              </div>
            )}
            <div className="rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.03)] px-4 py-2 text-xs text-[color:var(--vt-muted)]">
              Order code · <span className="text-[color:var(--vt-accent)] font-mono">{placed.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <button
              type="button"
              onClick={close}
              className="mt-2 rounded-full bg-gradient-to-r from-[#ff7a52] to-[color:var(--vt-accent)] px-8 py-3 text-sm font-semibold text-white hover:brightness-110"
            >
              Done
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
