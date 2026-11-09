import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, KeyRound, Loader2, X } from 'lucide-react';
import { StaffListItem } from '../../lib/api/staff';
import { fetchStaff as apiFetchStaff, createStaff as apiCreateStaff, updateStaff as apiUpdateStaff, deleteStaff as apiDeleteStaff } from '../../lib/api/staff';
import { DbError } from '../../lib/api/errors';

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffListItem | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    pin: '',
    role: 'CASHIER',
  });

  const roles = [
    { value: 'ADMIN', label: 'Admin (Full Access)' },
    { value: 'MANAGER', label: 'Manager (Access All Areas)' },
    { value: 'CASHIER', label: 'Cashier (POS only)' },
    { value: 'KITCHEN', label: 'Kitchen (KDS only)' },
  ];

  useEffect(() => {
    fetchStaff();
  }, []);

  async function fetchStaff() {
    setIsLoading(true);
    try {
      const data = await apiFetchStaff();
      setStaff(data.sort((a,b) => a.name.localeCompare(b.name)));
    } catch (error: any) {
      if (error instanceof DbError && error.isMissingTable) {
        console.warn('Table staff_pins does not exist yet. Please create it.');
      } else {
        console.error('Error fetching staff:', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handleOpenModal = (staffMember?: StaffListItem) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setFormData({
        name: staffMember.name,
        pin: '',
        role: staffMember.role || 'CASHIER',
      });
    } else {
      setEditingStaff(null);
      setFormData({ name: '', pin: '', role: 'CASHIER' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || (formData.pin.length > 0 && formData.pin.length !== 4)) {
      alert("Name is required. PIN is required for new staff and must be at least 4 digits (leave blank to keep the current PIN when editing).");
      return;
    }

    setIsSaving(true);
    try {
      if (editingStaff) {
        await apiUpdateStaff(editingStaff.id, {
          name: formData.name.trim(),
          role: formData.role.toUpperCase(),
          pin: formData.pin || undefined,
        });
      } else {
        await apiCreateStaff({
          name: formData.name.trim(),
          role: formData.role.toUpperCase(),
          pin: formData.pin,
        });
      }

      await fetchStaff();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Save error:', error.message);
      alert(error.message || 'Failed to save staff member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this staff member?')) {
      try {
        await apiDeleteStaff(id);
        await fetchStaff();
      } catch (error: any) {
        console.error('Delete error:', error.message);
        alert(error.message || 'Failed to delete staff member');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-theme-ink">Staff & Roles</h1>
          <p className="text-theme-ink-dim mt-1">Manage employee access, PIN codes, and permissions.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-theme-accent text-black px-6 py-3 rounded-md font-bold uppercase tracking-wider text-sm hover:bg-opacity-90 transition-all shadow-[0_0_10px_rgba(197,160,89,0.2)] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      <div className="bg-theme-surface border border-theme-border overflow-hidden rounded-xl shadow-sm">
        <table className="w-full text-left text-sm text-theme-ink">
          <thead className="bg-theme-surface-alt border-b border-theme-border text-xs uppercase tracking-wider text-theme-ink-dim">
            <tr>
              <th className="px-6 py-4 font-semibold">Name</th>
              <th className="px-6 py-4 font-semibold">Role</th>
              <th className="px-6 py-4 font-semibold">PIN Code</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-theme-ink-dim">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-theme-accent" />
                  Loading staff...
                </td>
              </tr>
            ) : staff.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <Shield className="w-12 h-12 mx-auto text-theme-ink-dim mb-3 opacity-50" />
                  <p className="text-theme-ink-dim text-lg">No staff members configured</p>
                  <p className="text-theme-ink-dim text-xs mt-1">Add your first employee to start delegating roles.</p>
                </td>
              </tr>
            ) : (
              staff.map((s) => (
                <tr key={s.id} className="border-b border-theme-border last:border-0 hover:bg-theme-bg/50 transition-colors">
                  <td className="px-6 py-4 font-medium">{s.name}</td>
                  <td className="px-6 py-4 text-theme-ink-dim flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span className="capitalize">{s.role.toLowerCase()}</span>
                  </td>
                  <td className="px-6 py-4 font-mono tracking-widest text-theme-accent bg-theme-bg/50">
                    ••••
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(s)}
                        className="text-theme-ink-dim hover:text-theme-ink p-2 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(s.id)}
                        className="text-theme-ink-dim hover:text-red-400 p-2 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="bg-theme-accent/5 border border-theme-accent/20 p-6 rounded-xl flex gap-4 items-start shadow-sm">
        <div className="bg-theme-accent/10 p-2 rounded">
          <Shield className="w-5 h-5 text-theme-accent" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-theme-ink uppercase tracking-wider">System Backoffice Access</h3>
          <p className="text-xs text-theme-ink-dim mt-1 leading-relaxed">
            The primary administrator signs in with the admin password (changeable in Settings) and is managed separately from staff PINs. 
            Staff PINs listed above are for terminal access and quick backoffice entry.
          </p>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-theme-surface border border-theme-border w-full max-w-lg shadow-2xl flex flex-col rounded-xl overflow-hidden">
            <div className="p-6 border-b border-theme-border flex items-center justify-between bg-theme-surface-alt">
              <h2 className="font-serif text-xl text-theme-ink flex items-center gap-2">
                <Shield className="w-5 h-5 text-theme-accent" />
                {editingStaff ? 'Edit Staff Member' : 'New Staff Member'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-theme-ink-dim hover:text-theme-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                  placeholder="e.g. John Doe"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Role & Access Level</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all appearance-none"
                >
                  {roles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">PIN Code (Login Password)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="w-4 h-4 text-theme-ink-dim" />
                  </div>
                  <input 
                    type="password" 
                    inputMode="numeric"
                    maxLength={4}
                    value={formData.pin}
                    onChange={e => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})}
                    className="w-full bg-theme-bg border border-theme-border p-3 pl-10 rounded-md text-sm font-mono tracking-widest focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                    placeholder={editingStaff ? 'Leave blank to keep current PIN' : '4 digit code'}
                  />
                </div>
                <p className="text-[10px] text-theme-ink-dim mt-2">
                  {editingStaff
                    ? 'Leave blank to keep the current PIN. Fill in to change it.'
                    : 'Staff will use this PIN to unlock the POS and access the system.'}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-theme-border bg-theme-surface-alt flex justify-end gap-4">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 text-xs uppercase tracking-wider font-bold text-theme-ink-dim hover:text-theme-ink transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving || !formData.name || (editingStaff ? (formData.pin.length > 0 && formData.pin.length !== 4) : formData.pin.length !== 4)}
                className="bg-theme-accent text-black px-8 py-3 rounded-md text-xs uppercase tracking-wider font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_10px_rgba(197,160,89,0.2)]"
              >
                {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                {isSaving ? 'Saving...' : 'Save Staff'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
