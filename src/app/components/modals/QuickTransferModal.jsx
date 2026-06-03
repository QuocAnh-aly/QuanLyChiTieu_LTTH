import { X, ArrowLeftRight, HandCoins } from "lucide-react";
import { useState, useEffect } from "react";
import { walletApi } from "../../api/walletApi";
import { useSettings } from "../../context/SettingsContext";
import { formatVND, parseVND } from "../../utils/formatMoney";

export function QuickTransferModal({ isOpen, onClose, onTransfer }) {
  const { fmt } = useSettings();
  const [accounts, setAccounts] = useState([]);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isDebtPayment, setIsDebtPayment] = useState(false);
  const [liabilityAccounts, setLiabilityAccounts] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    walletApi
      .getByType(1)
      .then((data) => setAccounts(data.items || data || []))
      .catch(() => {});
    walletApi.getByType(2)
      .then(data => setLiabilityAccounts(data.items || data || []))
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const availableTo = accounts.filter((a) => String(a.accountId) !== fromId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fromId || !toId || !amount || parseFloat(amount) <= 0) return;
    onTransfer({
      debitAccountId: parseInt(toId),
      creditAccountId: parseInt(fromId),
      amount: parseFloat(amount),
      description: description.trim() || null,
    });
    onClose();
  };

  const formatBalance = (val) => {
    try {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(val ?? 0);
    } catch {
      return `${Number(val ?? 0).toLocaleString("vi-VN")} VND`;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <ArrowLeftRight size={16} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-card-foreground">
              Chuyển khoản
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            {/* From account */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Tài khoản nguồn <span className="text-red-500">*</span>
              </label>
              <select
                value={fromId}
                onChange={(e) => {
                  setFromId(e.target.value);
                  setToId("");
                }}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                required
              >
                <option value="">Chọn tài khoản</option>
                {accounts.map((a) => (
                  <option key={a.accountId} value={a.accountId}>
                    {a.name} — {formatBalance(a.balance)}
                  </option>
                ))}
              </select>
            </div>

            {/* Checkbox: Thanh toán nợ */}
            <label className="flex items-center gap-2 cursor-pointer select-none p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={isDebtPayment}
                onChange={(e) => {
                  setIsDebtPayment(e.target.checked);
                  setToId("");
                }}
                className="w-4 h-4 rounded border-border accent-red-500"
              />
              <div className="flex items-center gap-1.5">
                <HandCoins size={15} className="text-red-500" />
                <span className="text-sm font-medium text-foreground">Thanh toán nợ</span>
                <span className="text-xs text-muted-foreground">(chọn tài khoản nợ ở ví đích)</span>
              </div>
            </label>

            {/* To account */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                {isDebtPayment ? (
                  <span className="flex items-center gap-1.5">
                    <HandCoins size={14} className="text-red-500" />
                    Trả nợ cho <span className="text-red-500">*</span>
                  </span>
                ) : (
                  <>Tài khoản đích <span className="text-red-500">*</span></>
                )}
              </label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 bg-card ${
                  isDebtPayment
                    ? "border-red-300 focus:ring-red-500 bg-red-50/30"
                    : "border-border focus:ring-purple-500"
                }`}
                disabled={!fromId}
                required
              >
                <option value="">
                  {!fromId
                    ? "Chọn tài khoản nguồn trước"
                    : isDebtPayment
                      ? "Chọn khoản nợ cần trả"
                      : "Chọn tài khoản đích"}
                </option>
                {isDebtPayment
                  ? liabilityAccounts
                      .filter((a) => Math.abs(a.balance ?? 0) > 0)
                      .map((a) => (
                        <option key={a.accountId} value={a.accountId}>
                          {a.name} — Nợ {formatBalance(Math.abs(a.balance ?? 0))}
                        </option>
                      ))
                  : availableTo.map((a) => (
                      <option key={a.accountId} value={a.accountId}>
                        {a.name} — {formatBalance(a.balance)}
                      </option>
                    ))
                }
              </select>
              {fromId && availableTo.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Không còn tài khoản nào để chuyển.
                </p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Số tiền <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                  VND
                </span>
                <input
                  type="text"
                  value={formatVND(amount)}
                  onChange={(e) => setAmount(parseVND(e.target.value))}
                  className="w-full pl-14 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="0"
                  step="1000"
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Mô tả
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Lý do chuyển khoản..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-semibold text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!fromId || !toId || !amount || parseFloat(amount) <= 0}
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Chuyển khoản
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
