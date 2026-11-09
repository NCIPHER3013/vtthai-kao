import { useState, useEffect } from 'react';
import { X, Search, UserPlus, User, Loader2 } from 'lucide-react';
import { fetchCustomers } from '../../lib/api/customers';
import { Customer } from '../../types';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customer: Customer) => void;
  onAddNew?: () => void;
}

export default function CustomerModal({ isOpen, onClose, onSelect, onAddNew }: CustomerModalProps) {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCustomers();
      setCustomers(data as Customer[]);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-theme-surface border border-theme-border w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
        
        <div className="p-6 border-b border-theme-border flex items-center justify-between shrink-0 bg-theme-surface-alt">
          <h2 className="font-serif text-2xl text-theme-ink">Attach Customer</h2>
          <button onClick={onClose} className="text-theme-ink-dim hover:text-theme-ink bg-theme-bg p-2 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 border-b border-theme-border bg-theme-surface-alt shrink-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-ink-dim" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full bg-theme-bg border border-theme-border py-4 pl-12 pr-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="p-8 flex justify-center text-theme-ink-dim">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filtered.length > 0 ? (
            filtered.map(customer => (
              <button
                key={customer.id}
                onClick={() => { onSelect(customer); onClose(); }}
                className="w-full text-left p-4 hover:bg-theme-surface-alt transition-colors flex items-center justify-between group border-b border-theme-border last:border-0"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-theme-bg rounded-full flex items-center justify-center border border-theme-border group-hover:border-theme-accent transition-colors">
                    <User className="w-5 h-5 text-theme-ink-dim group-hover:text-theme-accent" />
                  </div>
                  <div>
                    <p className="text-theme-ink font-medium">{customer.name}</p>
                    <p className="text-theme-ink-dim text-xs mt-1">{customer.phone || 'No phone'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-theme-accent text-sm font-mono">{customer.points} pts</p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-theme-ink-dim">
              <p className="mb-4">No customers found.</p>
              <button 
                onClick={onAddNew}
                className="inline-flex items-center gap-2 text-theme-accent hover:underline text-sm uppercase tracking-wider font-semibold"
              >
                <UserPlus className="w-4 h-4" />
                Add New Customer
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
