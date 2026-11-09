import { useState, useEffect } from 'react';
import { ChefHat, Plus, Trash2, Search, Package, Loader2, ArrowRight, Edit2, X } from 'lucide-react';
import { Product, StockItem, Recipe, SubRecipeIngredient } from '../../lib/supabase';
import { fetchProducts as apiFetchProducts, updateProduct } from '../../lib/api/products';
import { fetchInventory } from '../../lib/api/inventory';
import { fetchRecipes, fetchAllSubRecipeIngredients, createRecipe, deleteRecipe, createSubRecipeIngredient, deleteSubRecipeIngredient, updateRecipe, updateSubRecipeIngredient } from '../../lib/api/recipes';
import { DbError } from '../../lib/api/errors';
import { Pagination } from '../../components/ui/Pagination';

import {
  EXTRA_CHOICES,
  MEAT_CHOICES,
  findExtraIndex,
  findMeatIndex,
  setExtrasEnabled,
  setMeatRequired,
  setOptionPrice,
  toggleGroupOption
} from '../../lib/meatOptions';

function MeatSettings({ product, onSave }: { product: Product; onSave: (customizations: any[]) => Promise<void> }) {
  const groups: any[] = Array.isArray(product.customizations) ? product.customizations : [];
  const meatIdx = findMeatIndex(groups);
  const extraIdx = findExtraIndex(groups);
  const meat = meatIdx >= 0 ? groups[meatIdx] : null;
  const extra = extraIdx >= 0 ? groups[extraIdx] : null;
  const meatRequired = !!meat?.required;

  return (
    <div className="mb-8 border border-theme-border rounded-lg overflow-hidden">
      <div className="bg-theme-surface-alt px-4 py-3 border-b border-theme-border">
        <span className="text-xs md:text-sm uppercase tracking-wider font-bold text-theme-accent">Meat options (customer choices)</span>
      </div>
      <div className="p-4 grid gap-6 md:grid-cols-2">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-theme-ink cursor-pointer">
            <input
              type="checkbox"
              checked={meatRequired}
              onChange={(e) => onSave(setMeatRequired(groups, e.target.checked))}
              className="w-4 h-4 accent-[#C5A059]"
            />
            Customer must select meat (required)
          </label>
          <p className="text-xs text-theme-ink-dim mt-1">The order cannot be added until one is chosen.</p>
          {meat && (
            <div className="mt-3 flex flex-wrap gap-2">
              {MEAT_CHOICES.map((name) => {
                const on = meat.options.some((o: any) => o.name === name);
                return (
                  <label
                    key={name}
                    className={`flex items-center gap-2 px-3 py-1.5 border text-xs cursor-pointer ${on ? 'border-theme-accent text-theme-accent' : 'border-theme-border text-theme-ink-dim'}`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => onSave(toggleGroupOption(groups, meatIdx, name, e.target.checked))}
                      className="w-3.5 h-3.5 accent-[#C5A059]"
                    />
                    {name}
                  </label>
                );
              })}
            </div>
          )}
          {meat && (
            <p className="text-xs text-theme-ink-dim mt-2">Extra charge per meat can be set in the recipe sections below.</p>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-theme-ink cursor-pointer">
            <input
              type="checkbox"
              checked={!!extra}
              onChange={(e) => onSave(setExtrasEnabled(groups, e.target.checked))}
              className="w-4 h-4 accent-[#C5A059]"
            />
            Optional extras (add more meat)
          </label>
          <p className="text-xs text-theme-ink-dim mt-1">Optional. Unlocked after the customer has chosen their meat.</p>
          {extra && (
            <div className="mt-3 space-y-2">
              {EXTRA_CHOICES.map((name) => {
                const opt = extra.options.find((o: any) => o.name === name);
                return (
                  <div key={`${product.id}-${name}`} className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs text-theme-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!opt}
                        onChange={(e) => onSave(toggleGroupOption(groups, extraIdx, name, e.target.checked))}
                        className="w-3.5 h-3.5 accent-[#C5A059]"
                      />
                      {name}
                    </label>
                    {opt && (
                      <div className="flex items-center gap-1 bg-theme-bg px-2 py-1 border border-theme-border text-xs">
                        <span className="text-theme-ink-dim font-mono">+$</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          defaultValue={Number(opt.priceAdjustment ?? opt.price_adjustment ?? 0)}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            if (val !== Number(opt.priceAdjustment ?? 0)) onSave(setOptionPrice(groups, extraIdx, name, val));
                          }}
                          className="w-16 bg-transparent text-right font-mono text-theme-accent font-bold focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RecipePage() {
  const [activeTab, setActiveTab] = useState<'menu' | 'batch'>('menu');
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [subRecipes, setSubRecipes] = useState<SubRecipeIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<StockItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  
  // Add Ingredient State
  const [isAdding, setIsAdding] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [showIngredientDropdown, setShowIngredientDropdown] = useState(false);

  // Edit State
  const [editingRecipeId, setEditingRecipeId] = useState<string | number | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editingItemName, setEditingItemName] = useState('');

  const VARIANTS = [
    { label: 'Base (All Variants)', value: '' },
    { label: 'Chicken', value: 'Chicken' },
    { label: 'Beef', value: 'Beef' },
    { label: 'Duck', value: 'Duck' },
    { label: 'Prawn / Seafood', value: 'Prawn / Seafood' },
    { label: 'Vegetarian / Tofu', value: 'Vegetarian / Tofu' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [prodData, invData, recData, subData] = await Promise.all([
        apiFetchProducts(true),
        fetchInventory(),
        fetchRecipes(),
        fetchAllSubRecipeIngredients()
      ]);

      setProducts(prodData);
      setInventory(invData);
      setRecipes(recData);
      setSubRecipes(subData || []);
      
      if (prodData.length > 0 && !selectedProduct) {
        setSelectedProduct(prodData[0]);
      }
    } catch (error: any) {
      console.error('Error fetching recipe data:', error);
      if (error instanceof DbError) {
        alert(error.userMessage);
      } else {
        alert('Error fetching recipe data. Make sure the recipes table is created.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handleAddIngredient = async () => {
    if (!selectedInventoryId || !quantity) return;
    
    if (activeTab === 'menu' && selectedProduct) {
      try {
        const payload = {
          product_id: selectedProduct.id,
          inventory_item_id: selectedInventoryId,
          quantity: parseFloat(quantity),
          variant: selectedVariant || null
        };

        try {
          const newRecipe = await createRecipe(payload as any);
          setRecipes([...recipes, newRecipe]);
        } catch (err) {
          if (err instanceof DbError && err.isDuplicate) {
            throw new Error('This ingredient is already in the recipe for this variant. Please delete it to update.');
          }
          throw err;
        }

        setIsAdding(false);
        setSelectedInventoryId('');
        setQuantity('');
        setSelectedVariant('');
      } catch (error: any) {
        console.error('Error adding recipe ingredient:', error);
        alert(error.message || 'Failed to add ingredient');
      }
    } else if (activeTab === 'batch' && selectedBatch) {
      try {
        const payload = {
          parent_item_id: selectedBatch.id,
          child_item_id: selectedInventoryId,
          quantity: parseFloat(quantity)
        };

        try {
          const newSubRecipe = await createSubRecipeIngredient(payload);
          setSubRecipes([...subRecipes, newSubRecipe]);
        } catch (err) {
          if (err instanceof DbError && err.isDuplicate) {
            throw new Error('This ingredient is already in the sub-recipe. Please delete it to update.');
          }
          throw err;
        }

        setIsAdding(false);
        setSelectedInventoryId('');
        setQuantity('');
      } catch (error: any) {
        console.error('Error adding sub-recipe ingredient:', error);
        alert(error.message || 'Failed to add ingredient');
      }
    }
  };

  const handleRemoveIngredient = async (recipeId: string | number) => {
    if (activeTab === 'menu') {
      try {
        await deleteRecipe(recipeId);
        setRecipes(recipes.filter(r => r.id !== recipeId));
      } catch (error: any) {
        console.error('Error removing ingredient:', error);
        alert('Failed to remove ingredient');
      }
    } else {
      try {
        await deleteSubRecipeIngredient(recipeId);
        setSubRecipes(subRecipes.filter(r => r.id !== recipeId));
      } catch (error: any) {
        console.error('Error removing ingredient:', error);
        alert('Failed to remove ingredient');
      }
    }
  };

  const handleUpdateIngredient = async (recipeId: string | number) => {
    if (!editQuantity) return;
    const qty = parseFloat(editQuantity);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid positive quantity.');
      return;
    }

    if (activeTab === 'menu') {
      try {
        const updated = await updateRecipe(recipeId.toString(), qty);
        setRecipes(recipes.map(r => r.id === recipeId ? { ...r, ...updated } : r));
        setEditingRecipeId(null);
      } catch (error: any) {
        console.error('Error updating ingredient:', error);
        alert('Failed to update ingredient quantity');
      }
    } else {
      try {
        const updated = await updateSubRecipeIngredient(recipeId, qty);
        setSubRecipes(subRecipes.map(r => r.id === recipeId ? { ...r, ...updated } : r));
        setEditingRecipeId(null);
      } catch (error: any) {
        console.error('Error updating ingredient:', error);
        alert('Failed to update ingredient quantity');
      }
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filteredBatches = inventory.filter(i => 
    i.category === 'Sub-Recipe' && i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const paginatedBatches = filteredBatches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getProductRecipes = (productId: string) => {
    return recipes.filter(r => r.product_id === productId);
  };

  const getSubRecipes = (item_id: string) => {
    return subRecipes.filter(r => r.parent_item_id === item_id);
  };

  const currentRecipes = activeTab === 'menu' 
    ? (selectedProduct ? getProductRecipes(selectedProduct.id) : [])
    : [];
    
  const currentSubRecipes = activeTab === 'batch'
    ? (selectedBatch ? getSubRecipes(selectedBatch.id) : [])
    : [];

  const filteredInventory = ingredientSearch.trim()
    ? inventory.filter(i => i.name.toLowerCase().includes(ingredientSearch.toLowerCase()))
    : inventory;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <header className="mb-8 shrink-0">
        <h1 className="font-serif text-3xl text-theme-ink mb-2">Recipe Management</h1>
        <p className="text-theme-ink-dim text-sm">Design sub-recipes and link menu items to inventory materials to auto-deduct stock upon sales.</p>
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-theme-accent animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex border-b border-theme-border mb-6">
            <button
              onClick={() => { setActiveTab('menu'); setIsAdding(false); }}
              className={`px-6 py-3 text-xs uppercase tracking-wider font-semibold transition-colors border-b-2 ${
                activeTab === 'menu' 
                  ? 'border-theme-accent text-theme-accent' 
                  : 'border-transparent text-theme-ink-dim hover:text-theme-ink'
              }`}
            >
              Menu Products
            </button>
            <button
              onClick={() => { setActiveTab('batch'); setIsAdding(false); }}
              className={`px-6 py-3 flex items-center gap-2 text-xs uppercase tracking-wider font-semibold transition-colors border-b-2 ${
                activeTab === 'batch' 
                  ? 'border-theme-accent text-theme-accent' 
                  : 'border-transparent text-theme-ink-dim hover:text-theme-ink'
              }`}
            >
              <Package className="w-4 h-4" />
              Sub-Recipes (Batch Prep)
            </button>
          </div>

          <div className="w-full flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[500px] md:min-h-[600px] h-auto md:h-[calc(100vh-16rem)]">
            {/* Left: Item List */}
            <div className={`bg-theme-surface border border-theme-border flex-col h-[500px] md:h-full overflow-hidden ${showMobileDetail ? 'hidden md:flex' : 'flex'}`}>
              <div className="p-4 border-b border-theme-border bg-theme-surface-alt shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-ink-dim" />
                  <input
                    type="text"
                    placeholder={`Search ${activeTab === 'menu' ? 'products' : 'sub-recipes'}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-theme-bg border border-theme-border py-2 pl-10 pr-4 text-sm text-theme-ink focus:outline-none focus:border-theme-accent transition-colors"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto divide-y divide-theme-border">
                {activeTab === 'menu' ? (
                  paginatedProducts.map(product => {
                    const isSelected = selectedProduct?.id === product.id;
                    const recCount = getProductRecipes(product.id).length;
                    return (
                      <button
                        key={product.id}
                        onClick={() => { setSelectedProduct(product); setIsAdding(false); setShowMobileDetail(true); }}
                        className={`w-full text-left p-4 flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-theme-accent/5 border-l-4 border-l-theme-accent' : 'hover:bg-theme-surface-alt border-l-4 border-l-transparent'
                        }`}
                      >
                        <div>
                          <h3 className={`font-serif ${isSelected ? 'text-theme-accent' : 'text-theme-ink'}`}>
                            {product.name}
                            {product.plu && <span className="ml-2 text-[10px] font-mono text-theme-ink-dim bg-theme-bg px-1 border border-theme-border rounded-sm">{product.plu}</span>}
                          </h3>
                          <p className="text-[11px] uppercase tracking-wider text-theme-ink-dim mt-1">{product.category}</p>
                        </div>
                        {recCount > 0 ? (
                          <span className="text-[10px] bg-theme-bg border border-theme-border px-2 py-1 rounded-sm text-theme-ink">
                            {recCount} items
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 border border-amber-400/30 bg-amber-400/10 px-2 py-1 rounded-sm">
                            No recipe
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  paginatedBatches.map(batch => {
                    const isSelected = selectedBatch?.id === batch.id;
                    const recCount = getSubRecipes(batch.id).length;
                    return (
                      <button
                        key={batch.id}
                        onClick={() => { setSelectedBatch(batch); setIsAdding(false); setShowMobileDetail(true); }}
                        className={`w-full text-left p-4 flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-theme-accent/5 border-l-4 border-l-theme-accent' : 'hover:bg-theme-surface-alt border-l-4 border-l-transparent'
                        }`}
                      >
                        <div>
                          <h3 className={`font-serif ${isSelected ? 'text-theme-accent' : 'text-theme-ink'}`}>
                            {batch.name}
                          </h3>
                          <p className="text-[11px] uppercase tracking-wider text-theme-ink-dim mt-1">Yield Unit: 1 {batch.unit}</p>
                        </div>
                        {recCount > 0 ? (
                          <span className="text-[10px] bg-theme-bg border border-theme-border px-2 py-1 rounded-sm text-theme-ink">
                            {recCount} items
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 border border-amber-400/30 bg-amber-400/10 px-2 py-1 rounded-sm">
                            No recipe
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="border-t border-theme-border mt-auto">
                <Pagination 
                  currentPage={currentPage}
                  totalItems={activeTab === 'menu' ? filteredProducts.length : filteredBatches.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>

          {/* Right: Recipe Details */}
          <div className={`md:col-span-2 bg-theme-surface border border-theme-border flex-col h-[600px] md:h-full overflow-hidden ${showMobileDetail ? 'flex' : 'hidden md:flex'}`}>
            {(activeTab === 'menu' && selectedProduct) || (activeTab === 'batch' && selectedBatch) ? (
              <>
                <div className="p-4 md:p-6 border-b border-theme-border bg-theme-surface-alt shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <button 
                      onClick={() => setShowMobileDetail(false)} 
                      className="md:hidden text-xs text-theme-accent font-bold mb-2 flex items-center gap-1 bg-theme-accent/10 px-2.5 py-1 rounded border border-theme-accent/20"
                    >
                      ← Back to {activeTab === 'menu' ? 'Product List' : 'Sub-Recipe List'}
                    </button>
                    <h2 className="font-serif text-xl md:text-2xl text-theme-ink">
                      {activeTab === 'menu' ? selectedProduct?.name : selectedBatch?.name}
                      {activeTab === 'menu' && selectedProduct?.middle_name && <span className="ml-3 text-lg text-theme-ink-dim font-sans">{selectedProduct.middle_name}</span>}
                    </h2>
                    <div className="flex gap-4 mt-2">
                       {activeTab === 'menu' ? (
                         <p className="text-xs uppercase tracking-wider text-theme-ink-dim">Selling Price: <span className="text-theme-ink font-semibold">${selectedProduct?.price.toFixed(2)}</span></p>
                       ) : (
                         <p className="text-xs uppercase tracking-wider text-theme-ink-dim">Yield: <span className="text-theme-ink font-semibold">1 {selectedBatch?.unit}</span></p>
                       )}
                       
                       <p className="text-xs uppercase tracking-wider text-theme-ink-dim border-l border-theme-border pl-4">
                         Cost: <span className="text-red-400 font-semibold">${
                           activeTab === 'menu' 
                           ? currentRecipes.reduce((acc, curr) => {
                               const item = inventory.find(i => i.id.toString() === curr.inventory_item_id.toString());
                               return acc + (curr.quantity * (item?.cost_per_unit || 0));
                             }, 0).toFixed(2)
                           : currentSubRecipes.reduce((acc, curr) => {
                               const item = inventory.find(i => i.id.toString() === curr.child_item_id.toString());
                               return acc + (curr.quantity * (item?.cost_per_unit || 0));
                             }, 0).toFixed(2)
                         }</span>
                       </p>
                       
                       {activeTab === 'menu' && selectedProduct && (
                         <p className="text-xs uppercase tracking-wider text-theme-ink-dim border-l border-theme-border pl-4">
                           Profit Margin: <span className="text-emerald-400 font-semibold">{
                             selectedProduct.price > 0 ? 
                               ((selectedProduct.price - currentRecipes.reduce((acc, curr) => {
                                 const item = inventory.find(i => i.id.toString() === curr.inventory_item_id.toString());
                                 return acc + (curr.quantity * (item?.cost_per_unit || 0));
                               }, 0)) / selectedProduct.price * 100).toFixed(1) : 0
                           }%</span>
                         </p>
                       )}
                    </div>
                  </div>
                  <ChefHat className="w-8 h-8 text-theme-accent opacity-20 hidden md:block" />
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === 'menu' && selectedProduct && (
                    <MeatSettings
                      product={selectedProduct}
                      onSave={async (customizations) => {
                        const prev = selectedProduct;
                        setSelectedProduct({ ...selectedProduct, customizations });
                        setProducts(products.map(p => p.id === selectedProduct.id ? { ...p, customizations } : p));
                        try {
                          await updateProduct(selectedProduct.id, { customizations });
                        } catch (err) {
                          setSelectedProduct(prev);
                          setProducts(products.map(p => p.id === prev.id ? prev : p));
                          alert(err instanceof DbError ? err.userMessage : 'Failed to save meat options');
                        }
                      }}
                    />
                  )}
                  {(activeTab === 'menu' ? currentRecipes : currentSubRecipes).length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-theme-border">
                      <Package className="w-8 h-8 text-theme-ink-dim mx-auto mb-3 opacity-50" />
                      <p className="text-theme-ink text-sm">No ingredients linked yet.</p>
                      <p className="text-theme-ink-dim text-xs mt-1">Sales of this {activeTab === 'menu' ? 'product' : 'batch'} will not deduct any stock.</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {activeTab === 'menu' ? (
                        // Grouped View for Menu Products
                        [...new Set(currentRecipes.map(r => r.variant || ''))].sort((a, b) => a.localeCompare(b)).map(variantKey => {
                          const variantRecipes = currentRecipes.filter(r => (r.variant || '') === variantKey);

                          // Find matching customization option for this variant
                          let optMatch: { gIdx: number; oIdx: number; opt: any } | null = null;
                          if (variantKey && selectedProduct?.customizations) {
                            for (let gIdx = 0; gIdx < selectedProduct.customizations.length; gIdx++) {
                              const group = selectedProduct.customizations[gIdx];
                              for (let oIdx = 0; oIdx < group.options.length; oIdx++) {
                                const opt = group.options[oIdx];
                                if (
                                  opt.name.toLowerCase() === variantKey.toLowerCase() ||
                                  variantKey.toLowerCase().includes(opt.name.toLowerCase()) ||
                                  opt.name.toLowerCase().includes(variantKey.toLowerCase())
                                ) {
                                  optMatch = { gIdx, oIdx, opt };
                                  break;
                                }
                              }
                              if (optMatch) break;
                            }
                          }

                          return (
                            <div key={variantKey} className="border border-theme-border rounded-lg overflow-hidden">
                              <div className="bg-theme-surface-alt px-4 py-3 border-b border-theme-border flex flex-wrap justify-between items-center gap-3">
                                <span className="text-xs md:text-sm uppercase tracking-wider font-bold text-theme-accent">
                                  {variantKey || 'Base Recipe (All Variants)'}
                                </span>

                                <div className="flex items-center gap-3">
                                  {optMatch && (
                                    <div className="flex flex-wrap items-center gap-2 border-r border-theme-border pr-3">
                                      <span className="text-xs uppercase font-bold text-theme-ink-dim mr-1">Extra Charge:</span>
                                      
                                      <div className="flex items-center gap-1.5 bg-theme-bg px-2.5 py-1 border border-theme-border rounded-md text-xs shadow-inner hover:border-theme-accent/50 transition-colors" title="Dine-in extra price">
                                        <span className="text-theme-ink-dim font-bold font-mono text-xs">Dine $</span>
                                        <input 
                                          type="number"
                                          step="0.5"
                                          value={optMatch.opt.price_adjustment !== undefined ? optMatch.opt.price_adjustment : (optMatch.opt.price || 0)}
                                          onChange={async (e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            const updated = JSON.parse(JSON.stringify(selectedProduct!.customizations));
                                            updated[optMatch!.gIdx].options[optMatch!.oIdx].price_adjustment = val;
                                            setSelectedProduct({ ...selectedProduct!, customizations: updated });
                                            setProducts(products.map(p => p.id === selectedProduct!.id ? { ...p, customizations: updated } : p));
                                            await updateProduct(selectedProduct!.id, { customizations: updated });
                                          }}
                                          className="w-16 bg-transparent text-right font-mono text-theme-accent font-bold text-sm focus:outline-none focus:ring-1 focus:ring-theme-accent rounded px-1"
                                        />
                                      </div>

                                      <div className="flex items-center gap-1.5 bg-theme-bg px-2.5 py-1 border border-theme-border rounded-md text-xs shadow-inner hover:border-theme-accent/50 transition-colors" title="Takeaway extra price">
                                        <span className="text-theme-ink-dim font-bold font-mono text-xs">T/A $</span>
                                        <input 
                                          type="number"
                                          step="0.5"
                                          value={optMatch.opt.price_takeaway !== undefined ? optMatch.opt.price_takeaway : (optMatch.opt.price_adjustment !== undefined ? optMatch.opt.price_adjustment : (optMatch.opt.price || 0))}
                                          onChange={async (e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            const updated = JSON.parse(JSON.stringify(selectedProduct!.customizations));
                                            updated[optMatch!.gIdx].options[optMatch!.oIdx].price_takeaway = val;
                                            setSelectedProduct({ ...selectedProduct!, customizations: updated });
                                            setProducts(products.map(p => p.id === selectedProduct!.id ? { ...p, customizations: updated } : p));
                                            await updateProduct(selectedProduct!.id, { customizations: updated });
                                          }}
                                          className="w-16 bg-transparent text-right font-mono text-theme-accent font-bold text-sm focus:outline-none focus:ring-1 focus:ring-theme-accent rounded px-1"
                                        />
                                      </div>

                                      <div className="flex items-center gap-1.5 bg-theme-bg px-2.5 py-1 border border-theme-border rounded-md text-xs shadow-inner hover:border-theme-accent/50 transition-colors" title="Delivery extra price">
                                        <span className="text-theme-ink-dim font-bold font-mono text-xs">Del $</span>
                                        <input 
                                          type="number"
                                          step="0.5"
                                          value={optMatch.opt.price_delivery !== undefined ? optMatch.opt.price_delivery : (optMatch.opt.price_adjustment !== undefined ? optMatch.opt.price_adjustment : (optMatch.opt.price || 0))}
                                          onChange={async (e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            const updated = JSON.parse(JSON.stringify(selectedProduct!.customizations));
                                            updated[optMatch!.gIdx].options[optMatch!.oIdx].price_delivery = val;
                                            setSelectedProduct({ ...selectedProduct!, customizations: updated });
                                            setProducts(products.map(p => p.id === selectedProduct!.id ? { ...p, customizations: updated } : p));
                                            await updateProduct(selectedProduct!.id, { customizations: updated });
                                          }}
                                          className="w-16 bg-transparent text-right font-mono text-theme-accent font-bold text-sm focus:outline-none focus:ring-1 focus:ring-theme-accent rounded px-1"
                                        />
                                      </div>
                                    </div>
                                  )}

                                  <span className="text-xs font-semibold text-theme-ink-dim">{variantRecipes.length} items</span>
                                </div>
                              </div>
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-theme-border text-[10px] uppercase tracking-wider text-theme-ink-dim bg-theme-bg/50">
                                    <th className="py-2 px-4 font-medium">Ingredient</th>
                                    <th className="py-2 px-4 font-medium text-right">Quantity</th>
                                    <th className="py-2 px-4 font-medium text-right">Unit Cost</th>
                                    <th className="py-2 px-4 font-medium text-right">Total</th>
                                    <th className="py-2 px-4 font-medium text-right w-16"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-theme-border">
                                  {variantRecipes.map(recipe => {
                                    const item = inventory.find(i => i.id.toString() === recipe.inventory_item_id.toString());
                                    if (!item) return null;
                                    const totalCost = recipe.quantity * (item.cost_per_unit || 0);
                                    return (
                                      <tr key={recipe.id} className="group transition-colors hover:bg-theme-surface-alt/50">
                                        <td className="py-3 px-4">
                                          <div className="flex items-center gap-2">
                                            <Package className="w-3 h-3 text-theme-ink-dim shrink-0" />
                                            <div>
                                              <span className="text-sm text-theme-ink font-medium block">{item.name}</span>
                                              <span className="text-[10px] text-theme-ink-dim uppercase">{item.category}</span>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                          <span className="font-mono text-sm text-theme-ink">{recipe.quantity}</span>
                                          <span className="text-[10px] text-theme-ink-dim ml-1">{item.unit}</span>
                                        </td>
                                        <td className="py-3 px-4 text-right text-theme-ink-dim text-[11px] font-mono">
                                          ${(item.cost_per_unit || 0).toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-sm text-theme-ink">
                                          ${totalCost.toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                              onClick={() => { 
                                                setEditingRecipeId(recipe.id); 
                                                setEditQuantity(recipe.quantity.toString());
                                                setEditingItemName(item.name);
                                              }}
                                              className="text-theme-ink-dim hover:text-theme-accent p-1"
                                              title="Edit Quantity"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                              onClick={() => handleRemoveIngredient(recipe.id)}
                                              className="text-theme-ink-dim hover:text-red-400 p-1"
                                              title="Remove Ingredient"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })
                      ) : (
                        // Standard Table for Sub-Recipes
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-theme-border text-[11px] uppercase tracking-wider text-theme-ink-dim">
                              <th className="pb-3 font-medium">Ingredient</th>
                              <th className="pb-3 font-medium text-right">Quantity Used</th>
                              <th className="pb-3 font-medium text-right">Unit Cost</th>
                              <th className="pb-3 font-medium text-right">Total Cost</th>
                              <th className="pb-3 font-medium text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-theme-border">
                            {currentSubRecipes.map(recipe => {
                              const item = inventory.find(i => i.id.toString() === recipe.child_item_id.toString());
                              if (!item) return null;
                              const totalCost = recipe.quantity * (item.cost_per_unit || 0);
                              return (
                                <tr key={recipe.id} className="group transition-colors hover:bg-theme-surface-alt">
                                  <td className="py-5 px-4 flex items-center gap-3">
                                    <Package className="w-4 h-4 text-theme-ink-dim shrink-0 hidden sm:block" />
                                    <div>
                                      <span className="text-theme-ink block font-bold">
                                        {item.name}
                                      </span>
                                      <span className="text-xs text-theme-ink-dim">{item.category}</span>
                                    </div>
                                  </td>
                                  <td className="py-5 px-4 text-right">
                                    <span className="font-mono text-theme-ink font-bold">{recipe.quantity}</span>
                                    <span className="text-xs text-theme-ink-dim ml-1">{item.unit}</span>
                                  </td>
                                  <td className="py-5 px-4 text-right">
                                    <span className="font-mono text-theme-ink-dim font-bold">${(item.cost_per_unit || 0).toFixed(2)}</span>
                                    <span className="text-[10px] text-theme-ink-dim ml-1">/{item.unit}</span>
                                  </td>
                                  <td className="py-5 px-4 text-right">
                                    <span className="font-mono text-theme-ink font-bold">${totalCost.toFixed(2)}</span>
                                  </td>
                                  <td className="py-5 px-4 text-right">
                                    <div className="flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => {
                                          setEditingRecipeId(recipe.id);
                                          setEditQuantity(recipe.quantity.toString());
                                          setEditingItemName(item.name);
                                        }}
                                        className="text-theme-ink-dim hover:text-theme-accent p-2"
                                        title="Edit Quantity"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => handleRemoveIngredient(recipe.id)}
                                        className="text-theme-ink-dim hover:text-red-400 p-2"
                                        title="Remove Ingredient"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Add Ingredient Section */}
                  <div className="mt-8">
                    {!isAdding ? (
                      <button 
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 text-xs uppercase tracking-wider text-theme-accent hover:text-theme-ink font-semibold transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add Ingredient
                      </button>
                    ) : (
                      <div className="bg-theme-surface-alt border border-theme-border p-6 rounded-lg shadow-sm animate-in fade-in slide-in-from-bottom-2">
                        <h4 className="text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-4">Add Recipe Component</h4>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                          <div className="md:col-span-2">
                            <label className="block text-xs uppercase tracking-wider text-theme-ink-dim mb-2">Select Ingredient</label>
                            <div className="relative">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-ink-dim pointer-events-none" />
                                <input
                                  type="text"
                                  value={showIngredientDropdown ? ingredientSearch : (selectedInventoryId ? inventory.find(i => i.id.toString() === selectedInventoryId)?.name || '' : '')}
                                  onChange={(e) => { setIngredientSearch(e.target.value); setShowIngredientDropdown(true); }}
                                  onFocus={() => setShowIngredientDropdown(true)}
                                  onBlur={() => setTimeout(() => setShowIngredientDropdown(false), 200)}
                                  placeholder="Type to search ingredient..."
                                  className="w-full bg-theme-bg border border-theme-border p-3 pl-10 rounded-md text-sm text-theme-ink placeholder:text-theme-ink-dim focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                                />
                              </div>
                              {showIngredientDropdown && (
                                <div className="absolute z-50 mt-1 w-full bg-theme-surface border border-theme-border rounded-md shadow-lg max-h-48 sm:max-h-60 overflow-y-auto hide-scrollbar">
                                  {filteredInventory.length === 0 ? (
                                    <div className="p-3 text-sm text-theme-ink-dim">No items found</div>
                                  ) : (
                                    filteredInventory.slice(0, 50).map(item => (
                                      <button
                                        key={item.id}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                          setSelectedInventoryId(item.id.toString());
                                          setIngredientSearch('');
                                          setShowIngredientDropdown(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 sm:py-2.5 text-sm hover:bg-theme-accent/10 active:bg-theme-accent/20 transition-colors flex justify-between items-center gap-2 ${
                                          selectedInventoryId === item.id.toString() ? 'bg-theme-accent/10 text-theme-accent font-semibold' : 'text-theme-ink'
                                        }`}
                                      >
                                        <span className="truncate">{item.name}</span>
                                        <span className="text-xs text-theme-ink-dim whitespace-nowrap">{item.unit}</span>
                                      </button>
                                    ))
                                  )}
                                  {filteredInventory.length > 50 && (
                                    <div className="p-2 text-xs text-theme-ink-dim text-center border-t border-theme-border">
                                      Type more to narrow results ({filteredInventory.length} matches)
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-xs uppercase tracking-wider text-theme-ink-dim mb-2">Variant</label>
                            <select
                              value={selectedVariant}
                              onChange={(e) => setSelectedVariant(e.target.value)}
                              className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                            >
                              {VARIANTS.map(v => (
                                <option key={v.value} value={v.value}>{v.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-xs uppercase tracking-wider text-theme-ink-dim mb-2">Quantity Used</label>
                            <div className="relative">
                              <input 
                                type="number" 
                                step="0.01"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="Amount..."
                                className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink font-mono focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-theme-ink-dim uppercase">
                                {selectedInventoryId ? inventory.find(i => i.id.toString() === selectedInventoryId)?.unit : ''}
                              </span>
                            </div>
                          </div>
                          <div>
                            <button 
                              onClick={handleAddIngredient}
                              disabled={!selectedInventoryId || !quantity}
                              className="w-full bg-theme-accent text-black p-3 rounded-md text-xs uppercase tracking-wider font-bold disabled:opacity-50 hover:bg-opacity-90 shadow-[0_0_10px_rgba(197,160,89,0.2)] transition-all"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <button 
                            onClick={() => { setIsAdding(false); setSelectedInventoryId(''); setQuantity(''); }}
                            className="text-xs uppercase tracking-wider font-bold text-theme-ink-dim hover:text-theme-ink transition-colors px-4 py-2"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-theme-ink-dim p-8 text-center h-full">
                <ChefHat className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-serif mb-2 text-theme-ink">Select an item to view its recipe</p>
                <p className="text-sm max-w-sm">
                  {activeTab === 'menu' 
                    ? "Choose a product from the list on the left to configure the ingredients that make it."
                    : "Choose a sub-recipe batch to define its composition."}
                </p>
              </div>
            )}
          </div>
        </div>
      </>
    )}

      {/* Edit Quantity Modal */}
      {editingRecipeId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-theme-border bg-theme-surface-alt">
              <h3 className="font-serif text-lg text-theme-ink">Edit Quantity</h3>
              <button 
                onClick={() => { setEditingRecipeId(null); setEditingItemName(''); }}
                className="text-theme-ink-dim hover:text-theme-accent transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-theme-ink-dim mb-4">
                Updating quantity for <span className="font-bold text-theme-ink">{editingItemName}</span>
              </p>
              <div className="mb-6">
                <label className="block text-xs uppercase tracking-wider text-theme-ink-dim mb-2">New Quantity</label>
                <input
                  type="number"
                  step="any"
                  value={editQuantity}
                  onChange={e => setEditQuantity(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUpdateIngredient(editingRecipeId)}
                  className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink font-mono focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setEditingRecipeId(null); setEditingItemName(''); }}
                  className="px-4 py-2 text-sm font-bold text-theme-ink-dim hover:text-theme-ink transition-colors uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateIngredient(editingRecipeId)}
                  className="px-6 py-2 bg-theme-accent text-black font-bold text-sm rounded shadow-lg hover:shadow-xl transition-all uppercase tracking-wider"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
