import { useState, useEffect } from 'react';
import { subscribeTables } from '../../lib/convex';
import { fetchSettings as apiFetchSettings, updateSettings } from '../../lib/api/settings';
import { Printer, Server, Loader2, Save, Wifi, CheckCircle2 } from 'lucide-react';
import { HardwareConfig } from '../../types';
import { useToast } from '../../components/Toast';

const DEFAULT_HARDWARE: HardwareConfig = {
  receiptPrinterIp: '',
  kitchenPrinterIp: '',
  cashDrawerEnabled: true,
  cashDrawerPath: '/dev/usb/lp0'
};

export default function HardwarePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [hardware, setHardware] = useState<HardwareConfig>({ ...DEFAULT_HARDWARE });

  useEffect(() => {
    fetchHardwareConfig();

    const channel = subscribeTables(['settings'], () => {
        fetchHardwareConfig();
      });

    return () => {
      channel();
    };
  }, []);

  async function fetchHardwareConfig() {
    try {
      const data = await apiFetchSettings();
      if (data?.hardware_config) {
        setHardware({ ...DEFAULT_HARDWARE, ...(data.hardware_config as Partial<HardwareConfig>) });
      }
    } catch (error) {
      console.error('Error fetching hardware config:', error);
      const local = localStorage.getItem('kungpos_hardware');
      if (local) {
        try { setHardware({ ...DEFAULT_HARDWARE, ...JSON.parse(local) }); } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMsg('');
    try {
      await updateSettings({ hardware_config: hardware } as any);

      localStorage.setItem('kungpos_hardware', JSON.stringify(hardware));
      setSuccessMsg('Hardware configuration saved and synced.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Error saving hardware config:', error);
      toast('Failed to save. Check console for details.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-theme-ink">Hardware & Devices</h1>
          <p className="text-theme-ink-dim mt-1">Configure peripherals attached to this terminal.</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-3 flex items-center gap-2 text-sm uppercase tracking-wider font-semibold">
          <CheckCircle2 className="w-5 h-5" />
          {successMsg}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-theme-surface border border-theme-border flex flex-col h-full">
            <div className="p-6 border-b border-theme-border flex items-center gap-3 bg-theme-surface-alt">
              <Printer className="w-5 h-5 text-theme-accent" />
              <h2 className="font-serif text-xl text-theme-ink">Network Printers</h2>
            </div>
            
            <div className="p-6 space-y-6 flex-1">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim mb-2 flex justify-between">
                  Receipt Printer IP
                  <span className="text-emerald-500 flex items-center gap-1"><Wifi className="w-3 h-3"/> ESC/POS</span>
                </label>
                <input 
                  type="text" 
                  value={hardware.receiptPrinterIp}
                  onChange={e => setHardware({...hardware, receiptPrinterIp: e.target.value})}
                  className="w-full bg-theme-bg border border-theme-border p-3 text-sm font-mono focus:outline-none focus:border-theme-accent transition-colors"
                  placeholder="192.168.1.x"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim mb-2 flex justify-between">
                  Kitchen Printer IP
                  <span className="text-emerald-500 flex items-center gap-1"><Wifi className="w-3 h-3"/> ESC/POS</span>
                </label>
                <input 
                  type="text" 
                  value={hardware.kitchenPrinterIp}
                  onChange={e => setHardware({...hardware, kitchenPrinterIp: e.target.value})}
                  className="w-full bg-theme-bg border border-theme-border p-3 text-sm font-mono focus:outline-none focus:border-theme-accent transition-colors"
                  placeholder="192.168.1.x"
                />
              </div>
            </div>
          </div>

          <div className="bg-theme-surface border border-theme-border flex flex-col h-full">
            <div className="p-6 border-b border-theme-border flex items-center gap-3 bg-theme-surface-alt">
              <Server className="w-5 h-5 text-theme-accent" />
              <h2 className="font-serif text-xl text-theme-ink">Local Peripherals</h2>
            </div>
            
            <div className="p-6 space-y-6 flex-1">
              <label className="flex items-start gap-4 cursor-pointer p-4 border border-theme-border hover:border-theme-accent transition-colors bg-theme-bg">
                <input 
                  type="checkbox" 
                  checked={hardware.cashDrawerEnabled}
                  onChange={e => setHardware({...hardware, cashDrawerEnabled: e.target.checked})}
                  className="mt-1 w-4 h-4 accent-theme-accent bg-theme-surface border-theme-border"
                />
                <div>
                  <span className="block text-sm font-semibold text-theme-ink uppercase tracking-wider mb-1">Enable Cash Drawer Kick</span>
                  <p className="text-[11px] text-theme-ink-dim leading-relaxed">Sends pulse signal to open drawer on cash transactions.</p>
                </div>
              </label>

              {hardware.cashDrawerEnabled && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-[11px] uppercase tracking-wider text-theme-ink-dim font-bold mb-2">
                    Device Path / Port
                  </label>
                  <input 
                    type="text" 
                    value={hardware.cashDrawerPath}
                    onChange={e => setHardware({...hardware, cashDrawerPath: e.target.value})}
                    className="w-full bg-theme-bg border border-theme-border p-3 text-sm font-mono focus:outline-none focus:border-theme-accent transition-colors"
                    placeholder="/dev/usb/lp0 or COM1"
                  />
                  <p className="text-[10px] text-theme-ink-dim mt-2">Required if drawer is directly connected via USB/Serial instead of printer-driven.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          disabled={isLoading || isSaving}
          className="bg-theme-accent text-black rounded-md px-8 py-3 text-sm uppercase tracking-wider font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_10px_rgba(197,160,89,0.2)]"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

    </div>
  );
}
