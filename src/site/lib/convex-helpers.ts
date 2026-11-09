import { getFunctionName } from 'convex/server'
import type { FunctionReference } from 'convex/server'
import { convex, rpc } from '@/src/lib/convex'

export function cvq(query: any, args: any) {
  return {
    queryKey: ['convexQuery', getFunctionName(query), args] as const,
  } as any
}

export const siteQueryFn = ({ queryKey }: { queryKey: readonly unknown[] }) =>
  rpc(queryKey[1] as string, queryKey[2] ?? {})

export function useMutation<F extends FunctionReference<'mutation'>>(fn: F) {
  return (args: F['_args']): Promise<F['_returnType']> => convex.mutation(fn, args as any)
}
