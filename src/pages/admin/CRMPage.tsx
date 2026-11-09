import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Gift, History, Star, MoreHorizontal, X, Loader2 } from 'lucide-react';
import { subscribeTables } from '../../lib/convex';
import formatCurrency from '../../lib/formatCurrency';
import { Customer } from '../../types';
import AddCustomerModal from '../../components/admin/AddCustomerModal';
import { fetchCustomers as apiFetchCustomers, adjustCustomerPoints, updateCustomer } from '../../lib/api/customers';
import { fetchOrdersByCustomer } from '../../lib/api/orders';
import { DbError, isDbError } from '../../lib/api/errors';

export default function CRMPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  
  // Edit Profile States
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [activeAction, setActiveAction] = useState<'reward' | 'adjust' | null>(null);
  const [adjustPointsValue, setAdjustPointsValue] = useState<string>('');
  const [rewardName, setRewardName] = useState<string>('');
  const [isProcessingPoints, setIsProcessingPoints] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setIsSavingProfile(true);
    try {
      await updateCustomer(selectedCustomer.id, {
        name: editForm.name,
        phone: editForm.phone || null,
        email: editForm.email || null
      });

      const updated = {
        ...selectedCustomer,
        name: editForm.name,
        phone: editForm.phone || null,
        email: editForm.email || null
      };
      setSelectedCustomer(updated);
      setCustomers(customers.map(c => c.id === selectedCustomer.id ? updated : c));
      setIsEditingCustomer(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(isDbError(error) ? error.userMessage : 'Failed to update customer profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  useEffect(() => {
    fetchCustomers();

    const channel = subscribeTables(['customers'], () => {
        fetchCustomers();
      });

    return () => {
      channel();
    };
  }, []);

  const fetchCustomers = async () => {
    try {
      const data = await apiFetchCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomerHistory = async (customerId: string) => {
    setIsLoadingHistory(true);
    try {
      const data = await fetchOrdersByCustomer(customerId);
      setCustomerOrders(data || []);
    } catch (error) {
      console.error('Error fetching customer history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchCustomerHistory(customer.id);
  };

  const submitAdjustPoints = async (mode: 'add' | 'subtract' | 'set') => {
    if (!selectedCustomer || !adjustPointsValue) return;
    setIsProcessingPoints(true);
    let newPoints = selectedCustomer.points;
    const val = parseInt(adjustPointsValue, 10) || 0;
    
    if (mode === 'add') newPoints += val;
    else if (mode === 'subtract') newPoints = Math.max(0, newPoints - val);
    else if (mode === 'set') newPoints = Math.max(0, val);

    try {
      await adjustCustomerPoints(selectedCustomer.id, newPoints - selectedCustomer.points, 0);
      
      setSelectedCustomer({ ...selectedCustomer, points: newPoints });
      setCustomers(customers.map(c => c.id === selectedCustomer.id ? { ...c, points: newPoints } : c));
      setActiveAction(null);
      setAdjustPointsValue('');
      setRewardName('');
    } catch (error) {
      console.error('Error adjusting points:', error);
      alert(isDbError(error) ? error.userMessage : 'Failed to update points.');
    } finally {
      setIsProcessingPoints(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery)) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getTier = (points: number) => {
    if (points >= 1000) return 'Platinum';
    if (points >= 500) return 'Gold';
    if (points >= 100) return 'Silver';
    return 'Bronze';
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Platinum': return 'text-slate-200 bg-slate-800 border-slate-600';
      case 'Gold': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
      case 'Silver': return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30';
      default: return 'text-amber-700 bg-amber-900/10 border-amber-900/30';
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-theme-ink mb-2">Customer CRM</h1>
          <p className="text-theme-ink-dim text-sm">Manage customer profiles, loyalty points, and purchase history.</p>
        </div>
        <button 
          onClick={() => setIsAddingCustomer(true)}
          className="bg-theme-accent text-black rounded-md px-6 py-3 text-xs uppercase tracking-wider font-bold hover:bg-opacity-90 transition-all flex items-center gap-2 w-fit shadow-[0_0_10px_rgba(197,160,89,0.2)]"
        >
          <UserPlus className="w-4 h-4" />
          Add Customer
        </button>
      </header>
      
      <div className="bg-theme-surface border border-theme-border flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-theme-border flex items-center justify-between bg-theme-surface-alt">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-ink-dim" />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-theme-bg border border-theme-border py-2 pl-10 pr-4 text-sm text-theme-ink focus:outline-none focus:border-theme-accent transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-theme-border bg-theme-bg">
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Customer</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Contact</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Tier</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Points</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium">Total Spend</th>
                  <th className="p-4 text-xs uppercase tracking-wider text-theme-ink-dim font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-theme-ink-dim">No customers found.</td>
                  </tr>
                ) : (
                  filteredCustomers.map(customer => {
                    const tier = getTier(customer.points);
                    return (
                      <tr key={customer.id} className="hover:bg-theme-surface-alt transition-colors group cursor-pointer" onClick={() => handleSelectCustomer(customer)}>
                        <td className="p-4 font-serif text-theme-ink">{customer.name}</td>
                        <td className="p-4">
                          <div className="text-sm text-theme-ink">{customer.phone}</div>
                          <div className="text-xs text-theme-ink-dim">{customer.email}</div>
                        </td>
                        <td className="p-4">
                          <span className={`text-[11px] uppercase tracking-wider px-2 py-1 border rounded-sm ${getTierColor(tier)}`}>
                            {tier}
                          </span>
                        </td>
                        <td className="p-4 text-theme-accent font-mono">{customer.points}</td>
                        <td className="p-4 text-sm font-mono">{formatCurrency(customer.total_spent)}</td>
                        <td className="p-4 text-right">
                          <button className="p-2 text-theme-ink-dim hover:text-theme-accent transition-colors md:opacity-0 md:group-hover:opacity-100">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Customer Detail Profile Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-theme-surface border border-theme-border w-full max-w-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
            
            {/* Left: Quick Info */}
            <div className="w-full md:w-1/3 p-8 border-b md:border-b-0 md:border-r border-theme-border bg-theme-surface-alt flex flex-col shrink-0">
               <div className="flex justify-between items-start mb-6 md:hidden">
                <h2 className="font-serif text-2xl text-theme-ink">Profile</h2>
                <button onClick={() => setSelectedCustomer(null)} className="text-theme-ink-dim hover:text-theme-ink">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="w-20 h-20 bg-theme-bg border border-theme-border rounded-full flex items-center justify-center mb-6 self-center md:self-start">
                <span className="font-serif text-3xl text-theme-ink">{selectedCustomer.name.charAt(0)}</span>
              </div>
              
              <h2 className="font-serif text-2xl text-theme-ink mb-1 text-center md:text-left">{selectedCustomer.name}</h2>
              <p className="text-theme-ink-dim text-sm text-center md:text-left mb-6">{selectedCustomer.phone}</p>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-theme-border/50">
                  <span className="text-[11px] uppercase tracking-wider text-theme-ink-dim">Tier</span>
                  <span className={`text-[11px] uppercase tracking-wider px-2 py-1 border rounded-sm ${getTierColor(getTier(selectedCustomer.points))}`}>{getTier(selectedCustomer.points)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-theme-border/50">
                  <span className="text-[11px] uppercase tracking-wider text-theme-ink-dim">Total Points</span>
                  <span className="font-mono text-theme-accent">{selectedCustomer.points}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-theme-border/50">
                  <span className="text-[11px] uppercase tracking-wider text-theme-ink-dim">Total Visits</span>
                  <span className="font-mono text-theme-ink">{customerOrders.length}</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  setEditForm({
                    name: selectedCustomer.name,
                    phone: selectedCustomer.phone || '',
                    email: selectedCustomer.email || ''
                  });
                  setIsEditingCustomer(true);
                }}
                className="mt-8 w-full py-3 border border-theme-accent text-theme-accent hover:bg-theme-accent hover:text-black transition-colors text-xs uppercase tracking-wider font-semibold"
              >
                Edit Profile
              </button>
            </div>

            {/* Right: History & Actions */}
            <div className="w-full md:w-2/3 flex flex-col">
              <div className="p-6 border-b border-theme-border hidden md:flex items-center justify-between shrink-0 bg-theme-surface-alt">
                <span className="text-sm font-medium text-theme-ink flex items-center gap-2"><History className="w-4 h-4"/> Recent Activity</span>
                <button onClick={() => setSelectedCustomer(null)} className="text-theme-ink-dim hover:text-theme-ink">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-theme-bg">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-theme-accent" />
                  </div>
                ) : customerOrders.length === 0 ? (
                  <div className="text-center py-12 text-theme-ink-dim text-sm">
                    No recent activity found.
                  </div>
                ) : (
                  customerOrders.map(order => (
                    <div key={order.id} className="p-4 border border-theme-border bg-theme-base flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm text-theme-ink font-medium">Order #{order.id}</p>
                          <span className={`text-[10px] uppercase tracking-wider px-2 border rounded-sm ${
                            order.status === 'completed' ? 'border-theme-accent/30 text-theme-accent bg-theme-accent/10' :
                            order.status === 'cancelled' ? 'border-red-400/30 text-red-400 bg-red-400/10' :
                            'border-theme-border text-theme-ink-dim'
                          }`}>
                            {order.status || 'completed'}
                          </span>
                        </div>
                        <p className="text-xs text-theme-ink-dim mt-1">{new Date(order.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-theme-ink">{formatCurrency(order.total)}</p>
                        <p className="text-[10px] text-theme-accent mt-1">+{Math.floor(order.total)} pts</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 border-t border-theme-border bg-theme-surface-alt shrink-0 flex flex-col gap-4">
                {activeAction === 'adjust' && (
                  <div className="bg-theme-bg p-4 border border-theme-border rounded">
                    <p className="text-xs uppercase tracking-wider text-theme-ink-dim mb-3">Manual Adjust Points</p>
                    <div className="flex gap-2">
                       <input 
                         type="number"
                         value={adjustPointsValue}
                         onChange={e => setAdjustPointsValue(e.target.value)}
                         className="flex-1 bg-theme-surface border border-theme-border px-3 py-2 text-sm text-theme-ink focus:outline-none focus:border-theme-accent"
                         placeholder="Enter point amount..."
                       />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => submitAdjustPoints('add')} disabled={!adjustPointsValue || isProcessingPoints} className="flex-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/50 py-2 text-xs uppercase tracking-wider hover:bg-emerald-500 hover:text-black transition-colors disabled:opacity-50">Add (+)</button>
                      <button onClick={() => submitAdjustPoints('subtract')} disabled={!adjustPointsValue || isProcessingPoints} className="flex-1 bg-red-400/10 text-red-500 border border-red-400/50 py-2 text-xs uppercase tracking-wider hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50">Deduct (-)</button>
                    </div>
                    <button onClick={() => { setActiveAction(null); setAdjustPointsValue(''); }} className="w-full mt-3 py-2 text-theme-ink-dim hover:text-theme-ink text-xs uppercase tracking-wider">Cancel</button>
                  </div>
                )}
                
                {activeAction === 'reward' && (
                  <div className="bg-theme-bg p-4 border border-theme-border rounded">
                    <p className="text-xs uppercase tracking-wider text-theme-ink-dim mb-3">Redeem Reward</p>
                    <div className="space-y-3">
                       <input 
                         type="text"
                         value={rewardName}
                         onChange={e => setRewardName(e.target.value)}
                         className="w-full bg-theme-surface border border-theme-border px-3 py-2 text-sm text-theme-ink focus:outline-none focus:border-theme-accent"
                         placeholder="Reward Name (e.g. Free Coffee)"
                       />
                       <input 
                         type="number"
                         value={adjustPointsValue}
                         onChange={e => setAdjustPointsValue(e.target.value)}
                         className="w-full bg-theme-surface border border-theme-border px-3 py-2 text-sm text-theme-ink focus:outline-none focus:border-theme-accent"
                         placeholder="Points to deduct..."
                       />
                    </div>
                    <button onClick={() => submitAdjustPoints('subtract')} disabled={!adjustPointsValue || isProcessingPoints} className="w-full mt-3 bg-theme-accent text-black border border-theme-accent py-2 text-xs uppercase tracking-wider hover:bg-opacity-90 transition-colors disabled:opacity-50">Confirm Redemption</button>
                    <button onClick={() => { setActiveAction(null); setAdjustPointsValue(''); setRewardName(''); }} className="w-full mt-3 py-2 text-theme-ink-dim hover:text-theme-ink text-xs uppercase tracking-wider">Cancel</button>
                  </div>
                )}

                {!activeAction && (
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setActiveAction('reward')}
                      className="py-3 bg-theme-surface border border-theme-border text-theme-ink hover:border-theme-accent transition-colors text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      <Gift className="w-4 h-4" /> Redeem Reward
                    </button>
                    <button 
                      onClick={() => setActiveAction('adjust')}
                      className="py-3 bg-theme-surface border border-theme-border text-theme-ink hover:border-theme-accent transition-colors text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      <Star className="w-4 h-4" /> Adjust Points
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
      
      <AddCustomerModal 
        isOpen={isAddingCustomer} 
        onClose={() => setIsAddingCustomer(false)} 
      />

      {isEditingCustomer && selectedCustomer && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-theme-surface border border-theme-border w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-theme-border flex items-center justify-between bg-theme-surface-alt">
              <h2 className="font-serif text-2xl text-theme-ink">Edit Customer Profile</h2>
              <button onClick={() => setIsEditingCustomer(false)} className="text-theme-ink-dim hover:text-theme-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Full Name *</label>
                <input 
                  type="text" 
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-theme-bg border border-theme-border py-3 px-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm"
                  placeholder="e.g. Amanda Thomas"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Phone</label>
                <input 
                  type="tel" 
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full bg-theme-bg border border-theme-border py-3 px-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm"
                  placeholder="e.g. 0489012345"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Email</label>
                <input 
                  type="email" 
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full bg-theme-bg border border-theme-border py-3 px-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm"
                  placeholder="e.g. amanda@example.com"
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isSavingProfile || !editForm.name}
                className="w-full mt-6 bg-theme-accent text-black py-4 text-xs uppercase tracking-wider font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingProfile ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...</> : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
