import { X } from "lucide-react";
import { useState } from "react";

export function EditSavingsModal({ goal, onClose, onSave }) {
  const [title, setTitle] = useState(goal.name);
  const [targetAmount, setTargetAmount] = useState(String(goal.target));
  const [monthlyContribution, setMonthlyContribution] = useState(String(goal.monthlyContribution));
  const [deadline, setDeadline] = useState(goal.deadline || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    const updates = {};
    if (title !== goal.name) updates.title = title;
    const newAmount = parseFloat(targetAmount);
    if (newAmount !== goal.target) updates.targetAmount = newAmount;
    const newMonthly = parseFloat(monthlyContribution);
    if (newMonthly !== goal.monthlyContribution) updates.monthlyContribution = newMonthly;
    if (deadline !== (goal.deadline || "")) updates.deadline = deadline || null;
    onSave(goal.id, updates);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-card rounded-2xl w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-card-foreground">Sửa mục tiêu</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Tên mục tiêu <span className="text-red-500">*</span>
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
                Số tiền mục tiêu <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                step="1"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Đóng góp hàng tháng</label>
              <input
                type="number"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                step="1"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Thời hạn</label>
              <input
                type="text"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ví dụ: Tháng 12 năm 2026"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-border">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-semibold text-sm">
              Hủy
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm">
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
