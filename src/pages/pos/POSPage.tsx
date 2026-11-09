import { useState, useMemo, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Coffee, Utensils, Croissant, Receipt, Loader2, LogOut, UserPlus, X, Flame, Fish, Leaf, Soup, PauseCircle, PlayCircle, Gift, TrendingUp, Search, Upload, Landmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CartItem, Product, PaymentMethod, Order, Shift } from '../../types';
import { fetchProducts, fetchProductCategories, fetchPopularProductIds, uploadProductImage } from '../../lib/api/products';
import { fetchActiveShift, createShift, closeShift } from '../../lib/api/shifts';
import { fetchRecipes, fetchStockItems, upsertOrder, insertOrderItems, deleteOrderItems, processOrderAtomic, updateOrderStatus } from '../../lib/api/orders';
import { fetchAllSubRecipeIngredients } from '../../lib/api/recipes';
import { fetchTableOrder, closeTable } from '../../lib/api/tableOps';
import { updateGiftCard, createGiftCards, createGiftCardTransaction } from '../../lib/api/giftcards';
import { DbError } from '../../lib/api/errors';

const BANK_INFO = {
  bank: 'Siam Commercial Bank (SCB)',
  accountNo: '123-456789-0',
  accountName: 'Vermont Thai',
};

const BANK_TRANSFER_ENABLED = true;
import { useSettings } from '../../hooks/useSettings';
import formatCurrency from '../../lib/formatCurrency';
import ShiftModal from '../../components/pos/ShiftModal';
import CloseShiftModal from '../../components/pos/CloseShiftModal';
import ModifierModal from '../../components/pos/ModifierModal';
import CheckoutModal from '../../components/pos/CheckoutModal';
import CustomerModal from '../../components/pos/CustomerModal';
import AddCustomerModal from '../../components/admin/AddCustomerModal';
import ReceiptModal from '../../components/pos/ReceiptModal';
import GiftCardRedeemModal from '../../components/pos/GiftCardRedeemModal';
import { GiftCard } from '../../types';

import TableManagement from '../../components/pos/TableManagement';
import { useToast } from '../../components/Toast';
import { calculateProductAvailability } from '../../lib/inventoryUtils';
import { SubRecipeIngredient } from '../../types';

export default function POSPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id?: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('Popular & Deals');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('takeaway');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryName, setDeliveryName] = useState('');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [popularProductIds, setPopularProductIds] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [subRecipeIngredients, setSubRecipeIngredients] = useState<SubRecipeIngredient[]>([]);

  // Hold Cart
  const [heldOrders, setHeldOrders] = useState<{ id: string, name: string, time: string, cart: CartItem[] }[]>([]);
  const [isHoldPromptOpen, setIsHoldPromptOpen] = useState(false);
  const [holdName, setHoldName] = useState('');
  const [isRecallOpen, setIsRecallOpen] = useState(false);

  // Shift State
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [openShiftData, setOpenShiftData] = useState<Shift | null>(null);
  const [isShiftChecking, setIsShiftChecking] = useState(true);
  const [showShiftPrompt, setShowShiftPrompt] = useState(false);
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);
  const [shiftStartCash, setShiftStartCash] = useState<number>(0);
  const [isStartingShift, setIsStartingShift] = useState(false);
  
  // Modal States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankSlip, setBankSlip] = useState<File | null>(null);
  const [bankSlipPreview, setBankSlipPreview] = useState('');
  const [isBankProcessing, setIsBankProcessing] = useState(false);
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<{ id: string, name: string } | null>(null);
  
  // Gift Card State
  const [isGiftCardRedeemOpen, setIsGiftCardRedeemOpen] = useState(false);
  const [appliedGiftCard, setAppliedGiftCard] = useState<GiftCard | null>(null);

  // Settings Data
  const { storeName, taxRate, defaultStartingCash: defaultCash, receiptHeader, receiptFooter } = useSettings();

  // Active Table
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Current Staff
  const [currentStaff, setCurrentStaff] = useState<{ id: string, name: string, role: string } | null>(null);

  useEffect(() => {
    // Check for logged in staff
    const staffData = localStorage.getItem('kungpos_staff');
    if (staffData) {
      try {
        setCurrentStaff(JSON.parse(staffData));
      } catch (e) {
        console.error('Failed to parse staff data');
      }
    } else if (localStorage.getItem('kungpos_admin')) {
        setCurrentStaff({ id: 'admin', name: 'Admin', role: 'manager' });
    } else {
        // Force login if no session
        navigate('/login');
    }

    async function checkShift() {
      try {
        const data = await fetchActiveShift();
        if (data && data.length > 0) {
          setActiveShiftId(data[0].id);
          setOpenShiftData(data[0] as Shift);
        } else {
          setShowShiftPrompt(true);
        }
      } catch (err) {
        console.error('Error checking active shift:', err);
      } finally {
        setIsShiftChecking(false);
      }
    }
    
    checkShift();
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsData, categoriesData, popularIds, recipesData, stockData, subRecipeData] = await Promise.all([
          fetchProducts(true),
          fetchProductCategories(),
          fetchPopularProductIds(),
          fetchRecipes(),
          fetchStockItems(),
          fetchAllSubRecipeIngredients()
        ]);

        if (productsData) setProducts(productsData as Product[]);
        if (categoriesData) setCategories(categoriesData);
        if (popularIds) setPopularProductIds(popularIds);
        if (recipesData) setRecipes(recipesData);
        if (stockData) setStockItems(stockData);
        if (subRecipeData) setSubRecipeIngredients(subRecipeData);
      } catch (error) {
        console.error('Error fetching menu data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();

    // Check held cart
    const stored = localStorage.getItem('heldOrders');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setHeldOrders(parsed);
      } catch (e) {}
    }
  }, []);

  const dynamicCategories = useMemo(() => {
    // Collect from DB categories first
    const cats = new Set<string>();
    categories.forEach(c => cats.add(c.name));
    
    // Also include from products if any are missing
    products.forEach(p => {
      if (p.category && p.category !== 'All') {
        cats.add(p.category);
      }
    });
    
    // Add health tags dynamically
    if (products.some(p => p.is_healthy)) cats.add('Health & Wellness');
    if (products.some(p => p.is_gluten_free)) cats.add('Gluten-Free');
    if (products.some(p => p.is_vegan)) cats.add('Vegan');
    
    return ['Popular & Deals', 'All', ...Array.from(cats)];
  }, [products, categories]);

  const filteredProducts = useMemo(() => {
    let filtered = products.filter(p => p.is_active !== false);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
      return filtered;
    }
    
    if (activeCategory === 'Popular & Deals') {
      const topItems = filtered.filter(p => popularProductIds.includes(p.id));
      // Just to ensure we're never completely empty, if there's no sales data, pick a few random or specific items
      if (topItems.length === 0) {
        return filtered.slice(0, 6);
      }
      return topItems;
    }

    if (activeCategory === 'Health & Wellness') {
      return filtered.filter(p => p.is_healthy);
    }
    if (activeCategory === 'Gluten-Free') {
      return filtered.filter(p => p.is_gluten_free);
    }
    if (activeCategory === 'Vegan') {
      return filtered.filter(p => p.is_vegan);
    }
    
    if (activeCategory !== 'All') {
      filtered = filtered.filter(p => p.category === activeCategory);
    }
    return filtered;
  }, [activeCategory, products, popularProductIds, searchQuery]);

  const { productAvailability, variantAvailability } = useMemo(() => {
    return calculateProductAvailability(products, recipes, stockItems, subRecipeIngredients);
  }, [products, recipes, stockItems, subRecipeIngredients]);
  const getOptionPriceAdj = (opt: any, currentOrderType: string) => {
    if (currentOrderType === 'delivery' && opt.price_delivery !== undefined && opt.price_delivery !== null) return Number(opt.price_delivery);
    if (currentOrderType === 'takeaway' && opt.price_takeaway !== undefined && opt.price_takeaway !== null) return Number(opt.price_takeaway);
    return Number(opt.price_adjustment !== undefined && opt.price_adjustment !== null ? opt.price_adjustment : (opt.price || 0));
  };

  const getItemPrice = (item: CartItem, currentOrderType: string) => {
    let basePrice = item.product.price;
    if (currentOrderType === 'takeaway' && item.product.price_takeaway) {
      basePrice = item.product.price_takeaway;
    } else if (currentOrderType === 'delivery' && item.product.price_delivery) {
      basePrice = item.product.price_delivery;
    }

    let modsPrice = 0;
    if (item.modifiers && item.product.customizations) {
      item.modifiers.forEach(modName => {
        item.product.customizations!.forEach(group => {
          const opt = group.options.find(o => {
            const priceAdj = getOptionPriceAdj(o, currentOrderType);
            return o.name === modName || modName.startsWith(o.name);
          });
          if (opt) {
            modsPrice += getOptionPriceAdj(opt, currentOrderType);
          }
        });
      });
    }
    return basePrice + modsPrice;
  };

  const { subtotal, tax, total } = useMemo(() => {
    const sub = cart.reduce((sum, item) => {
      return sum + getItemPrice(item, orderType) * item.quantity;
    }, 0);
    const tx = sub * taxRate;
    let finalTotal = sub + tx;
    if (appliedGiftCard) {
      finalTotal = Math.max(0, finalTotal - appliedGiftCard.current_balance);
    }
    return {
      subtotal: sub,
      tax: tx,
      total: finalTotal
    };
  }, [cart, taxRate, orderType, appliedGiftCard]);

  const handleProductClick = (product: Product) => {
    if (product.customizations && product.customizations.length > 0) {
      setSelectedProduct(product);
      setIsModifierModalOpen(true);
    } else {
      const existing = cart.find(item => item.product.id === product.id && (!item.modifiers || item.modifiers.length === 0));
      if (existing) {
        updateQuantity(existing.id, 1);
      } else {
        const newItem: CartItem = {
          id: Math.random().toString(36).substring(2, 9),
          product,
          quantity: 1
        };
        setCart(prev => [...prev, newItem]);
      }
    }
  };

  const handleAddToCartWithModifiers = (product: Product, quantity: number, modifiers: string[], note: string) => {
    const newItem: CartItem = {
      id: Math.random().toString(36).substring(2, 9),
      product,
      quantity,
      modifiers,
      note
    };
    setCart(prev => [...prev, newItem]);
    setIsModifierModalOpen(false);
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === cartItemId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleHoldOrderSubmit = async (overrideName?: string) => {
    if (isProcessing) return;
    const finalHoldName = overrideName || holdName.trim();
    if (cart.length === 0 || !finalHoldName) return;
    
    setIsProcessing(true);
    const orderId = activeOrderId || crypto.randomUUID();
    
    const newOrder = {
      id: orderId,
      subtotal,
      tax,
      total,
      payment_method: 'CASH',
      order_type: orderType,
      timestamp: new Date().toISOString(),
      status: 'pending',
      customer_name: currentCustomer?.name || finalHoldName,
      customer_id: currentCustomer?.id || null,
      shift_id: activeShiftId
    };

    try {
      await upsertOrder(newOrder);

      if (activeOrderId) {
        await deleteOrderItems(orderId);
      }

      const orderItems = cart.map(item => ({
        order_id: orderId,
        product_id: item.product.id,
        unit_price: item.product.id === 'open-item' ? item.product.price : undefined,
        quantity: item.quantity,
        note: item.note || null,
        modifiers: item.modifiers || []
      }));

      await insertOrderItems(orderItems);

      const newHold = {
        id: Math.random().toString(36).substring(2, 9),
        dbId: orderId,
        name: finalHoldName,
        time: new Date().toISOString(),
        cart: [...cart]
      };
      
      const updatedHolds = [...heldOrders, newHold];
      setHeldOrders(updatedHolds);
      localStorage.setItem('heldOrders', JSON.stringify(updatedHolds));
      
      setCart([]);
      setCurrentCustomer(null);
      setOrderType('takeaway');
      setActiveTable(null);
      setActiveOrderId(null);
      setIsHoldPromptOpen(false);
      setHoldName('');
      
    } catch (error) {
      console.error('Failed to send order to kitchen:', error);
      toast('Failed to send to kitchen. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchDbOrderForTable = async (tableId: string) => {
    setIsProcessing(true);
    try {
      // The server finds the open order of the table (active session first, then by customer name)
      const found = await fetchTableOrder(tableId);
      const activeOrder: any = found?.order ?? null;

      if (!activeOrder) {
        // No DB order found — open a blank ticket for this table
        setActiveTable(tableId);
        return;
      }

      const reconstructedCart: CartItem[] = (activeOrder.order_items || []).map((item: any) => ({
        id: item.id?.toString() || crypto.randomUUID(),
        product: {
          id: item.products?.id || 'unknown',
          name: item.products?.name || 'Unknown Item',
          price: item.products?.price || 0,
          price_takeaway: item.products?.price_takeaway,
          category: item.products?.category || 'Other',
          is_active: true
        },
        quantity: item.quantity,
        note: item.note || undefined,
        modifiers: item.modifiers || [],
        effectivePrice: item.unit_price ?? item.products?.price ?? 0
      }));

      setCart(reconstructedCart);
      setActiveTable(tableId);
      setActiveOrderId(activeOrder.id);
      setOrderType(activeOrder.order_type as any || 'dine_in');
      setCurrentCustomer((found?.customer as any) ?? null);
    } catch (e: any) {
      console.error('Error fetching table order:', e);
      alert('Failed to load table order from database.');
      setActiveTable(tableId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelTableSession = async () => {
    const table = activeTable;
    try {
      if (table) await closeTable(table);
    } catch (e) {
      console.error('Failed to close table session', e);
      toast('Could not close the table session. Please try again.', 'error');
      return;
    }
    if (table) {
      const remaining = (heldOrders as any[]).filter(h => h.name !== table);
      setHeldOrders(remaining as any);
      localStorage.setItem('heldOrders', JSON.stringify(remaining));
    }
    setActiveTable(null);
    setActiveOrderId(null);
    setCart([]);
    setCurrentCustomer(null);
    setAppliedGiftCard(null);
  };

  const handleRecallOrder = (holdId: string) => {
    const holdOrder = (heldOrders as any[]).find(h => h.id === holdId);
    if (!holdOrder) return;
    setCart(holdOrder.cart);
    setActiveTable(holdOrder.name);
    setActiveOrderId(holdOrder.dbId || null); // Important: Keep the same DB ID
    setOrderType('dine_in'); // Defaulting to dine in if we recall a table ticket
    const updatedHolds = heldOrders.filter(h => h.id !== holdId);
    setHeldOrders(updatedHolds);
    localStorage.setItem('heldOrders', JSON.stringify(updatedHolds));
    setIsRecallOpen(false);
  };

  const handleCheckoutClick = (method: PaymentMethod) => {
    if (cart.length === 0) return;
    if (method === 'CASH') {
      setIsCheckoutOpen(true);
    } else if (method === 'BANK') {
      setIsBankModalOpen(true);
    } else {
      processOrder('CARD');
    }
  };

  const processBankOrder = async () => {
    if (!bankSlip || isBankProcessing) return;
    setIsBankProcessing(true);
    const orderId = activeOrderId || crypto.randomUUID();
    try {
      const ext = (bankSlip.name.split('.').pop() || 'jpg').toLowerCase();
      await uploadProductImage(bankSlip, `slips/${orderId}.${ext}`);
      await processOrder('BANK');
      setIsBankModalOpen(false);
      setBankSlip(null);
      setBankSlipPreview('');
    } catch (e) {
      console.error('Bank transfer order failed', e);
    } finally {
      setIsBankProcessing(false);
    }
  };

  const processOrder = async (method: PaymentMethod, tenderedAmount?: number) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const orderId = activeOrderId || crypto.randomUUID();

    try {
      await processOrderAtomic({
        orderId,
        subtotal,
        tax,
        total,
        paymentMethod: method,
        orderType,
        status: 'pending', // Send to kitchen as pending instead of completing immediately
        customerId: currentCustomer?.id || null,
        customerName: (orderType === 'delivery' && deliveryName) ? deliveryName : (currentCustomer?.name || (activeTable ? `Table ${activeTable}` : null)),
        shiftId: activeShiftId,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress : null,
        deliveryPhone: orderType === 'delivery' ? deliveryPhone : null,
        items: cart.map(item => ({
          product_id: item.product.id,
          // Open Item: the custom price typed by the cashier is the only place its price exists.
          unit_price: item.product.id === 'open-item' ? item.product.price : undefined,
          quantity: item.quantity,
          note: item.note || null,
          modifiers: item.modifiers || []
        }))
      });

      if (orderType === 'dine_in') {
        await updateOrderStatus(orderId, 'completed');
      }

      // Clear table sessions for this table if we had an active table
      if (activeTable) {
        await closeTable(activeTable);
      }


      if (openShiftData) {
        setOpenShiftData({ ...openShiftData, total_sales: Number(openShiftData.total_sales || 0) + total });
      }

      if (appliedGiftCard) {
        const orderSubAndTax = subtotal + tax;
        const amountToDeduct = Math.min(orderSubAndTax, appliedGiftCard.current_balance);
        const newBalance = appliedGiftCard.current_balance - amountToDeduct;
        const isDepleted = newBalance <= 0;

        try {
          await updateGiftCard(appliedGiftCard.id, {
            current_balance: newBalance,
            status: isDepleted ? 'depleted' : 'active'
          });
          await createGiftCardTransaction({
            gift_card_id: appliedGiftCard.id,
            order_id: orderId,
            amount: -amountToDeduct,
            transaction_type: 'redemption'
          });
        } catch (gcErr) {
          console.error('Failed to update gift card balance', gcErr);
        }
      }

      const generated_gift_cards = [];
      for (const item of cart) {
        const catName = categories.find(c => c.id === item.product.category)?.name;
        if (catName === 'Gift Cards' || item.product.name.toLowerCase().includes('gift card')) {
          for (let i = 0; i < item.quantity; i++) {
            const code = Math.random().toString(36).substring(2, 10).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
            
            let initialValue = item.product.price;
            const match = item.product.name.match(/\$(\d+)/);
            if (match) {
              initialValue = parseFloat(match[1]);
            }

            generated_gift_cards.push({
              code,
              initial_value: initialValue,
              current_balance: initialValue,
              purchase_price: typeof item.effectivePrice === 'number' ? item.effectivePrice : item.product.price,
              customer_id: currentCustomer?.id || undefined,
              status: 'active' as const
            });
          }
        }
      }

      if (generated_gift_cards.length > 0) {
        try {
          await createGiftCards(generated_gift_cards);
        } catch (gcError) {
          console.error('Failed to create gift cards', gcError);
        }
      }

      setLastOrder({
        id: orderId,
        items: [...cart],
        subtotal,
        tax,
        total,
        paymentMethod: method,
        timestamp: new Date(),
        customerName: currentCustomer?.name || undefined,
        generated_gift_cards: generated_gift_cards.length > 0 ? generated_gift_cards as any : undefined
      });
      setIsReceiptOpen(true);
      setCart([]);
      setCurrentCustomer(null);
      setAppliedGiftCard(null);
      setOrderType('takeaway');
      setDeliveryAddress('');
      setDeliveryPhone('');
      setDeliveryName('');
      
      // Remove from held orders if it exists
      if (activeTable) {
        setHeldOrders(prev => {
          const newHeld = prev.filter(o => o.name !== activeTable);
          localStorage.setItem('heldOrders', JSON.stringify(newHeld));
          return newHeld;
        });

        // Also close the table session in the DB
        try {
          await closeTable(activeTable);
        } catch (err) {}
      }
      
      setActiveTable(null);
      setActiveOrderId(null);
      setIsMobileCartOpen(false);
      setIsCheckoutOpen(false);
      
      const latestStock = await fetchStockItems();
      setStockItems(latestStock);
      
    } catch (error) {
      if (error instanceof DbError) {
        console.error('Error processing order:', error.userMessage, error);
      } else {
        console.error('Error processing order:', error);
      }
      toast('Failed to process order. Check console.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenShift = async (amount: number) => {
    setIsStartingShift(true);
    try {
      const shift = await createShift({ starting_cash: amount, opened_by: currentStaff?.name || null });
      setActiveShiftId(shift.id);
      setOpenShiftData(shift as Shift);
      setShowShiftPrompt(false);
    } catch (err) {
      console.error('Error opening shift:', err);
      toast('Failed to open shift', 'error');
    } finally {
      setIsStartingShift(false);
    }
  };

  const handleCloseShift = async (actualCash: number, notes: string) => {
    if (!activeShiftId || !openShiftData) return;
    setIsProcessing(true);
    try {
      const expected = Number(openShiftData.starting_cash || 0) + Number(openShiftData.total_sales || 0);
      await closeShift(activeShiftId, {
        ended_at: new Date().toISOString(),
        expected_cash: expected,
        actual_cash: actualCash,
        total_sales: Number(openShiftData.total_sales || 0),
        notes,
        closed_by: currentStaff?.name || undefined
      });
      
      setIsCloseShiftOpen(false);
      setActiveShiftId(null);
      setOpenShiftData(null);
      setShowShiftPrompt(true);
    } catch (err) {
      console.error('Error closing shift:', err);
      toast('Failed to close shift', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('popular')) return <TrendingUp className="w-4 h-4" />;
    if (lower.includes('curry') || lower.includes('spicy')) return <Flame className="w-4 h-4" />;
    if (lower.includes('soup')) return <Soup className="w-4 h-4" />;
    if (lower.includes('seafood') || lower.includes('fish')) return <Fish className="w-4 h-4" />;
    if (lower.includes('salad') || lower.includes('vegan') || lower.includes('health')) return <Leaf className="w-4 h-4" />;
    if (lower.includes('drink') || lower.includes('coffee')) return <Coffee className="w-4 h-4" />;
    if (lower.includes('dessert')) return <Croissant className="w-4 h-4" />;
    if (lower.includes('gift')) return <Gift className="w-4 h-4" />;
    return <Utensils className="w-4 h-4" />;
  };

  if (isShiftChecking) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-theme-bg">
        <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
      </div>
    );
  }

  return (
    <>
      {/* 1. Shift Opening Modal (Bypass/Block everything else) */}
      {showShiftPrompt && (
        <ShiftModal 
          isOpen={showShiftPrompt} 
          onOpenShift={handleOpenShift} 
          isLoading={isStartingShift}
          defaultAmount={defaultCash}
        />
      )}

      {/* 2. Functional Modals (Always available when POS is active) */}
      {activeShiftId && (
        <>
          <ModifierModal 
            isOpen={isModifierModalOpen} 
            product={selectedProduct} 
            orderType={orderType}
            onClose={() => setIsModifierModalOpen(false)} 
            onAddToCart={handleAddToCartWithModifiers} 
            variantAvailability={variantAvailability}
          />
          <CheckoutModal 
            isOpen={isCheckoutOpen} 
            total={total} 
            onClose={() => setIsCheckoutOpen(false)} 
            onConfirm={(tendered) => processOrder('CASH', tendered)} 
            isProcessing={isProcessing} 
          />
          <CustomerModal 
            isOpen={isCustomerOpen} 
            onClose={() => setIsCustomerOpen(false)} 
            onSelect={(customer) => setCurrentCustomer({ id: customer.id, name: customer.name })} 
            onAddNew={() => {
              setIsCustomerOpen(false);
              setIsAddingCustomer(true);
            }}
          />
          <AddCustomerModal
            isOpen={isAddingCustomer}
            onClose={() => setIsAddingCustomer(false)}
            onCustomerAdded={(customer) => {
              setCurrentCustomer({ id: customer.id, name: customer.name });
            }}
          />
          <CloseShiftModal
            isOpen={isCloseShiftOpen}
            expectedCash={Number(openShiftData?.starting_cash || 0) + Number(openShiftData?.total_sales || 0)}
            totalSales={Number(openShiftData?.total_sales || 0)}
            shiftStart={openShiftData?.started_at || ''}
            onClose={() => setIsCloseShiftOpen(false)}
            onConfirm={handleCloseShift}
            isProcessing={isProcessing}
          />
          <ReceiptModal
            isOpen={isReceiptOpen}
            order={lastOrder}
            storeName={storeName}
            headerStr={receiptHeader}
            footerStr={receiptFooter}
            cashierName={currentStaff?.name}
            onClose={() => {
              setIsReceiptOpen(false);
              setLastOrder(null);
            }}
          />
          <GiftCardRedeemModal
            isOpen={isGiftCardRedeemOpen}
            onClose={() => setIsGiftCardRedeemOpen(false)}
            onRedeem={(gc) => setAppliedGiftCard(gc)}
          />
        </>
      )}

      {/* 3. Main POS Interface */}
      {!showShiftPrompt && activeShiftId && (
        <div className="flex flex-col h-screen bg-theme-bg text-theme-ink overflow-hidden font-sans">
          {/* Main Header */}
          <header className="h-14 md:h-20 bg-theme-surface border-b border-theme-border px-3 md:px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 md:gap-6 min-w-0">
              <h1 className="font-serif text-lg md:text-2xl text-theme-ink tracking-tight leading-none truncate">{storeName}</h1>
              <div className="hidden md:flex items-center gap-3">
                <span className="w-1 h-1 rounded-full bg-theme-border"></span>
                <span className="text-[10px] uppercase tracking-widest text-theme-ink-dim font-bold">Cashier: {currentStaff?.name || 'Admin'}</span>
                <span className="w-1 h-1 rounded-full bg-theme-border"></span>
                <span className="text-[10px] uppercase tracking-widest text-theme-accent font-bold">Shift: #{activeShiftId.slice(0, 8)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-6">
              <button 
                onClick={() => setIsCloseShiftOpen(true)}
                className="hidden sm:flex px-4 py-2 border border-red-500/30 rounded-md text-[10px] uppercase tracking-widest font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all"
              >
                End Shift
              </button>
              <div className="hidden md:flex items-center gap-4">
                <div className="w-px h-6 bg-theme-border"></div>
                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-mono text-theme-ink uppercase tracking-wider">
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-[9px] text-theme-ink-dim uppercase tracking-tighter">System Ready</span>
                </div>
                <div className="w-px h-6 bg-theme-border"></div>
                <button 
                  onClick={() => {
                    localStorage.removeItem('kungpos_staff');
                    localStorage.removeItem('kungpos_admin');
                    navigate('/login');
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-widest font-bold text-theme-ink-dim hover:text-theme-ink transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Exit
                </button>
              </div>
              {/* Mobile: cart toggle button */}
              <button
                onClick={() => setIsMobileCartOpen(true)}
                className="lg:hidden relative p-2 text-theme-ink-dim hover:text-theme-accent transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-theme-accent text-black text-[9px] font-bold rounded-full flex items-center justify-center">{cart.length}</span>
                )}
              </button>
            </div>
          </header>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile Horizontal Categories */}
            <div className="md:hidden flex overflow-x-auto gap-1 px-3 py-2 bg-theme-surface-alt border-b border-theme-border shrink-0 hide-scrollbar">
              {dynamicCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider whitespace-nowrap shrink-0 transition-colors ${
                    activeCategory === cat
                      ? 'bg-theme-accent text-black font-bold'
                      : 'bg-theme-surface border border-theme-border text-theme-ink-dim hover:text-theme-ink'
                  }`}
                >
                  <span className={activeCategory === cat ? 'text-black' : 'text-theme-ink-dim'}>{getCategoryIcon(cat)}</span>
                  {cat}
                </button>
              ))}
            </div>

            {/* Categories + Products row (side by side on md+) */}
            <div className="flex-1 flex overflow-hidden">
              {/* Vertical Categories (tablet/desktop) */}
              <aside className="hidden md:flex w-56 lg:w-64 bg-theme-surface-alt border-r border-theme-border flex-col overflow-y-auto shrink-0 hide-scrollbar py-4">
                <p className="text-[10px] uppercase tracking-[2px] text-theme-ink-dim mb-4 px-6">Menu Categories</p>
                <div className="space-y-1">
                  {dynamicCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`text-left w-full transition-all group px-4 py-1.5 ${
                        activeCategory === cat 
                          ? 'bg-theme-accent/10 text-theme-accent font-bold rounded-xl shadow-sm border border-theme-accent/20' 
                          : 'text-theme-ink-dim hover:text-theme-ink hover:bg-theme-bg/50 border border-transparent rounded-xl'
                      }`}
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className={`${activeCategory === cat ? 'text-theme-accent' : 'text-theme-ink-dim group-hover:text-theme-accent'} transition-colors`}>
                          {getCategoryIcon(cat)}
                        </div>
                        <span className="text-[12px] uppercase tracking-[1.5px]">{cat}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </aside>

              {/* Product Grid Area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {orderType === 'dine_in' && !activeTable && cart.length === 0 ? (
                  <TableManagement 
                    onSelectTable={(tableId) => {
                      const existingHold = heldOrders.find(o => o.name === tableId);
                      if (existingHold) {
                         handleRecallOrder(existingHold.id);
                      } else {
                         // Fetch from DB if it exists (e.g. ordered via Webstore)
                         fetchDbOrderForTable(tableId);
                      }
                    }} 
                    heldOrders={heldOrders} 
                  />
                ) : (
                  <main className="flex-1 overflow-y-auto px-3 md:px-6 py-3 md:py-6 bg-theme-bg relative">
                    {/* Header for Dine-In Table Context */}
                    {activeTable && (
                      <div className="mb-6 flex items-center justify-between bg-theme-accent/5 border border-theme-accent/20 p-4 rounded-sm">
                        <div className="flex items-center gap-3">
                          <Utensils className="w-5 h-5 text-theme-accent" />
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-theme-accent font-bold">Active Service</p>
                            <p className="font-serif text-xl text-theme-ink">{activeTable}</p>
                          </div>
                        </div>
                        <button 
                          onClick={handleCancelTableSession}
                          className="text-[10px] uppercase tracking-tighter text-theme-ink-dim hover:text-red-400 font-bold"
                        >
                          Cancel Table Session
                        </button>
                      </div>
                    )}

                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-ink-dim" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search menu..."
                        className="w-full pl-10 pr-10 py-3 bg-theme-surface border border-theme-border rounded-xl shadow-sm text-sm text-theme-ink placeholder:text-theme-ink-dim focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-ink-dim hover:text-theme-ink"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                      {/* Open Item */}
                      <button
                        onClick={() => {
                          const amount = window.prompt("Enter manual amount:");
                          if (amount) {
                            const price = parseFloat(amount);
                            if (!isNaN(price) && price > 0) {
                              setCart(prev => [...prev, {
                                id: Math.random().toString(36).substring(2, 9),
                                product: { id: 'open-item', name: 'Open Item', price, category: 'Other', is_active: true },
                                quantity: 1,
                                note: 'Manual'
                              }]);
                            }
                          }
                        }}
                        className="bg-theme-surface border border-dashed border-theme-border rounded-xl shadow-sm flex flex-col items-center justify-center p-4 hover:border-theme-accent hover:shadow-[0_0_15px_rgba(197,160,89,0.15)] transition-all group"
                      >
                        <Plus className="w-8 h-8 text-theme-ink-dim group-hover:text-theme-accent mb-2" />
                        <span className="font-serif text-lg text-theme-ink">Open Item</span>
                        <span className="text-xs mt-1 uppercase text-theme-ink-dim">Custom Price</span>
                      </button>

                      {filteredProducts.map(product => {
                        const isAvailable = productAvailability[product.id];
                        return (
                          <button
                            key={product.id}
                            onClick={() => isAvailable && handleProductClick(product)}
                            disabled={!isAvailable}
                            className={`bg-theme-surface border border-theme-border rounded-xl shadow-sm flex flex-col text-left group relative overflow-hidden transition-all hover:shadow-[0_0_15px_rgba(197,160,89,0.15)] ${
                              !isAvailable ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:border-theme-accent active:scale-95'
                            }`}
                          >
                            {product.image_url && (
                              <img 
                                src={product.image_url} 
                                alt={product.name} 
                                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                              />
                            )}
                            {product.image_url && <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>}
                            
                            {!isAvailable && (
                              <div className="absolute inset-0 bg-theme-surface/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center pointer-events-none">
                                <div className="bg-red-500/90 text-white px-3 py-1 rounded-sm text-xs font-bold tracking-widest uppercase border border-red-400 shadow-lg transform -rotate-12">
                                  Sold Out
                                </div>
                              </div>
                            )}

                            <div className="relative z-10 flex-1 flex flex-col justify-end p-3 w-full">
                              <div className="flex flex-col gap-0.5 w-full">
                                <div className="flex justify-between items-start w-full">
                                  <span className={`font-serif text-sm md:text-base font-bold leading-tight ${product.image_url ? 'text-white drop-shadow-lg' : 'text-theme-ink'} line-clamp-2`}>{product.name}</span>
                                  {activeCategory === 'Popular & Deals' && popularProductIds.includes(product.id) && (
                                    <span className="text-[8px] bg-theme-accent text-black px-1 py-0.5 rounded-sm font-bold uppercase whitespace-nowrap shadow-sm ml-1 shrink-0">Hot</span>
                                  )}
                                </div>
                                <span className={`text-sm md:text-base font-bold ${product.image_url ? 'text-theme-accent drop-shadow-md' : 'text-theme-accent'}`}>{formatCurrency(orderType === 'takeaway' && product.price_takeaway ? product.price_takeaway : product.price)}</span>
                              </div>
                            </div>
                            {!isAvailable && <span className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 text-xs text-white font-bold uppercase tracking-widest backdrop-blur-[2px]">Out of Stock</span>}
                          </button>
                        );
                      })}
                    </div>
                  </main>
                )}
              </div>

            {/* Right Pane: Cart / Ticket (desktop) */}
            <aside className="hidden lg:flex w-[400px] bg-theme-surface-alt border-l border-theme-border flex-col">
              <div className="p-4 border-b border-theme-border bg-theme-surface flex items-center justify-between">
                <h2 className="text-[11px] uppercase tracking-widest font-bold text-theme-accent flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" /> Current Ticket
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsCustomerOpen(true)} 
                    className={`p-2 transition-colors ${currentCustomer ? 'text-theme-accent' : 'text-theme-ink-dim hover:text-theme-accent'}`}
                    title={currentCustomer ? `Customer: ${currentCustomer.name}` : 'Attach Customer'}
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setIsGiftCardRedeemOpen(true)} 
                    className={`p-2 transition-colors ${appliedGiftCard ? 'text-theme-accent' : 'text-theme-ink-dim hover:text-theme-accent'}`}
                    title={appliedGiftCard ? `Gift Card: $${appliedGiftCard.current_balance} remaining` : 'Apply Gift Card'}
                  >
                    <Gift className="w-4 h-4" />
                  </button>
                  <button onClick={() => setIsRecallOpen(true)} className="p-2 text-theme-ink-dim hover:text-theme-accent transition-colors">
                    <PlayCircle className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setCart([]); setActiveTable(null); setCurrentCustomer(null); setAppliedGiftCard(null); }} className="p-2 text-theme-ink-dim hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Order Type Toggle */}
              <div className="flex gap-2 p-4 border-b border-theme-border bg-theme-bg">
                {(['dine_in', 'takeaway', 'delivery'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`flex-1 py-3 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all ${
                      orderType === type ? 'bg-theme-accent text-black shadow-[0_0_10px_rgba(197,160,89,0.3)]' : 'bg-theme-surface border border-theme-border text-theme-ink-dim hover:text-theme-ink hover:border-theme-accent'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Active Table Banner */}
              {activeTable && (
                <div className="mx-4 mt-4 px-4 py-3 rounded-lg bg-theme-accent/10 border border-theme-accent/20 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2 text-theme-accent text-[11px] font-bold">
                    <span className="w-4 h-4 rounded-full bg-theme-accent text-black flex items-center justify-center text-[8px]">T</span>
                    <span>Table {activeTable}</span>
                  </div>
                  <button 
                    onClick={async () => {
                      // Remove from held orders if it exists locally
                      setHeldOrders(prev => {
                        const newHeld = prev.filter(o => o.name !== activeTable);
                        localStorage.setItem('heldOrders', JSON.stringify(newHeld));
                        return newHeld;
                      });
                      
                        // Also attempt to clear table session from DB in case it was opened by QR
                      // And cancel any pending orders for this table
                      try {
                        // Completes the table sessions and cancels any pending orders of this table (stock returns)
                        await closeTable(activeTable, true);
                          
                      } catch (err) {}
                      
                      setActiveTable(null);
                      setActiveOrderId(null);
                      setCart([]);
                    }} 
                    className="text-[10px] text-theme-ink-dim hover:text-red-400 transition-colors font-semibold"
                  >
                    Clear Table
                  </button>
                </div>
              )}

              {/* Active Customer Banner */}
              {currentCustomer && (
                <div className="mx-4 mt-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2 text-theme-accent text-[11px] font-medium">
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Customer: {currentCustomer.name}</span>
                  </div>
                  <button 
                    onClick={() => setCurrentCustomer(null)} 
                    className="text-[10px] text-theme-ink-dim hover:text-red-400 transition-colors font-semibold"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Delivery Details Form */}
              {orderType === 'delivery' && (
                <div className="mx-4 mt-2 p-4 rounded-lg bg-theme-surface border border-theme-border flex flex-col gap-3 shadow-sm">
                  <h3 className="text-[11px] uppercase tracking-widest text-theme-accent font-bold mb-1">Delivery Details</h3>
                  <input
                    type="text"
                    placeholder="Recipient Name"
                    value={deliveryName}
                    onChange={(e) => setDeliveryName(e.target.value)}
                    className="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm focus:border-theme-accent focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    className="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm focus:border-theme-accent focus:outline-none"
                  />
                  <textarea
                    placeholder="Delivery Address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm focus:border-theme-accent focus:outline-none resize-none h-16"
                  />
                </div>
              )}

              {/* Cart Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-theme-ink-dim space-y-3 opacity-30">
                    <ShoppingCart className="w-12 h-12" />
                    <p className="text-[10px] uppercase tracking-widest">No Items Selected</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex justify-between items-start group">
                      <div className="flex-1 pr-4">
                        <p className="font-serif text-theme-ink">{item.product.name}</p>
                        {item.modifiers?.map(m => <p key={m} className="text-[10px] text-theme-accent uppercase">• {m}</p>)}
                        <p className="text-[11px] text-theme-ink-dim mt-1">{formatCurrency(getItemPrice(item, orderType))}</p>
                      </div>
                      <div className="flex items-center gap-2 bg-theme-surface p-1 border border-theme-border rounded-md shadow-sm">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-theme-accent"><Minus className="w-3 h-3"/></button>
                        <span className="text-xs w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-theme-accent"><Plus className="w-3 h-3"/></button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Checkout Controls */}
              <div className="p-6 bg-theme-surface border-t border-theme-border space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-theme-ink-dim text-[12px]">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {appliedGiftCard && (
                    <div className="flex justify-between items-center text-red-400 text-[12px] font-medium pt-1">
                      <span className="flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5 animate-pulse" /> Gift Card ({appliedGiftCard.code})
                      </span>
                      <div className="flex items-center gap-2">
                        <span>-{formatCurrency(Math.min(subtotal + tax, appliedGiftCard.current_balance))}</span>
                        <button 
                          onClick={() => setAppliedGiftCard(null)} 
                          className="text-[10px] text-theme-ink-dim hover:text-red-400 transition-colors font-bold cursor-pointer px-1"
                          title="Remove Gift Card"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between text-theme-ink text-lg font-serif pt-2 border-t border-theme-border">
                    <span>Total</span>
                    <span className="text-theme-accent">{formatCurrency(total)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleCheckoutClick('CASH')}
                    disabled={cart.length === 0 || isProcessing}
                    className="py-4 bg-theme-surface border border-theme-border rounded-xl shadow-sm text-[10px] font-bold uppercase tracking-widest hover:border-theme-accent hover:text-theme-accent transition-all disabled:opacity-50"
                  >
                    Cash
                  </button>
                  <button
                    onClick={() => handleCheckoutClick('CARD')}
                    disabled={cart.length === 0 || isProcessing}
                    className="py-4 bg-theme-accent text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-opacity-90 shadow-[0_0_15px_rgba(197,160,89,0.25)] transition-all disabled:opacity-50"
                  >
                    Card
                  </button>
                  {BANK_TRANSFER_ENABLED && (
                  <button
                    onClick={() => handleCheckoutClick('BANK')}
                    disabled={cart.length === 0 || isProcessing}
                    className="py-4 bg-theme-surface border border-theme-border rounded-xl shadow-sm text-[10px] font-bold uppercase tracking-widest hover:border-theme-accent hover:text-theme-accent transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Landmark className="w-3.5 h-3.5" />
                    Transfer
                  </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (activeTable) {
                        setHoldName(activeTable);
                        handleHoldOrderSubmit(activeTable);
                      } else {
                        setIsHoldPromptOpen(true);
                      }
                    }}
                    disabled={cart.length === 0 || isProcessing}
                    className="flex-1 py-3 border border-dashed border-theme-border text-[9px] uppercase tracking-widest text-theme-ink-dim hover:border-theme-accent hover:text-theme-accent transition-all"
                  >
                    {activeTable ? 'Update Kitchen' : 'Hold / Send'}
                  </button>
                  <button 
                    onClick={() => {
                      setLastOrder({
                        id: activeOrderId || 'PRE-BILL',
                        items: [...cart],
                        subtotal,
                        tax,
                        total,
                        paymentMethod: 'PRE-BILL' as any,
                        timestamp: new Date(),
                        customerName: currentCustomer?.name || activeTable || undefined
                      });
                      setIsReceiptOpen(true);
                    }}
                    disabled={cart.length === 0 || isProcessing}
                    className="flex-1 py-3 border border-theme-border text-[9px] uppercase tracking-widest hover:border-theme-accent transition-all text-theme-ink"
                  >
                    Print Bill
                  </button>
                </div>
              </div>
            </aside>
            </div>
          </div>

          {/* Mobile Sticky Floating Cart Bar */}
          {cart.length > 0 && !isMobileCartOpen && (
            <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-theme-surface border border-theme-accent/50 p-3.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center justify-between animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-theme-accent text-black font-bold flex items-center justify-center text-sm shadow-md">
                  {cart.reduce((a, b) => a + b.quantity, 0)}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-theme-ink-dim font-bold">Total Ticket</p>
                  <p className="text-base font-bold font-mono text-theme-accent">{formatCurrency(total)}</p>
                </div>
              </div>

              <button
                onClick={() => setIsMobileCartOpen(true)}
                className="bg-theme-accent text-black px-5 py-2.5 rounded-lg text-xs uppercase font-bold tracking-wider flex items-center gap-2 shadow-lg hover:bg-opacity-90 active:scale-95 transition-all"
              >
                <ShoppingCart className="w-4 h-4" /> View Cart
              </button>
            </div>
          )}

          {/* Recall Order Modal */}
          {isRecallOpen && (
            <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-theme-surface border border-theme-border w-full max-w-md shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-theme-border flex justify-between items-center bg-theme-surface-alt">
                  <h2 className="font-serif text-xl text-theme-ink">Held Orders</h2>
                  <button onClick={() => setIsRecallOpen(false)}><X className="w-5 h-5"/></button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                  {heldOrders.length === 0 ? <p className="text-center text-theme-ink-dim text-sm py-8">No orders on hold.</p> : 
                    heldOrders.map(h => (
                      <button key={h.id} onClick={() => handleRecallOrder(h.id)} className="w-full p-4 bg-theme-bg border border-theme-border hover:border-theme-accent text-left flex justify-between items-center group">
                        <div>
                          <p className="font-serif text-lg group-hover:text-theme-accent">{h.name}</p>
                          <p className="text-[10px] text-theme-ink-dim uppercase">{new Date(h.time).toLocaleTimeString()} • {h.cart.length} items</p>
                        </div>
                        <PlayCircle className="w-5 h-5 text-theme-ink-dim group-hover:text-theme-accent" />
                      </button>
                    ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* Hold Order Prompt */}
          {isHoldPromptOpen && (
            <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-theme-surface border border-theme-border w-full max-w-sm p-8 shadow-2xl">
                <h2 className="font-serif text-2xl text-theme-ink mb-2">Hold Order</h2>
                <p className="text-theme-ink-dim text-xs uppercase tracking-wider mb-6">Enter table or customer name</p>
                <input 
                  type="text" value={holdName} onChange={e => setHoldName(e.target.value)}
                  className="w-full bg-theme-bg border border-theme-border p-4 text-theme-ink focus:border-theme-accent outline-none mb-8"
                  placeholder="e.g. Table 12" autoFocus
                />
                <div className="flex gap-4">
                  <button onClick={() => setIsHoldPromptOpen(false)} className="flex-1 py-3 text-[10px] uppercase font-bold text-theme-ink-dim">Cancel</button>
                  <button 
                    onClick={() => handleHoldOrderSubmit()}
                    disabled={!holdName.trim() || isProcessing}
                    className="flex-1 py-3 bg-theme-accent text-black text-[10px] font-bold uppercase"
                  >
                    Hold
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Cart Drawer */}
          {isMobileCartOpen && (
            <div className="fixed inset-0 z-[100] lg:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileCartOpen(false)} />
              <div className="absolute inset-y-0 right-0 w-full max-w-md bg-theme-surface-alt border-l border-theme-border flex flex-col shadow-2xl">
                <div className="p-4 border-b border-theme-border bg-theme-surface flex items-center justify-between">
                  <h2 className="text-[11px] uppercase tracking-widest font-bold text-theme-accent flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" /> Current Ticket
                  </h2>
                  <button onClick={() => setIsMobileCartOpen(false)} className="p-2 text-theme-ink-dim hover:text-theme-ink">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Order Type Toggle */}
                <div className="flex gap-2 p-4 border-b border-theme-border bg-theme-bg">
                  {(['dine_in', 'takeaway', 'delivery'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setOrderType(type)}
                      className={`flex-1 py-3 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all ${
                        orderType === type ? 'bg-theme-accent text-black shadow-[0_0_10px_rgba(197,160,89,0.3)]' : 'bg-theme-surface border border-theme-border text-theme-ink-dim hover:text-theme-ink hover:border-theme-accent'
                      }`}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* Active Table Banner */}
                {activeTable && (
                  <div className="mx-4 mt-4 px-4 py-3 rounded-lg bg-theme-accent/10 border border-theme-accent/20 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2 text-theme-accent text-[11px] font-bold">
                      <span className="w-4 h-4 rounded-full bg-theme-accent text-black flex items-center justify-center text-[8px]">T</span>
                      <span>Table {activeTable}</span>
                    </div>
                    <button 
                      onClick={async () => {
                        setHeldOrders(prev => {
                          const newHeld = prev.filter(o => o.name !== activeTable);
                          localStorage.setItem('heldOrders', JSON.stringify(newHeld));
                          return newHeld;
                        });
                        try {
                          await closeTable(activeTable, true);
                        } catch (err) {}
                        setActiveTable(null);
                        setActiveOrderId(null);
                        setCart([]);
                      }} 
                      className="text-[10px] text-theme-ink-dim hover:text-red-400 transition-colors font-semibold"
                    >
                      Clear Table
                    </button>
                  </div>
                )}

                {/* Active Customer Banner */}
                {currentCustomer && (
                  <div className="mx-4 mt-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2 text-theme-accent text-[11px] font-medium">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Customer: {currentCustomer.name}</span>
                    </div>
                    <button 
                      onClick={() => setCurrentCustomer(null)} 
                      className="text-[10px] text-theme-ink-dim hover:text-red-400 transition-colors font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* Delivery Details Form */}
                {orderType === 'delivery' && (
                  <div className="mx-4 mt-2 p-4 rounded-lg bg-theme-surface border border-theme-border flex flex-col gap-3 shadow-sm">
                    <h3 className="text-[11px] uppercase tracking-widest text-theme-accent font-bold mb-1">Delivery Details</h3>
                    <input
                      type="text"
                      placeholder="Recipient Name"
                      value={deliveryName}
                      onChange={(e) => setDeliveryName(e.target.value)}
                      className="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm focus:border-theme-accent focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Phone Number"
                      value={deliveryPhone}
                      onChange={(e) => setDeliveryPhone(e.target.value)}
                      className="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm focus:border-theme-accent focus:outline-none"
                    />
                    <textarea
                      placeholder="Delivery Address"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm focus:border-theme-accent focus:outline-none resize-none h-16"
                    />
                  </div>
                )}

                {/* Cart Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-theme-ink-dim space-y-3 opacity-30">
                      <ShoppingCart className="w-12 h-12" />
                      <p className="text-[10px] uppercase tracking-widest">No Items Selected</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="flex justify-between items-start group">
                        <div className="flex-1 pr-4">
                          <p className="font-serif text-theme-ink">{item.product.name}</p>
                          {item.modifiers?.map(m => <p key={m} className="text-[10px] text-theme-accent uppercase">• {m}</p>)}
                          <p className="text-[11px] text-theme-ink-dim mt-1">{formatCurrency(getItemPrice(item, orderType))}</p>
                        </div>
                        <div className="flex items-center gap-2 bg-theme-surface p-1 border border-theme-border rounded-md shadow-sm">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-theme-accent"><Minus className="w-3 h-3"/></button>
                          <span className="text-xs w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-theme-accent"><Plus className="w-3 h-3"/></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Checkout Controls */}
                <div className="p-6 bg-theme-surface border-t border-theme-border space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-theme-ink-dim text-[12px]">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {appliedGiftCard && (
                      <div className="flex justify-between items-center text-red-400 text-[12px] font-medium pt-1">
                        <span className="flex items-center gap-1">
                          <Gift className="w-3.5 h-3.5 animate-pulse" /> Gift Card ({appliedGiftCard.code})
                        </span>
                        <div className="flex items-center gap-2">
                          <span>-{formatCurrency(Math.min(subtotal + tax, appliedGiftCard.current_balance))}</span>
                          <button 
                            onClick={() => setAppliedGiftCard(null)} 
                            className="text-[10px] text-theme-ink-dim hover:text-red-400 transition-colors font-bold cursor-pointer px-1"
                            title="Remove Gift Card"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between text-theme-ink text-lg font-serif pt-2 border-t border-theme-border">
                      <span>Total</span>
                      <span className="text-theme-accent">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleCheckoutClick('CASH')}
                      disabled={cart.length === 0 || isProcessing}
                      className="py-4 bg-theme-surface border border-theme-border rounded-xl shadow-sm text-[10px] font-bold uppercase tracking-widest hover:border-theme-accent hover:text-theme-accent transition-all disabled:opacity-50"
                    >
                      Cash
                    </button>
                    <button
                      onClick={() => handleCheckoutClick('CARD')}
                      disabled={cart.length === 0 || isProcessing}
                      className="py-4 bg-theme-accent text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-opacity-90 shadow-[0_0_15px_rgba(197,160,89,0.25)] transition-all disabled:opacity-50"
                    >
                      Card
                    </button>
                    {BANK_TRANSFER_ENABLED && (
                    <button
                      onClick={() => handleCheckoutClick('BANK')}
                      disabled={cart.length === 0 || isProcessing}
                      className="py-4 bg-theme-surface border border-theme-border rounded-xl shadow-sm text-[10px] font-bold uppercase tracking-widest hover:border-theme-accent hover:text-theme-accent transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Landmark className="w-3.5 h-3.5" />
                      Transfer
                    </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        if (activeTable) {
                          setHoldName(activeTable);
                          handleHoldOrderSubmit(activeTable);
                        } else {
                          setIsHoldPromptOpen(true);
                        }
                      }}
                      disabled={cart.length === 0 || isProcessing}
                      className="flex-1 py-3 border border-dashed border-theme-border text-[9px] uppercase tracking-widest text-theme-ink-dim hover:border-theme-accent hover:text-theme-accent transition-all"
                    >
                      {activeTable ? 'Update Kitchen' : 'Hold / Send'}
                    </button>
                    <button 
                      onClick={() => {
                        setLastOrder({
                          id: activeOrderId || 'PRE-BILL',
                          items: [...cart],
                          subtotal,
                          tax,
                          total,
                          paymentMethod: 'PRE-BILL' as any,
                          timestamp: new Date(),
                          customerName: currentCustomer?.name || activeTable || undefined
                        });
                        setIsReceiptOpen(true);
                      }}
                      disabled={cart.length === 0 || isProcessing}
                      className="flex-1 py-3 border border-theme-border text-[9px] uppercase tracking-widest hover:border-theme-accent transition-all text-theme-ink"
                    >
                      Print Bill
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Floating Checkout Bar */}
          {cart.length > 0 && !isMobileCartOpen && (
            <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-theme-surface border-t border-theme-border p-3 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
              <div className="min-w-0">
                <p className="text-[10px] text-theme-ink-dim uppercase tracking-wider">{cart.length} items</p>
                <p className="font-serif text-lg text-theme-accent">{formatCurrency(total)}</p>
              </div>
              <button
                onClick={() => setIsMobileCartOpen(true)}
                className="px-6 py-3 bg-theme-accent text-black text-[11px] font-bold uppercase tracking-widest rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.25)]"
              >
                View Cart
              </button>
            </div>
          )}
        </div>
      )}

      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => !isBankProcessing && setIsBankModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-theme-border bg-theme-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl text-theme-ink">Bank Transfer</h3>
              <button onClick={() => !isBankProcessing && setIsBankModalOpen(false)} className="text-theme-ink-dim hover:text-theme-ink" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-2 rounded-xl border border-theme-border bg-theme-bg p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-theme-ink-dim">Bank</span>
                <span className="font-semibold text-theme-ink">{BANK_INFO.bank}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-theme-ink-dim">Account</span>
                <span className="font-mono font-bold tracking-wider text-theme-accent">{BANK_INFO.accountNo}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="shrink-0 text-theme-ink-dim">Name</span>
                <span className="text-right text-theme-ink">{BANK_INFO.accountName}</span>
              </div>
              <div className="flex items-center justify-between border-t border-theme-border pt-2">
                <span className="text-theme-ink-dim">Amount</span>
                <span className="font-serif text-lg text-theme-accent">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-[10px] uppercase tracking-widest text-theme-ink-dim">Transfer slip *</div>
              {bankSlipPreview ? (
                <div className="flex items-center gap-3">
                  <img src={bankSlipPreview} alt="Slip preview" className="h-20 w-16 rounded-lg border border-theme-border object-cover" />
                  <div className="flex-1 text-xs text-theme-ink-dim">
                    {bankSlip?.name}
                    <button
                      type="button"
                      onClick={() => {
                        setBankSlip(null);
                        setBankSlipPreview('');
                      }}
                      className="block text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-theme-border py-4 text-xs text-theme-ink-dim transition-colors hover:border-theme-accent hover:text-theme-accent">
                  <Upload className="w-4 h-4" />
                  Attach transfer slip
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setBankSlip(f);
                      if (f.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = () => setBankSlipPreview(String(reader.result));
                        reader.readAsDataURL(f);
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsBankModalOpen(false)}
                disabled={isBankProcessing}
                className="py-3 rounded-xl border border-theme-border text-xs font-bold uppercase tracking-widest text-theme-ink-dim hover:text-theme-ink disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={processBankOrder}
                disabled={!bankSlip || isBankProcessing}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-theme-accent text-black text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
              >
                {isBankProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
