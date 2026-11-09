import { convex, q, m, api } from '../convex';
import { DbError } from './errors';
import type { Reservation } from '../supabase';

export async function fetchReservations(): Promise<Reservation[]> {
  return (await q(api.posPeople.listReservations)) as unknown as Reservation[];
}

export async function updateReservationStatus(id: string, status: string): Promise<Reservation> {
  return (await m(api.posPeople.setReservationStatus, { id: id as any, status })) as unknown as Reservation;
}

/** Public website booking form (no login needed). */
export async function createReservation(data: {
  name: string;
  phone: string;
  guests: number;
  date: string;
  time: string;
  notes?: string | null;
}): Promise<string> {
  try {
    return await convex.mutation(api.posPeople.createReservation, {
      name: data.name,
      phone: data.phone,
      guests: data.guests,
      date: data.date,
      time: data.time,
      notes: data.notes ?? null,
    });
  } catch (e) {
    throw new DbError(e, 'reservations', 'createReservation');
  }
}

/** Public website contact form (no login needed). */
export async function createContact(data: { name: string; phone: string; topic: string; message: string }): Promise<string> {
  try {
    return await convex.mutation(api.posPeople.createContact, data);
  } catch (e) {
    throw new DbError(e, 'contacts', 'createContact');
  }
}

export type ContactRow = { id: string; name: string; phone: string; topic: string; message: string; status: string; created_at: string };

export async function fetchContacts(): Promise<ContactRow[]> {
  return (await q(api.posPeople.listContacts)) as ContactRow[];
}
