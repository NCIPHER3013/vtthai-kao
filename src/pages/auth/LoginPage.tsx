import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ShieldCheck, Delete, Loader2 } from 'lucide-react';
import { convex, api, setToken } from '../../lib/convex';
import { fetchStaffByPin } from '../../lib/api/staff';
import { DbError } from '../../lib/api/errors';
import { useSettings } from '../../hooks/useSettings';

export default function LoginPage() {
  const navigate = useNavigate();
  const { storeName } = useSettings();
  const [mode, setMode] = useState<'pin' | 'admin'>('pin');
  const [pin, setPin] = useState('');
  
  // Auth state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handlePinPress = async (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      
      if (newPin.length === 4) {
        setIsLoading(true);
        setErrorMsg('');
        
        try {
          const data = await fetchStaffByPin(newPin);

          if (!data) {
            throw new Error('Invalid PIN or account deactivated');
          }

          if (data) {
            const userSession = {
              id: data.id,
              name: data.name,
              role: data.role.toLowerCase()
            };
            localStorage.setItem('kungpos_staff', JSON.stringify(userSession));
            
            // Route based on role
            setTimeout(() => {
              const role = userSession.role;
              if (role === 'kitchen') {
                navigate('/kds');
              } else if (role === 'admin' || role === 'manager') {
                navigate('/admin');
              } else {
                navigate('/pos'); // default for cashier
              }
            }, 300);
          }
        } catch (error: any) {
          setErrorMsg(error.message || 'Authentication failed');
          setPin(''); // reset pin
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  // Keyboard support for PIN pad
  useEffect(() => {
    if (mode !== 'pin' || isLoading) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handlePinPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, mode, isLoading]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      // Verified server-side against the admin password stored in Convex (the email field is informational only).
      const res = await convex.mutation(api.posAuth.loginAdmin, { password });
      if (!res) throw new Error('Invalid admin credentials');
      setToken(res.token);
      localStorage.setItem('kungpos_admin', 'true');
      localStorage.removeItem('kungpos_staff');
      navigate('/admin');
    } catch (error: any) {
      setErrorMsg(error?.message?.includes('Invalid admin') ? 'Invalid admin credentials' : 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-theme-bg flex items-center justify-center font-sans p-4">
      <div className="w-full max-w-md bg-theme-surface border border-theme-border p-10 shadow-2xl relative">
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-theme-surface/80 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-theme-accent animate-spin" />
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-serif italic text-4xl text-theme-ink mb-3">{storeName || 'Vermont Thai'}</h1>
          <p className="text-xs uppercase tracking-[2px] text-theme-accent">
            {mode === 'pin' ? 'Staff Terminal' : 'System Authentication'}
          </p>
        </div>

        {/* Global Error Message */}
        {errorMsg && (
          <div className="mb-6 p-3 border border-red-500/30 bg-red-500/10 text-red-500 text-xs text-center uppercase tracking-wider font-semibold animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex border border-theme-border p-1 mb-8 bg-theme-bg">
          <button
            type="button"
            onClick={() => { setMode('pin'); setErrorMsg(''); setPin(''); }}
            className={`flex-1 py-3 text-xs uppercase tracking-wider font-semibold transition-colors ${
              mode === 'pin' ? 'bg-theme-surface-alt text-theme-ink' : 'text-theme-ink-dim hover:text-theme-ink'
            }`}
          >
            Staff PIN
          </button>
          <button
            type="button"
            onClick={() => { setMode('admin'); setErrorMsg(''); }}
            className={`flex-1 py-3 text-xs uppercase tracking-wider font-semibold transition-colors ${
              mode === 'admin' ? 'bg-theme-surface-alt text-theme-ink' : 'text-theme-ink-dim hover:text-theme-ink'
            }`}
          >
            Admin Login
          </button>
        </div>

        {/* PIN Pad Mode */}
        {mode === 'pin' && (
          <div className="animate-in fade-in duration-300">
            {/* PIN Display */}
            <div className="flex justify-center gap-4 mb-8">
              {[0, 1, 2, 3].map((index) => (
                <div 
                  key={index}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    index < pin.length 
                      ? 'bg-theme-accent border-theme-accent scale-110' 
                      : 'border-theme-border bg-transparent'
                  }`}
                />
              ))}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinPress(num.toString())}
                  className="bg-theme-bg border border-theme-border py-6 text-2xl font-mono text-theme-ink hover:border-theme-accent hover:text-theme-accent transition-colors active:scale-95"
                >
                  {num}
                </button>
              ))}
              <div className="bg-transparent"></div>
              <button
                type="button"
                onClick={() => handlePinPress('0')}
                className="bg-theme-bg border border-theme-border py-6 text-2xl font-mono text-theme-ink hover:border-theme-accent hover:text-theme-accent transition-colors active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="bg-theme-bg border border-theme-border py-6 flex items-center justify-center text-theme-ink-dim hover:text-red-400 hover:border-red-400 transition-colors active:scale-95"
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* Admin Email/Password Mode */}
        {mode === 'admin' && (
          <form className="space-y-6 animate-in fade-in duration-300" onSubmit={handleAdminLogin}>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-theme-ink-dim">Email / Username</label>
              <input 
                type="text" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-theme-bg border border-theme-border px-4 py-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors font-mono text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-theme-ink-dim">Password</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-theme-bg border border-theme-border px-4 py-4 text-theme-ink focus:outline-none focus:border-theme-accent transition-colors font-mono text-sm"
              />
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-theme-accent text-black py-4 font-semibold hover:bg-opacity-90 transition-colors uppercase tracking-[2px] text-xs flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                Login to Backoffice
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
