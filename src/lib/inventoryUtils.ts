import { Product, SubRecipeIngredient } from '../types';

export function calculateProductAvailability(
  products: Product[],
  recipes: any[],
  stockItems: any[],
  subRecipeIngredients: SubRecipeIngredient[]
) {
  const productAvailability: Record<string, boolean> = {};
  const variantAvailability: Record<string, boolean> = {}; // key: "product_id::variant"

  // Helper to check if a specific inventory item is in stock for a given quantity
  const checkStock = (inventoryItemId: number | string, requiredQty: number): boolean => {
    const parentStock = stockItems.find(s => s.id === inventoryItemId);
    const subRecipes = subRecipeIngredients.filter(sub => String(sub.parent_item_id) === String(inventoryItemId));

    if (subRecipes.length > 0) {
      // It's a compound item, check if all child items have enough stock
      return subRecipes.every(sub => {
        const childStock = stockItems.find(s => String(s.id) === String(sub.child_item_id));
        return childStock && childStock.current_stock >= (requiredQty * sub.quantity);
      });
    } else {
      // It's a base item
      return parentStock && parentStock.current_stock >= requiredQty;
    }
  };

  products.forEach(product => {
    const productRecipes = recipes.filter(r => r.product_id === product.id);
    
    if (productRecipes.length === 0) {
      productAvailability[product.id] = true;
      return;
    }

    // A product is available if its BASE recipes (variant is null or empty) are in stock
    const baseRecipes = productRecipes.filter(r => !r.variant);
    
    const isBaseAvailable = baseRecipes.length === 0 || baseRecipes.every(recipe => 
      checkStock(recipe.inventory_item_id, recipe.quantity)
    );

    // Now calculate variant availability
    const variants = [...new Set(productRecipes.map(r => r.variant).filter(Boolean))];
    let anyVariantAvailable = variants.length === 0;

    variants.forEach(variant => {
      const variantRecipes = productRecipes.filter(r => r.variant === variant);
      const isVariantAvailable = variantRecipes.every(recipe => 
        checkStock(recipe.inventory_item_id, recipe.quantity)
      );
      
      variantAvailability[`${product.id}::${variant}`] = isVariantAvailable;
      if (isVariantAvailable) {
        anyVariantAvailable = true;
      }
    });

    // Product is available if base is available AND (if it has variants, at least one is available)
    productAvailability[product.id] = isBaseAvailable && anyVariantAvailable;
  });

  Object.keys(variantAvailability).forEach(key => {
    if (key.endsWith('::Meat')) variantAvailability[key.replace(/::Meat$/, '::Beef')] = variantAvailability[key];
  });

  return { productAvailability, variantAvailability };
}
