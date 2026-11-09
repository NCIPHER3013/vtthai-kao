import { useState, useEffect } from 'react';
import { Save, Store, DollarSign, Receipt, Loader2 } from 'lucide-react';
import { subscribeTables } from '../../lib/convex';
import { fetchSettings as apiFetchSettings, updateSettings } from '../../lib/api/settings';import { DbError } from '../../lib/api/errors';
import { Settings } from '../../types';
import { useToast } from '../../components/Toast';
import AdminPasswordCard from '../../components/admin/AdminPasswordCard';

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Form states
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [taxRate, setTaxRate] = useState('10'); // as percentage string for UI
  const [holidaySurcharge, setHolidaySurcharge] = useState('0'); // percentage
  const [eftposSurcharge, setEftposSurcharge] = useState('0'); // percentage
  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [defaultStartingCash, setDefaultStartingCash] = useState('1000');
  const [paymentRatioTarget, setPaymentRatioTarget] = useState('50');

  useEffect(() => {
    fetchSettings();

    const channel = subscribeTables(['settings'], () => {
        fetchSettings();
      });

    return () => {
      channel();
    };
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await apiFetchSettings();
      
      if (data) {
        setSettings(data as Settings);
        setStoreName(data.store_name || '');
        setStoreAddress(data.store_address || '');
        setStorePhone(data.store_phone || '');
        setTaxId(data.tax_id || '');
        setTaxRate(data.tax_rate !== undefined ? (Number(data.tax_rate) * 100).toString() : '10');
        if (data.holiday_surcharge !== undefined && data.holiday_surcharge !== null) {
          setHolidaySurcharge((Number(data.holiday_surcharge) * 100).toString());
        }
        if (data.eftpos_surcharge !== undefined && data.eftpos_surcharge !== null) {
          setEftposSurcharge((Number(data.eftpos_surcharge) * 100).toString());
        }
        setReceiptHeader(data.receipt_header || '');
        setReceiptFooter(data.receipt_footer || '');
        if (data.default_starting_cash !== undefined && data.default_starting_cash !== null) {
          setDefaultStartingCash(Number(data.default_starting_cash).toString());
        }
        if (data.payment_ratio_target !== undefined && data.payment_ratio_target !== null) {
          setPaymentRatioTarget(Number(data.payment_ratio_target).toString());
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage('');
    
    try {
      // Convert tax rate string (e.g. "10") to decimal (e.g. 0.10)
      let parsedTax = parseFloat(taxRate) / 100;
      if (isNaN(parsedTax)) parsedTax = 0;
      
      let parsedHoliday = parseFloat(holidaySurcharge) / 100;
      if (isNaN(parsedHoliday)) parsedHoliday = 0;
      
      let parsedEftpos = parseFloat(eftposSurcharge) / 100;
      if (isNaN(parsedEftpos)) parsedEftpos = 0;
      
      let parsedCash = parseFloat(defaultStartingCash);
      if (isNaN(parsedCash)) parsedCash = 0;

      let parsedRatio = parseFloat(paymentRatioTarget);
      if (isNaN(parsedRatio)) parsedRatio = 50;

      await updateSettings({
        store_name: storeName,
        store_address: storeAddress,
        store_phone: storePhone,
        tax_id: taxId,
        tax_rate: parsedTax,
        holiday_surcharge: parsedHoliday,
        eftpos_surcharge: parsedEftpos,
        receipt_header: receiptHeader,
        receipt_footer: receiptFooter,
        default_starting_cash: parsedCash,
        payment_ratio_target: parsedRatio,
        updated_at: new Date().toISOString()
      } as any);

      setSuccessMessage('Settings updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast(error instanceof DbError ? error.message : 'Failed to save settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-theme-ink mb-2">Settings</h1>
          <p className="text-theme-ink-dim text-sm">Configure system settings, store information, and tax rates.</p>
        </div>
        <div className="flex items-center gap-4">
          {successMessage && (
            <span className="text-theme-accent text-sm font-medium animate-in fade-in">{successMessage}</span>
          )}
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-theme-accent text-black px-8 py-3 text-xs uppercase tracking-wider font-semibold hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2 w-full md:w-auto"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </header>

      <div className="space-y-8">
        
        {/* General Store Info */}
        <section className="bg-theme-surface border border-theme-border">
          <div className="p-6 border-b border-theme-border bg-theme-surface-alt flex items-center gap-3 text-theme-ink">
            <Store className="w-5 h-5" />
            <h2 className="font-serif text-xl">Store Information</h2>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Store Name</label>
                <input 
                  type="text" 
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-theme-bg border border-theme-border py-3 px-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Store Phone</label>
                <input 
                  type="text" 
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  className="w-full bg-theme-bg border border-theme-border py-3 px-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Tax ID / ABN</label>
                <input 
                  type="text" 
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full bg-theme-bg border border-theme-border py-3 px-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm"
                  placeholder="e.g. 12 345 678 901"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Store Address</label>
              <textarea 
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                rows={3}
                className="w-full bg-theme-bg border border-theme-border py-3 px-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm resize-none"
              />
            </div>
          </div>
        </section>

        {/* Financial Configurations */}
        <section className="bg-theme-surface border border-theme-border">
          <div className="p-6 border-b border-theme-border bg-theme-surface-alt flex items-center gap-3 text-theme-ink">
            <DollarSign className="w-5 h-5" />
            <h2 className="font-serif text-xl">Financial Defaults</h2>
          </div>
          <div className="p-8 space-y-6">
            <div className="max-w-md">
              <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Tax Rate (%)</label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full bg-theme-bg border border-theme-border py-3 px-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm pr-10 font-mono"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-ink-dim font-mono">%</span>
              </div>
              <p className="text-theme-ink-dim text-xs mt-2">
                This rate will be used for all checkout tax calculations unless overridden by a specific product.
              </p>
            </div>
            <div className="max-w-md">
              <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Public Holiday Surcharge (%)</label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  max="100"
                  value={holidaySurcharge}
                  onChange={(e) => setHolidaySurcharge(e.target.value)}
                  className="w-full bg-theme-bg border border-theme-border py-3 px-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm pr-10 font-mono"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-ink-dim font-mono">%</span>
              </div>
              <p className="text-theme-ink-dim text-xs mt-2">
                Extra charge added to orders on public holidays.
              </p>
            </div>
            <div className="max-w-md">
              <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">EFTPOS Surcharge (%)</label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  max="100"
                  value={eftposSurcharge}
                  onChange={(e) => setEftposSurcharge(e.target.value)}
                  className="w-full bg-theme-bg border border-theme-border py-3 px-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm pr-10 font-mono"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-ink-dim font-mono">%</span>
              </div>
              <p className="text-theme-ink-dim text-xs mt-2">
                Card reading fee added when a customer pays via card.
              </p>
            </div>
            <div className="max-w-md">
              <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Default Starting Cash Drawer</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-ink-dim font-mono">$</span>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={defaultStartingCash}
                  onChange={(e) => setDefaultStartingCash(e.target.value)}
                  className="w-full bg-theme-bg border border-theme-border py-3 pl-10 pr-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm font-mono"
                />
              </div>
              <p className="text-theme-ink-dim text-xs mt-2">
                The default amount filled in when opening a new shift.
              </p>
            </div>
            <div className="max-w-md">
              <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Cash Payment Target (%)</label>
              <div className="relative">
                <input 
                  type="number" 
                  step="1"
                  min="0"
                  max="100"
                  value={paymentRatioTarget}
                  onChange={(e) => setPaymentRatioTarget(e.target.value)}
                  className="w-full bg-theme-bg border border-theme-border py-3 px-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm pr-10 font-mono"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-ink-dim font-mono">%</span>
              </div>
              <p className="text-theme-ink-dim text-xs mt-2">
                Target ratio for cash payments. Dashboard will alert when actual Cash/Card split deviates beyond ±10% from this target. e.g. 50 = target 50% Cash / 50% Card.
              </p>
            </div>
          </div>
        </section>

        {/* Receipt Settings */}
        <section className="bg-theme-surface border border-theme-border">
          <div className="p-6 border-b border-theme-border bg-theme-surface-alt flex items-center gap-3 text-theme-ink">
            <Receipt className="w-5 h-5" />
            <h2 className="font-serif text-xl">Receipt Format</h2>
          </div>
          <div className="p-8 space-y-6">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Receipt Header</label>
              <textarea 
                value={receiptHeader}
                onChange={(e) => setReceiptHeader(e.target.value)}
                rows={2}
                className="w-full bg-theme-bg border border-theme-border py-3 px-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm resize-none font-mono"
                placeholder="Welcome to our store!"
              />
              <p className="text-theme-ink-dim text-xs mt-2">Displayed at the top of the printed receipt.</p>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">Receipt Footer</label>
              <textarea 
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                rows={2}
                className="w-full bg-theme-bg border border-theme-border py-3 px-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors text-sm resize-none font-mono"
                placeholder="Thank you. Please come again!"
              />
               <p className="text-theme-ink-dim text-xs mt-2">Displayed below the total and tax amount on the receipt.</p>
            </div>
          </div>
        </section>

        <AdminPasswordCard />

      </div>
    </div>
  );
}
