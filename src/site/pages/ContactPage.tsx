import { useState } from 'react'
import { createFileRoute } from '~/lib/router'
import { useMutation } from 'convex/react'
import { useQuery } from '@tanstack/react-query'
import { api } from 'convex/_generated/api'
import { cvq } from '~/lib/convex-helpers'
import { SdxlImage } from '~/components/SdxlImage'
import { SkeletonBox } from '~/components/Skeleton'

export const Route = createFileRoute('/contact')({
  validateSearch: () => ({}),
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(cvq(api.siteInfo.getAll, {}))
  },
  component: ContactPage,
})

function ContactPage() {
  const { data: siteInfo } = useQuery(cvq(api.siteInfo.getAll, {})) as {
    data: Record<string, string> | undefined
  }

  const phone = siteInfo ? siteInfo['phone'] || '…' : null
  const email = siteInfo ? siteInfo['email'] : null
  const address = siteInfo ? siteInfo['address'] || '…' : null
  const hours = siteInfo ? siteInfo['hours'] || '…' : null

  const heroPrompt =
    'ultra realistic Thai restaurant storefront exterior at dusk, warm golden light spilling from windows, traditional Thai signage, street view, cozy neighborhood, ambient street lighting, dark cinematic atmosphere, shallow depth of field, high detail, no people, no text, no watermark'

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
        Contact us
      </h1>
      <div className="mt-3 text-[color:var(--vt-muted)] max-w-2xl">
        Get in touch or book a table — we'll get back to you soon
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-[color:var(--vt-muted)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.03)] px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--vt-chili)]" />
          Dine in
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.03)] px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--vt-leaf)]" />
          Book a table
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.03)] px-3 py-2">
          Walk-ins welcome
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] p-6">
        <div className="text-sm font-semibold">Book a table</div>
        <BookingForm />
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] p-6">
          <div className="text-sm font-semibold">Send a message</div>
          <ContactForm />
        </div>

        <div className="rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-surface)] p-6 flex flex-col justify-between">
          <div>
            <div className="text-sm font-semibold">Shop info</div>
            <div className="mt-4 grid gap-2 text-sm text-[color:var(--vt-muted)]">
              <div className="flex items-center gap-2">
                <span className="text-[color:var(--vt-text)]">Phone:</span>{' '}
                {phone !== null ? (
                  <span>{phone}</span>
                ) : (
                  <SkeletonBox className="h-4 w-32 inline-block rounded" />
                )}
              </div>
              {siteInfo ? (
                email && (
                  <div>
                    <span className="text-[color:var(--vt-text)]">Email:</span>{' '}
                    <span>{email}</span>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[color:var(--vt-text)]">Email:</span>{' '}
                  <SkeletonBox className="h-4 w-40 inline-block rounded" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[color:var(--vt-text)]">Address:</span>{' '}
                {address !== null ? (
                  <span>{address}</span>
                ) : (
                  <SkeletonBox className="h-4 w-48 inline-block rounded" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[color:var(--vt-text)]">Hours:</span>{' '}
                {hours !== null ? (
                  <span>{hours}</span>
                ) : (
                  <SkeletonBox className="h-4 w-44 inline-block rounded" />
                )}
              </div>
              {siteInfo ? (
                (siteInfo['facebook'] || siteInfo['instagram']) && (
                  <div className="pt-1 flex gap-3 text-[color:var(--vt-text)]">
                    {siteInfo['facebook'] && (
                      <a
                        href={siteInfo['facebook']}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-[color:var(--vt-ivory)] underline"
                      >
                        Facebook
                      </a>
                    )}
                    {siteInfo['instagram'] && (
                      <a
                        href={`https://instagram.com/${siteInfo['instagram']}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-[color:var(--vt-ivory)] underline"
                      >
                        Instagram
                      </a>
                    )}
                  </div>
                )
              ) : (
                <div className="pt-1 flex gap-3">
                  <SkeletonBox className="h-4 w-16 rounded" />
                  <SkeletonBox className="h-4 w-16 rounded" />
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 overflow-hidden rounded-xl border border-[color:var(--vt-border)] aspect-[16/10]">
            {!siteInfo ? (
              <SkeletonBox className="w-full h-full" />
            ) : siteInfo['storefrontImageUrl'] ? (
              <img
                src={siteInfo['storefrontImageUrl']}
                alt="Restaurant exterior"
                className="aspect-[16/10] w-full object-cover opacity-95"
              />
            ) : (
              <SdxlImage
                prompt={heroPrompt}
                imageSize="landscape_16_9"
                alt="Restaurant exterior"
                className="aspect-[16/10] w-full object-cover opacity-95"
                loading="lazy"
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-10 overflow-hidden rounded-[26px] border border-[color:var(--vt-border)] aspect-[16/11]">
        {!siteInfo ? (
          <SkeletonBox className="w-full h-full" />
        ) : (
          <iframe
            title="Restaurant location"
            src={
              siteInfo['googleMapsEmbedUrl'] ||
              'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d196.88576900245346!2d145.1835198!3d-37.8562586!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6ad63ee2432dc289%3A0x6d37430b42be8614!2sVermont%20Thai!5e0!3m2!1sth!2sth!4v1781678399366!5m2!1sth!2sth'
            }
            className="aspect-[16/11] w-full"
            style={{
              border: 0,
              filter:
                'invert(0.9) hue-rotate(180deg) brightness(0.8) contrast(1.2)',
            }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
      </div>
    </div>
  )
}

function ContactForm() {
  const createContact = useMutation(api.contacts.create)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [topic, setTopic] = useState('')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createContact({
      name,
      phone,
      topic: topic || undefined,
      message,
      type: 'message',
    })
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="mt-5 rounded-xl bg-[color:rgba(34,197,94,0.1)] p-4 text-sm text-green-400">
        Message sent! We'll get back to you soon.
      </div>
    )
  }

  return (
    <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
      <Field
        label="Name"
        placeholder="Your name"
        value={name}
        onChange={setName}
      />
      <Field
        label="Phone"
        placeholder="+61 …"
        value={phone}
        onChange={setPhone}
      />
      <Field
        label="Topic"
        placeholder="Topic"
        value={topic}
        onChange={setTopic}
      />
      <div className="grid gap-2">
        <div className="text-xs text-[color:var(--vt-muted)]">Message</div>
        <textarea
          className="min-h-28 rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:rgba(255,246,233,0.18)]"
          placeholder="Additional details"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        className="mt-2 inline-flex items-center justify-center rounded-xl bg-[color:var(--vt-ivory)] px-4 py-2 text-sm text-black hover:bg-white"
      >
        Send message
      </button>
      <div className="text-xs text-[color:var(--vt-muted)]">
        We will call to confirm transfer/payment details
      </div>
    </form>
  )
}

function BookingForm() {
  const createReservation = useMutation(api.reservations.create)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [numberOfGuests, setNumberOfGuests] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createReservation({
      customerName: name,
      customerPhone: phone,
      numberOfGuests: Number(numberOfGuests),
      date,
      time,
      notes: notes || undefined,
    })
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="mt-5 rounded-xl bg-[color:rgba(34,197,94,0.1)] p-4 text-sm text-green-400">
        Reservation request sent! We'll call to confirm.
      </div>
    )
  }

  return (
    <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
      <Field
        label="Name"
        placeholder="Your name"
        value={name}
        onChange={setName}
      />
      <Field
        label="Phone"
        placeholder="+61 …"
        value={phone}
        onChange={setPhone}
      />
      <Field
        label="Number of guests"
        placeholder="2"
        value={numberOfGuests}
        onChange={setNumberOfGuests}
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <div className="text-xs text-[color:var(--vt-muted)]">Date</div>
          <input
            type="date"
            className="rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:rgba(255,246,233,0.18)]"
            value={date}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <div className="text-xs text-[color:var(--vt-muted)]">Time</div>
          <input
            type="time"
            className="rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:rgba(255,246,233,0.18)]"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid gap-2">
        <div className="text-xs text-[color:var(--vt-muted)]">Notes</div>
        <textarea
          className="min-h-28 rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:rgba(255,246,233,0.18)]"
          placeholder="Additional details"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="mt-2 inline-flex items-center justify-center rounded-xl bg-[color:var(--vt-ivory)] px-4 py-2 text-sm text-black hover:bg-white"
      >
        Submit booking
      </button>
      <div className="text-xs text-[color:var(--vt-muted)]">
        We will call to confirm your reservation
      </div>
    </form>
  )
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="grid gap-2">
      <div className="text-xs text-[color:var(--vt-muted)]">{label}</div>
      <input
        className="rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:rgba(255,246,233,0.18)]"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </label>
  )
}
