import { useState } from 'react';
import { CheckCircle2, Loader2, Phone, MapPin, Clock, Bike, ExternalLink, Star, Facebook, Instagram } from 'lucide-react';
import { createReservation, createContact } from '../lib/api';

const PHONE_DISPLAY = '+61 3 9802 1888';
const PHONE_TEL = 'tel:+61398021888';
const ADDRESS = '503A Burwood Hwy, Vermont South VIC 3133, Australia';
const MAPS_LINK = 'https://www.google.com/maps/search/?api=1&query=503A+Burwood+Hwy+Vermont+South+VIC+3133';
const MAPS_EMBED = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d196.88576900245346!2d145.1835198!3d-37.8562586!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6ad63ee2432dc289%3A0x6d37430b42be8614!2sVermont%20Thai!5e0!3m2!1sth!2sth!4v1781678399366!5m2!1sth!2sth';
const TODAY = new Date().toISOString().slice(0, 10);

const inputCls =
  'w-full rounded-xl border border-[color:var(--vt-border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2.5 text-sm focus:outline-none focus:border-[color:var(--vt-accent)] [color-scheme:dark]';
const labelCls = 'text-xs text-[color:var(--vt-muted)]';
const submitCls =
  'vt-glow mt-2 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#ff7a52] to-[color:var(--vt-accent)] px-4 py-3.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50';
const noteCls = 'text-xs text-[color:var(--vt-muted)]';
const cardCls = 'vt-card p-6';

export default function ContactPage() {
  const [book, setBook] = useState({ name: '', phone: '', guests: '2', date: '', time: '', notes: '' });
  const [msg, setMsg] = useState({ name: '', phone: '', topic: '', message: '' });
  const [bookState, setBookState] = useState<'idle' | 'submitting' | 'done'>('idle');
  const [bookErr, setBookErr] = useState('');
  const [bookFallback, setBookFallback] = useState(false);
  const [msgState, setMsgState] = useState<'idle' | 'submitting' | 'done'>('idle');
  const [msgErr, setMsgErr] = useState('');
  const [msgFallback, setMsgFallback] = useState(false);

  const bindBook = (k: keyof typeof book) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setBook((f) => ({ ...f, [k]: e.target.value }));
  const bindMsg = (k: keyof typeof msg) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setMsg((f) => ({ ...f, [k]: e.target.value }));

  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookErr('');
    if (!book.name.trim() || !book.phone.trim() || !book.date || !book.time) {
      setBookErr('Please fill in name, phone, date and time.');
      return;
    }
    setBookState('submitting');
    try {
      await createReservation({ name: book.name.trim(), phone: book.phone.trim(), guests: parseInt(book.guests, 10) || 2, date: book.date, time: book.time, notes: book.notes.trim() || null });
      setBookState('done');
    } catch (err: any) {
      if (err?.code === '42P01' || /could not find the table/i.test(err?.message || '')) {
        setBookFallback(true);
      } else {
        setBookErr(err?.message || 'Something went wrong. Please call us to book.');
      }
    } finally {
      setBookState((s) => (s === 'submitting' ? 'idle' : s));
    }
  };

  const submitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgErr('');
    if (!msg.name.trim() || !msg.phone.trim() || !msg.topic.trim() || !msg.message.trim()) {
      setMsgErr('Please fill in all fields.');
      return;
    }
    setMsgState('submitting');
    try {
      await createContact({ name: msg.name.trim(), phone: msg.phone.trim(), topic: msg.topic.trim(), message: msg.message.trim() });
      setMsgState('done');
    } catch (err: any) {
      if (err?.code === '42P01' || /could not find the table/i.test(err?.message || '')) {
        setMsgFallback(true);
      } else {
        setMsgErr(err?.message || 'Something went wrong. Please call us instead.');
      }
    } finally {
      setMsgState((s) => (s === 'submitting' ? 'idle' : s));
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Contact us</h1>
      <div className="mt-3 max-w-2xl text-sm text-[color:var(--vt-muted)]">
        Get in touch or book a table — we'll get back to you soon
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-[color:var(--vt-muted)]">
        <div className="vt-glass inline-flex items-center gap-2 rounded-full px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--vt-accent)]" />
          Dine in
        </div>
        <div className="vt-glass inline-flex items-center gap-2 rounded-full px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--vt-leaf)]" />
          Book a table
        </div>
        <div className="vt-glass inline-flex items-center gap-2 rounded-full px-3 py-2">
          Walk-ins welcome
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(232,53,63,0.35)] bg-[color:var(--vt-accent-soft)] px-3 py-2 font-semibold text-[color:var(--vt-accent)]">
          <Star className="h-3.5 w-3.5" />
          Lunch pre-orders
        </div>
      </div>

      <div className={`${cardCls} mt-10`}>
        <div className="text-sm font-semibold">Book a table</div>
        {bookState === 'done' ? (
          <div className="mt-5 flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="h-14 w-14 text-[color:var(--vt-leaf)]" />
            <div className="text-lg font-semibold">Booking received</div>
            <p className="text-sm text-[color:var(--vt-muted)] leading-relaxed">
              Thank you, {book.name.trim()}! We will call {book.phone.trim()} to confirm your table for {book.guests} on{' '}
              {book.date} at {book.time}.
            </p>
          </div>
        ) : (
          <form className="mt-5 grid gap-3" onSubmit={submitBooking}>
            {bookErr && (
              <div className="rounded-xl border border-[color:rgba(232,53,63,0.3)] bg-[color:rgba(232,53,63,0.08)] px-4 py-3 text-sm text-[color:var(--vt-accent)]">
                {bookErr}
              </div>
            )}
            {bookFallback && (
              <div className="rounded-xl border border-[color:rgba(232,53,63,0.3)] bg-[color:rgba(232,53,63,0.08)] px-4 py-3 text-sm text-[color:var(--vt-text)]">
                Online booking is warming up. Please call{' '}
                <a href={PHONE_TEL} className="font-bold text-[color:var(--vt-accent)] underline">
                  {PHONE_DISPLAY}
                </a>{' '}
                and we'll save you a table.
              </div>
            )}
            <label className="grid gap-2">
              <div className={labelCls}>Name</div>
              <input value={book.name} onChange={bindBook('name')} placeholder="Your name" className={inputCls} />
            </label>
            <label className="grid gap-2">
              <div className={labelCls}>Phone</div>
              <input value={book.phone} onChange={bindBook('phone')} placeholder="+61 …" type="tel" className={inputCls} />
            </label>
            <label className="grid gap-2">
              <div className={labelCls}>Number of guests</div>
              <input value={book.guests} onChange={bindBook('guests')} type="number" min={1} max={30} className={inputCls} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2">
                <div className={labelCls}>Date</div>
                <input value={book.date} onChange={bindBook('date')} min={TODAY} type="date" className={inputCls} />
              </label>
              <label className="grid gap-2">
                <div className={labelCls}>Time</div>
                <input value={book.time} onChange={bindBook('time')} min="16:30" max="21:00" type="time" className={inputCls} />
              </label>
            </div>
            <label className="grid gap-2">
              <div className={labelCls}>Notes</div>
              <textarea
                value={book.notes}
                onChange={bindBook('notes')}
                placeholder="Additional details"
                className={`${inputCls} min-h-28`}
              />
            </label>
            <button type="submit" disabled={bookState === 'submitting'} className={submitCls}>
              {bookState === 'submitting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit booking
            </button>
            <div className={noteCls}>We will call to confirm your reservation</div>
          </form>
        )}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className={cardCls}>
          <div className="text-sm font-semibold">Send a message</div>
          {msgState === 'done' ? (
            <div className="mt-5 flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-[color:var(--vt-leaf)]" />
              <div className="font-semibold">Message sent</div>
              <p className="text-sm text-[color:var(--vt-muted)]">
                Thanks {msg.name.trim()}! We will call you back on {msg.phone.trim()}.
              </p>
            </div>
          ) : (
            <form className="mt-5 grid gap-3" onSubmit={submitMessage}>
              {msgErr && (
                <div className="rounded-xl border border-[color:rgba(232,53,63,0.3)] bg-[color:rgba(232,53,63,0.08)] px-4 py-3 text-sm text-[color:var(--vt-accent)]">
                  {msgErr}
                </div>
              )}
              {msgFallback && (
                <div className="rounded-xl border border-[color:rgba(232,53,63,0.3)] bg-[color:rgba(232,53,63,0.08)] px-4 py-3 text-sm text-[color:var(--vt-text)]">
                  Messages are warming up. Please call{' '}
                  <a href={PHONE_TEL} className="font-bold text-[color:var(--vt-accent)] underline">
                    {PHONE_DISPLAY}
                  </a>
                  .
                </div>
              )}
              <label className="grid gap-2">
                <div className={labelCls}>Name</div>
                <input value={msg.name} onChange={bindMsg('name')} placeholder="Your name" className={inputCls} />
              </label>
              <label className="grid gap-2">
                <div className={labelCls}>Phone</div>
                <input value={msg.phone} onChange={bindMsg('phone')} placeholder="+61 …" type="tel" className={inputCls} />
              </label>
              <label className="grid gap-2">
                <div className={labelCls}>Topic</div>
                <input value={msg.topic} onChange={bindMsg('topic')} placeholder="Topic" className={inputCls} />
              </label>
              <label className="grid gap-2">
                <div className={labelCls}>Message</div>
                <textarea
                  value={msg.message}
                  onChange={bindMsg('message')}
                  placeholder="Additional details"
                  className={`${inputCls} min-h-28`}
                />
              </label>
              <button type="submit" disabled={msgState === 'submitting'} className={submitCls}>
                {msgState === 'submitting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send message
              </button>
              <div className={noteCls}>We will call to confirm transfer/payment details</div>
            </form>
          )}
        </div>

        <div className={`${cardCls} flex flex-col justify-between`}>
          <div>
            <div className="text-sm font-semibold">Shop info</div>
            <div className="mt-4 grid gap-2 text-sm text-[color:var(--vt-muted)]">
              <div className="flex items-center gap-2">
                <span className="text-[color:var(--vt-text)]">Phone:</span>
                <a href={PHONE_TEL} className="hover:text-[color:var(--vt-accent)]">
                  {PHONE_DISPLAY}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[color:var(--vt-text)]">Email:</span>
                <a href="mailto:vermontthai@hotmail.com" className="break-all hover:text-[color:var(--vt-accent)]">
                  vermontthai@hotmail.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[color:var(--vt-text)]">Facebook:</span>
                <a
                  href="https://www.facebook.com/VermontThai/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-[color:var(--vt-accent)]"
                >
                  <Facebook className="h-3.5 w-3.5" /> Vermont Thai
                </a>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-[color:var(--vt-text)]">Address:</span>
                <span>{ADDRESS}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-[color:var(--vt-text)]">Hours:</span>
                <span>
                  Mon–Sun 16:30–21:30
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-[color:var(--vt-text)]">Delivery:</span>
                <span>Mon–Sun 16:30–21:30</span>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <a
              href={PHONE_TEL}
              className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--vt-border)] py-3 text-sm font-semibold hover:border-[color:var(--vt-accent)] hover:text-[color:var(--vt-accent)]"
            >
              <Phone className="h-4 w-4" /> Call
            </a>
            <a
              href={MAPS_LINK}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--vt-border)] py-3 text-sm font-semibold hover:border-[color:var(--vt-accent)] hover:text-[color:var(--vt-accent)]"
            >
              <MapPin className="h-4 w-4" /> Directions
            </a>
            <a
              href="https://www.facebook.com/VermontThai/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--vt-border)] py-3 text-sm font-semibold hover:border-[color:var(--vt-accent)] hover:text-[color:var(--vt-accent)]"
            >
              <Facebook className="h-4 w-4" /> Facebook
            </a>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          { icon: Clock, title: 'Open 7 days', desc: '16:30 – 21:30, dine in & takeaway' },
          { icon: Bike, title: 'Delivery', desc: 'Same hours — order on our Menu page' },
          { icon: Star, title: 'Lunch pre-orders', desc: 'Catering & group bookings via WhatsApp' },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-3 vt-card p-5">
            <item.icon className="h-5 w-5 shrink-0 text-[color:var(--vt-accent)]" />
            <div>
              <div className="text-sm font-semibold">{item.title}</div>
              <div className="text-xs text-[color:var(--vt-muted)]">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border border-[color:var(--vt-border)]">
        <iframe
          title="Vermont Thai map"
          src={MAPS_EMBED}
          className="h-[380px] w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <a
          href={MAPS_LINK}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 bg-[color:var(--vt-card)] py-3 text-xs text-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)]"
        >
          <MapPin className="h-3.5 w-3.5" /> Open in Google Maps <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
