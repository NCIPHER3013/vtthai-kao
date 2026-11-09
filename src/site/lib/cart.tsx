import * as React from 'react'

export type CartItem = {
  menuId: string
  title: string
  priceAud: number
  quantity: number
  notes?: string
  imageStorageId?: string
  variantLabel?: string
  orderMode?: 'takeaway' | 'dineIn' | 'delivery'
  prices?: { takeaway: number; dineIn: number; delivery: number }
}

export type CartState = {
  items: Array<CartItem>
  orderType: 'takeaway' | 'dineIn' | 'delivery'
  customerName: string
  customerPhone: string
  deliveryAddress: string
  notes: string
}

type CartAction =
  | { type: 'addItem'; item: CartItem }
  | {
      type: 'removeItem'
      menuId: string
      variantLabel?: string
      orderMode?: string
    }
  | {
      type: 'updateQuantity'
      menuId: string
      quantity: number
      variantLabel?: string
      orderMode?: string
    }
  | {
      type: 'updateNotes'
      menuId: string
      notes: string
      variantLabel?: string
      orderMode?: string
    }
  | { type: 'setOrderType'; orderType: 'takeaway' | 'dineIn' | 'delivery' }
  | { type: 'setCustomerName'; name: string }
  | { type: 'setCustomerPhone'; phone: string }
  | { type: 'setDeliveryAddress'; address: string }
  | { type: 'setNotes'; notes: string }
  | { type: 'clearCart' }

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'addItem': {
      const existing = state.items.find(
        (i) =>
          i.menuId === action.item.menuId &&
          i.variantLabel === action.item.variantLabel &&
          i.orderMode === action.item.orderMode,
      )
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.menuId === action.item.menuId &&
            i.variantLabel === action.item.variantLabel &&
            i.orderMode === action.item.orderMode
              ? { ...i, quantity: i.quantity + action.item.quantity }
              : i,
          ),
        }
      }
      return { ...state, items: [...state.items, action.item] }
    }
    case 'removeItem':
      return {
        ...state,
        items: state.items.filter(
          (i) =>
            !(
              i.menuId === action.menuId &&
              i.variantLabel === action.variantLabel &&
              i.orderMode === action.orderMode
            ),
        ),
      }
    case 'updateQuantity': {
      const matchQty = (i: CartItem) =>
        i.menuId === action.menuId &&
        i.variantLabel === action.variantLabel &&
        i.orderMode === action.orderMode
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((i) => !matchQty(i)),
        }
      }
      return {
        ...state,
        items: state.items.map((i) =>
          matchQty(i) ? { ...i, quantity: action.quantity } : i,
        ),
      }
    }
    case 'updateNotes': {
      const matchNotes = (i: CartItem) =>
        i.menuId === action.menuId &&
        i.variantLabel === action.variantLabel &&
        i.orderMode === action.orderMode
      return {
        ...state,
        items: state.items.map((i) =>
          matchNotes(i) ? { ...i, notes: action.notes } : i,
        ),
      }
    }
    case 'setOrderType':
      return {
        ...state,
        orderType: action.orderType,
        items: state.items.map((i) => ({
          ...i,
          orderMode: action.orderType,
          priceAud: i.prices ? i.prices[action.orderType] : i.priceAud,
        })),
      }
    case 'setCustomerName':
      return { ...state, customerName: action.name }
    case 'setCustomerPhone':
      return { ...state, customerPhone: action.phone }
    case 'setDeliveryAddress':
      return { ...state, deliveryAddress: action.address }
    case 'setNotes':
      return { ...state, notes: action.notes }
    case 'clearCart':
      return {
        items: [],
        orderType: 'takeaway',
        customerName: '',
        customerPhone: '',
        deliveryAddress: '',
        notes: '',
      }
    default:
      return state
  }
}

const CartContext = React.createContext<{
  state: CartState
  dispatch: React.Dispatch<CartAction>
  totalItems: number
  totalAud: number
  cartOpen: boolean
  setCartOpen: React.Dispatch<React.SetStateAction<boolean>>
} | null>(null)

const CART_STORAGE_KEY = 'vtthai-cart'

function loadCart(): CartState {
  if (typeof window === 'undefined') {
    return {
      items: [],
      orderType: 'takeaway',
      customerName: '',
      customerPhone: '',
      deliveryAddress: '',
      notes: '',
    }
  }
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved) as CartState
    }
  } catch {
    // ignore
  }
  return {
    items: [],
    orderType: 'takeaway',
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    notes: '',
  }
}

function saveCart(state: CartState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(cartReducer, null, loadCart)
  const [cartOpen, setCartOpen] = React.useState(false)

  const prevItemsCountRef = React.useRef(
    state.items.reduce((sum, i) => sum + i.quantity, 0),
  )
  const totalItems = React.useMemo(
    () => state.items.reduce((sum, i) => sum + i.quantity, 0),
    [state.items],
  )

  React.useEffect(() => {
    if (totalItems > prevItemsCountRef.current) {
      setCartOpen(true)
    }
    prevItemsCountRef.current = totalItems
  }, [totalItems])

  React.useEffect(() => {
    saveCart(state)
  }, [state])

  const totalAud = React.useMemo(
    () => state.items.reduce((sum, i) => sum + i.priceAud * i.quantity, 0),
    [state.items],
  )

  return (
    <CartContext.Provider
      value={{ state, dispatch, totalItems, totalAud, cartOpen, setCartOpen }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = React.useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return ctx
}
