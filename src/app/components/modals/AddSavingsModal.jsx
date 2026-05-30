import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { walletApi } from "../../api/walletApi";

const goalTypes = [
  { label: "Kỳ nghỉ",             iconName: "Plane",          color: "blue"    },
  { label: "Nhà cửa/Bất động sản", iconName: "Home",           color: "green"   },
  { label: "Quỹ khẩn cấp",        iconName: "Target",         color: "purple"  },
  { label: "Phương tiện",         iconName: "Car",            color: "orange"  },
  { label: "Giáo dục",            iconName: "GraduationCap",  color: "pink"    },
  { label: "Điện tử",             iconName: "Smartphone",     color: "indigo"  },
  { label: "Đầu tư",              iconName: "TrendingUp",     color: "emerald" },
  { label: "Khác",                iconName: "Target",         color: "slate"   },
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
    walletApi.getSummary()
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-card rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-card-foreground">Thêm mục tiêu tiết kiệm</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Loại mục tiêu</label>
            <select
              value={typeIndex}
              onChange={(e) => {
                setTypeIndex(e.target.value);
                if (e.target.value !== "" && !title) {
                  setTitle(goalTypes[e.target.value].label);
                }
              }}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Chọn loại</option>
              {goalTypes.map((t, i) => (
                <option key={t.iconName + i} value={i}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Tên mục tiêu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Ví dụ: Kỳ nghỉ mơ ước tại Nhật Bản"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Số tiền mục tiêu <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0"
                step="1"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Tài khoản liên kết <span className="text-red-500">*</span>
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Chọn tài khoản</option>
              {accounts.map((a) => (
                <option key={a.accountId} value={a.accountId}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Đóng góp hàng tháng</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="number"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0"
                step="1"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Thời hạn</label>
            <input
              type="text"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Ví dụ: Tháng 12 năm 2026"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-semibold">
              Hủy
            </button>
            <button type="submit"
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold">
              Thêm mục tiêu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
