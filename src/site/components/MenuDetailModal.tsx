import * as React from 'react'
import { MenuImage } from '~/components/MenuImage'

type OrderMode = 'takeaway' | 'dineIn' | 'delivery'

type Prices = {
  takeaway: number
  dineIn: number
  delivery: number
}

type Variant = {
  label: string
  prices: Prices
}

type MenuItem = {
  _id: string
  title: string
  category: string
  prices?: Prices
  heat: string
  description?: string
  tags?: Array<string>
  imageStorageId?: string
  storageImageUrl?: string | null
  variants?: Array<Variant>
}

type MenuDetailModalProps = {
  item: MenuItem
  open: boolean
  orderMode: OrderMode
  onClose: () => void
  onAddToCart: (variantLabel?: string, variantPrice?: number) => void
}

const heatColors: Record<string, string> = {
  Mild: 'text-[color:var(--vt-leaf)]',
  Medium: 'text-yellow-400',
  Hot: 'text-[color:var(--vt-chili)]',
  Sweet: 'text-[color:var(--vt-ivory)]',
}

const heatIcons: Record<string, string> = {
  Hot: '🌶️',
  Medium: '🌶️',
  Sweet: '🍬',
  Mild: '🌿',
}

const MODE_LABELS: Record<OrderMode, string> = {
  takeaway: 'Takeaway',
  dineIn: 'Dine-in',
  delivery: 'Delivery',
}

function formatAud(n: number) {
  return '$' + n.toFixed(2)
}

export function MenuDetailModal({
  item,
  open,
  orderMode,
  onClose,
  onAddToCart,
}: MenuDetailModalProps) {
  const hasVariants = item.variants && item.variants.length > 0
  const [selectedVariant, setSelectedVariant] = React.useState<number>(0)

  React.useEffect(() => {
    if (open) {
      setSelectedVariant(0)
    }
  }, [open])

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

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      window.addEventListener('keydown', handleEsc)
    }
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  const currentPrice = hasVariants
    ? item.variants![selectedVariant].prices[orderMode]
    : (item.prices?.[orderMode] ?? 0)
  const currentVariantLabel = hasVariants
    ? item.variants![selectedVariant].label
    : undefined

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-[color:var(--vt-bg)] border-t border-[color:var(--vt-border)] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-lg md:w-full md:rounded-3xl md:border">
        <div className="relative">
          <MenuImage
            title={item.title}
            fallbackSize="square_hd"
            className="aspect-square w-full object-cover opacity-95"
            storageImageUrl={item.storageImageUrl}
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/80 ring-1 ring-white/20 hover:bg-black/70 hover:text-white"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
          <div className="absolute left-3 bottom-3 flex items-center gap-2">
            <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] text-[color:var(--vt-ivory)] ring-1 ring-[color:rgba(255,255,255,0.14)]">
              {item.category}
            </span>
            {item.heat && (
              <span
                className={`rounded-full bg-black/50 px-3 py-1 text-[11px] ring-1 ring-[color:rgba(255,255,255,0.14)] ${heatColors[item.heat] ?? 'text-white'}`}
              >
                {heatIcons[item.heat] ?? ''} {item.heat}
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold">{item.title}</h2>
            <div className="shrink-0 text-xl font-semibold text-[color:var(--vt-ivory)]">
              {formatAud(currentPrice)}
            </div>
          </div>

          <div className="mt-1 text-xs text-[color:var(--vt-muted)]">
            {MODE_LABELS[orderMode]} price
          </div>

          {item.description && (
            <p className="mt-3 text-sm text-[color:var(--vt-muted)] leading-relaxed">
              {item.description}
            </p>
          )}

          {hasVariants ? (
            <div className="mt-4">
              <div className="mb-2 text-xs font-medium text-[color:var(--vt-muted)]">
                Choose option
              </div>
              <div className="flex flex-wrap gap-2">
                {item.variants!.map((v, idx) => (
                  <button
                    key={v.label}
                    type="button"
                    onClick={() => setSelectedVariant(idx)}
                    className={`rounded-xl px-4 py-2.5 text-xs font-medium transition-colors ${
                      selectedVariant === idx
                        ? 'bg-[color:var(--vt-ivory)] text-black ring-1 ring-[color:var(--vt-ivory)]'
                        : 'border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] text-[color:var(--vt-muted)] hover:bg-[color:rgba(255,255,255,0.06)]'
                    }`}
                  >
                    <span>{v.label}</span>
                    <span className="ml-1.5 tabular-nums">
                      {formatAud(v.prices[orderMode])}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {item.tags && item.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-[color:rgba(255,255,255,0.10)] bg-[color:rgba(255,255,255,0.03)] px-3 py-1 text-xs text-[color:var(--vt-muted)]"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          {currentPrice > 0 ? (
            <button
              type="button"
              onClick={() => onAddToCart(currentVariantLabel, currentPrice)}
              className="mt-6 w-full rounded-xl bg-[color:var(--vt-ivory)] px-4 py-3 text-sm font-semibold text-black hover:bg-white"
            >
              {'Add to cart \u2014 ' + formatAud(currentPrice)}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
