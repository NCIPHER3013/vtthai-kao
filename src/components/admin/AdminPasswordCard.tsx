import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { convex, api, convexErrorMessage } from '../../lib/convex';
import { useToast } from '../Toast';

/** Change the backoffice (admin login) password. Verified server-side against the current password. */
export default function AdminPasswordCard() {
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (next.length < 6) return setError('New password must be at least 6 characters.');
    if (next !== confirm) return setError('New password and confirmation do not match.');
    if (next === current) return setError('New password must be different from the current one.');
    setBusy(true);
    try {
      await convex.mutation(api.adminAuth.setPin, { currentPin: current, newPin: next });
      setCurrent(''); setNext(''); setConfirm('');
      toast('Admin password changed.', 'success');
    } catch (err) {
      setError(convexErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full bg-theme-bg border border-theme-border py-3 px-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm';
  return (
    <section className="bg-theme-surface border border-theme-border">
      <div className="p-6 border-b border-theme-border flex items-center gap-3">
        <KeyRound className="w-5 h-5 text-theme-accent" />
        <h2 className="font-serif text-xl text-theme-ink">Admin password</h2>
      </div>
      <form onSubmit={submit} className="p-6 grid gap-4 md:grid-cols-3">
        <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" className={input} />
        <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password (6+ characters)" className={input} />
        <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" className={input} />
        {error && <p className="md:col-span-3 text-red-400 text-xs">{error}</p>}
        <div className="md:col-span-3">
          <button
            type="submit"
            disabled={busy || !current || !next || !confirm}
            className="bg-theme-accent text-black px-8 py-3 text-xs uppercase tracking-wider font-semibold hover:bg-opacity-90 disabled:opacity-40 transition-colors flex items-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Change password
          </button>
        </div>
      </form>
    </section>
  );
}
