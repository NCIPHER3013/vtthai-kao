import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const standardProteinCustomization = [
  {
    name: "Protein",
    required: true,
    multiple: false,
    options: [
      { name: "Vegetarian / Tofu", priceAdjustment: 0 },
      { name: "Chicken", priceAdjustment: 0 },
      { name: "Beef", priceAdjustment: 0 },
      { name: "Prawn / Seafood", priceAdjustment: 0 }
    ]
  }
];

const fishCustomization = [
  {
    name: "Option",
    required: true,
    multiple: false,
    options: [
      { name: "Fish Fillet", priceAdjustment: 0 },
      { name: "Whole Fish", priceAdjustment: 0 }
    ]
  }
];

// Dishes that require standard protein selection popup (Chicken, Beef, Seafood, Veg)
const proteinDishes = [
  "Tom Yum", "Tom Kha", "Bangkok Ocean Volcano Noodle",
  "Yellow Curry", "Green Curry", "Red Curry", "Panang Curry",
  "Stir Fried Sweet Basil", "Stir Fried Cashew Nut", "Stir Fried Sweet Ginger",
  "Stir Fried Oyster Sauce", "Stir Fried Sweet & Sour", "Stir Fried Garlic & Pepper",
  "Stir Fried Fresh Chilli Chicken",
  "Pad Thai", "Pad See Ew", "Pad Mee Leung", "Pad Kee Mao", "Spicy Noodle",
  "Thai Fried Rice", "Tom Yum Fried Rice", "Salt & Pepper Crispy Chicken Fried Rice", "Pineapple Fried Rice"
];

// Dishes that require fish fillet vs whole fish selection popup
const fishDishes = [
  "Pla Sarm Rod", "Pla Choo Chee", "Pla Lord Khing", "Lime Fish",
  "Golden Fried Fish", "Steamed Fish with Soy Sauce", "Pla Lui Suan"
];

async function main() {
  console.log("=== POPULATING PRODUCT CUSTOMIZATIONS (MODIFIER POPUPS) ===");

  const { data: products } = await supabase.from('products').select('*');
  if (!products) return;

  for (const prodName of proteinDishes) {
    const prod = products.find(p => p.name.toLowerCase() === prodName.toLowerCase() || p.name.toLowerCase().includes(prodName.toLowerCase()));
    if (prod) {
      console.log(`Setting Protein popup customization for "${prod.name}" (ID: ${prod.id})`);
      const { error } = await supabase.from('products')
        .update({ customizations: standardProteinCustomization })
        .eq('id', prod.id);
      if (error) console.error("Error setting customizations for", prod.name, error);
    }
  }

  for (const prodName of fishDishes) {
    const prod = products.find(p => p.name.toLowerCase() === prodName.toLowerCase() || p.name.toLowerCase().includes(prodName.toLowerCase()));
    if (prod) {
      console.log(`Setting Fish Fillet / Whole Fish popup customization for "${prod.name}" (ID: ${prod.id})`);
      const { error } = await supabase.from('products')
        .update({ customizations: fishCustomization })
        .eq('id', prod.id);
      if (error) console.error("Error setting customizations for", prod.name, error);
    }
  }

  console.log("✅ SUCCESSFULLY POPULATED ALL PRODUCT CUSTOMIZATION POPUPS!");
}

main().catch(console.error);
