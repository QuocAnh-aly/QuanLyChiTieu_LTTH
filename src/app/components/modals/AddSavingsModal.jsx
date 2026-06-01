import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { walletApi } from "../../api/walletApi";
import { formatVND, parseVND } from "../../utils/formatMoney";

const goalTypes = [
  { label: "Kỳ nghỉ", iconName: "Plane", color: "blue" },
  { label: "Nhà cửa/Bất động sản", iconName: "Home", color: "green" },
  { label: "Quỹ khẩn cấp", iconName: "Target", color: "purple" },
  { label: "Phương tiện", iconName: "Car", color: "orange" },
  { label: "Giáo dục", iconName: "GraduationCap", color: "pink" },
  { label: "Điện tử", iconName: "Smartphone", color: "indigo" },
  { label: "Đầu tư", iconName: "TrendingUp", color: "emerald" },
  { label: "Khác", iconName: "Target", color: "slate" },
];

export function AddSavingsModal({ isOpen, onClose, onAdd }) {
  const [accounts, setAccounts] = useState([]);
  const [typeIndex, setTypeIndex] = useState("");
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [deadline, setDeadline] = useState("");
  const [accountId, setAccountId] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    walletApi
      .getSummary()
      .then((data) => setAccounts(data.accounts || []))
      .catch(() => setAccounts([]));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !targetAmount || !accountId) return;
    const selected = typeIndex !== "" ? goalTypes[typeIndex] : null;
    onAdd({
      accountId: parseInt(accountId),
      title,
      targetAmount: parseFloat(targetAmount),
      monthlyContribution: parseFloat(monthlyContribution) || 0,
      deadline: deadline || null,
      iconName: selected?.iconName || "Target",
      color: selected?.color || "purple",
    });
    setTypeIndex("");
    setTitle("");
    setTargetAmount("");
    setMonthlyContribution("");
    setDeadline("");
    setAccountId("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-card-foreground">
            Thêm mục tiêu tiết kiệm
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Loại mục tiêu
              </label>
              <select
                value={typeIndex}
                onChange={(e) => {
                  setTypeIndex(e.target.value);
                  if (e.target.value !== "" && !title) {
                    setTitle(goalTypes[e.target.value].label);
                  }
                }}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
              >
                <option value="">Chọn loại</option>
                {goalTypes.map((t, i) => (
                  <option key={t.iconName + i} value={i}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Tên mục tiêu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ví dụ: Kỳ nghỉ mơ ước tại Nhật Bản"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Số tiền mục tiêu <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formatVND(targetAmount)}
                onChange={(e) => setTargetAmount(parseVND(e.target.value))}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0"
                step="1"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Tài khoản liên kết <span className="text-red-500">*</span>
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                required
              >
                <option value="">Chọn tài khoản</option>
                {accounts.map((a) => (
                  <option key={a.accountId} value={a.accountId}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Đóng góp hàng tháng
              </label>
              <input
                type="number"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0"
                step="1"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Thời hạn
              </label>
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
              Thêm mục tiêu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
