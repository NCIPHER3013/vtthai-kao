import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const EXCEL_PATH = 'docs/pos_linked.xlsx';
const wb = XLSX.read(fs.readFileSync(path.resolve(EXCEL_PATH)), { type: 'buffer' });

function clean(s: any): string {
  return String(s || '').trim();
}

function readSheet(name: string, hr: number): Record<string, any>[] {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });
  if (hr >= raw.length) return [];
  const headers: string[] = raw[hr].map((h: any) => clean(h).replace(/\n/g, ' '));
  const result: Record<string, any>[] = [];
  for (let i = hr + 1; i < raw.length; i++) {
    const row: Record<string, any> = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) row[headers[j]] = raw[i][j] ?? '';
    }
    result.push(row);
  }
  return result;
}

function stripVariant(dishName: string): string {
  const variants = ['Chicken', 'Beef', 'Duck', 'Prawn / Seafood', 'Vegetarian / Tofu'];
  for (const v of variants) {
    if (dishName.endsWith(` - ${v}`)) return dishName.replace(` - ${v}`, '').trim();
  }
  return dishName.trim();
}

async function exportExcelReport() {
    // 1. Fetch DB
    const { data: dbProducts } = await supabase.from('products').select('id, name');
    const { data: dbStockItems } = await supabase.from('stock_items').select('id, name');
    const { data: dbRecipes } = await supabase.from('recipes').select('product_id, inventory_item_id, variant');

    const prodIdToName = new Map(dbProducts?.map(p => [p.id, p.name]));
    const stockIdToName = new Map(dbStockItems?.map(s => [s.id, s.name]));
    const dbRecipeSet = new Set(dbRecipes?.map(r => {
        const pName = prodIdToName.get(r.product_id) || 'Unknown';
        const iName = stockIdToName.get(r.inventory_item_id) || 'Unknown';
        return `${pName}|${iName}|${r.variant || 'null'}`;
    }));

    // 2. Parse Excel
    const recipeRows = readSheet('Recipes', 3);
    const excelRecipes: {product: string, ingredient: string, variant: string}[] = [];
    let currentDish = '';
    for (const r of recipeRows) {
        const dishName = clean(r['Dish Name']);
        const ingredient = clean(r['Ingredient (from Stock Items)']);
        if (dishName && !dishName.startsWith('▌')) currentDish = dishName;
        if (!currentDish || currentDish.startsWith('▌') || !ingredient) continue;
        
        let variant = 'null';
        const variants = ['Chicken', 'Beef', 'Duck', 'Prawn / Seafood', 'Vegetarian / Tofu'];
        for (const v of variants) {
            if (currentDish.endsWith(` - ${v}`)) variant = v;
        }

        const baseName = stripVariant(currentDish);
        excelRecipes.push({ product: baseName, ingredient, variant });
    }

    // 3. Find missing
    const missingRecipes = excelRecipes.filter(r => !dbRecipeSet.has(`${r.product}|${r.ingredient}|${r.variant}`));
    
    // 4. Create Excel output data
    const exportData = missingRecipes.map(r => {
        const variantStr = r.variant === 'null' ? 'พื้นฐาน (Base)' : r.variant;
        let reason = 'ไม่มีวัตถุดิบนี้ในหน้า Stock Items';
        if (r.ingredient.toUpperCase() === 'N/A') reason = 'ระบุชื่อวัตถุดิบเป็น N/A';
        
        return {
            "ชื่อเมนู (Product)": r.product,
            "ตัวเลือก (Variant)": variantStr,
            "วัตถุดิบในสูตรที่หาไม่เจอ (Missing Ingredient)": r.ingredient,
            "สาเหตุปัญหา (Issue Reason)": reason
        };
    });

    const newWb = XLSX.utils.book_new();
    const newWs = XLSX.utils.json_to_sheet(exportData);
    
    // Adjust column widths
    newWs['!cols'] = [
        { wch: 30 },
        { wch: 20 },
        { wch: 40 },
        { wch: 40 }
    ];

    XLSX.utils.book_append_sheet(newWb, newWs, "Missing Recipes");

    const outputPath = path.resolve('docs/missing_data_report.xlsx');
    XLSX.writeFile(newWb, outputPath);
    console.log(`Excel report generated at: ${outputPath}`);
}

exportExcelReport();
