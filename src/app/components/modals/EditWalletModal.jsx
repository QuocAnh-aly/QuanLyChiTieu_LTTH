import { X, Check, Landmark, Users, PiggyBank, CreditCard, Wallet, DollarSign, Euro, JapaneseYen, Tag, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useSettings } from "../../context/SettingsContext";

const COLOR_OPTIONS = [
  { value: 'blue',    label: 'Xanh dương', from: '#3b82f6', to: '#1d4ed8'  },
  { value: 'green',   label: 'Xanh lá',    from: '#22c55e', to: '#15803d'  },
  { value: 'purple',  label: 'Tím',        from: '#a855f7', to: '#7e22ce'  },
  { value: 'orange',  label: 'Cam',        from: '#f97316', to: '#c2410c'  },
  { value: 'emerald', label: 'Ngọc',       from: '#10b981', to: '#047857'  },
  { value: 'red',     label: 'Đỏ',         from: '#ef4444', to: '#b91c1c'  },
  { value: 'slate',   label: 'Xám',        from: '#64748b', to: '#475569'  },
  { value: 'pink',    label: 'Hồng',       from: '#ec4899', to: '#be185d'  },
  { value: 'amber',   label: 'Hổ phách',  from: '#f59e0b', to: '#d97706'  },
];

const COLOR_MAP = Object.fromEntries(COLOR_OPTIONS.map(c => [c.value, c]));

const CURRENCIES = [
  { code: "VND", symbol: "₫", label: "Việt Nam Đồng", Icon: DollarSign },
  { code: "USD", symbol: "$", label: "US Dollar",      Icon: DollarSign },
  { code: "EUR", symbol: "€", label: "Euro",           Icon: Euro },
  { code: "JPY", symbol: "¥", label: "Japanese Yen",   Icon: JapaneseYen },
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

const ICON_TO_KEY = {
  Landmark:   'default',
  Users:      'shared',
  PiggyBank:  'savings',
  CreditCard: 'credit',
  Wallet:     'cash',
  WalletIcon: 'cash',
};

export function EditWalletModal({ wallet, onClose, onSave }) {
  const { currencySymbol } = useSettings();

  const [selectedKey, setSelectedKey] = useState(() => ICON_TO_KEY[wallet.iconName] || 'default');
  const [name,        setName]        = useState(wallet.name || '');
  const [cardNumber,  setCardNumber]  = useState(wallet.cardNumber || '');
  const [currency,    setCurrency]    = useState(wallet.currencyCode || 'VND');
  const [color,       setColor]       = useState(wallet.color || 'blue');
  const [error,       setError]       = useState('');

  useEffect(() => {
    setSelectedKey(ICON_TO_KEY[wallet.iconName] || 'default');
    setName(wallet.name || '');
    setCardNumber(wallet.cardNumber || '');
    setCurrency(wallet.currencyCode || 'VND');
    setColor(wallet.color || 'blue');
    setError('');
  }, [wallet]);

  const selected  = ACCOUNT_TYPES.find(t => t.key === selectedKey);
  const showCard  = selectedKey === 'credit';
  const selectedColor = COLOR_MAP[color] || COLOR_MAP.blue;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Tên tài khoản không được để trống'); return; }

    const updates = { name: name.trim() };

    if (currency !== wallet.currencyCode) {
      updates.currencyCode = currency;
    }

    if (selected && selected.iconName !== wallet.iconName) {
      updates.iconName     = selected.iconName;
      updates.color        = color;
      updates.gradientFrom = selectedColor.from;
      updates.gradientTo   = selectedColor.to;
    } else if (color !== wallet.color) {
      updates.color        = color;
      updates.gradientFrom = selectedColor.from;
      updates.gradientTo   = selectedColor.to;
    }

    const newCard = showCard ? (cardNumber.trim() || null) : null;
    if (newCard !== (wallet.cardNumber || null)) updates.cardNumber = newCard;

    onSave(wallet.id, updates);
  };

  if (!wallet) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─────── Header ─────── */}
        <div className="shrink-0 px-4 pt-4">
          <div
            className="relative overflow-hidden rounded-xl px-5 py-4 text-white"
            style={{ background: `linear-gradient(135deg, ${selectedColor.from}, ${selectedColor.to})` }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12 pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                  {selected && <selected.Icon size={20} className="text-white" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Sửa tài khoản</h2>
                  <p className="text-[11px] text-white/70 mt-0.5">Chỉnh sửa thông tin tài khoản</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white/70 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ─────── Content (scrollable) ─────── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <form onSubmit={handleSubmit} id="edit-wallet-form">
            {/* ═══════════════ SECTION: Loại tài khoản ═══════════════ */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={14} className="text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Loại tài khoản</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {ACCOUNT_TYPES.map(type => {
                  const isActive = selectedKey === type.key;
                  return (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => setSelectedKey(type.key)}
                      className={`flex items-center gap-4 px-4 py-3 rounded-xl border-2 text-left transition-all duration-200 w-full ${
                        isActive
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-sm'
                          : 'border-border hover:border-muted-foreground/30 hover:bg-muted'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 transition-transform duration-200"
                        style={{
                          background: `linear-gradient(135deg, ${type.from}, ${type.to})`,
                          transform: isActive ? 'scale(1.05)' : 'scale(1)',
                        }}
                      >
                        <type.Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${isActive ? 'text-purple-700 dark:text-purple-300' : 'text-foreground'}`}>
                          {type.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{type.desc}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        isActive ? 'border-purple-500' : 'border-border'
                      }`}>
                        {isActive && <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ═══════════════ SECTION: Thông tin ═══════════════ */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={14} className="text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Thông tin</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Name */}
              <div className="mb-3">
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Tên tài khoản <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setError(''); }}
                  className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card transition-shadow"
                />
                {error && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block shrink-0" />{error}</p>}
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Loại tiền tệ</label>
                <div className="grid grid-cols-4 gap-2">
                  {CURRENCIES.map(c => {
                    const isActive = currency === c.code;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setCurrency(c.code)}
                        className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 text-center transition-all duration-200 ${
                          isActive
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-sm'
                            : 'border-border hover:border-muted-foreground/30 hover:bg-muted'
                        }`}
                      >
                        <c.Icon size={18} className={isActive ? 'text-purple-600' : 'text-muted-foreground'} />
                        <span className={`text-xs font-bold ${isActive ? 'text-purple-700 dark:text-purple-300' : 'text-muted-foreground'}`}>
                          {c.code}
                        </span>
                        <span className={`text-[10px] ${isActive ? 'text-purple-500' : 'text-muted-foreground'}`}>
                          {c.symbol}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card number — credit only */}
              {showCard && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Số thẻ (4 số cuối)</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={e => setCardNumber(e.target.value)}
                    placeholder="VD: •••• 1234"
                    maxLength={9}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card transition-shadow"
                  />
                </div>
              )}
            </div>

            {/* ═══════════════ SECTION: Màu sắc ═══════════════ */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={13} className="text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Màu sắc</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {COLOR_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setColor(opt.value)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all duration-200 ${
                      color === opt.value
                        ? 'border-purple-500 ring-2 ring-purple-200 dark:ring-purple-700 scale-110'
                        : 'border-border hover:border-muted-foreground/40'
                    }`}
                    style={{ background: `linear-gradient(135deg, ${opt.from}, ${opt.to})` }}
                    title={opt.label}
                  />
                ))}
              </div>
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ background: `linear-gradient(90deg, ${selectedColor.from}, ${selectedColor.to})` }}
              />
            </div>
          </form>
        </div>

        {/* ─────── Preview Card ─────── */}
        {name.trim() && (
          <div className="px-4 sm:px-6 shrink-0 animate-in fade-in slide-in-from-bottom-1 duration-200">
            <div
              className="relative overflow-hidden rounded-xl p-4 text-white mb-0"
              style={{ background: `linear-gradient(135deg, ${selectedColor.from}, ${selectedColor.to})` }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white opacity-5 rounded-full -ml-10 -mb-10 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-white/60 uppercase tracking-wider font-semibold">Tài sản</span>
                  {selected && <selected.Icon size={14} className="text-white/60" />}
                </div>
                <p className="text-base font-bold truncate">{name.trim()}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-bold tracking-tight">
                    {wallet.balance != null ? new Intl.NumberFormat('vi-VN').format(wallet.balance) : '—'} {currencySymbol}
                  </span>
                  {currency !== 'VND' && (
                    <span className="text-[10px] font-semibold bg-white/15 px-2 py-0.5 rounded-full">{currency}</span>
                  )}
                </div>
                {showCard && cardNumber.trim() && (
                  <p className="text-[11px] text-white/70 mt-1 font-mono tracking-widest">{cardNumber}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─────── Footer ─────── */}
        <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t border-border bg-muted/30 rounded-b-2xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="edit-wallet-form"
            className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${selectedColor.from}, ${selectedColor.to})`,
            }}
          >
            <Check size={16} />
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
