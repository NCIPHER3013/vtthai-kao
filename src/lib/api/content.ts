import { convex, q, m, api } from '../convex';
import { DbError } from './errors';
import type { BlogPost } from '../supabase';

export type BlogPostListItem = Pick<
  BlogPost,
  'id' | 'slug' | 'title' | 'excerpt' | 'cover_image_url' | 'published_at' | 'published' | 'author' | 'tags'
>;

// Public reads (storefront blog): no login needed.
export async function fetchPublishedPosts(): Promise<BlogPostListItem[]> {
  try {
    return (await convex.query(api.posPeople.listPublishedPosts, {})) as unknown as BlogPostListItem[];
  } catch (e) {
    throw new DbError(e, 'blog_posts', 'fetchPublishedPosts');
  }
}

export async function fetchAllPosts(): Promise<BlogPostListItem[]> {
  return (await q(api.posPeople.listAllPosts)) as unknown as BlogPostListItem[];
}

export async function fetchPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    return (await convex.query(api.posPeople.getPublishedPostBySlug, { slug })) as unknown as BlogPost | null;
  } catch (e) {
    throw new DbError(e, 'blog_posts', 'fetchPublishedPostBySlug');
  }
}

export async function fetchPostById(id: string): Promise<BlogPost | null> {
  return (await q(api.posPeople.getPostById, { id: id as any })) as unknown as BlogPost | null;
}

export type BlogPostInput = {
  slug: string;
  title: string;
  excerpt?: string | null;
  content: string;
  cover_image_url?: string | null;
  author?: string | null;
  tags?: string[] | null;
  seo_title?: string | null;
  seo_description?: string | null;
  published: boolean;
};

export async function createPost(post: BlogPostInput): Promise<BlogPost> {
  return (await m(api.posPeople.createPost, post)) as unknown as BlogPost;
}

export async function updatePost(id: string, post: Partial<BlogPostInput>): Promise<BlogPost> {
  return (await m(api.posPeople.updatePost, { id: id as any, ...post })) as unknown as BlogPost;
}

export async function deletePost(id: string) {
  await m(api.posPeople.deletePost, { id: id as any });
  return null;
}
