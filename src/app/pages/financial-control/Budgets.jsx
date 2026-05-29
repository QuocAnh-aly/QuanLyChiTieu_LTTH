import {
  Plus,
  TrendingUp,
  ShoppingBag,
  Coffee,
  Car,
  Home,
  Zap,
  Heart,
  Pencil,
  Trash2,
  Calendar,
  Wallet,
  AlertTriangle,
  Search,
  LayoutGrid,
  List,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState, useEffect, useMemo, useRef } from "react";
import { AddBudgetModal } from "../../components/modals/AddBudgetModal";
import { EditBudgetModal } from "../../components/modals/EditBudgetModal";
import { toast } from "sonner";
import { budgetApi } from "../../api/budgetApi";
import { useSettings } from "../../context/SettingsContext";
import { useNotifications } from "../../context/NotificationContext";

export const iconMap = {
  Coffee, ShoppingBag, Car, Heart, Zap, Home, Wallet, TrendingUp,
};

export const colorMap = {
  orange:  { text: "text-orange-600",  bg: "bg-orange-100",  bar: "from-orange-400 to-orange-600",  pie: "#f97316" },
  pink:    { text: "text-pink-600",    bg: "bg-pink-100",    bar: "from-pink-400 to-pink-600",      pie: "#ec4899" },
  blue:    { text: "text-blue-600",    bg: "bg-blue-100",    bar: "from-blue-400 to-blue-600",      pie: "#3b82f6" },
  purple:  { text: "text-purple-600",  bg: "bg-purple-100",  bar: "from-purple-400 to-purple-600",  pie: "#a855f7" },
  yellow:  { text: "text-yellow-600",  bg: "bg-yellow-100",  bar: "from-yellow-400 to-yellow-600",  pie: "#eab308" },
  green:   { text: "text-green-600",   bg: "bg-green-100",   bar: "from-green-400 to-green-600",    pie: "#22c55e" },
  red:     { text: "text-red-600",     bg: "bg-red-100",     bar: "from-red-400 to-red-600",        pie: "#ef4444" },
  indigo:  { text: "text-indigo-600",  bg: "bg-indigo-100",  bar: "from-indigo-400 to-indigo-600",  pie: "#6366f1" },
  emerald: { text: "text-emerald-600", bg: "bg-emerald-100", bar: "from-emerald-400 to-emerald-600",pie: "#10b981" },
  slate:   { text: "text-slate-600",   bg: "bg-slate-100",   bar: "from-slate-400 to-slate-600",    pie: "#64748b" },
};

function mapBudget(b) {
  const colors = colorMap[b.color] || colorMap.orange;
  return {
    id: b.budgetId,
    accountId: b.accountId,
    accountName: b.accountName,
    name: b.title,
    icon: iconMap[b.iconName] || Coffee,
    iconName: b.iconName || "Coffee",
    color: b.color || "orange",
    textColor: colors.text,
    bgColor: colors.bg,
    barColor: colors.bar,
    pieColor: colors.pie,
    budget: b.targetAmount ?? 0,
    spent: b.currentAmount ?? 0,
    remaining: b.remaining ?? (b.targetAmount - (b.currentAmount ?? 0)),
    percentage: b.percentage ?? 0,
    periodType: b.periodType || "monthly",
    startDate: b.startDate,
    endDate: b.endDate,
    isActive: b.isActive,
  };
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("vi-VN", { month: "short", day: "numeric" });
}

function StatusBadge({ percentage }) {
  if (percentage > 100)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        <XCircle size={11} /> Vượt hạn mức
      </span>
    );
  if (percentage >= 80)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        <AlertTriangle size={11} /> Cảnh báo
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      <CheckCircle2 size={11} /> Ổn định
    </span>
  );
}

import { PageLayout } from "../../components/layout/PageLayout";

export function Budgets() {
  const { fmt } = useSettings();
  const { addNotification } = useNotifications();
  const [budgets, setBudgets] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => { fetchBudgets(); }, []);

  // Track previously notified budget IDs so we don't spam
  const notifiedOverRef = useRef(new Set());
  const notifiedWarningRef = useRef(new Set());

  const fetchBudgets = async () => {
    try {
      setIsLoading(true);
      const data = await budgetApi.getExpenseBudgets();
      const mapped = (data || []).map(mapBudget);
      setBudgets(mapped);

      // Check for budget warnings and send notifications
      mapped.forEach(b => {
        if (b.percentage > 100 && !notifiedOverRef.current.has(b.id)) {
          notifiedOverRef.current.add(b.id);
          toast.error(`"${b.name}" đã vượt hạn mức!`, {
            description: `Đã chi ${fmt(b.spent)} trên ${fmt(b.budget)} (${b.percentage.toFixed(1)}%)`,
            duration: 6000,
          });
          addNotification({
            type: 'error',
            title: '⚠️ Vượt hạn mức ngân sách',
            message: `"${b.name}" đã chi ${fmt(b.spent)}/${fmt(b.budget)} (${b.percentage.toFixed(1)}%)`,
            link: `/budgets/${b.id}`,
          });
        } else if (b.percentage >= 80 && b.percentage <= 100 && !notifiedWarningRef.current.has(b.id)) {
          notifiedWarningRef.current.add(b.id);
          toast.warning(`"${b.name}" sắp đạt hạn mức`, {
            description: `Đã dùng ${b.percentage.toFixed(1)}% (${fmt(b.spent)}/${fmt(b.budget)})`,
            duration: 5000,
          });
          addNotification({
            type: 'warning',
            title: '⚠️ Ngân sách sắp hết',
            message: `"${b.name}" đã dùng ${b.percentage.toFixed(1)}% (${fmt(b.spent)}/${fmt(b.budget)})`,
            link: `/budgets/${b.id}`,
          });
        }
      });
    } catch {
      toast.error("Không thể tải danh sách ngân sách");
    } finally {
      setIsLoading(false);
    }
  };

  const totalBudget  = budgets.reduce((s, b) => s + b.budget, 0);
  const totalSpent   = budgets.reduce((s, b) => s + b.spent,  0);
  const remaining    = totalBudget - totalSpent;
  const overallPct   = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const overCount    = budgets.filter(b => b.percentage > 100).length;
  const warningCount = budgets.filter(b => b.percentage >= 80 && b.percentage <= 100).length;
  const onTrackCount = budgets.filter(b => b.percentage < 80).length;

  const filtered = useMemo(() => {
    let list = [...budgets];
    if (search)                       list = list.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
    if (filterStatus === "over")       list = list.filter(b => b.percentage > 100);
    else if (filterStatus === "warning") list = list.filter(b => b.percentage >= 80 && b.percentage <= 100);
    else if (filterStatus === "on-track") list = list.filter(b => b.percentage < 80);
    if (sortBy === "pct-desc")  list.sort((a, b) => b.percentage - a.percentage);
    else if (sortBy === "pct-asc")  list.sort((a, b) => a.percentage - b.percentage);
    else if (sortBy === "amount")   list.sort((a, b) => b.budget - a.budget);
    else if (sortBy === "name")     list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [budgets, search, filterStatus, sortBy]);

  const pieData = budgets.filter(b => b.spent > 0).map(b => ({ name: b.name, value: b.spent, color: b.pieColor }));

  const handleAddBudget = async (data) => {
    try { await budgetApi.createExpenseBudget(data); await fetchBudgets(); toast.success("Đã thêm ngân sách!"); addNotification({ type: 'success', title: 'Ngân sách mới', message: 'Đã tạo ngân sách thành công', link: '/budgets' }); }
    catch { toast.error("Không thể thêm ngân sách"); addNotification({ type: 'error', title: 'Lỗi', message: 'Không thể thêm ngân sách' }); }
  };

  const handleEditBudget = async (id, data) => {
    try { await budgetApi.updateExpenseBudget(id, data); await fetchBudgets(); toast.success("Đã cập nhật ngân sách!"); setEditingBudget(null); addNotification({ type: 'success', title: 'Đã cập nhật', message: 'Ngân sách đã được cập nhật' }); }
    catch { toast.error("Không thể cập nhật ngân sách"); addNotification({ type: 'error', title: 'Lỗi', message: 'Không thể cập nhật ngân sách' }); }
  };

  const handleDeleteBudget = async (id, name) => {
    if (!window.confirm(`Xóa ngân sách "${name}"?`)) return;
    try { await budgetApi.deleteBudget(id); await fetchBudgets(); toast.success(`Đã xóa "${name}".`); addNotification({ type: 'warning', title: 'Đã xóa', message: `Đã xóa ngân sách "${name}"` }); }
    catch { toast.error("Không thể xóa ngân sách"); addNotification({ type: 'error', title: 'Lỗi', message: 'Không thể xóa ngân sách' }); }
  };

  return (
    <PageLayout
      title="Ngân sách"
      subtitle="Theo dõi chi tiêu của bạn theo từng danh mục"
      actions={
        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
          <Plus size={18} /><span>Thêm ngân sách</span>
        </button>
      }
    >

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600 text-sm font-medium">Tổng ngân sách</span>
            <TrendingUp size={20} className="text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{fmt(totalBudget)}</p>
          <p className="text-slate-500 text-sm mt-1">{budgets.length} ngân sách đang hoạt động</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600 text-sm font-medium">Tổng chi tiêu</span>
            <div className="w-2 h-2 rounded-full bg-red-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{fmt(totalSpent)}</p>
          <p className="text-slate-500 text-sm mt-1">
            {totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(1)}% ngân sách` : "—"}
          </p>
        </div>

        <div className={`rounded-2xl p-6 text-white ${remaining < 0 ? "bg-gradient-to-br from-red-500 to-red-700" : "bg-gradient-to-br from-green-500 to-green-700"}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={`text-sm font-medium ${remaining < 0 ? "text-red-100" : "text-green-100"}`}>
              {remaining < 0 ? "Vượt hạn mức" : "Còn lại"}
            </span>
            {remaining < 0 ? <AlertTriangle size={20} className="text-red-200" /> : <div className="w-2 h-2 rounded-full bg-green-200" />}
          </div>
          <p className="text-3xl font-bold">{fmt(Math.abs(remaining))}</p>
          <p className={`text-sm mt-1 ${remaining < 0 ? "text-red-100" : "text-green-100"}`}>
            {totalBudget > 0 ? `${Math.abs(((remaining / totalBudget) * 100)).toFixed(1)}% ${remaining < 0 ? "vượt" : "khả dụng"}` : "—"}
          </p>
        </div>
      </div>

      {/* Insights banner */}
      {budgets.length > 0 && (overCount > 0 || warningCount > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6 flex flex-wrap items-center gap-4">
          <AlertTriangle size={20} className="text-amber-600 shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold text-amber-800">Cần chú ý: </span>
            {overCount > 0 && <span className="text-red-700 font-medium">{overCount} ngân sách vượt hạn mức</span>}
            {overCount > 0 && warningCount > 0 && <span className="text-slate-500"> · </span>}
            {warningCount > 0 && <span className="text-amber-700 font-medium">{warningCount} sắp chạm hạn mức (&gt;80%)</span>}
          </div>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1 text-green-700 font-medium"><CheckCircle2 size={13} />{onTrackCount} ổn định</span>
            <span className="flex items-center gap-1 text-amber-700 font-medium"><AlertTriangle size={13} />{warningCount} cảnh báo</span>
            <span className="flex items-center gap-1 text-red-700 font-medium"><XCircle size={13} />{overCount} vượt</span>
          </div>
        </div>
      )}

      {/* Overall progress */}
      {budgets.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-slate-900">Tiến độ tổng thể</h2>
            <span className="text-sm font-semibold text-slate-500">{overallPct.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all duration-700 ${
                overallPct >= 100 ? "bg-gradient-to-r from-red-500 to-red-600"
                  : overallPct >= 80 ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                  : "bg-gradient-to-r from-purple-500 to-pink-500"
              }`}
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>{fmt(0)}</span>
            <span>{fmt(totalBudget)}</span>
          </div>
        </div>
      )}

      {/* Main content */}
      {budgets.length > 0 && (
        <div className="flex gap-6 mb-6">
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center mb-4">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm ngân sách..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="flex gap-1">
                {[{ key: "all", label: "Tất cả" }, { key: "on-track", label: "Ổn định" }, { key: "warning", label: "Cảnh báo" }, { key: "over", label: "Vượt" }].map(f => (
                  <button key={f.key} onClick={() => setFilterStatus(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filterStatus === f.key ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="default">Mặc định</option>
                <option value="pct-desc">% Đã dùng (Cao→Thấp)</option>
                <option value="pct-asc">% Đã dùng (Thấp→Cao)</option>
                <option value="amount">Số tiền</option>
                <option value="name">Tên A→Z</option>
              </select>
              <div className="flex border border-slate-200 rounded-lg overflow-hidden ml-auto">
                <button onClick={() => setViewMode("grid")} className={`p-2 ${viewMode === "grid" ? "bg-purple-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}><LayoutGrid size={16} /></button>
                <button onClick={() => setViewMode("list")} className={`p-2 ${viewMode === "list" ? "bg-purple-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}><List size={16} /></button>
              </div>
            </div>

            {isLoading ? (
              <div className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-2" : "grid-cols-1"}`}>
                {[1,2,3,4].map(i => <div key={i} className="h-40 rounded-2xl bg-slate-200 animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                <TrendingUp size={40} className="text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">Không tìm thấy ngân sách phù hợp</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(b => <BudgetCard key={b.id} b={b} onEdit={setEditingBudget} onDelete={handleDeleteBudget} />)}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(b => <BudgetListRow key={b.id} b={b} onEdit={setEditingBudget} onDelete={handleDeleteBudget} />)}
              </div>
            )}
          </div>

          {pieData.length > 0 && (
            <div className="w-64 shrink-0 bg-white rounded-2xl p-5 border border-slate-200 self-start">
              <h3 className="font-bold text-slate-900 mb-4 text-sm">Phân bổ chi tiêu</h3>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "12px" }}
                    formatter={(val) => [fmt(val), ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {pieData.slice(0, 5).map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-600 truncate">{d.name}</span>
                    </div>
                    <span className="font-semibold text-slate-700 shrink-0 ml-2">{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!isLoading && budgets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <TrendingUp size={52} className="text-slate-300 mb-4" />
          <p className="text-slate-500 font-semibold text-lg">Chưa có ngân sách</p>
          <p className="text-slate-400 text-sm mt-1 mb-6">Hãy tạo ngân sách đầu tiên để bắt đầu theo dõi chi tiêu</p>
          <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold">
            <Plus size={18} /> Thêm ngân sách
          </button>
        </div>
      )}

      <AddBudgetModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={handleAddBudget} />
      {editingBudget && <EditBudgetModal budget={editingBudget} onClose={() => setEditingBudget(null)} onSave={handleEditBudget} />}
    </PageLayout>
  );
}

import { useNavigate } from "react-router-dom";

function BudgetCard({ b, onEdit, onDelete }) {
  const { fmt } = useSettings();
  const navigate = useNavigate();
  const Icon = b.icon;
  const pct = Math.min(b.percentage, 100);
  const isOver = b.percentage > 100;
  const isWarning = b.percentage >= 80 && !isOver;

  return (
    <div 
      className="bg-white rounded-2xl p-5 border border-slate-200 hover:shadow-md transition-shadow group cursor-pointer"
      onClick={() => navigate(`/budgets/${b.id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl ${b.bgColor} flex items-center justify-center`}>
            <Icon size={22} className={b.textColor} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 leading-tight hover:text-purple-600 transition-colors">{b.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{fmt(b.spent)} / {fmt(b.budget)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onEdit(b); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700" title="Sửa"><Pencil size={13} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(b.id, b.name); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="Xóa"><Trash2 size={13} /></button>
        </div>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
        <div className={`h-2.5 rounded-full transition-all duration-700 bg-gradient-to-r ${isOver ? "from-red-500 to-red-600" : isWarning ? "from-yellow-400 to-orange-500" : b.barColor}`}
          style={{ width: `${pct}%` }} />
      </div>

      <div className="flex items-center justify-between">
        <StatusBadge percentage={b.percentage} />
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {b.periodType && <span>{b.periodType === "monthly" ? "Hàng tháng" : b.periodType === "weekly" ? "Hàng tuần" : b.periodType === "yearly" ? "Hàng năm" : b.periodType}</span>}
          {b.startDate && <span className="flex items-center gap-0.5"><Calendar size={11} />{formatDate(b.startDate)}</span>}
        </div>
      </div>

      {b.accountName && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1 text-xs text-slate-400">
          <Wallet size={11} /> {b.accountName}
        </div>
      )}
    </div>
  );
}

function BudgetListRow({ b, onEdit, onDelete }) {
  const { fmt } = useSettings();
  const navigate = useNavigate();
  const Icon = b.icon;
  const pct = Math.min(b.percentage, 100);
  const isOver = b.percentage > 100;
  const isWarning = b.percentage >= 80 && !isOver;

  return (
    <div 
      className="bg-white rounded-xl px-5 py-4 border border-slate-200 hover:shadow-sm transition-shadow group flex items-center gap-4 cursor-pointer"
      onClick={() => navigate(`/budgets/${b.id}`)}
    >
      <div className={`w-10 h-10 rounded-xl ${b.bgColor} flex items-center justify-center shrink-0`}>
        <Icon size={20} className={b.textColor} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-semibold text-slate-900 text-sm hover:text-purple-600 transition-colors">{b.name}</span>
          <StatusBadge percentage={b.percentage} />
          {b.periodType && <span className="text-xs text-slate-400">{b.periodType === "monthly" ? "Hàng tháng" : b.periodType === "weekly" ? "Hàng tuần" : b.periodType === "yearly" ? "Hàng năm" : b.periodType}</span>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-100 rounded-full h-2">
            <div className={`h-2 rounded-full bg-gradient-to-r ${isOver ? "from-red-500 to-red-600" : isWarning ? "from-yellow-400 to-orange-500" : b.barColor}`}
              style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-slate-500 shrink-0 w-10 text-right">{b.percentage.toFixed(0)}%</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-slate-900">{fmt(b.spent)}</p>
        <p className="text-xs text-slate-400">trên {fmt(b.budget)}</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onEdit(b); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><Pencil size={13} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(b.id, b.name); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}
