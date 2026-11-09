import { Link, createFileRoute } from '~/lib/router'
import { useQuery } from '@tanstack/react-query'
import { api } from 'convex/_generated/api'
import * as React from 'react'
import { cvq } from '~/lib/convex-helpers'
import { useCart } from '~/lib/cart'
import { MenuImage } from '~/components/MenuImage'
import { MenuDetailModal } from '~/components/MenuDetailModal'
import { SkeletonBox, SkeletonPickCard } from '~/components/Skeleton'

export const Route = createFileRoute('/')({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(cvq(api.menus.listFeaturedWithUrls, {})),
      queryClient.ensureQueryData(cvq(api.menus.listGalleryWithUrls, {})),
    ])
  },
  component: Home,
})

function Home() {
  const { dispatch } = useCart()
  const [selectedItem, setSelectedItem] = React.useState<any>(null)

  const { data: featuredItems } = useQuery(
    cvq(api.menus.listFeaturedWithUrls, {}),
  ) as { data: Array<any> | undefined }

  const { data: galleryItems } = useQuery(
    cvq(api.menus.listGalleryWithUrls, {}),
  ) as { data: Array<any> | undefined }

  const picks = featuredItems ? featuredItems.slice(0, 6) : []

  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_20%,rgba(239,68,68,0.18),transparent_58%),radial-gradient(900px_circle_at_85%_70%,rgba(34,197,94,0.14),transparent_60%),radial-gradient(700px_circle_at_35%_85%,rgba(255,246,233,0.08),transparent_60%)]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />

        <div className="mx-auto max-w-6xl px-5 pt-14 pb-10 md:pt-20 md:pb-16 relative">
          <div className="grid lg:grid-cols-[1.05fr,0.95fr] gap-10 items-center">
            <div className="vt-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full bg-[color:rgba(255,246,233,0.08)] px-4 py-2 text-xs text-[color:var(--vt-ivory)] ring-1 ring-[color:rgba(255,246,233,0.14)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--vt-chili)]" />
                We call to confirm every order before cooking
              </div>

              <h1 className="mt-6 text-4xl md:text-6xl font-semibold tracking-tight leading-[1.04]">
                Vermont Thai
                <span className="block text-[color:rgba(255,246,233,0.92)]">
                  Thai Cuisine, Dine In &amp; Take Away
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-[color:var(--vt-muted)] leading-relaxed">
                Bold, clean, luxurious Thai flavours — premium ingredients,
                beautiful plating. Dine in, takeaway, and delivery. All prices
                in AUD.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/menu"
                  search={{ mode: 'takeaway' }}
                  className="rounded-xl bg-[color:rgba(255,255,255,0.06)] px-5 py-3 text-sm ring-1 ring-[color:var(--vt-border)] hover:bg-[color:rgba(255,255,255,0.1)]"
                >
                  Takeaway
                </Link>
                <Link
                  to="/contact"
                  className="rounded-xl bg-[color:rgba(255,255,255,0.06)] px-5 py-3 text-sm ring-1 ring-[color:var(--vt-border)] hover:bg-[color:rgba(255,255,255,0.1)]"
                >
                  Book a table
                </Link>
                <Link
                  to="/menu"
                  search={{ mode: 'delivery' }}
                  className="rounded-xl bg-[color:var(--vt-ivory)] px-5 py-3 text-sm text-black hover:bg-white"
                >
                  Delivery
                </Link>
              </div>
            </div>

            <div className="relative vt-fade-up [animation-delay:120ms]">
              <div className="absolute -inset-8 bg-[radial-gradient(700px_circle_at_40%_30%,rgba(239,68,68,0.22),transparent_60%),radial-gradient(700px_circle_at_70%_75%,rgba(34,197,94,0.18),transparent_60%)] blur-2xl opacity-70" />
              <div className="relative overflow-hidden rounded-[26px] border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] aspect-[1000/563]">
                <img
                  src="/banner-_1__1.webp"
                  alt="Vermont Thai hero banner"
                  width={1000}
                  height={563}
                  className="relative w-full h-auto block opacity-95 aspect-[1000/563]"
                  loading="eager"
                />
              </div>
              <div className="mt-4 flex items-center gap-3 text-xs text-[color:var(--vt-muted)]">
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.03)] px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--vt-leaf)]" />
                  Fresh herbs
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.03)] px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--vt-chili)]" />
                  Authentic flavors
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.03)] px-3 py-2">
                  AUD pricing
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-sm text-[color:var(--vt-muted)]">
              Signature picks
            </div>
            <h2 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">
              Today's Picks
            </h2>
          </div>
          <Link
            to="/menu"
            search={{}}
            className="hidden md:inline-flex items-center gap-2 text-sm text-[color:var(--vt-ivory)] hover:text-white"
          >
            View full menu →
          </Link>
        </div>

        {!featuredItems ? (
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonPickCard key={i} />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {picks.map((item) => (
              <div
                key={item._id}
                className="group relative overflow-hidden rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)]"
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(500px_circle_at_20%_20%,rgba(239,68,68,0.16),transparent_55%),radial-gradient(500px_circle_at_90%_80%,rgba(34,197,94,0.1),transparent_55%)]" />
                <div className="relative grid grid-cols-[96px,1fr] gap-4 p-4">
                  <button
                    type="button"
                    className="aspect-square w-24 h-24 overflow-hidden rounded-xl border border-[color:rgba(255,255,255,0.08)] bg-black/20 cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    <MenuImage
                      title={item.title}
                      fallbackSize="square_hd"
                      className="h-full w-full object-cover"
                      storageImageUrl={item.storageImageUrl}
                    />
                  </button>
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="flex items-center justify-between gap-3 w-full text-left cursor-pointer"
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="truncate font-semibold">{item.title}</div>
                      <div className="text-sm text-[color:var(--vt-ivory)]">
                        $
                        {item.prices
                          ? item.prices.takeaway.toFixed(2)
                          : (item.priceAud?.toFixed(2) ?? '')}
                      </div>
                    </button>
                    <div className="mt-1 text-sm text-[color:var(--vt-muted)] truncate">
                      {item.description}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (item.variants && item.variants.length > 0) {
                          setSelectedItem(item)
                        } else {
                          dispatch({
                            type: 'addItem',
                            item: {
                              menuId: item._id,
                              title: item.title,
                              priceAud: item.prices?.takeaway ?? 0,
                              quantity: 1,
                              imageStorageId: item.imageStorageId,
                              orderMode: 'takeaway',
                              prices: item.prices ?? undefined,
                            },
                          })
                        }
                      }}
                      className="mt-3 w-full rounded-xl bg-[color:rgba(255,255,255,0.06)] px-4 py-2 text-xs ring-1 ring-[color:var(--vt-border)] hover:bg-[color:rgba(255,255,255,0.10)]"
                    >
                      {item.variants && item.variants.length > 0
                        ? 'Choose option'
                        : 'Add to cart'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-14">
        <div className="rounded-[28px] border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] overflow-hidden">
          <div className="px-6 pt-8 md:px-10 md:pt-10">
            <div className="text-sm text-[color:var(--vt-muted)]">
              Thai feast gallery
            </div>
            <h2 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">
              Thai Feast Gallery
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-[color:var(--vt-muted)] leading-relaxed">
              A curated selection of our finest dishes — crafted with passion,
              plated with pride.
            </p>
          </div>

          {!galleryItems ? (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-[color:rgba(255,255,255,0.06)]">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonBox key={i} className="aspect-[3/4] w-full" />
              ))}
            </div>
          ) : galleryItems.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-[color:rgba(255,255,255,0.06)]">
              {galleryItems.map((item) => (
                <button
                  type="button"
                  key={item._id}
                  className="aspect-[3/4] w-full bg-[color:var(--vt-bg)] overflow-hidden cursor-pointer group"
                  onClick={() => setSelectedItem(item)}
                >
                  <MenuImage
                    title={item.title}
                    fallbackSize="portrait_4_3"
                    className="aspect-[3/4] w-full object-cover opacity-95 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                    storageImageUrl={item.storageImageUrl}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid md:grid-cols-3 gap-4">
          <InfoCard
            title="Realtime order"
            body="Orders appear instantly in our kitchen system with sound alerts — no delays."
          />
          <InfoCard
            title="We call to confirm"
            body="We'll phone you to confirm items, pickup/delivery details, and payment info."
          />
          <InfoCard
            title="Start after paid"
            body="Cooking begins only after payment is confirmed — fewer errors, fresher food."
          />
        </div>
      </section>

      {selectedItem && (
        <MenuDetailModal
          item={selectedItem}
          open={!!selectedItem}
          orderMode="takeaway"
          onClose={() => setSelectedItem(null)}
          onAddToCart={(variantLabel?: string, variantPrice?: number) => {
            const hasVariants =
              selectedItem.variants && selectedItem.variants.length > 0
            const finalPrice =
              variantPrice ?? selectedItem.prices?.takeaway ?? 0
            dispatch({
              type: 'addItem',
              item: {
                menuId: selectedItem._id,
                title:
                  hasVariants && variantLabel
                    ? `${selectedItem.title} (${variantLabel})`
                    : selectedItem.title,
                priceAud: finalPrice,
                quantity: 1,
                imageStorageId: selectedItem.imageStorageId,
                variantLabel,
                orderMode: 'takeaway',
                prices: selectedItem.prices ?? undefined,
              },
            })
            setSelectedItem(null)
          }}
        />
      )}
    </main>
  )
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] p-6">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-2 text-sm text-[color:var(--vt-muted)] leading-relaxed">
        {body}
      </div>
    </div>
  )
}
