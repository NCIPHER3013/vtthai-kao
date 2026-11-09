let _locale = 'en-AU';
let _currency = 'AUD';

export function setCurrencyLocale(locale: string, currency: string) {
  _locale = locale;
  _currency = currency;
}

export default function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(_locale, { style: 'currency', currency: _currency }).format(amount);
}
