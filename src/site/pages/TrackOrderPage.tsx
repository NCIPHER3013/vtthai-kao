import { createFileRoute } from '~/lib/router'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from 'convex/_generated/api'
import { cvq } from '~/lib/convex-helpers'
import { MenuImage } from '~/components/MenuImage'
import { SkeletonBox } from '~/components/Skeleton'

export const Route = createFileRoute('/track-order')({
  component: TrackOrderPage,
})

const STATUS_FLOW = ['pending', 'confirmed', 'cooking', 'ready'] as const

const STATUS_LABELS: Record<string, string | undefined> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cooking: 'Cooking',
  ready: 'Ready',
  cancelled: 'Cancelled',
}

const STATUS_COLORS: Record<string, string | undefined> = {
  pending: 'text-yellow-400 bg-yellow-400/10 ring-yellow-400/20',
  confirmed: 'text-blue-400 bg-blue-400/10 ring-blue-400/20',
  cooking: 'text-orange-400 bg-orange-400/10 ring-orange-400/20',
  ready: 'text-green-400 bg-green-400/10 ring-green-400/20',
  cancelled: 'text-red-400 bg-red-400/10 ring-red-400/20',
}

const STATUS_ICONS: Record<string, string> = {
  pending: '⏳',
  confirmed: '✓',
  cooking: '🍳',
  ready: '🎉',
  cancelled: '✕',
}

function TrackOrderPage() {
  const [phone, setPhone] = React.useState('')
  const [searchPhone, setSearchPhone] = React.useState('')
  const [searched, setSearched] = React.useState(false)

  const result = useQuery(
    cvq(api.siteOrders.trackByPhone, { phone: searchPhone }),
  ) as { data: Array<any> | undefined }
  const orders = result.data
  const isLoading = orders === undefined

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (phone.trim()) {
      setSearchPhone(phone.trim())
      setSearched(true)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 md:py-12">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
        Track Order
      </h1>
      <div className="mt-2 text-sm text-[color:var(--vt-muted)]">
        Enter the phone number you used when placing your order
      </div>

      <form onSubmit={handleSearch} className="mt-6 flex gap-3">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number (+61…)"
          className="flex-1 rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:rgba(255,246,233,0.18)]"
        />
        <button
          type="submit"
          disabled={!phone.trim()}
          className="rounded-xl bg-[color:var(--vt-ivory)] px-6 py-3 text-sm font-semibold text-black hover:bg-white disabled:opacity-40"
        >
          Search
        </button>
      </form>

      {isLoading && searched && (
        <div className="mt-8 space-y-4">
          <SkeletonBox className="h-4 w-32 rounded" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <SkeletonBox className="h-4 w-40 rounded" />
                  <SkeletonBox className="h-3 w-32 rounded" />
                </div>
                <SkeletonBox className="h-6 w-20 rounded-full" />
              </div>
              <div className="mt-4 flex items-center gap-2">
                {[1, 2, 3, 4].map((s) => (
                  <React.Fragment key={s}>
                    <SkeletonBox className="h-7 w-7 rounded-full" />
                    {s < 4 && (
                      <SkeletonBox className="h-[2px] flex-1 rounded" />
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {[1, 2].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <SkeletonBox className="h-9 w-9 rounded-lg" />
                    <SkeletonBox className="h-4 flex-1 rounded" />
                    <SkeletonBox className="h-4 w-8 rounded" />
                    <SkeletonBox className="h-4 w-14 rounded" />
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-[color:var(--vt-border)] pt-3 space-y-2">
                <SkeletonBox className="h-4 w-48 rounded" />
                <SkeletonBox className="h-5 w-24 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && searched && orders.length === 0 && (
        <div className="mt-8 rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] p-6 text-center">
          <div className="text-3xl mb-3">🔍</div>
          <div className="text-sm text-[color:var(--vt-muted)]">
            No orders found for this phone number
          </div>
        </div>
      )}

      {!isLoading && orders.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="text-sm text-[color:var(--vt-muted)]">
            Found {orders.length} order{orders.length > 1 ? 's' : ''}
          </div>
          {orders.map((order) => (
            <OrderCard key={order._id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order }: { order: any }) {
  const currentStep = STATUS_FLOW.indexOf(
    order.status as (typeof STATUS_FLOW)[number],
  )
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">
            {STATUS_ICONS[order.status]}{' '}
            {order.orderType === 'delivery' ? 'Delivery' : 'Takeaway'} Order
          </div>
          <div className="mt-1 text-xs text-[color:var(--vt-muted)]">
            {order.customerName} • {order.customerPhone}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${STATUS_COLORS[order.status] ?? ''}`}
        >
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      {!isCancelled && (
        <div className="mt-4">
          <div className="flex items-center gap-2">
            {STATUS_FLOW.map((step, i) => {
              const isCompleted = i <= currentStep
              const isCurrent = i === currentStep
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] ${
                        isCompleted
                          ? 'bg-[color:var(--vt-ivory)] text-black'
                          : 'bg-[color:rgba(255,255,255,0.06)] text-[color:var(--vt-muted)]'
                      } ${isCurrent ? 'ring-2 ring-[color:var(--vt-ivory)] ring-offset-1 ring-offset-[color:var(--vt-surface)]' : ''}`}
                    >
                      {i + 1}
                    </div>
                    <div
                      className={`mt-1 text-[10px] ${isCompleted ? 'text-[color:var(--vt-text)]' : 'text-[color:var(--vt-muted)]'}`}
                    >
                      {STATUS_LABELS[step]}
                    </div>
                  </div>
                  {i < STATUS_FLOW.length - 1 && (
                    <div
                      className={`h-[2px] flex-1 mt-[-14px] ${
                        i < currentStep
                          ? 'bg-[color:var(--vt-ivory)]'
                          : 'bg-[color:rgba(255,255,255,0.06)]'
                      }`}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {order.items.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg border border-[color:rgba(255,255,255,0.08)] bg-black/20">
              <MenuImage
                title={item.title}
                fallbackSize="square_hd"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate">{item.title}</div>
              {item.notes && (
                <div className="text-xs text-[color:var(--vt-muted)] truncate">
                  {item.notes}
                </div>
              )}
            </div>
            <div className="text-xs text-[color:var(--vt-muted)]">
              x{item.quantity}
            </div>
            <div className="text-sm text-[color:var(--vt-ivory)]">
              ${(item.priceAud * item.quantity).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {order.deliveryAddress && (
        <div className="mt-3 text-xs text-[color:var(--vt-muted)]">
          📍 {order.deliveryAddress}
        </div>
      )}

      {order.notes && (
        <div className="mt-2 text-xs text-[color:var(--vt-muted)]">
          📝 {order.notes}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-[color:var(--vt-border)] pt-3 space-y-2">
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="text-xs text-[color:var(--vt-muted)]">Subtotal</div>
            <div className="text-sm font-medium text-[color:var(--vt-text)]">
              ${(order.subtotalAud ?? order.totalAud).toFixed(2)}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="text-xs text-[color:var(--vt-muted)]">
              Tax (10%)
            </div>
            <div className="text-sm font-medium text-[color:var(--vt-text)]">
              ${(order.taxAud ?? 0).toFixed(2)}
            </div>
          </div>
          <div className="border-t border-[color:var(--vt-border)] pt-2 flex items-center justify-between text-sm">
            <div className="text-xs text-[color:var(--vt-muted)]">Total</div>
            <div className="text-lg font-semibold text-[color:var(--vt-ivory)]">
              ${order.totalAud.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
