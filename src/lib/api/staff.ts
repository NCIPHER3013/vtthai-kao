import { convex, q, m, api, setToken } from '../convex';
import { DbError } from './errors';

export type StaffListItem = {
  id: string;
  name: string;
  role: string;
  created_at: string;
};

export async function fetchStaff(): Promise<StaffListItem[]> {
  return (await q(api.posPeople.listStaff)) as StaffListItem[];
}

/** PIN login: verified server-side; stores the session token. Returns the staff member (null = wrong PIN). */
export async function fetchStaffByPin(pin: string) {
  let res;
  try {
    res = await convex.mutation(api.posAuth.loginPin, { pin });
  } catch (e) {
    throw new DbError(e, 'staff_pins', 'fetchStaffByPin');
  }
  if (!res) return null;
  setToken(res.token);
  return { id: res.id, name: res.name, role: res.role as string };
}

export async function createStaff(data: { name: string; role: string; pin: string }) {
  return (await m(api.posPeople.createStaff, { name: data.name, role: data.role, pin: data.pin })) as {
    id: string;
    name: string;
    role: string;
  };
}

export async function updateStaff(id: string, data: { name?: string; role?: string; pin?: string }) {
  await m(api.posPeople.updateStaff, {
    id: id as any,
    name: data.name || undefined,
    role: data.role || undefined,
    pin: data.pin ? data.pin : undefined,
  });
  return null;
}

export async function deleteStaff(id: string) {
  await m(api.posPeople.deleteStaff, { id: id as any });
  return null;
}
