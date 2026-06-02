import {
  X,
  AlertCircle,
  ShoppingCart,
  TrendingUp,
  ArrowLeftRight,
  Tag,
  HandCoins,
} from "lucide-react";
import { useState, useEffect } from "react";
import { walletApi } from "../../api/walletApi";
import { useCategories } from "../../context/CategoriesContext";
import { useSettings } from "../../context/SettingsContext";
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
];

const SUBMIT_CLS = {
  expense: "bg-red-500   hover:bg-red-600",
  income: "bg-green-500 hover:bg-green-600",
  transfer: "bg-blue-500  hover:bg-blue-600",
};

const SUBMIT_LABEL = {
  expense: "Ghi chi tiêu",
  income: "Ghi thu nhập",
  transfer: "Chuyển tiền",
};

const TAG_COLORS = {
  blue: "bg-blue-100    text-blue-700    border-blue-300",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-300",
  orange: "bg-orange-100  text-orange-700  border-orange-300",
  purple: "bg-purple-100  text-purple-700  border-purple-300",
  pink: "bg-pink-100    text-pink-700    border-pink-300",
  red: "bg-red-100     text-red-700     border-red-300",
  green: "bg-green-100   text-green-700   border-green-300",
  slate: "bg-slate-100   text-slate-700   border-slate-300",
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
  const { expenseCategories, incomeSources, tags } = useCategories();
  const { fmt, currencySymbol } = useSettings();

  const [txType, setTxType] = useState(initialType);
  const [assetAccounts, setAssetAccounts] = useState([]);
  const [walletId, setWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [isDebtPayment, setIsDebtPayment] = useState(false);
  const [liabilityAccounts, setLiabilityAccounts] = useState([]);
  const [expenseCategory, setExpenseCategory] = useState(DEFAULT_CATEGORY);
  const [incomeCategory, setIncomeCategory] = useState(DEFAULT_CATEGORY);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [createAnother, setCreateAnother] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTxType(initialType);
    setIsDebtPayment(false);
    setLiabilityAccounts([]);
    walletApi
      .getByType(1)
      .then((data) => setAssetAccounts(data.items || data || []))
      .catch(() => {});
    walletApi
      .getByType(2)
      .then((data) => setLiabilityAccounts(data.items || data || []))
      .catch(() => {});
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const reset = () => {
    setTxType(initialType);
    setWalletId("");
    setToWalletId("");
    setIsDebtPayment(false);
    setExpenseCategory(DEFAULT_CATEGORY);
    setIncomeCategory(DEFAULT_CATEGORY);
    setAmount("");
    setDescription("");
    setNotes("");
    setSelectedTags([]);
    setDate(new Date().toISOString().slice(0, 10));
    setShowCustomCategory(false);
  };
  const handleTypeChange = (key) => {
    setTxType(key);
    setWalletId("");
    setToWalletId("");
    setIsDebtPayment(false);
    setExpenseCategory(DEFAULT_CATEGORY);
    setIncomeCategory(DEFAULT_CATEGORY);
    setShowCustomCategory(false);
  };

  const sameWalletError =
    txType === "transfer" && walletId && toWalletId && walletId === toWalletId;

  const canSubmit = (() => {
    if (!walletId || !amount || parseFloat(amount) <= 0) return false;
    if (txType === "expense") return expenseCategory.accountId > 0 || (showCustomCategory && expenseCategory.name.trim());
    if (txType === "income") return incomeCategory.accountId > 0 || (showCustomCategory && incomeCategory.name.trim());
    if (txType === "transfer") return !!toWalletId && !sameWalletError;
    return false;
  })();

  const buildPayload = () => {
    const base = {
      amount: parseFloat(amount),
      description: description || null,
      notes: notes || null,
      tags: selectedTags.length > 0 ? selectedTags.join(',') : null,
      transactionDate: new Date(date).toISOString(),
    };
    if (txType === "expense")
      return {
        ...base,
        debitAccountId: expenseCategory.accountId,
        creditAccountId: parseInt(walletId),
        expenseCategoryName: expenseCategory.name.trim() || "Chưa phân loại",
      };
    if (txType === "income")
      return {
        ...base,
        debitAccountId: parseInt(walletId),
        creditAccountId: incomeCategory.accountId,
        incomeCategoryName: incomeCategory.name.trim() || "Khác",
      };
    return {
      ...base,
      debitAccountId: parseInt(toWalletId),
      creditAccountId: parseInt(walletId),
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onAdd(buildPayload());
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
  const debtWalletLabel = (a) => `${a.name} — Nợ ${fmt(Math.abs(a.balance ?? 0))}`;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-card-foreground">Thêm giao dịch</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
          >
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
                }`}
              >
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
                    required
                  >
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
                        }}
                        className={`px-3 py-2 rounded-lg border-2 text-sm font-medium text-left transition-all ${
                          expenseCategory.accountId === cat.accountId &&
                          expenseCategory.accountId !== 0
                            ? "border-red-400 bg-red-50 text-red-700"
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setExpenseCategory({ accountId: 0, name: "" });
                        setShowCustomCategory(true);
                      }}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium text-left transition-all ${
                        showCustomCategory
                          ? "border-red-400 bg-red-50 text-red-700"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      + Danh mục mới
                    </button>
                  </div>
                </div>
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
                    required
                  >
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
                            ? "border-green-400 bg-green-50 text-green-700"
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        {src.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setIncomeCategory({ accountId: 0, name: "" });
                        setShowCustomCategory(true);
                      }}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium text-left transition-all ${
                        showCustomCategory
                          ? "border-green-400 bg-green-50 text-green-700"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
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
                    required
                  >
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

                {/* Checkbox: Thanh toán nợ */}
                <label className="flex items-center gap-2 cursor-pointer select-none p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={isDebtPayment}
                    onChange={(e) => {
                      setIsDebtPayment(e.target.checked);
                      setToWalletId("");
                    }}
                    className="w-4 h-4 rounded border-border accent-red-500"
                  />
                  <div className="flex items-center gap-1.5">
                    <HandCoins size={15} className="text-red-500" />
                    <span className="text-sm font-medium text-foreground">Thanh toán nợ</span>
                    <span className="text-xs text-muted-foreground">(chọn tài khoản nợ ở ví đích)</span>
                  </div>
                </label>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    {isDebtPayment ? (
                      <span className="flex items-center gap-1.5">
                        <HandCoins size={14} className="text-red-500" />
                        Trả nợ cho <span className="text-red-500">*</span>
                      </span>
                    ) : (
                      <>Sang ví <span className="text-red-500">*</span></>
                    )}
                  </label>
                  <select
                    value={toWalletId}
                    onChange={(e) => setToWalletId(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                      sameWalletError
                        ? "border-red-500 bg-red-500/10"
                        : isDebtPayment
                          ? "border-red-300 focus:ring-red-500 bg-red-50/30"
                          : "border-border focus:ring-purple-500"
                    }`}
                    required
                  >
                    <option value="">Chọn ví đích</option>
                    {assetAccounts
                      .filter((a) => String(a.accountId) !== walletId)
                      .map((a) => (
                        <option key={a.accountId} value={a.accountId}>
                          {walletLabel(a)}
                        </option>
                      ))}
                  </select>
                  {isDebtPayment && liabilityAccounts.filter(a => Math.abs(a.balance ?? 0) > 0).length === 0 && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <HandCoins size={12} /> Không có khoản nợ nào. Hãy thêm khoản nợ trước.
                    </p>
                  )}
                  {!isDebtPayment && assetAccounts.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Chưa có ví. Hãy tạo ví trước.
                    </p>
                  )}
                  {!isDebtPayment && assetAccounts.length === 1 && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Chỉ có 1 ví. Hãy tạo thêm ví trước.
                    </p>
                  )}
                  {!isDebtPayment && sameWalletError && walletId && toWalletId && walletId === toWalletId && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Ví nguồn và ví đích phải khác nhau.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Ngày giao dịch
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
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
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed ${SUBMIT_CLS[txType]}`}
              >
                {SUBMIT_LABEL[txType]}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
