import { X, Minus, PiggyBank } from "lucide-react";
import { useState } from "react";
import { useSettings } from "../../context/SettingsContext";

export function RemoveMoneyModal({ isOpen, onClose, onSave, goal }) {
  const { fmt, currencySymbol } = useSettings();
  const [amount, setAmount] = useState("");
  const [notes,  setNotes]  = useState("");

  if (!isOpen || !goal) return null;

  const maxAmount     = goal.currentAmount ?? 0;
  const enteredAmount = parseFloat(amount) || 0;
  const canSubmit     = enteredAmount > 0 && enteredAmount <= maxAmount;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSave({ amount: enteredAmount, notes: notes.trim() || null });
    setAmount(""); setNotes("");
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <Minus size={16} className="text-orange-600" />
            </div>
            <h2 className="text-base font-bold text-card-foreground">Rút tiền</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Goal context */}
        <div className="px-5 py-3 bg-muted border-b border-border">
          <div className="flex items-center gap-3">
            <PiggyBank size={18} className="text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{goal.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Đã tiết kiệm: <span className="font-bold text-foreground">{fmt(maxAmount)}</span>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Số tiền rút <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol}</span>
                <input autoFocus type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  min="1" step="1" max={maxAmount}
                  className={`w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 ${
                    enteredAmount > maxAmount ? "border-red-400 focus:ring-red-400" : "border-border focus:ring-orange-500"
                  }`}
                  placeholder="0" required />
              </div>
              {enteredAmount > maxAmount && (
                <p className="text-xs text-red-500 mt-1">Không thể rút quá {fmt(maxAmount)}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Tối đa: {fmt(maxAmount)}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Ghi chú</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Lý do rút tiền..." />
            </div>
          </div>

          <div className="flex gap-3 px-5 py-4 border-t border-border">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-border text-foreground rounded-lg hover:bg-muted font-semibold text-sm">
              Hủy
            </button>
            <button type="submit" disabled={!canSubmit}
              className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Rút tiền
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
