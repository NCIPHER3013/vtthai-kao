# Application Sitemap & Database Execution Plan

This document serves as the master blueprint for the GastroPOS Pro application. It maps every frontend route to its required database tables and outlines a step-by-step execution plan for full Supabase integration.

## 🗺️ Part 1: Application Sitemap

### 🏪 Front-of-House (FOH / End-User)
| Path | Component | Description | DB Tables Read/Written |
|---|---|---|---|
| `/store` | `WebstorePage` | QR-code / Customer self-ordering UI | `products`, `settings` (R) / `orders`, `order_items` (W) |
| `/bot` | `ChatbotPage` | AI-assisted ordering chat | `products`, `settings` (R) / `orders`, `order_items` (W) |
| `/login` | `LoginPage` | Staff authentication via PIN | `staff_pins` (R) |
| `/pos` | `POSPage` | Main cashier terminal & table mapping | `products`, `restaurant_tables`, `shifts` (R) / `orders`, `order_items` (W) |
| `/kds` | `KDSPage` | Kitchen Display System | `orders`, `order_items` (R/W) |

### ⚙️ Back-of-House (BOH / Admin Panel)
| Path | Component | Description | DB Tables Read/Written |
|---|---|---|---|
| `/admin` | `DashboardPage` | Real-time shift & brief daily stats | `shifts`, `orders` (R) |
| `/admin/super` | `SuperAdminPage` | Owner/Executive level charts & KPIs | `orders`, `order_items` (R) |
| `/admin/orders` | `OrdersPage` | Full order history & management | `orders`, `order_items` (R/W) |
| `/admin/shifts` | `ShiftPage` | Drawer management & shift closing | `shifts` (R/W) |
| `/admin/menu` | `MenuPage` | Product & category catalog setup | `products`, `product_categories` (R/W) |
| `/admin/recipe` | `RecipePage` | Tie menu items to raw ingredients | `recipes`, `products`, `stock_items`, `sub_recipe_ingredients` (R/W) |
| `/admin/inventory`| `InventoryPage` | Raw material tracking | `stock_items` (R/W) |
| `/admin/purchasing`| `PurchaseOrderPage`| Build & receive supply orders | `suppliers`, `purchase_orders`, `purchase_order_items` (R/W) |
| `/admin/crm` | `CRMPage` | Customer base, points & rewards loyalty | `customers` (R/W) |
| `/admin/staff` | `StaffPage` | Managing PINs and System Roles | `staff_pins` (R/W) |
| `/admin/tables` | `TableSetupPage` | Configure zones and seating charts | `restaurant_tables` (R/W) |
| `/admin/reports` | `ReportsPage` | Granular financial and sales reports | `orders`, `order_items` (R) |
| `/admin/hardware` | `HardwarePage` | Thermal printer & drawer IP config | *Local Storage Only (Device Specific)* |
| `/admin/settings` | `SettingsPage` | Store global config (Name, Tax, Bill) | `settings` (R/W) |
| `/admin/diagnostics`| `DatabaseDiagnosticsPage`| Built-in DB health check tool | *System Audit Tool* |

---

## 📈 Part 2: Database Orchestration Execution Plan

To ensure a "No Error" environment, we will construct the database methodically. I have divided the implementation into **4 Stages**. We will clear one stage completely before moving to the next.

### Stage 1: The Foundation (Infrastructure & Access)
Before we can sell food, we need a store, staff to run it, and tables to sit at.
- **Task 1.1:** Setup `settings` table (Tax rates, receipt headers).
- **Task 1.2:** Setup `staff_pins` table (Role-based access control, locking down the system mapping).
- **Task 1.3:** Setup `restaurant_tables` table (Zones and capacity for the POS).
- **Testing:** Run `/admin/diagnostics`. Verify these 3 tables light up green. Remove fallback code from `LoginPage` and `TableSetupPage`.

### Stage 2: The Catalog & Inventory (What we sell & what it's made of)
- **Task 2.1:** Setup Product ecosystem (`product_categories`, `products`, `product_customizations`).
- **Task 2.2:** Setup `stock_items` and `inventory_ledger` (Tracking raw stock values and manual adjustments).
- **Task 2.3:** Setup `recipes` and `sub_recipe_ingredients` (The bridge for auto-deducting raw stock).
- **Testing:** Create an item via `/admin/menu`, create a raw item via `/admin/inventory`, trigger an adjustment to check the ledger, and tie them together in `/admin/recipe`.

### Stage 3: The Transactions (The Money Engine)
This is where the complex operations occur. Orders must tie securely to the catalog, tables, and shifts.
- **Task 3.1:** Setup `shifts` table (Cash tracking).
- **Task 3.2:** Setup `orders` and `order_items` (The master transaction ledger).
- **Testing:** Open a shift in `/admin/shifts`, ring up an order via `/pos`, check it in `/kds`, and ensure it appears on the graphs in `/admin/super`.

### Stage 4: Advanced Operations (Supply Chain, Loyalty & Gift Cards)
Features that make this a "Pro" SaaS level application.
- **Task 4.1:** Setup `customers` (CRM logic and point balances).
- **Task 4.2:** Setup `gift_cards` and `gift_card_transactions` (Prepaid credit management).
- **Task 4.3:** Setup Supply Chain (`suppliers`, `item_suppliers`, `purchase_orders`, `purchase_order_items`).
- **Testing:** Sell a gift card and redeem it in `/pos`. Adjust a customer's points in `/admin/crm`. Generate and "receive" a Purchase Order in `/admin/purchasing` to ensure inventory automatically increments.

## 🏁 Workflow Agreement
1. I will provide the SQL script for **Task 1.1 - 1.3**.
2. You run the script in Supabase.
3. You click **Run Diagnostics** on `/admin/diagnostics`.
4. Once verified, I perform clean-up on the frontend code to lock it to the DB (removing local fallbacks).
5. We rinse and repeat logically down the stages.
