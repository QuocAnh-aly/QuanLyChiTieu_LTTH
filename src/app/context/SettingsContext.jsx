import { createContext, useContext, useState } from 'react';

const SettingsContext = createContext(null);

const DEFAULT_CURRENCIES = [
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', isDefault: true },
  { code: 'USD', name: 'US Dollar',        symbol: '$', isDefault: false },
  { code: 'EUR', name: 'Euro',             symbol: '€', isDefault: false },
  { code: 'JPY', name: 'Japanese Yen',     symbol: '¥', isDefault: false },
];

// rates[code] = "1 unit of code = X units of default currency"
// e.g. rates.USD = 25450 means 1 USD = 25,450 VND (when VND is default)
const DEFAULT_RATES = { USD: 25450, EUR: 27500, JPY: 162.5 };

function load(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

export function SettingsProvider({ children }) {
  const [currency, setCurrencyCode] = useState(
    () => localStorage.getItem('app_currency') || 'VND'
  );
  const [currencies, setCurrenciesState] = useState(() => load('app_currencies', DEFAULT_CURRENCIES));
  const [rates,      setRatesState]      = useState(() => load('app_rates',      DEFAULT_RATES));
  const [lastRateSync, setLastRateSync]  = useState(() => localStorage.getItem('app_rate_sync') || null);

  // ── Currencies ────────────────────────────────────────────────
  const persistCurrencies = (list) => {
    setCurrenciesState(list);
    localStorage.setItem('app_currencies', JSON.stringify(list));
  };

  const setCurrency = (code) => {
    setCurrencyCode(code);
    localStorage.setItem('app_currency', code);
  };

  const setDefaultCurrency = (code) => {
    persistCurrencies(currencies.map(c => ({ ...c, isDefault: c.code === code })));
    setCurrency(code);
  };

  const addCurrency = (newCurr) => {
    if (currencies.find(c => c.code === newCurr.code)) {
      throw new Error('Mã tiền tệ đã tồn tại');
    }
    persistCurrencies([...currencies, { ...newCurr, isDefault: false }]);
    // Init rate = 1 if not already set
    if (rates[newCurr.code] == null) {
      const updated = { ...rates, [newCurr.code]: 1 };
      setRatesState(updated);
      localStorage.setItem('app_rates', JSON.stringify(updated));
    }
  };

  const removeCurrency = (code) => {
    const curr = currencies.find(c => c.code === code);
    if (!curr) return;
    if (curr.isDefault) throw new Error('Không thể xóa tiền tệ mặc định');
    persistCurrencies(currencies.filter(c => c.code !== code));
    const { [code]: _, ...rest } = rates;
    setRatesState(rest);
    localStorage.setItem('app_rates', JSON.stringify(rest));
  };

  // ── Exchange rates ─────────────────────────────────────────────
  const setRate = (code, value) => {
    const updated = { ...rates, [code]: Number(value) };
    setRatesState(updated);
    localStorage.setItem('app_rates', JSON.stringify(updated));
  };

  // Merge a batch of { code: rate } into existing rates (used after API sync)
  const bulkUpdateRates = (batch) => {
    const updated = { ...rates, ...batch };
    setRatesState(updated);
    localStorage.setItem('app_rates', JSON.stringify(updated));
  };

  const syncRates = () => {
    const now = new Date().toISOString();
    setLastRateSync(now);
    localStorage.setItem('app_rate_sync', now);
  };

  // Convert `amount` from currency `from` to currency `to`
  // Uses: rates[X] = "1 X = rates[X] base"
  const convert = (amount, from, to) => {
    if (from === to) return amount;
    const rateFrom = from === currency ? 1 : (rates[from] ?? 1);
    const rateTo   = to   === currency ? 1 : (rates[to]   ?? 1);
    return (amount * rateFrom) / rateTo;
  };

  // ── Formatting ─────────────────────────────────────────────────
  const currencySymbol = currencies.find(c => c.code === currency)?.symbol ?? currency;

  const fmt = (n) => `${Number(n ?? 0).toLocaleString()} ${currencySymbol}`;

  const fmtShort = (n) => {
    const num = Number(n ?? 0);
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000)     return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000)         return `${(num / 1_000).toFixed(0)}k`;
    return `${num}`;
  };

  return (
    <SettingsContext.Provider value={{
      currency, setCurrency,
      currencies, setDefaultCurrency, addCurrency, removeCurrency,
      rates, setRate, bulkUpdateRates, syncRates, lastRateSync, convert,
      currencySymbol, fmt, fmtShort,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
