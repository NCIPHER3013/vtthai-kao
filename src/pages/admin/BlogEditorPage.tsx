import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, Upload, Trash2 } from 'lucide-react';
import { uploadFile } from '../../lib/api/uploads';
import { fetchPostById, createPost, updatePost, deletePost } from '../../lib/api/content';
import { DbError } from '../../lib/api/errors';

type Tab = 'content' | 'seo';

const slugify = (s: string) =>
  s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function BlogEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('content');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [editHtml, setEditHtml] = useState(false);
  const [author, setAuthor] = useState('Vermont Thai');
  const [tagsText, setTagsText] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [published, setPublished] = useState(false);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    fetchPostById(id!)
      .then((p) => {
        if (!p) {
          setErrorMsg('Post not found.');
          return;
        }
        setTitle(p.title);
        setSlug(p.slug);
        setSlugTouched(true);
        setExcerpt(p.excerpt || '');
        setContent(p.content);
        setAuthor(p.author || 'Vermont Thai');
        setTagsText((p.tags || []).join(', '));
        setSeoTitle(p.seo_title || '');
        setSeoDescription(p.seo_description || '');
        setCoverUrl(p.cover_image_url || '');
        setPublished(p.published);
      })
      .catch((error) => {
        const msg = error instanceof DbError ? error.userMessage : error?.message;
        setErrorMsg(msg || 'Failed to load post.');
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const onTitleChange = (v: string) => {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const onCoverSelect = async (file: File) => {
    setIsUploading(true);
    setErrorMsg('');
    try {
      const { url } = await uploadFile(file);
      setCoverUrl(url);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Image upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const save = async (publish: boolean) => {
    setErrorMsg('');
    if (!title.trim() || !slug.trim() || !content.trim()) {
      setErrorMsg('Title, Slug and Content are required.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || null,
        content,
        cover_image_url: coverUrl || null,
        author: author.trim() || null,
        tags: tagsText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        seo_title: seoTitle.trim() || null,
        seo_description: seoDescription.trim() || null,
        published: publish,
      };
      if (isEdit) await updatePost(id!, payload);
      else await createPost(payload);
      navigate('/admin/blog');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save post.');
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!id || !window.confirm('Delete this post? This cannot be undone.')) return;
    setIsSaving(true);
    try {
      await deletePost(id);
      navigate('/admin/blog');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete post.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-theme-border bg-theme-bg px-3 py-2.5 text-sm text-theme-ink focus:outline-none focus:border-theme-accent';
  const labelCls = 'text-xs text-theme-ink-dim';

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif italic text-theme-ink">{isEdit ? 'Edit Post' : 'New Post'}</h1>
          <p className="text-xs uppercase tracking-widest text-theme-accent mt-2">
            Stories shown on the website blog
          </p>
        </div>
        <Link
          to="/admin/blog"
          className="px-4 py-2.5 rounded-lg border border-theme-border text-xs uppercase tracking-wider text-theme-ink-dim hover:text-theme-ink hover:bg-theme-surface-alt"
        >
          Cancel
        </Link>
      </div>

      {errorMsg && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {errorMsg}
        </div>
      )}

      <div className="mt-6 flex gap-1 border-b border-theme-border">
        {(
          [
            ['content', 'Content'],
            ['seo', 'SEO Settings'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              tab === key ? 'text-theme-accent border-b-2 border-theme-accent' : 'text-theme-ink-dim hover:text-theme-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {tab === 'content' && (
          <>
            <label className="block">
              <div className={labelCls}>Title *</div>
              <input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="e.g. Top 10 Thai Dishes You Must Try"
                className={`mt-1.5 ${inputCls}`}
              />
            </label>

            <label className="block">
              <div className={labelCls}>Slug *</div>
              <div className="mt-1.5 flex items-center rounded-xl border border-theme-border bg-theme-bg focus-within:border-theme-accent">
                <span className="pl-3 pr-1 text-sm text-theme-ink-dim select-none">/blog/</span>
                <input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  placeholder="my-blog-post"
                  className="flex-1 bg-transparent px-1 py-2.5 text-sm text-theme-ink focus:outline-none"
                />
              </div>
            </label>

            <label className="block">
              <div className={labelCls}>Excerpt</div>
              <input
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A brief summary shown in the blog listing..."
                className={`mt-1.5 ${inputCls}`}
              />
            </label>

            <div>
              <div className="flex items-center justify-between">
                <div className={labelCls}>Content *</div>
                <button
                  type="button"
                  onClick={() => setEditHtml((v) => !v)}
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    editHtml ? 'text-theme-accent' : 'text-theme-ink-dim hover:text-theme-ink'
                  }`}
                >
                  {editHtml ? 'Editing HTML' : 'Edit HTML directly'}
                </button>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={14}
                placeholder={
                  editHtml
                    ? '<p>Write your story in HTML…</p>'
                    : 'Write your story here. Leave a blank line between paragraphs.'
                }
                className={`mt-1.5 w-full rounded-xl border border-theme-border bg-theme-bg px-3 py-2.5 text-sm text-theme-ink font-mono focus:outline-none focus:border-theme-accent min-h-56`}
              />
              <div className="mt-1 text-[11px] text-theme-ink-dim">
                {editHtml
                  ? 'Raw HTML will be rendered on the blog page.'
                  : 'Blank lines separate paragraphs when published.'}
              </div>
            </div>

            <label className="block">
              <div className={labelCls}>Author</div>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} className={`mt-1.5 ${inputCls}`} />
            </label>

            <label className="block">
              <div className={labelCls}>Tags (comma separated)</div>
              <input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="thai food, recipe, culture"
                className={`mt-1.5 ${inputCls}`}
              />
            </label>

            <div>
              <div className={labelCls}>Cover Image</div>
              <div className="mt-1.5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2 rounded-xl border border-theme-border px-4 py-2.5 text-sm text-theme-ink-dim hover:text-theme-ink hover:border-theme-accent disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload Image
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onCoverSelect(f);
                    e.target.value = '';
                  }}
                />
                {coverUrl && (
                  <div className="flex items-center gap-2">
                    <img src={coverUrl} alt="Cover preview" className="h-12 w-20 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => setCoverUrl('')}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <label className="flex items-center justify-between rounded-xl border border-theme-border bg-theme-surface px-4 py-3">
              <span className="text-sm text-theme-ink">Published</span>
              <button
                type="button"
                role="switch"
                aria-checked={published}
                onClick={() => setPublished((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  published ? 'bg-emerald-500' : 'bg-theme-surface-alt border border-theme-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                    published ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </label>
          </>
        )}

        {tab === 'seo' && (
          <>
            <label className="block">
              <div className={labelCls}>SEO Title</div>
              <input
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={title || 'Page title for search engines'}
                className={`mt-1.5 ${inputCls}`}
              />
              <div className="mt-1 text-[11px] text-theme-ink-dim">Leave empty to use the post title.</div>
            </label>
            <label className="block">
              <div className={labelCls}>SEO Description</div>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                rows={4}
                placeholder="Short description shown under the title in search results"
                className={`mt-1.5 ${inputCls}`}
              />
            </label>
          </>
        )}
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={() => save(published)}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-xl bg-theme-accent px-6 py-3 text-xs font-bold uppercase tracking-wider text-black hover:opacity-90 disabled:opacity-50"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? 'Save changes' : published ? 'Publish post' : 'Save draft'}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={remove}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-red-400 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        )}
        <span className="text-xs text-theme-ink-dim">
          {published ? 'This post is live on the website.' : 'This post is saved as a draft.'}
        </span>
      </div>
    </div>
  );
}
