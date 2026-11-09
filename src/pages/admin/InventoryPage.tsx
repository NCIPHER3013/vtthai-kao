import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, ArrowUpRight, ArrowDownRight, AlertTriangle, X, Plus, Loader2, Truck, ListCollapse, Upload, Trash2, Download } from 'lucide-react';
import type { StockItem, Supplier, ItemSupplier, SubRecipeIngredient, InventoryCategory } from '../../lib/supabase';
import { fetchInventory, fetchSuppliers, updateStockItem, createStockItem, deleteStockItem, createSupplier, updateSupplier, fetchItemSuppliers, fetchSubRecipeIngredients, createItemSupplier, writeLedgerEntry, fetchInventoryCategories, createInventoryCategory, updateInventoryCategory, deleteInventoryCategory } from '../../lib/api/inventory';
import { DbError } from '../../lib/api/errors';
import * as XLSX from 'xlsx';
import { useToast } from '../../components/Toast';
import { Pagination } from '../../components/ui/Pagination';
import { exportToCSV } from '../../lib/exportCSV';

export default function InventoryPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'inventory' | 'suppliers' | 'categories'>('inventory');
  
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryCategories, setInventoryCategories] = useState<InventoryCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  
  // Adjust Stock Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add');

  // Supplier Pricing Modal
  const [isSupplierPricingModalOpen, setIsSupplierPricingModalOpen] = useState(false);
  const [itemSuppliers, setItemSuppliers] = useState<ItemSupplier[]>([]);
  const [newSupplierQuote, setNewSupplierQuote] = useState({ supplier_id: '', price: '' });

  // Produce Batch Modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchYieldAmount, setBatchYieldAmount] = useState('');
  const [activeRecipeIngredients, setActiveRecipeIngredients] = useState<(SubRecipeIngredient & { childItem?: StockItem })[]>([]);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);

  // Add Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({
    name: '',
    category: 'Dry Goods',
    current_stock: '',
    unit: 'kg',
    cost_per_unit: '',
    reorder_level: '5',
    selected_supplier: ''
  });

  // Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [invData, supData, catData] = await Promise.all([
        fetchInventory(),
        fetchSuppliers(),
        fetchInventoryCategories()
      ]);
      
      setInventory(invData);
      setSuppliers(supData);
      setInventoryCategories(catData);
    } catch (error: any) {
      console.error('Error fetching inventory data:', error);
      toast('Warning: Unable to fetch full inventory data.', 'warning');
    } finally {
      setIsLoading(false);
    }
  }

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const paginatedInventory = filteredInventory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.contact_name && s.contact_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const paginatedSuppliers = filteredSuppliers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatus = (item: StockItem) => {
    if (item.category === 'Sub-Recipe') {
      return 'Sub-Recipe';
    }
    if (item.status === 'OUT' || item.current_stock <= item.reorder_level * 0.5) return 'Critical';
    if (item.current_stock <= item.reorder_level) return 'Low';
    return 'Good';
  };

  const lowStockCount = inventory.filter(item => {
    const status = getStatus(item);
    return status !== 'Good' && status !== 'Sub-Recipe';
  }).length;

  const handleOpenAdjust = (item: StockItem) => {
    setSelectedItem(item);
    setAdjustAmount('');
    setAdjustType('add');
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async () => {
    if (!selectedItem || !adjustAmount) return;
    setIsSaving(true);
    
    try {
      const amount = parseFloat(adjustAmount);
      const multiplier = adjustType === 'add' ? 1 : -1;
      const newStock = Math.max(0, selectedItem.current_stock + (amount * multiplier));
      const newStatus = newStock === 0 ? 'OUT' : 'OK';
      
      await updateStockItem(selectedItem.id, { current_stock: newStock, status: newStatus });

      await writeLedgerEntry({
        item_id: selectedItem.id.toString(),
        change_type: adjustType === 'add' ? 'IN' : 'OUT',
        quantity: amount,
        notes: 'Manual adjustment'
      });

      await fetchData();
      setIsAdjustModalOpen(false);
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      toast(error instanceof DbError ? error.message : (error.message || 'Failed to adjust stock'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewItem = async () => {
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        current_stock: parseFloat(formData.current_stock) || 0,
        unit: formData.unit,
        cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
        reorder_level: parseFloat(formData.reorder_level) || 0,
        selected_supplier: formData.selected_supplier || null,
        status: (parseFloat(formData.current_stock) || 0) > 0 ? 'OK' : 'OUT'
      };

      await createStockItem(payload);
      
      await fetchData();
      setIsAddModalOpen(false);
      setFormData({ name: '', category: 'Dry Goods', current_stock: '', unit: 'kg', cost_per_unit: '', reorder_level: '5', selected_supplier: '' });
    } catch (error: any) {
      console.error('Save error:', error);
      toast(error instanceof DbError ? error.message : (error.message || 'Failed to add item'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSupplier = async () => {
    setIsSaving(true);
    try {
      const payload: any = {
        name: supplierFormData.name,
        contact_name: supplierFormData.contact_name || null,
        phone: supplierFormData.phone || null,
        email: supplierFormData.email || null,
        address: supplierFormData.address || null
      };

      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, payload);
      } else {
        await createSupplier(payload);
      }

      await fetchData();
      setIsSupplierModalOpen(false);
    } catch (error: any) {
      console.error('Save supplier error:', error);
      toast(error instanceof DbError ? error.message : (error.message || 'Failed to save supplier'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenSupplierPricing = async (item: StockItem) => {
    setSelectedItem(item);
    setIsSaving(true);
    try {
      const data = await fetchItemSuppliers(item.id);
      setItemSuppliers(data);
      setNewSupplierQuote({ supplier_id: '', price: '' });
      setIsSupplierPricingModalOpen(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSupplierQuote = async () => {
    if (!selectedItem || !newSupplierQuote.supplier_id || !newSupplierQuote.price) return;
    setIsSaving(true);
    try {
      const isFirst = itemSuppliers.length === 0;
      await createItemSupplier({
        item_id: selectedItem.id,
        supplier_id: newSupplierQuote.supplier_id,
        price: parseFloat(newSupplierQuote.price),
        is_preferred: isFirst
      });
      
      if (isFirst) {
        await updateStockItem(selectedItem.id, { cost_per_unit: parseFloat(newSupplierQuote.price) });
      }
      
      await handleOpenSupplierPricing(selectedItem);
      await fetchData();
    } catch(err) {
      console.error(err);
      toast('Failed to add quote', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProduceBatch = async () => {
    if (!selectedItem || !batchYieldAmount) return;
    setIsSaving(true);
    
    try {
      const yieldAmt = parseFloat(batchYieldAmount);
      
      const ingredients = await fetchSubRecipeIngredients(selectedItem.id);
      
      if (!ingredients || ingredients.length === 0) {
         throw new Error("This sub-recipe has no ingredients defined in the Recipe page.");
      }
      
      let totalCost = 0;
      for (const ing of ingredients) {
        const childItem = ing.childItem;
        if (!childItem) continue;
        
        const deductAmount = ing.quantity * yieldAmt;
        const newChildStock = Math.max(0, childItem.current_stock - deductAmount);
        totalCost += (childItem.cost_per_unit || 0) * deductAmount;
        
        await updateStockItem(childItem.id, { current_stock: newChildStock });
        
        await writeLedgerEntry({
          item_id: childItem.id.toString(),
          change_type: 'OUT',
          quantity: deductAmount,
          notes: `Used in Batch for ${selectedItem.name}`
        });
      }
      
      const newParentStock = selectedItem.current_stock + yieldAmt;
      const expectedUnitCost = yieldAmt > 0 ? totalCost / yieldAmt : selectedItem.cost_per_unit;
      
      await updateStockItem(selectedItem.id, {
        current_stock: newParentStock,
        cost_per_unit: expectedUnitCost,
        status: newParentStock > 0 ? 'OK' : 'OUT'
      });
      
      await writeLedgerEntry({
        item_id: selectedItem.id.toString(),
        change_type: 'IN',
        quantity: yieldAmt,
        notes: 'Produced via Batch'
      });
      
      await fetchData();
      setIsBatchModalOpen(false);
      setBatchYieldAmount('');
    } catch(err: any) {
      console.error(err);
      toast(err instanceof DbError ? err.message : (err.message || 'Failed to produce batch'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadInventoryTemplate = () => {
    const templateData = [
      { 'Name': 'Chicken loins', 'Category': 'MEAT', 'Unit (g/ml/ea)': 'g', 'Cost Per Unit ($)': 0.012, 'Current Stock': 10000 },
      { 'Name': 'Jasmine rice', 'Category': 'DRY', 'Unit (g/ml/ea)': 'g', 'Cost Per Unit ($)': 0.003, 'Current Stock': 25000 },
      { 'Name': 'Garlic minced', 'Category': 'VEGETABLE', 'Unit (g/ml/ea)': 'g', 'Cost Per Unit ($)': 0.015, 'Current Stock': 5000 },
      { 'Name': 'Cooking oil', 'Category': 'SAUCE', 'Unit (g/ml/ea)': 'ml', 'Cost Per Unit ($)': 0.005, 'Current Stock': 20000 },
      { 'Name': 'Prawn raw 21/25 tail on', 'Category': 'SEAFOOD', 'Unit (g/ml/ea)': 'ea', 'Cost Per Unit ($)': 0.35, 'Current Stock': 500 }
    ];
    exportToCSV(templateData, 'inventory_import_template.csv');
    toast('Downloaded Inventory CSV template', 'info');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setIsSaving(true);
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          throw new Error("CSV/Excel file is empty");
        }

        const itemsToProcess = data.map((row: any) => {
          const name = String(row['Name'] || row['name'] || row['Item Name'] || row['item'] || '').trim();
          const category = String(row['Category'] || row['category'] || 'General').trim();
          const unit = String(row['Unit (g/ml/ea)'] || row['Unit'] || row['unit'] || 'g').trim();
          const cost_per_unit = parseFloat(row['Cost Per Unit ($)'] || row['Cost Per Unit'] || row['Cost'] || row['cost'] || row['cost_per_unit'] || row['Price'] || 0);
          const current_stock = parseFloat(row['Current Stock'] || row['Stock'] || row['stock'] || row['current_stock'] || row['qty'] || 0);
          return { name, category, unit, cost_per_unit, current_stock };
        }).filter(i => i.name.length > 0);

        if (itemsToProcess.length === 0) {
          throw new Error("Could not map columns. Expected columns: Name, Category, Unit, Cost, Stock");
        }

        // Auto-create missing categories
        const uniqueCategories = Array.from(new Set(itemsToProcess.map(i => i.category).filter(c => c.length > 0)));
        for (const catName of uniqueCategories) {
          const catExists = inventoryCategories.find(c => c.name.toLowerCase() === catName.toLowerCase());
          if (!catExists) {
            try {
              const newCat = await createInventoryCategory({ name: catName });
              setInventoryCategories(prev => [...prev, newCat]);
            } catch (catErr) {
              console.error("Failed to auto-create inventory category:", catName, catErr);
            }
          }
        }

        let updatedCount = 0;
        let createdCount = 0;

        for (const item of itemsToProcess) {
          const existing = inventory.find(inv => inv.name.trim().toLowerCase() === item.name.toLowerCase());
          
          if (existing) {
            // Upsert: update existing item fields
            const stockDiff = item.current_stock - existing.current_stock;
            await updateStockItem(existing.id, {
              category: item.category,
              unit: item.unit,
              cost_per_unit: item.cost_per_unit > 0 ? item.cost_per_unit : existing.cost_per_unit,
              current_stock: item.current_stock,
              status: item.current_stock > 0 ? 'Good' : 'Out'
            });

            if (Math.abs(stockDiff) > 0) {
              await writeLedgerEntry({
                item_id: existing.id.toString(),
                change_type: stockDiff >= 0 ? 'IN' : 'OUT',
                quantity: Math.abs(stockDiff),
                notes: 'CSV Import Stock Update'
              });
            }
            updatedCount++;
          } else {
            // Create new item
            await createStockItem({
              name: item.name,
              category: item.category,
              unit: item.unit,
              cost_per_unit: item.cost_per_unit,
              current_stock: item.current_stock,
              reorder_level: 10,
              status: item.current_stock > 0 ? 'Good' : 'Out'
            });
            createdCount++;
          }
        }

        toast(`Import finished: ${updatedCount} updated, ${createdCount} created.`, 'success');
        await fetchData();

      } catch (err: any) {
        console.error(err);
        toast(err.message || 'Error importing file.', 'error');
      } finally {
        setIsSaving(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Good': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
      case 'Low': return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
      case 'Critical': return 'text-red-400 border-red-400/30 bg-red-400/10';
      case 'Sub-Recipe': return 'text-theme-accent border-theme-accent/30 bg-theme-accent/10';
      default: return 'text-theme-ink-dim border-theme-border bg-theme-bg';
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-theme-ink mb-2">Inventory Control</h1>
          <p className="text-theme-ink-dim text-sm">Track raw materials, stock levels, suppliers and receive alerts.</p>
        </div>
        
        <div className="flex gap-4 items-center">
          {activeTab === 'inventory' ? (
            <>
              {lowStockCount > 0 && (
                <div className="bg-theme-surface border border-theme-border px-4 py-2 flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-theme-ink">{lowStockCount} Items Low</span>
                </div>
              )}
              <button 
                onClick={downloadInventoryTemplate}
                className="bg-theme-surface border border-theme-border text-theme-ink-dim hover:text-theme-ink px-4 py-2.5 text-xs uppercase tracking-wider font-semibold hover:bg-theme-surface-alt transition-colors flex items-center gap-2"
                title="Download CSV Template"
              >
                <Download className="w-4 h-4 text-theme-accent" />
                Template CSV
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-theme-surface border border-theme-border text-theme-ink px-4 py-2.5 text-xs uppercase tracking-wider font-semibold hover:bg-theme-surface-alt transition-colors flex items-center gap-2"
                title="Upload Excel or CSV"
              >
                <Upload className="w-4 h-4" />
                Import (.xlsx/.csv)
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                className="hidden" 
              />
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-theme-accent text-black rounded-md px-6 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(197,160,89,0.2)]"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </>
          ) : activeTab === 'suppliers' ? (
            <button 
              onClick={() => {
                setEditingSupplier(null);
                setSupplierFormData({ name: '', contact_name: '', phone: '', email: '', address: '' });
                setIsSupplierModalOpen(true);
              }}
              className="bg-theme-accent text-black rounded-md px-6 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(197,160,89,0.2)]"
            >
              <Truck className="w-4 h-4" />
              Add Supplier
            </button>
          ) : (
            <button 
              onClick={async () => {
                const name = prompt("Enter new category name:");
                if (name && name.trim()) {
                  try {
                    const newCat = await createInventoryCategory({ name: name.trim() });
                    setInventoryCategories(prev => [...prev, newCat]);
                    toast("Category created.", "success");
                  } catch (e: any) {
                    toast(e.message || "Failed to create category", "error");
                  }
                }
              }}
              className="bg-theme-accent text-black rounded-md px-6 py-2.5 text-xs uppercase tracking-wider font-bold hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(197,160,89,0.2)]"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-theme-border mb-6">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-3 text-xs uppercase tracking-wider font-semibold transition-colors border-b-2 ${
            activeTab === 'inventory' 
              ? 'border-theme-accent text-theme-accent' 
              : 'border-transparent text-theme-ink-dim hover:text-theme-ink'
          }`}
        >
          <Package className="w-4 h-4 inline-block mr-2 -mt-1" />
          Stock Items
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-6 py-3 text-xs uppercase tracking-wider font-semibold transition-colors border-b-2 ${
            activeTab === 'categories' 
              ? 'border-theme-accent text-theme-accent' 
              : 'border-transparent text-theme-ink-dim hover:text-theme-ink'
          }`}
        >
          <ListCollapse className="w-4 h-4 inline-block mr-2 -mt-1" />
          Categories
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-6 py-3 text-xs uppercase tracking-wider font-semibold transition-colors border-b-2 ${
            activeTab === 'suppliers' 
              ? 'border-theme-accent text-theme-accent' 
              : 'border-transparent text-theme-ink-dim hover:text-theme-ink'
          }`}
        >
          <Truck className="w-4 h-4 inline-block mr-2 -mt-1" />
          Suppliers
        </button>
      </div>
      
      <div className="bg-theme-surface border border-theme-border flex flex-col w-full overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-theme-border flex flex-col sm:flex-row items-center justify-between bg-theme-surface-alt gap-4">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-ink-dim" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-theme-bg border border-theme-border py-2 pl-10 pr-4 text-sm text-theme-ink focus:outline-none focus:border-theme-accent transition-colors"
            />
          </div>
        </div>

        {/* Dynamic Table */}
        <div className="overflow-x-auto w-full">
          {activeTab === 'inventory' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-theme-border bg-theme-bg">
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Item Name</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Category</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Supplier</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">In Stock</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Status</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-theme-ink-dim">
                      <div className="flex items-center justify-center gap-2">
                         <Loader2 className="w-4 h-4 animate-spin text-theme-accent" /> Loading inventory...
                      </div>
                    </td>
                  </tr>
                ) : paginatedInventory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-theme-ink-dim">No items found on this page.</td>
                  </tr>
                ) : (
                  paginatedInventory.map(item => {
                    const status = getStatus(item);
                    return (
                      <tr key={item.id} className="hover:bg-theme-surface-alt transition-colors group">
                        <td className="py-5 px-4 font-serif text-theme-ink flex items-center gap-3">
                          <Package className="w-4 h-4 text-theme-ink-dim" />
                          <div>
                            <div className="font-bold">{item.name}</div>
                            {item.plu && <div className="text-[10px] text-theme-ink-dim font-mono">{item.plu}</div>}
                          </div>
                        </td>
                        <td className="py-5 px-4 text-sm text-theme-ink-dim">{item.category}</td>
                        <td className="py-5 px-4 text-sm text-theme-ink">{item.selected_supplier || <span className="italic text-theme-ink-dim text-xs">Unassigned</span>}</td>
                        <td className="py-5 px-4 text-sm text-theme-ink font-mono font-bold">
                          {item.category === 'Sub-Recipe' ? (
                            <span className="text-theme-ink-dim text-xs font-sans italic">Auto (Dynamic)</span>
                          ) : (
                            <>
                              {item.current_stock} <span className="text-theme-ink-dim text-xs hidden sm:inline font-normal">{item.unit}</span>
                            </>
                          )}
                        </td>
                        <td className="py-5 px-4">
                          <span className={`text-[11px] uppercase tracking-wider px-3 py-1.5 border rounded-full font-bold ${getStatusColor(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td className="py-5 px-4 text-right flex items-center justify-end gap-4 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          {item.category === 'Sub-Recipe' && (
                            <button 
                              onClick={async () => {
                                setSelectedItem(item);
                                setBatchYieldAmount('');
                                setActiveRecipeIngredients([]);
                                setIsBatchModalOpen(true);
                                
                                // Fetch recipe ingredients right away
                                setIsLoadingIngredients(true);
                                try {
                                  const data = await fetchSubRecipeIngredients(item.id);
                                  if (data) {
                                    setActiveRecipeIngredients(data);
                                  }
                                } catch (e) {
                                  console.error('Error loading sub-recipe ingredients:', e);
                                } finally {
                                  setIsLoadingIngredients(false);
                                }
                              }}
                              className="text-[10px] sm:text-xs uppercase tracking-wider text-theme-ink hover:text-theme-accent font-medium flex gap-1 items-center"
                            >
                              <ListCollapse className="w-3 h-3" />
                              Produce
                            </button>
                          )}
                          <button 
                            onClick={() => handleOpenSupplierPricing(item)}
                            className="text-[10px] sm:text-xs uppercase tracking-wider text-theme-ink hover:text-theme-accent font-medium flex gap-1 items-center"
                          >
                            Prices
                          </button>
                          <button 
                            onClick={() => handleOpenAdjust(item)}
                            className="text-[10px] sm:text-xs uppercase tracking-wider text-theme-accent hover:underline font-medium"
                          >
                            Adjust
                          </button>
                          <button 
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete ${item.name}? This action cannot be undone.`)) {
                                try {
                                  await deleteStockItem(item.id);
                                  await fetchData();
                                  toast('Ingredient deleted successfully', 'success');
                                } catch (e) {
                                  console.error(e);
                                  toast('Failed to delete ingredient. It might be used in a recipe.', 'error');
                                }
                              }
                            }}
                            className="text-[10px] sm:text-xs uppercase tracking-wider text-red-500 hover:text-red-400 hover:underline font-medium flex gap-1 items-center"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : activeTab === 'suppliers' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-theme-border bg-theme-bg">
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Supplier Name</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Contact Person</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Phone</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Email</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-theme-ink-dim">
                      <div className="flex items-center justify-center gap-2">
                         <Loader2 className="w-4 h-4 animate-spin text-theme-accent" /> Loading suppliers...
                      </div>
                    </td>
                  </tr>
                ) : paginatedSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-theme-ink-dim">No suppliers found on this page.</td>
                  </tr>
                ) : (
                  paginatedSuppliers.map(supplier => (
                    <tr key={supplier.id} className="hover:bg-theme-surface-alt transition-colors group">
                      <td className="py-5 px-4 font-serif text-theme-ink flex items-center gap-3 font-bold">
                        <Truck className="w-4 h-4 text-theme-ink-dim" />
                        {supplier.name}
                      </td>
                      <td className="py-5 px-4 text-sm text-theme-ink-dim">{supplier.contact_name || '-'}</td>
                      <td className="py-5 px-4 text-sm text-theme-ink-dim font-mono">{supplier.phone || '-'}</td>
                      <td className="py-5 px-4 text-sm text-theme-ink-dim">{supplier.email || '-'}</td>
                      <td className="py-5 px-4 text-right">
                        <button 
                          onClick={() => {
                            setEditingSupplier(supplier);
                            setSupplierFormData({
                              name: supplier.name,
                              contact_name: supplier.contact_name || '',
                              phone: supplier.phone || '',
                              email: supplier.email || '',
                              address: supplier.address || ''
                            });
                            setIsSupplierModalOpen(true);
                          }}
                          className="text-xs uppercase tracking-wider text-theme-accent hover:underline font-medium md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <div className="space-y-6">
              <div className="bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-xl">
                <div className="w-full text-left border-collapse">
                  <div className="grid grid-cols-[1fr,auto] gap-4 p-4 border-b border-theme-border bg-theme-surface-alt font-serif text-theme-ink-dim text-sm">
                    <div>Category Name</div>
                    <div className="text-right">Actions</div>
                  </div>
                  <div className="divide-y divide-theme-border">
                    {inventoryCategories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((category) => (
                      <div key={category.id} className="grid grid-cols-[1fr,auto] gap-4 p-4 items-center hover:bg-theme-surface-alt/50 transition-colors">
                        <div className="font-bold text-theme-ink">{category.name}</div>
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={async () => {
                              const newName = prompt("Edit category name:", category.name);
                              if (newName && newName.trim() !== category.name) {
                                try {
                                  const updated = await updateInventoryCategory(category.id, { name: newName.trim() });
                                  if (updated) {
                                    setInventoryCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
                                    toast("Category updated.", "success");
                                  }
                                } catch (e: any) {
                                  toast(e.message || "Failed to update category", "error");
                                }
                              }
                            }}
                            className="p-2 text-theme-ink hover:text-theme-accent transition-colors"
                            title="Edit"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm(`Are you sure you want to delete category "${category.name}"?`)) {
                                try {
                                  await deleteInventoryCategory(category.id);
                                  setInventoryCategories(prev => prev.filter(c => c.id !== category.id));
                                  toast("Category deleted.", "success");
                                } catch (e: any) {
                                  toast(e.message || "Failed to delete category", "error");
                                }
                              }
                            }}
                            className="p-2 text-theme-ink hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {inventoryCategories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div className="p-8 text-center text-theme-ink-dim font-serif text-lg">
                      No categories found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {activeTab !== 'categories' && (
          <Pagination 
            currentPage={currentPage}
            totalItems={activeTab === 'inventory' ? filteredInventory.length : filteredSuppliers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-theme-surface border border-theme-border w-full max-w-lg shadow-2xl flex flex-col rounded-xl overflow-hidden">
            <div className="p-6 border-b border-theme-border flex items-center justify-between bg-theme-surface-alt">
              <h2 className="font-serif text-xl text-theme-ink">Adjust Stock</h2>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-theme-ink-dim hover:text-theme-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <p className="text-sm text-theme-ink-dim mb-1">Item</p>
                <p className="font-serif text-lg text-theme-ink">{selectedItem.name}</p>
                <p className="text-xs text-theme-accent font-mono mt-1">Current: {selectedItem.current_stock} {selectedItem.unit}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setAdjustType('add')}
                  className={`py-4 border flex flex-col items-center justify-center gap-2 transition-colors ${
                    adjustType === 'add' ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400' : 'border-theme-border text-theme-ink-dim hover:border-theme-ink'
                  }`}
                >
                  <ArrowDownRight className="w-5 h-5" />
                  <span className="text-xs uppercase tracking-wider font-semibold">Receive (In)</span>
                </button>
                <button
                  onClick={() => setAdjustType('remove')}
                  className={`py-4 border flex flex-col items-center justify-center gap-2 transition-colors ${
                    adjustType === 'remove' ? 'border-red-400 bg-red-400/10 text-red-400' : 'border-theme-border text-theme-ink-dim hover:border-theme-ink'
                  }`}
                >
                  <ArrowUpRight className="w-5 h-5" />
                  <span className="text-xs uppercase tracking-wider font-semibold">Waste/Use (Out)</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Quantity ({selectedItem.unit})</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(e.target.value)}
                  className="w-full bg-theme-bg border border-theme-border p-4 rounded-md text-lg text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono text-center"
                  placeholder="0.0"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-6 border-t border-theme-border bg-theme-surface-alt flex justify-end gap-4">
              <button 
                onClick={() => setIsAdjustModalOpen(false)}
                disabled={isSaving}
                className="px-6 py-3 text-xs uppercase tracking-wider font-bold text-theme-ink-dim hover:text-theme-ink transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveAdjustment}
                disabled={!adjustAmount || parseFloat(adjustAmount) <= 0 || isSaving}
                className="bg-theme-accent text-black px-8 py-3 rounded-md text-xs uppercase tracking-wider font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_10px_rgba(197,160,89,0.2)]"
              >
                {isSaving && <Loader2 className="w-3 h-3 animate-spin"/>}
                {isSaving ? 'Updating...' : 'Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-theme-surface border border-theme-border w-full max-w-lg shadow-2xl flex flex-col rounded-xl overflow-hidden">
            <div className="p-6 border-b border-theme-border flex items-center justify-between bg-theme-surface-alt">
              <h2 className="font-serif text-xl text-theme-ink">New Inventory Item</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-theme-ink-dim hover:text-theme-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Item Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                    placeholder="e.g. Espresso Beans"
                    list="inventory-names"
                    autoComplete="off"
                  />
                  <datalist id="inventory-names">
                    {inventory.map(item => (
                      <option key={item.id} value={item.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Category</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                  >
                    <option value="Meat">Meat</option>
                    <option value="Seafood">Seafood</option>
                    <option value="Vegetables / Fruit">Vegetables / Fruit</option>
                    <option value="Dry Goods">Dry Goods</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Sub-Recipe">Sub-Recipe</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Supplier</label>
                  <select 
                    value={formData.selected_supplier}
                    onChange={e => setFormData({...formData, selected_supplier: e.target.value})}
                    className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all appearance-none capitalize"
                  >
                    <option value="">Unassigned</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.name}>{sup.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Unit</label>
                  <input 
                    type="text" 
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                    className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                    placeholder="kg, L, pcs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Cost / Unit</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.cost_per_unit !== undefined ? formData.cost_per_unit : ''}
                    onChange={e => setFormData({...formData, cost_per_unit: e.target.value})}
                    className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Current Stock</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={formData.current_stock}
                    onChange={e => setFormData({...formData, current_stock: e.target.value})}
                    className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Reorder Level (Min Stock)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={formData.reorder_level}
                    onChange={e => setFormData({...formData, reorder_level: e.target.value})}
                    className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono"
                    placeholder="5"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-theme-border bg-theme-surface-alt flex justify-end gap-4">
              <button 
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSaving}
                className="px-6 py-3 text-xs uppercase tracking-wider font-bold text-theme-ink-dim hover:text-theme-ink transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddNewItem}
                disabled={!formData.name || !formData.current_stock || isSaving}
                className="bg-theme-accent text-black px-8 py-3 rounded-md text-xs uppercase tracking-wider font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_10px_rgba(197,160,89,0.2)]"
              >
                {isSaving && <Loader2 className="w-3 h-3 animate-spin"/>}
                {isSaving ? 'Saving...' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-theme-surface border border-theme-border w-full max-w-lg shadow-2xl flex flex-col rounded-xl overflow-hidden">
            <div className="p-6 border-b border-theme-border flex items-center justify-between bg-theme-surface-alt">
              <h2 className="font-serif text-xl text-theme-ink">{editingSupplier ? 'Edit Supplier' : 'New Supplier'}</h2>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-theme-ink-dim hover:text-theme-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Company / Supplier Name *</label>
                <input 
                  type="text" 
                  value={supplierFormData.name}
                  onChange={e => setSupplierFormData({...supplierFormData, name: e.target.value})}
                  className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                  placeholder="e.g. Fresh Farms Grocery"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Contact Person</label>
                  <input 
                    type="text" 
                    value={supplierFormData.contact_name}
                    onChange={e => setSupplierFormData({...supplierFormData, contact_name: e.target.value})}
                    className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                    placeholder="e.g. John Smith"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Phone</label>
                  <input 
                    type="text" 
                    value={supplierFormData.phone}
                    onChange={e => setSupplierFormData({...supplierFormData, phone: e.target.value})}
                    className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono"
                    placeholder="08X-XXX-XXXX"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={supplierFormData.email}
                  onChange={e => setSupplierFormData({...supplierFormData, email: e.target.value})}
                  className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono"
                  placeholder="supplier@company.com"
                />
              </div>
            </div>

            <div className="p-6 border-t border-theme-border bg-theme-surface-alt flex justify-end gap-4">
              <button 
                onClick={() => setIsSupplierModalOpen(false)}
                disabled={isSaving}
                className="px-6 py-3 text-xs uppercase tracking-wider font-bold text-theme-ink-dim hover:text-theme-ink transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSupplier}
                disabled={!supplierFormData.name || isSaving}
                className="bg-theme-accent text-black px-8 py-3 rounded-md text-xs uppercase tracking-wider font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_10px_rgba(197,160,89,0.2)]"
              >
                {isSaving && <Loader2 className="w-3 h-3 animate-spin"/>}
                {isSaving ? 'Saving...' : 'Save Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Pricing Modal (Multi-Supplier Quotes) */}
      {isSupplierPricingModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-theme-surface border border-theme-border w-full max-w-lg shadow-2xl flex flex-col rounded-xl overflow-hidden">
            <div className="p-6 border-b border-theme-border flex items-center justify-between bg-theme-surface-alt">
              <h2 className="font-serif text-xl text-theme-ink">Supplier Quotes: {selectedItem.name}</h2>
              <button onClick={() => setIsSupplierPricingModalOpen(false)} className="text-theme-ink-dim hover:text-theme-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-theme-ink mb-3">Add New Quote</h3>
                <div className="flex gap-2">
                  <select 
                    value={newSupplierQuote.supplier_id}
                    onChange={e => setNewSupplierQuote({...newSupplierQuote, supplier_id: e.target.value})}
                    className="flex-1 bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                  >
                    <option value="">Select Supplier...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <input 
                    type="number" 
                    step="0.01"
                    value={newSupplierQuote.price}
                    onChange={e => setNewSupplierQuote({...newSupplierQuote, price: e.target.value})}
                    placeholder={`Price / ${selectedItem.unit}`}
                    className="w-32 bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono"
                  />
                  <button 
                    onClick={handleAddSupplierQuote}
                    disabled={!newSupplierQuote.supplier_id || !newSupplierQuote.price || isSaving}
                    className="bg-theme-accent text-black px-4 rounded-md flex items-center text-xs uppercase tracking-wider font-bold disabled:opacity-50 shadow-[0_0_10px_rgba(197,160,89,0.2)] transition-all hover:bg-opacity-90"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="border border-theme-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-theme-surface-alt border-b border-theme-border">
                    <tr>
                      <th className="p-3 font-medium text-theme-ink-dim">Supplier</th>
                      <th className="p-3 font-medium text-theme-ink-dim text-right">Quote</th>
                      <th className="p-3 font-medium text-theme-ink-dim text-center">Preferred</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border">
                    {itemSuppliers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-theme-ink-dim">No quotes saved.</td>
                      </tr>
                    ) : (
                      itemSuppliers.map(quote => (
                        <tr key={quote.id}>
                          <td className="p-3 text-theme-ink">{(quote.suppliers as any)?.name}</td>
                          <td className="p-3 text-theme-ink text-right font-mono">${quote.price.toFixed(2)}</td>
                          <td className="p-3 text-center">
                            {quote.is_preferred ? (
                              <span className="text-xs text-theme-accent bg-theme-accent/10 px-2 py-1 rounded-sm">Preferred</span>
                            ) : (
                              <span className="text-xs text-theme-ink-dim opacity-50">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Produce Batch Modal */}
      {isBatchModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-theme-surface border border-theme-border w-full max-w-lg shadow-2xl flex flex-col rounded-xl overflow-hidden">
            <div className="p-6 border-b border-theme-border flex items-center justify-between bg-theme-surface-alt">
              <h2 className="font-serif text-xl text-theme-ink">Produce Sub-Recipe</h2>
              <button onClick={() => setIsBatchModalOpen(false)} className="text-theme-ink-dim hover:text-theme-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <p className="text-sm text-theme-ink-dim mb-1">Batch To Produce</p>
                <p className="font-serif text-lg text-theme-ink flex items-center gap-2">
                  <ListCollapse className="w-5 h-5 text-theme-accent" />
                  {selectedItem.name}
                </p>
                <p className="text-xs text-theme-ink-dim mt-2 bg-theme-bg p-3 border border-theme-border rounded-sm">
                  Producing this batch will automatically deduct the raw ingredients from your inventory based on the sub-recipe configuration.
                </p>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Yield Quantity to Add ({selectedItem.unit})</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={batchYieldAmount}
                  onChange={e => setBatchYieldAmount(e.target.value)}
                  className="w-full bg-theme-bg border border-theme-border p-4 rounded-md text-lg text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono text-center"
                  placeholder="0.0"
                  autoFocus
                />
              </div>

              {/* Dynamic Real-time Ingredient Breakdown Estimation Section */}
              <div className="space-y-3 bg-theme-surface-alt p-4 border border-theme-border rounded-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-theme-ink">Deduction Estimation</h3>
                {isLoadingIngredients ? (
                  <div className="flex items-center gap-2 text-xs text-theme-ink-dim py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-theme-accent" />
                    <span>Loading recipe details...</span>
                  </div>
                ) : activeRecipeIngredients.length === 0 ? (
                  <p className="text-xs text-red-400 py-1">⚠️ No ingredients found. Please link ingredients in Recipe page first.</p>
                ) : (
                  <div className="space-y-2.5">
                    {activeRecipeIngredients.map(ing => {
                      const yieldVal = parseFloat(batchYieldAmount) || 0;
                      const requiredQty = ing.quantity * yieldVal;
                      const childItem = ing.childItem;
                      const hasEnough = childItem ? childItem.current_stock >= requiredQty : true;
                      
                      return (
                        <div key={ing.id} className="flex justify-between items-center text-xs border-b border-theme-border/50 pb-2 last:border-0 last:pb-0">
                          <div className="flex flex-col">
                            <span className="font-medium text-theme-ink">{childItem?.name || `ID: ${ing.child_item_id}`}</span>
                            <span className="text-[10px] text-theme-ink-dim">
                              1 {selectedItem.unit} requires {ing.quantity} {childItem?.unit || ''}
                            </span>
                          </div>
                          <div className="text-right font-mono">
                            <span className={`font-medium ${requiredQty > 0 ? (hasEnough ? 'text-amber-400' : 'text-red-400 font-bold') : 'text-theme-ink-dim'}`}>
                              -{requiredQty.toFixed(2)} {childItem?.unit || ''}
                            </span>
                            <div className="text-[10px] text-theme-ink-dim mt-0.5">
                              Stock: {childItem?.current_stock || 0} {childItem?.unit || ''}
                              {!hasEnough && <span className="text-red-400 ml-1 font-sans">(Insufficient)</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-theme-border bg-theme-surface-alt flex justify-end gap-4">
              <button 
                onClick={() => setIsBatchModalOpen(false)}
                disabled={isSaving}
                className="px-6 py-3 text-xs uppercase tracking-wider font-bold text-theme-ink-dim hover:text-theme-ink transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleProduceBatch}
                disabled={!batchYieldAmount || parseFloat(batchYieldAmount) <= 0 || isSaving || isLoadingIngredients || activeRecipeIngredients.length === 0}
                className="bg-emerald-400 text-black px-8 py-3 rounded-md text-xs uppercase tracking-wider font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_10px_rgba(52,211,153,0.2)]"
              >
                {isSaving && <Loader2 className="w-3 h-3 animate-spin"/>}
                {isSaving ? 'Producing...' : 'Deduct Raw & Produce'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
