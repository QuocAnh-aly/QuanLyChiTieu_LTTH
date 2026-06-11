import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Tag,
  Coffee,
} from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useSettings } from "../../context/SettingsContext";
import { useCategories } from "../../context/CategoriesContext";
import { budgetApi } from "../../api/budgetApi";
import { ICON_MAP } from "../../utils/icons";

const TAG_COLORS = {
  blue: "bg-blue-100    text-blue-700    border-blue-300",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-300",
  orange: "bg-orange-100  text-orange-700  border-orange-300",
  purple: "bg-purple-100  text-purple-700  border-purple-300",
  pink: "bg-pink-100    text-pink-700    border-pink-300",
  red: "bg-red-100     text-red-700     border-red-300",
  green: "bg-green-100   text-green-700   border-green-300",
  slate: "bg-muted   text-foreground   border-border",
};

export function EditTransactionModal({ isOpen, onClose, onSave, transaction }) {
  const { fmt } = useSettings();
  const { tags } = useCategories();

  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);

  useEffect(() => {
    if (!isOpen || !transaction) return;
    setDescription(transaction.description ?? "");
    setDate(
      transaction.transactionDate
        ? format(new Date(transaction.transactionDate), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
    );
    setTime(
      transaction.transactionDate
        ? format(new Date(transaction.transactionDate), "HH:mm")
        : format(new Date(), "HH:mm"),
    );
    setAmount(String(transaction.totalAmount ?? 0));
    setNotes(transaction.notes ?? "");
    setSelectedTags(
      transaction.tags
        ? transaction.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    );
    // Fetch budgets for expense transactions
    const isExpenseTx = !transaction.isIncome && !transaction.isTransfer;
    if (isExpenseTx) {
      budgetApi
        .getExpenseBudgets({ page: 1, pageSize: 50 })
        .then((data) => {
          const items = data.items || data || [];
          const active = items.filter((b) => b.isActive !== false);
          setBudgets(active);
          // Set current budget from transaction.budgetId
          if (transaction.budgetId) {
            const current = active.find(
              (b) => b.budgetId === transaction.budgetId,
            );
            setSelectedBudget(current || null);
          } else {
            setSelectedBudget(null);
          }
        })
        .catch(() => {});
    } else {
      setBudgets([]);
      setSelectedBudget(null);
    }
  }, [isOpen, transaction]);

  if (!isOpen || !transaction) return null;

  const isTransfer = transaction.isTransfer;
  const isIncome = transaction.isIncome;
  const isExpense = !isIncome && !isTransfer;

  const typeLabel = isTransfer
    ? "Chuyển khoản"
    : isIncome
      ? "Thu nhập"
      : "Chi tiêu";
  const typeBg = isTransfer
    ? "bg-blue-100 text-blue-700"
    : isIncome
      ? "bg-green-100 text-green-700"
      : "bg-red-100 text-red-700";
  const amountCls = isTransfer
    ? "text-blue-600"
    : isIncome
      ? "text-green-600"
      : "text-card-foreground";
  const amountPfx = isIncome ? "+" : isExpense ? "-" : "";
  const Icon = isTransfer
    ? ArrowLeftRight
    : isIncome
      ? ArrowUpRight
      : ArrowDownRight;
  const iconBg = isTransfer
    ? "bg-blue-100"
    : isIncome
      ? "bg-green-100"
      : "bg-red-100";
  const iconCls = isTransfer
    ? "text-blue-500"
    : isIncome
      ? "text-green-600"
      : "text-red-500";

  const toggleTag = (name) => {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsed = parseFloat(amount.replace(/,/g, ""));
    onSave({
      description: description.trim() || null,
      notes: notes.trim() || null,
      tags: selectedTags.length > 0 ? selectedTags.join(",") : null,
      transactionDate: new Date(`${date}T${time}`).toISOString(),
      amount: isNaN(parsed) || parsed <= 0 ? undefined : parsed,
      budgetId: selectedBudget?.budgetId ?? null,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
          <h2 className="text-base font-bold text-card-foreground">
            Sửa giao dịch
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Transaction context (read-only) */}
        <div className="px-5 py-4 bg-muted border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
              <Icon size={18} className={iconCls} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${typeBg}`}>
                  {typeLabel}
                </span>
                <span className="text-xs text-muted-foreground">
                  {transaction.transactionDate
                    ? format(
                        new Date(transaction.transactionDate),
                        "dd/MM/yyyy",
                      )
                    : "—"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {transaction.sourceAccount} →{" "}
                {transaction.destAccount || transaction.categoryName}
              </p>
            </div>
            <div className={`text-lg font-bold flex-shrink-0 ${amountCls}`}>
              {amountPfx}
              {fmt(transaction.totalAmount)}
            </div>
          </div>
        </div>

        {/* Editable fields */}
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Mô tả
              </label>
              <input
                autoFocus
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Thêm mô tả cho giao dịch..."
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Số tiền
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                  {amountPfx}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9,]/g, "");
                    setAmount(raw);
                  }}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-right font-semibold"
                  required
                />
              </div>
            </div>

            {/* Budget section (chỉ hiển thị cho chi tiêu) */}
            {isExpense && budgets.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Danh mục ngân sách{" "}
                  <span className="text-muted-foreground font-normal">
                    (không bắt buộc)
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-0.5">
                  {budgets.map((b) => {
                    const isSel =
                      selectedBudget?.budgetId === b.budgetId;
                    const pct = Math.min(b.percentage ?? 0, 100);
                    const BudgetIcon = ICON_MAP[b.iconName] || Coffee;
                    return (
                      <button
                        key={b.budgetId}
                        type="button"
                        onClick={() => {
                          if (isSel) setSelectedBudget(null);
                          else setSelectedBudget(b);
                        }}
                        className={`px-3 py-2 rounded-lg border-2 text-sm font-medium text-left transition-all ${
                          isSel
                            ? "border-purple-400 bg-purple-50 text-purple-700"
                            : "border-border hover:border-slate-300 text-muted-foreground"
                        }`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <BudgetIcon size={13} />
                          <span className="truncate font-semibold">
                            {b.title}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              pct >= 100
                                ? "bg-red-500"
                                : pct >= 80
                                  ? "bg-amber-400"
                                  : "bg-purple-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {fmt(b.currentAmount ?? 0)} /{" "}
                          {fmt(b.targetAmount ?? 0)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Thời gian giao dịch
              </label>
              <div className="flex items-center gap-2 bg-background">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-border bg-transparent text-sm"
                />
                <div className="w-px h-6 bg-border" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-36 px-4 py-2.5 border border-border bg-transparent outline-none text-sm"
                />
              </div>
            </div>

            {/* Tags */}
            {tags && tags.length > 0 && (
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2">
                  <Tag size={14} className="text-muted-foreground" /> Nhãn
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const active = selectedTags.includes(tag.name);
                    const colorCls = TAG_COLORS[tag.color] || TAG_COLORS.slate;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.name)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                          active
                            ? colorCls
                            : "bg-card border-border text-muted-foreground hover:border-border"
                        }`}>
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Ghi chú
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="Thêm ghi chú chi tiết..."
              />
            </div>
          </div>

          <div className="flex gap-3 px-5 py-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-semibold text-sm">
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm">
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
