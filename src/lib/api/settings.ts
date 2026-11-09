import { q, m, api } from '../convex';
import type { OnlineOrderingConfig } from '../onlineOrdering';

export interface SettingsRow {
  online_ordering?: OnlineOrderingConfig | null;
  id: number;
  store_name: string;
  store_address: string;
  store_phone: string;
  tax_id?: string;
  tax_rate: number;
  holiday_surcharge?: number;
  eftpos_surcharge?: number;
  receipt_header: string;
  receipt_footer: string;
  default_starting_cash: number;
  hardware_config?: any;
  currency?: string;
  currency_locale?: string;
  payment_ratio_target?: number;
  enforce_stock?: boolean;
}

export async function fetchSettings(): Promise<SettingsRow | null> {
  return (await q(api.posPeople.getSettings)) as unknown as SettingsRow;
}

export async function updateSettings(data: Partial<SettingsRow>): Promise<SettingsRow> {
  return (await m(api.posPeople.updateSettings, { data })) as unknown as SettingsRow;
}
