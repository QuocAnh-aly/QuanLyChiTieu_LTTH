import { X } from "lucide-react";
import { useState } from "react";
import { useCategories } from "../../context/CategoriesContext";

const periodTypes = ["daily", "weekly", "monthly", "yearly"];

export function AddBudgetModal({ isOpen, onClose, onAdd }) {
  const { expenseCategories } = useCategories();
  const [catId,       setCatId]       = useState("");
  const [title,       setTitle]       = useState("");
  const [amount,      setAmount]      = useState("");
  const [periodType,  setPeriodType]  = useState("monthly");
  const [startDate,   setStartDate]   = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate,     setEndDate]     = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !amount || !startDate) return;
    const selected = expenseCategories.find(c => c.id === catId) || null;
    onAdd({
      title,
      targetAmount: parseFloat(amount),
      periodType,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
      iconName: selected?.iconName || "Coffee",
      color: selected?.color || "orange",
    });
    setTitle(""); setCatId(""); setAmount("");
    setPeriodType("monthly");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Thêm ngân sách</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Danh mục
            </label>
            <select
              value={catId}
              onChange={(e) => {
                setCatId(e.target.value);
                if (e.target.value && !title) {
                  const cat = expenseCategories.find(c => c.id === e.target.value);
                  if (cat) setTitle(cat.label);
                }
              }}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Chọn danh mục</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Tên ngân sách <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Ví dụ: Ngân sách ăn uống hàng tháng"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Số tiền ngân sách <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          {/* Period type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Chu kỳ
            </label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {periodTypes.map((p) => (
                <option key={p} value={p}>
                  {p === "daily" ? "Hàng ngày" : p === "weekly" ? "Hàng tuần" : p === "monthly" ? "Hàng tháng" : "Hàng năm"}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Ngày bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Ngày kết thúc
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
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
              Thêm ngân sách
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
