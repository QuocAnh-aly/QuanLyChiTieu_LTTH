import { X, ArrowRight } from "lucide-react";
import { useState } from "react";

export function QuickTransferModal({ accounts, onClose, onTransfer }) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const fromAccount = accounts.find((a) => String(a.id) === String(fromId));
  const toAccount = accounts.find((a) => String(a.id) === String(toId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromId || !toId || !amount || fromId === toId) return;
    setLoading(true);
    try {
      await onTransfer({
        debitAccountId: parseInt(fromId),
        creditAccountId: parseInt(toId),
        amount: parseFloat(amount),
        description: note || `Chuyển khoản: ${fromAccount?.name} → ${toAccount?.name}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-card-foreground">Chuyển khoản nhanh</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground"><X size={22} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* From → To visual */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Từ</label>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Chọn</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              {fromAccount && (
                <p className="text-xs text-muted-foreground mt-1">${fromAccount.balance.toLocaleString()}</p>
              )}
            </div>

            <div className="pt-5 text-muted-foreground">
              <ArrowRight size={20} />
            </div>

            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Sang</label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Chọn</option>
                {accounts.filter((a) => String(a.id) !== String(fromId)).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              {toAccount && (
                <p className="text-xs text-muted-foreground mt-1">${toAccount.balance.toLocaleString()}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Số tiền <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg font-semibold"
                placeholder="0.00"
                step="0.01"
                min="0.01"
                required
              />
            </div>
            {fromAccount && amount && parseFloat(amount) > fromAccount.balance && (
              <p className="text-xs text-red-500 mt-1">Số tiền vượt quá số dư khả dụng</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Ghi chú (tùy chọn)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Chuyển khoản này dùng để làm gì?"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-3 border border-border text-foreground rounded-lg hover:bg-muted font-semibold">
              Hủy
            </button>
            <button type="submit" disabled={loading || fromId === toId}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Đang chuyển..." : "Chuyển khoản"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
