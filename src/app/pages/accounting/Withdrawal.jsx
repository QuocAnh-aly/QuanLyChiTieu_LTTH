import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowDownRight, Plus, RefreshCw, Search, Pencil, Trash2, ShoppingCart,
} from "lucide-react";
import {
  format, startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, subMonths,
} from "date-fns";
import { vi } from "date-fns/locale";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { transactionApi } from "../../api/transactionApi";
import { toast } from "sonner";
import { AddTransactionModal } from "../../components/modals/AddTransactionModal";
import { EditTransactionModal } from "../../components/modals/EditTransactionModal";
import { useSettings } from "../../context/SettingsContext";

function mapTx(t) {
  const details       = t.details || [];
  const debitDetail   = details.find(d => d.debit  > 0);
  const creditDetail  = details.find(d => d.credit > 0);
  const expenseDetail = details.find(d => d.typeId === 5 && d.debit  > 0);
  const revenueDetail = details.find(d => d.typeId === 4 && d.credit > 0);
  const isTransfer    = !expenseDetail && !revenueDetail;
  const isIncome      = !!revenueDetail;
  const categoryName  = expenseDetail?.accountName || "Chưa phân loại";
  return {
    ...t, categoryName, isIncome, isTransfer,
    sourceAccount: creditDetail?.accountName || "—",
    destAccount:   debitDetail?.accountName  || "—",
  };
}

const PRESETS = [
  { key: "today",     label: "Hôm nay"     },
  { key: "week",      label: "Tuần này"    },
  { key: "month",     label: "Tháng này"   },
  { key: "lastMonth", label: "Tháng trước" },
];

function getRange(key) {
  const now = new Date();
  switch (key) {
    case "today":     return { from: startOfDay(now),  to: endOfDay(now)  };
    case "week":      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "lastMonth": { const lm = subMonths(now, 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; }
    default:          return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

const PIE_COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#06b6d4"];

function ChartTooltip({ active, payload, fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-slate-700 mb-0.5">{payload[0].name || payload[0].payload?.date}</p>
      <p className="text-red-600 font-bold">{fmt(payload[0].value)}</p>
    </div>
  );
}

export function Withdrawal() {
  const { fmt } = useSettings();

  const [allTx,       setAllTx]       = useState([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [isRefresh,   setIsRefresh]   = useState(false);
  const [searchTerm,  setSearchTerm]  = useState("");
  const [preset,      setPreset]      = useState("month");
  const [customFrom,  setCustomFrom]  = useState("");
  const [customTo,    setCustomTo]    = useState("");
  const [showCustom,  setShowCustom]  = useState(false);
  const [isAddOpen,   setIsAddOpen]   = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);

  const { from: rangeFrom, to: rangeTo } = useMemo(() => {
    if (preset === "custom") return {
      from: customFrom ? startOfDay(new Date(customFrom)) : null,
      to:   customTo   ? endOfDay(new Date(customTo))     : null,
    };
    return getRange(preset);
  }, [preset, customFrom, customTo]);

  const loadData = useCallback(async (silent = false) => {
    if (!rangeFrom || !rangeTo) return;
    try {
      silent ? setIsRefresh(true) : setIsLoading(true);
      const data = await transactionApi.getByRange(rangeFrom.toISOString(), rangeTo.toISOString());
      setAllTx((data || []).map(mapTx));
    } catch {
      toast.error("Không thể tải dữ liệu");
    } finally {
      setIsLoading(false); setIsRefresh(false);
    }
  }, [rangeFrom, rangeTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const expenses = useMemo(() => allTx.filter(t => !t.isIncome && !t.isTransfer), [allTx]);

  const filtered = useMemo(() =>
    expenses.filter(t =>
      (t.description ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.categoryName.toLowerCase().includes(searchTerm.toLowerCase())
    ), [expenses, searchTerm]);

  const totalExpense = expenses.reduce((s, t) => s + t.totalAmount, 0);
  const avgExpense   = expenses.length > 0 ? totalExpense / expenses.length : 0;

  const categoryData = useMemo(() => {
    const map = new Map();
    expenses.forEach(t => map.set(t.categoryName, (map.get(t.categoryName) || 0) + t.totalAmount));
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const dailyData = useMemo(() => {
    const map = new Map();
    expenses.forEach(t => {
      const key = t.transactionDate.slice(0, 10);
      map.set(key, (map.get(key) || 0) + t.totalAmount);
    });
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date: format(new Date(date), "dd/MM"), amount }));
  }, [expenses]);

  const grouped = useMemo(() => {
    const map = new Map();
    [...filtered]
      .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))
      .forEach(t => {
        const key = t.transactionDate.slice(0, 10);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(t);
      });
    return map;
  }, [filtered]);

  const handleAdd = async (data) => {
    try { await transactionApi.create(data); await loadData(true); toast.success("Đã thêm giao dịch!"); }
    catch { toast.error("Không thể thêm giao dịch"); }
  };
  const handleSaveEdit = async (data) => {
    if (!editTarget) return;
    try { await transactionApi.update(editTarget.journalId, data); setEditTarget(null); await loadData(true); toast.success("Đã cập nhật!"); }
    catch { toast.error("Không thể cập nhật"); }
  };
  const handleDelete = async (id, desc) => {
    if (!window.confirm(`Xóa giao dịch "${desc || 'này'}"?`)) return;
    try { await transactionApi.delete(id); await loadData(true); toast.success("Đã xóa!"); }
    catch { toast.error("Không thể xóa"); }
  };

  const tooltip = (props) => <ChartTooltip {...props} fmt={fmt} />;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <ShoppingCart size={20} className="text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Chi tiêu</h1>
          </div>
          <p className="text-slate-500 text-sm ml-[52px]">Theo dõi và phân tích các khoản chi</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadData(true)} disabled={isRefresh}
            className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
            <RefreshCw size={18} className={isRefresh ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium">
            <Plus size={18} /> Ghi chi tiêu
          </button>
        </div>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {PRESETS.map(p => (
          <button key={p.key} onClick={() => { setPreset(p.key); setShowCustom(false); }}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              preset === p.key ? "bg-red-500 text-white border-red-500" : "border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-500"
            }`}>
            {p.label}
          </button>
        ))}
        <button onClick={() => { setPreset("custom"); setShowCustom(true); }}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            preset === "custom" ? "bg-red-500 text-white border-red-500" : "border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-500"
          }`}>
          Tùy chỉnh
        </button>
        {showCustom && (
          <div className="flex items-center gap-2 ml-1">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            <span className="text-slate-400 text-sm">đến</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <ArrowDownRight size={22} className="text-red-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng chi tiêu</p>
            <p className="text-2xl font-bold text-red-600">-{fmt(totalExpense)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <ShoppingCart size={20} className="text-slate-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Số giao dịch</p>
            <p className="text-2xl font-bold text-slate-900">{expenses.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <ArrowDownRight size={20} className="text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Trung bình / giao dịch</p>
            <p className="text-2xl font-bold text-slate-900">{fmt(avgExpense)}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      {!isLoading && expenses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Donut — by category */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Chi tiêu theo danh mục</h3>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="42%" cy="50%" innerRadius={58} outerRadius={88}
                    dataKey="value" nameKey="name" paddingAngle={2}>
                    {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={tooltip} />
                  <Legend layout="vertical" align="right" verticalAlign="middle"
                    formatter={v => <span className="text-xs text-slate-600">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar — by day */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Chi tiêu theo ngày</h3>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ left: 0, right: 8, top: 4 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                    tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
                  <Tooltip content={tooltip} />
                  <Bar dataKey="amount" name="Chi tiêu" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Transaction table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Tìm kiếm mô tả hoặc danh mục..." />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
          ))}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart size={40} className="mx-auto mb-3 text-slate-200" />
            <p className="font-medium text-slate-500">Không có khoản chi nào</p>
            <p className="text-sm text-slate-400 mt-1">Thử thay đổi khoảng thời gian</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-3 font-semibold">Mô tả</th>
                <th className="px-6 py-3 font-semibold">Danh mục</th>
                <th className="px-6 py-3 font-semibold">Từ ví</th>
                <th className="px-6 py-3 font-semibold">Giờ</th>
                <th className="px-6 py-3 font-semibold text-right">Số tiền</th>
                <th className="px-6 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...grouped.entries()].map(([dateKey, txs]) => {
                const dayTotal = txs.reduce((s, t) => s + t.totalAmount, 0);
                return (
                  <>
                    <tr key={`hdr-${dateKey}`} className="bg-slate-50/80">
                      <td colSpan={4} className="px-6 py-2">
                        <span className="text-xs font-bold text-slate-500 capitalize">
                          {format(new Date(dateKey), "EEEE, dd/MM/yyyy", { locale: vi })}
                        </span>
                      </td>
                      <td className="px-6 py-2 text-right">
                        <span className="text-xs font-bold text-red-600">-{fmt(dayTotal)}</span>
                      </td>
                      <td />
                    </tr>
                    {txs.map(t => (
                      <tr key={t.journalId} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                              <ArrowDownRight size={15} className="text-red-500" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 text-sm">
                                {t.description || <span className="italic text-slate-400">Không có mô tả</span>}
                              </p>
                              {t.tags && (
                                <div className="flex gap-1 mt-0.5 flex-wrap">
                                  {t.tags.split(",").filter(Boolean).map(tag => (
                                    <span key={tag} className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-medium">{tag.trim()}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            {t.categoryName}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-500">{t.sourceAccount}</td>
                        <td className="px-6 py-3.5 text-xs text-slate-400">
                          {format(new Date(t.transactionDate), "HH:mm")}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-sm text-slate-900">
                          -{fmt(t.totalAmount)}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all justify-end">
                            <button onClick={() => setEditTarget(t)}
                              className="p-1.5 rounded hover:bg-purple-50 text-slate-400 hover:text-purple-600">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDelete(t.journalId, t.description)}
                              className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <AddTransactionModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onAdd={handleAdd} initialType="expense" />
      <EditTransactionModal isOpen={!!editTarget} onClose={() => setEditTarget(null)} onSave={handleSaveEdit} transaction={editTarget} />
    </div>
  );
}
