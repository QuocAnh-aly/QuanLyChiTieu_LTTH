import { X } from "lucide-react";
import { useState } from "react";

const accountTypes = [
  {
    name: "Checking Account",
    icon: "Landmark",
    color: "blue",
    gradientFrom: "#3b82f6",
    gradientTo: "#1d4ed8",
  },
  {
    name: "Savings Account",
    icon: "WalletIcon",
    color: "green",
    gradientFrom: "#22c55e",
    gradientTo: "#15803d",
  },
  {
    name: "Credit Card",
    icon: "CreditCard",
    color: "purple",
    gradientFrom: "#a855f7",
    gradientTo: "#7e22ce",
  },
  {
    name: "Business Account",
    icon: "Landmark",
    color: "orange",
    gradientFrom: "#f97316",
    gradientTo: "#c2410c",
  },
  {
    name: "Investment Account",
    icon: "TrendingUp",
    color: "emerald",
    gradientFrom: "#10b981",
    gradientTo: "#047857",
  },
  {
    name: "Other",
    icon: "Wallet",
    color: "slate",
    gradientFrom: "#64748b",
    gradientTo: "#475569",
  },
];

export function AddWalletModal({ isOpen, onClose, onAdd }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [balance, setBalance] = useState("");
  const [cardNumber, setCardNumber] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && type && balance) {
      const selectedType = accountTypes.find((t) => t.name === type);
      onAdd({
        name,
        type,
        balance: parseFloat(balance),
        cardNumber: cardNumber || "•••• ••••",
        color: selectedType?.color || "blue",
      });
      setName("");
      setType("");
      setBalance("");
      setCardNumber("");
      onClose();
    }
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
          <h2 className="text-2xl font-bold text-slate-900">Add Account</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Account Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Select account type</option>
              {accountTypes.map((accType) => (
                <option key={accType.name} value={accType.name}>
                  {accType.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Account Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Chase Checking"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Current Balance
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500">
                $
              </span>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0.00"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Card Number (Last 4 digits)
            </label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="•••• 1234"
              maxLength={9}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              Add Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
