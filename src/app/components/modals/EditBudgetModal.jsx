import { X } from "lucide-react";
import { useState } from "react";

const periodTypes = ["monthly", "weekly", "yearly", "custom"];

const PERIOD_LABELS = {
  monthly: "Hàng tháng",
  weekly: "Hàng tuần",
  yearly: "Hàng năm",
  custom: "Tùy chỉnh",
};

export function EditBudgetModal({ budget, onClose, onSave }) {
  const [title, setTitle] = useState(budget.name);
  const [amount, setAmount] = useState(String(budget.budget));
  const [periodType, setPeriodType] = useState(budget.periodType || "monthly");
  const [startDate, setStartDate] = useState(
    budget.startDate ? new Date(budget.startDate).toISOString().slice(0, 10) : ""
  );
  const [endDate, setEndDate] = useState(
    budget.endDate ? new Date(budget.endDate).toISOString().slice(0, 10) : ""
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const updates = {};
    if (title !== budget.name) updates.title = title;
    const newAmount = parseFloat(amount);
    if (newAmount !== budget.budget) updates.targetAmount = newAmount;
    if (periodType !== budget.periodType) updates.periodType = periodType;
    if (startDate) updates.startDate = new Date(startDate).toISOString();
    if (endDate) updates.endDate = new Date(endDate).toISOString();
    else if (budget.endDate) updates.endDate = null;
    onSave(budget.id, updates);
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
          <h2 className="text-lg font-bold text-card-foreground">Sửa ngân sách</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Tên ngân sách <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Số tiền ngân sách <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                step="1"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Chu kỳ</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
              >
                {periodTypes.map((p) => (
                  <option key={p} value={p}>
                    {PERIOD_LABELS[p] || p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Ngày bắt đầu</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Ngày kết thúc</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
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
