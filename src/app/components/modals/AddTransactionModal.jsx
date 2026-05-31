import { X, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { walletApi } from "../../api/walletApi";
import { useCategories } from "../../context/CategoriesContext";
import { useSettings } from "../../context/SettingsContext";

export function AddTransactionModal({ isOpen, onClose, onAdd, initialType = "expense" }) {
  const { expenseCategories, incomeSources } = useCategories();
  const { fmt, currencySymbol }              = useSettings();

  const [txType,          setTxType]          = useState(initialType);
  const [assetAccounts,   setAssetAccounts]   = useState([]);
  const [walletId,        setWalletId]        = useState("");
  const [toWalletId,      setToWalletId]      = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [incomeCategory,  setIncomeCategory]  = useState("");
  const [amount,          setAmount]          = useState("");
  const [description,     setDescription]     = useState("");
  const [notes,           setNotes]           = useState("");
  const [date,            setDate]            = useState(() => new Date().toISOString().slice(0, 10));
  
  // Extra fields for the new UI
  const [foreignAmount, setForeignAmount] = useState("");
  const [budget, setBudget] = useState("");
  const [piggyBank, setPiggyBank] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [subscription, setSubscription] = useState("");
  const [interestDate, setInterestDate] = useState("");

  const [createAnother,   setCreateAnother]   = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTxType(initialType);
    walletApi.getByType(1)
      .then(data => setAssetAccounts(data.items || data || []))
      .catch(() => {});
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const reset = () => {
    setTxType(initialType);
    setWalletId(""); setToWalletId("");
    setExpenseCategory(""); setIncomeCategory("");
    setAmount(""); setDescription(""); setNotes("");
    setDate(new Date().toISOString().slice(0, 10));
    setForeignAmount(""); setBudget(""); setPiggyBank("");
    setTagsText(""); setSubscription(""); setInterestDate("");
  };

  const sameWalletError = txType === "transfer" && walletId && toWalletId && walletId === toWalletId;

  const canSubmit = (() => {
    if (!walletId || !amount || parseFloat(amount) <= 0) return false;
    if (txType === "expense")  return !!expenseCategory;
    if (txType === "income")   return !!incomeCategory;
    if (txType === "transfer") return !!toWalletId && !sameWalletError;
    return false;
  })();

  const buildPayload = () => {
    const base = {
      amount:          parseFloat(amount),
      description:     description || null,
      notes:           notes       || null,
      tags:            tagsText    || null,
      transactionDate: new Date(date).toISOString(),
    };
    if (txType === "expense") return { ...base, debitAccountId: 0,               creditAccountId: parseInt(walletId), expenseCategoryName: expenseCategory || "Chưa phân loại" };
    if (txType === "income")  return { ...base, debitAccountId: parseInt(walletId), creditAccountId: 0,               incomeCategoryName:  incomeCategory || "Khác" };
    return { ...base, debitAccountId: parseInt(toWalletId), creditAccountId: parseInt(walletId) };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onAdd(buildPayload());
    if (createAnother) {
      setAmount(""); setDescription(""); setNotes("");
      setForeignAmount(""); setTagsText("");
    } else {
      reset();
      onClose();
    }
  };

  const walletLabel = (a) => `${a.name} — ${fmt(a.balance ?? 0)}`;

  const headerTitle = txType === "expense" ? "Tạo rút tiền mới" : txType === "income" ? "Tạo tiền gửi mới" : "Tạo chuyển khoản mới";

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-muted w-full max-w-full sm:max-w-[1200px] sm:min-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-card px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <span className="text-muted-foreground">⇄</span> Giao dịch
            </h2>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground text-sm">
              <span className="font-bold text-lg mr-1">+</span> {headerTitle}
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Info bar */}
        <div className="bg-muted px-6 py-3 border-b border-border text-sm text-muted-foreground flex items-center gap-2">
          Xin lỗi, không có văn bản giải thích bổ sung cho trang này. Tuy nhiên, biểu tượng ở góc trên bên phải có thể cho bạn biết nhiều hơn. <AlertCircle size={14} className="inline"/>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col bg-card m-6 border border-border shadow-sm">
          
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-lg text-foreground">Thông tin giao dịch</h3>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6">
            
            {/* Left Column */}
            <div className="space-y-6">
              
              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Mô tả</label>
                <div className="flex">
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-l focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="Mô tả giao dịch"
                  />
                  <button type="button" className="px-3 py-2 border border-l-0 border-border bg-muted rounded-r text-muted-foreground hover:bg-muted">
                    <span className="text-xs">🗑</span>
                  </button>
                </div>
              </div>

              {/* Source account */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Tài khoản nguồn</label>
                <div className="flex">
                  <select
                    value={walletId}
                    onChange={e => setWalletId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-l focus:outline-none focus:border-blue-500 text-sm bg-card"
                  >
                    <option value="">Chọn tài khoản nguồn</option>
                    {assetAccounts.map(a => <option key={a.accountId} value={a.accountId}>{walletLabel(a)}</option>)}
                  </select>
                  <button type="button" className="px-3 py-2 border border-l-0 border-border bg-muted rounded-r text-muted-foreground hover:bg-muted">
                    <span className="text-xs">🗑</span>
                  </button>
                </div>
              </div>

              {/* Destination account */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Tài khoản đích</label>
                <div className="flex">
                  <select
                    value={toWalletId}
                    onChange={e => {
                      setToWalletId(e.target.value);
                      if (e.target.value) setTxType("transfer");
                    }}
                    className="flex-1 px-3 py-2 border border-border rounded-l focus:outline-none focus:border-blue-500 text-sm bg-card"
                  >
                    <option value="">Chọn tài khoản đích</option>
                    {assetAccounts.filter(a => String(a.accountId) !== walletId).map(a => <option key={a.accountId} value={a.accountId}>{walletLabel(a)}</option>)}
                  </select>
                  <button type="button" className="px-3 py-2 border border-l-0 border-border bg-muted rounded-r text-muted-foreground hover:bg-muted">
                    <span className="text-xs">🗑</span>
                  </button>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Ngày</label>
                <div className="flex">
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-l focus:outline-none focus:border-blue-500 text-sm"
                  />
                  <button type="button" className="px-3 py-2 border border-l-0 border-border bg-muted rounded-r text-muted-foreground hover:bg-muted">
                    <span className="text-xs">🗑</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="space-y-6">
              
              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Số tiền</label>
                <div className="flex">
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-l focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="Số tiền"
                    step="1"
                    min="0"
                    required
                  />
                  <button type="button" className="px-3 py-2 border border-l-0 border-border bg-muted rounded-r text-muted-foreground hover:bg-muted">
                    <span className="text-xs">🗑</span>
                  </button>
                </div>
              </div>

              {/* Foreign amount */}
              <div className="flex gap-2">
                <div className="w-1/4 pt-5">
                   <select className="w-full px-2 py-2 border border-border rounded focus:outline-none focus:border-blue-500 text-sm bg-card">
                     <option value=""></option>
                     <option value="USD">USD</option>
                     <option value="EUR">EUR</option>
                   </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Ngoại tệ</label>
                  <div className="flex">
                    <input
                      type="number"
                      value={foreignAmount}
                      onChange={e => setForeignAmount(e.target.value)}
                      className="flex-1 px-3 py-2 border border-border rounded-l focus:outline-none focus:border-blue-500 text-sm"
                      placeholder="Số ngoại tệ"
                    />
                    <button type="button" className="px-3 py-2 border border-l-0 border-border bg-muted rounded-r text-muted-foreground hover:bg-muted">
                      <span className="text-xs">🗑</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Ngân sách</label>
                <select
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:border-blue-500 text-sm bg-card"
                >
                  <option value="">(không)</option>
                  <option value="1">Ngân sách gia đình</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Danh mục</label>
                <div className="flex">
                  <select
                    value={expenseCategory || incomeCategory}
                    onChange={e => {
                      setExpenseCategory(e.target.value);
                      setIncomeCategory(e.target.value);
                    }}
                    className="flex-1 px-3 py-2 border border-border rounded-l focus:outline-none focus:border-blue-500 text-sm bg-card"
                  >
                    <option value="">Chọn danh mục</option>
                    {txType === 'expense' 
                      ? expenseCategories.map(c => <option key={c.id} value={c.label}>{c.label}</option>)
                      : incomeSources.map(c => <option key={c.id} value={c.label}>{c.label}</option>)
                    }
                  </select>
                  <button type="button" className="px-3 py-2 border border-l-0 border-border bg-muted rounded-r text-muted-foreground hover:bg-muted">
                    <span className="text-xs">🗑</span>
                  </button>
                </div>
              </div>

              {/* Piggy bank */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Lợn tiết kiệm</label>
                <select
                  value={piggyBank}
                  onChange={e => setPiggyBank(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:border-blue-500 text-sm bg-card"
                >
                  <option value="">(không chọn)</option>
                  <option value="1">Tiết kiệm mua xe</option>
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nhãn</label>
                <div className="flex">
                  <input
                    type="text"
                    value={tagsText}
                    onChange={e => setTagsText(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-l focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="Nhãn (phân cách bằng dấu phẩy)"
                  />
                  <button type="button" className="px-3 py-2 border border-l-0 border-border bg-muted rounded-r text-muted-foreground hover:bg-muted">
                    <span className="text-xs">🗑</span>
                  </button>
                </div>
              </div>

              {/* Subscription */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Định kỳ</label>
                <select
                  value={subscription}
                  onChange={e => setSubscription(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:border-blue-500 text-sm bg-card"
                >
                  <option value="">(không)</option>
                  <option value="1">Tiền điện hàng tháng</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">Bạn có thể bật thêm tùy chọn giao dịch trong <a href="#" className="text-blue-500">cài đặt</a>.</p>
              </div>

              {/* Interest date */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Ngày tính lãi</label>
                <div className="flex">
                  <input
                    type="date"
                    value={interestDate}
                    onChange={e => setInterestDate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-l focus:outline-none focus:border-blue-500 text-sm"
                  />
                  <button type="button" className="px-3 py-2 border border-l-0 border-border bg-muted rounded-r text-muted-foreground hover:bg-muted">
                    <span className="text-xs">🗑</span>
                  </button>
                </div>
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Tệp đính kèm</label>
                <div className="flex">
                  <input
                    type="file"
                    className="flex-1 px-2 py-1.5 border border-border rounded-l focus:outline-none focus:border-blue-500 text-sm bg-card"
                  />
                  <button type="button" className="px-3 py-2 border border-l-0 border-border bg-muted rounded-r text-muted-foreground hover:bg-muted">
                    <span className="text-xs">🗑</span>
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Ghi chú</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:border-blue-500 text-sm resize-none"
                  placeholder="Ghi chú thêm..."
                />
              </div>

            </div>
          </div>
          
          {/* Footer Actions */}
          <div className="mt-auto p-4 border-t border-border flex justify-between items-center bg-muted">
            <button
              type="button"
              onClick={() => setCreateAnother(true)}
              className="px-4 py-2 border border-border bg-card text-foreground rounded shadow-sm hover:bg-muted text-sm font-medium"
            >
              Thêm tiếp
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted text-sm font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
              >
                Lưu
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
