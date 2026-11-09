import { q, m, api } from '../convex';

export interface GiftCardRow {
  id: string;
  code: string;
  initial_value: number;
  current_balance: number;
  purchase_price: number;
  customer_id?: string;
  status: 'active' | 'depleted' | 'expired' | 'cancelled';
  created_at: string;
  expires_at?: string;
  notes?: string;
}

export interface GiftCardTransactionRow {
  id: string;
  gift_card_id: string;
  order_id?: string;
  amount: number;
  transaction_type: 'redemption' | 'reload' | 'issue';
  created_at: string;
  notes?: string;
}

export async function fetchGiftCardByCode(code: string): Promise<GiftCardRow | null> {
  return (await q(api.posPeople.getGiftCardByCode, { code })) as GiftCardRow | null;
}

export async function fetchGiftCardById(id: string): Promise<GiftCardRow | null> {
  return (await q(api.posPeople.getGiftCardById, { id: id as any })) as GiftCardRow | null;
}

export async function updateGiftCard(id: string, data: Partial<GiftCardRow>): Promise<GiftCardRow> {
  return (await m(api.posPeople.updateGiftCard, {
    id: id as any,
    current_balance: data.current_balance,
    status: data.status,
    notes: data.notes ?? undefined,
    customer_id: (data.customer_id as any) ?? undefined,
    expires_at: data.expires_at ?? undefined,
  })) as GiftCardRow;
}

export async function createGiftCards(cards: Omit<GiftCardRow, 'id' | 'created_at'>[]): Promise<GiftCardRow[]> {
  return (await m(api.posPeople.createGiftCards, {
    cards: cards.map((c) => ({
      code: c.code,
      initial_value: c.initial_value,
      current_balance: c.current_balance,
      purchase_price: c.purchase_price,
      customer_id: (c.customer_id as any) ?? null,
      status: c.status,
      expires_at: c.expires_at ?? null,
      notes: c.notes ?? null,
    })),
  })) as GiftCardRow[];
}

export async function createGiftCardTransaction(
  data: Omit<GiftCardTransactionRow, 'id' | 'created_at'>,
): Promise<GiftCardTransactionRow> {
  return (await m(api.posPeople.createGiftCardTransaction, {
    gift_card_id: data.gift_card_id as any,
    order_id: data.order_id ?? null,
    amount: data.amount,
    transaction_type: data.transaction_type,
    notes: data.notes ?? null,
  })) as GiftCardTransactionRow;
}
