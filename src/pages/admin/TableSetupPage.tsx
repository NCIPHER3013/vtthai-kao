import React, { useState, useEffect } from 'react';
import { fetchTables as apiFetchTables, createTable, updateTable, deleteTable } from '../../lib/api/tables';
import { DbError, isDbError } from '../../lib/api/errors';
import { Plus, Trash2, Loader2, Save, MapPin, Users, Edit2, AlertCircle, RefreshCw, QrCode, Printer, X } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { QRCodeSVG } from 'qrcode.react';

interface RestaurantTable {
  id: string;
  name: string;
  zone: string;
  capacity: number;
  is_active: boolean;
  qr_token?: string;
}

export default function TableSetupPage() {
  const { toast } = useToast();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [zone, setZone] = useState('Main Area');
  const [capacity, setCapacity] = useState(4);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Printing State
  const [printingTable, setPrintingTable] = useState<RestaurantTable | null>(null);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetchTables();
      setTables(data.map(t => ({
         id: t.id,
         name: t.table_number,
         zone: t.zone,
         capacity: t.capacity,
         is_active: t.is_active,
         qr_token: t.qr_token
      })));
    } catch (error) {
      if (isDbError(error) && error.isMissingTable) {
        console.error('Error fetching tables. Please ensure the Supabase SQL script has been run.', error);
      } else {
        console.error('Error fetching tables:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    
    const tableData = {
      table_number: name.trim(),
      zone: zone.trim() || 'Main Area',
      capacity: Number(capacity),
      is_active: true
    };

    try {
      if (editingId) {
        await updateTable(editingId, tableData);
      } else {
        await createTable(tableData);
      }
      
      await fetchTables();
      resetForm();
    } catch (error: any) {
      console.error('Error saving table:', error);
      const msg = isDbError(error) && error.isMissingTable
        ? 'Failed to save. If you just set up, please ensure the Supabase SQL script has been run.'
        : 'Failed to save table.';
      toast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this table?')) return;

    setIsLoading(true);
    try {
      await deleteTable(id);
      await fetchTables();
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const handleEdit = (table: RestaurantTable) => {
    setEditingId(table.id);
    setName(table.name);
    setZone(table.zone);
    setCapacity(table.capacity);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegenerateToken = async (table: RestaurantTable) => {
    if (!confirm(`Regenerate QR token for "${table.name}"? The old QR code will no longer work.`)) return;
    try {
      const newToken = crypto.randomUUID();
      await updateTable(table.id, { qr_token: newToken });
      await fetchTables();
    } catch (err: any) {
      console.error('Failed to regenerate token:', err);
      toast('Failed to regenerate token. Make sure the qr_token column exists in the database.', 'error');
    }
  };

  const handleEditZone = async (oldZoneName: string) => {
    const newZoneName = window.prompt(`Rename zone "${oldZoneName}" to:`, oldZoneName);
    if (!newZoneName || newZoneName.trim() === '' || newZoneName === oldZoneName) return;

    const trimmedName = newZoneName.trim();

    setIsLoading(true);
    try {
      const tablesInZone = tables.filter(t => t.zone === oldZoneName);
      await Promise.all(tablesInZone.map(t => updateTable(t.id, { zone: trimmedName })));
      await fetchTables();
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const handleDeleteZone = async (zoneName: string) => {
    const tablesInZone = tables.filter(t => t.zone === zoneName);
    if (!window.confirm(`Are you sure you want to delete the zone "${zoneName}" and ALL ${tablesInZone.length} tables inside it?`)) return;

    setIsLoading(true);
    try {
      await Promise.all(tablesInZone.map(t => deleteTable(t.id)));
      await fetchTables();
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCapacity(4);
  };

  // Group by zone
  const zones: string[] = Array.from(new Set(tables.map(t => t.zone)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-theme-ink">Table & Zone Setup</h1>
          <p className="text-theme-ink-dim mt-1">Configure your restaurant floor plan, zones, and table capacities.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Form */}
        <div className="lg:col-span-1">
          <div className="bg-theme-surface border border-theme-border p-6 sticky top-24 rounded-xl shadow-sm">
            <h2 className="font-serif text-xl text-theme-ink mb-6">
              {editingId ? 'Edit Table' : 'Add New Table'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Table Name / Number *</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                  placeholder="e.g. T1, A5, Balcony-1"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Location Zone</label>
                <input 
                  type="text" 
                  value={zone}
                  onChange={e => setZone(e.target.value)}
                  className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                  placeholder="e.g. 1st Floor, Patio, VIP Room"
                  list="zone-suggestions"
                />
                <datalist id="zone-suggestions">
                  {zones.map(z => <option key={z} value={z} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Seat Capacity</label>
                <input 
                  type="number" 
                  min="1"
                  value={capacity}
                  onChange={e => setCapacity(Number(e.target.value))}
                  className="w-full bg-theme-bg border border-theme-border p-3 rounded-md text-sm text-theme-ink focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-all"
                />
              </div>

              <div className="pt-4 flex gap-3">
                {editingId && (
                  <button 
                    onClick={resetForm}
                    className="flex-1 py-3 text-xs uppercase tracking-wider font-bold text-theme-ink-dim hover:text-theme-ink transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  onClick={handleSaveProduct}
                  disabled={!name.trim() || isSaving}
                  className="flex-1 bg-theme-accent text-black py-3 rounded-md text-xs uppercase tracking-wider font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(197,160,89,0.2)]"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
                  {editingId ? 'Update' : 'Add Table'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tables Display */}
        <div className="lg:col-span-2">
          {isLoading ? (
             <div className="flex justify-center p-12">
               <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
             </div>
          ) : (
            <div className="space-y-8">
              {zones.length === 0 ? (
                <div className="text-center p-12 bg-theme-surface border border-theme-border text-theme-ink-dim">
                  No tables configured. Create your first table to get started.
                </div>
              ) : (
                zones.map(currentZone => (
                  <div key={currentZone} className="bg-theme-surface border border-theme-border p-6 group/zone rounded-xl shadow-sm">
                    <div className="flex items-center gap-2 mb-6 border-b border-theme-border pb-4">
                      <MapPin className="w-5 h-5 text-theme-accent shrink-0" />
                      <h3 className="font-serif text-xl text-theme-ink">{currentZone}</h3>
                      <span className="text-theme-ink-dim text-sm ml-2">
                        ({tables.filter(t => t.zone === currentZone).length} Tables)
                      </span>
                      
                      <div className="ml-auto md:opacity-0 md:group-hover/zone:opacity-100 transition-opacity flex gap-2">
                        <button onClick={() => handleEditZone(currentZone)} className="p-1.5 bg-theme-bg border border-theme-border text-theme-ink hover:text-theme-accent hover:border-theme-accent" title="Rename Zone">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteZone(currentZone)} className="p-1.5 bg-theme-bg border border-theme-border text-red-500 hover:bg-red-500/10 hover:border-red-500" title="Delete Zone & All Tables">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      {tables.filter(t => t.zone === currentZone).map(table => (
                         <div key={table.id} className="border border-theme-border p-5 relative group bg-theme-bg rounded-lg hover:border-theme-accent transition-colors shadow-sm">
                           <h4 className="font-serif text-2xl text-theme-ink mb-1">{table.name}</h4>
                           <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-theme-ink-dim">
                             <Users className="w-3 h-3" />
                             {table.capacity} Seats
                           </div>
                           <div className="mt-2 flex items-center gap-1.5">
                             {table.qr_token ? (
                               <>
                                 <QrCode className="w-3 h-3 text-emerald-500" />
                                 <span className="text-[10px] text-emerald-500 uppercase tracking-wider font-bold">QR Active</span>
                               </>
                             ) : (
                               <>
                                 <AlertCircle className="w-3 h-3 text-amber-500" />
                                 <span className="text-[10px] text-amber-500 uppercase tracking-wider">No Token</span>
                               </>
                             )}
                           </div>
                           
                           <div className="absolute top-2 right-2 flex gap-1 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                             <button onClick={() => handleEdit(table)} className="p-1.5 bg-theme-surface border border-theme-border text-theme-ink hover:text-theme-accent hover:border-theme-accent" title="Edit Table">
                               <Edit2 className="w-3.5 h-3.5" />
                             </button>
                             <button onClick={() => handleRegenerateToken(table)} className="p-1.5 bg-theme-surface border border-theme-border text-theme-ink hover:text-theme-accent hover:border-theme-accent" title="Regenerate QR Token">
                               <RefreshCw className="w-3.5 h-3.5" />
                             </button>
                             {table.qr_token && (
                               <button onClick={() => setPrintingTable(table)} className="p-1.5 bg-theme-surface border border-theme-border text-theme-ink hover:text-theme-accent hover:border-theme-accent" title="Print QR Code">
                                 <Printer className="w-3.5 h-3.5" />
                               </button>
                             )}
                             <button onClick={() => handleDelete(table.id)} className="p-1.5 bg-theme-surface border border-theme-border text-red-500 hover:bg-red-500/10 hover:border-red-500" title="Delete Table">
                               <Trash2 className="w-3.5 h-3.5" />
                             </button>
                           </div>
                         </div>
                       ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Print Modal */}
      {printingTable && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm print:bg-white print:p-0 print:block">
          {/* Controls - Hidden during print */}
          <div className="absolute top-6 right-6 flex gap-4 print:hidden">
            <button 
              onClick={() => window.print()}
              className="bg-theme-accent text-black rounded-md px-6 py-3 font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-[0_0_10px_rgba(197,160,89,0.2)]"
            >
              <Printer className="w-5 h-5" /> Print QR Code
            </button>
            <button 
              onClick={() => setPrintingTable(null)}
              className="bg-theme-surface border border-theme-border text-theme-ink p-3 hover:text-red-400 hover:border-red-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Printable Area - Centered for print */}
          <div className="bg-white p-12 text-center w-full max-w-md mx-auto shadow-2xl print:shadow-none print:max-w-none print:h-screen print:flex print:flex-col print:items-center print:justify-center">
            <div className="mb-8">
              <h1 className="text-4xl font-serif text-black mb-2">Vermont Thai</h1>
              <p className="text-gray-500 text-sm uppercase tracking-widest border-b border-gray-200 pb-4 inline-block">Scan to Order</p>
            </div>
            
            <div className="bg-white p-6 inline-block border-4 border-black rounded-xl mb-8">
              <QRCodeSVG 
                value={`${window.location.origin}/store?t=${printingTable.qr_token}`} 
                size={256}
                level="H"
                includeMargin={false}
              />
            </div>
            
            <div className="mt-4 border-t border-gray-200 pt-6">
              <a 
                href={`${window.location.origin}/store?t=${printingTable.qr_token}`}
                target="_blank"
                rel="noreferrer"
                className="text-3xl font-bold text-black uppercase tracking-wider hover:text-theme-accent hover:underline transition-colors block"
                title="Click here to test this table's webstore link!"
              >
                {printingTable.name}
              </a>
              <p className="text-gray-500 mt-2">{printingTable.zone} • {printingTable.capacity} Seats</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
