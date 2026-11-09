export function SkeletonBox({
  className = '',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`vt-skeleton ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

export function SkeletonLine({
  width = '100%',
  className = '',
}: {
  width?: string
  className?: string
}) {
  return (
    <SkeletonBox
      className={`h-4 ${className}`}
      style={{ width, maxWidth: width }}
    />
  )
}

export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] ${className}`}
    >
      <SkeletonBox className="aspect-square w-full" />
      <div className="space-y-2.5 p-4">
        <SkeletonLine width="70%" />
        <SkeletonLine width="40%" />
        <div className="flex gap-2 pt-1">
          <SkeletonBox className="h-6 w-12 rounded-full" />
          <SkeletonBox className="h-6 w-14 rounded-full" />
        </div>
        <SkeletonBox className="mt-2 h-8 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function SkeletonMenuItem({ className = '' }: { className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] ${className}`}
    >
      <SkeletonBox className="aspect-square w-full" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <SkeletonLine width="65%" className="h-4" />
          <SkeletonBox className="h-4 w-14 rounded" />
        </div>
        <SkeletonText lines={2} className="mt-2" />
        <div className="mt-3 flex gap-2">
          <SkeletonBox className="h-6 w-12 rounded-full" />
          <SkeletonBox className="h-6 w-16 rounded-full" />
        </div>
        <SkeletonBox className="mt-3 h-8 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function SkeletonPickCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] ${className}`}
    >
      <div className="grid grid-cols-[96px,1fr] gap-4 p-4">
        <SkeletonBox className="aspect-square w-24 h-24 rounded-xl" />
        <div className="space-y-2.5">
          <SkeletonLine width="70%" />
          <SkeletonLine width="90%" />
          <SkeletonBox className="h-8 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonBlogCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] ${className}`}
    >
      <SkeletonBox className="aspect-[16/10] w-full" />
      <div className="space-y-2.5 p-5">
        <div className="flex gap-2">
          <SkeletonBox className="h-4 w-16 rounded" />
          <SkeletonBox className="h-4 w-20 rounded" />
        </div>
        <SkeletonLine width="85%" className="h-5" />
        <SkeletonText lines={2} />
        <div className="flex gap-1.5 pt-1">
          <SkeletonBox className="h-5 w-12 rounded-full" />
          <SkeletonBox className="h-5 w-16 rounded-full" />
          <SkeletonBox className="h-5 w-10 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonOfferCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] ${className}`}
    >
      <SkeletonBox className="aspect-[16/10] w-full" />
      <div className="space-y-2.5 p-5">
        <SkeletonLine width="50%" className="h-5" />
        <SkeletonText lines={2} />
        <SkeletonBox className="h-8 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function SkeletonFormFields({
  fields = 4,
  className = '',
}: {
  fields?: number
  className?: string
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonBox className="h-3 w-16 rounded" />
          <SkeletonBox className="h-10 w-full rounded-xl" />
        </div>
      ))}
      <SkeletonBox className="h-10 w-32 rounded-xl mt-2" />
    </div>
  )
}

export function SkeletonHeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 pt-14 pb-10 md:pt-20 md:pb-16">
        <div className="grid lg:grid-cols-[1.05fr,0.95fr] gap-10 items-center">
          <div className="space-y-6">
            <SkeletonBox className="h-8 w-64 rounded-full" />
            <div className="space-y-3">
              <SkeletonBox className="h-14 w-80 rounded-lg" />
              <SkeletonBox className="h-14 w-96 rounded-lg" />
            </div>
            <SkeletonText lines={3} />
            <div className="flex gap-3">
              <SkeletonBox className="h-12 w-28 rounded-xl" />
              <SkeletonBox className="h-12 w-28 rounded-xl" />
              <SkeletonBox className="h-12 w-28 rounded-xl" />
            </div>
          </div>
          <div className="space-y-4">
            <SkeletonBox className="aspect-[16/11] w-full rounded-[26px]" />
            <div className="flex gap-2">
              <SkeletonBox className="h-8 w-24 rounded-full" />
              <SkeletonBox className="h-8 w-28 rounded-full" />
              <SkeletonBox className="h-8 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function SkeletonPageHeader({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <SkeletonBox className="h-4 w-32 rounded" />
      <SkeletonBox className="h-10 w-48 rounded-lg" />
      <SkeletonLine width="80%" className="h-4" />
    </div>
  )
}

export function SkeletonInfoCards() {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] p-6"
        >
          <SkeletonBox className="h-6 w-40 rounded" />
          <div className="mt-3 space-y-2">
            <SkeletonLine width="100%" />
            <SkeletonLine width="80%" />
          </div>
        </div>
      ))}
    </div>
  )
}
