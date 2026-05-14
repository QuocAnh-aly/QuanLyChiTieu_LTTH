import { X, ShoppingCart, TrendingUp, ArrowLeftRight, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { walletApi } from "../api/walletApi";
import { budgetApi } from "../api/budgetApi";

// ─── Cấu hình loại giao dịch ─────────────────────────────────────────────────

const TX_TYPES = [
  { key: "expense",  label: "Chi tiêu",     Icon: ShoppingCart,   activeCls: "bg-red-500 text-white"   },
  { key: "income",   label: "Thu nhập",     Icon: TrendingUp,     activeCls: "bg-green-500 text-white" },
  { key: "transfer", label: "Chuyển khoản", Icon: ArrowLeftRight, activeCls: "bg-blue-500 text-white"  },
];

// Danh mục thu nhập preset — backend sẽ tự tạo Revenue account tương ứng
const INCOME_CATEGORIES = [
  "Lương",
  "Thưởng",
  "Freelance",
  "Kinh doanh",
  "Đầu tư",
  "Cho vay thu lại",
  "Khác",
];

const SUBMIT_CLS = {
  expense:  "bg-red-500   hover:bg-red-600",
  income:   "bg-green-500 hover:bg-green-600",
  transfer: "bg-blue-500  hover:bg-blue-600",
};

const SUBMIT_LABEL = {
  expense:  "Ghi chi tiêu",
  income:   "Ghi thu nhập",
  transfer: "Chuyển tiền",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function AddTransactionModal({ isOpen, onClose, onAdd }) {
  const [txType,         setTxType]         = useState("expense");
  const [assetAccounts,  setAssetAccounts]  = useState([]);
  const [expenseBudgets, setExpenseBudgets] = useState([]);
  const [walletId,       setWalletId]       = useState("");      // ví chính (chi / nhận / nguồn)
  const [toWalletId,     setToWalletId]     = useState("");      // ví đích (chỉ cho chuyển khoản)
  const [budgetId,       setBudgetId]       = useState("");      // danh mục budget (chi tiêu)
  const [incomeCategory, setIncomeCategory] = useState("");      // danh mục thu nhập
  const [amount,         setAmount]         = useState("");
  const [description,    setDescription]    = useState("");
  const [date,           setDate]           = useState(() => new Date().toISOString().slice(0, 10));

  // Load asset accounts + expense budgets khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      walletApi.getByType(1),          // Assets
      budgetApi.getExpenseBudgets(),   // Budget expense
    ]).then(([assets, budgets]) => {
      setAssetAccounts(assets  || []);
      setExpenseBudgets(budgets || []);
    }).catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  // ─── Reset toàn bộ form ───────────────────────────────────────────────────
  const reset = () => {
    setWalletId(""); setToWalletId(""); setBudgetId(""); setIncomeCategory("");
    setAmount(""); setDescription("");
    setDate(new Date().toISOString().slice(0, 10));
  };

  const handleTypeChange = (key) => {
    setTxType(key);
    setWalletId(""); setToWalletId(""); setBudgetId(""); setIncomeCategory("");
  };

  // ─── Validation ──────────────────────────────────────────────────────────
  const sameWalletError = txType === "transfer" && walletId && toWalletId && walletId === toWalletId;

  const canSubmit = (() => {
    if (!walletId || !amount || parseFloat(amount) <= 0) return false;
    if (txType === "expense")  return !!budgetId;
    if (txType === "income")   return !!incomeCategory;
    if (txType === "transfer") return !!toWalletId && !sameWalletError;
    return false;
  })();

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    let payload;

    if (txType === "expense") {
      // Chi tiêu: credit wallet (Assets), debit expense account (từ budget)
      const budget = expenseBudgets.find(b => b.budgetId === parseInt(budgetId));
      if (!budget?.accountId) return;
      payload = {
        debitAccountId:  budget.accountId,   // Expense account (typeId=5) → chi phí tăng
        creditAccountId: parseInt(walletId), // Assets (typeId=1) → ví giảm
        amount:          parseFloat(amount),
        description:     description || null,
        transactionDate: new Date(date).toISOString(),
      };

    } else if (txType === "income") {
      // Thu nhập: debit wallet (Assets → tăng), credit Revenue account (auto-tạo)
      payload = {
        debitAccountId:    parseInt(walletId), // Assets → ví tăng
        creditAccountId:   0,                  // backend tự tạo Revenue account
        incomeCategoryName: incomeCategory,    // tên danh mục thu nhập
        amount:            parseFloat(amount),
        description:       description || null,
        transactionDate:   new Date(date).toISOString(),
      };

    } else {
      // Chuyển khoản: credit từ-ví (Assets → giảm), debit sang-ví (Assets → tăng)
      payload = {
        debitAccountId:  parseInt(toWalletId), // ví đích → tăng
        creditAccountId: parseInt(walletId),   // ví nguồn → giảm
        amount:          parseFloat(amount),
        description:     description || null,
        transactionDate: new Date(date).toISOString(),
      };
    }

    onAdd(payload);
    reset();
    onClose();
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Thêm Giao Dịch</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1">
          {TX_TYPES.map(({ key, label, Icon, activeCls }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTypeChange(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-sm font-semibold transition-all ${
                txType === key ? activeCls : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Mô tả ─────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Mô tả
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder={
                txType === "expense"  ? "e.g., Mua đồ ăn tối"           :
                txType === "income"   ? "e.g., Lương tháng 5"            :
                                        "e.g., Chuyển sang ví tiết kiệm"
              }
            />
          </div>

          {/* ── Số tiền ───────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Số tiền <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0.00"
                step="0.01"
                min="0.01"
                required
              />
            </div>
          </div>

          {/* ── CHI TIÊU: ví + danh mục budget ───────────────────── */}
          {txType === "expense" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Thanh toán từ ví <span className="text-red-500">*</span>
                </label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Chọn ví</option>
                  {assetAccounts.map((a) => (
                    <option key={a.accountId} value={a.accountId}>
                      {a.name} — ${Number(a.balance ?? 0).toLocaleString()}
                    </option>
                  ))}
                </select>
                {assetAccounts.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> Chưa có ví nào. Tạo ví trước.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Danh mục ngân sách <span className="text-red-500">*</span>
                </label>
                <select
                  value={budgetId}
                  onChange={(e) => setBudgetId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Chọn danh mục</option>
                  {expenseBudgets.map((b) => (
                    <option key={b.budgetId} value={b.budgetId}>
                      {b.title}
                      {b.targetAmount
                        ? ` — còn $${Number(b.targetAmount - (b.currentAmount ?? 0)).toLocaleString()}`
                        : ""}
                    </option>
                  ))}
                </select>
                {expenseBudgets.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> Chưa có ngân sách. Tạo Budget trước.
                  </p>
                )}
              </div>
            </>
          )}

          {/* ── THU NHẬP: ví + danh mục preset ───────────────────── */}
          {txType === "income" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nhận vào ví <span className="text-red-500">*</span>
                </label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Chọn ví</option>
                  {assetAccounts.map((a) => (
                    <option key={a.accountId} value={a.accountId}>
                      {a.name} — ${Number(a.balance ?? 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nguồn thu <span className="text-red-500">*</span>
                </label>
                <select
                  value={incomeCategory}
                  onChange={(e) => setIncomeCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Chọn nguồn</option>
                  {INCOME_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* ── CHUYỂN KHOẢN: ví nguồn + ví đích ─────────────────── */}
          {txType === "transfer" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Từ ví <span className="text-red-500">*</span>
                </label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Chọn ví nguồn</option>
                  {assetAccounts.map((a) => (
                    <option key={a.accountId} value={a.accountId}>
                      {a.name} — ${Number(a.balance ?? 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Sang ví <span className="text-red-500">*</span>
                </label>
                <select
                  value={toWalletId}
                  onChange={(e) => setToWalletId(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    sameWalletError ? "border-red-400 bg-red-50" : "border-slate-200"
                  }`}
                  required
                >
                  <option value="">Chọn ví đích</option>
                  {assetAccounts
                    .filter((a) => String(a.accountId) !== walletId)
                    .map((a) => (
                      <option key={a.accountId} value={a.accountId}>
                        {a.name} — ${Number(a.balance ?? 0).toLocaleString()}
                      </option>
                    ))}
                </select>
                {sameWalletError && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> Ví nguồn và ví đích phải khác nhau.
                  </p>
                )}
              </div>
            </>
          )}

          {/* ── Ngày ──────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Ngày giao dịch
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* ── Actions ───────────────────────────────────────────── */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { reset(); onClose(); }}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`flex-1 px-4 py-3 text-white rounded-lg transition-colors font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${SUBMIT_CLS[txType]}`}
            >
              {SUBMIT_LABEL[txType]}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
