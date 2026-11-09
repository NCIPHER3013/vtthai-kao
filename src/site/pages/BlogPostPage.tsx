import { Link, createFileRoute } from '~/lib/router'
import * as React from 'react'
import { api } from 'convex/_generated/api'
import { useQuery } from '@tanstack/react-query'
import { cvq } from '~/lib/convex-helpers'

export const Route = createFileRoute('/blog/$slug')({
  head: () => ({
    meta: [{ title: 'Blog — Vermont Thai' }],
  }),
  loader: async ({ context: { queryClient }, params }) => {
    await Promise.all([
      queryClient.ensureQueryData(
        cvq(api.blogPosts.getBySlug, { slug: params.slug }),
      ),
      queryClient.ensureQueryData(cvq(api.blogPosts.listPublished, {})),
    ])
  },
  component: BlogPostPage,
})

function BlogPostPage() {
  const { slug } = Route.useParams()
  const { data: post } = useQuery(cvq(api.blogPosts.getBySlug, { slug })) as {
    data: any
  }
  const { data: allPosts } = useQuery(cvq(api.blogPosts.listPublished, {})) as {
    data: Array<any> | undefined
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-12 text-center">
        <h1 className="text-2xl font-semibold">Post not found</h1>
        <p className="mt-2 text-sm text-[color:var(--vt-muted)]">
          The blog post you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          to="/blog"
          search={{ page: 1 }}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[color:rgba(255,255,255,0.06)] px-4 py-2 text-sm ring-1 ring-[color:var(--vt-border)] hover:bg-[color:rgba(255,255,255,0.1)]"
        >
          ← Back to Blog
        </Link>
      </div>
    )
  }

  if (!post.published) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-12 text-center">
        <h1 className="text-2xl font-semibold">Draft</h1>
        <p className="mt-2 text-sm text-[color:var(--vt-muted)]">
          This post is not yet published.
        </p>
        <Link
          to="/blog"
          search={{ page: 1 }}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[color:rgba(255,255,255,0.06)] px-4 py-2 text-sm ring-1 ring-[color:var(--vt-border)] hover:bg-[color:rgba(255,255,255,0.1)]"
        >
          ← Back to Blog
        </Link>
      </div>
    )
  }

  return (
    <article className="mx-auto max-w-4xl px-5 py-12">
      <BlogHead post={post} />
      <JsonLd post={post} />
      <div className="mb-8">
        <Link
          to="/blog"
          search={{ page: 1 }}
          className="inline-flex items-center gap-1.5 text-sm text-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)] transition-colors"
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
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          Back to Blog
        </Link>
      </div>

      {post.coverImageUrl && (
        <div className="relative overflow-hidden rounded-2xl border border-[color:var(--vt-border)]">
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="w-full aspect-[16/9] object-cover"
            loading="eager"
          />
        </div>
      )}

      <header className="mt-8">
        <div className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--vt-muted)]">
          <span>{post.author}</span>
          <span>·</span>
          {post.publishedAt && (
            <time dateTime={new Date(post.publishedAt).toISOString()}>
              {formatDate(post.publishedAt)}
            </time>
          )}
          {post.tags && post.tags.length > 0 && (
            <>
              <span>·</span>
              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] px-2.5 py-0.5 text-[11px] text-[color:var(--vt-muted)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="mt-3 text-lg text-[color:var(--vt-muted)] leading-relaxed">
            {post.excerpt}
          </p>
        )}
      </header>

      <div
        className="mt-8 prose prose-invert prose-sm md:prose-base max-w-none
          prose-headings:text-[color:var(--vt-text)] prose-headings:font-semibold
          prose-p:text-[color:var(--vt-muted)] prose-p:leading-relaxed
          prose-a:text-[color:var(--vt-ivory)] prose-a:no-underline hover:prose-a:underline
          prose-strong:text-[color:var(--vt-text)]
          prose-blockquote:border-l-[color:var(--vt-chili)] prose-blockquote:text-[color:var(--vt-muted)]
          prose-code:text-[color:var(--vt-ivory)] prose-code:bg-[color:var(--vt-surface)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-[color:var(--vt-surface)] prose-pre:border prose-pre:border-[color:var(--vt-border)]
          prose-img:rounded-xl
          prose-hr:border-[color:var(--vt-border)]
          prose-li:text-[color:var(--vt-muted)]"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      <PostNavigation currentSlug={slug} allPosts={allPosts} />

      <div className="mt-12 border-t border-[color:var(--vt-border)] pt-8">
        <Link
          to="/blog"
          search={{ page: 1 }}
          className="inline-flex items-center gap-2 rounded-xl bg-[color:rgba(255,255,255,0.06)] px-4 py-2 text-sm ring-1 ring-[color:var(--vt-border)] hover:bg-[color:rgba(255,255,255,0.1)]"
        >
          ← Back to Blog
        </Link>
      </div>
    </article>
  )
}

function PostNavigation({
  currentSlug,
  allPosts,
}: {
  currentSlug: string
  allPosts: Array<any> | undefined
}) {
  if (!allPosts) return null

  const currentIndex = allPosts.findIndex((p) => p.slug === currentSlug)
  if (currentIndex === -1) return null

  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null
  const nextPost =
    currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null

  if (!prevPost && !nextPost) return null

  return (
    <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {prevPost && (
        <Link
          to="/blog/$slug"
          params={{ slug: prevPost.slug }}
          className="group flex items-center gap-4 overflow-hidden rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] p-4 transition-all hover:border-[color:rgba(255,255,255,0.14)] hover:bg-[color:rgba(255,255,255,0.04)]"
        >
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[color:var(--vt-border)]">
            {prevPost.coverImageUrl ? (
              <img
                src={prevPost.coverImageUrl}
                alt={prevPost.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[color:var(--vt-surface-2)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
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
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-[color:var(--vt-muted)]">
              ← Previous
            </div>
            <div className="mt-1 line-clamp-2 text-sm font-medium leading-snug group-hover:text-[color:var(--vt-ivory)] transition-colors">
              {prevPost.title}
            </div>
          </div>
        </Link>
      )}
      {nextPost && (
        <Link
          to="/blog/$slug"
          params={{ slug: nextPost.slug }}
          className="group flex items-center gap-4 overflow-hidden rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] p-4 transition-all hover:border-[color:rgba(255,255,255,0.14)] hover:bg-[color:rgba(255,255,255,0.04)] sm:text-right"
        >
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[color:var(--vt-border)] sm:order-last">
            {nextPost.coverImageUrl ? (
              <img
                src={nextPost.coverImageUrl}
                alt={nextPost.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[color:var(--vt-surface-2)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
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
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-[color:var(--vt-muted)]">
              Next →
            </div>
            <div className="mt-1 line-clamp-2 text-sm font-medium leading-snug group-hover:text-[color:var(--vt-ivory)] transition-colors">
              {nextPost.title}
            </div>
          </div>
        </Link>
      )}
    </div>
  )
}

function BlogHead({ post }: { post: any }) {
  const seoTitle = post.seoTitle || `${post.title} — Vermont Thai`
  const seoDescription =
    post.seoDescription ||
    post.excerpt ||
    `Read "${post.title}" on Vermont Thai blog.`
  const ogImage = post.seoOgImage || post.coverImageUrl || '/logo.png'

  React.useEffect(() => {
    document.title = seoTitle
  }, [seoTitle])

  return (
    <>
      <meta name="description" content={seoDescription} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:type" content="article" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Vermont Thai" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="author" content={post.author} />
      <meta name="robots" content="index, follow" />
      <link
        rel="canonical"
        href={
          post.seoCanonicalUrl
            ? post.seoCanonicalUrl
            : `https://vermontthai.com.au/blog/${post.slug}`
        }
      />
    </>
  )
}

function JsonLd({ post }: { post: any }) {
  const seoDescription =
    post.seoDescription ||
    post.excerpt ||
    `Read "${post.title}" on Vermont Thai blog.`

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: seoDescription,
            image: post.coverImageUrl || post.seoOgImage || '/logo.png',
            author: {
              '@type': 'Person',
              name: post.author,
            },
            publisher: {
              '@type': 'Organization',
              name: 'Vermont Thai',
              logo: {
                '@type': 'ImageObject',
                url: 'https://vermontthai.com.au/logo.png',
              },
            },
            datePublished: post.publishedAt
              ? new Date(post.publishedAt).toISOString()
              : new Date(post._creationTime).toISOString(),
            dateModified: new Date(post._creationTime).toISOString(),
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://vermontthai.com.au/blog/${post.slug}`,
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://vermontthai.com.au',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Blog',
                item: 'https://vermontthai.com.au/blog',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: post.title,
                item: `https://vermontthai.com.au/blog/${post.slug}`,
              },
            ],
          }),
        }}
      />
    </>
  )
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
