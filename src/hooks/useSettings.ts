import { useState, useEffect } from 'react';
import { subscribeTables } from '../lib/convex';
import { Settings } from '../types';
import { setCurrencyLocale } from '../lib/formatCurrency';
import { fetchSettings } from '../lib/api/settings';

const CACHE_KEY = 'kungpos_settings_cache';

function loadCache(): Partial<Settings> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCache(data: Partial<Settings>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

export function useSettings() {
  const [settings, setSettings] = useState<Partial<Settings>>(() => loadCache() || {});

  useEffect(() => {
    loadSettings();

    const channelName = `settings_hook_${Math.random().toString(36).substring(7)}`;
    const channel = subscribeTables(['settings'], () => {
        loadSettings();
      });

    return () => {
      channel();
    };
  }, []);

  async function loadSettings() {
    try {
      const data = await fetchSettings();
      if (data) {
        setSettings(data);
        saveCache(data);
        setCurrencyLocale(data.currency_locale || 'en-AU', data.currency || 'AUD');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }

  return {
    storeName: settings.store_name || '',
    taxRate: settings.tax_rate ?? 0.10,
    defaultStartingCash: settings.default_starting_cash ?? 1000,
    receiptHeader: settings.receipt_header || '',
    receiptFooter: settings.receipt_footer || '',
    storeAddress: settings.store_address || '',
    storePhone: settings.store_phone || '',
    holidaySurcharge: settings.holiday_surcharge ?? 0,
    eftposSurcharge: settings.eftpos_surcharge ?? 0,
    settings,
  };
}
