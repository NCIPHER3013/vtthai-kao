import '~/lib/cart-toast'
import {
  JsonLd,
  Link,
  Outlet,
  useDocumentHead,
  useRouterState,
} from '~/lib/router'
import type { HeadConfig } from '~/lib/router'
import * as React from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { api } from 'convex/_generated/api'
import { cvq, siteQueryFn } from '~/lib/convex-helpers'
import '~/styles/site.css'
import { CartProvider, useCart } from '~/lib/cart'
import { CartDrawer } from '~/components/CartDrawer'
import {
  TrackingBodyEndScripts,
  TrackingBodyStartScripts,
  TrackingHeadScripts,
} from '~/components/TrackingScripts'

const SITE_HEAD: HeadConfig = {
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Vermont Thai',
      },
      {
        name: 'description',
        content:
          'Vermont Thai — Thai cuisine dine in & take away. Lunch specials, premium ingredients, takeaway, delivery, and table booking. AUD pricing.',
      },
      {
        property: 'og:title',
        content: 'Vermont Thai — Thai Cuisine, Dine In & Take Away',
      },
      {
        property: 'og:description',
        content:
          'Authentic Thai cuisine — dine in, takeaway, delivery, and lunch specials.',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:image',
        content: '/logo.png',
      },
      {
        property: 'og:site_name',
        content: 'Vermont Thai',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'Vermont Thai — Thai Cuisine, Dine In & Take Away',
      },
      {
        name: 'twitter:description',
        content:
          'Authentic Thai cuisine — dine in, takeaway, delivery, and lunch specials.',
      },
    ],
    links: [
      {
        rel: 'apple-touch-icon',
        href: '/logo.png',
      },
      { rel: 'manifest', href: '/site.webmanifest', color: '#fffff' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon.png' },
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'sitemap', type: 'application/xml', href: '/sitemap.xml' },
    ],
  }

function useProviders() {
  return React.useMemo(() => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          queryFn: siteQueryFn,
          staleTime: 15000,
          gcTime: 300000,
          refetchOnWindowFocus: true,
        },
      },
    })
    return { queryClient }
  }, [])
}

export default function SiteLayout() {
  const { queryClient } = useProviders()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  useDocumentHead(SITE_HEAD)

  return (
      <QueryClientProvider client={queryClient}>
        <RootDocument>
          <CartProvider>
            <AppShell
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
            />
          </CartProvider>
        </RootDocument>
      </QueryClientProvider>
  )
}

function AppShell({
  mobileMenuOpen,
  setMobileMenuOpen,
}: {
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}) {
  const { cartOpen, setCartOpen } = useCart()

  return (
    <>
      <div className="min-h-dvh">
        <Header
          setCartOpen={setCartOpen}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />
        <div className="hidden lg:flex justify-center border-b border-[color:var(--vt-border)] bg-[color:rgba(7,8,11,0.72)] backdrop-blur">
          <OrderModeSwitcher />
        </div>

        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <div
          className={`fixed inset-y-0 left-0 z-[95] w-72 bg-[color:var(--vt-bg)] border-r border-[color:var(--vt-border)] flex flex-col transform transition-transform duration-200 md:hidden ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--vt-border)]">
            <div className="text-sm font-semibold">Menu</div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm text-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)] hover:bg-[color:rgba(255,255,255,0.06)]"
            >
              Close
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 text-sm">
            <Link
              to="/"
              search={{}}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)] hover:bg-[color:rgba(255,255,255,0.06)]"
              activeProps={{
                className:
                  'block px-3 py-2.5 rounded-lg text-[color:#D4A843] bg-[color:rgba(212,168,67,0.1)] font-medium',
              }}
            >
              Home
            </Link>
            <Link
              to="/menu"
              search={{}}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)] hover:bg-[color:rgba(255,255,255,0.06)]"
              activeProps={{
                className:
                  'block px-3 py-2.5 rounded-lg text-[color:#D4A843] bg-[color:rgba(212,168,67,0.1)] font-medium',
              }}
            >
              Menu
            </Link>
            <Link
              to="/food-delivery"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)] hover:bg-[color:rgba(255,255,255,0.06)]"
              activeProps={{
                className:
                  'block px-3 py-2.5 rounded-lg text-[color:#D4A843] bg-[color:rgba(212,168,67,0.1)] font-medium',
              }}
            >
              Food delivery
            </Link>
            <Link
              to="/special-offers"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)] hover:bg-[color:rgba(255,255,255,0.06)]"
              activeProps={{
                className:
                  'block px-3 py-2.5 rounded-lg text-[color:#D4A843] bg-[color:rgba(212,168,67,0.1)] font-medium',
              }}
            >
              Special Offers
            </Link>
            <Link
              to="/blog"
              search={{ page: 1 }}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)] hover:bg-[color:rgba(255,255,255,0.06)]"
              activeProps={{
                className:
                  'block px-3 py-2.5 rounded-lg text-[color:#D4A843] bg-[color:rgba(212,168,67,0.1)] font-medium',
              }}
            >
              Blog
            </Link>
            <Link
              to="/contact"
              search={{}}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)] hover:bg-[color:rgba(255,255,255,0.06)]"
              activeProps={{
                className:
                  'block px-3 py-2.5 rounded-lg text-[color:var(--vt-chili)] bg-[color:rgba(239,68,68,0.1)] font-medium',
              }}
            >
              Contact us
            </Link>
            <div className="my-3 border-t border-[color:var(--vt-border)]" />
            <div className="inline-flex rounded-lg p-1 ring-1 ring-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.04)] w-full">
              <Link
                to="/menu"
                search={{ mode: 'takeaway' }}
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative"
              >
                Takeaway
              </Link>
              <Link
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative"
              >
                Book a table
              </Link>
              <Link
                to="/menu"
                search={{ mode: 'delivery' }}
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative"
              >
                Delivery
              </Link>
            </div>
          </nav>
        </div>

        <Outlet />

        <footer className="border-t border-[color:var(--vt-border)] mt-16">
          <div className="mx-auto max-w-6xl px-5 py-10 grid md:grid-cols-3 gap-8 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="font-semibold">Vermont Thai</div>
              </div>
              <div className="text-[color:var(--vt-muted)]">
                We call to confirm every order and share payment details before
                cooking begins.
              </div>
            </div>
            <div className="space-y-2 text-[color:var(--vt-muted)]">
              <div className="text-[color:var(--vt-text)] font-semibold">
                Quick links
              </div>
              <div className="flex flex-col gap-1">
                <Link
                  to="/menu"
                  search={{}}
                  className="hover:text-[color:var(--vt-text)]"
                >
                  Menu
                </Link>
                <Link
                  to="/special-offers"
                  className="hover:text-[color:var(--vt-text)]"
                >
                  Special Offers
                </Link>
                <Link
                  to="/blog"
                  search={{ page: 1 }}
                  className="hover:text-[color:var(--vt-text)]"
                >
                  Blog
                </Link>
                <Link
                  to="/contact"
                  search={{}}
                  className="hover:text-[color:var(--vt-text)]"
                >
                  Contact us
                </Link>
              </div>
            </div>
            <SiteInfoFooter />
          </div>
        </footer>
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}

function Header({
  setCartOpen,
  mobileMenuOpen,
  setMobileMenuOpen,
}: {
  setCartOpen: (open: boolean) => void
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}) {
  const { totalItems } = useCart()

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--vt-border)] bg-[color:rgba(7,8,11,0.72)] backdrop-blur">
      <div className="mx-auto max-w-6xl px-5 py-4 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Vermont Thai"
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg object-cover"
          />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-wide">
              Vermont Thai
            </div>
            <div className="text-xs text-[color:var(--vt-muted)]">
              Thai Cuisine, Dine In &amp; Take Away
            </div>
          </div>
        </Link>

        <nav className="ml-auto hidden md:flex items-center gap-1 text-sm text-[color:var(--vt-muted)]">
          <Link
            to="/"
            search={{}}
            className="px-3 py-2 rounded-lg hover:text-[color:var(--vt-text)] hover:bg-[color:rgba(255,255,255,0.06)]"
            activeProps={{
              className:
                'px-3 py-2 rounded-lg text-[color:#D4A843] bg-[color:rgba(212,168,67,0.1)] font-medium',
            }}
          >
            Home
          </Link>
          <Link
            to="/menu"
            search={{}}
            className="px-3 py-2 rounded-lg hover:text-[color:var(--vt-text)] hover:bg-[color:rgba(255,255,255,0.06)]"
            activeProps={{
              className:
                'px-3 py-2 rounded-lg text-[color:#D4A843] bg-[color:rgba(212,168,67,0.1)] font-medium',
            }}
          >
            Menu
          </Link>
          <Link
            to="/food-delivery"
            className="px-3 py-2 rounded-lg hover:text-[color:var(--vt-text)] hover:bg-[color:rgba(255,255,255,0.06)]"
            activeProps={{
              className:
                'px-3 py-2 rounded-lg text-[color:#D4A843] bg-[color:rgba(212,168,67,0.1)] font-medium',
            }}
          >
            Delivery
          </Link>
          <Link
            to="/special-offers"
            className="px-3 py-2 rounded-lg hover:text-[color:var(--vt-text)] hover:bg-[color:rgba(255,255,255,0.06)]"
            activeProps={{
              className:
                'px-3 py-2 rounded-lg text-[color:#D4A843] bg-[color:rgba(212,168,67,0.1)] font-medium',
            }}
          >
            Offers
          </Link>
          <Link
            to="/blog"
            search={{ page: 1 }}
            className="px-3 py-2 rounded-lg hover:text-[color:var(--vt-text)] hover:bg-[color:rgba(255,255,255,0.06)]"
            activeProps={{
              className:
                'px-3 py-2 rounded-lg text-[color:#D4A843] bg-[color:rgba(212,168,67,0.1)] font-medium',
            }}
          >
            Blog
          </Link>
          <Link
            to="/contact"
            search={{}}
            className="px-3 py-2 rounded-lg hover:text-[color:var(--vt-text)] hover:bg-[color:rgba(255,255,255,0.06)]"
            activeProps={{
              className:
                'px-3 py-2 rounded-lg text-[color:#D4A843] bg-[color:rgba(212,168,67,0.1)] font-medium',
            }}
          >
            Contact
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="relative ml-auto md:ml-3 p-2 rounded-lg text-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)] hover:bg-[color:rgba(255,255,255,0.06)]"
          aria-label="Open cart"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
          {totalItems > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[color:var(--vt-ivory)] text-[10px] font-bold text-black leading-none px-1">
              {totalItems}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)] hover:bg-[color:rgba(255,255,255,0.06)]"
          aria-label="Toggle menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </header>
  )
}

function SiteInfoFooter() {
  const { data } = useQuery(cvq(api.siteInfo.getAll, {}))
  const siteInfo = data as Record<string, string> | undefined

  return (
    <div className="space-y-2 text-[color:var(--vt-muted)]">
      <div className="text-[color:var(--vt-text)] font-semibold">Contact</div>
      <div>Phone: {siteInfo?.phone ?? '+61 …'}</div>
      {siteInfo?.email && <div>Email: {siteInfo.email}</div>}
      <div>Address: {siteInfo?.address ?? '…'}</div>
      <div>Hours: {siteInfo?.hours ?? '…'}</div>
      {(siteInfo?.facebook || siteInfo?.instagram) && (
        <div className="pt-2 flex gap-3 text-[color:var(--vt-text)]">
          {siteInfo.facebook && (
            <a
              href={siteInfo.facebook}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[color:var(--vt-ivory)] underline"
            >
              Facebook
            </a>
          )}
          {siteInfo.instagram && (
            <a
              href={`https://instagram.com/${siteInfo.instagram}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[color:var(--vt-ivory)] underline"
            >
              Instagram
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function OrderModeSwitcher() {
  const router = useRouterState()
  const { pathname, search } = router.location
  const currentSearch = search as Record<string, unknown>

  const isActive = (to: string, mode?: string, tab?: string) => {
    if (to === '/contact' && tab === 'book') {
      return pathname === '/contact' && currentSearch['tab'] === 'book'
    }
    if (mode) {
      return pathname === '/menu' && currentSearch['mode'] === mode
    }
    return pathname === to
  }

  const items = [
    {
      label: 'Takeaway',
      sub: 'Grab & Go',
      to: '/menu' as const,
      search: { mode: 'takeaway' },
      mode: 'takeaway',
      tab: undefined as string | undefined,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
      badge: undefined as string | undefined,
    },
    {
      label: 'Book a table',
      sub: 'Reserve',
      to: '/contact' as const,
      search: { tab: 'book' },
      mode: undefined as string | undefined,
      tab: 'book',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      badge: undefined as string | undefined,
    },
    {
      label: 'Delivery',
      sub: 'We deliver',
      to: '/menu' as const,
      search: { mode: 'delivery' },
      mode: 'delivery',
      tab: undefined as string | undefined,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
      badge: 'Popular',
    },
  ]

  const activeIndex = items.findIndex((item) =>
    isActive(item.to, item.mode, item.tab),
  )

  return (
    <div className="ml-auto inline-flex rounded-xl p-1.5 ring-1 ring-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.04)] [box-shadow:0_0_20px_rgba(255,246,233,0.04),inset_0_1px_0_rgba(255,255,255,0.06)] vt-mega-toggle-shimmer">
      {items.map((item, i) => {
        const active = activeIndex === i
        return (
          <Link
            key={item.label}
            to={item.to}
            search={item.search}
            className={`relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active ? 'min-w-[90px]' : 'min-w-[80px]'}`}
            activeProps={{
              className:
                'relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-w-[90px]',
            }}
          >
            {active && (
              <>
                <span className="absolute inset-0 rounded-lg bg-[color:var(--vt-ivory)]" />
                <span className="absolute -inset-px rounded-lg vt-mega-toggle-glow" />
              </>
            )}
            <span
              className={`relative z-10 flex flex-col items-center gap-0.5 ${active ? 'text-black' : 'hover:text-[color:var(--vt-ivory)]'}`}
            >
              <span className="flex items-center gap-1.5">
                {item.icon}
                {item.label}
              </span>
              <span
                className={`text-[10px] leading-tight ${active ? 'text-black/60' : 'text-[color:var(--vt-muted)]'}`}
              >
                {item.sub}
              </span>
              {item.badge && (
                <span
                  className={`absolute -top-1.5 -right-1.5 z-20 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none ${active ? 'bg-[color:var(--vt-chili)] text-white' : 'bg-[color:rgba(239,68,68,0.2)] text-[color:var(--vt-chili)]'}`}
                >
                  {item.badge}
                </span>
              )}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <div className="vt-site">
      <TrackingHeadScripts />
      <JsonLd
        data={{
              '@context': 'https://schema.org',
              '@type': 'Restaurant',
              name: 'Vermont Thai',
              description:
                'Thai cuisine dine in & take away. Lunch specials, premium ingredients, dine in, takeaway, and delivery.',
              url: 'https://vermontthai.com.au',
              telephone: '+61 3 9802 1888',
              address: {
                '@type': 'PostalAddress',
                streetAddress: '503A Burwood Hwy',
                addressLocality: 'Vermont South',
                addressRegion: 'VIC',
                postalCode: '3133',
                addressCountry: 'AU',
              },
              servesCuisine: 'Thai',
              priceRange: '$$',
              openingHoursSpecification: {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: [
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday',
                  'Sunday',
                ],
                opens: '16:30',
                closes: '21:30',
              },
            }}
      />
      <TrackingBodyStartScripts />
      {children}
      <TrackingBodyEndScripts />
    </div>
  )
}
