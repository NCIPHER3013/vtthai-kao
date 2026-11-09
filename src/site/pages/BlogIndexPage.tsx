import { Link, createFileRoute } from '~/lib/router'
import { api } from 'convex/_generated/api'
import { useQuery } from '@tanstack/react-query'
import { cvq } from '~/lib/convex-helpers'
import { SkeletonBlogCard, SkeletonPageHeader } from '~/components/Skeleton'

const POSTS_PER_PAGE = 6

export const Route = createFileRoute('/blog/')({
  validateSearch: (search) => {
    const page = typeof search.page === 'number' ? search.page : 1
    return { page }
  },
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(cvq(api.blogPosts.listPublished, {}))
  },
  component: BlogPage,
})

function BlogPage() {
  const { page } = Route.useSearch()
  const navigate = Route.useNavigate()

  const { data: posts } = useQuery(cvq(api.blogPosts.listPublished, {})) as {
    data: Array<any> | undefined
  }

  if (!posts) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-12">
        <SkeletonPageHeader />
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlogCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE)
  const currentPage = Math.max(1, Math.min(page, totalPages || 1))
  const startIdx = (currentPage - 1) * POSTS_PER_PAGE
  const paginatedPosts = posts.slice(startIdx, startIdx + POSTS_PER_PAGE)
  const hasNext = currentPage < totalPages
  const hasPrev = currentPage > 1

  const goPage = (p: number) => {
    navigate({ search: { page: p } })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pageNumbers: Array<number> = []
  const startPage = Math.max(1, currentPage - 2)
  const endPage = Math.min(totalPages, currentPage + 2)
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i)
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-col gap-3">
        <div className="text-sm text-[color:var(--vt-muted)]">
          Stories &amp; updates
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Blog
        </h1>
        <div className="text-[color:var(--vt-muted)] max-w-2xl">
          Recipes, Thai food culture, restaurant updates, and more from our
          kitchen.
        </div>
      </div>

      {posts.length === 0 && (
        <div className="mt-16 rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] p-10 text-center">
          <div className="text-lg font-semibold">No posts yet</div>
          <div className="mt-2 text-sm text-[color:var(--vt-muted)]">
            Check back soon — we&apos;re working on new stories.
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {paginatedPosts.map((post) => (
          <BlogCard key={post._id} post={post} />
        ))}
      </div>

      {totalPages > 1 && (
        <nav className="mt-12 flex items-center justify-center gap-1.5">
          <button
            onClick={() => goPage(currentPage - 1)}
            disabled={!hasPrev}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] text-sm text-[color:var(--vt-muted)] transition-colors hover:bg-[color:rgba(255,255,255,0.06)] disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Previous page"
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
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          {startPage > 1 && (
            <>
              <button
                onClick={() => goPage(1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--vt-border)] text-sm text-[color:var(--vt-muted)] transition-colors hover:bg-[color:rgba(255,255,255,0.06)]"
              >
                1
              </button>
              {startPage > 2 && (
                <span className="inline-flex h-9 w-9 items-center justify-center text-sm text-[color:var(--vt-muted)]">
                  …
                </span>
              )}
            </>
          )}

          {pageNumbers.map((p) => (
            <button
              key={p}
              onClick={() => goPage(p)}
              className={
                p === currentPage
                  ? 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--vt-ivory)] bg-[color:var(--vt-ivory)] text-sm font-medium text-black'
                  : 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] text-sm text-[color:var(--vt-muted)] transition-colors hover:bg-[color:rgba(255,255,255,0.06)]'
              }
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p}
            </button>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <span className="inline-flex h-9 w-9 items-center justify-center text-sm text-[color:var(--vt-muted)]">
                  …
                </span>
              )}
              <button
                onClick={() => goPage(totalPages)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] text-sm text-[color:var(--vt-muted)] transition-colors hover:bg-[color:rgba(255,255,255,0.06)]"
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => goPage(currentPage + 1)}
            disabled={!hasNext}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] text-sm text-[color:var(--vt-muted)] transition-colors hover:bg-[color:rgba(255,255,255,0.06)] disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Next page"
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
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </nav>
      )}
    </div>
  )
}

function BlogCard({ post }: { post: any }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="group block overflow-hidden rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] transition-all hover:border-[color:rgba(255,255,255,0.14)]"
    >
      <div className="relative overflow-hidden">
        {post.coverImageUrl ? (
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="aspect-[16/10] w-full object-cover opacity-95 group-hover:opacity-100 transition-opacity"
            loading="lazy"
          />
        ) : (
          <div className="aspect-[16/10] w-full bg-[color:var(--vt-surface-2)] flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[color:var(--vt-muted)]"
            >
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
              <path d="M18 14h-8" />
              <path d="M15 18h-5" />
              <path d="M10 6h8v4h-8V6Z" />
            </svg>
          </div>
        )}
        {post.featured && (
          <div className="absolute left-3 top-3">
            <span className="rounded-full bg-black/60 backdrop-blur-sm px-3 py-1 text-[11px] font-medium text-[color:var(--vt-ivory)] ring-1 ring-[color:rgba(255,255,255,0.14)]">
              Featured
            </span>
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 text-xs text-[color:var(--vt-muted)]">
          <span>{post.author}</span>
          <span>·</span>
          {post.publishedAt && (
            <time dateTime={new Date(post.publishedAt).toISOString()}>
              {formatDate(post.publishedAt)}
            </time>
          )}
        </div>
        <h2 className="mt-2 text-lg font-semibold leading-snug group-hover:text-[color:var(--vt-ivory)] transition-colors">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="mt-1.5 text-sm text-[color:var(--vt-muted)] leading-relaxed line-clamp-2">
            {post.excerpt}
          </p>
        )}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="rounded-full border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] px-2.5 py-0.5 text-[11px] text-[color:var(--vt-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
