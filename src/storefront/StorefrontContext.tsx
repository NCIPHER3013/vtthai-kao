import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Product } from '../lib/supabase';
import { DEFAULT_ONLINE_CONFIG, type OnlineOrderingConfig } from '../lib/onlineOrdering';
import { CartLine, SelectedOption, StoreCustomer, StoreMode, TableInfo, optionPrice, productPrice } from './types';

export interface Fulfilment {
  when: 'asap' | 'scheduled';
  scheduledFor: string | null;
}

interface StorefrontState {
  mode: StoreMode;
  setMode: (m: StoreMode) => void;
  cart: CartLine[];
  addToCart: (product: Product, options: SelectedOption[], qty: number, unitPrice: number) => void;
  changeQty: (key: string, delta: number) => void;
  clearCart: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  table: TableInfo | null;
  setTable: (t: TableInfo | null) => void;
  tableSessionId: string | null;
  setTableSessionId: (id: string | null) => void;
  existingOrderId: string | null;
  setExistingOrderId: (id: string | null) => void;
  customer: StoreCustomer | null;
  setCustomer: (c: StoreCustomer | null) => void;
  taxRate: number;
  setTaxRate: (r: number) => void;
  onlineConfig: OnlineOrderingConfig;
  setOnlineConfig: (c: OnlineOrderingConfig) => void;
  fulfilment: Fulfilment;
  setFulfilment: (f: Fulfilment) => void;
  hasLunchItem: boolean;
  count: number;
  subtotal: number;
}

const Ctx = createContext<StorefrontState | null>(null);

function repriceLine(line: CartLine, mode: StoreMode): CartLine {
  const groups = (line.product.customizations || []) as { name: string; options: any[] }[];
  const options = line.options.map((o) => {
    const opt = groups.find((g) => g.name === o.group)?.options.find((x) => x.name === o.name);
    return opt ? { ...o, price: optionPrice(opt, mode) } : o;
  });
  const unitPrice = productPrice(line.product, mode) + options.reduce((s, o) => s + o.price, 0);
  return { ...line, options, unitPrice };
}

export function StorefrontProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<StoreMode>('delivery');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [table, setTable] = useState<TableInfo | null>(null);
  const [tableSessionId, setTableSessionId] = useState<string | null>(null);
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<StoreCustomer | null>(null);
  const [taxRate, setTaxRate] = useState(0.1);
  const [onlineConfig, setOnlineConfig] = useState<OnlineOrderingConfig>(DEFAULT_ONLINE_CONFIG);
  const [fulfilment, setFulfilment] = useState<Fulfilment>({ when: 'asap', scheduledFor: null });

  const setMode = (m: StoreMode) => {
    setModeState(m);
    setCart((prev) => prev.map((l) => repriceLine(l, m)));
  };

  const addToCart = (product: Product, options: SelectedOption[], qty: number, unitPrice: number) => {
    const key = product.id + '|' + options.map((o) => o.name).sort().join(',');
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
      }
      return [...prev, { key, product, qty, options, unitPrice }];
    });
  };

  const changeQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0)
    );
  };

  const value = useMemo<StorefrontState>(
    () => ({
      mode,
      setMode,
      cart,
      addToCart,
      changeQty,
      clearCart: () => setCart([]),
      cartOpen,
      setCartOpen,
      table,
      setTable,
      tableSessionId,
      setTableSessionId,
      existingOrderId,
      setExistingOrderId,
      customer,
      setCustomer,
      taxRate,
      setTaxRate,
      onlineConfig,
      setOnlineConfig,
      fulfilment,
      setFulfilment,
      hasLunchItem: cart.some((l) => !!l.product.is_lunch_special),
      count: cart.reduce((s, l) => s + l.qty, 0),
      subtotal: cart.reduce((s, l) => s + l.unitPrice * l.qty, 0),
    }),
    [mode, cart, cartOpen, table, tableSessionId, existingOrderId, customer, taxRate, onlineConfig, fulfilment]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStorefront() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStorefront must be used within StorefrontProvider');
  return ctx;
}
