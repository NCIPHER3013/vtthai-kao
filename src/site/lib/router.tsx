// Minimal react-router-dom adapter that mimics the bits of @tanstack/react-router used by the old Vermont Thai pages,
// so the page markup can stay identical.
import * as React from 'react'
import {
  Link as RRLink,
  Outlet,
  useLocation,
  useNavigate as useRRNavigate,
  useParams as useRRParams,
} from 'react-router-dom'

export { Outlet }

type SearchObj = Record<string, unknown>

function parseValue(v: string): unknown {
  // TanStack parsed JSON values from the URL (numbers/booleans); emulate that.
  if (v === 'true') return true
  if (v === 'false') return false
  if (v !== '' && !Number.isNaN(Number(v)) && String(Number(v)) === v) return Number(v)
  return v
}

export function parseSearch(search: string): SearchObj {
  const out: SearchObj = {}
  new URLSearchParams(search).forEach((v, k) => {
    out[k] = parseValue(v)
  })
  return out
}

function toQuery(search: SearchObj | undefined): string {
  if (!search) return ''
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(search)) {
    if (v === undefined || v === null || v === '') continue
    p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

function fillParams(to: string, params?: Record<string, string>) {
  if (!params) return to
  return to.replace(/\$(\w+)/g, (_, k) => encodeURIComponent(params[k] ?? ''))
}

type LinkProps = Omit<React.ComponentProps<typeof RRLink>, 'to'> & {
  to: string
  search?: SearchObj
  params?: Record<string, string>
  activeProps?: { className?: string }
  activeOptions?: unknown
  preload?: unknown
  resetScroll?: unknown
}

export function Link({
  to,
  search,
  params,
  activeProps,
  activeOptions: _ao,
  preload: _pl,
  resetScroll: _rs,
  className,
  ...rest
}: LinkProps) {
  const { pathname } = useLocation()
  const path = fillParams(to, params)
  const active = activeProps ? pathname === path : false
  const cls = active && activeProps?.className ? activeProps.className : className
  return <RRLink to={`${path}${toQuery(search)}`} className={cls} {...rest} />
}

export function useRouterState() {
  const { pathname, search } = useLocation()
  return { location: { pathname, search: parseSearch(search) } }
}

type NavOpts = { to?: string; search?: SearchObj | ((prev: SearchObj) => SearchObj); replace?: boolean; params?: Record<string, string> }

export function useNavigate() {
  const nav = useRRNavigate()
  const { pathname, search } = useLocation()
  return React.useCallback(
    (opts: NavOpts) => {
      const prev = parseSearch(search)
      const nextSearch = typeof opts.search === 'function' ? opts.search(prev) : opts.search
      const path = fillParams(opts.to ?? pathname, opts.params)
      nav(`${path}${toQuery(nextSearch ?? (opts.to ? {} : prev))}`, { replace: opts.replace })
    },
    [nav, pathname, search],
  )
}

type RouteOpts = {
  validateSearch?: (s: any) => any
  head?: (ctx?: any) => HeadConfig
  loader?: (ctx: any) => any // prefetch only in the old SSR site; ignored in the SPA (useQuery fetches)
  component: React.ComponentType
}

export function createFileRoute(_path: string) {
  return <O extends RouteOpts>(opts: O) => ({
    options: opts as RouteOpts,
    useSearch: (): O['validateSearch'] extends (s: any) => infer R ? R : SearchObj => {
      const { search } = useLocation()
      return React.useMemo(() => {
        const raw = parseSearch(search)
        return (opts.validateSearch ? opts.validateSearch(raw) : raw) as any
      }, [search])
    },
    useParams: () => useRRParams() as Record<string, string>,
    useNavigate: () => useNavigate(),
  })
}

// ---------- document head (replaces TanStack head()) ----------
export type HeadConfig = {
  meta?: Array<Record<string, string>>
  links?: Array<Record<string, string>>
}

export function useDocumentHead(cfg: HeadConfig | undefined) {
  const key = JSON.stringify(cfg ?? {})
  React.useEffect(() => {
    if (!cfg) return
    const added: Array<Element> = []
    const prevTitle = document.title
    for (const m of cfg.meta ?? []) {
      if (m.title) {
        document.title = m.title
        continue
      }
      if (m.charSet || m.viewport) continue
      const sel = m.name ? `meta[name="${m.name}"]` : m.property ? `meta[property="${m.property}"]` : null
      const el = (sel && document.head.querySelector(sel)) || document.createElement('meta')
      const existed = el.parentNode === document.head
      for (const [k, v] of Object.entries(m)) el.setAttribute(k, v)
      if (!existed) {
        document.head.appendChild(el)
        added.push(el)
      }
    }
    for (const l of cfg.links ?? []) {
      if (l.rel === 'stylesheet') continue
      const el = document.createElement('link')
      for (const [k, v] of Object.entries(l)) el.setAttribute(k, v)
      document.head.appendChild(el)
      added.push(el)
    }
    return () => {
      added.forEach((e) => e.remove())
      document.title = prevTitle
    }
  }, [key])
}

export function JsonLd({ data }: { data: unknown }) {
  React.useEffect(() => {
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.text = JSON.stringify(data)
    document.head.appendChild(el)
    return () => el.remove()
  }, [JSON.stringify(data)])
  return null
}

/** Renders a ported page: applies its head() and renders its component. */
export function RoutePage({ route }: { route: { options: RouteOpts } }) {
  const Comp = route.options.component
  useDocumentHead(route.options.head?.())
  return <Comp />
}
