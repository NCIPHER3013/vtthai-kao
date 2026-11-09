import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu as MenuIcon, X, Phone, Mail, Facebook, Instagram } from 'lucide-react';
import './storefront.css';
import { StorefrontProvider, useStorefront } from './StorefrontContext';
import CartDrawer from './CartDrawer';
import VtErrorBoundary from './VtErrorBoundary';
import { LOGO_URL } from './types';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/order', label: 'Order Online' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact' },
];

function Header() {
  const { count, setCartOpen } = useStorefront();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isActive = (to: string) => {
    const path = to.split('?')[0];
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-40">
      <div className="h-0.5 bg-gradient-to-r from-transparent via-[color:var(--vt-accent)] to-transparent" />
      <div className="border-b border-[color:var(--vt-line)] bg-[color:rgba(10,10,13,0.8)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={LOGO_URL}
              alt="Vermont Thai logo"
              className="h-9 w-9 rounded-full object-cover ring-2 ring-[color:rgba(232,53,63,0.5)]"
            />
            <div className="leading-tight">
              <div className="whitespace-nowrap font-serif text-[15px] text-[color:var(--vt-text)] min-[400px]:text-[17px]">Vermont Thai</div>
              <div className="hidden text-[11px] text-[color:var(--vt-muted)] min-[400px]:block">Thai Cuisine · Vermont South</div>
            </div>
          </Link>
          <nav className="ml-auto hidden items-center gap-7 text-sm font-medium text-[color:var(--vt-muted)] md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`transition-colors hover:text-[color:var(--vt-text)] ${
                  isActive(item.to) ? 'text-[color:var(--vt-text)]' : ''
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--vt-line)] text-[color:var(--vt-muted)] transition-colors hover:border-[color:var(--vt-accent)] hover:text-[color:var(--vt-accent)] md:ml-2"
            aria-label="Open cart"
          >
            <ShoppingBag className="h-4.5 w-4.5" />
            {count > 0 && (
              <span
                key={count}
                className="vt-pop absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--vt-accent)] px-1 text-[10px] font-bold text-white"
              >
                {count}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--vt-line)] text-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)] md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="border-t border-[color:var(--vt-line)] bg-black/95 px-5 py-3 text-sm text-[color:var(--vt-muted)] md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-3 hover:text-[color:var(--vt-text)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

const SOCIALS = [
  { label: 'Call us', href: 'tel:+61398021888', icon: Phone },
  { label: 'Email us', href: 'mailto:vermontthai@hotmail.com', icon: Mail },
  { label: 'Facebook', href: 'https://www.facebook.com/VermontThai/', icon: Facebook },
];

function Footer() {
  return (
    <footer className="mt-24 border-t border-[color:var(--vt-line)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 text-sm md:grid-cols-3">
        <div>
          <div className="font-serif text-lg text-[color:var(--vt-text)]">Vermont Thai</div>
          <p className="mt-3 max-w-xs leading-relaxed text-[color:var(--vt-muted)]">
            Bold, clean Thai flavours — order online for delivery. All prices in AUD.
          </p>
          <div className="mt-5 flex items-center gap-2.5">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                aria-label={s.label}
                href={s.href}
                target={s.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--vt-line)] text-[color:var(--vt-muted)] transition-colors hover:border-[color:var(--vt-accent)] hover:text-[color:var(--vt-accent)]"
              >
                <s.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <div className="vt-overline">Hours</div>
          <ul className="mt-3 space-y-1.5 text-[color:var(--vt-muted)]">
            <li>Mon – Sun · 11:00 – 22:00</li>
            <li className="text-xs">Delivery at the same hours</li>
          </ul>
        </div>
        <div>
          <div className="vt-overline">Find us</div>
          <ul className="mt-3 space-y-1.5 text-[color:var(--vt-muted)]">
            <li>503A Burwood Hwy, Vermont South VIC 3133</li>
            <li>
              <a href="tel:+61398021888" className="transition-colors hover:text-[color:var(--vt-text)]">
                +61 3 9802 1888
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[color:var(--vt-line)] py-5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 text-xs text-[color:var(--vt-muted)]">
          <span>© {new Date().getFullYear()} Vermont Thai</span>
          <Link to="/privacy" className="transition-colors hover:text-[color:var(--vt-text)]">
            Privacy Policy
          </Link>
          <Link to="/data-deletion" className="transition-colors hover:text-[color:var(--vt-text)]">
            Data Deletion
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default function StorefrontLayout() {
  return (
    <StorefrontProvider>
      <div className="vt-page flex min-h-dvh flex-col font-sans">
        <Header />
        <main className="flex-1">
          <VtErrorBoundary>
            <Outlet />
          </VtErrorBoundary>
        </main>
        <Footer />
        <CartDrawer />
      </div>
    </StorefrontProvider>
  );
}
