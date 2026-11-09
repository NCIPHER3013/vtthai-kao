// Legacy Supabase-result helpers. The Convex DAL no longer uses them (q()/m() throw DbError directly);
// they remain only so files that still wrap a { data, error } result keep compiling.
import { DbError } from './errors';

type PgLike = { message: string; code?: string; details?: string | null; hint?: string | null };
type PostgrestResult<T> = { data: T; error: null } | { data: null; error: PgLike };
type ThenableResult<T> = PromiseLike<PostgrestResult<T>>;

export async function dbQuery<T>(result: ThenableResult<T>, tableName?: string, operation?: string): Promise<T> {
  const { data, error } = await result;
  if (error) throw new DbError(error.message, tableName, operation);
  return data as T;
}

export async function dbQueryOptional<T>(result: ThenableResult<T>): Promise<T | null> {
  const { data, error } = await result;
  if (error) throw new DbError(error.message);
  return data;
}

export async function dbMutation<T>(result: ThenableResult<T>, tableName: string, operation: string): Promise<T> {
  const { data, error } = await result;
  if (error) throw new DbError(error.message, tableName, operation);
  return data as T;
}
