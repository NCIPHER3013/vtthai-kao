import { q, m, api } from '../convex';

export async function fetchStocktakes() {
  return (await q(api.posInventory.stocktakeList)) as any[];
}

export async function fetchStocktakeItems(stocktakeId: string) {
  return (await q(api.posInventory.stocktakeItemList, { stocktakeId, withStock: true })) as any[];
}

export async function fetchStocktakeItemsRaw(stocktakeId: string) {
  return (await q(api.posInventory.stocktakeItemList, { stocktakeId })) as any[];
}

export async function createStocktake(data: Record<string, any>) {
  return (await m(api.posInventory.stocktakeCreate, { data: data as any })) as any;
}

export async function batchInsertStocktakeItems(items: Record<string, any>[]) {
  await m(api.posInventory.stocktakeItemsInsert, { items: items as any });
  return null;
}

export async function updateStocktakeItem(stocktakeId: string, stockItemId: string, data: Record<string, any>) {
  await m(api.posInventory.stocktakeItemUpdate, { stocktakeId, stockItemId, data: data as any });
  return null;
}

export async function updateStocktake(id: string, data: Record<string, any>) {
  await m(api.posInventory.stocktakeUpdate, { id, data: data as any });
  return null;
}

export async function writeStocktakeLedger(data: Record<string, any>) {
  await m(api.posInventory.stocktakeLedgerWrite, { data: data as any });
  return null;
}
