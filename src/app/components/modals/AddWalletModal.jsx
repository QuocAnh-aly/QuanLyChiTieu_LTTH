import { X, Landmark, Users, PiggyBank, CreditCard, Wallet } from "lucide-react";
import { useState } from "react";

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

export function AddWalletModal({ isOpen, onClose, onAdd }) {
  const [selectedKey, setSelectedKey] = useState('');
  const [name,        setName]        = useState('');
  const [balance,     setBalance]     = useState('');
  const [cardNumber,  setCardNumber]  = useState('');
  const [error,       setError]       = useState('');

  if (!isOpen) return null;

  const selected = ACCOUNT_TYPES.find(t => t.key === selectedKey);
  const showCard = selectedKey === 'credit';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedKey) { setError('Vui lòng chọn loại tài khoản'); return; }
    if (!name.trim()) { setError('Tên tài khoản không được để trống'); return; }

    onAdd({
      name:         name.trim(),
      iconName:     selected.iconName,
      color:        selected.color,
      gradientFrom: selected.from,
      gradientTo:   selected.to,
      balance:      parseFloat(balance) || 0,
      cardNumber:   showCard ? (cardNumber.trim() || null) : null,
    });

    // Reset
    setSelectedKey('');
    setName('');
    setBalance('');
    setCardNumber('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-slate-900">Thêm tài khoản</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">

            {/* Account type — visual cards */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Loại tài khoản <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {ACCOUNT_TYPES.map(type => {
                  const isActive = selectedKey === type.key;
                  return (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => { setSelectedKey(type.key); setError(''); }}
                      className={`flex items-center gap-4 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        isActive
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {/* Icon bubble */}
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
                      {/* Radio dot */}
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'border-purple-500' : 'border-slate-300'
                      }`}>
                        {isActive && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              {error && !name.trim() && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>

            {/* Account name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Tên tài khoản <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setError(''); }}
                placeholder={
                  selectedKey === 'default'  ? 'VD: Tài khoản MB Bank' :
                  selectedKey === 'shared'   ? 'VD: Quỹ gia đình' :
                  selectedKey === 'savings'  ? 'VD: Tiết kiệm mua nhà' :
                  selectedKey === 'credit'   ? 'VD: Thẻ Visa Techcombank' :
                  selectedKey === 'cash'     ? 'VD: Ví tiền mặt' :
                  'Đặt tên tài khoản...'
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {error && name.trim() && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>

            {/* Initial balance */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Số dư ban đầu</label>
              <input
                type="number"
                value={balance}
                onChange={e => setBalance(e.target.value)}
                placeholder="0"
                min={0}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Card number — only for credit card */}
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

            {/* Preview gradient (when type selected) */}
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
              Thêm tài khoản
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
