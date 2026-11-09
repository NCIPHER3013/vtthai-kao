import { Link, createFileRoute } from '~/lib/router'
import { useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { api } from 'convex/_generated/api'
import { cvq } from '~/lib/convex-helpers'
import { useCart } from '~/lib/cart'
import { MenuImage } from '~/components/MenuImage'
import { MenuDetailModal } from '~/components/MenuDetailModal'
import {
  SkeletonBox,
  SkeletonMenuItem,
  SkeletonPageHeader,
} from '~/components/Skeleton'

type OrderMode = 'takeaway' | 'dineIn' | 'delivery'

const MODE_LABELS: Record<OrderMode, string> = {
  takeaway: 'Takeaway',
  dineIn: 'Dine-in',
  delivery: 'Delivery',
}

export const Route = createFileRoute('/menu')({
  validateSearch: (search: Record<string, unknown>) => {
    const out: { mode?: OrderMode; category?: string } = {}

    if (
      typeof search.mode === 'string' &&
      ['takeaway', 'dineIn', 'delivery'].includes(search.mode)
    ) {
      out.mode = search.mode as OrderMode
    }
    if (typeof search.category === 'string') {
      out.category = search.category
    }
    return out
  },
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(cvq(api.menus.listAll, {})),
      queryClient.ensureQueryData(cvq(api.menuCategories.listAll, {})),
    ])
  },
  component: MenuPage,
})

function aud(n: number) {
  return `$${n.toFixed(2)}`
}

function getPriceByMode(item: any, mode: OrderMode): number | undefined {
  if (item.prices) {
    return item.prices[mode]
  }
  // Fallback for old data that still has priceAud
  if (item.priceAud != null) {
    return item.priceAud
  }
  return undefined
}

function getMinPriceByMode(item: any, mode: OrderMode): number | undefined {
  if (item.variants && item.variants.length > 0) {
    const prices = item.variants
      .map((v: any) => v.prices?.[mode] ?? v.priceAud)
      .filter((p: any) => p != null)
    return prices.length > 0 ? Math.min(...prices) : undefined
  }
  return getPriceByMode(item, mode)
}

function MenuPage() {
  const { mode: searchMode, category } = Route.useSearch()
  const [query, setQuery] = React.useState('')
  const { dispatch } = useCart()
  const [selectedItem, setSelectedItem] = React.useState<any>(null)

  const activeMode = searchMode ?? 'takeaway'

  const { data: menuItems } = useQuery(cvq(api.menus.listAll, {})) as {
    data: Array<any> | undefined
  }

  const { data: categories } = useQuery(
    cvq(api.menuCategories.listAll, {}),
  ) as { data: Array<{ name: string; sortOrder: number }> | undefined }

  const categoryNames = React.useMemo(
    () => (categories ?? []).map((c) => c.name),
    [categories],
  )

  const allCategories = React.useMemo(
    () => ['All', ...categoryNames],
    [categoryNames],
  )

  const activeCategory =
    typeof category === 'string' && allCategories.includes(category)
      ? category
      : 'All'

  const q = query.trim()

  const displayed = React.useMemo(() => {
    if (!menuItems) return []
    if (q) {
      const lower = q.toLowerCase()
      return menuItems.filter((item) => {
        const title = (item.title || '').toLowerCase()
        const desc = (item.description || '').toLowerCase()
        const tags = (item.tags || []).join(' ').toLowerCase()
        return (
          title.includes(lower) || desc.includes(lower) || tags.includes(lower)
        )
      })
    }
    if (activeCategory === 'All') return menuItems
    return menuItems.filter((i) => i.category === activeCategory)
  }, [q, menuItems, activeCategory])

  if (!menuItems || !categories) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10 md:py-12">
        <SkeletonPageHeader />
        <div className="mt-4 flex gap-3">
          <SkeletonBox className="h-12 flex-1 rounded-xl" />
          <SkeletonBox className="h-12 w-36 rounded-xl" />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBox key={i} className="h-9 w-16 rounded-full" />
          ))}
        </div>
        <div className="mt-6">
          <SkeletonBox className="h-4 w-64 rounded" />
        </div>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonMenuItem key={i} />
          ))}
        </div>
      </div>
    )
  }

  const handleAddToCart = (
    item: any,
    variantLabel?: string,
    variantPrice?: number,
  ) => {
    const hasVariants = item.variants && item.variants.length > 0
    const finalPrice = variantPrice ?? getPriceByMode(item, activeMode) ?? 0
    dispatch({
      type: 'addItem',
      item: {
        menuId: item._id,
        title:
          hasVariants && variantLabel
            ? `${item.title} (${variantLabel})`
            : item.title,
        priceAud: finalPrice,
        quantity: 1,
        imageStorageId: item.imageStorageId,
        variantLabel,
        orderMode: activeMode,
        prices: item.prices ?? undefined,
      },
    })
    setSelectedItem(null)
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-12">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-[color:var(--vt-muted)]">
            Currency: AUD
          </div>
          <div className="text-xs text-[color:var(--vt-muted)]">
            Mode: {MODE_LABELS[activeMode]}
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Menu
        </h1>

        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3 flex items-center text-[color:rgba(255,255,255,0.5)]">
              ⌕
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search menu, e.g. Pad Thai / Tom Yum / Mango Sticky Rice"
              className="w-full rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] py-3 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[color:rgba(255,246,233,0.18)]"
            />
          </div>
          <div className="flex gap-2">
            {(['takeaway', 'dineIn', 'delivery'] as Array<OrderMode>).map(
              (m) => (
                <Link
                  key={m}
                  to="/menu"
                  search={{ mode: m, ...(category ? { category } : {}) }}
                  className={`rounded-xl px-4 py-3 text-xs font-medium transition-colors ${
                    activeMode === m
                      ? 'bg-[color:var(--vt-ivory)] text-black'
                      : 'bg-[color:rgba(255,255,255,0.06)] ring-1 ring-[color:var(--vt-border)] text-[color:var(--vt-muted)] hover:bg-[color:rgba(255,255,255,0.1)]'
                  }`}
                >
                  {MODE_LABELS[m]}
                </Link>
              ),
            )}
          </div>
          <Link
            to="/special-offers"
            search={{}}
            className="inline-flex items-center justify-center rounded-xl bg-[color:rgba(255,255,255,0.06)] px-4 py-3 text-sm ring-1 ring-[color:var(--vt-border)] hover:bg-[color:rgba(255,255,255,0.1)]"
          >
            Special Offers
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {allCategories.map((c) => {
          const active = c === activeCategory
          const search =
            c === 'All'
              ? { mode: activeMode }
              : { mode: activeMode, category: c }
          return (
            <Link
              key={c}
              to="/menu"
              search={search}
              className={
                active
                  ? 'rounded-full bg-[color:var(--vt-ivory)] px-4 py-2 text-xs text-black'
                  : 'rounded-full border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] px-4 py-2 text-xs text-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)] hover:bg-[color:rgba(255,255,255,0.06)]'
              }
            >
              {c}
            </Link>
          )
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 text-sm text-[color:var(--vt-muted)]">
        <div>
          Showing {displayed.length} items
          {activeCategory !== 'All' ? ` • Category: ${activeCategory}` : ''}
          {q ? ` • Search: "${query.trim()}"` : ''}
        </div>
        <div className="hidden md:block">Tap an item for details</div>
      </div>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayed.map((item) => {
          const hasVariants = item.variants && item.variants.length > 0
          const minPrice = getMinPriceByMode(item, activeMode)
          const hasPrice = minPrice != null

          return (
            <article
              key={item._id}
              className="group overflow-hidden rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] cursor-pointer"
              onClick={() => setSelectedItem(item)}
            >
              <div className="relative">
                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(420px_circle_at_20%_20%,rgba(239,68,68,0.14),transparent_55%),radial-gradient(420px_circle_at_90%_80%,rgba(34,197,94,0.12),transparent_55%)]" />
                <div className="relative overflow-hidden">
                  <MenuImage
                    title={item.title}
                    fallbackSize="square_hd"
                    className="aspect-square w-full object-cover opacity-95 group-hover:opacity-100 transition-opacity"
                    storageImageUrl={item.storageImageUrl ?? null}
                  />
                </div>
                <div className="absolute left-3 top-3 flex items-center gap-2">
                  <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] text-[color:var(--vt-ivory)] ring-1 ring-[color:rgba(255,255,255,0.14)]">
                    {item.category}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{item.title}</div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-[color:var(--vt-ivory)]">
                    {hasPrice
                      ? hasVariants
                        ? `from ${aud(minPrice)}`
                        : aud(minPrice)
                      : ''}
                  </div>
                </div>

                {item.description ? (
                  <div className="mt-2 text-xs text-[color:var(--vt-muted)] line-clamp-2">
                    {item.description}
                  </div>
                ) : null}

                {item.tags?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.tags.map((t: string) => (
                      <span
                        key={t}
                        className="rounded-full border border-[color:rgba(255,255,255,0.10)] bg-[color:rgba(255,255,255,0.03)] px-3 py-1 text-[11px] text-[color:var(--vt-muted)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}

                {hasPrice ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (hasVariants) {
                        setSelectedItem(item)
                      } else {
                        handleAddToCart(item)
                      }
                    }}
                    className="mt-4 w-full rounded-xl bg-[color:rgba(255,255,255,0.06)] px-4 py-2 text-xs ring-1 ring-[color:var(--vt-border)] hover:bg-[color:rgba(255,255,255,0.10)]"
                  >
                    {hasVariants ? 'Choose option' : 'Add to cart'}
                  </button>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] p-6">
        <div className="text-sm font-semibold">Order note</div>
        <div className="mt-2 text-sm text-[color:var(--vt-muted)] leading-relaxed">
          After you place an order online, we'll call to confirm your items,
          pickup/delivery details, and payment info. Cooking starts once payment
          is confirmed.
        </div>
      </div>

      {selectedItem && (
        <MenuDetailModal
          item={selectedItem}
          open={true}
          orderMode={activeMode}
          onClose={() => setSelectedItem(null)}
          onAddToCart={(variantLabel?: string, variantPrice?: number) =>
            handleAddToCart(selectedItem, variantLabel, variantPrice)
          }
        />
      )}
    </div>
  )
}
