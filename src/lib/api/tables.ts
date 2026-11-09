import { q, m, api } from '../convex';
import type { RestaurantTable, TableSession } from '../supabase';

export async function fetchTables(): Promise<RestaurantTable[]> {
  return (await q(api.posPeople.listTables)) as unknown as RestaurantTable[];
}

export async function fetchTableByToken(token: string): Promise<RestaurantTable | null> {
  return (await q(api.posPeople.getTableByToken, { qr_token: token })) as unknown as RestaurantTable | null;
}

export async function createTable(data: Partial<RestaurantTable>): Promise<RestaurantTable> {
  return (await m(api.posPeople.createTable, {
    table_number: data.table_number || '',
    zone: data.zone,
    capacity: data.capacity,
    is_active: data.is_active,
    qr_token: data.qr_token,
  })) as unknown as RestaurantTable;
}

export async function updateTable(id: string, data: Partial<RestaurantTable>): Promise<RestaurantTable> {
  return (await m(api.posPeople.updateTable, {
    id: id as any,
    table_number: data.table_number,
    zone: data.zone,
    capacity: data.capacity,
    is_active: data.is_active,
    qr_token: data.qr_token,
  })) as unknown as RestaurantTable;
}

export async function deleteTable(id: string) {
  await m(api.posPeople.deleteTable, { id: id as any });
  return null;
}

export async function fetchActiveSession(tableId: string): Promise<TableSession | null> {
  return (await q(api.posPeople.getActiveSession, { table_id: tableId as any })) as unknown as TableSession | null;
}

/** Ids of tables that currently have an active (non-expired) session. Staff only. */
export async function fetchActiveSessionTableIds(): Promise<string[]> {
  const rows = (await q(api.posPeople.listActiveSessions)) as { table_id: string }[];
  return rows.map((r) => r.table_id);
}

export async function createTableSession(data: Partial<TableSession>): Promise<TableSession> {
  return (await m(api.posPeople.createTableSession, {
    table_id: data.table_id as any,
    session_token: data.session_token || '',
    expires_at: data.expires_at,
  })) as unknown as TableSession;
}

export async function updateTableSession(id: string, data: Partial<TableSession>): Promise<TableSession> {
  return (await m(api.posPeople.updateTableSession, {
    id: id as any,
    order_id: (data.order_id as string | undefined) ?? undefined,
    last_activity_at: data.last_activity_at,
    status: data.status,
  })) as unknown as TableSession;
}

/** Staff: complete every active session of the table with this number (POS, after paying). */
export async function completeTableSessionsByNumber(tableNumber: string): Promise<number> {
  return (await m(api.posPeople.completeSessionsByTableNumber, { table_number: tableNumber })) as number;
}

export async function fetchTableOrders(tableNumber: string): Promise<any[]> {
  return (await q(api.posPeople.listTableOrders, { table_number: tableNumber })) as any[];
}
