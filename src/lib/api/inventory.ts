import { q, m, api } from '../convex';
export { fetchAllSubRecipeIngredients } from './recipes';
import type { StockItem, Supplier, ItemSupplier, PurchaseOrder, PurchaseOrderItem, SubRecipeIngredient, InventoryCategory } from '../supabase';

export async function fetchInventory(): Promise<StockItem[]> {
  return (await q(api.posInventory.stockList)) as unknown as StockItem[];
}

// ========================
// Inventory Categories
// ========================

export async function fetchInventoryCategories(): Promise<InventoryCategory[]> {
  return (await q(api.posInventory.categoryList)) as unknown as InventoryCategory[];
}

export async function createInventoryCategory(data: Partial<InventoryCategory>): Promise<InventoryCategory> {
  return (await m(api.posInventory.categoryCreate, { name: data.name || '' })) as unknown as InventoryCategory;
}

export async function updateInventoryCategory(id: string, data: Partial<InventoryCategory>): Promise<InventoryCategory> {
  return (await m(api.posInventory.categoryUpdate, { id, name: data.name || '' })) as unknown as InventoryCategory;
}

export async function deleteInventoryCategory(id: string) {
  return m(api.posInventory.categoryDelete, { id });
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  return (await q(api.posInventory.supplierList)) as unknown as Supplier[];
}

export async function fetchItemSuppliers(itemId: string): Promise<(ItemSupplier & { suppliers?: Supplier })[]> {
  return (await q(api.posInventory.itemSupplierList, { itemId })) as unknown as (ItemSupplier & { suppliers?: Supplier })[];
}

export async function fetchAllItemSuppliers(): Promise<(ItemSupplier & { suppliers?: Supplier })[]> {
  return (await q(api.posInventory.itemSupplierList, {})) as unknown as (ItemSupplier & { suppliers?: Supplier })[];
}

export async function fetchSubRecipeIngredients(parentItemId: string): Promise<(SubRecipeIngredient & { childItem?: StockItem })[]> {
  return (await q(api.posInventory.subRecipeList, { parentId: parentItemId, withChild: true })) as unknown as (SubRecipeIngredient & { childItem?: StockItem })[];
}

export async function updateStockItem(id: string, data: Partial<StockItem>): Promise<StockItem> {
  return (await m(api.posInventory.stockUpdate, { id, data: data as any })) as unknown as StockItem;
}

export async function createStockItem(data: Partial<StockItem>): Promise<StockItem> {
  return (await m(api.posInventory.stockCreate, { data: data as any })) as unknown as StockItem;
}

export async function deleteStockItem(id: string) {
  return m(api.posInventory.stockDelete, { id });
}

export async function createItemSupplier(data: { item_id: string; supplier_id: string; price: number; is_preferred?: boolean }): Promise<ItemSupplier> {
  return (await m(api.posInventory.itemSupplierCreate, { data })) as unknown as ItemSupplier;
}

export async function deleteItemSupplier(id: string) {
  return m(api.posInventory.itemSupplierDelete, { id });
}

export async function writeLedgerEntry(data: { item_id: string; change_type: string; quantity: number; notes?: string; reference_id?: string }) {
  return m(api.posInventory.ledgerWrite, { data });
}

export async function createSupplier(data: Partial<Supplier>): Promise<Supplier> {
  return (await m(api.posInventory.supplierCreate, { data: data as any })) as unknown as Supplier;
}

export async function updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
  return (await m(api.posInventory.supplierUpdate, { id, data: data as any })) as unknown as Supplier;
}

const KNOWN_TABLES = new Set([
  'stock_items', 'suppliers', 'item_suppliers', 'purchase_orders', 'purchase_order_items', 'recipes',
  'sub_recipe_ingredients', 'inventory_ledger', 'inventory_categories', 'stocktakes', 'stocktake_items',
]);
/** Convex tables are defined by the schema, so inventory tables always exist. */
export async function checkTableExists(tableName: string): Promise<boolean> {
  return KNOWN_TABLES.has(tableName);
}

export async function fetchPurchaseOrders(): Promise<(PurchaseOrder & { suppliers?: Supplier })[]> {
  return (await q(api.posInventory.poList)) as unknown as (PurchaseOrder & { suppliers?: Supplier })[];
}

export async function fetchPurchaseOrderItems(poId: string): Promise<(PurchaseOrderItem & { stock_items?: StockItem })[]> {
  return (await q(api.posInventory.poItemList, { poId })) as unknown as (PurchaseOrderItem & { stock_items?: StockItem })[];
}

export async function createPurchaseOrder(data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
  return (await m(api.posInventory.poCreate, { data: data as any })) as unknown as PurchaseOrder;
}

export async function updatePurchaseOrder(id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
  return (await m(api.posInventory.poUpdate, { id, data: data as any })) as unknown as PurchaseOrder;
}

export async function createPurchaseOrderItems(items: Omit<PurchaseOrderItem, 'id'>[]): Promise<PurchaseOrderItem[]> {
  return (await m(api.posInventory.poItemsCreate, { items: items as any })) as unknown as PurchaseOrderItem[];
}

export async function updatePurchaseOrderItem(id: string, data: Partial<PurchaseOrderItem>): Promise<PurchaseOrderItem> {
  return (await m(api.posInventory.poItemUpdate, { id, data: data as any })) as unknown as PurchaseOrderItem;
}

export async function receivePurchaseOrderAtomic(
  poId: string,
  items: { inventory_item_id: string; quantity_received: number; unit_price: number }[],
  notes?: string
) {
  return m(api.posInventory.poReceive, { poId, items, notes: notes || null });
}

export async function completeStocktakeAtomic(
  stocktakeId: string,
  items: { stock_item_id: string; counted_qty: number }[],
  notes?: string
) {
  return m(api.posInventory.stocktakeComplete, { stocktakeId, items, notes: notes || null });
}
