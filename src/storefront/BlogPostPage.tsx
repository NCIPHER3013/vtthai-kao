import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { fetchPublishedPostBySlug } from '../lib/api/content';
import type { BlogPost } from '../lib/supabase';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetchPublishedPostBySlug(slug)
      .then((p) => {
        if (!p) setNotFound(true);
        else setPost(p);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [slug]);

  useEffect(() => {
    if (post) document.title = post.seo_title || post.title;
    return () => {
      document.title = 'Vermont Thai — Thai Cuisine, Dine In & Take Away';
    };
  }, [post]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[color:var(--vt-accent)]" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h1 className="text-2xl font-semibold">Story not found</h1>
        <p className="mt-2 text-sm text-[color:var(--vt-muted)]">
          This story may have been moved or unpublished.
        </p>
        <Link
          to="/blog"
          className="mt-6 inline-block rounded-xl bg-[color:var(--vt-accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[color:var(--vt-accent-deep)]"
        >
          Back to blog
        </Link>
      </div>
    );
  }

  const paragraphs = post.content.split(/\n\s*\n/).filter(Boolean);
  const isHtml = post.content.trimStart().startsWith('<');

  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      <Link to="/blog" className="inline-flex items-center gap-2 text-xs text-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)]">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to blog
      </Link>

      <h1 className="mt-6 text-3xl md:text-4xl font-semibold leading-tight">{post.title}</h1>
      <div className="mt-3 text-xs text-[color:var(--vt-muted)]">
        {new Date(post.published_at).toLocaleDateString('en-AU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
        {post.author ? ` · ${post.author}` : ''}
      </div>

      {post.cover_image_url && (
        <div className="mt-6 overflow-hidden rounded-[28px] border border-[color:var(--vt-border)] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]">
          <img src={post.cover_image_url} alt={post.title} className="w-full object-cover aspect-[16/9]" />
        </div>
      )}

      <div className="mt-8">
        {isHtml ? (
          <div
            className="space-y-5 text-[15px] leading-relaxed text-[color:var(--vt-text)] [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mb-4 [&_a]:text-[color:var(--vt-accent)] [&_ul]:list-disc [&_ul]:pl-6"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        ) : (
          <div className="space-y-5">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-[color:var(--vt-text)]">
                {p}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="vt-card mt-12 p-6 text-center md:p-8">
        <div className="text-lg font-semibold">Hungry after all that reading?</div>
        <Link
          to="/order"
          className="vt-btn-primary vt-glow mt-5 inline-block px-6 py-3.5 text-sm"
        >
          Start a delivery order
        </Link>
      </div>
    </article>
  );
}
