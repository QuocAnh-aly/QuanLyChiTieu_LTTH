import { X, Landmark, Users, PiggyBank, CreditCard, Wallet, DollarSign, Euro, JapaneseYen } from "lucide-react";
import { useState, useEffect } from "react";

const CURRENCIES = [
  { code: "VND", symbol: "₫", label: "Việt Nam Đồng", Icon: DollarSign },
  { code: "USD", symbol: "$", label: "US Dollar",       Icon: DollarSign },
  { code: "EUR", symbol: "€", label: "Euro",            Icon: Euro },
  { code: "JPY", symbol: "¥", label: "Japanese Yen",    Icon: JapaneseYen },
];

const ACCOUNT_TYPES = [
  {
    key:      'default',
    label:    'Tài khoản mặc định',
    desc:     'Tài khoản thanh toán chính',
    iconName: 'Landmark',
    Icon:     Landmark,
    color:    'blue',
    from:     '#3b82f6',
    to:       '#1d4ed8',
  },
  {
    key:      'shared',
    label:    'Tài khoản dùng chung',
    desc:     'Chia sẻ với người khác',
    iconName: 'Users',
    Icon:     Users,
    color:    'purple',
    from:     '#a855f7',
    to:       '#7e22ce',
  },
  {
    key:      'savings',
    label:    'Tài khoản tiết kiệm',
    desc:     'Tích lũy dài hạn',
    iconName: 'PiggyBank',
    Icon:     PiggyBank,
    color:    'green',
    from:     '#22c55e',
    to:       '#15803d',
  },
  {
    key:      'credit',
    label:    'Thẻ tín dụng',
    desc:     'Thanh toán trả sau',
    iconName: 'CreditCard',
    Icon:     CreditCard,
    color:    'orange',
    from:     '#f97316',
    to:       '#c2410c',
  },
  {
    key:      'cash',
    label:    'Ví tiền mặt',
    desc:     'Tiền mặt trong tay',
    iconName: 'Wallet',
    Icon:     Wallet,
    color:    'emerald',
    from:     '#10b981',
    to:       '#047857',
  },
];

// Map iconName → type key so we can pre-select from existing wallet data
const ICON_TO_KEY = {
  Landmark:   'default',
  Users:      'shared',
  PiggyBank:  'savings',
  CreditCard: 'credit',
  Wallet:     'cash',
  WalletIcon: 'cash',
};

export function EditWalletModal({ wallet, onClose, onSave }) {
  const [selectedKey, setSelectedKey] = useState(() => ICON_TO_KEY[wallet.iconName] || 'default');
  const [name,        setName]        = useState(wallet.name || '');
  const [cardNumber,  setCardNumber]  = useState(wallet.cardNumber || '');
  const [currency,    setCurrency]    = useState(wallet.currencyCode || 'VND');
  const [error,       setError]       = useState('');

  useEffect(() => {
    setSelectedKey(ICON_TO_KEY[wallet.iconName] || 'default');
    setName(wallet.name || '');
    setCardNumber(wallet.cardNumber || '');
    setCurrency(wallet.currencyCode || 'VND');
    setError('');
  }, [wallet]);

  const selected  = ACCOUNT_TYPES.find(t => t.key === selectedKey);
  const showCard  = selectedKey === 'credit';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Tên tài khoản không được để trống'); return; }

    const updates = { name: name.trim() };

    if (currency !== wallet.currencyCode) {
      updates.currencyCode = currency;
    }

    if (selected && selected.iconName !== wallet.iconName) {
      updates.iconName     = selected.iconName;
      updates.color        = selected.color;
      updates.gradientFrom = selected.from;
      updates.gradientTo   = selected.to;
    }

    const newCard = showCard ? (cardNumber.trim() || null) : null;
    if (newCard !== (wallet.cardNumber || null)) updates.cardNumber = newCard;

    onSave(wallet.id, updates);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-slate-900">Sửa tài khoản</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">

            {/* Account type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Loại tài khoản</label>
              <div className="grid grid-cols-1 gap-2">
                {ACCOUNT_TYPES.map(type => {
                  const isActive = selectedKey === type.key;
                  return (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => setSelectedKey(type.key)}
                      className={`flex items-center gap-4 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        isActive
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${type.from}, ${type.to})` }}
                      >
                        <type.Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${isActive ? 'text-purple-700' : 'text-slate-800'}`}>
                          {type.label}
                        </p>
                        <p className="text-xs text-slate-400">{type.desc}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'border-purple-500' : 'border-slate-300'
                      }`}>
                        {isActive && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Account name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Tên tài khoản <span className="text-red-500">*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setError(''); }}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Loại tiền tệ
              </label>
              <div className="grid grid-cols-4 gap-2">
                {CURRENCIES.map(c => {
                  const isActive = currency === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setCurrency(c.code)}
                      className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 text-center transition-all ${
                        isActive
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <c.Icon size={18} className={isActive ? 'text-purple-600' : 'text-slate-400'} />
                      <span className={`text-xs font-bold ${isActive ? 'text-purple-700' : 'text-slate-600'}`}>
                        {c.code}
                      </span>
                      <span className={`text-[10px] ${isActive ? 'text-purple-500' : 'text-slate-400'}`}>
                        {c.symbol}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card number — credit only */}
            {showCard && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Số thẻ (4 số cuối)</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  placeholder="VD: •••• 1234"
                  maxLength={9}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}

            {/* Preview */}
            {selected && (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-semibold"
                style={{ background: `linear-gradient(135deg, ${selected.from}, ${selected.to})` }}
              >
                <selected.Icon size={18} className="opacity-90" />
                <span className="opacity-90">{name.trim() || selected.label}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
