import { X } from "lucide-react";
import { useState } from "react";

const accountTypes = [
  { label: "Tài khoản thanh toán", iconName: "Landmark",   color: "blue"    },
  { label: "Tài khoản tiết kiệm",  iconName: "WalletIcon", color: "green"   },
  { label: "Thẻ tín dụng",        iconName: "CreditCard", color: "purple"  },
  { label: "Tài khoản kinh doanh", iconName: "Landmark",   color: "orange"  },
  { label: "Đầu tư",              iconName: "TrendingUp", color: "emerald" },
  { label: "Khác",                iconName: "WalletIcon", color: "slate"   },
];

export function EditWalletModal({ wallet, onClose, onSave }) {
  const [name, setName] = useState(wallet.name);
  const [typeIndex, setTypeIndex] = useState(() => {
    const idx = accountTypes.findIndex((t) => t.iconName === wallet.iconName);
    return idx >= 0 ? String(idx) : "";
  });
  const [cardNumber, setCardNumber] = useState(wallet.cardNumber || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    const updates = {};
    if (name !== wallet.name) updates.name = name;
    if (cardNumber !== (wallet.cardNumber || "")) updates.cardNumber = cardNumber || null;
    if (typeIndex !== "") {
      const selected = accountTypes[typeIndex];
      if (selected.iconName !== wallet.iconName) updates.iconName = selected.iconName;
      if (selected.color !== wallet.color) updates.color = selected.color;
    }
    onSave(wallet.id, updates);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Sửa tài khoản</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Loại tài khoản
            </label>
            <select
              value={typeIndex}
              onChange={(e) => setTypeIndex(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Giữ hiện tại ({wallet.type})</option>
              {accountTypes.map((t, i) => (
                <option key={t.iconName + i} value={i}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Tên tài khoản <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Số thẻ (4 số cuối)
            </label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., •••• 1234"
              maxLength={9}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
