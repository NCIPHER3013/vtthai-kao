import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShoppingBag, Minus, Plus, X, Loader2, ArrowLeft, Clock, MapPin, MessageSquare, AlertTriangle, RefreshCw, CheckCircle2, User, Star } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Product, CartItem, CustomizationOption } from '../../types';
import { fetchCustomerByEmail, createCustomer } from '../../lib/api/customers';
import { calculateProductAvailability } from '../../lib/inventoryUtils';
import { placeWebstoreOrder, fetchWebstoreOrderStatus } from '../../lib/api/onlineOrders';
import { fetchWebstoreBootstrap } from '../../lib/api/products';
import { fetchTableByToken, fetchActiveSession, createTableSession } from '../../lib/api/tables';
import { SubRecipeIngredient } from '../../types';
import { isMeatGroup } from '../../lib/meatOptions';
interface TableInfo {
  id: string;
  table_number: string;
  zone: string;
  capacity: number;
}

interface SessionInfo {
  id: string;
  session_token: string;
  table_id: string;
  order_id: string | null;
  status: string;
}

export default function WebstorePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tokenParam = searchParams.get('t');
  const legacyTableParam = searchParams.get('table');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [subRecipeIngredients, setSubRecipeIngredients] = useState<SubRecipeIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Table Session State
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isTableConfirmed, setIsTableConfirmed] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);
  const [isAddingToExisting, setIsAddingToExisting] = useState(false);

  // Order Type (Pricing Tier)
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('takeaway');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckout, setIsCheckout] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState<string | null>(null);

  // Customization Modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, CustomizationOption[]>>({});
  const [selectedQty, setSelectedQty] = useState(1);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Checkout Form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNote, setOrderNote] = useState('');

  // Auth Flow
  const [authMode, setAuthMode] = useState<'initial' | 'login_email' | 'register' | 'authenticated' | 'guest'>('initial');
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authErrorText, setAuthErrorText] = useState('');
  const [loggedInCustomer, setLoggedInCustomer] = useState<{ id: string, name: string, email?: string, points: number } | null>(null);

  // Settings
  const [storeName, setStoreName] = useState('Vermont Thai');
  const [taxRate, setTaxRate] = useState(0.10);

  const isTableMode = !!(tableInfo && isTableConfirmed);

  useEffect(() => {
    if (tokenParam) {
      validateAndInitSession(tokenParam);
    } else if (legacyTableParam) {
      // Backward compat: old ?table=N URL
      setTableInfo({ id: '', table_number: legacyTableParam, zone: '', capacity: 0 });
      setIsTableConfirmed(true);
      setOrderType('dine_in');
      fetchData();
    } else {
      fetchData();
    }
  }, [tokenParam]);

  async function validateAndInitSession(token: string) {
    setIsValidatingToken(true);
    setTokenError(null);
    try {
      // 1. Find table by token
      const found = await fetchTableByToken(token);
      const tableData = found && found.is_active !== false ? found : null;

      if (!tableData) {
        setTokenError('Invalid or expired QR code. Please scan the QR code at your table.');
        setIsLoading(false);
        setIsValidatingToken(false);
        return;
      }

      setTableInfo({ id: tableData.id, table_number: tableData.table_number, zone: tableData.zone, capacity: tableData.capacity });
      setOrderType('dine_in');

      // 2. Check for existing active session for this table
      const existingSession = await fetchActiveSession(tableData.id);

      if (existingSession) {
        setSessionInfo({
          id: existingSession.id,
          session_token: existingSession.session_token,
          table_id: existingSession.table_id,
          order_id: existingSession.order_id ?? null,
          status: existingSession.status,
        });
        if (existingSession.order_id) {
          // Check if the existing order is still active (pending/preparing)
          const status = await fetchWebstoreOrderStatus(existingSession.order_id);
          if (status && ['pending', 'preparing'].includes(status)) {
            setExistingOrderId(existingSession.order_id);
          }
        }
        setIsTableConfirmed(true);
      }

      await fetchData();
    } catch (err: any) {
      console.error('Token validation error:', err);
      setTokenError('Failed to validate QR code. Please try again.');
    } finally {
      setIsValidatingToken(false);
    }
  }

  async function createSession(tableId: string) {
    const sessionToken = crypto.randomUUID();
    const created = await createTableSession({ table_id: tableId, session_token: sessionToken });
    const data: SessionInfo = {
      id: created.id,
      session_token: created.session_token,
      table_id: created.table_id,
      order_id: created.order_id ?? null,
      status: created.status,
    };
    setSessionInfo(data);
    return data;
  }

  async function handleConfirmTable() {
    if (!tableInfo) return;
    setIsValidatingToken(true);
    try {
      if (!sessionInfo) {
        await createSession(tableInfo.id);
      }
      setIsTableConfirmed(true);
    } catch (err: any) {
      console.error('Session creation error:', err);
      setTokenError('Failed to create session. The table_sessions table may not exist yet. Please run the migration SQL.');
    } finally {
      setIsValidatingToken(false);
    }
  }

  async function handleLoginEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!authEmail.trim() || !authName.trim()) return;
    setIsAuthenticating(true);
    setAuthErrorText('');
    try {
      const customer = await fetchCustomerByEmail(authEmail.trim().toLowerCase());
      if (customer) {
        setLoggedInCustomer({ id: customer.id, name: customer.name, email: customer.email ?? undefined, points: customer.points });
        setCustomerName(customer.name);
        setAuthMode('authenticated');
        if (tableInfo && !isTableConfirmed) await handleConfirmTable();
      } else {
        setAuthErrorText('Email not found. Please register first.');
      }
    } catch (err: any) {
      setAuthErrorText(err.userMessage || err.message || 'Login failed');
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!authName.trim() || !authEmail.trim()) return;
    setIsAuthenticating(true);
    setAuthErrorText('');
    try {
      const customer = await createCustomer({ name: authName.trim(), email: authEmail.trim().toLowerCase(), phone: authPhone.trim() || undefined });
      setLoggedInCustomer({ id: customer.id, name: customer.name, email: customer.email ?? undefined, points: customer.points });
      setCustomerName(customer.name);
      setAuthMode('authenticated');
      if (tableInfo && !isTableConfirmed) await handleConfirmTable();
    } catch (err: any) {
      setAuthErrorText(err.userMessage || err.message || 'Registration failed');
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleGuest() {
    setAuthMode('guest');
    if (tableInfo && !isTableConfirmed) await handleConfirmTable();
  }

  async function fetchData() {
    setIsLoading(true);
    try {
      const data = await fetchWebstoreBootstrap();
      setProducts(data.products as Product[]);
      setCategories(data.categories);
      setRecipes(data.recipes);
      setStockItems(data.stock_items);
      setSubRecipeIngredients(data.sub_recipe_ingredients as SubRecipeIngredient[]);
      if (data.settings?.store_name) setStoreName(data.settings.store_name);
      if (data.settings?.tax_rate !== undefined) setTaxRate(Number(data.settings.tax_rate));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const { productAvailability, variantAvailability } = useMemo(() => {
    return calculateProductAvailability(products, recipes, stockItems, subRecipeIngredients);
  }, [products, recipes, stockItems, subRecipeIngredients]);

  const getEffectivePriceForOption = (option: CustomizationOption) => {
    if (orderType === 'delivery' && option.price_delivery !== undefined) return option.price_delivery;
    if (orderType === 'takeaway' && option.price_takeaway !== undefined) return option.price_takeaway;
    return option.price || 0;
  };

  const getEffectivePrice = (product: Product) => {
    if (orderType === 'delivery' && product.price_delivery !== undefined) return product.price_delivery;
    if (orderType === 'takeaway' && product.price_takeaway !== undefined) return product.price_takeaway;
    return product.price;
  };

  const dynamicCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (activeCategory !== 'All') {
      filtered = filtered.filter(p => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.middle_name && p.middle_name.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [activeCategory, products, searchQuery]);

  const { subtotal, tax, total } = useMemo(() => {
    const sub = cart.reduce((sum, item) => sum + (item.effectivePrice || item.product.price) * item.quantity, 0);
    const tx = sub * taxRate;
    return { subtotal: sub, tax: tx, total: sub + tx };
  }, [cart, taxRate]);

  const handleProductClick = (product: Product) => {
    if (!product.customizations || product.customizations.length === 0) {
      addToCart(product);
      return;
    }

    const initialOpts: Record<string, CustomizationOption[]> = {};
    product.customizations.forEach(g => {
      initialOpts[g.name] = [];
      if (g.required && g.options.length === 1) {
        initialOpts[g.name] = [g.options[0]];
      }
    });

    setSelectedProduct(product);
    setSelectedOptions(initialOpts);
    setSelectedQty(1);
    setProductModalOpen(true);
  };

  const toggleOption = (groupName: string, option: CustomizationOption, multiple: boolean) => {
    setSelectedOptions(prev => {
      const current = prev[groupName] || [];
      if (!multiple) {
        return { ...prev, [groupName]: [option] };
      } else {
        const isSelected = current.find(o => o.name === option.name);
        if (isSelected) {
          return { ...prev, [groupName]: current.filter(o => o.name !== option.name) };
        } else {
          return { ...prev, [groupName]: [...current, option] };
        }
      }
    });
  };

  const addToCart = (product: Product, options?: Record<string, CustomizationOption[]>, qty: number = 1) => {
    let basePrice = getEffectivePrice(product);
    let optionsArr: { group: string, option: CustomizationOption }[] = [];

    if (options) {
      Object.entries(options).forEach(([groupName, groupOptions]) => {
        groupOptions.forEach(opt => {
          optionsArr.push({ group: groupName, option: opt });
          basePrice += getEffectivePriceForOption(opt);
        });
      });
    }

    setCart(prev => {
      const existingMatch = prev.find(item => {
        if (item.product.id !== product.id) return false;
        const storedOpts = JSON.stringify(item.selectedOptions || []);
        const newOpts = JSON.stringify(optionsArr || []);
        return storedOpts === newOpts;
      });

      if (existingMatch) {
        return prev.map(item => item.id === existingMatch.id ? { ...item, quantity: item.quantity + qty } : item);
      }

      return [...prev, {
        id: Math.random().toString(36).substring(2, 9),
        product,
        quantity: qty,
        selectedOptions: optionsArr,
        effectivePrice: basePrice,
        orderType: orderType
      }];
    });

    setProductModalOpen(false);
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === cartItemId) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const submitOrder = async () => {
    if (isTableMode) {
      // Table mode: no name/email required
    } else if (!loggedInCustomer && (!customerName || !customerPhone)) {
      alert("Please enter both Name and Email.");
      return;
    }

    setIsProcessing(true);

    const isAddToExisting = !!(existingOrderId && isAddingToExisting);
    const orderId = isAddToExisting ? existingOrderId! : crypto.randomUUID();

    let assignedCustomerId: string | null = loggedInCustomer?.id || null;
    let finalCustomerName = isTableMode ? `Table ${tableInfo!.table_number}` : (loggedInCustomer?.name || customerName);

    if (!assignedCustomerId && customerPhone) {
      try {
        const existC = await fetchCustomerByEmail(customerPhone.trim().toLowerCase());
        if (existC) {
          assignedCustomerId = existC.id;
        } else {
          const newC = await createCustomer({ name: customerName, email: customerPhone.trim().toLowerCase() });
          if (newC) assignedCustomerId = newC.id;
        }
      } catch (e) { console.error('Customer bind error', e); }
    }

    try {
      const orderItems = cart.map((item, idx) => {
        const itemModifiers = item.selectedOptions?.map(opt => `${opt.group}: ${opt.option.name}`) || [];
        return {
          product_id: item.product.id,
          quantity: item.quantity,
          note: idx === 0 && orderNote ? orderNote : null,
          modifiers: itemModifiers
        };
      });

      // Server recomputes prices/totals and attaches the order to the table session
      const placed = await placeWebstoreOrder({
        orderId,
        orderType,
        paymentMethod,
        customerId: assignedCustomerId,
        customerName: finalCustomerName,
        sessionId: sessionInfo?.id ?? null,
        tableNumber: isTableMode && !sessionInfo ? tableInfo!.table_number : null,
        addToExisting: isAddToExisting,
        items: orderItems
      });
      const billId = placed?.order_id || orderId;

      if (sessionInfo && !sessionInfo.order_id) {
        setSessionInfo(prev => prev ? { ...prev, order_id: billId } : null);
      }

      // Mark adding to existing as done
      if (isAddToExisting) {
        setIsAddingToExisting(false);
      }

      // If adding to existing, don't clear cart completely - just show confirmation
      if (isAddToExisting) {
        setOrderComplete(billId);
        setCart([]);
        setIsCartOpen(false);
        setIsCheckout(false);
        setTimeout(() => {
          setOrderComplete(null);
        }, 4000);
      } else {
        setOrderComplete(billId);
        setExistingOrderId(billId);
        setCart([]);
        setIsCartOpen(false);
        setIsCheckout(false);
      }

    } catch (e: any) {
      console.error(e);
      alert('Failed to place order: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddMoreItems = () => {
    setOrderComplete(null);
    setCart([]);
    setIsCartOpen(false);
    setIsCheckout(false);
    setIsAddingToExisting(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Token validation loading screen
  if (isValidatingToken) {
    return (
      <div className="min-h-screen bg-theme-bg flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-theme-accent mb-4" />
        <p className="text-sm text-theme-ink-dim">Validating QR code...</p>
      </div>
    );
  }

  // Token error screen
  if (tokenError && tokenParam) {
    return (
      <div className="min-h-screen bg-theme-bg flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-2xl text-theme-ink mb-2">QR Code Error</h1>
        <p className="text-theme-ink-dim mb-8 max-w-sm">{tokenError}</p>
        <button
          onClick={() => navigate('/store')}
          className="bg-transparent border border-theme-border text-theme-ink px-8 py-3 text-xs uppercase tracking-wider font-semibold hover:border-theme-accent hover:text-theme-accent transition-colors"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  // Welcome / Authentication Screen
  if (authMode === 'initial' || authMode === 'login_email' || authMode === 'register') {
    return (
      <div className="min-h-screen bg-theme-bg bg-[url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Dark overlay for glassmorphism */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        
        <div className="relative z-10 w-full max-w-md bg-theme-surface/80 backdrop-blur-md border border-theme-border/50 p-8 shadow-2xl rounded-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-16 h-16 bg-theme-accent/20 text-theme-accent rounded-full flex items-center justify-center mx-auto mb-6">
            {tableInfo ? <MapPin className="w-8 h-8" /> : <ShoppingBag className="w-8 h-8" />}
          </div>
          
          <h1 className="font-serif text-4xl text-theme-ink mb-2">{storeName}</h1>
          
          {tableInfo && (
            <div className="mb-6">
              <p className="text-theme-ink-dim mb-1 text-sm uppercase tracking-widest">You are at</p>
              <div className="inline-block bg-theme-bg/50 border border-theme-accent/30 px-6 py-2 rounded-sm shadow-inner">
                <p className="font-serif text-3xl text-theme-accent">{tableInfo.table_number}</p>
                {tableInfo.zone && <p className="text-xs text-theme-ink-dim mt-1">{tableInfo.zone}</p>}
              </div>
            </div>
          )}

          {existingOrderId && tableInfo && (
            <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-sm">
              <p className="text-sm text-emerald-400 font-semibold tracking-wider">Active order detected at this table.</p>
            </div>
          )}

          <div className="space-y-6 mt-8">
            {authMode === 'initial' && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                <p className="text-sm text-theme-ink-dim italic mb-2">Login to earn points & rewards</p>
                <button
                  onClick={() => setAuthMode('login_email')}
                  className="w-full bg-theme-accent text-black px-8 py-3 text-sm uppercase tracking-wider font-semibold hover:bg-theme-accent/90 transition-all hover:scale-[1.02] shadow-lg shadow-theme-accent/20"
                >
                  Login
                </button>
                <button
                  onClick={() => setAuthMode('register')}
                  className="w-full bg-transparent border border-theme-accent text-theme-accent px-8 py-3 text-sm uppercase tracking-wider font-semibold hover:bg-theme-accent/10 transition-all"
                >
                  Register
                </button>
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-theme-border/50"></div>
                  <span className="shrink-0 px-4 text-xs text-theme-ink-dim uppercase tracking-widest">Or</span>
                  <div className="flex-grow border-t border-theme-border/50"></div>
                </div>
                <button
                  onClick={handleGuest}
                  className="w-full bg-transparent border border-theme-border text-theme-ink px-8 py-3 text-sm uppercase tracking-wider font-semibold hover:border-theme-accent hover:text-theme-accent transition-all"
                >
                  {existingOrderId ? 'Add More Items' : 'Order as Guest'}
                </button>
                {tableInfo && (
                  <button
                    onClick={() => navigate('/store')}
                    className="mt-4 text-xs text-theme-ink-dim hover:text-theme-ink underline underline-offset-4 decoration-theme-border transition-colors"
                  >
                    Not your table?
                  </button>
                )}
              </div>
            )}

            {authMode === 'login_email' && (
              <form onSubmit={handleLoginEmail} className="flex flex-col gap-4 animate-in slide-in-from-right-4 duration-300">
                <p className="text-sm text-theme-ink-dim mb-2 text-left">Enter your name and email:</p>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  className="w-full bg-theme-bg/80 border border-theme-border p-4 text-theme-ink focus:outline-none focus:border-theme-accent text-center text-lg placeholder:text-sm"
                  autoFocus
                />
                <input
                  type="email"
                  placeholder="e.g. name@email.com"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  className="w-full bg-theme-bg/80 border border-theme-border p-4 text-theme-ink focus:outline-none focus:border-theme-accent text-center text-lg placeholder:text-sm"
                />
                {authErrorText && <p className="text-red-400 text-xs">{authErrorText}</p>}
                <button
                  type="submit"
                  disabled={isAuthenticating || !authEmail.trim() || !authName.trim()}
                  className="w-full bg-theme-accent text-black px-8 py-3 text-sm uppercase tracking-wider font-semibold hover:bg-theme-accent/90 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isAuthenticating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('initial'); setAuthErrorText(''); }}
                  className="text-xs text-theme-ink-dim hover:text-theme-ink uppercase tracking-wider mt-2"
                >
                  Back
                </button>
              </form>
            )}

            {authMode === 'register' && (
              <form onSubmit={handleRegister} className="flex flex-col gap-4 animate-in slide-in-from-right-4 duration-300">
                <p className="text-sm text-theme-ink-dim mb-2 text-left">Create your account:</p>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  className="w-full bg-theme-bg/80 border border-theme-border p-4 text-theme-ink focus:outline-none focus:border-theme-accent text-center text-lg placeholder:text-sm"
                  autoFocus
                />
                <input
                  type="email"
                  placeholder="e.g. name@email.com"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  className="w-full bg-theme-bg/80 border border-theme-border p-4 text-theme-ink focus:outline-none focus:border-theme-accent text-center text-lg placeholder:text-sm"
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={authPhone}
                  onChange={e => setAuthPhone(e.target.value)}
                  className="w-full bg-theme-bg/80 border border-theme-border p-4 text-theme-ink focus:outline-none focus:border-theme-accent text-center text-lg tracking-widest placeholder:tracking-normal placeholder:text-sm font-mono"
                />
                {authErrorText && <p className="text-red-400 text-xs">{authErrorText}</p>}
                <button
                  type="submit"
                  disabled={isAuthenticating || !authName.trim() || !authEmail.trim()}
                  className="w-full bg-theme-accent text-black px-8 py-3 text-sm uppercase tracking-wider font-semibold hover:bg-theme-accent/90 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isAuthenticating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('initial'); setAuthErrorText(''); }}
                  className="text-xs text-theme-ink-dim hover:text-theme-ink uppercase tracking-wider mt-2"
                >
                  Back
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Order confirmation overlay
  if (orderComplete && isAddingToExisting) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
        <div className="bg-theme-bg border border-theme-border p-8 max-w-sm w-full">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h2 className="font-serif text-2xl text-theme-ink mb-2">Items Added!</h2>
          <p className="text-sm text-theme-ink-dim mb-6">Your additional items have been sent to the kitchen for order <span className="text-theme-accent font-mono">#{orderComplete}</span></p>
          <button
            onClick={handleAddMoreItems}
            className="w-full bg-theme-accent text-black py-3 text-xs uppercase tracking-wider font-semibold hover:bg-opacity-90 transition-colors"
          >
            Continue Ordering
          </button>
        </div>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-theme-bg flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-3xl text-theme-ink mb-2">Order Received!</h1>
        <p className="text-theme-ink-dim mb-2">Your order <span className="text-theme-accent font-mono font-bold">#{orderComplete}</span> has been sent to the kitchen.</p>
        <p className="text-sm text-theme-ink-dim mb-8">
          Please wait for your order at your table or pick up counter.
        </p>
        {isTableMode ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleAddMoreItems}
              className="bg-theme-accent text-black px-8 py-3 text-xs uppercase tracking-wider font-semibold hover:bg-opacity-90 transition-colors"
            >
              Add More Items
            </button>
            <button
              onClick={() => { setOrderComplete(null); setExistingOrderId(null); setTableInfo(null); setSessionInfo(null); setSearchParams({}); window.scrollTo(0, 0); }}
              className="bg-transparent border border-theme-border text-theme-ink px-8 py-3 text-xs uppercase tracking-wider font-semibold hover:border-theme-accent hover:text-theme-accent transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setOrderComplete(null); window.scrollTo(0, 0); }}
            className="bg-transparent border border-theme-border text-theme-ink px-8 py-3 text-xs uppercase tracking-wider font-semibold hover:border-theme-accent hover:text-theme-accent transition-colors"
          >
            Start New Order
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-bg flex flex-col font-sans">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-theme-bg/80 backdrop-blur-xl border-b border-theme-border shadow-sm">
        <div className="max-w-3xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isTableMode && (
              <button
                onClick={() => navigate('/admin')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-theme-surface border border-theme-border text-theme-ink-dim hover:text-theme-accent transition-colors"
                title="Back to Admin Settings"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="font-serif italic text-2xl text-theme-ink">{storeName}</h1>
              <p className="text-[10px] uppercase tracking-widest text-theme-accent">
                {isTableMode ? `${tableInfo!.zone ? tableInfo!.zone + ' - ' : ''}${tableInfo!.table_number}` : 'Online Order'}
              </p>
            </div>
          </div>

          {!isTableMode && (
            <div className="flex bg-theme-surface border border-theme-border rounded-full p-1 mx-4 hidden sm:flex">
              <button
                onClick={() => setOrderType('takeaway')}
                className={`text-[10px] uppercase font-bold tracking-wider px-4 py-1.5 rounded-full transition-colors ${orderType === 'takeaway' ? 'bg-theme-accent text-black shadow-sm' : 'text-theme-ink-dim hover:text-theme-ink'}`}
              >
                Pickup
              </button>
              <button
                onClick={() => setOrderType('delivery')}
                className={`text-[10px] uppercase font-bold tracking-wider px-4 py-1.5 rounded-full transition-colors ${orderType === 'delivery' ? 'bg-theme-accent text-black shadow-sm' : 'text-theme-ink-dim hover:text-theme-ink'}`}
              >
                Delivery
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            {loggedInCustomer ? (
              <div className="hidden sm:flex items-center gap-2 bg-theme-accent/10 border border-theme-accent/30 rounded-full px-3 py-1.5">
                <User className="w-3 h-3 text-theme-accent" />
                <span className="text-[11px] font-semibold text-theme-accent truncate max-w-[80px]">{loggedInCustomer.name}</span>
                <div className="flex items-center gap-1 bg-theme-accent/20 rounded-full px-2 py-0.5">
                  <Star className="w-2.5 h-2.5 text-theme-accent fill-theme-accent" />
                  <span className="text-[10px] font-bold text-theme-accent">{loggedInCustomer.points}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => navigate('/bot')}
                className="relative p-2 text-theme-ink hover:text-theme-accent transition-colors hidden sm:flex items-center gap-2 border border-theme-border rounded-full px-4 text-xs font-semibold uppercase tracking-wider"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Order via Chat</span>
              </button>
            )}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-theme-ink hover:text-theme-accent transition-colors"
            >
              <ShoppingBag className="w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-theme-accent text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Existing order banner (for table mode with active order) */}
      {isTableMode && existingOrderId && !orderComplete && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20">
          <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                Active Order #{existingOrderId}
              </span>
            </div>
            <button
              onClick={() => { setIsAddingToExisting(true); setIsCartOpen(true); }}
              className="text-xs text-emerald-400 border border-emerald-500/30 px-3 py-1 hover:bg-emerald-500/10 transition-colors font-semibold uppercase tracking-wider"
            >
              Add Items
            </button>
          </div>
        </div>
      )}

      {/* Categories & Search */}
      <div className="bg-theme-surface border-b border-theme-border sticky top-20 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="w-full flex space-x-6 overflow-x-auto items-center flex-1 pb-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-theme-bg [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-theme-accent/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-theme-accent transition-colors">
            <button
              onClick={() => setActiveCategory('All')}
              className={`text-xs uppercase tracking-widest font-semibold whitespace-nowrap transition-colors decoration-2 underline-offset-8 shrink-0 ${activeCategory === 'All' ? 'text-theme-accent underline' : 'text-theme-ink-dim hover:text-theme-ink'
                }`}
            >
              All Menu
            </button>
            {dynamicCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-xs uppercase tracking-widest font-semibold whitespace-nowrap transition-colors decoration-2 underline-offset-8 shrink-0 ${activeCategory === cat ? 'text-theme-accent underline' : 'text-theme-ink-dim hover:text-theme-ink'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          {/* Search Bar */}
          <div className="relative shrink-0 w-full sm:w-56">
            <input 
              type="text" 
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-theme-bg border border-theme-border text-theme-ink text-sm rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-theme-accent transition-colors"
            />
            <svg className="w-4 h-4 text-theme-ink-dim absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-ink-dim hover:text-theme-ink">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 pb-32">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-theme-ink-dim text-sm">
            No products match your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filteredProducts.map(product => {
              const isAvailable = productAvailability[product.id] !== false;
              
              const orderable = getEffectivePrice(product) > 0;
              return (
              <div
                key={product.id}
                className={`relative bg-theme-surface/60 backdrop-blur-sm border border-theme-border/50 rounded-xl flex flex-col justify-between transition-all duration-300 group overflow-hidden ${
                  !isAvailable ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:border-theme-accent/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] cursor-pointer'
                }`}
                onClick={() => isAvailable && orderable && handleProductClick(product)}
              >
                {product.image_url ? (
                  <div className="relative h-48 overflow-hidden bg-black/20">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-theme-surface/90 via-transparent to-transparent opacity-80" />
                  </div>
                ) : (
                  <div className="relative h-32 overflow-hidden bg-theme-bg/50 flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 text-theme-ink-dim/30" />
                  </div>
                )}
                
                {!isAvailable && (
                  <div className="absolute inset-0 bg-theme-surface/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center pointer-events-none">
                    <div className="bg-red-500/90 text-white px-3 py-1 rounded-sm text-xs font-bold tracking-widest uppercase border border-red-400 shadow-lg transform -rotate-12">
                      Sold Out
                    </div>
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col justify-between relative z-10">
                  <div>
                    <div className="flex items-start justify-between mb-2 gap-4">
                      <h3 className="font-serif text-lg text-theme-ink leading-tight group-hover:text-theme-accent transition-colors">{product.name}</h3>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-sm text-theme-accent font-mono font-bold">{orderable ? formatCurrency(getEffectivePrice(product)) : 'Included with Lunch Combo'}</span>
                        {product.price_takeaway !== undefined && product.price_takeaway !== product.price && (
                          <span className="text-[10px] text-theme-ink-dim uppercase mt-0.5">Base {formatCurrency(product.price)}</span>
                        )}
                      </div>
                    </div>
                    {product.middle_name && <p className="text-xs text-theme-ink-dim/80 line-clamp-2">{product.middle_name}</p>}
                  </div>

                  {orderable && (
                  <div className="pt-4 mt-4 border-t border-theme-border/30 flex justify-end">
                    <button
                      onClick={e => { e.stopPropagation(); handleProductClick(product); }}
                      className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-theme-ink hover:text-black bg-theme-bg/50 hover:bg-theme-accent px-5 py-2.5 rounded-full border border-theme-border hover:border-theme-accent transition-all duration-300"
                    >
                      <Plus className="w-3 h-3" /> Add to Order
                    </button>
                  </div>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}
      </main>

      {/* Floating Checkout Button */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-6 left-0 right-0 px-6 z-40 animate-in slide-in-from-bottom-10 pointer-events-none">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-theme-accent text-black py-4 px-6 flex items-center justify-between font-semibold tracking-wider hover:bg-opacity-90 shadow-2xl pointer-events-auto"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-black text-theme-accent rounded text-[11px] flex items-center justify-center">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
                <span className="text-sm uppercase">{isAddingToExisting ? 'Add to Order' : 'View Order'}</span>
              </div>
              <span className="font-mono">+{formatCurrency(total)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in cursor-pointer" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-theme-bg border-l border-theme-border h-full flex flex-col animate-in slide-in-from-right duration-300">

            <div className="flex items-center justify-between p-6 border-b border-theme-border bg-theme-surface">
              <div className="flex items-center gap-3">
                {isCheckout && (
                  <button onClick={() => setIsCheckout(false)} className="text-theme-ink-dim hover:text-theme-ink">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <h2 className="font-serif text-xl text-theme-ink">{isCheckout ? 'Checkout' : 'Your Order'}</h2>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="text-theme-ink-dim hover:text-theme-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!isCheckout ? (
                <>
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-theme-ink-dim space-y-4">
                      <ShoppingBag className="w-12 h-12 opacity-20" />
                      <p className="text-[11px] uppercase tracking-[1px]">Your bag is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {cart.map(item => (
                        <div key={item.id} className="flex justify-between border-b border-theme-border/50 pb-6 last:border-0 last:pb-0">
                          <div className="flex-1 pr-4">
                            <div className="flex items-center gap-3 mb-1">
                              {item.product.image_url && (
                                <img src={item.product.image_url} alt={item.product.name} className="w-10 h-10 object-cover border border-theme-border rounded-sm shrink-0" />
                              )}
                              <h4 className="font-serif text-theme-ink">{item.product.name}</h4>
                            </div>
                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                              <div className="mb-2 text-xs text-theme-ink-dim space-y-0.5">
                                {item.selectedOptions.map((opt, i) => (
                                  <div key={i}>+ {opt.option.name} {(getEffectivePriceForOption(opt.option)) > 0 && `(${formatCurrency(getEffectivePriceForOption(opt.option))})`}</div>
                                ))}
                              </div>
                            )}
                            <p className="text-sm text-theme-ink-dim font-mono mb-3">{formatCurrency((item.effectivePrice || item.product.price))}</p>

                            <div className="flex items-center gap-3 bg-theme-surface border border-theme-border w-fit">
                              <button onClick={() => updateQuantity(item.id, -1)} className="p-2 text-theme-ink-dim hover:text-theme-accent">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-4 text-center text-xs font-mono">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="p-2 text-theme-ink-dim hover:text-theme-accent">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="text-right font-mono text-sm text-theme-ink">
                            {formatCurrency((item.effectivePrice || item.product.price) * item.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6 animate-in fade-in">

                  <div className="bg-theme-surface border border-theme-border p-4 flex gap-4">
                    <div className="w-10 h-10 bg-theme-bg border border-theme-border flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-theme-accent" />
                    </div>
                    <div>
                      <h4 className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-1">{isTableMode ? 'Dine-in at' : 'Pick up from'}</h4>
                      <p className="text-sm text-theme-ink">{isTableMode ? tableInfo!.table_number : storeName}</p>
                    </div>
                  </div>

                  <div className="bg-theme-surface border border-theme-border p-4 flex gap-4">
                    <div className="w-10 h-10 bg-theme-bg border border-theme-border flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-theme-accent" />
                    </div>
                    <div>
                      <h4 className="text-[11px] uppercase tracking-wider text-theme-ink-dim mb-1">Estimated Prep Time</h4>
                      <p className="text-sm text-theme-ink">15 - 20 minutes</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-theme-border">
                    <h3 className="font-serif text-lg text-theme-ink text-center mb-4">
                      {isTableMode ? "Order Details" : "Your Details"}
                    </h3>

                    {!isTableMode && !loggedInCustomer && (
                      <>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-theme-ink-dim mb-2">Name *</label>
                          <input
                            type="text"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            className="w-full bg-theme-surface border border-theme-border p-4 text-sm focus:outline-none focus:border-theme-accent transition-colors"
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-theme-ink-dim mb-2">Email *</label>
                          <input
                            type="email"
                            value={customerPhone}
                            onChange={e => setCustomerPhone(e.target.value)}
                            className="w-full bg-theme-surface border border-theme-border p-4 text-sm focus:outline-none focus:border-theme-accent transition-colors"
                            placeholder="e.g. name@email.com"
                          />
                        </div>
                      </>
                    )}

                    {!isTableMode && loggedInCustomer && (
                      <div className="bg-theme-accent/5 border border-theme-accent/20 rounded-sm p-4 flex items-center gap-3">
                        <User className="w-5 h-5 text-theme-accent shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-theme-ink">{loggedInCustomer.name}</p>
                          {loggedInCustomer.email && <p className="text-xs text-theme-ink-dim">{loggedInCustomer.email}</p>}
                        </div>
                      </div>
                    )}



                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-theme-ink-dim mb-2">Order Notes (Optional)</label>
                      <textarea
                        value={orderNote}
                        onChange={e => setOrderNote(e.target.value)}
                        className="w-full bg-theme-surface border border-theme-border p-4 text-sm focus:outline-none focus:border-theme-accent transition-colors resize-none h-24"
                        placeholder="Any special requests..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-theme-border bg-theme-surface p-6 shrink-0">
                <div className="space-y-3 mb-6 border-b border-theme-border pb-6">
                  <div className="flex justify-between text-sm text-theme-ink-dim">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatCurrency(subtotal)}</span>
                  </div>
                  {tax > 0 && (
                    <div className="flex justify-between text-sm text-theme-ink-dim">
                      <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
                      <span className="font-mono">{formatCurrency(tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-serif pt-3 text-theme-ink">
                    <span>{isAddingToExisting ? 'Adding' : 'Total'}</span>
                    <span className="font-mono text-theme-accent">{formatCurrency(total)}</span>
                  </div>
                </div>

                {!isCheckout ? (
                  <button
                    onClick={() => setIsCheckout(true)}
                    className="w-full bg-theme-accent text-black py-4 text-xs uppercase tracking-wider font-semibold hover:bg-opacity-90 transition-colors"
                  >
                    {isAddingToExisting ? 'Review & Add to Order' : 'Proceed to Checkout'}
                  </button>
                ) : (
                  <div className="space-y-3">
                    {!isTableMode && !loggedInCustomer && (!customerName || !customerPhone) && (
                      <p className="text-red-400 text-xs text-center font-medium">
                        * Please fill in your Name and Email to confirm order.
                      </p>
                    )}
                    <button
                      onClick={submitOrder}
                      disabled={isProcessing || (!isTableMode && !loggedInCustomer && (!customerName || !customerPhone))}
                      className="w-full bg-emerald-500 text-black py-4 text-xs uppercase tracking-wider font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isAddingToExisting ? 'Confirm Order' : 'Confirm Order'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Options Modal */}
      {productModalOpen && selectedProduct && selectedProduct.customizations && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={() => setProductModalOpen(false)}></div>
          <div className="relative bg-theme-bg w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-theme-border bg-theme-surface flex items-start justify-between shrink-0">
              <div>
                <h2 className="font-serif text-2xl text-theme-ink mb-1">{selectedProduct.name}</h2>
                <p className="text-sm text-theme-ink-dim font-mono">{formatCurrency(getEffectivePrice(selectedProduct))}</p>
              </div>
              <button onClick={() => setProductModalOpen(false)} className="text-theme-ink-dim hover:text-theme-ink p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {[...selectedProduct.customizations].sort((a, b) => Number(isMeatGroup(b)) - Number(isMeatGroup(a))).map(group => {
                const meatDef = selectedProduct.customizations!.find(g => isMeatGroup(g));
                const meatMissing = !!meatDef && (!selectedOptions[meatDef.name] || selectedOptions[meatDef.name].length === 0);
                const groupLocked = meatMissing && !isMeatGroup(group);
                return (
                <div key={group.name}>
                  <div className="flex items-baseline justify-between mb-4">
                    <h3 className="font-serif text-lg text-theme-ink">{group.name}</h3>
                    {group.required && <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Required</span>}
                    {!group.required && (
                      <span className="text-[10px] uppercase text-theme-ink-dim tracking-wider">
                        {groupLocked ? 'Choose your meat first' : 'Optional'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {group.options.map(option => {
                      const isAvailable = variantAvailability[`${selectedProduct.id}::${option.name}`] !== false && !groupLocked;
                      const isSelected = !!selectedOptions[group.name]?.find(o => o.name === option.name);
                      const optPrice = getEffectivePriceForOption(option);

                      return (
                        <label
                          key={option.name}
                          onClick={(e) => {
                            if (!isAvailable) {
                              e.preventDefault();
                              return;
                            }
                            toggleOption(group.name, option, group.multiple);
                          }}
                          className={`flex items-center justify-between p-4 border transition-colors ${
                            !isAvailable 
                              ? 'opacity-40 grayscale cursor-not-allowed border-theme-border bg-theme-surface'
                              : isSelected
                                ? 'border-theme-accent bg-theme-accent/5 cursor-pointer'
                                : 'border-theme-border bg-theme-surface hover:border-theme-accent/50 cursor-pointer'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 flex items-center justify-center border ${group.multiple ? 'rounded-sm' : 'rounded-full'
                              } ${isSelected ? 'border-theme-accent bg-theme-accent' : 'border-theme-ink-dim'}`}>
                              {isSelected && <div className={`bg-black ${group.multiple ? 'w-3 h-3' : 'w-2 h-2 rounded-full'}`} />}
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-sm ${isSelected ? 'text-theme-ink font-medium' : 'text-theme-ink-dim'}`}>
                                {option.name}
                              </span>
                              {!isAvailable && !groupLocked && (
                                <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider mt-0.5">Sold Out</span>
                              )}
                            </div>
                          </div>
                          {optPrice > 0 && isAvailable && (
                            <span className="text-sm font-mono text-theme-ink-dim">+ {formatCurrency(optPrice)}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
                );
              })}

              {/* Quantity selector */}
              <div>
                <h3 className="font-serif text-lg text-theme-ink mb-4">Quantity</h3>
                <div className="flex items-center gap-4 bg-theme-surface border border-theme-border w-fit p-1">
                  <button onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))} className="p-3 text-theme-ink-dim hover:text-theme-accent">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-mono outline-none bg-transparent">{selectedQty}</span>
                  <button onClick={() => setSelectedQty(selectedQty + 1)} className="p-3 text-theme-ink-dim hover:text-theme-accent">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 bg-theme-surface border-t border-theme-border shrink-0">
              <button
                onClick={() => {
                  let missing = false;
                  selectedProduct.customizations?.forEach(g => {
                    if (g.required && (!selectedOptions[g.name] || selectedOptions[g.name].length === 0)) {
                      missing = true;
                    }
                  });
                  if (missing) {
                    alert("Please select all required options.");
                    return;
                  }
                  addToCart(selectedProduct, selectedOptions, selectedQty);
                }}
                className="w-full bg-theme-accent text-black py-4 px-6 flex items-center justify-between text-xs uppercase tracking-wider font-semibold hover:bg-opacity-90 transition-colors"
              >
                <span>Add to Order</span>
                <span className="font-mono">
                  {formatCurrency((getEffectivePrice(selectedProduct) + (Object.values(selectedOptions) as CustomizationOption[][]).reduce((sum, groupOpts) => sum + groupOpts.reduce((s, opt) => s + getEffectivePriceForOption(opt), 0), 0)) * selectedQty)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
