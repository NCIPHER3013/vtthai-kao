import { q, m, api } from '../convex';

export type ExpenseRow = {
  id: string;
  date: string;
  category: string | null;
  amount: number;
  description: string | null;
  recurring: boolean;
  created_at: string;
};

/** from/to are YYYY-MM-DD (inclusive). */
export async function fetchExpenses(from?: string, to?: string): Promise<ExpenseRow[]> {
  return (await q(api.posPeople.listExpenses, { from, to })) as ExpenseRow[];
}

export async function createExpense(data: {
  date: string;
  category?: string;
  amount: number;
  description?: string;
  recurring?: boolean;
}): Promise<ExpenseRow> {
  return (await m(api.posPeople.createExpense, data)) as ExpenseRow;
}

export async function deleteExpense(id: string) {
  await m(api.posPeople.deleteExpense, { id: id as any });
  return null;
}
