# Phase 2: Database Orchestration & Persistence Master Plan

## 🎯 Objective
Transition the GastroPOS Pro system from frontend mockups/local storage fallbacks to a fully integrated, error-free Database (Supabase PostgreSQL). 

## 📋 Comprehensive Audit (Tables to be Integrated)
Based on the current frontend, here are the required tables separated by modules.

### Module 1: Core Operations (Access & Physical Store)
- [ ] `settings`: Store name, tax rates, global config (Partially connected).
- [ ] `staff_pins`: Secure role-based login (Currently relies on bypass logic).
- [ ] `restaurant_tables`: Dine-in table management and states (Currently falls back to localStorage).

### Module 2: Inventory & Supply Chain
- [ ] `stock_items`: Raw material tracking.
- [ ] `recipe_ingredients`: Bill of materials connecting products to stock_items.
- [ ] `suppliers`: Supplier directory.
- [ ] `purchase_orders`: PO tracking.
- [ ] `purchase_order_items`: Line items for POs.

### Module 3: CRM & Loyalty
- [ ] `customers`: Centralized customer tracking (Partially connected).
- [ ] `reward_tiers`: Levels of loyalty points.
- [ ] `points_transactions`: Immutable ledger of point additions/deductions.

## 🧪 Testing Protocol ("No Error" Standard)
Every time a table is implemented, a test suite function must be written in `/src/lib/dbDiagnostics.ts` to verify:
1. **Schema Existence**: Using a `limit(1)` select to ensure `42P01` (undefined table) is not thrown.
2. **Access Control**: Ensuring Row Level Security (RLS) is either properly configured or public for this Phase.

## 🚀 Execution Steps
1. Create the Database Tests mechanism.
2. Create SQL scripts for Module 1, bind frontend, run test. Record in `MODULE_1_TEST.md`.
3. Repeat for Module 2 and Module 3.
