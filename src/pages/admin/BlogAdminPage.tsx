import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { fetchAllPosts, deletePost } from '../../lib/api/content';
import { DbError } from '../../lib/api/errors';
import type { BlogPostListItem } from '../../lib/api/content';

export default function BlogAdminPage() {
  const [posts, setPosts] = useState<BlogPostListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await fetchAllPosts();
      setPosts(data);
    } catch (error) {
      if (error instanceof DbError) console.error('Failed to load posts:', error.userMessage, error);
      else console.error('Failed to load posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (post: BlogPostListItem) => {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setDeletingId(post.id);
    try {
      await deletePost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (error) {
      if (error instanceof DbError) console.error('Failed to delete post:', error.userMessage, error);
      else console.error('Failed to delete post:', error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif italic text-theme-ink">Blog Posts</h1>
          <p className="text-xs uppercase tracking-widest text-theme-accent mt-2">
            Stories shown on the website blog
          </p>
        </div>
        <Link
          to="/admin/blog/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-theme-accent text-black text-xs font-bold uppercase tracking-wider hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> New Post
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-theme-border py-16 text-center text-theme-ink-dim text-sm">
            No posts yet — click "New Post" to write your first story.
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="rounded-xl border border-theme-border bg-theme-surface p-4 flex flex-col md:flex-row md:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-theme-ink">{post.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                      post.published
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {post.published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="mt-1 text-xs text-theme-ink-dim">
                  /blog/{post.slug} · {new Date(post.published_at).toLocaleDateString('en-AU')}
                  {post.author ? ` · ${post.author}` : ''}
                </div>
                {post.tags && post.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {post.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded bg-theme-surface-alt text-[10px] text-theme-ink-dim">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/admin/blog/edit/${post.id}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-theme-border text-theme-ink-dim text-[11px] font-bold uppercase tracking-wider hover:text-theme-ink hover:bg-theme-surface-alt"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Link>
                <button
                  onClick={() => handleDelete(post)}
                  disabled={deletingId === post.id}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-[11px] font-bold uppercase tracking-wider hover:bg-red-500/20 disabled:opacity-50"
                >
                  {deletingId === post.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
