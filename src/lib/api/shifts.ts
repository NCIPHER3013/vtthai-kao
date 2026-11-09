import { q, m, api } from '../convex';
import type { Shift } from '../supabase';

export async function fetchActiveShift(): Promise<Shift[]> {
  return (await q(api.posPeople.getActiveShift)) as unknown as Shift[];
}

export async function fetchShifts(): Promise<Shift[]> {
  return (await q(api.posPeople.listShifts)) as unknown as Shift[];
}

export async function fetchShiftById(id: string): Promise<Shift | null> {
  return (await q(api.posPeople.getShiftById, { id: id as any })) as unknown as Shift | null;
}

export async function createShift(data: { starting_cash: number; opened_by?: string | null }): Promise<Shift> {
  return (await m(api.posPeople.createShift, {
    starting_cash: data.starting_cash,
    opened_by: data.opened_by ?? null,
  })) as unknown as Shift;
}

export async function closeShift(
  id: string,
  data: { ended_at: string; expected_cash?: number; actual_cash?: number; total_sales: number; notes?: string; closed_by?: string },
): Promise<Shift> {
  return (await m(api.posPeople.closeShift, {
    id: id as any,
    ended_at: data.ended_at,
    expected_cash: data.expected_cash,
    actual_cash: data.actual_cash,
    total_sales: data.total_sales,
    notes: data.notes ?? null,
    closed_by: data.closed_by ?? null,
  })) as unknown as Shift;
}

export async function addShiftSalesSafe(shiftId: string, amount: number) {
  return (await m(api.posPeople.addShiftSales, { id: shiftId as any, amount })) as { id: string; total_sales: number }[];
}

export async function addShiftSales(shiftId: string, amount: number) {
  await addShiftSalesSafe(shiftId, amount);
  return (await fetchShiftById(shiftId)) as Shift;
}

/** Orders rung up during a shift (legacy order rows without items). */
export async function fetchShiftOrders(shiftId: string) {
  return (await q(api.posPeople.listShiftOrders, { shift_id: shiftId as any })) as any[];
}
