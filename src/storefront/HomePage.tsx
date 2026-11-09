import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Phone, Bike, QrCode, CalendarDays, Star, ShieldCheck, Clock } from 'lucide-react';
import { fetchProducts } from '../lib/api/products';
import type { Product } from '../lib/supabase';
import { formatAUD, isCustomerFacing, BANNER_URL } from './types';

const DOORS = [
  {
    icon: Bike,
    title: 'Delivery',
    desc: 'Order online and we deliver straight to your door — fresh from the kitchen, 7 days a week.',
    cta: 'Order now',
    to: '/order',
    highlight: true,
  },
  {
    icon: QrCode,
    title: 'Dine in',
    desc: 'Join us in store — walk-ins welcome, or scan the QR code on your table to order at your own pace.',
    cta: 'Find us',
    to: '/contact',
    highlight: false,
  },
  {
    icon: CalendarDays,
    title: 'Book a table',
    desc: 'Planning ahead? Reserve online or give us a call and we will have your table ready.',
    cta: 'Reserve',
    to: '/contact',
    highlight: false,
  },
];

const STEPS = [
  { icon: ShoppingBag, step: '1', title: 'Order online', desc: 'Pick your dishes from the menu and check out — no app needed.' },
  { icon: Phone, step: '2', title: 'We call to confirm', desc: 'Every order gets a quick confirmation call before the kitchen starts.' },
  { icon: Bike, step: '3', title: 'Delivered hot', desc: 'Your food leaves the kitchen fresh and goes straight to your door.' },
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts(true)
      .then((rows) => setProducts(rows.filter(isCustomerFacing)))
      .catch(() => setProducts([]));
  }, []);

  const featured = products.filter((p) => p.image_url).slice(0, 8);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="vt-hero-glow pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-14 md:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.02fr,0.98fr]">
            <div className="vt-fade-up">
              <div className="vt-glass inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-xs text-[color:var(--vt-text)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--vt-accent)] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--vt-accent)]" />
                </span>
                We call to confirm every order before cooking
              </div>
              <h1 className="mt-7 text-5xl font-medium leading-[1.04] tracking-tight md:text-7xl">
                Vermont
                <span className="vt-gradient-text block">Thai Cuisine</span>
              </h1>
              <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-[color:var(--vt-muted)]">
                Bold, clean Thai flavours — with vegetarian options. Order online and we
                deliver fresh to your door, 7 days a week.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link to="/order" className="vt-btn-primary vt-glow px-8 py-4 text-sm">
                  Order delivery
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/contact"
                  className="vt-glass rounded-full px-6 py-3.5 text-sm font-semibold text-[color:var(--vt-text)] transition-colors hover:border-[color:rgba(232,53,63,0.5)]"
                >
                  Book a table
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(closest-side,rgba(232,53,63,0.28),transparent)] blur-2xl" />
              <div className="relative overflow-hidden rounded-[32px] border border-[color:rgba(255,255,255,0.14)] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]">
                <img
                  src={BANNER_URL}
                  alt="Vermont Thai banner"
                  className="aspect-[1000/720] w-full object-cover object-left"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              </div>
              <div className="vt-float absolute -left-4 top-8 md:-left-8">
                <div className="vt-glass flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--vt-accent)]">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold leading-none">Open 7 days</div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-[color:var(--vt-muted)]">
                      16:30 – 21:30
                    </div>
                  </div>
                </div>
              </div>
              <div className="vt-float-slow absolute -right-3 bottom-10 md:-right-6">
                <div className="vt-glass flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl">
                  <ShieldCheck className="h-5 w-5 text-[color:var(--vt-leaf)]" />
                  <div>
                    <div className="text-sm font-bold leading-none">Dine in & Takeaway</div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-[color:var(--vt-muted)]">
                      Fresh from our kitchen
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Experience */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="vt-overline">Experience</div>
        <h2 className="mt-3 text-2xl font-medium tracking-tight md:text-4xl">However you like to enjoy Thai</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {DOORS.map((door) => (
            <Link
              key={door.title}
              to={door.to}
              className="vt-card group relative overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[color:rgba(232,53,63,0.45)] hover:shadow-[0_20px_50px_-20px_rgba(232,53,63,0.4)]"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[color:var(--vt-accent)] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-20" />
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff7a52] to-[color:var(--vt-accent)] shadow-[0_10px_24px_-8px_rgba(232,53,63,0.6)]">
                <door.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-5 font-serif text-xl">{door.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[color:var(--vt-muted)]">{door.desc}</p>
              <div className="mt-5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--vt-accent)]">
                  {door.cta}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
                {door.highlight && (
                  <span className="rounded-full bg-[color:var(--vt-accent-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--vt-accent)]">
                    Online
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How delivery works */}
      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="vt-card relative overflow-hidden p-8 md:p-10">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[color:var(--vt-accent)] opacity-[0.08] blur-3xl" />
          <div className="vt-overline">How delivery works</div>
          <h2 className="mt-3 text-2xl font-medium tracking-tight md:text-3xl">From our kitchen to your door</h2>
          <div className="relative mt-10 grid gap-10 md:grid-cols-3 md:gap-6">
            <div className="absolute left-[16.6%] right-[16.6%] top-7 hidden border-t-2 border-dashed border-[color:var(--vt-border)] md:block" />
            {STEPS.map((s) => (
              <div key={s.step} className="relative flex items-start gap-4">
                <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff7a52] to-[color:var(--vt-accent)] shadow-[0_10px_24px_-8px_rgba(232,53,63,0.6)]">
                  <s.icon className="h-5 w-5 text-white" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--vt-bg)] text-[10px] font-extrabold text-[color:var(--vt-accent)] ring-1 ring-[color:var(--vt-border)]">
                    {s.step}
                  </span>
                </div>
                <div className="pt-1">
                  <div className="font-semibold">{s.title}</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--vt-muted)]">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Signature dishes */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-14">
          <div className="vt-overline">From the kitchen</div>
          <div className="mt-3 flex items-end justify-between">
            <h2 className="text-2xl font-medium tracking-tight md:text-4xl">Signature dishes</h2>
            <Link
              to="/order"
              className="text-sm font-semibold text-[color:var(--vt-accent)] transition-colors hover:text-[color:var(--vt-text)]"
            >
              Full menu →
            </Link>
          </div>
          <div className="mt-9 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {featured.map((p) => (
              <Link key={p.id} to="/order" className="group">
                <div className="relative overflow-hidden rounded-[22px] ring-1 ring-[color:var(--vt-border)] transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[0_24px_50px_-20px_rgba(232,53,63,0.45)] group-hover:ring-[color:rgba(232,53,63,0.4)]">
                  <img
                    src={p.image_url}
                    alt={p.name}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute bottom-2.5 right-2.5 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                    {formatAUD(p.price)}
                  </div>
                </div>
                <div className="mt-3.5 text-sm font-semibold leading-snug group-hover:text-[color:var(--vt-accent)]">
                  {p.name}
                </div>
                {p.description && (
                  <p className="mt-1 line-clamp-1 text-xs text-[color:var(--vt-muted)]">{p.description}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Contact strip */}
      <section className="mx-auto max-w-6xl px-5 pb-6 pt-10">
        <div className="vt-card grid gap-10 p-8 md:grid-cols-3 md:p-10">
          <div>
            <div className="vt-overline">Visit us</div>
            <p className="mt-3 leading-relaxed text-[color:var(--vt-muted)]">
              503A Burwood Hwy,
              <br />
              Vermont South VIC 3133
            </p>
          </div>
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-wider text-[color:var(--vt-accent)]">
              Opening hours
            </div>
            <p className="mt-3 leading-relaxed text-[color:var(--vt-muted)]">
              Open 7 days
              <br />
              16:30 – 21:30
            </p>
            <a href="tel:+61398021888" className="mt-3 inline-block text-sm font-semibold text-[color:var(--vt-accent)] hover:underline">
              +61 3 9802 1888
            </a>
          </div>
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-wider text-[color:var(--vt-accent)]">
              Book a table
            </div>
            <p className="mt-3 leading-relaxed text-[color:var(--vt-muted)]">
              Walk-ins welcome. Book online or give us a call and we will have your table ready.
            </p>
            <Link to="/contact" className="vt-btn-primary vt-glow mt-5 px-6 py-3 text-sm">
              Book a table
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
