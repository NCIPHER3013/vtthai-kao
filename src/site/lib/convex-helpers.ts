import { getFunctionName } from 'convex/server'

// Store the function name (a string) in the query key instead of the
// Convex function reference: the reference is an unserializable Proxy,
// which breaks TanStack Router's Seroval dehydration of SSR query data.
// getFunctionName accepts both forms and hashes identically.
export function cvq(query: any, args: any) {
  return {
    queryKey: ['convexQuery', getFunctionName(query), args] as const,
  } as any
}
