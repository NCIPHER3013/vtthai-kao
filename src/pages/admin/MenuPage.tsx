import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, MoreHorizontal, X, Loader2, FolderOpen, Upload, ImageIcon, Download } from 'lucide-react';
import { Product as SupabaseProduct, ProductCategory } from '../../lib/supabase';
import formatCurrency from '../../lib/formatCurrency';
import { Category } from '../../types';
import { useToast } from '../../components/Toast';
import { Pagination } from '../../components/ui/Pagination';
import { fetchProducts as apiFetchProducts, fetchProductCategories as apiFetchCategories, createProduct, updateProduct, deleteProduct, uploadProductImage, getProductImageUrl, deleteProductCategory, createProductCategory, updateProductCategory } from '../../lib/api/products';
import { DbError } from '../../lib/api/errors';
import * as XLSX from 'xlsx';
import { exportToCSV } from '../../lib/exportCSV';

export default function MenuPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [products, setProducts] = useState<SupabaseProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  const productFileInputRef = useRef<HTMLInputElement>(null);

  const downloadMenuTemplate = () => {
    const templateData = [
      { 'Name': 'Yellow Curry', 'Category': 'Curry', 'Dine-in Price ($)': 21.90, 'Takeaway Price ($)': 19.90, 'Delivery Price ($)': 24.90 },
      { 'Name': 'Pad Thai', 'Category': 'Noodle', 'Dine-in Price ($)': 18.90, 'Takeaway Price ($)': 18.90, 'Delivery Price ($)': 20.90 },
      { 'Name': 'Spring Rolls', 'Category': 'Entree', 'Dine-in Price ($)': 10.90, 'Takeaway Price ($)': 10.90, 'Delivery Price ($)': 12.90 }
    ];
    exportToCSV(templateData, 'menu_import_template.csv');
    toast('Downloaded Menu CSV template', 'info');
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
          const name = String(row['Name'] || row['name'] || row['Product Name'] || row['product'] || row['Item Name'] || '').trim();
          const category = String(row['Category'] || row['category'] || 'General').trim();
          const price = parseFloat(row['Dine-in Price ($)'] || row['Dine Price'] || row['Dine-in Price'] || row['Price'] || row['price'] || 0);
          const price_takeaway = row['Takeaway Price ($)'] || row['Takeaway Price'] || row['price_takeaway'] || row['Takeaway'] ? parseFloat(row['Takeaway Price ($)'] || row['Takeaway Price'] || row['price_takeaway'] || row['Takeaway']) : null;
          const price_delivery = row['Delivery Price ($)'] || row['Delivery Price'] || row['price_delivery'] || row['Delivery'] ? parseFloat(row['Delivery Price ($)'] || row['Delivery Price'] || row['price_delivery'] || row['Delivery']) : null;
          return { name, category, price, price_takeaway, price_delivery };
        }).filter(i => i.name.length > 0 && i.price > 0);

        if (itemsToProcess.length === 0) {
          throw new Error("Could not map columns. Expected columns: Name, Category, Price (or Takeaway Price, Delivery Price)");
        }

        // Auto-create missing categories
        const uniqueCategories = Array.from(new Set(itemsToProcess.map(i => i.category).filter(c => c.length > 0)));
        for (const catName of uniqueCategories) {
          const catExists = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
          if (!catExists) {
            try {
              const newCat = await createProductCategory({ name: catName });
              setCategories(prev => [...prev, newCat]);
            } catch (catErr) {
              console.error("Failed to auto-create category:", catName, catErr);
            }
          }
        }

        let updatedCount = 0;
        let createdCount = 0;

        for (const item of itemsToProcess) {
          const existing = products.find(p => p.name.trim().toLowerCase() === item.name.toLowerCase());
          
          if (existing) {
            // Upsert: update existing product fields
            await updateProduct(existing.id, {
              category: item.category,
              price: item.price,
              price_takeaway: item.price_takeaway ?? undefined,
              price_delivery: item.price_delivery ?? undefined
            });
            updatedCount++;
          } else {
            // Create new product
            await createProduct({
              id: crypto.randomUUID(),
              name: item.name,
              category: item.category,
              price: item.price,
              price_takeaway: item.price_takeaway ?? undefined,
              price_delivery: item.price_delivery ?? undefined,
              color_label: 'bg-stone-800',
              is_active: true
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
        if (productFileInputRef.current) productFileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };
  
  // Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SupabaseProduct | null>(null);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', master_plu: '' });

  // Form State
  const [formData, setFormData] = useState({
    plu: '',
    name: '',
    middle_name: '',
    description: '',
    price: '',
    price_takeaway: '',
    price_delivery: '',
    category: '', // Will default to first available
    color_label: 'bg-stone-800',
    image_url: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    is_healthy: false,
    is_gluten_free: false,
    is_vegan: false,
    is_lunch_special: false,
    customizations: [] as any[]
  });
  const [isUploading, setIsUploading] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        apiFetchProducts(true),
        apiFetchCategories()
      ]);
      
      setProducts(productsData);
      setCategories(categoriesData);
      
      if (categoriesData && categoriesData.length > 0 && !formData.category) {
        setFormData(prev => ({...prev, category: categoriesData[0].name}));
      }
    } catch (error) {
      if (error instanceof DbError) {
        console.error('Error fetching data:', error.userMessage);
      } else {
        console.error('Error fetching data:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.plu && p.plu.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.master_plu && c.master_plu.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const paginatedCategories = filteredCategories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenModal = (product?: SupabaseProduct) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        plu: product.plu || '',
        name: product.name,
        middle_name: product.middle_name || '',
        description: product.description || '',
        price: product.price.toString(),
        price_takeaway: product.price_takeaway ? product.price_takeaway.toString() : '',
        price_delivery: product.price_delivery ? product.price_delivery.toString() : '',
        category: product.category,
        color_label: product.color_label || 'bg-stone-800',
        image_url: product.image_url || '',
        calories: product.calories ? product.calories.toString() : '',
        protein: product.protein ? product.protein.toString() : '',
        carbs: product.carbs ? product.carbs.toString() : '',
        fat: product.fat ? product.fat.toString() : '',
        is_healthy: product.is_healthy || false,
        is_gluten_free: product.is_gluten_free || false,
        is_vegan: product.is_vegan || false,
        is_lunch_special: product.is_lunch_special || false,
        customizations: product.customizations || []
      });
    } else {
      setEditingProduct(null);
      setFormData({ plu: '', name: '', middle_name: '', description: '', price: '', price_takeaway: '', price_delivery: '', category: categories[0]?.name || 'Coffee', color_label: 'bg-stone-800', image_url: '', calories: '', protein: '', carbs: '', fat: '', is_healthy: false, is_gluten_free: false, is_vegan: false, is_lunch_special: false, customizations: [] });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: any = {
        plu: formData.plu || null,
        name: formData.name,
        middle_name: formData.middle_name || null,
        description: formData.description || null,
        price: parseFloat(formData.price) || 0,
        price_takeaway: formData.price_takeaway ? parseFloat(formData.price_takeaway) : null,
        price_delivery: formData.price_delivery ? parseFloat(formData.price_delivery) : null,
        category: formData.category,
        color_label: formData.color_label,
        is_active: true,
        image_url: formData.image_url || null,
        calories: formData.calories ? parseFloat(formData.calories) : null,
        protein: formData.protein ? parseFloat(formData.protein) : null,
        carbs: formData.carbs ? parseFloat(formData.carbs) : null,
        fat: formData.fat ? parseFloat(formData.fat) : null,
        is_healthy: formData.is_healthy,
        is_gluten_free: formData.is_gluten_free,
        is_vegan: formData.is_vegan,
        customizations: formData.customizations
      };
      if (formData.is_lunch_special || (editingProduct && 'is_lunch_special' in editingProduct)) {
        payload.is_lunch_special = formData.is_lunch_special;
      }

      if (editingProduct) {
        try {
          await updateProduct(editingProduct.id, payload);
        } catch (err) {
          if (err instanceof DbError && err.message.includes('image_url')) {
            console.warn('Database is missing column "image_url". Retrying save without "image_url"...');
            const fallbackPayload = { ...payload };
            delete fallbackPayload.image_url;
            await updateProduct(editingProduct.id, fallbackPayload);
          } else {
            throw err;
          }
        }
      } else {
        payload.id = crypto.randomUUID();
        try {
          await createProduct(payload);
        } catch (err) {
          if (err instanceof DbError && err.message.includes('image_url')) {
            console.warn('Database is missing column "image_url". Retrying save without "image_url"...');
            const fallbackPayload = { ...payload };
            delete fallbackPayload.image_url;
            await createProduct(fallbackPayload);
          } else {
            throw err;
          }
        }
      }

      await fetchData();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Save error:', error);
      toast(error.message || 'Failed to save product', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
        await fetchData();
      } catch (error: any) {
        console.error('Delete error:', error);
        toast(error.message || 'Failed to delete product', 'error');
      }
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Are you sure you want to delete this category? Products using this category will NOT be deleted, but they may need to be reassigned.')) {
      try {
        await deleteProductCategory(id);
        await fetchData();
      } catch (error: any) {
        console.error('Delete error:', error);
        toast(error.message || 'Failed to delete category', 'error');
      }
    }
  };

  const handleOpenCategoryModal = (category?: ProductCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({ name: category.name, master_plu: category.master_plu || '' });
    } else {
      setEditingCategory(null);
      setCategoryFormData({ name: '', master_plu: '' });
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    setIsSaving(true);
    try {
      const payload: any = {
        name: categoryFormData.name,
        master_plu: categoryFormData.master_plu || null
      };

      if (editingCategory) {
        await updateProductCategory(editingCategory.id, payload);
      } else {
        await createProductCategory(payload);
      }

      await fetchData();
      setIsCategoryModalOpen(false);
    } catch (error: any) {
      console.error('Save category error:', error);
      toast(error.message || 'Failed to save category', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCustomizationGroup = () => {
    setFormData(prev => ({
      ...prev,
      customizations: [
        ...prev.customizations,
        {
          id: Math.random().toString(36).substring(7),
          name: '',
          required: false,
          max_selections: 1,
          options: []
        }
      ]
    }));
  };

  const handleRemoveCustomizationGroup = (groupIdx: number) => {
    const updated = [...formData.customizations];
    updated.splice(groupIdx, 1);
    setFormData(prev => ({ ...prev, customizations: updated }));
  };

  const handleCustomizationGroupChange = (groupIdx: number, field: string, value: any) => {
    const updated = [...formData.customizations];
    updated[groupIdx][field] = value;
    setFormData(prev => ({ ...prev, customizations: updated }));
  };

  const handleAddCustomizationOption = (groupIdx: number) => {
    const updated = [...formData.customizations];
    updated[groupIdx].options.push({ name: '', price_adjustment: 0 });
    setFormData(prev => ({ ...prev, customizations: updated }));
  };

  const handleRemoveCustomizationOption = (groupIdx: number, optionIdx: number) => {
    const updated = [...formData.customizations];
    updated[groupIdx].options.splice(optionIdx, 1);
    setFormData(prev => ({ ...prev, customizations: updated }));
  };

  const handleCustomizationOptionChange = (groupIdx: number, optionIdx: number, field: string, value: any) => {
    const updated = [...formData.customizations];
    updated[groupIdx].options[optionIdx][field] = value;
    setFormData(prev => ({ ...prev, customizations: updated }));
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast('Please select an image file (JPEG, PNG, WebP, GIF)', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Image must be less than 5MB', 'warning');
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

      const uploaded = await uploadProductImage(file, fileName);
      const imageUrl = getProductImageUrl(uploaded.path);
      setFormData(prev => ({ ...prev, image_url: imageUrl }));
    } catch (error: any) {
      console.error('Upload error:', error);
      toast('Failed to upload image: ' + error.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  const COLOR_OPTIONS = [
    { label: 'Stone', value: 'bg-stone-800' },
    { label: 'Amber', value: 'bg-amber-900' },
    { label: 'Orange', value: 'bg-orange-900' },
    { label: 'Red', value: 'bg-red-900' },
    { label: 'Emerald', value: 'bg-emerald-900' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-theme-ink mb-2">Menu Management</h1>
          <p className="text-theme-ink-dim text-sm">Manage your products, categories, and pricing.</p>
        </div>
        
        <div className="flex gap-2">
          <a 
            href="/store?table=5" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 border border-theme-border px-4 py-3 text-xs uppercase tracking-wider font-semibold text-theme-ink hover:border-theme-accent hover:text-theme-accent transition-colors"
          >
            <Search className="w-4 h-4" />
            Preview Webstore
          </a>
          {activeTab === 'products' ? (
            <>
              <button 
                onClick={downloadMenuTemplate}
                className="bg-theme-surface border border-theme-border text-theme-ink-dim hover:text-theme-ink px-4 py-3 text-xs uppercase tracking-wider font-semibold hover:bg-theme-surface-alt transition-colors flex items-center gap-2"
                title="Download CSV Template"
              >
                <Download className="w-4 h-4 text-theme-accent" />
                Template CSV
              </button>
              <button 
                onClick={() => productFileInputRef.current?.click()}
                className="bg-theme-surface border border-theme-border text-theme-ink px-4 py-3 text-xs uppercase tracking-wider font-semibold hover:bg-theme-surface-alt transition-colors flex items-center gap-2"
                title="Upload Excel or CSV"
              >
                <Upload className="w-4 h-4" />
                Import (.xlsx/.csv)
              </button>
              <input 
                type="file" 
                ref={productFileInputRef} 
                onChange={handleFileUpload}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                className="hidden" 
              />
              <button 
                onClick={() => handleOpenModal()}
                className="bg-theme-accent text-black px-6 py-3 rounded-lg text-xs uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(197,160,89,0.3)] hover:shadow-[0_0_20px_rgba(197,160,89,0.5)] transition-all flex items-center gap-2 w-fit"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </>
          ) : (
            <button 
              onClick={() => handleOpenCategoryModal()}
              className="bg-theme-accent text-black px-6 py-3 rounded-lg text-xs uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(197,160,89,0.3)] hover:shadow-[0_0_20px_rgba(197,160,89,0.5)] transition-all flex items-center gap-2 w-fit"
            >
              <FolderOpen className="w-4 h-4" />
              Add Category
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-theme-surface-alt p-1.5 rounded-lg w-fit border border-theme-border">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-6 py-2.5 text-xs uppercase tracking-wider font-bold rounded-md transition-all ${
            activeTab === 'products' 
              ? 'bg-theme-bg text-theme-accent shadow-sm ring-1 ring-theme-border' 
              : 'text-theme-ink-dim hover:text-theme-ink hover:bg-theme-bg/50'
          }`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-6 py-2.5 text-xs uppercase tracking-wider font-bold rounded-md transition-all ${
            activeTab === 'categories' 
              ? 'bg-theme-bg text-theme-accent shadow-sm ring-1 ring-theme-border' 
              : 'text-theme-ink-dim hover:text-theme-ink hover:bg-theme-bg/50'
          }`}
        >
          Master Categories
        </button>
      </div>
      
      <div className="bg-theme-surface border border-theme-border flex flex-col w-full overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-theme-border flex flex-col sm:flex-row items-center justify-between bg-theme-surface-alt gap-4">
          <div className="relative w-full max-w-md">
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

        {/* Dynamic Table based on active tab */}
        <div className="overflow-x-auto w-full">
          {activeTab === 'products' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-theme-border bg-theme-bg">
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Product</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Category</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Price</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Color Label</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-theme-ink-dim">
                      <div className="flex items-center justify-center gap-2">
                         <Loader2 className="w-4 h-4 animate-spin text-theme-accent" /> Loading products...
                      </div>
                    </td>
                  </tr>
                ) : paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-theme-ink-dim">No products found on this page.</td>
                  </tr>
                ) : (
                  paginatedProducts.map(product => (
                    <tr key={product.id} className="hover:bg-theme-surface-alt transition-colors group">
                      <td className="py-5 px-4">
                        <div className="flex items-center gap-4">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover border border-theme-border rounded-md shrink-0 shadow-sm" />
                          ) : (
                            <div className="w-12 h-12 bg-theme-bg/50 border border-theme-border rounded-md flex items-center justify-center shrink-0 shadow-sm">
                              <ImageIcon className="w-5 h-5 text-theme-ink-dim/30" />
                            </div>
                          )}
                          <div>
                            <div className="font-serif text-lg text-theme-ink mb-1">{product.name}</div>
                            {product.plu && <div className="text-[10px] uppercase tracking-widest text-theme-ink-dim font-mono">{product.plu}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        <span className="bg-theme-surface-alt px-3 py-1.5 border border-theme-border rounded-full text-[11px] font-bold uppercase tracking-wider text-theme-ink-dim group-hover:text-theme-ink transition-colors">{product.category}</span>
                      </td>
                      <td className="py-5 px-4 text-base text-theme-accent font-bold font-mono tracking-tight">{formatCurrency(product.price)}</td>
                      <td className="py-5 px-4">
                        <div className={`w-8 h-8 rounded-full ${product.color_label || 'bg-stone-800'} border border-theme-border shadow-sm ring-2 ring-transparent group-hover:ring-theme-ink/20 transition-all`} title={product.color_label} />
                      </td>
                      <td className="py-5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenModal(product)} className="p-2 text-theme-ink-dim hover:text-theme-accent transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="p-2 text-theme-ink-dim hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-theme-border bg-theme-bg">
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Category Name</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Master PLU</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-theme-ink-dim">
                      <div className="flex items-center justify-center gap-2">
                         <Loader2 className="w-4 h-4 animate-spin text-theme-accent" /> Loading categories...
                      </div>
                    </td>
                  </tr>
                ) : paginatedCategories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-theme-ink-dim">No categories found on this page.</td>
                  </tr>
                ) : (
                  paginatedCategories.map(cat => (
                    <tr key={cat.id} className="hover:bg-theme-surface-alt transition-colors group">
                      <td className="py-5 px-4 font-serif text-lg text-theme-ink font-bold">{cat.name}</td>
                      <td className="py-5 px-4 text-base text-theme-accent font-bold font-mono tracking-tight">{cat.master_plu || '-'}</td>
                      <td className="py-5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenCategoryModal(cat)} className="p-2 text-theme-ink-dim hover:text-theme-accent transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-theme-ink-dim hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <Pagination 
          currentPage={currentPage}
          totalItems={activeTab === 'products' ? filteredProducts.length : filteredCategories.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-theme-surface border border-theme-border w-full max-w-2xl shadow-2xl flex flex-col rounded-xl overflow-hidden max-h-[90vh]">
            <div className="p-6 border-b border-theme-border flex items-center justify-between bg-theme-surface-alt shrink-0">
              <h2 className="font-serif text-xl text-theme-ink">{editingProduct ? 'Edit Product' : 'New Product'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-theme-ink-dim hover:text-theme-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {/* Basic Information Section */}
              <div className="bg-theme-bg/50 border border-theme-border p-4 rounded-lg space-y-4 shadow-sm">
                <h3 className="text-[10px] uppercase tracking-widest text-theme-accent font-bold mb-2">Basic Information</h3>
                
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Product Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                    placeholder="e.g. Iced Latte"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Foreign/Middle Name (Optional)</label>
                    <input 
                      type="text" 
                      value={formData.middle_name}
                      onChange={e => setFormData({...formData, middle_name: e.target.value})}
                      className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                      placeholder="e.g. ลาเต้เย็น"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">PLU Code (Optional)</label>
                    <input 
                      type="text" 
                      value={formData.plu}
                      onChange={e => setFormData({...formData, plu: e.target.value})}
                      className="w-full bg-theme-surface border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono uppercase"
                      placeholder="e.g. LAT-001"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Description / English Translations (Optional)</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-theme-surface border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all resize-none h-20"
                    placeholder="e.g. Marinated King Prawns With Thai Pepper..."
                  />
                </div>
              </div>

              {/* Media & Category Section */}
              <div className="bg-theme-bg/50 border border-theme-border p-4 rounded-lg space-y-4 shadow-sm">
                <h3 className="text-[10px] uppercase tracking-widest text-theme-accent font-bold mb-2">Media & Category</h3>
                
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Product Image</label>
                  {formData.image_url ? (
                    <div className="relative group/img">
                      <img 
                        src={formData.image_url} 
                        alt={formData.name || 'Product preview'} 
                        className="w-full h-40 object-cover border border-theme-border rounded-md shadow-sm"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <button 
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 p-2 bg-black/80 text-white rounded-md opacity-0 group-hover/img:opacity-100 transition-all hover:bg-red-600 shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => imageFileInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files[0];
                        if (file) handleImageUpload(file);
                      }}
                      className="w-full h-32 rounded-md border-2 border-dashed border-theme-border hover:border-theme-accent flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-theme-surface group/upload"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin text-theme-accent" />
                          <span className="text-xs text-theme-ink-dim font-medium tracking-wider">UPLOADING...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-theme-ink-dim group-hover/upload:text-theme-accent transition-colors" />
                          <span className="text-xs text-theme-ink-dim font-medium tracking-wider group-hover/upload:text-theme-ink transition-colors">Click or drag & drop image</span>
                          <span className="text-[10px] text-theme-ink-dim/50 uppercase">JPEG, PNG, WebP, GIF (max 5MB)</span>
                        </>
                      )}
                    </div>
                  )}
                  <input 
                    ref={imageFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={e => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); e.target.value = ''; }}
                    className="hidden"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Category</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-theme-surface border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all appearance-none capitalize"
                    >
                      <option value="" disabled>Select category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Pricing & Display Section */}
              <div className="bg-theme-bg/50 border border-theme-border p-4 rounded-lg space-y-4 shadow-sm">
                <h3 className="text-[10px] uppercase tracking-widest text-theme-accent font-bold mb-2">Pricing & Display</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim mb-2 text-theme-accent font-bold">Dine-In Price ($)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      className="w-full bg-theme-surface border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Takeaway ($) <span className="font-normal opacity-50 lowercase">optional</span></label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={formData.price_takeaway}
                      onChange={e => setFormData({...formData, price_takeaway: e.target.value})}
                      className="w-full bg-theme-surface border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono"
                      placeholder="Same as Dine-In"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Delivery ($) <span className="font-normal opacity-50 lowercase">optional</span></label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={formData.price_delivery}
                      onChange={e => setFormData({...formData, price_delivery: e.target.value})}
                      className="w-full bg-theme-surface border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono"
                      placeholder="Same as Dine-In"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">POS Color Label</label>
                  <div className="flex gap-3">
                    {COLOR_OPTIONS.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({...formData, color_label: color.value})}
                        className={`w-10 h-10 rounded-full border-2 transition-all ${color.value} ${formData.color_label === color.value ? 'border-theme-accent scale-110 shadow-lg' : 'border-transparent hover:border-theme-border hover:scale-105'}`}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Nutrition Facts Section */}
              <div className="bg-theme-bg/50 border border-theme-border p-4 rounded-lg space-y-4 shadow-sm">
                <div className="flex flex-col gap-2 mb-2">
                  <h3 className="text-[10px] uppercase tracking-widest text-theme-accent font-bold">Nutrition Facts & Dietary (Optional)</h3>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-900/30 hover:bg-emerald-900/40 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={formData.is_healthy} 
                        onChange={e => setFormData({...formData, is_healthy: e.target.checked})}
                        className="w-4 h-4 accent-emerald-500 bg-theme-surface border-theme-border"
                      />
                      <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-medium">Health & Wellness</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer bg-amber-900/20 px-3 py-1.5 rounded-full border border-amber-900/30 hover:bg-amber-900/40 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={formData.is_gluten_free} 
                        onChange={e => setFormData({...formData, is_gluten_free: e.target.checked})}
                        className="w-4 h-4 accent-amber-500 bg-theme-surface border-theme-border"
                      />
                      <span className="text-[11px] uppercase tracking-wider text-amber-500 font-medium">Gluten-Free</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer bg-green-900/20 px-3 py-1.5 rounded-full border border-green-900/30 hover:bg-green-900/40 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={formData.is_vegan} 
                        onChange={e => setFormData({...formData, is_vegan: e.target.checked})}
                        className="w-4 h-4 accent-green-500 bg-theme-surface border-theme-border"
                      />
                      <span className="text-[11px] uppercase tracking-wider text-green-500 font-medium">Vegan</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer bg-theme-accent/10 px-3 py-1.5 rounded-full border border-theme-accent/30 hover:bg-theme-accent/20 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.is_lunch_special}
                        onChange={e => setFormData({...formData, is_lunch_special: e.target.checked})}
                        className="w-4 h-4 accent-theme-accent bg-theme-surface border-theme-border"
                      />
                      <span className="text-[11px] uppercase tracking-wider text-theme-accent font-medium">Lunch special (pre-order only)</span>
                    </label>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase text-theme-ink-dim mb-1">Calories</label>
                    <input 
                      type="number" 
                      value={formData.calories}
                      onChange={e => setFormData({...formData, calories: e.target.value})}
                      className="w-full bg-theme-surface border border-theme-border p-2 rounded-md text-xs text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono"
                      placeholder="kcal"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-theme-ink-dim mb-1">Protein (g)</label>
                    <input 
                      type="number" 
                      value={formData.protein}
                      onChange={e => setFormData({...formData, protein: e.target.value})}
                      className="w-full bg-theme-surface border border-theme-border p-2 rounded-md text-xs text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono"
                      placeholder="g"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-theme-ink-dim mb-1">Carbs (g)</label>
                    <input 
                      type="number" 
                      value={formData.carbs}
                      onChange={e => setFormData({...formData, carbs: e.target.value})}
                      className="w-full bg-theme-surface border border-theme-border p-2 rounded-md text-xs text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono"
                      placeholder="g"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-theme-ink-dim mb-1">Fat (g)</label>
                    <input 
                      type="number" 
                      value={formData.fat}
                      onChange={e => setFormData({...formData, fat: e.target.value})}
                      className="w-full bg-theme-surface border border-theme-border p-2 rounded-md text-xs text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all font-mono"
                      placeholder="g"
                    />
                  </div>
                </div>
              </div>


              </div>

            <div className="p-6 border-t border-theme-border bg-theme-surface-alt flex justify-end gap-4 shrink-0">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 text-xs uppercase tracking-wider font-bold text-theme-ink-dim hover:text-theme-ink transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={!formData.name || !formData.price || isSaving}
                className="bg-theme-accent text-black px-8 py-3 rounded-md text-xs uppercase tracking-wider font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_10px_rgba(197,160,89,0.2)]"
              >
                {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                {isSaving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-theme-surface border border-theme-border w-full max-w-sm shadow-2xl flex flex-col rounded-xl overflow-hidden">
            <div className="p-6 border-b border-theme-border flex items-center justify-between bg-theme-surface-alt">
              <h2 className="font-serif text-xl text-theme-ink">{editingCategory ? 'Edit Category' : 'New Category'}</h2>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-theme-ink-dim hover:text-theme-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Category Name</label>
                <input 
                  type="text" 
                  value={categoryFormData.name}
                  onChange={e => setCategoryFormData({...categoryFormData, name: e.target.value})}
                  className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                  placeholder="e.g. Appetizers"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Master PLU (Optional)</label>
                <input 
                  type="text" 
                  value={categoryFormData.master_plu}
                  onChange={e => setCategoryFormData({...categoryFormData, master_plu: e.target.value})}
                  className="w-full bg-theme-bg border border-theme-border p-3 text-sm text-theme-ink focus:outline-none focus:border-theme-accent font-mono uppercase"
                  placeholder="e.g. CAT-001"
                />
              </div>
            </div>

            <div className="p-6 border-t border-theme-border bg-theme-surface-alt flex justify-end gap-4">
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-6 py-3 text-xs uppercase tracking-wider font-bold text-theme-ink-dim hover:text-theme-ink transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveCategory}
                disabled={!categoryFormData.name || isSaving}
                className="bg-theme-accent text-black px-8 py-3 rounded-md text-xs uppercase tracking-wider font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_10px_rgba(197,160,89,0.2)]"
              >
                {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                {isSaving ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
