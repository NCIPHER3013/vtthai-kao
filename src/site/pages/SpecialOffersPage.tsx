import { Link, createFileRoute } from '~/lib/router'
import { useQuery } from '@tanstack/react-query'
import { api } from 'convex/_generated/api'
import { cvq } from '~/lib/convex-helpers'
import { MenuImage } from '~/components/MenuImage'
import { useCart } from '~/lib/cart'
import { SkeletonOfferCard, SkeletonPageHeader } from '~/components/Skeleton'

export const Route = createFileRoute('/special-offers')({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(cvq(api.promotions.listActive, {}))
  },
  component: SpecialOffersPage,
})

function SpecialOffersPage() {
  const { dispatch } = useCart()
  const { data: promotions } = useQuery(cvq(api.promotions.listActive, {})) as {
    data: Array<any> | undefined
  }

  if (!promotions) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-12">
        <SkeletonPageHeader />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonOfferCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-col gap-3">
        <div className="text-sm text-[color:var(--vt-muted)]">Weekly drops</div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Special Offers
        </h1>
        <div className="text-[color:var(--vt-muted)] max-w-2xl">
          Limited-time deals updated weekly — prices in AUD
        </div>
      </div>

      {promotions.length === 0 && (
        <div className="mt-16 rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] p-10 text-center">
          <div className="text-lg font-semibold">No offers this week</div>
          <div className="mt-2 text-sm text-[color:var(--vt-muted)]">
            Check back soon — new deals drop every week.
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {promotions.map((promo) => (
          <OfferCard
            key={promo._id}
            badge={promo.badge}
            title={promo.title}
            body={promo.description ?? null}
            price={promo.priceAud ? '$' + promo.priceAud.toFixed(2) : null}
            storageImageUrl={promo.storageImageUrl ?? null}
            onAddToCart={() => {
              if (!promo.priceAud) return
              dispatch({
                type: 'addItem',
                item: {
                  menuId: promo._id,
                  title: promo.title,
                  priceAud: promo.priceAud,
                  quantity: 1,
                  imageStorageId: promo.imageStorageId,
                },
              })
            }}
          />
        ))}
      </div>

      <div className="mt-10">
        <Link
          to="/menu"
          search={{}}
          className="inline-flex items-center gap-2 rounded-xl bg-[color:rgba(255,255,255,0.06)] px-4 py-2 text-sm ring-1 ring-[color:var(--vt-border)] hover:bg-[color:rgba(255,255,255,0.1)]"
        >
          View full menu
        </Link>
      </div>
    </div>
  )
}

function OfferCard({
  badge,
  title,
  body,
  price,
  storageImageUrl,
  onAddToCart,
}: {
  badge: string
  title: string
  body: string | null
  price: string | null
  storageImageUrl: string | null
  onAddToCart: () => void
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)]">
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(420px_circle_at_20%_20%,rgba(239,68,68,0.14),transparent_55%),radial-gradient(420px_circle_at_90%_80%,rgba(34,197,94,0.12),transparent_55%)]" />
      <div className="relative overflow-hidden">
        <MenuImage
          title={title}
          fallbackSize="landscape_16_9"
          storageImageUrl={storageImageUrl}
          className="aspect-[16/10] w-full object-cover opacity-95 group-hover:opacity-100 transition-opacity"
        />
        <div className="absolute left-3 top-3">
          <span className="rounded-full bg-[color:rgba(0,0,0,0.6)] backdrop-blur-sm px-3 py-1 text-[11px] font-medium text-[color:var(--vt-ivory)] ring-1 ring-[color:rgba(255,255,255,0.14)]">
            {badge}
          </span>
        </div>
        {price && (
          <div className="absolute right-3 bottom-3">
            <span className="rounded-full bg-[color:rgba(0,0,0,0.6)] backdrop-blur-sm px-3 py-1.5 text-sm font-semibold text-[color:var(--vt-ivory)] ring-1 ring-[color:rgba(255,255,255,0.14)]">
              {price}
            </span>
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="text-lg font-semibold">{title}</div>
        {body && (
          <div className="mt-1.5 text-sm text-[color:var(--vt-muted)] leading-relaxed">
            {body}
          </div>
        )}
        {price && (
          <button
            type="button"
            onClick={onAddToCart}
            className="mt-4 w-full rounded-xl bg-[color:rgba(255,255,255,0.06)] px-4 py-2 text-xs ring-1 ring-[color:var(--vt-border)] hover:bg-[color:rgba(255,255,255,0.10)]"
          >
            Add to cart
          </button>
        )}
      </div>
    </div>
  )
}
