import { q, m, convex, api } from '../convex';
import { DbError } from './errors';
import { uploadFile } from './uploads';
import type { Product, ProductCategory } from '../supabase';

export async function fetchProducts(activeOnly = false): Promise<Product[]> {
  return (await q(api.posCatalog.listProducts, { activeOnly })) as unknown as Product[];
}

export async function fetchProductById(id: string): Promise<Product | null> {
  return (await q(api.posCatalog.getProduct, { id })) as unknown as Product | null;
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  return (await q(api.posCatalog.getProductsByIds, { ids })) as unknown as Product[];
}

export async function fetchProductCategories(): Promise<ProductCategory[]> {
  return (await q(api.posCatalog.listCategories)) as unknown as ProductCategory[];
}

export async function createProduct(data: Partial<Product> & Omit<Product, 'created_at'>): Promise<Product> {
  return (await m(api.posCatalog.createProduct, { data })) as unknown as Product;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<Product> {
  return (await m(api.posCatalog.updateProduct, { id, data })) as unknown as Product;
}

/** Deletes, or soft-deletes (is_active=false) when the product appears in orders. */
export async function deleteProduct(id: string) {
  return m(api.posCatalog.deleteProduct, { id });
}

/** Uploads to Convex storage. `path` returned is the public URL (so getProductImageUrl(path) is the identity). */
export async function uploadProductImage(file: File, _path: string) {
  const { url } = await uploadFile(file);
  return { path: url };
}

export async function deleteProductImage(_path: string) {
  // Files stay in Convex storage; unlinking happens by changing image_url on the product.
}

export function getProductImageUrl(path: string): string {
  return path;
}

export async function createProductCategory(data: Partial<ProductCategory>): Promise<ProductCategory> {
  return (await m(api.posCatalog.createCategory, { data })) as unknown as ProductCategory;
}

export async function updateProductCategory(id: string, data: Partial<ProductCategory>): Promise<ProductCategory> {
  return (await m(api.posCatalog.updateCategory, { id, data })) as unknown as ProductCategory;
}

export async function deleteProductCategory(id: string) {
  return m(api.posCatalog.deleteCategory, { id });
}

export async function fetchPopularProductIds(limit = 6): Promise<string[]> {
  return (await q(api.posCatalog.popularProductIds, { limit })) as string[];
}

export interface WebstoreBootstrap {
  products: Product[];
  categories: ProductCategory[];
  settings: Record<string, any>;
  recipes: any[];
  stock_items: any[];
  sub_recipe_ingredients: any[];
}

/** Public: everything the /store page needs in one call (replaces six anonymous selects). */
export async function fetchWebstoreBootstrap(): Promise<WebstoreBootstrap> {
  try {
    return (await convex.query(api.posCatalog.webstoreBootstrap, {})) as unknown as WebstoreBootstrap;
  } catch (e) {
    throw new DbError(e, 'products', 'fetchWebstoreBootstrap');
  }
}
