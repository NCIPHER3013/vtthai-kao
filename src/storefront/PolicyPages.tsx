import type { ReactNode } from 'react';
import { Phone, MapPin } from 'lucide-react';

const PHONE_DISPLAY = '+61 3 9802 1888';
const PHONE_TEL = 'tel:+61398021888';
const ADDRESS = '503A Burwood Hwy, Vermont South VIC 3133, Australia';
const UPDATED = '24 September 2026';

function PolicyShell({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-[color:var(--vt-muted)]">Last updated: {UPDATED}</p>
      <p className="mt-5 text-sm leading-relaxed text-[color:var(--vt-text)]">{intro}</p>
      <div className="mt-8 space-y-8">{children}</div>

      <div className="mt-12 rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-card)] p-6">
        <h2 className="text-lg font-semibold">Contact us about your data</h2>
        <div className="mt-4 space-y-3 text-sm text-[color:var(--vt-muted)]">
          <a href={PHONE_TEL} className="flex items-center gap-3 hover:text-[color:var(--vt-text)]">
            <Phone className="h-4 w-4 text-[color:var(--vt-accent)]" /> {PHONE_DISPLAY}
          </a>
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-[color:var(--vt-accent)]" /> {ADDRESS}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold">{heading}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-[color:var(--vt-muted)]">{children}</div>
    </section>
  );
}

export function PrivacyPage() {
  return (
    <PolicyShell
      title="Privacy Policy"
      intro={
        <>
          Vermont Thai ("we", "us") operates this website for online ordering, table bookings and customer
          enquiries. This policy explains what personal information we collect, why we collect it, and how we protect
          it. We follow the Australian Privacy Principles under the Privacy Act 1988 (Cth).
        </>
      }
    >
      <Section heading="1. Information we collect">
        <p>
          <strong className="text-[color:var(--vt-text)]">When you place an order:</strong> your name, phone number,
          delivery address (for deliveries), order items and notes you provide. If you add your email, we use it to
          identify your loyalty account and points.
        </p>
        <p>
          <strong className="text-[color:var(--vt-text)]">When you book a table:</strong> your name, phone number,
          number of guests, requested date and time, and any notes (for example allergies).
        </p>
        <p>
          <strong className="text-[color:var(--vt-text)]">When you scan a table QR code:</strong> we link your order to
          the table you are seated at so staff can serve your bill.
        </p>
        <p>
          <strong className="text-[color:var(--vt-text)]">Technical data:</strong> standard web server logs (such as
          browser type and pages visited) kept for security and troubleshooting.
        </p>
      </Section>

      <Section heading="2. How we use your information">
        <p>We use your information to prepare and deliver your food, confirm orders and bookings by phone, manage
        loyalty points, respond to your enquiries, meet our tax and legal record-keeping obligations, and keep the
        website secure. We do not sell your personal information, and we do not use it for third-party advertising.</p>
      </Section>

      <Section heading="3. Storage and security">
        <p>Your information is stored in a secure cloud database (Supabase) protected by access controls. Only our
        staff can view order, booking and customer records through our point-of-sale back office. Payment card numbers
        are not collected or stored through this website.</p>
      </Section>

      <Section heading="4. Third-party services">
        <p>This website embeds Google Maps so you can find us, and loads fonts from Google. When these load, those
        providers may receive your IP address. Our database and file storage are hosted by Supabase. These providers
        process data only to deliver their services to us.</p>
      </Section>

      <Section heading="5. Cookies and local storage">
        <p>We keep only what is needed in your browser for the site to work — for example remembering your cart while
        you order. Staff terminals store a session marker so staff do not have to log in repeatedly. We do not use
        advertising or tracking cookies.</p>
      </Section>

      <Section heading="6. Your choices">
        <p>You can order as a guest without giving an email. You may ask us at any time what information we hold about
        you, ask for a correction, or ask us to delete your customer profile. See our{' '}
        <a href="/data-deletion" className="text-[color:var(--vt-accent)] underline">Data Deletion Policy</a> for how
        deletion works.</p>
      </Section>

      <Section heading="7. Changes to this policy">
        <p>If we change this policy we will update the "Last updated" date above. Continued use of the website after a
        change means you accept the updated policy.</p>
      </Section>
    </PolicyShell>
  );
}

export function DataDeletionPage() {
  return (
    <PolicyShell
      title="Data Deletion Policy"
      intro={
        <>
          You can ask us to delete the personal information we hold about you at any time. This page explains exactly
          what we delete, what we must keep, and how to make a request. It forms part of our{' '}
          <a href="/privacy" className="text-[color:var(--vt-accent)] underline">
            Privacy Policy
          </a>
          .
        </>
      }
    >
      <Section heading="1. How to request deletion">
        <p>Call us on{' '}
          <a href="tel:+61398021888" className="text-[color:var(--vt-accent)] underline">{PHONE_DISPLAY}</a>{' '}
          or visit the restaurant and tell our staff: "I want to delete my data." Give us the name and phone number you
          used when ordering or booking, so we can find your records. You do not need to give a reason.</p>
      </Section>

      <Section heading="2. What we delete">
        <p>Within 30 days of your request we permanently delete your customer profile, including your name, phone
        number, email address, loyalty points balance, saved contact details, table bookings and any notes attached to
        your profile. This cannot be undone.</p>
      </Section>

      <Section heading="3. What we must keep">
        <p>Australian tax law requires us to keep records of sales transactions (including the items, amounts and dates
        of orders) for up to 7 years. When you request deletion we remove your personal details from these records or
        replace them with an anonymous reference, so remaining data can no longer be linked to you. Records we are
        legally required to keep are never used for any other purpose.</p>
      </Section>

      <Section heading="4. If you used Facebook or Google to interact with us">
        <p>Deleting your account with Facebook or Google does not automatically delete data held by us. To remove your
        information from our systems, please make a request directly using the contact details above. We do not receive
        or store your social media passwords.</p>
      </Section>

      <Section heading="5. Confirmation">
        <p>Once your data is deleted we will confirm by phone or in person. If you change your mind and order again in
        the future, a new profile is created from scratch with no link to your old data.</p>
      </Section>
    </PolicyShell>
  );
}
