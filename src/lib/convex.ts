import { ConvexClient } from 'convex/browser';
import type { FunctionReference, OptionalRestArgs } from 'convex/server';
import { api } from '../../convex/_generated/api';
import { DbError } from './api/errors';

const url = (import.meta as any).env?.VITE_CONVEX_URL as string | undefined;
if (!url) throw new Error('Missing VITE_CONVEX_URL in .env.local');

export const convex = new ConvexClient(url);
export { api };

const TOKEN_KEY = 'kungpos_token';
export const getToken = (): string | undefined => {
  try { return localStorage.getItem(TOKEN_KEY) || undefined; } catch { return undefined; }
};
export const setToken = (t: string | null) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {}
};

type Args<F extends FunctionReference<any>> = Omit<F['_args'], 'token'>;

/** Call a Convex query with the current login token attached. */
export function q<F extends FunctionReference<'query'>>(fn: F, args: Args<F> = {} as Args<F>): Promise<F['_returnType']> {
  return convex.query(fn, { ...(args as object), token: getToken() } as F['_args']).catch((e) => { throw new DbError(e); });
}

/** Call a Convex mutation with the current login token attached. */
export function m<F extends FunctionReference<'mutation'>>(fn: F, args: Args<F> = {} as Args<F>): Promise<F['_returnType']> {
  return convex.mutation(fn, { ...(args as object), token: getToken() } as F['_args']).catch((e) => { throw new DbError(e); });
}

/**
 * Replacement for supabase.channel(...).on('postgres_changes', ...).subscribe().
 * Calls `onChange` whenever any row of the given (legacy) tables changes. Returns an unsubscribe function.
 */
export function subscribeTables(tables: string[], onChange: () => void): () => void {
  let first = true;
  let last = '';
  const unsub = convex.onUpdate(api.posTouch.digest, { token: getToken(), tables }, (value) => {
    if (first) { first = false; last = value; return; }
    if (value !== last) { last = value; onChange(); }
  });
  return () => unsub();
}

/** Errors thrown by Convex functions arrive as "[CONVEX M(...)] ... Uncaught Error: CODE: detail" - extract the useful part. */
export function convexErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const m1 = msg.match(/Uncaught Error: ([^\n]+)/);
  return (m1 ? m1[1] : msg).trim();
}
