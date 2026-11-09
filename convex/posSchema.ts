// DRAFT Convex schema for porting pos-lite (Supabase) onto the existing VT Thai Convex deployment.
// Not installed anywhere yet. Merge INTO the existing convex/schema.ts (existing tables stay untouched,
// except the optional fields added to `menus` at the bottom). Source: pos-lite backup 2026-11-04 (read-only).
//
// Conventions: uuid/int PKs -> Convex _id; created_at -> _creationTime; timestamps -> ms numbers;
// numeric -> v.number(); text[] -> v.array(v.string()); jsonb -> v.any(); every FK -> v.id(...).
// Money is stored in dollars (same as pos-lite) so formulas stay identical.
import { defineTable } from 'convex/server'
import { v } from 'convex/values'

const ts = v.number()
const opt = v.optional

export const posTables = {
  // server-side login sessions (token sent by the client on every POS call)
  authSessions: defineTable({
    token: v.string(),
    role: v.string(),
    name: v.string(),
    staffId: opt(v.id('staffPins')),
    expiresAt: v.number(),
  }).index('by_token', ['token']),

  // ---- multi-branch ----
  locations: defineTable({
    name: v.string(),
    address: opt(v.string()),
    phone: opt(v.string()),
    timezone: opt(v.string()),
    isActive: v.boolean(),
  }),

  // pos-lite `settings` (renamed: `siteInfo` already exists in this project)
  posSettings: defineTable({
    locationId: opt(v.id('locations')),
    isGlobal: opt(v.boolean()),
    storeName: opt(v.string()),
    storeAddress: opt(v.string()),
    storePhone: opt(v.string()),
    taxId: opt(v.string()),
    taxRate: v.number(),
    // Block orders when stock is insufficient. Keep false until the first stocktake (seeded stock starts at 0).
    enforceStock: opt(v.boolean()),
    receiptHeader: opt(v.string()),
    receiptFooter: opt(v.string()),
    defaultStartingCash: opt(v.number()),
    holidaySurcharge: opt(v.number()),
    eftposSurcharge: opt(v.number()),
    onlineOrdering: opt(v.any()),
    currency: opt(v.string()),
    currencyLocale: opt(v.string()),
    hardwareConfig: opt(v.any()),
    hardwareAutoPrint: opt(v.boolean()),
    hardwareCashDrawerAutoOpen: opt(v.boolean()),
    paymentRatioTarget: opt(v.number()),
    cogsTarget: opt(v.number()),
    laborTarget: opt(v.number()),
  }).index('by_location', ['locationId']),

  // ---- staff (PIN is HASHED here; pos-lite stored plain `pin` + RPC verify_staff_pin) ----
  staffPins: defineTable({
    name: v.string(),
    pinHash: v.string(),
    role: v.union(
      v.literal('ADMIN'),
      v.literal('MANAGER'),
      v.literal('CASHIER'),
      v.literal('KITCHEN'),
    ),
    locationId: opt(v.id('locations')),
  }).index('by_location', ['locationId']),

  // ---- floor ----
  restaurantTables: defineTable({
    tableNumber: v.string(),
    zone: opt(v.string()),
    capacity: opt(v.number()),
    isActive: v.boolean(),
    qrToken: opt(v.string()),
    locationId: opt(v.id('locations')),
  })
    .index('by_qr_token', ['qrToken'])
    .index('by_location', ['locationId']),

  tableSessions: defineTable({
    tableId: v.id('restaurantTables'),
    sessionToken: v.string(),
    status: v.string(),
    orderId: opt(v.id('posOrders')),
    expiresAt: opt(ts),
    lastActivityAt: opt(ts),
  })
    .index('by_token', ['sessionToken'])
    .index('by_table_and_status', ['tableId', 'status']),

  // ---- ingredients / inventory ----
  inventoryCategories: defineTable({ name: v.string() }).index('by_name', [
    'name',
  ]),

  stockItems: defineTable({
    itemCode: opt(v.string()),
    name: v.string(),
    category: opt(v.string()),
    unit: opt(v.string()),
    reorderLevel: opt(v.number()),
    costPerUnit: opt(v.number()),
    currentStock: v.number(),
    status: opt(v.string()),
    notes: opt(v.string()),
    selectedSupplier: opt(v.string()),
    sourceType: opt(v.string()),
    plu: opt(v.string()),
    locationId: opt(v.id('locations')),
    legacyId: opt(v.number()), // seeding only (pos-lite integer id); safe to drop later
  })
    .index('by_legacy_id', ['legacyId'])
    .index('by_category', ['category'])
    .index('by_location', ['locationId'])
    .searchIndex('search_name', { searchField: 'name' }),

  suppliers: defineTable({
    name: v.string(),
    contactName: opt(v.string()),
    phone: opt(v.string()),
    email: opt(v.string()),
    address: opt(v.string()),
    isActive: v.boolean(),
    legacyId: opt(v.string()), // seeding only (pos-lite uuid)
  }).index('by_legacy_id', ['legacyId']),
  itemSuppliers: defineTable({
    itemId: v.id('stockItems'),
    supplierId: v.id('suppliers'),
    price: v.number(),
    isPreferred: v.boolean(),
  })
    .index('by_item', ['itemId'])
    .index('by_supplier', ['supplierId']),

  // menu -> ingredient (variant = protein: none/Chicken/Beef/Duck/Prawn/Vegetarian)
  recipes: defineTable({
    menuId: v.id('menus'),
    stockItemId: v.id('stockItems'),
    quantity: v.number(),
    variant: opt(v.string()),
  })
    .index('by_menu', ['menuId'])
    .index('by_stock_item', ['stockItemId']),
  subRecipeIngredients: defineTable({
    parentItemId: v.id('stockItems'),
    childItemId: v.id('stockItems'),
    quantity: v.number(),
  }).index('by_parent', ['parentItemId']),

  inventoryLedger: defineTable({
    stockItemId: v.id('stockItems'),
    type: opt(v.string()),
    changeType: opt(v.string()),
    quantity: opt(v.number()),
    previousStock: opt(v.number()),
    newStock: opt(v.number()),
    notes: opt(v.string()),
    referenceId: opt(v.string()),
    locationId: opt(v.id('locations')),
  }).index('by_stock_item', ['stockItemId']),

  wasteLog: defineTable({
    stockItemId: v.id('stockItems'),
    locationId: opt(v.id('locations')),
    quantity: v.number(),
    reason: opt(v.string()),
    cost: opt(v.number()),
    recordedBy: opt(v.id('staffPins')),
    recordedAt: ts,
    notes: opt(v.string()),
  }).index('by_stock_item', ['stockItemId']),

  purchaseOrders: defineTable({
    poNumber: opt(v.string()),
    supplierId: opt(v.id('suppliers')),
    status: v.string(),
    totalAmount: opt(v.number()),
    notes: opt(v.string()),
    expectedDate: opt(v.string()),
    receivedAt: opt(ts),
    receivedBy: opt(v.id('staffPins')),
  }).index('by_status', ['status']),
  purchaseOrderItems: defineTable({
    poId: v.id('purchaseOrders'),
    stockItemId: v.id('stockItems'),
    quantityOrdered: v.number(),
    quantityReceived: opt(v.number()),
    unitPrice: v.number(),
    totalPrice: v.number(),
  }).index('by_po', ['poId']),

  stocktakes: defineTable({
    name: opt(v.string()),
    status: v.string(),
    createdBy: opt(v.string()),
    startedAt: ts,
    completedAt: opt(ts),
    notes: opt(v.string()),
    totalItems: opt(v.number()),
    totalVariance: opt(v.number()),
  }),
  // variance / varianceValue were GENERATED columns: compute in code
  stocktakeItems: defineTable({
    stocktakeId: v.id('stocktakes'),
    stockItemId: v.id('stockItems'),
    systemQuantity: opt(v.number()),
    actualQuantity: opt(v.number()),
    unit: opt(v.string()),
    unitCost: opt(v.number()),
    note: opt(v.string()),
  }).index('by_stocktake', ['stocktakeId']),

  // ---- sales ----
  shifts: defineTable({
    startedAt: ts,
    endedAt: opt(ts),
    startingCash: v.number(),
    expectedCash: opt(v.number()),
    actualCash: opt(v.number()),
    totalSales: v.number(),
    status: v.string(),
    notes: opt(v.string()),
    openedByStaff: opt(v.id('staffPins')),
    closedByStaff: opt(v.id('staffPins')),
    locationId: opt(v.id('locations')),
  }).index('by_status', ['status']),

  // Separate from the existing website `orders` table so the live site keeps working.
  posOrders: defineTable({
    subtotal: v.number(),
    tax: v.number(),
    total: v.number(),
    paymentMethod: v.string(),
    status: v.string(),
    orderType: opt(v.string()),
    timestamp: ts,
    shiftId: opt(v.id('shifts')),
    customerId: opt(v.id('customers')),
    customerName: opt(v.string()),
    deliveryAddress: opt(v.string()),
    deliveryPhone: opt(v.string()),
    deliveryName: opt(v.string()),
    locationId: opt(v.id('locations')),
    staffId: opt(v.id('staffPins')),
    tableId: opt(v.id('restaurantTables')),
    source: opt(v.string()),
    clientId: v.string(),
    scheduledFor: opt(ts),
    orderSource: opt(v.string()),
    deliveryFee: opt(v.number()),
    slipStorageId: opt(v.id('_storage')),
  })
    .index('by_client_id', ['clientId'])
    .index('by_delivery_phone', ['deliveryPhone'])
    .index('by_status', ['status'])
    .index('by_shift', ['shiftId'])
    .index('by_timestamp', ['timestamp']),
  // subtotal = unitPrice * quantity (computed in code)
  posOrderItems: defineTable({
    orderId: v.id('posOrders'),
    menuId: opt(v.id('menus')),
    title: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    note: opt(v.string()),
    modifiers: opt(v.array(v.string())),
  })
    .index('by_order', ['orderId'])
    .index('by_menu', ['menuId']),
  paymentTransactions: defineTable({
    orderId: v.id('posOrders'),
    method: v.string(),
    amount: v.number(),
    reference: opt(v.string()),
    status: v.string(),
    processedAt: ts,
    notes: opt(v.string()),
  }).index('by_order', ['orderId']),

  // ---- customers / loyalty / gift cards ----
  customers: defineTable({
    name: v.string(),
    phone: opt(v.string()),
    email: opt(v.string()),
    points: v.number(),
    totalSpent: v.number(),
    lastVisit: opt(ts),
    visitCount: v.number(),
  }).index('by_phone', ['phone']),
  loyaltyTransactions: defineTable({
    customerId: v.id('customers'),
    orderId: opt(v.id('posOrders')),
    pointsDelta: v.number(),
    reason: opt(v.string()),
  }).index('by_customer', ['customerId']),
  giftCards: defineTable({
    code: v.string(),
    initialValue: v.number(),
    currentBalance: v.number(),
    purchasePrice: v.number(),
    customerId: opt(v.id('customers')),
    status: v.string(),
    expiresAt: opt(ts),
    notes: opt(v.string()),
  }).index('by_code', ['code']),
  giftCardTransactions: defineTable({
    giftCardId: v.id('giftCards'),
    orderId: opt(v.id('posOrders')),
    amount: v.number(),
    transactionType: v.string(),
    notes: opt(v.string()),
  }).index('by_card', ['giftCardId']),

  expenses: defineTable({
    date: v.string(),
    category: opt(v.string()),
    amount: v.number(),
    description: opt(v.string()),
    recurring: v.boolean(),
    locationId: opt(v.id('locations')),
  }).index('by_date', ['date']),
}

// ---- Optional fields to ADD to existing `menus` (all optional => no migration, site keeps working) ----
//   plu: v.optional(v.string()),  colorLabel: v.optional(v.string()),
//   nutrition: v.optional(v.object({ calories, protein, carbs, fat: v.optional(v.number()) })),
//   customizations: v.optional(v.any())   // [{name, options:[{name, priceAdjustment}], multiple, required}]
// `available` maps to pos-lite `is_active`; prices.{dineIn,takeaway,delivery} map to price / price_takeaway / price_delivery.
//
// NOT ported (already exist in this project or unrelated): blog_posts, contacts, reservations, promotions,
// products + product_categories (-> menus + menuCategories), ledger_items / ledger_owners / ledger_seed (separate ledger app).
