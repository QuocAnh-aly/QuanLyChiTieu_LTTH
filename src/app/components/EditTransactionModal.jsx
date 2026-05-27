import { X, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Tag } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useSettings } from "../context/SettingsContext";
import { useCategories } from "../context/CategoriesContext";

const TAG_COLORS = {
  blue:    "bg-blue-100    text-blue-700    border-blue-300",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-300",
  orange:  "bg-orange-100  text-orange-700  border-orange-300",
  purple:  "bg-purple-100  text-purple-700  border-purple-300",
  pink:    "bg-pink-100    text-pink-700    border-pink-300",
  red:     "bg-red-100     text-red-700     border-red-300",
  green:   "bg-green-100   text-green-700   border-green-300",
  slate:   "bg-slate-100   text-slate-700   border-slate-300",
};

export function EditTransactionModal({ isOpen, onClose, onSave, transaction }) {
  const { fmt }         = useSettings();
  const { tags }        = useCategories();

  const [description,  setDescription]  = useState("");
  const [date,         setDate]         = useState("");
  const [notes,        setNotes]        = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  useEffect(() => {
    if (!isOpen || !transaction) return;
    setDescription(transaction.description ?? "");
    setDate(
      transaction.transactionDate
        ? new Date(transaction.transactionDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    );
    setNotes(transaction.notes ?? "");
    setSelectedTags(
      transaction.tags
        ? transaction.tags.split(",").map(t => t.trim()).filter(Boolean)
        : []
    );
  }, [isOpen, transaction]);

  if (!isOpen || !transaction) return null;

  const isTransfer = transaction.isTransfer;
  const isIncome   = transaction.isIncome;
  const isExpense  = !isIncome && !isTransfer;

  const typeLabel = isTransfer ? "Chuyển khoản" : isIncome ? "Thu nhập" : "Chi tiêu";
  const typeBg    = isTransfer ? "bg-blue-100 text-blue-700" : isIncome ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";
  const amountCls = isTransfer ? "text-blue-600" : isIncome ? "text-green-600" : "text-slate-900";
  const amountPfx = isIncome ? "+" : isExpense ? "-" : "";
  const Icon      = isTransfer ? ArrowLeftRight : isIncome ? ArrowUpRight : ArrowDownRight;
  const iconBg    = isTransfer ? "bg-blue-100" : isIncome ? "bg-green-100" : "bg-red-100";
  const iconCls   = isTransfer ? "text-blue-500" : isIncome ? "text-green-600" : "text-red-500";

  const toggleTag = (name) => {
    setSelectedTags(prev =>
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      description:     description.trim() || null,
      notes:           notes.trim()       || null,
      tags:            selectedTags.length > 0 ? selectedTags.join(",") : null,
      transactionDate: new Date(date).toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-base font-bold text-slate-900">Sửa giao dịch</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Transaction context (read-only) */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
              <Icon size={18} className={iconCls} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${typeBg}`}>
                  {typeLabel}
                </span>
                <span className="text-xs text-slate-400">
                  {transaction.transactionDate
                    ? format(new Date(transaction.transactionDate), "dd/MM/yyyy")
                    : "—"}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {transaction.sourceAccount} → {transaction.destAccount || transaction.categoryName}
              </p>
            </div>
            <div className={`text-lg font-bold flex-shrink-0 ${amountCls}`}>
              {amountPfx}{fmt(transaction.totalAmount)}
            </div>
          </div>
        </div>

        {/* Editable fields */}
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mô tả</label>
              <input
                autoFocus
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Thêm mô tả cho giao dịch..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ngày giao dịch</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            {/* Tags */}
            {tags && tags.length > 0 && (
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-2">
                  <Tag size={14} className="text-slate-400" /> Nhãn
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => {
                    const active   = selectedTags.includes(tag.name);
                    const colorCls = TAG_COLORS[tag.color] || TAG_COLORS.slate;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.name)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                          active
                            ? colorCls
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ghi chú</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="Thêm ghi chú chi tiết..."
              />
            </div>

            <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
              Số tiền và tài khoản không thể thay đổi. Nếu cần, hãy xóa và tạo lại giao dịch.
            </p>
          </div>

          <div className="flex gap-3 px-5 py-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-sm"
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
