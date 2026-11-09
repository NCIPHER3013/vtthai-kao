# Hampton Park Thai Halal Restaurant — โครงสร้างระบบทั้งหมด

> เอกสารนี้สำหรับตรวจสอบระบบแบบ Manual และบันทึกสถานะของแต่ละ Flow

---

## สารบัญระบบ (11 ระบบหลัก)

| # | ระบบ | หน้าจอ | URL |
|---|------|--------|-----|
| 1 | Authentication & Staff | LoginPage | `/login` |
| 2 | Shift Management (กะ) | POSPage + ShiftModal/CloseShiftModal | `/pos` |
| 3 | Menu Management (เมนู) | MenuPage | `/admin/menu` |
| 4 | Inventory & Stock (สต๊อก) | InventoryPage | `/admin/inventory` |
| 5 | Recipe & Costing (สูตรอาหาร/ต้นทุน) | RecipePage | `/admin/recipe` |
| 6 | POS / Cash Register (ขายหน้าร้าน) | POSPage + 8 modals | `/pos` |
| 7 | Kitchen Display (ครัว) | KDSPage | `/kds` |
| 8 | Purchase Order (สั่งซื้อ) | PurchaseOrderPage | `/admin/purchasing` |
| 9 | CRM & Loyalty (ลูกค้าสัมพันธ์) | CRMPage | `/admin/crm` |
| 10 | Webstore & Chatbot (ออนไลน์) | WebstorePage + ChatbotPage | `/store`, `/bot` |
| 11 | Reports & Dashboard | DashboardPage + ReportsPage + SuperAdminPage | `/admin`, `/admin/reports`, `/admin/super` |

---

## ตาราง Supabase ทั้งหมด (19 ตาราง)

| # | ตาราง | หน้าที่ | WRITE (ใครเขียน) | READ (ใครอ่าน) |
|---|-------|---------|-------------------|-----------------|
| 1 | `settings` | ตั้งค่าร้าน | SettingsPage | POS, Webstore, Chatbot, AdminLayout, Dashboard |
| 2 | `staff_pins` | พนักงาน/PIN | StaffPage | LoginPage |
| 3 | `restaurant_tables` | โต๊ะอาหาร | TableSetupPage | POS (TableManagement) |
| 4 | `product_categories` | หมวดหมู่เมนู | MenuPage | POS, Webstore |
| 5 | `products` | เมนูสินค้า | MenuPage | POS, KDS, Webstore, Chatbot, Recipe, Reports, Orders |
| 6 | `stock_items` | วัตถุดิบ/สต๊อก | InventoryPage, PO Page (receive), stockHelper | POS (availability), Recipe, Dashboard (alerts) |
| 7 | `suppliers` | ซัพพลายเออร์ | InventoryPage | PO Page |
| 8 | `item_suppliers` | ราคาซัพพลายเออร์ต่อไอเทม | InventoryPage | PO Page (auto pricing) |
| 9 | `recipes` | สูตร: เมนู → วัตถุดิบ | RecipePage | POS (stock check), stockHelper (deduct) |
| 10 | `sub_recipe_ingredients` | สูตร: กึ่งสำเร็จ → วัตถุดิบ | RecipePage | Inventory (batch produce), stockHelper |
| 11 | `inventory_ledger` | ประวัติการเคลื่อนไหวสต๊อก | InventoryPage (adjust), PO Page (receive) | — |
| 12 | `purchase_orders` | ใบสั่งซื้อ | PO Page | PO Page |
| 13 | `purchase_order_items` | รายการใน PO | PO Page | PO Page |
| 14 | `orders` | ออเดอร์ | POS, Webstore, Chatbot | KDS, Orders, Reports, Dashboard, SuperAdmin, CRM, TableManagement |
| 15 | `order_items` | รายการในออเดอร์ | POS, Webstore, Chatbot | KDS, Orders, Reports, Dashboard, SuperAdmin, stockHelper |
| 16 | `shifts` | กะการทำงาน | POS (open/close) | ShiftPage |
| 17 | `customers` | ลูกค้า | CRMPage, POS (points update), Webstore, Chatbot (create) | CustomerModal, CRMPage |
| 18 | `gift_cards` | บัตรของขวัญ | POS (issue + redeem) | GiftCardRedeemModal |
| 19 | `gift_card_transactions` | รายการบัตรของขวัญ | POS (redemption log) | — |

---

## Flow 1: ตั้งค่าระบบเบื้องต้น (Setup)

```
┌─────────────────────────────────────────────────────────┐
│  Flow 1: SETUP — ตั้งค่าก่อนเปิดร้าน                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1.1 SettingsPage → ตาราง `settings`                    │
│      ├─ ชื่อร้าน, เบอร์โทร, ที่อยู่, Tax ID                │
│      ├─ อัตราภาษี (tax_rate)                             │
│      ├─ Holiday / EFTPOS surcharge                       │
│      ├─ เงินทอนเริ่มกะ (default_starting_cash)          │
│      └─ หัว/ท้ายใบเสร็จ                                 │
│          ↓ ข้อมูลไปที่:                                   │
│          • POS (คำนวณภาษี, เปิดกะ, พิมพ์ใบเสร็จ)          │
│          • Webstore (ชื่อร้าน, ภาษี)                      │
│          • Chatbot (ภาษี)                                │
│                                                         │
│  1.2 StaffPage → ตาราง `staff_pins`                     │
│      ├─ เพิ่มพนักงาน: ชื่อ, PIN (4-6 ตัว), บทบาท         │
│      ├─ บทบาท: ADMIN / MANAGER / CASHIER / KITCHEN      │
│      └─ ↓ ข้อมูลไปที่:                                   │
│          • LoginPage (ตรวจ PIN + redirect ตามบทบาท)     │
│          • AdminLayout (ตรวจสิทธิ์เข้า admin)             │
│                                                         │
│  1.3 TableSetupPage → ตาราง `restaurant_tables`         │
│      ├─ เพิ่ม/แก้ไข/ลบ โต๊ะ: ชื่อ, โซน, จำนวนที่นั่ง      │
│      └─ ↓ ข้อมูลไปที่:                                   │
│          • POS TableManagement (แสดงแผนผังโต๊ะ)          │
│          • Dashboard (QR Code → /store?table=N)         │
│                                                         │
│  สถานะตรวจ: [ ] Settings สมบูรณ์                        │
│            [ ] Staff สร้างแล้ว                            │
│            [ ] โต๊ะตั้งค่าแล้ว                            │
└─────────────────────────────────────────────────────────┘
```

---

## Flow 2: จัดเมนู + สต็อก + สูตร (Menu → Inventory → Recipe)

```
┌─────────────────────────────────────────────────────────────────┐
│  Flow 2: MENU → INVENTORY → RECIPE (หัวใจของระบบ)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  2.1 MenuPage → ตาราง `products` + `product_categories`        │
│      ├─ สร้างหมวดหมู่ (เช่น Coffee, Main, Rice, Gift Cards)     │
│      ├─ สร้างสินค้า: ชื่อ, PLU, หมวดหมู่                       │
│      │   ├─ 3 ระดับราคา: dine-in, takeaway, delivery           │
│      │   ├─ ตัวเลือก/Modifier (กลุ่ม + ตัวเลือก + ปรับราคา)     │
│      │   ├─ ข้อมูลโภชนาการ (cal, protein, carbs, fat)          │
│      │   └─ ธงอาหาร (healthy, vegan, gluten-free)              │
│      └─ ↓ ข้อมูลไปที่:                                           │
│          • POS (แสดงเมนู + ราคา + modifier)                    │
│          • Webstore (แสดงเมนูออนไลน์)                           │
│          • Chatbot (ส่งแคตตาล็อกให้ AI)                         │
│          • RecipePage (เลือกเมนูมาผูกสูตร)                      │
│          • KDS (แสดงชื่อเมนูใน order card)                      │
│                                                                 │
│  2.2 InventoryPage → ตาราง `stock_items` + `suppliers`         │
│      │                + `item_suppliers` + `inventory_ledger`   │
│      ├─ เพิ่มวัตถุดิบ: ชื่อ, หมวด (Meat/Seafood/Veg/Dry/       │
│      │   Packaging/Sub-Recipe/Other), หน่วย, ต้นทุน/หน่วย,      │
│      │   สต็อกปัจจุบัน, จุดสั่งซื้อ                             │
│      ├─ ปรับสต็อก (เข้า/ออก) → เขียน `inventory_ledger`        │
│      ├─ เพิ่มซัพพลายเออร์ + ราคาซัพพลายเออร์ต่อไอเทม          │
│      ├─ นำเข้า Excel (.xlsx/.csv)                               │
│      └─ ผลิตกึ่งสำเร็จรูป (Batch Produce):                     │
│          • อ่าน `sub_recipe_ingredients`                        │
│          • ตัดวัตถุดิบลูก → เพิ่มวัตถุดิบแม่                   │
│          • เขียน ledger ทั้งเข้าและออก                          │
│          ↓ ข้อมูลไปที่:                                           │
│          • RecipePage (เลือกวัตถุดิบมาผูกสูตร)                  │
│          • POS (เช็ค stock availability แสดง "Out of Stock")   │
│          • Dashboard (Low Stock Alert)                          │
│          • PurchaseOrderPage (สั่งซื้อ)                          │
│                                                                 │
│  2.3 RecipePage → ตาราง `recipes` + `sub_recipe_ingredients`   │
│      ├─ แท็บ 1: Menu Products                                  │
│      │   เลือกเมนู (จาก products) → เพิ่มวัตถุดิบ (จาก         │
│      │   stock_items) + ปริมาณที่ใช้ต่อ 1 หน่วย                 │
│      │   → เขียน `recipes` (product_id → inventory_item_id)     │
│      ├─ แท็บ 2: Sub-Recipes / Batch Prep                      │
│      │   เลือกวัตถุดิบกึ่งสำเร็จ → เพิ่มวัตถุดิบลูก + ปริมาณ    │
│      │   → เขียน `sub_recipe_ingredients`                       │
│      ├─ คำนวณต้นทุน/กำไรแบบ Real-time                         │
│      └─ ↓ ข้อมูลไปที่:                                           │
│          • POS (เช็คว่าเมนูมีวัตถุดิบพอไหม)                     │
│          • stockHelper.ts (ตัดสต็อกตอนขาย)                     │
│          • InventoryPage (ผลิตกึ่งสำเร็จรูป)                    │
│                                                                 │
│         ★ จุดเชื่อมโยงสำคัญ ★                                  │
│    ┌────────────────────────────────────────────┐               │
│    │  Menu Page (สร้างเมนู)                     │               │
│    │        ↓                                    │               │
│    │  Inventory Page (สร้างวัตถุดิบ)            │               │
│    │        ↓                                    │               │
│    │  Recipe Page (ผูก: เมนู → วัตถุดิบ)       │               │
│    │        ↓                                    │               │
│    │  POS ขายเมนู → stockHelper ตัด stock_items │               │
│    └────────────────────────────────────────────┘               │
│                                                                 │
│  สถานะตรวจ: [ ] สร้างหมวดหมู่เรียบร้อย                         │
│            [ ] สร้างสินค้าพร้อมราคา + modifier แล้ว            │
│            [ ] เพิ่มวัตถุดิบใน Inventory แล้ว                   │
│            [ ] ผูกสูตรอาหารเรียบร้อย                             │
│            [ ] ตรวจต้นทุน/กำไรใน Recipe Page ถูกต้อง            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flow 3: สั่งซื้อวัตถุดิบ (Purchase Order)

```
┌─────────────────────────────────────────────────────────┐
│  Flow 3: PURCHASE ORDER — สั่งซื้อวัตถุดิบ               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  3.1 สร้าง PO → ตาราง `purchase_orders`                 │
│      ├─ เลือกซัพพลายเออร์ (จาก suppliers)               │
│      ├─ เพิ่มรายการ: เลือกวัตถุดิบ (stock_items)         │
│      │   ├─ ราคาอัตโนมัติจาก item_suppliers              │
│      │   └─ จำนวนสั่ง → คำนวณ total                    │
│      ├─ INSERT purchase_orders (status='ordered')        │
│      └─ INSERT purchase_order_items                     │
│                                                         │
│  3.2 รับของ (Receive)                                   │
│      ├─ UPDATE purchase_order_items (qty_received)       │
│      ├─ UPDATE stock_items (+ จำนวนที่รับ)              │
│      │   → สต็อกเพิ่มขึ้นทันที                            │
│      ├─ INSERT inventory_ledger (บันทึกการรับ)           │
│      └─ UPDATE purchase_orders (status='received')       │
│                                                         │
│  เชื่อมโยง:                                              │
│  • InventoryPage (suppliers, item_suppliers, stock)      │
│  • Dashboard (Low Stock Alert → แจ้งเตือนให้สั่งซื้อ)    │
│                                                         │
│  สถานะตรวจ: [ ] สร้าง PO ได้                             │
│            [ ] รับของแล้วสต็อกเพิ่มขึ้นถูกต้อง             │
│            [ ] inventory_ledger บันทึกถูกต้อง             │
└─────────────────────────────────────────────────────────┘
```

---

## Flow 4: ขายหน้าร้าน — POS (Checkout Flow)

```
┌───────────────────────────────────────────────────────────────────┐
│  Flow 4: POS — ขายหน้าร้าน (Flow หลัก)                            │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  4.0 เข้าสู่ระบบ                                                   │
│      LoginPage → กรอก PIN → ตรวจ staff_pins                     │
│      ├─ CASHIER → /pos                                            │
│      ├─ KITCHEN  → /kds                                           │
│      └─ ADMIN/MANAGER → /admin                                    │
│                                                                   │
│  4.1 เปิดกะ (Gate — ต้องทำก่อนขาย)                                │
│      ShiftModal → ใส่เงินทอน → INSERT shifts (status='open')      │
│      ├─ ค่า default มาจาก settings.default_starting_cash         │
│      └─ ↓ ไปที่: POS (activeShiftId), ShiftPage (ดูประวัติ)       │
│                                                                   │
│  4.2 เลือกโต๊ะ (Dine-in) หรือ Takeaway                            │
│      TableManagement → อ่าน restaurant_tables                     │
│      ├─ ตรวจ occupied: อ่าน orders (status pending/preparing)    │
│      ├─ Realtime subscription บน orders                          │
│      └─ เลือกโต๊ะ → เปลี่ยน orderType เป็น dine_in               │
│                                                                   │
│  4.3 โหลดข้อมูลเมนู                                                │
│      ├─ products (ทั้งหมด)                                        │
│      ├─ product_categories (หมวดหมู่)                             │
│      ├─ recipes + stock_items → คำนวณ "Out of Stock"            │
│      └─ order_items (1000 รายการล่าสุด) → คำนวณ "Popular"         │
│                                                                   │
│  4.4 เพิ่มสินค้าลงตะกร้า                                           │
│      ├─ สินค้าไม่มี modifier → กดเพิ่มเลย (หรือ +1 ถ้ามีแล้ว)      │
│      └─ สินค้ามี modifier → เปิด ModifierModal                    │
│          ├─ เลือกตัวเลือก (sweetness, size, etc.)                  │
│          ├─ ใส่จำนวน + หมายเหตุ                                   │
│          └─ "Add to Order" → สร้าง CartItem ใหม่เสมอ              │
│                                                                   │
│  4.5 แนบลูกค้า (ไม่บังคับ)                                         │
│      CustomerModal → ค้นหา customers                              │
│      └─ หรือ AddCustomerModal → INSERT customers ใหม่             │
│                                                                   │
│  4.6 ใช้บัตรของขวัญ (ไม่บังคับ)                                    │
│      GiftCardRedeemModal → ค้นหา gift_cards ด้วย code            │
│      └─ ตรวจ: active + balance > 0                                │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐          │
│  │  4.7 เส้นทาง A: HOLD — ส่งครัว (Dine-in)           │          │
│  │      ├─ UPSERT orders (status='pending')            │          │
│  │      ├─ DELETE+INSERT order_items                   │          │
│  │      ├─ เก็บใน localStorage (heldOrders)             │          │
│  │      └─ → ไป Flow 5 (KDS รับออเดอร์)               │          │
│  │                                                     │          │
│  │  4.8 เส้นทาง B: PAY — ชำระเงินเลย                  │          │
│  │      ├─ CARD → processOrder('CARD') โดยตรง          │          │
│  │      └─ CASH → CheckoutModal → processOrder('CASH') │          │
│  └─────────────────────────────────────────────────────┘          │
│                                                                   │
│  4.9 processOrder() — ทรานแซกชันหลัก                              │
│      ├─ UPSERT orders (id, totals, payment, status)                │
│      ├─ DELETE+INSERT order_items                                 │
│      ├─ อัปเดต loyalty: UPDATE customers (points += floor(total)) │
│      ├─ อัปเดตกะ: UPDATE shifts (total_sales += total)            │
│      ├─ ตัดสต็อก: stockHelper.deductStockForOrder()               │
│      │   └─ อ่าน recipes → ตัด stock_items (DB trigger)           │
│      ├─ ใช้บัตรของขวัญ: UPDATE gift_cards (ลดยอด)                │
│      │   └─ INSERT gift_card_transactions                         │
│      ├─ ออกบัตรของขวัญใหม่ (ถ้าซื้อ): INSERT gift_cards            │
│      └─ เปิด ReceiptModal → พิมพ์ใบเสร็จ                         │
│                                                                   │
│  4.10 ปิดกะ                                                       │
│      CloseShiftModal → นับเงิน → UPDATE shifts (status='closed')  │
│      └─ คำนวณ: เงินทอน + ยอดขาย vs เงินจริง                      │
│                                                                   │
│  สถานะตรวจ: [ ] Login ด้วย PIN ได้                               │
│            [ ] เปิดกะได้ (เงินทอนถูกต้อง)                        │
│            [ ] เห็นเมนู + หมวดหมู่ + Out of Stock                │
│            [ ] เพิ่มลงตะกร้าได้ (ทั้งแบบปกติ + modifier)        │
│            [ ] แนบลูกค้าได้                                       │
│            [ ] ใช้บัตรของขวัญได้                                  │
│            [ ] Hold/Send to Kitchen ได้                            │
│            [ ] ชำระ CASH และ CARD ได้                            │
│            [ ] ตัดสต็อกถูกต้อง (ตรวจ stock_items)                 │
│            [ ] แต้มลูกค้าเพิ่มขึ้นถูกต้อง                        │
│            [ ] ยอดกะเพิ่มขึ้นถูกต้อง                              │
│            [ ] พิมพ์ใบเสร็อได้                                    │
│            [ ] ปิดกะได้ (ยอดรวมถูกต้อง)                          │
└───────────────────────────────────────────────────────────────────┘
```

---

## Flow 5: Kitchen Display System (KDS)

```
┌─────────────────────────────────────────────────────────┐
│  Flow 5: KDS — ครัวรับออเดอร์                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  แหล่งข้อมูลเข้า:                                        │
│  • POS "Hold/Send to Kitchen" → INSERT orders           │
│  • Webstore order → INSERT orders (status='pending')    │
│  • Chatbot order → INSERT orders (status='pending')     │
│                                                         │
│  KDSPage (Realtime subscription บน orders)              │
│  ├─ อ่าน orders WHERE status IN (pending, preparing,    │
│  │  ready) + อ่าน order_items + products (join)         │
│  │                                                      │
│  ├─ แสดง 2 คอลัมน์:                                     │
│  │  ┌──────────────┐  ┌──────────────┐                 │
│  │  │ Active Orders│  │  Expediter   │                 │
│  │  │ (pending +   │  │  (ready)     │                 │
│  │  │  preparing)  │  │              │                 │
│  │  └──────────────┘  └──────────────┘                 │
│  │                                                      │
│  └─ สถานะ Flow:                                        │
│     pending ──→ [Start Preparing] ──→ preparing          │
│     preparing → [Mark Ready]      → ready               │
│     ready     → [Complete]         → completed           │
│                                                         │
│     ตัวจับเวลา: < 10 นาที=เขียว, 10-14=เหลือง, ≥15=แดง    │
│                                                         │
│  สถานะตรวจ: [ ] ออเดอร์จาก POS ปรากฏที่ KDS              │
│            [ ] เปลี่ยน pending → preparing ได้           │
│            [ ] เปลี่ยน preparing → ready ได้             │
│            [ ] เปลี่ยน ready → completed ได้             │
│            [ ] เวลาและสีแสดงถูกต้อง                       │
│            [ ] ออเดอร์จาก Webstore ปรากฏที่ KDS          │
│            [ ] ออเดอร์จาก Chatbot ปรากฏที่ KDS            │
└─────────────────────────────────────────────────────────┘
```

---

## Flow 6: Webstore + Chatbot (สั่งออนไลน์)

```
┌─────────────────────────────────────────────────────────┐
│  Flow 6: WEBSTORE + CHATBOT                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  6.1 WebstorePage (/store)                              │
│      ├─ ลูกค้าเข้าจาก QR Code: /store?table=N            │
│      │   → auto dine-in, skip กรอกชื่อ                   │
│      ├─ เลือก Takeaway / Delivery                        │
│      ├─ เลือกสินค้า + Modifier                            │
│      │   → ราคาตามประเภท (price_takeaway/delivery)      │
│      ├─ กรอกชื่อ + เบอร์โทร                              │
│      │   → ตรวจ customers (เจอ=ใช้เดิม, ไม่เจอ=สร้างใหม่) │
│      ├─ เลือกจ่ายเงินสด / บัตร                            │
│      └─ INSERT orders (status='pending')                │
│         INSERT order_items                               │
│         → ครัวเห็นที่ KDS ทันที (realtime)                │
│                                                         │
│  6.2 ChatbotPage (/bot) — WhatsApp theme                │
│      ├─ โหลด products (แคตตาล็อก) → ใส่ใน AI context   │
│      ├─ ใช้ Gemini AI (gemini-3.1-pro-preview)          │
│      ├─ AI ตอบคำถามเมนู + แนะนำ                        │
│      ├─ AI เรียก placeOrder() function call              │
│      │   → สร้าง/หาลูกค้า (customers)                    │
│      │   → INSERT orders + order_items                   │
│      │   → payment=CASH, note='AI Order via WhatsApp'   │
│      └─ สรุปออเดอร์เป็นภาษาธรรมชาติ                      │
│                                                         │
│  จำกัดของ Chatbot:                                       │
│  • ไม่เลือก order_type                                   │
│  • จ่าย CASH เท่านั้น                                     │
│  • ไม่รองรับ modifier                                    │
│                                                         │
│  สถานะตรวจ: [ ] Webstore แสดงเมนูถูกต้อง                  │
│            [ ] เลือก modifier ได้                         │
│            [ ] ราคา takeaway/delivery ถูกต้อง             │
│            [ ] สั่งออเดอร์แล้วเข้า KDS                   │
│            [ ] ลูกค้าใหม่ถูกสร้างใน customers              │
│            [ ] QR Code /store?table=N ทำงาน               │
│            [ ] Chatbot ตอบคำถามเมนูได้                    │
│            [ ] Chatbot สั่งออเดอร์ผ่าน AI ได้              │
└─────────────────────────────────────────────────────────┘
```

---

## Flow 7: CRM & Loyalty

```
┌─────────────────────────────────────────────────────────┐
│  Flow 7: CRM & LOYALTY                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  แหล่งข้อมูลเข้า:                                        │
│  • POS processOrder → UPDATE customers (points, spent)  │
│  • Webstore → INSERT customers (ใหม่)                   │
│  • Chatbot → INSERT customers (ใหม่)                    │
│  • CRMPage → INSERT/UPDATE customers (แก้ไขด้วยมือ)     │
│                                                         │
│  CRMPage                                                │
│  ├─ ดูรายชื่อลูกค้า: ชื่อ, เบอร์, อีเมล, แต้ม, ยอดรวม     │
│  ├─ ระบบ Tier (อัตโนมัติ):                              │
│  │   Bronze (0-99) / Silver (100-499)                   │
│  │   Gold (500-999) / Platinum (1000+)                  │
│  ├─ ประวัติออเดอร์ลูกค้า → อ่าน orders by customer_id   │
│  ├─ ปรับแต้มด้วยมือ (+/-/set)                            │
│  └─ แลกของรางวัล (deduct points)                       │
│                                                         │
│  วิธีสะสมแต้ม: floor(order.total) แต้มต่อ 1 ออเดอร์      │
│                                                         │
│  สถานะตรวจ: [ ] แสดงรายชื่อลูกค้าได้                      │
│            [ ] แสดงประวัติออเดอร์ของลูกค้า                 │
│            [ ] Tier คำนวณถูกต้อง                          │
│            [ ] ปรับแต้มด้วยมือได้                          │
│            [ ] POS สะสมแต้มอัตโนมัติ (ตรวจจาก order)    │
└─────────────────────────────────────────────────────────┘
```

---

## Flow 8: Reports & Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  Flow 8: REPORTS & DASHBOARD                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  8.1 DashboardPage (/admin)                             │
│      ├─ อ่าน orders + order_items (Today/Week/Month)    │
│      ├─ KPI: ยอดขาย, จำนวนออเดอร์, เฉลี่ยต่อบิล         │
│      ├─ กราฟรายได้ (Recharts)                          │
│      ├─ Top 3 ขายดี                                     │
│      ├─ Low Stock Alert → อ่าน stock_items              │
│      └─ QR Code Generator → /store?table=N              │
│                                                         │
│  8.2 ReportsPage (/admin/reports)                       │
│      ├─ อ่าน orders + order_items (7D/30D/YTD)         │
│      ├─ Gross Revenue, Total Orders, Tax                │
│      ├─ กราฟ: แนวโน้ม, ช่องทางจ่าย, หมวดหมู่            │
│      └─ Top Selling Items                               │
│                                                         │
│  8.3 SuperAdminPage (/admin/super)                      │
│      ├─ เปรียบเทียบ 30 วัน vs 30 วันก่อนหน้า             │
│      ├─ Growth %: Revenue, Orders, AOV, Customers      │
│      └─ Area chart: 15 วันย้อนหลัง                      │
│                                                         │
│  ข้อมูลทั้งหมดมาจาก: orders + order_items + products    │
│                                                         │
│  สถานะตรวจ: [ ] Dashboard แสดง KPI ถูกต้อง               │
│            [ ] กราฟรายได้แสดงข้อมูลจริง                 │
│            [ ] Low Stock Alert แสดงถูกต้อง                │
│            [ ] QR Code สร้างได้                          │
│            [ ] Reports กราฟทุกอันแสดงข้อมูลถูกต้อง     │
│            [ ] SuperAdmin Growth % คำนวณถูกต้อง          │
└─────────────────────────────────────────────────────────┘
```

---

## แผนผังการเชื่อมโยงระบบ (ภาพรวม)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Settings   │     │  Staff/PIN   │     │   Tables     │
│  (settings)  │     │ (staff_pins) │     │ (rest_tables)│
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────┐
│                    POS (/pos)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │Shift     │  │Table     │  │ Product Grid     │  │
│  │Management│  │Selection │  │ (from products)  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │Cart      │  │Checkout  │  │ Receipt/Print    │  │
│  │          │  │Cash/Card │  │                  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└──────────┬──────────┬──────────────┬───────────────┘
           │          │              │
     orders │   stock_items    customers
  order_items│  (via recipes)   gift_cards
     shifts  │                  gift_card_txns
           │          │              │
           ▼          ▼              ▼
    ┌──────────┐ ┌─────────┐ ┌─────────────┐
    │   KDS    │ │Inventory│ │    CRM       │
    │ (/kds)   │ │         │ │  (customers) │
    └──────────┘ └─────────┘ └─────────────┘
                     ▲
                     │ stock_items
                     │ suppliers
                     │
              ┌──────────────┐
              │ Purchase     │
              │ Orders       │
              └──────────────┘

    ┌──────────┐                    ┌──────────┐
    │ Webstore │ ──→ orders ──→     │ Chatbot  │
    │ (/store) │     order_items    │ (/bot)   │
    └──────────┘                    └──────────┘
         │                               │
         └──── customers (lookup/create)─┘

    ┌──────────────────────────────────────┐
    │         Reports & Dashboard          │
    │  Dashboard | Reports | SuperAdmin    │
    │  (อ่าน orders + order_items เท่านั้น)  │
    └──────────────────────────────────────┘
```

---

## สรุปจุดเชื่อมโยงสำคัญที่ต้องตรวจ

| # | จุดเชื่อม | ตารางกลาง | ระบบต้นทาง | ระบบปลายทาง |
|---|----------|-----------|------------|-------------|
| 1 | เมนู → POS | `products` | MenuPage | POS, Webstore, Chatbot, KDS |
| 2 | สูตร → ตัดสต็อก | `recipes` | RecipePage | stockHelper → stock_items |
| 3 | ออเดอร์ → ครัว | `orders` (status) | POS, Webstore, Chatbot | KDS |
| 4 | ออเดอร์ → ตัดสต็อก | `recipes` + `stock_items` | POS (processOrder) | stockHelper |
| 5 | ออเดอร์ → แต้มลูกค้า | `customers` | POS (processOrder) | CRMPage |
| 6 | PO → เพิ่มสต็อก | `stock_items` | PurchaseOrderPage | InventoryPage |
| 7 | ตั้งค่า → ทุกระบบ | `settings` | SettingsPage | POS, Webstore, Chatbot |
| 8 | สต็อก → แจ้งเตือน | `stock_items` | InventoryPage | Dashboard |

---

## หน้าที่ของแต่ละ Shared Component

| Component | Path | Supabase | หน้าที่ |
|-----------|------|----------|---------|
| ShiftModal | `pos/` | — | เปิดกะ (ใส่เงินทอน) |
| CloseShiftModal | `pos/` | — | ปิดกะ (นับเงิน) |
| TableManagement | `pos/` | READ orders, restaurant_tables | แผนผังโต๊ะ dine-in |
| ModifierModal | `pos/` | — | เลือก modifier ก่อนเพิ่มลงตะกร้า |
| CheckoutModal | `pos/` | — | จ่ายเงินสด (numpad) |
| CustomerModal | `pos/` | READ customers | ค้นหา/เลือกลูกค้า |
| AddCustomerModal | `admin/` | WRITE customers | สร้างลูกค้าใหม่ |
| GiftCardRedeemModal | `pos/` | READ gift_cards | ค้นหาบัตรของขวัญ |
| ReceiptModal | `pos/` | — | แสดง/พิมพ์ใบเสร็อ |

---

## stockHelper.ts — ลูกโซ่การตัดสต็อก

```
Order
  → order_items (product_id, quantity)
    → recipes (product_id → inventory_item_id, qty)
      ├─ ถ้า stock_items.category == 'Sub-Recipe'
      │   → sub_recipe_ingredients (parent → child raw items)
      │     → stock_items (ตัดวัตถุดิบลูกจริง)
      └─ ถ้าเป็น Raw Ingredient ธรรมดา
          → stock_items (ตัดตรงนี้)
```

- `deductStockForOrder()` — ตัดสต็อกตอนขาย
- `returnStockForOrder()` — คืนสต็อกตอน void/refund
