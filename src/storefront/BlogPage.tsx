import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, BookOpen } from 'lucide-react';
import { fetchPublishedPosts } from '../lib/api/content';
import type { BlogPostListItem } from '../lib/api/content';

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPostListItem[] | null>(null);

  useEffect(() => {
    fetchPublishedPosts()
      .then(setPosts)
      .catch(() => setPosts([]));
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Blog</h1>
      <p className="mt-3 max-w-2xl text-sm text-[color:var(--vt-muted)]">
        Recipes, Thai food culture, restaurant updates, and more from our kitchen.
      </p>

      {posts === null ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[color:var(--vt-accent)]" />
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-10 rounded-[26px] border border-dashed border-[color:var(--vt-border)] py-20 text-center vt-glass">
          <BookOpen className="mx-auto h-10 w-10 text-[color:var(--vt-accent)] opacity-60" />
          <h2 className="mt-4 text-xl font-semibold">Check back soon</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[color:var(--vt-muted)]">
            We're working on new stories from the kitchen.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className="vt-card group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-[color:rgba(232,53,63,0.45)] hover:shadow-[0_20px_45px_-20px_rgba(232,53,63,0.4)]"
            >
              <div className="aspect-[16/10] overflow-hidden bg-[color:rgba(255,255,255,0.03)]">
                {post.cover_image_url ? (
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[color:var(--vt-accent-soft)] to-transparent">
                    <BookOpen className="h-10 w-10 text-[color:var(--vt-accent)] opacity-60" />
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="text-xs text-[color:var(--vt-muted)]">{formatDate(post.published_at)}</div>
                <h2 className="mt-2 text-base font-semibold leading-snug group-hover:text-[color:var(--vt-accent)]">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[color:var(--vt-muted)]">
                    {post.excerpt}
                  </p>
                )}
                <div className="mt-3 text-xs font-semibold text-[color:var(--vt-accent)]">Read more →</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
