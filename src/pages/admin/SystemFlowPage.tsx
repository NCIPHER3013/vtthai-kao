import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, ExternalLink, KeyRound, Loader2, Shield, Settings, Package, ChefHat, ShoppingCart, Monitor, Users, Truck, BarChart3, Globe, RotateCcw, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import type { StaffPin } from '../../lib/supabase';
import { fetchStaff as apiFetchStaff } from '../../lib/api/staff';

interface ChecklistItem {
  id: string;
  section: string;
  label: string;
  checked: boolean;
  link?: string;
}

interface FlowStep {
  label: string;
  link?: string;
  note?: string;
}

interface FlowGroup {
  title?: string;
  steps: FlowStep[];
}

const STORAGE_KEY = 'kungpos_system_checklist_v2';

const sectionMeta: Record<string, { icon: React.ReactNode; color: string; borderColor: string; bgColor: string; badgeBg: string; badgeText: string }> = {
  'ตั้งค่าร้าน':     { icon: <Settings className="w-4 h-4" />, color: 'text-blue-400', borderColor: 'border-blue-500/30', bgColor: 'bg-blue-500/10', badgeBg: 'bg-blue-500/20', badgeText: 'text-blue-300' },
  'พนักงาน':       { icon: <Users className="w-4 h-4" />, color: 'text-violet-400', borderColor: 'border-violet-500/30', bgColor: 'bg-violet-500/10', badgeBg: 'bg-violet-500/20', badgeText: 'text-violet-300' },
  'วัตถุดิบ & สต็อก': { icon: <Package className="w-4 h-4" />, color: 'text-amber-400', borderColor: 'border-amber-500/30', bgColor: 'bg-amber-500/10', badgeBg: 'bg-amber-500/20', badgeText: 'text-amber-300' },
  'เมนู & สูตร':    { icon: <ChefHat className="w-4 h-4" />, color: 'text-orange-400', borderColor: 'border-orange-500/30', bgColor: 'bg-orange-500/10', badgeBg: 'bg-orange-500/20', badgeText: 'text-orange-300' },
  'POS & ขาย':      { icon: <ShoppingCart className="w-4 h-4" />, color: 'text-emerald-400', borderColor: 'border-emerald-500/30', bgColor: 'bg-emerald-500/10', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-300' },
  'ครัว (KDS)':    { icon: <Monitor className="w-4 h-4" />, color: 'text-rose-400', borderColor: 'border-rose-500/30', bgColor: 'bg-rose-500/10', badgeBg: 'bg-rose-500/20', badgeText: 'text-rose-300' },
  'CRM & ลูกค้า':   { icon: <Users className="w-4 h-4" />, color: 'text-pink-400', borderColor: 'border-pink-500/30', bgColor: 'bg-pink-500/10', badgeBg: 'bg-pink-500/20', badgeText: 'text-pink-300' },
  'Purchasing':    { icon: <Truck className="w-4 h-4" />, color: 'text-cyan-400', borderColor: 'border-cyan-500/30', bgColor: 'bg-cyan-500/10', badgeBg: 'bg-cyan-500/20', badgeText: 'text-cyan-300' },
  'Reports':       { icon: <BarChart3 className="w-4 h-4" />, color: 'text-yellow-400', borderColor: 'border-yellow-500/30', bgColor: 'bg-yellow-500/10', badgeBg: 'bg-yellow-500/20', badgeText: 'text-yellow-300' },
  'Online Store':  { icon: <Globe className="w-4 h-4" />, color: 'text-teal-400', borderColor: 'border-teal-500/30', bgColor: 'bg-teal-500/10', badgeBg: 'bg-teal-500/20', badgeText: 'text-teal-300' },
};

const sectionFlows: Record<string, FlowGroup[]> = {
  'ตั้งค่าร้าน': [
    {
      title: 'ตั้งค่าร้าน + เงินทอน + ใบเสร็จ',
      steps: [
        { label: 'เปิดหน้า Settings', link: '/admin/settings' },
        { label: 'กรอกชื่อร้าน, เบอร์โทร, Tax ID, ที่อยู่' },
        { label: 'ตั้งอัตราภาษี %, Surcharge, เงินทอนเริ่มกะ' },
        { label: 'ตั้งข้อความหัว/ท้ายใบเสร็จ' },
        { label: 'กด "Save Changes"', note: 'ตรวจข้อความ "Settings updated successfully!"' },
      ],
    },
    {
      title: 'ตั้งค่าโต๊ะอาหาร',
      steps: [
        { label: 'เปิดหน้า Table Setup', link: '/admin/tables' },
        { label: 'กรอกชื่อโต๊ะ, เลือก/สร้างโซน, จำนวนที่นั่ง' },
        { label: 'กด "Add Table"', note: 'โต๊ะจะแสดงใน POS เมื่อเลือก Dine-in' },
        { label: 'ตรวจโต๊ะแสดงถูกต้องตามโซน' },
      ],
    },
  ],

  'พนักงาน': [
    {
      title: 'สร้างพนักงาน + ตั้ง PIN',
      steps: [
        { label: 'เปิดหน้า Staff', link: '/admin/staff' },
        { label: 'กด "Add Staff"', note: 'เปิด modal' },
        { label: 'กรอกชื่อ, เลือกบทบาท (Admin/Manager/Cashier/Kitchen)' },
        { label: 'ตั้ง PIN (4-6 หลัก)' },
        { label: 'กด "Save Staff"' },
      ],
    },
    {
      title: 'ทดสอบ Login PIN',
      steps: [
        { label: 'ออกจากระบบ / เปิดหน้า Login', link: '/login' },
        { label: 'ใส่ PIN ที่ตั้งไว้' },
        { label: 'ตรวจ route ถูกต้องตามบทบาท', note: 'Admin→/admin, Cashier→/pos, Kitchen→/kds' },
        { label: 'ทดสอบ PIN ผิด → ไม่เข้าสู่ระบบ' },
      ],
    },
  ],

  'วัตถุดิบ & สต็อก': [
    {
      title: 'เพิ่มวัตถุดิบ + ต้นทุน',
      steps: [
        { label: 'เปิดหน้า Inventory', link: '/admin/inventory' },
        { label: 'กด "Add Item"' },
        { label: 'กรอก ชื่อ, หมวด (Meat/Seafood/Vegetables/...), หน่วย (kg/L/pcs)' },
        { label: 'ตั้งต้นทุนต่อหน่วย, สต็อกปัจจุบัน, ระดับ Reorder' },
        { label: 'เลือก Supplier (ถ้ามี), กด "Add Item"' },
      ],
    },
    {
      title: 'ปรับสต็อก',
      steps: [
        { label: 'ในหน้า Inventory, hover รายการ → กด "Adjust"' },
        { label: 'เลือกทิศทาง: Receive (เข้า) หรือ Waste/Use (ออก)' },
        { label: 'ใส่จำนวน → กด "Confirm Update"', note: 'เขียน log ลง inventory_ledger' },
        { label: 'ตรวจจำนวนสต็อกอัพเดตถูกต้อง' },
      ],
    },
    {
      title: 'เพิ่มซัพพลายเออร์ + ราคาซื้อ',
      steps: [
        { label: 'สลับไปแท็บ "Suppliers"' },
        { label: 'กด "Add Supplier" → กรอก ชื่อบริษัท, ผู้ติดต่อ, เบอร์, Email' },
        { label: 'กลับแท็บ Stock Items → hover รายการ → กด "Prices"' },
        { label: 'เลือก supplier + ใส่ราคาซื้อ → กด "+"', note: 'ราคาซื้ออัตโนมัติอัพเดตต้นทุน' },
      ],
    },
    {
      title: 'Batch Produce (Sub-Recipe)',
      steps: [
        { label: 'สร้างวัตถุดิบหมวด "Sub-Recipe" ไว้ก่อน' },
        { label: 'ผูก Sub-Recipe ingredients ในหน้า Recipe (แท็บ Sub-Recipes)' },
        { label: 'กลับ Inventory → hover Sub-Recipe → กด "Produce"' },
        { label: 'ใส่ Yield Quantity → กด "Deduct Raw & Produce"', note: 'ตัดสต็อกลูก + เพิ่มสต็อกแม่ + คำนวณต้นทุนใหม่' },
        { label: 'ตรวจสต็อกลูกลดลง สต็อกแม่เพิ่มขึ้น' },
      ],
    },
  ],

  'เมนู & สูตร': [
    {
      title: 'สร้างหมวดหมู่เมนู',
      steps: [
        { label: 'เปิดหน้า Menu', link: '/admin/menu' },
        { label: 'สลับไปแท็บ "Master Categories"' },
        { label: 'กด "Add Category" → กรอกชื่อหมวด + PLU' },
        { label: 'กด "Save Category"' },
      ],
    },
    {
      title: 'สร้างสินค้า + 3 ระดับราคา',
      steps: [
        { label: 'กลับแท็บ "Products" → กด "Add Product"' },
        { label: 'กรอก ชื่อสินค้า, Foreign Name, PLU, คำอธิบาย' },
        { label: 'เลือกหมวดหมู่, ตั้งราคา Dine-in / Takeaway / Delivery' },
        { label: 'เลือก Color Label, ตั้ง Nutrition (ถ้ามี)', note: 'เลือก tag Healthy/Gluten-Free/Vegan' },
        { label: 'กด "Save Product"' },
      ],
    },
    {
      title: 'ตั้ง Modifier/Customization',
      steps: [
        { label: 'แก้ไข/เพิ่มสินค้า → ใน modal ส่วน "Modifications & Add-ons"' },
        { label: 'กด "Add Group" → ตั้งชื่อกลุ่ม (เช่น ขนาด, ระดับความหวาน)' },
        { label: 'ตั้งจำนวน max selections, เลือก Required' },
        { label: 'กด "Add Option" → ใส่ชื่อตัวเลือก + ปรับราคา' },
        { label: 'กด "Save Product"' },
      ],
    },
    {
      title: 'ผูกสูตร (Recipe)',
      steps: [
        { label: 'เปิดหน้า Recipe', link: '/admin/recipe' },
        { label: 'เลือกเมนูจาก panel ซ้าย → แสดงหน้าขวา' },
        { label: 'กด "Add Ingredient" → เลือกวัตถุดิบ + ใส่ปริมาณ' },
        { label: 'กด "Save"', note: 'ระบบคำนวณต้นทุนรวม + % กำไรอัตโนมัติ' },
        { label: 'ทำซ้ำจนครบทุกเมนู' },
      ],
    },
    {
      title: 'ผูก Sub-Recipe',
      steps: [
        { label: 'สลับไปแท็บ "Sub-Recipes (Batch Prep)"' },
        { label: 'เลือก Sub-Recipe จาก panel ซ้าย' },
        { label: 'กด "Add Ingredient" → เลือกวัตถุดิบลูก + ปริมาณ' },
        { label: 'กด "Save"' },
        { label: 'ทำซ้ำจนครบทุก Sub-Recipe' },
      ],
    },
    {
      title: 'ตรวจต้นทุน + Out of Stock',
      steps: [
        { label: 'ในหน้า Recipe → เลือกเมนูแต่ละตัว → ตรวจต้นทุน/กำไร' },
        { label: 'เปิด POS', link: '/pos' },
        { label: 'ลดสต็อกวัตถุดิบให้ต่ำกว่าปริมาณที่สูตรต้องการ' },
        { label: 'ตรวจสินค้านั้นแสดง "Out of Stock" ที่ POS' },
      ],
    },
  ],

  'POS & ขาย': [
    {
      title: 'เปิดกะ + เลือกพนักงาน',
      steps: [
        { label: 'เปิดหน้า POS', link: '/pos' },
        { label: 'ใส่ PIN พนักงาน', note: 'Login แล้ว redirect มา /pos' },
        { label: 'Shift Modal เปิดขึ้น → ใส่ยอดเงินทอนเริ่มกะ' },
        { label: 'กด "Open Shift"', note: 'POS ปลดล็อก พร้อมขาย' },
      ],
    },
    {
      title: 'สั่งขาย + เพิ่มลงตะกร้า',
      steps: [
        { label: 'เลือกหมวดหมู่จาก sidebar ซ้าย' },
        { label: 'คลิกสินค้า → เพิ่มลงตะกร้า' },
        { label: 'สินค้าที่มี Modifier → เลือกตัวเลือก → กด Add' },
        { label: 'ปรับจำนวนด้วย +/- ในตะกร้า' },
      ],
    },
    {
      title: 'เลือกโต๊ะ Dine-in',
      steps: [
        { label: 'สลับ Order Type เป็น "Dine-in"' },
        { label: 'กดเลือกโต๊ะจาก grid โต๊ะ' },
        { label: 'ตรวจชื่อโต๊ะแสดงที่ตะกร้า' },
      ],
    },
    {
      title: 'แนบลูกค้า',
      steps: [
        { label: 'กดปุ่ม Customer ที่ตะกร้า' },
        { label: 'ค้นหาลูกค้าที่มีอยู่ หรือ สร้างใหม่' },
        { label: 'เลือกลูกค้า → ชื่อแสดงที่ตะกร้า' },
      ],
    },
    {
      title: 'ชำระเงิน CASH',
      steps: [
        { label: 'กด "Cash" → Checkout Modal เปิดขึ้น' },
        { label: 'ใส่จำนวนเงินที่ลูกค้าจ่าย → กด Confirm' },
        { label: 'ตรวจใบเสร็จ + ยอดเงินทอน' },
        { label: 'ตรวจสต็อกวัตถุดิบตัดถูก', link: '/admin/inventory', note: 'เช็ค inventory_ledger' },
      ],
    },
    {
      title: 'ชำระเงิน CARD',
      steps: [
        { label: 'กด "Card"', note: 'ชำระทันที ไม่ต้องใส่จำนวนเงิน' },
        { label: 'ตรวจใบเสร็จแสดงวิธีชำระ CARD' },
      ],
    },
    {
      title: 'ใช้บัตรของขวัญชำระ',
      steps: [
        { label: 'กดไอคอน Gift Card ที่ตะกร้า' },
        { label: 'ใส่รหัสบัตรของขวัญ → กด Apply' },
        { label: 'ตรวจยอดคงเหลือลดลงตามมูลค่าบัตร' },
        { label: 'ชำระส่วนที่เหลือปกติ (Cash/Card)' },
      ],
    },
    {
      title: 'พิมพ์ใบเสร็จ',
      steps: [
        { label: 'ชำระเงินเสร็จ → Receipt Modal เปิดขึ้น' },
        { label: 'ตรวจหัวใบเสร็จ (ชื่อร้าน, เบอร์, วันที่)' },
        { label: 'ตรวจรายการสินค้า + modifier ถูกต้อง' },
        { label: 'ตรวจท้ายใบเสร็จ + รวมเงิน' },
        { label: 'กด "Print Receipt"', note: 'ใช้ CSS @media print ที่ 80mm width' },
      ],
    },
    {
      title: 'ปิดกะ',
      steps: [
        { label: 'กด "End Shift" ที่ POS' },
        { label: 'กรอกยอดนับเงินจริง + หมายเหตุ' },
        { label: 'กด Confirm → Shift ปิด' },
        { label: 'ตรวจยอดที่หน้า Shifts', link: '/admin/shifts', note: 'ตรวจ Starting Cash vs Total Sales' },
      ],
    },
  ],

  'ครัว (KDS)': [
    {
      title: 'รับคิวจาก POS',
      steps: [
        { label: 'เปิดหน้า KDS', link: '/kds' },
        { label: 'สั่งขายจาก POS → กด "Hold / Send to Kitchen"', link: '/pos' },
        { label: 'ตรวจออเดอร์เด้งมาที่ KDS (Real-time subscription)', note: 'สถานะ: pending → การ์ดสีขาว' },
        { label: 'ตรวจรายละเอียด: รายการอาหาร, modifier, โต๊ะ, เวลา' },
      ],
    },
    {
      title: 'เปลี่ยนสถานะคิว',
      steps: [
        { label: 'กด "Start Preparing"', note: 'สถานะ: preparing → การ์ดขอบทอง' },
        { label: 'ตรวจจับเวลา + สีเปลี่ยน (เขียว <10นาที, เหลือง 10-15, แดง >15)' },
        { label: 'กด "Mark as Ready"', note: 'ย้ายไป Ready for Pickup' },
        { label: 'กด "Complete / Handed Out"', note: 'สถานะ: completed → หายจาก KDS' },
      ],
    },
  ],

  'CRM & ลูกค้า': [
    {
      title: 'รายชื่อลูกค้า + ประวัติซื้อ',
      steps: [
        { label: 'เปิดหน้า CRM', link: '/admin/crm' },
        { label: 'ตรวจตารางลูกค้า: ชื่อ, เบอร์, Tier, แต้ม, ยอดใช้จ่าย' },
        { label: 'ค้นหาลูกค้าด้วยชื่อ/เบอร์/Email' },
        { label: 'คลิกลูกค้า → เปิด detail modal' },
        { label: 'ตรวจประวัติการสั่งซื้อ (Recent Activity)', note: 'แสดง Order ID, สถานะ, วันที่, ยอดเงิน' },
      ],
    },
    {
      title: 'Tier + แต้ม',
      steps: [
        { label: 'ตรวจ Tier ถูกต้อง', note: 'Bronze <100, Silver ≥100, Gold ≥500, Platinum ≥1000' },
        { label: 'กด "Adjust Points" → ใส่จำนวน → กด "Add (+)"' },
        { label: 'กด "Deduct (-)" → ตรวจแต้มลดลง' },
        { label: 'กด "Redeem Reward" → กรอกชื่อรางวัล + แต้มที่หัก → Confirm' },
        { label: 'ตรวจแต้มรวมอัพเดตถูกต้อง' },
      ],
    },
  ],

  'Purchasing': [
    {
      title: 'สร้าง Purchase Order',
      steps: [
        { label: 'เปิดหน้า Purchase Orders', link: '/admin/purchasing' },
        { label: 'กด "New PO"' },
        { label: 'เลือก Supplier (required) + วันที่คาดส่ง + หมายเหตุ' },
        { label: 'กด "Add Item Line" → เลือกวัตถุดิบ + จำนวน + ราคา', note: 'ราคา auto-fill จาก supplier quote' },
        { label: 'กด "Issue Purchase Order"', note: 'สถานะ: ordered' },
      ],
    },
    {
      title: 'รับของเข้า',
      steps: [
        { label: 'ในรายการ PO → คลิกเปิด PO ที่สถานะ "ordered"' },
        { label: 'กด "Receive Goods"', note: 'ยืนยันรับเข้า' },
        { label: 'ตรวจสถานะเปลี่ยนเป็น "received"' },
        { label: 'ตรวจสต็อกเพิ่มขึ้นที่หน้า Inventory', link: '/admin/inventory' },
      ],
    },
  ],

  'Reports': [
    {
      title: 'Dashboard KPI',
      steps: [
        { label: 'เปิดหน้า Dashboard', link: '/admin' },
        { label: 'ตรวจ 3 ตัวเลขหลัก: Gross Revenue, Total Orders, Tax Collected' },
        { label: 'ตรวจกราฟ Revenue Trend (เส้น)' },
        { label: 'ตรวจกราฟ Sales by Payment Method (โดนัท)' },
      ],
    },
    {
      title: 'Low Stock Alert',
      steps: [
        { label: 'ใน Dashboard → ตรวจส่วน Low Stock Alert' },
        { label: 'เปิด Inventory → ตรวจรายการที่สต็อกต่ำกว่า Reorder Level', link: '/admin/inventory' },
      ],
    },
    {
      title: 'Reports ยอดขาย',
      steps: [
        { label: 'เปิดหน้า Reports', link: '/admin/reports' },
        { label: 'เลือกช่วงเวลา: 7D / 30D / YTD' },
        { label: 'ตรวจกราฟ: Revenue Trend, Payment Method, Category Breakdown' },
        { label: 'ตรวจตาราง Top Selling Items (Top 5)' },
      ],
    },
  ],

  'Online Store': [
    {
      title: 'Webstore แสดงเมนู + ราคา',
      steps: [
        { label: 'เปิดหน้า Webstore', link: '/store' },
        { label: 'ตรวจหมวดหมู่แสดงถูกต้อง + สามารถเลื่อนเลือกได้' },
        { label: 'ตรวจสินค้าแสดงชื่อ + ราคาถูกต้อง' },
        { label: 'ตรวจสวิตช์ Pickup/Delivery สลับราคาได้' },
      ],
    },
    {
      title: 'สั่งออเดอร์ + ส่ง KDS',
      steps: [
        { label: 'คลิก "Add" สินค้า → เลือก modifier (ถ้ามี)' },
        { label: 'กดปุ่มตะกร้า → "Proceed to Checkout"' },
        { label: 'กรอก ชื่อ, เบอร์, เลือกวิธีชำระเงิน' },
        { label: 'กด "Confirm & Place Order"', note: 'สร้างลูกค้าใหม่อัตโนมัติ + สร้างออเดอร์' },
        { label: 'ตรวจออเดอร์ส่งไป KDS ได้', link: '/kds' },
      ],
    },
    {
      title: 'Chatbot สั่งออเดอร์',
      steps: [
        { label: 'เปิดหน้า Chatbot', link: '/bot' },
        { label: 'พิมพ์ข้อความสั่งอาหาร (เช่น "I want Pad Thai")' },
        { label: 'ตรวจ AI ตอบกลับ + แสดงรายการอาหาร' },
        { label: 'ยืนยันออเดอร์ → AI ถามชื่อ/เบอร์ → สร้างออเดอร์' },
        { label: 'ตรวจข้อความยืนยันพร้อม Order ID + ยอดเงิน' },
      ],
    },
  ],
};

const defaultChecklist: ChecklistItem[] = [
  { id: 's1', section: 'ตั้งค่าร้าน',     label: 'ตั้งชื่อร้าน, เบอร์โทร, อัตราภาษี',          checked: false, link: '/admin/settings' },
  { id: 's2', section: 'ตั้งค่าร้าน',     label: 'ตั้งค่าเงินทอนเริ่มกะ',                  checked: false, link: '/admin/settings' },
  { id: 's3', section: 'ตั้งค่าร้าน',     label: 'ตั้งหัว/ท้ายใบเสร็จ',                   checked: false, link: '/admin/settings' },
  { id: 's4', section: 'ตั้งค่าร้าน',     label: 'ตั้งค่าโต๊ะอาหาร (โซน, จำนวนที่นั่ง)',       checked: false, link: '/admin/tables' },

  { id: 'st1', section: 'พนักงาน',       label: 'สร้างพนักงาน + PIN + บทบาท',            checked: false, link: '/admin/staff' },
  { id: 'st2', section: 'พนักงาน',       label: 'ทดสอบ Login PIN → route ถูกต้องตามบทบาท',  checked: false, link: '/login' },

  { id: 'i1', section: 'วัตถุดิบ & สต็อก', label: 'เพิ่มวัตถุดิบ + ต้นทุนต่อหน่วย',          checked: false, link: '/admin/inventory' },
  { id: 'i2', section: 'วัตถุดิบ & สต็อก', label: 'ปรับสต็อกเริ่มต้น',                   checked: false, link: '/admin/inventory' },
  { id: 'i3', section: 'วัตถุดิบ & สต็อก', label: 'เพิ่มซัพพลายเออร์ + ราคาซื้อ',         checked: false, link: '/admin/inventory' },
  { id: 'i4', section: 'วัตถุดิบ & สต็อก', label: 'ทดสอบ Batch Produce (ตัดลูกเพิ่มแม่)',  checked: false, link: '/admin/inventory' },

  { id: 'm1', section: 'เมนู & สูตร',    label: 'สร้างหมวดหมู่เมนู',                    checked: false, link: '/admin/menu' },
  { id: 'm2', section: 'เมนู & สูตร',    label: 'สร้างสินค้า + 3 ระดับราคา',             checked: false, link: '/admin/menu' },
  { id: 'm3', section: 'เมนู & สูตร',    label: 'ตั้ง Modifier/Customization + ปรับราคา',  checked: false, link: '/admin/menu' },
  { id: 'm4', section: 'เมนู & สูตร',    label: 'ผูกสูตรทุกเมนู + ปริมาณวัตถุดิบ',       checked: false, link: '/admin/recipe' },
  { id: 'm5', section: 'เมนู & สูตร',    label: 'ผูก Sub-Recipe ทั้งหมด',               checked: false, link: '/admin/recipe' },
  { id: 'm6', section: 'เมนู & สูตร',    label: 'ตรวจต้นทุน/กำไรถูกต้อง',               checked: false, link: '/admin/recipe' },
  { id: 'm7', section: 'เมนู & สูตร',    label: 'POS แสดง Out of Stock ถูกต้อง',        checked: false, link: '/pos' },

  { id: 'p1', section: 'POS & ขาย',      label: 'เปิดกะ + เลือกพนักงาน',                checked: false, link: '/pos' },
  { id: 'p2', section: 'POS & ขาย',      label: 'สั่งขาย + เพิ่มลงตะกร้าถูกต้อง',        checked: false, link: '/pos' },
  { id: 'p3', section: 'POS & ขาย',      label: 'เลือกโต๊ะ Dine-in',                    checked: false, link: '/pos' },
  { id: 'p4', section: 'POS & ขาย',      label: 'แนบลูกค้า + สมัครสมาชิก',              checked: false, link: '/pos' },
  { id: 'p5', section: 'POS & ขาย',      label: 'ชำระเงิน CASH + ตรวจสต็อกตัดถูก',      checked: false, link: '/pos' },
  { id: 'p6', section: 'POS & ขาย',      label: 'ชำระเงิน CARD',                       checked: false, link: '/pos' },
  { id: 'p7', section: 'POS & ขาย',      label: 'ใช้บัตรของขวัญชำระ',                   checked: false, link: '/pos' },
  { id: 'p8', section: 'POS & ขาย',      label: 'พิมพ์ใบเสร็จ + ตรวจหัว/ท้าย',           checked: false, link: '/pos' },
  { id: 'p9', section: 'POS & ขาย',      label: 'ปิดกะ + ตรวจยอด',                     checked: false, link: '/admin/shifts' },

  { id: 'k1', section: 'ครัว (KDS)',    label: 'คิวจาก POS เด้งมาที่ KDS',              checked: false, link: '/kds' },
  { id: 'k2', section: 'ครัว (KDS)',    label: 'เปลี่ยนสถานะคิว + สี/จับเวลาถูก',       checked: false, link: '/kds' },

  { id: 'c1', section: 'CRM & ลูกค้า',   label: 'รายชื่อลูกค้า + ประวัติซื้อ',          checked: false, link: '/admin/crm' },
  { id: 'c2', section: 'CRM & ลูกค้า',   label: 'Tier คำนวณถูกต้อง + แต้มเพิ่ม',       checked: false, link: '/admin/crm' },

  { id: 'po1', section: 'Purchasing',    label: 'สร้าง PO + เลือกซัพพลายเออร์',         checked: false, link: '/admin/purchasing' },
  { id: 'po2', section: 'Purchasing',    label: 'รับของเข้า → สต็อกเพิ่มถูกต้อง',        checked: false, link: '/admin/purchasing' },

  { id: 'r1', section: 'Reports',       label: 'Dashboard KPI + กราฟ',               checked: false, link: '/admin' },
  { id: 'r2', section: 'Reports',       label: 'Low Stock Alert',                     checked: false, link: '/admin' },
  { id: 'r3', section: 'Reports',       label: 'Reports ยอดขาย 7D/30D',              checked: false, link: '/admin/reports' },

  { id: 'o1', section: 'Online Store',  label: 'Webstore แสดงเมนู + ราคาถูกต้อง',      checked: false, link: '/store' },
  { id: 'o2', section: 'Online Store',  label: 'สั่งออเดอร์ + ส่งไป KDS',            checked: false, link: '/store' },
  { id: 'o3', section: 'Online Store',  label: 'Chatbot ตอบคำถาม + สั่งออเดอร์',       checked: false, link: '/bot' },
];

function getSections(items: ChecklistItem[]): string[] {
  const seen = new Set<string>();
  const sections: string[] = [];
  for (const item of items) {
    if (!seen.has(item.section)) {
      seen.add(item.section);
      sections.push(item.section);
    }
  }
  return sections;
}

const SECTION_COLORS: Record<string, { fill: string; stroke: string; text: string; note: string; arrow: string; badgeBg: string; badgeText: string; groupText: string }> = {
  'ตั้งค่าร้าน':     { fill: 'rgba(59,130,246,0.12)', stroke: 'rgba(59,130,246,0.35)', text: '#ffffff', note: 'rgba(255,255,255,0.45)', arrow: 'rgba(59,130,246,0.5)', badgeBg: 'rgba(59,130,246,0.25)', badgeText: '#93c5fd', groupText: '#60a5fa' },
  'พนักงาน':       { fill: 'rgba(139,92,246,0.12)', stroke: 'rgba(139,92,246,0.35)', text: '#ffffff', note: 'rgba(255,255,255,0.45)', arrow: 'rgba(139,92,246,0.5)', badgeBg: 'rgba(139,92,246,0.25)', badgeText: '#c4b5fd', groupText: '#a78bfa' },
  'วัตถุดิบ & สต็อก': { fill: 'rgba(245,158,11,0.12)', stroke: 'rgba(245,158,11,0.35)', text: '#ffffff', note: 'rgba(255,255,255,0.45)', arrow: 'rgba(245,158,11,0.5)', badgeBg: 'rgba(245,158,11,0.25)', badgeText: '#fcd34d', groupText: '#fbbf24' },
  'เมนู & สูตร':    { fill: 'rgba(249,115,22,0.12)', stroke: 'rgba(249,115,22,0.35)', text: '#ffffff', note: 'rgba(255,255,255,0.45)', arrow: 'rgba(249,115,22,0.5)', badgeBg: 'rgba(249,115,22,0.25)', badgeText: '#fdba74', groupText: '#fb923c' },
  'POS & ขาย':      { fill: 'rgba(16,185,129,0.12)', stroke: 'rgba(16,185,129,0.35)', text: '#ffffff', note: 'rgba(255,255,255,0.45)', arrow: 'rgba(16,185,129,0.5)', badgeBg: 'rgba(16,185,129,0.25)', badgeText: '#6ee7b7', groupText: '#34d399' },
  'ครัว (KDS)':    { fill: 'rgba(244,63,94,0.12)', stroke: 'rgba(244,63,94,0.35)', text: '#ffffff', note: 'rgba(255,255,255,0.45)', arrow: 'rgba(244,63,94,0.5)', badgeBg: 'rgba(244,63,94,0.25)', badgeText: '#fda4af', groupText: '#fb7185' },
  'CRM & ลูกค้า':   { fill: 'rgba(236,72,153,0.12)', stroke: 'rgba(236,72,153,0.35)', text: '#ffffff', note: 'rgba(255,255,255,0.45)', arrow: 'rgba(236,72,153,0.5)', badgeBg: 'rgba(236,72,153,0.25)', badgeText: '#f9a8d4', groupText: '#f472b6' },
  'Purchasing':    { fill: 'rgba(6,182,212,0.12)', stroke: 'rgba(6,182,212,0.35)', text: '#ffffff', note: 'rgba(255,255,255,0.45)', arrow: 'rgba(6,182,212,0.5)', badgeBg: 'rgba(6,182,212,0.25)', badgeText: '#67e8f9', groupText: '#22d3ee' },
  'Reports':       { fill: 'rgba(234,179,8,0.12)', stroke: 'rgba(234,179,8,0.35)', text: '#ffffff', note: 'rgba(255,255,255,0.45)', arrow: 'rgba(234,179,8,0.5)', badgeBg: 'rgba(234,179,8,0.25)', badgeText: '#fde047', groupText: '#facc15' },
  'Online Store':  { fill: 'rgba(20,184,166,0.12)', stroke: 'rgba(20,184,166,0.35)', text: '#ffffff', note: 'rgba(255,255,255,0.45)', arrow: 'rgba(20,184,166,0.5)', badgeBg: 'rgba(20,184,166,0.25)', badgeText: '#5eead4', groupText: '#2dd4bf' },
};

const DEFAULT_SVG_COLORS = {
  fill: 'rgba(255,255,255,0.06)',
  stroke: 'rgba(255,255,255,0.15)',
  text: '#ffffff',
  note: 'rgba(255,255,255,0.4)',
  arrow: 'rgba(255,255,255,0.25)',
  badgeBg: 'rgba(255,255,255,0.1)',
  badgeText: '#ffffff',
  groupText: 'rgba(255,255,255,0.6)',
};

const BOX_W = 300;
const BOX_RX = 10;
const BOX_PAD_X = 12;
const BOX_MIN_H = 40;
const BOX_PAD_Y = 10;
const ARROW_H = 18;
const GROUP_GAP = 16;
const GROUP_HEADER_H = 28;
const SVG_PAD = 16;

function FlowDiagramSVG({ groups, sectionName, zoom, onZoomChange }: { groups: FlowGroup[]; sectionName: string; zoom: number; onZoomChange: (z: number) => void }) {
  const colors = SECTION_COLORS[sectionName] || DEFAULT_SVG_COLORS;
  const BOX_INNER_W = BOX_W - BOX_PAD_X * 2;

  interface Row {
    type: 'box' | 'arrow' | 'groupHeader' | 'spacer';
    y: number;
    h: number;
    groupTitle?: string;
    step?: FlowStep;
    stepNum?: number;
  }

  const rows: Row[] = [];
  let cy = SVG_PAD;
  let globalStepNum = 0;

  for (const group of groups) {
    if (rows.length > 0) {
      rows.push({ type: 'spacer', y: cy, h: GROUP_GAP });
      cy += GROUP_GAP;
    }
    if (group.title) {
      rows.push({ type: 'groupHeader', y: cy, h: GROUP_HEADER_H, groupTitle: group.title });
      cy += GROUP_HEADER_H;
    }
    for (let i = 0; i < group.steps.length; i++) {
      const step = group.steps[i];
      const noteH = step.note ? 14 : 0;
      const estimatedLines = Math.max(1, Math.ceil(step.label.length / 22));
      const contentH = estimatedLines * 16 + noteH;
      const boxH = Math.max(BOX_MIN_H, contentH + BOX_PAD_Y * 2);

      globalStepNum++;
      rows.push({ type: 'box', y: cy, h: boxH, step, stepNum: globalStepNum });
      cy += boxH;

      if (i < group.steps.length - 1) {
        rows.push({ type: 'arrow', y: cy, h: ARROW_H });
        cy += ARROW_H;
      }
    }
  }

  const totalH = cy + SVG_PAD;
  const baseW = BOX_W + SVG_PAD * 2;
  const arrowSize = 5;
  const circleR = 10;
  const circleCX = SVG_PAD + BOX_PAD_X + circleR + 2;
  const textStartX = circleCX + circleR + 8;
  const textMaxW = BOX_INNER_W - (circleR * 2 + 12);

  const vbW = baseW / zoom;
  const vbH = totalH / zoom;

  return (
    <div className="relative bg-theme-bg/70 border-b border-theme-border/50">
      <div className="flex items-center justify-end gap-1 px-4 py-1.5 border-b border-theme-border/30">
        <button
          onClick={() => onZoomChange(Math.max(0.5, zoom - 0.25))}
          className="p-1 rounded text-theme-ink-dim hover:text-theme-ink hover:bg-theme-border/30 transition-colors"
          title="ย่อ"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-mono text-theme-ink-dim w-8 text-center">{zoom.toFixed(2)}x</span>
        <button
          onClick={() => onZoomChange(Math.min(3, zoom + 0.25))}
          className="p-1 rounded text-theme-ink-dim hover:text-theme-ink hover:bg-theme-border/30 transition-colors"
          title="ขยาย"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        {zoom !== 1 && (
          <button
            onClick={() => onZoomChange(1)}
            className="p-1 rounded text-theme-ink-dim hover:text-theme-accent hover:bg-theme-accent/10 transition-colors"
            title="Reset zoom"
          >
            <RotateCw className="w-3 h-3" />
          </button>
        )}
      </div>
      <div style={{ maxHeight: 600, overflow: 'auto' }} className="px-4 py-3">
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          width="100%"
          xmlns="http://www.w3.org/2000/svg"
          style={{ minWidth: baseW }}
        >
          {rows.map((row, ri) => {
            if (row.type === 'spacer') return null;

            if (row.type === 'groupHeader') {
              return (
                <foreignObject key={ri} x={SVG_PAD / zoom} y={(row.y + 2) / zoom} width={BOX_W / zoom} height={row.h / zoom}>
                  <div style={{ color: colors.groupText, fontSize: 11 / zoom, fontWeight: 600, fontFamily: 'inherit', letterSpacing: '0.02em' }}>
                    {row.groupTitle}
                  </div>
                </foreignObject>
              );
            }

            if (row.type === 'arrow') {
              const x = (SVG_PAD + BOX_W / 2) / zoom;
              const ay1 = row.y / zoom;
              const ay2 = (row.y + ARROW_H - arrowSize) / zoom;
              const aTip = (row.y + ARROW_H) / zoom;
              const as = arrowSize / zoom;
              return (
                <g key={ri}>
                  <line x1={x} y1={ay1} x2={x} y2={ay2} stroke={colors.arrow} strokeWidth={1.5} />
                  <polygon
                    points={`${x - as},${aTip - as * 2} ${x + as},${aTip - as * 2} ${x},${aTip}`}
                    fill={colors.arrow}
                  />
                </g>
              );
            }

            const s = row.step!;
            const rx = SVG_PAD / zoom;
            const ry = row.y / zoom;
            const rw = BOX_W / zoom;
            const rh = row.h / zoom;
            const ccx = circleCX / zoom;
            const ccy = (row.y + BOX_PAD_Y + circleR) / zoom;
            const cr = circleR / zoom;
            const tsx = textStartX / zoom;
            const tsy = (row.y + BOX_PAD_Y) / zoom;
            const tmw = textMaxW / zoom;
            const th = (row.h - BOX_PAD_Y * 2) / zoom;

            return (
              <g key={ri}>
                <rect
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  rx={BOX_RX / zoom}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={1}
                />
                <circle
                  cx={ccx}
                  cy={ccy}
                  r={cr}
                  fill={colors.badgeBg}
                />
                <text
                  x={ccx}
                  y={ccy + 1 / zoom}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={colors.badgeText}
                  fontSize={10 / zoom}
                  fontWeight={700}
                  fontFamily="inherit"
                >
                  {row.stepNum}
                </text>
                <foreignObject x={tsx} y={tsy} width={tmw} height={th}>
                  <div style={{ fontFamily: 'inherit', color: colors.text, fontSize: 12 / zoom, lineHeight: 1.35 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 / zoom }}>
                      <span style={{ flex: 1 }}>{s.label}</span>
                      {s.link && (
                        <a
                          href={s.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: colors.badgeText, flexShrink: 0, marginTop: 1 / zoom }}
                          title={s.link}
                        >
                          <ExternalLink style={{ width: 12 / zoom, height: 12 / zoom }} />
                        </a>
                      )}
                    </div>
                    {s.note && (
                      <div style={{ color: colors.note, fontSize: 10 / zoom, fontStyle: 'italic', marginTop: 2 / zoom }}>
                        {s.note}
                      </div>
                    )}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function SystemFlowPage() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [staff, setStaff] = useState<StaffPin[]>([]);
  const [isStaffLoading, setIsStaffLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [flowZoom, setFlowZoom] = useState<Record<string, number>>({});

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChecklistItem[];
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].section) {
          setChecklist(parsed);
        } else {
          setChecklist(defaultChecklist);
        }
      } catch {
        setChecklist(defaultChecklist);
      }
    } else {
      setChecklist(defaultChecklist);
    }

    fetchStaff();
  }, []);

  async function fetchStaff() {
    setIsStaffLoading(true);
    try {
      const data = await apiFetchStaff();
      if (data) {
        setStaff((data as unknown as StaffPin[]).sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (error: any) {
      console.error('Error fetching staff:', error.message);
    } finally {
      setIsStaffLoading(false);
    }
  }

  const toggleCheck = (id: string) => {
    const newList = checklist.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setChecklist(newList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  };

  const resetChecklist = () => {
    if (confirm('ต้องการล้างข้อมูล Checklist ทั้งหมดหรือไม่?')) {
      setChecklist(defaultChecklist);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultChecklist));
    }
  };

  const toggleFlow = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const expandAll = () => {
    const allSections = getSections(checklist);
    setExpandedSections(new Set(allSections.filter(s => sectionFlows[s]?.length)));
  };

  const collapseAll = () => setExpandedSections(new Set());

  const getZoom = (section: string) => flowZoom[section] ?? 1;
  const setZoom = (section: string, z: number) => setFlowZoom(prev => ({ ...prev, [section]: z }));

  const sections = getSections(checklist);
  const total = checklist.length;
  const done = checklist.filter(i => i.checked).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-serif italic text-theme-ink mb-2">System Checklist</h1>
        <p className="text-theme-ink-dim text-sm">
          กด "ดู Flow" เพื่ออ่านขั้นตอน → ตรวจสอบตาม Flow แล้วเช็คถูกทีละข้อ
        </p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={expandAll}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-theme-ink-dim hover:text-theme-ink rounded-md border border-theme-border hover:border-theme-accent/40 transition-colors"
          >
            <ChevronsDown className="w-3 h-3" />
            ขยาย Flow ทั้งหมด
          </button>
          <button
            onClick={collapseAll}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-theme-ink-dim hover:text-theme-ink rounded-md border border-theme-border hover:border-theme-accent/40 transition-colors"
          >
            <ChevronsUp className="w-3 h-3" />
            ย่อ Flow ทั้งหมด
          </button>
        </div>
      </div>

      <div className="mb-8 bg-theme-surface border border-theme-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-theme-ink">{done} / {total} รายการ</span>
          <span className="text-sm font-mono text-theme-accent">{pct}%</span>
        </div>
        <div className="w-full h-2 bg-theme-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-theme-accent rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mb-8 bg-theme-surface border border-theme-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-theme-accent" />
          <h2 className="text-sm font-semibold text-theme-ink">Staff PINs — ใช้ทดสอบ Login</h2>
        </div>
        {isStaffLoading ? (
          <div className="flex items-center gap-2 text-theme-ink-dim text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        ) : staff.length === 0 ? (
          <p className="text-sm text-theme-ink-dim">ยังไม่มีพนักงาน — <a href="/admin/staff" target="_blank" rel="noopener noreferrer" className="text-theme-accent underline">เพิ่มพนักงาน</a></p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {staff.map(s => (
              <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-theme-bg rounded-lg border border-theme-border">
                <div className="min-w-0">
                  <span className="text-xs font-medium text-theme-ink truncate block">{s.name}</span>
                  <span className="text-[10px] text-theme-ink-dim uppercase">{s.role}</span>
                </div>
                <div className="ml-auto flex items-center gap-1 px-2 py-0.5 bg-theme-surface rounded border border-theme-border">
                  <span className="text-xs font-mono font-bold text-theme-accent">{s.pin}</span>
                  <Shield className="w-3 h-3 text-theme-ink-dim" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-theme-surface border border-theme-border rounded-xl overflow-hidden">
        {sections.map((section, si) => {
          const meta = sectionMeta[section] || { icon: null, color: 'text-theme-ink-dim', borderColor: 'border-theme-border/30', bgColor: 'bg-theme-bg', badgeBg: 'bg-theme-bg', badgeText: 'text-theme-ink-dim' };
          const items = checklist.filter(i => i.section === section);
          const sectionDone = items.filter(i => i.checked).length;
          const sectionTotal = items.length;
          const isAllDone = sectionDone === sectionTotal;
          const isExpanded = expandedSections.has(section);
          const hasFlow = sectionFlows[section] && sectionFlows[section].length > 0;

          return (
            <div key={section}>
              {si > 0 && <div className="border-t border-theme-border" />}

              <div className="px-5 py-3 flex items-center gap-2 bg-theme-bg/50">
                <span className={meta.color}>{meta.icon}</span>
                <span className={`text-xs font-semibold uppercase tracking-wider ${meta.color}`}>{section}</span>
                {hasFlow && (
                  <button
                    onClick={() => toggleFlow(section)}
                    className={`ml-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${isExpanded ? meta.badgeBg + ' ' + meta.badgeText : 'bg-theme-border/30 text-theme-ink-dim hover:bg-theme-border/50 hover:text-theme-ink'}`}
                  >
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    ดู Flow
                  </button>
                )}
                <span className="ml-auto text-[10px] font-mono text-theme-ink-dim">
                  {sectionDone}/{sectionTotal}
                </span>
                {isAllDone && sectionTotal > 0 && (
                  <CheckCircle className="w-3.5 h-3.5 text-theme-accent" />
                )}
              </div>

              {hasFlow && isExpanded && (
                <FlowDiagramSVG
                  groups={sectionFlows[section]}
                  sectionName={section}
                  zoom={getZoom(section)}
                  onZoomChange={(z) => setZoom(section, z)}
                />
              )}

              <div className="divide-y divide-theme-border/50">
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-theme-bg/30 transition-colors group"
                  >
                    <div className="shrink-0 transition-colors">
                      {item.checked ? (
                        <CheckCircle className="w-4.5 h-4.5 text-theme-accent" />
                      ) : (
                        <Circle className="w-4.5 h-4.5 text-theme-ink-dim group-hover:text-theme-ink" />
                      )}
                    </div>
                    <span className={`text-sm flex-1 transition-colors ${item.checked ? 'text-theme-ink-dim line-through' : 'text-theme-ink'}`}>
                      {item.label}
                    </span>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="shrink-0 p-1 rounded text-theme-ink-dim hover:text-theme-accent hover:bg-theme-accent/10 transition-colors"
                        title={item.link}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={resetChecklist}
          className="flex items-center gap-1.5 text-xs text-theme-ink-dim hover:text-red-400 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Checklist
        </button>
      </div>
    </div>
  );
}
