import {
  X,
  AlertCircle,
  ShoppingCart,
  TrendingUp,
  ArrowLeftRight,
  Tag,
  HandCoins,
  Coffee,
} from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";

import { accountApi } from "../../api/accountApi";
import { budgetApi } from "../../api/budgetApi";
import { useCategories } from "../../context/CategoriesContext";
import { useSettings } from "../../context/SettingsContext";
import { ICON_MAP } from "../../utils/icons";
import { formatVND, parseVND } from "../../utils/formatMoney";

const TX_TYPES = [
  {
    key: "expense",
    label: "Chi tiêu",
    Icon: ShoppingCart,
    activeCls: "bg-red-500 text-white",
  },
  {
    key: "income",
    label: "Thu nhập",
    Icon: TrendingUp,
    activeCls: "bg-green-500 text-white",
  },
  {
    key: "transfer",
    label: "Chuyển khoản",
    Icon: ArrowLeftRight,
    activeCls: "bg-blue-500 text-white",
  },
  {
    key: "repayment",
    label: "Trả nợ",
    Icon: HandCoins,
    activeCls: "bg-red-600 text-white",
  },
];

const SUBMIT_CLS = {
  expense: "bg-red-500   hover:bg-red-600",
  income: "bg-green-500 hover:bg-green-600",
  transfer: "bg-blue-500  hover:bg-blue-600",
  repayment: "bg-red-600  hover:bg-red-700",
};

const SUBMIT_LABEL = {
  expense: "Ghi chi tiêu",
  income: "Ghi thu nhập",
  transfer: "Chuyển tiền",
  repayment: "Trả nợ",
};

const COLOR_MAP = {
  blue: "bg-blue-100    text-blue-700    border-blue-300",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-300",
  orange: "bg-orange-100  text-orange-700  border-orange-300",
  purple: "bg-purple-100  text-purple-700  border-purple-300",
  pink: "bg-pink-100    text-pink-700    border-pink-300",
  red: "bg-red-100     text-red-700     border-red-300",
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-300",
  green: "bg-green-100   text-green-700   border-green-300",
  slate: "bg-slate-200   text-slate-700   border-slate-300",
  indigo: "bg-indigo-100 text-indigo-700 border-indigo-300",
};

const DEFAULT_CATEGORY = {
  accountId: 0,
  name: "",
};

export function AddTransactionModal({
  isOpen,
  onClose,
  onAdd,
  initialType = "expense",
}) {
  const { fetchCategories, expenseCategories, incomeSources, tags } =
    useCategories();
  const { fmt, currencySymbol } = useSettings();

  const [txType, setTxType] = useState(initialType);
  const [assetAccounts, setAssetAccounts] = useState([]);
  const [walletId, setWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [liabilityAccounts, setLiabilityAccounts] = useState([]);
  const [liabilityId, setLiabilityId] = useState("");
  const selectedLiability = liabilityAccounts.find(
    (a) => String(a.accountId) === liabilityId,
  );
  const [expenseCategory, setExpenseCategory] = useState(DEFAULT_CATEGORY);
  const [incomeCategory, setIncomeCategory] = useState(DEFAULT_CATEGORY);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  const now = new Date();
  const [date, setDate] = useState(format(now, "yyyy-MM-dd"));
  const [time, setTime] = useState(format(now, "HH:mm"));

  const [createAnother, setCreateAnother] = useState(false);
  const [budgets, setBudgets] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setTxType(initialType);
    setLiabilityAccounts([]);
    setSelectedBudget(null);
    accountApi
      .getByType(1)
      .then((data) => setAssetAccounts(data.items || data || []))
      .catch(() => {});
    accountApi
      .getByType(2)
      .then((data) => setLiabilityAccounts(data.items || data || []))
      .catch(() => {});
    budgetApi
      .getExpenseBudgets({ page: 1, pageSize: 50 })
      .then((data) => {
        const items = data.items || data || [];
        setBudgets(items.filter((b) => b.isActive !== false));
      })
      .catch(() => {});
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const reset = () => {
    setTxType(initialType);
    setWalletId("");
    setToWalletId("");
    setExpenseCategory(DEFAULT_CATEGORY);
    setIncomeCategory(DEFAULT_CATEGORY);
    setLiabilityId("");
    setAmount("");
    setDescription("");
    setNotes("");
    setSelectedTags([]);
    setDate(new Date().toISOString().slice(0, 10));
    setShowCustomCategory(false);
    setSelectedBudget(null);
  };
  const handleTypeChange = (key) => {
    setTxType(key);
    setWalletId("");
    setToWalletId("");
    setExpenseCategory(DEFAULT_CATEGORY);
    setIncomeCategory(DEFAULT_CATEGORY);
    setLiabilityId("");
    setShowCustomCategory(false);
    setSelectedBudget(null);
  };

  const sameWalletError =
    txType === "transfer" && walletId && toWalletId && walletId === toWalletId;

  const canSubmit = (() => {
    if (!walletId || !amount || parseFloat(amount) <= 0) return false;
    if (txType === "expense")
      return (
        expenseCategory.accountId > 0 ||
        (showCustomCategory && expenseCategory.name.trim())
      );
    if (txType === "income")
      return (
        incomeCategory.accountId > 0 ||
        (showCustomCategory && incomeCategory.name.trim())
      );
    if (txType === "transfer") return !!toWalletId && !sameWalletError;
    if (txType === "repayment")
      return (
        !!liabilityId &&
        !!selectedLiability &&
        Math.abs(selectedLiability.balance ?? 0) > 0
      );
    return false;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    const base = {
      amount: parseFloat(amount),
      description: description || null,
      notes: notes || null,
      tags: selectedTags.length > 0 ? selectedTags.join(",") : null,
      transactionDate: new Date(`${date}T${time}`).toISOString(),
    };

    let payload;
    if (txType === "expense") {
      payload = {
        ...base,
        debitAccountId: expenseCategory.accountId,
        creditAccountId: parseInt(walletId),
        expenseCategoryName: expenseCategory.name.trim() || "Chưa phân loại",
        budgetId: selectedBudget?.budgetId ?? null,
      };
    } else if (txType === "income") {
      payload = {
        ...base,
        debitAccountId: parseInt(walletId),
        creditAccountId: incomeCategory.accountId,
        incomeCategoryName: incomeCategory.name.trim() || "Khác",
      };
    } else if (txType === "repayment") {
      payload = {
        ...base,
        debitAccountId: parseInt(liabilityId),
        creditAccountId: parseInt(walletId),
      };
    } else {
      payload = {
        ...base,
        debitAccountId: parseInt(toWalletId),
        creditAccountId: parseInt(walletId),
      };
    }

    await onAdd(payload);

    if (showCustomCategory) {
      await fetchCategories();
    }

    if (createAnother) {
      setAmount("");
      setDescription("");
      setNotes("");
    } else {
      reset();
      onClose();
    }
  };

  const toggleTag = (name) => {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  };

  const walletLabel = (a) => `${a.name} — ${fmt(Math.abs(a.balance ?? 0))}`;
  const debtWalletLabel = (a) =>
    `${a.name} — Nợ ${fmt(Math.abs(a.balance ?? 0))}`;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-card-foreground">
            Thêm giao dịch
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Type tabs */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {TX_TYPES.map(({ key, label, Icon, activeCls }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleTypeChange(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-sm font-semibold transition-all ${
                  txType === key
                    ? activeCls
                    : "text-slate-500 hover:text-slate-700"
                }`}>
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Số tiền <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                  {currencySymbol}
                </span>
                <input
                  autoFocus
                  type="text"
                  value={formatVND(amount)}
                  onChange={(e) => setAmount(parseVND(e.target.value))}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg font-semibold"
                  placeholder="0"
                  step="1000"
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Mô tả
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={
                  txType === "expense"
                    ? "VD: Mua đồ ăn tối, cà phê sáng..."
                    : txType === "income"
                      ? "VD: Lương tháng 5, tiền thưởng..."
                      : txType === "repayment"
                        ? "VD: Trả nợ tháng này..."
                        : "VD: Chuyển sang ví tiết kiệm..."
                }
              />
            </div>

            {/* ── EXPENSE ── */}
            {txType === "expense" && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Thanh toán từ ví <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    required>
                    <option value="">Chọn ví thanh toán</option>
                    {assetAccounts.map((a) => (
                      <option key={a.accountId} value={a.accountId}>
                        {walletLabel(a)}
                      </option>
                    ))}
                  </select>
                  {assetAccounts.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Chưa có ví. Hãy tạo ví trước.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Danh mục chi tiêu <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {expenseCategories.map((cat) => (
                      <button
                        key={cat.accountId}
                        type="button"
                        onClick={() => {
                          setExpenseCategory({
                            accountId: cat.accountId,
                            name: cat.name,
                          });
                          setShowCustomCategory(false);
                          // Auto-select budget matching this category
                          const matching = budgets.find(
                            (b) => b.accountId === cat.accountId,
                          );
                          if (matching) setSelectedBudget(matching);
                          else setSelectedBudget(null);
                        }}
                        className={`px-3 py-2 rounded-lg border-2 text-sm font-medium text-left transition-all ${
                          expenseCategory.accountId === cat.accountId &&
                          expenseCategory.accountId !== 0
                            ? `${COLOR_MAP[cat.color] || COLOR_MAP.red}`
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}>
                        {cat.name}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setExpenseCategory(DEFAULT_CATEGORY);
                        setShowCustomCategory(true);
                        setSelectedBudget(null);
                      }}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium text-left transition-all ${
                        showCustomCategory
                          ? "border-red-400 bg-red-50 text-red-700"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}>
                      + Danh mục mới
                    </button>
                  </div>
                </div>

                {/* ── BUDGET SECTION ── */}
                {budgets.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Danh mục ngân sách{" "}
                      <span className="text-muted-foreground font-normal">
                        (không bắt buộc)
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-0.5">
                      {budgets.map((b) => {
                        const isSelected =
                          selectedBudget?.budgetId === b.budgetId;
                        const pct = Math.min(b.percentage ?? 0, 100);
                        const BudgetIcon = ICON_MAP[b.iconName] || Coffee;
                        return (
                          <button
                            key={b.budgetId}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedBudget(null);
                              } else {
                                setSelectedBudget(b);
                                // Auto-select the matching category
                                const match = expenseCategories.find(
                                  (c) => c.accountId === b.accountId,
                                );
                                if (match) {
                                  setExpenseCategory({
                                    accountId: match.accountId,
                                    name: match.name,
                                  });
                                  setShowCustomCategory(false);
                                }
                              }
                            }}
                            className={`px-3 py-2 rounded-lg border-2 text-sm font-medium text-left transition-all ${
                              isSelected
                                ? "border-purple-400 bg-purple-50 text-purple-700"
                                : "border-slate-200 hover:border-slate-300 text-slate-600"
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
              </>
            )}

            {/* ── INCOME ── */}
            {txType === "income" && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Nhận vào ví <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    required>
                    <option value="">Chọn ví nhận</option>
                    {assetAccounts.map((a) => (
                      <option key={a.accountId} value={a.accountId}>
                        {walletLabel(a)}
                      </option>
                    ))}
                  </select>
                  {assetAccounts.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Chưa có ví. Hãy tạo ví trước.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Nguồn thu nhập <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {incomeSources.map((src) => (
                      <button
                        key={src.accountId}
                        type="button"
                        onClick={() => {
                          setIncomeCategory({
                            accountId: src.accountId,
                            name: src.name,
                          });
                          setShowCustomCategory(false);
                        }}
                        className={`px-3 py-2 rounded-lg border-2 text-sm font-medium text-left transition-all ${
                          incomeCategory.accountId === src.accountId &&
                          incomeCategory.accountId !== 0
                            ? `${COLOR_MAP[src.color] || COLOR_MAP.green}`
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}>
                        {src.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setIncomeCategory(DEFAULT_CATEGORY);
                        setShowCustomCategory(true);
                      }}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium text-left transition-all ${
                        showCustomCategory
                          ? "border-green-400 bg-green-50 text-green-700"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}>
                      + Nguồn thu mới
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── CUSTOM CATEGORY ── */}
            {showCustomCategory && (
              <input
                type="text"
                placeholder="Nhập tên mục mới"
                value={
                  txType === "expense"
                    ? expenseCategory.name
                    : incomeCategory.name
                }
                onChange={(e) => {
                  if (txType === "expense") {
                    setExpenseCategory({
                      accountId: 0,
                      name: e.target.value,
                    });
                  }
                  if (txType === "income") {
                    setIncomeCategory({
                      accountId: 0,
                      name: e.target.value,
                    });
                  }
                }}
                className="w-full mt-2 px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            )}

            {/* ── TRANSFER ── */}
            {txType === "transfer" && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Từ ví <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    required>
                    <option value="">Chọn ví nguồn</option>
                    {assetAccounts.map((a) => (
                      <option key={a.accountId} value={a.accountId}>
                        {walletLabel(a)}
                      </option>
                    ))}
                  </select>
                  {assetAccounts.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Chưa có ví. Hãy tạo ví trước.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Sang ví <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={toWalletId}
                    onChange={(e) => setToWalletId(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                      sameWalletError
                        ? "border-red-500 bg-red-500/10"
                        : "border-border focus:ring-purple-500"
                    }`}
                    required>
                    <option value="">Chọn ví đích</option>
                    {assetAccounts
                      .filter((a) => String(a.accountId) !== walletId)
                      .map((a) => (
                        <option key={a.accountId} value={a.accountId}>
                          {walletLabel(a)}
                        </option>
                      ))}
                  </select>
                  {sameWalletError &&
                    walletId &&
                    toWalletId &&
                    walletId === toWalletId && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> Ví nguồn và ví đích phải khác
                        nhau.
                      </p>
                    )}
                </div>
              </>
            )}

            {/* ── REPAYMENT ── */}
            {txType === "repayment" && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Trả từ ví <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    required>
                    <option value="">Chọn ví thanh toán</option>
                    {assetAccounts.map((a) => (
                      <option key={a.accountId} value={a.accountId}>
                        {walletLabel(a)}
                      </option>
                    ))}
                  </select>
                  {assetAccounts.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Chưa có ví. Hãy tạo ví trước.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Khoản nợ <span className="text-red-500">*</span>
                  </label>
                  {liabilityAccounts.length === 0 ? (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Bạn chưa có khoản nợ nào.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {liabilityAccounts.map((a) => {
                        const isActive = liabilityId === String(a.accountId);
                        const remaining = Math.abs(a.balance ?? 0);
                        const isPaidOff = remaining === 0;
                        return (
                          <button
                            key={a.accountId}
                            type="button"
                            disabled={isPaidOff}
                            onClick={() => setLiabilityId(String(a.accountId))}
                            className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-all flex items-center gap-3 ${
                              isActive
                                ? "border-red-500 bg-red-50 text-red-700"
                                : isPaidOff
                                  ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
                                  : "border-red-200 hover:border-red-300 text-red-600 hover:bg-red-50/50"
                            }`}>
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                isActive
                                  ? "bg-red-500 text-white"
                                  : isPaidOff
                                    ? "bg-slate-200 text-slate-400"
                                    : "bg-red-100 text-red-600"
                              }`}>
                              <HandCoins size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`font-semibold truncate ${isPaidOff ? "line-through" : ""}`}>
                                {a.name}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {isPaidOff ? (
                                <span className="text-xs font-semibold text-green-500">
                                  ✓ Đã tất toán
                                </span>
                              ) : (
                                <p className="text-sm font-bold">
                                  {fmt(remaining)}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Repayment summary when both selected */}
                {walletId && liabilityId && selectedLiability && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-2 text-sm text-red-700">
                      <HandCoins size={16} />
                      <span className="font-semibold">
                        Trả {selectedLiability.name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1.5 text-xs text-red-600">
                      <span>
                        Trả từ ví{" "}
                        <strong>
                          {assetAccounts.find(
                            (a) => String(a.accountId) === walletId,
                          )?.name || ""}
                        </strong>
                      </span>
                      <span className="font-bold text-sm">
                        {amount ? fmt(parseFloat(amount)) : "-"}{" "}
                        {currencySymbol}
                      </span>
                    </div>
                    {parseFloat(amount || "0") > 0 &&
                      selectedLiability.balance && (
                        <div className="mt-1.5 pt-1.5 border-t border-red-200/60 flex items-center justify-between text-[11px] text-red-500">
                          <span>Dư nợ còn lại sau khi trả:</span>
                          <span className="font-semibold">
                            {fmt(
                              Math.abs(selectedLiability.balance) -
                                parseFloat(amount),
                            )}
                          </span>
                        </div>
                      )}
                  </div>
                )}
              </>
            )}

            {/* Date & Time */}
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
                    const colorCls = COLOR_MAP[tag.color] || COLOR_MAP.slate;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.name)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                          active
                            ? colorCls
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
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
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                placeholder="Thêm ghi chú chi tiết..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-4 border-t border-border pt-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createAnother}
                onChange={(e) => setCreateAnother(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-purple-600"
              />
              <span className="text-sm text-muted-foreground">
                Thêm giao dịch tiếp theo
              </span>
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  reset();
                  onClose();
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-sm">
                Hủy
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed ${SUBMIT_CLS[txType]}`}>
                {SUBMIT_LABEL[txType]}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
