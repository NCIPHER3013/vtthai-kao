import { q, m, api } from '../convex';
import type { Recipe, StockItem, SubRecipeIngredient } from '../supabase';

export async function fetchRecipes(): Promise<Recipe[]> {
  return (await q(api.posInventory.recipeList)) as unknown as Recipe[];
}

export async function fetchStockItems(): Promise<StockItem[]> {
  return (await q(api.posInventory.stockList)) as unknown as StockItem[];
}

export async function createRecipe(data: Omit<Recipe, 'id' | 'created_at'>): Promise<Recipe> {
  return (await m(api.posInventory.recipeCreate, { data: data as any })) as unknown as Recipe;
}

export async function updateRecipe(id: string, quantity: number) {
  // Returns the updated fields so the UI can merge them
  return m(api.posInventory.recipeUpdate, { id, quantity });
}

export async function deleteRecipe(id: string | number) {
  return m(api.posInventory.recipeDelete, { id: String(id) });
}

export async function fetchAllSubRecipeIngredients(): Promise<SubRecipeIngredient[]> {
  return (await q(api.posInventory.subRecipeList, {})) as unknown as SubRecipeIngredient[];
}

export async function createSubRecipeIngredient(data: Omit<SubRecipeIngredient, 'id' | 'created_at'>): Promise<SubRecipeIngredient> {
  return (await m(api.posInventory.subRecipeCreate, { data })) as unknown as SubRecipeIngredient;
}

export async function updateSubRecipeIngredient(id: number | string, quantity: number) {
  return m(api.posInventory.subRecipeUpdate, { id: String(id), quantity });
}

export async function deleteSubRecipeIngredient(id: number | string) {
  return m(api.posInventory.subRecipeDelete, { id: String(id) });
}
