import { getFunctionName } from 'convex/server';
import type { FunctionReference, OptionalRestArgs } from 'convex/server';
import { api } from '../../convex/_generated/api';
import { DbError } from './api/errors';

const API_URL = (((import.meta as any).env?.VITE_API_URL as string | undefined) || '').replace(/\/$/, '');

export { api };

const TOKEN_KEY = 'kungpos_token';
export const getToken = (): string | undefined => {
  try { return localStorage.getItem(TOKEN_KEY) || undefined; } catch { return undefined; }
};
export const setToken = (t: string | null) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {}
};

export async function rpc(name: string, args: unknown): Promise<any> {
  const res = await fetch(`${API_URL}/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, args }),
  });
  const body = await res.json().catch(() => ({}) as any);
  if (!res.ok) throw new Error(`Uncaught Error: ${body?.error || `HTTP ${res.status}`}`);
  return body.value;
}

export const convex = {
  query<F extends FunctionReference<'query'>>(fn: F, ...args: OptionalRestArgs<F>): Promise<F['_returnType']> {
    return rpc(getFunctionName(fn), args[0] ?? {});
  },
  mutation<F extends FunctionReference<'mutation'>>(fn: F, ...args: OptionalRestArgs<F>): Promise<F['_returnType']> {
    return rpc(getFunctionName(fn), args[0] ?? {});
  },
  action<F extends FunctionReference<'action'>>(fn: F, ...args: OptionalRestArgs<F>): Promise<F['_returnType']> {
    return rpc(getFunctionName(fn), args[0] ?? {});
  },
};

type Args<F extends FunctionReference<any>> = Omit<F['_args'], 'token'>;

/** Call a query with the current login token attached. */
export function q<F extends FunctionReference<'query'>>(fn: F, args: Args<F> = {} as Args<F>): Promise<F['_returnType']> {
  return rpc(getFunctionName(fn), { ...(args as object), token: getToken() }).catch((e) => { throw new DbError(e); });
}

/** Call a mutation with the current login token attached. */
export function m<F extends FunctionReference<'mutation'>>(fn: F, args: Args<F> = {} as Args<F>): Promise<F['_returnType']> {
  return rpc(getFunctionName(fn), { ...(args as object), token: getToken() }).catch((e) => { throw new DbError(e); });
}

const POLL_MS = 3000;

/**
 * Calls `onChange` whenever any row of the given tables changes (polls a cheap digest). Returns an unsubscribe function.
 */
export function subscribeTables(tables: string[], onChange: () => void): () => void {
  let first = true;
  let last = '';
  let stopped = false;
  const tick = async () => {
    if (stopped || (typeof document !== 'undefined' && document.hidden)) return;
    try {
      const value = (await rpc(getFunctionName(api.posTouch.digest), { token: getToken(), tables })) as string;
      if (stopped) return;
      if (first) { first = false; last = value; return; }
      if (value !== last) { last = value; onChange(); }
    } catch {}
  };
  void tick();
  const timer = setInterval(tick, POLL_MS);
  return () => { stopped = true; clearInterval(timer); };
}

/** Errors thrown by backend functions arrive as "Uncaught Error: CODE: detail" - extract the useful part. */
export function convexErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const m1 = msg.match(/Uncaught Error: ([^\n]+)/);
  return (m1 ? m1[1] : msg).trim();
}
