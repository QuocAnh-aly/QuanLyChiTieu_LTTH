import {
  Plus, Pencil, Trash2, Search, CheckCircle2, AlertTriangle,
  TrendingUp, ArrowDownRight, DollarSign, Wallet,
  ChevronDown, ChevronUp, ArrowUpDown, X,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { walletApi } from "../../../api/walletApi";
import { transactionApi } from "../../../api/transactionApi";
import { useSettings } from "../../../context/SettingsContext";
import { AccountFormModal } from "../../../components/modals/AccountFormModal";
import { toast } from "sonner";
import { PageLayout } from "../../../components/layout/PageLayout";

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#ec4899", "#a855f7", "#f43f5e", "#fb923c", "#fdba74"];

// Map transaction from API
function mapTransaction(t) {
  const details = t.details || [];
  const debitDetail = details.find(d => d.debit > 0);
  const creditDetail = details.find(d => d.credit > 0);
  const sourceAccount = creditDetail?.accountName || "—";
  const destAccount = debitDetail?.accountName || "—";
  return {
    ...t,
    sourceAccount,
    destAccount,
  };
}

export function Liabilities() {
  const { fmt } = useSettings();
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAcc, setEditingAcc] = useState(null);

  // Sort & Filter
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, paid
  const [sortBy, setSortBy] = useState("default"); // default, amount-desc, amount-asc, progress, name

  // Quick Repay
  const [repayTarget, setRepayTarget] = useState(null); // account object being repaid
  const [repayAmount, setRepayAmount] = useState("");
  const [repayWallet, setRepayWallet] = useState("");
  const [assetWallets, setAssetWallets] = useState([]);
  const [isRepaying, setIsRepaying] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false); // show confirmation before submit

  // Transaction history — fetch on-demand per account
  const [txCache, setTxCache] = useState({}); // { [accountId]: TransactionDto[] }
  const [loadingTx, setLoadingTx] = useState({}); // { [accountId]: boolean }
  const [expandedCard, setExpandedCard] = useState(null); // accountId

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await walletApi.getByType(2);
      setAccounts(data.items || data || []);
    } catch {
      setAccounts([]);
      toast.error("Không thể tải danh sách khoản nợ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleAdd = async (data) => {
    try {
      await walletApi.create(data);
      await fetchAccounts();
      toast.success(`Đã thêm khoản nợ "${data.name}"`);
      setShowModal(false);
    } catch {
      toast.error("Không thể thêm khoản nợ");
    }
  };

  const handleEdit = async (data) => {
    try {
      await walletApi.update(editingAcc.accountId, data);
      await fetchAccounts();
      toast.success(`Đã cập nhật "${data.name}"`);
      setEditingAcc(null);
    } catch {
      toast.error("Không thể cập nhật khoản nợ");
    }
  };

  const handleDelete = async (acc) => {
    if (!window.confirm(`Xóa khoản nợ "${acc.name}"? Lịch sử giao dịch liên quan sẽ không bị xóa.`)) return;
    try {
      await walletApi.delete(acc.accountId);
      await fetchAccounts();
      toast.success(`Đã xóa "${acc.name}"`);
    } catch {
      toast.error("Không thể xóa khoản nợ");
    }
  };

  const closeModal = () => { setShowModal(false); setEditingAcc(null); };

  // ── Open repay modal ──────────────────────────────────
  const openRepay = async (acc) => {
    setRepayTarget(acc);
    setRepayAmount("");
    setRepayWallet("");
    setConfirmStep(false);
    try {
      const data = await walletApi.getByType(1);
      setAssetWallets(data.items || data || []);
    } catch {
      setAssetWallets([]);
    }
  };

  const handleRepay = async () => {
    if (!repayTarget || !repayAmount || parseFloat(repayAmount) <= 0 || !repayWallet) return;
    setIsRepaying(true);
    try {
      await transactionApi.create({
        debitAccountId: repayTarget.accountId,
        creditAccountId: parseInt(repayWallet),
        amount: parseFloat(repayAmount),
        description: `Trả nợ ${repayTarget.name}`,
        transactionDate: new Date().toISOString(),
      });
      toast.success(`Đã trả ${fmt(parseFloat(repayAmount))} cho "${repayTarget.name}"`);
      setRepayTarget(null);
      setRepayAmount("");
      setRepayWallet("");
      setConfirmStep(false);
      // Nếu đang expand card của khoản nợ vừa trả thì clear cache để refresh khi mở lại
      if (expandedCard === repayTarget.accountId) {
        setTxCache(prev => { const n = {...prev}; delete n[repayTarget.accountId]; return n; });
      }
      await fetchAccounts();
    } catch {
      toast.error("Không thể thực hiện trả nợ");
    } finally {
      setIsRepaying(false);
    }
  };

  // ── Filter + Sort ─────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...accounts];

    // Filter by status
    if (filterStatus === "active") {
      list = list.filter(a => Math.abs(a.balance || 0) > 0);
    } else if (filterStatus === "paid") {
      list = list.filter(a => Math.abs(a.balance || 0) === 0);
    }

    // Search
    if (search) {
      list = list.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Sort
    switch (sortBy) {
      case "amount-desc":
        list.sort((a, b) => Math.abs(b.balance || 0) - Math.abs(a.balance || 0));
        break;
      case "amount-asc":
        list.sort((a, b) => Math.abs(a.balance || 0) - Math.abs(b.balance || 0));
        break;
      case "progress": {
        list.sort((a, b) => {
          const progA = a.initialBalance ? (1 - Math.abs(a.balance) / Math.abs(a.initialBalance)) * 100 : 0;
          const progB = b.initialBalance ? (1 - Math.abs(b.balance) / Math.abs(b.initialBalance)) * 100 : 0;
          return progA - progB;
        });
        break;
      }
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    return list;
  }, [accounts, filterStatus, search, sortBy]);

  // ── Stats ─────────────────────────────────────────────
  const totalDebt = accounts.reduce((s, a) => s + Math.abs(a.balance || 0), 0);
  const totalOriginal = accounts.reduce((s, a) => s + Math.abs(a.initialBalance || 0), 0);
  const totalPaid = Math.max(0, totalOriginal - totalDebt);
  const overallProgress = totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0;

  const repayProgress = (acc) => {
    if (!acc.initialBalance || acc.initialBalance === 0) return 0;
    return Math.min(100, Math.max(0, (1 - acc.balance / acc.initialBalance) * 100));
  };

  // ── Pie chart data ────────────────────────────────────
  const pieData = useMemo(() => {
    const active = accounts.filter(a => Math.abs(a.balance || 0) > 0);
    return active.map((a, i) => ({
      name: a.name,
      value: Math.abs(a.balance || 0),
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [accounts]);

  // ── Transaction history — fetch on-demand when expanding ──
  const toggleExpand = useCallback(async (accountId) => {
    if (expandedCard === accountId) {
      setExpandedCard(null);
      return;
    }
    setExpandedCard(accountId);

    // Nếu đã cache, không fetch lại
    if (txCache[accountId]) return;

    setLoadingTx(prev => ({ ...prev, [accountId]: true }));
    try {
      const now = new Date();
      const from = startOfMonth(now);
      const to = endOfMonth(now);
      const data = await transactionApi.getByRangeAndAccount(
        accountId,
        from.toISOString(),
        to.toISOString(),
      );
      setTxCache(prev => ({
        ...prev,
        [accountId]: (data || []).map(mapTransaction),
      }));
    } catch {
      // silently fail
      setTxCache(prev => ({ ...prev, [accountId]: [] }));
    } finally {
      setLoadingTx(prev => ({ ...prev, [accountId]: false }));
    }
  }, [expandedCard, txCache]);

  return (
    <PageLayout
      title="Nợ phải trả"
      subtitle="Quản lý các khoản vay, trả góp và nợ tín dụng"
      actions={
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span className="font-medium">Thêm khoản nợ</span>
        </button>
      }
    >
      {/* Total Debt Summary */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-red-100 text-sm font-medium">Tổng dư nợ</span>
              <DollarSign size={20} className="text-red-200" />
            </div>
            <p className="text-4xl font-bold mb-1">{fmt(totalDebt)}</p>
            <p className="text-red-100 text-sm">
              {accounts.length} khoản vay
              {totalDebt > 0 && ` • ${((totalDebt / Math.max(totalOriginal, 1)) * 100).toFixed(0)}% nợ gốc còn lại`}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted-foreground text-sm font-medium">Đã trả được</span>
              <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center">
                <TrendingUp size={20} className="text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-card-foreground mb-1">{fmt(totalPaid)}</p>
            <p className="text-green-600 text-sm">{overallProgress.toFixed(1)}% tổng nợ gốc</p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted-foreground text-sm font-medium">Tổng nợ gốc</span>
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-card-foreground mb-1">{fmt(totalOriginal)}</p>
            <p className="text-red-600 text-sm">
              {accounts.filter(a => Math.abs(a.balance) > 0).length} khoản chưa tất toán
            </p>
          </div>
        </div>
      )}

      {/* Overall progress bar */}
      {accounts.length > 0 && totalOriginal > 0 && (
        <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tiến độ trả nợ tổng thể</h2>
            <span className="text-lg font-bold text-card-foreground">{overallProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 mb-2">
            <div
              className="bg-gradient-to-r from-red-500 to-green-500 h-3 rounded-full transition-all"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="text-red-500 font-medium">Còn nợ: {fmt(totalDebt)}</span>
            <span className="text-green-600 font-medium">Đã trả: {fmt(totalPaid)}</span>
          </div>
        </div>
      )}

      {/* Pie Chart - Debt distribution */}
      {pieData.length > 0 && (
        <div className="bg-card rounded-2xl p-6 border border-border mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Cơ cấu nợ theo khoản vay</h2>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="h-[200px] w-[200px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                    }}
                    formatter={(value, name) => [fmt(value), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 w-full space-y-2.5">
              {pieData.map((item) => {
                const pct = ((item.value / totalDebt) * 100).toFixed(1);
                return (
                  <div key={item.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground font-medium">{pct}%</span>
                      <span className="text-sm font-bold text-card-foreground">{fmt(item.value)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm khoản nợ..."
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 bg-card"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter chips */}
          <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
            {[
              { key: "all", label: "Tất cả" },
              { key: "active", label: "Còn nợ" },
              { key: "paid", label: "Đã tất toán" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterStatus === key
                    ? "bg-red-600 text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-8 pr-8 py-2 border border-border rounded-lg text-sm bg-card text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 cursor-pointer"
            >
              <option value="default">Mặc định</option>
              <option value="amount-desc">Số tiền ↓</option>
              <option value="amount-asc">Số tiền ↑</option>
              <option value="progress">Tiến độ</option>
              <option value="name">Tên A-Z</option>
            </select>
            <ArrowUpDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Single Master Card — tất cả nợ gom vào 1 card */}
      {isLoading ? (
        <div className="h-72 bg-accent animate-pulse rounded-2xl" />
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-card rounded-2xl border border-border">
          <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
          <p className="text-card-foreground font-bold text-lg mb-1">
            {search || filterStatus !== "all" ? "Không tìm thấy khoản nợ" : "Tuyệt vời, không có nợ!"}
          </p>
          <p className="text-muted-foreground font-medium">
            {search || filterStatus !== "all"
              ? "Thử lại với bộ lọc khác"
              : "Bạn đang hoàn toàn không có khoản nợ nào. Hãy giữ vững phong độ!"}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* Master Card Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-border bg-muted/50 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              <h2 className="text-sm font-bold text-card-foreground uppercase tracking-wide">
                Danh sách khoản nợ
              </h2>
              <span className="px-2 py-0.5 bg-red-500/10 text-red-600 rounded-full text-[10px] font-bold">
                {filtered.length} khoản
              </span>
              {filtered.filter(a => Math.abs(a.balance || 0) === 0).length > 0 && (
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-bold">
                  {filtered.filter(a => Math.abs(a.balance || 0) === 0).length} đã tất toán
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="font-semibold">Còn: <span className="text-red-500">{fmt(totalDebt)}</span></span>
              <span className="font-semibold">Gốc: {fmt(totalOriginal)}</span>
              {totalOriginal > 0 && (
                <span className="font-semibold">Đã trả: <span className="text-green-600">{fmt(totalPaid)}</span></span>
              )}
            </div>
          </div>

          {/* Debt rows */}
          <div className="divide-y divide-border">
            {filtered.map((acc, idx) => {
              const progress = repayProgress(acc);
              const remaining = Math.abs(acc.balance);
              const original = Math.abs(acc.initialBalance);
              const isExpanded = expandedCard === acc.accountId;
              const isPaidOff = remaining === 0;
              const paidAmount = original > 0 ? Math.max(0, original - remaining) : 0;

              return (
                <div
                  key={acc.accountId}
                  className={`group transition-colors ${isPaidOff ? "bg-muted/30" : "hover:bg-muted/30"}`}
                >
                  <div className={`px-4 sm:px-6 py-4 ${isExpanded ? "pb-3" : ""}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      {/* Left: Name + Badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isPaidOff ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-bold">
                              <svg viewBox="0 0 24 24" fill="none" className="w-2.5 h-2.5" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Đã trả xong
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-600 rounded-full text-[10px] font-bold">
                              <AlertTriangle size={10} />
                              Khoản vay
                            </span>
                          )}
                          {isPaidOff && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-full text-[10px] font-bold">
                              <TrendingUp size={10} />
                              Tài sản
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <h3 className={`font-bold ${isPaidOff ? "text-muted-foreground line-through" : "text-card-foreground"}`}>
                            {acc.name}
                          </h3>
                        </div>
                      </div>

                      {/* Middle: Amounts */}
                      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                        {isPaidOff ? (
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Còn lại</p>
                            <p className="text-lg font-bold text-emerald-600">+0</p>
                          </div>
                        ) : (
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Còn nợ</p>
                            <div className="flex items-center gap-1">
                              <ArrowDownRight size={14} className="text-red-400" />
                              <p className="text-lg font-bold text-card-foreground">{fmt(remaining)}</p>
                            </div>
                          </div>
                        )}
                        {original > 0 && (
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Nợ gốc</p>
                            <p className={`text-sm font-semibold ${isPaidOff ? "text-muted-foreground" : "text-muted-foreground"}`}>
                              {fmt(original)}
                            </p>
                          </div>
                        )}
                        {!isPaidOff && original > 0 && (
                          <div className="text-right hidden md:block min-w-[90px]">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Đã trả</p>
                            <p className="text-sm font-semibold text-green-600">{fmt(paidAmount)}</p>
                          </div>
                        )}
                      </div>

                      {/* Progress bar */}
                      {!isPaidOff && original > 0 && (
                        <div className="min-w-[100px] sm:min-w-[120px]">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>{progress.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                progress >= 100 ? "bg-emerald-500" :
                                progress >= 50 ? "bg-green-500" :
                                progress >= 25 ? "bg-amber-500" :
                                "bg-red-500"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isPaidOff && (
                          <button
                            onClick={() => openRepay(acc)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                          >
                            <Wallet size={12} />
                            Trả nợ
                          </button>
                        )}
                        <button
                          onClick={() => toggleExpand(acc.accountId)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isPaidOff
                              ? "text-muted-foreground border border-border hover:bg-muted"
                              : "text-card-foreground border border-border hover:bg-muted"
                          }`}
                        >
                          {loadingTx[acc.accountId] ? (
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                          ) : isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          {loadingTx[acc.accountId] ? "Đang tải..." : "Lịch sử"}
                        </button>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                          <button
                            onClick={() => setEditingAcc(acc)}
                            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
                            title="Sửa"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(acc)}
                            className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-muted-foreground"
                            title="Xóa"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Transaction History (expandable) */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Giao dịch gần đây
                        </p>
                        {loadingTx[acc.accountId] ? (
                          <div className="space-y-1.5">
                            {[1, 2].map(i => (
                              <div key={i} className="h-9 bg-muted rounded-lg animate-pulse" />
                            ))}
                          </div>
                        ) : (txCache[acc.accountId] || []).length === 0 ? (
                          <p className="text-muted-foreground text-xs">Chưa có giao dịch trong tháng này</p>
                        ) : (
                          <div className="space-y-1">
                            {(txCache[acc.accountId] || []).slice(0, 5).map(tx => (
                              <div
                                key={tx.journalId}
                                className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-card-foreground truncate">
                                    {tx.description || "Trả nợ"}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {format(new Date(tx.transactionDate), "dd/MM/yyyy", { locale: vi })}
                                  </p>
                                </div>
                                <span className="text-xs font-bold text-red-500 shrink-0 ml-2">
                                  -{fmt(tx.totalAmount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              {accounts.filter(a => Math.abs(a.balance) > 0).length} khoản chưa tất toán
              {totalOriginal > 0 && ` • ${overallProgress.toFixed(0)}% tổng nợ gốc đã trả`}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold">
              {accounts.length === filtered.length
                ? `${accounts.length} khoản nợ`
                : `Hiển thị ${filtered.length}/${accounts.length} khoản`}
            </p>
          </div>
        </div>
      )}

      {/* Quick Repay Modal */}
      {repayTarget && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setRepayTarget(null)}
        >
          <div
            className="bg-card rounded-2xl w-full max-w-md border border-border shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-card-foreground">Trả nợ</h2>
              <button
                onClick={() => setRepayTarget(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Debt info */}
              <div
                className="rounded-xl p-4 text-white"
                style={{
                  background: `linear-gradient(135deg, ${repayTarget.gradientFrom} 0%, ${repayTarget.gradientTo} 100%)`,
                }}
              >
                <p className="text-white/70 text-xs font-medium mb-1">{repayTarget.name}</p>
                <p className="text-2xl font-bold">Còn nợ: {fmt(Math.abs(repayTarget.balance || 0))}</p>
              </div>

              {confirmStep ? (
                <>
                  {/* Confirmation summary */}
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-2">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Xác nhận trả nợ</p>
                    <div className="flex justify-between text-sm text-amber-700 dark:text-amber-400">
                      <span>Khoản vay</span>
                      <span className="font-semibold">{repayTarget.name}</span>
                    </div>
                    <div className="flex justify-between text-sm text-amber-700 dark:text-amber-400">
                      <span>Số tiền trả</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {fmt(parseFloat(repayAmount))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-amber-700 dark:text-amber-400">
                      <span>Nguồn thanh toán</span>
                      <span className="font-semibold">
                        {assetWallets.find(w => String(w.accountId) === repayWallet)?.name || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmStep(false)}
                      disabled={isRepaying}
                      className="flex-1 py-3 border border-border text-card-foreground rounded-xl font-bold hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      Quay lại
                    </button>
                    <button
                      onClick={handleRepay}
                      disabled={isRepaying}
                      className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRepaying ? "Đang xử lý..." : "Xác nhận trả"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Số tiền trả
                    </label>
                    <input
                      type="number"
                      value={repayAmount}
                      onChange={e => setRepayAmount(e.target.value)}
                      placeholder="0"
                      step="1"
                      min="0"
                      autoFocus
                      className="w-full px-4 py-3 border border-border rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-red-500/50 bg-card"
                    />
                  </div>

                  {/* Source wallet */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Nguồn thanh toán
                    </label>
                    <select
                      value={repayWallet}
                      onChange={e => setRepayWallet(e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 bg-card"
                    >
                      <option value="">Chọn tài khoản nguồn</option>
                      {assetWallets.map(w => (
                        <option key={w.accountId} value={w.accountId}>
                          {w.name} — {fmt(w.balance ?? 0)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Continue button */}
                  <button
                    onClick={() => setConfirmStep(true)}
                    disabled={!repayAmount || parseFloat(repayAmount) <= 0 || !repayWallet}
                    className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Tiếp tục
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AccountFormModal
        isOpen={showModal}
        onClose={closeModal}
        onSubmit={handleAdd}
        account={null}
        typeId={2}
      />
      {editingAcc && (
        <AccountFormModal
          isOpen={true}
          onClose={closeModal}
          onSubmit={handleEdit}
          account={editingAcc}
          typeId={2}
        />
      )}
    </PageLayout>
  );
}
