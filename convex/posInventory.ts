// Inventory / recipes / purchasing / stocktake (ported from pos-lite Supabase DAL + RPCs).
// All functions return LEGACY pos-lite row shapes (snake_case, id = Convex id string, ISO dates).
import { v, type Validator } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id, TableNames } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { MANAGERS, ALL_STAFF, getSession, requireRole, toIso, fromIso } from './posLib'

type Ctx = QueryCtx | MutationCtx

function nid<T extends TableNames>(ctx: Ctx, table: T, value: string): Id<T> {
  const r = ctx.db.normalizeId(table, value)
  if (!r) throw new Error(`NOT_FOUND: ${table} ${value}`)
  return r
}
const maybeNid = <T extends TableNames>(ctx: Ctx, table: T, value: string | null | undefined) =>
  value ? ctx.db.normalizeId(table, value) : null

const nul = <T extends Validator<any, any, any>>(x: T) => v.optional(v.union(x, v.null()))

// ---------- legacy mappers ----------
function stockOut(d: Doc<'stockItems'>, redact = false) {
  return {
    id: d._id as string,
    item_id: d.itemCode ?? null,
    plu: d.plu ?? null,
    name: d.name,
    category: d.category ?? null,
    unit: d.unit ?? null,
    reorder_level: d.reorderLevel ?? 0,
    cost_per_unit: redact ? null : (d.costPerUnit ?? 0),
    current_stock: d.currentStock,
    status: d.status ?? null,
    notes: redact ? null : (d.notes ?? null),
    selected_supplier: redact ? null : (d.selectedSupplier ?? null),
    source_type: d.sourceType ?? null,
    created_at: toIso(d._creationTime),
    updated_at: toIso(d._creationTime),
  }
}
const supplierOut = (d: Doc<'suppliers'>) => ({
  id: d._id as string,
  name: d.name,
  contact_name: d.contactName ?? null,
  phone: d.phone ?? null,
  email: d.email ?? null,
  address: d.address ?? null,
  is_active: d.isActive,
  created_at: toIso(d._creationTime),
})
const categoryOut = (d: Doc<'inventoryCategories'>) => ({
  id: d._id as string,
  name: d.name,
  created_at: toIso(d._creationTime),
  updated_at: toIso(d._creationTime),
})
const recipeOut = (d: Doc<'recipes'>) => ({
  id: d._id as string,
  product_id: d.menuId as string,
  inventory_item_id: d.stockItemId as string,
  quantity: d.quantity,
  variant: d.variant ?? null,
  created_at: toIso(d._creationTime),
})
const subOut = (d: Doc<'subRecipeIngredients'>) => ({
  id: d._id as string,
  parent_item_id: d.parentItemId as string,
  child_item_id: d.childItemId as string,
  quantity: d.quantity,
  created_at: toIso(d._creationTime),
})

/** Read access for lists the QR webstore needs (availability check): public, but cost data redacted. */
async function readAccess(ctx: Ctx, token: string | undefined, publicOk: boolean) {
  const s = await getSession(ctx, token)
  if (s) return { redact: false }
  if (!publicOk) throw new Error('UNAUTHORIZED')
  return { redact: true }
}

// =====================================================================
// Stock items
// =====================================================================
export const stockList = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    const { redact } = await readAccess(ctx, token, true)
    const rows = await ctx.db.query('stockItems').collect()
    rows.sort((a, b) => a.name.localeCompare(b.name))
    return rows.map((r) => stockOut(r, redact))
  },
})

const stockFields = {
  item_id: nul(v.string()),
  plu: nul(v.string()),
  name: v.optional(v.string()),
  category: nul(v.string()),
  unit: nul(v.string()),
  reorder_level: nul(v.number()),
  cost_per_unit: nul(v.number()),
  current_stock: nul(v.number()),
  status: nul(v.string()),
  notes: nul(v.string()),
  selected_supplier: nul(v.string()),
  source_type: nul(v.string()),
}
type StockFields = {
  [K in keyof typeof stockFields]?: any
}
/** legacy fields -> Convex patch. null => undefined (unset on patch / omitted on insert). */
function stockPatch(d: StockFields) {
  const n = <T>(x: T | null | undefined) => (x === null ? undefined : x)
  const out: Record<string, unknown> = {}
  const set = (k: string, val: unknown, present: boolean) => {
    if (present) out[k] = val
  }
  set('itemCode', n(d.item_id), 'item_id' in d)
  set('plu', n(d.plu), 'plu' in d)
  set('name', d.name, 'name' in d && d.name !== undefined)
  set('category', n(d.category), 'category' in d)
  set('unit', n(d.unit), 'unit' in d)
  set('reorderLevel', n(d.reorder_level), 'reorder_level' in d)
  set('costPerUnit', n(d.cost_per_unit), 'cost_per_unit' in d)
  set('currentStock', d.current_stock ?? undefined, 'current_stock' in d && d.current_stock != null)
  set('status', n(d.status), 'status' in d)
  set('notes', n(d.notes), 'notes' in d)
  set('selectedSupplier', n(d.selected_supplier), 'selected_supplier' in d)
  set('sourceType', n(d.source_type), 'source_type' in d)
  return out
}

export const stockCreate = mutation({
  args: { token: v.optional(v.string()), data: v.object(stockFields) },
  handler: async (ctx, { token, data }) => {
    await requireRole(ctx, token, MANAGERS)
    if (!data.name) throw new Error('INVALID: name required')
    const p = stockPatch(data)
    const idNew = await ctx.db.insert('stockItems', {
      name: data.name,
      currentStock: 0,
      ...Object.fromEntries(Object.entries(p).filter(([, val]) => val !== undefined)),
    } as any)
    return stockOut((await ctx.db.get('stockItems', idNew))!)
  },
})

/** Pure update. NOTE: the UI pairs current_stock edits with an explicit ledger write (ledgerWrite), so no ledger row here. */
export const stockUpdate = mutation({
  args: { token: v.optional(v.string()), id: v.string(), data: v.object(stockFields) },
  handler: async (ctx, { token, id, data }) => {
    await requireRole(ctx, token, MANAGERS)
    const sid = nid(ctx, 'stockItems', id)
    await ctx.db.patch('stockItems', sid, stockPatch(data) as any)
    return stockOut((await ctx.db.get('stockItems', sid))!)
  },
})

export const stockDelete = mutation({
  args: { token: v.optional(v.string()), id: v.string() },
  handler: async (ctx, { token, id }) => {
    await requireRole(ctx, token, MANAGERS)
    const sid = nid(ctx, 'stockItems', id)
    // clean dependants so no dangling ingredient ids remain
    for (const r of await ctx.db.query('recipes').withIndex('by_stock_item', (q) => q.eq('stockItemId', sid)).collect())
      await ctx.db.delete('recipes', r._id)
    for (const r of await ctx.db.query('subRecipeIngredients').collect())
      if (r.parentItemId === sid || r.childItemId === sid) await ctx.db.delete('subRecipeIngredients', r._id)
    for (const r of await ctx.db.query('itemSuppliers').withIndex('by_item', (q) => q.eq('itemId', sid)).collect())
      await ctx.db.delete('itemSuppliers', r._id)
    await ctx.db.delete('stockItems', sid)
    return null
  },
})

// =====================================================================
// Inventory categories
// =====================================================================
export const categoryList = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    await requireRole(ctx, token, ALL_STAFF)
    const rows = await ctx.db.query('inventoryCategories').collect()
    rows.sort((a, b) => a.name.localeCompare(b.name))
    return rows.map(categoryOut)
  },
})
export const categoryCreate = mutation({
  args: { token: v.optional(v.string()), name: v.string() },
  handler: async (ctx, { token, name }) => {
    await requireRole(ctx, token, MANAGERS)
    const dup = await ctx.db.query('inventoryCategories').withIndex('by_name', (q) => q.eq('name', name)).first()
    if (dup) throw new Error('DUPLICATE: category already exists')
    const cid = await ctx.db.insert('inventoryCategories', { name })
    return categoryOut((await ctx.db.get('inventoryCategories', cid))!)
  },
})
export const categoryUpdate = mutation({
  args: { token: v.optional(v.string()), id: v.string(), name: v.string() },
  handler: async (ctx, { token, id, name }) => {
    await requireRole(ctx, token, MANAGERS)
    const cid = nid(ctx, 'inventoryCategories', id)
    await ctx.db.patch('inventoryCategories', cid, { name })
    return categoryOut((await ctx.db.get('inventoryCategories', cid))!)
  },
})
export const categoryDelete = mutation({
  args: { token: v.optional(v.string()), id: v.string() },
  handler: async (ctx, { token, id }) => {
    await requireRole(ctx, token, MANAGERS)
    await ctx.db.delete('inventoryCategories', nid(ctx, 'inventoryCategories', id))
    return null
  },
})

// =====================================================================
// Suppliers + item suppliers
// =====================================================================
export const supplierList = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    await requireRole(ctx, token, ALL_STAFF)
    const rows = await ctx.db.query('suppliers').collect()
    rows.sort((a, b) => a.name.localeCompare(b.name))
    return rows.map(supplierOut)
  },
})
const supplierFields = {
  name: v.optional(v.string()),
  contact_name: nul(v.string()),
  phone: nul(v.string()),
  email: nul(v.string()),
  address: nul(v.string()),
  is_active: v.optional(v.boolean()),
}
function supplierPatch(d: Record<string, any>) {
  const out: Record<string, unknown> = {}
  const map: Array<[string, string]> = [
    ['name', 'name'], ['contact_name', 'contactName'], ['phone', 'phone'],
    ['email', 'email'], ['address', 'address'], ['is_active', 'isActive'],
  ]
  for (const [from, to] of map) if (from in d) out[to] = d[from] === null ? undefined : d[from]
  return out
}
export const supplierCreate = mutation({
  args: { token: v.optional(v.string()), data: v.object(supplierFields) },
  handler: async (ctx, { token, data }) => {
    await requireRole(ctx, token, MANAGERS)
    if (!data.name) throw new Error('INVALID: name required')
    const p = supplierPatch(data)
    const sid = await ctx.db.insert('suppliers', {
      isActive: true,
      ...Object.fromEntries(Object.entries(p).filter(([, val]) => val !== undefined)),
      name: data.name,
    } as any)
    return supplierOut((await ctx.db.get('suppliers', sid))!)
  },
})
export const supplierUpdate = mutation({
  args: { token: v.optional(v.string()), id: v.string(), data: v.object(supplierFields) },
  handler: async (ctx, { token, id, data }) => {
    await requireRole(ctx, token, MANAGERS)
    const sid = nid(ctx, 'suppliers', id)
    await ctx.db.patch('suppliers', sid, supplierPatch(data) as any)
    return supplierOut((await ctx.db.get('suppliers', sid))!)
  },
})

async function itemSupplierRows(ctx: Ctx, rows: Array<Doc<'itemSuppliers'>>) {
  const out = []
  for (const r of rows) {
    const s = await ctx.db.get('suppliers', r.supplierId)
    out.push({
      id: r._id as string,
      item_id: r.itemId as string,
      supplier_id: r.supplierId as string,
      price: r.price,
      is_preferred: r.isPreferred,
      created_at: toIso(r._creationTime),
      suppliers: s ? supplierOut(s) : undefined,
    })
  }
  return out
}
export const itemSupplierList = query({
  args: { token: v.optional(v.string()), itemId: v.optional(v.string()) },
  handler: async (ctx, { token, itemId }) => {
    await requireRole(ctx, token, ALL_STAFF)
    if (itemId) {
      const sid = maybeNid(ctx, 'stockItems', itemId)
      if (!sid) return []
      return itemSupplierRows(ctx, await ctx.db.query('itemSuppliers').withIndex('by_item', (q) => q.eq('itemId', sid)).collect())
    }
    return itemSupplierRows(ctx, await ctx.db.query('itemSuppliers').collect())
  },
})
export const itemSupplierCreate = mutation({
  args: {
    token: v.optional(v.string()),
    data: v.object({
      item_id: v.string(),
      supplier_id: v.string(),
      price: v.number(),
      is_preferred: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { token, data }) => {
    await requireRole(ctx, token, MANAGERS)
    const itemId = nid(ctx, 'stockItems', data.item_id)
    const supplierId = nid(ctx, 'suppliers', data.supplier_id)
    const dup = (await ctx.db.query('itemSuppliers').withIndex('by_item', (q) => q.eq('itemId', itemId)).collect()).find(
      (r) => r.supplierId === supplierId,
    )
    if (dup) throw new Error('DUPLICATE: quote for this supplier already exists')
    const rid = await ctx.db.insert('itemSuppliers', {
      itemId,
      supplierId,
      price: data.price,
      isPreferred: data.is_preferred ?? false,
    })
    return (await itemSupplierRows(ctx, [(await ctx.db.get('itemSuppliers', rid))!]))[0]
  },
})
export const itemSupplierDelete = mutation({
  args: { token: v.optional(v.string()), id: v.string() },
  handler: async (ctx, { token, id }) => {
    await requireRole(ctx, token, MANAGERS)
    await ctx.db.delete('itemSuppliers', nid(ctx, 'itemSuppliers', id))
    return null
  },
})

// =====================================================================
// Ledger
// =====================================================================
/**
 * Pure log (does NOT change stock; the UI updates stock first via stockUpdate).
 * Quantity is stored SIGNED (OUT => negative); previous/new stock derived from the item's current stock.
 */
export const ledgerWrite = mutation({
  args: {
    token: v.optional(v.string()),
    data: v.object({
      item_id: v.string(),
      change_type: v.string(),
      quantity: v.number(),
      notes: v.optional(v.string()),
      reference_id: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { token, data }) => {
    await requireRole(ctx, token, MANAGERS)
    const stockItemId = nid(ctx, 'stockItems', data.item_id)
    const item = await ctx.db.get('stockItems', stockItemId)
    const ct = data.change_type.toUpperCase()
    const signed = ct === 'OUT' ? -Math.abs(data.quantity) : data.quantity
    await ctx.db.insert('inventoryLedger', {
      stockItemId,
      type: ct === 'IN' || ct === 'OUT' ? ct : undefined,
      changeType: data.change_type,
      quantity: signed,
      previousStock: item ? item.currentStock - signed : undefined,
      newStock: item?.currentStock,
      notes: data.notes,
      referenceId: data.reference_id,
    })
    return null
  },
})

/**
 * Stocktake ledger entries (used by StocktakePage fallback + void). Sets the item's stock to `new_stock`
 * when given, so a void really reverts the adjustment.
 */
export const stocktakeLedgerWrite = mutation({
  args: {
    token: v.optional(v.string()),
    data: v.object({
      item_id: v.string(),
      type: v.optional(v.string()),
      amount: v.optional(v.number()),
      previous_stock: v.optional(v.number()),
      new_stock: v.optional(v.number()),
      note: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { token, data }) => {
    await requireRole(ctx, token, MANAGERS)
    const stockItemId = nid(ctx, 'stockItems', data.item_id)
    const item = await ctx.db.get('stockItems', stockItemId)
    if (!item) throw new Error('NOT_FOUND: stock item')
    const prev = data.previous_stock ?? item.currentStock
    const next = data.new_stock ?? item.currentStock
    if (data.new_stock !== undefined) await ctx.db.patch('stockItems', stockItemId, { currentStock: next })
    await ctx.db.insert('inventoryLedger', {
      stockItemId,
      type: data.type,
      changeType: 'stocktake',
      quantity: next - prev,
      previousStock: prev,
      newStock: next,
      notes: data.note,
    })
    return null
  },
})

// =====================================================================
// Recipes + sub recipes
// =====================================================================
export const recipeList = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    await readAccess(ctx, token, true)
    return (await ctx.db.query('recipes').collect()).map(recipeOut)
  },
})
export const recipeCreate = mutation({
  args: {
    token: v.optional(v.string()),
    data: v.object({
      product_id: v.string(),
      inventory_item_id: v.string(),
      quantity: v.number(),
      variant: nul(v.string()),
    }),
  },
  handler: async (ctx, { token, data }) => {
    await requireRole(ctx, token, MANAGERS)
    const menuId = nid(ctx, 'menus', data.product_id)
    const stockItemId = nid(ctx, 'stockItems', data.inventory_item_id)
    const variant = data.variant ?? undefined
    const dup = (await ctx.db.query('recipes').withIndex('by_menu', (q) => q.eq('menuId', menuId)).collect()).find(
      (r) => r.stockItemId === stockItemId && (r.variant ?? undefined) === variant,
    )
    if (dup) throw new Error('DUPLICATE: ingredient already in recipe')
    const rid = await ctx.db.insert('recipes', { menuId, stockItemId, quantity: data.quantity, variant })
    return recipeOut((await ctx.db.get('recipes', rid))!)
  },
})
export const recipeUpdate = mutation({
  args: { token: v.optional(v.string()), id: v.string(), quantity: v.number() },
  handler: async (ctx, { token, id, quantity }) => {
    await requireRole(ctx, token, MANAGERS)
    await ctx.db.patch('recipes', nid(ctx, 'recipes', id), { quantity })
    return { quantity }
  },
})
export const recipeDelete = mutation({
  args: { token: v.optional(v.string()), id: v.string() },
  handler: async (ctx, { token, id }) => {
    await requireRole(ctx, token, MANAGERS)
    await ctx.db.delete('recipes', nid(ctx, 'recipes', id))
    return null
  },
})

export const subRecipeList = query({
  args: { token: v.optional(v.string()), parentId: v.optional(v.string()), withChild: v.optional(v.boolean()) },
  handler: async (ctx, { token, parentId, withChild }) => {
    await readAccess(ctx, token, true)
    let rows: Array<Doc<'subRecipeIngredients'>>
    if (parentId) {
      const pid = maybeNid(ctx, 'stockItems', parentId)
      if (!pid) return []
      rows = await ctx.db.query('subRecipeIngredients').withIndex('by_parent', (q) => q.eq('parentItemId', pid)).collect()
    } else {
      rows = await ctx.db.query('subRecipeIngredients').collect()
    }
    const session = await getSession(ctx, token)
    const out = []
    for (const r of rows) {
      const base = subOut(r)
      if (withChild) {
        const child = await ctx.db.get('stockItems', r.childItemId)
        const c = child ? stockOut(child, !session) : undefined
        out.push({ ...base, childItem: c, stock_items: c })
      } else out.push(base)
    }
    return out
  },
})
export const subRecipeCreate = mutation({
  args: {
    token: v.optional(v.string()),
    data: v.object({ parent_item_id: v.string(), child_item_id: v.string(), quantity: v.number() }),
  },
  handler: async (ctx, { token, data }) => {
    await requireRole(ctx, token, MANAGERS)
    const parentItemId = nid(ctx, 'stockItems', data.parent_item_id)
    const childItemId = nid(ctx, 'stockItems', data.child_item_id)
    const dup = (
      await ctx.db.query('subRecipeIngredients').withIndex('by_parent', (q) => q.eq('parentItemId', parentItemId)).collect()
    ).find((r) => r.childItemId === childItemId)
    if (dup) throw new Error('DUPLICATE: ingredient already in sub-recipe')
    const rid = await ctx.db.insert('subRecipeIngredients', { parentItemId, childItemId, quantity: data.quantity })
    return subOut((await ctx.db.get('subRecipeIngredients', rid))!)
  },
})
export const subRecipeUpdate = mutation({
  args: { token: v.optional(v.string()), id: v.string(), quantity: v.number() },
  handler: async (ctx, { token, id, quantity }) => {
    await requireRole(ctx, token, MANAGERS)
    await ctx.db.patch('subRecipeIngredients', nid(ctx, 'subRecipeIngredients', id), { quantity })
    return { quantity }
  },
})
export const subRecipeDelete = mutation({
  args: { token: v.optional(v.string()), id: v.string() },
  handler: async (ctx, { token, id }) => {
    await requireRole(ctx, token, MANAGERS)
    await ctx.db.delete('subRecipeIngredients', nid(ctx, 'subRecipeIngredients', id))
    return null
  },
})

// =====================================================================
// Purchase orders
// =====================================================================
function poOut(d: Doc<'purchaseOrders'>, supplier?: Doc<'suppliers'> | null) {
  return {
    id: d._id as string,
    po_number: d.poNumber ?? null,
    supplier_id: (d.supplierId as string | undefined) ?? null,
    status: d.status,
    total_amount: d.totalAmount ?? 0,
    notes: d.notes ?? null,
    expected_date: d.expectedDate ?? null,
    created_at: toIso(d._creationTime),
    updated_at: toIso(d._creationTime),
    received_at: toIso(d.receivedAt),
    received_by: (d.receivedBy as string | undefined) ?? null,
    suppliers: supplier ? { name: supplier.name } : undefined,
  }
}
export const poList = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    await requireRole(ctx, token, MANAGERS)
    const rows = await ctx.db.query('purchaseOrders').order('desc').collect()
    const out = []
    for (const r of rows) out.push(poOut(r, r.supplierId ? await ctx.db.get('suppliers', r.supplierId) : null))
    return out
  },
})
export const poItemList = query({
  args: { token: v.optional(v.string()), poId: v.string() },
  handler: async (ctx, { token, poId }) => {
    await requireRole(ctx, token, MANAGERS)
    const pid = maybeNid(ctx, 'purchaseOrders', poId)
    if (!pid) return []
    const rows = await ctx.db.query('purchaseOrderItems').withIndex('by_po', (q) => q.eq('poId', pid)).collect()
    const out = []
    for (const r of rows) {
      const s = await ctx.db.get('stockItems', r.stockItemId)
      out.push({
        id: r._id as string,
        po_id: r.poId as string,
        inventory_item_id: r.stockItemId as string,
        quantity_ordered: r.quantityOrdered,
        quantity_received: r.quantityReceived ?? 0,
        unit_price: r.unitPrice,
        total_price: r.totalPrice,
        created_at: toIso(r._creationTime),
        stock_items: s ? { name: s.name, unit: s.unit ?? null } : undefined,
      })
    }
    return out
  },
})
const poFields = {
  po_number: nul(v.string()),
  supplier_id: nul(v.string()),
  status: v.optional(v.string()),
  total_amount: nul(v.number()),
  notes: nul(v.string()),
  expected_date: nul(v.string()),
}
function poPatch(ctx: Ctx, d: Record<string, any>) {
  const out: Record<string, unknown> = {}
  const n = (x: any) => (x === null ? undefined : x)
  if ('po_number' in d) out.poNumber = n(d.po_number)
  if ('supplier_id' in d) out.supplierId = d.supplier_id ? (maybeNid(ctx, 'suppliers', d.supplier_id) ?? undefined) : undefined
  if ('status' in d && d.status !== undefined) out.status = d.status
  if ('total_amount' in d) out.totalAmount = n(d.total_amount)
  if ('notes' in d) out.notes = n(d.notes)
  if ('expected_date' in d) out.expectedDate = n(d.expected_date)
  return out
}
export const poCreate = mutation({
  args: { token: v.optional(v.string()), data: v.object(poFields) },
  handler: async (ctx, { token, data }) => {
    await requireRole(ctx, token, MANAGERS)
    const p = poPatch(ctx, data)
    const pid = await ctx.db.insert('purchaseOrders', {
      status: 'draft',
      ...Object.fromEntries(Object.entries(p).filter(([, val]) => val !== undefined)),
    } as any)
    const d = (await ctx.db.get('purchaseOrders', pid))!
    return poOut(d, d.supplierId ? await ctx.db.get('suppliers', d.supplierId) : null)
  },
})
export const poUpdate = mutation({
  args: { token: v.optional(v.string()), id: v.string(), data: v.object(poFields) },
  handler: async (ctx, { token, id, data }) => {
    await requireRole(ctx, token, MANAGERS)
    const pid = nid(ctx, 'purchaseOrders', id)
    await ctx.db.patch('purchaseOrders', pid, poPatch(ctx, data) as any)
    const d = (await ctx.db.get('purchaseOrders', pid))!
    return poOut(d, d.supplierId ? await ctx.db.get('suppliers', d.supplierId) : null)
  },
})
const poItemInput = v.object({
  po_id: v.string(),
  inventory_item_id: v.string(),
  quantity_ordered: v.number(),
  quantity_received: v.optional(v.number()),
  unit_price: v.number(),
  total_price: v.number(),
})
export const poItemsCreate = mutation({
  args: { token: v.optional(v.string()), items: v.array(poItemInput) },
  handler: async (ctx, { token, items }) => {
    await requireRole(ctx, token, MANAGERS)
    const out = []
    for (const i of items) {
      const rid = await ctx.db.insert('purchaseOrderItems', {
        poId: nid(ctx, 'purchaseOrders', i.po_id),
        stockItemId: nid(ctx, 'stockItems', i.inventory_item_id),
        quantityOrdered: i.quantity_ordered,
        quantityReceived: i.quantity_received ?? 0,
        unitPrice: i.unit_price,
        totalPrice: i.total_price,
      })
      const r = (await ctx.db.get('purchaseOrderItems', rid))!
      out.push({
        id: r._id as string,
        po_id: r.poId as string,
        inventory_item_id: r.stockItemId as string,
        quantity_ordered: r.quantityOrdered,
        quantity_received: r.quantityReceived ?? 0,
        unit_price: r.unitPrice,
        total_price: r.totalPrice,
        created_at: toIso(r._creationTime),
      })
    }
    return out
  },
})
export const poItemUpdate = mutation({
  args: {
    token: v.optional(v.string()),
    id: v.string(),
    data: v.object({
      quantity_ordered: v.optional(v.number()),
      quantity_received: v.optional(v.number()),
      unit_price: v.optional(v.number()),
      total_price: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { token, id, data }) => {
    await requireRole(ctx, token, MANAGERS)
    const rid = nid(ctx, 'purchaseOrderItems', id)
    const patch: Record<string, number> = {}
    if (data.quantity_ordered !== undefined) patch.quantityOrdered = data.quantity_ordered
    if (data.quantity_received !== undefined) patch.quantityReceived = data.quantity_received
    if (data.unit_price !== undefined) patch.unitPrice = data.unit_price
    if (data.total_price !== undefined) patch.totalPrice = data.total_price
    await ctx.db.patch('purchaseOrderItems', rid, patch)
    const r = (await ctx.db.get('purchaseOrderItems', rid))!
    return {
      id: r._id as string,
      po_id: r.poId as string,
      inventory_item_id: r.stockItemId as string,
      quantity_ordered: r.quantityOrdered,
      quantity_received: r.quantityReceived ?? 0,
      unit_price: r.unitPrice,
      total_price: r.totalPrice,
      created_at: toIso(r._creationTime),
    }
  },
})

/** Port of rpc receive_purchase_order: status received, per-item quantity_received, stock += qty, ledger 'po_receive'. */
export const poReceive = mutation({
  args: {
    token: v.optional(v.string()),
    poId: v.string(),
    items: v.array(
      v.object({ inventory_item_id: v.string(), quantity_received: v.number(), unit_price: v.optional(v.number()) }),
    ),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, { token, poId, items, notes }) => {
    const session = await requireRole(ctx, token, MANAGERS)
    const pid = nid(ctx, 'purchaseOrders', poId)
    const po = await ctx.db.get('purchaseOrders', pid)
    if (!po) throw new Error('NOT_FOUND: purchase order')
    if (po.status === 'received') throw new Error('ALREADY_RECEIVED')
    await ctx.db.patch('purchaseOrders', pid, {
      status: 'received',
      receivedAt: Date.now(),
      receivedBy: session.staffId,
      ...(notes ? { notes } : {}),
    })
    const lines = await ctx.db.query('purchaseOrderItems').withIndex('by_po', (q) => q.eq('poId', pid)).collect()
    for (const it of items) {
      const stockItemId = nid(ctx, 'stockItems', it.inventory_item_id)
      const line = lines.find((l) => l.stockItemId === stockItemId)
      if (line) await ctx.db.patch('purchaseOrderItems', line._id, { quantityReceived: it.quantity_received })
      const stock = await ctx.db.get('stockItems', stockItemId)
      if (!stock) continue
      const next = (stock.currentStock ?? 0) + it.quantity_received
      await ctx.db.patch('stockItems', stockItemId, { currentStock: next })
      await ctx.db.insert('inventoryLedger', {
        stockItemId,
        type: 'IN',
        changeType: 'po_receive',
        quantity: it.quantity_received,
        previousStock: stock.currentStock,
        newStock: next,
        notes: `Received from PO ${po.poNumber ?? poId}`,
        referenceId: poId,
      })
    }
    return [{ po_id: poId, status: 'received' }]
  },
})

// =====================================================================
// Stocktakes
// =====================================================================
const stocktakeOut = (d: Doc<'stocktakes'>) => ({
  id: d._id as string,
  name: d.name ?? null,
  status: d.status,
  created_by: d.createdBy ?? null,
  started_at: toIso(d.startedAt),
  completed_at: toIso(d.completedAt),
  notes: d.notes ?? null,
  total_items: d.totalItems ?? 0,
  total_variance: d.totalVariance ?? 0,
  created_at: toIso(d._creationTime),
})
function stItemOut(d: Doc<'stocktakeItems'>, stock?: Doc<'stockItems'> | null) {
  const system = d.systemQuantity ?? 0
  const actual = d.actualQuantity ?? 0
  const variance = actual - system
  return {
    id: d._id as string,
    stocktake_id: d.stocktakeId as string,
    stock_item_id: d.stockItemId as string,
    system_quantity: system,
    actual_quantity: actual,
    variance,
    unit: d.unit ?? null,
    unit_cost: d.unitCost ?? 0,
    variance_value: variance * (d.unitCost ?? 0),
    note: d.note ?? null,
    created_at: toIso(d._creationTime),
    ...(stock !== undefined ? { stock_items: stock ? { name: stock.name, category: stock.category ?? null } : undefined } : {}),
  }
}

export const stocktakeList = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    await requireRole(ctx, token, MANAGERS)
    const rows = await ctx.db.query('stocktakes').order('desc').collect()
    rows.sort((a, b) => b.startedAt - a.startedAt)
    return rows.map(stocktakeOut)
  },
})
export const stocktakeItemList = query({
  args: { token: v.optional(v.string()), stocktakeId: v.string(), withStock: v.optional(v.boolean()) },
  handler: async (ctx, { token, stocktakeId, withStock }) => {
    await requireRole(ctx, token, MANAGERS)
    const sid = maybeNid(ctx, 'stocktakes', stocktakeId)
    if (!sid) return []
    const rows = await ctx.db.query('stocktakeItems').withIndex('by_stocktake', (q) => q.eq('stocktakeId', sid)).collect()
    const out = []
    for (const r of rows) out.push(stItemOut(r, withStock ? await ctx.db.get('stockItems', r.stockItemId) : undefined))
    return out
  },
})
export const stocktakeCreate = mutation({
  args: {
    token: v.optional(v.string()),
    data: v.object({ name: nul(v.string()), status: v.optional(v.string()), created_by: nul(v.string()), notes: nul(v.string()) }),
  },
  handler: async (ctx, { token, data }) => {
    const s = await requireRole(ctx, token, MANAGERS)
    const sid = await ctx.db.insert('stocktakes', {
      name: data.name ?? undefined,
      status: data.status ?? 'draft',
      createdBy: data.created_by ?? s.name,
      notes: data.notes ?? undefined,
      startedAt: Date.now(),
    })
    return stocktakeOut((await ctx.db.get('stocktakes', sid))!)
  },
})
export const stocktakeItemsInsert = mutation({
  args: {
    token: v.optional(v.string()),
    items: v.array(
      v.object({
        stocktake_id: v.string(),
        stock_item_id: v.string(),
        system_quantity: v.optional(v.number()),
        actual_quantity: v.optional(v.number()),
        unit: v.optional(v.union(v.string(), v.null())),
        unit_cost: v.optional(v.union(v.number(), v.null())),
        note: v.optional(v.union(v.string(), v.null())),
      }),
    ),
  },
  handler: async (ctx, { token, items }) => {
    await requireRole(ctx, token, MANAGERS)
    for (const i of items) {
      await ctx.db.insert('stocktakeItems', {
        stocktakeId: nid(ctx, 'stocktakes', i.stocktake_id),
        stockItemId: nid(ctx, 'stockItems', i.stock_item_id),
        systemQuantity: i.system_quantity,
        actualQuantity: i.actual_quantity,
        unit: i.unit ?? undefined,
        unitCost: i.unit_cost ?? undefined,
        note: i.note ?? undefined,
      })
    }
    return null
  },
})
export const stocktakeItemUpdate = mutation({
  args: {
    token: v.optional(v.string()),
    stocktakeId: v.string(),
    stockItemId: v.string(),
    data: v.object({ actual_quantity: v.optional(v.number()), note: nul(v.string()) }),
  },
  handler: async (ctx, { token, stocktakeId, stockItemId, data }) => {
    await requireRole(ctx, token, MANAGERS)
    const sid = nid(ctx, 'stocktakes', stocktakeId)
    const item = nid(ctx, 'stockItems', stockItemId)
    const row = (await ctx.db.query('stocktakeItems').withIndex('by_stocktake', (q) => q.eq('stocktakeId', sid)).collect()).find(
      (r) => r.stockItemId === item,
    )
    if (!row) return null
    const patch: Record<string, unknown> = {}
    if (data.actual_quantity !== undefined) patch.actualQuantity = data.actual_quantity
    if ('note' in data) patch.note = data.note ?? undefined
    await ctx.db.patch('stocktakeItems', row._id, patch)
    return null
  },
})
export const stocktakeUpdate = mutation({
  args: {
    token: v.optional(v.string()),
    id: v.string(),
    data: v.object({
      status: v.optional(v.string()),
      completed_at: nul(v.string()),
      notes: nul(v.string()),
      total_items: v.optional(v.number()),
      total_variance: v.optional(v.number()),
      name: nul(v.string()),
    }),
  },
  handler: async (ctx, { token, id, data }) => {
    await requireRole(ctx, token, MANAGERS)
    const patch: Record<string, unknown> = {}
    if (data.status !== undefined) patch.status = data.status
    if ('completed_at' in data) patch.completedAt = fromIso(data.completed_at)
    if ('notes' in data) patch.notes = data.notes ?? undefined
    if (data.total_items !== undefined) patch.totalItems = data.total_items
    if (data.total_variance !== undefined) patch.totalVariance = data.total_variance
    if ('name' in data) patch.name = data.name ?? undefined
    await ctx.db.patch('stocktakes', nid(ctx, 'stocktakes', id), patch)
    return null
  },
})

/**
 * Port of rpc complete_stocktake: stock = counted, stocktake_items.actual updated, ledger 'stocktake' with the
 * variance vs the live stock, then stocktake marked completed (totals filled in like the UI fallback did).
 */
export const stocktakeComplete = mutation({
  args: {
    token: v.optional(v.string()),
    stocktakeId: v.string(),
    items: v.array(v.object({ stock_item_id: v.string(), counted_qty: v.number() })),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, { token, stocktakeId, items, notes }) => {
    await requireRole(ctx, token, MANAGERS)
    const sid = nid(ctx, 'stocktakes', stocktakeId)
    const st = await ctx.db.get('stocktakes', sid)
    if (!st) throw new Error('NOT_FOUND: stocktake')
    if (st.status === 'completed') throw new Error('ALREADY_COMPLETED')
    const rows = await ctx.db.query('stocktakeItems').withIndex('by_stocktake', (q) => q.eq('stocktakeId', sid)).collect()
    for (const it of items) {
      const stockItemId = nid(ctx, 'stockItems', it.stock_item_id)
      const stock = await ctx.db.get('stockItems', stockItemId)
      if (!stock) continue
      const variance = it.counted_qty - (stock.currentStock ?? 0)
      await ctx.db.patch('stockItems', stockItemId, { currentStock: it.counted_qty })
      const row = rows.find((r) => r.stockItemId === stockItemId)
      if (row) await ctx.db.patch('stocktakeItems', row._id, { actualQuantity: it.counted_qty })
      if (variance !== 0)
        await ctx.db.insert('inventoryLedger', {
          stockItemId,
          type: variance > 0 ? 'IN' : 'OUT',
          changeType: 'stocktake',
          quantity: variance,
          previousStock: stock.currentStock,
          newStock: it.counted_qty,
          notes: 'Stocktake adjustment',
          referenceId: stocktakeId,
        })
    }
    const fresh = await ctx.db.query('stocktakeItems').withIndex('by_stocktake', (q) => q.eq('stocktakeId', sid)).collect()
    const totalVariance = fresh.reduce((s, r) => s + ((r.actualQuantity ?? 0) - (r.systemQuantity ?? 0)), 0)
    await ctx.db.patch('stocktakes', sid, {
      status: 'completed',
      completedAt: Date.now(),
      totalItems: fresh.length,
      totalVariance,
      ...(notes ? { notes } : {}),
    })
    return [{ stocktake_id: stocktakeId, status: 'completed' }]
  },
})

// =====================================================================
// Diagnostics
// =====================================================================
const DIAG_TABLES = {
  settings: 'posSettings',
  staff_pins: 'staffPins',
  restaurant_tables: 'restaurantTables',
  products: 'menus',
  product_categories: 'menuCategories',
  orders: 'posOrders',
  order_items: 'posOrderItems',
  shifts: 'shifts',
  stock_items: 'stockItems',
  inventory_ledger: 'inventoryLedger',
  recipes: 'recipes',
  sub_recipe_ingredients: 'subRecipeIngredients',
  suppliers: 'suppliers',
  item_suppliers: 'itemSuppliers',
  purchase_orders: 'purchaseOrders',
  purchase_order_items: 'purchaseOrderItems',
  customers: 'customers',
  gift_cards: 'giftCards',
  gift_card_transactions: 'giftCardTransactions',
  stocktakes: 'stocktakes',
  stocktake_items: 'stocktakeItems',
  inventory_categories: 'inventoryCategories',
  expenses: 'expenses',
  blog_posts: 'blogPosts',
  reservations: 'reservations',
  contacts: 'contacts',
} as const

/** Connectivity check per legacy table name. status: ok | missing (unknown table). */
export const diagnostics = query({
  args: { token: v.optional(v.string()), tables: v.array(v.string()) },
  handler: async (ctx, { token, tables }) => {
    await requireRole(ctx, token, MANAGERS)
    const out = []
    for (const t of tables) {
      const target = (DIAG_TABLES as Record<string, TableNames>)[t]
      if (!target) {
        out.push({ table: t, status: 'missing' as const, message: 'Table is not part of the Convex schema.' })
        continue
      }
      try {
        await ctx.db.query(target).first()
        out.push({ table: t, status: 'ok' as const, message: `Table connected successfully (${target}).` })
      } catch (e) {
        out.push({ table: t, status: 'error' as const, message: e instanceof Error ? e.message : 'error' })
      }
    }
    return out
  },
})
