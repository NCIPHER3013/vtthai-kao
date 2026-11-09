import * as React from 'react'
import { api } from 'convex/_generated/api'
import { useMutation } from 'convex/react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '~/lib/router'
import { MenuImage } from './MenuImage'
import { cvq } from '~/lib/convex-helpers'
import { useCart } from '~/lib/cart'

function CartItemThumb({
  title,
  imageStorageId,
}: {
  title: string
  imageStorageId?: string
}) {
  if (imageStorageId) {
    return (
      <CartItemThumbWithStorage title={title} imageStorageId={imageStorageId} />
    )
  }
  return (
    <MenuImage
      title={title}
      fallbackSize="square_hd"
      className="h-full w-full object-cover"
    />
  )
}

function CartItemThumbWithStorage({
  title,
  imageStorageId,
}: {
  title: string
  imageStorageId: string
}) {
  const { data: storageImageUrl } = useQuery(
    cvq(api.menus.getImageUrl, { storageId: imageStorageId }),
  ) as any

  const url = typeof storageImageUrl === 'string' ? storageImageUrl : null

  return (
    <MenuImage
      title={title}
      fallbackSize="square_hd"
      className="h-full w-full object-cover"
      storageImageUrl={url}
    />
  )
}

const ORDER_ERRORS: Record<string, string> = {
  STORE_CLOSED: 'The store is closed right now. Please try again during opening hours.',
  ONLINE_ORDERING_DISABLED: 'Online ordering is currently unavailable.',
  INVALID_NAME: 'Please enter your name.',
  INVALID_PHONE: 'Please enter a valid phone number.',
  INVALID_ADDRESS: 'Please enter a full delivery address.',
  INVALID_ITEMS: 'Your cart is empty or has too many items.',
  INVALID_QUANTITY: 'One of the quantities is not valid.',
  LUNCH_PREORDER_ONLY: 'Lunch items must be pre-ordered for a later time.',
  LUNCH_DISABLED: 'Lunch pre-orders are currently unavailable.',
  LUNCH_SLOT_INVALID: 'Please choose a valid lunch time.',
  SLOT_TOO_SOON: 'That time is too soon. Please choose a later time.',
  SLOT_TOO_FAR: 'That time is too far ahead.',
  SLOT_OUTSIDE_HOURS: 'That time is outside opening hours.',
  PRODUCT_UNAVAILABLE: 'One of the items is no longer available.',
  INSUFFICIENT_STOCK: 'Sorry, one of the items just sold out.',
}

function orderErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  const m = msg.match(/Uncaught Error: ([A-Z_]+)/) || msg.match(/([A-Z]{2,}(?:_[A-Z]+)+)/)
  const code = m?.[1]
  return (code && ORDER_ERRORS[code]) || 'Sorry, we could not place your order. Please try again.'
}

export function CartDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { state, dispatch, totalItems, totalAud } = useCart()
  const submitOrder = useMutation(api.posOrders.placeOnlineOrder)
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleSubmit = async () => {
    if (
      !state.customerName.trim() ||
      !state.customerPhone.trim() ||
      state.items.length === 0
    )
      return

    setSubmitting(true)
    setError(null)
    try {
      // New system: the order lands in POS/KDS and stock is deducted server-side.
      // The server re-prices every line; the old dine-in mode is sent as takeaway.
      await submitOrder({
        p: {
          order_id: crypto.randomUUID(),
          order_type: state.orderType === 'delivery' ? 'delivery' : 'takeaway',
          customer_name: state.customerName.trim(),
          phone: state.customerPhone.trim(),
          address:
            state.orderType === 'delivery'
              ? state.deliveryAddress.trim()
              : undefined,
          note: state.notes.trim() || undefined,
          payment_method: 'CASH',
          items: state.items.map((i) => ({
            product_id: i.menuId,
            quantity: i.quantity,
            note: i.notes || undefined,
            modifiers: i.variantLabel ? [`Package: ${i.variantLabel}`] : [],
          })),
        },
      })
      setSubmitted(true)
      dispatch({ type: 'clearCart' })
    } catch (err) {
      console.error('Failed to submit order:', err)
      setError(orderErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[100] transition-opacity duration-300 ${
        open
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      <div
        className={`absolute inset-y-0 right-0 w-full max-w-md bg-[color:var(--vt-bg)] border-l border-[color:var(--vt-border)] flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--vt-border)]">
          <div className="text-lg font-semibold">
            Order ({totalItems} {totalItems === 1 ? 'item' : 'items'})
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-sm text-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)] hover:bg-[color:rgba(255,255,255,0.06)]"
          >
            Close
          </button>
        </div>

        {submitted ? (
          <div className="flex-1 flex flex-col items-center justify-center px-5 gap-4">
            <div className="text-4xl">✓</div>
            <div className="text-lg font-semibold">Order submitted!</div>
            <div className="text-sm text-[color:var(--vt-muted)] text-center">
              We'll call to confirm your order and share payment details.
            </div>
            <Link
              to="/track-order"
              search={{}}
              onClick={() => {
                setSubmitted(false)
                onClose()
              }}
              className="mt-2 rounded-xl bg-[color:rgba(255,255,255,0.06)] px-5 py-2 text-sm ring-1 ring-[color:var(--vt-border)] hover:bg-[color:rgba(255,255,255,0.1)]"
            >
              Track your order
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false)
                onClose()
              }}
              className="rounded-xl bg-[color:var(--vt-ivory)] px-5 py-2 text-sm text-black hover:bg-white"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {state.items.length === 0 ? (
                <div className="text-center text-[color:var(--vt-muted)] py-12">
                  Cart is empty
                </div>
              ) : (
                state.items.map((item, idx) => (
                  <div
                    key={`${item.menuId}-${item.variantLabel ?? ''}-${idx}`}
                    className="rounded-xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-[color:rgba(255,255,255,0.08)] bg-black/20">
                        <CartItemThumb
                          title={item.title}
                          imageStorageId={item.imageStorageId}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">
                          {item.title}
                        </div>
                        {item.variantLabel && (
                          <div className="mt-0.5 text-xs text-[color:var(--vt-muted)]">
                            {item.variantLabel}
                          </div>
                        )}
                        <div className="mt-1 text-sm text-[color:var(--vt-ivory)]">
                          ${item.priceAud.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            dispatch({
                              type: 'updateQuantity',
                              menuId: item.menuId,
                              quantity: item.quantity - 1,
                              variantLabel: item.variantLabel,
                              orderMode: item.orderMode,
                            })
                          }
                          className="w-7 h-7 rounded-lg border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] flex items-center justify-center text-sm hover:bg-[color:rgba(255,255,255,0.06)]"
                        >
                          −
                        </button>
                        <span className="text-sm w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            dispatch({
                              type: 'updateQuantity',
                              menuId: item.menuId,
                              quantity: item.quantity + 1,
                              variantLabel: item.variantLabel,
                              orderMode: item.orderMode,
                            })
                          }
                          className="w-7 h-7 rounded-lg border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] flex items-center justify-center text-sm hover:bg-[color:rgba(255,255,255,0.06)]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <input
                        value={item.notes ?? ''}
                        onChange={(e) =>
                          dispatch({
                            type: 'updateNotes',
                            menuId: item.menuId,
                            notes: e.target.value,
                            variantLabel: item.variantLabel,
                            orderMode: item.orderMode,
                          })
                        }
                        placeholder="Notes (e.g. no chili)"
                        className="flex-1 rounded-lg border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[color:rgba(255,246,233,0.18)]"
                      />
                      <div className="ml-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            dispatch({
                              type: 'removeItem',
                              menuId: item.menuId,
                              variantLabel: item.variantLabel,
                              orderMode: item.orderMode,
                            })
                          }
                          className="w-7 h-7 rounded-lg border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] flex items-center justify-center text-sm text-[color:rgba(239,68,68,0.7)] hover:bg-[color:rgba(239,68,68,0.12)] hover:text-[color:rgba(239,68,68,0.9)]"
                          aria-label="Remove item"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                        <div className="text-sm font-semibold text-[color:var(--vt-ivory)]">
                          ${(item.priceAud * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}

              <div className="space-y-3 pt-2">
                <div className="text-xs text-[color:var(--vt-muted)]">
                  Order type
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: 'setOrderType', orderType: 'takeaway' })
                    }
                    className={
                      state.orderType === 'takeaway'
                        ? 'flex-1 rounded-xl bg-[color:rgba(255,255,255,0.06)] px-3 py-2 text-sm ring-1 ring-[color:var(--vt-ivory)] text-[color:var(--vt-ivory)]'
                        : 'flex-1 rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2 text-sm text-[color:var(--vt-muted)]'
                    }
                  >
                    Takeaway
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: 'setOrderType', orderType: 'dineIn' })
                    }
                    className={
                      state.orderType === 'dineIn'
                        ? 'flex-1 rounded-xl bg-[color:rgba(255,255,255,0.06)] px-3 py-2 text-sm ring-1 ring-[color:var(--vt-ivory)] text-[color:var(--vt-ivory)]'
                        : 'flex-1 rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2 text-sm text-[color:var(--vt-muted)]'
                    }
                  >
                    Dine-in
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: 'setOrderType', orderType: 'delivery' })
                    }
                    className={
                      state.orderType === 'delivery'
                        ? 'flex-1 rounded-xl bg-[color:rgba(255,255,255,0.06)] px-3 py-2 text-sm ring-1 ring-[color:var(--vt-ivory)] text-[color:var(--vt-ivory)]'
                        : 'flex-1 rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2 text-sm text-[color:var(--vt-muted)]'
                    }
                  >
                    Delivery
                  </button>
                </div>
              </div>

              {state.orderType === 'delivery' && (
                <input
                  value={state.deliveryAddress}
                  onChange={(e) =>
                    dispatch({
                      type: 'setDeliveryAddress',
                      address: e.target.value,
                    })
                  }
                  placeholder="Delivery address"
                  className="w-full rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:rgba(255,246,233,0.18)]"
                />
              )}

              <input
                value={state.customerName}
                onChange={(e) =>
                  dispatch({ type: 'setCustomerName', name: e.target.value })
                }
                placeholder="Your name *"
                className="w-full rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:rgba(255,246,233,0.18)]"
              />
              <input
                value={state.customerPhone}
                onChange={(e) =>
                  dispatch({
                    type: 'setCustomerPhone',
                    phone: e.target.value,
                  })
                }
                placeholder="Phone number (+61…) *"
                className="w-full rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:rgba(255,246,233,0.18)]"
              />
              <textarea
                value={state.notes}
                onChange={(e) =>
                  dispatch({ type: 'setNotes', notes: e.target.value })
                }
                placeholder="Additional notes (optional)"
                className="w-full rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:rgba(255,246,233,0.18)] min-h-[60px]"
              />
            </div>

            <div className="border-t border-[color:var(--vt-border)] px-5 py-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="text-[color:var(--vt-muted)]">Subtotal</div>
                <div className="font-medium text-[color:var(--vt-text)]">
                  ${totalAud.toFixed(2)}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="text-[color:var(--vt-muted)]">Tax (10%)</div>
                <div className="font-medium text-[color:var(--vt-text)]">
                  ${(Math.round(totalAud * 0.1 * 100) / 100).toFixed(2)}
                </div>
              </div>
              <div className="border-t border-[color:var(--vt-border)] pt-2 flex items-center justify-between text-sm">
                <div className="text-[color:var(--vt-muted)]">Total</div>
                <div className="text-lg font-semibold text-[color:var(--vt-ivory)]">
                  $
                  {(
                    Math.round(
                      (totalAud + Math.round(totalAud * 0.1 * 100) / 100) * 100,
                    ) / 100
                  ).toFixed(2)}
                </div>
              </div>
              {error && (
                <div className="rounded-lg bg-[color:rgba(239,68,68,0.12)] px-3 py-2 text-xs text-[color:var(--vt-chili)]">
                  {error}
                </div>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  !state.customerName.trim() ||
                  !state.customerPhone.trim() ||
                  state.items.length === 0
                }
                className="w-full rounded-xl bg-[color:var(--vt-ivory)] px-4 py-3 text-sm text-black hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : 'Place order'}
              </button>
              <div className="text-xs text-[color:var(--vt-muted)] text-center">
                We'll call to confirm your order and share payment details.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
