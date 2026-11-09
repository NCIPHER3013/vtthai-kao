# Hampton Park Thai Halal Restaurant - Master Development Plan & Flow

เอกสารนี้สรุปหน้าจอทั้งหมดที่ต้องสร้าง (Screens) และลำดับการพัฒนาตาม Flow การทำงาน (Development Roadmap) อ้างอิงจาก Master Checklist

---

## ส่วนที่ 1: สรุปหน้าจอทั้งหมดที่ต้องสร้าง (UI / Screens)

ระบบแบ่งหน้าจอออกเป็น 5 กลุ่มหลัก รวมประมาณ **20-25 หน้าจอหลัก** ดังนี้:

### 1. กลุ่ม Authentication & Shift (ระบบเข้าใช้งานและกะการทำงาน)
1. **Admin Login Page:** หน้าจอล็อกอินสำหรับเจ้าของร้าน/ผู้จัดการ (ใช้ Email/Password) - ✅ *UI Completed*
2. **PIN Login Screen:** หน้าจอใส่รหัส PIN สำหรับพนักงานหน้าร้าน (สลับ User ได้รวดเร็ว) - ✅ *UI Completed*
3. **Shift Management Modal:** หน้าต่างสำหรับเปิดกะ (ใส่เงินทอนเริ่มต้น) และปิดกะ (สรุปยอดเงิน) - ✅ *UI Completed*

### 2. กลุ่ม POS / Front of House (หน้าร้าน)
4. **Main POS Screen (Register):** หน้าจอหลักสำหรับขายสินค้า ประกอบด้วยหมวดหมู่สินค้า, รายการสินค้า, และตะกร้า (Cart) - ✅ *UI Completed*
5. **Checkout / Payment Modal:** หน้าต่างชำระเงิน เลือกประเภทการจ่าย (เงินสด, บัตร), คำนวณเงินทอน, และส่วนลด - ✅ *UI Completed*
6. **Modifier / Item Detail Modal:** หน้าต่างเลือก Optionเสริม (เช่น หวานน้อย, เพิ่มไข่ดาว) เมื่อกดเลือกเมนู - ✅ *UI Completed*
7. **Customer Selection Modal:** หน้าต่างค้นหา/เพิ่มข้อมูลลูกค้าเพื่อผูกกับออเดอร์ - ✅ *UI Completed*

### 3. กลุ่ม Kitchen & Order Fulfillment (หลังร้านและจัดการออเดอร์)
8. **KDS (Kitchen Display System) Screen:** หน้าจอในครัว แสดงการ์ดออเดอร์, จับเวลาทำอาหาร, และเปลี่ยนสถานะ (กำลังทำ -> เสร็จแล้ว) - ✅ *UI Completed*
9. **Active Orders / Order History Screen:** หน้าจอรวมออเดอร์ทั้งหมด ใช้ดูสถานะ, พิมพ์ใบเสร็จย้อนหลัง, ยกเลิก (Void) หรือคืนเงิน (Refund) - ✅ *UI Completed*

### 4. กลุ่ม Back Office & Admin (ระบบจัดการหลังบ้าน)
10. **Admin Dashboard:** หน้าแรกของหลังบ้าน แสดงสรุปยอดขายรายวัน, กราฟ, และสถิติเบื้องต้น - ✅ *UI Completed*
11. **Menu Management Screen:** หน้าจัดการเมนูอาหาร, หมวดหมู่, และ Modifiers (ตัวเลือกเสริม) - ✅ *UI Completed*
12. **Inventory & Stock Screen:** หน้าจัดการสต๊อกสินค้า, ดูความเคลื่อนไหว (Ledger), รับของเข้า, และตัดของเสีย - ✅ *UI Completed*
13. **Recipe & Costing Screen:** หน้าผูกสูตรอาหาร (1 เมนู ตัดวัตถุดิบอะไรบ้าง) และคำนวณต้นทุน
14. **Purchasing / PO Screen:** หน้าจัดการใบสั่งซื้อ (PO) และรายชื่อซัพพลายเออร์
15. **Reporting & Analytics Screen:** หน้าดูรายงานเชิงลึก (ยอดขายรายช่องทาง, สินค้าขายดี, ภาษี)
16. **Staff & Roles Screen:** หน้าจัดการพนักงาน, กำหนดสิทธิ์ (Permissions), และตั้งรหัส PIN
17. **Store Settings Screen:** หน้าตั้งค่าร้านค้า (ภาษี, เครื่องพิมพ์, โซนเวลา, ช่องทางการชำระเงิน) - ✅ *UI Completed*

### 5. กลุ่ม CRM, Omnichannel & Automation (ลูกค้าสัมพันธ์และออนไลน์)
18. **Customer CRM Screen:** หน้าจัดการฐานข้อมูลลูกค้า, ประวัติการซื้อ, และคะแนนสะสม (Loyalty) - ✅ *UI Completed*
19. **Reservations Screen:** หน้าจัดการการจองโต๊ะ (ปฏิทิน/รายการ)
20. **Staff Inbox / Chat Screen:** หน้าจอแชทสำหรับพนักงานเพื่อคุยกับลูกค้า (รับช่วงต่อจาก Bot)
21. **Webstore (Public Page):** หน้าเว็บสั่งอาหารออนไลน์สำหรับลูกค้า (Customer Facing)

---

## ส่วนที่ 2: แผนการพัฒนา (Development Roadmap)
*อัปเดตล่าสุด: เน้นสร้าง Frontend UI ให้เห็นภาพรวมทั้งหมดก่อน แล้วจึงเชื่อมต่อ Database (Supabase) ในภายหลัง*

### Phase 1: Frontend UI Prototype (กำลังดำเนินการ)
สร้างหน้าตาแอปพลิเคชัน (UI) และ Flow การใช้งานด้วยข้อมูลจำลอง (Mock Data)

*   ✅ **Step 1: Routing & Layouts** - วางโครงสร้างหน้าเว็บและระบบนำทาง
*   ✅ **Step 2: Auth & Shift UI** - หน้า Login (Admin/PIN) และหน้าต่างเปิดกะ
*   ✅ **Step 3: Core POS UI** - หน้าขายสินค้า, ตะกร้า, Modifier, Checkout, และ Customer Modal
*   ✅ **Step 4: Admin Core UI** - หน้าจัดการเมนู (Menu) และหน้าจัดการสต๊อก (Inventory)
*   ✅ **Step 5: Kitchen & Orders UI** - หน้าจอ KDS สำหรับครัว และหน้าประวัติออเดอร์
*   ✅ **Step 6: CRM & Settings UI** - หน้าจัดการลูกค้า, จัดการพนักงาน, และตั้งค่าร้านค้า
*   ✅ **Step 7: Dashboard & Reports UI** - หน้ากราฟสรุปยอดขายและรายงาน

### Phase 2: Database Integration (Supabase) (กำลังดำเนินการ)
เชื่อมต่อ UI ที่สร้างเสร็จแล้วเข้ากับฐานข้อมูลจริง

*   ✅ **Step 8: Auth & Core Data** - เชื่อมต่อระบบ Login, ดึงข้อมูลเมนูจาก DB, และบันทึกออเดอร์
*   ✅ **Step 9: Inventory & Ledger** - เชื่อมต่อระบบตัดสต๊อก, ผูกสูตรอาหาร (Recipe) คิดต้นทุน (Costing), และบันทึกกะ (Shift)
*   ✅ **Step 10: CRM & Advanced Features** - เชื่อมต่อข้อมูลลูกค้า, ระบบสะสมแต้ม, และรายงานเชิงลึก

### Phase 3: Omnichannel & Scale
*   ⏳ **Step 11: Webstore & Chatbot** - สร้างหน้าสั่งอาหารออนไลน์และเชื่อมต่อ WhatsApp Bot

### Phase 4: Backlog & Future Enhancements (ไอเดียรอการพัฒนา)
*   ⏳ **Nutrition Facts (Health & Wellness Module)** - เพิ่มระบบข้อมูลโภชนาการ แคลอรี่ และ Macro (Protein, Carbs, Fat) แยกแสดงผลในบิล/หน้าข้อมูลสินค้า เพื่อรองรับร้านอาหารสายสุขภาพ
