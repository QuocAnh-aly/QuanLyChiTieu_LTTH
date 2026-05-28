import { X, PiggyBank } from "lucide-react";
import { useState, useEffect } from "react";
import { walletApi } from "../api/walletApi";
import { useSettings } from "../context/SettingsContext";

const ICONS = [
  { name: "PiggyBank",     label: "Lợn tiết kiệm" },
  { name: "Plane",         label: "Du lịch"        },
  { name: "Home",          label: "Nhà / BĐS"      },
  { name: "Car",           label: "Phương tiện"    },
  { name: "GraduationCap", label: "Giáo dục"       },
  { name: "Smartphone",    label: "Điện tử"        },
  { name: "TrendingUp",    label: "Đầu tư"         },
  { name: "Target",        label: "Khác"           },
];

const COLORS = [
  { key: "green",   hex: "#22c55e", label: "Xanh lá"   },
  { key: "blue",    hex: "#3b82f6", label: "Xanh dương" },
  { key: "purple",  hex: "#8b5cf6", label: "Tím"        },
  { key: "orange",  hex: "#f97316", label: "Cam"        },
  { key: "pink",    hex: "#ec4899", label: "Hồng"       },
  { key: "indigo",  hex: "#6366f1", label: "Chàm"       },
  { key: "emerald", hex: "#10b981", label: "Ngọc"       },
  { key: "slate",   hex: "#64748b", label: "Xám"        },
];

export function PiggyBankFormModal({ isOpen, onClose, onSave, goal = null }) {
  const { fmt, currencySymbol } = useSettings();
  const isEdit = !!goal;

  const [accounts,     setAccounts]     = useState([]);
  const [name,         setName]         = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [accountId,    setAccountId]    = useState("");
  const [monthly,      setMonthly]      = useState("");
  const [targetDate,   setTargetDate]   = useState("");
  const [notes,        setNotes]        = useState("");
  const [iconName,     setIconName]     = useState("PiggyBank");
  const [color,        setColor]        = useState("green");

  useEffect(() => {
    if (!isOpen) return;
    walletApi.getByType(1)
      .then(data => setAccounts(data.items || data || []))
      .catch(() => {});
    if (goal) {
      setName(goal.title ?? "");
      setTargetAmount(String(goal.targetAmount ?? ""));
      setAccountId(String(goal.accountId ?? ""));
      setMonthly(String(goal.savePerMonth ?? ""));
      setTargetDate(goal.targetDate ?? "");
      setNotes(goal.notes ?? "");
      setIconName(goal.iconName ?? "PiggyBank");
      setColor(goal.color ?? "green");
    } else {
      setName(""); setTargetAmount(""); setAccountId("");
      setMonthly(""); setTargetDate(""); setNotes("");
      setIconName("PiggyBank"); setColor("green");
    }
  }, [isOpen, goal]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !targetAmount || (!isEdit && !accountId)) return;
    onSave({
      accountId:           parseInt(accountId) || (goal?.accountId ?? 0),
      title:               name.trim(),
      targetAmount:        parseFloat(targetAmount),
      monthlyContribution: parseFloat(monthly) || 0,
      targetDate:          targetDate || null,
      notes:               notes.trim() || null,
      iconName,
      color,
    });
  };

  const colorHex = COLORS.find(c => c.key === color)?.hex ?? "#22c55e";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Preview stripe */}
        <div className="h-2 rounded-t-2xl" style={{ background: colorHex }} />

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: colorHex + "22" }}>
              <PiggyBank size={20} style={{ color: colorHex }} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEdit ? "Sửa lợn tiết kiệm" : "Thêm lợn tiết kiệm"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Tên mục tiêu <span className="text-red-500">*</span>
              </label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ví dụ: Kỳ nghỉ Nhật Bản 2027" />
            </div>

            {/* Target amount */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Số tiền mục tiêu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{currencySymbol}</span>
                <input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} required min="1" step="1000"
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="0" />
              </div>
            </div>

            {/* Account */}
            {!isEdit && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Tài khoản liên kết <span className="text-red-500">*</span>
                </label>
                <select value={accountId} onChange={e => setAccountId(e.target.value)} required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Chọn tài khoản</option>
                  {accounts.map(a => (
                    <option key={a.accountId} value={a.accountId}>
                      {a.name} — {fmt(a.balance ?? 0)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Monthly + Target date row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tiết kiệm / tháng</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{currencySymbol}</span>
                  <input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} min="0" step="1000"
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ngày mục tiêu</label>
                <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Màu sắc</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c.key} type="button" onClick={() => setColor(c.key)}
                    title={c.label}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${color === c.key ? "border-slate-800 scale-110" : "border-transparent hover:scale-105"}`}
                    style={{ backgroundColor: c.hex }} />
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ghi chú</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Mục đích, kế hoạch tiết kiệm..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-slate-200">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold text-sm">
              Hủy
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 text-white rounded-lg font-semibold text-sm transition-colors"
              style={{ backgroundColor: colorHex }}>
              {isEdit ? "Lưu thay đổi" : "Tạo lợn tiết kiệm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
