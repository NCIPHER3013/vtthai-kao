import { q, m, api } from '../convex';
import type { Customer } from '../supabase';

export async function fetchCustomers(): Promise<Customer[]> {
  return (await q(api.posPeople.listCustomers)) as unknown as Customer[];
}

export async function fetchCustomerById(id: string): Promise<Customer | null> {
  return (await q(api.posPeople.getCustomerById, { id: id as any })) as unknown as Customer | null;
}

export async function fetchCustomerByPhone(phone: string): Promise<Customer | null> {
  return (await q(api.posPeople.getCustomerByPhone, { phone })) as unknown as Customer | null;
}

export async function fetchCustomerByEmail(email: string): Promise<Customer | null> {
  return (await q(api.posPeople.getCustomerByEmail, { email })) as unknown as Customer | null;
}

export async function createCustomer(data: Partial<Customer>): Promise<Customer> {
  return (await m(api.posPeople.createCustomer, {
    name: data.name || '',
    phone: data.phone ?? null,
    email: data.email ?? null,
    points: data.points,
    total_spent: data.total_spent,
  })) as unknown as Customer;
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
  return (await m(api.posPeople.updateCustomer, {
    id: id as any,
    name: data.name,
    phone: data.phone ?? undefined,
    email: data.email ?? undefined,
    points: data.points,
    total_spent: data.total_spent,
    last_visit: data.last_visit ?? undefined,
    visit_count: (data as any).visit_count,
  })) as unknown as Customer;
}

export async function adjustCustomerPointsSafe(customerId: string, pointsDelta: number, spentDelta: number) {
  return (await m(api.posPeople.adjustCustomerPoints, {
    id: customerId as any,
    pointsDelta,
    spentDelta,
  })) as { id: string; points: number; total_spent: number }[];
}

export async function adjustCustomerPoints(customerId: string, pointsDelta: number, spentDelta: number) {
  const rows = await adjustCustomerPointsSafe(customerId, pointsDelta, spentDelta);
  return (await fetchCustomerById(rows[0].id)) as Customer;
}
