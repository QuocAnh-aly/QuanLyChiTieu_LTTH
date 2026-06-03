import { X, PiggyBank, Plus, Trash2, Target } from "lucide-react";
import { useState, useEffect } from "react";
import { walletApi } from "../../api/walletApi";
import { useSettings } from "../../context/SettingsContext";
import { formatVND, parseVND } from "../../utils/formatMoney";
import { joinTitle } from "../../utils/savingsGroup";

const COLORS = ["green", "blue", "purple", "orange", "pink", "indigo", "emerald"];

const blankSub = () => ({ key: Math.random().toString(36).slice(2), name: "", amount: "" });

// Create a "parent goal (mục tiêu chung)" holding several "sub-goals (mục tiêu nhỏ)".
// Each sub-goal is persisted as one savings Budget titled "<parent> :: <sub>".
// onSave receives an array of CreateSavingsGoalDto-shaped payloads.
export function PiggyBankGroupModal({ isOpen, onClose, onSave }) {
  const { fmt, currencies, currency } = useSettings();

  const [accounts, setAccounts] = useState([]);
  const [parentName, setParentName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [color, setColor] = useState("green");
  const [subs, setSubs] = useState([blankSub(), blankSub()]);

  useEffect(() => {
    if (!isOpen) return;
    walletApi
      .getByType(1)
      .then((data) => {
        const list = data.items || data || [];
        setAccounts(list);
        // Prefer a savings-type asset account (sub-type icon = PiggyBank).
        const savings = list.find((a) => a.iconName === "PiggyBank");
        setAccountId(String((savings || list[0])?.accountId ?? ""));
      })
      .catch(() => {});
    setParentName("");
    setSelectedCurrency(currency);
    setTargetDate("");
    setColor("green");
    setSubs([blankSub(), blankSub()]);
  }, [isOpen, currency]);

  if (!isOpen) return null;

  const setSub = (key, field, value) =>
    setSubs((prev) => prev.map((s) => (s.key === key ? { ...s, [field]: value } : s)));
  const addSub = () => setSubs((prev) => [...prev, blankSub()]);
  const removeSub = (key) =>
    setSubs((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev));

  const validSubs = subs.filter((s) => s.name.trim() && parseFloat(s.amount) > 0);
  const totalTarget = validSubs.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
  const canSubmit = parentName.trim() && accountId && validSubs.length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    const group = parentName.trim();
    const payloads = validSubs.map((s) => ({
      accountId: parseInt(accountId),
      title: joinTitle(group, s.name.trim()),
      targetAmount: parseFloat(s.amount),
      monthlyContribution: 0,
      targetDate: targetDate || null,
      notes: null,
      currency: selectedCurrency,
      objectGroup: group,
      iconName: "PiggyBank",
      color,
    }));
    onSave(payloads);
  };

  const savingsAccounts = accounts.filter((a) => a.iconName === "PiggyBank");
  const otherAccounts = accounts.filter((a) => a.iconName !== "PiggyBank");

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
              <PiggyBank className="text-green-600" size={20} />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Mục tiêu tiết kiệm
              <span className="text-sm font-normal text-muted-foreground ml-2">Tạo mới</span>
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="piggy-group-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Parent goal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Mục tiêu chung <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  required
                  placeholder="VD: Mua xe cho gia đình"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Tài khoản tiết kiệm <span className="text-red-500">*</span>
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                >
                  {savingsAccounts.length > 0 && (
                    <optgroup label="Tài khoản tiết kiệm">
                      {savingsAccounts.map((a) => (
                        <option key={a.accountId} value={a.accountId}>{a.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {otherAccounts.length > 0 && (
                    <optgroup label="Tài khoản khác">
                      {otherAccounts.map((a) => (
                        <option key={a.accountId} value={a.accountId}>{a.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Tạo tài khoản loại "Tiết kiệm" để xuất hiện ở đây.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Tiền tệ</label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                >
                  {currencies?.map((c) => (
                    <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Ngày mục tiêu</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Màu sắc</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "ring-2 ring-offset-1 ring-purple-500 border-white" : "border-transparent"}`}
                      style={{ backgroundColor: ({ green: "#22c55e", blue: "#3b82f6", purple: "#8b5cf6", orange: "#f97316", pink: "#ec4899", indigo: "#6366f1", emerald: "#10b981" })[c] }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Sub-goals */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/50 flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <Target size={15} className="text-purple-500" /> Mục tiêu nhỏ
                </h3>
                <button
                  type="button"
                  onClick={addSub}
                  className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700"
                >
                  <Plus size={14} /> Thêm mục tiêu nhỏ
                </button>
              </div>
              <div className="p-4 space-y-3">
                {subs.map((s, i) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) => setSub(s.key, "name", e.target.value)}
                      placeholder="VD: Mua xe cho bố"
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="text"
                      value={formatVND(s.amount)}
                      onChange={(e) => setSub(s.key, "amount", parseVND(e.target.value))}
                      placeholder="Số tiền"
                      className="w-40 px-3 py-2 border border-border rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeSub(s.key)}
                      disabled={subs.length <= 1}
                      className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Xóa"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Tổng mục tiêu chung</span>
                <span className="text-base font-bold text-purple-600">{fmt(totalTarget)}</span>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-semibold text-sm"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="piggy-group-form"
            disabled={!canSubmit}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm disabled:opacity-50"
          >
            Lưu {validSubs.length > 0 ? `${validSubs.length} mục tiêu` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
