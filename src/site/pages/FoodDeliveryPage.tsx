import { Link, createFileRoute } from '~/lib/router'
import * as React from 'react'

export const Route = createFileRoute('/food-delivery')({
  component: FoodDeliveryPage,
})

function FoodDeliveryPage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_20%,rgba(239,68,68,0.18),transparent_58%),radial-gradient(900px_circle_at_85%_70%,rgba(34,197,94,0.14),transparent_60%),radial-gradient(700px_circle_at_35%_85%,rgba(255,246,233,0.08),transparent_60%)]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />

        <div className="mx-auto max-w-6xl px-5 pt-14 pb-10 md:pt-20 md:pb-16 relative">
          <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-10 items-center">
            <div className="vt-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full bg-[color:rgba(255,246,233,0.08)] px-4 py-2 text-xs text-[color:var(--vt-ivory)] ring-1 ring-[color:rgba(255,246,233,0.14)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--vt-chili)]" />
                Free delivery available — conditions apply
              </div>

              <h1 className="mt-6 text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08]">
                Food Delivery
                <span className="block text-[color:rgba(255,246,233,0.92)]">
                  Premium Thai to your door
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-[color:var(--vt-muted)] leading-relaxed">
                Bold, authentic Thai flavours delivered fresh to your home. We
                cook every order after confirmation so your food arrives hot and
                at its best — never pre-made, never sitting under a heat lamp.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/menu"
                  search={{ mode: 'delivery' }}
                  className="rounded-xl bg-[color:var(--vt-ivory)] px-5 py-3 text-sm text-black hover:bg-white transition-colors"
                >
                  Order delivery now
                </Link>
                <a
                  href="#how-it-works"
                  className="rounded-xl bg-[color:rgba(255,255,255,0.06)] px-5 py-3 text-sm ring-1 ring-[color:var(--vt-border)] hover:bg-[color:rgba(255,255,255,0.1)] transition-colors"
                >
                  How it works
                </a>
              </div>
            </div>

            <div className="relative vt-fade-up [animation-delay:120ms]">
              <div className="absolute -inset-8 bg-[radial-gradient(700px_circle_at_40%_30%,rgba(239,68,68,0.22),transparent_60%),radial-gradient(700px_circle_at_70%_75%,rgba(34,197,94,0.18),transparent_60%)] blur-2xl opacity-70" />
              <div className="relative overflow-hidden rounded-[26px] border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] aspect-[1000/563]">
                <img
                  src="/delivery.webp"
                  alt="Thai food delivery hero"
                  width={1000}
                  height={563}
                  className="relative w-full h-auto block opacity-95 aspect-[1000/563]"
                  loading="eager"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[color:var(--vt-muted)]">
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.03)] px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--vt-chili)]" />
                  Packed for delivery
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.03)] px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--vt-leaf)]" />
                  Cooked after confirmation
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.03)] px-3 py-2">
                  AUD pricing
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-sm text-[color:var(--vt-muted)]">
            Why order from us
          </div>
          <h2 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">
            Not your average delivery
          </h2>
          <p className="mt-3 text-sm text-[color:var(--vt-muted)] leading-relaxed">
            We do things differently. Every dish is prepared fresh after you
            confirm — because great Thai food deserves to be eaten at its peak.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HighlightCard
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            }
            title="Fresh to order"
            body="Cooking starts only after you confirm and pay. No pre-made batches sitting around — every dish is made just for you."
          />
          <HighlightCard
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            }
            title="We call you first"
            body="After you place an order online, our team calls to confirm items, delivery fee, and payment — no surprises."
          />
          <HighlightCard
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            }
            title="Local delivery"
            body="We deliver within our local area. Enter your address at checkout and we'll confirm delivery availability and fee."
          />
          <HighlightCard
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
            title="Secure packaging"
            body="Each dish is carefully packed in sealed containers to maintain temperature, freshness, and prevent spills during transit."
          />
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-5 py-14">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-sm text-[color:var(--vt-muted)]">
            Simple process
          </div>
          <h2 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">
            How delivery works
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-4">
          <StepCard
            no="01"
            title="Browse & add"
            body="Explore our full menu, choose your dishes, and add them to your cart. Specify spice levels and any allergy notes for each item."
          />
          <StepCard
            no="02"
            title="Enter details"
            body="Fill in your delivery address and any special instructions (e.g. ring doorbell, leave at door). All prices shown in AUD."
          />
          <StepCard
            no="03"
            title="We call to confirm"
            body="Our team will phone you to verify your order, confirm the delivery fee for your area, and arrange payment."
          />
          <StepCard
            no="04"
            title="Cook & deliver"
            body="Once payment is confirmed, your food is freshly prepared and delivered to your door. Track status via your order number."
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-[24px] border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:rgba(239,68,68,0.1)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[color:var(--vt-chili)]"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Delivery area & fees</h3>
            </div>
            <div className="mt-5 space-y-3 text-sm text-[color:var(--vt-muted)] leading-relaxed">
              <p>
                We deliver within our local area around Vermont Thai. The
                delivery fee depends on your distance from our restaurant and
                will be confirmed when we call you.
              </p>
              <p>
                <span className="text-[color:var(--vt-text)] font-medium">
                  Minimum order
                </span>{' '}
                may apply for delivery. Free delivery promotions may be
                available — check our{' '}
                <Link
                  to="/special-offers"
                  className="text-[color:var(--vt-ivory)] underline underline-offset-2 hover:text-white transition-colors"
                >
                  special offers
                </Link>{' '}
                page for current deals.
              </p>
              <p>
                If you're outside our delivery zone, you can always order for{' '}
                <Link
                  to="/menu"
                  search={{ mode: 'takeaway' }}
                  className="text-[color:var(--vt-ivory)] underline underline-offset-2 hover:text-white transition-colors"
                >
                  takeaway pickup
                </Link>{' '}
                instead.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:rgba(34,197,94,0.1)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[color:var(--vt-leaf)]"
                >
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" x2="22" y1="10" y2="10" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Payment</h3>
            </div>
            <div className="mt-5 space-y-3 text-sm text-[color:var(--vt-muted)] leading-relaxed">
              <p>
                <span className="text-[color:var(--vt-text)] font-medium">
                  All prices are in AUD
                </span>
                . Payment method is confirmed during our confirmation call — we
                accept cash and card payments.
              </p>
              <p>
                For card payments, we'll process the transaction securely over
                the phone. Your card details are never stored on our website.
              </p>
              <p>
                A 10% GST is included in all displayed prices. The total shown
                in your cart is the final amount you pay (plus delivery fee if
                applicable).
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-sm text-[color:var(--vt-muted)]">
            Common questions
          </div>
          <h2 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">
            Delivery FAQ
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <FaqCard
            question="How long does delivery take?"
            answer="Typically 30–50 minutes from payment confirmation, depending on order size and distance. We'll give you a more accurate estimate when we call to confirm."
          />
          <FaqCard
            question="Can I track my order?"
            answer="Yes — after your order is confirmed, you'll receive an order number. Visit our Track Order page and enter your number to see the current status."
          />
          <FaqCard
            question="Do you cater for allergies or dietary needs?"
            answer="Absolutely. Each menu item has an allergy notes field where you can specify requirements (e.g. no peanuts, gluten-free, vegan). We take dietary needs seriously."
          />
          <FaqCard
            question="What if I need to change or cancel my order?"
            answer="Please call us as soon as possible. If cooking hasn't started yet, we can modify or cancel your order. Once cooking begins, changes may not be possible."
          />
          <FaqCard
            question="Is there a minimum order amount?"
            answer="A minimum order may apply for delivery depending on your distance. We'll confirm this when we call. No minimum for takeaway pickup."
          />
          <FaqCard
            question="What are your delivery hours?"
            answer="Delivery is available during our normal trading hours. Place your order online anytime and we'll confirm availability during our confirmation call."
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="relative rounded-[28px] border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(600px_circle_at_50%_50%,rgba(239,68,68,0.12),transparent_60%),radial-gradient(600px_circle_at_80%_20%,rgba(34,197,94,0.08),transparent_60%)]" />
          <div className="relative px-8 py-12 md:px-14 md:py-16 text-center">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Ready to order?
            </h2>
            <p className="mt-3 max-w-lg mx-auto text-[color:var(--vt-muted)] leading-relaxed">
              Browse our full menu, build your order, and we'll take care of the
              rest. Fresh Thai food, delivered to your door.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/menu"
                search={{ mode: 'delivery' }}
                className="rounded-xl bg-[color:var(--vt-ivory)] px-6 py-3 text-sm text-black hover:bg-white transition-colors"
              >
                Go to menu to order delivery
              </Link>
              <Link
                to="/contact"
                className="rounded-xl bg-[color:rgba(255,255,255,0.06)] px-6 py-3 text-sm ring-1 ring-[color:var(--vt-border)] hover:bg-[color:rgba(255,255,255,0.1)] transition-colors"
              >
                Call us directly
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function HighlightCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] p-6 group hover:border-[color:rgba(255,255,255,0.14)] transition-colors">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:rgba(255,255,255,0.06)] text-[color:var(--vt-ivory)]">
        {icon}
      </div>
      <div className="mt-4 text-base font-semibold">{title}</div>
      <div className="mt-2 text-sm text-[color:var(--vt-muted)] leading-relaxed">
        {body}
      </div>
    </div>
  )
}

function StepCard({
  no,
  title,
  body,
}: {
  no: string
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] p-6 relative">
      <div className="absolute top-6 right-6 text-3xl font-bold text-[color:rgba(255,255,255,0.04)] leading-none">
        {no}
      </div>
      <div className="text-xs tracking-[0.24em] text-[color:var(--vt-leaf)]">
        STEP {no}
      </div>
      <div className="mt-2 text-lg font-semibold">{title}</div>
      <div className="mt-2 text-sm text-[color:var(--vt-muted)] leading-relaxed">
        {body}
      </div>
    </div>
  )
}

function FaqCard({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] p-6 hover:border-[color:rgba(255,255,255,0.14)] transition-colors">
      <h3 className="text-sm font-semibold leading-snug">{question}</h3>
      <p className="mt-2 text-sm text-[color:var(--vt-muted)] leading-relaxed">
        {answer}
      </p>
    </div>
  )
}
