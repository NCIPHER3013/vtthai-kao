import React, { useState } from 'react';
import { createCustomer } from '../../lib/api/customers';
import { DbError } from '../../lib/api/errors';
import { X, Loader2 } from 'lucide-react';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerAdded?: (customer: any) => void;
}

export default function AddCustomerModal({ isOpen, onClose, onCustomerAdded }: AddCustomerModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName) return;

    setIsSubmitting(true);
    try {
      const fullName = (firstName + ' ' + lastName).trim();
      const data = await createCustomer({
        name: fullName,
        phone: phone || null,
        email: email || null
      });

      if (onCustomerAdded && data) {
        onCustomerAdded(data);
      }
      onClose();
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
    } catch (error) {
      console.error('Error adding customer:', error);
      alert(error instanceof DbError ? error.userMessage : 'Failed to add customer. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-theme-surface border border-theme-border w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-theme-border flex items-center justify-between bg-theme-surface-alt">
          <h2 className="font-serif text-2xl text-theme-ink">New Customer</h2>
          <button onClick={onClose} className="text-theme-ink-dim hover:text-theme-ink">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim mb-2">First Name *</label>
              <input 
                type="text" 
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border py-3 px-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm"
                placeholder="e.g. John"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim mb-2">Last Name</label>
              <input 
                type="text" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border py-3 px-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm"
                placeholder="e.g. Doe"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim mb-2">Phone</label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-theme-bg border border-theme-border py-3 px-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm"
              placeholder="e.g. +1 234 567 8900"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim mb-2">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-theme-bg border border-theme-border py-3 px-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm"
              placeholder="e.g. john@example.com"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isSubmitting || !firstName}
            className="w-full mt-6 bg-theme-accent text-black py-4 text-xs uppercase tracking-wider font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Customer'}
          </button>
        </form>
      </div>
    </div>
  );
}
