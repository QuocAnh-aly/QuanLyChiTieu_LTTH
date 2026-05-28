import {
  useState, useEffect, useCallback, useMemo,
} from "react";
import {
  ArrowUpRight, ArrowDownRight, ArrowLeftRight,
  Search, Plus, Trash2, Pencil, RefreshCw, TrendingUp,
} from "lucide-react";
import {
  format, startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  subMonths, parseISO,
} from "date-fns";
import { vi } from "date-fns/locale";
import { transactionApi } from "../../api/transactionApi";
import { toast } from "sonner";
import { AddTransactionModal } from "../../components/AddTransactionModal";
import { EditTransactionModal } from "../../components/EditTransactionModal";
import { useSettings } from "../../context/SettingsContext";

// typeId: 1=Assets, 4=Revenue, 5=Expense
// Source = credit side, Destination = debit side (Firefly III model)
function mapTransaction(t) {
  const details       = t.details || [];
  const debitDetail   = details.find(d => d.debit  > 0);
  const creditDetail  = details.find(d => d.credit > 0);
  const expenseDetail = details.find(d => d.typeId === 5 && d.debit  > 0);
  const revenueDetail = details.find(d => d.typeId === 4 && d.credit > 0);
  const isTransfer    = !expenseDetail && !revenueDetail;
  const isIncome      = !!revenueDetail;
  let categoryName    = "Chưa phân loại";
  if (expenseDetail)      categoryName = expenseDetail.accountName || "Chi tiêu";
  else if (revenueDetail) categoryName = revenueDetail.accountName || "Thu nhập";
  else if (isTransfer)    categoryName = "Chuyển khoản";
  return {
    ...t,
    categoryName,
    isIncome,
    isTransfer,
    sourceAccount: creditDetail?.accountName || "—",
    destAccount:   debitDetail?.accountName  || "—",
  };
}

const PRESETS = [
  { key: "today",     label: "Hôm nay"     },
  { key: "week",      label: "Tuần này"    },
  { key: "month",     label: "Tháng này"   },
  { key: "lastMonth", label: "Tháng trước" },
  { key: "all",       label: "Tất cả"      },
];

function getPresetRange(key) {
  const now = new Date();
  switch (key) {
    case "today":     return { from: startOfDay(now),             to: endOfDay(now)             };
    case "week":      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":     return { from: startOfMonth(now),           to: endOfMonth(now)           };
    case "lastMonth": { const lm = subMonths(now, 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; }
    default:          return { from: null, to: null };
  }
}

export function Transactions() {
  const { fmt } = useSettings();

  const [transactions,    setTransactions]    = useState([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [isRefreshing,    setIsRefreshing]    = useState(false);
  const [searchTerm,      setSearchTerm]      = useState("");
  const [filterType,      setFilterType]      = useState("all");
  const [page,            setPage]            = useState(1);
  const [totalCount,      setTotalCount]      = useState(0);
  const [cashFlow,        setCashFlow]        = useState({ totalIncome: 0, totalExpense: 0, netCashFlow: 0 });
  const [preset,          setPreset]          = useState("month");
  const [customFrom,      setCustomFrom]      = useState("");
  const [customTo,        setCustomTo]        = useState("");
  const [showCustom,      setShowCustom]      = useState(false);
  const [isAddModalOpen,  setIsAddModalOpen]  = useState(false);
  const [editTarget,      setEditTarget]      = useState(null);
  const PAGE_SIZE = 25;

  // Resolve active date range
  const { from: rangeFrom, to: rangeTo } = useMemo(() => {
    if (preset === "custom") {
      return {
        from: customFrom ? startOfDay(new Date(customFrom)) : null,
        to:   customTo   ? endOfDay(new Date(customTo))     : null,
      };
    }
    return getPresetRange(preset);
  }, [preset, customFrom, customTo]);

  const useRange = !!(rangeFrom && rangeTo);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      if (useRange) {
        const [txData, cfData] = await Promise.all([
          transactionApi.getByRange(rangeFrom.toISOString(), rangeTo.toISOString()),
          transactionApi.getCashFlow(rangeFrom.toISOString(), rangeTo.toISOString()),
        ]);
        setTransactions((txData || []).map(mapTransaction));
        setTotalCount((txData || []).length);
        setCashFlow({
          totalIncome:  cfData.totalIncome  ?? 0,
          totalExpense: cfData.totalExpense ?? 0,
          netCashFlow:  cfData.netCashFlow  ?? 0,
        });
      } else {
        const data = await transactionApi.getAll({ page, pageSize: PAGE_SIZE });
        const items = (data.items || data || []).map(mapTransaction);
        setTransactions(items);
        setTotalCount(data.totalCount ?? data.total ?? items.length);
        // Estimate cash flow from loaded page
        setCashFlow({
          totalIncome:  items.filter(t => t.isIncome).reduce((s, t) => s + t.totalAmount, 0),
          totalExpense: items.filter(t => !t.isIncome && !t.isTransfer).reduce((s, t) => s + t.totalAmount, 0),
          netCashFlow:  0,
        });
      }
    } catch {
      toast.error("Không thể tải dữ liệu giao dịch");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [useRange, rangeFrom, rangeTo, page]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSelectPreset = (key) => {
    if (key === "custom") {
      setShowCustom(true);
      setPreset("custom");
    } else {
      setShowCustom(false);
      setPreset(key);
      setPage(1);
    }
  };

  const handleAddTransaction = async (data) => {
    try {
      await transactionApi.create(data);
      await loadData(true);
      setPage(1);
      toast.success("Đã thêm giao dịch!");
    } catch {
      toast.error("Không thể thêm giao dịch");
    }
  };

  const handleSaveEdit = async (data) => {
    if (!editTarget) return;
    try {
      await transactionApi.update(editTarget.journalId, data);
      setEditTarget(null);
      await loadData(true);
      toast.success("Đã cập nhật giao dịch!");
    } catch {
      toast.error("Không thể cập nhật giao dịch");
    }
  };

  const handleDelete = async (id, description) => {
    if (!window.confirm(`Xóa giao dịch "${description || 'này'}"?`)) return;
    try {
      await transactionApi.delete(id);
      await loadData(true);
      toast.success("Đã xóa giao dịch.");
    } catch {
      toast.error("Không thể xóa giao dịch");
    }
  };

  // Filter client-side (type + search)
  const filtered = useMemo(() => transactions.filter(t => {
    const matchSearch =
      (t.description ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType =
      filterType === "all"      ||
      (filterType === "income"   && t.isIncome)              ||
      (filterType === "transfer" && t.isTransfer)            ||
      (filterType === "expense"  && !t.isIncome && !t.isTransfer);
    return matchSearch && matchType;
  }), [transactions, searchTerm, filterType]);

  // Group by date (descending)
  const grouped = useMemo(() => {
    const map = new Map();
    [...filtered]
      .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))
      .forEach(t => {
        const key = format(new Date(t.transactionDate), "yyyy-MM-dd");
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(t);
      });
    return map;
  }, [filtered]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const amountDisplay = (t) => {
    if (t.isTransfer) return <span className="text-blue-600">{fmt(t.totalAmount)}</span>;
    if (t.isIncome)   return <span className="text-green-600">+{fmt(t.totalAmount)}</span>;
    return                   <span className="text-slate-900">-{fmt(t.totalAmount)}</span>;
  };

  const txBg   = (t) => t.isTransfer ? "bg-blue-50" : t.isIncome ? "bg-green-100" : "bg-red-50";
  const TxIcon = (t) => t.isTransfer ? ArrowLeftRight : t.isIncome ? ArrowUpRight : ArrowDownRight;
  const txIconCls = (t) => t.isTransfer ? "text-blue-500" : t.isIncome ? "text-green-600" : "text-red-500";

  const netPositive = cashFlow.netCashFlow >= 0;

  return (
    <div className="p-8">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Giao dịch</h1>
          <p className="text-slate-500 mt-1">Lịch sử tất cả hoạt động tài chính</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
            title="Làm mới"
          >
            <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus size={18} />
            <span className="font-medium">Thêm giao dịch</span>
          </button>
        </div>
      </div>

      {/* ── Date range presets ────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => handleSelectPreset(p.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              preset === p.key
                ? "bg-purple-600 text-white border-purple-600"
                : "border-slate-200 text-slate-600 hover:border-purple-400 hover:text-purple-600"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => handleSelectPreset("custom")}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            preset === "custom"
              ? "bg-purple-600 text-white border-purple-600"
              : "border-slate-200 text-slate-600 hover:border-purple-400 hover:text-purple-600"
          }`}
        >
          Tùy chỉnh
        </button>

        {/* Custom date pickers */}
        {showCustom && (
          <div className="flex items-center gap-2 ml-1">
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <span className="text-slate-400 text-sm">đến</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        )}
      </div>

      {/* ── Cash flow summary ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <ArrowUpRight size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Thu nhập</p>
            <p className="text-xl font-bold text-green-600">{fmt(cashFlow.totalIncome)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <ArrowDownRight size={20} className="text-red-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Chi tiêu</p>
            <p className="text-xl font-bold text-slate-900">-{fmt(cashFlow.totalExpense)}</p>
          </div>
        </div>

        <div className={`rounded-xl p-5 border flex items-center gap-4 shadow-sm ${
          netPositive ? "bg-purple-600 border-purple-700" : "bg-white border-slate-200"
        }`}>
          <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
            netPositive ? "bg-white/20" : "bg-slate-100"
          }`}>
            <TrendingUp size={20} className={netPositive ? "text-white" : "text-slate-600"} />
          </div>
          <div>
            <p className={`text-xs font-medium ${netPositive ? "text-purple-100" : "text-slate-500"}`}>
              {useRange ? "Còn lại" : "Số giao dịch"}
            </p>
            <p className={`text-xl font-bold ${netPositive ? "text-white" : "text-slate-900"}`}>
              {useRange
                ? `${netPositive ? "+" : ""}${fmt(cashFlow.netCashFlow)}`
                : totalCount
              }
            </p>
          </div>
        </div>
      </div>

      {/* ── Table card ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

        {/* Search + filter row */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3 items-center bg-slate-50/50">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
              placeholder="Tìm kiếm theo mô tả hoặc danh mục..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {[
              { key: "all",      label: "Tất cả"       },
              { key: "income",   label: "Thu nhập"     },
              { key: "expense",  label: "Chi tiêu"     },
              { key: "transfer", label: "Chuyển khoản" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filterType === key ? "bg-purple-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction rows */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <ArrowLeftRight size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-600">Không có giao dịch nào</p>
              <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc khoảng thời gian</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-3 font-semibold">Mô tả</th>
                  <th className="px-6 py-3 font-semibold">Nguồn → Đích</th>
                  <th className="px-6 py-3 font-semibold">Giờ</th>
                  <th className="px-6 py-3 font-semibold text-right">Số tiền</th>
                  <th className="px-6 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...grouped.entries()].map(([dateKey, txs]) => {
                  const dateLabel = format(new Date(dateKey), "EEEE, dd/MM/yyyy", { locale: vi });
                  const dayIncome  = txs.filter(t => t.isIncome).reduce((s, t) => s + t.totalAmount, 0);
                  const dayExpense = txs.filter(t => !t.isIncome && !t.isTransfer).reduce((s, t) => s + t.totalAmount, 0);

                  return (
                    <>
                      {/* Date separator */}
                      <tr key={`hdr-${dateKey}`} className="bg-slate-50/80">
                        <td colSpan={3} className="px-6 py-2">
                          <span className="text-xs font-bold text-slate-500 capitalize">{dateLabel}</span>
                        </td>
                        <td className="px-6 py-2 text-right">
                          <div className="flex items-center justify-end gap-3 text-xs font-semibold">
                            {dayIncome  > 0 && <span className="text-green-600">+{fmt(dayIncome)}</span>}
                            {dayExpense > 0 && <span className="text-red-500">-{fmt(dayExpense)}</span>}
                          </div>
                        </td>
                        <td />
                      </tr>

                      {/* Transaction rows */}
                      {txs.map(t => {
                        const Icon = TxIcon(t);
                        return (
                          <tr key={t.journalId} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${txBg(t)}`}>
                                  <Icon size={15} className={txIconCls(t)} />
                                </div>
                                <span className="font-medium text-slate-900 text-sm">
                                  {t.description || <span className="italic text-slate-400">Không có mô tả</span>}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-slate-500 max-w-[90px] truncate" title={t.sourceAccount}>
                                  {t.sourceAccount}
                                </span>
                                <ArrowLeftRight size={11} className="text-slate-300 shrink-0" />
                                <span className={`font-semibold max-w-[90px] truncate ${
                                  t.isTransfer ? "text-blue-600" :
                                  t.isIncome   ? "text-green-600" : "text-red-600"
                                }`} title={t.destAccount}>
                                  {t.destAccount}
                                </span>
                              </div>
                              {t.tags && (
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {t.tags.split(",").filter(Boolean).map(tag => (
                                    <span key={tag} className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-medium">
                                      {tag.trim()}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-3.5 text-slate-400 text-xs">
                              {format(new Date(t.transactionDate), "HH:mm")}
                            </td>
                            <td className="px-6 py-3.5 text-right font-bold text-sm">
                              {amountDisplay(t)}
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all justify-end">
                                <button
                                  onClick={() => setEditTarget(t)}
                                  className="p-1.5 rounded hover:bg-purple-50 text-slate-400 hover:text-purple-600 transition-colors"
                                  title="Sửa"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleDelete(t.journalId, t.description)}
                                  className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                  title="Xóa"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination — only in "all" mode */}
        {!useRange && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Trang {page} / {totalPages} • {totalCount} giao dịch
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs hover:bg-slate-50 disabled:opacity-40"
              >
                «
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-40"
              >
                Trước
              </button>

              {/* Page numbers */}
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      p === page
                        ? "bg-purple-600 text-white"
                        : "border border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-40"
              >
                Tiếp
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs hover:bg-slate-50 disabled:opacity-40"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddTransaction}
      />
      <EditTransactionModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
        transaction={editTarget}
      />
    </div>
  );
}
